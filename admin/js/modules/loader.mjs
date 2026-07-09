/**
 * modules/loader.mjs — 페이지 로더 모듈 (Phase 3-A)
 * 
 * admin-loader.js의 _loadExternalPage, PAGE_REGISTRY를 모듈화.
 * 기존 글로벌 함수와 병행 동작하도록 window 브릿지 유지.
 */

// ═══════════════════════════════════════════
// 페이지 레지스트리
// ═══════════════════════════════════════════
export const PAGE_REGISTRY = {
  'dashboard':              { external: true },
  'companies':              { external: true },
  'contracts':              { external: true },
  'standards':              { external: true },
  'wage-ledger':            { external: true },
  'payrolls':               { external: true },
  'admin-accounts':         { external: true },
  'payroll-input':          { external: true },
  'payslip-send':           { external: true },
  'severance':              { external: true },
  'labor-status':           { external: true },
  'contract-dispatch':      { external: true },
  'contract-expiry-notice': { external: true },
  'regular-conversion':     { external: true },
  'company-notice-log':     { external: true },
  'general-notice':         { external: true },
  'probation-mgmt':         { external: true },
  'annual-leave':           { external: true },
  'leave-promotion':        { external: true },
};

export function isExternalPage(name) {
  return PAGE_REGISTRY[name]?.external === true;
}

export function getPageNames() {
  return Object.keys(PAGE_REGISTRY);
}

// ═══════════════════════════════════════════
// 페이지 캐시 (브릿지 — 기존 _pageCache 참조)
// ═══════════════════════════════════════════

export function clearPageCache() {
  if (typeof window !== 'undefined' && window._pageCache) {
    window._pageCache.clear();
  }
}

export function getCachedPage(name) {
  if (typeof window !== 'undefined' && window._pageCache) {
    return window._pageCache.get(name) || null;
  }
  return null;
}

// ═══════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════

function initLoaderModule() {
  console.log('[ESM Loader] 페이지 로더 모듈 초기화');

  // window 브릿지: ES Module 함수를 전역에 노출
  if (typeof window !== 'undefined') {
    window._esmLoader = {
      PAGE_REGISTRY,
      isExternalPage,
      getPageNames,
      clearPageCache,
      getCachedPage,
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoaderModule);
} else {
  initLoaderModule();
}

export { initLoaderModule };
