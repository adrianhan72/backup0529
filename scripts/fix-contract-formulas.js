/**
 * 근로계약 산식 보정 스크립트
 * 모든 계약의 계산 필드를 산식에 맞게 재계산하여 보정
 * 사용법: node scripts/fix-contract-formulas.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const DRY_RUN = process.argv.includes('--dry-run');

// ── 상수 ──
const MONTHLY_STD_HOURS = 209; // MAGIC.MONTHLY_STD_HOURS
// ── 가산 수당 배율 (근로기준법 제56조) ──
// 연장: 기본100%+가산50% = 1.5배
// 야간: 가산50% = 0.5배 (기본급 별도)
// 휴일≤8h: 기본100%+가산50% = 1.5배
// 휴일>8h: 휴일+연장 중복 = 2.0배 (대법원 전원합의체 판결)
const OT_RATE_OVERTIME = 1.5;
const OT_RATE_NIGHT = 0.5;
const OT_RATE_HOLIDAY = 1.5;
const OT_RATE_HOLIDAY_OVERTIME = 2.0;  // 휴일 8h 초과분
const DEFAULT_ANNUAL_LEAVE = 15;
const WEEKS_PER_MONTH = 365 / 12 / 7; // ≈ 4.345

// ── 헬퍼 ──
function r(v) { return Math.round(v); }
function isNull(v) { return v === null || v === undefined; }
function num(v, def = 0) { const n = Number(v); return isNaN(n) ? def : n; }
function hasVal(v) { return !isNull(v) && v !== '' && v !== 0; }

// ── 월 소정근로시간 (174h 전일제) ──
function calcMonthlyStdH(hpd, dpw) {
  return r((hpd || 8) * (dpw || 5) * WEEKS_PER_MONTH);
}

// ── 월 주휴시간 (35h 전일제) ──
function calcMonthlyHolH(hpd) {
  return r((hpd || 8) * WEEKS_PER_MONTH);
}

// ── 연차일수 계산 ──
function calcAnnualLeaveDays(hireDateStr, basisType, contractStartStr) {
  if (!hireDateStr) return DEFAULT_ANNUAL_LEAVE;
  const hireDate = new Date(hireDateStr + 'T00:00:00');
  if (isNaN(hireDate.getTime())) return DEFAULT_ANNUAL_LEAVE;

  let baseDate;
  if (basisType === '회계년도 기준') {
    baseDate = new Date(new Date().getFullYear(), 0, 1);
  } else {
    baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
  }

  let fy = baseDate.getFullYear() - hireDate.getFullYear();
  let fm = (baseDate.getFullYear() - hireDate.getFullYear()) * 12
         + (baseDate.getMonth() - hireDate.getMonth());
  if (baseDate.getDate() < hireDate.getDate()) {
    fy--;
    fm--;
  }
  if (baseDate.getMonth() < hireDate.getMonth()
      || (baseDate.getMonth() === hireDate.getMonth() && baseDate.getDate() < hireDate.getDate())) {
    fy--;
  }

  if (fy < 0) fy = 0;
  if (fm < 0) fm = 0;

  if (fy === 0) {
    if (basisType === '입사일 기준') {
      return Math.min(fm, 11);
    } else {
      return Math.ceil(15 * fm / 12);
    }
  } else if (fy === 1) {
    return 15;
  } else {
    return Math.min(15 + Math.floor((fy - 1) / 2), 25);
  }
}

// ── 고정수당이 매월 지급(fixed)인지 확인 ──
function isFixedPayType(pt) {
  return pt === 'fixed' || pt === '매월' || pt === '매월(정기)';
}

// ── 통상임금 포함 여부 ──
function isOrdinaryWage(fieldName) {
  const ordinaryFields = [
    'site_allowance', 'position_allowance', 'skill_allowance',
    'license_allowance', 'hazard_allowance', 'remote_area_allowance',
    'regular_bonus'
  ];
  return ordinaryFields.includes(fieldName);
}

// ── 단일 계약 재계산 ──
function recalcContract(ct, companies, employees) {
  const fixes = [];
  const orig = { ...ct }; // shallow copy for comparison

  const hpd = num(ct.work_hours_per_day, 8);
  const dpw = num(ct.work_days_per_week, 5);
  const monthlyStdH = calcMonthlyStdH(hpd, dpw);
  const ctType = ct.contract_type || '';
  const isRegular = ctType === '정규직' || ctType === '정규직 수습';

  // ── 기초 변수 ──
  const monthlyAgreed = num(ct.monthly_salary_agreed);
  const baseSal = num(ct.base_salary);
  const dailyWage = num(ct.daily_wage);

  // ── 1. hourly_wage: base_salary 기준 (monthly는 weekly 포함하므로 순환참조 방지) ──
  let calcHourly = 0;
  if (baseSal > 0) {
    calcHourly = r(baseSal / monthlyStdH);
  } else if (monthlyAgreed > 0) {
    calcHourly = r(monthlyAgreed / monthlyStdH);
  } else if (dailyWage > 0 && hpd > 0) {
    calcHourly = r(dailyWage / hpd);
  }

  if (calcHourly > 0 && (isNull(ct.hourly_wage) || Math.abs(num(ct.hourly_wage) - calcHourly) > 1)) {
    fixes.push(`hourly_wage: ${ct.hourly_wage} → ${calcHourly} (base=${baseSal}, monthlyStdH=${monthlyStdH})`);
    ct.hourly_wage = calcHourly;
  }
  const hw = num(ct.hourly_wage, calcHourly);

  // ── 2. weekly_holiday_pay (프론트엔드 산식: hourly × 월주휴시간(35h 전일제)) ──
  if (hw > 0 && hpd > 0) {
    const calcHol = r(hw * calcMonthlyHolH(hpd));
    const curHol = num(ct.weekly_holiday_pay);
    if (isNull(ct.weekly_holiday_pay) || Math.abs(curHol - calcHol) > 1) {
      if (calcHol !== curHol) {
        fixes.push(`weekly_holiday_pay: ${ct.weekly_holiday_pay} → ${calcHol}`);
        ct.weekly_holiday_pay = calcHol;
      }
    }
  }

  // ── 3. fixed_ot_pay ──
  const otHours = num(ct.fixed_ot_hours);
  if (otHours > 0 && hw > 0) {
    const calcOt = r(hw * otHours * OT_RATE_OVERTIME);
    if (isNull(ct.fixed_ot_pay) || Math.abs(num(ct.fixed_ot_pay) - calcOt) > 1) {
      fixes.push(`fixed_ot_pay: ${ct.fixed_ot_pay} → ${calcOt}`);
      ct.fixed_ot_pay = calcOt;
    }
  } else if (otHours === 0 && num(ct.fixed_ot_pay) > 0) {
    fixes.push(`fixed_ot_pay: ${ct.fixed_ot_pay} → 0 (시간=0)`);
    ct.fixed_ot_pay = 0;
  }

  // ── 4. fixed_night_pay ──
  const nightHours = num(ct.fixed_night_hours);
  if (nightHours > 0 && hw > 0) {
    const calcNight = r(hw * nightHours * OT_RATE_NIGHT);
    if (isNull(ct.fixed_night_pay) || Math.abs(num(ct.fixed_night_pay) - calcNight) > 1) {
      fixes.push(`fixed_night_pay: ${ct.fixed_night_pay} → ${calcNight}`);
      ct.fixed_night_pay = calcNight;
    }
  } else if (nightHours === 0 && num(ct.fixed_night_pay) > 0) {
    fixes.push(`fixed_night_pay: ${ct.fixed_night_pay} → 0 (시간=0)`);
    ct.fixed_night_pay = 0;
  }

  // ── 5. fixed_hol_pay (8h 이내 150%, 초과 200%) ──
  const holHours = num(ct.fixed_hol_hours);
  if (holHours > 0 && hw > 0) {
    const holH8   = Math.min(holHours, 8);
    const holHOvr = Math.max(holHours - 8, 0);
    const calcHolPay = r(hw * holH8 * OT_RATE_HOLIDAY + hw * holHOvr * OT_RATE_HOLIDAY_OVERTIME);
    if (isNull(ct.fixed_hol_pay) || Math.abs(num(ct.fixed_hol_pay) - calcHolPay) > 1) {
      fixes.push(`fixed_hol_pay: ${ct.fixed_hol_pay} → ${calcHolPay}`);
      ct.fixed_hol_pay = calcHolPay;
    }
  } else if (holHours === 0 && num(ct.fixed_hol_pay) > 0) {
    fixes.push(`fixed_hol_pay: ${ct.fixed_hol_pay} → 0 (시간=0)`);
    ct.fixed_hol_pay = 0;
  }

  // ── 6. 수당 합계 (fixed pay type only) ──
  const allowanceFields = [
    'meal_allowance', 'transportation_allowance', 'research_allowance',
    'communication_allowance', 'fitness_allowance', 'self_dev_allowance',
    'book_allowance', 'overseas_allowance', 'site_allowance',
    'position_allowance', 'skill_allowance', 'license_allowance',
    'hazard_allowance', 'remote_area_allowance', 'regular_bonus',
    'car_maintenance', 'childcare_allowance', 'contract_etc_allowance',
    'etc_allowance', 'self_driving_allowance'
  ];
  
  let sumAllowances = 0;
  for (const fn of allowanceFields) {
    const amt = num(ct[fn]);
    if (amt <= 0) continue;
    // pay_type 확인 (매월 정기지급만 합산)
    const ptField = fn.replace('_allowance', '_pay_type');
    const pt = ct[ptField] || '';
    if (isFixedPayType(pt) || !pt) {
      sumAllowances += amt;
    }
  }

  const sumFixedOT = num(ct.fixed_ot_pay) + num(ct.fixed_night_pay) + num(ct.fixed_hol_pay);

  // ── 7. monthly_salary_agreed 재계산 (항상 component 기반, 연봉은 그 다음에 파생) ──
  if (baseSal > 0) {
    const calcMonthly = r(baseSal + num(ct.weekly_holiday_pay) + sumAllowances + sumFixedOT);
    if (calcMonthly > 0 && Math.abs(monthlyAgreed - calcMonthly) > 1) {
      fixes.push(`monthly_salary_agreed: ${ct.monthly_salary_agreed} → ${calcMonthly} (base+hol+allowances+fixedOT)`);
      ct.monthly_salary_agreed = calcMonthly;
    }
  }

  // ── 8. annual_salary for 정규직 (monthly에서 파생, 항상 재계산) ──
  if (isRegular && num(ct.monthly_salary_agreed) > 0) {
    const calcAnnual = r(num(ct.monthly_salary_agreed) * 12);
    if (Math.abs(num(ct.annual_salary) - calcAnnual) > 1) {
      fixes.push(`annual_salary: ${ct.annual_salary} → ${calcAnnual}`);
      ct.annual_salary = calcAnnual;
    }
  }

  // ── 9. daily_wage for 일용직 ──
  if (ctType === '일용직' && hw > 0 && hpd > 0) {
    const calcDaily = r(hw * hpd);
    if (isNull(ct.daily_wage) || Math.abs(num(ct.daily_wage) - calcDaily) > 1) {
      fixes.push(`daily_wage: ${ct.daily_wage} → ${calcDaily}`);
      ct.daily_wage = calcDaily;
    }
  }

  // ── 10. probation_amt ──
  const probPct = num(ct.probation_pct);
  if (probPct > 0) {
    const basis = ct.probation_basis || 'salary';
    let refAmt = 0;
    if (basis === 'salary') {
      refAmt = Math.max(num(ct.monthly_salary_agreed), num(ct.base_salary));
    } else if (basis === 'minwage') {
      // Find min wage for contract year
      const cy = ct.contract_start ? new Date(ct.contract_start).getFullYear() : new Date().getFullYear();
      const minWages = db.minimum_wages || [];
      const mw = minWages.find(m => m.year === cy) || minWages.find(m => m.year === cy - 1);
      if (mw && mw.monthly_wage) refAmt = mw.monthly_wage;
    }
    if (refAmt > 0) {
      const calcProb = r(refAmt * probPct / 100);
      if (isNull(ct.probation_amt) || Math.abs(num(ct.probation_amt) - calcProb) > 1) {
        fixes.push(`probation_amt: ${ct.probation_amt} → ${calcProb} (${basis} ${refAmt} × ${probPct}%)`);
        ct.probation_amt = calcProb;
      }
    }
  } else if (probPct === 0 && num(ct.probation_amt) > 0 && (isNull(ct.probation_months) || num(ct.probation_months) === 0)) {
    fixes.push(`probation_amt: ${ct.probation_amt} → 0 (pct=0, no probation)`);
    ct.probation_amt = 0;
  }

  // ── 11. annual_leave_days ──
  // 연차는 회사 설정의 basis를 참조하지만, 여기서는 근사값으로 계산
  // 실제로는 입사일 기준 15일이 표준
  const emp = employees.find(e => e.id === ct.employee_id);
  if (emp && emp.hire_date) {
    const company = companies.find(c => c.id === ct.company_id);
    const basis = (company && company.annual_leave_basis) ? company.annual_leave_basis : '입사일 기준';
    const calcAnnualLeave = calcAnnualLeaveDays(emp.hire_date, basis, ct.contract_start);
    if (calcAnnualLeave > 0 && (isNull(ct.annual_leave_days) || Math.abs(num(ct.annual_leave_days) - calcAnnualLeave) > 1)) {
      fixes.push(`annual_leave_days: ${ct.annual_leave_days} → ${calcAnnualLeave}`);
      ct.annual_leave_days = calcAnnualLeave;
    }
  }

  // ── 12. work_days_per_month ──
  if (dpw > 0 && (isNull(ct.work_days_per_month) || num(ct.work_days_per_month) === 0)) {
    const calcDpm = r(dpw * WEEKS_PER_MONTH);
    if (Math.abs(num(ct.work_days_per_month) - calcDpm) > 0) {
      fixes.push(`work_days_per_month: ${ct.work_days_per_month} → ${calcDpm}`);
      ct.work_days_per_month = calcDpm;
    }
  }

  // ── 13. 4대보험 가입여부 null → 'Y' 기본값 ──
  const insFields = { insurance_pension: '국민연금', insurance_health: '건강보험', insurance_employment: '고용보험', insurance_industrial: '산재보험' };
  for (const [f, name] of Object.entries(insFields)) {
    if (ct[f] === null || ct[f] === undefined || ct[f] === '') {
      fixes.push(`${name} 가입여부(${f}): null → Y`);
      ct[f] = 'Y';
    }
  }

  return { fixes, ct };
}

// ── 메인 ──
console.log('근로계약 산식 보정 시작...');
if (DRY_RUN) console.log('[DRY RUN 모드 — 실제 저장 안 함]\n');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const contracts = db.contracts || [];
const companies = db.companies || [];
const employees = db.employees || [];

let totalFixed = 0;
let totalContracts = 0;
const report = [];

for (const ct of contracts) {
  if (!ct.id) continue;
  // 임시저장은 제외
  if (ct.is_draft === 1 && ct.status === 'draft') continue;

  totalContracts++;
  const { fixes, ct: updated } = recalcContract(ct, companies, employees);

  if (fixes.length > 0) {
    totalFixed++;
    report.push({
      id: ct.id,
      employee_id: ct.employee_id,
      contract_type: ct.contract_type,
      status: ct.status,
      fixes
    });
    // 변경사항 적용
    Object.assign(ct, updated);
  }
}

// 결과 출력
console.log(`전체 계약: ${contracts.length}건 (임시저장 제외: ${totalContracts}건)`);
console.log(`보정 대상: ${totalFixed}건\n`);

if (totalFixed > 0) {
  for (const r of report) {
    const emp = employees.find(e => e.id === r.employee_id);
    const empName = emp ? emp.name : r.employee_id;
    console.log(`━━━ ${r.id} (${empName}, ${r.contract_type || '?'}, ${r.status}) ━━━`);
    for (const f of r.fixes) {
      console.log(`  ✏ ${f}`);
    }
    console.log();
  }
} else {
  console.log('✅ 모든 계약이 산식과 일치합니다.');
}

if (!DRY_RUN && totalFixed > 0) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`\n💾 db.json 저장 완료 (${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(2)} MB)`);
} else if (DRY_RUN) {
  console.log('\n⚠ DRY RUN — 저장하지 않았습니다. 실행하려면 --dry-run 옵션을 제거하세요.');
}
