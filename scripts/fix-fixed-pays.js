/**
 * fix-fixed-pays.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 근로계약(contracts)의 고정 연장/야간/휴일근로수당(fixed_ot/night/hol_hours·pay)을
 * 근무시간표(schedule_json)에서 재계산하고, 변경된 고정수당을 반영해
 * 월 약정임금(monthly_salary_agreed)·연봉(annual_salary)도 함께 보정한다.
 *
 *   배율: 폼의 _getLegalMultiplier 와 동일 — 고객사 premium_mode 기준
 *     'always' → 연장×1.5 · 야간×0.5 · 휴일≤8h×1.5 · 휴일>8h×2.0
 *     'none'   → 연장×1.0 · 야간×0.0 · 휴일≤8h×1.0 · 휴일>8h×1.0
 *   (기존 scripts/_audit_fix_fixed_formulas.js 는 isSmallBiz(인원수)로 판별하므로
 *    폼 계산과 다를 수 있어 premium_mode 기준으로 새로 작성)
 *
 *   시급: 수습 계약은 통상시급 × 수습비율(직접액÷월약정, 2026-09-01 규칙) — effectiveHw 참조
 *
 *   사용법
 *     node scripts/fix-fixed-pays.js           # dry-run
 *     node scripts/fix-fixed-pays.js --apply   # 실제 반영
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const APPLY = process.argv.includes('--apply');

const W = 365 / 12 / 7;                 // 4.345주/월
const MONTHLY_STD_HOURS = 209;
const STATUTORY_DAILY = 8 * 60;
const STATUTORY_WEEKLY = 40 * 60;
const NIGHT_START = 22 * 60, NIGHT_END = 30 * 60;

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const _round1 = v => Math.round(v * 10) / 10;
const _parseTime = t => { const m = (t || '').match(/^(\d{1,2}):(\d{2})$/); return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null; };

// ── 브라우저 calcWorkHours(contract-form.js) 의 주간 계산 faithful 포트 ──
// Pass1(요일별) → Pass1.5(토요일 40h 미달 충당) → 주 40h 상한 → 주간 시간 반환
// (토요일 휴일기본 ≤8h 분리 — 이중계산 없음)
function calcWeekly(sched){
  let totalStatMins = 0, totalOtMins = 0, totalHolMins = 0, totalHolOtMins = 0;
  let totalWdayNightMins = 0, totalSunNightMins = 0;
  const dayResults = {};

  sched.forEach(d => {
    if (!d.active){ dayResults[d.day] = { dayMins: 0 }; return; }
    const isHol = d.day === 'sun' || d.day === 'sat';
    let dayMins = 0, dayNightMins = 0;

    (d.shifts || []).forEach(sh => {
      if (!sh.start || !sh.end) return;
      const s = _parseTime(sh.start); let e = _parseTime(sh.end);
      if (s === null || e === null) return;
      if (e <= s) e += 24 * 60;

      let brk = 0;
      (sh.breaks || []).forEach(b => {
        if (!b.s || !b.e) return;
        const bs = _parseTime(b.s), be = _parseTime(b.e);
        if (bs === null || be === null) return;
        let bMin = be - bs; if (bMin <= 0) bMin += 24 * 60; brk += bMin;
      });
      const work = Math.max(0, e - s - brk);
      dayMins += work;

      const nightOverlap =
        Math.max(0, Math.min(e, NIGHT_END) - Math.max(s, NIGHT_START)) +
        Math.max(0, Math.min(e, NIGHT_END + 24 * 60) - Math.max(s, NIGHT_START + 24 * 60));
      let nightBrk = 0;
      (sh.breaks || []).forEach(b => {
        if (!b.s || !b.e) return;
        const bs = _parseTime(b.s), be = _parseTime(b.e);
        if (bs === null || be === null) return;
        let be2 = be; if (be2 <= bs) be2 += 24 * 60;
        nightBrk += Math.max(0, Math.min(be2, NIGHT_END) - Math.max(bs, NIGHT_START))
                  + Math.max(0, Math.min(be2, NIGHT_END + 24 * 60) - Math.max(bs, NIGHT_START + 24 * 60));
      });
      dayNightMins += Math.max(0, nightOverlap - nightBrk);
    });

    if (dayMins > 0){
      if (isHol){
        totalHolMins   += Math.min(dayMins, STATUTORY_DAILY);
        totalHolOtMins += Math.max(0, dayMins - STATUTORY_DAILY);
      } else {
        totalStatMins += Math.min(dayMins, STATUTORY_DAILY);
        totalOtMins   += Math.max(0, dayMins - STATUTORY_DAILY);
      }
      if (isHol) totalSunNightMins += dayNightMins;
      else       totalWdayNightMins += dayNightMins;
    }
    dayResults[d.day] = { dayMins, isHol };
  });

  // Pass 1.5: 토요일 40h 미달 충당 (주중 소정 합 < 40h → 토요일 근무를 소정으로, 1일 8h 한도)
  const satDr = dayResults['sat'];
  if (satDr && satDr.dayMins > 0 && totalStatMins < STATUTORY_WEEKLY){
    const gap = STATUTORY_WEEKLY - totalStatMins;
    const fill = Math.min(satDr.dayMins, gap, STATUTORY_DAILY);
    if (fill > 0){
      totalHolMins   -= Math.min(satDr.dayMins, STATUTORY_DAILY);
      totalHolOtMins -= Math.max(0, satDr.dayMins - STATUTORY_DAILY);
      totalStatMins  += fill;
      const rem = satDr.dayMins - fill;
      totalHolMins   += Math.min(rem, STATUTORY_DAILY);
      totalHolOtMins += Math.max(0, rem - STATUTORY_DAILY);
    }
  }

  // 주 40h 상한 → 초과분 연장 이관
  if (totalStatMins > STATUTORY_WEEKLY){
    totalOtMins   += totalStatMins - STATUTORY_WEEKLY;
    totalStatMins  = STATUTORY_WEEKLY;
  }

  return {
    weekOt:      totalOtMins / 60,          // 평일연장 (h/주)
    weekNight:   totalWdayNightMins / 60,   // 평일야간 (h/주)
    weekHolH:    totalHolMins / 60,         // 휴일기본 ≤8h (h/주)
    weekHolOt:   totalHolOtMins / 60,       // 휴일연장 >8h (h/주)
    weekSunNight: totalSunNightMins / 60,   // 휴일야간 (h/주)
  };
}

/** 수습 비율 반영 실질 시급 (2026-09-01 규칙: 통상시급 × 수습비율) */
function effectiveHw(c) {
  const hw = num(c.hourly_wage);
  if (hw <= 0) return 0;
  const probAmt = num(c.probation_amt);
  const basis = c.probation_basis || 'salary';
  if (probAmt > 0 && basis === 'direct') {
    const monthly = num(c.monthly_salary_agreed);
    if (monthly > 0) return Math.round(hw * probAmt / monthly);
  }
  const pct = num(c.probation_pct);
  if (pct > 0 && pct < 100) return Math.round(hw * pct / 100);
  return hw;
}

// ── 회사 premium_mode ──
const coMode = {};
for (const co of db.prepare('SELECT id, premium_mode FROM companies').all()) {
  coMode[co.id] = (co.premium_mode === 'always') ? 'always' : 'none';
}

// ── 수당 합산 정의 (fix-monthly-agreed.js 와 동일) ──
const SELECTABLE = [
  ['transportation_allowance', 'transportation_pay_type'],
  ['meal_allowance', 'meal_pay_type'],
  ['research_allowance', 'research_pay_type'],
  ['communication_allowance', 'communication_pay_type'],
  ['fitness_allowance', 'fitness_pay_type'],
  ['self_dev_allowance', 'self_dev_pay_type'],
  ['book_allowance', 'book_pay_type'],
  ['overseas_allowance', 'overseas_pay_type'],
];
const ALWAYS = [
  'site_allowance', 'position_allowance', 'skill_allowance', 'license_allowance',
  'hazard_allowance', 'remote_area_allowance', 'regular_bonus',
];
const REGULAR_TYPES = ['regular', 'regular_probation'];

function customOrdinarySum(c){
  let arr = [];
  try { arr = JSON.parse(c.custom_ordinary_values || '[]'); } catch (e) { arr = []; }
  return (Array.isArray(arr) ? arr : []).reduce((s, it) => s + num(it && it.amount), 0);
}

/** 월 약정임금 (base + 수당 + 고정수당) */
function calcMonthly(c, fixedExtra){
  const hourly = num(c.hourly_wage);
  const storedBase = num(c.base_salary);
  const base = storedBase > 0 ? storedBase : Math.round(hourly * MONTHLY_STD_HOURS);
  let monthly = base;
  for (const col of ALWAYS) monthly += num(c[col]);
  for (const [amtCol, payCol] of SELECTABLE) if ((c[payCol] || '') === 'fixed') monthly += num(c[amtCol]);
  monthly += customOrdinarySum(c);
  monthly += fixedExtra;
  return monthly;
}

// ── 전수 조사 ──
const contracts = db.prepare(`
  SELECT c.*, e.name AS employee_name
  FROM contracts c
  LEFT JOIN employees e ON e.id = c.employee_id
  WHERE (c.is_draft IS NULL OR c.is_draft != 1)
  ORDER BY c.created_at ASC
`).all();

let changed = 0, schedCount = 0;
const examples = [];
const upd = db.prepare(`UPDATE contracts SET
  fixed_ot_hours=?, fixed_night_hours=?, fixed_hol_hours=?,
  fixed_ot_pay=?, fixed_night_pay=?, fixed_hol_pay=?,
  base_salary=?, weekly_holiday_pay=?, monthly_salary_agreed=?, annual_salary=?, updated_at=?
  WHERE id=?`);

for (const c of contracts) {
  const type = (c.contract_type || '').toLowerCase();
  const isDaily = type === 'daily';
  const isRegular = REGULAR_TYPES.includes(type);

  // ── 고정수당: 근무시간표 기준 재계산 ──
  let fOtH, fNiH, fHoH, fOtP, fNiP, fHoP;
  let sched = null;
  try { sched = typeof c.schedule_json === 'string' ? JSON.parse(c.schedule_json) : c.schedule_json; } catch (e) { sched = null; }
  const hasSched = Array.isArray(sched) && sched.length > 0;

  if (hasSched && !isDaily){
    schedCount++;
    const hw = effectiveHw(c);
    if (hw > 0){
      const w = calcWeekly(sched);
      const always = coMode[c.company_id] === 'always';
      const mult = { overtime: always ? 1.5 : 1.0, night: always ? 0.5 : 0.0,
                     holiday_8h: always ? 1.5 : 1.0, holiday_8h_over: always ? 2.0 : 1.0 };
      const holTotalW = w.weekHolH + w.weekHolOt;   // 휴일기본+연장 (야간은 별도, 배율로 반영)
      // fixed_*_hours(월) = round(주당 × 4.345) — 저장(_weeklyToMonthlyHours)과 동일
      fOtH = Math.round(w.weekOt     * W);
      fNiH = Math.round(w.weekNight  * W);
      fHoH = Math.round(holTotalW    * W);
      // 통상시급에 곱할 값 n.m = round(주당 × 배율 × 4.345, 1) → 수당 = round(n.m × 시급) — 새 폼과 동일
      const mOt = _round1(w.weekOt       * mult.overtime     * W);
      const mNi = _round1(w.weekNight    * mult.night        * W);
      const mHo = _round1((w.weekHolH*mult.holiday_8h + w.weekHolOt*mult.holiday_8h_over + w.weekSunNight*mult.night) * W);
      fOtP = mOt > 0 ? Math.round(hw * mOt) : 0;
      fNiP = mNi > 0 ? Math.round(hw * mNi) : 0;
      fHoP = mHo > 0 ? Math.round(hw * mHo) : 0;
    } else {
      // 시급 산출 불가 → 고정수당 기존 값 유지 (0 덮어쓰기 금지 — 2026-09-01 규칙)
      fOtH = num(c.fixed_ot_hours); fNiH = num(c.fixed_night_hours); fHoH = num(c.fixed_hol_hours);
      fOtP = num(c.fixed_ot_pay);   fNiP = num(c.fixed_night_pay);   fHoP = num(c.fixed_hol_pay);
    }
  } else {
    // 스케줄 없음 또는 일용직 → 기존 저장값 유지
    fOtH = num(c.fixed_ot_hours); fNiH = num(c.fixed_night_hours); fHoH = num(c.fixed_hol_hours);
    fOtP = num(c.fixed_ot_pay);   fNiP = num(c.fixed_night_pay);   fHoP = num(c.fixed_hol_pay);
  }

  const fixedExtra = fOtP + fNiP + fHoP;

  // ── 파생값 ──
  let base, weeklyHol, monthly, annual;
  if (isDaily){
    base = 0;
    weeklyHol = num(c.weekly_holiday_pay);
    monthly = 0;
    annual = num(c.annual_salary);
  } else {
    const hourly = num(c.hourly_wage);
    if (hourly > 0) {
      const hpd = num(c.work_hours_per_day) || 8;
      base = Math.round(hourly * MONTHLY_STD_HOURS);
      weeklyHol = Math.round(hourly * Math.round(hpd * 365 / 12 / 7));
      monthly = calcMonthly(c, fixedExtra);
      annual = isRegular ? monthly * 12 : num(c.annual_salary);
    } else {
      // 시급 0/NULL → 파생값 재계산 금지 (기존 값 유지 — 2026-09-01 규칙)
      base = num(c.base_salary);
      weeklyHol = num(c.weekly_holiday_pay);
      monthly = num(c.monthly_salary_agreed);
      annual = num(c.annual_salary);
    }
  }

  const old = { fOtH: num(c.fixed_ot_hours), fNiH: num(c.fixed_night_hours), fHoH: num(c.fixed_hol_hours),
                fOtP: num(c.fixed_ot_pay), fNiP: num(c.fixed_night_pay), fHoP: num(c.fixed_hol_pay),
                base: num(c.base_salary), weeklyHol: num(c.weekly_holiday_pay),
                monthly: num(c.monthly_salary_agreed), annual: num(c.annual_salary) };
  const nw = { fOtH, fNiH, fHoH, fOtP, fNiP, fHoP, base, weeklyHol, monthly, annual };

  const differs =
    old.fOtH !== nw.fOtH || old.fNiH !== nw.fNiH || old.fHoH !== nw.fHoH ||
    old.fOtP !== nw.fOtP || old.fNiP !== nw.fNiP || old.fHoP !== nw.fHoP ||
    old.base !== nw.base || old.weeklyHol !== nw.weeklyHol ||
    old.monthly !== nw.monthly || old.annual !== nw.annual;

  if (!differs) continue;
  changed++;

  if (examples.length < 20){
    const parts = [];
    if (old.fOtP !== nw.fOtP) parts.push(`고정OT ${old.fOtP.toLocaleString('ko-KR')}→${nw.fOtP.toLocaleString('ko-KR')}`);
    if (old.fNiP !== nw.fNiP) parts.push(`야간 ${old.fNiP.toLocaleString('ko-KR')}→${nw.fNiP.toLocaleString('ko-KR')}`);
    if (old.fHoP !== nw.fHoP) parts.push(`휴일 ${old.fHoP.toLocaleString('ko-KR')}→${nw.fHoP.toLocaleString('ko-KR')}`);
    if (old.monthly !== nw.monthly) parts.push(`월약정 ${old.monthly.toLocaleString('ko-KR')}→${nw.monthly.toLocaleString('ko-KR')}`);
    if (old.base !== nw.base) parts.push(`기본급 ${old.base.toLocaleString('ko-KR')}→${nw.base.toLocaleString('ko-KR')}`);
    if (old.annual !== nw.annual) parts.push(`연봉 ${old.annual.toLocaleString('ko-KR')}→${nw.annual.toLocaleString('ko-KR')}`);
    examples.push(`  - [${c.contract_type}] ${c.employee_name} (${c.id}) : ${parts.join(', ')}`);
  }

  if (APPLY){
    upd.run(nw.fOtH, nw.fNiH, nw.fHoH, nw.fOtP, nw.fNiP, nw.fHoP,
            nw.base, nw.weeklyHol, nw.monthly, nw.annual, Date.now(), c.id);
  }
}

console.log('=== fix-fixed-pays.js ===');
console.log(`검토 계약(비임시저장) : ${contracts.length}`);
console.log(`근무시간표 보유(비일용) : ${schedCount}`);
console.log(`변경 대상 계약 수    : ${changed}${APPLY ? ' (적용됨)' : ' (dry-run)'}`);
console.log('');
if (examples.length) console.log('변경 예시:\n' + examples.join('\n'));
console.log('');
if (!APPLY) console.log('실제 반영하려면: node scripts/fix-fixed-pays.js --apply');
