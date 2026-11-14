// ═══════════════════════════════════════════════════════════════════════
// 일용직 상용직 여부 + 근로실적 컬럼 추가 (2026-09-03)
//   contracts.daily_worker_type  — 'fulltime'(상용직 취급, 근무시간표 입력)
//                                  / 'daily'(상용직 아님, 급여입력에서 근로실적 처리)
//   payrolls.daily_work_log      — 상용직 아님 일용직의 일별 근로실적 JSON
//                                  형식: {"days":[{"d":1,"q":1},{"d":3,"q":0.5}], "unit":180000}
// ═══════════════════════════════════════════════════════════════════════
const path = require('path');
const { DB } = require('../lib/database');
const db = new DB(path.join(__dirname, '..', 'data', 'app.db'));

const addCol = (table, col, ddl) => {
  const cols = db.all(`PRAGMA table_info(${table})`).map(c => c.name);
  if (cols.includes(col)) { console.log(`${table}.${col} — 이미 존재`); return; }
  db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
  console.log(`${table}.${col} — 추가됨`);
};

const tx = db.connection.raw.transaction(() => {
  addCol('contracts', 'daily_worker_type', 'TEXT');
  addCol('payrolls', 'daily_work_log', 'TEXT');
});
tx();
db.raw.pragma('wal_checkpoint(TRUNCATE)');
console.log('done');
