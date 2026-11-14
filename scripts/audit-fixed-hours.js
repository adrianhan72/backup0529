/**
 * 고정 연장/야간/휴일 근로시간 정합성 전수조사
 * 
 * 각 계약의 schedule_json을 파싱하여 주간 연장/야간/휴일 시간을 재계산하고
 * DB에 저장된 fixed_ot_hours, fixed_night_hours, fixed_hol_hours와 비교.
 * 불일치 시 실제 계산값으로 업데이트한다.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

// ── 상수 ──
const STATUTORY_DAILY = 8 * 60;   // 480분
const STATUTORY_WEEKLY = 40 * 60; // 2400분
const NIGHT_START = 22 * 60;      // 1320분
const NIGHT_END = 30 * 60;        // 1800분 (익일 06:00)
const WEEK_TO_MONTH = 365 / 12 / 7; // 4.345...

function timeToMins(t) {
  if (!t || typeof t !== 'string') return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function calcNightMins(sm, em, breakMins) {
  if (sm === null || em === null) return 0;
  if (em <= sm) em += 24 * 60;
  const rawOverlap = Math.max(0, Math.min(em, NIGHT_END) - Math.max(sm, NIGHT_START))
                   + Math.max(0, Math.min(em, NIGHT_END + 24 * 60) - Math.max(sm, NIGHT_START + 24 * 60));
  // 휴게시간 중 야간 시간대에 걸리는 부분 제외
  const breakNightOverlap = breakMins > 0 ? Math.min(breakMins, rawOverlap) : 0;
  return Math.max(0, rawOverlap - breakNightOverlap);
}

function calcFromSchedule(scheduleJson) {
  if (!scheduleJson) return null;
  let schedule;
  try {
    schedule = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson;
  } catch (e) {
    return null;
  }
  if (!Array.isArray(schedule)) return null;

  let totalStatMins = 0, totalOtMins = 0, totalNightMins = 0, totalHolMins = 0;

  for (const s of schedule) {
    if (!s.active) continue;
    const sm = timeToMins(s.start);
    const em = timeToMins(s.end);
    if (sm === null || em === null) continue;

    let emAdj = em;
    if (emAdj <= sm) emAdj += 24 * 60;

    // 휴게시간 합산
    let totalBrk = 0;
    if (Array.isArray(s.breaks)) {
      for (const b of s.breaks) {
        const bs = timeToMins(b.s), be = timeToMins(b.e);
        if (bs !== null && be !== null) {
          let beAdj = be;
          if (beAdj <= sm) beAdj += 24 * 60;
          totalBrk += Math.max(0, beAdj - bs);
        }
      }
    }

    const dayMins = Math.max(0, emAdj - sm - totalBrk);
    const isWeekend = s.day === 'sat' || s.day === 'sun';

    // 소정 vs 연장
    const dayStat = Math.min(dayMins, STATUTORY_DAILY);
    const dayOt = Math.max(0, dayMins - STATUTORY_DAILY);

    // 주말은 소정/연장 합산에서 제외 (휴일로만)
    if (!isWeekend) {
      totalStatMins += dayStat;
      totalOtMins += dayOt;
    }

    // 야간
    totalNightMins += calcNightMins(sm, emAdj, totalBrk);

    // 휴일
    if (isWeekend) totalHolMins += dayMins;
  }

  // 주 40h 초과분 → 연장
  if (totalStatMins > STATUTORY_WEEKLY) {
    totalOtMins += (totalStatMins - STATUTORY_WEEKLY);
    totalStatMins = STATUTORY_WEEKLY;
  }

  return {
    weekOtH: totalOtMins / 60,
    weekNightH: totalNightMins / 60,
    weekHolH: totalHolMins / 60,
  };
}

function fmt(n) {
  if (typeof n !== 'number') return String(n);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// ── 조회 ──
const contracts = db.prepare(`
  SELECT id, company_id, employee_id, contract_start, 
         schedule_json, hourly_wage,
         fixed_ot_hours, fixed_night_hours, fixed_hol_hours,
         fixed_ot_pay, fixed_night_pay, fixed_hol_pay
  FROM contracts 
  WHERE schedule_json IS NOT NULL AND schedule_json != ''
  ORDER BY company_id, contract_start
`).all();

console.log('=== 고정 연장/야간/휴일 근로시간 정합성 전수조사 ===');
console.log('스케줄 있는 계약 수:', contracts.length);

const issues = [];

for (const c of contracts) {
  const calc = calcFromSchedule(c.schedule_json);
  if (!calc) continue;

  const dbOt = parseFloat(c.fixed_ot_hours) || 0;
  const dbNight = parseFloat(c.fixed_night_hours) || 0;
  const dbHol = parseFloat(c.fixed_hol_hours) || 0;

  const calcOt = Math.round(calc.weekOtH * 10) / 10;
  const calcNight = Math.round(calc.weekNightH * 10) / 10;
  const calcHol = Math.round(calc.weekHolH * 10) / 10;

  const diffOt = Math.abs(dbOt - calcOt);
  const diffNight = Math.abs(dbNight - calcNight);
  const diffHol = Math.abs(dbHol - calcHol);

  if (diffOt > 0.05 || diffNight > 0.05 || diffHol > 0.05) {
    const diffs = [];
    if (diffOt > 0.05) diffs.push('연장: ' + fmt(dbOt) + 'h → ' + fmt(calcOt) + 'h');
    if (diffNight > 0.05) diffs.push('야간: ' + fmt(dbNight) + 'h → ' + fmt(calcNight) + 'h');
    if (diffHol > 0.05) diffs.push('휴일: ' + fmt(dbHol) + 'h → ' + fmt(calcHol) + 'h');

    issues.push({
      id: c.id,
      company_id: c.company_id,
      contract_start: c.contract_start,
      hourly_wage: c.hourly_wage || 0,
      db: { ot: dbOt, night: dbNight, hol: dbHol },
      calc: { ot: calcOt, night: calcNight, hol: calcHol },
      diffs,
    });
  }
}

console.log('불일치 계약 수:', issues.length);

if (issues.length > 0) {
  console.log('\n--- 불일치 상세 ---');
  for (const iss of issues) {
    console.log('\n계약ID: ' + iss.id);
    console.log('  회사: ' + iss.company_id + ' | 시작일: ' + iss.contract_start + ' | 시급: ' + iss.hourly_wage);
    for (const d of iss.diffs) {
      console.log('  ❌ ' + d);
    }
  }

  // ── 수정 ──
  console.log('\n=== 수정 진행 ===');
  const updStmt = db.prepare('UPDATE contracts SET fixed_ot_hours=?, fixed_night_hours=?, fixed_hol_hours=? WHERE id=?');
  let fixed = 0;
  for (const iss of issues) {
    updStmt.run(iss.calc.ot, iss.calc.night, iss.calc.hol, iss.id);
    fixed++;
  }
  console.log(fixed + '건 수정 완료');

  // ── pay 재계산 (시급 × 월시간 × 가산율) ──
  console.log('\n=== 고정 수당 금액 재계산 ===');
  // 가산율: 연장 1.5, 야간 0.5(추가), 휴일 1.5(8h이하) or 2.0(8h초과)
  // 여기서는 단순화: 연장 1.5, 야간 0.5, 휴일 1.5
  const payStmt = db.prepare('UPDATE contracts SET fixed_ot_pay=?, fixed_night_pay=?, fixed_hol_pay=? WHERE id=?');
  let payFixed = 0;
  for (const iss of issues) {
    const hw = iss.hourly_wage || 0;
    if (hw <= 0) continue;
    // 연장: 1.5배, 야간: 0.5배(추가할증), 휴일: 1.5배
    const otPay = Math.round(hw * iss.calc.ot * WEEK_TO_MONTH * 1.5);
    const nightPay = Math.round(hw * iss.calc.night * WEEK_TO_MONTH * 0.5);
    const holPay = Math.round(hw * iss.calc.hol * WEEK_TO_MONTH * 1.5);
    payStmt.run(otPay, nightPay, holPay, iss.id);
    payFixed++;
  }
  console.log(payFixed + '건 금액 재계산 완료');
}

// ── 재검증 ──
console.log('\n=== 수정 후 재검증 ===');
let recheckIssues = 0;
for (const c of contracts) {
  const calc = calcFromSchedule(c.schedule_json);
  if (!calc) continue;
  const dbOt = parseFloat(c.fixed_ot_hours) || 0;
  const dbNight = parseFloat(c.fixed_night_hours) || 0;
  const dbHol = parseFloat(c.fixed_hol_hours) || 0;
  const calcOt = Math.round(calc.weekOtH * 10) / 10;
  const calcNight = Math.round(calc.weekNightH * 10) / 10;
  const calcHol = Math.round(calc.weekHolH * 10) / 10;
  if (Math.abs(dbOt - calcOt) > 0.05 || Math.abs(dbNight - calcNight) > 0.05 || Math.abs(dbHol - calcHol) > 0.05) {
    recheckIssues++;
  }
}
console.log('재검증 불일치: ' + recheckIssues + '건');
if (recheckIssues === 0) console.log('모든 계약 정합성 확인 완료');

db.close();
console.log('\n=== 전수조사 완료 ===');
