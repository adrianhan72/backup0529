/**
 * DB 상태값 정규화 스크립트
 * - employees.status: 'active' → '재직', 'resigned' → '퇴직'
 * - contracts.status: 'active' → '활성'
 */
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));

console.log('🔍 DB 상태값 정규화 시작...\n');

// ── 1. employees.status 정규화 ──
console.log('1️⃣ employees.status 정규화');

// 이전 상태 확인
const empBefore = db.prepare(`SELECT status, COUNT(*) as cnt FROM employees GROUP BY status`).all();
console.log('   이전:', empBefore.map(r => `${r.status}:${r.cnt}`).join(', '));

// 변환
const empActive = db.prepare(`UPDATE employees SET status = '재직' WHERE status = 'active'`).run();
const empResigned = db.prepare(`UPDATE employees SET status = '퇴직' WHERE status = 'resigned'`).run();
console.log(`   'active' → '재직': ${empActive.changes}건`);
console.log(`   'resigned' → '퇴직': ${empResigned.changes}건`);

// 이후 상태 확인
const empAfter = db.prepare(`SELECT status, COUNT(*) as cnt FROM employees GROUP BY status`).all();
console.log('   이후:', empAfter.map(r => `${r.status}:${r.cnt}`).join(', '));

// ── 2. contracts.status 정규화 ──
console.log('\n2️⃣ contracts.status 정규화');

const conBefore = db.prepare(`SELECT status, COUNT(*) as cnt FROM contracts GROUP BY status`).all();
console.log('   이전:', conBefore.map(r => `${r.status}:${r.cnt}`).join(', '));

const conActive = db.prepare(`UPDATE contracts SET status = '활성' WHERE status = 'active'`).run();
console.log(`   'active' → '활성': ${conActive.changes}건`);

const conAfter = db.prepare(`SELECT status, COUNT(*) as cnt FROM contracts GROUP BY status`).all();
console.log('   이후:', conAfter.map(r => `${r.status}:${r.cnt}`).join(', '));

// ── 3. 검증 ──
console.log('\n3️⃣ 검증 — 레거시 값 잔여 확인');
const empLegacy = db.prepare(`SELECT COUNT(*) as cnt FROM employees WHERE status IN ('active', 'resigned')`).get();
const conLegacy = db.prepare(`SELECT COUNT(*) as cnt FROM contracts WHERE status IN ('active', 'expired', 'terminated')`).get();

if (empLegacy.cnt === 0 && conLegacy.cnt === 0) {
  console.log('   ✅ 모든 레거시 값이 정규화되었습니다.');
} else {
  console.log(`   ⚠️ employees 레거시 잔여: ${empLegacy.cnt}건`);
  console.log(`   ⚠️ contracts 레거시 잔여: ${conLegacy.cnt}건`);
}

db.close();
console.log('\n✅ DB 정규화 완료');
