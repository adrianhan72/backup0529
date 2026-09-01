/**
 * fix-monthly-agreed.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 모든 근로계약(contracts)의 월 약정임금(monthly_salary_agreed) 및
 * 급여구성 표에 표시되는 파생값(기본급 base_salary / 주휴수당 weekly_holiday_pay /
 * 정규직 연봉 annual_salary)을 현재 자동계산 공식 기준으로 재계산·보정한다.
 *
 *   기본급  = round(통상시급 × 209h)                              [MAGIC.MONTHLY_STD_HOURS]
 *   주휴수당 = round(통상시급 × round(1일소정근로시간 × 365 ÷ 12 ÷ 7))
 *   월 약정임금 = 기본급 + 각종 수당 + 고정OT/야간/휴일
 *     - 항상 포함(통상임금): site/position/skill/license/hazard/remote_area/regular_bonus
 *     - pay_type='fixed'만: car/meal/research/communication/fitness/self_dev/book/overseas
 *     - 커스텀 통상임금(custom_ordinary_values) 합산
 *     - 고정 연장/야간/휴일(fixed_ot_pay+fixed_night_pay+fixed_hol_pay)
 *   일용직: base_salary=0, monthly_salary_agreed=0 (저장 로직과 동일)
 *   정규직·정규직 수습: annual_salary = 월 약정임금 × 12 (자동계산)
 *
 * 참고: 주휴수당(시급×월주휴시간)은 209h(174h 기본 + 35h 주휴)에 이미 포함되어
 *       월 약정임금에는 별도 합산하지 않는다 (calcContractSalary와 동일).
 *
 * 사용법
 *   node scripts/fix-monthly-agreed.js           # dry-run (변경 예정 통계 + 예시)
 *   node scripts/fix-monthly-agreed.js --apply   # 실제 반영
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const APPLY = process.argv.includes('--apply');

const MONTHLY_STD_HOURS = 209;

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// pay_type 가변 항목 (통상임금 제외 고정수당) — 'fixed'만 월 약정임금 합산
const SELECTABLE = [
  ['transportation_allowance', 'transportation_pay_type'], // car
  ['meal_allowance',            'meal_pay_type'],
  ['research_allowance',        'research_pay_type'],
  ['communication_allowance',   'communication_pay_type'],
  ['fitness_allowance',         'fitness_pay_type'],
  ['self_dev_allowance',        'self_dev_pay_type'],
  ['book_allowance',            'book_pay_type'],
  ['overseas_allowance',        'overseas_pay_type'],
];
// 항상 포함 (통상임금 포함 고정수당)
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

/** 현재 자동계산 공식 기준 보정값 계산 */
function calcCorrect(c){
  const hourly = num(c.hourly_wage);
  const hpd    = num(c.work_hours_per_day) || 8;
  const type   = (c.contract_type || '').toLowerCase();
  const isDaily = type === 'daily';
  const isRegular = REGULAR_TYPES.includes(type);

  if (isDaily){
    return { base: 0, weeklyHol: num(c.weekly_holiday_pay), monthly: 0, annual: num(c.annual_salary) };
  }

  const base = Math.round(hourly * MONTHLY_STD_HOURS);
  const weeklyHol = Math.round(hourly * Math.round(hpd * 365 / 12 / 7));

  let monthly = base;
  for (const col of ALWAYS) monthly += num(c[col]);
  for (const [amtCol, payCol] of SELECTABLE){
    if ((c[payCol] || '') === 'fixed') monthly += num(c[amtCol]);
  }
  monthly += customOrdinarySum(c);
  monthly += num(c.fixed_ot_pay) + num(c.fixed_night_pay) + num(c.fixed_hol_pay);

  // 정규직·정규직 수습: 연봉 = 월 약정임금 × 12
  const annual = isRegular ? monthly * 12 : num(c.annual_salary);

  return { base, weeklyHol, monthly, annual };
}

// ── 전수 조사 ──
const contracts = db.prepare(`
  SELECT c.*, e.name AS employee_name
  FROM contracts c
  LEFT JOIN employees e ON e.id = c.employee_id
  ORDER BY c.created_at ASC
`).all();

const stats = { monthly: 0, base: 0, weeklyHol: 0, annual: 0, total: 0 };
const examples = [];
const dailyNonZeroMonthly = [];

for (const c of contracts){
  const corr = calcCorrect(c);
  const changed = {};

  const mDiff = num(c.monthly_salary_agreed) !== corr.monthly;
  const bDiff = num(c.base_salary)           !== corr.base;
  const wDiff = num(c.weekly_holiday_pay)    !== corr.weeklyHol;
  const aDiff = num(c.annual_salary)         !== corr.annual;

  if (mDiff){ stats.monthly++; changed.monthly = [num(c.monthly_salary_agreed), corr.monthly]; }
  if (bDiff){ stats.base++;    changed.base    = [num(c.base_salary), corr.base]; }
  if (wDiff){ stats.weeklyHol++; changed.weeklyHol = [num(c.weekly_holiday_pay), corr.weeklyHol]; }
  if (aDiff){ stats.annual++;  changed.annual  = [num(c.annual_salary), corr.annual]; }

  if ((c.contract_type || '').toLowerCase() === 'daily' && num(c.monthly_salary_agreed) !== 0){
    dailyNonZeroMonthly.push({ id: c.id, name: c.employee_name, monthly: num(c.monthly_salary_agreed) });
  }

  if (mDiff || bDiff || wDiff || aDiff){
    stats.total++;
    if (examples.length < 15){
      examples.push({ id: c.id, name: c.employee_name, type: c.contract_type, status: c.status, changed });
    }
  }

  if (APPLY && (mDiff || bDiff || wDiff || aDiff)){
    db.prepare('UPDATE contracts SET monthly_salary_agreed=?, base_salary=?, weekly_holiday_pay=?, annual_salary=?, updated_at=? WHERE id=?')
      .run(corr.monthly, corr.base, corr.weeklyHol, corr.annual, Date.now(), c.id);
  }
}

// ── 결과 출력 ──
console.log('=== fix-monthly-agreed.js ===');
console.log(`총 계약 수        : ${contracts.length}`);
console.log(`변경 대상 계약 수 : ${stats.total}${APPLY ? ' (적용됨)' : ' (dry-run)'}`);
console.log('');
console.log('항목별 불일치 건수:');
console.log(`  월 약정임금(monthly_salary_agreed) : ${stats.monthly}`);
console.log(`  기본급(base_salary)               : ${stats.base}`);
console.log(`  주휴수당(weekly_holiday_pay)      : ${stats.weeklyHol}`);
console.log(`  연봉(annual_salary)               : ${stats.annual}`);
console.log(`  일용직 monthly≠0                 : ${dailyNonZeroMonthly.length}`);
console.log('');

if (dailyNonZeroMonthly.length){
  console.log('⚠️ 일용직인데 monthly_salary_agreed≠0 → 0으로 보정 대상:');
  for (const d of dailyNonZeroMonthly.slice(0, 10)){
    console.log(`  - ${d.name} (${d.id}) : ${d.monthly.toLocaleString('ko-KR')}원`);
  }
  if (dailyNonZeroMonthly.length > 10) console.log(`  ... 외 ${dailyNonZeroMonthly.length - 10}건`);
  console.log('');
}

console.log('변경 예시 (최대 15건):');
for (const ex of examples){
  const parts = [];
  if (ex.changed.monthly)    parts.push(`월약정 ${ex.changed.monthly[0].toLocaleString('ko-KR')}→${ex.changed.monthly[1].toLocaleString('ko-KR')}`);
  if (ex.changed.base)       parts.push(`기본급 ${ex.changed.base[0].toLocaleString('ko-KR')}→${ex.changed.base[1].toLocaleString('ko-KR')}`);
  if (ex.changed.weeklyHol)  parts.push(`주휴 ${ex.changed.weeklyHol[0].toLocaleString('ko-KR')}→${ex.changed.weeklyHol[1].toLocaleString('ko-KR')}`);
  if (ex.changed.annual)     parts.push(`연봉 ${ex.changed.annual[0].toLocaleString('ko-KR')}→${ex.changed.annual[1].toLocaleString('ko-KR')}`);
  console.log(`  - [${ex.type}] ${ex.name} (${ex.id}) : ${parts.join(', ')}`);
}
if (examples.length === 0) console.log('  (불일치 없음 — 모든 계약이 현재 공식과 일치합니다.)');
console.log('');

if (!APPLY){
  console.log('실제 반영하려면: node scripts/fix-monthly-agreed.js --apply');
}
