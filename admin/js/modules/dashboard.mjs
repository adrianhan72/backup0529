/**
 * modules/dashboard.mjs — Phase 2 대시보드 모듈
 * 
 * ES Module 기반 대시보드 인사이트 제공.
 * window 브릿지로 기존 글로벌 데이터 접근.
 */
import { getCompanies, getEmployees, getContracts, getPayrolls, loadCoreData } from './state.mjs';
import { isCompanyActive } from './utils.mjs';
import { CONTRACT_ACTIVE_STATUSES } from './constants.mjs';

const getAllCompanies = () => window.allCompanies || [];
const getAllEmployees = () => window.allEmployees || [];
const getAllContracts = () => window.allContracts || [];
const getAllPayrolls  = () => window.allPayrolls || [];

function printDashboardSummary() {
  const companies = getAllCompanies();
  const employees = getAllEmployees();
  const contracts = getAllContracts();
  const activeCompanies = companies.filter(c => isCompanyActive(c));
  const activeContracts = contracts.filter(c => CONTRACT_ACTIVE_STATUSES.includes(c.status));

  console.log('[ESM Dashboard] ── 상태 요약 ──');
  console.log(`  고객사: ${activeCompanies.length}/${companies.length} (활성/전체)`);
  console.log(`  직원:   ${employees.length}명`);
  console.log(`  계약:   ${activeContracts.length}/${contracts.length} (활성/전체)`);
}

function addESMBadge() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || document.getElementById('esm-dash-badge')) return;
  const badge = document.createElement('span');
  badge.id = 'esm-dash-badge';
  badge.style.cssText = 'font-size:10px;background:#6366f1;color:#fff;padding:2px 8px;border-radius:10px;margin-left:auto;opacity:.8;';
  badge.textContent = 'ESM v2';
  topbar.appendChild(badge);
}

function addDashboardRefreshButton() {
  if (document.getElementById('esm-refresh-btn')) return;
  const header = document.querySelector('#page-dashboard .section-header');
  if (!header) return;
  const btn = document.createElement('button');
  btn.id = 'esm-refresh-btn';
  btn.className = 'btn-sm';
  btn.style.cssText = 'margin-left:8px;font-size:11px;';
  btn.innerHTML = '<i class="fas fa-sync-alt"></i> 새로고침 (ESM)';
  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 로딩 중...';
    try {
      await loadCoreData();
      if (typeof window.renderDashboard === 'function') window.renderDashboard();
      console.log('[ESM Dashboard] 데이터 새로고침 완료');
    } catch(e) {
      console.error('[ESM Dashboard] 새로고침 실패:', e);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sync-alt"></i> 새로고침 (ESM)';
    }
  };
  header.appendChild(btn);
}

function enhanceDashboard() {
  printDashboardSummary();
  addESMBadge();
  addDashboardRefreshButton();
}

function initDashboardModule() {
  console.log('[ESM Dashboard] 모듈 초기화');
  enhanceDashboard();
  window._esmDashboard = { printDashboardSummary, enhanceDashboard };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDashboardModule);
else initDashboardModule();

export { printDashboardSummary, enhanceDashboard };
