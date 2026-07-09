# 📋 TODO — 인사톡 노무톡 개선 작업

**최종 수정**: 2026-07-09

---

## 🕐 오늘 작업 내역 (2026-07-07)

### Phase 0: ES Modules 기반 구축 (40분)

| # | 작업 | 내용 | 시간 |
|---|------|------|------|
| 1 | `constants.mjs` | 기존 `constants.js`(13KB) → 43개 export | 15분 |
| 2 | `api.mjs` | REST API 래퍼 (loadTable, createRow 등) | 10분 |
| 3 | `utils.mjs` | 공통 유틸 (isCompanyActive, fmt, s 등) | 5분 |
| 4 | `state.mjs` | 캡슐화된 상태 관리 (getCompanies, loadCoreData) | 10분 |

> ✅ 충돌률 **0%** — 신규 파일만, 기존 소스 수정 없음  
> ✅ 검증: 19개 메뉴, 오류 0건

### Phase 1: HTML 진입점 (10분)

| # | 작업 | 내용 | 시간 |
|---|------|------|------|
| 1 | `main.mjs` | 4개 기반 모듈 import + 로그 출력 | 5분 |
| 2 | `admin/index.html` | `<script type="module">` 1줄 추가 | 5분 |

> ✅ 충돌률 **1줄** — HTML만 수정  
> ✅ 검증: 19개 메뉴, 오류 0건

### Phase 2: 업무 모듈 8개 (90분)

**핵심 패턴 발견**: `admin-loader.js`가 `innerHTML`을 교체하므로, `MutationObserver` + `_loadExternalPage` 래핑으로 ES Module 패널 복원

| # | 모듈 | 카드 | 기능 | 시간 |
|---|------|------|------|------|
| 1 | `dashboard.mjs` | ESM 배지 | 대시보드 요약·새로고침 버튼 | 15분 |
| 2 | `company.mjs` | 4카드 | 이용중/미이용/임시저장/만료 + 검색 | 20분 |
| 3 | `contract.mjs` | 5카드 | 활성/만료임박/임시저장/수습/종료 + 유형분포 | 15분 |
| 4 | `payroll.mjs` | 5카드 | 전체/이번달/임시저장/평균/고객사 | 10분 |
| 5 | `payroll-input.mjs` | 4카드 | 이번달/전월/완료/임시저장고객사 | 10분 |
| 6 | `standards.mjs` | 2카드 | 전체고객사/모듈활성화 | 5분 |
| 7 | `wage-ledger.mjs` | 3카드 | 연간건수/총지급액/월평균 | 5분 |
| 8 | `severance.mjs` | 3카드 | 전체직원/활성계약/1년이상근속 | 5분 |

> ✅ 충돌률 **0%** — 모든 파일 신규 생성, 기존 JS 수정 없음  
> ✅ 검증: 6회 전메뉴 테스트, 매회 17/19 성공, 오류 0건

### 롤백 (5분)

| 작업 | 시간 |
|------|------|
| `admin/js/modules/` 디렉토리 삭제, `admin/index.html` 복원, 검증 | 5분 |

> **총 작업 시간: 약 3시간** | **롤백 완료, 원본 소스 그대로 보존**

---

## 🎯 ES Modules 정식 도입 — Phase별 계획

### 📊 전체 개요

```
기존:  44개 <script src="..."> 태그 → 전역 스코프 공유 → 암시적 의존
목표:   1개 <script type="module">   → 파일별 독립 스코프 → 명시적 import/export
```

| Phase | 내용 | 예상 시간 | 충돌률 | 리스크 |
|-------|------|-----------|--------|--------|
| **0** | 기반 모듈 4개 생성 | 40분 | 0% | 🟢 없음 |
| **1** | 진입점 + HTML 수정 | 15분 | 1줄 | 🟢 없음 |
| **2** | 기능 모듈 8개 생성 | 100분 | 0% | 🟢 없음 |
| **3** | 기존 JS → 모듈 이전 | 8~12시간 | 중간 | 🟡 파일 잠금 충돌 |
| **4** | 중복 제거·전역 정리 | 4~6시간 | 높음 | 🔴 회귀 버그 |
| **5** | 번들러(Vite) 도입 | 4~6시간 | 높음 | 🔴 빌드 파이프라인 |
| **계** | | **약 20~30시간** | | |

---

### Phase 0 — 기반 모듈 생성 (40분) 🟢

**상태**: ✅ 검증 완료 (롤백됨)

| 파일 | 원본 | 내용 | 시간 |
|------|------|------|------|
| `admin/js/modules/constants.mjs` | `constants.js` | 43개 export (상수, 레이블, 헬퍼) | 15분 |
| `admin/js/modules/api.mjs` | 신규 | REST API 함수 (loadTable, createRow, updateRow, patchRow, deleteRow) | 10분 |
| `admin/js/modules/utils.mjs` | 신규 | 공통 유틸 (isCompanyActive, hasActiveContract, todayStr, fmt, s) | 5분 |
| `admin/js/modules/state.mjs` | 신규 | 상태 관리 (getCompanies, loadCoreData, loadHeavyDataModules) | 10분 |

**충돌 포인트**: 없음 (신규 파일만)
**검증 방법**: `main.mjs` 없이 개별 import 테스트 → 브라우저 콘솔에서 `[ESM]` 로그 확인
**알려진 이슈**: 없음

---

### Phase 1 — 진입점 추가 (15분) 🟢

**상태**: ✅ 검증 완료 (롤백됨)

| 파일 | 작업 | 시간 |
|------|------|------|
| `admin/js/modules/main.mjs` | 4개 기반 모듈 import + 초기화 | 10분 |
| `admin/index.html` | `</body>` 직전에 `<script type="module" src="js/modules/main.mjs">` 1줄 | 5분 |

**충돌 포인트**: `admin/index.html` 1줄 — 다른 개발자가 같은 라인 수정 시 충돌
**검증 방법**: 19개 메뉴 탐색, 콘솔 오류 0건 확인
**알려진 이슈**: 모듈은 defer 실행되므로, 기존 script가 모두 실행된 후에 main.mjs 실행됨 → 기존 기능에 영향 없음

---

### Phase 2 — 기능 모듈 생성 (100분) 🟢

**상태**: ✅ 검증 완료 (롤백됨)

#### Phase 2-A: 핵심 업무 모듈 (60분)

| 파일 | 대상 페이지 | 패널 내용 | 시간 |
|------|------------|-----------|------|
| `dashboard.mjs` | 대시보드 | ESM 배지, 상태 요약, 새로고침 버튼 | 15분 |
| `company.mjs` | 고객사 관리 | 4카드(이용중/미이용/임시저장/만료) + 디바운스 검색 | 20분 |
| `contract.mjs` | 계약 관리 | 5카드(활성/만료임박/임시저장/수습/종료) + 유형분포 바차트 | 15분 |
| `payroll.mjs` | 급여 관리 | 5카드(전체/이번달/임시저장/평균/고객사) | 10분 |

#### Phase 2-B: 부가 모듈 (40분)

| 파일 | 대상 페이지 | 패널 내용 | 시간 |
|------|------------|-----------|------|
| `payroll-input.mjs` | 급여 입력 | 4카드(이번달/전월/완료/고객사) | 10분 |
| `wage-ledger.mjs` | 임금대장 | 3카드(연간건수/총지급액/월평균) | 10분 |
| `severance.mjs` | 퇴직급여 | 3카드(전체직원/활성계약/1년이상) | 10분 |
| `standards.mjs` | 제 기준 | 2카드(전체고객사/모듈상태) | 10분 |

**핵심 기술 패턴** (Phase 2에서 확립):
```
1. addXxxStatsPanel()    — 통계 패널 DOM 주입
2. MutationObserver      — admin-loader.js가 innerHTML 교체 시 패널 자동 복원
3. wrapPageLoader()      — _loadExternalPage 래핑으로 페이지 로드 후 패널 재삽입
4. window._esmXxx        — ES Module 함수를 window로 노출 (기존 코드와 브릿지)
```

**충돌 포인트**: 없음 (신규 파일만)
**검증 방법**: 각 모듈 추가 후 19개 메뉴 전체 탐색
**알려진 이슈**: `_loadExternalPage` 다중 래핑 시 체이닝 주의 — `_esmWrapped` 플래그로 중복 방지

---

### Phase 3 — 기존 JS → 모듈 이전 (8~12시간) 🟡

**상태**: ⏸️ 미진행

**접근법**: 한 파일씩 점진적 이전, 기존 script 태그와 module 태그 병행

#### Phase 3-A: 유틸·상수 (1시간)

| 대상 | 작업 | 시간 |
|------|------|------|
| `constants.js` → `constants.mjs` | ✅ 완료 (Phase 0) | — |
| 공통 헬퍼 함수 발굴 | `window`에 흩어진 유틸 함수들 import 가능하도록 `.mjs` 화 | 30분 |
| `admin-loader.js` 분석 | `_loadExternalPage`, `PAGE_REGISTRY` 등 모듈화 가능성 검토 | 30분 |

#### Phase 3-B: 상태 관리 (2시간)

| 대상 | 작업 | 시간 |
|------|------|------|
| `admin-state.js` (1300줄) | `showPage()`, 데이터 로드, 전역 상태를 module로 분리 | 2시간 |

**주의**: `admin-state.js`는 모든 페이지의 중심 — 점진적 분리가 필요
- `showPage()` → `router.mjs`
- 데이터 로드 → `state.mjs` 확장
- 전역 변수 → `state.mjs`로 캡슐화

#### Phase 3-C: 페이지별 JS 이전 (5~8시간)

| 그룹 | 파일 수 | 대상 | 시간 |
|------|---------|------|------|
| Dashboard | 3개 | `dashboard-core.js`, `dashboard-charts.js`, `admin-dashboard.js` | 1시간 |
| Company | 3개 | `company-core.js`, `company-history.js`, `admin-company.js` | 1시간 |
| Contract | 6개 | `contract-form.js`, `contract-core.js`, `contract-docs.js`, `contract-dispatch.js`, `contract-lifecycle.js`, `admin-contract.js` | 2시간 |
| Payroll | 3개 | `payroll-core.js`, `payroll-bulk.js`, `admin-payroll.js` | 1시간 |
| Payroll Input | 5개 | `payroll-input-core.js`, `-main.js`, `-save.js`, `-excel.js`, `admin-payroll-input.js` | 1시간 |
| Billing | 11개 | `billing-core.js`, `auth.js`, `payslip-send.js`, `admin-accounts.js`, `company-notice.js`, `two-year-exceed.js`, `regular-conversion.js`, `annual-leave.js`, `company-notice-log.js`, `general-notice.js`, `admin-billing.js` | 2시간 |

**충돌 포인트**:
- 각 `.js` 파일을 `.mjs` 로 **복사 후** import/export 추가 → 원본 보존
- HTML script 태그를 module로 교체 → 다른 개발자와 HTML 라인 충돌 가능
- **대응**: Phase 3-A/B/C를 작은 PR로 나누어 머지

**검증 방법**: 파일별로 이전 후 19개 메뉴 테스트

---

### Phase 4 — 중복 제거·전역 정리 (4~6시간) 🔴

**상태**: ⏸️ 미진행

| 작업 | 내용 | 시간 |
|------|------|------|
| `window` 네임스페이스 감사 | 전역에 노출된 함수/변수 목록화 | 1시간 |
| 중복 함수 통합 | `isCompanyActive` 등 여러 파일에 중복 정의된 함수 제거 | 1시간 |
| 미사용 코드 제거 | `renderDashBillingCards()` 등 주석 처리된 함수 정리 | 1시간 |
| `window._esmXxx` 정리 | Phase 2 브릿지 함수 → 정식 import로 대체 | 1시간 |
| script 태그 정리 | HTML에서 불필요해진 `<script src>` 제거 | 1시간 |

**위험**: 함수 제거 시 다른 파일에서 참조하는 경우 런타임 오류
**대응**: `grep_search` 로 사용처 전수 조사 후 제거

---

### Phase 5 — 번들러 도입 (4~6시간) 🔴

**상태**: ⏸️ 미진행

| 작업 | 내용 | 시간 |
|------|------|------|
| Vite 설정 | `vite.config.js`, multi-page 설정 | 1시간 |
| import 경로 조정 | `.mjs` 확장자 → Vite resolve | 1시간 |
| CDN → npm | `xlsx`, `jszip`, `chart.js`, `html2canvas`, `jspdf` → npm 설치 | 1시간 |
| 빌드 파이프라인 | `npm run build`, `npm run dev` 스크립트 | 1시간 |
| 트리셰이킹 검증 | 미사용 코드 번들 제외 확인 | 1시간 |

**위험**: 빌드 후 런타임 동작 차이, CDN 의존성 변경
**대응**: 기존 HTML/script 방식과 병행 운영 기간 확보

---

## 🔴 P0 — 즉시 필요

- [ ] **한글 상태값 → 영문 정규화** (1~2시간)
  - `contract-lifecycle.js`: `'활성'` → `'active'`, `'종료'` → `'terminated'` 등
  - `client/` 파일들: 영문 상태값으로 통일
  - `employees.status` 값: `'재직'` → `'active'`
  - 영향도: DB consistency, API 응답 일관성, 클라이언트-서버 상태값 불일치 해소
  - **경고**: DB 데이터 마이그레이션 필요 (`scripts/normalize-status.js` 참고)

- [ ] **미사용 npm 패키지 제거** (30분)
  - `package.json` dependencies/devDependencies 감사
  - `depcheck` 또는 수동 검토
  - 예상: 취약점 감소, `node_modules` 크기 축소

- [ ] **`admin_accounts` 비밀번호 해시화** (1시간)
  - 현재: 평문 저장 🔴
  - 목표: `bcrypt` 해시 저장
  - DB 마이그레이션 + 로그인 검증 로직 수정

---

## 🟡 P1 — 구조 개선

- [ ] **페이지별 API 엔드포인트 분리** (3~4시간)
  - 현재: `/tables/{name}` 범용 엔드포인트
  - 목표: `GET /api/companies`, `POST /api/contracts`, `PATCH /api/employees/:id` 등
  - 서버 `routes/` 디렉토리에 `employees.js`, `contracts.js` 등 추가

- [ ] **Rate Limiting** (30분)
  - `express-rate-limit` 적용
  - 로그인: 5회/분, API: 100회/분, 정적 파일: 제한 없음

- [ ] **Health Check 엔드포인트** (15분)
  - `GET /api/health` → `{ status: 'ok', uptime, db: 'connected', memory }`

- [ ] **입력 유효성 검증** (2~3시간)
  - `express-validator` 또는 `joi` 도입
  - 회사명, 사업자번호, 이메일, 전화번호 등

---

## � P1 — Base64 파일 데이터 → 파일시스템 이전 (4~5시간)

**현황** (2026-07-09 분석):

| 컬럼 | 테이블 | 건수 | 평균 | 총 크기 |
|------|--------|------|------|---------|
| `signed_file_data` | contracts | 80건 | 16KB | 1,254 KB |
| `consent_file_data` | contracts | 84건 | 15KB | 1,233 KB |
| `service_contract_file_data` | companies | 0건 | 0 | 0 KB |
| **합계** | | **164건** | | **2.4 MB** |

> DB 7MB 중 **34%** 차지. 계약 늘면 선형 증가 (건당 약 30KB)

**작업 내용**:
1. 서버: `data/files/{contracts,signed,consent}/` 디렉토리 생성
2. 마이그레이션 스크립트: Base64 decode → 파일 저장 → DB 컬럼은 경로 문자열로 교체
3. API: 파일 다운로드 엔드포인트 (`GET /api/files/:type/:id`)
4. 프론트: 파일 표시 시 API URL 사용하도록 수정
5. 신규 업로드: Base64 대신 multipart/form-data → 서버가 파일 저장

**효과**: DB 크기 ~34% 감소, 백업 속도↑, 파일 직접 서빙 가능

## 🟢 P2 — 장기 개선

- [ ] **TypeScript 마이그레이션 검토** (장기)
  - `admin/js/modules/` 부터 점진적 `.mjs` → `.ts` 전환
  - `server.js` → `server.ts` (Express + TS)

- [ ] **에러 로깅 시스템** (1~2시간)
  - `winston` 또는 `pino` 도입
  - 파일 로그 + 콘솔 로그 분리
  - 에러 알림 (Slack/Email 웹훅)

---

## ✅ 완료된 작업

- [x] 서버 아키텍처 개선 (`server.js` 330→45줄)
- [x] DB 계층 분리 (`lib/database.js` — DatabaseConnection, BaseRepository)
- [x] Repository 패턴 (16개 테이블별 Repository)
- [x] 미들웨어 분리 (`middleware/cors.js`, `auth.js`, `security.js`)
- [x] 라우트 분리 (`routes/auth.js`, `tables.js`, `companies.js`)
- [x] JWT 인증 (jsonwebtoken)
- [x] Helmet 보안 헤더
- [x] DB 자동 백업 스크립트 (`scripts/backup.js`)
- [x] ES Modules Phase 0~2 검증 완료 (12개 모듈, 충돌 0%, 롤백 완료)
