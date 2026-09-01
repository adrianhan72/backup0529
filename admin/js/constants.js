/**
 * constants.js — 인사톡 노무톡 공통 상수
 * 
 * 모든 상태값, 유형 코드, 매직넘버를 중앙 관리합니다.
 * DB 저장값은 영문, UI 표시는 *_LABEL의 한글을 사용합니다.
 * admin-state.js 보다 먼저 로드되어야 합니다.
 * 
 * @version 2.35.0
 */

/**
 * fmtLocalDate(d) — 로컬 타임존 기준 'YYYY-MM-DD' 문자열 반환
 * ⚠️ 시계열 글로벌 룰 (2026-08-14 제정):
 *   로컬 자정 기반 Date(new Date(y,m,d), setDate/setMonth 결과, 또는 new Date())에서
 *   'YYYY-MM-DD'를 얻을 때 `toISOString().slice(0,10)` 사용 금지.
 *   UTC+9(KST) 등 로컬 자정이 UTC 전날 15시가 되어 날짜가 하루 밀리는 버그의 원인.
 *   → 반드시 fmtLocalDate() 사용. (new Date('YYYY-MM-DD') 문자열 파싱은 UTC 자정이므로 예외적으로 허용)
 */
function fmtLocalDate(d){
  if(!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ═══════════════════════════════════════════
// 직원 상태 (employees.status)
// ═══════════════════════════════════════════
const EMP_STATUS = Object.freeze({
  ACTIVE:   'active',
  RESIGNED: 'resigned',
});

const EMP_STATUS_LABEL = Object.freeze({
  [EMP_STATUS.ACTIVE]:   '재직',
  [EMP_STATUS.RESIGNED]: '퇴직',
});

// 한글 레거시 → 영문 정규값 매핑
const EMP_STATUS_LEGACY_MAP = {
  '재직':   EMP_STATUS.ACTIVE,
  '퇴직':   EMP_STATUS.RESIGNED,
};

const EMP_ACTIVE_STATUSES = Object.freeze([EMP_STATUS.ACTIVE]);

// ═══════════════════════════════════════════
// 인원 구분 (employees.personnel_type)
// ═══════════════════════════════════════════
const PERSONNEL_TYPE = Object.freeze({
  EMPLOYEE:       'employee',        // 일반 직원
  REPRESENTATIVE: 'representative',  // 대표자 본인
  EXECUTIVE:      'executive',       // 등기임원
  RELATED:        'related',         // 특수관계인
});

const PERSONNEL_TYPE_LABEL = Object.freeze({
  [PERSONNEL_TYPE.EMPLOYEE]:       '직원',
  [PERSONNEL_TYPE.REPRESENTATIVE]: '대표자 본인',
  [PERSONNEL_TYPE.EXECUTIVE]:      '등기임원',
  [PERSONNEL_TYPE.RELATED]:        '특수관계인',
});

/** 인원 유형 표시 헬퍼 (영문 코드 → 한글) */
function personnelTypeLabel(val) {
  return PERSONNEL_TYPE_LABEL[val] || val || '-';
}

/** 직원 객체의 인원 유형 도출 (personnel_type 우선, 레거시 is_representative 보정) */
function personnelTypeOf(emp) {
  if (!emp) return PERSONNEL_TYPE.EMPLOYEE;
  const t = emp.personnel_type;
  if (t && t !== 'employee') return t;
  return emp.is_representative ? PERSONNEL_TYPE.REPRESENTATIVE : PERSONNEL_TYPE.EMPLOYEE;
}

// ═══════════════════════════════════════════
// 계약 상태 (contracts.status)
// ═══════════════════════════════════════════
const CONTRACT_STATUS = Object.freeze({
  ACTIVE:            'active',
  EXPIRED:           'expired',
  TERMINATED:        'terminated',
  VOIDED:            'voided',
  PENDING:           'pending',
  RENEWAL_PENDING:   'renewal_pending',
  TERMINATE_PENDING: 'terminate_pending',
  DOCS_INCOMPLETE:   'docs_incomplete',
  RENEWED:           'renewed',
});

const CONTRACT_STATUS_LABEL = Object.freeze({
  [CONTRACT_STATUS.ACTIVE]:            '활성',
  [CONTRACT_STATUS.EXPIRED]:           '만료',
  [CONTRACT_STATUS.TERMINATED]:        '해지',
  [CONTRACT_STATUS.VOIDED]:            '파기',
  [CONTRACT_STATUS.PENDING]:           '계약예정',
  [CONTRACT_STATUS.RENEWAL_PENDING]:   '갱신예정',
  [CONTRACT_STATUS.TERMINATE_PENDING]: '해지예정',
  [CONTRACT_STATUS.DOCS_INCOMPLETE]:   '서류미비',
  [CONTRACT_STATUS.RENEWED]:           '갱신됨',
});

const CONTRACT_STATUS_LEGACY_MAP = {
  '활성':     CONTRACT_STATUS.ACTIVE,
  '유효':     CONTRACT_STATUS.ACTIVE,
  '만료':     CONTRACT_STATUS.EXPIRED,
  '해지':     CONTRACT_STATUS.TERMINATED,
  '파기':     CONTRACT_STATUS.VOIDED,
  '계약예정': CONTRACT_STATUS.PENDING,
  '갱신예정': CONTRACT_STATUS.RENEWAL_PENDING,
  '해지예정': CONTRACT_STATUS.TERMINATE_PENDING,
  '서류미비': CONTRACT_STATUS.DOCS_INCOMPLETE,
  '갱신됨':   CONTRACT_STATUS.RENEWED,
};

const CONTRACT_ACTIVE_STATUSES = Object.freeze([
  CONTRACT_STATUS.ACTIVE,
  CONTRACT_STATUS.DOCS_INCOMPLETE,
]);

const CONTRACT_TERMINAL_STATUSES = Object.freeze([
  CONTRACT_STATUS.TERMINATED,
  CONTRACT_STATUS.EXPIRED,
  CONTRACT_STATUS.VOIDED,
]);

// ═══════════════════════════════════════════
// 계약 유형 / 고용형태
// ═══════════════════════════════════════════
const CONTRACT_TYPE = Object.freeze({
  REGULAR:           'regular',
  REGULAR_PROBATION: 'regular_probation',
  FIXED:             'fixed_term',
  FIXED_PROBATION:   'fixed_term_probation',
  DAILY:             'daily',
  EXECUTIVE:         'executive',
  RELATED_PARTY:     'related_party',
  REPRESENTATIVE:    'representative',
});

const CONTRACT_TYPE_LABEL = Object.freeze({
  [CONTRACT_TYPE.REGULAR]:           '정규직',
  [CONTRACT_TYPE.REGULAR_PROBATION]: '정규직 수습',
  [CONTRACT_TYPE.FIXED]:             '계약직',
  [CONTRACT_TYPE.FIXED_PROBATION]:   '계약직 수습',
  [CONTRACT_TYPE.DAILY]:             '일용직',
  [CONTRACT_TYPE.EXECUTIVE]:         '등기임원',
  [CONTRACT_TYPE.RELATED_PARTY]:     '특수관계인',
  [CONTRACT_TYPE.REPRESENTATIVE]:    '대표자',
});

// 한글 레거시 → 영문 정규값
const CONTRACT_TYPE_LEGACY_MAP = {
  '정규직':      CONTRACT_TYPE.REGULAR,
  '정규직 수습': CONTRACT_TYPE.REGULAR_PROBATION,
  '계약직':      CONTRACT_TYPE.FIXED,
  '계약직 수습': CONTRACT_TYPE.FIXED_PROBATION,
  '일용직':      CONTRACT_TYPE.DAILY,
  '등기임원':    CONTRACT_TYPE.EXECUTIVE,
  '특수관계인':  CONTRACT_TYPE.RELATED_PARTY,
  '대표자':      CONTRACT_TYPE.REPRESENTATIVE,
};

const CAT_BADGE_CLS = Object.freeze({
  [CONTRACT_TYPE.REGULAR]:           'badge-blue',
  [CONTRACT_TYPE.REGULAR_PROBATION]: 'badge-cyan',
  [CONTRACT_TYPE.FIXED]:             'badge-purple',
  [CONTRACT_TYPE.FIXED_PROBATION]:   'badge-pink',
  [CONTRACT_TYPE.DAILY]:             'badge-orange',
  [CONTRACT_TYPE.EXECUTIVE]:         'badge-slate',
  [CONTRACT_TYPE.RELATED_PARTY]:     'badge-gray',
  [CONTRACT_TYPE.REPRESENTATIVE]:    'badge-gray',
});

const CONTRACT_PROBATION_TYPES = Object.freeze([
  CONTRACT_TYPE.REGULAR_PROBATION,
  CONTRACT_TYPE.FIXED_PROBATION,
]);

const CONTRACT_FIXED_TERM_TYPES = Object.freeze([
  CONTRACT_TYPE.FIXED,
  CONTRACT_TYPE.FIXED_PROBATION,
  CONTRACT_TYPE.DAILY,
]);

// ═══════════════════════════════════════════
// 고객사 상태 (companies.status)
// ═══════════════════════════════════════════
const COMPANY_STATUS = Object.freeze({
  ACTIVE:   'active',
  INACTIVE: 'inactive',
  DRAFT:    'draft',
});

const COMPANY_STATUS_LABEL = Object.freeze({
  [COMPANY_STATUS.ACTIVE]:   '이용중',
  [COMPANY_STATUS.INACTIVE]: '해지',
  [COMPANY_STATUS.DRAFT]:    '임시저장',
});

const COMPANY_STATUS_LEGACY_MAP = {
  '이용중':   COMPANY_STATUS.ACTIVE,
  '해지':     COMPANY_STATUS.INACTIVE,
  '임시저장': COMPANY_STATUS.DRAFT,
};

// ═══════════════════════════════════════════
// 납부 상태 (billing.payment_status)
// ═══════════════════════════════════════════
const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PARTIAL: 'partial',
  UNPAID:  'unpaid',
  PAID:    'paid',
  BILLING_TARGET: 'billing_target', // 가상 청구대상 (DB 저장 전)
});

const PAYMENT_STATUS_LABEL = Object.freeze({
  [PAYMENT_STATUS.PENDING]: '납부대기',
  [PAYMENT_STATUS.PARTIAL]: '일부납',
  [PAYMENT_STATUS.UNPAID]:  '미납',
  [PAYMENT_STATUS.PAID]:    '완납',
  [PAYMENT_STATUS.BILLING_TARGET]: '청구대상',
});

const PAYMENT_STATUS_LEGACY_MAP = {
  '납부대기': PAYMENT_STATUS.PENDING,
  '일부납':   PAYMENT_STATUS.PARTIAL,
  '미납':     PAYMENT_STATUS.UNPAID,
  '완납':     PAYMENT_STATUS.PAID,
  '청구대상': PAYMENT_STATUS.BILLING_TARGET,
};

// ═══════════════════════════════════════════
// 발송 방식
// ═══════════════════════════════════════════
const DISPATCH_METHOD = Object.freeze({
  KAKAO:   'kakao',
  EMAIL:   'email',
  MANUAL:  'manual',
  PHONE:   'phone',
  REISSUE: 'reissue',
});

const DISPATCH_METHOD_LABEL = Object.freeze({
  [DISPATCH_METHOD.KAKAO]:   '알림톡',
  [DISPATCH_METHOD.EMAIL]:   '이메일',
  [DISPATCH_METHOD.MANUAL]:  '수동교부',
  [DISPATCH_METHOD.PHONE]:   '유선직접안내',
  [DISPATCH_METHOD.REISSUE]: '수정재발행',
});

// ═══════════════════════════════════════════
// 발송 상태
// ═══════════════════════════════════════════
const DISPATCH_STATUS = Object.freeze({
  COMPLETED: 'completed',
  FAILED:    'failed',
  PENDING:   'pending',
});

const DISPATCH_STATUS_LABEL = Object.freeze({
  [DISPATCH_STATUS.COMPLETED]: '완료',
  [DISPATCH_STATUS.FAILED]:    '실패',
  [DISPATCH_STATUS.PENDING]:   '대기',
});

// ═══════════════════════════════════════════
// 알림 유형 (company_notices.notice_type)
// ═══════════════════════════════════════════
const NOTICE_TYPE = Object.freeze({
  GENERAL:                'general',
  CONTRACT_DISPATCHED:    'contract_dispatched',
  CONTRACT_EXPIRY:        'contract_expiry',
  CONTRACT_VOIDED:        'contract_voided',
  CONTRACT_AMENDED:       'contract_amended',
  PAYROLL_INPUT_COMPLETE: 'payroll_input_complete',
  PAYSLIP_SENT:           'payslip_dispatched',
  REGULAR_CONVERSION:     'regular_conversion',
  LEAVE_PROMOTION:        'leave_promotion',
  SIGNED_UPLOADED:        'contract_signed_uploaded',
});

// ═══════════════════════════════════════════
// 수당 항목 유형 (payroll_items.item_type)
// payrolls 정규화 — 28종 수당을 payroll_items로 분리
// ═══════════════════════════════════════════
const ALLOWANCE_TYPES = Object.freeze([
  { type: 'weekly_holiday',   label: '주휴수당',           hasPayType: false, sortOrder: 0 },
  { type: 'position',         label: '직책수당',           hasPayType: false, sortOrder: 1 },
  { type: 'skill',            label: '기술수당',           hasPayType: false, sortOrder: 2 },
  { type: 'license',          label: '면허수당',           hasPayType: false, sortOrder: 3 },
  { type: 'overtime',         label: '연장근로수당',       hasPayType: false, sortOrder: 4 },
  { type: 'night',            label: '야간근로수당',       hasPayType: false, sortOrder: 5 },
  { type: 'holiday',          label: '휴일근로수당',       hasPayType: false, sortOrder: 6 },
  { type: 'transportation',   label: '교통비',             hasPayType: true,  sortOrder: 7 },
  { type: 'self_driving',     label: '자가운전보조금',     hasPayType: true,  sortOrder: 8 },
  { type: 'meal',             label: '식대',               hasPayType: true,  sortOrder: 9 },
  { type: 'childcare',        label: '보육수당',           hasPayType: true,  sortOrder: 10 },
  { type: 'research',         label: '연구수당',           hasPayType: true,  sortOrder: 11 },
  { type: 'communication',    label: '통신비',             hasPayType: true,  sortOrder: 12 },
  { type: 'fitness',          label: '건강유지비',         hasPayType: true,  sortOrder: 13 },
  { type: 'self_dev',         label: '자기계발비',         hasPayType: true,  sortOrder: 14 },
  { type: 'book',             label: '도서구입비',         hasPayType: true,  sortOrder: 15 },
  { type: 'overseas',         label: '해외근무수당',       hasPayType: true,  sortOrder: 16 },
  { type: 'contract_etc',     label: '계약기타수당',       hasPayType: false, sortOrder: 17 },
  { type: 'annual_leave',     label: '연차수당',           hasPayType: false, sortOrder: 18 },
  { type: 'bonus',            label: '상여금',             hasPayType: false, sortOrder: 19 },
  { type: 'performance',      label: '성과급',             hasPayType: false, sortOrder: 20 },
  { type: 'actual_expense',   label: '실비변상',           hasPayType: false, sortOrder: 21 },
  { type: 'comm_expense',     label: '통신비(실비)',       hasPayType: false, sortOrder: 22 },
  { type: 'etc',              label: '기타수당',           hasPayType: true,  sortOrder: 23 },
  { type: 'site',             label: '현장수당',           hasPayType: false, sortOrder: 24 },
  { type: 'remote_area',      label: '오지근무수당',       hasPayType: false, sortOrder: 25 },
  { type: 'regular_bonus',    label: '정기상여금',         hasPayType: false, sortOrder: 26 },
  { type: 'hazard',           label: '위험수당',           hasPayType: false, sortOrder: 27 },
]);

// ═══════════════════════════════════════════
// 4대보험 유형
// ═══════════════════════════════════════════
const INSURANCE_TYPE = Object.freeze({
  NATIONAL_PENSION: 'national_pension',
  HEALTH:           'health',
  LONG_TERM_CARE:   'long_term_care',
  EMPLOYMENT:       'employment',
});

// ═══════════════════════════════════════════
// 페이지 식별자
// ═══════════════════════════════════════════
const PAGE = Object.freeze({
  DASHBOARD:              'dashboard',
  COMPANIES:              'companies',
  CONTRACTS:              'contracts',
  PAYROLLS:               'payrolls',
  PAYROLL_INPUT:          'payroll-input',
  PAYSLIP_SEND:           'payslip-send',
  WAGE_LEDGER:            'wage-ledger',
  LABOR_STATUS:           'labor-status',
  SEVERANCE:              'severance',
  STANDARDS:              'standards',
  ADMIN_ACCOUNTS:         'admin-accounts',
  BILLING:                'billing',
  CONTRACT_DISPATCH:      'contract-dispatch',
  CONTRACT_EXPIRY_NOTICE: 'contract-expiry-notice',
  REGULAR_CONVERSION:     'regular-conversion',
  PROBATION_MGMT:         'probation-mgmt',
  ANNUAL_LEAVE:           'annual-leave',
  LEAVE_PROMOTION:        'leave-promotion',
  COMPANY_NOTICE_LOG:     'company-notice-log',
  GENERAL_NOTICE:         'general-notice',
});

// ═══════════════════════════════════════════
// 매직 넘버
// ═══════════════════════════════════════════
const MAGIC = Object.freeze({
  MONTHLY_STD_HOURS:         209,
  DEFAULT_ANNUAL_LEAVE_DAYS: 15,
  DEFAULT_PROBATION_MONTHS:  3,
  D7_URGENT_THRESHOLD:       7,
  D29_NOTICE_THRESHOLD:      29,
  D30_NOTICE_THRESHOLD:      30,
  D45_PROBATION_NOTICE:      45,
  AMOUNT_PER_EMPLOYEE:       20000,
  DEFAULT_DEPENDENTS:        1,
  ITEMS_PER_PAGE:            10,
  LOCAL_TAX_RATE:            0.1,
  MIN_WAGE_PCT_100:          1.0,
  MIN_WAGE_PCT_90:           0.9,
  OT_RATE_OVERTIME:          1.5,
  OT_RATE_NIGHT:             0.5,
  OT_RATE_HOLIDAY:           0.5,
});

// ═══════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════

/** 한글 레거시 → 영문 정규값 변환 */
function normalizeEmpStatus(val) {
  if (!val) return val;
  return EMP_STATUS_LEGACY_MAP[val] || val;
}
function normalizeContractStatus(val) {
  if (!val) return val;
  return CONTRACT_STATUS_LEGACY_MAP[val] || val;
}
function normalizeContractType(val) {
  if (!val) return val;
  // legacy alias: 'fixed_probation' → 'fixed_term_probation', 'regular_probation' → 'regular_probation' (unchanged)
  if (val==='fixed_probation') return CONTRACT_TYPE.FIXED_PROBATION;
  return CONTRACT_TYPE_LEGACY_MAP[val] || val;
}
function normalizeCompanyStatus(val) {
  if (!val) return val;
  return COMPANY_STATUS_LEGACY_MAP[val] || val;
}

/** 상태 체크 */
function isEmpActive(status) {
  return EMP_ACTIVE_STATUSES.includes(normalizeEmpStatus(status));
}
function isContractActive(status) {
  return CONTRACT_ACTIVE_STATUSES.includes(normalizeContractStatus(status));
}
function isContractTerminal(status) {
  return CONTRACT_TERMINAL_STATUSES.includes(normalizeContractStatus(status));
}
function isProbationType(contractType) {
  return CONTRACT_PROBATION_TYPES.includes(normalizeContractType(contractType));
}

/** 수습 기능 OFF 시 probation 타입을 필터링한 고용형태 옵션 배열 반환 */
function getAvailableContractTypes() {
  const all = [
    { value: CONTRACT_TYPE.REGULAR,           label: CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR] },
    { value: CONTRACT_TYPE.REGULAR_PROBATION, label: CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR_PROBATION] },
    { value: CONTRACT_TYPE.FIXED,             label: CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED] },
    { value: CONTRACT_TYPE.FIXED_PROBATION,   label: CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED_PROBATION] },
    { value: CONTRACT_TYPE.DAILY,             label: CONTRACT_TYPE_LABEL[CONTRACT_TYPE.DAILY] },
  ];
  if (window._probationFeatureEnabled) return all;
  return all.filter(t => !isProbationType(t.value));
}
function isFixedTermType(contractType) {
  return CONTRACT_FIXED_TERM_TYPES.includes(normalizeContractType(contractType));
}

/** 영문값 → 한글 라벨 (UI 표시용) */
function empStatusLabel(val) {
  return EMP_STATUS_LABEL[normalizeEmpStatus(val)] || val || '-';
}
function contractStatusLabel(val) {
  return CONTRACT_STATUS_LABEL[normalizeContractStatus(val)] || val || '-';
}
function contractTypeLabel(val) {
  return CONTRACT_TYPE_LABEL[normalizeContractType(val)] || val || '-';
}
function companyStatusLabel(val) {
  return COMPANY_STATUS_LABEL[normalizeCompanyStatus(val)] || val || '-';
}
function paymentStatusLabel(val) {
  return PAYMENT_STATUS_LABEL[val] || val || '-';
}

// ═══════════════════════════════════════════
// 한국 법정 공휴일 유틸리티
// 「관공서의 공휴일에 관한 규정」기준
// 대체공휴일: 2021년 개정 — 설·추석 연휴, 3·1절, 광복절, 개천절, 한글날, 어린이날
// ═══════════════════════════════════════════

/**
 * 음력→양력 변환 없이 고정 양력 공휴일 + 설·추석(양력 미리 계산된 테이블) 반환
 * @param {number} year
 * @returns {Set<string>}  'YYYY-MM-DD' 문자열 Set
 */
function getKoreanHolidays(year) {
  // ── 고정 공휴일 (양력) ──
  const fixed = [
    `${year}-01-01`, // 신정
    `${year}-03-01`, // 삼일절
    `${year}-05-01`, // 근로자의 날 (공휴일 아님 — 유급휴일, 별도 처리)
    `${year}-05-05`, // 어린이날
    `${year}-06-06`, // 현충일
    `${year}-08-15`, // 광복절
    `${year}-10-03`, // 개천절
    `${year}-10-09`, // 한글날
    `${year}-12-25`, // 성탄절
  ];
  if(year >= 2026) fixed.push(`${year}-07-17`); // 제헌절 (2026년부터 공휴일)

  // ── 음력 기반 공휴일 양력 변환 테이블 (2020~2035) ──
  // 설날 전날·당일·다음날 / 부처님오신날 / 추석 전날·당일·다음날
  const LUNAR_TABLE = {
    2020: { seol:['01-24','01-25','01-26'], buddha:'04-30', chuseok:['09-30','10-01','10-02'] },
    2021: { seol:['02-11','02-12','02-13'], buddha:'05-19', chuseok:['09-20','09-21','09-22'] },
    2022: { seol:['01-31','02-01','02-02'], buddha:'05-08', chuseok:['09-09','09-10','09-11'] },
    2023: { seol:['01-21','01-22','01-23'], buddha:'05-27', chuseok:['09-28','09-29','09-30'] },
    2024: { seol:['02-09','02-10','02-11'], buddha:'05-15', chuseok:['09-16','09-17','09-18'] },
    2025: { seol:['01-28','01-29','01-30'], buddha:'05-05', chuseok:['10-05','10-06','10-07'] },
    2026: { seol:['02-16','02-17','02-18'], buddha:'05-24', chuseok:['09-24','09-25','09-26'] },
    2027: { seol:['02-05','02-06','02-07'], buddha:'05-13', chuseok:['09-14','09-15','09-16'] },
    2028: { seol:['01-25','01-26','01-27'], buddha:'05-02', chuseok:['10-02','10-03','10-04'] },
    2029: { seol:['02-12','02-13','02-14'], buddha:'05-20', chuseok:['09-21','09-22','09-23'] },
    2030: { seol:['02-02','02-03','02-04'], buddha:'05-09', chuseok:['09-11','09-12','09-13'] },
    2031: { seol:['01-22','01-23','01-24'], buddha:'04-28', chuseok:['09-30','10-01','10-02'] },
    2032: { seol:['02-10','02-11','02-12'], buddha:'05-16', chuseok:['09-18','09-19','09-20'] },
    2033: { seol:['01-30','01-31','02-01'], buddha:'05-06', chuseok:['10-07','10-08','10-09'] },
    2034: { seol:['02-18','02-19','02-20'], buddha:'05-25', chuseok:['09-27','09-28','09-29'] },
    2035: { seol:['02-07','02-08','02-09'], buddha:'05-15', chuseok:['09-16','09-17','09-18'] },
  };

  const holidays = new Set(fixed);

  const lunar = LUNAR_TABLE[year];
  if (lunar) {
    lunar.seol.forEach(d => holidays.add(`${year}-${d}`));
    holidays.add(`${year}-${lunar.buddha}`);
    lunar.chuseok.forEach(d => holidays.add(`${year}-${d}`));
  }

  // ── 대체공휴일 (법령 기준 명시 테이블) ──
  // 대상: 설·추석 연휴(토·일 포함 또는 다른 공휴일 겹침), 어린이날, 3·1절, 광복절, 개천절, 한글날이 토·일과 겹치는 경우
  // (신정·현충일·석가탄신일·성탄절·근로자의날·제헌절은 대체공휴일 없음)
  const SUBSTITUTE_TABLE = {
    2020: ['01-27'],
    2021: ['02-15', '08-16', '10-04', '10-11'],
    2022: ['09-12', '10-10'],
    2023: ['01-24', '10-02'],
    2024: ['02-12', '05-06'],
    2025: ['03-03', '10-08'],
    2026: ['03-02', '08-17', '09-28', '10-05'],
    2027: ['02-08', '08-16', '10-04', '10-11'],
    2028: ['10-05'],
    2029: ['05-07', '09-24'],
    2030: ['02-05', '05-06'],
    2031: ['03-03'],
    2032: ['08-16', '09-21', '10-04', '10-11'],
    2033: ['02-02', '10-10'],
    2034: ['02-21'],
    2035: ['05-07', '09-19'],
  };
  (SUBSTITUTE_TABLE[year] || []).forEach(d => holidays.add(`${year}-${d}`));

  return holidays;
}

/**
 * 특정 연·월의 법정 공휴일+주말 제외 소정근로일수 반환 (주 5일제 기준)
 * 근로자의 날(5/1)도 유급휴일로 포함
 * @param {number} year
 * @param {number} month  1~12
 * @returns {number}
 */
function calcMonthWorkDays(year, month) {
  const holidays = getKoreanHolidays(year);
  // 근로자의 날 추가 (관공서 공휴일 규정 외 별도 유급휴일)
  holidays.add(`${year}-05-01`);

  let count = 0;
  const cur = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
    if (dow !== 0 && dow !== 6 && !holidays.has(dateStr)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ═══════════════════════════════════════════
// 페이지 라벨 (메뉴명 = 페이지 제목 공통)
// 수정 시 이곳만 변경하면 메뉴·페이지 제목에 동시 반영됨
// ═══════════════════════════════════════════
const PAGE_LABELS = Object.freeze({
  dashboard:              '대시보드',
  companies:              '고객사 관리',
  employees:              '인사관리대장',
  'company-notice-log':   '고객사앱 알림 이력',
  'general-notice':       '중요공지 관리',
  billing:                '시스템 사용료 관리',
  contracts:              '근로계약 현황',
  'contract-dispatch':    '근로계약서 발송',
  'consent-dispatch':     '정보제공동의서 관리',
  'contract-expiry-notice':'계약만료 통지 이력',
  'regular-conversion':   '정규직전환 고지 이력',
  'probation-mgmt':       '수습 근로자 관리',
  payrolls:               '급여 명세서 조회',
  'payroll-input':        '급여 입력',
  'labor-status':         '급여 통계 조회',
  'payslip-send':         '급여 명세서 발송',
  'admin-accounts':       '관리자 계정 관리',
  'wage-ledger':          '임금대장',
  standards:              '년도별 산정기준',
  severance:              '퇴직급여 관리',
  'annual-leave':         '연차 관리대장',
  'leave-promotion':      '연차사용촉진 발송',
  'retirement-mgmt':      '퇴직 관리',
  'attendance-ledger':    '근태 관리대장',
  'system-settings':      '시스템 설정',
});

/** 성별 표시 헬퍼 (emp 객체 또는 gender 문자열) */
function genderLabel(empOrGender) {
  if (!empOrGender) return '-';
  const g = typeof empOrGender === 'string' ? empOrGender : (empOrGender.gender || '');
  if (g === 'female') return '여';
  if (g === 'male')   return '남';
  return '-';
}

// ═══════════════════════════════════════════
// 예정 사항 발생사유
// ═══════════════════════════════════════════
const SCHEDULED_REASON = Object.freeze({
  NEW_HIRE:         'new_hire',          // 신규입사
  RE_HIRE:          're_hire',           // 재입사
  CONTRACT_RENEWAL: 'contract_renewal',  // 계약갱신
  PROBATION_END:    'probation_end',     // 수습만료
  DISMISSAL:        'dismissal',         // 해고
  EXPIRY:           'expiry_scheduled',  // 만료
  RESIGNATION:      'resignation',       // 사직
});

const SCHEDULED_REASON_LABEL = Object.freeze({
  [SCHEDULED_REASON.NEW_HIRE]:         '신규입사',
  [SCHEDULED_REASON.RE_HIRE]:          '재입사',
  [SCHEDULED_REASON.CONTRACT_RENEWAL]: '계약갱신',
  [SCHEDULED_REASON.PROBATION_END]:    '수습만료',
  [SCHEDULED_REASON.DISMISSAL]:        '해고',
  [SCHEDULED_REASON.EXPIRY]:           '만료',
  [SCHEDULED_REASON.RESIGNATION]:      '사직',
});

// 계약 종료 사유 (contracts.close_reason → 표시 라벨)
const CLOSE_REASON_LABEL = Object.freeze({
  resignation: '사직',
  dismissal  : '해고',
  expiry     : '만료',
  renewal    : '계약갱신',
  void       : '파기',
});

// ═══════════════════════════════════════════
// 수습 고용형태 옵션 필터 (수습근로자 관리 ON/OFF 연동)
// OFF 시 정규직 수습·계약직 수습 옵션을 셀렉트에서 제거, ON 시 원위치 복원
// ═══════════════════════════════════════════
const _PROBATION_OPTION_SELECT_IDS = [
  'ct-new-category',      // 신규계약 — 고용형태
  'ct-edit-em-category',  // 계약 수정·재계약 — 고용형태
  'hr-em-category',       // 인사관리 직원 등록 — 고용형태
  'cont-filter-empcat',   // 근로계약 현황 — 고용형태 필터
  'hr-filter-category',   // 인사관리대장 — 고용형태 필터
];
const _PROBATION_OPTION_DEFS = [
  { value: CONTRACT_TYPE.REGULAR_PROBATION, label: CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR_PROBATION], after: CONTRACT_TYPE.REGULAR },
  { value: CONTRACT_TYPE.FIXED_PROBATION,   label: CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED_PROBATION],   after: CONTRACT_TYPE.FIXED },
];

/**
 * 수습 고용형태(정규직 수습·계약직 수습) 옵션 표시/제거
 * window._probationFeatureEnabled === true 일 때만 옵션 존재
 * @param {HTMLElement|Document} [rootEl] — 특정 컨테이너(외부 페이지 삽입 시) 또는 document
 */
function applyProbationOptionFilter(rootEl = document) {
  const show = window._probationFeatureEnabled === true;
  _PROBATION_OPTION_SELECT_IDS.forEach(id => {
    const sel = (rootEl === document || !rootEl)
      ? document.getElementById(id)
      : (rootEl.querySelector ? rootEl.querySelector('#' + id) : null);
    if (!sel) return;
    _PROBATION_OPTION_DEFS.forEach(def => {
      const existing = sel.querySelector(`option[value="${def.value}"]`);
      if (show) {
        if (!existing) {
          const anchor = sel.querySelector(`option[value="${def.after}"]`);
          const opt = document.createElement('option');
          opt.value = def.value;
          opt.textContent = def.label;
          if (anchor) anchor.insertAdjacentElement('afterend', opt);
          else sel.appendChild(opt);
        }
      } else {
        if (existing) existing.remove();
      }
    });
  });
}

// ═══════════════════════════════════════════
// 사번 원장 헬퍼 (employee_number_ledger — 부여·파기 이력, 재사용 방지)
// 정책: 사번은 숫자만 / 부여는 max+1(append-only) / 중간 공백·재입사·계약취소 시 파기
// ═══════════════════════════════════════════
let allEmpNoLedger = []; // admin-state loadEmployeeNumberLedger()에서 채움

function _elnForCompany(companyId){
  return (allEmpNoLedger || []).filter(r => r && r.company_id === companyId);
}
/** 해당 회사 숫자 사번 최대값 (used/voided 모두 포함) */
function _elnMaxNum(companyId){
  let m = 0;
  for (const r of _elnForCompany(companyId)) {
    if (/^\d+$/.test(String(r.employee_number || ''))) {
      const n = parseInt(r.employee_number, 10);
      if (n > m) m = n;
    }
  }
  return m;
}
/** 해당 회사 사번 자릿수 (숫자 사번 중 최대 길이, 최소 4) */
function _elnWidth(companyId){
  let w = 4;
  for (const r of _elnForCompany(companyId)) {
    if (/^\d+$/.test(String(r.employee_number || ''))) {
      const l = String(r.employee_number).length;
      if (l > w) w = l;
    }
  }
  return w;
}
/** 다음 사번 (append-only = max + 1), 회사 자릿수에 맞춰 0 패딩 */
function _suggestEmpNo(companyId){
  const next = _elnMaxNum(companyId) + 1;
  return String(next).padStart(_elnWidth(companyId), '0');
}
/** 표준형: 숫자 사번 → 앞0 제거한 순수 숫자 문자열 (비숫자는 원문) */
function _elnNorm(empNo){
  if (empNo === null || empNo === undefined || empNo === '') return '';
  const s = String(empNo).trim();
  return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s;
}
/** 사번 원장에 used(부여) 기록 */
async function _elnAssign(companyId, empNo, empId, sourceType){
  const n = _elnNorm(empNo);
  if (!companyId || !n) return;
  try {
    if ((allEmpNoLedger || []).some(r => r.company_id === companyId && r.employee_number === n && r.status === 'used')) return;
    await api('../tables/employee_number_ledger', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId, employee_number: n, employee_id: empId || null,
        source_type: sourceType || 'employee', status: 'used',
        assigned_at: Date.now(), created_at: Date.now()
      })
    });
    allEmpNoLedger.push({ id: null, company_id: companyId, employee_number: n, employee_id: empId || null, source_type: sourceType || 'employee', status: 'used', assigned_at: Date.now() });
  } catch(e){ console.warn('[사번 부여 기록 실패]', e); }
}
/** 사번 원장에 voided(파기) 기록 — 부여 이력(employee_id/assigned_at)은 유지 */
async function _elnVoid(companyId, empNo, reason){
  const n = _elnNorm(empNo);
  if (!companyId || !n) return;
  try {
    const existing = (allEmpNoLedger || []).find(r => r.company_id === companyId && r.employee_number === n && r.status === 'used');
    if (!existing) return; // 이미 파기 또는 미기록 — 미기록이면 파기 행 생성(이력 없음)
    const id = existing.id || null;
    if (id) {
      await api('../tables/employee_number_ledger/' + id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'voided', voided_reason: reason || 'released', voided_at: Date.now() })
      });
    } else {
      await api('../tables/employee_number_ledger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId, employee_number: n, employee_id: existing.employee_id || null,
          source_type: existing.source_type || 'employee', status: 'voided',
          voided_reason: reason || 'released', assigned_at: existing.assigned_at || null,
          voided_at: Date.now(), created_at: Date.now()
        })
      });
    }
    existing.status = 'voided';
    existing.voided_reason = reason || 'released';
    existing.voided_at = Date.now();
  } catch(e){ console.warn('[사번 파기 기록 실패]', e); }
}
/** 사번 변경 동기화: 새 번호 부여 + 이전 번호 파기 (재입사) */
async function _elnSyncEmpNoChange(companyId, empId, oldNo, newNo, sourceType){
  const oldN = _elnNorm(oldNo);
  const newN = _elnNorm(newNo);
  if (newN && newN !== oldN) {
    if (oldN) await _elnVoid(companyId, oldN, 'rehire');
    await _elnAssign(companyId, newN, empId, sourceType || 'employee');
  } else if (newN) {
    await _elnAssign(companyId, newN, empId, sourceType || 'employee');
  } else if (oldN) {
    await _elnVoid(companyId, oldN, 'released');
  }
}
/** 계약취소(파기)로 부여된 사번 파기 — 부여 이력(employee_id/assigned_at) 유지 */
async function _elnVoidEmpNoForCancel(companyId, empId){
  if(!companyId || !empId) return;
  const emp = (typeof allEmployees !== 'undefined' && Array.isArray(allEmployees))
    ? allEmployees.find(x => x.id === empId) : null;
  const no = emp ? emp.employee_number : '';
  if(!no) return;
  await _elnVoid(companyId, no, 'contract_canceled');
}
/** 사번 재사용 가능 여부 판정 (C11) — 원장 기준
 *  - voided(파기) 번호는 본인 포함 재사용 불가
 *  - used 번호는 본인(selfEmpId) 외 재사용 불가
 *  @returns {{ blocked:boolean, reason:string }}
 */
function _elnReuseInfo(companyId, empNo, selfEmpId){
  const n = _elnNorm(empNo);
  if (!companyId || !n) return { blocked: false, reason: '' };
  const rows = (allEmpNoLedger || []).filter(r => r.company_id === companyId && r.employee_number === n);
  if (!rows.length) return { blocked: false, reason: '' };
  if (rows.some(r => r.status === 'voided')) {
    return { blocked: true, reason: '이전에 부여되었던 사원번호로 재사용할 수 없습니다. (파기된 번호)' };
  }
  const usedByOther = rows.find(r => r.status === 'used' && r.employee_id && r.employee_id !== selfEmpId);
  if (usedByOther) {
    return { blocked: true, reason: '이미 다른 인원이 사용 중인 사원번호입니다.' };
  }
  return { blocked: false, reason: '' };
}


