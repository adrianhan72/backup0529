// 기존 일용직 계약 pay_method 백필 → 'monthly' (기존 월 지급 동작 보존)
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('data/app.db');
const info = db.prepare(`
  UPDATE contracts SET pay_method='monthly'
  WHERE contract_type='daily' AND (pay_method IS NULL OR pay_method='')
`).run();
db.pragma('wal_checkpoint(TRUNCATE)');
console.log('updated rows=' + info.changes + ' wal_size=' + fs.statSync('data/app.db-wal').size);
console.log('integrity=' + db.pragma('integrity_check', { simple: true }));
db.close();
