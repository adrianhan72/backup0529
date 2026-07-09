/**
 * modules/company.mjs — Phase 2 고객사 관리 모듈
 * 
 * 고객사 통계 패널 + MutationObserver + _loadExternalPage 래핑.
 * admin-loader.js가 innerHTML을 교체해도 패널 자동 복원.
 */
import { isCompanyActive, s } from './utils.mjs';
import { COMPANY_STATUS } from './constants.mjs';
import { getCompanies as _getCompanies, getEmployees, getContracts, loadCompanies } from './state.mjs';

function ensureCompanies() {
  const g = _getCompanies();
  if (g && g.length > 0) return g;
  if (!window._esmCoFetching) {
    window._esmCoFetching = true;
    loadCompanies().then(() => {
      window._esmCoFetching = false;
      if (window._esmUpdateCompanyStats) window._esmUpdateCompanyStats();
    }).catch(() => { window._esmCoFetching = false; });
  }
  return [];
}

function addCompanyStatsPanel() {
  const container = document.getElementById('page-companies');
  if (!container || document.getElementById('esm-company-stats')) return;

  const panel = document.createElement('div');
  panel.id = 'esm-company-stats';
  panel.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

  const update = () => {
    const companies = ensureCompanies();
    const active = companies.filter(c => isCompanyActive(c) && !c.is_draft);
    const inactive = companies.filter(c => !isCompanyActive(c) && !c.is_draft);
    const drafts = companies.filter(c => !!c.is_draft);
    const withEndDate = companies.filter(c => c.contract_end_date);

    panel.innerHTML = `
      <div class="esm-stat-card" style="flex:1;min-width:140px;background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #10b981;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">이용중 고객사</div>
        <div style="font-size:22px;font-weight:700;color:#059669;">${active.length}<span style="font-size:13px;font-weight:400;color:#9ca3af;">개</span></div>
      </div>
      <div class="esm-stat-card" style="flex:1;min-width:140px;background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #f59e0b;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">미이용 고객사</div>
        <div style="font-size:22px;font-weight:700;color:#d97706;">${inactive.length}<span style="font-size:13px;font-weight:400;color:#9ca3af;">개</span></div>
      </div>
      <div class="esm-stat-card" style="flex:1;min-width:140px;background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">임시저장</div>
        <div style="font-size:22px;font-weight:700;color:#dc2626;">${drafts.length}<span style="font-size:13px;font-weight:400;color:#9ca3af;">건</span></div>
      </div>
      <div class="esm-stat-card" style="flex:1;min-width:140px;background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #6366f1;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">계약만료 설정</div>
        <div style="font-size:22px;font-weight:700;color:#4f46e5;">${withEndDate.length}<span style="font-size:13px;font-weight:400;color:#9ca3af;">개</span></div>
      </div>`;
  };
  update();
  container.insertBefore(panel, container.firstChild);
  window._esmUpdateCompanyStats = update;
}

function enhanceCompanySearch() {
  const input = document.getElementById('company-search');
  if (!input || input.dataset.esmEnhanced) return;
  input.dataset.esmEnhanced = '1';
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (typeof window.renderCompanies === 'function') window.renderCompanies();
    }, 300);
  });
}

// MutationObserver — admin-loader.js 내부 HTML 교체 대응
let _coObs = null;
function startCompanyPageWatcher() {
  const c = document.getElementById('page-companies');
  if (!c) return;
  if (_coObs) _coObs.disconnect();
  _coObs = new MutationObserver(() => {
    if (!document.getElementById('esm-company-stats')) addCompanyStatsPanel();
  });
  _coObs.observe(c, { childList: true });
}

function wrapPageLoader() {
  const orig = window._loadExternalPage;
  if (!orig || orig._esmCoWrapped) return;
  window._loadExternalPage = async function(name) {
    const result = await orig.call(this, name);
    if (name === 'companies') {
      setTimeout(() => { if (!document.getElementById('esm-company-stats')) addCompanyStatsPanel(); }, 50);
    }
    return result;
  };
  window._loadExternalPage._esmCoWrapped = true;
}

function initCompanyModule() {
  console.log('[ESM Company] 모듈 초기화');
  addCompanyStatsPanel();
  startCompanyPageWatcher();
  wrapPageLoader();
  enhanceCompanySearch();

  // 데이터 변경 시 ESM 패널 자동 갱신 (renderCompanies 후크)
  if (typeof window.renderCompanies === 'function') {
    const orig = window.renderCompanies;
    window.renderCompanies = function() {
      orig.apply(this, arguments);
      setTimeout(() => {
        if (window._esmUpdateCompanyStats) window._esmUpdateCompanyStats();
      }, 100);
    };
  }

  window._esmCompany = { addCompanyStatsPanel };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCompanyModule);
else initCompanyModule();

export { addCompanyStatsPanel, enhanceCompanySearch };
