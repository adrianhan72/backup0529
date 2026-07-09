/**
 * modules/contract.mjs — Phase 2 계약 관리 모듈
 * 
 * 계약 통계 + 유형 분포 패널.
 */
import { CONTRACT_ACTIVE_STATUSES, CONTRACT_TERMINAL_STATUSES, CONTRACT_PROBATION_TYPES, contractTypeLabel } from './constants.mjs';

const getAllContracts  = () => {
  // window.allContracts 우선, 없으면 DOM에서 읽기
  const g = window.allContracts;
  if (g && g.length > 0) return g;
  // fallback: API로 직접 조회 (window.allContracts 미로드 시)
  if (!window._esmContractFetching) {
    window._esmContractFetching = true;
    fetch('../tables/contracts?limit=500').then(r => r.json()).then(d => {
      window.allContracts = d.data || [];
      window._esmContractFetching = false;
      if (window._esmUpdateContractStats) window._esmUpdateContractStats();
      if (window._esmUpdateContractTypes) window._esmUpdateContractTypes();
    }).catch(() => { window._esmContractFetching = false; });
  }
  return [];
};
const getAllEmployees  = () => window.allEmployees || [];
const getAllCompanies  = () => window.allCompanies || [];

function addContractStatsPanel() {
  const container = document.getElementById('page-contracts');
  if (!container || document.getElementById('esm-contract-stats')) return;

  const panel = document.createElement('div');
  panel.id = 'esm-contract-stats';
  panel.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

  const update = () => {
    const contracts = getAllContracts();
    const active = contracts.filter(c => !c.is_draft && CONTRACT_ACTIVE_STATUSES.includes(c.status));
    const drafts = contracts.filter(c => !!c.is_draft);
    const terminated = contracts.filter(c => !c.is_draft && CONTRACT_TERMINAL_STATUSES.includes(c.status));
    const probation = active.filter(c => CONTRACT_PROBATION_TYPES.includes(c.contract_type));

    const today = new Date(); today.setHours(0,0,0,0);
    const d30 = new Date(today); d30.setDate(d30.getDate() + 30);
    const expiring = active.filter(c => {
      if (!c.contract_end_date) return false;
      const e = new Date(c.contract_end_date); e.setHours(0,0,0,0);
      return e >= today && e <= d30;
    });

    panel.innerHTML = `
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #10b981;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">활성 계약</div>
        <div style="font-size:20px;font-weight:700;color:#059669;">${active.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div>
      </div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #f59e0b;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">30일 내 만료</div>
        <div style="font-size:20px;font-weight:700;color:#d97706;">${expiring.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div>
      </div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #ef4444;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">임시저장</div>
        <div style="font-size:20px;font-weight:700;color:#dc2626;">${drafts.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div>
      </div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #6366f1;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">수습 계약</div>
        <div style="font-size:20px;font-weight:700;color:#4f46e5;">${probation.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div>
      </div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #8b5cf6;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">종료 계약</div>
        <div style="font-size:20px;font-weight:700;color:#6d28d9;">${terminated.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div>
      </div>`;
  };
  update();
  container.insertBefore(panel, container.firstChild);
  window._esmUpdateContractStats = update;
}

function addContractTypeSummary() {
  const container = document.getElementById('page-contracts');
  if (!container || document.getElementById('esm-contract-types')) return;

  const section = document.createElement('div');
  section.id = 'esm-contract-types';
  section.style.cssText = 'background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:14px;';

  const update = () => {
    const contracts = getAllContracts().filter(c => !c.is_draft);
    const typeCount = {};
    contracts.forEach(c => {
      const label = contractTypeLabel(c.contract_type) || c.contract_type || '기타';
      typeCount[label] = (typeCount[label] || 0) + 1;
    });
    const sorted = Object.entries(typeCount).sort((a,b) => b[1] - a[1]);

    section.innerHTML = `
      <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;">📊 계약 유형 분포 <span style="font-weight:400;color:#9ca3af;font-size:11px;">(ESM)</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${sorted.map(([label, count]) => {
          const pct = contracts.length ? Math.round(count/contracts.length*100) : 0;
          const color = count > 20 ? '#10b981' : count > 10 ? '#6366f1' : '#f59e0b';
          return `<div style="flex:1;min-width:100px;background:#f9fafb;border-radius:8px;padding:10px 12px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:${color};">${count}</div>
            <div style="font-size:11px;color:#6b7280;">${label}</div>
            <div style="margin-top:4px;background:#e5e7eb;border-radius:4px;height:4px;"><div style="width:${pct}%;height:100%;background:${color};border-radius:4px;"></div></div>
            <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${pct}%</div></div>`;
        }).join('')}
      </div>`;
  };
  update();
  container.insertBefore(section, container.firstChild);
  window._esmUpdateContractTypes = update;
}

// MutationObserver — DOM 변경 감지 + 통계 갱신
let _ctObs = null;
function startContractWatcher() {
  const c = document.getElementById('page-contracts');
  if (!c) return;
  if (_ctObs) _ctObs.disconnect();
  _ctObs = new MutationObserver(() => {
    if (!document.getElementById('esm-contract-stats')) addContractStatsPanel();
    if (!document.getElementById('esm-contract-types')) addContractTypeSummary();
    // 계약 목록이 렌더링되면 통계 갱신
    if (document.getElementById('cont-list-section')?.style.display !== 'none') {
      setTimeout(() => {
        if (window._esmUpdateContractStats) window._esmUpdateContractStats();
        if (window._esmUpdateContractTypes) window._esmUpdateContractTypes();
      }, 200);
    }
  });
  _ctObs.observe(c, { childList: true, subtree: true });
}

function initContractModule() {
  console.log('[ESM Contract] 모듈 초기화');
  addContractStatsPanel();
  addContractTypeSummary();
  startContractWatcher();

  // 데이터 변경 시 ESM 패널 자동 갱신 (renderContracts + selectContCompany 후크)
  const hookRender = (fnName) => {
    if (typeof window[fnName] === 'function') {
      const orig = window[fnName];
      window[fnName] = function() {
        orig.apply(this, arguments);
        setTimeout(() => {
          if (window._esmUpdateContractStats) window._esmUpdateContractStats();
          if (window._esmUpdateContractTypes) window._esmUpdateContractTypes();
        }, 150);
      };
    }
  };
  hookRender('renderContracts');
  hookRender('selectContCompany');

  window._esmContract = { addContractStatsPanel, addContractTypeSummary };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initContractModule);
else initContractModule();

export { addContractStatsPanel, addContractTypeSummary };
