// ==========================================
//   퇴직 관리 페이지 JS (retirement-mgmt)
// ==========================================

let _retirementCurrentTab = 'insurance';

/** 탭 전환 */
function switchRetirementTab(tab){
  _retirementCurrentTab = tab;
  document.querySelectorAll('.retirement-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.retirement-tab-content').forEach(c => c.style.display = 'none');
  const content = document.getElementById('retirement-tab-' + tab);
  if(content) content.style.display = '';
}

/** 페이지 초기화 + 전체 렌더링 */
function initRetirementMgmtPage(){
  renderRetirementMgmt();
}

/** 전체 대상자 집계 및 테이블 렌더링 */
function renderRetirementMgmt(){
  const today = new Date().toISOString().slice(0,10);

  // ── 해지/해지예정 계약 수집 ──
  const terminatedContracts = (allContracts||[]).filter(c => {
    if(c.is_draft || c.is_voided_by_amend) return false;
    return c.status === CONTRACT_STATUS.TERMINATED || c.status === CONTRACT_STATUS.TERMINATE_PENDING;
  });

  const enrich = (c) => {
    const emp = allEmployees.find(e => e.id === c.employee_id) || {};
    const co  = allCompanies.find(x => x.id === c.company_id) || {};
    const endDate = c.terminate_date || today;
    const tenureDays = c.contract_start ? Math.max(0, Math.ceil((new Date(endDate) - new Date(c.contract_start)) / (1000*60*60*24))) : 0;
    const years = Math.floor(tenureDays / 365);
    const months = Math.floor((tenureDays % 365) / 30);
    return {
      ...c, emp, co,
      empName: emp.name || '-',
      coName: co.company_name || '-',
      termDate: c.terminate_date || '',
      tenureDays, tenureLabel: years>0 ? `${years}년 ${months}개월` : `${months}개월`,
      isPending: c.status === CONTRACT_STATUS.TERMINATE_PENDING
    };
  };

  // ── 1) 4대보험 상실신고 대상 (미신고만) ──
  const insuranceList = terminatedContracts
    .filter(c => {
      const emp = allEmployees.find(e => e.id === c.employee_id);
      return emp && emp.status === EMP_STATUS.RESIGNED && !c.insurance_reported_at;
    })
    .map(enrich);

  // ── 2) 원천징수 대상 (미신고만) ──
  const taxList = terminatedContracts
    .filter(c => {
      const emp = allEmployees.find(e => e.id === c.employee_id);
      return emp && emp.status === EMP_STATUS.RESIGNED && !c.tax_reported_at;
    })
    .map(enrich);

  // ── 3) 퇴직정산 대상 (근속 1년 이상) ──
  const severanceList = terminatedContracts
    .filter(c => { if(!c.contract_start) return false; const endDate = c.terminate_date || today; return Math.ceil((new Date(endDate) - new Date(c.contract_start)) / (1000*60*60*24)) >= 365; })
    .map(enrich);

  // ── 4) 해고예고수당 대상 ──
  const noticePayList = terminatedContracts
    .filter(c => (parseFloat(c.dismissal_notice_pay)||0) > 0)
    .map(c => { const r = enrich(c); r.noticePay = parseFloat(c.dismissal_notice_pay)||0; return r; });

  // ── 탭 카운트 ──
  ['insurance','tax','severance','noticepay'].forEach(tab => {
    const el = document.getElementById('retirement-tab-count-' + tab);
    const map = { insurance: insuranceList, tax: taxList, severance: severanceList, noticepay: noticePayList };
    if(el) el.textContent = map[tab].length > 0 ? `(${map[tab].length})` : '';
  });
  const totalBadge = document.getElementById('retirement-total-badge');
  if(totalBadge) totalBadge.textContent = (insuranceList.length + severanceList.length + noticePayList.length) + '건';

  const fmtD = d => d ? d.replace(/-/g, '.') : '-';

  // ── 테이블 렌더링 ──
  renderInsuranceTable(insuranceList, fmtD);
  renderTaxTable(taxList, fmtD);
  renderSeveranceTable(severanceList, fmtD);
  renderNoticePayTable(noticePayList, fmtD);
}

/** 4대보험 상실신고 테이블 */
function renderInsuranceTable(list, fmtD){
  const tbody = document.querySelector('#retirement-table-insurance tbody');
  if(!tbody) return;
  if(!list.length){ tbody.innerHTML = `<tr><td colspan="5" class="retirement-td-empty">미신고 대상자가 없습니다.</td></tr>`; return; }
  tbody.innerHTML = list.map(r => {
    const done = r.insurance_reported_at;
    const btn = done
      ? `<span class="btn-retire btn-retire-done"><i class="fas fa-check-circle"></i> 완료 (${done.slice(0,10)})</span>
         <button class="btn-retire btn-retire-undo" onclick="undoRetirementDone('${r.id}','insurance')"><i class="fas fa-undo"></i></button>`
      : `<button class="btn-retire btn-retire-pending" onclick="markRetirementDone('${r.id}','insurance')"><i class="fas fa-check"></i> 신고완료</button>`;
    return `<tr>
      <td><strong>${r.empName}</strong></td>
      <td>${r.coName}</td>
      <td>${fmtD(r.termDate)}</td>
      <td>${fmtD(r.termDate)}</td>
      <td class="retirement-td-action">${btn}</td>
    </tr>`;
  }).join('');
}

/** 원천징수 신고 테이블 */
function renderTaxTable(list, fmtD){
  const tbody = document.querySelector('#retirement-table-tax tbody');
  if(!tbody) return;
  if(!list.length){ tbody.innerHTML = `<tr><td colspan="4" class="retirement-td-empty">미신고 대상자가 없습니다.</td></tr>`; return; }
  tbody.innerHTML = list.map(r => {
    const done = r.tax_reported_at;
    const btn = done
      ? `<span class="btn-retire btn-retire-done"><i class="fas fa-check-circle"></i> 완료 (${done.slice(0,10)})</span>
         <button class="btn-retire btn-retire-undo" onclick="undoRetirementDone('${r.id}','tax')"><i class="fas fa-undo"></i></button>`
      : `<button class="btn-retire btn-retire-pending" onclick="markRetirementDone('${r.id}','tax')"><i class="fas fa-check"></i> 신고완료</button>`;
    return `<tr>
      <td><strong>${r.empName}</strong></td>
      <td>${r.coName}</td>
      <td>${fmtD(r.termDate)}</td>
      <td class="retirement-td-action">${btn}</td>
    </tr>`;
  }).join('');
}

/** 퇴직정산 테이블 */
function renderSeveranceTable(list, fmtD){
  const tbody = document.querySelector('#retirement-table-severance tbody');
  if(!tbody) return;
  if(!list.length){ tbody.innerHTML = `<tr><td colspan="6" class="retirement-td-empty">대상자가 없습니다.</td></tr>`; return; }
  tbody.innerHTML = list.map(r => `
    <tr>
      <td><strong>${r.empName}</strong></td>
      <td>${r.coName}</td>
      <td>${fmtD(r.contract_start)}</td>
      <td>${fmtD(r.termDate)}${r.isPending ? ' <span class="retirement-badge-pending">예정</span>' : ''}</td>
      <td>${r.tenureLabel} (${r.tenureDays}일)</td>
      <td>
        <button class="btn-retire btn-retire-pending" onclick="openRetirementSettlement('${r.id}')">
          <i class="fas fa-calculator"></i> 퇴직정산
        </button>
      </td>
    </tr>
  `).join('');
}

/** 해고예고수당 테이블 */
function renderNoticePayTable(list, fmtD){
  const tbody = document.querySelector('#retirement-table-noticepay tbody');
  if(!tbody) return;
  if(!list.length){ tbody.innerHTML = `<tr><td colspan="7" class="retirement-td-empty">대상자가 없습니다.</td></tr>`; return; }
  tbody.innerHTML = list.map(r => `
    <tr>
      <td><strong>${r.empName}</strong></td>
      <td>${r.coName}</td>
      <td>${fmtD(r.contract_start)}</td>
      <td>${fmtD(r.termDate)}${r.isPending ? ' <span class="retirement-badge-pending">예정</span>' : ''}</td>
      <td>${r.tenureLabel}</td>
      <td class="retirement-td-amount">${r.noticePay.toLocaleString('ko-KR')}원</td>
      <td>
        <button class="btn-retire btn-retire-pending" onclick="openRetirementSettlement('${r.id}')">
          <i class="fas fa-calculator"></i> 퇴직정산
        </button>
      </td>
    </tr>
  `).join('');
}

/** 신고완료 마킹 (DB 저장) */
async function markRetirementDone(contractId, type){
  if(!confirm('신고 완료 처리하시겠습니까?')) return;
  try {
    const field = type === 'insurance' ? 'insurance_reported_at' : 'tax_reported_at';
    const now = new Date().toISOString();
    await api(`../tables/contracts/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: now })
    });
    // 로컬 캐시 갱신
    const c = allContracts.find(x => x.id === contractId);
    if(c) c[field] = now;
    await loadContracts();
    toast('신고완료 처리되었습니다.', 'success');
    renderRetirementMgmt();
    if(typeof renderDashRetirementBanner === 'function') renderDashRetirementBanner();
  } catch(e){
    console.error('[markRetirementDone]', e);
    toast('처리 중 오류가 발생했습니다.', 'error');
  }
}

/** 신고완료 취소 (DB 초기화) */
async function undoRetirementDone(contractId, type){
  if(!confirm('신고완료를 취소하시겠습니까?')) return;
  try {
    const field = type === 'insurance' ? 'insurance_reported_at' : 'tax_reported_at';
    await api(`../tables/contracts/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: null })
    });
    const c = allContracts.find(x => x.id === contractId);
    if(c) delete c[field];
    await loadContracts();
    toast('신고완료가 취소되었습니다.', 'success');
    renderRetirementMgmt();
    if(typeof renderDashRetirementBanner === 'function') renderDashRetirementBanner();
  } catch(e){
    console.error('[undoRetirementDone]', e);
    toast('처리 중 오류가 발생했습니다.', 'error');
  }
}

/** 퇴직정산 모달 (추후 구현) */
function openRetirementSettlement(contractId){
  toast('퇴직정산 모달은 이후에 별도로 구현됩니다.', 'info');
  console.log('[퇴직정산] contractId:', contractId);
}

/** showPage 후크 — 페이지 진입 시 초기화 */
(function(){
  const _orig = window.showPage;
  if(typeof _orig === 'function'){
    window.showPage = function(name, el){
      _orig(name, el);
      if(name === 'retirement-mgmt') setTimeout(initRetirementMgmtPage, 50);
    };
  }
})();
