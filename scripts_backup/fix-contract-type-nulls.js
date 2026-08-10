/**
 * 근로계약(contracts) 필수 필드 null 보정
 * - contract_type: employees.employment_category → '정규직' 기본값
 * - pay_day: companies.pay_day → null 허용 (미설정 가능)
 * - employment_category: employees.employment_category → '정규직' 기본값
 * - transport_type: 'self_driving' → 'public_transit' 기본값
 */
const { DB } = require('../lib/database');
const db = new DB('data/app.db');
const raw = db.raw;
const now = Date.now();

let totalFixed = 0;

// ═══════════════════════════════════════════════
// 1. contract_type null → employees.employment_category → '정규직'
// ═══════════════════════════════════════════════
const ctTypeNulls = raw.prepare(`
  SELECT c.id, c.employee_id, c.contract_type,
         e.employment_category AS emp_cat
  FROM contracts c
  LEFT JOIN employees e ON c.employee_id = e.id
  WHERE c.contract_type IS NULL OR c.contract_type = ''
`).all();

if (ctTypeNulls.length > 0) {
  const stmt = raw.prepare(`UPDATE contracts SET contract_type = ?, updated_at = ? WHERE id = ?`);
  for (const ct of ctTypeNulls) {
    const fill = ct.emp_cat || '정규직';
    stmt.run(fill, now, ct.id);
  }
  totalFixed += ctTypeNulls.length;
  console.log(`contracts.contract_type 보정: ${ctTypeNulls.length}건`);
}

// ═══════════════════════════════════════════════
// 2. contract_type이 유효하지 않은 값이면 정규직으로 보정
//    (한글/영문 enum 외의 잘못된 값들)
// ═══════════════════════════════════════════════
const VALID_TYPES = [
  'regular', 'regular_probation', 'fixed_term', 'fixed_term_probation',
  'daily', 'executive', 'related_party', 'representative',
  '정규직', '정규직 수습', '계약직', '계약직 수습', '일용직',
  '등기임원', '특수관계인', '대표자'
];

const ctAll = raw.prepare(`SELECT c.id, c.contract_type, c.employee_id,
  e.employment_category AS emp_cat
  FROM contracts c
  LEFT JOIN employees e ON c.employee_id = e.id
  WHERE c.contract_type IS NOT NULL AND c.contract_type != ''
`).all();

let invalidFixed = 0;
const stmtInvalid = raw.prepare(`UPDATE contracts SET contract_type = ?, updated_at = ? WHERE id = ?`);
for (const ct of ctAll) {
  if (!VALID_TYPES.includes(ct.contract_type)) {
    const fill = ct.emp_cat || '정규직';
    stmtInvalid.run(fill, now, ct.id);
    invalidFixed++;
  }
}
if (invalidFixed > 0) {
  totalFixed += invalidFixed;
  console.log(`contracts.contract_type 유효하지 않은 값 보정: ${invalidFixed}건`);
}

// ═══════════════════════════════════════════════
// 3. contract_type 영문 → 한글 정규화 (선택적)
//    (필요 시 한글값으로 통일하려면 주석 해제)
// ═══════════════════════════════════════════════
// const TYPE_MAP = {
//   'regular': '정규직', 'regular_probation': '정규직 수습',
//   'fixed_term': '계약직', 'fixed_term_probation': '계약직 수습',
//   'daily': '일용직', 'executive': '등기임원',
//   'related_party': '특수관계인', 'representative': '대표자'
// };
// for (const [en, ko] of Object.entries(TYPE_MAP)) {
//   const fix = raw.prepare(`UPDATE contracts SET contract_type = ?, updated_at = ? WHERE contract_type = ?`).run(ko, now, en);
//   if (fix.changes > 0) console.log(`contracts.contract_type '${en}' → '${ko}': ${fix.changes}건`);
// }

// ═══════════════════════════════════════════════
// 4. contracts.employment_category null → employees.employment_category → '정규직'
// ═══════════════════════════════════════════════
const ctEmpCatNulls = raw.prepare(`
  SELECT c.id, c.employee_id,
         e.employment_category AS emp_cat
  FROM contracts c
  LEFT JOIN employees e ON c.employee_id = e.id
  WHERE c.employment_category IS NULL OR c.employment_category = ''
`).all();

if (ctEmpCatNulls.length > 0) {
  const stmt = raw.prepare(`UPDATE contracts SET employment_category = ?, updated_at = ? WHERE id = ?`);
  for (const ct of ctEmpCatNulls) {
    const fill = ct.emp_cat || '정규직';
    stmt.run(fill, now, ct.id);
  }
  totalFixed += ctEmpCatNulls.length;
  console.log(`contracts.employment_category 보정: ${ctEmpCatNulls.length}건`);
}

// ═══════════════════════════════════════════════
// 5. contracts.pay_day null → companies.pay_day (있으면)
// ═══════════════════════════════════════════════
const ctPayDayNulls = raw.prepare(`
  SELECT c.id, c.company_id,
         co.pay_day AS co_pay_day
  FROM contracts c
  LEFT JOIN companies co ON c.company_id = co.id
  WHERE c.pay_day IS NULL AND co.pay_day IS NOT NULL
`).all();

if (ctPayDayNulls.length > 0) {
  const stmt = raw.prepare(`UPDATE contracts SET pay_day = ?, updated_at = ? WHERE id = ?`);
  for (const ct of ctPayDayNulls) {
    stmt.run(ct.co_pay_day, now, ct.id);
  }
  totalFixed += ctPayDayNulls.length;
  console.log(`contracts.pay_day ← companies.pay_day 보정: ${ctPayDayNulls.length}건`);
}

// ═══════════════════════════════════════════════
// 6. contracts.transport_type null → 'public_transit'
// ═══════════════════════════════════════════════
const ctTransNulls = raw.prepare(`
  UPDATE contracts SET transport_type = 'public_transit', updated_at = ?
  WHERE transport_type IS NULL OR transport_type = ''
`).run(now);
if (ctTransNulls.changes > 0) {
  totalFixed += ctTransNulls.changes;
  console.log(`contracts.transport_type 보정: ${ctTransNulls.changes}건`);
}

db.connection.close();
console.log(`\n✅ contracts 필수 필드 보정 완료: 총 ${totalFixed}건`);
