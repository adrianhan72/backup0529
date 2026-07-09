/**
 * modules/helpers.mjs — 공통 헬퍼 함수 모음 (Phase 3-A)
 * 
 * 여러 JS 파일에 흩어진 유틸리티 함수들을 한 곳에 통합.
 * window 브릿지로 기존 코드와 호환 유지.
 */

// ═══════════════════════════════════════════
// DOM 헬퍼
// ═══════════════════════════════════════════

/** 요소 표시/숨김 */
export function show(el) { if (el) el.style.display = ''; }
export function hide(el) { if (el) el.style.display = 'none'; }

/** ID로 요소 찾기 (축약) */
export function $(id) { return document.getElementById(id); }

/** querySelector 축약 */
export function qs(sel, parent = document) { return parent.querySelector(sel); }
export function qsa(sel, parent = document) { return parent.querySelectorAll(sel); }

// ═══════════════════════════════════════════
// 날짜·시간 헬퍼
// ═══════════════════════════════════════════

/** Date 객체 → YYYY-MM-DD */
export function toDateStr(d) {
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** 타임스탬프 → MM/DD HH:MM */
export function fmtShortTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/** 두 날짜 간 일수 차이 */
export function daysBetween(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
}

/** 오늘로부터 N일 후 */
export function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// ═══════════════════════════════════════════
// 문자열 헬퍼
// ═══════════════════════════════════════════

/** 빈 값 체크 */
export function isEmpty(val) {
  return val === null || val === undefined || val === '';
}

/** 숫자만 추출 */
export function extractDigits(str) {
  return String(str || '').replace(/\D/g, '');
}

/** 전화번호 포맷 (010-1234-5678) */
export function formatPhone(phone) {
  const digits = extractDigits(phone);
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  return phone;
}

// ═══════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════

function initHelpersModule() {
  console.log('[ESM Helpers] 헬퍼 모듈 초기화');
  if (typeof window !== 'undefined') {
    window._esmHelpers = { show, hide, $, qs, qsa, toDateStr, fmtShortTime, daysBetween, daysFromNow, isEmpty, extractDigits, formatPhone };
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHelpersModule);
else initHelpersModule();

export { initHelpersModule };
