/**
 * migrate_contract_dispatch_body.js — contract_dispatched 본문 형식 마이그레이션
 * 
 * 근로계약서 발송 인앱 알림 본문을 신규 규칙에 맞게 재구성합니다.
 * 
 * 변경 사항:
 *   1. {고용형태} 근로계약서가 → 본문에 고용형태 표기
 *   2. ■ 상세 항목(근로자, 고용형태, 계약기간, 발송방법) 제거
 *   3. ■ 발송 시각만 남김
 *   4. * 근로계약서 날인본 보관 안내 문구 추가
 *   5. 제목: [계약서 발송] → [근로계약서 발송]
 * 
 * 사용법: node scripts/migrate_contract_dispatch_body.js
 */

const path     = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'app.db');

console.log('═'.repeat(60));
console.log('  contract_dispatched 본문 마이그레이션');
console.log('═'.repeat(60));

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 대상 레코드 조회
const rows = db.prepare(`
  SELECT id, title, body, notice_type 
  FROM company_notices 
  WHERE notice_type = 'contract_dispatched' 
    AND body IS NOT NULL AND body != ''
`).all();

console.log(`  대상 레코드: ${rows.length}건\n`);

let updatedCount = 0;
let skippedCount = 0;
const updateStmt = db.prepare(`UPDATE company_notices SET title = ?, body = ?, updated_at = ? WHERE id = ?`);
const now = Date.now();

for (const row of rows) {
  let body = row.body;
  let title = row.title;
  let changed = false;

  // ── 제목 마이그레이션 ──
  // [계약서 발송] → [근로계약서 발송]
  if (title && title.startsWith('[계약서 발송]')) {
    title = title.replace('[계약서 발송]', '[근로계약서 발송]');
    changed = true;
  }

  // ── 본문에서 정보 추출 ──
  // 회사명 추출: "안녕하세요, XXXX 사장님." 또는 "안녕하세요, XXXX 대표자님."
  const coMatch = body.match(/안녕하세요,\s*(.+?)(\s*(?:사장님|대표자님))/);
  const coName = coMatch ? coMatch[1].trim() : '';

  // 근로자명 추출: "■ 근로자: XXX"
  const empMatch = body.match(/■ 근로자:\s*(.+)/);
  const empName = empMatch ? empMatch[1].trim() : '';

  // 고용형태 추출
  const ctTypeMatch = body.match(/■ 고용형태:\s*(.+)/);
  const ctTypeText = ctTypeMatch ? ctTypeMatch[1].trim() : '';

  // 발송 방법 추출
  const methodMatch = body.match(/■ 발송 방법:\s*(.+)/);
  const methodText = methodMatch ? methodMatch[1].trim() : '카카오 알림톡';

  // 발송 시각 추출
  const timeMatch = body.match(/■ 발송 시각:\s*(.+)/);
  const timeText = timeMatch ? timeMatch[1].trim() : '';

  // ── 기존 body에 새 형식이 이미 적용되었는지 확인 ──
  if (body.includes('* 근로계약서 날인본 사진이 저희 담당자에게 회신되면 5년간 보관됩니다')) {
    skippedCount++;
    continue;
  }

  // ── 새 본문 구성 ──
  if (coName && empName && timeText) {
    const ctTypePart = ctTypeText ? `${ctTypeText} ` : '';
    
    // 기존 푸터 부분 보존 (● 전화: 이후 부분)
    const footerMatch = body.match(/\n인사톡 노무톡 · 대화인사노무파트너스 담당자[\s\S]*$/);
    const existingFooter = footerMatch ? footerMatch[0] : '';
    
    const newBody = 
`안녕하세요, ${coName} 대표자님.

근로기준법 제17조(근로조건의 명시)에 따라 소속 근로자 ${empName}에게 ${ctTypePart}근로계약서가 ${methodText}(으)로 발송 완료되었음을 알려드립니다.

■ 발송 시각: ${timeText}

* 근로계약서 날인본 사진이 저희 담당자에게 회신되면 5년간 보관됩니다.${existingFooter}`;

    updateStmt.run(title, newBody, now, row.id);
    updatedCount++;
    console.log(`  ✅ ${row.id.slice(0,8)}... — ${empName}`);
    changed = true;
  } else {
    // 추출 실패 — 수동 확인 필요
    console.log(`  ⚠️ ${row.id.slice(0,8)}... — 패턴 추출 실패 (수동 확인 필요)`);
    skippedCount++;
  }
}

console.log(`\n  ─────────────────────────────────────────`);
console.log(`  수정됨: ${updatedCount}건`);
console.log(`  건너뜀: ${skippedCount}건`);
console.log(`  전체:   ${rows.length}건`);
console.log(`\n  마이그레이션 완료.`);

db.close();
