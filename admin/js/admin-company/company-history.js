// 고객사 수정 이력 렌더링
// ==============================================================================
let _cmHistPage = 1;
const _CM_HIST_PAGE_SIZE = 10;

function _fmtHistVal(val, field){
  if(field === 'allowance_config'){
    try {
      const cfg = typeof val === 'string' ? JSON.parse(val) : (val || {});
      const lines = [];
      const labels = {
        site:'현장수당', position:'직책수당', skill:'기술수당',
        license:'면허수당', remote_area:'벽지수당',
        car:'차량지원비', meal:'식대', childcare:'육아수당',
        regular_bonus:'정기상여금',
        research:'연구활동비', communication:'통신비', fitness:'체력증진비',
        self_dev:'자기계발비', book:'도서지원비', overseas:'해외근무수당',
      };
      // pay_type 없는 항목(simple 항목)
      const simpleFields = new Set(['site','position','skill','license','remote_area','regular_bonus']);
      Object.entries(labels).forEach(([k, lbl]) => {
        if(cfg[k]){
          const ptSuffix = simpleFields.has(k) ? '' : `(${cfg[k+'_pay_type']||'포함'})`;
          lines.push(`${lbl}${ptSuffix}`);
        }
      });
      return lines.length ? lines.join(', ') : '(없음)';
    } catch(e){ return String(val||''); }
  }
  const s = String(val||'').trim();
  return s || '(없음)';
}

function _renderCompanyHistory(companyId){
  const sec = document.getElementById('cm-history-section');
  if(!sec) return;
  const rows = (allCompanyHistories||[])
    .filter(h => h.company_id === companyId)
    .sort((a,b) => (b.changed_at||0) - (a.changed_at||0));

  if(!rows.length){
    sec.style.display = 'none';
    return;
  }
  sec.style.display = '';
  // 이력 섹션 열린 상태로 표시
  const _histBody = document.getElementById('cm-history-body');
  const _histIcon = document.getElementById('cm-history-toggle-icon');
  if(_histBody) _histBody.style.display = '';
  if(_histIcon) _histIcon.className = 'fas fa-chevron-up';

  // 총 페이지
  const total = rows.length;
  const totalPages = Math.ceil(total / _CM_HIST_PAGE_SIZE);
  _cmHistPage = Math.min(_cmHistPage, totalPages);
  const pageRows = rows.slice((_cmHistPage-1)*_CM_HIST_PAGE_SIZE, _cmHistPage*_CM_HIST_PAGE_SIZE);

  // 카운트 뱃지
  const badge = document.getElementById('cm-history-count');
  if(badge) badge.textContent = total;

  // tbody
  const tbody = document.getElementById('cm-history-tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  pageRows.forEach(h => {
    // 수정 일시: changed_at (실제 저장 시각)
    const dt = h.changed_at ? new Date(parseFloat(h.changed_at)) : null;
    const dtStr = dt && !isNaN(dt)
      ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
      : '-';
    // 적용일: effective_date (YYYY-MM-DD 문자열)
    const effStr = h.effective_date || '-';
    let changes = [];
    try { changes = Array.isArray(h.changes) ? h.changes : JSON.parse(h.changes || '[]'); } catch(e){ changes = []; }
    const nCh = changes.length || 1; // changes가 없어도 행은 1개 표시
    // 첫 번째 변경 행: 수정일시 + 적용일 rowspan
    changes.forEach((ch, ci) => {
      const tr = document.createElement('tr');
      tr.className = ci === 0 ? 'cm-hist-row-first' : 'cm-hist-row-cont';
      if(ci === 0){
        const tdDate = document.createElement('td');
        tdDate.rowSpan = nCh;
        tdDate.className = 'cm-hist-date';
        tdDate.textContent = dtStr;
        tr.appendChild(tdDate);
        const tdEff = document.createElement('td');
        tdEff.rowSpan = nCh;
        tdEff.className = 'cm-hist-date';
        tdEff.textContent = effStr;
        tr.appendChild(tdEff);
      }
      const tdField = document.createElement('td');
      tdField.className = 'cm-hist-field';
      tdField.textContent = ch.label || ch.field;
      const tdBefore = document.createElement('td');
      tdBefore.className = 'cm-hist-before';
      tdBefore.textContent = _fmtHistVal(ch.before, ch.field);
      const tdAfter = document.createElement('td');
      tdAfter.className = 'cm-hist-after';
      tdAfter.textContent = _fmtHistVal(ch.after, ch.field);
      tr.appendChild(tdField);
      tr.appendChild(tdBefore);
      tr.appendChild(tdAfter);
      tbody.appendChild(tr);
    });
  });

  // 페이징
  const pager = document.getElementById('cm-history-pager');
  if(!pager) return;
  if(totalPages <= 1){ pager.innerHTML = ''; return; }
  let pHtml = `<div class="cm-hist-pager">`;
  pHtml += `<button class="cm-hist-page-btn" ${_cmHistPage<=1?'disabled':''} onclick="_cmHistGoPage(${_cmHistPage-1})"><i class="fas fa-chevron-left"></i></button>`;
  // 최대 5개 페이지 버튼
  const pStart = Math.max(1, _cmHistPage-2);
  const pEnd   = Math.min(totalPages, pStart+4);
  for(let p=pStart; p<=pEnd; p++){
    pHtml += `<button class="cm-hist-page-btn${p===_cmHistPage?' active':''}" onclick="_cmHistGoPage(${p})">${p}</button>`;
  }
  pHtml += `<button class="cm-hist-page-btn" ${_cmHistPage>=totalPages?'disabled':''} onclick="_cmHistGoPage(${_cmHistPage+1})"><i class="fas fa-chevron-right"></i></button>`;
  pHtml += `<span class="cm-hist-page-info">${_cmHistPage} / ${totalPages} 페이지 (총 ${total}건)</span></div>`;
  pager.innerHTML = pHtml;
}

function _cmHistGoPage(p){
  _cmHistPage = p;
  const companyId = editId.company;
  if(companyId) _renderCompanyHistory(companyId);
}

function _cmHistToggle(){
  const body = document.getElementById('cm-history-body');
  const icon = document.getElementById('cm-history-toggle-icon');
  if(!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : '';
  if(icon) icon.className = isOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
}

/** 계약 체결 시점에 유효했던 고객사 스냅샷을 반환
 *  contract_start(또는 created_at) 이후의 첫 번째 이력 직전 상태 = 해당 시점의 회사 정보
 *  이력이 없으면 현재 회사 정보 그대로 반환
 */
function getCompanySnapshotAt(companyId, contractTimestamp){
  const co = (allCompanies||[]).find(x=>x.id===companyId);
  if(!co) return null;
  const hist = (allCompanyHistories||[])
    .filter(h => h.company_id === companyId && parseFloat(h.changed_at||0) > (contractTimestamp||0))
    .sort((a,b) => parseFloat(a.changed_at||0) - parseFloat(b.changed_at||0)); // 오름차순
  if(!hist.length){
    // 계약 이후 변경 없음 → 현재 회사 정보 (allowance_config 파싱 보장)
    return _parseCo(co);
  }
  // 계약 이후 가장 첫 변경의 snapshot = 계약 당시 상태
  let snap = hist[0].snapshot || {};
  if(typeof snap === 'string'){ try{ snap = JSON.parse(snap); }catch(e){ snap = {}; } }
  return _parseCo({ ...co, ...snap });
}

/** 고객사 객체의 JSON 문자열 필드를 파싱하여 반환 */
function _parseCo(co){
  if(!co) return co;
  const result = { ...co };
  if(typeof result.allowance_config === 'string'){
    try{ result.allowance_config = JSON.parse(result.allowance_config); }catch(e){ result.allowance_config = {}; }
  }
  return result;
}

// == 급여 항목 설정(allowance_config) 헬퍼 ==
// pay_type select가 있는 항목 목록
const _CM_AW_PT_FIELDS = ['childcare','car','meal','research','communication','fitness','self_dev','book','overseas'];
// pay_type select 없는 항목 (체크만) — regular_bonus: 통상임금 포함 고정
const _CM_AW_SIMPLE_FIELDS = ['site','position','skill','license','remote_area','regular_bonus'];

/** 체크박스 체크 시 pay_type select 활성/비활성 토글 */
function cmAwTogglePayType(field, checked){
  const sel = document.getElementById(`cm-aw-${_cmAwHtmlId(field)}-pt`);
  if(!sel) return;
  sel.disabled = !checked;
  if(!checked){
    sel.value = '';
  } else if(!sel.value){
    // 새로 체크 시 선택값이 없으면 '매월 정기지급(fixed)'을 기본값으로 설정
    sel.value = 'fixed';
  }
}

/** allowance_config 필드명 → HTML id 변환 (self_dev → self-dev) */
function _cmAwHtmlId(f){ return f.replace(/_/g, '-'); }

/** 모달 → allowance_config 객체 수집 */
function _cmGetAllowanceConfig(){
  const cfg = {};
  _CM_AW_SIMPLE_FIELDS.forEach(f => {
    cfg[f] = document.getElementById(`cm-aw-${_cmAwHtmlId(f)}`)?.checked || false;
  });
  _CM_AW_PT_FIELDS.forEach(f => {
    const hid = _cmAwHtmlId(f);
    cfg[f] = document.getElementById(`cm-aw-${hid}`)?.checked || false;
    cfg[`${f}_pay_type`] = cfg[f]
      ? (document.getElementById(`cm-aw-${hid}-pt`)?.value || '')
      : '';
  });
  return cfg;
}

/** allowance_config 객체 → 모달에 복원
 *  car / meal 은 cfg 에 값이 없을 때(신규·구형 고객사) checked=true, pay_type='fixed' 기본값 적용 */
const _CM_AW_DEFAULT_CHECKED = { car: 'fixed', meal: 'fixed' };

function _cmSetAllowanceConfig(cfg){
  if(!cfg) cfg = {};
  _CM_AW_SIMPLE_FIELDS.forEach(f => {
    const cb = document.getElementById(`cm-aw-${_cmAwHtmlId(f)}`);
    if(cb) cb.checked = !!cfg[f];
  });
  _CM_AW_PT_FIELDS.forEach(f => {
    const hid = _cmAwHtmlId(f);
    const cb  = document.getElementById(`cm-aw-${hid}`);
    const sel = document.getElementById(`cm-aw-${hid}-pt`);
    // car / meal: cfg에 명시적 값이 없으면 기본값(체크 + fixed) 적용
    const useDefault = (f in _CM_AW_DEFAULT_CHECKED) && cfg[f] === undefined;
    const checked  = useDefault ? true  : !!cfg[f];
    const payType  = useDefault
      ? (_CM_AW_DEFAULT_CHECKED[f])
      : (cfg[`${f}_pay_type`] || (cfg[f] ? 'fixed' : ''));
    if(cb)  cb.checked = checked;
    if(sel){ sel.disabled = !checked; sel.value = payType; }
  });
}
// ── 대시보드 카드용 사용료 현황 계산 ──
function getBillingInfoForDashCard(companyId){
  const todayStr = new Date().toISOString().slice(0,10);
  const now = new Date();
  const yr  = now.getFullYear();
  const mo  = now.getMonth() + 1;

  // 이번 달 실제 청구
  const thisBill = allBillings.find(b =>
    b.company_id === companyId &&
    Number(b.billing_year) === yr &&
    Number(b.billing_month) === mo
  );

  // 이월 미납금 (마감일 경과된 이전 월 잔액)
  const calcPrevUnpaid = (billingYear, billingMonth) =>
    allBillings.filter(b => {
      if(b.company_id !== companyId) return false;
      const bYM = Number(b.billing_year)*100 + Number(b.billing_month);
      const cYM = Number(billingYear)*100    + Number(billingMonth);
      return bYM < cYM;
    }).reduce((sum, b) => {
      if(b.payment_status ===PAYMENT_STATUS.PAID) return sum;
      if(!b.due_date || b.due_date >= todayStr) return sum;
      const rem = (b.total_amount||0) - (b.partial_paid_amount||0);
      return sum + (rem > 0 ? rem : 0);
    }, 0);

  // ── 청구 생성 전 (가상) ──
  if(!thisBill){
    const prevUnpaid = calcPrevUnpaid(yr, mo);
    return { type:'virtual', prevUnpaid };
  }

  // ── 실제 청구 있음 ──
  const paid    = thisBill.partial_paid_amount || 0;
  const rem     = (thisBill.total_amount || 0) - paid;
  const prevUnpaid = calcPrevUnpaid(yr, mo);
  const curOverdue = (rem > 0 && thisBill.due_date && thisBill.due_date < todayStr) ? rem : 0;
  const totalUnpaid = prevUnpaid + curOverdue;

  let status;
  if(thisBill.payment_status ===PAYMENT_STATUS.PAID || (thisBill.payment_date && rem <= 0)){
    status = prevUnpaid > 0 ? '일부납' : '완납';
  } else if(paid > 0 && rem > 0){
    status = '일부납';
  } else if(thisBill.due_date && thisBill.due_date < todayStr){
    status = '미납';
  } else {
    status = '납부대기';
  }

  // 버튼 표시 여부 (관리 열에 버튼이 활성화된 경우)
  const showButton = status !==PAYMENT_STATUS.PAID || prevUnpaid > 0;
  const modalTotal = rem + prevUnpaid;

  return {
    type: 'actual',
    bill: thisBill,
    status,
    paid,
    rem,
    prevUnpaid,
    totalUnpaid,
    showButton,
    modalTotal
  };
}

// 고객사 카드 → 사용료 관리 바로가기 (해당 고객사 필터)
function goBillingByCompany(companyId, companyName){
  const menuEl = document.querySelector('.menu-item[data-page="billing"]');
  showPage('billing', menuEl);

  // 검색창에 고객사명 입력 후 재렌더링
  const searchEl = document.getElementById('billing-search');
  if(searchEl) searchEl.value = companyName;

  // 필터는 전체로 초기화
  const allRadio = document.querySelector('input[name="billing-filter"][value="all"]');
  if(allRadio) allRadio.checked = true;

  renderBillings();

  // 안내 배너
  const old = document.getElementById('billing-company-banner');
  if(old) old.remove();
  const header = document.querySelector('#page-billing .page-header');
  if(header){
    const banner = document.createElement('div');
    banner.id = 'billing-company-banner';
    banner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:10px 16px;background:linear-gradient(90deg,#faf5ff,#ede9fe);border:1px solid #c4b5fd;border-radius:10px;font-size:13px;color:#6d28d9;font-weight:600;';
    banner.innerHTML = `<span><i class="fas fa-filter" style="margin-right:6px;"></i>${companyName} 사용료 현황 보기</span>
      <button onclick="clearBillingCompanyFilter()" style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:16px;" title="필터 해제"><i class="fas fa-times-circle"></i></button>`;
    header.insertAdjacentElement('afterend', banner);
  }
}

function clearBillingCompanyFilter(){
  const banner = document.getElementById('billing-company-banner');
  if(banner) banner.remove();
  const searchEl = document.getElementById('billing-search');
  if(searchEl) searchEl.value = '';
  renderBillings();
}



// ── 현재 선택된 근로계약서 페이지 고객사 ID ──
// currentContCompanyId → 최상단 STATE 블록에서 선언됨

// 고객사 칩 목록 렌더링
function renderContCompanyList(){
  const q = (document.getElementById('cont-company-search')?.value || '').toLowerCase().trim();
  const container = document.getElementById('cont-company-chips');
  if(!container) return;

  const companies = allCompanies.filter(c =>
    isCompanyActive(c) && (!q || c.company_name.toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));

  if(!companies.length){
    container.innerHTML = `<div style="color:#9ca3af;font-size:13px;padding:8px 0;">${q ? `"${q}" 검색 결과 없음` : '이용 중인 고객사가 없습니다'}</div>`;
    return;
  }

  container.innerHTML = companies.map(c => {
    const isSelected = c.id === currentGlobalCompanyId;
    const empCnt = allEmployees.filter(e => e.company_id === c.id && (e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE)).length;
    return `<button onclick="selectContCompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}')"
      class="co-chip${isSelected?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
      <span class="co-chip-badge count">${empCnt}명</span>
    </button>`;
  }).join('');
}

// 근로계약서 페이지 고객사 선택
function selectContCompany(companyId, companyName){
  currentContCompanyId = companyId;
  // 글로벌 공유 변수만 업데이트 (다른 페이지 변수는 showPage()에서 처리)
  currentGlobalCompanyId = companyId;
  currentGlobalCompanyName = companyName;
  document.getElementById('cont-selected-company-label').innerHTML =
    `<i class="fas fa-file-signature" style="margin-right:6px;"></i>${companyName} 근로계약 목록`;
  document.getElementById('cont-company-select-card').style.display = 'none';
  document.getElementById('cont-list-section').style.display = 'block';
  document.getElementById('cont-search').value = '';
  const _ecEl = document.getElementById('cont-filter-empcat'); if(_ecEl) _ecEl.value='';
  const _stEl = document.getElementById('cont-filter-status'); if(_stEl) _stEl.value='';
  const _docEl = document.getElementById('cont-filter-docs-incomplete'); if(_docEl) _docEl.checked=false;
  pages.cont = 1;
  renderContracts();
}

// 고객사 선택 해제
function clearContCompanySelect(){
  currentContCompanyId = null;
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  document.getElementById('cont-company-select-card').style.display = '';
  document.getElementById('cont-list-section').style.display = 'none';
  document.getElementById('cont-company-search').value = '';
  renderContCompanyList();
  const _docEl2 = document.getElementById('cont-filter-docs-incomplete'); if(_docEl2) _docEl2.checked=false;
}

// 고객사 관리 카드 → 근로계약서 관리 바로가기
function goContractsByCompany(companyId, companyName){
  const co = allCompanies.find(c => c.id === companyId);
  if(co && !isCompanyActive(co)){
    toast('"' + companyName + '"은 이용중이 아닌 고객사입니다. 근로계약 관리가 불가합니다.', 'error');
    return;
  }
  const menuEl = document.querySelector('.menu-item[data-page="contracts"]');
  showPage('contracts', menuEl);
  selectContCompany(companyId, companyName);
}

// 대시보드 고객사 카드 → 급여 통계 조회 바로가기
function goLaborStatusByCompany(companyId, companyName){
  const menuEl = document.querySelector('.menu-item[data-page="labor-status"]');
  showPage('labor-status', menuEl);
  selectLsCompany(companyId, companyName);
}

// 구 배너 방식 호환용 (빈 함수로 유지)
function clearContractCompanyFilter(){ clearContCompanySelect(); }

// ─── 임금대장 고객사 칩 선택 ───
// currentPayCompanyId → 최상단 STATE 블록에서 선언됨

function renderPayCompanyList(){
  const q = (document.getElementById('pay-company-search')?.value || '').toLowerCase().trim();
  const container = document.getElementById('pay-company-chips');
  if(!container) return;

  const companies = allCompanies.filter(c =>
    isCompanyActive(c) && (!q || c.company_name.toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));

  if(!companies.length){
    container.innerHTML = `<div style="color:#9ca3af;font-size:13px;padding:8px 0;">${q ? `"${q}" 검색 결과 없음` : '이용 중인 고객사가 없습니다'}</div>`;
    return;
  }

  container.innerHTML = companies.map(c => {
    const isSelected = c.id === currentGlobalCompanyId;
    const payCnt = allPayrolls.filter(p => !p.is_draft && p.company_id === c.id).length;
    return `<button onclick="selectPayCompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}')"
      class="co-chip${isSelected?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
      <span class="co-chip-badge count">${payCnt}건</span>
    </button>`;
  }).join('');
}

function selectPayCompany(companyId, companyName){
  currentPayCompanyId = companyId;
  // 글로벌 공유 변수만 업데이트 (다른 페이지 변수는 showPage()에서 처리)
  currentGlobalCompanyId = companyId;
  currentGlobalCompanyName = companyName;
  pages.pay = 1;
  document.getElementById('pay-selected-company-label').innerHTML =
    `<i class="fas fa-money-bill-wave" style="margin-right:6px;"></i>${companyName} 급여 명세서`;
  document.getElementById('pay-company-select-card').style.display = 'none';
  document.getElementById('pay-list-section').style.display = 'block';
  document.getElementById('pay-excel-btn').style.display = '';
  document.getElementById('pay-search').value = '';
  initPayYearMonth();
  renderPayrolls();
}

function clearPayCompanySelect(){
  currentPayCompanyId = null;
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  document.getElementById('pay-company-select-card').style.display = '';
  document.getElementById('pay-list-section').style.display = 'none';
  document.getElementById('pay-excel-btn').style.display = 'none';
  document.getElementById('pay-company-search').value = '';
  renderPayCompanyList();
}

// 연도·월 필터 초기화
function initPayYearMonth(){
  const yrSel = document.getElementById('pay-year-filter');
  if(!yrSel) return;
  const curYr = new Date().getFullYear();
  const curMo = new Date().getMonth()+1;
  // 연도 옵션 (매번 재생성하여 현재연도 선택 보장)
  yrSel.innerHTML = '';
  for(let y = curYr + 1; y >= curYr - 2; y--){
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '년';
    if(y === curYr) opt.selected = true;
    yrSel.appendChild(opt);
  }
  // 월 옵션 — 현재 월 기본 선택, '전체' 없음
  const moSel = document.getElementById('pay-month-filter');
  if(moSel){
    moSel.innerHTML = '';
    for(let i=1;i<=12;i++){
      moSel.innerHTML += `<option value="${i}" ${i===curMo?'selected':''}>${i}월</option>`;
    }
  }
}

// 대시보드·고객사관리 카드 → 임금대장 바로가기
function goPayrollsByCompany(companyId, companyName){
  const co = allCompanies.find(c => c.id === companyId);
  if(co && !isCompanyActive(co)){
    toast('"' + companyName + '"은 이용중이 아닌 고객사입니다. 급여 조회가 불가합니다.', 'error');
    return;
  }
  const menuEl = document.querySelector('.menu-item[data-page="payrolls"]');
  showPage('payrolls', menuEl);
  selectPayCompany(companyId, companyName);
}

// 하위 호환
function showPayrollCompanyBanner(){}
function clearPayrollCompanyFilter(){ clearPayCompanySelect(); }

// 해지 대상 고객사 임시 저장
let terminateTargetId = null;

// [사용료 숨김] terminateCompany - 단순화 버전 (미납금 체크 제거)
function terminateCompany(id, name){
  terminateTargetId = id;
  document.getElementById('tm-company-name').innerHTML =
    `<i class="fas fa-building" style="color:#64748b;margin-right:6px;"></i>${name}`;
  // 해지일 기본값: 오늘
  const todayStr = new Date().toISOString().slice(0, 10);
  const endDateEl = document.getElementById('tm-end-date');
  if(endDateEl) endDateEl.value = todayStr;
  openModal('terminate-modal');
}

// [사용료 숨김] doTerminate - 단순화 버전 (미납금 체크 없이 즉시 해지)
async function doTerminate(){
  const id = terminateTargetId;
  if(!id) return;
  const c = allCompanies.find(x => x.id === id);
  if(!c) return;
  // 해지일: 입력값 우선, 없으면 오늘
  const endDateEl = document.getElementById('tm-end-date');
  const endDateStr = endDateEl?.value || new Date().toISOString().slice(0, 10);
  if(!endDateStr) return toast('계약 해지일을 입력해 주세요.', 'error');
  const todayStr = new Date().toISOString().slice(0, 10);
  // 해지일이 오늘 이하면 즉시 해지(INACTIVE), 미래면 해지예정(ACTIVE + contract_end_date 세팅)
  const newStatus = endDateStr <= todayStr ? COMPANY_STATUS.INACTIVE : COMPANY_STATUS.ACTIVE;
  const patch = { status: newStatus, contract_end_date: endDateStr };
  await api(`../tables/companies/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
  closeModal('terminate-modal');
  closeModal('company-modal');
  await loadCompanies();
  populateFilters();
  populatePICompanies();
  renderCompanies();
  renderDashboard();
  const isFuture = endDateStr > todayStr;
  if(isFuture){
    _createTermNotice(c, endDateStr);
  }
  const msg = isFuture
    ? `"${c.company_name}" 해지 예정 등록 (예정일: ${endDateStr})`
    : `"${c.company_name}" 해지 처리 완료 (해지일: ${endDateStr})`;
  toast(msg);
}

// ── 해지예정 고객사 — 해지일 변경 ──
let _changeEndDateTargetId = null;

function changeEndDate(id, name, currentEndDate){
  _changeEndDateTargetId = id;
  const nameEl = document.getElementById('ced-company-name');
  if(nameEl) nameEl.innerHTML = `<i class="fas fa-building" style="color:#64748b;margin-right:6px;"></i>${name}`;
  const dateEl = document.getElementById('ced-end-date');
  if(dateEl){
    dateEl.min = '';
    dateEl.value = currentEndDate || new Date().toISOString().slice(0,10);
  }
  openModal('change-end-date-modal');
}

async function doChangeEndDate(){
  const id = _changeEndDateTargetId;
  if(!id) return;
  const c = allCompanies.find(x => x.id === id);
  if(!c) return;
  const oldEndDateStr = c.contract_end_date || ''; // 변경 전 해지일
  const dateEl = document.getElementById('ced-end-date');
  const newDateStr = dateEl?.value || '';
  if(!newDateStr) return toast('해지일을 선택해 주세요.', 'error');
  const todayStr = new Date().toISOString().slice(0,10);
  // 오늘 이하면 즉시 해지(INACTIVE), 미래면 해지예정(ACTIVE) 유지
  const newStatus = newDateStr <= todayStr ? COMPANY_STATUS.INACTIVE : COMPANY_STATUS.ACTIVE;
  const patch = { status: newStatus, contract_end_date: newDateStr };
  await api(`../tables/companies/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
  closeModal('change-end-date-modal');
  await loadCompanies();
  populateFilters(); populatePICompanies(); renderCompanies(); renderDashboard();
  const isFuture = newDateStr > todayStr;
  if(isFuture){
    _createTermNotice(c, newDateStr, oldEndDateStr);
  }
  const msg = isFuture
    ? `해지 예정일이 ${newDateStr}로 변경되었습니다.`
    : `해지 처리 완료 (해지일: ${newDateStr})`;
  toast(msg);
}

// ── 해지예정 고객사 — 해지 취소 ──
async function cancelTerminate(id, name){
  const c = allCompanies.find(x => x.id === id);
  const isFullyTerminated = c && c.status === COMPANY_STATUS.INACTIVE;
  const msg = isFullyTerminated
    ? `"${name}"의 해지를 취소하시겠습니까?\n계약 해지일이 제거되고 이용중 상태로 복구됩니다.`
    : `"${name}"의 해지 예정을 취소하시겠습니까?\n계약 해지 예정일이 제거되고 이용중 상태로 복구됩니다.`;
  if(!confirm(msg)) return;
  const patch = { status: COMPANY_STATUS.ACTIVE, contract_end_date: null };
  await api(`../tables/companies/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
  await loadCompanies();
  populateFilters(); populatePICompanies(); renderCompanies(); renderDashboard();
  // 해지 예정 취소 알림 발송 (완전 해지 취소든 예정 취소든 동일하게)
  if(c){
    _createCancelNotice(c);
  }
  const toastMsg = isFullyTerminated
    ? `"${name}" 해지가 취소되어 이용중으로 복구되었습니다.`
    : `"${name}" 해지 예정이 취소되었습니다.`;
  toast(toastMsg);
}

/**
 * 해지 예약 / 예정일 변경 시 고객사 앱 알림 발송
 * @param company       회사 객체
 * @param endDateStr    해지 예정일
 * @param oldEndDateStr 변경 전 해지일 (optional, 미지정 시 최초 예약)
 */
async function _createTermNotice(company, endDateStr, oldEndDateStr){
  if(!company) return;
  const adminName = typeof _getAdminUsername === 'function' ? _getAdminUsername() : '관리자';
  const title = oldEndDateStr
    ? '[서비스 해지 예정일 변경 안내]'
    : '[서비스 해지 예정 안내]';
  const body  = oldEndDateStr
    ? `해지예정일이 ${oldEndDateStr}에서 ${endDateStr}로 변경되었습니다.`
    : `${endDateStr}부로 서비스 이용이 해지될 예정입니다. 감사합니다.`;
  try {
    await fetch('../tables/company_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        company_id   : company.id,
        company_name : company.company_name || '',
        notice_type  : 'notice',
        title,
        body,
        sent_at      : new Date().toISOString(),
        sent_by      : adminName,
        is_read      : 0,
      }),
    });

  } catch(e){
    console.warn('[해지예정알림] 발송 실패:', e);
  }
}

/**
 * 해지 예정 취소 시 고객사 앱 알림 발송
 */
async function _createCancelNotice(company){
  if(!company) return;
  const adminName = typeof _getAdminUsername === 'function' ? _getAdminUsername() : '관리자';
  const title = '[서비스 해지 취소 안내]';
  const body  = '예약되었던 서비스 이용 해지가 정상적으로 취소처리되었습니다. 서비스를 계속 이용하실 수 있습니다.';
  try {
    await fetch('../tables/company_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        company_id   : company.id,
        company_name : company.company_name || '',
        notice_type  : 'notice',
        title,
        body,
        sent_at      : new Date().toISOString(),
        sent_by      : adminName,
        is_read      : 0,
      }),
    });

  } catch(e){
    console.warn('[해지취소알림] 발송 실패:', e);
  }
}

/* [사용료 숨김] 기존 terminateCompany / doTerminate (미납금 체크 포함) - 원복 시 아래 주석 해제
function terminateCompany_DISABLED(id, name){
  const todayStr = new Date().toISOString().slice(0, 10);
  terminateTargetId = id;
  let unpaidAmount = 0, unpaidCount = 0;
  let pendingAmount = 0, pendingCount = 0;
  allBillings.filter(b => b.company_id === id).forEach(b => {
    if(b.payment_status ===PAYMENT_STATUS.PAID) return;
    const paid = b.partial_paid_amount || 0;
    const rem  = (b.total_amount || 0) - paid;
    if(rem <= 0) return;
    if(b.due_date && b.due_date < todayStr){
      unpaidAmount += rem; unpaidCount++;
    } else {
      pendingAmount += rem; pendingCount++;
    }
  });
  const totalLoss = unpaidAmount + pendingAmount;
  const hasBalance = totalLoss > 0;
  document.getElementById('tm-company-name').innerHTML =
    `<i class="fas fa-building" style="color:#64748b;margin-right:6px;"></i>${name}`;
  if(hasBalance){
    document.getElementById('tm-no-balance').style.display   = 'none';
    document.getElementById('tm-has-balance').style.display  = 'block';
    document.getElementById('tm-buttons-balance').style.cssText = 'display:flex;flex:2;gap:8px;';
    document.getElementById('tm-buttons-clean').style.display  = 'none';
    document.getElementById('tm-unpaid-amount').textContent  = Math.round(unpaidAmount).toLocaleString('ko-KR') + '원';
    document.getElementById('tm-unpaid-count').textContent   = unpaidCount + '건';
    document.getElementById('tm-pending-amount').textContent = Math.round(pendingAmount).toLocaleString('ko-KR') + '원';
    document.getElementById('tm-pending-count').textContent  = pendingCount + '건';
    document.getElementById('tm-total-loss-preview').textContent = Math.round(totalLoss).toLocaleString('ko-KR') + '원';
  } else {
    document.getElementById('tm-no-balance').style.display   = 'block';
    document.getElementById('tm-has-balance').style.display  = 'none';
    document.getElementById('tm-buttons-balance').style.display = 'none';
    document.getElementById('tm-buttons-clean').style.cssText   = 'display:block;';
  }
  openModal('terminate-modal');
}

async function doTerminate_DISABLED(withLoss){
  const id = terminateTargetId;
  if(!id) return;
  const c = allCompanies.find(x => x.id === id);
  if(!c) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  if(!withLoss){
    const hasBalance = allBillings.some(b => {
      if(b.company_id !== id || b.payment_status ===PAYMENT_STATUS.PAID) return false;
      const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
      return rem > 0;
    });
    if(hasBalance){
      closeModal('terminate-modal');
      toast('완납 후 해지할 수 있습니다. 미정산 금액을 먼저 처리해 주세요.', 'error');
      return;
    }
    const body = {...c, status: CONTRACT_STATUS.TERMINATED, contract_end_date: todayStr};
    await api(`../tables/companies/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    closeModal('terminate-modal');
    await loadCompanies();populateFilters();populatePICompanies();renderCompanies();renderDashboard();
    toast(`"${c.company_name}" 해지 완료 (해지일: ${todayStr})`);
    return;
  }
  let totalLoss = 0;
  const unpaidBillings = allBillings.filter(b => {
    if(b.company_id !== id || b.payment_status ===PAYMENT_STATUS.PAID) return false;
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    return rem > 0;
  });
  for(const b of unpaidBillings){
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    totalLoss += rem;
    const updBody = {...b, payment_status:'완납', loss_amount:rem, loss_date:todayStr};
    await api(`../tables/billings/${b.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updBody)});
  }
  const compBody = {...c, status: CONTRACT_STATUS.TERMINATED, contract_end_date:todayStr, loss_amount:(c.loss_amount||0)+totalLoss, loss_date:todayStr};
  await api(`../tables/companies/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(compBody)});
  closeModal('terminate-modal');
  await loadData();populateFilters();populatePICompanies();renderCompanies();renderDashboard();renderBillingTrendChart();
  toast(`"${c.company_name}" 손실 처리(${Math.round(totalLoss).toLocaleString('ko-KR')}원) 후 해지 완료`);
}
*/
