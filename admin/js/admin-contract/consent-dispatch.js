/**
 * consent-dispatch.js — 제3자 정보제공 동의서 발송 관리
 * 계약서 발송 관리(contract-dispatch.js)와 동일 구조
 */
window._consentDispatchList = window._consentDispatchList || [];
let _cnsPage = 1;
const _cnsPageSize = 10;
let _cnsUnsentCoId = '';

// ── 탭 전환 ──
function _cnsSwitchTab(tab){
  const unsentEl = document.getElementById('cns-unsent-section');
  const historyEl = document.getElementById('cns-history-section');
  const previewEl = document.getElementById('cns-preview-section');
  const tabUnsent = document.getElementById('cns-tab-unsent');
  const tabHistory = document.getElementById('cns-tab-history');
  const tabPreview = document.getElementById('cns-tab-preview');
  [tabUnsent, tabHistory, tabPreview].forEach(b => b?.classList.remove('active'));
  [unsentEl, historyEl, previewEl].forEach(el => { if(el) el.style.display = 'none'; });
  if(tab === 'unsent'){
    if(unsentEl) unsentEl.style.display = '';
    if(tabUnsent) tabUnsent.classList.add('active');
  } else if(tab === 'history'){
    if(historyEl) historyEl.style.display = '';
    if(tabHistory) tabHistory.classList.add('active');
  } else if(tab === 'preview'){
    if(previewEl) previewEl.style.display = '';
    if(tabPreview) tabPreview.classList.add('active');
    _cnsRenderPreview();
  }
}

// ── 메시지 예시 렌더 ──
function _cnsRenderPreview(){
  const container = document.getElementById('cns-preview-content');
  if(!container) return;
  if(typeof msgRenderAllPreviews === 'function'){
    container.innerHTML = msgRenderAllPreviews('consent');
  } else {
    container.innerHTML = '<p style="padding:20px;color:#9ca3af;">메시지 템플릿을 불러올 수 없습니다.</p>';
  }
}

// ── 커스텀 고객사 드롭다운 토글 ──
function _cnsToggleCoDropdown(){
  const list = document.getElementById('cns-unsent-co-list');
  const btn = document.getElementById('cns-unsent-co-btn');
  if(!list || !btn) return;
  const isOpen = list.style.display === 'block';
  if(isOpen){ list.style.display = 'none'; return; }
  const rect = btn.getBoundingClientRect();
  list.style.top = (rect.bottom + 4) + 'px';
  list.style.left = rect.left + 'px';
  list.style.width = Math.min(window.innerWidth - rect.left - 20, 800) + 'px';
  list.style.display = 'block';
  setTimeout(() => {
    const handler = e => {
      const dd = document.getElementById('cns-unsent-co-dropdown');
      if(dd && !dd.contains(e.target)){ list.style.display = 'none'; document.removeEventListener('click', handler); }
    };
    document.addEventListener('click', handler);
  }, 0);
}

function _cnsSelectCo(coId, coName){
  _cnsUnsentCoId = coId;
  document.getElementById('cns-unsent-co-label').textContent = coName || '전체 고객사';
  const unsent = _cnsGetUnsentContracts();
  const cnt = coId ? unsent.filter(c => c.company_id === coId).length : unsent.length;
  document.getElementById('cns-unsent-co-badge').textContent = cnt;
  document.getElementById('cns-unsent-co-list').style.display = 'none';
  renderCnsUnsentMonthTabs();
  renderCnsUnsentList();
}

function _cnsPopulateUnsentCompanySelect(){
  const btn = document.getElementById('cns-unsent-co-btn');
  const list = document.getElementById('cns-unsent-co-list');
  if(!btn || !list) return;
  const activeCos = allCompanies.filter(c => isCompanyActive(c));
  const unsent = _cnsGetUnsentContracts();
  const totalCount = unsent.length;
  const countByCo = {};
  unsent.forEach(c => { countByCo[c.company_id] = (countByCo[c.company_id]||0) + 1; });
  const label = document.getElementById('cns-unsent-co-label');
  const badgeEl = document.getElementById('cns-unsent-co-badge');
  if(currentGlobalCompanyId){
    _cnsUnsentCoId = currentGlobalCompanyId;
    const co = allCompanies.find(c => c.id === currentGlobalCompanyId);
    if(label) label.textContent = co ? co.company_name : '전체 고객사';
    const selCnt = currentGlobalCompanyId ? (countByCo[currentGlobalCompanyId]||0) : totalCount;
    if(badgeEl) badgeEl.textContent = selCnt;
  } else {
    if(label) label.textContent = '전체 고객사';
    if(badgeEl) badgeEl.textContent = totalCount;
  }
  list.innerHTML =
    `<div class="cust-dropdown-item${!_cnsUnsentCoId?' selected':''}" onclick="_cnsSelectCo('','전체 고객사')">
      <span>전체 고객사</span><span class="count-badge">${totalCount}</span>
    </div>` +
    activeCos.map(c => {
      const cnt = countByCo[c.id] || 0;
      return `<div class="cust-dropdown-item${_cnsUnsentCoId===c.id?' selected':''}" onclick="_cnsSelectCo('${c.id}','${c.company_name.replace(/'/g,"\\'")}')">
        <span>${c.company_name}</span><span class="count-badge">${cnt}</span>
      </div>`;
    }).join('');
}

// ── 기간 검증: 최대 3개월 제한 (조회 버튼 클릭 시) ──
function _cnsDoSearch(){
  const fromEl = document.getElementById('cns-filter-date-from');
  const toEl = document.getElementById('cns-filter-date-to');
  const noticeEl = document.getElementById('cns-date-notice');
  if(!fromEl || !toEl) return;
  const fromVal = fromEl.value, toVal = toEl.value;
  const resetBorder = () => { fromEl.classList.remove('va-input-err'); toEl.classList.remove('va-input-err'); };
  if(fromVal && toVal){
    const from = new Date(fromVal);
    const to = new Date(toVal);
    if(!isNaN(from.getTime()) && !isNaN(to.getTime())){
      const maxFrom = new Date(to);
      maxFrom.setMonth(maxFrom.getMonth() - 3);
      if(from < maxFrom){
        fromEl.classList.add('va-input-err');
        toEl.classList.add('va-input-err');
        if(noticeEl) noticeEl.style.color = '#dc2626';
        toast('조회 기간은 최대 3개월까지 가능합니다.', 'error');
        return;
      }
    }
  }
  resetBorder();
  if(noticeEl) noticeEl.style.color = '#9ca3af';
  _cnsPage = 1;
  renderConsentDispatchPage();
}

// ── 발송 이력 로드 ──
async function loadConsentDispatchList(forceReload = false) {
  if (!forceReload && window._consentDispatchList.length > 0) return;
  try {
    const res = await fetch('../tables/consent_dispatch?page=1&limit=1000');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rows = (data.data || []).sort((a, b) => {
      const ta = a.dispatched_at || a.created_at || '';
      const tb = b.dispatched_at || b.created_at || '';
      return tb.localeCompare(ta);
    });
    window._consentDispatchList = rows;
    _updateCnsMenuBadge();
  } catch (e) {
    console.error('[동의서발송이력 로드]', e);
    window._consentDispatchList = [];
  }
}

// ── 사이드바 메뉴 뱃지 업데이트 ──
function _updateCnsMenuBadge() {
  const badge = document.getElementById('badge-consent-dispatch');
  if (!badge) return;
  const unsent = _cnsGetUnsentContracts();
  if (unsent.length > 0) {
    badge.textContent = unsent.length;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

// ── 발송 관리 페이지 전체 렌더링 ──
async function renderConsentDispatchPage() {
  if (window._consentDispatchList.length === 0) await loadConsentDispatchList(true);

  const filterMethod = document.getElementById('cns-filter-method')?.value || '';
  const filterStatus = document.getElementById('cns-filter-status')?.value || '';
  const filterCompany = document.getElementById('cns-filter-company')?.value || '';
  const filterDateFrom = document.getElementById('cns-filter-date-from')?.value || '';
  const filterDateTo = document.getElementById('cns-filter-date-to')?.value || '';
  const searchKw = (document.getElementById('cns-search')?.value || '').trim().toLowerCase();

  // 고객사 필터 옵션
  const coSel = document.getElementById('cns-filter-company');
  if (coSel && coSel.options.length <= 1) {
    const uniqueCompanies = [...new Map(
      window._consentDispatchList.map(r => [r.company_id, r.company_name])
    ).entries()].sort((a, b) => (a[1] || '').localeCompare(b[1] || '', 'ko'));
    uniqueCompanies.forEach(([id, name]) => {
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = name || id;
      coSel.appendChild(opt);
    });
  }

  const filtered = window._consentDispatchList.filter(r => {
    if (filterMethod && r.dispatch_method !== filterMethod) return false;
    if (filterStatus && r.dispatch_status !== filterStatus) return false;
    if (filterCompany && r.company_id !== filterCompany) return false;
    if (filterDateFrom || filterDateTo) {
      const raw = r.dispatched_at || r.created_at || '';
      const recDate = typeof raw === 'string' ? raw.slice(0, 10) : String(raw).slice(0, 10);
      if (filterDateFrom && recDate < filterDateFrom) return false;
      if (filterDateTo && recDate > filterDateTo) return false;
    }
    if (searchKw) {
      const hay = `${r.employee_name || ''} ${r.recipient || ''} ${r.company_name || ''}`.toLowerCase();
      if (!hay.includes(searchKw)) return false;
    }
    return true;
  }).sort((a, b) => ((b.dispatched_at || b.created_at || '')).localeCompare((a.dispatched_at || a.created_at || '')));

  const countEl = document.getElementById('cns-record-count');
  if (countEl) countEl.textContent = `총 ${filtered.length.toLocaleString('ko-KR')}건`;

  const totalPages = Math.max(1, Math.ceil(filtered.length / _cnsPageSize));
  if (_cnsPage > totalPages) _cnsPage = totalPages;
  const pageData = filtered.slice((_cnsPage - 1) * _cnsPageSize, _cnsPage * _cnsPageSize);

  const tbody = document.getElementById('cns-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="cen-empty"><i class="fas fa-inbox"></i> 발송 이력이 없습니다.</td></tr>`;
    document.getElementById('cns-pagination').innerHTML = '';
    return;
  }

  const fmtDt = ts => {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const methodBadge = m => {
    const cfg = {
      [DISPATCH_METHOD.KAKAO]:  { bg:'#f9d000', color:'#3b1f00', icon:'M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z', isSvg:true },
      [DISPATCH_METHOD.EMAIL]:  { bg:'#dbeafe', color:'#1e40af', fa:'fa-envelope' },
      [DISPATCH_METHOD.MANUAL]: { bg:'#d1fae5', color:'#065f46', fa:'fa-hand-paper' },
    };
    const c = cfg[m] || { bg:'#f3f4f6', color:'#374151', fa:'fa-question' };
    const label = { kakao:'알림톡', email:'이메일', manual:'수동교부' }[m] || m || '-';
    const icon = c.isSvg
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="${c.color}"><path d="${c.icon}"/></svg>`
      : `<i class="fas ${c.fa}" style="font-size:11px;"></i>`;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;white-space:nowrap;">${icon}${label}</span>`;
  };

  const statusBadge = s => {
    const STATUS_CLS = { completed:'badge-green', sent:'badge-green', failed:'badge-red', pending:'badge-indigo' };
    const badgeCls = STATUS_CLS[s] || 'badge-gray';
    const iconCfg = { completed:'<i class="fas fa-check-circle"></i>', sent:'<i class="fas fa-check-circle"></i>', failed:'<i class="fas fa-times-circle"></i>', pending:'<i class="fas fa-clock"></i>' };
    const icon = iconCfg[s] || '<i class="fas fa-circle"></i>';
    const label = DISPATCH_STATUS_LABEL[s] || s || '-';
    return `<span class="badge ${badgeCls}">${icon} ${label}</span>`;
  };

  const typeBadge = t => {
    const badgeCls = empCatBadge(t);
    const label = (typeof contractTypeLabel === 'function') ? contractTypeLabel(t) : (t || '-');
    return `<span class="badge ${badgeCls}">${label}</span>`;
  };

  const attachBtn = contractId => {
    if (!contractId) return `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;
    const c = (allContracts || []).find(x => x.id === contractId);
    if (!c) return `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;
    return `<button onclick="event.stopPropagation();openContractPrintModal('${contractId}')"
      class="btn btn-indigo btn-sm"
      title="근로계약 조건에 따라 자동완성된 계약서 미리보기">
      <i class="fas fa-file-contract" style="font-size:10px;"></i>미리보기
    </button>`;
  };

  tbody.innerHTML = pageData.map((r, idx) => {
    return `<tr>
      <td style="color:#374151;white-space:nowrap;">${fmtDt(r.dispatched_at)}</td>
      <td style="font-weight:600;color:#111827;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.company_name||''}">${r.company_name||'-'}</td>
      <td style="font-weight:700;color:#111827;">${r.employee_name||'-'}</td>
      <td>${typeBadge(r.contract_type)}</td>
      <td class="ctr">${methodBadge(r.dispatch_method)}</td>
      <td style="font-size:12px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.recipient||''}">${r.recipient||'-'}</td>
      <td class="ctr">${statusBadge(r.dispatch_status)}</td>
      <td style="font-size:12px;color:#6b7280;">${r.dispatched_by||'-'}</td>
      <td class="ctr" style="white-space:nowrap;">${attachBtn(r.contract_id)}</td>
    </tr>`;
  }).join('');

  // 페이지네이션
  const pagerEl = document.getElementById('cns-pagination');
  if (pagerEl) {
    const total = filtered.length;
    if (total <= _cnsPageSize) { pagerEl.innerHTML = ''; }
    else {
      const s = Math.min((_cnsPage-1)*_cnsPageSize+1, total);
      const e = Math.min(_cnsPage*_cnsPageSize, total);
      const mBtn = (label, pg, disabled, active) =>
        `<button class="page-btn${active?' active':''}" onclick="_cnsPage=${pg};renderConsentDispatchPage()"${disabled?' disabled':''}>${label}</button>`;
      const btns = [];
      btns.push(mBtn('<i class="fas fa-chevron-left"></i>', Math.max(1,_cnsPage-1), _cnsPage<=1, false));
      const start = Math.max(1, _cnsPage-2), end = Math.min(totalPages, _cnsPage+2);
      if(start > 1){ btns.push(mBtn('1',1,false,false)); if(start>2) btns.push('<span class="page-ellipsis">…</span>'); }
      for(let p=start;p<=end;p++) btns.push(mBtn(p,p,false,p===_cnsPage));
      if(end < totalPages){ if(end<totalPages-1) btns.push('<span class="page-ellipsis">…</span>'); btns.push(mBtn(totalPages,totalPages,false,false)); }
      btns.push(mBtn('<i class="fas fa-chevron-right"></i>', Math.min(totalPages,_cnsPage+1), _cnsPage>=totalPages, false));
      pagerEl.innerHTML = `<div class="pagination"><span class="page-info">총 <strong>${total}</strong>건 중 ${s}–${e}번째</span><div class="page-btns">${btns.join('')}</div></div>`;
    }
  }
}

// ── 미발송 동의서 조회 ──
// 이미 제3자 정보제공 동의서를 교부한 이력이 있는 직원은 제외
function _cnsGetUnsentContracts(year, month) {
  // 동의서 발송 이력이 있는 employee_id 집합
  const consentEmpIds = new Set(
    (window._consentDispatchList || []).filter(r => r.dispatch_status === 'sent' || r.dispatch_status === 'completed').map(r => r.employee_id)
  );

  const allContracts_filtered = (allContracts || []).filter(c =>
    !c.is_draft &&
    ![CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.TERMINATED].includes(c.status) &&
    !c.is_voided_by_amend &&
    !c.renewed_from_id &&  // 갱신계약은 계약 연속성이 유지되므로 동의서 재발송 제외
    !consentEmpIds.has(c.employee_id) &&
    (!_cnsUnsentCoId || c.company_id === _cnsUnsentCoId)
  );

  if (year && month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    return allContracts_filtered.filter(c => (c.contract_start || '').startsWith(ym));
  }
  return allContracts_filtered;
}

// ── 미발송 탭 렌더링 ──
function renderCnsUnsentMonthTabs() {
  const tabsEl = document.getElementById('cns-unsent-month-tabs');
  if (!tabsEl) return;

  const allUnsent = _cnsGetUnsentContracts();
  const monthMap = {};
  allUnsent.forEach(c => {
    const ym = (c.contract_start || '').slice(0, 7);
    if (ym) monthMap[ym] = (monthMap[ym] || 0) + 1;
  });

  // 총 미발송 건수 배지 업데이트
  const totalBadge = document.getElementById('cns-unsent-total-badge');
  if (totalBadge) totalBadge.textContent = `(총 ${allUnsent.length}건)`;

  const months = Object.keys(monthMap).sort().reverse().slice(0, 12);
  if (months.length === 0) {
    tabsEl.innerHTML = '<span class="pss-empty">미발송 동의서가 없습니다.</span>';
    return;
  }

  let html = '';
  months.forEach((ym, i) => {
    const [y, m] = ym.split('-');
    html += `<div class="cdp-month-tab${i === 0 ? ' active' : ''}" onclick="cnsSelectUnsentYM(${y},${parseInt(m)})">${y}년 ${String(m).padStart(2,'0')}월 ${monthMap[ym] > 0 ? `<span class="count-badge">${monthMap[ym]}</span>` : ''}</div>`;
  });
  tabsEl.innerHTML = html;

  if (months.length > 0) {
    const [y, m] = months[0].split('-');
    cnsSelectUnsentYM(parseInt(y), parseInt(m));
  }
}

let _cnsSelectedYM = null;
function cnsSelectUnsentYM(year, month) {
  _cnsSelectedYM = { year, month };
  const tabs = document.querySelectorAll('#cns-unsent-month-tabs .cdp-month-tab');
  tabs.forEach(t => t.classList.remove('active'));
  // Find the matching tab by its text content
  const targetTab = document.querySelector(`#cns-unsent-month-tabs .cdp-month-tab[onclick*="cnsSelectUnsentYM(${year},${month})"]`);
  if (targetTab) targetTab.classList.add('active');
  renderCnsUnsentList();
}

function renderCnsUnsentList() {
  const tbody = document.getElementById('cns-unsent-tbody');
  const clearEl = document.getElementById('cns-unsent-all-clear');
  const wrapEl = document.getElementById('cns-unsent-table-wrap');
  const monthCard = document.getElementById('cns-unsent-month-card');
  if (!tbody) return;

  let contracts;
  if (_cnsSelectedYM) {
    contracts = _cnsGetUnsentContracts(_cnsSelectedYM.year, _cnsSelectedYM.month);
  } else {
    contracts = _cnsGetUnsentContracts();
  }

  if (contracts.length === 0) {
    if (clearEl) clearEl.style.display = '';
    if (wrapEl) wrapEl.style.display = 'none';
    if (monthCard) monthCard.style.display = 'none';
    cnsUpdateBatchBtns();
    return;
  }
  if (clearEl) clearEl.style.display = 'none';
  if (wrapEl) wrapEl.style.display = '';
  if (monthCard) monthCard.style.display = '';

  tbody.innerHTML = contracts.map(c => {
    const emp = (allEmployees || []).find(e => e.id === c.employee_id);
    const co = (allCompanies || []).find(x => x.id === c.company_id);
    const empName = emp ? emp.name : '-';
    const coName = co ? co.company_name : '-';
    const phone = emp ? (emp.phone || '-') : '-';
    const email = emp ? (emp.email || '-') : '-';
    const cat = c.contract_type || (emp ? emp.employment_category : '') || '-';

    const hasPhone = !!(phone && phone.trim() && phone !== '-');
    const hasEmail = !!(email && email.trim() && email !== '-');
    const kakaoClass = hasPhone ? 'btn btn-kakao btn-sm' : 'btn btn-sm';
    const emailClass = hasEmail ? 'btn btn-sky btn-sm' : 'btn btn-sm';

    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td class="ctr"><input type="checkbox" class="cns-row-chk" data-contract-id="${c.id}" onchange="cnsUpdateBatchBtns()" /></td>
      <td style="font-size:12px;color:#111827;font-weight:700;">${coName}</td>
      <td style="font-weight:700;color:#111827;">${empName}</td>
      <td><span class="badge ${typeof empCatBadge === 'function' ? empCatBadge(cat) : 'badge-gray'}">${typeof contractTypeLabel === 'function' ? contractTypeLabel(cat) : cat}</span></td>
      <td style="font-size:12px;color:#6b7280;">${c.contract_start || '-'}</td>
      <td style="font-size:12px;color:#6b7280;">${hasPhone ? phone : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="font-size:12px;">${hasEmail ? `<span style="color:#374151;">${email}</span>` : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">${c.id ? `<button onclick="event.stopPropagation();openContractPrintModal('${c.id}')" class="btn btn-indigo btn-sm" title="자동완성 근로계약서 미리보기"><i class="fas fa-file-contract" style="font-size:10px;"></i>미리보기</button>` : '<span style="color:#d1d5db;">-</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button onclick="cnsUnsentKakao('${c.id}','${empName}','${phone}','${coName}')" ${hasPhone ? '' : 'disabled'}
          class="${kakaoClass}" style="margin-right:3px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡
        </button>
        <button onclick="cnsUnsentEmail('${c.id}','${empName}','${email}','${coName}')" ${hasEmail ? '' : 'disabled'}
          class="${emailClass}" style="margin-right:3px;">
          ✉ 이메일
        </button>
        <button onclick="cnsUnsentManual('${c.id}','${empName}','${coName}')"
          class="btn btn-success btn-sm" style="margin-right:3px;">
          <i class="fas fa-hand-paper"></i> 수동교부
        </button>
      </td>
    </tr>`;
  }).join('');
  cnsUpdateBatchBtns();
}

// ── 개별 발송 ──
async function cnsUnsentKakao(contractId, empName, phone, coName) {
  if (!confirm(`'${empName}'님에게 제3자 정보제공 동의서를 알림톡으로 발송하시겠습니까?\n수신번호: ${phone}`)) return;
  await _cnsSaveDispatchRecord({ method: 'kakao', status: 'completed', recipient: phone, note: '알림톡 발송', contractId, empName, coName });
  _cnsRefreshUnsent();
}

async function cnsUnsentEmail(contractId, empName, email, coName) {
  if (!confirm(`'${empName}'님에게 제3자 정보제공 동의서를 이메일로 발송하시겠습니까?\n수신주소: ${email}`)) return;
  await _cnsSaveDispatchRecord({ method: 'email', status: 'completed', recipient: email, note: '이메일 발송', contractId, empName, coName });
  _cnsRefreshUnsent();
}

async function cnsUnsentManual(contractId, empName, coName) {
  if (!confirm(`'${empName}'님에게 제3자 정보제공 동의서를 수동교부 처리하시겠습니까?`)) return;
  await _cnsSaveDispatchRecord({ method: 'manual', status: 'completed', recipient: '수동교부', note: '수동교부', contractId, empName, coName });
  _cnsRefreshUnsent();
}

async function cnsSendAllKakao() {
  if (!_cnsSelectedYM) return;
  const unsent = _cnsGetUnsentContracts(_cnsSelectedYM.year, _cnsSelectedYM.month);
  if (unsent.length === 0) { toast('모든 동의서가 이미 발송되었습니다.', 'info'); return; }
  if (!confirm(`선택된 ${_cnsSelectedYM.year}년 ${_cnsSelectedYM.month}월의 미발송 동의서 ${unsent.length}건을\n일괄 알림톡으로 발송하시겠습니까?`)) return;

  let success = 0, fail = 0;
  for (const c of unsent) {
    try {
      const emp = (allEmployees || []).find(e => e.id === c.employee_id);
      const phone = emp ? (emp.phone || '') : '';
      if (!phone) { fail++; continue; }
      const co = (allCompanies || []).find(x => x.id === c.company_id);
      await _cnsSaveDispatchRecord({ method: 'kakao', status: 'completed', recipient: phone, note: '일괄 알림톡 발송', contractId: c.id, empName: emp?.name || '-', coName: co?.company_name || '-' });
      success++;
    } catch (e) { fail++; }
  }
  toast(`발송 완료: ${success}건 성공, ${fail}건 실패`, success > 0 ? 'success' : 'error');
  _cnsRefreshUnsent();
}

async function _cnsSaveDispatchRecord({ method, status, recipient, note, contractId, empName, coName }) {
  const c = (allContracts || []).find(x => x.id === contractId);
  const body = {
    id: 'cns_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    contract_id: contractId,
    employee_id: c?.employee_id || '',
    employee_name: empName || c?.employee_name || '',
    company_id: c?.company_id || '',
    company_name: coName || c?.company_name || '',
    contract_type: c?.contract_type || '',
    dispatch_method: method,
    dispatch_status: status,
    recipient: recipient || '',
    dispatched_at: new Date().toISOString(),
    dispatched_by: (typeof currentUser === 'object' && currentUser?.name) || '관리자',
    note: note || '',
    contract_start: c?.contract_start || '',
    contract_end: c?.contract_end || '',
    created_at: Date.now(),
    updated_at: Date.now()
  };
  try {
    const res = await fetch('../tables/consent_dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    window._consentDispatchList.push(body);
    window._consentDispatchList.sort((a, b) => (b.dispatched_at || '').localeCompare(a.dispatched_at || ''));
    _updateCnsMenuBadge();
  } catch (e) {
    console.error('[동의서발송 저장]', e);
    toast('발송 기록 저장에 실패했습니다.', 'error');
    throw e;
  }
}

async function _cnsRefreshUnsent() {
  await loadConsentDispatchList(true);
  _updateCnsMenuBadge();
  renderCnsUnsentMonthTabs();
  await renderConsentDispatchPage();
  _updateDashConsentBanner();
}

/** 전체 선택/해제 */
function cnsToggleAll(el){
  document.querySelectorAll('.cns-row-chk').forEach(cb => { cb.checked = el.checked; });
  cnsUpdateBatchBtns();
}

/** 선택된 계약 ID 목록 */
function cnsGetSelectedIds(){
  return [...document.querySelectorAll('.cns-row-chk:checked')].map(cb => cb.dataset.contractId);
}

/** 배치 버튼 활성/비활성 */
function cnsUpdateBatchBtns(){
  const sel = cnsGetSelectedIds();
  const btnKakao = document.getElementById('cns-batch-kakao-btn');
  const btnEmail = document.getElementById('cns-batch-email-btn');
  const btnManual= document.getElementById('cns-batch-manual-btn');
  if(btnKakao) btnKakao.disabled = sel.length === 0;
  if(btnEmail) btnEmail.disabled = sel.length === 0;
  if(btnManual)btnManual.disabled= sel.length === 0;
  const allCb = document.getElementById('cns-chk-all');
  const allRows = document.querySelectorAll('.cns-row-chk');
  if(allCb && allRows.length > 0) allCb.checked = sel.length === allRows.length;
}

/** 선택 초기화 */
function resetCnsSelection(){
  document.querySelectorAll('.cns-row-chk').forEach(cb => { cb.checked = false; });
  const allCb = document.getElementById('cns-chk-all');
  if(allCb) allCb.checked = false;
  cnsUpdateBatchBtns();
}

/** 선택 일괄 알림톡 발송 */
async function cnsBatchKakao(){
  const ids = cnsGetSelectedIds();
  if(!ids.length){ toast('선택된 항목이 없습니다.', 'warning'); return; }
  const list = _cnsGetUnsentContracts(_cnsSelectedYM.year, _cnsSelectedYM.month).filter(c => ids.includes(c.id));
  const valid = list.filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return emp && emp.phone; });
  if(!valid.length){ toast('알림톡 발송 가능한 대상이 없습니다.', 'warning'); return; }
  if(!confirm(`[선택 일괄 알림톡]\n\n선택된 ${ids.length}건 중 ${valid.length}건을\n알림톡으로 발송하시겠습니까?`)) return;
  const btn = document.getElementById('cns-batch-kakao-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }
  let ok = 0;
  try {
    for(const c of valid){
      const emp = allEmployees.find(e => e.id === c.employee_id) || {};
      try{
        await _cnsSaveDispatchRecord({ method: 'kakao', status: 'completed', recipient: emp.phone || '', note:`선택 일괄 알림톡 — ${emp.name}`, contractId: c.id, empName: emp.name, coName: (allCompanies.find(x=>x.id===c.company_id)||{}).company_name||'' });
        ok++;
      } catch(e){}
    }
    toast(`선택 알림톡 완료 — ${ok}/${valid.length}건`, 'success');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = origHTML; }
    resetCnsSelection();
    await _cnsRefreshUnsent();
  }
}

/** 선택 일괄 이메일 발송 */
async function cnsBatchEmail(){
  const ids = cnsGetSelectedIds();
  if(!ids.length){ toast('선택된 항목이 없습니다.', 'warning'); return; }
  const list = _cnsGetUnsentContracts(_cnsSelectedYM.year, _cnsSelectedYM.month).filter(c => ids.includes(c.id));
  const valid = list.filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return emp && emp.email; });
  const noEmail = list.filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return !emp || !emp.email; });
  if(noEmail.length > 0){
    noEmail.forEach(c => {
      const cb = document.querySelector(`.cns-row-chk[data-contract-id="${c.id}"]`);
      if(cb) cb.checked = false;
    });
    cnsUpdateBatchBtns();
    const names = noEmail.map(c => (allEmployees.find(e=>e.id===c.employee_id)||{}).name||'?').join(', ');
    toast(`이메일 미등록 ${noEmail.length}건 선택 해제: ${names}`, 'warning');
  }
  if(!valid.length){ toast('이메일 발송 가능한 대상이 없습니다.', 'warning'); return; }
  if(!confirm(`[선택 일괄 이메일]\n\n이메일이 있는 ${valid.length}건을\n이메일로 발송하시겠습니까?`)) return;
  const btn = document.getElementById('cns-batch-email-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }
  let ok = 0;
  try {
    for(const c of valid){
      const emp = allEmployees.find(e => e.id === c.employee_id) || {};
      try{
        await _cnsSaveDispatchRecord({ method: 'email', status: 'completed', recipient: emp.email || '', note:`선택 일괄 이메일 — ${emp.name}`, contractId: c.id, empName: emp.name, coName: (allCompanies.find(x=>x.id===c.company_id)||{}).company_name||'' });
        ok++;
      } catch(e){}
    }
    toast(`선택 이메일 완료 — ${ok}/${valid.length}건`, 'success');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = origHTML; }
    resetCnsSelection();
    await _cnsRefreshUnsent();
  }
}

/** 선택 일괄 수동교부 처리 */
async function cnsBatchManual(){
  const ids = cnsGetSelectedIds();
  if(!ids.length){ toast('선택된 항목이 없습니다.', 'warning'); return; }
  if(!confirm(`[선택 일괄 수동교부]\n\n선택된 ${ids.length}건을\n수동교부 완료 처리하시겠습니까?`)) return;
  const btn = document.getElementById('cns-batch-manual-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }
  let ok = 0;
  try {
    for(const c of _cnsGetUnsentContracts(_cnsSelectedYM.year, _cnsSelectedYM.month).filter(c => ids.includes(c.id))){
      const emp = allEmployees.find(e => e.id === c.employee_id) || {};
      try{
        await _cnsSaveDispatchRecord({ method: 'manual', status: 'completed', recipient:'직접배부', note:`선택 일괄 수동교부 — ${emp.name}`, contractId: c.id, empName: emp.name, coName: (allCompanies.find(x=>x.id===c.company_id)||{}).company_name||'' });
        ok++;
      } catch(e){}
    }
    toast(`선택 수동교부 완료 — ${ok}/${ids.length}건`, 'success');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = origHTML; }
    resetCnsSelection();
    await _cnsRefreshUnsent();
  }
}

// ── 대시보드 미발송 정보제공동의서 알림 배너 ──
function _updateDashConsentBanner() {
  const section = document.getElementById('dash-consent-section');
  if (!section) return;

  if (typeof _heavyDataReady !== 'undefined' && !_heavyDataReady) return;

  const unsentList = _cnsGetUnsentContracts();
  const totalUnsent = unsentList.length;

  const consentInactive = totalUnsent === 0;
  const consentBg = consentInactive ? '#f9fafb' : '#f0fdf4';
  const consentBg2 = consentInactive ? '#f3f4f6' : '#dcfce7';
  const consentBorder = consentInactive ? '#e5e7eb' : '#22c55e';
  const consentIconBg = consentInactive ? '#d1d5db' : '#22c55e';
  const consentIconBg2 = consentInactive ? '#9ca3af' : '#16a34a';
  const consentTitle = consentInactive ? '#6b7280' : '#166534';
  const consentCount = consentInactive ? '#9ca3af' : '#16a34a';
  const consentSub = consentInactive ? '#9ca3af' : '#22c55e';
  const consentArrow = consentInactive ? '#d1d5db' : '#22c55e';

  section.style.display = '';
  section.innerHTML = `
    <div class="dash-alert-banner consent flat${consentInactive ? ' inactive' : ''}"
         ${consentInactive ? '' : `onclick="showPage('consent-dispatch', document.querySelector('.menu-item[data-page=\\'consent-dispatch\\']'))"`}
         style="--glow-color:rgba(34,197,94,.25);">
      <div class="dash-alert-banner-icon">
        <i class="fas fa-file-shield"></i>
      </div>
      <div class="dash-alert-banner-body">
        <div class="dash-alert-banner-title">
          정보제공동의서 미발송 <span class="dash-alert-banner-count">${totalUnsent}건</span>
        </div>
        <div class="dash-alert-banner-sub">${consentInactive ? '미발송 동의서가 없습니다' : `클릭하여 ${PAGE_LABELS['consent-dispatch']} 페이지로 이동`}</div>
      </div>
      ${consentInactive ? '' : '<div class="dash-alert-banner-arrow"><i class="fas fa-chevron-right"></i></div>'}
    </div>`;
  if(typeof _updateDashTodoGrid === 'function') _updateDashTodoGrid();
}
