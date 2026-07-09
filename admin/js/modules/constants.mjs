/**
 * constants.mjs — 인사톡 노무톡 공통 상수 (ES Module)
 * 
 * constants.js를 ES Module로 변환.
 * 모든 const/function → export const/export function.
 * DB 저장값은 영문, UI 표시는 *_LABEL의 한글을 사용합니다.
 * 
 * @version 2.35.0
 */

// ═══════════════════════════════════════════
// 직원 상태 (employees.status)
// ═══════════════════════════════════════════
export const EMP_STATUS = Object.freeze({
  ACTIVE:   'active',
  RESIGNED: 'resigned',
});

export const EMP_STATUS_LABEL = Object.freeze({
  [EMP_STATUS.ACTIVE]:   '재직',
  [EMP_STATUS.RESIGNED]: '퇴직',
});

export const EMP_STATUS_LEGACY_MAP = {
  '재직':   EMP_STATUS.ACTIVE,
  '퇴직':   EMP_STATUS.RESIGNED,
};

export const EMP_ACTIVE_STATUSES = Object.freeze([EMP_STATUS.ACTIVE]);

// ═══════════════════════════════════════════
// 계약 상태 (contracts.status)
// ═══════════════════════════════════════════
export const CONTRACT_STATUS = Object.freeze({
  ACTIVE:            'active',
  EXPIRED:           'expired',
  TERMINATED:        'terminated',
  VOIDED:            'voided',
  CANCELED:          'canceled',
  PENDING:           'pending',
  RENEWAL_PENDING:   'renewal_pending',
  TERMINATE_PENDING: 'terminate_pending',
  DOCS_INCOMPLETE:   'docs_incomplete',
  RENEWED:           'renewed',
});

export const CONTRACT_STATUS_LABEL = Object.freeze({
  [CONTRACT_STATUS.ACTIVE]:            '활성',
  [CONTRACT_STATUS.EXPIRED]:           '만료',
  [CONTRACT_STATUS.TERMINATED]:        '해지',
  [CONTRACT_STATUS.VOIDED]:            '파기',
  [CONTRACT_STATUS.CANCELED]:          '취소',
  [CONTRACT_STATUS.PENDING]:           '계약예정',
  [CONTRACT_STATUS.RENEWAL_PENDING]:   '갱신예정',
  [CONTRACT_STATUS.TERMINATE_PENDING]: '해지예정',
  [CONTRACT_STATUS.DOCS_INCOMPLETE]:   '서류미비',
  [CONTRACT_STATUS.RENEWED]:           '갱신됨',
});

export const CONTRACT_STATUS_LEGACY_MAP = {
  '활성':     CONTRACT_STATUS.ACTIVE,
  '만료':     CONTRACT_STATUS.EXPIRED,
  '해지':     CONTRACT_STATUS.TERMINATED,
  '파기':     CONTRACT_STATUS.VOIDED,
  '취소':     CONTRACT_STATUS.CANCELED,
  '계약예정': CONTRACT_STATUS.PENDING,
  '갱신예정': CONTRACT_STATUS.RENEWAL_PENDING,
  '해지예정': CONTRACT_STATUS.TERMINATE_PENDING,
  '서류미비': CONTRACT_STATUS.DOCS_INCOMPLETE,
  '갱신됨':   CONTRACT_STATUS.RENEWED,
};

export const CONTRACT_ACTIVE_STATUSES = Object.freeze([
  CONTRACT_STATUS.ACTIVE,
  CONTRACT_STATUS.DOCS_INCOMPLETE,
]);

export const CONTRACT_TERMINAL_STATUSES = Object.freeze([
  CONTRACT_STATUS.TERMINATED,
  CONTRACT_STATUS.EXPIRED,
  CONTRACT_STATUS.VOIDED,
  CONTRACT_STATUS.CANCELED,
]);

// ═══════════════════════════════════════════
// 계약 유형 / 고용형태
// ═══════════════════════════════════════════
export const CONTRACT_TYPE = Object.freeze({
  REGULAR:           'regular',
  REGULAR_PROBATION: 'regular_probation',
  FIXED:             'fixed_term',
  FIXED_PROBATION:   'fixed_term_probation',
  DAILY:             'daily',
  EXECUTIVE:         'executive',
  RELATED_PARTY:     'related_party',
  REPRESENTATIVE:    'representative',
});

export const CONTRACT_TYPE_LABEL = Object.freeze({
  [CONTRACT_TYPE.REGULAR]:           '정규직',
  [CONTRACT_TYPE.REGULAR_PROBATION]: '정규직 수습',
  [CONTRACT_TYPE.FIXED]:             '계약직',
  [CONTRACT_TYPE.FIXED_PROBATION]:   '계약직 수습',
  [CONTRACT_TYPE.DAILY]:             '일용직',
  [CONTRACT_TYPE.EXECUTIVE]:         '등기임원',
  [CONTRACT_TYPE.RELATED_PARTY]:     '특수관계인',
  [CONTRACT_TYPE.REPRESENTATIVE]:    '대표자',
});

export const CONTRACT_TYPE_LEGACY_MAP = {
  '정규직':      CONTRACT_TYPE.REGULAR,
  '정규직 수습': CONTRACT_TYPE.REGULAR_PROBATION,
  '계약직':      CONTRACT_TYPE.FIXED,
  '계약직 수습': CONTRACT_TYPE.FIXED_PROBATION,
  '일용직':      CONTRACT_TYPE.DAILY,
  '등기임원':    CONTRACT_TYPE.EXECUTIVE,
  '특수관계인':  CONTRACT_TYPE.RELATED_PARTY,
  '대표자':      CONTRACT_TYPE.REPRESENTATIVE,
};

export const CAT_BADGE_CLS = Object.freeze({
  [CONTRACT_TYPE.REGULAR]:           'badge-blue',
  [CONTRACT_TYPE.REGULAR_PROBATION]: 'badge-cyan',
  [CONTRACT_TYPE.FIXED]:             'badge-purple',
  [CONTRACT_TYPE.FIXED_PROBATION]:   'badge-pink',
  [CONTRACT_TYPE.DAILY]:             'badge-orange',
  [CONTRACT_TYPE.EXECUTIVE]:         'badge-slate',
  [CONTRACT_TYPE.RELATED_PARTY]:     'badge-gray',
  [CONTRACT_TYPE.REPRESENTATIVE]:    'badge-gray',
});

export const CONTRACT_PROBATION_TYPES = Object.freeze([
  CONTRACT_TYPE.REGULAR_PROBATION,
  CONTRACT_TYPE.FIXED_PROBATION,
]);

export const CONTRACT_FIXED_TERM_TYPES = Object.freeze([
  CONTRACT_TYPE.FIXED,
  CONTRACT_TYPE.FIXED_PROBATION,
  CONTRACT_TYPE.DAILY,
]);

// ═══════════════════════════════════════════
// 고객사 상태 (companies.status)
// ═══════════════════════════════════════════
export const COMPANY_STATUS = Object.freeze({
  ACTIVE:   'active',
  INACTIVE: 'inactive',
  DRAFT:    'draft',
});

export const COMPANY_STATUS_LABEL = Object.freeze({
  [COMPANY_STATUS.ACTIVE]:   '이용중',
  [COMPANY_STATUS.INACTIVE]: '해지',
  [COMPANY_STATUS.DRAFT]:    '임시저장',
});

export const COMPANY_STATUS_LEGACY_MAP = {
  '이용중':   COMPANY_STATUS.ACTIVE,
  '해지':     COMPANY_STATUS.INACTIVE,
  '임시저장': COMPANY_STATUS.DRAFT,
};

// ═══════════════════════════════════════════
// 납부 상태 (billing.payment_status)
// ═══════════════════════════════════════════
export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PARTIAL: 'partial',
  UNPAID:  'unpaid',
  PAID:    'paid',
});

export const PAYMENT_STATUS_LABEL = Object.freeze({
  [PAYMENT_STATUS.PENDING]: '납부대기',
  [PAYMENT_STATUS.PARTIAL]: '일부납',
  [PAYMENT_STATUS.UNPAID]:  '미납',
  [PAYMENT_STATUS.PAID]:    '완납',
});

// ═══════════════════════════════════════════
// 발송 방식
// ═══════════════════════════════════════════
export const DISPATCH_METHOD = Object.freeze({
  KAKAO:  'kakao',
  EMAIL:  'email',
  MANUAL: 'manual',
});

export const DISPATCH_METHOD_LABEL = Object.freeze({
  [DISPATCH_METHOD.KAKAO]:  '알림톡',
  [DISPATCH_METHOD.EMAIL]:  '이메일',
  [DISPATCH_METHOD.MANUAL]: '수동교부',
});

// ═══════════════════════════════════════════
// 발송 상태
// ═══════════════════════════════════════════
export const DISPATCH_STATUS = Object.freeze({
  COMPLETED: 'completed',
  FAILED:    'failed',
  PENDING:   'pending',
});

export const DISPATCH_STATUS_LABEL = Object.freeze({
  [DISPATCH_STATUS.COMPLETED]: '완료',
  [DISPATCH_STATUS.FAILED]:    '실패',
  [DISPATCH_STATUS.PENDING]:   '대기',
});

// ═══════════════════════════════════════════
// 알림 유형 (company_notices.notice_type)
// ═══════════════════════════════════════════
export const NOTICE_TYPE = Object.freeze({
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
// 4대보험 유형
// ═══════════════════════════════════════════
export const INSURANCE_TYPE = Object.freeze({
  NATIONAL_PENSION: 'national_pension',
  HEALTH:           'health',
  LONG_TERM_CARE:   'long_term_care',
  EMPLOYMENT:       'employment',
});

// ═══════════════════════════════════════════
// 페이지 식별자
// ═══════════════════════════════════════════
export const PAGE = Object.freeze({
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
export const MAGIC = Object.freeze({
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
export function normalizeEmpStatus(val) {
  if (!val) return val;
  return EMP_STATUS_LEGACY_MAP[val] || val;
}
export function normalizeContractStatus(val) {
  if (!val) return val;
  return CONTRACT_STATUS_LEGACY_MAP[val] || val;
}
export function normalizeContractType(val) {
  if (!val) return val;
  return CONTRACT_TYPE_LEGACY_MAP[val] || val;
}
export function normalizeCompanyStatus(val) {
  if (!val) return val;
  return COMPANY_STATUS_LEGACY_MAP[val] || val;
}

/** 상태 체크 */
export function isEmpActive(status) {
  return EMP_ACTIVE_STATUSES.includes(normalizeEmpStatus(status));
}
export function isContractActive(status) {
  return CONTRACT_ACTIVE_STATUSES.includes(normalizeContractStatus(status));
}
export function isContractTerminal(status) {
  return CONTRACT_TERMINAL_STATUSES.includes(normalizeContractStatus(status));
}
export function isProbationType(contractType) {
  return CONTRACT_PROBATION_TYPES.includes(normalizeContractType(contractType));
}
export function isFixedTermType(contractType) {
  return CONTRACT_FIXED_TERM_TYPES.includes(normalizeContractType(contractType));
}

/** 영문값 → 한글 라벨 (UI 표시용) */
export function empStatusLabel(val) {
  return EMP_STATUS_LABEL[normalizeEmpStatus(val)] || val || '-';
}
export function contractStatusLabel(val) {
  return CONTRACT_STATUS_LABEL[normalizeContractStatus(val)] || val || '-';
}
export function contractTypeLabel(val) {
  return CONTRACT_TYPE_LABEL[normalizeContractType(val)] || val || '-';
}
export function companyStatusLabel(val) {
  return COMPANY_STATUS_LABEL[normalizeCompanyStatus(val)] || val || '-';
}
export function paymentStatusLabel(val) {
  return PAYMENT_STATUS_LABEL[val] || val || '-';
}

// ═══════════════════════════════════════════
// 한국 법정 공휴일 유틸리티
// ═══════════════════════════════════════════

export function getKoreanHolidays(year) {
  const fixed = [
    `${year}-01-01`, `${year}-03-01`, `${year}-05-01`,
    `${year}-05-05`, `${year}-06-06`, `${year}-08-15`,
    `${year}-10-03`, `${year}-10-09`, `${year}-12-25`,
  ];

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

  const substituteTargets = new Set([
    `${year}-03-01`, `${year}-05-05`, `${year}-08-15`, `${year}-10-03`, `${year}-10-09`,
  ]);
  if (lunar) {
    lunar.seol.forEach(d => substituteTargets.add(`${year}-${d}`));
    lunar.chuseok.forEach(d => substituteTargets.add(`${year}-${d}`));
  }

  const _fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const _addSubstitute = (baseDate) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    while (holidays.has(_fmt(d)) || d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    holidays.add(_fmt(d));
  };

  substituteTargets.forEach(dateStr => {
    const d = new Date(dateStr);
    if (d.getDay() === 0) _addSubstitute(dateStr);
  });

  if (lunar && year >= 2023) {
    [...lunar.seol, ...lunar.chuseok].forEach(md => {
      const dateStr = `${year}-${md}`;
      const d = new Date(dateStr);
      if (d.getDay() === 6) _addSubstitute(dateStr);
    });
  }

  if (lunar) {
    [lunar.seol, lunar.chuseok].forEach(cluster => {
      const dates = cluster.map(md => `${year}-${md}`);
      dates.forEach(dateStr => {
        const isOtherHoliday = [...holidays].some(h => h === dateStr && !dates.includes(h));
        if (isOtherHoliday) _addSubstitute(dateStr);
      });
    });
  }

  return holidays;
}

export function calcMonthWorkDays(year, month) {
  const holidays = getKoreanHolidays(year);
  holidays.add(`${year}-05-01`);

  let count = 0;
  const cur = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    const ds = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
    if (dow !== 0 && dow !== 6 && !holidays.has(ds)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
