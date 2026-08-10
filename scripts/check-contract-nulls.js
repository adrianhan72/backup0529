const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const contracts = db.contracts || [];
const employees = db.employees || [];
const companies = db.companies || [];

// 필수 필드 목록
const requiredFields = [
  'contract_start', 'contract_type', 'employee_id', 'company_id',
  'base_salary', 'work_hours_per_day', 'work_days_per_week',
  'hourly_wage', 'monthly_salary_agreed', 'weekly_holiday_pay',
  'insurance_pension', 'insurance_health', 'insurance_employment', 'insurance_industrial'
];

console.log(`전체 계약: ${contracts.length}건\n`);

// 각 필드별 null/missing 건수
for (const f of requiredFields) {
  const missing = contracts.filter(c => c[f] === null || c[f] === undefined || c[f] === '' || c[f] === 0);
  if (missing.length > 0) {
    console.log(`${f}: ${missing.length}건 누락`);
    missing.slice(0, 5).forEach(c => {
      const emp = employees.find(e => e.id === c.employee_id);
      console.log(`  ${c.id} (${emp ? emp.name : '?'}, ${c.contract_type || '?'})`);
    });
  }
}

// employee_id로 연결 안 되는 계약
const orphanContracts = contracts.filter(c => {
  if (!c.employee_id) return true;
  const emp = employees.find(e => e.id === c.employee_id);
  return !emp;
});
console.log(`\n연결된 직원 없음: ${orphanContracts.length}건`);
orphanContracts.forEach(c => console.log(`  ${c.id} employee_id=${c.employee_id}`));

// company_id로 연결 안 되는 계약
const noCompany = contracts.filter(c => {
  if (!c.company_id) return true;
  const co = companies.find(x => x.id === c.company_id);
  return !co;
});
console.log(`\n연결된 회사 없음: ${noCompany.length}건`);
