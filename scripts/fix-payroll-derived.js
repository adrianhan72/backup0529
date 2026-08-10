/**
 * 급여 데이터 최종 산식 보정
 * - 계약 기반 필드(base_salary, weekly_holiday_pay, fixed_ot/night/hol, 수당, hourly_wage)는 보존
 * - 파생 필드(standard_monthly_pay, gross_pay, 4대보험, 소득세, total_deduction, net_pay)는 재계산
 */
const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const payrolls = db.payrolls || [];
const contracts = db.contracts || [];
const employees = db.employees || [];
const insuranceRates = db.insurance_rates || [];
const taxBrackets = db.tax_bracket_rows || [];

const r = v => Math.round(v);
const num = (v, d = 0) => { const n = Number(v); return isNaN(n) ? d : n; };
const DRY_RUN = process.argv.includes('--dry-run');

// ── 보험료율 ──
function getRates(year) {
  const yr = insuranceRates.filter(r => r.year === year);
  const p = yr.find(r => r.insurance_type === 'national_pension') || {};
  const h = yr.find(r => r.insurance_type === 'health') || {};
  const l = yr.find(r => r.insurance_type === 'long_term_care') || {};
  const e = yr.find(r => r.insurance_type === 'employment') || {};
  return {
    pension: num(p.rate, 4.5) / 100,
    health: num(h.rate, 3.545) / 100,
    ltcare: num(l.rate, 12.95) / 100,
    employ: num(e.rate, 0.9) / 100,
    pensionCap: num(p.cap_amount, 6370000)
  };
}

// ── 소득세 ──
function getTaxForDep(row, dep) {
  if (row.length <= 4) return Math.max(0, row[2]);
  const idx = Math.min(dep, 7);
  let tax = row[1 + idx] || 0;
  if (dep > 7) tax = Math.max(0, (row[8] || 0) - (dep - 7) * (row[9] || 0));
  return Math.max(0, tax);
}

function calcIncomeTax(stdPay, dep, year) {
  let rows = taxBrackets.filter(r => r.year === year);
  if (rows.length === 0) {
    const maxYr = Math.max(...taxBrackets.map(r => r.year));
    rows = taxBrackets.filter(r => r.year === maxYr);
  }
  rows.sort((a, b) => a.from_amount - b.from_amount);
  for (const row of rows) {
    if (stdPay >= row.from_amount && stdPay < row.to_amount) {
      return getTaxForDep([row.from_amount, row.to_amount, row.dep1_tax, row.dep2_tax, row.dep3_tax, row.dep4_tax, row.dep5_tax, row.dep6_tax, row.dep7_tax, row.extra_per_dep], dep);
    }
  }
  const last = rows[rows.length - 1];
  if (last && stdPay >= last.from_amount) return getTaxForDep([last.from_amount, last.to_amount, last.dep1_tax, last.dep2_tax, last.dep3_tax, last.dep4_tax, last.dep5_tax, last.dep6_tax, last.dep7_tax, last.extra_per_dep], dep);
  return 0;
}

const fixedAllowPt = ['fixed', '매월', '매월(정기)'];
const allowanceFields = [
  'meal_allowance', 'transportation_allowance', 'position_allowance', 'skill_allowance',
  'license_allowance', 'site_allowance', 'remote_area_allowance', 'hazard_allowance',
  'childcare_allowance', 'research_allowance', 'communication_allowance', 'fitness_allowance',
  'self_dev_allowance', 'book_allowance', 'overseas_allowance', 'regular_bonus',
  'self_driving_allowance', 'car_maintenance', 'contract_etc_allowance', 'etc_allowance'
];

const earningFields = [
  'base_salary', 'weekly_holiday_pay',
  'overtime_pay', 'night_pay', 'holiday_pay',
  'fixed_ot_pay', 'fixed_night_pay', 'fixed_hol_pay',
  'annual_leave_pay', 'bonus_pay', 'performance_pay',
  'actual_expense_pay', 'communication_pay',
  'position_allowance', 'skill_allowance', 'license_allowance',
  'site_allowance', 'remote_area_allowance', 'hazard_allowance',
  'transportation_allowance', 'self_driving_allowance',
  'meal_allowance', 'childcare_allowance', 'research_allowance',
  'fitness_allowance', 'self_dev_allowance', 'book_allowance',
  'overseas_allowance', 'regular_bonus',
  'contract_etc_allowance', 'etc_allowance', 'car_maintenance',
  'severance_interim_pay', 'layoff_pay', 'maternity_pay',
];

const dedFields = [
  'national_pension', 'health_insurance', 'long_term_care', 'employment_insurance',
  'income_tax', 'local_income_tax',
  'year_end_tax_adjust', 'health_insurance_adjust', 'health_insurance_adjust_retro',
  'health_insurance_adjust_yearend', 'ltcare_adjust_yearend', 'advance_deduction'
];

let totalFixed = 0;
const nonDraft = payrolls.filter(p => !p.is_draft);

for (const pay of nonDraft) {
  const fixes = [];
  const emp = employees.find(e => e.id === pay.employee_id);
  const ct = contracts.find(c => c.employee_id === pay.employee_id);
  const dep = num(pay.dependents, emp ? num(emp.dependents, 1) : 1);
  const year = pay.pay_year;
  const rates = getRates(year);

  // ═══════════════════════════════════════
  // 보존: base_salary, weekly_holiday_pay, fixed_ot/night/hol, hourly_wage, 모든 수당
  // → 계약 동기화로 이미 맞춰짐, 변경 금지
  // ═══════════════════════════════════════

  // ── 1. standard_monthly_pay = base + weekly + sum(고정수당) + sum(fixedOT/night/hol) ──
  let sumAllow = 0;
  for (const fn of allowanceFields) {
    const amt = num(pay[fn]);
    if (amt <= 0) continue;
    const pt = pay[fn.replace('_allowance', '_pay_type')] || (ct ? ct[fn.replace('_allowance', '_pay_type')] : '') || '';
    if (!pt || fixedAllowPt.includes(pt)) sumAllow += amt;
  }
  const sumFixed = num(pay.fixed_ot_pay) + num(pay.fixed_night_pay) + num(pay.fixed_hol_pay);
  const calcStd = r(num(pay.base_salary) + num(pay.weekly_holiday_pay) + sumAllow + sumFixed);
  if (calcStd > 0 && Math.abs(num(pay.standard_monthly_pay) - calcStd) > 1) {
    fixes.push(`standard_monthly_pay: ${pay.standard_monthly_pay} → ${calcStd}`);
    pay.standard_monthly_pay = calcStd;
  }
  const stdPay = num(pay.standard_monthly_pay);

  // ── 2. gross_pay = sum of all earning items ──
  let sumEarn = 0;
  for (const f of earningFields) sumEarn += num(pay[f]);
  const calcGross = r(sumEarn);
  if (calcGross > 0 && Math.abs(num(pay.gross_pay) - calcGross) > 1) {
    fixes.push(`gross_pay: ${pay.gross_pay} → ${calcGross}`);
    pay.gross_pay = calcGross;
  }

  // ── 3. 4대보험 ──
  if (stdPay > 0) {
    const calcPension = r(Math.min(stdPay, rates.pensionCap) * rates.pension);
    if (Math.abs(num(pay.national_pension) - calcPension) > 1) {
      fixes.push(`national_pension: ${pay.national_pension} → ${calcPension}`);
      pay.national_pension = calcPension;
    }
    const calcHealth = r(stdPay * rates.health);
    if (Math.abs(num(pay.health_insurance) - calcHealth) > 1) {
      fixes.push(`health_insurance: ${pay.health_insurance} → ${calcHealth}`);
      pay.health_insurance = calcHealth;
    }
    const calcLtcare = r(calcHealth * rates.ltcare);
    if (Math.abs(num(pay.long_term_care) - calcLtcare) > 1) {
      fixes.push(`long_term_care: ${pay.long_term_care} → ${calcLtcare}`);
      pay.long_term_care = calcLtcare;
    }
    const calcEmploy = r(stdPay * rates.employ);
    if (Math.abs(num(pay.employment_insurance) - calcEmploy) > 1) {
      fixes.push(`employment_insurance: ${pay.employment_insurance} → ${calcEmploy}`);
      pay.employment_insurance = calcEmploy;
    }
  }

  // ── 4. 소득세 ──
  if (stdPay > 0) {
    const calcTax = calcIncomeTax(stdPay, dep, year);
    if (calcTax > 0 && Math.abs(num(pay.income_tax) - calcTax) > 1) {
      fixes.push(`income_tax: ${pay.income_tax} → ${calcTax}`);
      pay.income_tax = calcTax;
    }
    const calcLocal = Math.floor(calcTax * 0.1 / 10) * 10;
    if (calcLocal > 0 && Math.abs(num(pay.local_income_tax) - calcLocal) > 1) {
      fixes.push(`local_income_tax: ${pay.local_income_tax} → ${calcLocal}`);
      pay.local_income_tax = calcLocal;
    }
  }

  // ── 5. total_deduction / net_pay ──
  let sumDed = 0;
  for (const f of dedFields) sumDed += num(pay[f]);
  const calcTotalDed = r(sumDed);
  if (Math.abs(num(pay.total_deduction) - calcTotalDed) > 1) {
    fixes.push(`total_deduction: ${pay.total_deduction} → ${calcTotalDed}`);
    pay.total_deduction = calcTotalDed;
  }
  const calcNet = r(num(pay.gross_pay) - num(pay.total_deduction));
  if (Math.abs(num(pay.net_pay) - calcNet) > 1) {
    fixes.push(`net_pay: ${pay.net_pay} → ${calcNet}`);
    pay.net_pay = calcNet;
  }

  if (fixes.length > 0) {
    totalFixed++;
    if (DRY_RUN) {
      const empName = emp ? emp.name : pay.employee_id;
      console.log(`\n${pay.id} (${empName}, ${year}-${pay.month}):`);
      fixes.forEach(f => console.log(`  ${f}`));
    }
  }
}

console.log(`\n급여 ${nonDraft.length}건 중 ${totalFixed}건 보정 필요`);

if (!DRY_RUN && totalFixed > 0) {
  saveDB(db);
  console.log('db.json 저장 완료');
} else if (DRY_RUN) {
  console.log('DRY RUN - 저장 안 함');
}
