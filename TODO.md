# TODO — 한글→영문 DB 마이그레이션 잔여 작업

> 2026-06-26 기준. 이미 완료된 항목은 체크됨(✔).
> 각 항목은 "DB 값이 영문인데 코드가 한글을 비교/할당하는" 패턴을 수정하는 작업입니다.

---

## 1. contract-lifecycle.js — 계약 상태 한글 할당/비교 (14곳)

**파일**: `admin/js/admin-contract/contract-lifecycle.js`

| 줄 | 현재 | 변경 대상 |
|---|---|---|
| 750 | `newStatus = '해지'` | `CONTRACT_STATUS.TERMINATED` |
| 752 | `newStatus = '해지예정'` | `CONTRACT_STATUS.TERMINATE_PENDING` |
| 754 | `newStatus = '활성'` | `CONTRACT_STATUS.ACTIVE` |
| 759 | `newStatus = '활성'` | `CONTRACT_STATUS.ACTIVE` |
| 879 | `newStatus === '해지예정'` | `CONTRACT_STATUS.TERMINATE_PENDING` |
| 904 | `newStatus === '해지'` | `CONTRACT_STATUS.TERMINATED` |
| 1202 | `newStatus === '계약예정'` | `CONTRACT_STATUS.PENDING` |
| 1256 | `newStatus === '계약예정'` | `CONTRACT_STATUS.PENDING` |
| 1325 | `value = '활성'` | `CONTRACT_STATUS.ACTIVE` |
| 1629 | `newStatus === '해지'` | `CONTRACT_STATUS.TERMINATED` |
| 1723 | `newStatus === '해지'` | `CONTRACT_STATUS.TERMINATED` |
| 1750 | `newStatus === '해지'` | `CONTRACT_STATUS.TERMINATED` |
| 1766 | `newStatus === '해지예정'` | `CONTRACT_STATUS.TERMINATE_PENDING` |
| 2557, 2560 | `autoStatus = '해지'` | `CONTRACT_STATUS.TERMINATED` |

**주의**: `ct-status` hidden input이 `admin/index.html` L1592에서 `value="활성"`으로 되어 있음 → 함께 수정 필요

---

## 2. client/ — 클라이언트 고용형태 비교/표시

### 2-1. client/js/client-init.js
| 줄 | 현재 | 변경 대상 |
|---|---|---|
| ~91 | `e.employment_category === '일용직'` | `'daily'` (✔ 이미 수정됨) |
| ~93 | `e.status === '재직' \|\| ...` | `EMP_STATUS.ACTIVE` 비교로 단순화 필요 |
| ~374 | `emp.employment_category \|\| '-'` | `contractTypeLabel_c()` 적용 필요 |

### 2-2. client/js/client-chart.js
| 줄 | 현재 | 변경 대상 |
|---|---|---|
| 36~124 | `emp.employment_category` 로 필터/비교/표시 | English 값으로 비교 → `CONTRACT_TYPE_LABEL` 로 표시 |

### 2-3. client/js/client-billing.js
| 줄 | 현재 | 변경 대상 |
|---|---|---|
| 253 | `e.employment_category===cat` (cat=한글) | `cat` 을 영문 상수로 변경 |

### 2-4. client/js/client.js.bak (참고용, 운영파일 아님)
- 다수의 한글 고용형태 비교/표시 → 무시 가능

---

## 3. admin/js/admin-billing/annual-leave.js — workerMethodBadge

| 줄 | 현재 | 변경 대상 |
|---|---|---|
| 1143~1145 | `'알림톡'`, `'이메일'`, `'유선직접안내'` 키 | `DISPATCH_METHOD.*` 상수 (단, `'유선직접안내'`는 별도 상수 필요) |
| 951 | `btnMap` 키도 한글 (`'알림톡'`, `'이메일'`, `'유선직접안내'`) | 상수 기반으로 변경 |

---

## 4. admin/pages/leave-promotion.html — 필터 select 값

| 현재 | 변경 대상 |
|---|---|
| `<option value="알림톡">` | `value="kakao"` |
| `<option value="이메일">` | `value="email"` |

---

## 5. admin/index.html — 계약 상태 hidden input

| 줄 | 현재 | 변경 대상 |
|---|---|---|
| 1592 | `<input id="ct-status" value="활성">` | `value="active"` (contract-lifecycle.js 와 함께 수정) |

---

## 6. client/js/client-payslip.js — empCatBadge 사용처 표시

| 줄 | 현재 | 변경 대상 |
|---|---|---|
| 772 | `${empCat}` raw 표시 | `CONTRACT_TYPE_LABEL[empCat]\|\|empCat` 적용 (✔ 수정됨) |
| 780 | `${empCat}` raw 표시 | `CONTRACT_TYPE_LABEL[empCat]\|\|empCat` 적용 (✔ 수정됨) |

---

## 7. DB 테이블 — 마이그레이션 누락 가능성

아래 테이블은 마이그레이션 확인 필요:

| 테이블 | 컬럼 | 상태 |
|---|---|---|
| `contract_dispatch` | `dispatch_method`, `dispatch_status` | ✔ 마이그레이션 완료 |
| `contract_expiry_notice` | `notice_method`, `notice_status` | ✔ 마이그레이션 완료 |
| `annual_leave_promotions` | `notice_method`, `notice_status` | ❓ 확인 필요 |

---

## 작업 우선순위

1. **contract-lifecycle.js** — 계약 저장/수정 시 잘못된 상태값이 DB에 기록될 수 있음 (심각)
2. **admin/index.html ct-status** — 위 항목과 연동
3. **client/ JS 파일들** — 클라이언트에서 고용형태 필터/통계 깨짐
4. **annual-leave.js / leave-promotion.html** — 연차 사용촉진 발송 이력 필터 깨짐
5. **DB 테이블 추가 마이그레이션** — 필요시 진행

---

## 참고: 이미 완료된 작업 (✔)

- `admin/js/constants.js` — 모든 상수 영문화 + `*_LABEL` 헬퍼
- `admin/js/admin-contract/contract-core.js` — `calcContractStatusDisplay`, 배지, 필터
- `admin/js/admin-contract/contract-dispatch.js` — `methodBadge`, `statusBadge`, `typeBadge`, DB 저장
- `admin/js/admin-billing/company-notice.js` — `_cenGetTargetContracts`, `_cenSaveNotice`
- `admin/js/admin-billing/regular-conversion.js` — `contractTypeLabel()` 표시
- `admin/js/admin-billing/two-year-exceed.js` — `_calc2YrExceedList` 상태/유형 비교
- `admin/js/admin-dashboard/dashboard-core.js` — probation 함수들, `execProb*` 액션
- `admin/pages/contracts.html` — 고용형태/상태 필터 value
- `admin/pages/contract-dispatch.html` — 발송방식/상태 필터 value
- `admin/pages/contract-expiry-notice.html` — 고용형태/발송방식 필터 value
- `client/js/client-payslip.js` — `empCatBadge`, `CONTRACT_TYPE_LABEL`, 한글 비교
- `client/js/client-init.js` — `contractTypeLabel_c`, 고용형태/상태 비교
- `scripts/migrate-dispatch-en.js` — contract_dispatch 테이블
- `scripts/migrate-expiry-notice-en.js` — contract_expiry_notice 테이블
