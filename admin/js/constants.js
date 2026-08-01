/**
 * constants.js — 인사톡 노무톡 공통 상수
 * 
 * 모든 상태값, 유형 코드, 매직넘버를 중앙 관리합니다.
 * DB 저장값은 영문, UI 표시는 *_LABEL의 한글을 사용합니다.
 * admin-state.js 보다 먼저 로드되어야 합니다.
 * 
 * @version 2.35.0
 */

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
});

const PAYMENT_STATUS_LABEL = Object.freeze({
  [PAYMENT_STATUS.PENDING]: '납부대기',
  [PAYMENT_STATUS.PARTIAL]: '일부납',
  [PAYMENT_STATUS.UNPAID]:  '미납',
  [PAYMENT_STATUS.PAID]:    '완납',
});

const PAYMENT_STATUS_LEGACY_MAP = {
  '납부대기': PAYMENT_STATUS.PENDING,
  '일부납':   PAYMENT_STATUS.PARTIAL,
  '미납':     PAYMENT_STATUS.UNPAID,
  '완납':     PAYMENT_STATUS.PAID,
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
  PAYSLIP_SENT:           'payslip_individual_sent',
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
  DEFAULT_MEAL_ALLOWANCE:    200000,
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
    `${year}-07-17`, // 제헌절
    `${year}-08-15`, // 광복절
    `${year}-10-03`, // 개천절
    `${year}-10-09`, // 한글날
    `${year}-12-25`, // 성탄절
  ];

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
    2027: { seol:['02-06','02-07','02-08'], buddha:'05-13', chuseok:['10-14','10-15','10-16'] },
    2028: { seol:['01-26','01-27','01-28'], buddha:'05-02', chuseok:['10-02','10-03','10-04'] },
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

  // ── 대체공휴일 계산 ──
  // 대상: 설·추석 연휴, 3·1절, 광복절, 개천절, 한글날, 어린이날 (2021년 개정)
  // 규칙: 해당 공휴일이 일요일 → 다음 비공휴일 평일로 대체
  //        설·추석 연휴가 다른 공휴일과 겹치면 → 연휴 다음 비공휴일 평일로 대체
  const substituteTargets = new Set([
    `${year}-03-01`,
    `${year}-05-05`,
    `${year}-08-15`,
    `${year}-10-03`,
    `${year}-10-09`,
  ]);
  if (lunar) {
    lunar.seol.forEach(d => substituteTargets.add(`${year}-${d}`));
    lunar.chuseok.forEach(d => substituteTargets.add(`${year}-${d}`));
  }

  // 설·추석 연휴 겹침 대체: 연휴 내 다른 공휴일과 겹치는 날 수만큼 다음 날 대체
  const _addSubstitute = (baseDate) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    while (holidays.has(_fmt(d)) || d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    holidays.add(_fmt(d));
  };
  const _fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // 일요일에 걸리는 대체공휴일 대상
  substituteTargets.forEach(dateStr => {
    const d = new Date(dateStr);
    if (d.getDay() === 0) _addSubstitute(dateStr); // 일요일 → 다음 평일
  });

  // 토요일 겹침: 설·추석 연휴만 토요일 대체 적용 (2023년부터 토요일 대체 확대 적용)
  if (lunar && year >= 2023) {
    [...lunar.seol, ...lunar.chuseok].forEach(md => {
      const dateStr = `${year}-${md}`;
      const d = new Date(dateStr);
      if (d.getDay() === 6) _addSubstitute(dateStr);
    });
  }

  // 설·추석 연휴 안에서 다른 공휴일과 겹치는 경우 대체 (예: 추석+개천절)
  if (lunar) {
    const lunarClusters = [lunar.seol, lunar.chuseok];
    lunarClusters.forEach(cluster => {
      const dates = cluster.map(md => `${year}-${md}`);
      // 연휴 내 다른 공휴일(설·추석 외)과 겹치는 날 찾기
      dates.forEach(dateStr => {
        const d = new Date(dateStr);
        // 같은 날이 연휴 외 공휴일이기도 한 경우 대체 추가
        const isOtherHoliday = [...holidays].some(h => h === dateStr && !dates.includes(h));
        if (isOtherHoliday) _addSubstitute(dateStr);
      });
    });
  }

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
  if (g === 'female' || g === '여성' || g === '여') return '여';
  if (g === 'male'   || g === '남성' || g === '남') return '남';
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


