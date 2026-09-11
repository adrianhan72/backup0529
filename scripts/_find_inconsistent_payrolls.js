/**
 * _find_inconsistent_payrolls.js — 최종 반영 산식 기준 급여명세서 전수조사 (2026-09-11)
 * 판정 항목 ([A]~[D] — audit-payslip-consistency.js와 동일 기준):
 *  [A] 지급총액 = Σ지급항목 (주휴수당 미가산)
 *  [B] 공제합계 = Σ공제항목
 *  [C] 실수령액 = 지급총액 − 공제합계
 *  [D] 4대보험 = 보수월액 × 기간별 요율 (확정액 기준 fixed_amount 고객사 제외)
 * 불일치가 1건이라도 있는 직원 ID 목록을 출력 + JSON 파일로 저장한다.
 */
const fs = require('fs');
const path = require('path');
const { DB } = require('../lib/database');
const db = new DB('data/app.db');

const TOL = 50;
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const sumJson = json => {
  let arr = [];
  try { arr = typeof json === 'string' ? JSON.parse(json) : (json || []); } catch (e) { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  return arr.reduce((s, v) => s + (num(v && v.amount) || 0), 0);
};

const rateRows = db.all(`SELECT insurance_type, rate, cap_amount, period_start, period_end FROM insurance_rates`);
function rateFor(type, period) {
  const pStart = period + '-01', pEnd = period + '-31';
  let r = rateRows.filter(x => x.insurance_type === type
    && (!x.period_start || x.period_start <= pEnd) && (!x.period_end || x.period_end >= pStart)
  ).sort((a, b) => (b.period_start || '').localeCompare(a.period_start || ''))[0];
  if (!r) r = rateRows.filter(x => x.insurance_type === type && (!x.period_start || x.period_start <= pStart))
    .sort((a, b) => (b.period_start || '').localeCompare(a.period_start || ''))[0];
  return r ? { rate: num(r.rate) / 100, cap: num(r.cap_amount) } : null;
}
const fixedBasis = new Set(db.all(`SELECT id FROM companies WHERE insurance_basis='fixed_amount'`).map(r => r.id));

// 계약 고정 연장/야간/휴일수당 (지급총액 산정 참조 — audit과 동일)
const ctsByEmp = {};
for (const c of db.all(`SELECT employee_id, contract_start, contract_end, probation_months, probation_amt, probation_pct, probation_basis, monthly_salary_agreed, fixed_ot_pay, fixed_night_pay, fixed_hol_pay FROM contracts WHERE is_draft IS NULL OR is_draft != 1`)) {
  (ctsByEmp[c.employee_id] = ctsByEmp[c.employee_id] || []).push(c);
}
function fixedPaysFor(p) {
  const list = ctsByEmp[p.employee_id] || [];
  if (!list.length) return 0;
  const ym = `${p.pay_year}-${String(p.pay_month).padStart(2, '0')}`;
  let c = list.filter(x => {
    if (x.contract_start && x.contract_start.slice(0, 7) > ym) return false;
    if (x.contract_end && x.contract_end.slice(0, 7) < ym) return false;
    return true;
  }).sort((a, b) => (b.contract_start || '').localeCompare(a.contract_start || ''))[0] || null;
  if (!c) {
    const ymNum = p.pay_year * 100 + p.pay_month;
    c = list.map(x => ({ x, d: (() => { const sm = String(x.contract_start || '').slice(0, 7).replace('-', ''); return sm ? Math.abs(parseInt(sm) - ymNum) : 999999; })() }))
      .sort((a, b) => a.d - b.d)[0]?.x || null;
    if (!c) return 0;
  }
  let r = 1;
  if (num(c.probation_amt) > 0 || num(c.probation_pct) > 0) {
    let pe = c.contract_end || null;
    if (c.probation_months && c.contract_start) {
      const d = new Date(c.contract_start + 'T00:00:00');
      d.setMonth(d.getMonth() + Number(c.probation_months)); d.setDate(d.getDate() - 1);
      pe = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    const amt = num(c.probation_amt), basis = c.probation_basis || 'salary';
    if (amt > 0 && basis === 'direct') { const m = num(c.monthly_salary_agreed); r = m > 0 ? amt / m : 1; }
    else { const pct = num(c.probation_pct); r = (pct > 0 && pct < 100) ? pct / 100 : 1; }
    if (pe && ym > pe.slice(0, 7)) r = 1;
  }
  if (r >= 1) r = 1;
  return Math.round((num(c.fixed_ot_pay) + num(c.fixed_night_pay) + num(c.fixed_hol_pay)) * r);
}

const payrolls = db.all(`SELECT p.*, e.name AS emp_name FROM payrolls p LEFT JOIN employees e ON e.id=p.employee_id ORDER BY p.pay_year, p.pay_month, p.employee_id`);
const bad = { A: new Set(), B: new Set(), C: new Set(), D: new Set() };

for (const p of payrolls) {
  const period = `${p.pay_year}-${String(p.pay_month).padStart(2, '0')}`;
  // [A]
  const paySum = num(p.base_salary)
    + num(p.position_allowance) + num(p.site_allowance)
    + num(p.transportation_allowance || p.car_maintenance) + num(p.self_driving_allowance)
    + num(p.remote_area_allowance) + num(p.meal_allowance) + num(p.childcare_allowance)
    + num(p.research_allowance) + num(p.skill_allowance) + num(p.license_allowance) + num(p.hazard_allowance)
    + num(p.overtime_pay) + num(p.night_pay) + num(p.holiday_pay)
    + num(p.annual_leave_pay) + num(p.bonus_pay) + num(p.performance_pay) + num(p.actual_expense_pay)
    + num(p.communication_pay) + num(p.fitness_allowance) + num(p.self_dev_allowance)
    + num(p.book_allowance) + num(p.overseas_allowance)
    + num(p.severance_interim_pay) + (num(p.etc_allowance) + num(p.other_pay))
    + sumJson(p.custom_ordinary_values) + sumJson(p.custom_fixed_values) + sumJson(p.etc_allowance_items)
    + fixedPaysFor(p);
  const gross = num(p.gross_pay);
  if (Math.abs(gross - paySum) > TOL) bad.A.add(p.employee_id);

  // [B]
  const dedSum = num(p.income_tax) + num(p.local_income_tax)
    + num(p.health_insurance) + num(p.long_term_care) + num(p.national_pension) + num(p.employment_insurance)
    + num(p.year_end_tax_adjust) + num(p.health_insurance_adjust) + num(p.advance_deduction)
    + num(p.health_insurance_adjust_yearend) + num(p.ltcare_adjust_yearend);
  if (Math.abs(num(p.total_deduction) - dedSum) > TOL) bad.B.add(p.employee_id);

  // [C]
  const storedDed = num(p.total_deduction);
  const reconciledDed = Math.abs(storedDed - dedSum) > TOL ? dedSum : storedDed;
  if (Math.abs(num(p.net_pay) - (gross - reconciledDed)) > TOL) bad.C.add(p.employee_id);

  // [D] (fixed_amount 회사 제외, 저장값 0은 제외)
  if (!fixedBasis.has(p.company_id)) {
    const std = num(p.standard_monthly_pay) || gross;
    if (std > 0) {
      const R_p = rateFor('national_pension', period), R_h = rateFor('health', period),
        R_l = rateFor('long_term_care', period), R_e = rateFor('employment', period);
      const pen = num(p.national_pension), h = num(p.health_insurance),
        lt = num(p.long_term_care), emp = num(p.employment_insurance);
      const penExp = Math.round(Math.min(std, R_p.cap || 1e12) * R_p.rate);
      const hExp = Math.round(std * R_h.rate);
      const ltExp = Math.round(h * R_l.rate);
      const empExp = Math.round(std * R_e.rate);
      if ((pen > 0 && Math.abs(pen - penExp) > TOL)
        || (h > 0 && Math.abs(h - hExp) > TOL)
        || (lt > 0 && h > 0 && Math.abs(lt - ltExp) > TOL)
        || (emp > 0 && Math.abs(emp - empExp) > TOL)) bad.D.add(p.employee_id);
    }
  }
}

const all = new Set([...bad.A, ...bad.B, ...bad.C, ...bad.D]);
const list = [...all].sort();
const names = {};
db.all(`SELECT id, name FROM employees`).forEach(e => names[e.id] = e.name || e.id);

console.log('전체 payrolls:', payrolls.length);
console.log('[A] 지급총액 불일치 직원:', bad.A.size);
console.log('[B] 공제합계 불일치 직원:', bad.B.size);
console.log('[C] 실수령액 불일치 직원:', bad.C.size);
console.log('[D] 4대보험 불일치 직원:', bad.D.size);
console.log('전체 대상 직원(합집합):', all.size);
console.log('대상 명단:');
for (const id of list) console.log(' -', id, names[id]);

fs.writeFileSync(path.join(__dirname, '_inconsistent_emp_ids.json'), JSON.stringify(list, null, 2), 'utf8');
console.log('saved -> scripts/_inconsistent_emp_ids.json');
