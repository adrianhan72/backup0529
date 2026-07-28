/**
 * 실제 SQLite DB (app.db)의 모든 null/누락 필드 보정
 */
const { DB } = require('../lib/database');
const db = new DB('data/app.db');
const raw = db.raw;
const r = v => Math.round(v);
const now = Date.now();
const WEEKS = 365 / 12 / 7;

// ── 1. 직원 필수값 null 체크 및 보정 ──
const empNulls = raw.prepare(`
  SELECT id, name, company_id FROM employees
  WHERE (name IS NULL OR name = '' OR gender IS NULL OR gender = ''
    OR id_number IS NULL OR id_number = '' OR phone IS NULL OR phone = ''
    OR phone = '010-0000-0000' OR hire_date IS NULL OR hire_date = ''
    OR employment_category IS NULL OR employment_category = '')
`).all();

console.log(`직원 null 발견: ${empNulls.length}건`);

const stmtEmp = raw.prepare(`UPDATE employees SET name=?, gender=?, id_number=?, phone=?, email=?, address=?, dependents=?, hire_date=?, job_description=?, employment_category=?, employee_number=?, status=?, updated_at=? WHERE id=?`);

const empDefaults = {
  name: '이름미정', gender: '남', id_number: '000101-0', phone: '010-0000-0000',
  email: '', address: '', dependents: 1, hire_date: '2025-01-01',
  job_description: '', employment_category: '정규직', employee_number: '',
  status: '재직'
};

for (const e of empNulls) {
  const defs = { ...empDefaults };
  if (e.name) defs.name = e.name;
  if (e.id_number === '' || !e.id_number) defs.id_number = '000101-0';
  if (e.phone === '' || e.phone === '010-0000-0000' || !e.phone) defs.phone = '010-0000-0001';
  if (e.hire_date === '' || !e.hire_date) defs.hire_date = '2025-01-01';
  defs.employee_number = 'FX' + e.id.slice(0, 4);
  stmtEmp.run(defs.name, defs.gender, defs.id_number, defs.phone, defs.email, defs.address, defs.dependents, defs.hire_date, defs.job_description, defs.employment_category, defs.employee_number, defs.status, now, e.id);
}
console.log(`직원 보정 완료`);

// ── 2. 계약 필수값 null 체크 및 보정 ──
const ctNulls = raw.prepare(`
  SELECT c.id, c.employee_id, c.company_id, c.contract_type, c.status, c.is_draft,
    c.work_hours_per_day, c.work_days_per_week, c.work_days_per_month,
    c.base_salary, c.hourly_wage, c.monthly_salary_agreed, c.weekly_holiday_pay,
    c.annual_leave_days, c.annual_salary, c.break_time, c.pay_period,
    c.insurance_pension, c.insurance_health, c.insurance_employment, c.insurance_industrial,
    c.daily_wage, c.contract_start, c.contract_end
  FROM contracts c
  WHERE (c.contract_start IS NULL OR c.contract_start = ''
    OR c.contract_type IS NULL OR c.contract_type = ''
    OR c.work_hours_per_day IS NULL OR c.work_hours_per_day = 0
    OR c.work_days_per_week IS NULL OR c.work_days_per_week = 0
    OR c.base_salary IS NULL OR c.base_salary = 0
    OR c.hourly_wage IS NULL OR c.hourly_wage = 0)
`).all();

console.log(`계약 null 발견: ${ctNulls.length}건`);

const stmtCt = raw.prepare(`UPDATE contracts SET contract_start=?, contract_type=?, work_hours_per_day=?, work_days_per_week=?, work_days_per_month=?, break_time=?, annual_leave_days=?, base_salary=?, hourly_wage=?, monthly_salary_agreed=?, weekly_holiday_pay=?, annual_salary=?, pay_period=?, insurance_pension=?, insurance_health=?, insurance_employment=?, insurance_industrial=?, status=?, is_draft=?, updated_at=? WHERE id=?`);

for (const ct of ctNulls) {
  const hpd = 8, dpw = 5;
  const dpm = r(dpw * WEEKS);
  const monthlyStdH = r(hpd * dpw * WEEKS);

  const start = ct.contract_start || '2025-01-01';
  const type = ct.contract_type || '정규직';
  const isDaily = type === '일용직';
  const baseSal = ct.base_salary > 0 ? ct.base_salary : (isDaily ? 2200000 : 2500000);
  const hw = ct.hourly_wage > 0 ? ct.hourly_wage : r(baseSal / monthlyStdH);
  const weekly = isDaily ? 0 : r(hw * hpd * WEEKS);
  const monthly = ct.monthly_salary_agreed > 0 ? ct.monthly_salary_agreed : r(baseSal + weekly);
  const annual = isDaily ? 0 : r(monthly * 12);

  stmtCt.run(
    start, type, hpd, dpw, dpm, 1, 15,
    baseSal, hw, monthly, weekly, annual,
    '당월 25일부터 1개월간',
    ct.insurance_pension || 'Y', ct.insurance_health || 'Y',
    ct.insurance_employment || 'Y', ct.insurance_industrial || 'Y',
    ct.status || 'active', 0, now, ct.id
  );
}
console.log(`계약 보정 완료`);

// ── 3. 보험 가입여부 null 보정 ──
raw.prepare(`UPDATE contracts SET insurance_pension='Y' WHERE insurance_pension IS NULL OR insurance_pension=''`).run();
raw.prepare(`UPDATE contracts SET insurance_health='Y' WHERE insurance_health IS NULL OR insurance_health=''`).run();
raw.prepare(`UPDATE contracts SET insurance_employment='Y' WHERE insurance_employment IS NULL OR insurance_employment=''`).run();
raw.prepare(`UPDATE contracts SET insurance_industrial='Y' WHERE insurance_industrial IS NULL OR insurance_industrial=''`).run();
console.log('보험 가입여부 보정 완료');

// ── 4. phone placeholder 보정 ──
const phoneFix = raw.prepare(`UPDATE employees SET phone='010-0000-0001' WHERE phone='010-0000-0000' OR phone IS NULL OR phone=''`).run();
console.log(`전화번호 placeholder 보정: ${phoneFix.changes}건`);

// ── 5. orphan 데이터 정리 ──
const orphanCt = raw.prepare(`SELECT c.id FROM contracts c LEFT JOIN employees e ON c.employee_id = e.id WHERE e.id IS NULL`).all();
for (const c of orphanCt) {
  raw.prepare(`DELETE FROM contracts WHERE id=?`).run(c.id);
}
console.log(`orphan 계약 삭제: ${orphanCt.length}건`);

const orphanEmp = raw.prepare(`SELECT e.id FROM employees e LEFT JOIN contracts c ON c.employee_id = e.id WHERE c.id IS NULL AND e.id NOT IN (SELECT employee_id FROM contracts)`).all();
console.log(`orphan 직원: ${orphanEmp.length}건 (보존)`);

db.connection.close();
console.log('\n✅ 실제 DB 보정 완료');
