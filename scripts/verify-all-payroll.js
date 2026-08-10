/**
 * 급여 데이터 전체 필드 산식 검증
 * gross_pay, 모든 수당, 공제 항목을 계약 데이터와 비교
 */
const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const payrolls = (db.payrolls || []).filter(p => !p.is_draft);
const contracts = db.contracts || [];
const companies = db.companies || [];
const employees = db.employees || [];
const insuranceRates = db.insurance_rates || [];
const taxBrackets = db.tax_bracket_rows || [];

const r = v => Math.round(v);
const num = (v, d = 0) => { const n = Number(v); return isNaN(n) ? d : n; };

// 보험료율 조회
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

// 간이세액표 조회
function getTaxBracket(stdPay, dep, year) {
  let rows = taxBrackets.filter(r => r.year === year);
  if (rows.length === 0) {
    const maxYr = Math.max(...taxBrackets.map(r => r.year));
    rows = taxBrackets.filter(r => r.year === maxYr);
  }
  rows.sort((a, b) => a.from_amount - b.from_amount);
  for (const row of rows) {
    if (stdPay >= row.from_amount && stdPay < row.to_amount) {
      if (row.dep1_tax !== undefined && row.dep2_tax !== undefined) {
        const idx = Math.min(dep, 7);
        const col = ['dep1_tax','dep2_tax','dep3_tax','dep4_tax','dep5_tax','dep6_tax','dep7_tax'][idx-1];
        let tax = row[col] || 0;
        if (dep > 7) tax = Math.max(0, (row.dep7_tax || 0) - (dep - 7) * (row.extra_per_dep || 0));
        return Math.max(0, tax);
      }
      return row.dep1_tax || 0;
    }
  }
  return 0;
}

const issues = [];

for (const pay of payrolls) {
  const pid = pay.id;
  const emp = employees.find(e => e.id === pay.employee_id);
  const ct = contracts.find(c => c.employee_id === pay.employee_id && c.status === 'active')
         || contracts.find(c => c.employee_id === pay.employee_id);
  const co = companies.find(c => c.id === pay.company_id);
  if (!ct) continue;

  const year = pay.pay_year;
  const month = pay.pay_month;
  const workDays = num(pay.work_days);
  const stdPay = num(pay.standard_monthly_pay);
  const rates = getRates(year);
  const dep = num(pay.dependents, emp ? num(emp.dependents, 1) : 1);

  // ── 1. hourly_wage 검증 ──
  const ctHw = num(ct.hourly_wage);
  const payHw = num(pay.hourly_wage);
  if (payHw > 0 && ctHw > 0 && Math.abs(payHw - ctHw) > 1) {
    issues.push(`${pid}: hourly_wage 불일치 (pay=${payHw}, contract=${ctHw})`);
  }

  // ── 2. base_salary 검증 (일할계산) ──
  const dpw = num(ct.work_days_per_week, 5);
  const monthDays = r(dpw * 365 / 12 / 7);
  const expectedBase = r(num(ct.base_salary) / monthDays * workDays);
  if (expectedBase > 0 && workDays > 0 && monthDays > 0) {
    const diff = Math.abs(num(pay.base_salary) - expectedBase);
    if (diff > Math.max(1, expectedBase * 0.02)) {
      issues.push(`${pid}: base_salary 불일치 (pay=${pay.base_salary}, expected=${expectedBase}, workDays=${workDays}/${monthDays})`);
    }
  }

  // ── 3. weekly_holiday_pay 검증 ──
  if (payHw > 0 || ctHw > 0) {
    const hw = payHw || ctHw;
    const hpd = num(ct.work_hours_per_day, 8);
    const fullWeeks = Math.floor(workDays / dpw);
    if (fullWeeks > 0) {
      const expectedWeekly = r(hw * hpd * fullWeeks);
      if (expectedWeekly > 0 && Math.abs(num(pay.weekly_holiday_pay) - expectedWeekly) > 100) {
        issues.push(`${pid}: weekly_holiday_pay 불일치 (pay=${pay.weekly_holiday_pay}, expected=${expectedWeekly}, hw=${hw}, hpd=${hpd}, fullWeeks=${fullWeeks})`);
      }
    }
  }

  // ── 4. 고정OT/야간/휴일 수당 검증 ──
  const hw = payHw || ctHw;
  if (hw > 0) {
    const otH = num(pay.overtime_hours);
    const ntH = num(pay.night_hours);
    const hlH = num(pay.holiday_hours);
    if (otH > 0) {
      const expOt = r(hw * otH * 1.5);
      if (Math.abs(num(pay.overtime_pay) - expOt) > 1) {
        issues.push(`${pid}: overtime_pay 불일치 (pay=${pay.overtime_pay}, expected=${expOt})`);
      }
    }
    if (ntH > 0) {
      const expNt = r(hw * ntH * 0.5);
      if (Math.abs(num(pay.night_pay) - expNt) > 1) {
        issues.push(`${pid}: night_pay 불일치 (pay=${pay.night_pay}, expected=${expNt})`);
      }
    }
    if (hlH > 0) {
      const expHl = r(hw * Math.min(hlH, 8) * 1.5 + hw * Math.max(hlH - 8, 0) * 2.0);
      if (Math.abs(num(pay.holiday_pay) - expHl) > 1) {
        issues.push(`${pid}: holiday_pay 불일치 (pay=${pay.holiday_pay}, expected=${expHl})`);
      }
    }
  }

  // ── 5. 고정수당 (contract fixed_ot/night/hol) 검증 ──
  const ctFixedOt = num(ct.fixed_ot_pay);
  const ctFixedNight = num(ct.fixed_night_pay);
  const ctFixedHol = num(ct.fixed_hol_pay);
  // 월할 계산
  if (workDays > 0 && monthDays > 0 && workDays === monthDays) {
    // 만근: contract 값 그대로
    if (ctFixedOt > 0 && num(pay.fixed_ot_pay) === 0) {
      issues.push(`${pid}: fixed_ot_pay 누락 (contract=${ctFixedOt}, pay=0)`);
    }
    if (ctFixedNight > 0 && num(pay.fixed_night_pay) === 0) {
      issues.push(`${pid}: fixed_night_pay 누락 (contract=${ctFixedNight}, pay=0)`);
    }
    if (ctFixedHol > 0 && num(pay.fixed_hol_pay) === 0) {
      issues.push(`${pid}: fixed_hol_pay 누락 (contract=${ctFixedHol}, pay=0)`);
    }
  }

  // ── 6. 수당 항목 검증 (contract에 있고 매월지급이면 payroll에도 있어야 함) ──
  const allowanceMap = [
    ['meal_allowance', 'meal_pay_type'],
    ['transportation_allowance', 'transport_pay_type'],
    ['position_allowance', null],
    ['skill_allowance', null],
    ['license_allowance', null],
    ['site_allowance', null],
    ['remote_area_allowance', 'remote_area_pay_type'],
    ['hazard_allowance', null],
    ['childcare_allowance', 'childcare_pay_type'],
    ['self_driving_allowance', 'self_driving_pay_type'],
    ['research_allowance', 'research_pay_type'],
    ['communication_allowance', 'communication_pay_type'],
    ['fitness_allowance', 'fitness_pay_type'],
    ['self_dev_allowance', 'self_dev_pay_type'],
    ['book_allowance', 'book_pay_type'],
    ['overseas_allowance', 'overseas_pay_type'],
    ['regular_bonus', null],
    ['etc_allowance', null],
    ['car_maintenance', null],
    ['contract_etc_allowance', null],
  ];

  for (const [allowField, payTypeField] of allowanceMap) {
    const ctAmt = num(ct[allowField]);
    if (ctAmt <= 0) continue;
    const pt = payTypeField ? (ct[payTypeField] || '') : '';
    if (pt === '매월' || pt === 'fixed' || !payTypeField) {
      if (workDays > 0 && monthDays > 0 && workDays === monthDays) {
        const payAmt = num(pay[allowField]);
        if (payAmt === 0 && ctAmt > 0) {
          issues.push(`${pid}: ${allowField} 누락 (contract=${ctAmt}, pay=0)`);
        } else if (payAmt > 0 && Math.abs(payAmt - ctAmt) > 1) {
          issues.push(`${pid}: ${allowField} 불일치 (pay=${payAmt}, contract=${ctAmt})`);
        }
      }
    }
  }

  // ── 7. gross_pay = sum of all earning items ──
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
  let sumEarnings = 0;
  for (const f of earningFields) sumEarnings += num(pay[f]);
  const grossDiff = Math.abs(num(pay.gross_pay) - sumEarnings);
  if (grossDiff > 100) {
    issues.push(`${pid}: gross_pay 불일치 (pay=${pay.gross_pay}, sum=${sumEarnings}, diff=${grossDiff})`);
  }

  // ── 8. 4대보험 검증 ──
  const calcPension = r(Math.min(stdPay, rates.pensionCap) * rates.pension);
  if (Math.abs(num(pay.national_pension) - calcPension) > 1) {
    issues.push(`${pid}: national_pension 불일치 (pay=${pay.national_pension}, calc=${calcPension})`);
  }
  const calcHealth = r(stdPay * rates.health);
  if (Math.abs(num(pay.health_insurance) - calcHealth) > 1) {
    issues.push(`${pid}: health_insurance 불일치 (pay=${pay.health_insurance}, calc=${calcHealth})`);
  }
  const calcLtcare = r(calcHealth * rates.ltcare);
  if (Math.abs(num(pay.long_term_care) - calcLtcare) > 1) {
    issues.push(`${pid}: long_term_care 불일치 (pay=${pay.long_term_care}, calc=${calcLtcare})`);
  }
  const calcEmploy = r(stdPay * rates.employ);
  if (Math.abs(num(pay.employment_insurance) - calcEmploy) > 1) {
    issues.push(`${pid}: employment_insurance 불일치 (pay=${pay.employment_insurance}, calc=${calcEmploy})`);
  }

  // ── 9. 소득세 검증 ──
  if (stdPay > 0) {
    const calcTax = getTaxBracket(stdPay, dep, year);
    if (calcTax > 0 && Math.abs(num(pay.income_tax) - calcTax) > 1) {
      issues.push(`${pid}: income_tax 불일치 (pay=${pay.income_tax}, calc=${calcTax}, stdPay=${stdPay}, dep=${dep})`);
    }
    const calcLocal = Math.floor(calcTax * 0.1 / 10) * 10;
    if (calcLocal > 0 && Math.abs(num(pay.local_income_tax) - calcLocal) > 1) {
      issues.push(`${pid}: local_income_tax 불일치 (pay=${pay.local_income_tax}, calc=${calcLocal})`);
    }
  }

  // ── 10. total_deduction & net_pay ──
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
    issues.push(`${pid}: total_deduction 불일치 (pay=${pay.total_deduction}, sum=${sumDed})`);
  }
  const calcNet = r(num(pay.gross_pay) - num(pay.total_deduction));
  if (Math.abs(num(pay.net_pay) - calcNet) > 1) {
    issues.push(`${pid}: net_pay 불일치 (pay=${pay.net_pay}, calc=${calcNet})`);
  }
}

// 결과 출력
console.log(`검증 완료: ${payrolls.length}건 중 ${issues.length}건 문제 발견\n`);
if (issues.length === 0) {
  console.log('✅ 모든 급여 데이터가 산식과 완전히 일치합니다.');
} else {
  console.log(`❌ ${issues.length}건 불일치:\n`);
  // 유형별 분류
  const cats = {};
  issues.forEach(i => {
    const type = i.split(':')[1]?.trim() || '기타';
    if (!cats[type]) cats[type] = [];
    cats[type].push(i);
  });
  for (const [type, items] of Object.entries(cats)) {
    console.log(`\n[${type}] ${items.length}건:`);
    items.slice(0, 10).forEach(i => console.log(`  ${i}`));
    if (items.length > 10) console.log(`  ... 외 ${items.length - 10}건`);
  }
}
