/**
 * migrate_notice_footer.js — company_notices 본문 푸터 형식 마이그레이션
 * 
 * 기존 발송 메시지의 하단 담당자 정보 푸터를 통일된 ● 불릿 형식으로 일괄 변환합니다.
 * 
 * 변경 사항:
 *   1. 구분선(─────) 제거
 *   2. E-mail: → ● 이메일: (한글 라벨 + ● 불릿)
 *   3. 전화:   → ● 전화:
 *   4. 팩스:   → ● 팩스:
 *   5. 반쪽 푸터(연락처 없는 브랜드명만) → 전체 푸터 추가
 *   6. "인사톡 노무톡 · 대화인사노무파트너스" → "... 담당자" 추가
 * 
 * 사용법: node scripts/migrate_notice_footer.js
 */

const path     = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'app.db');

console.log('═'.repeat(60));
console.log('  company_notices 푸터 형식 마이그레이션');
console.log('═'.repeat(60));
console.log(`  DB: ${DB_PATH}\n`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 공통 연락처 정보 (실제 DB 값 조회)
const contactRow = db.prepare("SELECT * FROM representative_contact WHERE id = 'default'").get() || {};
const DEFAULT_PHONE = contactRow.phone || '02)3487-8841';
const DEFAULT_EMAIL = contactRow.email || 'eunyangpark@naver.com';
const DEFAULT_FAX   = contactRow.fax   || '02)3487-8882';

const FULL_FOOTER = `인사톡 노무톡 · 대화인사노무파트너스 담당자
● 전화: ${DEFAULT_PHONE}
● 이메일: ${DEFAULT_EMAIL}
● 팩스: ${DEFAULT_FAX}`;

// 이전 버전 브랜드 시그니처 (반쪽 푸터)
const OLD_BRAND_ONLY = '인사톡 노무톡 · 대화인사노무파트너스';

// ── 1. 대상 레코드 조회 ──
const rows = db.prepare(`SELECT id, body, notice_type FROM company_notices WHERE body IS NOT NULL AND body != ''`).all();
console.log(`  전체 company_notices 레코드: ${rows.length}건\n`);

let updatedCount = 0;
let skippedCount = 0;
const updateStmt = db.prepare(`UPDATE company_notices SET body = ?, updated_at = ? WHERE id = ?`);
const now = Date.now();

for (const row of rows) {
  let body = row.body;
  let changed = false;

  // (1) 구분선 제거: ─────... (13자 이상 연속된 ─) 줄
  if (/─{13,}/.test(body)) {
    body = body.replace(/\n?─{13,}\n?/g, '\n');
    changed = true;
  }

  // (2) E-mail: → ● 이메일:
  if (body.includes('E-mail:')) {
    body = body.replace(/\nE-mail:/g, '\n● 이메일:');
    changed = true;
  }

  // (3) 전화: → ● 전화: (단, 이미 ● 가 없는 경우만)
  if (/\n전화:/.test(body) && !/\n● 전화:/.test(body)) {
    body = body.replace(/\n전화:/g, '\n● 전화:');
    changed = true;
  }

  // (4) 팩스: → ● 팩스: (단, 이미 ● 가 없는 경우만)
  if (/\n팩스:/.test(body) && !/\n● 팩스:/.test(body)) {
    body = body.replace(/\n팩스:/g, '\n● 팩스:');
    changed = true;
  }

  // (5) 연속된 빈 줄 정리 (2개 이상 → 1개)
  if (/\n{3,}/.test(body)) {
    body = body.replace(/\n{3,}/g, '\n\n');
    changed = true;
  }

  // (6) 반쪽 푸터 교체: "인사톡 노무톡 · 대화인사노무파트너스" (담당자/연락처 없음) → 전체 푸터
  //     단, 이미 전체 푸터(● 포함)가 있는 경우는 제외
  if (body.includes(OLD_BRAND_ONLY) && !body.includes('●')) {
    // 브랜드명 뒤에 "담당자"가 없으면 추가
    if (!body.includes('인사톡 노무톡 · 대화인사노무파트너스 담당자')) {
      body = body.replace(
        new RegExp(OLD_BRAND_ONLY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!(\\s*담당자))', 'g'),
        OLD_BRAND_ONLY + ' 담당자'
      );
    }
    // 브랜드명 + 담당자 뒤에 연락처가 없으면 연락처 추가
    if (!body.includes('● 전화:') && !body.includes('전화:')) {
      body = body.replace(
        /인사톡 노무톡 · 대화인사노무파트너스 담당자(?![\s\S]*● 전화)/g,
        FULL_FOOTER
      );
    }
    changed = true;
  }

  if (changed) {
    updateStmt.run(body, now, row.id);
    updatedCount++;
    console.log(`  ✅ [${row.notice_type}] ${row.id.slice(0,8)}...`);
  } else {
    skippedCount++;
  }
}

console.log(`\n  ─────────────────────────────────────────`);
console.log(`  수정됨: ${updatedCount}건`);
console.log(`  건너뜀: ${skippedCount}건 (이미 최신 형식)`);
console.log(`  전체:   ${rows.length}건`);
console.log(`\n  마이그레이션 완료.`);

db.close();
