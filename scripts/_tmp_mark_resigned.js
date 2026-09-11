// 임시 스크립트: 만료 계약 3건(류가은/윤지현/최병준) 퇴직 처리
// - status='resigned', resign_date=계약 종료일
// - 대상: comp01(한울테크) 고정 사번
const Database = require('better-sqlite3');
const db = new Database('data/app.db');
db.pragma('foreign_keys = ON');

const targets = [
  { name: '류가은', id: '4aa2fbae-e9a6-4402-bc6e-8d1f5eca8d9f', resign_date: '2025-06-30' },
  { name: '윤지현', id: '05778e42-54d0-4963-a9ac-4633944ea762', resign_date: '2024-12-31' },
  { name: '최병준', id: '6f548a4b-657f-478f-848d-30b4fe8d0830', resign_date: '2026-01-05' },
];

const upd = db.prepare(
  `UPDATE employees SET status='resigned', resign_date=?, updated_at=? WHERE id=?`
);
const now = Date.now();
const tx = db.transaction(() => {
  for (const t of targets) {
    const r = upd.run(t.resign_date, now, t.id);
    console.log(`[${t.name}] id=${t.id} 퇴직 처리 changes=${r.changes} resign_date=${t.resign_date}`);
  }
});
tx();

// 확인
for (const t of targets) {
  const e = db.prepare(`SELECT name, status, resign_date FROM employees WHERE id=?`).get(t.id);
  console.log(`확인: ${e.name} status=${e.status} resign_date=${e.resign_date}`);
}
db.close();
console.log('완료 — node scripts/_checkpoint.js 실행 후 커밋 필요');
