// ─── 브랜드 서명 (모든 발송 메시지 하단 공통) ───
const _BRAND_SIG = '─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스';

// ─── EMPLOYEES ───
// ─── CONTRACTS ───
function toggleEmExpire(){
  const rawCat = document.getElementById('ct-em-category').value;
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const expInput   = document.getElementById('ct-em-expire');
  const expRow     = document.getElementById('ct-new-row-expire');
  const expReqSpan = document.getElementById('ct-expire-required');
  // 계약직·계약직 수습·일용직만 퇴사예정일 표시 (정규직·정규직 수습은 무기한 계약이므로 숨김)
  const isFixed    = cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION || cat ===CONTRACT_TYPE.DAILY;
  // 계약직·계약직 수습·일용직 모두 종료일 필수 (* 표시)
  const isRequired = isFixed;
  if(expRow)     expRow.style.display     = isFixed ? '' : 'none';
  if(expReqSpan) expReqSpan.style.display = isRequired ? '' : 'none';
  expInput.disabled = !isFixed;
  expInput.style.background = isFixed ? '' : '#f3f4f6';
  expInput.style.color = isFixed ? '' : '#9ca3af';
  expInput.style.cursor = isFixed ? '' : 'not-allowed';
  if(!isFixed) expInput.value = '';
  // 고용형태 변경 시 계약기간 유효성 재검사
  _checkFixedTermDuration();
}

// ── 계약직·계약직 수습 계약기간 최소 1개월 검사 ──
// 계약기간이 1개월 미만이면 경고 배너 표시 후 true 반환 (버튼 비활성 신호)
function _checkFixedTermDuration(){
  // ── 신규 모드 경고 박스
  const warningRow     = document.getElementById('ct-short-term-warning-row');
  // ── 수정/재계약 모드 경고 박스
  const editWarningRow = document.getElementById('ct-edit-short-term-warning-row');

  // 신규 모드: ct-em-category / ct-em-hire / ct-em-expire 참조
  const newSection = document.getElementById('ct-new-emp-section');
  const isNewMode  = newSection && newSection.style.display !== 'none';

  if(isNewMode){
    // 수정 모드 경고 숨김
    if(editWarningRow) editWarningRow.style.display = 'none';
    if(!warningRow) return false;

    const rawCat = document.getElementById('ct-em-category')?.value || '';
    const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
    const isFixedContract = cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION;

    if(!isFixedContract){
      warningRow.style.display = 'none';
      return false;
    }

    // 계약기간 판정: 계약시작일(ct-em-start) 우선, 없으면 입사일(ct-em-hire) 폴백
    const hire   = document.getElementById('ct-em-start')?.value
                || document.getElementById('ct-em-hire')?.value;
    const expire = document.getElementById('ct-em-expire')?.value;

    if(!hire || !expire){ warningRow.style.display = 'none'; return false; }

    const start = new Date(hire);
    const end   = new Date(expire);
    if(end <= start){ warningRow.style.display = 'none'; return false; }

    const oneMonthLater = new Date(start);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    const isUnder = end < oneMonthLater;
    warningRow.style.display = isUnder ? '' : 'none';
    return isUnder;

  } else {
    // 수정/재계약 모드: ct-type / ct-start / ct-end 참조
    // 신규 모드 경고 숨김
    if(warningRow) warningRow.style.display = 'none';
    if(!editWarningRow) return false;

    const rawCatEdit = document.getElementById('ct-type')?.value || '';
    const catEdit = CONTRACT_TYPE_LEGACY_MAP[rawCatEdit] || rawCatEdit;
    const isFixedContractEdit = catEdit ===CONTRACT_TYPE.FIXED || catEdit ===CONTRACT_TYPE.FIXED_PROBATION;

    if(!isFixedContractEdit){
      editWarningRow.style.display = 'none';
      return false;
    }

    const startVal = document.getElementById('ct-start')?.value;
    const endVal   = document.getElementById('ct-end')?.value;

    if(!startVal || !endVal){ editWarningRow.style.display = 'none'; return false; }

    const start = new Date(startVal);
    const end   = new Date(endVal);
    if(end <= start){ editWarningRow.style.display = 'none'; return false; }

    // 1개월 기준 동일 로직
    const oneMonthLater = new Date(start);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    const isUnder = end < oneMonthLater;
    editWarningRow.style.display = isUnder ? '' : 'none';
    return isUnder;
  }
}

// ── 연차 휴가 자동 계산 ──
// 근로기준법 기준:
//   1년 미만: 매월 개근 시 1일 (최대 11일)
//   1년 이상: 15일 기본, 3년 이상부터 2년마다 1일 추가 (최대 25일)
// 회계년도 기준: 기준일(1월 1일) 시점의 근속기간으로 산정
//   └ 1년 미만 구간: 비례연차 공식 적용 → ⌈15일 × (전년도 재직 개월 수 / 12)⌉ (소수점 올림)
// 입사일 기준:  계약 시작일 시점의 근속기간으로 산정
function calcAnnualLeaveDays(hireDateStr, basisType, contractStartStr){
  if(!hireDateStr) return null;
  const hire = new Date(hireDateStr);
  if(isNaN(hire)) return null;

  // 산정 기준일: 회계년도=올해 1월 1일, 입사일=오늘 날짜
  // ※ 입사일 기준은 "오늘 기준 만 근속기간"으로 연차를 산정한다.
  //   계약 시작일을 기준으로 하면 hire_date == contract_start인 경우 만 0개월이 되어
  //   연차가 0으로 잘못 계산되므로, 항상 오늘(new Date())을 기준으로 사용한다.
  let baseDate;
  if(basisType === '입사일 기준'){
    baseDate = new Date();
  } else {
    // 회계년도 기준: 올해 1월 1일
    baseDate = new Date(new Date().getFullYear(), 0, 1);
  }
  if(isNaN(baseDate) || baseDate < hire) baseDate = new Date();

  // ── 만 근속연수·개월 수를 달력 기준으로 정확히 계산 ──
  // 365.25 나눗셈 대신 연·월·일을 각각 비교해 윤년 오차를 제거한다.
  const bY = baseDate.getFullYear(), bM = baseDate.getMonth(), bD = baseDate.getDate();
  const hY = hire.getFullYear(),     hM = hire.getMonth(),     hD = hire.getDate();

  // 만 근속연수: 올해 anniversary 가 baseDate 이전이면 +1년, 아니면 그대로
  let fullYears = bY - hY;
  if(bM < hM || (bM === hM && bD < hD)) fullYears--;  // 아직 anniversary 미도래
  if(fullYears < 0) fullYears = 0;

  // 만 근속개월: 이번 달 기준일이 입사일 일자 이전이면 -1개월
  let fullMonths = (bY - hY) * 12 + (bM - hM);
  if(bD < hD) fullMonths--;
  if(fullMonths < 0) fullMonths = 0;

  // ── 연차 규정 (근로기준법 제60조) ──
  // 1년 미만   : 매월 개근 1일 (최대 11일)  ※ 회계년도 기준 시 비례연차 공식 적용
  // 1년 완료   : 15일
  // 2년 이상   : 15일 + 매 2년 근속마다 1일 가산 (최대 25일)
  //   → 3년완료=+1, 5년완료=+2, 7년완료=+3, ... floor((fullYears-1)/2)
  if(fullYears === 0){
    // 회계년도 기준: 비례연차 공식 → 15일 × (전년도 재직 개월 수 / 12), 소수점 올림(정수)
    if(basisType !== '입사일 기준'){
      return Math.ceil(15 * fullMonths / 12);
    }
    // 입사일 기준: 종전 방식 (매월 개근 1일, 최대 11일)
    return Math.min(fullMonths, 11);
  } else if(fullYears === 1){
    return 15;
  } else {
    const bonus = Math.floor((fullYears - 1) / 2);
    return Math.min(15 + bonus, 25);
  }
}

// 현재 폼의 입사일·고객사 정보를 읽어 연차일수 자동 계산 후 필드에 반영
/** 고객사 선택 시 ct-pay-period 셀렉트에 기본값 자동 세팅 */
function _autoFillCTPeriod(){
  const coId = document.getElementById('ct-company')?.value || currentContCompanyId;
  const co   = allCompanies.find(c => c.id === coId);
  const hint = document.getElementById('ct-pay-period-hint');
  if(hint && co?.pay_period){
    hint.textContent = `(고객사 기본값: ${co.pay_period})`;
    hint.style.display = 'inline';
  }
  // 셀렉트가 미선택 상태이고 고객사에 pay_period_month/day 값이 있으면 복원
  const moEl = document.getElementById('ct-pay-period-month');
  const dayEl = document.getElementById('ct-pay-period-day');
  if(moEl && dayEl && !moEl.value && !dayEl.value && co){
    if(co.pay_period_month) moEl.value = co.pay_period_month;
    if(co.pay_period_day != null) dayEl.value = String(co.pay_period_day);
    _ctPeriodCompose();
  }
}

/** ct-pay-period 셀렉트 → hidden 합성값 생성 */
function _ctPeriodCompose(){
  const mo  = document.getElementById('ct-pay-period-month')?.value || '';
  const day = document.getElementById('ct-pay-period-day')?.value   || '';
  const hidden    = document.getElementById('ct-pay-period');
  const moHidden  = document.getElementById('ct-pay-period-month-hidden');
  const dayHidden = document.getElementById('ct-pay-period-day-hidden');
  if(mo && day){
    if(hidden)    hidden.value    = `${mo} ${day}일부터 1개월간`;
    if(moHidden)  moHidden.value  = mo;
    if(dayHidden) dayHidden.value = day;
  } else {
    if(hidden)    hidden.value    = '';
    if(moHidden)  moHidden.value  = '';
    if(dayHidden) dayHidden.value = '';
  }
}

/** 저장된 pay_period 값 → ct-pay-period 셀렉트에 복원 */
function _ctPeriodRestore(payPeriod, month, day){
  const pmEl = document.getElementById('ct-pay-period-month');
  const pdEl = document.getElementById('ct-pay-period-day');
  // 월 복원
  let resolvedMonth = '';
  if(month){
    resolvedMonth = month;
  } else if(payPeriod){
    const s = payPeriod.replace(/\s/g,'');
    const m = s.match(/^(전월|당월)(\d+)일/);
    if(m) resolvedMonth = m[1];
  }
  if(pmEl) pmEl.value = resolvedMonth;
  // 일 복원
  let resolvedDay = '';
  if(day !== undefined && day !== null && day !== ''){
    resolvedDay = String(day);
  } else if(payPeriod){
    const s = payPeriod.replace(/\s/g,'');
    const m = s.match(/^(전월|당월)(\d+)일/);
    if(m) resolvedDay = m[2];
  }
  if(pdEl) pdEl.value = resolvedDay;
  _ctPeriodCompose();
}

function autoFillAnnualLeave(){
  const isEdit = !!(editId.contract || _recontractEmpId);
  const hireDateStr = isEdit
    ? (document.getElementById('ct-edit-em-hire')?.value || '')
    : (document.getElementById('ct-em-hire')?.value || '');
  if(!hireDateStr) return; // 입사일 없으면 계산 안 함

  // 고객사 ID로 annual_leave_basis 조회
  const companyId = document.getElementById('ct-company')?.value || currentContCompanyId;
  const company   = allCompanies.find(c => c.id === companyId);
  const basis     = company?.annual_leave_basis || '회계년도 기준';

  const contractStart = document.getElementById('ct-start')?.value || '';
  const days = calcAnnualLeaveDays(hireDateStr, basis, contractStart);
  if(days === null) return;

  const annualEl = document.getElementById('ct-annual');
  if(annualEl) annualEl.value = days;

  // 계산 근거 힌트 표시
  const hintEl = document.getElementById('ct-annual-hint');
  if(hintEl){
    const basisLabel = basis === '입사일 기준' ? '입사일 기준' : '회계년도 기준';
    // 1년 미만 + 회계년도 기준이면 비례연차 공식 근거 표시
    let hintMsg = `(${basisLabel} 자동계산: ${days}일)`;
    if(basis !== '입사일 기준'){
      // 만 근속개월 수 역산하여 비례연차 공식 표기
      const _hire = new Date(hireDateStr);
      const _base = new Date(new Date().getFullYear(), 0, 1);
      const _safeBase = (_base < _hire) ? new Date() : _base;
      const _bY = _safeBase.getFullYear(), _bM = _safeBase.getMonth(), _bD = _safeBase.getDate();
      const _hY = _hire.getFullYear(),     _hM = _hire.getMonth(),     _hD = _hire.getDate();
      let _fy = _bY - _hY; if(_bM < _hM || (_bM===_hM && _bD<_hD)) _fy--;
      let _fm = (_bY-_hY)*12 + (_bM-_hM); if(_bD<_hD) _fm--;
      if(_fy < 0) _fy = 0; if(_fm < 0) _fm = 0;
      if(_fy === 0){
        hintMsg = `(${basisLabel} 자동계산: ${days}일 · 비례연차 ⌈15×${_fm}/12⌉ 올림)`;
      }
    }
    hintEl.textContent = hintMsg;
    hintEl.style.display = 'inline';
  }
}

function toggleAnnualSal(){
  // 수정 모드(editId.contract 있음)이면 ct-type 기준, 신규이면 ct-em-category 기준
  const rawCat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-type')?.value || '')
    : document.getElementById('ct-em-category').value;
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isRegularGroup = cat ===CONTRACT_TYPE.REGULAR || cat ===CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedTerm    = cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION; // 계약직 계열
  const isDaily        = cat ===CONTRACT_TYPE.DAILY;

  // ── 상단 섹션 타이틀·라벨 업데이트 ──
  const salaryPeriodTitle = document.getElementById('ct-salary-period-title');
  const labelAnnualSal    = document.getElementById('ct-label-annual-sal');
  const wageSectionTitle  = document.getElementById('ct-wage-section-title');
  const labelMonthly      = document.getElementById('ct-label-monthly');
  const dailyWageLabel    = document.querySelector('#ct-row-daily-wage label');

  if(isRegularGroup){
    if(salaryPeriodTitle) salaryPeriodTitle.innerHTML = '연봉 <span style="color:#c00;font-weight:900;font-size:13px;margin-left:1px;">*</span>';
    if(labelAnnualSal)    labelAnnualSal.innerHTML    = '연봉 <span style="color:#c00;font-weight:900;font-size:13px;margin-left:1px;">*</span>';
    if(wageSectionTitle)  wageSectionTitle.textContent = '임금 조건 (월)';
    if(labelMonthly)      labelMonthly.textContent    = '월 약정임금';
  } else if(isFixedTerm){
    if(salaryPeriodTitle) salaryPeriodTitle.innerHTML = '월 약정급여 <span style="color:#c00;font-weight:900;font-size:13px;margin-left:1px;">*</span>';
    if(labelAnnualSal)    labelAnnualSal.innerHTML    = '월 약정급여 (통상월급) <span style="color:#c00;font-weight:900;font-size:13px;margin-left:1px;">*</span>';
    if(wageSectionTitle)  wageSectionTitle.textContent = '임금 조건 (월)';
    if(labelMonthly)      labelMonthly.textContent    = '월 약정임금 (자동계산)';
  } else if(isDaily){
    if(salaryPeriodTitle) salaryPeriodTitle.innerHTML = '일 약정일급 <span style="color:#c00;font-weight:900;font-size:13px;margin-left:1px;">*</span>';
    if(wageSectionTitle)  wageSectionTitle.textContent = '임금 조건 (일일 기준)';
    if(labelMonthly)      labelMonthly.textContent    = '일 약정임금 (자동계산)';
    if(dailyWageLabel)    dailyWageLabel.innerHTML    = '일 약정일급 (통상일급) <span style="color:#c00;font-weight:900;font-size:13px;margin-left:1px;">*</span>';
  }

  // ── (일급) suffix 토글 ──
  document.querySelectorAll('#contract-modal .daily-suffix').forEach(el => {
    el.style.display = isDaily ? 'inline' : 'none';
  });

  // ── 연봉/월약정급여 입력 행 표시 제어 ──
  const rowSalPeriod = document.getElementById('ct-row-salary-period');
  const rowAnnualSal = document.getElementById('ct-row-annual-sal');
  // 정규직·계약직 모두 입력 행 표시 (일용직은 ct-row-daily-wage 사용)
  const showAnnualRow = isRegularGroup || isFixedTerm;
  if(rowSalPeriod) rowSalPeriod.style.display = showAnnualRow ? '' : 'none';
  if(rowAnnualSal) rowAnnualSal.style.display  = showAnnualRow ? '' : 'none';

  // ── 월 약정임금 표시 행 ──
  const rowMonthly = document.getElementById('ct-row-monthly');
  // 계약직: 자동계산 표시 / 정규직: 표시 / 일용직: 숨김(일일 기준이므로)
  if(rowMonthly) rowMonthly.style.display = isDaily ? 'none' : '';

  // 주 근무일수 / 연차일수 / 주휴수당 행 (일용직 숨김)
  const rowDays       = document.getElementById('ct-row-days');
  const rowAnnualLeave= document.getElementById('ct-row-annual');
  const rowBase       = document.getElementById('ct-row-base');
  const rowWeeklyHol  = document.getElementById('ct-row-weekly-hol');
  const rowDailyWage  = document.getElementById('ct-row-daily-wage');
  if(rowDays)       rowDays.style.display       = isDaily ? 'none' : '';
  if(rowAnnualLeave) rowAnnualLeave.style.display= isDaily ? 'none' : '';
  if(rowWeeklyHol)  rowWeeklyHol.style.display  = isDaily ? 'none' : '';
  if(rowDailyWage)  rowDailyWage.style.display  = isDaily ? '' : 'none';

  // 기본급 행: 정규직·계약직은 자동계산(readonly 파란색), 일용직은 숨김
  if(rowBase) rowBase.style.display = isDaily ? 'none' : '';
  const ctBaseInput = document.getElementById('ct-base');
  const ctBaseAutoMark = document.getElementById('ct-base-auto-mark');
  if(ctBaseInput){
    if(isRegularGroup || isFixedTerm){
      // 정규직·계약직 모두 기본급 자동계산
      ctBaseInput.readOnly = true;
      ctBaseInput.style.background = '#f0f4f8';
      ctBaseInput.style.color      = '#0369a1';
      ctBaseInput.style.cursor     = 'default';
      if(ctBaseAutoMark) ctBaseAutoMark.style.display = 'inline';
    } else {
      ctBaseInput.readOnly = false;
      ctBaseInput.style.background = '';
      ctBaseInput.style.color      = '';
      ctBaseInput.style.cursor     = '';
      if(ctBaseAutoMark) ctBaseAutoMark.style.display = 'none';
    }
  }

  if(!isRegularGroup && !isFixedTerm){
    const el = document.getElementById('ct-annual-sal');
    if(el) el.value = 0;
    if(!isDaily) document.getElementById('ct-monthly-computed').textContent = '0원';
  }
  if(isDaily){
    setAmountVal('ct-base', 0);
    document.getElementById('ct-weekly-hol-computed').textContent = '0원';
    document.getElementById('ct-monthly-computed').textContent = '0원';
    document.getElementById('ct-days').value = 5;
    document.getElementById('ct-annual').value = 0;
  } else {
    const dw = document.getElementById('ct-daily-wage');
    if(dw) dw.value = '';
  }
  calcContractSalary();
}
// onSalaryStartChange 제거 — salary_start_date = contract_start 통합으로 불필요

function toggleProbation(){
  const rawCat = document.getElementById('ct-em-category').value;
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isProbation = cat ===CONTRACT_TYPE.REGULAR_PROBATION || cat ===CONTRACT_TYPE.FIXED_PROBATION;
  const sec = document.getElementById('ct-probation-section');
  if(sec) sec.style.display = isProbation ? '' : 'none';
  if(!isProbation){
    document.getElementById('ct-probation-months').value = '';  // 빈 값으로 초기화
    document.getElementById('ct-probation-pct').value = '';
    document.getElementById('ct-probation-amt').value = '';
    // 산정기준 라디오 초기화
    const r = document.getElementById('ct-prob-basis-salary');
    if(r){ r.checked = true; onProbationBasisChange(); }
    // 수습 아닌 경우 경고 상자 강제 숨김
    const wr = document.getElementById('ct-prob-minwage-warning-row');
    if(wr) wr.style.display = 'none';
  } else {
    onProbationBasisChange(); // 표시될 때 UI 동기화
    _checkProbMinWageWarning(); // 경고 갱신
  }
}

// ── 산정기준 라디오 변경 핸들러 ──
function onProbationBasisChange(){
  const basis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary';
  const isMinwage = basis === 'minwage';
  const isDirect  = basis === 'direct';
  const isSalary  = basis === 'salary';

  // ── 라디오 라벨 스타일 (활성=노란 테두리/배경, 비활성=회색) ──
  const labelMap = {
    salary:  document.getElementById('ct-prob-basis-label-salary'),
    minwage: document.getElementById('ct-prob-basis-label-minwage'),
    direct:  document.getElementById('ct-prob-basis-label-direct'),
  };
  Object.entries(labelMap).forEach(([key, el]) => {
    if(!el) return;
    const active = key === basis;
    el.style.border     = active ? '1.5px solid #fbbf24' : '1.5px solid #e2e8f0';
    el.style.background = active ? '#fffbeb' : '#f8fafc';
    el.style.color      = active ? '#92400e' : '#64748b';
    const icon = el.querySelector('i');
    if(icon) icon.style.color = active ? '#d97706' : '#94a3b8';
  });

  // ── % 행: salary / minwage일 때만 표시, direct일 때 숨김 ──
  const pctRow = document.getElementById('ct-prob-pct-row');
  if(pctRow) pctRow.style.display = isDirect ? 'none' : '';

  // ── % 레이블 업데이트 ──
  const pctLabel = document.getElementById('ct-prob-pct-label');
  if(pctLabel) pctLabel.innerHTML = (isMinwage ? '수습 임금 (최저임금의 %)' : '수습 임금 (약정 보수의 %)') + ' <span style="color:#ef4444;font-weight:900;">*</span>';

  // ── 금액 입력 필드 읽기전용 여부 ──
  // salary/minwage: % 연동으로 자동계산 → readonly
  // direct: 사용자가 직접 입력 → 편집 가능
  const amtEl = document.getElementById('ct-probation-amt');
  const amtLabel = document.getElementById('ct-prob-amt-label');
  if(amtEl){
    if(isDirect){
      amtEl.removeAttribute('readonly');
      amtEl.style.background = '#fff';
      amtEl.style.color = '#1a1a2e';
      amtEl.style.fontWeight = '600';
      amtEl.placeholder = '수습 월 보수를 직접 입력';
    } else {
      amtEl.setAttribute('readonly', 'readonly');
      amtEl.style.background = '#f8fafc';
      amtEl.style.color = '#64748b';
      amtEl.style.fontWeight = '';
      amtEl.placeholder = '0';
    }
  }
  if(amtLabel) amtLabel.innerHTML = (isDirect ? '수습 임금 (월 금액, 직접 입력)' : '수습 임금 (월 금액)') + ' <span style="color:#ef4444;font-weight:900;">*</span>';

  // ── 안내문 업데이트 ──
  const infoText = document.getElementById('ct-prob-info-text');
  if(infoText){
    if(isDirect){
      infoText.innerHTML = '수습 기간 중 지급할 월 보수를 직접 입력합니다. 최저임금 미달 여부는 저장 시 자동 검증됩니다.';
    } else if(isMinwage){
      const hireRaw = document.getElementById('ct-em-hire')?.value
        || document.getElementById('ct-start')?.value || '';
      const yr = hireRaw ? parseInt(hireRaw.slice(0,4)) : new Date().getFullYear();
      const mw = (_allMinimumWages||[]).find(w => Number(w.year) === yr);
      const mwAmt = mw ? Number(mw.hourly_wage) : 0;
      const mwMonthly = mwAmt > 0 ? Math.round(mwAmt * 209) : 0;
      infoText.innerHTML = `${yr}년 최저시급 기준으로 계산됩니다.`
        + (mwAmt > 0
          ? ` <strong>${yr}년 최저시급: ${mwAmt.toLocaleString('ko-KR')}원 → 월 환산: ${mwMonthly.toLocaleString('ko-KR')}원</strong>`
          : ' <span style="color:#ef4444;">(최저임금 데이터를 먼저 등록해주세요)</span>');
    } else {
      infoText.textContent = '월 약정임금 기준으로 계산됩니다. %를 입력하면 금액이, 금액을 입력하면 %가 자동 계산됩니다.';
    }
  }

  // ── 기준 변경 시 금액 재계산 (direct는 스킵) ──
  if(!isDirect){
    const pct = parseFloat(document.getElementById('ct-probation-pct').value);
    if(!isNaN(pct) && pct > 0) calcProbationFromPct();
  }
  // ── 기준 변경 시 최저임금 경고 갱신 ──
  _checkProbMinWageWarning();
}

function getProbationBase(){
  const basis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary';
  if(basis === 'minwage'){
    // 최저임금 기준: 계약시작연도 최저시급 × 209시간 = 월 환산 최저임금
    // 신규 모드: ct-em-start 우선 / 수정·재계약 모드: ct-start
    const hireRaw = document.getElementById('ct-em-start')?.value
      || document.getElementById('ct-em-hire')?.value
      || document.getElementById('ct-start')?.value || '';
    const yr = hireRaw ? parseInt(hireRaw.slice(0,4)) : new Date().getFullYear();
    const mw = (_allMinimumWages||[]).find(w => Number(w.year) === yr);
    return mw ? Math.round(Number(mw.hourly_wage) * 209) : 0;
  }
  // 보수 대비: 월 약정임금(정규직) 또는 기본급(계약직)
  const monthly = parseFloat(document.getElementById('ct-monthly-computed')?.textContent?.replace(/[^\d]/g,'')||0)||0;
  const base = getAmountVal('ct-base');
  return monthly > 0 ? monthly : base;
}
function calcProbationFromPct(){
  const basis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary';
  if(basis === 'direct') return; // 직접 입력 모드: % 연동 스킵
  const pct = parseFloat(document.getElementById('ct-probation-pct').value);
  const ref = getProbationBase();
  if(!isNaN(pct) && ref > 0){
    document.getElementById('ct-probation-amt').value = Math.round(ref * pct / 100);
  }
  _checkProbMinWageWarning();
}
function calcProbationFromAmt(){
  const basis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary';
  if(basis !== 'direct'){
    // salary/minwage 모드: % 역산
    const amt = parseFloat(document.getElementById('ct-probation-amt').value);
    const ref = getProbationBase();
    if(!isNaN(amt) && ref > 0){
      document.getElementById('ct-probation-pct').value = (amt / ref * 100).toFixed(1);
    }
  }
  // direct 모드 포함 항상 경고 체크
  _checkProbMinWageWarning();
}

// ── 수습 임금 최저임금 준수 여부 경고 ──
// [정규직 수습]
//   · minwage(최저임금 대비 요율): 입력 % < 90  → 법 위반 경고
//   · direct(직접 입력):           입력 금액 < 최저임금 월환산×90%  → 법 위반 경고
// [계약직 수습]
//   · direct(직접 입력):           입력 금액 < 최저임금 월환산×100% → 법 위반 경고
//   (계약직 수습은 1년 미만 기간제 → 최저임금법 제5조제2항 감액 불가, 100% 이상 必)
function _checkProbMinWageWarning(){
  const warningRow = document.getElementById('ct-prob-minwage-warning-row');
  const warningBox = document.getElementById('ct-prob-minwage-warning-box');
  if(!warningRow || !warningBox) return;

  const _rawEmCat = document.getElementById('ct-em-category')?.value || '';
  const emCat = CONTRACT_TYPE_LEGACY_MAP[_rawEmCat] || _rawEmCat;
  const basis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary';
  const isRegular  = emCat ===CONTRACT_TYPE.REGULAR_PROBATION;
  const isContract = emCat ===CONTRACT_TYPE.FIXED_PROBATION;

  // 검증 대상 조합: 정규직수습+(minwage/direct/salary) / 계약직수습+(direct/salary)
  const needCheck = (isRegular  && (basis === 'minwage' || basis === 'direct' || basis === 'salary'))
                 || (isContract && (basis === 'direct'  || basis === 'salary'));
  if(!needCheck){
    warningRow.style.display = 'none';
    return;
  }

  // ── 최저임금 월환산 조회 (계약 시작연도 기준) ──
  // 신규 모드: ct-em-start(계약시작일) 우선 / 수정·재계약 모드: ct-start
  const hireRaw = document.getElementById('ct-em-start')?.value
    || document.getElementById('ct-em-hire')?.value
    || document.getElementById('ct-start')?.value || '';
  const yr = hireRaw ? parseInt(hireRaw.slice(0,4)) : new Date().getFullYear();
  const mw = (_allMinimumWages||[]).find(w => Number(w.year) === yr);
  const mwMonthly = mw ? Math.round(Number(mw.hourly_wage) * 209) : 0;

  if(mwMonthly <= 0){
    // 최저임금 데이터 없으면 경고 불가 → 숨김
    warningRow.style.display = 'none';
    return;
  }

  // ── 입력값 → 실제 월 금액 환산 ──
  let actualAmt = 0; // 수습 임금 월 금액
  if(basis === 'minwage'){
    // 최저임금 대비 % → 금액 환산
    const pct = parseFloat(document.getElementById('ct-probation-pct')?.value);
    if(isNaN(pct) || pct <= 0){ warningRow.style.display = 'none'; return; }
    actualAmt = Math.round(mwMonthly * pct / 100);
  } else if(basis === 'salary'){
    // 약정 보수 대비 % → calcProbationFromPct()가 이미 ct-probation-amt에 금액 계산해 둠
    const amt = parseFloat(document.getElementById('ct-probation-amt')?.value);
    if(isNaN(amt) || amt <= 0){ warningRow.style.display = 'none'; return; }
    actualAmt = amt;
  } else { // direct — 직접 입력 금액
    const amt = parseFloat(document.getElementById('ct-probation-amt')?.value);
    if(isNaN(amt) || amt <= 0){ warningRow.style.display = 'none'; return; }
    actualAmt = amt;
  }

  // ── 기준 하한 및 경고 문구 결정 ──
  const limit90  = Math.floor(mwMonthly * 0.9);   // 최저임금 90%
  const limit100 = mwMonthly;                      // 최저임금 100%
  const pctActual = (actualAmt / mwMonthly * 100).toFixed(1); // 실제 비율
  const fmt = v => Math.round(v).toLocaleString('ko-KR');

  if(isRegular && actualAmt < limit90){
    // 정규직 수습 — 90% 미만: 법 위반
    warningBox.style.cssText = 'border-radius:7px;padding:9px 12px;font-size:11.5px;line-height:1.7;background:#fef2f2;border:1.5px solid #fca5a5;color:#991b1b;';
    warningBox.innerHTML =
      '<div style="font-weight:700;margin-bottom:4px;">'
      + '<i class="fas fa-times-circle" style="margin-right:5px;color:#dc2626;"></i>'
      + '⚠️ 최저임금 법 위반 — 수습 임금(' + fmt(actualAmt) + '원)이 최저임금의 90% 미만입니다'
      + '</div>'
      + '<div style="margin-bottom:3px;">'
      + '정규직 수습 근로자의 임금은 <strong>최저임금의 90% 이상</strong>이어야 합니다.'
      + ' (' + yr + '년 최저임금 월환산 ' + fmt(mwMonthly) + '원의 90% = <strong>' + fmt(limit90) + '원</strong> 이상)'
      + '</div>'
      + '<div style="font-size:11px;color:#b91c1c;margin-bottom:3px;">'
      + '📖 <strong>최저임금법 제5조 제2항</strong>: 수습을 시작한 날부터 3개월 이내인 자에 대하여는 '
      + '최저임금액의 100분의 10을 감한 금액을 최저임금액으로 한다.'
      + '</div>'
      + '<div style="font-size:11px;color:#b91c1c;">'
      + '※ 단, <strong>1년 미만 기간제(계약직 수습)</strong>에는 감액 규정이 적용되지 않아 '
      + '반드시 최저임금의 <strong>100%</strong> 이상이어야 합니다.'
      + '</div>';
    warningRow.style.display = '';
  } else if(isContract && actualAmt < limit100){
    // 계약직 수습 — 100% 미만: 법 위반 (1년 미만 기간제 → 감액 불가)
    warningBox.style.cssText = 'border-radius:7px;padding:9px 12px;font-size:11.5px;line-height:1.7;background:#fef2f2;border:1.5px solid #fca5a5;color:#991b1b;';
    warningBox.innerHTML =
      '<div style="font-weight:700;margin-bottom:4px;">'
      + '<i class="fas fa-times-circle" style="margin-right:5px;color:#dc2626;"></i>'
      + '⚠️ 최저임금 법 위반 — 수습 임금(' + fmt(actualAmt) + '원)이 최저임금(100%) 미만입니다'
      + '</div>'
      + '<div style="margin-bottom:3px;">'
      + '계약직(1년 미만 기간제) 수습 근로자의 임금은 <strong>최저임금의 100% 이상</strong>이어야 합니다.'
      + ' (' + yr + '년 최저임금 월환산 <strong>' + fmt(limit100) + '원</strong> 이상)'
      + '</div>'
      + '<div style="font-size:11px;color:#b91c1c;">'
      + '📖 <strong>최저임금법 제5조 제2항 단서</strong>: 1년 미만의 기간을 정하여 근로계약을 체결한 '
      + '근로자에 대해서는 수습 기간 감액 규정을 적용하지 아니한다.'
      + '</div>';
    warningRow.style.display = '';
  } else {
    warningRow.style.display = 'none';
  }
  // 경고 상태가 바뀌었으므로 등록 버튼 활성화 여부도 갱신
  _checkRegisterBtnState();
}

// ──────────────────────────────────────────────────────────────────────────────
// _checkMinWageWarning()
//   정규직·계약직·일용직(비수습) 고용형태에서 급여 입력 시 최저임금 미달 여부를
//   실시간으로 검사하여 경고 박스를 표시/숨김한다.
//   ※ 수습(정규직 수습·계약직 수습)은 별도 _checkProbMinWageWarning()가 담당.
// ──────────────────────────────────────────────────────────────────────────────
function _checkMinWageWarning(){
  const wRow = document.getElementById('ct-general-minwage-warning-row');
  const wBox = document.getElementById('ct-general-minwage-warning-box');
  if(!wRow || !wBox){ _checkRegisterBtnState(); return; }

  // 고용형태 결정 (신규: ct-em-category, 수정/재계약: ct-edit-em-category 텍스트 또는 ct-type)
  const rawCat = document.getElementById('ct-em-category')?.value
    || document.getElementById('ct-edit-em-category')?.value
    || document.getElementById('ct-type')?.value
    || '';
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;

  const isDaily       = cat ===CONTRACT_TYPE.DAILY;
  const isRegular     = cat ===CONTRACT_TYPE.REGULAR;
  const isFixedTerm   = cat ===CONTRACT_TYPE.FIXED;
  const isTarget      = isDaily || isRegular || isFixedTerm; // 수습 제외
  if(!isTarget){ wRow.style.display='none'; _checkRegisterBtnState(); return; }

  // ── 계약 시작 연도 결정 — 신규 모드: ct-em-start 우선 / 수정·재계약 모드: ct-start ──
  const hireRaw = document.getElementById('ct-em-start')?.value
    || document.getElementById('ct-em-hire')?.value
    || document.getElementById('ct-start')?.value || '';
  const yr = hireRaw ? parseInt(hireRaw.slice(0,4)) : new Date().getFullYear();
  const mw = (_allMinimumWages||[]).find(w => Number(w.year) === yr);
  if(!mw || Number(mw.hourly_wage) <= 0){ wRow.style.display='none'; _checkRegisterBtnState(); return; }

  const legalHourly  = Number(mw.hourly_wage);          // 법정 최저시급
  const legalMonthly = Math.round(legalHourly * 209);   // 법정 최저월급 (209h 기준)
  const fmt = v => Math.round(v).toLocaleString('ko-KR');

  // ── 입력 임금 → 시급 환산 ──
  let compareHourly  = 0;
  let compareMonthly = 0;
  let compareLabel   = '';

  if(isDaily){
    const dw   = getAmountVal('ct-daily-wage');
    const hrs  = parseFloat(document.getElementById('ct-hours')?.value) || 8;
    if(dw <= 0){ wRow.style.display='none'; _checkRegisterBtnState(); return; }
    compareHourly  = Math.round(dw / hrs);
    compareMonthly = dw * Math.round(209 / hrs); // 월 환산 (209÷일소정시간)
    compareLabel   = `일급여 ${fmt(dw)}원 (일 ${hrs}시간 기준 시급 ${fmt(compareHourly)}원)`;
  } else {
    // 정규직·계약직: 비과세 포함 월임금 ÷ 209
    const base   = getAmountVal('ct-base');
    if(base <= 0){ wRow.style.display='none'; _checkRegisterBtnState(); return; }
    const days   = parseFloat(document.getElementById('ct-days')?.value) || 5;
    const wkHol  = Math.round(base / 5); // 월 주휴수당 = 기본급 ÷ 5
    const pos    = getAmountVal('ct-position');
    const car    = getAmountVal('ct-car');
    const rmtArea= getAmountVal('ct-remote-area')||0;
    const meal   = getAmountVal('ct-meal');
    const res    = getAmountVal('ct-research');
    const other  = getAmountVal('ct-other') || 0;
    const site_w = getAmountVal('ct-site')||0;
    const skill_w= getAmountVal('ct-skill')||0;
    const lic_w  = getAmountVal('ct-license')||0;
    const comm_w = getAmountVal('ct-communication')||0;
    const fit_w  = getAmountVal('ct-fitness')||0;
    const sdev_w = getAmountVal('ct-self-dev')||0;
    const book_w = getAmountVal('ct-book')||0;
    const ovs_w  = getAmountVal('ct-overseas')||0;
    compareMonthly = base + wkHol + pos
                   + (_isFixedAllow('car')         ? car    : 0)
                   + rmtArea
                   + (_isFixedAllow('meal')        ? meal   : 0)
                   + (_isFixedAllow('research')    ? res    : 0)
                   + other
                   + site_w + skill_w + lic_w
                   + (_isFixedAllow('communication') ? comm_w : 0)
                   + (_isFixedAllow('fitness')       ? fit_w  : 0)
                   + (_isFixedAllow('self_dev')      ? sdev_w : 0)
                   + (_isFixedAllow('book')          ? book_w : 0)
                   + (_isFixedAllow('overseas')      ? ovs_w  : 0);
    compareHourly  = compareMonthly > 0 ? Math.round(compareMonthly / MAGIC.MONTHLY_STD_HOURS) : 0;
    compareLabel   = `기본급 ${fmt(base)}원 + 주휴 ${fmt(wkHol)}원 + 수당 합계 → 월 ${fmt(compareMonthly)}원 (시급 ${fmt(compareHourly)}원)`;
  }

  if(compareHourly <= 0){ wRow.style.display='none'; _checkRegisterBtnState(); return; }

  // ── 위반 여부 판정 (비수습은 100% 기준) ──
  if(compareHourly < legalHourly){
    const shortfall    = legalHourly - compareHourly;
    const shortMonthly = legalMonthly - compareMonthly;
    const typeName = isDaily ? '일용직' : isRegular ? '정규직' : '계약직';

    wBox.innerHTML =
      `<div style="display:flex;align-items:center;gap:7px;font-weight:800;font-size:12px;margin-bottom:6px;color:#b91c1c;">
         <i class="fas fa-exclamation-triangle" style="color:#dc2626;font-size:14px;"></i>
         ⚠️ 최저임금 법 위반 — ${typeName} 급여가 ${yr}년 법정 최저임금에 미달합니다
       </div>
       <div style="background:#fff;border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:11.5px;line-height:2;border:1px dashed #fca5a5;">
         <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:4px;margin-bottom:4px;">
           <span>⚖️ ${yr}년 법정 최저시급</span>
           <strong style="color:#b91c1c;">${fmt(legalHourly)}원 (월 ${fmt(legalMonthly)}원)</strong>
         </div>
         <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:4px;margin-bottom:4px;">
           <span>💰 입력 임금</span>
           <strong style="color:#ef4444;">${compareLabel}</strong>
         </div>
         <div style="display:flex;justify-content:space-between;">
           <span>📉 부족액</span>
           <strong style="color:#ef4444;">시급 -${fmt(shortfall)}원&nbsp;/&nbsp;월 -${fmt(shortMonthly)}원</strong>
         </div>
       </div>
       <div style="font-size:11px;color:#9f1239;line-height:1.6;">
         📖 <strong>최저임금법 제6조</strong>: 사용자는 최저임금액 이상의 임금을 지급하여야 합니다.
         위반 시 <strong>3년 이하 징역 또는 2천만원 이하 벌금</strong>에 처합니다. (최저임금법 제28조)
       </div>`;
    wRow.style.display = '';
  } else {
    wRow.style.display = 'none';
  }

  _checkRegisterBtnState();
}

// ──────────────────────────────────────────────────────────────────────────────
// _checkRegisterBtnState()
//   '신규 계약 등록' 버튼의 disabled 상태를 결정한다.
//
//   활성화 조건:
//     1) 필수 입력값이 모두 채워져 있을 것
//        - 회사, 고용형태, 이름, 입사일, 휴대전화, 기본급(정규직계열/계약직계열)
//          또는 일급여(일용직), 연봉(정규직/정규직수습 계열)
//     2) 수습 계약(정규직 수습 / 계약직 수습)인 경우 최저임금 위반 경고가 없을 것
//
//   ※ 수정/재계약 모드에서는 신규 버튼이 표시되지 않으므로 신규 모드만 검사한다.
// ──────────────────────────────────────────────────────────────────────────────
// _checkRegisterBtnState / _checkAmendBtnState
// 버튼은 항상 활성 상태 — 클릭 시 _ctValidate()로 유효성 검사를 수행한다.
// 하위 호환을 위해 함수는 유지하되 disabled 조작은 하지 않는다.
function _checkRegisterBtnState(){ /* no-op: 버튼 항상 활성 */ }
function _checkAmendBtnState(){    /* no-op: 버튼 항상 활성 */ }

function syncProbation(){
  // 수습 섹션이 보이는 경우에만 계산
  const sec = document.getElementById('ct-probation-section');
  if(!sec || sec.style.display === 'none') return;
  // %값이 없으면 80 기본값으로 설정 후 계산
  const pctEl = document.getElementById('ct-probation-pct');
  if(pctEl.value === '') pctEl.value = '80';
  calcProbationFromPct();
}
// 시/분 select 옵션 채우기 (0~n시간, 0/10/20/30/40/50분)
// ── 요일별 근무시간 스케줄 ──
const DAYS_KR = ['월','화','수','목','금','토','일'];
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_CLASSES = ['','','','','','day-sat','day-sun'];
// 기본 근무 요일 (월~금 체크)
const DAY_DEFAULTS = { mon:true, tue:true, wed:true, thu:true, fri:true, sat:false, sun:false };

// ── 일괄 설정 요일 체크박스 연동 ──
function _bulkWeekdayToggle(){
  const weekdayChk = document.getElementById('bulk-chk-weekday').checked;
  ['mon','tue','wed','thu','fri'].forEach(d => {
    const el = document.getElementById('bulk-chk-'+d);
    if(el) el.checked = weekdayChk;
  });
}
function _bulkDayToggle(){
  const allChecked = ['mon','tue','wed','thu','fri'].every(d =>
    document.getElementById('bulk-chk-'+d)?.checked
  );
  const weekdayEl = document.getElementById('bulk-chk-weekday');
  if(weekdayEl) weekdayEl.checked = allChecked;
}

// ── 일괄 설정 적용 ──
function applyBulkSchedule(){
  const start = document.getElementById('bulk-start').value;
  const end   = document.getElementById('bulk-end').value;
  const brks  = document.getElementById('bulk-brks').value;
  const brke  = document.getElementById('bulk-brke').value;

  if(!start || !end){ toast('출근·퇴근 시간을 입력해 주세요.', 'error'); return; }
  if(start >= end){ toast('퇴근 시간이 출근 시간보다 늦어야 합니다.', 'error'); return; }
  if(brks && brke && brks >= brke){ toast('휴게 종료 시간이 시작 시간보다 늦어야 합니다.', 'error'); return; }

  const applyWeekday = document.getElementById('bulk-chk-weekday').checked;
  const targets = new Set();
  if(applyWeekday) ['mon','tue','wed','thu','fri'].forEach(d => targets.add(d));
  if(document.getElementById('bulk-chk-mon')?.checked) targets.add('mon');
  if(document.getElementById('bulk-chk-tue')?.checked) targets.add('tue');
  if(document.getElementById('bulk-chk-wed')?.checked) targets.add('wed');
  if(document.getElementById('bulk-chk-thu')?.checked) targets.add('thu');
  if(document.getElementById('bulk-chk-fri')?.checked) targets.add('fri');
  if(document.getElementById('bulk-chk-sat')?.checked) targets.add('sat');
  if(document.getElementById('bulk-chk-sun')?.checked) targets.add('sun');
  if(targets.size === 0){ toast('적용할 요일을 하나 이상 선택해 주세요.', 'error'); return; }

  const breaks = (brks && brke) ? [{s: brks, e: brke}] : [];
  let applied = 0;
  // 선택된 요일에는 값 적용, 선택되지 않은 요일은 비활성(빈값)
  DAY_KEYS.forEach(key=>{
    const container = document.getElementById(`ct-sch-shifts-${key}`);
    if(!container) return;
    if(targets.has(key)){
      container.innerHTML = _shiftGroupHTML(key, 0, true, start, end, breaks);
      applied++;
    } else {
      container.innerHTML = _shiftGroupHTML(key, 0, false, '', '', []);
    }
  });
  calcWorkHours();
  toast(`${applied}개 요일에 근무시간이 일괄 적용되었습니다. ✔`, 'success');
}

// ── 시프트 그룹 렌더 헬퍼 ──
function _shiftGroupHTML(key, idx, enabled, start, end, breaks){
  const dis = enabled ? '' : 'disabled';
  const s = start || (enabled && idx===0 ? '09:00' : '');
  const e = end   || (enabled && idx===0 ? '18:00' : '');
  const defBreaks = (enabled && idx===0) ? [{s:'12:00', e:'13:00'}] : [{s:'', e:''}];
  const brks = (breaks && breaks.length) ? breaks : defBreaks;
  const sid = idx===0 ? '' : '-'+idx;
  return `<div class="shift-group" id="ct-sch-shift-${key}${sid}">
    <span style="font-size:10.5px;color:#6b7280;white-space:nowrap;">출근</span>
    <input type="time" id="ct-sch-start-${key}${sid}" value="${s}" oninput="calcWorkHours()" ${dis} />
    <span style="font-size:10.5px;color:#6b7280;white-space:nowrap;">퇴근</span>
    <input type="time" id="ct-sch-end-${key}${sid}" value="${e}" oninput="calcWorkHours()" ${dis} />
    <span style="font-size:10.5px;color:#7c3aed;white-space:nowrap;">휴게</span>
    <div class="brk-slots-wrap" id="ct-sch-brkwrap-${key}${sid}">${_brkSlotsHTML2(key, idx, enabled, brks)}</div>
    ${idx===0
      ? `<button type="button" class="btn-brk-add shift-add" onclick="_addShift('${key}')" title="시프트 추가">+</button><button type="button" class="btn-brk-del shift-del" onclick="_deactivateShift('${key}')" ${dis} title="비활성화">−</button>`
      : `<button type="button" class="btn-brk-del shift-del" onclick="_removeShift('${key}',${idx})" title="시프트 삭제">−</button>`}
  </div>`;
}

// ── 첫 번째 시프트 비활성화 ──
function _deactivateShift(key){
  const container = document.getElementById(`ct-sch-shifts-${key}`);
  if(!container) return;
  container.innerHTML = _shiftGroupHTML(key, 0, false, '', '', []);
  calcWorkHours();
}

// ── 시프트용 휴게 슬롯 HTML (idx 포함) ──
function _brkSlotsHTML2(key, shiftIdx, enabled, breaks){
  const dis = enabled ? '' : 'disabled';
  const sid = shiftIdx===0 ? '' : '-'+shiftIdx;
  return breaks.map((b, idx) => {
    return `<div class="brk-slot-row" id="ct-sch-brkrow-${key}${sid}-${idx}">
      <input type="time" class="brk-time" data-brk-key="${key}" data-shift-idx="${shiftIdx}" data-brk-idx="${idx}" data-brk-type="s"
        value="${b.s||''}" oninput="calcWorkHours()" ${dis} />
      <span class="brk-sep">~</span>
      <input type="time" class="brk-time" data-brk-key="${key}" data-shift-idx="${shiftIdx}" data-brk-idx="${idx}" data-brk-type="e"
        value="${b.e||''}" oninput="calcWorkHours()" ${dis} />
      ${idx > 0
        ? `<button type="button" class="btn-brk-del" onclick="_removeBrkSlot2('${key}',${shiftIdx},${idx})" ${dis} title="휴게 삭제">−</button>`
        : ''}
    </div>`;
  }).join('');
}

// ── 시프트 추가 ──
function _addShift(key){
  const row = document.getElementById(`ct-sch-row-${key}`);
  const container = row?.querySelector('.td-shifts .shifts-container');
  if(!container) return;
  const existing = container.querySelectorAll('.shift-group');
  // 첫 번째 시프트가 비활성 상태이면 활성화 (주말→평일 전환)
  if(existing.length === 1){
    const firstStart = document.getElementById(`ct-sch-start-${key}`);
    if(firstStart && firstStart.disabled){
      container.innerHTML = _shiftGroupHTML(key, 0, true, '', '', null);
      calcWorkHours();
      return;
    }
  }
  // 이미 활성 상태면 새 시프트 추가
  const idx = existing.length;
  const html = _shiftGroupHTML(key, idx, true, '', '', []);
  const div = document.createElement('div');
  div.innerHTML = html;
  container.appendChild(div.firstElementChild);
  calcWorkHours();
}

// ── 시프트 삭제 ──
function _removeShift(key, idx){
  const sid = idx===0 ? '' : '-'+idx;
  const shift = document.getElementById(`ct-sch-shift-${key}${sid}`);
  if(shift) shift.remove();
  calcWorkHours();
}

// ── 시프트용 휴게 슬롯 추가 ──
function _addBrkSlot2(key, shiftIdx){
  const sid = shiftIdx===0 ? '' : '-'+shiftIdx;
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}${sid}`);
  if(!wrap) return;
  const idx = wrap.querySelectorAll('.brk-slot-row').length;
  const row = document.createElement('div');
  row.className = 'brk-slot-row';
  row.id = `ct-sch-brkrow-${key}${sid}-${idx}`;
  row.innerHTML =
    `<input type="time" class="brk-time" data-brk-key="${key}" data-shift-idx="${shiftIdx}" data-brk-idx="${idx}" data-brk-type="s" value="" oninput="calcWorkHours()" />`
    + `<span class="brk-sep">~</span>`
    + `<input type="time" class="brk-time" data-brk-key="${key}" data-shift-idx="${shiftIdx}" data-brk-idx="${idx}" data-brk-type="e" value="" oninput="calcWorkHours()" />`
    + `<button type="button" class="btn-brk-del" onclick="_removeBrkSlot2('${key}',${shiftIdx},${idx})" title="휴게 삭제">−</button>`;
  wrap.appendChild(row);
  calcWorkHours();
}

function _removeBrkSlot2(key, shiftIdx, idx){
  const sid = shiftIdx===0 ? '' : '-'+shiftIdx;
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}${sid}`);
  if(!wrap) return;
  const row = document.getElementById(`ct-sch-brkrow-${key}${sid}-${idx}`);
  if(row) row.remove();
  wrap.querySelectorAll('.brk-slot-row').forEach((r,i)=>{
    r.id = `ct-sch-brkrow-${key}${sid}-${i}`;
    r.querySelectorAll('[data-brk-idx]').forEach(el=>el.setAttribute('data-brk-idx', i));
    const delBtn = r.querySelector('.btn-brk-del');
    if(delBtn) delBtn.setAttribute('onclick', `_removeBrkSlot2('${key}',${shiftIdx},${i})`);
  });
  calcWorkHours();
}

function _getBrkSlots2(key, shiftIdx){
  const sid = shiftIdx===0 ? '' : '-'+shiftIdx;
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}${sid}`);
  if(!wrap) return [];
  const rows = wrap.querySelectorAll('.brk-slot-row');
  const result = [];
  rows.forEach(row=>{
    const sEl = row.querySelector('[data-brk-type="s"]');
    const eEl = row.querySelector('[data-brk-type="e"]');
    result.push({ s: sEl ? sEl.value : '', e: eEl ? eEl.value : '' });
  });
  return result;
}
function _getBrkSlots(key){
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}`);
  if(!wrap) return [];
  const rows = wrap.querySelectorAll('.brk-slot-row');
  const result = [];
  rows.forEach(row=>{
    const sEl = row.querySelector('[data-brk-type="s"]');
    const eEl = row.querySelector('[data-brk-type="e"]');
    result.push({ s: sEl ? sEl.value : '', e: eEl ? eEl.value : '' });
  });
  return result;
}
function _addBrkSlot(key){
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}`);
  if(!wrap) return;
  const idx = wrap.querySelectorAll('.brk-slot-row').length;
  const div = document.createElement('div');
  div.innerHTML = _brkSlotsHTML(key, true, Array(idx).fill({s:'',e:''}).concat([{s:'',e:''}])).split('</div>').slice(-2,-1)[0] + '</div>';
  // 간단하게 새 슬롯 행만 생성
  const newRow = document.createElement('div');
  newRow.className = 'brk-slot-row';
  newRow.id = `ct-sch-brkrow-${key}-${idx}`;
  newRow.innerHTML =
    `<input type="time" class="brk-time" data-brk-key="${key}" data-brk-idx="${idx}" data-brk-type="s" value="" oninput="calcWorkHours()" />`
    + `<span class="brk-sep">~</span>`
    + `<input type="time" class="brk-time" data-brk-key="${key}" data-brk-idx="${idx}" data-brk-type="e" value="" oninput="calcWorkHours()" />`
    + `<button type="button" class="btn-brk-del" onclick="_removeBrkSlot('${key}',${idx})" title="휴게 슬롯 삭제">−</button>`;
  wrap.appendChild(newRow);
  calcWorkHours();
}
function _removeBrkSlot(key, idx){
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}`);
  if(!wrap) return;
  const row = document.getElementById(`ct-sch-brkrow-${key}-${idx}`);
  if(row) row.remove();
  // idx 재번호 부여
  wrap.querySelectorAll('.brk-slot-row').forEach((r,i)=>{
    r.id = `ct-sch-brkrow-${key}-${i}`;
    r.querySelectorAll('[data-brk-idx]').forEach(el=>el.setAttribute('data-brk-idx', i));
    // 삭제 버튼 onclick 갱신
    const delBtn = r.querySelector('.btn-brk-del');
    if(delBtn) delBtn.setAttribute('onclick', `_removeBrkSlot('${key}',${i})`);
  });
  calcWorkHours();
}
function _setBrkSlots(key, breaks, enabled){
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}`);
  if(!wrap) return;
  wrap.innerHTML = _brkSlotsHTML(key, enabled, breaks);
  // +버튼 disabled 동기화
  const addBtn = wrap.querySelector('.btn-brk-add');
  if(addBtn) addBtn.disabled = !enabled;
}

function initScheduleTable(){
  const tbody = document.getElementById('ct-schedule-tbody');
  if(!tbody) return;
  tbody.innerHTML = DAY_KEYS.map((key,i)=>{
    const isWknd = key==='sat'||key==='sun';
    const enabled = !isWknd;
    const color = i>=5 ? (i===5?'#2563eb':'#dc2626') : '#1e293b';
    return `
    <tr class="${DAY_CLASSES[i]}" id="ct-sch-row-${key}">
      <td><span class="day-label" style="color:${color}">${DAYS_KR[i]}</span></td>
      <td class="td-shifts"><div class="shifts-container" id="ct-sch-shifts-${key}">${_shiftGroupHTML(key, 0, enabled, '', '', null)}</div></td>
      <td><span class="computed-h" id="ct-sch-hrs-${key}">${enabled?'8시간':'-'}</span></td>
    </tr>`;
  }).join('');
  calcWorkHours();
}

function timeToMins(t){ if(!t) return null; const [h,m]=t.split(':').map(Number); return h*60+m; }

function calcWorkHours(){
  let totalWeekMins = 0;
  let workDays = 0;
  DAY_KEYS.forEach(key=>{
    const hrsEl = document.getElementById(`ct-sch-hrs-${key}`);
    let dayMins = 0;
    // 모든 시프트 합산
    let shiftIdx = 0;
    while(true){
      const sid = shiftIdx===0 ? '' : '-'+shiftIdx;
      const sEl = document.getElementById(`ct-sch-start-${key}${sid}`);
      if(!sEl){ if(shiftIdx===0){ shiftIdx++; continue; } break; }
      const s = timeToMins(sEl.value);
      const e = timeToMins((document.getElementById(`ct-sch-end-${key}${sid}`)||{}).value);
      if(s===null || e===null || e<=s){ shiftIdx++; continue; }
      const slots = _getBrkSlots2(key, shiftIdx);
      const totalBrk = slots.reduce((sum, b)=>{
        const bs = timeToMins(b.s), be = timeToMins(b.e);
        return sum + ((bs!==null && be!==null && be>bs) ? (be-bs) : 0);
      }, 0);
      dayMins += Math.max(0, e-s-totalBrk);
      shiftIdx++;
    }
    if(dayMins > 0){
      totalWeekMins += dayMins;
      workDays++;
      const h = dayMins/60;
      if(hrsEl) hrsEl.textContent = (Number.isInteger(h)?h:h.toFixed(1))+'시간';
    } else {
      if(hrsEl) hrsEl.textContent = '-';
    }
  });
  const avgDay = workDays > 0 ? totalWeekMins/workDays/60 : 0;
  const el_d = document.getElementById('ct-wsh-days');
  const el_w = document.getElementById('ct-wsh-week-hours');
  const el_a = document.getElementById('ct-wsh-day-hours');
  if(el_d) el_d.textContent = workDays;
  if(el_w) el_w.textContent = (totalWeekMins/60%1===0) ? totalWeekMins/60 : (totalWeekMins/60).toFixed(1);
  if(el_a) el_a.textContent = avgDay%1===0 ? avgDay : avgDay.toFixed(1);
  const hrsHid = document.getElementById('ct-hours'); if(hrsHid) hrsHid.value = avgDay.toFixed(2);
  const daysHid = document.getElementById('ct-days'); if(daysHid) daysHid.value = workDays;
  calcContractSalary();
}

// 스케줄 → JSON 직렬화 (저장용)
function getScheduleJSON(){
  return DAY_KEYS.map((key,i)=>{
    const shifts = [];
    let shiftIdx = 0;
    while(true){
      const sid = shiftIdx===0 ? '' : '-'+shiftIdx;
      const sEl = document.getElementById(`ct-sch-start-${key}${sid}`);
      if(!sEl) break;
      const slots = _getBrkSlots2(key, shiftIdx);
      shifts.push({
        start: sEl.value||'',
        end: (document.getElementById(`ct-sch-end-${key}${sid}`)||{}).value||'',
        breaks: slots,
        brk_start: slots[0]?.s || '',
        brk_end: slots[0]?.e || '',
      });
      shiftIdx++;
    }
    const active = shifts.length > 0 && shifts.some(sh => sh.start && sh.end);
    return { day: key, label: DAYS_KR[i], active, shifts };
  });
}

// JSON → 스케줄 UI 복원
function setScheduleFromJSON(schedule){
  if(!schedule || !Array.isArray(schedule)) return;
  schedule.forEach(row=>{
    const key = row.day;
    const container = document.getElementById(`ct-sch-shifts-${key}`);
    if(!container) return;
    const active = !!row.active;
    if(!active){
      container.innerHTML = _shiftGroupHTML(key, 0, false, '', '', []);
      return;
    }
    const shifts = (row.shifts && row.shifts.length) ? row.shifts
      : (row.start||row.end ? [{ start:row.start||'09:00', end:row.end||'18:00',
          breaks: Array.isArray(row.breaks)&&row.breaks.length ? row.breaks
            : (row.brk_start||row.brk_end?[{s:row.brk_start||'',e:row.brk_end||''}]:[{s:'12:00',e:'13:00'}]) }] : []);
    container.innerHTML = shifts.map((sh, idx) =>
      _shiftGroupHTML(key, idx, true, sh.start, sh.end, sh.breaks)
    ).join('');
  });
  calcWorkHours();
}

// 레거시 단일 시간 → 요일별 스케줄 변환
function setScheduleFromLegacy(c){
  const start = c.day_start||'09:00';
  const end   = c.day_end||'18:00';
  const brkMins = c.break_mins||60;
  const sMins = timeToMins(start)||540;
  const halfWork = Math.round(((timeToMins(end)||1080) - sMins - brkMins) / 2);
  const brkStart = sMins + halfWork;
  const brkEnd   = brkStart + brkMins;
  const toTime = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  const workDays = c.work_days_per_week||5;
  DAY_KEYS.forEach((key,i)=>{
    const active = i < workDays;
    const container = document.getElementById(`ct-sch-shifts-${key}`);
    if(!container) return;
    if(!active){ container.innerHTML = _shiftGroupHTML(key, 0, false, '', '', []); return; }
    const breaks = brkMins > 0 ? [{s: toTime(brkStart), e: toTime(brkEnd)}] : [];
    container.innerHTML = _shiftGroupHTML(key, 0, true, start, end, breaks);
  });
  calcWorkHours();
}

// initBreakSelects → initScheduleTable로 대체 (하위 호환 stub)
function initBreakSelects(){ initScheduleTable(); }
function getBreakMins(hId,mId){ return 0; }
function setBreakMins(hId,mId,totalMins){}
function toggleCtEndDate(preserveValue=false){
  const rawType = document.getElementById('ct-type').value;
  const type = CONTRACT_TYPE_LEGACY_MAP[rawType] || rawType;
  const endInput = document.getElementById('ct-end');
  const endRow   = document.getElementById('ct-row-end');
  const endReqSpan = document.getElementById('ct-end-required');
  // 계약직·계약직 수습·일용직만 계약 종료일 표시 (정규직·정규직 수습은 무기한 계약이므로 숨김)
  const isFixed    = type ===CONTRACT_TYPE.FIXED || type ===CONTRACT_TYPE.DAILY || type ===CONTRACT_TYPE.FIXED_PROBATION;
  const isRegular  = type ===CONTRACT_TYPE.REGULAR || type ===CONTRACT_TYPE.REGULAR_PROBATION;
  // 계약직·계약직 수습·일용직 모두 종료일 필수 (* 표시)
  const isRequired = isFixed;
  if(endRow)     endRow.style.display    = isRegular ? 'none' : '';
  if(endReqSpan) endReqSpan.style.display = isRequired ? '' : 'none';
  // 조회 모드(ct-readonly)이거나 preserveValue=true이면 값을 지우지 않음
  const modalEl = document.querySelector('#contract-modal .modal');
  const isReadonly = modalEl && modalEl.classList.contains('ct-readonly');
  endInput.disabled = !isFixed;
  endInput.style.background = isFixed ? '' : '#f3f4f6';
  endInput.style.color = isFixed ? '' : '#9ca3af';
  endInput.style.cursor = isFixed ? '' : 'not-allowed';
  if(!isFixed && !preserveValue && !isReadonly) endInput.value = '';
}
// ── 계약 양식 통상임금 지급유형 관리 ──
// pay_type 있는 수당 전체: car/remote-area/meal (버튼 UI) + research/communication/fitness/self_dev/book/overseas (고객사 설정)
const _ctPayTypes = {
  car: 'fixed', 'self-driving': 'fixed', 'remote-area': 'fixed', meal: 'fixed',
  research: 'fixed', communication: 'fixed', fitness: 'fixed',
  self_dev: 'fixed', book: 'fixed', overseas: 'fixed',
};

// allowance_config 기준으로 해당 수당이 이 고객사에서 활성화되어 있는지 추적
// car/meal은 항상 활성(기본 수당)이므로 true로 초기화
const _ctAllowCfgVisible = {
  car: false, meal: false,
  research: false, communication: false, fitness: false,
  self_dev: false, book: false, overseas: false,
  childcare: false,
};

// pay_type 있는 수당의 row id 매핑 (임금조건 숨김/표시 제어용)
const _CT_PAY_TYPE_ROWS = {
  car         : 'ct-row-car',
  meal        : 'ct-row-meal',
  research    : 'ct-row-research',
  communication: 'ct-row-communication',
  fitness     : 'ct-row-fitness',
  self_dev    : 'ct-row-self-dev',
  book        : 'ct-row-book',
  overseas    : 'ct-row-overseas',
};

function setCTPayType(field, type){
  _ctPayTypes[field] = type;
  // 힌트 텍스트로 통상임금 포함여부를 표시하는 항목
  const hintOnlyFields = ['car','meal','research','communication','fitness','self_dev','book','overseas'];
  if(hintOnlyFields.includes(field)){
    const htmlField = field.replace(/_/g, '-');
    const hintEl = document.getElementById(`ct-${htmlField}-type-hint`);
    if(hintEl){
      const labels = { fixed: '통상임금 포함', daily: '통상임금 제외 (출근일수 비례)', receipt: '통상임금 제외 (영수증 청구)' };
      const colors = { fixed: '#9ca3af', daily: '#f59e0b', receipt: '#f59e0b' };
      hintEl.textContent = labels[type] || '통상임금 포함';
      hintEl.style.color  = colors[type]  || '#9ca3af';
    }

    // ── 통상임금 불포함(daily/receipt) 항목은 근로계약 임금조건에서 DOM 완전 제거 ──
    // allowance_config 기준 활성화된 항목에만 적용
    // (비활성 항목은 applyCTAllowanceConfig에서 이미 display:none 처리)
    const rowId = _CT_PAY_TYPE_ROWS[field];
    if(rowId && _ctAllowCfgVisible[field] !== false){
      const rowEl = document.getElementById(rowId);
      if(rowEl){
        const isFixed = (type === 'fixed');
        if(!isFixed){
          // 입력값 초기화 후 DOM에서 완전 제거
          const inputEl = document.getElementById(`ct-${field.replace(/_/g,'-')}`);
          if(inputEl) inputEl.value = '';
          rowEl.remove();
        }
        // isFixed인 경우: row가 이미 DOM에 존재하므로 별도 처리 불필요
        // (applyCTAllowanceConfig 내 setCTPayType 순서 보장)
      }
    }
  }
  calcContractSalary();
}
function _getCTPayTypeVal(field){ return _ctPayTypes[field] || 'fixed'; }
// 해당 수당이 월 약정임금 합산 대상인지 반환 (fixed = 매월 정기지급 = 포함, 그 외 제외)
function _isFixedAllow(field){ return _getCTPayTypeVal(field) === 'fixed'; }
function _resetCTPayTypes(){
  // remote-area는 항상 fixed이므로 reset 목록에서 제외
  ['car','meal','research','communication','fitness','self_dev','book','overseas']
    .forEach(f=>{ _ctPayTypes[f]='fixed'; setCTPayType(f,'fixed'); });
}

// ── 근로계약 모달 — 고객사별 옵셔널 수당 show/hide ──
// ※ 순서는 고객사 설정(allowance_config) 화면 순서와 동일하게 유지
// 고객사 설정 순서: regular_bonus → childcare → car → meal → site → position → skill → license → remote_area → research...
// 모든 수당 항목이 allowance_config 기준 조건부 표시 (car/meal 포함)
const _CT_OPT_ROWS = [
  { key:'regular_bonus', rowId:'ct-row-regular-bonus' }, // 정기 상여금: 통상임금 포함 고정
  { key:'childcare',     rowId:'ct-row-childcare'     }, // 보육수당
  { key:'car',           rowId:'ct-row-car'           }, // 차량지원비
  { key:'meal',          rowId:'ct-row-meal'          }, // 식대
  { key:'site',          rowId:'ct-row-site'          }, // 현장수당
  { key:'position',      rowId:'ct-row-position'      }, // 직책수당
  { key:'skill',         rowId:'ct-row-skill'         }, // 기술수당
  { key:'license',       rowId:'ct-row-license'       }, // 면허수당
  { key:'remote_area',   rowId:'ct-row-remote-area'   }, // 벽지수당
  { key:'research',      rowId:'ct-row-research'      }, // 연구활동비
  { key:'communication', rowId:'ct-row-communication' }, // 통신비
  { key:'fitness',       rowId:'ct-row-fitness'       }, // 체력증진비
  { key:'self_dev',      rowId:'ct-row-self-dev'      }, // 자기계발비
  { key:'book',          rowId:'ct-row-book'          }, // 도서지원비
  { key:'overseas',      rowId:'ct-row-overseas'      }, // 해외근무수당
];
// clearValues=true: 숨기는 항목의 입력값도 0으로 초기화 (신규/고객사변경 시)
// clearValues=false: show/hide만 적용 (수정 모드 — 값은 loadCT에서 복원)
function applyCTAllowanceConfig(cfg, clearValues = false){
  _CT_OPT_ROWS.forEach(({ key, rowId }) => {
    const rowEl = document.getElementById(rowId);
    const visible = !!(cfg && cfg[key]);
    if(rowEl) rowEl.style.display = visible ? '' : 'none';
    if(!visible && clearValues){
      if(key === 'childcare'){
        // 보육수당: 금액 + 부양가족 수 모두 초기화
        setAmountVal('ct-childcare', 0);
        const depEl = document.getElementById('ct-childcare-dependents');
        if(depEl) depEl.value = 1;
      } else {
        const inputId = rowId.replace('ct-row-', 'ct-');
        setAmountVal(inputId, 0);
      }
    }
  });
  // ── _ctAllowCfgVisible 상태 갱신 (pay_type 제거 로직용) ──
  ['car','meal','childcare','research','communication','fitness','self_dev','book','overseas'].forEach(f => {
    _ctAllowCfgVisible[f] = !!(cfg && cfg[f]);
  });
  // pay_type 있는 수당: allowance_config에서 pay_type 읽어 반영
  // ※ _ctAllowCfgVisible 갱신 후 setCTPayType 호출해야 DOM 제거 로직이 올바르게 동작
  const _PT_FIELDS = ['car','meal','research','communication','fitness','self_dev','book','overseas'];
  _PT_FIELDS.forEach(f => {
    const pt = (cfg && cfg[`${f}_pay_type`]) ? cfg[`${f}_pay_type`] : 'fixed';
    setCTPayType(f, pt);
  });
  // ── 신규 작성 시 car/meal 기본값 설정 ──
  if(clearValues){
    if(cfg){
      const _carPt  = cfg.car_pay_type  || 'fixed';
      const _mealPt = cfg.meal_pay_type || 'fixed';
      if(cfg.car)  setAmountVal('ct-car',  _carPt  === 'fixed' ? 200000 : 0);
      if(cfg.meal) setAmountVal('ct-meal', _mealPt === 'fixed' ? 200000 : 0);
    }
  }
  // 보육수당 pay_type 힌트 갱신
  if(cfg && cfg.childcare){
    const _ccPt = cfg.childcare_pay_type || 'fixed';
    const ccHint = document.getElementById('ct-childcare-type-hint');
    if(ccHint){
      ccHint.textContent = (_ccPt === 'fixed') ? '통상임금 포함' : '통상임금 제외';
    }
  }
}

/**
 * 계약 시작일(ct-start 또는 ct-em-start) 변경 시 핸들러
 *
 * ▸ 신규 모드: 계약시작일과 무관하게 현재 고객사 allowance_config를 직접 적용
 *   - 스냅샷을 사용하지 않는 이유: getCompanySnapshotAt은 changed_at > timestamp 조건의
 *     첫 번째 이력 snapshot을 반환하는데, 이 snapshot은 "변경 직전 상태"를 담고 있음.
 *     따라서 계약시작일이 최근 설정 변경 이전 날짜이면 과거(position=true 등) 스냅샷이
 *     반환되어 현재 설정과 다른 급여항목이 표시되는 버그가 발생.
 *     신규 계약은 항상 "지금 고객사 설정"을 기준으로 작성해야 하므로 현재값 직접 사용.
 *
 * ▸ 수정·재계약·amend 모드: getCompanySnapshotAt으로 계약시작일 당시 설정 적용
 *   - 기존 계약서는 체결 당시 설정 기준으로 작성됐으므로 스냅샷 적용이 올바름
 *
 * ▸ 조회 전용(ct-readonly) 상태에서는 동작하지 않음
 * ▸ clearValues=false: 이미 입력한 금액 값은 유지, show/hide + pay_type만 갱신
 */
function onCtStartChange(){
  // 신규 모드(ct-new-emp-section 표시 중): ct-em-start 참조
  // 수정·재계약·amend 모드: ct-start 참조
  const isNewMode = document.getElementById('ct-new-emp-section')?.style.display !== 'none';
  const startVal  = isNewMode
    ? (document.getElementById('ct-em-start')?.value  || '')
    : (document.getElementById('ct-start')?.value     || '');
  const coId     = document.getElementById('ct-company')?.value;
  // 조회 전용 모드(ct-readonly)에서는 동작하지 않음
  const modalEl = document.querySelector('#contract-modal .modal');
  const isReadonly = modalEl && modalEl.classList.contains('ct-readonly');
  if(isReadonly) return;
  if(!startVal || !coId) return;

  let cfg = null;
  if(isNewMode){
    // 신규 모드: 스냅샷 미사용 — 현재 고객사 allowance_config를 직접 참조
    // (스냅샷 사용 시 과거 이력의 position=true 등이 잘못 적용되는 버그 방지)
    const co = (allCompanies || []).find(x => x.id === coId);
    cfg = co?.allowance_config ?? null;
  } else {
    // 수정·재계약·amend 모드: 계약시작일 당시 스냅샷 기준
    const ts     = new Date(startVal).getTime();
    const snapCo = (typeof getCompanySnapshotAt === 'function')
      ? getCompanySnapshotAt(coId, ts)
      : (allCompanies || []).find(x => x.id === coId);
    cfg = snapCo?.allowance_config ?? null;
  }
  if(typeof cfg === 'string'){
    try{ cfg = JSON.parse(cfg); }catch(e){ cfg = {}; }
  }
  // clearValues=false: 기입력 금액은 유지하면서 show/hide + pay_type만 갱신
  applyCTAllowanceConfig(cfg, false);
}

/**
 * 고객사(ct-company) 변경 시 핸들러
 *
 * 고객사를 변경하면 해당 고객사의 allowance_config를 적용한다.
 * - ct-start 값이 있으면 해당 시점 스냅샷 기준
 * - ct-start 값이 없으면 최신 allowance_config 기준 (clearValues=true: 값 초기화)
 * ▸ 동작 모드: 신규 / 재계약 모드에서 동작
 *   - 수정(edit)/amend 모드에서는 고객사를 변경할 수 없으므로 ct-readonly 체크로 차단
 */
function onCtCompanyChange(){
  // 조회 전용(ct-readonly) 상태에서는 동작하지 않음
  const modalEl = document.querySelector('#contract-modal .modal');
  const isReadonly = modalEl && modalEl.classList.contains('ct-readonly');
  if(isReadonly) return;

  const coId     = document.getElementById('ct-company')?.value;
  // 신규 모드: ct-em-start(계약시작일), 수정·재계약 모드: ct-start
  const isNewModeForCompany = document.getElementById('ct-new-emp-section')?.style.display !== 'none';
  const startVal = isNewModeForCompany
    ? (document.getElementById('ct-em-start')?.value || '')
    : (document.getElementById('ct-start')?.value    || '');

  if(!coId){
    // 고객사 미선택: 기본값(차량 0, 식대 200,000) 적용
    applyCTAllowanceConfig(null, true);
    return;
  }

  let cfg = null;
  if(!isNewModeForCompany && startVal){
    // 수정·재계약 모드 + 계약시작일 있음: 스냅샷 기준
    // (신규 모드에서는 스냅샷 미사용 — 현재 설정 직접 참조)
    const ts     = new Date(startVal).getTime();
    const snapCo = (typeof getCompanySnapshotAt === 'function')
      ? getCompanySnapshotAt(coId, ts)
      : (allCompanies || []).find(x => x.id === coId);
    cfg = snapCo?.allowance_config ?? null;
  } else {
    // 신규 모드이거나 계약시작일 없음: 현재 고객사 allowance_config 직접 참조
    const co = (allCompanies || []).find(x => x.id === coId);
    cfg = co?.allowance_config ?? null;
  }
  if(typeof cfg === 'string'){
    try{ cfg = JSON.parse(cfg); }catch(e){ cfg = {}; }
  }
  // 고객사 변경 시: clearValues=true (금액 초기화 + 기본값 재설정)
  applyCTAllowanceConfig(cfg, true);
  // 급여일 기본값: 고객사 pay_day → 계약서 필드
  _setCtPayDayDefault(coId);
}

/** 고객사 pay_day를 계약서 급여일 필드 기본값으로 설정 */
function _setCtPayDayDefault(coId){
  const payDayEl = document.getElementById('ct-pay-day');
  const hintEl   = document.getElementById('ct-pay-day-default');
  if(!payDayEl) return;
  const co = coId ? (allCompanies||[]).find(x => x.id === coId) : null;
  const coPayDay = co?.pay_day;
  if(hintEl){
    hintEl.textContent = coPayDay ? `(고객사 기본: 매월 ${coPayDay}일)` : '(고객사 미설정)';
  }
  // 고객사 급여일이 있고 계약서 필드가 비어있으면 값을 채움 (placeholder 대신 실제 값)
  if(coPayDay && !payDayEl.value){
    payDayEl.value = coPayDay;
  }
}

// 수정 모드 하위호환: allowance_config와 무관하게 DB에 저장된 값이 있는 항목 강제 노출
// ※ 단, 통상임금 불포함(daily/receipt) 수당은 근로계약 임금조건에 노출하지 않으므로
//    pay_type이 fixed인 항목만 force-show 대상으로 한정
function _forceShowNonZeroCTRows(c){
  const _fieldMap = {
    regular_bonus : 'regular_bonus',       // 계약서 DB 컬럼
    childcare     : 'childcare_allowance', // 보육수당
    site          : 'site_allowance',
    position      : 'position_allowance',  // 직책수당
    skill         : 'skill_allowance',
    license       : 'license_allowance',
    remote_area   : 'remote_area_allowance',
    research      : 'research_allowance',
    communication : 'communication_allowance',
    fitness       : 'fitness_allowance',
    self_dev      : 'self_dev_allowance',
    book          : 'book_allowance',
    overseas      : 'overseas_allowance',
  };
  // pay_type 매핑 (DB 필드명 → _ctPayTypes key)
  const _ptKeyMap = {
    research: 'research', communication: 'communication', fitness: 'fitness',
    self_dev: 'self_dev', book: 'book', overseas: 'overseas',
    // site/skill/license/remote_area는 pay_type 없음(항상 fixed 취급)
  };
  _CT_OPT_ROWS.forEach(({ key, rowId }) => {
    const field = _fieldMap[key];
    if(field && Number(c[field]||0) > 0){
      // 통상임금 불포함(daily/receipt) 항목은 force-show 하지 않음
      // — 해당 항목은 setCTPayType에서 이미 DOM 제거됨
      const ptKey = _ptKeyMap[key];
      if(ptKey && _ctPayTypes[ptKey] && _ctPayTypes[ptKey] !== 'fixed') return;
      const rowEl = document.getElementById(rowId);
      if(rowEl) rowEl.style.display = '';
    }
  });
}

/**
 * 법령 기준 월 통상임금 산정 기준시간 수 (근로기준법 시행령 제6조 제2항)
 *
 * 공식: (주 소정근로시간 + 주휴시간) × 52 ÷ 12
 *   - 주휴시간 = 1일 소정근로시간 (= hpd)
 *   - 전일제 주5일 8h: (40+8)×52÷12 ≈ 208 → 실무상 209h 사용(연도말 보정)
 *     ※ 고용노동부 및 대법원 통례: 주 40h 전일제는 209h 적용
 *   - 단시간: (주소정h + hpd) × 52 ÷ 12 (비례 계산)
 *
 * @param {number} hpd  1일 소정근로시간 (hours per day)
 * @param {number} dpw  주 소정근로일수 (days per week)
 * @returns {number}    월 통상임금 산정 기준시간 수 (정수)
 */
function _calcMonthlyStdHours(hpd, dpw){
  hpd = parseFloat(hpd) || 8;
  dpw = parseFloat(dpw) || 5;
  const weeklyH    = hpd * dpw;                     // 주 소정근로시간
  const weeklyHolH = hpd;                           // 주휴시간 = 1일 소정근로시간
  // 전일제(주 40h 이상): 고용노동부·대법원 통례 209h 적용
  if(weeklyH >= 40) return 209;
  // 단시간: (주소정근로h + 주휴h) × 52 ÷ 12
  return Math.round((weeklyH + weeklyHolH) * 52 / 12);
}

function calcContractSalary(){
  // 수정 모드이면 ct-edit-em-category, 신규이면 ct-em-category 기준
  const rawCat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-edit-em-category')?.value || document.getElementById('ct-em-category').value)
    : document.getElementById('ct-em-category').value;
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isDaily        = cat ===CONTRACT_TYPE.DAILY;
  const isRegularGroup = cat ===CONTRACT_TYPE.REGULAR || cat ===CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedTerm    = cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION;

  // 수당 값 읽기 (일용직은 일일 기준 입력값 그대로 사용)
  const position   = getAmountVal('ct-position');
  const car        = getAmountVal('ct-car');
  const remoteArea = getAmountVal('ct-remote-area');
  const meal       = getAmountVal('ct-meal');
  const research   = getAmountVal('ct-research');
  const site_ct    = getAmountVal('ct-site')||0;
  const skill_ct   = getAmountVal('ct-skill')||0;
  const license_ct = getAmountVal('ct-license')||0;
  const comm_ct    = getAmountVal('ct-communication')||0;
  const fitness_ct = getAmountVal('ct-fitness')||0;
  const selfDev_ct = getAmountVal('ct-self-dev')||0;
  const book_ct    = getAmountVal('ct-book')||0;
  const overseas_ct= getAmountVal('ct-overseas')||0;
  const regularBonus_ct = getAmountVal('ct-regular-bonus')||0;

  if(isDaily){
    // ── 일용직: 일 약정일급 + 일일 기준 수당 합산 ──
    const dailyWage  = getAmountVal('ct-daily-wage');
    const hours      = parseFloat(document.getElementById('ct-hours').value)||8;

    // 일일 수당 합계 (통상임금 포함 항목만)
    const dailyAllowFixed = position + car + remoteArea + meal
      + site_ct + skill_ct + license_ct + research + comm_ct
      + fitness_ct + selfDev_ct + book_ct + overseas_ct + regularBonus_ct;

    document.getElementById('ct-weekly-hol-computed').textContent = '0원';
    document.getElementById('ct-monthly-computed').textContent    = '0원';
    _checkMinWageWarning();
    _checkRegisterBtnState();
    _checkAmendBtnState();
    return;
  }

  // ── 월 약정임금 합산용 수당 (fixed 항목만) ──
  // 정기 상여금은 통상임금 포함 고정 항목이므로 allAllow에 포함
  const allAllow = position
    + (_isFixedAllow('car')           ? car         : 0)
    + remoteArea
    + (_isFixedAllow('meal')          ? meal        : 0)
    + (_isFixedAllow('research')      ? research    : 0)
    + site_ct + skill_ct + license_ct
    + (_isFixedAllow('communication') ? comm_ct     : 0)
    + (_isFixedAllow('fitness')       ? fitness_ct  : 0)
    + (_isFixedAllow('self_dev')      ? selfDev_ct  : 0)
    + (_isFixedAllow('book')          ? book_ct     : 0)
    + (_isFixedAllow('overseas')      ? overseas_ct : 0)
    + regularBonus_ct;

  const annualSal = getAmountVal('ct-annual-sal'); // 정규직: 연봉 / 계약직: 월약정급여

  // 주 소정근로시간 파악 (단시간 비례 계산용) — 역산 블록보다 먼저 선언
  const _hpd = parseFloat(document.getElementById('ct-hours')?.value) || 8;
  const _dpw = parseFloat(document.getElementById('ct-days')?.value)  || 5;
  const _monthlyStdH = _calcMonthlyStdHours(_hpd, _dpw); // 법령 기준 월 산정시간

  if(isRegularGroup && annualSal > 0){
    // 정규직: 연봉 ÷ 12 → 기본급 역산
    // 공식: monthly = base × (1 + 1/dpw) + allAllow
    //   → base = (monthly - allAllow) × dpw / (dpw + 1)
    const monthly0  = Math.round(annualSal / 12);
    const autoBase  = Math.max(0, Math.round((monthly0 - allAllow) * _dpw / (_dpw + 1)));
    setAmountVal('ct-base', autoBase);
  } else if(isFixedTerm && annualSal > 0){
    // 계약직: 월약정급여 → 기본급 역산
    // 공식: monthly = base × (1 + 1/dpw) + allAllow
    //   → base = (monthly - allAllow) × dpw / (dpw + 1)
    const autoBase = Math.max(0, Math.round((annualSal - allAllow) * _dpw / (_dpw + 1)));
    setAmountVal('ct-base', autoBase);
  }

  const base      = getAmountVal('ct-base');
  // 주휴수당 = 기본급 ÷ 주 소정근로일수 (단시간 비례 적용)
  // · 주 5일: base÷5, 주 4일: base÷4, 주 3일: base÷3
  const weeklyHol = Math.round(base / _dpw);
  document.getElementById('ct-weekly-hol-computed').textContent = won(weeklyHol);

  // 월 약정임금 표시
  let monthly;
  if(isRegularGroup && annualSal > 0){
    monthly = Math.round(annualSal / 12);
  } else if(isFixedTerm && annualSal > 0){
    monthly = annualSal; // 계약직은 입력값 자체가 월약정급여
  } else {
    monthly = base + weeklyHol + allAllow;
  }
  document.getElementById('ct-monthly-computed').textContent = won(monthly);

  syncProbation();
  _checkMinWageWarning();
  _checkRegisterBtnState();
  _checkAmendBtnState();
}

// ── 고정 연장/야간/휴일근로수당 양방향 자동계산 ──
// 공식: 연장 = 통상시급 × h × 1.5 / 야간 = 통상시급 × h × 0.5 / 휴일 = 통상시급 × h × 1.5
function _getContractHourlyWage(){
  return getAmountVal('ct-hourly-input') || 0;
}
function _calcFixedOtFromHours(){
  const hw = _getContractHourlyWage();
  const h  = parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0;
  if(hw > 0 && h > 0) setAmountVal('ct-fixed-ot-pay', Math.round(hw * h * 1.5));
}
function _calcFixedOtFromPay(){
  const hw  = _getContractHourlyWage();
  const pay = getAmountVal('ct-fixed-ot-pay');
  const hEl = document.getElementById('ct-fixed-ot-hours');
  if(hw > 0 && pay > 0 && hEl) hEl.value = Math.round(pay / hw / 1.5 * 10) / 10;
}
function _calcFixedNightFromHours(){
  const hw = _getContractHourlyWage();
  const h  = parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0;
  if(hw > 0 && h > 0) setAmountVal('ct-fixed-night-pay', Math.round(hw * h * 0.5));
}
function _calcFixedNightFromPay(){
  const hw  = _getContractHourlyWage();
  const pay = getAmountVal('ct-fixed-night-pay');
  const hEl = document.getElementById('ct-fixed-night-hours');
  if(hw > 0 && pay > 0 && hEl) hEl.value = Math.round(pay / hw / 0.5 * 10) / 10;
}
function _calcFixedHolFromHours(){
  const hw = _getContractHourlyWage();
  const h  = parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0;
  if(hw > 0 && h > 0) setAmountVal('ct-fixed-hol-pay', Math.round(hw * h * 1.5));
}
function _calcFixedHolFromPay(){
  const hw  = _getContractHourlyWage();
  const pay = getAmountVal('ct-fixed-hol-pay');
  const hEl = document.getElementById('ct-fixed-hol-hours');
  if(hw > 0 && pay > 0 && hEl) hEl.value = Math.round(pay / hw / 1.5 * 10) / 10;
}

/** ── 근로계약 관리 알림 카드 렌더링 ── */
