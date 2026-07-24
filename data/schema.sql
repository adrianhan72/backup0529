-- =============================================================================
-- 인사톡 노무톡 — SQLite Schema (한글 주석 포함)
-- node dump_schema.js 로 자동 생성 (ALTER TABLE 반영)
-- 최종 갱신: 2026-07-24
-- 테이블 수: 25개
-- =============================================================================

PRAGMA journal_mode = WAL;

-- =============================================================================
-- SECTION 1: 기본정보 (회사, 직원, 관리자, 계약)
-- =============================================================================

-- admin_accounts  -- 관리자 계정
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY, --  -- UUID
  username TEXT, --  -- 아이디
  password TEXT, --  -- 비밀번호 (해시)
  display_name TEXT, --  -- 표시이름
  created_at_label TEXT, --  -- created at 표시명
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- companies  -- 고객사 (회사 기본정보)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY, --  -- UUID
  company_name TEXT, --  -- 회사명
  business_number TEXT, --  -- 사업자등록번호
  representative TEXT, --  -- 대표자명
  industry TEXT, --  -- 업종
  address TEXT, --  -- 주소
  phone TEXT, --  -- 대표전화번호
  email TEXT, --  -- 대표이메일
  pay_period TEXT, --  -- 급여 산정기간 (예: 당월 25일부터 1개월간)
  pay_day INTEGER, --  -- 급여 지급일
  access_code TEXT, --  -- 고객사 앱 접근 코드
  note TEXT, --  -- 비고
  insurance_basis TEXT, --  -- 4대보험 가입기준
  annual_leave_basis TEXT, --  -- 연차 산정 기준
  is_draft INTEGER DEFAULT 0, --  -- 임시저장 여부 (0:정식등록, 1:임시)
  draft_saved_at TEXT, --  -- 임시저장 일시
  status TEXT DEFAULT 'active', --  -- 상태 (active:이용중, inactive:해지, draft:임시저장)
  allowance_config TEXT, --  -- 수당 설정 (JSON)
  created_at INTEGER, --  -- 생성일시 (unix ms)
  updated_at INTEGER, --  -- 수정일시 (unix ms)
  service_contract_file_name TEXT, --  -- 자문계약서 파일명
  service_contract_file_data TEXT, --  -- 자문계약서 파일 데이터
  contract_start_date TEXT, --  -- 자문계약 시작일
  pay_period_month TEXT, --  -- 급여 산정기준월 (당월/전월)
  pay_period_day INTEGER, --  -- 급여 산정기준일
  contract_end_date TEXT, --  -- 자문계약 종료일
  representatives TEXT, --  -- 대표자 정보 (JSON, 복수 가능)
  sick_leave_pay_rate REAL DEFAULT 0 --  -- 병가 유급비율 (%, 0=무급)
);

-- contracts  -- 근로계약
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY, --  -- UUID
  employee_id TEXT, --  -- 직원 ID → employees.id
  company_id TEXT, --  -- 회사 ID → companies.id
  contract_start TEXT, --  -- 계약 시작일
  contract_end TEXT, --  -- 계약 종료일
  work_hours_per_day REAL, --  -- 일 소정근로시간
  work_days_per_week REAL, --  -- 주 소정근로일수
  work_days_per_month REAL, --  -- work 일수 per 월
  break_time REAL, --  -- 휴게시간
  annual_leave_days REAL, --  -- annual leave 일수
  monthly_salary_agreed REAL, --  -- 월 약정임금
  annual_salary REAL, --  -- 연봉
  base_salary REAL, --  -- 기본급
  hourly_wage REAL, --  -- 통상시급
  weekly_holiday_pay REAL, --  -- weekly 휴일근로 pay
  contract_type TEXT, --  -- 계약 유형 (regular/fixed_term/regular_probation/fixed_term_probation/daily)
  status TEXT DEFAULT 'active', --  -- 계약 상태
  pay_period TEXT, --  -- 급여 산정기간
  meal_allowance REAL, --  -- 식대
  meal_pay_type TEXT, --  -- meal pay 유형
  transportation_allowance REAL, --  -- transportation 수당
  transport_pay_type TEXT, --  -- transport pay 유형
  research_allowance REAL, --  -- research 수당
  research_pay_type TEXT, --  -- research pay 유형
  communication_allowance REAL, --  -- communication 수당
  communication_pay_type TEXT, --  -- communication pay 유형
  fitness_allowance REAL, --  -- fitness 수당
  fitness_pay_type TEXT, --  -- fitness pay 유형
  self_dev_allowance REAL, --  -- self dev 수당
  self_dev_pay_type TEXT, --  -- self dev pay 유형
  book_allowance REAL, --  -- book 수당
  book_pay_type TEXT, --  -- book pay 유형
  overseas_allowance REAL, --  -- overseas 수당
  overseas_pay_type TEXT, --  -- overseas pay 유형
  insurance_employment TEXT, --  -- 보험 employment
  insurance_industrial TEXT, --  -- 보험 industrial
  insurance_pension TEXT, --  -- 보험 pension
  insurance_health TEXT, --  -- 보험 health
  fixed_ot_pay REAL, --  -- fixed ot pay
  fixed_ot_hours REAL, --  -- fixed ot 시간
  fixed_night_pay REAL, --  -- fixed 야간근로 pay
  fixed_night_hours REAL, --  -- fixed 야간근로 시간
  fixed_hol_pay REAL, --  -- fixed hol pay
  fixed_hol_hours REAL, --  -- fixed hol 시간
  probation_months INTEGER, --  -- 수습기간 (개월)
  probation_pct REAL, --  -- 수습 임금 비율 (%)
  probation_amt REAL, --  -- 수습 임금 월 금액
  probation_basis TEXT, --  -- 수습 기준
  amended_from TEXT, --  -- 수정 from
  is_voided_by_amend INTEGER DEFAULT 0, --  -- 수정계약으로 파기 여부
  voided_at TEXT, --  -- 파기 at
  signed_file_name TEXT, --  -- signed file 이름
  signed_file_data TEXT, --  -- signed file data
  consent_file_name TEXT, --  -- consent file 이름
  consent_file_data TEXT, --  -- consent file data
  salary_start_date TEXT, --  -- 급여 산정 시작일
  salary_end_date TEXT, --  -- 급여 산정 종료일
  is_draft INTEGER DEFAULT 0, --  -- 임시저장 여부
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  pay_day INTEGER, --  -- 급여 지급일
  schedule_json TEXT, --  -- 근무시간표 (JSON)
  daily_wage REAL, --  -- 일급여
  position_allowance REAL, --  -- position 수당
  skill_allowance REAL, --  -- skill 수당
  license_allowance REAL, --  -- license 수당
  site_allowance REAL, --  -- site 수당
  self_driving_allowance REAL, --  -- self driving 수당
  self_driving_pay_type TEXT, --  -- self driving pay 유형
  remote_area_allowance REAL, --  -- remote area 수당
  remote_area_pay_type TEXT, --  -- remote area pay 유형
  car_maintenance REAL, --  -- car maintenance
  regular_bonus REAL, --  -- regular 상여금
  childcare_allowance REAL, --  -- childcare 수당
  childcare_dependents INTEGER, --  -- childcare 부양가족 수
  childcare_pay_type TEXT, --  -- childcare pay 유형
  contract_etc_allowance REAL, --  -- contract etc 수당
  etc_allowance REAL, --  -- etc 수당
  etc_allowance_memo TEXT, --  -- etc 수당 memo
  draft_saved_at INTEGER, --  -- 임시저장 일시
  edit_source_id TEXT, --  -- edit source 고유식별자
  employment_category TEXT, --  -- 고용형태
  transport_type TEXT, --  -- transport 유형
  transportation_pay_type TEXT, --  -- transportation pay 유형
  pay_period_month TEXT, --  -- 급여 산정기준월
  pay_period_day INTEGER, --  -- 급여 산정기준일
  terminate_date TEXT, --  -- terminate 일자
  renewed_from_id TEXT, --  -- 갱신 from 고유식별자
  renewed_to_id TEXT, --  -- 갱신 to 고유식별자
  hazard_allowance REAL, --  -- hazard 수당
  custom_ordinary_values TEXT, --  -- custom ordinary values
  probation_end_date TEXT --  -- 수습 종료 일자
);

CREATE INDEX IF NOT EXISTS idx_contracts_employee ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company  ON contracts(company_id);

-- employees  -- 직원 (근로자 기본정보)
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY, --  -- UUID
  company_id TEXT, --  -- 소속 회사 ID → companies.id
  name TEXT, --  -- 이름
  gender TEXT, --  -- 성별 (male/female)
  employment_category TEXT, --  -- 고용형태 구분
  employee_number TEXT, --  -- 사원번호
  department TEXT, --  -- 부서
  position TEXT, --  -- position
  hire_date TEXT, --  -- 입사일
  contract_period TEXT, --  -- contract period
  status TEXT DEFAULT 'active', --  -- 상태 (active:재직, resigned:퇴직)
  note TEXT, --  -- 비고
  id_number TEXT, --  -- 주민등록번호
  phone TEXT, --  -- 휴대전화번호
  email TEXT, --  -- 이메일
  address TEXT, --  -- 주소
  dependents INTEGER DEFAULT 0, --  -- 부양가족 수
  job_description TEXT, --  -- job description
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  is_representative INTEGER DEFAULT 0, --  -- is 대표자
  bank_name TEXT, --  -- 은행명
  bank_account TEXT, --  -- 계좌번호
  expire_date TEXT, --  -- 만료 일자
  tax_dependents INTEGER DEFAULT 0 --  -- 세금 부양가족 수
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

-- registered_executives
CREATE TABLE IF NOT EXISTS registered_executives (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT NOT NULL,
  bank_name TEXT,
  bank_account TEXT,
  bank_holder TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_registered_executives_company ON registered_executives(company_id);

-- related_party_workers
CREATE TABLE IF NOT EXISTS related_party_workers (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT NOT NULL,
  bank_name TEXT,
  bank_account TEXT,
  bank_holder TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_related_party_workers_company ON related_party_workers(company_id);

-- representative_contact
CREATE TABLE IF NOT EXISTS representative_contact (
  id TEXT PRIMARY KEY,
  phone TEXT,
  email TEXT,
  fax TEXT,
  updated_at INTEGER,
  outbound_email TEXT DEFAULT NULL,
  outbound_password TEXT DEFAULT NULL,
  outbound_smtp_host TEXT DEFAULT NULL,
  outbound_smtp_port TEXT DEFAULT NULL,
  msg_body_rules TEXT DEFAULT NULL
);

-- =============================================================================
-- SECTION 2: 급여 및 근태
-- =============================================================================

-- annual_leave_ledger  -- 연차 관리대장
CREATE TABLE IF NOT EXISTS annual_leave_ledger (
  id TEXT PRIMARY KEY, --  -- UUID
  employee_id TEXT, --  -- 직원 ID
  company_id TEXT, --  -- 회사 ID
  year INTEGER, --  -- 기준연도
  ref_date TEXT, --  -- 기준일자
  period_start TEXT, --  -- 기간 시작일
  period_end TEXT, --  -- 기간 종료일
  total_days REAL, --  -- 연간 총 연차일수
  carryover_days REAL DEFAULT 0, --  -- 이월 일수
  month_data TEXT, --  -- 월별 연차 사용 데이터 (JSON)
  total_used REAL, --  -- 사용 연차일수
  remain_days REAL, --  -- 잔여 연차일수
  ordinary_wage REAL, --  -- 통상임금
  leave_pay_estimate REAL, --  -- leave pay estimate
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  contract_id TEXT, --  -- 계약 ID
  status TEXT --  -- 상태
);

-- annual_leave_promotions
CREATE TABLE IF NOT EXISTS annual_leave_promotions (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  employee_name TEXT,
  company_id TEXT,
  company_name TEXT,
  contract_type TEXT,
  total_leave_days REAL,
  used_leave_days REAL,
  remaining_leave_days REAL,
  annual_leave_basis TEXT,
  leave_pay_estimate REAL,
  worker_send_method TEXT,
  sent_at TEXT,
  sent_by TEXT,
  note TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- attendance_ledger  -- 근태 관리대장 (결근·지각·조퇴, 보존년한 5년)
CREATE TABLE IF NOT EXISTS attendance_ledger (
  id TEXT PRIMARY KEY, --  -- UUID
  employee_id TEXT, --  -- 직원 ID
  company_id TEXT, --  -- 회사 ID
  year INTEGER, --  -- 기준연도
  month_data TEXT, --  -- 월별 근태 데이터 (JSON)
  total_absent_days REAL DEFAULT 0, --  -- 연간 총 결근일수
  total_late_count INTEGER DEFAULT 0, --  -- 연간 총 지각 횟수
  total_earlyleave_count INTEGER DEFAULT 0, --  -- 연간 총 조퇴 횟수
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  contract_id TEXT, --  -- 관련 계약 ID
  status TEXT --  -- 상태
);

-- payroll_items
CREATE TABLE IF NOT EXISTS payroll_items (
  id TEXT PRIMARY KEY,
  payroll_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  amount REAL DEFAULT 0,
  pay_type TEXT,
  memo TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll ON payroll_items(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_type ON payroll_items(item_type);

-- payroll_send_logs  -- 급여명세서 발송 이력
CREATE TABLE IF NOT EXISTS payroll_send_logs (
  id TEXT PRIMARY KEY, --  -- UUID
  company_id TEXT, --  -- 회사 ID
  employee_id TEXT, --  -- 직원 ID
  payroll_id TEXT, --  -- 급여대장 ID
  pay_year INTEGER, --  -- 급여 연도
  pay_month INTEGER, --  -- 급여 월
  sent_at TEXT, --  -- sent at
  sent_by TEXT, --  -- sent by
  send_method TEXT, --  -- send 방식
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- payrolls  -- 급여대장
CREATE TABLE IF NOT EXISTS payrolls (
  id TEXT PRIMARY KEY, --  -- UUID
  employee_id TEXT, --  -- 직원 ID
  company_id TEXT, --  -- 회사 ID
  pay_year INTEGER, --  -- 급여 연도
  pay_month INTEGER, --  -- 급여 월
  pay_date TEXT, --  -- 급여 지급일
  work_days REAL, --  -- 근무일수
  base_salary REAL, --  -- 기본급
  weekly_holiday_pay REAL, --  -- weekly 휴일근로 pay
  standard_monthly_pay REAL, --  -- standard monthly pay
  gross_pay REAL, --  -- gross pay
  national_pension REAL, --  -- national pension
  health_insurance REAL, --  -- health 보험
  long_term_care REAL, --  -- long term care
  employment_insurance REAL, --  -- employment 보험
  income_tax REAL, --  -- income 세금
  local_income_tax REAL, --  -- local income 세금
  total_deduction REAL, --  -- 합계 공제
  net_pay REAL, --  -- net pay
  is_draft INTEGER DEFAULT 0, --  -- 임시저장 여부
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  total_work_hours REAL, --  -- 합계 work 시간
  overtime_hours REAL, --  -- 연장근로 시간
  night_hours REAL, --  -- 야간근로 시간
  holiday_hours REAL, --  -- 휴일근로 시간
  hourly_wage REAL, --  -- 통상시급
  position_allowance REAL, --  -- position 수당
  skill_allowance REAL, --  -- skill 수당
  license_allowance REAL, --  -- license 수당
  overtime_pay REAL, --  -- 연장근로 pay
  night_pay REAL, --  -- 야간근로 pay
  holiday_pay REAL, --  -- 휴일근로 pay
  transport_type TEXT, --  -- transport 유형
  transport_pay_type TEXT, --  -- transport pay 유형
  transportation_allowance REAL, --  -- transportation 수당
  transportation_pay_type TEXT, --  -- transportation pay 유형
  self_driving_allowance REAL, --  -- self driving 수당
  self_driving_pay_type TEXT, --  -- self driving pay 유형
  meal_allowance REAL, --  -- meal 수당
  meal_pay_type TEXT, --  -- meal pay 유형
  childcare_allowance REAL, --  -- childcare 수당
  childcare_pay_type TEXT, --  -- childcare pay 유형
  childcare_dependents INTEGER DEFAULT 1, --  -- childcare 부양가족 수
  research_allowance REAL, --  -- research 수당
  research_pay_type TEXT, --  -- research pay 유형
  communication_allowance REAL, --  -- communication 수당
  communication_pay_type TEXT, --  -- communication pay 유형
  fitness_allowance REAL, --  -- fitness 수당
  fitness_pay_type TEXT, --  -- fitness pay 유형
  self_dev_allowance REAL, --  -- self dev 수당
  self_dev_pay_type TEXT, --  -- self dev pay 유형
  book_allowance REAL, --  -- book 수당
  book_pay_type TEXT, --  -- book pay 유형
  overseas_allowance REAL, --  -- overseas 수당
  overseas_pay_type TEXT, --  -- overseas pay 유형
  contract_etc_allowance REAL, --  -- contract etc 수당
  annual_leave_used REAL, --  -- annual leave 사용
  annual_leave_pay REAL, --  -- annual leave pay
  bonus_pay REAL, --  -- 상여금 pay
  performance_pay REAL, --  -- performance pay
  actual_expense_pay REAL, --  -- actual expense pay
  communication_pay REAL, --  -- communication pay
  etc_allowance REAL, --  -- etc 수당
  etc_allowance_memo TEXT, --  -- etc 수당 memo
  year_end_tax_adjust REAL, --  -- 연도 종료 세금 adjust
  year_end_tax_adjust_memo TEXT, --  -- 연도 종료 세금 adjust memo
  health_insurance_adjust REAL, --  -- health 보험 adjust
  health_insurance_adjust_memo TEXT, --  -- health 보험 adjust memo
  health_insurance_adjust_yearend REAL, --  -- health 보험 adjust yearend
  health_insurance_adjust_yearend_memo TEXT, --  -- health 보험 adjust yearend memo
  ltcare_adjust_yearend REAL, --  -- ltcare adjust yearend
  ltcare_adjust_yearend_memo TEXT, --  -- ltcare adjust yearend memo
  advance_deduction REAL, --  -- advance 공제
  advance_deduction_memo TEXT, --  -- advance 공제 memo
  dependents INTEGER DEFAULT 1, --  -- 부양가족 수
  draft_saved_at TEXT, --  -- 임시저장 일시
  edit_source_id TEXT, --  -- edit source 고유식별자
  site_allowance REAL, --  -- site 수당
  remote_area_allowance REAL, --  -- remote area 수당
  regular_bonus REAL, --  -- regular 상여금
  hazard_allowance REAL, --  -- hazard 수당
  tax_dependents INTEGER DEFAULT 0, --  -- 세금 부양가족 수
  absent_dates TEXT, --  -- 결근일자 (CSV)
  earlyleave_data TEXT, --  -- 조퇴 상세 (JSON)
  late_data TEXT, --  -- 지각 상세 (JSON)
  absent_data TEXT --  -- 결근 상세 (JSON)
);

CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_company  ON payrolls(company_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_ym       ON payrolls(pay_year, pay_month);

-- wage_ledger_notifications
CREATE TABLE IF NOT EXISTS wage_ledger_notifications (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  year INTEGER,
  month INTEGER,
  is_read INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

-- =============================================================================
-- SECTION 3: 발송 및 알림
-- =============================================================================

-- company_history
CREATE TABLE IF NOT EXISTS company_history (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  changed_at TEXT,
  changes TEXT,
  snapshot TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  effective_date TEXT
);

-- company_notices
CREATE TABLE IF NOT EXISTS company_notices (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  company_name TEXT,
  notice_type TEXT,
  title TEXT,
  body TEXT,
  contract_id TEXT,
  employee_id TEXT,
  employee_name TEXT,
  contract_end TEXT,
  days_until_expiry INTEGER,
  sent_at TEXT,
  sent_by TEXT,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  gn_status TEXT,
  gn_scheduled_at TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_company_notices_company ON company_notices(company_id);

-- consent_dispatch  -- 정보제공동의서 발송 이력
CREATE TABLE IF NOT EXISTS consent_dispatch (
  id TEXT PRIMARY KEY, --  -- UUID
  contract_id TEXT, --  -- 계약 ID
  employee_id TEXT, --  -- 직원 ID
  employee_name TEXT, --  -- 직원명
  company_id TEXT, --  -- 회사 ID
  company_name TEXT, --  -- 회사명
  contract_type TEXT, --  -- 계약 유형
  dispatch_method TEXT, --  -- 발송 방식
  dispatch_status TEXT, --  -- 발송 상태
  recipient TEXT, --  -- 수신처
  dispatched_at TEXT, --  -- 발송 일시
  dispatched_by TEXT, --  -- 발송 처리자
  note TEXT, --  -- 비고
  contract_start TEXT, --  -- 계약 시작일
  contract_end TEXT, --  -- 계약 종료일
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- contract_dispatch  -- 근로계약서 발송 이력
CREATE TABLE IF NOT EXISTS contract_dispatch (
  id TEXT PRIMARY KEY, --  -- UUID
  contract_id TEXT, --  -- 계약 ID
  employee_id TEXT, --  -- 직원 ID
  employee_name TEXT, --  -- 직원명
  company_id TEXT, --  -- 회사 ID
  company_name TEXT, --  -- 회사명
  contract_type TEXT, --  -- 계약 유형
  dispatch_method TEXT, --  -- 발송 방식
  dispatch_status TEXT, --  -- 발송 상태
  recipient TEXT, --  -- 수신처
  dispatched_at TEXT, --  -- 발송 일시
  dispatched_by TEXT, --  -- 발송 처리자
  note TEXT, --  -- 비고
  contract_start TEXT, --  -- 계약 시작일
  contract_end TEXT, --  -- 계약 종료일
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- contract_expiry_notice
CREATE TABLE IF NOT EXISTS contract_expiry_notice (
  id TEXT PRIMARY KEY,
  contract_id TEXT,
  employee_id TEXT,
  employee_name TEXT,
  company_id TEXT,
  company_name TEXT,
  contract_type TEXT,
  contract_end TEXT,
  days_until_expiry INTEGER,
  notice_method TEXT,
  notice_status TEXT,
  recipient TEXT,
  noticed_at TEXT,
  noticed_by TEXT,
  note TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  message_id TEXT
);

-- kakao_send_logs  -- 카카오 알림톡 발송 이력
CREATE TABLE IF NOT EXISTS kakao_send_logs (
  id TEXT PRIMARY KEY, --  -- UUID
  send_type TEXT NOT NULL DEFAULT 'alimtalk', --  -- send 유형
  template_id TEXT, --  -- template 고유식별자
  recipient TEXT NOT NULL, --  -- 수신자 전화번호
  variables TEXT, --  -- variables
  message_id TEXT, --  -- Solapi 메시지 ID
  group_id TEXT, --  -- group 고유식별자
  status TEXT DEFAULT 'pending', --  -- 발송 상태
  error_message TEXT, --  -- error message
  related_table TEXT, --  -- related table
  related_id TEXT, --  -- 관련 데이터 ID
  retry_count INTEGER DEFAULT 0, --  -- retry 횟수
  created_at INTEGER, --  -- 발송일시
  sent_at TEXT --  -- sent at
);

-- =============================================================================
-- SECTION 4: 청구 및 기준정보
-- =============================================================================

-- billing  -- 청구/과금
CREATE TABLE IF NOT EXISTS billing (
  id TEXT PRIMARY KEY, --  -- UUID
  company_id TEXT, --  -- 회사 ID
  billing_year INTEGER, --  -- 청구 연도
  billing_month INTEGER, --  -- 청구 월
  employee_count INTEGER, --  -- employee 횟수
  amount_per_employee REAL, --  -- 금액 per employee
  total_amount REAL, --  -- 합계 금액
  payment_status TEXT DEFAULT 'pending', --  -- 납부 상태
  payment_date TEXT, --  -- 지급 일자
  partial_paid_amount REAL DEFAULT 0, --  -- partial 지급액 금액
  remaining_amount REAL, --  -- remaining 금액
  due_date TEXT, --  -- due 일자
  created_date TEXT, --  -- created 일자
  note TEXT, --  -- 비고
  loss_amount REAL, --  -- loss 금액
  loss_date TEXT, --  -- loss 일자
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

CREATE INDEX IF NOT EXISTS idx_billing_company ON billing(company_id);

-- insurance_rates
CREATE TABLE IF NOT EXISTS insurance_rates (
  id TEXT PRIMARY KEY,
  insurance_type TEXT,
  year INTEGER,
  period_start TEXT,
  period_end TEXT,
  rate REAL,
  rate_base TEXT,
  cap_amount REAL,
  note TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- minimum_wages
CREATE TABLE IF NOT EXISTS minimum_wages (
  id TEXT PRIMARY KEY,
  year INTEGER,
  hourly_wage REAL,
  monthly_wage REAL,
  note TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- tax_bracket_rows
CREATE TABLE IF NOT EXISTS tax_bracket_rows (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  from_amount INTEGER NOT NULL,
  to_amount INTEGER NOT NULL,
  dep1_tax INTEGER DEFAULT 0,
  dep2_tax INTEGER DEFAULT 0,
  dep3_tax INTEGER DEFAULT 0,
  dep4_tax INTEGER DEFAULT 0,
  dep5_tax INTEGER DEFAULT 0,
  dep6_tax INTEGER DEFAULT 0,
  dep7_tax INTEGER DEFAULT 0,
  extra_per_dep INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tax_bracket_rows_year ON tax_bracket_rows(year);

-- tax_brackets
CREATE TABLE IF NOT EXISTS tax_brackets (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

