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
      const ta = a.draft_saved_at ? new Date(a.draft_saved_at).getTime() : 0;
      const tb = b.draft_saved_at ? new Date(b.draft_saved_at).getTime() : 0;
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
    const netPay = p.net_pay   ? Number(p.net_pay).toLocaleString('ko-KR') + '원' : '';
    const savedAt= _fmt(p.draft_saved_at);
    const noteHtml = p.note
      ? `<span class="pi-adb-row-note" title="${p.note.replace(/"/g,'&quot;')}">· ${p.note}</span>`
      : '';
    return `
    <div class="pi-adb-row" onclick="goDraftPayroll('${p.id}')" title="${empName} ${yrMo} 임시저장 — 클릭하여 이어 입력">
      <div class="pi-adb-row-icon"><i class="fas fa-file-invoice-dollar"></i></div>
      <div class="pi-adb-row-main">
        <div class="pi-adb-row-name">${empName}</div>
        <div class="pi-adb-row-meta">
          <span class="pi-adb-row-co">${coName}</span>
          ${yrMo   ? `<span class="pi-adb-row-yrmo">${yrMo}</span>` : ''}
          ${netPay ? `<span class="pi-adb-row-net">${netPay}</span>` : ''}
          ${noteHtml}
        </div>
      </div>
      <div class="pi-adb-row-right">
        ${savedAt ? `<span class="pi-adb-row-time">${savedAt} 저장</span>` : ''}
        <span class="pi-adb-row-action"><i class="fas fa-pencil-alt" style="font-size:10px;margin-right:3px;"></i>이어 입력</span>
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

function renderDashboard(){
  // 임시저장 알림 카드 (최우선 렌더)
  renderDraftAlerts();
  // 계약서 날인본 미등록 알림 카드
  renderSignedAlerts();
  // 제3자 정보제공동의서 미등록 알림 카드
  renderConsentAlerts();
  // 계약만료 통지 대상 배너 (임시저장 위)
  renderDashExpiryBanner();
  // 수습 만료 통지 대상 배너 (계약만료 ~ 정규직 전환 사이)
  renderDashProbationBanner();
  // 정규직 전환 의무 대상 배너 (임시저장 위)
  renderDashRegularBanner();
  // 퇴직금 지급 이력 배너 (임시저장 위)
  renderDashSeveranceBanner();

  const activeCompanyCount=allCompanies.filter(c=>isCompanyActive(c)).length;

  // 이용중 고객사 건수 뱃지 업데이트
  const activeCountEl = document.getElementById('active-count');
  if(activeCountEl) activeCountEl.textContent=`(${activeCompanyCount})`;

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

  const now = new Date();
  const labels = [];
  const activeData = [];  // 해당 월 급여가 입력된 고객사 수
  const totalData = [];   // 누적 전체 고객사 수

  for(let i = months - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    labels.push(`${yr}.${String(mo).padStart(2,'0')}`);

    // 해당 월에 급여 데이터가 1건 이상 있는 고객사 수 (이용중·해지 무관, 당시 실제 이용 기준)
    const totalCount = new Set(
      allPayrolls
        .filter(p => Number(p.pay_year) === yr && Number(p.pay_month) === mo)
        .map(p => p.company_id)
    ).size;

    activeData.push(totalCount);
    totalData.push(totalCount);
  }

  const ctx = document.getElementById('company-trend-chart');
  if(!ctx) return;

  // 기존 차트 인스턴스 제거
  if(companyTrendChartInstance){
    companyTrendChartInstance.destroy();
    companyTrendChartInstance = null;
  }

  companyTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '급여 입력 고객사',
          data: activeData,
          borderColor: '#e94560',
          backgroundColor: 'rgba(233,69,96,0.08)',
          pointBackgroundColor: '#e94560',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35
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
  const managedData = [];  // 이용중 고객사에서 해당 월 급여가 입력된 직원 수

  // 이용중 고객사 ID 목록 (현재 기준)
  const activeCompanyIds = new Set(
    allCompanies.filter(c => isCompanyActive(c)).map(c => c.id)
  );

  for(let i = months - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    labels.push(`${yr}.${String(mo).padStart(2,'0')}`);

    // 해당 월에 급여가 입력된 직원 중 이용중 고객사 소속 직원 수
    // → 급여 데이터가 실제 근무/관리의 가장 정확한 기록
    const managedSet = new Set(
      allPayrolls
        .filter(p =>
          Number(p.pay_year) === yr &&
          Number(p.pay_month) === mo &&
          activeCompanyIds.has(p.company_id)
        )
        .map(p => p.employee_id)
    );

    managedData.push(managedSet.size);
  }

  const ctx = document.getElementById('employee-trend-chart');
  if(!ctx) return;

  if(employeeTrendChartInstance){
    employeeTrendChartInstance.destroy();
    employeeTrendChartInstance = null;
  }

  // 최대값 기반 y축 범위
  const maxVal = Math.max(...managedData, 1);

  employeeTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '관리대상 직원',
          data: managedData,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139,92,246,0.10)',
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35
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
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}명`,
            afterBody: (items) => {
              const idx = items[0]?.dataIndex;
              if(idx === undefined) return '';
              // 해당 월의 전월 대비 증감
              const cur = managedData[idx];
              const prev = idx > 0 ? managedData[idx - 1] : null;
              if(prev === null) return '';
              const diff = cur - prev;
              if(diff === 0) return '  전월 대비 변동 없음';
              return diff > 0 ? `  전월 대비 +${diff}명 증가` : `  전월 대비 ${diff}명 감소`;
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
          grace: Math.max(1, Math.ceil(maxVal * 0.1)),
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            precision: 0,
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            callback: val => val + '명'
          }
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
    statusCell = `<span class="dash-co-pending"><i class="fas fa-exclamation-circle" style="font-size:11px;margin-right:3px;"></i>${pendingCnt}명 미입력</span>`;
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
    <td><button class="dash-co-btn ${btnClass}" onclick="openPayrollInputModal('${safeId}')">${btnLabel}</button></td>
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

  const rows=companies.map(c=>_buildDashCompanyRow(c)).join('');
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
