//  정규직 전환 관리 페이지 (page-regular-conversion)
//  「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조
// ==================================================================

// ─── RC 페이지 전용 상태 변수 ────────────────────────────────────
let _rcHistoryList   = [];   // 정규직 전환 발송 이력 캐시
let _rcHistoryLoaded = false;
let _rcTab           = 'history'; // 현재 탭: 'history' | 'template' (전환 대상 탭 제거됨)
const RC_PAGE_SIZE   = 20;   // 테이블 페이지당 행 수
let _rcTargetPage    = 1;    // 전환 대상 현재 페이지
let _rcHistoryPage   = 1;    // 발송 이력 현재 페이지
let _rcContactCache       = null; // 대표 연락처 캐시

// ─── 상태 분류 임계값 (일수) ─────────────────────────────────────
const RC_EXCEEDED_DAYS = 730; // 2년 초과 → 전환 의무 발생
const RC_URGENT_DAYS   = 640; // ~90일 이내 → 임박
const RC_WARN_DAYS     = 548; // ~180일 이내 → 주의 (1년 6개월+)

/**
 * _calc2YrExceedList() 결과에 urgent 상태를 추가로 분류한 목록 반환
 * status: 'exceeded' | 'urgent' | 'warning'
 */
function _calcRcFullList(){
  const base = _calc2YrExceedList(); // exceeded | warning
  return base.map(x => {
    if(x.status === 'exceeded') return { ...x, rcStatus: 'exceeded' };
    // warning 중 2년까지 90일 이내(640일+)면 urgent
    if(x.totalDays >= RC_URGENT_DAYS) return { ...x, rcStatus: 'urgent' };
    return { ...x, rcStatus: 'warning' };
  }).sort((a,b) => {
    const order = { exceeded:0, urgent:1, warning:2 };
    if(order[a.rcStatus] !== order[b.rcStatus]) return order[a.rcStatus] - order[b.rcStatus];
    return b.totalDays - a.totalDays;
  });
}

/**
 * 정규직 전환 관리 페이지 초기화
 */
async function initRcPage(){
  _rcTab = 'history';
  _rcTargetPage  = 1;
  _rcHistoryPage = 1;

  // 대표 연락처 정보 로드
  if(!_rcContactCache) {
    try { _rcContactCache = await getRepresentativeContact(); } catch(e) { _rcContactCache = {}; }
  }

  // 이력 로드 중 tbody 로딩 표시
  const _rcLogTbody = document.getElementById('rc-log-tbody');
  if(_rcLogTbody) _rcLogTbody.innerHTML = `<tr><td colspan="10" class="cen-empty"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</td></tr>`;

  // 이력 강제 재조회
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);

  // 고객사 필터 채우기 (발송 이력용)
  _rcFillCompanyFilter('rc-log-filter-company');

  // 발송 이력 렌더 (기본 탭)
  renderRcHistory();

  // 탭 초기화
  rcSwitchTab('history');
}

/**
 * RC 탭 전환
 */
function rcSwitchTab(tab){
  _rcTab = tab;
  ['history','template'].forEach(t => {
    const btn   = document.getElementById(`rc-tab-${t}`);
    const panel = document.getElementById(`rc-panel-${t}`);
    if(btn)   btn.classList.toggle('active', t === tab);
    if(panel) panel.style.display = t === tab ? '' : 'none';
  });
  if(tab === 'history'){
    if(!_rcHistoryLoaded){
      const _htbody = document.getElementById('rc-log-tbody');
      if(_htbody) _htbody.innerHTML = `<tr><td colspan="10" class="cen-empty"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</td></tr>`;
      (async()=>{ await rcLoadHistory(true); renderRcHistory(); })();
    } else {
      renderRcHistory();
    }
  }
  if(tab === 'template'){
    renderRcTemplate();
  }
}

/**
 * 발송 이력 DB 조회 (notice_type = 'regular_conversion')
 */
async function rcLoadHistory(force=false){
  if(!force && _rcHistoryLoaded) return;
  try {
    let page = 1, all = [];
    while(true){
      const res  = await fetch(`../tables/company_notices?page=${page}&limit=200&sort=sent_at`);
      const data = await res.json();
      const rows = (data.data||[]).filter(r => r.notice_type === 'regular_conversion');
      all.push(...rows);
      if((data.data||[]).length < 200) break;
      page++;
    }
    // 최신순 정렬
    _rcHistoryList = all.sort((a,b) => (b.sent_at||'').localeCompare(a.sent_at||''));
    _rcHistoryLoaded = true;

    // 이력 필터 고객사 채우기
    _rcFillCompanyFilter('rc-log-filter-company');
  } catch(e){
    console.error('[RC] 발송 이력 조회 오류', e);
  }
}

/**
 * 발송 이력 테이블 렌더링
 */
function _rcDoSearch(){
  const fromEl = document.getElementById('rc-log-filter-date-from');
  const toEl = document.getElementById('rc-log-filter-date-to');
  const noticeEl = document.getElementById('rc-date-notice');
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
  _rcHistoryPage = 1;
  renderRcHistory();
}

function renderRcHistory(){
  const tbody = document.getElementById('rc-log-tbody');
  if(!tbody) return;

  const filterCo   = document.getElementById('rc-log-filter-company')?.value || '';
  const filterType = document.getElementById('rc-log-filter-type')?.value || '';
  const searchQ    = (document.getElementById('rc-log-search')?.value || '').trim().toLowerCase();
  const dateFrom   = document.getElementById('rc-log-filter-date-from')?.value || '';
  const dateTo     = document.getElementById('rc-log-filter-date-to')?.value || '';

  let list = _rcHistoryList.filter(r => {
    if(filterCo && r.company_id !== filterCo) return false;
    if(searchQ  && !(r.employee_name||'').toLowerCase().includes(searchQ)) return false;
    if(dateFrom || dateTo){
      const raw = r.sent_at || '';
      const sentDt = typeof raw === 'string' ? raw.slice(0,10) : String(raw).slice(0,10);
      if(dateFrom && sentDt < dateFrom) return false;
      if(dateTo   && sentDt > dateTo)   return false;
    }
    // 고지유형 필터
    if(filterType === 'advance'   && !(r.title||'').includes('사전 고지')) return false;
    if(filterType === 'violation' &&  (r.title||'').includes('사전 고지')) return false;
    return true;
  }).sort((a,b)=>(b.sent_at||'').localeCompare(a.sent_at||'','ko'));

  const totalPages = Math.max(1, Math.ceil(list.length / RC_PAGE_SIZE));
  if(_rcHistoryPage > totalPages) _rcHistoryPage = totalPages;
  const pageData = list.slice((_rcHistoryPage-1)*RC_PAGE_SIZE, _rcHistoryPage*RC_PAGE_SIZE);

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d) ? '-' : d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="10" class="cen-empty"><i class="fas fa-inbox"></i> 발송 이력이 없습니다.</td></tr>`;
    document.getElementById('rc-log-pagination').innerHTML = '';
    return;
  }

  const senderLabel = sentBy => {
    if(!sentBy) return '<span style="font-size:11px;color:#6366f1;">시스템 자동발송</span>';
    return `<span style="font-size:12px;color:#374151;">${_resolveAdminName(sentBy)||sentBy}</span>`;
  };

  const noticeTypeBadge = (title) => {
    if(title?.includes('사전 고지')) return '<span class="badge badge-amber" style="background:#fef3c7;color:#b45309;">사전 고지</span>';
    if(title?.includes('재안내'))   return '<span class="badge badge-red" style="background:#fee2e2;color:#dc2626;">재안내</span>';
    return '<span class="badge badge-red" style="background:#fee2e2;color:#dc2626;">전환 의무 위반</span>';
  };

  const isAdvance = (title) => (title||'').includes('사전 고지');

  const empCatBadge = (catLabel) => {
    if(!catLabel || catLabel==='-') return '-';
    const catMap = {
      '정규직': CONTRACT_TYPE.REGULAR,
      '정규직 수습': CONTRACT_TYPE.REGULAR_PROBATION,
      '계약직': CONTRACT_TYPE.FIXED,
      '계약직 수습': CONTRACT_TYPE.FIXED_PROBATION,
      '일용직': CONTRACT_TYPE.DAILY,
    };
    const catKey = catMap[catLabel] || '';
    const cls = CAT_BADGE_CLS[catKey] || 'badge-gray';
    return `<span class="badge ${cls}">${catLabel}</span>`;
  };

  tbody.innerHTML = pageData.map(r => {
    // 고용형태 — body에서 파싱
    const catMatch = (r.body||'').match(/■\s*고용형태[:\s]*([^\n]+)/);
    const catLabel = catMatch ? catMatch[1].trim() : '-';
    // 누적 근로일수 — body에서 파싱
    const dayMatch = (r.body||'').match(/■\s*누적\s*근로일수[:\s]*([^\n]+)/);
    const totalDaysText = dayMatch ? dayMatch[1].trim() : '-';
    // 누적 일수에서 "총 NNN일" 패턴으로 숫자 추출
    const totalDaysMatch = (totalDaysText.match(/총\s*([\d,]+)\s*일/)||[]);
    const totalDaysNum = totalDaysMatch[1] ? parseInt(totalDaysMatch[1].replace(/,/g,'')) : 0;

    // 전환 의무일까지 D-n 계산
    let ddayHtml = '-';
    if(totalDaysNum > 0){
      const remaining = 730 - totalDaysNum;
      if(remaining > 0){
        ddayHtml = `<span style="font-weight:600;color:#b45309;">D-${remaining}</span>`;
      } else {
        ddayHtml = `<span style="font-weight:700;color:#dc2626;">+${Math.abs(remaining)}일 초과</span>`;
      }
    }

    return `<tr>
      <td style="font-size:12px;color:#374151;white-space:nowrap;">${fmtDt(r.sent_at)}</td>
      <td>${noticeTypeBadge(r.title)}</td>
      <td style="font-size:12px;color:#111827;font-weight:700;">${r.company_name||'-'}</td>
      <td style="font-weight:600;color:#111827;">${r.employee_name||'-'}</td>
      <td style="font-size:12px;">${empCatBadge(catLabel)}</td>
      <td style="font-size:12px;color:#6b7280;">${totalDaysNum > 0 ? totalDaysNum.toLocaleString() + '일' : '-'}</td>
      <td style="font-size:12px;">${ddayHtml}</td>
      <td><span class="badge badge-purple"><i class="fas fa-bell" style="font-size:11px;margin-right:3px;"></i>인앱 알림</span></td>
      <td style="font-size:12px;">${senderLabel(r.sent_by)}</td>
      <td>${r.is_read ? '<span class="badge badge-green" style="background:#dcfce7;color:#16a34a;">읽음</span>' : '<span class="badge badge-gray" style="background:#f3f4f6;color:#9ca3af;">미확인</span>'}</td>
    </tr>`;
  }).join('');

  const pagEl = document.getElementById('rc-log-pagination');
  if(pagEl) pagEl.innerHTML = _rcBuildPagination(totalPages, _rcHistoryPage, `_rcHistoryPage`, `renderRcHistory`);
}

/**
 * 고객사 필터 셀렉트 옵션 채우기 (중복 방지)
 */
function _rcFillCompanyFilter(selId){
  const sel = document.getElementById(selId);
  if(!sel) return;
  // 기존 옵션 제거 (전체 옵션 제외)
  while(sel.options.length > 1) sel.remove(1);
  const seen = new Set();
  _calcRcFullList().forEach(x => {
    if(!seen.has(x.companyId)){
      seen.add(x.companyId);
      const opt = document.createElement('option');
      opt.value = x.companyId; opt.textContent = x.company;
      sel.appendChild(opt);
    }
  });
}

/**
 * 메시지 예시 탭 렌더링 (인앱 알림 미리보기 + 변수 안내)
 * 사전 고지 (700~730일) / 전환 의무 발생 (730일 초과) 두 가지 예시 표시
 */
function renderRcTemplate(){
  const setTxt = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };

  const fmtDays = d => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${d}일)`;
  };

  const contactPhone = _rcContactCache?.phone || '02)3487-8841';
  const contactEmail = _rcContactCache?.email || 'eunyangpark@naver.com';
  const contactFax   = _rcContactCache?.fax   || '02)3487-8882';
  const contactFoot  = `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n● 전화: ${contactPhone}\n● 이메일: ${contactEmail}\n● 팩스: ${contactFax}`;

  // ──────────────────────────────────────────────
  // 섹션 A: 사전 고지 (700~730일)
  // ──────────────────────────────────────────────
  {
    const empName='홍길동', coRep='김대표', catText='계약직',
          firstStart='2024-01-15', totalDays=715;

    const title = `[정규직 전환 사전 고지] ${empName} — 2년 도달 30일 전`;
    const plain =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원의 기간제 근로 누적 기간이 2년(730일) 도달 30일 전입니다.
정규직 전환 의무 발생에 대비해 미리 준비해 주세요.

■ 직원명: ${empName}
■ 고용형태: ${catText}
■ 입사일: ${firstStart}
■ 누적 근로일수: ${fmtDays(totalDays)}
■ 2년 도달 예정일: ${fmtLocalDate(new Date(new Date(firstStart).getTime()+730*86400000))} (D-15)

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
2년 도달 전에 정규직 근로계약서를 준비하시고, 담당 노무사에게 계약서 작성을 요청해 주세요.

※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 사전 고지로 해당 근로자에게는 통보되지 않습니다.

${contactFoot}`;

    setTxt('rc-tmpl-inapp-title-1', title);
    setTxt('rc-tmpl-inapp-plain-1', plain);
  }

  // ──────────────────────────────────────────────
  // 섹션 B: 전환 의무 발생 (730일 초과)
  // ──────────────────────────────────────────────
  {
    const empName='김영희', coRep='박사장', catText='계약직',
          firstStart='2022-06-01', totalDays=880;

    const title = `[정규직 전환 의무] ${empName} — 기간제 2년 초과 (${fmtDays(totalDays)})`;
    const plain =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

⚠️ 소속 직원의 기간제 근로 누적 기간이 2년(730일)을 150일 초과하였습니다.

「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조에 따라 해당 직원은 이미 기간의 정함이 없는 근로계약(정규직)을 체결한 것으로 간주됩니다.

■ 직원명: ${empName}
■ 고용형태: ${catText}
■ 입사일: ${firstStart}
■ 누적 근로일수: ${fmtDays(totalDays)} (730일 대비 +150일 초과)

◆ 법적 위반 사항
기간제법 제4조 위반 — 2년 초과 사용 중인 기간제 근로자는 정규직으로 전환되었음에도 불구하고 정규직 근로계약서가 등록되지 않은 상태입니다. 이는 근로기준법 위반으로 고용노동부 근로감독 및 과태료 부과 대상이 될 수 있습니다.

◆ 즉시 필요 조치
1. 담당 노무사에게 즉시 연락하여 정규직 근로계약서 작성을 요청하세요.
2. 계약서 작성 후 근로계약 관리 메뉴에서 정규직 계약을 등록하세요.
3. 이미 정규직 계약이 등록된 경우 이 메시지를 무시하셔도 됩니다.

※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 위반 발생 고지로 해당 근로자에게는 통보되지 않습니다.

${contactFoot}`;

    setTxt('rc-tmpl-inapp-title-2', title);
    setTxt('rc-tmpl-inapp-plain-2', plain);
  }
}

/**
 * 정규직 전환 안내 발송 (RC 페이지용)
 * — _2yrSendNotice 호출 후 RC 페이지 이력 새로고침
 */
async function rcSendNotice(empId){
  // 정규직 전환 고지 기능 OFF → 발송 차단
  if (!window._regularConversionNoticeEnabled) {
    toast('정규직 전환 고지 기능이 비활성화되어 있습니다. 시스템 설정에서 활성화해 주세요.', 'warning');
    return;
  }
  await _2yrSendNotice(empId);
  // CEN 발송 이력과 별개로 RC 페이지 이력도 재조회
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);
  if(_rcTab === 'history') renderRcHistory();
}

/**
 * RC 페이지 전체 새로고침
 */
async function rcRefresh(){
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);
  if(_rcTab === 'history')  renderRcHistory();
  if(_rcTab === 'template'){ renderRcTemplate(); }
}

/**
 * 페이지네이션 HTML 생성 헬퍼 (RC 공통)
 */
function _rcBuildPagination(total, current, pageVar, renderFn){
  if(total <= 1) return '';
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const s = Math.min((current-1)*10+1, total);
  const e = Math.min(current*10, total);
  const mBtn = (label, pg, disabled, active) =>
    `<button class="page-btn${active?' active':''}" onclick="${pageVar}=${pg};${renderFn}();"${disabled?' disabled':''}>${label}</button>`;
  const btns = [];
  btns.push(mBtn('<i class="fas fa-chevron-left"></i>', Math.max(1,current-1), current<=1, false));
  const start = Math.max(1, current-2), end = Math.min(totalPages, current+2);
  if(start > 1){ btns.push(mBtn('1',1,false,false)); if(start>2) btns.push('<span class="page-ellipsis">…</span>'); }
  for(let p=start;p<=end;p++) btns.push(mBtn(p,p,false,p===current));
  if(end < totalPages){ if(end<totalPages-1) btns.push('<span class="page-ellipsis">…</span>'); btns.push(mBtn(totalPages,totalPages,false,false)); }
  btns.push(mBtn('<i class="fas fa-chevron-right"></i>', Math.min(totalPages,current+1), current>=totalPages, false));
  return `<div class="pagination"><span class="page-info">${total}건 중 ${s}-${e}</span><div class="page-btns">${btns.join('')}</div></div>`;
}

// ==================================================================
