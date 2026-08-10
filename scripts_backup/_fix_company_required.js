/**
 * scripts/_fix_company_required.js
 * 고객사 필수항목 누락 보정:
 *   1. 대표자(representatives) 없는 회사 → 첫 번째 직원으로 생성
 *   2. insurance_basis / annual_leave_basis null → 기본값 설정
 */
const path = require('path');
const { DB } = require('../lib/database');
const db = new DB(path.join(__dirname, '..', 'data', 'app.db'));

console.log('=== 고객사 필수항목 누락 보정 ===\n');

// ── 1. 대표자 생성 ──
const noRepCompanies = db.all(`
  SELECT c.id, c.company_name
  FROM companies c
  WHERE c.representatives IS NULL
    AND EXISTS (SELECT 1 FROM employees e WHERE e.company_id = c.id)
`);

for (const c of noRepCompanies) {
  const firstEmp = db.get(
    `SELECT e.name, e.phone, e.email, e.employee_number
     FROM employees e
     WHERE e.company_id = ?
     ORDER BY CAST(e.employee_number AS INTEGER)
     LIMIT 1`,
    [c.id]
  );
  if (!firstEmp) continue;

  const reps = [{
    name: firstEmp.name,
    phone: firstEmp.phone || '',
    email: firstEmp.email || '',
    employee_number: firstEmp.employee_number,
  }];

  db.run('UPDATE companies SET representatives = ? WHERE id = ?', [
    JSON.stringify(reps), c.id,
  ]);
  console.log(`  [REP] ${c.company_name}: 대표자 ← ${firstEmp.name} (${firstEmp.employee_number})`);
}

// ── 2. insurance_basis / annual_leave_basis 기본값 ──
const noInsurance = db.all(
  `SELECT id, company_name FROM companies WHERE insurance_basis IS NULL`
);
for (const c of noInsurance) {
  db.run('UPDATE companies SET insurance_basis = ? WHERE id = ?', ['rate_based', c.id]);
  console.log(`  [INS] ${c.company_name}: 4대보험 ← rate_based`);
}

const noAnnual = db.all(
  `SELECT id, company_name FROM companies WHERE annual_leave_basis IS NULL`
);
for (const c of noAnnual) {
  db.run('UPDATE companies SET annual_leave_basis = ? WHERE id = ?', ['fiscal_year', c.id]);
  console.log(`  [AL]  ${c.company_name}: 연차산정 ← fiscal_year`);
}

console.log('\n=== 완료 ===');
db.close();
