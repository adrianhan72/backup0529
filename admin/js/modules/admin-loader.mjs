/**
 * admin-loader.mjs — Phase 8-D: admin-loader.js 완전 변환
 * 동적 페이지 로더 (fetch + 캐싱)
 */
// ══ 페이지 레지스트리 ══
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

// ══ 내부 상태 ══
const _pageCache = new Map();
const _pageLoading = new Set();

// window 브릿지 (loader.mjs 호환)
window._pageCache = _pageCache;

// ══ 공개 API ══

/**
 * 외부 페이지 HTML을 로드하여 page-{name} 컨테이너에 삽입
 */
export async function _loadExternalPage(name) {
  const config = PAGE_REGISTRY[name];
  if (!config || !config.external) return true;

  const pageEl = _ensurePageContainer(name);

  if (_pageCache.has(name)) {
    pageEl.innerHTML = _pageCache.get(name);
    return true;
  }

  _pageLoading.add(name);
  try {
    const resp = await fetch(`pages/${name}.html`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rawHtml = await resp.text();
    const innerHtml = _extractPageContent(rawHtml, name);
    _pageCache.set(name, innerHtml);
    pageEl.innerHTML = innerHtml;
    return true;
  } catch (err) {
    console.error(`[admin-loader] pages/${name}.html 로드 실패:`, err);
    pageEl.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#dc2626;">
      <i class="fas fa-exclamation-triangle" style="font-size:32px;margin-bottom:12px;"></i>
      <p style="font-size:14px;font-weight:600;">페이지를 불러올 수 없습니다.</p>
      <p style="font-size:12px;color:#6b7280;">pages/${name}.html 파일이 존재하는지 확인하세요.</p>
    </div>`;
    return false;
  } finally {
    _pageLoading.delete(name);
  }
}

/**
 * 외부 HTML 파일에서 page-xxx 래퍼 div 제거, 내부 컨텐츠만 반환
 */
export function _extractPageContent(html, name) {
  const id = `page-${name}`;
  const startRe = new RegExp(`<div\\s+id="${id}"[^>]*class="page[^"]*"[^>]*>`, 'i');
  const startMatch = html.match(startRe);
  if (startMatch) {
    const innerStart = startMatch.index + startMatch[0].length;
    const closeTag = '</div>';
    const lastClose = html.lastIndexOf(closeTag);
    if (lastClose > innerStart) {
      return html.substring(innerStart, lastClose).trimEnd();
    }
  }
  return html;
}

/**
 * page-{name} 컨테이너 DOM 확보 (없으면 생성)
 */
export function _ensurePageContainer(name) {
  const id = `page-${name}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'page';
    const content = document.querySelector('.content');
    if (content) {
      content.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
  }
  return el;
}

/**
 * 특정 페이지 캐시 무효화
 */
export function invalidatePageCache(name) {
  _pageCache.delete(name);
}

/**
 * 전체 페이지 캐시 무효화
 */
export function invalidateAllPageCache() {
  _pageCache.clear();
}

// ══ window 등록 (레거시 호환) ══
window._loadExternalPage     = _loadExternalPage;
window._extractPageContent   = _extractPageContent;
window._ensurePageContainer  = _ensurePageContainer;
window.invalidatePageCache   = invalidatePageCache;
window.invalidateAllPageCache = invalidateAllPageCache;
