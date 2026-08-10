const { DatabaseConnection } = require('../lib/database');
const db = new DatabaseConnection('./data/app.db');

console.log('=== 근로계약 갱신 페어 데이터 정합성 보정 ===\n');

// ── 1. renewed 상태 → terminated로 변경 ──
const renewedContracts = db.raw.prepare(`
  SELECT id, status, terminate_date, renewed_to_id,
         (SELECT name FROM employees WHERE id = contracts.employee_id) as emp_name
  FROM contracts WHERE status = 'renewed'
`).all();

if (renewedContracts.length > 0) {
  console.log(`[1] renewed → terminated: ${renewedContracts.length}건`);
  const stmt = db.raw.prepare('UPDATE contracts SET status = ? WHERE id = ?');
  const updateMany = db.raw.transaction((rows) => {
    for (const c of rows) {
      stmt.run('terminated', c.id);
      console.log(`  ${c.id.substring(0,8)} | ${c.emp_name || '?'} | term: ${c.terminate_date || '-'}`);
    }
  });
  updateMany(renewedContracts);
  console.log('  완료\n');
} else {
  console.log('[1] 상태 변경 대상 없음\n');
}

// ── 2. 갱신 페어 갭 수정 (해지일의 익영업일로 시작일 보정) ──
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

const pairs = db.raw.prepare(`
  SELECT o.id as orig_id, o.terminate_date,
         n.id as new_id, n.contract_start, n.status as new_status,
         (SELECT name FROM employees WHERE id = o.employee_id) as emp_name
  FROM contracts o
  JOIN contracts n ON o.renewed_to_id = n.id
  WHERE o.terminate_date IS NOT NULL AND o.terminate_date != ''
    AND n.contract_start IS NOT NULL AND n.contract_start != ''
    AND n.status IN ('pending', 'active', 'docs_incomplete', 'renewal_pending')
`).all();

console.log(`[2] renewed_to_id 페어 갭 확인: ${pairs.length}건`);
let gapFixed = 0;
const updateStmt = db.raw.prepare('UPDATE contracts SET contract_start = ? WHERE id = ?');

for (const p of pairs) {
  const expectedStart = nextBizDay(p.terminate_date);
  if (p.contract_start !== expectedStart) {
    console.log(`  ${p.emp_name}: 해지 ${p.terminate_date} → 시작 ${p.contract_start} → ${expectedStart}`);
    updateStmt.run(expectedStart, p.new_id);
    gapFixed++;
  }
}

// ── 3. renewed_from_id 방향도 확인 ──
const fromPairs = db.raw.prepare(`
  SELECT n.id as new_id, n.contract_start,
         o.terminate_date,
         (SELECT name FROM employees WHERE id = n.employee_id) as emp_name
  FROM contracts n
  JOIN contracts o ON n.renewed_from_id = o.id
  WHERE o.terminate_date IS NOT NULL AND o.terminate_date != ''
    AND n.contract_start IS NOT NULL AND n.contract_start != ''
    AND n.status IN ('pending', 'active', 'docs_incomplete', 'renewal_pending')
    AND n.renewed_to_id IS NULL
`).all();

console.log(`\n[3] renewed_from_id 페어 확인: ${fromPairs.length}건`);
for (const p of fromPairs) {
  const expectedStart = nextBizDay(p.terminate_date);
  if (p.contract_start !== expectedStart) {
    console.log(`  ${p.emp_name}: 해지 ${p.terminate_date} → 시작 ${p.contract_start} → ${expectedStart}`);
    updateStmt.run(expectedStart, p.new_id);
    gapFixed++;
  }
}

console.log(`\n총 갭 수정: ${gapFixed}건`);
console.log('완료.');
