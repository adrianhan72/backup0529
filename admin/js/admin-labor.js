// ─── LABOR STATUS ───
// currentLsCompanyId → 최상단 STATE 블록에서 선언됨
const LS_ITEMS = 15;

// 고객사 칩 목록 렌더 (근로계약서 페이지와 동일 방식)
function renderLsCompanyList(){
  const q = (document.getElementById('ls-company-search')?.value || '').toLowerCase().trim();
  const container = document.getElementById('ls-company-chips');
  if(!container) return;

  const companies = allCompanies.filter(c =>
    isCompanyActive(c) && (!q || c.company_name.toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));

  if(!companies.length){
    container.innerHTML = `<div style="color:#9ca3af;font-size:13px;padding:8px 0;">${q ? `"${q}" 검색 결과 없음` : '이용 중인 고객사가 없습니다'}</div>`;
    return;
  }

  container.innerHTML = companies.map(c => {
    const isSelected = c.id === currentGlobalCompanyId;
    // 유효 계약(active, docs_incomplete) 보유 직원 수
    const activeCtEmpIds = new Set(
      allContracts.filter(ct => ct.company_id === c.id && (ct.status === CONTRACT_STATUS.ACTIVE || ct.status === CONTRACT_STATUS.DOCS_INCOMPLETE)).map(ct => ct.employee_id)
    );
    const empCnt = activeCtEmpIds.size;
    const contractCnt = allContracts.filter(ct => ct.company_id === c.id && (ct.status === CONTRACT_STATUS.ACTIVE || ct.status === CONTRACT_STATUS.DOCS_INCOMPLETE)).length;
    return `<button onclick="selectLsCompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}')"
      class="co-chip${isSelected?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
      ${contractCnt > 0 ? `<span class="count-badge">${contractCnt}</span>` : ''}
    </button>`;
  }).join('');
}

// 연월 셀렉트 초기화
function initLsYearMonth(){
  const now = new Date();
  const curYr = now.getFullYear();
  const curMo = now.getMonth() + 1;

  const yrSel = document.getElementById('ls-year');
  const moSel = document.getElementById('ls-month');
  if(!yrSel || !moSel) return;

  // 이미 초기화된 경우 현재 값 유지
  if(yrSel.options.length > 0) return;

  // 연도: 현재 기준 -2 ~ +1년
  for(let y = curYr - 2; y <= curYr + 1; y++){
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + '년';
    if(y === curYr) opt.selected = true;
    yrSel.appendChild(opt);
  }
  // 월: 1~12
  for(let m = 1; m <= 12; m++){
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m + '월';
    if(m === curMo) opt.selected = true;
    moSel.appendChild(opt);
  }
}

// 고객사 선택
function selectLsCompany(companyId, companyName){
  currentLsCompanyId = companyId;
  // 글로벌 공유 변수만 업데이트 (다른 페이지 변수는 showPage()에서 처리)
  currentGlobalCompanyId = companyId;
  currentGlobalCompanyName = companyName;
  document.getElementById('ls-selected-company-label').innerHTML =
    `<i class="fas fa-chart-bar" style="margin-right:6px;"></i>${companyName} 근로계약 및 급여 현황`;
  document.getElementById('ls-company-select-card').style.display = 'none';
  document.getElementById('ls-list-section').style.display = 'block';
  // 연월 셀렉트 초기화 (처음 1회)
  initLsYearMonth();
  renderLaborStatus();
}

// 고객사 선택 해제
function clearLsCompanySelect(){
  currentLsCompanyId = null;
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  document.getElementById('ls-company-select-card').style.display = '';
  document.getElementById('ls-list-section').style.display = 'none';
  document.getElementById('ls-company-search').value = '';
  // 차트 정리
  if(lsPiePayChart){ lsPiePayChart.destroy(); lsPiePayChart = null; }
  if(lsPieDedChart){ lsPieDedChart.destroy(); lsPieDedChart = null; }
  if(lsDistChartInstance){ lsDistChartInstance.destroy(); lsDistChartInstance = null; }
  if(lsTrendChartInstance){ lsTrendChartInstance.destroy(); lsTrendChartInstance = null; }
  renderLsCompanyList();
}

// ── 이달 항목별 비율 파이 차트 ──
let lsPiePayChart = null, lsPieDedChart = null;

function renderLsPieChart(){
  const selCo = currentLsCompanyId;
  if(!selCo) return;
  const yr = parseInt(document.getElementById('ls-year')?.value) || new Date().getFullYear();
  const mo = parseInt(document.getElementById('ls-month')?.value) || new Date().getMonth()+1;
  const pays = allPayrolls.filter(p => !p.is_draft && p.company_id===selCo && p.pay_year==yr && p.pay_month==mo);

  // 뱃지
  const monthLabel = `${yr}년 ${mo}월 기준`;
  const badge = document.getElementById('ls-pie-month-badge');
  if(badge) badge.textContent = monthLabel;
  const dedBadge = document.getElementById('ls-ded-month-badge');
  if(dedBadge) dedBadge.textContent = monthLabel;

  // 항목별 합산 헬퍼
  const s = f => pays.reduce((a,p)=>a+(p[f]||0),0);

  // ── 지급 항목 ──
  const payItems = [
    { label:'기본급',         val: s('base_salary'),              color:'#3b82f6' },
    { label:'주휴수당',       val: s('weekly_holiday_pay'),       color:'#60a5fa' },
    { label:'직책수당',       val: s('position_allowance'),       color:'#93c5fd' },
    { label:'교통비',         val: s('transportation_allowance')||s('car_maintenance'), color:'#6366f1' },
    { label:'자가운전보조금', val: s('self_driving_allowance'),   color:'#7c3aed' },
    { label:'벽지수당',       val: s('remote_area_allowance'),    color:'#8b5cf6' },
    { label:'식대',           val: s('meal_allowance'),           color:'#6ee7b7' },
    { label:'보육수당',  val: s('childcare_allowance'),      color:'#34d399' },
    { label:'연구활동비',     val: s('research_allowance'),       color:'#10b981' },
    { label:'연장근로수당',   val: s('overtime_pay'),             color:'#fbbf24' },
    { label:'야간근로수당',   val: s('night_pay'),                color:'#f97316' },
    { label:'휴일근로수당',   val: s('holiday_pay'),              color:'#fb923c' },
    { label:'연차수당',       val: s('annual_leave_pay'),         color:'#c084fc' },
    { label:'정기 상여금',    val: s('bonus_pay'),                color:'#e879f9' },
    { label:'비정기 성과급',  val: s('performance_pay'),          color:'#d946ef' },
    { label:'실비변상적급여', val: s('actual_expense_pay'),       color:'#f472b6' },
    { label:'통신비',         val: s('communication_pay'),        color:'#fb7185' },
    { label:'기술수당',       val: s('skill_allowance'),          color:'#a5b4fc' },
    { label:'면허수당',       val: s('license_allowance'),        color:'#818cf8' },
    { label:'기타수당',       val: (s('etc_allowance')||0)+(s('other_pay')||0), color:'#f43f5e' },
  ].filter(i => i.val > 0);

  // ── 공제 항목 ──
  const dedItems = [
    { label:'소득세',       val: s('income_tax'),              color:'#ef4444' },
    { label:'지방소득세',   val: s('local_income_tax'),        color:'#f87171' },
    { label:'건강보험',     val: s('health_insurance'),        color:'#06b6d4' },
    { label:'장기요양',     val: s('long_term_care'),          color:'#22d3ee' },
    { label:'국민연금',     val: s('national_pension'),        color:'#3b82f6' },
    { label:'고용보험',     val: s('employment_insurance'),    color:'#60a5fa' },
    { label:'연말정산',     val: s('year_end_tax_adjust'),     color:'#f59e0b' },
    { label:'건보정산',     val: s('health_insurance_adjust'), color:'#fbbf24' },
    { label:'선지급공제',   val: s('advance_deduction'),       color:'#a78bfa' },
  ].filter(i => i.val > 0);

  const grossTotal = pays.reduce((a,p)=>a+(p.gross_pay||0),0);
  const dedTotal   = pays.reduce((a,p)=>a+(p.gross_pay||0)-(p.net_pay||0),0);

  // 총액 뱃지
  const totalBadge = document.getElementById('ls-pie-total-badge');
  if(totalBadge) totalBadge.textContent = `총 지급액 ${Math.round(grossTotal).toLocaleString('ko-KR')}원`;
  const dedTotalBadge = document.getElementById('ls-ded-total-badge');
  if(dedTotalBadge) dedTotalBadge.textContent = `공제 합계 ${Math.round(dedTotal).toLocaleString('ko-KR')}원`;

  const payTotal = document.getElementById('ls-pie-pay-total');
  if(payTotal) payTotal.textContent = (Math.round(grossTotal)/10000).toFixed(0)+'만원';
  const dedTotalEl = document.getElementById('ls-pie-ded-total');
  if(dedTotalEl) dedTotalEl.textContent = (Math.round(dedTotal)/10000).toFixed(0)+'만원';

  // 범례 생성 헬퍼 (2열 그리드 셀 단위)
  function makeLegend(containerId, items, total){
    const el = document.getElementById(containerId);
    if(!el) return;
    if(items.length===0){ el.innerHTML='<span style="font-size:11px;color:#9ca3af;grid-column:span 2;">데이터 없음</span>'; return; }
    el.innerHTML = items.map(i=>{
      const pct = total>0 ? (i.val/total*100).toFixed(1) : '0.0';
      const amt = Math.round(i.val).toLocaleString('ko-KR');
      return `<div style="display:flex;flex-direction:column;gap:2px;padding:8px 10px;background:#f9fafb;border:1px solid #f0f2f5;border-radius:8px;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="flex:0 0 9px;height:9px;border-radius:50%;background:${i.color};display:inline-block;"></span>
          <span style="font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">${i.label}</span>
          <span style="font-size:12px;font-weight:800;color:#111827;white-space:nowrap;">${pct}%</span>
        </div>
        <div style="font-size:10.5px;color:#9ca3af;padding-left:15px;">${amt}원</div>
      </div>`;
    }).join('');
  }

  // 파이 차트 생성 헬퍼
  function makePie(canvasId, items, total, existingChart){
    const ctx = document.getElementById(canvasId);
    if(!ctx) return null;
    if(existingChart){ existingChart.destroy(); }
    if(items.length===0) return null;
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: items.map(i=>i.label),
        datasets:[{
          data: items.map(i=>i.val),
          backgroundColor: items.map(i=>i.color),
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        cutout:'62%',
        plugins:{
          legend:{ display:false },
          tooltip:{
            backgroundColor:'rgba(17,24,39,0.93)', titleColor:'#e5e7eb', bodyColor:'#d1d5db',
            padding:10, cornerRadius:8,
            callbacks:{
              label: ctx => {
                const pct = total>0?(ctx.parsed/total*100).toFixed(1):'0.0';
                return ` ${ctx.label}: ${Math.round(ctx.parsed).toLocaleString('ko-KR')}원 (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  makeLegend('ls-pie-pay-legend', payItems, grossTotal);
  makeLegend('ls-pie-ded-legend', dedItems, dedTotal);
  lsPiePayChart = makePie('ls-pie-pay-chart', payItems, grossTotal, lsPiePayChart);
  lsPieDedChart = makePie('ls-pie-ded-chart', dedItems, dedTotal,   lsPieDedChart);
}

// ── 지급액 분포 차트 (인원별 / 부서별 / 직급별) ──
let lsDistChartInstance = null;
let currentLsDistTab = 'emp';

function switchLsDistTab(tab){
  currentLsDistTab = tab;
  const tabs = ['emp','dept','rank'];
  tabs.forEach(t => {
    const btn = document.getElementById('ls-dist-tab-'+t);
    if(!btn) return;
    if(t === tab){
      btn.classList.add('ct-tab-active');
    } else {
      btn.classList.remove('ct-tab-active');
    }
  });
  renderLsDistChart();
}

// 파이 차트 인스턴스 (부서별/직급별 전용)
let lsDistPieChartInstance = null;

function renderLsDistChart(){
  const selCo = currentLsCompanyId || currentGlobalCompanyId;
  if(!selCo) return;
  const yr = parseInt(document.getElementById('ls-year')?.value) || new Date().getFullYear();
  const mo = parseInt(document.getElementById('ls-month')?.value) || new Date().getMonth()+1;
  const pays = allPayrolls.filter(p => !p.is_draft && p.company_id===selCo && p.pay_year==yr && p.pay_month==mo);

  // 뱃지
  const badge = document.getElementById('ls-dist-month-badge');
  if(badge) badge.textContent = `${yr}년 ${mo}월 기준`;

  const grossTotal = pays.reduce((a,p)=>a+(p.gross_pay||0),0);
  const netTotal   = pays.reduce((a,p)=>a+(p.net_pay||0),0);
  const dedTotal   = grossTotal - netTotal;

  // 요약 뱃지
  const summaryEl = document.getElementById('ls-dist-summary');
  if(summaryEl){
    const fmt = v => Math.round(v).toLocaleString('ko-KR');
    summaryEl.innerHTML = [
      { label:'지급총액', val: fmt(grossTotal)+'원', bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
      { label:'공제합계', val: fmt(dedTotal)+'원',   bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
      { label:'실지급액', val: fmt(netTotal)+'원',   bg:'#f0fdf4', color:'#065f46', border:'#bbf7d0' },
      { label:'지급인원', val: pays.length+'명',      bg:'#fdf4ff', color:'#7e22ce', border:'#e9d5ff' },
    ].map(b=>`
      <div style="display:flex;flex-direction:column;gap:2px;padding:8px 14px;background:${b.bg};border:1px solid ${b.border};border-radius:8px;">
        <span style="font-size:10.5px;color:#9ca3af;">${b.label}</span>
        <span style="font-size:13px;font-weight:800;color:${b.color};white-space:nowrap;">${b.val}</span>
      </div>`).join('');
  }

  // ── 공통 색상 팔레트 ──
  const PALETTE = [
    '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#ec4899','#f97316','#14b8a6','#a78bfa',
    '#84cc16','#fb923c','#e879f9','#22d3ee','#fbbf24',
  ];

  // ── 그룹별 집계 ──
  let groups = [];

  if(currentLsDistTab === 'emp'){
    groups = pays
      .map(p => ({
        label: getEmpName(p.employee_id),
        gross: p.gross_pay||0,
        net:   p.net_pay||0,
      }))
      .sort((a,b) => b.gross - a.gross);

  } else if(currentLsDistTab === 'dept'){
    const map = {};
    pays.forEach(p => {
      const emp = allEmployees.find(e=>e.id===p.employee_id);
      const key = emp?.department || '미지정';
      if(!map[key]) map[key] = {label:key, gross:0, net:0};
      map[key].gross += p.gross_pay||0;
      map[key].net   += p.net_pay||0;
    });
    groups = Object.values(map).sort((a,b)=>b.gross-a.gross);

  } else {
    const map = {};
    pays.forEach(p => {
      const emp = allEmployees.find(e=>e.id===p.employee_id);
      const key = emp?.position || emp?.rank || '미지정';
      if(!map[key]) map[key] = {label:key, gross:0, net:0};
      map[key].gross += p.gross_pay||0;
      map[key].net   += p.net_pay||0;
    });
    groups = Object.values(map).sort((a,b)=>b.gross-a.gross);
  }

  const barWrap = document.getElementById('ls-dist-bar-wrap');
  const pieWrap = document.getElementById('ls-dist-pie-wrap');
  const isPie   = (currentLsDistTab === 'dept' || currentLsDistTab === 'rank');

  // ── 데이터 없음 공통 처리 ──
  if(groups.length === 0){
    if(lsDistChartInstance){ lsDistChartInstance.destroy(); lsDistChartInstance = null; }
    if(lsDistPieChartInstance){ lsDistPieChartInstance.destroy(); lsDistPieChartInstance = null; }
    if(barWrap) barWrap.style.display = 'none';
    if(isPie){
      if(pieWrap) pieWrap.style.display = 'block';
      const inner    = document.getElementById('ls-dist-pie-inner');
      const emptyMsg = document.getElementById('ls-dist-pie-empty-msg');
      if(inner)    inner.style.display    = 'none';
      if(emptyMsg){ emptyMsg.style.display = 'flex'; emptyMsg.textContent = '해당 월 급여 데이터가 없습니다'; }
    } else {
      if(pieWrap) pieWrap.style.display = 'none';
    }
    return;
  }

  const colors = groups.map((_,i) => PALETTE[i % PALETTE.length]);

  // ════════════════════════════════════════
  // 인원별 → 가로 막대 차트
  // ════════════════════════════════════════
  if(!isPie){
    // 파이 차트 숨기기 / 정리
    if(lsDistPieChartInstance){ lsDistPieChartInstance.destroy(); lsDistPieChartInstance = null; }
    if(pieWrap) pieWrap.style.display = 'none';

    // 바 차트 표시
    if(barWrap){
      barWrap.style.display = 'block';
      const chartH = Math.max(200, groups.length * 44);
      barWrap.style.height = chartH + 'px';
      // canvas 복원
      if(!document.getElementById('ls-dist-chart')){
        barWrap.innerHTML = '<canvas id="ls-dist-chart"></canvas>';
      }
    }

    if(lsDistChartInstance){ lsDistChartInstance.destroy(); lsDistChartInstance = null; }
    const ctx = document.getElementById('ls-dist-chart');
    if(!ctx) return;

    lsDistChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: groups.map(g=>g.label),
        datasets: [
          {
            label: '지급총액',
            data: groups.map(g=>g.gross),
            backgroundColor: colors.map(c=>c+'cc'),
            borderColor: colors,
            borderWidth: 1.5,
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: '실지급액',
            data: groups.map(g=>g.net),
            backgroundColor: colors.map(c=>c+'44'),
            borderColor: colors.map(c=>c+'88'),
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          },
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: {
            position:'top', align:'end',
            labels:{ boxWidth:12, boxHeight:12, borderRadius:3, useBorderRadius:true,
                     font:{ size:11, family:"'Noto Sans KR',sans-serif" } }
          },
          tooltip: {
            backgroundColor:'rgba(17,24,39,0.93)', titleColor:'#e5e7eb', bodyColor:'#d1d5db',
            padding:11, cornerRadius:8,
            callbacks:{
              label: ctx => {
                const val = Math.round(ctx.parsed.x);
                const pct = grossTotal>0 ? (val/grossTotal*100).toFixed(1) : '0.0';
                return ` ${ctx.dataset.label}: ${val.toLocaleString('ko-KR')}원 (${pct}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color:'rgba(0,0,0,0.05)' },
            ticks: {
              font:{ size:10 }, color:'#9ca3af',
              callback: v => {
                if(v >= 1000000) return (v/10000).toFixed(0)+'만';
                return v.toLocaleString('ko-KR');
              }
            }
          },
          y: {
            grid: { display:false },
            ticks: { font:{ size:12, family:"'Noto Sans KR',sans-serif" }, color:'#374151' }
          }
        }
      }
    });

  // ════════════════════════════════════════
  // 부서별 / 직급별 → SVG 도넛 차트
  // ════════════════════════════════════════
  } else {
    if(lsDistChartInstance){ lsDistChartInstance.destroy(); lsDistChartInstance = null; }
    if(lsDistPieChartInstance){ lsDistPieChartInstance.destroy(); lsDistPieChartInstance = null; }
    if(barWrap) barWrap.style.display = 'none';

    // 영역 표시
    if(pieWrap) pieWrap.style.display = 'block';
    const _pieInner    = document.getElementById('ls-dist-pie-inner');
    const _pieEmptyMsg = document.getElementById('ls-dist-pie-empty-msg');
    if(_pieInner)    _pieInner.style.display    = 'flex';
    if(_pieEmptyMsg) _pieEmptyMsg.style.display = 'none';

    // ── SVG 도넛 차트 직접 생성 (display:none 부모 무관하게 동작) ──
    const svgWrap = document.getElementById('ls-dist-pie-svg-wrap');
    if(svgWrap){
      const SIZE   = 220;
      const CX     = SIZE / 2;           // 110
      const CY     = SIZE / 2;           // 110
      const R      = 88;                 // 외부 반지름
      const r      = 54;                 // 내부 반지름(도넛 구멍)
      const total  = groups.reduce((s, g) => s + g.gross, 0);
      const fmtAmt = v => Math.round(v).toLocaleString('ko-KR');

      // 호(arc) 계산 헬퍼
      function polarToXY(cx, cy, radius, angleDeg){
        const rad = (angleDeg - 90) * Math.PI / 180;
        return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
      }
      function makeArcPath(cx, cy, R, r, startDeg, endDeg){
        // 360도 전체(단일 데이터)면 circle로 대체 불가 → 살짝 줄임
        if(endDeg - startDeg >= 360) endDeg = startDeg + 359.99;
        const s1 = polarToXY(cx, cy, R, startDeg);
        const e1 = polarToXY(cx, cy, R, endDeg);
        const s2 = polarToXY(cx, cy, r, endDeg);
        const e2 = polarToXY(cx, cy, r, startDeg);
        const lg = (endDeg - startDeg) > 180 ? 1 : 0;
        return [
          `M ${s1.x} ${s1.y}`,
          `A ${R} ${R} 0 ${lg} 1 ${e1.x} ${e1.y}`,
          `L ${s2.x} ${s2.y}`,
          `A ${r} ${r} 0 ${lg} 0 ${e2.x} ${e2.y}`,
          'Z'
        ].join(' ');
      }

      // 조각 경로 생성
      let cursor = 0;
      const paths = groups.map((g, i) => {
        const slice = total > 0 ? (g.gross / total) * 360 : 0;
        const path  = makeArcPath(CX, CY, R, r, cursor, cursor + slice);
        cursor += slice;
        return `<path d="${path}" fill="${colors[i]}" stroke="#fff" stroke-width="2"
          style="cursor:pointer;transition:opacity .15s;"
          onmouseenter="this.style.opacity='.75'"
          onmouseleave="this.style.opacity='1'"
        ><title>${g.label}: ${fmtAmt(g.gross)}원 (${total>0?(g.gross/total*100).toFixed(1):0}%)</title></path>`;
      }).join('');

      // 중앙 텍스트
      const centerTxt = [
        `<text x="${CX}" y="${CY - 8}" text-anchor="middle" font-size="10" fill="#9ca3af" font-family="'Noto Sans KR',sans-serif">지급총액</text>`,
        `<text x="${CX}" y="${CY + 10}" text-anchor="middle" font-size="12" font-weight="800" fill="#1d4ed8" font-family="'Noto Sans KR',sans-serif">${fmtAmt(total)}</text>`,
        `<text x="${CX}" y="${CY + 24}" text-anchor="middle" font-size="10" fill="#6b7280" font-family="'Noto Sans KR',sans-serif">원</text>`,
      ].join('');

      svgWrap.innerHTML = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${paths}${centerTxt}</svg>`;
    }

    // 범례
    const legendEl = document.getElementById('ls-dist-pie-legend');
    if(legendEl){
      legendEl.innerHTML = groups.map((g, i) => {
        const pct = grossTotal > 0 ? (g.gross / grossTotal * 100).toFixed(1) : '0.0';
        const amt = Math.round(g.gross).toLocaleString('ko-KR');
        return `<div style="display:flex;flex-direction:column;gap:2px;padding:8px 10px;background:#f9fafb;border:1px solid #f0f2f5;border-radius:8px;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="flex:0 0 9px;height:9px;border-radius:50%;background:${colors[i]};display:inline-block;"></span>
            <span style="font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;">${g.label}</span>
            <span style="font-size:12px;font-weight:800;color:#111827;white-space:nowrap;">${pct}%</span>
          </div>
          <div style="font-size:10.5px;color:#9ca3af;padding-left:15px;">${amt}원</div>
        </div>`;
      }).join('');
    }
  }
}

// ── 연간 급여 추이 라인 차트 ──
let lsTrendChartInstance = null;
function renderLsYearTrendChart(){
  const selCo = currentLsCompanyId || currentGlobalCompanyId;
  if(!selCo) return;

  const baseYr = parseInt(document.getElementById('ls-year')?.value) || new Date().getFullYear();
  const baseMo = parseInt(document.getElementById('ls-month')?.value) || new Date().getMonth() + 1;

  // 선택된 달 기준 12개월(과거 11개월 + 현재월)
  const months = [];
  for(let i = 11; i >= 0; i--){
    let y = baseYr, m = baseMo - i;
    while(m <= 0){ m += 12; y--; }
    months.push({ y, m });
  }
  const labels = months.map(({y,m}) => `${y}.${String(m).padStart(2,'0')}`);

  // 월별 합산
  const sum = (arr, field) => arr.reduce((s,p) => s + (p[field]||0), 0);
  const monthData = months.map(({y,m}) => {
    const pays = allPayrolls.filter(p => !p.is_draft && p.company_id === selCo && p.pay_year == y && p.pay_month == m);
    const gross  = sum(pays,'gross_pay');
    const net    = sum(pays,'net_pay');
    const deduct = gross - net;
    const extra  = sum(pays,'overtime_pay') + sum(pays,'night_pay') + sum(pays,'holiday_pay');
    const irreg  = sum(pays,'annual_leave_pay') + sum(pays,'bonus_pay') + sum(pays,'actual_expense_pay') + sum(pays,'communication_pay') + sum(pays,'etc_allowance');
    const tax    = sum(pays,'income_tax') + sum(pays,'local_income_tax');
    const ins    = sum(pays,'health_insurance') + sum(pays,'long_term_care') + sum(pays,'national_pension') + sum(pays,'employment_insurance');
    const adj    = sum(pays,'year_end_tax_adjust') + sum(pays,'health_insurance_adjust') + sum(pays,'advance_deduction');
    return { gross, deduct, net, extra, irreg, tax, ins, adj };
  });

  // 체크박스 상태
  const chk = id => document.getElementById(id)?.checked;

  // 데이터셋 정의
  const DATASETS = [
    { id:'ltt-gross',  label:'총 지급액',    field:'gross',  color:'#3b82f6', dash:[] },
    { id:'ltt-deduct', label:'공제 총액',    field:'deduct', color:'#ef4444', dash:[] },
    { id:'ltt-net',    label:'실지급액',     field:'net',    color:'#10b981', dash:[] },
    { id:'ltt-extra',  label:'추가근로수당', field:'extra',  color:'#f59e0b', dash:[5,3] },
    { id:'ltt-irreg',  label:'부정기지급',   field:'irreg',  color:'#8b5cf6', dash:[5,3] },
    { id:'ltt-tax',    label:'세금',         field:'tax',    color:'#ec4899', dash:[4,2] },
    { id:'ltt-ins',    label:'4대보험',      field:'ins',    color:'#06b6d4', dash:[4,2] },
    { id:'ltt-adj',    label:'정산/추가공제',field:'adj',    color:'#6b7280', dash:[3,3] },
  ];

  const activeDatasets = DATASETS.filter(d => chk(d.id)).map(d => ({
    label: d.label,
    data: monthData.map(row => row[d.field]),
    borderColor: d.color,
    backgroundColor: d.color + '18',
    borderWidth: 2.5,
    borderDash: d.dash,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: d.color,
    tension: 0.35,
    fill: false,
  }));

  const ctx = document.getElementById('ls-trend-chart');
  if(!ctx) return;
  if(lsTrendChartInstance){ lsTrendChartInstance.destroy(); lsTrendChartInstance = null; }

  // 뱃지 텍스트 업데이트
  const badge = document.getElementById('ls-trend-year-badge');
  if(badge) badge.textContent = `${months[0].y}.${String(months[0].m).padStart(2,'0')} ~ ${months[11].y}.${String(months[11].m).padStart(2,'0')}`;

  if(activeDatasets.length === 0){
    // 아무것도 선택 안 된 경우 빈 캔버스만 표시
    lsTrendChartInstance = new Chart(ctx, { type:'line', data:{ labels, datasets:[] }, options:{ responsive:true, maintainAspectRatio:false } });
    return;
  }

  // Y축 단위 자동 결정
  const allVals = activeDatasets.flatMap(d => d.data);
  const maxVal = Math.max(...allVals, 0);
  let yFmt;
  if(maxVal >= 1000000) yFmt = v => (v/10000).toFixed(0)+'만';
  else yFmt = v => v.toLocaleString('ko-KR');

  lsTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: activeDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: {
          position:'top', align:'end',
          labels:{ boxWidth:14, boxHeight:3, borderRadius:2, useBorderRadius:true, font:{ size:11, family:"'Noto Sans KR',sans-serif" } }
        },
        tooltip: {
          backgroundColor:'rgba(17,24,39,0.93)', titleColor:'#e5e7eb', bodyColor:'#d1d5db',
          padding:12, cornerRadius:8, borderColor:'rgba(255,255,255,0.08)', borderWidth:1,
          callbacks:{
            title: items => `📅 ${items[0].label}`,
            label: ctx => ` ${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString('ko-KR')}원`
          }
        }
      },
      scales: {
        x: {
          grid:{ color:'rgba(0,0,0,0.04)' },
          ticks:{ font:{ size:11, family:"'Noto Sans KR',sans-serif" }, color:'#9ca3af', maxRotation:0 }
        },
        y: {
          beginAtZero:true,
          grid:{ color:'rgba(0,0,0,0.05)' },
          ticks:{ font:{ size:10 }, color:'#9ca3af', callback: yFmt }
        }
      }
    }
  });
}

function renderLaborStatus(){
  const yr = parseInt(document.getElementById('ls-year')?.value) || new Date().getFullYear();
  const mo = parseInt(document.getElementById('ls-month')?.value) || (new Date().getMonth() + 1);
  const monthLabel = `${yr}년 ${mo}월`;

  const selCo = currentLsCompanyId || currentGlobalCompanyId;
  if(!selCo) return; // 미선택 시 렌더 안 함

  const contractFilter = document.querySelector('input[name="ls-contract-filter"]:checked')?.value || 'all';

  // ── 통계 계산 ──
  const targetContracts = allContracts.filter(c => c.company_id === selCo);
  const activeContracts = targetContracts.filter(c => c.status === CONTRACT_STATUS.ACTIVE || c.status === CONTRACT_STATUS.DOCS_INCOMPLETE);
  
  // 유효 계약이 있는 직원만 대상
  const activeEmpIds = new Set(activeContracts.map(c => c.employee_id));
  const targetEmps = allEmployees.filter(e => e.company_id === selCo && activeEmpIds.has(e.id));
  const activeEmps = targetEmps.filter(e => e.status === EMP_STATUS.ACTIVE);
  const retiredEmps = targetEmps.filter(e => e.status !== EMP_STATUS.ACTIVE);
  const totalEmps = targetEmps.length;

  // 고용형태별 카운트 (전체 직원 기준) — 영문 DB 값으로 비교
  const catCount = cat => targetEmps.filter(e => normalizeContractType(e.employment_category) === cat).length;
  const cntRegular     = catCount(CONTRACT_TYPE.REGULAR);
  const cntRegularProb = catCount(CONTRACT_TYPE.REGULAR_PROBATION);
  const cntContract    = catCount(CONTRACT_TYPE.FIXED);
  const cntContractProb= catCount(CONTRACT_TYPE.FIXED_PROBATION);
  const cntDaily       = catCount(CONTRACT_TYPE.DAILY);

  const expiredContracts = targetContracts.filter(c => c.status === CONTRACT_STATUS.EXPIRED);

  const thisPays = allPayrolls.filter(p => !p.is_draft && p.company_id === selCo && p.pay_year == yr && p.pay_month == mo);
  const totalNet = thisPays.reduce((s,p) => s + (p.net_pay||0), 0);
  const totalGross = thisPays.reduce((s,p) => s + (p.gross_pay||0), 0);

  // ── 통계 카드 업데이트 ──
  // 전체 / 재직 / 퇴직 요약
  document.getElementById('ls-company-count').textContent = totalEmps;
  document.getElementById('ls-active-emp').textContent = activeEmps.length;
  document.getElementById('ls-retired-emp').textContent = retiredEmps.length;
  document.getElementById('ls-emp-status-badge').textContent = `${yr}년 ${mo}월 기준`;
  // 고용형태별 카드
  document.getElementById('ls-cat-regular').textContent      = cntRegular;
  document.getElementById('ls-cat-regular-prob').textContent = cntRegularProb;
  document.getElementById('ls-cat-contract').textContent     = cntContract;
  document.getElementById('ls-cat-contract-prob').textContent= cntContractProb;
  document.getElementById('ls-cat-daily').textContent        = cntDaily;
  document.getElementById('ls-active-contract').textContent = activeContracts.length;
  document.getElementById('ls-contract-sub-val').textContent = expiredContracts.length;
  const totalDeduct = totalGross - totalNet;
  document.getElementById('ls-gross-pay').textContent = Math.round(totalGross).toLocaleString('ko-KR') + '원';
  document.getElementById('ls-deduct-pay').textContent = Math.round(totalDeduct).toLocaleString('ko-KR') + '원';
  document.getElementById('ls-net-pay').textContent = Math.round(totalNet).toLocaleString('ko-KR') + '원';
  document.getElementById('ls-pay-month-badge').textContent = monthLabel + ' 기준';
  document.getElementById('ls-pay-month').textContent = monthLabel + ' 기준';
  document.getElementById('ls-contract-month').textContent = monthLabel + ' 기준';

  // ── 이달 지급대상 근로계약 목록 ──
  // 기준: 이달 급여 데이터가 있는 직원의 계약 OR 유효한 계약 (계약 상태 무관)
  const thisPayEmpIds = new Set(thisPays.map(p => p.employee_id));
  // 이달 급여가 입력된 직원의 계약 + 유효 계약을 합산 (중복 제거)
  const billingContracts = activeContracts.filter(c => {
    const hasPayThisMonth = thisPayEmpIds.has(c.employee_id);
    return hasPayThisMonth || true;  // 유효 계약은 항상 포함
  });

  let filteredContracts;
  if(contractFilter === 'paid')        filteredContracts = billingContracts.filter(c => thisPayEmpIds.has(c.employee_id));
  else if(contractFilter === 'unpaid') filteredContracts = billingContracts.filter(c => !thisPayEmpIds.has(c.employee_id));
  else                                 filteredContracts = billingContracts;

  // 정렬: 급여입력됨 먼저, 그 다음 이름순
  filteredContracts = [...filteredContracts].sort((a, b) => {
    const aPaid = thisPayEmpIds.has(a.employee_id) ? 0 : 1;
    const bPaid = thisPayEmpIds.has(b.employee_id) ? 0 : 1;
    if(aPaid !== bPaid) return aPaid - bPaid;
    return getEmpName(a.employee_id).localeCompare(getEmpName(b.employee_id), 'ko');
  });

  const ctTbody = document.getElementById('ls-contract-tbody');
  if(filteredContracts.length === 0){
    ctTbody.innerHTML = '<tr><td colspan="8" class="cen-empty"><i class="fas fa-inbox"></i> 해당하는 계약 내역이 없습니다</td></tr>';
  } else {
    ctTbody.innerHTML = filteredContracts.map(c => {
      const emp = allEmployees.find(e => e.id === c.employee_id);
      const empCat = emp?.employment_category || '-';
      const catBadge = empCatBadge(empCat);
      const isResigned = emp?.status===EMP_STATUS.RESIGNED && emp?.resign_date;
      const periodTxt = empCat ===CONTRACT_TYPE.REGULAR
        ? (isResigned ? `${c.contract_start||'-'} ~ ${emp.resign_date}` : `${c.contract_start||'-'} ~ 현재`)
        : `${c.contract_start||'-'} ~ ${c.contract_end||'미정'}`;
      const workInfo = (c.work_hours_per_day && c.work_days_per_week)
        ? `일 ${c.work_hours_per_day}h / 주 ${c.work_days_per_week}일` : '-';
      // 이달 급여 입력 여부
      const hasPay = thisPayEmpIds.has(c.employee_id);
      const payBadge = hasPay
        ? `<span class="badge badge-green">급여입력됨</span>`
        : `<button onclick="goPayrollInputNew('${c.company_id}','${c.employee_id}',${yr},${mo})"
            class="btn btn-blue btn-sm" style="padding:3px 10px;font-size:11px;">
            <i class="fas fa-plus"></i> 입력
          </button>`;
      // 계약 상태 뱃지
      const {badge:stBadge2, label:stName2} = calcContractStatusDisplay(c, new Date().toISOString().slice(0,10));
      const stBadge = stBadge2; const stLabel2 = stName2;
      return `<tr>
        <td style="font-weight:600;">${getEmpName(c.employee_id)}</td>
        <td style="text-align:center;font-size:12px;">${(()=>{const e=(allEmployees||[]).find(x=>x.id===c.employee_id);return genderLabel(e);})()}</td>
        <td><span class="badge ${catBadge}">${contractTypeLabel(empCat)}</span></td>
        <td style="font-size:11px;color:#555;">${periodTxt}</td>
        <td style="font-size:11.5px;color:#666;">${workInfo}</td>
        <td class="amount-green" style="font-weight:600;">${won(c.monthly_salary_agreed)}</td>
        <td><span class="badge ${stBadge}">${stLabel2}</span></td>
        <td>${payBadge}</td>
      </tr>`;
    }).join('');
  }

  // ── 급여 현황: 직원별 목록 ──
  const payTbody = document.getElementById('ls-pay-tbody');
  document.getElementById('ls-pay-count').textContent = `${thisPays.length}명`;
  if(thisPays.length === 0){
    payTbody.innerHTML = '<tr><td colspan="6" class="cen-empty"><i class="fas fa-inbox"></i> 해당 월 급여 내역이 없습니다</td></tr>';
  } else {
    const sortedPays = [...thisPays].sort((a,b) => getEmpName(a.employee_id).localeCompare(getEmpName(b.employee_id),'ko'));
    payTbody.innerHTML = sortedPays.map(p => {
      const emp = allEmployees.find(e => e.id === p.employee_id);
      const deduct = (p.gross_pay||0) - (p.net_pay||0);
      return `<tr>
        <td style="font-weight:600;">${getEmpName(p.employee_id)}</td>
        <td style="text-align:center;font-size:12px;">${(()=>{const e=(allEmployees||[]).find(x=>x.id===p.employee_id);return genderLabel(e);})()}</td>
        <td style="font-size:11.5px;color:#666;">${emp?.department||'-'}</td>
        <td class="amount-blue">${won(p.gross_pay)}</td>
        <td style="color:#ef4444;font-size:12px;">${won(deduct)}</td>
        <td class="amount-green" style="font-weight:700;">${won(p.net_pay)}</td>
      </tr>`;
    }).join('');
  }

  // 차트 갱신
  renderLsPieChart();
  renderLsDistChart();
  renderLsYearTrendChart();
}

