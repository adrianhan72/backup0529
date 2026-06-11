/**
 * fix_regular_base_salary.js
 *
 * 검증 조건: 기본급 + 주휴수당 + 수당합산 = 월 약정임금
 *
 * 수식 정의:
 *   - 정규직·정규직 수습:
 *       monthly  = Math.round(annual_salary / 12)         (연봉÷12, 변경 없음)
 *       base     = Math.max(0, Math.round((monthly - allAllow) * 5 / 6))  (역산)
 *       weeklyHol= Math.round(base / 5)
 *       → 검증: base + weeklyHol + allAllow === monthly  ✔
 *   - 계약직·계약직 수습:
 *       base / weeklyHol / monthly 그대로 유지
 *       weeklyHol = Math.round(base / 5)  으로 재확인
 *       monthly   = base + weeklyHol + allAllow  으로 재정합
 *   - 일용직: 스킵
 *   - hourly_wage = Math.round(monthly / 209)  (정규직도 동일 기준)
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// ── 수당 합산 ──────────────────────────────────────────────────────────────
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

// ── 올바른 값 계산 ─────────────────────────────────────────────────────────
function calcCorrect(c) {
  const cat     = c.contract_type || '';
  const isReg   = cat === '정규직' || cat === '정규직 수습';
  const isDaily = cat === '일용직';

  if (isDaily) {
    const daily  = parseFloat(c.daily_wage || 0);
    const hours  = parseFloat(c.work_hours_per_day || 8);
    const hourly = (daily > 0 && hours > 0) ? Math.round(daily / hours) : 0;
    return { base: 0, monthly: 0, weeklyHol: 0, hourly };
  }

  const allAllow = calcAllowances(c);

  if (isReg) {
    const annual    = parseFloat(c.annual_salary || 0);
    const monthly   = annual > 0 ? Math.round(annual / 12) : parseFloat(c.monthly_salary_agreed || 0);
    // 기본급 역산: monthly = base + base/5 + allAllow  →  base = (monthly - allAllow) * 5/6
    const base      = Math.max(0, Math.round((monthly - allAllow) * 5 / 6));
    const weeklyHol = Math.round(base / 5);
    const hourly    = monthly > 0 ? Math.round(monthly / 209) : 0;
    return { base, monthly, weeklyHol, hourly };
  }

  // 계약직 계열: base는 그대로 유지, weeklyHol·monthly·hourly 재정합
  const base      = parseFloat(c.base_salary || 0);
  const weeklyHol = Math.round(base / 5);
  const monthly   = base + weeklyHol + allAllow;
  const hourly    = monthly > 0 ? Math.round(monthly / 209) : 0;
  return { base, monthly, weeklyHol, hourly };
}

// ── 실행 ──────────────────────────────────────────────────────────────────
const db        = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const contracts = db.contracts || [];

let fixedCount = 0;
let skipCount  = 0;
const log      = [];

contracts.forEach(c => {
  const { base, monthly, weeklyHol, hourly } = calcCorrect(c);

  const prevBase    = parseFloat(c.base_salary           || 0);
  const prevMonthly = parseFloat(c.monthly_salary_agreed || 0);
  const prevWkHol   = parseFloat(c.weekly_holiday_pay    || 0);
  const prevHourly  = parseFloat(c.hourly_wage           || 0);

  const changed = (base      !== prevBase)
               || (monthly   !== prevMonthly)
               || (weeklyHol !== prevWkHol)
               || (hourly    !== prevHourly);

  if (!changed) { skipCount++; return; }

  log.push({
    id: c.id, type: c.contract_type,
    prev: { base: prevBase, monthly: prevMonthly, wkHol: prevWkHol, hourly: prevHourly },
    next: { base, monthly, weeklyHol, hourly }
  });

  c.base_salary           = base;
  c.monthly_salary_agreed = monthly;
  c.weekly_holiday_pay    = weeklyHol;
  c.hourly_wage           = hourly;
  fixedCount++;
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

// ── 리포트 ────────────────────────────────────────────────────────────────
console.log('='.repeat(72));
console.log('fix_regular_base_salary.js 실행 결과');
console.log('='.repeat(72));
console.log(`✅ 수정 완료 : ${fixedCount}건`);
console.log(`⏭  변경 없음 : ${skipCount}건`);
console.log(`📋 총 계약   : ${contracts.length}건`);
console.log('');

if (log.length > 0) {
  console.log('── 수정 내역 ──');
  log.forEach(({ id, type, prev, next }) => {
    const lines = [`[${type}] ${id}`];
    if (prev.base    !== next.base)
      lines.push(`  base_salary           : ${prev.base.toLocaleString()} → ${next.base.toLocaleString()}`);
    if (prev.monthly !== next.monthly)
      lines.push(`  monthly_salary_agreed : ${prev.monthly.toLocaleString()} → ${next.monthly.toLocaleString()}`);
    if (prev.wkHol   !== next.weeklyHol)
      lines.push(`  weekly_holiday_pay    : ${prev.wkHol.toLocaleString()} → ${next.weeklyHol.toLocaleString()}`);
    if (prev.hourly  !== next.hourly)
      lines.push(`  hourly_wage           : ${prev.hourly.toLocaleString()} → ${next.hourly.toLocaleString()}`);
    console.log(lines.join('\n'));
  });
}
console.log('='.repeat(72));

// ── 사후 검증 ─────────────────────────────────────────────────────────────
const db2       = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const remaining = (db2.contracts || []).filter(c => {
  const cat = c.contract_type || '';
  if (cat === '일용직') return false;
  const base      = parseFloat(c.base_salary || 0);
  const allAllow  = calcAllowances(c);
  const weeklyHol = Math.round(base / 5);
  const monthly   = parseFloat(c.monthly_salary_agreed || 0);
  return (base + weeklyHol + allAllow) !== monthly;
});
console.log('');
console.log(`🔍 사후 검증 — 여전히 불일치: ${remaining.length}건`);
if (remaining.length > 0) {
  remaining.forEach(c => {
    const base = parseFloat(c.base_salary || 0);
    const all  = calcAllowances(c);
    const wkh  = Math.round(base / 5);
    const mon  = parseFloat(c.monthly_salary_agreed || 0);
    console.log(`  [${c.contract_type}] ${c.id}  ${base}+${wkh}+${all}=${base+wkh+all}  stored=${mon}`);
  });
}
console.log('='.repeat(72));
