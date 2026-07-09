/**
 * modules/severance.mjs — Phase 2 퇴직급여 관리 모듈
 */
import { CONTRACT_ACTIVE_STATUSES } from './constants.mjs';
import { getEmployees, getContracts } from './state.mjs';

function addSeveranceStatsPanel() {
  const container = document.getElementById('page-severance');
  if (!container || document.getElementById('esm-sev-stats')) return;
  const panel = document.createElement('div');
  panel.id = 'esm-sev-stats';
  panel.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

  const update = () => {
    const employees = getEmployees();
    const contracts = getContracts();
    const active = contracts.filter(c => CONTRACT_ACTIVE_STATUSES.includes(c.status));
    const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const longTerm = active.filter(c => c.contract_start_date && new Date(c.contract_start_date) <= oneYearAgo);

    panel.innerHTML = `
      <div class="esm-stat-card" style="flex:1;min-width:130px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #10b981;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">전체 직원</div>
        <div style="font-size:20px;font-weight:700;color:#059669;">${employees.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">명</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:130px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #6366f1;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">활성 계약</div>
        <div style="font-size:20px;font-weight:700;color:#4f46e5;">${active.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:130px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #f59e0b;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">1년 이상 근속</div>
        <div style="font-size:20px;font-weight:700;color:#d97706;">${longTerm.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">명</span></div></div>`;
  };
  update();
  container.insertBefore(panel, container.firstChild);
  // Phase 4: 모듈 레벨 콜백 (외부 호출 없음)
  let _updateSevStats = update;
}

let _sevObs = null;
function initSevModule() {
  console.log('[ESM Severance] 모듈 초기화');
  addSeveranceStatsPanel();
  const c = document.getElementById('page-severance');
  if (c) { _sevObs = new MutationObserver(() => { if (!document.getElementById('esm-sev-stats')) addSeveranceStatsPanel(); }); _sevObs.observe(c, { childList: true }); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSevModule);
else initSevModule();
export { addSeveranceStatsPanel };
