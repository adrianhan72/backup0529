/**
 * fix_monthly_salary.js
 *
 * 수정된 수식 기준으로 contracts 전체의
 * monthly_salary_agreed / weekly_holiday_pay / hourly_wage 를 일괄 재계산하여 db.json에 반영
 *
 * 수식 정의:
 *   - 주휴수당  : Math.round(base / 5)         (월 기본급의 20%, 주5일 기준)
 *   - 정규직   : monthly = Math.round(annual / 12)
 *   - 계약직 계열: monthly = base + weeklyHol + 전체수당합산
 *   - 일용직   : monthly = 0, weeklyHol = 0,  hourly = Math.round(daily / hours)
 *   - 통상시급 : Math.round(monthly / 209)
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// ── 수식 함수 ──────────────────────────────────────────────────────────────
function calcAllowances(c) {
  return (
    parseFloat(c.position_allowance       || 0) +
    (parseFloat(c.transportation_allowance || c.car_maintenance || 0)
      + parseFloat(c.self_driving_allowance || 0)) +
    parseFloat(c.remote_area_allowance    || 0) +
    parseFloat(c.meal_allowance           || 0) +
    parseFloat(c.childcare_allowance      || 0) +
    parseFloat(c.research_allowance       || 0) +
    parseFloat(c.site_allowance           || 0) +
    parseFloat(c.skill_allowance          || 0) +
    parseFloat(c.license_allowance        || 0) +
    parseFloat(c.communication_allowance  || 0) +
    parseFloat(c.fitness_allowance        || 0) +
    parseFloat(c.self_dev_allowance       || 0) +
    parseFloat(c.book_allowance           || 0) +
    parseFloat(c.overseas_allowance       || 0)
  );
}

function calcCorrect(c) {
  const cat      = c.contract_type || '';
  const isReg    = cat === '정규직' || cat === '정규직 수습';
  const isDaily  = cat === '일용직';

  if (isDaily) {
    const daily  = parseFloat(c.daily_wage || 0);
    const hours  = parseFloat(c.work_hours_per_day || 8);
    const hourly = (daily > 0 && hours > 0) ? Math.round(daily / hours) : 0;
    return { monthly: 0, weeklyHol: 0, hourly };
  }

  const base      = parseFloat(c.base_salary  || 0);
  const annual    = parseFloat(c.annual_salary || 0);
  const weeklyHol = Math.round(base / 5); // base ÷ 5 = 기본급의 20%
  const allAllow  = calcAllowances(c);

  let monthly;
  if (isReg && annual > 0) {
    monthly = Math.round(annual / 12);
  } else {
    monthly = base + weeklyHol + allAllow;
  }

  const hourly = monthly > 0 ? Math.round(monthly / 209) : 0;
  return { monthly, weeklyHol, hourly };
}

// ── 실행 ──────────────────────────────────────────────────────────────────
const db        = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const contracts = db.contracts || [];

let fixedCount  = 0;
let skipCount   = 0;

const log = [];

contracts.forEach(c => {
  const { monthly, weeklyHol, hourly } = calcCorrect(c);

  const prevMonthly  = parseFloat(c.monthly_salary_agreed || 0);
  const prevWkHol    = parseFloat(c.weekly_holiday_pay    || 0);
  const prevHourly   = parseFloat(c.hourly_wage           || 0);

  const changed = (monthly !== prevMonthly)
               || (weeklyHol !== prevWkHol)
               || (hourly   !== prevHourly);

  if (!changed) {
    skipCount++;
    return;
  }

  log.push({
    id   : c.id,
    type : c.contract_type,
    prev : { monthly: prevMonthly, wkHol: prevWkHol, hourly: prevHourly },
    next : { monthly, weeklyHol, hourly }
  });

  c.monthly_salary_agreed = monthly;
  c.weekly_holiday_pay    = weeklyHol;
  c.hourly_wage           = hourly;
  fixedCount++;
});

// 결과 저장
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

// 리포트 출력
console.log('='.repeat(70));
console.log('fix_monthly_salary.js 실행 결과');
console.log('='.repeat(70));
console.log(`✅ 수정 완료 : ${fixedCount}건`);
console.log(`⏭  변경 없음 : ${skipCount}건`);
console.log(`📋 총 계약  : ${contracts.length}건`);
console.log('');

if (log.length > 0) {
  console.log('── 수정 내역 ──');
  log.forEach(({ id, type, prev, next }) => {
    console.log(`[${type}] ${id}`);
    if (prev.monthly !== next.monthly)
      console.log(`  monthly_salary_agreed : ${prev.monthly.toLocaleString()} → ${next.monthly.toLocaleString()}`);
    if (prev.wkHol !== next.weeklyHol)
      console.log(`  weekly_holiday_pay    : ${prev.wkHol.toLocaleString()} → ${next.weeklyHol.toLocaleString()}`);
    if (prev.hourly !== next.hourly)
      console.log(`  hourly_wage           : ${prev.hourly.toLocaleString()} → ${next.hourly.toLocaleString()}`);
  });
}
console.log('='.repeat(70));
