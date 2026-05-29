// ─── PAYROLL INPUT ───
let piContract=null;
function loadPIEmployees(){
  const co=document.getElementById('pi-company').value;
  const s=document.getElementById('pi-employee');
  s.innerHTML='<option value="">선택</option>';
  [...allEmployees.filter(e=>e.company_id===co&&(e.status==='active'||e.status==='재직'))].sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(e=>{const _deptPos=[e.department,e.position].filter(v=>v&&v.trim()).join('/');s.innerHTML+=`<option value="${e.id}">${e.name}${_deptPos?` (${_deptPos})`:''}</option>`;});
  document.getElementById('pi-contract-card').style.display='none';
  piContract=null;clearPIFields();
}
// ── 연차 현황 표 계산·렌더링 ──
function calcAnnualLeaveTable(){
  const box = document.getElementById('pi-annual-leave-box');
  if(!box) return;

  // 계약서 없거나 일용직이면 표 숨김
  if(!piContract || piContract.contract_type === '일용직'){
    box.style.display = 'none';
    return;
  }

  const totalDays = parseFloat(piContract.annual_leave_days) || 0;
  if(totalDays <= 0){
    box.style.display = 'none';
    return;
  }
  box.style.display = '';

  // 이번달 사용 연차
  const thisUsed = parseFloat(document.getElementById('pi-annual-used')?.value || 0) || 0;

  // 현재 입력 중인 연도·월
  const curYear  = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const curMonth = parseInt(document.getElementById('pi-month')?.value) || 0;
  const empId    = document.getElementById('pi-employee')?.value || '';

  // 동일 직원의 저장된 이전 payroll에서 annual_leave_used 합산
  // (현재 편집 중인 레코드는 제외)
  const prevCum = (allPayrolls || [])
    .filter(p => {
      if(p.employee_id !== empId) return false;
      if(piEditPayrollId && p.id === piEditPayrollId) return false; // 수정 중인 레코드 제외
      // 계약 시작 연도·월 이후의 레코드만
      const cs = piContract.contract_start || '';
      const csYear  = cs ? parseInt(cs.slice(0,4)) : 0;
      const csMonth = cs ? parseInt(cs.slice(5,7)) : 0;
      const pYM = p.pay_year * 100 + (p.pay_month || 0);
      const csYM = csYear * 100 + csMonth;
      if(csYM && pYM < csYM) return false;
      return true;
    })
    .reduce((sum, p) => sum + (parseFloat(p.annual_leave_used) || 0), 0);

  const cumUsed  = prevCum + thisUsed;
  const remain   = totalDays - cumUsed;

  // 렌더링
  document.getElementById('pi-al-total').textContent   = `${totalDays}일`;
  document.getElementById('pi-al-cum').textContent     = `${cumUsed % 1 === 0 ? cumUsed : cumUsed.toFixed(1)}일`;
  const remainDisp = remain % 1 === 0 ? remain : remain.toFixed(1);
  const remainEl = document.getElementById('pi-al-remain');
  remainEl.textContent = `${remainDisp}일`;
  // 잔여가 0 이하면 빨간 경고색
  remainEl.style.color = remain <= 0 ? '#dc2626' : '#15803d';
  remainEl.closest('tr').style.background = remain <= 0 ? '#fff1f2' : '#f0fdf4';
  remainEl.closest('tr').querySelector('td:first-child').style.color = remain <= 0 ? '#9f1239' : '#166534';
}

function loadPIContract(){
  const empId=document.getElementById('pi-employee').value;
  const card=document.getElementById('pi-contract-card');
  if(!empId){card.style.display='none';piContract=null;return;}
  piContract=allContracts.find(c=>c.employee_id===empId&&(c.status==='active'||c.status==='활성'))||null;
  // 기준 모드 UI 전환 (고객사마다 다를 수 있으므로 직원 선택 시도 재확인)
  _switchInsuranceModeUI();
  if(piContract){
    const isPI_Daily = piContract.contract_type === '일용직';
    // 일용직: 기본급 자리에 일급여 채움, 주휴수당 0
    setAmountVal('pi-base',          isPI_Daily ? (piContract.daily_wage||0) : piContract.base_salary);
    setAmountVal('pi-weekly-hol',    isPI_Daily ? 0 : piContract.weekly_holiday_pay);
    setAmountVal('pi-position',      piContract.position_allowance);
    setAmountVal('pi-car',           piContract.transportation_allowance||piContract.car_maintenance||0);
    setPIPayType('car',              piContract.transportation_pay_type||'fixed');
    setAmountVal('pi-self-driving',  piContract.self_driving_allowance||0);
    setPIPayType('self-driving',     piContract.self_driving_pay_type||'fixed');
    setAmountVal('pi-remote-area',   piContract.remote_area_allowance||0);
    setPIPayType('remote-area',      piContract.remote_area_pay_type||'fixed');
    setAmountVal('pi-meal',          piContract.meal_allowance);
    setPIPayType('meal',             piContract.meal_pay_type||'fixed');
    setAmountVal('pi-childcare',     piContract.childcare_allowance||0);
    setAmountVal('pi-research',      piContract.research_allowance||0);
    // 이전 달 부양가족 수 인계: 동일 직원의 최신 payroll 레코드에서 가져옴
    (function(){
      const prevPayroll = (allPayrolls||[])
        .filter(p=>p.employee_id===empId)
        .sort((a,b)=>(b.pay_year-a.pay_year)||((b.pay_month||0)-(a.pay_month||0)))[0];
      const prevDep = prevPayroll?.dependents ?? 1;
      const depEl = document.getElementById('pi-dependents');
      if(depEl) depEl.value = Math.max(1, parseInt(prevDep)||1);
    })();
    const _alInit = document.getElementById('pi-annual-used'); if(_alInit) _alInit.value = 0;
    calcAnnualLeaveTable();
    setAmountVal('pi-annual-pay',    0);
    setAmountVal('pi-bonus',         0);
    setAmountVal('pi-performance',   0);
    setAmountVal('pi-actual-expense',0);
    setAmountVal('pi-communication', 0);
    setAmountVal('pi-etc-allowance', 0);
    document.getElementById('pi-ot-hours').value=0;
    document.getElementById('pi-night-hours').value=0;
    document.getElementById('pi-hol-hours').value=0;
    // 근로 실적 자동산출 패널 초기화 및 계약 정보 표시
    (function(){
      const wp = document.getElementById('pi-work-auto-panel');
      const wi = document.getElementById('pi-contract-work-info');
      const sw = document.getElementById('pi-ot-pay-simple-wrap');
      if(wp) wp.style.display = 'none';
      if(sw) sw.style.display = 'none';
      const hw = piContract?.hourly_wage || 0;
      const hpd = piContract?.work_hours_per_day || 8;
      const dpw = piContract?.work_days_per_week || 5;
      const isD = piContract?.contract_type === '일용직';
      if(wi){
        if(isD){
          wi.innerHTML = `일급여: <strong style="color:#059669;">${won(piContract.daily_wage||piContract.base_salary||0)}</strong> &nbsp;·&nbsp; 통상시급: <strong>${won(hw)}/h</strong>`;
        } else {
          const mDays = parseFloat(piContract?.work_days_per_month)||null;
          wi.innerHTML = `통상시급: <strong style="color:#059669;">${won(hw)}/h</strong> &nbsp;·&nbsp; 소정근로: 일 ${hpd}h / 주 ${dpw}일`
            + (mDays ? ` &nbsp;·&nbsp; 월 ${mDays}일` : '')
            + `<br><span style="color:#6b7280;font-size:11px;">기본급 일할 = 계약기본급 ÷ 월소정근로일 × 근로일수 &nbsp;|&nbsp; 연장 = 시급×1.5 &nbsp;·&nbsp; 야간 = 시급×0.5 &nbsp;·&nbsp; 휴일 = 시급×1.5</span>`;
        }
        wi.style.display = '';
      }
    })();
    document.getElementById('pi-contract-info').innerHTML = isPI_Daily ? `
      <b>고용형태:</b> 일용직<br>
      <b>일급여:</b> ${won(piContract.daily_wage||piContract.base_salary)}<br>
      <b>통상시급:</b> ${won(piContract.hourly_wage)}/h<br>
      <b>기본근로:</b> 일${piContract.work_hours_per_day}h<br>
      <b>식대:</b> ${won(piContract.meal_allowance)} · 휴게: ${piContract.break_time||'-'}
    ` : `
      <b>연봉:</b> ${won(piContract.annual_salary)}<br>
      <b>월 약정임금:</b> ${won(piContract.monthly_salary_agreed)}<br>
      <b>통상시급:</b> ${won(piContract.hourly_wage)}/h<br>
      <b>기본근로:</b> 일${piContract.work_hours_per_day}h · 주${piContract.work_days_per_week}일<br>
      <b>식대:</b> ${won(piContract.meal_allowance)} · 휴게: ${piContract.break_time||'-'}
    `;
    card.style.display='block';
    // 계약서 고정 항목 잠금
    _setPIContractReadonly(true);
  } else {
    document.getElementById('pi-contract-info').innerHTML='⚠️ 유효한 계약서가 없습니다.';
    card.style.display='block';
    const _alBox2 = document.getElementById('pi-annual-leave-box'); if(_alBox2) _alBox2.style.display='none';
    // 계약 없으면 잠금 해제
    _setPIContractReadonly(false);
  }
  // ── 수습 만료일 초과 검사 (직원/계약 변경 시 즉시 갱신) ──
  const _probOverrunOnLoad = _checkPIProbationOverrun();
  if(_probOverrunOnLoad) _setPIInputLocked(true);
  calcPI();

  // ── 임시저장 배너 체크 (직원 선택 시) ──
  {
    const _empIdForDraft = document.getElementById('pi-employee')?.value;
    const _yrForDraft    = parseInt(document.getElementById('pi-year')?.value);
    const _moForDraft    = parseInt(document.getElementById('pi-month')?.value);
    piDraftId = null; // 직원 바뀌면 초기화
    if(_empIdForDraft && _yrForDraft && _moForDraft){
      _checkAndShowPIDraftBanner(_empIdForDraft, _yrForDraft, _moForDraft);
    } else {
      const draftBanner = document.getElementById('pi-draft-banner');
      if(draftBanner) draftBanner.style.display = 'none';
    }
  }
}
const gv=id=>parseFloat((document.getElementById(id).value||'').replace(/,/g,''))||0;
// ── 현재 선택된 고객사의 4대보험 적용 기준 반환 ──
function _getPIInsuranceBasis(){
  // currentGlobalCompanyId 우선, 없으면 숨김 select value 폴백
  const coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const co = allCompanies.find(c=>c.id===coId);
  return co?.insurance_basis || '요율 기준';
}

// ── 특정 년월의 4대보험 산정기준 등록 여부 확인 ──
// 반환: { ok: true } | { ok: false, missing: ['국민연금', ...] }
// companyId: 선택적 인자 - 전달 시 해당 고객사 insurance_basis를 직접 조회 (글로벌 상태 기준 오제)
function _checkPIStandardsReady(yr, mo, companyId){
  // 확정액 기준 고객사는 요율 불필요 → 항상 통과
  const _basisCoId = companyId || currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const _basisCo = allCompanies.find(c=>c.id===_basisCoId);
  if((_basisCo?.insurance_basis || '요율 기준') === '확정액 기준') return { ok: true };

  const payDate = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const types = [
    { key:'national_pension', label:'국민연금' },
    { key:'health',           label:'건강보험' },
    { key:'long_term_care',   label:'장기요양보험' },
    { key:'employment',       label:'고용보험' },
  ];
  const missing = types
    .filter(t => !_allInsuranceRates.find(r =>
      r.insurance_type === t.key &&
      payDate >= (r.period_start||'') &&
      payDate <= (r.period_end||'9999-12-31')
    ))
    .map(t => t.label);

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

// ──────────────────────────────────────────────────────────────────────────────
// _calcProbationEndDate(contract)
//   계약 객체에서 수습 종료일(YYYY-MM-DD)을 반환한다.
//   - probation_months > 0: 계약시작일 + probation_months 개월 - 1일
//   - probation_months = 0 or 없음: 계약 전체 기간이 수습 → contract_end 반환
//   - 수습 계약이 아니면 null 반환
// ──────────────────────────────────────────────────────────────────────────────
function _calcProbationEndDate(ct){
  if(!ct) return null;
  const isProb = (ct.contract_type === '정규직 수습' || ct.contract_type === '계약직 수습');
  if(!isProb) return null;
  const months = ct.probation_months ? Number(ct.probation_months) : 0;
  if(months > 0){
    const d = new Date(ct.contract_start);
    d.setMonth(d.getMonth() + months);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0,10);
  }
  // probation_months 미입력 → 계약 전체 기간이 수습
  return ct.contract_end || null; // null이면 무기한 수습
}

// ──────────────────────────────────────────────────────────────────────────────
// _checkPIProbationOverrun()
//   현재 선택된 급여 연월이 piContract 의 수습 만료일을 초과하는지 검사한다.
//
//   ① 해당 월 전체(1일~말일)가 수습 기간 이후 → case1-panel 표시, 저장 차단 → true 반환
//   ② 해당 월 중간에 수습 만료일이 껴있음 → case2-panel 표시, 분리 UI 활성 → 'split' 반환
//   ③ 수습 기간 내 → 배너 전체 숨김 → false 반환
// ──────────────────────────────────────────────────────────────────────────────
function _checkPIProbationOverrun(){
  const banner   = document.getElementById('pi-prob-overrun-banner');
  const panel1   = document.getElementById('pi-prob-case1-panel');
  const panel2   = document.getElementById('pi-prob-case2-panel');
  const detail   = document.getElementById('pi-prob-overrun-detail');
  if(!banner) return false;

  // 패널 숨김 헬퍼
  const hideAll = () => {
    banner.style.display = 'none';
    if(panel1) panel1.style.display = 'none';
    if(panel2) panel2.style.display = 'none';
  };

  // 수습 계약이 아니면 배너 전체 숨김
  const isProb = piContract &&
    (piContract.contract_type === '정규직 수습' || piContract.contract_type === '계약직 수습');
  if(!isProb){ hideAll(); return false; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);
  if(!yr || !mo){ hideAll(); return false; }

  // 해당 월의 시작일 · 말일
  const monthStart = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const lastDay    = new Date(yr, mo, 0).getDate();
  const monthEnd   = `${yr}-${String(mo).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  const probEnd = _calcProbationEndDate(piContract);
  const fmt = d => d ? `${d.slice(0,4)}년 ${d.slice(5,7)}월 ${d.slice(8,10)}일` : '-';

  if(!probEnd){
    hideAll();
    return false;
  }

  // ── ① 해당 월 전체가 수습 종료일 이후 ──────────────────────────────────────
  if(monthStart > probEnd){
    // case2 숨기고 case1 표시
    if(panel2) panel2.style.display = 'none';
    if(panel1) panel1.style.display = '';
    if(detail){
      detail.innerHTML =
        `<div>· 수습 종료일: <strong style="color:#dc2626;">${fmt(probEnd)}</strong></div>` +
        `<div>· 선택한 급여 월: <strong>${yr}년 ${mo}월</strong> — 수습 기간이 이미 만료된 달입니다.</div>` +
        `<div style="margin-top:4px;color:#b91c1c;font-weight:600;">
          이 달의 급여는 <u>채용확정 근로계약서 기준</u>으로 처리해야 합니다.<br>
          아래 버튼으로 채용확정 계약서를 자동 생성하고 급여를 저장하세요.
         </div>`;
    }
    banner.style.display = '';
    return true; // 저장 차단
  }

  // ── ② 해당 월 중간에 수습 만료일이 껴있음 ─────────────────────────────────
  if(probEnd >= monthStart && probEnd < monthEnd){
    // case1 숨기고 case2 표시
    if(panel1) panel1.style.display = 'none';
    if(panel2) panel2.style.display = '';

    // 채용확정 기간 시작일 계산
    const probEndDateObj = new Date(probEnd);
    const postStartDateObj = new Date(probEndDateObj);
    postStartDateObj.setDate(postStartDateObj.getDate() + 1);
    const postStart = postStartDateObj.toISOString().slice(0,10);

    // 확정 후 고용형태
    const confirmedType = piContract.contract_type === '정규직 수습' ? '정규직' : '계약직';

    // split-info 렌더링
    const splitInfo = document.getElementById('pi-prob-split-info');
    if(splitInfo){
      splitInfo.innerHTML =
        `<div>· 수습 종료일: <strong style="color:#d97706;">${fmt(probEnd)}</strong></div>` +
        `<div>· 급여 월: <strong>${yr}년 ${mo}월</strong> (${fmt(monthStart)} ~ ${fmt(monthEnd)})</div>` +
        `<div style="margin-top:4px;">
          이 달은 수습 기간(<strong>${fmt(monthStart)} ~ ${fmt(probEnd)}</strong>)과
          채용확정 기간(<strong>${fmt(postStart)} ~ ${fmt(monthEnd)}</strong>)이 혼재합니다.<br>
          아래에 두 기간의 근로일수·시간을 각각 입력하고 <strong>[분리 저장]</strong>을 누르세요.<br>
          <span style="color:#059669;font-size:11px;">저장 시 <strong>${confirmedType}</strong> 계약서가 자동 생성되고 고용형태가 변경됩니다.</span>
         </div>`;
    }

    // 날짜 범위 레이블 업데이트
    const probDatesEl = document.getElementById('pi-prob-split-prob-dates');
    if(probDatesEl) probDatesEl.textContent = `(${monthStart.slice(5,7)}/${monthStart.slice(8,10)} ~ ${probEnd.slice(5,7)}/${probEnd.slice(8,10)})`;
    const postDatesEl = document.getElementById('pi-prob-split-post-dates');
    if(postDatesEl) postDatesEl.textContent = `(${postStart.slice(5,7)}/${postStart.slice(8,10)} ~ ${monthEnd.slice(5,7)}/${monthEnd.slice(8,10)})`;

    // 분리 입력 필드 초기화 (처음 표시 시)
    const wdProbEl  = document.getElementById('pi-prob-wd-prob');
    const whProbEl  = document.getElementById('pi-prob-wh-prob');
    const wdPostEl  = document.getElementById('pi-prob-wd-post');
    const whPostEl  = document.getElementById('pi-prob-wh-post');
    if(wdProbEl && wdProbEl.value === '') wdProbEl.value = '0';
    if(whProbEl && whProbEl.value === '') whProbEl.value = '0';
    if(wdPostEl && wdPostEl.value === '') wdPostEl.value = '0';
    if(whPostEl && whPostEl.value === '') whPostEl.value = '0';

    banner.style.display = '';
    _onProbSplitInputChange(); // 초기 검증 실행
    return 'split'; // 분리 UI 활성 — 일반 저장 차단이지만 분리 저장 버튼으로 처리
  }

  // ── ③ 해당 월 전체가 수습 기간 내 → 정상 ────────────────────────────────
  hideAll();
  return false;
}

// ── 년/월 변경 시 산정기준 즉시 체크 ──
function onPIYearMonthChange(){
  // 급여 입력 섹션이 보이는 상태(고객사 선택된 상태)일 때만 체크
  const inputSection = document.getElementById('pi-input-section');
  if(!inputSection || inputSection.style.display === 'none') return;
  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);
  if(!yr || !mo) return;

  // ── 수습 만료일 초과 검사 ──
  const probOverrun = _checkPIProbationOverrun();
  if(probOverrun === true){
    // 케이스①: 월 전체 초과 → 저장 버튼 완전 차단
    _setPIInputLocked(true);
    return;
  }
  if(probOverrun === 'split'){
    // 케이스②: 월 중간 분리 → 일반 저장 버튼 차단, 분리 저장 버튼은 활성(검증 통과 시)
    _setPIInputLocked(true);
    return; // 산정기준 체크 불필요 (분리 저장으로만 처리)
  }

  const stdCheck = _checkPIStandardsReady(yr, mo, currentGlobalCompanyId);
  if(!stdCheck.ok){
    _showPIStandardsWarn(yr, mo, stdCheck.missing);
    // 입력 폼 잠금 (저장 버튼 비활성)
    _setPIInputLocked(true);
  } else {
    _setPIInputLocked(false);
  }

  // ── 연월 변경 시에도 임시저장 배너 갱신 ──
  const _empId2 = document.getElementById('pi-employee')?.value;
  if(_empId2){
    piDraftId = null; // 연월 변경 시 초기화
    _checkAndShowPIDraftBanner(_empId2, yr, mo);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// _onProbSplitInputChange()
//   케이스② 분리 입력(수습 근로일수 / 채용확정 근로일수)이 변경될 때마다
//   합계를 현재 입력된 pi-work-days · pi-total-hours 와 비교하고
//   분리 저장 버튼 활성/비활성을 제어한다.
// ──────────────────────────────────────────────────────────────────────────────
function _onProbSplitInputChange(){
  const wdProb  = parseFloat(document.getElementById('pi-prob-wd-prob')?.value || 0) || 0;
  const whProb  = parseFloat(document.getElementById('pi-prob-wh-prob')?.value || 0) || 0;
  const wdPost  = parseFloat(document.getElementById('pi-prob-wd-post')?.value || 0) || 0;
  const whPost  = parseFloat(document.getElementById('pi-prob-wh-post')?.value || 0) || 0;

  const totalWd = parseFloat(document.getElementById('pi-work-days')?.value || 0) || 0;
  const totalWh = parseFloat(document.getElementById('pi-total-hours')?.value || 0) || 0;

  const wdSum = wdProb + wdPost;
  const whSum = Math.round((whProb + whPost) * 10) / 10;

  const checkEl  = document.getElementById('pi-prob-split-total-check');
  const saveBtn  = document.getElementById('pi-prob-split-save-btn');

  let msgs = [];
  let valid = true;

  // 근로일수 합계 검증
  if(totalWd > 0){
    if(wdSum !== totalWd){
      msgs.push(`<span style="color:#dc2626;">⚠ 근로일수 합계 ${wdSum}일 ≠ 전체 ${totalWd}일</span>`);
      valid = false;
    } else {
      msgs.push(`<span style="color:#16a34a;">✔ 근로일수 합계 일치 (${wdSum}일)</span>`);
    }
  } else {
    if(wdProb <= 0 && wdPost <= 0){
      msgs.push('<span style="color:#9ca3af;">근로일수를 입력하세요.</span>');
      valid = false;
    }
  }

  // 총근로시간 합계 검증
  if(totalWh > 0){
    if(whSum !== totalWh){
      msgs.push(`<span style="color:#dc2626;">⚠ 총근로시간 합계 ${whSum}h ≠ 전체 ${totalWh}h</span>`);
      valid = false;
    } else {
      msgs.push(`<span style="color:#16a34a;">✔ 총근로시간 합계 일치 (${whSum}h)</span>`);
    }
  }

  // 최소 입력 검증 (둘 다 0이면 안 됨)
  if(wdProb <= 0 && wdPost <= 0){
    valid = false;
  }

  if(checkEl) checkEl.innerHTML = msgs.join(' &nbsp;|&nbsp; ');

  if(saveBtn){
    saveBtn.disabled = !valid;
    saveBtn.style.opacity = valid ? '1' : '0.5';
    saveBtn.style.cursor  = valid ? 'pointer' : 'not-allowed';
  }
}

// ── 급여 입력 폼 잠금/해제 ──
function _setPIInputLocked(locked){
  const saveBtn = document.querySelector('[onclick="savePI()"]') ||
                  document.querySelector('button[onclick*="savePI"]');
  if(saveBtn){
    saveBtn.disabled = locked;
    saveBtn.style.opacity = locked ? '0.4' : '';
    saveBtn.style.cursor  = locked ? 'not-allowed' : '';
  }
}

// ── 산정기준 경고 모달 표시 ──
function _showPIStandardsWarn(yr, mo, missing){
  const moStr = String(mo).padStart(2,'0');
  const msgEl = document.getElementById('pi-standards-warn-msg');
  if(msgEl){
    msgEl.innerHTML =
      `<span style="color:#d97706;">${yr}년 ${moStr}월</span> 급여 입력을 위한<br>` +
      `년도별 산정기준을 먼저 업데이트하셔야 입력할 수 있습니다.<br>` +
      `<span style="font-size:12px;color:#9ca3af;font-weight:400;">미등록: ${missing.join(', ')}</span>`;
  }
  openModal('pi-standards-warn-modal');
}

// ── 현재 급여 지급 년월 기준 적용 요율 조회 ──
function _getPIRates(){
  const yr = parseInt(document.getElementById('pi-year')?.value) || new Date().getFullYear();
  const mo = parseInt(document.getElementById('pi-month')?.value) || (new Date().getMonth()+1);
  const payDate = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const find = (type) => {
    const r = _allInsuranceRates.find(r=>
      r.insurance_type===type && payDate >= r.period_start && payDate <= r.period_end
    );
    return r;
  };
  const pension  = find('national_pension');
  const health   = find('health');
  const ltcare   = find('long_term_care');
  const employ   = find('employment');
  return {
    pensionRate:  pension ? pension.rate/100  : 0.045,
    pensionCap:   pension ? (pension.cap_amount||6370000) : 6370000,
    healthRate:   health  ? health.rate/100   : 0.03545,
    ltcareRate:   ltcare  ? ltcare.rate/100   : 0.1295,  // 건강보험료 대비
    employRate:   employ  ? employ.rate/100   : 0.009,
    // 라벨용
    pensionLabel: pension  ? `${pension.rate}%, 상한 ${(pension.cap_amount||6370000).toLocaleString('ko-KR')}원` : '4.5%',
    healthLabel:  health   ? `${health.rate}%`  : '3.545%',
    ltcareLabel:  ltcare   ? `${ltcare.rate}%`  : '12.95%',
    employLabel:  employ   ? `${employ.rate}%`  : '0.9%',
  };
}

// ── 4대보험 적용 기준에 따라 공제 영역 UI 전환 ──
function _switchInsuranceModeUI(){
  const isFixed = _getPIInsuranceBasis() === '확정액 기준';
  const autoBlock  = document.getElementById('pi-ded-auto-block');
  const fixedBlock = document.getElementById('pi-ded-fixed-block');
  const badge      = document.getElementById('pi-ded-mode-badge');
  if(autoBlock)  autoBlock.style.display  = isFixed ? 'none' : '';
  if(fixedBlock) fixedBlock.style.display = isFixed ? '' : 'none';
  if(badge){
    badge.textContent = isFixed ? '확정액 직접입력' : '요율 자동계산';
    badge.style.background = isFixed ? '#f59e0b' : '#e94560';
  }
}

// ── 근로 실적 자동 산출 ──
// 근로일수 / OT·야간·휴일 시간 입력 시 계약서 기반 금액 자동 산출 후 표시
// 실제 기본급·수당 입력 필드는 직접 건드리지 않음 (사용자 수정 우선)
function calcPIWorkActual(){
  const workAutoPanel = document.getElementById('pi-work-auto-panel');
  const workInfoBox   = document.getElementById('pi-contract-work-info');
  const simpleWrap    = document.getElementById('pi-ot-pay-simple-wrap');

  if(!piContract){
    if(workAutoPanel) workAutoPanel.style.display = 'none';
    if(workInfoBox)   workInfoBox.style.display   = 'none';
    if(simpleWrap)    simpleWrap.style.display     = '';
    return;
  }

  const workDays  = gv('pi-work-days');
  const otH       = gv('pi-ot-hours');
  const nightH    = gv('pi-night-hours');
  const holH      = gv('pi-hol-hours');
  const hw        = parseFloat(piContract.hourly_wage)  || 0;
  const hpd       = parseFloat(piContract.work_hours_per_day) || 8; // 일 소정근로시간
  const dpw       = parseFloat(piContract.work_days_per_week) || 5; // 주 소정근로일수

  // 해당 월 약정 소정근로일수 표시
  // 계약서에 work_days_per_month 필드가 있으면 사용, 없으면 없음으로
  const contractedDaysPerMonth = parseFloat(piContract.work_days_per_month) || null;
  const isDaily = piContract.contract_type === '일용직';

  if(workInfoBox){
    let infoHtml = '';
    if(!isDaily){
      infoHtml += `통상시급: <strong style="color:#059669;">${won(hw)}/h</strong>`;
      infoHtml += ` &nbsp;·&nbsp; 소정근로: 일 ${hpd}h / 주 ${dpw}일`;
      if(contractedDaysPerMonth) infoHtml += ` &nbsp;·&nbsp; 월 ${contractedDaysPerMonth}일`;
      infoHtml += `<br><span style="color:#6b7280;font-size:11px;">
        기본급 일할 = 계약기본급 ÷ 월소정근로일 × 근로일수 &nbsp;|&nbsp;
        연장 = 시급×1.5 &nbsp;·&nbsp; 야간 = 시급×0.5 &nbsp;·&nbsp; 휴일 = 시급×1.5
      </span>`;
    } else {
      infoHtml = `일급여: <strong style="color:#059669;">${won(piContract.daily_wage||piContract.base_salary)}</strong>`;
      infoHtml += ` &nbsp;·&nbsp; 통상시급: <strong>${won(hw)}/h</strong>`;
    }
    workInfoBox.innerHTML = infoHtml;
    workInfoBox.style.display = '';
  }

  // 월 소정근로일수 추정 (계약 필드 없으면 주 소정일수 × 4.345주)
  const monthlyDays = contractedDaysPerMonth || Math.round(dpw * 4.345);

  // 기본급 일할 계산
  const contractBase = parseFloat(piContract.base_salary) || 0;
  let baseDailyCalc  = contractBase; // 기본값: 계약 기본급 전체
  let baseDailyLabel = '-';
  if(!isDaily && workDays > 0 && monthlyDays > 0){
    baseDailyCalc = Math.round(contractBase / monthlyDays * workDays);
    baseDailyLabel = `${won(baseDailyCalc)} (${won(contractBase)} ÷ ${monthlyDays}일 × ${workDays}일)`;
  } else if(isDaily && workDays > 0){
    baseDailyCalc = Math.round((piContract.daily_wage || piContract.base_salary || 0) * workDays);
    baseDailyLabel = `${won(baseDailyCalc)} (일급 × ${workDays}일)`;
  } else {
    baseDailyLabel = '-';
  }

  // 수당 자동 산출
  const otPay    = Math.round(hw * otH    * 1.5);
  const nightPay = Math.round(hw * nightH * 0.5);
  const holPay   = Math.round(hw * holH   * 1.5);

  // 패널 업데이트 (panel 내부 disp 요소)
  const dispBaseDailyEl = document.getElementById('pi-base-daily-disp');
  if(dispBaseDailyEl) dispBaseDailyEl.textContent = baseDailyLabel;

  const dispOt    = document.getElementById('pi-ot-pay-disp');
  const dispNight = document.getElementById('pi-night-pay-disp');
  const dispHol   = document.getElementById('pi-hol-pay-disp');
  if(dispOt)    dispOt.textContent    = won(otPay);
  if(dispNight) dispNight.textContent = won(nightPay);
  if(dispHol)   dispHol.textContent   = won(holPay);

  // simple wrap은 숨기고 패널 표시
  if(simpleWrap)    simpleWrap.style.display     = 'none';
  if(workAutoPanel) workAutoPanel.style.display  = '';

  // 계약 참조 자동 채우기 안내 (기본급 일할이 계산된 경우 pi-base 필드를 자동으로 채움)
  // 단, 사용자가 직접 수정한 경우는 덮어쓰지 않음 → 현재 값과 계약기본급이 동일할 때만 업데이트
  if(workDays > 0 && !isDaily){
    const currentBase = gv('pi-base');
    // 기본급 필드가 계약기본급 그대로이거나 0이면 → 일할 계산값으로 자동 갱신
    if(currentBase === contractBase || currentBase === 0){
      setAmountVal('pi-base', baseDailyCalc);
    }
  }

  calcPI();
}

function calcPI(){
  const hw=piContract?piContract.hourly_wage:0;
  const otH=gv('pi-ot-hours'),nightH=gv('pi-night-hours'),holH=gv('pi-hol-hours');
  const otPay=Math.round(hw*otH*1.5);
  const nightPay=Math.round(hw*nightH*0.5);
  const holPay=Math.round(hw*holH*1.5);

  // 패널 방식 (piContract 있을 때) vs 단순 표시 (없을 때) 구분
  if(piContract){
    // 자동산출 패널 내부 disp 요소 업데이트
    const dOt    = document.getElementById('pi-ot-pay-disp');
    const dNight = document.getElementById('pi-night-pay-disp');
    const dHol   = document.getElementById('pi-hol-pay-disp');
    if(dOt)    dOt.textContent    = won(otPay);
    if(dNight) dNight.textContent = won(nightPay);
    if(dHol)   dHol.textContent   = won(holPay);
    // simple wrap 숨기기
    const sw = document.getElementById('pi-ot-pay-simple-wrap');
    if(sw) sw.style.display = 'none';
    // panel 표시
    const wp = document.getElementById('pi-work-auto-panel');
    if(wp && wp.style.display === 'none' && (otPay||nightPay||holPay)){
      wp.style.display = '';
    }
  } else {
    // 계약 없을 때 simple disp 사용
    const dOtS    = document.getElementById('pi-ot-pay-disp-simple');
    const dNightS = document.getElementById('pi-night-pay-disp-simple');
    const dHolS   = document.getElementById('pi-hol-pay-disp-simple');
    if(dOtS)    dOtS.textContent    = won(otPay);
    if(dNightS) dNightS.textContent = won(nightPay);
    if(dHolS)   dHolS.textContent   = won(holPay);
    const sw = document.getElementById('pi-ot-pay-simple-wrap');
    if(sw) sw.style.display = '';
    const wp = document.getElementById('pi-work-auto-panel');
    if(wp) wp.style.display = 'none';
  }

  const gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-position')+gv('pi-skill')+gv('pi-license')+gv('pi-car')+gv('pi-self-driving')+gv('pi-remote-area')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+otPay+nightPay+holPay+gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-etc-allowance');
  // 통상임금 기준: 매월 정기지급 항목만 포함 (출근일수에 따름은 제외)
  const std=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-position')+gv('pi-skill')+gv('pi-license')
    +(_getPIPayTypeVal('car')==='fixed'?gv('pi-car'):0)
    +(_getPIPayTypeVal('self-driving')==='fixed'?gv('pi-self-driving'):0)
    +(_getPIPayTypeVal('remote-area')==='fixed'?gv('pi-remote-area'):0)
    +(_getPIPayTypeVal('meal')==='fixed'?gv('pi-meal'):0)
    +gv('pi-childcare')+gv('pi-research')+otPay+nightPay+holPay+gv('pi-annual-pay');
  const curStd=gv('pi-std-pay');
  if(!curStd||curStd===0) setAmountVal('pi-std-pay', std);
  const isFixed = _getPIInsuranceBasis() === '확정액 기준';
  if(isFixed) calcPIFixed(gross);
  else calcPIDeductions(gross);
}
function calcPIManual(){
  // 수당 표시값 파싱 (패널 방식/단순 방식 모두 체크)
  const _parsePay=id=>{
    const el=document.getElementById(id);
    return el ? parseFloat((el.textContent||'').replace(/[^0-9]/g,'')||0) : 0;
  };
  const otPay    = _parsePay('pi-ot-pay-disp')    || _parsePay('pi-ot-pay-disp-simple');
  const nightPay = _parsePay('pi-night-pay-disp') || _parsePay('pi-night-pay-disp-simple');
  const holPay   = _parsePay('pi-hol-pay-disp')   || _parsePay('pi-hol-pay-disp-simple');
  const gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-position')+gv('pi-skill')+gv('pi-license')
             +gv('pi-car')+gv('pi-self-driving')+gv('pi-remote-area')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')
             +otPay+nightPay+holPay
             +gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-etc-allowance');
  const isFixed = _getPIInsuranceBasis() === '확정액 기준';
  if(isFixed) calcPIFixed(gross);
  else calcPIDeductions(gross);
}

// ── 요율 기준 자동 계산 ──
function calcPIDeductions(gross){
  const std=gv('pi-std-pay')||gross;
  const dependents=Math.max(1,parseInt(document.getElementById('pi-dependents')?.value||'1')||1);
  const R = _getPIRates();
  // 국민연금: 하한(월 37만원 이하 면제) 없음, 상한 적용
  const pension = Math.round(Math.min(std, R.pensionCap) * R.pensionRate);
  const health  = Math.round(std * R.healthRate);
  const ltCare  = Math.round(health * R.ltcareRate);
  const empIns  = Math.round(std * R.employRate);
  // 간이세액표 근사 계산
  const taxBase=std-pension-health-ltCare-empIns-150000;
  let incomeTax=0;
  if(taxBase>0){
    if(taxBase<=1060000) incomeTax=0;
    else if(taxBase<=1500000) incomeTax=Math.round((taxBase-1060000)*0.06);
    else if(taxBase<=3000000) incomeTax=Math.round(26400+(taxBase-1500000)*0.15);
    else if(taxBase<=4500000) incomeTax=Math.round(251400+(taxBase-3000000)*0.24);
    else if(taxBase<=8000000) incomeTax=Math.round(611400+(taxBase-4500000)*0.35);
    else incomeTax=Math.round(1836400+(taxBase-8000000)*0.38);
    incomeTax=Math.max(0,incomeTax-Math.max(0,(dependents-1)*15000));
  }
  const localTax=Math.floor(incomeTax*0.1/10)*10;
  const yearEnd=gv('pi-yearend'), healthAdj=gv('pi-health-adj'), advance=gv('pi-advance');
  const totalDed=pension+health+ltCare+empIns+incomeTax+localTax+yearEnd+healthAdj+advance;
  const net=gross-totalDed;
  document.getElementById('pi-ded-detail').innerHTML=`
    <div style="display:flex;justify-content:space-between"><span style="color:#888">소득세 (부양가족 ${dependents}인)</span><span>${won(incomeTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">주민세 (소득세×10%)</span><span>${won(localTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">건강보험 (보수월액×${R.healthLabel})</span><span>${won(health)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">장기요양보험 (건강보험×${R.ltcareLabel})</span><span>${won(ltCare)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">국민연금 (보수월액×${R.pensionLabel})</span><span>${won(pension)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">고용보험 (보수월액×${R.employLabel})</span><span>${won(empIns)}</span></div>`;
  _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,advance);
}

// ── 확정액 기준: 직접 입력 + 소득세만 자동계산 ──
function calcPIFixed(gross){
  if(gross===undefined){
    const _pf=id=>parseFloat((document.getElementById(id)?.textContent||'').replace(/[^0-9]/g,'')||0);
    const otPay=   _pf('pi-ot-pay-disp')    || _pf('pi-ot-pay-disp-simple');
    const nightPay=_pf('pi-night-pay-disp') || _pf('pi-night-pay-disp-simple');
    const holPay=  _pf('pi-hol-pay-disp')   || _pf('pi-hol-pay-disp-simple');
    gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-position')+gv('pi-skill')+gv('pi-license')+gv('pi-car')+gv('pi-self-driving')+gv('pi-remote-area')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+otPay+nightPay+holPay+gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-etc-allowance');
  }
  const std=gv('pi-std-pay')||gross;
  const pension = gv('pi-pension-fixed');
  const health  = gv('pi-health-fixed');
  const ltCare  = gv('pi-ltcare-fixed');
  const empIns  = gv('pi-employ-fixed');
  const dependents=Math.max(1,parseInt(document.getElementById('pi-dependents')?.value||'1')||1);
  // 소득세는 자동계산
  const taxBase=std-pension-health-ltCare-empIns-150000;
  let incomeTax=0;
  if(taxBase>0){
    if(taxBase<=1060000) incomeTax=0;
    else if(taxBase<=1500000) incomeTax=Math.round((taxBase-1060000)*0.06);
    else if(taxBase<=3000000) incomeTax=Math.round(26400+(taxBase-1500000)*0.15);
    else if(taxBase<=4500000) incomeTax=Math.round(251400+(taxBase-3000000)*0.24);
    else if(taxBase<=8000000) incomeTax=Math.round(611400+(taxBase-4500000)*0.35);
    else incomeTax=Math.round(1836400+(taxBase-8000000)*0.38);
    incomeTax=Math.max(0,incomeTax-Math.max(0,(dependents-1)*15000));
  }
  const localTax=Math.floor(incomeTax*0.1/10)*10;
  const yearEnd=gv('pi-yearend'), healthAdj=gv('pi-health-adj'), advance=gv('pi-advance');
  const totalDed=pension+health+ltCare+empIns+incomeTax+localTax+yearEnd+healthAdj+advance;
  const net=gross-totalDed;
  document.getElementById('pi-ded-detail-fixed').innerHTML=`
    <div style="display:flex;justify-content:space-between"><span style="color:#888">소득세 (부양가족 ${dependents}인, 자동)</span><span>${won(incomeTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">주민세 (소득세×10%, 자동)</span><span>${won(localTax)}</span></div>`;
  _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,advance);
}

function _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,advance){
  const updateAmounts=(g,d,n)=>{ document.getElementById(g).textContent=won(gross); document.getElementById(d).textContent=won(totalDed); document.getElementById(n).textContent=won(net); };
  updateAmounts('pi-gross-disp','pi-ded-disp','pi-net-disp');
  updateAmounts('pi-gross-disp2','pi-ded-disp2','pi-net-disp2');
  const _pv=id=>parseFloat((document.getElementById(id)?.textContent||'').replace(/[^0-9]/g,'')||0);
  window._piCalc={gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,
    otPay:   _pv('pi-ot-pay-disp')    || _pv('pi-ot-pay-disp-simple'),
    nightPay:_pv('pi-night-pay-disp') || _pv('pi-night-pay-disp-simple'),
    holPay:  _pv('pi-hol-pay-disp')   || _pv('pi-hol-pay-disp-simple')};
}
// ─── 통상임금 지급유형 관리 ───
// 'fixed'=매월 정기지급(통상임금 포함), 'daily'=출근일수에 따름(통상임금 제외)
const _piPayTypes = { car:'fixed', 'self-driving':'fixed', 'remote-area':'fixed', meal:'fixed' };

function setPIPayType(field, type){
  _piPayTypes[field] = type;
  const fixedBtn = document.getElementById(`pi-${field}-type-fixed`);
  const dailyBtn = document.getElementById(`pi-${field}-type-daily`);
  const hintEl   = document.getElementById(`pi-${field}-type-hint`);
  if(fixedBtn && dailyBtn){
    fixedBtn.classList.toggle('active-fixed', type === 'fixed');
    fixedBtn.classList.remove('active-daily');
    dailyBtn.classList.toggle('active-daily', type === 'daily');
    dailyBtn.classList.remove('active-fixed');
  }
  if(hintEl){
    if(type === 'fixed'){
      hintEl.textContent = '통상임금 포함';
      hintEl.style.color = '#3b82f6';
    } else {
      hintEl.textContent = '통상임금 제외 (출근일수 비례)';
      hintEl.style.color = '#f59e0b';
    }
  }
  // 지급유형 변경 시 std 재계산
  calcPI();
}

function _getPIPayTypeVal(field){
  // 'fixed'면 해당 금액 전액을 통상임금에 포함, 'daily'면 제외
  return _piPayTypes[field] || 'fixed';
}

function _resetPIPayTypes(){
  ['car','self-driving','remote-area','meal'].forEach(f=>{
    _piPayTypes[f] = 'fixed';
    setPIPayType(f, 'fixed');
  });
}

// ── 계약서 고정 항목 readonly 토글 ──
// on=true : 계약서 값 채운 후 잠금 (편집 불가)
// on=false: 잠금 해제 (직원 미선택 or 계약 없을 때)
const _PI_CONTRACT_FIXED_IDS = [
  'pi-base','pi-weekly-hol','pi-position',
  'pi-car','pi-self-driving','pi-remote-area','pi-meal',
  'pi-childcare','pi-research'
];
const _PI_PAY_TYPE_FIELDS = ['car','self-driving','remote-area','meal'];

function _setPIContractReadonly(on){
  // 입력 필드 잠금/해제
  _PI_CONTRACT_FIXED_IDS.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(on){
      el.readOnly = true;
      el.classList.add('pi-readonly-field');
      // inline style이 있는 필드도 배경색 강제 적용
      el.style.background = '#f4f6fb';
      el.style.color = '#6b7280';
      el.style.cursor = 'default';
      el.style.borderColor = '#e5e7eb';
      el._savedOninput = el.getAttribute('oninput') || 'onAmountInput(this,calcPI)';
      el.removeAttribute('oninput');
    } else {
      el.readOnly = false;
      el.classList.remove('pi-readonly-field');
      // inline style 원복 (기존 스타일이 있던 필드는 유지, 없던 필드는 제거)
      el.style.background = '';
      el.style.color = '';
      el.style.cursor = '';
      el.style.borderColor = '';
      const saved = el._savedOninput || 'onAmountInput(this,calcPI)';
      el.setAttribute('oninput', saved);
    }
    // 부모 pi-row에 잠금 표시(자물쇠) 클래스
    const row = el.closest('.pi-row');
    if(row){ on ? row.classList.add('pi-row-locked') : row.classList.remove('pi-row-locked'); }
  });

  // 지급유형 토글 버튼 잠금/해제
  _PI_PAY_TYPE_FIELDS.forEach(field=>{
    ['fixed','daily'].forEach(t=>{
      const btn = document.getElementById(`pi-${field}-type-${t}`);
      if(btn){ on ? btn.classList.add('pi-btn-locked') : btn.classList.remove('pi-btn-locked'); }
    });
    // 토글 감싸는 pi-row에도 자물쇠 표시
    const fixedBtn = document.getElementById(`pi-${field}-type-fixed`);
    const row = fixedBtn?.closest('.pi-row');
    if(row){ on ? row.classList.add('pi-row-locked') : row.classList.remove('pi-row-locked'); }
  });
}

function clearPIFields(){
  // pi-dependents는 직원별 고정값이므로 여기서 초기화하지 않음 (clearPI에서만 리셋)
  const _alClearEl = document.getElementById('pi-annual-used'); if(_alClearEl) _alClearEl.value = 0;
  ['pi-base','pi-weekly-hol','pi-position','pi-skill','pi-license','pi-car','pi-self-driving','pi-remote-area','pi-meal','pi-childcare','pi-research',
   'pi-ot-hours','pi-night-hours','pi-hol-hours',
   'pi-annual-pay','pi-bonus','pi-performance','pi-actual-expense','pi-communication','pi-etc-allowance',
   'pi-std-pay','pi-yearend','pi-yearend-memo','pi-health-adj','pi-health-adj-memo','pi-advance','pi-work-days','pi-total-hours',
   'pi-pension-fixed','pi-health-fixed','pi-ltcare-fixed','pi-employ-fixed'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['pi-ot-pay-disp','pi-night-pay-disp','pi-hol-pay-disp',
   'pi-ot-pay-disp-simple','pi-night-pay-disp-simple','pi-hol-pay-disp-simple'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='0원';});
  const _baseDailyEl=document.getElementById('pi-base-daily-disp'); if(_baseDailyEl) _baseDailyEl.textContent='-';
  ['pi-gross-disp','pi-ded-disp','pi-net-disp','pi-gross-disp2','pi-ded-disp2','pi-net-disp2'].forEach(id=>document.getElementById(id).textContent='0원');
  const d1=document.getElementById('pi-ded-detail'); if(d1) d1.innerHTML='';
  const d2=document.getElementById('pi-ded-detail-fixed'); if(d2) d2.innerHTML='';
}
function clearPI(){
  document.getElementById('pi-employee').value='';
  document.getElementById('pi-contract-card').style.display='none';
  const _depEl=document.getElementById('pi-dependents'); if(_depEl) _depEl.value=1;
  const _alBox=document.getElementById('pi-annual-leave-box'); if(_alBox) _alBox.style.display='none';
  // 근로 실적 자동산출 패널 초기화
  const _wp=document.getElementById('pi-work-auto-panel'); if(_wp) _wp.style.display='none';
  const _wi=document.getElementById('pi-contract-work-info'); if(_wi) _wi.style.display='none';
  const _sw=document.getElementById('pi-ot-pay-simple-wrap'); if(_sw) _sw.style.display='none';
  _setPIContractReadonly(false); // 잠금 해제
  piContract=null;clearPIFields();
}
// ─── 수정 모드 상태 ───
let piEditPayrollId = null; // 수정 중인 payroll ID (null이면 신규)

// ─── 임시저장 상태 ───
let piDraftId = null; // 현재 임시저장 레코드 ID (null이면 없음)

// ══════════════════════════════════════════════════════════════════════════════
// _buildPIBody()
//   현재 급여 입력 폼의 값으로 payroll 저장 body 객체를 생성한다.
//   savePI(), savePIDraft() 양쪽에서 공유하는 공통 헬퍼.
// ══════════════════════════════════════════════════════════════════════════════
function _buildPIBody(){
  const empId = document.getElementById('pi-employee').value;
  const coId  = document.getElementById('pi-company').value;
  const yr    = parseInt(document.getElementById('pi-year').value);
  const mo    = parseInt(document.getElementById('pi-month').value);
  calcPI();
  const c = window._piCalc || {};
  return {
    employee_id:     empId,
    company_id:      coId,
    pay_year:        yr,
    pay_month:       mo,
    work_days:       gv('pi-work-days'),
    total_work_hours:gv('pi-total-hours'),
    overtime_hours:  gv('pi-ot-hours'),
    night_hours:     gv('pi-night-hours'),
    holiday_hours:   gv('pi-hol-hours'),
    hourly_wage:     piContract ? piContract.hourly_wage : 0,
    base_salary:     gv('pi-base'),
    weekly_holiday_pay: gv('pi-weekly-hol'),
    position_allowance: gv('pi-position'),
    skill_allowance:    gv('pi-skill')   || 0,
    license_allowance:  gv('pi-license') || 0,
    overtime_pay:    c.otPay    || 0,
    night_pay:       c.nightPay || 0,
    holiday_pay:     c.holPay   || 0,
    transportation_allowance:  gv('pi-car'),
    transportation_pay_type:   _getPIPayTypeVal('car'),
    self_driving_allowance:    gv('pi-self-driving'),
    self_driving_pay_type:     _getPIPayTypeVal('self-driving'),
    remote_area_allowance:     gv('pi-remote-area'),
    remote_area_pay_type:      _getPIPayTypeVal('remote-area'),
    meal_allowance:     gv('pi-meal'),
    meal_pay_type:      _getPIPayTypeVal('meal'),
    childcare_allowance:gv('pi-childcare') || 0,
    research_allowance: gv('pi-research')  || 0,
    annual_leave_used:  parseFloat(document.getElementById('pi-annual-used')?.value || 0) || 0,
    annual_leave_pay:   gv('pi-annual-pay'),
    bonus_pay:          gv('pi-bonus'),
    performance_pay:    gv('pi-performance'),
    actual_expense_pay: gv('pi-actual-expense'),
    communication_pay:  gv('pi-communication'),
    etc_allowance:      gv('pi-etc-allowance'),
    gross_pay:          c.gross     || 0,
    standard_monthly_pay: c.std     || 0,
    income_tax:         c.incomeTax || 0,
    local_income_tax:   c.localTax  || 0,
    health_insurance:   c.health    || 0,
    long_term_care:     c.ltCare    || 0,
    national_pension:   c.pension   || 0,
    employment_insurance: c.empIns  || 0,
    year_end_tax_adjust:  gv('pi-yearend'),
    year_end_tax_adjust_memo: document.getElementById('pi-yearend-memo')?.value || '',
    health_insurance_adjust: gv('pi-health-adj'),
    health_insurance_adjust_memo: document.getElementById('pi-health-adj-memo')?.value || '',
    advance_deduction:  gv('pi-advance'),
    total_deduction:    c.totalDed  || 0,
    net_pay:            c.net       || 0,
    pay_date:           document.getElementById('pi-paydate').value,
    note:               document.getElementById('pi-note').value,
    dependents: Math.max(1, parseInt(document.getElementById('pi-dependents')?.value || '1') || 1),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// savePIDraft()
//   현재 폼 입력값을 is_draft:true 상태로 payrolls 테이블에 저장한다.
//   - 이미 임시저장 레코드가 있으면 PUT (덮어쓰기)
//   - 없으면 POST (신규)
//   - 확정 저장(savePI) 시에는 임시저장이 아니므로 이 함수는 호출하지 않음
// ══════════════════════════════════════════════════════════════════════════════
async function savePIDraft(){
  const empId = document.getElementById('pi-employee').value;
  const yr    = parseInt(document.getElementById('pi-year').value);
  const mo    = parseInt(document.getElementById('pi-month').value);
  if(!empId)   return toast('직원을 선택하세요.', 'error');
  if(!yr || !mo) return toast('년도와 월을 선택하세요.', 'error');

  const btn = document.getElementById('pi-draft-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try {
    const body = {
      ..._buildPIBody(),
      is_draft:       true,
      draft_saved_at: new Date().toISOString(),
    };

    if(piDraftId){
      // ── 기존 임시저장 덮어쓰기 ──
      body.id = piDraftId;
      await api(`../tables/payrolls/${piDraftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      // ── 신규 임시저장 ──
      // 동일 직원·연월에 기존 임시저장이 있으면 재활용
      const existingDraft = allPayrolls.find(
        p => p.employee_id === empId && p.pay_year === yr && p.pay_month === mo && p.is_draft
      );
      if(existingDraft){
        piDraftId = existingDraft.id;
        body.id   = piDraftId;
        await api(`../tables/payrolls/${piDraftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        body.id = 'draft' + Date.now();
        piDraftId = body.id;
        await api('../tables/payrolls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
    }

    // 메모리 갱신
    await loadPayrolls();

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    toast(`✔ ${yr}년 ${mo}월 급여 임시저장 완료 (${timeStr})`, 'success');

    // 임시저장 배너 갱신 (현재 직원 기준)
    _checkAndShowPIDraftBanner(empId, yr, mo);
    // 전체 임시저장 목록 배너 갱신
    renderPIAllDraftBanner();

  } catch(e){
    console.error('[savePIDraft]', e);
    toast('임시저장 중 오류: ' + e.message, 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-floppy-disk"></i> 임시저장'; }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// _checkAndShowPIDraftBanner(empId, yr, mo)
//   직원 + 연월 기준으로 임시저장 레코드가 있는지 확인하고
//   있으면 상단 배너를 표시, 없으면 숨긴다.
//   yr, mo 가 생략되면 현재 선택된 연월로 자동 판단.
// ══════════════════════════════════════════════════════════════════════════════
function _checkAndShowPIDraftBanner(empId, yr, mo){
  const banner   = document.getElementById('pi-draft-banner');
  const subLabel = document.getElementById('pi-draft-banner-sub');
  if(!banner) return;

  const _yr = yr || parseInt(document.getElementById('pi-year')?.value);
  const _mo = mo || parseInt(document.getElementById('pi-month')?.value);
  if(!empId || !_yr || !_mo){ banner.style.display = 'none'; return; }

  // 확정 저장 레코드가 이미 있으면 임시저장 배너 표시 불필요
  const confirmedExists = allPayrolls.some(
    p => p.employee_id === empId && p.pay_year === _yr && p.pay_month === _mo && !p.is_draft
  );
  if(confirmedExists){ banner.style.display = 'none'; return; }

  const draft = allPayrolls.find(
    p => p.employee_id === empId && p.pay_year === _yr && p.pay_month === _mo && p.is_draft
  );
  if(draft){
    piDraftId = draft.id;
    const savedAt = draft.draft_saved_at
      ? new Date(draft.draft_saved_at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })
      : '';
    if(subLabel) subLabel.textContent = `${_yr}년 ${_mo}월분${savedAt ? '  ·  ' + savedAt + ' 저장' : ''}`;
    banner.style.display = 'flex';
  } else {
    piDraftId = null;
    banner.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// loadPIDraft()
//   임시저장 배너의 [불러오기] 버튼 핸들러.
//   piDraftId 레코드의 값을 폼에 채운다.
// ══════════════════════════════════════════════════════════════════════════════
function loadPIDraft(){
  if(!piDraftId) return;
  const draft = allPayrolls.find(p => p.id === piDraftId);
  if(!draft){ toast('임시저장 데이터를 찾을 수 없습니다.', 'error'); return; }

  // 폼 값 복원 (editPayroll 로직과 동일한 패턴)
  setAmountVal('pi-base',          draft.base_salary);
  setAmountVal('pi-weekly-hol',    draft.weekly_holiday_pay);
  setAmountVal('pi-position',      draft.position_allowance);
  setAmountVal('pi-skill',         draft.skill_allowance    || 0);
  setAmountVal('pi-license',       draft.license_allowance  || 0);
  setAmountVal('pi-car',           draft.transportation_allowance || 0);
  setPIPayType('car',              draft.transportation_pay_type  || 'fixed');
  setAmountVal('pi-self-driving',  draft.self_driving_allowance   || 0);
  setPIPayType('self-driving',     draft.self_driving_pay_type    || 'fixed');
  setAmountVal('pi-remote-area',   draft.remote_area_allowance    || 0);
  setPIPayType('remote-area',      draft.remote_area_pay_type     || 'fixed');
  setAmountVal('pi-meal',          draft.meal_allowance);
  setPIPayType('meal',             draft.meal_pay_type  || 'fixed');
  setAmountVal('pi-childcare',     draft.childcare_allowance  || 0);
  setAmountVal('pi-research',      draft.research_allowance   || 0);
  document.getElementById('pi-dependents').value = draft.dependents || 1;
  document.getElementById('pi-ot-hours').value   = draft.overtime_hours || 0;
  document.getElementById('pi-night-hours').value= draft.night_hours    || 0;
  document.getElementById('pi-hol-hours').value  = draft.holiday_hours  || 0;
  const _alUsed = document.getElementById('pi-annual-used');
  if(_alUsed) _alUsed.value = draft.annual_leave_used || 0;
  setAmountVal('pi-annual-pay',    draft.annual_leave_pay);
  setAmountVal('pi-bonus',         draft.bonus_pay         || 0);
  setAmountVal('pi-performance',   draft.performance_pay   || 0);
  setAmountVal('pi-actual-expense',draft.actual_expense_pay|| 0);
  setAmountVal('pi-communication', draft.communication_pay || 0);
  setAmountVal('pi-etc-allowance', draft.etc_allowance     || 0);
  document.getElementById('pi-work-days').value    = draft.work_days        || 0;
  document.getElementById('pi-total-hours').value  = draft.total_work_hours || 0;
  document.getElementById('pi-paydate').value      = draft.pay_date || '';
  document.getElementById('pi-note').value         = draft.note    || '';
  setAmountVal('pi-yearend',       draft.year_end_tax_adjust);
  const _yeMemo = document.getElementById('pi-yearend-memo');
  if(_yeMemo) _yeMemo.value = draft.year_end_tax_adjust_memo || '';
  setAmountVal('pi-health-adj',    draft.health_insurance_adjust);
  const _haMemo = document.getElementById('pi-health-adj-memo');
  if(_haMemo) _haMemo.value = draft.health_insurance_adjust_memo || '';
  setAmountVal('pi-advance',       draft.advance_deduction);
  setAmountVal('pi-std-pay',       draft.standard_monthly_pay);
  // 확정액 기준 고객사 보험료
  const _draftCo = allCompanies.find(x => x.id === draft.company_id);
  if(_draftCo?.insurance_basis === '확정액 기준'){
    setAmountVal('pi-pension-fixed', draft.national_pension);
    setAmountVal('pi-health-fixed',  draft.health_insurance);
    setAmountVal('pi-ltcare-fixed',  draft.long_term_care);
    setAmountVal('pi-employ-fixed',  draft.employment_insurance);
  }

  // 연도·월 복원 (이미 선택되어 있어야 하나 혹시 모를 경우 대비)
  if(draft.pay_year)  document.getElementById('pi-year').value  = draft.pay_year;
  if(draft.pay_month) document.getElementById('pi-month').value = draft.pay_month;

  calcAnnualLeaveTable();
  calcPI();

  // 배너 숨김 (불러온 뒤에는 더 이상 안내 불필요)
  const banner = document.getElementById('pi-draft-banner');
  if(banner) banner.style.display = 'none';

  const emp = allEmployees.find(e => e.id === draft.employee_id) || {};
  toast(`✔ ${draft.pay_year}년 ${draft.pay_month}월 임시저장 내용을 불러왔습니다.\n확인 후 [급여 저장]을 눌러 최종 저장하세요.`, 'info');
}

// ══════════════════════════════════════════════════════════════════════════════
// discardPIDraft()
//   임시저장 배너의 [삭제] 버튼 핸들러.
//   DB에서 임시저장 레코드를 삭제하고 배너를 숨긴다.
// ══════════════════════════════════════════════════════════════════════════════
async function discardPIDraft(){
  if(!piDraftId) return;
  if(!confirm('임시저장된 급여 입력을 삭제하시겠습니까?')) return;
  try {
    await api(`../tables/payrolls/${piDraftId}`, { method: 'DELETE' });
    piDraftId = null;
    await loadPayrolls();
    const banner = document.getElementById('pi-draft-banner');
    if(banner) banner.style.display = 'none';
    // 전체 임시저장 목록 배너 갱신
    renderPIAllDraftBanner();
    toast('임시저장이 삭제되었습니다.', 'info');
  } catch(e){
    toast('삭제 중 오류: ' + e.message, 'error');
  }
}

async function savePI(){
  const empId=document.getElementById('pi-employee').value;
  const coId=document.getElementById('pi-company').value;
  const yr=parseInt(document.getElementById('pi-year').value);
  const mo=parseInt(document.getElementById('pi-month').value);
  if(!empId) return toast('직원을 선택하세요.','error');
  if(!yr||!mo) return toast('년도와 월을 선택하세요.','error');

  // ── 수습 만료일 초과 최종 차단 (저장 버튼이 우회된 경우 대비 이중 방어) ──
  {
    const _probResult = _checkPIProbationOverrun();
    if(_probResult === true){
      // 케이스①: 월 전체 초과 → 채용확정 계약 자동 생성 버튼을 사용하도록 안내
      const probEndStr = _calcProbationEndDate(piContract);
      const fmtD = d => d ? `${d.slice(0,4)}년 ${d.slice(5,7)}월 ${d.slice(8,10)}일` : '-';
      toast(
        `수습 만료일(${fmtD(probEndStr)})이 지난 달입니다.\n` +
        `상단 배너의 [채용확정 계약 자동 생성 후 저장] 버튼을 사용하세요.`,
        'error'
      );
      return;
    }
    if(_probResult === 'split'){
      // 케이스②: 월 중간 분리 → 분리 저장 버튼을 사용하도록 안내
      toast(
        `이 달은 수습 기간과 채용확정 기간이 혼재합니다.\n` +
        `상단 배너의 [수습 / 채용확정 분리 저장] 버튼을 사용하세요.`,
        'error'
      );
      return;
    }
  }

  // ── 산정기준 등록 여부 검증 ──
  const _stdCheck = _checkPIStandardsReady(yr, mo, coId || currentGlobalCompanyId);
  if(!_stdCheck.ok){
    _showPIStandardsWarn(yr, mo, _stdCheck.missing);
    return;
  }
  // ── 계약 유효성 검증 ──
  if(!piContract){
    return toast('유효한 근로계약서가 없습니다. 계약서를 먼저 등록·완료해 주세요.','error');
  }
  if(piContract.is_draft){
    return toast('근로계약서가 임시저장 상태입니다. 계약서 등록을 완료한 후 급여를 입력해 주세요.','error');
  }
  // ── 보험요율 캐시 로드 여부 확인 (백그라운드 로드가 아직 완료되지 않은 경우 방어) ──
  if(_allInsuranceRates.length === 0 && _getPIInsuranceBasis() === '요율 기준'){
    try {
      await loadStandards();
    } catch(e){ console.warn('[savePI] loadStandards 재시도 실패', e); }
  }
  calcPI();
  const c=window._piCalc||{};
  // ── _piCalc 결과 검증: 요율 기준인데 공제가 모두 0이면 경고 ──
  const _isRateBasis = _getPIInsuranceBasis() === '요율 기준';
  if(_isRateBasis && c.gross > 0 && !(c.pension > 0 || c.health > 0 || c.incomeTax > 0)){
    const _cont = confirm('⚠️ 공제항목이 계산되지 않았습니다.\n보험요율 산정기준을 다시 확인해 주세요.\n\n그래도 저장하시겠습니까?');
    if(!_cont) return;
  }
  const body={employee_id:empId,company_id:coId,pay_year:yr,pay_month:mo,work_days:gv('pi-work-days'),total_work_hours:gv('pi-total-hours'),overtime_hours:gv('pi-ot-hours'),night_hours:gv('pi-night-hours'),holiday_hours:gv('pi-hol-hours'),hourly_wage:piContract?piContract.hourly_wage:0,base_salary:gv('pi-base'),weekly_holiday_pay:gv('pi-weekly-hol'),position_allowance:gv('pi-position'),skill_allowance:gv('pi-skill'),license_allowance:gv('pi-license'),overtime_pay:c.otPay||0,night_pay:c.nightPay||0,holiday_pay:c.holPay||0,transportation_allowance:gv('pi-car'),transportation_pay_type:_getPIPayTypeVal('car'),self_driving_allowance:gv('pi-self-driving'),self_driving_pay_type:_getPIPayTypeVal('self-driving'),remote_area_allowance:gv('pi-remote-area'),remote_area_pay_type:_getPIPayTypeVal('remote-area'),meal_allowance:gv('pi-meal'),meal_pay_type:_getPIPayTypeVal('meal'),childcare_allowance:gv('pi-childcare'),research_allowance:gv('pi-research'),annual_leave_used:parseFloat(document.getElementById('pi-annual-used')?.value||0)||0,annual_leave_pay:gv('pi-annual-pay'),bonus_pay:gv('pi-bonus'),performance_pay:gv('pi-performance'),actual_expense_pay:gv('pi-actual-expense'),communication_pay:gv('pi-communication'),etc_allowance:gv('pi-etc-allowance'),gross_pay:c.gross||0,standard_monthly_pay:c.std||0,income_tax:c.incomeTax||0,local_income_tax:c.localTax||0,health_insurance:c.health||0,long_term_care:c.ltCare||0,national_pension:c.pension||0,employment_insurance:c.empIns||0,year_end_tax_adjust:gv('pi-yearend'),year_end_tax_adjust_memo:document.getElementById('pi-yearend-memo').value||'',health_insurance_adjust:gv('pi-health-adj'),health_insurance_adjust_memo:document.getElementById('pi-health-adj-memo').value||'',advance_deduction:gv('pi-advance'),total_deduction:c.totalDed||0,net_pay:c.net||0,pay_date:document.getElementById('pi-paydate').value,note:document.getElementById('pi-note').value,dependents:Math.max(1,parseInt(document.getElementById('pi-dependents')?.value||'1')||1)};
  if(piEditPayrollId){
    // ── 수정 모드: PUT ──
    await api(`../tables/payrolls/${piEditPayrollId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 임시저장 레코드 정리 (수정 모드에서 임시저장 후 확정 저장 시 고아 레코드 방지) ──
    if(piDraftId){
      try { await api(`../tables/payrolls/${piDraftId}`,{method:'DELETE'}); } catch(e){}
      piDraftId = null;
    } else {
      const orphanDraft = allPayrolls.find(p=>p.employee_id===empId&&Number(p.pay_year)===yr&&Number(p.pay_month)===mo&&!!p.is_draft);
      if(orphanDraft){ try{ await api(`../tables/payrolls/${orphanDraft.id}`,{method:'DELETE'}); }catch(e){} }
    }
    // 임시저장 배너 숨김
    const _editDraftBanner = document.getElementById('pi-draft-banner');
    if(_editDraftBanner) _editDraftBanner.style.display = 'none';
    renderPIAllDraftBanner();
    await loadPayrolls();renderPayrolls();renderDashboard();
    toast(`${yr}년 ${mo}월 급여가 수정되었습니다`,'success');
    cancelEditPayroll();
    // 임금대장 완성 여부 체크 (수정 후에도 다시 판단)
    await _checkWageLedgerComplete(coId, yr, mo);

    // ── 고객사 인앱 알림 발송 (급여 수정 완료) ──
    {
      const _piCo  = allCompanies.find(x => x.id === coId) || {};
      const _piEmp = allEmployees.find(x => x.id === empId) || {};
      const _coRep = _piCo.representative ? `, ${_piCo.representative} 사장님` : '';
      if(coId){
        await _sendCompanyNotice({
          companyId  : coId, companyName: _piCo.company_name || '',
          noticeType : 'payroll_input_complete',
          title      : `[급여 수정] ${_piEmp.name||''} — ${yr}년 ${mo}월 급여명세서가 수정되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 급여 내역이 수정되어 급여명세서를 앱에서 다시 확인하실 수 있습니다.

■ 근로자: ${_piEmp.name||''}
■ 지급 기간: ${yr}년 ${mo}월
■ 실수령액: ${(body.net_pay||0).toLocaleString('ko-KR')}원
■ 지급일: ${body.pay_date||'-'}
■ 수정 일시: ${new Date().toLocaleString('ko-KR')}

고객사 앱의 급여명세서 메뉴에서 수정된 상세 내역을 확인하세요.`,
          employeeId  : empId, employeeName: _piEmp.name || '',
        });
      }
    }
  } else {
    // ── 신규 모드: POST ──
    // 확정 저장 레코드(is_draft=false) 중복 체크 (임시저장 레코드는 제외)
    const dup=allPayrolls.find(p=>p.employee_id===empId&&p.pay_year===yr&&p.pay_month===mo&&!p.is_draft);
    if(dup){if(!confirm(`${yr}년 ${mo}월 급여가 이미 존재합니다. 덮어쓰시겠습니까?`)) return;await api(`../tables/payrolls/${dup.id}`,{method:'DELETE'});}
    // ── 임시저장 레코드가 있으면 먼저 삭제 (확정 저장으로 대체) ──
    if(piDraftId){
      try { await api(`../tables/payrolls/${piDraftId}`,{method:'DELETE'}); } catch(e){}
      piDraftId = null;
    } else {
      // piDraftId가 없어도 혹시 남은 임시저장 레코드가 있으면 삭제
      const orphanDraft = allPayrolls.find(p=>p.employee_id===empId&&p.pay_year===yr&&p.pay_month===mo&&p.is_draft);
      if(orphanDraft){ try{ await api(`../tables/payrolls/${orphanDraft.id}`,{method:'DELETE'}); }catch(e){} }
    }
    body.id='pay'+Date.now();
    await api('../tables/payrolls',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    await loadPayrolls();renderPayrolls();renderDashboard();toast(`${yr}년 ${mo}월 급여 저장됨`);
    // 임시저장 배너 숨김
    const _draftBannerEl = document.getElementById('pi-draft-banner');
    if(_draftBannerEl) _draftBannerEl.style.display = 'none';
    // 전체 임시저장 목록 배너 갱신
    renderPIAllDraftBanner();
    // 임금대장 완성 여부 체크 (신규 저장 후 판단)
    await _checkWageLedgerComplete(coId, yr, mo);

    // ── 고객사 인앱 알림 발송 (급여 입력 완료 — 개별 건) ──
    {
      const _piCo  = allCompanies.find(x => x.id === coId) || {};
      const _piEmp = allEmployees.find(x => x.id === empId) || {};
      const _coRep = _piCo.representative ? `, ${_piCo.representative} 사장님` : '';
      if(coId){
        await _sendCompanyNotice({
          companyId  : coId, companyName: _piCo.company_name || '',
          noticeType : 'payroll_input_complete',
          title      : `[급여 입력] ${_piEmp.name||''} — ${yr}년 ${mo}월 급여명세서를 확인하세요`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 급여가 입력되어 급여명세서를 앱에서 확인하실 수 있습니다.

■ 근로자: ${_piEmp.name||''}
■ 지급 기간: ${yr}년 ${mo}월
■ 실수령액: ${(body.net_pay||0).toLocaleString('ko-KR')}원
■ 지급일: ${body.pay_date||'-'}
■ 입력 일시: ${new Date().toLocaleString('ko-KR')}

고객사 앱의 급여명세서 메뉴에서 상세 내역을 확인하세요.`,
          employeeId  : empId, employeeName: _piEmp.name || '',
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// _autoCreateConfirmedContract(probEndDate)
//   수습 계약(piContract)을 기반으로 채용확정 근로계약서를 자동 생성한다.
//
//   - contract_type : 정규직 수습 → 정규직, 계약직 수습 → 계약직
//   - probation_* 필드 초기화 (0 / '')
//   - contract_start = probEnd + 1일
//   - contract_end   = 계약직인 경우 기존 contract_end 유지, 정규직이면 빈값
//   - status = '서류미비' (날인본 미첨부 상태로 생성)
//   - amended_from = piContract.id (원본 수습 계약 참조)
//   - POST /tables/contracts
//   - PATCH /tables/employees/:id { employment_category: 변경된 유형 }
//   - allContracts / allEmployees 갱신
//   반환: 생성된 계약 객체 (실패 시 throw)
// ═══════════════════════════════════════════════════════════════════════════════
async function _autoCreateConfirmedContract(probEndDate){
  if(!piContract) throw new Error('piContract가 없습니다.');

  // 채용확정 고용형태 결정
  const confirmedType = piContract.contract_type === '정규직 수습' ? '정규직' : '계약직';

  // 계약 시작일 = 수습 만료일 + 1일
  const probEndObj   = new Date(probEndDate);
  const newStartObj  = new Date(probEndObj);
  newStartObj.setDate(newStartObj.getDate() + 1);
  const newStart = newStartObj.toISOString().slice(0,10);

  // 계약 종료일: 계약직이면 기존 contract_end 유지, 정규직이면 빈값
  const newEnd = confirmedType === '계약직' ? (piContract.contract_end || '') : '';

  // 신규 계약 body (piContract 전 필드 복사 후 변경)
  const newContractBody = {
    id: 'cont' + Date.now(),
    employee_id:             piContract.employee_id,
    company_id:              piContract.company_id,
    contract_start:          newStart,
    contract_end:            newEnd,
    contract_type:           confirmedType,
    status:                  '서류미비',
    // ── 수습 필드 초기화 ──
    probation_months:        0,
    probation_pct:           0,
    probation_amt:           0,
    probation_basis:         'salary',
    // ── 임금 관련: 기존 수습 계약에서 그대로 복사 ──
    work_hours_per_day:      piContract.work_hours_per_day      || 0,
    work_days_per_week:      piContract.work_days_per_week      || 0,
    work_days_per_month:     piContract.work_days_per_month     || 0,
    schedule_json:           piContract.schedule_json           || '',
    break_time:              piContract.break_time              || 0,
    hourly_wage:             piContract.hourly_wage             || 0,
    annual_salary:           piContract.annual_salary           || 0,
    monthly_salary_agreed:   piContract.monthly_salary_agreed   || 0,
    base_salary:             piContract.base_salary             || 0,
    daily_wage:              piContract.daily_wage              || 0,
    weekly_holiday_pay:      piContract.weekly_holiday_pay      || 0,
    position_allowance:      piContract.position_allowance      || 0,
    skill_allowance:         piContract.skill_allowance         || 0,
    license_allowance:       piContract.license_allowance       || 0,
    transportation_allowance:piContract.transportation_allowance|| 0,
    transportation_pay_type: piContract.transportation_pay_type || 'fixed',
    self_driving_allowance:  piContract.self_driving_allowance  || 0,
    self_driving_pay_type:   piContract.self_driving_pay_type   || 'fixed',
    remote_area_allowance:   piContract.remote_area_allowance   || 0,
    remote_area_pay_type:    piContract.remote_area_pay_type    || 'fixed',
    car_maintenance:         piContract.car_maintenance         || 0,
    meal_allowance:          piContract.meal_allowance          || 0,
    meal_pay_type:           piContract.meal_pay_type           || 'fixed',
    childcare_allowance:     piContract.childcare_allowance     || 0,
    research_allowance:      piContract.research_allowance      || 0,
    other_allowance:         piContract.other_allowance         || 0,
    annual_leave_days:       piContract.annual_leave_days       || 0,
    salary_start_date:       newStart,
    salary_end_date:         newEnd,
    insurance_employment:    piContract.insurance_employment    ?? true,
    insurance_industrial:    piContract.insurance_industrial    ?? true,
    insurance_pension:       piContract.insurance_pension       ?? true,
    insurance_health:        piContract.insurance_health        ?? true,
    note:                    `[자동 생성] 수습 계약(${piContract.id}) 만료 후 채용확정 계약서. 수습 종료일: ${probEndDate}`,
    amended_from:            piContract.id,
    is_draft:                false,
    is_voided_by_amend:      false,
    signed_file_name:        '',
    signed_file_data:        '',
    consent_file_name:       '',
    consent_file_data:       '',
  };

  // 계약서 POST
  const savedContract = await api('../tables/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newContractBody)
  });

  // 직원 고용형태 PATCH
  await api(`../tables/employees/${piContract.employee_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employment_category: confirmedType })
  });

  // 메모리 갱신
  await loadContracts();
  await loadEmployees();

  return savedContract.id ? savedContract : { ...newContractBody, ...savedContract };
}

// ═══════════════════════════════════════════════════════════════════════════════
// savePISplit()
//   케이스② (월 중간 수습 만료): 수습 기간 payroll + 채용확정 기간 payroll 2건을 생성하고
//   채용확정 계약서를 자동으로 생성·갱신한다.
//
//   처리 순서:
//   1. 입력값 검증
//   2. _autoCreateConfirmedContract(probEnd) 호출 → 신규 계약 생성
//   3. 수습 기간 payroll body 생성 (현재 폼 값 × 수습 근로일수 비율, note에 수습 기간 명시)
//   4. 채용확정 기간 payroll body 생성 (신규 계약 기준, note에 채용확정 기간 명시)
//   5. 두 건 POST
//   6. allPayrolls 갱신, UI 반영
// ═══════════════════════════════════════════════════════════════════════════════
async function savePISplit(){
  const saveBtn = document.getElementById('pi-prob-split-save-btn');
  if(saveBtn && saveBtn.disabled) return;

  const empId = document.getElementById('pi-employee').value;
  const coId  = document.getElementById('pi-company').value;
  const yr    = parseInt(document.getElementById('pi-year').value);
  const mo    = parseInt(document.getElementById('pi-month').value);
  if(!empId || !yr || !mo) return toast('직원·연월을 확인하세요.', 'error');
  if(!piContract) return toast('활성 계약서가 없습니다.', 'error');

  // 수습 만료일
  const probEnd = _calcProbationEndDate(piContract);
  if(!probEnd) return toast('수습 만료일을 계산할 수 없습니다.', 'error');

  // 채용확정 기간 시작일
  const postStartObj = new Date(probEnd);
  postStartObj.setDate(postStartObj.getDate() + 1);
  const postStart = postStartObj.toISOString().slice(0, 10);

  // 해당 월 말일
  const lastDay  = new Date(yr, mo, 0).getDate();
  const monthEnd = `${yr}-${String(mo).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  const monthStart = `${yr}-${String(mo).padStart(2,'0')}-01`;

  // 분리 입력 값
  const wdProb = parseFloat(document.getElementById('pi-prob-wd-prob').value) || 0;
  const whProb = parseFloat(document.getElementById('pi-prob-wh-prob').value) || 0;
  const wdPost = parseFloat(document.getElementById('pi-prob-wd-post').value) || 0;
  const whPost = parseFloat(document.getElementById('pi-prob-wh-post').value) || 0;

  if(wdProb <= 0 && wdPost <= 0){
    return toast('근로일수를 입력하세요.', 'error');
  }

  // 현재 폼 계산값
  calcPI();
  const c = window._piCalc || {};

  // 전체 지급·공제 비율 계산 (일수 기준)
  const totalWd  = parseFloat(document.getElementById('pi-work-days').value || 0) || (wdProb + wdPost);
  const totalWh  = parseFloat(document.getElementById('pi-total-hours').value || 0) || (whProb + whPost);
  const ratioProb = totalWd > 0 ? wdProb / totalWd : 0.5;
  const ratioPost = totalWd > 0 ? wdPost / totalWd : 0.5;

  const round0 = v => Math.round(v || 0);
  const fmtNote = d => d ? `${d.slice(0,4)}년 ${d.slice(5,7)}월 ${d.slice(8,10)}일` : '-';

  // ── 공통 payroll 필드 헬퍼 ──
  const baseBody = {
    employee_id:     empId,
    company_id:      coId,
    pay_year:        yr,
    pay_month:       mo,
    pay_date:        document.getElementById('pi-paydate').value,
    dependents:      Math.max(1, parseInt(document.getElementById('pi-dependents')?.value || '1') || 1),
    annual_leave_used: 0,
    annual_leave_pay:  0,
    overtime_hours:    0, night_hours: 0, holiday_hours: 0,
    overtime_pay: 0, night_pay: 0, holiday_pay: 0,
    bonus_pay: 0, performance_pay: 0, actual_expense_pay: 0,
    communication_pay: 0, etc_allowance: 0,
    year_end_tax_adjust: 0, year_end_tax_adjust_memo: '',
    health_insurance_adjust: 0, health_insurance_adjust_memo: '',
    advance_deduction: 0,
    standard_monthly_pay: round0(c.std),
  };

  // ── 수습 기간 payroll ──
  // 수습 임금: probation_amt 또는 기본급 × probation_pct/100 (계약서 기준)
  const probAmt  = parseFloat(piContract.probation_amt) || 0;
  const probBase = probAmt > 0 ? round0(probAmt * ratioProb) : round0((gv('pi-base')) * ratioProb);
  const probProbRatio = wdProb / (wdProb + wdPost || 1);

  const bodyProb = {
    ...baseBody,
    id:                'pay' + Date.now() + 'p',
    hourly_wage:       piContract.hourly_wage || 0,
    work_days:         wdProb,
    total_work_hours:  whProb,
    base_salary:       probBase,
    weekly_holiday_pay: round0((piContract.weekly_holiday_pay || 0) * ratioProb),
    position_allowance: round0((gv('pi-position')) * ratioProb),
    skill_allowance:    round0((gv('pi-skill') || 0) * ratioProb),
    license_allowance:  round0((gv('pi-license') || 0) * ratioProb),
    transportation_allowance: round0((gv('pi-car')) * ratioProb),
    transportation_pay_type: _getPIPayTypeVal('car'),
    self_driving_allowance:  round0((gv('pi-self-driving')) * ratioProb),
    self_driving_pay_type:   _getPIPayTypeVal('self-driving'),
    remote_area_allowance:   round0((gv('pi-remote-area')) * ratioProb),
    remote_area_pay_type:    _getPIPayTypeVal('remote-area'),
    meal_allowance:    round0((gv('pi-meal')) * ratioProb),
    meal_pay_type:     _getPIPayTypeVal('meal'),
    childcare_allowance: round0((gv('pi-childcare') || 0) * ratioProb),
    research_allowance:  round0((gv('pi-research') || 0) * ratioProb),
    gross_pay:         round0((c.gross || 0) * ratioProb),
    income_tax:        round0((c.incomeTax || 0) * ratioProb),
    local_income_tax:  round0((c.localTax || 0) * ratioProb),
    health_insurance:  round0((c.health || 0) * ratioProb),
    long_term_care:    round0((c.ltCare || 0) * ratioProb),
    national_pension:  round0((c.pension || 0) * ratioProb),
    employment_insurance: round0((c.empIns || 0) * ratioProb),
    total_deduction:   round0((c.totalDed || 0) * ratioProb),
    net_pay:           round0((c.net || 0) * ratioProb),
    note: `[수습 기간] ${fmtNote(monthStart)} ~ ${fmtNote(probEnd)} (${wdProb}일 / ${whProb}h)\n` +
          `수습 계약(${piContract.contract_type}) 기준 — 계약ID: ${piContract.id}`,
  };

  // 버튼 비활성
  if(saveBtn){ saveBtn.disabled = true; saveBtn.textContent = '처리 중...'; }

  try {
    // ── 1단계: 채용확정 계약 자동 생성 ──
    toast('채용확정 계약서 자동 생성 중...', 'info');
    const confirmedContract = await _autoCreateConfirmedContract(probEnd);
    const confirmedType = piContract.contract_type === '정규직 수습' ? '정규직' : '계약직';

    // ── 2단계: 채용확정 기간 payroll ──
    // 채용확정 계약 기준 임금으로 별도 계산
    // (확정 계약의 monthly_salary_agreed × 비율 — 단순 비율 적용)
    const postMonthly = confirmedContract.monthly_salary_agreed || piContract.monthly_salary_agreed || 0;
    const postBase    = round0((confirmedContract.base_salary || piContract.base_salary || 0) * ratioPost);

    const bodyPost = {
      ...baseBody,
      id:                'pay' + (Date.now() + 1) + 'c',
      hourly_wage:       confirmedContract.hourly_wage || piContract.hourly_wage || 0,
      work_days:         wdPost,
      total_work_hours:  whPost,
      base_salary:       postBase,
      weekly_holiday_pay: round0((confirmedContract.weekly_holiday_pay || piContract.weekly_holiday_pay || 0) * ratioPost),
      position_allowance: round0((confirmedContract.position_allowance || gv('pi-position')) * ratioPost),
      skill_allowance:    round0((confirmedContract.skill_allowance || 0) * ratioPost),
      license_allowance:  round0((confirmedContract.license_allowance || 0) * ratioPost),
      transportation_allowance: round0((confirmedContract.transportation_allowance || gv('pi-car')) * ratioPost),
      transportation_pay_type: confirmedContract.transportation_pay_type || 'fixed',
      self_driving_allowance:  round0((confirmedContract.self_driving_allowance || 0) * ratioPost),
      self_driving_pay_type:   confirmedContract.self_driving_pay_type || 'fixed',
      remote_area_allowance:   round0((confirmedContract.remote_area_allowance || 0) * ratioPost),
      remote_area_pay_type:    confirmedContract.remote_area_pay_type || 'fixed',
      meal_allowance:    round0((confirmedContract.meal_allowance || gv('pi-meal')) * ratioPost),
      meal_pay_type:     confirmedContract.meal_pay_type || 'fixed',
      childcare_allowance: round0((confirmedContract.childcare_allowance || 0) * ratioPost),
      research_allowance:  round0((confirmedContract.research_allowance || 0) * ratioPost),
      gross_pay:         round0((c.gross || 0) * ratioPost),
      income_tax:        round0((c.incomeTax || 0) * ratioPost),
      local_income_tax:  round0((c.localTax || 0) * ratioPost),
      health_insurance:  round0((c.health || 0) * ratioPost),
      long_term_care:    round0((c.ltCare || 0) * ratioPost),
      national_pension:  round0((c.pension || 0) * ratioPost),
      employment_insurance: round0((c.empIns || 0) * ratioPost),
      total_deduction:   round0((c.totalDed || 0) * ratioPost),
      net_pay:           round0((c.net || 0) * ratioPost),
      note: `[채용확정 기간] ${fmtNote(postStart)} ~ ${fmtNote(monthEnd)} (${wdPost}일 / ${whPost}h)\n` +
            `${confirmedType} 계약 기준 — 계약ID: ${confirmedContract.id}`,
    };

    // ── 3단계: 기존 같은 월 급여 중복 검사 ──
    const dupList = allPayrolls.filter(p => p.employee_id === empId && p.pay_year === yr && p.pay_month === mo);
    if(dupList.length > 0){
      const empName = (allEmployees.find(e => e.id === empId) || {}).name || '';
      if(!confirm(`${yr}년 ${mo}월 기존 급여 ${dupList.length}건이 있습니다.\n삭제 후 수습/채용확정 2건으로 교체하시겠습니까?\n(${empName})`)) {
        if(saveBtn){ saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-cut"></i> 수습 / 채용확정 분리 저장 (2건)'; }
        return;
      }
      for(const dup of dupList){
        await api(`../tables/payrolls/${dup.id}`, { method: 'DELETE' });
      }
    }

    // ── 4단계: 두 건 POST ──
    toast('수습 기간 급여 저장 중...', 'info');
    await api('../tables/payrolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyProb)
    });
    toast('채용확정 기간 급여 저장 중...', 'info');
    await api('../tables/payrolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPost)
    });

    // ── 5단계: 메모리 갱신 및 UI 반영 ──
    await loadPayrolls();
    renderPayrolls();
    renderDashboard();

    const emp = allEmployees.find(e => e.id === empId) || {};
    toast(`✔ ${yr}년 ${mo}월 급여 분리 저장 완료!\n수습 기간(${wdProb}일) + 채용확정 기간(${wdPost}일)\n고용형태: ${confirmedType}으로 변경됨`, 'success');

    // piContract 갱신 (새로 생성된 채용확정 계약으로 교체)
    piContract = allContracts.find(c => c.id === confirmedContract.id) || confirmedContract;

    // 케이스② 배너 숨김 (처리 완료)
    const banner = document.getElementById('pi-prob-overrun-banner');
    if(banner) banner.style.display = 'none';
    _setPIInputLocked(false);

    // 임금대장 완성 여부 체크
    await _checkWageLedgerComplete(coId, yr, mo);

  } catch(e){
    console.error('[savePISplit]', e);
    toast('분리 저장 중 오류가 발생했습니다: ' + e.message, 'error');
  } finally {
    if(saveBtn){
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-cut"></i> 수습 / 채용확정 분리 저장 (2건)';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// _probAutoCreateAndSave()
//   케이스① (해당 월 전체가 수습 만료 이후): 채용확정 계약서를 자동 생성하고
//   현재 폼에 입력된 급여를 채용확정 계약 기준으로 저장한다.
// ═══════════════════════════════════════════════════════════════════════════════
async function _probAutoCreateAndSave(){
  const empId = document.getElementById('pi-employee').value;
  const coId  = document.getElementById('pi-company').value;
  const yr    = parseInt(document.getElementById('pi-year').value);
  const mo    = parseInt(document.getElementById('pi-month').value);
  if(!empId || !yr || !mo) return toast('직원·연월을 확인하세요.', 'error');
  if(!piContract) return toast('활성 계약서가 없습니다.', 'error');

  const probEnd = _calcProbationEndDate(piContract);
  if(!probEnd) return toast('수습 만료일을 계산할 수 없습니다.', 'error');

  const confirmedType = piContract.contract_type === '정규직 수습' ? '정규직' : '계약직';

  const confirmMsg =
    `수습 계약(${piContract.contract_type})을 기반으로\n` +
    `채용확정 근로계약서(${confirmedType})를 자동 생성하고\n` +
    `${yr}년 ${mo}월 급여를 저장합니다.\n\n` +
    `· 수습 종료일: ${probEnd}\n` +
    `· 신규 계약 시작일: ${(()=>{ const d=new Date(probEnd); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })()}\n\n` +
    `계속하시겠습니까?`;
  if(!confirm(confirmMsg)) return;

  const autoBtn = document.querySelector('#pi-prob-case1-panel button[onclick="_probAutoCreateAndSave()"]');
  if(autoBtn){ autoBtn.disabled = true; autoBtn.textContent = '처리 중...'; }

  try {
    // ── 1단계: 채용확정 계약 자동 생성 ──
    toast('채용확정 계약서 자동 생성 중...', 'info');
    const confirmedContract = await _autoCreateConfirmedContract(probEnd);

    // ── 2단계: piContract를 새 계약으로 교체 후 급여 저장 ──
    // 폼 값은 그대로 유지, piContract만 교체 → savePI() 내부에서 중복·산정 검증 통과 후 저장
    piContract = allContracts.find(c => c.id === confirmedContract.id) || confirmedContract;

    // 배너 숨김 (계약 변경으로 더 이상 케이스① 아님)
    const banner = document.getElementById('pi-prob-overrun-banner');
    if(banner) banner.style.display = 'none';
    _setPIInputLocked(false);

    // ── 3단계: 계약 정보 UI 갱신 ──
    // contract-card 재렌더링
    const card = document.getElementById('pi-contract-card');
    if(card && piContract){
      const infoEl = document.getElementById('pi-contract-info');
      if(infoEl){
        infoEl.innerHTML =
          `<b>고용형태 변경:</b> <span style="color:#7c3aed;font-weight:700;">${confirmedType}</span> (자동 생성)<br>` +
          `<b>연봉:</b> ${(piContract.annual_salary||0).toLocaleString('ko-KR')}원<br>` +
          `<b>월 약정임금:</b> ${(piContract.monthly_salary_agreed||0).toLocaleString('ko-KR')}원<br>` +
          `<b>계약 시작일:</b> ${piContract.contract_start}<br>` +
          `<span style="color:#16a34a;font-size:11px;">✔ 채용확정 계약서가 생성되었습니다 (서류미비 상태 — 날인본 별도 첨부 필요)</span>`;
      }
    }

    toast(`채용확정 계약서 생성 완료 (${confirmedType})\n이제 급여를 저장합니다...`, 'info');

    // ── 4단계: 급여 저장 (savePI 호출) ──
    // 산정기준 체크 먼저
    const stdCheck = _checkPIStandardsReady(yr, mo, coId || currentGlobalCompanyId);
    if(!stdCheck.ok){
      _showPIStandardsWarn(yr, mo, stdCheck.missing);
      return;
    }
    calcPI();
    const c = window._piCalc || {};

    const payBody = {
      id:              'pay' + Date.now(),
      employee_id:     empId,
      company_id:      coId,
      pay_year:        yr,
      pay_month:       mo,
      work_days:       gv('pi-work-days'),
      total_work_hours:gv('pi-total-hours'),
      overtime_hours:  gv('pi-ot-hours'),
      night_hours:     gv('pi-night-hours'),
      holiday_hours:   gv('pi-hol-hours'),
      hourly_wage:     piContract.hourly_wage || 0,
      base_salary:     gv('pi-base'),
      weekly_holiday_pay: gv('pi-weekly-hol'),
      position_allowance: gv('pi-position'),
      skill_allowance:    gv('pi-skill')   || 0,
      license_allowance:  gv('pi-license') || 0,
      overtime_pay:    c.otPay    || 0,
      night_pay:       c.nightPay || 0,
      holiday_pay:     c.holPay   || 0,
      transportation_allowance:  gv('pi-car'),
      transportation_pay_type:   _getPIPayTypeVal('car'),
      self_driving_allowance:    gv('pi-self-driving'),
      self_driving_pay_type:     _getPIPayTypeVal('self-driving'),
      remote_area_allowance:     gv('pi-remote-area'),
      remote_area_pay_type:      _getPIPayTypeVal('remote-area'),
      meal_allowance:     gv('pi-meal'),
      meal_pay_type:      _getPIPayTypeVal('meal'),
      childcare_allowance:gv('pi-childcare') || 0,
      research_allowance: gv('pi-research')  || 0,
      annual_leave_used:  parseFloat(document.getElementById('pi-annual-used')?.value||0)||0,
      annual_leave_pay:   gv('pi-annual-pay'),
      bonus_pay:          gv('pi-bonus'),
      performance_pay:    gv('pi-performance'),
      actual_expense_pay: gv('pi-actual-expense'),
      communication_pay:  gv('pi-communication'),
      etc_allowance:      gv('pi-etc-allowance'),
      gross_pay:          c.gross     || 0,
      standard_monthly_pay: c.std     || 0,
      income_tax:         c.incomeTax || 0,
      local_income_tax:   c.localTax  || 0,
      health_insurance:   c.health    || 0,
      long_term_care:     c.ltCare    || 0,
      national_pension:   c.pension   || 0,
      employment_insurance: c.empIns  || 0,
      year_end_tax_adjust:  gv('pi-yearend'),
      year_end_tax_adjust_memo: document.getElementById('pi-yearend-memo').value || '',
      health_insurance_adjust: gv('pi-health-adj'),
      health_insurance_adjust_memo: document.getElementById('pi-health-adj-memo').value || '',
      advance_deduction:  gv('pi-advance'),
      total_deduction:    c.totalDed  || 0,
      net_pay:            c.net       || 0,
      pay_date:           document.getElementById('pi-paydate').value,
      note: `[채용확정] 수습 만료(${probEnd}) 이후 채용확정 계약 기준 저장.\n` +
            (document.getElementById('pi-note').value || ''),
      dependents: Math.max(1, parseInt(document.getElementById('pi-dependents')?.value||'1')||1),
    };

    // 중복 체크 (임시저장 레코드 제외)
    const dup = allPayrolls.find(p => !p.is_draft && p.employee_id === empId && p.pay_year === yr && p.pay_month === mo);
    if(dup){
      if(!confirm(`${yr}년 ${mo}월 급여가 이미 존재합니다. 덮어쓰시겠습니까?`)) return;
      await api(`../tables/payrolls/${dup.id}`, { method: 'DELETE' });
    }
    // 임시저장 레코드가 있으면 삭제
    if(piDraftId){ try{ await api(`../tables/payrolls/${piDraftId}`,{method:'DELETE'}); }catch(e){} piDraftId=null; }

    await api('../tables/payrolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payBody)
    });
    await loadPayrolls();
    renderPayrolls();
    renderDashboard();

    const emp = allEmployees.find(e => e.id === empId) || {};
    toast(`✔ ${yr}년 ${mo}월 급여 저장 완료 (채용확정 계약 기준)\n고용형태: ${confirmedType}으로 변경됨`, 'success');
    await _checkWageLedgerComplete(coId, yr, mo);

  } catch(e){
    console.error('[_probAutoCreateAndSave]', e);
    toast('처리 중 오류가 발생했습니다: ' + e.message, 'error');
  } finally {
    if(autoBtn){
      autoBtn.disabled = false;
      autoBtn.innerHTML = '<i class="fas fa-magic"></i> 채용확정 계약 자동 생성 후 저장';
    }
  }
}

// ─── 수정 모드 진입 ───
// 급여 미입력 직원 → 급여 입력 페이지로 이동 (신규 입력 모드)
function goPayrollInputNew(companyId, employeeId, year, month){
  const piMenuItem = document.querySelector('[data-page="payroll-input"]');
  showPage('payroll-input', piMenuItem);
  // 고객사 칩 UI 전환
  const co = allCompanies.find(x=>x.id===companyId);
  if(co){
    document.getElementById('pi-company-select-card').style.display='none';
    document.getElementById('pi-input-section').style.display='';
    document.getElementById('pi-selected-company-label').textContent=co.company_name+' 급여 입력';
  }
  // 숨김 select 동기화
  const coSel = document.getElementById('pi-company');
  coSel.value = companyId;
  loadPIEmployees();
  // 직원 선택
  const empSel = document.getElementById('pi-employee');
  empSel.value = employeeId;
  loadPIContract();
  // 연월 설정
  document.getElementById('pi-year').value = year;
  document.getElementById('pi-month').value = month;
  // 신규 입력 모드 보장 (수정 배너 숨김)
  piEditPayrollId = null;
  const banner = document.getElementById('pi-edit-banner');
  if(banner) banner.style.display = 'none';
  document.getElementById('upload-drop-zone').style.display = '';
  const saveBtn = document.querySelector('#page-payroll-input .btn-primary');
  if(saveBtn){
    saveBtn.innerHTML = '<i class="fas fa-save"></i> 급여 저장';
    saveBtn.style.background = '';
  }
  // 스크롤 상단
  document.getElementById('page-payroll-input')?.scrollTo(0,0);
  window.scrollTo(0,0);
}

function editPayroll(payrollId){
  const p=allPayrolls.find(x=>x.id===payrollId);
  if(!p){toast('급여 데이터를 찾을 수 없습니다.','error');return;}
  const emp=allEmployees.find(x=>x.id===p.employee_id)||{};
  const co=allCompanies.find(x=>x.id===p.company_id)||{};
  // 급여 입력 페이지로 이동
  const piMenuItem=document.querySelector('[data-page="payroll-input"]');
  showPage('payroll-input', piMenuItem);
  // 수정 모드 ID 저장
  piEditPayrollId=payrollId;
  // 저장 버튼 텍스트를 "수정 저장"으로 변경
  document.querySelectorAll('#page-payroll-input .btn-primary').forEach(btn=>{
    if(btn.textContent.includes('급여 저장')||btn.textContent.includes('저장')){
      btn.innerHTML='<i class="fas fa-save"></i> 수정 저장';
      btn.style.background='linear-gradient(135deg,#f59e0b,#d97706)';
    }
  });
  // 수정 배너 표시 + 엑셀 업로드 드롭존 숨김
  const banner=document.getElementById('pi-edit-banner');
  banner.style.display='flex';
  document.getElementById('upload-drop-zone').style.display='none';
  document.getElementById('pi-edit-banner-title').textContent=`급여 수정 모드`;
  document.getElementById('pi-edit-banner-sub').textContent=`${emp.name||''}  ·  ${p.pay_year}년 ${p.pay_month}월분`;
  // 고객사 칩 UI 전환
  const coEdit = allCompanies.find(x=>x.id===p.company_id);
  if(coEdit){
    document.getElementById('pi-company-select-card').style.display='none';
    document.getElementById('pi-input-section').style.display='';
    document.getElementById('pi-selected-company-label').textContent=coEdit.company_name+' 급여 입력';
  }
  // 숨김 select 동기화
  const coSel=document.getElementById('pi-company');
  coSel.value=p.company_id;
  loadPIEmployees();
  // 직원 선택 (loadPIEmployees가 비동기가 아니므로 동기 처리)
  const empSel=document.getElementById('pi-employee');
  empSel.value=p.employee_id;
  // 계약 정보 로드
  loadPIContract();
  // 년도·월 설정
  document.getElementById('pi-year').value=p.pay_year;
  // 월 셀렉트에 해당 월 옵션 세팅 후 선택
  const moSel=document.getElementById('pi-month');
  moSel.value=p.pay_month;
  // 지급 항목 채우기 (금액 필드는 setAmountVal로 쉼표 포맷 적용)
  setAmountVal('pi-base',       p.base_salary);
  setAmountVal('pi-weekly-hol', p.weekly_holiday_pay);
  setAmountVal('pi-position',   p.position_allowance);
  setAmountVal('pi-skill',      p.skill_allowance||0);
  setAmountVal('pi-license',    p.license_allowance||0);
  setAmountVal('pi-car',           p.transportation_allowance||p.car_maintenance||0);
  setPIPayType('car',          p.transportation_pay_type||'fixed');
  setAmountVal('pi-self-driving',  p.self_driving_allowance||0);
  setPIPayType('self-driving', p.self_driving_pay_type||'fixed');
  setAmountVal('pi-remote-area',   p.remote_area_allowance||0);
  setPIPayType('remote-area',  p.remote_area_pay_type||'fixed');
  setAmountVal('pi-meal',          p.meal_allowance);
  setPIPayType('meal',         p.meal_pay_type||'fixed');
  setAmountVal('pi-childcare',     p.childcare_allowance||0);
  setAmountVal('pi-research',      p.research_allowance||0);
  document.getElementById('pi-dependents').value = p.dependents||1;
  document.getElementById('pi-ot-hours').value=p.overtime_hours||0;
  document.getElementById('pi-night-hours').value=p.night_hours||0;
  document.getElementById('pi-hol-hours').value=p.holiday_hours||0;
  const _alUsedEl = document.getElementById('pi-annual-used'); if(_alUsedEl) _alUsedEl.value = p.annual_leave_used || 0;
  setAmountVal('pi-annual-pay',    p.annual_leave_pay);
  setAmountVal('pi-bonus',         p.bonus_pay||0);
  setAmountVal('pi-performance',   p.performance_pay||0);
  setAmountVal('pi-actual-expense',p.actual_expense_pay||0);
  setAmountVal('pi-communication', p.communication_pay||0);
  setAmountVal('pi-etc-allowance', p.etc_allowance||0);
  // 근로 실적
  document.getElementById('pi-work-days').value=p.work_days||0;
  document.getElementById('pi-total-hours').value=p.total_work_hours||0;
  document.getElementById('pi-paydate').value=p.pay_date||'';
  document.getElementById('pi-note').value=p.note||'';
  // 정산/추가공제
  setAmountVal('pi-yearend',     p.year_end_tax_adjust);
  const _yeMemoEl = document.getElementById('pi-yearend-memo');
  if(_yeMemoEl) _yeMemoEl.value = p.year_end_tax_adjust_memo || '';
  setAmountVal('pi-health-adj',  p.health_insurance_adjust);
  const _haMemoEl = document.getElementById('pi-health-adj-memo');
  if(_haMemoEl) _haMemoEl.value = p.health_insurance_adjust_memo || '';
  setAmountVal('pi-advance',     p.advance_deduction);
  // 보수월액 표준값
  setAmountVal('pi-std-pay',     p.standard_monthly_pay);
  // 확정액 기준 고객사인 경우 저장된 보험료 값 복원
  const _editCo = allCompanies.find(x=>x.id===p.company_id);
  if(_editCo?.insurance_basis === '확정액 기준'){
    setAmountVal('pi-pension-fixed', p.national_pension);
    setAmountVal('pi-health-fixed',  p.health_insurance);
    setAmountVal('pi-ltcare-fixed',  p.long_term_care);
    setAmountVal('pi-employ-fixed',  p.employment_insurance);
  }
  // 4대보험 적용 기준 UI 전환 (수정 모드 진입 시 명시적 재적용)
  _switchInsuranceModeUI();
  // 근로 실적 자동산출 패널 (수정 모드: 기존 근로일수가 있을 때 패널 표시)
  (function(){
    const wi = document.getElementById('pi-contract-work-info');
    const wp = document.getElementById('pi-work-auto-panel');
    const sw = document.getElementById('pi-ot-pay-simple-wrap');
    if(piContract && wi){
      const hw2 = piContract?.hourly_wage || 0;
      const hpd2 = piContract?.work_hours_per_day || 8;
      const dpw2 = piContract?.work_days_per_week || 5;
      const isD2 = piContract?.contract_type === '일용직';
      const mDays2 = parseFloat(piContract?.work_days_per_month)||null;
      if(isD2){
        wi.innerHTML = `일급여: <strong style="color:#059669;">${won(piContract.daily_wage||piContract.base_salary||0)}</strong> &nbsp;·&nbsp; 통상시급: <strong>${won(hw2)}/h</strong>`;
      } else {
        wi.innerHTML = `통상시급: <strong style="color:#059669;">${won(hw2)}/h</strong> &nbsp;·&nbsp; 소정근로: 일 ${hpd2}h / 주 ${dpw2}일`
          + (mDays2 ? ` &nbsp;·&nbsp; 월 ${mDays2}일` : '')
          + `<br><span style="color:#6b7280;font-size:11px;">기본급 일할 = 계약기본급 ÷ 월소정근로일 × 근로일수 &nbsp;|&nbsp; 연장 = 시급×1.5 &nbsp;·&nbsp; 야간 = 시급×0.5 &nbsp;·&nbsp; 휴일 = 시급×1.5</span>`;
      }
      wi.style.display = '';
    }
    if(sw) sw.style.display = 'none';
    if(wp) wp.style.display = (p.work_days||p.overtime_hours||p.night_hours||p.holiday_hours) ? '' : 'none';
  })();
  // 계산 갱신
  calcAnnualLeaveTable();
  calcPI();
  toast(`${emp.name||''} ${p.pay_year}년 ${p.pay_month}월 급여 수정 모드로 진입했습니다.`,'info');
  // 페이지 상단으로 스크롤
  window.scrollTo({top:0,behavior:'smooth'});
}

// ─── 수정 취소 ───
function cancelEditPayroll(){
  piEditPayrollId=null;
  const banner=document.getElementById('pi-edit-banner');
  banner.style.display='none';
  // 엑셀 업로드 드롭존 복원
  document.getElementById('upload-drop-zone').style.display='';
  // 저장 버튼 텍스트 복원
  document.querySelectorAll('#page-payroll-input .btn-primary').forEach(btn=>{
    if(btn.textContent.includes('수정 저장')||btn.textContent.includes('저장')){
      btn.innerHTML='<i class="fas fa-save"></i> 급여 저장';
      btn.style.background='';
    }
  });
  clearPI();
}

// ─── EXCEL UPLOAD & VALIDATION ───

/* 엑셀 열 인덱스 상수 (임금대장 시트 1 기준, 0-based)
   인적사항(0~5): No, 사원번호, 성명, 부서, 직책, 고용형태
   지급(6~16):   기본급,주휴수당,직책수당,차량유지비,식대,연장수당,야간수당,휴일수당,연차수당,기타수당,지급총액
   공제(17~26):  소득세,지방소득세,건강보험,장기요양,국민연금,고용보험,연말정산,건보정산,기타공제,공제합계
   지급(27~29):  영수액,지급일,비고
*/
const XCOL={
  NO:0,EMP_NO:1,NAME:2,DEPT:3,POS:4,CAT:5,
  WORK_DAYS:6,TOTAL_HOURS:7,
  BASE:8,WEEKLY_HOL:9,POS_ALW:10,CAR:11,MEAL:12,
  OT_PAY:13,NIGHT_PAY:14,HOL_PAY:15,ANNUAL_PAY:16,OTHER_PAY:17,GROSS:18,
  INC_TAX:19,LOCAL_TAX:20,HEALTH:21,LT_CARE:22,PENSION:23,EMP_INS:24,
  YEAR_END:25,HEALTH_ADJ:26,ADVANCE:27,TOTAL_DED:28,
  NET_PAY:29,PAY_DATE:30,NOTE:31
};
// 열 번호(0-based) → 이름 매핑
const XCOL_NAME=['No','사원번호','성명','부서','직책','고용형태',
  '근로일수','총근로시간',
  '기본급','주휴수당','직책수당','차량유지비','식대',
  '연장수당','야간수당','휴일수당','연차수당','기타수당','지급총액',
  '소득세','지방소득세','건강보험','장기요양','국민연금','고용보험',
  '연말정산','건보정산','기타공제','공제합계',
  '영수액','지급일','비고'];

// 허용 오차
// - 지급총액·공제합계·영수액: 순수 합산이므로 1원 이내
// - 지방소득세: 10원 단위 내림 vs 1원 반올림 방식 혼재 → 10원 이내
// - 장기요양: 요율 적용 후 반올림 방식에 따라 최대 수십원 차이 → 10원 이내
const CALC_TOLERANCE=2;        // 합산형 검증 허용 오차 (지급총액·공제합계·영수액)
const LOCAL_TAX_TOLERANCE=10;  // 지방소득세 허용 오차 (10원 단위 처리 방식 차이)
const LT_CARE_TOLERANCE=10;    // 장기요양 허용 오차 (요율 반올림 방식 차이)

let _uploadParsed=null; // 검증 통과한 업로드 데이터 보관

function handleExcelUpload(event){
  const file=event.target.files[0];
  if(!file) return;
  // 파일 input 초기화 (같은 파일 재업로드 허용)
  event.target.value='';
  document.getElementById('upload-file-name').textContent='📎 '+file.name;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'array',cellStyles:true});
      validateAndParseExcel(wb,file.name);
    }catch(err){
      showUploadReport(false,[`파일을 읽는 중 오류가 발생했습니다: ${err.message}`],[],[],[],[]);
    }
  };
  reader.readAsArrayBuffer(file);
}

function validateAndParseExcel(wb, fileName){
  const errors      = []; // 치명적 오류 → 저장 전면 차단
  const warnings    = []; // 경고 → 저장 허용
  const calcErrors  = []; // 수식/계산 오류 → 해당 행만 제외
  const fixedErrors = []; // 계약 고정 항목 오류 → 해당 행만 제외
  const validRows   = [];

  // ════════════════════════════════════════
  //  보조 유틸
  // ════════════════════════════════════════
  const fmt = v => Math.round(v).toLocaleString('ko-KR');
  const nv  = v => (v===''||v===null||v===undefined) ? 0 : parseFloat(v)||0;

  // ── 연도별 요율 조회 헬퍼 ──
  // _allInsuranceRates: [{insurance_type, year, period_start, period_end, rate, ...}]
  function getRateForYearMonth(type, year, month){
    const dateStr = `${year}-${String(month).padStart(2,'0')}-01`;
    // 기간이 있는 경우 기간 내 매칭
    const byPeriod = _allInsuranceRates.find(r =>
      r.insurance_type===type &&
      r.period_start && r.period_end &&
      dateStr >= r.period_start && dateStr <= r.period_end
    );
    // DB의 rate는 % 단위 (예: 12.95)로 저장 → /100 하여 소수 비율(0.1295)로 반환
    if(byPeriod) return (parseFloat(byPeriod.rate)||0) / 100;
    // 기간 없이 연도만 있는 경우
    const byYear = _allInsuranceRates.find(r =>
      r.insurance_type===type && Number(r.year)===year
    );
    return byYear ? (parseFloat(byYear.rate)||0) / 100 : 0;
  }

  function getCapForYearMonth(type, year, month){
    const dateStr = `${year}-${String(month).padStart(2,'0')}-01`;
    const byPeriod = _allInsuranceRates.find(r =>
      r.insurance_type===type &&
      r.period_start && r.period_end &&
      dateStr >= r.period_start && dateStr <= r.period_end
    );
    if(byPeriod) return parseFloat(byPeriod.cap_amount)||0;
    const byYear = _allInsuranceRates.find(r =>
      r.insurance_type===type && Number(r.year)===year
    );
    return byYear ? parseFloat(byYear.cap_amount)||0 : 0;
  }

  // ════════════════════════════════════════
  //  1. 파일명 검증
  //  [회사명]_임금대장_YYYY년MM월.xlsx
  // ════════════════════════════════════════
  const fnMatch = fileName.match(/\[(.+?)\]_임금대장_(\d{4})년(\d{2})월/);
  let fnCoName='', fnYear=0, fnMonth=0;
  if(!fnMatch){
    errors.push('❌ 파일명 형식 오류\n올바른 형식: [회사명]_임금대장_YYYY년MM월.xlsx\n현재 파일명: '+fileName);
  } else {
    fnCoName = fnMatch[1];
    fnYear   = parseInt(fnMatch[2]);
    fnMonth  = parseInt(fnMatch[3]);
    // 년월 범위 검증
    if(fnYear < 2000 || fnYear > 2100)
      errors.push(`❌ 파일명 년도 오류: ${fnYear}년 (2000~2100 사이여야 합니다)`);
    if(fnMonth < 1 || fnMonth > 12)
      errors.push(`❌ 파일명 월 오류: ${fnMonth}월 (1~12 사이여야 합니다)`);
  }

  // ════════════════════════════════════════
  //  2. 시트 존재 확인
  // ════════════════════════════════════════
  // 시트명: '임금대장' 고정 또는 'YYYY년MM월' 형식 모두 허용
  const SHEET_NAME = '임금대장';
  const foundSheet = wb.SheetNames.find(n =>
    n === SHEET_NAME || /^\d{4}년\d{2}월$/.test(n)
  );
  if(!foundSheet){
    errors.push(`❌ '임금대장' 시트를 찾을 수 없습니다.\n발견된 시트: ${wb.SheetNames.join(', ')}\n※ 시트명은 '임금대장' 또는 'YYYY년MM월' 형식이어야 합니다.`);
    return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);
  }
  const ws  = wb.Sheets[foundSheet];
  // blankrows:true → 빈 행도 포함 (카드형에서 카드 구분 빈행이 인덱스에 영향을 줌)
  const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', blankrows:true});

  // ════════════════════════════════════════
  //  3. 타이틀 행에서 회사명·년월 파싱
  //  row0: "회사명  |  YYYY년 MM월 임금대장"  (업로드용 양식)
  //        또는 "회사명  YYYY년 MM월 임금대장"  (기타 형식 허용)
  // ════════════════════════════════════════
  const titleRaw = raw[0] && raw[0][0] ? String(raw[0][0]) : '';
  // 파이프(|) 구분자 있는 형식
  let titleMatch = titleRaw.match(/(.+?)\s*\|\s*(\d{4})년\s*(\d{1,2})월/);
  // 파이프 없는 형식 (공백 구분)
  if(!titleMatch) titleMatch = titleRaw.match(/(.+?)\s+(\d{4})년\s*(\d{1,2})월/);
  let shCoName='', shYear=0, shMonth=0;
  if(!titleMatch){
    errors.push(`❌ 시트 타이틀 파싱 실패\n1행 내용: "${titleRaw.substring(0,80)}"\n기대 형식: "회사명 | YYYY년 MM월 임금대장"`);
  } else {
    shCoName = titleMatch[1].trim()
      .replace(/\s*임금대장\s*$/, '')  // 끝에 "임금대장" 텍스트가 있으면 제거
      .trim();
    shYear   = parseInt(titleMatch[2]);
    shMonth  = parseInt(titleMatch[3]);
  }

  // ════════════════════════════════════════
  //  4. 파일명 ↔ 시트 메타 일치 확인
  // ════════════════════════════════════════
  if(fnCoName && shCoName && fnCoName !== shCoName){
    errors.push(`❌ 회사명 불일치\n파일명: "${fnCoName}" / 시트 타이틀: "${shCoName}"`);
  }
  if(fnYear && shYear && (fnYear!==shYear || fnMonth!==shMonth)){
    errors.push(`❌ 년월 불일치\n파일명: ${fnYear}년 ${fnMonth}월 / 시트 타이틀: ${shYear}년 ${shMonth}월`);
  }

  // ════════════════════════════════════════
  //  5. DB 고객사 매칭
  // ════════════════════════════════════════
  const targetCoName = shCoName || fnCoName;
  const targetYear   = shYear   || fnYear;
  const targetMonth  = shMonth  || fnMonth;

  if(!targetCoName) errors.push('❌ 회사명을 파악할 수 없습니다.');
  if(!targetYear || !targetMonth) errors.push('❌ 년월 정보를 파악할 수 없습니다.');

  let co = allCompanies.find(c => c.company_name === targetCoName);
  if(!co && targetCoName){
    co = allCompanies.find(c =>
      targetCoName.includes(c.company_name) || c.company_name.includes(targetCoName)
    );
    if(co) warnings.push(`⚡ 고객사명 유사 매칭: 파일 "${targetCoName}" → DB "${co.company_name}"`);
    else   errors.push(`❌ 고객사를 찾을 수 없습니다: "${targetCoName}"\n등록된 고객사: ${allCompanies.map(c=>c.company_name).join(', ')}`);
  }

  if(errors.length > 0){
    return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);
  }

  // ════════════════════════════════════════
  //  5-B. 검증 항목 안내 문구 갱신 (insurance_basis 반영)
  // ════════════════════════════════════════
  (function _updateCalcDesc(){
    const el = document.getElementById('upload-calc-desc');
    if(!el) return;
    const basis = co?.insurance_basis || '요율 기준';
    const isFixed = basis === '확정액 기준';
    if(isFixed){
      el.innerHTML =
        '※ <strong style="color:#b45309;">확정액 기준</strong> 고객사 — 검증 항목: ' +
        '①지급총액(지급항목 합산) ②지방소득세(소득세×10%) ③공제합계(공제항목 합산) ④영수액(지급총액−공제합계)<br>' +
        '※ 4대보험(건강·장기요양·국민연금·고용)은 직접 입력값을 사용하므로 요율 검증에서 제외됩니다.';
    } else {
      el.innerHTML =
        '※ <strong style="color:#059669;">요율 기준</strong> 고객사 — 검증 항목: ' +
        '①지급총액(지급항목 합산) ②지방소득세(소득세×10%) ' +
        '③건강보험(보수월액×요율, ±10원) ③-1장기요양(건강보험×요율, ±10원) ' +
        '③-2국민연금(보수월액×요율·상한 적용, ±10원) ③-3고용보험(보수월액×요율, ±10원) ' +
        '④공제합계(공제항목 합산) ⑤영수액(지급총액−공제합계)<br>' +
        '※ 보수월액은 지급총액에서 비과세(차량·식대·연차·기타)를 제외하여 추정합니다. ' +
        '계약서에서 해당 보험 미적용으로 설정된 직원은 해당 항목 검증이 제외됩니다.';
    }
  })();

  // ════════════════════════════════════════
  //  6. 포맷 감지: 카드형(9열) vs 테이블형(32열)
  //
  //  카드형 특징:
  //   - raw[2] = [숫자, '성명', 이름, '부서', ...]  ← 직원 데이터 행
  //   - C0 값이 숫자(순번) 또는 '합계'
  //   - 헤더 행 없음, 항목명이 셀 값으로 분산
  //
  //  테이블형 특징:
  //   - raw[4] = ['No','사원번호','성명','부서',...] ← 컬럼 헤더 행
  //   - raw[5]~ = 직원 데이터 행 (1인 1행)
  // ════════════════════════════════════════

  // 카드형 감지: raw[2]의 C1 값이 '성명'이고 C0이 숫자인지 확인
  const isCardFormat = (()=>{
    for(let ri=2; ri<Math.min(raw.length,6); ri++){
      const r = raw[ri];
      if(!r) continue;
      const c0 = String(r[0]||'').trim();
      const c1 = String(r[1]||'').trim();
      // 카드형: C0=순번(숫자), C1='성명'  또는  C0='합계', C1='총 인원'
      if(c1 === '성명' && (Number(c0) > 0 || c0 === '합계')) return true;
    }
    return false;
  })();

  // ────────────────────────────────────────────────────────────
  //  ★ 카드형 파싱 분기 (임금대장 뷰에서 다운로드한 파일)
  // ────────────────────────────────────────────────────────────
  if(isCardFormat){
    warnings.push('ℹ️ 카드형(임금대장 뷰) 포맷으로 파싱합니다.');

    // 카드형 구조: 직원 1명 = 11행 (헤더A + 헤더B + 지급5행 + 공제3행 + 빈행)
    // raw[0]=타이틀, raw[1]=빈행, raw[2]~=직원카드들
    // 각 카드 시작: C0=순번(숫자) 또는 C0='합계'

    // 항목명→DB 필드명 매핑 (카드형에서 사용하는 항목명 기준)
    const CARD_PAY_MAP = {
      '기본급':         'base_salary',
      '주휴수당':       'weekly_holiday_pay',
      '직책수당':       'position_allowance',
      '연장근로수당':   'overtime_pay',
      '야간근로수당':   'night_pay',
      '휴일근로수당':   'holiday_pay',
      '교통비':         'transportation_allowance',
      '자가운전보조금': 'self_driving_allowance',
      '벽지수당':       'remote_area_allowance',
      '식대':           'meal_allowance',
      '출산·보육수당':  'childcare_allowance',
      '연구활동비':     'research_allowance',
      '연차수당':       'annual_leave_pay',
      '정기상여금':     'bonus_pay',
      '성과급':         'performance_pay',
      '실비변상적급여': 'actual_expense_pay',
      '통신비':         'communication_pay',
      '기술수당':       'skill_allowance',
      '면허수당':       'license_allowance',
      // '기타수당' 셀 → etc_allowance 필드로 저장
      // 화면·엑셀·파서 레이블 통일. 하위 호환을 위해 구 레이블도 같은 필드로 매핑
      '기타수당':       'etc_allowance',
      '기타지급':       'etc_allowance', // 구 레이블 하위 호환
      '국외근로소득':   'etc_allowance', // 구 레이블 하위 호환
    };
    const CARD_DED_MAP = {
      '보수월액':       'standard_monthly_pay',
      '소득세':         'income_tax',
      '주민세':         'local_income_tax',
      '건강보험':       'health_insurance',
      '장기요양보험료': 'long_term_care',
      '국민연금':       'national_pension',
      '고용보험':       'employment_insurance',
      '연말정산':       'year_end_tax_adjust',
      '건강보험정산':   'health_insurance_adjust',
      '기타공제':       'advance_deduction',
    };

    // ── 카드 블록 파싱: 카드 시작 행 인덱스 목록 추출 ──
    // 판별 기준:
    //   C1(idx=1) === '성명'  AND  (C0이 양수 숫자 OR C0==='합계')
    // sheet_to_json은 숫자셀을 number 타입으로 반환하므로 타입 체크 포함
    const cardStarts = [];
    for(let ri=2; ri<raw.length; ri++){
      const r = raw[ri];
      if(!r || r.length < 2) continue;
      const c0raw = r[0];
      const c1    = String(r[1]||'').trim();
      // C1이 '성명'인지 확인
      if(c1 !== '성명') continue;
      // C0이 양수 숫자(number 타입 또는 숫자 문자열)이거나 '합계' 문자열
      const c0num = typeof c0raw === 'number' ? c0raw : Number(String(c0raw||'').replace(/,/g,'').trim());
      const c0str = String(c0raw||'').trim();
      if(c0num > 0 || c0str === '합계' || c0str === '합 계'){
        cardStarts.push(ri);
      }
    }

    // 디버그: 탐지된 카드 수를 경고에 기록 (파싱 이슈 추적용)
    warnings.push(`ℹ️ 카드 탐지: 총 ${cardStarts.length}개 카드 발견 (합계 카드 포함) / 전체 raw 행수: ${raw.length}`);

    const cardDataRows = []; // 파싱된 직원 데이터 (dataRows 대응)

    for(const startRi of cardStarts){
      const hdrA = raw[startRi]     || [];  // [No, '성명', 이름, '부서', 부서, '직책', 직책, '고용형태', 고용형태]
      const hdrB = raw[startRi+1]   || [];  // ['', '근로일수/시간', '연장야간...', '지급총액', 금액, '공제합계', 금액, '실수령액/날짜', 금액]

      // 합계 카드 건너뜀 (C0='합계' 또는 C0='합 계')
      const c0val = String(hdrA[0]||'').trim();
      if(c0val === '합계' || c0val === '합 계') continue;

      // 직원 기본정보
      const empName  = String(hdrA[2]||'').trim();
      const dept     = String(hdrA[4]||'').trim();
      const pos      = String(hdrA[6]||'').trim();
      const empCat   = String(hdrA[8]||'').trim();

      // 헤더B에서 지급총액, 공제합계, 실수령액, 지급일 파싱
      const grossVal = parseFloat(String(hdrB[4]||'').replace(/,/g,''))||0;
      const dedVal   = parseFloat(String(hdrB[6]||'').replace(/,/g,''))||0;
      // 실수령액 / 지급일: C8 값, C7 라벨에서 날짜 추출
      const netVal   = parseFloat(String(hdrB[8]||'').replace(/,/g,''))||0;
      const netLbl   = String(hdrB[7]||'');
      // "실수령액 / 2025-04-25" 형식에서 날짜 추출
      const payDateM = netLbl.match(/(\d{4}-\d{2}-\d{2})/);
      const payDate  = payDateM ? payDateM[1] : '';

      // 근로일수/시간: C1 = "10일 / 80H" 형식
      const workStr  = String(hdrB[1]||'');
      const workDayM = workStr.match(/(\d+(?:\.\d+)?)\s*일/);
      const workHrM  = workStr.match(/(\d+(?:\.\d+)?)\s*H/i);
      const workDays = workDayM ? parseFloat(workDayM[1]) : 0;
      const workHrs  = workHrM  ? parseFloat(workHrM[1])  : 0;

      // 지급내역/공제내역 행에서 항목명·금액 추출
      // 지급행: startRi+2 ~ startRi+6 (5행), 공제행: startRi+7 ~ startRi+9 (3행)
      const fieldVals = {};

      for(let di=0; di<5; di++){
        const row = raw[startRi+2+di] || [];
        // 4개 항목 쌍: (C1,C2), (C3,C4), (C5,C6), (C7,C8)
        for(let ci=0; ci<4; ci++){
          const lbl = String(row[ci*2+1]||'').trim();
          const val = parseFloat(String(row[ci*2+2]||'').replace(/,/g,''))||0;
          if(lbl && CARD_PAY_MAP[lbl] !== undefined){
            fieldVals[CARD_PAY_MAP[lbl]] = val;
          }
        }
      }
      for(let di=0; di<3; di++){
        const row = raw[startRi+7+di] || [];
        for(let ci=0; ci<4; ci++){
          const lbl = String(row[ci*2+1]||'').trim();
          const val = parseFloat(String(row[ci*2+2]||'').replace(/,/g,''))||0;
          if(lbl && CARD_DED_MAP[lbl] !== undefined){
            fieldVals[CARD_DED_MAP[lbl]] = val;
          }
        }
      }

      if(!empName) continue;

      cardDataRows.push({
        _name:    empName,
        _dept:    dept,
        _pos:     pos,
        _cat:     empCat,
        _workDays:workDays,
        _workHrs: workHrs,
        _gross:   grossVal,
        _ded:     dedVal,
        _net:     netVal,
        _payDate: payDate,
        ...fieldVals
      });
    }

    if(!cardDataRows.length){
      errors.push('❌ 카드형 포맷에서 직원 데이터를 읽을 수 없습니다.');
      return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);
    }

    // ── 직원 명단 검증 (카드형) ──
    const coEmps     = allEmployees.filter(e => e.company_id===co.id && (e.status==='재직'||e.status==='active'));
    const coEmpNames = coEmps.map(e => e.name);
    const empMatchMap = {};

    cardDataRows.forEach(row => {
      const xn = row._name;
      if(!xn) return;
      const exact = coEmps.find(e => e.name===xn);
      if(exact){ empMatchMap[xn]=exact; return; }
      const fuzzy = coEmps.find(e => e.name.includes(xn) || xn.includes(e.name));
      if(fuzzy){
        warnings.push(`⚡ 직원명 유사 매칭: 파일 "${xn}" → DB "${fuzzy.name}"`);
        empMatchMap[xn] = fuzzy;
      } else {
        errors.push(`❌ DB에 없는 직원: "${xn}"\n고객사 재직 직원: ${coEmpNames.join(', ')}`);
      }
    });
    if(errors.length > 0) return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);

    // 카드형(임금대장 뷰)은 급여가 입력된 직원만 포함하므로
    // "엑셀에 없는 재직 직원" 경고는 표시하지 않음 (정상 동작)

    // ── 고객사 4대보험 적용 기준 확인 ──
    // '확정액 기준': 보험료를 직접 입력하므로 요율 검증 제외
    // '요율 기준' (기본): 요율 기반 자동계산이므로 검증 수행
    const coInsuranceBasis = co?.insurance_basis || '요율 기준';
    const isFixedInsurance = coInsuranceBasis === '확정액 기준';

    // ── 요율 사전 조회 (요율 기준 고객사 검증에 사용) ──
    const rateLtCare    = getRateForYearMonth('long_term_care',   targetYear, targetMonth);
    const ratePension   = getRateForYearMonth('national_pension', targetYear, targetMonth);
    const rateHealth    = getRateForYearMonth('health',           targetYear, targetMonth);
    const rateEmploy    = getRateForYearMonth('employment',       targetYear, targetMonth);
    const capPension    = getCapForYearMonth ('national_pension', targetYear, targetMonth) || 6370000;

    // ── 데이터 행 검증 + validRows 변환 (카드형 → confirmBulkUpload 호환 구조) ──
    cardDataRows.forEach((row, di) => {
      const xn  = row._name;
      const emp = empMatchMap[xn];
      if(!emp) return;

      const ct = allContracts.find(c => c.employee_id===emp.id &&
        (c.status==='활성'||c.status==='active'||c.status==='유효')) || null;
      const hw = ct ? (parseFloat(ct.hourly_wage)||0) : 0;
      // 카드형에서 행 번호는 카드 시작 인덱스 기준으로 표시 (대략적 위치)
      const cardRowLabel = `${xn}(카드형)`;

      const base     = row.base_salary              ?? 0;
      const weekHol  = row.weekly_holiday_pay        ?? 0;
      const posAlw   = row.position_allowance        ?? 0;
      // 차량 관련: 교통비·자가운전보조금 각각 읽기 (계약서 필드 대응)
      const transp   = row.transportation_allowance  ?? 0; // 계약.transportation_allowance 대응
      const selfDrv  = row.self_driving_allowance    ?? 0; // 계약.self_driving_allowance 대응
      const carLegacy= 0; // 카드형에 '차량유지비' 항목명은 없으므로 0
      const car      = transp + selfDrv;                   // 지급총액 계산용 합산
      const meal     = row.meal_allowance            ?? 0;
      const otPay    = row.overtime_pay              ?? 0;
      const nightPay = row.night_pay                 ?? 0;
      const holPay   = row.holiday_pay               ?? 0;
      const annlPay  = row.annual_leave_pay          ?? 0;
      // '기타수당' 셀 = etc_allowance 필드로 파싱됨
      // 개별 항목이 0이고 etc_allowance에 합산값이 있는 경우도 정상 처리
      const otherPay = (row.bonus_pay??0)+(row.performance_pay??0)+(row.skill_allowance??0)
                      +(row.license_allowance??0)+(row.communication_pay??0)
                      +(row.research_allowance??0)+(row.childcare_allowance??0)
                      +(row.remote_area_allowance??0)+(row.actual_expense_pay??0)
                      +(row.etc_allowance??0)   // 기타수당 (구: overseas_work_pay)
                      +(row.other_pay??0);      // other_pay(구 테이블형 업로드 합산값)도 포함
      const gross    = row._gross  || (base+weekHol+posAlw+car+meal+otPay+nightPay+holPay+annlPay+otherPay);
      const incTax   = row.income_tax                ?? 0;
      const localTax = row.local_income_tax          ?? 0;
      const health   = row.health_insurance          ?? 0;
      const ltCare   = row.long_term_care            ?? 0;
      const pension  = row.national_pension          ?? 0;
      const empIns   = row.employment_insurance      ?? 0;
      const yearEnd  = row.year_end_tax_adjust       ?? 0;
      const healthAdj= row.health_insurance_adjust   ?? 0;
      const advance  = row.advance_deduction         ?? 0;
      const calcDed  = incTax+localTax+health+ltCare+pension+empIns+yearEnd+healthAdj+advance;
      const totalDed = row._ded > 0 ? row._ded : calcDed;
      const netPay   = row._net  > 0 ? row._net  : (gross - totalDed);
      // std(보수월액): 카드 공제행 '보수월액' 셀 파싱값을 우선 사용
      // → DB 저장 시 UI에서 정확히 계산된 값이므로 이 값으로 보험료 검증
      // 없으면(0이면) 지급총액 - 비과세 항목으로 추정
      const stdFromCard = row.standard_monthly_pay ?? 0;
      const nonTaxable  = transp + selfDrv + meal
                        + (row.remote_area_allowance??0)
                        + (row.childcare_allowance??0)
                        + (row.research_allowance??0);
      const std = stdFromCard > 0
        ? stdFromCard
        : Math.max(0, gross - nonTaxable);

      // ──────────────────────────────────────
      //  [A] 계약 고정 항목 검증 (카드형)
      //  근로계약에 명시된 고정 금액과 다르면 fixedErrors에 기록
      // ──────────────────────────────────────
      if(ct){
        // 계약서 차량 관련 필드 통합:
        //   신규: transportation_allowance(교통비) + self_driving_allowance(자가운전보조금)
        //   레거시: car_maintenance(차량유지비)
        // → 셋 중 실제 값이 있는 필드와 엑셀 파싱값을 각각 비교
        const fixedChecks = [
          [base,     parseFloat(ct.base_salary)||0,              '기본급',          0],
          [weekHol,  parseFloat(ct.weekly_holiday_pay)||0,       '주휴수당',        0],
          [posAlw,   parseFloat(ct.position_allowance)||0,       '직책수당',        0],
          [meal,     parseFloat(ct.meal_allowance)||0,           '식대',            0],
        ];
        // 차량: 계약서 신규 필드 우선, 없으면 레거시 car_maintenance
        const ctTransp  = parseFloat(ct.transportation_allowance)||0;
        const ctSelfDrv = parseFloat(ct.self_driving_allowance)||0;
        const ctCarLeg  = parseFloat(ct.car_maintenance)||0;
        if(ctTransp > 0)  fixedChecks.push([transp,   ctTransp,  '교통비',          0]);
        if(ctSelfDrv > 0) fixedChecks.push([selfDrv,  ctSelfDrv, '자가운전보조금',  0]);
        if(ctCarLeg > 0 && ctTransp === 0 && ctSelfDrv === 0){
          // 레거시 car_maintenance만 있는 경우: 교통비+자가운전 합산과 비교
          fixedChecks.push([car, ctCarLeg, '차량유지비', 0]);
        }
        if((parseFloat(ct.other_allowance)||0) > 0){
          fixedChecks.push([otherPay, parseFloat(ct.other_allowance)||0, '기타수당', 0]);
        }
        fixedChecks.forEach(([xlVal, ctVal, label, tol]) => {
          if(ctVal === 0) return; // 계약서 미입력 항목은 건너뜀
          if(Math.abs(xlVal - ctVal) > tol){
            fixedErrors.push({
              row: cardRowLabel,
              colName: label,
              empName: xn,
              input: xlVal,
              contract: ctVal,
              diff: xlVal - ctVal,
              desc: `근로계약서 기준: ${fmt(ctVal)}원 / 엑셀 입력값: ${fmt(xlVal)}원 (차이: ${fmt(xlVal-ctVal)}원)`
            });
          }
        });
      }

      // ──────────────────────────────────────
      //  [B] 합산·수식 검증 (카드형)
      // ──────────────────────────────────────
      // ① 지급총액 = 지급항목 합산 (카드 헤더B의 gross값과 비교)
      const calcGross = base+weekHol+posAlw+car+meal+otPay+nightPay+holPay+annlPay+otherPay;
      if(row._gross > 0 && Math.abs(calcGross - row._gross) > CALC_TOLERANCE){
        calcErrors.push({row: cardRowLabel, colName:'지급총액', empName:xn,
          input: row._gross, calc: calcGross, diff: row._gross - calcGross,
          desc:`기본급(${fmt(base)})+주휴(${fmt(weekHol)})+직책(${fmt(posAlw)})+차량(${fmt(car)})+식대(${fmt(meal)})+연장(${fmt(otPay)})+야간(${fmt(nightPay)})+휴일(${fmt(holPay)})+연차(${fmt(annlPay)})+기타지급(${fmt(otherPay)}) = ${fmt(calcGross)}\n※ 기타지급 = 상여+성과급+기술+면허+통신+연구+보육+벽지+실비+국외+기타(${fmt(row.other_pay??0)})`
        });
      }
      // ② 소득세·지방소득세 상호 검증
      // 소득세와 지방소득세 중 어느 쪽이 잘못됐는지 두 방향으로 동시 판단
      if(incTax > 0 || localTax > 0){
        // 방향A: 소득세가 맞다고 가정 → 지방소득세가 맞는지 확인
        const ltFromInc1 = Math.round(incTax * 0.1);         // 반올림
        const ltFromInc2 = Math.floor(incTax * 0.1 / 10) * 10; // 10원 내림
        const ltBestDiff = localTax > 0
          ? Math.min(Math.abs(ltFromInc1-localTax), Math.abs(ltFromInc2-localTax))
          : Infinity;
        const ltBestCalc = Math.abs(ltFromInc1-localTax) <= Math.abs(ltFromInc2-localTax)
          ? ltFromInc1 : ltFromInc2;

        // 방향B: 지방소득세가 맞다고 가정 → 소득세가 맞는지 역산 (localTax / 0.1)
        const incFromLt = localTax > 0 ? Math.round(localTax / 0.1) : 0;
        const incDiff   = incTax > 0 && localTax > 0 ? Math.abs(incTax - incFromLt) : 0;

        if(localTax > 0 && ltBestDiff > LOCAL_TAX_TOLERANCE){
          // 지방소득세가 소득세의 10%와 다름
          // → 소득세 오입력 가능성도 안내
          const hint = incDiff > 1000
            ? `\n⚠️ 소득세 오입력 의심: 지방소득세(${fmt(localTax)})가 맞다면 소득세는 약 ${fmt(incFromLt)}원이어야 합니다 (현재 ${fmt(incTax)}원, 차이 ${fmt(incTax-incFromLt)}원)`
            : '';
          calcErrors.push({row: cardRowLabel, colName:'지방소득세', empName:xn,
            input: localTax, calc: ltBestCalc, diff: localTax - ltBestCalc,
            desc:`소득세(${fmt(incTax)}) × 10% → 반올림=${fmt(ltFromInc1)}, 10원내림=${fmt(ltFromInc2)}${hint}`
          });
        } else if(localTax === 0 && incTax > 0){
          // 지방소득세가 0인데 소득세가 있는 경우
          calcErrors.push({row: cardRowLabel, colName:'지방소득세', empName:xn,
            input: 0, calc: ltFromInc1, diff: -ltFromInc1,
            desc:`소득세(${fmt(incTax)})가 있으면 지방소득세(주민세)도 있어야 합니다 → 예상값 ${fmt(ltFromInc1)}원`
          });
        }
      }
      // ③ 요율 기준: 4대보험 전 항목 요율 검증
      // ※ 확정액 기준 고객사는 보험료를 직접 입력하므로 요율 검증 전체 제외
      if(!isFixedInsurance){
        // 계약서의 4대보험 적용 여부 (false로 명시된 경우에만 검증 제외)
        const ctApplyPension = ct ? ct.insurance_pension    !== false : true;
        const ctApplyHealth  = ct ? ct.insurance_health     !== false : true;
        const ctApplyEmpIns  = ct ? ct.insurance_employment !== false : true;
        const INS_TOLERANCE  = 10; // ±10원 허용 오차 (반올림 방식 차이 흡수)

        // ③-A 건강보험 = 보수월액 × 건강보험요율
        if(ctApplyHealth && rateHealth > 0 && std > 0){
          const calcH    = Math.round(std * rateHealth);
          const calcHF10 = Math.floor(std * rateHealth / 10) * 10;
          const bestHDiff = Math.min(Math.abs(calcH-health), Math.abs(calcHF10-health));
          const bestHCalc = Math.abs(calcH-health) <= Math.abs(calcHF10-health) ? calcH : calcHF10;
          if(bestHDiff > INS_TOLERANCE){
            calcErrors.push({row: cardRowLabel, colName:'건강보험', empName:xn,
              input: health, calc: bestHCalc, diff: health - bestHCalc,
              desc:`보수월액(${fmt(std)}) × 건강보험요율(${(rateHealth*100).toFixed(3)}%) → 반올림=${fmt(calcH)}, 10원내림=${fmt(calcHF10)}`
            });
          }
        }
        // ③-B 장기요양 = 건강보험 × 장기요양요율
        if(ctApplyHealth && rateLtCare > 0 && health > 0){
          const calcLt    = Math.round(health * rateLtCare);
          const calcLtF10 = Math.floor(health * rateLtCare / 10) * 10;
          const bestLtDiff = Math.min(Math.abs(calcLt-ltCare), Math.abs(calcLtF10-ltCare));
          const bestLtCalc = Math.abs(calcLt-ltCare) <= Math.abs(calcLtF10-ltCare) ? calcLt : calcLtF10;
          if(bestLtDiff > LT_CARE_TOLERANCE){
            calcErrors.push({row: cardRowLabel, colName:'장기요양보험', empName:xn,
              input: ltCare, calc: bestLtCalc, diff: ltCare - bestLtCalc,
              desc:`건강보험(${fmt(health)}) × 장기요양요율(${(rateLtCare*100).toFixed(2)}%) → 반올림=${fmt(calcLt)}, 10원내림=${fmt(calcLtF10)}`
            });
          }
        }
        // ③-C 국민연금 = min(보수월액, 상한) × 국민연금요율
        if(ctApplyPension && ratePension > 0 && std > 0){
          const pensionBase = Math.min(std, capPension);
          const calcP    = Math.round(pensionBase * ratePension);
          const calcPF10 = Math.floor(pensionBase * ratePension / 10) * 10;
          const bestPDiff = Math.min(Math.abs(calcP-pension), Math.abs(calcPF10-pension));
          const bestPCalc = Math.abs(calcP-pension) <= Math.abs(calcPF10-pension) ? calcP : calcPF10;
          if(bestPDiff > INS_TOLERANCE){
            calcErrors.push({row: cardRowLabel, colName:'국민연금', empName:xn,
              input: pension, calc: bestPCalc, diff: pension - bestPCalc,
              desc:`min(보수월액(${fmt(std)}), 상한(${fmt(capPension)})) × 국민연금요율(${(ratePension*100).toFixed(3)}%) → 반올림=${fmt(calcP)}, 10원내림=${fmt(calcPF10)}`
            });
          }
        }
        // ③-D 고용보험 = 보수월액 × 고용보험요율
        if(ctApplyEmpIns && rateEmploy > 0 && std > 0){
          const calcE    = Math.round(std * rateEmploy);
          const calcEF10 = Math.floor(std * rateEmploy / 10) * 10;
          const bestEDiff = Math.min(Math.abs(calcE-empIns), Math.abs(calcEF10-empIns));
          const bestECalc = Math.abs(calcE-empIns) <= Math.abs(calcEF10-empIns) ? calcE : calcEF10;
          if(bestEDiff > INS_TOLERANCE){
            calcErrors.push({row: cardRowLabel, colName:'고용보험', empName:xn,
              input: empIns, calc: bestECalc, diff: empIns - bestECalc,
              desc:`보수월액(${fmt(std)}) × 고용보험요율(${(rateEmploy*100).toFixed(3)}%) → 반올림=${fmt(calcE)}, 10원내림=${fmt(calcEF10)}`
            });
          }
        }
      }
      // ④ 공제합계 = 공제항목 합산
      // ※ 요율 기준: 개별 보험료 검증(③)으로 세분화됨 / 확정액 기준: 합산으로만 통합 검증
      if(row._ded > 0 && Math.abs(calcDed - row._ded) > CALC_TOLERANCE){
        const dedDiff = row._ded - calcDed; // 양수: 입력합계가 더 큰 경우, 음수: 더 작은 경우
        // 어떤 항목이 차이를 만드는지 힌트 제공
        // 소득세 역산: 공제합계 차이가 소득세 차이와 비슷한지 확인
        const incTaxHint = (localTax > 0 && Math.abs(dedDiff - Math.round(localTax/0.1 - incTax)) < 1000)
          ? `\n⚠️ 소득세 오입력 의심: 지방소득세(${fmt(localTax)}) 기준 소득세 역산값 ≈ ${fmt(Math.round(localTax/0.1))}원 (현재 ${fmt(incTax)}원, 차이 ${fmt(Math.round(localTax/0.1)-incTax)}원)`
          : '';
        calcErrors.push({row: cardRowLabel, colName:'공제합계', empName:xn,
          input: row._ded, calc: calcDed, diff: dedDiff,
          desc:`소득세(${fmt(incTax)})+지방(${fmt(localTax)})+건강(${fmt(health)})+장기(${fmt(ltCare)})+연금(${fmt(pension)})+고용(${fmt(empIns)})+연말(${fmt(yearEnd)})+건보정산(${fmt(healthAdj)})+기타공제(${fmt(advance)}) = ${fmt(calcDed)}${incTaxHint}`
        });
      }
      // ⑤ 영수액 = 지급총액 - 공제합계
      if(row._gross > 0 && row._ded > 0){
        const calcNet = row._gross - row._ded;
        if(Math.abs(calcNet - row._net) > CALC_TOLERANCE){
          calcErrors.push({row: cardRowLabel, colName:'영수액(실수령)', empName:xn,
            input: row._net, calc: calcNet, diff: row._net - calcNet,
            desc:`지급총액(${fmt(row._gross)}) - 공제합계(${fmt(row._ded)}) = ${fmt(calcNet)}`
          });
        }
      }

      // ── 오류 없는 행만 validRows에 추가 ──
      const hasRowErr = fixedErrors.some(e => e.empName === xn) || calcErrors.some(e => e.empName === xn);
      if(!hasRowErr){
        validRows.push({
          emp, co,
          year: targetYear, month: targetMonth,
          workDays: row._workDays || 0,
          totalHrs: row._workHrs  || 0,
          base, weekHol, posAlw,
          // 차량: transp/selfDrv 분리 저장 (confirmBulkUpload에서 각 필드에 매핑)
          transp, selfDrv, car,   // car = transp+selfDrv (지급총액 계산용 합산)
          meal,
          otPay, nightPay, holPay, annlPay, otherPay, gross,
          incTax, localTax, health, ltCare, pension, empIns,
          yearEnd, healthAdj, advance, totalDed, netPay,
          payDate: row._payDate || '',
          note: '',
          std,
          otHours:    hw>0 ? Math.round(otPay    / (hw*1.5)*10)/10 : 0,
          nightHours: hw>0 ? Math.round(nightPay / (hw*0.5)*10)/10 : 0,
          holHours:   hw>0 ? Math.round(holPay   / (hw*1.5)*10)/10 : 0,
          hourlyWage: hw,
        });
      }
    });

    if(!validRows.length && !fixedErrors.length && !calcErrors.length){
      errors.push('❌ 유효한 데이터 행이 없습니다.');
      return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);
    }

    const canSaveCard = errors.length === 0 && validRows.length > 0;
    _uploadParsed = {co, year:targetYear, month:targetMonth, validRows, calcErrors, fixedErrors, allRows:cardDataRows.length};
    return showUploadReport(canSaveCard, errors, warnings, calcErrors, fixedErrors, validRows);
  }
  // ────────────────────────────────────────────────────────────
  //  ★ 이하: 테이블형(32열) 파싱 (업로드용 양식)
  // ────────────────────────────────────────────────────────────

  // 헤더 행 위치 자동 탐지 (테이블형: raw[4]에 '성명' 포함)
  let headerRowIdx = 4; // 기본값 (0-based)
  for(let ri=2; ri<Math.min(raw.length,8); ri++){
    const row = raw[ri];
    if(!row) continue;
    // 테이블형 헤더 판단: '성명'이 C2~C5 사이에 위치 (C0=No, C1=사원번호, C2=성명)
    // 카드형이 아닌 경우에만 도달하므로 단순히 '성명' 포함 여부로 판단
    if(row.some((c,ci) => String(c||'').trim()==='성명' && ci >= 1)){
      headerRowIdx = ri;
      break;
    }
  }
  const headerRow = raw[headerRowIdx] || [];

  // 동적으로 열 인덱스 매핑 (헤더 행 기준)
  function colIdx(name){
    const aliases = {
      '성명':           ['성명','이름'],
      '사원번호':       ['사원번호','직원번호','사번'],
      '부서':           ['부서'],
      '직책':           ['직책','직위'],
      '고용형태':       ['고용형태','고용구분'],
      '근로일수':       ['근로일수','근무일수'],
      '총근로시간':     ['총근로시간','근로시간'],
      '기본급':         ['기본급'],
      '주휴수당':       ['주휴수당'],
      '자격(직책)수당': ['자격(직책)수당','직책수당','자격수당'],
      '차량유지비':     ['차량유지비','차량'],
      '식대':           ['식대'],
      '연장수당':       ['연장수당','연장근로수당'],
      '야간수당':       ['야간수당','야간근로수당'],
      '휴일수당':       ['휴일수당','휴일근로수당'],
      '연차수당':       ['연차수당'],
      '기타수당':       ['기타수당','기타'],
      '지급총액':       ['지급총액'],
      '소득세':         ['소득세'],
      '지방소득세':     ['지방소득세','주민세'],
      '건강보험':       ['건강보험'],
      '장기요양':       ['장기요양','장기요양보험료'],
      '국민연금':       ['국민연금'],
      '고용보험':       ['고용보험'],
      '연말정산':       ['연말정산'],
      '건보정산':       ['건보정산','건강보험정산'],
      '기타공제':       ['기타공제'],
      '공제합계':       ['공제합계'],
      '영수액(실수령)': ['영수액(실수령)','영수액','실수령액','실수령'],
      '지급일':         ['지급일','급여지급일'],
      '비고':           ['비고','메모','노트'],
    };
    const targets = aliases[name] || [name];
    for(let i=0; i<headerRow.length; i++){
      const h = String(headerRow[i]||'').trim();
      if(targets.some(t => h===t || h.includes(t))) return i;
    }
    return -1;
  }

  // 열 인덱스 맵 구성
  const CI = {
    NAME:      colIdx('성명'),
    EMP_NO:    colIdx('사원번호'),
    DEPT:      colIdx('부서'),
    POS:       colIdx('직책'),
    CAT:       colIdx('고용형태'),
    WORK_DAYS: colIdx('근로일수'),
    TOTAL_HRS: colIdx('총근로시간'),
    BASE:      colIdx('기본급'),
    WEEKLY_HOL:colIdx('주휴수당'),
    POS_ALW:   colIdx('자격(직책)수당'),
    CAR:       colIdx('차량유지비'),
    MEAL:      colIdx('식대'),
    OT_PAY:    colIdx('연장수당'),
    NIGHT_PAY: colIdx('야간수당'),
    HOL_PAY:   colIdx('휴일수당'),
    ANNUAL_PAY:colIdx('연차수당'),
    OTHER_PAY: colIdx('기타수당'),
    GROSS:     colIdx('지급총액'),
    INC_TAX:   colIdx('소득세'),
    LOCAL_TAX: colIdx('지방소득세'),
    HEALTH:    colIdx('건강보험'),
    LT_CARE:   colIdx('장기요양'),
    PENSION:   colIdx('국민연금'),
    EMP_INS:   colIdx('고용보험'),
    YEAR_END:  colIdx('연말정산'),
    HEALTH_ADJ:colIdx('건보정산'),
    ADVANCE:   colIdx('기타공제'),
    TOTAL_DED: colIdx('공제합계'),
    NET_PAY:   colIdx('영수액(실수령)'),
    PAY_DATE:  colIdx('지급일'),
    NOTE:      colIdx('비고'),
  };

  // 필수 열 누락 검증
  const missingCols = ['NAME','BASE','GROSS','TOTAL_DED','NET_PAY']
    .filter(k => CI[k] === -1)
    .map(k => ({NAME:'성명',BASE:'기본급',GROSS:'지급총액',TOTAL_DED:'공제합계',NET_PAY:'영수액(실수령)'}[k]));
  if(missingCols.length){
    errors.push(`❌ 필수 열을 찾을 수 없습니다: ${missingCols.join(', ')}\n헤더 행(${headerRowIdx+1}행) 내용: ${headerRow.slice(0,20).join(' | ')}`);
    return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);
  }

  // ════════════════════════════════════════
  //  7. 데이터 행 파싱 (테이블형)
  // ════════════════════════════════════════
  const dataRows = raw.slice(headerRowIdx+1).filter(r => {
    const nm = String(r[CI.NAME]||'').trim();
    return nm && nm !== '합 계' && nm !== '합계' && nm !== '';
  });

  if(!dataRows.length){
    errors.push('❌ 데이터 행이 없습니다. 직원 데이터가 입력되어 있는지 확인하세요.');
    return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);
  }

  // ════════════════════════════════════════
  //  8. 직원 명단 검증 (테이블형)
  // ════════════════════════════════════════
  const coEmps     = allEmployees.filter(e => e.company_id===co.id && (e.status==='재직'||e.status==='active'));
  const coEmpNames = coEmps.map(e => e.name);
  const xlNames    = dataRows.map(r => String(r[CI.NAME]||'').trim());
  const empMatchMap = {};

  xlNames.forEach(xn => {
    if(!xn) return;
    const exact = coEmps.find(e => e.name===xn);
    if(exact){ empMatchMap[xn]=exact; return; }
    const fuzzy = coEmps.find(e => e.name.includes(xn) || xn.includes(e.name));
    if(fuzzy){
      warnings.push(`⚡ 직원명 유사 매칭: 파일 "${xn}" → DB "${fuzzy.name}"`);
      empMatchMap[xn] = fuzzy;
    } else {
      errors.push(`❌ DB에 없는 직원: "${xn}"\n고객사 재직 직원: ${coEmpNames.join(', ')}`);
    }
  });

  coEmpNames.forEach(dn => {
    if(!xlNames.includes(dn))
      warnings.push(`⚠️ 엑셀에 없는 재직 직원: "${dn}" — 해당 직원 급여는 저장되지 않습니다`);
  });

  if(errors.length > 0){
    return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);
  }

  // ════════════════════════════════════════
  //  9. 행별 검증
  // ════════════════════════════════════════
  // 9-A. 고객사 4대보험 적용 기준 확인
  // '확정액 기준': 보험료를 직접 입력하므로 요율 검증 제외
  // '요율 기준' (기본): 요율 기반 자동계산이므로 검증 수행
  const coInsuranceBasis = co?.insurance_basis || '요율 기준';
  const isFixedInsurance = coInsuranceBasis === '확정액 기준';

  // 9-B. 요율 사전 조회 (요율 기준 고객사 검증에 사용)
  const rateLtCare   = getRateForYearMonth('long_term_care',   targetYear, targetMonth);
  const ratePension  = getRateForYearMonth('national_pension', targetYear, targetMonth);
  const rateHealth   = getRateForYearMonth('health',           targetYear, targetMonth);
  const rateEmploy   = getRateForYearMonth('employment',       targetYear, targetMonth);
  const capPension   = getCapForYearMonth ('national_pension', targetYear, targetMonth) || 6370000;

  dataRows.forEach((row, di) => {
    const excelRow = (headerRowIdx+1) + di + 1; // 1-based 엑셀 행번호
    const empName  = String(row[CI.NAME]||'').trim();
    const emp      = empMatchMap[empName];
    if(!emp) return; // 이미 errors에 기록됨

    const ct = allContracts.find(c =>
      c.employee_id===emp.id && (c.status==='활성'||c.status==='active'||c.status==='유효')
    ) || null;
    const hw = ct ? (parseFloat(ct.hourly_wage)||0) : 0;

    const n = ci => ci<0 ? 0 : nv(row[ci]);

    // ── 셀 값 읽기
    const workDays  = n(CI.WORK_DAYS);
    const totalHrs  = n(CI.TOTAL_HRS);
    const base      = n(CI.BASE);
    const weekHol   = n(CI.WEEKLY_HOL);
    const posAlw    = n(CI.POS_ALW);
    const car       = n(CI.CAR);
    const meal      = n(CI.MEAL);
    const otPay     = n(CI.OT_PAY);
    const nightPay  = n(CI.NIGHT_PAY);
    const holPay    = n(CI.HOL_PAY);
    const annlPay   = n(CI.ANNUAL_PAY);
    const otherPay  = n(CI.OTHER_PAY);
    const gross     = n(CI.GROSS);
    const incTax    = n(CI.INC_TAX);
    const localTax  = n(CI.LOCAL_TAX);
    const health    = n(CI.HEALTH);
    const ltCare    = n(CI.LT_CARE);
    const pension   = n(CI.PENSION);
    const empIns    = n(CI.EMP_INS);
    const yearEnd   = n(CI.YEAR_END);
    const healthAdj = n(CI.HEALTH_ADJ);
    const advance   = n(CI.ADVANCE);
    const totalDed  = n(CI.TOTAL_DED);
    const netPay    = n(CI.NET_PAY);

    // ──────────────────────────────────────
    //  [A] 계약 고정 항목 검증
    //  근로계약에 명시된 고정 금액과 다르면 오류
    // ──────────────────────────────────────
    if(ct){
      const fixedChecks = [
        // [엑셀값, 계약기준값, 항목명, 관용오차]
        [base,     parseFloat(ct.base_salary)||0,         '기본급',     0],
        [weekHol,  parseFloat(ct.weekly_holiday_pay)||0,  '주휴수당',   0],
        [posAlw,   parseFloat(ct.position_allowance)||0,  '직책수당',   0],
        [meal,     parseFloat(ct.meal_allowance)||0,      '식대',       0],
      ];
      // 차량: 계약서 신규 필드 우선, 없으면 레거시 car_maintenance
      // 테이블형 엑셀의 '차량유지비' 열(CI.CAR)은 교통비+자가운전 합산값일 수 있으므로
      // 계약서의 모든 차량 필드 합산과 비교
      const ctTransp  = parseFloat(ct.transportation_allowance)||0;
      const ctSelfDrv = parseFloat(ct.self_driving_allowance)||0;
      const ctCarLeg  = parseFloat(ct.car_maintenance)||0;
      const ctCarTotal = ctTransp + ctSelfDrv + ctCarLeg;
      if(ctCarTotal > 0){
        fixedChecks.push([car, ctCarTotal, '차량관련수당', 0]);
      }
      // 연장·야간·휴일은 근무 실적에 따라 변동 → 계약서 비교 불가, 검증 제외
      // 기타수당(other_allowance)도 계약서에 있을 때만 비교
      if((parseFloat(ct.other_allowance)||0)>0){
        fixedChecks.push([otherPay, parseFloat(ct.other_allowance)||0, '기타수당', 0]);
      }

      fixedChecks.forEach(([xlVal, ctVal, label, tol]) => {
        // 계약서에 0으로 되어 있으면 미입력으로 보고 건너뜀 (엑셀에 값이 있어도 허용)
        if(ctVal === 0) return;
        if(Math.abs(xlVal - ctVal) > tol){
          fixedErrors.push({
            row: excelRow,
            colName: label,
            empName,
            input: xlVal,
            contract: ctVal,
            diff: xlVal - ctVal,
            desc: `근로계약서 기준: ${fmt(ctVal)}원 / 엑셀 입력값: ${fmt(xlVal)}원 (차이: ${fmt(xlVal-ctVal)}원)`
          });
        }
      });
    }

    // ──────────────────────────────────────
    //  [B] 합산 수식 검증
    // ──────────────────────────────────────
    // ① 지급총액 = 지급항목 합산
    const calcGross = base+weekHol+posAlw+car+meal+otPay+nightPay+holPay+annlPay+otherPay;
    if(Math.abs(calcGross - gross) > CALC_TOLERANCE){
      calcErrors.push({row:excelRow, colName:'지급총액', empName,
        input:gross, calc:calcGross, diff:gross-calcGross,
        desc:`기본급(${fmt(base)})+주휴(${fmt(weekHol)})+직책(${fmt(posAlw)})+차량(${fmt(car)})+식대(${fmt(meal)})+연장(${fmt(otPay)})+야간(${fmt(nightPay)})+휴일(${fmt(holPay)})+연차(${fmt(annlPay)})+기타(${fmt(otherPay)}) = ${fmt(calcGross)}`
      });
    }

    // ② 소득세·지방소득세 상호 검증 (테이블형)
    if(incTax > 0 || localTax > 0){
      const ltFromInc1 = Math.round(incTax * 0.1);
      const ltFromInc2 = Math.floor(incTax * 0.1 / 10) * 10;
      const ltBestDiff = localTax > 0
        ? Math.min(Math.abs(ltFromInc1-localTax), Math.abs(ltFromInc2-localTax))
        : Infinity;
      const ltBestCalc = Math.abs(ltFromInc1-localTax) <= Math.abs(ltFromInc2-localTax)
        ? ltFromInc1 : ltFromInc2;
      const incFromLt   = localTax > 0 ? Math.round(localTax / 0.1) : 0;
      const incDiff     = incTax > 0 && localTax > 0 ? Math.abs(incTax - incFromLt) : 0;
      if(localTax > 0 && ltBestDiff > LOCAL_TAX_TOLERANCE){
        const hint = incDiff > 1000
          ? `\n⚠️ 소득세 오입력 의심: 지방소득세(${fmt(localTax)})가 맞다면 소득세는 약 ${fmt(incFromLt)}원이어야 합니다 (현재 ${fmt(incTax)}원, 차이 ${fmt(incTax-incFromLt)}원)`
          : '';
        calcErrors.push({row:excelRow, colName:'지방소득세', empName,
          input:localTax, calc:ltBestCalc, diff:localTax-ltBestCalc,
          desc:`소득세(${fmt(incTax)}) × 10% → 반올림=${fmt(ltFromInc1)}, 10원내림=${fmt(ltFromInc2)}${hint}`
        });
      } else if(localTax === 0 && incTax > 0){
        calcErrors.push({row:excelRow, colName:'지방소득세', empName,
          input:0, calc:ltFromInc1, diff:-ltFromInc1,
          desc:`소득세(${fmt(incTax)})가 있으면 지방소득세(주민세)도 있어야 합니다 → 예상값 ${fmt(ltFromInc1)}원`
        });
      }
    }

    // ③ 요율 기준: 4대보험 전 항목 요율 검증
    // ※ 확정액 기준 고객사는 보험료를 직접 입력하므로 요율 검증 전체 제외
    if(!isFixedInsurance){
      // 보수월액 추정: 테이블형은 보수월액 열이 없으므로 비과세 항목 제외로 추정
      // 비과세 항목: 교통비(car에 포함), 식대, 연차수당, 연장·야간·휴일은 제외
      // → 가능한 정확도: 기본급+주휴+직책+연장+야간+휴일 (과세 항목만)
      // 실제 보수월액과 차이가 날 수 있으므로 허용 오차를 넉넉히 설정
      const nonTaxableEst = car + meal; // 교통비·식대는 비과세 대표 항목
      const stdForIns = Math.max(0, gross - nonTaxableEst - annlPay - otherPay);

      // 계약서의 4대보험 적용 여부
      const ctApplyPension = ct ? ct.insurance_pension    !== false : true;
      const ctApplyHealth  = ct ? ct.insurance_health     !== false : true;
      const ctApplyEmpIns  = ct ? ct.insurance_employment !== false : true;
      const INS_TOLERANCE  = 10; // ±10원 허용 오차

      // ③-A 건강보험 = 보수월액 × 건강보험요율
      if(ctApplyHealth && rateHealth > 0 && stdForIns > 0){
        const calcH    = Math.round(stdForIns * rateHealth);
        const calcHF10 = Math.floor(stdForIns * rateHealth / 10) * 10;
        const bestHDiff = Math.min(Math.abs(calcH-health), Math.abs(calcHF10-health));
        const bestHCalc = Math.abs(calcH-health) <= Math.abs(calcHF10-health) ? calcH : calcHF10;
        if(bestHDiff > INS_TOLERANCE){
          calcErrors.push({row:excelRow, colName:'건강보험', empName,
            input:health, calc:bestHCalc, diff:health-bestHCalc,
            desc:`보수월액추정(${fmt(stdForIns)}) × 건강보험요율(${(rateHealth*100).toFixed(3)}%) → 반올림=${fmt(calcH)}, 10원내림=${fmt(calcHF10)}`
          });
        }
      }
      // ③-B 장기요양 = 건강보험 × 장기요양요율
      if(ctApplyHealth && rateLtCare > 0 && health > 0){
        const calcLt    = Math.round(health * rateLtCare);
        const calcLtF10 = Math.floor(health * rateLtCare / 10) * 10;
        const bestLtDiff = Math.min(Math.abs(calcLt-ltCare), Math.abs(calcLtF10-ltCare));
        const bestLtCalc = Math.abs(calcLt-ltCare) <= Math.abs(calcLtF10-ltCare) ? calcLt : calcLtF10;
        if(bestLtDiff > LT_CARE_TOLERANCE){
          calcErrors.push({row:excelRow, colName:'장기요양보험', empName,
            input:ltCare, calc:bestLtCalc, diff:ltCare-bestLtCalc,
            desc:`건강보험(${fmt(health)}) × 장기요양요율(${(rateLtCare*100).toFixed(2)}%) → 반올림=${fmt(calcLt)}, 10원내림=${fmt(calcLtF10)}`
          });
        }
      }
      // ③-C 국민연금 = min(보수월액, 상한) × 국민연금요율
      if(ctApplyPension && ratePension > 0 && stdForIns > 0){
        const pensionBase = Math.min(stdForIns, capPension);
        const calcP    = Math.round(pensionBase * ratePension);
        const calcPF10 = Math.floor(pensionBase * ratePension / 10) * 10;
        const bestPDiff = Math.min(Math.abs(calcP-pension), Math.abs(calcPF10-pension));
        const bestPCalc = Math.abs(calcP-pension) <= Math.abs(calcPF10-pension) ? calcP : calcPF10;
        if(bestPDiff > INS_TOLERANCE){
          calcErrors.push({row:excelRow, colName:'국민연금', empName,
            input:pension, calc:bestPCalc, diff:pension-bestPCalc,
            desc:`min(보수월액추정(${fmt(stdForIns)}), 상한(${fmt(capPension)})) × 국민연금요율(${(ratePension*100).toFixed(3)}%) → 반올림=${fmt(calcP)}, 10원내림=${fmt(calcPF10)}`
          });
        }
      }
      // ③-D 고용보험 = 보수월액 × 고용보험요율
      if(ctApplyEmpIns && rateEmploy > 0 && stdForIns > 0){
        const calcE    = Math.round(stdForIns * rateEmploy);
        const calcEF10 = Math.floor(stdForIns * rateEmploy / 10) * 10;
        const bestEDiff = Math.min(Math.abs(calcE-empIns), Math.abs(calcEF10-empIns));
        const bestECalc = Math.abs(calcE-empIns) <= Math.abs(calcEF10-empIns) ? calcE : calcEF10;
        if(bestEDiff > INS_TOLERANCE){
          calcErrors.push({row:excelRow, colName:'고용보험', empName,
            input:empIns, calc:bestECalc, diff:empIns-bestECalc,
            desc:`보수월액추정(${fmt(stdForIns)}) × 고용보험요율(${(rateEmploy*100).toFixed(3)}%) → 반올림=${fmt(calcE)}, 10원내림=${fmt(calcEF10)}`
          });
        }
      }
    }

    // ④ 공제합계 = 공제항목 합산 (테이블형)
    // ※ 요율 기준: 개별 보험료 검증(③)으로 세분화됨 / 확정액 기준: 합산으로만 통합 검증
    const calcTotalDed = incTax+localTax+health+ltCare+pension+empIns+yearEnd+healthAdj+advance;
    if(Math.abs(calcTotalDed - totalDed) > CALC_TOLERANCE){
      const dedDiff2 = totalDed - calcTotalDed;
      const incTaxHint2 = (localTax > 0 && Math.abs(dedDiff2 - Math.round(localTax/0.1 - incTax)) < 1000)
        ? `\n⚠️ 소득세 오입력 의심: 지방소득세(${fmt(localTax)}) 기준 소득세 역산값 ≈ ${fmt(Math.round(localTax/0.1))}원 (현재 ${fmt(incTax)}원, 차이 ${fmt(Math.round(localTax/0.1)-incTax)}원)`
        : '';
      calcErrors.push({row:excelRow, colName:'공제합계', empName,
        input:totalDed, calc:calcTotalDed, diff:dedDiff2,
        desc:`소득세(${fmt(incTax)})+지방(${fmt(localTax)})+건강(${fmt(health)})+장기(${fmt(ltCare)})+연금(${fmt(pension)})+고용(${fmt(empIns)})+연말(${fmt(yearEnd)})+건보정산(${fmt(healthAdj)})+기타공제(${fmt(advance)}) = ${fmt(calcTotalDed)}${incTaxHint2}`
      });
    }

    // ④ 영수액 = 지급총액 - 공제합계
    const calcNet = gross - totalDed;
    if(Math.abs(calcNet - netPay) > CALC_TOLERANCE){
      calcErrors.push({row:excelRow, colName:'영수액(실수령)', empName,
        input:netPay, calc:calcNet, diff:netPay-calcNet,
        desc:`지급총액(${fmt(gross)}) - 공제합계(${fmt(totalDed)}) = ${fmt(calcNet)}`
      });
    }

    // ── 오류 없는 행만 validRows에 추가 ──
    const hasErr = calcErrors.some(e=>e.row===excelRow) || fixedErrors.some(e=>e.row===excelRow);
    if(!hasErr){
      const std = base+weekHol+posAlw+otPay+nightPay+holPay+annlPay;
      validRows.push({
        emp, co, year:targetYear, month:targetMonth,
        workDays, totalHrs,
        base, weekHol, posAlw, car, meal,
        otPay, nightPay, holPay, annlPay, otherPay, gross,
        incTax, localTax, health, ltCare, pension, empIns,
        yearEnd, healthAdj, advance, totalDed, netPay,
        payDate: CI.PAY_DATE>=0 ? String(row[CI.PAY_DATE]||'') : '',
        note:    CI.NOTE>=0    ? String(row[CI.NOTE]||'')    : '',
        std,
        otHours:    hw>0 ? Math.round(otPay    / (hw*1.5)*10)/10 : 0,
        nightHours: hw>0 ? Math.round(nightPay / (hw*0.5)*10)/10 : 0,
        holHours:   hw>0 ? Math.round(holPay   / (hw*1.5)*10)/10 : 0,
        hourlyWage: hw,
        rawRow: row
      });
    }
  });

  _uploadParsed = {co, year:targetYear, month:targetMonth, validRows, calcErrors, fixedErrors, allRows:dataRows.length};
  showUploadReport(errors.length===0, errors, warnings, calcErrors, fixedErrors, validRows);
}

function showUploadReport(canSave, errors, warnings, calcErrors, fixedErrors, validRows){
  // 인자 누락 방어
  errors      = errors      || [];
  warnings    = warnings    || [];
  calcErrors  = calcErrors  || [];
  fixedErrors = fixedErrors || [];
  validRows   = validRows   || [];
  const fmt = v => Math.round(v).toLocaleString('ko-KR');
  const hasBlockErr  = !canSave || errors.length > 0;
  const hasCalcErr   = calcErrors.length > 0;
  const hasFixedErr  = fixedErrors.length > 0;
  const hasAnyErr    = hasCalcErr || hasFixedErr;

  // ── 요약 배너 ──
  const banner = document.getElementById('upload-summary-banner');
  if(hasBlockErr){
    banner.style.cssText = 'background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:14px 18px;margin-bottom:16px;';
    banner.innerHTML = `<div style="font-weight:700;color:#991b1b;font-size:13.5px;margin-bottom:8px;"><i class="fas fa-times-circle"></i> 유효성 검사 실패 — 저장이 중단되었습니다</div>`
      + errors.map(e=>`<div style="color:#b91c1c;font-size:12px;padding:2px 0 2px 16px;white-space:pre-wrap;">${e}</div>`).join('');
  } else if(hasAnyErr){
    const total = calcErrors.length + fixedErrors.length;
    const parts = [];
    if(hasCalcErr)  parts.push(`수식 오류 ${calcErrors.length}건`);
    if(hasFixedErr) parts.push(`계약 불일치 ${fixedErrors.length}건`);
    banner.style.cssText = 'background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:14px 18px;margin-bottom:16px;';
    banner.innerHTML = `<div style="font-weight:700;color:#92400e;font-size:13.5px;margin-bottom:6px;"><i class="fas fa-exclamation-triangle"></i> ${parts.join(' / ')} 발견 — 해당 행 제외 후 ${validRows.length}명 저장 가능</div>`
      + (warnings.length ? warnings.map(w=>`<div style="color:#b45309;font-size:12px;padding:1px 0;">${w}</div>`).join('') : '');
  } else {
    banner.style.cssText = 'background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:16px;';
    banner.innerHTML = `<div style="font-weight:700;color:#166534;font-size:13.5px;margin-bottom:4px;"><i class="fas fa-check-circle"></i> 유효성 검사 통과 — ${validRows.length}명 데이터 저장 가능</div>`
      + (warnings.length ? warnings.map(w=>`<div style="color:#4d7c0f;font-size:12px;padding:1px 0;">${w}</div>`).join('') : '');
  }

  // ── 경고/메타 섹션 ──
  const metaSec  = document.getElementById('upload-meta-section');
  const metaList = document.getElementById('upload-meta-list');
  if(warnings.length && !hasBlockErr){
    metaList.innerHTML = warnings.map(w=>`<div style="padding:2px 0;">${w}</div>`).join('');
    metaSec.style.display = 'block';
  } else {
    metaSec.style.display = 'none';
  }

  // ── 계약 고정 항목 불일치 섹션 ──
  let fixedSec = document.getElementById('upload-fixed-section');
  if(!fixedSec){
    // 동적 생성 (HTML에 없을 경우 대비)
    fixedSec = document.createElement('div');
    fixedSec.id = 'upload-fixed-section';
    const calcSec = document.getElementById('upload-calc-section');
    calcSec && calcSec.parentNode.insertBefore(fixedSec, calcSec);
  }
  if(hasFixedErr){
    fixedSec.style.display = 'block';
    fixedSec.innerHTML = `
      <div style="font-weight:700;color:#7c2d12;font-size:13px;margin:14px 0 8px;padding:8px 12px;background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;">
        <i class="fas fa-file-contract" style="margin-right:6px;color:#ea580c;"></i>
        계약 고정 항목 불일치 <span style="background:#ea580c;color:#fff;border-radius:12px;padding:1px 8px;font-size:11px;margin-left:6px;">${fixedErrors.length}건</span>
        <div style="font-size:11px;font-weight:400;color:#9a3412;margin-top:4px;">
          근로계약서에 명시된 금액과 다른 항목입니다. 계약서 기준으로 수정 후 재업로드하세요. (해당 행은 저장에서 제외됩니다)
        </div>
      </div>
      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#fff7ed;">
            <th style="padding:7px 10px;text-align:left;color:#9a3412;border-bottom:2px solid #fed7aa;white-space:nowrap;">행</th>
            <th style="padding:7px 10px;text-align:left;color:#9a3412;border-bottom:2px solid #fed7aa;white-space:nowrap;">직원</th>
            <th style="padding:7px 10px;text-align:left;color:#9a3412;border-bottom:2px solid #fed7aa;white-space:nowrap;">항목</th>
            <th style="padding:7px 10px;text-align:right;color:#9a3412;border-bottom:2px solid #fed7aa;white-space:nowrap;">엑셀 입력값</th>
            <th style="padding:7px 10px;text-align:right;color:#9a3412;border-bottom:2px solid #fed7aa;white-space:nowrap;">계약서 기준</th>
            <th style="padding:7px 10px;text-align:right;color:#9a3412;border-bottom:2px solid #fed7aa;white-space:nowrap;">차이</th>
          </tr>
        </thead>
        <tbody>
          ${fixedErrors.map(e=>`
            <tr style="border-bottom:1px solid #fed7aa;">
              <td style="padding:7px 10px;color:#9a3412;font-weight:700;">${e.row}행</td>
              <td style="padding:7px 10px;font-weight:600;">${e.empName}</td>
              <td style="padding:7px 10px;color:#7c2d12;font-weight:600;">${e.colName}</td>
              <td style="padding:7px 10px;text-align:right;color:#dc2626;font-weight:700;">${fmt(e.input)}</td>
              <td style="padding:7px 10px;text-align:right;color:#2563eb;font-weight:700;">${fmt(e.contract)}</td>
              <td style="padding:7px 10px;text-align:right;font-weight:700;color:${e.diff>0?'#dc2626':'#2563eb'};">
                ${e.diff>0?'+':''}${fmt(e.diff)}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>`;
  } else {
    fixedSec.style.display = 'none';
    fixedSec.innerHTML = '';
  }

  // ── 수식/계산 오류 섹션 ──
  const calcSec = document.getElementById('upload-calc-section');
  if(hasCalcErr){
    document.getElementById('upload-calc-tbody').innerHTML = calcErrors.map(e=>`
      <tr style="border-bottom:1px solid #fee2e2;">
        <td style="padding:7px 10px;font-weight:700;color:#dc2626;white-space:nowrap;">${e.row}행</td>
        <td style="padding:7px 10px;color:#6b7280;white-space:nowrap;">${e.colName}</td>
        <td style="padding:7px 10px;font-weight:600;white-space:nowrap;">${e.empName}</td>
        <td style="padding:7px 10px;font-size:11px;color:#64748b;">${e.desc||e.colName}</td>
        <td style="padding:7px 10px;text-align:right;color:#dc2626;white-space:nowrap;">${fmt(e.input)}</td>
        <td style="padding:7px 10px;text-align:right;color:#2563eb;white-space:nowrap;">${fmt(e.calc)}</td>
        <td style="padding:7px 10px;text-align:right;white-space:nowrap;color:${Math.abs(e.diff)>0?'#dc2626':'#10b981'};font-weight:600;">${e.diff>0?'+':''}${fmt(e.diff)}</td>
      </tr>`).join('');
    calcSec.style.display = 'block';
  } else {
    calcSec.style.display = 'none';
  }

  // ── 저장 예정 미리보기 ──
  const prevSec = document.getElementById('upload-preview-section');
  if(validRows.length){
    document.getElementById('upload-preview-count').textContent = validRows.length;
    document.getElementById('upload-preview-tbody').innerHTML = validRows.map(r=>`
      <tr style="border-bottom:1px solid #dcfce7;">
        <td style="padding:6px 10px;font-weight:600;">${r.emp.name}</td>
        <td style="padding:6px 10px;text-align:right;">${fmt(r.base)}</td>
        <td style="padding:6px 10px;text-align:right;color:#2563eb;font-weight:600;">${fmt(r.gross)}</td>
        <td style="padding:6px 10px;text-align:right;color:#dc2626;">${fmt(r.totalDed)}</td>
        <td style="padding:6px 10px;text-align:right;color:#065f46;font-weight:700;">${fmt(r.netPay)}</td>
      </tr>`).join('');
    prevSec.style.display = 'block';
  } else {
    prevSec.style.display = 'none';
  }

  // ── 직원 명단 요약 ──
  const empSec  = document.getElementById('upload-emp-section');
  const empList = document.getElementById('upload-emp-list');
  if(_uploadParsed && _uploadParsed.allRows){
    const coEmps = allEmployees.filter(e =>
      _uploadParsed.co && e.company_id===_uploadParsed.co.id &&
      (e.status==='재직'||e.status==='active')
    );
    const errRows = new Set([...calcErrors.map(e=>e.row), ...fixedErrors.map(e=>e.row)]);
    empList.innerHTML = `DB 재직 인원 <b>${coEmps.length}명</b> / 엑셀 데이터 <b>${_uploadParsed.allRows}행</b>`
      + (errRows.size ? ` / 오류 행 <b style="color:#dc2626">${errRows.size}행 제외</b>` : '')
      + ` / 저장 가능 <b style="color:#065f46">${validRows.length}명</b>`;
    empSec.style.display = 'block';
  }

  // ── 저장 버튼 ──
  const confirmBtn   = document.getElementById('upload-confirm-btn');
  const confirmLabel = document.getElementById('upload-confirm-label');
  if(canSave && validRows.length > 0){
    confirmBtn.style.display = 'inline-flex';
    if(hasAnyErr){
      confirmLabel.textContent = `오류 ${calcErrors.length+fixedErrors.length}건 제외 / ${validRows.length}명 저장`;
      confirmBtn.style.background = '#f59e0b';
    } else {
      confirmLabel.textContent = `전체 ${validRows.length}명 일괄 저장`;
      confirmBtn.style.background = '#0ea5e9';
    }
  } else {
    confirmBtn.style.display = 'none';
  }

  openModal('upload-report-modal');
}

async function confirmBulkUpload(){
  if(!_uploadParsed||!_uploadParsed.validRows.length) return;
  const {validRows,year,month,co}=_uploadParsed;
  const confirmBtn=document.getElementById('upload-confirm-btn');
  confirmBtn.disabled=true;
  confirmBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 저장 중...';

  let saved=0,skipped=0,overwritten=0;
  for(const r of validRows){
    try{
      // 중복 체크 (임시저장 제외)
      const dup=allPayrolls.find(p=>!p.is_draft&&p.employee_id===r.emp.id&&p.pay_year===year&&p.pay_month===month);
      if(dup){
        await api(`../tables/payrolls/${dup.id}`,{method:'DELETE'});
        overwritten++;
      }
      const body={
        id:'pay'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
        employee_id:r.emp.id, company_id:co.id,
        pay_year:year, pay_month:month,
        work_days:      r.workDays   || 0,
        total_work_hours:r.totalHrs  || 0,
        overtime_hours: r.otHours,
        night_hours:    r.nightHours,
        holiday_hours:  r.holHours,
        hourly_wage:    r.hourlyWage,
        base_salary:         r.base,
        weekly_holiday_pay:  r.weekHol,
        position_allowance:  r.posAlw,
        overtime_pay:        r.otPay,
        night_pay:           r.nightPay,
        holiday_pay:         r.holPay,
        // 카드형은 transp/selfDrv 분리, 테이블형은 car 단일값 → 각각 정확한 필드에 저장
        transportation_allowance: r.transp !== undefined ? r.transp : r.car,
        self_driving_allowance:   r.selfDrv !== undefined ? r.selfDrv : 0,
        car_maintenance:     r.transp !== undefined ? 0 : r.car, // 레거시: 카드형은 0, 테이블형은 car
        meal_allowance:      r.meal,
        annual_leave_pay:    r.annlPay,
        other_pay:           r.otherPay,
        gross_pay:           r.gross,
        standard_monthly_pay:r.std,
        income_tax:          r.incTax,
        local_income_tax:    r.localTax,
        health_insurance:    r.health,
        long_term_care:      r.ltCare,
        national_pension:    r.pension,
        employment_insurance:r.empIns,
        year_end_tax_adjust: r.yearEnd,
        health_insurance_adjust: r.healthAdj,
        advance_deduction:   r.advance,
        total_deduction:     r.totalDed,
        net_pay:             r.netPay,
        pay_date:            r.payDate,
        note:                r.note
      };
      await api('../tables/payrolls',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      saved++;
      await new Promise(res=>setTimeout(res,50)); // API 과부하 방지
    }catch(err){
      skipped++;
      console.error('저장 실패',r.emp.name,err);
    }
  }

  await loadPayrolls();
  renderPayrolls();
  renderDashboard();
  closeModal('upload-report-modal');
  _uploadParsed=null;
  document.getElementById('upload-file-name').textContent='';

  const msg=overwritten>0
    ?`✅ ${saved}명 급여 저장 완료 (덮어쓰기 ${overwritten}건${skipped?` / 실패 ${skipped}건`:''})`
    :`✅ ${saved}명 급여 저장 완료${skipped?` / 실패 ${skipped}건`:''}`;
  toast(msg,'success');
  confirmBtn.disabled=false;
  confirmBtn.innerHTML='<i class="fas fa-database"></i> 일괄 저장 실행';
}

// ─── EXCEL DOWNLOAD ───
function openExcelModal(){
  // 고객사 드롭다운 채우기
  const sel=document.getElementById('xl-company');
  sel.innerHTML='<option value="">-- 고객사를 선택하세요 --</option>'+
    allCompanies.map(c=>`<option value="${c.id}">${c.company_name}</option>`).join('');

  // 현재 임금대장 페이지에서 선택된 고객사로 자동 설정
  const xlDisplay = document.getElementById('xl-company-display');
  const xlNameLabel = document.getElementById('xl-company-name-label');
  if(currentPayCompanyId){
    sel.value = currentPayCompanyId;
    // 고객사가 선택된 경우: 드롭다운 숨기고 표시 배너 보이기
    const co = allCompanies.find(c=>c.id===currentPayCompanyId);
    if(co && xlNameLabel) xlNameLabel.textContent = co.company_name;
    if(xlDisplay){ xlDisplay.style.display='flex'; }
    sel.style.display='none';
  } else {
    // 고객사 미선택: 드롭다운 표시
    if(xlDisplay){ xlDisplay.style.display='none'; }
    sel.style.display='';
  }

  // 년도 드롭다운 동기화 (현재 선택된 연도 반영)
  const yrSel = document.getElementById('xl-year');
  const payYrSel = document.getElementById('pay-year-filter');
  if(payYrSel && payYrSel.value){
    // 해당 연도가 옵션에 없으면 추가
    if(!Array.from(yrSel.options).find(o=>o.value===payYrSel.value)){
      yrSel.innerHTML += `<option value="${payYrSel.value}">${payYrSel.value}년</option>`;
    }
    yrSel.value = payYrSel.value;
  } else {
    // 현재 연도 기본 선택
    const curYr = String(new Date().getFullYear());
    if(!Array.from(yrSel.options).find(o=>o.value===curYr)){
      yrSel.innerHTML += `<option value="${curYr}">${curYr}년</option>`;
    }
    yrSel.value = curYr;
  }

  // 월 드롭다운 (현재 임금대장에서 선택된 월 반영)
  const ms=document.getElementById('xl-month');
  ms.innerHTML='';
  const payMoSel = document.getElementById('pay-month-filter');
  const curMo = payMoSel && payMoSel.value ? parseInt(payMoSel.value) : new Date().getMonth()+1;
  for(let i=1;i<=12;i++) ms.innerHTML+=`<option value="${i}" ${i===curMo?'selected':''}>${i}월</option>`;

  // 안내 문구 업데이트
  const infoBox = document.getElementById('xl-info-box');
  if(infoBox && currentPayCompanyId){
    const co2 = allCompanies.find(c=>c.id===currentPayCompanyId);
    const coNm = co2 ? co2.company_name : '';
    infoBox.innerHTML = `<i class="fas fa-check-circle" style="margin-right:5px;color:#16a34a;"></i>
      <b>${coNm}</b>의 재직 직원 임금대장이 선택된 연·월 기준으로 생성됩니다.<br>
      <span style="color:#15803d;">기존 저장된 급여 데이터가 있으면 자동으로 채워집니다.</span>`;
  } else if(infoBox){
    infoBox.innerHTML = `<i class="fas fa-info-circle" style="margin-right:5px;"></i>
      선택한 고객사의 <b>전체 재직 직원</b>이 행으로 구성된 임금대장 양식이 생성됩니다.<br>
      지급 항목·공제 항목 열이 미리 완성되어 있으며, 금액 셀에 직접 입력하시면 됩니다.`;
  }

  // 고객사가 선택된 경우 직원 미리보기 자동 표시
  if(currentPayCompanyId){
    onXlCompanyChange();
  } else {
    document.getElementById('xl-preview').style.display='none';
  }

  openModal('excel-modal');
}

function onXlCompanyChange(){
  const coId=document.getElementById('xl-company').value;
  const preview=document.getElementById('xl-preview');
  const list=document.getElementById('xl-preview-list');
  if(!coId){preview.style.display='none';return;}
  const emps=allEmployees.filter(e=>e.company_id===coId&&(e.status==='재직'||e.status==='active'));
  if(!emps.length){list.innerHTML='<span style="color:#aaa;">해당 고객사의 재직 직원이 없습니다.</span>';preview.style.display='block';return;}
  list.innerHTML=emps.map((e,i)=>`<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px;">
    <i class="fas fa-user-circle" style="color:#10b981;"></i>${e.name}
    <span style="color:#aaa;font-size:11px;">${e.department||''} ${e.position||''}</span>
  </span>`).join('');
  preview.style.display='block';
}

async function downloadPayrollExcel(){
  // 임금대장 페이지에서 이미 선택된 고객사가 있으면 우선 사용
  const coId = (typeof currentPayCompanyId !== 'undefined' && currentPayCompanyId)
    ? currentPayCompanyId
    : document.getElementById('xl-company').value;
  const yr=parseInt(document.getElementById('xl-year').value);
  const mo=parseInt(document.getElementById('xl-month').value);
  const fillExisting=document.getElementById('xl-opt-existing').checked;
  const fillContract=document.getElementById('xl-opt-contract').checked;

  if(!coId) return toast('고객사를 선택하세요.','error');
  if(!yr||!mo) return toast('년도와 월을 선택하세요.','error');

  const co=allCompanies.find(c=>c.id===coId);
  const emps=allEmployees.filter(e=>e.company_id===coId&&(e.status==='재직'||e.status==='active'));
  if(!emps.length) return toast('재직 직원이 없습니다.','error');

  toast('엑셀 파일 생성 중...','success');

  const WB=XLSX.utils.book_new();

  /* ── 색상 팔레트 ── */
  const C={
    TITLE_BG:'1A1A2E', TITLE_FG:'FFFFFF',
    COINFO_BG:'E94560', COINFO_FG:'FFFFFF',
    PAY_BG:'1D4ED8',   PAY_FG:'FFFFFF',
    DED_BG:'DC2626',   DED_FG:'FFFFFF',
    SUM_BG:'065F46',   SUM_FG:'FFFFFF',
    SUB_BG:'DBEAFE',   SUB_FG:'1E3A8A',
    DSUB_BG:'FEE2E2',  DSUB_FG:'7F1D1D',
    EMP_BG:'F0FDF4',   EMP_FG:'166534',
    TOTAL_BG:'FEF9C3', TOTAL_FG:'78350F',
    BORDER:'BFDBFE',
    WHITE:'FFFFFF', GRAY:'F8FAFC', LGRAY:'E2E8F0'
  };

  const border={
    top:{style:'thin',color:{rgb:'CBD5E1'}},
    bottom:{style:'thin',color:{rgb:'CBD5E1'}},
    left:{style:'thin',color:{rgb:'CBD5E1'}},
    right:{style:'thin',color:{rgb:'CBD5E1'}}
  };
  const thickBorderBottom={
    top:{style:'thin',color:{rgb:'CBD5E1'}},
    bottom:{style:'medium',color:{rgb:'94A3B8'}},
    left:{style:'thin',color:{rgb:'CBD5E1'}},
    right:{style:'thin',color:{rgb:'CBD5E1'}}
  };

  function cell(v,style={}){
    const c={v,s:style};
    if(typeof v==='number') c.t='n'; else c.t='s';
    return c;
  }
  function hdr(v,bg,fg,bold=true,sz=10){
    return cell(v,{
      fill:{fgColor:{rgb:bg}},
      font:{bold,color:{rgb:fg},sz,name:'맑은 고딕'},
      alignment:{horizontal:'center',vertical:'center',wrapText:true},
      border
    });
  }
  function num(v,bg='FFFFFF',fg='1A1A2E',bold=false){
    const fmt='#,##0';
    return {v:v||0,t:'n',z:fmt,s:{
      fill:{fgColor:{rgb:bg}},font:{color:{rgb:fg},bold,sz:10,name:'맑은 고딕'},
      alignment:{horizontal:'right',vertical:'center'},border
    }};
  }
  function txt(v,bg='FFFFFF',fg='374151',bold=false,align='left'){
    return cell(v||'',{
      fill:{fgColor:{rgb:bg}},
      font:{color:{rgb:fg},bold,sz:10,name:'맑은 고딕'},
      alignment:{horizontal:align,vertical:'center',wrapText:true},
      border
    });
  }

  /* ─────────────────────────────────────────────
     시트 1 : 임금대장 (전체 직원 한 페이지)
  ───────────────────────────────────────────── */
  const data1=[];

  /* 타이틀 행 */
  const moStr=String(mo).padStart(2,'0');
  data1.push([
    hdr(`${co.company_name}  |  ${yr}년 ${moStr}월 임금대장`,C.TITLE_BG,C.TITLE_FG,true,13)
  ]);
  data1.push([
    txt(`사업자번호: ${co.business_number||'-'}  /  대표자: ${co.representative||'-'}  /  급여지급일: ${co.pay_day||'-'}일  /  산정기간: ${co.pay_period||'-'}`,C.COINFO_BG,C.COINFO_FG,false,9)
  ]);
  data1.push([txt('')]); // 공백

  /* 열 헤더 정의 */
  const COL_GROUPS=[
    {label:'인적사항',cols:['No','사원번호','성명','부서','직책','고용형태'],bg:C.EMP_BG,fg:C.EMP_FG},
    {label:'근로실적',cols:['근로일수','총근로시간'],bg:'334155',fg:'F1F5F9'},
    {label:'지급 내역',cols:['기본급','주휴수당','자격(직책)수당','차량유지비','식대','연장수당','야간수당','휴일수당','연차수당','기타수당','지급총액'],bg:C.PAY_BG,fg:C.PAY_FG},
    {label:'공제 내역',cols:['소득세','지방소득세','건강보험','장기요양','국민연금','고용보험','연말정산','건보정산','기타공제','공제합계'],bg:C.DED_BG,fg:C.DED_FG},
    {label:'지급',cols:['영수액(실수령)','지급일','비고'],bg:C.SUM_BG,fg:C.SUM_FG}
  ];

  /* 그룹 헤더 행 */
  const groupRow=[];
  COL_GROUPS.forEach(g=>{
    g.cols.forEach((c,i)=>{
      groupRow.push(i===0?hdr(g.label,g.bg,g.fg,true,10):hdr('',g.bg,g.fg,false,10));
    });
  });
  data1.push(groupRow);

  /* 컬럼명 행 */
  const colRow=[];
  COL_GROUPS.forEach(g=>{
    g.cols.forEach(c=>{
      colRow.push({v:c,t:'s',s:{
        fill:{fgColor:{rgb:g.bg==='1D4ED8'?C.SUB_BG:g.bg==='DC2626'?C.DSUB_BG:g.bg==='065F46'?'D1FAE5':g.bg==='1A1A2E'?'E2E8F0':'F1F5F9'}},
        font:{bold:true,color:{rgb:g.bg==='1D4ED8'?C.SUB_FG:g.bg==='DC2626'?C.DSUB_FG:g.bg==='065F46'?'065F46':'334155'},sz:9,name:'맑은 고딕'},
        alignment:{horizontal:'center',vertical:'center',wrapText:true},
        border:thickBorderBottom
      }});
    });
  });
  data1.push(colRow);

  /* 데이터 행 */
  emps.forEach((e,idx)=>{
    const ct=allContracts.find(c=>c.employee_id===e.id&&(c.status==='활성'||c.status==='active'))||null;
    const py=fillExisting?allPayrolls.find(p=>p.employee_id===e.id&&p.pay_year===yr&&p.pay_month===mo):null;

    const baseSal= py?py.base_salary:(fillContract&&ct?ct.base_salary:0);
    const weekHol= py?py.weekly_holiday_pay:(fillContract&&ct?ct.weekly_holiday_pay:0);
    const posAlw=  py?py.position_allowance:(fillContract&&ct?ct.position_allowance:0);
    const carAlw=  py?py.car_maintenance:(fillContract&&ct?ct.car_maintenance:0);
    const mealAlw= py?py.meal_allowance:(fillContract&&ct?ct.meal_allowance:0);
    const otPay=   py?py.overtime_pay:0;
    const nightPay=py?py.night_pay:0;
    const holPay=  py?py.holiday_pay:0;
    const annlPay= py?py.annual_leave_pay:0;
    const otherPay=py?py.other_pay:(fillContract&&ct?ct.other_allowance:0);
    const gross=   py?py.gross_pay:(baseSal+weekHol+posAlw+carAlw+mealAlw+otherPay);

    const incTax=  py?py.income_tax:0;
    const locTax=  py?py.local_income_tax:0;
    const health=  py?py.health_insurance:0;
    const ltCare=  py?py.long_term_care:0;
    const pension= py?py.national_pension:0;
    const empIns=  py?py.employment_insurance:0;
    const yearEnd= py?py.year_end_tax_adjust:0;
    const healthAdj=py?py.health_insurance_adjust:0;
    const advance= py?py.advance_deduction:0;
    // totalDed·netPay는 DB 저장값을 사용하되, 항목 합산과 큰 차이가 있으면 항목 합산으로 재계산
    // (테스트 데이터 생성 오류 등으로 total_deduction이 잘못 저장된 경우 방어)
    const calcTotalDed=incTax+locTax+health+ltCare+pension+empIns+yearEnd+healthAdj+advance;
    const rawTotalDed=py?py.total_deduction:calcTotalDed;
    const totalDed=Math.abs(rawTotalDed-calcTotalDed)>50?calcTotalDed:rawTotalDed;
    const rawNetPay=py?py.net_pay:(gross-totalDed);
    const netPay=Math.abs(rawNetPay-(gross-totalDed))>50?(gross-totalDed):rawNetPay;
    const payDate= py?py.pay_date:'';

    const workDays=py?py.work_days:0;
    const totalHours=py?py.total_work_hours:0;
    const rowBg=idx%2===0?'FFFFFF':'F8FAFC';
    const workBg='F8FAFC';

    data1.push([
      /* 인적사항 */
      num(idx+1,rowBg,'6B7280'),
      txt(e.employee_number||'-',rowBg),
      txt(e.name,rowBg,'111827',true),
      txt(e.department||'-',rowBg),
      txt(e.position||'-',rowBg),
      txt(e.employment_category||'-',rowBg),
      /* 근로실적 */
      num(workDays,workBg,'334155'),
      num(totalHours,workBg,'334155'),
      /* 지급 */
      num(baseSal,rowBg),
      num(weekHol,rowBg,'92400E'),
      num(posAlw,rowBg),
      num(carAlw,rowBg),
      num(mealAlw,rowBg),
      num(otPay,rowBg,'1D4ED8'),
      num(nightPay,rowBg,'1D4ED8'),
      num(holPay,rowBg,'1D4ED8'),
      num(annlPay,rowBg),
      num(otherPay,rowBg),
      num(gross,'DBEAFE','1D4ED8',true),
      /* 공제 */
      num(incTax,rowBg,'7F1D1D'),
      num(locTax,rowBg,'7F1D1D'),
      num(health,rowBg,'991B1B'),
      num(ltCare,rowBg,'991B1B'),
      num(pension,rowBg,'92400E'),
      num(empIns,rowBg,'065F46'),
      num(yearEnd,rowBg),
      num(healthAdj,rowBg),
      num(advance,rowBg),
      num(totalDed,'FEE2E2','DC2626',true),
      /* 지급 */
      num(netPay,'D1FAE5','065F46',true),
      txt(payDate,rowBg,'6B7280',false,'center'),
      txt(py?py.note||'':'',rowBg,'9CA3AF')
    ]);
  });

  /* 합계 행 — 총 32열 (XCOL 기준) */
  const sumRow=[
    hdr('합 계',C.TOTAL_BG,C.TOTAL_FG,true,10),
    hdr('',C.TOTAL_BG,C.TOTAL_FG),hdr('',C.TOTAL_BG,C.TOTAL_FG),
    hdr('',C.TOTAL_BG,C.TOTAL_FG),hdr('',C.TOTAL_BG,C.TOTAL_FG),hdr('',C.TOTAL_BG,C.TOTAL_FG),
    hdr('',C.TOTAL_BG,C.TOTAL_FG),hdr('',C.TOTAL_BG,C.TOTAL_FG) // 근로실적 2열
  ];
  // 지급·공제(ci 8~28) 합계
  for(let ci=8;ci<=28;ci++){
    const total=emps.reduce((s,e,i)=>{
      const row=data1[5+i]; // raw index: 타이틀(0),회사(1),공백(2),그룹(3),컬럼(4) → 데이터 5부터
      return s+(row&&row[ci]&&typeof row[ci].v==='number'?row[ci].v:0);
    },0);
    const isBigTotal=ci===18||ci===28; // 지급총액, 공제합계
    sumRow.push({v:total,t:'n',z:'#,##0',s:{
      fill:{fgColor:{rgb:isBigTotal?C.TOTAL_BG:'FEF3C7'}},
      font:{bold:true,color:{rgb:isBigTotal?C.TOTAL_FG:'78350F'},sz:10,name:'맑은 고딕'},
      alignment:{horizontal:'right',vertical:'center'},border
    }});
  }
  // 영수액(ci=29) 합계
  const netTotal=emps.reduce((s,e,i)=>{
    const row=data1[5+i];
    return s+(row&&row[29]&&typeof row[29].v==='number'?row[29].v:0);
  },0);
  sumRow.push({v:netTotal,t:'n',z:'#,##0',s:{
    fill:{fgColor:{rgb:'D1FAE5'}},font:{bold:true,color:{rgb:'065F46'},sz:11,name:'맑은 고딕'},
    alignment:{horizontal:'right',vertical:'center'},border
  }});
  sumRow.push(hdr('',C.TOTAL_BG,C.TOTAL_FG)); // 지급일
  sumRow.push(hdr('',C.TOTAL_BG,C.TOTAL_FG)); // 비고
  data1.push(sumRow);

  /* 안내 행 */
  data1.push([txt('')]);
  data1.push([txt('※ 본 임금대장은 [급여 관리 시스템]에서 자동 생성된 양식입니다. 금액 입력 후 서명·날인하여 보관하십시오.',C.GRAY,'94A3B8',false)]);

  const WS1=XLSX.utils.aoa_to_sheet(data1);

  /* 열 너비 설정 (총 32열) */
  WS1['!cols']=[
    {wch:5},{wch:10},{wch:10},{wch:12},{wch:10},{wch:8},    // 인적사항 (0~5)
    {wch:9},{wch:10},                                        // 근로실적 (6~7)
    {wch:12},{wch:12},{wch:12},{wch:12},{wch:10},            // 지급고정 (8~12)
    {wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:13},   // 연장·합계 (13~18)
    {wch:11},{wch:11},{wch:11},{wch:11},{wch:11},{wch:11},   // 공제 (19~24)
    {wch:12},{wch:12},{wch:12},{wch:13},                     // 공제합계 (25~28)
    {wch:14},{wch:12},{wch:16}                               // 영수·날짜·비고 (29~31)
  ];

  /* 행 높이 */
  WS1['!rows']=[{hpt:30},{hpt:20},{hpt:6},{hpt:24},{hpt:36}];
  for(let i=0;i<emps.length;i++) WS1['!rows'].push({hpt:22});
  WS1['!rows'].push({hpt:26});
  WS1['!rows'].push({hpt:8});
  WS1['!rows'].push({hpt:18});

  /* 타이틀·회사정보 행 병합 */
  const totalCols=32;
  WS1['!merges']=[
    {s:{r:0,c:0},e:{r:0,c:totalCols-1}},
    {s:{r:1,c:0},e:{r:1,c:totalCols-1}},
    {s:{r:2,c:0},e:{r:2,c:totalCols-1}},
    /* 그룹 헤더 병합 */
    {s:{r:3,c:0},e:{r:3,c:5}},    // 인적사항
    {s:{r:3,c:6},e:{r:3,c:7}},    // 근로실적
    {s:{r:3,c:8},e:{r:3,c:18}},   // 지급
    {s:{r:3,c:19},e:{r:3,c:28}},  // 공제
    {s:{r:3,c:29},e:{r:3,c:31}},  // 지급(영수)
    /* 합계 행 앞 병합 */
    {s:{r:5+emps.length,c:0},e:{r:5+emps.length,c:7}},
    /* 안내문 병합 */
    {s:{r:7+emps.length,c:0},e:{r:7+emps.length,c:totalCols-1}},
  ];

  XLSX.utils.book_append_sheet(WB,WS1,'임금대장');

  /* ─────────────────────────────────────────────
     시트 2~ : 직원별 개인 급여명세서 (1인 1시트)
  ───────────────────────────────────────────── */
  emps.forEach((e,idx)=>{
    const ct=allContracts.find(c=>c.employee_id===e.id&&(c.status==='활성'||c.status==='active'))||null;
    const py=fillExisting?allPayrolls.find(p=>p.employee_id===e.id&&p.pay_year===yr&&p.pay_month===mo):null;

    const baseSal= py?py.base_salary:(fillContract&&ct?ct.base_salary:0);
    const weekHol= py?py.weekly_holiday_pay:(fillContract&&ct?ct.weekly_holiday_pay:0);
    const posAlw=  py?py.position_allowance:(fillContract&&ct?ct.position_allowance:0);
    const carAlw=  py?py.car_maintenance:(fillContract&&ct?ct.car_maintenance:0);
    const mealAlw= py?py.meal_allowance:(fillContract&&ct?ct.meal_allowance:0);
    const otPay=   py?py.overtime_pay:0;
    const nightPay=py?py.night_pay:0;
    const holPay=  py?py.holiday_pay:0;
    const annlPay= py?py.annual_leave_pay:0;
    const otherPay=py?py.other_pay:(fillContract&&ct?ct.other_allowance:0);
    const gross=   py?py.gross_pay:(baseSal+weekHol+posAlw+carAlw+mealAlw+otherPay);
    const incTax=  py?py.income_tax:0;
    const locTax=  py?py.local_income_tax:0;
    const health=  py?py.health_insurance:0;
    const ltCare=  py?py.long_term_care:0;
    const pension= py?py.national_pension:0;
    const empIns=  py?py.employment_insurance:0;
    const yearEnd= py?py.year_end_tax_adjust:0;
    const healthAdj=py?py.health_insurance_adjust:0;
    const advance= py?py.advance_deduction:0;
    // totalDed·netPay: DB값과 항목합산 차이가 크면 항목합산으로 재계산
    const calcTotalDed2=incTax+locTax+health+ltCare+pension+empIns+yearEnd+healthAdj+advance;
    const rawTotalDed2=py?py.total_deduction:calcTotalDed2;
    const totalDed=Math.abs(rawTotalDed2-calcTotalDed2)>50?calcTotalDed2:rawTotalDed2;
    const rawNetPay2=py?py.net_pay:(gross-totalDed);
    const netPay=Math.abs(rawNetPay2-(gross-totalDed))>50?(gross-totalDed):rawNetPay2;
    const payDateStr=py?py.pay_date||`${yr}-${moStr}-${co.pay_day||'25'}`:'';
    const workDays=py?py.work_days||0:0;
    const otHours=py?py.overtime_hours||0:0;

    /* ── 명세서 데이터 구성 (6열 레이아웃: 지급2 + 공제2 + 여백2) ── */
    const ds=[];
    // 셀 헬퍼 (명세서 전용)
    const sl=(v,bg,fg,bold,sz)=>({v:v||'',t:'s',s:{fill:{fgColor:{rgb:bg||'FFFFFF'}},font:{bold:!!bold,sz:sz||10,name:'맑은 고딕',color:{rgb:fg||'000000'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:{top:{style:'thin',color:{rgb:'CBD5E1'}},bottom:{style:'thin',color:{rgb:'CBD5E1'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}}}});
    const sr=(v,bg,fg,bold,sz)=>({v:v,t:typeof v==='number'?'n':'s',z:typeof v==='number'?'#,##0':undefined,s:{fill:{fgColor:{rgb:bg||'FFFFFF'}},font:{bold:!!bold,sz:sz||10,name:'맑은 고딕',color:{rgb:fg||'111827'}},alignment:{horizontal:'right',vertical:'center'},border:{top:{style:'thin',color:{rgb:'CBD5E1'}},bottom:{style:'thin',color:{rgb:'CBD5E1'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}}}});
    const se=(bg)=>({v:'',t:'s',s:{fill:{fgColor:{rgb:bg||'FFFFFF'}},border:{top:{style:'thin',color:{rgb:'CBD5E1'}},bottom:{style:'thin',color:{rgb:'CBD5E1'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}}}});
    const nb=(bg)=>({v:'',t:'s',s:{fill:{fgColor:{rgb:bg||'FFFFFF'}}}});  // no border

    // ── 행 0: 타이틀 (6열) ──
    ds.push([
      hdr('급  여  명  세  서',C.TITLE_BG,C.TITLE_FG,true,15),
      nb(C.TITLE_BG),nb(C.TITLE_BG),nb(C.TITLE_BG),nb(C.TITLE_BG),nb(C.TITLE_BG),
    ]);
    // ── 행 1: 회사명 / 지급기간 / 지급일 ──
    ds.push([
      txt(co.company_name,C.COINFO_BG,C.COINFO_FG,true,11),
      nb(C.COINFO_BG),
      txt(`${yr}년 ${moStr}월분 급여`,C.COINFO_BG,C.COINFO_FG,true,11),
      nb(C.COINFO_BG),
      txt(`지급일: ${payDateStr||'-'}`,C.COINFO_BG,C.COINFO_FG,false,10),
      nb(C.COINFO_BG),
    ]);
    // ── 행 2: 구분선 ──
    ds.push([nb('E2E8F0'),nb('E2E8F0'),nb('E2E8F0'),nb('E2E8F0'),nb('E2E8F0'),nb('E2E8F0')]);

    // ── 행 3~5: 인적사항 (6열 그리드) ──
    const LBG='EFF6FF', VBG='F8FAFC', LFG='1E40AF', VFG='1E293B';
    ds.push([sl('성   명',LBG,LFG,true),sl(e.name,VBG,VFG,true,11),sl('부서/직책',LBG,LFG,true),sl(`${e.department||'-'} / ${e.position||'-'}`,VBG,VFG,false),sl('사원번호',LBG,LFG,true),sl(e.employee_number||'-',VBG,VFG,false)]);
    ds.push([sl('고용형태',LBG,LFG,true),sl(e.employment_category||'-',VBG,VFG,false),sl('근로일수',LBG,LFG,true),sl(workDays?`${workDays}일`:'-',VBG,VFG,false),sl('연장근로',LBG,LFG,true),sl(otHours?`${otHours}시간`:'-',VBG,VFG,false)]);
    ds.push([sl('입사일',LBG,LFG,true),sl(e.hire_date||'-',VBG,VFG,false),sl('계좌번호',LBG,LFG,true),sl(e.bank_account?`${e.bank||''} ${e.bank_account}`:'-',VBG,VFG,false),se(VBG),se(VBG)]);

    // ── 행 6: 여백 ──
    ds.push([nb('F1F5F9'),nb('F1F5F9'),nb('F1F5F9'),nb('F1F5F9'),nb('F1F5F9'),nb('F1F5F9')]);

    // ── 행 7: 지급/공제 섹션 헤더 ──
    ds.push([
      hdr('지 급 항 목',C.PAY_BG,C.PAY_FG,true,10),hdr('금   액',C.PAY_BG,C.PAY_FG,true,10),
      hdr('',C.PAY_BG,C.PAY_FG),
      hdr('공 제 항 목',C.DED_BG,C.DED_FG,true,10),hdr('금   액',C.DED_BG,C.DED_FG,true,10),
      hdr('',C.DED_BG,C.DED_FG),
    ]);

    // ── 지급/공제 항목 ──
    const payItems=[
      ['기본급',baseSal],['주휴수당',weekHol],['직책수당',posAlw],
      ['차량유지비',carAlw],['식대',mealAlw],
      ['연장수당',otPay],['야간수당',nightPay],
      ['휴일수당',holPay],['연차수당',annlPay],['기타수당',otherPay],
    ];
    const dedItems=[
      ['소득세',incTax],['지방소득세',locTax],
      ['건강보험',health],['장기요양보험',ltCare],
      ['국민연금',pension],['고용보험',empIns],
      ['연말정산',yearEnd],['건보정산',healthAdj],
      ['기타(선지급)공제',advance],
    ];
    const maxLen=Math.max(payItems.length,dedItems.length);
    const oddPay='EFF6FF', evnPay='DBEAFE';
    const oddDed='FFF5F5', evnDed='FEE2E2';
    for(let r=0;r<maxLen;r++){
      const p=payItems[r]||['',null];
      const d=dedItems[r]||['',null];
      const pbg=r%2===0?oddPay:evnPay;
      const dbg=r%2===0?oddDed:evnDed;
      ds.push([
        sl(p[0],pbg,'1E3A8A',false),
        (p[1]!==null&&p[1]!==0&&p[1]!==undefined)?sr(p[1],pbg,'1D4ED8',false):se(pbg),
        se(pbg),
        sl(d[0],dbg,'7F1D1D',false),
        (d[1]!==null&&d[1]!==0&&d[1]!==undefined)?sr(d[1],dbg,'DC2626',false):se(dbg),
        se(dbg),
      ]);
    }

    // ── 지급총액 / 공제합계 행 ──
    ds.push([
      hdr('지 급 총 액',C.PAY_BG,C.PAY_FG,true,10),
      {v:gross,t:'n',z:'#,##0',s:{fill:{fgColor:{rgb:'BFDBFE'}},font:{bold:true,color:{rgb:'1D4ED8'},sz:12,name:'맑은 고딕'},alignment:{horizontal:'right',vertical:'center'},border:{top:{style:'medium',color:{rgb:'3B82F6'}},bottom:{style:'medium',color:{rgb:'3B82F6'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}}}},
      se('BFDBFE'),
      hdr('공 제 합 계',C.DED_BG,C.DED_FG,true,10),
      {v:totalDed,t:'n',z:'#,##0',s:{fill:{fgColor:{rgb:'FECACA'}},font:{bold:true,color:{rgb:'DC2626'},sz:12,name:'맑은 고딕'},alignment:{horizontal:'right',vertical:'center'},border:{top:{style:'medium',color:{rgb:'EF4444'}},bottom:{style:'medium',color:{rgb:'EF4444'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}}}},
      se('FECACA'),
    ]);

    // ── 여백 ──
    ds.push([nb('F8FAFC'),nb('F8FAFC'),nb('F8FAFC'),nb('F8FAFC'),nb('F8FAFC'),nb('F8FAFC')]);

    // ── 실수령액 강조 행 ──
    const netRowStyle={fill:{fgColor:{rgb:'ECFDF5'}},font:{bold:true,color:{rgb:'065F46'},sz:14,name:'맑은 고딕'},alignment:{horizontal:'right',vertical:'center'},border:{top:{style:'medium',color:{rgb:'10B981'}},bottom:{style:'medium',color:{rgb:'10B981'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}}};
    ds.push([
      hdr('실   수   령   액   ( 영 수 액 )','D1FAE5','065F46',true,12),
      nb('D1FAE5'),nb('D1FAE5'),nb('D1FAE5'),
      {v:netPay,t:'n',z:'#,##0',s:netRowStyle},
      se('ECFDF5'),
    ]);

    // ── 여백 ──
    ds.push([nb('FFFFFF'),nb('FFFFFF'),nb('FFFFFF'),nb('FFFFFF'),nb('FFFFFF'),nb('FFFFFF')]);

    // ── 서명·날인란 ──
    const signBg='FAFAFA', signLBG='F1F5F9';
    ds.push([
      sl('위와 같이 급여를 지급하였음을 확인합니다.',signBg,'6B7280',false,9),
      nb(signBg),nb(signBg),nb(signBg),nb(signBg),nb(signBg),
    ]);
    // 사용자·회사 서명 박스 (2열 나란히)
    ds.push([
      sl('지급자(회사)',signLBG,'374151',true),
      sl(`${co.company_name}`,signBg,'374151',false),
      sl('대표자',signLBG,'374151',true),
      sl(co.representative||'',signBg,'374151',false),
      sl('(인)',signBg,'374151',true),
      nb(signBg),
    ]);
    ds.push([
      sl('수령자(직원)',signLBG,'374151',true),
      sl(e.name,signBg,'374151',false),
      sl('서명',signLBG,'374151',true),
      {v:'',t:'s',s:{fill:{fgColor:{rgb:signBg}},font:{sz:10},alignment:{horizontal:'left'},border:{top:{style:'thin',color:{rgb:'CBD5E1'}},bottom:{style:'medium',color:{rgb:'64748B'}},left:{style:'thin',color:{rgb:'CBD5E1'}},right:{style:'thin',color:{rgb:'CBD5E1'}}}}},
      nb(signBg),nb(signBg),
    ]);
    ds.push([nb('FFFFFF'),nb('FFFFFF'),nb('FFFFFF'),nb('FFFFFF'),nb('FFFFFF'),nb('FFFFFF')]);

    /* ── 시트 생성 ── */
    const WS=XLSX.utils.aoa_to_sheet(ds);
    // 6열: 항목명(넓), 금액(넓), 여백(좁), 항목명(넓), 금액(넓), 여백(좁)
    WS['!cols']=[{wch:17},{wch:16},{wch:3},{wch:16},{wch:16},{wch:3}];

    // 행 높이 설정
    const rowHpts=[32,22,4,22,22,22,4,24];
    WS['!rows']=[];
    for(let r=0;r<rowHpts.length;r++) WS['!rows'][r]={hpt:rowHpts[r]};
    for(let r=rowHpts.length;r<rowHpts.length+maxLen;r++) WS['!rows'][r]={hpt:21};
    const afterItems=rowHpts.length+maxLen;
    WS['!rows'][afterItems]={hpt:24};     // 지급총액/공제합계
    WS['!rows'][afterItems+1]={hpt:4};   // 여백
    WS['!rows'][afterItems+2]={hpt:30};  // 실수령액
    WS['!rows'][afterItems+3]={hpt:6};   // 여백
    WS['!rows'][afterItems+4]={hpt:18};  // 안내문
    WS['!rows'][afterItems+5]={hpt:24};  // 지급자
    WS['!rows'][afterItems+6]={hpt:24};  // 수령자
    WS['!rows'][afterItems+7]={hpt:6};   // 여백

    // 셀 병합
    WS['!merges']=[
      // 타이틀 (행0 전체)
      {s:{r:0,c:0},e:{r:0,c:5}},
      // 회사정보 (행1)
      {s:{r:1,c:0},e:{r:1,c:1}},{s:{r:1,c:2},e:{r:1,c:3}},{s:{r:1,c:4},e:{r:1,c:5}},
      // 구분선 (행2)
      {s:{r:2,c:0},e:{r:2,c:5}},
      // 인적사항 값셀 여백 병합 불필요 (6열 모두 사용)
      // 행3: 계좌번호 값 (c:3~5)
      {s:{r:5,c:3},e:{r:5,c:4}},
      // 여백행 (행6)
      {s:{r:6,c:0},e:{r:6,c:5}},
      // 섹션헤더 (행7): 지급2열병합, 공제2열병합
      {s:{r:7,c:0},e:{r:7,c:1}},{s:{r:7,c:3},e:{r:7,c:4}},
      // 지급/공제 각 항목행: col2(여백), col5(여백) → 개별 단순셀
      // 지급총액/공제합계 (afterItems행)
      {s:{r:afterItems,c:1},e:{r:afterItems,c:2}},
      {s:{r:afterItems,c:4},e:{r:afterItems,c:5}},
      // 여백 (afterItems+1)
      {s:{r:afterItems+1,c:0},e:{r:afterItems+1,c:5}},
      // 실수령액 (afterItems+2): 좌측 4열 병합, 금액 2열
      {s:{r:afterItems+2,c:0},e:{r:afterItems+2,c:3}},
      {s:{r:afterItems+2,c:4},e:{r:afterItems+2,c:5}},
      // 여백
      {s:{r:afterItems+3,c:0},e:{r:afterItems+3,c:5}},
      // 안내문
      {s:{r:afterItems+4,c:0},e:{r:afterItems+4,c:5}},
      // 지급자 회사명 (c1~2 병합)
      {s:{r:afterItems+5,c:1},e:{r:afterItems+5,c:2}},
      // 수령자 서명란 (c3~5)
      {s:{r:afterItems+6,c:3},e:{r:afterItems+6,c:5}},
      // 여백
      {s:{r:afterItems+7,c:0},e:{r:afterItems+7,c:5}},
    ];

    // 시트명: 순번(2자리)+이름, 중복 방지(동명이인 시 _2, _3 추가), 특수문자 제거, 최대 31자
    const baseName=`${String(idx+1).padStart(2,'0')}_${e.name}`.replace(/[:\\\/\?\*\[\]]/g,'').substring(0,29);
    let sheetName=baseName;
    let dupCount=2;
    while(WB.SheetNames.includes(sheetName)){
      sheetName=`${baseName.substring(0,27)}_${dupCount}`;
      dupCount++;
    }
    XLSX.utils.book_append_sheet(WB,WS,sheetName);
  });

  /* ─── 파일명·다운로드 ─── */
  const fname=`[${co.company_name}]_임금대장_${yr}년${moStr}월.xlsx`;
  XLSX.writeFile(WB,fname);
  closeModal('excel-modal');
  toast(`📥 ${fname} 다운로드 완료`,'success');
}
