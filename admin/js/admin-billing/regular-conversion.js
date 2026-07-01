//  정규직 전환 관리 페이지 (page-regular-conversion)
//  「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조
// ==================================================================

// ─── RC 페이지 전용 상태 변수 ────────────────────────────────────
let _rcHistoryList   = [];   // 정규직 전환 발송 이력 캐시
let _rcHistoryLoaded = false;
let _rcTab           = 'target'; // 현재 탭: 'target' | 'history' | 'template'
const RC_PAGE_SIZE   = 20;   // 테이블 페이지당 행 수
let _rcTargetPage    = 1;    // 전환 대상 현재 페이지
let _rcHistoryPage   = 1;    // 발송 이력 현재 페이지

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
  _rcTab = 'target';
  _rcTargetPage  = 1;
  _rcHistoryPage = 1;

  // 이력 로드 중 tbody 로딩 표시
  const _rcTbody = document.getElementById('rc-target-tbody');
  if(_rcTbody) _rcTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#6366f1;margin-right:8px;"></i>정규직 전환 이력 불러오는 중...</td></tr>`;

  // 이력 강제 재조회
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);

  // 고객사 필터 채우기
  _rcFillCompanyFilter('rc-filter-company');

  // 렌더링
  renderRcStats();
  renderRcTargetList();

  // 탭 초기화
  rcSwitchTab('target');
}

/**
 * RC 탭 전환
 */
function rcSwitchTab(tab){
  _rcTab = tab;
  ['target','history','template'].forEach(t => {
    const btn   = document.getElementById(`rc-tab-${t}`);
    const panel = document.getElementById(`rc-panel-${t}`);
    if(btn)   btn.classList.toggle('active', t === tab);
    if(panel) panel.style.display = t === tab ? '' : 'none';
  });
  if(tab === 'history'){
    if(!_rcHistoryLoaded){
      const _htbody = document.getElementById('rc-log-tbody');
      if(_htbody) _htbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#6366f1;margin-right:8px;"></i>이력 불러오는 중...</td></tr>`;
      (async()=>{ await rcLoadHistory(true); renderRcHistory(); })();
    } else {
      renderRcHistory();
    }
  }
  if(tab === 'template'){
    _rcFillTemplateSampleSel();
    renderRcTemplate();
  }
}

/**
 * 상단 통계 카드 4개 업데이트
 * - exceeded: 2년 초과
 * - urgent:   임박 (640일~730일)
 * - warning:  주의 (548일~639일)
 * - done:     이번 달 발송 완료 건수
 */
function renderRcStats(){
  const list     = _calcRcFullList();
  const exceeded = list.filter(x => x.rcStatus === 'exceeded').length;
  const urgent   = list.filter(x => x.rcStatus === 'urgent').length;
  const warning  = list.filter(x => x.rcStatus === 'warning').length;

  // 이번 달 발송 완료
  const now    = new Date();
  const ym     = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const done   = _rcHistoryList.filter(r => (r.noticed_at||r.sent_at||'').startsWith(ym)).length;

  const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setVal('rc-stat-exceeded', exceeded);
  setVal('rc-stat-urgent',   urgent);
  setVal('rc-stat-warning',  warning);
  setVal('rc-stat-done',     done);

  // 전환 대상 탭 배지 (exceeded 만 표시)
  const badge = document.getElementById('rc-tab-target-badge');
  if(badge){
    badge.textContent   = exceeded;
    badge.style.display = exceeded > 0 ? 'inline-flex' : 'none';
  }
}

/**
 * 전환 대상 테이블 렌더링 (필터·검색·페이지네이션 포함)
 */
function renderRcTargetList(){
  const tbody = document.getElementById('rc-target-tbody');
  if(!tbody) return;

  const filterCo     = document.getElementById('rc-filter-company')?.value   || '';
  const filterStatus = document.getElementById('rc-filter-status')?.value    || '';
  const searchQ      = (document.getElementById('rc-search')?.value || '').trim().toLowerCase();

  let list = _calcRcFullList().filter(x => {
    if(filterCo     && x.companyId !== filterCo)    return false;
    if(filterStatus && x.rcStatus  !== filterStatus) return false;
    if(searchQ      && !x.empName.toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>a.empName.localeCompare(b.empName,'ko'));

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(list.length / RC_PAGE_SIZE));
  if(_rcTargetPage > totalPages) _rcTargetPage = totalPages;
  const pageData = list.slice((_rcTargetPage-1)*RC_PAGE_SIZE, _rcTargetPage*RC_PAGE_SIZE);

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#6b7280;">
      <i class="fas fa-check-circle" style="color:#10b981;font-size:22px;display:block;margin-bottom:10px;"></i>
      정규직 전환 의무 대상자가 없습니다.
    </td></tr>`;
    document.getElementById('rc-target-pagination').innerHTML = '';
    return;
  }

  const fmtDays = d => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(${d}일)`;
  };

  const statusBadge = s => {
    if(s === 'exceeded') return `<span class="badge-2yr-over"><i class="fas fa-exclamation-circle"></i> 전환 의무</span>`;
    if(s === 'urgent')   return `<span class="badge-2yr-warn" style="background:#fff7ed;color:#9a3412;border-color:#fb923c;"><i class="fas fa-fire"></i> 임박</span>`;
    return `<span class="badge-2yr-warn"><i class="fas fa-clock"></i> 주의</span>`;
  };

  // 2년까지 잔여일
  const remainDays = totalDays => {
    const rem = RC_EXCEEDED_DAYS - totalDays;
    if(rem <= 0) return `<span style="color:#dc2626;font-weight:700;">초과 ${Math.abs(rem)}일</span>`;
    return `<span style="color:${rem<=90?'#ea580c':rem<=180?'#d97706':'#374151'};font-weight:600;">D-${rem}</span>`;
  };

  tbody.innerHTML = pageData.map(x => {
    const catText   = contractTypeLabel(x.activeContract?.contract_type) || '계약직';
    const sendBtn   = x.rcStatus === 'exceeded'
      ? `<button onclick="rcSendNotice('${x.empId}')"
           style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:5px;">
           <i class="fas fa-paper-plane"></i> 안내 발송
         </button>`
      : `<span style="font-size:11.5px;color:#9ca3af;">전환 의무 미도달</span>`;
    return `<tr>
      <td style="font-weight:700;color:#111827;">${x.empName}</td>
      <td style="font-size:12px;color:#374151;">${x.company}</td>
      <td><span class="badge badge-purple" style="font-size:11px;">${catText}</span></td>
      <td style="font-size:12px;color:#6b7280;">${x.firstStart || '-'}</td>
      <td style="font-size:12px;font-weight:600;color:${x.rcStatus==='exceeded'?'#dc2626':x.rcStatus==='urgent'?'#ea580c':'#d97706'};">${fmtDays(x.totalDays)}</td>
      <td>${remainDays(x.totalDays)}</td>
      <td>${statusBadge(x.rcStatus)}</td>
      <td style="text-align:center;white-space:nowrap;">${sendBtn}</td>
    </tr>`;
  }).join('');

  // 페이지네이션 렌더링
  const pagEl = document.getElementById('rc-target-pagination');
  if(pagEl) pagEl.innerHTML = _rcBuildPagination(totalPages, _rcTargetPage, `_rcTargetPage`, `renderRcTargetList`);
}

/**
 * 발송 이력 DB 조회 (notice_type = 'regular_conversion')
 */
async function rcLoadHistory(force=false){
  if(!force && _rcHistoryLoaded) return;
  try {
    let page = 1, all = [];
    while(true){
      const res  = await fetch(`../tables/contract_expiry_notices?page=${page}&limit=200&sort=noticed_at`);
      const data = await res.json();
      const rows = (data.data||[]).filter(r => r.notice_type === 'regular_conversion');
      all.push(...rows);
      if((data.data||[]).length < 200) break;
      page++;
    }
    // 최신순 정렬
    _rcHistoryList = all.sort((a,b) => (b.noticed_at||'').localeCompare(a.noticed_at||''));
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
function renderRcHistory(){
  const tbody = document.getElementById('rc-log-tbody');
  if(!tbody) return;

  const filterCo = document.getElementById('rc-log-filter-company')?.value || '';
  const searchQ  = (document.getElementById('rc-log-search')?.value || '').trim().toLowerCase();

  let list = _rcHistoryList.filter(r => {
    if(filterCo && r.company_id !== filterCo) return false;
    if(searchQ  && !(r.employee_name||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>(a.employee_name||'').localeCompare(b.employee_name||'','ko'));

  const totalPages = Math.max(1, Math.ceil(list.length / RC_PAGE_SIZE));
  if(_rcHistoryPage > totalPages) _rcHistoryPage = totalPages;
  const pageData = list.slice((_rcHistoryPage-1)*RC_PAGE_SIZE, _rcHistoryPage*RC_PAGE_SIZE);

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d) ? '-' : d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="8" class="cen-empty"><i class="fas fa-inbox"></i> 발송 이력이 없습니다.</td></tr>`;
    document.getElementById('rc-log-pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = pageData.map(r => {
    const cls = CAT_BADGE_CLS[r.contract_type] || 'badge-purple';
    // 누적 기간 — note 필드에서 일수 파싱 시도
    const noteMatch = (r.note||'').match(/누적\s*([\d]+)일/);
    const totalDaysText = noteMatch ? `${noteMatch[1]}일` : '-';
    return `<tr>
      <td style="font-size:12px;color:#374151;white-space:nowrap;">${fmtDt(r.noticed_at)}</td>
      <td style="font-weight:600;color:#111827;">${r.employee_name||'-'}</td>
      <td><span class="badge ${cls}" style="font-size:11px;">${r.contract_type||'-'}</span></td>
      <td style="font-size:12px;color:#374151;">${r.company_name||'-'}</td>
      <td style="font-size:12px;color:#6b7280;">${totalDaysText}</td>
      <td><span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:20px;font-size:11.5px;font-weight:700;">${r.notice_method||'인앱알림'}</span></td>
      <td style="font-size:12px;color:#6b7280;">${_resolveAdminName(r.noticed_by)||'-'}</td>
      <td style="font-size:11.5px;color:#6b7280;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(r.note||'').replace(/"/g,'&quot;')}">${r.note||'-'}</td>
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
 * 메시지 예시 샘플 셀렉트 채우기
 */
function _rcFillTemplateSampleSel(){
  const sel = document.getElementById('rc-tmpl-sample-sel');
  if(!sel) return;
  sel.innerHTML = '<option value="__demo__">— 예시 데이터로 보기 —</option>';
  _calcRcFullList().filter(x => x.rcStatus === 'exceeded').forEach(x => {
    const opt = document.createElement('option');
    opt.value       = x.empId;
    opt.textContent = `${x.empName} · ${x.activeContract?.contract_type||'계약직'} · ${x.company} · 누적 ${x.totalDays}일`;
    sel.appendChild(opt);
  });
}

/**
 * 메시지 예시 탭 렌더링 (인앱 알림 미리보기 + 변수 안내)
 */
function renderRcTemplate(){
  const selVal = document.getElementById('rc-tmpl-sample-sel')?.value || '__demo__';
  let item = null;
  if(selVal !== '__demo__'){
    item = _calcRcFullList().find(x => x.empId === selVal);
  }

  // 미리보기 데이터 구성 (실제 또는 예시)
  const empName    = item?.empName        || '홍길동';
  const coName     = item?.company        || '(주)예시기업';
  const coRep      = item ? (allCompanies.find(c=>c.id===item.companyId)?.representative||'') : '대표자';
  const catText    = item?.activeContract?.contract_type || '계약직';
  const firstStart = item?.firstStart     || '2023-01-01';
  const totalDays  = item?.totalDays      || 750;

  const fmtDays = d => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${d}일)`;
  };

  const title = `[정규직 전환 의무] ${empName} — 기간제 2년 초과`;
  const bodyFull =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원의 기간제 근로 누적 기간이 2년을 초과하여 법률에 따른 정규직 전환 의무가 발생하였음을 안내드립니다.

■ 직원명: ${empName}
■ 고용형태: ${catText}
■ 최초 계약일: ${firstStart}
■ 누적 계약기간: ${fmtDays(totalDays)}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요.

※ 본 안내는 대화인사노무파트너스에서 발송한 법적 의무 안내입니다.

${_BRAND_SIG}`;

  // 인앱 카드 미리보기 업데이트
  const setTxt = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  const setHtml= (id,v)=>{ const el=document.getElementById(id); if(el) el.innerHTML=v; };

  setTxt('rc-tmpl-inapp-title',      title);
  setTxt('rc-tmpl-inapp-full-title', title);
  setTxt('rc-tmpl-inapp-time',       '방금 전');
  setTxt('rc-tmpl-inapp-body',       bodyFull.split('\n')[0]); // 첫 줄 요약

  // 전체 내용 — 줄바꿈 유지
  setHtml('rc-tmpl-inapp-full-body', bodyFull.split('\n').map(l=>`<div style="min-height:1.2em;">${l||'&nbsp;'}</div>`).join(''));

  // 정보 박스 — notif-detail-infobox 스타일(실제 앱 상세 시트)과 동일 구조
  setHtml('rc-tmpl-inapp-infobox', `
    <div style="display:flex;flex-direction:column;gap:2px;">
      <div style="display:flex;gap:8px;font-size:12.5px;line-height:1.9;">
        <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0;">근로자</span>
        <span style="color:#1e293b;font-weight:700;">${empName}</span>
      </div>
      <div style="display:flex;gap:8px;font-size:12.5px;line-height:1.9;">
        <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0;">고용형태</span>
        <span style="color:#1e293b;font-weight:700;">${catText}</span>
      </div>
      <div style="display:flex;gap:8px;font-size:12.5px;line-height:1.9;">
        <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0;">최초 계약일</span>
        <span style="color:#1e293b;">${firstStart}</span>
      </div>
      <div style="display:flex;gap:8px;font-size:12.5px;line-height:1.9;">
        <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0;">누적 기간</span>
        <span style="color:#dc2626;font-weight:700;">${fmtDays(totalDays)}</span>
      </div>
    </div>`);
  setTxt('rc-tmpl-inapp-foot', `※ 본 안내는 대화인사노무파트너스에서 발송한 법적 의무 안내입니다.\n\n${_BRAND_SIG}`);

  // 변수 안내 테이블
  const vars = [
    ['{empName}',    '직원명',              empName],
    ['{company}',    '고객사명',            coName],
    ['{coRep}',      '고객사 대표자명',     coRep||'(없음)'],
    ['{catText}',    '고용형태',            catText],
    ['{firstStart}', '최초 계약 시작일',    firstStart],
    ['{totalDays}',  '누적 계약일수',       `${totalDays}일`],
    ['{fmtPeriod}',  '누적 기간 텍스트',    fmtDays(totalDays)],
    ['{today}',      '발송 일자',           new Date().toLocaleDateString('ko-KR')],
  ];
  const varTbody = document.getElementById('rc-tmpl-var-tbody');
  if(varTbody){
    varTbody.innerHTML = vars.map(([v,d,e])=>`
      <tr>
        <td><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;color:#dc2626;">${v}</code></td>
        <td style="font-size:12.5px;color:#374151;">${d}</td>
        <td style="font-size:12.5px;color:#6b7280;">${e}</td>
      </tr>`).join('');
  }
}

/**
 * 정규직 전환 안내 발송 (RC 페이지용)
 * — _2yrSendNotice 호출 후 RC 페이지 새로고침
 */
async function rcSendNotice(empId){
  await _2yrSendNotice(empId);
  // CEN 발송 이력과 별개로 RC 페이지 이력도 재조회
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);
  renderRcStats();
  renderRcTargetList();
  if(_rcTab === 'history') renderRcHistory();
}

/**
 * RC 페이지 전체 새로고침
 */
async function rcRefresh(){
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);
  _rcFillCompanyFilter('rc-filter-company');
  renderRcStats();
  renderRcTargetList();
  if(_rcTab === 'history')  renderRcHistory();
  if(_rcTab === 'template'){ _rcFillTemplateSampleSel(); renderRcTemplate(); }
}

/**
 * 페이지네이션 HTML 생성 헬퍼 (RC 공통)
 */
function _rcBuildPagination(total, current, pageVar, renderFn){
  if(total <= 1) return '';
  const btns = [];
  const makeBtn = (label, page, disabled=false, active=false) =>
    `<button onclick="${pageVar}=${page};${renderFn}();"
       style="min-width:30px;height:30px;padding:0 8px;border:1px solid ${active?'#6366f1':'#d1d5db'};
              border-radius:6px;background:${active?'#6366f1':'#fff'};color:${active?'#fff':'#374151'};
              font-size:12px;cursor:${disabled?'default':'pointer'};font-family:inherit;font-weight:${active?'700':'400'};" 
       ${disabled?'disabled':''}>
       ${label}
     </button>`;
  btns.push(makeBtn('‹', Math.max(1,current-1), current===1));
  const start = Math.max(1, current-2), end = Math.min(total, current+2);
  if(start > 1) btns.push(makeBtn('1',1), start>2?`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`:'');
  for(let p=start;p<=end;p++) btns.push(makeBtn(p,p,false,p===current));
  if(end < total) btns.push(end<total-1?`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`:'', makeBtn(total,total));
  btns.push(makeBtn('›', Math.min(total,current+1), current===total));
  return `<div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:12px 0;">${btns.join('')}</div>`;
}

// ==================================================================
