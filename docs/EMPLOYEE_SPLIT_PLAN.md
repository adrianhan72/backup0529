# 근로계약–인사정보 분리 개편 계획 (직원명부 선택 기반 액션 구조)

> 작성일: 2026-08-14 · 기준 커밋: `cb225f2` · 원복 포인트: `rollback-20260814-pre-emp-split`
> 목적: 근로계약 입력창에 내장된 인사정보를 분리하고, **인사관리대장(직원명부)에서 직원 선택 → 상태 기반 액션 노출** 구조로 전환

---

## 1. 목표 구조

### 1-1. 데이터 모델

기본 분리는 이미 되어 있음 (현재 `employees` 25컬럼). 단, **인사관리대장 전용 필드 추가**를 위해 `employees` 컬럼 확장이 필요하다 (1-4 참조):

```
companies ──< employees (25 + 확장 5컬럼, 직원 마스터) ──< contracts ──< payrolls
```

- `contracts.employee_id` 참조 무결성 현황: NULL 0건, 존재하지 않는 직원 참조 0건 (138건 전체 검증 완료)
- 전환의 핵심은 **UI 진입점 재구성 + 추정 기반 동일인 판단 제거 + 인사정보 컬럼 확장**

### 1-2. UI 구조

```
[사이드바] 인사관리대장 (신규 메뉴)
  └── 고객사 선택 → 직원 목록 (재직/퇴직 필터, 검색)
        └── 직원 행 클릭 → 직원 상세 패널
              ├── 인사정보 (조회·편집 — 계약과 독립)
              ├── 계약 이력 (해당 직원의 전체 계약 목록)
              └── [상태 기반 액션 버튼] — 현재 가능한 작업만 노출

[근로계약 현황] (기존 메뉴, 유지)
  └── 고객사별 계약 목록·카드는 그대로 유지 (조회 관점)
      단, 신규계약 작성 시 "직원 선택/등록" 단계가 선행됨
```

### 1-3. 상태 기반 액션 매트릭스 (핵심 규칙)

기존 `viewContract()`의 액션 버튼 표시 로직(`contract-core.js` 2328~2440)을 이관·확장한다:

| 직원의 계약 상태 | 노출 액션 |
|---|---|
| 유효 계약 없음 + 만료·해지 이력 있음 | **재계약** (연속성 규칙: 익영업일 이내면 입사일·사원번호 승계) |
| 유효 계약 없음 + 이력 없음 | **신규계약 작성** |
| 유효(active) 계약 있음 | 조회 / **수정 및 재발행** / **갱신** / 퇴사 설정(정규직) / 해지 설정(계약직·일용직) |
| 계약예정(pending) | 예정계약 수정 / **파기(취소)** |
| 해지예정(terminate_pending) | 해지일 변경 / **해지 철회** |
| 갱신예정(renewal_pending, 또는 active+미래 시작일) | 갱신 취소 / 시작일 수정 |
| 임시저장(draft) | **이어작성** / 삭제 |
| 서류미비(docs_incomplete) | 날인본 업로드 / 계약서 발송 |
| 퇴직(resigned) | 재계약(재입사) — 갭 정책 적용 |

- 매트릭스의 판정은 **`employee_id` 기준 계약 이력 조회**로 단순화됨 (이름+주민번호 추정 불필요)
- 기존 근로계약 목록의 "관리" 버튼(조회/계약서/날인본/삭제)은 유지하되, 생애주기 액션(수정·갱신·해지·재계약)은 직원 패널에서만 진입하도록 통일할지 여부는 [오픈 의사결정 Q2]에서 확정

### 1-4. 확장 인사정보 필드 (신규 스키마)

> **확정 내역 (2026-08-14)**: Q7 전 필드 자유입력 / Q8 변경이력 제외 / Q9 Tier A에서 birth_date 제외, Tier B 전부, Tier C 전부 제외 / Q10 4대보험은 계약별 저장 유지 (오픈 후 재검토)
> **최종 추가 컬럼 (11개, 모두 TEXT 자유입력)**: `resign_date`, `career_history`, `military_status`, `education`, `major`, `certifications`, `language_skills`, `special_notes`, `marital_status`, `emergency_contact`, `emergency_relation` ✅ **전부 ADD 완료 (Phase 0)**

계약에 포함되지 않는 개인정보도 인사관리대장에서 계약과 **독립적으로 등록·변경**한다. 컬럼은 `employees`에 ADD COLUMN (평면 구조 유지):

**Tier A — 법정·핵심 (근로기준법 제41조 근로자명부 기재사항 기준)**

| 컬럼명 (신규) | 타입 | 내용 | 비고 |
|---|---|---|---|
| `resign_date` | TEXT | 퇴사일 | **현재 컬럼 없음** — 해지 흐름 2곳(confirmContractTerminate 2364, confirmFixedTerminate 2911)이 PATCH 실패(400)하는 잠재 버그 동시 해결. 법정 기재사항 |
| ~~`birth_date`~~ | — | 생년월일 | **Q9 확정: 제외** (주민번호에서 유도 가능하므로 별도 컬럼 불필요) |
| `career_history` | TEXT | 경력·이력 | 법정 기재사항 "이력". 줄바꿈 구분 목록 |
| `military_status` | TEXT | 병역 | `served`(군필) / `exempted`(면제) / `unserved`(미필) / `n_a`(해당없음) — 영문 코드 + LABEL |

**Tier B — 실무 권장**

| 컬럼명 (신규) | 타입 | 내용 | 비고 |
|---|---|---|---|
| `education` | TEXT | 최종학력 | **Q7 확정: 자유입력** (원안 select에서 변경) |
| `major` | TEXT | 전공 | 자유 입력 |
| `certifications` | TEXT | 자격증 | **Q7 확정: 자유입력** (줄바꿈 구분 목록) |
| `language_skills` | TEXT | 어학능력 | 자유 입력 (예: 토익 850, JLPT N2) |
| `special_notes` | TEXT | 특이사항 | `employees.note`와 별도 신설 (note는 계약 흐름이 `''`로 초기화하는 값이라 재사용 위험) |
| `marital_status` | TEXT | 결혼 여부 | `single`(미혼) / `married`(기혼) / `other`(기타) — 부양·세금 판단 보조 |
| `emergency_contact` | TEXT | 비상연락처 | 전화번호 |
| `emergency_relation` | TEXT | 비상연락처 관계 | 예: 배우자, 부모 |

**Tier C — 선택 (민감정보·첨부)**

| 항목 | 내용 | 비고 |
|---|---|---|
| 장애 여부 | 미도입 권장 v1 | 개인정보보호법 제23조 민감정보 — 수집 시 별도 동의 필수. 장애인 고용의무 판단용으로 필요한 경우만 |
| 운전면허 | 자격증 목록에 포함 | 별도 컬럼 불필요 |
| 증명사진·통장사본 | `data/uploads` 파일 + 경로 저장 | 첨부파일 룰 준수, v1은 텍스트 필드만 |

- 이미 존재하는 변동성 정보(전화·이메일·주소·은행·계좌·부양가족)는 추가 컬럼 없이 명부에서 편집만 가능해짐
- 4대보험 가입 여부(contracts.insurance_*)는 계약 단위 데이터 — 명부 마스터로 승계할지 [오픈 의사결정 Q10]에서 확정
- 변경 이력 관리 여부는 [오픈 의사결정 Q8]에서 확정

**직원 상세 패널 구성 (3섹션)**
1. 기본 인사정보 — 사원번호·이름·주민번호·성별·생년월일(자동)·병역·고용형태·담당업무·부서·직책·입사일·퇴사일 (계약 연동 영역)
2. 연락처·급여 — 전화·이메일·주소·비상연락처·은행·계좌·부양가족 (언제든 변경 가능)
3. 인적사항 — 학력·전공·경력·자격증·어학능력·결혼여부·특이사항 (계약에 미포함, 명부 전용)

---

## 2. 작업 단계 (Phase)

### Phase 0 — 사전 데이터 정비 + 스키마 확장 (진행 전 필수)

> **진행 현황 (2026-08-14)**: ①② 완료(resign_date 포함 11컬럼 추가, 1차 커밋 2fd0c8e) / ④ 정규화 완료(12건→active) / ⑤ **병합 불필요 판정** / ⑥ 완료(schema.sql 557컬럼 주석 0 누락) / ③ 9명은 고객사 보완 대상으로 별도 보고 예정

1. 서버 정상 종료 → WAL 확인·체크포인트 → DB 3종 백업 (글로벌 룰 순서 엄수) ✅
2. **employees 스키마 확장**: `ALTER TABLE employees ADD COLUMN` (1-4 필드 전체, 모두 TEXT) → `PRAGMA integrity_check` = ok ✅
   - **필수 포함**: `resign_date` — 없으면 해지 시 직원 PATCH가 400으로 실패하는 기존 버그 지속
3. **해지 흐름 직원 PATCH 수정**: `confirmContractTerminate`(2364)·`confirmFixedTerminate`(2911)의 `resign_date` PATCH가 정상 동작하도록 하고, "resign_date 컬럼 없음 — expire_date 사용" 우회 주석(1052) 제거. 해지 시나리오 회귀 테스트 필수 ✅ (커밋 2fd0c8e)
4. `employees.status` 정규화: `'재직'`(한글 레거시) **12건** → `'active'` ✅
5. 주민번호 부재 직원 **9명** 확인 → 고객사에 보완 요청 or "매칭 제외" 명시
6. 동일인 중복 검사: **조사 완료 — 병합 불필요 판정**. 중복 4그룹(co-sev-test-01·comp-welcome-test·comp05)은 전부 테스트 더미 주민번호(900101-·101010-·121212-)를 공유하는 서로 다른 테스트 직원들. 병합 시 한 직원에 활성계약 2개가 생겨 1인1활성 원칙 위반 → 병합 생략, 문서화로 종결
7. `scripts/dump_schema.js` KO 맵에 신규 컬럼 한글 주석 추가 → `schema.sql` 재생성 → `check-missing-comments.js` → 커밋 ✅

### Phase 1 — 인사관리대장 페이지 신설

| 파일 | 내용 |
|---|---|
| `admin/index.html` | 사이드바 메뉴 1줄 (`data-page="employees"`), `page-employees` 컨테이너 |
| `admin/pages/employees.html` (신규) | 고객사 칩 + 직원 목록(검색/필터/상태 배지) + 직원 상세 패널(3섹션) + 신규 직원 등록 모달 |
| `admin/js/admin-hr.js` (신규) | `renderHrCompanyList()` / `renderHrEmployees()` / `openHrEmployeePanel()` / `saveHrEmployee()` / 상태 기반 액션 렌더러 |
| `admin-state.js` | `showPage('employees')` 케이스, `loadEmployees()` 연동 |
| `admin-loader.js` | 페이지 등록 (기존 페이지 로드 방식 준수) |

신규 직원 등록 폼 필드 = 기존 계약 모달의 `ct-em-*` 필드 세트 + 확장 인사정보:
사원번호·이름·고용형태·담당업무·부서·직책·입사일·주민번호·성별(자동)·전화·이메일·주소·부양가족·은행·계좌·대표자 여부
+ 학력·전공·자격증·어학능력·특이사항 (1-4)

### Phase 2 — 계약 모달에서 인사정보 분리

1. 신규계약 진입 시 2경로:
   - **기존 직원 선택**: 고객사 내 `employees` 검색 → 선택 → 인사정보 readonly 카드 표시 + 계약정보만 입력
   - **신규 직원 등록**: 인사관리대장 등록 폼(재사용) → 저장 → 계약 작성으로 자동 진행
2. `ct-new-emp-section`, `ct-edit-emp-info` 섹션을 계약 모달에서 제거 (인사관리대장으로 이관)
3. `openContractModal()` 신규 모드 변경: `preCompanyId` + `preEmployeeId` 지원
4. `saveContract()`(4015)·`saveDraftContract()`(2974)의 직원 생성 로직 재편:
   - 선택된 `employee_id` 재사용 (POST employees 신규 생성 경로는 "명부 등록"에서만 수행)
   - 임시저장: 직원은 명부에 이미 존재 → 계약 데이터만 저장
5. `checkCtDuplicateName`(1504)·`checkCtEmpNoUniqueness`(1916)·`_validateEmpNoUniqueness`(1658)를 **직원 마스터 기준**으로 이동 (명부 등록 폼에서 검증, 계약 모달에서는 선택된 직원만 확인)
> **Phase 2 후속 완료 (2026-08-14)**: 수정·amend 모드에서 개인정보 섹션(ct-edit-emp-info) 전체 잠금(인사관리대장에서만 수정, Q6) + 인사카드 버튼, 신규 직원 입력 섹션(ct-new-emp-section)·데드 함수(checkCtDuplicateName 등)·데드 ID 15건 제거, 계약기간 경고행 복원, TOTAL:0
### Phase 3 — 상태 기반 액션 이관

> **완료 (2026-08-14)**: 인사관리대장 직원 상세 모달에 상태 기반 액션 영역(`hr-view-actions`) 신설 — 유효계약(조회/수정재발행/갱신/퇴사·해지설정/서류미비), 계약예정(수정/파기), 해지예정(해지일변경/철회), 갱신예정(취소), 임시저장(이어작성/삭제), 만료·해지(재계약), 무이력(신규계약 작성·직원 프리셋) — 액션 클릭 시 계약 모달 열고 해당 라이프사이클 함수 실행(120ms 후). 브라우저 검증 완료

1. `viewContract()`(2035)의 버튼 표시 로직(2328~2440) + 상태 배너 로직을 추출 → 직원 패널 액션 렌더러로 포팅 ✅ (`_hrRenderActions`)
2. 액션 함수 자체(`doContractRenew`, `doContractAmend`, `doContractRecontract`, `doContractTerminate`, `doFixedTerminate`, `confirmContractRenew`, `confirmTerminate`, `confirmFixedTerminate`, `deleteDraftContract`, `deleteContract`)는 **재사용** — 대상 계약 ID만 직원 패널에서 결정 ✅ (viewContract 후 실행 패턴)
3. 계약 목록 카드(`_renderContCoSummaryCards`) 진입점도 `employee_id` 기반으로 동일 함수 호출

### Phase 4 — 동일인 판단 단순화

1. `_ctGetPrevContractForContinuity`(1537): 이름+주민번호 앞7자리 매칭 → **선택된 `employee_id`의 계약 이력** 조회로 교체
2. `_ctPastEmpIds`(contract-core.js 6~14): 병합 도구 전용으로 격하 (계약 시점 판단에서 제거)
3. 동일인 검출 UI는 "제안"으로 격하: 신규 직원 등록 시 이름+주민번호 앞7자리로 기존 직원 후보 제시 → "같은 직원으로 연결" 확인 (자동 확정 금지)
4. `loadCtEmployees`(2492, 직원 드롭다운 제거 잔재) 정리

### Phase 5 — 마이그레이션·검증

1. `scripts/_merge_duplicate_employees.js`: 테스트사 4그룹 병합 (contracts.employee_id 재지정 + 백업)
2. `scripts/_normalize_emp_status.js`: `'재직'` → `'active'` (Phase 0에서 이미 수행 시 생략)
3. 무결성 검사 + `check-ui-integrity` TOTAL:0 + 브라우저 시나리오 테스트 (아래 6)
4. 스키마 diff 없음 확인 → 커밋·푸시 (사용자 승인 후)

### Phase 6 — 회귀 테스트 시나리오

1. 명부 신규 등록 → 신규계약 작성 (2경로 모두)
2. 임시저장 → 이어작성 → 등록
3. 수정 및 재발행 (amend, 파기 후 재발행)
4. 갱신 (해지 후 재발행, 연속성 승계)
5. 해지·해지예정·해지철회 / 계약직 조기해지
6. 재계약 (연속 vs 갭 → 입사일·사원번호 재발급)
7. 대표자·등기임원·특수관계인 (계약 없는 직원의 명부 표시·급여입력)
8. 공휴일·근태 시나리오 재검증 (신정규 2026-09 등 기존 케이스)

---

## 3. 패치 지점 사이드 이펙트 체크리스트

> 각 패치 지점 수정 후 아래 항목을 순서대로 확인한다.

### A. 계약 모달 분리 (admin/index.html + contract-core.js + contract-form.js)

- [ ] `ct-em-*` / `ct-edit-em-*` 필드 ID를 참조하는 JS 함수 전체 grep → 남은 참조 제거 (미제거 시 `getElementById` null 크래시)
- [ ] `openContractModal()` 7종 리셋 룰 준수 (직원 선택 상태 리셋 → 선택 직원 복원 순서)
- [ ] 신규 모드에서 `ct-new-emp-section` 표시 로직 제거 후 `_checkRegisterBtnState()`·`toggleEmExpire()`·`toggleCtEndDate()` 등이 참조하던 필드 null 가드 확인
- [ ] 임시저장 최소 입력 검증: "이름 필수" → "직원 선택 필수"로 변경 (이름 필드가 없어짐)
- [ ] 재계약·갱신·수정 모드에서 인사정보 readonly 카드가 `allEmployees`에서 정확한 직원을 찾는지 (재계약은 선택 직원, 수정은 `c.employee_id`)
- [ ] 주민번호 입력 시 성별 자동설정·포맷(`_onIdInput`)이 명부 등록 폼에서도 동작
- [ ] 대표자 본인 체크박스(`ct-em-is-rep`)가 명부 등록 폼으로 이관 후 상시근로자 계산(`_isSmallBiz`) 영향 확인

### B. 상태 기반 액션 이관 (viewContract 로직 추출)

- [ ] 버튼 표시 조건 6종(amend/renew/recontract/terminate/fixed-terminate/draft-edit)이 매트릭스와 일치
- [ ] 해지예정·계약예정·갱신예정 상태 배너의 버튼(수정/취소/해지일 변경)이 직원 패널에서도 동작
- [ ] 액션 후 `loadContracts()+loadEmployees()+renderContracts()+renderDashboard()` 갱신 룰 (모달 변경 후 실시간 갱신)
- [ ] 직원 패널에서 액션 실행 시 `editId.contract`·`_recontractSourceId`·`_recontractEmpId`·`_currentDraftId`·`_resumeDraftId` 플래그 설정·리셋 순서 (reset-after-use 금지)
- [ ] `_empIdToCleanup` 실패 롤백 경로 유지 (계약 저장 실패 시 생성한 직원 DELETE)
- [ ] 계약 목록의 관리 버튼과 직원 패널 액션 중복 노출 여부 통일 (Q2)

### C. 동일인 판단 단순화 (_ctGetPrevContractForContinuity 제거)

- [ ] 연속성 승계(입사일·사원번호)가 "선택된 직원의 이전 만료/해지 계약" 기준으로 동작
- [ ] 익영업일 이내 vs 초과(갭) 분기 유지 — 갭이면 입사일·사원번호 재입력 허용
- [ ] 신규계약·임시저장 양쪽 모두 동일 규칙 (기존 구현이 두 곳에 중복 존재)
- [ ] `_validateEmpNoUniqueness`의 동일인 승계 면제 조건이 employee_id 기준으로 단순화
- [ ] 동명이인·주민번호 부재 직원(9명)이 승계 판정에서 오판하지 않는지

### D. 데이터 정비 (Phase 0/5)

- [ ] `'재직'`→`'active'` 변환 후 `EMP_STATUS_LEGACY_MAP` 의존 코드 회귀 확인 (라벨 표시·필터)
- [ ] 중복 병합 시 `contracts.employee_id` 재지정 + `annual_leave_ledger`/`attendance_ledger`/`wage_ledger` 등 참조 테이블 동시 갱신 (참조 누락 시 이력 유실)
- [ ] 병합·정규화 후 row count 사전/사후 대조 (무손실 검증)

### E. 급여·기타 모듈 연동 (구조 불변 전제 확인)

- [ ] `payroll-input-main.js`(607) 직원 드롭다운: 명부 신규 직원이 즉시 표시되는지 (대표자·계약 없는 직원 포함)
- [ ] `payroll-input-save.js`(768) 채용확정 시 `employees` PATCH(고용형태·입사일)가 명부 표시와 정합
- [ ] 엑셀 일괄 업로드(`payroll-input-excel.js`)의 이름 기반 직원 매칭이 명부 기준으로 유지
- [ ] 근태 관리대장·임금대장·퇴직정산·연차 관리의 `allEmployees` 조인 — 스키마 불변이므로 영향 없음 확인만
- [ ] client 앱(직원 조회·급여명세서·퇴직정산) — 같은 이유로 영향 없음 확인만

### F. PDF·문서·발송

- [ ] 계약서 PDF(`generateContractHTML`·`generateContractHTMLFromData`): 직원 정보가 `allEmployees` live 조인이므로, **개인정보 수정 시 과거 계약서 재출력 내용이 달라질 수 있음** → 정책 확정(Q4) 후 필요 시 처리
- [ ] 계약서 발송·동의서 발송의 수신자 정보(전화·이메일)가 `employees` 기준으로 계속 동작
- [ ] 갱신·수정재발행 후 "PDF 의무발송" 안내 흐름 유지

### G. 공통 룰

- [ ] 한글 직사용 금지: 상태·유형은 영문 코드 + `*_LABEL` (새 페이지 포함)
- [ ] 인라인 스타일 금지 (기존 CSS 클래스 재사용, `.modal` 36px 등)
- [ ] 파일 인코딩 UTF-8 No BOM / LF
- [ ] `check-ui-integrity` TOTAL:0 (데드 ID·미정의 함수 없음)
- [ ] 서버 재시작 후 브라우저 검증 (캐시 버전 `?v=` 갱신)

### H. 확장 인사정보 필드 (스키마·명부 전용)

- [ ] ALTER 후 `lib/database.js` `validateColumns`: 신규 컬럼이 POST/PATCH body 검증을 통과하는지 사전 확인 (PRAGMA 기반이므로 자동 통과 예상)
- [ ] **resign_date 신설 후 해지 흐름 회귀**: 해지예정·해지확정·해지철회 시 직원 status/resign_date PATCH 정상 반영 + `expire_date` 이중용도 제거 확인
- [ ] 계약 흐름이 확장 필드를 **절대 덮어쓰지 않는지**: 계약 모달의 employees POST/PATCH body에 신규 컬럼 키 미포함 확인 (`saveContract` 4084, `saveDraftContract` 3031, 해지·갱신 PATCH 5곳)
- [ ] `loadEmployees()`(admin-state.js 421)가 신규 컬럼을 그대로 반환하는지 (SELECT 계열 확인)
- [ ] `dump_schema.js` KO 맵 한글 주석 추가 → 재생성 → `check-missing-comments.js` 통과
- [ ] birth_date 자동 유도: ~~주민번호 입력 시 생년월일 자동 채움 + 수동 보정 가능~~ → **Q9 확정으로 제외**
- [ ] military_status 등 영문 코드 저장 + `*_LABEL` 표시 → **Q7 확정으로 자유입력 텍스트 저장** (한글 직사용 금지 룰 대상 아님: 사용자 입력 데이터)
- [ ] 명부에서 연락처·계좌 변경 시 계약서 발송·동의서 발송·급여명세서 발송의 수신자 정보가 즉시 최신값을 쓰는지 (발송 전 확인 UI 안내)
- [ ] (Q8 채택 시) 변경 이력 기록 → 과거 계약서와의 불일치 안내·재발행 정책 연동
- [ ] client 앱: 신규 필드는 기본 미노출 (향후 직원 본인정보 화면 추가 시 반영)

---

## 4. 오픈 의사결정 (시작 전 확정 필요)

| # | 결정 사항 | 제안 |
|---|---|---|
| Q1 | 메뉴명·아이콘 | "인사관리대장" (사이드바), `fa-id-card` |
| Q2 | 계약 목록의 생애주기 액션 버튼 유지 여부 | 목록에서는 조회·계약서·날인본·삭제만 남기고, 수정·갱신·해지·재계약은 직원 패널 경유로 통일 |
| Q3 | 계약 없는 직원(대표자·등기임원·특수관계인·급여만 입력)의 명부 표시 | 포함 (명부 = 고객사 소속 전 직원) |
| Q4 | PDF 스냅샷 정책 | 당장은 live 조인 유지. 개인정보 변경 시 "변경 이력" 기록 후 필요 시 스냅샷 도입 |
| Q5 | 동일인 검출 제안 기준 | 이름 + 주민번호 앞7자리 (기존) → 제안 UI로 격하 |
| Q6 | 갱신·재계약 시 개인정보 편집 허용 범위 | 명부에서 별도 편집 (계약 화면에서는 readonly) |
| Q7 | 확장 필드 세트·형식 | ✅ **확정: 전 필드 자유입력** (education 등 select 없이 텍스트 입력) |
| Q8 | 개인정보 변경 이력 관리 | ✅ **확정: 제외** — 단순 편집(updated_at 갱신)만 |
| Q9 | 추가 필드 채택 범위 | ✅ **확정**: Tier A에서 birth_date 제외, 나머지 전부 + Tier B 전부, Tier C 전부 제외 → 총 11컬럼 |
| Q10 | 4대보험 가입여부의 마스터 승계 | ✅ **확정: 계약별 저장 유지** (1차 오픈 후 업그레이드 계획 수립 시 재검토) |

---

## 5. 검증 완료 기준

1. 모든 Phase 완료 + 위 체크리스트 전항목 확인
2. 브라우저 시나리오 8종 통과 (Phase 6)
3. `PRAGMA integrity_check` = ok, row count 무손실, 스키마 diff 없음
4. `check-ui-integrity` TOTAL:0
5. 사용자 승인 후 커밋·푸시
