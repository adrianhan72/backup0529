// employees.resign_date 컬럼 추가 + 퇴직 직원 백필 (잠재 버그 해소)
//
// 배경: employees에 resign_date 컬럼이 없는데 해지 흐름
//   confirmContractTerminate / confirmFixedTerminate 가 resign_date 로 PATCH 하여
//   lib/database.js validateColumns 에서 400 으로 실패하던 잠재 버그 수정
//   (컬럼 추가 후 서버 재시작 필요 — 서버는 시작 시점에 컬럼 목록을 캐시함)
//
// 실행 전제 (글로벌 룰):
//   1. 서버 완전 종료 (Ctrl+C)
//   2. WAL 잔여 확인 → 필요 시 wal_checkpoint(TRUNCATE)
//   3. 백업 (app.db 3종 세트)
//   4. 본 스크립트 실행 → PRAGMA integrity_check
//   5. node scripts/dump_schema.js → schema.sql 현행화
//   6. 서버 재시작
//
// 멱등성: resign_date 컬럼이 이미 있으면 ALTER 생략, 백필은 반복 실행해도 동일 결과
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(dbPath);

console.log('── employees.resign_date 추가 ──');
const cols = db.prepare('PRAGMA table_info(employees)').all();
if (!cols.some(c => c.name === 'resign_date')) {
  db.exec('ALTER TABLE employees ADD COLUMN resign_date TEXT');
  console.log('[ALTER] resign_date 컬럼 추가됨');
} else {
  console.log('[SKIP] resign_date 컬럼 이미 존재');
}

console.log('── 퇴직 직원 백필 ──');
const resigned = db.prepare("SELECT id, name FROM employees WHERE status = 'resigned'").all();
let filled = 0;
const upd = db.prepare('UPDATE employees SET resign_date = ? WHERE id = ?');
for (const e of resigned) {
  const ct = db.prepare(
    "SELECT terminate_date FROM contracts WHERE employee_id = ? AND status = 'terminated' " +
    "AND terminate_date IS NOT NULL AND terminate_date != '' ORDER BY terminate_date DESC LIMIT 1"
  ).get(e.id);
  if (ct && ct.terminate_date) {
    upd.run(ct.terminate_date, e.id);
    filled++;
    console.log(`[BACKFILL] ${e.name}: ${ct.terminate_date}`);
  }
}
console.log(`[BACKFILL] 퇴직 ${resigned.length}명 중 ${filled}명 채움`);

console.log('── 무결성 검사 ──');
const check = db.prepare('PRAGMA integrity_check').get();
console.log('[CHECK] integrity:', check.integrity_check);

db.close();
console.log('완료. 이어서 `node scripts/dump_schema.js` 실행 후 서버 재시작.');
