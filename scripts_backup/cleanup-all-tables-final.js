const Database = require('better-sqlite3');
const db = new Database('data/app.db');

db.pragma('foreign_keys = OFF');

console.log('=== 전 테이블 고아 데이터 전수 조사 및 정리 ===\n');

// Get all tables
const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();

// Reference targets
const validEmployees = new Set(db.prepare('SELECT id FROM employees').all().map(r => r.id));
const validContracts = new Set(db.prepare('SELECT id FROM contracts').all().map(r => r.id));
const validCompanies = new Set(db.prepare('SELECT id FROM companies').all().map(r => r.id));
const validPayrolls = new Set(db.prepare('SELECT id FROM payrolls').all().map(r => r.id));

console.log('기준: 직원 ' + validEmployees.size + '명, 계약 ' + validContracts.size + '건, 회사 ' + validCompanies.size + '개, payrolls ' + validPayrolls.size + '건\n');

const totalStats = {};
let grandTotal = 0;

for (const {name: table} of allTables) {
  const cols = db.prepare('PRAGMA table_info(' + table + ')').all();
  const colNames = cols.map(c => c.name);
  const rowCount = db.prepare('SELECT COUNT(*) as cnt FROM ' + table).get().cnt;
  
  let tableDeleted = 0;
  const details = [];
  
  // Check each foreign key pattern
  const fkChecks = [
    { col: 'employee_id', validSet: validEmployees, refTable: 'employees' },
    { col: 'contract_id', validSet: validContracts, refTable: 'contracts' },
    { col: 'company_id', validSet: validCompanies, refTable: 'companies' },
    { col: 'payroll_id', validSet: validPayrolls, refTable: 'payrolls' },
  ];
  
  for (const {col, validSet, refTable} of fkChecks) {
    if (!colNames.includes(col)) continue;
    
    const orphanCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM ' + table + ' WHERE ' + col + ' IS NOT NULL AND ' + col + ' NOT IN (SELECT id FROM ' + refTable + ')'
    ).get().cnt;
    
    if (orphanCount > 0) {
      db.prepare('DELETE FROM ' + table + ' WHERE ' + col + ' IS NOT NULL AND ' + col + ' NOT IN (SELECT id FROM ' + refTable + ')').run();
      tableDeleted += orphanCount;
      details.push(col + '→' + refTable + ': ' + orphanCount + '건');
    }
  }
  
  // Also check for NULL employee_id with no contract_id in payroll-related tables
  if (colNames.includes('employee_id') && colNames.includes('contract_id')) {
    // This is fine - some records may legitimately have NULL references
  }
  
  if (tableDeleted > 0) {
    totalStats[table] = { deleted: tableDeleted, details, before: rowCount };
    grandTotal += tableDeleted;
  }
}

// Print results sorted by deleted count
console.log('=== 정리 결과 ===');
const sorted = Object.entries(totalStats).sort((a, b) => b[1].deleted - a[1].deleted);
for (const [table, info] of sorted) {
  console.log(table + ' (' + info.before + '→' + (info.before - info.deleted) + '건):');
  for (const d of info.details) {
    console.log('  └ ' + d);
  }
}

console.log('\n총 삭제: ' + grandTotal + '건');

// ── Final comprehensive verification ──
console.log('\n=== 최종 무결성 검증 (전체 테이블) ===');
let allClean = true;
for (const {name: table} of allTables) {
  const cols = db.prepare('PRAGMA table_info(' + table + ')').all();
  const colNames = cols.map(c => c.name);
  
  for (const {col, refTable} of [
    {col: 'employee_id', refTable: 'employees'},
    {col: 'contract_id', refTable: 'contracts'},
    {col: 'company_id', refTable: 'companies'},
    {col: 'payroll_id', refTable: 'payrolls'},
  ]) {
    if (!colNames.includes(col)) continue;
    
    const remaining = db.prepare(
      'SELECT COUNT(*) as cnt FROM ' + table + ' WHERE ' + col + ' IS NOT NULL AND ' + col + ' NOT IN (SELECT id FROM ' + refTable + ')'
    ).get().cnt;
    
    if (remaining > 0) {
      console.log('  ❌ ' + table + '.' + col + ' → ' + refTable + ': ' + remaining + '건 남음');
      allClean = false;
    }
  }
}

if (allClean) console.log('  ✅ 모든 테이블의 모든 외래키 참조가 유효함');

// Quick stats
console.log('\n=== DB 현황 ===');
for (const {name: table} of allTables) {
  const cnt = db.prepare('SELECT COUNT(*) as cnt FROM ' + table).get().cnt;
  if (cnt > 0) console.log('  ' + table + ': ' + cnt + '건');
  else console.log('  ' + table + ': (비어있음)');
}

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDone.');
