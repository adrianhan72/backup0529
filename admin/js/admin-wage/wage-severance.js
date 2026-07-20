
// ==============================================================
//  퇴직급여 관리
// ==============================================================
let _sevCompanyId = null;
let _sevCompanyName = '';
let _sevCurrentRecord = null; // 현재 팝업에 열린 퇴직금 정산 데이터

// ── 고객사 목록 렌더 ──
function renderSevCompanyList(){
  const chips = document.getElementById('sev-company-chips');
  if(!chips) return;
  const q = (document.getElementById('sev-company-search')?.value||'').toLowerCase();
  const list = allCompanies.filter(c => !c.is_draft && c.status===COMPANY_STATUS.ACTIVE &&
    (c.company_name||'').toLowerCase().includes(q))
    .sort((a,b)=>(a.company_name||'').localeCompare(b.company_name||'','ko'));
  if(!list.length){
    chips.innerHTML = '<span style="color:#9ca3af;font-size:12.5px;">등록된 고객사가 없습니다.</span>';
    return;
  }
  chips.innerHTML = list.map(c => {
    const isSel = _sevCompanyId === c.id;
    return `<button onclick="selectSevCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}') "
      class="co-chip${isSel?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name||''}
    </button>`;
  }).join('');
}

// ── 고객사 선택 ──
function selectSevCompany(id, name){
  _sevCompanyId = id;
  _sevCompanyName = name;
  currentGlobalCompanyId = id;  // 글로벌 공유 동기화
  document.getElementById('sev-company-select-card').style.display = 'none';
  document.getElementById('sev-main-section').style.display = '';
  document.getElementById('sev-selected-company-label').innerHTML =
    `<i class="fas fa-hand-holding-usd" style="margin-right:6px;"></i>${name} — 퇴직급여 관리`;
  const today = new Date();
  document.getElementById('sev-as-of-date').textContent =
    `기준일: ${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;

  // 해지 고객사: 추계 탭 숨김, 이력 탭만 표시
  const co = allCompanies.find(c => c.id === id);
  const isTerminated = co?.status===COMPANY_STATUS.INACTIVE;
  const sBtn = document.getElementById('sev-tab-status-btn');
  if(sBtn) sBtn.style.display = isTerminated ? 'none' : '';

  // 기본 탭: 항상 지급 발생 이력(history)으로 시작
  switchSevTab('history');

  renderSevCompanyList();
  renderSeverance();
}

// ── 고객사 선택 해제 ──
function clearSevCompanySelect(){
  _sevCompanyId = null;
  _sevCompanyName = '';
  currentGlobalCompanyId = null;  // 글로벌 공유 초기화
  document.getElementById('sev-company-select-card').style.display = '';
  document.getElementById('sev-main-section').style.display = 'none';
  // 추계 탭 버튼 다시 표시 (다음 고객사 선택을 위해 초기화)
  const sBtn = document.getElementById('sev-tab-status-btn');
  if(sBtn) sBtn.style.display = '';
  // 합계 카드 숨기기
  const sc = document.getElementById('sev-summary-card');
  if(sc) sc.style.display = 'none';
  renderSevCompanyList();
}

// ── 탭 전환 ──
function switchSevTab(tab){
  const isStatus = tab === 'status';
  document.getElementById('sev-tab-status').style.display = isStatus ? '' : 'none';
  document.getElementById('sev-tab-history').style.display = isStatus ? 'none' : '';
  const sBtn = document.getElementById('sev-tab-status-btn');
  const hBtn = document.getElementById('sev-tab-history-btn');
  // history 탭 (첫번째, 항상 표시)
  if(hBtn){ hBtn.style.borderBottomColor = isStatus?'transparent':'#6366f1'; hBtn.style.color=isStatus?'#9ca3af':'#4c1d95'; hBtn.style.fontWeight=isStatus?'600':'700'; }
  // status 탭 (두번째, 해지 고객사에서는 숨김)
  if(sBtn){ sBtn.style.borderBottomColor = isStatus?'#f59e0b':'transparent'; sBtn.style.color=isStatus?'#92400e':'#9ca3af'; sBtn.style.fontWeight=isStatus?'700':'600'; }
}

// ── 재직 기간 계산 (년·개월·일 텍스트) ──
function calcTenure(hireDate, baseDate){
  if(!hireDate) return { text:'-', totalDays:0, years:0 };
  const s = new Date(hireDate);
  const e = baseDate ? new Date(baseDate) : new Date();
  if(isNaN(s.getTime())) return { text:'-', totalDays:0, years:0 };
  let y = e.getFullYear() - s.getFullYear();
  let m = e.getMonth() - s.getMonth();
  let d = e.getDate() - s.getDate();
  if(d < 0){ m--; }
  if(m < 0){ y--; m += 12; }
  const totalDays = Math.floor((e - s) / 86400000);
  const years = totalDays / 365.25; // 퇴직금 계산용 연수
  let text = '';
  if(y > 0) text += `${y}년 `;
  if(m > 0) text += `${Math.abs(m)}개월 `;
  text += `${Math.abs(d >= 0 ? e.getDate()-s.getDate() : 0)}일`;
  // 더 단순하게
  const yy = Math.floor(totalDays/365);
  const mm = Math.floor((totalDays%365)/30);
  const dd = totalDays%30;
  text = '';
  if(yy>0) text+=`${yy}년 `;
  if(mm>0) text+=`${mm}개월 `;
  text+=`${dd}일`;
  return { text: text.trim()||'0일', totalDays, years };
}

// ── 직전 3개월 급여 데이터 취득 ──
// 기준일(baseDate) 기준 이전 3개월 payrolls 반환
function getPrev3MonthsPayrolls(empId, baseDate){
  const base = baseDate ? new Date(baseDate) : new Date();
  // 기준 연월보다 이전 3개월 (pay_year/pay_month 기준)
  const months = [];
  for(let i = 1; i <= 3; i++){
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
  }
  return allPayrolls.filter(p =>
    p.employee_id === empId &&
    months.some(mo => Number(p.pay_year) === mo.y && Number(p.pay_month) === mo.m)
  );
}

// ── 통상임금 (3개월 합계) 계산 ──
// 통상임금: 기본급 + 주휴수당 + 직책수당 + 기술수당 + 면허수당 + 보육수당 + 연구활동비
// (식대/교통비 등 실비 비과세 항목, 성과급 등 비정기 항목 제외)
function calcOrdinaryWage3(pays){
  return pays.reduce((sum, p) =>
    sum + (p.base_salary||0) + (p.weekly_holiday_pay||0) + (p.position_allowance||0)
        + (p.skill_allowance||0) + (p.license_allowance||0)
        + (p.childcare_allowance||0) + (p.research_allowance||0)
  , 0);
}

// ── 평균임금 (3개월 합계) 계산 ──
// 평균임금: 3개월간 지급된 총 임금(gross_pay) 합계
function calcAverageWage3(pays){
  return pays.reduce((sum, p) => sum + (p.gross_pay||0), 0);
}

// ── 퇴직금 계산 ──
// 퇴직금 = 1일 평균임금 × 30일 × (총 재직일수 / 365)
// 단, 통상임금 기준 퇴직금이 더 높을 경우 통상임금 기준 사용 (근로기준법 준용)
function calcSeverancePay(empId, hireDate, baseDate, pays3){
  const tenure = calcTenure(hireDate, baseDate);
  if(tenure.totalDays < 365) return { amount: 0, ordinary3: 0, average3: 0, tenure, daily1: 0, note:'1년 미만' };

  const totalDays = tenure.totalDays;
  // 직전 3개월 총일수 (실제 역일수)
  const base = baseDate ? new Date(baseDate) : new Date();
  const start3 = new Date(base.getFullYear(), base.getMonth()-3, base.getDate());
  const days3 = Math.ceil((base - start3) / 86400000); // 3개월 역일수

  const ordinary3 = calcOrdinaryWage3(pays3);
  const average3  = calcAverageWage3(pays3);

  // 1일 통상임금 (3개월 합계 ÷ 3개월 일수)
  const dailyOrdinary = days3 > 0 ? (ordinary3 / days3) : 0;
  // 1일 평균임금 (3개월 합계 ÷ 3개월 역일수)
  const dailyAverage  = days3 > 0 ? (average3 / days3) : 0;

  // 평균임금이 통상임금보다 낮으면 통상임금 적용 (근로기준법 §2)
  const daily1 = Math.max(dailyOrdinary, dailyAverage);

  const amount = Math.floor(daily1 * 30 * (totalDays / 365));
  return { amount, ordinary3, average3, tenure, daily1, days3, dailyOrdinary, dailyAverage };
}

// ── 계약 상태 뱃지 HTML ──
function sevStatusBadge(emp, contract){
  if(!contract) return '<span style="font-size:11px;color:#9ca3af;">계약 없음</span>';
  const s = contract.status || '';
  const today = new Date().toISOString().slice(0,10);
  if(contract.status === CONTRACT_STATUS.TERMINATED || emp?.status===EMP_STATUS.RESIGNED || emp?.status===EMP_STATUS.RESIGNED){
    const resignDate = emp?.resign_date || contract.terminate_date || contract.contract_end || '';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fee2e2;color:#dc2626;font-size:11px;font-weight:600;">해지·퇴직${resignDate?' ('+resignDate+')':''}</span>`;
  }
  if(contract.status === CONTRACT_STATUS.EXPIRED){
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#b45309;font-size:11px;font-weight:600;">만료${contract.contract_end?' ('+contract.contract_end+')':''}</span>`;
  }
  // 활성 계약 중 종료일이 임박한 경우 (90일 이내)
  if(contract.contract_end && contract.contract_type !== CONTRACT_TYPE.REGULAR){
    const endDate = new Date(contract.contract_end);
    const diffDays = Math.ceil((endDate - new Date()) / 86400000);
    if(!isNaN(endDate) && diffDays >= 0 && diffDays <= 90){
      return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fef9c3;color:#854d0e;font-size:11px;font-weight:600;">만료예정 D-${diffDays} (${contract.contract_end})</span>`;
    }
    if(!isNaN(endDate) && diffDays < 0){
      return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#b45309;font-size:11px;font-weight:600;">만료 (${contract.contract_end})</span>`;
    }
  }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#dcfce7;color:#15803d;font-size:11px;font-weight:600;">재직중</span>`;
}

// ── 메인 렌더 (탭1 + 탭2 모두) ──
function renderSeverance(){
  if(!_sevCompanyId) return;
  renderSevStatusTab();
  renderSevHistoryTab();
}

// ── 탭1: 근로자별 퇴직급여 현황 ──
function renderSevStatusTab(){
  const tbody = document.getElementById('sev-status-tbody');
  const tfoot = document.getElementById('sev-status-tfoot');
  const totalEl = document.getElementById('sev-total-amount');
  if(!tbody) return;

  // 데이터 미준비 — 테이블 스피너
  if(!_dataReady){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="margin-right:8px;color:#6366f1;"></i>데이터 불러오는 중...</td></tr>';
    if(tfoot) tfoot.style.display = 'none';
    return;
  }

  const todayStr = new Date().toISOString().slice(0,10);

  // 해당 고객사 재직 직원 (일용직 제외)
  const emps = allEmployees.filter(e =>
    e.company_id === _sevCompanyId &&
    (e.status===EMP_STATUS.ACTIVE || e.status===EMP_STATUS.ACTIVE || !e.status || e.status === '') &&
    e.employment_category !==CONTRACT_TYPE.DAILY
  );

  const summaryCard   = document.getElementById('sev-summary-card');
  const summaryCount   = document.getElementById('sev-summary-count');
  const summaryNodata  = document.getElementById('sev-summary-nodata');
  const summaryUnder1  = document.getElementById('sev-summary-under1yr');
  const summaryNote    = document.getElementById('sev-summary-note');

  if(!emps.length){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#9ca3af;">해당 고객사에 재직 중인 근로자가 없습니다.</td></tr>';
    if(tfoot) tfoot.style.display = 'none';
    if(summaryCard) summaryCard.style.display = 'none';
    return;
  }

  const won = v => v ? Math.round(v).toLocaleString('ko-KR') + '원' : '-';
  const fmtDate = d => d || '-';
  let totalSev = 0;
  let cntTarget = 0;    // 추계 대상 (유효 계약 + 1년 이상)
  let cntUnder1yr = 0;  // 1년 미만 제외
  let cntNodata = 0;    // 급여 미입력
  let rows = [];

  emps.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(emp => {
    // 해당 직원의 모든 계약을 시작일 오름차순 정렬 (임시저장 제외)
    const empContracts = allContracts
      .filter(c => c.employee_id === emp.id && !c.is_draft)
      .sort((a,b) => (a.contract_start||'').localeCompare(b.contract_start||''));

    // ── 오늘 기준 유효 계약이 없는 직원은 퇴직급여 추계 대상 제외 ──
    // 유효 계약 조건: contract_start <= today AND (contract_end 없음 OR contract_end >= today)
    const hasActiveContract = empContracts.some(c => {
      const started = !c.contract_start || c.contract_start <= todayStr;
      const notEnded = !c.contract_end || c.contract_end >= todayStr;
      return started && notEnded;
    });
    if(!hasActiveContract) return;  // 만료·해지된 계약만 있으면 skip

    const lastContract = empContracts[empContracts.length - 1] || null;

    // 최초 입사일: 계약 중 가장 빠른 시작일, 없으면 emp.hire_date
    const firstContractStart = empContracts.length > 0 ? (empContracts[0].contract_start || '') : '';
    const hireDate = firstContractStart || emp.hire_date || '';

    // 총 재직기간: 최초 입사일 ~ 오늘
    const totalTenure = calcTenure(hireDate, todayStr);

    // 직전 3개월 급여 (오늘 기준)
    const pays3 = getPrev3MonthsPayrolls(emp.id, todayStr);
    const sev = calcSeverancePay(emp.id, hireDate, todayStr, pays3);
    const under1yr = totalTenure.totalDays < 365;
    if(!under1yr){
      totalSev += sev.amount || 0;
      cntTarget++;
      if(!pays3.length) cntNodata++;
    } else {
      cntUnder1yr++;
    }

    const amtColor = sev.amount > 0 ? '#b45309' : '#9ca3af';
    const nameColor = under1yr ? '#9ca3af' : '#1a1a2e';
    const totalDaysLabel = under1yr
      ? '<span style="color:#9ca3af;font-size:11px;font-style:italic;">1년 미만</span>'
      : `<span style="font-size:11.5px;color:#92400e;font-weight:700;">${totalTenure.text}</span>`;

    // ── 계약 이력 행들 생성 ──
    // 각 계약별 행: 계약 n건 표시 (rowspan으로 성명/부서/고용형태/통상임금/퇴직금/상태 묶음)
    const contractCount = Math.max(empContracts.length, 1);
    // 총 재직기간 행 포함 → rowspan = contractCount + 1
    const mainRowspan = contractCount + 1;

    let contractRows = '';

    if(empContracts.length === 0){
      // 계약 데이터 없음 — 입사일만 표시
      contractRows = `<tr>
        <td style="padding:7px 10px;font-size:12px;color:#9ca3af;border-bottom:1px dashed #f3f4f6;" colspan="2">계약 데이터 없음</td>
      </tr>`;
    } else {
      empContracts.forEach((c, idx) => {
        const cStart = fmtDate(c.contract_start);
        const cEnd   = c.contract_end ? fmtDate(c.contract_end) : '현재';
        const cEndForCalc = c.contract_end || todayStr;
        const cTenure = calcTenure(c.contract_start || hireDate, cEndForCalc);
        const isLast = idx === empContracts.length - 1;
        const rowBg = idx % 2 === 0 ? '' : 'background:#fafaf8;';
        const numBadge = `<span style="display:inline-block;min-width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;margin-right:5px;">${idx+1}</span>`;
        const cStatus = c.status===COMPANY_STATUS.INACTIVE ? '<span style="font-size:10px;color:#dc2626;background:#fee2e2;padding:1px 5px;border-radius:4px;margin-left:4px;">해지</span>'
          : (c.status===CONTRACT_STATUS.EXPIRED||c.status===CONTRACT_STATUS.EXPIRED) ? '<span style="font-size:10px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:4px;margin-left:4px;">만료</span>'
          : (c.status===EMP_STATUS.ACTIVE||c.status===CONTRACT_STATUS.ACTIVE||c.status === '유효') ? '<span style="font-size:10px;color:#15803d;background:#dcfce7;padding:1px 5px;border-radius:4px;margin-left:4px;">진행중</span>'
          : '';
        contractRows += `<tr style="${rowBg}border-bottom:1px dashed ${isLast?'#fcd34d':'#f3f4f6'};cursor:pointer;"
          onclick="openSevContractModal('${c.id}','${(emp.name||'').replace(/'/g,"&#39;")}',${idx})"
          onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='${rowBg?'#fafaf8':''}'"
          title="클릭하여 계약 조건 상세 보기">
          <td style="padding:6px 10px;font-size:12px;color:#374151;">
            ${numBadge}<span style="font-weight:500;">${cStart}</span>
            <span style="color:#9ca3af;margin:0 3px;">~</span>
            <span style="font-weight:500;">${cEnd}</span>${cStatus}
            <i class="fas fa-search" style="font-size:10px;color:#93c5fd;margin-left:5px;opacity:.8;"></i>
          </td>
          <td style="padding:6px 10px;font-size:12px;color:#6b7280;text-align:right;">${cTenure.text}</td>
        </tr>`;
      });
    }

    // 총 재직기간 합산 행
    const totalRow = `<tr style="background:#fffbeb;border-top:1px solid #fcd34d;">
      <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#92400e;">
        <i class="fas fa-sigma" style="font-size:10px;margin-right:4px;"></i>
        총 재직기간 &nbsp;<span style="font-weight:400;font-size:11px;color:#78716c;">(${fmtDate(hireDate)} ~ ${todayStr})</span>
      </td>
      <td style="padding:7px 10px;text-align:right;">${totalDaysLabel}</td>
    </tr>`;

    // ── 메인 그룹 행 (성명·부서 등은 첫 번째 계약 행에 rowspan) ──
    rows.push(`
      <tr style="border-top:2px solid #fde68a;">
        <td rowspan="${mainRowspan}" style="padding:10px 10px;font-weight:700;font-size:13px;color:${nameColor};vertical-align:top;border-right:1px solid #fef3c7;">${emp.name||'-'}</td>
        <td rowspan="${mainRowspan}" style="padding:10px 10px;color:#374151;vertical-align:top;border-right:1px solid #fef3c7;">${[emp.department,emp.position].filter(Boolean).join(' / ')||'-'}</td>
        <td rowspan="${mainRowspan}" style="padding:10px 10px;color:#374151;vertical-align:top;border-right:1px solid #fef3c7;">${contractTypeLabel(emp.employment_category) || '-'}</td>
        ${empContracts.length > 0 ? `
          <td style="padding:6px 10px;font-size:12px;color:#374151;cursor:pointer;"
            onclick="openSevContractModal('${empContracts[0].id}','${(emp.name||'').replace(/'/g,"&#39;")}',0)"
            onmouseover="this.parentElement.style.background='#eff6ff'"
            onmouseout="this.parentElement.style.background=''"
            title="클릭하여 계약 조건 상세 보기">
            <span style="display:inline-block;min-width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;margin-right:5px;">1</span>
            <span style="font-weight:500;">${fmtDate(empContracts[0].contract_start)}</span>
            <span style="color:#9ca3af;margin:0 3px;">~</span>
            <span style="font-weight:500;">${empContracts[0].contract_end ? fmtDate(empContracts[0].contract_end) : '현재'}</span>
            ${empContracts[0].status===COMPANY_STATUS.INACTIVE?'<span style="font-size:10px;color:#dc2626;background:#fee2e2;padding:1px 5px;border-radius:4px;margin-left:4px;">해지</span>'
              :(empContracts[0].status===CONTRACT_STATUS.EXPIRED||empContracts[0].status===CONTRACT_STATUS.EXPIRED)?'<span style="font-size:10px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:4px;margin-left:4px;">만료</span>'
              :(empContracts[0].status===EMP_STATUS.ACTIVE||empContracts[0].status===CONTRACT_STATUS.ACTIVE||empContracts[0].status==='유효')?'<span style="font-size:10px;color:#15803d;background:#dcfce7;padding:1px 5px;border-radius:4px;margin-left:4px;">진행중</span>':''}
            <i class="fas fa-search" style="font-size:10px;color:#93c5fd;margin-left:5px;opacity:.8;"></i>
          </td>
          <td style="padding:6px 10px;font-size:12px;color:#6b7280;text-align:right;cursor:pointer;"
            onclick="openSevContractModal('${empContracts[0].id}','${(emp.name||'').replace(/'/g,"&#39;")}',0)"
            title="클릭하여 계약 조건 상세 보기">${calcTenure(empContracts[0].contract_start||hireDate, empContracts[0].contract_end||todayStr).text}</td>
        ` : `<td style="padding:6px 10px;font-size:12px;color:#9ca3af;" colspan="2">계약 데이터 없음</td>`}
        <td rowspan="${mainRowspan}" style="padding:10px 10px;text-align:right;vertical-align:top;border-left:1px solid #fef3c7;color:#1d4ed8;font-weight:600;">
          ${under1yr ? '<span style="color:#d1d5db;font-size:11px;">-</span>' : pays3.length ? won(sev.ordinary3 / 3) : '<span style="color:#9ca3af;font-size:11px;">급여 데이터 없음</span>'}
        </td>
        <td rowspan="${mainRowspan}" style="padding:10px 10px;text-align:right;vertical-align:top;font-weight:700;font-size:13.5px;border-left:1px solid #fef3c7;color:${amtColor};">
          ${under1yr ? '<span style="color:#9ca3af;font-size:11px;">1년 미만</span>' : sev.amount>0 ? won(sev.amount) : '<span style="color:#9ca3af;font-size:11px;">급여 데이터 필요</span>'}
        </td>
        <td rowspan="${mainRowspan}" style="padding:10px 10px;text-align:center;vertical-align:top;border-left:1px solid #fef3c7;">${sevStatusBadge(emp, lastContract)}</td>
      </tr>
      ${empContracts.slice(1).map((c, idx) => {
        const cStart = fmtDate(c.contract_start);
        const cEnd   = c.contract_end ? fmtDate(c.contract_end) : '현재';
        const cEndForCalc = c.contract_end || todayStr;
        const cTenure = calcTenure(c.contract_start || hireDate, cEndForCalc);
        const isLast = idx === empContracts.length - 2;
        const rowBg = (idx+1) % 2 === 0 ? '' : 'background:#fafaf8;';
        const numBadge = `<span style="display:inline-block;min-width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;margin-right:5px;">${idx+2}</span>`;
        const cStatus = c.status===COMPANY_STATUS.INACTIVE?'<span style="font-size:10px;color:#dc2626;background:#fee2e2;padding:1px 5px;border-radius:4px;margin-left:4px;">해지</span>'
          :(c.status===CONTRACT_STATUS.EXPIRED||c.status===CONTRACT_STATUS.EXPIRED)?'<span style="font-size:10px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:4px;margin-left:4px;">만료</span>'
          :(c.status===EMP_STATUS.ACTIVE||c.status===CONTRACT_STATUS.ACTIVE||c.status==='유효')?'<span style="font-size:10px;color:#15803d;background:#dcfce7;padding:1px 5px;border-radius:4px;margin-left:4px;">진행중</span>':'';
        const realIdx = idx + 1;
        return `<tr style="${rowBg}border-bottom:1px dashed ${isLast?'#fcd34d':'#f3f4f6'};cursor:pointer;"
          onclick="openSevContractModal('${c.id}','${(emp.name||'').replace(/'/g,"&#39;")}',${realIdx})"
          onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='${rowBg?'#fafaf8':''}'"
          title="클릭하여 계약 조건 상세 보기">
          <td style="padding:6px 10px;font-size:12px;color:#374151;">
            ${numBadge}<span style="font-weight:500;">${cStart}</span>
            <span style="color:#9ca3af;margin:0 3px;">~</span>
            <span style="font-weight:500;">${cEnd}</span>${cStatus}
            <i class="fas fa-search" style="font-size:10px;color:#93c5fd;margin-left:5px;opacity:.8;"></i>
          </td>
          <td style="padding:6px 10px;font-size:12px;color:#6b7280;text-align:right;">${cTenure.text}</td>
        </tr>`;
      }).join('')}
      <tr style="background:#fffbeb;border-bottom:2px solid #fde68a;">
        <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#92400e;">
          <i class="fas fa-layer-group" style="font-size:10px;margin-right:4px;"></i>
          총 재직기간
          <span style="font-weight:400;font-size:11px;color:#78716c;margin-left:4px;">(${fmtDate(hireDate)} ~ ${todayStr})</span>
        </td>
        <td style="padding:7px 10px;text-align:right;">${totalDaysLabel}
          ${!under1yr ? `<span style="display:block;font-size:10.5px;color:#9ca3af;font-weight:400;">총 ${totalTenure.totalDays.toLocaleString('ko-KR')}일</span>` : ''}
        </td>
      </tr>
    `);
  });

  tbody.innerHTML = rows.join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#9ca3af;">해당하는 근로자가 없습니다.</td></tr>';
  if(tfoot) tfoot.style.display = 'none'; // tfoot은 사용하지 않음

  // ── 합계 요약 카드 ──
  if(summaryCard){
    if(rows.length === 0){
      summaryCard.style.display = 'none';
    } else {
      summaryCard.style.display = '';
      if(summaryCount)  summaryCount.textContent  = cntTarget.toLocaleString('ko-KR');
      if(summaryNodata) summaryNodata.textContent  = cntNodata.toLocaleString('ko-KR');
      if(summaryUnder1) summaryUnder1.textContent  = cntUnder1yr.toLocaleString('ko-KR');
      const totalEl = document.getElementById('sev-total-amount');
      if(totalEl){
        totalEl.textContent = totalSev > 0
          ? Math.round(totalSev).toLocaleString('ko-KR')
          : '0';
      }
      if(summaryNote){
        summaryNote.textContent = cntNodata > 0
          ? `※ 급여 미입력 ${cntNodata}명은 추계액이 0원으로 반영됨`
          : '오늘 기준 예상 추계액 (실제 퇴직 시 달라질 수 있음)';
      }
    }
  }
}

// ── 탭2: 지급 발생 이력 ──
function renderSevHistoryTab(){
  const tbody = document.getElementById('sev-history-tbody');
  if(!tbody) return;

  // 데이터 미준비 — 테이블 스피너
  if(!_dataReady){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="margin-right:8px;color:#6366f1;"></i>데이터 불러오는 중...</td></tr>';
    return;
  }

  // ── 퇴직금 지급 발생 이력 대상 조건 ──
  // "마지막 계약의 status가 해지 또는 만료로 명시 선언된" 직원만 표시
  // contract_end < today 여부만으로는 노출하지 않음 (명시적 선언 필요)
  const todayStr2 = new Date().toISOString().slice(0,10);
  const resignedEmps = allEmployees.filter(e => {
    if(e.company_id !== _sevCompanyId) return false;
    if(e.employment_category ===CONTRACT_TYPE.DAILY) return false;
    // 해당 직원의 마지막 계약 확인
    const conts = allContracts
      .filter(c => c.employee_id === e.id && !c.is_draft)
      .sort((a,b) => (a.contract_start||'').localeCompare(b.contract_start||''));
    const last = conts[conts.length - 1];
    if(!last) return false;
    // 마지막 계약 status가 해지 또는 만료로 명시된 경우만
        return last.status===COMPANY_STATUS.INACTIVE || last.status===CONTRACT_STATUS.EXPIRED ||
           last.status===CONTRACT_STATUS.EXPIRED || last.status===CONTRACT_STATUS.TERMINATED;
  });
}
