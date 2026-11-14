// ==========================================
//   퇴직 관리 페이지 JS (retirement-mgmt)
// ==========================================

let _retirementCurrentTab = 'insurance';
let _retCompanyId   = '';   // 페이지 선택 고객사 (2026-09-03)
let _retCompanyName = '';
let _sevDispatchList = []; // 퇴직금 명세서 발송 이력 (선택 고객사 기준)

/** 탭 전환 */
function switchRetirementTab(tab){
  if (!window._retirementMgmtEnabled) return;
  _retirementCurrentTab = tab;
  document.querySelectorAll('.std-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.std-tab-panel').forEach(c => c.style.display = 'none');
  const content = document.getElementById('retirement-tab-' + tab);
  if(content) content.style.display = '';
}

/** 페이지 초기화 + 고객사 선택 상태 반영 */
function initRetirementMgmtPage(){
  if (!window._retirementMgmtEnabled) return;
  const selCard = document.getElementById('ret-company-select-card');
  const content = document.getElementById('ret-content-section');
  if(_retCompanyId){
    if(selCard) selCard.style.display = 'none';
    if(content) content.style.display = '';
    const labelEl = document.getElementById('ret-selected-company-label');
    if(labelEl) labelEl.innerHTML = `<i class="fas fa-hand-holding-usd" style="margin-right:6px;"></i>${_retCompanyName} 퇴직금 산정`;
    if(typeof switchRetTab === 'function') switchRetTab('unsent'); // 기본 탭: 미발송 명세서 (2026-09-03)
    renderRetirementMgmt();
  } else {
    if(selCard) selCard.style.display = '';
    if(content) content.style.display = 'none';
    renderRetCompanyList();
  }
}

/** 고객사 선택 칩 렌더 */
function renderRetCompanyList(){
  const q = (document.getElementById('ret-company-search')?.value || '').toLowerCase().trim();
  const container = document.getElementById('ret-company-chips');
  if(!container) return;
  const companies = allCompanies.filter(c =>
    isCompanyActive(c) && (!q || (c.company_name||'').toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));
  if(!companies.length){
    container.innerHTML = `<div style="color:#9ca3af;font-size:13px;padding:8px 0;">${q ? `"${q}" 검색 결과 없음` : '이용 중인 고객사가 없습니다'}</div>`;
    return;
  }
  container.innerHTML = companies.map(c => {
    const isSelected = c.id === currentGlobalCompanyId;
    return `<button onclick="selectRetCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}')"
      class="co-chip${isSelected?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
    </button>`;
  }).join('');
}

/** 고객사 선택 */
async function selectRetCompany(companyId, companyName){
  if (!window._retirementMgmtEnabled) return;
  _retCompanyId = companyId;
  _retCompanyName = companyName;
  currentGlobalCompanyId = companyId;
  currentGlobalCompanyName = companyName;
  await _loadSeveranceDispatch();
  initRetirementMgmtPage();
}

/** 퇴직금 명세서 발송 이력 로드 (선택 고객사 기준) */
async function _loadSeveranceDispatch(){
  try {
    const res = await fetch(`../tables/severance_dispatch?limit=1000`);
    const data = await res.json();
    _sevDispatchList = (data.data || []).filter(d => !_retCompanyId || d.company_id === _retCompanyId);
  } catch(e){ _sevDispatchList = []; }
}

// ═══════════════════════════════════════════
// 탭 전환 — 미발송 명세서 / 발송 이력 / 메시지 예시 (2026-09-03)
// ═══════════════════════════════════════════
function switchRetTab(tab){
  const sections = { unsent: 'ret-unsent-section', history: 'ret-history-section', preview: 'ret-preview-section' };
  ['unsent', 'history', 'preview'].forEach(t => {
    const btn = document.getElementById('ret-tab-' + t);
    const sec = document.getElementById(sections[t]);
    if(btn) btn.classList.toggle('active', t === tab);
    if(sec) sec.style.display = (t === tab) ? '' : 'none';
  });
  if(tab === 'history') renderRetHistory();
  if(tab === 'preview') renderRetPreview();
}

/** 발송 이력 렌더 */
function renderRetHistory(){
  const tbody = document.getElementById('ret-history-tbody');
  if(!tbody) return;
  const list = [..._sevDispatchList].sort((a, b) => (b.dispatched_at || '').localeCompare(a.dispatched_at || ''));
  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="7" class="cen-empty"><i class="fas fa-inbox"></i> 발송 이력이 없습니다.</td></tr>`;
    return;
  }
  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    if(isNaN(d.getTime())) return '-';
    return d.toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
  tbody.innerHTML = list.map(d => {
    const fileBtn = d.file_url
      ? `<button class="btn btn-indigo btn-sm" onclick="openSeveranceFileUrl('${d.file_url.replace(/'/g, "\\'")}')"><i class="fas fa-eye"></i> 보기</button>`
      : '<span style="font-size:11.5px;color:#d1d5db;">-</span>';
    return `<tr>
      <td style="color:#374151;white-space:nowrap;">${fmtDt(d.dispatched_at)}</td>
      <td style="font-weight:700;color:#111827;">${d.employee_name || '-'}</td>
      <td>${methodBadge(d.dispatch_method)}</td>
      <td style="font-size:12px;color:#374151;">${d.recipient || '-'}</td>
      <td class="ctr"><span class="badge badge-green"><i class="fas fa-check-circle"></i> 완료</span></td>
      <td style="font-size:12px;color:#6b7280;">${d.dispatched_by || '-'}</td>
      <td class="ctr" style="white-space:nowrap;">${fileBtn}</td>
    </tr>`;
  }).join('');
}

/** 메시지 예시 렌더 */
function renderRetPreview(){
  const container = document.getElementById('ret-preview-content');
  if(!container) return;
  if(typeof msgRenderAllPreviews === 'function'){
    container.innerHTML = msgRenderAllPreviews('severance');
  } else {
    container.innerHTML = '<p style="padding:20px;color:#9ca3af;">메시지 템플릿을 불러올 수 없습니다.</p>';
  }
}

/** 명세서 파일 URL 새 창 열기 */
function openSeveranceFileUrl(url){
  if(!url) return;
  window.open(encodeURI((location.origin || '') + url), '_blank');
}

/** 고객사 선택 해제 */
function clearRetCompanySelect(){
  _retCompanyId = '';
  _retCompanyName = '';
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  const searchEl = document.getElementById('ret-company-search');
  if(searchEl) searchEl.value = '';
  initRetirementMgmtPage();
}

/** 전체 대상자 집계 및 테이블 렌더링 */
function renderRetirementMgmt(){
  if (!window._retirementMgmtEnabled) return;
  const today = fmtLocalDate(new Date());

  // ── 해지/해지예정 계약 수집 ──
  const terminatedContracts = (allContracts||[]).filter(c => {
    if(c.is_draft || c.is_voided_by_amend) return false;
    return c.status === CONTRACT_STATUS.TERMINATED || c.status === CONTRACT_STATUS.TERMINATE_PENDING;
  });
  // 페이지 고객사 스코프 (사이드바 뱃지는 전체 기준 유지 — 2026-09-03)
  const scoped = _retCompanyId
    ? terminatedContracts.filter(c => c.company_id === _retCompanyId)
    : terminatedContracts;

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
  const insuranceList = scoped
    .filter(c => {
      const emp = allEmployees.find(e => e.id === c.employee_id);
      return emp && emp.status === EMP_STATUS.RESIGNED && !c.insurance_reported_at;
    })
    .map(enrich);

  // ── 2) 원천징수 대상 (미신고만) ──
  const taxList = scoped
    .filter(c => {
      const emp = allEmployees.find(e => e.id === c.employee_id);
      return emp && emp.status === EMP_STATUS.RESIGNED && !c.tax_reported_at;
    })
    .map(enrich);

  // ── 3) 퇴직정산 대상 (근속 1년 이상) ──
  const severanceList = scoped
    .filter(c => { if(!c.contract_start) return false; const endDate = c.terminate_date || today; return Math.ceil((new Date(endDate) - new Date(c.contract_start)) / (1000*60*60*24)) >= 365; })
    .map(enrich);

  // ── 4) 해고예고수당 대상 ──
  const noticePayList = scoped
    .filter(c => (parseFloat(c.dismissal_notice_pay)||0) > 0)
    .map(c => { const r = enrich(c); r.noticePay = parseFloat(c.dismissal_notice_pay)||0; return r; });

  // ── 탭 카운트 ──
  ['insurance','tax','severance','noticepay'].forEach(tab => {
    const el = document.getElementById('retirement-tab-count-' + tab);
    const map = { insurance: insuranceList, tax: taxList, severance: severanceList, noticepay: noticePayList };
    if(el) el.textContent = map[tab].length > 0 ? `(${map[tab].length})` : '';
  });
  const fmtD = d => d ? d.replace(/-/g, '.') : '-';

  // 사이드바 메뉴 뱃지 (전체 고객사 기준 — 페이지 스코프와 무관, 2026-09-03)
  const gInsurance = terminatedContracts.filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return emp && emp.status === EMP_STATUS.RESIGNED && !c.insurance_reported_at; }).length;
  const gTax = terminatedContracts.filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return emp && emp.status === EMP_STATUS.RESIGNED && !c.tax_reported_at; }).length;
  const gSev = terminatedContracts.filter(c => { if(!c.contract_start) return false; const endDate = c.terminate_date || today; return Math.ceil((new Date(endDate) - new Date(c.contract_start)) / (1000*60*60*24)) >= 365; }).length;
  const gNp = terminatedContracts.filter(c => (parseFloat(c.dismissal_notice_pay)||0) > 0).length;
  const total = gInsurance + gTax + gSev + gNp;
  const badge = document.getElementById('badge-retirement-mgmt');
  if(badge){
    badge.textContent = total > 0 ? total : '';
    badge.style.display = total > 0 ? '' : 'none';
  }

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
  if(!list.length){ tbody.innerHTML = `<tr><td colspan="5" class="cen-empty"><i class="fas fa-inbox"></i> 신고 대상자가 없습니다.</td></tr>`; return; }
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
  if(!list.length){ tbody.innerHTML = `<tr><td colspan="4" class="cen-empty"><i class="fas fa-inbox"></i> 신고 대상자가 없습니다.</td></tr>`; return; }
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

/** 퇴직정산 테이블 — 발송 열·명세서 업로드 (2026-09-03) */
function renderSeveranceTable(list, fmtD){
  const tbody = document.querySelector('#retirement-table-severance tbody');
  if(!tbody) return;
  if(!list.length){ tbody.innerHTML = `<tr><td colspan="8" class="cen-empty"><i class="fas fa-inbox"></i> 퇴직금 산정 대상자가 없습니다.</td></tr>`; return; }
  tbody.innerHTML = list.map(r => {
    const c = (allContracts||[]).find(x => x.id === r.id) || {};
    const fileUrl = c.severance_file_url || '';
    const emp = r.emp || {};
    const phone = String(emp.phone || '').trim();
    const email = String(emp.email || '').trim();
    const sent = (_sevDispatchList||[]).filter(d => d.contract_id === r.id && d.dispatch_status === 'completed');
    const sentMethods = new Set(sent.map(d => d.dispatch_method));

    // 퇴직급여 산정 (2026-09-03)
    const sev = _calcRetSeverancePay(r);
    let sevCell;
    if(sev && sev.unavailable){
      const unavailTitle = (sev.missing && sev.missing.length)
        ? `최근 3개월 급여 중 미입력 월: ${sev.missing.join(', ')} — 3개월치가 모두 입력되어야 산출됩니다.`
        : '최근 3개월 급여 데이터가 없어 퇴직급여를 산출할 수 없습니다.';
      sevCell = `<td class="retirement-td-unavailable" title="${unavailTitle}">산출불가(급여미입력)</td>`;
    } else if(sev){
      window._sevCalcMap = window._sevCalcMap || {};
      _sevCalcMap[r.id] = Object.assign({
        empName: r.empName, coName: r.coName, tenureLabel: r.tenureLabel,
        hireDate: emp.hire_date || r.contract_start, termDate: r.termDate
      }, sev);
      sevCell = `<td class="retirement-td-amount retirement-td-click" title="클릭하여 산출 내역 보기" onclick="openSeveranceCalcPopup('${r.id}')">${sev.amount.toLocaleString('ko-KR')}원</td>`;
    } else {
      sevCell = '<td style="font-size:11.5px;color:#9ca3af;">-</td>';
    }

    // 명세서 셀: 업로드(초록) / 등록 시 미리보기+삭제 세트
    let fileCell;
    if(fileUrl){
      fileCell = `<button class="btn-retire btn-retire-preview" onclick="previewSeveranceFile('${r.id}')"><i class="fas fa-eye"></i> 미리보기</button>
        <button class="btn-retire btn-retire-undo" onclick="deleteSeveranceFile('${r.id}')" style="margin-left:4px;"><i class="fas fa-trash"></i> 삭제</button>`;
    } else {
      fileCell = `<button class="btn btn-success btn-sm" onclick="uploadSeveranceFile('${r.id}')"><i class="fas fa-upload"></i> 명세서 업로드</button>`;
    }

    // 발송 셀: 알림톡 / 이메일 / 수동교부 (완료 시 배지)
    const kBtn = sentMethods.has(DISPATCH_METHOD.KAKAO)
      ? `<span class="badge badge-yellow"><i class="fas fa-check"></i> 알림톡</span>`
      : `<button class="btn btn-kakao btn-sm" ${phone && fileUrl ? '' : 'disabled'} onclick="sendSeveranceKakao('${r.id}')">`
        + `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡</button>`;
    const eBtn = sentMethods.has(DISPATCH_METHOD.EMAIL)
      ? `<span class="badge badge-blue"><i class="fas fa-check"></i> 이메일</span>`
      : `<button class="btn btn-sky btn-sm" ${email && fileUrl ? '' : 'disabled'} onclick="sendSeveranceEmail('${r.id}')">✉ 이메일</button>`;
    const mBtn = sentMethods.has(DISPATCH_METHOD.MANUAL)
      ? `<span class="badge badge-green"><i class="fas fa-check"></i> 수동교부</span>`
      : `<button class="btn btn-success btn-sm" ${fileUrl ? '' : 'disabled'} onclick="sendSeveranceManual('${r.id}')"><i class="fas fa-hand-paper"></i> 수동교부</button>`;

    return `<tr>
      <td><strong>${r.empName}</strong></td>
      <td>${r.coName}</td>
      <td>${fmtD(r.emp?.hire_date || r.contract_start)}</td>
      <td>${fmtD(r.termDate)}${r.isPending ? ' <span class="retirement-badge-pending">예정</span>' : ''}</td>
      <td>${r.tenureLabel} (${r.tenureDays}일)</td>
      ${sevCell}
      <td class="retirement-td-action">${fileCell}</td>
      <td style="white-space:nowrap;">${kBtn} ${eBtn} ${mBtn}</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════
// 퇴직급여 산정 (2026-09-03)
// 퇴직급여 = 1일 평균임금 × 30 × 재직일수 ÷ 365
// 1일 평균임금 = [최근 3개월 (고정수당 전액 + 정기상여금 + 연장·야간·휴일근로수당)
//              + (퇴사 전 1년 비정기 상여금 총액 × 3/12)
//              + (연차 미사용수당 총액 × 3/12)] ÷ 3개월 달력일수(89~92일)
// ※ 해지월 직전 3개월 급여가 모두 입력되어 있어야 산출 (2026-09-04)
// ═══════════════════════════════════════════

/** 월별 고정 지급 임금 합계 (기본급+주휴+고정수당+정기상여금+연장·야간·휴일수당) */
function _retMonthFixed(p){
  return (p.base_salary||0) + (p.weekly_holiday_pay||0)
    + (p.position_allowance||0) + (p.skill_allowance||0) + (p.license_allowance||0)
    + (p.childcare_allowance||0) + (p.research_allowance||0) + (p.communication_allowance||0)
    + (p.fitness_allowance||0) + (p.self_dev_allowance||0) + (p.book_allowance||0)
    + (p.overseas_allowance||0) + (p.site_allowance||0) + (p.remote_area_allowance||0)
    + (p.hazard_allowance||0) + (p.meal_allowance||0)
    + (p.transportation_allowance||0) + (p.self_driving_allowance||0)
    + (p.contract_etc_allowance||0) + (p.etc_allowance||0)
    + (p.regular_bonus||0)
    + (p.overtime_pay||0) + (p.night_pay||0) + (p.holiday_pay||0);
}

function _calcRetSeverancePay(r){
  const emp = r.emp || {};
  if(!r.termDate || (!r.contract_start && !emp.hire_date)) return null;
  const hireDate = emp.hire_date || r.contract_start;
  const endDate = r.termDate;
  const tenureDays = Math.max(0, Math.ceil((new Date(endDate) - new Date(hireDate)) / 86400000));
  if(tenureDays <= 0) return null;

  // 기준: 해지(퇴사)월 직전 N개월 급여
  const end = new Date(endDate);
  const endYm = end.getFullYear() * 12 + (end.getMonth() + 1);
  const inLastN = (p, n) => {
    if(!p || p.employee_id !== emp.id) return false;
    const ym = Number(p.pay_year) * 12 + Number(p.pay_month);
    return ym < endYm && ym >= endYm - n;
  };
  const pays3  = (allPayrolls||[]).filter(p => inLastN(p, 3));
  const pays12 = (allPayrolls||[]).filter(p => inLastN(p, 12));

  // 최근 3개월(해지월 직전 3개월) 급여가 모두 입력되어야 산출 가능 (2026-09-04)
  const monthYms = [];
  for(let i = 3; i >= 1; i--){
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    monthYms.push(d.getFullYear() * 12 + (d.getMonth() + 1));
  }
  const presentYms = new Set(pays3.map(p => p.pay_year * 12 + p.pay_month));
  const missing = monthYms.filter(ym => !presentYms.has(ym))
    .map(ym => `${Math.floor(ym / 12)}.${String(ym % 12).padStart(2, '0')}`);
  if(missing.length) return { unavailable: true, reason: 'missing-3m', missing };

  // ① 최근 3개월: 기본급 + 고정 지급 수당 전액 + 정기상여금 + 연장·야간·휴일근로수당 합계
  const fixed3 = pays3.reduce((s, p) => s + _retMonthFixed(p), 0);
  const months = [...pays3].sort((a,b) => (a.pay_year*12 + a.pay_month) - (b.pay_year*12 + b.pay_month))
    .map(p => ({ label: `${p.pay_year}.${String(p.pay_month).padStart(2,'0')}`, fixed: _retMonthFixed(p) }));

  // ② 퇴사 전 1년 비정기 상여금(상여금) 총액 × 3/12
  const bonus12 = pays12.reduce((s, p) => s + (p.bonus_pay||0), 0);
  const bonusAdd = bonus12 * 3 / 12;

  // ③ 퇴사 전 1년 연차 미사용수당 총액 × 3/12
  const al12 = pays12.reduce((s, p) => s + (p.annual_leave_pay||0), 0);
  const alAdd = al12 * 3 / 12;

  // ④ 3개월 달력일수 (해지월 1일 기준 직전 3개월 — 89~92일)
  const curMonthStart = new Date(end.getFullYear(), end.getMonth(), 1);
  const start3 = new Date(end.getFullYear(), end.getMonth() - 3, 1);
  const days3 = Math.round((curMonthStart - start3) / 86400000);

  const daily = days3 > 0 ? (fixed3 + bonusAdd + alAdd) / days3 : 0;
  const amount = Math.floor(daily * 30 * tenureDays / 365);

  const won = n => Math.round(n).toLocaleString('ko-KR');
  const tip = `3개월 고정+정기상여+연장야간휴일 합계 ${won(fixed3)}원`
    + ` / 비정기상여 3/12 ${won(bonusAdd)}원`
    + ` / 연차미사용수당 3/12 ${won(alAdd)}원`
    + ` / 3개월 달력일수 ${days3}일`
    + ` / 1일평균임금 ${won(daily)}원`
    + ` / 재직 ${tenureDays}일`;
  return { amount, daily, days3, tenureDays, tip,
    fixed3, months, bonus12, bonusAdd, al12, alAdd };
}

// ═══════════════════════════════════════════
// 퇴직급여 산출 내역 레이어 팝업 (2026-09-04)
// ═══════════════════════════════════════════
function openSeveranceCalcPopup(contractId){
  const d = (window._sevCalcMap||{})[contractId];
  if(!d){ toast('산출 내역을 찾을 수 없습니다.'); return; }
  const won = n => Math.round(n).toLocaleString('ko-KR');
  const totalSum = d.fixed3 + d.bonusAdd + d.alAdd;
  const monthRows = (d.months||[]).map(m =>
    `<tr class="month"><td>${m.label}월 급여 고정 지급 합계</td><td class="sev-r">${won(m.fixed)}원</td></tr>`
  ).join('');
  const bodyEl = document.getElementById('sev-calc-modal-body');
  if(bodyEl){
    bodyEl.innerHTML = `
    <div class="sev-calc-info">
      <div class="sev-calc-info-row"><span class="l">직원명</span><span class="v">${d.empName}</span></div>
      <div class="sev-calc-info-row"><span class="l">고객사</span><span class="v">${d.coName}</span></div>
      <div class="sev-calc-info-row"><span class="l">재직일수(산식 반영)</span><span class="v">${d.tenureDays}일</span></div>
    </div>
    <div class="sev-calc-formula">
      <div><strong>퇴직급여</strong> = 1일 평균임금 × 30일 × 재직일수 ÷ 365일</div>
      <div><strong>1일 평균임금</strong> = [최근 3개월 임금 합계 + (비정기상여금 × 3/12) + (연차미사용수당 × 3/12)] ÷ 3개월 달력일수(89~92일)</div>
    </div>
    <table class="sev-calc-table">
      <thead><tr><th>산출 항목</th><th>산식 반영 금액</th></tr></thead>
      <tbody>
        <tr><td>최근 3개월 임금 합계<span class="sev-sub">기본급 + 고정수당 + 정기상여금 + 연장·야간·휴일수당</span></td><td class="sev-r">${won(d.fixed3)}원</td></tr>
        ${monthRows}
        <tr><td>비정기상여금(1년 총액 ${won(d.bonus12)}원) × 3/12</td><td class="sev-r">${won(d.bonusAdd)}원</td></tr>
        <tr><td>연차 미사용수당(1년 총액 ${won(d.al12)}원) × 3/12</td><td class="sev-r">${won(d.alAdd)}원</td></tr>
        <tr class="sum"><td>평균임금 산정 합계</td><td class="sev-r">${won(totalSum)}원</td></tr>
        <tr><td>÷ 3개월 달력일수</td><td class="sev-r">${d.days3}일</td></tr>
        <tr class="sum2"><td>= 1일 평균임금</td><td class="sev-r">${won(d.daily)}원</td></tr>
        <tr><td>× 30일 × 재직일수 ${d.tenureDays}일 ÷ 365일</td><td class="sev-r">-</td></tr>
        <tr class="total"><td>= 퇴직급여</td><td class="sev-r">${won(d.amount)}원</td></tr>
      </tbody>
    </table>`;
  }
  const overlay = document.getElementById('sev-calc-modal');
  if(overlay) overlay.classList.add('open');
}

function closeSeveranceCalcPopup(){
  const overlay = document.getElementById('sev-calc-modal');
  if(overlay) overlay.classList.remove('open');
}

// ═══════════════════════════════════════════
// 퇴직금 명세서 — 업로드 / 미리보기 / 삭제 / 발송 (2026-09-03)
// ═══════════════════════════════════════════

/** 명세서 PDF 업로드 → 파일서버 저장 + contracts.severance_file_url 기록 */
async function uploadSeveranceFile(contractId){
  if(!contractId){ toast('계약 정보가 없습니다.'); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,application/pdf';
  input.onchange = async () => {
    const file = input.files[0];
    if(!file) return;
    const isPdf = (file.type === 'application/pdf') || /\.pdf$/i.test(file.name);
    if(!isPdf){ toast('퇴직금 명세서는 PDF 파일만 업로드할 수 있습니다.', 'error'); return; }
    try {
      const fd = new FormData();
      fd.append('severance', file);
      const res  = await fetch(`../api/upload/${contractId}`, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if(!res.ok || !json.ok || !json.files || !json.files.severance){
        toast(json.error || '업로드에 실패했습니다.', 'error');
        return;
      }
      const url = json.files.severance;
      await api(`../tables/contracts/${contractId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severance_file_url: url })
      });
      const c = (allContracts||[]).find(x => x.id === contractId);
      if(c) c.severance_file_url = url;
      toast('✅ 퇴직금 명세서가 등록되었습니다.', 'success');
      renderRetirementMgmt();
    } catch(e){
      console.error('[퇴직금명세서 업로드]', e);
      toast('업로드 중 오류가 발생했습니다.', 'error');
    }
  };
  input.click();
}

/** 등록된 명세서 PDF 새 창 미리보기 */
function previewSeveranceFile(contractId){
  const c = (allContracts||[]).find(x => x.id === contractId);
  if(!c || !c.severance_file_url){ toast('등록된 명세서 파일이 없습니다.', 'warning'); return; }
  openSeveranceFileUrl(c.severance_file_url);
}

/** 등록된 명세서 PDF 삭제 */
async function deleteSeveranceFile(contractId){
  const c = (allContracts||[]).find(x => x.id === contractId);
  if(!c || !c.severance_file_url) return;
  if(!confirm('등록된 퇴직금 명세서 PDF를 삭제하시겠습니까?')) return;
  try {
    await api(`../tables/contracts/${contractId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ severance_file_url: null })
    });
    c.severance_file_url = null;
    toast('명세서 파일이 삭제되었습니다.', 'success');
    renderRetirementMgmt();
  } catch(e){
    console.error('[퇴직금명세서 삭제]', e);
    toast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

/** 발송 이력 저장 (severance_dispatch) */
async function _saveSeveranceDispatch({ contractId, method, recipient, note }){
  const c = (allContracts||[]).find(x => x.id === contractId);
  const emp = c ? (allEmployees.find(e => e.id === c.employee_id) || {}) : {};
  const co  = c ? (allCompanies.find(x => x.id === c.company_id) || {}) : {};
  const fileUrl = c?.severance_file_url || '';
  const body = {
    id: 'svd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    contract_id: contractId,
    employee_id: c?.employee_id || '',
    employee_name: emp.name || '',
    company_id: c?.company_id || '',
    company_name: co.company_name || '',
    dispatch_method: method,
    dispatch_status: 'completed',
    recipient: recipient || '',
    file_url: fileUrl,
    dispatched_at: new Date().toISOString(),
    dispatched_by: (typeof currentUser === 'object' && currentUser?.name) || '관리자',
    note: note || '',
    created_at: Date.now(),
    updated_at: Date.now()
  };
  try {
    const res = await fetch('../tables/severance_dispatch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    _sevDispatchList.push(body);

    // ── 고객사 인앱 알림 발송 (시스템 설정 체크 해제 시 _sendCompanyNotice에서 차단) ──
    if(co.company_name && emp.name && typeof _sendCompanyNotice === 'function'){
      try {
        const _methodLabel = DISPATCH_METHOD_LABEL[method] || method || '-';
        const _now = new Date();
        const _nowStr = `${_now.getFullYear()}. ${_now.getMonth()+1}. ${_now.getDate()}. `
          + `${String(_now.getHours()).padStart(2,'0')}:${String(_now.getMinutes()).padStart(2,'0')}`;
        const rule = (typeof getMsgBodyRule === 'function') ? getMsgBodyRule('severance_dispatched') : null;
        const _apply = t => (t || '')
          .replace(/\{회사명\}/g, co.company_name)
          .replace(/\{근로자명\}/g, emp.name)
          .replace(/\{발송방법\}/g, _methodLabel)
          .replace(/\{발송시각\}/g, _nowStr);
        const _title = rule?.title ? _apply(rule.title) : `[퇴직금 명세서 발송] ${emp.name} — 퇴직금 명세서가 발송되었습니다`;
        const _body = rule?.body ? _apply(rule.body)
          : `안녕하세요, ${co.company_name} 대표자님.\n\n소속 근로자 ${emp.name}에게 퇴직금 명세서가 ${_methodLabel}(으)로 발송 완료되었음을 알려드립니다.\n\n■ 발송 시각: ${_nowStr}`;
        await _sendCompanyNotice({
          companyId: c?.company_id || '', companyName: co.company_name,
          noticeType: 'severance_dispatched',
          title: _title, body: _body,
          contractId, employeeId: c?.employee_id || '', employeeName: emp.name
        });
      } catch(e){ console.error('[퇴직금명세서 인앱알림]', e); }
    }
  } catch(e){
    console.error('[퇴직금명세서 발송기록 저장]', e);
    toast('발송 기록 저장에 실패했습니다.', 'error');
    throw e;
  }
}

/** 알림톡 발송 */
async function sendSeveranceKakao(contractId){
  const c = (allContracts||[]).find(x => x.id === contractId);
  const emp = c ? (allEmployees.find(e => e.id === c.employee_id) || {}) : {};
  if(!c || !c.severance_file_url){ toast('먼저 명세서 PDF를 업로드해 주세요.', 'warning'); return; }
  const phone = String(emp.phone || '').trim();
  if(!phone){ toast(`${emp.name || '근로자'} — 전화번호가 등록되어 있지 않습니다.`, 'error'); return; }
  if(!confirm(`[알림톡 발송]

${emp.name || '근로자'} 님에게 퇴직금 명세서를 알림톡으로 발송하시겠습니까?
수신번호: ${phone}`)) return;
  try{
    const fileAbs = (location.origin || '') + c.severance_file_url;
    await _saveSeveranceDispatch({
      contractId, method: DISPATCH_METHOD.KAKAO, recipient: phone,
      note: `수신번호: ${phone}\n■ 퇴직금 명세서 파일: ${fileAbs}`
    });
    toast(`✅ ${emp.name || '근로자'} 알림톡 발송 완료`, 'success');
    renderRetirementMgmt();
  } catch(e){ toast('발송 중 오류가 발생했습니다.', 'error'); }
}

/** 이메일 발송 */
async function sendSeveranceEmail(contractId){
  const c = (allContracts||[]).find(x => x.id === contractId);
  const emp = c ? (allEmployees.find(e => e.id === c.employee_id) || {}) : {};
  if(!c || !c.severance_file_url){ toast('먼저 명세서 PDF를 업로드해 주세요.', 'warning'); return; }
  const email = String(emp.email || '').trim();
  if(!email){ toast(`${emp.name || '근로자'} — 이메일이 등록되어 있지 않습니다.`, 'error'); return; }
  if(!confirm(`[이메일 발송]

${emp.name || '근로자'} 님에게 퇴직금 명세서를 이메일로 발송하시겠습니까?
수신주소: ${email}`)) return;
  try{
    const fileAbs = (location.origin || '') + c.severance_file_url;
    await _saveSeveranceDispatch({
      contractId, method: DISPATCH_METHOD.EMAIL, recipient: email,
      note: `수신 이메일: ${email}\n■ 퇴직금 명세서 파일: ${fileAbs}`
    });
    toast(`✅ ${emp.name || '근로자'} 이메일 발송 완료`, 'success');
    renderRetirementMgmt();
  } catch(e){ toast('발송 중 오류가 발생했습니다.', 'error'); }
}

/** 수동교부 기록 */
async function sendSeveranceManual(contractId){
  const c = (allContracts||[]).find(x => x.id === contractId);
  const emp = c ? (allEmployees.find(e => e.id === c.employee_id) || {}) : {};
  if(!c || !c.severance_file_url){ toast('먼저 명세서 PDF를 업로드해 주세요.', 'warning'); return; }
  if(!confirm(`[수동교부 기록]

${emp.name || '근로자'} 님에게 퇴직금 명세서를 출력·교부하셨습니까?
확인 시 수동교부 이력이 등록됩니다.`)) return;
  try{
    const fileAbs = (location.origin || '') + c.severance_file_url;
    await _saveSeveranceDispatch({
      contractId, method: DISPATCH_METHOD.MANUAL, recipient: '수동교부',
      note: `수동교부 — 파일: ${fileAbs}`
    });
    toast(`✅ ${emp.name || '근로자'} 수동교부 처리 완료`, 'success');
    renderRetirementMgmt();
  } catch(e){ toast('처리 중 오류가 발생했습니다.', 'error'); }
}

/** 해고예고수당 테이블 */
function renderNoticePayTable(list, fmtD){
  const tbody = document.querySelector('#retirement-table-noticepay tbody');
  if(!tbody) return;
  if(!list.length){ tbody.innerHTML = `<tr><td colspan="7" class="cen-empty"><i class="fas fa-inbox"></i> 해고예고수당 대상자가 없습니다.</td></tr>`; return; }
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
          <i class="fas fa-calculator"></i> 퇴직금 산정
        </button>
      </td>
    </tr>
  `).join('');
}

/** 신고완료 마킹 (DB 저장) */
async function markRetirementDone(contractId, type){
  if (!window._retirementMgmtEnabled) return;
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
  if (!window._retirementMgmtEnabled) return;
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
  if (!window._retirementMgmtEnabled) return;
  toast('퇴직정산 모달은 이후에 별도로 구현됩니다.', 'info');
  console.log('[퇴직정산] contractId:', contractId);
}

/** showPage 후크 — 페이지 진입 시 초기화 (OFF 시 후크 무력화)
 *  ★ 원본 showPage의 Promise를 그대로 반환해야 함 (2026-09-03 수정)
 *    — 반환하지 않으면 openPayrollInputModal 등에서 `await showPage(...)`가
 *      외부 페이지 로드 완료를 기다리지 못해 DOM 미준비 null 에러 발생 */
(function(){
  const _orig = window.showPage;
  if(typeof _orig === 'function'){
    window.showPage = function(name, el){
      const _p = _orig(name, el);
      if(name === 'retirement-mgmt' && window._retirementMgmtEnabled) setTimeout(initRetirementMgmtPage, 50);
      return _p;
    };
  }
})();
