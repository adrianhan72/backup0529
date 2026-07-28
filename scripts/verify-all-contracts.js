/**
 * 근로계약 데이터 전면 검증
 * - 수당·공제·근무시간·연결관계까지 모두 확인
 */
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));
const contracts = db.contracts || [];
const employees = db.employees || [];
const companies = db.companies || [];
const payrolls = (db.payrolls || []).filter(p => !p.is_draft);

const r = v => Math.round(v);
const num = (v, d = 0) => { const n = Number(v); return isNaN(n) ? d : n; };

const issues = [];
const WEEKS_PER_MONTH = 365 / 12 / 7;

for (const ct of contracts) {
  if (ct.is_draft === 1) continue;
  const cid = ct.id;
  const emp = employees.find(e => e.id === ct.employee_id);
  const co = companies.find(c => c.id === ct.company_id);

  // ── 1. 기본 연결 검증 ──
  if (!emp) { issues.push(`${cid}: 연결된 직원 없음 (employee_id=${ct.employee_id})`); continue; }
  if (!co) { issues.push(`${cid}: 연결된 회사 없음 (company_id=${ct.company_id})`); continue; }

  const empName = emp.name || '(이름없음)';
  const prefix = `${cid} (${empName}, ${ct.contract_type || '?'})`;

  // ── 2. 필수 필드 null 검증 ──
  if (!ct.contract_start) issues.push(`${prefix}: contract_start null`);
  if (!ct.contract_type) issues.push(`${prefix}: contract_type null`);
  if (!emp.name) issues.push(`${prefix}: 직원 이름 null`);
  if (!emp.id_number) issues.push(`${prefix}: 직원 주민번호 null`);
  if (!emp.hire_date) issues.push(`${prefix}: 직원 입사일 null`);

  // ── 3. 근로시간 검증 ──
  const hpd = num(ct.work_hours_per_day, 8);
  const dpw = num(ct.work_days_per_week, 5);
  const dpm = num(ct.work_days_per_month);
  const expectedDpm = r(dpw * WEEKS_PER_MONTH);
  if (dpm > 0 && Math.abs(dpm - expectedDpm) > 1) {
    issues.push(`${prefix}: work_days_per_month=${dpm}, expected=${expectedDpm} (dpw=${dpw}×4.345)`);
  }

  // ── 4. schedule_json vs work_hours/day/week 정합성 ──
  if (ct.schedule_json) {
    try {
      const sch = JSON.parse(ct.schedule_json);
      if (Array.isArray(sch)) {
        const activeDays = sch.filter(d => d.active).length;
        if (activeDays > 0 && activeDays !== dpw) {
          issues.push(`${prefix}: schedule_json 활성일수=${activeDays}, work_days_per_week=${dpw} 불일치`);
        }
        // 시간 검증
        for (const day of sch) {
          if (!day.active) continue;
          const dayHpd = num(day.hours_per_day) || (day.end && day.start ? (new Date(`2000-01-01T${day.end}`) - new Date(`2000-01-01T${day.start}`)) / 3600000 : 0);
          if (dayHpd > 0 && Math.abs(dayHpd - hpd) > 0.1) {
            issues.push(`${prefix}: schedule_json 근무시간=${dayHpd}h, work_hours_per_day=${hpd}h 불일치`);
            break;
          }
        }
      }
    } catch(e) { /* JSON 파싱 오류는 skip */ }
  }

  // ── 5. 급여 항목 검증 ──
  const baseSal = num(ct.base_salary);
  const monthlyStdH = r(hpd * dpw * WEEKS_PER_MONTH);
  const calcHourlyFromBase = baseSal > 0 ? r(baseSal / monthlyStdH) : 0;
  const storedHourly = num(ct.hourly_wage);

  if (baseSal > 0 && storedHourly > 0) {
    if (Math.abs(storedHourly - calcHourlyFromBase) > 1) {
      issues.push(`${prefix}: hourly_wage 불일치 (stored=${storedHourly}, calc=${calcHourlyFromBase}, base=${baseSal}/${monthlyStdH})`);
    }
  }

  // ── 6. weekly_holiday_pay 검증 ──
  const calcWeekly = storedHourly > 0 ? r(storedHourly * hpd * WEEKS_PER_MONTH) : 0;
  const storedWeekly = num(ct.weekly_holiday_pay);
  if (storedHourly > 0 && Math.abs(storedWeekly - calcWeekly) > 1) {
    issues.push(`${prefix}: weekly_holiday_pay 불일치 (stored=${storedWeekly}, calc=${calcWeekly})`);
  }

  // ── 7. 고정OT/야간/휴일 검증 ──
  const otH = num(ct.fixed_ot_hours);
  const ntH = num(ct.fixed_night_hours);
  const hlH = num(ct.fixed_hol_hours);
  if (storedHourly > 0) {
    if (otH > 0) {
      const calcOt = r(storedHourly * otH * 1.5);
      if (Math.abs(num(ct.fixed_ot_pay) - calcOt) > 1) {
        issues.push(`${prefix}: fixed_ot_pay 불일치 (stored=${ct.fixed_ot_pay}, calc=${calcOt}, hw=${storedHourly}, hours=${otH})`);
      }
    }
    if (ntH > 0) {
      const calcNt = r(storedHourly * ntH * 0.5);
      if (Math.abs(num(ct.fixed_night_pay) - calcNt) > 1) {
        issues.push(`${prefix}: fixed_night_pay 불일치 (stored=${ct.fixed_night_pay}, calc=${calcNt})`);
      }
    }
    if (hlH > 0) {
      const calcHl = r(storedHourly * hlH * 1.5);
      if (Math.abs(num(ct.fixed_hol_pay) - calcHl) > 1) {
        issues.push(`${prefix}: fixed_hol_pay 불일치 (stored=${ct.fixed_hol_pay}, calc=${calcHl})`);
      }
    }
  }

  // ── 8. monthly_salary_agreed = base + weekly + sum(fixed allowances) + sum(fixed OT/nt/hol) ──
  const sumFixedExtra = num(ct.fixed_ot_pay) + num(ct.fixed_night_pay) + num(ct.fixed_hol_pay);
  const allowFields = [
    'meal_allowance','transportation_allowance','position_allowance','skill_allowance',
    'license_allowance','site_allowance','remote_area_allowance','hazard_allowance',
    'childcare_allowance','research_allowance','communication_allowance','fitness_allowance',
    'self_dev_allowance','book_allowance','overseas_allowance','regular_bonus',
    'self_driving_allowance','car_maintenance','contract_etc_allowance','etc_allowance'
  ];
  const fixedAllowPt = ['fixed','매월','매월(정기)'];
  let sumFixedAllow = 0;
  for (const fn of allowFields) {
    const amt = num(ct[fn]);
    if (amt <= 0) continue;
    const ptField = fn.replace('_allowance', '_pay_type');
    const pt = ct[ptField] || '';
    if (!pt || fixedAllowPt.includes(pt)) {
      sumFixedAllow += amt;
    }
  }
  const calcMonthly = r(baseSal + storedWeekly + sumFixedAllow + sumFixedExtra);
  const storedMonthly = num(ct.monthly_salary_agreed);
  if (baseSal > 0 && calcMonthly > 0 && Math.abs(storedMonthly - calcMonthly) > 100) {
    issues.push(`${prefix}: monthly_salary_agreed 불일치 (stored=${storedMonthly}, calc=${calcMonthly}, base=${baseSal}+weekly=${storedWeekly}+allow=${sumFixedAllow}+fixed=${sumFixedExtra})`);
  }

  // ── 9. annual_salary (정규직 only) ──
  if ((ct.contract_type === '정규직' || ct.contract_type === '정규직 수습') && storedMonthly > 0) {
    const calcAnnual = r(storedMonthly * 12);
    if (Math.abs(num(ct.annual_salary) - calcAnnual) > 1) {
      issues.push(`${prefix}: annual_salary 불일치 (stored=${ct.annual_salary}, calc=${calcAnnual})`);
    }
  }

  // ── 10. probation 검증 ──
  const probPct = num(ct.probation_pct);
  const probMonths = num(ct.probation_months);
  if (probMonths > 0 && probPct > 0) {
    const ref = Math.max(storedMonthly, baseSal);
    const calcProb = r(ref * probPct / 100);
    if (calcProb > 0 && Math.abs(num(ct.probation_amt) - calcProb) > 1) {
      issues.push(`${prefix}: probation_amt 불일치 (stored=${ct.probation_amt}, calc=${calcProb}, ref=${ref}×${probPct}%)`);
    }
    // probation_end_date 검증
    if (ct.contract_start && ct.probation_end_date) {
      const start = new Date(ct.contract_start);
      const end = new Date(ct.probation_end_date);
      const expectedEnd = new Date(start);
      expectedEnd.setMonth(expectedEnd.getMonth() + probMonths);
      expectedEnd.setDate(expectedEnd.getDate() - 1);
      if (Math.abs(end - expectedEnd) > 86400000) {
        issues.push(`${prefix}: probation_end_date 불일치 (stored=${ct.probation_end_date}, expected=${expectedEnd.toISOString().slice(0,10)})`);
      }
    }
  }

  // ── 11. 4대보험 가입여부 검증 ──
  const insFields = { insurance_pension: '국민연금', insurance_health: '건강보험', insurance_employment: '고용보험', insurance_industrial: '산재보험' };
  for (const [f, name] of Object.entries(insFields)) {
    if (ct[f] === null || ct[f] === undefined || ct[f] === '') {
      issues.push(`${prefix}: ${name} 가입여부(${f}) null`);
    }
  }

  // ── 12. 급여와의 정합성 (payroll에 반영되었는지) ──
  const relatedPayrolls = payrolls.filter(p => p.employee_id === ct.employee_id);
  if (relatedPayrolls.length > 0) {
    for (const pay of relatedPayrolls.slice(0, 3)) {
      // base_salary 일할계산 비교
      const wd = num(pay.work_days);
      if (wd > 0 && baseSal > 0) {
        const monthDays = r(dpw * WEEKS_PER_MONTH);
        if (wd === monthDays) {
          // 만근이면 base_salary 일치해야 함
          if (Math.abs(num(pay.base_salary) - baseSal) > 100) {
            issues.push(`${prefix} ↔ ${pay.id}: 만근 base_salary 불일치 (contract=${baseSal}, payroll=${pay.base_salary})`);
          }
        }
      }
    }
  }
}

// ── 결과 ──
console.log(`계약 ${contracts.length}건 검증 완료\n`);
if (issues.length === 0) {
  console.log('✅ 모든 계약 데이터가 완전합니다.');
} else {
  console.log(`❌ ${issues.length}건 문제 발견:\n`);
  const cats = {};
  issues.forEach(i => {
    const m = i.match(/: (.+?) \(/);
    const type = m ? m[1] : '기타';
    if (!cats[type]) cats[type] = [];
    cats[type].push(i);
  });
  for (const [type, items] of Object.entries(cats).sort()) {
    console.log(`\n[${type}] ${items.length}건:`);
    items.slice(0, 5).forEach(i => console.log(`  ${i}`));
    if (items.length > 5) console.log(`  ... 외 ${items.length - 5}건`);
  }
}
