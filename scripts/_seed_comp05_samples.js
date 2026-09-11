/**
 * 그린에너지(comp05) 샘플 데이터 생성 (2026-09-11)
 *  - 계약직 1명 / 일용직(상용직 취급 fulltime) 1명 / 일용직(상용직 아님 daily) 1명
 *  - 인사카드(employees) + 근로계약(contracts) + 급여(payrolls) + 근태(attendance_ledger) + 연차(annual_leave_ledger)
 *  - 산식 일관성(앱 calcPI 기준):
 *      계약직: 기본급=시급×209(주휴 포함), 주휴수당=8h×시급×주수(참고), 지급총액=기본급+식대+교통비,
 *              보수월액=지급총액(식대 비과세 미설정), 4대보험=보수월액×2026년 요율, 소득세=간이세액표
 *      일용직: 기본급=일급여×근로일수, 수당 전부 0, 주휴수당=일급여×주수(참고),
 *              소득세=일용 원천징수 특례(일당≤15만 → 0), 4대보험=보수월액×요율(월 8일↑)
 */
const { DB } = require('../lib/database');
const crypto = require('crypto');
const db = new DB('data/app.db');

const CO = 'comp05';
const NOW = Date.now();
const uuid = () => crypto.randomUUID();
const fmtDate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// ── 기존 comp05 데이터 확인 ──
const existingEmps = db.all("SELECT id, name, employee_number FROM employees WHERE company_id=?", [CO]);
console.log('comp05 기존 직원 수:', existingEmps.length);

// 사원번호 원장 형식 확인 (앞0 유지 여부)
const ledgerSample = db.all("SELECT employee_number FROM employee_number_ledger WHERE company_id=? LIMIT 3", [CO]);
console.log('사번원장 샘플:', JSON.stringify(ledgerSample));

// 회사 연차 기준 확인
const co = db.get("SELECT company_name, annual_leave_basis FROM companies WHERE id=?", [CO]);
console.log('회사 연차 기준:', JSON.stringify(co));

// 보험 요율 (2026-09 기준 최신)
const getRate = (type) => {
  const rows = db.all("SELECT * FROM insurance_rates WHERE insurance_type=? ORDER BY period_end DESC", [type]);
  return rows.length ? rows[0].rate : null;
};
const R = {
  pension: (getRate('national_pension') || 4.5) / 100,
  health: (getRate('health') || 3.545) / 100,
  ltcare: (getRate('long_term_care') || 12.95) / 100,
  employ: (getRate('employment') || 0.9) / 100,
};
console.log('요율:', JSON.stringify(R));

// ── 2025 간이세액표 (1인 컬럼) — 앱과 동일 데이터 사용 ──
const TAX2025 = [
  [1060000,1080000,1130],[1080000,1100000,2040],[1100000,1120000,2960],
  [1120000,1140000,3870],[1140000,1160000,4790],[1160000,1180000,5710],
  [1180000,1200000,6640],[1200000,1240000,7560],[1240000,1280000,9300],
  [1280000,1320000,11060],[1320000,1360000,12800],[1360000,1400000,14550],
  [1400000,1440000,16290],[1440000,1480000,18050],[1480000,1520000,19790],
  [1520000,1560000,21540],[1560000,1600000,23280],[1600000,1640000,25030],
  [1640000,1680000,26770],[1680000,1720000,28520],[1720000,1760000,30260],
  [1760000,1800000,32010],[1800000,1850000,33980],[1850000,1900000,36180],
  [1900000,1950000,38370],[1950000,2000000,40570],[2000000,2050000,42760],
  [2050000,2100000,44960],[2100000,2150000,47310],[2150000,2200000,50060],
  [2200000,2250000,52810],[2250000,2300000,55560],[2300000,2350000,58310],
  [2350000,2400000,61060],[2400000,2450000,63820],[2450000,2500000,66570],
  [2500000,2600000,70490],[2600000,2700000,77380],[2700000,2800000,84270],
  [2800000,2900000,91160],[2900000,3000000,98050],[3000000,3100000,104940],
  [3100000,3200000,111830],[3200000,3300000,118720],[3300000,3400000,125610],
  [3400000,3500000,133210],[3500000,3600000,141030],[3600000,3700000,148840],
  [3700000,3800000,156660],[3800000,3900000,164470],[3900000,4000000,172290],
  [4000000,4100000,180100],[4100000,4200000,187920],[4200000,4300000,195730],
  [4300000,4400000,203550],[4400000,4500000,211360],[4500000,4600000,220970],
  [4600000,4700000,231910],[4700000,4800000,242850],[4800000,4900000,253790],
  [4900000,5000000,264730],[5000000,5100000,275670],[5100000,5200000,286610],
  [5200000,5300000,297550],[5300000,5400000,308490],[5400000,5500000,319430],
  [5500000,5600000,330370],[5600000,5700000,341840],[5700000,5800000,353530],
  [5800000,5900000,365220],[5900000,6000000,376910],[6000000,6100000,388600],
  [6100000,6200000,400290],[6200000,6300000,411980],[6300000,6400000,423670],
  [6400000,6500000,435360],[6500000,6600000,447050],[6600000,6700000,459050],
  [6700000,6800000,471250],[6800000,6900000,483450],[6900000,7000000,495650],
  [7000000,7200000,514750],[7200000,7400000,540990],[7400000,7600000,567230],
  [7600000,7800000,593470],[7800000,8000000,619710],[8000000,8200000,645950],
  [8200000,8400000,672190],[8400000,8600000,698430],[8600000,8800000,724670],
  [8800000,9000000,750910],[9000000,9200000,777150],[9200000,9400000,808230],
  [9400000,9600000,840720],[9600000,9800000,873210],[9800000,10000000,905700],
  [10000000,10200000,938190],
];
function taxLookup(std) {
  const row = TAX2025.find(r => std >= r[0] && std < r[1]) || TAX2025[TAX2025.length - 1];
  const incomeTax = row ? row[2] : 0;
  const localTax = Math.floor((incomeTax * 0.1) / 10) * 10;
  return { incomeTax, localTax };
}

// ── 월급 계산 (계약직 공용) — 주휴수당은 기본급(시급×209)에 이미 포함 (참고값만 저장) ──
function calcMonthly(hourlyWage, meal, transport, workDays) {
  const base = Math.round(hourlyWage * 209);          // 통상시급 × 209 (주휴 35h 포함)
  const weeklyHol = Math.round(hourlyWage * 8 * Math.floor(workDays / 5)); // 참고: 8h×시급×주수
  const gross = base + meal + transport;
  const std = base + meal + transport;                // comp05: 식대 비과세 미설정 → std 전액 포함
  const pension = Math.round(std * R.pension);
  const health = Math.round(std * R.health);
  const ltcare = Math.round(health * R.ltcare);
  const employ = Math.round(std * R.employ);
  const { incomeTax, localTax } = taxLookup(std);
  const totalDed = pension + health + ltcare + employ + incomeTax + localTax;
  const net = gross - totalDed;
  return {
    base_salary: base, weekly_holiday_pay: weeklyHol, meal_allowance: meal,
    transportation_allowance: transport, standard_monthly_pay: std, gross_pay: gross,
    national_pension: pension, health_insurance: health, long_term_care: ltcare,
    employment_insurance: employ, income_tax: incomeTax, local_income_tax: localTax,
    total_deduction: totalDed, net_pay: net, work_days: workDays,
    total_work_hours: workDays * 8, hourly_wage: hourlyWage,
  };
}

// ── 일용직 계산 (상용직 취급·상용직 아님 공용) ──
// 앱 산식: 기본급 = 일급여×근로일수, 수당은 전부 0, 주휴수당 = 일급여×주수(참고),
//          소득세 = 일용 원천징수 특례 (일당 ≤ 15만 → 0), 4대보험 = 보수월액×요율 (월 8일↑)
function calcDailyMonth(dailyWage, days) {
  const gross = Math.round(dailyWage * days);
  const weeklyHol = Math.round(dailyWage * Math.floor(days / 5));
  const std = gross;
  const pension = Math.round(std * R.pension);
  const health = Math.round(std * R.health);
  const ltcare = Math.round(health * R.ltcare);
  const employ = Math.round(std * R.employ);
  const incomeTax = 0;   // 일당 = dailyWage ≤ 150,000 → 0
  const localTax = 0;
  const totalDed = pension + health + ltcare + employ + incomeTax + localTax;
  return {
    base_salary: gross, weekly_holiday_pay: weeklyHol, meal_allowance: 0,
    transportation_allowance: 0, standard_monthly_pay: std, gross_pay: gross,
    national_pension: pension, health_insurance: health, long_term_care: ltcare,
    employment_insurance: employ, income_tax: incomeTax, local_income_tax: localTax,
    total_deduction: totalDed, net_pay: gross - totalDed, work_days: days,
    total_work_hours: days * 8, hourly_wage: 0,
  };
}

// ── 주중(월~금) 날짜 목록 ──
function weekdays(y, m, n) {
  const out = [];
  for (let d = 1; d <= 31 && out.length < n; d++) {
    const dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1) break;
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) out.push(d);
  }
  return out;
}

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SCHED_MF = JSON.stringify([
  { day: 'mon', label: '월', active: true, shifts: [{ start: '09:00', end: '18:00', breaks: [{ s: '12:00', e: '13:00' }], brk_start: '12:00', brk_end: '13:00' }] },
  { day: 'tue', label: '화', active: true, shifts: [{ start: '09:00', end: '18:00', breaks: [{ s: '12:00', e: '13:00' }], brk_start: '12:00', brk_end: '13:00' }] },
  { day: 'wed', label: '수', active: true, shifts: [{ start: '09:00', end: '18:00', breaks: [{ s: '12:00', e: '13:00' }], brk_start: '12:00', brk_end: '13:00' }] },
  { day: 'thu', label: '목', active: true, shifts: [{ start: '09:00', end: '18:00', breaks: [{ s: '12:00', e: '13:00' }], brk_start: '12:00', brk_end: '13:00' }] },
  { day: 'fri', label: '금', active: true, shifts: [{ start: '09:00', end: '18:00', breaks: [{ s: '12:00', e: '13:00' }], brk_start: '12:00', brk_end: '13:00' }] },
  { day: 'sat', label: '토', active: false, shifts: [] },
  { day: 'sun', label: '일', active: false, shifts: [] },
]);

// ═══════════════════════════════════════════
// 1) 직원 (인사카드)
// ═══════════════════════════════════════════
const SAMPLES = [
  {
    id: 'sample-emp-fixed-01', name: '이지원', gender: 'female', empNo: '0041',
    category: 'fixed_term', phone: '010-7777-8801', email: 'jiwon.lee@example.com',
    idNumber: '940205-2', hire: '2025-08-01', dept: '생산팀', position: '사원',
    job: '제품 생산 및 포장 업무', bank: '국민은행', account: '123-45-67890',
  },
  {
    id: 'sample-emp-daily-ft-01', name: '박현수', gender: 'male', empNo: '0042',
    category: 'daily', phone: '010-7777-8802', email: 'hyunsoo.park@example.com',
    idNumber: '920514-1', hire: '2025-08-01', dept: '현장팀', position: '작업자',
    job: '현장 물류 및 설비 보조 업무', bank: '신한은행', account: '110-234-567890',
  },
  {
    id: 'sample-emp-daily-01', name: '최다솜', gender: 'female', empNo: '0043',
    category: 'daily', phone: '010-7777-8803', email: 'dasom.choi@example.com',
    idNumber: '960822-2', hire: '2025-08-01', dept: '청소팀', position: '작업자',
    job: '사업장 환경미화 업무', bank: '우리은행', account: '1002-345-678901',
  },
];

for (const s of SAMPLES) {
  db.run(`INSERT OR REPLACE INTO employees (id, company_id, name, gender, employment_category, employee_number,
    department, position, hire_date, status, note, id_number, phone, email, address, dependents,
    job_description, created_at, updated_at, is_representative, bank_name, bank_account, tax_dependents,
    marital_status, personnel_type, education, nationality)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [s.id, CO, s.name, s.gender, s.category, s.empNo, s.dept, s.position, s.hire, 'active',
      '샘플 데이터 (2026-09-11)', s.idNumber, s.phone, s.email, '서울특별시 강남구 테헤란로 100', 0,
      s.job, NOW, NOW, 0, s.bank, s.account, 0, '미혼', 'employee', '대졸', '내국인']);
}
console.log('직원 3명 생성 완료');

// ═══════════════════════════════════════════
// 2) 근로계약
// ═══════════════════════════════════════════
const CT_START = '2026-07-01';
const CT_END = '2026-12-31';
const HW = 11000;

function baseContract(ct) {
  return {
    company_id: CO, contract_start: CT_START, contract_end: CT_END,
    work_hours_per_day: 8, work_days_per_week: 5, work_days_per_month: 22,
    break_time: 1, annual_leave_days: 15,
    hourly_wage: HW, base_salary: Math.round(HW * 209), weekly_holiday_pay: Math.round(HW * 35),
    contract_type: ct.contract_type, status: 'active', pay_period: 'prev_month 1일부터 1개월간',
    insurance_employment: 'Y', insurance_industrial: 'Y', insurance_pension: 'Y', insurance_health: 'Y',
    pay_period_month: 'prev_month', pay_period_day: 20,
    is_draft: 0, created_reason: 'new', hire_reason: 'new_hire',
    employment_category: ct.contract_type,
    salary_start_date: CT_START, salary_end_date: CT_END,
    dismissal_notice_pay: 0, pre_used_annual_leave: 0, retention_cleared: 0,
    created_at: NOW, updated_at: NOW,
    signed_file_name: `${ct.empName}_근로계약서_날인본.png`, signed_file_data: TINY_PNG,
    consent_file_name: `${ct.empName}_개인정보동의서.png`, consent_file_data: TINY_PNG,
    daily_worker_type: null, daily_wage: null,
  };
}

const contracts = [
  Object.assign(baseContract({ contract_type: 'fixed_term', empName: '이지원' }), {
    id: 'sample-ct-fixed-01', employee_id: 'sample-emp-fixed-01',
    meal_allowance: 200000, meal_pay_type: 'fixed',
    transportation_allowance: 100000, transportation_pay_type: 'fixed',
    monthly_salary_agreed: Math.round(HW * 209) + 200000 + 100000,
    schedule_json: SCHED_MF, daily_worker_type: null,
  }),
  Object.assign(baseContract({ contract_type: 'daily', empName: '박현수' }), {
    id: 'sample-ct-daily-ft-01', employee_id: 'sample-emp-daily-ft-01',
    meal_allowance: 100000, meal_pay_type: 'fixed',
    transportation_allowance: 0, transportation_pay_type: 'fixed',
    monthly_salary_agreed: Math.round(HW * 209) + 100000,
    schedule_json: SCHED_MF, daily_worker_type: 'fulltime',
    daily_wage: Math.round(HW * 8),
  }),
  Object.assign(baseContract({ contract_type: 'daily', empName: '최다솜' }), {
    id: 'sample-ct-daily-01', employee_id: 'sample-emp-daily-01',
    meal_allowance: 0, meal_pay_type: 'fixed',
    transportation_allowance: 0, transportation_pay_type: 'fixed',
    monthly_salary_agreed: null, base_salary: null, weekly_holiday_pay: null,
    schedule_json: '', daily_worker_type: 'daily',
    daily_wage: Math.round(HW * 8),
  }),
];

const ctCols = Object.keys(contracts[0]).join(',');
for (const c of contracts) {
  const vals = Object.keys(c).map(k => c[k]);
  db.run(`INSERT OR REPLACE INTO contracts (${ctCols}) VALUES (${Object.keys(c).map(() => '?').join(',')})`, vals);
}
console.log('계약 3건 생성 완료');

// ═══════════════════════════════════════════
// 3) 급여 (2026-07, 2026-08)
// ═══════════════════════════════════════════
const PAY_SPECS = [
  { pid: 'sample-pay-fixed-07', emp: 'sample-emp-fixed-01', empNo: '0041', y: 2026, m: 7, alUsed: 3,
    calc: calcMonthly(HW, 200000, 100000, 22) },
  { pid: 'sample-pay-fixed-08', emp: 'sample-emp-fixed-01', empNo: '0041', y: 2026, m: 8, alUsed: 0,
    calc: calcMonthly(HW, 200000, 100000, 22) },
  { pid: 'sample-pay-ft-07', emp: 'sample-emp-daily-ft-01', empNo: '0042', y: 2026, m: 7, alUsed: 2,
    calc: calcDailyMonth(HW * 8, 22) },
  { pid: 'sample-pay-ft-08', emp: 'sample-emp-daily-ft-01', empNo: '0042', y: 2026, m: 8, alUsed: 0,
    calc: calcDailyMonth(HW * 8, 22) },
  { pid: 'sample-pay-daily-07', emp: 'sample-emp-daily-01', empNo: '0043', y: 2026, m: 7, alUsed: 2,
    calc: calcDailyMonth(HW * 8, 15) },
  { pid: 'sample-pay-daily-08', emp: 'sample-emp-daily-01', empNo: '0043', y: 2026, m: 8, alUsed: 0,
    calc: calcDailyMonth(HW * 8, 15) },
];

for (const p of PAY_SPECS) {
  const wds = weekdays(p.y, p.m, Math.round(p.calc.work_days));
  const dailyLog = p.emp === 'sample-emp-daily-01'
    ? JSON.stringify({ days: wds.map(d => ({ d, q: 1 })), unit: HW * 8 })
    : null;
  const row = {
    id: p.pid, employee_id: p.emp, company_id: CO,
    pay_year: p.y, pay_month: p.m, pay_date: fmtDate(p.y, p.m, 20),
    work_days: p.calc.work_days, base_salary: p.calc.base_salary,
    weekly_holiday_pay: p.calc.weekly_holiday_pay,
    standard_monthly_pay: p.calc.standard_monthly_pay,
    gross_pay: p.calc.gross_pay,
    national_pension: p.calc.national_pension, health_insurance: p.calc.health_insurance,
    long_term_care: p.calc.long_term_care, employment_insurance: p.calc.employment_insurance,
    income_tax: p.calc.income_tax, local_income_tax: p.calc.local_income_tax,
    total_deduction: p.calc.total_deduction, net_pay: p.calc.net_pay,
    is_draft: 0, note: '샘플 데이터', created_at: NOW, updated_at: NOW,
    total_work_hours: p.calc.total_work_hours,
    overtime_hours: 0, night_hours: 0, holiday_hours: 0,
    hourly_wage: p.calc.hourly_wage,
    meal_allowance: p.calc.meal_allowance, transportation_allowance: p.calc.transportation_allowance,
    annual_leave_used: p.alUsed, annual_leave_pay: 0,
    bonus_pay: 0, performance_pay: 0, employee_number: p.empNo,
    daily_work_log: dailyLog,
  };
  const cols = Object.keys(row).join(',');
  db.run(`INSERT OR REPLACE INTO payrolls (${cols}) VALUES (${Object.keys(row).map(() => '?').join(',')})`, Object.keys(row).map(k => row[k]));
}
console.log('급여 6건 생성 완료');

// ═══════════════════════════════════════════
// 4) 근태 관리대장
// ═══════════════════════════════════════════
function insertAttendance(id, emp, entries, absent, late, early) {
  db.run(`INSERT OR REPLACE INTO attendance_ledger (id, employee_id, company_id, year, month_data,
    total_absent_days, total_late_count, total_earlyleave_count, note, created_at, updated_at, contract_id, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, emp, CO, 2026, JSON.stringify(entries), absent, late, early, '', NOW, NOW, null, 'active']);
}
insertAttendance('sample-att-fixed-01', 'sample-emp-fixed-01', [
  { date: '2026-08-05', type: 'late', time: '09:18' },
  { date: '2026-08-21', type: 'earlyleave', time: '17:05' },
  { date: '2026-09-10', type: 'absent', absentType: 'sick_unpaid' },
], 1, 1, 1);
insertAttendance('sample-att-ft-01', 'sample-emp-daily-ft-01', [
  { date: '2026-08-04', type: 'late', time: '09:22' },
], 0, 1, 0);
console.log('근태 관리대장 생성 완료');

// ═══════════════════════════════════════════
// 5) 연차 관리대장
// ═══════════════════════════════════════════
function monthData(usedByMonth) {
  const out = [];
  for (let m = 1; m <= 12; m++) out.push({ month: m, dates: usedByMonth[m]?.dates || '', days: usedByMonth[m]?.days || 0, note: '' });
  return JSON.stringify(out);
}
function insertAnnual(id, emp, ctId, total, used, usedByMonth) {
  const remain = total - used;
  const ordinary = HW * 8;
  db.run(`INSERT OR REPLACE INTO annual_leave_ledger (id, employee_id, company_id, year, ref_date,
    period_start, period_end, total_days, carryover_days, month_data, total_used, remain_days,
    ordinary_wage, leave_pay_estimate, created_at, updated_at, contract_id, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, emp, CO, 2026, '2026-01-01', '2026-01-01', '2026-12-31', total, 0, monthData(usedByMonth),
      used, remain, ordinary, ordinary * remain, NOW, NOW, ctId, 'active']);
}
insertAnnual('sample-al-fixed-01', 'sample-emp-fixed-01', 'sample-ct-fixed-01', 15, 3, {
  7: { dates: '27일, 29~30일', days: 3 },
});
insertAnnual('sample-al-ft-01', 'sample-emp-daily-ft-01', 'sample-ct-daily-ft-01', 15, 2, {
  7: { dates: '21일, 23일', days: 2 },
});
insertAnnual('sample-al-daily-01', 'sample-emp-daily-01', 'sample-ct-daily-01', 15, 2, {
  7: { dates: '14일, 16일', days: 2 },
});
console.log('연차 관리대장 생성 완료');

// ═══════════════════════════════════════════
// 6) 사원번호 원장
// ═══════════════════════════════════════════
for (const s of SAMPLES) {
  db.run(`INSERT OR REPLACE INTO employee_number_ledger (id, company_id, employee_number, employee_id,
    source_type, status, voided_reason, assigned_at, voided_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [`sample-eln-${s.empNo}`, CO, String(parseInt(s.empNo, 10)), s.id, 'employee', 'used', null, NOW, null, NOW, NOW]);
}
console.log('사원번호 원장 생성 완료');

// ═══════════════════════════════════════════
// 검증 출력
// ═══════════════════════════════════════════
const check = db.all(`SELECT p.employee_id, p.pay_year, p.pay_month, p.base_salary, p.weekly_holiday_pay,
  p.standard_monthly_pay, p.gross_pay, p.total_deduction, p.net_pay,
  p.national_pension, p.health_insurance, p.long_term_care, p.employment_insurance, p.income_tax, p.local_income_tax
  FROM payrolls p WHERE p.id LIKE 'sample-pay-%' ORDER BY p.employee_id, p.pay_month`);
console.log(JSON.stringify(check, null, 1));
