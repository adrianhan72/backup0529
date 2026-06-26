const db = require('better-sqlite3')('data/app.db');
db.pragma('foreign_keys=OFF');

const updates = [
  ["UPDATE contract_expiry_notice SET notice_method='kakao' WHERE notice_method='알림톡'"],
  ["UPDATE contract_expiry_notice SET notice_method='email' WHERE notice_method='이메일'"],
  ["UPDATE contract_expiry_notice SET notice_method='manual' WHERE notice_method='수동배부'"],
  ["UPDATE contract_expiry_notice SET notice_status='completed' WHERE notice_status='완료'"],
  ["UPDATE contract_expiry_notice SET notice_status='failed' WHERE notice_status='실패'"],
  ["UPDATE contract_expiry_notice SET notice_status='pending' WHERE notice_status='대기'"],
];

for (const [sql] of updates) {
  const info = db.prepare(sql).run();
  console.log(sql, '->', info.changes, 'rows');
}

const rows = db.prepare('SELECT DISTINCT notice_method, notice_status FROM contract_expiry_notice').all();
console.log('After:', JSON.stringify(rows));
db.close();
