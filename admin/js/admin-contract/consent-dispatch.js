/**
 * consent-dispatch.js — 제3자 정보제공 동의서 발송 관리
 * 계약서 발송 관리(contract-dispatch.js)와 동일 구조
 */
window._consentDispatchList = window._consentDispatchList || [];
let _cnsPage = 1;
const _cnsPageSize = 10;

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
  } catch (e) {
    console.error('[동의서발송이력 로드]', e);
    window._consentDispatchList = [];
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
    const cfg = { kakao: ['알림톡', '#fef3c7', '#92400e'], email: ['이메일', '#dbeafe', '#1e40af'], manual: ['수동교부', '#f3f4f6', '#374151'] };
    const [label, bg, color] = cfg[m] || ['-', '#f9fafb', '#6b7280'];
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11.5px;font-weight:600;background:${bg};color:${color};">${label}</span>`;
  };

  const statusBadge = s => {
    const cfg = { completed: ['완료', '#16a34a'], failed: ['실패', '#dc2626'], pending: ['대기', '#f59e0b'], sent: ['완료', '#16a34a'] };
    const [label, color] = cfg[s] || ['-', '#6b7280'];
    return `<span style="color:${color};font-weight:600;font-size:12px;">${label}</span>`;
  };

  tbody.innerHTML = pageData.map(r => {
    const ctype = (typeof CONTRACT_TYPE_LABEL !== 'undefined' && r.contract_type) ? (CONTRACT_TYPE_LABEL[r.contract_type] || r.contract_type) : (r.contract_type || '-');
    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 12px;">${fmtDt(r.dispatched_at)}</td>
      <td style="padding:8px 12px;">${r.company_name || '-'}</td>
      <td style="padding:8px 12px;font-weight:600;">${r.employee_name || '-'}</td>
      <td style="padding:8px 12px;">${ctype}</td>
      <td style="padding:8px 12px;text-align:center;">${methodBadge(r.dispatch_method)}</td>
      <td style="padding:8px 12px;">${r.recipient || '-'}</td>
      <td style="padding:8px 12px;text-align:center;">${statusBadge(r.dispatch_status)}</td>
      <td style="padding:8px 12px;">${r.dispatched_by || '-'}</td>
      <td style="padding:8px 12px;text-align:center;">${r.contract_id ? `<button onclick="viewContract('${r.contract_id}')" class="btn btn-sm btn-secondary" style="font-size:11px;"><i class="fas fa-file-contract"></i></button>` : '-'}</td>
    </tr>`;
  }).join('');

  // 페이지네이션
  const pagerEl = document.getElementById('cns-pagination');
  if (pagerEl && totalPages > 1) {
    let html = '';
    html += `<button onclick="_cnsPage=1;renderConsentDispatchPage()" ${_cnsPage === 1 ? 'disabled' : ''} style="padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;">&laquo;</button>`;
    html += `<button onclick="_cnsPage=Math.max(1,_cnsPage-1);renderConsentDispatchPage()" ${_cnsPage === 1 ? 'disabled' : ''} style="padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;">&lsaquo;</button>`;
    for (let p = Math.max(1, _cnsPage - 3); p <= Math.min(totalPages, _cnsPage + 3); p++) {
      html += `<button onclick="_cnsPage=${p};renderConsentDispatchPage()" style="padding:4px 10px;border:1px solid ${p === _cnsPage ? '#6366f1' : '#d1d5db'};border-radius:6px;background:${p === _cnsPage ? '#eef2ff' : '#fff'};cursor:pointer;font-size:12px;font-weight:${p === _cnsPage ? '700' : '400'};">${p}</button>`;
    }
    html += `<button onclick="_cnsPage=Math.min(totalPages,_cnsPage+1);renderConsentDispatchPage()" ${_cnsPage === totalPages ? 'disabled' : ''} style="padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;">&rsaquo;</button>`;
    html += `<button onclick="_cnsPage=${totalPages};renderConsentDispatchPage()" ${_cnsPage === totalPages ? 'disabled' : ''} style="padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;">&raquo;</button>`;
    pagerEl.innerHTML = html;
  } else if (pagerEl) {
    pagerEl.innerHTML = '';
  }
}

// ── 미발송 동의서 조회 ──
// 이미 제3자 정보제공 동의서를 교부한 이력이 있는 직원은 제외
function _cnsGetUnsentContracts(year, month) {
  const allContracts_filtered = (allContracts || []).filter(c =>
    !c.is_draft &&
    ![CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.CANCELED, CONTRACT_STATUS.TERMINATED].includes(c.status) &&
    !c.is_voided_by_amend
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

  const months = Object.keys(monthMap).sort().reverse().slice(0, 12);
  if (months.length === 0) {
    tabsEl.innerHTML = '<span class="pss-empty">미발송 동의서가 없습니다.</span>';
    return;
  }

  let html = '';
  months.forEach((ym, i) => {
    const [y, m] = ym.split('-');
    html += `<button class="cdp-month-tab${i === 0 ? ' active' : ''}" onclick="cnsSelectUnsentYM(${y},${parseInt(m)})">${y}년 ${parseInt(m)}월<span class="cdp-month-tab-count">${monthMap[ym]}</span></button>`;
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
  if (event && event.target) event.target.classList.add('active');
  renderCnsUnsentList();
}

function renderCnsUnsentList() {
  const tbody = document.getElementById('cns-unsent-tbody');
  const badgeEl = document.getElementById('cns-unsent-total-badge');
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

  // 이미 동의서 교부 이력이 있는 직원 제외
  const consentEmpIds = new Set(
    (window._consentDispatchList || []).filter(r => r.dispatch_status === 'sent' || r.dispatch_status === 'completed').map(r => r.employee_id)
  );
  contracts = contracts.filter(c => !consentEmpIds.has(c.employee_id));

  if (badgeEl) badgeEl.textContent = contracts.length;
  if (btnAll) btnAll.disabled = contracts.length === 0;

  if (contracts.length === 0) {
    if (clearEl) clearEl.style.display = '';
    if (wrapEl) wrapEl.style.display = 'none';
    return;
  }
  if (clearEl) clearEl.style.display = 'none';
  if (wrapEl) wrapEl.style.display = '';

  const ctypeLabel = (ct) => {
    if (typeof CONTRACT_TYPE_LABEL !== 'undefined') return CONTRACT_TYPE_LABEL[ct] || ct;
    return ct || '-';
  };

  tbody.innerHTML = contracts.map(c => {
    const emp = (allEmployees || []).find(e => e.id === c.employee_id);
    const co = (allCompanies || []).find(x => x.id === c.company_id);
    const empName = emp ? emp.name : '-';
    const coName = co ? co.company_name : '-';
    const phone = emp ? (emp.phone || '-') : '-';
    const email = emp ? (emp.email || '-') : '-';

    return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 12px;font-weight:600;">${empName}</td>
      <td style="padding:8px 12px;">${ctypeLabel(c.contract_type)}</td>
      <td style="padding:8px 12px;">${coName}</td>
      <td style="padding:8px 12px;">${c.contract_start || '-'}</td>
      <td style="padding:8px 12px;">${phone}</td>
      <td style="padding:8px 12px;">${email || '-'}</td>
      <td style="padding:8px 12px;text-align:center;"><button onclick="viewContract('${c.id}')" class="btn btn-sm btn-secondary" style="font-size:11px;"><i class="fas fa-file-contract"></i></button></td>
      <td style="padding:8px 12px;text-align:center;">
        <button onclick="cnsUnsentKakao('${c.id}','${empName}','${phone}','${coName}')" style="padding:3px 8px;border:1px solid #fbbf24;border-radius:5px;background:#fffbeb;color:#92400e;cursor:pointer;font-size:11px;font-weight:600;margin-right:4px;" ${!phone ? 'disabled' : ''} title="알림톡 발송"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg></button>
        <button onclick="cnsUnsentEmail('${c.id}','${empName}','${email}','${coName}')" style="padding:3px 8px;border:1px solid #93c5fd;border-radius:5px;background:#eff6ff;color:#1e40af;cursor:pointer;font-size:11px;font-weight:600;margin-right:4px;" ${!email ? 'disabled' : ''} title="이메일 발송"><i class="fas fa-envelope"></i></button>
        <button onclick="cnsUnsentManual('${c.id}','${empName}','${coName}')" style="padding:3px 8px;border:1px solid #d1d5db;border-radius:5px;background:#f9fafb;color:#374151;cursor:pointer;font-size:11px;font-weight:600;" title="수동교부"><i class="fas fa-check"></i></button>
      </td>
    </tr>`;
  }).join('');
}

// ── 개별 발송 ──
async function cnsUnsentKakao(contractId, empName, phone, coName) {
  if (!confirm(`'${empName}'님에게 제3자 정보제공 동의서를 알림톡으로 발송하시겠습니까?\n수신번호: ${phone}`)) return;
  await _cnsSaveDispatchRecord({ method: 'kakao', status: 'completed', recipient: phone, note: '알림톡 발송', contractId, empName, coName });
}

async function cnsUnsentEmail(contractId, empName, email, coName) {
  if (!confirm(`'${empName}'님에게 제3자 정보제공 동의서를 이메일로 발송하시겠습니까?\n수신주소: ${email}`)) return;
  await _cnsSaveDispatchRecord({ method: 'email', status: 'completed', recipient: email, note: '이메일 발송', contractId, empName, coName });
}

async function cnsUnsentManual(contractId, empName, coName) {
  if (!confirm(`'${empName}'님에게 제3자 정보제공 동의서를 수동교부 처리하시겠습니까?`)) return;
  await _cnsSaveDispatchRecord({ method: 'manual', status: 'completed', recipient: '수동교부', note: '수동교부', contractId, empName, coName });
}

async function cnsSendAllKakao() {
  if (!_cnsSelectedYM) return;
  const contracts = _cnsGetUnsentContracts(_cnsSelectedYM.year, _cnsSelectedYM.month);
  const consentEmpIds = new Set((window._consentDispatchList || []).filter(r => r.dispatch_status === 'sent' || r.dispatch_status === 'completed').map(r => r.employee_id));
  const unsent = contracts.filter(c => !consentEmpIds.has(c.employee_id));
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
  } catch (e) {
    console.error('[동의서발송 저장]', e);
    toast('발송 기록 저장에 실패했습니다.', 'error');
    throw e;
  }
}

async function _cnsRefreshUnsent() {
  await loadConsentDispatchList(true);
  renderCnsUnsentMonthTabs();
  await renderConsentDispatchPage();
}
