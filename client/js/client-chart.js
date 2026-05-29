function setPsGroup(group, el){
  psGroup  = group;
  psSubVal = '__all__';
  document.querySelectorAll('.ps-group-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  _buildPsSubChips();
  renderPayslipList();
}

// ── 2단계 세부 칩 선택 ──
function setPsSubVal(val){
  psSubVal = val;
  document.querySelectorAll('.ps-sub-chip').forEach(b=>{
    b.classList.toggle('active', b.dataset.val === val);
  });
  renderPayslipList();
}

// ── 2단계 칩 목록 동적 생성 ──
function _buildPsSubChips(){
  const subBar   = document.getElementById('ps-sub-bar');
  const chipsEl  = document.getElementById('ps-sub-chips');
  const activeEmps = allEmployees.filter(e=>e.status==='재직'||e.status==='active');

  if(psGroup === 'all'){
    subBar.style.display = 'none';
    chipsEl.innerHTML = '';
    return;
  }

  // 세부 값 목록 추출
  let values = [];
  if(psGroup === 'cat'){
    // 고용형태: 실제 데이터에 있는 것만, 정해진 순서로
    const ORDER = ['정규직','정규직 수습','계약직','계약직 수습','일용직'];
    const has = new Set(activeEmps.map(e=>e.employment_category).filter(Boolean));
    values = ORDER.filter(v=>has.has(v));
  } else if(psGroup === 'dept'){
    values = [...new Set(activeEmps.map(e=>e.department||'미지정'))].sort((a,b)=>a.localeCompare(b,'ko'));
  } else { // rank
    values = [...new Set(activeEmps.map(e=>e.position||e.rank||'미지정'))].sort((a,b)=>a.localeCompare(b,'ko'));
  }

  subBar.style.display = '';

  // 고용형태 색상 매핑 (칩 dot 표시용)
  const catDotColor = {
    '정규직':'#3b82f6','정규직 수습':'#10b981',
    '계약직':'#f59e0b','계약직 수습':'#f97316','일용직':'#a855f7'
  };

  const makeChip = (val, label, isActive) => {
    const dot = (psGroup === 'cat' && catDotColor[val])
      ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${catDotColor[val]};margin-right:5px;flex-shrink:0;"></span>`
      : '';
    const cnt = val === '__all__'
      ? activeEmps.length
      : psGroup === 'cat'  ? activeEmps.filter(e=>(e.employment_category||'미지정')===val).length
      : psGroup === 'dept' ? activeEmps.filter(e=>(e.department||'미지정')===val).length
      : activeEmps.filter(e=>(e.position||e.rank||'미지정')===val).length;
    return `<button class="ps-sub-chip${isActive?' active':''}" data-val="${val}" onclick="setPsSubVal('${val}')">${dot}${label}<span style="margin-left:4px;font-size:10px;opacity:.65;">${cnt}</span></button>`;
  };

  chipsEl.innerHTML = [
    makeChip('__all__', '전체', true),
    ...values.map(v => makeChip(v, v, false))
  ].join('');
}

function changePsMonth(d){
  psMonth += d;
  if(psMonth>12){psMonth=1;psYear++;} if(psMonth<1){psMonth=12;psYear--;}
  renderPayslipList();
}

function renderPayslipList(){
  const el = document.getElementById('payslip-list-content');

  // 재직 직원 기본 풀
  let emps = allEmployees.filter(e=>e.status==='재직'||e.status==='active');

  // 그룹·세부 필터 적용
  if(psGroup !== 'all' && psSubVal !== '__all__'){
    if(psGroup === 'cat')  emps = emps.filter(e=>(e.employment_category||'미지정')===psSubVal);
    if(psGroup === 'dept') emps = emps.filter(e=>(e.department||'미지정')===psSubVal);
    if(psGroup === 'rank') emps = emps.filter(e=>(e.position||e.rank||'미지정')===psSubVal);
  }

  if(!emps.length){
    el.innerHTML='<div class="no-data"><i class="fas fa-user-slash"></i><p>해당 조건의 재직 직원이 없습니다</p></div>';
    return;
  }

  // 선택 연월 급여 데이터
  const monthPays = allPayrolls.filter(p=>Number(p.pay_year)===psYear && Number(p.pay_month)===psMonth);

  // 정렬: 그룹에 따라 기준 다르게
  let sorted;
  if(psGroup === 'dept'){
    sorted = [...emps].sort((a,b)=>{
      const da=(a.department||'미지정'), db=(b.department||'미지정');
      return da.localeCompare(db,'ko') || (a.name||'').localeCompare(b.name||'','ko');
    });
  } else if(psGroup === 'rank'){
    sorted = [...emps].sort((a,b)=>{
      const ra=(a.position||a.rank||'미지정'), rb=(b.position||b.rank||'미지정');
      return ra.localeCompare(rb,'ko') || (a.name||'').localeCompare(b.name||'','ko');
    });
  } else {
    sorted = [...emps].sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));
  }

  // 그룹 헤더를 삽입할 기준 키
  const groupKeyFn = emp =>
    psGroup==='dept' ? (emp.department||'미지정') :
    psGroup==='rank' ? (emp.position||emp.rank||'미지정') :
    psGroup==='cat'  ? (emp.employment_category||'기타') : null;

  let lastGroupKey = null;
  const cards = sorted.map(emp => {
    const p = monthPays.find(x=>x.employee_id===emp.id);
    const avatarColor = PS_CAT_COLOR[emp.employment_category]||'#6366f1';
    const initial = (emp.name||'?').charAt(0);
    const catLabel = emp.employment_category||'기타';

    // 그룹 헤더 (세부 전체 선택 or 그룹 모드일 때)
    let groupHeader = '';
    if(psSubVal === '__all__' && psGroup !== 'all'){
      const gk = groupKeyFn(emp);
      if(gk !== lastGroupKey){
        lastGroupKey = gk;
        const gCount = sorted.filter(e=>groupKeyFn(e)===gk).length;
        const gInputed = sorted.filter(e=>groupKeyFn(e)===gk && monthPays.find(x=>x.employee_id===e.id)).length;
        groupHeader = `<div class="ps-group-header">
          <span class="ps-group-header-name">${gk}</span>
          <span class="ps-group-header-badge">${gCount}명 중 ${gInputed}명 입력</span>
        </div>`;
      }
    }

    let payContent = '';
    if(p){
      const gross=p.gross_pay||0, net=p.net_pay||0, ded=gross-net;
      payContent = `
        <div class="ps-emp-rows">
          <div class="ps-emp-row">
            <span class="pr-label">지급총액</span>
            <span class="pr-val">${gross.toLocaleString('ko-KR')}원</span>
          </div>
          <div class="ps-emp-row">
            <span class="pr-label">공제합계</span>
            <span class="pr-val minus">-${ded.toLocaleString('ko-KR')}원</span>
          </div>
          <div class="ps-emp-row" style="border-bottom:none;">
            <span class="pr-label" style="font-weight:700;color:#1a1a2e;">실지급액</span>
            <span class="pr-val" style="color:#059669;font-size:13px;">${net.toLocaleString('ko-KR')}원</span>
          </div>
          ${p.pay_date?`<div style="font-size:10.5px;color:#9ca3af;padding:4px 0 2px;text-align:right;"><i class="fas fa-calendar-check" style="margin-right:3px;color:#a5b4fc;"></i>${p.pay_date} 지급</div>`:''}
        </div>`;
    } else {
      payContent = `<div class="ps-emp-no-pay"><i class="fas fa-file-invoice" style="color:#d1d5db;margin-right:5px;"></i>${psYear}년 ${psMonth}월 급여 미입력</div>`;
    }

    const card = `<div class="ps-emp-card${!p?' ps-emp-card--unpaid':''}" onclick="${p?`openPayslipModal('${p.id}')`:'void(0)'}" style="${!p?'cursor:default;':''}">
      <div class="ps-emp-card-header">
        <div class="ps-emp-avatar" style="background:${avatarColor};">${initial}</div>
        <div class="ps-emp-info">
          <div class="ps-emp-name">${emp.name||'-'}</div>
          <div class="ps-emp-meta">${catLabel}${emp.position?` · ${emp.position}`:''}${emp.department?` · ${emp.department}`:''}</div>
        </div>
        ${p?`<div class="ps-emp-pay">
          <div class="ps-emp-net">${(p.net_pay||0).toLocaleString('ko-KR')}원</div>
          <div class="ps-emp-gross">총 ${(p.gross_pay||0).toLocaleString('ko-KR')}원</div>
        </div>`:`<div class="ps-emp-unpaid-badge"><i class="fas fa-exclamation-circle"></i> 미입력</div>`}
      </div>
      ${payContent}
    </div>`;

    return groupHeader + card;
  }).join('');

  const inputCount = sorted.filter(emp=>monthPays.find(x=>x.employee_id===emp.id)).length;
  const totalCount = sorted.length;

  el.innerHTML = `
    <div class="ps-list-summary">
      <span class="ps-list-title">${psYear}년 ${psMonth}월 명세서</span>
      <span class="ps-list-count">총 ${totalCount}명 중 <strong>${inputCount}명</strong> 입력됨</span>
    </div>
    ${cards}`;
}

// renderEmpChips / setPsFilter – 하위호환 유지
function renderEmpChips(){ renderPayslipList(); }
function setPsFilter(cat){ psGroup='all'; psSubVal='__all__'; renderPayslipList(); }

// ─ Payslip Modal ─
function openPayslipModal(payrollId){
  const p = allPayrolls.find(x=>x.id===payrollId); if(!p) return;
  const emp = allEmployees.find(x=>x.id===p.employee_id)||{};
  const contract = allContracts.find(c=>c.employee_id===p.employee_id&&(c.status==='active'||c.status==='활성'));
  const hw = contract?contract.hourly_wage:p.hourly_wage||0;
  const gross=p.gross_pay||0, net=p.net_pay||0, ded=(p.total_deduction||(gross-net));

  const payItems=[
    {label:'기본급',val:p.base_salary},
    {label:'주휴수당',val:p.weekly_holiday_pay},
    {label:'자격(직책)수당',val:p.position_allowance},
    {label:'연장근로수당',val:p.overtime_pay,sub:p.overtime_hours?`통상시급 ${won(hw)} × ${p.overtime_hours}h × 150%`:''},
    {label:'야간근로수당',val:p.night_pay,sub:p.night_hours?`통상시급 × ${p.night_hours}h × 50%`:''},
    {label:'휴일근로수당',val:p.holiday_pay,sub:p.holiday_hours?`통상시급 × ${p.holiday_hours}h × 150%`:''},
    {label:'차량유지비',val:p.car_maintenance},
    {label:'식대',val:p.meal_allowance},
    {label:'연차수당',val:p.annual_leave_pay},
    {label:'기타(상여·실비·통신비)',val:p.other_pay},
  ];
  const dedItems=[
    {label:'소득세',val:p.income_tax,sub:'간이세액표 적용'},
    {label:'주민세',val:p.local_income_tax,sub:'소득세 × 10%'},
    {label:'건강보험',val:p.health_insurance,sub:`보수월액(${(p.standard_monthly_pay||0).toLocaleString('ko-KR')}) × 3.545%`},
    {label:'장기요양보험',val:p.long_term_care,sub:'건강보험 × 12.95%'},
    {label:'국민연금',val:p.national_pension,sub:'보수월액(상한 6,370,000) × 4.5%'},
    {label:'고용보험',val:p.employment_insurance,sub:'보수월액 × 0.9%'},
    ...(p.year_end_tax_adjust?[{label:'연말정산'+(p.year_end_tax_adjust<0?' (환급)':' (추가납부)'),val:p.year_end_tax_adjust}]:[]),
    ...(p.health_insurance_adjust?[{label:'건강보험정산'+(p.health_insurance_adjust<0?' (환급)':' (추가납부)'),val:p.health_insurance_adjust}]:[]),
    ...(p.advance_deduction?[{label:'기타(선지급) 공제',val:p.advance_deduction}]:[]),
  ];

  document.getElementById('payslip-modal-content').innerHTML = `
    <div class="ps-header">
      <div class="ps-month">${p.pay_year}년 ${p.pay_month}월 급여명세서</div>
      <div class="ps-net">${won(net)}</div>
      <div class="ps-emp">${emp.name||''} · ${emp.position||''} · ${emp.department||''}</div>
      ${p.pay_date?`<div class="ps-date"><i class="fas fa-calendar-check"></i> ${p.pay_date} 지급</div>`:''}
    </div>
    <div class="ps-summary">
      <div class="ps-sum-item"><div class="sl">지급합계</div><div class="sv plus">${won(gross)}</div></div>
      <div class="ps-divider"></div>
      <div class="ps-sum-item"><div class="sl">공제합계</div><div class="sv minus">-${won(ded)}</div></div>
      <div class="ps-divider"></div>
      <div class="ps-sum-item"><div class="sl">영수액</div><div class="sv net">${won(net)}</div></div>
    </div>
    ${(p.work_days||p.overtime_hours)?`
    <div style="display:grid;grid-template-columns:repeat(5,1fr);background:#f8f9fb;border-bottom:1px solid #f0f2f5;padding:10px 0;text-align:center;">
      ${[['근로일수',(p.work_days||'-')+'일'],['총근로시간',(p.total_work_hours||'-')+'h'],['연장',(p.overtime_hours||0)+'h'],['야간',(p.night_hours||0)+'h'],['휴일',(p.holiday_hours||0)+'h']].map(([l,v])=>`<div><div style="font-size:9.5px;color:#aaa;">${l}</div><div style="font-size:12.5px;font-weight:700;margin-top:2px;">${v}</div></div>`).join('')}
    </div>`:''}
    <div class="ps-section">
      <div class="ps-section-title blue"><i class="fas fa-plus-circle"></i> 지급 내역</div>
      ${payItems.map(i=>`<div class="ps-row"><span class="pl">${i.label}</span><div style="text-align:right"><span class="pv ${!i.val?'zero':''}">${won(i.val)}</span>${i.sub&&i.val?`<div class="pv sub">${i.sub}</div>`:''}</div></div>`).join('')}
    </div>
    <div class="ps-total blue"><span>지급 합계</span><span>${won(gross)}</span></div>
    <div class="ps-section">
      <div class="ps-section-title red"><i class="fas fa-minus-circle"></i> 공제 내역</div>
      ${dedItems.map(i=>`<div class="ps-row"><span class="pl">${i.label}</span><div style="text-align:right"><span class="pv ${!i.val?'zero':''}" style="${(i.val||0)<0?'color:#10b981':''}">${(i.val||0)<0?'-'+won(Math.abs(i.val)):won(i.val)}</span>${i.sub?`<div class="pv sub">${i.sub}</div>`:''}</div></div>`).join('')}
    </div>
    <div class="ps-total red"><span>공제 합계</span><span>${won(ded)}</span></div>
    <div class="ps-net-row"><span>🏦 영수액 (실수령액)</span><span class="nv">${won(net)}</span></div>
    ${p.note?`<div style="padding:12px 16px;font-size:12.5px;color:#666;border-top:1px solid #f0f2f5;"><i class="fas fa-sticky-note" style="color:#f59e0b;margin-right:5px;"></i>${p.note}</div>`:''}
  `;
  document.getElementById('payslip-modal').classList.add('open');
}
function closePayslipModal(){ document.getElementById('payslip-modal').classList.remove('open'); }

// ══ 급여 항목별 비율 모달 ══
let _prPayChart = null, _prDedChart = null;
let _prCurrentTab = 'pay';

const PAY_ITEMS_META = [
  {key:'base_salary',        label:'기본급',        color:'#3b82f6'},
  {key:'weekly_holiday_pay', label:'주휴수당',      color:'#60a5fa'},
  {key:'position_allowance', label:'직책수당',      color:'#818cf8'},
  {key:'overtime_pay',       label:'연장근로수당',  color:'#f59e0b'},
  {key:'night_pay',          label:'야간근로수당',  color:'#f97316'},
  {key:'holiday_pay',        label:'휴일근로수당',  color:'#fb923c'},
  {key:'car_maintenance',    label:'차량유지비',    color:'#a5b4fc'},
  {key:'meal_allowance',     label:'식대',          color:'#6ee7b7'},
  {key:'annual_leave_pay',   label:'연차수당',      color:'#c084fc'},
  {key:'other_pay',          label:'기타수당',      color:'#e879f9'},
];
const DED_ITEMS_META = [
  {key:'income_tax',              label:'소득세',       color:'#ef4444'},
  {key:'local_income_tax',        label:'지방소득세',   color:'#f87171'},
  {key:'national_pension',        label:'국민연금',     color:'#3b82f6'},
  {key:'health_insurance',        label:'건강보험',     color:'#06b6d4'},
  {key:'long_term_care',          label:'장기요양',     color:'#22d3ee'},
  {key:'employment_insurance',    label:'고용보험',     color:'#60a5fa'},
  {key:'year_end_tax_adjust',     label:'연말정산',     color:'#f59e0b'},
  {key:'health_insurance_adjust', label:'건보정산',     color:'#fbbf24'},
  {key:'advance_deduction',       label:'기타공제',     color:'#a78bfa'},
];

function openPayRatioModal(){
  const pays = allPayrolls.filter(p => p.pay_year==statsYear && p.pay_month==statsMonth);

  // 헤더 정보
  const gross = pays.reduce((s,p)=>s+(p.gross_pay||0),0);
  const net   = pays.reduce((s,p)=>s+(p.net_pay||0),0);
  const ded   = gross - net;
  document.getElementById('pr-header-title').textContent = `${statsYear}년 ${statsMonth}월 · ${pays.length}명 급여`;
  document.getElementById('pr-header-amount').textContent = won(gross);
  document.getElementById('pr-header-meta').innerHTML = [
    {label:'실지급액', val:won(net),  bg:'rgba(16,185,129,.25)', color:'#6ee7b7'},
    {label:'공제합계', val:won(ded),  bg:'rgba(239,68,68,.25)',  color:'#fca5a5'},
    {label:'지급인원', val:pays.length+'명', bg:'rgba(99,102,241,.25)', color:'#c7d2fe'},
  ].map(b=>`<span class="pr-header-badge" style="background:${b.bg};color:${b.color};">${b.label} ${b.val}</span>`).join('');

  // 데이터 집계
  const sumByKey = (meta, arr) => meta.map(m => ({
    ...m,
    val: arr.reduce((s,p)=>s+(p[m.key]||0),0)
  })).filter(m => m.val !== 0); // 0원 항목 제외

  const payItems = sumByKey(PAY_ITEMS_META, pays);
  const dedItems = sumByKey(DED_ITEMS_META, pays);

  // 차트 & 리스트 렌더
  _renderPrPanel('pay', payItems, gross, '지급 합계');
  _renderPrPanel('ded', dedItems, ded,   '공제 합계');

  // 탭 초기화
  _prCurrentTab = 'pay';
  document.getElementById('pr-tab-pay').classList.add('active');
  document.getElementById('pr-tab-ded').classList.remove('active');
  document.getElementById('pr-panel-pay').classList.add('active');
  document.getElementById('pr-panel-ded').classList.remove('active');

  document.getElementById('pay-ratio-modal').classList.add('open');
  // 모달 열린 후 차트 크기 재계산 (애니메이션 완료 후)
  setTimeout(() => {
    if(_prPayChart) _prPayChart.resize();
    if(_prDedChart) _prDedChart.resize();
  }, 320);
}

function _renderPrPanel(type, items, total, centerLabel){
  const canvasId   = `pr-${type}-canvas`;
  const centerId   = `pr-${type}-center-val`;
  const listId     = `pr-${type}-list`;
  const chartRef   = type==='pay' ? _prPayChart : _prDedChart;

  // 중앙 값
  document.getElementById(centerId).textContent = wonM(total);

  // 빈 데이터 처리
  const safeItems = items.length ? items : [{label:'데이터 없음', val:1, color:'#e5e7eb'}];
  const isEmpty   = !items.length;

  // 도넛 차트: 있으면 update, 없으면 새로 생성
  const ctx = document.getElementById(canvasId);
  if(chartRef){
    chartRef.data.labels = safeItems.map(i=>i.label);
    chartRef.data.datasets[0].data  = safeItems.map(i=>i.val);
    chartRef.data.datasets[0].backgroundColor = safeItems.map(i=>i.color);
    chartRef.update('none');
  } else {
    const newChart = new Chart(ctx, {
      type:'doughnut',
      data:{
        labels: safeItems.map(i=>i.label),
        datasets:[{
          data: safeItems.map(i=>i.val),
          backgroundColor: safeItems.map(i=>i.color),
          borderWidth: 2,
          borderColor: '#fff',
          hoverBorderWidth: 3,
          hoverOffset: 6,
        }]
      },
      options:{
        responsive:false,
        maintainAspectRatio:false,
        cutout:'70%',
        animation:{duration: 500, easing:'easeOutQuart'},
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{
            label: c => {
              if(isEmpty) return '';
              const pct = (total>0 ? c.raw/total*100 : 0).toFixed(1);
              return ` ${c.label}: ${Math.round(c.raw).toLocaleString('ko-KR')}원 (${pct}%)`;
            }
          }}
        }
      }
    });
    if(type==='pay') _prPayChart = newChart;
    else             _prDedChart = newChart;
  }

  // 항목 리스트
  const listEl = document.getElementById(listId);
  if(isEmpty){
    listEl.innerHTML = `<div class="pr-empty"><i class="fas fa-inbox"></i><p>해당 월 데이터가 없습니다</p></div>`;
    return;
  }
  // 금액 내림차순 정렬
  const sorted = [...items].sort((a,b)=>b.val-a.val);
  listEl.innerHTML = sorted.map(item => {
    const pct    = total>0 ? (item.val/total*100) : 0;
    const pctStr = pct.toFixed(1);
    const barW   = Math.max(pct, pct>0?2:0).toFixed(1);
    return `<div class="pr-item">
      <div class="pr-item-dot" style="background:${item.color};"></div>
      <div class="pr-item-name" title="${item.label}">${item.label}</div>
      <div class="pr-item-bar-wrap">
        <div class="pr-item-bar-bg">
          <div class="pr-item-bar-fill" style="width:${barW}%;background:${item.color};"></div>
        </div>
      </div>
      <div class="pr-item-right">
        <div class="pr-item-pct">${pctStr}%</div>
        <div class="pr-item-amt">${Math.round(item.val).toLocaleString('ko-KR')}원</div>
      </div>
    </div>`;
  }).join('');
}

function switchPrTab(tab){
  _prCurrentTab = tab;
  ['pay','ded'].forEach(t => {
    document.getElementById(`pr-tab-${t}`).classList.toggle('active', t===tab);
    document.getElementById(`pr-panel-${t}`).classList.toggle('active', t===tab);
  });
  // 탭 전환 후 차트 크기 재계산 (숨겨진 상태에서 생성된 경우 대비)
  requestAnimationFrame(() => {
    const chart = tab==='pay' ? _prPayChart : _prDedChart;
    if(chart) chart.resize();
  });
}

function closePayRatioModal(){
  document.getElementById('pay-ratio-modal').classList.remove('open');
}
