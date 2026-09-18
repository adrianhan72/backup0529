/**
 * backfill-total-work-hours.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 모든 급여명세서(payrolls)의 total_work_hours 를 산식에 맞게 재계산·반영한다.
 *
 *   산식 (admin/js/admin-payroll-input/payroll-input-main.js — calcPITotalHours)
 *     총근로시간 = (근로일수 × 일소정근로시간)
 *               + 고정(연장+야간+휴일)          ← schedule_json 기준, 없으면 fixed_* 필드
 *               + 추가(연장+야간+휴일)          ← payroll.overtime/night/holiday_hours
 *               − 무단조퇴 − 무단지각            ← earlyleave/late_data JSON
 *     소수 1자리 반올림
 *
 * 사용법
 *   node scripts/backfill-total-work-hours.js            # dry-run (변경 예정 목록)
 *   node scripts/backfill-total-work-hours.js --apply    # 실제 반영
 *   node scripts/backfill-total-work-hours.js --only-null # NULL만 대상
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const APPLY = process.argv.includes('--apply');
const ONLY_NULL = process.argv.includes('--only-null');

// ── 상수 (contract-form.js / payroll-input-main.js 동일) ──
const STATUTORY_DAILY = 8 * 60;    // 480분
const STATUTORY_WEEKLY = 40 * 60;  // 2400분
const NIGHT_START = 22 * 60;       // 1320분
const NIGHT_END = 30 * 60;         // 1800분 (익일 06:00)
const WEEK_TO_MONTH = 365 / 12 / 7; // 4.345주/월

function pad(n) { return String(n).padStart(2, '0'); }
function lastDayOfMonth(yr, mo) { return new Date(yr, mo, 0).getDate(); }

function _parseTime(t) {
  const m = (t || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

// ── schedule_json → 고정 연장/야간/휴일 시간 (월 환산) ──
// payroll-input-main.js _calcFixedHoursFromSchedule 의 시간 계산부를 그대로 이식 (수당 계산 제외)
function calcFixedHoursFromSchedule(scheduleJson) {
  const result = {
    otHours: 0, nightHours: 0, holHours: 0, holOtHours: 0,
    otRegularHours: 0, otHolHours: 0, nightWdayHours: 0, nightSunHours: 0,
    weekStatHoursW: 0, satFillHoursW: 0, satHolHoursW: 0,
    satHolHours: 0, satHolOtHours: 0, sunHolHours: 0, sunHolOtHours: 0,
  };
  if (!scheduleJson) return result;
  let sched;
  try { sched = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson; }
  catch (e) { return result; }
  if (!Array.isArray(sched) || !sched.length) return result;

  const WEEKS_PER_MONTH = WEEK_TO_MONTH;
  let _totalStatMins = 0;
  let _satMins = 0, _sunHolMins = 0, _sunHolOtMins = 0;

  sched.forEach(d => {
    if (!d.active) return;
    const isHoliday = d.day === 'sun' || d.day === 'sat'; // 토·일 모두 휴일근로 (2026-08-14 규칙)
    const isSat = d.day === 'sat';
    let dayMins = 0;

    (d.shifts || []).forEach(sh => {
      if (!sh.start || !sh.end) return;
      const startMin = _parseTime(sh.start);
      let endMin = _parseTime(sh.end);
      if (startMin === null || endMin === null) return;
      if (endMin <= startMin) endMin += 24 * 60;

      let breakMin = 0;
      (sh.breaks || []).forEach(b => {
        if (!b.s || !b.e) return;
        const bs = _parseTime(b.s), be = _parseTime(b.e);
        if (bs !== null && be !== null && be > bs) breakMin += be - bs;
        else if (bs !== null && be !== null && be <= bs) breakMin += (be + 24 * 60) - bs;
      });
      const workMin = endMin - startMin - breakMin;
      if (workMin <= 0) return;

      if (isHoliday) {
        dayMins += workMin;
      } else {
        const dailyOtMin = Math.max(0, workMin - STATUTORY_DAILY);
        result.otRegularHours += (dailyOtMin / 60) * WEEKS_PER_MONTH;
        _totalStatMins += Math.min(workMin, STATUTORY_DAILY);
      }

      // 야간 (평일/휴일 구분)
      const s = startMin, e = endMin;
      const nightOverlap = Math.max(0, Math.min(e, NIGHT_END) - Math.max(s, NIGHT_START))
        + Math.max(0, Math.min(e, NIGHT_END + 24 * 60) - Math.max(s, NIGHT_START + 24 * 60));
      let nightBrkMin = 0;
      (sh.breaks || []).forEach(b => {
        if (!b.s || !b.e) return;
        const bs = _parseTime(b.s), be = _parseTime(b.e);
        if (bs === null || be === null) return;
        let be2 = be;
        if (be2 <= bs) be2 += 24 * 60;
        nightBrkMin += Math.max(0, Math.min(be2, NIGHT_END) - Math.max(bs, NIGHT_START))
          + Math.max(0, Math.min(be2, NIGHT_END + 24 * 60) - Math.max(bs, NIGHT_START + 24 * 60));
      });
      const dailyNightMin = Math.max(0, nightOverlap - nightBrkMin);
      const dailyNightH = (dailyNightMin / 60) * WEEKS_PER_MONTH;
      if (isHoliday) result.nightSunHours += dailyNightH;
      else { result.nightHours += dailyNightH; result.nightWdayHours += dailyNightH; }
    });

    if (isHoliday && dayMins > 0) {
      if (isSat) _satMins += dayMins; // 토요일: 40h 충당 후 잔여만 휴일
      else {
        _sunHolMins += Math.min(dayMins, STATUTORY_DAILY);
        _sunHolOtMins += Math.max(0, dayMins - STATUTORY_DAILY);
      }
    }
  });

  // 주 40시간 상한
  if (_totalStatMins > STATUTORY_WEEKLY) {
    const weeklyOtMin = _totalStatMins - STATUTORY_WEEKLY;
    result.otRegularHours += (weeklyOtMin / 60) * WEEKS_PER_MONTH;
    _totalStatMins = STATUTORY_WEEKLY;
  }

  // 토요일 40h 미달 충당 (2026-08-14 규칙)
  let _satHolW = 0, _satHolOtW = 0;
  if (_satMins > 0) {
    const gap = Math.max(0, STATUTORY_WEEKLY - _totalStatMins);
    const fill = Math.min(_satMins, gap, STATUTORY_DAILY);
    if (fill > 0) _totalStatMins += fill;
    result.satFillHoursW = fill / 60;
    const rem = _satMins - fill;
    _satHolW = Math.min(rem / 60, 8);       // 토요일 휴일기본(≤8h) — 연장과 이중계산 방지
    _satHolOtW = Math.max(0, (rem / 60) - 8); // 토요일 휴일연장(>8h)
  }
  result.weekStatHoursW = _totalStatMins / 60;
  result.satHolHoursW = _satHolW;

  result.satHolHours = Math.round(_satHolW * WEEKS_PER_MONTH * 10) / 10;
  result.satHolOtHours = Math.round(_satHolOtW * WEEKS_PER_MONTH * 10) / 10;
  result.sunHolHours = Math.round(_sunHolMins / 60 * WEEKS_PER_MONTH * 10) / 10;
  result.sunHolOtHours = Math.round(_sunHolOtMins / 60 * WEEKS_PER_MONTH * 10) / 10;

  result.holHours = Math.round((result.satHolHours + result.satHolOtHours + result.sunHolHours + result.sunHolOtHours) * 10) / 10;
  result.holOtHours = Math.round((result.satHolOtHours + result.sunHolOtHours) * 10) / 10;
  result.otHolHours = result.holOtHours;

  result.otRegularHours = Math.round(result.otRegularHours * 10) / 10;
  result.nightHours = Math.round(result.nightHours * 10) / 10;
  result.nightWdayHours = Math.round(result.nightWdayHours * 10) / 10;
  result.nightSunHours = Math.round(result.nightSunHours * 10) / 10;
  result.otHours = Math.round(result.otRegularHours * 10) / 10;

  return result;
}

// ── schedule 특정 날짜 요일 시각 조회 (조퇴/지각용) ──
function getScheduleTimeForDate(dateStr, scheduleJson, field, fallback) {
  const [fbH, fbM] = (fallback || '09:00').split(':').map(Number);
  const fallbackObj = { hour: fbH || 9, minute: fbM || 0 };
  if (!dateStr || !scheduleJson) return fallbackObj;
  let sched;
  try { sched = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson; }
  catch (e) { return fallbackObj; }
  if (!Array.isArray(sched) || !sched.length) return fallbackObj;
  const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const d = new Date(dateStr + 'T00:00:00');
  const dayKey = dayMap[d.getDay()] || 'mon';
  const daySched = sched.find(s => s.day === dayKey && (s.active === true || s.active === 1 || s.active === 'true'));
  if (!daySched) return fallbackObj;
  const raw = (Array.isArray(daySched.shifts) && daySched.shifts.length > 0) ? daySched.shifts[0] : daySched;
  const timeStr = raw[field] || '';
  if (!timeStr) return fallbackObj;
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h || 9, minute: m || 0 };
}

function _readJSON(v) { try { return JSON.parse(v || '[]'); } catch (e) { return []; } }

// 무단조퇴 시간 합계
function calcEarlyLeaveHours(p, scheduleJson) {
  let total = 0;
  let data = _readJSON(p.earlyleave_data);
  const retro = _readJSON(p.retro_earlyleave_data);
  if (Array.isArray(retro) && retro.length) data = data.concat(retro);
  else if (retro && retro.count > 0) { for (let i = 0; i < retro.count; i++) data.push({ time: '17:00' }); }
  if (!data.length) return 0;
  for (const d of data) {
    if (!d.time) continue;
    const [h, m] = d.time.split(':').map(Number);
    const leaveMin = h * 60 + (m || 0);
    const endTime = getScheduleTimeForDate(d.date, scheduleJson, 'end', '18:00');
    const endMin = endTime.hour * 60 + endTime.minute;
    if (leaveMin < endMin) total += (endMin - leaveMin) / 60;
  }
  return Math.round(total * 10) / 10;
}

// 무단지각 시간 합계
function calcLateHours(p, scheduleJson) {
  let total = 0;
  let data = _readJSON(p.late_data);
  const retro = _readJSON(p.retro_late_data);
  if (Array.isArray(retro) && retro.length) data = data.concat(retro);
  else if (retro && retro.count > 0) { for (let i = 0; i < retro.count; i++) data.push({ time: '10:00' }); }
  if (!data.length) return 0;
  for (const d of data) {
    if (!d.time) continue;
    const [h, m] = d.time.split(':').map(Number);
    const arriveMin = h * 60 + (m || 0);
    const startTime = getScheduleTimeForDate(d.date, scheduleJson, 'start', '09:00');
    const startMin = startTime.hour * 60 + startTime.minute;
    if (arriveMin > startMin) total += (arriveMin - startMin) / 60;
  }
  return Math.round(total * 10) / 10;
}

// ── 계약 조회 (payroll-core openPayslipModal 로직) ──
function findContract(empId, payYear, payMonth, contracts) {
  const monthStart = `${payYear}-${pad(payMonth)}-01`;
  const monthEnd = `${payYear}-${pad(payMonth)}-${pad(lastDayOfMonth(payYear, payMonth))}`;
  const empContracts = contracts.filter(c =>
    c.employee_id === empId && !c.is_draft && !c.is_voided_by_amend && c.status !== 'voided'
  );
  let ct = empContracts.find(c => {
    const s = c.contract_start || '';
    const ed = c.contract_end || '';
    if (s && s > monthEnd) return false;
    if (ed && ed < monthStart) return false;
    return true;
  }) || null;
  if (!ct && empContracts.length > 0) {
    ct = empContracts.slice().sort((a, b) => (b.contract_start || '').localeCompare(a.contract_start || ''))[0];
  }
  return ct;
}

// ── 고정근로시간 (getPIFixedHours 로직) ──
function getFixedHours(ct) {
  if (!ct) return { otHours: 0, nightHours: 0, holHours: 0 };
  if (ct.schedule_json) {
    const r = calcFixedHoursFromSchedule(ct.schedule_json);
    return { otHours: r.otHours, nightHours: r.nightHours, holHours: r.holHours };
  }
  return {
    otHours: parseFloat(ct.fixed_ot_hours) || 0,
    nightHours: parseFloat(ct.fixed_night_hours) || 0,
    holHours: parseFloat(ct.fixed_hol_hours) || 0,
  };
}

// ── 총 근로시간 (calcPITotalHours 로직) ──
function computeTotalHours(p, ct) {
  const workDays = parseFloat(p.work_days) || 0;
  const otH = parseFloat(p.overtime_hours) || 0;
  const nightH = parseFloat(p.night_hours) || 0;
  const holH = parseFloat(p.holiday_hours) || 0;
  const hpd = ct ? (parseFloat(ct.work_hours_per_day) || 8) : 8;
  const fixed = getFixedHours(ct);
  const basicHours = workDays * hpd;
  const earlyLeave = calcEarlyLeaveHours(p, ct ? ct.schedule_json : null);
  const late = calcLateHours(p, ct ? ct.schedule_json : null);
  const total = basicHours + fixed.otHours + fixed.nightHours + fixed.holHours
    + otH + nightH + holH - earlyLeave - late;
  return Math.round(total * 10) / 10 || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 실행
// ═══════════════════════════════════════════════════════════════════════════
const allPayrolls = db.prepare(`
  SELECT p.*, e.name AS emp_name FROM payrolls p
  LEFT JOIN employees e ON e.id = p.employee_id
  ORDER BY p.pay_year, p.pay_month, p.employee_id
`).all();
const allContracts = db.prepare(`SELECT * FROM contracts`).all();

let targets = allPayrolls;
if (ONLY_NULL) {
  targets = targets.filter(p => p.total_work_hours == null || p.total_work_hours === '');
}

let changed = 0, unchanged = 0, noContract = 0, applied = 0;
const changeRows = [];

for (const p of targets) {
  const ct = findContract(p.employee_id, p.pay_year, p.pay_month, allContracts);
  if (!ct) noContract++;
  const computed = computeTotalHours(p, ct);
  const cur = p.total_work_hours;
  const curNum = (cur == null || cur === '') ? null : Math.round(parseFloat(cur) * 10) / 10;
  if (curNum === computed) { unchanged++; continue; }
  changed++;
  changeRows.push({
    id: p.id, name: p.emp_name || p.employee_id,
    period: `${p.pay_year}-${pad(p.pay_month)}`,
    workDays: p.work_days, cur: cur, computed,
  });
  if (APPLY) {
    db.prepare(`UPDATE payrolls SET total_work_hours = ?, updated_at = ? WHERE id = ?`).run(computed, Date.now(), p.id);
    applied++;
  }
}

console.log(`대상: ${targets.length}건 | 변경 예정: ${changed} | 동일(변경 없음): ${unchanged} | 계약 없음: ${noContract}`);
if (APPLY) console.log(`✔ 실제 반영: ${applied}건`);

// 변경 예정 목록 (최대 30건 출력)
changeRows.slice(0, 30).forEach(r => {
  console.log(`  [${r.period}] ${r.name} (근로일수 ${r.workDays})  ${r.cur ?? '(null)'} → ${r.computed}h`);
});
if (changeRows.length > 30) console.log(`  ... 외 ${changeRows.length - 30}건`);

if (!APPLY) console.log('\n※ dry-run 결과입니다. 실제 반영하려면 --apply 를 추가하세요.');
