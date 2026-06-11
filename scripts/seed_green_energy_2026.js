/**
 * 그린에너지 주식회사 (comp05) — 2026-06-03 근로계약 5명 시드 데이터 생성
 *
 * 고용형태 5종:
 *   1. 정규직       — 이강산 (남)
 *   2. 정규직 수습  — 오하늘 (여)
 *   3. 계약직       — 한바다 (남)
 *   4. 계약직 수습  — 윤서진 (여)
 *   5. 일용직       — 장민호 (남)
 *
 * 2026년 최저임금: 시급 10,320원, 월 2,156,880원
 */

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');
const db      = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const CO_ID       = 'comp05';
const START_DATE  = '2026-06-03';
const NOW         = Date.now();

// 더미 파일 데이터 (1×1 투명 PNG)
const DUMMY_IMG   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// 기존 최대 사원번호 계산
const existingEmps = db.employees.filter(e => e.company_id === CO_ID);
const maxEmpNo     = existingEmps
  .map(e => parseInt(e.employee_number) || 0)
  .reduce((a, b) => Math.max(a, b), 0);

// 스케줄 JSON (월~금 09:00~18:00, 휴게 60분)
const defaultSchedule = ['mon','tue','wed','thu','fri'].map(day => ({
  day,
  start: '09:00',
  end: '18:00',
  break_minutes: 60,
}));

// 최저임금 기준 계산 (2026)
const MIN_HOURLY = 10320;

// ─── 공통 계약 필드 빌더 ───
function makeContract(id, empId, type, overrides = {}) {
  const base = {
    id,
    employee_id:              empId,
    company_id:               CO_ID,
    contract_start:           START_DATE,
    contract_end:             '',
    contract_type:            type,
    status:                   '활성',
    work_hours_per_day:       8,
    work_days_per_week:       5,
    work_days_per_month:      22,
    break_time:               60,
    annual_leave_days:        15,
    schedule_json:            JSON.stringify(defaultSchedule),
    annual_salary:            0,
    monthly_salary_agreed:    0,
    base_salary:              0,
    daily_wage:               0,
    weekly_holiday_pay:       0,
    hourly_wage:              0,
    position_allowance:       0,
    transportation_allowance: 0,
    transportation_pay_type:  'fixed',
    self_driving_allowance:   0,
    self_driving_pay_type:    'fixed',
    remote_area_allowance:    0,
    remote_area_pay_type:     'fixed',
    meal_allowance:           200000,
    meal_pay_type:            'fixed',
    childcare_allowance:      0,
    research_allowance:       0,
    research_pay_type:        'fixed',
    site_allowance:           0,
    skill_allowance:          0,
    license_allowance:        0,
    communication_allowance:  0,
    communication_pay_type:   'fixed',
    fitness_allowance:        0,
    fitness_pay_type:         'receipt',  // 그린에너지 allowance_config 기준
    self_dev_allowance:       0,
    self_dev_pay_type:        'fixed',
    book_allowance:           0,
    book_pay_type:            'fixed',
    overseas_allowance:       0,
    overseas_pay_type:        'fixed',
    other_allowance:          0,
    car_maintenance:          0,
    insurance_employment:     true,
    insurance_industrial:     true,
    insurance_pension:        true,
    insurance_health:         true,
    probation_months:         0,
    probation_pct:            null,
    probation_amt:            null,
    probation_basis:          null,
    salary_start_date:        START_DATE,
    salary_end_date:          '',
    is_draft:                 false,
    is_voided_by_amend:       false,
    voided_at:                null,
    terminate_date:           '',
    note:                     '',
    signed_file_name:         '',
    signed_file_data:         DUMMY_IMG,
    consent_file_name:        '',
    consent_file_data:        DUMMY_IMG,
    gs_project_id:            '1720d1bf-4604-4462-bb70-daa3bc8a9f7d',
    gs_table_name:            'contracts',
    created_at:               NOW,
    updated_at:               NOW,
  };
  return Object.assign(base, overrides);
}

// ─── 직원 데이터 ───
const employees = [
  // 1. 정규직 — 이강산
  {
    id:                  'emp05_new01',
    company_id:          CO_ID,
    name:                '이강산',
    gender:              '남',
    employment_category: '정규직',
    employee_number:     String(maxEmpNo + 1).padStart(4, '0'),
    job_description:     '신재생에너지 설비 운영',
    id_number:           '850312-1',
    department:          '운영팀',
    position:            '대리',
    hire_date:           START_DATE,
    expire_date:         '',
    status:              '재직',
    dependents:          2,
    phone:               '010-1111-2201',
    email:               'kangsanlee@greenenergy.co.kr',
    address:             '대전광역시 유성구 봉명동 123-1',
    bank_name:           '국민은행',
    bank_account:        '12345678901234',
    note:                '',
    gs_project_id:       '1720d1bf-4604-4462-bb70-daa3bc8a9f7d',
    gs_table_name:       'employees',
    created_at:          NOW,
    updated_at:          NOW,
  },
  // 2. 정규직 수습 — 오하늘
  {
    id:                  'emp05_new02',
    company_id:          CO_ID,
    name:                '오하늘',
    gender:              '여',
    employment_category: '정규직 수습',
    employee_number:     String(maxEmpNo + 2).padStart(4, '0'),
    job_description:     '태양광 발전 모니터링',
    id_number:           '990715-2',
    department:          '기술팀',
    position:            '사원',
    hire_date:           START_DATE,
    expire_date:         '',
    status:              '재직',
    dependents:          1,
    phone:               '010-1111-2202',
    email:               'haneuloo@greenenergy.co.kr',
    address:             '대전광역시 서구 둔산동 456-2',
    bank_name:           '신한은행',
    bank_account:        '11022334455667',
    note:                '',
    gs_project_id:       '1720d1bf-4604-4462-bb70-daa3bc8a9f7d',
    gs_table_name:       'employees',
    created_at:          NOW,
    updated_at:          NOW,
  },
  // 3. 계약직 — 한바다
  {
    id:                  'emp05_new03',
    company_id:          CO_ID,
    name:                '한바다',
    gender:              '남',
    employment_category: '계약직',
    employee_number:     String(maxEmpNo + 3).padStart(4, '0'),
    job_description:     '풍력터빈 유지보수',
    id_number:           '921028-1',
    department:          '시설팀',
    position:            '계약직',
    hire_date:           START_DATE,
    expire_date:         '2027-06-02',
    status:              '재직',
    dependents:          1,
    phone:               '010-1111-2203',
    email:               'badahan@greenenergy.co.kr',
    address:             '대전광역시 동구 삼성동 789-3',
    bank_name:           '하나은행',
    bank_account:        '22033445566778',
    note:                '',
    gs_project_id:       '1720d1bf-4604-4462-bb70-daa3bc8a9f7d',
    gs_table_name:       'employees',
    created_at:          NOW,
    updated_at:          NOW,
  },
  // 4. 계약직 수습 — 윤서진
  {
    id:                  'emp05_new04',
    company_id:          CO_ID,
    name:                '윤서진',
    gender:              '여',
    employment_category: '계약직 수습',
    employee_number:     String(maxEmpNo + 4).padStart(4, '0'),
    job_description:     '에너지 데이터 분석',
    id_number:           '001203-4',
    department:          '기술팀',
    position:            '계약직',
    hire_date:           START_DATE,
    expire_date:         '2027-06-02',
    status:              '재직',
    dependents:          1,
    phone:               '010-1111-2204',
    email:               'seojinyoon@greenenergy.co.kr',
    address:             '대전광역시 중구 은행동 321-4',
    bank_name:           '우리은행',
    bank_account:        '33044556677889',
    note:                '',
    gs_project_id:       '1720d1bf-4604-4462-bb70-daa3bc8a9f7d',
    gs_table_name:       'employees',
    created_at:          NOW,
    updated_at:          NOW,
  },
  // 5. 일용직 — 장민호
  {
    id:                  'emp05_new05',
    company_id:          CO_ID,
    name:                '장민호',
    gender:              '남',
    employment_category: '일용직',
    employee_number:     String(maxEmpNo + 5).padStart(4, '0'),
    job_description:     '태양광 패널 설치 보조',
    id_number:           '880420-1',
    department:          '시설팀',
    position:            '일용직',
    hire_date:           START_DATE,
    expire_date:         '2026-12-31',
    status:              '재직',
    dependents:          1,
    phone:               '010-1111-2205',
    email:               'minhojang@greenenergy.co.kr',
    address:             '대전광역시 대덕구 신탄진동 654-5',
    bank_name:           '농협은행',
    bank_account:        '44055667788990',
    note:                '',
    gs_project_id:       '1720d1bf-4604-4462-bb70-daa3bc8a9f7d',
    gs_table_name:       'employees',
    created_at:          NOW,
    updated_at:          NOW,
  },
];

// ─── 임금 계산 ───
// 정규직: 연봉 36,000,000 → 월 3,000,000 / 기본급: (3,000,000 - 200,000) × 5/6 = 2,333,333
//         주휴: 2,333,333 / 5 = 466,667 / 시급: 3,000,000 / 209 = 14,354
const reg_annual   = 36_000_000;
const reg_monthly  = Math.round(reg_annual / 12);           // 3,000,000
const reg_meal     = 200_000;
const reg_base     = Math.round((reg_monthly - reg_meal) * 5 / 6);  // 2,333,333
const reg_weekly   = Math.round(reg_base / 5);              // 466,667
const reg_hourly   = Math.round(reg_monthly / 209);         // 14,354

// 정규직 수습: 연봉 30,000,000 → 월 2,500,000
//   수습 90% 적용: 월 2,250,000 / 시급 10,766 > 9,288 ✅
const prob_reg_annual  = 30_000_000;
const prob_reg_monthly = Math.round(prob_reg_annual / 12);  // 2,500,000
const prob_reg_meal    = 200_000;
const prob_reg_base    = Math.round((prob_reg_monthly - prob_reg_meal) * 5 / 6);  // 1,916,667
const prob_reg_weekly  = Math.round(prob_reg_base / 5);     // 383,333
const prob_reg_hourly  = Math.round(prob_reg_monthly / 209); // 11,962
const prob_reg_amt     = Math.round(prob_reg_monthly * 0.9); // 2,250,000

// 계약직: 월 약정급여 2,500,000 / 기본급: (2,500,000 - 200,000) × 5/6 = 1,916,667
const fixed_monthly  = 2_500_000;
const fixed_meal     = 200_000;
const fixed_base     = Math.round((fixed_monthly - fixed_meal) * 5 / 6);  // 1,916,667
const fixed_weekly   = Math.round(fixed_base / 5);          // 383,333
const fixed_hourly   = Math.round(fixed_monthly / 209);     // 11,962

// 계약직 수습: 월 약정급여 2,300,000 / 수습 90% → 2,070,000 / 시급 10,096 < 최저임금 초과
// → 시급 보정: 최저 시급 10,320 × 90% = 9,288 / 2,300,000 / 209 = 11,005 ✅
const prob_fixed_monthly = 2_300_000;
const prob_fixed_meal    = 200_000;
const prob_fixed_base    = Math.round((prob_fixed_monthly - prob_fixed_meal) * 5 / 6); // 1,750,000
const prob_fixed_weekly  = Math.round(prob_fixed_base / 5);  // 350,000
const prob_fixed_hourly  = Math.round(prob_fixed_monthly / 209); // 11,005
const prob_fixed_amt     = Math.round(prob_fixed_monthly * 0.9); // 2,070,000

// 일용직: 일급 100,000 / 시급: 100,000 / 8 = 12,500
const daily_wage   = 100_000;
const daily_hourly = Math.round(daily_wage / 8);             // 12,500

// ─── 계약 데이터 ───
const contracts = [
  // 1. 정규직
  makeContract('ct05_new01', 'emp05_new01', '정규직', {
    annual_salary:         reg_annual,
    monthly_salary_agreed: reg_monthly,
    base_salary:           reg_base,
    weekly_holiday_pay:    reg_weekly,
    hourly_wage:           reg_hourly,
    meal_allowance:        reg_meal,
    meal_pay_type:         'fixed',
    signed_file_name:      '이강산_근로계약서_날인본.png',
    consent_file_name:     '이강산_개인정보동의서.png',
    note:                  '정규직 신규 계약 (2026-06-03)',
    status:                '활성',
  }),

  // 2. 정규직 수습 (수습 3개월, 90%)
  makeContract('ct05_new02', 'emp05_new02', '정규직 수습', {
    annual_salary:         prob_reg_annual,
    monthly_salary_agreed: prob_reg_monthly,
    base_salary:           prob_reg_base,
    weekly_holiday_pay:    prob_reg_weekly,
    hourly_wage:           prob_reg_hourly,
    meal_allowance:        prob_reg_meal,
    meal_pay_type:         'fixed',
    probation_months:      3,
    probation_pct:         90,
    probation_amt:         prob_reg_amt,
    probation_basis:       'salary',
    signed_file_name:      '오하늘_근로계약서_날인본.png',
    consent_file_name:     '오하늘_개인정보동의서.png',
    note:                  '정규직 수습 신규 계약 (2026-06-03, 수습 3개월 90%)',
    status:                '활성',
  }),

  // 3. 계약직 (1년 계약)
  makeContract('ct05_new03', 'emp05_new03', '계약직', {
    contract_end:          '2027-06-02',
    salary_end_date:       '2027-06-02',
    monthly_salary_agreed: fixed_monthly,
    base_salary:           fixed_base,
    weekly_holiday_pay:    fixed_weekly,
    hourly_wage:           fixed_hourly,
    meal_allowance:        fixed_meal,
    meal_pay_type:         'fixed',
    signed_file_name:      '한바다_근로계약서_날인본.png',
    consent_file_name:     '한바다_개인정보동의서.png',
    note:                  '계약직 1년 계약 (2026-06-03 ~ 2027-06-02)',
    status:                '활성',
  }),

  // 4. 계약직 수습 (1년 계약, 수습 3개월 90%)
  makeContract('ct05_new04', 'emp05_new04', '계약직 수습', {
    contract_end:          '2027-06-02',
    salary_end_date:       '2027-06-02',
    monthly_salary_agreed: prob_fixed_monthly,
    base_salary:           prob_fixed_base,
    weekly_holiday_pay:    prob_fixed_weekly,
    hourly_wage:           prob_fixed_hourly,
    meal_allowance:        prob_fixed_meal,
    meal_pay_type:         'fixed',
    probation_months:      3,
    probation_pct:         90,
    probation_amt:         prob_fixed_amt,
    probation_basis:       'salary',
    signed_file_name:      '윤서진_근로계약서_날인본.png',
    consent_file_name:     '윤서진_개인정보동의서.png',
    note:                  '계약직 수습 1년 계약 (2026-06-03 ~ 2027-06-02, 수습 3개월 90%)',
    status:                '활성',
  }),

  // 5. 일용직 (기간 ~2026-12-31)
  makeContract('ct05_new05', 'emp05_new05', '일용직', {
    contract_end:          '2026-12-31',
    salary_end_date:       '2026-12-31',
    work_days_per_week:    0,
    annual_leave_days:     0,
    daily_wage:            daily_wage,
    hourly_wage:           daily_hourly,
    base_salary:           0,
    weekly_holiday_pay:    0,
    meal_allowance:        0,
    signed_file_name:      '장민호_근로계약서_날인본.png',
    consent_file_name:     '장민호_개인정보동의서.png',
    note:                  '일용직 계약 (2026-06-03 ~ 2026-12-31, 일급 100,000원)',
    status:                '활성',
  }),
];

// ─── DB에 추가 ───
employees.forEach(emp => db.employees.push(emp));
contracts.forEach(ct  => db.contracts.push(ct));

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

// ─── 결과 출력 ───
console.log('✅ 그린에너지 신규 데이터 삽입 완료\n');
employees.forEach((e, i) => {
  const c = contracts[i];
  const cat = e.employment_category;
  const wage = cat === '일용직'
    ? `일급 ${c.daily_wage.toLocaleString()}원 (시급 ${c.hourly_wage.toLocaleString()}원)`
    : cat.includes('수습')
      ? `월 ${c.monthly_salary_agreed.toLocaleString()}원 / 수습 ${c.probation_amt.toLocaleString()}원 (${c.probation_pct}%)`
      : `월 ${c.monthly_salary_agreed.toLocaleString()}원`;
  console.log(`  ${i+1}. [${cat.padEnd(7)}] ${e.name} (${e.employee_number}) — ${wage}`);
});
