const db = require('better-sqlite3')('data/app.db');
db.pragma('foreign_keys=OFF');

const updates = [
  ["UPDATE annual_leave_promotions SET worker_send_method='kakao' WHERE worker_send_method='알림톡'"],
  ["UPDATE annual_leave_promotions SET worker_send_method='email' WHERE worker_send_method='이메일'"],
  ["UPDATE annual_leave_promotions SET worker_send_method='phone' WHERE worker_send_method='유선직접안내'"],
  ["UPDATE annual_leave_promotions SET company_send_method='kakao' WHERE company_send_method='알림톡'"],
  ["UPDATE annual_leave_promotions SET company_send_method='email' WHERE company_send_method='이메일'"],
  ["UPDATE annual_leave_promotions SET company_send_status='completed' WHERE company_send_status='완료'"],
  ["UPDATE annual_leave_promotions SET company_send_status='failed' WHERE company_send_status='실패'"],
];

for (const [sql] of updates) {
  try {
    const info = db.prepare(sql).run();
    console.log(sql.slice(0, 80), '->', info.changes, 'rows');
  } catch(e) {
    console.log('SKIP:', e.message);
  }
}

const rows = db.prepare('SELECT DISTINCT worker_send_method, company_send_method, company_send_status FROM annual_leave_promotions').all();
console.log('After:', JSON.stringify(rows));
db.close();
