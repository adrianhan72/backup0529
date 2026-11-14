// ═══════════════════════════════════════════════════════════════════════════════
// 고객사 앱 v2 — 전면 개편 (2026-10-29)
// - 상단: 회사명·알림·햄버거 유지 / 헤더 아래 조회 시점(년월일) 날짜바 (기본 오늘)
// - 하단 4탭: 임직원 현황 · 급여통계 · 근태관리 · 연차관리
// - 임직원 현황: 조회 시점 기준 전체 고용형태 목록 → 근로자 선택 시 액션 시트
// - 급여통계: 직전월 총액 · 다음 급여일 예상 총액 · 고용형태별 통계 · 항목 선택 그래프
// - 햄버거: 슬라이드 메뉴 (4탭 + 정보 그룹 + 로그아웃)
// - 근태·연차 기록은 기존 client-attendance.js 재사용 (어드민과 동일 테이블)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 상태 ──
let _v2ViewDate    = fmtLocalDate(new Date()); // 조회 시점 (임직원 현황 — 일 단위)
let _v2ViewMonth   = { y: new Date().getFullYear(), m: new Date().getMonth() + 1 }; // 임금통계 조회 월 (월 단위)
let _v2EmpFilter   = 'all';                     // 임직원 현황 카테고리 필터
let _v2EmpSearch   = '';                        // 이름 검색어
let _v2DailyInsEmpId = '';                      // 일용직 4대보험 신고 조회 대상
let _v2TrendChart  = null;                      // 급여통계 12개월 추이 차트
let _v2TrendKey    = 'gross';                   // 12개월 추이 선택 항목 (탭 형식 — 단일 선택)

const _V2_WEEKDAYS = ['일','월','화','수','목','금','토'];
const _V2_CAT_ORDER = ['대표자','등기임원','특수관계인','정규직','정규직 수습','계약직','계약직 수습','일용직','기타'];
const _v2Pad2 = n => String(n).padStart(2,'0');

// 임직원 현황 카테고리 아이콘 (솔리드 컬러 배경 + 흰색 픽토그램)
const _V2_EMP_ICONS = {
  'all':         { fa:'fa-users',            bg:'#22c55e' },
  '정규직':      { fa:'fa-user-tie',         bg:'#3b82f6' },
  '정규직 수습': { fa:'fa-seedling',         bg:'#3b82f6' },
  '계약직':      { fa:'fa-file-contract',    bg:'#3b82f6' },
  '계약직 수습': { fa:'fa-file-signature',   bg:'#3b82f6' },
  '일용직':      { fa:'fa-tools',            bg:'#3b82f6' },
  '특수관계인':  { fa:'fa-handshake',        bg:'#a855f7' },
  '등기임원':    { fa:'fa-briefcase',        bg:'#a855f7' },
  '대표자':      { fa:'fa-building',         bg:'#a855f7' },
  '기타':        { fa:'fa-user-clock',       bg:'#f59e0b' },
  'retired':     { fa:'fa-door-open',        bg:'#64748b' },
};

// ══════════════════════════════════════════════════════════════
// ① 조회 시점 날짜바
// ══════════════════════════════════════════════════════════════
function _v2FormatDateLabel(dStr){
  const d = new Date(dStr + 'T00:00:00');
  if(isNaN(d)) return dStr || '-';
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${_V2_WEEKDAYS[d.getDay()]})`;
}

function _v2FormatMonthLabel(ym){
  return `${ym.y}년 ${ym.m}월`;
}

/** 임금통계: 월 단위 조회 — 헤더 날짜바 대신 본문 상단 월 선택기를 사용 */
function _configHeaderDate(page){
  const row = document.getElementById('header-date-row');
  if(!row) return;

  const monthMode = page === 'paystats';

  // 임금통계는 본문 상단(#ps-month-row)에서 월을 선택하므로 헤더 날짜바를 숨긴다
  row.classList.toggle('hidden', monthMode);
  if(monthMode){ _v2SyncPsMonthUI(); return; }

  const label = document.getElementById('hd-date-label');
  if(label) label.textContent = _v2FormatDateLabel(_v2ViewDate);

  const dateInput = document.getElementById('hd-date-input');
  if(dateInput) dateInput.value = _v2ViewDate;

  // 이전/다음/오늘 버튼 리스너 재등록 (중복 방지 cloneNode)
  ['hd-prev-btn','hd-next-btn','hd-today-btn'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });
  document.getElementById('hd-prev-btn').addEventListener('click', () => _v2ShiftViewDate(-1));
  document.getElementById('hd-next-btn').addEventListener('click', () => _v2ShiftViewDate(1));
  const todayBtn = document.getElementById('hd-today-btn');
  todayBtn.textContent = '오늘';
  todayBtn.addEventListener('click', () => resetViewDate());
}

/** 본문 상단 월 선택기 표시 동기화 */
function _v2SyncPsMonthUI(){
  const label = document.getElementById('ps-month-label');
  if(label) label.textContent = _v2FormatMonthLabel(_v2ViewMonth);
  const input = document.getElementById('ps-month-input');
  if(input) input.value = `${_v2ViewMonth.y}-${_v2Pad2(_v2ViewMonth.m)}`;
}

function openPsMonthPicker(){
  const input = document.getElementById('ps-month-input');
  if(!input) return;
  try { if(typeof input.showPicker === 'function') input.showPicker(); else input.click(); }
  catch(e){ try{ input.click(); }catch(_){} }
}

function _v2ShiftViewDate(delta){
  const d = new Date(_v2ViewDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  _v2SetViewDate(fmtLocalDate(d));
}

function _v2SetViewDate(dStr){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dStr || '')) return;
  _v2ViewDate = dStr;
  const input = document.getElementById('hd-date-input');
  if(input) input.value = dStr;
  const label = document.getElementById('hd-date-label');
  if(label) label.textContent = _v2FormatDateLabel(dStr);
  const active = document.querySelector('.page.active');
  const id = active ? active.id : '';
  if(id === 'page-employees') renderClientEmployees();
}

/** 임금통계: 이전/다음 달 */
function _v2ShiftViewMonth(delta){
  let y = _v2ViewMonth.y, m = _v2ViewMonth.m + delta;
  while(m < 1){ m += 12; y--; }
  while(m > 12){ m -= 12; y++; }
  _v2SetViewMonth(`${y}-${_v2Pad2(m)}`);
}

function _v2SetViewMonth(str){
  if(!/^\d{4}-\d{2}$/.test(str || '')) return;
  const [y, m] = str.split('-').map(Number);
  _v2ViewMonth = { y, m };
  _v2SyncPsMonthUI();
  const active = document.querySelector('.page.active');
  if(active && active.id === 'page-paystats') renderClientPayStats();
}

function openDatePicker(){
  const input = document.getElementById('hd-date-input');
  if(!input) return;
  try { if(typeof input.showPicker === 'function') input.showPicker(); else input.click(); }
  catch(e){ try{ input.click(); }catch(_){} }
}
function setViewDateFromInput(v){ if(v) _v2SetViewDate(v); }
function setPsMonthFromInput(v){ if(v) _v2SetViewMonth(v); }
function resetViewDate(){ _v2SetViewDate(fmtLocalDate(new Date())); }
function resetViewMonth(){ const n = new Date(); _v2SetViewMonth(`${n.getFullYear()}-${_v2Pad2(n.getMonth()+1)}`); }

// ══════════════════════════════════════════════════════════════
// ② 임직원 현황
// ══════════════════════════════════════════════════════════════

/** 조회 시점 기준 재직 여부 (입사 ≤ 기준일, 퇴사 ≥ 기준일) */
function _v2EmployedAt(emp, d){
  if(!emp) return false;
  const hire = emp.hire_date;
  if(hire && hire > d) return false;
  const resign = emp.resign_date;
  if(resign && resign < d) return false;
  if(emp.status === 'resigned') return !!(resign && resign >= d);
  return true;
}

function renderClientEmployees(){
  const catWrap = document.getElementById('emp-cat-grid');
  const listEl  = document.getElementById('emp-list');
  if(!catWrap || !listEl || !currentCompany) return;

  const base = _clientVisibleEmps().filter(e => _v2EmployedAt(e, _v2ViewDate));

  // 카테고리 집계
  const countByCat = {};
  base.forEach(e => {
    const c = _clientEmpCategory(e);
    countByCat[c] = (countByCat[c] || 0) + 1;
  });

  // 퇴직자/퇴사 예정자 집계
  const coEmps = allEmployees.filter(e => e.company_id === currentCompany.id && _normContractType(e.employment_category) !== CONTRACT_TYPE.DAILY);
  const today = fmtLocalDate(new Date());
  const upcomingResign = coEmps.filter(e => _isEmpActive(e) && e.resign_date && e.resign_date >= today);
  const retiredResign = coEmps.filter(e => _isEmpResigned(e) || (e.resign_date && e.resign_date < today));
  const retiredCount = upcomingResign.length + retiredResign.length;

  // 카테고리 버튼 순서 (기타 = 입사대기자, 수습 OFF 시 수습 버튼 숨김)
  const order = ['정규직','계약직','일용직','특수관계인','등기임원','대표자','기타'];
  const catKeys = [];
  order.forEach(c => {
    catKeys.push(c);
    if(window._probationFeatureEnabled !== false){
      if(c === '정규직') catKeys.push('정규직 수습');
      if(c === '계약직') catKeys.push('계약직 수습');
    }
  });

  const chips = [
    { key:'all', label:'전체', cnt: base.length },
    ...catKeys
      .filter(key => (countByCat[key] || 0) > 0)
      .map(key => ({ key, label: key === '기타' ? '입사대기' : key, cnt: countByCat[key] || 0 })),
    { key:'retired', label:'퇴직자', cnt: retiredCount },
  ];

  catWrap.innerHTML = chips.map(chip => {
    const sel = _v2EmpFilter === chip.key;
    const ic = _V2_EMP_ICONS[chip.key] || { fa:'fa-user', bg:'#94a3b8' };
    return `<button class="emp-cat-chip${sel?' on':''}" onclick="setV2EmpFilter('${chip.key}')" ${chip.key !== 'all' && !chip.cnt ? 'disabled' : ''}>
      <span class="emp-cat-icon" style="background:${ic.bg}"><i class="fas ${ic.fa}"></i></span>
      <span class="emp-cat-name">${chip.label.includes('수습') ? chip.label.replace(' 수습','<small> 수습</small>') : chip.label}</span>
      <span class="emp-cat-count">${chip.cnt}명</span>
    </button>`;
  }).join('');

  // 퇴직자 화면 (퇴사 예정자 / 퇴직자 구분 표시)
  if(_v2EmpFilter === 'retired'){
    _renderClientRetired(listEl, upcomingResign, retiredResign);
    return;
  }

  // 목록 필터·정렬
  let emps = base;
  if(_v2EmpFilter !== 'all') emps = base.filter(e => _clientEmpCategory(e) === _v2EmpFilter);
  if(_v2EmpSearch) emps = emps.filter(e => ((e.name||'') + (e.department||'') + (e.position||'')).includes(_v2EmpSearch));
  emps = [...emps].sort((a,b) => (a.name||'').localeCompare(b.name||'','ko'));

  if(!emps.length){
    listEl.innerHTML = `<div class="emp-empty"><i class="fas fa-users-slash"></i><div>해당하는 근로자가 없습니다</div><p>조회 시점 또는 검색 조건을 확인해 주세요.</p></div>`;
    return;
  }

  listEl.innerHTML = emps.map(emp => {
    const cat  = _clientEmpCategory(emp);
    const cfg  = CAT_CONFIG[cat] || {};
    const avatarBg = cfg.avatarBg || '#94a3b8';
    const meta = [emp.department, emp.position].filter(Boolean).join(' · ') || '부서 미지정';
    const resignedBadge = _isEmpResigned(emp)
      ? `<span class="emp-row-badge" style="background:#f3f4f6;color:#6b7280;">퇴직</span>` : '';
    return `<div class="emp-row" onclick="openEmpActionSheet('${emp.id}')">
      <div class="emp-row-avatar" style="background:${avatarBg};">${(emp.name||'?').charAt(0)}</div>
      <div class="emp-row-info">
        <div class="emp-row-name">${emp.name||'이름없음'}<span class="emp-row-badge" style="background:${cfg.avatarBg}22;color:${cfg.avatarBg};border:1px solid ${cfg.avatarBg}55;">${cat}</span>${resignedBadge}</div>
        <div class="emp-row-meta">${meta} · 입사 ${emp.hire_date||'-'}</div>
      </div>
      <i class="fas fa-chevron-right emp-row-arrow"></i>
    </div>`;
  }).join('');
}

/** 퇴직자 화면 — 퇴사 예정자 / 이미 퇴직한 퇴직자를 구분해서 표시 */
function _renderClientRetired(listEl, upcomingResign, retiredResign){
  const search = _v2EmpSearch;
  const filterByName = arr => search
    ? arr.filter(e => ((e.name||'') + (e.department||'') + (e.position||'')).includes(search))
    : arr;

  const upcoming = filterByName(upcomingResign).sort((a,b) => (a.resign_date||'').localeCompare(b.resign_date||''));
  const retired = filterByName(retiredResign).sort((a,b) => (b.resign_date||'').localeCompare(a.resign_date||''));

  if(!upcoming.length && !retired.length){
    listEl.innerHTML = `<div class="emp-empty"><i class="fas fa-users-slash"></i><div>퇴직자·퇴사 예정자가 없습니다</div><p>퇴사일이 등록된 근로자가 없습니다.</p></div>`;
    return;
  }

  const row = emp => {
    const cat = _clientEmpCategory(emp);
    const cfg = CAT_CONFIG[cat] || {};
    const avatarBg = cfg.avatarBg || '#94a3b8';
    const meta = [emp.department, emp.position].filter(Boolean).join(' · ') || '부서 미지정';
    return `<div class="emp-row" onclick="openClientSevForEmp('${emp.id}')">
      <div class="emp-row-avatar" style="background:${avatarBg};">${(emp.name||'?').charAt(0)}</div>
      <div class="emp-row-info">
        <div class="emp-row-name">${emp.name||'이름없음'}<span class="emp-row-badge" style="background:${cfg.avatarBg}22;color:${cfg.avatarBg};border:1px solid ${cfg.avatarBg}55;">${cat}</span></div>
        <div class="emp-row-meta">${meta} · 입사 ${emp.hire_date||'-'}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:10px;color:#9ca3af;">퇴사(예정)일</div>
        <div style="font-size:12px;font-weight:800;color:#dc2626;">${emp.resign_date||'-'}</div>
      </div>
      <i class="fas fa-chevron-right emp-row-arrow"></i>
    </div>`;
  };

  let html = '';
  if(upcoming.length){
    html += `<div class="emp-retired-section-title"><i class="fas fa-calendar-check" style="color:#f59e0b;"></i>퇴사 예정자<span class="count">${upcoming.length}명</span></div>`;
    html += upcoming.map(row).join('');
  }
  if(retired.length){
    html += `<div class="emp-retired-section-title"><i class="fas fa-user-times" style="color:#6b7280;"></i>퇴직자<span class="count">${retired.length}명</span></div>`;
    html += retired.map(row).join('');
  }
  listEl.innerHTML = html;
}

/** 퇴직자/퇴사 예정자 선택 → 퇴직금 페이지로 이동 (퇴직자: 지급이력, 예정자: 추계 탭) */
function openClientSevForEmp(empId){
  const emp = allEmployees.find(e => e.id === empId);
  if(!emp) return;
  const isResigned = _isEmpResigned(emp) || (emp.resign_date && emp.resign_date < fmtLocalDate(new Date()));
  _clientSevTab = isResigned ? 'history' : 'status';
  showPage('severance', null);
  setTimeout(() => {
    const card = document.getElementById('sev-emp-' + emp.id);
    if(card){
      card.scrollIntoView({ behavior:'smooth', block:'center' });
      card.style.outline = '2px solid #f59e0b';
      card.style.outlineOffset = '2px';
      setTimeout(() => { card.style.outline = ''; card.style.outlineOffset = ''; }, 2200);
    }
  }, 200);
}

function setV2EmpFilter(cat){
  _v2EmpFilter = (_v2EmpFilter === cat) ? 'all' : cat;
  renderClientEmployees();
}
function setV2EmpSearch(v){
  _v2EmpSearch = (v || '').trim();
  const clr = document.getElementById('emp-search-clear');
  if(clr) clr.style.visibility = _v2EmpSearch ? 'visible' : 'hidden';
  renderClientEmployees();
}
function clearV2EmpSearch(){
  _v2EmpSearch = '';
  const inp = document.getElementById('emp-search-input');
  if(inp) inp.value = '';
  const clr = document.getElementById('emp-search-clear');
  if(clr) clr.style.visibility = 'hidden';
  renderClientEmployees();
}

// ── 근로자 액션 시트 ──
function openEmpActionSheet(empId){
  const emp = allEmployees.find(e => e.id === empId);
  if(!emp) return;
  const cat = _clientEmpCategory(emp);
  const cfg = CAT_CONFIG[cat] || {};
  const isDaily = _normContractType(emp.employment_category) === CONTRACT_TYPE.DAILY;
  const meta = [emp.department, emp.position, cat].filter(Boolean).join(' · ');

  document.getElementById('emp-action-content').innerHTML = `
    <div class="ea-head" style="background:${cfg.bg || 'linear-gradient(135deg,#4f46e5,#6366f1)'};">
      <div class="ea-avatar">${(emp.name||'?').charAt(0)}</div>
      <div>
        <div class="ea-name">${emp.name||'-'}</div>
        <div class="ea-meta">${meta}</div>
        ${emp.hire_date ? `<div class="ea-meta">입사 ${emp.hire_date}</div>` : ''}
      </div>
    </div>
    <div class="ea-grid">
      <button class="ea-btn" onclick="closeEmpActionModal();openContractModal('${emp.id}')">
        <i class="fas fa-file-signature"></i><span>계약 관계</span><small>근로계약 상세 조회</small>
      </button>
      <button class="ea-btn" onclick="closeEmpActionModal();openEmpPayslip('${emp.id}')">
        <i class="fas fa-receipt"></i><span>급여명세서</span><small>최근 명세서 보기</small>
      </button>
      <button class="ea-btn" onclick="closeEmpActionModal();goEmpAttendance('${emp.id}')">
        <i class="fas fa-clipboard-list"></i><span>근태관리</span><small>근태 기록 입력</small>
      </button>
      <button class="ea-btn" onclick="closeEmpActionModal();goEmpLeave('${emp.id}')">
        <i class="fas fa-umbrella-beach"></i><span>연차관리</span><small>연차 사용 기록</small>
      </button>
      ${isDaily ? `<button class="ea-btn ea-btn-wide" onclick="closeEmpActionModal();openDailyInsurance('${emp.id}')">
        <i class="fas fa-shield-alt"></i><span>일용직 4대보험 신고</span><small>신고 내역 조회</small>
      </button>` : ''}
    </div>
    <div class="ea-foot"><button onclick="closeEmpActionModal()">닫기</button></div>`;
  document.getElementById('emp-action-modal').classList.add('open');
}
function closeEmpActionModal(){
  document.getElementById('emp-action-modal')?.classList.remove('open');
}

function openEmpPayslip(empId){
  const list = allPayrolls.filter(p => p.employee_id === empId)
    .sort((a,b) => ((Number(b.pay_year)||0)*12 + (Number(b.pay_month)||0)) - ((Number(a.pay_year)||0)*12 + (Number(a.pay_month)||0)));
  if(!list.length){ if(typeof _clientToast === 'function') _clientToast('급여명세서가 없습니다','error'); return; }
  openPayslipModal(list[0].id);
}

async function goEmpAttendance(empId){
  showPage('attendance', document.getElementById('nav-attendance'));
  if(typeof renderClientAttendance === 'function'){ try{ await renderClientAttendance(); }catch(e){ console.error(e); } }
  openClientAttEditor(empId);
}

async function goEmpLeave(empId){
  showPage('annual-leave', document.getElementById('nav-annual-leave'));
  if(typeof renderClientAnnualLeave === 'function'){ try{ renderClientAnnualLeave(); }catch(e){ console.error(e); } }
  if(typeof openClientLeaveEditor === 'function') openClientLeaveEditor(empId);
}

// ══════════════════════════════════════════════════════════════
// ③ 급여통계
// ══════════════════════════════════════════════════════════════

function _v2PrevMonth(viewDate){
  const [vy, vm] = viewDate.split('-').map(Number);
  if(!vy || !vm) return { y: new Date().getFullYear(), m: new Date().getMonth()+1 };
  if(vm === 1) return { y: vy-1, m: 12 };
  return { y: vy, m: vm-1 };
}

/** {y,m} 기준 직전 월 */
function _v2PrevMonthOf(ym){
  if(!ym || !ym.y || !ym.m) return { y: new Date().getFullYear(), m: new Date().getMonth()+1 };
  return ym.m === 1 ? { y: ym.y - 1, m: 12 } : { y: ym.y, m: ym.m - 1 };
}

/** 다음 급여일 (조회 시점 다음 날부터 pay_day 일자 탐색) */
function _v2NextPayday(fromDate){
  const payDay = parseInt(currentCompany?.pay_day, 10);
  if(!payDay || payDay < 1 || payDay > 31) return null;
  const d = new Date(fromDate + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  for(let i = 0; i < 40; i++){
    if(d.getDate() === payDay) return fmtLocalDate(d);
    d.setDate(d.getDate() + 1);
  }
  return null;
}

/** 다음 급여일 예상 총액: 유효 계약 월 고정금액 합산 (일용직은 최근 실적) */
function _v2ExpectedNextPayroll(emps){
  let sum = 0;
  (emps || []).forEach(emp => {
    if(_normContractType(emp.employment_category) === CONTRACT_TYPE.DAILY){
      const last = allPayrolls.filter(p => p.employee_id === emp.id)
        .sort((a,b) => ((Number(b.pay_year)||0)*12 + (Number(b.pay_month)||0)) - ((Number(a.pay_year)||0)*12 + (Number(a.pay_month)||0)))[0];
      if(last) sum += (Number(last.gross_pay)||0);
      return;
    }
    const c = allContracts.filter(x => x.employee_id === emp.id && !x.is_draft && _isContractActive(x))
      .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];
    if(!c) return;
    sum += (Number(c.base_salary)||0) + (Number(c.weekly_holiday_pay)||0) + (Number(c.position_allowance)||0)
      + (Number(c.fixed_ot_pay)||0) + (Number(c.fixed_night_pay)||0) + (Number(c.fixed_hol_pay)||0)
      + (Number(c.meal_allowance)||0) + (Number(c.transportation_allowance)||0) + (Number(c.research_allowance)||0)
      + (Number(c.communication_allowance)||0) + (Number(c.fitness_allowance)||0) + (Number(c.self_dev_allowance)||0)
      + (Number(c.book_allowance)||0) + (Number(c.overseas_allowance)||0);
  });
  return sum;
}

const _V2_ATT_FULL_DEDUCT = new Set(['unauthorized', 'sick_unpaid', 'menstrual', 'family_care']);

function _v2JsonArr(val){
  try {
    const v = typeof val === 'string' ? JSON.parse(val || '[]') : val;
    return Array.isArray(v) ? v : [];
  } catch(e){ return []; }
}

function _v2ExpandDates(from, to){
  const out = [];
  if(!from) return out;
  const f = new Date(from + 'T00:00:00');
  const t = to ? new Date(to + 'T00:00:00') : new Date(from + 'T00:00:00');
  if(isNaN(f) || isNaN(t)) return out;
  const cur = new Date(f);
  while(cur <= t && out.length < 62){ out.push(fmtLocalDate(cur)); cur.setDate(cur.getDate() + 1); }
  return out;
}

/** 해당 날짜의 정상 출근/퇴근 시각(분) — 근로계약 근무스케줄 기준 */
function _v2SchedMinute(dateStr, scheduleJson, field, fallback){
  const [fh, fm] = fallback.split(':').map(Number);
  const fb = (fh || 0) * 60 + (fm || 0);
  if(!dateStr || !scheduleJson) return fb;
  let sched;
  try { sched = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson; } catch(e){ return fb; }
  if(!Array.isArray(sched) || !sched.length) return fb;
  const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date(dateStr + 'T00:00:00').getDay()];
  const daySched = sched.find(s => s.day === dayKey && (s.active === true || s.active === 1 || s.active === 'true'));
  if(!daySched) return fb;
  const raw = (Array.isArray(daySched.shifts) && daySched.shifts.length) ? daySched.shifts[0] : daySched;
  const timeStr = raw[field] || '';
  if(!timeStr) return fb;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 근태(무급 결근·지각·조퇴)에 따른 약정임금 차감액 */
function _v2AttendanceDeduction(p, contract){
  return _v2AttendanceDeductionItems(p, contract).reduce((s, x) => s + x.amount, 0);
}

/** 근태 차감 세부 내역 — 유형별(무단결근·병가·지각·조퇴 등) 시간·금액 */
const _V2_ATT_DEDUCT_LABELS = {
  unauthorized: '무단결근(무급)',
  sick_unpaid:  '병가(무급)',
  menstrual:    '생리휴가(무급)',
  family_care:  '가족돌봄휴직',
  late:         '지각',
  earlyleave:   '조퇴',
};
function _v2AttendanceDeductionItems(p, contract){
  const hourly = Number(p.hourly_wage) || 0;
  if(hourly <= 0) return [];
  const hpd = Number(contract?.work_hours_per_day) || 8;
  const map = new Map();
  const addHours = (type, h, cnt) => {
    const key = _V2_ATT_DEDUCT_LABELS[type] || '기타 근태';
    const cur = map.get(key) || { label: key, hours: 0, count: 0 };
    cur.hours += h;
    cur.count += (cnt == null ? 1 : cnt);
    map.set(key, cur);
  };

  // 무급 결근 (주말 제외 — 휴일수당에서 별도 처리)
  _v2JsonArr(p.absent_data).concat(_v2JsonArr(p.retro_absent_data)).forEach(d => {
    if(!_V2_ATT_FULL_DEDUCT.has(d.type || 'unauthorized')) return;
    const type = d.type || 'unauthorized';
    const days = _v2ExpandDates(d.date, d.dateTo)
      .filter(dt => { const dow = new Date(dt + 'T00:00:00').getDay(); return dow !== 0 && dow !== 6; }).length;
    if(days > 0) addHours(type, days * hpd, days);
  });

  const sched = contract?.schedule_json || null;
  _v2JsonArr(p.late_data).concat(_v2JsonArr(p.retro_late_data)).forEach(d => {
    if(!d.time) return;
    const [h, m] = d.time.split(':').map(Number);
    const arrive = (h || 0) * 60 + (m || 0);
    const start = _v2SchedMinute(d.date, sched, 'start', '09:00');
    if(arrive > start) addHours('late', (arrive - start) / 60);
  });
  _v2JsonArr(p.earlyleave_data).concat(_v2JsonArr(p.retro_earlyleave_data)).forEach(d => {
    if(!d.time) return;
    const [h, m] = d.time.split(':').map(Number);
    const leave = (h || 0) * 60 + (m || 0);
    const end = _v2SchedMinute(d.date, sched, 'end', '18:00');
    if(leave < end) addHours('earlyleave', (end - leave) / 60);
  });

  return [...map.values()]
    .map(x => ({ label: x.label, hours: x.hours, count: x.count, amount: Math.round(x.hours * hourly) }))
    .filter(x => x.amount !== 0);
}

/** 선택 월 임금내역(공제 세부항목) 렌더 — 값이 없는 항목은 생략
 *  지급 세부항목은 3개 아코디언(_v2RenderPayAccordions)에서 표시 */
function _v2RenderPayBreakdown(pays, ym){
  const setAmt = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };

  if(!pays.length){
    const won0 = () => '-';
    _v2RenderDedCard('insurance', 0, [], won0);
    _v2RenderDedCard('tax', 0, [], won0);
    _v2RenderDedCard('etc', 0, [], won0);
    _v2RenderDedAccordion(0, []);
    setAmt('ps-sum-paid-target', '-');
    setAmt('ps-sum-paid-gross', '-');
    setAmt('ps-sum-paid-ded', '-');
    setAmt('ps-sum-paid-net', '-');
    _v2RenderPayAccordions([], null, ym);   // 아코디언도 비활성(0원) 상태로 초기화
    return;
  }

  const sum = key => pays.reduce((s,p) => s + (Number(p[key])||0), 0);
  const gross     = sum('gross_pay');
  const deduction = sum('total_deduction');
  // 가불금 상환은 임금이 아니므로 임금통계 지급/공제 양쪽에서 제외한다
  const advance   = sum('advance_deduction');
  // 퇴직금 중간정산도 임금이 아니므로 지급총액에서 제외
  const sevInterim = sum('severance_interim_pay');

  // 지급 항목
  const extraWork = sum('overtime_pay') + sum('night_pay') + sum('holiday_pay');
  const irregItems = _v2IrregularBreakdown(pays);           // 부정기지급 (항목별)
  const irregTotal = irregItems.reduce((s, x) => s + x.amount, 0);

  // 근태차감 (무급 결근·지각·조퇴) — 명목 약정임금에서 차감되므로 지급/공제 양쪽에 반영해 합계를 맞춘다
  const attItemsRaw = [];
  const attDed = pays.reduce((s,p) => {
    const c = allContracts
      .filter(x => x.employee_id === p.employee_id && !x.is_draft)
      .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];
    _v2AttendanceDeductionItems(p, c).forEach(it => attItemsRaw.push(it));
    return s + _v2AttendanceDeduction(p, c);
  }, 0);

  const grossNominal = gross + attDed - sevInterim;
  const dedTotal     = deduction + attDed - advance;
  const net          = grossNominal - dedTotal;
  const fixedWage    = grossNominal - extraWork - irregTotal;

  // 공제 항목 (산재보험은 근로자 부담이 없어 제외)
  const health    = sum('health_insurance');
  const ltcare    = sum('long_term_care');
  const employ    = sum('employment_insurance');
  const pension   = sum('national_pension');
  const incomeTax = sum('income_tax');
  const localTax  = sum('local_income_tax');
  // 정산 항목 — 음수는 환급(공제 감소)이므로 부호 그대로 표시
  const yeTax      = sum('year_end_tax_adjust');            // 연말정산
  const hAdj       = sum('health_insurance_adjust');        // 건강보험 정산
  const hAdjYe     = sum('health_insurance_adjust_yearend');// 건강보험 연말정산
  const ltAdj      = sum('ltcare_adjust');                  // 장기요양보험 정산
  const ltAdjYe    = sum('ltcare_adjust_yearend');          // 장기요양 연말정산
  const empAdj     = sum('employment_insurance_adjust');    // 고용보험 정산
  const penRetro   = sum('national_pension_retro');         // 국민연금 소급분
  const otherDed = dedTotal - (attDed + health + ltcare + employ + pension + incomeTax + localTax
    + yeTax + hAdj + hAdjYe + ltAdj + ltAdjYe + empAdj + penRetro);

  const won = v => Math.round(Number(v)||0).toLocaleString() + '원';
  const row = (label, val) => ({ label, amount: val });

  // ① 4대보험 (정산·소급분 포함)
  const insuranceRows = [
    row('국민연금', pension),
    row('국민연금 소급분', penRetro),
    row('건강보험', health),
    row('건강보험 정산', hAdj),
    row('건강보험 연말정산', hAdjYe),
    row('장기요양보험', ltcare),
    row('장기요양보험 정산', ltAdj),
    row('장기요양 연말정산', ltAdjYe),
    row('고용보험', employ),
    row('고용보험 정산', empAdj),
  ].filter(x => x.amount !== 0);

  // ② 세금
  const taxRows = [
    row('소득세', incomeTax),
    row('지방세', localTax),
    row('연말정산', yeTax),
  ].filter(x => x.amount !== 0);

  // ④ 기타 공제
  const etcRows = [row('기타 공제', otherDed)].filter(x => x.amount !== 0);

  // ③ 근태에 따른 차감 — 유형별 집계 (합계는 attDed로 보정)
  const attMap = new Map();
  attItemsRaw.forEach(it => {
    const cur = attMap.get(it.label) || { label: it.label, hours: 0, count: 0, amount: 0 };
    cur.hours += it.hours;
    cur.count += (it.count || 0);
    cur.amount += it.amount;
    attMap.set(it.label, cur);
  });
  const attItems = [...attMap.values()].filter(x => Math.round(x.amount) !== 0).sort((a, b) => b.amount - a.amount);
  if(attItems.length && Math.abs(attItems.reduce((s, x) => s + x.amount, 0) - attDed) > 0){
    const diff = attDed - attItems.reduce((s, x) => s + x.amount, 0);
    attItems[0].amount += diff;   // 반올림 오차는 최대 항목에 반영
  }

  _v2RenderDedCard('insurance', insuranceRows.reduce((s, r) => s + r.amount, 0), insuranceRows, won);
  _v2RenderDedCard('tax', taxRows.reduce((s, r) => s + r.amount, 0), taxRows, won);
  _v2RenderDedCard('etc', etcRows.reduce((s, r) => s + r.amount, 0), etcRows, won);
  _v2RenderDedAccordion(attDed, attItems);

  setAmt('ps-sum-paid-gross', won(grossNominal));
  setAmt('ps-sum-paid-ded', won(dedTotal));
  setAmt('ps-sum-paid-net', won(net));
  // 지급대상 건수 / 인원 (요약 카드 첫 항목)
  const targetCount = pays.length;
  const targetPeople = new Set(pays.map(p => p.employee_id)).size;
  setAmt('ps-sum-paid-target', `${targetCount}건/${targetPeople}명`);
  // 지급 세부항목 3개 아코디언 (약정임금·추가근로수당·비정기지급수당)
  _v2RenderPayAccordions(pays, { fixedWage, extraWork, irregItems }, ym);
}

/* ── 아코디언 상태 (탭 스코프별: ps = 지급내역, psn = 지급예정) ── */
const _v2MakeAccState = () => ({
  acc:     { fixed: { total: 0, items: [] }, extra: { total: 0, items: [] }, irreg: { total: 0, items: [] } },
  accOpen: { fixed: false, extra: false, irreg: false },
  ded:     { insurance: { total: 0, rows: [] }, tax: { total: 0, rows: [] }, etc: { total: 0, rows: [] } },
  dedOpen: { insurance: false, tax: false, etc: false },
  att:     { total: 0, items: [] },
  attOpen: false,
});
const _v2AccState = { ps: _v2MakeAccState(), psn: _v2MakeAccState() };
const _v2St     = scope => _v2AccState[scope] || _v2AccState.ps;
const _v2ScopedEl = (scope, id) => document.getElementById(`${scope}-${id}`);

/** 공제 아코디언(4대보험·세금·기타 공제) — 합계·비활성 상태·항목 목록 렌더 */
function _v2RenderDedCard(key, total, rows, wonFmt, scope = 'ps'){
  const st = _v2St(scope);
  const d = st.ded[key];
  if(!d) return;
  d.total = Math.round(Number(total) || 0);
  d.rows = rows || [];
  const has = d.total !== 0 && d.rows.length > 0;
  if(!has) st.dedOpen[key] = false;

  const card   = _v2ScopedEl(scope, `ded-${key}`);
  const amtEl  = _v2ScopedEl(scope, `ded-${key}-amt`);
  const listEl = _v2ScopedEl(scope, `ded-${key}-list`);
  if(amtEl) amtEl.textContent = has ? wonFmt(d.total) : '-';
  if(listEl) listEl.innerHTML = has
    ? d.rows.map(r => `<div class="pb-item"><span>${r.label}</span><span class="pb-amt">${wonFmt(r.amount)}</span></div>`).join('')
    : '';
  if(card){
    card.classList.toggle('disabled', !has);
    card.classList.toggle('open', !!st.dedOpen[key]);
    const btn = card.querySelector('.ps-acc-head');
    if(btn){
      btn.setAttribute('aria-expanded', st.dedOpen[key] ? 'true' : 'false');
      btn.setAttribute('aria-disabled', has ? 'false' : 'true');
      btn.disabled = !has;
    }
  }
}

/** 공제 아코디언 접기/펼치기 — 금액이 없으면 동작하지 않음 */
function togglePsDedCard(key, scope = 'ps'){
  const st = _v2St(scope);
  const d = st.ded[key];
  if(!d || !d.rows.length || Math.round(d.total) === 0){ st.dedOpen[key] = false; return; }
  st.dedOpen[key] = !st.dedOpen[key];
  const card = _v2ScopedEl(scope, `ded-${key}`);
  if(card) card.classList.toggle('open', st.dedOpen[key]);
  const btn = card && card.querySelector('.ps-acc-head');
  if(btn) btn.setAttribute('aria-expanded', st.dedOpen[key] ? 'true' : 'false');
}

/** 근태 차감 아코디언 — 금액 표시·비활성 상태·본문 재렌더 */
function _v2RenderDedAccordion(total, items, scope = 'ps'){
  const st = _v2St(scope);
  st.att = {
    total: Math.round(Number(total) || 0),
    items: (items || []).map((x, i) => ({
      label: x.label, hours: x.hours, count: x.count || 0, val: Math.round(x.amount),
      color: _V2_PAYMIX_COLORS[i % _V2_PAYMIX_COLORS.length],
    })),
  };
  const has = st.att.total > 0 && st.att.items.length > 0;
  if(!has) st.attOpen = false;

  const card = _v2ScopedEl(scope, 'ded-att');
  const amtEl = _v2ScopedEl(scope, 'ded-att-amt');
  if(amtEl) amtEl.textContent = has ? st.att.total.toLocaleString() + '원' : '-';
  if(card){
    card.classList.toggle('disabled', !has);
    card.classList.toggle('open', !!st.attOpen);
    const btn = card.querySelector('.ps-acc-head');
    if(btn){
      btn.setAttribute('aria-expanded', st.attOpen ? 'true' : 'false');
      btn.setAttribute('aria-disabled', has ? 'false' : 'true');
      btn.disabled = !has;
    }
  }
  const tableEl = _v2ScopedEl(scope, 'ded-att-table');
  if(tableEl) tableEl.innerHTML = '';
  if(st.attOpen && has) _v2RenderDedAttBody(scope);
}

/** 근태 차감 접기/펼치기 */
function togglePsDedAtt(scope = 'ps'){
  const st = _v2St(scope);
  if(!(st.att.total > 0) || !st.att.items.length){ st.attOpen = false; return; }
  st.attOpen = !st.attOpen;
  const card = _v2ScopedEl(scope, 'ded-att');
  if(card) card.classList.toggle('open', st.attOpen);
  const btn = card && card.querySelector('.ps-acc-head');
  if(btn) btn.setAttribute('aria-expanded', st.attOpen ? 'true' : 'false');
  if(st.attOpen) _v2RenderDedAttBody(scope);
}

/** 근태 차감 본문 — 유형별 표(항목·합계시간/건수·금액) */
function _v2RenderDedAttBody(scope = 'ps'){
  const st = _v2St(scope);
  const tableEl = _v2ScopedEl(scope, 'ded-att-table');
  if(!tableEl) return;
  const items = (st.att && st.att.items) || [];
  if(!items.length){ tableEl.innerHTML = '<div class="pb-empty">세부 항목이 없습니다</div>'; return; }

  const wonFmt = v => Math.round(Number(v) || 0).toLocaleString() + '원';
  const hoursFmt = h => (Math.round((Number(h) || 0) * 10) / 10).toString();

  tableEl.innerHTML = items.map(i => `<div class="ps-paymix-row">
        <span class="ps-paymix-name"><i class="ps-paymix-dot" style="background:${i.color}"></i>${i.label}</span>
        <span class="ps-paymix-meta">${hoursFmt(i.hours)}h/${i.count}건</span>
        <span class="ps-paymix-amt">${wonFmt(i.val)}</span>
      </div>`).join('');
}

/* ── 지급 세부항목 아코디언 (약정임금 · 추가근로수당 · 비정기지급수당) ── */
const _V2_ACC_FIXED_FIELDS = [
  ['base_salary',             '기본급'],
  ['weekly_holiday_pay',      '주휴수당'],
  ['position_allowance',      '직책수당'],
  ['skill_allowance',         '기술수당'],
  ['license_allowance',       '자격수당'],
  ['site_allowance',          '현장수당'],
  ['remote_area_allowance',   '벽지수당'],
  ['hazard_allowance',        '위험수당'],
  ['transportation_allowance','차량지원비'],
  ['self_driving_allowance',  '차량지원비'],
  ['meal_allowance',          '식대'],
  ['research_allowance',      '연구활동비'],
  ['communication_allowance', '통신비'],
  ['childcare_allowance',     '보육수당'],
  ['regular_bonus',           '정기상여'],
  ['contract_etc_allowance',  '기타 계약수당'],
];
const _V2_ACC_EXTRA_FIELDS = [
  ['overtime_pay', '추가 연장근로수당'],
  ['night_pay',    '추가 야간근로수당'],
  ['holiday_pay',  '추가 휴일근로수당'],
];
const _V2_ACC_KEYS = ['fixed', 'extra', 'irreg'];

/** 항목 맵 → 비율 표시용 목록 (합계와 차이나는 금액은 '기타'로 보정) */
function _v2AccItemList(map, total){
  const clean = new Map();
  map.forEach((v, k) => { const r = Math.round(v); if(r !== 0) clean.set(k, (clean.get(k) || 0) + r); });
  const sumOf = m => [...m.values()].reduce((s, v) => s + v, 0);
  const residual = Math.round((Number(total) || 0) - sumOf(clean));
  if(Math.abs(residual) > 0) clean.set(residual > 0 ? '기타' : '기타(차감)', (clean.get(residual > 0 ? '기타' : '기타(차감)') || 0) + residual);
  return [...clean.entries()]
    .filter(([, v]) => v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([label, val], i) => ({ label, val, color: _V2_PAYMIX_COLORS[i % _V2_PAYMIX_COLORS.length] }));
}

/** 지급월을 포함하는 근로계약 (없으면 최근 계약) */
function _v2ContractForMonth(empId, y, m){
  const list = (allContracts || []).filter(c => c.employee_id === empId && !c.is_draft
    && (typeof _normContractStatus !== 'function' || _normContractStatus(c.status) !== CONTRACT_STATUS.VOIDED));
  if(!list.length) return null;
  const ymd = `${y}-${_v2Pad2(m)}-01`;
  const covering = list.filter(c => (!c.contract_start || c.contract_start <= ymd)
    && (!c.contract_end || c.contract_end >= ymd));
  return (covering.length ? covering : list.slice())
    .sort((a, b) => String(b.contract_start || '').localeCompare(String(a.contract_start || '')))[0] || null;
}

/** 지급월의 수습 임금 비율 — 수습이 아니거나 이미 종료된 월은 1 */
function _v2ProbRatioForMonth(c, y, m){
  if(!c) return 1;
  const probAmt = Number(c.probation_amt) || 0;
  let ratio = 1;
  if(probAmt > 0 && (c.probation_basis || 'salary') === 'direct'){
    const monthly = Number(c.monthly_salary_agreed) || 0;
    ratio = monthly > 0 ? probAmt / monthly : 1;
  } else {
    const pct = Number(c.probation_pct) || 0;
    ratio = (pct > 0 && pct < 100) ? pct / 100 : 1;
  }
  if(ratio >= 1) return 1;

  const type = _normContractType(c.contract_type);
  if(type !== CONTRACT_TYPE.REGULAR_PROBATION && type !== CONTRACT_TYPE.FIXED_PROBATION) return 1;

  let probEnd = c.probation_end_date || '';
  if(!probEnd){
    const months = Number(c.probation_months) || 0;
    const start = c.contract_start ? new Date(c.contract_start) : null;
    if(months > 0 && start && !isNaN(start.getTime())){
      start.setMonth(start.getMonth() + months);
      start.setDate(start.getDate() - 1);
      probEnd = fmtLocalDate(start);
    } else {
      probEnd = c.contract_end || '';   // 종료일 미입력 → 무기한 수습
    }
  }
  if(!probEnd) return ratio;

  const monthStart = `${y}-${_v2Pad2(m)}-01`;
  if(monthStart > probEnd) return 1;    // 수습 종료 이후 월
  const monthEnd = `${y}-${_v2Pad2(m)}-${_v2Pad2(new Date(y, m, 0).getDate())}`;
  if(monthEnd <= probEnd) return ratio; // 월 전체가 수습
  return 1;                             // 수습 종료가 월 중간 → 정상값 기준
}

/** 계약서에 명시된 고정 연장·야간·휴일근로수당 (수습비율 반영) — 약정임금의 일부 */
function _v2ContractFixedExtras(c, y, m){
  const empty = { ot: 0, night: 0, hol: 0, total: 0 };
  if(!c) return empty;
  const r = _v2ProbRatioForMonth(c, y, m);
  const ot    = Math.round((Number(c.fixed_ot_pay)    || 0) * r);
  const night = Math.round((Number(c.fixed_night_pay) || 0) * r);
  const hol   = Math.round((Number(c.fixed_hol_pay)   || 0) * r);
  if(!ot && !night && !hol) return empty;
  return { ot, night, hol, total: ot + night + hol };
}

/** 탭 ① 지급 세부항목 — 3개 아코디언 데이터 구성 및 금액 표시 */
function _v2RenderPayAccordions(pays, calc, ym, scope = 'ps'){
  const st = _v2St(scope);
  const list = (pays || []).filter(Boolean);
  const fixedMap = new Map(), extraMap = new Map(), irregMap = new Map();
  const addTo = (map, label, v) => { if(!v) return; map.set(label, (map.get(label) || 0) + v); };

  list.forEach(p => {
    _V2_ACC_FIXED_FIELDS.forEach(([key, label]) => addTo(fixedMap, label, Number(p[key]) || 0));
    _v2JsonItems(p.custom_ordinary_values).forEach(x => {
      addTo(fixedMap, String((x && x.name) || '기타 통상수당').trim() || '기타 통상수당', Number(x && x.amount) || 0);
    });
    _V2_ACC_EXTRA_FIELDS.forEach(([key, label]) => addTo(extraMap, label, Number(p[key]) || 0));
  });
  ((calc && calc.irregItems) || []).forEach(it => addTo(irregMap, it.label, it.amount));

  const fixedTotal = calc ? (Number(calc.fixedWage) || 0) : 0;
  const extraTotal = calc ? (Number(calc.extraWork) || 0) : 0;
  const irregTotal = [...irregMap.values()].reduce((s, v) => s + v, 0);

  // 계약서상 고정 연장·야간·휴일근로수당 — 약정임금에 포함되므로 별도 항목으로 표시
  const fixedExtras = { ot: 0, night: 0, hol: 0, total: 0 };
  if(ym && ym.y && ym.m){
    list.forEach(p => {
      const f = _v2ContractFixedExtras(_v2ContractForMonth(p.employee_id, ym.y, ym.m), ym.y, ym.m);
      fixedExtras.ot += f.ot; fixedExtras.night += f.night; fixedExtras.hol += f.hol;
    });
    fixedExtras.total = fixedExtras.ot + fixedExtras.night + fixedExtras.hol;
  }

  // 주휴수당이 이미 기본급에 포함된 데이터는 총액과 어긋나므로 제외 (지급총액 ±50원 허용)
  const sumOfMap = m => [...m.values()].reduce((s, v) => s + v, 0);
  const weekTargets = fixedExtras.total > 0 ? [fixedTotal, fixedTotal - fixedExtras.total] : [fixedTotal];
  if(!weekTargets.some(t => Math.abs(sumOfMap(fixedMap) - t) <= 50)){
    const weekly = fixedMap.get('주휴수당') || 0;
    if(weekly && weekTargets.some(t => Math.abs(sumOfMap(fixedMap) - weekly - t) <= 50)) fixedMap.delete('주휴수당');
  }

  // 고정 연장·야간·휴일근로수당 — 약정임금 합계 안에서 실제로 지급된 만큼만 반영
  if(fixedExtras.total > 0){
    const room = Math.max(0, fixedTotal - sumOfMap(fixedMap));
    const apply = Math.min(fixedExtras.total, room);
    const parts = [['고정 연장근로수당', fixedExtras.ot], ['고정 야간근로수당', fixedExtras.night], ['고정 휴일근로수당', fixedExtras.hol]]
      .filter(([, v]) => v > 0);
    if(apply > 0 && parts.length){
      const scale = apply / fixedExtras.total;
      let assigned = 0;
      parts.forEach(([label, v], i) => {
        const amt = (i === parts.length - 1) ? apply - assigned : Math.round(v * scale);
        assigned += amt;
        addTo(fixedMap, label, amt);
      });
    }
  }

  st.acc.fixed = { total: fixedTotal, items: _v2AccItemList(fixedMap, fixedTotal) };
  st.acc.extra = { total: extraTotal, items: _v2AccItemList(extraMap, extraTotal) };
  st.acc.irreg = { total: irregTotal, items: _v2AccItemList(irregMap, irregTotal) };

  const wonFmt = v => Math.round(Number(v) || 0).toLocaleString() + '원';
  _V2_ACC_KEYS.forEach(key => {
    const d = st.acc[key];
    const hasAmt = !!d && d.total > 0 && (d.items || []).length > 0;
    if(!hasAmt) st.accOpen[key] = false;   // 금액이 없으면 접힌 상태 유지
    const amtEl = _v2ScopedEl(scope, `acc-${key}-amt`);
    if(amtEl) amtEl.textContent = hasAmt ? wonFmt(d.total) : '-';
    const card = _v2ScopedEl(scope, `acc-${key}`);
    if(card){
      card.classList.toggle('open', !!st.accOpen[key]);
      card.classList.toggle('disabled', !hasAmt);
    }
    const btn = card && card.querySelector('.ps-acc-head');
    if(btn){
      btn.setAttribute('aria-expanded', st.accOpen[key] ? 'true' : 'false');
      btn.setAttribute('aria-disabled', hasAmt ? 'false' : 'true');
      btn.disabled = !hasAmt;   // 0원이면 아코디언 동작 차단
    }
    const chartKey = `${scope}-acc-${key}-pie`;
    if(_v2PieCharts[chartKey]){ try { _v2PieCharts[chartKey].destroy(); } catch(e){} delete _v2PieCharts[chartKey]; }
    const tableEl = _v2ScopedEl(scope, `acc-${key}-table`);
    if(tableEl) tableEl.innerHTML = '';
  });

  _v2ReopenPayAccordions(scope);
}

/** 아코디언 접기/펼치기 — 금액이 0원인 카드는 동작하지 않음 */
function togglePsAcc(key, scope = 'ps'){
  if(_V2_ACC_KEYS.indexOf(key) < 0) return;
  const st = _v2St(scope);
  const d = st.acc[key];
  if(!d || !(d.total > 0) || !(d.items || []).length){ st.accOpen[key] = false; return; }
  st.accOpen[key] = !st.accOpen[key];
  const card = _v2ScopedEl(scope, `acc-${key}`);
  if(card) card.classList.toggle('open', st.accOpen[key]);
  const btn = card && card.querySelector('.ps-acc-head');
  if(btn) btn.setAttribute('aria-expanded', st.accOpen[key] ? 'true' : 'false');
  if(st.accOpen[key]) _v2RenderAccBody(key, scope);
}

/** 열려 있는 아코디언 본문(파이 + 표) 다시 그리기 — 화면 표시 후 호출 */
function _v2ReopenPayAccordions(scope = 'ps'){
  const st = _v2St(scope);
  _V2_ACC_KEYS.forEach(key => {
    const d = st.acc[key];
    if(st.accOpen[key] && d && d.total > 0) _v2RenderAccBody(key, scope);
  });
  if(st.attOpen && st.att.items.length) _v2RenderDedAttBody(scope);
}

function _v2RenderAccBody(key, scope = 'ps'){
  const d = _v2St(scope).acc[key];
  const canvas = _v2ScopedEl(scope, `acc-${key}-pie`);
  const tableEl = _v2ScopedEl(scope, `acc-${key}-table`);
  if(!canvas || !tableEl) return;
  const items = (d && d.items) || [];
  const total = d ? (Number(d.total) || 0) : 0;

  if(_v2PieCharts[canvas.id]){ try { _v2PieCharts[canvas.id].destroy(); } catch(e){} delete _v2PieCharts[canvas.id]; }
  if(!items.length){
    tableEl.innerHTML = '<div class="pb-empty">세부 항목이 없습니다</div>';
    return;
  }

  const wonFmt = v => Math.round(Number(v) || 0).toLocaleString() + '원';
  const pct = v => (total > 0 ? (v / total * 100) : 0).toFixed(1);

  _v2PieCharts[canvas.id] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: items.map(i => i.label),
      datasets: [{ data: items.map(i => i.val), backgroundColor: items.map(i => i.color), borderColor: '#fff', borderWidth: 2, hoverOffset: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { size: 13 }, bodyFont: { size: 14 },
          callbacks: { label: c => ` ${c.label}: ${wonFmt(c.parsed)} (${pct(c.parsed)}%)` },
        },
      },
    },
  });

  tableEl.innerHTML = items.map(i => `<div class="ps-paymix-row">
        <span class="ps-paymix-name"><i class="ps-paymix-dot" style="background:${i.color}"></i>${i.label}</span>
        <span class="ps-paymix-pct">${pct(i.val)}%</span>
        <span class="ps-paymix-amt">${wonFmt(i.val)}</span>
      </div>`).join('');
}

/** 고용형태별 임금 비율 파이
 *  - 근로계약을 맺은 인원은 계약의 고용형태(정규직/계약직/일용직)로 분류
 *  - 정규직·계약직·일용직·대표자는 지급 데이터가 없어도 0으로 표시
 *  - 등기임원·특수관계인은 근로계약 없이 급여가 지급된 경우에만 표시
 *  - 입사대기(기타)는 급여 지급 대상이 아니므로 제외 */
const _V2_TYPE_PIE_GROUPS = [
  { key:'정규직',     cats:['정규직','정규직 수습'], color:'#3b82f6', always:true },
  { key:'계약직',     cats:['계약직','계약직 수습'], color:'#f59e0b', always:true },
  { key:'일용직',     cats:['일용직'],               color:'#10b981', always:true },
  { key:'대표자',     cats:['대표자'],               color:'#6366f1', always:true },
  { key:'등기임원',   cats:['등기임원'],             color:'#a855f7', always:false },
  { key:'특수관계인', cats:['특수관계인'],           color:'#ec4899', always:false },
];
const _V2_EMP_TYPE_LABELS = ['정규직','정규직 수습','계약직','계약직 수습','일용직'];
const _v2PieCharts = {};   // canvas.id → Chart 인스턴스 (파이 2개: 전월/익월)

/** 지급월 기준 근로계약의 고용형태 라벨 (근로계약이 없으면 null) */
function _v2EmpContractTypeLabel(emp, y, m){
  if(!emp) return null;
  const list = allContracts.filter(c =>
    c.employee_id === emp.id && !c.is_draft && _normContractStatus(c.status) !== CONTRACT_STATUS.VOIDED);
  if(!list.length) return null;

  const ymd = `${y}-${_v2Pad2(m)}-01`;
  const covering = list.filter(c =>
    (!c.contract_start || c.contract_start <= ymd) &&
    (!c.contract_end   || c.contract_end   >= ymd));
  const pick = (covering.length ? covering : list.slice())
    .sort((a,b) => String(b.contract_start||'').localeCompare(String(a.contract_start||'')))[0];
  return CONTRACT_TYPE_LABEL[_normContractType(pick.contract_type)] || null;
}

/** 파이 집계용 고용형태 분류 — 근로계약 우선, 계약이 없을 때만 대표자/등기임원/특수관계인 */
function _v2EmpPayTypeCategory(emp, y, m){
  if(!emp) return null;
  const role = _clientEmpRole(emp);
  if(role === '대표자') return '대표자';   // 대표자는 근로계약 여부와 무관하게 대표자로 표시

  const cLabel = _v2EmpContractTypeLabel(emp, y, m);
  if(_V2_EMP_TYPE_LABELS.includes(cLabel)) return cLabel;

  if(role === '등기임원' || role === '특수관계인') return role;

  const eLabel = CONTRACT_TYPE_LABEL[_normContractType(emp.employment_category)];
  return _V2_EMP_TYPE_LABELS.includes(eLabel) ? eLabel : null;
}

/** 선택 월 실제 지급일 기준 일자별 급여 내역 (날짜 · 지급대상자 · 금액) */
function _v2RenderPaidByDate(pays, ym){
  const box = document.getElementById('ps-daily-list');
  if(!box || !ym) return;

  const periodEl = document.getElementById('ps-daily-period');
  if(periodEl) periodEl.textContent = `${ym.y}년 ${ym.m}월 지급일 기준`;

  if(!pays.length){
    box.innerHTML = '<div class="pb-empty">해당 월 지급 내역이 없습니다</div>';
    return;
  }

  const nameOf = id => {
    const emp = allEmployees.find(e => e.id === id);
    return emp ? (emp.name || '-') : '-';
  };

  const groups = new Map();
  pays.forEach(p => {
    const date = String(p.pay_date || '').slice(0,10) || `${p.pay_year}-${_v2Pad2(p.pay_month)}-00`;
    if(!groups.has(date)) groups.set(date, { amount: 0, names: [] });
    const g = groups.get(date);
    g.amount += (Number(p.gross_pay) || 0) - (Number(p.severance_interim_pay) || 0); // 퇴직금 중간정산 제외(임금 기준)
    g.names.push(nameOf(p.employee_id));
  });

  const won = v => Math.round(Number(v)||0).toLocaleString() + '원';
  const dateText = d => {
    const s = String(d || '');
    const mt = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return mt ? `${mt[1]}.${mt[2]}.${mt[3]}` : s;
  };

  const rows = [...groups.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([date, g]) => {
      const who = g.names.length > 1 ? `${g.names[0]} 외 ${g.names.length - 1}명` : (g.names[0] || '-');
      return `<div class="ps-daily-row">
        <span class="ps-daily-date">${dateText(date)}</span>
        <span class="ps-daily-who">${who}</span>
        <span class="ps-daily-amt">${won(g.amount)}</span>
      </div>`;
    }).join('');

  box.innerHTML = `<div class="ps-daily-head"><span>지급일</span><span>지급대상자</span><span>지급총액</span></div>${rows}`;
}

/** 아코디언 세부항목 색상 팔레트 */
const _V2_PAYMIX_COLORS = ['#2563eb','#0ea5e9','#14b8a6','#22c55e','#84cc16','#eab308','#f97316',
  '#ef4444','#ec4899','#a855f7','#8b5cf6','#64748b','#0f766e','#b45309','#7c3aed'];

/** 고용형태별 임금 비율 파이 — opts.canvasId/legendId 로 대상 컨테이너 지정 */
function _v2RenderPayStatsTypePie(pays, pm, opts){
  const o = opts || {};
  const legendEl = document.getElementById(o.legendId || 'ps-type-legend');
  const canvas   = document.getElementById(o.canvasId || 'ps-type-pie');
  if(!legendEl || !canvas) return;

  const rows = _V2_TYPE_PIE_GROUPS.map(g => ({ key:g.key, color:g.color, always:g.always, gross:0, cnt:0 }));
  const groupIdx = {};
  _V2_TYPE_PIE_GROUPS.forEach((g, i) => g.cats.forEach(c => { groupIdx[c] = i; }));

  pays.forEach(p => {
    const emp = allEmployees.find(e => e.id === p.employee_id);
    const i = groupIdx[_v2EmpPayTypeCategory(emp, Number(p.pay_year), Number(p.pay_month))];
    if(i === undefined) return;
    rows[i].gross += (Number(p.gross_pay)||0) - (Number(p.severance_interim_pay)||0); // 퇴직금 중간정산 제외(임금 기준)
    rows[i].cnt++;
  });

  const items = rows.filter(r => r.always || r.cnt > 0);
  const total = items.reduce((s,r) => s + r.gross, 0);

  const chartKey = canvas.id;
  if(_v2PieCharts[chartKey]){ _v2PieCharts[chartKey].destroy(); delete _v2PieCharts[chartKey]; }

  if(!pays.length){
    canvas.parentElement.style.display = 'none';
    legendEl.innerHTML = `<div class="emp-empty"><i class="fas fa-inbox"></i><div>데이터 없음</div><p>${pm ? `${pm.y}년 ${pm.m}월` : '해당 월'} ${o.emptyText || '급여가 아직 없습니다.'}</p></div>`;
    return;
  }

  const pctOf = r => total > 0 ? (r.gross / total * 100) : 0;

  legendEl.innerHTML = items.map(r => `
    <div class="v2-pie-row${r.cnt ? '' : ' is-zero'}">
      <span class="v2-pie-dot" style="background:${r.color};"></span>
      <span class="v2-pie-name">${r.key}<em>${r.cnt}명</em></span>
      <span class="v2-pie-pct">${pctOf(r).toFixed(1)}%</span>
      <span class="v2-pie-amt">${fmt(r.gross)}원</span>
    </div>`).join('');

  if(total <= 0 || typeof Chart === 'undefined'){
    canvas.parentElement.style.display = 'none';
    return;
  }
  canvas.parentElement.style.display = '';

  const pcts = items.map(pctOf);
  _v2PieCharts[chartKey] = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: items.map(r => r.key),
      datasets: [{
        data: items.map(r => r.gross),
        backgroundColor: items.map(r => r.color),
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => {
              const r = items[c.dataIndex];
              return `${r.key} ${r.cnt}명 · ${fmt(r.gross)}원 (${pcts[c.dataIndex].toFixed(1)}%)`;
            },
          },
        },
      },
    },
    plugins: [{
      id: 'v2PiePct',
      afterDatasetsDraw(chart){
        const { ctx } = chart;
        ctx.save();
        ctx.font = '700 13px system-ui,-apple-system,"Malgun Gothic",sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        chart.getDatasetMeta(0).data.forEach((arc, i) => {
          if((pcts[i] || 0) < 6) return;   // 작은 조각은 라벨이 겹치므로 생략
          const p = arc.tooltipPosition();
          ctx.fillText(`${Math.round(pcts[i])}%`, p.x, p.y);
        });
        ctx.restore();
      },
    }],
  });
}


// ══════════════════════════════════════════════════════════════
// 임금통계 — 상단 4탭 (지급내역 · 임금대장 · 급여명세서 · 지급예정)
// ══════════════════════════════════════════════════════════════
const _V2_PS_TABS = ['paid', 'ledger', 'payslip', 'next'];
let _v2PsTab = 'paid';
let _v2PsTabPicked = false;      // 사용자가 탭을 직접 선택했는지 (월 이동 시 자동 전환 허용 여부)

/** 선택 월의 급여 기준일 (회사 pay_day, 월말 초과 시 월말) */
function _v2PaydayOfMonth(ym){
  const payDay = parseInt(currentCompany?.pay_day, 10);
  if(!(payDay > 0)) return null;
  const lastDay = new Date(ym.y, ym.m, 0).getDate();
  return `${ym.y}-${_v2Pad2(ym.m)}-${_v2Pad2(Math.min(payDay, lastDay))}`;
}

/** 선택 월이 급여 기준일에 도달했는지 (기준일 미설정 시 도달로 간주) */
function _v2IsPaydayReached(ym){
  const payday = _v2PaydayOfMonth(ym || _v2ViewMonth);
  if(!payday) return true;
  return fmtLocalDate(new Date()) >= payday;
}

function setPsTab(tab, silent){
  if(!_V2_PS_TABS.includes(tab)) tab = 'paid';

  // 급여 기준일 전이면 지급 내역이 없으므로 지급예정으로 자동 이동
  let redirected = false;
  if(tab === 'paid' && !_v2IsPaydayReached(_v2ViewMonth)){
    tab = 'next';
    redirected = true;
  }

  _v2PsTab = tab;
  if(!silent && !redirected) _v2PsTabPicked = true;
  document.querySelectorAll('.v2-ps-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _V2_PS_TABS.forEach(t => {
    const p = document.getElementById('ps-panel-' + t);
    if(p) p.classList.toggle('active', t === tab);
  });
  window.scrollTo(0, 0);

  if(tab === 'paid')    { renderV2TrendChart(); _v2ReopenPayAccordions(); }
  if(tab === 'ledger')  { _v2RenderPayStatsLedger(); }
  if(tab === 'payslip') { _v2SyncPsMonthToView(); }
  if(tab === 'next')    { _v2RenderNextMonthTab(); }

  if(redirected && !silent && typeof _clientToast === 'function'){
    _clientToast('급여 기준일 전이라 지급예정으로 이동했습니다.');
  }

  // 숨김 상태에서 생성된 차트는 크기가 0이므로 표시 후 재측정
  _v2ResizeCharts();
  requestAnimationFrame(_v2ResizeCharts);
}

function _v2ResizeCharts(){
  Object.keys(_v2PieCharts).forEach(k => { try { _v2PieCharts[k].resize(); } catch(e){} });
  if(typeof _v2TrendChart !== 'undefined' && _v2TrendChart){ try { _v2TrendChart.resize(); } catch(e){} }
}

/** 회사 전환 시 임금통계 탭/조회월 상태 초기화 */
function _v2ResetPsTab(){
  _v2PsTabPicked = false;
  setPsTab('paid', true);
}

/** 급여명세서 탭: 조회월(본문 월 선택기)로 동기화 */
function _v2SyncPsMonthToView(){
  psYear  = _v2ViewMonth.y || psYear;
  psMonth = _v2ViewMonth.m || psMonth;
  if(typeof renderPayslipList === 'function') renderPayslipList();
}

/** 임금대장 탭 — 조회월 임금대장을 임베드 (해당 월 생성본이 없으면 안내만 표시) */
function _v2RenderPayStatsLedger(){
  const host = document.getElementById('ps-ledger-wrap');
  if(!host || !currentCompany) return;

  const vy = _v2ViewMonth.y;
  const vm = _v2ViewMonth.m;
  const list = (_wlNotifications || []).filter(n => n.file_html_path);

  // 조회월에 정확히 맞는 생성본만 사용 (다른 달 최근 생성본 대체 표시 없음)
  const target = list.find(n => (Number(n.year) || Number(n.pay_year)) === vy
                             && (Number(n.month) || Number(n.pay_month)) === vm);

  if(!target){
    host.innerHTML = `<div class="emp-empty"><i class="fas fa-file-lines"></i><div>임금대장을 생성할 급여데이터가 입력되지 않았습니다.</div></div>`;
    return;
  }

  const y = Number(target.year) || Number(target.pay_year);
  const m = Number(target.month) || Number(target.pay_month);
  const url = `${location.origin}/view-wage-ledger/${currentCompany.id}/${y}/${m}?code=${encodeURIComponent(currentCompany.access_code || '')}`;

  host.innerHTML = `<div class="ps-ledger-card"><iframe class="ps-ledger-frame" src="${url}" title="${y}년 ${m}월 임금대장"></iframe></div>`;

  // 표 높이에 맞춰 카드 높이를 조정(최대 76vh) — 넘치면 카드 안에서 세로 스크롤
  const ifr = host.querySelector('.ps-ledger-frame');
  const fitHeight = () => {
    try{
      const doc = ifr.contentDocument;
      const tbl = doc && doc.querySelector('table.wl-ledger-tbl');
      if(!tbl) return;
      const maxH = Math.round(window.innerHeight * 0.76);
      const h = Math.min(Math.max(Math.ceil(tbl.getBoundingClientRect().height) + 2, 240), maxH);
      ifr.style.height = h + 'px';
    }catch(e){}
  };
  ifr.addEventListener('load', fitHeight);
}

/** 지급예정 탭 — 조회일까지의 근태를 반영한 추정 */
function _v2RenderNextMonthTab(){
  const host = document.getElementById('ps-panel-next');
  if(!host || !currentCompany) return;

  const ym = _v2NextPayrollMonth();
  const period = _v2EstimatePeriod(ym);
  const setT = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  setT('ps-next-period', _v2PeriodLabel(period) + ' 추정');
  setT('ps-next-type-period', `${ym.y}년 ${ym.m}월 추정`);

  _v2LoadAttendanceLedgers()
    .then(() => _v2PaintNextMonth())
    .catch(err => {
      console.error('[익월예상] 근태 조회 실패', err);
      _v2PaintNextMonth();
    });
}

let _v2AttLedgers = null;          // attendance_ledger 캐시
let _v2AttLoadedAt = 0;

function _v2LoadAttendanceLedgers(force){
  if(!force && _v2AttLedgers && Date.now() - _v2AttLoadedAt < 60000) return Promise.resolve(_v2AttLedgers);
  return fetch(`../tables/attendance_ledger?company_id=${encodeURIComponent(currentCompany.id)}&limit=500`)
    .then(r => r.json())
    .then(jd => {
      _v2AttLedgers = jd.data || [];
      _v2AttLoadedAt = Date.now();
      return _v2AttLedgers;
    });
}

/** 조회 월의 지급 정보 — 귀속 월 = 조회 월, 지급일 = 회사 급여 기준일 */
function _v2NextPayrollMonth(){
  const y = _v2ViewMonth.y, m = _v2ViewMonth.m;
  const payDay = parseInt(currentCompany?.pay_day, 10);
  const lastDay = new Date(y, m, 0).getDate();
  const payday = (payDay > 0)
    ? `${y}-${_v2Pad2(m)}-${_v2Pad2(Math.min(payDay, lastDay))}`
    : null;
  return { y, m, payday };
}

/** 근태 반영 구간 — 조회월 1일 ~ min(오늘, 월말). 조회월이 미래면 active=false */
function _v2EstimatePeriod(ym){
  const from = `${ym.y}-${_v2Pad2(ym.m)}-01`;
  const lastDay = new Date(ym.y, ym.m, 0).getDate();
  const monthEnd = `${ym.y}-${_v2Pad2(ym.m)}-${_v2Pad2(lastDay)}`;
  const today = fmtLocalDate(new Date());
  const to = today < monthEnd ? today : monthEnd;
  return { from, to, active: from <= to };
}

/** 익월예상 탭 기간 문구 */
function _v2PeriodLabel(period){
  return period.active
    ? `${period.from.replace(/-/g,'.')} ~ ${period.to.replace(/-/g,'.')} 근태 반영`
    : `산정 기간(${period.from.replace(/-/g,'.')}~) 시작 전 · 근태 미반영`;
}

/** 직원 1명의 익월 예상 급여 */
/** 익월 예상 약정임금 산정 대상 계약 항목 (아코디언 항목 분해와 동일 기준) */
const _V2_EST_FIXED_FIELDS = [
  'base_salary','weekly_holiday_pay','position_allowance','fixed_ot_pay','fixed_night_pay','fixed_hol_pay',
  'meal_allowance','transportation_allowance','research_allowance','communication_allowance',
  'fitness_allowance','self_dev_allowance','book_allowance','overseas_allowance',
];

function _v2EstimateEmployee(emp, ym, period){
  const cat = _v2EmpPayTypeCategory(emp, ym.y, ym.m);
  if(!cat) return null;

  const contract = (allContracts || [])
    .filter(c => c.employee_id === emp.id && !c.is_draft && _normContractStatus(c.status) !== CONTRACT_STATUS.VOIDED)
    .sort((a,b) => String(b.contract_start||'').localeCompare(String(a.contract_start||'')))[0];

  const lastPay = (allPayrolls || [])
    .filter(p => p.employee_id === emp.id)
    .sort((a,b) => ((Number(b.pay_year)||0)*12 + (Number(b.pay_month)||0)) - ((Number(a.pay_year)||0)*12 + (Number(a.pay_month)||0)))[0];

  const isDaily = _normContractType(emp.employment_category) === CONTRACT_TYPE.DAILY;
  const hpd = Number(contract?.work_hours_per_day) || 8;
  const hourly = Number(contract?.hourly_wage)
    || (Number(contract?.monthly_salary_agreed) > 0 ? Math.round(Number(contract.monthly_salary_agreed) / 209) : 0)
    || Number(lastPay?.hourly_wage) || 0;

  // 약정임금 — 상용직: 계약 고정항목 합계 / 일용직: 최근 지급 실적
  let fixed = 0;
  if(isDaily){
    fixed = Number(lastPay?.gross_pay) || 0;
  } else if(contract){
    fixed = _V2_EST_FIXED_FIELDS.reduce((s,k) => s + (Number(contract[k]) || 0), 0);
  }

  // 근태 반영 (일용직은 근무일수 기반이라 시급 조정을 적용하지 않음)
  let overtime = 0, attDed = 0, attItems = [];
  if(!isDaily && period.from && period.to && period.from <= period.to){
    const entries = _v2AttendanceEntries(emp.id, ym.y).filter(e =>
      e.date >= period.from && e.date <= period.to);
    const otHours = entries.filter(e => e.type === 'overtime' && e.otStart && e.otEnd)
      .reduce((s,e) => s + _v2MinutesBetween(e.otStart, e.otEnd), 0) / 60;
    if(hourly > 0) overtime = Math.round(otHours * hourly * 1.5);
    attItems = _v2AttendanceDeductionItemsOf(entries, contract, hourly);
    attDed = attItems.reduce((s, x) => s + x.amount, 0);
  }

  // 4대보험·세금 — 최근 지급 실적 기준 추정
  const ins = {
    pension:     Number(lastPay?.national_pension) || 0,
    health:      Number(lastPay?.health_insurance) || 0,
    ltcare:      Number(lastPay?.long_term_care) || 0,
    employment:  Number(lastPay?.employment_insurance) || 0,
    incomeTax:   Number(lastPay?.income_tax) || 0,
    localTax:    Number(lastPay?.local_income_tax) || 0,
  };

  // 지급 세부내역 아코디언용 행 — 상용직은 계약 고정항목, 일용직은 최근 지급 실적
  const payRow = { employee_id: emp.id };
  if(isDaily && lastPay){
    Object.assign(payRow, lastPay);
  } else if(contract){
    _V2_ACC_FIXED_FIELDS
      .filter(([key]) => _V2_EST_FIXED_FIELDS.includes(key))
      .forEach(([key]) => { payRow[key] = Number(contract[key]) || 0; });
  }
  payRow.overtime_pay = overtime;

  return { empId: emp.id, cat, isDaily, fixed, overtime, attDed, attItems, ins, payRow };
}

/** 근태 엔트리 (연 단위 month_data → 평탄화) */
function _v2AttendanceEntries(empId, year){
  const row = (_v2AttLedgers || []).find(l => l.employee_id === empId && Number(l.year) === Number(year))
    || (_v2AttLedgers || []).find(l => l.employee_id === empId);
  return row ? _v2JsonArr(row.month_data) : [];
}

function _v2MinutesBetween(from, to){
  const [fh, fm] = String(from).split(':').map(Number);
  const [th, tm] = String(to).split(':').map(Number);
  const d = (th * 60 + tm) - (fh * 60 + fm);
  return d > 0 ? d : 0;
}

/** 무급 결근·지각·조퇴 → 유형별 차감 내역 (주말 결근 제외) */
function _v2AttendanceDeductionItemsOf(entries, contract, hourly){
  if(!(Number(hourly) > 0)) return [];
  const hpd = Number(contract?.work_hours_per_day) || 8;
  const sched = contract?.schedule_json || null;
  const map = new Map();
  const add = (type, h, cnt) => {
    const key = _V2_ATT_DEDUCT_LABELS[type] || '기타 근태';
    const cur = map.get(key) || { label: key, hours: 0, count: 0 };
    cur.hours += h;
    cur.count += (cnt == null ? 1 : cnt);
    map.set(key, cur);
  };

  entries.filter(e => e.type === 'absent').forEach(e => {
    if(!_V2_ATT_FULL_DEDUCT.has(e.absentType || 'unauthorized')) return;
    const days = _v2ExpandDates(e.date, e.dateTo)
      .filter(dt => { const dow = new Date(dt + 'T00:00:00').getDay(); return dow !== 0 && dow !== 6; }).length;
    if(days > 0) add(e.absentType || 'unauthorized', days * hpd, days);
  });

  entries.filter(e => e.type === 'late' && e.time).forEach(e => {
    const [h, m] = String(e.time).split(':').map(Number);
    const start = _v2SchedMinute(e.date, sched, 'start', '09:00');
    const arrive = (h || 0) * 60 + (m || 0);
    if(arrive > start) add('late', (arrive - start) / 60);
  });

  entries.filter(e => e.type === 'earlyleave' && e.time).forEach(e => {
    const [h, m] = String(e.time).split(':').map(Number);
    const end = _v2SchedMinute(e.date, sched, 'end', '18:00');
    const leave = (h || 0) * 60 + (m || 0);
    if(leave < end) add('earlyleave', (end - leave) / 60);
  });

  return [...map.values()]
    .map(x => ({ label: x.label, hours: x.hours, count: x.count, amount: Math.round(x.hours * hourly) }))
    .filter(x => x.amount !== 0);
}

function _v2PaintNextMonth(){
  const host = document.getElementById('ps-panel-next');
  if(!host || !currentCompany) return;

  const setT = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  const ym = _v2NextPayrollMonth();
  const period = _v2EstimatePeriod(ym);
  const monthEnd = `${ym.y}-${_v2Pad2(ym.m)}-${_v2Pad2(new Date(ym.y, ym.m, 0).getDate())}`;
  const emps = _clientVisibleEmps().filter(e => _v2EmployedAt(e, monthEnd));
  const ests = emps.map(e => _v2EstimateEmployee(e, ym, period)).filter(Boolean);

  const sum = fn => ests.reduce((s, x) => s + fn(x), 0);
  const fixed    = sum(x => x.fixed);
  const overtime = sum(x => x.overtime);
  const attDed   = sum(x => x.attDed);
  const pension  = sum(x => x.ins.pension);
  const health   = sum(x => x.ins.health);
  const ltcare   = sum(x => x.ins.ltcare);
  const employ   = sum(x => x.ins.employment);
  const incomeTax= sum(x => x.ins.incomeTax);
  const localTax = sum(x => x.ins.localTax);

  const gross = fixed + overtime;
  const ded   = attDed + pension + health + ltcare + employ + incomeTax + localTax;
  const net   = gross - ded;

  const won  = v => `${Math.round(Number(v)||0).toLocaleString('ko-KR')}원`;
  const row  = (label, val) => ({ label, amount: val });

  // ── 요약 카드 (임금통계와 동일 구성) ──
  setT('ps-sum-next-target', ests.length ? `${ests.length}명` : '-');
  setT('ps-sum-next-gross',  gross > 0 ? won(gross) : '-');
  setT('ps-sum-next-ded',    gross > 0 ? won(ded) : '-');
  setT('ps-sum-next-net',    gross > 0 ? won(net) : '-');

  // ── 지급 세부내역 아코디언 (약정임금·추가근로수당·비정기지급수당) ──
  _v2RenderPayAccordions(
    ests.map(x => x.payRow),
    { fixedWage: fixed, extraWork: overtime, irregItems: [] },
    ym, 'psn'
  );

  // ── 공제 세부내역 아코디언 (4대보험·세금·기타 공제·근태에 따른 차감) ──
  const insRows = [
    row('국민연금', pension),
    row('건강보험', health),
    row('장기요양보험', ltcare),
    row('고용보험', employ),
  ].filter(x => x.amount !== 0);
  const taxRows = [
    row('소득세', incomeTax),
    row('지방세', localTax),
  ].filter(x => x.amount !== 0);
  _v2RenderDedCard('insurance', insRows.reduce((s, r) => s + r.amount, 0), insRows, won, 'psn');
  _v2RenderDedCard('tax', taxRows.reduce((s, r) => s + r.amount, 0), taxRows, won, 'psn');
  _v2RenderDedCard('etc', 0, [], won, 'psn');

  const attMap = new Map();
  ests.forEach(x => (x.attItems || []).forEach(it => {
    const cur = attMap.get(it.label) || { label: it.label, hours: 0, count: 0, amount: 0 };
    cur.hours += it.hours;
    cur.count += (it.count || 0);
    cur.amount += it.amount;
    attMap.set(it.label, cur);
  }));
  const attItems = [...attMap.values()].filter(x => Math.round(x.amount) !== 0).sort((a, b) => b.amount - a.amount);
  _v2RenderDedAccordion(attDed, attItems, 'psn');

  // ── 일자별 급여 내역 (예상 지급일 기준 1행) ──
  const paydayLabel = ym.payday ? ym.payday.replace(/-/g, '.')
    : (_v2PaydayOfMonth(ym) || `${ym.y}.${_v2Pad2(ym.m)}.25`).replace(/-/g, '.');
  setT('psn-daily-period', `${ym.y}년 ${ym.m}월 지급 예정일 기준`);
  const dailyList = document.getElementById('psn-daily-list');
  if(dailyList){
    dailyList.innerHTML = gross > 0
      ? `<div class="ps-daily-head"><span>지급일</span><span>지급대상자</span><span>지급총액</span></div>
         <div class="ps-daily-row">
           <span class="ps-daily-date">${paydayLabel}</span>
           <span class="ps-daily-who">${ests.length}명</span>
           <span class="ps-daily-amt">${won(gross)}</span>
         </div>`
      : '<div class="pb-empty">예상 급여 산정 대상자가 없습니다</div>';
  }

  // ── 고용형태별 통계 ──
  _v2RenderPayStatsTypePie(
    ests.filter(x => (x.fixed + x.overtime) > 0)
        .map(x => ({ employee_id: x.empId, gross_pay: x.fixed + x.overtime, pay_year: ym.y, pay_month: ym.m })),
    { y: ym.y, m: ym.m },
    { canvasId: 'ps-next-pie', legendId: 'ps-next-type-legend', emptyText: '예상 급여 산정 대상자가 없습니다.' }
  );
}

/** 임금통계 상단 고정 영역(월 선택기·4탭) — 앱 헤더 바로 아래에 붙이고 좌우를 화면 폭까지 확장
 *  (스크롤되는 카드가 고정 영역 옆으로 새어 보이지 않도록) */
function _v2SyncPsTopbar(){
  const bar = document.getElementById('ps-topbar');
  if(!bar) return;
  const header = document.querySelector('.app-header');
  bar.style.top = Math.round(header ? header.getBoundingClientRect().height : 0) + 'px';

  let bleed = 0;
  const host = bar.parentElement;
  if(host && window.innerWidth < 700){
    const cs = getComputedStyle(host);
    bleed = Math.max(0, Math.round(host.getBoundingClientRect().left + (parseFloat(cs.paddingLeft) || 0)));
  }
  bar.style.marginLeft = bar.style.marginRight = (bleed ? -bleed : 0) + 'px';
  bar.style.paddingLeft = bar.style.paddingRight = bleed + 'px';
}

/** 상단 고정 영역이 헤더에 붙었는지 표시 (붙었을 때만 그림자) */
function _v2SyncPsTopbarStuck(){
  const bar = document.getElementById('ps-topbar');
  if(!bar || !bar.getBoundingClientRect) return;
  const header = document.querySelector('.app-header');
  const top = header ? header.getBoundingClientRect().height : 0;
  bar.classList.toggle('is-stuck', window.scrollY > 0 && bar.getBoundingClientRect().top <= top + 1);
}

(function _v2InitPsTopbarSync(){
  let queued = false;
  const sync = () => { queued = false; _v2SyncPsTopbar(); _v2SyncPsTopbarStuck(); };
  const stuck = () => { queued = false; _v2SyncPsTopbarStuck(); };
  window.addEventListener('resize', () => {
    if(queued) return;
    queued = true;
    requestAnimationFrame(sync);
  });
  window.addEventListener('scroll', () => {
    if(queued) return;
    queued = true;
    requestAnimationFrame(stuck);
  }, { passive: true });
  window.addEventListener('load', sync);
  document.addEventListener('DOMContentLoaded', sync);
})();

function renderClientPayStats(){
  if(!currentCompany) return;

  const ym = _v2ViewMonth;
  const monthPays = allPayrolls.filter(p => Number(p.pay_year) === ym.y && Number(p.pay_month) === ym.m);

  const setT = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };

  // ── 탭 ①: 지급내역 (선택 월) ──
  _v2RenderPayBreakdown(monthPays, ym);
  _v2RenderPayStatsTypePie(monthPays, ym);
  _v2RenderPaidByDate(monthPays, ym);

  // ── 탭 ②: 임금대장 ──
  _v2RenderPayStatsLedger();

  // ── 탭 ③: 급여명세서 (조회월 동기화) ──
  psYear  = _v2ViewMonth.y || psYear;
  psMonth = _v2ViewMonth.m || psMonth;

  // ── 탭 ④: 지급예정 ──
  _v2RenderNextMonthTab();

  // ── 고용형태별 통계 (선택 월, 파이) ──
  setT('ps-type-period', `${ym.y}년 ${ym.m}월 기준`);

  // ── 12개월 추이 (선택 월까지) ──
  const months = [];
  for(let i = 11; i >= 0; i--){
    let m = ym.m - i, y = ym.y;
    while(m < 1){ m += 12; y--; } while(m > 12){ m -= 12; y++; }
    months.push({ y, m });
  }
  setT('ps-trend-period', `${months[0].y}.${_v2Pad2(months[0].m)} ~ ${months[11].y}.${_v2Pad2(months[11].m)}`);

  _v2RenderTrendTabs();

  requestAnimationFrame(() => renderV2TrendChart());

  // 급여 기준일 전이면 지급내역 대신 지급예정으로 자동 이동
  // (사용자가 탭을 직접 고르지 않은 상태에서 기준일이 지난 월로 오면 지급내역으로 복귀)
  if(_v2PsTab === 'next' && !_v2PsTabPicked && _v2IsPaydayReached(ym)) setPsTab('paid', true);
  else if(_v2PsTab === 'paid' && !_v2IsPaydayReached(ym)) setPsTab('next', true);

  // 사용료 스위치
  const bbRow = document.getElementById('ps-billing-row');
  if(bbRow) bbRow.style.display = _billingFeatureEnabled ? '' : 'none';

  // 상단 고정 영역(월 선택기·4탭) 위치 동기화
  _v2SyncPsTopbar();
}

/** 직전월 항목별 비율 모달 (기존 pay-ratio 모달 재사용) */
function openPayStatsRatio(){
  const pm = _v2PrevMonthOf(_v2ViewMonth);
  statsYear = pm.y; statsMonth = pm.m;
  if(typeof openPayRatioModal === 'function') openPayRatioModal();
}

/** 부정기지급 항목 정의 — 어드민 급여 목록(payroll-core.js)과 동일한 정의 */
const _V2_IRREG_FIELDS = [
  ['annual_leave_pay',      '연차수당'],
  ['bonus_pay',             '상여'],
  ['performance_pay',       '성과급'],
  ['communication_pay',     '통신비'],
  ['fitness_allowance',     '피트니스'],
  ['self_dev_allowance',    '자기개발비'],
  ['book_allowance',        '도서구입비'],
  ['overseas_allowance',    '해외근무수당'],
  ['etc_allowance',         '기타수당'],
  ['other_pay',             '기타 지급'],
];

function _v2JsonItems(v){
  try{
    const arr = typeof v === 'string' ? JSON.parse(v) : (v || []);
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}

/** 부정기지급 합계 — 어드민 급여 목록과 동일한 정의
 *  연차수당 + 상여 + 성과급 + 통신비 + 피트니스 + 자기개발 + 도서 + 해외 + 퇴직금중간정산 + 기타수당
 *  + 사용자정의 고정수당(custom_fixed_values) + 기타수당 항목(etc_allowance_items) */
function _v2IrregularPay(p){
  if(!p) return 0;
  let sum = 0;
  _V2_IRREG_FIELDS.forEach(([key]) => { sum += Number(p[key]) || 0; });
  _v2JsonItems(p.custom_fixed_values).forEach(x => { sum += Number(x && x.amount) || 0; });
  _v2JsonItems(p.etc_allowance_items).forEach(x => { sum += Number(x && x.amount) || 0; });
  return sum;
}

/** 부정기지급 항목별 집계 (정의된 순서 유지, 0원 제외) */
function _v2IrregularBreakdown(pays){
  const map = new Map();
  const add = (label, amt) => {
    if(!amt) return;
    map.set(label, (map.get(label) || 0) + amt);
  };
  (pays || []).forEach(p => {
    _V2_IRREG_FIELDS.forEach(([key, label]) => add(label, Number(p[key]) || 0));
    _v2JsonItems(p.custom_fixed_values).forEach(x => {
      add(String((x && x.name) || '기타 고정수당').trim() || '기타 고정수당', Number(x && x.amount) || 0);
    });
    _v2JsonItems(p.etc_allowance_items).forEach(x => {
      add(String((x && x.name) || '기타수당').trim() || '기타수당', Number(x && x.amount) || 0);
    });
  });
  const order = _V2_IRREG_FIELDS.map(([, label]) => label);
  return [...map.entries()]
    .sort((a, b) => {
      const ia = order.indexOf(a[0]), ib = order.indexOf(b[0]);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    })
    .map(([label, amount]) => ({ label, amount }));
}

/** 12개월 추이 항목 탭 (단일 선택) */
function _v2RenderTrendTabs(){
  const el = document.getElementById('paystats-toggles');
  if(!el) return;
  el.innerHTML = (TREND_ITEMS || []).map(t => {
    const on = t.key === _v2TrendKey;
    const style = on
      ? `background:${t.color};border-color:${t.color};color:#fff;`
      : `background:#fff;border-color:#e2e8f0;color:${t.textColor};`;
    return `<button type="button" class="ps-trend-tab${on ? ' active' : ''}" data-key="${t.key}"
      style="${style}" onclick="_v2SetTrendKey('${t.key}')">${t.label}</button>`;
  }).join('');
}

function _v2SetTrendKey(key){
  _v2TrendKey = key;
  _v2RenderTrendTabs();
  renderV2TrendChart();
}

function renderV2TrendChart(){
  const end = _v2ViewMonth;
  const months = [];
  for(let i = 11; i >= 0; i--){
    let m = end.m - i, y = end.y;
    while(m < 1){ m += 12; y--; } while(m > 12){ m -= 12; y++; }
    months.push({ y, m });
  }
  const labels = months.map(({y,m}) => `${y}.${_v2Pad2(m)}`);
  const agg = months.map(({y,m}) => {
    const ps = allPayrolls.filter(p => Number(p.pay_year)===y && Number(p.pay_month)===m);
    const gross = ps.reduce((a,p)=>a+(Number(p.gross_pay)||0),0);
    const net   = ps.reduce((a,p)=>a+(Number(p.net_pay)||0),0);
    return {
      gross, net,
      ded:   gross - net,
      extra: ps.reduce((a,p)=>a+(Number(p.overtime_pay)||0)+(Number(p.night_pay)||0)+(Number(p.holiday_pay)||0),0),
      irreg: ps.reduce((a,p)=>a+_v2IrregularPay(p),0),
      tax:   ps.reduce((a,p)=>a+(Number(p.income_tax)||0)+(Number(p.local_income_tax)||0),0),
      ins:   ps.reduce((a,p)=>a+(Number(p.health_insurance)||0)+(Number(p.long_term_care)||0)+(Number(p.national_pension)||0)+(Number(p.employment_insurance)||0),0),
      // 정산: 국민연금 소급분 + 연말정산 + 건강보험 정산 + 건강보험 연말정산분 + 장기요양보험 정산 + 장기요양 연말정산분 + 고용보험 정산
      settle: ps.reduce((a,p)=>a+(Number(p.national_pension_retro)||0)+(Number(p.year_end_tax_adjust)||0)
        +(Number(p.health_insurance_adjust)||0)+(Number(p.health_insurance_adjust_yearend)||0)
        +(Number(p.ltcare_adjust)||0)+(Number(p.ltcare_adjust_yearend)||0)
        +(Number(p.employment_insurance_adjust)||0),0),
    };
  });

  const datasets = (TREND_ITEMS || []).filter(t => t.key === _v2TrendKey).map(t => ({
    label: t.label,
    data: agg.map(a => a[t.key]),
    borderColor: t.color,
    backgroundColor: t.color + '18',
    borderWidth: 2.5,
    borderDash: t.dash || [],
    pointRadius: 4,
    pointHoverRadius: 7,
    pointStyle: t.pointStyle || 'circle',
    pointBackgroundColor: '#fff',
    pointBorderColor: t.color,
    pointBorderWidth: 2,
    fill: true,
    tension: .35,
  }));

  // 그래프 하단 월별 금액 표 (최근월 → 과거월)
  const tableEl = document.getElementById('ps-trend-table');
  if(tableEl){
    const won = v => Math.round(Number(v) || 0).toLocaleString() + '원';
    tableEl.innerHTML = months.map((mo, i) => ({ label: labels[i], val: agg[i][_v2TrendKey] }))
      .reverse()
      .map(r => `<div class="ps-trend-trow"><span class="ps-trend-month">${r.label}</span><span class="ps-trend-amt">${won(r.val)}</span></div>`)
      .join('');
  }

  const ctx = document.getElementById('paystats-trend-chart');
  if(!ctx) return;
  if(_v2TrendChart){
    _v2TrendChart.data.labels = labels;
    _v2TrendChart.data.datasets = datasets;
    _v2TrendChart.update('none');
    return;
  }
  _v2TrendChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { titleFont: { size: 13 }, bodyFont: { size: 14 }, callbacks: {
          title: items => `📅 ${items[0].label}`,
          label: c => ` ${c.dataset.label}: ${Math.round(c.parsed.y).toLocaleString('ko-KR')}원`
        } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, maxRotation: 0, color: '#6b7280' } },
        y: { grid: { color: 'rgba(0,0,0,.05)' }, beginAtZero: true, ticks: { font: { size: 11, weight: '600' }, color: '#6b7280', callback: v => (v>=1000000 ? (v/10000).toFixed(0)+'만' : v.toLocaleString()) } }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
// ④ 일용직 4대보험 신고 (어드민 등록 내역 조회 — 어드민 기능 준비 중)
// ══════════════════════════════════════════════════════════════
function openDailyInsurance(empId){
  _v2DailyInsEmpId = empId;
  showPage('daily-insurance', null);
}

function renderClientDailyInsurance(){
  const box = document.getElementById('daily-insurance-content');
  if(!box) return;
  const emp = allEmployees.find(e => e.id === _v2DailyInsEmpId);
  box.innerHTML = `
    <div class="di-empty">
      <i class="fas fa-shield-alt"></i>
      <div class="di-title">등록된 4대보험 신고 내역이 없습니다</div>
      <div class="di-sub">일용직 근로자의 고용·산재보험 신고 내역은 어드민에서 등록되면<br>이 화면에서 조회할 수 있습니다. (어드민 기능 준비 중)</div>
      ${emp ? `<div class="di-worker"><i class="fas fa-user"></i>${emp.name||'-'} · ${contractTypeLabel_c(emp.employment_category)}</div>` : ''}
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// ⑤ 서비스 이용약관 · 개인정보처리방침 (기본 표준 문안)
// ══════════════════════════════════════════════════════════════
/** 법률 문서 계층 들여쓰기용 클래스 부여 (①②③ → 1단계, a./b. → 2단계) */
function _legalFormat(html){
  return html
    .replace(/<p>(①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/g, '<p class="legal-lv1">$1')
    .replace(/<p>(a|b|c|d|e)\. /g, '<p class="legal-lv2">$1. ');
}

/** 서비스 이용약관 본문 HTML (공용) */
function _legalTermsHTML(){
  return `
    <div class="legal-card">
      <div class="legal-title">쇼핑몰 이용약관</div>
      <div class="legal-date">대화인사노무파트너스</div>

      <h3>제1조 (목적)</h3>
      <p>이 약관은 대화인사노무파트너스(전자상거래 사업자)이 운영하는 인터넷 쇼핑몰(이하 “몰”이라 한다)에서 제공하는 인터넷 관련 서비스(이하 “서비스”라 한다)를 이용함에 있어 몰과 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>

      <h3>제2조 (정의)</h3>
      <p>① “몰”이란 대화인사노무파트너스가 재화 또는 용역(이하 “재화 등”)을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 등을 거래할 수 있도록 설정한 가상의 영업장을 말하며, 아울러 사이버몰을 운영하는 사업자의 의미로도 사용합니다.</p>
      <p>② “이용자”란 “몰”에 접속하여 이 약관에 따라 “몰”이 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</p>
      <p>③ “회원”이란 “몰”에 회원등록을 한 자로서, 계속적으로 “몰”이 제공하는 서비스를 이용할 수 있는 자를 말합니다.</p>
      <p>④ “비회원”이란 회원에 가입하지 않고 “몰”이 제공하는 서비스를 이용하는 자를 말합니다.</p>

      <h3>제3조 (약관 등의 명시와 설명 및 개정)</h3>
      <p>① “몰”은 이 약관의 내용과 상호 및 대표자 성명, 영업소 소재지 주소(소비자의 불만을 처리할 수 있는 곳의 주소를 포함), 전화번호·모사전송번호·전자우편주소, 사업자등록번호, 통신판매업 신고번호, 개인정보관리책임자 등을 이용자가 쉽게 알 수 있도록 사이버몰의 초기 서비스화면(전면)에 게시합니다.</p>
      <p>② “몰”은 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」 등 관련 법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
      <p>③ “몰”이 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 몰의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</p>
      <p>④ 이 약관에서 정하지 아니한 사항과 이 약관의 해석에 관하여는 전자상거래 등에서의 소비자보호에 관한 법률, 약관의 규제에 관한 법률, 공정거래위원회가 정하는 전자상거래 등에서의 소비자 보호지침 및 관계법령 또는 상관례에 따릅니다.</p>

      <h3>제4조 (서비스의 제공 및 변경)</h3>
      <p>① “몰”은 다음과 같은 업무를 수행합니다.</p>
      <ol>
        <li>재화 또는 용역에 대한 정보 제공 및 구매계약의 체결</li>
        <li>구매계약이 체결된 재화 또는 용역의 배송</li>
        <li>기타 “몰”이 정하는 업무</li>
      </ol>
      <p>② “몰”은 재화 또는 용역의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 재화 또는 용역의 내용을 변경할 수 있습니다.</p>

      <h3>제5조 (서비스의 중단)</h3>
      <p>① “몰”은 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
      <p>② “몰”은 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여 이용자 또는 제3자가 입은 손해에 대하여 배상합니다. 단, “몰”이 고의 또는 과실이 없음을 입증하는 경우에는 그러하지 아니합니다.</p>

      <h3>제6조 (회원가입)</h3>
      <p>① 이용자는 “몰”이 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.</p>
      <p>② “몰”은 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.</p>
      <ol>
        <li>가입신청자가 이 약관 제7조 제3항에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
        <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
        <li>기타 회원으로 등록하는 것이 “몰”의 기술상 현저히 지장이 있다고 판단되는 경우</li>
      </ol>

      <h3>제7조 (회원 탈퇴 및 자격 상실 등)</h3>
      <p>① 회원은 “몰”에 언제든지 탈퇴를 요청할 수 있으며 “몰”은 즉시 회원탈퇴를 처리합니다.</p>
      <p>② 회원이 다음 각 호의 사유에 해당하는 경우, “몰”은 회원자격을 제한 및 정지시킬 수 있습니다.</p>
      <ol>
        <li>가입 신청 시에 허위 내용을 등록한 경우</li>
        <li>“몰”을 이용하여 구입한 재화 등의 대금, 기타 “몰” 이용에 관련하여 회원이 부담하는 채무를 기일에 지급하지 않는 경우</li>
        <li>다른 사람의 “몰” 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
        <li>“몰”을 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
      </ol>

      <h3>제8조 (회원에 대한 통지)</h3>
      <p>① “몰”이 회원에 대한 통지를 하는 경우, 회원이 “몰”과 미리 약정하여 지정한 전자우편 주소로 할 수 있습니다.</p>
      <p>② “몰”은 불특정다수 회원에 대한 통지의 경우 1주일 이상 “몰” 게시판에 게시함으로서 개별 통지에 갈음할 수 있습니다.</p>

      <h3>제9조 (구매신청 및 개인정보 제공 동의 등)</h3>
      <p>① “몰” 이용자는 “몰” 상에서 다음 또는 이와 유사한 방법에 의하여 구매를 신청하며, “몰”은 이용자가 구매신청을 함에 있어서 다음의 각 내용을 알기 쉽게 제공하여야 합니다.</p>
      <ol>
        <li>재화 등의 검색 및 선택</li>
        <li>받는 사람의 성명, 주소, 전화번호, 전자우편주소(또는 이동전화번호) 등의 입력</li>
        <li>약관내용, 청약철회권이 제한되는 서비스, 배송료·설치비 등의 비용부담과 관련한 내용에 대한 확인</li>
        <li>이 약관에 동의하고 위 3.호의 사항을 확인하거나 거부하는 표시</li>
        <li>재화 등의 구매신청 및 이에 관한 확인 또는 “몰”의 확인에 대한 동의</li>
        <li>결제방법의 선택</li>
      </ol>

      <h3>제10조 (계약의 성립)</h3>
      <p>① “몰”은 제9조와 같은 구매신청에 대하여 다음 각 호에 해당하면 승낙하지 않을 수 있습니다.</p>
      <ol>
        <li>신청 내용에 허위, 기재누락, 오기가 있는 경우</li>
        <li>미성년자가 담배, 주류 등 청소년보호법에서 금지하는 재화 및 용역을 구매하는 경우</li>
        <li>기타 구매신청에 승낙하는 것이 “몰” 기술상 현저히 지장이 있다고 판단하는 경우</li>
      </ol>
      <p>② “몰”의 승낙이 제12조 제1항의 수신확인통지형태로 이용자에게 도달한 시점에 계약이 성립한 것으로 봅니다.</p>

      <h3>제11조 (지급방법)</h3>
      <p>“몰”에서 구매한 재화 또는 용역에 대한 대금지급방법은 다음 각 호의 방법 중 가용한 방법으로 할 수 있습니다.</p>
      <ol>
        <li>폰뱅킹, 인터넷뱅킹, 메일 뱅킹 등의 각종 계좌이체</li>
        <li>선불카드, 직불카드, 신용카드 등의 각종 카드 결제</li>
        <li>온라인무통장입금</li>
        <li>전자화폐에 의한 결제</li>
        <li>수령 시 대금지급</li>
        <li>마일리지 등 “몰”이 지급한 포인트에 의한 결제</li>
        <li>“몰”과 계약을 맺었거나 “몰”이 인정한 상품권에 의한 결제</li>
        <li>기타 전자적 지급 방법에 의한 대금 지급 등</li>
      </ol>

      <h3>제12조 (수신확인통지·구매신청 변경 및 취소)</h3>
      <p>① “몰”은 이용자의 구매신청이 있는 경우 이용자에게 수신확인통지를 합니다.</p>
      <p>② 수신확인통지를 받은 이용자는 의사표시의 불일치 등이 있는 경우에는 수신확인통지를 받은 후 즉시 구매신청 변경 및 취소를 요청할 수 있고 “몰”은 배송 전에 이용자의 요청이 있는 경우에는 지체 없이 그 요청에 따라 처리하여야 합니다.</p>

      <h3>제13조 (재화 등의 공급)</h3>
      <p>① “몰”은 이용자와 재화 등의 공급시기에 관하여 별도의 약정이 없는 이상, 이용자가 청약을 한 날부터 7일 이내에 재화 등을 배송할 수 있도록 주문제작, 포장 등 기타의 필요한 조치를 취합니다.</p>
      <p>② “몰”은 이용자가 구매한 재화에 대해 배송수단, 수단별 배송비용 부담자, 수단별 배송기간 등을 명시합니다.</p>

      <h3>제14조 (환급)</h3>
      <p>“몰”은 이용자가 구매신청한 재화 등이 품절 등의 사유로 인도 또는 제공을 할 수 없을 때에는 지체 없이 그 사유를 이용자에게 통지하고 사전에 재화 등의 대금을 받은 경우에는 대금을 받은 날부터 3영업일 이내에 환급하거나 환급에 필요한 조치를 취합니다.</p>

      <h3>제15조 (청약철회 등)</h3>
      <p>① “몰”과 재화 등의 구매에 관한 계약을 체결한 이용자는 「전자상거래 등에서의 소비자보호에 관한 법률」 제13조 제2항에 따른 계약내용에 관한 서면을 받은 날(그 서면을 받은 때보다 재화 등의 공급이 늦게 이루어진 경우에는 재화 등을 공급받거나 재화 등의 공급이 시작된 날을 말합니다)부터 7일 이내에는 청약의 철회를 할 수 있습니다.</p>
      <p>② 이용자는 재화 등을 배송 받은 경우 다음 각 호의 1에 해당하는 경우에는 반품 및 교환을 할 수 없습니다.</p>
      <ol>
        <li>이용자에게 책임 있는 사유로 재화 등이 멸실 또는 훼손된 경우</li>
        <li>이용자의 사용 또는 일부 소비에 의하여 재화 등의 가치가 현저히 감소한 경우</li>
        <li>시간의 경과에 의하여 재판매가 곤란할 정도로 재화 등의 가치가 현저히 감소한 경우</li>
        <li>같은 성능을 지닌 재화 등으로 복제가 가능한 경우 그 원본인 재화 등의 포장을 훼손한 경우</li>
      </ol>
      <p>③ 제2항 제2호 내지 제4호의 경우에 “몰”이 사전에 청약철회 등이 제한되는 사실을 소비자가 쉽게 알 수 있는 곳에 명기하거나 시용상품을 제공하는 등의 조치를 하지 않았다면 이용자의 청약철회 등이 제한되지 않습니다.</p>

      <h3>제16조 (청약철회 등의 효과)</h3>
      <p>① “몰”은 이용자로부터 재화 등을 반환 받은 경우 3영업일 이내에 이미 지급받은 재화 등의 대금을 환급합니다.</p>
      <p>② “몰”은 위 대금을 환급함에 있어서 이용자가 신용카드 또는 전자화폐 등의 결제수단으로 재화 등의 대금을 지급한 때에는 지체 없이 당해 결제수단을 제공한 사업자로 하여금 재화 등의 대금의 청구를 정지 또는 취소하도록 요청합니다.</p>

      <h3>제17조 (개인정보보호)</h3>
      <p>“몰”은 이용자의 개인정보 수집 시 서비스 제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다. (자세한 내용은 별도의 「개인정보 처리방침」을 따릅니다.)</p>

      <h3>제18조 (몰의 의무)</h3>
      <p>① “몰”은 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 이 약관이 정하는 바에 따라 지속적이고, 안정적으로 재화·용역을 제공하는데 최선을 다하여야 합니다.</p>
      <p>② “몰”은 이용자가 안전하게 인터넷 서비스를 이용할 수 있도록 이용자의 개인정보(신용정보 포함)보호를 위한 보안 시스템을 갖추어야 합니다.</p>

      <h3>제19조 (회원의 ID 및 비밀번호에 대한 의무)</h3>
      <p>① 제17조의 경우를 제외한 ID와 비밀번호에 관한 관리책임은 회원에게 있습니다.</p>
      <p>② 회원은 자신의 ID 및 비밀번호를 제3자에게 이용하게 해서는 안 됩니다.</p>
      <p>③ 회원이 자신의 ID 및 비밀번호를 도난당하거나 제3자가 사용하고 있음을 인지한 경우에는 바로 “몰”에 통보하고 “몰”의 안내가 있는 경우에는 그에 따라야 합니다.</p>

      <h3>제20조 (이용자의 의무)</h3>
      <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
      <ol>
        <li>신청 또는 변경 시 허위 내용의 등록</li>
        <li>타인의 정보 도용</li>
        <li>“몰”에 게시된 정보의 변경</li>
        <li>“몰”이 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
        <li>“몰” 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
        <li>“몰” 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
        <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 몰에 공개 또는 게시하는 행위</li>
      </ol>

      <h3>제21조 (저작권의 귀속 및 이용제한)</h3>
      <p>① “몰”이 작성한 저작물에 대한 저작권 기타 지적재산권은 “몰”에 귀속합니다.</p>
      <p>② 이용자는 “몰”을 이용함으로써 얻은 정보 중 “몰”에게 지적재산권이 귀속된 정보를 “몰”의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.</p>

      <h3>제22조 (분쟁해결)</h3>
      <p>① “몰”은 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.</p>
      <p>② “몰”은 이용자로부터 제출되는 불만사항 및 의견은 우선적으로 그 사항을 처리합니다.</p>
      <p>③ “몰”과 이용자 간에 발생한 전자상거래 분쟁과 관련하여 이용자의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.</p>

      <h3>제23조 (재판권 및 준거법)</h3>
      <p>① “몰”과 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다.</p>
      <p>② “몰”과 이용자 간에 제기된 전자상거래 소송에는 한국법을 적용합니다.</p>

      <h3>부칙</h3>
      <p>이 약관은 2026년 12월 01일부터 시행합니다.</p>
      <div class="legal-date">시행일: 2026년 12월 1일</div>
    </div>`;
}

/** 개인정보처리방침 본문 HTML (공용) */function _legalPrivacyHTML(){
  return `
    <div class="legal-card">
      <div class="legal-title">개인정보처리방침</div>
      <div class="legal-date">대화인사노무파트너스(이하 ‘회사’)는 개인정보 보호법 등 관련 법령에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.</div>

      <h3>1. 개인정보의 처리 목적</h3>
      <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
      <p>처리한 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
      <ol>
        <li>회원 가입 및 관리</li>
        <li>서비스 제공 및 계약 이행</li>
        <li>고객 문의 응대 및 민원 처리</li>
        <li>(선택) 마케팅 및 광고 활용 (동의 시에만)</li>
      </ol>

      <h3>2. 처리하는 개인정보 항목</h3>
      <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
      <table>
        <thead><tr><th>구분</th><th>수집항목</th><th>수집방법</th></tr></thead>
        <tbody>
          <tr><td>필수</td><td>이름, 휴대전화번호, 이메일, 아이디, 비밀번호</td><td>회원가입, 서비스 이용</td></tr>
          <tr><td>선택</td><td>생년월일, 성별, 주소</td><td>회원가입 시 선택 입력</td></tr>
          <tr><td>자동 수집</td><td>IP주소, 쿠키, 서비스 이용기록, 접속 로그</td><td>서비스 이용 과정에서 자동 생성</td></tr>
        </tbody>
      </table>

      <h3>3. 개인정보의 처리 및 보유 기간</h3>
      <p>① 회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</p>
      <p>② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.</p>
      <table>
        <thead><tr><th>구분</th><th>수집항목</th><th>기타</th></tr></thead>
        <tbody>
          <tr><td>회원가입 및 관리</td><td>회원 탈퇴 시까지</td><td>관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지</td></tr>
          <tr><td>서비스 제공</td><td>서비스 공급 완료 및 요금 결제·정산 완료 시까지</td><td></td></tr>
          <tr><td>관련 법령에 따른 보존</td><td>계약 또는 청약철회 등에 관한 기록 : 5년</td><td>전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령에서 정한 기간</td></tr>
          <tr><td></td><td>대금결제 및 재화 등의 공급에 관한 기록 : 5년</td><td></td></tr>
          <tr><td></td><td>소비자의 불만 또는 분쟁처리에 관한 기록 : 3년</td><td></td></tr>
        </tbody>
      </table>

      <h3>4. 개인정보의 제3자 제공 (해당 시에만)</h3>
      <p>회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</p>
      <table>
        <thead><tr><th>구분</th><th>수집항목</th><th>기타</th></tr></thead>
        <tbody>
          <tr><td>제공받는 자</td><td>카카오</td><td></td></tr>
          <tr><td>제공 목적</td><td>문자메시지 발송</td><td></td></tr>
          <tr><td>제공 항목</td><td>이름, 연락처, 생년월일</td><td></td></tr>
          <tr><td>보유 및 이용 기간</td><td>3년</td><td>근로기준법</td></tr>
        </tbody>
      </table>

      <h3>5. 개인정보 처리의 위탁 (해당 시에만)</h3>
      <p>회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
      <table>
        <thead><tr><th>구분</th><th>위탁업무내용</th><th>위탁기간</th></tr></thead>
        <tbody>
          <tr><td>**호스팅</td><td>서버 운영 및 관리</td><td>위탁 계약 종료 시까지</td></tr>
          <tr><td>**결재</td><td>결제 대행</td><td>위탁 계약 종료 시까지</td></tr>
        </tbody>
      </table>

      <h3>6. 개인정보의 파기 절차 및 방법</h3>
      <p>① 회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
      <p>② 파기 절차 및 방법은 다음과 같습니다.</p>
      <p>a. 파기 절차 : 불필요한 개인정보 및 개인정보파일은 개인정보 보호책임자의 책임 하에 내부 방침에 따라 파기합니다.</p>
      <p>b. 파기 방법 : 전자적 파일 형태는 기록을 재생할 수 없는 기술적 방법을 사용하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각합니다.</p>

      <h3>7. 정보주체와 법정대리인의 권리·의무 및 행사방법</h3>
      <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
      <ol>
        <li>개인정보 열람 요구</li>
        <li>오류 등이 있을 경우 정정 요구</li>
        <li>삭제 요구</li>
        <li>처리정지 요구</li>
      </ol>
      <p>권리 행사는 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.</p>

      <h3>8. 개인정보 보호책임자</h3>
      <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
      <table>
        <thead><tr><th>구분</th><th>성명</th><th>직책</th><th>연락처</th></tr></thead>
        <tbody>
          <tr><td>개인정보보호책임자</td><td>김 영진</td><td>대표이사</td><td>02-3487-8841, labourlawyer@naver.com</td></tr>
        </tbody>
      </table>

      <h3>9. 개인정보의 안전성 확보조치</h3>
      <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
      <ol>
        <li>관리적 조치 : 내부관리계획 수립·시행, 정기적 직원 교육</li>
        <li>기술적 조치 : 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
        <li>물리적 조치 : 전산실, 자료보관실 등의 접근통제</li>
      </ol>

      <h3>10. 개인정보 처리방침의 변경</h3>
      <p>이 개인정보 처리방침은 2026년 12월 01일부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
    </div>`;
}

/** 법률 문서 레이어 팝업 열기 ('terms' | 'privacy') */
function openLegalModal(type, e){
  if(e) e.preventDefault();
  const isTerms = type === 'terms';
  const title = document.getElementById('legal-overlay-title');
  if(title) title.innerHTML = isTerms
    ? '<i class="fas fa-file-contract"></i>서비스 이용약관'
    : '<i class="fas fa-shield-alt"></i>개인정보처리방침';
  const box = document.getElementById('legal-overlay-content');
  if(box){
    box.innerHTML = _legalFormat(isTerms ? _legalTermsHTML() : _legalPrivacyHTML());
    box.scrollTop = 0;
  }
  document.getElementById('legal-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/** 법률 문서 레이어 팝업 닫기 */
function closeLegalModal(){
  document.getElementById('legal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ESC 키로 닫기
document.addEventListener('keydown', ev => {
  if(ev.key === 'Escape') closeLegalModal();
});

// ══════════════════════════════════════════════════════════════
// ⑥ 초기화
// ══════════════════════════════════════════════════════════════
function initClientV2(){
  // 로그인 시 조회 상태 초기화 (기본: 오늘/이번 달, 전체 카테고리)
  const now = new Date();
  _v2ViewDate  = fmtLocalDate(now);
  _v2ViewMonth = { y: now.getFullYear(), m: now.getMonth() + 1 };
  _v2EmpFilter = 'all';
  _v2EmpSearch = '';
  const searchInput = document.getElementById('emp-search-input');
  if(searchInput) searchInput.value = '';
  const clr = document.getElementById('emp-search-clear');
  if(clr) clr.style.visibility = 'hidden';

  showPage('paystats', document.getElementById('nav-paystats'));
  if(typeof _updateWageLedgerButton === 'function') _updateWageLedgerButton();
}
