window._contractDispatchList = window._contractDispatchList || [];
let _cdpPage = 1;
const _cdpPageSize = 10;
let _cdpUnsentCoId = ''; // 미발송 섹션 고객사 필터

// ── 탭 전환 ──
function _cdpSwitchTab(tab){
  const unsentEl = document.getElementById('cdp-unsent-section');
  const historyEl = document.getElementById('cdp-history-section');
  const previewEl = document.getElementById('cdp-preview-section');
  const tabUnsent = document.getElementById('cdp-tab-unsent');
  const tabHistory = document.getElementById('cdp-tab-history');
  const tabPreview = document.getElementById('cdp-tab-preview');
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
    _cdpRenderPreview();
  }
}

// ── 메시지 예시 렌더 ──
function _cdpRenderPreview(){
  const container = document.getElementById('cdp-preview-content');
  if(!container) return;
  if(typeof msgRenderAllPreviews === 'function'){
    container.innerHTML = msgRenderAllPreviews('contract');
  } else {
    container.innerHTML = '<p style="padding:20px;color:#9ca3af;">메시지 템플릿을 불러올 수 없습니다.</p>';
  }
}

// ── 커스텀 고객사 드롭다운 토글 ──
function _cdpToggleCoDropdown(){
  const list = document.getElementById('cdp-unsent-co-list');
  const btn = document.getElementById('cdp-unsent-co-btn');
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
      const dd = document.getElementById('cdp-unsent-co-dropdown');
      if(dd && !dd.contains(e.target)){ list.style.display = 'none'; document.removeEventListener('click', handler); }
    };
    document.addEventListener('click', handler);
  }, 0);
}

// ── 고객사 선택 ──
function _cdpSelectCo(coId, coName){
  _cdpUnsentCoId = coId;
  document.getElementById('cdp-unsent-co-label').textContent = coName || '전체 고객사';
  const unsent = _cdpGetUnsentContracts();
  const cnt = coId ? unsent.filter(c => c.company_id === coId).length : unsent.length;
  document.getElementById('cdp-unsent-co-badge').textContent = cnt;
  document.getElementById('cdp-unsent-co-list').style.display = 'none';
  renderCdpUnsentMonthTabs();
  renderCdpUnsentList();
}

// ── 고객사 드롭다운 채우기 ──
function _cdpPopulateUnsentCompanySelect(){
  const btn = document.getElementById('cdp-unsent-co-btn');
  const list = document.getElementById('cdp-unsent-co-list');
  if(!btn || !list) return;
  const activeCos = allCompanies.filter(c => isCompanyActive(c));
  const unsent = _cdpGetUnsentContracts();
  const totalCount = unsent.length;
  const countByCo = {};
  unsent.forEach(c => { countByCo[c.company_id] = (countByCo[c.company_id]||0) + 1; });
  const label = document.getElementById('cdp-unsent-co-label');
  const badgeEl = document.getElementById('cdp-unsent-co-badge');
  if(currentGlobalCompanyId){
    _cdpUnsentCoId = currentGlobalCompanyId;
    const co = allCompanies.find(c => c.id === currentGlobalCompanyId);
    if(label) label.textContent = co ? co.company_name : '전체 고객사';
    const selCnt = currentGlobalCompanyId ? (countByCo[currentGlobalCompanyId]||0) : totalCount;
    if(badgeEl) badgeEl.textContent = selCnt;
  } else {
    if(label) label.textContent = '전체 고객사';
    if(badgeEl) badgeEl.textContent = totalCount;
  }
  list.innerHTML =
    `<div class="cust-dropdown-item${!_cdpUnsentCoId?' selected':''}" onclick="_cdpSelectCo('','전체 고객사')">
      <span>전체 고객사</span><span class="count-badge">${totalCount}</span>
    </div>` +
    activeCos.map(c => {
      const cnt = countByCo[c.id] || 0;
      return `<div class="cust-dropdown-item${_cdpUnsentCoId===c.id?' selected':''}" onclick="_cdpSelectCo('${c.id}','${c.company_name.replace(/'/g,"\\'")}')">
        <span>${c.company_name}</span><span class="count-badge">${cnt}</span>
      </div>`;
    }).join('');
}

// ── 기간 검증: 최대 3개월 제한 (조회 버튼 클릭 시) ──
function _cdpDoSearch(){
  const fromEl = document.getElementById('cdp-filter-date-from');
  const toEl = document.getElementById('cdp-filter-date-to');
  const noticeEl = document.getElementById('cdp-date-notice');
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
  _cdpPage = 1;
  renderContractDispatchPage();
}

/** DB에서 전체 발송 이력 로드 (최신순) */
async function loadContractDispatchList(forceReload = false){
  if(!forceReload && window._contractDispatchList.length > 0) return;
  try {
    const res = await fetch('../tables/contract_dispatch?page=1&limit=1000');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // dispatched_at(ISO 문자열) 내림차순 → 없으면 created_at(ms) 내림차순
    const rows = (data.data || []).sort((a,b)=>{
      const ta = a.dispatched_at || a.created_at || '';
      const tb = b.dispatched_at || b.created_at || '';
      return tb.localeCompare(ta);
    });
    window._contractDispatchList = rows;
  } catch(e){
    console.error('[발송이력 로드]', e);
    window._contractDispatchList = [];
  }
}

/**
 * 발송 이력 행의 교부사유 도출
 * 1) DB에 기록된 dispatch_reason 우선 (발송 저장 시점 확정값, 영문 코드)
 * 2) 레거시 폴백: dispatch_reason 미기록 행은 계약 페어링 기반 추정
 *   - reissue 마커 → 수정재발행
 *   - renewed_from_id + 원본 종료일·연결 존재 → 계약갱신 / 그 외 → 재계약
 *   - renewed_from_id 없음 → 신규계약
 */
function _cdpReasonInfo(r){
  if(!r) return { code:'', label:'-', bg:'#f3f4f6', color:'#374151' };
  const DB_REASON_MAP = {
    new             : { code:'new',      label:'신규계약',   bg:'rgba(16,185,129,.1)',  color:'#059669' },
    renewal         : { code:'renewal',  label:'계약갱신',   bg:'rgba(59,130,246,.1)',  color:'#2563eb' },
    recontract      : { code:'recontract', label:'재계약',   bg:'rgba(139,92,246,.1)',  color:'#7c3aed' },
    amended_reissue : { code:'reissue',  label:'수정재발행', bg:'rgba(236,72,153,.1)', color:'#db2777' },
  };
  if(r.dispatch_reason && DB_REASON_MAP[r.dispatch_reason]){
    return { ...DB_REASON_MAP[r.dispatch_reason] };
  }
  if(r.dispatch_method === DISPATCH_METHOD.REISSUE){
    return { ...DB_REASON_MAP.amended_reissue };
  }
  const c = (allContracts||[]).find(x => x.id === r.contract_id);
  if(c && c.renewed_from_id){
    const orig = (allContracts||[]).find(x => x.id === c.renewed_from_id);
    if(orig && orig.renewed_to_id === c.id && orig.terminate_date){
      return { ...DB_REASON_MAP.renewal };
    }
    return { ...DB_REASON_MAP.recontract };
  }
  return { ...DB_REASON_MAP.new };
}

/** 발송 관리 페이지 전체 렌더링 */
async function renderContractDispatchPage(){
  // 데이터 로드 (캐시가 없을 때만, 강제 갱신은 showPage에서 처리)
  if(window._contractDispatchList.length === 0) await loadContractDispatchList(true);

  // 필터 값 수집
  const filterMethod  = document.getElementById('cdp-filter-method')?.value  || '';
  const filterReason  = document.getElementById('cdp-filter-reason')?.value  || '';
  const filterStatus  = document.getElementById('cdp-filter-status')?.value  || '';
  const filterCompany = document.getElementById('cdp-filter-company')?.value || '';
  const filterDateFrom= document.getElementById('cdp-filter-date-from')?.value || '';  // 'YYYY-MM-DD'
  const filterDateTo  = document.getElementById('cdp-filter-date-to')?.value   || '';  // 'YYYY-MM-DD'
  const searchKw      = (document.getElementById('cdp-search')?.value || '').trim().toLowerCase();

  // 고객사 필터 옵션 동적 생성 (최초 렌더링 시)
  const coSel = document.getElementById('cdp-filter-company');
  if(coSel && coSel.options.length <= 1){
    const uniqueCompanies = [...new Map(
      window._contractDispatchList.map(r=>[r.company_id, r.company_name])
    ).entries()].sort((a,b)=>(a[1]||'').localeCompare(b[1]||'','ko'));
    uniqueCompanies.forEach(([id, name])=>{
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = name || id;
      coSel.appendChild(opt);
    });
  }

  // 필터링
  const filtered = window._contractDispatchList.filter(r => {
    if(filterMethod  && r.dispatch_method  !== filterMethod)  return false;
    if(filterReason  && _cdpReasonInfo(r).code !== filterReason) return false;
    if(filterStatus  && r.dispatch_status  !== filterStatus)  return false;
    if(filterCompany && r.company_id       !== filterCompany) return false;
    // 수습 기능 OFF → 수습 계약 발송 이력 제외
    if(!window._probationFeatureEnabled && typeof isProbationType === 'function' && isProbationType(normalizeContractType(r.contract_type))) return false;
    // 기간 필터: dispatched_at (ISO 문자열 'YYYY-MM-DDT...' 앞 10자리로 비교)
    if(filterDateFrom || filterDateTo){
      const raw = r.dispatched_at || r.created_at || '';
      const recDate = typeof raw === 'string' ? raw.slice(0, 10) : String(raw).slice(0, 10);
      if(filterDateFrom && recDate < filterDateFrom) return false;
      if(filterDateTo   && recDate > filterDateTo)   return false;
    }
    if(searchKw){
      const hay = `${r.employee_name||''} ${r.recipient||''} ${r.company_name||''}`.toLowerCase();
      if(!hay.includes(searchKw)) return false;
    }
    return true;
  }).sort((a,b)=>((b.dispatched_at||b.created_at||'')).localeCompare((a.dispatched_at||a.created_at||'')));

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / _cdpPageSize));
  if(_cdpPage > totalPages) _cdpPage = totalPages;
  const pageData = filtered.slice((_cdpPage-1)*_cdpPageSize, _cdpPage*_cdpPageSize);

  // 테이블 렌더링
  const tbody = document.getElementById('cdp-tbody');
  if(!tbody) return;

  if(filtered.length === 0){
    tbody.innerHTML = `<tr><td colspan="10" class="cen-empty"><i class="fas fa-inbox"></i> 발송 이력이 없습니다.</td></tr>`;
    document.getElementById('cdp-pagination').innerHTML = '';
    return;
  }

  const fmtDt = ts => {
    if(!ts) return '-';
    // ISO 문자열("2026-05-19T10:30:00.000Z") 또는 ms 숫자 모두 처리
    const d = new Date(ts);
    if(isNaN(d.getTime())) return '-';
    return d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };

  const methodBadge = m => {
    const cfg = {
      [DISPATCH_METHOD.KAKAO]:  { bg:'#f9d000', color:'#3b1f00', icon:'M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z', isSvg:true },
      [DISPATCH_METHOD.EMAIL]:  { bg:'#dbeafe', color:'#1e40af', fa:'fa-envelope' },
      [DISPATCH_METHOD.MANUAL]: { bg:'#d1fae5', color:'#065f46', fa:'fa-hand-paper' },
    };
    const c = cfg[m] || { bg:'#f3f4f6', color:'#374151', fa:'fa-question' };
    const label = DISPATCH_METHOD_LABEL[m] || m || '-';
    const icon = c.isSvg
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="${c.color}"><path d="${c.icon}"/></svg>`
      : `<i class="fas ${c.fa}" style="font-size:11px;"></i>`;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;white-space:nowrap;">${icon}${label}</span>`;
  };

  const reasonBadge = r => {
    const info = _cdpReasonInfo(r);
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${info.bg};color:${info.color};padding:2px 9px;border-radius:20px;font-size:11.5px;white-space:nowrap;">${info.label}</span>`;
  };

  const statusBadge = s => {
    const cfg = {
      [DISPATCH_STATUS.COMPLETED]: { bg:'#dcfce7', color:'#166534', fa:'fa-check-circle' },
      [DISPATCH_STATUS.FAILED]:    { bg:'#fee2e2', color:'#991b1b', fa:'fa-times-circle' },
      [DISPATCH_STATUS.PENDING]:   { bg:'#e0e7ff', color:'#3730a3', fa:'fa-clock' },
    };
    const c = cfg[s] || { bg:'#f3f4f6', color:'#374151', fa:'fa-circle' };
    const label = DISPATCH_STATUS_LABEL[s] || s || '-';
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;">
      <i class="fas ${c.fa}" style="font-size:10px;"></i>${label}
    </span>`;
  };

  const typeBadge = t => {
    const normalized = normalizeContractType(t);
    const cfg = {
      [CONTRACT_TYPE.REGULAR]:           { bg:'rgba(59,130,246,.1)',color:'#3b82f6' },
      [CONTRACT_TYPE.REGULAR_PROBATION]: { bg:'rgba(6,182,212,.1)',color:'#0891b2' },
      [CONTRACT_TYPE.FIXED]:             { bg:'rgba(139,92,246,.1)',color:'#8b5cf6' },
      [CONTRACT_TYPE.FIXED_PROBATION]:   { bg:'rgba(236,72,153,.1)',color:'#db2777' },
      [CONTRACT_TYPE.DAILY]:             { bg:'rgba(234,88,12,.1)',color:'#ea580c' },
    };
    const c = cfg[normalized] || { bg:'#f3f4f6',color:'#374151' };
    return `<span style="background:${c.bg};color:${c.color};padding:2px 8px;border-radius:20px;font-size:11px;">${contractTypeLabel(t)}</span>`;
  };

  tbody.innerHTML = pageData.map((r, idx) => {
    return `<tr>
      <td style="color:#374151;white-space:nowrap;">${fmtDt(r.dispatched_at)}</td>
      <td style="font-weight:600;color:#111827;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.company_name||''}">${r.company_name||'-'}</td>
      <td style="font-weight:700;color:#111827;">${r.employee_name||'-'}</td>
      <td>${typeBadge(r.contract_type)}</td>
      <td class="ctr">${r.dispatch_method === DISPATCH_METHOD.REISSUE
        ? '<span style="font-size:11.5px;color:#d1d5db;">-</span>'
        : methodBadge(r.dispatch_method)}</td>
      <td class="ctr">${reasonBadge(r)}</td>
      <td style="font-size:12px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.recipient||''}">${r.recipient||'-'}</td>
      <td class="ctr">${statusBadge(r.dispatch_status)}</td>
      <td style="font-size:12px;color:#6b7280;">${_resolveAdminName(r.dispatched_by)||'-'}</td>
      <td class="ctr" style="white-space:nowrap;">${_cdpAttachBtn(r.contract_id)}</td>
    </tr>`;
  }).join('');

  // 페이지네이션 렌더링
  _renderCdpPagination(totalPages, filtered);
}

/* ─────────────────────────────────────────────────────────────────
   _cdpAttachBtn(contractId)
   발송 이력 행의 계약서 미리보기 버튼 HTML 반환
   → openContractPrintModal(contractId) 호출 (자동완성 근로계약서)
   ─────────────────────────────────────────────────────────────── */
function _cdpAttachBtn(contractId){
  if(!contractId) return `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;
  const c = (allContracts||[]).find(x => x.id === contractId);
  if(!c) return `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;
  return `<button onclick="event.stopPropagation();openContractPrintModal('${contractId}')"
    class="btn btn-indigo btn-sm"
    title="근로계약 조건에 따라 자동완성된 계약서 미리보기">
    <i class="fas fa-file-contract" style="font-size:10px;"></i>미리보기
  </button>`;
}

/** 요약 카드 */
/** 페이지네이션 */
function _renderCdpPagination(totalPages, filtered){
  const el = document.getElementById('cdp-pagination');
  if(!el) return;
  const total = filtered.length;
  if(total <= _cdpPageSize){ el.innerHTML = ''; return; }
  const s = Math.min((_cdpPage-1)*_cdpPageSize+1, total);
  const e = Math.min(_cdpPage*_cdpPageSize, total);
  const mBtn = (label, pg, disabled, active) =>
    `<button class="page-btn${active?' active':''}" onclick="_cdpGoPage(${pg})"${disabled?' disabled':''}>${label}</button>`;
  const btns = [];
  btns.push(mBtn('<i class="fas fa-chevron-left"></i>', Math.max(1,_cdpPage-1), _cdpPage<=1, false));
  const start = Math.max(1, _cdpPage-2), end = Math.min(totalPages, _cdpPage+2);
  if(start > 1){ btns.push(mBtn('1',1,false,false)); if(start>2) btns.push('<span class="page-ellipsis">…</span>'); }
  for(let p=start;p<=end;p++) btns.push(mBtn(p,p,false,p===_cdpPage));
  if(end < totalPages){ if(end<totalPages-1) btns.push('<span class="page-ellipsis">…</span>'); btns.push(mBtn(totalPages,totalPages,false,false)); }
  btns.push(mBtn('<i class="fas fa-chevron-right"></i>', Math.min(totalPages,_cdpPage+1), _cdpPage>=totalPages, false));
  el.innerHTML = `<div class="pagination"><span class="page-info">총 <strong>${total}</strong>건 중 ${s}–${e}번째</span><div class="page-btns">${btns.join('')}</div></div>`;
}
function _cdpGoPage(p){
  _cdpPage = p;
  renderContractDispatchPage();
}

// ======================================================
// 근로계약서 미발송 관리
// ======================================================

let _cdpUnsentYM = null; // 현재 선택된 {year, month} (입사 년월 기준)

/**
 * 미발송 계약서 목록 반환
 * 조건: is_draft=false + 필수항목 완비 + contract_dispatch 발송 이력 없음
 * year/month: 계약 시작일(contract_start) 기준 년월 필터 (null 이면 전체)
 */
function _cdpGetUnsentContracts(year, month){
  // 발송 이력에 있는 contract_id 집합
  const sentIds = new Set(
    (window._contractDispatchList || []).map(r => r.contract_id).filter(Boolean)
  );

  return allContracts.filter(c => {
    // 임시저장 제외
    if(c.is_draft) return false;
    // 취소·해지·파기 상태 제외 (수정재발행으로 파기된 계약 포함)
    if(c.status===COMPANY_STATUS.INACTIVE || c.status===CONTRACT_STATUS.VOIDED) return false;
    if(c.is_voided_by_amend) return false;
    // 필수항목 완비 여부: contract_start, employee_id, company_id, contract_type 존재
    if(!c.contract_start || !c.employee_id || !c.company_id || !c.contract_type) return false;
    // 수습 기능 OFF → 수습 계약 발송 대상에서 제외
    if(!window._probationFeatureEnabled && typeof isProbationType === 'function' && isProbationType(normalizeContractType(c.contract_type))) return false;
    // 이미 발송 이력 있으면 제외
    if(sentIds.has(c.id)) return false;
    // 고객사 필터
    if(_cdpUnsentCoId && c.company_id !== _cdpUnsentCoId) return false;
    // 년월 필터 (contract_start 앞 7자리 'YYYY-MM' 기준)
    if(year !== undefined && month !== undefined){
      const raw = c.contract_start || '';
      const ym = typeof raw === 'string' ? raw.slice(0, 7) : String(raw).slice(0, 7);
      const targetYM = `${year}-${String(month).padStart(2,'0')}`;
      if(ym !== targetYM) return false;
    }
    return true;
  });
}

/** 입사 년월 탭 렌더 */
function renderCdpUnsentMonthTabs(){
  const wrap = document.getElementById('cdp-unsent-month-tabs');
  if(!wrap) return;

  // 미발송 계약 전체를 가져와 년월별로 그룹핑
  const allUnsent = _cdpGetUnsentContracts();
  const ymMap = new Map();
  allUnsent.forEach(c => {
    const ym = (c.contract_start || '').slice(0, 7);
    if(!ym) return;
    const [y, m] = ym.split('-').map(Number);
    const key = `${y}-${String(m).padStart(2,'0')}`;
    if(!ymMap.has(key)) ymMap.set(key, { year: y, month: m, count: 0 });
    ymMap.get(key).count++;
  });

  const ymList = [...ymMap.values()]
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

  if(!ymList.length){
    wrap.innerHTML = '';
    _renderCdpUnsentAllClear(true);
    return;
  }

  // 현재 선택 년월이 목록에 없으면 기본 선택 초기화
  // 기본: 현재 월 (미래 계약 월이 최종월로 잡히지 않도록)
  //  - 현재 월이 목록에 없으면 과거 중 가장 최근 월
  //  - 과거 월도 없으면(전부 미래) 가장 이른 월
  const inList = _cdpUnsentYM && ymList.some(x => x.year === _cdpUnsentYM.year && x.month === _cdpUnsentYM.month);
  if(!inList){
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curKey = `${curY}-${String(curM).padStart(2,'0')}`;
    const cur = ymList.find(x => x.year === curY && x.month === curM);
    const past = ymList
      .filter(x => `${x.year}-${String(x.month).padStart(2,'0')}` <= curKey)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month))[0];
    _cdpUnsentYM = cur || past || { ...ymList[ymList.length - 1] };
  }

  wrap.innerHTML = ymList.map(ym => {
    const isActive = _cdpUnsentYM && ym.year === _cdpUnsentYM.year && ym.month === _cdpUnsentYM.month;
    return `<div class="cdp-month-tab${isActive ? ' active' : ''}"
      onclick="cdpSelectUnsentYM(${ym.year},${ym.month})">
      ${ym.year}년 ${String(ym.month).padStart(2,'0')}월
      ${ym.count > 0 ? `<span class="count-badge">${ym.count}</span>` : ''}
    </div>`;
  }).join('');
}

function cdpSelectUnsentYM(year, month){
  _cdpUnsentYM = { year, month };
  renderCdpUnsentMonthTabs();
  renderCdpUnsentList();
}

function _renderCdpUnsentAllClear(show){
  const msg       = document.getElementById('cdp-unsent-all-clear');
  const tblWrap   = document.getElementById('cdp-unsent-table-wrap');
  const monthCard = document.getElementById('cdp-unsent-month-card');
  if(msg)       msg.style.display       = show ? '' : 'none';
  if(tblWrap)   tblWrap.style.display   = show ? 'none' : '';
  if(monthCard) monthCard.style.display = show ? 'none' : '';
  cdpUpdateBatchBtns();
}

/** 전체 선택/해제 */
function cdpToggleAll(el){
  document.querySelectorAll('.cdp-row-chk').forEach(cb => { cb.checked = el.checked; });
  cdpUpdateBatchBtns();
}

/** 선택된 계약 ID 목록 */
function cdpGetSelectedIds(){
  return [...document.querySelectorAll('.cdp-row-chk:checked')].map(cb => cb.dataset.contractId);
}

/** 배치 버튼 활성/비활성 */
function cdpUpdateBatchBtns(){
  const sel = cdpGetSelectedIds();
  const btnKakao = document.getElementById('cdp-batch-kakao-btn');
  const btnEmail = document.getElementById('cdp-batch-email-btn');
  const btnManual= document.getElementById('cdp-batch-manual-btn');
  // 선택 항목 중 휴대전화/이메일 미등록이 하나라도 있으면 각각 비활성 (모두 등록일 때만 활성)
  const _list = _cdpUnsentYM ? _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month).filter(c => sel.includes(c.id)) : [];
  const _allPhone = _list.length > 0 && _list.every(c => { const e = allEmployees.find(x => x.id === c.employee_id); return e && String(e.phone || '').trim(); });
  const _allEmail = _list.length > 0 && _list.every(c => { const e = allEmployees.find(x => x.id === c.employee_id); return e && String(e.email || '').trim(); });
  if(btnKakao) btnKakao.disabled = !_allPhone;
  if(btnEmail) btnEmail.disabled = !_allEmail;
  if(btnManual)btnManual.disabled= sel.length === 0;
  // 전체 선택 체크박스 동기화
  const allCb = document.getElementById('cdp-chk-all');
  const allRows = document.querySelectorAll('.cdp-row-chk');
  if(allCb && allRows.length > 0) allCb.checked = sel.length === allRows.length;
}

/** 선택 일괄 알림톡 발송 */
async function cdpBatchKakao(){
  const ids = cdpGetSelectedIds();
  if(!ids.length){ toast('선택된 항목이 없습니다.', 'warning'); return; }
  const list = _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month).filter(c => ids.includes(c.id));
  const valid = list.filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return emp && emp.phone; });
  if(!valid.length){ toast('알림톡 발송 가능한 대상이 없습니다. (전화번호 미등록)', 'warning'); return; }
  if(!confirm(`[선택 일괄 알림톡]\n\n선택된 ${ids.length}건 중 ${valid.length}건을\n알림톡으로 발송하시겠습니까?`)) return;
  const btn = document.getElementById('cdp-batch-kakao-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }
  let ok = 0;
  try {
    for(const c of valid){
      const emp = allEmployees.find(e => e.id === c.employee_id) || {};
      try{
        await _saveDispatchRecord({ method: DISPATCH_METHOD.KAKAO, status: DISPATCH_STATUS.COMPLETED, recipient: emp.phone || '', note:`선택 일괄 알림톡 — ${emp.name}`, contractId: c.id });
        ok++;
      } catch(e){}
    }
    toast(`선택 알림톡 완료 — ${ok}/${valid.length}건`, 'success');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = origHTML; }
    resetCdpSelection();
    await _cdpRefreshUnsent();
  }
}

/** 선택 일괄 이메일 발송 */
async function cdpBatchEmail(){
  const ids = cdpGetSelectedIds();
  if(!ids.length){ toast('선택된 항목이 없습니다.', 'warning'); return; }
  const list = _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month).filter(c => ids.includes(c.id));
  const valid = list.filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return emp && emp.email; });
  const noEmail = list.filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return !emp || !emp.email; });
  if(noEmail.length > 0){
    // 이메일 없는 항목 자동 선택 해제
    noEmail.forEach(c => {
      const cb = document.querySelector(`.cdp-row-chk[data-contract-id="${c.id}"]`);
      if(cb) cb.checked = false;
    });
    cdpUpdateBatchBtns();
    const names = noEmail.map(c => (allEmployees.find(e=>e.id===c.employee_id)||{}).name||'?').join(', ');
    toast(`이메일 미등록 ${noEmail.length}건 선택 해제: ${names}`, 'warning');
  }
  if(!valid.length){ toast('이메일 발송 가능한 대상이 없습니다.', 'warning'); return; }
  if(!confirm(`[선택 일괄 이메일]\n\n이메일이 있는 ${valid.length}건을\n이메일로 발송하시겠습니까?`)) return;
  const btn = document.getElementById('cdp-batch-email-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }
  let ok = 0;
  try {
    for(const c of valid){
      const emp = allEmployees.find(e => e.id === c.employee_id) || {};
      try{
        await _saveDispatchRecord({ method: DISPATCH_METHOD.EMAIL, status: DISPATCH_STATUS.COMPLETED, recipient: emp.email || '', note:`선택 일괄 이메일 — ${emp.name}`, contractId: c.id });
        ok++;
      } catch(e){}
    }
    toast(`선택 이메일 완료 — ${ok}/${valid.length}건`, 'success');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = origHTML; }
    resetCdpSelection();
    await _cdpRefreshUnsent();
  }
}

/** 선택 일괄 수동교부 처리 */
async function cdpBatchManual(){
  const ids = cdpGetSelectedIds();
  if(!ids.length){ toast('선택된 항목이 없습니다.', 'warning'); return; }
  if(!confirm(`[선택 일괄 수동교부]\n\n선택된 ${ids.length}건을\n수동교부 완료 처리하시겠습니까?`)) return;
  const btn = document.getElementById('cdp-batch-manual-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }
  let ok = 0;
  try {
    for(const c of _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month).filter(c => ids.includes(c.id))){
      const emp = allEmployees.find(e => e.id === c.employee_id) || {};
      try{
        await _saveDispatchRecord({ method: DISPATCH_METHOD.MANUAL, status: DISPATCH_STATUS.COMPLETED, recipient:'직접배부', note:`선택 일괄 수동교부 — ${emp.name}`, contractId: c.id });
        ok++;
      } catch(e){}
    }
    toast(`선택 수동교부 완료 — ${ok}/${ids.length}건`, 'success');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = origHTML; }
    resetCdpSelection();
    await _cdpRefreshUnsent();
  }
}

/** 선택 초기화 */
function resetCdpSelection(){
  document.querySelectorAll('.cdp-row-chk').forEach(cb => { cb.checked = false; });
  const allCb = document.getElementById('cdp-chk-all');
  if(allCb) allCb.checked = false;
  cdpUpdateBatchBtns();
}

/** 미발송 목록 테이블 렌더 */
function renderCdpUnsentList(){
  const tbody = document.getElementById('cdp-unsent-tbody');
  if(!tbody) return;

  if(!_cdpUnsentYM){ _renderCdpUnsentAllClear(true); return; }

    const list = _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month)
    .sort((a,b)=>{
      const na = (allEmployees.find(e=>e.id===a.employee_id)||{}).name||'';
      const nb = (allEmployees.find(e=>e.id===b.employee_id)||{}).name||'';
      return na.localeCompare(nb, 'ko');
    });

  if(!list.length){ _renderCdpUnsentAllClear(true); return; }
  _renderCdpUnsentAllClear(false);

  tbody.innerHTML = list.map((c, idx) => {
    const emp = allEmployees.find(e => e.id === c.employee_id) || {};
    const co  = allCompanies.find(x => x.id === c.company_id)  || {};
    const cat = c.contract_type || emp.employment_category || '-';
    const phone    = emp.phone || '';
    const email    = emp.email || '';
    const hasPhone = !!(phone.trim());
    const hasEmail = !!(email.trim());
    const kakaoClass = hasPhone ? 'btn btn-kakao btn-sm' : 'btn btn-sm';
    const emailClass = hasEmail ? 'btn btn-sky btn-sm' : 'btn btn-sm';
    return `<tr id="cdp-urow-${idx}">
      <td class="ctr"><input type="checkbox" class="cdp-row-chk" data-contract-id="${c.id}" onchange="cdpUpdateBatchBtns()" /></td>
      <td style="font-size:12px;color:#111827;font-weight:700;">${co.company_name || '-'}</td>
      <td style="font-weight:700;color:#111827;">${emp.name || '-'}</td>
      <td style="text-align:center;font-size:12px;">${typeof genderLabel==='function' ? genderLabel(emp) : '-'}</td>
      <td><span class="badge ${empCatBadge(cat)}">${contractTypeLabel(cat)}</span></td>
      <td style="font-size:12px;color:#6b7280;">${c.contract_start || '-'}</td>
      <td style="font-size:12px;color:#6b7280;">${phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="font-size:12px;">${hasEmail ? `<span style="color:#374151;">${email}</span>` : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">${_cdpAttachBtn(c.id)}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button onclick="cdpUnsentKakao('${c.id}')" ${hasPhone ? '' : 'disabled'}
          class="${kakaoClass}" style="margin-right:3px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡
        </button>
        <button onclick="cdpUnsentEmail('${c.id}')" ${hasEmail ? '' : 'disabled'}
          class="${emailClass}" style="margin-right:3px;">
          ✉ 이메일
        </button>
        <button onclick="cdpUnsentManual('${c.id}')"
          class="btn btn-success btn-sm" style="margin-right:3px;">
          <i class="fas fa-hand-paper"></i> 수동교부
        </button>
      </td>
    </tr>`;
  }).join('');
  cdpUpdateBatchBtns();
}

/** 개별 알림톡 발송 */
async function cdpUnsentKakao(contractId){
  const c   = allContracts.find(x => x.id === contractId);
  const emp = c ? allEmployees.find(e => e.id === c.employee_id) : null;
  const co  = c ? allCompanies.find(x => x.id === c.company_id)  : null;
  if(!c || !emp || !co){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if(!emp.phone){ toast(`${emp.name} — 전화번호가 등록되어 있지 않습니다.`, 'error'); return; }
  if(!confirm(`[알림톡 발송]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n알림톡으로 발송하시겠습니까?\n\n수신 번호: ${emp.phone}`)) return;
  try{
    await _saveDispatchRecord({ method: DISPATCH_METHOD.KAKAO, status: DISPATCH_STATUS.COMPLETED, recipient: emp.phone,
      note:`미발송 목록 알림톡 — ${emp.name}`, contractId });
    toast(`✅ ${emp.name} 알림톡 발송 완료`, 'success');
    await _cdpRefreshUnsent();
  } catch(e){ toast('발송 중 오류가 발생했습니다.', 'error'); }
}

/** 개별 이메일 발송 */
async function cdpUnsentEmail(contractId){
  const c   = allContracts.find(x => x.id === contractId);
  const emp = c ? allEmployees.find(e => e.id === c.employee_id) : null;
  const co  = c ? allCompanies.find(x => x.id === c.company_id)  : null;
  if(!c || !emp || !co){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if(!emp.email){ toast(`${emp.name} — 이메일이 등록되어 있지 않습니다.`, 'error'); return; }
  if(!confirm(`[이메일 발송]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n이메일로 발송하시겠습니까?\n\n수신 주소: ${emp.email}`)) return;
  try{
    await _saveDispatchRecord({ method: DISPATCH_METHOD.EMAIL, status: DISPATCH_STATUS.COMPLETED, recipient: emp.email,
      note:`미발송 목록 이메일 — ${emp.name}`, contractId });
    toast(`✅ ${emp.name} 이메일 발송 완료`, 'success');
    await _cdpRefreshUnsent();
  } catch(e){ toast('발송 중 오류가 발생했습니다.', 'error'); }
}

/** 수동 교부 완료 */
async function cdpUnsentManual(contractId){
  const c   = allContracts.find(x => x.id === contractId);
  const emp = c ? allEmployees.find(e => e.id === c.employee_id) : null;
  const co  = c ? allCompanies.find(x => x.id === c.company_id)  : null;
  if(!c || !emp || !co){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if(!confirm(`[수동 교부 완료]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n출력하여 직접 교부하셨습니까?\n\n확인 시 수동교부 완료 이력이 등록됩니다.`)) return;
  try{
    await _saveDispatchRecord({ method: DISPATCH_METHOD.MANUAL, status: DISPATCH_STATUS.COMPLETED, recipient:'직접배부',
      note:`미발송 목록 수동교부 — ${emp.name}`, contractId });
    toast(`✅ ${emp.name} 수동 교부 완료 처리됐습니다.`, 'success');
    await _cdpRefreshUnsent();
  } catch(e){ toast('처리 중 오류가 발생했습니다.', 'error'); }
}

/** 미발송 카드 새로고침 (이력 캐시 갱신 후 재렌더) */
async function _cdpRefreshUnsent(){
  await loadContractDispatchList(true);
  renderCdpUnsentMonthTabs();
  renderCdpUnsentList();
  // 발송이력 카드도 갱신
  await renderContractDispatchPage();
  // 대시보드 근로계약서 미발송 배너 갱신
  _updateDashUnsentContractBanner();
}

// 근로계약서 발송 — 공통 이력 저장 함수
// ======================================================

/**
 * 발송 이력을 contract_dispatch 테이블에 저장하고
 * 전역 캐시 _contractDispatchList에도 추가한다.
 */
async function _saveDispatchRecord({ method: dispatchMethod, status: dispatchStatus, recipient, note, contractId }){
  const nowISO = new Date().toISOString();
  const adminName = _getAdminUsername();

  // contractId가 직접 전달되면(미발송 목록에서 호출) 해당 계약 데이터로 채움
  let cId = contractId || window._printingContractId || '';
  let empId = window._printingEmpId || '';
  let empName = window._printingEmpName || '';
  let coId = window._printingCompanyId || '';
  let coName = window._printingCompanyName || '';
  let ctType = window._printingContractType || '';
  let ctStart = window._printingContractStart || '';
  let ctEnd   = window._printingContractEnd   || '';

  if(contractId && contractId !== window._printingContractId){
    const _c   = allContracts.find(x => x.id === contractId);
    const _emp = _c ? allEmployees.find(e => e.id === _c.employee_id) : null;
    const _co  = _c ? allCompanies.find(x => x.id === _c.company_id)  : null;
    if(_c){
      empId   = _c.employee_id || '';
      ctType  = _c.contract_type || '';
      ctStart = _c.contract_start || '';
      ctEnd   = _c.contract_end   || '';
    }
    if(_emp){ empName = _emp.name || ''; }
    if(_co){  coId = _co.id || ''; coName = _co.company_name || ''; }
  }

  const _dcReason = ((allContracts || []).find(x => x.id === cId) || {}).created_reason
    || (dispatchMethod === DISPATCH_METHOD.REISSUE ? 'amended_reissue' : null);

  const payload = {
    contract_id     : cId,
    dispatch_reason : _dcReason,
    employee_id     : empId,
    employee_name   : empName,
    company_id      : coId,
    company_name    : coName,
    contract_type   : ctType,
    dispatch_method : dispatchMethod,
    dispatch_status : dispatchStatus,
    recipient       : recipient || '',
    dispatched_at   : nowISO,
    dispatched_by   : adminName,
    note            : note || '',
    contract_start  : ctStart,
    contract_end    : ctEnd,
  };
  try {
    const res = await fetch('../tables/contract_dispatch', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const saved = await res.json();
    // 캐시 초기화 → 발송 관리 페이지 진입 시 DB에서 최신 목록 재조회
    window._contractDispatchList = [];
    // 대시보드 근로계약서 미발송 배너 즉시 갱신
    _updateDashUnsentContractBanner();

    // ── 고객사 인앱 알림 발송 (계약서 발송) ──
    if(coId && empName && (dispatchStatus ===DISPATCH_STATUS.COMPLETED)){
      const _dispCo = allCompanies.find(x => x.id === coId) || {};
      const _coRep  = getCompanyRepGreeting(_dispCo);
      const _methodLabel = dispatchMethod ===DISPATCH_METHOD.KAKAO ? '카카오 알림톡'
        : dispatchMethod ===DISPATCH_METHOD.EMAIL ? '이메일'
        : dispatchMethod === DISPATCH_METHOD.REISSUE ? '수정재발행 (계약서 변경 후 재발행)'
        : dispatchMethod ===DISPATCH_METHOD.MANUAL ? '수동교부'
        : dispatchMethod;
      const _fmtD = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
      const _now = new Date();
      const _nowStr = `${_now.getFullYear()}. ${_now.getMonth()+1}. ${_now.getDate()}. ` +
        `${String(_now.getHours()).padStart(2,'0')}:${String(_now.getMinutes()).padStart(2,'0')}`;

      // 메시지 규칙 적용 (시스템 설정 > 메시지 본문 규칙 관리)
      const rule = (typeof getMsgBodyRule === 'function')
        ? getMsgBodyRule('contract_dispatched')
        : null;
      const _ctLabel = contractTypeLabel(ctType) || '';

      const _applyRule = (template) => {
        if (!template) return '';
        return template
          .replace(/\{회사명\}/g, coName)
          .replace(/\{근로자명\}/g, empName)
          .replace(/\{고용형태\}/g, _ctLabel)
          .replace(/\{발송방법\}/g, _methodLabel)
          .replace(/\{발송시각\}/g, _nowStr);
      };

      const _title = rule?.title
        ? _applyRule(rule.title)
        : `[근로계약서 발송] ${empName} — 근로계약서가 발송되었습니다`;
      const _body = rule?.body
        ? _applyRule(rule.body)
        : `안녕하세요, ${coName} 대표자님.\n\n근로기준법 제17조(근로조건의 명시)에 따라 소속 근로자 ${empName}에게 ${_ctLabel} 근로계약서가 ${_methodLabel}(으)로 발송 완료되었음을 알려드립니다.\n\n■ 발송 시각: ${_nowStr}\n\n* 근로계약서 날인본 사진은 계약 종료일로부터 5년간 보관됩니다.`;

      await _sendCompanyNotice({
        companyId  : coId, companyName: coName,
        noticeType : 'contract_dispatched',
        title      : _title,
        body       : _body,
                contractId  : cId,
                employeeId  : empId, employeeName: empName,
                contractEnd : ctEnd,
        });
    }
    return saved;
  } catch(e){
    console.error('[발송이력 저장 오류]', e);
    return null;
  }
}

// ── 알림톡 발송 (발송 모달) ──────────────────────
async function dispatchContractKakao(){
  const url = window._printingContractFileUrl;
  if(!url){ toast('최종 편집본(PDF) 파일이 없습니다. 계약서 열에서 편집본을 업로드해 주세요.', 'warning'); return; }
  const phone = window._printingEmpPhone || '';
  const name  = window._printingEmpName  || '근로자';
  if(!phone){ toast('전화번호가 등록되지 않았습니다.', 'error'); return; }

  const btn = document.getElementById('cs-kakao-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }

  try {
    const _fileUrl = `\n■ 근로계약서 파일: ${(location.origin||'')}${url}`;
    // TODO: 알림톡 API 연동 시 이 위치에 API 호출 코드 삽입
    // API 연동 전까지는 이력 저장만 처리
    await _saveDispatchRecord({
      method    : DISPATCH_METHOD.KAKAO,
      status    : DISPATCH_STATUS.COMPLETED,
      recipient : phone,
      note      : `수신번호: ${phone}${_fileUrl}`,
    });
    toast(`✅ ${name} 님 알림톡 발송 완료 (${phone})`, 'success');
  } catch(e){
    console.error('[알림톡 발송]', e);
    toast('알림톡 발송 중 오류가 발생했습니다.', 'error');
  } finally {
    if(btn){
      btn.disabled=false;
      btn.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="#3b1700" style="flex-shrink:0;"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡';
    }
  }
}

// ── 이메일 발송 (발송 모달) ──────────────────────
async function dispatchContractEmail(){
  const url = window._printingContractFileUrl;
  if(!url){ toast('최종 편집본(PDF) 파일이 없습니다. 계약서 열에서 편집본을 업로드해 주세요.', 'warning'); return; }
  const email = window._printingEmpEmail || '';
  const name  = window._printingEmpName  || '근로자';
  if(!email){ toast('이메일이 등록되지 않았습니다.', 'error'); return; }

  const btn = document.getElementById('cs-email-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }

  try {
    const _fileUrl = `\n■ 근로계약서 파일: ${(location.origin||'')}${url}`;
    // TODO: 이메일 API 연동 시 이 위치에 API 호출 코드 삽입
    // API 연동 전까지는 이력 저장만 처리
    await _saveDispatchRecord({
      method    : DISPATCH_METHOD.EMAIL,
      status    : DISPATCH_STATUS.COMPLETED,
      recipient : email,
      note      : `수신 이메일: ${email}${_fileUrl}`,
    });
    toast(`✅ ${name} 님 이메일 발송 완료 (${email})`, 'success');
  } catch(e){
    console.error('[이메일 발송]', e);
    toast('이메일 발송 중 오류가 발생했습니다.', 'error');
  } finally {
    if(btn){
      btn.disabled=false;
      btn.innerHTML='<i class="fas fa-envelope"></i> 이메일';
    }
  }
}

// ── 수동교부 (발송 모달) ────────────────────
async function dispatchContractManual(){
  const url = window._printingContractFileUrl;
  if(!url){ toast('최종 편집본(PDF) 파일이 없습니다. 계약서 열에서 편집본을 업로드해 주세요.', 'warning'); return; }
  const name  = window._printingEmpName || '근로자';
  const confirmed = confirm(
    `[ 수동교부 처리 ]\n\n` +
    `${name} 님의 근로계약서(최종 편집본)를 출력하여 직접 배부(교부)하셨습니까?\n\n` +
    `확인을 누르면 배부 완료 이력이 등록됩니다.`
  );
  if(!confirmed) return;

  const btn = document.getElementById('cs-manual-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }

  try {
    await _saveDispatchRecord({
      method    : DISPATCH_METHOD.MANUAL,
      status    : DISPATCH_STATUS.COMPLETED,
      recipient : '직접배부',
      note      : `출력물 직접 교부 완료 (관리자 확인) — 파일: ${(location.origin||'')}${url}`,
    });
    toast(`✅ ${name} 님 근로계약서 직접 배부 완료`, 'success');
  } catch(e){
    console.error('[수동교부]', e);
    toast('처리 중 오류가 발생했습니다.', 'error');
  } finally {
    if(btn){
      btn.disabled=false;
      btn.innerHTML='<i class="fas fa-hand-paper"></i> 수동교부';
    }
  }
}

// ════════════════════════════════════════════════════════════
// 발송 모달 — 고객사 발송(검수/날인 요청) + 근로자 발송
// (계약 목록 — 발송 열 버튼에서 진입, 최종 편집본 파일이 있을 때만 활성)
// ════════════════════════════════════════════════════════════

/** 발송 모달 — 인앱 알림 발송항목 설정 반영 (검수/날인 요청 버튼 표시 제어) */
function _csApplyInappTypeGates(){
  let disabled = new Set();
  try {
    const raw = window._systemSettings && window._systemSettings['inapp_notice_types_disabled'];
    if (raw) {
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) disabled = new Set(arr);
    }
  } catch(_) {}
  const reviewBtn = document.getElementById('cs-review-btn');
  const sealBtn   = document.getElementById('cs-seal-btn');
  const section   = document.getElementById('cs-company-section');
  const reviewOff = disabled.has('contract_review_request');
  const sealOff   = disabled.has('contract_seal_request');
  if (reviewBtn) reviewBtn.style.display = reviewOff ? 'none' : '';
  if (sealBtn)   sealBtn.style.display   = sealOff   ? 'none' : '';
  if (section)   section.style.display   = (reviewOff && sealOff) ? 'none' : '';
}

/** 발송 모달 열기 — window._printing* 전역 설정 후 표시 */
function openContractSendModal(contractId){
  const c = (allContracts||[]).find(x => x.id === contractId);
  if(!c){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  const emp = (allEmployees||[]).find(e => e.id === c.employee_id);
  const co  = (allCompanies||[]).find(x => x.id === c.company_id);
  const empName = emp?.name || '';
  const url = c.edited_file_url || '';
  if(!url){ toast('최종 편집본(PDF) 파일이 없습니다. 계약서 열에서 편집본을 업로드해 주세요.', 'warning'); return; }

  // 전역 정보 설정 (발송 함수에서 사용)
  window._printingContractId      = c.id;
  window._printingEmpName         = empName;
  window._printingEmpPhone        = emp?.phone || '';
  window._printingEmpEmail        = emp?.email || '';
  window._printingContractFileUrl = url;

  // 근로자·파일 정보 표시
  const empInfo = document.getElementById('cs-employee-info');
  if(empInfo){
    empInfo.innerHTML = `<strong>${empName}</strong>${co ? ' (' + (co.company_name||'') + ')' : ''}<br>
      <span style="font-size:11.5px;color:#6b7280;">근로자 발송 수단 — 알림톡: ${emp?.phone || '미등록'} / 이메일: ${emp?.email || '미등록'}</span>`;
  }
  const fileInfo = document.getElementById('cs-file-info');
  if(fileInfo){
    fileInfo.style.display = '';
    fileInfo.innerHTML = `<i class="fas fa-file-word"></i> <strong>최종 편집본</strong> — <a href="${url}" target="_blank">${(location.origin||'')}${url}</a>`;
  }

  // 근로자 발송 버튼 활성화 상태 (이메일 없으면 비활성)
  const hasPhone = !!(emp?.phone && emp.phone.trim());
  const hasEmail = !!(emp?.email && emp.email.trim());
  const kakaoBtn = document.getElementById('cs-kakao-btn');
  if(kakaoBtn){
    kakaoBtn.disabled = !hasPhone;
    kakaoBtn.title = hasPhone ? `알림톡 발송 (${emp.phone})` : '전화번호 미등록 — 직원 정보에 전화번호를 먼저 등록하세요';
  }
  const emailBtn = document.getElementById('cs-email-btn');
  if(emailBtn){
    emailBtn.disabled = !hasEmail;
    emailBtn.title = hasEmail ? `이메일 발송 (${emp.email})` : '이메일 미등록 — 직원 정보에 이메일을 먼저 등록하세요';
  }
  const manualBtn = document.getElementById('cs-manual-btn');
  if(manualBtn) manualBtn.disabled = false;

  // 인앱 알림 발송항목 설정 반영 — 체크 해제된 검수/날인 요청 버튼 숨김
  _csApplyInappTypeGates();

  const modal = document.getElementById('contract-send-modal');
  if(modal) modal.classList.add('open');
}

function closeContractSendModal(){
  const modal = document.getElementById('contract-send-modal');
  if(modal) modal.classList.remove('open');
}

/** 고객사 발송 — 검수 요청 (최종 편집본 파일 주소 전송, 계약 사유 포함) */
async function sendCompanyReviewRequest(){
  const c = (allContracts||[]).find(x=>x.id===window._printingContractId);
  const reason = _getContractReason(c);
  const greet = _getCompanyGreeting();
  await _sendEditedFileToCompany('contract_review_request',
    `[근로계약서 검수 요청] {근로자명} — 최종 편집본 검수 후 승인해 주세요`,
    `${greet}\n\n소속 근로자 {근로자명}님의 근로계약서({계약사유}) 최종 편집본이 등록되었습니다.\n검수 후 승인해 주세요.\n\n■ 근로자: {근로자명}\n■ 계약 사유: {계약사유}\n■ 파일주소: {파일주소}\n\n파일을 열어 확인해 주세요.`,
    { 근로자명: window._printingEmpName||'', 계약사유: reason });
}

/** 고객사 발송 — 날인 요청 (최종 편집본 파일 주소 전송) */
async function sendCompanySealRequest(){
  const greet = _getCompanyGreeting();
  await _sendEditedFileToCompany('contract_seal_request',
    `[근로계약서 날인 요청] {근로자명} — 최종 편집본 날인 후 회신해 주세요`,
    `${greet}\n\n소속 근로자 {근로자명}님의 근로계약서가 승인되었습니다.\n날인 후 회신해 주세요.\n\n■ 근로자: {근로자명}\n■ 파일주소: {파일주소}\n\n파일을 열어 확인해 주세요.`,
    { 근로자명: window._printingEmpName||'' });
}

/** 고객사 인앱 알림 공통 전송 (검수/날인 요청) — 시스템 설정 메시지 규칙 반영 + 변수 치환 */
async function _sendEditedFileToCompany(noticeType, title, body, extraVars){
  const url = window._printingContractFileUrl;
  if(!url){ toast('최종 편집본(PDF) 파일이 없습니다.', 'warning'); return; }
  const c   = (allContracts||[]).find(x=>x.id===window._printingContractId);
  const emp = c ? (allEmployees||[]).find(e=>e.id===c.employee_id) : null;
  const co  = c ? (allCompanies||[]).find(x=>x.id===c.company_id) : null;
  if(!c || !co){ toast('계약·고객사 정보를 찾을 수 없습니다.', 'error'); return; }
  const fullUrl = (location.origin||'') + url;
  // 시스템 설정 규칙의 {회사명}/{근로자명}/{계약사유}/{파일주소} 치환용 변수
  const vars = {
    ...(extraVars||{}),
    근로자명: emp?.name || '',
    회사명:   co.company_name || '',
    파일주소: fullUrl,
  };
  try {
    await _sendCompanyNotice({
      companyId:    c.company_id,
      companyName:  co.company_name || '',
      noticeType:   noticeType,
      title:        title,
      body:         body,
      contractId:   c.id,
      employeeId:   c.employee_id,
      employeeName: emp?.name || '',
      contractEnd:  c.contract_end || '',
      extraData:    { ruleVars: vars },
    });
    toast('✅ 고객사 인앱 알림으로 파일 주소가 전송됐습니다.', 'success');
  } catch(e){
    console.error('[고객사 발송]', e);
    toast('인앱 알림 전송 중 오류가 발생했습니다.', 'error');
  }
}

/** 계약 사유 도출 (신규계약 / 갱신 / 갱신예정 / 갱신예정 수정 / 재계약) */
function _getContractReason(c){
  if(!c) return '신규계약';
  const today = fmtLocalDate(new Date());
  // 갱신예정: 갱신 예약 상태이거나, 갱신 계약이지만 시작일 미도래
  const isRenewPending = (c.status === CONTRACT_STATUS.RENEWAL_PENDING)
    || (!!c.renewed_from_id && c.status === CONTRACT_STATUS.ACTIVE && c.contract_start && today < c.contract_start);
  if(isRenewPending){
    return c.amended_from ? '갱신예정 수정' : '갱신예정';
  }
  if(c.renewed_from_id){
    const orig = (allContracts||[]).find(x => x.id === c.renewed_from_id);
    const genuine = orig && orig.renewed_to_id === c.id && orig.terminate_date;
    return genuine ? '갱신' : '재계약';
  }
  return '신규계약';
}

/** 고객사 대표자명 기반 인사말 (없으면 일반 인사) */
function _getCompanyGreeting(){
  const c  = (allContracts||[]).find(x=>x.id===window._printingContractId);
  const co = c ? (allCompanies||[]).find(x=>x.id===c.company_id) : null;
  if(!co) return '안녕하세요.';
  let reps = [];
  try { reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : (co.representatives || []); } catch(_){}
  const repName = (Array.isArray(reps) && reps[0] && reps[0].name) ? reps[0].name : '';
  return repName ? `안녕하세요, ${repName}님.` : '안녕하세요.';
}

