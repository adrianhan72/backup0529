/**
 * consent-dispatch.js — 제3자 정보제공 동의서 발송 관리
 * 계약서 발송 관리(contract-dispatch.js)와 동일 구조
 */
window._consentDispatchList = window._consentDispatchList || [];
let _cnsPage = 1;
const _cnsPageSize = 10;

// ── 기간 검증: 최대 3개월 제한 (조회 버튼 클릭 시) ──
function _cnsDoSearch(){
  const fromEl = document.getElementById('cns-filter-date-from');
  const toEl = document.getElementById('cns-filter-date-to');
  const noticeEl = document.getElementById('cns-date-notice');
  if(!fromEl || !toEl) return;
  const fromVal = fromEl.value, toVal = toEl.value;
  const resetBorder = () => { fromEl.style.borderColor = '#d1d5db'; toEl.style.borderColor = '#d1d5db'; };
  if(fromVal && toVal){
    const from = new Date(fromVal);
    const to = new Date(toVal);
    if(!isNaN(from.getTime()) && !isNaN(to.getTime())){
      const maxFrom = new Date(to);
      maxFrom.setMonth(maxFrom.getMonth() - 3);
      if(from < maxFrom){
        fromEl.style.borderColor = '#dc2626';
        toEl.style.borderColor = '#dc2626';
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
      const recDate = (r.dispatched_at || r.created_at || '').slice(0, 10);
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
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#9ca3af;">
      <i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>발송 이력이 없습니다.</td></tr>`;
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
      kakao:  { bg:'#f9d000', color:'#3b1f00', icon:'M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z', isSvg:true },
      email:  { bg:'#dbeafe', color:'#1e40af', fa:'fa-envelope' },
      manual: { bg:'#d1fae5', color:'#065f46', fa:'fa-hand-holding' },
    };
    const c = cfg[m] || { bg:'#f3f4f6', color:'#374151', fa:'fa-question' };
    const label = { kakao:'알림톡', email:'이메일', manual:'수동교부' }[m] || m || '-';
    const iconHtml = c.isSvg
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="${c.color}"><path d="${c.icon}"/></svg>`
      : `<i class="fas ${c.fa}" style="font-size:11px;"></i>`;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;">${iconHtml}${label}</span>`;
  };

  const statusBadge = s => {
    const cfg = {
      completed: { bg:'#dcfce7', color:'#166534', fa:'fa-check-circle' },
      sent:      { bg:'#dcfce7', color:'#166534', fa:'fa-check-circle' },
      failed:    { bg:'#fee2e2', color:'#991b1b', fa:'fa-times-circle' },
      pending:   { bg:'#e0e7ff', color:'#3730a3', fa:'fa-clock' },
    };
    const c = cfg[s] || { bg:'#f3f4f6', color:'#374151', fa:'fa-circle' };
    const label = { completed:'완료', sent:'완료', failed:'실패', pending:'대기' }[s] || s || '-';
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:700;">
      <i class="fas ${c.fa}" style="font-size:10px;"></i>${label}
    </span>`;
  };

  const typeBadge = t => {
    const normalized = (typeof normalizeContractType === 'function') ? normalizeContractType(t) : t;
    const cfg = {
      regular:           { bg:'rgba(59,130,246,.1)',color:'#3b82f6' },
      regular_probation: { bg:'rgba(6,182,212,.1)',color:'#0891b2' },
      fixed:             { bg:'rgba(139,92,246,.1)',color:'#8b5cf6' },
      fixed_probation:   { bg:'rgba(236,72,153,.1)',color:'#db2777' },
      daily:             { bg:'rgba(234,88,12,.1)',color:'#ea580c' },
    };
    const c = cfg[normalized] || { bg:'#f3f4f6',color:'#374151' };
    const label = (typeof contractTypeLabel === 'function') ? contractTypeLabel(t) : (t || '-');
    return `<span style="background:${c.bg};color:${c.color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">${label}</span>`;
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
    const rowBg = idx % 2 === 0 ? '' : 'background:#fafafa;';
    return `<tr style="${rowBg}border-bottom:1px solid #f3f4f6;transition:background .1s;"
      onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${idx%2===0?'':'#fafafa'}'">
      <td style="padding:9px 12px;color:#374151;white-space:nowrap;">${fmtDt(r.dispatched_at)}</td>
      <td style="padding:9px 12px;font-weight:600;color:#1a1a2e;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.company_name||''}">${r.company_name||'-'}</td>
      <td style="padding:9px 12px;font-weight:700;color:#4f46e5;">${r.employee_name||'-'}</td>
      <td style="padding:9px 12px;">${typeBadge(r.contract_type)}</td>
      <td style="padding:9px 12px;text-align:center;">${methodBadge(r.dispatch_method)}</td>
      <td style="padding:9px 12px;font-size:12px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.recipient||''}">${r.recipient||'-'}</td>
      <td style="padding:9px 12px;text-align:center;">${statusBadge(r.dispatch_status)}</td>
      <td style="padding:9px 12px;font-size:12px;color:#6b7280;">${r.dispatched_by||'-'}</td>
      <td style="padding:9px 12px;text-align:center;white-space:nowrap;">${attachBtn(r.contract_id)}</td>
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
      const makeBtn = (label, page, disabled=false, active=false) =>
        `<button onclick="_cnsPage=${page};renderConsentDispatchPage()"
           style="min-width:30px;height:30px;padding:0 8px;border:1px solid ${active?'#6366f1':'#d1d5db'};
                  border-radius:6px;background:${active?'#6366f1':'#fff'};color:${active?'#fff':'#374151'};
                  font-size:12px;cursor:${disabled?'default':'pointer'};
                  font-family:inherit;font-weight:${active?'700':'400'};"
           ${disabled?'disabled':''}>${label}</button>`;
      const btns = [];
      btns.push(makeBtn('‹', Math.max(1,_cnsPage-1), _cnsPage===1));
      const start = Math.max(1, _cnsPage-2), end = Math.min(totalPages, _cnsPage+2);
      if(start > 1){ btns.push(makeBtn('1',1)); if(start>2) btns.push(`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`); }
      for(let p=start;p<=end;p++) btns.push(makeBtn(p,p,false,p===_cnsPage));
      if(end < totalPages){ if(end<totalPages-1) btns.push(`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`); btns.push(makeBtn(totalPages,totalPages)); }
      btns.push(makeBtn('›', Math.min(totalPages,_cnsPage+1), _cnsPage===totalPages));
      pagerEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;">
          <span style="font-size:12.5px;color:#64748b;">총 <strong>${total}</strong>건 중 ${s}–${e}번째</span>
          <div style="display:flex;align-items:center;gap:4px;">${btns.join('')}</div>
        </div>`;
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
    ![CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.CANCELED, CONTRACT_STATUS.TERMINATED].includes(c.status) &&
    !c.is_voided_by_amend &&
    !consentEmpIds.has(c.employee_id)
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
  if (totalBadge) totalBadge.textContent = allUnsent.length;

  const months = Object.keys(monthMap).sort().reverse().slice(0, 12);
  if (months.length === 0) {
    tabsEl.innerHTML = '<span class="pss-empty">미발송 동의서가 없습니다.</span>';
    return;
  }

  let html = '';
  months.forEach((ym, i) => {
    const [y, m] = ym.split('-');
    html += `<div class="cdp-month-tab${i === 0 ? ' active' : ''}" onclick="cnsSelectUnsentYM(${y},${parseInt(m)})">${y}년 ${String(m).padStart(2,'0')}월 <span class="cdp-tab-badge unsent">${monthMap[ym]}</span></div>`;
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
  const btnAll = document.getElementById('cns-unsent-send-all-btn');
  if (!tbody) return;

  let contracts;
  if (_cnsSelectedYM) {
    contracts = _cnsGetUnsentContracts(_cnsSelectedYM.year, _cnsSelectedYM.month);
  } else {
    contracts = _cnsGetUnsentContracts();
  }

  if (btnAll) btnAll.disabled = contracts.length === 0;

  if (contracts.length === 0) {
    if (clearEl) clearEl.style.display = '';
    if (wrapEl) wrapEl.style.display = 'none';
    return;
  }
  if (clearEl) clearEl.style.display = 'none';
  if (wrapEl) wrapEl.style.display = '';

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
      <td style="font-weight:700;color:#1f2937;">${empName}</td>
      <td><span class="badge ${typeof empCatBadge === 'function' ? empCatBadge(cat) : 'badge-gray'}" style="font-size:10.5px;padding:2px 7px;">${typeof contractTypeLabel === 'function' ? contractTypeLabel(cat) : cat}</span></td>
      <td style="font-size:12px;color:#374151;">${coName}</td>
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
          class="btn btn-success btn-sm">
          <i class="fas fa-hand-paper"></i> 수동교부
        </button>
      </td>
    </tr>`;
  }).join('');
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

// ── 대시보드 미발송 정보제공동의서 알림 배너 ──
function _updateDashConsentBanner() {
  const section = document.getElementById('dash-consent-section');
  if (!section) return;

  if (typeof _heavyDataReady !== 'undefined' && !_heavyDataReady) return;

  const unsentList = _cnsGetUnsentContracts();
  const totalUnsent = unsentList.length;

  if (totalUnsent === 0) {
    section.style.display = 'none';
    section.innerHTML = '';
    return;
  }

  section.style.display = '';
  section.innerHTML = `
    <div onclick="showPage('consent-dispatch', document.querySelector('.menu-item[data-page=\\'consent-dispatch\\']'))"
         style="cursor:pointer;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #22c55e;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 10px rgba(0,0,0,.07);"
         >
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas fa-file-shield" style="color:#fff;font-size:17px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:700;color:#166534;">
          정보제공동의서 미발송 <span style="color:#16a34a;font-size:16px;font-weight:800;">${totalUnsent}건</span>이 있습니다
        </div>
        <div style="font-size:12px;color:#22c55e;margin-top:3px;">클릭하여 ${PAGE_LABELS['consent-dispatch']} 페이지로 이동</div>
      </div>
      <div style="color:#22c55e;font-size:14px;flex-shrink:0;"><i class="fas fa-chevron-right"></i></div>
    </div>`;
  if(typeof _updateDashTodoGrid === 'function') _updateDashTodoGrid();
}
