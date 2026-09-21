/**
 * scripts/test-alimtalk.js — 카카오 알림톡 발송 테스트 스크립트
 *
 * 사용법:
 *   node scripts/test-alimtalk.js --to 01012345678
 *   node scripts/test-alimtalk.js --to 01012345678 --template CONTRACT   ← 기본 변수 자동 적용
 *   node scripts/test-alimtalk.js --to 01012345678 --template CONSENT_001 --vars "{\"#{이름}\":\"홍길동\"}"
 *   node scripts/test-alimtalk.js --status <messageId>
 *
 * 옵션:
 *   --to <수신자 전화번호>       필수 (--status 사용 시 제외)
 *   --template <상수명|템플릿ID> 기본 CONTRACT (ALIMTALK_TPL_IDS 키 또는 실제 템플릿 ID 직접 지정)
 *   --vars <JSON>               템플릿 변수 (지정 시 기본 변수를 덮어씀)
 *   --from <발신번호>           생략 시 .env의 SOLAPI_DEFAULT_SENDER 사용
 *   --pfid <카카오채널ID>       생략 시 .env의 SOLAPI_KAKAO_PF_ID 사용
 *   --reserve <ISO 8601>        예약 발송 (예: 2026-09-19T09:00:00+09:00)
 *   --status <messageId>        발송 상태 조회 모드
 */
require('dotenv').config();
const path = require('path');

const { createSolapiClient } = require(path.join(__dirname, '..', 'lib', 'solapi'));
const { ALIMTALK_TPL_IDS } = require(path.join(__dirname, '..', 'lib', 'alimtalk-template-ids'));

// ── 템플릿별 기본 변수 (테스트용 샘플 값 — 실제 발송 전에 확인/수정) ──
const DEFAULT_TEMPLATE_VARS = {
  CONTRACT: {
    '#{근로자명}': '홍길동',
    '#{회사명}': '대화인사노무파트너스',
    '#{URL}': 'https://insanomutok.com/data/uploads/contracts/contract_sample.pdf',
    '#{대표전화}': '02-3487-8841',
    '#{대표이메일}': 'labourlawyer@naver.com',
    '#{대표팩스}': '02-3487-8882',
  },
};

// ── CLI 인자 파싱 ──
function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : dflt;
}

async function main() {
  const statusMessageId = arg('--status', '');

  // .env 확인
  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
    console.error('❌ .env에 SOLAPI_API_KEY / SOLAPI_API_SECRET이 없습니다.');
    process.exit(1);
  }

  const client = createSolapiClient();

  // ── 발송 상태 조회 모드 ──
  if (statusMessageId) {
    console.log(`[조회] messageId: ${statusMessageId}`);
    const status = await client.getMessageStatus(statusMessageId);
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // ── 발송 모드 ──
  const to = arg('--to', '');
  if (!to) {
    console.error('❌ --to <수신자 전화번호>가 필요합니다. (예: --to 01012345678)');
    process.exit(1);
  }

  // 템플릿: ALIMTALK_TPL_IDS 키 이름이면 상수 값, 아니면 입력을 템플릿 ID로 그대로 사용
  const templateInput = arg('--template', 'CONTRACT').trim();
  const templateId = ALIMTALK_TPL_IDS[templateInput.toUpperCase()] || templateInput;
  const isPlaceholder = /_001$/.test(templateId);

  if (isPlaceholder) {
    console.warn(`⚠️  템플릿 ID "${templateId}"는 자리표시자입니다. 실제 등록된 ID인지 확인하세요.`);
  }

  let variables = { ...(DEFAULT_TEMPLATE_VARS[templateInput.toUpperCase()] || {}) };
  const varsRaw = arg('--vars', '');
  if (varsRaw) {
    try {
      // --vars로 지정한 값이 기본 변수를 덮어씀
      variables = { ...variables, ...JSON.parse(varsRaw) };
    } catch (e) {
      console.error('❌ --vars는 JSON 형식이어야 합니다. 예: --vars "{\"#{이름}\":\"홍길동\"}"');
      process.exit(1);
    }
  }

  console.log('[발송]', {
    to,
    templateId,
    from: arg('--from', process.env.SOLAPI_DEFAULT_SENDER || '(기본값 없음)'),
    pfId: arg('--pfid', process.env.SOLAPI_KAKAO_PF_ID || '(없음)'),
    variables,
    reserveTime: arg('--reserve', ''),
  });

  try {
    const result = await client.sendAlimtalk({
      to,
      templateId,
      variables,
      from: arg('--from', '') || undefined,
      pfId: arg('--pfid', '') || undefined,
      reserveTime: arg('--reserve', '') || undefined,
    });

    console.log('✅ 발송 요청 완료');
    console.log(JSON.stringify(result, null, 2));

    // 발송 후 상태 확인 안내
    if (result.messageId) {
      console.log(`\n상태 확인: node scripts/test-alimtalk.js --status ${result.messageId}`);
    }
  } catch (e) {
    console.error('❌ 발송 실패:', e.message);
    if (e.response) {
      console.error(JSON.stringify(e.response, null, 2));
    }
    process.exit(1);
  }
}

main();
