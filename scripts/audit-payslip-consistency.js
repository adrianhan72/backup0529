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

// ── 요율 (insurance_rates 테이블 — 기간별 매칭, 없으면 2026 폴백) ──
const RATE_FALLBACK = {
  national_pension: { rate: 0.0475, cap: 6590000 },
  health:           { rate: 0.03595, cap: 0 },
  long_term_care:   { rate: 0.1314,  cap: 0 },
  employment:       { rate: 0.009,   cap: 0 },
};
const rateRows = db.prepare(`SELECT insurance_type, rate, cap_amount, period_start, period_end FROM insurance_rates`).all();
function rateFor(type, period){ // period = 'YYYY-MM'
  const pStart = period + '-01';
  const pEnd = period + '-31';
  let row = rateRows.filter(r => r.insurance_type === type
    && (!r.period_start || r.period_start <= pEnd)
    && (!r.period_end   || r.period_end   >= pStart)
  ).sort((a,b)=>(b.period_start||'').localeCompare(a.period_start||''))[0];
  if(!row){ // 해당 기간 없으면 기간 시작 이전 최신 폴백
    row = rateRows.filter(r => r.insurance_type === type && (!r.period_start || r.period_start <= pStart))
      .sort((a,b)=>(b.period_start||'').localeCompare(a.period_start||''))[0];
  }
  return row ? { rate: num(row.rate)/100, cap: num(row.cap_amount) } : RATE_FALLBACK[type];
}
// 확정액 기준(fixed_amount) 고객사 — 4대보험은 직접 입력이므로 D 검사 제외
const fixedBasisCoIds = new Set(
  db.prepare(`SELECT id FROM companies WHERE insurance_basis = 'fixed_amount'`).all().map(r => r.id)
);
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

// 일용직 직원 집합 — 사용 안 함 (주휴수당은 전 고용형태에서 참고값, gross 미가산 — 2026-09-11 확정)
const dailyEmpIds = new Set();

// 계약서 고정 연장/야간/휴일수당 — 지급총액은 항목 컬럼에 없고 계약서에서 표시되므로 합산한다 (2026-09-01)
const ctsByEmp = {};
for (const c of db.prepare(`SELECT employee_id, contract_start, contract_end, probation_months, probation_amt, probation_pct, probation_basis, monthly_salary_agreed, fixed_ot_pay, fixed_night_pay, fixed_hol_pay FROM contracts WHERE is_draft IS NULL OR is_draft != 1`).all()){
  (ctsByEmp[c.employee_id]=ctsByEmp[c.employee_id]||[]).push(c);
}
function _probRatioOf(c){
  const amt = num(c.probation_amt); const basis = c.probation_basis||'salary';
  if(amt>0 && basis==='direct'){ const m=num(c.monthly_salary_agreed); return m>0?amt/m:1; }
  const pct = num(c.probation_pct); return (pct>0&&pct<100)?pct/100:1;
}
function _probEndOf(c){
  const months=c.probation_months?Number(c.probation_months):0;
  if(months>0&&c.contract_start){
    const d=new Date(c.contract_start+'T00:00:00');
    if(isNaN(d.getTime())) return c.contract_end||null;
    d.setMonth(d.getMonth()+months); d.setDate(d.getDate()-1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  return c.contract_end||null;
}
function fixedPaysFor(p){
  const list = ctsByEmp[p.employee_id]||[];
  if(!list.length) return 0;
  const ym = `${p.pay_year}-${String(p.pay_month).padStart(2,'0')}`;
  let c = list.filter(x=>{
    if(x.contract_start && x.contract_start.slice(0,7) > ym) return false;
    if(x.contract_end && x.contract_end.slice(0,7) < ym) return false;
    return true;
  }).sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))[0] || null;
  if(!c){
    const ymNum = p.pay_year*100 + p.pay_month;
    c = list.map(x=>({x, d:(()=>{ const sm=String(x.contract_start||'').slice(0,7).replace('-',''); return sm?Math.abs(parseInt(sm)-ymNum):999999; })()}))
      .sort((a,b)=>a.d-b.d)[0]?.x || null;
    if(!c) return 0;
  }
  let r = 1;
  if (num(c.probation_amt)>0 || num(c.probation_pct)>0){
    const pe = _probEndOf(c);
    if (pe && ym <= pe.slice(0,7)) r = _probRatioOf(c);
    else if (!pe) r = _probRatioOf(c);
  }
  if (r>=1) r=1;
  return Math.round((num(c.fixed_ot_pay)+num(c.fixed_night_pay)+num(c.fixed_hol_pay))*r);
}

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
  // 주휴수당은 기본급(시급×209h, 주휴 포함)에 이미 포함 → 참고값으로 미가산 (2026-09-11 규칙 확정)
  // 일용직도 기본급=일급여×근로일수, 주휴수당은 참고값 → 미가산
  const paySum =
    num(p.base_salary) +
    num(p.position_allowance) + num(p.site_allowance) +
    num(p.transportation_allowance || p.car_maintenance) + num(p.self_driving_allowance) +
    num(p.remote_area_allowance) + num(p.meal_allowance) + num(p.childcare_allowance) +
    num(p.research_allowance) + num(p.skill_allowance) + num(p.license_allowance) + num(p.hazard_allowance) +
    num(p.overtime_pay) + num(p.night_pay) + num(p.holiday_pay) +
    num(p.annual_leave_pay) + num(p.bonus_pay) + num(p.performance_pay) + num(p.actual_expense_pay) +
    num(p.communication_pay) + num(p.fitness_allowance) + num(p.self_dev_allowance) +
    num(p.book_allowance) + num(p.overseas_allowance) +
    num(p.severance_interim_pay) + (num(p.etc_allowance) + num(p.other_pay)) +
    sumJsonAmounts(p.custom_ordinary_values) + sumJsonAmounts(p.custom_fixed_values) + sumJsonAmounts(p.etc_allowance_items)
    + fixedPaysFor(p);

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

  // ── D. 4대보험 개별 공식 (std 기준, 적용제외 고려) ──
  // 확정액 기준(fixed_amount) 고객사는 직접 입력 방식 → 공식 검사 제외
  const std = num(p.standard_monthly_pay) || gross;
  if (std > 0 && has('health_insurance') && !fixedBasisCoIds.has(p.company_id)) {
    const R_p = rateFor('national_pension', period);
    const R_h = rateFor('health', period);
    const R_l = rateFor('long_term_care', period);
    const R_e = rateFor('employment', period);
    const h = num(p.health_insurance);
    const hExp = Math.round(std * R_h.rate);
    stat.D.health++;
    if (h > 0 && Math.abs(h - hExp) > TOL) { stat.D.healthBad++; if (samples.length < 25) samples.push({ check: 'D-건강보험', period, name, std, stored: h, expected: hExp }); }
    const pen = num(p.national_pension);
    const penExp = Math.round(Math.min(std, R_p.cap || 1e12) * R_p.rate);
    stat.D.pension++;
    if (pen > 0 && Math.abs(pen - penExp) > TOL) { stat.D.pensionBad++; if (samples.length < 25) samples.push({ check: 'D-국민연금', period, name, std, stored: pen, expected: penExp }); }
    const lt = num(p.long_term_care);
    const ltExp = Math.round(h * R_l.rate);
    stat.D.ltcare++;
    if (lt > 0 && h > 0 && Math.abs(lt - ltExp) > TOL) { stat.D.ltcareBad++; if (samples.length < 25) samples.push({ check: 'D-장기요양', period, name, stored: lt, expected: ltExp }); }
    const emp = num(p.employment_insurance);
    const empExp = Math.round(std * R_e.rate);
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
