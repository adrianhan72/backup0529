/**
 * 급여 데이터를 근로계약 기준으로 보정
 * - 만근 시 base_salary, weekly_holiday_pay, 고정수당, 각종 수당을 계약값으로 동기화
 * - standard_monthly_pay, gross_pay, 공제항목 재계산
 */
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));
const payrolls = db.payrolls || [];
const contracts = db.contracts || [];
const employees = db.employees || [];
const insuranceRates = db.insurance_rates || [];
const taxBrackets = db.tax_bracket_rows || [];

const r = v => Math.round(v);
const num = (v, d = 0) => { const n = Number(v); return isNaN(n) ? d : n; };
const DRY_RUN = process.argv.includes('--dry-run');

// 보험료율
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

// 간이세액표
function getTaxForDep(row, dep) {
  if (row.length <= 4) return Math.max(0, row[2]);
  const idx = Math.min(dep, 7);
  const colIdx = 1 + idx;
  let tax = row[colIdx] || 0;
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
    if (stdPay >= row.from_amount && stdPay < row.to_amount) return getTaxForDep([row.from_amount, row.to_amount, row.dep1_tax, row.dep2_tax, row.dep3_tax, row.dep4_tax, row.dep5_tax, row.dep6_tax, row.dep7_tax, row.extra_per_dep], dep);
  }
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

let totalFixed = 0;

for (const pay of payrolls) {
  if (pay.is_draft) continue;
  const fixes = [];

  const ct = contracts.find(c => c.employee_id === pay.employee_id);
  if (!ct) continue;

  const emp = employees.find(e => e.id === pay.employee_id);
  const dep = num(pay.dependents, emp ? num(emp.dependents, 1) : 1);
  const year = pay.pay_year;
  const rates = getRates(year);

  const dpw = num(ct.work_days_per_week, 5);
  const monthDays = r(dpw * 365 / 12 / 7);
  const workDays = num(pay.work_days);

  // 만근 여부 확인
  const isFullMonth = workDays >= monthDays - 1; // 1일 오차 허용

  // ── 1. hourly_wage 동기화 ──
  const ctHw = num(ct.hourly_wage);
  if (ctHw > 0 && Math.abs(num(pay.hourly_wage) - ctHw) > 1) {
    fixes.push(`hourly_wage: ${pay.hourly_wage} → ${ctHw}`);
    pay.hourly_wage = ctHw;
  }

  // ── 2. base_salary (만근 시 계약값, 아니면 일할계산) ──
  const ctBase = num(ct.base_salary);
  if (ctBase > 0 && monthDays > 0) {
    if (isFullMonth) {
      if (Math.abs(num(pay.base_salary) - ctBase) > 100) {
        fixes.push(`base_salary: ${pay.base_salary} → ${ctBase} (만근, 계약기준)`);
        pay.base_salary = ctBase;
      }
    } else {
      const prorated = r(ctBase / monthDays * workDays);
      if (prorated > 0 && Math.abs(num(pay.base_salary) - prorated) > 100) {
        fixes.push(`base_salary: ${pay.base_salary} → ${prorated} (일할: ${ctBase}/${monthDays}×${workDays})`);
        pay.base_salary = prorated;
      }
    }
  }

  // ── 3. weekly_holiday_pay (만근 시 계약값) ──
  const ctWeekly = num(ct.weekly_holiday_pay);
  if (ctWeekly > 0 && isFullMonth) {
    if (Math.abs(num(pay.weekly_holiday_pay) - ctWeekly) > 100) {
      fixes.push(`weekly_holiday_pay: ${pay.weekly_holiday_pay} → ${ctWeekly}`);
      pay.weekly_holiday_pay = ctWeekly;
    }
  }

  // ── 4. 고정OT/야간/휴일 수당 동기화 ──
  const ctFixedOt = num(ct.fixed_ot_pay);
  const ctFixedNight = num(ct.fixed_night_pay);
  const ctFixedHol = num(ct.fixed_hol_pay);
  if (isFullMonth) {
    if (ctFixedOt > 0 && Math.abs(num(pay.fixed_ot_pay) - ctFixedOt) > 1) {
      fixes.push(`fixed_ot_pay: ${pay.fixed_ot_pay} → ${ctFixedOt}`);
      pay.fixed_ot_pay = ctFixedOt;
    }
    if (ctFixedNight > 0 && Math.abs(num(pay.fixed_night_pay) - ctFixedNight) > 1) {
      fixes.push(`fixed_night_pay: ${pay.fixed_night_pay} → ${ctFixedNight}`);
      pay.fixed_night_pay = ctFixedNight;
    }
    if (ctFixedHol > 0 && Math.abs(num(pay.fixed_hol_pay) - ctFixedHol) > 1) {
      fixes.push(`fixed_hol_pay: ${pay.fixed_hol_pay} → ${ctFixedHol}`);
      pay.fixed_hol_pay = ctFixedHol;
    }
  }

  // ── 5. 각종 수당 동기화 (매월 정기 지급인 것만) ──
  for (const fn of allowanceFields) {
    const ctAmt = num(ct[fn]);
    if (ctAmt <= 0) continue;
    const ptField = fn.replace('_allowance', '_pay_type');
    const pt = ct[ptField] || '';
    if (!pt || fixedAllowPt.includes(pt)) {
      const payAmt = num(pay[fn]);
      if (isFullMonth) {
        if (Math.abs(payAmt - ctAmt) > 1) {
          fixes.push(`${fn}: ${payAmt} → ${ctAmt}`);
          pay[fn] = ctAmt;
        }
      }
    }
  }

  // ── 6. standard_monthly_pay 재계산 ──
  const newBase = num(pay.base_salary);
  const newWeekly = num(pay.weekly_holiday_pay);
  let sumAllow = 0;
  for (const fn of allowanceFields) {
    const amt = num(pay[fn]);
    if (amt <= 0) continue;
    const ptField = fn.replace('_allowance', '_pay_type');
    const pt = pay[ptField] || ct[ptField] || '';
    if (!pt || fixedAllowPt.includes(pt)) sumAllow += amt;
  }
  const sumFixed = num(pay.fixed_ot_pay) + num(pay.fixed_night_pay) + num(pay.fixed_hol_pay);
  const calcStd = r(newBase + newWeekly + sumAllow + sumFixed);
  if (calcStd > 0 && Math.abs(num(pay.standard_monthly_pay) - calcStd) > 1) {
    fixes.push(`standard_monthly_pay: ${pay.standard_monthly_pay} → ${calcStd}`);
    pay.standard_monthly_pay = calcStd;
  }
  const stdPay = num(pay.standard_monthly_pay);

  // ── 7. gross_pay 재계산 ──
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
  let sumEarn = 0;
  for (const f of earningFields) sumEarn += num(pay[f]);
  const calcGross = r(sumEarn);
  if (calcGross > 0 && Math.abs(num(pay.gross_pay) - calcGross) > 1) {
    fixes.push(`gross_pay: ${pay.gross_pay} → ${calcGross}`);
    pay.gross_pay = calcGross;
  }

  // ── 8. 4대보험 재계산 ──
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

  // ── 9. 소득세 재계산 ──
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

  // ── 10. total_deduction / net_pay ──
  const dedFields = [
    'national_pension', 'health_insurance', 'long_term_care', 'employment_insurance',
    'income_tax', 'local_income_tax',
    'year_end_tax_adjust', 'health_insurance_adjust', 'health_insurance_adjust_retro',
    'health_insurance_adjust_yearend', 'ltcare_adjust_yearend', 'advance_deduction'
  ];
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
      console.log(`\n${pay.id} (${empName}, ${year}-${pay.month}, 만근=${isFullMonth}):`);
      fixes.forEach(f => console.log(`  ${f}`));
    }
  }
}

console.log(`\n급여 ${payrolls.filter(p=>!p.is_draft).length}건 중 ${totalFixed}건 보정`);

if (!DRY_RUN) {
  fs.writeFileSync('data/db.json', JSON.stringify(db, null, 2), 'utf8');
  console.log('db.json 저장 완료');
}
