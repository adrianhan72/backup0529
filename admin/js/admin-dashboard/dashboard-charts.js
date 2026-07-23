// ==============================================================================
// renderPIAllDraftBanner()
//   급여 입력 페이지 최상단의 "전체 임시저장 목록" 배너를 렌더링한다.
//   선택된 고객사·직원과 무관하게 allPayrolls 내 is_draft:true 전건을 표시.
//   건수 0이면 배너 숨김.
// ==============================================================================
function renderPIAllDraftBanner(){
  const banner   = document.getElementById('pi-all-draft-banner');
  const countEl  = document.getElementById('pi-all-draft-count');
  const listEl   = document.getElementById('pi-all-draft-list');
  if(!banner || !countEl || !listEl) return;

  // ── heavy 데이터 미준비: 로딩 스켈레톤 표시 후 대기 ──
  const _heavyReady = typeof _heavyDataReady !== 'undefined' && _heavyDataReady;
  if(!_heavyReady){
    banner.classList.add('visible');
    banner.style.display = 'block';
    countEl.textContent  = '…';
    listEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 4px;font-size:12.5px;color:#6b7280;">
        <div style="width:16px;height:16px;border:2px solid #bbf7d0;border-top-color:#16a34a;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>
        임시저장 목록 불러오는 중…
      </div>`;
    // 아코디언 상태 유지 (강제 열기 없음 — 닫힘 기본값 보존)
    return;
  }

  const drafts = (allPayrolls||[])
    .filter(p => !!p.is_draft)
    .sort((a, b) => {                                        // 최신 저장순
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });

  if(!drafts.length){
    banner.classList.remove('visible');
    banner.style.display = 'none';
    return;
  }

  // 저장 시각 포맷 헬퍼
  function _fmt(ts){
    if(!ts) return '';
    const d = new Date(ts);
    if(isNaN(d.getTime())) return '';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} `
         + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  countEl.textContent = drafts.length;

  // 아코디언: 기본값 닫힘 — 사용자가 직접 열기 전까지 접혀 있음
  // (열린 상태는 사용자 클릭으로만 진입; 렌더링 시 상태 변경하지 않음)

  listEl.innerHTML = drafts.map(p => {
    const emp    = (allEmployees||[]).find(e => e.id === p.employee_id);
    const co     = (allCompanies||[]).find(x => x.id === p.company_id);
    const empName= emp ? emp.name : '(직원 미지정)';
    const coName = co  ? (co.company_name || '-') : '-';
    const yrMo   = (p.pay_year && p.pay_month) ? `${p.pay_year}년 ${p.pay_month}월` : '';
    const empCat = typeof contractTypeLabel === 'function' ? contractTypeLabel(emp?.employment_category) : (emp?.employment_category || '');
    // 급여일: 근로계약서 pay_day > 급여레코드 pay_date > 고객사 pay_day
    const ct = (allContracts||[]).find(c => c.employee_id === p.employee_id && c.company_id === p.company_id && !c.is_draft && CONTRACT_ACTIVE_STATUSES.includes(c.status));
    const ctPayDay = ct?.pay_day;
    const coPayDay = co?.pay_day;
    const fallbackDay = p.pay_date ? (p.pay_date.includes('-') ? parseInt(p.pay_date.slice(8)) : parseInt(p.pay_date)) : 0;
    const displayDay = ctPayDay || parseInt(coPayDay) || fallbackDay;
    const payDateStr = displayDay ? `급여일: 매월 ${displayDay}일` : '';
    const savedAt= _fmt(p.updated_at);
    const metaParts = [coName, yrMo, empCat, payDateStr].filter(Boolean);
    return `
    <div class="pi-adb-row" style="cursor:default;">
      <div class="pi-adb-row-icon"><i class="fas fa-file-invoice-dollar"></i></div>
      <div class="pi-adb-row-main">
        <div class="pi-adb-row-name">${empName}</div>
        <div class="pi-adb-row-meta">
          ${metaParts.map((v,i) => i===0
            ? `<span class="pi-adb-row-co">${v}</span>`
            : `<span class="pi-adb-row-yrmo"> · ${v}</span>`
          ).join('')}
        </div>
      </div>
      <div class="pi-adb-row-right" style="flex-direction:row;align-items:center;gap:10px;">
        ${savedAt ? `<span class="pi-adb-row-time">${savedAt} 저장</span>` : ''}
        <span style="display:inline-flex;gap:10px;">
          <button onclick="goDraftPayroll('${p.id}')" class="btn-draft-edit-sm"><i class="fas fa-pencil-alt"></i>이어 입력</button>
          <button onclick="_deleteDraft('${p.id}','payrolls','${empName} ${yrMo||''}')" class="btn-draft-del-sm"><i class="fas fa-trash-alt"></i> 삭제</button>
        </span>
      </div>
    </div>`;
  }).join('');

  banner.classList.add('visible');
  banner.style.display = 'block';
}

// ── pi-all-draft-banner 아코디언 토글 ──
function togglePIAllDraftBanner(headerEl){
  const body    = document.getElementById('pi-all-draft-body');
  const chevron = document.querySelector('#pi-all-draft-banner .pi-adb-chevron i');
  if(!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if(chevron){
    chevron.style.transition = 'transform .25s';
    chevron.style.transform  = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  }
}

// ── 선택 고객사 전용 임시저장 배너 ──
function renderPICoDraftBanner(){
  const banner = document.getElementById('pi-co-draft-banner');
  if(!banner) return;
  const coId = currentGlobalCompanyId;
  if(!coId){ banner.style.display='none'; return; }

  const drafts = (allPayrolls||[])
    .filter(p => !!p.is_draft && p.company_id === coId)
    .sort((a, b) => ((b.updated_at||0) - (a.updated_at||0)));
  
  if(!drafts.length){ banner.style.display='none'; return; }

  function _fmt(ts){
    if(!ts) return '';
    const d = new Date(ts);
    if(isNaN(d.getTime())) return '';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} `
         + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  banner.style.display = 'block';
  banner.innerHTML = `
    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde68a;border-radius:10px;padding:12px 18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${drafts.length > 0 ? '10px' : '0'};">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="fas fa-clock-rotate-left" style="color:#d97706;font-size:15px;"></i>
          <span style="font-size:13px;font-weight:700;color:#92400e;">임시저장된 급여 입력</span>
          <span style="background:#fef3c7;color:#b45309;font-size:11px;padding:2px 8px;border-radius:10px;">${drafts.length}건</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${drafts.map(p => {
          const emp = (allEmployees||[]).find(e => e.id === p.employee_id);
          const yrMo = (p.pay_year && p.pay_month) ? `${p.pay_year}년 ${p.pay_month}월` : '';
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(255,255,255,.7);border-radius:8px;border:1px solid #fde68a;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:13px;font-weight:600;color:#1e293b;">${emp?.name||'(미지정)'}</span>
              <span style="font-size:11px;color:#92400e;">${yrMo}</span>
              <span style="font-size:10px;color:#a16207;">${_fmt(p.updated_at)} 저장</span>
            </div>
            <div style="display:flex;gap:6px;">
              <button onclick="goDraftPayroll('${p.id}')" class="btn-draft-edit-sm"><i class="fas fa-pencil-alt"></i>이어 입력</button>
              <button onclick="_deleteDraft('${p.id}','payrolls','${emp?.name||'미지정'} ${yrMo}')" class="btn-draft-del-sm"><i class="fas fa-trash-alt"></i> 삭제</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderDashboard(){
  // 임시저장 알림 카드 (최우선 렌더)
  renderDraftAlerts();
  // [사용안함] 서류미비 계약도 유효 계약으로 처리 → 날인본/동의서 알림 카드 제거
  // renderSignedAlerts();
  // renderConsentAlerts();
  // 수습 만료 통지 대상 배너
  renderDashProbationBanner();
  // 퇴직금 지급 이력 배너 (임시저장 위)
  renderDashSeveranceBanner();

  const activeCompanyCount=allCompanies.filter(c=>isCompanyActive(c)).length;

  // 이용중 고객사 건수 뱃지 업데이트
  const activeCountEl = document.getElementById('active-count');
  if(activeCountEl) activeCountEl.textContent=`(총 ${activeCompanyCount}건)`;

  // 고객사 목록 렌더링
  renderDashboardCompanies();

  // [사용료 숨김] 이번달 사용료 요약 카드 + 매출추이 차트 - 원복 시 아래 주석 해제
  // renderDashBillingCards();
  // renderBillingTrendChart();

  // 월별 고객사 수 변동 추이 차트
  renderCompanyTrendChart();
  // 월별 관리대상 직원 수 변동 추이 차트
  renderEmployeeTrendChart();
}

/* [사용료 숨김] renderDashBillingCards 함수 전체 - 원복 시 아래 주석 해제
function renderDashBillingCards(){
  // 급여·청구 데이터 미준비 시 로딩 표시
  if(!_heavyDataReady){
    ['dash-bill-total','dash-bill-paid','dash-bill-pending','dash-bill-unpaid'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.innerHTML = '<span style="font-size:12px;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="margin-right:4px;"></i>로딩 중</span>';
    });
    ['dash-bill-count','dash-bill-paid-count','dash-bill-pending-count','dash-bill-unpaid-count'].forEach(id=>{
      const el = document.getElementById(id); if(el) el.textContent = '';
    });
    return;
  }
  const now    = new Date();
  const yr     = now.getFullYear();
  const mo     = now.getMonth() + 1;
  const today  = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

  // 섹션 타이틀 동적 업데이트
  const titleEl = document.getElementById('dash-billing-section-title');
  if(titleEl) titleEl.textContent = `${yr}년 ${mo}월 사용료 징수현황`;

  // 이번달 실제 청구 건
  const thisMonthBillings = allBillings.filter(b =>
    Number(b.billing_year) === yr && Number(b.billing_month) === mo
  );

  // ── 청구 총액 ──
  const totalAmount = thisMonthBillings.reduce((s, b) => s + (b.total_amount || 0), 0);

  // ── 납부 총액: partial_paid_amount 합산 ──
  const totalPaid = thisMonthBillings.reduce((s, b) => s + (b.partial_paid_amount || 0), 0);
  // 완납 건수 (payment_status ===PAYMENT_STATUS.PAID 또는 잔액 0)
  const paidCount = thisMonthBillings.filter(b => {
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    return b.payment_status ===PAYMENT_STATUS.PAID || rem <= 0;
  }).length;

  // ── 납부대기 총액: 이번달 청구 중 완납 아니고 잔액 있으며 마감일 미경과인 건 ──
  const pendingBillings = thisMonthBillings.filter(b => {
    if(b.payment_status ===PAYMENT_STATUS.PAID) return false;
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    if(rem <= 0) return false;
    // 마감일이 없거나 아직 안 지난 건만 납부대기
    return !b.due_date || b.due_date >= today;
  });
  const totalPending = pendingBillings.reduce((s, b) =>
    s + ((b.total_amount || 0) - (b.partial_paid_amount || 0)), 0);

  // ── 누적 미납금: 전체 청구(모든 월) 중 마감일이 지났는데도 잔액이 남은 건 합산 ──
  const overdueBillings = allBillings.filter(b => {
    if(b.payment_status ===PAYMENT_STATUS.PAID) return false;
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    if(rem <= 0) return false;
    // 마감일이 존재하고 이미 경과한 건만 미납금
    return b.due_date && b.due_date < today;
  });
  const totalUnpaid = overdueBillings.reduce((s, b) =>
    s + ((b.total_amount || 0) - (b.partial_paid_amount || 0)), 0);

  // ── DOM 업데이트 ──
  document.getElementById('dash-bill-total').textContent         = Math.round(totalAmount).toLocaleString('ko-KR') + '원';
  document.getElementById('dash-bill-count').textContent         = `청구 ${thisMonthBillings.length}건`;
  document.getElementById('dash-bill-paid').textContent          = Math.round(totalPaid).toLocaleString('ko-KR') + '원';
  document.getElementById('dash-bill-paid-count').textContent    = `완납 ${paidCount}건`;
  document.getElementById('dash-bill-pending').textContent       = Math.round(totalPending).toLocaleString('ko-KR') + '원';
  document.getElementById('dash-bill-pending-count').textContent = `대기 ${pendingBillings.length}건`;
  document.getElementById('dash-bill-unpaid').textContent        = Math.round(totalUnpaid).toLocaleString('ko-KR') + '원';
  document.getElementById('dash-bill-unpaid-count').textContent  = `미결제 ${overdueBillings.length}건`;

  // 누적 미납금 있으면 카드 배경 강조
  const unpaidCard = document.querySelector('#dash-billing-cards .stat-card:last-child');
  if(unpaidCard){
    unpaidCard.style.background = totalUnpaid > 0
      ? 'linear-gradient(135deg,#fff5f5,#fff)' : '#fff';
  }
}
*/ // [사용료 숨김] renderDashBillingCards 끝

// ─── 월별 고객사 수 변동 추이 차트 ───
let companyTrendChartInstance = null;

function renderCompanyTrendChart(){
  const rangeEl = document.getElementById('dash-chart-range');
  const months = rangeEl ? parseInt(rangeEl.value) : 12;
  const filterEl = document.querySelector('input[name="dash-company-filter"]:checked');
  const filter = filterEl ? filterEl.value : 'contract';

  const now = new Date();
  const labels = [];
  // 근로자 수 기준 데이터
  const allData = [];       // 전체
  const under5Data = [];    // 5인 미만
  const over5Data = [];     // 5인 이상
  // 계약 기준 데이터
  const activeData = [];    // 이용중
  const inactiveData = [];  // 해지

  // 회사 ID → { status, empCount } 매핑 (현재 기준)
  const coMeta = {};
  allCompanies.forEach(c => {
    if(c.is_draft) return;
    const active = isCompanyActive(c);
    // 상시근로자 수: 대표자 본인(is_representative)·등기임원·특수관계인 제외, 유효계약 기준
    let repNamesD = [];
    try { const reps = typeof c.representatives === 'string' ? JSON.parse(c.representatives) : (c.representatives || []); repNamesD = (Array.isArray(reps) ? reps : []).map(r => r.name).filter(Boolean); } catch(e){}
    const execNamesD = (allExecutives||[]).filter(e => e.company_id === c.id).map(e => e.name).filter(Boolean);
    const relNamesD  = (allRelatedParties||[]).filter(r => r.company_id === c.id).map(r => r.name).filter(Boolean);
    const excludedNames = new Set([...repNamesD, ...execNamesD, ...relNamesD]);
    const repEmpIds = new Set(
      (allEmployees||[]).filter(e => e.company_id === c.id && (e.is_representative || excludedNames.has(e.name))).map(e => e.id)
    );
    const empCount = allContracts.filter(ct =>
      ct.company_id === c.id && !ct.is_draft &&
      ct.status !== CONTRACT_STATUS.VOIDED && ct.status !== CONTRACT_STATUS.CANCELED &&
      !repEmpIds.has(ct.employee_id)
    ).length;
    coMeta[c.id] = { status: active ? COMPANY_STATUS.ACTIVE : COMPANY_STATUS.INACTIVE, empCount };
  });

  for(let i = months - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    labels.push(`${yr}.${String(mo).padStart(2,'0')}`);

    const monthCoIds = [...new Set(
      allPayrolls
        .filter(p => Number(p.pay_year) === yr && Number(p.pay_month) === mo)
        .map(p => p.company_id)
    )];

    allData.push(monthCoIds.length);
    under5Data.push(monthCoIds.filter(id => (coMeta[id]?.empCount || 0) < 5).length);
    over5Data.push(monthCoIds.filter(id => (coMeta[id]?.empCount || 0) >= 5).length);
    activeData.push(monthCoIds.filter(id => coMeta[id]?.status === COMPANY_STATUS.ACTIVE).length);
    inactiveData.push(monthCoIds.filter(id => coMeta[id]?.status === COMPANY_STATUS.INACTIVE).length);
  }

  const ctx = document.getElementById('company-trend-chart');
  if(!ctx) return;

  if(companyTrendChartInstance){
    companyTrendChartInstance.destroy();
    companyTrendChartInstance = null;
  }

  const datasets = [];
  if(filter === 'employee'){
    datasets.push({
      label: '전체', data: allData,
      borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.06)',
      pointBackgroundColor: '#6366f1', pointBorderColor: '#fff',
      pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7,
      borderWidth: 2.5, fill: false, tension: 0.35
    });
    datasets.push({
      label: '5인 미만', data: under5Data,
      borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)',
      pointBackgroundColor: '#f59e0b', pointBorderColor: '#fff',
      pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
      borderWidth: 2, fill: false, tension: 0.35
    });
    datasets.push({
      label: '5인 이상', data: over5Data,
      borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)',
      pointBackgroundColor: '#10b981', pointBorderColor: '#fff',
      pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
      borderWidth: 2, fill: false, tension: 0.35
    });
  } else {
    datasets.push({
      label: '이용중', data: activeData,
      borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)',
      pointBackgroundColor: '#10b981', pointBorderColor: '#fff',
      pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7,
      borderWidth: 2.5, fill: true, tension: 0.35
    });
    datasets.push({
      label: '해지', data: inactiveData,
      borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)',
      pointBackgroundColor: '#ef4444', pointBorderColor: '#fff',
      pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
      borderWidth: 2, borderDash: [5,3], fill: true, tension: 0.35
    });
  }

  companyTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 4,
            useBorderRadius: true,
            font: { size: 12, family: "'Noto Sans KR', sans-serif" },
            color: '#555'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26,26,46,0.92)',
          titleColor: '#fff',
          bodyColor: '#ddd',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          bodyFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          callbacks: {
            label: function(ctx){
              return ` ${ctx.dataset.label}: ${ctx.parsed.y}개`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            maxRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          grace: 1,
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            stepSize: 1,
            precision: 0,
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            callback: function(val){ return val + '개'; }
          }
        }
      }
    }
  });
}

// ─── 월별 관리대상 직원 수 변동 추이 차트 ───
let employeeTrendChartInstance = null;

function renderEmployeeTrendChart(){
  const rangeEl = document.getElementById('dash-chart-range');
  const months = rangeEl ? parseInt(rangeEl.value) : 12;

  const now = new Date();
  const labels = [];
  const typeKeys = ['total', 'regular', 'regular_probation', 'fixed_term', 'fixed_term_probation', 'daily'];
  const dataMap = {};
  typeKeys.forEach(k => { dataMap[k] = []; });

  // 이용중 고객사 ID 목록 (현재 기준)
  const activeCompanyIds = new Set(
    allCompanies.filter(c => isCompanyActive(c)).map(c => c.id)
  );

  // 직원 ID → 현재 계약의 contract_type 매핑
  const empTypeMap = {};
  allContracts
    .filter(ct => !ct.is_draft && activeCompanyIds.has(ct.company_id) &&
      ct.status !== CONTRACT_STATUS.VOIDED && ct.status !== CONTRACT_STATUS.CANCELED)
    .sort((a, b) => (b.contract_start || '').localeCompare(a.contract_start || ''))
    .forEach(ct => {
      if (!empTypeMap[ct.employee_id]) {
        empTypeMap[ct.employee_id] = ct.contract_type || ct.employment_category || 'regular';
      }
    });

  for(let i = months - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    labels.push(`${yr}.${String(mo).padStart(2,'0')}`);

    // 해당 월 급여 입력된 직원들 (이용중 고객사 소속)
    const monthEmps = allPayrolls
      .filter(p =>
        Number(p.pay_year) === yr && Number(p.pay_month) === mo &&
        activeCompanyIds.has(p.company_id)
      )
      .map(p => p.employee_id);
    const uniqueEmpIds = [...new Set(monthEmps)];

    // 전체
    dataMap.total.push(uniqueEmpIds.length);
    // 고용형태별 카운트
    const counts = {};
    typeKeys.filter(k => k !== 'total').forEach(k => { counts[k] = 0; });
    uniqueEmpIds.forEach(eid => {
      const tp = empTypeMap[eid] || 'regular';
      if (counts[tp] !== undefined) counts[tp]++;
    });
    typeKeys.filter(k => k !== 'total').forEach(k => dataMap[k].push(counts[k]));
  }

  const ctx = document.getElementById('employee-trend-chart');
  if(!ctx) return;

  if(employeeTrendChartInstance){
    employeeTrendChartInstance.destroy();
    employeeTrendChartInstance = null;
  }

  // 표시할 데이터셋 구성
  const typeConfig = {
    total:                { label: '전체', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', dash: false, width: 2.5, radius: 5 },
    regular:              { label: '정규직', color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', dash: false, width: 2, radius: 4 },
    regular_probation:    { label: '정규직 수습', color: '#0ea5e9', bg: 'rgba(14,165,233,0.06)', dash: [5,3], width: 2, radius: 4 },
    fixed_term:           { label: '계약직', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', dash: false, width: 2, radius: 4 },
    fixed_term_probation: { label: '계약직 수습', color: '#f97316', bg: 'rgba(249,115,22,0.06)', dash: [5,3], width: 2, radius: 4 },
    daily:                { label: '일용직', color: '#10b981', bg: 'rgba(16,185,129,0.06)', dash: [3,3], width: 2, radius: 4 },
  };

  const datasets = [];
  const allDataForMax = [];
  typeKeys.forEach(k => {
    const cfg = typeConfig[k];
    allDataForMax.push(...dataMap[k]);
    const ds = {
      label: cfg.label, data: dataMap[k],
      borderColor: cfg.color, backgroundColor: cfg.bg,
      pointBackgroundColor: cfg.color, pointBorderColor: '#fff',
      pointBorderWidth: 2, pointRadius: cfg.radius, pointHoverRadius: cfg.radius + 2,
      borderWidth: cfg.width, fill: false, tension: 0.35
    };
    if(cfg.dash) ds.borderDash = cfg.dash;
    datasets.push(ds);
  });

  const maxVal = Math.max(...allDataForMax, 1);

  employeeTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top', align: 'end',
          labels: {
            boxWidth: 12, boxHeight: 12,
            borderRadius: 4, useBorderRadius: true,
            font: { size: 12, family: "'Noto Sans KR', sans-serif" },
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 11, family: "'Noto Sans KR', sans-serif" }, color: '#999', maxRotation: 0 }
        },
        y: {
          beginAtZero: true, grace: Math.max(1, Math.ceil(maxVal * 0.1)),
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { precision: 0, font: { size: 11, family: "'Noto Sans KR', sans-serif" }, color: '#999', callback: val => val + '명' }
        }
      }
    }
  });
}

// ─── 사용료 매출 추이 차트 ───
let billingTrendChartInstance = null;

/* [사용료 숨김] renderBillingTrendChart 함수 전체 - 원복 시 아래 주석 해제
function renderBillingTrendChart(){
  if(!_heavyDataReady) return; // 급여·청구 데이터 미준비 시 skip
  const rangeEl = document.getElementById('billing-trend-range');
  const months = rangeEl ? parseInt(rangeEl.value) : 12;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const labels = [];
  const billedData  = [];  // 총 청구금액
  const paidData    = [];  // 납부 총액
  const unpaidData  = [];  // 누적 미납금 (마감일 경과)
  const lossData    = [];  // 손실 처리금

  for(let i = months - 1; i >= 0; i--){
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    labels.push(`${yr}.${String(mo).padStart(2,'0')}`);

    // 해당 월 말일 (누적 미납금 기준점)
    const lastDayOfMonth = new Date(yr, mo, 0).toISOString().slice(0, 10);

    // 해당 월 청구 건
    const monthBillings = allBillings.filter(b =>
      Number(b.billing_year) === yr && Number(b.billing_month) === mo
    );

    // 총 청구금액 (해당 월 청구 합계)
    const totalBilled = monthBillings.reduce((s, b) => s + (b.total_amount || 0), 0);

    // 납부 총액 (해당 월 청구 건의 partial_paid_amount 합산)
    const totalPaid = monthBillings.reduce((s, b) => s + (b.partial_paid_amount || 0), 0);

    // 누적 미납금: 해당 월까지 발생한 모든 청구 중
    // 마감일이 해당 월 말일 이하이고 잔액이 남아있는 건의 합계
    const totalUnpaid = allBillings.reduce((s, b) => {
      if(b.payment_status ===PAYMENT_STATUS.PAID) return s;
      const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
      if(rem <= 0) return s;
      // 청구월이 해당 월 이하인 건만
      const bYM = Number(b.billing_year) * 100 + Number(b.billing_month);
      const tYM = yr * 100 + mo;
      if(bYM > tYM) return s;
      // 마감일이 해당 월 말일 이전인 건만 (마감일 없으면 제외)
      if(!b.due_date || b.due_date > lastDayOfMonth) return s;
      return s + rem;
    }, 0);

    // 손실 처리금: 해당 월에 loss_date가 기록된 billing 건의 loss_amount 합산
    const totalLoss = allBillings.reduce((s, b) => {
      if(!b.loss_date || !b.loss_amount) return s;
      const ld = b.loss_date.slice(0, 7); // "YYYY-MM"
      const label = `${yr}.${String(mo).padStart(2,'0')}`;
      if(ld !== `${yr}-${String(mo).padStart(2,'0')}`) return s;
      return s + (b.loss_amount || 0);
    }, 0);

    billedData.push(totalBilled);
    paidData.push(totalPaid);
    unpaidData.push(totalUnpaid);
    lossData.push(totalLoss);
  }

  const ctx = document.getElementById('billing-trend-chart');
  if(!ctx) return;

  if(billingTrendChartInstance){
    billingTrendChartInstance.destroy();
    billingTrendChartInstance = null;
  }

  const maxVal = Math.max(...billedData, ...lossData, 1);

  billingTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '총 청구금액',
          data: billedData,
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          fill: false,
          tension: 0.35,
          order: 1
        },
        {
          label: '납부 총액',
          data: paidData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.15)',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          order: 2
        },
        {
          label: '누적 미납금',
          data: unpaidData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.12)',
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          order: 3
        },
        {
          label: '손실 처리금',
          data: lossData,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.13)',
          pointBackgroundColor: '#7c3aed',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          borderDash: [5,3],
          fill: true,
          tension: 0.35,
          order: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12, boxHeight: 12,
            borderRadius: 4, useBorderRadius: true,
            font: { size: 12, family: "'Noto Sans KR', sans-serif" },
            color: '#555'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26,26,46,0.92)',
          titleColor: '#fff',
          bodyColor: '#ddd',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          bodyFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          callbacks: {
            label: item => ` ${item.dataset.label}: ${Math.round(item.parsed.y).toLocaleString('ko-KR')}원`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            maxRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          grace: Math.ceil(maxVal * 0.1),
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            callback: val => {
              if(val >= 1000000) return (val / 1000000).toFixed(1) + '백만';
              if(val >= 10000)   return (val / 10000).toFixed(0) + '만';
              return Math.round(val).toLocaleString('ko-KR');
            }
          }
        }
      }
    }
  });
}
*/ // [사용료 숨김] renderBillingTrendChart 끝

function goCompaniesWithFilter(status){
  const sf=document.getElementById('company-status-filter');
  if(sf) sf.value=status||'';
  showPage('companies',document.querySelector('.menu-item[data-page="companies"]'));
  renderCompanies();
}

// ── 대시보드 고객사 테이블 행 HTML 생성 ──
function _buildDashCompanyRow(c){
  const now = new Date();
  const cYear = now.getFullYear();
  const cMonth = now.getMonth() + 1;
  // 유효계약 근로자 (활성·계약예정, is_draft=false)
  const validContracts = allContracts.filter(ct =>
    ct.company_id === c.id && !ct.is_draft &&
    (ct.status===CONTRACT_STATUS.ACTIVE || ct.status===CONTRACT_STATUS.PENDING)
  );
  const validEmpIds = [...new Set(validContracts.map(ct => ct.employee_id))];
  const totalValid  = validEmpIds.length;
  // 유효 근로계약이 없는 고객사는 목록에서 제외
  if(totalValid === 0) return null;
  // 이번 달 급여 입력된 직원
  const inputtedEmpIds = new Set(
    allPayrolls
      .filter(p => p.company_id === c.id && p.pay_year == cYear && p.pay_month == cMonth)
      .map(p => p.employee_id)
  );
  const inputtedCnt = validEmpIds.filter(id => inputtedEmpIds.has(id)).length;
  const pendingCnt  = totalValid - inputtedCnt;
  const payDay = c.pay_day ? `매월 ${c.pay_day}일` : '-';
  const safeId   = c.id.replace(/'/g, "\\'");
  let statusCell;
  if(pendingCnt > 0){
    statusCell = `<span class="dash-co-pending"><i class="fas fa-exclamation-circle"></i> ${pendingCnt}명 미입력</span>`;
  } else if(totalValid === 0){
    statusCell = `<span style="font-size:12px;color:#9ca3af;">유효계약 없음</span>`;
  } else {
    statusCell = `<span class="dash-co-done"><i class="fas fa-check-circle" style="font-size:11px;margin-right:3px;"></i>총 ${inputtedCnt}건 / ${totalValid}명 입력완료</span>`;
  }
  const btnClass = pendingCnt > 0 ? 'dash-co-btn-input' : 'dash-co-btn-edit';
  const btnLabel = pendingCnt > 0
    ? `<i class="fas fa-plus-circle"></i> 급여 입력`
    : `<i class="fas fa-edit"></i> 수정`;
  return `<tr>
    <td><span class="dash-co-name" title="${c.company_name}">${c.company_name}</span></td>
    <td><span class="dash-co-payday">${payDay}</span></td>
    <td>${statusCell}</td>
    <td style="width:110px;"><button class="dash-co-btn ${btnClass}" onclick="openPayrollInputModal('${safeId}')">${btnLabel}</button></td>
  </tr>`;
}

function renderDashboardCompanies(){
  // 이용중 고객사만 표시
  const searchInput=document.getElementById('dash-company-search');
  const searchTerm=searchInput?searchInput.value.toLowerCase().trim():'';

  let companies=allCompanies.filter(c=>isCompanyActive(c));

  if(searchTerm){
    companies=companies.filter(c=>(c.company_name||'').toLowerCase().includes(searchTerm));
  }

  const today = new Date().getDate(); // 오늘 일자 (1~31)
  companies.sort((a,b)=>{
    const da = parseInt(a.pay_day)||0;
    const db = parseInt(b.pay_day)||0;
    // 급여일이 없는 경우 맨 뒤로
    if(!da && !db) return (a.company_name||'').localeCompare(b.company_name||'','ko');
    if(!da) return 1;
    if(!db) return -1;
    // 오늘 기준으로 "앞으로 며칠 후"인지 계산 (순환: 이미 지난 날은 다음달로)
    const diffA = da >= today ? da - today : da + 31 - today;
    const diffB = db >= today ? db - today : db + 31 - today;
    return diffA - diffB;
  });

  const wrap=document.getElementById('dash-companies');
  if(!wrap) return;

  if(companies.length===0){
    const msg=searchTerm?`"${searchTerm}" 검색 결과가 없습니다`:'이용중인 고객사가 없습니다';
    wrap.innerHTML=`<div class="empty-state" style="padding:24px 0;"><i class="fas fa-building"></i><p>${msg}</p></div>`;
    return;
  }

  const rows=companies.map(c=>_buildDashCompanyRow(c)).filter(r=>r!==null).join('');
  wrap.innerHTML=`
    <table class="dash-co-table">
      <thead>
        <tr>
          <th>고객사명</th>
          <th>급여일</th>
          <th>이번 달 급여 현황</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
