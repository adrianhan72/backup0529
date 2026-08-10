const Database = require('better-sqlite3');
const db = new Database('data/app.db');

db.pragma('foreign_keys = OFF');

console.log('=== Cleaning orphan employee records (0 contracts, 0 payroll refs) ===\n');

// Find employees with 0 contracts
const orphanCandidates = db.prepare(`
  SELECT e.id, e.name, e.employee_number, e.company_id, e.status
  FROM employees e
  WHERE e.id NOT IN (SELECT DISTINCT employee_id FROM contracts WHERE employee_id IS NOT NULL)
  ORDER BY e.company_id, e.employee_number
`).all();

console.log(`Found ${orphanCandidates.length} employees with 0 contracts`);

// Check each for payroll references
const tablesToCheck = ['payrolls', 'payroll_items', 'attendance_ledger', 'annual_leave_ledger', 'wage_ledger_notifications', 'payroll_send_logs'];

const toDelete = [];
const blocked = [];

for (const emp of orphanCandidates) {
  let hasRef = false;
  for (const table of tablesToCheck) {
    try {
      const cnt = db.prepare('SELECT COUNT(*) as cnt FROM ' + table + ' WHERE employee_id = ?').get(emp.id).cnt;
      if (cnt > 0) {
        hasRef = true;
        blocked.push({...emp, refTable: table, refCount: cnt});
        break;
      }
    } catch(e) { /* table may not exist */ }
  }
  if (!hasRef) toDelete.push(emp);
}

console.log('  Safe to delete (no references): ' + toDelete.length);
console.log('  Blocked (has references): ' + blocked.length);

// Group by company
const byCompany = {};
for (const emp of toDelete) {
  const coId = emp.company_id || 'unknown';
  if (!byCompany[coId]) byCompany[coId] = [];
  byCompany[coId].push(emp);
}

// Focus on comp05
const comp05ToDelete = toDelete.filter(e => e.company_id === 'comp05');
console.log('\n=== comp05 records to delete: ' + comp05ToDelete.length + ' ===');
comp05ToDelete.forEach(e => console.log('  ' + e.id + ' | ' + e.name + ' | empno=' + e.employee_number + ' | status=' + e.status));

// Delete comp05 orphans
if (comp05ToDelete.length > 0) {
  const deleteStmt = db.prepare('DELETE FROM employees WHERE id = ?');
  const tx = db.transaction(() => {
    for (const emp of comp05ToDelete) {
      deleteStmt.run(emp.id);
    }
  });
  tx();
  console.log('\nDeleted ' + comp05ToDelete.length + ' orphan employee records from comp05.');
}

// Verify
const dupesAfter = db.prepare(`
  SELECT employee_number, COUNT(*) as cnt, GROUP_CONCAT(name) as names
  FROM employees WHERE company_id='comp05'
  GROUP BY employee_number HAVING cnt > 1
`).all();
if (dupesAfter.length > 0) {
  console.log('\n=== Remaining duplicates in comp05 ===');
  dupesAfter.forEach(d => console.log(JSON.stringify(d)));
} else {
  console.log('\n✅ No duplicate empno in comp05!');
}

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDone.');
