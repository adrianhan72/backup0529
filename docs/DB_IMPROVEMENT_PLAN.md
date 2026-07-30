# 🗄️ 데이터베이스 개선안 — 인사톡 노무톡

**작성일**: 2026-06-24  
**DB 엔진**: SQLite (better-sqlite3)  
**현황**: 16개 테이블, 총 1,203개 레코드

---

## 📊 현재 DB 현황

| 테이블 | 레코드 | 컬럼 | 주요 문제 |
|--------|--------|------|-----------|
| `payrolls` | 718 | 23 | ⚠️ 스키마 파일과 실제 컬럼 불일치 (실제 55개 필드) |
| `employees` | 112 | 20 | `status='재직'/'active'` 혼용 |
| `contracts` | 136 | 61 | 필드 과다, 수당/보험 필드 분리 필요 |
| `company_notices` | 145 | 19 | 비정규화 과다, FK 누락 |
| `payroll_send_logs` | 113 | 12 | — |
| `contract_dispatch` | 22 | 17 | — |
| `companies` | 9 | 20 | — |
| `billing` | 13 | 18 | — |
| `insurance_rates` | 20 | 11 | — |
| `minimum_wages` | 12 | 7 | — |
| `company_history` | 8 | 7 | — |
| `contract_expiry_notice` | 5 | 17 | — |
| `admin_accounts` | 2 | 7 | 🔴 비밀번호 평문 저장 |
| `annual_leave_ledger` | 2 | 16 | JSON 문자열 컬럼 (`month_data`) |
| `annual_leave_promotions` | 1 | 17 | — |
| `wage_ledger_notifications` | 0 | 7 | 미사용 테이블 |

---

## 🔴 심각 (Critical) — 즉시 조치 필요

### 1. 관리자 비밀번호 평문 저장

**현재 상태**:
```sql
CREATE TABLE admin_accounts (
  password TEXT,  -- 평문 저장: 'admin1234!'
);
```

**위험**: DB 파일 탈취 시 모든 관리자 계정 노출. 보안 감사 통과 불가.

**개선안**:
```sql
-- bcrypt 또는 scrypt 해시 적용
password_hash TEXT NOT NULL  -- 예: $2b$10$...
```

**조치**: Node.js `bcrypt` 모듈 도입 → 로그인 시 `bcrypt.compare()`, 최초 비밀번호 설정 시 `bcrypt.hash()`

---

### 2. API 인증/인가 전무

**현재 상태**: `/tables/:t` 엔드포인트가 인증 없이 모든 데이터에 접근 가능. `DELETE`, `PUT`, `PATCH` 도 제한 없음.

**위험**: 브라우저 개발자 도구만으로 전체 DB 조작 가능.

**개선안**:
```
POST /api/auth/login      → JWT 발급
모든 /tables/* 요청        → Authorization: Bearer <token> 검증
```

**조치**: Express 미들웨어로 JWT 인증 레이어 추가. `jsonwebtoken` 모듈 사용.

---

### 3. payrolls 스키마 불일치

**현재 상태**: `schema.sql` 23컬럼 vs 실제 앱 55개 필드 사용. 새 필드는 `POST /tables/payrolls` 시 자동 추가됨 (ALTER TABLE 없이).

**실제 사용 중이지만 schema.sql에 누락된 필드**:
```
daily_wage, hourly_wage, overtime_hours, night_hours, holiday_hours,
total_work_hours, position_allowance, skill_allowance, license_allowance,
meal_allowance, transportation_allowance, self_driving_allowance,
remote_area_allowance, childcare_allowance, research_allowance,
communication_pay, annual_leave_pay, bonus_pay, performance_pay,
actual_expense_pay, overtime_pay, night_pay, holiday_pay,
year_end_tax_adjust, health_insurance_adjust, advance_deduction,
annual_leave_used, dependents, etc_allowance, other_pay,
draft_saved_at, (and more...)
```

**개선안**:
- `schema.sql`을 실제 DB 상태와 동기화
- 마이그레이션 관리 도구 도입 (또는 최소한 버전별 ALTER 스크립트 관리)

---

## 🟠 주요 (Major) — 우선 개선

### 4. 상태값 문자열 난립

**현재 상태**: 동일한 의미의 상태가 여러 문자열로 저장됨

| 필드 | 사용 중인 값 | 문제 |
|------|-------------|------|
| `employees.status` | `'재직'`, `'active'`, `'퇴직'`, `'resigned'` | 한글/영문 혼용 |
| `companies.status` | `'이용중'`, `'이용중지'` | — |
| `contracts.status` | `'활성'`, `'유효'`, `'active'`, `'만료'`, `'해지'`, `'파기'`, `'계약예정'`, `'갱신예정'`, `'해지예정'`, `'서류미비'`, `'갱신됨'`, `'취소'` | 12가지 상태 |
| `billing.payment_status` | `'납부대기'`, `'일부납'`, `'미납'`, `'완납'` | — |

**개선안 ① (최소 변경)**: 코드 내 상수 정의 + 프론트 검증

```javascript
// admin-state.js 상단
const EMPLOYEE_STATUS = Object.freeze({
  ACTIVE: '재직',
  RESIGNED: '퇴직',
});
// 모든 코드에서 EMPLOYEE_STATUS.ACTIVE 사용, 'active' → '재직' 정규화
```

**개선안 ② (이상적)**: Lookup 테이블 + FK

```sql
CREATE TABLE status_codes (
  id      TEXT PRIMARY KEY,
  domain  TEXT,    -- 'employee', 'company', 'contract', 'payment'
  code    TEXT,    -- 'active', 'resigned'
  label   TEXT,    -- '재직', '퇴직'
  UNIQUE(domain, code)
);
```

---

### 5. 계약(contracts) 필드 과다 → 정규화 필요

**현재**: contracts 테이블 61개 컬럼. 수당 8종 × 2컬럼(금액+지급유형) = 16컬럼, 고정OT 3종 × 2컬럼 = 6컬럼, 4대보험 4컬럼, 서류 2종 × 2컬럼 = 4컬럼

**문제**:
- 수당 종류 추가 시 테이블 ALTER 필요
- NULL 컬럼 다수 (사용하지 않는 수당)
- JS 코드에서 수당 필드명 하드코딩

**개선안**: 수당/보험/OT를 별도 테이블로 분리

```sql
-- 계약별 수당
CREATE TABLE contract_allowances (
  id            TEXT PRIMARY KEY,
  contract_id   TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  allowance_type TEXT,   -- 'meal', 'transport', 'research', 'communication', ...
  amount        REAL,
  pay_type      TEXT,    -- 'fixed' (매월정기), 'daily' (출근일수에 따름)
  is_taxable    INTEGER DEFAULT 1,
  created_at    INTEGER,
  updated_at    INTEGER
);

-- 계약별 보험
CREATE TABLE contract_insurances (
  id            TEXT PRIMARY KEY,
  contract_id   TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  insurance_type TEXT,  -- 'pension', 'health', 'employment', 'industrial'
  is_enrolled   INTEGER DEFAULT 1,
  created_at    INTEGER,
  updated_at    INTEGER
);

-- 계약별 고정 OT
CREATE TABLE contract_fixed_ot (
  id            TEXT PRIMARY KEY,
  contract_id   TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  ot_type       TEXT,    -- 'overtime', 'night', 'holiday'
  hours         REAL,
  pay           REAL,
  created_at    INTEGER,
  updated_at    INTEGER
);
```

**장점**: 수당 무한 확장 가능, NULL 제거, 쿼리 단순화  
**단점**: JOIN 증가, 프론트엔드 코드 전면 수정 필요 → **중기 과제**

---

### 6. 중복 데이터 방지 (Unique 제약)

**현재**: 중복 방지가 프론트엔드 JS 로직에만 의존

| 테이블 | 중복 위험 | 필요 Unique |
|--------|----------|-------------|
| `payrolls` | 동일 직원·연월 급여 2건 | `UNIQUE(employee_id, pay_year, pay_month, is_draft)` |
| `contract_dispatch` | 동일 계약 중복 발송 | `UNIQUE(contract_id, dispatch_method)` (부분) |
| `contract_expiry_notice` | 동일 계약 중복 통지 | `UNIQUE(contract_id, strftime('%Y-%m', noticed_at))` |
| `company_notices` | 동일 공지 중복 | 앱 로직으로 충분 |

**개선안**:
```sql
CREATE UNIQUE INDEX idx_payrolls_emp_ym ON payrolls(employee_id, pay_year, pay_month)
  WHERE is_draft = 0;  -- 확정 급여만 중복 방지 (임시저장은 여러 건 허용)
```

---

## 🟡 경미 (Minor) — 점진적 개선

### 7. 날짜/시간 타입 통일

**현재**: `TEXT` (ISO 8601), `INTEGER` (Unix ms), `TEXT` (YYYY-MM-DD) 혼재

| 필드 예시 | 현재 타입 | 실제 값 |
|-----------|----------|---------|
| `created_at` | INTEGER | `1778650295726` (ms) |
| `contract_start` | TEXT | `2025-01-06` (date only) |
| `sent_at` | TEXT | `2026-05-13T09:30:00.000Z` (ISO) |
| `pay_date` | TEXT | `2026-04-25` (date only) |
| `draft_saved_at` | TEXT | `2026-05-26T14:30:00.000Z` (ISO) |

**개선안**:
- 모든 생성/수정 일시 → `INTEGER` (Unix ms)로 통일 (SQLite 권장)
- 날짜 전용(계약일, 급여일 등) → `TEXT` `YYYY-MM-DD` 형식으로 통일
- 타임스탬프 → `TEXT` ISO 8601 또는 `INTEGER` 중 하나로 통일

---

### 8. JSON 컬럼 → 정규화

**현재**:
```sql
annual_leave_ledger.month_data TEXT  -- [{"month":1,"dates":"3,15","days":1.5,"note":""}, ...]
companies.allowance_config TEXT      -- JSON 설정 문자열
```

**개선안**: `month_data` → `annual_leave_details` 테이블로 정규화

```sql
CREATE TABLE annual_leave_details (
  id            TEXT PRIMARY KEY,
  ledger_id     TEXT REFERENCES annual_leave_ledger(id) ON DELETE CASCADE,
  month         INTEGER,   -- 1~12
  used_dates    TEXT,       -- '3,15'
  used_days     REAL,       -- 1.5
  note          TEXT,
  UNIQUE(ledger_id, month)
);
```

---

### 9. 인덱스 최적화

**현재 인덱스**:
```sql
employees:   (company_id)
contracts:   (employee_id), (company_id)
payrolls:    (employee_id), (company_id), (pay_year, pay_month)
billing:     (company_id)
company_notices: (company_id)
```

**필요한 추가 인덱스**:

| 테이블 | 인덱스 | 사유 |
|--------|--------|------|
| `payrolls` | `(company_id, pay_year, pay_month)` | 대시보드 월별 집계 |
| `payrolls` | `(employee_id, pay_year, pay_month)` | 연차 누적 사용량 조회 |
| `contracts` | `(employee_id, contract_start)` | 수습/재직기간 계산 |
| `contracts` | `(status)` | 활성 계약 필터링 |
| `contract_dispatch` | `(contract_id)` | 계약별 발송 이력 |
| `company_notices` | `(company_id, notice_type, is_read)` | 미읽음 알림 조회 |
| `annual_leave_ledger` | `(employee_id, year)` | 연차 관리대장 조회 |
| `payroll_send_logs` | `(company_id, pay_year, pay_month)` | 월별 발송 현황 |

---

### 10. 외래 키 제약 실효성

**현재**: `PRAGMA foreign_keys = ON` 설정되어 있으나, 참조 무결성이 보장되지 않는 경우 있음

**문제**: 고객사 삭제 시 연결된 직원·계약·급여 데이터 정리되지 않음

**개선안**:
```sql
-- 모든 FK에 ON DELETE 동작 명시
CREATE TABLE employees (
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  -- ...
);
```

⚠️ `CASCADE`는 위험할 수 있으므로 `ON DELETE RESTRICT`(삭제 차단) 또는 `ON DELETE SET NULL`(연결 해제) 검토 필요.

---

### 11. 데이터 마이그레이션 관리

**현재**: `scripts/migrate-to-sqlite.js` — db.json → SQLite 1회성 변환 스크립트. 버전 간 스키마 변경 관리 체계 없음.

**개선안**:
```
data/
  migrations/
    001_initial_schema.sql
    002_add_payroll_fields.sql
    003_add_annual_leave_ledger.sql
    004_add_is_draft.sql
    ...
  schema.sql          ← 항상 최신 스키마 반영
```

또는 [knex.js](https://knexjs.org/) 마이그레이션 도구 도입 (경량, SQLite 지원).

---

## 📋 우선순위 요약

| 순위 | 항목 | 영향 | 공수 | 구분 |
|------|------|------|------|------|
| 🔴 1 | 비밀번호 해시화 | 보안 | 소 | Critical |
| 🔴 2 | API 인증 추가 | 보안 | 중 | Critical |
| 🔴 3 | schema.sql ↔ 실제 DB 동기화 | 신뢰성 | 소 | Critical |
| 🟠 4 | 상태값 정규화 | 유지보수 | 중 | Major |
| 🟠 5 | payrolls Unique 인덱스 | 데이터 무결성 | 소 | Major |
| 🟠 6 | 추가 인덱스 최적화 | 성능 | 소 | Major |
| 🟡 7 | 계약 수당/보험 정규화 | 확장성 | 대 | Minor |
| 🟡 8 | 날짜 타입 통일 | 일관성 | 중 | Minor |
| 🟡 9 | JSON 컬럼 정규화 | 쿼리 가능성 | 중 | Minor |
| 🟡 10 | FK ON DELETE 설정 | 무결성 | 중 | Minor |
| 🟡 11 | 마이그레이션 관리 도입 | 운영 | 중 | Minor |

---

## 🛠️ 즉시 적용 가능한 Quick Wins (1~2시간)

다음 3가지는 당장 적용 가능하고 리스크가 낮습니다:

### ✅ Quick Win 1: schema.sql 최신화
현재 DB에서 `PRAGMA table_info`로 스키마 추출 → `schema.sql` 덮어쓰기

### ✅ Quick Win 2: 중복 방지 Unique 인덱스 추가
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_payrolls_emp_ym_draft
  ON payrolls(employee_id, pay_year, pay_month, IFNULL(is_draft, 0));
```

### ✅ Quick Win 3: 성능 인덱스 추가
```sql
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_payrolls_co_ym ON payrolls(company_id, pay_year, pay_month);
CREATE INDEX IF NOT EXISTS idx_notices_co_type_read ON company_notices(company_id, notice_type, is_read);
```

---

> **참고**: SQLite는 동시 쓰기(Concurrent Writes)에 취약하므로,  
> 향후 사용자 수 증가 시 **PostgreSQL** 또는 **MySQL**로의 이전을 검토해야 합니다.
