/**
 * admin-loader.js
 * 
 * admin/index.html 페이지 분할을 위한 동적 페이지 로더.
 * 외부 HTML 파일(pages/*.html)을 fetch + 캐싱하여 로드한다.
 * 
 * admin-state.js의 showPage() 내에서 _loadExternalPage(name)을
 * 호출하여 외부 페이지 HTML을 동적으로 삽입한다.
 * 
 * 사용법:
 *   showPage() 내 각 페이지 분기 시작 부분에서
 *   await _loadExternalPage(name); 호출
 *
 * v2.33.1
 */
/* ===================================================================
 * 페이지 레지스트리
 * =================================================================== */
const PAGE_REGISTRY = {
  'dashboard':            { external: true },
  'companies':            { external: true },
  'contracts':            { external: true },
  'standards':            { external: true },
  'wage-ledger':          { external: true },
  'payrolls':             { external: true },
  'admin-accounts':       { external: true },
  'payroll-input':        { external: true },
  'payslip-send':         { external: true },
  'severance':            { external: true },
  'labor-status':         { external: true },
  'contract-dispatch':    { external: true },
  'consent-dispatch':     { external: true },
  'contract-expiry-notice': { external: true },
  'regular-conversion':   { external: true },
  'company-notice-log':   { external: true },
  'general-notice':       { external: true },
  'probation-mgmt':       { external: true },
  'annual-leave':         { external: true },
  'leave-promotion':      { external: true },
};
/* ===================================================================
 * 내부 상태
 * =================================================================== */
const _pageCache = new Map();
const _pageLoading = new Set();

/* ===================================================================
 * 공개 API
 * =================================================================== */

/**
 * 외부 페이지 HTML을 로드하여 page-{name} 컨테이너에 삽입한다.
 * 이미 로드된 경우 캐시에서 재사용한다.
 * 내부 페이지(index.html 내 div 존재)인 경우 아무 작업도 하지 않는다.
 *
 * @param {string} name - 페이지 식별자
 * @returns {Promise<boolean>} 로드 성공 여부
 */
async function _loadExternalPage(name) {
  const config = PAGE_REGISTRY[name];
  if (!config || !config.external) return true; // 내부 페이지면 성공

  const pageEl = _ensurePageContainer(name);

  // 이미 캐시된 HTML이 있으면 삽입
  if (_pageCache.has(name)) {
    pageEl.innerHTML = _pageCache.get(name);
    return true;
  }

  // 로딩 중이면 fetch 진행 (중복 방지는 HTTP 캐시에 의존)
  _pageLoading.add(name);
  try {
    const resp = await fetch(`pages/${name}.html`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rawHtml = await resp.text();
    // 외부 HTML은 <div id="page-xxx" class="page">...</div> 로 래핑되어 있으므로
    // _ensurePageContainer가 생성한 컨테이너와 중첩되지 않도록 래퍼를 제거하고 내부 HTML만 추출
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
 * 외부 HTML 파일에서 <div id="page-xxx" class="page"> 래퍼를 제거하고
 * 내부 컨텐츠만 반환한다. (_ensurePageContainer가 생성한 컨테이너와 중첩 방지)
 */
function _extractPageContent(html, name) {
  const id = `page-${name}`;
  // 래퍼 div (<div id="page-xxx" class="page"> ... </div>) 감지 → 내용만 추출
  // class 값이 "page", "page active" 등 'page'로 시작하는 모든 케이스, id/class 순서 무관 매칭
  const startRe = new RegExp(`<div\\s+id="${id}"[^>]*class="page[^"]*"[^>]*>`, 'i');
  const startMatch = html.match(startRe);
  if (startMatch) {
    const innerStart = startMatch.index + startMatch[0].length;
    // 마지막 </div>를 래퍼의 닫는 태그로 간주하여 제거
    const closeTag = '</div>';
    const lastClose = html.lastIndexOf(closeTag);
    if (lastClose > innerStart) {
      return html.substring(innerStart, lastClose).trimEnd();
    }
  }
  return html; // 래퍼 없으면 원본 그대로 반환
}

/**
 * page-{name} 컨테이너가 DOM에 존재하는지 확인하고,
 * 없으면 빈 div를 생성하여 content 영역에 추가한다.
 */
function _ensurePageContainer(name) {
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
 * 특정 페이지의 캐시를 무효화한다.
 */
function invalidatePageCache(name) {
  _pageCache.delete(name);
}

/**
 * 모든 외부 페이지 캐시를 무효화한다.
 */
function invalidateAllPageCache() {
  _pageCache.clear();
}