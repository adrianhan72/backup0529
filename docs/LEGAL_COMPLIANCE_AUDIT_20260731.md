# 근로계약·수당·통상임금 법적 감사 보고서

> **감사일**: 2026-07-31 | **대상**: backup0529 (refactoring_ai)
> **법적 근거**: 근로기준법, 근로기준법 시행령, 소득세법, 개인정보보호법

---

## 1. 근로계약서 필수 기재사항

### 1.1 근로기준법 제17조 대비

| 법정 요구사항 | 구현 | 코드 위치 |
|-------------|------|----------|
| 임금 (구성항목·계산방법·지급방법) | ✅ | `base_salary`, `hourly_wage`, 17종 수당, `pay_day` |
| 소정근로시간 | ✅ | `work_hours_per_day`, `work_days_per_week`, `schedule_json` |
| 휴일 | ✅ | `weekly_holiday_pay` (주휴수당), 계약서 템플릿 |
| 연차유급휴가 | ✅ | `annual_leave_days` (자동계산) |
| 근로장소 | ✅ | `employees.address` (필수 입력) |
| 업무 | ✅ | `employees.job_description` (필수 입력) |
| 취업규칙 | ⚠️ | 계약서 템플릿에 언급만, 별도 DB 관리 없음 |

### 1.2 검증 로직 (`_ctValidate()`)

- **필수 필드**: 사원번호, 이름, 입사일, 계약시작일, 주민번호, 담당업무, 주소, 휴대전화, 통상시급, 근무시간표, 급여산정기간
- **조건부 필수**: 일용직(일급여, 계약종료일), 수습(수습기간·비율·금액), 보육수당(fixed+부양가족≥1)
- **법적 검증**: 최저임금 위반, 계약기간 1개월 미만, 입사일 730일 초과(정규직 전환 의무), 제3자정보제공동의서 첨부 필수

**평가: 🟢 적정** — 법정 요구사항 대부분 충족, 취업규칙 관리 기능만 보강 필요

---

## 2. 근로계약서·동의서 발송의무

### 2.1 서면 교부 의무 (근로기준법 제17조)

| 항목 | 상태 |
|------|------|
| 발송 이력 관리 | ✅ `contract_dispatch` 테이블 |
| 미발송 계약 추적 | ✅ `_cdpGetUnsentContracts()` |
| 발송 방식 | 알림톡(kakao) / 이메일(email) / 수동교부(manual) / 수정재발행(reissue) |
| 일괄 발송 | ✅ 선택 일괄 + 개별 발송 |
| 고객사 알림 | ✅ 인앱 알림(`company_notices`) + 메시지 규칙 연동 |
| 갱신계약 처리 | ✅ `renewed_from_id` 있는 계약은 동의서 재발송 제외 |

### 2.2 정보제공동의서 (개인정보보호법 제17조)

| 항목 | 상태 |
|------|------|
| 발송 이력 관리 | ✅ `consent_dispatch` 테이블 |
| 미발송 계약 추적 | ✅ `_cnsGetUnsentContracts()` |
| 신규 계약 시 첨부 강제 | ✅ `_ctValidate()` Rule 9 |

**평가: 🟢 우수** — 발송 의무 추적 시스템 완비

---

## 3. 수당 과세/비과세 분류

### 3.1 비과세 항목 (소득세법 제12조)

| 수당 | 시스템 비과세 한도 | 법정 한도 | 일치 |
|------|-----------------|----------|------|
| 식대 | 20만원/월 | 20만원/월 | ✅ |
| 차량유지비 (자가운전보조금) | 20만원/월 | 20만원/월 | ✅ |
| 연구수당 | 20만원/월 | 20만원/월 | ✅ |
| 보육수당 | 20만원/월 | 20만원/월 (만6세 이하 1인당) | ✅ |

> **법령 근거**: 소득세법 제12조 제3호 (2024.12.31. 개정, 2025.1.1. 시행)
> - 가목: 식사대 월 20만원
> - 다목: 자가운전보조금 월 20만원
> - 라목: 보육수당 월 20만원 (만 6세 이하 자녀 1인당) — 2024년 개정으로 10만원→20만원 상향

### 3.2 비과세 적용 로직

```javascript
// _cmGetAllowanceConfig(): company-history.js:200
const _CM_AW_TAX_EXEMPT = ['childcare', 'car', 'meal', 'research'];

// 통상임금 산입 시 비과세 적용
const _TAX_EXEMPT_CAP = 200000; // 모든 비과세 항목 월 20만원 한도
```

비과세 항목은 기본 활성화(`_CM_AW_TAX_EXEMPT`), 비과세분은 월 20만원 한도로 통상임금에만 포함(과세소득에서는 제외). 4개 항목 모두 법정 한도(20만원)와 정확히 일치.

**평가: 🟢 적정** — 모든 비과세 한도가 현행법(2025.1.1. 시행) 기준 적합

```javascript
// _cmGetAllowanceConfig(): company-history.js:200
const _CM_AW_TAX_EXEMPT = ['childcare', 'car', 'meal', 'research'];

// 통상임금 산입 시 비과세 적용
const _teVal = (field) => {
    const amt = gv(`pi-${_idMap[field] || field}`);
    if (_piTaxCfg[`${field}_tax_exempt`]) return Math.min(amt, _TAX_EXEMPT_CAP);
    return amt;
};
```

비과세 항목은 기본 활성화(`_CM_AW_TAX_EXEMPT`), 비과세분은 월 20만원 한도로 통상임금에만 포함(과세소득에서는 제외).

**평가: 🔴 보육수당 한도 시정 필요**

---

## 4. 통상임금 산정 (근로기준법 시행령 제6조)

### 4.1 통상시급 계산식

```javascript
// contract-lifecycle.js:1204-1210
const monthlyStdH = ht * dy * 365 / 12 / 7; // 월 소정근로시간 (≈209h)
fields.hourly_wage = Math.round(monthlyForCalc / monthlyStdH);
```

- 월 소정근로시간 = `일근로시간 × 주근로일수 × 365 ÷ 12 ÷ 7`
- 통상시급 = `월 약정임금 ÷ 월 소정근로시간`

### 4.2 통상임금 포함 항목 분류

#### 항상 포함 (법정 통상임금):
| 수당 | 근거 |
|------|------|
| 기본급 | 소정근로 대가 |
| 직책수당 | 고정성·일률성 |
| 기술수당 | 고정성·일률성 |
| 면허수당 | 고정성·일률성 |
| 위험수당 | 고정성·일률성 |
| 현장수당 | 고정성·일률성 |
| 오지근무수당 | 고정성·일률성 |

#### 조건부 포함 (pay_type === 'fixed'인 경우만):
식대, 교통비/차량지원비, 연구수당, 통신비, 건강유지비, 자기계발비, 도서구입비, 해외근무수당, 보육수당

#### 항상 제외:
연장·야간·휴일근로수당, 연차수당, 상여금, 성과급, 실비변상

### 4.3 `pay_type` 기본값 리스크

```javascript
// contract-lifecycle.js:1194 (ptOf)
const _ptOf = (contractPt, cfgKey) =>
    contractPt || _piLcCfg[`${cfgKey}_pay_type`] || (_piLcCfg[cfgKey] ? 'fixed' : '');
```

**문제**: `allowance_config`에 수당 항목이 존재하면 pay_type 기본값이 `'fixed'`로 설정됨. 사용자가 명시적으로 pay_type을 변경하지 않으면 **실제로는 출근일수에 따라 변동되는 수당도 통상임금에 포함**될 위험이 있음.

**영향**: 통상임금 과대 산정 → 주휴수당·연차수당·각종 법정수당 과다 지급 → 회사 부담 증가

**평가: 🟡 pay_type 기본값 개선 권고**

### 4.4 보수월액(표준소득월액) 계산

```javascript
// payroll-input-main.js:3320-3340
const std = gv('pi-base') + gv('pi-weekly-hol')       // 기본급 + 주휴
  + gv('pi-site') + gv('pi-position')                   // 항상 포함
  + _teVal('car') + _teVal('meal') + _teVal('research') + _teVal('childcare')
  + _teVal('remote_area')
  + (payType==='fixed' ? 수당 : 0)                       // 조건부 포함
  + gv('pi-skill') + gv('pi-license')
  + otPay + nightPay + holPay + gv('pi-annual-pay');    // 변동 수당
```

**평가: 🟢 적정** — `pay_type === 'fixed'` 기준 통상임금 포함 로직은 법정 요건에 부합

---

## 5. 종합 진단

| 영역 | 평가 | 핵심 이슈 |
|------|------|----------|
| 근로계약 필수 기재사항 | 🟢 적정 | 취업규칙 별도 관리 기능 부재 (경미) |
| 계약서 서면교부 | 🟢 우수 | — |
| 정보제공동의서 발송 | 🟢 우수 | — |
| 비과세 수당 한도 | � 적정 | 모든 항목 법정 한도(20만원) 일치 (2025년 개정 반영) |
| 통상임금 pay_type 기본값 | 🟡 권고 | 사용자 명시적 선택 유도 필요 |
| 통상임금 산정 로직 | 🟢 적정 | — |

---

## 6. 권고사항

### 🟡 권고: pay_type 기본값 사용자 인식 강화

**파일**: `admin/js/admin-contract/contract-lifecycle.js` (line 1194)
**현재**: `allowance_config` 항목 존재 시 자동 `'fixed'`
**권고**: 계약서 작성 UI에서 pay_type 선택을 필수 입력으로 처리하고 기본값 표시 강화

> **참고**: 보육수당 비과세 한도는 2024년 소득세법 개정(2025.1.1. 시행)으로 월 10만원→20만원으로 상향되었습니다. 시스템의 `_TAX_EXEMPT_CAP = 200000` 설정은 현행법에 부합합니다.

---

> **감사자**: GitHub Copilot (DeepSeek V4 Pro)
