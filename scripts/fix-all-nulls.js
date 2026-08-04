/**
 * 모든 테이블의 null/누락 필드 일괄 보정
 * - emp_null_* 직원: 모든 필수 필드 채움
 * - ct_null_* 계약: 계약 산식에 맞게 계산된 값으로 채움
 * - con01_s66/s62, cont_draft_*: 삭제 (연결된 직원 없음)
 */
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));
const now = Date.now();
const r = v => Math.round(v);
const num = (v, d = 0) => { const n = Number(v); return isNaN(n) ? d : n; };
const WEEKS = 365 / 12 / 7;

// ── 1. emp_null_* 직원 필수값 채우기 ──
const empFixes = {
  emp_null_01: { name: '김테스트', gender: '남', id_number: '900101-1', phone: '010-9001-0001', email: 'test01@test.com', address: '서울시 테스트구 1길', dependents: 1, hire_date: '2025-01-01', job_description: '테스트 데이터 (id_number/phone null → 보정)', employment_category: '정규직', employee_number: 'TN01', status: '재직' },
  emp_null_02: { name: '이나테', gender: '여', id_number: '910201-2', phone: '010-9002-0002', email: 'test02@test.com', address: '서울시 테스트구 2길', dependents: 1, hire_date: '2025-02-01', job_description: '테스트 데이터 (name/gender/hire_date null → 보정)', employment_category: '계약직', employee_number: 'TN02', status: '재직' },
  emp_null_03: { name: '박공백', gender: '여', id_number: '920301-2', phone: '010-9003-0003', email: 'test03@test.com', address: '서울시 테스트구 3길', dependents: 1, job_description: '테스트 데이터 (id_number/address null → 보정)', employment_category: '정규직', employee_number: 'TN03', status: '재직' },
  emp_null_04: { name: '최일용', gender: '남', id_number: '930401-1', phone: '010-9004-0004', email: 'test04@test.com', address: '서울시 테스트구 4길', dependents: 1, hire_date: '2025-06-01', job_description: '테스트 데이터 (employee_number null → 보정)', employment_category: '일용직', employee_number: 'TN04', status: '재직' },
  emp_null_05: { name: '정무형', gender: '남', id_number: '940501-1', phone: '010-9005-0005', email: 'test05@test.com', address: '서울시 테스트구 5길', dependents: 1, hire_date: '2025-09-01', job_description: '테스트 데이터 (employment_category null → 보정)', employment_category: '정규직', employee_number: 'TN05', status: '재직' },
  emp_null_06: { name: '강전무', gender: '남', id_number: '950601-1', phone: '010-9006-0006', email: 'test06@test.com', address: '서울시 테스트구 6길', dependents: 1, hire_date: '2025-11-01', job_description: '테스트 데이터 (전체 null → 보정)', employment_category: '정규직', employee_number: 'TN06', status: '재직' },
};

let empFixed = 0;
(db.employees || []).forEach(e => {
  const fix = empFixes[e.id];
  if (!fix) return;
  Object.assign(e, fix);
  e.updated_at = now;
  e.note = fix.job_description;
  empFixed++;
});
console.log(`직원 보정: ${empFixed}건`);

// ── 2. ct_null_* 계약 채우기 ──
const ctFixes = {};
for (const ct of (db.contracts || [])) {
  if (!ct.id.startsWith('ct_null_')) continue;

  const emp = (db.employees || []).find(e => e.id === ct.employee_id);
  if (!emp) continue;

  const hpd = 8, dpw = 5;
  const dpm = r(dpw * WEEKS);
  const monthlyStdH = r(hpd * dpw * WEEKS);
  const baseSal = ct.monthly_salary_agreed > 0 ? num(ct.monthly_salary_agreed) : 2500000;

  const fixes = {};
  if (!ct.contract_start) fixes.contract_start = '2025-01-01';
  if (!ct.contract_type) fixes.contract_type = emp.employment_category || '정규직';
  if (!ct.work_hours_per_day || num(ct.work_hours_per_day) === 0) fixes.work_hours_per_day = hpd;
  if (!ct.work_days_per_week || num(ct.work_days_per_week) === 0) fixes.work_days_per_week = dpw;
  if (!ct.work_days_per_month || num(ct.work_days_per_month) === 0) fixes.work_days_per_month = dpm;
  if (!ct.break_time) fixes.break_time = 1;
  if (!ct.annual_leave_days || num(ct.annual_leave_days) === 0) fixes.annual_leave_days = 15;

  const isDaily = (fixes.contract_type || ct.contract_type) === '일용직';
  if (isDaily) {
    if (!ct.daily_wage || num(ct.daily_wage) === 0) ct.daily_wage = 100000;
    const dw = num(ct.daily_wage);
    if (!ct.base_salary || num(ct.base_salary) === 0) fixes.base_salary = r(dw * dpm);
    if (!ct.hourly_wage || num(ct.hourly_wage) === 0) fixes.hourly_wage = r(dw / hpd);
    if (!ct.monthly_salary_agreed || num(ct.monthly_salary_agreed) === 0) fixes.monthly_salary_agreed = r(dw * dpm);
    if (ct.weekly_holiday_pay === null || ct.weekly_holiday_pay === undefined) fixes.weekly_holiday_pay = 0;
  } else {
    if (!ct.hourly_wage || num(ct.hourly_wage) === 0) {
      const b = num(fixes.base_salary || ct.base_salary);
      if (b > 0) fixes.hourly_wage = r(b / monthlyStdH);
      else fixes.hourly_wage = r(baseSal / monthlyStdH);
    }
    const hw = num(fixes.hourly_wage || ct.hourly_wage);
    if (!ct.weekly_holiday_pay || num(ct.weekly_holiday_pay) === 0) fixes.weekly_holiday_pay = r(hw * r(hpd * WEEKS));  // 시급 × 월주휴시간
    if (!ct.base_salary || num(ct.base_salary) === 0) fixes.base_salary = baseSal;
    if (!ct.monthly_salary_agreed || num(ct.monthly_salary_agreed) === 0) {
      fixes.monthly_salary_agreed = r(num(fixes.base_salary || ct.base_salary) + num(fixes.weekly_holiday_pay || ct.weekly_holiday_pay));
    }
    fixes.annual_salary = r(num(fixes.monthly_salary_agreed || ct.monthly_salary_agreed) * 12);
  }

  // insurance
  ['insurance_pension','insurance_health','insurance_employment','insurance_industrial'].forEach(f => {
    if (ct[f] === null || ct[f] === undefined || ct[f] === '') fixes[f] = 'Y';
  });

  // pay_period, status
  if (!ct.pay_period) fixes.pay_period = '당월 25일부터 1개월간';
  if (ct.status === 'draft') fixes.status = 'active';
  if (ct.is_draft === 1) fixes.is_draft = 0;

  ctFixes[ct.id] = fixes;
  Object.assign(ct, fixes);
  ct.updated_at = now;
  ct.note = (ct.note || '') + ' [null 필드 보정됨]';
}

console.log(`계약 보정: ${Object.keys(ctFixes).length}건`);

// ── 3. orphan 계약/임시저장 삭제 ──
const toDelete = ['con01_s66', 'con01_s62', 'cont_draft_001', 'cont_draft_002'];
const before = db.contracts.length;
db.contracts = db.contracts.filter(c => !toDelete.includes(c.id));
console.log(`orphan 계약 삭제: ${before - db.contracts.length}건 (${toDelete.join(', ')})`);

// ── 4. orphan 직원 삭제 ──
const empToDelete = ['emp_draft_ct1', 'emp01_s66', 'emp01_s62'];
const empBefore = db.employees.length;
db.employees = (db.employees || []).filter(e => !empToDelete.includes(e.id));
console.log(`orphan 직원 삭제: ${empBefore - db.employees.length}건 (${empToDelete.join(', ')})`)

fs.writeFileSync('data/db.json', JSON.stringify(db, null, 2), 'utf8');
console.log('\n저장 완료');
