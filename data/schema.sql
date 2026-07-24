-- =============================================================================
--  인사톡 노무톡 — SQLite Schema
--  대화인사노무파트너스
--
--  마지막 갱신: 2026-07-24
--  테이블 수 : 23개
-- =============================================================================

PRAGMA journal_mode = WAL;


-- =============================================================================
--  SECTION 1: 기본정보 — 회사, 직원, 관리자, 대표연락처
-- =============================================================================

-- -------------------------------------------------
-- Table: companies (고객사 / 회사 기본정보)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,                           -- UUID
  company_name TEXT,                             -- 회사명
  business_number TEXT,                          -- 사업자등록번호
  representative TEXT,                           -- 대표자명
  industry TEXT,                                 -- 업종
  address TEXT,                                  -- 주소
  phone TEXT,                                    -- 대표 전화번호
  email TEXT,                                    -- 대표 이메일
  pay_period TEXT,                               -- 급여 산정 주기 (monthly / weekly)
  pay_day INTEGER,                               -- 급여 지급일 (매월 N일)
  access_code TEXT,                              -- 고객사 앱 접근 코드 (client 로그인용)
  note TEXT,                                     -- 비고
  insurance_basis TEXT,                          -- 4대보험 가입 기준
  annual_leave_basis TEXT,                       -- 연차 산정 기준
  is_draft INTEGER DEFAULT 0,                    -- 임시저장 여부 (0:정식등록, 1:임시)
  draft_saved_at TEXT,                           -- 임시저장 일시 (ISO 8601)
  status TEXT DEFAULT 'active',                  -- 상태 (active:정상, terminated:해지)
  allowance_config TEXT,                         -- 수당 설정 (JSON)
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER,                            -- 수정일시 (unix ms)
  service_contract_file_name TEXT,               -- 용역계약서 파일명
  service_contract_file_data TEXT,               -- 용역계약서 파일 데이터
  contract_start_date TEXT,                      -- 용역계약 시작일
  pay_period_month TEXT,                         -- 급여 귀속월 기준
  pay_period_day INTEGER,                        -- 급여 귀속일 기준
  contract_end_date TEXT,                        -- 용역계약 종료일
  representatives TEXT                           -- 대표자 정보 (JSON, 복수 가능)
);


-- -------------------------------------------------
-- Table: employees (직원 / 근로자 기본정보)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,                           -- UUID
  company_id TEXT,                               -- 소속 회사 ID → companies.id
  name TEXT,                                     -- 이름
  gender TEXT,                                   -- 성별
  employment_category TEXT,                      -- 고용형태 구분
  employee_number TEXT,                          -- 사번
  department TEXT,                               -- 부서
  position TEXT,                                 -- 직위
  hire_date TEXT,                                -- 입사일
  contract_period TEXT,                          -- 계약기간 표기
  status TEXT DEFAULT 'active',                  -- 상태 (active:재직, terminated:퇴사)
  note TEXT,                                     -- 비고
  id_number TEXT,                                -- 주민등록번호
  phone TEXT,                                    -- 전화번호
  email TEXT,                                    -- 이메일
  address TEXT,                                  -- 주소
  dependents INTEGER DEFAULT 0,                  -- 부양가족 수
  job_description TEXT,                          -- 담당업무 설명
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER,                            -- 수정일시 (unix ms)
  is_representative INTEGER DEFAULT 0,           -- 대표자 여부 (0:일반, 1:대표)
  bank_name TEXT,                                -- 은행명
  bank_account TEXT,                             -- 계좌번호
  expire_date TEXT,                              -- 계약만료일
  tax_dependents INTEGER DEFAULT 0               -- 소득세 공제 부양가족 수
);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);


-- -------------------------------------------------
-- Table: admin_accounts (관리자 계정)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,                           -- UUID
  username TEXT,                                 -- 로그인 아이디
  password TEXT,                                 -- bcrypt 해시된 비밀번호
  display_name TEXT,                             -- 표시 이름
  created_at_label TEXT,                         -- 생성일 (가독형 문자열)
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- -------------------------------------------------
-- Table: registered_executives (등기임원 정보)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS registered_executives (
  id TEXT PRIMARY KEY,                           -- UUID
  company_id TEXT,                               -- 소속 회사 ID → companies.id
  name TEXT NOT NULL,                            -- 이름
  position TEXT NOT NULL,                        -- 직위
  phone TEXT NOT NULL,                           -- 전화번호
  id_number TEXT NOT NULL,                       -- 주민등록번호
  bank_name TEXT,                                -- 은행명
  bank_account TEXT,                             -- 계좌번호
  bank_holder TEXT,                              -- 예금주
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);
CREATE INDEX IF NOT EXISTS idx_registered_executives_company ON registered_executives(company_id);


-- -------------------------------------------------
-- Table: related_party_workers (특수관계인 근로자 정보)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS related_party_workers (
  id TEXT PRIMARY KEY,                           -- UUID
  company_id TEXT,                               -- 소속 회사 ID → companies.id
  name TEXT NOT NULL,                            -- 이름
  relationship TEXT NOT NULL,                    -- 관계 (배우자, 자녀 등)
  phone TEXT NOT NULL,                           -- 전화번호
  id_number TEXT NOT NULL,                       -- 주민등록번호
  bank_name TEXT,                                -- 은행명
  bank_account TEXT,                             -- 계좌번호
  bank_holder TEXT,                              -- 예금주
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);
CREATE INDEX IF NOT EXISTS idx_related_party_workers_company ON related_party_workers(company_id);


-- -------------------------------------------------
-- Table: representative_contact (노무사 대표 연락처 / 이메일 발송 설정)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS representative_contact (
  id TEXT PRIMARY KEY,                           -- 고정값 'default'
  phone TEXT,                                    -- 대표 전화번호
  email TEXT,                                    -- 대표 이메일
  fax TEXT,                                      -- 팩스번호
  updated_at INTEGER,                            -- 수정일시 (unix ms)
  outbound_email TEXT DEFAULT NULL,              -- 외부 발송용 이메일 주소
  outbound_password TEXT DEFAULT NULL,           -- 외부 발송용 이메일 비밀번호
  outbound_smtp_host TEXT DEFAULT NULL,          -- SMTP 호스트
  outbound_smtp_port TEXT DEFAULT NULL           -- SMTP 포트
);


-- =============================================================================
--  SECTION 2: 근로계약 — 계약서, 교부, 동의, 만료통지
-- =============================================================================

-- -------------------------------------------------
-- Table: contracts (근로계약서)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,                           -- UUID
  employee_id TEXT,                              -- 직원 ID → employees.id
  company_id TEXT,                               -- 회사 ID → companies.id
  contract_start TEXT,                           -- 계약 시작일
  contract_end TEXT,                             -- 계약 종료일
  work_hours_per_day REAL,                       -- 1일 소정근로시간
  work_days_per_week REAL,                       -- 1주 소정근로일수
  work_days_per_month REAL,                      -- 1개월 소정근로일수
  break_time REAL,                               -- 휴게시간 (분)
  annual_leave_days REAL,                        -- 연차휴가 일수
  monthly_salary_agreed REAL,                    -- 월 합의급여
  annual_salary REAL,                            -- 연봉
  base_salary REAL,                              -- 기본급
  hourly_wage REAL,                              -- 통상시급
  weekly_holiday_pay REAL,                       -- 주휴수당
  contract_type TEXT,                            -- 계약유형 (fixed_term:기간제, regular:정규직,
                                                 --   regular_probation:정규직수습, fixed_probation:계약직수습,
                                                 --   daily:일용직)
  status TEXT DEFAULT 'active',                  -- 상태 (active:진행중, terminated:종료,
                                                 --   canceled:취소, voided:무효, expired:만료)
  pay_period TEXT,                               -- 급여 지급 주기

  -- ▼ 수당 항목 (금액 + 지급방식)
  meal_allowance REAL,                           -- 식대
  meal_pay_type TEXT,                            -- 식대 지급방식
  transportation_allowance REAL,                 -- 교통비
  transport_pay_type TEXT,                       -- 교통비 지급방식
  research_allowance REAL,                       -- 연구수당
  research_pay_type TEXT,                        -- 연구수당 지급방식
  communication_allowance REAL,                  -- 통신비
  communication_pay_type TEXT,                   -- 통신비 지급방식
  fitness_allowance REAL,                        -- 건강유지비
  fitness_pay_type TEXT,                         -- 건강유지비 지급방식
  self_dev_allowance REAL,                       -- 자기계발비
  self_dev_pay_type TEXT,                        -- 자기계발비 지급방식
  book_allowance REAL,                           -- 도서구입비
  book_pay_type TEXT,                            -- 도서구입비 지급방식
  overseas_allowance REAL,                       -- 해외근무수당
  overseas_pay_type TEXT,                        -- 해외근무수당 지급방식
  position_allowance REAL,                       -- 직책수당
  skill_allowance REAL,                          -- 기술수당
  license_allowance REAL,                        -- 면허수당
  site_allowance REAL,                           -- 현장수당
  self_driving_allowance REAL,                   -- 자가운전보조금
  self_driving_pay_type TEXT,                    -- 자가운전보조금 지급방식
  remote_area_allowance REAL,                    -- 벽지수당
  remote_area_pay_type TEXT,                     -- 벽지수당 지급방식
  car_maintenance REAL,                          -- 차량유지비
  regular_bonus REAL,                            -- 정기상여금
  childcare_allowance REAL,                      -- 보육수당
  childcare_dependents INTEGER,                  -- 보육수당 대상 자녀 수
  childcare_pay_type TEXT,                       -- 보육수당 지급방식
  contract_etc_allowance REAL,                   -- 계약서상 기타수당
  etc_allowance REAL,                            -- 기타수당
  etc_allowance_memo TEXT,                       -- 기타수당 메모
  hazard_allowance REAL,                         -- 위험수당

  -- ▼ 4대보험 가입 여부
  insurance_employment TEXT,                     -- 고용보험
  insurance_industrial TEXT,                     -- 산재보험
  insurance_pension TEXT,                        -- 국민연금
  insurance_health TEXT,                         -- 건강보험

  -- ▼ 고정 연장·야간·휴일 수당
  fixed_ot_pay REAL,                             -- 고정연장수당 금액
  fixed_ot_hours REAL,                           -- 고정연장 시간
  fixed_night_pay REAL,                          -- 고정야간수당 금액
  fixed_night_hours REAL,                        -- 고정야간 시간
  fixed_hol_pay REAL,                            -- 고정휴일수당 금액
  fixed_hol_hours REAL,                          -- 고정휴일 시간

  -- ▼ 수습 관련
  probation_months INTEGER,                      -- 수습기간 (개월)
  probation_pct REAL,                            -- 수습감액 비율 (%)
  probation_amt REAL,                            -- 수습감액 금액
  probation_basis TEXT,                          -- 수습감액 기준
  probation_end_date TEXT,                       -- 수습만료일

  -- ▼ 계약 개정 이력
  amended_from TEXT,                             -- 개정 전 계약 ID
  is_voided_by_amend INTEGER DEFAULT 0,          -- 개정으로 인한 무효화 여부
  voided_at TEXT,                                -- 무효화 일시
  renewed_from_id TEXT,                          -- 갱신 전 계약 ID
  renewed_to_id TEXT,                            -- 갱신 후 계약 ID

  -- ▼ 서명/동의 파일 정보
  signed_file_name TEXT,                         -- 서명파일명
  signed_file_data TEXT,                         -- 서명파일 데이터
  consent_file_name TEXT,                        -- 동의서 파일명
  consent_file_data TEXT,                        -- 동의서 파일 데이터

  -- ▼ 기타
  salary_start_date TEXT,                        -- 급여 산정 시작일
  salary_end_date TEXT,                          -- 급여 산정 종료일
  is_draft INTEGER DEFAULT 0,                    -- 임시저장 여부 (0:정식, 1:임시)
  draft_saved_at INTEGER,                        -- 임시저장 일시 (unix ms)
  note TEXT,                                     -- 비고
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER,                            -- 수정일시 (unix ms)
  pay_day INTEGER,                               -- 급여 지급일
  schedule_json TEXT,                            -- 근무스케줄 (JSON)
  daily_wage REAL,                               -- 일당
  edit_source_id TEXT,                           -- 편집 원본 ID
  employment_category TEXT,                      -- 고용형태 구분
  transport_type TEXT,                           -- 교통수단 유형
  transportation_pay_type TEXT,                  -- 교통비 지급방식 (transport_pay_type과 별도 구분)
  pay_period_month TEXT,                         -- 급여 귀속월
  pay_period_day INTEGER,                        -- 급여 귀속일
  terminate_date TEXT,                           -- 퇴직/종료일
  custom_ordinary_values TEXT                    -- 통상임금 커스텀 산입값 (JSON)
);
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company  ON contracts(company_id);


-- -------------------------------------------------
-- Table: contract_dispatch (근로계약서 교부 이력)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS contract_dispatch (
  id TEXT PRIMARY KEY,                           -- UUID
  contract_id TEXT,                              -- 계약 ID → contracts.id
  employee_id TEXT,                              -- 직원 ID
  employee_name TEXT,                            -- 직원명
  company_id TEXT,                               -- 회사 ID
  company_name TEXT,                             -- 회사명
  contract_type TEXT,                            -- 계약유형
  dispatch_method TEXT,                          -- 교부방법 (kakao:알림톡, email:이메일, manual:수동)
  dispatch_status TEXT,                          -- 교부상태 (pending:대기, sent:발송, failed:실패)
  recipient TEXT,                                -- 수신자 (전화번호 or 이메일)
  dispatched_at TEXT,                            -- 교부일시 (ISO 8601)
  dispatched_by TEXT,                            -- 교부자
  note TEXT,                                     -- 비고
  contract_start TEXT,                           -- 계약 시작일
  contract_end TEXT,                             -- 계약 종료일
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- -------------------------------------------------
-- Table: consent_dispatch (동의서 교부 이력)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_dispatch (
  id TEXT PRIMARY KEY,                           -- UUID
  contract_id TEXT,                              -- 계약 ID → contracts.id
  employee_id TEXT,                              -- 직원 ID
  employee_name TEXT,                            -- 직원명
  company_id TEXT,                               -- 회사 ID
  company_name TEXT,                             -- 회사명
  contract_type TEXT,                            -- 계약유형
  dispatch_method TEXT,                          -- 교부방법 (kakao/email/manual)
  dispatch_status TEXT,                          -- 교부상태 (pending/sent/failed)
  recipient TEXT,                                -- 수신자
  dispatched_at TEXT,                            -- 교부일시 (ISO 8601)
  dispatched_by TEXT,                            -- 교부자
  note TEXT,                                     -- 비고
  contract_start TEXT,                           -- 계약 시작일
  contract_end TEXT,                             -- 계약 종료일
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- -------------------------------------------------
-- Table: contract_expiry_notice (계약만료 통지 이력)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS contract_expiry_notice (
  id TEXT PRIMARY KEY,                           -- UUID
  contract_id TEXT,                              -- 계약 ID → contracts.id
  employee_id TEXT,                              -- 직원 ID
  employee_name TEXT,                            -- 직원명
  company_id TEXT,                               -- 회사 ID
  company_name TEXT,                             -- 회사명
  contract_type TEXT,                            -- 계약유형
  contract_end TEXT,                             -- 계약 종료일
  days_until_expiry INTEGER,                     -- 만료까지 남은 일수
  notice_method TEXT,                            -- 통지방법 (kakao:알림톡, email:이메일)
  notice_status TEXT,                            -- 통지상태 (completed:완료)
  recipient TEXT,                                -- 수신자 (전화번호 or 이메일)
  noticed_at TEXT,                               -- 통지일시 (ISO 8601)
  noticed_by TEXT,                               -- 통지자
  note TEXT,                                     -- 비고
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- =============================================================================
--  SECTION 3: 급여 / 정산 — 급여대장, 항목, 청구, 발송, 임금대장
-- =============================================================================

-- -------------------------------------------------
-- Table: payrolls (급여대장)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS payrolls (
  id TEXT PRIMARY KEY,                           -- UUID
  employee_id TEXT,                              -- 직원 ID → employees.id
  company_id TEXT,                               -- 회사 ID → companies.id
  pay_year INTEGER,                              -- 귀속연도
  pay_month INTEGER,                             -- 귀속월
  pay_date TEXT,                                 -- 지급일
  work_days REAL,                                -- 근무일수
  base_salary REAL,                              -- 기본급
  weekly_holiday_pay REAL,                       -- 주휴수당
  standard_monthly_pay REAL,                     -- 기준월급여
  gross_pay REAL,                                -- 지급총액 (공제 전)

  -- ▼ 4대보험 공제
  national_pension REAL,                         -- 국민연금
  health_insurance REAL,                         -- 건강보험
  long_term_care REAL,                           -- 장기요양보험
  employment_insurance REAL,                     -- 고용보험

  -- ▼ 소득세 공제
  income_tax REAL,                               -- 소득세
  local_income_tax REAL,                         -- 지방소득세
  total_deduction REAL,                          -- 공제 합계
  net_pay REAL,                                  -- 실지급액

  -- ▼ 근로시간
  total_work_hours REAL,                         -- 총 근로시간
  overtime_hours REAL,                           -- 연장근로 시간
  night_hours REAL,                              -- 야간근로 시간
  holiday_hours REAL,                            -- 휴일근로 시간
  hourly_wage REAL,                              -- 통상시급

  -- ▼ 수당
  position_allowance REAL,                       -- 직책수당
  skill_allowance REAL,                          -- 기술수당
  license_allowance REAL,                        -- 면허수당
  overtime_pay REAL,                             -- 연장수당
  night_pay REAL,                                -- 야간수당
  holiday_pay REAL,                              -- 휴일수당
  transport_type TEXT,                           -- 교통수단 유형
  transport_pay_type TEXT,                       -- 교통비 지급방식
  transportation_allowance REAL,                 -- 교통비
  transportation_pay_type TEXT,                  -- 교통비 지급방식 (별도 구분)
  self_driving_allowance REAL,                   -- 자가운전보조금
  self_driving_pay_type TEXT,                    -- 자가운전보조금 지급방식
  meal_allowance REAL,                           -- 식대
  meal_pay_type TEXT,                            -- 식대 지급방식
  childcare_allowance REAL,                      -- 보육수당
  childcare_pay_type TEXT,                       -- 보육수당 지급방식
  childcare_dependents INTEGER DEFAULT 1,        -- 보육수당 대상 자녀 수
  research_allowance REAL,                       -- 연구수당
  research_pay_type TEXT,                        -- 연구수당 지급방식
  communication_allowance REAL,                  -- 통신비
  communication_pay_type TEXT,                   -- 통신비 지급방식
  fitness_allowance REAL,                        -- 건강유지비
  fitness_pay_type TEXT,                         -- 건강유지비 지급방식
  self_dev_allowance REAL,                       -- 자기계발비
  self_dev_pay_type TEXT,                        -- 자기계발비 지급방식
  book_allowance REAL,                           -- 도서구입비
  book_pay_type TEXT,                            -- 도서구입비 지급방식
  overseas_allowance REAL,                       -- 해외근무수당
  overseas_pay_type TEXT,                        -- 해외근무수당 지급방식
  contract_etc_allowance REAL,                   -- 계약서상 기타수당
  site_allowance REAL,                           -- 현장수당
  remote_area_allowance REAL,                    -- 벽지수당
  regular_bonus REAL,                            -- 정기상여금
  hazard_allowance REAL,                         -- 위험수당
  etc_allowance REAL,                            -- 기타수당
  etc_allowance_memo TEXT,                       -- 기타수당 메모

  -- ▼ 연차 / 상여 / 성과
  annual_leave_used REAL,                        -- 연차 사용일수
  annual_leave_pay REAL,                         -- 연차수당
  bonus_pay REAL,                                -- 상여금
  performance_pay REAL,                          -- 성과급
  actual_expense_pay REAL,                       -- 실비변상
  communication_pay REAL,                        -- 통신비 (지급액)

  -- ▼ 연말정산 / 건보정산 / 선지급
  year_end_tax_adjust REAL,                      -- 연말정산 환급/추징
  year_end_tax_adjust_memo TEXT,                 -- 연말정산 메모
  health_insurance_adjust REAL,                  -- 건보정산 (월할)
  health_insurance_adjust_memo TEXT,             -- 건보정산 메모
  health_insurance_adjust_yearend REAL,          -- 건보정산 (연말)
  health_insurance_adjust_yearend_memo TEXT,     -- 건보정산(연말) 메모
  ltcare_adjust_yearend REAL,                    -- 장기요양보험 연말정산
  ltcare_adjust_yearend_memo TEXT,               -- 장기요양보험 연말정산 메모
  advance_deduction REAL,                        -- 선지급 공제
  advance_deduction_memo TEXT,                   -- 선지급 공제 메모

  -- ▼ 기타
  is_draft INTEGER DEFAULT 0,                    -- 임시저장 여부 (0:확정, 1:임시)
  draft_saved_at TEXT,                           -- 임시저장 일시
  note TEXT,                                     -- 비고
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER,                            -- 수정일시 (unix ms)
  dependents INTEGER DEFAULT 1,                  -- 부양가족 수
  edit_source_id TEXT,                           -- 편집 원본 ID
  tax_dependents INTEGER DEFAULT 0               -- 소득세 공제 부양가족 수
);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_company  ON payrolls(company_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_ym       ON payrolls(pay_year, pay_month);


-- -------------------------------------------------
-- Table: payroll_items (급여 항목 상세)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_items (
  id TEXT PRIMARY KEY,                           -- UUID
  payroll_id TEXT NOT NULL,                      -- 급여대장 ID → payrolls.id
  item_type TEXT NOT NULL,                       -- 항목유형 (allowance:수당, deduction:공제, bonus:상여 등)
  amount REAL DEFAULT 0,                         -- 금액
  pay_type TEXT,                                 -- 지급방식
  memo TEXT,                                     -- 메모
  sort_order INTEGER DEFAULT 0,                  -- 정렬순서
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);
CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll ON payroll_items(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_type ON payroll_items(item_type);


-- -------------------------------------------------
-- Table: billing (청구 / 과금 정보)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS billing (
  id TEXT PRIMARY KEY,                           -- UUID
  company_id TEXT,                               -- 회사 ID → companies.id
  billing_year INTEGER,                          -- 청구연도
  billing_month INTEGER,                         -- 청구월
  employee_count INTEGER,                        -- 청구 대상 직원 수
  amount_per_employee REAL,                      -- 1인당 청구금액
  total_amount REAL,                             -- 총 청구금액
  payment_status TEXT DEFAULT 'pending',         -- 결제상태 (pending:미납, paid:완납, partial:부분납)
  payment_date TEXT,                             -- 결제일
  partial_paid_amount REAL DEFAULT 0,            -- 부분 납부액
  remaining_amount REAL,                         -- 잔액
  due_date TEXT,                                 -- 납부 기한
  created_date TEXT,                             -- 청구 생성일
  note TEXT,                                     -- 비고
  loss_amount REAL,                              -- 손실 처리액
  loss_date TEXT,                                -- 손실 처리일
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);
CREATE INDEX IF NOT EXISTS idx_billing_company ON billing(company_id);


-- -------------------------------------------------
-- Table: payroll_send_logs (급여명세서 발송 이력)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_send_logs (
  id TEXT PRIMARY KEY,                           -- UUID
  company_id TEXT,                               -- 회사 ID
  employee_id TEXT,                              -- 직원 ID
  payroll_id TEXT,                               -- 급여대장 ID → payrolls.id
  pay_year INTEGER,                              -- 귀속연도
  pay_month INTEGER,                             -- 귀속월
  sent_at TEXT,                                  -- 발송일시 (ISO 8601)
  sent_by TEXT,                                  -- 발송자
  send_method TEXT,                              -- 발송방법 (kakao:알림톡, email:이메일)
  note TEXT,                                     -- 비고
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- -------------------------------------------------
-- Table: wage_ledger_notifications (임금대장 알림)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS wage_ledger_notifications (
  id TEXT PRIMARY KEY,                           -- UUID
  company_id TEXT,                               -- 회사 ID
  year INTEGER,                                  -- 해당 연도
  month INTEGER,                                 -- 해당 월
  is_read INTEGER DEFAULT 0,                     -- 확인 여부 (0:미확인, 1:확인)
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- =============================================================================
--  SECTION 4: 보험 / 수당 / 세금 기준
-- =============================================================================

-- -------------------------------------------------
-- Table: insurance_rates (4대보험 요율 정보)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS insurance_rates (
  id TEXT PRIMARY KEY,                           -- UUID
  insurance_type TEXT,                           -- 보험유형 (pension:국민연금, health:건강보험,
                                                 --   employment:고용보험, industrial:산재보험,
                                                 --   long_term_care:장기요양)
  year INTEGER,                                  -- 적용연도
  period_start TEXT,                             -- 적용 시작일
  period_end TEXT,                               -- 적용 종료일
  rate REAL,                                     -- 요율 (%)
  rate_base TEXT,                                -- 요율 기준 (근로자/사업주)
  cap_amount REAL,                               -- 상한액
  note TEXT,                                     -- 비고
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- -------------------------------------------------
-- Table: minimum_wages (최저임금 정보)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS minimum_wages (
  id TEXT PRIMARY KEY,                           -- UUID
  year INTEGER,                                  -- 적용연도
  hourly_wage REAL,                              -- 최저시급
  monthly_wage REAL,                             -- 최저월급 (주 40시간 기준)
  note TEXT,                                     -- 비고
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- -------------------------------------------------
-- Table: tax_brackets (소득세 과세표준 구간)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS tax_brackets (
  id TEXT PRIMARY KEY,                           -- UUID
  year INTEGER NOT NULL,                         -- 적용연도
  data TEXT NOT NULL,                            -- 과세표준 데이터 (JSON)
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);


-- -------------------------------------------------
-- Table: tax_bracket_rows (소득세 과세표준 구간 상세)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS tax_bracket_rows (
  id TEXT PRIMARY KEY,                           -- UUID
  year INTEGER NOT NULL,                         -- 적용연도
  from_amount INTEGER NOT NULL,                  -- 과세표준 시작금액
  to_amount INTEGER NOT NULL,                    -- 과세표준 종료금액
  dep1_tax INTEGER DEFAULT 0,                    -- 부양가족 1인 공제세액
  dep2_tax INTEGER DEFAULT 0,                    -- 부양가족 2인 공제세액
  dep3_tax INTEGER DEFAULT 0,                    -- 부양가족 3인 공제세액
  dep4_tax INTEGER DEFAULT 0,                    -- 부양가족 4인 공제세액
  dep5_tax INTEGER DEFAULT 0,                    -- 부양가족 5인 공제세액
  dep6_tax INTEGER DEFAULT 0,                    -- 부양가족 6인 공제세액
  dep7_tax INTEGER DEFAULT 0,                    -- 부양가족 7인 공제세액
  extra_per_dep INTEGER DEFAULT 0,               -- 추가 부양가족 1인당 공제액
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);
CREATE INDEX IF NOT EXISTS idx_tax_bracket_rows_year ON tax_bracket_rows(year);


-- =============================================================================
--  SECTION 5: 알림 / 공지 — 고객사 공지, 회사 변경이력
-- =============================================================================

-- -------------------------------------------------
-- Table: company_notices (고객사 공지 / 자동 안내)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS company_notices (
  id TEXT PRIMARY KEY,                           -- UUID
  company_id TEXT,                               -- 회사 ID → companies.id
  company_name TEXT,                             -- 회사명
  notice_type TEXT,                              -- 공지유형 (welcome:환영, general:일반,
                                                 --   regular_conversion:정규직전환, probation_expiry:수습만료)
  title TEXT,                                    -- 제목
  body TEXT,                                     -- 본문
  contract_id TEXT,                              -- 관련 계약 ID
  employee_id TEXT,                              -- 관련 직원 ID
  employee_name TEXT,                            -- 관련 직원명
  contract_end TEXT,                             -- 계약 종료일
  days_until_expiry INTEGER,                     -- 만료까지 남은 일수
  sent_at TEXT,                                  -- 발송일시 (ISO 8601)
  sent_by TEXT,                                  -- 발송자
  is_read INTEGER DEFAULT 0,                     -- 열람 여부 (0:미열람, 1:열람)
  read_at TEXT,                                  -- 열람일시
  gn_status TEXT,                                -- 발송상태 (draft:임시, scheduled:예약, sent:발송, cancelled:취소)
  gn_scheduled_at TEXT,                          -- 예약 발송일시
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);
CREATE INDEX IF NOT EXISTS idx_company_notices_company ON company_notices(company_id);


-- -------------------------------------------------
-- Table: company_history (회사 정보 변경 이력)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS company_history (
  id TEXT PRIMARY KEY,                           -- UUID
  company_id TEXT,                               -- 회사 ID → companies.id
  changed_at TEXT,                               -- 변경일시 (ISO 8601)
  changes TEXT,                                  -- 변경 내역 (JSON)
  snapshot TEXT,                                 -- 변경 당시 스냅샷 (JSON)
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER,                            -- 수정일시 (unix ms)
  effective_date TEXT                            -- 변경 적용일
);


-- =============================================================================
--  SECTION 6: 연차 — 연차대장, 연차촉진
-- =============================================================================

-- -------------------------------------------------
-- Table: annual_leave_ledger (연차대장)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS annual_leave_ledger (
  id TEXT PRIMARY KEY,                           -- UUID
  employee_id TEXT,                              -- 직원 ID → employees.id
  company_id TEXT,                               -- 회사 ID → companies.id
  year INTEGER,                                  -- 기준연도
  ref_date TEXT,                                 -- 기준일
  period_start TEXT,                             -- 연차 산정 시작일
  period_end TEXT,                               -- 연차 산정 종료일
  total_days REAL,                               -- 총 발생 연차
  carryover_days REAL DEFAULT 0,                 -- 이월 연차
  month_data TEXT,                               -- 월별 사용 데이터 (JSON)
  total_used REAL,                               -- 총 사용 연차
  remain_days REAL,                              -- 잔여 연차
  ordinary_wage REAL,                            -- 통상임금 (연차수당 산정용)
  leave_pay_estimate REAL,                       -- 연차수당 예상액
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER,                            -- 수정일시 (unix ms)
  contract_id TEXT,                              -- 관련 계약 ID
  status TEXT                                    -- 상태
);


-- -------------------------------------------------
-- Table: annual_leave_promotions (연차촉진 이력)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS annual_leave_promotions (
  id TEXT PRIMARY KEY,                           -- UUID
  employee_id TEXT,                              -- 직원 ID
  employee_name TEXT,                            -- 직원명
  company_id TEXT,                               -- 회사 ID
  company_name TEXT,                             -- 회사명
  contract_type TEXT,                            -- 계약유형
  total_leave_days REAL,                         -- 총 연차일수
  used_leave_days REAL,                          -- 사용 연차일수
  remaining_leave_days REAL,                     -- 잔여 연차일수
  annual_leave_basis TEXT,                       -- 연차 산정 기준
  leave_pay_estimate REAL,                       -- 연차수당 예상액
  worker_send_method TEXT,                       -- 근로자 발송방법
  sent_at TEXT,                                  -- 발송일시 (ISO 8601)
  sent_by TEXT,                                  -- 발송자
  note TEXT,                                     -- 비고
  created_at INTEGER,                            -- 생성일시 (unix ms)
  updated_at INTEGER                             -- 수정일시 (unix ms)
);

