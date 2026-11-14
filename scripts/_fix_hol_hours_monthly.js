// fixed_hol_hours 주간→월간 마이그레이션 (2026-08-14 규칙)
// 기존 저장 규칙: 주간 원값 (예: 토·일 휴일 18h/주 → 18 저장)
// 신규 저장 규칙: 월간 환산 (예: 18 × 4.345 ≈ 78 저장)
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
const W = 365 / 12 / 7;
const rows = db.prepare('select id, fixed_hol_hours from contracts where fixed_hol_hours > 0').all();
const upd = db.prepare('update contracts set fixed_hol_hours=? where id=?');
let n = 0;
for (const r of rows) {
  const m = Math.round(r.fixed_hol_hours * W);
  upd.run(m, r.id);
  n++;
}
console.log('migrated rows:', n, '(weekly→monthly, ×' + W.toFixed(4) + ')');
