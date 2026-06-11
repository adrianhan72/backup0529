// ─── 브랜드 서명 (모든 발송 메시지 하단 공통) ───
const _BRAND_SIG = '─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스';

// ─── EMPLOYEES ───
// ─── CONTRACTS ───
function toggleEmExpire(){
  const cat = document.getElementById('ct-em-category').value;
  const expInput   = document.getElementById('ct-em-expire');
  const expRow     = document.getElementById('ct-new-row-expire');
  const expReqSpan = document.getElementById('ct-expire-required');
  // 계약직·계약직 수습·일용직만 퇴사예정일 표시 (정규직·정규직 수습은 무기한 계약이므로 숨김)
  const isFixed    = cat === '계약직' || cat === '계약직 수습' || cat === '일용직';
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

    const cat = document.getElementById('ct-em-category')?.value || '';
    const isFixedContract = cat === '계약직' || cat === '계약직 수습';

    if(!isFixedContract){
      warningRow.style.display = 'none';
      return false;
    }

    const hire   = document.getElementById('ct-em-hire')?.value;
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

    const cat = document.getElementById('ct-type')?.value || '';
    const isFixedContract = cat === '계약직' || cat === '계약직 수습';

    if(!isFixedContract){
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
/** 고객사 선택 시 ct-pay-period에 기본값(co.pay_period) 자동 세팅 */
function _autoFillCTPeriod(){
  const coId = document.getElementById('ct-company')?.value || currentContCompanyId;
  const co   = allCompanies.find(c => c.id === coId);
  const el   = document.getElementById('ct-pay-period');
  const hint = document.getElementById('ct-pay-period-hint');
  if(!el) return;
  // 이미 값이 있으면 덮어쓰지 않음 (수정 모드에서 기존 값 유지)
  if(!el.value && co?.pay_period){
    el.value = co.pay_period;
  }
  if(hint && co?.pay_period){
    hint.textContent = `(고객사 기본값: ${co.pay_period})`;
    hint.style.display = 'inline';
  }
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
  const cat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-type')?.value || '')
    : document.getElementById('ct-em-category').value;
  const isRegularGroup = cat === '정규직' || cat === '정규직 수습';
  const isFixedTerm    = cat === '계약직' || cat === '계약직 수습'; // 계약직 계열
  const isDaily        = cat === '일용직';

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
  const cat = document.getElementById('ct-em-category').value;
  const isProbation = cat === '정규직 수습' || cat === '계약직 수습';
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
    // 최저임금 기준: 입사연도 최저시급 × 209시간 = 월 환산 최저임금
    const hireRaw = document.getElementById('ct-em-hire')?.value
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

  const emCat = document.getElementById('ct-em-category')?.value || '';
  const basis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary';
  const isRegular  = emCat === '정규직 수습';
  const isContract = emCat === '계약직 수습';

  // 검증 대상 조합: 정규직수습+(minwage/direct/salary) / 계약직수습+(direct/salary)
  const needCheck = (isRegular  && (basis === 'minwage' || basis === 'direct' || basis === 'salary'))
                 || (isContract && (basis === 'direct'  || basis === 'salary'));
  if(!needCheck){
    warningRow.style.display = 'none';
    return;
  }

  // ── 최저임금 월환산 조회 (계약 시작연도 기준) ──
  const hireRaw = document.getElementById('ct-em-hire')?.value
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
  const cat = document.getElementById('ct-em-category')?.value
    || document.getElementById('ct-edit-em-category')?.value
    || document.getElementById('ct-type')?.value
    || '';

  const isDaily       = cat === '일용직';
  const isRegular     = cat === '정규직';
  const isFixedTerm   = cat === '계약직';
  const isTarget      = isDaily || isRegular || isFixedTerm; // 수습 제외
  if(!isTarget){ wRow.style.display='none'; _checkRegisterBtnState(); return; }

  // ── 계약 시작 연도 결정 ──
  const hireRaw = document.getElementById('ct-em-hire')?.value
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
    compareHourly  = compareMonthly > 0 ? Math.round(compareMonthly / 209) : 0;
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

// ── 일괄 설정 적용 ──
function applyBulkSchedule(){
  const start = document.getElementById('bulk-start').value;
  const end   = document.getElementById('bulk-end').value;
  const brks  = document.getElementById('bulk-brks').value;
  const brke  = document.getElementById('bulk-brke').value;

  // 유효성 체크
  if(!start || !end){
    toast('출근·퇴근 시간을 입력해 주세요.', 'error'); return;
  }
  if(start >= end){
    toast('퇴근 시간이 출근 시간보다 늦어야 합니다.', 'error'); return;
  }
  if(brks && brke && brks >= brke){
    toast('휴게 종료 시간이 시작 시간보다 늦어야 합니다.', 'error'); return;
  }

  // 적용 대상 요일 결정
  const applyWeekday = document.getElementById('bulk-chk-weekday').checked;
  const applySat     = document.getElementById('bulk-chk-sat').checked;
  const applySun     = document.getElementById('bulk-chk-sun').checked;

  const targets = [];
  if(applyWeekday) targets.push(...['mon','tue','wed','thu','fri']);
  if(applySat)     targets.push('sat');
  if(applySun)     targets.push('sun');

  if(targets.length === 0){
    toast('적용할 요일을 하나 이상 선택해 주세요.', 'error'); return;
  }

  let applied = 0;
  targets.forEach(key=>{
    const chk = document.getElementById(`ct-sch-chk-${key}`);
    if(!chk) return;

    // 체크 안 된 요일이면 먼저 체크 활성화 (onDayToggle로 필드 unlock)
    if(!chk.checked){
      chk.checked = true;
      onDayToggle(key);
    }

    const sEl = document.getElementById(`ct-sch-start-${key}`);
    const eEl = document.getElementById(`ct-sch-end-${key}`);
    if(sEl) sEl.value = start;
    if(eEl) eEl.value = end;
    // 휴게: 첫 번째 슬롯만 갱신 (기존 복수 슬롯 구조 유지)
    const wrap = document.getElementById(`ct-sch-brkwrap-${key}`);
    if(wrap){
      const firstS = wrap.querySelector('[data-brk-type="s"]');
      const firstE = wrap.querySelector('[data-brk-type="e"]');
      if(firstS) firstS.value = brks;
      if(firstE) firstE.value = brke;
    }
    applied++;
  });

  calcWorkHours();

  if(applied === 0){
    toast('적용할 요일을 찾을 수 없습니다.', 'warning');
  } else {
    toast(`${applied}개 요일에 근무시간이 일괄 적용되었습니다. ✔`, 'success');
  }
}

// ── 휴게 슬롯 렌더 헬퍼 ──
function _brkSlotsHTML(key, enabled, breaks){
  // breaks: [{s:'12:00', e:'13:00'}, ...]
  const slots = (breaks && breaks.length) ? breaks : (enabled ? [{s:'12:00', e:'13:00'}] : [{s:'', e:''}]);
  return slots.map((b, idx) => {
    const isFirst = idx === 0;
    const dis = enabled ? '' : 'disabled';
    return `<div class="brk-slot-row" id="ct-sch-brkrow-${key}-${idx}">`
      + `<input type="time" class="brk-time" data-brk-key="${key}" data-brk-idx="${idx}" data-brk-type="s"`
      + ` value="${b.s||''}" oninput="calcWorkHours()" ${dis} />`
      + `<span class="brk-sep">~</span>`
      + `<input type="time" class="brk-time" data-brk-key="${key}" data-brk-idx="${idx}" data-brk-type="e"`
      + ` value="${b.e||''}" oninput="calcWorkHours()" ${dis} />`
      + (idx > 0
          ? `<button type="button" class="btn-brk-del" onclick="_removeBrkSlot('${key}',${idx})" ${dis} title="휴게 슬롯 삭제">−</button>`
          : `<button type="button" class="btn-brk-add" onclick="_addBrkSlot('${key}')" ${dis?'disabled':''} title="휴게시간 추가">+</button>`)
      + `</div>`;
  }).join('');
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
    const on = DAY_DEFAULTS[key];
    const isWknd = key==='sat'||key==='sun';
    const defBreaks = (on && !isWknd) ? [{s:'12:00', e:'13:00'}] : [{s:'', e:''}];
    const color = i>=5 ? (i===5?'#2563eb':'#dc2626') : '#1e293b';
    return `
    <tr class="${DAY_CLASSES[i]}" id="ct-sch-row-${key}">
      <td><input type="checkbox" class="day-toggle" id="ct-sch-chk-${key}" onchange="onDayToggle('${key}')" ${on?'checked':''} /></td>
      <td><span class="day-label" style="color:${color}">${DAYS_KR[i]}</span></td>
      <td><input type="time" id="ct-sch-start-${key}" value="${on?'09:00':''}" oninput="calcWorkHours()" ${on?'':'disabled'} /></td>
      <td><input type="time" id="ct-sch-end-${key}" value="${on?'18:00':''}" oninput="calcWorkHours()" ${on?'':'disabled'} /></td>
      <td class="td-brk"><div class="brk-slots-wrap" id="ct-sch-brkwrap-${key}">${_brkSlotsHTML(key, on, defBreaks)}</div></td>
      <td><span class="computed-h" id="ct-sch-hrs-${key}">${on?'8시간':'-'}</span></td>
      <td><input type="text" id="ct-sch-note-${key}" placeholder="비고" style="width:100%;border:1px solid #e2e8f0;border-radius:5px;padding:3px 6px;font-size:11.5px;font-family:inherit;" ${on?'':'disabled'} /></td>
    </tr>`;
  }).join('');
  calcWorkHours();
}

function onDayToggle(key){
  const chk = document.getElementById(`ct-sch-chk-${key}`).checked;
  const isWknd = key==='sat'||key==='sun';
  // 출근·퇴근·비고
  ['start','end','note'].forEach(f=>{
    const el = document.getElementById(`ct-sch-${f}-${key}`);
    if(!el) return;
    el.disabled = !chk;
    if(!chk) el.value = '';
  });
  // 휴게 슬롯 전체 활성/비활성
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}`);
  if(wrap){
    wrap.querySelectorAll('input').forEach(el=>{ el.disabled=!chk; if(!chk) el.value=''; });
    const addBtn = wrap.querySelector('.btn-brk-add');
    if(addBtn) addBtn.disabled = !chk;
    const delBtns = wrap.querySelectorAll('.btn-brk-del');
    delBtns.forEach(b=>b.disabled=!chk);
  }
  if(chk){
    const sEl = document.getElementById(`ct-sch-start-${key}`); if(sEl && !sEl.value) sEl.value='09:00';
    const eEl = document.getElementById(`ct-sch-end-${key}`);   if(eEl && !eEl.value) eEl.value='18:00';
    // 슬롯이 비어있으면 평일 기본값 세팅
    if(!isWknd && wrap){
      const firstS = wrap.querySelector('[data-brk-type="s"]');
      const firstE = wrap.querySelector('[data-brk-type="e"]');
      if(firstS && !firstS.value) firstS.value='12:00';
      if(firstE && !firstE.value) firstE.value='13:00';
    }
  }
  const hrsEl = document.getElementById(`ct-sch-hrs-${key}`);
  if(hrsEl && !chk) hrsEl.textContent = '-';
  calcWorkHours();
}

function timeToMins(t){ if(!t) return null; const [h,m]=t.split(':').map(Number); return h*60+m; }

function calcWorkHours(){
  let totalWeekMins = 0;
  let workDays = 0;
  DAY_KEYS.forEach(key=>{
    const chk = document.getElementById(`ct-sch-chk-${key}`);
    const hrsEl = document.getElementById(`ct-sch-hrs-${key}`);
    if(!chk || !chk.checked){ if(hrsEl) hrsEl.textContent='-'; return; }
    const s = timeToMins((document.getElementById(`ct-sch-start-${key}`)||{}).value);
    const e = timeToMins((document.getElementById(`ct-sch-end-${key}`)||{}).value);
    // 복수 휴게 슬롯 합산
    const slots = _getBrkSlots(key);
    const totalBrk = slots.reduce((sum, b)=>{
      const bs = timeToMins(b.s), be = timeToMins(b.e);
      return sum + ((bs!==null && be!==null && be>bs) ? (be-bs) : 0);
    }, 0);
    if(s!==null && e!==null && e>s){
      const mins = Math.max(0, e-s-totalBrk);
      totalWeekMins += mins;
      workDays++;
      const h = mins/60;
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
    const chk = document.getElementById(`ct-sch-chk-${key}`);
    const active = chk && chk.checked;
    const slots = active ? _getBrkSlots(key) : [];
    // 호환성: brk_start/brk_end는 첫 번째 슬롯으로
    return {
      day:   key,
      label: DAYS_KR[i],
      active,
      start:     active ? (document.getElementById(`ct-sch-start-${key}`)||{}).value||'' : '',
      end:       active ? (document.getElementById(`ct-sch-end-${key}`)||{}).value||''   : '',
      brk_start: slots[0]?.s || '',
      brk_end:   slots[0]?.e || '',
      breaks:    slots,  // 복수 휴게 슬롯 배열
      note:      active ? (document.getElementById(`ct-sch-note-${key}`)||{}).value||'' : '',
    };
  });
}

// JSON → 스케줄 UI 복원
function setScheduleFromJSON(schedule){
  if(!schedule || !Array.isArray(schedule)) return;
  schedule.forEach(row=>{
    const key = row.day;
    const chkEl = document.getElementById(`ct-sch-chk-${key}`);
    if(!chkEl) return;
    chkEl.checked = !!row.active;
    // 출근·퇴근·비고 disabled 동기화
    ['start','end','note'].forEach(f=>{
      const el = document.getElementById(`ct-sch-${f}-${key}`);
      if(el) el.disabled = !row.active;
    });
    if(row.active){
      const sEl = document.getElementById(`ct-sch-start-${key}`); if(sEl) sEl.value = row.start||'09:00';
      const eEl = document.getElementById(`ct-sch-end-${key}`);   if(eEl) eEl.value = row.end||'18:00';
      const nEl = document.getElementById(`ct-sch-note-${key}`);  if(nEl) nEl.value = row.note||'';
      // breaks 배열 우선, 없으면 레거시 brk_start/brk_end 폴백
      const breaks = Array.isArray(row.breaks) && row.breaks.length
        ? row.breaks
        : (row.brk_start||row.brk_end ? [{s:row.brk_start||'',e:row.brk_end||''}] : []);
      _setBrkSlots(key, breaks, true);
    } else {
      _setBrkSlots(key, [{s:'',e:''}], false);
    }
  });
  calcWorkHours();
}

// 레거시 단일 시간 → 요일별 스케줄 변환 (구버전 계약 데이터 호환)
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
    const chkEl = document.getElementById(`ct-sch-chk-${key}`);
    if(chkEl) chkEl.checked = active;
    ['start','end','note'].forEach(f=>{
      const el = document.getElementById(`ct-sch-${f}-${key}`);
      if(el) el.disabled = !active;
    });
    if(active){
      const sEl = document.getElementById(`ct-sch-start-${key}`); if(sEl) sEl.value = start;
      const eEl = document.getElementById(`ct-sch-end-${key}`);   if(eEl) eEl.value = end;
      const breaks = brkMins > 0 ? [{s: toTime(brkStart), e: toTime(brkEnd)}] : [];
      _setBrkSlots(key, breaks, true);
    } else {
      _setBrkSlots(key, [{s:'',e:''}], false);
    }
  });
  calcWorkHours();
}

// initBreakSelects → initScheduleTable로 대체 (하위 호환 stub)
function initBreakSelects(){ initScheduleTable(); }
function getBreakMins(hId,mId){ return 0; }
function setBreakMins(hId,mId,totalMins){}
function toggleCtEndDate(preserveValue=false){
  const type = document.getElementById('ct-type').value;
  const endInput = document.getElementById('ct-end');
  const endRow   = document.getElementById('ct-row-end');
  const endReqSpan = document.getElementById('ct-end-required');
  // 계약직·계약직 수습·일용직만 계약 종료일 표시 (정규직·정규직 수습은 무기한 계약이므로 숨김)
  const isFixed    = type === '계약직' || type === '일용직' || type === '계약직 수습';
  const isRegular  = type === '정규직' || type === '정규직 수습';
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
  car: true, meal: true,
  research: false, communication: false, fitness: false,
  self_dev: false, book: false, overseas: false,
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
const _CT_OPT_ROWS = [
  { key:'regular_bonus', rowId:'ct-row-regular-bonus' }, // 정기 상여금: 통상임금 포함 고정
  { key:'childcare',     rowId:'ct-row-childcare'     }, // 출산·보육수당: 부양가족 수 + 금액 계약서에서 확정
  { key:'site',          rowId:'ct-row-site'          },
  { key:'skill',         rowId:'ct-row-skill'         },
  { key:'license',       rowId:'ct-row-license'       },
  { key:'remote_area',   rowId:'ct-row-remote-area'   },
  { key:'research',      rowId:'ct-row-research'      },
  { key:'communication', rowId:'ct-row-communication' },
  { key:'fitness',       rowId:'ct-row-fitness'       },
  { key:'self_dev',      rowId:'ct-row-self-dev'      },
  { key:'book',          rowId:'ct-row-book'          },
  { key:'overseas',      rowId:'ct-row-overseas'      },
];
// clearValues=true: 숨기는 항목의 입력값도 0으로 초기화 (신규 모드 전용)
// clearValues=false: show/hide만 적용 (수정 모드 — 값은 loadCT에서 복원)
function applyCTAllowanceConfig(cfg, clearValues = false){
  _CT_OPT_ROWS.forEach(({ key, rowId }) => {
    const rowEl = document.getElementById(rowId);
    const visible = !!(cfg && cfg[key]);
    if(rowEl) rowEl.style.display = visible ? '' : 'none';
    if(!visible && clearValues){
      if(key === 'childcare'){
        setAmountVal('ct-childcare', 0);
        const depEl = document.getElementById('ct-childcare-dependents');
        if(depEl) depEl.value = 1;
      } else {
        const inputId = rowId.replace('ct-row-', 'ct-');
        setAmountVal(inputId, 0);
      }
    }
  });
  // ── _ctAllowCfgVisible 상태 갱신 ──
  // car/meal은 항상 활성, 옵셔널 수당은 allowance_config 기준
  _ctAllowCfgVisible.car  = true;
  _ctAllowCfgVisible.meal = true;
  ['research','communication','fitness','self_dev','book','overseas'].forEach(f => {
    _ctAllowCfgVisible[f] = !!(cfg && cfg[f]);
  });
  // pay_type 있는 수당 — car/meal 포함: allowance_config에서 pay_type 읽어 반영
  // ※ _ctAllowCfgVisible 갱신 후 setCTPayType 호출해야 DOM 제거 로직이 올바르게 동작
  const _PT_FIELDS = ['car','meal','research','communication','fitness','self_dev','book','overseas'];
  _PT_FIELDS.forEach(f => {
    const pt = (cfg && cfg[`${f}_pay_type`]) ? cfg[`${f}_pay_type`] : 'fixed';
    setCTPayType(f, pt);
  });
  // 출산·보육수당 pay_type 힌트 갱신 + 전역 상태 저장
  _ctChildcarePayType = (cfg && cfg.childcare) ? (cfg.childcare_pay_type || 'fixed') : 'fixed';
  if(cfg && cfg.childcare){
    const ccHint = document.getElementById('ct-childcare-type-hint');
    if(ccHint){
      const labels = { fixed: '통상임금 포함', daily: '통상임금 제외 (출근일수 비례)' };
      const colors = { fixed: '#9ca3af', daily: '#f59e0b' };
      ccHint.textContent = labels[_ctChildcarePayType] || '통상임금 포함';
      ccHint.style.color  = colors[_ctChildcarePayType]  || '#9ca3af';
    }
  }
  // ── custom_items 동적 행 생성 ──
  _applyCTCustomItems(cfg ? (cfg.custom_items || []) : [], clearValues);
}
// 현재 계약서 모달에서 출산·보육수당 pay_type 전역 상태 (applyCTAllowanceConfig 호출 시 갱신)
let _ctChildcarePayType = 'fixed';
function _getCTChildcarePayType(){ return _ctChildcarePayType; }

/* ── 계약서 모달: custom_items 동적 행 ── */
// custom 행들을 삽입할 앵커: ct-row-overseas 바로 뒤 (position 기준 삽입)
function _applyCTCustomItems(items, clearValues){
  // 기존 동적 custom 행 모두 제거
  document.querySelectorAll('.ct-custom-item-row').forEach(el => el.remove());
  if(!items || !items.length) return;

  // ct-row-overseas 다음에 삽입 (없으면 form 끝에)
  const anchor = document.getElementById('ct-row-overseas');
  items.forEach(item => {
    const key   = item.key   || '';
    const label = item.label || '';
    const pt    = item.pay_type || 'fixed';
    const rowId = `ct-row-${key}`;
    const inputId = `ct-${key}`;

    // 이미 있으면 스킵 (중복 방지)
    if(document.getElementById(rowId)) return;

    const row = document.createElement('div');
    row.className = 'form-group ct-custom-item-row';
    row.id = rowId;
    row.dataset.customKey = key;
    row.dataset.payType   = pt;
    row.innerHTML = `<label>${_ctEscHtml(label)}</label>`
      + `<div class="amount-wrap"><input type="text" inputmode="numeric" id="${inputId}" data-amount placeholder="0"`
      + ` oninput="onAmountInput(this,calcContractSalary)" /></div>`
      + `<div class="pi-pay-type-hint" id="ct-${key}-type-hint" style="color:${pt==='fixed'?'#9ca3af':'#f59e0b'};">`
      + `${pt==='fixed'?'통상임금 포함':'통상임금 제외'}</div>`;

    if(anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
    } else {
      // fallback: ct-row-childcare 앞 (처음 나오는 form-group 컨테이너)
      const fallback = document.getElementById('ct-row-childcare');
      if(fallback && fallback.parentNode) fallback.parentNode.appendChild(row);
    }

    if(clearValues) setAmountVal(inputId, 0);
  });
}

/** HTML 이스케이프 (계약서 레이블용) */
function _ctEscHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/** custom_allowances JSON → {key:amount} 객체로 파싱 */
function _parseCTCustomAllowances(contract){
  if(!contract) return {};
  try{ return typeof contract.custom_allowances === 'string'
    ? JSON.parse(contract.custom_allowances) : (contract.custom_allowances || {}); }
  catch(e){ return {}; }
}

/** 현재 계약서 모달에서 custom_allowances 객체 수집 */
function _collectCTCustomAllowances(){
  const result = {};
  document.querySelectorAll('.ct-custom-item-row').forEach(row => {
    const key     = row.dataset.customKey || '';
    const inputId = `ct-${key}`;
    if(key) result[key] = getAmountVal(inputId) || 0;
  });
  return result;
}

// 수정 모드 하위호환: allowance_config와 무관하게 DB에 저장된 값이 있는 항목 강제 노출
// ※ 단, 통상임금 불포함(daily/receipt) 수당은 근로계약 임금조건에 노출하지 않으므로
//    pay_type이 fixed인 항목만 force-show 대상으로 한정
function _forceShowNonZeroCTRows(c){
  const _fieldMap = {
    regular_bonus : 'regular_bonus',       // 계약서 DB 컬럼
    childcare     : 'childcare_allowance', // 출산·보육수당
    site          : 'site_allowance',
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
  // custom_allowances — 저장된 값이 있는 항목 행 강제 노출 (이미 _applyCTCustomItems로 행이 생성된 상태)
  const customAmounts = _parseCTCustomAllowances(c);
  Object.entries(customAmounts).forEach(([key, amt]) => {
    if(Number(amt) > 0){
      const rowEl = document.getElementById(`ct-row-${key}`);
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
  const cat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-edit-em-category')?.value || document.getElementById('ct-em-category').value)
    : document.getElementById('ct-em-category').value;
  const isDaily        = cat === '일용직';
  const isRegularGroup = cat === '정규직' || cat === '정규직 수습';
  const isFixedTerm    = cat === '계약직' || cat === '계약직 수습';

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
    // ── 일용직: 통상시급 직접 입력 — 기본급 역산 없음, 주/월 합계 표시만 ──
    document.getElementById('ct-weekly-hol-computed').textContent = '0원';
    document.getElementById('ct-monthly-computed').textContent    = '0원';
    _checkMinWageWarning();
    _checkRegisterBtnState();
    _checkAmendBtnState();
    return;
  }

  // ── 통상시급 직접 입력값 읽기 ──
  const hourlyWageInput = getAmountVal('ct-hourly-wage') || 0;

  // 주 소정근로시간 파악 (단시간 비례 계산용) — 역산 블록보다 먼저 선언
  const _hpd = parseFloat(document.getElementById('ct-hours')?.value) || 8;
  const _dpw = parseFloat(document.getElementById('ct-days')?.value)  || 5;
  const _monthlyStdH = _calcMonthlyStdHours(_hpd, _dpw); // 법령 기준 월 산정시간

  // ── 통상임금 포함 고정수당 합계 (std_allowances) ──
  // 통상시급 역산 공식: stdMonthly = hourlyWage × monthlyStdH
  //   stdMonthly = base × (1 + 1/dpw) + std_allowances
  //   → base = (stdMonthly - std_allowances) × dpw / (dpw + 1)
  // ── custom_items 합산 (통상임금 포함 여부는 행의 data-pay-type 참조) ──
  let customStdSum = 0, customAllSum = 0;
  document.querySelectorAll('.ct-custom-item-row').forEach(row => {
    const key = row.dataset.customKey || '';
    const pt  = row.dataset.payType   || 'fixed';
    const amt = getAmountVal(`ct-${key}`) || 0;
    customAllSum += amt;
    if(pt === 'fixed') customStdSum += amt;
  });

  const stdAllowances = position
    + (_isFixedAllow('car')           ? car         : 0)
    + remoteArea
    + (_isFixedAllow('meal')          ? meal        : 0)
    + site_ct + skill_ct + license_ct
    + (_isFixedAllow('research')      ? research    : 0)
    + (_isFixedAllow('communication') ? comm_ct     : 0)
    + (_isFixedAllow('fitness')       ? fitness_ct  : 0)
    + (_isFixedAllow('self_dev')      ? selfDev_ct  : 0)
    + (_isFixedAllow('book')          ? book_ct     : 0)
    + (_isFixedAllow('overseas')      ? overseas_ct : 0)
    + customStdSum;

  // ── 통상시급 입력값으로 기본급 역산 ──
  if(hourlyWageInput > 0 && _monthlyStdH > 0){
    const stdMonthlyFromHourly = hourlyWageInput * _monthlyStdH;
    const autoBase = Math.max(0, Math.round((stdMonthlyFromHourly - stdAllowances) * _dpw / (_dpw + 1)));
    setAmountVal('ct-base', autoBase);
  }

  // ── 월 약정임금 합산용 수당 (fixed 항목만) ──
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
    + regularBonus_ct
    + customAllSum;

  const base      = getAmountVal('ct-base');
  // 주휴수당 = 기본급 ÷ 주 소정근로일수 (단시간 비례 적용)
  const weeklyHol = Math.round(base / _dpw);
  document.getElementById('ct-weekly-hol-computed').textContent = won(weeklyHol);

  // 월 약정임금 표시
  const monthly = base + weeklyHol + allAllow;
  document.getElementById('ct-monthly-computed').textContent = won(monthly);

  syncProbation();
  _checkMinWageWarning();
  _checkRegisterBtnState();
  _checkAmendBtnState();
  // 시급 변경 시 이미 입력된 고정수당 시간이 있으면 금액 재계산
  _recalcAllFixedPays();
}

// ── 고정 연장/야간/휴일근로수당 단방향 자동계산 (시간→금액) ──
// 공식: 연장 = 통상시급 × h × 1.5 / 야간 = 통상시급 × h × 0.5 / 휴일 = 통상시급 × h × 1.5
function _getContractHourlyWage(){
  return getAmountVal('ct-hourly-wage')||0;
}
// 고정수당: 시간 입력 → 금액 자동산출 (단방향). 금액 필드는 readonly.
// 배율: 연장 ×1.5, 야간 ×0.5, 휴일 ×1.5
// 고정수당 금액 readonly 필드에 표시값 세팅
// getAmountVal()이 el.value에서 읽으므로 숫자만 남겨야 함 — '원' 접미사 없이 쉼표 포맷으로 저장
// placeholder로 단위 힌트 제공
function _setFixedPayDisplay(payId, amount){
  const el = document.getElementById(payId);
  if(!el) return;
  if(amount > 0){
    el.value = amount.toLocaleString('ko-KR');
    el.placeholder = '0';
  } else {
    el.value = '';
    el.placeholder = '0';
  }
}
function _calcFixedOtFromHours(){
  const hw = _getContractHourlyWage();
  const h  = parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0;
  _setFixedPayDisplay('ct-fixed-ot-pay', hw > 0 && h > 0 ? Math.round(hw * h * 1.5) : 0);
}
function _calcFixedNightFromHours(){
  const hw = _getContractHourlyWage();
  const h  = parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0;
  _setFixedPayDisplay('ct-fixed-night-pay', hw > 0 && h > 0 ? Math.round(hw * h * 0.5) : 0);
}
function _calcFixedHolFromHours(){
  const hw = _getContractHourlyWage();
  const h  = parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0;
  _setFixedPayDisplay('ct-fixed-hol-pay', hw > 0 && h > 0 ? Math.round(hw * h * 1.5) : 0);
}
// 시급이 변경될 때(기본급·근무일수 변경 시) 이미 입력된 시간이 있으면 금액 재계산
function _recalcAllFixedPays(){
  _calcFixedOtFromHours();
  _calcFixedNightFromHours();
  _calcFixedHolFromHours();
}

/** ── 근로계약 관리 알림 카드 렌더링 ── */
function _renderContAlertCards(){
  const wrap = document.getElementById('cont-alert-cards-wrap');
  if(!wrap || !currentContCompanyId) return;

  const today = new Date().toISOString().slice(0,10);

  // ── 전 고객사 기준 날인본/동의서 미등록 배너 (대시보드와 동일 UI) ──
  (function(){
    function _getEmpCo(c){
      const emp = allEmployees.find(e => e.id === c.employee_id);
      const co  = allCompanies.find(x => x.id === c.company_id);
      return {
        name  : emp ? emp.name : '(미지정)',
        phone : emp ? (emp.phone || '-') : '-',
        coName: co  ? (co.company_name || '-') : '-',
      };
    }

    // ① 날인본 미등록
    const signedMissing = allContracts.filter(c =>
      !c.is_draft && (c.status === '활성' || c.status === '계약예정' || c.status === '서류미비') && !c.signed_file_name
    );
    let signedEl = document.getElementById('_ca-signed-banner');
    if(!signedEl){
      signedEl = document.createElement('div');
      signedEl.id = '_ca-signed-banner';
      signedEl.style.marginBottom = '10px';
      wrap.prepend(signedEl);
    }
    if(!signedMissing.length){
      signedEl.style.display = 'none';
      signedEl.innerHTML = '';
    } else {
      const rows = signedMissing.map(c => {
        const {name, phone, coName} = _getEmpCo(c);
        const _rowClick = `openContractForUpload('${c.id}')`;
        return `<div class="signed-item-row" onclick="${_rowClick}" title="클릭하여 서류 업로드" style="cursor:pointer;">
          <div class="signed-item-icon"><i class="fas fa-file-contract"></i></div>
          <div class="signed-item-name">${name}</div>
          <div class="signed-item-meta">${coName}</div>
          <div class="signed-item-phone">${phone}</div>
        </div>`;
      }).join('');
      signedEl.style.display = '';
      signedEl.innerHTML = `
        <div class="dash-ac-card signed-alert-card">
          <div class="dash-ac-header" onclick="toggleDashAccordion('_ca-signed-body',this.querySelector('.dash-ac-toggle'))">
            <div class="dash-ac-left">
              <div>
                <div class="dash-ac-title signed-alert-title">
                  <span class="pulse-dot-indigo"></span>계약서 날인본 미등록
                </div>
                <div class="dash-ac-sub signed-alert-sub">근로계약서 날인본이 등록되지 않은 근로자가 있습니다.</div>
              </div>
            </div>
            <div class="dash-ac-badges"><span class="dash-ac-badge">${signedMissing.length}건</span></div>
            <div class="dash-ac-toggle"><i class="fas fa-chevron-down"></i></div>
          </div>
          <div id="_ca-signed-body" class="dash-ac-body" style="padding:0 20px;">
            <div style="padding:16px 0;">${rows}</div>
          </div>
        </div>`;
    }

    // ② 제3자 정보제공동의서 미등록
    const consentMissing = allContracts.filter(c =>
      !c.is_draft && (c.status === '활성' || c.status === '계약예정' || c.status === '서류미비') && !c.consent_file_name
    );
    let consentEl = document.getElementById('_ca-consent-banner');
    if(!consentEl){
      consentEl = document.createElement('div');
      consentEl.id = '_ca-consent-banner';
      consentEl.style.marginBottom = '10px';
      // signed 배너 바로 뒤에 삽입
      signedEl.after(consentEl);
    }
    if(!consentMissing.length){
      consentEl.style.display = 'none';
      consentEl.innerHTML = '';
    } else {
      const rows = consentMissing.map(c => {
        const {name, phone, coName} = _getEmpCo(c);
        const _rowClick = `openContractForUpload('${c.id}')`;
        return `<div class="consent-item-row" onclick="${_rowClick}" title="클릭하여 서류 업로드" style="cursor:pointer;">
          <div class="consent-item-icon"><i class="fas fa-file-signature"></i></div>
          <div class="consent-item-name">${name}</div>
          <div class="consent-item-meta">${coName}</div>
          <div class="consent-item-phone">${phone}</div>
        </div>`;
      }).join('');
      consentEl.style.display = '';
      consentEl.innerHTML = `
        <div class="dash-ac-card consent-alert-card">
          <div class="dash-ac-header" onclick="toggleDashAccordion('_ca-consent-body',this.querySelector('.dash-ac-toggle'))">
            <div class="dash-ac-left">
              <div>
                <div class="dash-ac-title consent-alert-title">
                  <span class="pulse-dot-red"></span>제3자 정보제공동의서 미등록
                </div>
                <div class="dash-ac-sub consent-alert-sub">정보제공동의서가 등록되지 않은 근로자가 있습니다.</div>
              </div>
            </div>
            <div class="dash-ac-badges"><span class="dash-ac-badge">${consentMissing.length}건</span></div>
            <div class="dash-ac-toggle"><i class="fas fa-chevron-down"></i></div>
          </div>
          <div id="_ca-consent-body" class="dash-ac-body" style="padding:0 20px;">
            <div style="padding:16px 0;">${rows}</div>
          </div>
        </div>`;
    }
  })();

  // 현재 고객사 계약 전체 분류
  const companyContracts = allContracts.filter(c => c.company_id === currentContCompanyId);

  const ALERT_LABELS = ['임시저장','갱신예정','계약예정','해지예정'];
  const groups = {};
  ALERT_LABELS.forEach(l => groups[l] = []);

  companyContracts.forEach(c => {
    const {label} = calcContractStatusDisplay(c, today);
    if(groups[label] !== undefined) groups[label].push(c);
  });

  // 카드 정의
  const CARD_CONFIG = [
    {
      key: '임시저장', cls: 'cont-alert-draft',
      icon: 'fas fa-pen-square', iconColor: '#d97706',
      title: '임시저장 중인 계약서',
      desc: '작성이 완료되지 않은 계약서입니다. 계속 작성하거나 삭제하세요.',
      cols: ['직원명','고용형태','작성일시','관리'],
      row: (c) => {
        const emp = allEmployees.find(e=>e.id===c.employee_id);
        const empCat = emp?.employment_category || c.contract_type || '-';
        const catBadge = ({'정규직':'badge-blue','정규직 수습':'badge-cyan','계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'}[empCat]||'badge-gray');
        const createdAt = c.created_at ? new Date(c.created_at).toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-';
        return `<td style="font-weight:700;color:#1f2937;">${getEmpName(c.employee_id)}</td>
          <td><span class="badge ${catBadge}" style="font-size:11px;">${empCat}</span></td>
          <td style="font-size:12px;color:#6b7280;">${createdAt}</td>
          <td style="white-space:nowrap;">
            <button onclick="viewContract('${c.id}')" class="btn btn-sm" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="fas fa-edit"></i> 계속 작성</button>
          </td>`;
      }
    },
    {
      key: '갱신예정', cls: 'cont-alert-renew',
      icon: 'fas fa-sync-alt', iconColor: '#b45309',
      title: '갱신 예정 계약',
      desc: '계약 시작일이 아직 도래하지 않은 갱신 계약입니다.',
      cols: ['직원명','고용형태','계약 시작일','D-day','관리'],
      row: (c) => {
        const emp = allEmployees.find(e=>e.id===c.employee_id);
        const empCat = emp?.employment_category || c.contract_type || '-';
        const catBadge = ({'정규직':'badge-blue','정규직 수습':'badge-cyan','계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'}[empCat]||'badge-gray');
        const diff = c.contract_start ? Math.ceil((new Date(c.contract_start)-new Date(today))/(1000*60*60*24)) : null;
        const dday = diff !== null ? (diff>0?`D-${diff}`:diff===0?'D-day':`D+${Math.abs(diff)}`) : '-';
        const ddayColor = diff !== null && diff <= 7 ? '#dc2626' : '#b45309';
        return `<td style="font-weight:700;color:#1f2937;">${getEmpName(c.employee_id)}</td>
          <td><span class="badge ${catBadge}" style="font-size:11px;">${empCat}</span></td>
          <td style="font-size:12px;color:#6b7280;">${c.contract_start||'-'}</td>
          <td><span style="font-weight:700;color:${ddayColor};font-size:12.5px;">${dday}</span></td>
          <td style="white-space:nowrap;">
            <button onclick="viewContract('${c.id}')" class="btn btn-sm" style="background:#fefce8;color:#713f12;border:1px solid #fde047;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="fas fa-search"></i> 조회</button>
          </td>`;
      }
    },
    {
      key: '계약예정', cls: 'cont-alert-pending',
      icon: 'fas fa-calendar-alt', iconColor: '#4338ca',
      title: '계약 예정',
      desc: '시작일이 미도래한 신규 계약입니다.',
      cols: ['직원명','고용형태','계약 시작일','D-day','관리'],
      row: (c) => {
        const emp = allEmployees.find(e=>e.id===c.employee_id);
        // 계약예정: c.contract_type 우선 참조 (수습→정규 전환 계약은 c.contract_type이 실제 계약 유형)
        // 수습 카테고리가 오면 수습 제거 후 정규화 (예: '계약직 수습' → '계약직')
        const _rawCat = c.contract_type || emp?.employment_category || '-';
        const empCat = _rawCat === '정규직 수습' ? '정규직' : _rawCat === '계약직 수습' ? '계약직' : _rawCat;
        const catBadge = ({'정규직':'badge-blue','정규직 수습':'badge-cyan','계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'}[empCat]||'badge-gray');
        const diff = c.contract_start ? Math.ceil((new Date(c.contract_start)-new Date(today))/(1000*60*60*24)) : null;
        const dday = diff !== null ? (diff>0?`D-${diff}`:diff===0?'D-day':`D+${Math.abs(diff)}`) : '-';
        const ddayColor = diff !== null && diff <= 7 ? '#dc2626' : '#4338ca';
        return `<td style="font-weight:700;color:#1f2937;">${getEmpName(c.employee_id)}</td>
          <td><span class="badge ${catBadge}" style="font-size:11px;">${empCat}</span></td>
          <td style="font-size:12px;color:#6b7280;">${c.contract_start||'-'}</td>
          <td><span style="font-weight:700;color:${ddayColor};font-size:12.5px;">${dday}</span></td>
          <td style="white-space:nowrap;">
            <button onclick="viewContract('${c.id}')" class="btn btn-sm" style="background:#eef2ff;color:#3730a3;border:1px solid #a5b4fc;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="fas fa-search"></i> 조회</button>
          </td>`;
      }
    },
    {
      key: '해지예정', cls: 'cont-alert-preterminate',
      icon: 'fas fa-user-clock', iconColor: '#be123c',
      title: '해지 예정 (퇴사예정)',
      desc: '퇴사예정일이 설정된 계약입니다. 해지 처리를 준비하세요.',
      cols: ['직원명','고용형태','퇴사 예정일','D-day','관리'],
      row: (c) => {
        const emp = allEmployees.find(e=>e.id===c.employee_id);
        const empCat = emp?.employment_category || c.contract_type || '-';
        const catBadge = ({'정규직':'badge-blue','정규직 수습':'badge-cyan','계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'}[empCat]||'badge-gray');
        const termDate = c.terminate_date || '';
        const diff = termDate ? Math.ceil((new Date(termDate)-new Date(today))/(1000*60*60*24)) : null;
        const dday = diff !== null ? (diff>0?`D-${diff}`:diff===0?'D-day':`D+${Math.abs(diff)}`) : '-';
        const ddayColor = diff !== null && diff <= 14 ? '#dc2626' : '#be123c';
        return `<td style="font-weight:700;color:#1f2937;">${getEmpName(c.employee_id)}</td>
          <td><span class="badge ${catBadge}" style="font-size:11px;">${empCat}</span></td>
          <td style="font-size:12px;color:#9f1239;font-weight:600;">${termDate||'-'}</td>
          <td><span style="font-weight:700;color:${ddayColor};font-size:12.5px;">${dday}</span></td>
          <td style="white-space:nowrap;">
            <button onclick="viewContract('${c.id}')" class="btn btn-sm" style="background:#fff1f2;color:#9f1239;border:1px solid #fda4af;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="fas fa-search"></i> 조회</button>
          </td>`;
      }
    },
  ];

  // 열려있던 카드 상태 기억 (기존 cont-alert-card 한정)
  const prevOpen = {};
  wrap.querySelectorAll('.cont-alert-card').forEach(el => {
    prevOpen[el.dataset.alertKey] = el.querySelector('.cont-alert-card-body')?.style.display !== 'none';
  });

  // 기존 cont-alert-card 만 제거 (배너 div는 유지)
  wrap.querySelectorAll('.cont-alert-card').forEach(el => el.remove());

  CARD_CONFIG.forEach(cfg => {
    const list = groups[cfg.key];
    if(!list.length) return; // 해당 상태 없으면 카드 자체 숨김

    const isOpen = prevOpen[cfg.key] !== false; // 기본 열림
    const div = document.createElement('div');
    div.className = `cont-alert-card ${cfg.cls}`;
    div.dataset.alertKey = cfg.key;
    div.style.marginBottom = '10px';
    div.innerHTML = `
      <div class="cont-alert-card-head" onclick="_toggleContAlertCard(this)">
        <div class="cont-alert-card-title">
          <i class="${cfg.icon}" style="color:${cfg.iconColor};font-size:15px;"></i>
          ${cfg.title}
          <span class="cont-alert-card-count">${list.length}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:11.5px;font-weight:500;opacity:.7;">${cfg.desc}</span>
          <i class="fas fa-chevron-down cont-alert-card-chevron${isOpen?' open':''}"></i>
        </div>
      </div>
      <div class="cont-alert-card-body" style="display:${isOpen?'':'none'};">
        <div style="overflow-x:auto;">
          <table class="cont-alert-table">
            <thead><tr>${cfg.cols.map(col=>`<th>${col}</th>`).join('')}</tr></thead>
            <tbody>
              ${list.map(c=>`<tr>${cfg.row(c)}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    wrap.append(div);
  });
}

function _toggleContAlertCard(headEl){
  const body = headEl.closest('.cont-alert-card').querySelector('.cont-alert-card-body');
  const chevron = headEl.querySelector('.cont-alert-card-chevron');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : '';
  chevron.classList.toggle('open', !isOpen);
}

function renderContracts(){
  // 고객사 선택 여부와 무관하게 상단 배너 항상 갱신
  _renderContractsBanners();

  // 고객사 미선택 시 목록 숨김
  if(!currentContCompanyId){
    document.getElementById('cont-list-section').style.display='none';
    return;
  }
  document.getElementById('cont-list-section').style.display='block';

  // ── 알림 카드 렌더링 ──
  _renderContAlertCards();

  const q=(document.getElementById('cont-search')?.value||'').toLowerCase();
  const filterEmpCat=(document.getElementById('cont-filter-empcat')?.value||'');
  const filterStatus=(document.getElementById('cont-filter-status')?.value||'');
  const today=new Date().toISOString().slice(0,10);

  // 알림 카드에서 관리되는 상태는 메인 테이블 기본 제외 (서류미비는 유효 계약이므로 메인 테이블에 포함)
  const ALERT_ONLY_LABELS = new Set(['임시저장','갱신예정','계약예정','해지예정']);

  let f=allContracts.filter(c=>{
    if(c.company_id!==currentContCompanyId) return false;
    // 직원명 검색
    if(q&&!getEmpName(c.employee_id).toLowerCase().includes(q)) return false;
    // 고용형태 필터
    if(filterEmpCat){
      const emp=allEmployees.find(e=>e.id===c.employee_id);
      if((emp?.employment_category||'')!==filterEmpCat) return false;
    }
    // 계약상태 필터
    const {label}=calcContractStatusDisplay(c,today);
    if(filterStatus){
      // '계약유효' 필터: 서류미비(=유효하지만 서류 미첨부)도 함께 포함
      if(filterStatus==='계약유효'){
        if(label!=='계약유효' && label!=='서류미비') return false;
      } else {
        // 그 외 명시적 필터: 정확히 일치하는 상태만
        if(label!==filterStatus) return false;
      }
    } else {
      // 필터 없음(전체): 알림 카드 전용 상태는 메인 테이블에서 제외
      if(ALERT_ONLY_LABELS.has(label)) return false;
    }
    return true;
  }).sort((a,b)=>getEmpName(a.employee_id).localeCompare(getEmpName(b.employee_id),'ko'));
  const paged=f.slice((pages.cont-1)*ITEMS,pages.cont*ITEMS);
  const tb=document.getElementById('cont-tbody');
  if(!f.length){tb.innerHTML='<tr><td colspan="10" class="empty-state">계약서가 없습니다</td></tr>';document.getElementById('cont-pagination').innerHTML='';return;}
  tb.innerHTML=paged.map(c=>{
    // ── 표시 상태 스마트 계산 ──
    const {badge:stBadge, label:stName} = calcContractStatusDisplay(c, today);
    const emp=allEmployees.find(e=>e.id===c.employee_id);
    const empCat=emp?.employment_category||'-';
    const catBadge=({'정규직':'badge-blue','정규직 수습':'badge-cyan','계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'}[empCat]||'badge-gray');
    const isResigned = emp?.status==='퇴직' && emp?.resign_date;
    const isTerminatedRegular = (c.status === '해지') && c.termination_date;
    const periodTxt = (empCat==='정규직'||empCat==='정규직 수습')
      ? (isTerminatedRegular
          ? `${c.contract_start||'-'} ~ ${c.termination_date} (해지)`
          : isResigned
            ? `${c.contract_start||'-'} ~ ${emp.resign_date}`
            : `${c.contract_start||'-'} ~ 현재`)
      : `${c.contract_start||'-'} ~ ${c.contract_end||'미정'}`;
    const isContDaily = empCat === '일용직';
    const baseSalaryDisplay = isContDaily
      ? `<span style="font-size:11px;color:#9ca3af;">일급여</span> ${won(c.daily_wage||c.base_salary)}`
      : won(c.base_salary);
    return `<tr>
      <td style="font-weight:600">${getEmpName(c.employee_id)}</td>
      <td><span class="badge ${catBadge}">${empCat}</span></td>
      <td style="font-size:11.5px">${periodTxt}</td>
      <td class="amount">${won(c.hourly_wage)}/h</td>
      <td class="amount-blue">${isContDaily ? '<span style="color:#9ca3af;font-size:11px;">-</span>' : won(c.annual_salary)}</td>
      <td class="amount">${baseSalaryDisplay}</td>
      <td style="color:#f59e0b;font-weight:600">${isContDaily ? '<span style="color:#9ca3af;font-size:11px;">-</span>' : won(c.weekly_holiday_pay)}</td>
      <td class="amount-green">${isContDaily ? '<span style="color:#9ca3af;font-size:11px;">-</span>' : won(c.monthly_salary_agreed)}</td>
      <td>${stName==='서류미비'
        ? `<span class="badge badge-green" style="margin-right:3px;">계약유효</span><span class="badge badge-orange">서류미비</span>`
        : `<span class="badge ${stBadge}">${stName}</span>`
      }</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-size:11.5px;font-weight:600;gap:4px;display:inline-flex;align-items:center;" onclick="viewContract('${c.id}')"><i class="fas fa-search"></i> 조회</button>
        ${stName==='서류미비'
          ? `<button class="btn btn-sm" style="background:#d97706;color:#fff;border:1px solid #d97706;font-size:11.5px;font-weight:600;gap:4px;display:inline-flex;align-items:center;margin-left:4px;" onclick="openContractForUpload('${c.id}')"><i class="fas fa-upload"></i> 서류 업로드</button>`
          : c.is_draft
            ? `<button class="btn btn-sm" disabled title="임시저장 상태에서는 출력할 수 없습니다" style="background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;font-size:11.5px;font-weight:600;gap:4px;display:inline-flex;align-items:center;margin-left:4px;cursor:not-allowed;"><i class="fas fa-file-contract"></i> 계약서</button>`
            : `<button class="btn btn-sm" style="background:#0f172a;color:#fff;border:1px solid #0f172a;font-size:11.5px;font-weight:600;gap:4px;display:inline-flex;align-items:center;margin-left:4px;" onclick="openContractPrintModal('${c.id}')"><i class="fas fa-file-contract"></i> 계약서</button>`
        }
      </td>
    </tr>`;
  }).join('');
  renderPagination('cont-pagination',f.length,pages.cont,'setContPage');
}
function setContPage(p){pages.cont=p;renderContracts()}
function openContractModal(id=null, preCompanyId=null){
  editId.contract=id;
  _recontractEmpId = null; // 재계약 플래그 초기화
  if(!id) _currentDraftId = null; // 신규 작성 시 임시저장 ID 초기화
  // 임시저장 안내 텍스트 초기화
  const _draftInfoEl = document.getElementById('ct-draft-saved-info');
  if(_draftInfoEl){ _draftInfoEl.style.display='none'; _draftInfoEl.textContent=''; }
  const isNew = !id;
  document.getElementById('ct-title').textContent = isNew ? '근로계약서 추가' : '계약서 수정';
  // 단계 표시바: 작성/수정 모드에서만 표시
  const _stepBar = document.getElementById('ct-step-bar');
  if(_stepBar){ _stepBar.style.display = ''; setContractStep(1); }
  // 편집/추가 모드: 조회 액션 바 숨김, 편집 footer 표시, 일괄설정 바 표시
  document.getElementById('ct-footer-edit').style.display = '';
  document.getElementById('ct-action-bar-top').style.display = 'none';
  document.getElementById('ct-action-bar-bottom').style.display = 'none';
  const _bulkBar = document.getElementById('ct-bulk-bar-wrap');
  if(_bulkBar) _bulkBar.style.display = '';
  document.getElementById('ct-terminate-panel').style.display = 'none';
  document.getElementById('ct-renew-panel').style.display = 'none';
  const _amendPanelInit = document.getElementById('ct-amend-panel');
  if(_amendPanelInit) _amendPanelInit.style.display = 'none';
  // amend 모드 플래그 초기화
  window._isAmendMode = false;
  // 통합 상태 배너 초기화
  _resetStatusBanner();
  // readonly 클래스 제거
  const modalEl = document.querySelector('#contract-modal .modal');
  modalEl.classList.remove('ct-readonly');
  modalEl.querySelectorAll('input,select,textarea').forEach(el=>{ el.disabled = false; });
  // 지급유형 버튼 + 휴게시간 추가 버튼 재활성화 (신규/수정 모드)
  modalEl.querySelectorAll('.modal-body .pi-pay-type-btn').forEach(btn=>{
    btn.disabled = false; btn.style.cursor = ''; btn.style.pointerEvents = '';
  });
  modalEl.querySelectorAll('.modal-body .btn-brk-add').forEach(btn=>{
    btn.disabled = false; btn.style.cursor = ''; btn.style.pointerEvents = '';
  });
  ['ct-start','ct-end','ct-annual-sal','ct-base','ct-note','ct-pay-period'].forEach(i=>document.getElementById(i).value='');
  const _ppHint = document.getElementById('ct-pay-period-hint'); if(_ppHint) _ppHint.textContent='';
  document.getElementById('ct-annual').value=15;
  // 요일별 스케줄 테이블 초기화 (기본값: 월~금 09:00~18:00, 휴게 1h)
  initScheduleTable();
  document.getElementById('ct-annual-sal').value='';
  setAmountVal('ct-position',0);
  setAmountVal('ct-car',0); setAmountVal('ct-remote-area',0);
  setAmountVal('ct-meal',200000); setAmountVal('ct-research',0);
  setAmountVal('ct-site',0); setAmountVal('ct-skill',0); setAmountVal('ct-license',0);
  setAmountVal('ct-communication',0); setAmountVal('ct-fitness',0);
  setAmountVal('ct-self-dev',0); setAmountVal('ct-book',0); setAmountVal('ct-overseas',0);
  setAmountVal('ct-regular-bonus',0);
  setAmountVal('ct-childcare',0);
  { const _ccDepRst = document.getElementById('ct-childcare-dependents'); if(_ccDepRst) _ccDepRst.value=1; }
  // custom 행 제거 (신규 모드 리셋 시)
  document.querySelectorAll('.ct-custom-item-row').forEach(el => el.remove());
  // 고정 연장/야간/휴일근로수당 초기화 (시간·금액 모두 클리어)
  { const _foh=document.getElementById('ct-fixed-ot-hours');    if(_foh) _foh.value=''; }
  { const _fnh=document.getElementById('ct-fixed-night-hours'); if(_fnh) _fnh.value=''; }
  { const _fhh=document.getElementById('ct-fixed-hol-hours');   if(_fhh) _fhh.value=''; }
  _setFixedPayDisplay('ct-fixed-ot-pay',    0);
  _setFixedPayDisplay('ct-fixed-night-pay', 0);
  _setFixedPayDisplay('ct-fixed-hol-pay',   0);
  _resetCTPayTypes();
  document.getElementById('ct-type').value='정규직';
  document.getElementById('ct-status').value='활성';toggleCtEndDate();
  document.getElementById('ct-monthly-computed').textContent='0원';document.getElementById('ct-weekly-hol-computed').textContent='0원';setAmountVal('ct-hourly-wage',0);

  // 신규 직원 섹션 초기화
  ['ct-em-empno','ct-em-name','ct-em-id','ct-em-dept','ct-em-position','ct-em-job','ct-em-hire','ct-em-expire','ct-em-phone','ct-em-email','ct-em-address'].forEach(i=>document.getElementById(i).value='');
  const _emDepEl=document.getElementById('ct-em-dependents'); if(_emDepEl) _emDepEl.value=1;
  document.getElementById('ct-em-gender').value='남';
  document.getElementById('ct-em-category').value='';toggleEmExpire();toggleAnnualSal();toggleProbation();
  // 수정 직원 섹션 초기화
  ['ct-edit-em-empno','ct-edit-em-job','ct-edit-em-dept','ct-edit-em-position','ct-edit-em-hire','ct-edit-em-expire','ct-edit-em-id','ct-edit-em-phone','ct-edit-em-email','ct-edit-em-address','ct-edit-em-bank','ct-edit-em-account'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
  const editCatEl=document.getElementById('ct-edit-em-category');if(editCatEl)editCatEl.value='';
  const editGenderEl=document.getElementById('ct-edit-em-gender');if(editGenderEl)editGenderEl.value='남';
  const editDepEl=document.getElementById('ct-edit-em-dependents');if(editDepEl)editDepEl.value=1;
  document.getElementById('ct-probation-months').value='3';
  document.getElementById('ct-probation-pct').value='';
  document.getElementById('ct-probation-amt').value='';
  
  document.getElementById('ct-em-name-dup-alert').style.display='none';
  const _empnoAlertNew  = document.getElementById('ct-em-empno-alert');      if(_empnoAlertNew)  _empnoAlertNew.style.display='none';
  const _empnoAlertEdit = document.getElementById('ct-edit-em-empno-alert'); if(_empnoAlertEdit) _empnoAlertEdit.style.display='none';

  // 계약 시작일·종료일·고용형태·계약상태는 수정 모드 섹션 내부에 있으므로
  // ct-edit-emp-info 섹션의 show/hide로 자동 제어됨

  if(isNew){
    // 신규: 고객사 프리셋 지원, 신규 직원 입력 섹션 표시
    document.getElementById('ct-company').value = preCompanyId || '';
    // 신규 모드: 프리셋 고객사의 allowance_config 적용 (값 초기화 포함)
    { const _newCo = preCompanyId ? (allCompanies||[]).find(x=>x.id===preCompanyId) : null;
      applyCTAllowanceConfig(_newCo?.allowance_config ?? null, true); }
    document.getElementById('ct-new-emp-section').style.display = 'block';
    document.getElementById('ct-edit-emp-info').style.display = 'none';
    document.getElementById('ct-title').textContent = '근로계약서 추가';
  } else {
    // 수정: 기존 직원 정보 표시, 신규 입력 섹션 숨김
    document.getElementById('ct-new-emp-section').style.display = 'none';
    document.getElementById('ct-edit-emp-info').style.display = 'block';
    const c=allContracts.find(x=>x.id===id);
    if(c){
      // 계약예정 여부 — 이하 여러 곳에서 공통 사용
      const _isPendingCt = (c.status === '계약예정');
      // 직원 정보 표시·편집 필드 채우기
      const emp = allEmployees.find(e=>e.id===c.employee_id);
      document.getElementById('ct-edit-emp-name').value = emp ? emp.name : '';
      if(emp){
        document.getElementById('ct-edit-em-gender').value    = emp.gender || '남';
        // 계약예정 상태이면 수습 카테고리 정규화 (예: '계약직 수습' → '계약직')
        const _empCatDisplay = emp.employment_category || '-';
        const _isPendingDisplay = _isPendingCt;
        document.getElementById('ct-edit-em-category').value = _isPendingDisplay
          ? (_empCatDisplay === '정규직 수습' ? '정규직' : _empCatDisplay === '계약직 수습' ? '계약직' : _empCatDisplay)
          : _empCatDisplay;
        document.getElementById('ct-edit-em-job').value       = emp.job_description || '';
        document.getElementById('ct-edit-em-dept').value      = emp.department || '';
        document.getElementById('ct-edit-em-position').value  = emp.position || '';
        // 입사일: 동일 직원의 가장 앞선 계약 시작일을 상속 (emp.hire_date 폴백)
        const _earliestStart = getEarliestContractStart(emp.id);
        document.getElementById('ct-edit-em-hire').value = _earliestStart || emp.hire_date || '';
        document.getElementById('ct-edit-em-expire').value    = emp.expire_date || emp.resign_date || '';
        document.getElementById('ct-edit-em-id').value        = emp.id_number || '';
        const _editDepEl2=document.getElementById('ct-edit-em-dependents'); if(_editDepEl2) _editDepEl2.value= (emp.dependents ?? 0) < 1 ? 1 : emp.dependents;
        document.getElementById('ct-edit-em-phone').value     = emp.phone || '';
        document.getElementById('ct-edit-em-email').value     = emp.email || '';
        document.getElementById('ct-edit-em-address').value   = emp.address || '';
        document.getElementById('ct-edit-em-bank').value      = emp.bank_name || '';
        document.getElementById('ct-edit-em-account').value   = emp.bank_account || '';
        const _empnoEl = document.getElementById('ct-edit-em-empno'); if(_empnoEl) _empnoEl.value = emp.employee_number || '';
      }
      document.getElementById('ct-company').value=c.company_id||'';
      // 수정 모드: 고객사 allowance_config 기반 옵셔널 수당 show/hide
      { const _editCo = (allCompanies||[]).find(x=>x.id===(c.company_id||''));
        applyCTAllowanceConfig(_editCo?.allowance_config ?? null); }
      document.getElementById('ct-start').value=c.contract_start||'';
      // 고용형태: c.contract_type 우선 참조 (채용확정 생성 계약예정은 c.contract_type이 실제 유형)
      // 계약예정 상태인 경우 수습 카테고리 정규화 (예: '계약직 수습' → '계약직')
      const _ctValRaw = c.contract_type || (emp ? emp.employment_category : '') || '정규직';
      const ctVal = _isPendingCt
        ? (_ctValRaw === '정규직 수습' ? '정규직' : _ctValRaw === '계약직 수습' ? '계약직' : _ctValRaw)
        : _ctValRaw;
      document.getElementById('ct-type').value=ctVal; toggleCtEndDate(true);
      // 정규직 해지 계약: ct-end에 termination_date를 채움, 아니면 contract_end
      const _isRegularEdit = (ctVal==='정규직'||ctVal==='정규직 수습');
      const _isTerminatedEdit = c.status === '해지';
      document.getElementById('ct-end').value = (_isRegularEdit && _isTerminatedEdit && c.termination_date)
        ? c.termination_date
        : (c.contract_end||'');
      document.getElementById('ct-status').value=c.status||'활성';
      // 계약직/일용직: 입사일·퇴사예정일 행 숨김 (계약 시작일·종료일과 동일하므로 중복)
      // 정규직/정규직 수습: 무기한 계약이므로 퇴사예정일 행 숨김
      const isFixedType  = (ctVal==='계약직'||ctVal==='계약직 수습'||ctVal==='일용직');
      const isRegularType= (ctVal==='정규직'||ctVal==='정규직 수습');
      const hireRowEl   = document.getElementById('ct-edit-row-hire');
      const expireRowEl = document.getElementById('ct-edit-row-expire');
      const endRowEl    = document.getElementById('ct-row-end');
      // 입사일은 고용형태 무관하게 항상 표시
      if(hireRowEl)   hireRowEl.style.display   = '';
      // 정규직이면 퇴사예정일 숨김, 계약직이면 입사일과 함께 숨김 (종료일과 동일)
      if(expireRowEl) expireRowEl.style.display  = (isFixedType || isRegularType) ? 'none' : '';
      // 정규직 해지 계약: 계약해지일 행으로 표시, 일반 정규직: 종료일 행 숨김
      if(endRowEl){
        const _ctStartRow = document.getElementById('ct-start')?.closest('.form-group');
        if(isRegularType && _isTerminatedEdit && c.termination_date){
          endRowEl.style.display = '';
          // 계약 시작일 행에 설명 span이 있어 높이 차이 발생 → 양 쪽 모두 상단 정렬
          endRowEl.style.alignSelf = 'start';
          if(_ctStartRow) _ctStartRow.style.alignSelf = 'start';
          const _endLbl = endRowEl.querySelector('label');
          if(_endLbl) _endLbl.childNodes[0].textContent = '계약해지일 ';
        } else {
          endRowEl.style.display = isRegularType ? 'none' : '';
          endRowEl.style.alignSelf = '';
          if(_ctStartRow) _ctStartRow.style.alignSelf = '';
          // 레이블 원상복구 (수정 모드에서 기본값 유지)
          const _endLbl = endRowEl.querySelector('label');
          if(_endLbl) _endLbl.childNodes[0].textContent = '계약 종료일 ';
        }
      }
      // 계약유형에 따라 연봉 행 표시 제어
      // ctVal = emp.employment_category || c.contract_type (위 5920줄에서 이미 결정된 값)
      const isRegEdit  = ctVal==='정규직' || ctVal==='정규직 수습';
      const isProbEdit = ctVal==='정규직 수습' || ctVal==='계약직 수습';
      const isDailyEdit= ctVal==='일용직';
      const rowM=document.getElementById('ct-row-monthly');
      if(rowM) rowM.style.display=isRegEdit?'':'none';
      // 연봉 섹션 (연봉 필드 포함)
      ['ct-row-salary-period','ct-row-annual-sal'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.style.display=isRegEdit?'':'none';
      });
      // 일용직 조건부 필드
      const rowDaysE = document.getElementById('ct-row-days');
      const rowAnnualE = document.getElementById('ct-row-annual');
      const rowBaseE = document.getElementById('ct-row-base');
      const rowWeeklyHolE = document.getElementById('ct-row-weekly-hol');
      const rowDailyWageE = document.getElementById('ct-row-daily-wage');
      if(rowDaysE) rowDaysE.style.display = isDailyEdit ? 'none' : '';
      if(rowAnnualE) rowAnnualE.style.display = isDailyEdit ? 'none' : '';
      if(rowBaseE) rowBaseE.style.display = isDailyEdit ? 'none' : '';
      if(rowWeeklyHolE) rowWeeklyHolE.style.display = isDailyEdit ? 'none' : '';
      if(rowDailyWageE) rowDailyWageE.style.display = isDailyEdit ? '' : 'none';
      // 수습 섹션 복원
      const probSec=document.getElementById('ct-probation-section');
      if(probSec) probSec.style.display=isProbEdit?'':'none';
      if(isProbEdit){
        document.getElementById('ct-probation-months').value=c.probation_months||'';  // 미입력 시 빈 값
        document.getElementById('ct-probation-pct').value=c.probation_pct||'';
        document.getElementById('ct-probation-amt').value=c.probation_amt||'';
        // 산정기준 라디오 복원
        const _basis = c.probation_basis || 'salary';
        const _rbEl = document.querySelector(`input[name="ct-probation-basis"][value="${_basis}"]`);
        if(_rbEl){ _rbEl.checked = true; }
        onProbationBasisChange();
      }
      // 연차일수: 저장된 값 복원 후 자동계산으로 힌트 표시 (입사일 복원 후 호출)
      document.getElementById('ct-annual').value=c.annual_leave_days||15;
      // 요일별 스케줄 복원: schedule_json 우선, 없으면 레거시 필드로 변환
      if(c.schedule_json){
        try{ setScheduleFromJSON(JSON.parse(c.schedule_json)); }
        catch(e){ setScheduleFromLegacy(c); }
      } else {
        setScheduleFromLegacy(c);
      }
      // ct-annual-sal: 정규직→연봉, 계약직→월약정급여, 일용직→0
      {
        const _isFixedEditLoad = ctVal==='계약직' || ctVal==='계약직 수습';
        if(isDailyEdit){
          setAmountVal('ct-annual-sal', 0);
        } else if(_isFixedEditLoad){
          setAmountVal('ct-annual-sal', c.monthly_salary_agreed||0);
        } else {
          setAmountVal('ct-annual-sal', c.annual_salary||0);
        }
      }

      if(isDailyEdit){
        setAmountVal('ct-daily-wage', c.daily_wage||c.base_salary||0);
        setAmountVal('ct-base', 0);
      } else {
        setAmountVal('ct-base', c.base_salary);
        const dwEl = document.getElementById('ct-daily-wage'); if(dwEl) dwEl.value='';
      }
      setAmountVal('ct-position',    c.position_allowance||0);
      // 차량지원비 = 구 교통비 + 구 자가운전보조금 합산 (레거시 데이터 하위호환)
      setAmountVal('ct-car', (parseFloat(c.transportation_allowance||c.car_maintenance||0)) + (parseFloat(c.self_driving_allowance||0)));
      setCTPayType('car', c.transportation_pay_type||c.self_driving_pay_type||'fixed');
      setAmountVal('ct-remote-area', c.remote_area_allowance||0);
      // remote-area는 통상임금 항상 포함 — pay_type 세팅 불필요
      setAmountVal('ct-meal',        c.meal_allowance||200000);
      setCTPayType('meal',           c.meal_pay_type||'fixed');
      setAmountVal('ct-research',    c.research_allowance||0);
      setCTPayType('research',       c.research_pay_type||'fixed');
      setAmountVal('ct-site',        c.site_allowance||0);
      setAmountVal('ct-skill',       c.skill_allowance||0);
      setAmountVal('ct-license',     c.license_allowance||0);
      setAmountVal('ct-communication',c.communication_allowance||0);
      setCTPayType('communication',  c.communication_pay_type||'fixed');
      setAmountVal('ct-fitness',     c.fitness_allowance||0);
      setCTPayType('fitness',        c.fitness_pay_type||'fixed');
      setAmountVal('ct-self-dev',    c.self_dev_allowance||0);
      setCTPayType('self_dev',       c.self_dev_pay_type||'fixed');
      setAmountVal('ct-book',        c.book_allowance||0);
      setCTPayType('book',           c.book_pay_type||'fixed');
      setAmountVal('ct-overseas',    c.overseas_allowance||0);
      setCTPayType('overseas',       c.overseas_pay_type||'fixed');
      setAmountVal('ct-regular-bonus', c.regular_bonus||0);
      // 출산·보육수당 복원 (openContractModal 경로)
      setAmountVal('ct-childcare', c.childcare_allowance||0);
      { const _ccDep2 = document.getElementById('ct-childcare-dependents');
        if(_ccDep2) _ccDep2.value = c.childcare_dependents || 1; }
      // custom_allowances 복원
      { const _ca = _parseCTCustomAllowances(c);
        Object.entries(_ca).forEach(([k,v]) => setAmountVal(`ct-${k}`, v||0)); }
      // 급여 산정기간 복원
      const _ppEl = document.getElementById('ct-pay-period');
      if(_ppEl) _ppEl.value = c.pay_period || '';
      _autoFillCTPeriod(); // 힌트 갱신
      // DB에 값이 있는 항목은 allowance_config와 무관하게 강제 노출 (하위호환)
      _forceShowNonZeroCTRows(c);
      document.getElementById('ct-note').value=c.note||'';
      document.getElementById('ct-monthly-computed').textContent=won(c.monthly_salary_agreed);
      document.getElementById('ct-weekly-hol-computed').textContent=won(c.weekly_holiday_pay);
      setAmountVal('ct-hourly-wage', c.hourly_wage||0);
      // 출산·보육수당 복원
      setAmountVal('ct-childcare', c.childcare_allowance||0);
      { const _ccDep = document.getElementById('ct-childcare-dependents');
        if(_ccDep) _ccDep.value = c.childcare_dependents || 1; }
      // custom_allowances 복원 (2차 — 확실한 덮어쓰기)
      { const _ca2 = _parseCTCustomAllowances(c);
        Object.entries(_ca2).forEach(([k,v]) => setAmountVal(`ct-${k}`, v||0)); }
      // 고정 연장/야간/휴일근로수당 복원: 시간 세팅 후 금액 자동산출
      { const _fotH = document.getElementById('ct-fixed-ot-hours');    if(_fotH) _fotH.value = c.fixed_ot_hours   ||''; }
      { const _fniH = document.getElementById('ct-fixed-night-hours'); if(_fniH) _fniH.value = c.fixed_night_hours||''; }
      { const _fhoH = document.getElementById('ct-fixed-hol-hours');   if(_fhoH) _fhoH.value = c.fixed_hol_hours  ||''; }
      // 시급이 이미 세팅된 상태이므로 hours → pay 자동산출
      // (hours 없고 pay만 있는 구형 데이터는 pay 값을 직접 표시)
      _calcFixedOtFromHours();
      _calcFixedNightFromHours();
      _calcFixedHolFromHours();
      if(!c.fixed_ot_hours    && c.fixed_ot_pay)    _setFixedPayDisplay('ct-fixed-ot-pay',    c.fixed_ot_pay);
      if(!c.fixed_night_hours && c.fixed_night_pay) _setFixedPayDisplay('ct-fixed-night-pay', c.fixed_night_pay);
      if(!c.fixed_hol_hours   && c.fixed_hol_pay)   _setFixedPayDisplay('ct-fixed-hol-pay',   c.fixed_hol_pay);
      // ── 연봉/월약정급여 섹션 표시 최종 강제 적용 (ctVal 기준 — emp.employment_category 우선) ──
      const isFixedEdit2 = ctVal==='계약직' || ctVal==='계약직 수습';
      const showSalRow = isRegEdit || isFixedEdit2;
      ['ct-row-salary-period','ct-row-annual-sal'].forEach(sid=>{
        const el=document.getElementById(sid); if(el) el.style.display=showSalRow?'':'none';
      });
      if(isRegEdit){
        setAmountVal('ct-annual-sal', c.annual_salary||0);
      } else if(isFixedEdit2){
        // 계약직: ct-annual-sal에 월약정급여(monthly_salary_agreed) 복원
        setAmountVal('ct-annual-sal', c.monthly_salary_agreed||0);
      }
    }
    // 수정(amend) 모드: 이름·고용형태 편집 가능, 갱신/재계약 모드는 openRecontractModal에서 잠금
    _setEditNameCategoryLock(false);
    // _prevEditCategory 초기화 (모달 열릴 때 즉시 Alert 방지)
    _prevEditCategory = document.getElementById('ct-edit-em-category')?.value || '';
    // 수정 모드: 데이터 복원 완료 후 연차일수 자동계산 힌트 표시
    autoFillAnnualLeave();
  }
  // 신규 모드: 힌트 초기화
  if(isNew){ const h=document.getElementById('ct-annual-hint'); if(h) h.style.display='none'; }
  // 모달 열릴 때 이전 오류 상태 초기화
  _ctClearErrors();
  // 신규 모드: 등록 버튼 초기 비활성화 상태 세팅
  _checkRegisterBtnState();
  openModal('contract-modal');

  // 입력 수정 시 해당 필드 하이라이트 자동 해제
  const _modalEl = document.getElementById('contract-modal');
  _modalEl.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input',  _ctClearFieldError, { once: false });
    el.addEventListener('change', _ctClearFieldError, { once: false });
  });
}
function _ctClearFieldError(e){
  const fg = e.target.closest('.form-group');
  if(fg && fg.classList.contains('ct-field-error')){
    fg.classList.remove('ct-field-error');
    // 배너에서 해당 항목 제거 후, 남은 항목 없으면 배너 숨김
    const banner = document.getElementById('ct-validation-banner');
    const list   = document.getElementById('ct-validation-list');
    if(!banner || !list) return;
    if(!document.querySelector('#contract-modal .ct-field-error')){
      banner.style.display = 'none';
    }
  }
}
function onCtEmployeeChange(){/* 직원 드롭다운 제거됨 - 신규 직원 섹션 항상 표시(신규 모드) */}

// ─── 수정 모드 이름·고용형태 잠금 제어 ────────────────────────────────────
/**
 * 갱신·재계약 모드: 이름·주민번호·성별 readonly 잠금
 * 수정(amend) 모드: 이름·고용형태 모두 편집 가능
 * @param {boolean} lock  true = 잠금(갱신·재계약), false = 편집 가능(수정)
 */
// ─── 수정 모드 고용형태 변경 핸들러 ────────────────────────────────────────
// 이전 고용형태 값 추적 (Alert 판별용)
let _prevEditCategory = '';

function _onEditCategoryChange() {
  // ct-edit-em-category 변경 시 ct-type(hidden)도 동기화하여 toggleAnnualSal 등 연동
  const catEl = document.getElementById('ct-edit-em-category');
  const typeEl = document.getElementById('ct-type');
  if(!catEl || !typeEl) return;
  const newCat = catEl.value;
  const prevCat = _prevEditCategory;

  // ── 예외 그룹: Alert·초기화 불필요 ──
  // - 정규직 ↔ 정규직 수습
  // - 계약직 ↔ 계약직 수습
  const _sameGroup = (a, b) => {
    const regGroup   = ['정규직', '정규직 수습'];
    const fixedGroup = ['계약직', '계약직 수습'];
    return (regGroup.includes(a) && regGroup.includes(b)) ||
           (fixedGroup.includes(a) && fixedGroup.includes(b));
  };

  // 이전 값이 있고, 그룹이 달라졌을 때 → Alert + 임금 초기화
  if(prevCat && prevCat !== newCat && !_sameGroup(prevCat, newCat)){
    alert('고용형태 변경 시 임금 조건 입력항목이 초기화되니 유의하세요.');
    _resetWageInputs();
  }

  // 현재 값을 다음 변경 감지용으로 저장
  _prevEditCategory = newCat;

  typeEl.value = newCat;
  // 임금조건 섹션 연동
  toggleAnnualSal();
  // 계약 종료일 행 표시 제어
  toggleCtEndDate(true);
  // 수습 섹션 제어 (ct-em-category가 아닌 ct-type을 보는 toggleProbation 우회)
  const isProbation = (newCat === '정규직 수습' || newCat === '계약직 수습');
  const probSec = document.getElementById('ct-probation-section');
  if(probSec) probSec.style.display = isProbation ? '' : 'none';
  // 입사일·퇴사예정일 행 표시 제어
  const isFixed   = (newCat === '계약직' || newCat === '계약직 수습' || newCat === '일용직');
  const isRegular = (newCat === '정규직' || newCat === '정규직 수습');
  const hireRowEl   = document.getElementById('ct-edit-row-hire');
  const expireRowEl = document.getElementById('ct-edit-row-expire');
  if(hireRowEl)   hireRowEl.style.display   = '';
  if(expireRowEl) expireRowEl.style.display  = (isFixed || isRegular) ? 'none' : '';
}

// 임금 조건 입력항목 일괄 초기화 (고용형태 변경 시 호출)
function _resetWageInputs(){
  // 연봉·월약정급여·기본급·일급
  ['ct-annual-sal','ct-base','ct-daily-wage'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  // 수당 전체
  ['ct-position','ct-car','ct-remote-area','ct-meal','ct-research',
   'ct-site','ct-skill','ct-license','ct-communication','ct-fitness',
   'ct-self-dev','ct-book','ct-overseas','ct-other'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  // 자동계산 표시값 초기화
  ['ct-monthly-computed','ct-weekly-hol-computed'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.textContent = '0원';
  });
  setAmountVal('ct-hourly-wage', 0);
}

// lock     : 이름·주민번호·성별 잠금 여부 (수정=false, 갱신·재계약=true)
// lockCat  : 고용형태 잠금 여부 (기본값 = lock과 동일 — 하위 호환)
//            재계약도 고용형태는 변경 가능하므로 false로 호출
function _setEditNameCategoryLock(lock, lockCat = lock) {
  const nameEl     = document.getElementById('ct-edit-emp-name');
  const catEl      = document.getElementById('ct-edit-em-category');
  const idEl       = document.getElementById('ct-edit-em-id');
  const genderEl   = document.getElementById('ct-edit-em-gender');
  const nameLock   = document.getElementById('ct-edit-name-lock-hint');
  const catLock    = document.getElementById('ct-edit-category-lock-hint');

  // 이름·주민번호·성별: lock 적용
  if(nameEl)   { nameEl.readOnly   = lock;    nameEl.style.background   = lock    ? '#f3f4f6' : ''; nameEl.style.color    = lock    ? '#6b7280' : ''; }
  if(idEl)     { idEl.readOnly     = lock;    idEl.style.background     = lock    ? '#f3f4f6' : ''; idEl.style.color      = lock    ? '#6b7280' : ''; }
  if(genderEl) { genderEl.disabled = lock;    genderEl.style.background = lock    ? '#f3f4f6' : ''; genderEl.style.color  = lock    ? '#6b7280' : ''; }
  // 고용형태: lockCat 적용 (재계약은 false → 편집 가능)
  if(catEl)    { catEl.disabled    = lockCat; catEl.style.background    = lockCat ? '#f3f4f6' : ''; catEl.style.color     = lockCat ? '#6b7280' : ''; }
  if(nameLock) nameLock.style.display = lock    ? 'block' : 'none';
  if(catLock)  catLock.style.display  = lockCat ? 'block' : 'none';
}
function checkCtDuplicateName(){
  const name = document.getElementById('ct-em-name').value.trim();
  const alertEl = document.getElementById('ct-em-name-dup-alert');
  const msgEl   = document.getElementById('ct-em-name-dup-msg');
  const suggestEl = document.getElementById('ct-em-name-dup-suggestions');
  if(!name){ alertEl.style.display='none'; return; }
  const dupes = allEmployees.filter(e=>e.name===name);
  if(!dupes.length){ alertEl.style.display='none'; return; }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const existingNames = allEmployees.filter(e=>new RegExp(`^${escaped}(\\d+)?$`).test(e.name)).map(e=>e.name);
  const suggestions=[];
  for(let n=2;n<=existingNames.length+2;n++){
    const c=`${name}${n}`;
    if(!existingNames.includes(c)){ suggestions.push(c); if(suggestions.length>=3) break; }
  }
  msgEl.textContent=`동일한 이름 "${name}"의 직원이 이미 ${dupes.length}명 있습니다.`;
  suggestEl.innerHTML=suggestions.map(s=>
    `<button type="button" onclick="document.getElementById('ct-em-name').value='${s}';document.getElementById('ct-em-name-dup-alert').style.display='none'"
      style="padding:3px 10px;background:#FFF;border:1.5px solid #FB923C;border-radius:20px;color:#9A3412;font-size:11px;cursor:pointer;font-weight:600;">
      ${s} 로 입력</button>`).join('');
  alertEl.style.display='block';
}

// ─── 사원번호 유니크 유효성 검사 ───────────────────────────────────────────
/**
 * 사원번호 유효성 검사 규칙:
 *  규칙1: 동일 고객사 내 사원번호는 고유 (파기 계약 직원 제외)
 *  규칙2: 동일 직원이라도 계약 공백(기간 단절) → 새 번호 필요
 *  규칙3: 연속 계약이라도 고용형태 변경 → 새 번호 필요
 *  허용:  수정(amend)·갱신·동일 고용형태 연속 재계약 → 기존 번호 유지 가능
 *
 * @param {string} empNo       - 검사할 사원번호
 * @param {string} companyId   - 현재 고객사 ID
 * @param {string|null} selfEmpId - 수정 모드 시 현재 직원 ID (자기 자신 제외)
 * @param {string} newContractStart - 신규 계약 시작일 (YYYY-MM-DD) [신규 모드]
 * @param {string} newContractType  - 신규 계약 고용형태 [신규 모드]
 * @returns {{ ok: boolean, type: string, msg: string }}
 *   type: 'ok' | 'duplicate' | 'gap' | 'type_change'
 */
function _validateEmpNoUniqueness(empNo, companyId, selfEmpId, newContractStart, newContractType) {
  if(!empNo || !companyId) return { ok: true, type: 'ok', msg: '' };

  // 파기 제외 상태 목록
  const VALID_STATUSES = ['활성', 'active', '계약예정', '만료', '해지', '갱신', '재계약'];

  // ── 같은 회사 내 동일 사원번호를 가진 직원 탐색 (파기·임시저장 제외) ──
  // allEmployees에서 같은 company_id + 동일 employee_number 보유 직원
  const sameNoEmps = allEmployees.filter(e =>
    e.company_id === companyId &&
    e.employee_number === empNo &&
    e.id !== selfEmpId   // 수정 모드: 자기 자신 제외
  );

  if(!sameNoEmps.length) return { ok: true, type: 'ok', msg: '' };

  // 해당 직원(들)의 계약 중 유효한 계약이 있는지 확인
  for(const existEmp of sameNoEmps) {
    const empContracts = allContracts.filter(c =>
      c.employee_id === existEmp.id &&
      VALID_STATUSES.includes(c.status)
    );
    if(empContracts.length === 0) continue; // 유효 계약 없음(모두 파기) → 이 직원은 통과

    // ── 규칙2·3: 신규 계약인 경우 동일 직원 연속성 검사 ──
    // (sameNoEmps에는 이미 selfEmpId가 아닌 타인만 있으므로 → 타 직원이 쓰는 번호)
    // 타 직원이 이 번호를 쓰고 있고 유효 계약이 있으면 → 규칙1 위반
    return {
      ok: false,
      type: 'duplicate',
      msg: `사원번호 "${empNo}"은(는) 이미 ${existEmp.name} 직원이 사용 중입니다. 다른 번호를 입력하세요.`
    };
  }

  return { ok: true, type: 'ok', msg: '' };
}

/**
 * 신규 계약 모드: 동일 직원(이름·주민번호 동일)이 이전에 같은 번호를 사용했는지 연속성 검사
 * - 이전 계약과 새 계약 사이 공백이 있으면 → 재발행 필요
 * - 이전 계약 고용형태와 다르면 → 재발행 필요
 * @param {string} empNo
 * @param {string} companyId
 * @param {string} selfEmpId  수정 모드: 현재 직원 ID
 * @param {string} newStart   새 계약 시작일 (YYYY-MM-DD)
 * @param {string} newType    새 계약 고용형태
 * @returns {{ ok:boolean, type:string, msg:string }}
 */
function _checkEmpNoContinuity(empNo, companyId, selfEmpId, newStart, newType) {
  if(!empNo || !companyId || !selfEmpId || !newStart || !newType)
    return { ok: true, type: 'ok', msg: '' };

  // 현재 직원(selfEmpId)의 기존 계약 조회 (파기·임시저장 제외)
  const VALID_STATUSES = ['활성', 'active', '계약예정', '만료', '해지', '갱신', '재계약'];
  const myContracts = allContracts.filter(c =>
    c.employee_id === selfEmpId &&
    VALID_STATUSES.includes(c.status)
  );

  if(!myContracts.length) return { ok: true, type: 'ok', msg: '' };

  // 가장 최근 계약 (contract_start 기준 내림차순)
  const sorted = [...myContracts].sort((a, b) =>
    new Date(b.contract_start) - new Date(a.contract_start)
  );
  const lastContract = sorted[0];
  const lastEnd = lastContract.contract_end ? new Date(lastContract.contract_end) : null;
  const newStartDate = new Date(newStart);

  // ── 규칙3: 고용형태 변경 검사 (연속성 먼저 확인) ──
  const lastType = lastContract.contract_type || '';

  // 날짜 연속성 판단: 이전 종료일 + 1일 >= 새 시작일 (당일 포함)
  let isContinuous = false;
  if(lastEnd) {
    const gapMs = newStartDate - lastEnd;
    const gapDays = Math.round(gapMs / (1000 * 60 * 60 * 24));
    isContinuous = (gapDays <= 1); // 0일(당일) 또는 1일 차이까지 연속으로 판단
  }

  if(!isContinuous) {
    // 규칙2: 계약 공백 발생
    const lastEndStr = lastEnd ? lastEnd.toLocaleDateString('ko-KR') : '(미정)';
    return {
      ok: false,
      type: 'gap',
      msg: `이전 계약 종료일(${lastEndStr})과 새 계약 시작일(${newStartDate.toLocaleDateString('ko-KR')}) 사이에 공백이 있습니다. 사원번호를 재발행해야 합니다.`
    };
  }

  if(lastType && newType && lastType !== newType) {
    // 규칙3: 고용형태 변경
    return {
      ok: false,
      type: 'type_change',
      msg: `고용형태가 "${lastType}"에서 "${newType}"으로 변경됩니다. 사원번호를 새로 발행해야 합니다.`
    };
  }

  return { ok: true, type: 'ok', msg: '' };
}

// ── 사원번호 실시간 피드백 UI 표시 (신규 모드) ──
function checkCtEmpNoUniqueness(){
  const empNo    = (document.getElementById('ct-em-empno')?.value || '').trim();
  const alertEl  = document.getElementById('ct-em-empno-alert');
  if(!alertEl) return;
  if(!empNo){ alertEl.style.display='none'; return; }

  const companyId = document.getElementById('ct-company')?.value || '';
  if(!companyId){ alertEl.style.display='none'; return; }

  const result = _validateEmpNoUniqueness(empNo, companyId, null, null, null);
  if(!result.ok){
    _showEmpNoAlert(alertEl, result.msg, 'error');
    return;
  }
  _showEmpNoAlert(alertEl, `사용 가능한 사원번호입니다.`, 'ok');
}

// ── 사원번호 실시간 피드백 UI 표시 (수정 모드) ──
function checkCtEditEmpNoUniqueness(){
  const empNo    = (document.getElementById('ct-edit-em-empno')?.value || '').trim();
  const alertEl  = document.getElementById('ct-edit-em-empno-alert');
  if(!alertEl) return;
  if(!empNo){ alertEl.style.display='none'; return; }

  const companyId = currentContCompanyId || document.getElementById('ct-company')?.value || '';
  if(!companyId){ alertEl.style.display='none'; return; }

  // 수정 모드: 현재 계약의 employee_id를 selfEmpId로 넘겨 자기 자신 제외
  const c = editId.contract ? allContracts.find(x => x.id === editId.contract) : null;
  const selfEmpId = c ? c.employee_id : null;

  const result = _validateEmpNoUniqueness(empNo, companyId, selfEmpId, null, null);
  if(!result.ok){
    _showEmpNoAlert(alertEl, result.msg, 'error');
    return;
  }
  _showEmpNoAlert(alertEl, `사용 가능한 사원번호입니다.`, 'ok');
}

function _showEmpNoAlert(alertEl, msg, type){
  const isOk = (type === 'ok');
  alertEl.style.display = 'block';
  alertEl.style.background = isOk ? '#F0FDF4' : '#FFF1F2';
  alertEl.style.border     = `1.5px solid ${isOk ? '#86EFAC' : '#FCA5A5'}`;
  alertEl.style.color      = isOk ? '#166534' : '#991B1B';
  alertEl.querySelector('.empno-alert-msg').textContent = msg;
}

// ─── 동일 직원의 최초 계약 시작일 반환 (입사일 상속용) ───
// 파기·임시저장 계약 제외, contract_start 가장 앞선 값 반환
function getEarliestContractStart(employeeId){
  if(!employeeId || !Array.isArray(allContracts)) return '';
  const dates = allContracts
    .filter(x => x.employee_id === employeeId
               && !x.is_draft
               && x.status !== '파기'
               && x.contract_start)
    .map(x => x.contract_start)
    .sort();   // 'YYYY-MM-DD' 문자열 정렬 = 날짜 오름차순
  return dates.length ? dates[0] : '';
}

// ─── 계약 상태 표시 계산 ───
function calcContractStatusDisplay(c, today){
  // 임시저장 상태 최우선 처리
  if(c.is_draft) return {badge:'badge-yellow', label:'임시저장'};
  const s = c.status || '활성';
  const start = c.contract_start || '';
  // 명시적 상태 우선
  if(s==='갱신예정')  return {badge:'badge-amber',  label:'갱신예정'};
  if(s==='계약예정')  return {badge:'badge-indigo', label:'계약예정'};
  if(s==='해지예정')  return {badge:'badge-rose',   label:'해지예정'};
  if(s==='파기')      return {badge:'badge-slate',  label:'파기'};
  if(s==='갱신됨')    return {badge:'badge-gray',   label:'만료'}; // 레거시 → 만료로 표시
  if(s==='만료'||s==='expired')    return {badge:'badge-gray',  label:'만료'};
  if(s==='해지'||s==='terminated') return {badge:'badge-red',   label:'해지'};
  // 만료예정·종료예정은 레거시 값 → 계약유효로 표시 (유효한 계약)
  if(s==='만료예정'||s==='종료예정') return {badge:'badge-green', label:'계약유효'};
  // 서류미비 상태 (활성이지만 계약서 날인본 또는 동의서 미첨부)
  if(s==='서류미비') return {badge:'badge-orange', label:'서류미비'};
  // 활성/유효 상태
  if(s==='활성'||s==='유효'||s==='active'){
    if(start && start > today) return {badge:'badge-amber', label:'갱신예정'};
    // 두 파일 모두 있어야 '계약유효', 하나라도 없으면 '서류미비'
    const hasSignedFile  = !!(c.signed_file_data);
    const hasConsentFile = !!(c.consent_file_data);
    if(!hasSignedFile || !hasConsentFile) return {badge:'badge-orange', label:'서류미비'};
    return {badge:'badge-green', label:'계약유효'};
  }
  return {badge:'badge-gray', label: s};
}

// ─── 조회 모드로 모달 열기 ───
function viewContract(id){
  // 먼저 openContractModal로 데이터를 채운다
  openContractModal(id);

  const c = allContracts.find(x=>x.id===id);
  const today = new Date().toISOString().slice(0,10);
  const {label:stName} = calcContractStatusDisplay(c||{}, today);

  // openContractModal 에서 이미 c.contract_type 우선 기준으로 ctVal이 결정되지만,
  // viewContract 에서도 동일 로직으로 한 번 더 보정한다 (연봉 섹션 표시 최종 확정).
  if(c){
    const emp2 = allEmployees.find(e => e.id === c.employee_id);
    const _ctVal2Raw = c.contract_type || (emp2 ? emp2.employment_category : '') || '정규직';
    const _isPendingCt2 = (c.status === '계약예정');
    const ctVal2 = _isPendingCt2
      ? (_ctVal2Raw === '정규직 수습' ? '정규직' : _ctVal2Raw === '계약직 수습' ? '계약직' : _ctVal2Raw)
      : _ctVal2Raw;
    const isReg = ctVal2 === '정규직' || ctVal2 === '정규직 수습';
    ['ct-row-salary-period','ct-row-annual-sal'].forEach(sid=>{
      const el = document.getElementById(sid);
      if(el) el.style.display = isReg ? '' : 'none';
    })
    // 연봉 값도 다시 채우기 (openContractModal에서 초기화될 수 있으므로)
    if(isReg){
      if(c.annual_salary) setAmountVal('ct-annual-sal', c.annual_salary);
      // salary_start_date = contract_start 통합 — 별도 로드 불필요
    }
  }

  // 모달 제목 변경
  document.getElementById('ct-title').textContent = '근로계약 정보';

  // 편집/저장 footer 숨기고 조회 액션 바 표시, 일괄설정 바 숨김
  document.getElementById('ct-footer-edit').style.display = 'none';
  document.getElementById('ct-action-bar-top').style.display = 'flex';
  document.getElementById('ct-action-bar-bottom').style.display = 'flex';
  const _bulkBarView = document.getElementById('ct-bulk-bar-wrap');
  if(_bulkBarView) _bulkBarView.style.display = 'none';
  // 단계바 숨김 (조회 모드)
  const _stepBarV = document.getElementById('ct-step-bar');
  if(_stepBarV) _stepBarV.style.display = 'none';

  // 패널 초기화
  document.getElementById('ct-terminate-panel').style.display = 'none';
  document.getElementById('ct-renew-panel').style.display = 'none';
  const _amendPanelV = document.getElementById('ct-amend-panel');
  if(_amendPanelV) _amendPanelV.style.display = 'none';

  // ── 계약 상태 통합 배너 처리 (해지예정 / 계약예정 / 갱신예정) ──
  const sbEl = document.getElementById('ct-status-banner');
  if(sbEl){
    const cStatus = c?.status || '';
    const isPreTerm   = (cStatus === '해지예정');
    const isPendingSt = (cStatus === '계약예정');
    // '갱신예정': DB status가 '갱신예정' 이거나, status가 '활성/유효'이면서 시작일이 오늘 이후인 경우
    const isActiveFutureStart = (cStatus === '활성' || cStatus === '유효' || cStatus === 'active')
                                && (c?.contract_start || '') > today;
    const isRenewSt   = (cStatus === '갱신예정') || isActiveFutureStart;
    const needsBanner = !c?.is_draft && (isPreTerm || isPendingSt || isRenewSt);

    if(c && needsBanner){
      // DB status가 '활성'이지만 시작일이 미래인 경우 → '갱신예정'으로 취급
      const effectiveStatus = isActiveFutureStart ? '갱신예정' : cStatus;

      // ── 타입별 스타일·텍스트 설정 ──
      const typeMap = {
        '해지예정': { cls:'type-preterminate', icon:'⚠️', ddayBg:'#be123c',
                      editCls:'btn-sb btn-sb-edit rose', destroyLabel:'<i class="fas fa-times-circle"></i> 해지 취소' },
        '계약예정': { cls:'type-pending',       icon:'📋', ddayBg:'#4338ca',
                      editCls:'btn-sb btn-sb-edit',      destroyLabel:'<i class="fas fa-times-circle"></i> 계약 취소' },
        '갱신예정': { cls:'type-renew',         icon:'🔄', ddayBg:'#d97706',
                      editCls:'btn-sb btn-sb-edit amber', destroyLabel:'<i class="fas fa-times-circle"></i> 갱신 취소' },
      };
      const tm = typeMap[effectiveStatus];
      sbEl.className = `ct-status-banner ${tm.cls}`;
      document.getElementById('ct-sb-icon').textContent = tm.icon;
      document.getElementById('ct-sb-title-text').textContent = effectiveStatus;

      // 아이콘 (FontAwesome)
      const iconMap = { '해지예정':'fa-user-clock', '계약예정':'fa-calendar-alt', '갱신예정':'fa-sync-alt' };
      document.getElementById('ct-sb-title-icon').innerHTML = `<i class="fas ${iconMap[effectiveStatus]}"></i>`;

      // ── 날짜 정보 및 D-day ──
      function fmtDate(str){ if(!str)return null; const [y,m,d]=str.split('-'); return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`; }
      function calcDday(str){ if(!str)return null; const diff=Math.ceil((new Date(str)-new Date(today))/(1000*60*60*24)); return diff>0?`D-${diff}`:diff===0?'D-day':`D+${Math.abs(diff)}`; }

      const ddayEl = document.getElementById('ct-sb-dday');
      let dateHtml = '';

      if(isPreTerm){
        // 해지예정: 퇴사예정일 + D-day + 원래 계약만료일
        const termDate = c.terminate_date || '';
        const dday = calcDday(termDate);
        if(dday){ ddayEl.textContent = dday; ddayEl.style.background = tm.ddayBg; ddayEl.style.display = 'inline-block'; }
        else { ddayEl.style.display = 'none'; }
        const termKr    = fmtDate(termDate) || '—';
        const contractEndKr = fmtDate(c.contract_end) || '미정';
        dateHtml = `퇴사예정일: <strong>${termKr}</strong>`
          + `<span style="font-size:11.5px;margin-left:12px;">(원래 계약 만료일: ${contractEndKr})</span>`;
      } else {
        // 계약예정 / 갱신예정(DB status='갱신예정' or '활성'+미래시작일): 계약시작일 + D-day + 계약종료일
        const startVal = c.contract_start || '';
        const dday = calcDday(startVal);
        if(dday){ ddayEl.textContent = dday; ddayEl.style.background = tm.ddayBg; ddayEl.style.display = 'inline-block'; }
        else { ddayEl.style.display = 'none'; }
        const startKr = fmtDate(startVal) || '—';
        const endKr   = fmtDate(c.contract_end) || '미정';
        dateHtml = `계약 시작일: <strong>${startKr}</strong>&nbsp;&nbsp;계약 종료일: <strong>${endKr}</strong>`;
      
        // 계약예정: 수정·취소 기한 안내문구 추가
        if(isPendingSt){
          const _deadlineKr = fmtDate(startVal) || '—';
          const _isExpired  = startVal && today >= startVal;
          dateHtml += _isExpired
            ? `<span style="display:block;margin-top:6px;font-size:11.5px;color:#dc2626;font-weight:600;">
                <i class="fas fa-lock" style="margin-right:4px;"></i>계약 시작일이 도래하여 수정·취소가 불가합니다.
               </span>`
            : `<span style="display:block;margin-top:6px;font-size:11.5px;color:#4338ca;">
                <i class="fas fa-info-circle" style="margin-right:4px;"></i>수정·취소는 계약 시작일(<strong>${_deadlineKr}</strong>) 전날까지만 가능합니다.
               </span>`;
        }
      }
      document.getElementById('ct-sb-date').innerHTML = dateHtml;

      // ── 버튼 초기 상태 (조회 모드) ──
      const _editBtn    = document.getElementById('ct-sb-btn-edit');
      const _destroyBtn = document.getElementById('ct-sb-btn-destroy');
      _editBtn.className    = tm.editCls;
      _editBtn.style.display    = 'inline-flex';
      document.getElementById('ct-sb-btn-save').style.display    = 'none';
      document.getElementById('ct-sb-btn-cancel').style.display  = 'none';
      _destroyBtn.style.display = 'inline-flex';
      _destroyBtn.innerHTML     = tm.destroyLabel;

      // 계약예정: 시작일 도래 시 수정·취소 버튼 비활성화
      if(isPendingSt && c.contract_start && today >= c.contract_start){
        [_editBtn, _destroyBtn].forEach(btn => {
          btn.disabled = true;
          btn.style.opacity = '0.4';
          btn.style.cursor  = 'not-allowed';
          btn.title = '계약 시작일이 도래하여 수정·취소가 불가합니다.';
        });
      } else {
        [_editBtn, _destroyBtn].forEach(btn => {
          btn.disabled = false;
          btn.style.opacity = '';
          btn.style.cursor  = '';
          btn.title = '';
        });
      }

      sbEl.style.display = 'flex';
    } else {
      sbEl.style.display = 'none';
    }
  }

  // 모달 본문(modal-body) 읽기전용 - 액션 패널 제외
  const modalEl = document.querySelector('#contract-modal .modal');
  modalEl.classList.add('ct-readonly');
  // modal-body 내 input/select/textarea만 disabled (액션 패널 제외)
  // 단, 입사일(ct-edit-em-hire)은 재입사 케이스를 위해 항상 편집 가능하게 유지
  const bodyEl = modalEl.querySelector('.modal-body');
  // 고정수당 금액 readonly 필드 ID 목록 (조회 모드에서 보라 배경 유지)
  const _fixedPayIds = new Set(['ct-fixed-ot-pay','ct-fixed-night-pay','ct-fixed-hol-pay']);
  if(bodyEl) bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    el.disabled = true;
    // toggleCtEndDate()가 disabled 상태에서 배경색을 바꾸지 않도록 스타일 통일
    // 단, 고정수당 금액 필드는 보라 배경·색상 유지
    if(_fixedPayIds.has(el.id)){
      el.style.background = '#f5f3ff';
      el.style.color = '#7c3aed';
    } else {
      el.style.background = '#f8f9fb';
      el.style.color = '#374151';
    }
    el.style.cursor = 'default';
  });
  // 지급유형 버튼(매월 정기지급/출근일수에 따름) + 휴게시간 추가 버튼 비활성화
  if(bodyEl){
    bodyEl.querySelectorAll('.pi-pay-type-btn').forEach(btn=>{
      btn.disabled = true;
      btn.style.cursor = 'default';
      btn.style.pointerEvents = 'none';
    });
    bodyEl.querySelectorAll('.btn-brk-add').forEach(btn=>{
      btn.disabled = true;
      btn.style.cursor = 'not-allowed';
      btn.style.pointerEvents = 'none';
    });
  }

  // 버튼 표시 로직
  const ct = c?.contract_type||'';
  const isDraft       = !!c?.is_draft;                         // 임시저장 여부
  const isRegular     = (ct==='정규직'||ct==='정규직 수습');  // 무기한 계약 (만료일 없음)
  const isFixed       = (ct==='계약직'||ct==='계약직 수습'||ct==='일용직');  // 기간제 계약
  const isTerminated  = !isDraft && (c?.status==='만료'||c?.status==='해지'||c?.status==='expired'||c?.status==='terminated'||c?.status==='파기'||c?.status==='갱신됨');
  const isPending     = !isDraft && (c?.status==='갱신예정'||c?.status==='계약예정');  // 시작일 미도래
  const isPreTerminate= !isDraft && (c?.status==='해지예정');  // 퇴사예정일 설정된 정규직
  const isActive      = !isDraft && !isTerminated && !isPending && !isPreTerminate;

  // 액션 라벨
  const labelEl = document.getElementById('ct-action-label');
  if(labelEl){
    if(isDraft){
      labelEl.textContent = '⚠ 임시저장 상태';
    } else if(c?.is_voided_by_amend){
      labelEl.innerHTML = `상태: ${stName} &nbsp;<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:20px;padding:1px 9px;font-size:10.5px;font-weight:700;"><i class="fas fa-ban" style="margin-right:3px;"></i>수정재발행 파기</span>`;
    } else {
      labelEl.textContent = `상태: ${stName}`;
    }
  }

  // 임시저장 계속 수정 버튼 (draft 전용)
  const draftEditBtn = document.getElementById('ct-btn-draft-edit');
  if(draftEditBtn) draftEditBtn.style.display = isDraft ? 'flex' : 'none';

  // draft 상태이면 다른 액션 버튼은 모두 숨김 + 출력 버튼 비활성
  if(isDraft){
    ['ct-btn-amend','ct-btn-amend2',
     'ct-btn-renew','ct-btn-renew2','ct-btn-recontract','ct-btn-recontract2',
     'ct-btn-terminate','ct-btn-terminate2'].forEach(bid=>{
      const el=document.getElementById(bid); if(el) el.style.display='none';
    });
    ['ct-btn-print-doc','ct-btn-print-doc2'].forEach(bid=>{
      const el=document.getElementById(bid);
      if(el){
        el.style.pointerEvents='none';
        el.style.opacity='0.35';
        el.style.cursor='not-allowed';
        el.title='임시저장 상태에서는 출력할 수 없습니다';
      }
    });
    return;
  }

  // 정상 상태: 출력 버튼 활성 복원
  ['ct-btn-print-doc','ct-btn-print-doc2'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el){
      el.style.pointerEvents='';
      el.style.opacity='';
      el.style.cursor='';
      el.title='';
    }
  });

  // 버튼 표시/숨김
  // 수정 및 재발행: 활성(유효·해지예정 포함) 계약에서 가능
  ['ct-btn-amend','ct-btn-amend2'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el) el.style.display=(isActive||isPreTerminate)?'inline-flex':'none';
  });
  // 갱신: 유효 계약 + 해지예정(퇴사 전 갱신 가능)
  ['ct-btn-renew','ct-btn-renew2'].forEach(bid=>{
    const el=document.getElementById(bid); if(el) el.style.display=(isActive||isPreTerminate)?'':'none';
  });
  // 재계약: 만료·해지·파기된 계약만
  ['ct-btn-recontract','ct-btn-recontract2'].forEach(bid=>{
    const el=document.getElementById(bid); if(el) el.style.display=isTerminated?'':'none';
  });
  // 퇴사예정 설정: 정규직 유효 계약만 (계약직/일용직은 별도 해지설정 버튼 사용)
  ['ct-btn-terminate','ct-btn-terminate2'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el) el.style.display=(isActive && isRegular)?'inline-flex':'none';
  });

  // 해지 설정: 계약직·계약직수습·일용직 — 유효(isActive) 또는 해지예정(isPreTerminate) 상태
  // 해지예정 상태에서는 "해지 예정 수정" 레이블로 변경 (해지일/사유 변경 용도)
  const showFixedTermBtn = isFixed && (isActive || isPreTerminate);
  const fixedTermLabel   = isPreTerminate
    ? '<i class="fas fa-scissors"></i> 해지 예정 수정'
    : '<i class="fas fa-scissors"></i> 해지 설정';
  ['ct-btn-fixed-terminate','ct-btn-fixed-terminate2'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el){
      el.style.display = showFixedTermBtn ? 'inline-flex' : 'none';
      el.innerHTML     = fixedTermLabel;
    }
  });

  // 패널 초기화 (이전 조회에서 열려있을 수 있음)
  const _cftPanel = document.getElementById('ct-fixed-terminate-panel');
  if(_cftPanel) _cftPanel.style.display = 'none';

  // 계약서 확인 버튼명: 만료·해지·파기된 계약 → '이전 계약서 확인', 유효한 계약 → '현 계약서 확인'
  const _printBtnLabel = isTerminated
    ? '<i class="fas fa-file-contract"></i> 이전 계약서 확인'
    : '<i class="fas fa-file-contract"></i> 현 계약서 확인';
  ['ct-btn-print-doc','ct-btn-print-doc2'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el) el.innerHTML = _printBtnLabel;
  });

  // 조회 모드 전환 시 하단 수정완료 버튼 숨김 초기화
  const _btnAC2 = document.getElementById('ct-btn-amend-complete2');
  if(_btnAC2) _btnAC2.style.display = 'none';

  // ── 첨부 서류 섹션 렌더링 ──
  _renderContractFilesSection(c);
}

// ══════════════════════════════════════════════════════════════════════════════
// 계약 내용 수정 및 재발행
// ══════════════════════════════════════════════════════════════════════════════

// 수정 모드로 진입: readonly 해제 → amend 패널 표시 → 필드 변경 감지 시작
function doContractAmend(){
  const modalEl = document.querySelector('#contract-modal .modal');
  if(!modalEl) return;

  // 계약예정: 시작일 당일부터 수정 불가
  const _amendC = allContracts.find(x => x.id === editId.contract);
  if(_amendC && _amendC.status === '계약예정'){
    const _today = new Date().toISOString().slice(0,10);
    if(_amendC.contract_start && _today >= _amendC.contract_start){
      toast(`계약 시작일(${_amendC.contract_start}) 이후에는 예정 계약을 수정할 수 없습니다.`, 'error');
      return;
    }
  }

  // readonly 클래스 제거 + 필드 활성화
  modalEl.classList.remove('ct-readonly');
  const bodyEl = modalEl.querySelector('.modal-body');
  if(bodyEl) bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    el.disabled = false;
    el.style.background = '';
    el.style.color = '';
    el.style.cursor = '';
  });
  // 지급유형 버튼 + 휴게시간 추가 버튼 재활성화
  if(bodyEl){
    bodyEl.querySelectorAll('.pi-pay-type-btn').forEach(btn=>{
      btn.disabled = false;
      btn.style.cursor = '';
      btn.style.pointerEvents = '';
    });
    bodyEl.querySelectorAll('.btn-brk-add').forEach(btn=>{
      btn.disabled = false;
      btn.style.cursor = '';
      btn.style.pointerEvents = '';
    });
  }

  // 액션 버튼 숨김 (수정 중에는 다른 액션 불가)
  ['ct-btn-amend','ct-btn-amend2','ct-btn-renew','ct-btn-renew2',
   'ct-btn-terminate','ct-btn-terminate2','ct-btn-recontract','ct-btn-recontract2'].forEach(bid=>{
    const el = document.getElementById(bid); if(el) el.style.display='none';
  });

  // 하단 수정완료 버튼 표시
  const btnComplete2 = document.getElementById('ct-btn-amend-complete2');
  if(btnComplete2) btnComplete2.style.display = 'inline-flex';

  // 수정 안내 패널 표시
  const panel = document.getElementById('ct-amend-panel');
  if(panel) panel.style.display = '';

  // 단계바 표시 (수정 진행 상황 안내)
  const stepBar = document.getElementById('ct-step-bar');
  if(stepBar) stepBar.style.display = '';
  setContractStep(1);

  // 일괄설정 바 표시
  const bulkBar = document.getElementById('ct-bulk-bar-wrap');
  if(bulkBar) bulkBar.style.display = '';

  // 수정완료 버튼 초기 상태 설정 + 최저임금 경고 초기 평가
  _checkMinWageWarning();
  _checkAmendBtnState();

  // 필드 변경 감지 → 수정완료 버튼 재평가
  if(bodyEl) bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('input',  _checkAmendBtnState);
    el.addEventListener('change', _checkAmendBtnState);
  });
}

// 수정 취소: viewContract()로 복원
function cancelContractAmend(){
  const cid = editId.contract;
  if(!cid) return;
  viewContract(cid);
}

// 수정완료 버튼 활성화 여부 판단 (수정 모드 전용)
// 수정 완료 후 재발행 미리보기 모달 열기
async function openAmendPreview(){
  if(!editId.contract) return;
  // 유효성 재확인
  if(_ctValidate()) return;

  const origId = editId.contract;
  const origC  = allContracts.find(x => x.id === origId);
  if(!origC){ toast('원본 계약 정보를 찾을 수 없습니다.', 'error'); return; }

  // 계약서 HTML 생성
  let html;
  try { html = generateContractHTML(); }
  catch(e){ console.error('[openAmendPreview] generateContractHTML 오류:', e); toast('계약서 미리보기 생성 중 오류가 발생했습니다.', 'error'); return; }

  // ── 즉시 DB 저장 ──
  const nowISO = new Date().toISOString();
  const _isPendingAmend = origC.status === '계약예정';

  // ① 원본 파기 (계약예정이 아닌 경우만)
  if(!_isPendingAmend){
    try {
            const patchResp = await fetch(`../tables/contracts/${origId}`, {
              method : 'PATCH',
              headers: {'Content-Type':'application/json'},
              body   : JSON.stringify({ status:'파기', is_voided_by_amend:true, voided_at:nowISO })
            });
            if(!patchResp.ok) throw new Error(`원본 파기 실패 (HTTP ${patchResp.status})`);
      const origIdx = allContracts.findIndex(x => x.id === origId);
      if(origIdx !== -1){
        allContracts[origIdx].status             = '파기';
        allContracts[origIdx].is_voided_by_amend = true;
        allContracts[origIdx].voided_at          = nowISO;
      }
    } catch(e){
      console.error('[원본 파기 처리 오류]', e);
      toast('원본 계약서 파기 처리에 실패했습니다.', 'error');
      return;
    }
  }

  // ② 수정 내용 수집
  const coId    = document.getElementById('ct-company').value;
  const empId   = origC.employee_id;
  const start   = document.getElementById('ct-start').value;
  const end     = document.getElementById('ct-end').value;
  const cType   = document.getElementById('ct-type').value;
  const catTxt  = document.getElementById('ct-edit-em-category')?.value || cType;
  const isRegGrp= catTxt === '정규직' || catTxt === '정규직 수습';
  const isDailyA= catTxt === '일용직';
  const isFixedA= catTxt === '계약직' || catTxt === '계약직 수습';
  const isProbA = catTxt === '정규직 수습' || catTxt === '계약직 수습';
  const hours_  = parseFloat(document.getElementById('ct-hours').value)||0;
  const days_   = parseFloat(document.getElementById('ct-days').value)||5;
  const base_   = isDailyA ? 0 : getAmountVal('ct-base');
  const dWage_  = isDailyA ? getAmountVal('ct-daily-wage') : 0;
  const annualSalInput_ = getAmountVal('ct-annual-sal');
  const annual_ = isRegGrp ? annualSalInput_ : 0;
  const wkHol_  = isDailyA ? 0 : Math.round(base_ / days_);  // 단시간 비례: ÷dpw
  const pos_    = getAmountVal('ct-position');
  const car_    = getAmountVal('ct-car');
  const meal_   = getAmountVal('ct-meal');
  const res_    = getAmountVal('ct-research');
  const other_  = getAmountVal('ct-other')||0;
  const regBonus_= getAmountVal('ct-regular-bonus')||0;
  const site_   = getAmountVal('ct-site')||0;
  const skill_  = getAmountVal('ct-skill')||0;
  const lic_    = getAmountVal('ct-license')||0;
  const comm_   = getAmountVal('ct-communication')||0;
  const fit_    = getAmountVal('ct-fitness')||0;
  const sdev_   = getAmountVal('ct-self-dev')||0;
  const book_   = getAmountVal('ct-book')||0;
  const ovseas_ = getAmountVal('ct-overseas')||0;
  const monthly_= isDailyA ? 0
    : isFixedA && annualSalInput_ > 0 ? annualSalInput_
    : isRegGrp && annual_ > 0         ? Math.round(annual_ / 12)
    : (base_+wkHol_+pos_+car_+meal_+res_+other_+site_+skill_+lic_+comm_+fit_+sdev_+book_+ovseas_);
  // 통상시급 = 월 통상임금 ÷ 법령 기준 산정시간 (근로기준법 시행령 제6조 제2항)
  const hWage_  = monthly_>0 ? Math.round(monthly_/_calcMonthlyStdHours(hours_,days_)) : (dWage_>0&&hours_>0 ? Math.round(dWage_/hours_) : 0);

  const commonFields = {
    employee_id:'', company_id:coId, contract_start:start, contract_end:end, contract_type:cType,
    probation_months: isProbA?(parseInt(document.getElementById('ct-probation-months').value)||3):0,
    probation_pct:    isProbA?(parseFloat(document.getElementById('ct-probation-pct').value)||0):0,
    probation_amt:    isProbA?(parseFloat(document.getElementById('ct-probation-amt').value)||0):0,
    probation_basis:  isProbA?(document.querySelector('input[name="ct-probation-basis"]:checked')?.value||'salary'):'salary',
    work_hours_per_day: hours_, work_days_per_week: isDailyA?0:days_,
    schedule_json: JSON.stringify(getScheduleJSON()),
    annual_leave_days: isDailyA?0:(parseFloat(document.getElementById('ct-annual').value)||15),
    annual_salary: annual_, monthly_salary_agreed: monthly_, base_salary: base_,
    daily_wage: dWage_, weekly_holiday_pay: wkHol_, hourly_wage: hWage_,
    position_allowance: pos_,
    transportation_allowance: car_, transportation_pay_type: _getCTPayTypeVal('car'),
    self_driving_allowance:0, self_driving_pay_type:'fixed',
    remote_area_allowance: getAmountVal('ct-remote-area'), remote_area_pay_type:'fixed',
    meal_allowance: meal_, meal_pay_type: _getCTPayTypeVal('meal'),
    research_allowance: res_,
    research_pay_type: _getCTPayTypeVal('research'),
    site_allowance: site_, skill_allowance: skill_, license_allowance: lic_,
    communication_allowance: comm_, communication_pay_type: _getCTPayTypeVal('communication'),
    fitness_allowance: fit_, fitness_pay_type: _getCTPayTypeVal('fitness'),
    self_dev_allowance: sdev_, self_dev_pay_type: _getCTPayTypeVal('self_dev'),
    book_allowance: book_, book_pay_type: _getCTPayTypeVal('book'),
    overseas_allowance: ovseas_, overseas_pay_type: _getCTPayTypeVal('overseas'),
    regular_bonus: regBonus_,
    childcare_allowance: getAmountVal('ct-childcare')||0,
    childcare_pay_type: _getCTChildcarePayType(),
    childcare_dependents: parseInt(document.getElementById('ct-childcare-dependents')?.value)||1,
    custom_allowances: JSON.stringify(_collectCTCustomAllowances()),
    pay_period: document.getElementById('ct-pay-period')?.value.trim() || '',
    car_maintenance: car_,
    insurance_employment:true, insurance_industrial:true, insurance_pension:true, insurance_health:true,
    note: document.getElementById('ct-note').value,
    salary_start_date: start, salary_end_date:'', is_draft:false, draft_saved_at:null,
  };
  commonFields.employee_id = empId;

  let newContractId;

  if(_isPendingAmend){
    // 계약예정: 기존 레코드 PUT 덮어쓰기
    const putBody = {
      ...commonFields,
      status:'계약예정', amended_from: origC.amended_from||null, is_voided_by_amend:false,
      signed_file_name: origC.signed_file_name||'', signed_file_data: origC.signed_file_data||'',
      consent_file_name: origC.consent_file_name||'', consent_file_data: origC.consent_file_data||'',
    };
    try {
      const res = await fetch(`../tables/contracts/${origId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(putBody)
      });
      const saved = await res.json();
      newContractId = saved.id || origId;
      const idx = allContracts.findIndex(x => x.id === origId);
      if(idx !== -1) allContracts[idx] = { ...allContracts[idx], ...putBody };
    } catch(e){
      console.error('[계약예정 수정 저장 오류]', e);
      toast('계약 수정 저장에 실패했습니다.', 'error');
      return;
    }
    // 계약예정 수정은 모달 없이 즉시 완료
    closeModal('contract-modal');
    await loadContracts(); await loadEmployees();
    renderContracts(); renderDashboard();
    toast('예정 계약이 수정되었습니다. ✔', 'success');
    return;
  }

  // ③ 신규 계약서 POST (수정 재발행)
  const newStatus = '서류미비'; // 날인본 없이 저장 → 발송 후 날인본 별도 첨부
  const newBody = {
    ...commonFields,
    id: 'cont' + Date.now(), status: newStatus,
    amended_from: origId, is_voided_by_amend: false,
    signed_file_name: origC.signed_file_name||'',
    signed_file_data: origC.signed_file_data||'',
    consent_file_name: origC.consent_file_name||'',
    consent_file_data: origC.consent_file_data||'',
  };
  newContractId = newBody.id;
  try {
    const saved = await fetch('../tables/contracts', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newBody)
    });
    const savedJson = await saved.json();
    newContractId = savedJson.id || newBody.id;
    allContracts.push({ ...newBody, id: newContractId });
  } catch(e){
    console.error('[재발행 계약서 저장 오류]', e);
    toast('재발행 계약서 저장에 실패했습니다.', 'error');
    return;
  }

  // ④ 발송 이력 기록
  const _emp = allEmployees.find(e => e.id === empId) || {};
  const _co  = allCompanies.find(x => x.id === coId)  || {};
  await _saveDispatchRecord({
    method:'수정재발행', status:'완료', recipient: _emp.phone||_emp.email||'',
    note: `계약 내용 수정 후 재발행 완료 (원본 ID: ${origId})`, contractId: newContractId,
  });

  // ⑤ 고객사 인앱 알림
  const _coRep = _co.representative ? `, ${_co.representative} 사장님` : '';
  const _fmtD  = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
  await _sendCompanyNotice({
    companyId:coId, companyName:_co.company_name||'', noticeType:'contract_voided',
    title:`[계약 파기] ${_emp.name||''} — 기존 계약이 파기되었습니다 (수정재발행)`,
    body:`안녕하세요${_coRep}.\n\n소속 근로자의 기존 근로계약이 수정재발행으로 인해 파기 처리되었습니다.\n\n■ 근로자: ${_emp.name||''}\n■ 파기된 계약 기간: ${_fmtD(origC.contract_start)}${origC.contract_end?' ~ '+_fmtD(origC.contract_end):''}\n■ 처리 일시: ${new Date().toLocaleString('ko-KR')}\n\n새 계약이 동시에 발행되었습니다. 자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.\n\n${_BRAND_SIG}`,
    contractId:origId, employeeId:empId, employeeName:_emp.name||'', contractEnd:origC.contract_end||'',
  });
  await _sendCompanyNotice({
    companyId:coId, companyName:_co.company_name||'', noticeType:'contract_amended',
    title:`[계약 수정재발행] ${_emp.name||''} — 수정된 새 계약이 발행되었습니다`,
    body:`안녕하세요${_coRep}.\n\n소속 근로자의 수정재발행 근로계약이 완료되었습니다.\n\n■ 근로자: ${_emp.name||''}\n■ 고용형태: ${cType}\n■ 새 계약 기간: ${_fmtD(start)}${end?' ~ '+_fmtD(end):' (기간 미정)'}\n■ 처리 일시: ${new Date().toLocaleString('ko-KR')}\n\n자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.\n\n${_BRAND_SIG}`,
    contractId:newContractId, employeeId:empId, employeeName:_emp.name||'', contractEnd:end,
  });

  // ⑥ 목록 갱신
  await loadContracts(); await loadEmployees();
  renderContracts(); renderDashboard();

  // ⑦ 계약서 조회 모달(contract-print-modal)을 그대로 재사용 — 수정 재발행 완료 배너 삽입 후 오픈
  window._isAmendMode = false;
  window._amendNewContractId = null;
  window._amendFromContractModal = true; // closeContractPrintModal 시 contract-modal도 함께 닫기
  _openAmendResultModal(newContractId);
}

/**
 * 수정 재발행 완료 후 계약서 조회 UI(contract-print-modal)를 열고
 * 툴바 상단에 "수정 재발행 완료" 안내 배너를 추가합니다.
 */
function _openAmendResultModal(newContractId){
  // 기존 배너 제거
  const oldBanner = document.getElementById('cpm-amend-banner');
  if(oldBanner) oldBanner.remove();

  // 저장 완료 배너 생성 후 툴바 위에 삽입
  const modal = document.getElementById('contract-print-modal');
  const toolbar = modal ? modal.querySelector('[style*="f8fafc"]') : null;
  if(toolbar){
    const banner = document.createElement('div');
    banner.id = 'cpm-amend-banner';
    banner.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 20px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-bottom:1.5px solid #86efac;flex-shrink:0;';
    banner.innerHTML = '<i class="fas fa-check-circle" style="color:#16a34a;font-size:16px;flex-shrink:0;"></i>'
      + '<span style="font-size:12.5px;font-weight:700;color:#15803d;">수정 재발행 완료</span>'
      + '<span style="font-size:12px;color:#166534;margin-left:4px;">— 기존 계약서는 파기 처리되었습니다. 아래에서 수정된 계약서를 발송해 주세요.</span>';
    toolbar.parentNode.insertBefore(banner, toolbar);
  }

  // contract-print-modal 열기 (기존 함수 그대로 재사용 — PDF·인쇄·알림톡·이메일·수동교부 포함)
  openContractPrintModal(newContractId);
}

// ──────────────────────────────────────────────────────────────────────────────
// finalAmendContract() — 하위호환용 stub (더 이상 사용 안 함, openAmendPreview로 통합)
// ──────────────────────────────────────────────────────────────────────────────
async function finalAmendContract(){
  // 더 이상 사용되지 않습니다. openAmendPreview()에서 즉시 저장 처리합니다.
  toast('수정 재발행은 수정완료 버튼 클릭 시 자동 저장됩니다.', 'warning');
}

// ── 계약 조회 모달 첨부 서류 섹션 렌더링 (업로드/삭제/미리보기/다운로드) ──
function _renderContractFilesSection(c){
  const existing = document.getElementById('ct-files-section');
  if(existing) existing.remove();
  const modalBody = document.querySelector('#contract-modal .modal-body');
  if(!modalBody || !c) return;

  const isVoided = !!(c.is_voided_by_amend);  // 수정재발행으로 파기된 계약서 여부

  const section = document.createElement('div');
  section.id = 'ct-files-section';
  section.className = 'ctf-section';

  // 파기된 계약서면 섹션 상단에 안내 배너 추가
  const voidedBannerHtml = isVoided ? `
    <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1.5px solid #fca5a5;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#991b1b;display:flex;align-items:center;gap:8px;">
      <i class="fas fa-ban" style="font-size:16px;color:#dc2626;flex-shrink:0;"></i>
      <div>
        <strong>파기된 계약서</strong> — 이 계약서는 수정 재발행으로 인해 파기 처리되었습니다.<br>
        <span style="font-size:11px;color:#b91c1c;">파기일시: ${c.voided_at ? new Date(c.voided_at).toLocaleString('ko-KR') : '—'}</span>
      </div>
    </div>` : '';

  // 재발행 계약서(amended_from 있음)이면 원본 참조 배너
  const amendedBannerHtml = (!isVoided && c.amended_from) ? `
    <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1.5px solid #7dd3fc;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#0369a1;display:flex;align-items:center;gap:8px;">
      <i class="fas fa-edit" style="font-size:16px;color:#0284c7;flex-shrink:0;"></i>
      <div>
        <strong>수정 재발행 계약서</strong> — 기존 계약서를 수정하여 재발행된 계약서입니다.
        <button onclick="viewContract('${c.amended_from}')" style="margin-left:8px;background:#0284c7;color:#fff;border:none;border-radius:5px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">원본 조회</button>
      </div>
    </div>` : '';

  section.innerHTML = `
    <div class="ctf-section-title">
      <i class="fas fa-paperclip" style="color:#6366f1;"></i>첨부 서류
    </div>
    ${voidedBannerHtml}
    ${amendedBannerHtml}
    ${_ctfMakeRow('signed',  c, '계약서 날인본',               'fas fa-file-signature', '#4f46e5', '#eff6ff', isVoided)}
    ${_ctfMakeRow('consent', c, '제3자 개인정보 제공 동의서 날인본', 'fas fa-shield-alt',    '#7c3aed', '#f5f3ff', false)}
  `;
  modalBody.appendChild(section);
}

// isVoidedFile=true: 날인본에 파기 워터마크 표시 (수정재발행으로 파기된 계약의 서명본)
function _ctfMakeRow(type, c, label, icon, color, bgColor, isVoidedFile=false){
  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
  const hasFile   = !!(c[dataField]);
  const fileName  = c[nameField] || '첨부파일';
  const isPdf     = hasFile && ((fileName.toLowerCase().endsWith('.pdf')) || (c[dataField]||'').startsWith('data:application/pdf'));
  const rowId     = `ctf-row-${type}`;
  const prevId    = `ctf-prev-${type}`;
  const inputId   = `ctf-input-${type}`;

  // 파기 날인본 배지
  const badgeHtml = hasFile
    ? (isVoidedFile
        ? `<span class="ctf-status-badge ctf-badge-voided"><i class="fas fa-ban"></i> 파기</span>`
        : `<span class="ctf-status-badge ctf-badge-ok"><i class="fas fa-check"></i> 등록됨</span>`)
    : `<span class="ctf-status-badge ctf-badge-none">미등록</span>`;

  const fileInfoHtml = hasFile
    ? `<div class="ctf-label-file" title="${_esc(fileName)}">${_esc(fileName)}</div>`
    : `<div class="ctf-label-none">업로드된 파일 없음</div>`;

  // 파기된 날인본: 미리보기/다운로드만 허용, 삭제·업로드 버튼 제거
  // 파기 파일이더라도 열람 가능하게 하되 편집 불가
  let actionBtns;
  if(isVoidedFile){
    actionBtns = hasFile ? `
      ${!isPdf ? `<button class="ctf-btn ctf-btn-preview-voided" onclick="_ctfTogglePreview('${prevId}',this)"><i class="fas fa-eye"></i> 원본 보기</button>` : ''}
      <button class="ctf-btn ctf-btn-download" onclick="_ctfDownload('${type}')"><i class="fas fa-download"></i> 다운로드</button>
    ` : `<span style="font-size:11.5px;color:#9ca3af;font-style:italic;">날인본 없음</span>`;
  } else if(hasFile) {
    actionBtns = `
      ${!isPdf ? `<button class="ctf-btn ctf-btn-preview" onclick="_ctfTogglePreview('${prevId}',this)"><i class="fas fa-eye"></i> 미리보기</button>` : ''}
      <button class="ctf-btn ctf-btn-download" onclick="_ctfDownload('${type}')"><i class="fas fa-download"></i> 다운로드</button>
      <button class="ctf-btn ctf-btn-delete"   onclick="_ctfDelete('${type}','${c.id}')"><i class="fas fa-trash-alt"></i> 삭제</button>
    `;
  } else {
    actionBtns = `<button class="ctf-btn ctf-btn-upload" onclick="document.getElementById('${inputId}').click()"><i class="fas fa-upload"></i> 업로드</button>`;
  }

  // 미리보기: 파기 파일이면 워터마크 오버레이 추가
  let previewHtml = '';
  if(hasFile && !isPdf){
    if(isVoidedFile){
      // 파기 워터마크 레이어
      previewHtml = `
        <div class="ctf-voided-wrap" id="${prevId}" style="display:none;">
          <img src="${c[dataField]}" alt="${_esc(label)}">
          <div class="ctf-voided-overlay">
            <div class="ctf-voided-stamp">파 기</div>
          </div>
        </div>
        <div class="ctf-voided-banner">
          <i class="fas fa-exclamation-triangle"></i>
          이 날인본은 수정 재발행으로 인해 <strong>파기</strong>된 계약서의 사본입니다. 법적 효력이 없습니다.
        </div>`;
    } else {
      previewHtml = `<div class="ctf-preview-wrap" id="${prevId}"><img src="${c[dataField]}" alt="${_esc(label)}"></div>`;
    }
  }

  const rowClass = isVoidedFile ? 'ctf-row ctf-row-voided' : 'ctf-row';

  return `
    <div class="${rowClass}" id="${rowId}">
      <div class="ctf-row-header">
        <div class="ctf-row-icon" style="background:${isVoidedFile ? '#fff5f5' : bgColor};color:${isVoidedFile ? '#dc2626' : color};"><i class="${icon}"></i></div>
        <div class="ctf-row-label">
          <div class="ctf-label-title">${label}${badgeHtml}</div>
          ${fileInfoHtml}
        </div>
        <div class="ctf-row-actions">${actionBtns}</div>
      </div>
      <div class="ctf-uploading" id="ctf-loading-${type}">
        <i class="fas fa-spinner fa-spin"></i> 업로드 중...
      </div>
      ${previewHtml}
      ${!isVoidedFile ? `<input type="file" id="${inputId}" accept="image/*,.pdf" style="display:none;" onchange="_ctfUpload('${type}','${c.id}',this)">` : ''}
    </div>`;
}

// ── 미리보기 토글 (일반 + 파기 워터마크 래퍼 모두 지원) ──
function _ctfTogglePreview(prevId, btn){
  const wrap = document.getElementById(prevId);
  if(!wrap) return;
  const shown = wrap.style.display === 'block';
  wrap.style.display = shown ? 'none' : 'block';
  // 파기 파일 버튼 vs 일반 버튼 레이블 분기
  const isVoidedBtn = btn.classList.contains('ctf-btn-preview-voided');
  if(shown){
    btn.innerHTML = isVoidedBtn
      ? '<i class="fas fa-eye"></i> 원본 보기'
      : '<i class="fas fa-eye"></i> 미리보기';
  } else {
    btn.innerHTML = '<i class="fas fa-eye-slash"></i> 닫기';
  }
}

// ── 파일 업로드 ──
async function _ctfUpload(type, contractId, inputEl){
  const file = inputEl.files[0];
  if(!file) return;

  const MAX = 10 * 1024 * 1024; // 10MB
  if(file.size > MAX){ toast('파일 크기는 10MB 이하만 허용됩니다.', 'error'); inputEl.value=''; return; }

  const loadingEl = document.getElementById(`ctf-loading-${type}`);
  if(loadingEl) loadingEl.style.display = 'flex';

  try{
    const base64 = await _ctfToBase64(file);
    const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
    const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
    const body = { [nameField]: file.name, [dataField]: base64 };

    await fetch(`../tables/contracts/${contractId}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });

    // 로컬 캐시 갱신
    const idx = allContracts.findIndex(x => x.id === contractId);
    if(idx !== -1){ allContracts[idx][nameField] = file.name; allContracts[idx][dataField] = base64; }

    toast('파일이 업로드되었습니다.', 'success');
    // 섹션 재렌더링
    const c = allContracts.find(x => x.id === contractId);
    if(c) _renderContractFilesSection(c);

    // ── 고객사 인앱 알림 발송 (날인본/동의서 업로드) ──
    {
      const _ufCo  = allCompanies.find(x => x.id === c?.company_id) || {};
      const _ufEmp = allEmployees.find(x => x.id === c?.employee_id) || {};
      const _coRep = _ufCo.representative ? `, ${_ufCo.representative} 사장님` : '';
      const _typeLabel = type === 'signed' ? '계약서 날인본' : '제3자 정보제공 동의서';
      if(c?.company_id){
        // 업로드 종류별 알림
        await _sendCompanyNotice({
          companyId  : c.company_id, companyName: _ufCo.company_name || '',
          noticeType : type === 'signed' ? 'contract_signed_uploaded' : 'contract_consent_uploaded',
          title      : `[서류 업로드] ${_ufEmp.name||''} — ${_typeLabel}이 업로드되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 서류가 업로드되었습니다.

■ 근로자: ${_ufEmp.name||''}
■ 업로드 서류: ${_typeLabel}
■ 파일명: ${file.name}
■ 업로드 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId : contractId,
          employeeId : c.employee_id, employeeName: _ufEmp.name || '',
          contractEnd: c.contract_end || '',
        });

        // 두 파일 모두 완비 시 → 계약 유효 전환 알림
        const _updatedC = allContracts.find(x => x.id === contractId);
        const _hasBoth = _updatedC?.signed_file_data && _updatedC?.consent_file_data;
        if(_hasBoth && c.status === '서류미비'){
          await _sendCompanyNotice({
            companyId  : c.company_id, companyName: _ufCo.company_name || '',
            noticeType : 'contract_fully_documented',
            title      : `[계약 유효 전환] ${_ufEmp.name||''} — 모든 서류 완비, 계약이 유효합니다`,
            body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 관련 서류가 모두 완비되어 계약이 유효 상태로 전환되었습니다.

■ 근로자: ${_ufEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${c.contract_start||''}${c.contract_end ? ' ~ ' + c.contract_end : ''}
■ 완비 서류: 계약서 날인본 + 제3자 정보제공 동의서
■ 전환 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
            contractId : contractId,
            employeeId : c.employee_id, employeeName: _ufEmp.name || '',
            contractEnd: c.contract_end || '',
          });
        }
      }
    }

  } catch(e){
    console.error('[파일 업로드 오류]', e);
    toast('업로드에 실패했습니다.', 'error');
  } finally{
    if(loadingEl) loadingEl.style.display = 'none';
    inputEl.value = '';
  }
}

// ── 파일 삭제 ──
async function _ctfDelete(type, contractId){
  const label = type === 'signed' ? '계약서 날인본' : '제3자 개인정보 제공 동의서 날인본';
  if(!confirm(`'${label}' 파일을 삭제하시겠습니까?`)) return;

  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';

  try{
    await fetch(`../tables/contracts/${contractId}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ [nameField]: '', [dataField]: '' })
    });

    // 로컬 캐시 갱신
    const idx = allContracts.findIndex(x => x.id === contractId);
    if(idx !== -1){ allContracts[idx][nameField] = ''; allContracts[idx][dataField] = ''; }

    toast('파일이 삭제되었습니다.', 'success');
    const c = allContracts.find(x => x.id === contractId);
    if(c) _renderContractFilesSection(c);

  } catch(e){
    toast('삭제에 실패했습니다.', 'error');
  }
}

// ── 파일 다운로드 ──
function _ctfDownload(type){
  const contractId = editId.contract;
  const c = allContracts.find(x => x.id === contractId);
  if(!c) return;
  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
  const a = document.createElement('a');
  a.href = c[dataField];
  a.download = c[nameField] || '첨부파일';
  a.click();
}

// ── File → Base64 변환 ──
function _ctfToBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Base64 파일 다운로드 헬퍼 (레거시 호환)
function _downloadContractFile(encodedData, encodedName){
  const a = document.createElement('a');
  a.href     = decodeURIComponent(encodedData);
  a.download = decodeURIComponent(encodedName);
  a.click();
}

// ═══════════════════════════════════════════════════
// ── 계약서 자동완성 프로세스 ──
// ═══════════════════════════════════════════════════

// 단계바 상태 업데이트
function setContractStep(step){
  [1,2,3].forEach(n=>{
    const el = document.getElementById(`ct-step-${n}`);
    const line = document.getElementById(`ct-step-line-${n}`);
    if(!el) return;
    el.className = 'ct-step' + (n < step ? ' done' : n === step ? ' active' : '');
    if(line) line.className = 'ct-step-line' + (n < step ? ' done' : '');
  });
}

// 폼 유효성 간단 검사
// 계약서 미리보기 모달 열기
function openContractPreview(){
  if(_ctValidate()) return;   // 유효성 검사 실패 시 배너+하이라이트 표시 후 중단
  setContractStep(2);
  // 파일 업로드 상태 초기화 (모달 열 때마다 리셋)
  _resetUploadState();
  // 계약서 HTML 생성
  let html;
  try { html = generateContractHTML(); } catch(e){ console.error('[openContractPreview] generateContractHTML 오류:', e); toast('계약서 미리보기 생성 중 오류가 발생했습니다.', 'error'); return; }
  document.getElementById('ct-print-area').innerHTML = html;
  // 탭 초기화
  showCpTab('preview');
  // 최종 등록 버튼 초기 비활성
  _updateFinalBtn();
  document.getElementById('contract-preview-modal').classList.add('open');
}

function closeContractPreview(){
  document.getElementById('contract-preview-modal').classList.remove('open');

  // ── 업로드 전용 모드 종료 처리 ──
  if(window._docUploadContractId){
    window._docUploadContractId = null;
    // 헤더 제목 원복
    const hdr = document.querySelector('#contract-preview-modal h3');
    if(hdr) hdr.innerHTML = '<i class="fas fa-file-contract"></i> 근로계약서 자동완성';
    // 뒤로 버튼 원복
    const backBtn2 = document.getElementById('cp-btn-back');
    if(backBtn2) backBtn2.textContent = '← 수정하기';
    // 최종 버튼 원복
    const finalBtn = document.getElementById('cp-btn-final');
    if(finalBtn){
      finalBtn.style.display = '';
      finalBtn.innerHTML = '<i class="fas fa-check-circle"></i> 최종 등록';
      finalBtn.onclick   = finalSaveContract;
      finalBtn.disabled  = true;
    }
    // 목록 새로고침 (계약 상태 변경 반영)
    loadContracts().then(() => { renderContracts(); renderDashboard(); });
    return;
  }

  setContractStep(1);

  // 최종 버튼 원복
  const finalBtn = document.getElementById('cp-btn-final');
  if(finalBtn){
    finalBtn.style.display = '';
    finalBtn.innerHTML = '<i class="fas fa-check-circle"></i> 최종 등록';
    finalBtn.onclick   = finalSaveContract;
    finalBtn.disabled  = true;
  }

  // 플래그 초기화
  window._isAmendMode = false;
  window._amendNewContractId = null;
}

function showCpTab(tab){
  document.getElementById('cp-body-preview').style.display = tab==='preview' ? '' : 'none';
  document.getElementById('cp-body-upload').style.display  = tab==='upload'  ? '' : 'none';
  document.getElementById('cp-tab-preview').className = 'contract-preview-tab' + (tab==='preview'?' active':'');
  document.getElementById('cp-tab-upload').className  = 'contract-preview-tab' + (tab==='upload'?' active':'');
  if(tab==='upload') setContractStep(3);
  else setContractStep(2);
}

// 최종 등록 버튼 활성화 조건 체크
function _updateFinalBtn(){
  const skip     = document.getElementById('cp-skip-upload')?.checked;
  const hasSigned  = !!window._contractSignedFile;
  const hasConsent = !!window._contractConsentFile;
  const btn = document.getElementById('cp-btn-final');
  // 업로드 전용 모드: 한 파일이라도 있으면 저장 가능
  if(window._docUploadContractId){
    if(btn) btn.disabled = !(hasSigned || hasConsent);
    return;
  }
  // 수정재발행 모드: 날인본(계약서)만 필수 / 일반 등록: 스킵이면 무조건 활성, 아니면 두 파일 모두 필요
  if(window._isAmendMode){
    if(btn) btn.disabled = !hasSigned;
  } else {
    if(btn) btn.disabled = !(skip || (hasSigned && hasConsent));
  }
}

// ── 계약서 날인본 핸들러 ──
function handleContractFileSelect(e){
  const file = e.target.files[0];
  if(file) _setContractFile(file);
}
function handleContractFileDrop(e){
  e.preventDefault();
  e.currentTarget.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if(file) _setContractFile(file);
}
function _setContractFile(file){
  window._contractSignedFile = file;
  document.getElementById('cp-upload-filename').textContent = file.name;
  document.getElementById('cp-upload-filesize').textContent = (file.size/1024).toFixed(1) + ' KB';
  document.getElementById('cp-upload-preview').classList.add('show');
  document.getElementById('cp-upload-zone').style.display = 'none';
  const chk = document.getElementById('cp-signed-check');
  if(chk) chk.style.display = '';
  _updateFinalBtn();
}
function clearContractUpload(){
  window._contractSignedFile = null;
  document.getElementById('cp-file-input').value = '';
  document.getElementById('cp-upload-preview').classList.remove('show');
  document.getElementById('cp-upload-zone').style.display = '';
  const chk = document.getElementById('cp-signed-check');
  if(chk) chk.style.display = 'none';
  _updateFinalBtn();
}

// ── 제3자 개인정보 제공 동의서 핸들러 ──
function handleConsentFileSelect(e){
  const file = e.target.files[0];
  if(file) _setConsentFile(file);
}
function handleConsentFileDrop(e){
  e.preventDefault();
  e.currentTarget.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if(file) _setConsentFile(file);
}
function _setConsentFile(file){
  window._contractConsentFile = file;
  document.getElementById('cp-consent-filename').textContent = file.name;
  document.getElementById('cp-consent-filesize').textContent = (file.size/1024).toFixed(1) + ' KB';
  document.getElementById('cp-consent-preview').classList.add('show');
  document.getElementById('cp-consent-zone').style.display = 'none';
  const chk = document.getElementById('cp-consent-check');
  if(chk) chk.style.display = '';
  _updateFinalBtn();
}
function clearConsentUpload(){
  window._contractConsentFile = null;
  document.getElementById('cp-consent-input').value = '';
  document.getElementById('cp-consent-preview').classList.remove('show');
  document.getElementById('cp-consent-zone').style.display = '';
  const chk = document.getElementById('cp-consent-check');
  if(chk) chk.style.display = 'none';
  _updateFinalBtn();
}

// 스킵 체크박스 변경 시
document.addEventListener('DOMContentLoaded',()=>{
  const skip = document.getElementById('cp-skip-upload');
  if(skip) skip.addEventListener('change', _updateFinalBtn);
});

// 계약 미리보기 모달을 열 때마다 파일 전역변수 초기화
function _resetUploadState(){
  window._contractSignedFile  = null;
  window._contractConsentFile = null;
  // UI 초기화
  ['cp-file-input','cp-consent-input'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  ['cp-upload-preview','cp-consent-preview'].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('show'); });
  ['cp-upload-zone','cp-consent-zone'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display=''; });
  ['cp-signed-check','cp-consent-check'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
  const skip=document.getElementById('cp-skip-upload'); if(skip) skip.checked=false;
}

// File → Base64 변환 헬퍼
function _fileToBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result); // data:mime;base64,xxx
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 최종 등록 (saveContract 호출)
async function finalSaveContract(){
  setContractStep(3);
  document.getElementById('contract-preview-modal').classList.remove('open');
  try { await saveContract(); } catch(e){ console.error('[finalSaveContract] saveContract 오류:', e); toast('저장 중 오류가 발생했습니다: ' + e.message, 'error'); }
}

/**
 * 업로드 전용 모드(_docUploadContractId) 전용 저장 함수.
 * 계약 폼 데이터 없이 파일(signed/consent)만 PATCH로 저장하고 계약 상태를 갱신한다.
 */
async function _saveDocUploadOnly(){
  const contractId = window._docUploadContractId;
  if(!contractId){ toast('계약 정보가 없습니다.', 'error'); return; }

  const c = allContracts.find(x => x.id === contractId);
  if(!c){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }

  const hasSigned  = !!window._contractSignedFile;
  const hasConsent = !!window._contractConsentFile;
  if(!hasSigned && !hasConsent){ toast('업로드할 파일을 선택해 주세요.', 'error'); return; }

  const finalBtn = document.getElementById('cp-btn-final');
  if(finalBtn){ finalBtn.disabled = true; finalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try{
    const MAX = 10 * 1024 * 1024;
    const body = {};

    if(hasSigned){
      if(window._contractSignedFile.size > MAX){ toast('날인본 파일 크기는 10MB 이하만 허용됩니다.', 'error'); return; }
      body.signed_file_name = window._contractSignedFile.name;
      body.signed_file_data = await _fileToBase64(window._contractSignedFile);
    }
    if(hasConsent){
      if(window._contractConsentFile.size > MAX){ toast('동의서 파일 크기는 10MB 이하만 허용됩니다.', 'error'); return; }
      body.consent_file_name = window._contractConsentFile.name;
      body.consent_file_data = await _fileToBase64(window._contractConsentFile);
    }

    // 파일 완비 여부 확인 (기존 파일 + 이번 업로드)
    const newSignedName  = body.signed_file_name  || c.signed_file_name  || '';
    const newConsentName = body.consent_file_name || c.consent_file_name || '';
    const bothComplete = !!(newSignedName && newConsentName);
    // 서류미비 계약이면서 두 파일 모두 완비 시 → 활성으로 전환
    if(c.status === '서류미비' && bothComplete){
      body.status = '활성';
    }

    await fetch(`../tables/contracts/${contractId}`, {
      method : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(body),
    });

    // 로컬 캐시 갱신
    const idx = allContracts.findIndex(x => x.id === contractId);
    if(idx !== -1){ Object.assign(allContracts[idx], body); }

    // 고객사 알림 발송
    const _co  = allCompanies.find(x => x.id === c.company_id) || {};
    const _emp = allEmployees.find(x => x.id === c.employee_id) || {};
    const _coRep = _co.representative ? `, ${_co.representative} 사장님` : '';
    if(c.company_id){
      if(hasSigned){
        await _sendCompanyNotice({
          companyId: c.company_id, companyName: _co.company_name || '',
          noticeType: 'contract_signed_uploaded',
          title: `[서류 업로드] ${_emp.name||''} — 계약서 날인본이 업로드되었습니다`,
          body:
`안녕하세요${_coRep}.

소속 근로자의 서류가 업로드되었습니다.

■ 근로자: ${_emp.name||''}
■ 업로드 서류: 계약서 날인본
■ 파일명: ${window._contractSignedFile?.name||''}
■ 업로드 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId, employeeId: c.employee_id, employeeName: _emp.name||'', contractEnd: c.contract_end||'',
        });
      }
      if(hasConsent){
        await _sendCompanyNotice({
          companyId: c.company_id, companyName: _co.company_name || '',
          noticeType: 'contract_consent_uploaded',
          title: `[서류 업로드] ${_emp.name||''} — 제3자 정보제공 동의서가 업로드되었습니다`,
          body:
`안녕하세요${_coRep}.

소속 근로자의 서류가 업로드되었습니다.

■ 근로자: ${_emp.name||''}
■ 업로드 서류: 제3자 정보제공 동의서
■ 파일명: ${window._contractConsentFile?.name||''}
■ 업로드 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId, employeeId: c.employee_id, employeeName: _emp.name||'', contractEnd: c.contract_end||'',
        });
      }
      if(bothComplete && c.status === '서류미비'){
        await _sendCompanyNotice({
          companyId: c.company_id, companyName: _co.company_name || '',
          noticeType: 'contract_fully_documented',
          title: `[계약 유효 전환] ${_emp.name||''} — 모든 서류 완비, 계약이 유효합니다`,
          body:
`안녕하세요${_coRep}.

소속 근로자의 계약 관련 서류가 모두 완비되어 계약이 유효 상태로 전환되었습니다.

■ 근로자: ${_emp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${c.contract_start||''}${c.contract_end ? ' ~ ' + c.contract_end : ''}
■ 완비 서류: 계약서 날인본 + 제3자 정보제공 동의서
■ 전환 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId, employeeId: c.employee_id, employeeName: _emp.name||'', contractEnd: c.contract_end||'',
        });
      }
    }

    toast('서류가 저장되었습니다. ✔', 'success');
    // 모달 닫기 (closeContractPreview 내부에서 renderContracts 새로고침 처리)
    closeContractPreview();

  } catch(e){
    console.error('[_saveDocUploadOnly]', e);
    toast('저장 중 오류가 발생했습니다: ' + e.message, 'error');
    if(finalBtn){ finalBtn.disabled = false; finalBtn.innerHTML = '<i class="fas fa-save"></i> 서류 저장'; }
  }
}

// ── 인쇄 ──
function printContract(){
  const html = document.getElementById('ct-print-area').innerHTML;
  const win = window.open('','_blank','width=960,height=800');
  const css = [
    '*{box-sizing:border-box;margin:0;padding:0;}',
    'body{font-family:\'Noto Sans KR\',sans-serif;font-size:13px;line-height:1.9;color:#1a1a1a;padding:30px 50px;max-width:840px;margin:0 auto;background:#fff;}',
    'h1{text-align:center;font-size:22px;font-weight:900;letter-spacing:6px;margin-bottom:4px;color:#0f172a;padding-bottom:8px;border-bottom:3px double #0f172a;}',
    '.doc-subtitle{text-align:center;font-size:12px;color:#64748b;margin-bottom:20px;margin-top:4px;}',
    '.doc-parties{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:18px;font-size:12.5px;line-height:1.8;}',
    '.doc-section{margin-bottom:16px;}',
    '.doc-section-title{font-size:13px;font-weight:800;color:#0f172a;background:#f1f5f9;border-left:4px solid #4f46e5;padding:5px 10px;margin-bottom:7px;border-radius:0 3px 3px 0;}',
    '.info-table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:12px;}',
    '.info-table th{background:#f8fafc;border:1px solid #cbd5e1;padding:6px 10px;font-weight:700;color:#374151;white-space:nowrap;width:30%;text-align:left;}',
    '.info-table td{border:1px solid #cbd5e1;padding:6px 10px;color:#1e293b;}',
    '.info-table tr.total-row th{background:#eff6ff;color:#1d4ed8;}',
    '.info-table tr.total-row td{background:#eff6ff;}',
    '.doc-note{font-size:11px;color:#64748b;margin-top:3px;padding-left:4px;line-height:1.6;}',
    '.doc-text{font-size:12.5px;margin:4px 0;line-height:1.9;}',
    '.doc-divider{border:none;border-top:1.5px dashed #cbd5e1;margin:14px 0;}',
    '.doc-insurance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px;}',
    '.insurance-item{border:1.5px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;font-size:12px;font-weight:600;color:#94a3b8;background:#f8fafc;}',
    '.insurance-item.active{border-color:#818cf8;color:#4f46e5;background:#eef2ff;}',
    '.ins-icon{display:block;font-size:14px;margin-bottom:1px;}',
    '.doc-sign-date{text-align:center;font-size:13px;margin:24px 0 16px;padding:10px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;color:#374151;line-height:1.9;}',
    '.doc-sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:0;}',
    '.doc-sign-box{border:1.5px solid #cbd5e1;border-radius:8px;padding:12px 14px;}',
    '.doc-sign-box .sign-title{font-size:12px;font-weight:800;color:#374151;margin-bottom:8px;text-align:center;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}',
    '.sign-info-table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:10px;}',
    '.sign-info-table th{background:#f8fafc;border:1px solid #e2e8f0;padding:4px 8px;font-weight:700;color:#374151;white-space:nowrap;width:30%;}',
    '.sign-info-table td{border:1px solid #e2e8f0;padding:4px 8px;color:#1e293b;}',
    '.sign-stamp-area{text-align:center;padding-top:2px;}',
    '.sign-stamp{width:56px;height:56px;border:2px dashed #cbd5e1;border-radius:50%;margin:0 auto 3px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;line-height:1.4;}',
    '.sign-label{font-size:10.5px;color:#94a3b8;}',
    '.highlight{font-weight:700;color:#1d4ed8;}',
    '@media print{@page{margin:18mm 16mm;}body{padding:0;font-size:12px;}.doc-section-title{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.info-table th{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.doc-sign{page-break-inside:avoid;}}'
  ].join('\n');
  const doc = '<!DOCTYPE html><html><he'+'ad><meta charset="UTF-8"><title>\uADFC\uB85C\uACC4\uC57D\uC11C</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">'
    + '<st'+'yle>'+css+'</st'+'yle>'
    + '</he'+'ad><bo'+'dy>'+html+'</bo'+'dy></ht'+'ml>';
  win.document.write(doc);
  win.document.close();
  setTimeout(()=>{ win.focus(); win.print(); }, 800);
}

// ── WORD(docx) 다운로드 ──
function downloadContractDocx(){
  // docx.js 라이브러리 동적 로드 후 생성
  if(!window.docx){
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js';
    s.onload = ()=>_buildDocx();
    document.head.appendChild(s);
  } else {
    _buildDocx();
  }
}

function _buildDocx(){
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, AlignmentType, BorderStyle, ShadingType,
          VerticalAlign, UnderlineType } = docx;

  const data = _collectContractData();
  const won = v => Number(v||0).toLocaleString('ko-KR')+'원';
  const FONT = '맑은 고딕';

  // ── 헬퍼 함수 ──
  const mkCell = (text, opts={}) => new TableCell({
    children:[new Paragraph({
      children:[new TextRun({text:String(text||''), bold:opts.bold||false, size:opts.size||22, font:FONT, color: opts.color||'000000'})],
      alignment: opts.align || AlignmentType.LEFT,
    })],
    shading: opts.shade ? {type:ShadingType.CLEAR, fill:'F0F4F8'} : undefined,
    margins:{top:80,bottom:80,left:120,right:120},
    width: opts.width ? {size:opts.width,type:WidthType.PERCENTAGE} : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
      bottom:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
      left:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
      right:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
    },
  });

  const infoRow = (label, value, highlightVal=false) => new TableRow({children:[
    mkCell(label, {bold:true, shade:true, width:32}),
    mkCell(value, {bold:highlightVal, color: highlightVal?'1D4ED8':'1E293B', width:68}),
  ]});

  const mkTable = (rows) => new Table({
    rows, width:{size:100,type:WidthType.PERCENTAGE},
    borders:{
      top:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
      bottom:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
      left:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
      right:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
      insideH:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
      insideV:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
    },
  });

  const para = (text, opts={}) => new Paragraph({
    children:[new TextRun({text:String(text||''), size:opts.size||22, bold:opts.bold||false, font:FONT, color:opts.color||'1A1A1A'})],
    alignment: opts.align || AlignmentType.LEFT,
    spacing:{after:opts.after!=null?opts.after:100, before:opts.before||0},
    indent: opts.indent ? {left:opts.indent} : undefined,
  });

  const heading = (text) => new Paragraph({
    children:[new TextRun({text, bold:true, size:23, font:FONT, color:'0F172A'})],
    spacing:{before:240, after:100},
    border:{bottom:{style:BorderStyle.SINGLE,size:6,color:'6366F1',space:4}},
    shading:{type:ShadingType.CLEAR, fill:'F1F5F9'},
    indent:{left:120},
  });

  const note = (text) => new Paragraph({
    children:[new TextRun({text:'※ '+text, size:19, font:FONT, color:'64748B'})],
    spacing:{after:80},
    indent:{left:60},
  });

  const contractDate = data.contractStart || new Date().toISOString().slice(0,10);

  // ── 동적 조항 번호 카운터 (Word 문서용) ──
  let _wArtNo = 0;
  const wart = (title) => `제${++_wArtNo}조 ${title}`;

  // 수습 조건
  const hasProbation = (data.contractType==='정규직 수습'||data.contractType==='계약직 수습') && data.probationMonths > 0;
  const _probBasisDocx = (data.probationBasis||'salary') === 'minwage'
    ? `최저임금의 ${data.probationPct}%`
    : (data.probationBasis === 'direct'
      ? '직접 입력'
      : `약정 보수의 ${data.probationPct}%`);
  let probEndDate = '';
  if(hasProbation && data.contractStart){
    const st = new Date(data.contractStart);
    st.setMonth(st.getMonth() + parseInt(data.probationMonths));
    st.setDate(st.getDate()-1);
    probEndDate = st.toISOString().slice(0,10);
  }

  // 계약기간 표현
  let contractPeriod = '';
  if(data.isDaily){
    contractPeriod = `${data.contractStart} ~ ${data.contractEnd||'별도 지정'} (일용직)`;
  } else if(data.contractType==='정규직'||data.contractType==='정규직 수습'){
    contractPeriod = `${data.contractStart}부터 기간의 정함 없음`;
  } else {
    contractPeriod = `${data.contractStart} ~ ${data.contractEnd||'미정'}`;
  }

  // 임금 행 조건부
  const salaryRows = [];
  if(!data.isDaily){
    if(data.annualSalary>0) salaryRows.push(infoRow('연봉', won(data.annualSalary)));
    salaryRows.push(infoRow('기본급', won(data.baseSalary), true));
    if(data.weeklyHol>0)     salaryRows.push(infoRow('주휴수당',          won(data.weeklyHol)));
    if(data.fixedOtPay>0)    salaryRows.push(infoRow('고정 연장근로수당', won(data.fixedOtPay)));
    if(data.fixedNightPay>0) salaryRows.push(infoRow('고정 야간근로수당', won(data.fixedNightPay)));
    if(data.fixedHolPay>0)   salaryRows.push(infoRow('고정 휴일근로수당', won(data.fixedHolPay)));
    if(data.positionAllowance>0) salaryRows.push(infoRow('직책수당', won(data.positionAllowance)));
    if(data.carMaintenance>0) salaryRows.push(infoRow('차량지원비', won(data.carMaintenance)));
    if(data.mealAllowance>0) salaryRows.push(infoRow('식대', won(data.mealAllowance)));
    if(data.researchAllowance>0) salaryRows.push(infoRow('연구보조비', won(data.researchAllowance)));
    if(data.siteAllowance>0) salaryRows.push(infoRow('현장수당', won(data.siteAllowance)));
    if(data.skillAllowance>0) salaryRows.push(infoRow('기술수당', won(data.skillAllowance)));
    if(data.licenseAllowance>0) salaryRows.push(infoRow('면허수당', won(data.licenseAllowance)));
    if(data.communicationAllowance>0) salaryRows.push(infoRow('통신비', won(data.communicationAllowance)));
    if(data.fitnessAllowance>0) salaryRows.push(infoRow('체력증진비', won(data.fitnessAllowance)));
    if(data.selfDevAllowance>0) salaryRows.push(infoRow('자기계발비', won(data.selfDevAllowance)));
    if(data.bookAllowance>0) salaryRows.push(infoRow('도서지원비', won(data.bookAllowance)));
    if(data.overseasAllowance>0) salaryRows.push(infoRow('해외근무수당', won(data.overseasAllowance)));
    if(data.otherAllowance>0) salaryRows.push(infoRow('기타수당', won(data.otherAllowance)));
    salaryRows.push(infoRow('월 약정임금 합계', won(data.monthlySalary), true));
    salaryRows.push(infoRow('통상시급', won(data.hourlyWage)+'/시간'));
  } else {
    salaryRows.push(infoRow('일급여', won(data.dailyWage), true));
  }
  salaryRows.push(infoRow('임금 지급일', data.payDay ? `매월 ${data.payDay}일` : '매월 말일'));
  salaryRows.push(infoRow('지급 방법', '근로자 명의 계좌 직접 입금'));

  const doc = new Document({
    creator:'대화인사노무파트너스',
    description:'표준 근로계약서',
    sections:[{
      properties:{
        page:{margin:{top:1000,bottom:1000,left:1200,right:1200}},
      },
      children:[
        // ── 제목 ──
        new Paragraph({
          children:[new TextRun({text:'근  로  계  약  서', bold:true, size:52, font:FONT, color:'0F172A'})],
          alignment:AlignmentType.CENTER, spacing:{after:60},
          border:{bottom:{style:BorderStyle.DOUBLE,size:8,color:'0F172A',space:6}},
        }),
        new Paragraph({
          children:[new TextRun({text:'( 표 준 근 로 계 약 서 )', size:22, font:FONT, color:'64748B'})],
          alignment:AlignmentType.CENTER, spacing:{after:280},
        }),

        // 전문
        new Paragraph({
          children:[
            new TextRun({text:data.companyName||'(회사명)', bold:true, size:22, font:FONT}),
            new TextRun({text:'(이하 "사업주"라 함)과 ', size:22, font:FONT}),
            new TextRun({text:data.empName||'(근로자)', bold:true, size:22, font:FONT}),
            new TextRun({text:'(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.', size:22, font:FONT}),
          ],
          spacing:{after:240},
          shading:{type:ShadingType.CLEAR, fill:'F8FAFC'},
          indent:{left:120, right:120},
          border:{
            top:{style:BorderStyle.SINGLE,size:4,color:'E2E8F0'},
            bottom:{style:BorderStyle.SINGLE,size:4,color:'E2E8F0'},
            left:{style:BorderStyle.SINGLE,size:4,color:'E2E8F0'},
            right:{style:BorderStyle.SINGLE,size:4,color:'E2E8F0'},
          },
        }),

        // ── 사업주 정보 ──
        heading('◼ 사업주 정보'),
        mkTable([
          infoRow('상호(사업장명)', data.companyName),
          infoRow('사업자등록번호', data.bizNumber),
          infoRow('소재지', data.companyAddr),
          infoRow('대표자(사용자)', data.representative),
        ]),

        // ── 근로자 정보 ──
        heading('◼ 근로자 정보'),
        mkTable([
          infoRow('성명', data.empName),
          infoRow('생년월일', data.idNumber ? data.idNumber.slice(0,6).replace(/(\d{2})(\d{2})(\d{2})/,'$1년 $2월 $3일생') : ''),
          infoRow('주소', data.address),
          infoRow('연락처', data.phone),
        ]),

        // ── 제1조 계약기간 ──
        heading(wart('【근로계약기간】')),
        mkTable([
          ...[infoRow('계약기간', contractPeriod)],
          ...(hasProbation ? [infoRow('수습기간', `${data.contractStart} ~ ${probEndDate} (${data.probationMonths}개월)\n수습임금 ${won(data.probationAmt)}/월 (${_probBasisDocx})`)] : []),
          infoRow('고용형태', data.contractType),
        ]),

        // ── 제2조 근무장소 ──
        heading(wart('【근무 장소 및 담당 업무】')),
        mkTable([
          infoRow('근무 장소', data.companyAddr||data.companyName),
          infoRow('담당 업무', data.jobDescription||'회사가 지정하는 업무'),
          ...(data.department ? [infoRow('부서', data.department)] : []),
          ...(data.position ? [infoRow('직책/직위', data.position)] : []),
        ]),

        // ── 제3조 근로시간 ──
        heading(wart('【근로시간 및 휴게시간】')),
        mkTable([
          infoRow('소정근로시간', `1일 ${data.hoursPerDay}시간 / 주 ${data.daysPerWeek}일 (주 ${data.weekHours}시간)`),
          infoRow('기본 근무시간', `${data.startTime} ~ ${data.endTime}`),
          infoRow('근무 요일', data.workDays||'월요일~금요일'),
          infoRow('휴게시간', data.breakInfo||'법정 기준에 따름'),
        ]),
        note('법정 근로시간(주 40시간)을 초과하는 연장근로는 당사자 합의 하에 실시하며, 근로기준법에 따라 가산 지급한다.'),

        // ── 제4조 임금 ──
        heading(wart('【임금】')),
        mkTable(salaryRows),
        note('제세공과금(4대 보험료, 소득세 등)은 관계법령에 따라 공제 후 지급한다.'),

        // ── 제5조 연차 (일용직 제외) ──
        ...(!data.isDaily ? [
          heading(wart('【연차 유급휴가】')),
          para(`연차 유급휴가는 근로기준법 제60조에 따라 부여하며, 1년간 80% 이상 출근한 근로자에게 ${data.annualLeave}일의 유급휴가를 준다.`),
          note('1년 미만 근로 또는 80% 미만 출근 시에는 1개월 개근 시 1일의 유급휴가를 부여한다.'),
        ] : []),

        // ── 제6조 계약서 교부 ──
        heading(wart('(근로계약서 교부)')),
        para('"사용자"는 근로계약을 체결함과 동시에 본 계약서를 사본하여 "근로자"의 교부요구와 관계없이 "근로자"에게 교부한다.'),

        // ── 제7조 기타 ──
        heading(wart('【기타】')),
        para('이 계약에 명시되지 않은 사항은 근로기준법 및 관계 법령, 사업장 취업규칙에서 정하는 바에 따른다.'),
       
        // ── 날짜 ──
        new Paragraph({
          children:[new TextRun({text:`위와 같이 근로계약을 체결하고 서명날인한다.    ${contractDate.replace(/-/g,'년 ').replace(/-/g,'월 ')}일`, size:22, font:FONT})],
          alignment:AlignmentType.CENTER, spacing:{before:400, after:240},
        }),

        // ── 서명란 ──
        new Table({
          rows:[
            new TableRow({children:[
              new TableCell({
                children:[
                  new Paragraph({children:[new TextRun({text:'사업주 (사용자)', bold:true, size:24, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:100}}),
                  new Paragraph({children:[new TextRun({text:`상호: ${data.companyName}`, size:21, font:FONT})], alignment:AlignmentType.CENTER}),
                  new Paragraph({children:[new TextRun({text:`주소: ${data.companyAddr}`, size:21, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:20}}),
                  new Paragraph({children:[new TextRun({text:`대표자: ${data.representative}`, size:21, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:120}}),
                  new Paragraph({children:[new TextRun({text:'(서명 또는 날인)', size:20, font:FONT, color:'94A3B8'})], alignment:AlignmentType.CENTER, spacing:{before:120}}),
                ],
                margins:{top:160,bottom:160,left:200,right:200},
                borders:{
                  top:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  bottom:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  left:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  right:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                },
              }),
              new TableCell({
                children:[
                  new Paragraph({children:[new TextRun({text:'근로자', bold:true, size:24, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:100}}),
                  new Paragraph({children:[new TextRun({text:`성명: ${data.empName}`, size:21, font:FONT})], alignment:AlignmentType.CENTER}),
                  new Paragraph({children:[new TextRun({text:`주소: ${data.address||''}`, size:21, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:20}}),
                  new Paragraph({children:[new TextRun({text:`연락처: ${data.phone||''}`, size:21, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:120}}),
                  new Paragraph({children:[new TextRun({text:'(서명 또는 날인)', size:20, font:FONT, color:'94A3B8'})], alignment:AlignmentType.CENTER, spacing:{before:120}}),
                ],
                margins:{top:160,bottom:160,left:200,right:200},
                borders:{
                  top:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  bottom:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  left:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  right:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                },
              }),
            ]}),
          ],
          width:{size:100,type:WidthType.PERCENTAGE},
          columnWidths:[4500,4500],
        }),

        para(''),
        new Paragraph({
          children:[new TextRun({text:'본 계약서는 고용노동부 표준근로계약서 양식에 따라 작성되었습니다.', size:18, font:FONT, color:'94A3B8', italics:true})],
          alignment:AlignmentType.CENTER, spacing:{before:200},
        }),
      ]
    }]
  });

  Packer.toBlob(doc).then(blob=>{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `근로계약서_${data.empName}_${data.contractStart||'미정'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toast('WORD 파일이 다운로드됐습니다. (고용노동부 표준 양식)');
  });
}

// ── 폼 데이터 수집 ──
function _collectContractData(){
  const coId = document.getElementById('ct-company')?.value;
  // 계약 체결 시점 기준 고객사 스냅샷 사용 (수정 모드: 계약 시작일 기준)
  const _ctStartForSnap = document.getElementById('ct-start')?.value || document.getElementById('ct-em-hire')?.value || '';
  const _ctTsForSnap = _ctStartForSnap ? new Date(_ctStartForSnap).getTime() : 0;
  const company = (coId && typeof getCompanySnapshotAt === 'function')
    ? (getCompanySnapshotAt(coId, _ctTsForSnap) || allCompanies.find(c=>c.id===coId) || {})
    : (allCompanies.find(c=>c.id===coId)||{});
  // 고용형태는 인사정보 기준으로 읽음: 수정 모드는 ct-edit-em-category, 신규는 ct-em-category
  const _isEditModeCD = !!editId.contract;
  const ctType = _isEditModeCD
    ? (document.getElementById('ct-edit-em-category')?.value||'정규직')
    : (document.getElementById('ct-em-category')?.value||'정규직');
  const isEdit = !!editId.contract;
  const isDaily = ctType==='일용직';
  const isProbation = ctType==='정규직 수습' || ctType==='계약직 수습';

  // 직원 정보 (신규 vs 수정)
  let empName='', phone='', address='', idNumber='', jobDescription='', department='', position='';
  if(isEdit){
    const existC = allContracts.find(x=>x.id===editId.contract);
    const existE = existC ? allEmployees.find(e=>e.id===existC.employee_id) : null;
    empName       = document.getElementById('ct-edit-emp-name')?.value || existE?.name || '';
    phone         = document.getElementById('ct-edit-em-phone')?.value || existE?.phone || '';
    address       = document.getElementById('ct-edit-em-address')?.value || existE?.address || '';
    idNumber      = document.getElementById('ct-edit-em-id')?.value || existE?.id_number || '';
    jobDescription= document.getElementById('ct-edit-em-job')?.value || existE?.job_description || '';
    department    = document.getElementById('ct-edit-em-dept')?.value || existE?.department || '';
    position      = document.getElementById('ct-edit-em-position')?.value || existE?.position || '';
  } else {
    empName       = document.getElementById('ct-em-name')?.value || '';
    phone         = document.getElementById('ct-em-phone')?.value || '';
    address       = document.getElementById('ct-em-address')?.value || '';
    idNumber      = document.getElementById('ct-em-id')?.value || '';
    jobDescription= document.getElementById('ct-em-job')?.value || '';
    department    = document.getElementById('ct-em-dept')?.value || '';
    position      = document.getElementById('ct-em-position')?.value || '';
  }

  // 근무 스케줄 파싱
  const schedule = (typeof getScheduleJSON==='function') ? getScheduleJSON() : [];
  const activeDays = schedule.filter(s=>s.active);
  const dayNames = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};

  // 요일별 시간 정리 (같은 시간대이면 대표만)
  const workDays = activeDays.map(s=>dayNames[s.day]||s.label).join(', ');
  const startTime = activeDays[0]?.start || '09:00';
  const endTime   = activeDays[0]?.end   || '18:00';

  // 휴게시간 상세 (일별)
  const breakSchedule = activeDays
    .filter(s=>s.brk_start && s.brk_end)
    .map(s=>{
      const [hs,ms] = (s.brk_start||'00:00').split(':').map(Number);
      const [he,me] = (s.brk_end  ||'00:00').split(':').map(Number);
      const mins = (he*60+me) - (hs*60+ms);
      return { day: s.day, label: dayNames[s.day]||s.label, brk_start: s.brk_start, brk_end: s.brk_end, brk_mins: mins };
    });

  // 대표 휴게시간 (첫 번째 활성 요일)
  const breakInfo = breakSchedule.length
    ? breakSchedule.map(b=>`${b.label} ${b.brk_start}~${b.brk_end} (${b.brk_mins}분)`).join(' / ')
    : '법정 기준에 따름';

  const hoursPerDay  = parseFloat(document.getElementById('ct-hours')?.value)||8;
  const daysPerWeek  = parseInt(document.getElementById('ct-days')?.value)||5;
  const weekHours    = Math.round(hoursPerDay * daysPerWeek * 10)/10;

  const monthlySalary = parseFloat(document.getElementById('ct-monthly-computed')?.textContent?.replace(/[^\d]/g,'')||0)||0;
  const weeklyHolText = document.getElementById('ct-weekly-hol-computed')?.textContent||'0원';

  // 수습 조건
  const probationMonths = isProbation ? parseInt(document.getElementById('ct-probation-months')?.value)||3 : 0;
  const probationPct    = isProbation ? parseFloat(document.getElementById('ct-probation-pct')?.value)||80 : 0;
  const probationAmt    = isProbation ? parseFloat(document.getElementById('ct-probation-amt')?.value)||0 : 0;
  const probationBasis  = isProbation ? (document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary') : 'salary';

  return {
    companyName:       company.company_name||'',
    bizNumber:         company.business_number||'',
    companyAddr:       company.address||'',
    representative:    company.representative||'',
    payDay:            company.pay_day||'',
    empName, phone, address, idNumber, jobDescription, department, position,
    contractStart:     document.getElementById('ct-start')?.value || document.getElementById('ct-em-hire')?.value || '',
    contractEnd:       document.getElementById('ct-end')?.value || document.getElementById('ct-em-expire')?.value || '',
    contractType:      ctType,
    hoursPerDay, daysPerWeek, weekHours,
    workDays, breakInfo, breakSchedule, startTime, endTime,
    baseSalary:        getAmountVal('ct-base'),
    dailyWage:         isDaily ? getAmountVal('ct-daily-wage') : 0,
    weeklyHol:         parseFloat(weeklyHolText.replace(/[^\d]/g,''))||0,
    fixedOtPay:        getAmountVal('ct-fixed-ot-pay'),
    fixedNightPay:     getAmountVal('ct-fixed-night-pay'),
    fixedHolPay:       getAmountVal('ct-fixed-hol-pay'),
    positionAllowance:   getAmountVal('ct-position'),
    carMaintenance:      getAmountVal('ct-car'),
    carPayType:          _getCTPayTypeVal('car'),
    remoteAreaAllowance: getAmountVal('ct-remote-area'),
    remoteAreaPayType:   'fixed', // 벽지수당 항상 통상임금 포함
    mealAllowance:       getAmountVal('ct-meal'),
    mealPayType:         _getCTPayTypeVal('meal'),
    researchAllowance:   getAmountVal('ct-research'),
    researchPayType:     _getCTPayTypeVal('research'),
    siteAllowance:       getAmountVal('ct-site')||0,
    skillAllowance:      getAmountVal('ct-skill')||0,
    licenseAllowance:    getAmountVal('ct-license')||0,
    communicationAllowance: getAmountVal('ct-communication')||0,
    communicationPayType:   _getCTPayTypeVal('communication'),
    fitnessAllowance:    getAmountVal('ct-fitness')||0,
    fitnessPayType:      _getCTPayTypeVal('fitness'),
    selfDevAllowance:    getAmountVal('ct-self-dev')||0,
    selfDevPayType:      _getCTPayTypeVal('self_dev'),
    bookAllowance:       getAmountVal('ct-book')||0,
    bookPayType:         _getCTPayTypeVal('book'),
    overseasAllowance:   getAmountVal('ct-overseas')||0,
    overseasPayType:     _getCTPayTypeVal('overseas'),
    customAllowances:    _collectCTCustomAllowances(),
    monthlySalary,
    annualSalary:      getAmountVal('ct-annual-sal'),
    hourlyWage:        getAmountVal('ct-hourly-wage')||0,
    annualLeave:       document.getElementById('ct-annual')?.value||15,
    note:              document.getElementById('ct-note')?.value||'',
    isDaily,
    probationMonths, probationPct, probationAmt, probationBasis,
    insEmployment: true,
    insIndustrial: true,
    insPension:    true,
    insHealth:     true,
  };
}

// ── 계약서 HTML 생성 ──
function generateContractHTML(){
  const d = _collectContractData();
  const won = v => Number(v||0).toLocaleString('ko-KR');
  const isFixedType = (type) => (type || 'fixed') === 'fixed';
  const row = (label, value, highlight=false) => {
    const cellContent = highlight
      ? '<strong class="highlight">' + (value||'—') + '</strong>'
      : (value||'—');
    return '<tr><th>' + label + '</th><td>' + cellContent + '</td></tr>';
  };
  const today = new Date().toISOString().slice(0,10);
  const todayKr = new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  const contractDateKr = d.contractStart ? new Date(d.contractStart).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'}) : todayKr;

  // 수습 조건 계산
  const probMonths = d.probationMonths || 0;
  const probPct    = d.probationPct || 0;
  const probAmt    = d.probationAmt || 0;
  const probBasis  = d.probationBasis || 'salary'; // 'salary' | 'minwage'
  const hasProbation = (d.contractType === '정규직 수습' || d.contractType === '계약직 수습') && probMonths > 0;

  // 수습 종료일 계산
  let probEndDate = '';
  if(hasProbation && d.contractStart){
    const st = new Date(d.contractStart);
    st.setMonth(st.getMonth() + parseInt(probMonths));
    st.setDate(st.getDate() - 1);
    probEndDate = st.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  }
  // 수습 임금 기준 표시 문구
  const probBasisLabel = probBasis === 'minwage'
    ? `최저임금의 ${probPct}%`
    : (probBasis === 'direct'
      ? '직접 입력'
      : `약정 보수의 ${probPct}%`);

  // 근무요일 정리 (연속 표현)
  const dayOrder = ['mon','tue','wed','thu','fri','sat','sun'];
  const dayNamesFull = {mon:'월요일',tue:'화요일',wed:'수요일',thu:'목요일',fri:'금요일',sat:'토요일',sun:'일요일'};
  const dayNamesShort = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};

  // 휴게시간 정리
  const breakRows = d.breakSchedule || [];
  let breakHTML = '';
  if(breakRows.length){
    breakHTML = breakRows.map(b=>`${dayNamesShort[b.day]||b.day} ${b.brk_start}~${b.brk_end} (${b.brk_mins||60}분)`).join(', ');
  } else {
    breakHTML = `1일 근로시간 4시간 경우 30분, 8시간인 경우 1시간 이상 (법정 기준에 따름)`;
  }

  // 계약기간 표현
  let contractPeriodHTML = '';
  if(d.isDaily){
    contractPeriodHTML = `${d.contractStart} ~ ${d.contractEnd || '별도 지정'} (일용직)`;
  } else if(d.contractType === '정규직' || d.contractType === '정규직 수습'){
    contractPeriodHTML = `${d.contractStart}부터 기간의 정함 없음`;
  } else {
    contractPeriodHTML = `${d.contractStart} ~ ${d.contractEnd || '미정'}`;
  }

  // 임금지급일
  const payDayStr = d.payDay ? ('매월 ' + d.payDay + '일') : '매월 말일';

  // 연봉 표현
  const annualStr = d.annualSalary && d.annualSalary > 0 ? ('연봉 ' + won(d.annualSalary) + '원') : '';

  // 생년월일 포맷 (백틱 중첩 방지용 사전 계산)
  const birthStr = (function(){
    if(!d.idNumber) return '';
    const s = String(d.idNumber).replace(/-/g,'');
    if(s.length < 6) return s;
    return s.slice(0,6).replace(/(\d{2})(\d{2})(\d{2})/, '$1년 $2월 $3일생');
  })();

  // ── 동적 조항 번호 카운터 ──
  let _artNo2 = 0;
  const art2 = (title) => `제${++_artNo2}조 ${title}`;
  
  return `
  <h1>근 로 계 약 서</h1>
  <div class="doc-subtitle">(표준근로계약서)</div>

  <div class="doc-parties">
    <p><strong>${d.companyName}</strong>(이하 "사업주"라 함)과 <strong>${d.empName || '(근로자명)'}</strong>(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">◼ 사업주 정보</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('상호(사업장명)', d.companyName)}
      ${row('사업자등록번호', d.bizNumber)}
      ${row('소재지(주소)', d.companyAddr)}
      ${row('대표자(사용자)', d.representative)}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">◼ 근로자 정보</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('성명', d.empName)}
      ${row('생년월일', birthStr)}
      ${row('주소', d.address)}
      ${row('연락처', d.phone)}
    </table>
  </div>

  <div class="doc-divider"></div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【근로계약기간】')}</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('계약기간', contractPeriodHTML)}
      ${d.contractEnd && !d.isDaily && d.contractType !== '정규직' && d.contractType !== '정규직 수습' ? row('계약 종료일', d.contractEnd) : ''}
      ${row('고용형태', d.contractType)}
      ${hasProbation ? row('수습기간', `${d.contractStart} ~ ${probEndDate} (${probMonths}개월)<br>수습 임금 ${won(probAmt)}원/월 · ${probBasisLabel}`) : ''}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【근무 장소 및 담당 업무】')}</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('근무 장소', d.companyAddr || d.companyName)}
      ${row('담당 업무', d.jobDescription || '회사가 지정하는 업무')}
      ${d.department ? row('부서', d.department) : ''}
      ${d.position ? row('직책/직위', d.position) : ''}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【근로시간 및 휴게시간】')}</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('소정근로시간', `1일 <strong>${d.hoursPerDay}시간</strong> / 주 <strong>${d.daysPerWeek}일</strong> (주 <strong>${d.weekHours}시간</strong>)`)}
      ${row('기본 근무시간', `${d.startTime} ~ ${d.endTime}`)}
      ${row('근무 요일', d.workDays || '월요일 ~ 금요일')}
      ${row('휴게시간', breakHTML)}
    </table>
    <div class="doc-note">※ 법정 근로시간(주 40시간)을 초과하는 연장근로는 당사자 합의 하에 실시하며, 근로기준법에 따라 가산하여 지급한다.</div>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【임금】')}</div>
    ${d.isDaily ? `
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('일급여', `<strong class="highlight">${won(d.dailyWage)}원</strong>`)}
      ${row('임금 지급일', payDayStr + ' (현금 또는 계좌이체)')}
    </table>
    ` : `
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${annualStr ? row('연봉', `<strong>${won(d.annualSalary)}원</strong>`) : ''}
      ${row('기본급', `<strong class="highlight">${won(d.baseSalary)}원</strong>`)}
      ${d.weeklyHol > 0     ? row('주휴수당',          `${won(d.weeklyHol)}원`)     : ''}
      ${d.fixedOtPay > 0    ? row('고정 연장근로수당', `${won(d.fixedOtPay)}원`)    : ''}
      ${d.fixedNightPay > 0 ? row('고정 야간근로수당', `${won(d.fixedNightPay)}원`) : ''}
      ${d.fixedHolPay > 0   ? row('고정 휴일근로수당', `${won(d.fixedHolPay)}원`)   : ''}
      ${d.positionAllowance > 0 ? row('직책수당', `${won(d.positionAllowance)}원`) : ''}
      ${d.carMaintenance > 0      && isFixedType(d.carPayType)               ? row('차량지원비',    `${won(d.carMaintenance)}원`)         : ''}
      ${d.remoteAreaAllowance > 0                                              ? row('벽지수당',     `${won(d.remoteAreaAllowance)}원`)    : ''}
      ${d.mealAllowance > 0       && isFixedType(d.mealPayType)              ? row('식대',         `${won(d.mealAllowance)}원`)          : ''}
      ${d.researchAllowance > 0   && isFixedType(d.researchPayType)          ? row('연구활동비',   `${won(d.researchAllowance)}원`)      : ''}
      ${d.siteAllowance > 0                                                    ? row('현장수당',     `${won(d.siteAllowance)}원`)          : ''}
      ${d.skillAllowance > 0                                                   ? row('기술수당',     `${won(d.skillAllowance)}원`)         : ''}
      ${d.licenseAllowance > 0                                                 ? row('면허수당',     `${won(d.licenseAllowance)}원`)       : ''}
      ${d.communicationAllowance > 0 && isFixedType(d.communicationPayType)  ? row('통신비',       `${won(d.communicationAllowance)}원`) : ''}
      ${d.fitnessAllowance > 0    && isFixedType(d.fitnessPayType)           ? row('체력증진비',   `${won(d.fitnessAllowance)}원`)       : ''}
      ${d.selfDevAllowance > 0    && isFixedType(d.selfDevPayType)           ? row('자기계발비',   `${won(d.selfDevAllowance)}원`)       : ''}
      ${d.bookAllowance > 0       && isFixedType(d.bookPayType)              ? row('도서지원비',   `${won(d.bookAllowance)}원`)          : ''}
      ${d.overseasAllowance > 0   && isFixedType(d.overseasPayType)          ? row('해외근무수당', `${won(d.overseasAllowance)}원`)      : ''}
      <tr class="total-row"><th>월 약정임금 합계</th><td><strong class="highlight">${won(d.monthlySalary)}원</strong></td></tr>
      ${row('통상시급', `${won(d.hourlyWage)}원/시간`)}
      ${row('임금 지급일', payDayStr)}
      ${row('지급 방법', '근로자 명의 계좌 직접 입금')}
    </table>
    `}
    <div class="doc-note">※ 제세공과금(4대 보험료, 소득세 등)은 관계법령에 따라 공제 후 지급한다.</div>
  </div>

  ${!d.isDaily ? `
  <div class="doc-section">
    <div class="doc-section-title">${art2('【연차 유급휴가】')}</div>
    <p class="doc-text">연차 유급휴가는 <strong>근로기준법 제60조</strong>에 따라 부여하며, 1년간 80% 이상 출근한 근로자에게 <strong>${d.annualLeave}일</strong>의 유급휴가를 준다.</p>
    <div class="doc-note">※ 1년 미만 근로 또는 80% 미만 출근 시에는 1개월 개근 시 1일의 유급휴가를 부여한다.</div>
  </div>` : ''}

  <div class="doc-section">
    <div class="doc-section-title">${art2('【근로계약서 교부】')}</div>
    <p class="doc-text">"사용자"는 근로계약을 체결함과 동시에 본 계약서를 사본하여 "근로자"의 교부요구와 관계없이 "근로자"에게 교부한다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【기타】')}</div>
    <p class="doc-text">기타 본 계약서상 명시되지 않은 사항은 당사의 단체협약, 취업규칙, 근로기준법 및 관계법령에서 정하는 바에 따른다.</p>
  </div>

  <div class="doc-sign-date">
    위와 같이 근로계약을 체결하고 서명날인한다.<br>
    <strong>${contractDateKr}</strong>
  </div>

  <div class="doc-sign">
    <div class="doc-sign-box">
      <div class="sign-title">사업주 (사용자)</div>
      <table class="sign-info-table">
        <tr><th>상호</th><td>${d.companyName}</td></tr>
        <tr><th>주소</th><td>${d.companyAddr}</td></tr>
        <tr><th>대표자</th><td>${d.representative}</td></tr>
      </table>
      <div class="sign-stamp-area">
        <div class="sign-stamp"></div>
        <div class="sign-label">(서명 또는 날인)</div>
      </div>
    </div>
    <div class="doc-sign-box">
      <div class="sign-title">근로자</div>
      <table class="sign-info-table">
        <tr><th>성명</th><td>${d.empName}</td></tr>
        <tr><th>주소</th><td>${d.address || ''}</td></tr>
        <tr><th>연락처</th><td>${d.phone || ''}</td></tr>
      </table>
      <div class="sign-stamp-area">
        <div class="sign-stamp"></div>
        <div class="sign-label">(서명 또는 날인)</div>
      </div>
    </div>
  </div>
  `;
}

// ══════════════════════════════════════════════════════════════
// ── 계약서 출력 전용 기능 (조회 모드에서 DB 데이터 직접 사용) ──
// ══════════════════════════════════════════════════════════════

/**
 * 조회 모드에서 "계약서 출력" 버튼 클릭 시 호출
 * allContracts / allEmployees / allCompanies 전역 배열로 데이터 수집
 */
function openContractPrintModal(contractId){
  if(!contractId){ toast('계약 정보를 찾을 수 없습니다.'); return; }
  const c   = allContracts.find(x=>x.id===contractId);
  const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
  // 계약 체결 시점 기준 고객사 스냅샷 사용 (계약서에 당시 고객사 정보 반영)
  const _printCtTs = c?.contract_start ? new Date(c.contract_start).getTime() : (c?.created_at||0);
  const co  = c ? (getCompanySnapshotAt(c.company_id, _printCtTs) || allCompanies.find(x=>x.id===c.company_id)) : null;
  if(!c||!emp||!co){ toast('계약·직원·고객사 정보를 불러올 수 없습니다.'); return; }

  // c.contract_type 우선 참조 (채용확정 생성 계약예정은 c.contract_type이 실제 유형)
  // 계약예정 상태인 경우 수습 카테고리 정규화 (예: '계약직 수습' → '계약직')
  const _ctTypeRaw = c.contract_type || emp.employment_category || '정규직';
  const _isPendingPrint = (c.status === '계약예정');
  const ctType = _isPendingPrint
    ? (_ctTypeRaw === '정규직 수습' ? '정규직' : _ctTypeRaw === '계약직 수습' ? '계약직' : _ctTypeRaw)
    : _ctTypeRaw;

  // 모달 타이틀·배지 업데이트
  const typeColor = {
    '정규직':'#2563eb','정규직 수습':'#0891b2','계약직':'#7c3aed',
    '계약직 수습':'#db2777','일용직':'#d97706'
  }[ctType]||'#374151';
  document.getElementById('cpm-title').textContent = `근로계약서 — ${emp.name}`;
  const badge = document.getElementById('cpm-type-badge');
  badge.textContent = ctType;
  badge.style.background = typeColor;

  // 계약서 HTML 생성 후 삽입
  let html;
  try{
    html = generateContractHTMLFromData(c, emp, co);
  } catch(err){
    console.error('[계약서 생성 오류] contractId:', contractId, err);
    toast('계약서 생성 중 오류가 발생했습니다. 계약 데이터를 확인해 주세요.\n(' + err.message + ')');
    return;
  }
  document.getElementById('cpm-doc-area').innerHTML = html;

  // 전역에 현재 계약 ID 저장 (PDF 다운로드·발송에서 사용)
  window._printingContractId  = contractId;
  window._printingEmpName     = emp.name;
  window._printingContractType= ctType;
  window._printingEmpId       = emp.id;
  window._printingEmpPhone    = emp.phone || '';
  window._printingEmpEmail    = emp.email || '';
  window._printingCompanyId   = co.id;
  window._printingCompanyName = co.company_name || '';
  window._printingContractStart = c.contract_start || '';
  window._printingContractEnd   = c.contract_end   || '';

  // ── 파기된 계약서 여부 확인 (status='파기' 또는 수정재발행으로 파기된 경우) ──
  const isVoided = (c.status === '파기') || !!(c.is_voided_by_amend);

  // ── 이메일 버튼: 이메일 등록 시에만 활성화 (파기 계약이면 비활성) ──
  const emailBtn = document.getElementById('cpm-email-btn');
  if(emailBtn){
    const hasEmail = !isVoided && !!(emp.email && emp.email.trim());
    emailBtn.disabled    = !hasEmail;
    emailBtn.style.opacity = hasEmail ? '1' : '0.45';
    emailBtn.style.cursor  = hasEmail ? 'pointer' : 'not-allowed';
    emailBtn.title = isVoided
      ? '파기된 계약서는 발송할 수 없습니다'
      : hasEmail
        ? `이메일 발송 (${emp.email})`
        : '이메일 미등록 — 직원 정보에 이메일을 먼저 등록하세요';
  }

  // ── 알림톡 버튼: 전화번호 등록 시에만 활성화 (파기 계약이면 비활성) ──
  const kakaoBtn = document.getElementById('cpm-kakao-btn');
  if(kakaoBtn){
    const hasPhone = !isVoided && !!(emp.phone && emp.phone.trim());
    kakaoBtn.disabled    = !hasPhone;
    kakaoBtn.style.opacity = hasPhone ? '1' : '0.45';
    kakaoBtn.style.cursor  = hasPhone ? 'pointer' : 'not-allowed';
    kakaoBtn.title = isVoided
      ? '파기된 계약서는 발송할 수 없습니다'
      : hasPhone
        ? `알림톡 발송 (${emp.phone})`
        : '전화번호 미등록 — 직원 정보에 전화번호를 먼저 등록하세요';
  }

  // ── 수동 교부 버튼: 파기 계약이면 비활성화 ──
  const manualBtn = document.getElementById('cpm-manual-btn');
  if(manualBtn){
    manualBtn.disabled   = isVoided;
    manualBtn.style.opacity = isVoided ? '0.45' : '1';
    manualBtn.style.cursor  = isVoided ? 'not-allowed' : 'pointer';
    manualBtn.title = isVoided ? '파기된 계약서는 발송할 수 없습니다' : '출력물 직접 배부 완료 처리';
  }

  // 모달 열기
  document.getElementById('contract-print-modal').classList.add('open');
}

function closeContractPrintModal(){
  const wasAmend = window._amendFromContractModal;
  document.getElementById('contract-print-modal').classList.remove('open');
  // 수정 재발행 완료 배너 제거
  const banner = document.getElementById('cpm-amend-banner');
  if(banner) banner.remove();
  // 수정 재발행 흐름에서 열린 경우 계약 수정 모달도 함께 닫기
  if(window._amendFromContractModal){
    window._amendFromContractModal = false;
    closeModal('contract-modal');
  }
  // 수정 재발행(또는 재계약/갱신) 후 목록과 대시보드 갱신
  if(wasAmend){
    loadContracts().then(() => {
      renderContracts();
      renderDashboard();
    });
  }
}

/** 계약서를 모달 없이 바로 새 창으로 열기 (수습관리 모달 등 중첩 방지용) */
function openContractInNewWindow(contractId){
  if(!contractId){ toast('계약 정보를 찾을 수 없습니다.'); return; }
  const c   = allContracts.find(x => x.id === contractId);
  const emp = c ? allEmployees.find(e => e.id === c.employee_id) : null;
  const co  = c ? allCompanies.find(x => x.id === c.company_id) : null;
  if(!c || !emp || !co){ toast('계약·직원·고객사 정보를 불러올 수 없습니다.'); return; }

  let html;
  try {
    html = generateContractHTMLFromData(c, emp, co);
  } catch(err){
    toast('계약서 생성 중 오류: ' + err.message);
    return;
  }

  const css = _getContractPrintCSS();
  const win = window.open('', '_blank', 'width=1000,height=820');
  if(!win){ toast('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.'); return; }
  const doc = '<!DOCTYPE html><html><he' + 'ad><meta charset="UTF-8">'
    + '<title>근로계약서 - ' + (emp.name || '') + '<\/title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">'
    + '<st' + 'yle>' + css + '<\/st' + 'yle>'
    + '<\/he' + 'ad><bo' + 'dy>' + html + '<\/bo' + 'dy><\/ht' + 'ml>';
  win.document.write(doc);
  win.document.close();
}

/** 계약서 인쇄 (새 창) */
function printContractDoc(){
  const html = document.getElementById('cpm-doc-area').innerHTML;
  const empName = window._printingEmpName || '근로자';
  const win = window.open('','_blank','width=1000,height=820');
  const css = _getContractPrintCSS();
  // 닫힘 태그를 문자열 연결로 분리 → 브라우저 HTML 파서 오작동 방지
  const doc = '<!DOCTYPE html><html><he'+'ad><meta charset="UTF-8">'
    + '<title>근로계약서 - ' + empName + '<\/title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">'
    + '<st'+'yle>' + css + '<\/st'+'yle>'
    + '<\/he'+'ad><bo'+'dy>' + html + '<\/bo'+'dy><\/ht'+'ml>';
  win.document.write(doc);
  win.document.close();
  setTimeout(()=>{ win.focus(); win.print(); }, 900);
}

/** PDF 저장 (html2canvas → jsPDF) */
async function downloadContractPdf(){
  const btn = document.getElementById('cpm-pdf-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 생성 중...'; }
  try {
    const docArea = document.getElementById('cpm-doc-area');
    // jsPDF / html2canvas는 이미 CDN으로 로드됨
    const { jsPDF } = window.jspdf;
    const canvas = await html2canvas(docArea, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW  = pageW;
    const imgH  = (canvas.height * imgW) / canvas.width;

    let posY = 0;
    let remainH = imgH;
    let page = 0;
    while(remainH > 0){
      if(page > 0) pdf.addPage();
      // 현재 페이지에 그릴 높이
      const drawH = Math.min(pageH, remainH);
      // 이미지의 y오프셋 (mm단위)
      pdf.addImage(imgData, 'PNG', 0, -posY, imgW, imgH);
      posY    += pageH;
      remainH -= pageH;
      page++;
    }

    const empName = window._printingEmpName || '근로자';
    const ctType  = window._printingContractType || '';
    const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
    pdf.save(`근로계약서_${empName}_${ctType}_${today}.pdf`);
    toast('PDF가 저장되었습니다.');
  } catch(e){
    console.error('[계약서 PDF]', e);
    toast('PDF 생성 중 오류가 발생했습니다. 인쇄(Ctrl+P)를 이용해 PDF로 저장하세요.');
  } finally {
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-file-pdf"></i> PDF 저장'; }
  }
}

// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// 근로계약서 발송 관리 페이지 — 데이터 로드 & 렌더링
// ══════════════════════════════════════════════════════

// 전역 캐시
window._contractDispatchList = window._contractDispatchList || [];
let _cdpPage = 1;
const _cdpPageSize = 10;

/** DB에서 전체 발송 이력 로드 (최신순) */
async function loadContractDispatchList(forceReload = false){
  if(!forceReload && window._contractDispatchList.length > 0) return;
  try {
    const res = await fetch('../tables/contract_dispatch?page=1&limit=1000');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // dispatched_at(ISO 문자열) 내림차순 → 없으면 created_at(ms) 내림차순
    const rows = (data.data || []).sort((a,b)=>{
      const ta = a.dispatched_at || a.created_at || '';
      const tb = b.dispatched_at || b.created_at || '';
      return tb.localeCompare(ta);
    });
    window._contractDispatchList = rows;
  } catch(e){
    console.error('[발송이력 로드]', e);
    window._contractDispatchList = [];
  }
}

/** 발송 관리 페이지 전체 렌더링 */
async function renderContractDispatchPage(){
  // 데이터 로드 (캐시가 없을 때만, 강제 갱신은 showPage에서 처리)
  if(window._contractDispatchList.length === 0) await loadContractDispatchList(true);

  // 필터 값 수집
  const filterMethod  = document.getElementById('cdp-filter-method')?.value  || '';
  const filterStatus  = document.getElementById('cdp-filter-status')?.value  || '';
  const filterCompany = document.getElementById('cdp-filter-company')?.value || '';
  const filterDateFrom= document.getElementById('cdp-filter-date-from')?.value || '';  // 'YYYY-MM-DD'
  const filterDateTo  = document.getElementById('cdp-filter-date-to')?.value   || '';  // 'YYYY-MM-DD'
  const searchKw      = (document.getElementById('cdp-search')?.value || '').trim().toLowerCase();

  // 고객사 필터 옵션 동적 생성 (최초 렌더링 시)
  const coSel = document.getElementById('cdp-filter-company');
  if(coSel && coSel.options.length <= 1){
    const uniqueCompanies = [...new Map(
      window._contractDispatchList.map(r=>[r.company_id, r.company_name])
    ).entries()].sort((a,b)=>(a[1]||'').localeCompare(b[1]||'','ko'));
    uniqueCompanies.forEach(([id, name])=>{
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = name || id;
      coSel.appendChild(opt);
    });
  }

  // 필터링
  const filtered = window._contractDispatchList.filter(r => {
    if(filterMethod  && r.dispatch_method  !== filterMethod)  return false;
    if(filterStatus  && r.dispatch_status  !== filterStatus)  return false;
    if(filterCompany && r.company_id       !== filterCompany) return false;
    // 기간 필터: dispatched_at (ISO 문자열 'YYYY-MM-DDT...' 앞 10자리로 비교)
    if(filterDateFrom || filterDateTo){
      const recDate = (r.dispatched_at || r.created_at || '').slice(0, 10); // 'YYYY-MM-DD'
      if(filterDateFrom && recDate < filterDateFrom) return false;
      if(filterDateTo   && recDate > filterDateTo)   return false;
    }
    if(searchKw){
      const hay = `${r.employee_name||''} ${r.recipient||''} ${r.company_name||''}`.toLowerCase();
      if(!hay.includes(searchKw)) return false;
    }
    return true;
  }).sort((a,b)=>((b.dispatched_at||b.created_at||'')).localeCompare((a.dispatched_at||a.created_at||'')));

  // 레코드 수
  const countEl = document.getElementById('cdp-record-count');
  if(countEl) countEl.textContent = `총 ${filtered.length.toLocaleString('ko-KR')}건`;

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / _cdpPageSize));
  if(_cdpPage > totalPages) _cdpPage = totalPages;
  const pageData = filtered.slice((_cdpPage-1)*_cdpPageSize, _cdpPage*_cdpPageSize);

  // 테이블 렌더링
  const tbody = document.getElementById('cdp-tbody');
  if(!tbody) return;

  if(filtered.length === 0){
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#9ca3af;">
      <i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>
      발송 이력이 없습니다.
    </td></tr>`;
    document.getElementById('cdp-pagination').innerHTML = '';
    return;
  }

  const fmtDt = ts => {
    if(!ts) return '-';
    // ISO 문자열("2026-05-19T10:30:00.000Z") 또는 ms 숫자 모두 처리
    const d = new Date(ts);
    if(isNaN(d.getTime())) return '-';
    return d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };

  const methodBadge = m => {
    const cfg = {
      '알림톡' : { bg:'#fef9c3', color:'#713f12', icon:'M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z', isSvg:true },
      '이메일' : { bg:'#dbeafe', color:'#1e40af', fa:'fa-envelope' },
      '수동배부': { bg:'#d1fae5', color:'#065f46', fa:'fa-hand-holding' },
    };
    const c = cfg[m] || { bg:'#f3f4f6', color:'#374151', fa:'fa-question' };
    const icon = c.isSvg
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="${c.color}"><path d="${c.icon}"/></svg>`
      : `<i class="fas ${c.fa}" style="font-size:11px;"></i>`;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;">${icon}${m}</span>`;
  };

  const statusBadge = s => {
    const cfg = {
      '완료': { bg:'#dcfce7', color:'#166534', fa:'fa-check-circle' },
      '실패': { bg:'#fee2e2', color:'#991b1b', fa:'fa-times-circle' },
      '대기': { bg:'#e0e7ff', color:'#3730a3', fa:'fa-clock' },
    };
    const c = cfg[s] || { bg:'#f3f4f6', color:'#374151', fa:'fa-circle' };
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:700;">
      <i class="fas ${c.fa}" style="font-size:10px;"></i>${s}
    </span>`;
  };

  const typeBadge = t => {
    const cfg = {
      '정규직'      :{ bg:'#dbeafe',color:'#1e40af' },
      '정규직 수습' :{ bg:'#e0f2fe',color:'#075985' },
      '계약직'      :{ bg:'#ede9fe',color:'#5b21b6' },
      '계약직 수습' :{ bg:'#fce7f3',color:'#9d174d' },
      '일용직'      :{ bg:'#fef3c7',color:'#92400e' },
    };
    const c = cfg[t] || { bg:'#f3f4f6',color:'#374151' };
    return `<span style="background:${c.bg};color:${c.color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">${t||'-'}</span>`;
  };

  tbody.innerHTML = pageData.map((r, idx) => {
    const rowBg = idx % 2 === 0 ? '' : 'background:#fafafa;';
    return `<tr style="${rowBg}border-bottom:1px solid #f3f4f6;transition:background .1s;"
      onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${idx%2===0?'':'#fafafa'}'">
      <td style="padding:9px 12px;color:#374151;white-space:nowrap;">${fmtDt(r.dispatched_at)}</td>
      <td style="padding:9px 12px;font-weight:600;color:#1a1a2e;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.company_name||''}">${r.company_name||'-'}</td>
      <td style="padding:9px 12px;font-weight:700;color:#4f46e5;">${r.employee_name||'-'}</td>
      <td style="padding:9px 12px;">${typeBadge(r.contract_type)}</td>
      <td style="padding:9px 12px;text-align:center;">${methodBadge(r.dispatch_method)}</td>
      <td style="padding:9px 12px;text-align:center;">${statusBadge(r.dispatch_status)}</td>
      <td style="padding:9px 12px;font-size:12px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.recipient||''}">${r.recipient||'-'}</td>
      <td style="padding:9px 12px;font-size:12px;color:#6b7280;">${_resolveAdminName(r.dispatched_by)||'-'}</td>
      <td style="padding:9px 12px;text-align:center;white-space:nowrap;">${_cdpAttachBtn(r.contract_id)}</td>
    </tr>`;
  }).join('');

  // 페이지네이션 렌더링
  _renderCdpPagination(totalPages, filtered);
}

/* ─────────────────────────────────────────────────────────────────
   _cdpAttachBtn(contractId)
   발송 이력 행의 계약서 미리보기 버튼 HTML 반환
   → openContractPrintModal(contractId) 호출 (자동완성 근로계약서)
   ─────────────────────────────────────────────────────────────── */
function _cdpAttachBtn(contractId){
  if(!contractId) return `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;
  const c = (allContracts||[]).find(x => x.id === contractId);
  if(!c) return `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;
  return `<button onclick="event.stopPropagation();openContractPrintModal('${contractId}')"
    style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;
           border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;font-size:11.5px;
           font-weight:600;cursor:pointer;white-space:nowrap;transition:opacity .15s;"
    onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'"
    title="근로계약 조건에 따라 자동완성된 계약서 미리보기">
    <i class="fas fa-file-contract" style="font-size:10px;"></i>미리보기
  </button>`;
}

/** 요약 카드 */
/** 페이지네이션 */
function _renderCdpPagination(totalPages, filtered){
  const el = document.getElementById('cdp-pagination');
  if(!el) return;
  if(totalPages <= 1){ el.innerHTML=''; return; }

  const btnStyle = (active, disabled) => `
    min-width:32px;height:32px;padding:0 10px;border-radius:6px;
    border:1px solid ${active?'#6366f1':'#e5e7eb'};
    background:${active?'#6366f1':'#fff'};
    color:${active?'#fff':'#374151'};
    font-size:13px;font-family:inherit;font-weight:${active?700:400};
    cursor:${disabled?'not-allowed':'pointer'};
    opacity:${disabled?'0.35':'1'};
    transition:background .15s,border-color .15s;
  `;
  const btn = (label, page, disabled=false, active=false) =>
    `<button onclick="_cdpGoPage(${page})" ${disabled?'disabled':''} style="${btnStyle(active,disabled)}">${label}</button>`;

  let html = '';
  // 이전
  html += btn('&lsaquo;', _cdpPage-1, _cdpPage===1);
  // 페이지 번호: 현재 기준 앞뒤 2개씩, 최대 5개
  const half  = 2;
  let   start = Math.max(1, _cdpPage - half);
  let   end   = Math.min(totalPages, start + half*2);
  if(end - start < half*2) start = Math.max(1, end - half*2);
  if(start > 1){
    html += btn(1, 1);
    if(start > 2) html += `<span style="padding:0 4px;color:#9ca3af;font-size:13px;">…</span>`;
  }
  for(let i=start; i<=end; i++) html += btn(i, i, false, i===_cdpPage);
  if(end < totalPages){
    if(end < totalPages-1) html += `<span style="padding:0 4px;color:#9ca3af;font-size:13px;">…</span>`;
    html += btn(totalPages, totalPages);
  }
  // 다음
  html += btn('&rsaquo;', _cdpPage+1, _cdpPage===totalPages);
  el.innerHTML = html;
}
function _cdpGoPage(p){
  _cdpPage = p;
  renderContractDispatchPage();
}

// ══════════════════════════════════════════════════════
// 근로계약서 미발송 관리
// ══════════════════════════════════════════════════════

let _cdpUnsentYM = null; // 현재 선택된 {year, month} (입사 년월 기준)

/**
 * 미발송 계약서 목록 반환
 * 조건: is_draft=false + 필수항목 완비 + contract_dispatch 발송 이력 없음
 * year/month: 계약 시작일(contract_start) 기준 년월 필터 (null 이면 전체)
 */
function _cdpGetUnsentContracts(year, month){
  // 발송 이력에 있는 contract_id 집합
  const sentIds = new Set(
    (window._contractDispatchList || []).map(r => r.contract_id).filter(Boolean)
  );

  return allContracts.filter(c => {
    // 임시저장 제외
    if(c.is_draft) return false;
    // 취소·해지·파기 상태 제외 (수정재발행으로 파기된 계약 포함)
    if(c.status === '취소' || c.status === '해지' || c.status === '파기') return false;
    if(c.is_voided_by_amend) return false;
    // 필수항목 완비 여부: contract_start, employee_id, company_id, contract_type 존재
    if(!c.contract_start || !c.employee_id || !c.company_id || !c.contract_type) return false;
    // 이미 발송 이력 있으면 제외
    if(sentIds.has(c.id)) return false;
    // 년월 필터 (contract_start 앞 7자리 'YYYY-MM' 기준)
    if(year !== undefined && month !== undefined){
      const ym = (c.contract_start || '').slice(0, 7); // 'YYYY-MM'
      const targetYM = `${year}-${String(month).padStart(2,'0')}`;
      if(ym !== targetYM) return false;
    }
    return true;
  });
}

/** 입사 년월 탭 렌더 */
function renderCdpUnsentMonthTabs(){
  const wrap = document.getElementById('cdp-unsent-month-tabs');
  if(!wrap) return;

  // 미발송 계약 전체를 가져와 년월별로 그룹핑
  const allUnsent = _cdpGetUnsentContracts();
  const ymMap = new Map();
  allUnsent.forEach(c => {
    const ym = (c.contract_start || '').slice(0, 7);
    if(!ym) return;
    const [y, m] = ym.split('-').map(Number);
    const key = `${y}-${String(m).padStart(2,'0')}`;
    if(!ymMap.has(key)) ymMap.set(key, { year: y, month: m, count: 0 });
    ymMap.get(key).count++;
  });

  const ymList = [...ymMap.values()]
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

  // 총 미발송 건수 배지 업데이트
  const totalBadge = document.getElementById('cdp-unsent-total-badge');
  if(totalBadge) totalBadge.textContent = allUnsent.length;

  if(!ymList.length){
    wrap.innerHTML = '';
    _renderCdpUnsentAllClear(true);
    return;
  }

  // 현재 선택 년월이 목록에 없으면 최신으로 초기화
  const inList = _cdpUnsentYM && ymList.some(x => x.year === _cdpUnsentYM.year && x.month === _cdpUnsentYM.month);
  if(!inList) _cdpUnsentYM = { ...ymList[0] };

  wrap.innerHTML = ymList.map(ym => {
    const isActive = _cdpUnsentYM && ym.year === _cdpUnsentYM.year && ym.month === _cdpUnsentYM.month;
    return `<div class="cdp-month-tab${isActive ? ' active' : ''}"
      onclick="cdpSelectUnsentYM(${ym.year},${ym.month})">
      ${ym.year}년 ${String(ym.month).padStart(2,'0')}월
      <span class="cdp-tab-badge unsent">${ym.count}</span>
    </div>`;
  }).join('');
}

function cdpSelectUnsentYM(year, month){
  _cdpUnsentYM = { year, month };
  renderCdpUnsentMonthTabs();
  renderCdpUnsentList();
}

function _renderCdpUnsentAllClear(show){
  const msg      = document.getElementById('cdp-unsent-all-clear');
  const tblWrap  = document.getElementById('cdp-unsent-table-wrap');
  const sendAll  = document.getElementById('cdp-unsent-send-all-btn');
  if(msg)     msg.style.display     = show ? '' : 'none';
  if(tblWrap) tblWrap.style.display = show ? 'none' : '';
  if(sendAll) sendAll.disabled      = show;
}

/** 미발송 목록 테이블 렌더 */
function renderCdpUnsentList(){
  const tbody = document.getElementById('cdp-unsent-tbody');
  if(!tbody) return;

  if(!_cdpUnsentYM){ _renderCdpUnsentAllClear(true); return; }

    const list = _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month)
    .sort((a,b)=>{
      const na = (allEmployees.find(e=>e.id===a.employee_id)||{}).name||'';
      const nb = (allEmployees.find(e=>e.id===b.employee_id)||{}).name||'';
      return na.localeCompare(nb, 'ko');
    });

  if(!list.length){ _renderCdpUnsentAllClear(true); return; }
  _renderCdpUnsentAllClear(false);

  tbody.innerHTML = list.map((c, idx) => {
    const emp = allEmployees.find(e => e.id === c.employee_id) || {};
    const co  = allCompanies.find(x => x.id === c.company_id)  || {};
    const cat = emp.employment_category || c.contract_type || '-';
    const phone    = emp.phone || '';
    const email    = emp.email || '';
    const hasPhone = !!(phone.trim());
    const hasEmail = !!(email.trim());
    const kakaoStyle = hasPhone
      ? 'background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    const emailStyle = hasEmail
      ? 'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    return `<tr id="cdp-urow-${idx}">
      <td style="font-weight:700;color:#1f2937;">${emp.name || '-'}</td>
      <td><span class="badge ${empCatBadge(cat)}" style="font-size:10.5px;padding:2px 7px;">${cat}</span></td>
      <td style="font-size:12px;color:#374151;">${co.company_name || '-'}</td>
      <td style="font-size:12px;color:#6b7280;">${c.contract_start || '-'}</td>
      <td style="font-size:12px;color:#6b7280;">${phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="font-size:12px;">${hasEmail ? `<span style="color:#374151;">${email}</span>` : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button onclick="cdpUnsentKakao('${c.id}')" ${hasPhone ? '' : 'disabled'}
          style="${kakaoStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:3px;display:inline-flex;align-items:center;gap:4px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡
        </button>
        <button onclick="cdpUnsentEmail('${c.id}')" ${hasEmail ? '' : 'disabled'}
          style="${emailStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:3px;">
          ✉ 이메일
        </button>
        <button onclick="cdpUnsentManual('${c.id}')"
          style="background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;">
          ✔ 수동교부
        </button>
      </td>
    </tr>`;
  }).join('');
}

/** 개별 알림톡 발송 */
async function cdpUnsentKakao(contractId){
  const c   = allContracts.find(x => x.id === contractId);
  const emp = c ? allEmployees.find(e => e.id === c.employee_id) : null;
  const co  = c ? allCompanies.find(x => x.id === c.company_id)  : null;
  if(!c || !emp || !co){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if(!emp.phone){ toast(`${emp.name} — 전화번호가 등록되어 있지 않습니다.`, 'error'); return; }
  if(!confirm(`[알림톡 발송]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n알림톡으로 발송하시겠습니까?\n\n수신 번호: ${emp.phone}`)) return;
  try{
    await _saveDispatchRecord({ method:'알림톡', status:'완료', recipient: emp.phone,
      note:`미발송 목록 알림톡 — ${emp.name}`, contractId });
    toast(`✅ ${emp.name} 알림톡 발송 완료`, 'success');
    await _cdpRefreshUnsent();
  } catch(e){ toast('발송 중 오류가 발생했습니다.', 'error'); }
}

/** 개별 이메일 발송 */
async function cdpUnsentEmail(contractId){
  const c   = allContracts.find(x => x.id === contractId);
  const emp = c ? allEmployees.find(e => e.id === c.employee_id) : null;
  const co  = c ? allCompanies.find(x => x.id === c.company_id)  : null;
  if(!c || !emp || !co){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if(!emp.email){ toast(`${emp.name} — 이메일이 등록되어 있지 않습니다.`, 'error'); return; }
  if(!confirm(`[이메일 발송]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n이메일로 발송하시겠습니까?\n\n수신 주소: ${emp.email}`)) return;
  try{
    await _saveDispatchRecord({ method:'이메일', status:'완료', recipient: emp.email,
      note:`미발송 목록 이메일 — ${emp.name}`, contractId });
    toast(`✅ ${emp.name} 이메일 발송 완료`, 'success');
    await _cdpRefreshUnsent();
  } catch(e){ toast('발송 중 오류가 발생했습니다.', 'error'); }
}

/** 수동 교부 완료 */
async function cdpUnsentManual(contractId){
  const c   = allContracts.find(x => x.id === contractId);
  const emp = c ? allEmployees.find(e => e.id === c.employee_id) : null;
  const co  = c ? allCompanies.find(x => x.id === c.company_id)  : null;
  if(!c || !emp || !co){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }
  if(!confirm(`[수동 교부 완료]\n\n${emp.name} (${co.company_name}) 님의 근로계약서를\n출력하여 직접 교부하셨습니까?\n\n확인 시 수동교부 완료 이력이 등록됩니다.`)) return;
  try{
    await _saveDispatchRecord({ method:'수동배부', status:'완료', recipient:'직접배부',
      note:`미발송 목록 수동교부 — ${emp.name}`, contractId });
    toast(`✅ ${emp.name} 수동 교부 완료 처리됐습니다.`, 'success');
    await _cdpRefreshUnsent();
  } catch(e){ toast('처리 중 오류가 발생했습니다.', 'error'); }
}

/** 일괄 알림톡 발송 */
async function cdpSendAllKakao(){
  if(!_cdpUnsentYM) return;
  const list = _cdpGetUnsentContracts(_cdpUnsentYM.year, _cdpUnsentYM.month)
    .filter(c => { const emp = allEmployees.find(e => e.id === c.employee_id); return emp && emp.phone; });
  if(!list.length){ toast('알림톡 발송 가능한 대상이 없습니다. (전화번호 미등록)', 'warning'); return; }
  if(!confirm(`[일괄 알림톡 발송]\n\n${_cdpUnsentYM.year}년 ${_cdpUnsentYM.month}월 입사 미발송 계약서\n총 ${list.length}건을 알림톡으로 일괄 발송하시겠습니까?`)) return;
  const btn = document.getElementById('cdp-unsent-send-all-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }
  let ok = 0, fail = 0;
  for(const c of list){
    const emp = allEmployees.find(e => e.id === c.employee_id) || {};
    try{
      await _saveDispatchRecord({ method:'알림톡', status:'완료', recipient: emp.phone || '',
        note:`일괄 알림톡 — ${emp.name}`, contractId: c.id });
      ok++;
    } catch(e){ fail++; }
  }
  toast(`일괄 알림톡 완료 — 성공 ${ok}건${fail ? ` / 실패 ${fail}건` : ''}`, ok > 0 ? 'success' : 'error');
  if(btn){ btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 일괄 알림톡 발송'; }
  await _cdpRefreshUnsent();
}

/** 미발송 카드 새로고침 (이력 캐시 갱신 후 재렌더) */
async function _cdpRefreshUnsent(){
  await loadContractDispatchList(true);
  renderCdpUnsentMonthTabs();
  renderCdpUnsentList();
  // 발송이력 카드도 갱신
  await renderContractDispatchPage();
  // 대시보드 근로계약서 미발송 배너 갱신
  _updateDashUnsentContractBanner();
}

// 근로계약서 발송 — 공통 이력 저장 함수
// ══════════════════════════════════════════════════════

/**
 * 발송 이력을 contract_dispatch 테이블에 저장하고
 * 전역 캐시 _contractDispatchList에도 추가한다.
 */
async function _saveDispatchRecord({ method: dispatchMethod, status: dispatchStatus, recipient, note, contractId }){
  const nowISO = new Date().toISOString();
  const adminName = _getAdminUsername();

  // contractId가 직접 전달되면(미발송 목록에서 호출) 해당 계약 데이터로 채움
  let cId = contractId || window._printingContractId || '';
  let empId = window._printingEmpId || '';
  let empName = window._printingEmpName || '';
  let coId = window._printingCompanyId || '';
  let coName = window._printingCompanyName || '';
  let ctType = window._printingContractType || '';
  let ctStart = window._printingContractStart || '';
  let ctEnd   = window._printingContractEnd   || '';

  if(contractId && contractId !== window._printingContractId){
    const _c   = allContracts.find(x => x.id === contractId);
    const _emp = _c ? allEmployees.find(e => e.id === _c.employee_id) : null;
    const _co  = _c ? allCompanies.find(x => x.id === _c.company_id)  : null;
    if(_c){
      empId   = _c.employee_id || '';
      ctType  = _c.contract_type || '';
      ctStart = _c.contract_start || '';
      ctEnd   = _c.contract_end   || '';
    }
    if(_emp){ empName = _emp.name || ''; }
    if(_co){  coId = _co.id || ''; coName = _co.company_name || ''; }
  }

  const payload = {
    contract_id     : cId,
    employee_id     : empId,
    employee_name   : empName,
    company_id      : coId,
    company_name    : coName,
    contract_type   : ctType,
    dispatch_method : dispatchMethod,
    dispatch_status : dispatchStatus,
    recipient       : recipient || '',
    dispatched_at   : nowISO,
    dispatched_by   : adminName,
    note            : note || '',
    contract_start  : ctStart,
    contract_end    : ctEnd,
  };
  try {
    const res = await fetch('../tables/contract_dispatch', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const saved = await res.json();
    // 캐시 초기화 → 발송 관리 페이지 진입 시 DB에서 최신 목록 재조회
    window._contractDispatchList = [];
    // 대시보드 근로계약서 미발송 배너 즉시 갱신
    _updateDashUnsentContractBanner();

    // ── 고객사 인앱 알림 발송 (계약서 발송) ──
    if(coId && empName && (dispatchStatus === '완료')){
      const _dispCo = allCompanies.find(x => x.id === coId) || {};
      const _coRep  = _dispCo.representative ? `, ${_dispCo.representative} 사장님` : '';
      const _methodLabel = dispatchMethod === '알림톡' ? '카카오 알림톡'
        : dispatchMethod === '이메일' ? '이메일'
        : dispatchMethod === '수정재발행' ? '수정재발행 (계약서 변경 후 재발행)'
        : dispatchMethod === '수동배부' ? '수동 직접 배부'
        : dispatchMethod;
      const _fmtD = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
      await _sendCompanyNotice({
        companyId  : coId, companyName: coName,
        noticeType : 'contract_dispatched',
        title      : `[계약서 발송] ${empName} — 근로계약서가 발송되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자에게 근로계약서가 발송되었습니다.

■ 근로자: ${empName}
■ 고용형태: ${ctType||''}
■ 계약 기간: ${_fmtD(ctStart)}${ctEnd ? ' ~ ' + _fmtD(ctEnd) : ''}
■ 발송 방법: ${_methodLabel}
■ 발송 시각: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로계약서 발송 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : cId,
        employeeId  : empId, employeeName: empName,
        contractEnd : ctEnd,
      });
    }

    return saved;
  } catch(e){
    console.error('[발송이력 저장 오류]', e);
    return null;
  }
}

// ── 알림톡 발송 ──────────────────────────────────────
async function dispatchContractKakao(){
  const phone = window._printingEmpPhone || '';
  const name  = window._printingEmpName  || '근로자';
  if(!phone){ toast('전화번호가 등록되지 않았습니다.'); return; }

  const btn = document.getElementById('cpm-kakao-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }

  try {
    // TODO: 알림톡 API 연동 시 이 위치에 API 호출 코드 삽입
    // API 연동 전까지는 이력 저장만 처리
    await _saveDispatchRecord({
      method    : '알림톡',
      status    : '완료',
      recipient : phone,
      note      : `수신번호: ${phone}`,
    });
    toast(`✅ ${name} 님 알림톡 발송 완료 (${phone})`, 'success');
  } catch(e){
    console.error('[알림톡 발송]', e);
    toast('알림톡 발송 중 오류가 발생했습니다.', 'error');
  } finally {
    if(btn){
      btn.disabled=false;
      btn.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="#3b1700" style="flex-shrink:0;"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡';
    }
  }
}

// ── 이메일 발송 ──────────────────────────────────────
async function dispatchContractEmail(){
  const email = window._printingEmpEmail || '';
  const name  = window._printingEmpName  || '근로자';
  if(!email){ toast('이메일이 등록되지 않았습니다.'); return; }

  const btn = document.getElementById('cpm-email-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 발송 중...'; }

  try {
    // TODO: 이메일 API 연동 시 이 위치에 API 호출 코드 삽입
    // API 연동 전까지는 이력 저장만 처리
    await _saveDispatchRecord({
      method    : '이메일',
      status    : '완료',
      recipient : email,
      note      : `수신 이메일: ${email}`,
    });
    toast(`✅ ${name} 님 이메일 발송 완료 (${email})`, 'success');
  } catch(e){
    console.error('[이메일 발송]', e);
    toast('이메일 발송 중 오류가 발생했습니다.', 'error');
  } finally {
    if(btn){
      btn.disabled=false;
      btn.innerHTML='<i class="fas fa-envelope"></i> 이메일';
    }
  }
}

// ── 수동 직접 배부 ────────────────────────────────────
async function dispatchContractManual(){
  const name  = window._printingEmpName || '근로자';
  const confirmed = confirm(
    `[ 수동 직접 배부 처리 ]\n\n` +
    `${name} 님의 근로계약서를 출력하여 직접 배부(교부)하셨습니까?\n\n` +
    `확인을 누르면 배부 완료 이력이 등록됩니다.`
  );
  if(!confirmed) return;

  const btn = document.getElementById('cpm-manual-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }

  try {
    await _saveDispatchRecord({
      method    : '수동배부',
      status    : '완료',
      recipient : '직접배부',
      note      : '출력물 직접 교부 완료 (관리자 확인)',
    });
    toast(`✅ ${name} 님 근로계약서 직접 배부 완료`, 'success');
  } catch(e){
    console.error('[수동배부]', e);
    toast('처리 중 오류가 발생했습니다.', 'error');
  } finally {
    if(btn){
      btn.disabled=false;
      btn.innerHTML='<i class="fas fa-hand-holding"></i> 수동 직접 배부';
    }
  }
}

/** 인쇄 전용 CSS */
function _getContractPrintCSS(){
  return [
    '*{box-sizing:border-box;margin:0;padding:0;}',
    'body{font-family:"Noto Sans KR",sans-serif;font-size:12.5px;line-height:1.9;color:#1a1a1a;padding:24px 40px;max-width:800px;margin:0 auto;background:#fff;}',
    'h1{text-align:center;font-size:21px;font-weight:900;letter-spacing:7px;margin-bottom:4px;color:#0f172a;padding-bottom:8px;border-bottom:3px double #0f172a;}',
    'h2{text-align:center;font-size:19px;font-weight:900;letter-spacing:5px;margin-bottom:4px;color:#0f172a;padding-bottom:8px;border-bottom:3px double #0f172a;}',
    '.doc-subtitle{text-align:center;font-size:11.5px;color:#64748b;margin-bottom:20px;margin-top:4px;}',
    '.doc-type-banner{text-align:center;margin-bottom:14px;}',
    '.doc-type-badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;}',
    '.doc-parties{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;line-height:1.8;}',
    '.doc-section{margin-bottom:14px;}',
    '.doc-section-title{font-size:12.5px;font-weight:800;color:#0f172a;background:#f1f5f9;border-left:4px solid #4f46e5;padding:5px 10px;margin-bottom:6px;border-radius:0 3px 3px 0;}',
    '.info-table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:11.5px;}',
    '.info-table th{background:#f8fafc;border:1px solid #cbd5e1;padding:5px 9px;font-weight:700;color:#374151;white-space:nowrap;width:30%;text-align:left;}',
    '.info-table td{border:1px solid #cbd5e1;padding:5px 9px;color:#1e293b;}',
    '.info-table tr.total-row th{background:#eff6ff;color:#1d4ed8;}',
    '.info-table tr.total-row td{background:#eff6ff;font-weight:700;}',
    '.doc-note{font-size:10.5px;color:#64748b;margin-top:3px;padding-left:4px;line-height:1.6;}',
    '.doc-text{font-size:12px;margin:4px 0;line-height:1.9;}',
    '.doc-divider{border:none;border-top:1.5px dashed #cbd5e1;margin:12px 0;}',
    '.doc-insurance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:6px;}',
    '.insurance-item{border:1.5px solid #e2e8f0;border-radius:5px;padding:7px;text-align:center;font-size:11.5px;font-weight:600;color:#94a3b8;background:#f8fafc;}',
    '.insurance-item.active{border-color:#818cf8;color:#4f46e5;background:#eef2ff;}',
    '.ins-icon{display:block;font-size:13px;margin-bottom:1px;}',
    '.doc-sign-date{text-align:center;font-size:12.5px;margin:20px 0 14px;padding:9px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;color:#374151;line-height:1.9;}',
    '.doc-sign{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:0;}',
    '.doc-sign-box{border:1.5px solid #cbd5e1;border-radius:8px;padding:11px 13px;}',
    '.doc-sign-box .sign-title{font-size:12px;font-weight:800;color:#374151;margin-bottom:8px;text-align:center;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}',
    '.sign-info-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:9px;}',
    '.sign-info-table th{background:#f8fafc;border:1px solid #e2e8f0;padding:4px 7px;font-weight:700;color:#374151;white-space:nowrap;width:30%;}',
    '.sign-info-table td{border:1px solid #e2e8f0;padding:4px 7px;color:#1e293b;}',
    '.sign-stamp-area{text-align:center;padding-top:2px;}',
    '.sign-stamp{width:52px;height:52px;border:2px dashed #cbd5e1;border-radius:50%;margin:0 auto 2px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;line-height:1.4;}',
    '.sign-label{font-size:10px;color:#94a3b8;}',
    '.highlight{font-weight:700;color:#1d4ed8;}',
    '.daily-highlight{font-weight:700;color:#d97706;}',
    '.doc-probation-box{background:#fefce8;border:1.5px solid #fde047;border-radius:7px;padding:10px 13px;margin-top:6px;font-size:11.5px;line-height:1.8;color:#854d0e;}',
    '.doc-daily-note{background:#fff7ed;border:1.5px solid #fed7aa;border-radius:7px;padding:10px 13px;margin-top:8px;font-size:11.5px;line-height:1.8;color:#9a3412;}',
    '@media print{@page{margin:15mm 14mm;}body{padding:0;font-size:11.5px;max-width:100%;}',
    '.doc-section-title{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '.info-table th{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '.info-table tr.total-row th,.info-table tr.total-row td{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '.insurance-item.active{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '.doc-sign{page-break-inside:avoid;}',
    '.doc-parties{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}'
  ].join('');
}

/**
 * 제3조 ② 요일별 근무시간표 HTML 생성 (work-schedule-table 동일 구조)
 */
function buildScheduleTableHTML(activeDays){
  const dayOrder  = ['mon','tue','wed','thu','fri','sat','sun'];
  const daysKr    = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
  const dayColors = {sat:'#2563eb', sun:'#dc2626'};
  const toM = function(t){ if(!t) return null; var p=t.split(':'); return parseInt(p[0])*60+parseInt(p[1]); };
  const sortedDays = activeDays.slice().sort(function(a,b){ return dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day); });

  // breaks 배열 정규화: 없으면 레거시 brk_start/brk_end 폴백
  var normBreaks = function(s){
    if(Array.isArray(s.breaks) && s.breaks.length) return s.breaks;
    if(s.brk_start||s.brk_end) return [{s:s.brk_start||'', e:s.brk_end||''}];
    return [];
  };
  var totalBrkMins = function(s){
    return normBreaks(s).reduce(function(sum,b){
      var bs=toM(b.s), be=toM(b.e);
      return sum+((bs!==null&&be!==null&&be>bs)?(be-bs):0);
    },0);
  };

  var rows = sortedDays.map(function(s){
    var isWork = !!(s.start && s.end);
    var cls   = s.day==='sat' ? 'day-sat' : s.day==='sun' ? 'day-sun' : '';
    var color = dayColors[s.day] || '#1e293b';
    var sm=toM(s.start), em=toM(s.end);
    var brk = totalBrkMins(s);
    var mins = (sm!==null&&em!==null&&em>sm) ? Math.max(0,em-sm-brk) : 0;
    var h = mins/60;
    var hrs = mins===0 ? '-' : (Number.isInteger(h)?h:h.toFixed(1))+'시간';
    var chk = isWork ? '✔' : '';
    // 휴게 슬롯 표시: 복수 슬롯을 줄바꿈으로
    var brkSlots = normBreaks(s);
    var brkCell = brkSlots.length
      ? brkSlots.map(function(b){ return (b.s||'') + (b.s&&b.e?' ~ ':'') + (b.e||''); }).join('<br/>')
      : '-';
    return '<tr class="'+cls+'">'+'<td style="text-align:center;">'+chk+'</td>'+'<td style="text-align:center;"><span class="day-label" style="color:'+color+';">'+( daysKr[s.day]||s.day)+'</span></td>'+'<td style="text-align:center;">'+(s.start||'')+'</td>'+'<td style="text-align:center;">'+(s.end||'')+'</td>'+'<td class="td-brk" style="text-align:center;line-height:1.6;">'+brkCell+'</td>'+'<td style="text-align:center;"><span class="computed-h">'+hrs+'</span></td>'+'<td></td>'+'</tr>';
  }).join('');

  var totalMins = sortedDays.reduce(function(sum,s){
    var sm=toM(s.start),em=toM(s.end);
    if(sm===null||em===null||em<=sm) return sum;
    return sum+Math.max(0,em-sm-totalBrkMins(s));
  },0);
  var wDays  = sortedDays.filter(function(s){ return !!(s.start && s.end); }).length;
  var avgDay = wDays>0 ? totalMins/wDays/60 : 0;
  var weekH  = totalMins/60;
  var fmtH   = function(h){ return Number.isInteger(h)?h:h.toFixed(1); };

  return '<div class="work-schedule-wrap">'
    +'<table class="work-schedule-table">'
    +'<thead><tr>'
    +'<th style="width:34px;">근무</th>'
    +'<th style="width:30px;">요일</th>'
    +'<th style="width:88px;">출근</th>'
    +'<th style="width:88px;">퇴근</th>'
    +'<th class="th-brk">휴게시간</th>'
    +'<th style="width:60px;">소정시간</th>'
    +'<th>비고</th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table>'
    +'<div class="wsh-total">'
    +'주 근무일수: <span>'+wDays+'</span>일 &nbsp;|&nbsp;'
    +'주 소정근로시간: <span>'+fmtH(weekH)+'</span>시간 &nbsp;|&nbsp;'
    +'일 평균 소정근로시간: <span>'+fmtH(avgDay)+'</span>시간'
    +'</div>'
    +'</div>';
}

/**
 * DB 데이터(c=계약, emp=직원, co=회사)를 받아 계약서 HTML 생성
 * 유형별 분기: 정규직 / 정규직 수습 / 계약직 / 계약직 수습 / 일용직
 */
function generateContractHTMLFromData(c, emp, co){
  // contract_type 우선 — emp.employment_category는 직원 현재 상태이므로
  // 채용 확정 후 생성된 계약(contract_type='정규직') 계약서가 수습 양식으로
  // 출력되는 문제를 방지. emp.employment_category는 폴백으로만 사용.
  // 계약예정 상태인 경우 수습 카테고리 정규화 (채용확정 → 본계약 전환이므로 수습 아님)
  const _ctTypeBase = c.contract_type || emp.employment_category || '정규직';
  const _isPendingContract = (c.status === '계약예정');
  const ctType = _isPendingContract
    ? (_ctTypeBase === '정규직 수습' ? '정규직' : _ctTypeBase === '계약직 수습' ? '계약직' : _ctTypeBase)
    : _ctTypeBase;
  const isDaily  = ctType === '일용직';
  const isProb   = ctType === '정규직 수습' || ctType === '계약직 수습';
  const isRegular= ctType === '정규직' || ctType === '정규직 수습';

  const fmt  = v => Number(v||0).toLocaleString('ko-KR');
  const row  = (label, val, cls='') => `<tr${cls?' class="'+cls+'"':''}><th>${label}</th><td>${val||'—'}</td></tr>`;
  const wons = v => fmt(v) + '원';

  // ── 날짜 포맷 ──
  const fmtDateKr = str => {
    if(!str) return '';
    try{ return new Date(str).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'}); }
    catch(e){ return str; }
  };
  const contractDateKr = fmtDateKr(c.contract_start) || new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});

  // ── 계약기간 ──
  let contractPeriod = '';
  if(isDaily){
    contractPeriod = `${c.contract_start||'—'} ~ ${c.contract_end||'별도 지정'}`;
  } else if(isRegular){
    contractPeriod = `${c.contract_start||'—'}부터 <strong>기간의 정함 없음</strong>`;
  } else {
    contractPeriod = `${c.contract_start||'—'} ~ ${c.contract_end||'미정'}`;
  }

  // ── 수습기간 계산 ──
  let probEndDate = '';
  const probMonths = isProb ? (parseInt(c.probation_months)||3) : 0;
  const probPct    = isProb ? (parseFloat(c.probation_pct)||80) : 0;
  const probAmt    = isProb ? (parseFloat(c.probation_amt)||0) : 0;
  if(isProb && c.contract_start){
    const st = new Date(c.contract_start);
    st.setMonth(st.getMonth() + probMonths);
    st.setDate(st.getDate() - 1);
    probEndDate = fmtDateKr(st.toISOString().slice(0,10));
  }
  const probStartKr = fmtDateKr(c.contract_start);

  // ── 근무 스케줄 파싱 ──
  let schedule = [];
  if(c.schedule_json){
    try{
      const _parsed = JSON.parse(c.schedule_json);
      schedule = Array.isArray(_parsed) ? _parsed : [];  // 배열 아닌 경우(객체·null 등) 빈 배열로 폴백
    } catch(e){
      console.warn('[schedule_json 파싱 실패]', e, c.schedule_json);
    }
  }
  let activeDays = Array.isArray(schedule)
    ? schedule.filter(s=>s.active===true||s.active===1||s.active==='true')
    : [];  // schedule이 배열이 아닌 경우 최종 방어

  // schedule_json 없을 경우 레거시 필드로 폴백 스케줄 생성
  if(activeDays.length === 0){
    const _DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];
    const _start    = c.start_time || '09:00';
    const _end      = c.end_time   || '18:00';
    const _wDays    = parseInt(c.work_days_per_week || c.days_per_week || 5);
    // 휴게시간 추정: break_mins 필드 기반, 없으면 60분
    const _brkMins  = parseInt(c.break_mins || 60);
    const _toM      = t=>{ const p=t.split(':'); return parseInt(p[0])*60+parseInt(p[1]); };
    const _fmtT     = m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    const _sMins    = _toM(_start);
    const _eMins    = _toM(_end);
    const _halfWork = Math.round((_eMins - _sMins - _brkMins) / 2);
    const _brkStart = _brkMins > 0 ? _fmtT(_sMins + _halfWork) : '';
    const _brkEnd   = _brkMins > 0 ? _fmtT(_sMins + _halfWork + _brkMins) : '';
    activeDays = _DAY_KEYS.map((key, i)=>{
      const active = i < _wDays;
      return {
        day: key, active: true,
        start:     active ? _start    : '',
        end:       active ? _end      : '',
        brk_start: active ? _brkStart : '',
        brk_end:   active ? _brkEnd   : '',
        note: ''
      };
    });
  }
  const dayNamesK  = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
  const dayNamesFull = {mon:'월요일',tue:'화요일',wed:'수요일',thu:'목요일',fri:'금요일',sat:'토요일',sun:'일요일'};

  // 근무 요일 문자열
  let workDaysStr = '';
  if(activeDays.length){
    workDaysStr = activeDays.map(s=>dayNamesFull[s.day]||s.day).join(', ');
  } else if(c.work_days){
    workDaysStr = c.work_days;
  } else {
    workDaysStr = '월요일 ~ 금요일';
  }

  // 대표 출퇴근 시간
  const startTime = activeDays[0]?.start || c.start_time || '09:00';
  const endTime   = activeDays[activeDays.length-1]?.end || c.end_time || '18:00';

  // 소정근로시간
  const hoursPerDay = parseFloat(c.hours_per_day||c.daily_hours||8);
  const daysPerWeek = parseInt(c.days_per_week||c.work_days_count||(activeDays.length||5));
  const weekHours   = Math.round(hoursPerDay * daysPerWeek * 10) / 10;

  // 휴게시간 — breaks 배열 우선, 없으면 레거시 brk_start/brk_end 폴백
  const _normBreaks = s => {
    if(Array.isArray(s.breaks) && s.breaks.length) return s.breaks;
    if(s.brk_start||s.brk_end) return [{s:s.brk_start||'', e:s.brk_end||''}];
    return [];
  };
  let breakHTML = '';
  // 요일별 모든 슬롯을 수집 → 동일 시간대끼리 묶어 표시
  const uniqBrk = {};
  activeDays.forEach(day=>{
    _normBreaks(day).forEach(b=>{
      if(!b.s || !b.e) return;
      const key = `${b.s}~${b.e}`;
      if(!uniqBrk[key]) uniqBrk[key] = new Set();
      uniqBrk[key].add(dayNamesK[day.day]||day.day);
    });
  });
  if(Object.keys(uniqBrk).length){
    breakHTML = Object.entries(uniqBrk).map(([time, daysSet])=>{
      const [hs,ms] = time.split('~')[0].split(':').map(Number);
      const [he,me] = time.split('~')[1].split(':').map(Number);
      const mins = (he*60+me)-(hs*60+ms);
      return `[${[...daysSet].join('·')}] ${time} (${mins}분)`;
    }).join(', ');
  } else {
    breakHTML = '1일 근로시간 4시간인 경우 30분, 8시간인 경우 1시간 이상';
  }

  // ── 임금 ──
  const baseSalary        = parseFloat(c.base_salary||0);
  const weeklyHol         = parseFloat(c.weekly_holiday_pay||0);
  const posAllow          = parseFloat(c.position_allowance||0);
  // 차량지원비 = 구 교통비 + 구 자가운전보조금 합산 (레거시 하위호환)
  const carAllow          = parseFloat(c.transportation_allowance||c.car_maintenance||0) + parseFloat(c.self_driving_allowance||0);
  const carPayType        = c.transportation_pay_type||c.self_driving_pay_type||'fixed';
  const remoteAreaAllow   = parseFloat(c.remote_area_allowance||0);
  // remoteAreaPayType: 항상 'fixed' — 선언 생략
  const mealAllow         = parseFloat(c.meal_allowance||0);
  const mealPayType       = c.meal_pay_type||'fixed';
  const researchAllow     = parseFloat(c.research_allowance||0);
  const researchPayType   = c.research_pay_type||'fixed';
  const siteAllow         = parseFloat(c.site_allowance||0);
  const skillAllow        = parseFloat(c.skill_allowance||0);
  const licenseAllow      = parseFloat(c.license_allowance||0);
  const commAllow         = parseFloat(c.communication_allowance||0);
  const commPayType       = c.communication_pay_type||'fixed';
  const fitnessAllow      = parseFloat(c.fitness_allowance||0);
  const fitnessPayType    = c.fitness_pay_type||'fixed';
  const selfDevAllow      = parseFloat(c.self_dev_allowance||0);
  const selfDevPayType    = c.self_dev_pay_type||'fixed';
  const bookAllow         = parseFloat(c.book_allowance||0);
  const bookPayType       = c.book_pay_type||'fixed';
  const overseasAllow     = parseFloat(c.overseas_allowance||0);
  const overseasPayType   = c.overseas_pay_type||'fixed';
  // acfg: allowance_config가 있으면 그 키 값으로 제어, 없으면 null (값>0이면 무조건 표시)
  const _rawAcfg = (co && co.allowance_config) ? co.allowance_config : null;
  // acfgShow(key, amount): allowance_config 없으면 amount>0으로만 판단, 있으면 cfg[key] && amount>0
  const acfgShow = (key, amount) => amount > 0 && (_rawAcfg === null || !!_rawAcfg[key]);
  const fixedOtPay        = parseFloat(c.fixed_ot_pay||0);
  const fixedNightPay     = parseFloat(c.fixed_night_pay||0);
  const fixedHolPay       = parseFloat(c.fixed_hol_pay||0);
  const monthlySal        = parseFloat(c.monthly_salary_agreed||0);
  const annualSal         = parseFloat(c.annual_salary||0);
  const hourlyWage        = parseFloat(c.hourly_wage||0);
  const dailyWage         = parseFloat(c.daily_wage||c.base_salary||0);
  // 통상임금 지급유형 뱃지 생성 헬퍼
  const payTypeBadge = (type) => type==='fixed'
    ? '<span style="font-size:10px;color:#1d4ed8;background:#dbeafe;border-radius:4px;padding:1px 6px;margin-left:6px;font-weight:700;">매월 정기지급 (통상임금 포함)</span>'
    : '<span style="font-size:10px;color:#92400e;background:#fef3c7;border-radius:4px;padding:1px 6px;margin-left:6px;font-weight:700;">출근일수에 따름 (통상임금 제외)</span>';
  // 통상임금 포함 여부: fixed = 포함, 그 외(daily/receipt) = 제외
  const isFixedType = (type) => (type||'fixed') === 'fixed';

  // 임금지급일
  const payDayStr = co.pay_day ? `매월 ${co.pay_day}일` : '매월 말일';

  // ── 주민등록번호(외국인번호) 마스킹: 앞 7자리 이후 * 처리 ──
  const idNum = emp.id_number || '';
  const maskedId = (()=>{
    if(!idNum) return '';
    // 하이픈 제거 후 처리
    const s = String(idNum).replace(/-/g,'');
    if(s.length === 0) return '';
    // 앞 6자리 + 하이픈 + 뒷첫자리(7번째) + ******
    const front = s.slice(0, 6);          // 생년월일 6자리
    const mid   = s.slice(6, 7);          // 뒷 첫 번째 자리
    const stars = '******';               // 나머지 마스킹
    if(s.length <= 6) return front;       // 앞 6자리만 있는 경우
    return front + '-' + mid + stars;
  })();

  // ── 입사일 포맷 ──
  const hireDateStr = emp.hire_date || '';



  // ── 유형별 배지 색상 ──
  const typeBadgeStyle = {
    '정규직':      'background:#dbeafe;color:#1d4ed8;',
    '정규직 수습': 'background:#cffafe;color:#0e7490;',
    '계약직':      'background:#ede9fe;color:#6d28d9;',
    '계약직 수습': 'background:#fce7f3;color:#9d174d;',
    '일용직':      'background:#fef3c7;color:#b45309;',
  }[ctType] || 'background:#f3f4f6;color:#374151;';

  // ── 유형별 제목 ──
  const titleByType = {
    '정규직':      '근 로 계 약 서',
    '정규직 수습': '근 로 계 약 서',
    '계약직':      '근 로 계 약 서',
    '계약직 수습': '근 로 계 약 서',
    '일용직':      '일 용 근 로 계 약 서',
  };
  const subtitleByType = {
    '정규직':      '(표준근로계약서 — 정규직)',
    '정규직 수습': '(표준근로계약서 — 수습직)',
    '계약직':      '(표준근로계약서 — 기간제 근로자)',
    '계약직 수습': '(표준근로계약서 — 기간제 수습직)',
    '일용직':      '(표준근로계약서 — 일용직)',
  };

  // ── 임금 섹션 ──
  let salarySection = '';
  if(isDaily){
    salarySection = `
      <div class="doc-section">
        <div class="doc-section-title">__ART_SALARY__</div>
        <table class="info-table">
          <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
          ${row('일급여', `<strong class="daily-highlight">${fmt(dailyWage)}원</strong>`)}
          ${row('임금 지급일', payDayStr + ' (현금 또는 계좌이체)')}
          ${row('지급 방법', '현금 지급 또는 근로자 명의 계좌 직접 입금')}
        </table>
        <div class="doc-note">※ 제세공과금(소득세, 4대 보험료 등)은 관계법령에 따라 공제 후 지급한다.</div>
        <div class="doc-daily-note">
          <strong>📌 일용직 임금 안내</strong><br>
          • 일급여는 실제 근로일수에 따라 지급합니다.<br>
          • 초과 근무 시 근로기준법 제56조에 따라 통상시급의 150%를 가산하여 지급합니다.<br>
          • 야간(22:00~06:00) 및 휴일 근로 시 법정 가산율을 적용합니다.
        </div>
      </div>`;
  } else {
    // salary_start_date = contract_start 통합 — contract_start 직접 참조
    const salaryStartDate = c.contract_start || '';
    const salaryPeriodRow = (isRegular && salaryStartDate)
      ? row('연봉적용 시작일', salaryStartDate)
      : '';
    salarySection = `
      <div class="doc-section">
        <div class="doc-section-title">__ART_SALARY__</div>
        ${isRegular && annualSal > 0 ? `
        <p class="doc-text">① "사용자"는 "근로자"의 임금에 관하여 연봉제를 원칙으로 하며, 연봉에 관한 사항의 기간은 다음과 같다.</p>
        <table class="info-table">
          <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
          ${row('연봉', '<strong>' + fmt(annualSal) + '원</strong>')}
          ${salaryPeriodRow}
        </table>
        <p class="doc-text">② 월지급액은 업무의 특성과 계산의 용이성을 감안하여 법정 제수당을 포함한 포괄임금제도에 의해 매월 지급됨을 원칙으로 한다. 단, 수습기간의 급여는 관계법령에 위반되지 않는 한도(정규직은 최저임금의 90%, 계약직은 최저임금액)에서 별도로 정할 수 있다.</p>
        ` : ''}
        <p class="doc-text">③ 제⑤항의 임금지급기에 따른 급여 구성은 다음과 같다.</p>
        <table class="info-table">
          <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
          ${row('기본급', `<strong class="highlight">${fmt(baseSalary)}원</strong>`)}
          ${weeklyHol > 0      ? row('주휴수당',           `${fmt(weeklyHol)}원`)   : ''}
          ${fixedOtPay > 0    ? row('고정 연장근로수당', `${fmt(fixedOtPay)}원`)   : ''}
          ${fixedNightPay > 0 ? row('고정 야간근로수당', `${fmt(fixedNightPay)}원`) : ''}
          ${fixedHolPay > 0   ? row('고정 휴일근로수당', `${fmt(fixedHolPay)}원`)   : ''}
          ${posAllow > 0       ? row('직책수당',         `${fmt(posAllow)}원`)     : ''}
          ${carAllow > 0        && isFixedType(carPayType)                              ? row('차량지원비',    `${fmt(carAllow)}원`)        : ''}
          ${remoteAreaAllow > 0                                                          ? row('벽지수당',     `${fmt(remoteAreaAllow)}원`) : ''}
          ${mealAllow > 0       && isFixedType(mealPayType)                             ? row('식대',         `${fmt(mealAllow)}원`)       : ''}
          ${researchAllow > 0   && isFixedType(researchPayType)                         ? row('연구활동비',   `${fmt(researchAllow)}원`)   : ''}
          ${acfgShow('site',          siteAllow)                                         ? row('현장수당',     `${fmt(siteAllow)}원`)       : ''}
          ${acfgShow('skill',         skillAllow)                                        ? row('기술수당',     `${fmt(skillAllow)}원`)      : ''}
          ${acfgShow('license',       licenseAllow)                                      ? row('면허수당',     `${fmt(licenseAllow)}원`)    : ''}
          ${acfgShow('communication', commAllow)    && isFixedType(commPayType)          ? row('통신비',       `${fmt(commAllow)}원`)       : ''}
          ${acfgShow('fitness',       fitnessAllow) && isFixedType(fitnessPayType)       ? row('체력증진비',   `${fmt(fitnessAllow)}원`)    : ''}
          ${acfgShow('self_dev',      selfDevAllow) && isFixedType(selfDevPayType)       ? row('자기계발비',   `${fmt(selfDevAllow)}원`)    : ''}
          ${acfgShow('book',          bookAllow)    && isFixedType(bookPayType)          ? row('도서지원비',   `${fmt(bookAllow)}원`)       : ''}
          ${acfgShow('overseas',      overseasAllow)&& isFixedType(overseasPayType)      ? row('해외근무수당', `${fmt(overseasAllow)}원`)   : ''}
          <tr class="total-row"><th>월 약정임금 합계</th><td><strong class="highlight">${fmt(monthlySal)}원</strong></td></tr>
          ${hourlyWage > 0 ? row('통상시급', `${fmt(hourlyWage)}원/시간`) : ''}
          ${row('임금 지급일', payDayStr)}
          ${row('지급 방법', '근로자 명의 계좌 직접 입금')}
        </table>
        <div class="doc-note">※ 제세공과금(4대 보험료, 소득세 등)은 관계법령에 따라 공제 후 지급한다.</div>
        <p class="doc-text">④ 위 급여는 세전금액으로 법정세금 및 보험료(본인부담금)는 "근로자"가 부담한다.</p>
        <p class="doc-text">⑤ 위 급여는 매월 초일부터 말일까지 기산하여 매월 25일에 본인의 계좌로 입금하며 지급일이 휴일인 경우는 순차적으로 그 전일에 지급함을 원칙으로 한다. 다만, 본인이 원하는 경우 직접 지급할 수 있다.</p>
        <p class="doc-text">⑥ "사용자"는 "근로자"의 결근, 지각, 휴직, 계약만료전 근로관계종료 기타 사유에 의하여 근무하지 아니한 기간에 대한 임금을 감액하여 지급할 수 있다.</p>
      </div>`;
  }

  // ── 퇴직급여 섹션 (번호는 return 블록에서 art() 로 부여) ──
  const retirementSection = `
    <div class="doc-section">
      <div class="doc-section-title">__ART_RETIREMENT__</div>
      <p class="doc-text">① "사용자"는 "근로자"의 퇴직 시에 계속근로년수 1년에 대하여 30일분의 평균임금을 퇴직급여로서 지급한다.</p>
      <p class="doc-text">② "사용자"는 계속근로년수 1년 이상이 된 "근로자"의 신청이 있고 주택구입 등 대통령령이 정하는 사유와 요건을 갖춘 경우에 퇴직금을 중간정산 할 수 있다.</p>
      <p class="doc-text">③ "근로자"는 퇴직금 중간정산을 원하는 경우 그 사유를 명시한 퇴직금중간정산 신청서와 주택구입 등 대통령령이 정하는 사유와 요건을 갖추었다는 것을 증빙할 수 있는 서류를 제출하여야 한다.</p>
      <p class="doc-text">④ 퇴직급여는 퇴직한 날 이후 최초 임금지급기일에 지급하기로 하며, 중간정산시는 중간정산 신청 후 도래하는 임금지급 기일에 지급하기로 한다.</p>
      <p class="doc-text">⑤ 퇴직연금제도를 도입할 경우 제①항~제③항에도 불구하고 퇴직급여와 관련된 사항은 퇴직연금규약에 따른다.</p>
    </div>`;

  // ── 해고 등 섹션 (번호는 return 블록에서 art() 로 부여) ──
  const dismissalSection = `
    <div class="doc-section">
      <div class="doc-section-title">__ART_DISMISSAL__</div>
      <p class="doc-text">① 해고 등 징계는 취업규칙에 의한다.</p>
      <p class="doc-text">② "사용자"는 위①의 징계 사유가 발생한 경우 및 정당한 업무지시의 범위내에서 "근로자"에게 해당사항에 대한 경위서 제출을 요구할 수 있고, "근로자"는 특별한 사정이 없는 한 경위서를 제출하여야 한다.</p>
      <p class="doc-text">③ 기타 "근로자"는 별도의 근무수칙을 준수하여야 한다.</p>
    </div>`;

  // ── 수습 조건 섹션 (번호는 return 블록에서 art() 로 부여) ──
  const probSection = isProb ? `
    <div class="doc-section">
      <div class="doc-section-title">__ART_PROB__</div>
      <table class="info-table">
        <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
        ${row('수습기간', `${probStartKr} ~ ${probEndDate} (${probMonths}개월)`)}
        ${row('수습 임금 (월)', `<strong>${fmt(probAmt)}원</strong> (약정임금의 ${probPct}%)`)}
      </table>
      <div class="doc-probation-box">
        <strong>📋 수습기간 안내</strong><br>
        • 수습기간 중 임금은 위 금액을 적용하며, 수습 종료 후 약정임금 전액을 지급합니다.<br>
        • 수습기간 중 업무 부적격 판정 시 사업주는 계약을 해지할 수 있습니다.<br>
        • 수습기간은 근속기간에 포함하여 산정합니다.
      </div>
    </div>` : '';

    // ── 동적 조항 번호 카운터 ──
    // art(title) 을 호출 순서대로 부르면 제1조·제2조·… 가 자동 생성됨
    // 조건부 섹션이 빠져도 번호가 자동으로 당겨지므로 연번 보장
    let _artNo = 0;
    const art = (title) => `제${++_artNo}조 ${title}`;

    // ── 기간제 특별 고지 (content만 쿠우고, return 블록에서 art()로 번호 부여) ──
    const fixedTermContent = (!isRegular && !isDaily) ? `

    <div class="doc-probation-box" style="background:#f5f3ff;border-color:#c4b5fd;color:#4c1d95;">
      <strong>📋 기간제법 적용 안내</strong><br>
      • 본 계약은 <strong>기간제 및 단시간근로자 보호 등에 관한 법률</strong>의 적용을 받습니다.<br>
      • 동일 사업장에서 2년을 초과하여 계속 근무 시 기간의 정함이 없는 근로자로 간주될 수 있습니다.<br>
      • 계약기간 만료 시 근로관계는 자동으로 종료되며, 별도의 해고 절차 없이 종료됩니다.
    </div>` : '';

  // ── 동적 태그명 사전 계산 (template literal 내 동적 태그명 패턴은 HTML 파서를 오작동시킴) ──
  const _hTag   = isDaily ? 'h2' : 'h1';
  const _hOpen  = '<' + _hTag + '>';
  const _hClose = '</' + _hTag + '>';
  const titleHTML = _hOpen + (titleByType[ctType]||'근 로 계 약 서') + _hClose;

  return `
  ${titleHTML}


  <div class="doc-parties">
    <p><strong>${co.company_name||'(회사명)'}</strong>(이하 "사업주"라 함)과 <strong>${emp.name||'(근로자명)'}</strong>(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">◼ 사업주 정보</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('상호(사업장명)', co.company_name)}
      ${row('사업자등록번호', co.business_number)}
      ${row('소재지(주소)',   co.address)}
      ${row('대표자(사용자)', co.representative)}
      ${row('대표 연락처',   co.phone)}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">◼ 근로자 정보</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('성명', emp.name)}
      ${row('주민등록번호(외국인번호)', maskedId)}
      ${row('입사일', hireDateStr)}
      ${row('주소', emp.address)}
      ${row('연락처', emp.phone)}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(의무)')}</div>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:6px 0;">
      "근로자"는 당사에 채용됨에 따라 상호 신뢰를 바탕으로 근로계약을 체결하며 당사의 운영규정을 준수하고 성실히 업무를 수행할 의무를 진다.
    </p>
  </div>

  <div class="doc-divider"></div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(근무장소 및 업무내용)')}</div>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">
      ① "근로자"는 아래의 근무장소에서 근무함을 원칙으로 한다. 다만, "사용자"는 업무상 필요한 경우 "근로자"의 근무장소를 변경할 수 있다.
    </p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 8px;">
      ② "근로자"의 담당업무는 아래와 같으며, 그 외 "사용자"가 지시하는 업무 및 "사용자"가 별도로 부여한 업무를 수행한다. 다만, "사용자"는 업무상 필요한 경우 "근로자"의 담당업무를 변경할 수 있다.
    </p>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('근무 장소', co.address || co.company_name)}
      ${row('담당 업무', emp.job_description || '회사가 지정하는 업무')}
      ${emp.department ? row('부서', emp.department) : ''}
      ${emp.position   ? row('직책/직위', emp.position) : ''}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(계약기간 및 근무시간)')}</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('계약기간', contractPeriod)}
      ${row('고용형태', `<span style="${typeBadgeStyle}padding:1px 8px;border-radius:10px;font-weight:700;font-size:11px;">${ctType}</span>`)}
      ${isProb ? row('수습기간', `${probStartKr} ~ ${probEndDate} (${probMonths}개월)`) : ''}
    </table>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:8px 0 4px;">
      ① 계약의 갱신은 계약기간 만료 1개월 전 협의하는 것으로 하며, 만료 전까지 당사자간 별도의 의사표시 또는 협의가 없는 경우 고용기간이 종료되는 것으로 한다.
    </p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">
      ② 정규 근로시간은 주 40시간제를 원칙으로 하며, 근무시간은 다음과 같다.
    </p>
    ${buildScheduleTableHTML(activeDays)}
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:8px 0 4px;">
      ③ 제②항에 명시된 시간 외에 "사용자"는 "근로자"에게 업무상의 필요에 의하여 연장근무, 야간근무 및 휴일근무를 명할 수 있으며 "근로자"는 이에 포괄적으로 합의한 것으로 본다.
    </p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">
      ④ "근로자"는 업무상 연장, 야간 및 휴일 근로가 필요한 경우 "사용자"에게 연장근로신청서 등을 제출하여 사전 승인을 받아야 한다. 사전 승인 없는 임의의 연장 등은 인정하지 아니할 수 있다.
    </p>
  </div>

  ${!isDaily ? `
  <div class="doc-section">
    <div class="doc-section-title">${art('(연차휴가)')}</div>
    <p class="doc-text">연차유급휴가는 단체협약, 취업규칙 및 근로기준법이 정하는 바에 따라 부여한다.</p>
  </div>
  <div class="doc-section">
    <div class="doc-section-title">${art('(휴일)')}</div>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">① "사용자"는 1주일에 소정근로일수를 개근한 경우 주휴일을 부여한다.</p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">② 주휴일과 근로자의 날(5월 1일)은 유급휴일로, 토요일은 무급휴일로 한다. 단, 휴일이 중복되는 경우 1일의 휴일로 처리한다.</p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">③ 기타 휴일에 관한 사항은 "공휴일에 관한 법률"에 따른다.</p>
  </div>` : ''}
  ${salarySection.replace('__ART_SALARY__', art('(임금)'))}
  ${retirementSection.replace('__ART_RETIREMENT__', art('(퇴직급여)'))}
  ${dismissalSection.replace('__ART_DISMISSAL__', art('(해고 등)'))}
  ${fixedTermContent ? `
  <div class="doc-section" style="border-left-color:#7c3aed;">
    <div class="doc-section-title" style="color:#6d28d9;">${art('(기간제 근로자 고지사항)')}</div>
    ${fixedTermContent}
  </div>` : ''}

  <div class="doc-section">
    <div class="doc-section-title">${art('(근로계약서 교부)')}</div>
    <p class="doc-text">"사용자"는 근로계약을 체결함과 동시에 본 계약서를 사본하여 "근로자"의 교부요구와 관계없이 "근로자"에게 교부한다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(비밀유지 및 업무의 인수·인계)')}</div>
    <p class="doc-text">① "근로자"는 동의한 연봉에 관한 비밀을 누설하지 아니한다.</p>
    <p class="doc-text">② "근로자"는 근로기간 중 지득한 "사용자"의 업무에 관한 사항 및 업무외 주요사항에 대하여 그 경중을 막론하고 누설하지 아니한다. 근로기간이 종료된 이후에도 또한 같다.</p>
    <p class="doc-text">③ "근로자"는 퇴직시 퇴직일로부터 30일 이전에 "사용자"에게 그 사실을 고지하고 업무 인수·인계에 협조한다.</p>
    <p class="doc-text">④ "사용자"는 "근로자"가 위 제①항 또는 제②항을 위반하였을 경우 징계 및 민∙형사상의 조치를 취할 수 있다. 이에 대해 "근로자"는 동의한 것으로 본다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(기타)')}</div>
    <p class="doc-text">기타 본 계약서상 명시되지 않은 사항은 당사의 단체협약, 취업규칙, 근로기준법 및 관계법령에서 정하는 바에 따른다.</p>
    ${c.note ? `<p class="doc-text" style="margin-top:8px;"><strong>【특이사항】</strong> ${c.note}</p>` : ''}
  </div>

  ${isProb ? probSection.replace('__ART_PROB__', art('(수습기간 및 수습임금에 관한 특약)')) : ''}

  <div class="doc-sign-date">
    위와 같이 근로계약을 체결하고 서명날인한다.<br>
    <strong>${contractDateKr}</strong>
  </div>

  <div class="doc-sign">
    <div class="doc-sign-box">
      <div class="sign-title">사업주 (사용자)</div>
      <table class="sign-info-table">
        <tr><th>상호</th><td>${co.company_name||''}</td></tr>
        <tr><th>주소</th><td>${co.address||''}</td></tr>
        <tr><th>대표자</th><td>${co.representative||''}</td></tr>
      </table>
      <div class="sign-stamp-area">
        <div class="sign-stamp"></div>
        <div class="sign-label">(서명 또는 날인)</div>
      </div>
    </div>
    <div class="doc-sign-box">
      <div class="sign-title">근로자</div>
      <table class="sign-info-table">
        <tr><th>성명</th><td>${emp.name||''}</td></tr>
        <tr><th>주소</th><td>${emp.address||''}</td></tr>
        <tr><th>연락처</th><td>${emp.phone||''}</td></tr>
      </table>
      <div class="sign-stamp-area">
        <div class="sign-stamp"></div>
        <div class="sign-label">(서명 또는 날인)</div>
      </div>
    </div>
  </div>
  `;
}

// ─── 통합 배너 초기화 헬퍼 ───
function _resetStatusBanner(){
  const sbEl = document.getElementById('ct-status-banner');
  if(sbEl) sbEl.style.display = 'none';
  const btnEdit    = document.getElementById('ct-sb-btn-edit');
  const btnSave    = document.getElementById('ct-sb-btn-save');
  const btnCancel  = document.getElementById('ct-sb-btn-cancel');
  const btnDestroy = document.getElementById('ct-sb-btn-destroy');
  if(btnEdit)    btnEdit.style.display    = 'inline-flex';
  if(btnSave)    btnSave.style.display    = 'none';
  if(btnCancel)  btnCancel.style.display  = 'none';
  if(btnDestroy) btnDestroy.style.display = 'inline-flex';
}

// ─── 예정 계약 수정 모드 진입 (해지예정 / 계약예정 / 갱신예정 공용) ───
function editPendingContract(){
  const modalEl = document.querySelector('#contract-modal .modal');
  const bodyEl  = modalEl?.querySelector('.modal-body');
  if(!bodyEl) return;

  // readonly 해제 및 입력 활성화
  modalEl.classList.remove('ct-readonly');
  bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    el.disabled = false;
    el.style.background = '';
    el.style.color = '';
    el.style.cursor = '';
  });

  // 배너 버튼 전환: [수정] [파기] → [수정완료] [취소]
  document.getElementById('ct-sb-btn-edit').style.display    = 'none';
  document.getElementById('ct-sb-btn-save').style.display    = 'inline-flex';
  document.getElementById('ct-sb-btn-cancel').style.display  = 'inline-flex';
  document.getElementById('ct-sb-btn-destroy').style.display = 'none';

  // 상단/하단 액션 바 버튼 숨김 (수정 중 혼동 방지)
  ['ct-btn-renew','ct-btn-renew2','ct-btn-void','ct-btn-void2',
   'ct-btn-recontract','ct-btn-recontract2','ct-btn-terminate','ct-btn-terminate2'].forEach(bid=>{
    const el = document.getElementById(bid); if(el) el.style.display='none';
  });

  // 해지예정 계약이면: 퇴사예정일 입력 패널을 수정 가능하게 열어줌
  const c = allContracts.find(x=>x.id===editId.contract);
  if(c?.status === '해지예정'){
    const termPanel = document.getElementById('ct-terminate-panel');
    if(termPanel){
      termPanel.style.display = 'block';
      // 현재 퇴사예정일 값을 패널 input에 세팅
      const termDateInput = document.getElementById('ct-terminate-date');
      if(termDateInput && c.terminate_date) termDateInput.value = c.terminate_date;
      // 패널 내 확정 버튼은 숨기고 안내 문구 변경 (수정완료로 저장)
      const termConfirmBtn = termPanel.querySelector('button.btn-terminate');
      if(termConfirmBtn) termConfirmBtn.style.display = 'none';
      const termCancelBtn = termPanel.querySelector('button.btn-secondary');
      if(termCancelBtn)  termCancelBtn.style.display  = 'none';
    }
  }

  // 모달 제목 변경
  const titleMap = { '해지예정':'근로계약서 수정 (해지예정)', '계약예정':'근로계약서 수정 (계약예정)', '갱신예정':'근로계약서 수정 (갱신예정)' };
  document.getElementById('ct-title').textContent = titleMap[c?.status] || '근로계약서 수정 (예정 계약)';

  // 일괄 설정 바 다시 표시
  const bulkBar = document.getElementById('ct-bulk-bar-wrap');
  if(bulkBar) bulkBar.style.display = '';

  toast('예정 계약을 수정합니다. 변경 후 수정완료를 눌러 저장하세요.');
}

// ─── 예정 계약 수정 취소 ───
function cancelPendingEdit(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(c) viewContract(c.id);  // 조회 모드로 재진입 (원본 데이터로 복원)
}

// ─── 예정 계약 수정완료 저장 ───
async function savePendingContractEdit(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');
  console.log('[savePendingContractEdit] 시작, contract id:', editId.contract);

  // ── 최저임금 위반 차단 (예정 계약 수정 경로) ──
  const _mwWarnRowPend  = document.getElementById('ct-prob-minwage-warning-row');
  const _mwWarnRowPend2 = document.getElementById('ct-general-minwage-warning-row');
  if((_mwWarnRowPend  && _mwWarnRowPend.style.display  !== 'none') ||
     (_mwWarnRowPend2 && _mwWarnRowPend2.style.display !== 'none')){
    openModal('ct-minwage-warn-modal');
    return;
  }

  // 현재 폼에서 수정된 값을 수집 (saveContract 로직에서 필요한 필드만)
  const newStart = document.getElementById('ct-start')?.value || c.contract_start;
  const newEnd   = document.getElementById('ct-end')?.value   || '';
  const today3   = new Date().toISOString().slice(0,10);

  // 시작일 유효성
  if(!newStart) return toast('계약 시작일을 입력해 주세요.','error');

  // ── 상태 재결정 ──
  let newStatus = c.status;
  const isPreTermEdit = (c.status === '해지예정');

  if(isPreTermEdit){
    // 해지예정 수정: terminate_date(퇴사예정일) 재평가
    const newTermDate = document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
    if(newTermDate && newTermDate <= today3){
      newStatus = '해지';       // 퇴사예정일이 오늘 이하이면 즉시 해지
    } else if(newTermDate){
      newStatus = '해지예정';   // 퇴사예정일이 미래면 해지예정 유지
    } else {
      newStatus = '활성';       // 퇴사예정일을 지웠으면 활성 복귀
    }
  } else {
    // 계약예정 / 갱신예정: 시작일 기준
    if(newStart <= today3){
      newStatus = '활성';
    }
    // 종료일이 이미 지났으면 만료
    if(newEnd && newEnd < today3){
      newStatus = '만료';
    }
  }

  // 수정 페이로드 구성 (스케줄·급여 등 모든 폼 필드 수집)
  const scheduleJSON = (typeof getScheduleJSON === 'function') ? getScheduleJSON() : [];
  const workDaysCount = parseInt(document.getElementById('ct-days')?.value)||0;
  const avgDayHours   = parseFloat(document.getElementById('ct-hours')?.value)||0;

  // 급여 관련
  function getAmtVal(id){ const el=document.getElementById(id); if(!el)return 0; const v=el.value.replace(/[^\d]/g,''); return parseInt(v)||0; }
  const _pendCtType   = c.contract_type || '정규직';
  const _pendIsReg    = _pendCtType==='정규직' || _pendCtType==='정규직 수습';
  const _pendIsFixed  = _pendCtType==='계약직' || _pendCtType==='계약직 수습';
  const _pendIsDaily  = _pendCtType==='일용직';
  const annualSalInputPend = getAmtVal('ct-annual-sal'); // 정규직:연봉 / 계약직:월약정급여
  const annual    = _pendIsReg ? annualSalInputPend : 0;  // annual_salary에는 정규직만 저장
  const baseSal   = _pendIsDaily ? 0 : getAmtVal('ct-base');
  // 주휴수당은 자동계산 표시값에서 읽기
  const weeklyHolEl = document.getElementById('ct-weekly-hol-computed');
  const weeklyHol = weeklyHolEl ? (parseFloat(weeklyHolEl.textContent.replace(/[^\d]/g,''))||0) : 0;
  // 월 약정임금: 계약직→월약정급여 입력값, 정규직→연봉÷12
  const _pendMonthly = _pendIsDaily ? 0
    : _pendIsFixed && annualSalInputPend > 0 ? annualSalInputPend
    : _pendIsReg   && annualSalInputPend > 0 ? Math.round(annualSalInputPend / 12)
    : (baseSal + weeklyHol);

  const body = {
    contract_start:        newStart,
    contract_end:          newEnd,
    status:                newStatus,
    work_hours_per_day:    avgDayHours,
    work_days_per_week:    workDaysCount,
    schedule_json:         JSON.stringify(scheduleJSON),
    annual_leave_days:     parseFloat(document.getElementById('ct-annual')?.value)||15,
    annual_salary:         annual,
    monthly_salary_agreed: _pendMonthly,
    base_salary:           baseSal,
    weekly_holiday_pay:    weeklyHol,
    fixed_ot_pay:          getAmtVal('ct-fixed-ot-pay'),
    fixed_ot_hours:        parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0,
    fixed_night_pay:       getAmtVal('ct-fixed-night-pay'),
    fixed_night_hours:     parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0,
    fixed_hol_pay:         getAmtVal('ct-fixed-hol-pay'),
    fixed_hol_hours:       parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0,
    position_allowance:    getAmtVal('ct-position'),
    car_maintenance:       getAmtVal('ct-car'),
    meal_allowance:        getAmtVal('ct-meal'),
    other_allowance:       getAmtVal('ct-other'),
    site_allowance:        getAmtVal('ct-site'),
    skill_allowance:       getAmtVal('ct-skill'),
    license_allowance:     getAmtVal('ct-license'),
    communication_allowance: getAmtVal('ct-communication'),
    fitness_allowance:     getAmtVal('ct-fitness'),
    self_dev_allowance:    getAmtVal('ct-self-dev'),
    book_allowance:        getAmtVal('ct-book'),
    overseas_allowance:    getAmtVal('ct-overseas'),
    note:                  document.getElementById('ct-note')?.value||'',
    salary_start_date:     document.getElementById('ct-start')?.value || '',  // contract_start 와 동일값 (통합)
    salary_end_date:       '',
    is_draft:              false,
    // 해지예정 수정 시 terminate_date 업데이트 (해지예정이 아닌 상태로 변경되면 비움)
    terminate_date: (()=>{
      if(c.status === '해지예정'){
        return document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
      }
      return c.terminate_date || '';
    })(),
  };

  try {
    await api(`../tables/contracts/${c.id}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...c, ...body, id: c.id})
    });

    // 직원 정보도 함께 업데이트 (수정 모드와 동일)
    const editEmpId = c.employee_id;
    if(editEmpId){
      const empPatch = {};
      const genderEl  = document.getElementById('ct-edit-em-gender');
      const jobEl     = document.getElementById('ct-edit-em-job');
      const deptEl    = document.getElementById('ct-edit-em-dept');
      const posEl     = document.getElementById('ct-edit-em-position');
      const phoneEl   = document.getElementById('ct-edit-em-phone');
      const idEl      = document.getElementById('ct-edit-em-id');
      const depsEl    = document.getElementById('ct-edit-em-dependents');
      const addrEl    = document.getElementById('ct-edit-em-address');
      const nameEl2 = document.getElementById('ct-edit-emp-name');
      const catEl2  = document.getElementById('ct-edit-em-category');
      if(nameEl2 && !nameEl2.readOnly && nameEl2.value.trim()) empPatch.name = nameEl2.value.trim();
      if(catEl2  && !catEl2.disabled  && catEl2.value)         empPatch.employment_category = catEl2.value;
      if(genderEl)  empPatch.gender            = genderEl.value;
      if(jobEl)     empPatch.job_description   = jobEl.value;
      if(deptEl)    empPatch.department        = deptEl.value;
      if(posEl)     empPatch.position          = posEl.value;
      if(phoneEl && phoneEl.value.trim()) empPatch.phone = phoneEl.value.trim();
      if(idEl)      empPatch.id_number         = idEl.value;
      if(depsEl)    empPatch.dependents        = parseInt(depsEl.value)||0;
      if(addrEl)    empPatch.address           = addrEl.value;
      const emailEl = document.getElementById('ct-edit-em-email');
      if(emailEl)   empPatch.email             = emailEl.value;
      const empnoEl = document.getElementById('ct-edit-em-empno');
      if(empnoEl && empnoEl.value.trim()) empPatch.employee_number = empnoEl.value.trim();
      if(Object.keys(empPatch).length){
        await api(`../tables/employees/${editEmpId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(empPatch)});
      }
    }

    // ── 고객사 인앱 알림 발송 (예정 계약 수정) ──
    {
      const _pendEmp = allEmployees.find(x => x.id === c.employee_id) || {};
      const _pendCo  = allCompanies.find(x => x.id === c.company_id)  || {};
      const _coRep   = _pendCo.representative ? `, ${_pendCo.representative} 사장님` : '';
      const _fmtD    = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
      if(isPreTermEdit && newStatus === '해지예정'){
        // 해지 예약
        const _termDate = document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
        await _sendCompanyNotice({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_termination_scheduled',
          title      : `[해지 예약] ${_pendEmp.name||''} — 계약 해지가 예약되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 해지가 예약 처리되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ''}
■ 퇴사 예정일: ${_fmtD(_termDate)}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : c.id,
          employeeId  : c.employee_id, employeeName: _pendEmp.name || '',
          contractEnd : c.contract_end || '',
        });
      } else if(isPreTermEdit && newStatus === '해지'){
        // 해지예정 → 즉시 해지로 전환
        await _sendCompanyNotice({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_terminated',
          title      : `[계약 해지] ${_pendEmp.name||''} — 근로계약이 해지되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 해지 처리되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ''}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : c.id,
          employeeId  : c.employee_id, employeeName: _pendEmp.name || '',
          contractEnd : c.contract_end || '',
        });
      } else {
        // 일반 예정 계약 수정 (계약예정/갱신예정 날짜 수정 등)
        await _sendCompanyNotice({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_updated',
          title      : `[계약 수정] ${_pendEmp.name||''} — 근로계약이 수정되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약 내용이 수정되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(newStart)}${newEnd ? ' ~ ' + _fmtD(newEnd) : ' (기간 미정)'}
■ 계약 상태: ${newStatus}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : c.id,
          employeeId  : c.employee_id, employeeName: _pendEmp.name || '',
          contractEnd : newEnd,
        });
      }
    }
    closeModal('contract-modal');
    await loadContracts(); await loadEmployees(); renderContracts(); renderDashboard();
    const statusLabelMap = {'활성':'계약유효 (활성)','해지예정':'해지예정 유지','해지':'해지 처리됨','만료':'만료','계약예정':'계약예정','갱신예정':'갱신예정'};
    const statusLabel = statusLabelMap[newStatus] || newStatus;
    toast(`계약이 수정됐습니다. 상태: ${statusLabel}`);
  } catch(e){
    toast('수정 저장 중 오류가 발생했습니다.','error');
    console.error(e);
  }
}

// ─── 배너 파기/해지취소 버튼 라우터 ───
async function doContractVoidOrCancel(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;
  if(c.status === '해지예정'){
    // 해지예정 → 해지 취소 (활성으로 복귀)
    await cancelPreTerminate();
  } else {
    // 계약예정 / 갱신예정 → 레코드 삭제 (파기 기록 없이 제거)
    await cancelPendingContract();
  }
}

// ─── 해지예정 취소 (활성으로 복귀) ───
async function cancelPreTerminate(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;

  const ct       = c.contract_type || '';
  const isFixed  = (ct==='계약직'||ct==='계약직 수습'||ct==='일용직');
  const emp      = allEmployees.find(e=>e.id===c.employee_id)||{};
  const empName  = emp.name || '';
  const termDate = c.terminate_date || '';

  // 계약직/정규직 구분 메시지
  const typeLabel  = isFixed ? '조기 해지 예정' : '퇴사예정';
  const dateLabel  = termDate ? `\n${typeLabel}일: ${termDate}` : '';
  const extraMsg   = isFixed
    ? '\n\n해지 예정이 취소되고 계약이 계약유효 상태로 복귀됩니다.\n직원의 퇴직예정일(resign_date)도 함께 초기화됩니다.'
    : '\n\n퇴사예정일 설정을 해제하고 계약을 활성 상태로 되돌립니다.\n직원의 퇴직예정일(resign_date)도 함께 초기화됩니다.';

  if(!confirm(`[${typeLabel} 취소]${empName ? `\n\n직원: ${empName}` : ''}${dateLabel}${extraMsg}\n\n진행하시겠습니까?`)) return;

  // 1) 계약 상태 복귀
  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status:'활성', terminate_date:''})});

  // 2) 직원 resign_date 초기화 (status는 재직 상태 유지 — 이미 퇴직으로 바뀐 경우는 재직으로 복귀)
  if(emp.id){
    const empPatch = emp.status === '퇴직'
      ? {status:'재직', resign_date:''}
      : {resign_date:''};
    await api(`../tables/employees/${emp.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(empPatch)});
  }

  // ── 고객사 인앱 알림 발송 (해지 예정 취소) ──
  {
    const _cptCo  = allCompanies.find(x => x.id === c.company_id) || {};
    const _coRep  = _cptCo.representative ? `, ${_cptCo.representative} 사장님` : '';
    const _fmtD   = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    await _sendCompanyNotice({
      companyId  : c.company_id, companyName: _cptCo.company_name || '',
      noticeType : 'contract_termination_cancelled',
      title      : `[해지 예정 취소] ${empName} — 계약 해지 예정이 취소되었습니다`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 해지 예정이 취소되어 기존 계약이 정상 유효 상태로 복귀되었습니다.

■ 근로자: ${empName}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ' (기간 미정)'}
■ 취소된 ${typeLabel}일: ${termDate ? _fmtD(termDate) : '-'}
■ 현재 계약 상태: 계약유효 (활성) 복귀
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
      contractId  : c.id,
      employeeId  : c.employee_id, employeeName: empName,
      contractEnd : c.contract_end || '',
    });
  }

  closeModal('contract-modal');
  await Promise.all([loadContracts(), loadEmployees()]);
  renderContracts(); renderDashboard();
  toast(`${typeLabel} 취소 완료 — 계약이 활성 상태로 복귀됐습니다.`, 'success');
}

// ─── 계약예정·갱신예정 취소 플로우 (레코드 삭제) ───
async function cancelPendingContract(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;

  // 시작일 당일부터 취소 불가
  const _todayCancel = new Date().toISOString().slice(0,10);
  if(c.contract_start && _todayCancel >= c.contract_start){
    toast(`계약 시작일(${c.contract_start}) 이후에는 예정 계약을 취소할 수 없습니다.`, 'error');
    return;
  }

  const isRenew     = (c.status==='갱신예정')
                   || ((c.status==='활성'||c.status==='유효'||c.status==='active') && (c.contract_start||'') > new Date().toISOString().slice(0,10));
  const statusLabel = isRenew ? '갱신예정' : '계약예정';
  const emp         = allEmployees.find(e=>e.id===c.employee_id)||{};
  const empName     = emp.name || '';

  if(!confirm(
    `[${statusLabel} 취소]${empName ? `\n\n직원: ${empName}` : ''}\n` +
    `계약 시작일: ${c.contract_start||'—'}\n\n` +
    `아직 시작되지 않은 계약을 취소합니다.\n` +
    `취소된 계약은 목록에서 삭제되며 별도로 보관하지 않습니다.\n\n` +
    `진행하시겠습니까?`
  )) return;

  // 갱신 취소 시: 이전 계약(만료 처리됐던 것)을 활성으로 복귀시켜야 하는지 확인
  // note 필드에 '전계약:' 패턴이 있으면 해당 계약 ID를 복원
  const prevContractMatch = (c.note||'').match(/전계약:([^\s)]+)/);
  if(isRenew && prevContractMatch){
    const prevId = prevContractMatch[1];
    const prevC  = allContracts.find(x=>x.id===prevId);
    if(prevC && prevC.status==='만료'){
      // 이전 계약을 활성 상태로 복귀
      await api(`../tables/contracts/${prevId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status:'활성', contract_end: prevC.contract_end||''})});
    }
  }

  // 해당 계약 레코드 삭제
  await api(`../tables/contracts/${c.id}`,{method:'DELETE'});

  closeModal('contract-modal');
  await Promise.all([loadContracts(), loadEmployees()]);
  renderContracts(); renderDashboard();
  toast(`${statusLabel} 취소 완료 — 계약이 삭제됐습니다.`, 'success');
}

// ─── 파기 플로우 (수정재발행 등 명시적 파기 전용 — 배너 경로에서는 더 이상 사용 안 함) ───
async function doContractVoid(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;
  const statusLabel = c.status==='갱신예정' ? '갱신예정' : '계약예정';

  if(!confirm(`정말 이 계약을 파기하시겠습니까?\n\n[${statusLabel}] 상태의 계약을 파기합니다.\n파기된 계약은 복구할 수 없으며, 계약이 성립되지 않은 것으로 처리됩니다.`)) return;

  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status:'파기'})});

  // ── 고객사 인앱 알림 발송 (계약 파기) ──
  {
    const _voidEmp = allEmployees.find(x => x.id === c.employee_id) || {};
    const _voidCo  = allCompanies.find(x => x.id === c.company_id)  || {};
    const _coRep   = _voidCo.representative ? `, ${_voidCo.representative} 사장님` : '';
    const _fmtD    = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    await _sendCompanyNotice({
      companyId  : c.company_id, companyName: _voidCo.company_name || '',
      noticeType : 'contract_voided',
      title      : `[계약 파기] ${_voidEmp.name||''} — 근로계약이 파기되었습니다`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 파기 처리되었습니다.

■ 근로자: ${_voidEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ' (기간 미정)'}
■ 파기 사유: ${statusLabel} 상태의 계약 파기
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
      contractId  : c.id,
      employeeId  : c.employee_id, employeeName: _voidEmp.name || '',
      contractEnd : c.contract_end || '',
    });
  }

  closeModal('contract-modal');
  await loadContracts(); renderContracts(); renderDashboard();
  toast('계약이 파기 처리됐습니다.');
}

// ─── 갱신 플로우 ───
function doContractRenew(){
  // 패널 토글
  document.getElementById('ct-terminate-panel').style.display = 'none';
  const rp = document.getElementById('ct-renew-panel');
  rp.style.display = rp.style.display==='none' ? 'block' : 'none';
  if(rp.style.display==='block'){
    const today    = new Date().toISOString().slice(0,10);
    const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
    const c = allContracts.find(x=>x.id===editId.contract)||{};
    // 기존 계약 종료일 기본값: 계약서에 등록된 종료일 또는 오늘
    document.getElementById('ct-renew-old-end').value   = c.contract_end || today;
    document.getElementById('ct-renew-new-start').value = tomorrow;
    document.getElementById('ct-renew-old-end').disabled  = false;
    document.getElementById('ct-renew-new-start').disabled= false;
    setTimeout(()=>rp.scrollIntoView({behavior:'smooth',block:'center'}),100);
  }
}
async function confirmContractRenew(){
  const oldEnd   = document.getElementById('ct-renew-old-end').value;
  const newStart = document.getElementById('ct-renew-new-start').value;
  if(!oldEnd)   return toast('기존 계약 종료일을 입력하세요.','error');
  if(!newStart) return toast('신규 계약 시작일을 입력하세요.','error');

  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');

  const today = new Date().toISOString().slice(0,10);
  const origEnd = c.contract_end || '';

  // 종료일이 원래보다 앞당겨졌는지 확인 → 연장(만료)이 아닌 단축 경고
  if(origEnd && oldEnd < origEnd){
    if(!confirm(`기존 계약 종료일(${origEnd})보다 앞당겨진 날짜(${oldEnd})입니다.\n계약 종료일 단축은 [해지] 처리를 권장합니다.\n그래도 계속 진행하시겠습니까?`)) return;
  }

  // 1. 기존 계약: 종료일 확정 + 상태 '만료' (후속 계약이 이어지므로 만료 처리)
  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contract_end: oldEnd, status:'만료'})});

  // 2. 신규 계약 생성 (기존 조건 복사)
  //    - 시작일이 오늘 이후면 '계약예정', 오늘이거나 이전이면 '활성'
  const newStatus = newStart > today ? '계약예정' : '활성';
  const newId = 'cont'+Date.now();
  const newContract = Object.assign({}, c, {
    id: newId,
    contract_start: newStart,
    contract_end:   '',          // 정규직 연장: 새 종료일 없음
    status:         newStatus,
    is_draft:       false,
    terminate_date: '',
    note: (c.note?c.note+' / ':'') + `연장계약 (전계약:${c.id})`
  });
  // API 시스템 필드 제거
  ['gs_project_id','gs_table_name','created_at','updated_at','deleted'].forEach(k=>delete newContract[k]);
  await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newContract)});

  // ── 고객사 인앱 알림 발송 (갱신/갱신예약) ──
  {
    const _renewEmp = allEmployees.find(x => x.id === c.employee_id) || {};
    const _renewCo  = allCompanies.find(x => x.id === c.company_id)  || {};
    const _coRep    = _renewCo.representative ? `, ${_renewCo.representative} 사장님` : '';
    const _fmtD     = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    if(newStatus === '계약예정'){
      // 갱신 예약
      await _sendCompanyNotice({
        companyId  : c.company_id, companyName: _renewCo.company_name || '',
        noticeType : 'contract_renewal_scheduled',
        title      : `[갱신 예약] ${_renewEmp.name||''} — 계약 갱신이 예약되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 갱신이 예약되었습니다.

■ 근로자: ${_renewEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 기존 계약 종료일: ${_fmtD(oldEnd)}
■ 새 계약 시작일: ${_fmtD(newStart)} (시작일 미도래 — 계약예정)
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : newId,
        employeeId  : c.employee_id, employeeName: _renewEmp.name || '',
        contractEnd : '',
      });
    } else {
      // 갱신 (즉시 활성)
      await _sendCompanyNotice({
        companyId  : c.company_id, companyName: _renewCo.company_name || '',
        noticeType : 'contract_renewed',
        title      : `[계약 갱신] ${_renewEmp.name||''} — 계약이 갱신되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 갱신이 완료되었습니다.

■ 근로자: ${_renewEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 기존 계약 종료일: ${_fmtD(oldEnd)}
■ 새 계약 시작일: ${_fmtD(newStart)}
■ 계약 상태: 계약유효 (활성)
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : newId,
        employeeId  : c.employee_id, employeeName: _renewEmp.name || '',
        contractEnd : '',
      });
    }
  }

  closeModal('contract-modal');
  await loadContracts(); await loadEmployees(); renderContracts(); renderDashboard();
  const label = newStatus === '계약예정' ? '계약예정 (시작일 미도래)' : '계약유효 (활성)';
  toast(`연장 처리 완료. 전 계약: 만료 / 새 계약: ${label}`);
}

// ─── 재계약 플로우 ───
function doContractRecontract(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;
  // 기존 계약 데이터를 복사해서 편집 가능한 새 계약 모달 열기
  // 임시 플래그로 "재계약 모드" 표시
  _recontractSourceId = c.id;
  closeModal('contract-modal');
  // 잠시 후 새 계약 모달 오픈 (신규 모드 + 프리셋)
  setTimeout(()=>openRecontractModal(c), 50);
}
let _recontractSourceId = null;
function openRecontractModal(srcContract){
  // 동일 회사 기준 신규 계약 모달 오픈 (신규 모드)
  openContractModal(null, srcContract.company_id);

  // 신규 모드에서 기존 계약 데이터로 필드 채우기
  const emp = allEmployees.find(e=>e.id===srcContract.employee_id)||{};

  // 직원 섹션 → 수정 직원 섹션으로 전환
  document.getElementById('ct-new-emp-section').style.display = 'none';
  document.getElementById('ct-edit-emp-info').style.display = 'block';
  // 계약 시작일·종료일·고용형태·계약상태는 수정 모드 섹션 내부에 있으므로 별도 제어 불필요

  // 직원 정보 채우기
  document.getElementById('ct-edit-emp-name').value = emp.name||'';
  // 재계약: 고용형태는 직원 인사정보(employment_category) 기준
  const rcCtType = (emp && emp.employment_category) || srcContract.contract_type || '정규직';
  const rcIsFixed = (rcCtType==='계약직'||rcCtType==='계약직 수습'||rcCtType==='일용직');
  if(emp){
    document.getElementById('ct-edit-em-gender').value     = emp.gender||'남';
    (function(){ const _h=document.getElementById('ct-edit-em-gender-hint'); if(_h){ _h.textContent='주민번호 입력 시 자동 설정됩니다'; _h.style.color='#6b7280'; } })();
    document.getElementById('ct-edit-em-category').value = emp.employment_category||'';
    document.getElementById('ct-edit-em-job').value        = emp.job_description||'';
    document.getElementById('ct-edit-em-dept').value       = emp.department||'';
    document.getElementById('ct-edit-em-position').value   = emp.position||'';
    // 계약직/일용직: 입사일·퇴사예정일 행 숨김 (계약 시작일·종료일과 동일)
    // 정규직/정규직 수습: 무기한 계약이므로 퇴사예정일 행 숨김
    const rcIsRegular = (rcCtType==='정규직'||rcCtType==='정규직 수습');
    const rcHireRow   = document.getElementById('ct-edit-row-hire');
    const rcExpRow    = document.getElementById('ct-edit-row-expire');
    const rcEndRow    = document.getElementById('ct-row-end');
    if(rcHireRow)   rcHireRow.style.display   = rcIsFixed ? 'none' : '';
    // 정규직이면 퇴사예정일 숨김, 계약직이면 입사일과 함께 숨김
    if(rcExpRow)    rcExpRow.style.display    = (rcIsFixed || rcIsRegular) ? 'none' : '';
    // 정규직이면 계약 종료일도 숨김
    if(rcEndRow)    rcEndRow.style.display    = rcIsRegular ? 'none' : '';
    // 입사일: 고용형태에 무관하게 항상 채움 (유효성 검사 통과 + hire_date 갱신 목적)
    const _rcEarliestStart = getEarliestContractStart(emp.id);
    document.getElementById('ct-edit-em-hire').value = _rcEarliestStart || emp.hire_date || '';
    if(!rcIsFixed && !rcIsRegular){
      document.getElementById('ct-edit-em-expire').value = emp.expire_date||emp.resign_date||'';
    }
    document.getElementById('ct-edit-em-id').value         = emp.id_number||'';
    const _editDepEl3=document.getElementById('ct-edit-em-dependents'); if(_editDepEl3) _editDepEl3.value = (emp.dependents ?? 0) < 1 ? 1 : emp.dependents;
    document.getElementById('ct-edit-em-phone').value      = emp.phone||'';
    document.getElementById('ct-edit-em-address').value    = emp.address||'';
    document.getElementById('ct-edit-em-bank').value       = emp.bank_name||'';
    document.getElementById('ct-edit-em-account').value    = emp.bank_account||'';
  }

  // 계약 조건 복사
  document.getElementById('ct-start').value   = '';
  document.getElementById('ct-type').value    = rcCtType; toggleCtEndDate(true);
  document.getElementById('ct-end').value     = srcContract.contract_end||'';
  document.getElementById('ct-status').value  = '활성';
  document.getElementById('ct-annual').value  = srcContract.annual_leave_days||15;
  // 요일별 스케줄 복원 (재계약: 이전 계약 스케줄 그대로 복사)
  if(srcContract.schedule_json){
    try{ setScheduleFromJSON(JSON.parse(srcContract.schedule_json)); }
    catch(e){ setScheduleFromLegacy(srcContract); }
  } else {
    setScheduleFromLegacy(srcContract);
  }

  const ct = srcContract.contract_type||'정규직';
  const isDailySrc    = ct==='일용직';
  const isRegSrc      = ct==='정규직'||ct==='정규직 수습';
  const isFixedSrc    = ct==='계약직'||ct==='계약직 수습';
  const isProbSrc     = ct==='정규직 수습'||ct==='계약직 수습';
  const showSalSrc    = isRegSrc || isFixedSrc; // 연봉/월약정급여 행 표시 여부

  const rowA=document.getElementById('ct-row-annual-sal'); const rowM=document.getElementById('ct-row-monthly');
  if(rowA) rowA.style.display=showSalSrc?'':'none';
  if(rowM) rowM.style.display=showSalSrc?'':'none';
  const rowDaysS=document.getElementById('ct-row-days'); const rowAnnualS=document.getElementById('ct-row-annual');
  const rowBaseS=document.getElementById('ct-row-base'); const rowWeeklyS=document.getElementById('ct-row-weekly-hol');
  const rowDailyS=document.getElementById('ct-row-daily-wage');
  if(rowDaysS)   rowDaysS.style.display  = isDailySrc?'none':'';
  if(rowAnnualS) rowAnnualS.style.display= isDailySrc?'none':'';
  if(rowBaseS)   rowBaseS.style.display  = isDailySrc?'none':'';
  if(rowWeeklyS) rowWeeklyS.style.display= isDailySrc?'none':'';
  if(rowDailyS)  rowDailyS.style.display = isDailySrc?'':'none';

  const probSec=document.getElementById('ct-probation-section');
  if(probSec) probSec.style.display=isProbSrc?'':'none';
  if(isProbSrc){
    document.getElementById('ct-probation-months').value=srcContract.probation_months||3;
    document.getElementById('ct-probation-pct').value=srcContract.probation_pct||'';
    document.getElementById('ct-probation-amt').value=srcContract.probation_amt||'';
    // 산정기준 라디오 복원
    const _basisSrc = srcContract.probation_basis || 'salary';
    const _rbSrc = document.querySelector(`input[name="ct-probation-basis"][value="${_basisSrc}"]`);
    if(_rbSrc){ _rbSrc.checked = true; }
    onProbationBasisChange();
  }

  if(isDailySrc){
    setAmountVal('ct-daily-wage', srcContract.daily_wage||srcContract.base_salary||0);
    setAmountVal('ct-base', 0);
  } else if(isFixedSrc){
    // 계약직: ct-annual-sal에 월약정급여(monthly_salary_agreed) 복원
    setAmountVal('ct-annual-sal', srcContract.monthly_salary_agreed||0);
    setAmountVal('ct-base',       srcContract.base_salary);
  } else {
    // 정규직: ct-annual-sal에 연봉(annual_salary) 복원
    setAmountVal('ct-annual-sal', srcContract.annual_salary||0);
    setAmountVal('ct-base',       srcContract.base_salary);
  }
  setAmountVal('ct-position',    srcContract.position_allowance||0);
  // 차량지원비 = 구 교통비 + 구 자가운전보조금 합산 (레거시 하위호환)
  setAmountVal('ct-car', (parseFloat(srcContract.transportation_allowance||srcContract.car_maintenance||0)) + (parseFloat(srcContract.self_driving_allowance||0)));
  setCTPayType('car', srcContract.transportation_pay_type||srcContract.self_driving_pay_type||'fixed');
  setAmountVal('ct-remote-area', srcContract.remote_area_allowance||0);
  // remote-area는 통상임금 항상 포함 — pay_type 세팅 불필요
  setAmountVal('ct-meal',        srcContract.meal_allowance||200000);
  setCTPayType('meal',           srcContract.meal_pay_type||'fixed');
  setAmountVal('ct-research',    srcContract.research_allowance||0);
  setCTPayType('research',       srcContract.research_pay_type||'fixed');
  setAmountVal('ct-site',        srcContract.site_allowance||0);
  setAmountVal('ct-skill',       srcContract.skill_allowance||0);
  setAmountVal('ct-license',     srcContract.license_allowance||0);
  setAmountVal('ct-communication',srcContract.communication_allowance||0);
  setCTPayType('communication',  srcContract.communication_pay_type||'fixed');
  setAmountVal('ct-fitness',     srcContract.fitness_allowance||0);
  setCTPayType('fitness',        srcContract.fitness_pay_type||'fixed');
  setAmountVal('ct-self-dev',    srcContract.self_dev_allowance||0);
  setCTPayType('self_dev',       srcContract.self_dev_pay_type||'fixed');
  setAmountVal('ct-book',        srcContract.book_allowance||0);
  setCTPayType('book',           srcContract.book_pay_type||'fixed');
  setAmountVal('ct-overseas',    srcContract.overseas_allowance||0);
  setCTPayType('overseas',       srcContract.overseas_pay_type||'fixed');
  setAmountVal('ct-childcare',   srcContract.childcare_allowance||0);
  { const _ccDep3 = document.getElementById('ct-childcare-dependents');
    if(_ccDep3) _ccDep3.value = srcContract.childcare_dependents || 1; }
  // custom_allowances 복원 (재계약)
  { const _ca3 = _parseCTCustomAllowances(srcContract);
    Object.entries(_ca3).forEach(([k,v]) => setAmountVal(`ct-${k}`, v||0)); }
  document.getElementById('ct-note').value = '';
  calcContractSalary();

  document.getElementById('ct-title').textContent = '재계약 (신규 계약서)';
  // 재계약 모드: 이름·주민번호·성별은 잠금, 고용형태는 변경 가능
  _setEditNameCategoryLock(true, false);
  // _prevEditCategory를 현재 값으로 초기화 (모달 열릴 때 Alert 방지)
  _prevEditCategory = document.getElementById('ct-edit-em-category')?.value || '';
  // saveContract 재계약 플래그 저장
  _recontractEmpId = srcContract.employee_id;
}
let _recontractEmpId = null;

// ─── 종료 플로우 ───
function doContractTerminate(){
  document.getElementById('ct-renew-panel').style.display = 'none';
  const tp = document.getElementById('ct-terminate-panel');
  tp.style.display = tp.style.display==='none' ? 'block' : 'none';
  if(tp.style.display==='block'){
    const c = allContracts.find(x=>x.id===editId.contract)||{};
    const dateEl = document.getElementById('ct-terminate-date');
    // 이미 해지예정일(terminate_date)이 설정된 경우 그 값으로, 없으면 빈값
    // contract_end(계약만료일)는 건드리지 않음
    dateEl.value = c.terminate_date || '';
    dateEl.disabled = false;
    setTimeout(()=>tp.scrollIntoView({behavior:'smooth',block:'center'}),100);
  }
}
async function confirmContractTerminate(){
  // 정규직 전용: 퇴사예정일 입력 → 해지예정 또는 해지 처리
  // contract_end(원래 계약만료일)는 절대 변경하지 않음
  // terminate_date 필드에만 해지예정일 저장
  const termDate = document.getElementById('ct-terminate-date').value;
  if(!termDate) return toast('퇴사예정일을 선택하세요.','error');

  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');
  const today = new Date().toISOString().slice(0,10);

  // 계약 만료일(contract_end)보다 이후 날짜는 입력 불가
  if(c.contract_end && termDate >= c.contract_end){
    return toast(`해지예정일은 계약 만료일(${c.contract_end}) 이전이어야 합니다.`, 'error');
  }

  // 미래 날짜 → 해지예정, 오늘 이하 → 즉시 해지
  const newStatus = termDate > today ? '해지예정' : '해지';

  // contract_end 는 유지, terminate_date 에만 해지예정일 기록
  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({terminate_date: termDate, status: newStatus})});

  // 퇴사예정일 → 직원 resign_date 기록 (퇴사 처리는 실제 해지 시)
  const emp = allEmployees.find(e=>e.id===c.employee_id);
  if(emp){
    const empPatch = newStatus==='해지'
      ? {status:'퇴직', resign_date: termDate}
      : {resign_date: termDate};  // 예정만 기록, 재직 상태 유지
    await api(`../tables/employees/${emp.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(empPatch)});
  }

  closeModal('contract-modal');
  await loadContracts(); await loadEmployees(); renderContracts(); renderDashboard();
  toast(`퇴사예정일(${termDate})이 설정됐습니다. 계약 상태: ${newStatus}`);
}

function editContract(id){openContractModal(id)}

/**
 * 서류미비 계약에서 호출: contract-modal 없이 contract-preview-modal만 독립으로 열어
 * 서류 업로드 탭으로 바로 이동한다.
 * - 근로계약 목록 '서류 업로드' 버튼, 대시보드·근로계약 관리 알림 카드 항목 클릭에서 공통 사용
 * - 업로드 완료 후 닫힐 때: renderContracts() 새로고침 (목록 복귀)
 */
function openContractForUpload(contractId){
  if(!contractId) return;
  const c = allContracts.find(x => x.id === contractId);
  if(!c){ toast('계약 정보를 찾을 수 없습니다.', 'error'); return; }

  // 업로드 전용 모드 플래그 설정
  window._docUploadContractId = contractId;

  // 파일 업로드 상태 초기화
  _resetUploadState();

  // 최종 등록 버튼을 '서류 저장' 전용으로 교체
  const finalBtn = document.getElementById('cp-btn-final');
  if(finalBtn){
    finalBtn.disabled = false;
    finalBtn.innerHTML = '<i class="fas fa-save"></i> 서류 저장';
    finalBtn.onclick   = _saveDocUploadOnly;
  }
  _updateFinalBtn();

  // 계약서 미리보기 HTML 생성 (viewContract 방식으로 폼 채운 뒤 generateContractHTML 사용)
  // → contract-modal 자체는 열지 않고 숨긴 상태로 데이터만 채운다
  _fillContractFormSilent(contractId);
  let html = '';
  try { html = generateContractHTML(); } catch(e){ html = '<p style="padding:20px;color:#6b7280;">계약서 미리보기를 생성할 수 없습니다.</p>'; }
  document.getElementById('ct-print-area').innerHTML = html;

  // 헤더 제목 변경
  const hdr = document.querySelector('#contract-preview-modal h3');
  if(hdr){
    const emp = allEmployees.find(x => x.id === c.employee_id);
    hdr.innerHTML = `<i class="fas fa-upload" style="margin-right:6px;"></i>서류 업로드 — ${emp ? emp.name : ''}`;
  }
  // 뒤로 버튼 → '닫기'로 변경
  const backBtn = document.getElementById('cp-btn-back');
  if(backBtn) backBtn.textContent = '✕ 닫기';

  // 업로드 탭으로 시작 — showCpTab으로 body display + 탭 버튼 active 클래스 동시 처리
  showCpTab('upload');
  document.getElementById('contract-preview-modal').classList.add('open');

  // 스크롤 최상단
  requestAnimationFrame(() => {
    const _uploadBody = document.getElementById('cp-body-upload');
    if(_uploadBody) _uploadBody.scrollTo({ top: 0, behavior: 'instant' });
    const _previewModal = document.querySelector('#contract-preview-modal .contract-preview-modal');
    if(_previewModal) _previewModal.scrollTo({ top: 0, behavior: 'instant' });
  });
}

/**
 * openContractForUpload 전용: contract-modal을 열지 않고 폼 데이터만 채운다.
 * generateContractHTML()이 _collectContractData()를 쓰므로 폼이 채워져 있어야 함.
 */
function _fillContractFormSilent(contractId){
  // openContractModal이 모달을 여는 함수이므로, 호출 후 즉시 다시 닫는다
  openContractModal(contractId);
  // contract-modal 오버레이를 즉시 닫아 화면에 표시되지 않도록 한다
  const overlay = document.getElementById('contract-modal');
  if(overlay) overlay.classList.remove('open');
}
function loadCtEmployees(preselect=null){
  // 직원 드롭다운 제거됨 - 회사 변경 시 불필요한 동작 없음
  // 고객사 변경 → 옵셔널 수당 show/hide 적용
  // 신규 모드(editId.contract 없음)에서는 숨기는 항목의 값도 초기화
  const coId = document.getElementById('ct-company')?.value;
  const co   = coId ? (allCompanies||[]).find(x=>x.id===coId) : null;
  const isEditMode = !!editId?.contract;
  applyCTAllowanceConfig(co?.allowance_config ?? null, !isEditMode);
}

// ══════════════════════════════════════════════════════════════════
//  계약직 조기 해지 설정 함수 그룹
//  대상: 계약직 / 계약직수습 / 일용직 (isFixed 플래그)
// ══════════════════════════════════════════════════════════════════

/**
 * 해지 설정 패널 토글
 * - 다른 패널(ct-terminate-panel, ct-renew-panel) 닫기
 * - 열릴 때: 계약 정보 표시 + 입력 초기화
 * - 이미 열려있으면 닫기
 */
function doFixedTerminate(){
  const panel = document.getElementById('ct-fixed-terminate-panel');
  const isOpen = panel.style.display !== 'none';

  // 다른 패널 모두 닫기
  const terminatePanel = document.getElementById('ct-terminate-panel');
  const renewPanel     = document.getElementById('ct-renew-panel');
  if(terminatePanel) terminatePanel.style.display = 'none';
  if(renewPanel)     renewPanel.style.display     = 'none';

  // 이미 열려있으면 토글로 닫기
  if(isOpen){ panel.style.display = 'none'; return; }

  // 계약 정보 조회
  const c   = allContracts.find(x => x.id === editId.contract) || {};
  const emp = allEmployees.find(e => e.id === c.employee_id)   || {};
  const cat = emp.employment_category || c.contract_type || '';

  // 계약 정보 인포 텍스트
  const infoEl = document.getElementById('cft-contract-info');
  if(infoEl){
    const parts = [emp.name||'', cat, c.contract_end ? `만료일: ${c.contract_end}` : '만료일: 미정']
                    .filter(Boolean);
    infoEl.textContent = `(${parts.join(' · ')})`;
  }

  // 날짜 입력란 초기화 — 기존 terminate_date가 있으면 미리 채워두기
  const dateEl = document.getElementById('ct-fixed-terminate-date');
  if(dateEl){
    dateEl.value = c.terminate_date || '';
  }

  // 나머지 입력 초기화
  const noteEl        = document.getElementById('ct-fixed-terminate-note');
  const hintEl        = document.getElementById('ct-cft-date-hint');
  const statusHintEl  = document.getElementById('ct-cft-status-hint');
  const confirmBtn    = document.getElementById('ct-cft-confirm-btn');
  if(noteEl)       noteEl.value = '';
  if(hintEl)       hintEl.innerHTML = '';
  if(statusHintEl) statusHintEl.innerHTML = '';
  if(confirmBtn)   confirmBtn.disabled = true;

  // 사유 칩 선택 초기화
  document.querySelectorAll('.cft-reason-chip').forEach(ch => ch.classList.remove('selected'));

  // 패널 열기 + 스크롤
  panel.style.display = 'block';
  setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'center' }), 100);

  // 기존 terminate_date가 있으면 validate 실행하여 버튼 활성화 처리
  if(dateEl && dateEl.value) _cftValidate();
}

/**
 * 해지일 입력 유효성 검사
 * - 만료일(contract_end) 이상 날짜 불가 (정상 만료와 구분)
 * - 오늘 이전 → '해지', 오늘 이후 → '해지예정'
 * - 유효 시 확정 버튼 활성화 + 상태 힌트 표시
 */
function _cftValidate(){
  const c          = allContracts.find(x => x.id === editId.contract) || {};
  const today      = new Date().toISOString().slice(0, 10);
  const termDate   = (document.getElementById('ct-fixed-terminate-date') || {}).value || '';
  const hintEl     = document.getElementById('ct-cft-date-hint');
  const statusHint = document.getElementById('ct-cft-status-hint');
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');

  // 입력 없으면 초기화
  if(!termDate){
    if(confirmBtn)   confirmBtn.disabled = true;
    if(hintEl)       hintEl.innerHTML = '';
    if(statusHint)   statusHint.innerHTML = '';
    return;
  }

  // 계약 만료일(contract_end) 이상이면 오류
  if(c.contract_end && termDate >= c.contract_end){
    if(hintEl) hintEl.innerHTML =
      `<span style="color:#dc2626;">⚠ 계약 만료일(${c.contract_end}) 이전 날짜만 입력 가능합니다.</span>`;
    if(statusHint) statusHint.innerHTML = '';
    if(confirmBtn) confirmBtn.disabled = true;
    return;
  }

  // 계약 시작일보다 이전이면 오류
  if(c.contract_start && termDate < c.contract_start){
    if(hintEl) hintEl.innerHTML =
      `<span style="color:#dc2626;">⚠ 계약 시작일(${c.contract_start}) 이후 날짜만 입력 가능합니다.</span>`;
    if(statusHint) statusHint.innerHTML = '';
    if(confirmBtn) confirmBtn.disabled = true;
    return;
  }

  // 유효 — 상태 계산
  const isFuture   = termDate > today;
  const newStatus  = isFuture ? '해지예정' : '해지';
  const statusColor= isFuture ? '#c2410c'  : '#dc2626';
  const statusBg   = isFuture ? '#fff7ed'  : '#fef2f2';
  const statusBorder= isFuture? '#fdba74'  : '#fca5a5';

  // 날짜 힌트
  if(hintEl){
    const startLabel = c.contract_start ? `계약 시작: ${c.contract_start}` : '';
    const endLabel   = c.contract_end   ? `만료일: ${c.contract_end}`      : '';
    const labels     = [startLabel, endLabel].filter(Boolean).join(' · ');
    hintEl.innerHTML = labels
      ? `<span style="color:#6b7280;">${labels}</span>`
      : '';
  }

  // 상태 힌트 (확정 버튼 옆)
  if(statusHint){
    statusHint.innerHTML =
      `→ 계약 상태: <span style="background:${statusBg};border:1px solid ${statusBorder};` +
      `border-radius:4px;padding:1px 8px;font-size:11.5px;font-weight:800;color:${statusColor};">` +
      `${newStatus}</span>` +
      (newStatus === '해지'
        ? ' <span style="font-size:11px;color:#9ca3af;">(직원 상태 → 퇴직)</span>'
        : '');
  }

  // 확정 버튼 활성화
  if(confirmBtn) confirmBtn.disabled = false;
}

/**
 * 해지 사유 칩 선택 / 토글
 * - 동일 칩 재클릭 시 선택 해제
 */
function _cftSelectReason(el, reason){
  const isAlreadySelected = el.classList.contains('selected');
  // 모든 칩 선택 해제
  document.querySelectorAll('.cft-reason-chip').forEach(ch => ch.classList.remove('selected'));
  // 같은 칩이면 해제(토글), 다른 칩이면 선택
  if(!isAlreadySelected) el.classList.add('selected');
}

/**
 * 해지 설정 패널 닫기 + 입력 초기화
 */
function _cftClose(){
  const panel = document.getElementById('ct-fixed-terminate-panel');
  if(panel) panel.style.display = 'none';

  // 폼 초기화 (다음 열기에서 이전 값이 남지 않도록)
  const dateEl     = document.getElementById('ct-fixed-terminate-date');
  const noteEl     = document.getElementById('ct-fixed-terminate-note');
  const hintEl     = document.getElementById('ct-cft-date-hint');
  const statusHint = document.getElementById('ct-cft-status-hint');
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');
  if(dateEl)     dateEl.value = '';
  if(noteEl)     noteEl.value = '';
  if(hintEl)     hintEl.innerHTML = '';
  if(statusHint) statusHint.innerHTML = '';
  if(confirmBtn) confirmBtn.disabled = true;
  document.querySelectorAll('.cft-reason-chip').forEach(ch => ch.classList.remove('selected'));
}

/**
 * 해지 확정 처리
 * 1. 입력값 검증
 * 2. 사용자 confirm 대화상자
 * 3. contracts PATCH  → terminate_date, status, note
 * 4. employees PATCH  → resign_date, (즉시 해지 시) status='퇴직'
 * 5. 모달 닫기 + 데이터 갱신 + 토스트
 */
async function confirmFixedTerminate(){
  const c = allContracts.find(x => x.id === editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.', 'error');

  const termDate = (document.getElementById('ct-fixed-terminate-date') || {}).value || '';
  if(!termDate) return toast('해지일을 선택하세요.', 'error');

  const today = new Date().toISOString().slice(0, 10);

  // 만료일 이상 불가
  if(c.contract_end && termDate >= c.contract_end){
    return toast(`해지일은 계약 만료일(${c.contract_end}) 이전이어야 합니다.`, 'error');
  }
  // 시작일 이전 불가
  if(c.contract_start && termDate < c.contract_start){
    return toast(`해지일은 계약 시작일(${c.contract_start}) 이후이어야 합니다.`, 'error');
  }

  const selectedChip = document.querySelector('.cft-reason-chip.selected');
  const reason       = selectedChip ? selectedChip.textContent.trim() : '';
  const noteInput    = (document.getElementById('ct-fixed-terminate-note') || {}).value || '';
  const note         = noteInput.trim();
  const newStatus    = termDate > today ? '해지예정' : '해지';

  // 기존 note에 사유/메모 추가 (덮어쓰기 방지)
  const addendum = [reason, note].filter(Boolean).join(' — ');
  const finalNote= addendum
    ? (c.note ? `${c.note}\n[해지] ${addendum}` : `[해지] ${addendum}`)
    : c.note || '';

  const emp    = allEmployees.find(e => e.id === c.employee_id) || {};
  const empName= emp.name || '(이름 없음)';
  const cat    = emp.employment_category || c.contract_type || '';

  // 사용자 확인 다이얼로그
  const confirmMsg = [
    `[계약 조기 해지 확정]`,
    ``,
    `직원: ${empName}${cat ? ` (${cat})` : ''}`,
    `해지일: ${termDate}`,
    `처리 상태: ${newStatus}`,
    reason ? `해지 사유: ${reason}` : null,
    note    ? `메모: ${note}`       : null,
    ``,
    newStatus === '해지'
      ? `⚠ 직원 상태가 "퇴직"으로 변경됩니다.`
      : `ℹ 해지 예정일 이후 실제 해지 처리가 필요합니다.`,
    ``,
    `이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?`
  ].filter(v => v !== null).join('\n');

  if(!confirm(confirmMsg)) return;

  // 버튼 로딩 상태
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');
  if(confirmBtn){ confirmBtn.disabled = true; confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }

  try{
    // 1) 계약 업데이트
    await api(`../tables/contracts/${c.id}`, {
      method  : 'PATCH',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({
        terminate_date : termDate,
        status         : newStatus,
        note           : finalNote
      })
    });

    // 2) 직원 업데이트
    if(emp.id){
      const empPatch = newStatus === '해지'
        ? { status: '퇴직', resign_date: termDate }
        : { resign_date: termDate };   // 해지예정: 재직 상태 유지, 날짜만 기록
      await api(`../tables/employees/${emp.id}`, {
        method  : 'PATCH',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(empPatch)
      });
    }

    // 3) 모달 닫기 및 데이터 갱신
    closeModal('contract-modal');
    await Promise.all([loadContracts(), loadEmployees()]);
    renderContracts();
    renderDashboard();

    const statusLabel = newStatus === '해지예정'
      ? `해지예정 (해지일: ${termDate})`
      : `해지 완료 (해지일: ${termDate})`;
    toast(`${empName} — ${statusLabel}`, 'success');

  } catch(e){
    console.error('[confirmFixedTerminate] error:', e);
    toast('처리 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    if(confirmBtn){
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-check"></i> 해지 확정';
    }
  }
}
// ── 임시저장 ──
async function saveDraftContract(reason){
  const coId  = document.getElementById('ct-company').value;
  if(!coId) return toast('회사를 선택하세요.','error');

  // 직원 ID: 수정모드→기존 계약에서, 재계약→_recontractEmpId, 신규→아직 없음
  let empId = editId.contract
    ? (allContracts.find(x=>x.id===editId.contract)||{}).employee_id||''
    : (_recontractEmpId||'');

  // 신규이면서 직원 이름만 입력된 경우: 이름이라도 있으면 임시 저장 허용 (직원 생성 없이)
  // → 임시저장은 직원 생성 없이 계약 데이터만 저장한다
  //   (등록 시 신규 직원도 함께 저장됨)
  const isNew     = !editId.contract && !_recontractEmpId;
  const isEditMode = !!editId.contract;

  // 현재 입력값 수집 (유효성 검사 없이 최대한 수집)
  const catForDraft = isEditMode
    ? (allContracts.find(x=>x.id===editId.contract)||{}).contract_type||'정규직'
    : (isNew ? document.getElementById('ct-em-category').value : document.getElementById('ct-type').value);
  const isDailyDraft = catForDraft === '일용직';

  const scheduleJSON = getScheduleJSON();
  const workDays = parseInt(document.getElementById('ct-days').value)||0;
  const avgHours = parseFloat(document.getElementById('ct-hours').value)||0;

  const contractStart = isNew
    ? (document.getElementById('ct-em-hire').value||'')
    : (document.getElementById('ct-start').value||'');
  const contractEnd = isNew
    ? (document.getElementById('ct-em-expire').value||'')
    : (document.getElementById('ct-end').value||'');

  const baseDraft       = getAmountVal('ct-base')||0;
  const annualDraft     = getAmountVal('ct-annual-sal')||0;
  const dailyDraft      = getAmountVal('ct-daily-wage')||0;
  const wkHolDraft      = isDailyDraft ? 0 : Math.round(baseDraft / 5); // 월 주휴수당 = 기본급 ÷ 5
  const isRegDraft      = catForDraft === '정규직' || catForDraft === '정규직 수습';
  const posDraft        = getAmountVal('ct-position')||0;
  const carDraft        = getAmountVal('ct-car')||0;
  const remoteAreaDraft = getAmountVal('ct-remote-area')||0;
  const mealDraft       = getAmountVal('ct-meal')||0;
  const researchDraft   = getAmountVal('ct-research')||0;
  const siteDraft       = getAmountVal('ct-site')||0;
  const skillDraft      = getAmountVal('ct-skill')||0;
  const licenseDraft    = getAmountVal('ct-license')||0;
  const commDraft       = getAmountVal('ct-communication')||0;
  const fitnessDraft    = getAmountVal('ct-fitness')||0;
  const selfDevDraft    = getAmountVal('ct-self-dev')||0;
  const bookDraft       = getAmountVal('ct-book')||0;
  const overseasDraft   = getAmountVal('ct-overseas')||0;
  // 임시저장: 출근일수 비례(daily) 항목은 월 약정임금 합산에서 제외
  const allAllowDraft   = posDraft
    + (_isFixedAllow('car')           ? carDraft        : 0)
    + remoteAreaDraft
    + (_isFixedAllow('meal')          ? mealDraft       : 0)
    + (_isFixedAllow('research')      ? researchDraft   : 0)
    + siteDraft + skillDraft + licenseDraft
    + (_isFixedAllow('communication') ? commDraft       : 0)
    + (_isFixedAllow('fitness')       ? fitnessDraft    : 0)
    + (_isFixedAllow('self_dev')      ? selfDevDraft    : 0)
    + (_isFixedAllow('book')          ? bookDraft       : 0)
    + (_isFixedAllow('overseas')      ? overseasDraft   : 0);
  // \uc815\uaddc\uc9c1: \uc5f0\ubd09\u00f712, \uc5f4\ubc18: \uae30\ubcf8\uae09+\uc8fc\ud734+\uc218\ub2f9, \uc77c\uc6a9\uc9c1: 0
  const monthlyDraft    = isDailyDraft ? 0
    : (isRegDraft && annualDraft > 0 ? Math.round(annualDraft / 12)
      : baseDraft + wkHolDraft + allAllowDraft);
  const hourlyDraft   = getAmountVal('ct-hourly-wage')||0;

  const draftBody = {
    employee_id:          empId||'',
    company_id:           coId,
    contract_start:       contractStart,
    contract_end:         contractEnd,
    contract_type:        catForDraft,
    status:               '임시저장',
    work_hours_per_day:   avgHours,
    work_days_per_week:   workDays,
    schedule_json:        JSON.stringify(scheduleJSON),
    annual_leave_days:    parseInt(document.getElementById('ct-annual').value)||15,
    annual_salary:        annualDraft,
    monthly_salary_agreed:monthlyDraft,
    base_salary:          isDailyDraft ? 0 : baseDraft,
    daily_wage:           isDailyDraft ? dailyDraft : 0,
    weekly_holiday_pay:   0,
    hourly_wage:          hourlyDraft,
    position_allowance:      posDraft,
    transportation_allowance:carDraft,
    transportation_pay_type: _getCTPayTypeVal('car'),
    self_driving_allowance:  0,
    self_driving_pay_type:   'fixed',
    remote_area_allowance:   remoteAreaDraft,
    remote_area_pay_type:    'fixed', // 벽지수당 항상 통상임금 포함
    meal_allowance:          mealDraft,
    meal_pay_type:           _getCTPayTypeVal('meal'),
    research_allowance:      researchDraft,
    research_pay_type:       _getCTPayTypeVal('research'),
    site_allowance:          siteDraft,
    skill_allowance:         skillDraft,
    license_allowance:       licenseDraft,
    communication_allowance: commDraft,
    communication_pay_type:  _getCTPayTypeVal('communication'),
    fitness_allowance:       fitnessDraft,
    fitness_pay_type:        _getCTPayTypeVal('fitness'),
    self_dev_allowance:      selfDevDraft,
    self_dev_pay_type:       _getCTPayTypeVal('self_dev'),
    book_allowance:          bookDraft,
    book_pay_type:           _getCTPayTypeVal('book'),
    overseas_allowance:      overseasDraft,
    overseas_pay_type:       _getCTPayTypeVal('overseas'),
    car_maintenance:         carDraft,
    childcare_allowance:     getAmountVal('ct-childcare')||0,
    childcare_pay_type:      _getCTChildcarePayType(),
    childcare_dependents:    parseInt(document.getElementById('ct-childcare-dependents')?.value)||1,
    custom_allowances:       JSON.stringify(_collectCTCustomAllowances()),
    insurance_employment: true,
    insurance_industrial: true,
    insurance_pension:    true,
    insurance_health:     true,
    note:                 document.getElementById('ct-note').value||'',
    salary_start_date:    (editId.contract || _recontractEmpId)
      ? (document.getElementById('ct-start')?.value || '')
      : (document.getElementById('ct-em-hire')?.value || ''),  // contract_start 와 동일값 (통합)
    salary_end_date:      '',
    is_draft:             true,
    draft_saved_at:       Date.now(),
  };

  // 신규 임시저장: 직원명 정도는 note에 보관 (직원 미생성)
  if(isNew){
    const tmpName = document.getElementById('ct-em-name').value.trim();
    if(tmpName) draftBody.note = `[임시저장] 직원명: ${tmpName}${draftBody.note ? ' / '+draftBody.note : ''}`;
  }

  let savedId;
  if(isEditMode){
    // 기존 계약 수정 중 임시저장 → PATCH
    draftBody.id = editId.contract;
    await api(`../tables/contracts/${editId.contract}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
    savedId = editId.contract;
  } else if(editId.contract === null && _currentDraftId){
    // 이전 임시저장 ID가 있으면 덮어쓰기
    draftBody.id = _currentDraftId;
    await api(`../tables/contracts/${_currentDraftId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
    savedId = _currentDraftId;
  } else {
    // 최초 임시저장 → POST
    draftBody.id = 'cont_draft_'+Date.now();
    const res = await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
    savedId = res.id || draftBody.id;
    _currentDraftId = savedId;
  }

  await loadContracts();
  renderContracts();

  // 임시저장 시각 표시
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const infoEl = document.getElementById('ct-draft-saved-info');
  if(infoEl){ infoEl.style.display='inline'; infoEl.innerHTML=`<i class="fas fa-check" style="color:#10b981;margin-right:3px;"></i>임시저장 완료 (${timeStr})`; }

  if(reason){
    toast(`⚠ 필수 항목 누락으로 임시저장 되었습니다.\n[${reason}]`, 'warning');
  } else {
    toast(`임시저장 되었습니다. (${timeStr})`, 'success');
  }
}

// 임시저장 진행 중인 draft ID (신규 작성 시 추적용)
let _currentDraftId = null;

// ── 주민등록번호 포맷·유효성 헬퍼 ──────────────────────────────────────────
/**
 * _formatIdInput(el)
 *  - 입력 중 숫자만 추출 → YYMMDD 6자리 입력 후 자동 하이픈 삽입
 *  - 하이픈 뒤 1자리(성별코드)까지만 허용 → 최대 8문자 "YYMMDD-N"
 *  - 커서 위치 보정 (하이픈 자동 삽입 시 +1)
 */
function _formatIdInput(el){
  const sel  = el.selectionStart;       // 현재 커서 위치
  const prev = el.value;
  // 숫자만 추출 (최대 7자리: 6 생년월일 + 1 성별)
  const digits = prev.replace(/[^0-9]/g, '').slice(0, 7);
  let next = '';
  let cursorAdj = 0;                    // 하이픈 자동 삽입으로 인한 커서 보정

  if(digits.length <= 6){
    next = digits;
  } else {
    // 7번째 자리가 입력됐으면 하이픈 삽입
    next = digits.slice(0,6) + '-' + digits.slice(6);
    // 이전 값에 하이픈이 없었으면 커서 1칸 앞으로 보정
    if(!prev.includes('-')) cursorAdj = 1;
  }

  if(next !== prev){
    el.value = next;
    // 커서 복원
    const newPos = Math.min(sel + cursorAdj, next.length);
    el.setSelectionRange(newPos, newPos);
  }
}

/**
 * _inferGender(genderCode)
 *  주민번호 7번째 자리(성별코드)로 남/여 판단
 *  1·3·5·7 → 남,  2·4·6·8 → 여,  그 외 → null
 */
function _inferGender(genderCode){
  const n = parseInt(genderCode, 10);
  if([1,3,5,7].includes(n)) return '남';
  if([2,4,6,8].includes(n)) return '여';
  return null;
}

/**
 * _validateIdNumber(val)
 *  입력값이 "YYMMDD-N" 7자리 규격에 맞는지 검사
 *  반환: { ok: boolean, msg: string }
 *    ok=true  → 형식 정상
 *    ok=false → msg에 오류 설명
 */
function _validateIdNumber(val){
  if(!val || !val.trim()) return { ok: false, msg: '주민등록번호를 입력해 주세요.' };
  // 반드시 "YYMMDD-N" 형식 (하이픈 필수)
  if(!/^\d{6}-\d{1}$/.test(val.trim()))
    return { ok: false, msg: '주민등록번호는 생년월일 6자리 + 하이픈(-) + 성별코드 1자리(YYMMDD-N) 형식으로 입력해 주세요.' };
  const s = val.replace(/-/g,'');

  const yy = parseInt(s.slice(0,2), 10);
  const mm = parseInt(s.slice(2,4), 10);
  const dd = parseInt(s.slice(4,6), 10);
  const gd = parseInt(s.slice(6,7), 10);

  // 월 검사
  if(mm < 1 || mm > 12) return { ok: false, msg: `주민등록번호 월(${String(mm).padStart(2,'0')})이 올바르지 않습니다.` };
  // 일 검사 (간단 범위 — 성별코드로 연도 유추 후 정밀 검사)
  const maxDay = [0,31,29,31,30,31,30,31,31,30,31,30,31];
  if(dd < 1 || dd > maxDay[mm]) return { ok: false, msg: `주민등록번호 일(${String(dd).padStart(2,'0')})이 올바르지 않습니다.` };
  // 성별코드 검사: 1(남·1900년대), 2(여·1900년대), 3(남·2000년대), 4(여·2000년대)
  //               5(남·외국인·1900년대), 6(여·외국인·1900년대), 7(남·외국인·2000년대), 8(여·외국인·2000년대)
  if(gd < 1 || gd > 8) return { ok: false, msg: '성별코드는 1~8 사이의 숫자여야 합니다.' };

  return { ok: true, msg: '' };
}

/**
 * _onIdInput(el, checkBtnFn)
 *  주민번호 입력 필드 oninput 핸들러
 *  1) 자동 포맷 적용
 *  2) 인라인 오류 힌트 표시/제거
 *  3) 버튼 상태 갱신 콜백 호출
 */
function _onIdInput(el, checkBtnFn){
  _formatIdInput(el);
  const val = el.value;
  // 힌트 span (없으면 생성)
  let hint = el.parentElement.querySelector('.id-format-hint');
  if(!hint){
    hint = document.createElement('span');
    hint.className = 'id-format-hint';
    hint.style.cssText = 'font-size:11px;margin-top:3px;display:block;';
    el.parentElement.appendChild(hint);
  }
  if(!val){
    hint.textContent = '';
    hint.style.color = '';
    // 주민번호 지워지면 성별 힌트도 초기화
    const _nhint = document.getElementById('ct-em-gender-hint');
    const _ehint = document.getElementById('ct-edit-em-gender-hint');
    if(_nhint && document.getElementById('ct-em-id') === el)
      { _nhint.textContent = '주민번호 입력 시 자동 설정됩니다'; _nhint.style.color='#6b7280'; }
    if(_ehint && document.getElementById('ct-edit-em-id') === el)
      { _ehint.textContent = '주민번호 입력 시 자동 설정됩니다'; _ehint.style.color='#6b7280'; }
  } else {
    const { ok, msg } = _validateIdNumber(val);
    if(ok){
      hint.textContent = '✓ 형식 확인';
      hint.style.color = '#16a34a';  // green
      // ── 성별 자동 설정 ──
      const _gCode = val.replace(/-/g,'').slice(6,7);
      const _gender = _inferGender(_gCode);
      if(_gender){
        // 신규 폼
        const _newGenderEl = document.getElementById('ct-em-gender');
        if(_newGenderEl && document.getElementById('ct-em-id') === el){
          _newGenderEl.value = _gender;
          const _newHint = document.getElementById('ct-em-gender-hint');
          if(_newHint){ _newHint.textContent = `성별 자동 설정: ${_gender}`; _newHint.style.color='#16a34a'; }
        }
        // 수정/재계약 폼
        const _editGenderEl = document.getElementById('ct-edit-em-gender');
        if(_editGenderEl && document.getElementById('ct-edit-em-id') === el){
          _editGenderEl.value = _gender;
          const _editHint = document.getElementById('ct-edit-em-gender-hint');
          if(_editHint){ _editHint.textContent = `성별 자동 설정: ${_gender}`; _editHint.style.color='#16a34a'; }
        }
      }
    } else if(val.replace(/-/g,'').length < 7){
      // 아직 입력 중 — 부드러운 안내
      const digits = val.replace(/[^0-9]/g,'');
      hint.textContent = digits.length < 6
        ? `생년월일 ${6-digits.length}자리 더 입력`
        : '하이픈(-) 뒤 성별코드(1~8) 입력';
      hint.style.color = '#6b7280';  // gray
    } else {
      hint.textContent = '✗ ' + msg;
      hint.style.color = '#dc2626';  // red
    }
  }
  if(typeof checkBtnFn === 'function') checkBtnFn();
}

// ── 필수 입력 유효성 검사 + 하이라이트 헬퍼 ──────────────────────────────
function _ctClearErrors(){
  // 이전 오류 하이라이트 전부 초기화
  document.querySelectorAll('#contract-modal .ct-field-error').forEach(el=>{
    el.classList.remove('ct-field-error');
  });
  const banner = document.getElementById('ct-validation-banner');
  if(banner) banner.style.display = 'none';
}

function _ctMarkError(fieldId, label, errors){
  // form-group 부모에 에러 클래스 부여
  const el = document.getElementById(fieldId);
  if(!el) return;
  const fg = el.closest('.form-group') || el.parentElement;
  if(fg) fg.classList.add('ct-field-error');
  errors.push(label);
}

function _ctShowErrors(errors){
  if(!errors.length) return;
  const banner = document.getElementById('ct-validation-banner');
  const list   = document.getElementById('ct-validation-list');
  if(!banner || !list) return;
  list.innerHTML = errors.map(e=>`<li>${e}</li>`).join('');
  banner.style.display = 'block';
  // 배너로 스크롤
  banner.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

// 유효성 검사 실행 → 오류 있으면 true 반환 (saveDraftContract 진입 전 분기)
function _ctValidate(){
  _ctClearErrors();
  const errors = [];
  const isNew     = !editId.contract && !_recontractEmpId;
  const isEditOrRecontract = !isNew;

  // ── 공통: 회사 ──
  const coId = document.getElementById('ct-company').value;
  if(!coId) _ctMarkError('ct-company', '회사 선택', errors);

  // ── 수정/재계약: 계약 시작일 ──
  if(isEditOrRecontract){
    const start = document.getElementById('ct-start').value;
    if(!start) _ctMarkError('ct-start', '계약 시작일', errors);
  }

  if(isNew){
    // ── 신규 직원 필수 필드 ──
    const _empNoNewVal = document.getElementById('ct-em-empno')?.value.trim() || '';
    if(!_empNoNewVal){
      _ctMarkError('ct-em-empno', '사원번호', errors);
    } else {
      const _coIdForEmpno = document.getElementById('ct-company')?.value || '';
      const _empNoCheck = _validateEmpNoUniqueness(_empNoNewVal, _coIdForEmpno, null, null, null);
      if(!_empNoCheck.ok) _ctMarkError('ct-em-empno', `사원번호 중복: ${_empNoCheck.msg}`, errors);
    }
    if(!document.getElementById('ct-em-name').value.trim())
      _ctMarkError('ct-em-name', '이름', errors);
    if(!document.getElementById('ct-em-hire').value)
      _ctMarkError('ct-em-hire', '입사일', errors);
    (function(){
      const _idVal = document.getElementById('ct-em-id').value.trim();
      if(!_idVal){
        _ctMarkError('ct-em-id', '주민등록번호', errors);
      } else {
        const _idChk = _validateIdNumber(_idVal);
        if(!_idChk.ok) _ctMarkError('ct-em-id', '주민등록번호 형식 오류', errors);
      }
    })();
    if(!document.getElementById('ct-em-job').value.trim())
      _ctMarkError('ct-em-job', '담당업무', errors);
    if(!document.getElementById('ct-em-address').value.trim())
      _ctMarkError('ct-em-address', '주소', errors);
    if(!document.getElementById('ct-em-phone').value.trim())
      _ctMarkError('ct-em-phone', '휴대전화', errors);
    if(!document.getElementById('ct-em-category').value)
      _ctMarkError('ct-em-category', '고용형태', errors);
    const _depVal = parseInt(document.getElementById('ct-em-dependents')?.value);
    if(isNaN(_depVal) || _depVal < 0)
      _ctMarkError('ct-em-dependents', '부양가족 수', errors);

    // ── 임금 관련 (고용형태 기준) ──
    const cat = document.getElementById('ct-em-category').value;
    if(cat === '일용직'){
      if(!getAmountVal('ct-daily-wage'))
        _ctMarkError('ct-daily-wage', '일급여', errors);
    } else if(cat){
      // 정규직·정규직 수습·계약직·계약직 수습은 기본급이 자동계산이므로 필수 체크 제외
      if(cat !== '정규직' && cat !== '정규직 수습' && cat !== '계약직' && cat !== '계약직 수습'){
        if(!getAmountVal('ct-base'))
          _ctMarkError('ct-base', '기본급', errors);
      }
      if(cat === '정규직' || cat === '정규직 수습'){
        if(!getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '연봉', errors);
      } else if(cat === '계약직' || cat === '계약직 수습'){
        if(!getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '월 약정급여', errors);
      }
    }
    // ── 계약직·계약직 수습·일용직: 계약 종료일(퇴사예정일) 필수 ──
    if(cat === '계약직' || cat === '계약직 수습' || cat === '일용직'){
      if(!document.getElementById('ct-em-expire')?.value)
        _ctMarkError('ct-em-expire', '계약 종료일', errors);
    }
    // ── 수습 계약: 수습 조건 전체 필수 ──
    if(cat === '정규직 수습' || cat === '계약직 수습'){
      // 수습기간
      if(!document.getElementById('ct-probation-months')?.value)
        _ctMarkError('ct-probation-months', '수습기간', errors);
      // 수습 임금 비율 (direct 모드가 아닐 때)
      const _probBasis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || '';
      if(_probBasis !== 'direct'){
        const _probPctVal = parseFloat(document.getElementById('ct-probation-pct')?.value);
        if(!_probPctVal || _probPctVal <= 0)
          _ctMarkError('ct-probation-pct', '수습 임금 비율(%)', errors);
      }
      // 수습 임금 월 금액 (항상 필수)
      const _probAmtVal = parseFloat(document.getElementById('ct-probation-amt')?.value);
      if(!_probAmtVal || _probAmtVal <= 0)
        _ctMarkError('ct-probation-amt', '수습 임금(월 금액)', errors);
    }
  } else {
    // ── 수정/재계약: 직원 필수 필드 ──
    const _empNoEditVal = document.getElementById('ct-edit-em-empno')?.value.trim() || '';
    if(!_empNoEditVal){
      _ctMarkError('ct-edit-em-empno', '사원번호', errors);
    } else {
      const _editC = editId.contract ? allContracts.find(x => x.id === editId.contract) : null;
      const _editSelfEmpId = _editC ? _editC.employee_id : null;
      const _coIdForEditEmpno = currentContCompanyId || document.getElementById('ct-company')?.value || '';
      const _editEmpNoCheck = _validateEmpNoUniqueness(_empNoEditVal, _coIdForEditEmpno, _editSelfEmpId, null, null);
      if(!_editEmpNoCheck.ok) _ctMarkError('ct-edit-em-empno', `사원번호 중복: ${_editEmpNoCheck.msg}`, errors);
    }
    (function(){
      const _idValE = document.getElementById('ct-edit-em-id')?.value.trim();
      if(!_idValE){
        _ctMarkError('ct-edit-em-id', '주민등록번호', errors);
      } else {
        const _idChkE = _validateIdNumber(_idValE);
        if(!_idChkE.ok) _ctMarkError('ct-edit-em-id', '주민등록번호 형식 오류', errors);
      }
    })();
    if(!document.getElementById('ct-edit-emp-name')?.value.trim())
      _ctMarkError('ct-edit-emp-name', '이름', errors);
    // 입사일: 행이 표시된 경우에만 필수 검사 (계약직·일용직 재계약 시 행 숨김)
    { const _hireRow = document.getElementById('ct-edit-row-hire');
      const _hireRowVisible = !_hireRow || _hireRow.style.display !== 'none';
      if(_hireRowVisible && !document.getElementById('ct-edit-em-hire')?.value)
        _ctMarkError('ct-edit-em-hire', '입사일', errors);
    }
    if(!document.getElementById('ct-edit-em-job')?.value.trim())
      _ctMarkError('ct-edit-em-job', '담당업무', errors);
    if(!document.getElementById('ct-edit-em-phone')?.value.trim())
      _ctMarkError('ct-edit-em-phone', '휴대전화', errors);
    if(!document.getElementById('ct-edit-em-address')?.value.trim())
      _ctMarkError('ct-edit-em-address', '주소', errors);
    const _editDepVal = parseInt(document.getElementById('ct-edit-em-dependents')?.value);
    if(isNaN(_editDepVal) || _editDepVal < 0)
      _ctMarkError('ct-edit-em-dependents', '부양가족 수', errors);

    // ── 수정/재계약: 임금 관련 ──
    const catForCheck = (document.getElementById('ct-edit-em-category')?.value)
      || (document.getElementById('ct-type')?.value) || '정규직';
    if(catForCheck === '일용직'){
      if(!getAmountVal('ct-daily-wage'))
        _ctMarkError('ct-daily-wage', '일급여', errors);
    } else {
      // 정규직·정규직 수습·계약직·계약직 수습은 기본급이 자동계산이므로 필수 체크 제외
      if(catForCheck !== '정규직' && catForCheck !== '정규직 수습' && catForCheck !== '계약직' && catForCheck !== '계약직 수습'){
        if(!getAmountVal('ct-base'))
          _ctMarkError('ct-base', '기본급', errors);
      }
      if(catForCheck === '정규직' || catForCheck === '정규직 수습'){
        if(!getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '연봉', errors);
      } else if(catForCheck === '계약직' || catForCheck === '계약직 수습'){
        if(!getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '월 약정급여', errors);
      }
    }
    // ── 계약직·계약직 수습·일용직: 계약 종료일 필수 ──
    if(catForCheck === '계약직' || catForCheck === '계약직 수습' || catForCheck === '일용직'){
      if(!document.getElementById('ct-end')?.value)
        _ctMarkError('ct-end', '계약 종료일', errors);
    }
    // ── 수습 계약: 수습 조건 전체 필수 ──
    if(catForCheck === '정규직 수습' || catForCheck === '계약직 수습'){
      if(!document.getElementById('ct-probation-months')?.value)
        _ctMarkError('ct-probation-months', '수습기간', errors);
      const _probBasis2 = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || '';
      if(_probBasis2 !== 'direct'){
        const _probPctVal2 = parseFloat(document.getElementById('ct-probation-pct')?.value);
        if(!_probPctVal2 || _probPctVal2 <= 0)
          _ctMarkError('ct-probation-pct', '수습 임금 비율(%)', errors);
      }
      const _probAmtVal2 = parseFloat(document.getElementById('ct-probation-amt')?.value);
      if(!_probAmtVal2 || _probAmtVal2 <= 0)
        _ctMarkError('ct-probation-amt', '수습 임금(월 금액)', errors);
    }
  }

  // ── 최저임금 위반 검사 ──
  const _mwProbRow    = document.getElementById('ct-prob-minwage-warning-row');
  const _mwGeneralRow = document.getElementById('ct-general-minwage-warning-row');
  const _violatesMW   = !!(_mwProbRow    && _mwProbRow.style.display    !== 'none')
                     || !!(_mwGeneralRow && _mwGeneralRow.style.display !== 'none');
  if(_violatesMW)
    errors.push('최저임금 위반 — 기본급(또는 일급여)을 최저임금 이상으로 올려주세요.');

  // ── 계약기간 1개월 미만 위반 검사 (계약직·계약직 수습) ──
  const _shortTermRow = document.getElementById('ct-short-term-warning-row');
  if(_shortTermRow && _shortTermRow.style.display !== 'none')
    errors.push('계약기간 1개월 미만 — 일용직으로 변경하거나 종료일을 조정해 주세요.');

  if(errors.length){
    _ctShowErrors(errors);
    return true; // 오류 있음
  }
  return false;  // 통과
}
// ─────────────────────────────────────────────────────────────────────────────

async function saveContract(){
  console.log('[saveContract] 시작');
  // ── 필수 입력 일괄 검사 (하이라이트 + 배너) ──
  const _valResult = _ctValidate();
  console.log('[saveContract] _ctValidate 결과:', _valResult);
  if(_valResult) return;

  // 재계약 모드: _recontractEmpId 사용
  let empId = editId.contract ? (allContracts.find(x=>x.id===editId.contract)||{}).employee_id||'' : (_recontractEmpId||'');
  const coId = document.getElementById('ct-company').value;
  const start = (editId.contract||_recontractEmpId) ? document.getElementById('ct-start').value : '';
  const base  = getAmountVal('ct-base');

  // ── 신규 직원인 경우 먼저 직원 저장 ──
  if(!empId && !editId.contract && !_recontractEmpId){
    const newName = document.getElementById('ct-em-name').value.trim();
    const newHire  = document.getElementById('ct-em-hire').value.trim();
    const newId    = document.getElementById('ct-em-id').value.trim();
    const newDep   = document.getElementById('ct-em-dependents')?.value ?? 0;
    const newJob = document.getElementById('ct-em-job').value.trim();
    const newAddress = document.getElementById('ct-em-address').value.trim();
    const newPhone = document.getElementById('ct-em-phone').value.trim();
    const newCat = document.getElementById('ct-em-category').value;
    const empBody = {
      id: 'emp'+Date.now(),
      company_id: coId,
      name: newName,
      gender: document.getElementById('ct-em-gender').value,
      employment_category: document.getElementById('ct-em-category').value,
      employee_number: document.getElementById('ct-em-empno')?.value.trim() || '',
      job_description: newJob,
      id_number: document.getElementById('ct-em-id').value,
      department: document.getElementById('ct-em-dept').value,
      position: document.getElementById('ct-em-position').value,
      hire_date: document.getElementById('ct-em-hire').value,
      expire_date: document.getElementById('ct-em-expire').value,
      status: '재직',
      dependents: parseInt(document.getElementById('ct-em-dependents')?.value)||0,
      phone: document.getElementById('ct-em-phone').value,
      email: document.getElementById('ct-em-email').value,
      address: document.getElementById('ct-em-address').value,
      bank_name: document.getElementById('ct-em-bank')?.value.trim()    || '',
      bank_account: document.getElementById('ct-em-account')?.value.trim() || '',
      note: ''
    };
    const saved = await api('../tables/employees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(empBody)});
    empId = saved.id || empBody.id;
    await loadEmployees();
  }

  if(!empId) return saveDraftContract('직원 정보 누락');

  // 정규직 계열 여부 판단 (신규: 구분 선택값, 수정/재계약: 계약유형 select)
  // 고용형태는 인사정보(ct-edit-em-category) 기준으로 읽음
  const catForSave = editId.contract
    ? (document.getElementById('ct-edit-em-category')?.value||(allContracts.find(x=>x.id===editId.contract)||{}).contract_type||'정규직')
    : (_recontractEmpId ? (document.getElementById('ct-edit-em-category')?.value||'정규직') : (document.getElementById('ct-em-category').value||'정규직'));
  const isRegularGroup = catForSave === '정규직' || catForSave === '정규직 수습';
  const isFixedTermSave = catForSave === '계약직' || catForSave === '계약직 수습';
  const isProbationSave = catForSave === '정규직 수습' || catForSave === '계약직 수습';
  const isDailySave = catForSave === '일용직';

  const annualSalInputSave = getAmountVal('ct-annual-sal'); // 정규직:연봉 / 계약직:월약정급여
  const annual = isRegularGroup ? annualSalInputSave : 0;   // annual_salary에는 정규직만 저장
  // 수습 데이터 (_ctValidate에서 필수 검증 통과 후이므로 값이 항상 존재)
  const probMonths = isProbationSave ? (parseInt(document.getElementById('ct-probation-months').value) || 0) : 0;
  const probPct    = isProbationSave ? (parseFloat(document.getElementById('ct-probation-pct').value) || 0) : 0;
  const probAmt    = isProbationSave ? (parseFloat(document.getElementById('ct-probation-amt').value) || 0) : 0;
  const probBasis  = isProbationSave ? (document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary') : 'salary';
  const hours=parseFloat(document.getElementById('ct-hours').value)||0;
  const days=parseFloat(document.getElementById('ct-days').value)||5;

  // ── 임금 계산 (일용직 vs 계약직 vs 정규직) ──
  let weeklyHol, monthly, hourlyWage, baseSalaryForSave, dailyWageForSave;
  if(isDailySave){
    dailyWageForSave = getAmountVal('ct-daily-wage');
    baseSalaryForSave = 0;
    weeklyHol = 0;
    monthly = 0;
    hourlyWage = getAmountVal('ct-hourly-wage')||0;
  } else {
    dailyWageForSave = 0;
    baseSalaryForSave = base;
    weeklyHol = Math.round(base / days); // 월 주휴수당 = 기본급 ÷ dpw (단시간 비례 적용)
    const position2   = getAmountVal('ct-position');
    const car2        = getAmountVal('ct-car');
    const remoteArea2 = getAmountVal('ct-remote-area');
    const meal2       = getAmountVal('ct-meal');
    const research2   = getAmountVal('ct-research');
    const other2      = getAmountVal('ct-other')||0;
    const site2       = getAmountVal('ct-site')||0;
    const skill2      = getAmountVal('ct-skill')||0;
    const lic2        = getAmountVal('ct-license')||0;
    const comm2       = getAmountVal('ct-communication')||0;
    const fit2        = getAmountVal('ct-fitness')||0;
    const sdev2       = getAmountVal('ct-self-dev')||0;
    const book2       = getAmountVal('ct-book')||0;
    const ovseas2     = getAmountVal('ct-overseas')||0;
    // 등록 저장: 출근일수 비례(daily) 항목은 월 약정임금 합산에서 제외
    const allAllow2   = position2
      + (_isFixedAllow('car')           ? car2        : 0)
      + remoteArea2
      + (_isFixedAllow('meal')          ? meal2       : 0)
      + (_isFixedAllow('research')      ? research2   : 0)
      + other2
      + site2 + skill2 + lic2
      + (_isFixedAllow('communication') ? comm2       : 0)
      + (_isFixedAllow('fitness')       ? fit2        : 0)
      + (_isFixedAllow('self_dev')      ? sdev2       : 0)
      + (_isFixedAllow('book')          ? book2       : 0)
      + (_isFixedAllow('overseas')      ? ovseas2     : 0);
    // 월 약정임금 결정:
    //   계약직 → ct-annual-sal 입력값(월약정급여) 그대로
    //   정규직 → 연봉÷12
    //   그 외  → 기본급+주휴+수당 합산
    if(isFixedTermSave && annualSalInputSave > 0){
      monthly = annualSalInputSave;
    } else if(isRegularGroup && annual > 0){
      monthly = Math.round(annual / 12);
    } else {
      monthly = base + weeklyHol + allAllow2;
    }
    // 통상시급: ct-hourly-wage 직접 입력값 사용
    hourlyWage = getAmountVal('ct-hourly-wage')||0;
  }

  // ── 최저임금 검증 ① 공용 경고 행 표시 중이면 즉시 차단 ──
  {
    const _gwRow = document.getElementById('ct-general-minwage-warning-row');
    if(_gwRow && _gwRow.style.display !== 'none'){
      openModal('ct-minwage-warn-modal');
      return;
    }
  }

  // ── 최저임금 검증 ② 시급 계산 기반 검증 (비과세 수당 포함 월 환산시급 기준) ──
  {
    // 계약 시작 연도 결정
    const _hireRaw = editId.contract
      ? document.getElementById('ct-start')?.value
      : (_recontractEmpId
          ? document.getElementById('ct-start')?.value
          : document.getElementById('ct-em-hire')?.value);
    const _contractYear = _hireRaw ? parseInt(_hireRaw.slice(0,4)) : new Date().getFullYear();
    const _mw = _allMinimumWages.find(w => Number(w.year) === _contractYear);

    if(_mw && Number(_mw.hourly_wage) > 0){
      const _legalMinWage = Number(_mw.hourly_wage);

      // ── 정규직 수습 예외: 최저임금법 §5②에 따라 수습 사용 3개월 이내 → 최저시급의 90%까지 허용
      // (1년 미만 단기계약직·일용직에는 적용 안 됨)
      const _isRegularProbation = (catForSave === '정규직 수습');
      const _isProbationContract = (catForSave === '정규직 수습' || catForSave === '계약직 수습');
      const _effectiveMinWage   = _isRegularProbation
        ? Math.ceil(_legalMinWage * 0.9)   // 정규직 수습: 90% 기준 (올림)
        : _legalMinWage;                    // 그 외: 100% 기준

      // ── 산정기준에 따른 비교 시급 결정 ──
      // [minwage/direct]: probAmt(수습 보수) ÷ 209 → 수습 보수 기준 시급 비교
      // [salary / 비수습]: hourlyWage(비과세 포함 월임금 ÷ 209) 비교
      const _useProbAmt = _isProbationContract && (probBasis === 'minwage' || probBasis === 'direct');
      let _compareHourly;
      let _compareMonthly;
      if(_useProbAmt){
        // 수습 보수 직접 비교: probAmt → 시급 환산
        _compareHourly  = probAmt > 0 ? Math.round(probAmt / 209) : 0;
        _compareMonthly = probAmt;
      } else {
        // 약정 보수 대비 기준 또는 비수습: 비과세 포함 월 환산시급
        _compareHourly  = hourlyWage;
        _compareMonthly = isDailySave
          ? (dailyWageForSave * (hours > 0 ? Math.round(209 / hours) : 1))
          : monthly;
      }

      if(_compareHourly > 0 && _compareHourly < _effectiveMinWage){
        const _detail = document.getElementById('ct-minwage-warn-detail');
        if(_detail){
          const _mwMonthly = Math.round(_effectiveMinWage * 209);
          _detail.innerHTML =
            `<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>📅 계약 연도</span><strong>${_contractYear}년</strong>
             </div>
             <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>⚖️ ${_contractYear}년 법정 최저시급</span>
               <strong style="color:#b91c1c;">${_legalMinWage.toLocaleString('ko-KR')}원</strong>
             </div>
             ${_isRegularProbation ? `
             <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>🌱 정규직 수습 적용 최저시급 <span style="font-size:10.5px;color:#9ca3af;">(법정×90%)</span></span>
               <strong style="color:#b45309;">${_effectiveMinWage.toLocaleString('ko-KR')}원 (월 ${_mwMonthly.toLocaleString('ko-KR')}원)</strong>
             </div>` : ''}
             <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>💰 입력 시급 <span style="font-size:10.5px;color:#9ca3af;">${_useProbAmt ? '(수습 보수÷209)' : '(비과세 포함, 월÷209)'}</span></span>
               <strong style="color:#ef4444;">${_compareHourly.toLocaleString('ko-KR')}원</strong>
             </div>
             <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>📋 ${_useProbAmt ? '수습 월 보수' : '월 환산임금'} <span style="font-size:10.5px;color:#9ca3af;">${_useProbAmt ? '' : '(비과세 포함)'}</span></span>
               <strong style="color:#6b7280;">${_compareMonthly.toLocaleString('ko-KR')}원</strong>
             </div>
             <div style="display:flex;justify-content:space-between;">
               <span>📉 시급 부족액 <span style="font-size:10.5px;color:#9ca3af;">(적용 최저시급 기준)</span></span>
               <strong style="color:#ef4444;">-${(_effectiveMinWage - _compareHourly).toLocaleString('ko-KR')}원/시간</strong>
             </div>`;
        }
        // 모달 타이틀·설명 문구 동적 업데이트
        const _warnMsg = document.getElementById('ct-minwage-warn-msg');
        if(_warnMsg){
          if(_isRegularProbation){
            _warnMsg.innerHTML = '입력된 수습 급여가 최저임금의 90%에 미달합니다.<br><span style="font-size:12px;font-weight:500;color:#92400e;">정규직 수습은 최저시급의 90%까지 허용됩니다.</span>';
          } else if(_isProbationContract && probBasis === 'minwage'){
            _warnMsg.innerHTML = '입력된 수습 보수가 최저임금에 미달합니다.<br><span style="font-size:12px;font-weight:500;color:#92400e;">최저임금 대비 요율 기준으로 계산된 금액을 확인해주세요.</span>';
          } else if(_isProbationContract && probBasis === 'direct'){
            _warnMsg.innerHTML = '직접 입력한 수습 보수가 최저임금보다 낮습니다.<br><span style="font-size:12px;font-weight:500;color:#92400e;">적용 최저시급 이상의 금액으로 다시 입력해주세요.</span>';
          } else {
            _warnMsg.innerHTML = '입력된 급여가 최저임금보다 낮습니다.<br>올바르게 다시 입력해주세요.';
          }
        }
        openModal('ct-minwage-warn-modal');
        return; // 저장 차단
      }
    }
  }

  // 신규/재계약 모드: 계약시작일, 종료일, 유형, 상태 결정
  const isRecontract = !!_recontractEmpId && !editId.contract;
  const isEditMode   = !!editId.contract;
  const today3 = new Date().toISOString().slice(0,10);
  let contractStart, contractEnd, contractType, contractStatus;
  if(isEditMode){
    contractStart = start;
    contractEnd   = document.getElementById('ct-end').value;
    contractType  = document.getElementById('ct-type').value;
    // 편집 모드: 계약직/일용직 종료일 변경 시 상태 자동 처리
    const origContract = allContracts.find(x=>x.id===editId.contract)||{};
    const isFixedEdit  = (contractType==='계약직'||contractType==='계약직 수습'||contractType==='일용직');
    const origEnd2     = origContract.contract_end||'';
    const origStart2   = origContract.contract_start||'';
    const newEnd2      = contractEnd;
    let autoStatus = document.getElementById('ct-status').value;
    if(isFixedEdit && newEnd2 && newEnd2 !== origEnd2){
      if(newEnd2 < origStart2){
        // 시작일 이전으로 종료일 소급 → 해지
        autoStatus = '해지';
      } else if(newEnd2 <= today3){
        // 현재 이전 날짜로 변경 → 즉시 해지 (계약 종료일 앞당김)
        autoStatus = '해지';
      } else if(origEnd2 && newEnd2 > origEnd2){
        // 종료일 연장: 기존 계약 만료 + 새 계약 등록 정책 → 등록 차단 후 갱신 플로우 유도
        toast('계약 종료일을 연장하려면 [갱신] 버튼을 사용해 주세요.\n편집 저장으로는 종료일을 연장할 수 없습니다.', 'error');
        return;
      } else {
        // 종료일 앞당김 (원래보다 이전, 오늘 이후) → 해지로 처리
        autoStatus = '해지';
      }
    }
    contractStatus= autoStatus;
  } else if(isRecontract){
    contractStart = document.getElementById('ct-start').value;
    contractEnd   = document.getElementById('ct-end').value;
    contractType  = document.getElementById('ct-type').value;
    const today2  = new Date().toISOString().slice(0,10);
    contractStatus= contractStart > today2 ? '계약예정' : '활성';
  } else {
    contractStart = document.getElementById('ct-em-hire').value;
    contractEnd   = document.getElementById('ct-em-expire').value;
    contractType  = document.getElementById('ct-em-category').value;
    contractStatus= '활성';
  }

  // 요일별 스케줄 수집
  const scheduleJSON = getScheduleJSON();
  const workDaysCount = parseInt(document.getElementById('ct-days').value)||0;
  const avgDayHours   = parseFloat(document.getElementById('ct-hours').value)||0;

  // ── 파일 업로드 처리 (Base64 변환) ──
  const _skipUpload = document.getElementById('cp-skip-upload')?.checked;
  let signedFileName='', signedFileData='', consentFileName='', consentFileData='';
  if(!_skipUpload && !isEditMode){
    if(window._contractSignedFile){
      signedFileName = window._contractSignedFile.name;
      signedFileData = await _fileToBase64(window._contractSignedFile);
    }
    if(window._contractConsentFile){
      consentFileName = window._contractConsentFile.name;
      consentFileData = await _fileToBase64(window._contractConsentFile);
    }
  } else if(isEditMode){
    // 편집 모드: 기존 파일 데이터 유지 (새 파일 선택 시에만 덮어쓰기)
    const origC = allContracts.find(x=>x.id===editId.contract)||{};
    signedFileName  = origC.signed_file_name  || '';
    signedFileData  = origC.signed_file_data  || '';
    consentFileName = origC.consent_file_name || '';
    consentFileData = origC.consent_file_data || '';
    // 편집 모드에서도 새 파일이 선택된 경우 덮어쓰기
    if(window._contractSignedFile){
      signedFileName = window._contractSignedFile.name;
      signedFileData = await _fileToBase64(window._contractSignedFile);
    }
    if(window._contractConsentFile){
      consentFileName = window._contractConsentFile.name;
      consentFileData = await _fileToBase64(window._contractConsentFile);
    }
  }

  // 파일 완비 여부에 따라 최종 계약 상태 결정
  // skip 체크 또는 파일 미첨부 시 → '서류미비'로 강제 (해지/만료/파기 등 최종 상태 제외)
  const _isTerminalStatus = (contractStatus==='해지'||contractStatus==='만료'||contractStatus==='파기'||contractStatus==='expired'||contractStatus==='terminated');
  if(!_isTerminalStatus && !isEditMode){
    const _hasBothFiles = signedFileData && consentFileData;
    if(!_hasBothFiles) contractStatus = '서류미비';
  } else if(isEditMode && !_isTerminalStatus){
    // 편집 모드: 두 파일 모두 있으면 서류미비 해제, 없으면 서류미비 유지
    const _hasBothFilesEdit = signedFileData && consentFileData;
    const origC2 = allContracts.find(x=>x.id===editId.contract)||{};
    // 기존 상태가 서류미비였고, 이번에 두 파일이 모두 갖춰진 경우 → 활성으로 전환
    if(origC2.status==='서류미비' && _hasBothFilesEdit){
      contractStatus = '활성';
    } else if(!_hasBothFilesEdit && !_isTerminalStatus && origC2.status!=='계약예정' && origC2.status!=='갱신예정' && origC2.status!=='해지예정'){
      contractStatus = '서류미비';
    }
  }

  const body={employee_id:empId,company_id:coId,contract_start:contractStart,contract_end:contractEnd,contract_type:contractType,status:contractStatus,probation_months:probMonths,probation_pct:probPct,probation_amt:probAmt,probation_basis:probBasis,work_hours_per_day:avgDayHours,work_days_per_week:isDailySave?0:workDaysCount,schedule_json:JSON.stringify(scheduleJSON),annual_leave_days:isDailySave?0:parseFloat(document.getElementById('ct-annual').value)||15,annual_salary:annual,monthly_salary_agreed:monthly,base_salary:baseSalaryForSave,daily_wage:dailyWageForSave,weekly_holiday_pay:weeklyHol,fixed_ot_pay:getAmountVal('ct-fixed-ot-pay'),fixed_ot_hours:parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0,fixed_night_pay:getAmountVal('ct-fixed-night-pay'),fixed_night_hours:parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0,fixed_hol_pay:getAmountVal('ct-fixed-hol-pay'),fixed_hol_hours:parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0,hourly_wage:hourlyWage,position_allowance:getAmountVal('ct-position'),transportation_allowance:getAmountVal('ct-car'),transportation_pay_type:_getCTPayTypeVal('car'),self_driving_allowance:0,self_driving_pay_type:'fixed',remote_area_allowance:getAmountVal('ct-remote-area'),remote_area_pay_type:'fixed',meal_allowance:getAmountVal('ct-meal'),meal_pay_type:_getCTPayTypeVal('meal'),research_allowance:getAmountVal('ct-research'),research_pay_type:_getCTPayTypeVal('research'),site_allowance:getAmountVal('ct-site'),skill_allowance:getAmountVal('ct-skill'),license_allowance:getAmountVal('ct-license'),communication_allowance:getAmountVal('ct-communication'),communication_pay_type:_getCTPayTypeVal('communication'),fitness_allowance:getAmountVal('ct-fitness'),fitness_pay_type:_getCTPayTypeVal('fitness'),self_dev_allowance:getAmountVal('ct-self-dev'),self_dev_pay_type:_getCTPayTypeVal('self_dev'),book_allowance:getAmountVal('ct-book'),book_pay_type:_getCTPayTypeVal('book'),overseas_allowance:getAmountVal('ct-overseas'),overseas_pay_type:_getCTPayTypeVal('overseas'),car_maintenance:getAmountVal('ct-car'),regular_bonus:getAmountVal('ct-regular-bonus')||0,childcare_allowance:getAmountVal('ct-childcare')||0,childcare_pay_type:_getCTChildcarePayType(),childcare_dependents:parseInt(document.getElementById('ct-childcare-dependents')?.value)||1,custom_allowances:JSON.stringify(_collectCTCustomAllowances()),pay_period:document.getElementById('ct-pay-period')?.value.trim()||'',insurance_employment:true,insurance_industrial:true,insurance_pension:true,insurance_health:true,note:document.getElementById('ct-note').value,salary_start_date:document.getElementById('ct-salary-start')?.value||'',salary_end_date:document.getElementById('ct-salary-end')?.value||'',is_draft:false,draft_saved_at:null,signed_file_name:signedFileName,signed_file_data:signedFileData,consent_file_name:consentFileName,consent_file_data:consentFileData};
  if(isEditMode){
    body.id=editId.contract;
    await api(`../tables/contracts/${editId.contract}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 직원 정보도 함께 업데이트 ──
    const editEmpId = (allContracts.find(x=>x.id===editId.contract)||{}).employee_id;
    if(editEmpId){
      const empUpdatePhone = document.getElementById('ct-edit-em-phone').value.trim();
      if(!empUpdatePhone) return toast('휴대전화 번호를 입력하세요.','error');
      // 계약직/일용직은 입사일=계약시작일, 만료일=계약종료일이므로 ct-start/ct-end 값 사용
      const _ctTypeForSave = document.getElementById('ct-type').value||'정규직';
      const _isFixedForSave = (_ctTypeForSave==='계약직'||_ctTypeForSave==='계약직 수습'||_ctTypeForSave==='일용직');
      const _nameElSave = document.getElementById('ct-edit-emp-name');
      const _catElSave  = document.getElementById('ct-edit-em-category');
      const empPatch = {
        gender:              document.getElementById('ct-edit-em-gender').value,
        employee_number:     document.getElementById('ct-edit-em-empno')?.value.trim() || '',
        job_description:     document.getElementById('ct-edit-em-job').value,
        department:          document.getElementById('ct-edit-em-dept').value,
        position:            document.getElementById('ct-edit-em-position').value,
        hire_date:           _isFixedForSave ? document.getElementById('ct-start').value : document.getElementById('ct-edit-em-hire').value,
        expire_date:         _isFixedForSave ? document.getElementById('ct-end').value   : document.getElementById('ct-edit-em-expire').value,
        id_number:           document.getElementById('ct-edit-em-id').value,
        dependents:          parseInt(document.getElementById('ct-edit-em-dependents')?.value)||0,
        phone:               empUpdatePhone,
        email:               document.getElementById('ct-edit-em-email').value,
        address:             document.getElementById('ct-edit-em-address').value,
        bank_name:           document.getElementById('ct-edit-em-bank').value,
        bank_account:        document.getElementById('ct-edit-em-account').value,
      };
      // 이름·고용형태: readOnly/disabled가 아닐 때만 업데이트 (수정 모드에서만 반영)
      if(_nameElSave && !_nameElSave.readOnly && _nameElSave.value.trim()) empPatch.name = _nameElSave.value.trim();
      if(_catElSave  && !_catElSave.disabled  && _catElSave.value)         empPatch.employment_category = _catElSave.value;
      await api(`../tables/employees/${editEmpId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(empPatch)});
    }
  } else {
    // 임시저장에서 이어서 등록하는 경우: 기존 draft ID 재사용
    body.id = _currentDraftId || ('cont'+Date.now());
    if(_currentDraftId){
      await api(`../tables/contracts/${_currentDraftId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    } else {
      await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    }
  }
  // ── 고객사 인앱 알림 발송 ──
  {
    const _savedContractId = isEditMode ? editId.contract : (body.id || '');
    const _co  = allCompanies.find(x => x.id === coId) || {};
    const _emp = allEmployees.find(x => x.id === empId) || {};
    const _coName  = _co.company_name || '';
    const _empName = _emp.name || '';
    const _coRep   = _co.representative ? `, ${_co.representative} 사장님` : '';
    const _fmtDate = d => {
      if(!d) return '-';
      const [y,m,dd] = d.split('-');
      return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`;
    };

    if(isEditMode){
      // ─ 계약 수정 완료 OR 해지 처리
      const _origC = allContracts.find(x => x.id === editId.contract) || {};
      if(contractStatus === '해지'){
        // ── 계약 해지 ──
        await _sendCompanyNotice({
          companyId  : coId, companyName: _coName,
          noticeType : 'contract_terminated',
          title      : `[계약 해지] ${_empName} — 근로계약이 해지되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 해지 처리되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractType}
■ 계약 시작일: ${_fmtDate(contractStart)}
■ 계약 종료일: ${_fmtDate(contractEnd || _origC.contract_end || '')}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : _savedContractId,
          employeeId  : empId, employeeName: _empName,
          contractEnd : contractEnd || _origC.contract_end || '',
        });
      } else {
        // ── 계약 수정 완료 ──
        await _sendCompanyNotice({
          companyId  : coId, companyName: _coName,
          noticeType : 'contract_updated',
          title      : `[계약 수정] ${_empName} — 근로계약이 수정되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약 내용이 수정되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractType}
■ 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : _savedContractId,
          employeeId  : empId, employeeName: _empName,
          contractEnd : contractEnd,
        });
      }
    } else if(isRecontract){
      // ── 재계약 완료 ──
      await _sendCompanyNotice({
        companyId  : coId, companyName: _coName,
        noticeType : 'contract_renewed_new',
        title      : `[재계약 완료] ${_empName} — 새 근로계약이 작성되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 재계약이 완료되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractType}
■ 새 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 계약 상태: ${contractStatus === '계약예정' ? '계약예정 (시작일 미도래)' : '계약유효 (활성)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : _savedContractId,
        employeeId  : empId, employeeName: _empName,
        contractEnd : contractEnd,
      });
    } else {
      // ── 신규 계약 작성 완료 ──
      await _sendCompanyNotice({
        companyId  : coId, companyName: _coName,
        noticeType : 'contract_created',
        title      : `[신규 계약] ${_empName} — 근로계약이 작성되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 새로 작성되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractType}
■ 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 계약 상태: ${contractStatus === '서류미비' ? '서류미비 (파일 업로드 필요)' : contractStatus === '계약예정' ? '계약예정' : '계약유효 (활성)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : _savedContractId,
        employeeId  : empId, employeeName: _empName,
        contractEnd : contractEnd,
      });
    }
  }
  _recontractEmpId = null; // 재계약 플래그 초기화
  _currentDraftId  = null; // 임시저장 ID 초기화
  closeModal('contract-modal');await loadContracts();await loadEmployees();renderContracts();renderDashboard();toast('근로계약서가 등록되었습니다. ✔');
}
function deleteContract(id){
  // 근로계약 보존 정책: 삭제 불가 (보존 의무 준수)
  toast('근로계약서는 보존 정책에 따라 삭제할 수 없습니다.','error');
}
