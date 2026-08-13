//  연차 관리 — 잔여 연차 조회 (page-annual-leave)
//  + 사용촉진 발송 이력 (page-leave-promotion)
// ==================================================================

// ─── AL 페이지 전용 상태 ─────────────────────────────────────────
let _alCompanyId   = '';    // 선택된 고객사 ID
let _alCompanyName = '';    // 선택된 고객사명
let _alPage        = 1;     // 연차 테이블 현재 페이지
const AL_PAGE_SIZE = 30;
let _alPromoEmpId  = '';    // 사용촉진 발송 대상 empId (모달용)
let _alPromoData   = null;  // 사용촉진 발송 데이터 (모달용)

// ─── LP 페이지 전용 상태 ─────────────────────────────────────────
let _lpHistoryList   = [];
let _lpHistoryLoaded = false;
let _lpPage          = 1;
const LP_PAGE_SIZE   = 30;

// ─────────────────────────────────────────────────────────────────
//  잔여 연차 조회 — 공통 유틸
// ─────────────────────────────────────────────────────────────────

/**
 * 특정 직원의 연차 현황 계산
 * @param {object} emp       employees 레코드
 * @param {object} contract  해당 직원의 활성 계약 레코드
 * @param {object} company   companies 레코드
 * @param {number} refYear   기준 연도 (UI 선택값)
 * @returns {{ totalDays, usedDays, remainDays, basis, hourlyWage, leavePay }}
 */
function calcEmployeeAnnualLeave(emp, contract, company, refYear){
  if(!emp || !contract) return null;
  // 일용직 제외
  if((emp.employment_category||contract.contract_type) ===CONTRACT_TYPE.DAILY) return null;

  const hireDateStr   = emp.hire_date || contract.contract_start || '';
  const basis         = company?.annual_leave_basis || 'fiscal_year';
  const contractStart = contract.contract_start || '';

  const hire = new Date(hireDateStr);
  if(!hireDateStr || isNaN(hire)) return null;
  hire.setHours(0,0,0,0);

  const today = new Date(); today.setHours(0,0,0,0);

  // 아직 입사 전이면 표시 안 함
  if(today < hire) return null;

  // ── 헬퍼: 입사일로부터 만 N년이 되는 날짜 ──
  const nthAnniv = n => {
    const d = new Date(hire);
    d.setFullYear(d.getFullYear() + n);
    return d;
  };

  // ── 헬퍼: 두 날짜 사이 완성된 개월 수 (milestone 방식) ──
  const completedMonthsBetween = (from, to, maxM) => {
    let m = 0;
    for(let i = 1; i <= maxM; i++){
      const ms = new Date(from);
      ms.setMonth(ms.getMonth() + i);
      if(to >= ms) m = i; else break;
    }
    return m;
  };

  // ── 기준년도 산정 baseDate 결정 ──
  // 회계년도: refYear-01-01 / 입사일: 직전 주년일(오늘 기준)
  let baseDate;
  if(basis === 'hire_date'){
    // refYear 주년일이 오늘 이전이면 그것, 아니면 refYear-1 주년일
    const annivThis = new Date(refYear, hire.getMonth(), hire.getDate());
    baseDate = annivThis <= today
      ? annivThis
      : new Date(refYear - 1, hire.getMonth(), hire.getDate());
  } else {
    baseDate = new Date(refYear, 0, 1); // 회계년도: refYear-01-01
  }

  // ── 1년 미만 여부: baseDate 시점에서 판단 ──
  // (오늘 기준으로 1년 넘었어도 기준년도 시점엔 1년 미만일 수 있음)
  const isUnder1Year_atBase = baseDate < nthAnniv(1);

  let totalDays = 0;
  let periodStart, periodEnd; // 사용 연차 집계 구간

  if(isUnder1Year_atBase){
    // ── 1년 미만 구간: 오늘까지 완성된 개월 수 × 1일 (최대 11일) ──
    // 실시간(오늘) 기준으로 발생한 연차 표시
    totalDays = completedMonthsBetween(hire, today, 11);
    // 사용 연차 집계: 입사월 ~ 오늘 달
    periodStart = { y: hire.getFullYear(), m: hire.getMonth() + 1 };
    periodEnd   = { y: today.getFullYear(), m: today.getMonth() + 1 };

  } else {
    // ── 1년 이상: baseDate 기준 만 N년 산정 ──
    // 정확한 만 년수: nthAnniv 방식으로 카운트 (365.25 나눗셈 오차 제거)
    let fullYears = 0;
    for(let n = 1; n <= 40; n++){
      if(baseDate >= nthAnniv(n)) fullYears = n; else break;
    }
    const bonus   = fullYears >= 3 ? Math.floor((fullYears - 1) / 2) : 0;
    totalDays     = Math.min(15 + bonus, 25);

    // 사용 연차 집계 구간
    if(basis === 'hire_date'){
      // 직전 주년일 ~ 당해 주년일 (refYear 기준)
      periodStart = null; // 날짜 객체로 별도 처리
      periodEnd   = null;
    } else {
      // 회계년도 전체
      periodStart = { y: refYear, m: 1 };
      periodEnd   = { y: refYear, m: 12 };
    }
  }

  // ── 사용 연차 집계 ──
  const usedDays = (allPayrolls || []).filter(p => {
    if(p.employee_id !== emp.id) return false;
    const cs   = contract.contract_start || '';
    const csYM = cs ? parseInt(cs.slice(0,4))*100 + parseInt(cs.slice(5,7)) : 0;
    const pYM  = (p.pay_year||0)*100 + (p.pay_month||0);
    if(csYM && pYM < csYM) return false;

    if(isUnder1Year_atBase){
      // 입사월 ~ 오늘 달
      const sYM = periodStart.y * 100 + periodStart.m;
      const eYM = periodEnd.y   * 100 + periodEnd.m;
      return pYM >= sYM && pYM <= eYM;

    } else if(basis === 'hire_date'){
      // 직전 주년일 ~ 당해 주년일 월 범위
      const annivPrev = new Date(refYear - 1, hire.getMonth(), hire.getDate());
      const annivCurr = new Date(refYear,     hire.getMonth(), hire.getDate());
      const pDate     = new Date(p.pay_year||0, (p.pay_month||1)-1, 1);
      return pDate >= annivPrev && pDate < annivCurr;

    } else {
      // 회계년도 전체
      return p.pay_year == refYear;
    }
  }).reduce((s,p) => s + (parseFloat(p.annual_leave_used)||0), 0);

  const remainDays = totalDays - usedDays;  // 음수 허용 (연차 빌려쓰기)

  // 통상시급: 계약서에 저장된 hourly_wage 사용 (필수값, 폴백 없음)
  const hourlyWage = parseFloat(contract.hourly_wage) || 0;
  const workHours   = parseFloat(contract.work_hours_per_day) || 8;
  // 잔여 연차 수당 추계 = 통상시급 × 1일 근로시간 × 잔여일수
  const leavePay    = Math.round(hourlyWage * workHours * remainDays);

  return { totalDays, usedDays, remainDays, basis, hourlyWage, leavePay };
}

// ─────────────────────────────────────────────────────────────────
//  잔여 연차 조회 — 페이지 함수
// ─────────────────────────────────────────────────────────────────

/** 고객사 선택 화면 초기화 */
function initAlPage(){
  _alCompanyId   = '';
  _alCompanyName = '';
  _alPage        = 1;
  document.getElementById('al-company-select-card').style.display = '';
  document.getElementById('al-main-section').style.display        = 'none';
  // 기준년도 셀렉트 채우기
  const ySel = document.getElementById('al-year-sel');
  
  if(ySel){
    const cur = new Date().getFullYear();
    // 이미 채워진 경우도 재구성 (범위가 다를 수 있으므로)
    ySel.innerHTML = '';
    for(let y = cur + 1; y >= cur - 5; y--){
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y === cur ? `${y}년 (올해)` : `${y}년`;
      if(y === cur) opt.selected = true;
      ySel.appendChild(opt);
    }
  }
  renderAlCompanyChips();
}

/** 고객사 칩 렌더링 */
function renderAlCompanyChips(){
  const container = document.getElementById('al-company-chips');
  if(!container) return;
  const q = (document.getElementById('al-company-search')?.value||'').trim().toLowerCase();

  const active = allCompanies.filter(c =>
    isCompanyActive(c) &&
    (!q || (c.company_name||'').toLowerCase().includes(q))
  ).sort((a,b)=>(a.company_name||'').localeCompare(b.company_name||'','ko'));

  if(!active.length){
    container.innerHTML = `<div style="color:#9ca3af;font-size:12.5px;padding:8px 0;">고객사가 없습니다.</div>`;
    return;
  }
  container.innerHTML = active.map(c => {
    const empCnt = allEmployees.filter(e =>
      e.company_id === c.id && (e.status===EMP_STATUS.ACTIVE || e.status===EMP_STATUS.ACTIVE)
    ).length;
    return `<button class="co-chip${_alCompanyId===c.id?' selected':''}" onclick="selectAlCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}')">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name||'-'}
      ${empCnt > 0 ? `<span class="count-badge">${empCnt}</span>` : ''}
    </button>`;
  }).join('');
}

/** 고객사 선택 */
function selectAlCompany(companyId, companyName){
  _alCompanyId   = companyId;
  _alCompanyName = companyName;
  _alPage        = 1;
  currentGlobalCompanyId = companyId;  // 글로벌 공유 동기화
  document.getElementById('al-company-select-card').style.display = 'none';
  document.getElementById('al-main-section').style.display        = '';
  document.getElementById('al-company-name-title').textContent    = companyName;

  // 연차 산정 기준 표시
  const co    = allCompanies.find(c => c.id === companyId);
  const basis = co?.annual_leave_basis || 'fiscal_year';
  const basisEl = document.getElementById('al-basis-label');
  if(basisEl) basisEl.textContent = `연차 산정 기준 : ${basis === 'hire_date' ? '입사일 기준' : '회계년도 기준'}`;

  renderAlTable();
}

/** 고객사 선택 화면으로 돌아가기 */
function alBackToCompanyList(){
  // _alCompanyId / currentGlobalCompanyId 는 유지 → 칩 강조 표시 보존
  document.getElementById('al-company-select-card').style.display = '';
  document.getElementById('al-main-section').style.display        = 'none';
  renderAlCompanyChips();
}

/** 연차 테이블 렌더링 (핵심) */
function renderAlTable(){
  const tbody   = document.getElementById('al-tbody');
  if(!tbody || !_alCompanyId) return;

  const refYear = parseInt(document.getElementById('al-year-sel')?.value) || new Date().getFullYear();
  const searchQ = (document.getElementById('al-emp-search')?.value||'').trim().toLowerCase();
  const co      = allCompanies.find(c => c.id === _alCompanyId);

  // ── 직원 필터링 (재직자만, 퇴직자·일용직 제외) ──
  let emps = allEmployees.filter(e => {
    if(e.company_id !== _alCompanyId) return false;
    if((e.employment_category||'') ===CONTRACT_TYPE.DAILY) return false;
    if(e.status !== EMP_STATUS.ACTIVE) return false;
    if(searchQ && !(e.name||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));

  // ── 직원별 연차 계산 + 관리대장 조회 ──
  const rows = emps.map(emp => {
    // 유효 계약(active / 서류미비)만 조회 — 만료·해지 계약은 제외
    const contract = allContracts.find(c =>
      c.employee_id === emp.id &&
      !c.is_draft &&
      !c.is_voided_by_amend &&
      CONTRACT_ACTIVE_STATUSES.includes(c.status)
    ) || allContracts.find(c =>
      c.employee_id === emp.id &&
      !c.is_draft &&
      !c.is_voided_by_amend &&
      c.status === CONTRACT_STATUS.PENDING
    );
    if(!contract) return null;

    const al = calcEmployeeAnnualLeave(emp, contract, co, refYear);
    if(!al) return null;

    // 관리대장 레코드 조회 (해당 직원·해당 연도)
    const ledger = allLeaveLedgers.find(r =>
      r.employee_id === emp.id && Number(r.year) === refYear
    ) || null;

    // ── 사용 연차: 관리대장 합계 우선, 없으면 급여 입력값 ──
    const usedFromLedger = ledger ? (parseFloat(ledger.total_used) || 0) : null;
    const effectiveUsed  = usedFromLedger !== null ? usedFromLedger : al.usedDays;

    // 이월 연차 (관리대장에 저장된 경우)
    const carryover = ledger ? (parseFloat(ledger.carryover_days) || 0) : 0;

    // 잔여 = (이월 + 발생) - 사용
    const effectiveRemain = carryover + al.totalDays - effectiveUsed;  // 음수 허용

    // 수당 추계 재계산 (잔여 변경 반영)
    const hourlyWage  = al.hourlyWage || 0;
    const workHours   = parseFloat(contract.work_hours_per_day) || 8;
    const effectivePay = Math.round(hourlyWage * workHours * effectiveRemain);

    return { emp, contract, al, ledger, effectiveUsed, carryover, effectiveRemain, effectivePay };
  }).filter(Boolean);

  // ── 통계 카드 업데이트 ──
  const sumTotal   = rows.reduce((s,r) => s + r.al.totalDays,       0);
  const sumUsed    = rows.reduce((s,r) => s + r.effectiveUsed,       0);
  const sumRemain  = rows.reduce((s,r) => s + r.effectiveRemain,     0);
  const sumPay     = rows.reduce((s,r) => s + r.effectivePay,        0);
  const setV = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  setV('al-stat-emp',        rows.length+'명');
  setV('al-stat-total',      sumTotal+'일');
  setV('al-stat-used',       sumUsed%1===0 ? sumUsed+'일' : sumUsed.toFixed(2)+'일');
  setV('al-stat-remain',     sumRemain%1===0 ? sumRemain+'일' : sumRemain.toFixed(2)+'일');
  setV('al-stat-remain-pay', `수당 추계 ${won(sumPay)}`);

  // ── 페이지네이션 ──
  const totalPages = Math.max(1, Math.ceil(rows.length / AL_PAGE_SIZE));
  if(_alPage > totalPages) _alPage = totalPages;
  const pageData = rows.slice((_alPage-1)*AL_PAGE_SIZE, _alPage*AL_PAGE_SIZE);

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="10" class="cen-empty"><i class="fas fa-inbox"></i> 조회된 직원이 없습니다.</td></tr>`;
    document.getElementById('al-pagination').innerHTML = '';
    return;
  }

  // ── 일수 포맷 (0.25 단위까지 표현) ──
  const fmtD = v => {
    if(v == null || isNaN(v)) return '-';
    const n = parseFloat(v);
    if(n === Math.floor(n)) return `${n}일`;
    return `${parseFloat(n.toFixed(2))}일`;
  };

  tbody.innerHTML = pageData.map(({emp, contract, al, ledger, effectiveUsed, carryover, effectiveRemain, effectivePay}) => {
    const cat      = emp.employment_category || contract.contract_type || '-';
    const badgeCls = CAT_BADGE_CLS[cat] || 'badge-gray';

    // 잔여 연차 색상
    const remainCls = effectiveRemain <= 0
      ? 'al-remain-danger'
      : effectiveRemain <= 3 ? 'al-remain-warn' : 'al-remain-ok';

    // ── 관리대장 저장 여부 배지 ──
    // 저장된 경우: 관리대장 출처 표시 + 이월연차 표기
    const usedCell = ledger
      ? `<span style="font-weight:700;color:#0d9488;">${fmtD(effectiveUsed)}</span>
         <span style="display:block;font-size:10px;color:#6b7280;margin-top:1px;">
           <i class="fas fa-clipboard-check" style="color:#0d9488;font-size:9px;"></i> 관리대장
         </span>`
      : `<span style="color:#6b7280;">${fmtD(effectiveUsed)}</span>
         <span style="display:block;font-size:10px;color:#9ca3af;margin-top:1px;">급여입력</span>`;

    // 이월 연차 표시 (있을 때만)
    const carryoverBadge = carryover > 0
      ? `<span style="display:inline-flex;align-items:center;gap:3px;
             margin-left:4px;padding:1px 6px;border-radius:10px;
             font-size:10px;font-weight:700;background:#eff6ff;color:#1d4ed8;
             border:1px solid #bfdbfe;" title="이월연차 포함">
           이월 ${fmtD(carryover)}
         </span>`
      : '';

    // 사용촉진 버튼
    const promoBtn = effectiveRemain > 0
      ? `<button class="btn btn-sm btn-indigo" onclick="openAlPromoModal('${emp.id}')">
           <i class="fas fa-paper-plane"></i> 촉진
         </button>`
      : `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;

    // 관리 버튼
    const ledgerBtn = `<button class="btn btn-sm btn-danger"
        onclick="openLeaveLedger('${emp.id}','${(emp.name||'').replace(/'/g,"\\'")}',${refYear})">
        <i class="fas fa-clipboard-list"></i> 관리
      </button>`;

    return `<tr>
      <td style="font-weight:700;color:#111827;">${emp.name||'-'}</td>
      <td style="text-align:center;font-size:12px;">${genderLabel(emp)}</td>
      <td><span class="badge ${badgeCls}">${contractTypeLabel(cat)}</span></td>
      <td style="font-size:12px;color:#6b7280;">${emp.hire_date||contract.contract_start||'-'}</td>
      <td class="right num" style="font-weight:600;">${fmtD(al.totalDays)}${carryoverBadge}</td>
      <td class="right" style="line-height:1.3;padding:6px 13px;">${usedCell}</td>
      <td class="right num ${remainCls}">${fmtD(effectiveRemain)}</td>
      <td class="right num" style="color:#6366f1;font-weight:600;">${effectivePay > 0 ? won(effectivePay) : '-'}</td>
      <td style="text-align:center;">${ledgerBtn}</td>
      <td style="text-align:center;">${promoBtn}</td>
    </tr>`;
  }).join('');

  // 페이지네이션
  const pagEl = document.getElementById('al-pagination');
  if(pagEl) pagEl.innerHTML = _rcBuildPagination(totalPages, _alPage, '_alPage', 'renderAlTable');
}


// ─────────────────────────────────────────────────────────────────
//  연차휴가 관리대장 모달
// ─────────────────────────────────────────────────────────────────

/** 관리대장 모달 내부 상태 */
let _ledgerEmpId    = '';
let _ledgerEmpName  = '';
let _ledgerYear     = new Date().getFullYear();
let _ledgerRecordId = '';   // 기존 레코드 id (PUT 대상), 없으면 POST
let _ledgerTotalDays = 0;   // 당해 발생 연차 (JS 계산값, _recalcLedgerSum에서 참조)
let _ledgerDailyWage = 0;   // 통상임금 일급
let _ledgerEntries  = [];   // [{ date:'YYYY-MM-DD', days:0.25|0.5|1, note:'' }, ...]

/**
 * 날짜 포맷 헬퍼 — Date → 'YYYY-MM-DD'
 */
function _fmtDate(d){
  if(!(d instanceof Date) || isNaN(d)) return '-';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * 연차일수 포맷 — 0.25 단위 고려
 */
function _fmtLeaveDay(v){
  if(v == null || isNaN(v)) return '-';
  const n = parseFloat(v);
  if(n === Math.floor(n)) return `${n}일`;
  // 소수점 최대 2자리
  return `${parseFloat(n.toFixed(2))}일`;
}

/**
 * 0.25 단위 연차일수 옵션 생성 (0 ~ maxDays까지, 단 합계가 maxDays 초과 안 되도록)
 * @param {number} current  현재 저장값
 * @param {number} maxVal   최대 선택 가능 값
 */
function _buildDaysOptions(current, maxVal){
  // 0.25 단위 옵션: 정수 루프로 부동소수점 오차 방지
  const MAX_UNITS = Math.min(Math.ceil((maxVal > 0 ? maxVal : 30) * 4), 240); // ×4 = 0.25 단위
  const opts = [];
  for(let u = 0; u <= MAX_UNITS; u++){
    const v     = u / 4;                              // 실제 일수값 (0, 0.25, 0.5, ...)
    const label = v === 0 ? '0' : v % 1 === 0 ? String(v) : v.toFixed(2).replace(/\.?0+$/,'');
    const sel   = (Math.round(parseFloat(current) * 4) === u) ? 'selected' : '';
    opts.push(`<option value="${v}" ${sel}>${label}</option>`);
  }
  return opts.join('');
}

/**
 * 관리대장 모달 열기
 * @param {string} empId
 * @param {string} empName
 * @param {number} refYear  현재 기준년도 셀렉트 값
 */
async function openLeaveLedger(empId, empName, refYear){
  _ledgerEmpId    = empId;
  _ledgerEmpName  = empName;
  _ledgerYear     = refYear || new Date().getFullYear();
  _ledgerRecordId = '';

  // 입력 필드 초기화 (이전 직원 세션 잔재 제거)
  { const _d = document.getElementById('ledger-entry-date'); if(_d) _d.value = ''; }
  { const _s = document.getElementById('ledger-entry-days'); if(_s) _s.value = '1'; }

  await _loadAndRenderLedger();
  openModal('al-ledger-modal');
}

/**
 * 연도 화살표 클릭 시 연도 변경 후 재렌더링
 * @param {number} delta  +1 또는 -1
 */
async function _ledgerNavYear(delta){
  _ledgerYear += delta;
  await _loadAndRenderLedger();
}

/**
 * 실제 데이터 조회 + 렌더링 (openLeaveLedger / _ledgerNavYear 공용)
 */
async function _loadAndRenderLedger(){
  // 연도 타이틀 업데이트
  const navTitle = document.getElementById('ledger-nav-title');
  if(navTitle) navTitle.textContent = `${_ledgerYear}년 연차휴가 관리대장`;

  const emp = allEmployees.find(e => e.id === _ledgerEmpId);
  if(!emp){ toast('직원 정보를 찾을 수 없습니다.', 'error'); return; }

  const contract = allContracts.find(c =>
    c.employee_id === _ledgerEmpId && (c.status===CONTRACT_STATUS.ACTIVE || c.status===EMP_STATUS.ACTIVE)
  ) || allContracts.filter(c => c.employee_id === _ledgerEmpId)
                   .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];

  const co    = allCompanies.find(c => c.id === (emp.company_id || _alCompanyId));
  const basis = co?.annual_leave_basis || 'fiscal_year';
  const hireDateStr = emp.hire_date || contract?.contract_start || '';
  const hire  = hireDateStr ? new Date(hireDateStr) : null;
  const today = new Date(); today.setHours(0,0,0,0);

  // ── 기준일 계산 ──
  let refDateStr = '';
  if(basis === 'hire_date' && hire && !isNaN(hire)){
    const annivThis = new Date(_ledgerYear, hire.getMonth(), hire.getDate());
    refDateStr = annivThis <= today
      ? _fmtDate(annivThis)
      : _fmtDate(new Date(_ledgerYear - 1, hire.getMonth(), hire.getDate()));
  } else {
    refDateStr = `${_ledgerYear}-01-01`;
  }

  // ── 연차 산정기간 계산 ──
  // 입사일 기준: 기준일 ~ 기준일+1년-1일 / 회계년도: YYYY-01-01 ~ YYYY-12-31
  let periodStart = '', periodEnd = '';
  if(basis === 'hire_date' && hire && !isNaN(hire)){
    const pStart = new Date(refDateStr);
    const pEnd   = new Date(pStart);
    pEnd.setFullYear(pEnd.getFullYear() + 1);
    pEnd.setDate(pEnd.getDate() - 1);
    periodStart = _fmtDate(pStart);
    periodEnd   = _fmtDate(pEnd);
  } else {
    periodStart = `${_ledgerYear}-01-01`;
    periodEnd   = `${_ledgerYear}-12-31`;
  }

  // ── 연차 계산 (calcEmployeeAnnualLeave 재사용) ──
  const al = contract ? calcEmployeeAnnualLeave(emp, contract, co, _ledgerYear) : null;
  _ledgerTotalDays = al ? al.totalDays : 0;

  // ── 통상임금 일급 ──
  const hourlyWage = al ? al.hourlyWage : 0;
  const workHours  = parseFloat(contract?.work_hours_per_day) || 8;
  _ledgerDailyWage = Math.round(hourlyWage * workHours);

  // ── 정보 행 채우기 ──
  const setText = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v||'-'; };
  setText('ledger-company-name',  co?.company_name);
  setText('ledger-basis',         basis);
  setText('ledger-ref-date',      refDateStr);
  setText('ledger-emp-name',      emp.name);
  setText('ledger-dept',          [emp.position, emp.department].filter(Boolean).join(' / ') || '-');
  setText('ledger-hire-date',     hireDateStr);
  setText('ledger-period-start',  periodStart);
  setText('ledger-period-end',    periodEnd);
  setText('ledger-total-days',    _fmtLeaveDay(_ledgerTotalDays));
  setText('agg-total-days',       _fmtLeaveDay(_ledgerTotalDays));

  // 통상임금
  setText('ledger-ordinary-wage', _ledgerDailyWage > 0 ? won(_ledgerDailyWage) + ' / 일' : '-');
  setText('ledger-wage-sub',      hourlyWage > 0 ? `시급 ${won(hourlyWage)} × ${workHours}시간` : '계약서 기본급 기준');

  // ── 기존 저장 레코드 조회 (캐시 우선, 없으면 API 직접 요청) ──
  _ledgerRecordId = '';
  let existMonthData = null;
  let existCarryover = 0;

  // 1) allLeaveLedgers 캐시에서 먼저 조회
  let rec = allLeaveLedgers.find(r =>
    r.employee_id === _ledgerEmpId && Number(r.year) === _ledgerYear
  ) || null;

  // 2) 캐시 미스 시 API 직접 요청 (첫 로드 전이거나 캐시 갱신 전)
  if(!rec){
    try{
      const res  = await fetch(`../tables/annual_leave_ledger?limit=500`);
      const json = await res.json();
      const fresh = (json.data||[]).find(r =>
        r.employee_id === _ledgerEmpId && Number(r.year) === _ledgerYear
      );
      if(fresh){
        // 캐시에 없으면 추가
        const idx = allLeaveLedgers.findIndex(x => x.id === fresh.id);
        if(idx > -1) allLeaveLedgers[idx] = fresh;
        else allLeaveLedgers.push(fresh);
        rec = fresh;
      }
    }catch(e){
      console.warn('[Ledger] 레코드 조회 실패:', e);
    }
  }

  if(rec){
    _ledgerRecordId = rec.id;
    existCarryover  = parseFloat(rec.carryover_days) || 0;
    try{ existMonthData = JSON.parse(rec.month_data||'[]'); }catch(e){ existMonthData = null; }
  }

  // ── 기존 month_data → _ledgerEntries 변환 ──
  _ledgerEntries = [];
  if(Array.isArray(existMonthData)){
    existMonthData.forEach(md => {
      const month = md.month;
      const datesStr = (md.dates || '').trim();
      // "3일, 15~16일" 파싱 → 개별 날짜로 분해
      if(datesStr){
        const parts = datesStr.split(/[,，、]/);
        parts.forEach(p => {
          p = p.trim().replace(/일/g, '').trim();
          if(!p) return;
          // 범위: "15~16"
          if(p.includes('~')){
            const [from, to] = p.split('~').map(s => parseInt(s));
            if(from && to){
              for(let d = from; d <= to; d++){
                _ledgerEntries.push({
                  date: `${_ledgerYear}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
                  days: 1, note: md.note || ''
                });
              }
            }
          } else {
            const d = parseInt(p);
            if(d){
              _ledgerEntries.push({
                date: `${_ledgerYear}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
                days: 1, note: md.note || ''
              });
            }
          }
        });
      }
      // 날짜 파싱이 안 된 경우 월별 days 합계를 단일 항목으로
      if(!datesStr && md.days > 0){
        _ledgerEntries.push({
          date: `${_ledgerYear}-${String(month).padStart(2,'0')}-01`,
          days: md.days, note: md.note || '(월 합계)'
        });
      }
    });
  }

  // ── 이월연차 인풋 초기화 ──
  const carryoverInp = document.getElementById('ledger-carryover-input');
  if(carryoverInp) carryoverInp.value = existCarryover;

  // ── 월별 테이블 렌더링 ──
  _renderLedgerMonthTable();

  // ── 집계 재계산 ──
  _recalcLedgerSum();
}

/**
 * 월별 tbody 렌더링 — 등록된 항목을 월별로 그룹화하여 표시
 */
function _renderLedgerMonthTable(){
  const tbody = document.getElementById('ledger-month-tbody');
  if(!tbody) return;
  tbody.innerHTML = '';

  // 월별 그룹화 { 1: [{date,days,note},...], 2: [...], ... }
  const byMonth = {};
  _ledgerEntries.forEach(e => {
    const m = parseInt(e.date.slice(5,7));
    if(!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(e);
  });

  const _now = new Date();
  const _todayYear = _now.getFullYear();
  const _todayMonth = _now.getMonth() + 1;

  // ── 사용일수 행 (월별 합계) ──
  const daysRow = document.createElement('tr');
  daysRow.innerHTML = `<td class="month-label" style="background:#0a3055;color:#fff;font-size:11px;">사용<br>일수</td>` +
    Array.from({length:12}, (_,i) => {
      const m = i + 1;
      const entries = byMonth[m] || [];
      const totalDays = entries.reduce((s, e) => s + (e.days||0), 0);
      const hasVal = totalDays > 0 ? ' has-value' : '';
      const isFuture = (Number(_ledgerYear) > _todayYear) ||
                       (Number(_ledgerYear) === _todayYear && m > _todayMonth);
      const futureStyle = isFuture ? 'background:#f1f5f9;opacity:0.5;' : '';
      return `<td class="days-cell" style="${futureStyle}text-align:center;font-weight:700;font-size:13px;color:${totalDays>0?'#0d9488':'#d1d5db'};">${totalDays>0?_fmtLeaveDay(totalDays):'-'}</td>`;
    }).join('') +
    `<td class="sum-val" id="ledger-sum-days-cell" rowspan="2"
        style="vertical-align:middle;font-size:15px;font-weight:800;color:#0d9488;min-width:70px;text-align:center;">0일</td>`;
  tbody.appendChild(daysRow);

  // ── 사용내역 행 (날짜별 항목 + 삭제 버튼) ──
  const detailRow = document.createElement('tr');
  detailRow.innerHTML = `<td class="month-label" style="background:#0a3055;color:#fff;font-size:11px;">사용<br>내역</td>` +
    Array.from({length:12}, (_,i) => {
      const m = i + 1;
      const entries = byMonth[m] || [];
      const isFuture = (Number(_ledgerYear) > _todayYear) ||
                       (Number(_ledgerYear) === _todayYear && m > _todayMonth);
      const futureStyle = isFuture ? 'background:#f1f5f9;opacity:0.5;' : '';

      if(entries.length === 0){
        return `<td style="${futureStyle}text-align:center;font-size:11px;color:#d1d5db;">-</td>`;
      }

      const itemsHtml = entries.map((e, idx) => {
        const dayOnly = parseInt(e.date.slice(8,10));
        const daysLabel = e.days === 1 ? '' : ` (${e.days}일)`;
        const noteHtml = e.note ? `<div style="font-size:10px;color:#92400e;background:#fffbeb;padding:1px 4px;border-radius:3px;margin-top:1px;">${e.note}</div>` : '';
        return `<div style="display:flex;align-items:center;justify-content:space-between;
          padding:2px 6px;margin:1px 0;background:#f0fdf4;border-radius:4px;font-size:11px;gap:4px;flex-wrap:wrap;">
          <span style="color:#374151;white-space:nowrap;">${dayOnly}일${daysLabel}</span>
          ${!isFuture ? `<button onclick="event.stopPropagation();_removeLedgerEntry('${e.date}')"
            style="background:none;border:none;color:#dc2626;cursor:pointer;padding:0 2px;font-size:11px;"
            title="삭제"><i class="fas fa-times-circle"></i></button>` : ''}
          ${noteHtml}
        </div>`;
      }).join('');

      return `<td style="${futureStyle}padding:4px;vertical-align:top;">${itemsHtml}</td>`;
    }).join('');
  tbody.appendChild(detailRow);
}

/**
 * 새 연차 사용 항목 등록
 */
function _addLedgerEntry(){
  const dateEl = document.getElementById('ledger-entry-date');
  const daysEl = document.getElementById('ledger-entry-days');
  if(!dateEl || !daysEl) return;

  const dateVal = dateEl.value;
  const daysVal = parseFloat(daysEl.value) || 1;

  if(!dateVal) { toast('사용일 날짜를 선택하세요.', 'error'); return; }

  // 해당 연도 확인
  const entryYear = parseInt(dateVal.slice(0,4));
  if(entryYear !== _ledgerYear) {
    toast(`${_ledgerYear}년 날짜만 등록할 수 있습니다.`, 'error');
    return;
  }

  // 중복 체크
  if(_ledgerEntries.some(e => e.date === dateVal)){
    toast('이미 등록된 날짜입니다.', 'error');
    return;
  }

  // ── 근로계약 시작일 이전 차단 ──
  const _contracts = (allContracts || []).filter(c =>
    c.employee_id === _ledgerEmpId && !c.is_draft && !c.is_voided_by_amend
  );
  if (_contracts.length > 0) {
    const _earliestStart = _contracts
      .map(c => c.contract_start)
      .filter(Boolean)
      .sort()[0];
    if (_earliestStart && dateVal < _earliestStart) {
      toast(`근로계약 시작일(${_earliestStart}) 이전 날짜는 등록할 수 없습니다.`, 'error');
      return;
    }
  }

  _ledgerEntries.push({ date: dateVal, days: daysVal, note: '' });
  _ledgerEntries.sort((a,b) => a.date.localeCompare(b.date));

  _renderLedgerMonthTable();
  _recalcLedgerSum();
  dateEl.value = '';
  daysEl.value = '1';
}

/**
 * 연차 사용 항목 삭제
 */
function _removeLedgerEntry(dateStr){
  _ledgerEntries = _ledgerEntries.filter(e => e.date !== dateStr);
  _renderLedgerMonthTable();
  _recalcLedgerSum();
}

/** 합계 / 잔여 / 수당 재계산 (_ledgerEntries 기준) */
function _recalcLedgerSum(){
  // 월별 사용일수 합산
  const usedSum = _ledgerEntries.reduce((s, e) => s + (e.days || 0), 0);
  // 이월연차
  const carryover = parseFloat(document.getElementById('ledger-carryover-input')?.value) || 0;
  // 총 합계 = 이월 + 당해 발생
  const grandTotal = carryover + _ledgerTotalDays;
  // 잔여 = 총 합계 - 사용
  const remain = grandTotal - usedSum;  // 음수 허용 (연차 빌려쓰기)
  // 잔여 수당 추계 (음수일 경우 0으로 표시하지 않고 마이너스 금액 유지)
  const leavePay = Math.round(_ledgerDailyWage * remain);

  const setText = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  setText('ledger-sum-days-cell', _fmtLeaveDay(usedSum));
  setText('agg-total-days',       _fmtLeaveDay(_ledgerTotalDays));
  setText('agg-grand-total',      _fmtLeaveDay(grandTotal));
  setText('agg-used-days',        _fmtLeaveDay(usedSum));
  setText('agg-remain-days',      _fmtLeaveDay(remain));
  setText('ledger-leave-pay',     leavePay !== 0 ? won(leavePay) : (_ledgerDailyWage > 0 ? '0원' : '-'));

  // 잔여일수 색상 (음수=적자, 0=소진, 양수=잔여)
  const remainEl = document.getElementById('agg-remain-days');
  if(remainEl) remainEl.style.color = remain < 0 ? '#dc2626' : remain === 0 ? '#f59e0b' : '#7c3aed';

  // 수당 색상
  const payEl = document.getElementById('ledger-leave-pay');
  if(payEl) payEl.style.color = remain < 0 ? '#dc2626' : remain === 0 ? '#9ca3af' : '#7c3aed';
}

/** 관리대장 저장 */
async function saveLeaveLedger(){
  const saveBtn = document.getElementById('ledger-save-btn');
  if(saveBtn){ saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try{
    // ── _ledgerEntries → month_data 변환 ──
    const monthMap = {}; // { 1: { days, dates:[], notes:[] }, ... }
    _ledgerEntries.forEach(e => {
      const m = parseInt(e.date.slice(5,7));
      const d = parseInt(e.date.slice(8,10));
      if(!monthMap[m]) monthMap[m] = { days: 0, dates: [], notes: [] };
      monthMap[m].days += e.days || 0;
      monthMap[m].dates.push(d);
      if(e.note) monthMap[m].notes.push(e.note);
    });

    const monthData = [];
    let totalUsed = 0;
    for(let m = 1; m <= 12; m++){
      const md = monthMap[m];
      if(md){
        // 날짜 정렬 후 범위 압축: [3,4,5,15,16,17] → "3~5일, 15~17일"
        const sorted = [...new Set(md.dates)].sort((a,b)=>a-b);
        const ranges = [];
        let rangeStart = sorted[0], rangeEnd = sorted[0];
        for(let i = 1; i < sorted.length; i++){
          if(sorted[i] === rangeEnd + 1){ rangeEnd = sorted[i]; }
          else {
            ranges.push(rangeStart === rangeEnd ? `${rangeStart}일` : `${rangeStart}~${rangeEnd}일`);
            rangeStart = sorted[i]; rangeEnd = sorted[i];
          }
        }
        ranges.push(rangeStart === rangeEnd ? `${rangeStart}일` : `${rangeStart}~${rangeEnd}일`);
        const datesStr = ranges.join(', ');

        monthData.push({
          month: m,
          dates: datesStr,
          days: Math.round(md.days * 100) / 100, // 부동소수점 정리
          note: [...new Set(md.notes)].join('; ')
        });
        totalUsed += md.days;
      } else {
        monthData.push({ month: m, dates: '', days: 0, note: '' });
      }
    }

    // ── 집계값 ──
    const carryover  = parseFloat(document.getElementById('ledger-carryover-input')?.value) || 0;
    const grandTotal = carryover + _ledgerTotalDays;
    const remain     = grandTotal - totalUsed;  // 음수 허용
    const leavePay   = Math.round(_ledgerDailyWage * remain);

    // ── 기준일 / 산정기간 ──
    const refDate     = document.getElementById('ledger-ref-date')?.textContent || '';
    const periodStart = document.getElementById('ledger-period-start')?.textContent || '';
    const periodEnd   = document.getElementById('ledger-period-end')?.textContent || '';

    const emp = allEmployees.find(e => e.id === _ledgerEmpId);
    const co  = allCompanies.find(c => c.id === (emp?.company_id || _alCompanyId));
    const contract = allContracts.find(c =>
      c.employee_id === _ledgerEmpId && (c.status===CONTRACT_STATUS.ACTIVE || c.status===EMP_STATUS.ACTIVE)
    ) || allContracts.filter(c => c.employee_id === _ledgerEmpId)
                     .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];

    const payload = {
      employee_id        : _ledgerEmpId,
      company_id         : co?.id || _alCompanyId || '',
      year               : _ledgerYear,
      contract_id        : contract?.id || '',
      status             : contract?.status || 'active',
      ref_date           : refDate,
      period_start       : periodStart,
      period_end         : periodEnd,
      total_days         : _ledgerTotalDays,
      carryover_days     : carryover,
      month_data         : JSON.stringify(monthData),
      total_used         : totalUsed,
      remain_days        : remain,
      ordinary_wage      : _ledgerDailyWage,
      leave_pay_estimate : leavePay,
    };

    let res;
    if(_ledgerRecordId){
      res = await fetch(`../tables/annual_leave_ledger/${_ledgerRecordId}`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
    } else {
      res = await fetch('../tables/annual_leave_ledger', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
    }

    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const saved = await res.json();
    _ledgerRecordId = saved.id;

    // ── allLeaveLedgers 캐시 갱신 (저장 즉시 목록에 반영) ──
    const existIdx = allLeaveLedgers.findIndex(r => r.id === saved.id);
    if(existIdx > -1){
      allLeaveLedgers[existIdx] = saved;   // PUT: 기존 레코드 교체
    } else {
      allLeaveLedgers.push(saved);          // POST: 신규 추가
    }

    // ── [연동] Ledger → Payroll: 관리대장 월별 데이터를 급여 payroll에 반영 ──
    // 관리대장에서 월별로 사용일수가 설정된 경우, 해당 월의 payroll 레코드를
    // 조회하여 annual_leave_used 필드를 업데이트한다.
    // (급여 레코드가 없는 달은 skip, is_draft 레코드도 포함하여 반영)
    try {
      const syncResults = await _syncLedgerToPayrolls(_ledgerEmpId, _ledgerYear, monthData);
      if(syncResults.updated > 0){
        // allPayrolls 캐시 갱신 (서버에서 다시 로드)
        await loadPayrolls();
        // 급여 입력 페이지가 열려 있으면 연차 현황 표도 재계산
        if(typeof calcAnnualLeaveTable === 'function') calcAnnualLeaveTable();
      }
    } catch(syncErr) {
      console.warn('[LedgerSync] 급여 연동 중 오류 (저장은 완료):', syncErr);
    }

    // ── 연차 목록 테이블 즉시 재렌더링 ──
    renderAlTable();

    // ── 급여입력 페이지 연동 갱신 ──
    if(typeof _onLedgerSavedFromPayroll === 'function') _onLedgerSavedFromPayroll();

    toast(`${_ledgerEmpName}의 ${_ledgerYear}년 연차 관리대장이 저장되었습니다.`, 'success');

  }catch(e){
    console.error('[LedgerSave]', e);
    toast('저장 중 오류가 발생했습니다: ' + e.message, 'error');
  } finally {
    if(saveBtn){ saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 저장'; }
  }
}

// ─────────────────────────────────────────────────────────────────
//  [연동 헬퍼] 관리대장 → 급여(payroll) annual_leave_used 동기화
// ─────────────────────────────────────────────────────────────────

/**
 * 관리대장 저장 후 해당 직원·해당 연도의 payroll 레코드에
 * 월별 annual_leave_used를 PATCH한다.
 *
 * @param {string} empId      - 직원 ID
 * @param {number} year       - 대장 연도
 * @param {Array}  monthData  - [{month, days, dates, note}, ...] (관리대장 month_data)
 * @returns {{ updated: number, skipped: number }}
 */
async function _syncLedgerToPayrolls(empId, year, monthData){
  let updated = 0, skipped = 0;

  for(const { month, days } of monthData){
    // 해당 직원·연도·월의 payroll 레코드 조회 (확정 저장 우선, 없으면 임시저장)
    const payroll = (allPayrolls || []).find(p =>
      p.employee_id === empId &&
      Number(p.pay_year)  === Number(year) &&
      Number(p.pay_month) === Number(month) &&
      !p.is_draft
    ) || (allPayrolls || []).find(p =>
      p.employee_id === empId &&
      Number(p.pay_year)  === Number(year) &&
      Number(p.pay_month) === Number(month) &&
      p.is_draft
    );

    if(!payroll){
      skipped++;
      continue;
    }

    const newVal = parseFloat(days) || 0;
    const oldVal = parseFloat(payroll.annual_leave_used) || 0;

    // 값이 동일하면 불필요한 요청 생략
    if(newVal === oldVal){
      skipped++;
      continue;
    }

    try {
      await fetch(`../tables/payrolls/${payroll.id}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ annual_leave_used: newVal }),
      });
      // 로컬 캐시도 즉시 반영
      payroll.annual_leave_used = newVal;
      updated++;
    } catch(e) {
      console.warn(`[LedgerSync] payroll ${payroll.id} PATCH 실패:`, e);
      skipped++;
    }
  }

  return { updated, skipped };
}

// ─────────────────────────────────────────────────────────────────
//  사용촉진 모달
// ─────────────────────────────────────────────────────────────────

/** 사용촉진 모달 열기 */
function openAlPromoModal(empId){
  const emp      = allEmployees.find(e => e.id === empId);
  if(!emp){ toast('직원 정보를 찾을 수 없습니다.','error'); return; }
  const contract = allContracts.find(c =>
    c.employee_id === empId && (c.status===CONTRACT_STATUS.ACTIVE||c.status===EMP_STATUS.ACTIVE)
  ) || allContracts.filter(c=>c.employee_id===empId)
                   .sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))[0];
  if(!contract){ toast('활성 계약 정보를 찾을 수 없습니다.','error'); return; }

  const co      = allCompanies.find(c => c.id === emp.company_id);
  const refYear = parseInt(document.getElementById('al-year-sel')?.value) || new Date().getFullYear();
  const al      = calcEmployeeAnnualLeave(emp, contract, co, refYear);
  if(!al){ toast('연차 계산 오류가 발생했습니다.','error'); return; }

  _alPromoEmpId = empId;
  _alPromoData  = { emp, contract, co, al, refYear };

  const adminNm = _getAdminUsername();

  // ── 직원 정보 요약 (3열 그리드) ──
  const infoEl = document.getElementById('al-promo-emp-info');
  if(infoEl){
    const rows = [
      ['직원명',              emp.name||'-'],
      ['고객사',              co?.company_name||'-'],
      ['고용형태',            contractTypeLabel(emp.employment_category||contract.contract_type) || '-'],
      [`${refYear}년 총 발생`, `${al.totalDays}일`],
      ['사용 연차',           `${al.usedDays}일`],
      ['잔여 연차',           `<strong style="color:#6366f1;font-size:14px;">${al.remainDays}일</strong>`],
    ];
    infoEl.innerHTML = rows.map(([l,v])=>`
      <div><span style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:2px;">${l}</span>
           <span style="color:#111827;font-weight:700;font-size:13px;">${v}</span></div>`).join('');
  }

  // ── 근로자용 메시지 미리보기 ──
  const workerBody = _buildLeavePromoWorkerBody(emp, co, al, refYear, adminNm);
  const wPrev = document.getElementById('al-promo-worker-preview');
  if(wPrev) wPrev.textContent = workerBody;

  // ── 고객사 알림 미리보기 ──
  const coBody = _buildLeavePromoCompanyBody(emp, co, al, refYear, adminNm, '?');
  const cPrev  = document.getElementById('al-promo-company-preview');
  if(cPrev) cPrev.textContent = coBody;

  // ── 연락처 상태 표시 ──
  const contactEl = document.getElementById('al-promo-contact-status');
  if(contactEl){
    const hasPhone = !!(emp.phone||'').trim();
    const hasEmail = !!(emp.email||'').trim();
    contactEl.innerHTML = [
      hasPhone
        ? `<span style="color:#059669;"><i class="fas fa-check-circle"></i> 휴대폰 ${emp.phone}</span>`
        : `<span style="color:#dc2626;"><i class="fas fa-exclamation-circle"></i> 휴대폰 미등록 (알림톡 불가)</span>`,
      hasEmail
        ? `<span style="color:#059669;"><i class="fas fa-check-circle"></i> 이메일 ${emp.email}</span>`
        : `<span style="color:#dc2626;"><i class="fas fa-exclamation-circle"></i> 이메일 미등록 (이메일 불가)</span>`,
    ].join('');
  }

  // ── 버튼 활성/비활성 ──
  const hasPhone = !!(emp.phone||'').trim();
  const hasEmail = !!(emp.email||'').trim();
  const btnKakao = document.getElementById('al-btn-kakao');
  const btnEmail = document.getElementById('al-btn-email');
  if(btnKakao){ btnKakao.disabled = !hasPhone; }
  if(btnEmail){ btnEmail.disabled = !hasEmail; }

  openModal('al-promo-modal');
}

/**
 * 근로자용 사용촉진 메시지 본문 (알림톡·이메일 직접 수신)
 */
function _buildLeavePromoWorkerBody(emp, co, al, refYear, adminName){
  const endDate = _calcLeaveEndDate(emp, al, refYear);
  return `안녕하세요, ${emp.name||''} 님.

${refYear}년도 미사용 연차 유급휴가가 남아 있어 사용을 촉진합니다.

■ ${refYear}년 총 발생 연차: ${al.totalDays}일
■ 현재까지 사용 연차     : ${al.usedDays}일
■ 잔여 연차             : ${al.remainDays}일
■ 사용 기한             : ${endDate}까지

「근로기준법」 제61조에 따라 위 기한까지 잔여 연차를 사용해 주시기 바랍니다.
기한 내 미사용 시 미사용 연차수당 청구권이 소멸될 수 있습니다.

연차 사용 시 소속 사업장에 사전 신청하여 주시기 바랍니다.

담당 노무사: ${adminName}
※ 본 통지는 근로기준법 제61조에 따른 공식 연차 사용촉진 통지서입니다.

${_BRAND_SIG}`;
}

/**
 * 고객사(고용주)용 앱 알림 본문 — 사용촉진 발송 사실 통보
 */
function _buildLeavePromoCompanyBody(emp, co, al, refYear, adminName, workerMethod){
  const coRep   = getCompanyRepName(co);
  const endDate = _calcLeaveEndDate(emp, al, refYear);
  const methodLabel = workerMethod === DISPATCH_METHOD.PHONE
    ? '유선(전화) 직접 안내'
    : DISPATCH_METHOD_LABEL[workerMethod] || workerMethod;
  const today = new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  return `안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원에게 연차 사용촉진 통지를 발송하였음을 안내드립니다.

■ 대상 직원  : ${emp.name}
■ 발송 일시  : ${today}
■ 발송 방법  : ${methodLabel}
■ ${refYear}년 잔여 연차: ${al.remainDays}일 (사용기한: ${endDate})

해당 직원이 기한 내 연차를 미사용할 경우, 「근로기준법」 제61조에 따라 미사용 연차수당 지급 의무가 소멸될 수 있습니다.
자세한 사항은 담당 노무사 ${adminName}에게 문의하시기 바랍니다.
`;
}

/** 연차 사용 기한 계산 헬퍼 */
function _calcLeaveEndDate(emp, al, refYear){
  if(al.basis === 'hire_date'){
    const hire = new Date(emp.hire_date||'');
    if(!isNaN(hire)){
      return `${refYear}-${String(hire.getMonth()+1).padStart(2,'0')}-${String(hire.getDate()).padStart(2,'0')}`;
    }
  }
  return `${refYear}-12-31`;
}

/**
 * 사용촉진 발송 실행
 * @param {string} method  DISPATCH_METHOD.KAKAO | DISPATCH_METHOD.EMAIL | DISPATCH_METHOD.PHONE
 */
async function confirmSendLeavePromotion(method){
  if(!_alPromoEmpId || !_alPromoData){ toast('발송 대상 정보가 없습니다.','error'); return; }

  const { emp, contract, co, al, refYear } = _alPromoData;
  const adminName = _getAdminUsername();

  // 연락처 검증
  if(method ===DISPATCH_METHOD.KAKAO && !(emp.phone||'').trim()){
    toast(`${emp.name} — 휴대폰 번호가 등록되지 않았습니다.`, 'error'); return;
  }
  if(method ===DISPATCH_METHOD.EMAIL && !(emp.email||'').trim()){
    toast(`${emp.name} — 이메일이 등록되지 않았습니다.`, 'error'); return;
  }

  // 발송 확인
  const methodLabel = method === DISPATCH_METHOD.PHONE ? DISPATCH_METHOD_LABEL[DISPATCH_METHOD.PHONE] : (DISPATCH_METHOD_LABEL[method] || method);
  const confirmMsg = method === DISPATCH_METHOD.PHONE
    ? `[유선 직접 안내 완료 선언]\n\n${emp.name} 님에게 전화로 ${refYear}년 연차 사용촉진 안내를 완료하셨습니까?\n잔여 연차: ${al.remainDays}일\n\n완료 선언 시 이력이 기록되고 고객사 앱에 발송 사실이 통보됩니다.`
    : `[연차 사용촉진 ${methodLabel} 발송]\n\n${emp.name} 님 (${co?.company_name||''})\n잔여 연차: ${al.remainDays}일\n수신: ${ method===DISPATCH_METHOD.KAKAO ? emp.phone : emp.email }\n\n발송 후 고객사 앱에 자동으로 통보됩니다.\n\n발송하시겠습니까?`;
  if(!confirm(confirmMsg)) return;

  // 버튼 비활성
  const btnMap = { [DISPATCH_METHOD_LABEL[DISPATCH_METHOD.KAKAO]]:'al-btn-kakao', [DISPATCH_METHOD_LABEL[DISPATCH_METHOD.EMAIL]]:'al-btn-email', [DISPATCH_METHOD_LABEL[DISPATCH_METHOD.PHONE]]:'al-btn-phone' };
  const activeBtn = document.getElementById(btnMap[method]);
  if(activeBtn){ activeBtn.disabled=true; activeBtn.innerHTML=`<i class="fas fa-circle-notch fa-spin"></i> 처리 중...`; }

  try {
    // ── ① 근로자 발송 (알림톡·이메일만, 유선은 이력만) ──
    if(method ===DISPATCH_METHOD.KAKAO){
      // 실제 카카오 API 연동 시 교체
      await new Promise(r=>setTimeout(r,400));

    } else if(method ===DISPATCH_METHOD.EMAIL){
      // 실제 이메일 API 연동 시 교체
      await new Promise(r=>setTimeout(r,400));

    }
    // 유선직접안내는 별도 발송 없음 — 이력만 기록

    // ── ② 고객사 앱 알림 (항상 발송) ──
    const coTitle = `[연차 사용촉진 통보] ${emp.name} — ${refYear}년 잔여 ${al.remainDays}일`;
    await _sendCompanyNotice({
      companyId  : co?.id||'', companyName: co?.company_name||'',
      noticeType : 'leave_promotion',
      title      : coTitle,
      body       : _buildLeavePromoCompanyBody(emp, co, al, refYear, adminName, method),
      contractId : contract?.id||'',
      employeeId : emp.id, employeeName: emp.name,
    });

    // ── ③ 발송 이력 저장 ──
    await fetch('../tables/annual_leave_promotions', {
      method : 'POST',
      headers: {'Content-Type':'application/json'},
      body   : JSON.stringify({
        employee_id          : emp.id,
        employee_name        : emp.name,
        company_id           : co?.id||'',
        company_name         : co?.company_name||'',
        contract_type        : emp.employment_category||contract.contract_type||'',
        total_leave_days     : al.totalDays,
        used_leave_days      : al.usedDays,
        remaining_leave_days : al.remainDays,
        annual_leave_basis   : al.basis,
        leave_pay_estimate   : al.leavePay,
        worker_send_method   : methodLabel,
        sent_at              : new Date().toISOString(),
        sent_by              : adminName,
        note: method === DISPATCH_METHOD.PHONE
          ? `${refYear}년 기준 — 유선 직접 안내 완료 (이력 기록)`
          : `${refYear}년 기준 — 근로자 ${methodLabel} 발송 + 고객사 앱 통보`,
      }),
    });

    const successMsg = method === DISPATCH_METHOD.PHONE
      ? `✅ ${emp.name} — 유선 직접 안내 완료 기록 + 고객사 앱 통보`
      : `✅ ${emp.name} — ${methodLabel} 발송 완료 + 고객사 앱 통보`;
    toast(successMsg, 'success');
    closeModal('al-promo-modal');
    _lpHistoryLoaded = false;
    await loadLeavePromotionHistory(true);
  } catch(e){
    console.error('[연차 사용촉진 발송 오류]', e);
    toast('발송 중 오류가 발생했습니다.', 'error');
  } finally {
    // 버튼 원복
    if(activeBtn){ activeBtn.disabled=false; }
    const btnKakao = document.getElementById('al-btn-kakao');
    const btnEmail = document.getElementById('al-btn-email');
    const btnPhone = document.getElementById('al-btn-phone');
    const hP = !!(_alPromoData?.emp?.phone||'').trim();
    const hE = !!(_alPromoData?.emp?.email||'').trim();
    if(btnKakao){ btnKakao.disabled=!hP;
      btnKakao.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 카카오 알림톡'; }
    if(btnEmail){ btnEmail.disabled=!hE;
      btnEmail.innerHTML='<i class="fas fa-envelope"></i> 이메일'; }
    if(btnPhone){ btnPhone.disabled=false;
      btnPhone.innerHTML='<i class="fas fa-phone-alt" style="color:#059669;"></i> 유선 직접 안내 완료'; }
  }
}

// ─────────────────────────────────────────────────────────────────
//  사용촉진 발송 이력 (page-leave-promotion)
// ─────────────────────────────────────────────────────────────────

/** 사용촉진 이력 DB 조회 */
async function loadLeavePromotionHistory(force=false){
  if(!force && _lpHistoryLoaded) return;
  try {
    let page=1, all=[];
    while(true){
      const res  = await fetch(`../tables/annual_leave_promotions?page=${page}&limit=200&sort=sent_at`);
      const data = await res.json();
      const rows = data.data||[];
      all.push(...rows);
      if(rows.length < 200) break;
      page++;
    }
    _lpHistoryList   = all.sort((a,b)=>(b.sent_at||'').localeCompare(a.sent_at||''));
    _lpHistoryLoaded = true;
    // 고객사 필터 채우기
    _lpFillCompanyFilter();
  } catch(e){
    console.error('[사용촉진 이력 조회 오류]', e);
  }
}

/** LP 페이지 초기화 */
async function initLpPage(){
  _lpPage = 1;
  if(!_lpHistoryLoaded) await loadLeavePromotionHistory(true);
  renderLpTable();
}

/** LP 고객사 필터 옵션 채우기 */
function _lpFillCompanyFilter(){
  const sel = document.getElementById('lp-filter-company');
  if(!sel) return;
  while(sel.options.length > 1) sel.remove(1);
  const seen = new Set();
  _lpHistoryList.forEach(r => {
    if(!seen.has(r.company_id)){
      seen.add(r.company_id);
      const opt = document.createElement('option');
      opt.value = r.company_id; opt.textContent = r.company_name||r.company_id;
      sel.appendChild(opt);
    }
  });
}

/** LP 테이블 렌더링 */
function _lpDoSearch(){
  const fromEl = document.getElementById('lp-filter-date-from');
  const toEl = document.getElementById('lp-filter-date-to');
  const noticeEl = document.getElementById('lp-date-notice');
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
        if(noticeEl) noticeEl.className = 'ct-hint-error';
        toast('조회 기간은 최대 3개월까지 가능합니다.', 'error');
        return;
      }
    }
  }
  resetBorder();
  if(noticeEl) noticeEl.className = 'ct-hint-muted';
  _lpPage = 1;
  renderLpTable();
}

function renderLpTable(){
  const tbody = document.getElementById('lp-tbody');
  if(!tbody) return;

  const filterCo     = document.getElementById('lp-filter-company')?.value  || '';
  const filterMethod = document.getElementById('lp-filter-method')?.value   || '';
  const fromVal      = document.getElementById('lp-filter-date-from')?.value || '';
  const toVal        = document.getElementById('lp-filter-date-to')?.value   || '';
  const searchQ      = (document.getElementById('lp-search')?.value||'').trim().toLowerCase();

  let list = _lpHistoryList.filter(r => {
    if(filterCo     && r.company_id        !== filterCo)     return false;
    if(filterMethod && r.worker_send_method !== filterMethod) return false;
    if(searchQ      && !(r.employee_name||'').toLowerCase().includes(searchQ)) return false;
    if(fromVal || toVal){
      const raw = r.sent_at || '';
      const sentDt = typeof raw === 'string' ? raw.slice(0,10) : String(raw).slice(0,10);
      if(fromVal && sentDt < fromVal) return false;
      if(toVal   && sentDt > toVal)   return false;
    }
    return true;
  }).sort((a,b)=>(a.employee_name||'').localeCompare(b.employee_name||'','ko'));

  // 요약 통계
  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthCnt = list.filter(r=>(r.sent_at||'').startsWith(curYM)).length;
  const totalCntEl = document.getElementById('lp-total-count');
  const monthCntEl = document.getElementById('lp-month-count');
  if(totalCntEl) totalCntEl.textContent = list.length;
  if(monthCntEl) monthCntEl.textContent = monthCnt;

  const totalPages = Math.max(1, Math.ceil(list.length / LP_PAGE_SIZE));
  if(_lpPage > totalPages) _lpPage = totalPages;
  const pageData = list.slice((_lpPage-1)*LP_PAGE_SIZE, _lpPage*LP_PAGE_SIZE);

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="11" class="cen-empty"><i class="fas fa-inbox"></i> 발송 이력이 없습니다.</td></tr>`;
    document.getElementById('lp-pagination').innerHTML='';
    return;
  }

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d)?'-':d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };
  // 발송 방식 배지 (CSS class 사용)
  const workerMethodBadge = m => {
    const METHOD_BADGE_CLS = {
      [DISPATCH_METHOD.KAKAO]: 'badge-yellow',
      [DISPATCH_METHOD.EMAIL]: 'badge-blue',
      [DISPATCH_METHOD.PHONE]:  'badge-green',
    };
    const badgeCls = METHOD_BADGE_CLS[m] || 'badge-gray';
    const label = DISPATCH_METHOD_LABEL[m] || m || '-';
    const iconCfg = {
      [DISPATCH_METHOD.KAKAO]: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>`,
      [DISPATCH_METHOD.EMAIL]: '<i class="fas fa-envelope"></i>',
      [DISPATCH_METHOD.PHONE]:  '<i class="fas fa-phone-alt"></i>',
    };
    const icon = iconCfg[m] || '<i class="fas fa-question"></i>';
    return `<span class="badge ${badgeCls}">${icon} ${label}</span>`;
  };
  // 고객사 앱 알림 고정 배지
  const companyNoticeBadge = '<span class="badge badge-green"><i class="fas fa-check"></i> 인앱 발송</span>';

  const fmtD = v => {
    if(v == null || isNaN(v)) return '-';
    const n = parseFloat(v);
    if(n === Math.floor(n)) return `${n}일`;
    return `${parseFloat(n.toFixed(2))}일`;
  };

  tbody.innerHTML = pageData.map(r=>{
    const cls = CAT_BADGE_CLS[r.contract_type]||'badge-gray';
    return `<tr>
      <td style="font-size:12px;color:#374151;white-space:nowrap;">${fmtDt(r.sent_at)}</td>
      <td style="font-size:12px;color:#111827;font-weight:700;">${r.company_name||'-'}</td>
      <td style="font-weight:600;color:#111827;">${r.employee_name||'-'}</td>
      <td><span class="badge ${cls}">${contractTypeLabel(r.contract_type)}</span></td>
      <td class="right num">${fmtD(r.total_leave_days)}</td>
      <td class="right num" style="color:#6b7280;">${fmtD(r.used_leave_days)}</td>
      <td class="right num" style="color:#6366f1;font-weight:700;">${fmtD(r.remaining_leave_days)}</td>
      <td>${workerMethodBadge(r.worker_send_method)}</td>
      <td>${companyNoticeBadge}</td>
      <td style="font-size:12px;color:#6b7280;">${_resolveAdminName(r.sent_by)||'-'}</td>
      <td><span class="al-badge-basis">${r.annual_leave_basis||'-'}</span></td>
    </tr>`;
  }).join('');

  const pagEl = document.getElementById('lp-pagination');
  if(pagEl) pagEl.innerHTML = _rcBuildPagination(totalPages, _lpPage, '_lpPage', 'renderLpTable');
}

// ==================================================================
//  (이하 기존 코드)
// ==================================================================

/** 발송 이력 렌더링 */
function _cenDoSearch(){
  const fromEl = document.getElementById('cen-log-filter-date-from');
  const toEl = document.getElementById('cen-log-filter-date-to');
  const noticeEl = document.getElementById('cen-date-notice');
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
        if(noticeEl) noticeEl.className = 'ct-hint-error';
        toast('조회 기간은 최대 3개월까지 가능합니다.', 'error');
        return;
      }
    }
  }
  resetBorder();
  if(noticeEl) noticeEl.className = 'ct-hint-muted';
  _cenHistoryPage = 1;
  renderCenHistory();
}

function renderCenHistory(){
  const tbody = document.getElementById('cen-log-tbody');
  if(!tbody) return;

  const filterMethod  = document.getElementById('cen-log-filter-method')?.value  || '';
  const filterCompany = document.getElementById('cen-log-filter-company')?.value || '';
  const searchQ       = (document.getElementById('cen-log-search')?.value || '').trim().toLowerCase();
  const dateFrom      = document.getElementById('cen-log-filter-date-from')?.value || '';
  const dateTo        = document.getElementById('cen-log-filter-date-to')?.value || '';

  // 고객사 필터 옵션 동적 채우기 (최초 1회)
  const coSel = document.getElementById('cen-log-filter-company');
  if(coSel && coSel.options.length <= 1){
    const uniqueCos = [...new Map(_cenNoticeList.map(r=>[r.company_id, r.company_name])).entries()]
      .sort((a,b)=>(a[1]||'').localeCompare(b[1]||'','ko'));
    uniqueCos.forEach(([id,name])=>{
      const opt=document.createElement('option');
      opt.value=id; opt.textContent=name||id; coSel.appendChild(opt);
    });
  }

  let list = _cenNoticeList.filter(r=>{
    if(filterMethod  && r.notice_method  !== filterMethod)  return false;
    if(filterCompany && r.company_id     !== filterCompany) return false;
    if(searchQ && !(
      (r.employee_name||'').toLowerCase().includes(searchQ) ||
      (r.recipient||'').toLowerCase().includes(searchQ)
    )) return false;
    if(dateFrom || dateTo){
      const raw = r.sent_at || '';
      const sentDt = typeof raw === 'string' ? raw.slice(0,10) : String(raw).slice(0,10);
      if(dateFrom && sentDt < dateFrom) return false;
      if(dateTo   && sentDt > dateTo)   return false;
    }
    return true;
  }).sort((a,b)=>(a.employee_name||'').localeCompare(b.employee_name||'','ko'));

  const totalPages = Math.max(1, Math.ceil(list.length / CEN_PAGE_SIZE));
  if(_cenHistoryPage > totalPages) _cenHistoryPage = totalPages;
  const pageData = list.slice((_cenHistoryPage-1)*CEN_PAGE_SIZE, _cenHistoryPage*CEN_PAGE_SIZE);

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="9" class="cen-empty">
      <i class="fas fa-inbox"></i> 발송 이력이 없습니다.
    </td></tr>`;
    document.getElementById('cen-log-pagination').innerHTML = '';
    return;
  }

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d)?'-':d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };
  const methodBadge = m => {
    const METHOD_CLS = {
      [DISPATCH_METHOD.KAKAO]:  'badge-yellow',
      [DISPATCH_METHOD.EMAIL]:  'badge-blue',
      [DISPATCH_METHOD.MANUAL]: 'badge-green',
      [DISPATCH_METHOD.REISSUE]: 'badge-pink',
    };
    const badgeCls = METHOD_CLS[m] || 'badge-gray';
    const iconCfg = {
      [DISPATCH_METHOD.KAKAO]: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>`,
      [DISPATCH_METHOD.EMAIL]: '<i class="fas fa-envelope"></i>',
      [DISPATCH_METHOD.MANUAL]: '<i class="fas fa-hand-holding"></i>',
      '수정재발행': '<i class="fas fa-sync-alt"></i>',
    };
    const icon = iconCfg[m] || '<i class="fas fa-question"></i>';
    const label = DISPATCH_METHOD_LABEL[m] || m || '-';
    return `<span class="badge ${badgeCls}">${icon} ${label}</span>`;
  };
  const statusBadge = s => {
    const STATUS_CLS = {
      [DISPATCH_STATUS.COMPLETED]: 'badge-green',
      [DISPATCH_STATUS.FAILED]:    'badge-red',
      [DISPATCH_STATUS.PENDING]:   'badge-indigo',
    };
    const badgeCls = STATUS_CLS[s] || 'badge-gray';
    const iconCfg = {
      [DISPATCH_STATUS.COMPLETED]: '<i class="fas fa-check-circle"></i>',
      [DISPATCH_STATUS.FAILED]:    '<i class="fas fa-times-circle"></i>',
      [DISPATCH_STATUS.PENDING]:   '<i class="fas fa-clock"></i>',
    };
    const icon = iconCfg[s] || '<i class="fas fa-circle"></i>';
    const label = DISPATCH_STATUS_LABEL[s] || s || '-';
    return `<span class="badge ${badgeCls}">${icon} ${label}</span>`;
  };
  tbody.innerHTML = pageData.map((r,idx)=>`
    <tr class="al-dispatch-row">
      <td style="white-space:nowrap;">${fmtDt(r.noticed_at)}</td>
      <td style="font-size:12px;color:#111827;font-weight:700;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.company_name||''}">${r.company_name||'-'}</td>
      <td style="font-weight:700;color:#111827;">${r.employee_name||'-'}</td>
      <td><span class="badge ${CAT_BADGE_CLS[r.contract_type]||'badge-gray'}">${contractTypeLabel(r.contract_type)}</span></td>
      <td style="font-size:12px;color:#6b7280;">${r.contract_end||'-'}</td>
      <td>${methodBadge(r.notice_method)}</td>
      <td style="font-size:12px;color:#374151;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.recipient||''}">${r.recipient||'-'}</td>
      <td style="font-size:12px;color:#6b7280;">${r.noticed_by ? _resolveAdminName(r.noticed_by) : '<span style="font-size:11px;color:#6366f1;">시스템 자동발송</span>'}</td>
      <td>${r.is_read ? '<span class="badge badge-green"><i class="fas fa-check"></i> 읽음</span>' : '<span class="badge badge-red"><i class="fas fa-circle"></i> 미확인</span>'}</td>
    </tr>`).join('');

  _cenRenderPagination('cen-log-pagination', list.length, _cenHistoryPage, 'setCenHistoryPage');
}

function setCenHistoryPage(p){ _cenHistoryPage = p; renderCenHistory(); }

/** CEN 전용 페이지네이션 렌더 (CEN_PAGE_SIZE 기준) */
function _cenRenderPagination(containerId, total, page, fn){
  const container = document.getElementById(containerId);
  if(!container) return;
  if(total === 0){ container.innerHTML = ''; return; }
  const totalPages = Math.max(1, Math.ceil(total / CEN_PAGE_SIZE));
  const s = Math.min((page-1)*CEN_PAGE_SIZE+1, total);
  const e = Math.min(page*CEN_PAGE_SIZE, total);
  const btnRange = Array.from({length: Math.min(totalPages,5)}, (_,i)=>{
    const p = Math.max(1, Math.min(page-2, totalPages-4)) + i;
    return p > totalPages ? '' : `<button class="page-btn ${p===page?'active':''}" onclick="${fn}(${p})">${p}</button>`;
  }).join('');
  container.innerHTML = `
    <span class="page-info">${total}건 중 ${s}-${e}</span>
    <div class="page-btns">
      <button class="page-btn" onclick="${fn}(${page-1})" ${page<=1?'disabled':''}><i class="fas fa-chevron-left"></i></button>
      ${btnRange}
      <button class="page-btn" onclick="${fn}(${page+1})" ${page>=totalPages?'disabled':''}><i class="fas fa-chevron-right"></i></button>
    </div>`;
}
// ======================================================================
