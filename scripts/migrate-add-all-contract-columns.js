const Database = require('better-sqlite3');
const db = new Database('data/app.db');

const existing = db.prepare('PRAGMA table_info(contracts)').all().map(c => c.name);

const allFields = {
  // 기본
  employee_id: 'TEXT', company_id: 'TEXT',
  contract_start: 'TEXT', contract_end: 'TEXT',
  contract_type: 'TEXT', status: 'TEXT',
  work_hours_per_day: 'REAL', work_days_per_week: 'REAL',
  schedule_json: 'TEXT',
  annual_leave_days: 'REAL', annual_salary: 'REAL',
  monthly_salary_agreed: 'REAL', base_salary: 'REAL',
  daily_wage: 'REAL', weekly_holiday_pay: 'REAL', hourly_wage: 'REAL',
  // 수당
  position_allowance: 'REAL',
  transportation_allowance: 'REAL', transportation_pay_type: 'TEXT',
  self_driving_allowance: 'REAL', self_driving_pay_type: 'TEXT',
  remote_area_allowance: 'REAL', remote_area_pay_type: 'TEXT',
  meal_allowance: 'REAL', meal_pay_type: 'TEXT',
  research_allowance: 'REAL', research_pay_type: 'TEXT',
  site_allowance: 'REAL',
  skill_allowance: 'REAL', license_allowance: 'REAL',
  communication_allowance: 'REAL', communication_pay_type: 'TEXT',
  fitness_allowance: 'REAL', fitness_pay_type: 'TEXT',
  self_dev_allowance: 'REAL', self_dev_pay_type: 'TEXT',
  book_allowance: 'REAL', book_pay_type: 'TEXT',
  overseas_allowance: 'REAL', overseas_pay_type: 'TEXT',
  car_maintenance: 'REAL', regular_bonus: 'REAL',
  childcare_allowance: 'REAL', childcare_dependents: 'INTEGER', childcare_pay_type: 'TEXT',
  contract_etc_allowance: 'REAL', etc_allowance: 'REAL', etc_allowance_memo: 'TEXT',
  // 보험
  insurance_employment: 'TEXT', insurance_industrial: 'TEXT',
  insurance_pension: 'TEXT', insurance_health: 'TEXT',
  // 기타
  note: 'TEXT', salary_start_date: 'TEXT', salary_end_date: 'TEXT',
  is_draft: 'INTEGER', draft_saved_at: 'INTEGER',
  edit_source_id: 'TEXT', employment_category: 'TEXT',
  transport_type: 'TEXT', transport_pay_type: 'TEXT',
  // 스키마에 이미 있을 가능성 높은 것들도 포함
  break_time: 'REAL', work_days_per_month: 'REAL',
  pay_period: 'TEXT', pay_day: 'INTEGER',
  fixed_ot_pay: 'REAL', fixed_ot_hours: 'REAL',
  fixed_night_pay: 'REAL', fixed_night_hours: 'REAL',
  fixed_hol_pay: 'REAL', fixed_hol_hours: 'REAL',
  probation_months: 'INTEGER', probation_pct: 'REAL', probation_amt: 'REAL', probation_basis: 'TEXT',
  amended_from: 'TEXT', is_voided_by_amend: 'INTEGER', voided_at: 'TEXT',
  signed_file_name: 'TEXT', signed_file_data: 'TEXT',
  consent_file_name: 'TEXT', consent_file_data: 'TEXT',
};

let added = [];
let failed = [];
for (const [name, type] of Object.entries(allFields)) {
  if (!existing.includes(name)) {
    try {
      db.prepare(`ALTER TABLE contracts ADD COLUMN ${name} ${type}`).run();
      added.push(name);
    } catch (e) {
      failed.push(`${name}: ${e.message}`);
    }
  }
}

console.log(`Added ${added.length} columns: ${added.join(', ')}`);
if (failed.length) console.log(`Failed ${failed.length}: ${failed.join('; ')}`);

const updated = db.prepare('PRAGMA table_info(contracts)').all();
console.log(`Total columns now: ${updated.length}`);
db.close();
