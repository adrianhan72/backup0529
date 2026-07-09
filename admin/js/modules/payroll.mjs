/**
 * modules/payroll.mjs — Phase 2 급여 관리 모듈
 */
import { getCompanies, getPayrolls, loadPayrolls } from '../state.mjs';

function ensurePayrolls() {
  const g = getPayrolls();
  if (g && g.length > 0) return g;
  if (!window._esmPayFetching) {
    window._esmPayFetching = true;
    loadPayrolls().then(() => {
      window._esmPayFetching = false;
      if (window._esmUpdatePayrollStats) window._esmUpdatePayrollStats();
    }).catch(() => { window._esmPayFetching = false; });
  }
  return [];
}

function addPayrollStatsPanel() {
  const container = document.getElementById('page-payrolls');
  if (!container || document.getElementById('esm-payroll-stats')) return;
  const panel = document.createElement('div');
  panel.id = 'esm-payroll-stats';
  panel.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

  const update = () => {
    const payrolls = ensurePayrolls();
    const total = payrolls.length;
    const drafts = payrolls.filter(p => !!p.is_draft);
    const completed = payrolls.filter(p => !p.is_draft);
    const now = new Date();
    const thisMonth = completed.filter(p => p.pay_year===now.getFullYear() && p.pay_month===now.getMonth()+1);
    const avg = completed.length ? Math.round(completed.reduce((s,p)=>s+(p.total_amount||0),0)/completed.length) : 0;
    const coSet = new Set(completed.map(p => p.company_id));

    panel.innerHTML = `
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #10b981;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">전체 급여</div>
        <div style="font-size:20px;font-weight:700;color:#059669;">${total}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #f59e0b;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">이번 달 급여</div>
        <div style="font-size:20px;font-weight:700;color:#d97706;">${thisMonth.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #ef4444;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">임시저장</div>
        <div style="font-size:20px;font-weight:700;color:#dc2626;">${drafts.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #6366f1;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">평균 급여</div>
        <div style="font-size:20px;font-weight:700;color:#4f46e5;">${avg.toLocaleString()}<span style="font-size:11px;font-weight:400;color:#9ca3af;">원</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #8b5cf6;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">급여 대상 고객사</div>
        <div style="font-size:20px;font-weight:700;color:#6d28d9;">${coSet.size}<span style="font-size:11px;font-weight:400;color:#9ca3af;">개</span></div></div>`;
  };
  update();
  container.insertBefore(panel, container.firstChild);
  window._esmUpdatePayrollStats = update;
}

let _payObs = null;
function startPayrollWatcher() {
  const c = document.getElementById('page-payrolls');
  if (!c) return;
  if (_payObs) _payObs.disconnect();
  _payObs = new MutationObserver(() => { if (!document.getElementById('esm-payroll-stats')) addPayrollStatsPanel(); });
  _payObs.observe(c, { childList: true });
}

function initPayrollModule() {
  console.log('[ESM Payroll] 모듈 초기화');
  addPayrollStatsPanel();
  startPayrollWatcher();

  if (typeof window.renderPayrolls === 'function') {
    const orig = window.renderPayrolls;
    window.renderPayrolls = function() {
      orig.apply(this, arguments);
      setTimeout(() => {
        if (window._esmUpdatePayrollStats) window._esmUpdatePayrollStats();
      }, 100);
    };
  }

  window._esmPayroll = { addPayrollStatsPanel };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPayrollModule);
else initPayrollModule();

export { addPayrollStatsPanel };
