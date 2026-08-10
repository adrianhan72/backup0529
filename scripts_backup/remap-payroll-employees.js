const Database = require('better-sqlite3');
const db = new Database('data/app.db');

db.pragma('foreign_keys = OFF');

console.log('=== Payrolls Employee ID Remap ===\n');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 1. Find all orphan employees (0 contracts, referenced in payrolls)
const orphans = db.prepare(`
  SELECT e.id, e.name, e.employee_number, e.company_id
  FROM employees e
  WHERE e.id NOT IN (SELECT DISTINCT employee_id FROM contracts WHERE employee_id IS NOT NULL)
  AND e.id IN (SELECT DISTINCT employee_id FROM payrolls WHERE employee_id IS NOT NULL)
  ORDER BY e.company_id, CAST(e.employee_number AS INTEGER)
`).all();

console.log('고아 직원 (0 contracts, payrolls 있음): ' + orphans.length + '명\n');

let totalRemapped = 0;
let totalSkipped = 0;
let deletedOrphans = 0;
const remapLog = [];
const skipLog = [];

for (const orphan of orphans) {
  const payrollCount = db.prepare('SELECT COUNT(*) as cnt FROM payrolls WHERE employee_id = ?').get(orphan.id).cnt;
  
  // Find the best target employee: same empno + company, prefer ones with contracts, prefer UUID IDs
  const candidates = db.prepare(`
    SELECT e.id, e.name, e.employee_number,
           (SELECT COUNT(*) FROM contracts WHERE employee_id = e.id AND is_draft = 0) as ct_cnt,
           CASE WHEN e.id GLOB '[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]-*' THEN 1 ELSE 0 END as is_uuid
    FROM employees e
    WHERE e.company_id = ? AND e.employee_number = ? AND e.id != ?
    ORDER BY ct_cnt DESC, is_uuid DESC
  `).all(orphan.company_id, orphan.employee_number, orphan.id);
  
  if (candidates.length === 0) {
    skipLog.push({ orphan: orphan.name + '(' + orphan.id.substring(0,10) + '...)', reason: '매칭되는 실제 직원 없음', payrollCount });
    totalSkipped += payrollCount;
    continue;
  }
  
  // Pick the best candidate
  const target = candidates[0];
  
  // Safety check: don't remap if target has fewer contracts than orphan (both 0)
  // Only remap if target is clearly better or if orphan is non-UUID and target is UUID
  const orphanIsUuid = uuidPattern.test(orphan.id);
  const targetIsUuid = uuidPattern.test(target.id);
  
  if (target.ct_cnt === 0 && orphanIsUuid && !targetIsUuid) {
    // Orphan is UUID but target is not - keep orphan, delete target instead
    // This is unusual, skip for safety
    skipLog.push({ orphan: orphan.name + '(' + orphan.id.substring(0,10) + '...)', reason: '고아가 UUID인데 타겟이 non-UUID (역전)', payrollCount });
    totalSkipped += payrollCount;
    continue;
  }
  
  // REMAP: update all payrolls from orphan ID to target ID
  const updateResult = db.prepare('UPDATE payrolls SET employee_id = ? WHERE employee_id = ?').run(target.id, orphan.id);
  const updated = updateResult.changes;
  
  // Also check other tables that might reference employee_id
  const otherTables = ['payroll_items', 'attendance_ledger', 'annual_leave_ledger', 'wage_ledger_notifications', 'payroll_send_logs'];
  let otherUpdates = 0;
  for (const table of otherTables) {
    try {
      const r = db.prepare('UPDATE ' + table + ' SET employee_id = ? WHERE employee_id = ?').run(target.id, orphan.id);
      otherUpdates += r.changes;
    } catch(e) { /* table may not exist or not have employee_id column */ }
  }
  
  remapLog.push({
    orphan: orphan.name + '(' + orphan.id.substring(0,10) + '...)',
    target: target.name + '(' + target.id.substring(0,10) + '..., 계약' + target.ct_cnt + '건)',
    payrolls: updated,
    other: otherUpdates
  });
  totalRemapped += updated;
  
  // Delete the now-unreferenced orphan employee
  const remainingRefs = db.prepare('SELECT COUNT(*) as cnt FROM payrolls WHERE employee_id = ?').get(orphan.id).cnt;
  if (remainingRefs === 0) {
    db.prepare('DELETE FROM employees WHERE id = ?').run(orphan.id);
    deletedOrphans++;
  }
}

// Print results
console.log('=== Remap 결과 ===');
for (const log of remapLog.slice(0, 30)) {
  console.log('✅ ' + log.orphan + ' → ' + log.target + ' | payrolls ' + log.payrolls + '건' + (log.other > 0 ? ' (+' + log.other + '건 기타)' : ''));
}
if (remapLog.length > 30) console.log('... 외 ' + (remapLog.length - 30) + '건');

if (skipLog.length > 0) {
  console.log('\n=== Skip (remap 불가) ===');
  for (const log of skipLog) {
    console.log('❌ ' + log.orphan + ': ' + log.reason + ' | payrolls ' + log.payrollCount + '건');
  }
}

// Final stats
const remainingOrphans = db.prepare(`
  SELECT COUNT(*) as cnt FROM employees e
  WHERE e.id NOT IN (SELECT DISTINCT employee_id FROM contracts WHERE employee_id IS NOT NULL)
`).get().cnt;
const remainingOrphanPayrolls = db.prepare(`
  SELECT COUNT(*) as cnt FROM payrolls
  WHERE employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.id NOT IN (SELECT DISTINCT employee_id FROM contracts WHERE employee_id IS NOT NULL)
  )
`).get().cnt;

console.log('\n=== 최종 상태 ===');
console.log('  Remap된 payrolls: ' + totalRemapped + '건');
console.log('  Skip된 payrolls: ' + totalSkipped + '건');
console.log('  삭제된 고아 직원: ' + deletedOrphans + '명');
console.log('  잔여 고아 직원: ' + remainingOrphans + '명');
console.log('  잔여 고아 참조 payrolls: ' + remainingOrphanPayrolls + '건');

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDone.');
