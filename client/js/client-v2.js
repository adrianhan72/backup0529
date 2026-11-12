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
let _v2ViewDate    = fmtLocalDate(new Date()); // 조회 시점 (기본: 오늘)
let _v2EmpFilter   = 'all';                     // 임직원 현황 카테고리 필터
let _v2EmpSearch   = '';                        // 이름 검색어
let _v2DailyInsEmpId = '';                      // 일용직 4대보험 신고 조회 대상
let _v2TrendChart  = null;                      // 급여통계 12개월 추이 차트
const _v2TrendOn = {};
(TREND_ITEMS || []).forEach(t => { _v2TrendOn[t.key] = t.def !== false; });

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

function _configHeaderDate(page){
  const row = document.getElementById('header-date-row');
  if(!row) return;
  row.classList.remove('hidden');
  const label = document.getElementById('hd-date-label');
  if(label) label.textContent = _v2FormatDateLabel(_v2ViewDate);
  const input = document.getElementById('hd-date-input');
  if(input) input.value = _v2ViewDate;

  // 이전/다음/오늘 버튼 리스너 재등록 (중복 방지 cloneNode)
  ['hd-prev-btn','hd-next-btn','hd-today-btn'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });
  document.getElementById('hd-prev-btn').addEventListener('click', () => _v2ShiftViewDate(-1));
  document.getElementById('hd-next-btn').addEventListener('click', () => _v2ShiftViewDate(1));
  document.getElementById('hd-today-btn').addEventListener('click', () => _v2SetViewDate(fmtLocalDate(new Date())));
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
  if(id === 'page-paystats')  renderClientPayStats();
}

function openDatePicker(){
  const input = document.getElementById('hd-date-input');
  if(!input) return;
  try { if(typeof input.showPicker === 'function') input.showPicker(); else input.click(); }
  catch(e){ try{ input.click(); }catch(_){} }
}
function setViewDateFromInput(v){ if(v) _v2SetViewDate(v); }
function resetViewDate(){ _v2SetViewDate(fmtLocalDate(new Date())); }

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

/** 근태(무급 결근·지각·조퇴)에 따른 고정임금 차감액 */
function _v2AttendanceDeduction(p, contract){
  const hourly = Number(p.hourly_wage) || 0;
  if(hourly <= 0) return 0;
  const hpd = Number(contract?.work_hours_per_day) || 8;
  let hours = 0;

  // 무급 결근 (주말 제외 — 휴일수당에서 별도 처리)
  _v2JsonArr(p.absent_data).concat(_v2JsonArr(p.retro_absent_data)).forEach(d => {
    if(!_V2_ATT_FULL_DEDUCT.has(d.type || 'unauthorized')) return;
    _v2ExpandDates(d.date, d.dateTo)
      .filter(dt => { const dow = new Date(dt + 'T00:00:00').getDay(); return dow !== 0 && dow !== 6; })
      .forEach(() => { hours += hpd; });
  });

  const sched = contract?.schedule_json || null;
  _v2JsonArr(p.late_data).concat(_v2JsonArr(p.retro_late_data)).forEach(d => {
    if(!d.time) return;
    const [h, m] = d.time.split(':').map(Number);
    const arrive = (h || 0) * 60 + (m || 0);
    const start = _v2SchedMinute(d.date, sched, 'start', '09:00');
    if(arrive > start) hours += (arrive - start) / 60;
  });
  _v2JsonArr(p.earlyleave_data).concat(_v2JsonArr(p.retro_earlyleave_data)).forEach(d => {
    if(!d.time) return;
    const [h, m] = d.time.split(':').map(Number);
    const leave = (h || 0) * 60 + (m || 0);
    const end = _v2SchedMinute(d.date, sched, 'end', '18:00');
    if(leave < end) hours += (end - leave) / 60;
  });

  return Math.round(hours * hourly);
}

/** 직전월 임금내역(지급/공제 세부항목) 렌더 — 값이 없는 항목은 생략 */
function _v2RenderPrevPayBreakdown(pays){
  const box = document.getElementById('ps-prev-breakdown');
  if(!box) return;

  if(!pays.length){
    box.innerHTML = `<div class="pb-empty">임금 내역이 없습니다</div>`;
    return;
  }

  const sum = key => pays.reduce((s,p) => s + (Number(p[key])||0), 0);
  const gross     = sum('gross_pay');
  const deduction = sum('total_deduction');
  const net       = sum('net_pay');

  // 지급 항목
  const extraWork = sum('overtime_pay') + sum('night_pay') + sum('holiday_pay');
  const annualPay = sum('annual_leave_pay');
  // 조정액이 음수면 환급액으로 표시
  const insRefund = Math.abs(Math.min(0, sum('health_insurance_adjust') + sum('ltcare_adjust_yearend') + sum('health_insurance_adjust_yearend')));
  const taxRefund = Math.abs(Math.min(0, sum('year_end_tax_adjust')));

  // 근태차감 (무급 결근·지각·조퇴) — 명목 고정임금에서 차감되므로 지급/공제 양쪽에 반영해 합계를 맞춘다
  const attDed = pays.reduce((s,p) => {
    const c = allContracts
      .filter(x => x.employee_id === p.employee_id && !x.is_draft)
      .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];
    return s + _v2AttendanceDeduction(p, c);
  }, 0);

  const grossNominal = gross + attDed;
  const dedTotal     = deduction + attDed;
  const fixedWage    = grossNominal - extraWork - annualPay - insRefund - taxRefund;

  // 공제 항목 (산재보험은 근로자 부담이 없어 제외)
  const health    = sum('health_insurance');
  const ltcare    = sum('long_term_care');
  const employ    = sum('employment_insurance');
  const pension   = sum('national_pension');
  const incomeTax = sum('income_tax');
  const localTax  = sum('local_income_tax');
  const otherDed  = dedTotal - (attDed + health + ltcare + employ + pension + incomeTax + localTax);

  const won = v => Math.round(Number(v)||0).toLocaleString() + '원';
  const rows = (label, val) => `<div class="pb-item"><span>${label}</span><span class="pb-amt">${won(val)}</span></div>`;
  const head = (label, val, cls = '') => `<div class="pb-group-head ${cls}"><span>${label}</span><span class="pb-amt">${won(val)}</span></div>`;

  let html = '';
  html += head('지급총액', grossNominal);
  if(fixedWage > 0) html += rows('고정임금', fixedWage);
  if(extraWork > 0) html += rows('추가근로수당', extraWork);
  if(insRefund > 0) html += rows('4대보험환급금', insRefund);
  if(taxRefund > 0) html += rows('세금환급금', taxRefund);
  if(annualPay > 0) html += rows('연차수당', annualPay);

  html += head('공제총액', dedTotal, 'pb-ded');
  if(attDed > 0)    html += rows('근태차감', attDed);
  if(pension > 0)   html += rows('국민연금', pension);
  if(health > 0)    html += rows('건강보험', health);
  if(ltcare > 0)    html += rows('장기요양보험', ltcare);
  if(employ > 0)    html += rows('고용보험', employ);
  if(incomeTax > 0) html += rows('소득세', incomeTax);
  if(localTax > 0)  html += rows('지방세', localTax);
  if(otherDed > 0)  html += rows('기타 공제', otherDed);

  html += `<div class="pb-total"><span>실지급액</span><span class="pb-amt">${won(net)}</span></div>`;
  box.innerHTML = html;
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
let _v2TypePie = null;

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

function _v2RenderPayStatsTypePie(prevPays, pm){
  const legendEl = document.getElementById('ps-type-legend');
  const canvas   = document.getElementById('ps-type-pie');
  if(!legendEl || !canvas) return;

  const rows = _V2_TYPE_PIE_GROUPS.map(g => ({ key:g.key, color:g.color, always:g.always, gross:0, cnt:0 }));
  const groupIdx = {};
  _V2_TYPE_PIE_GROUPS.forEach((g, i) => g.cats.forEach(c => { groupIdx[c] = i; }));

  prevPays.forEach(p => {
    const emp = allEmployees.find(e => e.id === p.employee_id);
    const i = groupIdx[_v2EmpPayTypeCategory(emp, Number(p.pay_year), Number(p.pay_month))];
    if(i === undefined) return;
    rows[i].gross += (Number(p.gross_pay)||0);
    rows[i].cnt++;
  });

  const items = rows.filter(r => r.always || r.cnt > 0);
  const total = items.reduce((s,r) => s + r.gross, 0);

  if(_v2TypePie){ _v2TypePie.destroy(); _v2TypePie = null; }

  if(!prevPays.length){
    canvas.parentElement.style.display = 'none';
    legendEl.innerHTML = `<div class="emp-empty"><i class="fas fa-inbox"></i><div>데이터 없음</div><p>${pm ? `${pm.y}년 ${pm.m}월` : '해당 월'} 급여가 아직 없습니다.</p></div>`;
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
  _v2TypePie = new Chart(canvas, {
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


function renderClientPayStats(){
  if(!currentCompany) return;

  const pm = _v2PrevMonth(_v2ViewDate);
  const prevPays = allPayrolls.filter(p => Number(p.pay_year) === pm.y && Number(p.pay_month) === pm.m);

  const setT = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };

  // ── 직전월 임금내역 ──
  setT('ps-prev-meta', `${pm.y}년 ${pm.m}월 · ${prevPays.length}명`);
  _v2RenderPrevPayBreakdown(prevPays);

  // ── 다음 급여일 예상 총액 ──
  const nextDate = _v2NextPayday(_v2ViewDate);
  const expected = _v2ExpectedNextPayroll(_clientVisibleEmps().filter(e => _v2EmployedAt(e, _v2ViewDate)));
  setT('ps-next-gross', expected > 0 ? fmt(expected) + '원' : '-');
  setT('ps-next-meta', nextDate
    ? `${nextDate.replace(/-/g,'.')} 지급 예정 · 유효 계약 기준 추정`
    : '급여 지급일이 설정되지 않았습니다');

  // ── 고용형태별 통계 (직전월, 파이) ──
  setT('ps-type-period', `${pm.y}년 ${pm.m}월 기준`);
  _v2RenderPayStatsTypePie(prevPays, pm);

  // ── 12개월 추이 (항목 선택 그래프) ──
  const months = [];
  for(let i = 11; i >= 0; i--){
    let m = pm.m - i, y = pm.y;
    while(m < 1){ m += 12; y--; } while(m > 12){ m -= 12; y++; }
    months.push({ y, m });
  }
  setT('ps-trend-period', `${months[0].y}.${_v2Pad2(months[0].m)} ~ ${months[11].y}.${_v2Pad2(months[11].m)}`);

  const togglesEl = document.getElementById('paystats-toggles');
  if(togglesEl && !togglesEl.dataset.built){
    togglesEl.dataset.built = '1';
    togglesEl.innerHTML = (TREND_ITEMS || []).map(t => `
      <label class="tgl-chip ${_v2TrendOn[t.key]?'on':''}"
        style="border-color:${t.borderColor};${_v2TrendOn[t.key] ? 'background:'+t.color+';color:#fff;' : 'background:'+t.bgColor+';color:'+t.textColor+';'}"
        onclick="_v2TrendOn['${t.key}']=!_v2TrendOn['${t.key}'];this.classList.toggle('on');if(_v2TrendOn['${t.key}']){this.style.background='${t.color}';this.style.color='#fff';}else{this.style.background='${t.bgColor}';this.style.color='${t.textColor}';}renderV2TrendChart()">
        ${t.label}
      </label>`).join('');
  }

  requestAnimationFrame(() => renderV2TrendChart());

  // 임금대장 버튼 상태
  if(typeof _updateWageLedgerButton === 'function') _updateWageLedgerButton();
  // 사용료 스위치
  const bb = document.getElementById('ps-billing-btn');
  if(bb) bb.style.display = _billingFeatureEnabled ? '' : 'none';
}

/** 직전월 항목별 비율 모달 (기존 pay-ratio 모달 재사용) */
function openPayStatsRatio(){
  const pm = _v2PrevMonth(_v2ViewDate);
  statsYear = pm.y; statsMonth = pm.m;
  if(typeof openPayRatioModal === 'function') openPayRatioModal();
}

function renderV2TrendChart(){
  const pm = _v2PrevMonth(_v2ViewDate);
  const months = [];
  for(let i = 11; i >= 0; i--){
    let m = pm.m - i, y = pm.y;
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
      irreg: ps.reduce((a,p)=>a+(Number(p.annual_leave_pay)||0)+(Number(p.other_pay)||0),0),
      tax:   ps.reduce((a,p)=>a+(Number(p.income_tax)||0)+(Number(p.local_income_tax)||0),0),
      ins:   ps.reduce((a,p)=>a+(Number(p.health_insurance)||0)+(Number(p.long_term_care)||0)+(Number(p.national_pension)||0)+(Number(p.employment_insurance)||0),0),
      adj:   ps.reduce((a,p)=>a+(Number(p.year_end_tax_adjust)||0)+(Number(p.health_insurance_adjust)||0)+(Number(p.advance_deduction)||0),0),
    };
  });

  const datasets = (TREND_ITEMS || []).filter(t => _v2TrendOn[t.key]).map(t => ({
    label: t.label,
    data: agg.map(a => a[t.key]),
    borderColor: t.color,
    backgroundColor: t.color + '18',
    borderWidth: 2.5,
    pointRadius: 3,
    pointHoverRadius: 6,
    pointBackgroundColor: t.color,
    fill: false,
    tension: .35,
  }));

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
        legend: { position: 'top', align: 'end', labels: { font: { size: 10 }, usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: {
          title: items => `📅 ${items[0].label}`,
          label: c => ` ${c.dataset.label}: ${Math.round(c.parsed.y).toLocaleString('ko-KR')}원`
        } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 0, color: '#9ca3af' } },
        y: { grid: { color: 'rgba(0,0,0,.04)' }, beginAtZero: true, ticks: { font: { size: 9 }, color: '#9ca3af', callback: v => (v>=1000000 ? (v/10000).toFixed(0)+'만' : v.toLocaleString()) } }
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
  // 로그인 시 조회 상태 초기화 (기본: 오늘, 전체 카테고리)
  _v2ViewDate  = fmtLocalDate(new Date());
  _v2EmpFilter = 'all';
  _v2EmpSearch = '';
  const searchInput = document.getElementById('emp-search-input');
  if(searchInput) searchInput.value = '';
  const clr = document.getElementById('emp-search-clear');
  if(clr) clr.style.visibility = 'hidden';

  showPage('paystats', document.getElementById('nav-paystats'));
  if(typeof _updateWageLedgerButton === 'function') _updateWageLedgerButton();
}
