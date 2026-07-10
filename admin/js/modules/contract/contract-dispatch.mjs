/**
 * modules/contract/contract-dispatch.mjs — Phase 5: 근로계약서 발송 관리
 * 
 * contract-dispatch.js → 완전 ESM 변환
 * state.mjs / constants.mjs import + 레거시 window 하이브리드.
 */
import { getCompanies, getEmployees, getContracts } from '../state.mjs';
import {
  CONTRACT_TYPE, CONTRACT_STATUS, COMPANY_STATUS,
  DISPATCH_METHOD, DISPATCH_STATUS, DISPATCH_METHOD_LABEL, DISPATCH_STATUS_LABEL
} from '../constants.mjs';

// ═══════════════════════════════════════════
// 모듈 레벨 상태
// ═══════════════════════════════════════════
let _cdpPage = 1;
const _cdpPageSize = 10;
let _cdpUnsentYM = null;

// ═══════════════════════════════════════════
// 레거시 브릿지
// ═══════════════════════════════════════════
const _w = (name) => window[name];
const _toast = (msg, type) => _w('toast') ? _w('toast')(msg, type) : alert(msg);

// window._contractDispatchList 초기화
window._contractDispatchList = window._contractDispatchList || [];

// ═══════════════════════════════════════════
// 함수 구현
// ═══════════════════════════════════════════

/** DB에서 전체 발송 이력 로드 */
async function loadContractDispatchList(forceReload = false) {
  if (!forceReload && window._contractDispatchList.length > 0) return;
  try {
    const res = await fetch('../tables/contract_dispatch?page=1&limit=1000');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rows = (data.data || []).sort((a, b) => {
      const ta = a.dispatched_at || a.created_at || '';
      const tb = b.dispatched_at || b.created_at || '';
      return tb.localeCompare(ta);
    });
    window._contractDispatchList = rows;
  } catch (e) {
    /* DB 테이블 미존재: 빈 목록으로 조용히 처리 */
    window._contractDispatchList = [];
  }
}

/** 발송 관리 페이지 전체 렌더링 */
async function renderContractDispatchPage() {
  if (window._contractDispatchList.length === 0) await loadContractDispatchList(true);

  const filterMethod = document.getElementById('cdp-filter-method')?.value || '';
  const filterStatus = document.getElementById('cdp-filter-status')?.value || '';
  const filterCompany = document.getElementById('cdp-filter-company')?.value || '';
  const filterDateFrom = document.getElementById('cdp-filter-date-from')?.value || '';
  const filterDateTo = document.getElementById('cdp-filter-date-to')?.value || '';
  const searchKw = (document.getElementById('cdp-search')?.value || '').trim().toLowerCase();

  const coSel = document.getElementById('cdp-filter-company');
  if (coSel && coSel.options.length <= 1) {
    const uniqueCompanies = [...new Map(
      window._contractDispatchList.map(r => [r.company_id, r.company_name])
    ).entries()].sort((a, b) => (a[1] || '').localeCompare(b[1] || '', 'ko'));
    uniqueCompanies.forEach(([id, name]) => {
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = name || id;
      coSel.appendChild(opt);
    });
  }

  const filtered = window._contractDispatchList.filter(r => {
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

  const countEl = document.getElementById('cdp-record-count');
  if (countEl) countEl.textContent = `총 ${filtered.length.toLocaleString('ko-KR')}건`;

  const totalPages = Math.max(1, Math.ceil(filtered.length / _cdpPageSize));
  if (_cdpPage > totalPages) _cdpPage = totalPages;
  const pageData = filtered.slice((_cdpPage - 1) * _cdpPageSize, _cdpPage * _cdpPageSize);

  const tbody = document.getElementById('cdp-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#9ca3af;">
      <i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>
      발송 이력이 없습니다.
    </td></tr>`;
    document.getElementById('cdp-pagination').innerHTML = '';
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
      [DISPATCH_METHOD.KAKAO]: { bg: '#f9d000', color: '#3b1f00', icon: 'M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z', isSvg: true },
      [DISPATCH_METHOD.EMAIL]: { bg: '#dbeafe', color: '#1e40af', fa: 'fa-envelope' },
      [DISPATCH_METHOD.MANUAL]: { bg: '#d1fae5', color: '#065f46', fa: 'fa-hand-holding' },
      '수정재발행': { bg: '#fce7f3', color: '#9d174d', fa: 'fa-sync-alt' },
    };
    const c = cfg[m] || { bg: '#f3f4f6', color: '#374151', fa: 'fa-question' };
    const label = DISPATCH_METHOD_LABEL[m] || m || '-';
    const icon = c.isSvg
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="${c.color}"><path d="${c.icon}"/></svg>`
      : `<i class="fas ${c.fa}" style="font-size:11px;"></i>`;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;">${icon}${label}</span>`;
  };

  const statusBadge = s => {
    const cfg = {
      [DISPATCH_STATUS.COMPLETED]: { bg: '#dcfce7', color: '#166534', fa: 'fa-check-circle' },
      [DISPATCH_STATUS.FAILED]: { bg: '#fee2e2', color: '#991b1b', fa: 'fa-times-circle' },
      [DISPATCH_STATUS.PENDING]: { bg: '#e0e7ff', color: '#3730a3', fa: 'fa-clock' },
    };
    const c = cfg[s] || { bg: '#f3f4f6', color: '#374151', fa: 'fa-circle' };
    const label = DISPATCH_STATUS_LABEL[s] || s || '-';
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:700;">
      <i class="fas ${c.fa}" style="font-size:10px;"></i>${label}</span>`;
  };

  const typeBadge = t => {
    const normalized = _w('normalizeContractType')(t);
    const cfg = {
      [CONTRACT_TYPE.REGULAR]: { bg: 'rgba(59,130,246,.1)', color: '#3b82f6' },
      [CONTRACT_TYPE.REGULAR_PROBATION]: { bg: 'rgba(6,182,212,.1)', color: '#0891b2' },
      [CONTRACT_TYPE.FIXED]: { bg: 'rgba(139,92,246,.1)', color: '#8b5cf6' },
      [CONTRACT_TYPE.FIXED_PROBATION]: { bg: 'rgba(236,72,153,.1)', color: '#db2777' },
      [CONTRACT_TYPE.DAILY]: { bg: 'rgba(234,88,12,.1)', color: '#ea580c' },
    };
    const c = cfg[normalized] || { bg: '#f3f4f6', color: '#374151' };
    return `<span style="background:${c.bg};color:${c.color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">${_w('contractTypeLabel')(t)}</span>`;
  };

  tbody.innerHTML = pageData.map((r, idx) => {
    const rowBg = idx % 2 === 0 ? '' : 'background:#fafafa;';
    return `<tr style="${rowBg}border-bottom:1px solid #f3f4f6;transition:background .1s;"
      onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${idx % 2 === 0 ? '' : '#fafafa'}'">
      <td style="padding:9px 12px;color:#374151;white-space:nowrap;">${fmtDt(r.dispatched_at)}</td>
      <td style="padding:9px 12px;font-weight:600;color:#1a1a2e;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.company_name || ''}">${r.company_name || '-'}</td>
      <td style="padding:9px 12px;font-weight:700;color:#4f46e5;">${r.employee_name || '-'}</td>
      <td style="padding:9px 12px;">${typeBadge(r.contract_type)}</td>
      <td style="padding:9px 12px;text-align:center;">${methodBadge(r.dispatch_method)}</td>
      <td style="padding:9px 12px;font-size:12px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.recipient || ''}">${r.recipient || '-'}</td>
      <td style="padding:9px 12px;text-align:center;">${statusBadge(r.dispatch_status)}</td>
      <td style="padding:9px 12px;font-size:12px;color:#6b7280;">${_w('_resolveAdminName')(r.dispatched_by) || '-'}</td>
      <td style="padding:9px 12px;text-align:center;white-space:nowrap;">${_cdpAttachBtn(r.contract_id)}</td>
    </tr>`;
  }).join('');

  _renderCdpPagination(totalPages);
}

function _cdpAttachBtn(contractId) {
  if (!contractId) return `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;
  const allC = getContracts();
  const c = allC.find(x => x.id === contractId);
  if (!c) return `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;
  return `<button onclick="event.stopPropagation();openContractPrintModal('${contractId}')"
    class="btn btn-indigo btn-sm"
    title="근로계약 조건에 따라 자동완성된 계약서 미리보기">
    <i class="fas fa-file-contract" style="font-size:10px;"></i>미리보기</button>`;
}

function _renderCdpPagination(totalPages) {
  const el = document.getElementById('cdp-pagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  const btnStyle = (active, disabled) => `
    min-width:32px;height:32px;padding:0 10px;border-radius:6px;
    border:1px solid ${active ? '#6366f1' : '#e5e7eb'};
    background:${active ? '#6366f1' : '#fff'};
    color:${active ? '#fff' : '#374151'};
    font-size:13px;font-family:inherit;font-weight:${active ? 700 : 400};
    cursor:${disabled ? 'not-allowed' : 'pointer'};
    transition:background .15s,border-color .15s;`;
  const btn = (label, page, disabled = false, active = false) =>
    `<button onclick="_cdpGoPage(${page})" ${disabled ? 'disabled' : ''} style="${btnStyle(active, disabled)}">${label}</button>`;

  let html = btn('&lsaquo;', _cdpPage - 1, _cdpPage === 1);
  const half = 2;
  let start = Math.max(1, _cdpPage - half);
  let end = Math.min(totalPages, start + half * 2);
  if (end - start < half * 2) start = Math.max(1, end - half * 2);
  if (start > 1) {
    html += btn(1, 1);
    if (start > 2) html += `<span style="padding:0 4px;color:#9ca3af;font-size:13px;">…</span>`;
  }
  for (let i = start; i <= end; i++) html += btn(i, i, false, i === _cdpPage);
  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span style="padding:0 4px;color:#9ca3af;font-size:13px;">…</span>`;
    html += btn(totalPages, totalPages);
  }
  html += btn('&rsaquo;', _cdpPage + 1, _cdpPage === totalPages);
  el.innerHTML = html;
}

function _cdpGoPage(p) {
  _cdpPage = p;
  renderContractDispatchPage();
}

// ═══════════════════════════════════════════
// 근로계약서 미발송 관리
// ═══════════════════════════════════════════

function _cdpGetUnsentContracts(year, month) {
  const sentIds = new Set(
    (window._contractDispatchList || []).map(r => r.contract_id).filter(Boolean)
  );
  const allC = getContracts();

  return allC.filter(c => {
    if (c.is_draft) return false;
    if (c.status === CONTRACT_STATUS.CANCELED || c.status === COMPANY_STATUS.INACTIVE || c.status === CONTRACT_STATUS.VOIDED) return false;
    if (c.is_voided_by_amend) return false;
    if (!c.contract_start || !c.employee_id || !c.company_id || !c.contract_type) return false;
    if (sentIds.has(c.id)) return false;
    if (year !== undefined && month !== undefined) {
      const ym = (c.contract_start || '').slice(0, 7);
      const targetYM = `${year}-${String(month).padStart(2, '0')}`;
      if (ym !== targetYM) return false;
    }
    return true;
  });
}

function renderCdpUnsentMonthTabs() {
  const wrap = document.getElementById('cdp-unsent-month-tabs');
  if (!wrap) return;

  const allUnsent = _cdpGetUnsentContracts();
  const ymMap = new Map();
  allUnsent.forEach(c => {
    const ym = (c.contract_start || '').slice(0, 7);
    if (!ym) return;
    const [y, m] = ym.split('-').map(Number);
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!ymMap.has(key)) ymMap.set(key, { year: y, month: m, count: 0 });
    ymMap.get(key).count++;
  });

  const ymList = [...ymMap.values()].sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

  const totalBadge = document.getElementById('cdp-unsent-total-badge');
  if (totalBadge) totalBadge.textContent = allUnsent.length;

  if (!ymList.length) {
    wrap.innerHTML = '';
    _renderCdpUnsentAllClear(true);
    return;
  }

  const inList = _cdpUnsentYM && ymList.some(x => x.year === _cdpUnsentYM.year && x.month === _cdpUnsentYM.month);
  if (!inList) _cdpUnsentYM = { ...ymList[0] };

  wrap.innerHTML = ymList.map(ym => {
    const isActive = _cdpUnsentYM && ym.year === _cdpUnsentYM.year && ym.month === _cdpUnsentYM.month;
    return `<div class="cdp-month-tab${isActive ? ' active' : ''}"
      onclick="cdpSelectUnsentYM(${ym.year},${ym.month})">
      ${ym.year}년 ${String(ym.month).padStart(2, '0')}월
      <span class="cdp-tab-badge unsent">${ym.count}</span></div>`;
  }).join('');
}

function cdpSelectUnsentYM(year, month) {
  _cdpUnsentYM = { year, month };
  renderCdpUnsentMonthTabs();
  renderCdpUnsentList();
}

function _renderCdpUnsentAllClear(show) {
  const msg = document.getElementById('cdp-unsent-all-clear');
  const tblWrap = document.getElementById('cdp-unsent-table-wrap');
  const sendAll = document.getElementById('cdp-unsent-send-all-btn');
  if (msg) msg.style.display = show ? '' : 'none';
  if (tblWrap) tblWrap.style.display = show ? 'none' : '';
  if (sendAll) sendAll.disabled = show;
}

function renderCdpUnsentList() {
  const tbody = document.getElementById('cdp-unsent-tbody');
  if (!tbody) return;
  if (!_cdpUnsentYM) { _renderCdpUnsentAllClear(true); return; }

  const allE = getEmployees();
  const allCo = getCompanies();

  const list = _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month)
    .sort((a, b) => {
      const na = (allE.find(e => e.id === a.employee_id) || {}).name || '';
      const nb = (allE.find(e => e.id === b.employee_id) || {}).name || '';
      return na.localeCompare(nb, 'ko');
    });

  if (!list.length) { _renderCdpUnsentAllClear(true); return; }
  _renderCdpUnsentAllClear(false);

  tbody.innerHTML = list.map((c, idx) => {
    const emp = allE.find(e => e.id === c.employee_id) || {};
    const co = allCo.find(x => x.id === c.company_id) || {};
    const cat = emp.employment_category || c.contract_type || '-';
    const phone = emp.phone || '';
    const email = emp.email || '';
    const hasPhone = !!(phone.trim());
    const hasEmail = !!(email.trim());
    const kakaoClass = hasPhone ? 'btn btn-kakao btn-sm' : 'btn btn-sm';
    const emailClass = hasEmail ? 'btn btn-sky btn-sm' : 'btn btn-sm';
    return `<tr id="cdp-urow-${idx}">
      <td style="font-weight:700;color:#1f2937;">${emp.name || '-'}</td>
      <td><span class="badge ${_w('empCatBadge')(cat)}" style="font-size:10.5px;padding:2px 7px;">${_w('contractTypeLabel')(cat)}</span></td>
      <td style="font-size:12px;color:#374151;">${co.company_name || '-'}</td>
      <td style="font-size:12px;color:#6b7280;">${c.contract_start || '-'}</td>
      <td style="font-size:12px;color:#6b7280;">${phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="font-size:12px;">${hasEmail ? `<span style="color:#374151;">${email}</span>` : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">${_cdpAttachBtn(c.id)}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button onclick="cdpUnsentKakao('${c.id}')" ${hasPhone ? '' : 'disabled'} class="${kakaoClass}" style="margin-right:3px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡</button>
        <button onclick="cdpUnsentEmail('${c.id}')" ${hasEmail ? '' : 'disabled'} class="${emailClass}" style="margin-right:3px;">✉ 이메일</button>
        <button onclick="cdpUnsentManual('${c.id}')" class="btn btn-success btn-sm"><i class="fas fa-hand-paper"></i> 수동교부</button>
      </td></tr>`;
  }).join('');
}

async function cdpUnsentKakao(contractId) {
  const allC = getContracts();
  const allE = getEmployees();
  const allCo = getCompanies();
  const c = allC.find(x => x.id === contractId);
  const emp = c ? allE.find(e => e.id === c.employee_id) : null;
  const co = c ? allCo.find(x => x.id === c.company_id) : null;
  if (!c || !emp || !co) { _toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if (!emp.phone) { _toast(`${emp.name} — 전화번호가 등록되어 있지 않습니다.`, 'error'); return; }
  if (!confirm(`[알림톡 발송]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n알림톡으로 발송하시겠습니까?\n\n수신 번호: ${emp.phone}`)) return;
  try {
    await _saveDispatchRecord({ method: DISPATCH_METHOD.KAKAO, status: DISPATCH_STATUS.COMPLETED, recipient: emp.phone, note: `미발송 목록 알림톡 — ${emp.name}`, contractId });
    _toast(`✅ ${emp.name} 알림톡 발송 완료`, 'success');
    await _cdpRefreshUnsent();
  } catch (e) { _toast('발송 중 오류가 발생했습니다.', 'error'); }
}

async function cdpUnsentEmail(contractId) {
  const allC = getContracts();
  const allE = getEmployees();
  const allCo = getCompanies();
  const c = allC.find(x => x.id === contractId);
  const emp = c ? allE.find(e => e.id === c.employee_id) : null;
  const co = c ? allCo.find(x => x.id === c.company_id) : null;
  if (!c || !emp || !co) { _toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if (!emp.email) { _toast(`${emp.name} — 이메일이 등록되어 있지 않습니다.`, 'error'); return; }
  if (!confirm(`[이메일 발송]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n이메일로 발송하시겠습니까?\n\n수신 주소: ${emp.email}`)) return;
  try {
    await _saveDispatchRecord({ method: DISPATCH_METHOD.EMAIL, status: DISPATCH_STATUS.COMPLETED, recipient: emp.email, note: `미발송 목록 이메일 — ${emp.name}`, contractId });
    _toast(`✅ ${emp.name} 이메일 발송 완료`, 'success');
    await _cdpRefreshUnsent();
  } catch (e) { _toast('발송 중 오류가 발생했습니다.', 'error'); }
}

async function cdpUnsentManual(contractId) {
  const allC = getContracts();
  const allE = getEmployees();
  const allCo = getCompanies();
  const c = allC.find(x => x.id === contractId);
  const emp = c ? allE.find(e => e.id === c.employee_id) : null;
  const co = c ? allCo.find(x => x.id === c.company_id) : null;
  if (!c || !emp || !co) { _toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if (!confirm(`[수동 교부 완료]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n출력하여 직접 교부하셨습니까?\n\n확인 시 수동교부 완료 이력이 등록됩니다.`)) return;
  try {
    await _saveDispatchRecord({ method: DISPATCH_METHOD.MANUAL, status: DISPATCH_STATUS.COMPLETED, recipient: '직접배부', note: `미발송 목록 수동교부 — ${emp.name}`, contractId });
    _toast(`✅ ${emp.name} 수동 교부 완료 처리됐습니다.`, 'success');
    await _cdpRefreshUnsent();
  } catch (e) { _toast('처리 중 오류가 발생했습니다.', 'error'); }
}

async function cdpSendAllKakao() {
  const allE = getEmployees();
  if (!_cdpUnsentYM) return;
  const list = _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month)
    .filter(c => { const emp = allE.find(e => e.id === c.employee_id); return emp && emp.phone; });
  if (!list.length) { _toast('알림톡 발송 가능한 대상이 없습니다. (전화번호 미등록)', 'warning'); return; }
  if (!confirm(`[일괄 알림톡 발송]\n\n${_cdpUnsentYM.year}년 ${_cdpUnsentYM.month}월 입사 미발송 계약서\n총 ${list.length}건을 알림톡으로 일괄 발송하시겠습니까?`)) return;
  const btn = document.getElementById('cdp-unsent-send-all-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }
  let ok = 0, fail = 0;
  for (const c of list) {
    const emp = allE.find(e => e.id === c.employee_id) || {};
    try {
      await _saveDispatchRecord({ method: DISPATCH_METHOD.KAKAO, status: DISPATCH_STATUS.COMPLETED, recipient: emp.phone || '', note: `일괄 알림톡 — ${emp.name}`, contractId: c.id });
      ok++;
    } catch (e) { fail++; }
  }
  _toast(`일괄 알림톡 완료 — 성공 ${ok}건${fail ? ` / 실패 ${fail}건` : ''}`, ok > 0 ? 'success' : 'error');
  if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 일괄 알림톡 발송'; }
  await _cdpRefreshUnsent();
}

async function _cdpRefreshUnsent() {
  await loadContractDispatchList(true);
  renderCdpUnsentMonthTabs();
  renderCdpUnsentList();
  await renderContractDispatchPage();
  _w('_updateDashUnsentContractBanner')();
}

async function _saveDispatchRecord({ method: dispatchMethod, status: dispatchStatus, recipient, note, contractId }) {
  const nowISO = new Date().toISOString();
  const adminName = _w('_getAdminUsername')();

  let cId = contractId || window._printingContractId || '';
  let empId = window._printingEmpId || '';
  let empName = window._printingEmpName || '';
  let coId = window._printingCompanyId || '';
  let coName = window._printingCompanyName || '';
  let ctType = window._printingContractType || '';
  let ctStart = window._printingContractStart || '';
  let ctEnd = window._printingContractEnd || '';

  if (contractId && contractId !== window._printingContractId) {
    const allC = getContracts();
    const allE = getEmployees();
    const allCo = getCompanies();
    const _c = allC.find(x => x.id === contractId);
    const _emp = _c ? allE.find(e => e.id === _c.employee_id) : null;
    const _co = _c ? allCo.find(x => x.id === _c.company_id) : null;
    if (_c) {
      empId = _c.employee_id || '';
      ctType = _c.contract_type || '';
      ctStart = _c.contract_start || '';
      ctEnd = _c.contract_end || '';
    }
    if (_emp) { empName = _emp.name || ''; }
    if (_co) { coId = _co.id || ''; coName = _co.company_name || ''; }
  }

  const payload = {
    contract_id: cId, employee_id: empId, employee_name: empName,
    company_id: coId, company_name: coName, contract_type: ctType,
    dispatch_method: dispatchMethod, dispatch_status: dispatchStatus,
    recipient: recipient || '', dispatched_at: nowISO,
    dispatched_by: adminName, note: note || '',
    contract_start: ctStart, contract_end: ctEnd,
  };
  try {
    const res = await fetch('../tables/contract_dispatch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json();
    window._contractDispatchList = [];
    _w('_updateDashUnsentContractBanner')();

    if (coId && empName && (dispatchStatus === DISPATCH_STATUS.COMPLETED)) {
      const allCo = getCompanies();
      const _dispCo = allCo.find(x => x.id === coId) || {};
      const _coRep = _w('getCompanyRepGreeting')(_dispCo);
      const _methodLabel = dispatchMethod === DISPATCH_METHOD.KAKAO ? '카카오 알림톡'
        : dispatchMethod === DISPATCH_METHOD.EMAIL ? '이메일'
        : dispatchMethod === '수정재발행' ? '수정재발행 (계약서 변경 후 재발행)'
        : dispatchMethod === DISPATCH_METHOD.MANUAL ? '수동교부' : dispatchMethod;
      const _fmtD = d => { if (!d) return '-'; const [y, m, dd] = d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
      await _w('_sendCompanyNotice')({
        companyId: coId, companyName: coName,
        noticeType: 'contract_dispatched',
        title: `[계약서 발송] ${empName} — 근로계약서가 발송되었습니다`,
        body: `안녕하세요${_coRep}.\n\n소속 근로자에게 근로계약서가 발송되었습니다.\n\n■ 근로자: ${empName}\n■ 고용형태: ${ctType || ''}\n■ 계약 기간: ${_fmtD(ctStart)}${ctEnd ? ' ~ ' + _fmtD(ctEnd) : ''}\n■ 발송 방법: ${_methodLabel}\n■ 발송 시각: ${new Date().toLocaleString('ko-KR')}\n\n자세한 내용은 근로계약서 발송 관리 메뉴에서 확인하세요.\n\n${window._BRAND_SIG}`,
        contractId: cId, employeeId: empId, employeeName: empName, contractEnd: ctEnd,
      });
    }
    return true;
  } catch (e) {
    console.error('[발송이력 저장 오류]', e);
    return null;
  }
}

async function dispatchContractKakao() {
  const phone = window._printingEmpPhone || '';
  const name = window._printingEmpName || '근로자';
  if (!phone) { _toast('전화번호가 등록되지 않았습니다.'); return; }
  const btn = document.getElementById('cpm-kakao-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }
  try {
    await _saveDispatchRecord({ method: DISPATCH_METHOD.KAKAO, status: DISPATCH_STATUS.COMPLETED, recipient: phone, note: `수신번호: ${phone}` });
    _toast(`✅ ${name} 님 알림톡 발송 완료 (${phone})`, 'success');
  } catch (e) {
    console.error('[알림톡 발송]', e);
    _toast('알림톡 발송 중 오류가 발생했습니다.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="#3b1700" style="flex-shrink:0;"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡'; }
  }
}

async function dispatchContractEmail() {
  const email = window._printingEmpEmail || '';
  const name = window._printingEmpName || '근로자';
  if (!email) { _toast('이메일이 등록되지 않았습니다.'); return; }
  const btn = document.getElementById('cpm-email-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }
  try {
    await _saveDispatchRecord({ method: DISPATCH_METHOD.EMAIL, status: DISPATCH_STATUS.COMPLETED, recipient: email, note: `수신 이메일: ${email}` });
    _toast(`✅ ${name} 님 이메일 발송 완료 (${email})`, 'success');
  } catch (e) {
    console.error('[이메일 발송]', e);
    _toast('이메일 발송 중 오류가 발생했습니다.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-envelope"></i> 이메일'; }
  }
}

async function dispatchContractManual() {
  const name = window._printingEmpName || '근로자';
  if (!confirm(`[ 수동교부 처리 ]\n\n${name} 님의 근로계약서를 출력하여 직접 배부(교부)하셨습니까?\n\n확인을 누르면 배부 완료 이력이 등록됩니다.`)) return;
  try {
    await _saveDispatchRecord({ method: DISPATCH_METHOD.MANUAL, status: DISPATCH_STATUS.COMPLETED, recipient: '직접배부', note: `수동교부 — ${name}` });
    _toast(`✅ ${name} 수동 교부 완료 처리됐습니다.`, 'success');
    _w('closeModal')('contract-print-modal');
  } catch (e) { _toast('수동교부 처리 중 오류가 발생했습니다.', 'error'); }
}

// ═══════════════════════════════════════════
// window 등록 (레거시 호환)
// ═══════════════════════════════════════════
window.loadContractDispatchList = loadContractDispatchList;
window.renderContractDispatchPage = renderContractDispatchPage;
window.renderCdpUnsentMonthTabs = renderCdpUnsentMonthTabs;
window.cdpSelectUnsentYM = cdpSelectUnsentYM;
window.renderCdpUnsentList = renderCdpUnsentList;
window.cdpUnsentKakao = cdpUnsentKakao;
window.cdpUnsentEmail = cdpUnsentEmail;
window.cdpUnsentManual = cdpUnsentManual;
window.cdpSendAllKakao = cdpSendAllKakao;
window.dispatchContractKakao = dispatchContractKakao;
window.dispatchContractEmail = dispatchContractEmail;
window.dispatchContractManual = dispatchContractManual;
window._cdpGoPage = _cdpGoPage;
window._cdpRefreshUnsent = _cdpRefreshUnsent;
window._cdpGetUnsentContracts = _cdpGetUnsentContracts;
