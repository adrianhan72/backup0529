const { DatabaseConnection } = require('../lib/database');
const db = new DatabaseConnection('./data/app.db');

console.log('=== 갱신 페어 시작일 재보정 (KST 기준) ===\n');

function nextBizDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// renewed_to_id 방향 페어
const pairs = db.raw.prepare(`
  SELECT n.id as new_id, o.terminate_date, n.contract_start,
         (SELECT name FROM employees WHERE id = o.employee_id) as emp_name
  FROM contracts o
  JOIN contracts n ON o.renewed_to_id = n.id
  WHERE o.terminate_date IS NOT NULL AND o.terminate_date != ''
    AND n.status IN ('pending', 'active', 'docs_incomplete', 'renewal_pending')
`).all();

const stmt = db.raw.prepare('UPDATE contracts SET contract_start = ? WHERE id = ?');
for (const p of pairs) {
  const expected = nextBizDay(p.terminate_date);
  console.log(`${p.emp_name}: 해지 ${p.terminate_date} → 시작 ${p.contract_start} → ${expected}`);
  stmt.run(expected, p.new_id);
}

// renewed_from_id 방향도 확인
const fromPairs = db.raw.prepare(`
  SELECT n.id as new_id, n.contract_start,
         o.terminate_date,
         (SELECT name FROM employees WHERE id = n.employee_id) as emp_name
  FROM contracts n
  JOIN contracts o ON n.renewed_from_id = o.id
  WHERE o.terminate_date IS NOT NULL AND o.terminate_date != ''
    AND n.status IN ('pending', 'active', 'docs_incomplete', 'renewal_pending')
    AND n.renewed_to_id IS NULL
`).all();

for (const p of fromPairs) {
  const expected = nextBizDay(p.terminate_date);
  if (p.contract_start !== expected) {
    console.log(`${p.emp_name}: 해지 ${p.terminate_date} → 시작 ${p.contract_start} → ${expected} (from)`);
    stmt.run(expected, p.new_id);
  }
}

console.log('\n완료.');
