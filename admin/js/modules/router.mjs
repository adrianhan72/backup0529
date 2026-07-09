/**
 * modules/router.mjs — 페이지 라우터 (Phase 3-B)
 * 
 * admin-state.js의 showPage()를 모듈에서 안전하게 래핑.
 * 프로그램적 페이지 전환, 현재 페이지 추적, 페이지 변경 이벤트 제공.
 */
import { PAGE_REGISTRY, isExternalPage } from './loader.mjs';

// ═══════════════════════════════════════════
// 내부 상태
// ═══════════════════════════════════════════

let _currentPage = 'dashboard';
const _listeners = [];

// ═══════════════════════════════════════════
// 페이지 네비게이션
// ═══════════════════════════════════════════

/**
 * 페이지 전환 (기존 showPage() 래핑)
 * @param {string} name - 페이지 식별자
 * @param {HTMLElement} [el] - 클릭된 메뉴 엘리먼트
 */
export function navigateTo(name, el = null) {
  if (typeof window.showPage !== 'function') {
    console.error('[Router] showPage()를 찾을 수 없습니다');
    return;
  }

  // 메뉴 엘리먼트가 없으면 자동 찾기
  if (!el && typeof document !== 'undefined') {
    el = document.querySelector(`.menu-item[data-page="${name}"]`);
  }

  window.showPage(name, el);
  _currentPage = name;
  _notifyListeners(name);
}

/**
 * 현재 페이지 반환
 */
export function getCurrentPage() {
  return _currentPage;
}

/**
 * 현재 페이지가 외부 페이지인지 확인
 */
export function isCurrentExternal() {
  return isExternalPage(_currentPage);
}

// ═══════════════════════════════════════════
// 페이지 변경 리스너
// ═══════════════════════════════════════════

/**
 * 페이지 변경 시 호출될 리스너 등록
 * @param {function} fn - (pageName) => void
 */
export function onPageChange(fn) {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

function _notifyListeners(name) {
  _listeners.forEach(fn => {
    try { fn(name); } catch (e) { console.error('[Router] 리스너 오류:', e); }
  });
}

// ═══════════════════════════════════════════
// 페이지 타이틀 매핑
// ═══════════════════════════════════════════

export const PAGE_TITLES = {
  'dashboard':              '대시보드',
  'companies':              '고객사 관리',
  'company-notice-log':     '고객사앱 알림 이력',
  'general-notice':         '중요공지 관리',
  'billing':                '시스템 사용료 관리',
  'contracts':              '근로 계약 관리',
  'contract-dispatch':      '근로계약서 발송 관리',
  'contract-expiry-notice': '계약만료 통지 관리',
  'regular-conversion':     '정규직 전환 관리',
  'probation-mgmt':         '수습 근로자 관리',
  'payrolls':               '급여 명세서 조회',
  'payroll-input':          '급여 입력',
  'labor-status':           '급여 통계 조회',
  'payslip-send':           '급여 명세서 발송 관리',
  'admin-accounts':         '관리자 계정 관리',
  'wage-ledger':            '임금대장',
  'standards':              '년도별 산정기준',
  'severance':              '퇴직급여 관리',
  'annual-leave':           '연차 관리',
  'leave-promotion':        '사용촉진 발송 이력',
};

export function getPageTitle(name) {
  return PAGE_TITLES[name] || name;
}

// ═══════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════

function initRouterModule() {
  console.log('[ESM Router] 라우터 모듈 초기화');
  
  // window 브릿지
  if (typeof window !== 'undefined') {
    window._esmRouter = {
      navigateTo,
      getCurrentPage,
      onPageChange,
      getPageTitle,
      PAGE_TITLES,
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRouterModule);
} else {
  initRouterModule();
}

export { initRouterModule };
