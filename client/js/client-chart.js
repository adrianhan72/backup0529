function changePsMonth(d){
  psMonth += d;
  if(psMonth>12){psMonth=1;psYear++;} if(psMonth<1){psMonth=12;psYear--;}
  renderPayslipList();
}

function renderPayslipList(){
  const el = document.getElementById('payslip-list-content');

  // 재직 직원 전체를 사번순으로 표시 (그룹 필터 없음)
  const emps = allEmployees.filter(e=>_isEmpActive(e));

  if(!emps.length){
    el.innerHTML='<div class="no-data"><i class="fas fa-user-slash"></i><p>재직 중인 직원이 없습니다</p></div>';
    return;
  }

  // 선택 연월 급여 데이터
  const monthPays = allPayrolls.filter(p=>Number(p.pay_year)===psYear && Number(p.pay_month)===psMonth);

  // 정렬: 사번 오름차순 (사번 없으면 이름순)
  const empNo = e => {
    const digits = String(e.employee_number == null ? '' : e.employee_number).replace(/[^0-9]/g, '');
    return digits ? Number(digits) : Number.MAX_SAFE_INTEGER;
  };
  const sorted = [...emps].sort((a,b) =>
    empNo(a) - empNo(b) || (a.name||'').localeCompare(b.name||'','ko'));

  const cards = sorted.map(emp => {
    const p = monthPays.find(x=>x.employee_id===emp.id);
    const catLabel = contractTypeLabel_c(emp.employment_category);
    const avatarColor = PS_CAT_COLOR[catLabel]||'#6366f1';
    const initial = (emp.name||'?').charAt(0);

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

    return `<div class="ps-emp-card${!p?' ps-emp-card--unpaid':''}" onclick="${p?`openPayslipModal('${p.id}')`:'void(0)'}" style="${!p?'cursor:default;':''}">
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

// 하위호환용 (그룹 필터 제거됨)
function renderEmpChips(){ renderPayslipList(); }
function setPsFilter(){ renderPayslipList(); }

// ─ Payslip Modal ─
function openPayslipModal(payrollId){
  const p = allPayrolls.find(x=>x.id===payrollId); if(!p) return;
  const emp = allEmployees.find(x=>x.id===p.employee_id)||{};
  const contract = allContracts.find(c=>c.employee_id===p.employee_id&&_isContractActive(c));
  const hw = contract?contract.hourly_wage:p.hourly_wage||0;
  // 가불금 상환은 임금이 아니므로 임금통계(지급·공제·영수액)에서 제외
  const gross=p.gross_pay||0;
  const adv=Number(p.advance_deduction)||0;
  const sevInt=Number(p.severance_interim_pay)||0;
  const grossWage=gross-sevInt;
  const ded=(p.total_deduction||(gross-(p.net_pay||0)))-adv;
  const net=grossWage-ded;

  const payItems=[
    {label:'기본급',val:p.base_salary},
    {label:'주휴수당',val:p.weekly_holiday_pay},
    {label:'자격(직책)수당',val:p.position_allowance},
    {label:'연장근로수당',val:p.overtime_pay,sub:p.overtime_hours?`통상시급 ${won(hw)} × ${p.overtime_hours}h × 150%`:''},
    {label:'야간근로수당',val:p.night_pay,sub:p.night_hours?`통상시급 ${won(hw)} × ${p.night_hours}h × 50%(가산)`:''},
    {label:'휴일근로수당',val:p.holiday_pay,sub:p.holiday_hours?`통상시급 ${won(hw)} × ${p.holiday_hours}h (8h내 150%, 초과 200%)`:''},
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
  ];

  document.getElementById('payslip-modal-content').innerHTML = `
    <div class="ps-header">
      <div class="ps-month">${p.pay_year}년 ${p.pay_month}월 급여명세서</div>
      <div class="ps-net">${won(net)}</div>
      <div class="ps-emp">${emp.name||''} · ${emp.position||''} · ${emp.department||''}</div>
      ${p.pay_date?`<div class="ps-date"><i class="fas fa-calendar-check"></i> ${p.pay_date} 지급</div>`:''}
    </div>
    <div class="ps-summary">
      <div class="ps-sum-item"><div class="sl">지급합계</div><div class="sv plus">${won(grossWage)}</div></div>
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
    <div class="ps-total blue"><span>지급 합계</span><span>${won(grossWage)}</span></div>
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
];

function openPayRatioModal(){
  const pays = allPayrolls.filter(p => p.pay_year==statsYear && p.pay_month==statsMonth);

  // 헤더 정보 — 가불금 상환·퇴직금 중간정산은 임금 외 항목이므로 임금 기준으로 계산
  const grossRaw = pays.reduce((s,p)=>s+(p.gross_pay||0),0);
  const sevSum   = pays.reduce((s,p)=>s+(Number(p.severance_interim_pay)||0),0);
  const advance  = pays.reduce((s,p)=>s+(Number(p.advance_deduction)||0),0);
  const gross    = grossRaw - sevSum;
  const net      = pays.reduce((s,p)=>s+(p.net_pay||0),0) + advance - sevSum;
  const ded      = gross - net;
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
