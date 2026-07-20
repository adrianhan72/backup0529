//  고객사앱 알림 이력 (page-company-notice-log)
// ======================================================================

const CNL_PAGE_SIZE = 20;  // 페이지당 20건

// ── 상태 변수 ──
let _cnlCompanyId   = '';   // '' = 전체 고객사
let _cnlCompanyName = '';
let _cnlList        = [];   // 전체 로드된 원본 목록
let _cnlPage        = 1;
let _cnlLoaded      = false;

// ── 기간 검증: 최대 3개월 제한 (조회 버튼 클릭 시) ──
function _cnlDoSearch(){
  const fromEl = document.getElementById('cnl-filter-date-from');
  const toEl = document.getElementById('cnl-filter-date-to');
  const noticeEl = document.getElementById('cnl-date-notice');
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
  _cnlPage = 1;
  renderCnlReserveCard();
  renderCnlTable();
}

// ── notice_type → 한글 레이블 ──
const CNL_TYPE_LABEL = {
  contract_created              : '신규 근로계약',
  contract_voided               : '근로계약 파기',
  contract_amended              : '근로계약 수정',
  contract_terminated           : '근로계약 해지',
  contract_termination_scheduled: '근로계약 해지 예약',
  contract_termination_cancelled: '근로계약 해지 취소',
  contract_renewed              : '근로계약 갱신',
  contract_renewal_scheduled    : '근로계약 갱신 예약',
  contract_renewed_new          : '근로계약 재계약',
  contract_dispatched           : '근로계약서 발송',
  contract_signed_uploaded      : '근로계약서 날인본 등록',
  contract_consent_uploaded     : '동의서 날인본 등록',
  contract_fully_documented     : '서류 완비',
  payroll_input_complete        : '급여 입력/수정',
  payslip_individual_sent       : '급여명세서 개별',
  payslip_bulk_sent             : '급여명세서 일괄',
  severance_paid                : '퇴직급여 지급',
  contract_expiry               : '근로계약 만료 통지',
  regular_conversion            : '정규직 전환',
  leave_promotion               : '연차 사용촉진',
  general                       : '중요공지',
  welcome                       : '가입환영',
  notice                        : '이용안내',
};

// notice_type → 색상 팔레트
const CNL_TYPE_COLOR = {
  contract_created              : { bg:'#dcfce7', color:'#166534' },
  contract_updated              : { bg:'#dbeafe', color:'#1e40af' },
  contract_voided               : { bg:'#fee2e2', color:'#991b1b' },
  contract_amended              : { bg:'#fef3c7', color:'#92400e' },
  contract_terminated           : { bg:'#fce7f3', color:'#9d174d' },
  contract_termination_scheduled: { bg:'#fff7ed', color:'#c2410c' },
  contract_termination_cancelled: { bg:'#f0fdf4', color:'#15803d' },
  contract_renewed              : { bg:'#ede9fe', color:'#5b21b6' },
  contract_renewal_scheduled    : { bg:'#f5f3ff', color:'#6d28d9' },
  contract_renewed_new          : { bg:'#d1fae5', color:'#065f46' },
  contract_dispatched           : { bg:'#e0f2fe', color:'#075985' },
  contract_signed_uploaded      : { bg:'#f0f9ff', color:'#0369a1' },
  contract_consent_uploaded     : { bg:'#eff6ff', color:'#1d4ed8' },
  contract_fully_documented     : { bg:'#ecfdf5', color:'#047857' },
  payroll_input_complete        : { bg:'#fef9c3', color:'#713f12' },
  payslip_individual_sent       : { bg:'#fdf4ff', color:'#7e22ce' },
  payslip_bulk_sent             : { bg:'#f5f3ff', color:'#4c1d95' },
  severance_paid                : { bg:'#fae8ff', color:'#86198f' },
  contract_expiry               : { bg:'#fff1f2', color:'#be123c' },
  regular_conversion            : { bg:'#f0fdf4', color:'#166534' },
  leave_promotion               : { bg:'#fefce8', color:'#854d0e' },
  general                       : { bg:'#fef3c7', color:'#b45309' },
  welcome                       : { bg:'#ecfeff', color:'#0e7490' },
  notice                        : { bg:'#ede9fe', color:'#6d28d9' },
};

/** 고객사 드롭다운 옵션 채우기 */
function _cnlPopulateCompanySelect(){
  const sel = document.getElementById('cnl-filter-company');
  if(!sel) return;
  const list = allCompanies
    .filter(c => !c.is_draft)
    .sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'','ko'));
  // 기존 옵션 유지 (첫 번째 '전체 고객사' 포함) 후 고객사 목록 추가
  sel.innerHTML = `<option value="">전체 고객사</option>`
    + list.map(c => `<option value="${c.id}">${c.company_name||''}</option>`).join('');
  // 이전에 선택된 값 복원
  if(_cnlCompanyId) sel.value = _cnlCompanyId;
}

/** 페이지 진입 초기화 */
async function initCnlPage(){
  _cnlPopulateCompanySelect();
  // 전역 고객사 선택 공유: 다른 페이지에서 선택된 고객사가 있으면 드롭다운도 맞춤
  if(currentGlobalCompanyId && !_cnlCompanyId){
    _cnlCompanyId = currentGlobalCompanyId;
    const sel = document.getElementById('cnl-filter-company');
    if(sel) sel.value = _cnlCompanyId;
  }
  if(!_cnlLoaded){
    await cnlLoadData();
  } else {
    renderCnlTable();
  }
}

/** 고객사 드롭다운 변경 핸들러 */
async function cnlOnCompanyChange(){
  const sel = document.getElementById('cnl-filter-company');
  _cnlCompanyId   = sel?.value || '';
  _cnlCompanyName = sel?.options[sel.selectedIndex]?.text || '';
  if(_cnlCompanyId) currentGlobalCompanyId = _cnlCompanyId;
  _cnlPage   = 1;
  _cnlLoaded = false;
  await cnlLoadData();
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

/** DB에서 알림 이력 전체 로드 (최대 1000건, 최근순) */
async function cnlLoadData(){
  _cnlShowLoading(true);
  try {
    const res = await api(`../tables/company_notices?limit=1000&sort=sent_at`);
    _cnlList   = (res.data || []).sort((a,b) => {
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

/** 새로고침 */
async function cnlReload(){
  const btn = document.querySelector('[onclick="cnlReload()"]');
  if(!btn || btn.disabled) return; // prevent double-click
  const icon = btn.querySelector('i');
  try {
    _cnlLoaded = false;
    if(icon) icon.classList.add('fa-spin');
    btn.disabled = true;
    await cnlLoadData();
  } finally {
    if(icon) icon.classList.remove('fa-spin');
    btn.disabled = false;
  }
}

/** 예약 현황 카드 렌더 (gn_status === 'scheduled' 건만) */
function renderCnlReserveCard(){
  const reserveCard = document.getElementById('cnl-reserve-card');
  const tbody       = document.getElementById('cnl-reserve-tbody');
  const badge       = document.getElementById('cnl-reserve-badge');
  if(!reserveCard || !tbody) return;

  const filterCompany = document.getElementById('cnl-filter-company')?.value || '';
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();

  // scheduled 건 + 현재 필터 적용
  const list = _cnlList.filter(n => {
    if(n.gn_status !== 'scheduled') return false;
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

  // 고객사 컬럼: 전체 고객사 모드일 때만
  const showCoCol = !filterCompany;
  const thCo = document.getElementById('cnl-reserve-th-company');
  if(thCo) thCo.style.display = showCoCol ? '' : 'none';

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    if(isNaN(d)) return '-';
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'),
          dd = String(d.getDate()).padStart(2,'0'),
          hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
    return `${y}.${mo}.${dd} <span style="color:#b45309;font-size:11.5px;font-weight:700;">${hh}:${mm}</span>`;
  };

  const typeBadge = t => {
    const label = CNL_TYPE_LABEL[t] || t || '-';
    const clr   = CNL_TYPE_COLOR[t] || { bg:'#f3f4f6', color:'#374151' };
    return `<span style="display:inline-block;background:${clr.bg};color:${clr.color};
      padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;">${label}</span>`;
  };

  tbody.innerHTML = list.map((n, idx) => {
    const rowBg = idx % 2 === 0 ? '#fffdf0' : '#fff';
    const coCell = showCoCol
      ? `<td style="padding:10px 14px;font-size:12.5px;font-weight:700;color:#92400e;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;"
             title="${(n.company_name||'').replace(/"/g,'&quot;')}">${n.company_name||'-'}</td>`
      : '';
    const titleShort = (n.title||'').length > 40 ? (n.title||'').slice(0,40)+'…' : (n.title||'-');
    const displayTime = n.gn_scheduled_at || n.sent_at;

    return `<tr style="background:${rowBg};border-bottom:1px solid #fef3c7;"
               onmouseover="this.style.background='#fef9c3'" onmouseout="this.style.background='${rowBg}'">
      <td style="padding:10px 14px;white-space:nowrap;font-size:12.5px;color:#374151;">${fmtDt(displayTime)}</td>
      ${coCell}
      <td style="padding:10px 14px;">${typeBadge(n.notice_type)}</td>
      <td style="padding:10px 14px;font-size:12.5px;color:#1e293b;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${(n.title||'').replace(/"/g,'&quot;')}">${titleShort}</td>
      <td style="padding:10px 14px;font-size:12px;color:#64748b;white-space:nowrap;">${_resolveAdminName(n.sent_by)||'-'}</td>
      <td style="padding:10px 14px;text-align:center;">
        <div style="display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:nowrap;">
          <button onclick="cancelGnScheduled('${n.id}')" class="btn btn-danger btn-sm">
            <i class="fas fa-ban"></i> 취소
          </button>
          <button onclick="openGnEditModal('${n.id}')" class="btn btn-indigo btn-sm">
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
  const typeClr = CNL_TYPE_COLOR[n.notice_type] || { bg:'#f3f4f6', color:'#374151' };
  const isGeneral = n.notice_type === 'general';
  const gnSt = isGeneral ? (n.gn_status || 'sent') : null;
  const gnStatusTxt = gnSt === 'scheduled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#b45309;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-clock" style="font-size:9px;"></i> 예약 대기</span>`
    : gnSt === 'cancelled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-ban" style="font-size:9px;"></i> 취소됨</span>`
    : `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-check" style="font-size:9px;"></i> 발송 완료</span>`;
  const displayTime  = (isGeneral && gnSt === 'scheduled') ? (n.gn_scheduled_at || n.sent_at) : n.sent_at;
  const timeLabel    = (isGeneral && gnSt === 'scheduled') ? '예약 일시' : '발송 일시';
  const gnStatusRow  = (isGeneral && gnSt !== 'sent') ? `<span style="color:#64748b;font-weight:600;">발송 상태</span><span>${gnStatusTxt}</span>` : '';
  const employeeRow  = !isGeneral ? `<span style="color:#64748b;font-weight:600;">근로자</span><span style="color:#4f46e5;font-weight:700;">${n.employee_name||'—'}</span>` : '';
  const _isReadDetail = v => v === true || v === 'true' || v === 1 || v === '1';
  const readTxt = _isReadDetail(n.is_read)
    ? `<span style="color:#166534;font-weight:700;"><i class="fas fa-check-circle"></i> 읽음</span>`
    : `<span style="color:#dc2626;font-weight:700;"><i class="fas fa-circle" style="font-size:10px;"></i> 미확인</span>`;
  const readRow = (isGeneral && gnSt === 'cancelled') ? '' : `<span style="color:#64748b;font-weight:600;">확인 여부</span><span>${readTxt}</span>`;

  body.innerHTML = `
    <div style="background:${isGeneral?'#fffbeb':'#f8fafc'};border:1px solid ${isGeneral?'#fde68a':'#e2e8f0'};border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:12.5px;line-height:2;">
      <div style="display:grid;grid-template-columns:90px 1fr;gap:2px 0;">
        <span style="color:#64748b;font-weight:600;">알림 유형</span>
        <span><span style="display:inline-block;background:${typeClr.bg};color:${typeClr.color};padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;">${typeLbl}</span></span>
        <span style="color:#64748b;font-weight:600;">${timeLabel}</span>
        <span style="color:#1e293b;font-weight:600;">${fmtDtFull(displayTime)}</span>
        <span style="color:#64748b;font-weight:600;">고객사</span>
        <span style="color:#1e293b;">${n.company_name||'-'}</span>
        ${employeeRow}${gnStatusRow}${readRow}
        <span style="color:#64748b;font-weight:600;">발송자</span>
        <span style="color:#374151;">${n.sent_by||'-'}</span>
      </div>
    </div>
    <div style="font-size:13.5px;font-weight:800;color:#1e293b;margin-bottom:10px;padding:10px 14px;
                background:${isGeneral?'linear-gradient(135deg,#fffbeb,#fef9c3)':'linear-gradient(135deg,#eef2ff,#f0f9ff)'};
                border-radius:8px;border-left:4px solid ${isGeneral?'#f59e0b':'#6366f1'};">
      ${n.title||'(제목 없음)'}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;
                font-size:13px;line-height:1.9;color:#334155;white-space:pre-wrap;word-break:break-all;">
${(n.body||'(내용 없음)').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    </div>`;
  modal.style.display = 'flex';
}

/** 테이블 렌더 */
function renderCnlTable(){
  const tbody = document.getElementById('cnl-tbody');
  if(!tbody) return;

  const filterCompany = document.getElementById('cnl-filter-company')?.value || '';
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();
  const dateFrom      = document.getElementById('cnl-filter-date-from')?.value || '';
  const dateTo        = document.getElementById('cnl-filter-date-to')?.value || '';

  // scheduled 제외 + 필터 적용 (발송완료/취소됨만)
  let list = _cnlList.filter(n => {
    if(n.gn_status === 'scheduled') return false;          // 예약 대기는 예약 현황 카드에서 표시
    if(filterCompany && n.company_id !== filterCompany) return false;
    if(filterType    && n.notice_type !== filterType)   return false;
    if(searchQ       && !(n.title||'').toLowerCase().includes(searchQ)) return false;
    if(dateFrom || dateTo){
      const sentDt = (n.scheduled_at || n.created_at || '').slice(0,10);
      if(dateFrom && sentDt < dateFrom) return false;
      if(dateTo   && sentDt > dateTo)   return false;
    }
    return true;
  });

  // 발송 이력 건수 배지 갱신
  const badge = document.getElementById('cnl-total-badge');
  if(badge) badge.textContent = `총 ${list.length}건`;

  // 고객사 컬럼 헤더: 전체 고객사 모드일 때만 표시
  const thCompany = document.getElementById('cnl-th-company');
  const showCoCol = !filterCompany;
  if(thCompany) thCompany.style.display = showCoCol ? '' : 'none';

  const totalPages = Math.max(1, Math.ceil(list.length / CNL_PAGE_SIZE));
  if(_cnlPage > totalPages) _cnlPage = totalPages;
  const pageData = list.slice((_cnlPage-1)*CNL_PAGE_SIZE, _cnlPage*CNL_PAGE_SIZE);

  const colSpan = showCoCol ? 7 : 6;

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px;">
      <i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:10px;opacity:.4;"></i>
      ${_cnlLoaded ? '발송된 알림 이력이 없습니다.' : '데이터를 불러오는 중입니다...'}
    </td></tr>`;
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
    const clr   = CNL_TYPE_COLOR[t]  || { bg:'#f3f4f6', color:'#374151' };
    return `<span style="display:inline-block;background:${clr.bg};color:${clr.color};
      padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;">${label}</span>`;
  };

  const _isRead = v => v === true || v === 'true' || v === 1 || v === '1';
  const readBadge = n =>
    _isRead(n.is_read)
      ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11.5px;font-weight:700;">
           <i class="fas fa-check" style="font-size:10px;"></i> 읽음
         </span>`
      : `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:11.5px;font-weight:700;">
           <i class="fas fa-circle" style="font-size:7px;"></i> 미확인
         </span>`;

  // gn_status 배지 (general 타입 전용, 발송이력에는 sent/cancelled만 도달)
  const gnStatusBadge = st => {
    if(st === 'cancelled') return `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;"><i class="fas fa-ban" style="font-size:9px;"></i>취소됨</span>`;
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;"><i class="fas fa-check" style="font-size:9px;"></i>발송완료</span>`;
  };

  tbody.innerHTML = pageData.map((n, idx) => {
    const rowBg = idx % 2 === 0 ? '#fff' : '#fafbfc';
    const isGeneral = n.notice_type === 'general';
    const gnSt = isGeneral ? (n.gn_status || 'sent') : null;

    // 고객사 셀 (전체 모드일 때만 표시)
    const coCell = showCoCol
      ? `<td style="padding:10px 14px;font-size:12.5px;font-weight:700;color:#4f46e5;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;" title="${(n.company_name||'').replace(/"/g,'&quot;')}">${n.company_name||'-'}</td>`
      : '';

    const titleShort = (n.title||'').length > 40 ? (n.title||'').slice(0,40)+'…' : (n.title||'-');
    const safeIdx = (_cnlPage-1)*CNL_PAGE_SIZE + idx;

    // 확인 컬럼: general+sent이면 읽음여부만, cancelled이면 취소됨만, 일반은 읽음여부
    const confirmCell = isGeneral
      ? (gnSt === 'sent' ? readBadge(n) : gnStatusBadge(gnSt))
      : readBadge(n);

    return `<tr style="background:${rowBg};border-bottom:1px solid #f1f5f9;"
               onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='${rowBg}'">
      <td style="padding:10px 14px;white-space:nowrap;font-size:12.5px;color:#374151;">${fmtDt(n.sent_at)}</td>
      ${coCell}
      <td style="padding:10px 14px;">${typeBadge(n.notice_type)}</td>
      <td style="padding:10px 14px;font-size:12.5px;color:#1e293b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${(n.title||'').replace(/"/g,'&quot;')}">${titleShort}</td>
      <td style="padding:10px 8px;text-align:center;white-space:nowrap;">${confirmCell}</td>
      <td style="padding:10px 8px;font-size:12px;color:#64748b;white-space:nowrap;">${_resolveAdminName(n.sent_by)||'-'}</td>
      <td style="padding:10px 8px;text-align:center;">
        <button onclick="openCnlDetail(${safeIdx})" class="btn btn-indigo btn-sm">
          <i class="fas fa-eye"></i>
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
  const makeBtn = (label, page, disabled=false, active=false) =>
    `<button onclick="_cnlPage=${page};renderCnlTable();"
       style="min-width:30px;height:30px;padding:0 8px;border:1px solid ${active?'#6366f1':'#d1d5db'};
              border-radius:6px;background:${active?'#6366f1':'#fff'};color:${active?'#fff':'#374151'};
              font-size:12px;cursor:${disabled?'default':'pointer'};
              font-family:inherit;font-weight:${active?'700':'400'};"
       ${disabled?'disabled':''}>${label}</button>`;
  const btns = [];
  btns.push(makeBtn('‹', Math.max(1,_cnlPage-1), _cnlPage===1));
  const start = Math.max(1, _cnlPage-2), end = Math.min(totalPages, _cnlPage+2);
  if(start > 1){ btns.push(makeBtn('1',1)); if(start>2) btns.push(`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`); }
  for(let p=start;p<=end;p++) btns.push(makeBtn(p,p,false,p===_cnlPage));
  if(end < totalPages){ if(end<totalPages-1) btns.push(`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`); btns.push(makeBtn(totalPages,totalPages)); }
  btns.push(makeBtn('›', Math.min(totalPages,_cnlPage+1), _cnlPage===totalPages));
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;">
      <span style="font-size:12.5px;color:#64748b;">총 <strong>${total}</strong>건 중 ${s}–${e}번째</span>
      <div style="display:flex;align-items:center;gap:4px;">${btns.join('')}</div>
    </div>`;
}

/** 상세 모달 열기 */
function openCnlDetail(listIdx){
  const filterCompany = document.getElementById('cnl-filter-company')?.value || '';
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();
  const list = _cnlList.filter(n => {
    if(filterCompany && n.company_id !== filterCompany) return false;
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
  const typeClr = CNL_TYPE_COLOR[n.notice_type] || { bg:'#f3f4f6', color:'#374151' };
  const readTxt = n.is_read
    ? `<span style="color:#166534;font-weight:700;"><i class="fas fa-check-circle"></i> 읽음 (${fmtDtFull(n.read_at)})</span>`
    : `<span style="color:#dc2626;font-weight:700;"><i class="fas fa-circle" style="font-size:10px;"></i> 미확인</span>`;

  // general 타입 전용: gn_status 처리
  const isGeneral = n.notice_type === 'general';
  const gnSt = isGeneral ? (n.gn_status || 'sent') : null;
  const gnStatusTxt = gnSt === 'scheduled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#b45309;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-clock" style="font-size:9px;"></i> 예약 대기</span>`
    : gnSt === 'cancelled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-ban" style="font-size:9px;"></i> 취소됨</span>`
    : `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-check" style="font-size:9px;"></i> 발송 완료</span>`;
  const displayTime = (isGeneral && gnSt === 'scheduled') ? (n.gn_scheduled_at || n.sent_at) : n.sent_at;
  const timeLabel   = (isGeneral && gnSt === 'scheduled') ? '예약 일시' : '발송 일시';

  // general 타입 전용 추가 행
  const gnStatusRow = isGeneral ? `
        <span style="color:#64748b;font-weight:600;">발송 상태</span>
        <span>${gnStatusTxt}</span>` : '';
  const employeeRow = !isGeneral ? `
        <span style="color:#64748b;font-weight:600;">근로자</span>
        <span style="color:#4f46e5;font-weight:700;">${n.employee_name||'—'}</span>` : '';
  const readRow = (isGeneral && gnSt !== 'sent') ? '' : `
        <span style="color:#64748b;font-weight:600;">확인 여부</span>
        <span>${readTxt}</span>`;

  body.innerHTML = `
    <!-- 메타 정보 -->
    <div style="background:${isGeneral?'#fffbeb':'#f8fafc'};border:1px solid ${isGeneral?'#fde68a':'#e2e8f0'};border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:12.5px;line-height:2;">
      <div style="display:grid;grid-template-columns:90px 1fr;gap:2px 0;">
        <span style="color:#64748b;font-weight:600;">알림 유형</span>
        <span><span style="display:inline-block;background:${typeClr.bg};color:${typeClr.color};padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;">${typeLbl}</span></span>
        <span style="color:#64748b;font-weight:600;">${timeLabel}</span>
        <span style="color:#1e293b;font-weight:600;">${fmtDtFull(displayTime)}</span>
        <span style="color:#64748b;font-weight:600;">고객사</span>
        <span style="color:#1e293b;">${n.company_name||'-'}</span>
        ${employeeRow}${gnStatusRow}${readRow}
        <span style="color:#64748b;font-weight:600;">발송자</span>
        <span style="color:#374151;">${n.sent_by||'-'}</span>
      </div>
    </div>

    <!-- 제목 -->
    <div style="font-size:13.5px;font-weight:800;color:#1e293b;margin-bottom:10px;padding:10px 14px;
                background:${isGeneral?'linear-gradient(135deg,#fffbeb,#fef9c3)':'linear-gradient(135deg,#eef2ff,#f0f9ff)'};
                border-radius:8px;border-left:4px solid ${isGeneral?'#f59e0b':'#6366f1'};">
      ${n.title||'(제목 없음)'}
    </div>

    <!-- 본문 -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;
                font-size:13px;line-height:1.9;color:#334155;white-space:pre-wrap;word-break:break-all;">
${(n.body||'(내용 없음)').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
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
