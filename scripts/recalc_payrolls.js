/**
 * 급여 데이터 재계산 스크립트
 * - 비과세 항목(childcare/car/meal/research) 월 20만원 한도 적용
 * - 소득세, 지방소득세, 공제합계, 영수액 재계산
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── 헬퍼 ──
const rnd = (v) => Math.round(v);
const parseJSON = (v) => {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch(e) { return {}; }
};

console.log('📊 급여 데이터 재계산 시작...\n');

// ── 1. 보험요율 로드 ──
const allRates = db.prepare('SELECT * FROM insurance_rates').all();
function getRates(year) {
  const y = String(year);
  const pension = allRates.find(r => r.insurance_type === 'national_pension' && String(r.year||'') === y)
    || allRates.find(r => r.insurance_type === 'national_pension' && r.period_start && r.period_start <= `${y}-12-31` && r.period_end >= `${y}-01-01`);
  const health = allRates.find(r => r.insurance_type === 'health' && String(r.year||'') === y)
    || allRates.find(r => r.insurance_type === 'health' && r.period_start && r.period_start <= `${y}-12-31` && r.period_end >= `${y}-01-01`);
  const ltcare = allRates.find(r => r.insurance_type === 'long_term_care' && String(r.year||'') === y)
    || allRates.find(r => r.insurance_type === 'long_term_care' && r.period_start && r.period_start <= `${y}-12-31` && r.period_end >= `${y}-01-01`);
  const employ = allRates.find(r => r.insurance_type === 'employment' && String(r.year||'') === y)
    || allRates.find(r => r.insurance_type === 'employment' && r.period_start && r.period_start <= `${y}-12-31` && r.period_end >= `${y}-01-01`);
  return {
    pensionRate: pension ? (pension.rate || 4.5) / 100 : 0.045,
    pensionCap:  pension ? (pension.cap_amount || 6370000) : 6370000,
    healthRate:  health  ? (health.rate || 3.545) / 100  : 0.03545,
    ltcareRate:  ltcare  ? (ltcare.rate || 12.95) / 100  : 0.1295,
    employRate:  employ  ? (employ.rate || 0.9) / 100    : 0.009,
  };
}

// ── 2. 회사 데이터 로드 (allowance_config) ──
const allCompanies = db.prepare('SELECT id, company_name, allowance_config FROM companies').all();
const coMap = {};
allCompanies.forEach(c => {
  coMap[c.id] = { name: c.company_name, cfg: parseJSON(c.allowance_config) };
});

// ── 3. 소득세 계산 (간이세액표 폴백 근사식) ──
function calcIncomeTax(std, dependents, rates) {
  const R = rates;
  const taxBase = std - rnd(std * (R.pensionRate + R.healthRate + R.employRate)) - 150000;
  let incomeTax = 0;
  if (taxBase <= 0) { incomeTax = 0; }
  else if (taxBase <= 1500000)   { incomeTax = rnd(taxBase * 0.06); }
  else if (taxBase <= 3000000)   { incomeTax = rnd(90000 + (taxBase - 1500000) * 0.15); }
  else if (taxBase <= 4500000)   { incomeTax = rnd(315000 + (taxBase - 3000000) * 0.24); }
  else if (taxBase <= 6500000)   { incomeTax = rnd(675000 + (taxBase - 4500000) * 0.35); }
  else                            { incomeTax = rnd(1375000 + (taxBase - 6500000) * 0.38); }
  incomeTax = Math.max(0, incomeTax - Math.max(0, (dependents - 1) * 15000));
  const localTax = Math.floor(incomeTax * 0.1 / 10) * 10;
  return { incomeTax, localTax };
}

// ── 4. 비과세 항목 체크 ──
const TAX_EXEMPT_FIELDS = ['childcare', 'car', 'meal', 'research'];
const TAX_EXEMPT_CAP = 200000;

function getTaxExemptAmount(coId, field, amount) {
  const cfg = coMap[coId]?.cfg || {};
  const key = `${field}_tax_exempt`;
  if (!cfg[key]) return 0;
  return Math.min(amount || 0, TAX_EXEMPT_CAP);
}

// ── 5. 모든 급여 데이터 로드 ──
const payrolls = db.prepare(`
  SELECT * FROM payrolls
  WHERE is_draft = 0 OR is_draft IS NULL
  ORDER BY pay_year, pay_month
`).all();

console.log(`총 ${payrolls.length}건의 급여 데이터 로드됨\n`);

let updatedCount = 0;
let skippedCount = 0;
const updates = [];

for (const p of payrolls) {
  try {
    const coId = p.company_id;
    const dependents = Math.max(1, parseInt(p.dependents || p.tax_dependents || '1') || 1);
    const year = p.pay_year;
    const rates = getRates(year);

    // ── Gross 계산 ──
    const gross = (p.base_salary || 0)
      + (p.weekly_holiday_pay || 0)
      + (p.position_allowance || 0) + (p.skill_allowance || 0) + (p.license_allowance || 0)
      + (p.hazard_allowance || 0) + (p.site_allowance || 0) + (p.remote_area_allowance || 0)
      + (p.transportation_allowance || 0) + (p.self_driving_allowance || 0)
      + (p.meal_allowance || 0) + (p.childcare_allowance || 0) + (p.research_allowance || 0)
      + (p.overtime_pay || 0) + (p.night_pay || 0) + (p.holiday_pay || 0)
      + (p.annual_leave_pay || 0) + (p.bonus_pay || 0) + (p.performance_pay || 0)
      + (p.actual_expense_pay || 0) + (p.communication_pay || 0)
      + (p.fitness_allowance || 0) + (p.self_dev_allowance || 0)
      + (p.book_allowance || 0) + (p.overseas_allowance || 0)
      + (p.etc_allowance || 0) + (p.contract_etc_allowance || 0);

    // ── Std (보수월액) 계산 ──
    // 비과세 항목: fixed 여부 관계없이 월 20만원 한도로 포함
    // 그 외: pay_type이 'fixed'인 항목만 포함
    const isFixed = (field) => {
      const ptField = `${field}_pay_type`;
      return p[ptField] === 'fixed';
    };
    
    const std = (p.base_salary || 0)
      + (p.weekly_holiday_pay || 0)
      + (p.position_allowance || 0) + (p.skill_allowance || 0) + (p.license_allowance || 0)
      + (p.site_allowance || 0) + (p.remote_area_allowance || 0)
      + getTaxExemptAmount(coId, 'car', (p.transportation_allowance || 0) + (p.self_driving_allowance || 0))
      + getTaxExemptAmount(coId, 'meal', p.meal_allowance || 0)
      + getTaxExemptAmount(coId, 'research', p.research_allowance || 0)
      + getTaxExemptAmount(coId, 'childcare', p.childcare_allowance || 0)
      + (isFixed('communication') ? (p.communication_pay || 0) : 0)
      + (isFixed('fitness') ? (p.fitness_allowance || 0) : 0)
      + (isFixed('self_dev') ? (p.self_dev_allowance || 0) : 0)
      + (isFixed('book') ? (p.book_allowance || 0) : 0)
      + (isFixed('overseas') ? (p.overseas_allowance || 0) : 0)
      + (p.overtime_pay || 0) + (p.night_pay || 0) + (p.holiday_pay || 0)
      + (p.annual_leave_pay || 0);

    // ── 4대보험 계산 ──
    const isFixedMode = (p.insurance_basis || '') === '확정액 기준';
    let pension, health, ltCare, empIns;
    
    if (isFixedMode) {
      // 확정액 모드: 저장된 값 그대로 사용
      pension = p.national_pension || 0;
      health  = p.health_insurance || 0;
      ltCare  = p.long_term_care || 0;
      empIns  = p.employment_insurance || 0;
    } else {
      pension = rnd(Math.min(std, rates.pensionCap) * rates.pensionRate);
      health  = rnd(std * rates.healthRate);
      ltCare  = rnd(health * rates.ltcareRate);
      empIns  = rnd(std * rates.employRate);
    }

    // ── 소득세 계산 ──
    const { incomeTax, localTax } = calcIncomeTax(std, dependents, rates);

    // ── 공제합계 & 영수액 ──
    const totalDed = pension + health + ltCare + empIns + incomeTax + localTax
      + (p.year_end_tax_adjust || 0) + (p.health_insurance_adjust || 0)
      + (p.health_insurance_adjust_yearend || 0) + (p.ltcare_adjust_yearend || 0)
      + (p.advance_deduction || 0);
    const netPay = gross - totalDed;

    // ── 변경사항 확인 ──
    const oldIncomeTax = p.income_tax || 0;
    const oldLocalTax = p.local_income_tax || 0;
    const oldTotalDed = p.total_deduction || 0;
    const oldNetPay = p.net_pay || 0;

    const incomeTaxDiff = Math.abs((incomeTax || 0) - oldIncomeTax);
    const localTaxDiff = Math.abs((localTax || 0) - oldLocalTax);
    const totalDedDiff = Math.abs((totalDed || 0) - oldTotalDed);
    const netPayDiff = Math.abs((netPay || 0) - oldNetPay);

    if (incomeTaxDiff > 10 || localTaxDiff > 10 || totalDedDiff > 10 || netPayDiff > 10) {
      updates.push({
        id: p.id,
        coName: coMap[coId]?.name || '?',
        year: p.pay_year,
        month: p.pay_month,
        employee_id: p.employee_id,
        gross,
        std,
        oldIncomeTax, newIncomeTax: incomeTax,
        oldLocalTax, newLocalTax: localTax,
        oldTotalDed, newTotalDed: totalDed,
        oldNetPay, newNetPay: netPay,
        incomeTaxDiff, totalDedDiff, netPayDiff
      });
    }
    updatedCount++;
  } catch(e) {
    console.error(`  ⚠️ 오류: ${p.id} - ${e.message}`);
    skippedCount++;
  }
}

// ── 6. 결과 출력 ──
console.log(`${'='.repeat(90)}`);
console.log(`검사 완료: ${updatedCount}건 처리, ${skippedCount}건 오류, ${updates.length}건 변경 필요`);
console.log(`${'='.repeat(90)}\n`);

if (updates.length === 0) {
  console.log('✅ 모든 급여 데이터가 이미 산식과 일치합니다.');
  process.exit(0);
}

// 변경 필요 항목 출력
console.log('변경 필요한 항목 (차이 10원 초과):\n');
updates.forEach((u, i) => {
  console.log(`#${i+1} [${u.coName}] ${u.year}.${String(u.month).padStart(2,'0')} (emp: ${u.employee_id})`);
  console.log(`  소득세:     ${(u.oldIncomeTax||0).toLocaleString()} → ${(u.newIncomeTax||0).toLocaleString()} (차이: ${(u.incomeTaxDiff||0).toLocaleString()})`);
  console.log(`  지방소득세: ${(u.oldLocalTax||0).toLocaleString()} → ${(u.newLocalTax||0).toLocaleString()} (차이: ${(u.localTaxDiff||0).toLocaleString()})`);
  console.log(`  공제합계:   ${(u.oldTotalDed||0).toLocaleString()} → ${(u.newTotalDed||0).toLocaleString()} (차이: ${(u.totalDedDiff||0).toLocaleString()})`);
  console.log(`  영수액:     ${(u.oldNetPay||0).toLocaleString()} → ${(u.newNetPay||0).toLocaleString()} (차이: ${(u.netPayDiff||0).toLocaleString()})`);
  console.log(`  보수월액:   ${(u.std||0).toLocaleString()} | 지급총액: ${(u.gross||0).toLocaleString()}`);
  console.log();
});

// ── 7. DB 업데이트 ──
const updateStmt = db.prepare(`
  UPDATE payrolls SET
    income_tax = ?, local_income_tax = ?, total_deduction = ?, net_pay = ?,
    gross_pay = ?, standard_monthly_pay = ?,
    updated_at = datetime('now')
  WHERE id = ?
`);

const updateTx = db.transaction(() => {
  for (const u of updates) {
    updateStmt.run(u.newIncomeTax, u.newLocalTax, u.newTotalDed, u.newNetPay, u.gross, u.std, u.id);
  }
});

console.log(`${updates.length}건 업데이트 중...`);
updateTx();
console.log('✅ DB 업데이트 완료!');

db.close();
