// 일회성 스크립트: contracts 테이블에 지급방법 컬럼 추가 (일급/주급/월합산 3분화 기반)
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const cols = [
  ['pay_method', 'TEXT'],
  ['pay_condition', 'TEXT'],
  ['pay_after_days', 'INTEGER'],
  ['pay_weekday', 'INTEGER'],
  ['pay_period_day_override', 'INTEGER'],
];

const have = new Set(db.prepare('PRAGMA table_info(contracts)').all().map(c => c.name));
for (const [n, t] of cols) {
  if (have.has(n)) { console.log('skip (exists): ' + n); continue; }
  db.exec('ALTER TABLE contracts ADD COLUMN ' + n + ' ' + t);
  console.log('added: ' + n + ' ' + t);
}

db.pragma('wal_checkpoint(TRUNCATE)');
const wsize = require('fs').statSync(DB_PATH + '-wal').size;
console.log('wal_size=' + wsize);
console.log('integrity=' + db.pragma('integrity_check', { simple: true }));
console.log('contract_cols=' + db.prepare('PRAGMA table_info(contracts)').all().map(c => c.name).join(','));
db.close();
