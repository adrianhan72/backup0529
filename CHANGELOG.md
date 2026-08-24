
---

## 📋 v2.35.3 기능개선 — 근로계약 목록 테이블 재구성 + 발송 워크플로 분리 (초안→최종편집본)

### 개요
근로계약 발송 정책을 **"고객사가 승인한 최종 편집본" 중심**으로 변경한다. 자동 생성 초안은 확인·워드 다운로드·인쇄만 하고, 편집한 최종본을 업로드해 고객사 승인(검수/날인)을 받은 뒤 근로자에게 발송하는 워크플로로 재구성한다. 근로계약 목록 테이블을 **10열**로 개편하고 발송 기능을 전용 모달로 분리한다.

### 1. 계약 목록 테이블 10열 재구성
- **신규**: `사번` 열 추가 (직원명 앞) — `employees.employee_number` (자동부여 구조)
- **삭제**: `통상시급 / 연봉 / 기본급 / 주휴수당 / 약정임금(월)` 금액 5열 + 별도 `서류날인본` 배지 열
- **이동**: `상태` 열을 `계약기간` 다음으로 이동
- 최종 구조: **사번 / 직원명 / 성별 / 고용형태 / 계약기간 / 상태 / 계약정보 / 계약서 / 날인본 / 발송**

### 2. 관리 열 5분리
- **계약정보**: `조회` 버튼 → 기존 계약 정보 모달(`viewContract`)
- **계약서**: `초안(자동생성)` + (`최종편집본` + `재등록`) — 최종편집본 파일이 없으면 `초안` + `편집본 업로드`만 표시
  - 버튼 색상: 초안=오렌지(`btn-warning`) / 편집본 업로드·재등록=그린(`btn-success`, 날인본과 동일) / 최종편집본=레드(`btn-danger`, 언더라인 제거)
  - 최종편집본: 파일서버 업로드본 다운로드 링크 / 재등록: 다시 업로드해 교체
- **날인본**: 서류미비 → `날인본` 업로드(초록, 기존 openDocsUploadModal) / 날인본 파일 있음 → `보기`(인디고 블루, 조회 버튼과 동일 · 이미지/PDF 미리보기 새 창)
- **발송**: `발송` 버튼 — 최종편집본이 있을 때만 활성화 (없으면 회색 비활성 + 안내 툴팁), 활성 시 cyan(`btn-sky`, 이메일 버튼과 동일)

### 3. 발송 모달 (`contract-send-modal`)
- **고객사 발송**: `검수 요청` / `날인 요청` — 둘 다 최종 편집본 파일 주소를 고객사 인앱 알림으로 전송 (noticeType 분리: `contract_review_request` / `contract_seal_request`, 메시지 구분)
  - 검수 요청: "최종 편집본이 등록되었습니다. 검수 후 승인해 주세요."
  - 날인 요청: "근로계약서가 승인되었습니다. 날인 후 회신해 주세요."
- **근로자 발송**: "발송방법을 선택하세요." + `알림톡` / `이메일` / `수동교부` (이메일 미등록 근로자는 이메일 버튼 비활성)
- 근로자 발송은 **TODO API 연동 유지** (발송 이력 저장 + 파일 URL 첨부)

### 4. 초안 모달(print 모달) 단순화
- 툴바를 **`인쇄` + `Word파일 다운로드` 2버튼만**으로 축소
- 기존 알림톡/이메일/수동교부/재편집 업로드/고객사 인앱알림/근로자 발송 버튼·행 제거 → 모두 목록 '발송' 열로 이동

### 5. 저장 안내 문구 — 초안 확인 중심 변경
- 신규 등록: "근로계약서 초안이 등록되었습니다. 초안을 확인하시겠습니까?" (예=초안 모달 / 아니오=나중에 확인)
- 갱신: "근로계약 갱신이 완료되었습니다. 갱신된 계약서 초안을 확인하시겠습니까?"
- 파기+신규(수정재발행): "기존 계약을 파기하고 새로운 계약을 등록했습니다. 새 계약서 초안을 확인하시겠습니까?"
- (기존 "인쇄용 파일 주소를 즉시 발송" 문구 폐기)

### 6. 데이터 모델
- `contracts.edited_file_url TEXT` 추가 (최종 편집본 파일서버 주소) — `scripts/_add_contract_edited_file.js` 마이그레이션
- 업로드 시 `PATCH /tables/contracts/:id`로 기록 → 계약서 열 표시·발송 열 활성화 판단

### 7. 시스템 설정 — 메시지 본문 규칙 등록 (고객사 인앱 알림)
- **근로계약서 검수 요청** (`contract_review_request`) / **근로계약서 날인 요청** (`contract_seal_request`) 규칙 등록
  - `MSG_RULE_DEFAULTS` 기본 템플릿 + `MSG_CHANNEL_TYPES.inapp` 유형 목록 + `representative_contact.msg_body_rules` DB 시드
  - 시스템 설정 > 메시지 본문 규칙 관리 > 발송 수단 '고객사 인앱 알림'에서 편집·저장 가능
- **검수 요청 메시지에 계약 사유 치환자 `{계약사유}` 추가**: 신규계약 / 갱신 / 갱신예정 / 갱신예정 수정 / 재계약
  - `_getContractReason(c)` 판별: 갱신예정(상태 renewal_pending 또는 갱신계약 시작 미도래) → 수정 시 '갱신예정 수정', renewed_from_id 정품 페어 → '갱신', 그 외 → '재계약', 기본 '신규계약'
- 발송 시 `{회사명}` `{근로자명}` `{계약사유}` `{파일주소}` 치환 (ruleVars)
- 시스템 설정 치환자 안내에 `{계약사유}` `{파일주소}` 추가

### 검증
- 테이블 10열 렌더링·사번 표시, 초안 모달 2버튼, 최종편집본 유무별 계약서/발송 버튼 상태, 발송 모달(검수/날인/알림톡/이메일/수동교부) 활성화, 검수 요청 → company_notices 기록, 알림톡 → dispatch 이력+파일URL 기록 확인
- 검수 요청 알림 본문: "안녕하세요, {회사명} 대표자님 … 근로계약서(신규계약) … ■ 계약 사유: 신규계약 ■ 파일주소: …" 치환 확인, 계약 사유 5종 판별 확인
- UI 정합성 TOTAL 0, WAL 0, DB 무결성 OK

---


### 개요
근로계약서를 재편집 가능한 **Word(docx) 파일**로 저장하는 과정에서, 워드 파일에 화면 계약서의 디자인(섹션 배경·인디고 좌측 라인, 셀 음영·테두리, 글자색·굵기)이 전혀 반영되지 않던 문제를 해결한다. 화면에 보이는 계약서 HTML을 서버에서 **클래스 기반으로 재구성**해 화면과 동일한 서식을 Word에 재현한다.

### 원인
- 기존 변환기 `html-to-docx@1.8`은 인라인 CSS의 **폰트/색/배경(shading)을 Word 서식으로 변환하지 못함** (테이블 테두리만 변환 → `w:rPr`이 빈 상태)
- 인라인 스타일로 계산값을 심어도 변환기가 무시하므로 디자인이 사라짐

### 구현
1. **신규 변환 모듈 `lib/contract-docx.js`**: `docx` 라이브러리 + `cheerio`로 계약서 HTML을 파싱해 화면과 동일한 디자인을 Word OOXML로 직접 구성
   - 섹션 제목(`doc-section-title`): 배경 `#F1F5F9` + 좌측 인디고 `#4F46E5` 4px 라인 + 굵은 글씨
   - 정보 테이블(`info-table`): 셀 배경 `#F8FAFC`(th)/`#EFF6FF`(합계 행) + 테두리 `#CBD5E1` + th 32% 폭 + 셀 패딩
   - 글자색: 본문 `#1E293B`, th `#374151`, 강조 `#1D4ED8`, 일용 강조 `#D97706`, 주석 `#64748B`
   - 일용 안내(`doc-daily-note`): 배경 `#FFF7ED` + 테두리 `#FED7AA` + 글자 `#9A3412`
   - 서명 박스(`doc-sign`): 2열 테이블(사업주/근로자) + 서명 정보 테이블 + "(서명 또는 날인)" 스탬프 안내
   - 근무시간표(`work-schedule-table`)·합계(`wsh-total`)도 테이블/문단으로 재현, 페이지 구분 안 깨지도록 행 분리 금지(cantSplit)
   - 루트 컨테이너: `.contract-doc` / `#cpm-doc-area` / `#ct-print-area` 모두 대응 (print 모달·미리보기 동일 처리)
2. **라우트 교체** `routes/pdf.js` `POST /api/contract-docx`: `html-to-docx` → `buildContractDocx`(docx 라이브러리)
3. **클라이언트 단순화** `contract-docs.js`: 불필요한 인라인 스타일 계산(`_inlineContractStyles`) 제거 — 원본 HTML을 그대로 서버로 전송 (요청량 80KB→9KB)
4. **의존성 정리**: `html-to-docx` 제거, `docx`(dev→dependencies, 런타임 사용), `cheerio` 추가

### 검증
- 실제 계약(일용/정규/정규수습/계약수습) → WORD 저장 → docx 내부 XML에서 섹션 배경·셀 음영·테두리·글자색·굵기 모두 확인 (w:shd 45건, 인디고 라인 11건 등)
- UI 정합성 TOTAL 0, WAL 0, DB 무결성 OK

---

### 개요
일용직 근로계약·급여 산정의 법적 준수 기준 9개 항목 중 #1~#8을 구현하고, #9(연차)는 주 15시간 게이트를 적용한다. (docs/USER_MANUAL.md "일용직 법적 준수 기준", docs/CONTRACT_TYPE_AUDIT_20260731.md 2.6)

### 구현 항목
1. **4대보험 (월 8일 기준)**: 일용직 + **월 합산 근로일수** **8일 미만** → 국민연금·건강보험·장기요양 공제 제외, **고용보험은 항상 적용** (`calcPIDeductions`/`calcPIFixed`). 월 합산 = `_piMonthlyWorkTotals()` — 해당 월 근로실적이 있는 **이전 계약(연속성 무관) 포함** 모든 근로일수·시간 합산
2. **일용 원천징수**: `_calcDailyIncomeTax()` — **일당 150,000원 공제 후 6%** (지방소득세 10% 별도), **1,000원 미만 소액부징수** (미부과)
3. **가산수당 일급여 기준**: `_piOtBaseRate()` — 일용직 연장/야간/휴일 가산 기준 = **일급여 ÷ 일소정근로시간** (5인 미만 ×1.0 가산 없음 기존 유지)
4. **비과세 월 20만 누적**: `_piUsedTaxExempt()` — 같은 직원·같은 달(매월 1일부터)의 **다른 확정 급여(이전 계약 포함) 사용분을 제외한 잔여 한도** 적용
5. **해고예고**: `_calcDismissalNoticePay()` — 3개월(90일) 미만 면제 + 30일 이상 예고 면제, **일용직=일급여×30일** (계속근무는 입사일 기준), 해고 사유 선택 시 3개월↑ 자동 체크
6. **회사 귀책(휴업)**: `layoff_leave` 라벨을 "휴업휴직·회사사정"으로 명확화 — 주휴 정상 지급 + 휴업수당 70%(5인↑) 기존 구현 유지
7. **법정 휴일 주휴 보호**: `calcWeeklyHolidayPay` 결근 집합에서 **법정공휴일·근로자의 날(5/1) 제외** (유급 휴일 → 주휴 산정 불리하게 작용 안 함)
8. **사전승인 무급휴가 비례 주휴**: 근태 결근 유형 `approved_unpaid`(사전승인 무급휴가) 추가 → 주휴 계산 시 **결근일 제외한 나머지 소정근로일수에 비례** 지급 (`partialWeekRatio`)
9. **연차 주 15h 게이트 + 근태 연동**: 계약 폼·급여입력 — 주 소정근로시간 **15시간 미만 → 연차 미적용**. 주 15시간 이상 일용직은 **근태 관리대장 연동**으로 판별
   - **1년 미만**: 완료된 달 중 **개근(결근 0일)**한 달마다 1일 (최대 11일) — 중도 입사·진행 중 달 제외
   - **1년 이상**: 지난 1년 **출근율 80% 이상** → 15일(+근속 가산), 미만 → 0일
   - **계약 연속성 무관**: 입사일(없으면 이전 계약 포함 최초 계약 시작일) 기준 + 근태 전체 합산 — 이전 계약·수 영업일 공백 있더라도 계속근로로 보아 1년 합산 출근율 계산
   - 연차 관리 페이지에 일용직(주 15h+) 포함, 회사 선택 시 근태 데이터 로드 (`calcAttendanceRate`/`calcDailyAnnualLeaveDays`)

---

## 📋 v2.35.0 기능개선 — 일용직 임금 지급방법 3분화 (일급/주급/월합산)

### 개요
일용직 근로계약의 임금 지급 조건을 **일급 / 주급 / 월합산** 3가지로 분리한다. 지급방법별 급여 산정기간 자동 산출, 급여입력 주기, 급여명세서 발행 기준, 임금대장 월합산 누적 표시, 대시보드 할일 목록 연동까지 일관되게 연결한다.

### 1. 데이터 모델 (contracts 테이블)
- 신규 컬럼 추가: `pay_method`(daily/weekly/monthly), `pay_condition`(same_day/after_n_days), `pay_after_days`, `pay_weekday`(0=일~6=토), `pay_period_day_override`(월합산 개별 산정기준일)
- 기존 일용직 계약은 `pay_method='monthly'`로 일괄 백필 (기존 월 지급 동작 보존)

### 2. 계약 폼 — 임금 지급 방법 선택 (일용직)
- **일급**: 지급 조건 `당일 지급` / `근무일로부터 n일 후 지급` 선택. 산정기간 "매일 (자동)", 급여일 자동 안내
- **주급**: 매주 지급 요일(일~토) 선택. 산정기간 "매주 [요일 다음날] ~ [지급요일] (자동)", 급여일 "매주 N요일"
- **월합산**: 기존 산정기간(전월/당월 + 산정기준일) + 급여일(매월 n일) 사용, 개별 산정기준일은 `pay_period_day_override`로 저장
- 저장/로드/수정재발행(amend)·검증 모두 지급방법별 조건부 처리

### 3. 급여 입력 연동
- 계약 카드에 `지급방법: 일급(근무일 지급) / 주급(매주 N요일) / 월합산(산정기준일 N일 · 매월 N일 지급)` 표시
- 월합산 일용직은 개별 산정기준일(`pay_period_day_override`)을 급여 산정기간 계산에 우선 사용

### 4. 임금대장 월합산 누적
- 같은 직원의 산정기간 내 발행된 급여명세서가 여러 건이면 **항목별 누적합산**하여 한 행으로 표시 (지급/공제 전 항목 합산)

### 5. 대시보드 할일 목록
- 지급 예정일이 도래한 일용직 근로자의 **급여 처리** 배너 추가 (지급방법별 지급일 기준, 당월 급여 미입력 건만 표시)
- 클릭 시 급여 입력 페이지로 이동

### 6. 계약서 문서 (Word/HTML)
- 일용직 계약서에 **임금 지급 주기**(일급/주급/월합산) 행과 지급방법별 임금 지급일 표기 추가

---

## 📋 v2.34.0 기능개선 — 일용직 급여일 날짜화 + 급여명세서 즉시 발급 + 임금대장 부분 표시

### 개요
일용직 근로계약의 급여일을 `YYYY-MM-DD` 날짜 형식으로 관리하고, 급여 확정 저장 시 급여명세서를 즉시 생성해 고객사 인앱 알림과 근로자 다운로드 경로 안내(SMS)를 자동 발송한다. 또한 기존 "해당 월 유효 계약 전원의 급여 입력 완료"를 요구하던 임금대장 원칙을 변경해 **급여가 입력된 인원만으로 임금대장을 즉시 표시**한다.

### 1. 일용직 급여일 (YYYY-MM-DD)
- 일용직의 급여일 입력을 날짜 선택기(`<input type="date">`)로 제공 (당일/주급/월급 모두 가능)
- 저장 시 `contracts.pay_day`에 `YYYY-MM-DD` 문자열로 저장, 문서(급여명세서·근로계약서)에는 지정 날짜 그대로 표기
- 비일용직(정규직/계약직 등)은 기존 "매월 n일" 방식 유지

### 2. 일용직 급여명세서 즉시 발급
- `routes/wage-ledger-files.js`의 `POST /api/generate-payslip-pdfs`에 `payrollId` 단건 생성 지원 추가
- `savePI` 확정 저장(신규/수정) 시 일용직이면 `_sendDailyPayslipAlerts()` 호출:
  - 급여명세서 HTML 즉시 생성 → `/generated/payslips/{payrollId}.html`
  - 고객사 인앱 알림(`payslip_dispatched`) 발송
  - 근로자에게 다운로드 경로 안내 SMS 발송 (`/api/kakao/send` type=sms) + `payroll_send_logs` 기록
- 근로자 전화번호 미등록 시 SMS는 생략하고 콘솔 경고만 출력

### 3. 임금대장 원칙 변경 (급여 입력된 인원만 표시)
- `renderWageLedger()`: 전원 입력 완료를 요구하던 차단(block) UI 제거 → 확정 저장된 급여만으로 테이블 표시, 미입력/임시저장 직원은 상단 정보 배너로 안내
- `_checkWageLedgerComplete()`: 급여가 1건이라도 입력되면 부분 임금대장 알림/파일을 생성·갱신, 고객사 "발행/갱신" 안내는 전원 완료 시에만 발송
- 시스템 설정 가입 안내 문구 및 `USER_MANUAL.md` 3.8/3.11 섹션도 새 원칙에 맞게 갱신

### 4. 버그 수정
- **`fmtV` 미정의**: 임금대장 테이블 렌더링 시 `ReferenceError: fmtV is not defined` 발생하던 잠재 버그 — `fmtB` 옆에 `fmtV` 정의 추가 (임금대장 열람 정상화)
- **알림 템플릿 치환 실패**: `_sendCompanyNotice`의 `ruleVars` 치환이 중괄호 이중 이스케이프로 인해 `{근로자명}` 등이 치환되지 않던 버그 — 키에서 중괄호를 제거해 `{급여년도}`/`급여년도` 두 형태 모두 치환되도록 수정 (급여명세서 발송·임금대장 발행 알림 모두 정상화)

### 5. 일용직 계약 폼 — 일급여(통상일급+수당 합산) + 고정수당 일(일급) 기준 + 주휴수당 요건
- **일급여 (readonly 자동계산)**: `일급여 = 통상일급(통상시급×8) + 통상임금 포함 수당(일) + 통상임금 제외 고정수당(일)` 합산
  - 통상임금 제외 고정수당이 포함되므로 **"통상일급"과는 다른 개념** — 라벨에서 `(통상일급)` 용어 제거, `일급여`로 표기
  - 하단 힌트: "통상일급(시급×8) + 수당 합산 · 일 8시간 근무 기준"
- **통상임금 포함 수당**: 일용직에서도 일(일급) 기준으로 표시·입력 가능 (직책·현장·기술·면허·위험·벽지) — 기존에는 일용직에서 숨겼으나 모두 허용
- **통상임금 제외 고정수당**: 일용직에서 일(일급) 기준 표시·입력 가능 (식대·차량·연구·통신·체력·자기계발·도서·해외) — 라벨에 `(일급)` 접미사
  - 월 단위 항목(정기상여·보육수당)과 고정 연장/야간/휴일근로수당은 일용직에서 숨김
- **주휴수당 요건**: 계약기간(시작·종료) + 근무시간표(1일 시간·주 근무일수)가 **모두 입력된 경우에만** 계산
  - 미입력 또는 1주 15시간 미만이면 주휴수당 0원 + 안내 힌트 표시
  - 계약기간 일수 반영: `월 주휴시간 × (계약일수/30)` 비례 (예: 12일 계약 → 168,000원)
  - 근무시간표 미입력 시 주휴수당이 기본값(8h×5일)으로 자동 표시되던 문제 해결
- **계약 문서(Word/HTML)**: 일용직 임금 표를 `통상일급(시급×8)` + 수당 내역(일급) → `일급여 합계` 구조로 표기

### 6. 급여입력 주휴수당 — 연속 계약(이전 계약 마지막주 + 현 계약 첫주) 합산 규정
- **규정**: 연속된 일용직 계약에서 이전 계약 마지막주와 현 계약 첫주가 **같은 역주**일 때,
  - 이전 계약 마지막주 근로시간 + 현 계약 첫주 근로시간 **합산 ≥ 15시간**
  - 두 주 근로일수 **모두 개근**
  - → 해당 주를 완전근무 주로 인정하여 주휴수당 지급
- **구현** (`calcWeeklyHolidayPay`): 급여산정기간 내에서 현 계약 시작주(첫주)의 역주를 계산하고, 같은 역주에 종료된 직전 연속 계약을 탐색
  - 이전 계약 마지막주 근로일수·근로시간(계약의 `work_hours_per_day`·`work_days_per_week` 기준) + 현 계약 첫주 근로일수·근로시간 합산
  - 결근(무급 휴가)일이 하나라도 있으면 해당 주 미인정
  - **이전 산정기간 출근 데이터 조회**: `attendance_ledger`(근태 관리대장) 캐시에서 직원의 전 산정기간 결근일을 조회해, 이전 계약 마지막주가 이전 산정기간에 속해도 개근 여부를 확인 후 합산 (교차 산정기간 지원)
  - 현 계약 첫주에 실제 근로일이 있어야 현재 산정기간 주휴로 합산 (현 계약 기여 0일이면 이전 월 귀속)
- **힌트**: `#pi-weekly-hol-consec-hint` — 합산된 **이전 계약 마지막주 근로시간·근로일수·개근 여부**와 현 계약 첫주 근로·합산 결과를 표시
- 검증: 개근 시 연속 계약 주휴 인정(힌트 표시), 전이 주 결근 시 미인정(힌트 숨김), 이전 산정기간 결근 기록도 미인정 처리 확인

---

## 📋 v2.33.0 신규 기능 — 연차휴가 관리대장

### 개요
연차 관리 페이지(`page-annual-leave`) 직원 목록에 **관리** 열을 추가하고, 클릭 시 근로자별 월별 연차 사용 데이터를 입력·저장할 수 있는 **연차휴가 관리대장 모달**을 구현했다.

### UI 변경 사항

#### 연차 관리 테이블 — 관리 열 추가
- 사용촉진 열 왼쪽에 **관리** 열(TH) 삽입
- 각 직원 행에 **[📋 관리]** 버튼(Teal 계열) 추가
- 버튼 클릭 시 해당 직원 + 현재 기준년도로 `openLeaveLedger()` 호출

#### 연차휴가 관리대장 모달 (`#al-ledger-modal`)
- **헤더 정보 그리드** (3열 × 3행):
  - 사업장명, 기준년도, **기준일** (자동 계산)
  - 근로자명, 부서/직책, 입사일
  - 고용형태, 총 발생 연차, 산정기준
- **기준일 자동 설정 로직**:
  - `annual_leave_basis === '회계년도 기준'` → `YYYY-01-01`
  - `annual_leave_basis === '입사일 기준'` → 해당 연도 입사 주년일 (오늘 이후면 전년도 주년일)
- **월별 사용 현황 입력 테이블** (1월 ~ 12월 × 4열):
  - 월 / 사용일자 (자유 텍스트: 예) 3, 15-16) / 사용일수 (숫자, 0.5 단위) / 비고
  - 사용일수 입력 시 실시간으로 합계·잔여 연차 재계산
- **하단 집계 바**: 총 발생 연차 | 사용 연차 | 잔여 연차
- **저장 버튼**: 신규 → POST, 기존 레코드 있으면 PUT 덮어쓰기

### 기술 사항

#### 신규 DB 테이블 — `annual_leave_ledger`
| 필드 | 타입 | 설명 |
|------|------|------|
| `employee_id` | text | 직원 ID |
| `company_id` | text | 고객사 ID |
| `year` | number | 기준 연도 |
| `ref_date` | text | 기준일 (YYYY-MM-DD) |
| `total_days` | number | 총 발생 연차 |
| `month_data` | rich_text | 월별 데이터 JSON 문자열 (`[{month, dates, days, note}×12]`) |
| `total_used` | number | 총 사용 연차 |
| `remain_days` | number | 잔여 연차 |
| `note` | text | 비고 |

#### 신규 JS 함수
| 함수명 | 역할 |
|--------|------|
| `openLeaveLedger(empId, empName, refYear)` | 관리대장 모달 열기 — DB 기존 레코드 조회 후 폼 초기화 |
| `_renderLedgerMonthTable(existData, totalDays)` | 월별 입력 tbody 렌더링 |
| `_recalcLedgerSum(totalDays)` | 사용일수 입력 시 실시간 합계 재계산 |
| `saveLeaveLedger()` | 관리대장 저장 — 신규 POST / 기존 PUT |

#### 신규 CSS 클래스
- `.al-ledger-btn` — Teal 계열 관리 버튼
- `.ledger-header-grid`, `.lhg-cell`, `.lhg-label`, `.lhg-val` — 헤더 정보 그리드
- `.ledger-tbl`, `.ledger-total-row` — 월별 입력 테이블
- `.ledger-summary-bar`, `.ledger-sum-item` — 하단 집계 바

---

## 📋 v2.31.1 신규 기능 — 급여 임시저장

### 배경
급여 입력 중 자리를 비워야 하거나, 추후 검토 후 확정 저장해야 하는 경우
입력 내용이 사라지는 문제를 해결하기 위해 **임시저장 기능**을 추가했다.

### UI 구성

#### 임시저장 버튼 (입력 폼 하단)
- **[임시저장]** 버튼: 기존 초기화 / 급여 저장 버튼 사이에 녹색 버튼으로 추가
- 언제든지 클릭하면 현재 입력된 모든 필드가 즉시 저장됨
- 저장 시 `HH:MM` 형식으로 저장 시각이 토스트 메시지에 표시됨

#### 임시저장 복원 배너 (상단)
- 직원·연월 선택 시 해당 조합의 임시저장 레코드가 있으면 초록색 배너 자동 표시
- `YYYY년 M월분  ·  MM/DD HH:MM 저장` 형식으로 저장 시각 안내
- **[불러오기]** 버튼: 임시저장 값을 폼에 채움 (확정 저장은 별도 필요)
- **[삭제]** 버튼: 임시저장 레코드 DB 삭제 + 배너 숨김

### 기술 사항

#### DB 스키마 변경 (`payrolls` 테이블)
| 필드 | 타입 | 설명 |
|------|------|------|
| `is_draft` | bool | 임시저장 여부 (`true`=임시저장, `false`/null=확정) |
| `draft_saved_at` | text | 임시저장 일시 (ISO 8601) |

#### 신규 JS 함수

| 함수 | 역할 |
|------|------|
| `_buildPIBody()` | 현재 폼 전 필드 → payroll body 객체 생성 헬퍼 (savePI/savePIDraft 공유) |
| `savePIDraft()` | 임시저장 POST/PUT (`is_draft:true`). 동일 직원·연월 임시저장이 있으면 PUT 덮어쓰기 |
| `_checkAndShowPIDraftBanner(empId,yr,mo)` | 임시저장 레코드 감지 후 배너 표시/숨김 제어 |
| `loadPIDraft()` | 임시저장 배너 [불러오기] 핸들러 — 폼 전 필드 복원 |
| `discardPIDraft()` | 임시저장 배너 [삭제] 핸들러 — DB DELETE + 배너 숨김 |

#### 임시저장 상태 변수
```javascript
let piDraftId = null; // 현재 임시저장 레코드 ID
```

#### 트리거 포인트
| 시점 | 동작 |
|------|------|
| 직원 선택 (`loadPIContract` 말미) | `piDraftId = null` 초기화 → `_checkAndShowPIDraftBanner` |
| 연월 변경 (`onPIYearMonthChange` 말미) | `piDraftId = null` 초기화 → `_checkAndShowPIDraftBanner` |
| [임시저장] 버튼 클릭 | `savePIDraft()` → POST/PUT → 배너 갱신 |
| [급여 저장] 클릭 성공 (신규 모드) | `piDraftId` 레코드 DELETE → 배너 숨김 |
| [채용확정 계약 자동 생성 후 저장] 성공 | `piDraftId` 레코드 DELETE |

#### is_draft 제외 필터링 적용 위치
- `renderPayrolls()` — 급여 목록
- `renderLsPieChart()` — 임금대장 파이차트
- `renderLsDistChart()` — 임금대장 분포차트
- 임금대장 월별 추이 차트
- `_checkWageLedgerComplete()` — 임금대장 완성 여부 체크
- 대시보드 고객사 카드 이번달 급여 현황
- 고객사 카드 급여 건수 (`payCnt`)
- 모든 `dup` 중복 체크 로직

---

## 📋 v2.31.0 핵심 기능 — 수습 만료 시 자동 계약 갱신 + 급여 분리 저장

### 배경
수습(정규직 수습·계약직 수습) 기간이 만료된 달에 직원이 계속 근무한 경우,
기존 시스템은 저장을 차단하기만 했다. 이번 버전부터 **자동 처리 흐름**이 완성된다.

### 케이스별 처리 흐름

| 케이스 | 조건 | UI | 처리 결과 |
|--------|------|----|-----------|
| ① 전체 초과 | `monthStart > probEnd` | 빨간 배너 + 자동 생성 버튼 | 채용확정 계약 자동 생성 → 해당 월 급여 정상 저장 |
| ② 월 중간 만료 | `probEnd ∈ [monthStart, monthEnd)` | 황색 배너 + 분리 입력 폼 | 수습 payroll + 채용확정 payroll 2건 POST |
| ③ 정상 | `monthEnd ≤ probEnd` | 배너 없음 | 기존 저장 흐름 유지 |

### 추가·수정된 JS 함수

| 함수 | 위치 | 변경 내용 |
|------|------|-----------|
| `_checkPIProbationOverrun()` | line ~22652 | 케이스① → case1-panel, 케이스② → case2-panel + split-info 렌더링, 반환값 `true`/`'split'`/`false` 분기 |
| `onPIYearMonthChange()` | line ~22715 | 케이스② `'split'` 반환 시 일반 저장 버튼만 잠금, 분리 저장 버튼은 별도 활성화로 위임 |
| `_onProbSplitInputChange()` | **신규** | 수습/확정 근로일수·시간 입력 합계 검증, 분리 저장 버튼 활성/비활성 제어 |
| `savePISplit()` | **신규** | 케이스② — 수습 payroll + 채용확정 payroll 2건 POST + `_autoCreateConfirmedContract()` 호출 |
| `_probAutoCreateAndSave()` | **신규** | 케이스① — 채용확정 계약 자동 생성 후 해당 월 급여 단일 저장 |
| `_autoCreateConfirmedContract(probEndDate)` | **신규** | 수습 계약 → 채용확정 계약 자동 생성 + employees 고용형태 PATCH |
| `savePI()` | line ~23181 | 케이스①/② 분기 메시지로 변경 (케이스별 버튼 사용 안내) |

### `_autoCreateConfirmedContract(probEndDate)` 상세

```
입력: 수습 만료일(YYYY-MM-DD)
처리:
  - piContract 전 필드 복사
  - contract_type : 정규직 수습 → 정규직, 계약직 수습 → 계약직
  - probation_months/pct/amt/basis → 0 초기화
  - contract_start = probEnd + 1일
  - contract_end   = 계약직이면 기존 값 유지, 정규직이면 빈값
  - status = '서류미비' (날인본 미첨부 상태로 생성)
  - amended_from = piContract.id (원본 수습 계약 참조)
  - POST /tables/contracts
  - PATCH /tables/employees/:id { employment_category: 정규직|계약직 }
  - loadContracts() + loadEmployees() 메모리 갱신
출력: 생성된 계약 객체
```

### `savePISplit()` 처리 순서 (케이스②)

```
1. _autoCreateConfirmedContract(probEnd) → 채용확정 계약 생성
2. 수습 기간 payroll body 생성
   - 근로일수/시간: 입력된 pi-prob-wd-prob / pi-prob-wh-prob
   - 임금 비율: wdProb / totalWd (일수 비율 적용)
   - note: "[수습 기간] YYYY년 MM월 DD일 ~ YYYY년 MM월 DD일 (N일 / Nh)"
3. 채용확정 기간 payroll body 생성
   - 근로일수/시간: pi-prob-wd-post / pi-prob-wh-post
   - 임금 비율: wdPost / totalWd
   - note: "[채용확정 기간] YYYY년 MM월 DD일 ~ YYYY년 MM월 DD일 (N일 / Nh)"
4. 기존 동월 급여 중복 시 삭제 확인 후 교체
5. 두 건 POST → allPayrolls 갱신 → UI 반영
```

### 케이스② 분리 입력 UI (`pi-prob-case2-panel`)

| 요소 | 역할 |
|------|------|
| `pi-prob-split-prob-dates` | 수습 기간 날짜 범위 표시 |
| `pi-prob-split-post-dates` | 채용확정 기간 날짜 범위 표시 |
| `pi-prob-wd-prob` | 수습 기간 근로일수 입력 |
| `pi-prob-wh-prob` | 수습 기간 총근로시간 입력 |
| `pi-prob-wd-post` | 채용확정 기간 근로일수 입력 |
| `pi-prob-wh-post` | 채용확정 기간 총근로시간 입력 |
| `pi-prob-split-total-check` | 합계 검증 메시지 (일치/불일치) |
| `pi-prob-split-save-btn` | 분리 저장 버튼 (합계 일치 시 활성화) |

---

## 📋 v2.30.9 도구 추가 — 수습 만료일 초과 급여 진단 & 분리 발행 도구

### 파일 경로
`temp/probation_split_tool.html`

### 목적
기존에 저장된 급여 데이터 중 수습 만료일을 초과한 레코드를 자동 진단하고,
근로일수 비율 기반으로 **수습 기간 명세서 + 채용확정 기간 명세서**를 자동 분리 발행합니다.

### 진단 3케이스

| 케이스 | 판정 조건 | 처리 방법 |
|--------|-----------|-----------|
| ① 전체 초과 | 급여 월 전체가 수습 만료일 이후 | 원본 레코드에 경고 메모 추가 + 채용확정 계약 등록 안내 |
| ② 월 중간 만료 | 수습 만료일이 해당 월 중간에 포함 | 일수 비율 자동 분할 → 수습 명세서 + 채용확정 명세서 신규 생성, 원본 보관 |
| ③ 정상 | 급여 월 전체가 수습 기간 내 | 조치 없음 |

### 분할 계산 로직 (케이스②)
```
수습 일수  = probEnd - monthStart + 1
확정 일수  = totalDays - probDays
수습 비율  = probDays / totalDays
확정 비율  = postDays / totalDays

모든 지급·공제 항목 = 원본금액 × 해당비율 (반올림)
기본급·주휴수당(수습분) = 원본금액 × 수습비율 × 수습비율(probation_pct/100)
근로일수·총근로시간 = 원본값 × 해당비율 (반올림)
```

### DB 처리 규칙
| 대상 | 처리 |
|------|------|
| 케이스① 원본 레코드 | `note` 필드에 `[⚠️수습초과경고]` 메모 추가, 보관 |
| 케이스② 신규 레코드 (수습분) | `POST /payrolls` — 수습 기간 비율 적용 |
| 케이스② 신규 레코드 (확정분) | `POST /payrolls` — 채용확정 기간 비율 적용 |
| 케이스② 원본 레코드 | `note` 필드에 `[분할발행완료]` + 신규 ID 2건 기록, 보관 |

### 화면 구성
- **STEP 1**: 진단 시작 버튼 → DB 전체 스캔 → 케이스별 분류
- **STEP 2**: 케이스별 테이블 + 체크박스 선택 + 상세/미리보기 패널
  - 케이스②: 분할 미리보기 — 수습 명세서 / 채용확정 명세서 금액 나란히 표시
- **STEP 3**: 처리 결과 로그 및 요약

---

## 📋 v2.30.8 기능추가 — 수습 만료일 초과 시 급여 저장 차단 및 명세서 경고

### 배경
정규직 수습·계약직 수습의 수습 기간이 만료된 달(또는 수습 만료일이 월 중간에 포함된 달)에
동일 수습 계약으로 급여를 입력하면 안 됨.  
수습 종료 이후는 **채용확정 근로계약서 갱신 + 별도 명세서** 발행이 필요하며,
이번 버전부터 시스템이 이를 자동 감지하여 경고·저장 차단한다.

### 수습 만료일 계산 규칙
- `probation_months > 0` : `contract_start + probation_months개월 - 1일`
- `probation_months = 0` (또는 미설정) : `contract_end` (계약 전체 기간이 수습)
- `_calcProbationEndDate(ct)` 유틸 함수로 통합 관리

### 급여 월 vs 수습 종료일 3케이스 판정
| 케이스 | 조건 | 결과 |
|--------|------|------|
| ① 전체 초과 | `monthStart > probEnd` | "채용확정 기간" 경고 + 저장 차단 |
| ② 월 중간 | `probEnd ≥ monthStart AND probEnd < monthEnd` | "분할 발행 필요" 경고 + 저장 차단 |
| ③ 정상 | `monthEnd ≤ probEnd` | 경고 없음, 정상 진행 |

### 추가된 로직

#### JS 신규 함수

| 함수 | 역할 |
|------|------|
| `_calcProbationEndDate(ct)` | 계약 객체에서 수습 종료일(YYYY-MM-DD) 계산 |
| `_checkPIProbationOverrun()` | 급여 입력 화면에서 연월·계약 기준 3케이스 판정, 배너 표시/숨김, `true/false` 반환 |

#### 급여 입력 화면 동작
| 시점 | 동작 |
|------|------|
| 연도/월 변경 (`onPIYearMonthChange`) | 수습 만료일 검사 최우선 실행 → 초과 시 입력 잠금 + 경고 배너 표시 |
| 직원 선택 완료 (`loadPIContract` 말미) | 즉시 수습 만료일 검사 실행 |
| 저장 버튼 클릭 (`savePI`) | 최종 이중 차단 — `_checkPIProbationOverrun()` 재확인 후 `return` |

#### HTML 추가
```html
<!-- 급여 입력 화면 — 수습 만료일 초과 경고 배너 -->
<div id="pi-prob-overrun-banner" style="display:none;">
  <i class="fas fa-exclamation-triangle" style="color:#dc2626;"></i>
  ⛔ 수습 만료일 초과 — 이 달에 별도 급여명세서가 필요합니다
  <div id="pi-prob-overrun-detail"></div>
</div>

<!-- 급여 명세서 모달 — 수습 만료일 초과 경고 배너 -->
<div id="ps-prob-overrun-banner" style="display:none;">
  <div id="ps-prob-overrun-detail"></div>
</div>
```

#### 급여 명세서 모달 렌더링
- `_renderProbOverrunBanner()` IIFE — 기존 `_renderProbationBanner` IIFE 직후 실행
- 해당 급여 월이 ①전체초과 또는 ②월중간 케이스이면 경고 배너 표시
- ③정상 케이스 또는 수습 계약이 아니면 배너 숨김

### 3단계 방어 체계 (급여 저장 경로)

```
① 실시간 경고 배너  →  _checkPIProbationOverrun()  (연월 변경·직원 선택 시)
② 저장 버튼 비활성  →  _setPIInputLocked(true)     (수습 초과 감지 시 자동 잠금)
③ savePI() 최종 차단 →  _checkPIProbationOverrun() 재확인 후 return
```

---

## 📋 v2.30.7 기능추가 — 정규직·계약직·일용직 최저임금 위반 실시간 경고 및 저장 차단

### 배경
기존 최저임금 검증은 **수습 계약(정규직 수습·계약직 수습)에만** 실시간 경고가 표시되고
정규직·계약직·일용직은 **저장 시에만** 모달이 뜨는 구조였음.  
이번 버전부터 모든 고용형태에서 **급여 입력 중 즉시 경고 표시 + 저장 버튼 비활성화 + 저장 함수 내 최종 차단** 3단계가 동작함.

### 변경 내용

#### HTML 추가
```html
<!-- 공용 최저임금 위반 경고 행 — 수습 섹션 바로 위, 통상시급 아래 -->
<div id="ct-general-minwage-warning-row" style="display:none;">
  <div id="ct-general-minwage-warning-box">...</div>
</div>
```

#### JS 신규 함수: `_checkMinWageWarning()`
| 항목 | 내용 |
|------|------|
| 대상 고용형태 | 정규직 / 계약직 / 일용직 (수습 2종은 기존 `_checkProbMinWageWarning()` 유지) |
| 기준 | 법정 최저시급 **100%** (감액 예외 없음) |
| 임금 환산 | **일용직**: 일급 ÷ 일소정시간 → 시급 / **정규직·계약직**: (기본급+주휴+전수당) ÷ 209 → 시급 |
| 경고 내용 | 위반 고용형태·연도·법정 최저시급·입력 임금·부족액 + 최저임금법 제6조·제28조 안내 |
| 호출 시점 | `calcContractSalary()` (모든 급여 필드 변경 시 자동), `ct-em-hire` / `ct-start` 날짜 변경 시 |

#### 버튼 비활성화 확장
| 함수 | 추가된 감지 조건 |
|------|----------------|
| `_checkRegisterBtnState()` | `ct-general-minwage-warning-row` 표시 중이면 `disabled=true` |
| `_checkAmendBtnState()` | 동일 |

#### 저장 함수 최종 차단 확장
| 함수 | 추가된 처리 |
|------|------------|
| `saveContract()` | 공용 경고 행 표시 중이면 즉시 `return` |
| `finalAmendContract()` | 공용 경고 행 표시 중이면 모달 표시 + `return` |
| `savePendingContractEdit()` | 공용 경고 행 표시 중이면 모달 표시 + `return` |

### 완성된 3단계 방어 체계 (전 고용형태)

```
① 실시간 경고 표시   →  _checkProbMinWageWarning()  (수습 2종)
                        _checkMinWageWarning()        (정규직·계약직·일용직) ← 이번 추가
② 저장 버튼 비활성화  →  _checkRegisterBtnState()    (신규 등록)
                        _checkAmendBtnState()         (수정 재발행)
③ 저장 함수 최종 차단 →  saveContract()              (신규/재계약)
                        finalAmendContract()          (수정 재발행)
                        savePendingContractEdit()     (예정계약수정)
```

---

## 📋 v2.30.6 버그수정 — 최저임금 위반 방지 로직 전 저장 경로 완전 차단

### 배경
근로계약 저장 경로가 3가지(신규등록·수정재발행·예정계약수정)로 분기되는데,
`saveContract()` 기반 신규/재계약 경로에만 최저임금 검증 `return`이 있었고
나머지 두 경로에는 누락되어 있었음.

### 수정된 gap

| 저장 경로 | 함수 | 기존 상태 | 수정 내용 |
|-----------|------|-----------|-----------|
| 신규 계약 등록 | `saveContract()` | ✅ `return` 차단 존재 | 변경 없음 |
| 재계약 | `openContractPreview()` → `finalSaveContract()` → `saveContract()` | ✅ `saveContract()` 통과 | 변경 없음 |
| **수정 재발행** | `finalAmendContract()` | ❌ 검증 없음 | ✅ 경고 행 감지 → 모달 표시 후 `return` 추가 |
| **예정계약 수정** | `savePendingContractEdit()` | ❌ 검증 없음 | ✅ 경고 행 감지 → 모달 표시 후 `return` 추가 |

### 버튼 비활성화 레이어 (기존 정상)

| 버튼 | 함수 | 최저임금 위반 시 |
|------|------|---------------|
| `ct-btn-register` (신규 등록) | `_checkRegisterBtnState()` | `disabled=true`, `opacity:0.45` |
| `ct-btn-amend-complete` (수정 확정) | `_checkAmendBtnState()` | `disabled=true`, `opacity:0.45` |

### 3단계 방어 체계 완성

```
① 실시간 경고 박스 표시  →  _checkProbMinWageWarning()  (입력 중 즉시 피드백)
② 저장 버튼 비활성화     →  _checkRegisterBtnState()    (신규)
                            _checkAmendBtnState()        (수정 재발행)
③ 저장 함수 내 최종 차단 →  saveContract()              (신규/재계약)  ← 기존
                            finalAmendContract()         (수정 재발행) ← 이번 추가
                            savePendingContractEdit()    (예정계약수정) ← 이번 추가
```

---

## 📋 v2.30.5 기능개선 — 급여명세서 수습 기준 임금 전면 반영

### 변경 사항
| 구분 | 항목 | 변경 내용 |
|------|------|-----------|
| 인적사항 그리드 | 계약연봉 레이블 | 수습 중이면 **'정규 연봉'** 으로 표시 (수습 종료 후 적용 기준임을 명시) |
| 인적사항 그리드 | 월 기본급 | 수습 중이면 **'수습 기본급'** 레이블 + `base_salary × 수습비율` 금액 |
| 인적사항 그리드 | 통상일급 | 수습 중이면 `_probHourly × 일소정근로시간` 으로 계산 |
| 인적사항 그리드 | 통상시급 | 수습 중이면 `_probHourly` (수습 비율 적용된 시급) |
| 지급항목 표 | 기본급 레이블 | 수습 중이면 **'기본급 (수습)'** 으로 표시 |
| 지급항목 표 | 기본급 금액 | payroll 레코드 `p.base_salary` 우선, 없으면 `_probBaseSal` 폴백 |
| 수습 배너 | 수습 기준 임금 | "수습 중 급여" → **"수습 기준 임금"** 레이블 변경, 기본급+시급 함께 표시 |

### 수습 임금 계산 로직 (완성판)
- `_probBaseSal = base_salary × probation_pct / 100` (수습 기본급)
- `_probHourly  = hourly_wage × pct/100` 또는 `_probBaseSal ÷ 209` (수습 통상시급)
- `_probMonthly = monthly_salary_agreed × pct/100` (수습 월 급여)
- **계약연봉(`annual_salary`)은 계산 기준에서 완전 제외** — 표시 전용 (수습 종료 후 적용)

---

## 📋 v2.30.4 UI개선 — 급여명세서 인적사항 그리드 4열 구조 개편

### 변경 내용

#### 인적사항 그리드 (`#payslip-content`)
- **레이아웃**: 6열(`auto 1fr` × 3) → **8열(`auto 1fr` × 4)** 4열 구조로 변경
- **사원번호 삭제**: `ps-empno` 셀 제거
- **입사일 이동**: 사원번호 자리 → 고용형태 바로 옆(2행 두 번째)으로 이동
- **총근로시간 추가**: 근로일수 옆에 `ps-totalhours` 셀 신규 추가 (2행 네 번째)
- **야간근로 추가**: 연장근로 옆에 `ps-night` 셀 신규 추가 (3행 두 번째)
- **휴일근로 추가**: 야간근로 옆에 `ps-hol` 셀 신규 추가 (3행 세 번째)
- 3행 네 번째는 빈 칸으로 여백 유지

#### 그리드 행 구성 (최종)
| 행 | 1열 | 2열 | 3열 | 4열 |
|----|-----|-----|-----|-----|
| 1 | 성명 | (값) | 부서/직책 | ← span 5 → |
| 2 | 고용형태 | (값) | 입사일 | (값) | 근로일수 | (값) | 총근로시간 | (값) |
| 3 | 연장근로 | (값) | 야간근로 | (값) | 휴일근로 | (값) | (빈칸) | |
| 4 | 계약임금 | (값) | ← 최대 4쌍 동적 표시 → | | | |

#### 계약상 임금 정보 (`_renderPsContractWage`)
- **통상일급 추가**: 통상시급 앞에 `통상시급 × 소정근로시간(work_hours_per_day, 기본 8h)`으로 산출하여 표시
- 표시 순서: 계약연봉 → 월 기본급 → 계약일급 → **통상일급** → 통상시급

---

## 📋 v2.30.3 기능추가 — 급여명세서·임금대장에 계약상 임금 정보 표시

### 기능 개요
급여 지급 근거가 되는 계약상 임금 정보(연봉·월기본급·일급·시급)를 급여명세서와 임금대장에 함께 표시합니다.

### 표시 규칙

| 항목 | 표시 조건 | contracts 필드 |
|------|-----------|----------------|
| 계약연봉 | 정규직·정규직 수습·계약직·계약직 수습 + 값 있을 때 | `annual_salary` |
| 월 기본급 | 정규직·정규직 수습·계약직·계약직 수습 + 값 있을 때 | `base_salary` |
| 계약일급 | 모든 고용형태 + 값 있을 때 | `daily_wage` |
| 통상시급 | 모든 고용형태 + 값 있을 때 | `hourly_wage` |

### 계약 조회 로직
- 단순 `status='활성'` 조건 → **급여 지급 월에 유효했던 계약**으로 개선
  - `contract_start ≤ 지급월 말일 AND (contract_end 없음 OR contract_end ≥ 지급월 1일)`
  - `is_draft=false`, `is_voided_by_amend=false`, `status ≠ 취소/파기` 조건 추가
  - 만료된 달 급여도 해당 계약 정보를 정확히 참조 가능

### 급여명세서 (`openPayslipModal`)
- 인적사항 그리드 하단에 계약 임금 셀 최대 4개(`ps-ct-wage-lbl1~4` / `ps-ct-wage-val1~4`) 동적 추가
- 값이 있는 항목만 표시, 없으면 해당 셀 `display:none`

### 임금대장 (`renderWageLedger`)
- 각 직원 카드 헤더에서 고용형태 셀 오른쪽에 계약 임금 셀 동적 삽입
- 파란색 좌측 테두리(`border-left: 2px solid #dbeafe`)로 시각적 구분
- 레이블: 파란색(`#3b82f6`), 금액: 진한 파란색 볼드(`#1d4ed8`)

---

## 📋 v2.30.2 버그픽스 — 메뉴 뱃지 전체 로딩 타이밍 버그 일괄 수정

### 버그: 계약서 발송 관리 뱃지가 로딩 중 114 → 완료 후 99로 변경되는 현상 (+ 동일 구조 버그 일괄 수정)

#### 원인 — 2단계 로딩 구조에서 heavy 데이터 의존 뱃지의 조기 계산
페이지 초기화는 두 단계로 구성됨:
- **1단계(critical path)**: `loadCompanies/Employees/Contracts` → 즉시 화면 렌더 → `updateMenuBadges()` 첫 호출
- **2단계(heavy)**: `loadPayrolls/SendLogs/ContractDispatchList/...` → `_heavyDataReady=true` → `updateMenuBadges()` 재호출

1단계 완료 시점에 `_contractDispatchList=[]`(발송 이력 빈 배열) 상태에서 `updateMenuBadges()`가 호출되면:
- `sentIds = Set([])` → "이미 발송된 계약" 필터가 아무것도 걸러내지 못함 → **전체 계약 건수(114)가 미발송으로 집계**
- 2단계 완료 후 `_contractDispatchList`가 채워지면 정상 값(99)으로 수정됨

동일 구조의 버그가 여러 뱃지에 존재:
| 뱃지 | 의존 heavy 데이터 | 증상 |
|------|------------------|------|
| 계약서 발송 관리 | `_contractDispatchList` | 로딩 중 과다 (발송이력 없는 것처럼 집계) |
| 급여명세서 미발송 | `_allSendLogs` + `allPayrolls` | 로딩 중 과다 |
| 퇴직급여 | `allSeveranceNotices` | 로딩 중 과소 (빈 배열) |
| 계약만료 통지 | `_cenNoticeList` | v2.30.1에서 수정됨 |

#### 수정 (`updateMenuBadges()`)
- `_heavyDataReady` 플래그를 이용해 뱃지 1·2·6번 guard 추가
  - `_heavyDataReady=false`(로딩 중): 해당 뱃지 업데이트 **skip**
  - `_heavyDataReady=true`(로딩 완료): 정상 계산 후 표시
- 뱃지 3번(날인본/동의서 미등록) · 5번(정규직 전환)은 `allContracts`(critical path) 기반이므로 변경 없음

#### 수정 (`_updateDashUnsentContractBanner()`)
- 동일 이유로 `_heavyDataReady=false` 시 함수 조기 return 추가
- 배너 내부에서도 `updateMenuBadges()`를 호출하므로 이중 차단 효과

---

## 📋 v2.30.1 버그픽스 — 계약만료 통지 메뉴 뱃지 과다 표시 수정

### 버그: 페이지 로딩 중 뱃지=2, 로딩 완료 후 뱃지=1로 변경되는 현상

#### 원인
- `init()`의 **1단계(critical path)**에서 `loadCompanies/Employees/Contracts` 완료 직후 `renderDashboard()` 호출
- `renderDashboard()` → `renderDraftAlerts()` → `updateMenuBadges()` 순으로 뱃지가 **첫 번째로 계산됨**
- 이 시점에는 `cenLoadHistory()`가 아직 실행되지 않아 `_cenNoticeList = []` (빈 배열)
- `_cenGetTargetContracts()` 내 "이번 달 이미 통지된 계약 제외" 필터가 작동하지 않아 뱃지 과다 표시
- **2단계(loadHeavyData)** 완료 후 `cenLoadHistory()` + `updateMenuBadges()` 재호출 → 올바른 값으로 수정됨

#### 수정 (`updateMenuBadges()` 내 계약만료 통지 뱃지 항목)
- `_cenHistoryLoaded === false`이면 계약만료 통지 뱃지 업데이트를 **skip**하도록 방어 코드 추가
- `loadHeavyData()` 완료 후 `_cenHistoryLoaded = true` 상태에서 `updateMenuBadges()`가 재호출되므로 정확한 값이 표시됨
- 다른 뱃지(고객사 임시저장, 미발송 계약서, 미발송 급여명세서 등)는 critical path 데이터만으로 정확히 계산 가능하므로 영향 없음

---

## 📋 v2.30.0 업데이트 내역 (급여 입력 UX 개선 — 근로실적 최상단·계약참조 자동산출)

### 1. 급여 입력 섹션 구조 전면 개편 (`admin/index.html`)

#### 근로 실적 섹션 최상단 이동
- 우측 입력 폼: 기존 `지급 내역 → 추가근로수당 → 비정기지급 → 근로 실적` 순서
- 변경 후: **`근로 실적` → `계약 내용` → `비정기 지급`** 순서로 재배치
- 근로일수·연장·야간·휴일·총근로시간·지급일·비고를 가장 먼저 입력

#### 섹션 제목 변경
- `지급 내역 (매월 고정)` → **`계약 내용`** (아이콘도 `file-contract`으로 변경)

#### 근로실적 입력 시 계약 참조 자동 산출 패널 추가
- `calcPIWorkActual()` 신규 함수 도입
- 근로일수 입력 시 **기본급 일할 계산** 자동 표시 (`계약기본급 ÷ 월소정근로일 × 근로일수`)
  - 기본급 필드가 계약 기본급과 동일하거나 0인 경우, 일할 계산값으로 자동 갱신
  - 사용자가 직접 수정한 경우에는 덮어쓰지 않음
- 연장·야간·휴일 시간 입력 시 수당 자동 산출 (`통상시급 × 배율`)
- **자동산출 결과 패널** (`pi-work-auto-panel`): 계약 존재 시 표시
  - 계약 정보 안내 배너: 통상시급, 소정근로일/시간, 월 소정근로일수 표시
  - 기본급 일할 산출값, 연장·야간·휴일 수당 자동 산출값 표시
- 계약 없을 때: 기존 단순 수당 표시 (`pi-ot-pay-disp-simple` 등)

#### 수정 모드(editPayroll) 진입 시 자동산출 패널 동기화
- 기존 payroll 데이터 로드 시 근로실적이 있으면 패널 자동 표시
- 계약 정보 안내 배너도 함께 복원

### 2. 임금대장 Excel 다운로드 (기존 유지, 확인 완료)
- `work_days`, `total_work_hours`, `overtime_hours`, `night_hours`, `holiday_hours` 모두 sumFields에 포함
- 헤더 B행에 `${근로일수}일 / ${총시간}H`, `연장X 야간X 휴일XH` 표시됨

### 3. 엑셀 업로드 유효성 검사 (기존 유지, 확인 완료)
- 카드형: 수당 금액 직접 파싱 → 지급총액/공제합계/영수액 등 수식 검증
- `otHours`, `nightHours`, `holHours` 역산값(hw 기반) validRows에 포함되어 저장

---

## 📋 v2.29.0 업데이트 내역 (UI 개선 — 배너 통일·세트화·중요공지·예약발송)

### 1. 대시보드 배너 UI 통일 (`admin/index.html`)

#### 외곽 보더 1px 통일
- 전체 배너(이전 2px/1.5px) → 1px로 통일
- `.dash-ac-toggle` border:none 추가 (버튼 기본 테두리 제거)

#### 배너 아이콘/박스 크기 통일
- 근로계약서 미발송(40×40/17px) 기준으로 전체 배너 아이콘 통일
- 배너 내부 패딩 `14px 20px`으로 통일

#### 배너 펼침 영역 패딩 통일
- 상하 16px, 좌우 20px — inner wrapper 패턴 적용
- **아코디언 inner wrapper 패턴**: `max-height:0` 상태에서 padding이 공간을 차지하는 문제 방지
- `.dash-ac-body` max-height: `1200px` → `9999px`, transition `0.4s` 확장

#### 배너 위치 및 제목 변경
- 날인본/동의서 배너 → 임시저장 미완료 섹션 바로 위로 이동
- `💰 급여 입력` 카드 제목 → `💰 급여 미입력`으로 변경

### 2. 임시저장 그룹 행 폰트 통일
- 그룹 라벨/뱃지 크기: 헤더 제목(`dash-ac-title`, 14px/800)과 동일하게 통일
- 아이콘/텍스트 블랙 + 14px 적용

### 3. 알림 발송 이력 중요공지 읽음 배지 개선
- `_isRead(v)` 타입 안전 함수 추가: `true / 'true' / 1 / '1'` 모두 처리
- 발송완료 배지 제거 → 읽음/미확인 배지만 표시
- 취소된 공지는 gnStatusBadge 유지

### 4. 고객사 해지 모달 흰색 배경
- 모달 헤더/바디/푸터 모두 `background:#fff` 적용
- 해지된 고객사 카드에서 손실처리금 숨김

### 5. 중요공지 전체선택 버튼 개선
- 기본 상태: 회색 테두리/배경 (`.gn-sel-btn.select`)
- 전체선택 완료 시: 보라색으로 전환 (`.gn-sel-btn.select.active`)
- 미선택 안내 문구: `'선택된 고객사가 없습니다.'`

### 6. 예약 발송 백그라운드 처리
- **60초 폴링 (admin)**: `_gnStartPolling()` — `setInterval(60000)`으로 DB scheduled 재확인
- **고객사 앱 자동 처리 (client)**: `loadClientNotices()`에서 overdue scheduled 공지 자동 PATCH to sent
- 예약 발송 안내 문구: "되면" → "지나면"으로 수정

### 7. 근로 계약 관리 + 임금대장 세트화 (`admin/index.html`)

#### 세트화 패턴 (두 페이지 동일 적용)
- wrapper div: `border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.08)`
- 헤더: 다크 인디고 그라디언트 `linear-gradient(90deg,#1e1b4b,#312e81)`
- 목록 카드: `border-radius:0; box-shadow:none; border-top:none`
- 세로 간격 0으로 헤더+목록이 하나의 세트로 보이도록 처리

#### 변경된 페이지
| 페이지 | ID | 변경 내용 |
|---|---|---|
| 근로 계약 관리 | `page-contracts` | `cont-list-section` 내 헤더+카드 세트화 |
| 임금대장 | `page-wage-ledger` | `wl-main-section` 내 헤더+카드 세트화 |

### 8. 계약만료 통지 테스트 데이터
- `emp04_t8`(김계약, comp04) — `contract_end=2026-06-10` (D+15) 계약서 INSERT
- 배지 검증: `badge-contract-expiry-notice = 1 ✅`

### 변경 파일 요약
| 파일 | 변경 내용 |
|---|---|
| `admin/index.html` | 배너 border 1px 통일, 아코디언 폰트/색상/패딩, 날인본·동의서 배너 위치, 급여 미입력 제목, 배너 아이콘 크기, max-height 9999px, 중요공지 읽음배지·전체선택·예약발송폴링, 해지모달 흰색, 손실처리금 숨김, 근로계약관리·임금대장 세트화 |
| `client/index.html` | `loadClientNotices()`에 overdue scheduled 공지 자동 PATCH 처리 추가 |

---

## 📋 v2.28.0 업데이트 내역 (고객사 앱 신규 페이지 4종 + DB 급여 정규화)

### 1. 고객사 앱 신규 페이지 4종 추가 (`client/index.html`)

| 페이지 ID | 메뉴 | 설명 |
|---|---|---|
| `page-severance` | 퇴직금 관리 | 탭1: 지급발생이력(퇴직·만료 직원), 탭2: 퇴직급여추계(재직 직원 카드형) |
| `page-annual-leave` | 연차 관리 | 요약카드 4개 + 연도 select + 직원별 카드 목록 |
| `page-insurance-rates` | 4대보험 요율표 | 2026년 기준 4대보험 요율 조회 전용 |
| `page-min-wage` | 연도별 최저임금 | 2017~2026년 최저임금 테이블 조회 전용 |

#### 핵심 JS 함수 (9개)
- `switchClientSevTab(tab)` — 퇴직금 탭 전환
- `renderClientSeverance()` — 퇴직금 페이지 진입점
- `_clientCalcTenure(start, end)` — 재직기간 계산
- `_clientGetPrev3(empId, baseDate)` — 직전 3개월 급여 조회 (`pay_year`/`pay_month` 기반)
- `_clientCalcSev(empId, hireDate, baseDate, pays3)` — 퇴직금 계산 (평균임금/통상임금 중 높은 값)
- `renderClientSevHistory()` — 지급발생이력 탭 렌더 (직원 status='퇴직'/'resigned' 기준)
- `renderClientSevStatus()` — 퇴직급여추계 탭 렌더 (직원 status='재직'/'active' 기준)
- `renderClientAnnualLeave()` — 연차 페이지 진입점 (연도 select 초기화)
- `_doRenderClientAL()` — 연차 카드 렌더 (입사일/회계연도 기준 선택 가능)

### 2. DB 급여 데이터 정규화

| 항목 | 내용 |
|---|---|
| 발견 이슈 | 직원 `status='재직'`(한국어) vs `'active'`(영어) 혼용으로 이전 스크립트가 재직 직원을 누락 처리 |
| 급여 필드 | `pay_year` + `pay_month` (`period` 필드 없음) |
| 계약 필드 | `contract_start`/`contract_end`, `status='활성'/'만료'` |
| 신규 생성 | 45건 (comp01~05 재직 직원 직전 3개월 누락분) |
| 불일치 PATCH | 45건 (계약 기준 급여 항목 정정) |
| 최종 급여 총계 | **695건** (누락 0건, 불일치 0건) ✅ |

### 3. `renderClientSevStatus` 필터 수정
- 기존: 계약의 `contract_end >= today` 조건 → 만료계약 재직자 누락
- 수정: 직원 `status='재직'/'active'` 기준으로 단순화

---

## 📋 v2.27.20 업데이트 내역 (고객사 앱 — 인앱 알림함 HTML·JS 완성)

### 변경 파일
- `client/index.html` — 알림함 HTML·JS 추가 완료

### 추가된 HTML
| 위치 | 설명 |
|---|---|
| `.header-right` 내 (`#hamburger-btn` 앞) | `<button class="notif-btn" id="notif-btn">` 벨 아이콘 버튼 + `<span class="notif-badge" id="notif-badge">` 미읽음 뱃지 |
| `</script>` 이후 body 끝 | `<div class="notif-modal-overlay" id="notif-modal-overlay">` 알림함 모달 전체 구조 |
| | `<div class="notif-detail-overlay" id="notif-detail-overlay">` 알림 상세 바텀시트 전체 구조 |

### 추가된 JS 함수 (7개)
| 함수 | 설명 |
|---|---|
| `loadClientNotices()` | `company_notices` 테이블에서 `currentCompany.id` 기준으로 알림 100건 조회, 로컬 캐시 `_clientNotices` 갱신 |
| `renderClientNotices()` | 알림 목록 카드 렌더링 (미읽음 강조, 빈 목록 안내, 전체 읽음 버튼 표시 제어) |
| `openNotifModal()` | 모달 열기 (`.open` 클래스 추가) + `renderClientNotices()` 호출 |
| `closeNotifModal()` | 모달 닫기 |
| `openNotifDetail(id)` | 알림 상세 바텀시트 열기 + 계약 정보·D-day 표시 + 자동 읽음 처리 |
| `markNotifRead(id)` | 단일 알림 PATCH `{is_read:true, read_at:now}` + 로컬 캐시 갱신 |
| `markAllNotifRead()` | 미읽음 알림 전체 PATCH (Promise.all 병렬 처리) + 모달 재렌더 + 토스트 |

### 내부 헬퍼 함수
- `_updateNotifBadge()` — 헤더 벨 뱃지 숫자·표시 업데이트
- `_notifFmtDate(ms)` — "방금 전 / N분 전 / N시간 전 / N일 전 / YYYY.MM.DD" 포매터
- `_notifDday(dateStr)` — 계약 종료일 기준 D-day 계산
- `_notifIcon(type)` — 알림 타입별 아이콘/배경색 맵
- `_escHtml(str)` — XSS 방지 HTML 이스케이프
- `closeNotifDetail()` — 상세 바텀시트 닫기

### 자동 실행 흐름
1. `tryLogin()` → `startApp()` → **`loadClientNotices()` 자동 호출**
2. 미읽음 알림 수 → 헤더 벨 아이콘 뱃지에 표시
3. `logout()` — `_clientNotices` 초기화 + 모달/시트 닫기 + 뱃지 숨김

### 알림 타입별 아이콘/색상
| notice_type | 아이콘 | 배경색 |
|---|---|---|
| `contract_expiry` | `fa-file-contract` | 주황 그라디언트 |
| `contract_renewal` | `fa-sync-alt` | 초록 그라디언트 |
| `payment` | `fa-won-sign` | 파랑 그라디언트 |
| `notice` | `fa-bullhorn` | 보라 그라디언트 |
| 기타 | `fa-bell` | 남색 그라디언트 |

---

## 📋 v2.27.19 업데이트 내역 (계약직 조기 해지 설정 — JS 함수 완성)

### 계약직 해지 설정 기능 완전 구현 ✅

#### 추가된 JS 함수 (5개, `admin/index.html` line ~16423)

| 함수 | 역할 |
|---|---|
| `doFixedTerminate()` | 해지 설정 패널 토글 — 다른 패널 닫기, 계약 정보 표시, 입력 초기화 |
| `_cftValidate()` | 해지일 유효성 검사 — 만료일 이상 불가, 시작일 이전 불가, 상태 힌트 갱신, 확정 버튼 활성화 |
| `_cftSelectReason(el, reason)` | 사유 칩 선택/토글 — 동일 칩 재클릭 시 선택 해제 |
| `_cftClose()` | 패널 닫기 + 전체 입력값 초기화 |
| `confirmFixedTerminate()` | 해지 확정 — contracts PATCH(terminate_date/status/note) + employees PATCH(resign_date/status), 완료 후 모달 닫기 및 데이터 갱신 |

#### 주요 동작 로직

- **해지일이 오늘 이전**: `status='해지'`, 직원 `status='퇴직'` + `resign_date` 설정 (즉시 해지)
- **해지일이 오늘 이후**: `status='해지예정'`, 직원 `resign_date`만 기록 (재직 상태 유지)
- **기존 note 보존**: 새 메모를 `[해지] 사유 — 메모` 형식으로 기존 note에 append
- **사유 칩 토글**: 동일 칩 재클릭 시 선택 해제 (선택 취소 가능)
- **이중 유효성 검사**: 시작일 이전 및 만료일 이상 날짜 모두 차단

---

## 📋 v2.27.18 업데이트 내역 (계약만료 통지 관리 메뉴 신설)

### 계약만료 통지 관리 페이지 (`contract-expiry-notice`) ✅

#### 메뉴 위치
사이드바 **직원 관리** 섹션 마지막 — `계약만료 통지 관리`

#### 핵심 기능
| 기능 | 설명 |
|---|---|
| 통지 대상 자동 집계 | 계약직/계약직수습/일용직 중 만료일이 **29일 이내**인 계약을 자동 탐색 |
| 이번 달 중복 통지 방지 | 이번 달에 이미 발송된 `contract_id`는 대상에서 자동 제외 |
| 개별 발송 | 알림톡(전화번호) · 이메일 · 수동교부 3가지 방식 지원 |
| 일괄 발송 | 체크박스로 다중 선택 후 알림톡 / 이메일 일괄 발송 |
| 발송 이력 탭 | `contract_expiry_notice` 테이블에 발송 건별 이력 저장 및 조회 |
| 요약 통계 카드 | 긴급(D-0~7) / 임박(D-8~14) / 일반(D-15~29) / 이번 달 완료 건수 표시 |
| 필터 | 고객사 · 고용형태 · D-day 범위 · 직원명 검색 |
| D-day 색상 강조 | 7일 이내 → 빨간색, 8~14일 → 주황색, 15일~ → 노란색 |

#### DB 스키마: `contract_expiry_notice`
| 필드 | 타입 | 설명 |
|---|---|---|
| `contract_id` | text | 대상 계약 ID |
| `employee_id/name` | text | 직원 정보 (비정규화) |
| `company_id/name` | text | 고객사 정보 (비정규화) |
| `contract_type` | text | 고용형태 |
| `contract_end` | text | 계약 만료일 |
| `days_until_expiry` | number | 발송 시점 기준 잔여일 |
| `notice_method` | text | 알림톡/이메일/수동배부 |
| `notice_status` | text | 완료/실패/대기 |
| `recipient` | text | 수신처 |
| `noticed_at` | text | 발송 일시 (ISO) |
| `noticed_by` | text | 발송자 |

---

## 📋 v2.27.17 업데이트 내역 (근로계약 관리 — 알림 카드 + 메인 테이블 필터 정리)

### 근로계약 관리 페이지 개편 ✅

#### 알림 카드 5종 신설 (메인 테이블 위에 표시)
| 카드 | 조건 | 색상 |
|---|---|---|
| 📝 임시저장 중인 계약서 | `is_draft=true` | 황금색 |
| 📂 서류 미비 계약서 | `status=서류미비` (날인본·동의서 미첨부) | 주황색 |
| 🔄 갱신 예정 계약 | `status=갱신예정` (시작일 미도래) | 노란색 |
| 📋 계약 예정 | `status=계약예정` | 남색 |
| ⚠️ 해지 예정 (퇴사예정) | `status=해지예정` | 분홍/로즈 |

- 해당 상태가 없으면 카드 자체 숨김 (0건 카드 미노출)
- 카드 헤더 클릭으로 접기/펼치기 가능 (기본 펼침)
- 각 행의 "조회" / "계속 작성" 버튼 → 바로 계약 조회 모달로 이동
- D-day 표시 (7일 이내 / 14일 이내 → 빨간색 강조)
- 서류 미비 카드: 누락 서류 종류(날인본/동의서) 배지로 표시

#### 메인 테이블 계약상태 필터 정리
- **제거**: `서류미비`, `갱신예정`, `계약예정`, `해지예정`, `임시저장` (→ 알림 카드로 이동)
- **유지**: `전체`, `계약유효`, `만료`, `해지`, `파기`
- 필터 "전체" 선택 시: 알림 카드 항목도 메인 테이블에 함께 표시

#### 파기된 계약서 발송 대상 제외 ✅ (v2.27.16)
- `_cdpGetUnsentContracts()`: `status='파기'` 및 `is_voided_by_amend=true` 추가 필터
- `openContractPrintModal()`: 파기 계약 시 알림톡·이메일·수동교부 버튼 모두 비활성화 + 툴팁 표시

---

## 📋 v2.27.15 업데이트 내역 (수정재발행 — 원본 파기 처리 + 동의서 복제 + 파기 워터마크)

### 수정 재발행 확정 시 원본 계약서 파기 처리 ✅

#### `finalAmendContract()` 전면 재작성

| 단계 | 처리 내용 |
|---|---|
| ① 날인본 확인 | `_contractSignedFile` 없으면 업로드 탭으로 이동하며 차단 |
| ② 원본 계약서 파기 | `PATCH /contracts/:origId` → `status='파기'`, `is_voided_by_amend=true`, `voided_at=ISO` |
| ③ 신규 계약서 생성 | `POST /contracts` — 수정된 폼 내용 + 새 날인본 + **기존 동의서 복제** |
| ④ 발송 이력 기록 | `contract_dispatch` 테이블에 `dispatch_method='수정재발행'` 기록, note에 원본 ID 명시 |
| ⑤ 데이터 갱신 | `loadContracts()` + `renderContracts()` + `renderDashboard()` 재실행 |

#### 동의서 자동 복제
- 원본 계약서에 `consent_file_data`가 있으면 신규 계약서에 그대로 복제
- `consent_file_name` 도 동일하게 복제
- 파일 재업로드 없이 자동 처리

#### 재발행 계약서 상태 결정
| 조건 | status |
|---|---|
| 새 날인본 + 기존 동의서(복제) 모두 있음 | `활성` |
| 날인본만 있고 동의서 없음 | `서류미비` |

### 파기 워터마크 표시 ✅

#### `_ctfMakeRow(type, c, label, icon, color, bgColor, isVoidedFile)` 파라미터 추가

`isVoidedFile=true` 일 때:
- 날인본 행 배경색 연한 빨간색 (`ctf-row-voided`)
- 배지: `파기` (빨간 배지)
- 미리보기: **파기 워터마크 오버레이** — `파 기` 텍스트를 붉은색으로 이미지 위에 회전 표시
- 이미지: `filter: brightness(.88) grayscale(.25)` 로 흐리게 처리
- 하단 안내: "이 날인본은 파기된 계약서의 사본입니다. 법적 효력이 없습니다."
- 삭제·업로드 버튼 제거 (원본 보기 + 다운로드만 허용)

#### `_renderContractFilesSection()` 배너 추가
| 조건 | 배너 |
|---|---|
| `is_voided_by_amend=true` | 빨간 파기 배너 + 파기일시 표시 |
| `amended_from` 있음 (재발행본) | 파란 안내 배너 + [원본 조회] 버튼 |

#### 조회 모달 상단 액션 라벨
- 파기된 계약 조회 시: `상태: 파기` + `수정재발행 파기` 빨간 배지 표시

### DB 스키마 확장 (`contracts` 테이블)
| 필드 | 타입 | 설명 |
|---|---|---|
| `amended_from` | text | 재발행 계약서의 원본 계약서 ID |
| `is_voided_by_amend` | bool | 수정재발행으로 파기된 계약 여부 |
| `voided_at` | text | 파기 처리 일시 (ISO 8601) |

---

## 📋 v2.27.14 업데이트 내역 (근로계약서 조회 — 수정 및 재발행 기능)

### 근로계약서 조회 모달에 '수정 및 재발행' 플로우 추가 ✅

#### 진입 조건
- 계약 상태가 **활성(유효) · 해지예정** 인 계약만 버튼 표시
- 임시저장(draft) · 만료 · 해지 · 파기 · 갱신됨 상태에서는 버튼 숨김

#### 전체 플로우

| 단계 | UI 요소 | 설명 |
|---|---|---|
| ① **수정 및 재발행** 클릭 | `ct-btn-amend` (상단 · 하단 액션 바) | 수정 모드 진입 |
| ② 수정 안내 패널 표시 | `ct-amend-panel` | 단계 안내 + 수정완료 버튼 |
| ③ 내용 수정 | 폼 전체 편집 가능(readonly 해제) | 계약 내용 변경 |
| ④ **수정완료 — 재발행 진행** 클릭 | `ct-btn-amend-complete` | 필수 입력 완료 + 최저임금 준수 시 활성 |
| ⑤ 미리보기 모달 | `contract-preview-modal` (재발행 모드) | 수정된 계약서 확인 · WORD/인쇄 |
| ⑥ 날인본 업로드 | 업로드 탭 | 계약서 날인본 **필수** (서류 없이 등록 비활성) |
| ⑦ **수정 확정** | `cp-btn-final` → `finalAmendContract()` | DB 저장 + 발송 이력 기록 |

#### 구현 함수 목록

| 함수 | 역할 |
|---|---|
| `doContractAmend()` | 수정 모드 진입: readonly 해제, amend 패널 표시, 필드 감지 시작 |
| `cancelContractAmend()` | 수정 취소: `viewContract(id)` 재호출로 원상 복귀 |
| `_checkAmendBtnState()` | 수정완료 버튼 활성/비활성 판단 (필수 입력 + 최저임금 준수) |
| `openAmendPreview()` | 계약서 미리보기 모달을 재발행 모드로 열기 |
| `finalAmendContract()` | 수정 확정: 날인본 필수 확인 → saveContract() → 발송이력 기록 |

#### 발송 이력
- `_saveDispatchRecord()` 호출 시 `dispatch_method: '수정재발행'`으로 기록
- `contract_dispatch` 테이블에 저장됨

#### 수정완료 버튼 활성화 조건 (수정 모드)
| 조건 | 세부 |
|---|---|
| 회사 선택 | `ct-company` 값 있음 |
| 계약 시작일 | `ct-start` 값 있음 |
| 기본급 / 일급여 | 고용형태 기준 해당 필드 |
| 연봉 | 정규직/정규직수습 계열만 |
| 최저임금 준수 | 수습 최저임금 경고 없음 |

---

## 📋 v2.27.13 업데이트 내역 (수습 최저임금 경고 전 산정기준 확장 + 신규 계약 등록 버튼 활성화 제어)

### 1. `약정 보수 대비 요율(salary)` basis 최저임금 경고 추가 ✅

`_checkProbMinWageWarning()`의 검증 대상에 `salary` basis를 추가하여,
약정 보수 대비 요율로 계산된 수습 임금이 최저임금을 하회할 때도 동일 경고가 표시됩니다.

- `salary` basis에서 `actualAmt`는 `calcProbationFromPct()`가 `ct-probation-amt`에 미리 계산해 둔 값을 직접 읽음
- `direct` basis와 동일한 비교 로직 적용

### 2. `신규 계약 등록` 버튼 활성화 제어 (`_checkRegisterBtnState()`) ✅

#### 버튼 비활성화 기본 정책
- **모달 열릴 때 항상 비활성(disabled)** 으로 초기화
- 수정/재계약 모드에서는 항상 활성 (별도 저장 버튼 사용)

#### 활성화 조건 (신규 모드 전용)
| 조건 | 세부 |
|---|---|
| 필수 입력 완료 | 회사, 고용형태, 이름, 입사일, 휴대전화 |
| 임금 필수 | 일용직: 일급여 / 그외: 기본급 |
| 연봉 필수 | 정규직/정규직수습: 연봉 추가 필수 |
| 최저임금 준수 | 수습 계약 시 `ct-prob-minwage-warning-row`가 숨겨진 상태 |

#### 연결된 이벤트 핸들러
| 필드 | 이벤트 | 동작 |
|---|---|---|
| `ct-company` | onchange | `_checkRegisterBtnState()` 직접 호출 |
| `ct-em-category` | onchange | `_checkRegisterBtnState()` 직접 호출 |
| `ct-em-name` | oninput | `_checkRegisterBtnState()` 직접 호출 |
| `ct-em-hire` | oninput | `_checkProbMinWageWarning()` → `_checkRegisterBtnState()` 체인 |
| `ct-em-phone` | oninput | `_checkRegisterBtnState()` 직접 호출 |
| `ct-base` | oninput | `_checkRegisterBtnState()` 직접 호출 |
| `ct-daily-wage` | oninput | `_checkRegisterBtnState()` 직접 호출 |
| `ct-annual-sal` | oninput | `_checkRegisterBtnState()` 직접 호출 |
| `ct-probation-pct` | oninput | `calcProbationFromPct()` → `_checkProbMinWageWarning()` → `_checkRegisterBtnState()` 체인 |
| `ct-probation-amt` | oninput | `calcProbationFromAmt()` → `_checkProbMinWageWarning()` → `_checkRegisterBtnState()` 체인 |
| 수습 basis 라디오 | onchange | `onProbationBasisChange()` → `_checkProbMinWageWarning()` → `_checkRegisterBtnState()` 체인 |

---

## 📋 v2.27.12 업데이트 내역 (수습 최저임금 경고 — 직접 입력 모드 및 계약직 수습 확장)

### 수습 임금 최저임금 경고 범위 확장 ✅

#### 전체 경고 발동 조건 (v2.27.13 최종 — 모든 조합)

| 고용형태 | 산정기준 | 경고 조건 | 기준 |
|---|---|---|---|
| 정규직 수습 | 최저임금 대비 요율 | 입력 % × 최저임금 < 최저임금 90% | 최저임금법 제5조제2항 |
| 정규직 수습 | **약정 보수 대비 요율** | **계산 금액 < 최저임금 90%** | 최저임금법 제5조제2항 |
| 정규직 수습 | 직접 입력 | 입력 금액 < 최저임금 90% | 최저임금법 제5조제2항 |
| 계약직 수습 | **약정 보수 대비 요율** | **계산 금액 < 최저임금 100%** | 최저임금법 제5조제2항 단서 |
| 계약직 수습 | 직접 입력 | 입력 금액 < 최저임금 100% | 최저임금법 제5조제2항 단서 |

#### 경고 메시지 상세

**정규직 수습 — 입력 금액 < 최저임금 90% (빨간 경고)**
```
⚠️ 최저임금 법 위반 — 수습 임금(XXX원)이 최저임금의 90% 미만입니다
• 정규직 수습 근로자의 임금은 최저임금의 90% 이상이어야 합니다.
  (YYYY년 최저임금 월환산 XXX원의 90% = XXX원 이상)
• 📖 최저임금법 제5조 제2항: 수습을 시작한 날부터 3개월 이내인 자에 대하여
  최저임금액의 100분의 10을 감한 금액을 최저임금액으로 한다.
• ※ 1년 미만 기간제(계약직 수습)에는 감액 규정 미적용 → 100% 이상 必
```

**계약직 수습 — 입력 금액 < 최저임금 100% (빨간 경고)**
```
⚠️ 최저임금 법 위반 — 수습 임금(XXX원)이 최저임금(100%) 미만입니다
• 계약직(1년 미만 기간제) 수습 근로자의 임금은 최저임금의 100% 이상이어야 합니다.
  (YYYY년 최저임금 월환산 XXX원 이상)
• 📖 최저임금법 제5조 제2항 단서: 1년 미만의 기간을 정하여 근로계약을 체결한
  근로자에 대해서는 감액 규정을 적용하지 아니한다.
```

#### 구현 변경사항

- `_checkProbMinWageWarning()` 재설계:
  - 기존: `정규직 수습 + minwage` 조합만 `ct-probation-pct` % 값으로 판단
  - 변경: `(정규직수습 + minwage/direct)` 또는 `(계약직수습 + direct)` 모두 처리
  - `direct` 모드: `ct-probation-amt` 금액을 최저임금 월환산값과 직접 비교
  - 경고 메시지에 실제 입력 금액, 연도별 최저임금 월환산, 기준 금액 모두 표시
- `calcProbationFromAmt()` 수정: `direct` 모드에서도 `_checkProbMinWageWarning()` 호출

---

## 📋 v2.27.11 업데이트 내역 (정규직 수습 최저임금 준수 안내)

### 수습 조건 — 최저임금 법령 안내 상자 추가 ✅

#### 적용 조건
`고용형태 = 정규직 수습` **AND** `수습 보수 산정기준 = 최저임금 대비 요율` 선택 시,  
`%` 또는 금액 입력 시점에 아래 안내 상자를 실시간으로 표시.

#### 안내 단계별 동작

| 입력 % | 표시 내용 | 스타일 |
|---|---|---|
| **90% 미만** | 법 위반 경고: "최저임금의 90% 이상이어야 합니다" + 최저임금법 제5조제2항 조문 | 🔴 빨간 배경 |
| **90% 이상** | 안내 상자 숨김 | — |

#### 표시 내용 상세

**90% 미만 (법 위반 경고)**
```
⚠️ 최저임금 법 위반 — 수습 임금이 최저임금의 90% 미만입니다
• 정규직 수습 근로자의 임금은 최저임금의 90% 이상이어야 합니다.
• 📖 최저임금법 제5조 제2항: 수습 시작일부터 3개월 이내 수습 근로자에 한해
  최저임금의 10%를 감한 금액(90%)을 최저임금액으로 함.
• ※ 1년 미만 기간제(계약직 수습)는 감액 규정 미적용 → 반드시 100% 이상
```

#### 구현 상세

- **`_checkProbMinWageWarning()`** 신규 함수: `ct-em-category`, `ct-probation-basis`, `ct-probation-pct` 값을 읽어 조건별 안내 상자 표시
- **호출 위치**: `calcProbationFromPct()` 끝, `calcProbationFromAmt()` 끝, `onProbationBasisChange()` 끝, `toggleProbation()` 내부
- **안내 상자 HTML**: `id="ct-prob-minwage-warning-row"` / `id="ct-prob-minwage-warning-box"` (수습조건 영역 내부 `form-group full`)
- **조건 미충족 시 완전 숨김**: 정규직 수습 + 최저임금 대비 요율 외 모든 조합에서는 `display:none`

---

## 📋 v2.27.10 업데이트 내역 (엑셀 업로드 검증 — 요율 기준 4대보험 전 항목 검증 추가)

### 요율 기준 고객사: 4대보험 전 항목 요율 검증 ✅

#### 문제
`validateAndParseExcel()`에서 장기요양보험료만 요율 검증하고, **건강보험·국민연금·고용보험은 보수월액 산정 방식이 다양하다는 이유로 검증하지 않았음.**

그러나 요율 기준 고객사는 급여 입력 UI에서도 4대보험 **전 항목을 요율로 자동계산**하므로, 업로드 파일도 동일하게 검증해야 함.

#### 요율 사전 조회 추가

카드형·테이블형 파서 모두 `validateAndParseExcel()` 내부에서 아래 요율을 사전 조회:

```javascript
const rateLtCare   = getRateForYearMonth('long_term_care',   targetYear, targetMonth);
const ratePension  = getRateForYearMonth('national_pension', targetYear, targetMonth);
const rateHealth   = getRateForYearMonth('health',           targetYear, targetMonth);
const rateEmploy   = getRateForYearMonth('employment',       targetYear, targetMonth);
const capPension   = getCapForYearMonth ('national_pension', targetYear, targetMonth) || 6370000;
```

#### 4대보험 검증 로직 (요율 기준만 실행)

```javascript
if(!isFixedInsurance){
  // ③-A 건강보험   = 보수월액 × 건강보험요율
  // ③-B 장기요양   = 건강보험 × 장기요양요율
  // ③-C 국민연금   = min(보수월액, 상한) × 국민연금요율
  // ③-D 고용보험   = 보수월액 × 고용보험요율
}
```

각 항목 모두 **반올림 / 10원 내림** 두 방식 중 더 가까운 값으로 비교, `±10원` 허용 오차 적용.

#### 보수월액 추정 방식

| 구분 | 보수월액 (std) |
|---|---|
| **카드형** | 카드 공제행 `보수월액` 셀 파싱값 우선 → 없으면 `지급총액 - 비과세항목` 추정 |
| **테이블형** | `지급총액 - 차량 - 식대 - 연차수당 - 기타수당` 추정 (보수월액 열 없음) |

#### 계약서 4대보험 적용 제외 직원 처리

계약서에서 특정 보험을 미적용으로 설정한 경우 해당 항목 검증 제외:

```javascript
const ctApplyPension = ct ? ct.insurance_pension    !== false : true;
const ctApplyHealth  = ct ? ct.insurance_health     !== false : true;
const ctApplyEmpIns  = ct ? ct.insurance_employment !== false : true;
```

#### 검증 항목 요약

| 검증 항목 | 요율 기준 | 확정액 기준 |
|---|---|---|
| ① 지급총액 합산 | ✅ | ✅ |
| ② 소득세·지방소득세 상호 검증 | ✅ | ✅ |
| ③-A 건강보험 (보수월액×요율) | ✅ | ⛔ |
| ③-B 장기요양 (건강보험×요율) | ✅ | ⛔ |
| ③-C 국민연금 (보수월액×요율·상한) | ✅ | ⛔ |
| ③-D 고용보험 (보수월액×요율) | ✅ | ⛔ |
| ④ 공제합계 합산 | ✅ | ✅ |
| ⑤ 영수액 (지급총액−공제합계) | ✅ | ✅ |

#### 업로드 모달 안내 문구 동적 갱신

파일 분석 후 `insurance_basis`에 따라 문구 자동 변경:
- **요율 기준**: ①②③-A·B·C·D④⑤ 전 항목 + 보수월액 추정 방식·미적용 직원 안내
- **확정액 기준**: ①②④⑤ + "4대보험 요율 검증 제외" 안내

---

## 📋 v2.27.9 업데이트 내역 (엑셀 업로드 검증 — 4대보험 기준별 분기)

### 확정액 기준 고객사 — 장기요양보험료 요율 검증 제외 ✅

#### 문제
엑셀 임금대장 업로드 시 `validateAndParseExcel()`이 **고객사의 4대보험 적용 기준(`insurance_basis`)을 참조하지 않고** 모든 고객사에 동일한 검증 로직을 적용하고 있었음.

- **요율 기준**: 장기요양보험료 = 건강보험료 × 장기요양요율 → 자동계산이므로 요율 검증이 적합
- **확정액 기준**: 보험료를 직접 입력하므로 요율과 다를 수 있음 → 요율 검증 시 **오탐 발생**

#### 수정 내용

**카드형·테이블형 파서 공통** — `co.insurance_basis` 를 읽어 `isFixedInsurance` 플래그 설정:

```javascript
const coInsuranceBasis = co?.insurance_basis || '요율 기준';
const isFixedInsurance = coInsuranceBasis === '확정액 기준';
```

**③ 장기요양 요율 검증 조건** 에 `!isFixedInsurance` 추가:

```javascript
// 변경 전
if(rateLtCare > 0 && health > 0){ ... }

// 변경 후
if(!isFixedInsurance && rateLtCare > 0 && health > 0){ ... }
// ※ 확정액 기준 고객사는 보험료를 직접 입력하므로 요율 검증 제외
```

#### 검증 항목 비교

| 검증 항목 | 요율 기준 | 확정액 기준 |
|---|---|---|
| ① 지급총액 합산 | ✅ 수행 | ✅ 수행 |
| ② 소득세·지방소득세 상호 검증 | ✅ 수행 | ✅ 수행 |
| **③ 장기요양 = 건강보험 × 요율** | **✅ 수행** | **⛔ 제외** |
| ④ 공제합계 합산 | ✅ 수행 | ✅ 수행 |
| ⑤ 영수액 (지급총액−공제합계) | ✅ 수행 | ✅ 수행 |

#### 업로드 모달 안내 문구 동적 갱신

`id="upload-calc-desc"` 추가, 파싱 시 `insurance_basis`에 따라 문구 자동 변경:
- **요율 기준**: ①②③④⑤ 전 항목 안내
- **확정액 기준**: ③ 제외 + "확정액 기준 고객사: 장기요양보험료는 직접 입력값을 사용하므로 요율 검증에서 제외됩니다." 안내 추가

---

## 📋 v2.27.8 업데이트 내역 (id·DB 필드명 변경: pi-overseas → pi-etc-allowance, overseas_work_pay → etc_allowance)

### 1. 급여 입력 UI — id 변경 ✅

| 구분 | 변경 전 | 변경 후 |
|---|---|---|
| Input id | `id="pi-overseas"` | `id="pi-etc-allowance"` |
| Label | `국외근로소득` | `기타수당` |

**변경된 참조 위치**:
- `<input>` HTML 요소 id 속성
- gross 계산 3곳 (`gv('pi-overseas')` → `gv('pi-etc-allowance')`)
- 임시 초기화 (`setAmountVal('pi-overseas', 0)` → `setAmountVal('pi-etc-allowance', 0)`)
- 초기화 배열 (`'pi-overseas'` → `'pi-etc-allowance'`)
- 데이터 로드 시 (`setAmountVal('pi-overseas', ...)` → `setAmountVal('pi-etc-allowance', ...)`)
- 저장 body (`overseas_work_pay: gv('pi-overseas')` → `etc_allowance: gv('pi-etc-allowance')`)

### 2. DB 필드명 변경 ✅

| 구분 | 변경 전 | 변경 후 |
|---|---|---|
| `payrolls` 테이블 필드 | `overseas_work_pay` | `etc_allowance` |
| 의미 | 국외근로소득 | 기타수당 (범용) |

**변경된 참조 위치** (JS 코드 전체):
- `sumFields` 배열 두 곳 (임금대장 렌더링 + 엑셀 빌더용)
- 임금대장 화면 카드 개인/합계 렌더링
- `buildCard` 엑셀 빌더 기타수당 슬롯
- `CARD_PAY_MAP` 파서 매핑 (`'기타수당'/'기타지급'/'국외근로소득'` 모두 → `etc_allowance`)
- 파서 `otherPay` 합산
- 급여명세서 `makePayRow`
- 급여통계 차트 `label:'기타수당'`
- `irreg` 비정기 지급 합산

### 3. DB 스키마 업데이트 (`payrolls` 테이블) ✅

- `overseas_work_pay` 필드 → `etc_allowance` 로 변경 (description 포함)
- `other_pay` 필드 신규 추가 (엑셀 업로드 테이블형 합산 저장용)

### 4. 하위 호환성 유지 ✅

- `CARD_PAY_MAP`에 `'기타지급'`, `'국외근로소득'` → `etc_allowance` 매핑 유지
  → 기존 엑셀 파일에 구 레이블이 있어도 정상 파싱됨

---

## 📋 v2.27.7 업데이트 내역 (임금대장 선행 조건 검증 + 차단 UI)

### 임금대장 열람 선행 조건 3단계 검증

**기능**: 임금대장 페이지에서 해당 월 임금대장을 표시하기 전에 3가지 선행 조건을 검사하여, 미완료 항목이 하나라도 있으면 임금대장 대신 **사유별 안내 카드**를 표시하고 남은 업무로 바로 이동할 수 있는 링크를 제공합니다.

#### 검증 조건

| 조건 | 판단 기준 | 링크 대상 |
|---|---|---|
| ① **임시저장 계약** | `is_draft = true` 인 계약 존재 | 계약서 편집 모달 바로 열기 |
| ② **서류미비 계약** | `is_draft = false` + `status=활성\|유효\|active` 이면서 `signed_file_data` 또는 `consent_file_data` 누락 | 계약 조회 모달(날인본 업로드 탭) |
| ③ **급여 미입력** | 서류완비된 유효 계약 직원 중 해당 연월 급여 미입력자 존재 | 급여 입력 페이지 (해당 고객사+연월 자동 선택) |

#### 구현 상세

**`renderWageLedger()`** — `pays` 필터링 직후, 임금대장 카드 렌더링 이전에 삽입:

```javascript
// ① 임시저장
const draftContracts = coContracts.filter(c => c.is_draft);

// ② 서류미비
const docsIncomplete = coContracts.filter(c =>
  !c.is_draft && (c.status==='활성'||...) &&
  (!c.signed_file_data || !c.consent_file_data)
);

// ③ 급여 미입력 (유효 계약 직원 vs 실제 급여 입력된 직원)
const missingPay = validEmpIds.filter(eid => !payInputEmpIds.has(eid));
```

**`_wlGoToPayInput(empId)`** — 급여 입력 → 버튼 핸들러:
- 현재 임금대장에서 선택된 연월을 `pi-year`, `pi-month`에 자동 설정
- `selectPICompany()`로 해당 고객사 자동 선택

#### UI 구성

- **안내 헤더**: 노란 경고 배너 — "임금대장을 표시할 수 없습니다"
- **임시저장 카드**: 주황 배지, 직원명·작성일 표시, "계속 작성 →" 버튼
- **서류미비 카드**: 빨간 배지, 미등록 서류 목록 표시, "서류 등록 →" 버튼
- **급여미입력 카드**: 파란 배지, 미입력 직원 목록, "급여 입력 →" 버튼

---

## 📋 v2.27.6 업데이트 내역 (카드형 `other_pay` 누락 오탐 수정 + 소득세 역산 검증 추가)

### 1. 박다수당 지급총액 +850,000 오탐 수정 ✅

**원인**: 테이블형 업로드나 급여 UI 직접 저장 시 `other_pay`(기타지급) 필드에 여러 지급항목 합산이 저장되는데,
카드형 임금대장 다운로드 시 `other_pay` 값이 카드 지급내역에 출력되지 않아 파서 `calcGross`에서 누락됨.

**증상**: DB의 `gross_pay`(헤더B 파싱)는 `other_pay` 포함 정확한 값인데, `calcGross`(개별 항목 합산)에서
`other_pay` 항목이 없어서 `row._gross > calcGross` → 지급총액 오탐 발생.

**수정 내용**:
1. **`buildCard` 지급내역 마지막 슬롯 변경**: `국외근로소득` → `기타수당` (= `etc_allowance + other_pay` 합산 표시)
2. **`CARD_PAY_MAP`에 `'기타수당': 'etc_allowance'` 추가**: 업로드 파싱 시 `기타수당` 셀 → `etc_allowance` 필드로 저장
3. **파서 `otherPay` 합산에 `row.etc_allowance`, `row.other_pay` 추가**: `calcGross` 계산 시 기타수당/기타지급 반영
4. **두 개의 `sumFields` 배열 모두에 `'etc_allowance'`, `'other_pay'` 추가**: 임금대장 렌더링용 + 엑셀 빌더용

```javascript
// buildCard payData[4] 마지막 슬롯 변경
{lbl:'기타수당', val: nv(p.etc_allowance) + nv(p.other_pay)}  // 두 필드 합산

// CARD_PAY_MAP 추가
'기타수당':     'etc_allowance',
'기타지급':     'etc_allowance', // 구 레이블 하위 호환
'국외근로소득': 'etc_allowance', // 구 레이블 하위 호환

// 파서 otherPay에 etc_allowance, other_pay 추가
const otherPay = (row.bonus_pay??0) + ... + (row.etc_allowance??0)
               + (row.other_pay??0);  // ← 추가
```

### 2. 김정규 소득세 역산 검증 추가 ✅

**원인**: 소득세를 오입력(예: 432,803 → 342,803, -90,000원)하면:
- ② 지방소득세 검증: `소득세(342,803) × 10% = 34,280` vs `주민세(43,280)` → **9,000원 차이로 오류 발생** ✅
- ④ 공제합계 검증: `calcDed(소득세 오입력 기준)` vs `row._ded(DB 기준)` → **90,000원 차이로 오류 발생** ✅

**문제**: 두 오류 메시지만으로는 *"소득세가 틀렸다"*는 것을 직관적으로 파악하기 어려움.

**수정 내용**: ② 지방소득세 오류와 ④ 공제합계 오류 메시지에 **소득세 역산 힌트** 추가
- 지방소득세(주민세)로 소득세를 역산: `incFromLt = Math.round(localTax / 0.1)`
- 역산값과 실제 입력 소득세의 차이가 1,000원 초과면 힌트 표시

```
⚠️ 소득세 오입력 의심: 지방소득세(43,280)가 맞다면 소득세는 약 432,800원이어야 합니다
   (현재 342,803원, 차이 89,997원)
```

### 3. 오류 메시지 개선

- 지급총액 오류 desc에 `기타지급` 항목 명세 추가
- 소득세/지방소득세 0 케이스 처리 (소득세 있는데 주민세 0인 경우도 오류 탐지)

---

## 📋 v2.27.5 업데이트 내역 (장기요양보험료 요율 단위 버그 수정)

### `getRateForYearMonth()` — % 단위 미변환 버그 수정 ✅

**증상**: 김정규 소득세만 오입력했는데, 김정규·박다수당·이계약·최신입 등 여러 직원의 장기요양보험료가 오류로 표시됨

**원인**: `getRateForYearMonth()` 함수가 DB 요율값을 `/100` 없이 그대로 반환
- DB `insurance_rates.rate` 필드는 **% 단위** 저장 (예: `12.95` = 12.95%)
- `_getPIRates()`는 `ltcare.rate/100`으로 올바르게 변환하여 사용
- `getRateForYearMonth()`는 `/100` 없이 `12.95`를 그대로 반환 → 파서가 `health × 12.95`로 계산 → 실제(예: 16,000원)와 전혀 다른 값 → 전 직원 장기요양 오탐

**수정**: `getRateForYearMonth()` 반환값에 `/ 100` 추가
```javascript
// 수정 전
if(byPeriod) return parseFloat(byPeriod.rate)||0;
// 수정 후
if(byPeriod) return (parseFloat(byPeriod.rate)||0) / 100;
```

**박다수당 지급총액 오류**: 장기요양과 별개로, DB의 `gross_pay`와 개별 지급 항목 합산이 불일치한 경우 올바르게 검출됨 (실제 데이터 오류, 오탐 아님)

---

## 📋 v2.27.4 업데이트 내역 (수식 검증 오탐 수정 — 다른 직원 차액 오탐 제거)

### 카드형 업로드 수식 검증 오탐 원인 분석 및 수정 ✅

**증상**: 2월 임금대장을 3월로 수정해서 업로드 시, 김정규 외 다른 직원들도 수식 검증 차액이 발생

**근본 원인 (3가지)**:

1. **`std`(보수월액) 계산 오류 → 건강·연금·고용보험 오탐**
   - 카드형 파서: `std = base+weekHol+posAlw+otPay+nightPay+holPay+annlPay`
   - 실제 보수월액: 기본급+주휴+직책+기술수당+면허수당+연장+야간+휴일+연차 + (지급유형이 fixed인 경우) 교통비·식대·자가운전·벽지·출산보육·연구활동비
   - 파서의 `std`가 실제보다 크게 작아 → `calcHealth`, `calcPension`, `calcEmpIns` 모두 실제 금액과 크게 달라짐 → 전원 오탐
   - **수정**: `std`를 카드의 '보수월액' 셀값(`row.standard_monthly_pay`) 우선 사용, 없으면 `gross - 비과세항목`으로 추정

2. **건강·국민연금·고용보험 단독 검증 자체가 부정확** (카드형·테이블형 공통)
   - 보수월액 산정 방식(비과세 항목 제외 여부, 지급유형 fixed/daily 등)이 회사마다 달라 파서에서 정확한 재현 불가
   - UI 설명문("국민연금·건강보험 절대값은 보수월액에 따라 달라지므로 검증 제외")과도 불일치
   - **수정**: 건강보험료(④), 국민연금(⑤), 고용보험료(⑥) 단독 검증 블록 완전 제거 (카드형·테이블형 모두)

3. **장기요양 검증은 유지** — 건강보험 금액 기준으로 계산 (보수월액 불필요, 검증 가능)

**최종 수식 검증 항목** (카드형·테이블형 동일):
- ① 지급총액 = 지급항목 합산 (CALC_TOLERANCE=2원)
- ② 지방소득세 = 소득세 × 10% (반올림 또는 10원 내림, LOCAL_TAX_TOLERANCE=10원)
- ③ 장기요양보험료 = 건강보험 × 장기요양요율 (LT_CARE_TOLERANCE=10원)
- ④ 공제합계 = 공제항목 합산 (CALC_TOLERANCE=2원)
- ⑤ 영수액 = 지급총액 - 공제합계 (CALC_TOLERANCE=2원)

**제거된 항목**: ④건강보험료, ⑤국민연금, ⑥고용보험료 단독 검증

**추가 수정** (테이블형): 불필요해진 `rateHealth`, `ratePension`, `rateEmpIns`, `capPension` 변수 제거

---

## 📋 v2.27.3 업데이트 내역 (계약 고정 항목 검증 로직 완전 수정)

### 카드형/테이블형 공통 — 계약 status 및 차량 필드 검증 버그 수정 ✅

**발견된 근본 원인 4가지**:

1. **계약 status `'유효'` 누락** (카드형·테이블형 공통)
   - `allContracts.find(... status==='활성'||status==='active')`만 조회
   - `status==='유효'` 계약은 `ct=null`로 처리 → 해당 직원 검증 전체 스킵
   - **수정**: 두 파싱 분기 모두 `||c.status==='유효'` 추가

2. **차량 계약 필드 불일치 — 카드형** (기본급 외 차량 항목 검증 미작동)
   - 카드 파싱: `row.transportation_allowance ?? row.self_driving_allowance`
   - 계약 비교: `ct.car_maintenance`만 참조
   - 계약서에 `transportation_allowance`/`self_driving_allowance`에 값이 있으면 `ctVal===0` 판정 → 검증 건너뜀
   - **수정**: 카드형 검증을 세 필드 각각 분리 비교
     - `ctTransp > 0` → `transp(교통비)` vs `ct.transportation_allowance`
     - `ctSelfDrv > 0` → `selfDrv(자가운전)` vs `ct.self_driving_allowance`
     - 레거시(`car_maintenance`만 있을 때) → 합산값 vs `ct.car_maintenance`

3. **차량 계약 필드 불일치 — 테이블형**
   - 테이블형 `CI.CAR` 열은 교통비+자가운전 합산값
   - 계약 비교: `ct.car_maintenance`만 참조 → 신규 필드 차량 검증 미작동
   - **수정**: `ctTransp + ctSelfDrv + ctCarLeg` 전체 합산과 비교

4. **`validRows` 저장 시 차량 필드 분리 누락 → `confirmBulkUpload` 개선**
   - 카드형: `transp`, `selfDrv` 각각 저장 → DB의 `transportation_allowance`, `self_driving_allowance`에 분리 저장
   - 테이블형: 기존 `car` 단일값 유지 (변경 없음)

**수정 위치**:
- `validateAndParseExcel()` 카드형 분기 `cardDataRows.forEach`: `ct` 조회 + `car` 변수 분리 + `fixedChecks` 차량 로직
- `validateAndParseExcel()` 테이블형 분기 `dataRows.forEach`: `ct` 조회 + `fixedChecks` 차량 합산 로직
- `confirmBulkUpload()`: `r.transp`/`r.selfDrv` 존재 시 각 DB 필드에 분리 저장

---

## 📋 v2.27.2 업데이트 내역 (카드형 포맷 유지 + 업로드 파서 카드형 지원)

### 임금대장 뷰 엑셀 포맷 원상 복원 + 업로드 파서 이중 포맷 지원 ✅

**이전 v2.27.1 접근 문제**: 다운로드 포맷을 테이블형으로 바꾸었으나 사용자가 원래의 카드형 포맷 유지를 요청

**최종 해결 방향**: 다운로드는 원래 카드형(9열) 포맷 유지, 업로드 파서가 **두 가지 포맷을 모두 지원**하도록 수정

**변경 사항 요약**:
1. `downloadWageLedgerExcel()` — 원래 카드형(9열) 포맷으로 완전 복원 (v2.27.0 이전 상태)
2. `downloadPayrollExcel()` — v2.27.1에서 추가한 파라미터 오버라이드 제거, 원상 복원
3. `validateAndParseExcel()` — **포맷 자동 감지 + 이중 파싱** 추가:
   - **카드형 감지**: `raw[2]`의 C0=순번(숫자), C1='성명' 패턴으로 자동 감지
   - **카드형 파싱 분기**: `CARD_PAY_MAP`, `CARD_DED_MAP`으로 항목명→DB 필드명 매핑, 직원 1명당 11행 구조 파싱
   - **테이블형 파싱**: 기존 32열 테이블형 그대로 유지
   - 두 포맷 모두 `confirmBulkUpload()` 호환 구조(`emp`, `workDays`, `base` 등)로 `validRows` 생성

**카드형 파싱 구조**:
- row+0: `[No, '성명', 이름, '부서', 부서명, '직책', 직책, '고용형태', 고용형태]`
- row+1: `['', 근로일수/시간, 연장야간, '지급총액', 금액, '공제합계', 금액, '실수령액/날짜', 금액]`
- row+2~+6: 지급내역 5행 (4개 항목 쌍 × 5행)
- row+7~+9: 공제내역 3행 (4개 항목 쌍 × 3행)
- row+10: 빈행(구분)

---

## 📋 v2.27.1 업데이트 내역 (임금대장 엑셀 다운로드 ↔ 업로드 호환 수정)

### 임금대장 뷰 다운로드 파일 업로드 오류 수정 ✅

**문제**: 임금대장 뷰에서 다운로드한 파일을 그대로 업로드 시 "필수 열을 찾을 수 없습니다" 오류 발생

**근본 원인**: `downloadWageLedgerExcel()`이 카드형(9열) 레이아웃으로 생성하는데, 업로드 파서 `validateAndParseExcel()`은 테이블형(32열) 레이아웃을 기대함. 업로드 파서의 헤더 탐지 코드가 `'성명'`을 찾아 3행을 헤더로 잘못 인식하는 구조적 충돌.

**해결**: `downloadWageLedgerExcel()` 함수를 완전히 재작성하여 `downloadPayrollExcel()`을 `fillExisting:true`로 직접 호출하도록 변경. 두 기능이 동일한 테이블형 포맷을 공유하므로 완전 호환됨.

**변경 사항 요약**:
1. `downloadWageLedgerExcel()` — 카드형 9열 로직 제거, `downloadPayrollExcel(_wlCompanyId, yr, mo, true, false)` 호출로 교체
2. `downloadPayrollExcel()` — 파라미터 오버라이드(`_overrideCoId`, `_overrideYr`, `_overrideMo`, `_overrideFillExisting`, `_overrideFillContract`) 지원 추가
3. 오버라이드 모드에서는 해당 월 급여 데이터 있는 직원 전체 포함 (퇴직 직원도 해당 월 급여 있으면 포함)
4. 오버라이드 모드에서는 모달 닫기(`closeModal`) 건너뜀

---

## 📋 v2.27.0 업데이트 내역 (근로계약서 발송 관리)

### 근로계약서 발송 3종 + 발송 이력 관리 페이지 신설

#### 1. 근로계약서 조회 모달 — 발송 버튼 3종 추가
- **모달 툴바**의 PDF 저장 버튼 우측에 구분선 + 발송 버튼 3개 추가
- **알림톡 발송** `(노란 버튼)`: 카카오 알림톡으로 근로자 전화번호로 계약서 PDF 발송
  - 전화번호 미등록 시 버튼 자동 비활성화 + 안내 tooltip
- **이메일 발송** `(파란 버튼)`: 직원 정보에 등록된 이메일로 계약서 PDF 발송
  - 이메일 미등록 시 버튼 자동 비활성화 + 안내 tooltip
- **수동 직접 배부** `(초록 버튼)`: 출력물을 직접 교부한 경우 배부 완료 처리
  - confirm 대화상자로 2차 확인 후 이력 등록

#### 2. 발송 이력 자동 저장 (`contract_dispatch` 테이블)
| 필드 | 설명 |
|---|---|
| contract_id | 근로계약 ID |
| employee_name / company_name | 직원·고객사명 (스냅샷) |
| contract_type | 계약 유형 (정규직·계약직·일용직 등) |
| dispatch_method | 발송 방식 (알림톡·이메일·수동배부) |
| dispatch_status | 발송 상태 (완료·실패·대기) |
| recipient | 수신처 (전화번호 or 이메일 or '직접배부') |
| dispatched_at | 발송 완료 일시 (ms timestamp) |
| dispatched_by | 처리한 관리자명 |
| note | 비고 (실패 사유 등) |
| contract_start / contract_end | 계약 기간 스냅샷 |

#### 3. 근로계약서 발송 관리 페이지 신설
- **사이드바**: 근로 계약 관리 바로 하단에 **"계약서 발송 관리"** 메뉴 추가
- **필터 4종**: 발송 방식 / 발송 상태 / 고객사 / 키워드(직원명·수신처)
- **요약 카드 4종**: 전체 발송 건수 / 알림톡 완료 / 이메일 완료 / 직접 배부
- **발송 이력 테이블**: 최신순 정렬, 페이지당 20건, 페이지네이션
- **새로고침 버튼**: DB에서 최신 이력 즉시 재조회

---

## 📋 v2.20.0 업데이트 내역 (근로계약서 초안 출력 기능)

### 근로계약 유형별 표준 근로계약서 자동 생성 · 출력 · PDF 저장

#### 구현 범위
- **계약 유형 5종** 완전 지원: 정규직 / 정규직 수습 / 계약직 / 계약직 수습 / 일용직
- **데이터 자동 바인딩**: 근로계약 DB 필드 (계약, 직원, 회사) → 계약서 서식 자동 완성
- **인쇄**: 새 창에서 A4 최적화 CSS 적용 후 `window.print()` 호출
- **PDF 저장**: `html2canvas` + `jsPDF` → `근로계약서_홍길동_정규직_20260511.pdf` 형식으로 저장

#### 진입 경로 2가지
1. **계약 목록 → "계약서" 버튼**: 계약 목록 테이블 관리 컬럼 우측에 ⬛ "계약서" 버튼 추가
2. **계약 조회 모달 → 상단/하단 액션 바 → "계약서 출력" 버튼**: 조회 모드 시 항상 표시

#### 계약 유형별 차별화 내용

| 항목 | 정규직 | 정규직 수습 | 계약직 | 계약직 수습 | 일용직 |
|---|---|---|---|---|---|
| 계약기간 표현 | 기간의 정함 없음 | 기간의 정함 없음 | 시작~종료일 | 시작~종료일 | 시작~종료일 (일용직) |
| 수습기간 조항 | ✗ | ✅ (제5조) | ✗ | ✅ (제5조) | ✗ |
| 연차 유급휴가 | ✅ | ✅ | ✅ | ✅ | ✗ |
| 임금 항목 | 기본급·제수당·월합계 | 동일 | 동일 | 동일 | 일급여 단일 표시 |
| 기간제 고지 | ✗ | ✗ | ✅ (기간제법) | ✅ | ✗ |
| 4대 보험 | 4종 전체 | 4종 전체 | 4종 전체 | 4종 전체 | 산재보험만 필수 |
| 제목 | 근로계약서 | 근로계약서 | 근로계약서 | 근로계약서 | **일용근로계약서** |

#### 자동 바인딩 필드 목록
- **회사**: `company_name`, `business_number`, `address`, `representative`, `pay_day`
- **직원**: `name`, `id_number`(생년월일), `address`, `phone`, `employment_category`, `job_description`, `department`, `position`
- **계약**: `contract_start`, `contract_end`, `base_salary`, `weekly_holiday_pay`, `position_allowance`, `car_maintenance`, `meal_allowance`, `other_allowance`, `monthly_salary_agreed`, `annual_salary`, `hourly_wage`, `daily_wage`, `annual_leave_days`, `probation_months`, `probation_pct`, `probation_amt`, `schedule_json`, `note`

#### 기술 구현
- **신규 HTML 모달**: `#contract-print-modal` — A4 비율 미리보기, 출력·PDF 버튼 포함
- **신규 JS 함수**:
  - `openContractPrintModal(contractId)` — 전역 배열에서 데이터 수집 후 모달 열기
  - `generateContractHTMLFromData(c, emp, co)` — 유형 분기 계약서 HTML 생성 (모달 UI 독립)
  - `printContractDoc()` — 새 창 인쇄 (A4 CSS 포함)
  - `downloadContractPdf()` — html2canvas → jsPDF A4 PDF 저장
  - `closeContractPrintModal()` — 모달 닫기
  - `_getContractPrintCSS()` — 인쇄/PDF 공용 CSS 반환

---

## 📋 v2.19.0 업데이트 내역 (마이너스 net_pay 전수 조사 및 수정)

### 전체 급여 레코드 net_pay < 0 전수 스캔 및 일괄 수정
- **스캔 범위**: 전체 340건 payrolls 레코드
- **발견된 이상 레코드**: 3명 12건 (한울테크 2명, 서울식품 1명)
- **수정 완료 후 마이너스 잔여: 0건** ✅

| 직원 | 회사 | 레코드 | 이상 income_tax | 정상 income_tax | 수정 방식 |
|---|---|---|---|---|---|
| 한미영 (emp01_06) | 한울테크 | 5건 (2025.10~2026.02) | 6,118,730 | 77,900 | old_td에서 inc/loc 교체 |
| 오승현 (emp01_07) | 한울테크 | 5건 (2025.10~2026.02) | 7,279,510 | 584,200 | old_td에서 inc/loc 교체 |
| 김영훈 (emp03_03) | 서울식품 | 2건 (2025.10~11) | 0 (td 자체 비정상) | 701,470 | 정상 레코드 기준 td 재계산 |

- **수정 전략**:
  - 한미영/오승현: `new_td = old_td - (old_inc + old_loc) + (correct_inc + correct_loc)` → 장기요양 등 잔여공제 보존
  - 김영훈: `inc=0, loc=0`이나 `td` 자체가 비정상 → 정상 레코드(2025.12) 기준 `td=1,307,801` 고정 적용
- **기준값 출처**: 각 직원의 가장 최근 정상 레코드(2026.03 또는 2026.04)

---

## 📋 v2.18.0 업데이트 내역 (신준호 income_tax 수정)

### 한울테크 신준호 마이너스 실지급액 수정
- **대상**: 신준호 (emp01_11, 경영지원팀) 5건 (2025.10 ~ 2026.02)
- **이상값**: `income_tax = 6,791,980 / local_income_tax = 679,190`
- **정상값**: `income_tax = 237,980 / local_income_tax = 23,790` (2026.03 정상 레코드 기준)
- **수정 방식**: `new_td = old_td - (old_inc + old_loc) + (correct_inc + correct_loc)` (잔여공제 보존)
- **결과**: 5건 ALL PASS, 실지급액 5.6M~6.0M원대로 정상화

---

## 📋 v2.17.0 업데이트 내역 (DB 데이터 수정)

### 미래건설 박건호/황성진 마이너스 실지급액 수정
- **원인**: `pay_c02_01_*` (박건호), `pay_c02_03_*` (황성진) 레코드의 `income_tax` 필드에 비정상적으로 큰 값이 입력되어 `net_pay`가 마이너스로 계산됨
- **수정 범위**: 2025년 10월 ~ 2026년 3월 총 **12건** PATCH 수정
  - 박건호(emp02_01) 6건: `income_tax 18,340,620` → `584,200` / `local_income_tax 1,834,060` → `58,420`
  - 황성진(emp02_03) 6건: `income_tax 6,118,730` → `77,900` / `local_income_tax 611,870` → `7,790`
- **기준값**: 2026년 4월 정상 레코드에서 확인한 소득세 값 적용
- **재계산**: `total_deduction` = `income_tax + local_income_tax + national_pension + health_insurance + employment_insurance` / `net_pay` = `gross_pay - total_deduction`
- **결과**: 12건 모두 양수 실지급액으로 정상화 (검증 ALL PASS)

---

## 📋 v2.16.0 업데이트 내역 (크로스 페이지 고객사 공유 & 급여 현황 버그 수정)

### 크로스 페이지 고객사 선택 공유
- **전역 공유 변수** `currentGlobalCompanyId` / `currentGlobalCompanyName` 추가
- 근로계약·급여명세서·급여통계·급여입력 4개 페이지 간 선택한 고객사 자동 유지
- `showPage()` 내 모든 페이지 전환 시 전역 변수 기준으로 `selectXxx()` 자동 호출
- `selectXxx()` / `clearXxx()` 함수들이 전역 변수 동기화

### 고객사 칩 선택 스타일 복원
- `renderXxxCompanyList()` 4개 함수의 `isSelected` 기준을 `currentGlobalCompanyId` 단일 기준으로 통일
- 해지 후 다른 페이지 이동 시 이전 선택 색상이 남는 버그 수정

### 급여 현황 카드 border-radius 수정
- 왼쪽 상단 모서리 라운드 미적용 버그 수정 (인라인 스타일 제거)

### 급여 현황 그래프 미표시 버그 2건 수정
- **Bug 1**: `currentLsCompanyId` null 시 조기 return → `|| currentGlobalCompanyId` 폴백 추가
- **Bug 2**: 빈 데이터 시 `wrapEl.innerHTML`로 canvas DOM 삭제 → 다음 렌더 시 null 참조 오류 → canvas 복원을 빈 데이터 체크 이전으로 이동

---

## 📋 v2.15.0 업데이트 내역 (근로계약 관리 고도화)

### 조회 모드 전환
- 계약 목록의 **수정 버튼 → 조회 버튼** 변경 (`viewContract()`)
- 조회 클릭 시 모달 전체 **읽기전용** (modal-body 내 모든 input/select 비활성화)

### 모달 상단·하단 액션 바
- 조회 모드 전용 액션 바가 상단과 하단에 표시됨
- 계약 상태에 따라 버튼 조건부 표시:
  - **갱신** 버튼: 유효한(활성) 계약에만 표시
  - **재계약** 버튼: 만료·해지된 계약에만 표시
  - **종료** 버튼: 유효/갱신예정 계약에 표시
  - **취소** 버튼: 항상 표시

### 갱신 플로우
1. 갱신 버튼 클릭 → confirm Alert("기존 계약을 종료하고 변경된 근로조건으로 계약을 갱신하시겠습니까?")
2. 확인 시 **갱신 패널** 열림 → 기존 계약 종료일 / 신규 계약 시작일 입력
3. 갱신 확정: 기존 계약 상태 → `갱신됨`, 신규 계약 생성
4. 신규 계약 시작일이 오늘 이후면 상태 **`갱신예정`**

### 재계약 플로우
1. 만료/해지 계약 조회 시 **재계약 버튼** 표시
2. 클릭 시 기존 계약 데이터를 복제한 편집 가능 모달 열림
3. 저장 시 신규 계약 생성, 시작일이 오늘 이후면 상태 **`계약예정`**

### 종료 플로우
1. 종료 버튼 클릭 → **종료 패널** 열림 (종료일 선택)
2. 종료 확정:
   - 종료일이 오늘 이후 → 상태 **`종료예정`**
   - 오늘 이전 → 상태 **`해지`** + 직원 퇴직 처리
   - 계약직/일용직에서 원래 계약종료일보다 이른 경우 → **`파기`** 여부 confirm 후 처리

### 편집 모드 계약직/일용직 종료일 변경 자동 처리
- 종료일이 계약 시작일 이전으로 변경 → **`파기`** 상태 자동 적용
- 종료일이 미래 날짜로 변경 → **`갱신됨`** 상태 자동 적용

### 새 계약 상태 배지
| 상태 | 배지 색상 |
|------|----------|
| 갱신예정 | 주황(amber) |
| 계약예정 | 인디고(indigo) |
| 종료예정 | 청록(teal) |
| 파기 | 슬레이트+취소선(slate) |
| 갱신됨 | 인디고(indigo) |

---

## 🔑 테스트 접근 코드 (고객사 앱)

| 회사명 | 접근코드 | 직원 수 | 급여일 | 상태 |
|--------|----------|---------|--------|------|
| 주식회사 한울테크 | **1234** | 12명 | 25일 | 🟢 이용중 |
| 미래건설 주식회사 | **2345** | 8명 | 20일 | 🟢 이용중 |
| 서울식품 유한회사 | **3456** | 18명 | 10일 | 🟢 이용중 |
| 동방물류 주식회사 | **4567** | 5명 | 25일 | 🟢 이용중 |
| 그린에너지 주식회사 | **5678** | 15명 | 15일 | 🟢 이용중 |
| 테크솔루션 주식회사 | **9999** | 3명 (퇴직) | 15일 | ⚫ 해지 |

> **이용중 고객사**: 2025년 10월 ~ 2026년 4월 급여 데이터 (7개월)  
> **해지 고객사**: 2025년 10월 ~ 12월 급여 데이터 (3개월, 계약 종료)

---

## 🐛 문제 해결

### "데이터가 보이지 않아요"

1. **올바른 페이지를 열었는지 확인**
   - `index.html`: 랜딩 페이지 (선택 화면만 표시)
   - `admin/index.html`: 관리자 페이지 (데이터 관리)
   - `client/index.html`: 고객사 앱 (로그인 필요)

2. **고객사 앱 사용 시**
   - 반드시 **접근 코드**(1234, 2345, 3456, 4567, 5678)를 입력해야 합니다
   - 로그인하지 않으면 데이터가 표시되지 않습니다

3. **브라우저 캐시 문제**
   - F5 (새로고침) 또는 Ctrl+Shift+R (강제 새로고침)을 눌러보세요
   - 브라우저 캐시를 지우고 다시 열어보세요

4. **개발자 도구로 확인**
   - F12를 눌러 개발자 도구를 엽니다
   - Console 탭에서 로그를 확인:
     - `[급여관리] 데이터 로드 중...` → 데이터 로드 시작
     - `[급여관리] 데이터 로드 완료: {...}` → 데이터 로드 완료
     - `[급여관리] 시스템 준비 완료` → 렌더링 완료
   - Network 탭에서 API 요청 상태를 확인할 수 있습니다

5. **🔧 시스템 상태 체크 도구**
   - `temp/system_check.html` 파일을 열어 전체 시스템 상태를 확인할 수 있습니다
   - API 상태, 데이터 개수, 접근 코드 목록 등을 한눈에 확인
   - 문제가 있다면 정확한 오류 메시지 표시

---

## 📁 파일 구조
```
index.html               # 메인 랜딩 페이지 (관리자/고객사 선택)
admin/index.html         # 노무사 관리자용 사이트
client/index.html        # 고객사 급여 조회 앱
README.md
```

## 🗄️ 데이터 모델

### companies (고객사)
| 필드 | 설명 |
|------|------|
| id | 고객사 ID (comp01~comp06) |
| company_name | 회사명 |
| business_number | 사업자등록번호 |
| representative | 대표자명 |
| access_code | 고객사 앱 접근 코드 |
| pay_period | 급여 산정기간 |
| pay_day | 급여 지급일 |
| industry | 업종 |
| **status** 🆕 | **이용 상태 (이용중/해지)** |
| **contract_start_date** 🆕 | **계약 시작일** |
| **contract_end_date** 🆕 | **계약 종료일** |

### employees (직원)
| 필드 | 설명 |
|------|------|
| id | 직원 ID (emp01_01 형식) |
| company_id | 소속 회사 ID |
| name / gender / employment_category | 기본정보 |
| department / position | 부서/직책 |
| hire_date / contract_period / resign_date | 근무기간 |
| id_number / address / phone | 개인정보 |
| education / dependents | 학력/부양가족수 |
| bank_name / bank_account | 급여 계좌 |

### contracts (근로계약서)
| 필드 | 설명 |
|------|------|
| hourly_wage | 통상시급 (자동계산) |
| annual_salary / monthly_salary_agreed | 연봉/월약정임금 |
| base_salary / weekly_holiday_pay | 기본급/주휴수당 |
| position_allowance / car_maintenance / meal_allowance | 각종 수당 |
| work_hours_per_day / work_days_per_week / break_time | 근로조건 |

### billing (시스템 사용료) 🆕
| 필드 | 설명 |
|------|------|
| company_id | 고객사 ID |
| billing_year / billing_month | 청구 연월 |
| employee_count | 해당 월 재직 직원 수 |
| amount_per_employee | 직원당 사용료 (20,000원) |
| total_amount | 총 청구 금액 |
| payment_status | **납부 상태 (납부대기/일부납/미납/완납)** 🔄 |
| payment_date | 납부 확인일 |
| **partial_paid_amount** 🆕 | **일부 납부 금액** |
| **remaining_amount** 🆕 | **잔여 미납금** |
| due_date | 납부 마감일 (고객사별 급여일) |

> **납부 상태 자동 계산** (v2.4 업데이트):  
> • **납부대기** 🔵: 마감일 전 & 미납부  
> • **일부납** 🟡: 일부만 납부 완료 (잔여금 > 0) 🆕  
> • **미납** 🔴: 마감일 지남 & 미납부  
> • **완납** 🟢: 전액 납부 완료

### payrolls (급여대장) — 55 fields (v2.27.8)
| 필드 | 설명 |
|------|------|
| pay_year / pay_month | 급여 귀속연월 |
| work_days / total_work_hours / overtime_hours / night_hours / holiday_hours | 근태 |
| hourly_wage | 통상 시급 |
| base_salary / weekly_holiday_pay / position_allowance / skill_allowance / license_allowance | 지급항목(통상임금 포함) |
| overtime_pay / night_pay / holiday_pay | 초과근무수당 |
| transportation_allowance / self_driving_allowance / remote_area_allowance / meal_allowance | 비과세 교통·식대 수당 |
| childcare_allowance / research_allowance | 비과세 기타수당 |
| annual_leave_pay / bonus_pay / performance_pay / actual_expense_pay / communication_pay | 비정기 지급 |
| **etc_allowance** | **기타수당** (구: overseas_work_pay/국외근로소득, v2.27.8 변경) |
| **other_pay** | **기타지급 합산** (엑셀 테이블형 업로드 시 항목 합산 저장용, v2.27.6 추가) |
| gross_pay / standard_monthly_pay | 지급총액 / 보수월액 |
| income_tax / local_income_tax | 소득세/지방소득세 |
| health_insurance / long_term_care / national_pension / employment_insurance | 4대보험 |
| year_end_tax_adjust / health_insurance_adjust / advance_deduction | 정산항목 |
| total_deduction / net_pay | 공제총액/실수령액 |
| pay_date / note / dependents | 지급일 / 비고 / 부양가족수 |

---

## ✅ 완료된 기능

### 관리자 사이트 (admin/index.html)
- [x] **대시보드** ⭐ 새로운 레이아웃
  - 미납금 알림 (미납 시스템 사용료가 있을 경우 최상단 표시) 🆕
  - **고객사 현황 카드** (최상단, 가로로 긴 형태) 🆕
    - 필터 버튼: 이용중 / 해지 / 전체 (기본: 이용중)
    - 각 필터에 고객사 수 표시 (N)
    - 🔍 **고객사명 검색 기능** (선택된 필터에 종속) 🆕
    - 📅 **급여일 순 정렬** (오늘로부터 가까운 급여일 순) 🆕
    - 💰 **급여 입력 상태 표시** 🆕
      - 입력 완료: 이번 달 지급 총액 + "수정" 버튼
      - 입력 대기: "급여 입력" 버튼
    - 이용중 고객사: 🔴 붉은색 아이콘 배경
    - 해지 고객사: ⚫ 회색 아이콘 배경
    - 상태 배지 표시 (이용중/해지)
  - 통계 카드 4개 (이용중 고객사/직원/계약/급여 현황) 🆕
  - 이번 달 급여 현황 테이블
- [x] **고객사 관리** (등록/수정/삭제, 접근코드 설정) 🆕
  - 상태별 필터 (전체/이용중/해지)
  - 회사명 검색 기능
  - 이용중/해지 배지 표시
  - 계약 기간 표시 (해지 고객사)
- [x] **시스템 사용료 관리** 🆕
  - 월별 청구 자동 생성 (이용중 고객사만 대상, 직원당 2만원)
  - **고객사별 개별 청구 생성** (테이블 행에서 바로 생성 가능) 🔥 v2.5
  - **청구 대상 고객사 자동 표시** (청구 데이터 없는 고객사도 테이블에 표시) 🔥 v2.7
    - 청구 생성 전 고객사 정보 표시 (직원 수, 청구 예상 금액)
    - 황색 배경으로 청구 대상 강조 표시
    - [청구 생성] 버튼 활성화 (애니메이션 효과)
    - 청구 생성 후 자동으로 실제 청구 데이터로 전환
  - **누적 미납금 관리** 🔥 v2.8
    - 잔여 미납금: 이월 미납금 + 현재 청구 잔액
    - 청구 생성 전(청구대상)은 이월 미납금만 표시
    - 고객사별 전체 미납 현황 한눈에 파악
  - 고객사별 납부 마감일 (급여일과 동일)
  - **일부납 처리 기능** (분할 납부 지원) 🔥 v2.4
    - 납부 버튼 분리: [완납확인] / [일부납]
    - 일부납 모달: 납부액 입력 시 잔여금 자동 계산
    - 납부금액 / 잔여미납금 열 표시
    - 상태: 청구대상 🟡 / 납부대기 🔵 / 일부납 🟠 / 미납 🔴 / 완납 🟢
  - 납부 확인 처리 및 미납 현황 조회
  - 연도/월/고객사/상태별 필터 기능
- [x] 직원 관리 (CRUD, 검색/필터, 개인정보 포함)
- [x] 근로계약서 관리 (자동계산: 통상시급, 주휴수당)
  - **v2.22.0** 🔥 계약 양식 수당 항목 전면 개편:
    - 기술수당·면허수당 추가 (통상임금 포함)
    - 교통비·자가운전보조금·벽지수당·식대에 통상임금 지급유형 토글 (매월 정기지급/출근일수에 따름) 추가
    - 출산·보육수당·연구활동비 항목명 정비
    - 기타수당(레거시) 제거
    - 계약서 HTML 출력에 신규 수당·지급유형 뱃지 반영
    - 계약 저장 → 급여입력 자동채움 (지급유형 토글 포함) 완성
    - contracts DB 스키마 51 fields로 확장
- [x] **v2.23.0** 🔥 급여 입력 부양가족 수 이동:
    - 근로계약 관리 → 부양가족 수 입력 항목 삭제
    - 급여 입력 → 출산·보육수당 앞에 부양가족 수 입력 항목 추가 (기본값 1)
    - 부양가족 수 입력값으로 소득세 간이세액 계산 (요율 기준·확정액 기준 모두 적용)
    - 다음 달 급여 입력 시 이전 달 payroll 레코드에서 부양가족 수 자동 인계
    - 급여 수정(editPayroll) 시 저장된 부양가족 수 복원
    - 직원 완전 초기화(clearPI) 시 부양가족 수 1로 리셋
    - payrolls DB 스키마 53 fields (dependents 필드 추가)
- [x] **v2.26.2** 🔥 퇴직급여 관리 — 탭1 계약 이력 클릭 시 계약 조건 상세 모달 조회:
    - `sev-contract-modal` 신규 추가 (z-index:3200, 배경 클릭 닫기)
    - `openSevContractModal(contractId, empName, contractIdx)` 함수 구현
    - 탭1 계약 이력의 모든 행(첫 번째 계약 포함, slice(1) 이후 계약 포함)에 클릭 이벤트 연결
    - hover 시 행 배경색 변경 + 🔍 돋보기 아이콘 표시
    - 모달 구성: ①계약기간·상태, ②근무조건(1일시간·주간일수·휴게·요일별 스케줄), ③급여구성(전 항목+월합계), ④수습조건, ⑤4대보험, ⑥비고
    - 번호 뱃지(① ② ③)를 모달 타이틀에도 표시
    - `closeSevContractModal()` 함수 + 배경 오버레이 클릭 닫기 지원
- [x] **v2.26.1** 🔥 퇴직급여 관리 — 탭2(지급 발생 이력) 계약 갱신 이력 multi-row 표시 완성:
    - `renderSevHistoryTab()` 행 렌더링을 탭1과 동일한 rowspan/계약이력 multi-row 구조로 전면 교체
    - **계약별 하위 행**: ①②③ 번호 뱃지 + 계약 시작일 ~ 종료일 + 계약별 재직기간
    - **총 재직기간 합산 행**: 최초 입사일~퇴사일 기준 총 재직일수 (fffbeb 황색 배경)
    - `pays3` / `sev` 변수 선언이 `window[key]` 등록 이전으로 이동 (참조 오류 수정)
    - 1년 미만 케이스도 동일 multi-row 구조 적용 (fef9c3 황색 합산 행)
    - 행 hover 시 해당 근로자의 모든 행(계약별 + 합산 행 포함)이 함께 하이라이트
    - 계약 데이터 없는 경우 fallback 행 처리 (`계약 정보 없음` 표시)
- [x] **v2.26.0** 🔥 퇴직급여 관리 메뉴 신규 추가:
    - 좌측 메뉴 '급여 통계 조회' 위에 '퇴직급여 관리' 메뉴 추가
    - **탭1 — 근로자별 퇴직급여 현황**: 고객사 선택 시 재직 중인 근로자의 직전 3개월 통상임금·평균임금·퇴직금 추계액 표시
      - 1년 미만 재직자·일용직 제외, 해지/만료예정 상태 뱃지 표시
      - 지급 예정 총액 합산 표시
    - **탭2 — 지급 발생 이력**: 퇴사 처리된 근로자 기준 퇴직금 발생 내역 최근순 정렬
      - 행 클릭 시 퇴직금 정산내역서 팝업 (근로자 정보, 통상/평균임금 상세, 산정 공식, 최종 지급액, 서명란)
    - **정산내역서 팝업 액션**: 엑셀로 저장, PDF로 저장, 알림톡 발송(PDF 생성+확인), 이메일 발송(PDF+mailto)
      - 직원 이메일 미등록 시 이메일 발송 버튼 자동 비활성화
    - 퇴직금 산정: 1일 평균임금 × 30일 × (재직일수/365), 통상임금 유리 기준 자동 선택
- [x] **v2.25.0** 🔥 기술수당·면허수당 출력 위치 통일 (비정기 지급 기준):
    - 대시보드 지급항목 파이차트: 통신비 다음으로 이동
    - 임금대장 HTML: 헤더·데이터행·합계행 모두 통신비 다음으로 이동
    - 엑셀 임금대장: headerRow2·dataRows·sumRow·열너비 모두 통신비 다음으로 이동
    - 급여명세서 팝업 (비정기 지급 섹션): 통신비 다음으로 이동
- [x] **v2.24.0** 🔥 급여 입력 연차 현황 표 추가:
    - 연차수당 입력 앞에 연차 현황 표 (총 발생·이번달 사용·누적 사용·잔여) 표시
    - 이번달 사용 연차 입력 필드 (pi-annual-used) 추가, 0.5일 단위 입력 지원
    - 누적 사용 연차: 계약 시작 이후 저장된 모든 payroll의 annual_leave_used 자동 합산
    - 잔여 연차 0 이하 시 경고색 표시
    - payrolls DB 스키마 54 fields (annual_leave_used 필드 추가)
- [x] **v2.27.8** 🔥 id·DB 필드명 변경 (`pi-overseas` → `pi-etc-allowance`, `overseas_work_pay` → `etc_allowance`):
    - 급여 입력 UI 라벨 `국외근로소득` → `기타수당`, input id 변경
    - payrolls DB 스키마 55 fields (`overseas_work_pay` → `etc_allowance`, `other_pay` 신규 추가)
    - 하위 호환: CARD_PAY_MAP에 `'기타지급'`/`'국외근로소득'` → `etc_allowance` 매핑 유지
- [x] 급여 입력 (4대보험·세금 자동계산, 연말정산·건보 정산)
- [x] 급여대장 조회 (회사·월별 필터)
- [x] Excel 다운로드 (급여대장, 개인별 명세서)

### 고객사 앱 (client/index.html)
- [x] 접근코드 인증 로그인
- [x] 급여 명세서 탭 (직원/월 선택, 지급내역 상세)
- [x] 월별 변동 추이 탭 (실수령액 라인차트, 지급·공제 바차트)
- [x] 직원 정보 탭 (기본정보, 계약정보, 계좌정보)

---

## 📊 테스트 데이터 현황
- **고객사**: 7개 (이용중 6개, 해지 1개) — `[퇴직급여테스트] 한빛노무법인` 포함 🆕

### 🧪 퇴직급여 관리 전용 테스트 고객사: `[퇴직급여테스트] 한빛노무법인`
> 모든 퇴직급여 기능 케이스를 포괄하는 전용 데이터셋

| 직원 | 시나리오 | 탭 | 검증 포인트 |
|---|---|---|---|
| **김정규** | 단일계약 · 5년 재직 · 급여 있음 | 탭1 | 통상임금·평균임금·퇴직금 **27,542,740원** |
| **이계약** | 계약 2회 갱신 · 재직 중 | 탭1 | 퇴직금 **14,960,195원**, 계약 이력 ② |
| **박다수당** | 계약 3회 갱신 · 면허/기술/출산보육/연구활동비 포함 | 탭1 | 퇴직금 **40,393,656원**, 계약 이력 ③ |
| **최신입** | 1년 초과 재직 (2025-01-06 입사) | 탭1 | 퇴직금 **3,901,338원** |
| **정무급여** | 5년 재직 · **급여 데이터 없음** | 탭1 | `급여 데이터 필요` 경고 표시 |
| **강정상** | 단일계약 · 2024-12-31 퇴사 | 탭2 | 퇴직금 **41,253,951원**, 정산내역서 팝업 |
| **윤갱신** | 계약 2회 후 퇴사 | 탭2 | 퇴직금 **10,418,478원**, 계약이력 ② |
| **장해지** | 계약 **해지** 사유 · 2024-09-30 | 탭2 | 퇴직금 **8,307,086원**, 사유 `계약 해지` |
| **한미만** | **1년 미만** 재직 후 퇴사 (213일) | 탭2 | `1년 미만 — 해당 없음` 회색 처리 |
| **오노이메일** | 4년 재직 퇴사 · **이메일 없음** | 탭2 | 퇴직금 **19,565,217원**, 이메일 버튼 비활성화 |

#### 💡 급여 데이터 구성 (오늘 기준 직전 3개월 = 2026년 2·3·4월 / 퇴직자는 퇴직일 기준)
| 직원 | 기준 | 조회월 | gross/월 | ordinary/월 |
|---|---|---|---|---|
| 김정규 | 2026-05-18 | 2026-02~04 | 4,383,333 | 4,033,333 |
| 이계약 | 2026-05-18 | 2026-02~04 | 3,383,333 | 3,133,333 |
| 박다수당 | 2026-05-18 | 2026-02~04 | 5,733,333 | 5,433,333 |
| 최신입 | 2026-05-18 | 2026-02~04 | 2,833,333 | 2,683,333 |
| 강정상 | 2024-12-31 | 2024-09~11 | 6,250,000 | 5,700,000 |
| 윤갱신 | 2024-06-30 | 2024-03~05 | 3,550,000 | 3,300,000 |
| 장해지 | 2024-09-30 | 2024-06~08 | 3,283,333 | 3,033,333 |
| 한미만 | 2024-11-30 | 2024-08~10 | 2,716,667 | 2,566,667 |
| 오노이메일 | 2024-08-31 | 2024-05~07 | 5,000,000 | 4,600,000 |
- **직원**: 총 81명 (재직 78명, 퇴직 3명) 🆕
  - 한울테크 12명, 미래건설 8명, 서울식품 18명, 동방물류 5명, 그린에너지 15명
  - 테크솔루션 3명 (전원 퇴직, 2025.12.31 계약 종료) 🆕
- **근로계약서**: 61건 (활성 58건, 만료 3건) 🆕
- **급여 데이터**: 473건
  - 이용중 고객사: 464건 (2025.10 ~ 2026.04, 7개월치)
  - 해지 고객사: 9건 (2025.10 ~ 2025.12, 3개월치) 🆕
- **시스템 사용료 청구**: 8건 (2026년 4월분 5건 + 테크솔루션 3건) 🆕
  - 한울테크: 240,000원 (12명) - ✅ 완납
  - 미래건설: 160,000원 (8명) - ❌ 미납
  - 서울식품: 360,000원 (18명) - ❌ 미납
  - 동방물류: 100,000원 (5명) - ❌ 미납
  - 그린에너지: 300,000원 (15명) - ❌ 미납
  - **테크솔루션: 180,000원 (3명, 3개월) - ✅ 전액 완납** 🆕
  - **미납 총액**: 920,000원 (4건)

### 급여 데이터 월별 분포
| 월 | 건수 |
|---|---|
| 2025년 10월 | 69건 |
| 2025년 11월 | 68건 |
| 2025년 12월 | 68건 |
| 2026년 1월 | 67건 |
| 2026년 2월 | 67건 |
| 2026년 3월 | 67건 |
| **2026년 4월** | **58건** ⭐ (이번 달) |
| **합계** | **464건** |

### 주의사항
- 직원 `status` 필드: **'재직'** (한글) 또는 **'active'** (영문) 사용
- 고객사 앱은 두 값 모두 재직 중으로 인식합니다
- **이번 달(2026년 4월) 급여 데이터**: 대시보드에서 바로 확인 가능 ✅

---

## 💰 시스템 사용료 관리 가이드 🆕

### 청구 생성

#### 방법 1: 전체 고객사 일괄 생성
1. 관리자 사이트에서 좌측 메뉴 "**사용료 관리**" 클릭
2. 우측 상단 "**이번 달 청구 생성**" 버튼 클릭
3. 각 고객사의 재직 직원 수 × 20,000원으로 자동 계산
4. 납부 마감일은 고객사별 급여일과 동일하게 설정
5. 생성된 청구는 "**납부대기**" 상태로 시작

#### 방법 2: 고객사별 개별 생성 🆕 v2.5
1. 사용료 관리 페이지의 청구 목록에서
2. 특정 고객사 행의 가장 오른쪽 **[청구]** 버튼 클릭
3. 해당 고객사의 이번 달 청구만 생성
4. 💡 **팁**: 이용중 고객사만 버튼 표시됨

### 납부 상태 규칙 (v2.4 업데이트)
청구 상태는 **급여일을 기준**으로 자동 계산됩니다:

| 상태 | 조건 | 배지 색상 |
|------|------|-----------|
| 🔵 **납부대기** | 청구 생성 후 → 급여일 전 & 미납부 | 파란색 |
| 🟡 **일부납** 🆕 | 일부만 납부 (잔여금 > 0) | 주황색 |
| 🔴 **미납** | 급여일 지남 & 미납부 | 빨간색 |
| 🟢 **완납** | 전액 납부 완료 (언제든지) | 녹색 |

> 📌 **예시**:  
> 2026-04-01에 청구 생성 (총액 400,000원), 마감일 2026-04-25  
> • 2026-04-09: 🔵 **납부대기** (마감일 전)  
> • 100,000원 납부 후: 🟡 **일부납** (잔여 300,000원)  
> • 300,000원 추가 납부: 🟢 **완납** (자동 전환)  
> • 납부 없이 2026-04-26 이후: 🔴 **미납**

### 납부 처리 (v2.4 업데이트 🔥)

#### 방법 1: 전액 완납
1. 사용료 관리 페이지에서 청구 목록 확인
2. **[완납확인]** 버튼 클릭
3. 상태가 자동으로 "완납"으로 변경되고 납부일이 기록됨

#### 방법 2: 일부 납부 🆕
1. **[일부납]** 버튼 클릭
2. 모달창에서 청구 정보 확인:
   - 총 청구금액
   - 기납부금액 (기존에 납부한 금액)
3. 납부받은 금액 입력
4. 💰 **잔여 미납금 자동 계산** 표시
5. **[일부납 확인]** 버튼 클릭
6. 상태가 "일부납"으로 변경되고 납부내역 저장

> 💡 **팁**: 일부납 건에서 잔액을 모두 납부하면 자동으로 "완납" 처리됩니다!

### 미납 현황 확인
- **대시보드**: "**미납**" 상태 건만 최상단에 빨간색 알림 카드 표시
  - "납부대기" 상태는 알림에 표시되지 않음
- **사용료 관리 페이지**: 납부대기/일부납/미납/완납 건수 및 금액 요약 🔄
- **필터 기능**: 고객사, 연도, 월, 상태(납부대기/일부납/미납/완납)별 조회 가능 🔄

---

## 🔧 기술 스택
- HTML5 / CSS3 / Vanilla JavaScript
- Chart.js (급여 추이 차트)
- Font Awesome (아이콘)
- Google Fonts - Noto Sans KR
- RESTful Table API (데이터 저장)

---

## 📌 다음 개발 과제
- [ ] 채용확정 계약서 날인본 첨부 플로우 안내 (자동 생성 후 서류미비 → 활성 전환 가이드)
- [ ] 급여명세서 출력/PDF 다운로드
- [ ] 연말정산 자동계산 기능
- [ ] 건강보험 연말 정산 자동화
- [ ] 이메일 급여명세서 발송
- [ ] 일부납 청구건 알림 기능
- [ ] 납부 이력 상세 로그 (여러 번 분할 납부 시)
- [ ] 납부율 통계 대시보드
- [ ] 근태 현황 일별 관리
- [ ] 급여 일괄 계산 기능

---

## 📝 버전 히스토리

### v2.31.1 (2026-05-26)
**급여 입력 임시저장 기능**
- ✨ `payrolls` 테이블에 `is_draft`(bool) / `draft_saved_at`(text) 필드 추가
- ✨ `_buildPIBody()` 공통 body 헬퍼 함수 신규
- ✨ `savePIDraft()` 신규 — [임시저장] 버튼 POST/PUT (`is_draft:true`)
- ✨ `_checkAndShowPIDraftBanner()` 신규 — 직원·연월 선택 시 임시저장 감지 → 복원 배너 표시
- ✨ `loadPIDraft()` 신규 — 임시저장 폼 전체 복원
- ✨ `discardPIDraft()` 신규 — 임시저장 DB 삭제
- 🔧 `savePI()` — 확정 저장 시 임시저장 레코드 자동 삭제, 중복 체크에서 is_draft 제외
- 🔧 급여 목록·임금대장·대시보드 등 전 렌더링 위치 `is_draft` 레코드 제외 필터 적용

### v2.31.0 (2026-05-26)
**수습 만료 자동 처리 — 채용확정 계약 자동 생성 + 급여 분리 저장**
- ✨ `_autoCreateConfirmedContract(probEndDate)` 신규 — 수습 계약 → 채용확정 계약 자동 생성, employees 고용형태 자동 PATCH
- ✨ `savePISplit()` 신규 — 케이스② 월 중간 분리 저장: 수습 payroll + 채용확정 payroll 2건 POST
- ✨ `_probAutoCreateAndSave()` 신규 — 케이스① 전체 초과: 채용확정 계약 자동 생성 후 단일 payroll 저장
- ✨ `_onProbSplitInputChange()` 신규 — 분리 근로일수·시간 합계 실시간 검증, 저장 버튼 활성화 제어
- 🔧 `_checkPIProbationOverrun()` 수정 — case1-panel/case2-panel 분기 show/hide, `'split'` 반환값 추가, split-info 렌더링
- 🔧 `onPIYearMonthChange()` 수정 — 케이스② `'split'` 반환 시 분리 저장 UI 활성 (일반 저장만 차단)
- 🔧 `savePI()` 수정 — 케이스①/② 분기 메시지로 교체 (버튼 사용 안내)
- 🔐 고용형태 자동 변경: 정규직 수습 → 정규직, 계약직 수습 → 계약직
- 📄 채용확정 계약서 자동 생성: `status='서류미비'`, `amended_from=piContract.id`, 수습 필드 초기화

### v2.30.9 (2026-05-26)
**수습 만료일 초과 급여 진단 & 분리 발행 도구 + DB 실제 처리 완료**

#### 도구 파일 (`temp/probation_split_tool.html`)
- ✨ DB 전체 스캔 — 수습 계약(정규직 수습·계약직 수습) 급여 레코드를 3케이스로 자동 분류
- ✨ 케이스② (월 중간 만료): 일수 비율 자동 분할 → 수습 명세서 + 채용확정 명세서 2건 신규 생성, 원본 보관
- ✨ 분할 미리보기 패널 — 처리 전 수습/확정 기간 금액을 나란히 표시

#### DB 실제 처리 결과 (전수 진단 → 7건 처리)

| 직원 | 그룹 | 처리 건수 | 처리 내용 |
|------|------|-----------|-----------|
| 박소연 | 수습 만료 후 급여 | 4건 (2026-01~04) | 원본에 `[⚠️수습초과]` 메모 추가 + 채용확정 재발행 레코드 4건 신규 생성 |
| 박다수당 | 2019년 구 계약 참조 오류 | 3건 (2026-02~04) | 원본에 `[⚠️수습계약참조오류]` 메모 추가 (현재 활성 계약 별도 존재) |

**케이스 분류 결과:**
- 케이스① (전체 초과): **7건** — 박소연 4건 + 박다수당 3건
- 케이스② (월 중간 분할): **0건** — 해당 없음
- 케이스③ (정상): **4건**

**박소연 채용확정 재발행 레코드 (신규 생성):**

| 급여 연월 | 원본 ID | 신규 재발행 ID |
|-----------|---------|----------------|
| 2026년 1월 | `bf70645a-...` | `c5436108-8a46-4334-ab03-bd234f13ab12` |
| 2026년 2월 | `efded712-...` | `7d611caf-25ed-4c79-8fda-9b48120f56b4` |
| 2026년 3월 | `dbda6bf0-...` | `609533ed-18b4-4a0d-9afc-b3e264d6370f` |
| 2026년 4월 | `74bfe80e-...` | `47d6fd07-11cf-4da0-82c6-96b61d3291d4` |

### v2.30.8 (2026-05-26)
**수습 만료일 초과 시 급여 저장 차단 및 명세서 경고**
- ✨ `_calcProbationEndDate(ct)` — 수습 종료일 계산 유틸 함수 신규
- ✨ `_checkPIProbationOverrun()` — 급여 월 vs 수습 종료일 3케이스 판정 함수 신규
- ✨ 급여 입력 화면: 연월 변경·직원 선택 시 수습 만료일 즉시 검사 → 경고 배너 표시 + 입력 잠금
- ✨ `savePI()` 최종 이중 차단 추가 (저장 직전 재확인 후 `return`)
- ✨ 급여 명세서 모달: `_renderProbOverrunBanner()` IIFE — 해당 월 초과 시 경고 배너 자동 표시
- 🔐 케이스①(월 전체 초과): "채용확정 기간" 안내 + 저장 차단
- 🔐 케이스②(월 중간에 만료): "분할 발행 필요" 안내 + 저장 차단
- ✅ 케이스③(수습 기간 내): 경고 없음, 정상 진행

### v2.30.7 (2026-05-26)
**정규직·계약직·일용직 최저임금 위반 실시간 경고 및 저장 차단**
- ✨ `_checkMinWageWarning()` — 정규직·계약직·일용직 공용 최저임금 위반 경고 함수 신규
- ✨ HTML: `ct-general-minwage-warning-row` / `ct-general-minwage-warning-box` 공용 경고 행 추가
- ✨ `_checkRegisterBtnState()` / `_checkAmendBtnState()` — 공용 경고 행 감지 추가
- ✨ `finalAmendContract()` / `savePendingContractEdit()` — 공용 경고 행 표시 중이면 차단
- ✨ `saveContract()` — 공용 경고 행 선행 차단 추가

### v2.10.2 (2026-04-09)
**고객사명 검색 기능 추가**
- ✨ 필터 라디오 버튼 오른쪽에 검색 입력창 추가
- 🔍 고객사명으로 실시간 검색 가능
- 🔗 검색 결과는 라디오 버튼 필터에 종속
  - 예: "미납고객" 선택 + "서울" 검색 → 미납 상태의 서울 포함 고객사만 표시
- ⚡ 입력 즉시 테이블 업데이트 (oninput 이벤트)

### v2.10.1 (2026-04-09)
**사용료 관리 필터 라디오 버튼 추가**
- ✨ 테이블 상단에 필터 라디오 버튼 추가:
  - **전체 이용고객**: 모든 청구 내역 표시 (기본)
  - **미납고객**: 미납 및 일부납 상태만 표시
  - **청구대상고객**: 청구 생성 전 고객사만 표시
  - **완납고객**: 완납 상태만 표시
- 🎨 필터 선택 시 실시간 테이블 업데이트

### v2.12.2 (2026-04-09) 🔥
**긴급 버그 수정 - data 속성 방식으로 개선**
- 🔥 onclick 속성 이스케이프 문제를 근본적으로 해결
- 🔧 **data 속성 사용 방식으로 변경**
  - Before: `onclick="openPaymentHistoryModal('id', '${name}')"`
  - After: `data-company-id="${id}" data-company-name="${name}" onclick="openPaymentHistoryModal(this.dataset.companyId, this.dataset.companyName)"`
- ✅ 모든 특수문자 포함 회사명 정상 작동
- ✅ 이스케이프 처리 불필요

### v2.12.1 (2026-04-09) 🔥
**긴급 버그 수정 - onclick 속성 이스케이프 오류**
- 🔥 고객사명 클릭 시 발생하는 JavaScript 오류 수정
- 🔧 회사명에 작은따옴표(')가 포함된 경우 이스케이프 처리
  - 잘못된 코드: `onclick="openPaymentHistoryModal('id', '${coName}')"`
  - 수정된 코드: `onclick="openPaymentHistoryModal('id', '${coName.replace(/'/g, "\\'")}')"`
- ✅ 모든 페이지 정상 작동 복구

### v2.12 (2026-04-09) ✨
**납부이력 조회 기능 추가**
- ✨ 사용료 관리 페이지에서 고객사명 클릭 시 납부이력 모달 표시
- 📊 고객사별 납부이력 요약 카드
  - 총 청구 건수, 총 청구 금액
  - 총 납부 금액, 총 미납 금액
- 📋 청구연월별 상세 납부이력 테이블
  - 청구일, 청구금액, 납부금액, 잔여금액
  - 납부일, 마감일, 상태 (납부대기/완납/일부납/미납)
- 🔍 한 고객사의 전체 납부이력을 한눈에 확인 가능
- 🎨 고객사명에 파란색 밑줄 + 커서 포인터로 클릭 가능 표시

### v2.11.1 (2026-04-09) 🔥
**긴급 버그 수정 - JavaScript 파싱 오류**
- 🔥 대시보드/메뉴가 작동하지 않는 치명적 오류 수정
- 🔧 템플릿 리터럴 내부 백틱 이스케이프 문제 해결
  - 잘못된 코드: `return \`<button...>\`;` (파싱 오류)
  - 수정된 코드: `return '<button...>';` (문자열 연결)
- ✅ 모든 페이지 정상 작동 복구
- 📄 **테스트**: `temp/test_javascript_error_fix.html`

### v2.11 (2026-04-09) 🎨
**사용료 관리 테이블 UI 최적화**
- 🎨 테이블 열 순서 재구성: 고객사 → 재직인원 → 청구연월 → 청구일 → 청구금액 → 마감일 → 납부금액 → 납부일 → 잔여미납금 → 상태 → 관리
- ✂️ "직원당 단가" 열 제거 (고정 20,000원으로 불필요)
- 🔀 "관리" 열과 "청구생성" 열을 하나의 "관리" 열로 통합
  - 완납/일부납 버튼이 없는 경우 청구 생성 버튼 표시
  - 청구대상(가상): [청구 생성] 버튼
  - 완납 청구: [청구됨] 버튼 (비활성) 또는 [청구] 버튼
- 📊 더 직관적인 정보 흐름으로 가독성 향상

### v2.10.3 (2026-04-09) 🔧
**청구일 표시 개선**
- 🔧 청구일이 표시되지 않는 문제 해결
- 🔧 `created_date` 필드가 없는 기존 데이터는 청구 연월의 1일로 표시
  - 예: 2026년 4월 청구 → 2026-04-01
- ✨ 신규 청구 생성 시 청구일(오늘 날짜) 자동 저장
- 📊 청구일로 청구 생성 시점 명확히 파악 가능

### v2.10.2 (2026-04-09) ⭐
**사용료 관리 검색 기능 추가**
- ✨ 라디오 버튼 오른쪽에 고객사명 검색 기능 추가
- 🔍 검색 결과는 라디오 버튼 선택 상태에 종속
  - 예: "미납고객" 선택 + "동방" 검색 → 동방물류의 미납 건만 표시
- 🎯 실시간 검색 (oninput 이벤트)
- 🔤 대소문자 무시, 부분 일치 지원
- 📄 **테스트**: `temp/test_billing_search_integration.html`

### v2.10.1 (2026-04-09)
**사용료 관리 필터 개선**
- ✨ 청구 상태별 필터 라디오 버튼 추가:
  - **전체 이용고객**: 모든 청구/청구대상 표시
  - **미납고객**: 미납 및 일부납 상태만 표시
  - **청구대상고객**: 청구 생성 전 고객사만 표시
  - **완납고객**: 완납 상태만 표시
- 🎨 필터 선택 시 실시간 테이블 업데이트

### v2.10 (2026-04-09) 🔥
**일괄 처리 기능 추가**
- ✨ 테이블 가장 왼쪽에 체크박스 열 추가
- ✨ 전체 선택 체크박스 (테이블 헤더)
- ✨ 테이블 상단/하단에 일괄 처리 버튼 추가:
  - **선택 일괄 완납**: 선택한 청구 건을 일괄 완납 처리
  - **선택 일괄 청구**: 선택한 청구대상을 일괄 청구 생성
- 🔧 일괄 완납: 청구 데이터만 선택 가능
- 🔧 일괄 청구: 청구대상(가상 데이터)만 선택 가능
- 📊 처리 결과 토스트 메시지 표시

### v2.9.1 (2026-04-09)
**청구 대상 테이블 표시 개선**
- 🔧 청구 대상 행의 마감일을 고객사 급여일로 표시
- 🔧 청구 대상 행의 납부일을 "-"로 표시
- 🔧 "청구대상" 배지 제거 (상태 열에 "-" 표시)
- 🔧 청구 생성 버튼을 테이블 가장 오른쪽 "청구생성" 열에 배치

### v2.9 (2026-04-09)
**사용료 관리 UI 개선**
- ✨ '이번 달 청구 생성' 버튼 제거 (개별 청구 생성 사용)
- ✨ 필터 메뉴 제거 (전체 청구 내역 표시)
- ✨ 상단에 현재 날짜 기준 통계 표시
  - 이용 중 고객사 수
  - 등록 직원 수 (재직 중인 직원만)
- 🎨 사용료 관리 페이지 UI 간소화

### v2.8 (2026-04-09) 🔥
**누적 미납금 관리**
- ✨ 잔여 미납금 = 이월 미납금 + 현재 청구 잔액
- ✨ 청구 생성 전(청구대상)은 이월 미납금만 표시
- ✨ 고객사별 전체 미납 현황 한눈에 파악
- 🔧 `calculateTotalUnpaid()` 함수 추가
- 📄 **문서**: `CUMULATIVE_UNPAID_MANAGEMENT.md`

### v2.7 (2026-04-09) 🔥
**청구 대상 고객사 자동 표시**
- ✨ 청구 데이터가 없는 '이용중' 고객사를 테이블에 자동 표시
- ✨ 황색 배경으로 청구 대상 강조 표시
- ✨ 직원 수 및 청구 예상 금액 자동 계산
- ✨ [청구 생성] 버튼 활성화 (펄스 애니메이션)
- ✨ 청구 생성 후 실제 청구 데이터로 자동 전환
- 📄 **문서**: `UNBILLED_COMPANY_DISPLAY.md`
- 🧪 **테스트**: `temp/test_unbilled_company_display.html`

### v2.6 (2026-04-09)
**청구 데이터 수정 및 청구일 추가**
- 🔧 완납 상태 청구의 납부금액/잔여미납금 데이터 수정
- ✨ 청구일(created_date) 필드 추가
- 🛠️ 데이터 수정 도구: `temp/fix_billing_data.html`
- 🛠️ 청구일 소급 적용: `temp/apply_created_date.html`
- 🛠️ 데이터 검증: `temp/validate_billing_data.html`
- 📄 **문서**: `BILLING_DATA_FIX_AND_CREATED_DATE.md`

### v2.5 (2026-04-09)
**고객사별 개별 청구 생성**
- ✨ 테이블 행에서 고객사별 청구 생성 버튼 추가
- ✨ 이미 청구된 경우 버튼 비활성화
- 🛠️ 중복 청구 방지 로직
- 🧪 **테스트**: `temp/test_company_billing_generation.html`
- 📄 **문서**: `COMPANY_BILLING_GENERATION.md`

### v2.4 (2026-04-09)
**일부납 처리 기능**
- ✨ 납부 버튼 분리: [완납확인] / [일부납]
- ✨ 일부납 모달: 납부액 입력 시 잔여금 자동 계산
- ✨ 납부금액 / 잔여미납금 열 표시
- ✨ 상태: 납부대기 🔵 / 일부납 🟠 / 미납 🔴 / 완납 🟢
- 📊 billing 테이블: `partial_paid_amount`, `remaining_amount` 필드 추가
- 🧪 **테스트**: `temp/test_partial_payment.html`
- 📄 **문서**: `PARTIAL_PAYMENT_IMPLEMENTATION.md`, `PARTIAL_PAYMENT_SUMMARY.md`

### v2.3
**시스템 사용료 관리 고도화**
- ✨ 월별 청구 자동 생성
- ✨ 고객사별 납부 마감일 설정
- ✨ 연도/월/고객사/상태별 필터
- ✨ 미납 현황 대시보드 알림

### v2.2
**고객사 계약 관리**
- ✨ 고객사 상태: 이용중 / 해지
- ✨ 계약 기간 관리
- ✨ 해지 고객사 배지 표시

### v2.1
**대시보드 개선**
- ✨ 고객사 현황 카드
- ✨ 이용중/해지 필터
- ✨ 급여 입력 상태 표시
- ✨ 통계 카드 (활성 고객사, 직원 수, 계약 수, 급여 상태)

### v2.0
**초기 버전**
- 🏢 고객사 관리 (CRUD)
- 👥 직원 관리 (CRUD)
- 📝 근로계약서 관리
- 💰 급여 입력 및 자동계산
- 📊 급여대장 조회
- 📥 Excel 다운로드
- 🔐 고객사 앱 (접근코드 로그인)
- 📈 월별 변동 추이 차트
