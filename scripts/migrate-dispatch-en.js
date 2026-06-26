const db = require('better-sqlite3')('data/app.db');
db.pragma('foreign_keys=OFF');

const updates = [
  ["UPDATE contract_dispatch SET dispatch_method='kakao' WHERE dispatch_method='알림톡'"],
  ["UPDATE contract_dispatch SET dispatch_method='email' WHERE dispatch_method='이메일'"],
  ["UPDATE contract_dispatch SET dispatch_method='manual' WHERE dispatch_method='수동배부'"],
  ["UPDATE contract_dispatch SET dispatch_status='completed' WHERE dispatch_status='완료'"],
  ["UPDATE contract_dispatch SET dispatch_status='failed' WHERE dispatch_status='실패'"],
  ["UPDATE contract_dispatch SET dispatch_status='pending' WHERE dispatch_status='대기'"],
];

for (const [sql] of updates) {
  const info = db.prepare(sql).run();
  console.log(sql, '->', info.changes, 'rows');
}

const rows = db.prepare('SELECT DISTINCT dispatch_method, dispatch_status FROM contract_dispatch').all();
console.log('After:', JSON.stringify(rows));
db.close();
