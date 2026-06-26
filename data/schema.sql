-- ============================================================
-- SQLite Schema for 인사톡 노무톡
-- Generated: 2026-06-17
-- ============================================================

PRAGMA journal_mode = WAL;
-- FK는 마이그레이션 후 수동 활성화

-- -----------------------------------------------------------
-- companies (고객사)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id                TEXT PRIMARY KEY,
  company_name      TEXT,
  business_number   TEXT,
  representative    TEXT,
  industry          TEXT,
  address           TEXT,
  phone             TEXT,
  email             TEXT,
  pay_period        TEXT,
  pay_day           INTEGER,
  access_code       TEXT,
  note              TEXT,
  insurance_basis   TEXT,
  annual_leave_basis TEXT,
  is_draft          INTEGER DEFAULT 0,
  draft_saved_at    TEXT,
  status            TEXT DEFAULT '이용중',
  allowance_config          TEXT,
  service_contract_file_name TEXT,
  service_contract_file_data TEXT,
  created_at                INTEGER,
  updated_at                INTEGER
);

-- -----------------------------------------------------------
-- employees (직원)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id                  TEXT PRIMARY KEY,
  company_id          TEXT REFERENCES companies(id),
  name                TEXT,
  gender              TEXT,
  employment_category TEXT,
  employee_number     TEXT,
  department          TEXT,
  position            TEXT,
  hire_date           TEXT,
  contract_period     TEXT,
  status              TEXT DEFAULT '재직',
  note                TEXT,
  id_number           TEXT,
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  dependents          INTEGER DEFAULT 0,
  job_description     TEXT,
  created_at          INTEGER,
  updated_at          INTEGER
);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

-- -----------------------------------------------------------
-- contracts (근로계약)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id                    TEXT PRIMARY KEY,
  employee_id           TEXT REFERENCES employees(id),
  company_id            TEXT REFERENCES companies(id),
  contract_start        TEXT,
  contract_end          TEXT,
  work_hours_per_day    REAL,
  work_days_per_week    REAL,
  work_days_per_month   REAL,
  break_time            REAL,
  annual_leave_days     REAL,
  monthly_salary_agreed REAL,
  annual_salary         REAL,
  base_salary           REAL,
  hourly_wage           REAL,
  weekly_holiday_pay    REAL,
  contract_type         TEXT,
  status                TEXT DEFAULT '활성',
  pay_period            TEXT,
  -- 수당 (allowance)
  meal_allowance        REAL,   meal_pay_type         TEXT,
  transportation_allowance REAL, transport_pay_type   TEXT,
  research_allowance    REAL,   research_pay_type     TEXT,
  communication_allowance REAL, communication_pay_type TEXT,
  fitness_allowance     REAL,   fitness_pay_type      TEXT,
  self_dev_allowance    REAL,   self_dev_pay_type     TEXT,
  book_allowance        REAL,   book_pay_type         TEXT,
  overseas_allowance    REAL,   overseas_pay_type     TEXT,
  -- 4대보험
  insurance_employment  TEXT,
  insurance_industrial  TEXT,
  insurance_pension     TEXT,
  insurance_health      TEXT,
  -- 고정 OT/야간/휴일
  fixed_ot_pay          REAL,   fixed_ot_hours        REAL,
  fixed_night_pay       REAL,   fixed_night_hours     REAL,
  fixed_hol_pay         REAL,   fixed_hol_hours       REAL,
  -- 수습
  probation_months      INTEGER, probation_pct        REAL,
  probation_amt         REAL,    probation_basis       TEXT,
  -- 수정재발행
  amended_from          TEXT,
  is_voided_by_amend    INTEGER DEFAULT 0,
  voided_at             TEXT,
  -- 서류
  signed_file_name      TEXT,    signed_file_data      TEXT,
  consent_file_name     TEXT,    consent_file_data     TEXT,
  -- 기타
  salary_start_date     TEXT,    salary_end_date       TEXT,
  is_draft              INTEGER DEFAULT 0,
  note                  TEXT,
  created_at            INTEGER,
  updated_at            INTEGER
);
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company  ON contracts(company_id);

-- -----------------------------------------------------------
-- payrolls (급여)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payrolls (
  id                  TEXT PRIMARY KEY,
  employee_id         TEXT REFERENCES employees(id),
  company_id           TEXT REFERENCES companies(id),
  pay_year            INTEGER,
  pay_month           INTEGER,
  pay_date            TEXT,
  work_days           REAL,
  base_salary         REAL,
  weekly_holiday_pay  REAL,
  standard_monthly_pay REAL,
  gross_pay           REAL,
  national_pension    REAL,
  health_insurance    REAL,
  long_term_care      REAL,
  employment_insurance REAL,
  income_tax          REAL,
  local_income_tax    REAL,
  total_deduction     REAL,
  net_pay             REAL,
  is_draft            INTEGER DEFAULT 0,
  note                TEXT,
  created_at          INTEGER,
  updated_at          INTEGER
);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_company  ON payrolls(company_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_ym       ON payrolls(pay_year, pay_month);

-- -----------------------------------------------------------
-- billing (시스템 사용료)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing (
  id                  TEXT PRIMARY KEY,
  company_id          TEXT REFERENCES companies(id),
  billing_year        INTEGER,
  billing_month       INTEGER,
  employee_count      INTEGER,
  amount_per_employee REAL,
  total_amount        REAL,
  payment_status      TEXT DEFAULT '납부대기',
  payment_date        TEXT,
  partial_paid_amount REAL DEFAULT 0,
  remaining_amount    REAL,
  due_date            TEXT,
  created_date        TEXT,
  note                TEXT,
  loss_amount         REAL,
  loss_date           TEXT,
  created_at          INTEGER,
  updated_at          INTEGER
);
CREATE INDEX IF NOT EXISTS idx_billing_company ON billing(company_id);

-- -----------------------------------------------------------
-- payroll_send_logs (급여명세서 발송 이력)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_send_logs (
  id            TEXT PRIMARY KEY,
  company_id    TEXT REFERENCES companies(id),
  employee_id   TEXT REFERENCES employees(id),
  payroll_id    TEXT REFERENCES payrolls(id),
  pay_year      INTEGER,
  pay_month     INTEGER,
  sent_at       TEXT,
  sent_by       TEXT,
  send_method   TEXT,
  note          TEXT,
  created_at    INTEGER,
  updated_at    INTEGER
);

-- -----------------------------------------------------------
-- contract_dispatch (계약서 발송 이력)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contract_dispatch (
  id              TEXT PRIMARY KEY,
  contract_id     TEXT REFERENCES contracts(id),
  employee_id     TEXT REFERENCES employees(id),
  employee_name   TEXT,
  company_id      TEXT REFERENCES companies(id),
  company_name    TEXT,
  contract_type   TEXT,
  dispatch_method TEXT,
  dispatch_status TEXT,
  recipient       TEXT,
  dispatched_at   TEXT,
  dispatched_by   TEXT,
  note            TEXT,
  contract_start  TEXT,
  contract_end    TEXT,
  created_at      INTEGER,
  updated_at      INTEGER
);

-- -----------------------------------------------------------
-- contract_expiry_notice (계약만료 통지)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contract_expiry_notice (
  id                TEXT PRIMARY KEY,
  contract_id       TEXT REFERENCES contracts(id),
  employee_id       TEXT REFERENCES employees(id),
  employee_name     TEXT,
  company_id        TEXT REFERENCES companies(id),
  company_name      TEXT,
  contract_type     TEXT,
  contract_end      TEXT,
  days_until_expiry INTEGER,
  notice_method     TEXT,
  notice_status     TEXT,
  recipient         TEXT,
  noticed_at        TEXT,
  noticed_by        TEXT,
  note              TEXT,
  created_at        INTEGER,
  updated_at        INTEGER
);

-- -----------------------------------------------------------
-- company_notices (고객사 알림)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_notices (
  id                TEXT PRIMARY KEY,
  company_id        TEXT REFERENCES companies(id),
  company_name      TEXT,
  notice_type       TEXT,
  title             TEXT,
  body              TEXT,
  contract_id       TEXT,
  employee_id       TEXT,
  employee_name     TEXT,
  contract_end      TEXT,
  days_until_expiry INTEGER,
  sent_at           TEXT,
  sent_by           TEXT,
  is_read           INTEGER DEFAULT 0,
  read_at           TEXT,
  gn_status         TEXT,
  gn_scheduled_at   TEXT,
  created_at        INTEGER,
  updated_at        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_company_notices_company ON company_notices(company_id);

-- -----------------------------------------------------------
-- admin_accounts (관리자 계정)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_accounts (
  id                TEXT PRIMARY KEY,
  username          TEXT UNIQUE,
  password          TEXT,
  display_name      TEXT,
  created_at_label  TEXT,
  created_at        INTEGER,
  updated_at        INTEGER
);

-- -----------------------------------------------------------
-- insurance_rates (4대보험 요율)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS insurance_rates (
  id              TEXT PRIMARY KEY,
  insurance_type  TEXT,
  year            INTEGER,
  period_start    TEXT,
  period_end      TEXT,
  rate            REAL,
  rate_base       TEXT,
  cap_amount      REAL,
  note            TEXT,
  created_at      INTEGER,
  updated_at      INTEGER
);

-- -----------------------------------------------------------
-- minimum_wages (최저임금)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS minimum_wages (
  id            TEXT PRIMARY KEY,
  year          INTEGER,
  hourly_wage   REAL,
  monthly_wage  REAL,
  note          TEXT,
  created_at    INTEGER,
  updated_at    INTEGER
);

-- -----------------------------------------------------------
-- annual_leave_promotions (연차 사용촉진 이력)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS annual_leave_promotions (
  id                    TEXT PRIMARY KEY,
  employee_id           TEXT REFERENCES employees(id),
  employee_name         TEXT,
  company_id            TEXT REFERENCES companies(id),
  company_name          TEXT,
  contract_type         TEXT,
  total_leave_days      REAL,
  used_leave_days       REAL,
  remaining_leave_days  REAL,
  annual_leave_basis    TEXT,
  leave_pay_estimate    REAL,
  worker_send_method    TEXT,
  sent_at               TEXT,
  sent_by               TEXT,
  note                  TEXT,
  created_at            INTEGER,
  updated_at            INTEGER
);

-- -----------------------------------------------------------
-- annual_leave_ledger (연차 관리대장)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS annual_leave_ledger (
  id                TEXT PRIMARY KEY,
  employee_id       TEXT REFERENCES employees(id),
  company_id        TEXT REFERENCES companies(id),
  year              INTEGER,
  ref_date          TEXT,
  period_start      TEXT,
  period_end        TEXT,
  total_days        REAL,
  carryover_days    REAL DEFAULT 0,
  month_data        TEXT,
  total_used        REAL,
  remain_days       REAL,
  ordinary_wage     REAL,
  leave_pay_estimate REAL,
  created_at        INTEGER,
  updated_at        INTEGER
);

-- -----------------------------------------------------------
-- wage_ledger_notifications (임금대장 알림)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS wage_ledger_notifications (
  id          TEXT PRIMARY KEY,
  company_id  TEXT,
  year        INTEGER,
  month       INTEGER,
  is_read     INTEGER DEFAULT 0,
  created_at  INTEGER,
  updated_at  INTEGER
);
CREATE TABLE IF NOT EXISTS company_history (
  id             TEXT PRIMARY KEY,
  company_id     TEXT REFERENCES companies(id),
  changed_at     INTEGER,
  effective_date TEXT,
  changes        TEXT,
  snapshot       TEXT,
  created_at     INTEGER,
  updated_at     INTEGER
);
