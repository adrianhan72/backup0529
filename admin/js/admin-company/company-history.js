// 고객사 수정 이력 렌더링
// ==============================================================================
let _cmHistPage = 1;
const _CM_HIST_PAGE_SIZE = 10;

function _fmtHistVal(val, field){
  if(field === 'representatives'){
    try {
      const reps = typeof val === 'string' ? JSON.parse(val) : (Array.isArray(val) ? val : []);
      if(!Array.isArray(reps) || reps.length === 0) return '(없음)';
      const names = reps.map(r => r.name || '(이름 없음)').join(', ');
      return names;
    } catch(e){ return String(val||''); }
  }
  if(field === 'registered_executives' || field === 'related_party_workers'){
    // 등기임원/특수관계인 변경 이력: before/after는 이름 목록 문자열
    return String(val||'') || '(없음)';
  }
  if(field === 'allowance_config'){
    try {
      const cfg = typeof val === 'string' ? JSON.parse(val) : (val || {});
      const lines = [];
      const labels = {
        site:'현장수당', position:'직책수당', skill:'기술수당',
        license:'면허수당', hazard:'위험수당', remote_area:'벽지수당',
        car:'차량지원비', meal:'식대', childcare:'육아수당',
        regular_bonus:'정기상여금',
        research:'연구활동비', communication:'통신비', fitness:'체력증진비',
        self_dev:'자기계발비', book:'도서지원비', overseas:'해외근무수당',
      };
      Object.entries(labels).forEach(([k, lbl]) => {
        if(cfg[k]){
          const ptSuffix = `(${cfg[k+'_pay_type']||'포함'})`;
          lines.push(`${lbl}${ptSuffix}`);
        }
      });
      // 사용자 정의 통상임금 항목
      if(Array.isArray(cfg._custom_ordinary)){
        cfg._custom_ordinary.forEach(item => {
          if(item && item.name) lines.push(`[${item.name}]`);
        });
      }
      // 사용자 정의 고정수당 항목
      if(Array.isArray(cfg._custom_fixed)){
        cfg._custom_fixed.forEach(item => {
          if(item && item.name) lines.push(`[${item.name}](${item.pay_type||'fixed'})`);
        });
      }
      return lines.length ? lines.join(', ') : '(없음)';
    } catch(e){ return String(val||''); }
  }
  const s = String(val||'').trim();
  // JSON 빈 객체/배열은 (없음)으로 표시
  if(s === '{}' || s === '[]' || s === 'null' || s === '') return '(없음)';
  return s;
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
  // 이력 섹션 닫힌 상태로 표시
  const _histBody = document.getElementById('cm-history-body');
  const _histIcon = document.getElementById('cm-history-toggle-icon');
  if(_histBody) _histBody.style.display = 'none';
  if(_histIcon) _histIcon.className = 'fas fa-chevron-down';

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
  const s = Math.min((_cmHistPage-1)*_CM_HIST_PAGE_SIZE+1, total);
  const e = Math.min(_cmHistPage*_CM_HIST_PAGE_SIZE, total);
  const mBtn = (label, pg, disabled, active) =>
    `<button class="page-btn${active?' active':''}" onclick="_cmHistGoPage(${pg})"${disabled?' disabled':''}>${label}</button>`;
  const btns = [];
  btns.push(mBtn('<i class="fas fa-chevron-left"></i>', _cmHistPage-1, _cmHistPage<=1, false));
  const pStart = Math.max(1, _cmHistPage-2);
  const pEnd   = Math.min(totalPages, pStart+4);
  for(let p=pStart; p<=pEnd; p++){
    btns.push(mBtn(p, p, false, p===_cmHistPage));
  }
  btns.push(mBtn('<i class="fas fa-chevron-right"></i>', _cmHistPage+1, _cmHistPage>=totalPages, false));
  pager.innerHTML = `<div class="pagination"><span class="page-info">총 <strong>${total}</strong>건 중 ${s}–${e}번째</span><div class="page-btns">${btns.join('')}</div></div>`;
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
 *  ※ snapshot 컬럼은 "변경 직전 상태"를 저장하므로,
 *    계약일 이후 첫 번째 변경의 snapshot = 계약일에 유효했던 설정 (off-by-one 수정 2026-08-19)
 */
function getCompanySnapshotAt(companyId, contractTimestamp){
  const co = (allCompanies||[]).find(x=>x.id===companyId);
  if(!co) return null;
  // contractTimestamp → 로컬 날짜 문자열 (YYYY-MM-DD) — fmtLocalDate 사용 (UTC 밀림 방지)
  const contractDate = contractTimestamp
    ? fmtLocalDate(new Date(contractTimestamp))
    : '';
  // 계약 시작일 "이후"의 첫 번째 이력을 찾는다 (과거순 정렬)
  // 같은 effective_date 다건이면 changed_at 오름차순 → 해당 날짜의 첫 변경
  const hist = (allCompanyHistories||[])
    .filter(h => h.company_id === companyId && h.effective_date && h.effective_date > contractDate)
    .sort((a,b) =>
      (a.effective_date||'').localeCompare(b.effective_date||'') ||
      (Number(a.changed_at)||0) - (Number(b.changed_at)||0)
    );
  if(hist.length > 0){
    // 계약일 이후 첫 번째 변경의 직전 상태(snapshot) = 계약 당시 상태
    let snap = hist[0].snapshot || {};
    if(typeof snap === 'string'){ try{ snap = JSON.parse(snap); }catch(e){ snap = {}; } }
    return _parseCo({ ...co, ...snap });
  }
  // 계약일 이후 이력 없음 → 현재 회사 설정 사용 (모든 변경이 계약일 이전에 반영됨)
  return _parseCo(co);
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
// 모든 항목에 pay_type select 적용 (통상임금 여부는 지급방식으로 결정)
const _CM_AW_PT_FIELDS = ['site','position','skill','license','hazard','remote_area','regular_bonus','childcare','car','meal','research','communication','fitness','self_dev','book','overseas'];
const _CM_AW_TAX_EXEMPT = ['childcare','car','meal','research'];

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

// ── 사용자 정의 통상임금 항목 관리 ──
let _cmAwCustomIdx = 0;

/** "+" 버튼 클릭 → 통상임금 커스텀 항목 추가 (그리드 내 add-row 앞에 삽입) */
function cmAwAddCustomItem(name = ''){
  const addRow = document.getElementById('cm-aw-add-row');
  if(!addRow) return;
  const idx = _cmAwCustomIdx++;
  const div = document.createElement('div');
  div.className = 'cm-aw-row cm-aw-custom-row';
  div.id = `cm-aw-custom-row-${idx}`;
  div.innerHTML = `
    <label class="cm-aw-check-label" style="min-width:auto;">
      <input type="checkbox" id="cm-aw-custom-${idx}" class="cm-aw-cb" checked />
      <input type="text" id="cm-aw-custom-name-${idx}" class="cm-aw-custom-input"
        placeholder="항목명 입력" value="${name.replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" style="width:165px;" />
    </label>
    <button type="button" class="cm-aw-custom-del" onclick="cmAwRemoveCustomItem(${idx})" title="삭제"><i class="fas fa-trash-alt"></i> 삭제</button>
  `;
  addRow.parentNode.insertBefore(div, addRow);
}

/** 커스텀 항목 삭제 */
function cmAwRemoveCustomItem(idx){
  const row = document.getElementById(`cm-aw-custom-row-${idx}`);
  if(row) row.remove();
}

/** 커스텀 항목 목록 수집 → [{name, checked}] */
function _cmAwGetCustomItems(){
  const items = [];
  document.querySelectorAll('.cm-aw-custom-row:not(.cm-aw-fixed-custom-row)').forEach(row => {
    const cb = row.querySelector('input[type="checkbox"]');
    const nameInput = row.querySelector('input[type="text"]');
    const name = (nameInput?.value || '').trim();
    if(name) items.push({ name, checked: cb?.checked ?? true });
  });
  return items;
}

/** 커스텀 항목 복원 (기존 항목 모두 제거 후 재생성) */
function _cmAwRestoreCustomItems(items){
  document.querySelectorAll('.cm-aw-custom-row:not(.cm-aw-fixed-custom-row)').forEach(r => r.remove());
  _cmAwCustomIdx = 0;
  if(Array.isArray(items)){
    items.forEach(item => cmAwAddCustomItem(item.name || ''));
  }
}

// ── 고정수당 사용자 정의 항목 관리 ──
let _cmAwFixedCustomIdx = 0;

/** "+" 버튼 클릭 → 고정수당 커스텀 항목 추가 */
function cmAwAddFixedCustomItem(name = '', payType = ''){
  const addRow = document.getElementById('cm-aw-fixed-add-row');
  if(!addRow) return;
  const idx = _cmAwFixedCustomIdx++;
  const div = document.createElement('div');
  div.className = 'cm-aw-row cm-aw-custom-row cm-aw-fixed-custom-row';
  div.id = `cm-aw-fixed-custom-row-${idx}`;
  div.innerHTML = `
    <label class="cm-aw-check-label" style="min-width:auto;flex:1;">
      <input type="checkbox" id="cm-aw-fixed-custom-${idx}" class="cm-aw-cb" checked onchange="cmAwToggleFixedCustomPayType(${idx},this.checked)" />
      <input type="text" id="cm-aw-fixed-custom-name-${idx}" class="cm-aw-custom-input"
        placeholder="항목명 입력" value="${name.replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" style="flex:1;" />
    </label>
    <select id="cm-aw-fixed-custom-pt-${idx}" class="cm-aw-pt-select">
      <option value="">고정수당 포함여부</option>
      <option value="fixed" ${payType==='fixed'?'selected':''}>매월 정기지급</option>
      <option value="daily" ${payType==='daily'?'selected':''}>출근일수에 따름</option>
      <option value="receipt" ${payType==='receipt'?'selected':''}>영수증 청구</option>
    </select>
    <button type="button" class="cm-aw-custom-del" onclick="cmAwRemoveFixedCustomItem(${idx})" title="삭제"><i class="fas fa-trash-alt"></i> 삭제</button>
  `;
  addRow.parentNode.insertBefore(div, addRow);
}

/** 고정수당 커스텀 항목 삭제 */
function cmAwRemoveFixedCustomItem(idx){
  const row = document.getElementById(`cm-aw-fixed-custom-row-${idx}`);
  if(row) row.remove();
}

/** 고정수당 커스텀 pay_type 토글 */
function cmAwToggleFixedCustomPayType(idx, checked){
  const sel = document.getElementById(`cm-aw-fixed-custom-pt-${idx}`);
  if(!sel) return;
  sel.disabled = !checked;
  if(!checked) sel.value = '';
  else if(!sel.value) sel.value = 'fixed';
}

/** 고정수당 커스텀 항목 수집 → [{name, checked, pay_type}] */
function _cmAwGetFixedCustomItems(){
  const items = [];
  document.querySelectorAll('.cm-aw-fixed-custom-row').forEach(row => {
    const cb = row.querySelector('input[type="checkbox"]');
    const nameInput = row.querySelector('input[type="text"]');
    const sel = row.querySelector('select');
    const name = (nameInput?.value || '').trim();
    if(name) items.push({ name, checked: cb?.checked ?? true, pay_type: sel?.value || 'fixed' });
  });
  return items;
}

/** 고정수당 커스텀 항목 복원 */
function _cmAwRestoreFixedCustomItems(items){
  document.querySelectorAll('.cm-aw-fixed-custom-row').forEach(r => r.remove());
  _cmAwFixedCustomIdx = 0;
  if(Array.isArray(items)){
    items.forEach(item => cmAwAddFixedCustomItem(item.name || '', item.pay_type || 'fixed'));
  }
}

/** allowance_config 필드명 → HTML id 변환 (self_dev → self-dev) */
function _cmAwHtmlId(f){ return f.replace(/_/g, '-'); }

/** 모달 → allowance_config 객체 수집 */
function _cmGetAllowanceConfig(){
  const cfg = {};
  _CM_AW_PT_FIELDS.forEach(f => {
    const hid = _cmAwHtmlId(f);
    cfg[f] = document.getElementById(`cm-aw-${hid}`)?.checked || false;
    // pay_type: select 요소가 있으면 실제 선택값, 없으면 checked=true일 때 'fixed' 기본
    const ptSel = document.getElementById(`cm-aw-${hid}-pt`);
    cfg[`${f}_pay_type`] = cfg[f] ? (ptSel ? (ptSel.value || 'fixed') : 'fixed') : '';
    if(_CM_AW_TAX_EXEMPT.includes(f)) cfg[`${f}_tax_exempt`] = true;
  });
  // 사용자 정의 통상임금 항목 (비어있으면 키 자체를 넣지 않아 DB와 diff 방지)
  const _customOrdinary = _cmAwGetCustomItems();
  if(_customOrdinary.length > 0) cfg._custom_ordinary = _customOrdinary;
  // 사용자 정의 고정수당 항목
  const _customFixed = _cmAwGetFixedCustomItems();
  if(_customFixed.length > 0) cfg._custom_fixed = _customFixed;
  return cfg;
}

/** allowance_config 객체 → 모달에 복원
 *  car / meal 은 cfg 에 값이 없을 때(신규·구형 고객사) checked=true, pay_type='fixed' 기본값 적용 */
const _CM_AW_DEFAULT_CHECKED = { car: 'fixed', meal: 'fixed' };

function _cmSetAllowanceConfig(cfg){
  if(!cfg) cfg = {};
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
  // 사용자 정의 통상임금 항목 복원
  _cmAwRestoreCustomItems(cfg._custom_ordinary || []);
  // 사용자 정의 고정수당 항목 복원
  _cmAwRestoreFixedCustomItems(cfg._custom_fixed || []);
}
// ── 대시보드 카드용 사용료 현황 계산 ──
function getBillingInfoForDashCard(companyId){
  const todayStr = fmtLocalDate(new Date());
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
    status = prevUnpaid > 0 ? PAYMENT_STATUS.PARTIAL : PAYMENT_STATUS.PAID;
  } else if(paid > 0 && rem > 0){
    status = PAYMENT_STATUS.PARTIAL;
  } else if(thisBill.due_date && thisBill.due_date < todayStr){
    status = PAYMENT_STATUS.UNPAID;
  } else {
    status = PAYMENT_STATUS.PENDING;
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
    return `<button onclick="selectContCompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}')"
      class="co-chip${isSelected?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
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
    `<i class="fas fa-file-signature" style="margin-right:6px;"></i>${companyName} 근로계약 현황`;
  document.getElementById('cont-company-select-card').style.display = 'none';
  document.getElementById('cont-list-section').style.display = 'block';
  document.getElementById('cont-search').value = '';
  const _ecEl = document.getElementById('cont-filter-empcat'); if(_ecEl) _ecEl.value='';
  // 상태 필터: 유효만 기본 선택, 나머지 해제
  // TODO: C2/C7 calcContractStatusDisplay 영문화 후 CONTRACT_STATUS.ACTIVE로 변경
  document.querySelectorAll('.cont-filter-status-cb').forEach(cb=>{cb.checked=cb.value==='valid';});
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
  if(typeof renderContracts === 'function') renderContracts();
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
      ${payCnt > 0 ? `<span class="count-badge">${payCnt}</span>` : ''}
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

function terminateCompany(id, name){
  terminateTargetId = id;
  const c = allCompanies.find(x => x.id === id);
  const todayStr = fmtLocalDate(new Date());
  const endDateEl = document.getElementById('tm-end-date');

  // 사용료 수납관리 ON → 미납금 체크 모달
  if (window._billingFeatureEnabled) {
    let unpaidAmount = 0, unpaidCount = 0;
    let pendingAmount = 0, pendingCount = 0;
    (allBillings||[]).filter(b => b.company_id === id).forEach(b => {
      if(b.payment_status === PAYMENT_STATUS.PAID) return;
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
    // billing-aware modal: tm-company-name-old + tm-end-date-billing (ID 분리 — terminate-modal과 중복 방지)
    document.getElementById('tm-company-name-old').innerHTML =
      `<i class="fas fa-building" style="color:#64748b;margin-right:6px;"></i>${name}`;
    const endDateBillingEl = document.getElementById('tm-end-date-billing');
    if (endDateBillingEl) {
      endDateBillingEl.min = c?.contract_start_date || '';
      endDateBillingEl.value = todayStr;
    }
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
    openModal('terminate-modal-billing');
    return;
  }

  // 사용료 수납관리 OFF → 단순 해지 (미납금 체크 없음)
  document.getElementById('tm-company-name').innerHTML =
    `<i class="fas fa-building" style="color:#64748b;margin-right:6px;"></i>${name}`;
  if(endDateEl){
    endDateEl.min = c?.contract_start_date || '';
    endDateEl.value = todayStr;
  }
  // 미납금 UI 숨김
  ['tm-no-balance','tm-has-balance','tm-buttons-balance'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const cleanBtn = document.getElementById('tm-buttons-clean');
  if (cleanBtn) cleanBtn.style.cssText = 'display:block;';
  openModal('terminate-modal');
}

async function doTerminate(withLoss){
  const id = terminateTargetId;
  if(!id) return;
  const c = allCompanies.find(x => x.id === id);
  if(!c) return;
  const todayStr = fmtLocalDate(new Date());
  // 사용료 수납관리 ON → billing 모달 전용 날짜 필드 사용 (ID 분리)
  const _termModalId = window._billingFeatureEnabled ? 'terminate-modal-billing' : 'terminate-modal';
  const _termDateId = window._billingFeatureEnabled ? 'tm-end-date-billing' : 'tm-end-date';
  const endDateEl = document.getElementById(_termDateId);
  const endDateStr = endDateEl?.value || todayStr;
  if(!endDateStr) return toast('계약 해지일을 입력해 주세요.', 'error');
  if(c.contract_start_date && endDateStr < c.contract_start_date){
    return toast(`해지일은 계약 시작일(${c.contract_start_date}) 이후여야 합니다.`, 'error');
  }

  // 사용료 수납관리 ON → 미납금 체크 + 손실 처리
  if (window._billingFeatureEnabled) {
    if(!withLoss){
      const hasBalance = (allBillings||[]).some(b => {
        if(b.company_id !== id || b.payment_status === PAYMENT_STATUS.PAID) return false;
        const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
        return rem > 0;
      });
      if(hasBalance){
        closeModal(_termModalId);
        toast('완납 후 해지할 수 있습니다. 미정산 금액을 먼저 처리해 주세요.', 'error');
        return;
      }
    }
    if(withLoss){
      let totalLoss = 0;
      const unpaidBillings = (allBillings||[]).filter(b => {
        if(b.company_id !== id || b.payment_status === PAYMENT_STATUS.PAID) return false;
        const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
        return rem > 0;
      });
      for(const b of unpaidBillings){
        const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
        totalLoss += rem;
        const updBody = {...b, payment_status: PAYMENT_STATUS.PAID, loss_amount: rem, loss_date: todayStr};
        await api(`../tables/billings/${b.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updBody)});
      }
      const compBody = {...c, status: COMPANY_STATUS.INACTIVE, contract_end_date: endDateStr, loss_amount: (c.loss_amount||0)+totalLoss, loss_date: todayStr};
      await api(`../tables/companies/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(compBody)});
      closeModal(_termModalId);
      closeModal('company-modal');
      await loadCompanies(); populateFilters(); populatePICompanies(); renderCompanies(); renderDashboard();
      toast(`"${c.company_name}" 손실 처리(${Math.round(totalLoss).toLocaleString('ko-KR')}원) 후 해지 완료`);
      return;
    }
  }

  // 공통 해지 처리
  const newStatus = endDateStr <= todayStr ? COMPANY_STATUS.INACTIVE : COMPANY_STATUS.ACTIVE;
  const patch = { status: newStatus, contract_end_date: endDateStr };
  await api(`../tables/companies/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
  closeModal(_termModalId);
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
  const c = allCompanies.find(x => x.id === id);
  const nameEl = document.getElementById('ced-company-name');
  if(nameEl) nameEl.innerHTML = `<i class="fas fa-building" style="color:#64748b;margin-right:6px;"></i>${name}`;
  const dateEl = document.getElementById('ced-end-date');
  if(dateEl){
    // 해지일은 계약 시작일 이후만 선택 가능
    dateEl.min = c?.contract_start_date || '';
    dateEl.value = currentEndDate || fmtLocalDate(new Date());
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
  // 해지일이 계약 시작일 이전이면 차단
  if(c.contract_start_date && newDateStr < c.contract_start_date){
    return toast(`해지일은 계약 시작일(${c.contract_start_date}) 이후여야 합니다.`, 'error');
  }
  const todayStr = fmtLocalDate(new Date());
  // 오늘 이하면 즉시 해지(INACTIVE), 미래면 해지예정(ACTIVE) 유지
  const newStatus = newDateStr <= todayStr ? COMPANY_STATUS.INACTIVE : COMPANY_STATUS.ACTIVE;
  const patch = { status: newStatus, contract_end_date: newDateStr };
  await api(`../tables/companies/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
  // ── 해지일 변경 이력 기록 ──
  const _histCED = { id: 'cmhist_'+Date.now(), company_id: id, changed_at: Date.now(), effective_date: newDateStr,
    changes: [{ field: 'contract_end_date', label: '계약 해지일', before: oldEndDateStr || '(없음)', after: newDateStr },
              { field: 'status', label: '고객사 상태', before: c.status || '', after: newStatus }],
    snapshot: { contract_end_date: oldEndDateStr, status: c.status }
  };
  await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(_histCED)}).catch(()=>{});
  await loadCompanyHistories();
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
  // ── 해지 취소 이력 기록 ──
  const _histCancel = { id: 'cmhist_'+Date.now(), company_id: id, changed_at: Date.now(), effective_date: fmtLocalDate(new Date()),
    changes: [{ field: 'contract_end_date', label: '계약 해지일', before: c?.contract_end_date || '', after: '(취소)' },
              { field: 'status', label: '고객사 상태', before: c?.status || '', after: COMPANY_STATUS.ACTIVE }],
    snapshot: { contract_end_date: c?.contract_end_date, status: c?.status }
  };
  await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(_histCancel)}).catch(()=>{});
  await loadCompanyHistories();
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
  const coName = company.company_name || '';
  const ruleType = oldEndDateStr ? 'company_terminate_changed' : 'company_terminate_scheduled';

  // 시스템 설정에서 커스텀 규칙 조회 시도
  let title = oldEndDateStr
    ? `[서비스 해지 예정일 변경 안내] ${coName}`
    : `[서비스 해지 예정 안내] ${coName}`;
  let body  = oldEndDateStr
    ? `안녕하세요, ${coName} 대표자님.\n\n${coName}의 자문계약 해지 예정일이 변경되었습니다.\n\n■ 변경 전 해지 예정일: ${oldEndDateStr}\n■ 변경 후 해지 예정일: ${endDateStr}\n\n※ 해지 예정을 취소하시려면 담당자에게 연락해 주시기 바랍니다.`
    : `안녕하세요, ${coName} 대표자님.\n\n${coName}의 자문계약 해지가 예정되어 안내드립니다.\n\n■ 해지 예정일: ${endDateStr}\n\n해지 예정일까지는 서비스를 정상 이용하실 수 있으며,\n해지 예정일 이후에는 서비스 이용이 제한됩니다.\n\n※ 해지 예정을 취소하시려면 담당자에게 연락해 주시기 바랍니다.`;

  try {
    const _contactRes = await fetch('../tables/representative_contact/default');
    if (_contactRes.ok) {
      const _contactData = await _contactRes.json();
      if (_contactData?.msg_body_rules) {
        const _rules = typeof _contactData.msg_body_rules === 'string'
          ? JSON.parse(_contactData.msg_body_rules) : _contactData.msg_body_rules;
        const _rule = _rules?.[ruleType];
        if (_rule) {
          if (_rule.title) title = _rule.title.replace(/\{회사명\}/g, coName);
          if (_rule.body) body = _rule.body
            .replace(/\{회사명\}/g, coName)
            .replace(/\{해지예정일\}/g, endDateStr)
            .replace(/\{이전해지일\}/g, oldEndDateStr || '');
        }
      }
    }
  } catch(_) { /* use defaults */ }

  try {
    await _sendCompanyNotice({
      companyId  : company.id, companyName: coName,
      noticeType : ruleType,
      title, body,
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
  const coName = company.company_name || '';

  let title = `[서비스 해지 취소 안내] ${coName}`;
  let body  = `안녕하세요, ${coName} 대표자님.\n\n${coName}의 자문계약 해지 예정이 취소되었습니다.\n서비스를 계속 정상 이용하실 수 있습니다.\n\n감사합니다.`;

  try {
    const _contactRes = await fetch('../tables/representative_contact/default');
    if (_contactRes.ok) {
      const _contactData = await _contactRes.json();
      if (_contactData?.msg_body_rules) {
        const _rules = typeof _contactData.msg_body_rules === 'string'
          ? JSON.parse(_contactData.msg_body_rules) : _contactData.msg_body_rules;
        const _rule = _rules?.company_terminate_cancelled;
        if (_rule) {
          if (_rule.title) title = _rule.title.replace(/\{회사명\}/g, coName);
          if (_rule.body) body = _rule.body.replace(/\{회사명\}/g, coName);
        }
      }
    }
  } catch(_) { /* use defaults */ }

  try {
    await _sendCompanyNotice({
      companyId  : company.id, companyName: coName,
      noticeType : 'company_terminate_cancelled',
      title, body,
    });
  } catch(e){
    console.warn('[해지취소알림] 발송 실패:', e);
  }
}

/* [사용료 숨김] 기존 terminateCompany / doTerminate (미납금 체크 포함) - 원복 시 아래 주석 해제
function terminateCompany_DISABLED(id, name){
  const todayStr = fmtLocalDate(new Date());
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
  const todayStr = fmtLocalDate(new Date());
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
    // ── 해지 이력 기록 ──
    const _histEntry = { id: 'cmhist_'+Date.now(), company_id: id, changed_at: Date.now(), effective_date: todayStr,
      changes: [{ field: 'status', label: '고객사 상태', before: c.status || 'active', after: CONTRACT_STATUS.TERMINATED },
                { field: 'contract_end_date', label: '해지일', before: c.contract_end_date || '', after: todayStr }],
      snapshot: { status: c.status, contract_end_date: c.contract_end_date }
    };
    await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(_histEntry)}).catch(()=>{});
    await loadCompanyHistories();
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
    const updBody = {...b, payment_status: PAYMENT_STATUS.PAID, loss_amount:rem, loss_date:todayStr};
    await api(`../tables/billings/${b.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updBody)});
  }
  const compBody = {...c, status: CONTRACT_STATUS.TERMINATED, contract_end_date:todayStr, loss_amount:(c.loss_amount||0)+totalLoss, loss_date:todayStr};
  await api(`../tables/companies/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(compBody)});
  // ── 해지 이력 기록 ──
  const _histEntry2 = { id: 'cmhist_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), company_id: id, changed_at: Date.now(), effective_date: todayStr,
    changes: [{ field: 'status', label: '고객사 상태', before: c.status || 'active', after: CONTRACT_STATUS.TERMINATED },
              { field: 'contract_end_date', label: '해지일', before: c.contract_end_date || '', after: todayStr },
              { field: 'loss_amount', label: '손실 처리액', before: String(c.loss_amount||0), after: String((c.loss_amount||0)+totalLoss) }],
    snapshot: { status: c.status, contract_end_date: c.contract_end_date, loss_amount: c.loss_amount }
  };
  await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(_histEntry2)}).catch(()=>{});
  await loadCompanyHistories();
  closeModal('terminate-modal');
  await loadData();populateFilters();populatePICompanies();renderCompanies();renderDashboard();renderBillingTrendChart();
  toast(`"${c.company_name}" 손실 처리(${Math.round(totalLoss).toLocaleString('ko-KR')}원) 후 해지 완료`);
}
*/
