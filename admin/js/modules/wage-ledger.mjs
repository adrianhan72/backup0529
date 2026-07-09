/**
 * modules/wage-ledger.mjs — Phase 2 임금대장 모듈
 */
import { getPayrolls } from './state.mjs';

function addWageLedgerStatsPanel() {
  const container = document.getElementById('page-wage-ledger');
  if (!container || document.getElementById('esm-wl-stats')) return;
  const panel = document.createElement('div');
  panel.id = 'esm-wl-stats';
  panel.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

  const update = () => {
    const completed = getPayrolls().filter(p => !p.is_draft);
    const thisYear = new Date().getFullYear();
    const yp = completed.filter(p => p.pay_year === thisYear);
    const totalAmount = yp.reduce((s, p) => s + (p.total_amount || 0), 0);

    panel.innerHTML = `
      <div class="esm-stat-card" style="flex:1;min-width:130px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #10b981;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">${thisYear}년 급여</div>
        <div style="font-size:20px;font-weight:700;color:#059669;">${yp.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">건</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:130px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #6366f1;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">총 지급액</div>
        <div style="font-size:20px;font-weight:700;color:#4f46e5;">${totalAmount.toLocaleString()}<span style="font-size:11px;font-weight:400;color:#9ca3af;">원</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:130px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #f59e0b;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">월평균</div>
        <div style="font-size:20px;font-weight:700;color:#d97706;">${yp.length ? Math.round(totalAmount/12).toLocaleString() : 0}<span style="font-size:11px;font-weight:400;color:#9ca3af;">원</span></div></div>`;
  };
  update();
  container.insertBefore(panel, container.firstChild);
  window._esmUpdateWLStats = update;
}

let _wlObs = null;
function initWLModule() {
  console.log('[ESM Wage Ledger] 모듈 초기화');
  addWageLedgerStatsPanel();
  const c = document.getElementById('page-wage-ledger');
  if (c) { _wlObs = new MutationObserver(() => { if (!document.getElementById('esm-wl-stats')) addWageLedgerStatsPanel(); }); _wlObs.observe(c, { childList: true }); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWLModule);
else initWLModule();
export { addWageLedgerStatsPanel };
