// ────────────────────────────────────────────────────────────────────────────
// 고정수당 전수감사: 2026-08-14 산식(토·일 휴일화 + 40h 충당) 기준 재계산
// contracts.fixed_ot/night/hol_hours·pay 를 schedule_json에서 재계산해
// 저장값과 다른 경우 교체한다. (payrolls는 고정수당을 분리 저장하지 않음 → 감사 보고만)
// ────────────────────────────────────────────────────────────────────────────
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);
const W = 365 / 12 / 7;
const STATUTORY_DAILY = 8 * 60;
const STATUTORY_WEEKLY = 40 * 60;
const NIGHT_START = 22 * 60, NIGHT_END = 30 * 60;

const _round1 = v => Math.round(v * 10) / 10;
const _parseTime = t => { const m = (t || '').match(/^(\d{1,2}):(\d{2})$/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null; };

// ── 브라우저 _calcFixedHoursFromSchedule 의 주간(weekly) 포트 ──
function calcWeekly(sched) {
  const r = {
    otW: 0,            // 평일연장 (주간)
    wdayNightW: 0,     // 평일야간 (주간)
    satHolW: 0,        // 토요일 휴일 잔여 (주간, 40h 충당 후)
    sunHolW: 0,        // 일요일 휴일 (주간)
    holOtW: 0,         // 휴일연장 (주간)
    nightSunW: 0,      // 휴일야간 (주간)
  };
  if (!Array.isArray(sched) || !sched.length) return r;

  let totalStatMins = 0, satMins = 0, sunHolMins = 0, sunHolOtMins = 0;
  sched.forEach(d => {
    if (!d.active) return;
    const isHoliday = d.day === 'sun' || d.day === 'sat';
    const isSat = d.day === 'sat';
    let dayMins = 0, dayNightMins = 0;

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
        r.otW += dailyOtMin / 60;
        totalStatMins += Math.min(workMin, STATUTORY_DAILY);
      }

      // 야간 (22:00~06:00)
      const s = startMin, e = endMin;
      let nightOverlap = Math.max(0, Math.min(e, NIGHT_END) - Math.max(s, NIGHT_START))
                       + Math.max(0, Math.min(e, NIGHT_END + 24 * 60) - Math.max(s, NIGHT_START + 24 * 60));
      let nightBrk = 0;
      (sh.breaks || []).forEach(b => {
        if (!b.s || !b.e) return;
        const bs = _parseTime(b.s), be = _parseTime(b.e);
        if (bs === null || be === null) return;
        let be2 = be;
        if (be2 <= bs) be2 += 24 * 60;
        nightBrk += Math.max(0, Math.min(be2, NIGHT_END) - Math.max(bs, NIGHT_START))
                  + Math.max(0, Math.min(be2, NIGHT_END + 24 * 60) - Math.max(bs, NIGHT_START + 24 * 60));
      });
      const nightMin = Math.max(0, nightOverlap - nightBrk);
      if (isHoliday) r.nightSunW += nightMin / 60;
      else { dayNightMins += nightMin; r.wdayNightW += nightMin / 60; }
      void dayNightMins;
    });

    if (isHoliday && dayMins > 0) {
      if (isSat) satMins += dayMins;
      else { sunHolMins += Math.min(dayMins, STATUTORY_DAILY); sunHolOtMins += Math.max(0, dayMins - STATUTORY_DAILY); }
    }
  });

  // 주 40h 초과 → 연장 이관
  if (totalStatMins > STATUTORY_WEEKLY) {
    r.otW += (totalStatMins - STATUTORY_WEEKLY) / 60;
    totalStatMins = STATUTORY_WEEKLY;
  }

  // 토요일 40h 미달 충당 (1일 8h 한도)
  if (satMins > 0) {
    const gap = Math.max(0, STATUTORY_WEEKLY - totalStatMins);
    const fill = Math.min(satMins, gap, STATUTORY_DAILY);
    const rem = satMins - fill;
    r.satHolW = rem / 60;
    r.holOtW += Math.max(0, rem / 60 - 8);
  }
  r.sunHolW = (sunHolMins + sunHolOtMins) / 60; // 일요일 전체(휴일연장 포함, 병합 표시용)
  r.holOtW += sunHolOtMins / 60;

  return r;
}

// ── 5인 미만 판별 포트 (현재 월 기준) ──
function isSmallBiz(companyId) {
  const now = new Date();
  const yr = now.getFullYear(), mo = now.getMonth() + 1;
  const co = db.prepare('select representatives from companies where id=?').get(companyId);
  const excluded = new Set();
  if (co && co.representatives) {
    try {
      const reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : (co.representatives || []);
      (Array.isArray(reps) ? reps : []).forEach(r => { if (r.name) excluded.add(r.name); });
    } catch (e) {}
  }
  for (const ex of db.prepare('select company_id, name from registered_executives').all()) {
    if (ex.company_id === companyId && ex.name) excluded.add(ex.name);
  }
  for (const rp of db.prepare('select company_id, name from related_party_workers').all()) {
    if (rp.company_id === companyId && rp.name) excluded.add(rp.name);
  }
  const repIds = new Set();
  for (const e of db.prepare('select id, company_id, name, is_representative from employees').all()) {
    if (e.company_id === companyId && (e.is_representative || excluded.has(e.name))) repIds.add(e.id);
  }

  const VALID = new Set(['active', 'docs_incomplete', 'terminate_pending']);
  const monthStart = new Date(yr, mo - 1, 1), monthEnd = new Date(yr, mo, 0);
  const totalDays = monthEnd.getDate();
  const empMap = new Map();
  db.prepare('select * from contracts').all()
    .filter(c => c.company_id === companyId && !c.is_draft && !c.is_voided_by_amend && VALID.has(c.status) && !repIds.has(c.employee_id))
    .sort((a, b) => (b.contract_start || '').localeCompare(a.contract_start || ''))
    .forEach(c => { if (!empMap.has(c.employee_id)) empMap.set(c.employee_id, c); });

  const dayWorkers = new Array(totalDays + 1).fill(0);
  empMap.forEach(c => {
    let cs = c.contract_start ? new Date(c.contract_start) : monthStart;
    if (isNaN(cs.getTime())) cs = monthStart;
    let ce = c.status === 'terminate_pending' ? (c.terminate_date ? new Date(c.terminate_date) : monthEnd)
             : (c.contract_end ? new Date(c.contract_end) : monthEnd);
    if (isNaN(ce.getTime())) ce = monthEnd;
    for (let d = 1; d <= totalDays; d++) {
      const day = new Date(yr, mo - 1, d);
      if (day >= cs && day <= ce) dayWorkers[d]++;
    }
  });
  let operDays = 0, daysOver5 = 0, totalPersonDays = 0;
  for (let d = 1; d <= totalDays; d++) {
    if (dayWorkers[d] > 0) { operDays++; totalPersonDays += dayWorkers[d]; if (dayWorkers[d] >= 5) daysOver5++; }
  }
  if (operDays === 0) return true;
  const headcount = totalPersonDays / operDays;
  const specialOver5 = daysOver5 > operDays / 2;
  const specialUnder5 = headcount >= 5 && (operDays - daysOver5) > operDays / 2;
  return specialUnder5 ? true : (headcount < 5 && !specialOver5);
}

// ── 수습 시급 반영 hw ──
function effectiveHw(c) {
  let hw = parseFloat(c.hourly_wage) || 0;
  const probAmt = parseFloat(c.probation_amt) || 0;
  if (probAmt > 0) {
    const pct = parseFloat(c.probation_pct) || 0;
    const basis = c.probation_basis || 'salary';
    if (basis === 'direct' || (pct > 0 && pct < 100)) hw = Math.round(probAmt / 209);
  }
  return hw;
}

// ── 메인 ──
const rows = db.prepare("select * from contracts where schedule_json is not null and schedule_json != '' and schedule_json != '[]' and (is_draft is null or is_draft != 1)").all();
let changed = 0, checked = 0, skipped = 0;
const report = [];
const upd = db.prepare('update contracts set fixed_ot_hours=?, fixed_night_hours=?, fixed_hol_hours=?, fixed_ot_pay=?, fixed_night_pay=?, fixed_hol_pay=? where id=?');

for (const c of rows) {
  let sched;
  try { sched = typeof c.schedule_json === 'string' ? JSON.parse(c.schedule_json) : c.schedule_json; }
  catch (e) { skipped++; continue; }
  if (!Array.isArray(sched) || !sched.length) { skipped++; continue; }
  const hw = effectiveHw(c);
  if (hw <= 0) { skipped++; continue; }

  const w = calcWeekly(sched);
  const isSmall = isSmallBiz(c.company_id);
  const mult = { ot: isSmall ? 1.0 : 1.5, night: isSmall ? 0.0 : 0.5, hol: isSmall ? 1.0 : 1.5, holOt: isSmall ? 1.0 : 2.0 };

  // 저장 규칙과 동일하게 산출
  const holTotalW = w.satHolW + w.sunHolW; // 병합 (휴일연장 포함)
  const holOtW = w.holOtW;
  const nightSunW = w.nightSunW;

  const fixedOtH = Math.round(w.otW * W);
  const fixedNightH = Math.round(w.wdayNightW * W);
  const fixedHolH = Math.round(holTotalW * W);

  const mOt = _round1(w.otW * W);
  const mNight = _round1(w.wdayNightW * W);
  const mHol = _round1(holTotalW * W);
  const mHolOt = _round1(holOtW * W);
  const mHolNi = _round1(nightSunW * W);
  const fixedOtPay = Math.round(hw * mOt * mult.ot);
  const fixedNightPay = Math.round(hw * mNight * mult.night);
  const fixedHolPay = Math.round(hw * Math.max(0, mHol - mHolOt) * mult.hol + hw * mHolOt * mult.holOt + hw * mHolNi * mult.night);

  const old = {
    otH: c.fixed_ot_hours || 0, niH: c.fixed_night_hours || 0, hoH: c.fixed_hol_hours || 0,
    otP: c.fixed_ot_pay || 0, niP: c.fixed_night_pay || 0, hoP: c.fixed_hol_pay || 0,
  };
  const nw = { otH: fixedOtH, niH: fixedNightH, hoH: fixedHolH, otP: fixedOtPay, niP: fixedNightPay, hoP: fixedHolPay };
  checked++;

  const differs = old.otH !== nw.otH || old.niH !== nw.niH || old.hoH !== nw.hoH || old.otP !== nw.otP || old.niP !== nw.niP || old.hoP !== nw.hoP;
  if (!differs) continue;

  changed++;
  upd.run(nw.otH, nw.niH, nw.hoH, nw.otP, nw.niP, nw.hoP, c.id);
  report.push({
    id: c.id, co: c.company_id, emp: c.employee_id, isSmall,
    otH: `${old.otH}→${nw.otH}`, niH: `${old.niH}→${nw.niH}`, hoH: `${old.hoH}→${nw.hoH}`,
    otP: `${old.otP}→${nw.otP}`, niP: `${old.niP}→${nw.niP}`, hoP: `${old.hoP}→${nw.hoP}`,
  });
}

console.log(JSON.stringify({ checked, changed, skipped, report }, null, 1));
