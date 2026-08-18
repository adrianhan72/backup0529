function _adjustPsStickyTop(){
  requestAnimationFrame(() => {
    const header = document.querySelector('.app-header');
    const sf = document.querySelector('.ps-sticky-filters');
    if(header && sf){
      sf.style.top = header.offsetHeight + 'px';
    }
  });
}

// ══ 근로계약 서브페이지 ══

// 카테고리별 설정 (배경색, 아이콘, 텍스트색 등)
const CAT_CONFIG = Object.freeze({
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR]]:           { bg:'linear-gradient(135deg,#1d4ed8,#3b82f6)', icon:'👔', avatarBg:'#3b82f6', label:'정규직' },
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR_PROBATION]]: { bg:'linear-gradient(135deg,#047857,#10b981)', icon:'🌱', avatarBg:'#10b981', label:'정규직 (수습)' },
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED]]:             { bg:'linear-gradient(135deg,#92400e,#f59e0b)', icon:'📋', avatarBg:'#f59e0b', label:'계약직' },
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED_PROBATION]]:   { bg:'linear-gradient(135deg,#c2410c,#f97316)', icon:'📌', avatarBg:'#f97316', label:'계약직 (수습)' },
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.DAILY]]:             { bg:'linear-gradient(135deg,#6d28d9,#a855f7)', icon:'🔧', avatarBg:'#a855f7', label:'일용직' },
});

let _contractsBackPage = 'stats'; // 뒤로가기 대상

function showContractsByCategory(category){
  _contractsBackPage = 'stats';

  const cfg = CAT_CONFIG[category] || { bg:'linear-gradient(135deg,#374151,#6b7280)', icon:'👤', avatarBg:'#6b7280', label:category };

  // 해당 카테고리 직원 필터 (재직 우선, 퇴직은 뒤로)
  const emps = allEmployees
    .filter(e => _normContractType(e.employment_category) === _normContractType(category))
    .sort((a,b) => {
      const aActive = _isEmpActive(a) ? 0 : 1;
      const bActive = _isEmpActive(b) ? 0 : 1;
      if(aActive !== bActive) return aActive - bActive;
      return (a.name||'').localeCompare(b.name||'', 'ko');
    });

  // 배지 텍스트
  document.getElementById('contracts-page-badge').textContent = cfg.label + ' ' + emps.length + '명';

  // 히어로 배너
  const activeCount  = emps.filter(e => _isEmpActive(e)).length;
  const retiredCount = emps.length - activeCount;
  document.getElementById('contracts-hero').innerHTML = `
    <div class="cat-hero" style="background:${cfg.bg};">
      <div class="cat-hero-icon" style="background:rgba(255,255,255,.15);">${cfg.icon}</div>
      <div>
        <div class="cat-hero-name">${cfg.label}</div>
        <div class="cat-hero-sub">재직 ${activeCount}명 · 퇴직 ${retiredCount}명 · 탭하여 근로계약 조회</div>
      </div>
    </div>`;

  // 직원 카드 목록
  if(!emps.length){
    document.getElementById('contracts-list').innerHTML = `
      <div class="contracts-empty">
        <i class="fas fa-users-slash"></i>
        <p>${cfg.label} 직원이 없습니다</p>
      </div>`;
  } else {
    document.getElementById('contracts-list').innerHTML = emps.map(emp => {
      const isActive  = _isEmpActive(emp);
      const contracts = allContracts.filter(c => c.employee_id === emp.id)
                        .sort((a,b) => {
                          const aAct = _isContractActive(a) ? 0 : 1;
                          const bAct = _isContractActive(b) ? 0 : 1;
                          if(aAct !== bAct) return aAct - bAct;
                          return (b.contract_start||'').localeCompare(a.contract_start||'');
                        });
      const activeContract = contracts.find(c => _isContractActive(c));
      const hasContract    = contracts.length > 0;

      // 계약 상태 뱃지
      let statusHtml = '';
      if(activeContract){
        statusHtml = `<span class="ecc-contract-status" style="background:#d1fae5;color:#065f46;"><i class="fas fa-file-contract"></i>계약유효</span>`;
      } else if(hasContract){
        statusHtml = `<span class="ecc-contract-status" style="background:#fef3c7;color:#92400e;"><i class="fas fa-file-alt"></i>계약 ${contracts.length}건</span>`;
      } else {
        statusHtml = `<span class="ecc-contract-status" style="background:#fee2e2;color:#991b1b;"><i class="fas fa-exclamation-triangle"></i>계약 없음</span>`;
      }

      // 직원 아바타 (이름 첫글자)
      const initial = (emp.name||'?').charAt(0);
      const avatarBg = isActive ? cfg.avatarBg : '#9ca3af';

      // 부서/직급 메타
      const metaParts = [];
      if(emp.department) metaParts.push(emp.department);
      if(emp.position)   metaParts.push(emp.position);
      if(!isActive)      metaParts.push('퇴직');

      return `
        <div class="emp-contract-card ${hasContract?'has-contract':'no-contract'}" onclick="openContractModal('${emp.id}')">
          <div class="ecc-avatar" style="background:${avatarBg};">${initial}</div>
          <div class="ecc-info">
            <div class="ecc-name">${emp.name||'-'}${!isActive?'<span style="font-size:11px;color:#9ca3af;margin-left:5px;">퇴직</span>':''}</div>
            <div class="ecc-meta">
              ${metaParts.map(m=>`<span>${m}</span>`).join('<span style="color:#e5e7eb;">·</span>')}
            </div>
          </div>
          ${statusHtml}
          <i class="fas fa-chevron-right ecc-arrow"></i>
        </div>`;
    }).join('');
  }

  // 페이지 전환 (탭 네비 비활성화 상태로)
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-contracts').classList.add('active');
  // 스크롤 최상단으로
  document.getElementById('page-contracts').scrollTop = 0;
}

function goBackToStats(){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-stats').classList.add('active');
  document.getElementById('nav-stats').classList.add('active');
  _configHeaderMonth('stats');
}

// 근로계약 상세 모달 열기
function openContractModal(empId){
  const emp = allEmployees.find(e => e.id === empId);
  if(!emp) return;

  const isActive   = _isEmpActive(emp);
  // 고용형태: DB 영문 코드 → 표시 라벨 변환 (로직은 영문 코드로 비교)
  const catRaw     = emp.employment_category || '';
  const catNorm    = _normContractType(catRaw) || '';
  const category   = CONTRACT_TYPE_LABEL[catNorm] || catRaw || '-';
  const cfg        = CAT_CONFIG[category] || { bg:'linear-gradient(135deg,#374151,#6b7280)', icon:'👤', avatarBg:'#6b7280', label:category };
  const isDaily    = catNorm === CONTRACT_TYPE.DAILY;

  // 이 직원의 모든 계약 (유효→최신 순)
  const contracts = allContracts
    .filter(c => c.employee_id === empId)
    .sort((a,b) => {
      const aAct = _isContractActive(a) ? 0 : 1;
      const bAct = _isContractActive(b) ? 0 : 1;
      if(aAct !== bAct) return aAct - bAct;
      return (b.contract_start||'').localeCompare(a.contract_start||'');
    });

  const initial    = (emp.name||'?').charAt(0);
  const avatarBg   = isActive ? cfg.avatarBg : '#9ca3af';

  // 직원 헤더
  const empHeader = `
    <div class="contract-modal-header" style="background:${cfg.bg};">
      <div class="cm-emp-avatar" style="background:rgba(255,255,255,.15);">${initial}</div>
      <div class="cm-emp-name">${emp.name||'-'}</div>
      <div class="cm-emp-sub">
        ${[emp.department, emp.position].filter(Boolean).join(' · ')}
        ${emp.hire_date ? ' · 입사 ' + emp.hire_date : ''}
      </div>
      <div class="cm-status-badges">
        <span class="cm-badge" style="background:rgba(255,255,255,.15);color:#fff;">
          <i class="fas fa-id-badge"></i>${cfg.label}
        </span>
        <span class="cm-badge" style="background:${isActive?'rgba(16,185,129,.3)':'rgba(156,163,175,.3)'};color:#fff;">
          <i class="fas fa-circle" style="font-size:7px;"></i>${isActive?'재직중':'퇴직'}
        </span>
        ${contracts.length > 0 ? `<span class="cm-badge" style="background:rgba(255,255,255,.12);color:rgba(255,255,255,.85);"><i class="fas fa-file-contract"></i>계약 ${contracts.length}건</span>` : ''}
      </div>
    </div>`;

  // 계약 없음 안내
  if(!contracts.length){
    document.getElementById('contract-modal-content').innerHTML = empHeader + `
      <div style="padding:20px 18px;">
        <div class="no-contract-notice">
          <i class="fas fa-file-excel"></i>
          <p>등록된 근로계약서가 없습니다.<br>담당 노무사에게 문의하세요.</p>
        </div>
        ${emp.hire_date ? `
        <div class="cm-section">
          <div class="cm-section-title"><i class="fas fa-user"></i> 직원 기본 정보</div>
          ${_cmRow('입사일', emp.hire_date)}
          ${emp.resign_date ? _cmRow('퇴직일', emp.resign_date, 'red') : ''}
          ${_cmRow('고용형태', category)}
          ${emp.phone ? _cmRow('연락처', emp.phone) : ''}
        </div>` : ''}
      </div>`;
    document.getElementById('contract-modal').classList.add('open');
    return;
  }

  // 계약서 렌더링 (여러 건이면 모두 표시)
  const contractSections = contracts.map((c, idx) => {
    const isAct   = _isContractActive(c);
    const catBadgeStyle = {
      [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR]]:           'background:#dbeafe;color:#1d4ed8;',
      [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR_PROBATION]]: 'background:#d1fae5;color:#065f46;',
      [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED]]:             'background:#ede9fe;color:#6d28d9;',
      [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED_PROBATION]]:   'background:#fce7f3;color:#be185d;',
      [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.DAILY]]:             'background:#ffedd5;color:#c2410c;',
    }[category] || 'background:#f3f4f6;color:#374151;';
    const contType = `<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;${catBadgeStyle}">${category}</span>`;

    // 계약기간 텍스트
    let periodTxt = '';
    if(isDaily){
      periodTxt = c.contract_start ? c.contract_start + ' ~ ' + (c.contract_end||'') : '-';
    } else if(catNorm === CONTRACT_TYPE.REGULAR || catNorm === CONTRACT_TYPE.REGULAR_PROBATION){
      periodTxt = (c.contract_start||'-') + ' ~ ' + (_isEmpResigned(emp) && emp.resign_date ? emp.resign_date : '계속근로');
    } else {
      periodTxt = (c.contract_start||'-') + ' ~ ' + (c.contract_end||'미정');
    }

    // 소정근로시간
    const workTimeTxt = isDaily
      ? '일용직 (시급 적용)'
      : (c.work_hours_per_day ? `1일 ${c.work_hours_per_day}시간 / 주 ${c.work_days_per_week||'-'}일 (주 ${c.work_hours_per_day && c.work_days_per_week ? (c.work_hours_per_day * c.work_days_per_week)+'h' : '-'})` : '-');

    const breakTxt = c.break_time ? c.break_time + '분' : '-';

    // 임금 정보
    const wageRows = isDaily ? `
      ${_cmRow('시급', c.hourly_wage ? fmt(c.hourly_wage)+'원' : '-', 'highlight')}
      ${c.base_salary ? _cmRow('일급 기준', fmt(c.base_salary)+'원', 'green') : ''}
    ` : `
      ${c.monthly_salary_agreed ? _cmRow('약정 월 급여', fmt(c.monthly_salary_agreed)+'원', 'highlight') : ''}
      ${c.annual_salary ? _cmRow('연봉', fmt(c.annual_salary)+'원', 'blue') : ''}
      ${c.hourly_wage ? _cmRow('통상시급', fmt(c.hourly_wage)+'원') : ''}
      ${c.base_salary ? _cmRow('기본급', fmt(c.base_salary)+'원') : ''}
      ${c.weekly_holiday_pay ? _cmRow('주휴수당', fmt(c.weekly_holiday_pay)+'원') : ''}
      ${c.position_allowance ? _cmRow('직책수당', fmt(c.position_allowance)+'원') : ''}
      ${c.meal_allowance ? _cmRow('식대', fmt(c.meal_allowance)+'원') : ''}
      ${c.car_maintenance ? _cmRow('차량유지비', fmt(c.car_maintenance)+'원') : ''}
      ${c.other_allowance ? _cmRow('기타수당', fmt(c.other_allowance)+'원') : ''}
    `;

    const statusBadgeHtml = isAct
      ? `<span style="background:#d1fae5;color:#065f46;" class="cm-badge"><i class="fas fa-check-circle"></i>유효</span>`
      : `<span style="background:#f3f4f6;color:#6b7280;" class="cm-badge"><i class="fas fa-history"></i>만료</span>`;

    return `
      <div style="margin-bottom:${idx < contracts.length-1 ? '8px' : '0'};">
        ${contracts.length > 1 ? `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px 0;border-top:${idx>0?'6px solid #f0f2f5':'none'};">
          <span style="font-size:12px;font-weight:700;color:#6b7280;">계약 ${idx+1}/${contracts.length}</span>
          ${statusBadgeHtml}
        </div>` : `
        <div style="display:flex;justify-content:flex-end;padding:8px 18px 0;">
          ${statusBadgeHtml}
        </div>`}

        <div class="cm-section">
          <div class="cm-section-title"><i class="fas fa-file-signature"></i> 계약 기본</div>
          ${_cmRow('계약 유형', contType)}
          ${_cmRow('계약 기간', periodTxt)}
          ${c.annual_leave_days ? _cmRow('연차일수', c.annual_leave_days+'일') : ''}
        </div>

        <div class="cm-section">
          <div class="cm-section-title"><i class="fas fa-clock"></i> 근무 조건</div>
          ${_cmRow('소정근로시간', workTimeTxt)}
          ${_cmRow('휴게시간', breakTxt)}
        </div>

        <div class="cm-section">
          <div class="cm-section-title"><i class="fas fa-won-sign"></i> 임금</div>
          ${wageRows}
        </div>

        ${c.note ? `
        <div class="cm-section">
          <div class="cm-section-title"><i class="fas fa-sticky-note"></i> 메모</div>
          <div style="padding:10px 18px;font-size:12.5px;color:#555;line-height:1.6;">${c.note}</div>
        </div>` : ''}
      </div>`;
  }).join('');

  // 직원 기본 정보 섹션 (헤더 아래 보조)
  const empInfoSection = `
    <div class="cm-section" style="border-top:6px solid #f0f2f5;margin-top:4px;">
      <div class="cm-section-title"><i class="fas fa-user-circle"></i> 직원 기본 정보</div>
      ${_cmRow('입사일', emp.hire_date||'-')}
      ${emp.resign_date ? _cmRow('퇴직일', emp.resign_date, 'red') : ''}
      ${emp.department ? _cmRow('부서', emp.department) : ''}
      ${emp.position ? _cmRow('직급/직책', emp.position) : ''}
      ${emp.phone ? _cmRow('연락처', emp.phone) : ''}
    </div>`;

  document.getElementById('contract-modal-content').innerHTML =
    empHeader + `<div style="padding-bottom:8px;">` + contractSections + empInfoSection + `</div>`;

  document.getElementById('contract-modal').classList.add('open');
}

// cm-row 헬퍼
function _cmRow(label, value, cls){
  return `<div class="cm-row"><span class="cm-label">${label}</span><span class="cm-value${cls?' '+cls:''}">${value}</span></div>`;
}

function closeContractModal(){
  document.getElementById('contract-modal').classList.remove('open');
}

// ══ HELPERS ══
const won  = n => ((n||0).toLocaleString('ko-KR')) + '원';
const wonM = n => {
  const v = Math.round((n||0)/10000);
  return v.toLocaleString('ko-KR') + '만원';
};
const fmt = n => Math.round(n||0).toLocaleString('ko-KR');
const getEmpName = id => (allEmployees.find(e=>e.id===id)||{}).name || '알수없음';

// ══ 1. STATS PAGE ══
function changeMonth(d){
  // 헤더 연동 콜백에서 호출되므로 여기서는 직접 상태만 변경
  statsMonth += d;
  if(statsMonth > 12){ statsMonth=1; statsYear++; }
  if(statsMonth < 1){ statsMonth=12; statsYear--; }
  renderStats();
}

function renderStats(){
  // 헤더 연월 레이블 동기화
  const hmLabel = document.getElementById('hm-month-label');
  if(hmLabel) hmLabel.textContent = `${statsYear}년 ${statsMonth}월`;

  const pays = allPayrolls.filter(p => p.pay_year==statsYear && p.pay_month==statsMonth);
  const activeEmps = allEmployees.filter(e => _isEmpActive(e));
  const retiredEmps = allEmployees.filter(e => !_isEmpActive(e));
  const catCount = catLabel => allEmployees.filter(e => {
    const norm = _normContractType(e.employment_category);
    return CONTRACT_TYPE_LABEL[norm] === catLabel;
  }).length;

  // 직원 현황
  document.getElementById('s-total-emp').textContent   = allEmployees.length;
  document.getElementById('s-active-emp').textContent  = activeEmps.length;
  document.getElementById('s-retired-emp').textContent = retiredEmps.length;
  document.getElementById('s-cat-regular').textContent      = catCount('정규직');
  document.getElementById('s-cat-regular-prob').textContent = catCount('정규직 수습')||catCount('정규직(수습)');
  document.getElementById('s-cat-contract').textContent     = catCount('계약직');
  document.getElementById('s-cat-contract-prob').textContent= catCount('계약직 수습')||catCount('계약직(수습)');
  document.getElementById('s-cat-daily').textContent        = catCount('일용직');

  // 급여 집계
  const gross = pays.reduce((a,p) => a+(p.gross_pay||0), 0);
  const net   = pays.reduce((a,p) => a+(p.net_pay||0), 0);
  const ded   = gross - net;

  const activeContracts = allContracts.filter(c => _isContractActive(c));
  document.getElementById('s-active-contract').textContent = activeContracts.length;
  document.getElementById('s-pay-month-badge').textContent = `${statsYear}년 ${statsMonth}월` + ' 기준';
  document.getElementById('s-gross').textContent = fmt(gross).includes('0') && gross===0 ? '0원' : fmt(gross)+'원';
  document.getElementById('s-ded').textContent   = fmt(ded)+'원';
  document.getElementById('s-net').textContent   = fmt(net)+'원';
  document.getElementById('s-count').textContent = pays.length+'명';
  document.getElementById('s-ded-sub').textContent  = wonM(ded);
  document.getElementById('s-net-sub').textContent  = wonM(net);

  // (근로계약 현황은 별도 탭 page-ct에서 렌더)

  // 차트는 다음 프레임에 그려 UI 블로킹 최소화
  requestAnimationFrame(() => {
    renderDistChart(pays);
    renderTrendChart();
  });

  // 임금대장 보기 버튼 상태 업데이트
  _updateWageLedgerButton();
}

// ─ 분포 차트 ─
function switchDistTab(tab, el){
  distTab = tab;
  document.querySelectorAll('.dist-tab-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  const pays = allPayrolls.filter(p => p.pay_year==statsYear && p.pay_month==statsMonth);
  renderDistChart(pays);
}

function renderDistChart(pays){
  const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#a855f7','#06b6d4','#84cc16'];

  // ── 데이터 집계 ──
  let groups = [];
  if(distTab==='emp'){
    groups = pays.map(p => {
      const e = allEmployees.find(x=>x.id===p.employee_id)||{};
      return {label: e.name||'알수없음', gross: p.gross_pay||0, net: p.net_pay||0};
    }).sort((a,b)=>b.gross-a.gross);
  } else {
    const map = {};
    pays.forEach(p => {
      const e = allEmployees.find(x=>x.id===p.employee_id)||{};
      const k = distTab==='dept' ? (e.department||'미지정') : (e.position||e.rank||'미지정');
      if(!map[k]) map[k]={label:k, gross:0, net:0};
      map[k].gross += p.gross_pay||0; map[k].net += p.net_pay||0;
    });
    groups = Object.values(map).sort((a,b)=>b.gross-a.gross);
  }

  const totalGross = groups.reduce((a,g)=>a+g.gross, 0);
  const totalNet   = groups.reduce((a,g)=>a+g.net,   0);
  const totalDed   = totalGross - totalNet;

  // ── 요약 배지 ──
  document.getElementById('dist-summary').innerHTML = [
    {label:'지급총액', val:fmt(totalGross)+'원', bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe'},
    {label:'공제합계', val:fmt(totalDed)+'원',   bg:'#fef2f2', color:'#dc2626', border:'#fecaca'},
    {label:'실지급액', val:fmt(totalNet)+'원',   bg:'#f0fdf4', color:'#065f46', border:'#bbf7d0'},
    {label:'지급인원', val:pays.length+'명',      bg:'#fdf4ff', color:'#7e22ce', border:'#e9d5ff'},
  ].map(b=>`<div style="display:flex;flex-direction:column;gap:2px;padding:8px 10px;background:${b.bg};border:1px solid ${b.border};border-radius:10px;">
    <span style="font-size:10px;color:#9ca3af;font-weight:500;">${b.label}</span>
    <span style="font-size:13px;font-weight:800;color:${b.color};white-space:nowrap;letter-spacing:-0.3px;">${b.val}</span>
  </div>`).join('');

  const barWrap   = document.getElementById('dist-bar-wrap');
  const donutWrap = document.getElementById('dist-donut-wrap');

  // ════════════════════════════════════════
  // 인원별 → 가로 막대 차트
  // ════════════════════════════════════════
  if(distTab === 'emp'){
    barWrap.style.display   = '';
    donutWrap.style.display = 'none';

    const colors = groups.map((_,i)=>COLORS[i%COLORS.length]);

    if(!groups.length){
      barWrap.style.height = '60px';
      document.getElementById('dist-chart').style.display = 'none';
      return;
    }
    document.getElementById('dist-chart').style.display = '';
    barWrap.style.height = Math.max(180, groups.length * 44) + 'px';

    if(distChart){
      distChart.data.labels = groups.map(g=>g.label);
      distChart.data.datasets[0].data = groups.map(g=>g.gross);
      distChart.data.datasets[0].backgroundColor = colors.map(c=>c+'cc');
      distChart.data.datasets[1].data = groups.map(g=>g.net);
      distChart.data.datasets[1].backgroundColor = colors.map(c=>c+'44');
      distChart.update('none');
    } else {
      distChart = new Chart(document.getElementById('dist-chart'), {
        type:'bar',
        data:{
          labels: groups.map(g=>g.label),
          datasets:[
            {label:'지급총액', data:groups.map(g=>g.gross), backgroundColor:colors.map(c=>c+'cc'), borderRadius:4},
            {label:'실지급액', data:groups.map(g=>g.net),   backgroundColor:colors.map(c=>c+'44'), borderRadius:4},
          ]
        },
        options:{
          indexAxis:'y', responsive:true, maintainAspectRatio:false,
          interaction:{mode:'index', intersect:false},
          plugins:{
            legend:{position:'top', align:'end', labels:{font:{size:10}, usePointStyle:true, boxWidth:8}},
            tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${Math.round(c.raw).toLocaleString('ko-KR')}원`}}
          },
          scales:{
            x:{beginAtZero:true, grid:{color:'rgba(0,0,0,.04)'}, ticks:{font:{size:9}, callback:v=>(v>=1000000?(v/10000).toFixed(0)+'만':v.toLocaleString())}},
            y:{ticks:{font:{size:10}}, grid:{display:false}}
          }
        }
      });
    }
    return;
  }

  // ════════════════════════════════════════
  // 부서별 · 직급별 → 도넛 차트
  // ════════════════════════════════════════
  barWrap.style.display   = 'none';
  donutWrap.style.display = '';

  // 빈 데이터 처리
  const centerEl = document.getElementById('dist-donut-center');
  const legendEl = document.getElementById('dist-donut-legend');

  if(!groups.length){
    centerEl.innerHTML = `<div class="dist-donut-center-label">데이터 없음</div>`;
    legendEl.innerHTML = '';
    if(distDonutChart){ distDonutChart.data.labels=[]; distDonutChart.data.datasets[0].data=[]; distDonutChart.update('none'); }
    return;
  }

  const colors = groups.map((_,i)=>COLORS[i%COLORS.length]);
  const tabLabel = distTab==='dept' ? '부서별' : '직급별';

  // 중앙 텍스트
  centerEl.innerHTML = `
    <div class="dist-donut-center-label">${tabLabel}<br>지급총액</div>
    <div class="dist-donut-center-val">${wonM(totalGross)}</div>`;

  // 범례
  legendEl.innerHTML = groups.map((g, i) => {
    const pct = totalGross > 0 ? (g.gross / totalGross * 100).toFixed(1) : '0.0';
    const amtStr = (g.gross >= 10000000)
      ? (g.gross/10000000).toFixed(1)+'천만'
      : (g.gross >= 1000000)
        ? (g.gross/10000).toFixed(0)+'만'
        : g.gross.toLocaleString('ko-KR');
    return `<div class="dist-donut-legend-item">
      <div class="dist-donut-legend-dot" style="background:${colors[i]};"></div>
      <div class="dist-donut-legend-name" title="${g.label}">${g.label}</div>
      <div class="dist-donut-legend-pct">${pct}%</div>
      <div class="dist-donut-legend-amt">${amtStr}원</div>
    </div>`;
  }).join('');

  // 차트 업데이트 or 신규 생성
  if(distDonutChart){
    distDonutChart.data.labels = groups.map(g=>g.label);
    distDonutChart.data.datasets[0].data = groups.map(g=>g.gross);
    distDonutChart.data.datasets[0].backgroundColor = colors;
    distDonutChart.update('none');
  } else {
    distDonutChart = new Chart(document.getElementById('dist-donut-chart'), {
      type: 'doughnut',
      data: {
        labels: groups.map(g=>g.label),
        datasets:[{
          data: groups.map(g=>g.gross),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff',
          hoverBorderWidth: 3,
          hoverOffset: 6,
        }]
      },
      options:{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        animation: {duration: 500, easing:'easeOutQuart'},
        plugins:{
          legend:{display:false},
          tooltip:{callbacks:{
            label: c => {
              const pct = (totalGross>0 ? c.raw/totalGross*100 : 0).toFixed(1);
              return ` ${c.label}: ${Math.round(c.raw).toLocaleString('ko-KR')}원 (${pct}%)`;
            }
          }}
        }
      }
    });
  }
}

// ─ Trend ─
function renderTrendChart(){
  const months = [];
  for(let i=11;i>=0;i--){
    let m = statsMonth-i, y = statsYear;
    while(m<1){m+=12;y--;} while(m>12){m-=12;y++;}
    months.push({y,m});
  }
  const startM = months[0], endM = months[11];
  document.getElementById('trend-period-badge').textContent =
    `${startM.y}.${String(startM.m).padStart(2,'0')} ~ ${endM.y}.${String(endM.m).padStart(2,'0')}`;

  // 토글 버튼 초기화 (한 번만)
  const togglesEl = document.getElementById('trend-toggles');
  if(!togglesEl.children.length){
    togglesEl.innerHTML = TREND_ITEMS.map(t =>
      `<label class="tgl-chip ${trendOn[t.key]?'on':''}" style="border-color:${t.borderColor};${trendOn[t.key]?'background:'+t.color+';':'background:'+t.bgColor+';color:'+t.textColor+';'}"
        onclick="trendOn['${t.key}']=!trendOn['${t.key}'];this.classList.toggle('on');this.style.background=trendOn['${t.key}']?'${t.color}':'${t.bgColor}';this.style.color=trendOn['${t.key}']?'#fff':'${t.textColor}';renderTrendChart()">
        ${t.label}
      </label>`
    ).join('');
  }

  const labels = months.map(({y,m}) => `${y}.${String(m).padStart(2,'0')}`);
  const agg = months.map(({y,m}) => {
    const ps = allPayrolls.filter(p => p.pay_year==y && p.pay_month==m);
    const gross = ps.reduce((a,p)=>a+(p.gross_pay||0),0);
    const net   = ps.reduce((a,p)=>a+(p.net_pay||0),0);
    return {
      gross, net,
      ded:   gross - net,
      extra: ps.reduce((a,p)=>a+(p.overtime_pay||0)+(p.night_pay||0)+(p.holiday_pay||0),0),
      irreg: ps.reduce((a,p)=>a+(p.annual_leave_pay||0)+(p.other_pay||0),0),
      tax:   ps.reduce((a,p)=>a+(p.income_tax||0)+(p.local_income_tax||0),0),
      ins:   ps.reduce((a,p)=>a+(p.health_insurance||0)+(p.long_term_care||0)+(p.national_pension||0)+(p.employment_insurance||0),0),
      adj:   ps.reduce((a,p)=>a+(p.year_end_tax_adjust||0)+(p.health_insurance_adjust||0)+(p.advance_deduction||0),0),
    };
  });

  const datasets = TREND_ITEMS.filter(t=>trendOn[t.key]).map(t=>({
    label: t.label,
    data: agg.map(a=>a[t.key]),
    borderColor: t.color,
    backgroundColor: t.color+'18',
    borderWidth:2.5,
    pointRadius:3,
    pointHoverRadius:6,
    pointBackgroundColor: t.color,
    fill:false,
    tension:.35
  }));

  const ctx = document.getElementById('trend-chart'); if(!ctx) return;
  if(trendChart){
    // 데이터셋 수가 바뀔 수 있으므로 교체 후 update
    trendChart.data.labels = labels;
    trendChart.data.datasets = datasets;
    trendChart.update('none');
    return;
  }
  trendChart = new Chart(ctx, {
    type:'line',
    data:{labels, datasets},
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'top',align:'end',labels:{font:{size:10},usePointStyle:true,boxWidth:8}},
        tooltip:{callbacks:{
          title:items=>`📅 ${items[0].label}`,
          label:c=>` ${c.dataset.label}: ${Math.round(c.parsed.y).toLocaleString('ko-KR')}원`
        }}
      },
      scales:{
        x:{grid:{display:false},ticks:{font:{size:9},maxRotation:0,color:'#9ca3af'}},
        y:{grid:{color:'rgba(0,0,0,.04)'},beginAtZero:true,ticks:{font:{size:9},color:'#9ca3af',callback:v=>(v>=1000000?(v/10000).toFixed(0)+'만':v.toLocaleString())}}
      }
    }
  });
}

// ══ 계약현황 페이지 (하단 탭 nav-ct) ══

let _ctStatusTab = 'all'; // 'all' | 'active' | 'expired'

function setCtStatusTab(tab, el){
  _ctStatusTab = tab;
  // 탭 스타일 초기화
  ['ct-stab-all','ct-stab-active','ct-stab-expired'].forEach(id => {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.style.color = '#9ca3af';
    btn.style.borderBottom = '2px solid transparent';
    btn.style.fontWeight = '600';
  });
  if(el){
    el.style.color = '#2563eb';
    el.style.borderBottom = '2px solid #2563eb';
    el.style.fontWeight = '700';
  }
  renderCtContracts();
}

function renderCtContracts(){
  const badgesEl = document.getElementById('ct-summary-badges');
  const listEl   = document.getElementById('ct-cards-list');
  if(!listEl || !currentCompany) return;

  const coId = currentCompany.id;
  const today = fmtLocalDate(new Date());

  // 계약 상태 판별 헬퍼
  const isCtActive  = c => _isContractActive(c);
  const isCtExpired = c => {
    const s = _normContractStatus(c.status);
    return s === CONTRACT_STATUS.EXPIRED || s === CONTRACT_STATUS.TERMINATED || s === CONTRACT_STATUS.VOIDED;
  };

  // 전체 계약 (임시저장 제외)
  const allCts = allContracts.filter(c => !c.is_draft);
  const activeCts  = allCts.filter(isCtActive);
  const expiredCts = allCts.filter(isCtExpired);

  // 필터 적용
  let filtered;
  if(_ctStatusTab === 'active')       filtered = activeCts;
  else if(_ctStatusTab === 'expired') filtered = expiredCts;
  else                                filtered = allCts;

  // 정렬: 유효 → 만료/해지, 동일 상태 내 이름 가나다
  filtered = [...filtered].sort((a,b) => {
    const ao = isCtActive(a) ? 0 : 1;
    const bo = isCtActive(b) ? 0 : 1;
    if(ao !== bo) return ao - bo;
    const ea = allEmployees.find(e=>e.id===a.employee_id)||{};
    const eb = allEmployees.find(e=>e.id===b.employee_id)||{};
    return (ea.name||'').localeCompare(eb.name||'','ko');
  });

  // 요약 뱃지
  if(badgesEl){
    badgesEl.innerHTML = `
      <span style="font-size:11px;background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-weight:600;cursor:pointer;" onclick="setCtStatusTab('active',document.getElementById('ct-stab-active'))">
        유효 ${activeCts.length}건
      </span>
      <span style="font-size:11px;background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:20px;font-weight:600;cursor:pointer;" onclick="setCtStatusTab('expired',document.getElementById('ct-stab-expired'))">
        만료·해지 ${expiredCts.length}건
      </span>
      <span style="font-size:11px;background:#f3f4f6;color:#6b7280;padding:3px 10px;border-radius:20px;font-weight:600;cursor:pointer;" onclick="setCtStatusTab('all',document.getElementById('ct-stab-all'))">
        전체 ${allCts.length}건
      </span>`;
  }

  if(!filtered.length){
    listEl.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#9ca3af;">
      <i class="fas fa-file-contract" style="font-size:36px;margin-bottom:12px;display:block;opacity:.4;"></i>
      <div style="font-size:14px;font-weight:600;">해당하는 계약이 없습니다</div>
    </div>`;
    return;
  }

  listEl.innerHTML = filtered.map(c => {
    const emp     = allEmployees.find(e=>e.id===c.employee_id) || {};
    const empCat  = emp.employment_category || '-';
    const isDaily = empCat === 'daily';
    const active  = isCtActive(c);
    const expired = c.status==='terminated'||c.status==='voided';

    // 계약 기간 표시
    const period = ((empCat==='regular'||empCat==='regular_probation') && active)
      ? `${c.contract_start||'-'} ~ 현재`
      : `${c.contract_start||'-'} ~ ${c.contract_end||'미정'}`;

    // 기본급/일급
    const sal = isDaily
      ? `일급 ${fmt(c.daily_wage||c.base_salary)}원`
      : `기본급 ${fmt(c.base_salary)}원`;

    // 약정임금
    const agreed = c.monthly_salary_agreed
      ? `약정 ${fmt(c.monthly_salary_agreed)}원/월`
      : '';

    // 소정근로
    const workInfo = isDaily
      ? '일용직'
      : (c.work_hours_per_day ? `일 ${c.work_hours_per_day}h · 주 ${c.work_days_per_week||'-'}일` : '-');

    // 상태 뱃지
    const statusBadge = active
      ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:700;">유효</span>`
      : expired
        ? `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:700;">해지</span>`
        : `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:700;">만료</span>`;

    // 직원 상태 뱃지
    const empStatusBadge = _isEmpActive(emp)
      ? `<span style="background:#eff6ff;color:#2563eb;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:600;margin-left:4px;">재직</span>`
      : _isEmpResigned(emp)
        ? `<span style="background:#f3f4f6;color:#6b7280;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:600;margin-left:4px;">퇴직</span>`
        : '';

    // 계약종료 D-day (만료 계약만)
    let dday = '';
    if(active && c.contract_end && empCat !== 'regular' && empCat !== 'regular_probation'){
      const diff = Math.ceil((new Date(c.contract_end) - new Date(today)) / 86400000);
      if(diff <= 30 && diff >= 0){
        dday = `<span style="background:#fef3c7;color:#b45309;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;">D-${diff===0?'day':diff}</span>`;
      } else if(diff < 0){
        dday = `<span style="background:#fee2e2;color:#dc2626;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;">기간종료</span>`;
      }
    }

    // 아바타 색
    const avatarColors = {
      'regular':'#3b82f6','regular_probation':'#22c55e',
      'fixed_term':'#f59e0b','fixed_probation':'#f97316','daily':'#a855f7'
    };
    const avatarColor = avatarColors[empCat] || '#6b7280';

    return `<div style="background:#fff;border-radius:14px;box-shadow:0 1px 8px rgba(0,0,0,.07);overflow:hidden;${active?'':'opacity:.78;'}">
      <!-- 헤더 행 -->
      <div style="padding:12px 14px 10px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${avatarColor}22;border:2px solid ${avatarColor}44;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:${avatarColor};flex-shrink:0;">${(emp.name||'?').charAt(0)}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:3px;">
            <span style="font-size:14px;font-weight:800;color:#1a1a2e;">${emp.name||'-'}</span>
            ${empStatusBadge}
            ${dday}
          </div>
          <div style="font-size:11px;color:#6b7280;margin-top:1px;">${emp.department||''} ${emp.position||''} · ${CONTRACT_TYPE_LABEL[empCat]||contractTypeLabel_c(empCat)||'-'}</div>
        </div>
        ${statusBadge}
      </div>
      <!-- 계약 상세 -->
      <div style="padding:10px 14px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div style="background:#f9fafb;border-radius:8px;padding:7px 9px;">
          <div style="font-size:10px;color:#9ca3af;margin-bottom:2px;">계약유형</div>
          <div style="font-size:12px;font-weight:600;color:#374151;"><span class="badge ${empCatBadge(empCat)}" style="font-size:10px;">${CONTRACT_TYPE_LABEL[empCat]||contractTypeLabel_c(empCat)||'-'}</span></div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:7px 9px;">
          <div style="font-size:10px;color:#9ca3af;margin-bottom:2px;">소정근로</div>
          <div style="font-size:12px;font-weight:600;color:#374151;">${workInfo}</div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:7px 9px;grid-column:1/-1;">
          <div style="font-size:10px;color:#9ca3af;margin-bottom:2px;">계약기간</div>
          <div style="font-size:12px;font-weight:600;color:#374151;">${period}</div>
        </div>
      </div>
      <!-- 임금 -->
      <div style="padding:0 14px 12px;">
        <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:10.5px;color:#1e40af;font-weight:600;">${agreed||sal}</div>
            ${agreed ? `<div style="font-size:10px;color:#6b7280;margin-top:1px;">${sal}</div>` : ''}
          </div>
          <div style="font-size:10px;color:#3b82f6;font-weight:600;">계약 ID: <span style="color:#1d4ed8;">${c.id||'-'}</span></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ══ 2. PAYSLIP PAGE ══

// 고용형태 → 아바타 색상 매핑
const PS_CAT_COLOR = Object.freeze({
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR]]:           '#3b82f6',
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR_PROBATION]]: '#22c55e',
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED]]:             '#f59e0b',
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED_PROBATION]]:   '#f97316',
  [CONTRACT_TYPE_LABEL[CONTRACT_TYPE.DAILY]]:             '#a855f7',
});

// ── 1단계 대분류 탭 선택 ──
// ─── 임금대장 보기 버튼 ───
function _updateWageLedgerButton(){
  const btn = document.getElementById("wl-view-btn");
  const badge = document.getElementById("wl-renewed-badge");
  if(!btn) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const wl = (_wlNotifications || []).find(n =>
    (Number(n.year)===year || Number(n.pay_year)===year) &&
    (Number(n.month)===month || Number(n.pay_month)===month)
  );

  if(wl && wl.file_html_path){
    btn.disabled = false;
    btn.title = "클릭하여 신고용 임금대장 PDF 보기";
    btn.style.background = "#3b82f6";
    btn.style.color = "#fff";
    if(wl.is_renewed && Number(wl.is_renewed) === 1){
      if(badge) badge.style.display = "inline-block";
    } else {
      if(badge) badge.style.display = "none";
    }
    btn.setAttribute("data-wl-url", wl.file_html_path);
  } else {
    btn.disabled = true;
    btn.title = "아직 임금대장이 생성되지 않았습니다";
    btn.style.background = "#f3f4f6";
    btn.style.color = "#d1d5db";
    if(badge) badge.style.display = "none";
    btn.removeAttribute("data-wl-url");
  }
}

function openWageLedgerFromClient(){
  const btn = document.getElementById("wl-view-btn");
  if(!btn || btn.disabled) return;
  const accessCode = currentCompany?.access_code || "";
  if(!accessCode) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const fullUrl = window.location.origin + "/view-wage-ledger/" + currentCompany.id + "/" + year + "/" + month + "?code=" + encodeURIComponent(accessCode);
  window.open(fullUrl, "_blank");
}