
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
    chips.innerHTML = '<span class="sev-nodata" style="font-size:12.5px;">등록된 고객사가 없습니다.</span>';
    return;
  }
  chips.innerHTML = list.map(c => {
    const isSel = _sevCompanyId === c.id;
    return `<button onclick="selectSevCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}') "
      class="co-chip${isSel?' selected':''}">
      <i class="fas fa-building sev-icon-sm"></i>
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
    `<i class="fas fa-hand-holding-usd sev-icon-mr"></i>${name} — 퇴직급여 관리`;
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
  const tabs = ['status', 'history', 'interim'];
  tabs.forEach(t => {
    const el = document.getElementById('sev-tab-' + t);
    const btn = document.getElementById('sev-tab-' + t + '-btn');
    if(el) el.style.display = (t === tab) ? '' : 'none';
    if(btn) btn.classList.toggle('active', t === tab);
  });
  if(tab === 'interim') renderSevInterimTab();
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

  // ── 중간정산 차감 ──
  const interimTotal = (_allInterimSettlements || [])
    .filter(s => s.employee_id === empId)
    .reduce((sum, s) => sum + (parseFloat(s.settlement_amount) || 0), 0);
  const interimCount = (_allInterimSettlements || []).filter(s => s.employee_id === empId).length;
  const netAmount = Math.max(0, amount - interimTotal);

  return { amount, netAmount, interimTotal, interimCount, ordinary3, average3, tenure, daily1, days3, dailyOrdinary, dailyAverage };
}

/**
 * 연속된 계약 체인 반환 (employee.hire_date 기준)
 * 갱신·재계약 시 연속성이 인정되면 hire_date가 유지되고,
 * 단절 시에만 hire_date가 새 시작일로 변경되므로,
 * hire_date 이후의 모든 계약이 곧 연속 체인이다.
 * @param {string} employeeId
 * @returns {object[]} 시작일 오름차순 정렬된 연속 계약 배열
 */
function getContinuousContractChain(employeeId){
  const emp = allEmployees.find(e => e.id === employeeId);
  if(!emp || !emp.hire_date) return [];

  return allContracts
    .filter(c => c.employee_id === employeeId
      && !c.is_draft
      && c.contract_start >= emp.hire_date)
    .sort((a, b) => (a.contract_start || '').localeCompare(b.contract_start || ''));
}

// ── 계약 상태 뱃지 HTML ──
function sevStatusBadge(emp, contract){
  if(!contract) return '<span class="sev-nodata-sm">계약 없음</span>';
  const s = contract.status || '';
  const today = new Date().toISOString().slice(0,10);
  if(contract.status === CONTRACT_STATUS.TERMINATED || emp?.status===EMP_STATUS.RESIGNED || emp?.status===EMP_STATUS.RESIGNED){
    const resignDate = emp?.resign_date || contract.terminate_date || contract.contract_end || '';
    return `<span class="badge badge-red">해지·퇴직${resignDate?' ('+resignDate+')':''}</span>`;
  }
  if(contract.status === CONTRACT_STATUS.EXPIRED){
    return `<span class="badge badge-amber">만료${contract.contract_end?' ('+contract.contract_end+')':''}</span>`;
  }
  // 활성 계약 중 종료일이 임박한 경우 (90일 이내)
  if(contract.contract_end && contract.contract_type !== CONTRACT_TYPE.REGULAR){
    const endDate = new Date(contract.contract_end);
    const diffDays = Math.ceil((endDate - new Date()) / 86400000);
    if(!isNaN(endDate) && diffDays >= 0 && diffDays <= 90){
      return `<span class="badge badge-yellow">만료예정 D-${diffDays} (${contract.contract_end})</span>`;
    }
    if(!isNaN(endDate) && diffDays < 0){
      return `<span class="badge badge-amber">만료 (${contract.contract_end})</span>`;
    }
  }
  return '<span class="badge badge-green">재직중</span>';
}

// ── 메인 렌더 (탭1 + 탭2 모두) ──
async function renderSeverance(){
  if(!_sevCompanyId) return;
  await loadSevInterimSettlements();
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
    tbody.innerHTML = '<tr><td colspan="8" class="sev-loading"><i class="fas fa-circle-notch fa-spin sev-spinner-icon"></i>데이터 불러오는 중...</td></tr>';
    if(tfoot) tfoot.style.display = 'none';
    return;
  }

  const todayStr = new Date().toISOString().slice(0,10);

  // 해당 고객사 재직 직원 (일용직·등기임원·대표자·특수관계인 제외)
  const _SEV_EXCLUDED_TYPES = new Set([CONTRACT_TYPE.DAILY, CONTRACT_TYPE.EXECUTIVE, CONTRACT_TYPE.REPRESENTATIVE, CONTRACT_TYPE.RELATED_PARTY]);
  const emps = allEmployees.filter(e =>
    e.company_id === _sevCompanyId &&
    (e.status===EMP_STATUS.ACTIVE || e.status===EMP_STATUS.ACTIVE || !e.status || e.status === '') &&
    !_SEV_EXCLUDED_TYPES.has(e.employment_category)
  );

  const summaryCard   = document.getElementById('sev-summary-card');
  const summaryCount   = document.getElementById('sev-summary-count');
  const summaryNodata  = document.getElementById('sev-summary-nodata');
  const summaryUnder1  = document.getElementById('sev-summary-under1yr');
  const summaryNote    = document.getElementById('sev-summary-note');

  if(!emps.length){
    tbody.innerHTML = '<tr><td colspan="8" class="sev-empty-state">해당 고객사에 재직 중인 근로자가 없습니다.</td></tr>';
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
    // ── 연속된 계약 체인만 추적 (최종 계약에서 역방향으로 끊기지 않은 계약들) ──
    const empContracts = getContinuousContractChain(emp.id);

    // ── 오늘 기준 유효 계약이 없는 직원은 퇴직급여 추계 대상 제외 ──
    const hasActiveContract = empContracts.some(c => {
      const started = !c.contract_start || c.contract_start <= todayStr;
      const notEnded = !c.contract_end || c.contract_end >= todayStr;
      return started && notEnded;
    });
    if(!hasActiveContract) return;  // 만료·해지된 계약만 있으면 skip

    const lastContract = empContracts[empContracts.length - 1] || null;

    // 최초 입사일: 연속 체인의 첫 계약 시작일, 없으면 emp.hire_date
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
      ? '<span class="sev-under-1yr">1년 미만</span>'
      : `<span class="sev-tenure-label">${totalTenure.text}</span>`;

    // ── 계약 이력 행들 생성 ──
    // 각 계약별 행: 계약 n건 표시 (rowspan으로 성명/부서/고용형태/통상임금/퇴직금/상태 묶음)
    const contractCount = Math.max(empContracts.length, 1);
    // 총 재직기간 행 포함 → rowspan = contractCount + 1
    const mainRowspan = contractCount + 1;

    let contractRows = '';

    if(empContracts.length === 0){
      // 계약 데이터 없음 — 입사일만 표시
      contractRows = `<tr>
        <td class="sev-no-contract" colspan="2">계약 데이터 없음</td>
      </tr>`;
    } else {
      empContracts.forEach((c, idx) => {
        const cStart = fmtDate(c.contract_start);
        const cEnd   = c.contract_end ? fmtDate(c.contract_end) : '현재';
        const cEndForCalc = c.contract_end || todayStr;
        const cTenure = calcTenure(c.contract_start || hireDate, cEndForCalc);
        const isLast = idx === empContracts.length - 1;
        const numBadge = `<span class="sev-contract-num">${idx+1}</span>`;
        const cStatus = c.status===COMPANY_STATUS.INACTIVE ? '<span class="sev-contract-status sev-contract-status-terminated">해지</span>'
          : (c.status===CONTRACT_STATUS.EXPIRED||c.status===CONTRACT_STATUS.EXPIRED) ? '<span class="sev-contract-status sev-contract-status-expired">만료</span>'
          : CONTRACT_ACTIVE_STATUSES.includes(c.status) ? '<span class="sev-contract-status sev-contract-status-active">진행중</span>'
          : '';
        contractRows += `<tr class="sev-contract-row ${isLast?'sev-contract-row-last':'sev-contract-row-normal'}"
          onclick="openSevContractModal('${c.id}','${(emp.name||'').replace(/'/g,"&#39;")}',${idx})"
          title="클릭하여 계약 조건 상세 보기">
          <td class="sev-contract-cell">
            ${numBadge}<span class="sev-contract-start">${cStart}</span>
            <span class="sev-contract-sep">~</span>
            <span class="sev-contract-end">${cEnd}</span>${cStatus}
            <i class="fas fa-search sev-contract-search"></i>
          </td>
          <td class="sev-tenure-cell">${cTenure.text}</td>
        </tr>`;
      });
    }

    // 총 재직기간 합산 행
    const totalRow = `<tr class="sev-total-divider">
      <td class="sev-total-label">
        <i class="fas fa-sigma sev-icon-xs"></i>
        총 재직기간 &nbsp;<span class="sev-total-date-range">(${fmtDate(hireDate)} ~ ${todayStr})</span>
      </td>
      <td class="sev-total-tenure">${totalDaysLabel}</td>
    </tr>`;

    // ── 메인 그룹 행 (성명·부서 등은 첫 번째 계약 행에 rowspan) ──
    rows.push(`
      <tr class="sev-main-row">
        <td rowspan="${mainRowspan}" class="sev-main-name" style="color:${nameColor};">${emp.name||'-'}</td>
        <td rowspan="${mainRowspan}" class="sev-main-dept">${[emp.department,emp.position].filter(Boolean).join(' / ')||'-'}</td>
        <td rowspan="${mainRowspan}" class="sev-main-type">${contractTypeLabel(emp.employment_category) || '-'}</td>
        ${empContracts.length > 0 ? `
          <td class="sev-contract-cell"
            onclick="openSevContractModal('${empContracts[0].id}','${(emp.name||'').replace(/'/g,"&#39;")}',0)"
            title="클릭하여 계약 조건 상세 보기">
            <span class="sev-contract-num">1</span>
            <span class="sev-contract-start">${fmtDate(empContracts[0].contract_start)}</span>
            <span class="sev-contract-sep">~</span>
            <span class="sev-contract-end">${empContracts[0].contract_end ? fmtDate(empContracts[0].contract_end) : '현재'}</span>
            ${empContracts[0].status===COMPANY_STATUS.INACTIVE?'<span class="sev-contract-status sev-contract-status-terminated">해지</span>'
              :(empContracts[0].status===CONTRACT_STATUS.EXPIRED||empContracts[0].status===CONTRACT_STATUS.EXPIRED)?'<span class="sev-contract-status sev-contract-status-expired">만료</span>'
              :CONTRACT_ACTIVE_STATUSES.includes(empContracts[0].status)?'<span class="sev-contract-status sev-contract-status-active">진행중</span>':''}
            <i class="fas fa-search sev-contract-search"></i>
          </td>
          <td class="sev-tenure-cell"
            onclick="openSevContractModal('${empContracts[0].id}','${(emp.name||'').replace(/'/g,"&#39;")}',0)"
            title="클릭하여 계약 조건 상세 보기">${calcTenure(empContracts[0].contract_start||hireDate, empContracts[0].contract_end||todayStr).text}</td>
        ` : `<td class="sev-no-contract" colspan="2">계약 데이터 없음</td>`}
        <td rowspan="${mainRowspan}" class="sev-wage-cell">
          ${under1yr ? '<span class="sev-no-data-sm">-</span>' : pays3.length ? won(sev.ordinary3 / 3) : '<span class="sev-nodata-sm">급여 데이터 없음</span>'}
        </td>
        <td rowspan="${mainRowspan}" class="sev-amount-cell" style="color:${amtColor};">
          ${under1yr ? '<span class="sev-nodata-sm">1년 미만</span>' : sev.amount>0 ? (sev.interimCount > 0
            ? `<div>${won(sev.netAmount)}<div class="sev-interim-note">(총${won(sev.amount)} - 중간정산${won(sev.interimTotal)})</div></div>`
            : won(sev.amount)
          ) : '<span class="sev-nodata-sm">급여 데이터 필요</span>'}
        </td>
        <td rowspan="${mainRowspan}" class="sev-status-cell">${sevStatusBadge(emp, lastContract)}</td>
      </tr>
      ${empContracts.slice(1).map((c, idx) => {
        const cStart = fmtDate(c.contract_start);
        const cEnd   = c.contract_end ? fmtDate(c.contract_end) : '현재';
        const cEndForCalc = c.contract_end || todayStr;
        const cTenure = calcTenure(c.contract_start || hireDate, cEndForCalc);
        const isLast = idx === empContracts.length - 2;
        const rowCls = (idx+1) % 2 === 0 ? 'sev-contract-row sev-contract-row-even' : 'sev-contract-row';
        const numBadge = `<span class="sev-contract-num">${idx+2}</span>`;
        const cStatus = c.status===COMPANY_STATUS.INACTIVE?'<span class="sev-contract-status sev-contract-status-terminated">해지</span>'
          :(c.status===CONTRACT_STATUS.EXPIRED||c.status===CONTRACT_STATUS.EXPIRED)?'<span class="sev-contract-status sev-contract-status-expired">만료</span>'
          :CONTRACT_ACTIVE_STATUSES.includes(c.status)?'<span class="sev-contract-status sev-contract-status-active">진행중</span>':'';
        const realIdx = idx + 1;
        return `<tr class="${rowCls} ${isLast?'sev-contract-row-last':'sev-contract-row-normal'}"
          onclick="openSevContractModal('${c.id}','${(emp.name||'').replace(/'/g,"&#39;")}',${realIdx})"
          title="클릭하여 계약 조건 상세 보기">
          <td class="sev-contract-cell">
            ${numBadge}<span class="sev-contract-start">${cStart}</span>
            <span class="sev-contract-sep">~</span>
            <span class="sev-contract-end">${cEnd}</span>${cStatus}
            <i class="fas fa-search sev-contract-search"></i>
          </td>
          <td class="sev-tenure-cell">${cTenure.text}</td>
        </tr>`;
      }).join('')}
      <tr class="sev-total-row">
        <td class="sev-total-label">
          <i class="fas fa-layer-group sev-icon-xs"></i>
          총 재직기간
          <span class="sev-total-date-range">(${fmtDate(hireDate)} ~ ${todayStr})</span>
        </td>
        <td class="sev-total-tenure">${totalDaysLabel}
          ${!under1yr ? `<span class="sev-total-tenure-days">총 ${totalTenure.totalDays.toLocaleString('ko-KR')}일</span>` : ''}
        </td>
      </tr>
    `);
  });

  tbody.innerHTML = rows.join('') || '<tr><td colspan="8" class="sev-empty-state">해당하는 근로자가 없습니다.</td></tr>';
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
    tbody.innerHTML = '<tr><td colspan="8" class="sev-loading"><i class="fas fa-circle-notch fa-spin sev-spinner-icon"></i>데이터 불러오는 중...</td></tr>';
    return;
  }

  // ── 퇴직금 지급 발생 이력 대상 조건 ──
  // "마지막 계약의 status가 해지 또는 만료로 명시 선언된" 직원만 표시
  // contract_end < today 여부만으로는 노출하지 않음 (명시적 선언 필요)
  const todayStr2 = new Date().toISOString().slice(0,10);
  const resignedEmps = allEmployees.filter(e => {
    if(e.company_id !== _sevCompanyId) return false;
    if(e.employment_category ===CONTRACT_TYPE.DAILY) return false;
    const conts = getContinuousContractChain(e.id);
    const last = conts[conts.length - 1];
    if(!last) return false;
    return last.status===COMPANY_STATUS.INACTIVE || last.status===CONTRACT_STATUS.EXPIRED ||
           last.status===CONTRACT_STATUS.TERMINATED;
  });

  if(!resignedEmps.length){
    tbody.innerHTML = '<tr><td colspan="8" class="tbl-empty">퇴직금 발생 이력이 없습니다.</td></tr>';
    return;
  }

  const won = v => Math.round(v||0).toLocaleString('ko-KR') + '원';
  const fmtDate = d => d || '-';

  tbody.innerHTML = resignedEmps.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).map(emp => {
    const conts = getContinuousContractChain(emp.id);
    const hireDate = conts[0]?.contract_start || emp.hire_date || '';
    const lastContract = conts[conts.length - 1];
    const resignationDate = lastContract?.terminate_date || lastContract?.contract_end || '';
    const pays3 = getPrev3MonthsPayrolls(emp.id, resignationDate || todayStr2);
    const sev = calcSeverancePay(emp.id, hireDate, resignationDate || todayStr2, pays3);
    const tenure = calcTenure(hireDate, resignationDate || todayStr2);
    const reason = lastContract?.status === CONTRACT_STATUS.TERMINATED ? '해지' : '만료';

    const contractHistory = conts.map((c,i) => {
      const cStart = fmtDate(c.contract_start);
      const cEnd = c.contract_end ? fmtDate(c.contract_end) : '현재';
      return `<span>${i+1}. ${cStart}~${cEnd}</span>`;
    }).join('<br>');

    return `<tr class="sev-history-row">
      <td>${fmtDate(resignationDate)}</td>
      <td class="sev-history-name">${emp.name||'-'}</td>
      <td>${[emp.department,emp.position].filter(Boolean).join(' / ')||'-'}</td>
      <td class="sev-history-contracts">${contractHistory||'-'}</td>
      <td class="sev-history-tenure">${tenure.text}<br><span class="sev-history-tenure-days">${tenure.totalDays.toLocaleString('ko-KR')}일</span></td>
      <td class="sev-history-wage">${pays3.length ? won(sev.ordinary3/3) : '<span class="sev-nodata">-</span>'}</td>
      <td class="sev-history-amount">${sev.netAmount>0 ? won(sev.netAmount) : won(sev.amount)}${sev.interimCount>0?`<br><span class="sev-history-interim-note">(중간정산 ${won(sev.interimTotal)} 차감)</span>`:''}</td>
      <td>${reason==='해지'?'<span class="badge badge-red">해지</span>':'<span class="badge badge-amber">만료</span>'}</td>
    </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────────────────────────
// 중간정산 (Interim Severance Settlement)
// ──────────────────────────────────────────────────────────────────
let _allInterimSettlements = [];
// ※ payroll-input-main.js의 _autoFillSeveranceInterim()에서 window._allInterimSettlements로 공유
let _sevInterimEditId = null;

async function loadSevInterimSettlements(){
  if(!_sevCompanyId) return;
  try {
    const res = await fetch(`../tables/severance_interim_settlements?company_id=${_sevCompanyId}&limit=999`);
    const data = await res.json();
    _allInterimSettlements = data.data || [];
  } catch(e){ _allInterimSettlements = []; }
}

function renderSevInterimTab(){
  const tbody = document.getElementById('sev-interim-tbody');
  if(!tbody) return;
  if(!_sevCompanyId){ tbody.innerHTML = '<tr><td colspan="8" class="sev-empty-state">고객사를 선택하면 중간정산 내역이 표시됩니다.</td></tr>'; return; }

  loadSevInterimSettlements().then(() => {
    const items = (_allInterimSettlements || []).sort((a,b) => (b.settlement_date||'').localeCompare(a.settlement_date||''));
    if(!items.length){
      tbody.innerHTML = '<tr><td colspan="8" class="sev-empty-state">중간정산 내역이 없습니다.</td></tr>';
      return;
    }
    const won = v => Math.round(v||0).toLocaleString('ko-KR') + '원';
    tbody.innerHTML = items.map(s => {
      const emp = allEmployees.find(e => e.id === s.employee_id);
      const empName = emp ? emp.name : '(알 수 없음)';
      const reasonLabel = { '주택구입':'🏠 주택구입', '의료비':'🏥 의료비', '파산':'📉 파산·회생', '기타':'📋 기타' }[s.reason] || s.reason || '-';
      return `<tr>
        <td>${s.settlement_date||'-'}</td>
        <td class="sev-interim-emp-name">${empName}</td>
        <td class="sev-interim-right">${(s.tenure_days||0).toLocaleString('ko-KR')}일</td>
        <td class="sev-interim-right">${won(s.daily_average_wage)}</td>
        <td class="sev-interim-amount">${won(s.settlement_amount)}</td>
        <td>${reasonLabel}</td>
        <td class="sev-interim-note-td">${s.note||'-'}</td>
        <td><button onclick="deleteSevInterim('${s.id}')" class="btn btn-sm btn-secondary sev-interim-btn"><i class="fas fa-trash"></i></button></td>
      </tr>`;
    }).join('');
  });
}

function openSevInterimModal(){
  _sevInterimEditId = null;
  document.getElementById('sev-interim-modal-title').textContent = '퇴직금 중간정산 기록';
  document.getElementById('sev-interim-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('sev-interim-reason').value = '';
  document.getElementById('sev-interim-tenure-days').value = '';
  document.getElementById('sev-interim-daily-wage').value = '';
  document.getElementById('sev-interim-amount').value = '';
  document.getElementById('sev-interim-note').value = '';

  // 직원 드롭다운 채우기 (일용직·등기임원 제외)
  const empSel = document.getElementById('sev-interim-emp');
  empSel.innerHTML = '<option value="">직원을 선택하세요</option>';
  const _EXCL = new Set([CONTRACT_TYPE.DAILY, CONTRACT_TYPE.EXECUTIVE, CONTRACT_TYPE.REPRESENTATIVE, CONTRACT_TYPE.RELATED_PARTY]);
  (allEmployees||[]).filter(e => e.company_id === _sevCompanyId && !_EXCL.has(e.employment_category))
    .sort((a,b) => (a.name||'').localeCompare(b.name||'','ko'))
    .forEach(e => {
      empSel.innerHTML += `<option value="${e.id}">${e.name||''}</option>`;
    });

  document.getElementById('sev-interim-modal').style.display = 'flex';
}

function closeSevInterimModal(){
  document.getElementById('sev-interim-modal').style.display = 'none';
}

function onSevInterimEmpChange(){
  const empId = document.getElementById('sev-interim-emp').value;
  if(!empId) return;
  const emp = allEmployees.find(e => e.id === empId);
  if(!emp) return;

  // 근속일수: hire_date → settlement_date (또는 오늘)
  const settleDate = document.getElementById('sev-interim-date').value || new Date().toISOString().slice(0,10);
  const tenure = calcTenure(emp.hire_date || '', settleDate);
  document.getElementById('sev-interim-tenure-days').value = tenure.totalDays || 0;

  // 1일 평균임금 추정: 직전 3개월 급여 기준
  const pays3 = getPrev3MonthsPayrolls(empId, settleDate);
  if(pays3.length > 0){
    const avg3 = calcAverageWage3(pays3);
    const s3 = new Date(settleDate);
    const start3 = new Date(s3.getFullYear(), s3.getMonth()-3, s3.getDate());
    const days3 = Math.ceil((s3 - start3) / 86400000);
    const dailyAvg = days3 > 0 ? Math.round(avg3 / days3) : 0;
    document.getElementById('sev-interim-daily-wage').value = dailyAvg || '';
  }
}

async function saveSevInterim(){
  const empId = document.getElementById('sev-interim-emp').value;
  const date = document.getElementById('sev-interim-date').value;
  const reason = document.getElementById('sev-interim-reason').value;
  const amountRaw = document.getElementById('sev-interim-amount').value.replace(/[^0-9]/g,'');
  const amount = parseInt(amountRaw) || 0;
  if(!empId || !date || !reason || !amount){ toast('필수 항목을 모두 입력하세요.', 'error'); return; }

  const body = {
    employee_id: empId,
    company_id: _sevCompanyId,
    settlement_date: date,
    tenure_days: parseInt(document.getElementById('sev-interim-tenure-days').value) || 0,
    daily_average_wage: parseInt((document.getElementById('sev-interim-daily-wage').value||'').replace(/[^0-9]/g,'')) || 0,
    settlement_amount: amount,
    reason: reason,
    note: document.getElementById('sev-interim-note').value,
    created_at: new Date().toISOString()
  };

  try {
    const method = _sevInterimEditId ? 'PATCH' : 'POST';
    const url = _sevInterimEditId
      ? `../tables/severance_interim_settlements/${_sevInterimEditId}`
      : '../tables/severance_interim_settlements';
    await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    closeSevInterimModal();
    renderSevInterimTab();
    renderSevStatusTab(); // 추계 탭 갱신 (중간정산 차감 반영)
    toast('중간정산 내역이 저장되었습니다.', 'success');
  } catch(e){ toast('저장 중 오류가 발생했습니다.', 'error'); }
}

async function deleteSevInterim(id){
  if(!confirm('중간정산 내역을 삭제하시겠습니까?')) return;
  try {
    await fetch(`../tables/severance_interim_settlements/${id}`, { method: 'DELETE' });
    renderSevInterimTab();
    renderSevStatusTab();
    toast('삭제되었습니다.', 'info');
  } catch(e){ toast('삭제 중 오류가 발생했습니다.', 'error'); }
}