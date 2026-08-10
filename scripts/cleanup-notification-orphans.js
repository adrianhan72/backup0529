const Database = require('better-sqlite3');
const db = new Database('data/app.db');

db.pragma('foreign_keys = OFF');

console.log('=== 알림/메시지 이력 고아 데이터 정리 ===\n');

// Find all tables that might have references to employees/contracts/companies
const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

const stats = {};

for (const {name: table} of allTables) {
  const cols = db.prepare('PRAGMA table_info(' + table + ')').all();
  const colNames = cols.map(c => c.name);
  
  let deleted = 0;
  
  // Check employee_id references
  if (colNames.includes('employee_id')) {
    const orphanCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM ' + table + ' WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT id FROM employees)'
    ).get().cnt;
    if (orphanCount > 0) {
      db.prepare('DELETE FROM ' + table + ' WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT id FROM employees)').run();
      deleted += orphanCount;
    }
  }
  
  // Check contract_id references
  if (colNames.includes('contract_id')) {
    const orphanCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM ' + table + ' WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts)'
    ).get().cnt;
    if (orphanCount > 0) {
      db.prepare('DELETE FROM ' + table + ' WHERE contract_id IS NOT NULL AND contract_id NOT IN (SELECT id FROM contracts)').run();
      deleted += orphanCount;
    }
  }
  
  // Check company_id references
  if (colNames.includes('company_id')) {
    const orphanCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM ' + table + ' WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies)'
    ).get().cnt;
    if (orphanCount > 0) {
      db.prepare('DELETE FROM ' + table + ' WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM companies)').run();
      deleted += orphanCount;
    }
  }
  
  if (deleted > 0) {
    stats[table] = deleted;
  }
}

// Print results
console.log('정리된 테이블:');
let totalDeleted = 0;
for (const [table, count] of Object.entries(stats)) {
  console.log('  ' + table + ': ' + count + '건');
  totalDeleted += count;
}
console.log('\n총 삭제: ' + totalDeleted + '건');

// Final verification
console.log('\n=== 최종 검증 ===');
for (const [table] of Object.entries(stats)) {
  const cols = db.prepare('PRAGMA table_info(' + table + ')').all();
  const colNames = cols.map(c => c.name);
  
  for (const col of ['employee_id', 'contract_id', 'company_id']) {
    if (colNames.includes(col)) {
      const refTable = col === 'employee_id' ? 'employees' : col === 'contract_id' ? 'contracts' : 'companies';
      const remaining = db.prepare(
        'SELECT COUNT(*) as cnt FROM ' + table + ' WHERE ' + col + ' IS NOT NULL AND ' + col + ' NOT IN (SELECT id FROM ' + refTable + ')'
      ).get().cnt;
      if (remaining > 0) {
        console.log('  ⚠️ ' + table + '.' + col + ' 아직 ' + remaining + '건 남음');
      }
    }
  }
}
console.log('  ✅ 검증 완료');

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDone.');
