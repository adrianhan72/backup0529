/**
 * 실제 DB(app.db) 전체 테이블 null 필드 보정
 * companies, contracts, payrolls, annual_leave_ledger, attendance_ledger 등
 */
const { DB } = require('../lib/database');
const db = new DB('data/app.db');
const raw = db.raw;
const r = v => Math.round(v);
const now = Date.now();
const WEEKS = 365 / 12 / 7;

let totalFixed = 0;

// ═══════════════════════════════════════════════
// 1. 고객사(companies)
// ═══════════════════════════════════════════════
const coNulls = raw.prepare(`SELECT id, company_name FROM companies WHERE company_name IS NULL OR company_name='' OR business_number IS NULL OR phone IS NULL OR phone='' OR representative IS NULL OR representative=''`).all();
if (coNulls.length > 0) {
  const stmt = raw.prepare(`UPDATE companies SET company_name=COALESCE(NULLIF(company_name,''),'회사명미정'), business_number=COALESCE(NULLIF(business_number,''),'000-00-00000'), phone=COALESCE(NULLIF(phone,''),'02-0000-0000'), representative=COALESCE(NULLIF(representative,''),'대표자미정'), updated_at=? WHERE id=?`);
  for (const c of coNulls) {
    stmt.run(now, c.id);
    totalFixed++;
  }
  console.log(`companies 보정: ${coNulls.length}건`);
}

// ═══════════════════════════════════════════════
// 2. 직원(employees) - 전면
// ═══════════════════════════════════════════════
const empFix = raw.prepare(`UPDATE employees SET
  name = COALESCE(NULLIF(name,''), '이름미정'),
  gender = COALESCE(NULLIF(gender,''), '남'),
  id_number = COALESCE(NULLIF(id_number,''), '000101-0'),
  phone = CASE WHEN phone IS NULL OR phone='' OR phone='010-0000-0000' THEN '010-' || substr(id,1,4) || '-' || substr(id,5,4) ELSE phone END,
  email = COALESCE(email, ''),
  address = COALESCE(address, ''),
  dependents = COALESCE(dependents, 1),
  hire_date = COALESCE(NULLIF(hire_date,''), '2025-01-01'),
  employment_category = COALESCE(NULLIF(employment_category,''), '정규직'),
  employee_number = COALESCE(NULLIF(employee_number,''), 'EM' || substr(id,1,6)),
  status = COALESCE(NULLIF(status,''), '재직'),
  updated_at = ?
WHERE name IS NULL OR name='' OR gender IS NULL OR gender=''
   OR id_number IS NULL OR id_number='' OR phone IS NULL OR phone='' OR phone='010-0000-0000'
   OR hire_date IS NULL OR hire_date='' OR employment_category IS NULL OR employment_category=''
   OR employee_number IS NULL OR employee_number=''`).run(now);
console.log(`employees 보정: ${empFix.changes}건`);
totalFixed += empFix.changes;

// ═══════════════════════════════════════════════
// 3. 근로계약(contracts) - 근무시간, 급여, 수당
// ═══════════════════════════════════════════════
const ctAll = raw.prepare(`SELECT c.id, c.employee_id, c.company_id, c.contract_type, c.status, c.is_draft,
  c.work_hours_per_day, c.work_days_per_week, c.work_days_per_month,
  c.base_salary, c.hourly_wage, c.monthly_salary_agreed, c.weekly_holiday_pay,
  c.annual_leave_days, c.break_time, c.pay_period, c.daily_wage,
  c.insurance_pension, c.insurance_health, c.insurance_employment, c.insurance_industrial
FROM contracts c WHERE c.is_draft=0 OR c.is_draft IS NULL`).all();

const stmtCt = raw.prepare(`UPDATE contracts SET
  work_hours_per_day=?, work_days_per_week=?, work_days_per_month=?,
  break_time=?, annual_leave_days=?, hourly_wage=?,
  weekly_holiday_pay=?, monthly_salary_agreed=?, base_salary=?,
  daily_wage=?, annual_salary=?, pay_period=?,
  insurance_pension=?, insurance_health=?, insurance_employment=?, insurance_industrial=?,
  updated_at=? WHERE id=?`);

let ctFixed = 0;
for (const ct of ctAll) {
  const hpd = ct.work_hours_per_day > 0 ? ct.work_hours_per_day : 8;
  const dpw = ct.work_days_per_week > 0 ? ct.work_days_per_week : 5;
  const dpm = r(dpw * WEEKS);
  const monthlyStdH = r(hpd * dpw * WEEKS);
  const isDaily = (ct.contract_type || '') === '일용직';

  let baseSal = ct.base_salary > 0 ? ct.base_salary : 0;
  let hw = ct.hourly_wage > 0 ? ct.hourly_wage : 0;
  let dailyW = ct.daily_wage > 0 ? ct.daily_wage : 0;
  let monthly = ct.monthly_salary_agreed > 0 ? ct.monthly_salary_agreed : 0;

  // 기본값 채우기
  if (isDaily) {
    if (dailyW <= 0) dailyW = 100000;
    if (hw <= 0) hw = r(dailyW / hpd);
    if (baseSal <= 0) baseSal = r(dailyW * dpm);
    if (monthly <= 0) monthly = baseSal;
  } else {
    if (baseSal <= 0) baseSal = 2500000;
    if (hw <= 0) hw = r(baseSal / monthlyStdH);
    if (monthly <= 0) monthly = baseSal;
  }
  const weekly = isDaily ? 0 : r(hw * hpd * WEEKS);
  const annual = isDaily ? 0 : r(monthly * 12);

  stmtCt.run(
    hpd, dpw, dpm, 1, 15, hw, weekly, monthly, baseSal, dailyW, annual,
    ct.pay_period || '당월 25일부터 1개월간',
    ct.insurance_pension || 'Y', ct.insurance_health || 'Y',
    ct.insurance_employment || 'Y', ct.insurance_industrial || 'Y',
    now, ct.id
  );
  ctFixed++;
}
console.log(`contracts 보정: ${ctFixed}건`);
totalFixed += ctFixed;

// ═══════════════════════════════════════════════
// 4. 급여(payrolls) - standard_monthly_pay 등
// ═══════════════════════════════════════════════
const payFix = raw.prepare(`UPDATE payrolls SET
  standard_monthly_pay = COALESCE(base_salary,0) + COALESCE(weekly_holiday_pay,0),
  hourly_wage = CASE WHEN hourly_wage IS NULL OR hourly_wage=0 THEN COALESCE(base_salary,0)/209 ELSE hourly_wage END,
  updated_at = ?
WHERE is_draft=0 AND (standard_monthly_pay IS NULL OR standard_monthly_pay=0)`).run(now);
console.log(`payrolls standard_monthly_pay 보정: ${payFix.changes}건`);
totalFixed += payFix.changes;

// ═══════════════════════════════════════════════
// 5. 연차 관리대장(annual_leave_ledger)
// ═══════════════════════════════════════════════
const alFix = raw.prepare(`UPDATE annual_leave_ledger SET
  total_days = COALESCE(total_days, 15),
  total_used = COALESCE(total_used, 0),
  remain_days = COALESCE(total_days,15) - COALESCE(total_used,0),
  carryover_days = COALESCE(carryover_days, 0),
  ordinary_wage = COALESCE(ordinary_wage, 0),
  leave_pay_estimate = COALESCE(leave_pay_estimate, 0),
  updated_at = ?
WHERE total_days IS NULL OR remain_days IS NULL`).run(now);
console.log(`annual_leave_ledger 보정: ${alFix.changes}건`);
totalFixed += alFix.changes;

// ═══════════════════════════════════════════════
// 6. 근태 관리대장(attendance_ledger)
// ═══════════════════════════════════════════════
const attFix = raw.prepare(`UPDATE attendance_ledger SET
  status = COALESCE(NULLIF(status,''), 'normal'),
  updated_at = ?
WHERE status IS NULL OR status=''`).run(now);
console.log(`attendance_ledger 보정: ${attFix.changes}건`);
totalFixed += attFix.changes;

// ═══════════════════════════════════════════════
// 7. 기타 테이블 null 보정
// ═══════════════════════════════════════════════
const tables = raw.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();
for (const t of tables) {
  const cols = raw.prepare(`PRAGMA table_info(${t.name})`).all();
  for (const col of cols) {
    if (col.pk || col.dflt_value) continue; // PK나 default 있으면 skip
    if (col.notnull) {
      // NOT NULL 컬럼 중 null 있는지 확인
      const nulls = raw.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}" WHERE "${col.name}" IS NULL`).get();
      if (nulls && nulls.cnt > 0) {
        // 기본값으로 채움
        let defVal = '';
        if (col.type.includes('INT')) defVal = '0';
        else if (col.type.includes('REAL')) defVal = '0';
        else defVal = "''";
        const fixSql = `UPDATE "${t.name}" SET "${col.name}" = ${defVal}, updated_at = ${now} WHERE "${col.name}" IS NULL`;
        try {
          raw.prepare(fixSql).run();
          if (nulls.cnt > 0) console.log(`${t.name}.${col.name}: ${nulls.cnt}건 보정`);
          totalFixed += nulls.cnt;
        } catch(e) { /* skip */ }
      }
    }
  }
}

db.connection.close();
console.log(`\n✅ 전체 보정 완료: 총 ${totalFixed}건`);
