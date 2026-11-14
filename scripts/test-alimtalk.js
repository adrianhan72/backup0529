/**
 * scripts/test-alimtalk.js — 카카오 알림톡 발송 테스트 스크립트
 *
 * 사용법:
 *   node scripts/test-alimtalk.js --to 01012345678 --template CONTRACT
 *   node scripts/test-alimtalk.js --to 01012345678 --template CONSENT
 *   node scripts/test-alimtalk.js --to 01012345678 --template SEVERANCE
 *   node scripts/test-alimtalk.js --to 01012345678 --template PAYSLIP
 *   node scripts/test-alimtalk.js --status <messageId>
 *
 * 옵션:
 *   --to <수신자 전화번호>       필수 (--status 사용 시 제외)
 *   --template <CONTRACT|CONSENT|SEVERANCE|PAYSLIP> 필수
 *   발신번호와 채널 ID는 .env의 SOLAPI_DEFAULT_SENDER / SOLAPI_KAKAO_PF_ID 사용
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
    '#{URL}': 'data/uploads/contracts/contract_sample.pdf',
  },
  CONSENT: {
    '#{근로자명}': '홍길동',
    '#{회사명}': '대화인사노무파트너스',
    '#{URL}': 'data/uploads/contracts/contract_sample.pdf',
  },
  SEVERANCE: {
    '#{근로자명}': '홍길동',
    '#{회사명}': '대화인사노무파트너스',
    '#{URL}': 'data/uploads/contracts/contract_sample.pdf',
  },
  PAYSLIP: {
    '#{근로자명}': '홍길동',
    '#{회사명}': '대화인사노무파트너스',
    '#{URL}': 'data/uploads/pay_stub/pay_stub_sample.pdf',
  },
};

// ── CLI 인자 파싱 ──
function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : dflt;
}

async function main() {
  const statusMessageId = arg('--status', '');

  // ── 발송 상태 조회 모드 ──
  if (statusMessageId) {
    if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
      console.error('❌ .env에 SOLAPI_API_KEY / SOLAPI_API_SECRET이 없습니다.');
      process.exit(1);
    }
    const client = createSolapiClient();
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

  const templateKey = arg('--template', '').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(ALIMTALK_TPL_IDS, templateKey)) {
    console.error('❌ --template 값은 CONTRACT, CONSENT, SEVERANCE, PAYSLIP 중 하나여야 합니다.');
    process.exit(1);
  }

  const templateId = String(ALIMTALK_TPL_IDS[templateKey] || '').trim();
  if (!templateId || templateId.toUpperCase() === 'N/A') {
    console.log(`⏭️ ${templateKey} 템플릿 ID가 N/A 또는 비어 있어 발송하지 않습니다.`);
    return;
  }

  const variables = DEFAULT_TEMPLATE_VARS[templateKey];
  if (!variables) {
    console.error(`❌ ${templateKey}의 DEFAULT_TEMPLATE_VARS가 설정되지 않았습니다.`);
    process.exit(1);
  }

  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
    console.error('❌ .env에 SOLAPI_API_KEY / SOLAPI_API_SECRET이 없습니다.');
    process.exit(1);
  }

  const client = createSolapiClient();
  console.log('[발송]', {
    templateKey,
    to,
    templateId,
    from: process.env.SOLAPI_DEFAULT_SENDER || '(기본값 없음)',
    pfId: process.env.SOLAPI_KAKAO_PF_ID || '(없음)',
    variables,
  });

  try {
    const result = await client.sendAlimtalk({
      to,
      templateId,
      variables,
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
