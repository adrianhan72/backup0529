/**
 * 급여(payrolls) 산식 보정 스크립트
 * 4대보험, 소득세/지방소득세, 총공제액, 실지급액을 산식에 맞게 재계산
 * 사용법: node scripts/fix-payroll-formulas.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const DRY_RUN = process.argv.includes('--dry-run');

// ── 헬퍼 ──
const r = v => Math.round(v);
const f = (v, d) => Math.floor(v / d) * d; // d원 단위 절사
const num = (v, def = 0) => { const n = Number(v); return isNaN(n) ? def : n; };
const isNull = v => v === null || v === undefined;

// ── 보험료율 조회 ──
function getInsuranceRates(db, year) {
  const rates = db.insurance_rates || [];
  const yRates = rates.filter(r => r.year === year);
  if (yRates.length === 0) {
    // fallback to latest year
    const maxYear = Math.max(...rates.map(r => r.year || 0));
    return { pension: 0.045, health: 0.03545, ltcare: 0.1295, employ: 0.009,
             pensionCap: 6370000, year: year };
  }
  const p = yRates.find(r => r.insurance_type === 'national_pension') || {};
  const h = yRates.find(r => r.insurance_type === 'health') || {};
  const l = yRates.find(r => r.insurance_type === 'long_term_care') || {};
  const e = yRates.find(r => r.insurance_type === 'employment') || {};
  return {
    pension: num(p.rate, 4.5) / 100,
    health: num(h.rate, 3.545) / 100,
    ltcare: num(l.rate, 12.95) / 100,
    employ: num(e.rate, 0.9) / 100,
    pensionCap: num(p.cap_amount, 6370000),
    year
  };
}

// ── 소득세 간이세액표 (DB tax_bracket_rows → _TAX_BRACKET_DATA 형식) ──
function loadTaxBracketData(db) {
  const rows = db.tax_bracket_rows || [];
  if (rows.length === 0) return null;
  const byYear = {};
  rows.forEach(row => {
    const yr = row.year;
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push([
      row.from_amount, row.to_amount,
      row.dep1_tax || 0, row.dep2_tax || 0, row.dep3_tax || 0, row.dep4_tax || 0,
      row.dep5_tax || 0, row.dep6_tax || 0, row.dep7_tax || 0, row.extra_per_dep || 0
    ]);
  });
  Object.keys(byYear).forEach(yr => {
    byYear[yr].sort((a, b) => a[0] - b[0]);
  });
  return byYear;
}

// 부양가족 수별 세액 조회 (admin-standards.js _getTaxForDep 포팅)
function getTaxForDep(row, dep) {
  if (row.length <= 4) {
    // 구형(2024 이하): [이상,미만,1인세액,지방소득세]
    return Math.max(0, row[2]);
  }
  // 신형(2025 이상): [이상,미만,1인,...,7인,초과공제]
  const idx = Math.min(dep, 7);
  const colIdx = 1 + idx;
  let tax = row[colIdx] || 0;
  if (dep > 7) {
    const extraPerDep = row[9] || 0;
    tax = Math.max(0, (row[8] || 0) - (dep - 7) * extraPerDep);
  }
  return Math.max(0, tax);
}

function calcIncomeTax(stdPay, dependents, taxData, year) {
  const d = Math.max(1, dependents || 1);
  // 1순위: 해당 연도 데이터
  let brackets = taxData[year];
  // 2순위: 최신 연도로 fallback (admin-standards.js와 동일)
  if (!brackets) {
    const availYears = Object.keys(taxData).map(Number).sort((a, b) => b - a);
    if (availYears.length > 0) {
      brackets = taxData[availYears[0]];
    }
  }
  if (!brackets) return null;
  
  for (const row of brackets) {
    if (stdPay >= row[0] && stdPay < row[1]) {
      return getTaxForDep(row, d);
    }
  }
  const lastRow = brackets[brackets.length - 1];
  if (stdPay >= lastRow[0]) {
    return getTaxForDep(lastRow, d);
  }
  return 0;
}

function calcLocalTax(incomeTax) {
  return Math.floor(incomeTax * 0.1 / 10) * 10;
}

// ── 등기임원/대표자 여부 확인 ──
function isExemptFromInsurance(emp, company) {
  if (!emp) return false;
  // 대표자, 등기임원, 특수관계인은 4대보험 면제
  if (emp.is_representative === 1) return true;
  // employment_category 체크
  const cat = (emp.employment_category || '').toLowerCase();
  if (cat.includes('executive') || cat.includes('representative') || cat.includes('related')) return true;
  return false;
}

// ── 단일 급여 재계산 ──
function recalcPayroll(pay, db, taxBracketData) {
  const fixes = [];
  
  const company = (db.companies || []).find(c => c.id === pay.company_id);
  const emp = (db.employees || []).find(e => e.id === pay.employee_id);
  const contract = (db.contracts || []).find(c => c.id === pay.contract_id || c.employee_id === pay.employee_id);
  
  const dependents = num(pay.dependents, emp ? num(emp.dependents, 1) : 1);
  let stdPay = num(pay.standard_monthly_pay);
  const year = num(pay.pay_year, new Date().getFullYear());
  
  // standard_monthly_pay 누락 시 base_salary + weekly_holiday_pay로 추정
  if (stdPay <= 0) {
    const estStd = num(pay.base_salary) + num(pay.weekly_holiday_pay);
    if (estStd > 0) {
      fixes.push(`standard_monthly_pay: ${pay.standard_monthly_pay} → ${estStd} (base+weekly 추정)`);
      pay.standard_monthly_pay = estStd;
      stdPay = estStd;
    }
  }
  
  if (stdPay <= 0) {
    // 그래도 없으면 건너뜀
    return { fixes: [], pay };
  }
  
  const rates = getInsuranceRates(db, year);
  
  // ── 1. 4대보험 재계산 ──
  const exempt = isExemptFromInsurance(emp, company);
  
  if (exempt) {
    // 4대보험 면제 대상자 → 모두 0
    if (num(pay.national_pension) !== 0) {
      fixes.push(`national_pension: ${pay.national_pension} → 0 (면제)`);
      pay.national_pension = 0;
    }
    if (num(pay.health_insurance) !== 0) {
      fixes.push(`health_insurance: ${pay.health_insurance} → 0 (면제)`);
      pay.health_insurance = 0;
    }
    if (num(pay.long_term_care) !== 0) {
      fixes.push(`long_term_care: ${pay.long_term_care} → 0 (면제)`);
      pay.long_term_care = 0;
    }
    if (num(pay.employment_insurance) !== 0) {
      fixes.push(`employment_insurance: ${pay.employment_insurance} → 0 (면제)`);
      pay.employment_insurance = 0;
    }
  } else {
    // 국민연금 (상한 적용)
    const pensionBase = Math.min(stdPay, rates.pensionCap);
    const calcPension = r(pensionBase * rates.pension);
    if (Math.abs(num(pay.national_pension) - calcPension) > 1) {
      fixes.push(`national_pension: ${pay.national_pension} → ${calcPension} (${pensionBase} × ${rates.pension})`);
      pay.national_pension = calcPension;
    }
    
    // 건강보험
    const calcHealth = r(stdPay * rates.health);
    if (Math.abs(num(pay.health_insurance) - calcHealth) > 1) {
      fixes.push(`health_insurance: ${pay.health_insurance} → ${calcHealth} (${stdPay} × ${rates.health})`);
      pay.health_insurance = calcHealth;
    }
    
    // 장기요양보험
    const calcLtcare = r(calcHealth * rates.ltcare);
    if (Math.abs(num(pay.long_term_care) - calcLtcare) > 1) {
      fixes.push(`long_term_care: ${pay.long_term_care} → ${calcLtcare} (${calcHealth} × ${rates.ltcare})`);
      pay.long_term_care = calcLtcare;
    }
    
    // 고용보험
    const calcEmploy = r(stdPay * rates.employ);
    if (Math.abs(num(pay.employment_insurance) - calcEmploy) > 1) {
      fixes.push(`employment_insurance: ${pay.employment_insurance} → ${calcEmploy} (${stdPay} × ${rates.employ})`);
      pay.employment_insurance = calcEmploy;
    }
  }
  
  // ── 2. 소득세/지방소득세 재계산 (DB 간이세액표 기준) ──
  if (taxBracketData) {
    const calcTax = calcIncomeTax(stdPay, dependents, taxBracketData, year);
    if (calcTax !== null) {
      const curTax = num(pay.income_tax);
      if (Math.abs(curTax - calcTax) > 1) {
        fixes.push(`income_tax: ${pay.income_tax} → ${calcTax} (dep=${dependents})`);
        pay.income_tax = calcTax;
      }
      const calcLocal = calcLocalTax(calcTax);
      const curLocal = num(pay.local_income_tax);
      if (Math.abs(curLocal - calcLocal) > 1) {
        fixes.push(`local_income_tax: ${pay.local_income_tax} → ${calcLocal}`);
        pay.local_income_tax = calcLocal;
      }
    }
  }
  
  // ── 3. total_deduction 재계산 ──
  const calcTotalDed = r(
    num(pay.national_pension) +
    num(pay.health_insurance) +
    num(pay.long_term_care) +
    num(pay.employment_insurance) +
    num(pay.income_tax) +
    num(pay.local_income_tax) +
    num(pay.year_end_tax_adjust) +
    num(pay.health_insurance_adjust) +
    num(pay.health_insurance_adjust_retro) +
    num(pay.health_insurance_adjust_yearend) +
    num(pay.ltcare_adjust_yearend) +
    num(pay.advance_deduction)
  );
  if (Math.abs(num(pay.total_deduction) - calcTotalDed) > 1) {
    fixes.push(`total_deduction: ${pay.total_deduction} → ${calcTotalDed}`);
    pay.total_deduction = calcTotalDed;
  }
  
  // ── 4. net_pay 재계산 ──
  const gross = num(pay.gross_pay);
  const calcNet = r(gross - num(pay.total_deduction));
  if (Math.abs(num(pay.net_pay) - calcNet) > 1) {
    fixes.push(`net_pay: ${pay.net_pay} → ${calcNet} (${gross} - ${num(pay.total_deduction)})`);
    pay.net_pay = calcNet;
  }
  
  // ── 5. weekly_holiday_pay: 출근 데이터 필요 → 건너뜀 (실제 calcWeeklyHolidayPay 로직 복잡)
  
  return { fixes, pay };
}

// ── 메인 ──
console.log('급여 산식 보정 시작...');
if (DRY_RUN) console.log('[DRY RUN 모드 — 실제 저장 안 함]\n');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const payrolls = db.payrolls || [];
const taxBracketData = loadTaxBracketData(db);

if (!taxBracketData) {
  console.log('⚠ tax_bracket_rows가 비어 있습니다. 소득세는 재계산하지 않습니다.');
} else {
  const years = Object.keys(taxBracketData).sort();
  console.log(`✓ 간이세액표 로드: ${years.join(', ')}년 (${Object.values(taxBracketData).reduce((s,r)=>s+r.length,0)}행)`);
}

let totalFixed = 0;
let totalChecked = 0;
const report = [];

for (const pay of payrolls) {
  if (!pay.id) continue;
  if (pay.is_draft === 1 || pay.is_draft === true) continue;
  
  totalChecked++;
  const { fixes, pay: updated } = recalcPayroll(pay, db, taxBracketData);
  
  if (fixes.length > 0) {
    totalFixed++;
    const emp = (db.employees || []).find(e => e.id === pay.employee_id);
    const empName = emp ? emp.name : pay.employee_id;
    report.push({
      id: pay.id,
      employee: empName,
      year: pay.pay_year,
      month: pay.pay_month,
      gross: pay.gross_pay,
      fixes
    });
    Object.assign(pay, updated);
  }
}

// 결과 출력
console.log(`전체 급여: ${payrolls.length}건 (임시저장 제외: ${totalChecked}건)`);
console.log(`보정 대상: ${totalFixed}건\n`);

if (totalFixed > 0) {
  // 상위 30건만 표시
  const show = report.slice(0, 30);
  for (const rp of show) {
    console.log(`━━━ ${rp.id} (${rp.employee}, ${rp.year}-${rp.month}, gross=${rp.gross?.toLocaleString()}) ━━━`);
    for (const f of rp.fixes) {
      console.log(`  ✏ ${f}`);
    }
    console.log();
  }
  if (report.length > 30) {
    console.log(`... 외 ${report.length - 30}건 생략`);
  }
} else {
  console.log('✅ 모든 급여가 산식과 일치합니다.');
}

if (!DRY_RUN && totalFixed > 0) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`\n💾 db.json 저장 완료 (${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(2)} MB)`);
} else if (DRY_RUN) {
  console.log('\n⚠ DRY RUN — 저장하지 않았습니다.');
}
