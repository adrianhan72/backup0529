/**
 * audit-payslip-consistency.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 급여명세서에 표시되는 모든 데이터를 산식 기준으로 검산한다.
 *
 * 검증 항목:
 *   A. 지급총액  = Σ 표시 지급 항목 (base/주휴/수당/연장야간휴일/비정기/커스텀)
 *   B. 공제합계  = Σ 공제 항목 (소득세+지방+4대보험+연말정산+건강정산+기타)
 *   C. 실수령액  = 지급총액 − 공제합계
 *   D. 4대보험 개별 공식 (standard_monthly_pay 기준, 적용제외 고려)
 *   E. 모달 자체 정합화 트리거 여부 (|저장 공제합계 − 재계산| > 50)
 *
 * 사용법: node scripts/audit-payslip-consistency.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH, { readonly: true });

// ── 요율 (payroll-input-main.js _getPIRates) ──
const PENSION_RATE = 0.045;
const PENSION_CAP = 6370000;
const HEALTH_RATE = 0.03545;
const LTCARE_RATE = 0.1295;
const EMPLOY_RATE = 0.009;
const TOL = 50; // 모달이 사용하는 정합화 허용오차

function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function round1(n) { return Math.round(n * 10) / 10; }
function sumJsonAmounts(json) {
  let arr = [];
  try { arr = typeof json === 'string' ? JSON.parse(json) : (json || []); } catch (e) { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  return arr.reduce((s, v) => s + (num(v && v.amount) || 0), 0);
}

const cols = db.prepare(`PRAGMA table_info(payrolls)`).all().map(c => c.name);

// 페이롤 전건 + 직원명
const payrolls = db.prepare(`
  SELECT p.*, e.name AS emp_name FROM payrolls p
  LEFT JOIN employees e ON e.id = p.employee_id
  ORDER BY p.pay_year, p.pay_month, p.employee_id
`).all();

const has = (c) => cols.includes(c);

// ═══════════ 집계 ═══════════
const stat = {
  total: payrolls.length,
  A: { checked: 0, ok: 0, deltaSum: 0, over100: 0, over1000: 0, samples: [] },
  B: { checked: 0, ok: 0, over50: 0, samples: [] },
  C: { checked: 0, ok: 0, over50: 0, samples: [] },
  D: { health: 0, pension: 0, ltcare: 0, employ: 0, healthBad: 0, pensionBad: 0, ltcareBad: 0, employBad: 0 },
  E: { triggered: 0 },
};

const samples = [];

for (const p of payrolls) {
  const id = p.id, name = p.emp_name || p.employee_id;
  const period = `${p.pay_year}-${String(p.pay_month).padStart(2, '0')}`;

  // ── A. 지급총액 검증 ──
  const paySum =
    num(p.base_salary) + num(p.weekly_holiday_pay) +
    num(p.position_allowance) + num(p.site_allowance) +
    num(p.transportation_allowance || p.car_maintenance) + num(p.self_driving_allowance) +
    num(p.remote_area_allowance) + num(p.meal_allowance) + num(p.childcare_allowance) +
    num(p.research_allowance) + num(p.skill_allowance) + num(p.license_allowance) + num(p.hazard_allowance) +
    num(p.overtime_pay) + num(p.night_pay) + num(p.holiday_pay) +
    num(p.annual_leave_pay) + num(p.bonus_pay) + num(p.performance_pay) + num(p.actual_expense_pay) +
    num(p.communication_pay) + num(p.fitness_allowance) + num(p.self_dev_allowance) +
    num(p.book_allowance) + num(p.overseas_allowance) +
    num(p.severance_interim_pay) + (num(p.etc_allowance) + num(p.other_pay)) +
    sumJsonAmounts(p.custom_ordinary_values) + sumJsonAmounts(p.custom_fixed_values) + sumJsonAmounts(p.etc_allowance_items);

  const gross = num(p.gross_pay);
  const aDelta = gross - paySum;
  stat.A.checked++;
  if (Math.abs(aDelta) <= TOL) stat.A.ok++;
  stat.A.deltaSum += Math.abs(aDelta);
  if (Math.abs(aDelta) > 100) { stat.A.over100++; if (Math.abs(aDelta) > 1000) stat.A.over1000++; }
  if (Math.abs(aDelta) > TOL && samples.length < 25) {
    samples.push({ check: 'A-지급총액', period, name, gross, paySum, delta: aDelta });
  }

  // ── B. 공제합계 검증 ──
  let dedSum =
    num(p.income_tax) + num(p.local_income_tax) +
    num(p.health_insurance) + num(p.long_term_care) + num(p.national_pension) + num(p.employment_insurance) +
    num(p.year_end_tax_adjust) + num(p.health_insurance_adjust) + num(p.advance_deduction);
  if (has('health_insurance_adjust_yearend')) dedSum += num(p.health_insurance_adjust_yearend);
  if (has('ltcare_adjust_yearend')) dedSum += num(p.ltcare_adjust_yearend);

  const storedDed = num(p.total_deduction);
  const bDelta = storedDed - dedSum;
  stat.B.checked++;
  if (Math.abs(bDelta) <= TOL) stat.B.ok++; else stat.B.over50++;
  if (Math.abs(bDelta) > TOL && samples.length < 25) {
    samples.push({ check: 'B-공제합계', period, name, storedDed, dedSum, delta: bDelta });
  }

  // ── E. 모달 정합화 트리거 ──
  if (Math.abs(storedDed - dedSum) > TOL) stat.E.triggered++;

  // ── C. 실수령액 검증 (모달 정합화 로직과 동일) ──
  const reconciledDed = Math.abs(storedDed - dedSum) > TOL ? dedSum : storedDed;
  const expectedNet = gross - reconciledDed;
  const storedNet = num(p.net_pay);
  const cDelta = storedNet - expectedNet;
  stat.C.checked++;
  if (Math.abs(cDelta) <= TOL) stat.C.ok++; else stat.C.over50++;
  if (Math.abs(cDelta) > TOL && samples.length < 25) {
    samples.push({ check: 'C-실수령액', period, name, storedNet, expectedNet, delta: cDelta });
  }

  // ── D. 4대보험 개별 공식 (std 기준, 단순 비교 — 적용제외로 인한 차이는 보고에서 설명) ──
  const std = num(p.standard_monthly_pay) || gross;
  if (std > 0 && has('health_insurance')) {
    const h = num(p.health_insurance);
    const hExp = Math.round(std * HEALTH_RATE);
    stat.D.health++;
    if (h > 0 && Math.abs(h - hExp) > TOL) { stat.D.healthBad++; if (samples.length < 25) samples.push({ check: 'D-건강보험', period, name, std, stored: h, expected: hExp }); }
    const pen = num(p.national_pension);
    const penExp = Math.round(Math.min(std, PENSION_CAP) * PENSION_RATE);
    stat.D.pension++;
    if (pen > 0 && Math.abs(pen - penExp) > TOL) { stat.D.pensionBad++; if (samples.length < 25) samples.push({ check: 'D-국민연금', period, name, std, stored: pen, expected: penExp }); }
    const lt = num(p.long_term_care);
    const ltExp = Math.round(h * LTCARE_RATE);
    stat.D.ltcare++;
    if (lt > 0 && h > 0 && Math.abs(lt - ltExp) > TOL) { stat.D.ltcareBad++; if (samples.length < 25) samples.push({ check: 'D-장기요양', period, name, stored: lt, expected: ltExp }); }
    const emp = num(p.employment_insurance);
    const empExp = Math.round(std * EMPLOY_RATE);
    stat.D.employ++;
    if (emp > 0 && Math.abs(emp - empExp) > TOL) { stat.D.employBad++; if (samples.length < 25) samples.push({ check: 'D-고용보험', period, name, std, stored: emp, expected: empExp }); }
  }
}

// ═══════════ 출력 ═══════════
const pct = (a, b) => b ? `${(a / b * 100).toFixed(1)}%` : '-';
console.log('=== 급여명세서 데이터 산식 검산 결과 ===');
console.log(`전체 페이롤: ${stat.total}건`);
console.log('');
console.log(`[A] 지급총액 = Σ 지급항목`);
console.log(`    검증 ${stat.A.checked}건 | 일치 ${stat.A.ok}건 (${pct(stat.A.ok, stat.A.checked)}) | 불일치(>50) ${stat.A.checked - stat.A.ok}건`);
console.log(`    평균 |Δ| = ${(stat.A.deltaSum / stat.A.checked).toFixed(1)}원 | >100원: ${stat.A.over100}건 | >1000원: ${stat.A.over1000}건`);
console.log('');
console.log(`[B] 공제합계 = Σ 공제항목`);
console.log(`    검증 ${stat.B.checked}건 | 일치 ${stat.B.ok}건 (${pct(stat.B.ok, stat.B.checked)}) | 불일치(>50) ${stat.B.over50}건`);
console.log('');
console.log(`[C] 실수령액 = 지급총액 − 공제합계`);
console.log(`    검증 ${stat.C.checked}건 | 일치 ${stat.C.ok}건 (${pct(stat.C.ok, stat.C.checked)}) | 불일치(>50) ${stat.C.over50}건`);
console.log('');
console.log(`[E] 모달 정합화 트리거(저장 공제합계 ≠ 재계산, >50): ${stat.E.triggered}건`);
console.log('');
console.log(`[D] 4대보험 개별 공식 (std 기준, 0원 제외·적용제외 미반영)`);
console.log(`    건강보험: 이상 ${stat.D.healthBad}/${stat.D.health} | 국민연금: 이상 ${stat.D.pensionBad}/${stat.D.pension} | 장기요양: 이상 ${stat.D.ltcareBad}/${stat.D.ltcare} | 고용보험: 이상 ${stat.D.employBad}/${stat.D.employ}`);
console.log('    ※ 대표자/등기임원/단시간(<15h)/일용 8일미만/고정액 기준 회사는 적용제외·차등 요율이라 정상적으로 다를 수 있음');
console.log('');
console.log('=== 불일치 샘플 (최대 25건) ===');
if (!samples.length) console.log('  (없음 — 모든 데이터가 산식과 일치)');
samples.forEach(s => console.log('  ' + JSON.stringify(s)));
