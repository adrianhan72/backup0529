// ─── 브랜드 서명 (모든 발송 메시지 하단 공통) ───
const _BRAND_SIG = '─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스';

// ─── 가산수당 지급 기준(premium_mode) 기반 법정 배율 ───
const WEEK_TO_MONTH = 365 / 12 / 7; // 4.345주/월 (고용노동부 공식)

/** 고객사 가산수당 지급 기준 조회 — premium_mode: 'always'/'none', 미지정(legacy)은 'none' */
function _getCompanyPremiumMode(companyId){
  if(!companyId) return 'none';
  const co = (allCompanies || []).find(c => c.id === companyId);
  return (co && co.premium_mode === 'always') ? 'always' : 'none';
}

/**
 * 법정 가산 배율 (계약 작성용)
 * - 'always': 5인 미만이어도 가산 지급 → 연장×1.5 · 야간×0.5 · 휴일≤8h×1.5 · 휴일>8h×2.0
 * - 'none':   5인 미만 시 가산 미적용 → ×1.0/×0.0 (계약서는 "법정 가산 의무 발생 시 가산 적용" 문구로 대체,
 *             급여 단계에서 전월 근로실적으로 자동 판별)
 */
function _getLegalMultiplier(companyId){
  const always = _getCompanyPremiumMode(companyId) === 'always';
  return {
    overtime:       always ? 1.5 : 1.0,
    night:          always ? 0.5 : 0.0,
    holiday_8h:     always ? 1.5 : 1.0,
    holiday_8h_over:always ? 2.0 : 1.0,
  };
}

/** 공휴일·근로자의날 등 법정휴일 판정 (YYYY-MM-DD) */
function _isLegalHoliday(dateStr){
  if(!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if(!y || !m || !d) return false;

  // ── 양력 고정 공휴일 (제헌절은 2026년부터 공휴일) ──
  const fixedHolidays = {
    '01-01': '신정',
    '03-01': '삼일절',
    '05-01': '근로자의날',
    '05-05': '어린이날',
    '06-06': '현충일',
    '08-15': '광복절',
    '10-03': '개천절',
    '10-09': '한글날',
    '12-25': '성탄절',
  };
  if(y >= 2026) fixedHolidays['07-17'] = '제헌절';
  const mmdd = `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  if(fixedHolidays[mmdd]) return true;

  // ── 설날 (음력 1월 1일) / 추석 (음력 8월 15일) — 연도별 양력 변환 ──
  const lunarHolidays = {
    2021: { seol: ['02-11','02-12','02-13'], chuseok: ['09-20','09-21','09-22'] },
    2022: { seol: ['01-31','02-01','02-02'], chuseok: ['09-09','09-10','09-11'] },
    2023: { seol: ['01-21','01-22','01-23'], chuseok: ['09-28','09-29','09-30'] },
    2024: { seol: ['02-09','02-10','02-11'], chuseok: ['09-16','09-17','09-18'] },
    2025: { seol: ['01-28','01-29','01-30'], chuseok: ['10-05','10-06','10-07'] },
    2026: { seol: ['02-16','02-17','02-18'], chuseok: ['09-24','09-25','09-26'] },
    2027: { seol: ['02-05','02-06','02-07'], chuseok: ['09-14','09-15','09-16'] },
    2028: { seol: ['01-25','01-26','01-27'], chuseok: ['10-02','10-03','10-04'] },
    2029: { seol: ['02-12','02-13','02-14'], chuseok: ['09-21','09-22','09-23'] },
  };
  const yearData = lunarHolidays[y];
  if(yearData){
    const allLunar = [...(yearData.seol||[]), ...(yearData.chuseok||[])];
    if(allLunar.includes(mmdd)) return true;
  }

  // ── 대체공휴일 (법령 기준) ──
  const substituteHolidays = {
    2021: ['02-15','08-16','10-04','10-11'],
    2022: ['09-12','10-10'],
    2023: ['01-24','10-02'],
    2024: ['02-12','05-06'],
    2025: ['03-03','10-08'],
    2026: ['03-02','08-17','09-28','10-05'],
    2027: ['02-08','08-16','10-04','10-11'],
    2028: ['10-05'],
    2029: ['05-07','09-24'],
  };
  const subs = substituteHolidays[y] || [];
  if(subs.includes(mmdd)) return true;

  // ── 일요일은 주휴일 (제55조), 토요일은 무급휴무일 (법정휴일 아님) ──
  const date = new Date(y, m-1, d);
  const dow = date.getDay();
  if(dow === 0) return true; // Sunday(0) only — Saturday(6) is NOT a legal holiday

  return false;
}

// ─── EMPLOYEES ───
// ─── CONTRACTS ───

// ── 계약직·계약직 수습 계약기간 최소 1개월 검사 ──
// 계약기간이 1개월 미만이면 경고 배너 표시 후 true 반환 (버튼 비활성 신호)
function _checkFixedTermDuration(){
  // ── 신규 모드 경고 박스
  const warningRow     = document.getElementById('ct-short-term-warning-row');
  // ── 수정/재계약 모드 경고 박스
  const editWarningRow = document.getElementById('ct-edit-short-term-warning-row');

  // 신규/수정 공통: 계약 시작일(ct-start) / 종료일(ct-end) 참조
  const isNewMode  = !editId.contract && !_recontractEmpId;

  if(isNewMode){
    // 수정 모드 경고 숨김
    if(editWarningRow) editWarningRow.style.display = 'none';
    if(!warningRow) return false;

    const rawCat = _ctNewCat();
    const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
    const isFixedContract = cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION;

    if(!isFixedContract){
      warningRow.style.display = 'none';
      return false;
    }

    // 계약기간 판정: 계약 시작일(ct-start) vs 계약 종료일(ct-end) (구 ct-em-start/ct-em-hire/ct-em-expire는 제거됨)
    const hire   = document.getElementById('ct-start')?.value;
    const expire = document.getElementById('ct-end')?.value;

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
  if(basisType === 'hire_date'){
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
    if(basisType !== 'hire_date'){
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
    const _monthLabel = typeof _cmPeriodMonthLabel === 'function' ? _cmPeriodMonthLabel(co.pay_period_month) : co.pay_period_month;
    const _ppHint = (co.pay_period_month&&co.pay_period_day)
      ? `${_monthLabel} ${co.pay_period_day}일부터 1개월간`
      : (co.pay_period.includes('~') ? co.pay_period : co.pay_period);
    hint.textContent = `(고객사 기본값: ${_ppHint})`;
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
  if(typeof _ctPayMethodPeriodInfo === 'function') _ctPayMethodPeriodInfo('monthly', true); // 월합산 자동 안내 갱신
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
    const m = s.match(/^(prev_month|current_month)(\d+)일/);
    if(m) resolvedMonth = m[1];
  }
  if(pmEl) pmEl.value = resolvedMonth;
  // 일 복원
  let resolvedDay = '';
  if(day !== undefined && day !== null && day !== ''){
    resolvedDay = String(day);
  } else if(payPeriod){
    const s = payPeriod.replace(/\s/g,'');
    const m = s.match(/^(prev_month|current_month)(\d+)일/);
    if(m) resolvedDay = m[2];
  }
  if(pdEl) pdEl.value = resolvedDay;
  _ctPeriodCompose();
}

function autoFillAnnualLeave(){
  // 입사일은 계약 정보 섹션에서 통합 관리 (ct-edit-em-hire)
  const hireDateStr = document.getElementById('ct-edit-em-hire')?.value || '';
  if(!hireDateStr) return; // 입사일 없으면 계산 안 함

  // 고객사 ID로 annual_leave_basis 조회
  const companyId = document.getElementById('ct-company')?.value || currentContCompanyId;
  const company   = allCompanies.find(c => c.id === companyId);
  const basis     = company?.annual_leave_basis || 'fiscal_year';

  const contractStart = document.getElementById('ct-start')?.value || '';

  // ── 주 15시간 미만 단시간 근로자: 연차휴가 법적 미적용 (근로기준법 제18조제3항) ──
  //    일용직도 1주 소정근로시간(15시간) 기준으로 판별 (주 15h 미만 → 연차 0)
  //    일용직은 주 근무일수 미지정(0) 시 5일로 추정 (급여입력과 동일 기준)
  const _ctHours = parseFloat(document.getElementById('ct-hours')?.value) || 0;
  const _ctDaysRaw = parseFloat(document.getElementById('ct-days')?.value) || 0;
  const _rawCatAL = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-type')?.value || '')
    : _ctNewCat();
  const _catAL = CONTRACT_TYPE_LEGACY_MAP[_rawCatAL] || _rawCatAL;
  const _daysForH = _catAL === CONTRACT_TYPE.DAILY ? (_ctDaysRaw || 5) : _ctDaysRaw;
  const _weeklyHours = _ctHours * _daysForH;
  if(_weeklyHours > 0 && _weeklyHours < 15){
    const annualEl0 = document.getElementById('ct-annual');
    if(annualEl0) annualEl0.value = 0;
    const hintEl0 = document.getElementById('ct-annual-hint');
    if(hintEl0){
      hintEl0.textContent = `(주 소정 ${_weeklyHours}h < 15h → 연차 미적용 · 근로기준법 제18조제3항)`;
      hintEl0.style.display = 'inline';
    }
    if(typeof _onCTPreUsedAnnualChange === 'function') _onCTPreUsedAnnualChange();
    return;
  }

  const days = calcAnnualLeaveDays(hireDateStr, basis, contractStart);
  if(days === null) return;

  const annualEl = document.getElementById('ct-annual');
  if(annualEl) annualEl.value = days;

  // 계산 근거 힌트 표시
  const hintEl = document.getElementById('ct-annual-hint');
  if(hintEl){
    const basisLabel = basis === 'hire_date' ? '입사일 기준' : '회계년도 기준';
    // 1년 미만 + 회계년도 기준이면 비례연차 공식 근거 표시
    let hintMsg = `(${basisLabel} 자동계산: ${days}일)`;
    if(basis !== 'hire_date'){
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
  // 기사용 연차일수 있으면 잔여일수도 표시
  _onCTPreUsedAnnualChange();
}

/** 기사용 연차일수 변경 시 힌트에 잔여일수 표시 */
function _onCTPreUsedAnnualChange(){
  const totalDays = parseFloat(document.getElementById('ct-annual')?.value) || 15;
  const preUsed   = parseFloat(document.getElementById('ct-pre-used-annual')?.value) || 0;
  if(preUsed <= 0) return;
  const remaining = Math.max(0, totalDays - preUsed);
  const hintEl = document.getElementById('ct-annual-hint');
  if(hintEl){
    hintEl.textContent = (hintEl.textContent || '') + ` · 기사용 ${preUsed}일 → 잔여 ${remaining}일`;
  }
}

function toggleAnnualSal(){
  // 수정 모드(editId.contract 있음)이면 ct-type 기준, 신규이면 ct-em-category 기준
  const rawCat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-type')?.value || '')
    : _ctNewCat();
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isRegularGroup = cat ===CONTRACT_TYPE.REGULAR || cat ===CONTRACT_TYPE.REGULAR_PROBATION;
  const isRegularOnly  = cat ===CONTRACT_TYPE.REGULAR;                        // 정규직(수습 제외)
  const isRegularProb   = cat ===CONTRACT_TYPE.REGULAR_PROBATION;              // 정규직 수습
  const isFixedTerm    = cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION;
  const isDaily        = cat ===CONTRACT_TYPE.DAILY;
  if(isDaily) _dailyWageManual = false; // 일용직 전환 시 일급여는 시급 기준 자동계산 상태로 리셋
  _ctPayMethodApply(); // 일용직: 임금 지급 방법(일급/주급/월합산) UI / 그 외: 월 합산 산정기간
  _applyDailyEmpTypeUI(); // 일용직: 상용직 여부에 따라 근무시간표 표시/숨김 (2026-09-03)
  _ctFixBasisTouched = false; // 고용형태/모달 컨텍스트 변경 시 고정 기준 기본값 재적용 (정규직: 연봉 / 계약직: 월약정)
  _ctMonthlySeeded = false;   // 월약정 고정 기준: 모달 오픈 시 계산값 1회 시드

  // ── 상단 섹션 타이틀·라벨 업데이트 ──
  const labelAnnualSal    = document.getElementById('ct-label-annual-sal');
  const wageSectionTitle  = document.getElementById('ct-wage-section-title');
  const labelMonthly      = document.getElementById('ct-label-monthly');
  const dailyWageLabel    = document.querySelector('#ct-row-daily-wage label');

  // 시급 라벨: 일용직은 '기본시급' (주휴수당 미포함), 그 외 '통상시급' (2026-09-03)
  const labelHourly = document.getElementById('ct-hourly-label');
  if(labelHourly) labelHourly.textContent = isDaily ? '기본시급' : '통상시급';

  if(isRegularOnly || isRegularProb){
    if(labelAnnualSal)    labelAnnualSal.innerHTML    = '연봉 <span class="lbl-req" id="ct-annual-req" style="display:none;">*</span> <span class="ct-sub-hint" id="ct-annual-desc">(자동계산)</span>';
    if(wageSectionTitle)  wageSectionTitle.textContent = '임금 조건 (월)';
    if(labelMonthly)      labelMonthly.innerHTML      = '월 약정임금 <span class="lbl-req" id="ct-monthly-req" style="display:none;">*</span> <span class="lbl-desc" id="ct-monthly-desc">(자동계산)</span>';
  } else if(isFixedTerm){
    // 계약직: 연봉 행은 숨김 (월 약정임금 필드로 대체 — 2026-09-03)
    if(wageSectionTitle)  wageSectionTitle.textContent = '임금 조건 (월)';
    if(labelMonthly)      labelMonthly.innerHTML      = '월 약정임금 <span class="lbl-req" id="ct-monthly-req" style="display:none;">*</span> <span class="lbl-desc" id="ct-monthly-desc">(자동계산)</span>';
  } else if(isDaily){
    if(wageSectionTitle)  wageSectionTitle.textContent = '임금 조건 (일일 기준)';
    if(labelMonthly)      labelMonthly.innerHTML      = '일 약정임금 <span class="lbl-desc">(자동계산)</span>';
    if(dailyWageLabel)    dailyWageLabel.innerHTML    = '일급여 <span class="ct-req-star">*</span>';
  }

  // ── (일급) suffix 토글 ──
  document.querySelectorAll('#contract-modal .daily-suffix').forEach(el => {
    el.style.display = isDaily ? 'inline' : 'none';
  });

  // ── 연봉/월약정급여 입력 행 표시 제어 ──
  const rowAnnualSal = document.getElementById('ct-row-annual-sal');
  // 정규직·정규직 수습만 연봉 입력 행 표시 (계약직은 임금조건 섹션의 월 약정임금으로 대체)
  const showAnnualRow = isRegularOnly || isRegularProb;
  if(rowAnnualSal) rowAnnualSal.style.display  = showAnnualRow ? '' : 'none';

  // ── 월 약정임금 표시 행 ──
  const rowMonthly = document.getElementById('ct-row-monthly');
  // 계약직: 자동계산 표시 / 정규직: 표시 / 일용직: 숨김(일일 기준이므로)
  if(rowMonthly) rowMonthly.style.display = isDaily ? 'none' : '';

  // 주 근무일수 / 연차일수 / 주휴수당 행
  const rowAnnualLeave= document.getElementById('ct-row-annual');
  const rowBase       = document.getElementById('ct-row-base');
  const rowWeeklyHol  = document.getElementById('ct-row-weekly-hol');
  const rowDailyWage  = document.getElementById('ct-row-daily-wage');
  if(rowAnnualLeave) rowAnnualLeave.style.display= '';  // 모든 고용형태 표시 (일용직도 연차 발생 가능)
  const rowAnnualGuide= document.getElementById('ct-row-annual-guide');
  if(rowAnnualGuide) rowAnnualGuide.style.display= '';   // 모든 고용형태 표시
  const dailyNote = document.getElementById('ct-annual-daily-note');
  if(dailyNote) dailyNote.style.display = isDaily ? '' : 'none';  // 일용직 연차 안내는 일용직만
  if(rowWeeklyHol)  rowWeeklyHol.style.display  = '';  // 모든 고용형태 표시 (근로기준법 제55조 주휴일 적용)
  if(rowDailyWage)  rowDailyWage.style.display  = isDaily ? '' : 'none';

  // 기본급 행: 정규직·계약직은 자동계산(readonly 파란색), 일용직은 숨김
  if(rowBase) rowBase.style.display = isDaily ? 'none' : '';
  const ctBaseInput = document.getElementById('ct-base');
  const ctBaseAutoMark = document.getElementById('ct-base-auto-mark');
  if(ctBaseInput){
    if(isRegularGroup || isFixedTerm){
      // 정규직·계약직 모두 기본급 자동계산
      ctBaseInput.readOnly = true;
      if(ctBaseAutoMark) ctBaseAutoMark.style.display = 'inline';
    } else {
      ctBaseInput.readOnly = false;
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
    document.getElementById('ct-monthly-computed').textContent = '0원';
    document.getElementById('ct-annual').value = 0;
    // 일급여는 자동계산(readonly) — 통상일급(시급×8) + 일일 수당 합산
    const dailyWageInput = document.getElementById('ct-daily-wage');
    if(dailyWageInput) dailyWageInput.readOnly = true;
    // 일용직: 고정 연장/야간/휴일근로수당 — '상용직 취급(fulltime)'만 표시 (근무시간표 자동계산, 2026-09-03)
    const _dwtFulltime = (typeof _ctDailyEmpTypeVal === 'function' && _ctDailyEmpTypeVal() === 'fulltime');
    ['ct-row-fixed-ot','ct-row-fixed-night','ct-row-fixed-hol'].forEach(id => {
      const el = document.getElementById(id); if(el) el.style.display = _dwtFulltime ? '' : 'none';
    });
    // 일용직: 통상임금 포함·제외 고정수당을 모두 일(일급) 기준으로 표시 (월 단위 항목 제외)
    if(typeof _CT_OPT_ROWS !== 'undefined'){
      _CT_OPT_ROWS.forEach(({key, rowId}) => {
        const el = document.getElementById(rowId); if(!el) return;
        el.style.display = _CT_DAILY_ALLOW_KEYS.has(key) ? '' : 'none';
        // 값 초기화 (일용직 전환 시 일일 기준 금액 재입력)
        if(key === 'childcare'){
          setAmountVal('ct-childcare', 0);
          const depEl = document.getElementById('ct-childcare-dependents');
          if(depEl) depEl.value = 0;
        } else {
          const inputId = rowId.replace('ct-row-', 'ct-');
          setAmountVal(inputId, 0);
        }
      });
    }
    // 일용직: pay_type 초기화 (내부 상태만 초기화 — setCTPayType 호출 안 함 → rowEl.remove() 방지)
    ['car','meal','research','communication','fitness','self_dev','book','overseas','childcare'].forEach(f => {
      _ctPayTypes[f] = '';
    });
  } else {
    const dw = document.getElementById('ct-daily-wage');
    if(dw){ dw.value = ''; dw.readOnly = false; }
    // 주휴수당 산정 안내 힌트: 비일용직(월급제 등)은 숨김
    const _holHint = document.getElementById('ct-weekly-hol-hint');
    if(_holHint) _holHint.style.display = 'none';
    // 일용직 → 타 고용형태 전환 시: 숨겨진 allowance 행 복원
    if(typeof _CT_OPT_ROWS !== 'undefined' && typeof _ctAllowCfgVisible !== 'undefined'){
      _CT_OPT_ROWS.forEach(({key, rowId}) => {
        const el = document.getElementById(rowId);
        if(el) el.style.display = _ctAllowCfgVisible[key] ? '' : 'none';
      });
    }
  }
  // 고정 기준 UI 반영 (직접 입력 항목 활성화 / 나머지 자동계산)
  _applyFixBasisUI();
  calcContractSalary();
}
// onSalaryStartChange 제거 — salary_start_date = contract_start 통합

function toggleProbation(){
  const rawCat = _ctNewCat()
              || document.getElementById('ct-type')?.value 
              || CONTRACT_TYPE.REGULAR;
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;

  // 시스템 설정: 수습 기능 OFF → 항상 숨김
  const _probFeatureOn = window._probationFeatureEnabled !== false;
  const isProbation = _probFeatureOn && (cat ===CONTRACT_TYPE.REGULAR_PROBATION || cat ===CONTRACT_TYPE.FIXED_PROBATION);
  const sec = document.getElementById('ct-probation-section');
  const probRow = document.getElementById('ct-probation-row');  // 수습기간+종료일 2열 행
  const probPeriodRow = document.getElementById('ct-row-probation-period'); // 수습기간 select
  if(sec) sec.style.display = isProbation ? '' : 'none';
  if(probRow) probRow.style.display = isProbation ? 'grid' : 'none';
  if(probPeriodRow) probPeriodRow.style.display = isProbation ? '' : 'none';
  // 수습 종료일 열: probation 여부에 따라 표시
  const probEndCol = document.getElementById('ct-probation-end-col');
  if(probEndCol) probEndCol.style.display = isProbation ? '' : 'none';
  if(!isProbation){
    // 수습기간 select 초기화
    const _probMonEl = document.getElementById('ct-probation-months');
    if(_probMonEl) _probMonEl.value = '';
    document.getElementById('ct-probation-pct').value = '';
    document.getElementById('ct-probation-amt').value = '';
    // 산정기준 라디오 초기화
    const r = document.getElementById('ct-prob-basis-salary');
    if(r){ r.checked = true; onProbationBasisChange(); }
    // 수습 아닌 경우 경고 상자 강제 숨김
    const wr = document.getElementById('ct-prob-minwage-warning-row');
    if(wr) wr.style.display = 'none';
    // 계약 종료일 편집 가능 복원
    _setProbationEndReadonly(false);
  } else {
    onProbationBasisChange(); // 표시될 때 UI 동기화
    _checkProbMinWageWarning(); // 경고 갱신
    // 계약직 수습: 계약 종료일이 입력된 후에만 수습기간 활성화 (종료일 초과 방지)
    // 시작일·종료일 미입력 시 수습기간 비활성화
    if(typeof _updateProbationPeriodState === 'function') _updateProbationPeriodState();
    _autoCalcProbationEndDate(); // 수습기간 입력값으로 자동 계산
  }
}

// 수습 계약: 계약 종료일 필드 readonly 토글 + 힌트
function _setProbationEndReadonly(readonly){
  const endEl = document.getElementById('ct-end');
  if(endEl){
    endEl.readOnly = readonly;
    if(readonly){
      endEl.classList.add('ct-input-locked');
    } else {
      endEl.classList.remove('ct-input-locked');
    }
  }
  // ct-end-hint 제거됨 (신규 레이아웃)
}

// 수습기간 변경 시 계약 종료일 자동 계산 (시작일 + 수습개월 - 1일)
function _autoCalcProbationEndDate(){
  const monthsEl = document.getElementById('ct-probation-months');
  const months = parseInt(monthsEl?.value) || 0;
  if(!months) { 
    const peEl = document.getElementById('ct-probation-end-date'); if(peEl) peEl.value = '';
    return; 
  }

  // 계약 시작일
  const startVal = document.getElementById('ct-start')?.value || '';
  if(!startVal) return;

  const startDate = new Date(startVal);
  startDate.setMonth(startDate.getMonth() + months);
  startDate.setDate(startDate.getDate() - 1);
  const endStr = fmtLocalDate(startDate);

  // 수습 종료일 필드에 자동 계산값 표시 (contract_end와 별도)
  const probEndEl = document.getElementById('ct-probation-end-date');
  if(probEndEl) probEndEl.value = endStr;

  // ── 계약직 수습: 수습 종료일이 계약 종료일을 초과하는지 검증 ──
  const rawCat = _ctNewCat()
              || document.getElementById('ct-type')?.value
              || CONTRACT_TYPE.REGULAR;
  const cat2 = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  if(cat2 === CONTRACT_TYPE.FIXED_PROBATION){
    const contractEndEl = document.getElementById('ct-end');
    const contractEnd = contractEndEl?.value;
    if(contractEnd && endStr > contractEnd){
      // 수습 종료일이 계약 종료일을 초과 → 경고 표시 + 수습기간 select 테두리 강조
      if(monthsEl){
        monthsEl.classList.add('va-input-err');
        monthsEl.style.boxShadow = '0 0 0 2px rgba(239,68,68,.2)';
      }
      const infoBox = document.getElementById('ct-prob-info-box');
      const infoText = document.getElementById('ct-prob-info-text');
      if(infoBox) infoBox.style.background = '#fef2f2';
      if(infoBox) infoBox.style.border = '1px solid #fca5a5';
      if(infoBox) infoBox.style.color = '#991b1b';
      if(infoText) infoText.innerHTML = '<i class="fas fa-exclamation-triangle ct-va-icon-danger"></i>수습 종료일(' + endStr + ')이 계약 종료일(' + contractEnd + ')보다 늦습니다. 수습기간을 줄여주세요.';
      // 계약 종료일은 변경 방지 (읽기전용)
      _setProbationEndReadonly(true);
    } else if(contractEnd){
      // 정상: 수습 종료일 ≤ 계약 종료일 → 계약 종료일 읽기전용 잠금
      if(monthsEl){
        monthsEl.classList.remove('va-input-err');
        monthsEl.style.boxShadow = '';
      }
      const infoBox2 = document.getElementById('ct-prob-info-box');
      const infoText2 = document.getElementById('ct-prob-info-text');
      if(infoBox2) infoBox2.style.background = '';
      if(infoBox2) infoBox2.style.border = '';
      if(infoBox2) infoBox2.style.color = '';
      _setProbationEndReadonly(true);
    }
  }
}

// ── 산정기준 라디오 변경 핸들러 ──
function onProbationBasisChange(){
  const basis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary';
  const isMinwage = basis === 'minwage';
  const isDirect  = basis === 'direct';
  const isSalary  = basis === 'salary';

  // ── 라디오 라벨 스타일 (활성=indigo 테두리/배경, 비활성=회색) ──
  const labelMap = {
    salary:  document.getElementById('ct-prob-basis-label-salary'),
    minwage: document.getElementById('ct-prob-basis-label-minwage'),
    direct:  document.getElementById('ct-prob-basis-label-direct'),
  };
  Object.entries(labelMap).forEach(([key, el]) => {
    if(!el) return;
    el.classList.toggle('active', key === basis);
  });

  // ── % 행: salary / minwage일 때만 표시, direct일 때 숨김 ──
  const pctRow = document.getElementById('ct-prob-pct-row');
  if(pctRow) pctRow.style.display = isDirect ? 'none' : '';

  // ── % 레이블 업데이트 ──
  const pctLabel = document.getElementById('ct-prob-pct-label');
  if(pctLabel) pctLabel.innerHTML = (isMinwage ? '수습 임금 (최저임금의 %)' : '수습 임금 (약정 보수의 %)') + ' <span class="ct-req-star">*</span>';

  // ── 금액 입력 필드 읽기전용 여부 ──
  // salary/minwage: % 연동으로 자동계산 → readonly
  // direct: 사용자가 직접 입력 → 편집 가능
  const amtEl = document.getElementById('ct-probation-amt');
  const amtLabel = document.getElementById('ct-prob-amt-label');
  if(amtEl){
    if(isDirect){
      amtEl.removeAttribute('readonly');
      amtEl.style.background = '';
      amtEl.style.color = '';
      amtEl.style.cursor = '';
      amtEl.style.fontWeight = '';
      amtEl.classList.add('ct-amount-active');
      amtEl.placeholder = '수습 월 보수를 직접 입력';
    } else {
      amtEl.setAttribute('readonly', 'readonly');
      amtEl.style.background = '#f9fafb';
      amtEl.style.color = '#9ca3af';
      amtEl.style.cursor = 'default';
      amtEl.style.fontWeight = '400';
      amtEl.classList.remove('ct-amount-active');
      amtEl.placeholder = '0';
    }
  }
  if(amtLabel) amtLabel.innerHTML = (isDirect ? '수습 임금 (월 금액, 직접 입력) <span class="lbl-req">*</span>' : '수습 임금 (월 금액) <span class="lbl-desc">(자동 계산)</span>');

  // ── 안내문 업데이트 ──
  const infoText = document.getElementById('ct-prob-info-text');
  if(infoText){
    if(isDirect){
      infoText.innerHTML = '수습 기간 중 지급할 월 보수를 직접 입력합니다. 최저임금 미달 여부는 저장 시 자동 검증됩니다.';
    } else if(isMinwage){
      const hireRaw = document.getElementById('ct-start')?.value || '';
      const yr = hireRaw ? parseInt(hireRaw.slice(0,4)) : new Date().getFullYear();
      // 최저임금: 해당 연도 데이터가 없으면 최신 연도 데이터로 폴백
      const mw = (_allMinimumWages||[]).find(w => Number(w.year) === yr)
        || (_allMinimumWages||[]).sort((a,b)=>b.year-a.year)[0];
      const mwAmt = mw ? Number(mw.hourly_wage) : 0;
      const mwMonthly = mwAmt > 0 ? Math.round(mwAmt * 209) : 0;
      infoText.innerHTML = `${yr}년 최저시급 기준으로 계산됩니다.`
        + (mwAmt > 0
          ? ` <strong>${yr}년 최저시급: ${mwAmt.toLocaleString('ko-KR')}원 → 월 환산: ${mwMonthly.toLocaleString('ko-KR')}원</strong>`
          : ' <span class="ct-text-danger">(최저임금 데이터를 먼저 등록해주세요)</span>');
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
    const hireRaw = document.getElementById('ct-start')?.value || '';
    const yr = hireRaw ? parseInt(hireRaw.slice(0,4)) : new Date().getFullYear();
    // 최저임금: 해당 연도 데이터가 없으면 최신 연도 데이터로 폴백
    const mw = (_allMinimumWages||[]).find(w => Number(w.year) === yr)
      || (_allMinimumWages||[]).sort((a,b)=>b.year-a.year)[0];
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
  const amt = parseFloat(document.getElementById('ct-probation-amt').value);
  const ref = getProbationBase();
  if(basis !== 'direct'){
    // salary/minwage 모드: % 역산
    if(!isNaN(amt) && ref > 0){
      document.getElementById('ct-probation-pct').value = (amt / ref * 100).toFixed(1);
    }
  } else {
    // direct 모드: 계약 조항(월 약정임금) 대비 직접액 비율 안내 (2026-09-01 규칙)
    const infoText = document.getElementById('ct-prob-info-text');
    if(infoText && !isNaN(amt) && ref > 0){
      const ratioPct = amt / ref * 100;
      infoText.innerHTML = `수습 기간 중 지급할 월 보수를 직접 입력합니다. — 정상 월 약정임금(${ref.toLocaleString('ko-KR')}원) 대비 <strong>${ratioPct.toFixed(1)}%</strong> (수습기간 급여는 전 지급 항목에 이 비율이 적용됩니다)`;
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

  const _rawEmCat = _ctNewCat()
                  || document.getElementById('ct-edit-em-category')?.value
                  || document.getElementById('ct-type')?.value
                  || '';
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
  // 시작일: 신규/수정 공통 ct-start 참조
  const hireRaw = document.getElementById('ct-start')?.value || '';
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
      + '<div class="ct-va-banner-item">'
      + '정규직 수습 근로자의 임금은 <strong>최저임금의 90% 이상</strong>이어야 합니다.'
      + ' (' + yr + '년 최저임금 월환산 ' + fmt(mwMonthly) + '원의 90% = <strong>' + fmt(limit90) + '원</strong> 이상)'
      + '</div>'
      + '<div class="ct-va-banner-detail">'
      + '📖 <strong>최저임금법 제5조 제2항</strong>: 수습을 시작한 날부터 3개월 이내인 자에 대하여는 '
      + '최저임금액의 100분의 10을 감한 금액을 최저임금액으로 한다.'
      + '</div>'
      + '<div class="ct-va-banner-detail">'
      + '※ 단, <strong>1년 미만 기간제(계약직 수습)</strong>에는 감액 규정이 적용되지 않아 '
      + '반드시 최저임금의 <strong>100%</strong> 이상이어야 합니다.'
      + '</div>';
    warningRow.style.display = '';
  } else if(isContract && actualAmt < limit100){
    // 계약직 수습 — 100% 미만: 법 위반 (1년 미만 기간제 → 감액 불가)
    warningBox.className = 'ct-va-banner-box ct-va-banner-danger';
    warningBox.innerHTML =
      '<div class="ct-va-banner">'
      + '<i class="fas fa-times-circle ct-va-icon-danger"></i>'
      + '⚠️ 최저임금 법 위반 — 수습 임금(' + fmt(actualAmt) + '원)이 최저임금(100%) 미만입니다'
      + '</div>'
      + '<div class="ct-va-banner-item">'
      + '계약직(1년 미만 기간제) 수습 근로자의 임금은 <strong>최저임금의 100% 이상</strong>이어야 합니다.'
      + ' (' + yr + '년 최저임금 월환산 <strong>' + fmt(limit100) + '원</strong> 이상)'
      + '</div>'
      + '<div class="ct-va-banner-detail">'
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

  // 고용형태 결정 (신규: 선택된 근로자, 수정/재계약: ct-edit-em-category 또는 ct-type)
  const rawCat = _ctNewCat()
    || document.getElementById('ct-edit-em-category')?.value
    || document.getElementById('ct-type')?.value
    || '';
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;

  const isDaily       = cat ===CONTRACT_TYPE.DAILY;
  const isRegular     = cat ===CONTRACT_TYPE.REGULAR;
  const isFixedTerm   = cat ===CONTRACT_TYPE.FIXED;
  const isTarget      = isDaily || isRegular || isFixedTerm; // 수습 제외
  if(!isTarget){ wRow.style.display='none'; _checkRegisterBtnState(); return; }

  // ── 계약 시작 연도 결정 — 신규/수정 공통 ct-start 참조 ──
  const hireRaw = document.getElementById('ct-start')?.value || '';
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
    // 일용직: 기본시급(주휴수당 미포함)만으로 최저임금 위반 판별 (2026-09-03)
    const _directHW = getAmountVal('ct-hourly-input');
    if(_directHW <= 0){ wRow.style.display='none'; _checkRegisterBtnState(); return; }
    compareHourly  = _directHW;
    compareMonthly = Math.round(_directHW * 209); // 월 환산 (209h 기준)
    compareLabel   = `기본시급 ${fmt(_directHW)}원 → 월 환산 ${fmt(compareMonthly)}원 (209h 기준)`;
  } else {
    // 정규직·계약직: 통상시급 직접 입력값을 기준으로 비교 (입력된 시급이 곧 기준)
    const _directHW = getAmountVal('ct-hourly-input');
    if(_directHW <= 0){ wRow.style.display='none'; _checkRegisterBtnState(); return; }
    compareHourly  = _directHW;
    compareMonthly = Math.round(_directHW * MAGIC.MONTHLY_STD_HOURS);
    compareLabel   = `통상시급 ${fmt(_directHW)}원 → 월 환산 ${fmt(compareMonthly)}원 (${MAGIC.MONTHLY_STD_HOURS}h 기준)`;
  }

  if(compareHourly <= 0){ wRow.style.display='none'; _checkRegisterBtnState(); return; }

  // ── 위반 여부 판정 (비수습은 100% 기준) ──
  if(compareHourly < legalHourly){
    const shortfall    = legalHourly - compareHourly;
    const shortMonthly = legalMonthly - compareMonthly;
    const typeName = isDaily ? CONTRACT_TYPE_LABEL[CONTRACT_TYPE.DAILY] : isRegular ? CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR] : CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED];

    wBox.innerHTML =
      `<div class="ct-va-banner-title">
         <i class="fas fa-exclamation-triangle ct-va-icon-danger"></i>
         ⚠️ 최저임금 법 위반 — ${typeName} 급여가 ${yr}년 법정 최저임금에 미달합니다
       </div>
       <div class="ct-va-banner-box">
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

// ── 일괄설정 체크박스를 실제 스케줄 상태와 동기화 ──
function _syncBulkCheckboxes(){
  DAY_KEYS.forEach(key => {
    const chk = document.getElementById('bulk-chk-'+key);
    if(!chk) return;
    // 첫 번째 시프트의 start 값이 있고 disabled가 아니면 활성 상태
    const sEl = document.getElementById(`ct-sch-start-${key}`);
    const isActive = sEl && !sEl.disabled && sEl.value;
    chk.checked = isActive;
  });
  // weekday 체크박스 동기화
  const allWeekdayChecked = ['mon','tue','wed','thu','fri'].every(d =>
    document.getElementById('bulk-chk-'+d)?.checked
  );
  const weekdayChk = document.getElementById('bulk-chk-weekday');
  if(weekdayChk) weekdayChk.checked = allWeekdayChecked;
}

// ── 일괄설정 바 시간을 첫 번째 활성 요일의 스케줄로 초기화 ──
function _initBulkFromFirstActive(){
  for(const key of DAY_KEYS){
    const sEl = document.getElementById(`ct-sch-start-${key}`);
    const eEl = document.getElementById(`ct-sch-end-${key}`);
    if(!sEl || sEl.disabled || !sEl.value) continue;
    // 첫 번째 활성 요일 찾음 → 일괄설정 바에 반영
    _setTimePickerValue('bulk-start', sEl.value);
    if(eEl) _setTimePickerValue('bulk-end', eEl.value);
    // 휴게시간: 첫 번째 휴게 슬롯 복사
    const slots = _getBrkSlots2(key, 0);
    if(slots && slots.length > 0){
      _setTimePickerValue('bulk-brks', slots[0].s || '');
      _setTimePickerValue('bulk-brke', slots[0].e || '');
    } else {
      _setTimePickerValue('bulk-brks', '');
      _setTimePickerValue('bulk-brke', '');
    }
    return; // 첫 번째 활성 요일만 사용
  }
  // 활성 요일이 없으면 기본값
  _setTimePickerValue('bulk-start', '09:00');
  _setTimePickerValue('bulk-end', '18:00');
  _setTimePickerValue('bulk-brks', '12:00');
  _setTimePickerValue('bulk-brke', '13:00');
}

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

  if(!start || !end){ toast('근무 시간을 입력해 주세요.', 'error'); return; }
  if(!timeToMins(start) || !timeToMins(end)){ toast('시간은 HH:MM(24시) 형식으로 입력해 주세요.', 'error'); return; }
  if(brks && brke){ const _bs=timeToMins(brks),_be=timeToMins(brke); if(_bs!==null&&_be!==null&&_bs>=_be){ toast('휴게 종료 시간이 시작 시간보다 늦어야 합니다.', 'error'); return; } }

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
      if(typeof _refreshShiftConstraints === 'function') _refreshShiftConstraints(key);
      applied++;
    } else {
      container.innerHTML = _shiftGroupHTML(key, 0, false, '', '', []);
    }
  });
  calcWorkHours();
  if(typeof _syncBulkCheckboxes === 'function') _syncBulkCheckboxes();
  toast(`${applied}개 요일에 근무시간이 일괄 적용되었습니다. ✔`, 'success');
}

// ── 24시제 시/분 선택 HTML 생성 ──
// id: 숨겨진 input의 id (기존 코드 호환), value: "HH:MM", dis: disabled 여부, ph: placeholder 시
function _timePickerHTML(id, value, dis, ph){
  const v = value || '';
  const [h, m] = v.split(':');
  const selH = v ? (h || '00') : '';
  const selM = v ? (m || '00') : '';
  const hours = Array.from({length:24}, (_,i)=>String(i).padStart(2,'0'));
  const mins  = ['00','05','10','15','20','25','30','35','40','45','50','55'];
  const emptyOpt = '<option value="" ' + (v?'':'selected') + ' disabled>--</option>';
  const optsH = emptyOpt + hours.map(hh => `<option value="${hh}" ${hh===selH?'selected':''}>${hh}</option>`).join('');
  const optsM = emptyOpt + mins.map(mm => `<option value="${mm}" ${mm===selM?'selected':''}>${mm}</option>`).join('');
  const d = dis ? 'disabled' : '';
  return `<span class="time-picker" style="display:inline-flex;align-items:center;gap:1px;">
    <select class="tp-h" data-tp="${id}" onchange="_syncTimePicker('${id}')" ${d}
      style="width:44px;font-size:11px;padding:2px 0;text-align:center;border:1px solid #d1d5db;border-radius:3px 0 0 3px;appearance:none;background:#fff;">${optsH}</select>
    <span style="font-size:10px;color:#94a3b8;line-height:1;">:</span>
    <select class="tp-m" data-tp="${id}" onchange="_syncTimePicker('${id}')" ${d}
      style="width:44px;font-size:11px;padding:2px 0;text-align:center;border:1px solid #d1d5db;border-radius:0 3px 3px 0;appearance:none;background:#fff;">${optsM}</select>
    <input type="hidden" id="${id}" value="${v}" />
  </span>`;
}
// ── 시/분 select → hidden input 동기화 + calcWorkHours 호출 ──
function _syncTimePicker(id){
  const wrap = document.querySelector(`[data-tp="${id}"]`)?.parentElement;
  if(!wrap) return;
  const hSel = wrap.querySelector('.tp-h');
  const mSel = wrap.querySelector('.tp-m');
  const hidden = document.getElementById(id);
  if(hSel && mSel && hidden){
    hidden.value = (hSel.value && mSel.value) ? hSel.value + ':' + mSel.value : '';
    hidden.dispatchEvent(new Event('input', {bubbles:true}));
    // 같은 요일 다른 시프트와 중첩 방지 제약 갱신
    const m = id.match(/^ct-sch-(?:start|end)-(\w+)/);
    if(m) _refreshShiftConstraints(m[1]);
    if(typeof calcWorkHours === 'function') calcWorkHours();
  }
}

// ── 같은 요일 내 시프트 간 중첩 방지 ──
function _refreshShiftConstraints(key){
  // 모든 시프트의 start/end 수집
  let shiftIdx = 0;
  const shifts = [];
  while(true){
    const sid = shiftIdx === 0 ? '' : '-' + shiftIdx;
    const sEl = document.getElementById(`ct-sch-start-${key}${sid}`);
    if(!sEl){ if(shiftIdx===0){ shiftIdx++; continue; } break; }
    const eEl = document.getElementById(`ct-sch-end-${key}${sid}`);
    const sVal = sEl.value;
    const eVal = eEl ? eEl.value : '';
    // 시간+분 파싱
    const toMin = t => { if(!t) return null; const [h,m]=t.split(':').map(Number); return h*60+m; };
    shifts.push({ idx: shiftIdx, sid, start: sVal, end: eVal, sMin: toMin(sVal), eMin: toMin(eVal),
      sId: `ct-sch-start-${key}${sid}`, eId: `ct-sch-end-${key}${sid}` });
    shiftIdx++;
  }

  // 요일별 오류 초기화
  const errEl = document.getElementById(`ct-sch-err-${key}`);
  const blockedShifts = [];

  // 각 시프트의 start/end select에 전달할 차단 시간 집합 계산
  shifts.forEach(sh => {
    if(sh.sMin === null || sh.eMin === null) return;
    let eMin = sh.eMin;
    if(eMin <= sh.sMin) eMin += 24*60;

    const blockedStart = new Set();
    const blockedEnd   = new Set();
    let hasOverlap = false;

    shifts.forEach(other => {
      if(other.idx === sh.idx) return;
      if(other.sMin === null || other.eMin === null) return;
      let oeMin = other.eMin;
      if(oeMin <= other.sMin) oeMin += 24*60;

      const oFromH = other.sMin / 60 | 0;
      const oToH   = Math.ceil(oeMin / 60);
      // 종료시각이 속한 시간대까지만 차단 (18:30 → 18시까지, 19시는 해방)
      const oToHExcl = oToH - 1;
      for(let h = oFromH; h <= oToHExcl; h++) blockedStart.add((h + 24) % 24);

      for(let h = other.sMin / 60 | 0; h < Math.ceil(oeMin / 60); h++){
        const hMod = (h + 24) % 24;
        if(hMod === (other.sMin / 60 | 0) % 24) continue;
        blockedEnd.add(hMod);
      }

      // 중첩 여부 확인 (분 단위, 경계 허용)
      if(sh.sMin < oeMin && eMin > other.sMin){
        hasOverlap = true;
      }
    });

    _constrainSelectHours(sh.sId, blockedStart);
    _constrainSelectHours(sh.eId, blockedEnd);

    if(hasOverlap) blockedShifts.push(sh.idx + 1);
  });

  // 오류 메시지
  if(errEl){
    if(blockedShifts.length > 0){
      errEl.textContent = `⚠️ 시프트 ${blockedShifts.join(', ')}번 시간이 중첩됩니다. 다시 설정하세요.`;
      errEl.style.display = '';
    } else {
      errEl.style.display = 'none';
    }
  }

  // 시프트별 강조 표시
  shifts.forEach(sh => {
    const sid = sh.idx === 0 ? '' : '-' + sh.idx;
    const shiftEl = document.getElementById(`ct-sch-shift-${key}${sid}`);
    if(shiftEl) shiftEl.style.borderLeft = blockedShifts.includes(sh.idx + 1) ? '3px solid #ef4444' : '';
  });
}

// ── select의 option에서 blockedHours에 해당하는 시간 제거 ──
function _constrainSelectHours(inputId, blockedHours){
  const hidden = document.getElementById(inputId);
  if(!hidden) return;
  const wrap = hidden.parentElement;
  if(!wrap) return;
  const hSel = wrap.querySelector('.tp-h');
  if(!hSel) return;

  const curVal = hSel.value;
  const emptyOpt = '<option value="" disabled>--</option>';
  const opts = [];
  for(let h = 0; h < 24; h++){
    const hh = String(h).padStart(2, '0');
    if(blockedHours.has(h) && hh !== curVal) continue;
    const sel = hh === curVal ? 'selected' : '';
    const dis = blockedHours.has(h) ? 'disabled' : '';
    opts.push(`<option value="${hh}" ${sel} ${dis}>${hh}</option>`);
  }
  hSel.innerHTML = emptyOpt + opts.join('');
}
// 외부에서 값 설정 시 select 동기화
function _setTimePickerValue(id, value){
  const hidden = document.getElementById(id);
  if(!hidden) return;
  hidden.value = value || '';
  const wrap = hidden.parentElement;
  if(!wrap) return;
  const hSel = wrap.querySelector('.tp-h');
  const mSel = wrap.querySelector('.tp-m');
  if(!hSel || !mSel) return;
  const [h, m] = (value||':').split(':');
  if(h) hSel.value = h;
  if(m) mSel.value = m;
}

// ── 일괄설정 바 시/분 선택기 초기화 ──
function _initBulkTimePickers(){
  const items = [
    { id: 'bulk-start',  val: '09:00', ph: '09' },
    { id: 'bulk-end',    val: '18:00', ph: '18' },
    { id: 'bulk-brks',   val: '12:00', ph: '12' },
    { id: 'bulk-brke',   val: '13:00', ph: '13' },
  ];
  items.forEach(({id, val, ph}) => {
    const el = document.getElementById(`tp-${id}`);
    if(!el) return;
    el.innerHTML = _timePickerHTML(id, val, false, ph);
    el.style.display = 'inline-flex';
    el.style.alignItems = 'center';
    el.style.gap = '1px';
  });
}

// ── 시프트 그룹 렌더 헬퍼 ──
function _shiftGroupHTML(key, idx, enabled, start, end, breaks){
  const isReadonly = document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly');
  const dis = (enabled && !isReadonly) ? '' : 'disabled';
  const s = start || '';
  const e = end   || '';
  const defBreaks = [{s:'', e:''}];
  const brks = (breaks && breaks.length) ? breaks : defBreaks;
  const sid = idx===0 ? '' : '-'+idx;
  return `<div class="shift-group" id="ct-sch-shift-${key}${sid}">
    <span style="font-size:10.5px;color:#6b7280;font-weight:700;white-space:nowrap;">근무</span>
    ${_timePickerHTML(`ct-sch-start-${key}${sid}`, s, !enabled, '09')}
    <span style="font-size:10.5px;color:#6b7280;white-space:nowrap;">~</span>
    ${_timePickerHTML(`ct-sch-end-${key}${sid}`, e, !enabled, '18')}
    <span style="font-size:10.5px;color:#6b7280;white-space:nowrap;margin-left:20px;">휴게</span>
    <div class="brk-slots-wrap" id="ct-sch-brkwrap-${key}${sid}">${_brkSlotsHTML2(key, idx, enabled, brks)}</div>
    ${idx===0
      ? `<button type="button" class="btn-brk-add shift-add" onclick="_addShift('${key}')" title="시프트 추가">+</button><button type="button" class="btn-brk-del shift-del" onclick="_deactivateShift('${key}')" ${dis} title="비활성화">−</button>`
      : `<button type="button" class="btn-brk-del shift-del" onclick="_removeShift('${key}',${idx})" title="시프트 삭제">−</button>`}
  </div>`;
}

// ── 첫 번째 시프트 비활성화 ──
function _deactivateShift(key){
  if(document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly')) return;
  const container = document.getElementById(`ct-sch-shifts-${key}`);
  if(!container) return;
  container.innerHTML = _shiftGroupHTML(key, 0, false, '', '', []);
  calcWorkHours();
}

// ── 시프트용 휴게 슬롯 HTML (idx 포함) ──
function _brkSlotsHTML2(key, shiftIdx, enabled, breaks){
  const sid = shiftIdx===0 ? '' : '-'+shiftIdx;
  return breaks.map((b, idx) => {
    const bidS = `ct-sch-brk-s-${key}${sid}-${idx}`;
    const bidE = `ct-sch-brk-e-${key}${sid}-${idx}`;
    return `<div class="brk-slot-row" id="ct-sch-brkrow-${key}${sid}-${idx}">
      ${_timePickerHTML(bidS, b.s||'', !enabled, '12')}
      <span class="brk-sep">~</span>
      ${_timePickerHTML(bidE, b.e||'', !enabled, '13')}
      ${idx > 0
        ? `<button type="button" class="btn-brk-del" onclick="_removeBrkSlot2('${key}',${shiftIdx},${idx})" ${!enabled?'disabled':''} title="휴게 삭제">−</button>`
        : ''}
    </div>`;
  }).join('');
}

// ── 시프트 추가 ──
function _addShift(key){
  if(document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly')) return;
  const row = document.getElementById(`ct-sch-row-${key}`);
  const container = row?.querySelector('.td-shifts .shifts-container');
  if(!container) return;
  const existing = container.querySelectorAll('.shift-group');
  // 첫 번째 시프트가 비활성 상태이면 활성화
  if(existing.length === 1){
    const firstSel = container.querySelector('.tp-h');
    if(firstSel && firstSel.disabled){
      container.innerHTML = _shiftGroupHTML(key, 0, true, '', '', []);
      _refreshShiftConstraints(key);
      calcWorkHours();
      return;
    }
  }
  // 이미 활성 상태면 새 시프트 추가 (시작시간 = 이전 시프트 종료시간)
  const idx = existing.length;
  // 이전 시프트의 종료시간 가져오기
  let prevEnd = '';
  if(idx > 0){
    const prevSid = idx === 1 ? '' : '-' + (idx - 1);
    const prevEndEl = document.getElementById(`ct-sch-end-${key}${prevSid}`);
    if(prevEndEl) prevEnd = prevEndEl.value;
  }
  const html = _shiftGroupHTML(key, idx, true, prevEnd, '', []);
  const div = document.createElement('div');
  div.innerHTML = html;
  container.appendChild(div.firstElementChild);
  _refreshShiftConstraints(key);
  calcWorkHours();
}

// ── 시프트 삭제 ──
function _removeShift(key, idx){
  if(document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly')) return;
  const sid = idx===0 ? '' : '-'+idx;
  const shift = document.getElementById(`ct-sch-shift-${key}${sid}`);
  if(shift) shift.remove();
  _refreshShiftConstraints(key);
  calcWorkHours();
}

// ── 시프트용 휴게 슬롯 추가 ──
function _addBrkSlot2(key, shiftIdx){
  if(document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly')) return;
  const sid = shiftIdx===0 ? '' : '-'+shiftIdx;
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}${sid}`);
  if(!wrap) return;
  const idx = wrap.querySelectorAll('.brk-slot-row').length;
  const row = document.createElement('div');
  row.className = 'brk-slot-row';
  row.id = `ct-sch-brkrow-${key}${sid}-${idx}`;
  const bidS = `ct-sch-brk-s-${key}${sid}-${idx}`;
  const bidE = `ct-sch-brk-e-${key}${sid}-${idx}`;
  row.innerHTML =
    _timePickerHTML(bidS, '', false, '12')
    + `<span class="brk-sep">~</span>`
    + _timePickerHTML(bidE, '', false, '13')
    + `<button type="button" class="btn-brk-del" onclick="_removeBrkSlot2('${key}',${shiftIdx},${idx})" title="휴게 삭제">−</button>`;
  wrap.appendChild(row);
  calcWorkHours();
}

function _removeBrkSlot2(key, shiftIdx, idx){
  if(document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly')) return;
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
  rows.forEach((row, idx)=>{
    const sEl = document.getElementById(`ct-sch-brk-s-${key}${sid}-${idx}`);
    const eEl = document.getElementById(`ct-sch-brk-e-${key}${sid}-${idx}`);
    result.push({ s: sEl ? sEl.value : '', e: eEl ? eEl.value : '' });
  });
  return result;
}
function _getBrkSlots(key){
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}`);
  if(!wrap) return [];
  const rows = wrap.querySelectorAll('.brk-slot-row');
  const result = [];
  rows.forEach((row, idx)=>{
    const sEl = document.getElementById(`ct-sch-brk-s-${key}-${idx}`);
    const eEl = document.getElementById(`ct-sch-brk-e-${key}-${idx}`);
    result.push({ s: sEl ? sEl.value : '', e: eEl ? eEl.value : '' });
  });
  return result;
}
function _addBrkSlot(key){
  if(document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly')) return;
  const wrap = document.getElementById(`ct-sch-brkwrap-${key}`);
  if(!wrap) return;
  const idx = wrap.querySelectorAll('.brk-slot-row').length;
  const newRow = document.createElement('div');
  newRow.className = 'brk-slot-row';
  newRow.id = `ct-sch-brkrow-${key}-${idx}`;
  const bidS = `ct-sch-brk-s-${key}-${idx}`;
  const bidE = `ct-sch-brk-e-${key}-${idx}`;
  newRow.innerHTML =
    _timePickerHTML(bidS, '', false, '12')
    + `<span class="brk-sep">~</span>`
    + _timePickerHTML(bidE, '', false, '13')
    + `<button type="button" class="btn-brk-del" onclick="_removeBrkSlot('${key}',${idx})" title="휴게 슬롯 삭제">−</button>`;
  wrap.appendChild(newRow);
  calcWorkHours();
}
function _removeBrkSlot(key, idx){
  if(document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly')) return;
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
  wrap.innerHTML = _brkSlotsHTML2(key, 0, enabled, breaks);
}

function initScheduleTable(){
  const tbody = document.getElementById('ct-schedule-tbody');
  if(!tbody) return;
  tbody.innerHTML = DAY_KEYS.map((key,i)=>{
    const enabled = false; // 모든 요일 비활성 상태로 시작 (+버튼 또는 일괄설정으로 활성화)
    const color = i>=5 ? (i===5?'#2563eb':'#dc2626') : '#1e293b';
    return `
    <tr class="${DAY_CLASSES[i]}" id="ct-sch-row-${key}">
      <td><span class="day-label" style="color:${color}">${DAYS_KR[i]}</span></td>
      <td class="td-shifts">
        <div class="shifts-container" id="ct-sch-shifts-${key}">${_shiftGroupHTML(key, 0, enabled, '', '', null)}</div>
        <div class="shift-error" id="ct-sch-err-${key}" style="display:none;color:#ef4444;font-size:11px;margin-top:4px;width:100%;"></div>
      </td>
      <td><span class="computed-h" id="ct-sch-hrs-${key}">-</span></td>
    </tr>`;
  }).join('');
  calcWorkHours();
}

function timeToMins(t){
  if(!t || typeof t !== 'string') return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if(!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if(h > 23 || min > 59) return null;
  return h * 60 + min;
}

function calcWorkHours(){
  const STATUTORY_DAILY = 8 * 60;   // 법정 1일 소정근로시간 (480분)
  const STATUTORY_WEEKLY = 40 * 60; // 법정 1주 소정근로시간 (2400분)
  const NIGHT_START = 22 * 60;      // 야간 시작 22:00 (1320분)
  const NIGHT_END   = 30 * 60;      // 야간 종료 익일 06:00 (1800분)

  let totalStatMins = 0, totalOtMins = 0, totalNightMins = 0, totalHolMins = 0, totalHolOtMins = 0;
  let totalWdayNightMins = 0, totalSunNightMins = 0; // 평일야간/휴일야간 구분
  let workDays = 0;

  // ── Pass 1: 요일별 근로시간 산출 ──
  const dayResults = [];
  DAY_KEYS.forEach(key => {
    const isHol = key === 'sun' || key === 'sat'; // 토·일 모두 휴일근로 (2026-08-14 규칙)
    let dayMins = 0, dayNightMins = 0;

    let shiftIdx = 0;
    while (true) {
      const sid = shiftIdx === 0 ? '' : '-' + shiftIdx;
      const sEl = document.getElementById(`ct-sch-start-${key}${sid}`);
      if (!sEl) { if (shiftIdx === 0) { shiftIdx++; continue; } break; }
      const s = timeToMins(sEl.value);
      const eRaw = (document.getElementById(`ct-sch-end-${key}${sid}`) || {}).value;
      let e = timeToMins(eRaw);
      if (s === null || e === null) { shiftIdx++; continue; }
      if (e <= s) e += 24 * 60;

      const slots = _getBrkSlots2(key, shiftIdx);
      const totalBrk = slots.reduce((sum, b) => {
        const bs = timeToMins(b.s), be = timeToMins(b.e);
        if (bs === null || be === null) return sum;
        let bMin = be - bs;
        if (bMin <= 0) bMin += 24 * 60;
        return sum + bMin;
      }, 0);

      const shiftMins = Math.max(0, e - s - totalBrk);
      dayMins += shiftMins;

      const nightOverlap =
        Math.max(0, Math.min(e, NIGHT_END) - Math.max(s, NIGHT_START)) +
        Math.max(0, Math.min(e, NIGHT_END + 24 * 60) - Math.max(s, NIGHT_START + 24 * 60));
      const nightBrk = slots.reduce((sum, b) => {
        const bs = timeToMins(b.s), be = timeToMins(b.e);
        if (bs === null || be === null) return sum;
        let be2 = be;
        if (be2 <= bs) be2 += 24 * 60;
        return sum + Math.max(0, Math.min(be2, NIGHT_END) - Math.max(bs, NIGHT_START))
                   + Math.max(0, Math.min(be2, NIGHT_END + 24 * 60) - Math.max(bs, NIGHT_START + 24 * 60));
      }, 0);
      dayNightMins += Math.max(0, nightOverlap - nightBrk);

      shiftIdx++;
    }

    if (dayMins > 0) {
      workDays++;
      const dayStatMins = Math.min(dayMins, STATUTORY_DAILY);
      const dayOtMins   = Math.max(0, dayMins - STATUTORY_DAILY);

      if (isHol) {
        totalHolMins    += Math.min(dayMins, STATUTORY_DAILY);
        totalHolOtMins  += Math.max(0, dayMins - STATUTORY_DAILY);
      } else {
        totalStatMins += dayStatMins;
        totalOtMins   += dayOtMins;
      }
      totalNightMins += dayNightMins;
      if (isHol) totalSunNightMins += dayNightMins;   // 휴일야간(토·일)
      else      totalWdayNightMins += dayNightMins;

      dayResults.push({ key, isHol, dayMins,
        dayStatMins: isHol ? 0 : dayStatMins,
        dayOtMins:   isHol ? 0 : dayOtMins,
        dayNightMins,
        dayHolMins: isHol ? Math.min(dayMins, STATUTORY_DAILY) : 0,
        dayHolOtMins: isHol ? Math.max(0, dayMins - STATUTORY_DAILY) : 0,
        satFillMins: 0 });
    } else {
      dayResults.push({ key, isHol, dayMins:0, dayStatMins:0, dayOtMins:0, dayNightMins:0,
        dayHolMins:0, dayHolOtMins:0, satFillMins:0 });
    }
  });

  // ── Pass 1.5: 토요일 40h 미달 충당 (2026-08-14 규칙) ──
  // 주중 소정근로 합이 40h 미만이면 토요일 근무를 먼저 소정근로로 충당(가산 없음).
  // 40h 초과분만 휴일근로로 인정 (충당은 1일 8h 한도)
  const satDr = dayResults.find(dr => dr.key === 'sat');
  if (satDr && satDr.dayMins > 0 && totalStatMins < STATUTORY_WEEKLY) {
    const gap = STATUTORY_WEEKLY - totalStatMins;
    const fill = Math.min(satDr.dayMins, gap, STATUTORY_DAILY);
    if (fill > 0) {
      totalHolMins   -= satDr.dayHolMins;      // 기존 토요일 휴일 분류 제거
      totalHolOtMins -= satDr.dayHolOtMins;
      satDr.dayStatMins = fill;                 // 소정근로로 충당 (가산 없음)
      satDr.satFillMins = fill;
      const rem = satDr.dayMins - fill;         // 남은 부분만 휴일
      satDr.dayHolMins    = Math.min(rem, STATUTORY_DAILY);
      satDr.dayHolOtMins  = Math.max(0, rem - STATUTORY_DAILY);
      totalHolMins   += satDr.dayHolMins;
      totalHolOtMins += satDr.dayHolOtMins;
      totalStatMins  += fill;
    }
  }

  // ── 주 40h 상한: 초과분을 토→월 역순으로 dayStat→dayOt 재분배 ──
  if (totalStatMins > STATUTORY_WEEKLY) {
    let overflow = totalStatMins - STATUTORY_WEEKLY;
    totalOtMins += overflow;
    totalStatMins = STATUTORY_WEEKLY;
    for (let i = dayResults.length - 1; i >= 0 && overflow > 0; i--) {
      const dr = dayResults[i];
      if (dr.isHol || dr.dayStatMins <= 0) continue;
      const deduct = Math.min(dr.dayStatMins, overflow);
      dr.dayStatMins -= deduct;
      dr.dayOtMins   += deduct;
      overflow       -= deduct;
    }
  }

  // ── Pass 2: 셀 표시 업데이트 ──
  const fmtH2 = h => Number.isInteger(h) ? h : h.toFixed(1);
  dayResults.forEach(dr => {
    const hrsEl = document.getElementById(`ct-sch-hrs-${dr.key}`);
    if (!hrsEl) return;
    if (dr.dayMins === 0) { hrsEl.textContent = '-'; return; }

    const statH = dr.dayStatMins / 60;
    const otH   = dr.dayOtMins / 60;
    const nightH = dr.dayNightMins / 60;
    const lines = [];
    if (dr.isHol) {
      if (dr.dayStatMins > 0) {
        // 토요일 40h 충당분 → 일반 근로로 표시
        lines.push(fmtH2(dr.dayStatMins/60) + 'h <span style="color:#64748b;font-size:10px;">40h충당</span>');
      }
      if (dr.dayHolMins > 0) lines.push('<span style="color:#dc2626;font-size:10px;">휴일 ' + fmtH2(dr.dayHolMins/60) + 'h</span>');
      if (dr.dayHolOtMins > 0) lines.push('<span style="color:#b91c1c;font-size:10px;">휴일연장 +' + fmtH2(dr.dayHolOtMins/60) + 'h</span>');
    } else {
      lines.push(fmtH2(statH) + 'h');
      if (otH > 0) lines.push('<span style="color:#f59e0b;font-size:10px;">연장 +' + fmtH2(otH) + 'h</span>');
    }
    if (nightH > 0) {
      const nightLabel = dr.isHol ? '휴일야간' : '야간';
      lines.push('<span style="color:#7c3aed;font-size:10px;">' + nightLabel + ' +' + fmtH2(nightH) + 'h</span>');
    }
    hrsEl.innerHTML = lines.join('<br>');
  });

  // ── 주 소정근로시간 40h 초과분 → 연장으로 이관 (이미 Pass 1 후 처리됨) ──

  const weekStatH = totalStatMins / 60;
  const weekOtH   = totalOtMins / 60;
  const weekWdayNightH = totalWdayNightMins / 60;
  const weekSunNightH  = totalSunNightMins / 60;
  const weekHolH   = totalHolMins / 60;
  const weekHolOtH = totalHolOtMins / 60;

  // 주 소정근무일수: 최대 5일
  const statWorkDays = Math.min(workDays, 5);
  const totalWeekMins = totalStatMins + totalOtMins + totalNightMins + totalHolMins + totalHolOtMins;
  const avgDayH = totalWeekMins > 0 ? totalWeekMins / 5 / 60 : 0;

  const fmtH = h => Number.isInteger(h) ? h : h.toFixed(1);

  // ── 요약 업데이트 ──
  const el_d = document.getElementById('ct-wsh-days');
  const el_w = document.getElementById('ct-wsh-week-hours');
  const el_a = document.getElementById('ct-wsh-day-hours');
  if (el_d) el_d.textContent = statWorkDays;
  if (el_w) el_w.textContent = fmtH(weekStatH);
  if (el_a) el_a.textContent = fmtH(Math.min(avgDayH, 8));

  // ── 연장/야간/휴일/휴일연장 표시 ──
  const el_ot = document.getElementById('ct-wsh-ot-hours');
  const el_otW = document.getElementById('ct-wsh-ot-wrap');
  const el_ni = document.getElementById('ct-wsh-night-hours');
  const el_niW = document.getElementById('ct-wsh-night-wrap');
  const el_ho = document.getElementById('ct-wsh-hol-hours');
  const el_hoW = document.getElementById('ct-wsh-hol-wrap');
  const el_hoOt = document.getElementById('ct-wsh-hol-ot-hours');
  const el_hoOtW = document.getElementById('ct-wsh-hol-ot-wrap');
  const el_hoNi = document.getElementById('ct-wsh-hol-night-hours');
  const el_hoNiW = document.getElementById('ct-wsh-hol-night-wrap');

  if (el_ot) el_ot.textContent = fmtH(weekOtH);
  if (el_otW) el_otW.style.display = weekOtH > 0 ? '' : 'none';
  if (el_ni) el_ni.textContent = fmtH(weekWdayNightH); // 평일야간만 (휴일야간은 휴일로 합산)
  if (el_niW) el_niW.style.display = weekWdayNightH > 0 ? '' : 'none';
  if (el_ho) el_ho.textContent = fmtH(weekHolH + weekHolOtH); // 휴일근로시간 = 휴일+휴일연장 합산
  if (el_hoW) el_hoW.style.display = (weekHolH + weekHolOtH) > 0 ? '' : 'none';
  if (el_hoOt) el_hoOt.textContent = fmtH(weekHolOtH);
  if (el_hoOtW) el_hoOtW.style.display = weekHolOtH > 0 ? '' : 'none';
  if (el_hoNi) el_hoNi.textContent = fmtH(weekSunNightH);
  if (el_hoNiW) el_hoNiW.style.display = weekSunNightH > 0 ? '' : 'none';

  // ── hidden 필드 ──
  const hrsHid = document.getElementById('ct-hours');
  if (hrsHid) hrsHid.value = Math.min(avgDayH, 8).toFixed(2);
  const daysHid = document.getElementById('ct-days');
  if (daysHid) daysHid.value = workDays;

  // ── 고정 연장/야간/휴일/휴일연장 시간 + 통상시급에 곱할 값(n.m) + 계산식 (실제 배율 반영) ──
  const elOtH = document.getElementById('ct-fixed-ot-hours');
  const elNiH = document.getElementById('ct-fixed-night-hours');
  const elHoH = document.getElementById('ct-fixed-hol-hours');
  const elHoOtH = document.getElementById('ct-fixed-hol-ot-hours');
  const elOtMult = document.getElementById('ct-fixed-ot-mult');
  const elNiMult = document.getElementById('ct-fixed-night-mult');
  const elHoMult = document.getElementById('ct-fixed-hol-mult');
  const elOtFormula = document.getElementById('ct-fixed-ot-formula');
  const elNiFormula = document.getElementById('ct-fixed-night-formula');
  const elHolFormula = document.getElementById('ct-fixed-hol-formula');
  const coIdForMult = document.getElementById('ct-company')?.value || '';
  const mult = _getLegalMultiplier(coIdForMult);
  const fmtMult = v => Number.isInteger(v) ? v : v.toFixed(1);
  const _round1 = v => Math.round(v * 10) / 10;
  if (elOtH) {
    elOtH.value = weekOtH.toFixed(1); // 평일연장만 (휴일연장은 휴일근로로 합산)
    const mOt = weekOtH > 0 ? _round1(weekOtH * mult.overtime * WEEK_TO_MONTH) : 0; // 통상시급에 곱할 값 (배율 포함, 소수1자리)
    if (elOtMult) elOtMult.value = mOt.toFixed(1);
    if (elOtFormula) {
      elOtFormula.textContent = weekOtH > 0 ? '(' + fmtH(weekOtH) + 'h × ' + fmtMult(mult.overtime) + '배) × 4.345' : '';
    }
  }
  if (elNiH) {
    elNiH.value = weekWdayNightH.toFixed(1); // 평일야간만 (휴일야간은 휴일근로로 합산)
    const mNi = weekWdayNightH > 0 ? _round1(weekWdayNightH * mult.night * WEEK_TO_MONTH) : 0;
    if (elNiMult) elNiMult.value = mNi.toFixed(1);
    if (elNiFormula) {
      elNiFormula.textContent = weekWdayNightH > 0 ? '(' + fmtH(weekWdayNightH) + 'h × ' + fmtMult(mult.night) + '배) × 4.345' : '';
    }
  }
  if (elHoH) {
    // 휴일근로시간 = 토·일 40h 초과분(휴일연장·휴일야간 포함) 합산 표시
    const holTotalH = weekHolH + weekHolOtH;
    elHoH.value = holTotalH.toFixed(1);
    const mHo = holTotalH > 0
      ? _round1((weekHolH*mult.holiday_8h + weekHolOtH*mult.holiday_8h_over + weekSunNightH*mult.night) * WEEK_TO_MONTH)
      : 0;
    if (elHoMult) elHoMult.value = mHo.toFixed(1);
    if (elHolFormula) {
      let f = '(' + fmtH(weekHolH) + 'h × ' + fmtMult(mult.holiday_8h) + '배';
      if (weekHolOtH > 0) f += ' + 휴일연장 ' + fmtH(weekHolOtH) + 'h × ' + fmtMult(mult.holiday_8h_over) + '배';
      if (weekSunNightH > 0) f += ' + 휴일야간 ' + fmtH(weekSunNightH) + 'h × ' + fmtMult(mult.night) + '배';
      if (satDr && satDr.satFillMins > 0) f += ' · 토요일 ' + fmtH(satDr.satFillMins/60) + 'h 주중40h충당(×1.0)';
      f += ') × 4.345';
      elHolFormula.textContent = holTotalH > 0 ? f : '';
    }
  }
  if (elHoOtH) {
    elHoOtH.value = weekHolOtH.toFixed(1);
  }
  // 휴일야간 hidden (수당 합산용)
  { const _holNightHid = document.getElementById('ct-fixed-hol-night-hours'); if(_holNightHid) _holNightHid.value = weekSunNightH.toFixed(1); }

  // ── 가산수당 지급 기준 배지 + 힌트 (premium_mode 기반) ──
  const bizBadge = document.getElementById('ct-biz-size-badge');
  const bizHint = document.getElementById('ct-biz-size-hint');
  if (bizBadge || bizHint) {
    const pm = _getCompanyPremiumMode(coIdForMult);
    const always = pm === 'always';
    if (bizBadge) {
      bizBadge.textContent = always ? '가산 기준: 5인 미만이어도 가산 지급' : '가산 기준: 5인 미만 시 가산 미적용';
      bizBadge.className = 'ct-biz-badge ' + (always ? 'normal' : 'small');
    }
    if (bizHint) {
      bizHint.innerHTML = '<span class="ct-biz-hint">급여 지급일 이전 1개월간의 회사의 총 근로실적으로 법정 가산수당 적용여부가 자동 판별됩니다.</span>';
      bizHint.style.whiteSpace = 'normal';
    }
  }

  // ── 급여 계산: calcContractSalary() 내에서 _calcFixed*FromHours() 일괄 호출 ──
  calcContractSalary();
}

// ─── 갱신 페어 유틸리티 (단일 진리 원천) ───

/**
 * 계약의 갱신 페어 상대방을 찾는다. 단일 탐색 함수.
 * @param {object} c - 계약 객체
 * @returns {object|null} 페어 계약 또는 null
 */
function findPairContract(c){
  if(!c) return null;
  
  // Tier 1: renewed_from_id 직접 참조
  if(c.renewed_from_id){
    const pair = allContracts.find(x => x.id === c.renewed_from_id);
    if(pair) return pair;
  }
  
  // Tier 2: renewed_to_id 직접 참조
  if(c.renewed_to_id){
    const pair = allContracts.find(x => x.id === c.renewed_to_id);
    if(pair) return pair;
  }
  
  // Tier 3: 동일 company_id + employee_id + 상태 기반 (company_id 가드 포함)
  // ※ 수정/재발행으로 파기된 계약(is_voided_by_amend)은 페어 관리 대상이 아님 (보존의무 없음, 삭제 가능)
  const pair = allContracts.find(x =>
    x.company_id === c.company_id &&
    x.employee_id === c.employee_id &&
    x.id !== c.id &&
    (x.status === CONTRACT_STATUS.RENEWAL_PENDING ||
     x.status === CONTRACT_STATUS.RENEWED ||
     x.status === CONTRACT_STATUS.TERMINATE_PENDING)
  );
  if(pair) return pair;
  
  // Tier 4: 날짜 기반 (동일 company_id + employee_id)
  if(c.terminate_date){
    const _nextDay = new Date(c.terminate_date);
    _nextDay.setDate(_nextDay.getDate() + 1);
    const _nextStr = fmtLocalDate(_nextDay);
    const datePair = allContracts.find(x =>
      x.company_id === c.company_id &&
      x.employee_id === c.employee_id &&
      x.id !== c.id &&
      x.contract_start === _nextStr
    );
    if(datePair) return datePair;
  }
  if(c.contract_start){
    const _prevDay = new Date(c.contract_start);
    _prevDay.setDate(_prevDay.getDate() - 1);
    const _prevStr = fmtLocalDate(_prevDay);
    const datePair = allContracts.find(x =>
      x.company_id === c.company_id &&
      x.employee_id === c.employee_id &&
      x.id !== c.id &&
      (x.terminate_date === _prevStr || x.contract_end === _prevStr)
    );
    if(datePair) return datePair;
  }
  
  return null;
}

/**
 * 페어 발견 시 in-memory 필드 보정 + DB 저장 시도
 */
function _persistPairLink(contract, pairContract, direction){
  if(!contract || !pairContract) return;
  let needsPatch = false;
  const patchBody = {};
  
  if(direction === 'renewed_from'){
    if(!contract.renewed_from_id || contract.renewed_from_id !== pairContract.id){
      contract.renewed_from_id = pairContract.id;
      patchBody.renewed_from_id = pairContract.id;
      needsPatch = true;
    }
  } else if(direction === 'renewed_to'){
    if(!contract.renewed_to_id || contract.renewed_to_id !== pairContract.id){
      contract.renewed_to_id = pairContract.id;
      patchBody.renewed_to_id = pairContract.id;
      needsPatch = true;
    }
  }
  
  if(needsPatch){
    fetch(`../tables/contracts/${contract.id}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(patchBody)
    }).catch(e => console.warn('[페어 링크 저장 실패]', e));
  }
}

/**
 * 페어 날짜 동기화: 갱신 시작일 변경 → 원본 해지일 조정
 * contract_end는 보존하고 terminate_date만 변경
 */
async function syncPairDates(oldContract, newStartDate){
  if(!oldContract || !newStartDate) return;
  
  const newPairEnd = (() => {
    const d = new Date(newStartDate);
    d.setDate(d.getDate() - 1);
    return fmtLocalDate(d);
  })();
  
  const currentEnd = oldContract.terminate_date || oldContract.contract_end || '';
  if(newPairEnd === currentEnd) return; // 변경 없음
  
  try {
    await fetch(`../tables/contracts/${oldContract.id}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ terminate_date: newPairEnd })
    });
    oldContract.terminate_date = newPairEnd;
  } catch(e){
    console.warn('[페어 날짜 동기화 실패]', e);
  }
}

/**
 * 페어 관계 해제: 양쪽 renewed_from_id/renewed_to_id 정리
 */
async function breakPair(contract){
  if(!contract) return;
  
  const pair = findPairContract(contract);
  const updates = [];
  
  if(pair){
    // 상대방 정리
    const pairPatch = {};
    if(pair.renewed_from_id === contract.id) { pairPatch.renewed_from_id = null; pair.renewed_from_id = null; }
    if(pair.renewed_to_id === contract.id)   { pairPatch.renewed_to_id = null;   pair.renewed_to_id = null; }
    if(Object.keys(pairPatch).length){
      updates.push(fetch(`../tables/contracts/${pair.id}`, {
        method: 'PATCH', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(pairPatch)
      }));
    }
  }
  
  // 자신 정리
  if(contract.renewed_from_id || contract.renewed_to_id){
    const selfPatch = {};
    if(contract.renewed_from_id) { selfPatch.renewed_from_id = null; contract.renewed_from_id = null; }
    if(contract.renewed_to_id)   { selfPatch.renewed_to_id = null;   contract.renewed_to_id = null; }
    updates.push(fetch(`../tables/contracts/${contract.id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(selfPatch)
    }));
  }
  
  await Promise.allSettled(updates);
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
    // 시프트 간 중첩 방지 제약 갱신
    if(typeof _refreshShiftConstraints === 'function') _refreshShiftConstraints(key);
  });
  // 일괄설정 바 시간을 첫 번째 활성 요일의 스케줄로 초기화
  _initBulkFromFirstActive();
  calcWorkHours();
  // 일괄설정 체크박스를 실제 스케줄 상태와 동기화
  if(typeof _syncBulkCheckboxes === 'function') _syncBulkCheckboxes();
}

// 레거시 단일 시간 → 요일별 스케줄 변환
function setScheduleFromLegacy(c){
  const start = c.day_start||'09:00';
  const end   = c.day_end||'18:00';
  const brkMins = c.break_mins||60;
  const sMins = timeToMins(start)||540;
  let eMins = timeToMins(end)||1080;
  if(eMins <= sMins) eMins += 24*60; // 익일 종료
  const halfWork = Math.round((eMins - sMins - brkMins) / 2);
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
    // 시프트 간 중첩 방지 제약 갱신
    if(typeof _refreshShiftConstraints === 'function') _refreshShiftConstraints(key);
  });
  // 일괄설정 바 시간을 첫 번째 활성 요일의 스케줄로 초기화
  _initBulkFromFirstActive();
  calcWorkHours();
  // 일괄설정 체크박스를 실제 스케줄 상태와 동기화
  if(typeof _syncBulkCheckboxes === 'function') _syncBulkCheckboxes();
}

/**
 * 레거시(스케줄 미보유) 계약의 고정 연장/야간/휴일수당 DB 복원 (2026-09-01)
 * — 근무시간표가 없으면 calcWorkHours가 0으로 계산하므로, 저장 시 DB 값이 0으로
 *   덮어써지지 않도록 스케줄 생성·계산이 끝난 뒤 호출한다.
 */
function _restoreLegacyFixedPays(c){
  if(!c || c.schedule_json) return;
  const _ot = parseFloat(c.fixed_ot_pay)||0;
  const _nt = parseFloat(c.fixed_night_pay)||0;
  const _ht = parseFloat(c.fixed_hol_pay)||0;
  if(!(_ot || _nt || _ht)) return;
  setAmountVal('ct-fixed-ot-pay',    _ot);
  setAmountVal('ct-fixed-night-pay', _nt);
  setAmountVal('ct-fixed-hol-pay',   _ht);
  // 시간 복원: DB는 월간(주간×4.345) 저장 → 주간으로 역산
  const _wk = v => { const m = parseFloat(v)||0; return m > 0 ? Math.round(m / WEEK_TO_MONTH * 10) / 10 : 0; };
  const _foh = document.getElementById('ct-fixed-ot-hours');    if(_foh) _foh.value = _wk(c.fixed_ot_hours);
  const _fnh = document.getElementById('ct-fixed-night-hours'); if(_fnh) _fnh.value = _wk(c.fixed_night_hours);
  const _fhh = document.getElementById('ct-fixed-hol-hours');   if(_fhh) _fhh.value = _wk(c.fixed_hol_hours);
}

// initBreakSelects → initScheduleTable로 대체 (하위 호환 stub)
function initBreakSelects(){ initScheduleTable(); }
function getBreakMins(hId,mId){ return 0; }
function setBreakMins(hId,mId,totalMins){}
function toggleCtEndDate(preserveValue=false){
  // 선택된 근로자 우선 (신규 모드), 없으면 ct-type (수정 모드)
  const rawCat = _ctNewCat()
              || document.getElementById('ct-type')?.value 
              || CONTRACT_TYPE.REGULAR;
  const type = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const endInput = document.getElementById('ct-end');
  const endRow   = document.getElementById('ct-row-end');
  const endReqSpan = document.getElementById('ct-end-required');
  const hireRow = document.getElementById('ct-contract-hire-row');
  
  const isFixed = type ===CONTRACT_TYPE.FIXED || type ===CONTRACT_TYPE.DAILY || type ===CONTRACT_TYPE.FIXED_PROBATION;
  const isRegularOrProbation = type ===CONTRACT_TYPE.REGULAR || type ===CONTRACT_TYPE.REGULAR_PROBATION;
  
  // 레이아웃 전환: 입사일 span 조정
  // 계약직 유형: 입사일이 전체 행 차지 (span 2), 시작일+종료일이 다음 행에 2열로 배치
  // 정규직 유형: 입사일+시작일이 한 행에 2열 배치, 종료일 숨김
  if (hireRow) {
    hireRow.style.gridColumn = isFixed ? '1 / -1' : '';
  }
  if (endRow) {
    endRow.style.display = isRegularOrProbation ? 'none' : '';
  }
  if (endReqSpan) {
    endReqSpan.style.display = isFixed ? '' : 'none';
  }
  
  // 조회 모드(ct-readonly)이거나 preserveValue=true이면 값을 지우지 않음
  const modalEl = document.querySelector('#contract-modal .modal');
  const isReadonly = modalEl && modalEl.classList.contains('ct-readonly');
  if (endInput) {
    endInput.disabled = !isFixed;
    endInput.classList.toggle('ct-input-locked', !isFixed);
    if(!isFixed && !preserveValue && !isReadonly) endInput.value = '';
  }
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
  // 통상임금 무조건 제외 항목 (pay_type=fixed라도 통상임금 미포함)
  const ALWAYS_EXCLUDED = ['car','meal','research','communication','fitness','self_dev','book','overseas','childcare',
    'fixed_ot','fixed_night','fixed_hol'];
  // 힌트 표시 항목 (구 type-hint UI는 제거됨 — 표시 로직 생략)
  const hintOnlyFields = ['site','position','skill','license','hazard','remote_area','regular_bonus','car','meal','research','communication','fitness','self_dev','book','overseas'];
  if(hintOnlyFields.includes(field)){
    const isAlwaysExcluded = ALWAYS_EXCLUDED.includes(field);

    // ── 통상임금 불포함(daily/receipt) 항목은 display:none 처리 ──
    // allowance_config 기준 활성화된 항목에만 적용
    // (비활성 항목은 applyCTAllowanceConfig에서 이미 display:none 처리)
    const rowId = _CT_PAY_TYPE_ROWS[field];
    if(rowId && _ctAllowCfgVisible[field] !== false){
      const rowEl = document.getElementById(rowId);
      if(rowEl){
        const isFixed = (type === 'fixed');
        if(!isFixed){
          // 입력값 초기화 후 숨김 (DOM 제거 대신 display:none으로 복구 가능하게)
          const inputEl = document.getElementById(`ct-${field.replace(/_/g,'-')}`);
          if(inputEl) inputEl.value = '';
          rowEl.style.display = 'none';
        } else {
          // fixed로 변경 시 표시 (applyCTAllowanceConfig에서 hide되었을 수 있음)
          rowEl.style.display = '';
        }
      }
    }
  }
  calcContractSalary();
}
// 항상 통상임금 포함 (pay_type 선택 불가)
const _CT_FIXED_ALLOWANCES = new Set(['site','position','skill','license','hazard','remote_area','regular_bonus']);

// 일용직에서 일(일급) 기준으로 표시·합산되는 수당 (통상임금 포함 + 제외, 월 단위 항목 제외)
const _CT_DAILY_ALLOW_KEYS = new Set(['site','position','skill','license','hazard','remote_area','car','meal','research','communication','fitness','self_dev','book','overseas']);

function _getCTPayTypeVal(field){
  // 항상 포함 항목은 무조건 fixed, 그 외는 사용자 선택 따름 (기본값 ''=미포함)
  if (_CT_FIXED_ALLOWANCES.has(field)) return 'fixed';
  return _ctPayTypes[field] || '';
}
// 해당 수당이 월 약정임금 합산 대상인지 반환 (fixed = 매월 정기지급 = 포함, 그 외 제외)
function _isFixedAllow(field){ return _getCTPayTypeVal(field) === 'fixed'; }

/**
 * 월 약정임금 정식 합산 (fix-monthly-agreed.js 공식과 동일 — 모든 저장 경로에서 공통 사용)
 * = 기본급(시급×209, 주휴 포함) + [항상 포함: site/position/skill/license/hazard/remote_area/regular_bonus]
 *   + [pay_type='fixed'만: car/meal/research/communication/fitness/self_dev/book/overseas]
 *   + 커스텀 통상임금 + 고정OT/야간/휴일
 * ※ 주휴수당은 기본급에 이미 포함 — 별도 합산 금지
 */
function _calcAllowancesTotal(){
  const alwaysGroup =
      (getAmountVal('ct-site')||0)
    + (getAmountVal('ct-position')||0)
    + (getAmountVal('ct-skill')||0)
    + (getAmountVal('ct-license')||0)
    + (getAmountVal('ct-hazard')||0)
    + (getAmountVal('ct-remote-area')||0)
    + (getAmountVal('ct-regular-bonus')||0);
  const selectableGroup =
      (_isFixedAllow('car')           ? (getAmountVal('ct-car')||0)           : 0)
    + (_isFixedAllow('meal')          ? (getAmountVal('ct-meal')||0)          : 0)
    + (_isFixedAllow('research')      ? (getAmountVal('ct-research')||0)      : 0)
    + (_isFixedAllow('communication') ? (getAmountVal('ct-communication')||0) : 0)
    + (_isFixedAllow('fitness')       ? (getAmountVal('ct-fitness')||0)       : 0)
    + (_isFixedAllow('self_dev')      ? (getAmountVal('ct-self-dev')||0)      : 0)
    + (_isFixedAllow('book')          ? (getAmountVal('ct-book')||0)          : 0)
    + (_isFixedAllow('overseas')      ? (getAmountVal('ct-overseas')||0)      : 0);
  const customSum = typeof _getCustomOrdinarySum === 'function' ? _getCustomOrdinarySum() : 0;
  const fixedExtra = (getAmountVal('ct-fixed-ot-pay')||0)
    + (getAmountVal('ct-fixed-night-pay')||0)
    + (getAmountVal('ct-fixed-hol-pay')||0);
  return alwaysGroup + selectableGroup + customSum + fixedExtra;
}

function _calcMonthlyAgreedTotal(){
  return getAmountVal('ct-base') + _calcAllowancesTotal();
}
function _resetCTPayTypes(){
  ['site','position','skill','license','hazard','remote_area','regular_bonus']
    .forEach(f=>{ _ctPayTypes[f]='fixed'; setCTPayType(f,'fixed'); });
  // 사용자 선택 항목은 pay_type만 초기화 (DOM 제거하지 않음 — applyCTAllowanceConfig에서 재설정)
  ['car','meal','research','communication','fitness','self_dev','book','overseas','childcare']
    .forEach(f=>{ _ctPayTypes[f]=''; });
}

// ── 근로계약 모달 — 고객사별 옵셔널 수당 show/hide ──
// ※ 순서는 고객사 설정(allowance_config) 화면 순서와 동일하게 유지
// 고객사 설정 순서: site → position → skill → license → hazard → remote_area → regular_bonus → childcare → car → meal → research → communication → fitness → self_dev → book → overseas
// 모든 수당 항목이 allowance_config 기준 조건부 표시 (car/meal 포함)
const _CT_OPT_ROWS = [
  { key:'site',          rowId:'ct-row-site'          }, // 현장수당
  { key:'position',      rowId:'ct-row-position'      }, // 직책수당
  { key:'skill',         rowId:'ct-row-skill'         }, // 기술수당
  { key:'license',       rowId:'ct-row-license'       }, // 면허수당
  { key:'hazard',        rowId:'ct-row-hazard'        }, // 위험수당
  { key:'remote_area',   rowId:'ct-row-remote-area'   }, // 벽지수당
  { key:'regular_bonus', rowId:'ct-row-regular-bonus' }, // 정기 상여금: 통상임금 포함 고정
  { key:'childcare',     rowId:'ct-row-childcare'     }, // 보육수당
  { key:'car',           rowId:'ct-row-car'           }, // 차량지원비
  { key:'meal',          rowId:'ct-row-meal'          }, // 식대
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
  // 일용직: 통상임금 및 고정수당 항목 전체 숨김 (cfg 무시)
  const rawCat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-type')?.value || '')
    : _ctNewCat();
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isDaily = cat === CONTRACT_TYPE.DAILY;
  
  _CT_OPT_ROWS.forEach(({ key, rowId }) => {
    const rowEl = document.getElementById(rowId);
    // pay_type이 'fixed'인 항목만 근로계약서에 표시 (daily/receipt 등 비고정 항목은 급여 입력 시 직접 입력)
    const payType = (cfg && cfg[`${key}_pay_type`]) || 'fixed';
    // 일용직: 통상임금 포함·제외 고정수당을 모두 일(일급) 기준으로 표시 (월 단위 항목 제외)
    const visible = isDaily
      ? _CT_DAILY_ALLOW_KEYS.has(key)
      : !!(cfg && cfg[key] && payType === 'fixed');
    if(rowEl) rowEl.style.display = visible ? '' : 'none';
    if(!visible && clearValues){
      if(key === 'childcare'){
        // 보육수당: 금액 + 부양가족 수 모두 초기화
        setAmountVal('ct-childcare', 0);
        const depEl = document.getElementById('ct-childcare-dependents');
        if(depEl) depEl.value = 0;
      } else {
        const inputId = rowId.replace('ct-row-', 'ct-');
        setAmountVal(inputId, 0);
      }
    }
  });
  // ── _ctAllowCfgVisible 상태 갱신 (pay_type 제거 로직용) ──
  ['site','position','skill','license','hazard','remote_area','regular_bonus','car','meal','childcare','research','communication','fitness','self_dev','book','overseas'].forEach(f => {
    _ctAllowCfgVisible[f] = !!(cfg && cfg[f]);
  });
  // 모든 수당에 pay_type 적용 (통상임금 여부는 지급방식으로 결정)
  const _PT_FIELDS = ['site','position','skill','license','hazard','remote_area','regular_bonus','car','meal','childcare','research','communication','fitness','self_dev','book','overseas'];
  _PT_FIELDS.forEach(f => {
    // 비활성 수당은 pay_type도 ''로 초기화 — 임시저장에 'fixed'가 남아 이어쓰기 시
    // 비활성 항목이 다시 표시되던 버그 방지
    const enabled = !!(cfg && cfg[f]);
    const pt = enabled ? ((cfg && cfg[`${f}_pay_type`]) || 'fixed') : '';
    setCTPayType(f, pt);
  });
  // ── 신규 작성 시 car/meal 초기화 (기본값 없음, 수동 입력) ──
  if(clearValues && !isDaily){
    if(cfg){
      if(cfg.car)  setAmountVal('ct-car',  0);
      if(cfg.meal) setAmountVal('ct-meal', 0);
    }
  }
  // (구 보육수당 pay_type 힌트 UI는 제거됨)
  // ── 사용자 정의 통상임금 항목 렌더링 ──
  _renderCustomOrdinaryRows(cfg);
  // ── 사용자 정의 고정수당 항목 렌더링 ──
  _renderCustomFixedRows(cfg);
  
  // 일용직: 고정 연장/야간/휴일근로수당 + 사용자 정의 항목 숨김
  if(isDaily){
    ['ct-row-fixed-ot','ct-row-fixed-night','ct-row-fixed-hol'].forEach(id => {
      const el = document.getElementById(id); if(el) el.style.display = 'none';
    });
  }
}

/**
 * 계약 시작일 기준으로 고객사 이력에서 allowance_config를 조회하여
 * 폼의 수당 행 가시성과 pay_type을 재적용한다.
 * @param {string} companyId - 고객사 ID
 * @param {string} dateStr - 계약 시작일 (YYYY-MM-DD)
 * @param {boolean} clearHidden - true: 숨겨진 행의 입력값도 0으로 초기화 (기본값 true)
 */
function _reapplyAllowanceConfigForDate(companyId, dateStr, clearHidden = true) {
  if (!companyId || !dateStr) return;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return;
  const snapCo = typeof getCompanySnapshotAt === 'function'
    ? getCompanySnapshotAt(companyId, ts)
    : (allCompanies||[]).find(x => x.id === companyId);
  let cfg = snapCo?.allowance_config ?? null;
  if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch(e) { cfg = {}; } }
  // cfg가 null이면 빈 객체로 정규화 (빈 config도 적용하여 모든 수당 행 숨김)
  if (!cfg) cfg = {};

  // 1. 사용자 정의 수당 행 값 보존 (applyCTAllowanceConfig가 DOM을 재생성하므로)
  const _savedCustomOrd = typeof _getCustomOrdinaryValues === 'function' ? _getCustomOrdinaryValues() : [];
  const _savedCustomFix = typeof _getCustomFixedValues === 'function' ? _getCustomFixedValues() : [];

  // 2. 수당 행 가시성 + pay_type 재적용 (기존 입력값 유지)
  applyCTAllowanceConfig(cfg, false);

  // 3. 사용자 정의 수당 행 값 복원
  if (typeof _setCustomOrdinaryValues === 'function') _setCustomOrdinaryValues(_savedCustomOrd);
  if (typeof _setCustomFixedValues === 'function') _setCustomFixedValues(_savedCustomFix);

  // 4. 숨겨진 행의 입력값 0으로 초기화 (새 시작일에 제공 안 하는 수당)
  if (clearHidden && typeof _CT_OPT_ROWS !== 'undefined') {
    _CT_OPT_ROWS.forEach(({ key, rowId }) => {
      const rowEl = document.getElementById(rowId);
      if (rowEl && rowEl.style.display === 'none') {
        if (key === 'childcare') {
          setAmountVal('ct-childcare', 0);
          const depEl = document.getElementById('ct-childcare-dependents');
          if (depEl) depEl.value = 0;
        } else {
          const inputId = rowId.replace('ct-row-', 'ct-');
          setAmountVal(inputId, 0);
        }
      }
    });
  }

  calcContractSalary();
}

// ── 사용자 정의 통상임금 항목 (계약서 모달) ──
const _CUSTOM_ORD_CONTAINER_ID = 'ct-custom-ord-container';
let _customOrdRowCount = 0;

function _renderCustomOrdinaryRows(cfg){
  let container = document.getElementById(_CUSTOM_ORD_CONTAINER_ID);
  if(!container){
    // 컨테이너가 없으면 ct-row-regular-bonus 다음에 생성
    const refRow = document.getElementById('ct-row-regular-bonus');
    if(!refRow) return;
    container = document.createElement('div');
    container.id = _CUSTOM_ORD_CONTAINER_ID;
    refRow.parentNode.insertBefore(container, refRow.nextSibling);
  }
  // 기존 커스텀 행 제거
  container.querySelectorAll('.ct-custom-ord-row').forEach(r => r.remove());
  _customOrdRowCount = 0;

  const items = (cfg && Array.isArray(cfg._custom_ordinary)) ? cfg._custom_ordinary : [];
  if(!items.length){ container.style.display = 'none'; return; }
  container.style.display = '';

  items.forEach(item => {
    if(!item || !item.name) return;
    const idx = _customOrdRowCount++;
    const div = document.createElement('div');
    div.className = 'form-group ct-custom-ord-row';
    div.id = `ct-row-custom-ord-${idx}`;
    div.innerHTML = `
      <label>${_hEsc(item.name)}<span class="daily-suffix" style="display:none;font-size:11px;color:#6b7280;margin-left:3px;">(일급)</span></label>
      <div class="amount-wrap"><input type="text" inputmode="numeric" id="ct-custom-ord-${idx}" data-amount placeholder="0" oninput="onAmountInput(this,calcContractSalary)" /></div>
    `;
    container.appendChild(div);
  });
}

/** 계약서 모달 → 커스텀 통상임금 값 수집 [{name, amount}] */
function _getCustomOrdinaryValues(){
  const items = [];
  for(let i = 0; i < _customOrdRowCount; i++){
    const nameEl = document.querySelector(`#ct-row-custom-ord-${i} label`);
    const amtEl  = document.getElementById(`ct-custom-ord-${i}`);
    const name = nameEl ? nameEl.textContent.replace(/\(.*\)/,'').trim() : '';
    const amount = getAmountVal(`ct-custom-ord-${i}`) || 0;
    if(name) items.push({ name, amount });
  }
  return items;
}

/** DB 값 → 계약서 모달 커스텀 통상임금 필드 복원 */
function _setCustomOrdinaryValues(values){
  if(!Array.isArray(values)) return;
  values.forEach((v, i) => {
    if(v && v.amount) setAmountVal(`ct-custom-ord-${i}`, v.amount);
  });
}

// ── 사용자 정의 고정수당 항목 (계약서) ──
const _CUSTOM_FIXED_CONTAINER_ID = 'ct-custom-fixed-container';
let _customFixedRowCount = 0;

function _renderCustomFixedRows(cfg){
  let container = document.getElementById(_CUSTOM_FIXED_CONTAINER_ID);
  if(!container){
    const refRow = document.getElementById('ct-row-overseas');
    if(!refRow) return;
    container = document.createElement('div');
    container.id = _CUSTOM_FIXED_CONTAINER_ID;
    refRow.parentNode.insertBefore(container, refRow.nextSibling);
  }
  container.querySelectorAll('.ct-custom-fixed-row').forEach(r => r.remove());
  _customFixedRowCount = 0;

  const items = (cfg && Array.isArray(cfg._custom_fixed)) ? cfg._custom_fixed : [];
  if(!items.length){ container.style.display = 'none'; return; }
  container.style.display = '';

  items.forEach(item => {
    if(!item || !item.name) return;
    const idx = _customFixedRowCount++;
    const payTypeLabel = item.pay_type === 'daily' ? '(출근일수에 따름)' : item.pay_type === 'receipt' ? '(영수증 청구)' : '';
    const div = document.createElement('div');
    div.className = 'form-group ct-custom-fixed-row';
    div.id = `ct-row-custom-fixed-${idx}`;
    div.innerHTML = `
      <label>${_hEsc(item.name)}<span class="lbl-desc">${payTypeLabel}</span></label>
      <div class="amount-wrap"><input type="text" inputmode="numeric" id="ct-custom-fixed-${idx}" data-amount placeholder="0" oninput="onAmountInput(this,calcContractSalary)" /></div>
    `;
    container.appendChild(div);
  });
}

function _getCustomFixedValues(){
  const items = [];
  for(let i = 0; i < _customFixedRowCount; i++){
    const nameEl = document.querySelector(`#ct-row-custom-fixed-${i} label`);
    const name = nameEl ? nameEl.textContent.replace(/\(.*\)/,'').trim() : '';
    const amount = getAmountVal(`ct-custom-fixed-${i}`) || 0;
    if(name) items.push({ name, amount });
  }
  return items;
}

function _setCustomFixedValues(values){
  if(!Array.isArray(values)) return;
  values.forEach((v, i) => {
    if(v && v.amount) setAmountVal(`ct-custom-fixed-${i}`, v.amount);
  });
}

function _hEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/** 커스텀 통상임금 항목 합계 */
function _getCustomOrdinarySum(){
  let sum = 0;
  for(let i = 0; i < _customOrdRowCount; i++){
    sum += getAmountVal(`ct-custom-ord-${i}`) || 0;
  }
  return sum;
}

/**
 * 계약 시작일(ct-start) 변경 시 핸들러
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
  // 신규/수정 공통: ct-start 참조
  // 임시저장(이어쓰기)은 아직 작성 중인 계약이므로 신규 모드처럼 현재 고객사 설정 기준
  const _draftEdit = !!editId.contract && !!((allContracts||[]).find(x=>x.id===editId.contract)||{}).is_draft;
  const isNewMode = (!editId.contract || _draftEdit) && !_recontractEmpId;
  // 계약 시작일: 신규/수정 공통으로 ct-start 참조 (구 ct-em-start는 UI 재구성으로 제거됨)
  const startVal  = document.getElementById('ct-start')?.value || '';
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
  // 숨겨진 수당 행 값 0으로 초기화 (시작일 변경으로 제공 중단된 항목)
  if (typeof _CT_OPT_ROWS !== 'undefined') {
    _CT_OPT_ROWS.forEach(({ key, rowId }) => {
      const rowEl = document.getElementById(rowId);
      if (rowEl && rowEl.style.display === 'none') {
        if (key === 'childcare') {
          setAmountVal('ct-childcare', 0);
          const depEl = document.getElementById('ct-childcare-dependents');
          if (depEl) depEl.value = 0;
        } else {
          const inputId = rowId.replace('ct-row-', 'ct-');
          setAmountVal(inputId, 0);
        }
      }
    });
  }
  calcContractSalary();
  // 수습 계약이면 계약 종료일 재계산 + 수습기간 활성화
  if(typeof _updateProbationPeriodState === 'function') _updateProbationPeriodState();
  if(typeof _autoCalcProbationEndDate === 'function') _autoCalcProbationEndDate();

  // ── 계약 연속성: 이전 계약 만료/해지일 기준 입사일·사원번호 상속 + 역전 차단 ──
  // (재계약·신규계약 모드에서만 판정 — 수정/조회 모드에서는 실행하지 않음)
  if((isNewMode || _recontractSourceId) && typeof _ctGetPrevContractForContinuity === 'function'){
    const prev    = _ctGetPrevContractForContinuity();
    const hireEl  = document.getElementById('ct-edit-em-hire');
    const startHint = document.getElementById('ct-start-hint');
    const hireHint  = document.getElementById('ct-hire-inherit-hint');
    // 재계약: ct-edit-em-empno / 신규: ct-em-empno
    const empNoEl = document.getElementById(isNewMode ? 'ct-em-empno' : 'ct-edit-em-empno');
    const empNoHint = document.getElementById('ct-edit-empno-lock-hint');

    const _unlockEmpNo = () => {
      if(empNoEl){
        empNoEl.readOnly = false;
        empNoEl.classList.remove('ct-input-locked-dark');
        empNoEl.style.background = '';
      }
      if(empNoHint){ empNoHint.style.display = 'none'; empNoHint.textContent = ''; }
    };
    const _lockEmpNo = (empNo) => {
      if(empNoEl && empNo){
        empNoEl.value = empNo;
        empNoEl.readOnly = true;
        empNoEl.classList.add('ct-input-locked-dark');
        empNoEl.style.background = '#f1f5f9';
      }
      if(empNoHint){
        empNoHint.textContent = `🔗 계약 연속성 — 이전 계약 사원번호(${empNo || ''}) 승계`;
        empNoHint.className = 'va-hint va-ok';
        empNoHint.style.display = 'block';
      }
    };

    if(prev && prev.endDate){
      if(startVal <= prev.endDate){
        // ── 역전 차단: 시작일은 이전 계약 만료/해지일보다 이후여야 함 ──
        if(startHint){
          startHint.textContent = `⚠ 계약 시작일은 이전 계약의 만료/해지일(${prev.endDate.replace(/-/g, '.')})보다 이후여야 합니다.`;
          startHint.style.color = '#dc2626';
        }
        if(hireHint){ hireHint.textContent = ''; hireHint.style.display = 'none'; }
        _unlockEmpNo();
      } else {
        if(startHint){ startHint.textContent = '이 계약의 효력 발생일'; startHint.style.color = ''; }
        const nextBiz = (typeof _nextBusinessDay === 'function') ? _nextBusinessDay(prev.endDate) : '';
        if(nextBiz && startVal <= nextBiz && prev.hireDate){
          // ── 연속: 입사일 강제 상속 (이전 계약 입사일) ──
          if(hireEl){
            hireEl.value   = prev.hireDate;
            hireEl.readOnly = true;
            hireEl.classList.add('ct-input-locked');
          }
          if(hireHint){
            hireHint.textContent = `🔗 계약 연속성 — 이전 계약 입사일(${(prev.hireDate || '').replace(/-/g, '.')}) 상속`;
            hireHint.style.display = '';
          }
          // ── 연속: 사원번호 강제 상속 (이전 계약 사원번호) ──
          _lockEmpNo(prev.empNo);
        } else {
          // ── 갭(재입사) 또는 이전 입사일 부재: 입사일 새로 입력 허용 ──
          if(hireEl){ hireEl.readOnly = false; hireEl.classList.remove('ct-input-locked'); }
          if(hireHint){ hireHint.textContent = ''; hireHint.style.display = 'none'; }
          _unlockEmpNo();
        }
      }
    } else {
      // 이전 계약 없음: 잠금 해제·안내 초기화
      if(hireEl){ hireEl.readOnly = false; hireEl.classList.remove('ct-input-locked'); }
      if(hireHint){ hireHint.textContent = ''; hireHint.style.display = 'none'; }
      if(startHint){ startHint.textContent = '이 계약의 효력 발생일'; startHint.style.color = ''; }
      _unlockEmpNo();
    }
  }
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
  // 계약 시작일: 신규/수정 공통 ct-start 참조
  const startVal = document.getElementById('ct-start')?.value || '';

  if(!coId){
    // 고객사 미선택: 모든 수당 0으로 초기화 (기본값 없음)
    applyCTAllowanceConfig(null, true);
    return;
  }

  let cfg = null;
  // 임시저장(이어쓰기)은 현재 고객사 설정 기준 (과거 스냅샷 미사용)
  const _draftEditCo = !!editId.contract && !!((allContracts||[]).find(x=>x.id===editId.contract)||{}).is_draft;
  const _isNewModeCo = !editId.contract || _draftEditCo;
  if(!_isNewModeCo && startVal){
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

/** 일용직 임금 지급 방법 값 (daily/weekly/monthly/'' ) */
function _ctPayMethodVal(){
  const r = document.querySelector('input[name="ct-pay-method"]:checked');
  return r ? r.value : '';
}

/** 일용직 지급 방법 라디오 복원 */
function _ctPayMethodSetVal(method){
  const r = document.querySelector(`input[name="ct-pay-method"][value="${method}"]`);
  if(r) r.checked = true;
}

/** 일용직 지급 방법 변경 시 UI 갱신 */
function _ctPayMethodChange(){
  const isDaily = (function(){
    const rawCat = (editId.contract || _recontractEmpId)
      ? (document.getElementById('ct-type')?.value || '')
      : _ctNewCat();
    const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
    return cat === CONTRACT_TYPE.DAILY;
  })();
  const method = isDaily ? (_ctPayMethodVal() || 'daily') : 'monthly';

  const panelDaily  = document.getElementById('ct-pay-method-daily');
  const panelWeekly = document.getElementById('ct-pay-method-weekly');
  const panelMonth  = document.getElementById('ct-pay-method-monthly');
  if(panelDaily)  panelDaily.style.display  = (method==='daily')   ? '' : 'none';
  if(panelWeekly) panelWeekly.style.display = (method==='weekly')  ? '' : 'none';
  if(panelMonth)  panelMonth.style.display  = (method==='monthly') ? '' : 'none';

  // 월 합산 산정기간/급여일 행: 비일용직 또는 월합산일 때만 표시
  const showMonthlyRows = !isDaily || method==='monthly';
  const periodRow = document.getElementById('ct-pay-period-row');
  if(periodRow) periodRow.style.display = showMonthlyRows ? '' : 'none';

  _toggleCtPayDayInput(!showMonthlyRows, method);
  _ctPayMethodPeriodInfo(method, isDaily);
  if(typeof _checkRegisterBtnState === 'function') _checkRegisterBtnState();
  if(typeof _checkAmendBtnState === 'function')    _checkAmendBtnState();
}

/** 일용직 지급 방법별 자동 산정기간/급여일 안내 */
function _ctPayMethodPeriodInfo(method, isDaily){
  const WK = ['일','월','화','수','목','금','토'];
  const infoDaily  = document.getElementById('ct-pay-method-daily-info');
  const infoMonth  = document.getElementById('ct-pay-method-monthly-info');
  if(infoDaily){
    const cond = document.querySelector('input[name="ct-pay-condition"]:checked')?.value || '';
    const n = document.getElementById('ct-pay-after-days')?.value || '';
    const payTxt = cond==='after_n_days' ? `근무일로부터 ${n||'n'}일 후 지급` : '근무일 당일 지급';
    infoDaily.textContent = `급여 산정기간: 매일 (자동) · 급여일: ${payTxt}`;
  }
  if(infoMonth){
    const daySel = document.getElementById('ct-pay-period-day')?.value || '';
    const payDay = document.getElementById('ct-pay-day')?.value || '';
    if(daySel){
      const n = parseInt(daySel);
      infoMonth.textContent = `급여 산정기간: 매월 ${n}일 ~ 다음 달 ${n-1}일 (계약기간 확인 자동) · 급여일: 매월 ${payDay||'?'}일`;
    } else {
      infoMonth.textContent = '급여 산정기간: 산정기준일(몇일)부터 1개월간 · 아래에서 산정기준월·기준일·지급일을 설정하세요.';
    }
  }
}

/** 일용직 지급 방법 UI 전체 적용 (카테고리 변경/수정 로드 시 호출) */
function _ctPayMethodApply(){
  const rawCat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-type')?.value || '')
    : _ctNewCat();
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isDaily = cat === CONTRACT_TYPE.DAILY;
  const wrap = document.getElementById('ct-pay-method-wrap');
  if(wrap) wrap.style.display = isDaily ? '' : 'none';
  if(isDaily && !_ctPayMethodVal()) _ctPayMethodSetVal('daily'); // 기본: 일급
  _ctPayMethodChange();
}

/** 급여일 입력 토글: 일용직(일급/주급)=자동안내 / 일용직(월합산)·그 외=매월 n일 */
function _toggleCtPayDayInput(isDaily, method){
  if(method === undefined) method = _ctPayMethodVal() || 'daily';
  const monthlyWrap = document.getElementById('ct-pay-day-monthly-wrap');
  const dateEl      = document.getElementById('ct-pay-day-date');
  const autoEl      = document.getElementById('ct-pay-day-auto');
  const suffix      = document.getElementById('ct-pay-day-label-suffix');
  const showAuto    = !!isDaily && method !== 'monthly';
  const showMonthly = !isDaily || method === 'monthly';
  if(monthlyWrap) monthlyWrap.style.display = showMonthly ? '' : 'none';
  if(dateEl) dateEl.style.display = 'none';
  if(autoEl){
    autoEl.style.display = showAuto ? '' : 'none';
    if(showAuto){
      if(method === 'daily'){
        const cond = document.querySelector('input[name="ct-pay-condition"]:checked')?.value || 'same_day';
        const n = document.getElementById('ct-pay-after-days')?.value || '';
        autoEl.textContent = cond==='after_n_days' ? `근무일로부터 ${n||'n'}일 후 지급` : '근무일 당일 지급';
      } else if(method === 'weekly'){
        const wd = document.getElementById('ct-pay-weekday')?.value;
        autoEl.textContent = wd ? `매주 ${['일','월','화','수','목','금','토'][parseInt(wd)]}요일 지급` : '매주 지급 요일 선택';
      }
    }
  }
  if(suffix) suffix.textContent = showAuto ? '(자동)' : '(매월)';
}

// 수정 모드 하위호환: allowance_config와 무관하게 DB에 저장된 값이 있는 항목 강제 노출
// ※ 단, 통상임금 불포함(daily/receipt) 수당은 근로계약 임금조건에 노출하지 않으므로
//    pay_type이 fixed인 항목만 force-show 대상으로 한정
// ※ 일용직(contract_type='daily')은 통상임금·고정수당 항목을 전혀 노출하지 않음
function _forceShowNonZeroCTRows(c){
  // 일용직: 통상임금·고정수당 항목 강제노출 금지
  const ctType = c.contract_type || '';
  if(ctType === CONTRACT_TYPE.DAILY) return;
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
      // — 해당 항목은 setCTPayType에서 display:none 처리됨
      const ptKey = _ptKeyMap[key];
      if(ptKey && _ctPayTypes[ptKey] && _ctPayTypes[ptKey] !== 'fixed') return;
      const rowEl = document.getElementById(rowId);
      if(rowEl) rowEl.style.display = '';
    }
  });
}

/**
 * 월 소정근로시간 (주휴 제외, 반올림)
 *
 * 공식: round(주 소정근로시간 × 365 ÷ 12 ÷ 7)
 *   - 전일제(주 40h): round(40 × 365÷12÷7) = 174h
 *   - 주휴 포함 월 총 시간 = 174h + 35h = 209h (고용노동부 고시)
 *
 * @param {number} hpd  1일 소정근로시간 (hours per day)
 * @param {number} dpw  주 소정근로일수 (days per week)
 * @returns {number}    월 소정근로시간 (정수, 주휴 제외)
 */
function _calcMonthlyStdHours(hpd, dpw){
  hpd = parseFloat(hpd) || 8;
  dpw = parseFloat(dpw) || 5;
  const weeklyH = hpd * dpw;                     // 주 소정근로시간
  return Math.round(weeklyH * 365 / 12 / 7);
}

/**
 * 월 주휴시간 (반올림)
 *
 * 공식: round(1일 소정근로시간 × 365 ÷ 12 ÷ 7)
 *   - 전일제(1일 8h): round(8 × 365÷12÷7) = 35h
 *
 * @param {number} hpd  1일 소정근로시간
 * @returns {number}    월 주휴시간 (정수)
 */
function _calcMonthlyHolHours(hpd){
  hpd = parseFloat(hpd) || 8;
  return Math.round(hpd * 365 / 12 / 7);
}

/**
 * 주휴수당 라벨 안내문 — 정규직(연봉제)·계약직(월급제): "※참고: 주휴수당" + "(자동계산)",
 * 일용직: "주휴수당" + "(자동계산)" (2026-09-03)
 */
function _updateWeeklyHolLabel(isDaily){
  const lbl = document.getElementById('ct-weekly-hol-label');
  const desc = document.getElementById('ct-weekly-hol-desc');
  if(lbl) lbl.textContent = isDaily ? '주휴수당' : '※참고: 주휴수당';
  if(desc) desc.textContent = '(자동계산)';
}

// ── 일용직 상용직 여부 (2026-09-03) ──
//   fulltime: 상용직 취급 — 근무시간표 입력
//   daily   : 상용직 아님 — 근무시간표 없음, 매일 근로실적(공수)은 급여입력에서 처리
function _ctDailyEmpTypeVal(){
  const r = document.querySelector('input[name="ct-daily-emp-type"]:checked');
  return r ? r.value : 'daily';
}
function _ctDailyEmpTypeSetVal(v){
  const r = document.querySelector(`input[name="ct-daily-emp-type"][value="${v}"]`);
  if(r) r.checked = true;
}
/** 일용직 상용직 여부 UI 적용 — 상용직 아님은 근무시간표(일괄설정·시간표) 숨김 */
function _applyDailyEmpTypeUI(){
  const row = document.getElementById('ct-row-daily-emp-type');
  if(!row) return;
  const rawCat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-type')?.value || '')
    : _ctNewCat();
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isDaily = cat === CONTRACT_TYPE.DAILY;
  row.style.display = isDaily ? '' : 'none';
  if(!isDaily) return;
  const isFulltime = _ctDailyEmpTypeVal() === 'fulltime';
  const bulkBar = document.getElementById('ct-bulk-bar-wrap');
  const schedRow = document.getElementById('ct-row-schedule');
  const hint = document.getElementById('ct-daily-emp-type-hint');
  if(bulkBar) bulkBar.style.display = isFulltime ? '' : 'none';
  if(schedRow) schedRow.style.display = isFulltime ? '' : 'none';
  if(hint) hint.style.display = isFulltime ? 'none' : '';
  // 고정 연장/야간/휴일근로수당: '상용직 취급(fulltime)'만 표시 (근무시간표 자동계산, 2026-09-03)
  ['ct-row-fixed-ot','ct-row-fixed-night','ct-row-fixed-hol'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = isFulltime ? '' : 'none';
  });
}
function _ctDailyEmpTypeChange(){
  _applyDailyEmpTypeUI();
  calcContractSalary();
  _checkRegisterBtnState();
  _checkAmendBtnState();
}

// ── 일용직: 일급여 수동 입력 여부 (통상시급 변경 시 자동계산 일급여 갱신 기준) ──
let _dailyWageManual = false;

// ── 고정 기준(직접 입력 항목): hourly(통상시급) / monthly(월 약정임금) / annual(연봉, 정규직만) ──
let _ctFixBasis = 'hourly';
// 사용자가 라디오를 직접 선택했는지 여부 — 미선택 시 고용형태별 기본값 재적용 (정규직: 연봉 / 계약직: 월 약정임금)
let _ctFixBasisTouched = false;
// 월약정 고정 기준에서 입력값이 비어 있을 때 현재 계산값을 1회 시드했는지 여부 (모달 오픈 편의용)
let _ctMonthlySeeded = false;

/** 고정 기준 라디오 선택 변경 */
function _onFixBasisChange(){
  const checked = document.querySelector('input[name="ct-fix-basis"]:checked');
  if(!checked) return;
  _ctFixBasis = checked.value;
  _ctFixBasisTouched = true;
  _applyFixBasisUI();
  calcContractSalary();
}

/**
 * 고정 기준 UI 적용 — 선택한 항목만 직접 입력(필수 * 표시), 나머지는 자동계산(비활성)
 * 정규직: 연봉/월약정임금/통상시급 택1 (기본: 연봉) · 계약직: 월약정임금/통상시급 택1 (기본: 월약정) · 일용직: 미적용
 */
function _applyFixBasisUI(){
  const rawCat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-type')?.value || '')
    : _ctNewCat();
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isDaily        = cat === CONTRACT_TYPE.DAILY;
  const isRegularGroup = cat === CONTRACT_TYPE.REGULAR || cat === CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedGroup   = cat === CONTRACT_TYPE.FIXED || cat === CONTRACT_TYPE.FIXED_PROBATION;
  const isReadonlyView = !!document.querySelector('#contract-modal.ct-readonly');

  // 고정 기준 선택기는 정규직·계약직(수습 포함)만 사용 — 일용직/기타 유형은 숨김
  const basisRow = document.getElementById('ct-row-fix-basis');
  if(basisRow) basisRow.style.display = (isRegularGroup || isFixedGroup) ? '' : 'none';

  // 사용자가 아직 선택하지 않았으면 고용형태별 기본값 적용 (정규직: 연봉 / 계약직: 월 약정임금)
  if(!_ctFixBasisTouched){
    _ctFixBasis = isRegularGroup ? 'annual' : (isFixedGroup ? 'monthly' : 'hourly');
  }
  if(isDaily || (!isRegularGroup && !isFixedGroup)) _ctFixBasis = 'hourly';
  if(!isRegularGroup && _ctFixBasis === 'annual') _ctFixBasis = isFixedGroup ? 'monthly' : 'hourly';

  // 연봉 옵션: 정규직(수습 포함)만 표시
  const annualWrap = document.getElementById('ct-fix-basis-annual-wrap');
  if(annualWrap) annualWrap.style.display = isRegularGroup ? '' : 'none';

  // 라디오 선택 상태 동기화
  document.querySelectorAll('input[name="ct-fix-basis"]').forEach(r => {
    r.checked = (r.value === _ctFixBasis);
  });

  const basis = _ctFixBasis;
  const hourlyInput = document.getElementById('ct-hourly-input');
  const hourlyDesc  = document.getElementById('ct-hourly-desc');
  const reqHourly   = document.getElementById('ct-hourly-req');
  const monthlyWrap = document.getElementById('ct-monthly-input-wrap');
  const monthlyComp = document.getElementById('ct-monthly-computed');
  const labelMonthly= document.getElementById('ct-label-monthly');
  const annualInput = document.getElementById('ct-annual-sal');
  const annualDesc  = document.getElementById('ct-annual-desc');
  const reqAnnual   = document.getElementById('ct-annual-req');

  // 통상시급: 시급 고정일 때만 직접 입력(필수)
  if(hourlyInput) hourlyInput.readOnly = basis !== 'hourly';
  if(hourlyDesc)  hourlyDesc.textContent = basis === 'hourly' ? '(직접 입력)' : '(자동계산)';
  if(reqHourly)   reqHourly.style.display = basis === 'hourly' ? '' : 'none';

  // 월 약정임금: 월약정 고정일 때만 직접 입력(필수)
  if(monthlyWrap) monthlyWrap.style.display = basis === 'monthly' ? '' : 'none';
  if(monthlyComp) monthlyComp.style.display = basis === 'monthly' ? 'none' : '';
  if(!isDaily && labelMonthly) labelMonthly.innerHTML =
    '월 약정임금 <span class="lbl-req" id="ct-monthly-req">*</span> <span class="lbl-desc" id="ct-monthly-desc"></span>';
  const monthlyDesc = document.getElementById('ct-monthly-desc');
  if(monthlyDesc) monthlyDesc.textContent = basis === 'monthly' ? '(직접 입력)' : '(자동계산)';
  const reqMonthly = document.getElementById('ct-monthly-req');
  if(reqMonthly)  reqMonthly.style.display = basis === 'monthly' ? '' : 'none';

  // 연봉: 연봉 고정일 때만 직접 입력(필수) — 정규직 한정
  if(annualInput) annualInput.readOnly = basis !== 'annual';
  if(annualDesc)  annualDesc.textContent = basis === 'annual' ? '(직접 입력)' : '(자동계산)';
  if(reqAnnual)   reqAnnual.style.display = basis === 'annual' ? '' : 'none';

  // 조회(읽기전용) 화면: 모든 임금 입력 비활성
  if(isReadonlyView){
    if(hourlyInput) hourlyInput.readOnly = true;
    if(annualInput) annualInput.readOnly = true;
    const _miReadonly = document.getElementById('ct-monthly-input');
    if(_miReadonly) _miReadonly.readOnly = true;
  }
}

function calcContractSalary(){
  // 수정 모드이면 ct-edit-em-category, 신규이면 선택된 근로자 기준
  const rawCat = (editId.contract || _recontractEmpId)
    ? (document.getElementById('ct-edit-em-category')?.value || '')
    : _ctNewCat();
  const cat = CONTRACT_TYPE_LEGACY_MAP[rawCat] || rawCat;
  const isDaily        = cat ===CONTRACT_TYPE.DAILY;
  const isRegularGroup = cat ===CONTRACT_TYPE.REGULAR || cat ===CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedTerm    = cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION;

  // 주휴수당 라벨 안내문 갱신 (정규직·계약직 = 기본급 포함 참고 / 일용직 = 별도 지급)
  _updateWeeklyHolLabel(isDaily);

  // 수당 값 읽기 (일용직은 일일 기준 입력값 그대로 사용)
  const position   = getAmountVal('ct-position');
  const car        = getAmountVal('ct-car');
  const remoteArea = getAmountVal('ct-remote-area');
  const meal       = getAmountVal('ct-meal');
  const research   = getAmountVal('ct-research');
  const site_ct    = getAmountVal('ct-site')||0;
  const skill_ct   = getAmountVal('ct-skill')||0;
  const license_ct = getAmountVal('ct-license')||0;
  const hazard_ct  = getAmountVal('ct-hazard')||0;
  const comm_ct    = getAmountVal('ct-communication')||0;
  const fitness_ct = getAmountVal('ct-fitness')||0;
  const selfDev_ct = getAmountVal('ct-self-dev')||0;
  const book_ct    = getAmountVal('ct-book')||0;
  const overseas_ct= getAmountVal('ct-overseas')||0;
  const regularBonus_ct = getAmountVal('ct-regular-bonus')||0;

  if(isDaily){
    // ── 일용직: 일급여(통상일급 + 일일 수당 합산) + 주휴수당(계약기간·근무시간표 기준) ──
    const hWage      = getAmountVal('ct-hourly-input') || 0;

    // 일용직은 기본급 0 (일급여 기준)
    setAmountVal('ct-base', 0);

    // ── 일급여 = 통상일급(통상시급×8) + 통상임금 포함 수당(일) + 통상임금 제외 고정수당(일) ──
    //    ※ 통상임금 제외 고정수당이 포함되므로 '통상일급'과는 다른 개념 (일급여 = 실지급 일당)
    const ordinaryDailyAllow = site_ct + position + skill_ct + license_ct + hazard_ct + remoteArea;
    const nonOrdinaryDailyAllow = car + meal + research + comm_ct + fitness_ct + selfDev_ct + book_ct + overseas_ct;
    const autoDaily = Math.round(hWage * 8) + ordinaryDailyAllow + nonOrdinaryDailyAllow;
    setAmountVal('ct-daily-wage', autoDaily);

    // ── 주휴수당: 계약기간(시작·종료) + 근무시간표(1일시간·주근무일수) 모두 입력된 경우에만 산정 ──
    //    (근로기준법 제55조 — 1주 15시간 이상 + 개근 시 유급 주휴일, 계약기간 일수 비례)
    const hours     = parseFloat(document.getElementById('ct-hours').value);
    const daysDaily = parseFloat(document.getElementById('ct-days').value);
    const ctStart   = document.getElementById('ct-start')?.value || '';
    const ctEnd     = document.getElementById('ct-end')?.value || '';
    const hasSchedule = hours > 0 && daysDaily > 0;
    const hasPeriod  = !!ctStart && !!ctEnd;
    const weeklyHDaily = (hours||0) * (daysDaily||0);
    let weeklyHolDaily = 0;
    if(hasSchedule && hasPeriod && weeklyHDaily >= 15 && hWage > 0){
      // 계약기간 일수 반영: 월 주휴시간(1일 시간×365÷12÷7) × (계약일수/30)
      const _holH = _calcMonthlyHolHours(hours);
      const _s = new Date(ctStart), _e = new Date(ctEnd);
      const _contractDays = (!isNaN(_s) && !isNaN(_e) && _e >= _s) ? Math.round((_e - _s)/86400000) + 1 : 30;
      weeklyHolDaily = Math.round(hWage * _holH * Math.min(1, _contractDays / 30));
    }
    document.getElementById('ct-weekly-hol-computed').textContent = won(weeklyHolDaily);
    document.getElementById('ct-monthly-computed').textContent    = '0원';
    // 주휴수당 산정 조건 미충족 안내 (계약기간·근무시간표 미입력 또는 주15h 미만)
    const _holHint = document.getElementById('ct-weekly-hol-hint');
    if(_holHint){
      _holHint.style.display = (!hasSchedule || !hasPeriod || weeklyHDaily < 15) ? '' : 'none';
    }
    _checkMinWageWarning();
    _checkRegisterBtnState();
    _checkAmendBtnState();
    return;
  }

  // ── 월 약정임금 합산용 수당 (pay_type='fixed'만 통상임금 포함, 식대·차량지원비는 제외) ──
  const allAllow = (() => {
    // ── 통상임금 설정 그룹 (pay_type='fixed' && 통상임금 포함 항목만) ──
    const ordinaryGroup = (_isFixedAllow('site')          ? site_ct      : 0)
      + (_isFixedAllow('position')       ? position       : 0)
      + (_isFixedAllow('skill')          ? skill_ct       : 0)
      + (_isFixedAllow('license')        ? license_ct     : 0)
      + (_isFixedAllow('hazard')         ? hazard_ct      : 0)
      + (_isFixedAllow('remote_area')    ? remoteArea     : 0)
      + (_isFixedAllow('regular_bonus')  ? regularBonus_ct : 0)
      // 사용자 정의 통상임금 항목 (고객사 정보 → 통상임금 설정)
      + _getCustomOrdinarySum();
    // ── 통상임금 제외 수당 그룹 (pay_type=fixed라도 제외, 월 약정임금에는 합산) ──
    // 식대, 차량지원비, 연구활동비, 통신비, 자기계발비, 도서지원비, 해외근무수당, 체력증진비
    const nonOrdinaryGroup = (_isFixedAllow('car')           ? car         : 0)
      + (_isFixedAllow('meal')          ? meal        : 0)
      + (_isFixedAllow('research')      ? research    : 0)
      + (_isFixedAllow('communication') ? comm_ct     : 0)
      + (_isFixedAllow('self_dev')      ? selfDev_ct  : 0)
      + (_isFixedAllow('book')          ? book_ct     : 0)
      + (_isFixedAllow('overseas')      ? overseas_ct : 0)
      + (_isFixedAllow('fitness')       ? fitness_ct  : 0);
    return { total: ordinaryGroup + nonOrdinaryGroup, ordinaryGroup };
  })();
  const _ordinaryGroup = allAllow.ordinaryGroup;
  const _allAllowTotal = allAllow.total;

  // 주 소정근로시간 파악
  const _hpd = parseFloat(document.getElementById('ct-hours')?.value) || 8;
  const _dpw = parseFloat(document.getElementById('ct-days')?.value)  || 5;
  const _monthlyStdH = _calcMonthlyStdHours(_hpd, _dpw);
  const _monthlyHolH  = _calcMonthlyHolHours(_hpd);

  // ── 고정 수당 금액 먼저 계산 (월 약정임금에 반영하기 위해 선행) ──
  _calcFixedOtFromHours();
  _calcFixedNightFromHours();
  _calcFixedHolFromHours();

  // 고정 연장/야간/휴일근로수당 (통상임금 제외, 월 약정임금에 합산)
  const fixedOtPay    = getAmountVal('ct-fixed-ot-pay')    || 0;
  const fixedNightPay = getAmountVal('ct-fixed-night-pay') || 0;
  const fixedHolPay   = getAmountVal('ct-fixed-hol-pay')   || 0;
  const fixedExtraAll = fixedOtPay + fixedNightPay + fixedHolPay;

  // ── 고정 기준(직접 입력 항목)별 자동계산 ──
  //   시급 고정: 기본급 = 시급×209 / 월약정 고정: 기본급 = 월약정−수당 / 연봉 고정: 월약정 = 연봉÷12
  const isHourlyBased = isRegularGroup || isFixedTerm;
  const _basis = (typeof _ctFixBasis !== 'undefined' ? _ctFixBasis : 'hourly');
  const _allowTotal = _allAllowTotal + fixedExtraAll;
  if(isHourlyBased){
    if(_basis === 'monthly'){
      const _mInput = getAmountVal('ct-monthly-input');
      if(_mInput > 0){
        const autoBase = Math.max(0, Math.round(_mInput - _allowTotal));
        setAmountVal('ct-base', autoBase);
        setAmountVal('ct-hourly-input', autoBase > 0 ? Math.round(autoBase / MAGIC.MONTHLY_STD_HOURS) : 0);
      } else {
        // 월 약정임금 미입력(모달 오픈 직후 등): 기존 시급 기준 값 유지
        const _hw0 = getAmountVal('ct-hourly-input') || 0;
        if(_hw0 > 0) setAmountVal('ct-base', Math.round(_hw0 * MAGIC.MONTHLY_STD_HOURS));
      }
    } else if(_basis === 'annual'){
      const _aInput = getAmountVal('ct-annual-sal');
      if(_aInput > 0){
        const autoMonthly = Math.round(_aInput / 12);
        const autoBase = Math.max(0, Math.round(autoMonthly - _allowTotal));
        setAmountVal('ct-base', autoBase);
        setAmountVal('ct-hourly-input', autoBase > 0 ? Math.round(autoBase / MAGIC.MONTHLY_STD_HOURS) : 0);
      } else {
        // 연봉 미입력(모달 오픈 직후 등): 기존 시급 기준 값 유지
        const _hw0 = getAmountVal('ct-hourly-input') || 0;
        if(_hw0 > 0) setAmountVal('ct-base', Math.round(_hw0 * MAGIC.MONTHLY_STD_HOURS));
      }
    } else {
      // 시급 고정: 기본급 = 통상시급 × 209h (한국 표준)
      const _hw = getAmountVal('ct-hourly-input') || 0;
      if(_hw > 0) setAmountVal('ct-base', Math.round(_hw * MAGIC.MONTHLY_STD_HOURS));
    }
  }
  const hourlyWage = getAmountVal('ct-hourly-input') || 0;

  const base      = getAmountVal('ct-base');
  const weeklyHol = (isHourlyBased && hourlyWage > 0)
    ? Math.round(hourlyWage * _monthlyHolH)
    : 0;
  document.getElementById('ct-weekly-hol-computed').textContent = won(weeklyHol);

  // 월 약정임금 = 기본급(시급×209, 주휴포함) + 각종 수당 + 고정OT/야간/휴일
  const monthly = base + _allAllowTotal + fixedExtraAll;
  document.getElementById('ct-monthly-computed').textContent = won(monthly);

  // 월약정 고정 + 입력 미입력 상태 → 현재 계산값으로 1회 시드 (모달 오픈 직후 기존 금액 표시)
  if(_basis === 'monthly' && !_ctMonthlySeeded && getAmountVal('ct-monthly-input') <= 0 && monthly > 0){
    setAmountVal('ct-monthly-input', monthly);
    _ctMonthlySeeded = true;
  }

  // 정규직·정규직 수습: 연봉 = 월 약정임금 × 12 자동계산 (연봉 고정 기준일 때는 직접 입력값 유지 — 덮어쓰기 금지)
  // 계약직·계약직 수습: 연봉 필드 없음 — 월 약정임금(ct-monthly-input)만 사용 (월약정급여 필드 제거, 2026-09-03)
  if(isRegularGroup){
    if(_basis !== 'annual') setAmountVal('ct-annual-sal', monthly * 12);
  }

  syncProbation();
  _checkMinWageWarning();
  _checkRegisterBtnState();
  _checkAmendBtnState();
}

/** 주간 시간 필드값 → 월간 변환 (저장용) */
function _weeklyToMonthlyHours(fieldId){
  return Math.round((parseFloat(document.getElementById(fieldId)?.value)||0) * WEEK_TO_MONTH);
}

/** 통상시급 반환 (계약서 정상 시급 — 수습기간 임금은 급여 단계에서 수습비율 적용, 2026-09-01 규칙) */
function _getContractHourlyWage(){
  return getAmountVal('ct-hourly-input') || 0;
}

/** 고정 연장근로수당 = (평일연장 h/주 × 연장배율) × 4.345(소수1자리) × 통상시급 (휴일연장은 휴일근로수당으로 합산 — 2026-08-14 규칙) */
function _calcFixedOtFromHours(){
  const hw = _getContractHourlyWage();
  const hRegular = parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0;
  const coId = document.getElementById('ct-company')?.value || '';
  const mult = _getLegalMultiplier(coId);
  const mRegular = Math.round(hRegular * mult.overtime * WEEK_TO_MONTH * 10) / 10; // 통상시급에 곱할 값 (배율 포함, 소수1자리)
  const otPay = (hw > 0 && mRegular > 0) ? Math.round(hw * mRegular) : 0;
  setAmountVal('ct-fixed-ot-pay', otPay);
}

/** 고정 야간근로수당 = (평일야간 h/주 × 야간배율) × 4.345(소수1자리) × 통상시급 (휴일야간은 휴일근로수당으로 합산 — 2026-08-14 규칙) */
function _calcFixedNightFromHours(){
  const hw = _getContractHourlyWage();
  const h  = parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0;
  const coId = document.getElementById('ct-company')?.value || '';
  const mult = _getLegalMultiplier(coId);
  const mNight = Math.round(h * mult.night * WEEK_TO_MONTH * 10) / 10; // 통상시급에 곱할 값 (배율 포함, 소수1자리)
  setAmountVal('ct-fixed-night-pay', (hw > 0 && mNight > 0) ? Math.round(hw * mNight) : 0);
}

/** 고정 휴일근로수당 = (휴일기본×8h배율 + 휴일연장×8h초과배율 + 휴일야간×야간배율, h/주) × 4.345(소수1자리) × 통상시급 (2026-08-14 규칙) */
function _calcFixedHolFromHours(){
  const hw = _getContractHourlyWage();
  const h      = parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0;
  const hHolOt = parseFloat(document.getElementById('ct-fixed-hol-ot-hours')?.value)||0;
  const hHolNi = parseFloat(document.getElementById('ct-fixed-hol-night-hours')?.value)||0;
  const coId = document.getElementById('ct-company')?.value || '';
  const mult = _getLegalMultiplier(coId);
  const holBaseW = Math.max(0, h - hHolOt); // 주당 휴일기본(≤8h) — 휴일연장은 별도 배율
  const mHol = Math.round((holBaseW*mult.holiday_8h + hHolOt*mult.holiday_8h_over + hHolNi*mult.night) * WEEK_TO_MONTH * 10) / 10; // 통상시급에 곱할 값 (배율 포함, 소수1자리)
  setAmountVal('ct-fixed-hol-pay', (hw > 0 && mHol > 0) ? Math.round(hw * mHol) : 0);
}

/** ── 근로계약 관리 알림 카드 렌더링 ── */
