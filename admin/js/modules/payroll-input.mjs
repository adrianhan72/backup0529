/**
 * modules/payroll-input.mjs — Phase 2 급여 입력 모듈
 */
import { getPayrolls } from '../state.mjs';

function addPayrollInputStatsPanel() {
  const container = document.getElementById('page-payroll-input');
  if (!container || document.getElementById('esm-pi-stats')) return;
  const panel = document.createElement('div');
  panel.id = 'esm-pi-stats';
  panel.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

  const update = () => {
    const p = getPayrolls();
    const drafts = p.filter(x => !!x.is_draft);
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1;
    const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
    const thisMonth = drafts.filter(x => x.pay_year===y && x.pay_month===m);
    const prevMonth = drafts.filter(x => x.pay_year===py && x.pay_month===pm);
    const completed = p.filter(x => !x.is_draft && x.pay_year===y && x.pay_month===m);
    const coSet = new Set(drafts.map(x => x.company_id));

    panel.innerHTML = `
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #f59e0b;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">이번 달 임시저장</div>
        <div style="font-size:20px;font-weight:700;color:#d97706;">${thisMonth.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #ef4444;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">전월 임시저장</div>
        <div style="font-size:20px;font-weight:700;color:#dc2626;">${prevMonth.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #10b981;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">이번 달 완료</div>
        <div style="font-size:20px;font-weight:700;color:#059669;">${completed.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #6366f1;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">임시저장 고객사</div>
        <div style="font-size:20px;font-weight:700;color:#4f46e5;">${coSet.size}<span style="font-size:11px;font-weight:400;color:#9ca3af;">개</span></div></div>`;
  };
  update();
  container.insertBefore(panel, container.firstChild);
  window._esmUpdatePIStats = update;
}

let _piObs = null;
function startPIWatcher() {
  const c = document.getElementById('page-payroll-input');
  if (!c) return;
  if (_piObs) _piObs.disconnect();
  _piObs = new MutationObserver(() => { if (!document.getElementById('esm-pi-stats')) addPayrollInputStatsPanel(); });
  _piObs.observe(c, { childList: true });
}

function initPIModule() {
  console.log('[ESM Payroll Input] 모듈 초기화');
  addPayrollInputStatsPanel();
  startPIWatcher();
  window._esmPI = { addPayrollInputStatsPanel };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPIModule);
else initPIModule();

export { addPayrollInputStatsPanel };
