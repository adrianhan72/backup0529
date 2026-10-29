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
  const sub = document.getElementById('hd-sub-label');
  if(sub) sub.textContent = page === 'paystats' ? '급여통계' : '임직원 현황';
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

  const asof = document.getElementById('emp-asof-label');
  if(asof) asof.textContent = _v2FormatDateLabel(_v2ViewDate);

  const base = _clientVisibleEmps().filter(e => _v2EmployedAt(e, _v2ViewDate));

  // 카테고리 집계
  const countByCat = {};
  base.forEach(e => {
    const c = _clientEmpCategory(e);
    countByCat[c] = (countByCat[c] || 0) + 1;
  });

  // 카테고리 칩
  catWrap.innerHTML = _V2_CAT_ORDER.map(cat => {
    const cnt = countByCat[cat] || 0;
    const cfg = CAT_CONFIG[cat] || {};
    const sel = _v2EmpFilter === cat;
    return `<button class="emp-cat-chip${sel?' on':''}" onclick="setV2EmpFilter('${cat}')" ${cnt ? '' : 'disabled'}>
      <span class="emp-cat-icon">${cfg.icon || '👤'}</span>
      <span class="emp-cat-name">${cat.includes('수습') ? cat.replace(' 수습','<small> 수습</small>') : cat}</span>
      <span class="emp-cat-count">${cnt}명</span>
    </button>`;
  }).join('');

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

function renderClientPayStats(){
  const grid = document.getElementById('ps-type-grid');
  if(!grid || !currentCompany) return;

  const pm = _v2PrevMonth(_v2ViewDate);
  const prevPays = allPayrolls.filter(p => Number(p.pay_year) === pm.y && Number(p.pay_month) === pm.m);
  const prevGross = prevPays.reduce((s,p) => s + (Number(p.gross_pay)||0), 0);

  const setT = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };

  // ── 직전월 총액 ──
  setT('ps-prev-gross', fmt(prevGross) + '원');
  setT('ps-prev-meta', `${pm.y}년 ${pm.m}월 · 지급인원 ${prevPays.length}명 · 탭하면 항목별 비율 보기`);

  // ── 다음 급여일 예상 총액 ──
  const nextDate = _v2NextPayday(_v2ViewDate);
  const expected = _v2ExpectedNextPayroll(_clientVisibleEmps().filter(e => _v2EmployedAt(e, _v2ViewDate)));
  setT('ps-next-gross', expected > 0 ? fmt(expected) + '원' : '-');
  setT('ps-next-meta', nextDate
    ? `${nextDate.replace(/-/g,'.')} 지급 예정 · 유효 계약 기준 추정`
    : '급여 지급일이 설정되지 않았습니다');

  // ── 고용형태별 통계 (직전월) ──
  setT('ps-type-period', `${pm.y}년 ${pm.m}월 기준`);
  const typeMap = {};
  prevPays.forEach(p => {
    const emp = allEmployees.find(e => e.id === p.employee_id);
    const cat = _clientEmpCategory(emp);
    if(!typeMap[cat]) typeMap[cat] = { gross: 0, cnt: 0 };
    typeMap[cat].gross += (Number(p.gross_pay)||0);
    typeMap[cat].cnt++;
  });
  const typeItems = _V2_CAT_ORDER.filter(c => typeMap[c]);
  grid.innerHTML = typeItems.length
    ? typeItems.map(cat => {
        const cfg = CAT_CONFIG[cat] || {};
        const t = typeMap[cat];
        return `<div class="v2-type-card" style="background:${cfg.bg || '#f1f5f9'};">
          <div class="vt-name" style="color:rgba(255,255,255,.92);">${cat.replace(' 수습','<br>수습')}</div>
          <div class="vt-amount" style="color:#fff;">${fmt(t.gross)}원</div>
          <div class="vt-count" style="color:rgba(255,255,255,.8);">${t.cnt}명</div>
        </div>`;
      }).join('')
    : `<div class="emp-empty" style="grid-column:1/-1;"><i class="fas fa-inbox"></i><div>데이터 없음</div><p>${pm.y}년 ${pm.m}월 급여가 아직 없습니다.</p></div>`;

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
function renderClientTerms(){
  const box = document.getElementById('terms-content');
  if(!box) return;
  box.innerHTML = `
    <div class="legal-card">
      <div class="legal-title">서비스 이용약관</div>
      <div class="legal-date">제1조 목적<br>본 약관은 대화인사노무파트너스(이하 "회사")가 제공하는 인사톡 노무톡 급여·인사 관리 서비스(이하 "서비스")의 이용 조건 및 절차를 규정함을 목적으로 합니다.</div>
      <h3>제1조 (약관의 효력)</h3>
      <p>1. 본 약관은 서비스를 이용하는 고객사(이하 "이용자")에게 그 효력이 발생합니다.</p>
      <p>2. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자와 사유를 서비스 내에 공지합니다.</p>
      <h3>제2조 (서비스의 제공)</h3>
      <p>1. 회사는 이용자에게 급여·근로계약·근태·연차 관리 등 노무 관련 기능을 제공합니다.</p>
      <p>2. 서비스는 연중무휴 제공을 원칙으로 하되, 시스템 점검·장애 등 부득이한 사유로 일시 중단될 수 있습니다.</p>
      <h3>제3조 (이용자의 의무)</h3>
      <p>1. 이용자는 접근코드 등 계정 정보를 제3자에게 공유하지 않아야 합니다.</p>
      <p>2. 이용자는 서비스에 허위 정보를 입력하거나 법령을 위반하는 목적으로 서비스를 이용할 수 없습니다.</p>
      <h3>제4조 (책임의 한계)</h3>
      <p>1. 회사는 서비스 내에서 제공하는 계산 결과가 참고용임을 안내하며, 법적 효력이 있는 확정 수치는 전문가(노무사)의 최종 검토를 거쳐야 합니다.</p>
      <p>2. 이용자의 부주의로 인한 정보 유출 등에 대해 회사는 책임을 지지 않습니다.</p>
      <h3>제5조 (기타)</h3>
      <p>본 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.</p>
      <div class="legal-date">시행일: 2026년 10월 29일</div>
    </div>`;
}

function renderClientPrivacy(){
  const box = document.getElementById('privacy-content');
  if(!box) return;
  box.innerHTML = `
    <div class="legal-card">
      <div class="legal-title">개인정보처리방침</div>
      <div class="legal-date">대화인사노무파트너스(이하 "회사")는 개인정보보호법 등 관련 법령을 준수하며, 이용자의 개인정보를 소중히 보호합니다.</div>
      <h3>1. 수집하는 개인정보 항목</h3>
      <ul>
        <li>회사 정보: 회사명, 사업자등록번호, 대표자명, 주소, 연락처</li>
        <li>근로자 정보: 성명, 연락처, 입사일, 퇴사일, 부서·직급 등 인사 정보</li>
        <li>급여 정보: 급여 산정 및 지급 내역</li>
      </ul>
      <h3>2. 개인정보의 수집·이용 목적</h3>
      <ul>
        <li>급여·근로계약·근태·연차 등 노무 관리 서비스 제공</li>
        <li>법령상 의무 이행(4대보험, 원천징수 등)</li>
        <li>서비스 개선 및 고객 문의 대응</li>
      </ul>
      <h3>3. 개인정보의 보유·이용 기간</h3>
      <p>개인정보는 수집 목적 달성 후 또는 관련 법령상 보존 기간 종료 후 지체 없이 파기합니다.</p>
      <h3>4. 개인정보의 제3자 제공</h3>
      <p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 의한 경우는 예외로 합니다.</p>
      <h3>5. 개인정보의 파기</h3>
      <p>보유 기간 경과 또는 처리 목적 달성 시 개인정보를 복구·재생할 수 없는 방법으로 안전하게 파기합니다.</p>
      <h3>6. 이용자의 권리</h3>
      <p>이용자는 자신의 개인정보 열람·정정·삭제를 요청할 수 있으며, 담당 노무사에게 문의하시면 신속히 처리해 드립니다.</p>
      <h3>7. 개인정보 보호책임자</h3>
      <p>개인정보 관련 문의는 담당 노무사 또는 회사 대표 연락처로 문의하시기 바랍니다.</p>
      <div class="legal-date">시행일: 2026년 10월 29일</div>
    </div>`;
}

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

  showPage('employees', document.getElementById('nav-employees'));
  if(typeof _updateWageLedgerButton === 'function') _updateWageLedgerButton();
}
