/**
 * utils.mjs — 공통 유틸 함수
 * 
 * 여러 모듈에서 공통으로 사용되는 헬퍼 함수.
 * 기존 글로벌 함수들을 import 가능한 형태로 제공합니다.
 */

import { COMPANY_STATUS } from './constants.mjs';
import { normalizeContractStatus } from './constants.mjs';

// ═══════════════════════════════════════════
// 상태 체크
// ═══════════════════════════════════════════

/**
 * 고객사가 이용중인지 확인
 */
export function isCompanyActive(c) {
  if (!c || c.is_draft) return false;
  if (c.status !== COMPANY_STATUS.ACTIVE) return false;
  return true;
}

/**
 * 해당 고객사에 활성 계약이 있는지 확인
 * @param {string} companyId
 * @param {Array} contracts - 계약 목록 (기본값: window.allContracts)
 */
export function hasActiveContract(companyId, contracts) {
  const list = contracts || (typeof window !== 'undefined' ? window.allContracts : []) || [];
  return list.some(ct =>
    ct.company_id === companyId &&
    ct.status === 'active' &&
    !ct.is_draft
  );
}

// ═══════════════════════════════════════════
// 날짜·문자열 포맷
// ═══════════════════════════════════════════

/** 오늘 날짜 문자열 (YYYY-MM-DD) */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** 날짜 포맷 (YYYY-MM-DD) */
export function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** HTML 이스케이프 */
export function s(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 월별 근무일수 (주 5일 기준 단순 계산, 상세는 constants.mjs calcMonthWorkDays 사용) */
export function getWorkDays(year, month) {
  let count = 0;
  const cur = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** 금액 포맷 (세 자리 콤마) */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0';
  return Number(amount).toLocaleString('ko-KR');
}
