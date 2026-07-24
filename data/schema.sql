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
  id TEXT PRIMARY KEY, --  -- 고유식별자
  username TEXT, --  -- 아이디
  password TEXT, --  -- 비밀번호 (해시)
  display_name TEXT, --  -- 표시이름
  created_at_label TEXT, --  -- 생성일시 표시명
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- companies  -- 고객사 (회사 기본정보)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY, --  -- 고유식별자
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
  id TEXT PRIMARY KEY, --  -- 고유식별자
  employee_id TEXT, --  -- 직원 ID → employees.id
  company_id TEXT, --  -- 회사 ID → companies.id
  contract_start TEXT, --  -- 계약 시작일
  contract_end TEXT, --  -- 계약 종료일
  work_hours_per_day REAL, --  -- 일 소정근로시간
  work_days_per_week REAL, --  -- 주 소정근로일수
  work_days_per_month REAL, --  -- 월 근무일수
  break_time REAL, --  -- 휴게시간
  annual_leave_days REAL, --  -- 연차 일수
  monthly_salary_agreed REAL, --  -- 월 약정임금
  annual_salary REAL, --  -- 연봉
  base_salary REAL, --  -- 기본급
  hourly_wage REAL, --  -- 통상시급
  weekly_holiday_pay REAL, --  -- 주휴수당
  contract_type TEXT, --  -- 계약 유형 (regular/fixed_term/regular_probation/fixed_term_probation/daily)
  status TEXT DEFAULT 'active', --  -- 계약 상태
  pay_period TEXT, --  -- 급여 산정기간
  meal_allowance REAL, --  -- 식대
  meal_pay_type TEXT, --  -- 식대 지급유형
  transportation_allowance REAL, --  -- 교통비
  transport_pay_type TEXT, --  -- 교통비 지급유형
  research_allowance REAL, --  -- 연구수당
  research_pay_type TEXT, --  -- 연구수당 지급유형
  communication_allowance REAL, --  -- 통신비
  communication_pay_type TEXT, --  -- 통신비 지급유형
  fitness_allowance REAL, --  -- 건강관리비
  fitness_pay_type TEXT, --  -- 건강관리비 지급유형
  self_dev_allowance REAL, --  -- 자기계발비
  self_dev_pay_type TEXT, --  -- 자기계발비 지급유형
  book_allowance REAL, --  -- 도서구입비
  book_pay_type TEXT, --  -- 도서구입비 지급유형
  overseas_allowance REAL, --  -- 해외수당
  overseas_pay_type TEXT, --  -- 해외수당 지급유형
  insurance_employment TEXT, --  -- 고용보험
  insurance_industrial TEXT, --  -- 산재보험
  insurance_pension TEXT, --  -- 국민연금
  insurance_health TEXT, --  -- 건강보험
  fixed_ot_pay REAL, --  -- 고정연장수당
  fixed_ot_hours REAL, --  -- 고정연장시간
  fixed_night_pay REAL, --  -- 고정야간수당
  fixed_night_hours REAL, --  -- 고정야간시간
  fixed_hol_pay REAL, --  -- 고정휴일수당
  fixed_hol_hours REAL, --  -- 고정휴일시간
  probation_months INTEGER, --  -- 수습기간 (개월)
  probation_pct REAL, --  -- 수습 임금 비율 (%)
  probation_amt REAL, --  -- 수습 임금 월 금액
  probation_basis TEXT, --  -- 수습 산정 기준
  amended_from TEXT, --  -- 수정 원본 ID
  is_voided_by_amend INTEGER DEFAULT 0, --  -- 수정계약으로 파기 여부
  voided_at TEXT, --  -- 파기 일시
  signed_file_name TEXT, --  -- 서명 파일명
  signed_file_data TEXT, --  -- 서명 파일 데이터
  consent_file_name TEXT, --  -- 동의서 파일명
  consent_file_data TEXT, --  -- 동의서 파일 데이터
  salary_start_date TEXT, --  -- 급여 산정 시작일
  salary_end_date TEXT, --  -- 급여 산정 종료일
  is_draft INTEGER DEFAULT 0, --  -- 임시저장 여부
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  pay_day INTEGER, --  -- 급여 지급일
  schedule_json TEXT, --  -- 근무시간표 (JSON)
  daily_wage REAL, --  -- 일급여
  position_allowance REAL, --  -- 직책수당
  skill_allowance REAL, --  -- 기능수당
  license_allowance REAL, --  -- 면허수당
  site_allowance REAL, --  -- 현장수당
  self_driving_allowance REAL, --  -- 자가운전보조금
  self_driving_pay_type TEXT, --  -- 자가운전 지급유형
  remote_area_allowance REAL, --  -- 원격지수당
  remote_area_pay_type TEXT, --  -- 원격지 지급유형
  car_maintenance REAL, --  -- 차량유지비
  regular_bonus REAL, --  -- 정기상여금
  childcare_allowance REAL, --  -- 보육수당
  childcare_dependents INTEGER, --  -- 보육 부양가족 수
  childcare_pay_type TEXT, --  -- 보육수당 지급유형
  contract_etc_allowance REAL, --  -- 계약 기타수당
  etc_allowance REAL, --  -- 기타수당
  etc_allowance_memo TEXT, --  -- 기타수당 메모
  draft_saved_at INTEGER, --  -- 임시저장 일시
  edit_source_id TEXT, --  -- 수정 원본 ID
  employment_category TEXT, --  -- 고용형태
  transport_type TEXT, --  -- 교통 유형
  transportation_pay_type TEXT, --  -- 교통비 지급유형
  pay_period_month TEXT, --  -- 급여 산정기준월
  pay_period_day INTEGER, --  -- 급여 산정기준일
  terminate_date TEXT, --  -- 해지일
  renewed_from_id TEXT, --  -- 갱신 원본 ID
  renewed_to_id TEXT, --  -- 갱신 대상 ID
  hazard_allowance REAL, --  -- 위험수당
  custom_ordinary_values TEXT, --  -- 통상임금 포함 사용자정의
  probation_end_date TEXT --  -- 수습 종료일
);

CREATE INDEX IF NOT EXISTS idx_contracts_employee ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company  ON contracts(company_id);

-- employees  -- 직원 (근로자 기본정보)
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  company_id TEXT, --  -- 소속 회사 ID → companies.id
  name TEXT, --  -- 이름
  gender TEXT, --  -- 성별 (male/female)
  employment_category TEXT, --  -- 고용형태 구분
  employee_number TEXT, --  -- 사원번호
  department TEXT, --  -- 부서
  position TEXT, --  -- 직책
  hire_date TEXT, --  -- 입사일
  contract_period TEXT, --  -- 계약 기간
  status TEXT DEFAULT 'active', --  -- 상태 (active:재직, resigned:퇴직)
  note TEXT, --  -- 비고
  id_number TEXT, --  -- 주민등록번호
  phone TEXT, --  -- 휴대전화번호
  email TEXT, --  -- 이메일
  address TEXT, --  -- 주소
  dependents INTEGER DEFAULT 0, --  -- 부양가족 수
  job_description TEXT, --  -- 담당업무
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  is_representative INTEGER DEFAULT 0, --  -- 대표자 여부
  bank_name TEXT, --  -- 은행명
  bank_account TEXT, --  -- 계좌번호
  expire_date TEXT, --  -- 만료일
  tax_dependents INTEGER DEFAULT 0 --  -- 부양가족 수(세금)
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

-- registered_executives  -- 등기임원 (대표자 외)
CREATE TABLE IF NOT EXISTS registered_executives (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  company_id TEXT, --  -- 회사 ID
  name TEXT NOT NULL, --  -- 이름
  position TEXT NOT NULL, --  -- 직책
  phone TEXT NOT NULL, --  -- 전화번호
  id_number TEXT NOT NULL, --  -- 주민등록번호
  bank_name TEXT, --  -- 은행명
  bank_account TEXT, --  -- 계좌번호
  bank_holder TEXT, --  -- 예금주
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

CREATE INDEX IF NOT EXISTS idx_registered_executives_company ON registered_executives(company_id);

-- related_party_workers  -- 특수관계인 근로자 (배우자, 직계존비속 등)
CREATE TABLE IF NOT EXISTS related_party_workers (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  company_id TEXT, --  -- 회사 ID
  name TEXT NOT NULL, --  -- 이름
  relationship TEXT NOT NULL, --  -- 관계 (배우자/자녀/부모 등)
  phone TEXT NOT NULL, --  -- 전화번호
  id_number TEXT NOT NULL, --  -- 주민등록번호
  bank_name TEXT, --  -- 은행명
  bank_account TEXT, --  -- 계좌번호
  bank_holder TEXT, --  -- 예금주
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

CREATE INDEX IF NOT EXISTS idx_related_party_workers_company ON related_party_workers(company_id);

-- representative_contact  -- 대표 연락처 및 발신 설정
CREATE TABLE IF NOT EXISTS representative_contact (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  phone TEXT, --  -- 대표 전화번호
  email TEXT, --  -- 대표 이메일
  fax TEXT, --  -- 대표 팩스
  updated_at INTEGER, --  -- 수정일시
  outbound_email TEXT DEFAULT NULL, --  -- 발신전용 이메일 주소
  outbound_password TEXT DEFAULT NULL, --  -- 발신전용 이메일 비밀번호
  outbound_smtp_host TEXT DEFAULT NULL, --  -- SMTP 서버 주소
  outbound_smtp_port TEXT DEFAULT NULL, --  -- SMTP 포트
  msg_body_rules TEXT DEFAULT NULL --  -- 메시지 본문 규칙 (JSON)
);

-- =============================================================================
-- SECTION 2: 급여 및 근태
-- =============================================================================

-- annual_leave_ledger  -- 연차 관리대장
CREATE TABLE IF NOT EXISTS annual_leave_ledger (
  id TEXT PRIMARY KEY, --  -- 고유식별자
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
  leave_pay_estimate REAL, --  -- 연차수당 추정액
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  contract_id TEXT, --  -- 계약 ID
  status TEXT --  -- 상태
);

-- annual_leave_promotions  -- 연차 사용촉진 발송 이력
CREATE TABLE IF NOT EXISTS annual_leave_promotions (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  employee_id TEXT, --  -- 직원 ID
  employee_name TEXT, --  -- 직원명
  company_id TEXT, --  -- 회사 ID
  company_name TEXT, --  -- 회사명
  contract_type TEXT, --  -- 계약 유형
  total_leave_days REAL, --  -- 총 연차일수
  used_leave_days REAL, --  -- 사용 연차일수
  remaining_leave_days REAL, --  -- 잔여 연차일수
  annual_leave_basis TEXT, --  -- 연차 산정 기준
  leave_pay_estimate REAL, --  -- 연차수당 추정액
  worker_send_method TEXT, --  -- 근로자 발송 방식
  sent_at TEXT, --  -- 발송 일시
  sent_by TEXT, --  -- 발송 처리자
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- attendance_ledger  -- 근태 관리대장 (결근·지각·조퇴, 보존년한 5년)
CREATE TABLE IF NOT EXISTS attendance_ledger (
  id TEXT PRIMARY KEY, --  -- 고유식별자
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

-- payroll_items  -- 급여 항목 (payrolls와 1:N, 수당·공제 개별 관리)
CREATE TABLE IF NOT EXISTS payroll_items (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  payroll_id TEXT NOT NULL, --  -- 급여대장 ID → payrolls.id
  item_type TEXT NOT NULL, --  -- 항목 유형 (영문 코드)
  amount REAL DEFAULT 0, --  -- 금액
  pay_type TEXT, --  -- 지급 유형 (fixed/actual)
  memo TEXT, --  -- 메모
  sort_order INTEGER DEFAULT 0, --  -- 정렬 순서
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll ON payroll_items(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_type ON payroll_items(item_type);

-- payroll_send_logs  -- 급여명세서 발송 이력
CREATE TABLE IF NOT EXISTS payroll_send_logs (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  company_id TEXT, --  -- 회사 ID
  employee_id TEXT, --  -- 직원 ID
  payroll_id TEXT, --  -- 급여대장 ID
  pay_year INTEGER, --  -- 급여 연도
  pay_month INTEGER, --  -- 급여 월
  sent_at TEXT, --  -- 발송 일시
  sent_by TEXT, --  -- 발송 처리자
  send_method TEXT, --  -- 발송 방식 (kakao/email/manual)
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- payrolls  -- 급여대장
CREATE TABLE IF NOT EXISTS payrolls (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  employee_id TEXT, --  -- 직원 ID
  company_id TEXT, --  -- 회사 ID
  pay_year INTEGER, --  -- 급여 연도
  pay_month INTEGER, --  -- 급여 월
  pay_date TEXT, --  -- 급여 지급일
  work_days REAL, --  -- 근무일수
  base_salary REAL, --  -- 기본급
  weekly_holiday_pay REAL, --  -- 주휴수당
  standard_monthly_pay REAL, --  -- 기준월급여
  gross_pay REAL, --  -- 총 지급액
  national_pension REAL, --  -- 국민연금
  health_insurance REAL, --  -- 건강보험
  long_term_care REAL, --  -- 장기요양보험
  employment_insurance REAL, --  -- 고용보험
  income_tax REAL, --  -- 소득세
  local_income_tax REAL, --  -- 지방소득세
  total_deduction REAL, --  -- 총 공제액
  net_pay REAL, --  -- 실 지급액
  is_draft INTEGER DEFAULT 0, --  -- 임시저장 여부
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  total_work_hours REAL, --  -- 총 근무시간
  overtime_hours REAL, --  -- 연장근로시간
  night_hours REAL, --  -- 야간근로시간
  holiday_hours REAL, --  -- 휴일근로시간
  hourly_wage REAL, --  -- 통상시급
  position_allowance REAL, --  -- 직책수당
  skill_allowance REAL, --  -- 기능수당
  license_allowance REAL, --  -- 면허수당
  overtime_pay REAL, --  -- 연장근로수당
  night_pay REAL, --  -- 야간근로수당
  holiday_pay REAL, --  -- 휴일근로수당
  transport_type TEXT, --  -- 교통 유형
  transport_pay_type TEXT, --  -- 교통비 지급유형
  transportation_allowance REAL, --  -- 교통비
  transportation_pay_type TEXT, --  -- 교통비 지급유형
  self_driving_allowance REAL, --  -- 자가운전보조금
  self_driving_pay_type TEXT, --  -- 자가운전 지급유형
  meal_allowance REAL, --  -- 식대
  meal_pay_type TEXT, --  -- 식대 지급유형
  childcare_allowance REAL, --  -- 보육수당
  childcare_pay_type TEXT, --  -- 보육수당 지급유형
  childcare_dependents INTEGER DEFAULT 1, --  -- 보육 부양가족 수
  research_allowance REAL, --  -- 연구수당
  research_pay_type TEXT, --  -- 연구수당 지급유형
  communication_allowance REAL, --  -- 통신비
  communication_pay_type TEXT, --  -- 통신비 지급유형
  fitness_allowance REAL, --  -- 건강관리비
  fitness_pay_type TEXT, --  -- 건강관리비 지급유형
  self_dev_allowance REAL, --  -- 자기계발비
  self_dev_pay_type TEXT, --  -- 자기계발비 지급유형
  book_allowance REAL, --  -- 도서구입비
  book_pay_type TEXT, --  -- 도서구입비 지급유형
  overseas_allowance REAL, --  -- 해외수당
  overseas_pay_type TEXT, --  -- 해외수당 지급유형
  contract_etc_allowance REAL, --  -- 계약 기타수당
  annual_leave_used REAL, --  -- 연차 사용일수
  annual_leave_pay REAL, --  -- 연차 수당
  bonus_pay REAL, --  -- 상여금
  performance_pay REAL, --  -- 성과급
  actual_expense_pay REAL, --  -- 실비변상
  communication_pay REAL, --  -- 통신비
  etc_allowance REAL, --  -- 기타수당
  etc_allowance_memo TEXT, --  -- 기타수당 메모
  year_end_tax_adjust REAL, --  -- 연말정산
  year_end_tax_adjust_memo TEXT, --  -- 연말정산 메모
  health_insurance_adjust REAL, --  -- 건강보험 정산
  health_insurance_adjust_memo TEXT, --  -- 건강보험 정산 메모
  health_insurance_adjust_yearend REAL, --  -- 건강보험 연말정산
  health_insurance_adjust_yearend_memo TEXT, --  -- 건강보험 연말정산 메모
  ltcare_adjust_yearend REAL, --  -- 장기요양 연말정산
  ltcare_adjust_yearend_memo TEXT, --  -- 장기요양 연말정산 메모
  advance_deduction REAL, --  -- 선급 공제
  advance_deduction_memo TEXT,
  dependents INTEGER DEFAULT 1, --  -- 부양가족 수
  draft_saved_at TEXT, --  -- 임시저장 일시
  edit_source_id TEXT, --  -- 수정 원본 ID
  site_allowance REAL, --  -- 현장수당
  remote_area_allowance REAL, --  -- 원격지수당
  regular_bonus REAL, --  -- 정기상여금
  hazard_allowance REAL, --  -- 위험수당
  tax_dependents INTEGER DEFAULT 0, --  -- 부양가족 수(세금)
  absent_dates TEXT, --  -- 결근일자 (CSV)
  earlyleave_data TEXT, --  -- 조퇴 상세 (JSON)
  late_data TEXT, --  -- 지각 상세 (JSON)
  absent_data TEXT --  -- 결근 상세 (JSON)
);

CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_company  ON payrolls(company_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_ym       ON payrolls(pay_year, pay_month);

-- wage_ledger_notifications  -- 임금대장 통지 (고객사 앱 알림)
CREATE TABLE IF NOT EXISTS wage_ledger_notifications (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  company_id TEXT, --  -- 회사 ID
  year INTEGER, --  -- 연도
  month INTEGER, --  -- 월
  is_read INTEGER DEFAULT 0, --  -- 확인 여부 (0:미확인, 1:확인)
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- =============================================================================
-- SECTION 3: 발송 및 알림
-- =============================================================================

-- company_history  -- 고객사 정보 변경 이력
CREATE TABLE IF NOT EXISTS company_history (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  company_id TEXT, --  -- 회사 ID
  changed_at TEXT, --  -- 변경 일시
  changes TEXT, --  -- 변경 내용 (JSON)
  snapshot TEXT, --  -- 변경 당시 스냅샷 (JSON)
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  effective_date TEXT --  -- 적용일
);

-- company_notices  -- 고객사 앱 알림 (계약만료, 연차촉진, 공지사항 등)
CREATE TABLE IF NOT EXISTS company_notices (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  company_id TEXT, --  -- 회사 ID
  company_name TEXT, --  -- 회사명
  notice_type TEXT, --  -- 알림 유형
  title TEXT, --  -- 알림 제목
  body TEXT, --  -- 알림 본문
  contract_id TEXT, --  -- 관련 계약 ID
  employee_id TEXT, --  -- 관련 직원 ID
  employee_name TEXT, --  -- 직원명
  contract_end TEXT, --  -- 계약 종료일
  days_until_expiry INTEGER, --  -- 만료까지 남은 일수
  sent_at TEXT, --  -- 발송 일시
  sent_by TEXT, --  -- 발송 처리자
  is_read INTEGER DEFAULT 0, --  -- 확인 여부 (0:미확인, 1:확인)
  read_at TEXT, --  -- 확인 일시
  gn_status TEXT, --  -- 일반공지 상태
  gn_scheduled_at TEXT, --  -- 일반공지 예약일시
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

CREATE INDEX IF NOT EXISTS idx_company_notices_company ON company_notices(company_id);

-- consent_dispatch  -- 정보제공동의서 발송 이력
CREATE TABLE IF NOT EXISTS consent_dispatch (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  contract_id TEXT, --  -- 계약 ID
  employee_id TEXT, --  -- 직원 ID
  employee_name TEXT, --  -- 직원명
  company_id TEXT, --  -- 회사 ID
  company_name TEXT, --  -- 회사명
  contract_type TEXT, --  -- 계약 유형
  dispatch_method TEXT, --  -- 발송 방식 (kakao/email/manual)
  dispatch_status TEXT, --  -- 발송 상태 (completed/failed/pending)
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
  id TEXT PRIMARY KEY, --  -- 고유식별자
  contract_id TEXT, --  -- 계약 ID
  employee_id TEXT, --  -- 직원 ID
  employee_name TEXT, --  -- 직원명
  company_id TEXT, --  -- 회사 ID
  company_name TEXT, --  -- 회사명
  contract_type TEXT, --  -- 계약 유형
  dispatch_method TEXT, --  -- 발송 방식 (kakao/email/manual)
  dispatch_status TEXT, --  -- 발송 상태 (completed/failed/pending)
  recipient TEXT, --  -- 수신처
  dispatched_at TEXT, --  -- 발송 일시
  dispatched_by TEXT, --  -- 발송 처리자
  note TEXT, --  -- 비고
  contract_start TEXT, --  -- 계약 시작일
  contract_end TEXT, --  -- 계약 종료일
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- contract_expiry_notice  -- 계약만료 통지 이력
CREATE TABLE IF NOT EXISTS contract_expiry_notice (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  contract_id TEXT, --  -- 계약 ID
  employee_id TEXT, --  -- 직원 ID
  employee_name TEXT, --  -- 직원명
  company_id TEXT, --  -- 회사 ID
  company_name TEXT, --  -- 회사명
  contract_type TEXT, --  -- 계약 유형
  contract_end TEXT, --  -- 계약 종료일
  days_until_expiry INTEGER, --  -- 만료까지 남은 일수
  notice_method TEXT, --  -- 통지 방식
  notice_status TEXT, --  -- 통지 상태
  recipient TEXT, --  -- 수신처
  noticed_at TEXT, --  -- 통지 일시
  noticed_by TEXT, --  -- 통지 처리자
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER, --  -- 수정일시
  message_id TEXT --  -- Solapi 메시지 ID
);

-- kakao_send_logs  -- 카카오 알림톡 발송 이력
CREATE TABLE IF NOT EXISTS kakao_send_logs (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  send_type TEXT NOT NULL DEFAULT 'alimtalk', --  -- 발송 유형
  template_id TEXT, --  -- 템플릿 ID
  recipient TEXT NOT NULL, --  -- 수신자 전화번호
  variables TEXT, --  -- 변수
  message_id TEXT, --  -- Solapi 메시지 ID
  group_id TEXT, --  -- 그룹 ID
  status TEXT DEFAULT 'pending', --  -- 발송 상태
  error_message TEXT, --  -- 오류 메시지
  related_table TEXT, --  -- 관련 테이블
  related_id TEXT, --  -- 관련 데이터 ID
  retry_count INTEGER DEFAULT 0, --  -- 재시도 횟수
  created_at INTEGER, --  -- 발송일시
  sent_at TEXT --  -- 발송 일시
);

-- =============================================================================
-- SECTION 4: 청구 및 기준정보
-- =============================================================================

-- billing  -- 청구/과금
CREATE TABLE IF NOT EXISTS billing (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  company_id TEXT, --  -- 회사 ID
  billing_year INTEGER, --  -- 청구 연도
  billing_month INTEGER, --  -- 청구 월
  employee_count INTEGER, --  -- 직원 수
  amount_per_employee REAL, --  -- 1인당 청구액
  total_amount REAL, --  -- 총 청구액
  payment_status TEXT DEFAULT 'pending', --  -- 납부 상태 (pending/partial/paid/unpaid)
  payment_date TEXT, --  -- 납부일
  partial_paid_amount REAL DEFAULT 0, --  -- 부분 납부액
  remaining_amount REAL, --  -- 잔여 청구액
  due_date TEXT, --  -- 납부 기한
  created_date TEXT, --  -- 청구 생성일
  note TEXT, --  -- 비고
  loss_amount REAL, --  -- 손실 처리액
  loss_date TEXT, --  -- 손실 처리일
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

CREATE INDEX IF NOT EXISTS idx_billing_company ON billing(company_id);

-- insurance_rates  -- 4대보험 요율 (연도별)
CREATE TABLE IF NOT EXISTS insurance_rates (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  insurance_type TEXT, --  -- 보험 유형 (national_pension/health/long_term_care/employment)
  year INTEGER, --  -- 적용 연도
  period_start TEXT, --  -- 적용 시작일
  period_end TEXT, --  -- 적용 종료일
  rate REAL, --  -- 요율 (%)
  rate_base TEXT, --  -- 요율 기준
  cap_amount REAL, --  -- 상한액
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- minimum_wages  -- 최저임금 (연도별)
CREATE TABLE IF NOT EXISTS minimum_wages (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  year INTEGER, --  -- 적용 연도
  hourly_wage REAL, --  -- 시간당 최저임금
  monthly_wage REAL, --  -- 월 최저임금 (주40시간 기준)
  note TEXT, --  -- 비고
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

-- tax_bracket_rows  -- 소득세 구간별 세액 (간이세액표)
CREATE TABLE IF NOT EXISTS tax_bracket_rows (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  year INTEGER NOT NULL, --  -- 적용 연도
  from_amount INTEGER NOT NULL, --  -- 구간 시작 금액
  to_amount INTEGER NOT NULL, --  -- 구간 종료 금액
  dep1_tax INTEGER DEFAULT 0, --  -- 부양가족 1인 세액
  dep2_tax INTEGER DEFAULT 0, --  -- 부양가족 2인 세액
  dep3_tax INTEGER DEFAULT 0, --  -- 부양가족 3인 세액
  dep4_tax INTEGER DEFAULT 0, --  -- 부양가족 4인 세액
  dep5_tax INTEGER DEFAULT 0, --  -- 부양가족 5인 세액
  dep6_tax INTEGER DEFAULT 0, --  -- 부양가족 6인 세액
  dep7_tax INTEGER DEFAULT 0, --  -- 부양가족 7인 세액
  extra_per_dep INTEGER DEFAULT 0, --  -- 8인 이상 가족 1인당 추가 세액
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

CREATE INDEX IF NOT EXISTS idx_tax_bracket_rows_year ON tax_bracket_rows(year);

-- tax_brackets  -- 소득세 과세표준 구간
CREATE TABLE IF NOT EXISTS tax_brackets (
  id TEXT PRIMARY KEY, --  -- 고유식별자
  year INTEGER NOT NULL, --  -- 적용 연도
  data TEXT NOT NULL, --  -- 구간 데이터 (JSON)
  created_at INTEGER, --  -- 생성일시
  updated_at INTEGER --  -- 수정일시
);

