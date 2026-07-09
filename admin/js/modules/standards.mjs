/**
 * modules/standards.mjs — Phase 2 제 기준 관리 모듈
 */
const getAllCompanies = () => window.allCompanies || [];

function addStandardsStatsPanel() {
  const container = document.getElementById('page-standards');
  if (!container || document.getElementById('esm-standards-stats')) return;
  const panel = document.createElement('div');
  panel.id = 'esm-standards-stats';
  panel.style.cssText = 'display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

  const update = () => {
    const companies = getAllCompanies().filter(c => !c.is_draft);
    panel.innerHTML = `
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #10b981;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">전체 고객사</div>
        <div style="font-size:20px;font-weight:700;color:#059669;">${companies.length}<span style="font-size:11px;font-weight:400;color:#9ca3af;">개</span></div></div>
      <div class="esm-stat-card" style="flex:1;min-width:120px;background:#fff;border-radius:10px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-left:3px solid #6366f1;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">모듈 활성화</div>
        <div style="font-size:20px;font-weight:700;color:#4f46e5;">ESM<span style="font-size:11px;font-weight:400;color:#9ca3af;"> v2</span></div></div>`;
  };
  update();
  container.insertBefore(panel, container.firstChild);
}

let _stdObs = null;
function initStandardsModule() {
  console.log('[ESM Standards] 모듈 초기화');
  addStandardsStatsPanel();
  const c = document.getElementById('page-standards');
  if (c) { _stdObs = new MutationObserver(() => { if (!document.getElementById('esm-standards-stats')) addStandardsStatsPanel(); }); _stdObs.observe(c, { childList: true }); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStandardsModule);
else initStandardsModule();
export { addStandardsStatsPanel };
