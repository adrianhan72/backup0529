/**
 * 근로계약 필수 필드 null 보정
 * - 일용직: daily_wage 기준으로 base_salary, hourly_wage, monthly_salary_agreed 계산
 * - 누락된 근로시간: 기본값(8h/5d) 설정
 * - 보험 가입여부: null → 'Y'
 */
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));
const contracts = db.contracts || [];
const DRY_RUN = process.argv.includes('--dry-run');

const r = v => Math.round(v);
const num = (v, d = 0) => { const n = Number(v); return isNaN(n) ? d : n; };
const WEEKS_PER_MONTH = 365 / 12 / 7;

let totalFixed = 0;

for (const ct of contracts) {
  const fixes = [];
  const cid = ct.id;
  
  // test null 데이터는 건너뜀 (의도적 null)
  if (cid.startsWith('ct_null_') || cid.startsWith('cont_draft_')) continue;
  // 임시저장 제외
  if (ct.is_draft === 1) continue;

  // ── 1. work_hours_per_day 누락 → 8 ──
  if (!ct.work_hours_per_day || num(ct.work_hours_per_day) === 0) {
    fixes.push(`work_hours_per_day: ${ct.work_hours_per_day} → 8`);
    ct.work_hours_per_day = 8;
  }

  // ── 2. work_days_per_week 누락 → 5 ──
  if (!ct.work_days_per_week || num(ct.work_days_per_week) === 0) {
    fixes.push(`work_days_per_week: ${ct.work_days_per_week} → 5`);
    ct.work_days_per_week = 5;
  }

  const hpd = num(ct.work_hours_per_day, 8);
  const dpw = num(ct.work_days_per_week, 5);
  const dpm = r(dpw * WEEKS_PER_MONTH);
  const monthlyStdH = r(hpd * dpw * WEEKS_PER_MONTH);

  // ── 3. work_days_per_month 누락 ──
  if (!ct.work_days_per_month || num(ct.work_days_per_month) === 0) {
    fixes.push(`work_days_per_month: ${ct.work_days_per_month} → ${dpm}`);
    ct.work_days_per_month = dpm;
  }

  // ── 4. break_time 누락 → 1 ──
  if (ct.break_time === null || ct.break_time === undefined) {
    fixes.push(`break_time: null → 1`);
    ct.break_time = 1;
  }

  const isDaily = ct.contract_type === '일용직';
  const dailyWage = num(ct.daily_wage);

  // ── 5. 일용직: daily_wage 있으면 base_salary/monthly/hourly 계산 ──
  if (isDaily && dailyWage > 0) {
    // hourly_wage
    if (!ct.hourly_wage || num(ct.hourly_wage) === 0) {
      const calcHw = r(dailyWage / hpd);
      fixes.push(`hourly_wage: ${ct.hourly_wage} → ${calcHw} (daily=${dailyWage}/${hpd})`);
      ct.hourly_wage = calcHw;
    }
    const hw = num(ct.hourly_wage);

    // base_salary = daily_wage * dpm
    if (!ct.base_salary || num(ct.base_salary) === 0) {
      const calcBase = r(dailyWage * dpm);
      fixes.push(`base_salary: ${ct.base_salary} → ${calcBase} (${dailyWage}×${dpm})`);
      ct.base_salary = calcBase;
    }

    // monthly_salary_agreed = daily_wage * dpm
    if (!ct.monthly_salary_agreed || num(ct.monthly_salary_agreed) === 0) {
      const calcMonthly = r(dailyWage * dpm);
      fixes.push(`monthly_salary_agreed: ${ct.monthly_salary_agreed} → ${calcMonthly} (${dailyWage}×${dpm})`);
      ct.monthly_salary_agreed = calcMonthly;
    }

    // weekly_holiday_pay (일용직은 주휴수당 없음)
    if (ct.weekly_holiday_pay === null || ct.weekly_holiday_pay === undefined) {
      ct.weekly_holiday_pay = 0;
    }
  }

  // ── 6. 비일용직: base_salary 있고 hourly 누락 시 계산 ──
  if (!isDaily && num(ct.base_salary) > 0) {
    if (!ct.hourly_wage || num(ct.hourly_wage) === 0) {
      const calcHw = r(num(ct.base_salary) / monthlyStdH);
      if (calcHw > 0) {
        fixes.push(`hourly_wage: ${ct.hourly_wage} → ${calcHw} (base=${num(ct.base_salary)}/${monthlyStdH})`);
        ct.hourly_wage = calcHw;
      }
    }

    // weekly_holiday_pay
    const hw = num(ct.hourly_wage);
    if (hw > 0 && (!ct.weekly_holiday_pay || num(ct.weekly_holiday_pay) === 0)) {
      const calcWeekly = r(hw * hpd * WEEKS_PER_MONTH);
      fixes.push(`weekly_holiday_pay: ${ct.weekly_holiday_pay} → ${calcWeekly}`);
      ct.weekly_holiday_pay = calcWeekly;
    }

    // monthly_salary_agreed
    if (!ct.monthly_salary_agreed || num(ct.monthly_salary_agreed) === 0) {
      const calcMonthly = r(num(ct.base_salary) + num(ct.weekly_holiday_pay));
      if (calcMonthly > 0) {
        fixes.push(`monthly_salary_agreed: ${ct.monthly_salary_agreed} → ${calcMonthly}`);
        ct.monthly_salary_agreed = calcMonthly;
      }
    }
  }

  // ── 7. insurance null → 'Y' ──
  const insFields = ['insurance_pension','insurance_health','insurance_employment','insurance_industrial'];
  for (const f of insFields) {
    if (ct[f] === null || ct[f] === undefined || ct[f] === '') {
      fixes.push(`${f}: null → Y`);
      ct[f] = 'Y';
    }
  }

  // ── 8. contract_start 누락이면 hire_date 사용 ──
  if (!ct.contract_start) {
    const emp = (db.employees || []).find(e => e.id === ct.employee_id);
    if (emp && emp.hire_date) {
      fixes.push(`contract_start: null → ${emp.hire_date} (hire_date)`);
      ct.contract_start = emp.hire_date;
    }
  }

  // ── 9. annual_leave_days 누락 → 15 ──
  if (!ct.annual_leave_days || num(ct.annual_leave_days) === 0) {
    if (!isDaily) {
      fixes.push(`annual_leave_days: ${ct.annual_leave_days} → 15`);
      ct.annual_leave_days = 15;
    }
  }

  if (fixes.length > 0) {
    totalFixed++;
    if (DRY_RUN) {
      const emp = (db.employees || []).find(e => e.id === ct.employee_id);
      console.log(`\n${cid} (${emp ? emp.name : '?'}, ${ct.contract_type || '?'}):`);
      fixes.forEach(f => console.log(`  ${f}`));
    }
  }
}

console.log(`\n계약 ${contracts.length}건 중 ${totalFixed}건 보정 필요`);
if (!DRY_RUN && totalFixed > 0) {
  fs.writeFileSync('data/db.json', JSON.stringify(db, null, 2), 'utf8');
  console.log('db.json 저장 완료');
}
