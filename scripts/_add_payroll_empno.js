// 일회성 스크립트: payrolls에 사번 스냅샷(employee_number) 컬럼 추가 + 백필
// 사용 전 서버 정상 종료(Ctrl+C) 필수 — DB 스키마 변경 안전 수칙
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const have = new Set(db.prepare('PRAGMA table_info(payrolls)').all().map(c => c.name));
if (have.has('employee_number')) {
  console.log('skip (exists): payrolls.employee_number');
} else {
  db.exec('ALTER TABLE payrolls ADD COLUMN employee_number TEXT');
  console.log('added: payrolls.employee_number TEXT');
}

// 백필: 기존 payrolls에 저장 시점 기준 사번(직원 현재 사번으로 추정) 채움
const bk = db.prepare(
  "UPDATE payrolls SET employee_number = (SELECT employee_number FROM employees WHERE employees.id = payrolls.employee_id) WHERE employee_number IS NULL OR employee_number = ''"
).run();
console.log('backfill rows updated: ' + bk.changes);

db.pragma('wal_checkpoint(TRUNCATE)');
const wsize = fs.statSync(DB_PATH + '-wal').size;
console.log('wal_size=' + wsize);
console.log('integrity=' + db.pragma('integrity_check', { simple: true }));
const sample = db.prepare("SELECT employee_id, employee_number, pay_year, pay_month FROM payrolls WHERE employee_number IS NOT NULL AND employee_number != '' LIMIT 5").all();
sample.forEach(x => console.log('sample: ' + JSON.stringify(x)));
const emptyCnt = db.prepare("SELECT COUNT(*) n FROM payrolls WHERE employee_number IS NULL OR employee_number = ''").get();
console.log('empty_empno_cnt=' + emptyCnt.n);
db.close();
