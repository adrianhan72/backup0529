// ─── STATE ───
let allCompanies=[], allEmployees=[], allContracts=[], allPayrolls=[], allBillings=[];
let allExecutives=[], allRelatedParties=[];   // 등기임원 / 특수관계인 급여대상자
let allLeaveLedgers=[];   // 연차휴가 관리대장 캐시 (annual_leave_ledger 테이블 전체)
let allWLNotifications=[];   // 임금대장 미확인 알림 캐시
let editId={company:null,contract:null};
const ITEMS=10;
let pages={cont:1,pay:1};

// ─── 공통 헬퍼: 실질 이용중 고객사 판별 ──────────────────────────────────────
// DB status=ACTIVE이더라도 contract_end_date가 오늘 이하면 해지 완료로 간주
function isCompanyActive(c){
  if(!c || c.is_draft) return false;
  if(c.status !== COMPANY_STATUS.ACTIVE) return false;
  // 해지일이 설정되어 있고, 오늘 이하면 해지 완료
  if(c.contract_end_date){
    const today = new Date().toISOString().slice(0,10);
    if(c.contract_end_date <= today) return false;
  }
  return true;
}
// 유효 근로계약(active) 1건 이상 여부
function _hasActiveContract(companyId){
  return (allContracts||[]).some(ct =>
    ct.company_id === companyId && ct.status === CONTRACT_STATUS.ACTIVE
  );
}
// ── 발송관리 기본 기간: 최근 2개월 (오늘~2개월 전) ──
function _setDefaultDateRange(fromId, toId){
  const toEl = document.getElementById(toId);
  const fromEl = document.getElementById(fromId);
  if(!fromEl || !toEl) return;
  // 이미 사용자가 설정한 값이 있으면 덮어쓰지 않음
  if(fromEl.value || toEl.value) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const pad = n => String(n).padStart(2, '0');
  toEl.value = `${y}-${pad(m+1)}-${pad(d)}`;
  // 2개월 전 (월 경계 보정)
  let fromY = y, fromM = m - 2, fromD = d;
  if(fromM < 0){ fromY--; fromM += 12; }
  fromEl.value = `${fromY}-${pad(fromM+1)}-${pad(fromD)}`;
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 임시저장 삭제 공통 헬퍼
 * @param {string} id    레코드 ID
 * @param {string} table 테이블명 (companies/contracts/payrolls)
 * @param {string} label 확인 메시지용 이름
 */
async function _deleteDraft(id, table, label){
  if(!confirm(`'${label}' 임시저장을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
  try {
    // 계약 삭제 시 연결된 직원도 함께 정리
    let _empIdToCleanup = null;
    if(table==='contracts'){
      const c = allContracts.find(x => x.id === id);
      if(c && c.employee_id){
        const otherContracts = allContracts.filter(x => x.id !== id && x.employee_id === c.employee_id);
        if(otherContracts.length === 0) _empIdToCleanup = c.employee_id;
      }
    }
    await api(`../tables/${table}/${id}`, { method: 'DELETE' });
    // 계약 삭제 성공 후 직원 삭제 시도 (FK 참조 해제된 상태)
    if(_empIdToCleanup){
      fetch(`../tables/employees/${_empIdToCleanup}`, { method: 'DELETE' }).finally(() => loadEmployees());
    }
    toast(`'${label}' 임시저장이 삭제되었습니다.`, 'success');
    // 데이터 다시 로드 후 UI 갱신
    if(table==='companies'){ await loadCompanies(); renderCompanies(); }
    else if(table==='contracts'){ await loadContracts(); }
    else if(table==='payrolls'){ await loadPayrolls(); }
    // 대시보드 및 배너 갱신
    if(typeof renderDraftAlerts === 'function') renderDraftAlerts();
    if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
    if(typeof _renderContCoSummaryCards === 'function') _renderContCoSummaryCards();
    if(typeof _renderCompaniesDraftBanner === 'function') _renderCompaniesDraftBanner();
    if(typeof renderPIAllDraftBanner === 'function') renderPIAllDraftBanner();
    if(typeof renderDashboard === 'function') renderDashboard();
  } catch(e){
    toast('삭제 중 오류가 발생했습니다.', 'error');
    console.error(e);
  }
}

// ─── 전역 필터·선택 상태 (showPage/init에서 참조하므로 최상단 선언) ───

let currentContCompanyId = null;
let currentPayCompanyId = null;
let currentLsCompanyId = null;  // ← showPage에서 참조하므로 반드시 최상단 선언
// ─── 크로스 페이지 공유 고객사 (어느 페이지에서 선택해도 다른 페이지에 자동 반영) ───
let currentGlobalCompanyId = null;
let currentGlobalCompanyName = '';


// ─── PAYROLL INPUT MODAL ───
function openPayrollInputModal(companyId){
  const co = allCompanies.find(c=>c.id===companyId);
  if(co && !isCompanyActive(co)){
    toast('"' + co.company_name + '"은 이용중이 아닌 고객사입니다. 급여 입력이 불가합니다.', 'error');
    return;
  }
  // 급여 입력 페이지로 이동
  showPage('payroll-input',document.querySelector('[data-page="payroll-input"]'));

  // 페이지 렌더 후 고객사 바로 선택
  setTimeout(()=>{
    if(!co) return;

    // 이번 달로 먼저 설정
    const now = new Date();
    const yr = document.getElementById('pi-year');
    const mo = document.getElementById('pi-month');
    if(yr) yr.value = now.getFullYear();
    if(mo) mo.value = now.getMonth()+1;

    // selectPICompany 호출 → 카드 전환 + 직원 목록 로드까지 한번에 처리
    selectPICompany(companyId, co.company_name);
  }, 100);
}

// ─── 관리자 계정 캐시 ───
let allAdminAccounts = [];   // { id, username, display_name } 목록

async function loadAdminAccounts(){
  try{
    const res  = await fetch('../tables/admin_accounts?limit=200');
    const data = await res.json();
    allAdminAccounts = data.data || [];
  } catch(e){
    console.warn('[관리자 계정 로드 오류]', e);
    allAdminAccounts = [];
  }
}

/**
 * 현재 로그인된 관리자의 username 반환 (저장용)
 * 항상 username(로그인 ID)을 발송자 필드에 저장해야 display_name 변경 시 자동 반영됨
 */
function _getAdminUsername(){
  return sessionStorage.getItem('admin_username') || 'admin';
}

/**
 * username → display_name 변환 헬퍼 (렌더링 표시용)
 * - username 으로 먼저 조회
 * - 없으면 display_name 자체로 저장된 구 레코드 호환 (그대로 반환)
 * - 그래도 없으면 원본 값 반환
 */
function _resolveAdminName(val){
  if(!val || val === '-') return val || '-';
  const byUsername = allAdminAccounts.find(a => a.username === val);
  if(byUsername) return byUsername.display_name || val;
  const byDisplay  = allAdminAccounts.find(a => a.display_name === val);
  if(byDisplay)  return byDisplay.display_name || val;
  return val;
}

// ─── 대시보드 로딩 모달 ───
function _closeDashLoadingModal(){
  const m = document.getElementById('dash-loading-modal');
  if(!m) return;
  m.classList.add('closing');
  setTimeout(() => m.remove(), 320);
}

// ─── 버튼 Ripple 효과 ───
(function _initRipple(){
  function addRipple(e){
    const btn = e.currentTarget;
    if(btn.disabled || btn.getAttribute('disabled')) return;
    // 기존 ripple 제거
    btn.querySelectorAll('.btn-ripple').forEach(r => r.remove());
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }
  // 동적 DOM 대응: document 레벨 위임
  document.addEventListener('mousedown', function(e){
    const btn = e.target.closest('.btn, .btn-renew, .btn-terminate, .btn-recontract, .btn-void, .btn-draft, .btn-draft-edit, .btn-sb, .cen-bulk-btn, .btn-amend, .btn-cft-confirm, .btn-fixed-terminate, .btn-docx, .btn-print, .btn-final-reg, .std-update-btn, .al-promo-btn');
    if(btn) addRipple.call(null, {currentTarget: btn, clientX: e.clientX, clientY: e.clientY});
  });
})();

// ─── INIT ───
let _dataReady = false;       // 핵심 데이터 로드 완료
let _heavyDataReady = false;  // 급여·청구 데이터 로드 완료

async function init(){
  try {
    const t0 = performance.now();

    // ── 1단계: critical path – 화면 표시에 필수인 3개 테이블만 먼저 로드 ──
    showSkeletons();
    await Promise.all([loadCompanies(), loadEmployees(), loadContracts(), loadAdminAccounts(), loadCompanyHistories(), loadExecutives(), loadRelatedParties()]);

    // 데이터 정규화 (한글 레거시 → 영문)
    _normalizeLoadedData();

    const t1 = Math.round(performance.now() - t0);

    _dataReady = true;
    hideSkeletons();

    // 대시보드 외부 페이지 로드 (기본 페이지) + active 클래스 부여
    if(window._loadExternalPage) { await _loadExternalPage('dashboard'); }
    const _dashEl = document.getElementById('page-dashboard');
    if(_dashEl && !_dashEl.classList.contains('active')) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      _dashEl.classList.add('active');
    }

    // 대시보드를 기본 활성 페이지로 표시 (active 클래스 추가)
    await showPage('dashboard', document.querySelector('.menu-item[data-page="dashboard"]'));

    // 핵심 데이터만으로 즉시 화면 렌더링
    initMonthFilter(); initPIMonths(); initPIYears();
    renderDashboard(); renderCompanies(); renderContracts();
    populateFilters(); populatePICompanies(); initBreakSelects();
    _syncMenuLabels();  // PAGE_LABELS 기준으로 사이드바 메뉴명 동기화
    
    // ── 페어 계약 새 창에서 열기: sessionStorage에 저장된 계약 자동 조회 ──
    _restorePairContractWindow();
    
    if(document.getElementById('page-contracts')?.classList.contains('active')){
      renderContCompanyList();
    }
    // 임금대장 페이지가 이미 열려 있으면 showPage 흐름 전체 재실행 (데이터 로드 완료 후)
    if(document.getElementById('page-wage-ledger')?.classList.contains('active')){
      const _wlMenuEl = document.querySelector('[data-page="wage-ledger"]');
      showPage('wage-ledger', _wlMenuEl);
    }
    // 퇴직급여 페이지가 이미 열려 있으면 고객사 목록 즉시 렌더링
    if(document.getElementById('page-severance')?.classList.contains('active')){
      renderSevCompanyList();
    }

    // ── 2단계: lazy load – 급여·청구 데이터 + 산정기준 데이터 백그라운드 로드 ──
    loadHeavyData();
    loadStandards().then(()=>{ _renderStandardsBanner(); });
    // 중요공지 예약 발송 타이머 복원 (미발송 scheduled 건 복구) + 폴링 시작
    _gnRestoreScheduledTimers();
    _gnStartPolling();

  } catch(err) {
    console.error('[급여관리 오류 상세]', err.name, err.message, err.stack);
    hideSkeletons();
    toast('데이터 로드 실패: ' + err.message, 'error');
  }
}

// 급여·청구 데이터 백그라운드 로드
async function loadHeavyData(){
  try {
    const t0 = performance.now();
     await Promise.all([loadPayrolls(), loadBillings(), loadAllSendLogs(), loadWLNotifications(), cenLoadHistory(), loadSeveranceNotices(), loadContractDispatchList(true), loadConsentDispatchList(true), loadLeaveLedgers()]);
    const elapsed = Math.round(performance.now() - t0);
    _heavyDataReady = true;
    // 현재 보이는 페이지에 맞게 추가 렌더링
    renderPayrolls();
    renderBillings();
    // 임금대장 페이지가 열려 있고 고객사가 선택된 상태라면 필터 활성화 + 재렌더링
    if(_wlCompanyId && document.getElementById('page-wage-ledger')?.classList.contains('active')){
      _setWLFilterReady(true);
      renderWageLedger();
    }
    // [사용료 숨김] 대시보드 사용료 카드·차트 - 원복 시 아래 주석 해제
    // renderDashBillingCards();
    // renderBillingTrendChart();
    // 고객사 카드 갱신 (사용료 현황 섹션은 주석처리됨)
    renderDashboardCompanies();
    // 대시보드 트렌드 차트 재렌더링 (allPayrolls 로드 완료 후)
    renderCompanyTrendChart();
    renderEmployeeTrendChart();
    // 대시보드 미발송 배너 갱신
    _updateDashUnsentContractBanner();
    _updateDashUnsentBanner();
    _updateDashConsentBanner();
    // 임금대장 메뉴 뱃지 갱신
    _updateWLMenuBadge();
    // 대시보드 계약만료 통지 / 정규직 전환 / 퇴직금 지급 이력 배너 갱신 (heavy 로드 완료 후)
    // 로딩 모달 닫기 (페이드아웃 후 제거)
    _closeDashLoadingModal();
    // 급여 입력 전체 임시저장 배너 갱신 (활성 여부 무관 — 다음 진입 시 즉시 표시)
    renderPIAllDraftBanner();
    if(document.getElementById('page-dashboard')?.classList.contains('active')){
      renderDraftAlerts();      // 급여 임시저장 포함 전체 임시저장 카드 갱신 (allPayrolls 로드 완료 후)
      renderDashProbationBanner();
      renderDashSeveranceBanner();
    }
    // 수습 근로자 관리 페이지 활성화 시 고객사 칩 갱신
    if(document.getElementById('page-probation-mgmt')?.classList.contains('active')){
      if(!_probMgmtSelectedCoId) renderProbMgmtCompanyList();
      else renderProbationMgmtTable();
    }
    // 연차 관리 페이지가 열려 있고 고객사가 선택된 상태라면 테이블 재렌더링
    // (관리대장 데이터 + 급여 데이터 로드 완료 후 사용일수 반영)
    if(_alCompanyId && document.getElementById('page-annual-leave')?.classList.contains('active')){
      renderAlTable();
    }
    // 좌측 메뉴 할일 배지 업데이트 (heavy 로드 완료 후 전체 데이터 확정)
    updateMenuBadges();
    // 급여명세서 발송 관리 고객사 칩 배지 갱신 (발송이력·급여데이터 확정 후)
    if(!document.getElementById('pss-main-section') || document.getElementById('pss-main-section').style.display === 'none'){
      renderPssCompanyList();
    }
  } catch(err) {
    console.error('[급여관리] 급여·청구 로드 실패:', err);
  }
}

// ── 스켈레톤 표시/숨기기 ──
function showSkeletons(){
  // 대시보드 고객사 영역
  const dashComp = document.getElementById('dash-companies');
  if(dashComp) dashComp.innerHTML = skeletonRows(3, 'dash-company-skeleton');
  // 사용료 카드 영역
  ['dash-bill-total','dash-bill-paid','dash-bill-pending','dash-bill-unpaid'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.innerHTML = '<span class="skel-text" style="width:80px;"></span>';
  });
}
function hideSkeletons(){
  document.querySelectorAll('.skel-text, .dash-company-skeleton').forEach(el=>el.remove());
}
function skeletonRows(n, cls=''){
  return Array.from({length:n}, (_,i)=>`
    <div class="${cls}" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9;animation:skelPulse 1.2s ease-in-out ${i*0.15}s infinite;">
      <div class="skel-text" style="width:120px;height:14px;border-radius:4px;"></div>
      <div class="skel-text" style="width:60px;height:14px;border-radius:4px;"></div>
      <div class="skel-text" style="width:80px;height:14px;border-radius:4px;"></div>
    </div>`).join('');
}

// ─── API ───
const api=async(url,opt={})=>{
  const r=await fetch(url,opt);
  if(!r.ok){
    const errBody = await r.text();
    console.error('[API 오류]', url, r.status, errBody);
    throw new Error(`[${r.status}] ${errBody}`);
  }
  return r.status===204?null:r.json();
};

// ── 데이터 로드 후 정규화 (한글 레거시 → 영문) ──
function _normalizeLoadedData() {
  allCompanies.forEach(c => { if (c.status) c.status = normalizeCompanyStatus(c.status); });
  allEmployees.forEach(e => {
    if (e.status) e.status = normalizeEmpStatus(e.status);
    if (e.employment_category) e.employment_category = normalizeContractType(e.employment_category);
  });
  allContracts.forEach(c => {
    if (c.status) c.status = normalizeContractStatus(c.status);
    if (c.contract_type) c.contract_type = normalizeContractType(c.contract_type);
  });
}

async function loadCompanies(){
  const d=await api('../tables/companies?limit=100');
  allCompanies=(d.data||[]).map(c=>{
    // allowance_config: DB에서 JSON 문자열로 오는 경우 파싱
    if(typeof c.allowance_config === 'string'){
      try { c.allowance_config = JSON.parse(c.allowance_config); } catch(e){ c.allowance_config = {}; }
    }
    return c;
  });
}
let allCompanyHistories=[];
async function loadCompanyHistories(){
  const d=await api('../tables/company_history?limit=500');
  allCompanyHistories=(d.data||[]).map(h=>{
    // changed_at: 문자열 '1234567.0' → 숫자
    if(typeof h.changed_at === 'string') h.changed_at = parseFloat(h.changed_at) || 0;
    // changes: JSON 문자열 → 배열
    if(typeof h.changes === 'string'){ try{ h.changes = JSON.parse(h.changes); }catch(e){ h.changes = []; } }
    // snapshot: JSON 문자열 → 객체, allowance_config 파싱
    if(typeof h.snapshot === 'string'){ try{ h.snapshot = JSON.parse(h.snapshot); }catch(e){ h.snapshot = {}; } }
    if(h.snapshot && typeof h.snapshot.allowance_config === 'string'){
      try{ h.snapshot.allowance_config = JSON.parse(h.snapshot.allowance_config); }catch(e){ h.snapshot.allowance_config = {}; }
    }
    return h;
  });
}
async function loadEmployees(){const d=await api('../tables/employees?limit=200');allEmployees=d.data||[]}
async function loadExecutives(){const d=await api('../tables/registered_executives?limit=200');allExecutives=d.data||[]}
async function loadRelatedParties(){const d=await api('../tables/related_party_workers?limit=200');allRelatedParties=d.data||[]}
async function loadContracts(){
  const d=await api('../tables/contracts?limit=200');
  allContracts=d.data||[];
  // 계약예정 → 활성 / 해지예정 → 해지 / 기간만료 → 만료 자동 전환 체크
  await autoActivatePendingContracts();
  await autoProcessTerminatePendingContracts();
  await autoExpireFixedTermContracts();
}

/* 계약예정 상태 중 contract_start <= 오늘인 계약을 활성으로 전환 */
async function autoActivatePendingContracts(){
  const todayStr = new Date().toISOString().slice(0,10);
  const toActivate = allContracts.filter(c =>
    c.status === CONTRACT_STATUS.PENDING && c.contract_start && c.contract_start <= todayStr
  );
  if(!toActivate.length) return;
  await Promise.all(toActivate.map(async c => {
    try {
            await fetch(`../tables/contracts/${c.id}`, {
              method:'PATCH', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ status: CONTRACT_STATUS.ACTIVE })
            });
      const idx = allContracts.findIndex(x => x.id === c.id);
      if(idx > -1) allContracts[idx].status = CONTRACT_STATUS.ACTIVE;
    } catch(e){ console.warn('[자동전환 오류]', c.id, e); }
  }));
}

/**
 * 페어 계약 새 창 복원: sessionStorage에 저장된 계약 ID가 있으면 해당 계약 조회
 */
function _restorePairContractWindow(){
  try {
    const _pairId = sessionStorage.getItem('_pairContractId');
    const _pairCoId = sessionStorage.getItem('_pairCompanyId') || '';
    if(_pairId && allContracts.length > 0){
      sessionStorage.removeItem('_pairContractId');
      sessionStorage.removeItem('_pairCompanyId');
      const _c = allContracts.find(x => x.id === _pairId);
      if(_c){
        // 고객사 선택 후 계약 조회
        currentContCompanyId = _pairCoId || _c.company_id;
        currentGlobalCompanyId = currentContCompanyId;
        showPage('contracts', document.querySelector('[data-page="contracts"]'));
        setTimeout(() => {
          if(typeof selectContCompany === 'function'){
            const _co = allCompanies.find(x => x.id === currentContCompanyId);
            selectContCompany(currentContCompanyId, _co?.company_name || '');
          }
          setTimeout(() => viewContract(_pairId), 800);
        }, 500);
      }
    }
  } catch(e){}
}

/* 해지예정/퇴사예정 상태 중 terminate_date <= 오늘인 계약을 해지로 전환 */
async function autoProcessTerminatePendingContracts(){
  const todayStr = new Date().toISOString().slice(0,10);
  const toTerminate = allContracts.filter(c =>
    c.status === CONTRACT_STATUS.TERMINATE_PENDING && c.terminate_date && c.terminate_date <= todayStr
  );
  if(!toTerminate.length) return;
  await Promise.all(toTerminate.map(async c => {
    try {
      await fetch(`../tables/contracts/${c.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status: CONTRACT_STATUS.TERMINATED })
      });
      const idx = allContracts.findIndex(x => x.id === c.id);
      if(idx > -1) allContracts[idx].status = CONTRACT_STATUS.TERMINATED;
      // P6: 갱신 페어가 있으면 정리 (계약이 해지되었으므로 페어 링크 무효화)
      if(typeof breakPair === 'function') breakPair(c).catch(e => console.warn('[자동해지 페어정리]', e));
    } catch(e){ console.warn('[자동해지전환 오류]', c.id, e); }
  }));
}

/* 계약직/일용직 중 contract_end < 오늘인 활성 계약을 만료로 전환 */
async function autoExpireFixedTermContracts(){
  const todayStr = new Date().toISOString().slice(0,10);
  const FIXED_TERM_TYPES = ['fixed_term', 'fixed_term_probation', 'daily', '계약직', '계약직 수습', '일용직'];
  const toExpire = allContracts.filter(c => {
    if (!CONTRACT_ACTIVE_STATUSES.includes(c.status)) return false;
    if (c.is_draft) return false;
    const effectiveEnd = c.terminate_date || c.contract_end || '';
    if (!effectiveEnd || effectiveEnd >= todayStr) return false;
    const ct = (c.contract_type || '').toLowerCase();
    return FIXED_TERM_TYPES.includes(ct);
  });
  if(!toExpire.length) return;
  await Promise.all(toExpire.map(async c => {
    try {
      await fetch(`../tables/contracts/${c.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status: CONTRACT_STATUS.EXPIRED })
      });
      const idx = allContracts.findIndex(x => x.id === c.id);
      if(idx > -1) allContracts[idx].status = CONTRACT_STATUS.EXPIRED;
    } catch(e){ console.warn('[자동만료전환 오류]', c.id, e); }
  }));
}

async function loadPayrolls(){
  // limit=300으로 잘릴 수 있으므로 전체 페이지네이션으로 모두 로드
  let page=1, all=[];
  while(true){
    const d=await api(`../tables/payrolls?limit=500&page=${page}`);
    const chunk=d.data||[];
    all=all.concat(chunk);
    if(all.length>=(d.total||0)||chunk.length<500) break;
    page++;
  }
  allPayrolls=all;
}
/** payroll_items 글로벌 캐시 + 로더 */
let allPayrollItems = [];
async function loadPayrollItems(payrollId = null){
  if (payrollId) {
    const d = await api(`../tables/payroll_items?payroll_id=${payrollId}&limit=100&sort=sort_order`);
    return d.data || [];
  }
  // 전체 로드 (필요 시)
  let page = 1, all = [];
  while (true) {
    const d = await api(`../tables/payroll_items?limit=500&page=${page}`);
    const chunk = d.data || [];
    all = all.concat(chunk);
    if (all.length >= (d.total || 0) || chunk.length < 500) break;
    page++;
  }
  allPayrollItems = all;
  return all;
}

/** payroll_items[] → payrolls 평면 객체로 변환 (UI 호환용) */
function payrollItemsToFlat(items) {
  const flat = {};
  if (!Array.isArray(items)) return flat;
  for (const item of items) {
    const def = ALLOWANCE_TYPES.find(a => a.type === item.item_type);
    if (!def) continue;
    // item_type → payrolls 컬럼명 매핑
    const colMap = {
      weekly_holiday: 'weekly_holiday_pay', position: 'position_allowance',
      skill: 'skill_allowance', license: 'license_allowance',
      overtime: 'overtime_pay', night: 'night_pay', holiday: 'holiday_pay',
      transportation: 'transportation_allowance', self_driving: 'self_driving_allowance',
      meal: 'meal_allowance', childcare: 'childcare_allowance',
      research: 'research_allowance', communication: 'communication_allowance',
      fitness: 'fitness_allowance', self_dev: 'self_dev_allowance',
      book: 'book_allowance', overseas: 'overseas_allowance',
      contract_etc: 'contract_etc_allowance', annual_leave: 'annual_leave_pay',
      bonus: 'bonus_pay', performance: 'performance_pay',
      actual_expense: 'actual_expense_pay', comm_expense: 'communication_pay',
      etc: 'etc_allowance', site: 'site_allowance',
      remote_area: 'remote_area_allowance', regular_bonus: 'regular_bonus',
      hazard: 'hazard_allowance',
    };
    const colName = colMap[item.item_type];
    if (colName) flat[colName] = item.amount || 0;
    if (def.hasPayType && item.pay_type) {
      const payTypeColMap = {
        transportation: 'transportation_pay_type', self_driving: 'self_driving_pay_type',
        meal: 'meal_pay_type', childcare: 'childcare_pay_type',
        research: 'research_pay_type', communication: 'communication_pay_type',
        fitness: 'fitness_pay_type', self_dev: 'self_dev_pay_type',
        book: 'book_pay_type', overseas: 'overseas_pay_type',
        etc: 'etc_allowance_memo',
      };
      const ptCol = payTypeColMap[item.item_type];
      if (ptCol) flat[ptCol] = item.pay_type;
    }
    if (item.item_type === 'etc') flat['etc_allowance_memo'] = item.memo || '';
  }
  return flat;
}

/** payrolls 평면 객체 → payroll_items[] 로 변환 */
function payrollFlatToItems(flat) {
  const items = [];
  ALLOWANCE_TYPES.forEach((def, idx) => {
    const colMap = {
      weekly_holiday: 'weekly_holiday_pay', position: 'position_allowance',
      skill: 'skill_allowance', license: 'license_allowance',
      overtime: 'overtime_pay', night: 'night_pay', holiday: 'holiday_pay',
      transportation: 'transportation_allowance', self_driving: 'self_driving_allowance',
      meal: 'meal_allowance', childcare: 'childcare_allowance',
      research: 'research_allowance', communication: 'communication_allowance',
      fitness: 'fitness_allowance', self_dev: 'self_dev_allowance',
      book: 'book_allowance', overseas: 'overseas_allowance',
      contract_etc: 'contract_etc_allowance', annual_leave: 'annual_leave_pay',
      bonus: 'bonus_pay', performance: 'performance_pay',
      actual_expense: 'actual_expense_pay', comm_expense: 'communication_pay',
      etc: 'etc_allowance', site: 'site_allowance',
      remote_area: 'remote_area_allowance', regular_bonus: 'regular_bonus',
      hazard: 'hazard_allowance',
    };
    const colName = colMap[def.type];
    const amount = parseFloat(flat[colName]) || 0;
    if (amount === 0 && def.type !== 'etc') return;
    const item = { item_type: def.type, amount, sort_order: idx };
    if (def.hasPayType) {
      const ptMap = {
        transportation: 'transportation_pay_type', self_driving: 'self_driving_pay_type',
        meal: 'meal_pay_type', childcare: 'childcare_pay_type',
        research: 'research_pay_type', communication: 'communication_pay_type',
        fitness: 'fitness_pay_type', self_dev: 'self_dev_pay_type',
        book: 'book_pay_type', overseas: 'overseas_pay_type',
        etc: 'etc_allowance_memo',
      };
      item.pay_type = flat[ptMap[def.type]] || null;
      if (def.type === 'etc') item.memo = flat['etc_allowance_memo'] || '';
    }
    items.push(item);
  });
  return items;
}

async function loadWLNotifications(){
  const d=await api('../tables/wage_ledger_notifications?limit=500');
  allWLNotifications=(d.data||[]).filter(n=>!n.is_read);
}

// 대시보드 미발송 배너용 전체 발송 로그 캐시
let _allSendLogs = [];
async function loadAllSendLogs(){
  const d = await api('../tables/payroll_send_logs?limit=500');
  _allSendLogs = d.data || [];
}
async function loadBillings(){const d=await api('../tables/billing?limit=100');allBillings=d.data||[]}
async function loadLeaveLedgers(){
  // 전 직원·전 연도 관리대장 전체 로드 (페이지네이션)
  let page=1, all=[];
  while(true){
    const d=await api(`../tables/annual_leave_ledger?limit=500&page=${page}`);
    const chunk=d.data||[];
    all=all.concat(chunk);
    if(all.length>=(d.total||0)||chunk.length<500) break;
    page++;
  }
  allLeaveLedgers=all;
}

// ─── HELPERS ───
const won=n=>Math.round(n||0).toLocaleString('ko-KR')+'원';
const won2=n=>Math.round(n||0).toLocaleString('ko-KR');
const getCoName=id=>{const c=allCompanies.find(x=>x.id===id);return c?c.company_name:'-'};
const getEmpName=id=>{const e=allEmployees.find(x=>x.id===id);if(e)return e.name;const ex=(allExecutives||[]).find(x=>x.id===id);if(ex)return ex.name;const rp=(allRelatedParties||[]).find(x=>x.id===id);if(rp)return rp.name;if(typeof id==='string'&&id.startsWith('rep_')){const parts=id.split('_');const idx=parseInt(parts.pop());const coId2=parts.join('_');const co2=(allCompanies||[]).find(c=>c.id===coId2);if(co2){let reps=[];try{reps=typeof co2.representatives==='string'?JSON.parse(co2.representatives):(co2.representatives||[]);}catch(e){}return (reps[idx]||{}).name||'-';}}return '-'};
const empCatBadge=c=>(CAT_BADGE_CLS[c]||'badge-gray');

// ─── 금액 입력 필드 포맷 유틸 ───
// 숫자 문자열 → 천단위 쉼표 문자열 (음수 지원)
function formatComma(raw){
  const isNeg = String(raw).startsWith('-');
  const digits = String(raw).replace(/[^0-9]/g,'');
  if(!digits) return '';
  return (isNeg?'-':'')+parseInt(digits,10).toLocaleString('ko-KR');
}
// input[data-amount] 요소의 oninput 핸들러: 커서 위치 유지 + 쉼표 삽입
function onAmountInput(el, calcFn){
  const raw = el.value.replace(/,/g,'').replace(/원$/,'');
  if(raw===''||raw==='-'||raw==='0'){el.value=raw;if(calcFn)calcFn();return;}
  const isNeg = raw.startsWith('-');
  const digits = raw.replace(/[^0-9]/g,'');
  if(!digits){el.value=isNeg?'-':'';if(calcFn)calcFn();return;}
  const formatted = (isNeg?'-':'')+parseInt(digits,10).toLocaleString('ko-KR')+'원';
  const selEnd = el.selectionEnd;
  const oldLen = el.value.length;
  el.value = formatted;
  const diff = formatted.length - oldLen;
  // 커서 위치 보정 (원 제외한 위치로)
  const cursorPos = Math.min(selEnd+diff, formatted.length-1);
  try{ el.setSelectionRange(cursorPos, cursorPos); }catch(e){}
  if(calcFn) calcFn();
}
// input[data-amount] 요소에 값 세팅 (숫자 → 쉼표+원 포맷)
function setAmountVal(id, num){
  const el = document.getElementById(id);
  if(!el) return;
  const n = Math.round(num||0);
  el.value = n===0 ? '' : n.toLocaleString('ko-KR')+'원';
}
// input[data-amount] 요소에서 숫자 읽기 (쉼표·원 제거 후 parseFloat)
function getAmountVal(id){
  const el = document.getElementById(id);
  if(!el) return 0;
  return parseFloat(el.value.replace(/,/g,'').replace(/원$/,''))||0;
}

function toast(msg,type='success'){
  const t=document.getElementById('toast');
  t.textContent=(type==='success'?'✅ ':'❌ ')+msg;
  t.className='toast '+type+' show';
  setTimeout(()=>t.className='toast',2600);
}
function openModal(id){document.getElementById(id).classList.add('open')}
// ─── 계약 도움말 모달 ───
function openContractHelp(){
  document.getElementById('contract-help-modal').classList.add('open');
}
function closeContractHelp(){
  document.getElementById('contract-help-modal').classList.remove('open');
}
function closeModal(id){
  document.getElementById(id).classList.remove('open');
  // 계약 모달이 닫힐 때 readonly 클래스 및 플래그 초기화
  if(id==='contract-modal'){
    const modalEl = document.querySelector('#contract-modal .modal');
    if(modalEl) modalEl.classList.remove('ct-readonly');
    _recontractEmpId = null;
    _currentDraftId  = null;
    // 임시저장 안내 텍스트 초기화
    const draftInfoEl = document.getElementById('ct-draft-saved-info');
    if(draftInfoEl){ draftInfoEl.style.display='none'; draftInfoEl.textContent=''; }
    // 통합 상태 배너 숨김 및 버튼 초기화
    _resetStatusBanner();
  }
  // 고객사 모달 닫힐 때 draft ID 초기화
  if(id==='company-modal'){
    _currentCompanyDraftId = null;
    const cmDraftInfo = document.getElementById('cm-draft-saved-info');
    if(cmDraftInfo){ cmDraftInfo.style.display='none'; cmDraftInfo.textContent=''; }
  }
}
/** PAGE_LABELS 기준으로 사이드바 메뉴명을 일괄 동기화 */
function _syncMenuLabels(){
  document.querySelectorAll('.menu-item[data-page]').forEach(el => {
    const page = el.dataset.page;
    if(PAGE_LABELS[page]){
      const textNodes = Array.from(el.childNodes).filter(n => n.nodeType === 3);
      if(textNodes.length > 0){
        textNodes[0].textContent = ' ' + PAGE_LABELS[page];
      }
    }
  });
}

async function showPage(name,el){
    if(window._loadExternalPage) { await _loadExternalPage(name); }
  try{
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m=>m.classList.remove('active'));
  const _pageEl=document.getElementById('page-'+name);
  if(!_pageEl){console.error('[showPage] 페이지 엘리먼트 없음: page-'+name);return;}
  _pageEl.classList.add('active');
  // 페이지 전환 시 스크롤 최상단 이동
  window.scrollTo(0,0);
  document.querySelector('.content')?.scrollTo(0,0);
  document.getElementById('topbar-title').textContent = PAGE_LABELS[name] || name;
  // 도움말 버튼: 근로 계약 관리 페이지에서만 표시
  const _helpBtn = document.getElementById('topbar-help-btn');
  if(_helpBtn) _helpBtn.style.display = (name === 'contracts') ? '' : 'none';
  // 페이지 새로고침 버튼: 데이터 재조회가 필요한 페이지에서만 표시
  const _refreshBtn = document.getElementById('topbar-refresh-btn');
  if(_refreshBtn) {
    const _refreshPages = ['company-notice-log','contract-dispatch','consent-dispatch','contract-expiry-notice','annual-leave','leave-promotion','regular-conversion'];
    _refreshBtn.style.display = _refreshPages.includes(name) ? '' : 'none';
  }
  if(name==='labor-status'){
    // 데이터 미준비 — 칩 영역 스피너
    if(!_dataReady){
      const chips = document.getElementById('ls-company-chips');
      if(chips) chips.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9ca3af;padding:8px 0;"><div style="width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>고객사 목록 불러오는 중...</div>`;
      document.getElementById('ls-company-select-card').style.display = '';
      document.getElementById('ls-list-section').style.display = 'none';
      if(el) el.classList.add('active');
      return;
    }
    // 글로벌 공유: 선택된 고객사가 있으면 무조건 selectLsCompany()로 UI 완전 복원
    if(currentGlobalCompanyId){
      const _gco = allCompanies.find(c=>c.id===currentGlobalCompanyId);
      if(_gco){ if(el) el.classList.add('active'); selectLsCompany(currentGlobalCompanyId, _gco.company_name); return; }
    }
    // 선택된 고객사 없음 — 고객사 선택 화면 표시
    renderLsCompanyList();
    document.getElementById('ls-company-select-card').style.display = '';
    document.getElementById('ls-list-section').style.display = 'none';
  }
  if(name==='contracts'){
    // 데이터 미준비 — 칩 영역 스피너
    if(!_dataReady){
      const chips = document.getElementById('cont-company-chips');
      if(chips) chips.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9ca3af;padding:8px 0;"><div style="width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>고객사 목록 불러오는 중...</div>`;
      document.getElementById('cont-company-select-card').style.display = '';
      document.getElementById('cont-list-section').style.display = 'none';
      if(el) el.classList.add('active');
      return;
    }
    // 글로벌 공유: 선택된 고객사가 있으면 무조건 selectContCompany()로 UI 완전 복원
    if(currentGlobalCompanyId){
      const _gco = allCompanies.find(c=>c.id===currentGlobalCompanyId);
      if(_gco){ if(el) el.classList.add('active'); selectContCompany(currentGlobalCompanyId, _gco.company_name); return; }
    }
    // 선택된 고객사 없음 — 고객사 선택 화면 표시
    renderContCompanyList();
    document.getElementById('cont-company-select-card').style.display = '';
    document.getElementById('cont-list-section').style.display = 'none';
    // 고객사 선택과 무관하게 상단 배너(임시저장 등)는 항상 갱신
    if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
  }
  if(name==='payroll-input'){
    // 페이지 진입 시 년월 option 목록 재생성
    // ※ initPIYears/initPIMonths 내부에서 기존 선택값을 보존하므로
    //   수정 모드 또는 목록 복귀 시 이전에 선택한 년월이 유지됨
    initPIYears(); initPIMonths();

    // 데이터 미준비 — 칩 영역 스피너
    if(!_dataReady){
      const chips = document.getElementById('pi-company-chips');
      if(chips) chips.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9ca3af;padding:8px 0;"><div style="width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>고객사 목록 불러오는 중...</div>`;
      document.getElementById('pi-company-select-card').style.display = '';
      document.getElementById('pi-input-section').style.display = 'none';
      if(el) el.classList.add('active');
      // heavy 데이터 미준비 시에도 배너 갱신 시도 (이미 로드됐으면 표시)
      renderPIAllDraftBanner();
      return;
    }
    // 급여 입력 페이지 진입 시 전체 임시저장 배너 항상 갱신 (return 분기 전에 실행)
    renderPIAllDraftBanner();
    // 글로벌 공유: 선택된 고객사가 있으면 무조건 selectPICompany()로 UI 완전 복원
    // (급여 입력은 이용중 고객사만 허용)
    if(currentGlobalCompanyId){
      const _gco = allCompanies.find(c => c.id === currentGlobalCompanyId && isCompanyActive(c));
      if(_gco){
        if(el) el.classList.add('active');
        renderPICompanyList();
        selectPICompany(currentGlobalCompanyId, _gco.company_name);
        return;
      }
    }
    // 선택된 고객사 없음 — 고객사 선택 화면 표시
    renderPICompanyList();
    document.getElementById('pi-company-select-card').style.display = '';
    document.getElementById('pi-input-section').style.display = 'none';
  }
  if(name==='payrolls'){
    // 데이터 미준비 — 칩 영역 스피너
    if(!_dataReady){
      const chips = document.getElementById('pay-company-chips');
      if(chips) chips.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9ca3af;padding:8px 0;"><div style="width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>고객사 목록 불러오는 중...</div>`;
      document.getElementById('pay-company-select-card').style.display = '';
      document.getElementById('pay-list-section').style.display = 'none';
      document.getElementById('pay-excel-btn').style.display = 'none';
      if(el) el.classList.add('active');
      return;
    }
    // 글로벌 공유: 선택된 고객사가 있으면 무조건 selectPayCompany()로 UI 완전 복원
    if(currentGlobalCompanyId){
      const _gco = allCompanies.find(c=>c.id===currentGlobalCompanyId);
      if(_gco){ if(el) el.classList.add('active'); selectPayCompany(currentGlobalCompanyId, _gco.company_name); return; }
    }
    // 선택된 고객사 없음 — 고객사 선택 화면 표시
    renderPayCompanyList();
    document.getElementById('pay-company-select-card').style.display = '';
    document.getElementById('pay-list-section').style.display = 'none';
    document.getElementById('pay-excel-btn').style.display = 'none';
  }
  if(name==='payslip-send'){
    // 데이터 미준비 — 스피너 표시
    if(!_dataReady){
      if(el) el.classList.add('active');
      return;
    }
    // 글로벌 공유: 선택된 고객사가 있으면 자동 선택
    _setDefaultDateRange('pss-filter-date-from', 'pss-filter-date-to');
    renderPssCompanyList();
    if(currentGlobalCompanyId){
      const _gco = allCompanies.find(c=>c.id===currentGlobalCompanyId && isCompanyActive(c));
      if(_gco){ if(el) el.classList.add('active'); selectPssCompany(currentGlobalCompanyId, _gco.company_name); return; }
    }
    if(el) el.classList.add('active');
  }
  if(name==='admin-accounts'){
    renderAdminAccounts();
  }
  if(name==='standards'){
    renderInsuranceRates();
    renderMinimumWages();
    // 탭 초기화 (항상 첫번째 탭)
    switchStdTab('insurance');
  }
  if(name==='wage-ledger'){
    // 데이터 미준비 상태 → 로딩 안내 후 데이터 완료 시 자동 재렌더링
    if(!_dataReady){
      const chips = document.getElementById('wl-company-chips');
      if(chips) chips.innerHTML = `<div style="font-size:12.5px;color:#9ca3af;padding:8px 0;display:flex;align-items:center;gap:6px;"><i class="fas fa-circle-notch fa-spin"></i> 고객사 목록 불러오는 중...</div>`;
      document.getElementById('wl-company-select-card').style.display='';
      document.getElementById('wl-main-section').style.display='none';
      if(el) el.classList.add('active');
      return;
    }
    // 글로벌 공유: 다른 페이지에서 선택된 고객사가 있으면 자동 선택
    if(currentGlobalCompanyId){
      const _gco = allCompanies.find(c=>c.id===currentGlobalCompanyId);
      if(_gco){ if(el) el.classList.add('active'); selectWLCompany(currentGlobalCompanyId, _gco.company_name); return; }
    }
    // 이전에 직접 선택한 고객사 유지
    renderWLCompanyList();
    if(_wlCompanyId){
      document.getElementById('wl-company-select-card').style.display='none';
      document.getElementById('wl-main-section').style.display='';
      renderWageLedger();
    } else {
      document.getElementById('wl-company-select-card').style.display='';
      document.getElementById('wl-main-section').style.display='none';
    }
  }
  if(name==='severance'){
    // 데이터 미준비 — 칩 영역 스피너
    if(!_dataReady){
      const chips = document.getElementById('sev-company-chips');
      if(chips) chips.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9ca3af;padding:8px 0;"><div style="width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#f59e0b;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>고객사 목록 불러오는 중...</div>`;
      document.getElementById('sev-company-select-card').style.display='';
      document.getElementById('sev-main-section').style.display='none';
      if(el) el.classList.add('active');
      return;
    }
    // 글로벌 공유: 다른 페이지에서 선택된 고객사가 있으면 자동 선택
    if(currentGlobalCompanyId){
      const _gco = allCompanies.find(c=>c.id===currentGlobalCompanyId);
      if(_gco){ if(el) el.classList.add('active'); selectSevCompany(currentGlobalCompanyId, _gco.company_name); return; }
    }
    // 이전에 직접 선택한 고객사 유지
    renderSevCompanyList();
    if(_sevCompanyId){
      document.getElementById('sev-company-select-card').style.display='none';
      document.getElementById('sev-main-section').style.display='';
      renderSeverance();
    } else {
      document.getElementById('sev-company-select-card').style.display='';
      document.getElementById('sev-main-section').style.display='none';
    }
  }
  if(name==='contract-dispatch'){
    if(!_dataReady){
      const tbody = document.getElementById('cdp-unsent-tbody');
      if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#6366f1;margin-right:8px;"></i>고객사 데이터 불러오는 중...</td></tr>`;
      if(el) el.classList.add('active');
      return;
    }
    // 페이지 진입 시 항상 DB에서 최신 이력 강제 재조회 후 렌더링
    (async()=>{
      await loadContractDispatchList(true);
      if(typeof _cdpPopulateUnsentCompanySelect === 'function') _cdpPopulateUnsentCompanySelect();
      renderCdpUnsentMonthTabs();   // 미발송 년월 탭
      renderCdpUnsentList();        // 미발송 목록
      _setDefaultDateRange('cdp-filter-date-from', 'cdp-filter-date-to');
      await renderContractDispatchPage();
    })();
  }
  if(name==='consent-dispatch'){
    if(!_dataReady){
      const tbody = document.getElementById('cns-unsent-tbody');
      if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#6366f1;margin-right:8px;"></i>고객사 데이터 불러오는 중...</td></tr>`;
      if(el) el.classList.add('active');
      return;
    }
    (async()=>{
      await loadConsentDispatchList(true);
      if(typeof _cnsPopulateUnsentCompanySelect === 'function') _cnsPopulateUnsentCompanySelect();
      renderCnsUnsentMonthTabs();   // 미발송 년월 탭
      renderCnsUnsentList();        // 미발송 목록
      _setDefaultDateRange('cns-filter-date-from', 'cns-filter-date-to');
      await renderConsentDispatchPage();
    })();
  }
  if(name==='contract-expiry-notice'){
    if(!_dataReady){
      if(el) el.classList.add('active');
      return;
    }
    (async()=>{ await initCenPage(); _setDefaultDateRange('cen-log-filter-date-from', 'cen-log-filter-date-to'); renderCenHistory(); })();
  }
  if(name==='regular-conversion'){
    if(!_dataReady){
      const tbody = document.getElementById('rc-target-tbody');
      if(tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#6366f1;margin-right:8px;"></i>고객사 데이터 불러오는 중...</td></tr>`;
      if(el) el.classList.add('active');
      return;
    }
    (async()=>{ await initRcPage(); _setDefaultDateRange('rc-log-filter-date-from', 'rc-log-filter-date-to'); })();
  }
  if(name==='probation-mgmt'){
    if(!_dataReady){
      const chips = document.getElementById('probmgmt-company-chips');
      if(chips) chips.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9ca3af;padding:8px 0;"><div style="width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#0d9488;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>고객사 목록 불러오는 중...</div>`;
      document.getElementById('probmgmt-company-select-card').style.display = '';
      document.getElementById('probmgmt-content-section').style.display     = 'none';
      if(el) el.classList.add('active');
      return;
    }
    // 계약예정 → 활성 / 해지예정 → 해지 / 기간만료 → 만료 자동 전환 체크
    autoActivatePendingContracts().then(() => {
      autoProcessTerminatePendingContracts().then(() => {
        autoExpireFixedTermContracts().then(() => {
          renderProbMgmtCompanyList();
          if(_probMgmtSelectedCoId) renderProbationMgmtTable();
          updateMenuBadges();
        });
      });
    });
    // 글로벌 공유: 다른 페이지에서 선택된 고객사가 있으면 자동 선택
    if(currentGlobalCompanyId && !_probMgmtSelectedCoId){
      const _gco = allCompanies.find(c => c.id === currentGlobalCompanyId);
      const _hasTargets = _getProbationAllTargets().some(t => t.contract.company_id === currentGlobalCompanyId);
      if(_gco && _hasTargets){
        if(el) el.classList.add('active');
        selectProbMgmtCompany(currentGlobalCompanyId, _gco.company_name);
        return;
      }
    }
    // 고객사 선택 카드 표시 (이미 선택된 경우 유지)
    if(_probMgmtSelectedCoId){
      const lbl = document.getElementById('probmgmt-selected-label');
      if(lbl) lbl.textContent = _probMgmtSelectedCoName + ' — 수습 근로자 관리';
      document.getElementById('probmgmt-company-select-card').style.display = 'none';
      document.getElementById('probmgmt-content-section').style.display     = '';
      renderProbationMgmtTable();
      renderProbMgmtTemplate();
    } else {
      document.getElementById('probmgmt-company-select-card').style.display = '';
      document.getElementById('probmgmt-content-section').style.display     = 'none';
      renderProbMgmtCompanyList();
    }
  }
  if(name==='annual-leave'){
    // 데이터 미준비 — 칩 영역 스피너
    if(!_dataReady){
      const chips = document.getElementById('al-company-chips');
      if(chips) chips.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9ca3af;padding:8px 0;"><div style="width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>고객사 목록 불러오는 중...</div>`;
      document.getElementById('al-company-select-card').style.display = '';
      document.getElementById('al-main-section').style.display = 'none';
      if(el) el.classList.add('active');
      return;
    }
    // 글로벌 공유: 다른 페이지에서 선택된 고객사가 있으면 바로 해당 고객사 연차 조회
    if(currentGlobalCompanyId){
      const _gco = allCompanies.find(c => c.id === currentGlobalCompanyId);
      if(_gco){ if(el) el.classList.add('active'); initAlPage(); selectAlCompany(currentGlobalCompanyId, _gco.company_name); return; }
    }
    initAlPage();
  }
  if(name==='leave-promotion'){
    if(!_dataReady){
      const tbody = document.getElementById('lp-tbody');
      if(tbody) tbody.innerHTML = `<tr><td colspan="11" class="al-empty"><i class="fas fa-circle-notch fa-spin" style="color:#6366f1;"></i><br>데이터 불러오는 중...</td></tr>`;
      if(el) el.classList.add('active');
      return;
    }
    (async()=>{ await initLpPage(); _setDefaultDateRange('lp-filter-date-from', 'lp-filter-date-to'); })();
  }
  if(name==='companies'){
    renderCompanies(); // _dataReady false면 스켈레톤, true면 실제 카드 출력
  }
  if(name==='company-notice-log'){
    (async()=>{ await initCnlPage(); _setDefaultDateRange('cnl-filter-date-from', 'cnl-filter-date-to'); })();
  }
  if(name==='general-notice'){
    if(!_dataReady){
      const chips = document.getElementById('gn-company-chips');
      if(chips) chips.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#9ca3af;padding:8px 0;"><div style="width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#f59e0b;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>고객사 목록 불러오는 중...</div>`;
      const tbody = document.getElementById('gn-log-tbody');
      if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#f59e0b;margin-right:8px;"></i>데이터 불러오는 중...</td></tr>`;
      if(el) el.classList.add('active');
      return;
    }
    (async()=>{ await initGnPage(); })();
  }
  if(name==='dashboard'){
    renderDashboard();
    _updateDashUnsentContractBanner();
    _updateDashUnsentBanner();
    _updateDashConsentBanner();
  }
  if(el) el.classList.add('active');
  }catch(e){console.error('[showPage 오류]',name,e);}
}

/**
 * 페이지 새로고침 (topbar 버튼)
 * 현재 활성 페이지의 모든 데이터를 서버에서 재조회 후 페이지 전체를 다시 빌드한다.
 */
async function refreshCurrentPage(){
  const _refreshBtn = document.getElementById('topbar-refresh-btn');
  if(!_refreshBtn || _refreshBtn.disabled) return;
  const _icon = _refreshBtn.querySelector('i');
  try {
    if(_icon) _icon.classList.add('fa-spin');
    _refreshBtn.disabled = true;

    const _activePage = document.querySelector('.page.active');
    if(!_activePage) return;
    const _pageId = _activePage.id; // e.g. 'page-company-notice-log'
    const _name = _pageId.replace('page-', '');

    switch(_name){
      case 'company-notice-log':
        await cnlReload();
        break;
      case 'contract-dispatch':
        await loadContracts();
        await _cdpRefreshUnsent();
        break;
      case 'consent-dispatch':
        await loadContracts();
        await _cnsRefreshUnsent();
        break;
      case 'contract-expiry-notice':
        await loadContracts();
        await cenRefresh();
        break;
      case 'annual-leave':
        await Promise.all([loadPayrolls(), loadLeaveLedgers()]);
        renderAlTable();
        break;
      case 'leave-promotion':
        await loadLeavePromotionHistory(true);
        renderLpTable();
        break;
      case 'regular-conversion':
        await loadContracts();
        await rcRefresh();
        break;
    }
    toast('페이지가 새로고침되었습니다.', 'success');
  } catch(e){
    console.error('[refreshCurrentPage 오류]', e);
    toast('새로고침 중 오류가 발생했습니다.', 'error');
  } finally {
    if(_icon) _icon.classList.remove('fa-spin');
    _refreshBtn.disabled = false;
  }
}
// 대시보드 카드 버튼 클릭: 사용료 관리 페이지로 이동하며 필터 적용
/* [사용료 숨김] goBillingWithFilter 함수 - 원복 시 아래 주석 해제
function goBillingWithFilter(filterValue){
  // 사용료 관리 메뉴 요소
  const menuEl = document.querySelector('[data-page="billing"]');
  showPage('billing', menuEl);
  // 라디오 버튼 선택 변경
  const radio = document.querySelector(`input[name="billing-filter"][value="${filterValue}"]`);
  if(radio){
    radio.checked = true;
  } else {
    // 해당 값이 없으면 전체 선택
    const allRadio = document.querySelector('input[name="billing-filter"][value="all"]');
    if(allRadio) allRadio.checked = true;
  }
  // 검색어 초기화
  const searchInput = document.getElementById('billing-search');
  if(searchInput) searchInput.value = '';
  // 테이블 다시 렌더링
  renderBillings();
}
*/
function goBillingWithFilter(filterValue){ /* [사용료 숨김] 비활성화 — 원복 시 위 주석 해제 후 이 줄 삭제 */ }
function initMonthFilter(){
  const s=document.getElementById('pay-month-filter');
  if(!s) return;
  const curMo = new Date().getMonth()+1;
  s.innerHTML='';
  for(let i=1;i<=12;i++) s.innerHTML+=`<option value="${i}" ${i===curMo?'selected':''}>${i}월</option>`;
}
function initPIMonths(maxMonth){
  const s=document.getElementById('pi-month');
  if(!s) return;
  const now = new Date();
  const curYr = now.getFullYear();
  const curMo = now.getMonth()+1;
  const selYr = parseInt(document.getElementById('pi-year')?.value) || curYr;
  // 익월까지 허용: 올해 → 이번달+1, 내년 → 1월만, 과거 → 12월
  const limit = maxMonth ?? (selYr > curYr ? 1 : selYr === curYr ? Math.min(curMo+1, 12) : 12);
  const prevVal = parseInt(s.value) || 0;
  const defVal = (prevVal >= 1 && prevVal <= limit) ? prevVal : Math.min(curMo, limit);
  s.innerHTML='';
  for(let i=1;i<=limit;i++) s.innerHTML+=`<option value="${i}" ${i===defVal?'selected':''}>${i}월</option>`;
}
function initPIYears(){
  const s=document.getElementById('pi-year');
  if(!s) return;
  const curYr  = new Date().getFullYear();
  const maxYr  = new Date().getMonth() === 11 ? curYr+1 : curYr; // 12월이면 내년까지
  const prevVal = parseInt(s.value) || 0;
  const defVal  = prevVal >= curYr-3 && prevVal <= maxYr ? prevVal : curYr;
  s.innerHTML='';
  for(let y=maxYr; y>=curYr-3; y--){
    s.innerHTML+=`<option value="${y}" ${y===defVal?'selected':''}>${y}년</option>`;
  }
}
function populateFilters(){
  // 이용중 고객사만 노출 (임시저장·해지 제외)
  const activeOnly = allCompanies.filter(c => isCompanyActive(c));
  ['cont-company-filter','pay-company-filter','ct-company'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const base=id.includes('filter')?'<option value="">전체 고객사</option>':'<option value="">선택</option>';
    el.innerHTML=base+activeOnly.map(c=>`<option value="${c.id}">${c.company_name}</option>`).join('');
  });
}
function populatePICompanies(){
  // 숨김 select 동기화 (기존 참조 호환) — 이용중 + 유효 근로계약 1건 이상인 고객사만
  const activeOnly = allCompanies.filter(c => isCompanyActive(c) && _hasActiveContract(c.id));
  const s=document.getElementById('pi-company');
  if(s) s.innerHTML='<option value="">선택</option>'+activeOnly.map(c=>`<option value="${c.id}">${c.company_name}</option>`).join('');
  renderPICompanyList();
}

// ── 급여 입력 고객사 칩 목록 렌더링 ──
function renderPICompanyList(){
  const q=(document.getElementById('pi-company-search')?.value||'').toLowerCase();
  const chips=document.getElementById('pi-company-chips');
  if(!chips) return;
  // 이용중 + 유효 근로계약 1건 이상인 고객사만 노출
  const filtered=allCompanies.filter(c=>
    isCompanyActive(c) && _hasActiveContract(c.id) && (!q||c.company_name.toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));
  if(!filtered.length){
    chips.innerHTML=`<div style="font-size:12.5px;color:#9ca3af;padding:8px 0;">${q ? `"${q}" 검색 결과가 없습니다` : '유효한 근로계약이 있는 고객사가 없습니다'}</div>`;
    return;
  }
  chips.innerHTML=filtered.map(c=>{
    const isSelected = c.id === currentGlobalCompanyId;
    const payCnt = allPayrolls.filter(p => !p.is_draft && p.company_id === c.id).length;
    return `<button onclick="selectPICompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}');"
      class="co-chip${isSelected?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
      ${payCnt > 0 ? `<span class="count-badge">${payCnt}</span>` : ''}
    </button>`;
  }).join('');
}

// ── 고객사 선택 ──
function selectPICompany(companyId, companyName){
  // 숨김 select 동기화
  const s=document.getElementById('pi-company');
  if(s) s.value=companyId;

  // 글로벌 공유 변수 업데이트
  currentGlobalCompanyId = companyId;
  currentGlobalCompanyName = companyName;

  // 헤더 레이블
  document.getElementById('pi-selected-company-label').textContent=companyName+' 급여 입력';

  // 카드 전환 — 년월 선택 UI 표시
  document.getElementById('pi-company-select-card').style.display='none';
  document.getElementById('pi-input-section').style.display='';

  // ★ 수정 모드 진입(piEditPayrollId 설정됨) 중에는
  //   폼 섹션 숨김·년월 초기화를 건너뜀 — editPayroll()이 직접 처리
  const _isEditMode = typeof piEditPayrollId !== 'undefined' && !!piEditPayrollId;

  // 대상자 목록·입력 폼 초기화 (숨김) — 수정 모드 아닐 때만
  if(!_isEditMode){
    const targetSec = document.getElementById('pi-target-list-section');
    if(targetSec) targetSec.style.display='none';
    const formSec = document.getElementById('pi-form-section');
    if(formSec) formSec.style.display='none';
    // ★ 년월 선택 카드(pi-period-section) 반드시 복원
    // selectPITarget()·editPayroll()에서 숨겨진 상태가 잔존할 수 있으므로
    // 수정 모드가 아닌 경우 항상 표시 복원
    const periodSec = document.getElementById('pi-period-section');
    if(periodSec) periodSec.style.display='';
    // ★ 임시저장 배너: 고객사+년월 선택 단계에서만 표시
    // 목록·폼이 숨겨진 이 시점(년월 선택 단계)에서만 배너를 갱신·표시
    // ★ 급여 입력: 고객사 선택 시 전체 임시저장 배너 숨기고 해당 고객사 배너 표시
    const _adb = document.getElementById('pi-all-draft-banner');
    if(_adb) _adb.style.display = 'none';
    if(typeof renderPICoDraftBanner === 'function') renderPICoDraftBanner();
  } else {
    // 수정 모드 진입 시 임시저장 배너 숨김
    const _adb = document.getElementById('pi-all-draft-banner');
    if(_adb) _adb.style.display = 'none';
    const _cdb = document.getElementById('pi-co-draft-banner');
    if(_cdb) _cdb.style.display = 'none';
  }

  // 고객사 allowance_config 기반 옵셔널 항목 show/hide
  const _piSelCo = allCompanies.find(c=>c.id===companyId);
  if(typeof applyPIAllowanceConfig === 'function')
    applyPIAllowanceConfig(_piSelCo?.allowance_config ?? null);
  // 4대보험 적용 기준 UI 전환
  _switchInsuranceModeUI();

  // 연월 초기화 — option 목록 자체를 현재 년월 selected 상태로 재생성
  // (수정 모드 아닐 때만 — 수정 모드에선 editPayroll()이 저장된 년월로 덮어씀)
  if(!_isEditMode){ initPIYears(); initPIMonths(); }

  // 칩 목록 하이라이트 갱신
  renderPICompanyList();
}

// ── 고객사 선택 해제 ──
function clearPICompanySelect(){
  const s=document.getElementById('pi-company');
  if(s) s.value='';
  // 글로벌 공유 변수 초기화
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  document.getElementById('pi-company-select-card').style.display='';
  document.getElementById('pi-input-section').style.display='none';
  const searchEl = document.getElementById('pi-company-search');
  if(searchEl) searchEl.value='';
  renderPICompanyList();
  // 대상자 목록·폼 숨김
  const targetSec = document.getElementById('pi-target-list-section');
  if(targetSec) targetSec.style.display='none';
  const formSec = document.getElementById('pi-form-section');
  if(formSec) formSec.style.display='none';
  // 폼 초기화
  piContract=null;
  if(typeof clearPIFields === 'function') clearPIFields();
  const card=document.getElementById('pi-contract-card');
  if(card) card.style.display='none';
  // 수정 모드도 종료
  if(typeof piEditPayrollId !== 'undefined' && piEditPayrollId){
    if(typeof cancelEditPayroll === 'function') cancelEditPayroll();
  }
  // pi-all-draft-banner 복원, 고객사 전용 배너 숨김
  if(typeof renderPIAllDraftBanner === 'function') renderPIAllDraftBanner();
  const _coDraft = document.getElementById('pi-co-draft-banner');
  if(_coDraft) _coDraft.style.display = 'none';
}
function renderPagination(containerId,total,page,fn){
  const pages2=Math.ceil(total/ITEMS);
  const s=Math.min((page-1)*ITEMS+1,total);
  const e=Math.min(page*ITEMS,total);
  document.getElementById(containerId).innerHTML=`
    <span class="page-info">${total}건 중 ${s}-${e}</span>
    <div class="page-btns">
      <button class="page-btn" onclick="${fn}(${page-1})" ${page<=1?'disabled':''}><i class="fas fa-chevron-left"></i></button>
      ${Array.from({length:Math.min(pages2,5)},(_,i)=>{const p=Math.max(1,Math.min(page-2,pages2-4))+i;return p>pages2?'': `<button class="page-btn ${p===page?'active':''}" onclick="${fn}(${p})">${p}</button>`;}).join('')}
      <button class="page-btn" onclick="${fn}(${page+1})" ${page>=pages2?'disabled':''}><i class="fas fa-chevron-right"></i></button>
    </div>`;
}
