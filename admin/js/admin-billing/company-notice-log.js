//  고객사앱 알림 이력 (page-company-notice-log)
// ======================================================================

const CNL_PAGE_SIZE = 20;  // 페이지당 20건

// ── 기능 스위치 연동 유형 (스위치 OFF 시 select·목록에서 제외) ──
const CNL_TYPE_FEATURE_GATES = [
  { type: 'probation_expiry',   enabled: () => !!window._probationFeatureEnabled },
  { type: 'contract_expiry',    enabled: () => !!window._contractExpiryNoticeEnabled },
  { type: 'regular_conversion', enabled: () => !!window._regularConversionNoticeEnabled },
  { type: 'severance_paid',     enabled: () => !!window._retirementMgmtEnabled },
];

/** 현재 비활성 유형 집합 반환 */
function _cnlDisabledTypes(){
  const set = new Set();
  CNL_TYPE_FEATURE_GATES.forEach(g => { if(!g.enabled()) set.add(g.type); });
  return set;
}

// ── 유형 select 옵션 그룹 순서 (--- 구분자로 그룹 분리) ──
const CNL_TYPE_OPTION_GROUPS = [
  ['general'],
  ['company_welcome','company_updated','company_terminate_scheduled','company_terminate_changed','company_terminate_cancelled'],
  ['contract_created','contract_renewed','contract_renewal_scheduled','contract_renewed_new','contract_updated','contract_amended'],
  ['contract_dispatched','consent_dispatched','contract_signed_uploaded','contract_consent_uploaded','contract_fully_documented','contract_review_request','contract_seal_request'],
  ['contract_terminated','contract_terminate_scheduled','contract_termination_cancelled','contract_voided'],
  ['probation_expiry','contract_expiry','regular_conversion'],
  ['payroll_input_complete','payslip_dispatched','wage_ledger_generated','wage_ledger_renewed'],
  ['severance_paid','leave_promotion'],
];

/** 유형 select 옵션을 그룹 순서·기능 스위치 기준으로 재구성 (--- 구분자 포함) */
function _cnlSyncTypeOptions(){
  const sel = document.getElementById('cnl-filter-type');
  if(!sel) return;
  const disabled = _cnlDisabledTypes();
  const prev = (sel.value && !disabled.has(sel.value)) ? sel.value : '';
  let html = '<option value="">전체</option>';
  let firstShown = true;
  CNL_TYPE_OPTION_GROUPS.forEach(group => {
    const visible = group.filter(t => !disabled.has(t) && CNL_TYPE_LABEL[t]);
    if(!visible.length) return; // 그룹 전체가 비활성이면 그룹·구분자 모두 생략
    if(!firstShown) html += '<option disabled>---</option>';
    firstShown = false;
    visible.forEach(t => {
      html += `<option value="${t}"${t===prev?' selected':''}>${CNL_TYPE_LABEL[t]}</option>`;
    });
  });
  sel.innerHTML = html;
}

// ── 상태 변수 ──
let _cnlCompanyId   = '';   // 선택된 고객사 ID (필수)
let _cnlCompanyName = '';
let _cnlList        = [];   // 전체 로드된 원본 목록
let _cnlPage        = 1;
let _cnlLoaded      = false;

// ── 고객사 선택 칩 렌더링 ──
function renderCnlCompanyList(){
  const chips = document.getElementById('cnl-company-chips');
  if(!chips) return;
  const q = (document.getElementById('cnl-company-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('cnl-company-status-filter')?.value || 'active';
  // 임시저장 제외 후 상태 필터 적용 (기본: 이용중만)
  let pool = allCompanies.filter(c => !c.is_draft);
  if(statusFilter !== 'all'){
    const target = statusFilter === 'active' ? COMPANY_STATUS.ACTIVE : COMPANY_STATUS.INACTIVE;
    pool = pool.filter(c => normalizeCompanyStatus(c.status) === target);
  }
  const filtered = q
    ? pool.filter(c => (c.company_name || '').toLowerCase().includes(q))
    : pool;
  const sorted = [...filtered].sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'','ko'));
  if(!sorted.length){
    chips.innerHTML = '<div style="color:#9ca3af;padding:8px;">검색된 고객사가 없습니다.</div>';
    return;
  }
  chips.innerHTML = sorted.map(c => {
    return `<button onclick="selectCnlCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}');"
      class="co-chip"><i class="fas fa-building" style="font-size:12px;"></i>${c.company_name}</button>`;
  }).join('');
}

/** 고객사 선택 */
function selectCnlCompany(id, name){
  _cnlCompanyId   = id;
  _cnlCompanyName = name;
  currentGlobalCompanyId = id;
  document.getElementById('cnl-company-select-card').style.display = 'none';
  document.getElementById('cnl-main-section').style.display = '';
  document.getElementById('cnl-selected-company-label').innerHTML =
    `<i class="fas fa-building" style="margin-right:6px;"></i>${name}`;
  _cnlLoaded = false;
  cnlLoadData();
}

/** 고객사 선택 해제 */
function clearCnlCompanySelect(){
  _cnlCompanyId   = '';
  _cnlCompanyName = '';
  currentGlobalCompanyId = '';
  document.getElementById('cnl-company-select-card').style.display = '';
  document.getElementById('cnl-main-section').style.display = 'none';
  _cnlList = [];
  renderCnlCompanyList();
}

// ── 기간 검증: 최대 3개월 제한 (조회 버튼 클릭 시) ──
function _cnlDoSearch(){
  const fromEl = document.getElementById('cnl-filter-date-from');
  const toEl = document.getElementById('cnl-filter-date-to');
  const noticeEl = document.getElementById('cnl-date-notice');
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
  _cnlPage = 1;
  renderCnlReserveCard();
  renderCnlTable();
}

// ── notice_type → 한글 레이블 ──
const CNL_TYPE_LABEL = {
  contract_created              : '신규 근로계약',
  contract_updated              : '근로계약 수정',
  contract_voided               : '근로계약 파기',
  contract_amended              : '근로계약 수정재발행',
  contract_terminated           : '근로계약 해지',
  contract_termination_cancelled: '근로계약 해지 취소',
  contract_terminate_scheduled : '근로계약 해지 예정',
  contract_renewed              : '근로계약 갱신',
  contract_renewal_scheduled    : '근로계약 갱신 예약',
  contract_renewed_new          : '근로계약 재계약',
  contract_dispatched           : '근로계약서 발송',
  contract_review_request       : '근로계약서 검수 요청',
  contract_seal_request         : '근로계약서 날인 요청',
  contract_signed_uploaded      : '근로계약서 날인본 등록',
  contract_consent_uploaded     : '동의서 날인본 등록',
  contract_fully_documented     : '서류 완비',
  payroll_input_complete        : '급여 입력/수정',
  payslip_dispatched            : '급여명세서 발송',
  severance_paid                : '퇴직급여 지급',
  contract_expiry               : '근로계약 만료 통지',
  regular_conversion            : '정규직 전환',
  probation_expiry              : '수습만료 통지',
  leave_promotion               : '연차 사용촉진',
  company_updated               : '고객사 정보 수정',
  company_welcome               : '고객사 가입환영',
  company_terminate_scheduled   : '서비스 해지 예정',
  company_terminate_changed     : '서비스 해지 예정일 변경',
  company_terminate_cancelled   : '서비스 해지 취소',
  consent_dispatched            : '정보제공동의서 발송',
  wage_ledger_generated         : '임금대장 발행',
  wage_ledger_renewed           : '임금대장 갱신',
  general                       : '중요공지',
};

// notice_type → 뱃지 클래스 (기존 .badge-* 계열: admin-modal.css)
const CNL_TYPE_BADGE = {
  general                       : 'badge-red',
  company_welcome               : 'badge-amber',
  company_updated               : 'badge-orange',
  company_terminate_scheduled   : 'badge-gray',
  company_terminate_changed     : 'badge-gray',
  company_terminate_cancelled   : 'badge-gray',
  contract_created              : 'badge-blue',
  contract_renewed              : 'badge-blue',
  contract_renewal_scheduled    : 'badge-blue',
  contract_renewed_new          : 'badge-blue',
  contract_updated              : 'badge-orange',
  contract_amended              : 'badge-orange',
  contract_dispatched           : 'badge-green',
  contract_review_request       : 'badge-red',
  contract_seal_request         : 'badge-purple',
  consent_dispatched            : 'badge-green',
  contract_signed_uploaded      : 'badge-green',
  contract_consent_uploaded     : 'badge-green',
  contract_fully_documented     : 'badge-green',
  contract_terminated           : 'badge-gray',
  contract_terminate_scheduled  : 'badge-gray',
  contract_termination_cancelled: 'badge-gray',
  contract_voided               : 'badge-gray',
  probation_expiry              : 'badge-pink',
  contract_expiry               : 'badge-pink',
  regular_conversion            : 'badge-pink',
  payroll_input_complete        : 'badge-purple',
  payslip_dispatched            : 'badge-purple',
  wage_ledger_generated         : 'badge-purple',
  wage_ledger_renewed           : 'badge-purple',
  severance_paid                : 'badge-slate',
  leave_promotion               : 'badge-teal',
};

/** 페이지 진입 초기화 */
async function initCnlPage(){
  _cnlSyncTypeOptions();
  renderCnlCompanyList();
  // 선택된 고객사가 없으면 선택 화면 표시
  if(!_cnlCompanyId){
    document.getElementById('cnl-company-select-card').style.display = '';
    document.getElementById('cnl-main-section').style.display = 'none';
    return;
  }
  // 이미 선택된 고객사 있으면 바로 로드
  document.getElementById('cnl-company-select-card').style.display = 'none';
  document.getElementById('cnl-main-section').style.display = '';
  document.getElementById('cnl-selected-company-label').innerHTML =
    `<i class="fas fa-building" style="margin-right:6px;"></i>${_cnlCompanyName}`;
  if(!_cnlLoaded){
    await cnlLoadData();
  } else {
    renderCnlTable();
  }
}

/** 테이블 카드에 로딩 오버레이 표시/숨김 */
function _cnlShowLoading(show){
  const card = document.getElementById('cnl-table-card');
  if(!card) return;
  const existing = card.querySelector('.tbl-loading-overlay');
  if(show){
    if(existing) return;
    const ov = document.createElement('div');
    ov.className = 'tbl-loading-overlay';
    ov.innerHTML = `<div class="tbl-spin"></div><span class="tbl-spin-txt">알림 이력 불러오는 중...</span>`;
    card.appendChild(ov);
  } else {
    if(existing) existing.remove();
  }
}

/** DB에서 알림 이력 로드 (선택 고객사만) */
async function cnlLoadData(){
  if(!_cnlCompanyId) return;
  _cnlShowLoading(true);
  try {
    const res = await api(`../tables/company_notices?limit=1000&sort=sent_at`);
    _cnlList   = (res.data || [])
      .filter(n => String(n.company_id) === _cnlCompanyId)
      .sort((a,b) => {
      // 기준일: scheduled 상태면 gn_scheduled_at, 아니면 sent_at
      const tA = (a.gn_status==='scheduled' ? a.gn_scheduled_at : null) || a.sent_at || 0;
      const tB = (b.gn_status==='scheduled' ? b.gn_scheduled_at : null) || b.sent_at || 0;
      return new Date(tB) - new Date(tA);
    });
    _cnlLoaded = true;
  } catch(e) {
    console.error('[cnlLoadData 오류]', e);
    _cnlList = [];
  }
  _cnlShowLoading(false);
  renderCnlReserveCard();
  renderCnlTable();
}

/** 새로고침 (topbar 버튼에서 호출) */
async function cnlReload(){
  _cnlLoaded = false;
  await cnlLoadData();
}

/** 예약 현황 카드 렌더 (gn_status === 'scheduled' 건만) */
function renderCnlReserveCard(){
  const reserveCard = document.getElementById('cnl-reserve-card');
  const tbody       = document.getElementById('cnl-reserve-tbody');
  const badge       = document.getElementById('cnl-reserve-badge');
  if(!reserveCard || !tbody) return;

  const filterCompany = _cnlCompanyId || '';
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();
  const disabledTypes = _cnlDisabledTypes();

  // scheduled 건 + 현재 필터 적용
  const list = _cnlList.filter(n => {
    if(n.gn_status !== 'scheduled') return false;
    if(disabledTypes.has(n.notice_type)) return false;  // 기능 OFF 유형 제외
    if(filterCompany && n.company_id !== filterCompany) return false;
    if(filterType    && n.notice_type !== filterType)   return false;
    if(searchQ       && !(n.title||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b) => new Date(a.gn_scheduled_at||a.sent_at||0) - new Date(b.gn_scheduled_at||b.sent_at||0)); // 가까운 예약 먼저

  // 예약 건 없으면 카드 숨김
  if(!list.length){
    reserveCard.style.display = 'none';
    return;
  }
  reserveCard.style.display = '';
  if(badge) badge.textContent = `${list.length}건 대기 중`;

  // 고객사 컬럼: 항상 숨김 (고객사 선택 후 진입하므로)
  const showCoCol = false;

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    if(isNaN(d)) return '-';
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'),
          dd = String(d.getDate()).padStart(2,'0'),
          hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
    return `${y}.${mo}.${dd} <span style="color:#475569;font-size:11.5px;">${hh}:${mm}</span>`;
  };

  const typeBadge = t => {
    const label = CNL_TYPE_LABEL[t] || t || '-';
    const cls   = CNL_TYPE_BADGE[t] || 'badge-gray';
    return `<span class="badge ${cls}">${label}</span>`;
  };

  const dispatchMethodBadge = n => {
    if(n.sent_by){
      return '<span class="badge badge-indigo"><i class="fas fa-user-cog"></i> 관리자 수동발송</span>';
    }
    return '<span class="badge badge-slate"><i class="fas fa-robot"></i> 시스템 자동발송</span>';
  };

  tbody.innerHTML = list.map((n, idx) => {
    const coCell = showCoCol
      ? `<td style="font-size:12.5px;font-weight:700;color:#111827;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;"
             title="${(n.company_name||'').replace(/"/g,'&quot;')}">${n.company_name||'-'}</td>`
      : '';
    const titleShort = (n.title||'').length > 40 ? (n.title||'').slice(0,40)+'…' : (n.title||'-');
    const displayTime = n.gn_scheduled_at || n.sent_at;

    return `<tr>
      <td style="white-space:nowrap;font-size:12.5px;color:#374151;">${fmtDt(displayTime)}</td>
      ${coCell}
      <td>${typeBadge(n.notice_type)}</td>
      <td class="ctr">${dispatchMethodBadge(n)}</td>
      <td style="font-size:12.5px;color:#1e293b;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${(n.title||'').replace(/"/g,'&quot;')}">${titleShort}</td>
      <td style="font-size:12px;color:#64748b;white-space:nowrap;">${_resolveAdminName(n.sent_by)||'-'}</td>
      <td class="ctr">
        <div style="display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:nowrap;">
          <button onclick="cancelGnScheduled('${n.id}')" class="btn btn-secondary btn-sm">
            <i class="fas fa-ban"></i> 취소
          </button>
          <button onclick="openGnEditModal('${n.id}')" class="btn btn-warning btn-sm">
            <i class="fas fa-edit"></i> 수정
          </button>
          <button onclick="openCnlDetailById('${n.id}')" class="btn btn-indigo btn-sm">
            <i class="fas fa-eye"></i> 보기
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/** 알림 본문 → HTML (파일주소 URL → 다운로드/주소복사 버튼) */
function _cnlBodyHtml(text){
  if(!text) return '(내용 없음)';
  const esc = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc.replace(/(파일주소\s*:\s*)(https?:\/\/[^\s<>"']+)/g, (m, label, url) => {
    // 문장부호는 URL 밖으로 분리
    const clean = url.replace(/[.,;:!?)\]\}]+$/, '');
    const tail  = url.slice(clean.length);
    const safeJs = clean.replace(/'/g, "\\'");
    return `${label}<span style="display:inline-flex;gap:6px;margin:2px 0;flex-wrap:wrap;vertical-align:middle;">`
      + `<a href="${clean}" target="_blank" rel="noopener" download onclick="event.stopPropagation()" class="btn btn-sm btn-indigo" style="text-decoration:none;"><i class="fas fa-download"></i> 다운로드</a>`
      + `<button type="button" class="btn btn-sm btn-secondary" onclick="_cnlCopyFileUrl(this,'${safeJs}')"><i class="fas fa-copy"></i> 주소복사</button>`
      + `</span>${tail}`;
  });
}

/** 파일주소 클립보드 복사 (클립보드 API + 폴백) */
function _cnlCopyFileUrl(btn, url){
  if(!url) return;
  const done = () => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> 복사됨';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
    if(typeof toast === 'function') toast('파일주소가 복사되었습니다.', 'success');
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;top:-100px;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch(e){ if(typeof toast === 'function') toast('복사에 실패했습니다.', 'error'); }
    document.body.removeChild(ta);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(done).catch(fallback);
  } else {
    fallback();
  }
}

/** 예약 현황 상세 보기 (id로 직접 조회) */
function openCnlDetailById(recordId){
  const n = _cnlList.find(x => x.id === recordId);
  if(!n) return;
  // _cnlList 내 인덱스를 구해 openCnlDetail 재사용 (필터 우회)
  const idx = _cnlList.indexOf(n);
  // 필터를 무시하고 직접 모달 오픈
  const modal = document.getElementById('cnl-detail-modal');
  const body  = document.getElementById('cnl-detail-body');
  if(!modal || !body) return;

  const fmtDtFull = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d) ? '-' : d.toLocaleString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  };
  const typeLbl = CNL_TYPE_LABEL[n.notice_type] || n.notice_type || '-';
  const isGeneral = n.notice_type === 'general';
  const gnSt = isGeneral ? (n.gn_status || 'sent') : null;
  const gnStatusTxt = gnSt === 'scheduled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#b45309;padding:2px 10px;border-radius:20px;font-size:11.5px;"><i class="fas fa-clock" style="font-size:9px;"></i> 예약 대기</span>`
    : gnSt === 'cancelled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:11.5px;"><i class="fas fa-ban" style="font-size:9px;"></i> 취소됨</span>`
    : `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:11.5px;"><i class="fas fa-check" style="font-size:9px;"></i> 발송 완료</span>`;
  const displayTime  = (isGeneral && gnSt === 'scheduled') ? (n.gn_scheduled_at || n.sent_at) : n.sent_at;
  const timeLabel    = (isGeneral && gnSt === 'scheduled') ? '예약 일시' : '발송 일시';
  const gnStatusRow  = (isGeneral && gnSt !== 'sent') ? `<span style="color:#64748b;font-weight:600;">발송 상태</span><span>${gnStatusTxt}</span>` : '';
  const employeeRow  = !isGeneral ? `<span style="color:#64748b;font-weight:600;">근로자</span><span style="color:#4f46e5;">${n.employee_name||'—'}</span>` : '';
  const _isReadDetail = v => v === true || v === 'true' || v === 1 || v === '1';
  const readTxt = _isReadDetail(n.is_read)
    ? `<span style="color:#166534;"><i class="fas fa-check-circle"></i> 읽음</span>`
    : `<span style="color:#dc2626;"><i class="fas fa-circle" style="font-size:10px;"></i> 미확인</span>`;
  const readRow = (isGeneral && gnSt === 'cancelled') ? '' : `<span style="color:#64748b;font-weight:600;">확인 여부</span><span>${readTxt}</span>`;

  body.innerHTML = `
    <div style="font-size:13.5px;font-weight:800;color:#1e293b;margin-bottom:10px;padding:10px 14px;
                background:${isGeneral?'linear-gradient(135deg,#fffbeb,#fef9c3)':'linear-gradient(135deg,#eef2ff,#f0f9ff)'};
                border-radius:8px;border-left:4px solid ${isGeneral?'#f59e0b':'#6366f1'};">
      ${n.title||'(제목 없음)'}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;
                font-size:13px;line-height:1.9;color:#334155;white-space:pre-wrap;word-break:break-all;">
${_cnlBodyHtml(n.body)}
    </div>`;
  modal.style.display = 'flex';
}

/** 테이블 렌더 */
function renderCnlTable(){
  const tbody = document.getElementById('cnl-tbody');
  if(!tbody) return;

  const filterCompany = _cnlCompanyId || '';
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();
  const dateFrom      = document.getElementById('cnl-filter-date-from')?.value || '';
  const dateTo        = document.getElementById('cnl-filter-date-to')?.value || '';
  const disabledTypes = _cnlDisabledTypes();

  // scheduled 제외 + 필터 적용 (발송완료/취소됨만)
  let list = _cnlList.filter(n => {
    if(n.gn_status === 'scheduled') return false;          // 예약 대기는 예약 현황 카드에서 표시
    if(disabledTypes.has(n.notice_type)) return false;     // 기능 OFF 유형 제외
    if(filterCompany && n.company_id !== filterCompany) return false;
    if(filterType    && n.notice_type !== filterType)   return false;
    if(searchQ       && !(n.title||'').toLowerCase().includes(searchQ)) return false;
    if(dateFrom || dateTo){
      const raw = n.sent_at || n.scheduled_at || n.created_at || '';
      const sentDt = typeof raw === 'string' ? raw.slice(0,10) : String(raw).slice(0,10);
      if(dateFrom && sentDt < dateFrom) return false;
      if(dateTo   && sentDt > dateTo)   return false;
    }
    return true;
  });

  // 발송 이력 건수 배지 갱신
  const badge = document.getElementById('cnl-total-badge');
  if(badge) badge.textContent = `총 ${list.length}건`;

  // 고객사 컬럼: 항상 숨김
  const showCoCol = false;

  const totalPages = Math.max(1, Math.ceil(list.length / CNL_PAGE_SIZE));
  if(_cnlPage > totalPages) _cnlPage = totalPages;
  const pageData = list.slice((_cnlPage-1)*CNL_PAGE_SIZE, _cnlPage*CNL_PAGE_SIZE);

  const colSpan = 7;

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="cen-empty"><i class="fas fa-inbox"></i> ${_cnlLoaded ? '발송된 알림 이력이 없습니다.' : '데이터를 불러오는 중입니다...'}</td></tr>`;
    document.getElementById('cnl-pagination').innerHTML = '';
    return;
  }

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    if(isNaN(d)) return '-';
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'),
          dd = String(d.getDate()).padStart(2,'0'),
          hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
    return `${y}.${mo}.${dd} <span style="color:#94a3b8;font-size:11px;">${hh}:${mm}</span>`;
  };

  const typeBadge = t => {
    const label = CNL_TYPE_LABEL[t] || t || '-';
    const cls   = CNL_TYPE_BADGE[t] || 'badge-gray';
    return `<span class="badge ${cls}">${label}</span>`;
  };

  const _isRead = v => v === true || v === 'true' || v === 1 || v === '1';
  const readBadge = n =>
    _isRead(n.is_read)
      ? '<span class="badge badge-green"><i class="fas fa-check"></i> 읽음</span>'
      : '<span class="badge badge-red"><i class="fas fa-circle"></i> 미확인</span>';

  // gn_status 배지 (general 타입 전용, 발송이력에는 sent/cancelled만 도달)
  const gnStatusBadge = st => {
    if(st === 'cancelled') return `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 9px;border-radius:12px;font-size:11px;white-space:nowrap;"><i class="fas fa-ban" style="font-size:9px;"></i>취소됨</span>`;
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 9px;border-radius:12px;font-size:11px;white-space:nowrap;"><i class="fas fa-check" style="font-size:9px;"></i>발송완료</span>`;
  };

  // 발송방식 배지: sent_by 유무로 자동/수동 구분
  const dispatchMethodBadge = n => {
    if(n.sent_by){
      return '<span class="badge badge-indigo"><i class="fas fa-user-cog"></i> 관리자 수동발송</span>';
    }
    return '<span class="badge badge-slate"><i class="fas fa-robot"></i> 시스템 자동발송</span>';
  };

  tbody.innerHTML = pageData.map((n, idx) => {
    const isGeneral = n.notice_type === 'general';
    const gnSt = isGeneral ? (n.gn_status || 'sent') : null;

    // 고객사 셀 (전체 모드일 때만 표시)
    const coCell = showCoCol
      ? `<td style="font-size:12.5px;font-weight:700;color:#111827;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;" title="${(n.company_name||'').replace(/"/g,'&quot;')}">${n.company_name||'-'}</td>`
      : '';

    const titleShort = (n.title||'').length > 40 ? (n.title||'').slice(0,40)+'…' : (n.title||'-');
    const safeIdx = (_cnlPage-1)*CNL_PAGE_SIZE + idx;

    // 확인 컬럼: general+sent이면 읽음여부만, cancelled이면 취소됨만, 일반은 읽음여부
    const confirmCell = isGeneral
      ? (gnSt === 'sent' ? readBadge(n) : gnStatusBadge(gnSt))
      : readBadge(n);

    return `<tr>
      <td style="white-space:nowrap;font-size:12.5px;color:#374151;">${fmtDt(n.sent_at)}</td>
      ${coCell}
      <td>${typeBadge(n.notice_type)}</td>
      <td class="ctr">${dispatchMethodBadge(n)}</td>
      <td style="font-size:12.5px;color:#1e293b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${(n.title||'').replace(/"/g,'&quot;')}">${titleShort}</td>
      <td class="ctr" style="white-space:nowrap;">${confirmCell}</td>
      <td style="font-size:12px;color:#64748b;white-space:nowrap;">${_resolveAdminName(n.sent_by)||'-'}</td>
      <td class="ctr">
        <button onclick="openCnlDetail(${safeIdx})" class="btn btn-indigo btn-sm">
          <i class="fas fa-eye"></i> 보기
        </button>
      </td>
    </tr>`;
  }).join('');

  // 페이지네이션
  renderCnlPagination(list.length);
}

/** 페이지네이션 렌더 */
function renderCnlPagination(total){
  const container = document.getElementById('cnl-pagination');
  if(!container) return;
  const totalPages = Math.max(1, Math.ceil(total / CNL_PAGE_SIZE));
  if(totalPages <= 1 && total <= CNL_PAGE_SIZE){ container.innerHTML = ''; return; }
  const s = Math.min((_cnlPage-1)*CNL_PAGE_SIZE+1, total);
  const e = Math.min(_cnlPage*CNL_PAGE_SIZE, total);
  const mBtn = (label, pg, disabled, active) =>
    `<button class="page-btn${active?' active':''}" onclick="_cnlPage=${pg};renderCnlTable();"${disabled?' disabled':''}>${label}</button>`;
  const btns = [];
  btns.push(mBtn('<i class="fas fa-chevron-left"></i>', Math.max(1,_cnlPage-1), _cnlPage<=1, false));
  const start = Math.max(1, _cnlPage-2), end = Math.min(totalPages, _cnlPage+2);
  if(start > 1){ btns.push(mBtn('1',1,false,false)); if(start>2) btns.push('<span class="page-ellipsis">…</span>'); }
  for(let p=start;p<=end;p++) btns.push(mBtn(p,p,false,p===_cnlPage));
  if(end < totalPages){ if(end<totalPages-1) btns.push('<span class="page-ellipsis">…</span>'); btns.push(mBtn(totalPages,totalPages,false,false)); }
  btns.push(mBtn('<i class="fas fa-chevron-right"></i>', Math.min(totalPages,_cnlPage+1), _cnlPage>=totalPages, false));
  container.innerHTML = `<div class="pagination"><span class="page-info">총 <strong>${total}</strong>건 중 ${s}–${e}번째</span><div class="page-btns">${btns.join('')}</div></div>`;
}

/** 상세 모달 열기 */
function openCnlDetail(listIdx){
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();
  const disabledTypes = _cnlDisabledTypes();
  const list = _cnlList.filter(n => {
    if(disabledTypes.has(n.notice_type)) return false;     // 기능 OFF 유형 제외
    if(filterType    && n.notice_type !== filterType)   return false;
    if(searchQ       && !(n.title||'').toLowerCase().includes(searchQ)) return false;
    return true;
  });
  const n = list[listIdx];
  if(!n) return;

  const modal = document.getElementById('cnl-detail-modal');
  const body  = document.getElementById('cnl-detail-body');
  if(!modal || !body) return;

  const fmtDtFull = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d) ? '-' : d.toLocaleString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  };

  const typeLbl = CNL_TYPE_LABEL[n.notice_type] || n.notice_type || '-';
  const readTxt = n.is_read
    ? `<span style="color:#166534;"><i class="fas fa-check-circle"></i> 읽음 (${fmtDtFull(n.read_at)})</span>`
    : `<span style="color:#dc2626;"><i class="fas fa-circle" style="font-size:10px;"></i> 미확인</span>`;

  // general 타입 전용: gn_status 처리
  const isGeneral = n.notice_type === 'general';
  const gnSt = isGeneral ? (n.gn_status || 'sent') : null;
  const gnStatusTxt = gnSt === 'scheduled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#b45309;padding:2px 10px;border-radius:20px;font-size:11.5px;"><i class="fas fa-clock" style="font-size:9px;"></i> 예약 대기</span>`
    : gnSt === 'cancelled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:11.5px;"><i class="fas fa-ban" style="font-size:9px;"></i> 취소됨</span>`
    : `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:11.5px;"><i class="fas fa-check" style="font-size:9px;"></i> 발송 완료</span>`;
  const displayTime = (isGeneral && gnSt === 'scheduled') ? (n.gn_scheduled_at || n.sent_at) : n.sent_at;
  const timeLabel   = (isGeneral && gnSt === 'scheduled') ? '예약 일시' : '발송 일시';

  // general 타입 전용 추가 행
  const gnStatusRow = isGeneral ? `
        <span style="color:#64748b;font-weight:600;">발송 상태</span>
        <span>${gnStatusTxt}</span>` : '';
  const employeeRow = !isGeneral ? `
        <span style="color:#64748b;font-weight:600;">근로자</span>
        <span style="color:#4f46e5;">${n.employee_name||'—'}</span>` : '';
  const readRow = (isGeneral && gnSt !== 'sent') ? '' : `
        <span style="color:#64748b;font-weight:600;">확인 여부</span>
        <span>${readTxt}</span>`;

  body.innerHTML = `

    <!-- 제목 -->
    <div style="font-size:13.5px;font-weight:800;color:#1e293b;margin-bottom:10px;padding:10px 14px;
                background:${isGeneral?'linear-gradient(135deg,#fffbeb,#fef9c3)':'linear-gradient(135deg,#eef2ff,#f0f9ff)'};
                border-radius:8px;border-left:4px solid ${isGeneral?'#f59e0b':'#6366f1'};">
      ${n.title||'(제목 없음)'}
    </div>

    <!-- 본문 -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;
                font-size:13px;line-height:1.9;color:#334155;white-space:pre-wrap;word-break:break-all;">
${_cnlBodyHtml(n.body)}
    </div>`;

  modal.style.display = 'flex';
}

/** 상세 모달 닫기 */
function closeCnlDetailModal(){
  const modal = document.getElementById('cnl-detail-modal');
  if(modal) modal.style.display = 'none';
}

// 모달 외부 클릭 시 닫기
document.addEventListener('click', function(e){
  const modal = document.getElementById('cnl-detail-modal');
  if(modal && modal.style.display === 'flex' && e.target === modal) closeCnlDetailModal();
});

// ======================================================================
