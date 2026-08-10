const Database = require('better-sqlite3');
const db = new Database('data/app.db');

db.pragma('foreign_keys = OFF');

console.log('=== 전체 고아 데이터 정리 ===\n');

const stats = { payrolls: 0, employees: 0, contracts: 0, other: 0 };

// ── 1. 고아 직원 찾기 (0 contracts) ──
const orphanEmployees = db.prepare(`
  SELECT e.id, e.name, e.employee_number, e.company_id
  FROM employees e
  WHERE e.id NOT IN (SELECT DISTINCT employee_id FROM contracts WHERE employee_id IS NOT NULL)
`).all();

console.log('1. 고아 직원: ' + orphanEmployees.length + '명');

// ── 2. 고아 직원의 payrolls 삭제 ──
for (const emp of orphanEmployees) {
  const result = db.prepare('DELETE FROM payrolls WHERE employee_id = ?').run(emp.id);
  stats.payrolls += result.changes;
  
  // Also clean other tables
  const otherTables = ['payroll_items', 'attendance_ledger', 'annual_leave_ledger', 
    'wage_ledger_notifications', 'payroll_send_logs', 'kakao_send_logs'];
  for (const table of otherTables) {
    try {
      const r = db.prepare('DELETE FROM ' + table + ' WHERE employee_id = ?').run(emp.id);
      stats.other += r.changes;
    } catch(e) { /* table may not exist */ }
  }
}
console.log('2. 고아 직원 연결 payrolls 삭제: ' + stats.payrolls + '건');
if (stats.other > 0) console.log('   기타 테이블 정리: ' + stats.other + '건');

// ── 3. 고아 직원 삭제 ──
for (const emp of orphanEmployees) {
  db.prepare('DELETE FROM employees WHERE id = ?').run(emp.id);
  stats.employees++;
}
console.log('3. 고아 직원 삭제: ' + stats.employees + '명');

// ── 4. 고아 계약 찾기 (유효하지 않은 employee_id 또는 company_id) ──
const orphanContracts_emp = db.prepare(`
  SELECT c.id, c.status, c.contract_type, c.employee_id
  FROM contracts c
  WHERE c.employee_id IS NOT NULL
  AND c.employee_id NOT IN (SELECT id FROM employees)
`).all();

const orphanContracts_co = db.prepare(`
  SELECT c.id, c.status, c.contract_type, c.company_id
  FROM contracts c
  WHERE c.company_id IS NOT NULL
  AND c.company_id NOT IN (SELECT id FROM companies)
`).all();

const allOrphanContracts = [...orphanContracts_emp, ...orphanContracts_co];
// Deduplicate by id
const uniqueOrphanCtIds = [...new Set(allOrphanContracts.map(c => c.id))];

if (uniqueOrphanCtIds.length > 0) {
  console.log('\n4. 고아 계약 발견: ' + uniqueOrphanCtIds.length + '건');
  for (const ctId of uniqueOrphanCtIds) {
    const ct = allOrphanContracts.find(c => c.id === ctId);
    console.log('   ' + ctId.substring(0,10) + '... status=' + ct.status + ' type=' + ct.contract_type);
    
    // Also clean related tables
    const relatedTables = ['contract_dispatch', 'consent_dispatch', 'contract_expiry_notice'];
    for (const table of relatedTables) {
      try {
        const r = db.prepare('DELETE FROM ' + table + ' WHERE contract_id = ?').run(ctId);
        stats.other += r.changes;
      } catch(e) {}
    }
    
    db.prepare('DELETE FROM contracts WHERE id = ?').run(ctId);
    stats.contracts++;
  }
  console.log('   고아 계약 삭제: ' + stats.contracts + '건');
} else {
  console.log('\n4. 고아 계약: 없음 ✅');
}

// ── 5. payrolls에서 유효하지 않은 employee_id 참조 확인 ──
const invalidPayrollRefs = db.prepare(`
  SELECT COUNT(*) as cnt FROM payrolls
  WHERE employee_id IS NOT NULL
  AND employee_id NOT IN (SELECT id FROM employees)
`).get().cnt;
if (invalidPayrollRefs > 0) {
  db.prepare('DELETE FROM payrolls WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT id FROM employees)').run();
  console.log('\n5. 유효하지 않은 employee_id 참조 payrolls 삭제: ' + invalidPayrollRefs + '건');
  stats.payrolls += invalidPayrollRefs;
} else {
  console.log('\n5. 유효하지 않은 payrolls 참조: 없음 ✅');
}

// ── 6. 최종 검증 ──
console.log('\n=== 최종 데이터 무결성 검증 ===');

const finalOrphanEmps = db.prepare(`
  SELECT COUNT(*) as cnt FROM employees e
  WHERE e.id NOT IN (SELECT DISTINCT employee_id FROM contracts WHERE employee_id IS NOT NULL)
`).get().cnt;

const finalOrphanPayrolls = db.prepare(`
  SELECT COUNT(*) as cnt FROM payrolls
  WHERE employee_id NOT IN (SELECT id FROM employees)
`).get().cnt;

const finalOrphanContracts = db.prepare(`
  SELECT COUNT(*) as cnt FROM contracts
  WHERE employee_id NOT IN (SELECT id FROM employees)
  OR company_id NOT IN (SELECT id FROM companies)
`).get().cnt;

const totalEmployees = db.prepare('SELECT COUNT(*) as cnt FROM employees').get().cnt;
const totalContracts = db.prepare('SELECT COUNT(*) as cnt FROM contracts WHERE is_draft=0').get().cnt;
const totalPayrolls = db.prepare('SELECT COUNT(*) as cnt FROM payrolls').get().cnt;

console.log('  고아 직원: ' + finalOrphanEmps + '명');
console.log('  고아 payrolls: ' + finalOrphanPayrolls + '건');
console.log('  고아 계약: ' + finalOrphanContracts + '건');
console.log('');
console.log('  전체 직원: ' + totalEmployees + '명');
console.log('  전체 계약: ' + totalContracts + '건');
console.log('  전체 payrolls: ' + totalPayrolls + '건');

const integrityOK = finalOrphanEmps === 0 && finalOrphanPayrolls === 0 && finalOrphanContracts === 0;
console.log('\n' + (integrityOK ? '✅ 데이터 무결성 100% 달성!' : '⚠️ 일부 정리 필요'));

// Summary
console.log('\n=== 정리 요약 ===');
console.log('  삭제된 payrolls: ' + stats.payrolls + '건');
console.log('  삭제된 직원: ' + stats.employees + '명');
console.log('  삭제된 계약: ' + stats.contracts + '건');
console.log('  기타 정리: ' + stats.other + '건');

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDone.');
