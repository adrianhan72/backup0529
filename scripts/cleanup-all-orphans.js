const Database = require('better-sqlite3');
const db = new Database('data/app.db');

db.pragma('foreign_keys = OFF');

console.log('=== Full orphan employee cleanup ===\n');

// 1. Find all employees with 0 contracts
const orphanCandidates = db.prepare(`
  SELECT e.id, e.name, e.employee_number, e.company_id, e.status
  FROM employees e
  WHERE e.id NOT IN (SELECT DISTINCT employee_id FROM contracts WHERE employee_id IS NOT NULL)
  ORDER BY e.company_id, e.employee_number
`).all();

console.log('Employees with 0 contracts: ' + orphanCandidates.length);

// 2. Check all reference tables
const refTables = [
  'payrolls', 'payroll_items', 'payroll_send_logs',
  'attendance_ledger', 'annual_leave_ledger', 'annual_leave_promotions',
  'wage_ledger_notifications',
  'contract_dispatch', 'consent_dispatch', 'contract_expiry_notice',
  'kakao_send_logs', 'registered_executives', 'related_party_workers'
];

const toDelete = [];
const blocked = [];

for (const emp of orphanCandidates) {
  let hasRef = false;
  let refInfo = null;
  for (const table of refTables) {
    try {
      const cnt = db.prepare('SELECT COUNT(*) as cnt FROM ' + table + ' WHERE employee_id = ?').get(emp.id).cnt;
      if (cnt > 0) {
        hasRef = true;
        refInfo = { table, cnt };
        break;
      }
    } catch(e) { /* table may not exist */ }
  }
  if (hasRef) {
    blocked.push({ ...emp, ...refInfo });
  } else {
    toDelete.push(emp);
  }
}

console.log('  Safe to delete (no refs): ' + toDelete.length);
console.log('  Blocked (has refs):      ' + blocked.length);

// Show blocked summary
if (blocked.length > 0) {
  const byTable = {};
  for (const b of blocked) {
    if (!byTable[b.table]) byTable[b.table] = [];
    byTable[b.table].push(b);
  }
  console.log('\n=== Blocked by table ===');
  for (const [table, emps] of Object.entries(byTable)) {
    console.log('  ' + table + ': ' + emps.length + ' records');
  }
}

// Show to-delete summary by company
const byCompany = {};
for (const emp of toDelete) {
  const coId = emp.company_id || 'unknown';
  if (!byCompany[coId]) byCompany[coId] = [];
  byCompany[coId].push(emp);
}
console.log('\n=== To delete by company ===');
for (const [coId, emps] of Object.entries(byCompany)) {
  // Get company name
  const co = db.prepare('SELECT company_name FROM companies WHERE id = ?').get(coId);
  const coName = co ? co.company_name : coId;
  console.log('  ' + coName + ' (' + coId + '): ' + emps.length + ' records');
}

// 3. Delete all safe orphans
if (toDelete.length > 0) {
  const deleteStmt = db.prepare('DELETE FROM employees WHERE id = ?');
  const tx = db.transaction(() => {
    for (const emp of toDelete) {
      deleteStmt.run(emp.id);
    }
  });
  tx();
  console.log('\n✅ Deleted ' + toDelete.length + ' orphan employee records.');
}

// 4. For blocked records, check if we can remap payroll references to the correct employee
console.log('\n=== Analyzing blocked records for remapping ===');
for (const b of blocked.slice(0, 10)) {
  console.log('\n  Blocked: ' + b.id + ' (' + b.name + '), empno=' + b.employee_number + ', company=' + b.company_id);
  console.log('    Referenced in ' + b.table + ': ' + b.cnt + ' rows');
  
  // Find the "correct" employee for this empno in the same company
  const correctEmp = db.prepare(
    'SELECT id, name, employee_number FROM employees WHERE company_id = ? AND employee_number = ? AND id != ?'
  ).get(b.company_id, b.employee_number, b.id);
  
  if (correctEmp) {
    console.log('    Correct employee: ' + correctEmp.id + ' (' + correctEmp.name + ')');
    
    // Check contract count for both
    const blockedCtCount = db.prepare('SELECT COUNT(*) as cnt FROM contracts WHERE employee_id = ?').get(b.id).cnt;
    const correctCtCount = db.prepare('SELECT COUNT(*) as cnt FROM contracts WHERE employee_id = ?').get(correctEmp.id).cnt;
    console.log('    Blocked contracts: ' + blockedCtCount + ', Correct contracts: ' + correctCtCount);
  } else {
    console.log('    No matching correct employee found (orphan with payroll refs but no living counterpart)');
  }
}

// 5. Final stats
const remainingOrphans = db.prepare(`
  SELECT COUNT(*) as cnt FROM employees e
  WHERE e.id NOT IN (SELECT DISTINCT employee_id FROM contracts WHERE employee_id IS NOT NULL)
`).get().cnt;
console.log('\n=== Final state ===');
console.log('  Remaining orphans (blocked by refs): ' + remainingOrphans);
console.log('  Total employees: ' + db.prepare('SELECT COUNT(*) as cnt FROM employees').get().cnt);

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDone.');
