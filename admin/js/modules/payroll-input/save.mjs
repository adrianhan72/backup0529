/**
 * payroll-input/_full.mjs — Phase 6: 급여대장 통합
 * Node.js 자동변환 (convert-core.cjs)
 */
import { getCompanies, getEmployees, getPayrolls, getContracts } from '../state.mjs';
import { piContract, piEditPayrollId, piDraftId, _piEditSnapshot, _piContractLoading, _piPayTypes } from "./state.mjs";
import { CONTRACT_TYPE, CONTRACT_STATUS, COMPANY_STATUS, EMP_STATUS, CONTRACT_TYPE_LEGACY_MAP, DISPATCH_METHOD, DISPATCH_STATUS } from '../constants.mjs';
const _w = (name) => window[name];
window._w = _w;
// ─── PAYROLL INPUT ───
// ============================================================================
// 급여 입력 페이지 — 전월 임금대장 엑셀 다운로드
// ============================================================================
export function _buildPIBody(){
  const empId = document.getElementById('pi-employee').value;
  const coId  = window.currentGlobalCompanyId || document.getElementById('pi-company').value;
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
    ..._getPITransportFields(),
    transport_type:     _piTransportType,
    transport_pay_type: _getPIPayTypeVal('transport'),
    meal_allowance:     gv('pi-meal'),
    meal_pay_type:      _getPIPayTypeVal('meal'),
    childcare_allowance:gv('pi-childcare') || 0,
    childcare_pay_type:     _getPIPayTypeVal('childcare'),
    research_allowance: gv('pi-research')  || 0,
    research_pay_type:      _getPIPayTypeVal('research'),
    communication_pay_type: _getPIPayTypeVal('communication'),
    fitness_allowance:   gv('pi-fitness')   || 0,
    fitness_pay_type:    _getPIPayTypeVal('fitness'),
    self_dev_allowance:  gv('pi-self-dev')  || 0,
    self_dev_pay_type:   _getPIPayTypeVal('self_dev'),
    book_allowance:      gv('pi-book')      || 0,
    book_pay_type:       _getPIPayTypeVal('book'),
    overseas_allowance:  gv('pi-overseas')  || 0,
    overseas_pay_type:   _getPIPayTypeVal('overseas'),
    contract_etc_allowance: 0,
    annual_leave_used:  parseFloat(document.getElementById('pi-annual-used')?.value || 0) || 0,
    annual_leave_pay:   gv('pi-annual-pay'),
    bonus_pay:          gv('pi-bonus'),
    performance_pay:    gv('pi-performance'),
    actual_expense_pay: gv('pi-actual-expense'),
    communication_pay:  gv('pi-communication'),
    etc_allowance:      gv('pi-etc-allowance'),
    etc_allowance_memo: document.getElementById('pi-etc-allowance-memo')?.value || '',
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
    health_insurance_adjust_yearend: gv('pi-health-adj-yearend'),
    health_insurance_adjust_yearend_memo: document.getElementById('pi-health-adj-yearend-memo')?.value || '',
    ltcare_adjust_yearend: gv('pi-ltcare-adj-yearend'),
    ltcare_adjust_yearend_memo: document.getElementById('pi-ltcare-adj-yearend-memo')?.value || '',
    advance_deduction:  gv('pi-advance'),
    advance_deduction_memo: document.getElementById('pi-advance-memo')?.value || '',
    total_deduction:    c.totalDed  || 0,
    net_pay:            c.net       || 0,
    pay_date:           document.getElementById('pi-paydate')?.value || '',
    note:               document.getElementById('pi-note')?.value   || '',
    dependents: Math.max(1, parseInt(document.getElementById('pi-dependents')?.value || '1') || 1),
  };
}

// ==============================================================================
// savePIDraft()
//   현재 폼 입력값을 is_draft:true 상태로 payrolls 테이블에 저장한다.
//   - 이미 임시저장 레코드가 있으면 PUT (덮어쓰기)
//   - 없으면 POST (신규)
//   - 확정 저장(savePI) 시에는 임시저장이 아니므로 이 함수는 호출하지 않음
// ==============================================================================
export async function savePIDraft(){
  // 수정 모드에서는 임시저장 불가 → 알림 모달 표시
  if(piEditPayrollId){
    _showPIDraftEditModeAlert(); return;
    return;
  }
  const empId = document.getElementById('pi-employee').value;
  const yr    = parseInt(document.getElementById('pi-year').value);
  const mo    = parseInt(document.getElementById('pi-month').value);
  if(!empId)   return _w('toast')('직원을 선택하세요.', 'error');
  if(!yr || !mo) return _w('toast')('년도와 월을 선택하세요.', 'error');

  const btn = document.getElementById('pi-draft-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try {
    const body = {
      ..._buildPIBody(),
      is_draft:       true,
      draft_saved_at: new Date().toISOString(),
      // 수정 모드에서 임시저장하면 원본 확정 레코드 ID를 기록
      // → 불러오기(loadPIDraft) 시 piEditPayrollId를 복원해 수정 모드 유지
      edit_source_id: piEditPayrollId || null,
    };

    if(piDraftId){
      // ── 기존 임시저장 덮어쓰기 ──
      body.id = piDraftId;
      await _w('api')(`../tables/payrolls/${piDraftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      // ── 신규 임시저장 ──
      // 수정 모드: 동일 직원·연월의 기존 임시저장(이전 수정 세션의 고아 draft)이 있으면 재활용
      // 신규 모드: 동일 직원·연월에 기존 임시저장이 있으면 재활용
      const existingDraft = getPayrolls().find(
        p => p.employee_id === empId && p.pay_year === yr && p.pay_month === mo && p.is_draft
      );
      if(existingDraft){
        window.piDraftId = existingDraft.id;
        body.id   = piDraftId;
        await _w('api')(`../tables/payrolls/${piDraftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        body.id = 'draft' + Date.now();
        window.piDraftId = body.id;
        await _w('api')('../tables/payrolls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
    }

    // 메모리 갱신
    await _w('loadPayrolls')();

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

    // 임시저장 배너 갱신 (현재 직원 기준)
    _checkAndShowPIDraftBanner(empId, yr, mo);
    // 전체 임시저장 목록 배너 갱신
    renderPIAllDraftBanner();

    // ── 임시저장 완료 모달 표시 (계속 입력 / 목록으로 돌아가기) ──
    _showPIDraftSavedModal(yr, mo, timeStr);

  } catch(e){
    console.error('[savePIDraft]', e);
    _w('toast')('임시저장 중 오류: ' + e.message, 'error');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-floppy-disk"></i> 임시저장'; }
  }
}

// ==============================================================================
// _checkAndShowPIDraftBanner(empId, yr, mo)
//   직원 + 연월 기준으로 임시저장 레코드가 있는지 확인하고
//   있으면 상단 배너를 표시, 없으면 숨긴다.
//   yr, mo 가 생략되면 현재 선택된 연월로 자동 판단.
// ==============================================================================
export function _checkAndShowPIDraftBanner(empId, yr, mo){
  const banner   = document.getElementById('pi-draft-banner');
  const subLabel = document.getElementById('pi-draft-banner-sub');
  if(!banner) return;

  // 수정 모드 중에는 임시저장 복원 배너를 표시하지 않음
  if(piEditPayrollId){ banner.style.display = 'none'; return; }

  const _yr = yr || parseInt(document.getElementById('pi-year')?.value);
  const _mo = mo || parseInt(document.getElementById('pi-month')?.value);
  if(!empId || !_yr || !_mo){ banner.style.display = 'none'; return; }

  const draft = getPayrolls().find(
    p => p.employee_id === empId && p.pay_year === _yr && p.pay_month === _mo && p.is_draft
  );
  if(!draft){ window.piDraftId = null; banner.style.display = 'none'; return; }

  // 확정 레코드가 이미 있는 경우:
  //   - 수정 모드 draft(edit_source_id 있음) → 배너 표시 (수정 세션 진행 중)
  //   - 일반 신규 draft → 배너 숨김 (확정 레코드가 우선)
  const confirmedExists = getPayrolls().some(
    p => p.employee_id === empId && p.pay_year === _yr && p.pay_month === _mo && !p.is_draft
  );
  if(confirmedExists && !draft.edit_source_id){
    banner.style.display = 'none';
    return;
  }

  window.piDraftId = draft.id;
  const savedAt = draft.draft_saved_at
    ? new Date(draft.draft_saved_at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : '';
  const editLabel = draft.edit_source_id ? ' [수정 임시저장]' : '';
  if(subLabel) subLabel.textContent = `${_yr}년 ${_mo}월분${editLabel}${savedAt ? '  ·  ' + savedAt + ' 저장' : ''}`;
  banner.style.display = 'flex';
}

// ==============================================================================
// loadPIDraft()
//   임시저장 배너의 [불러오기] 버튼 핸들러.
//   piDraftId 레코드의 값을 폼에 채운다.
// ==============================================================================
export function loadPIDraft(){
  if(!piDraftId) return;
  const draft = getPayrolls().find(p => p.id === piDraftId);
  if(!draft){ _w('toast')('임시저장 데이터를 찾을 수 없습니다.', 'error'); return; }

  // 임시저장 당시 계약 시작일 기준 고객사 스냅샷으로 allowance_config 적용
  const _draftCoId = draft.company_id || window.currentGlobalCompanyId;
  const _draftEmpContract = (getContracts()||[]).find(c => c.employee_id === draft.employee_id && (c.status===CONTRACT_STATUS.ACTIVE||c.status===EMP_STATUS.ACTIVE));
  const _draftContractTs  = _draftEmpContract?.contract_start ? new Date(_draftEmpContract.contract_start).getTime() : null;
  const _draftCo = (typeof getCompanySnapshotAt === 'function' && _draftContractTs)
    ? (getCompanySnapshotAt(_draftCoId, _draftContractTs) || getCompanies().find(c=>c.id===_draftCoId))
    : getCompanies().find(c=>c.id===_draftCoId);
  const _draftCfg = _draftCo?.allowance_config ?? null;
  applyPIAllowanceConfig(_draftCfg);
  // 이미 값이 있는 항목은 강제 노출 (임시저장 하위호환)
  _forceShowNonZeroPIRows(draft);

  // 폼 값 복원 (editPayroll 로직과 동일한 패턴)
  setAmountVal('pi-base',          draft.base_salary);
  // 주휴수당은 자동계산 — 임시저장값 복원 안 함 (calcPI에서 재계산)
  setAmountVal('pi-position',      draft.position_allowance);
  setAmountVal('pi-remote-area',   draft.remote_area_allowance || 0);
  setAmountVal('pi-site',          draft.site_allowance     || 0);
  setAmountVal('pi-skill',         draft.skill_allowance    || 0);
  setAmountVal('pi-license',       draft.license_allowance  || 0);
  // 차량유지비 복원 (항상 self_driving 고정)
  { const ta = draft.self_driving_allowance || draft.transportation_allowance || 0;
    const tp = draft.transport_pay_type || draft.self_driving_pay_type || draft.transportation_pay_type || '';
    setAmountVal('pi-transport', ta);
    setPIPayType('transport', tp);
  }
  setAmountVal('pi-meal',          draft.meal_allowance);
  setPIPayType('meal',             draft.meal_pay_type  || '');
  setAmountVal('pi-childcare',     draft.childcare_allowance  || 0);
  setPIPayType('childcare',     draft.childcare_pay_type     || '');
  setAmountVal('pi-research',      draft.research_allowance   || 0);
  setPIPayType('research',      draft.research_pay_type      || '');
  setPIPayType('communication', draft.communication_pay_type || '');
  setPIPayType('fitness',       draft.fitness_pay_type       || '');
  setPIPayType('self_dev',      draft.self_dev_pay_type      || '');
  setPIPayType('book',          draft.book_pay_type          || '');
  setPIPayType('overseas',      draft.overseas_pay_type      || '');
  setAmountVal('pi-fitness',    draft.fitness_allowance      || 0);
  setAmountVal('pi-self-dev',   draft.self_dev_allowance     || 0);
  setAmountVal('pi-book',       draft.book_allowance         || 0);
  setAmountVal('pi-overseas',   draft.overseas_allowance     || 0);
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
  setAmountVal('pi-communication',  draft.communication_pay       || 0);
  setAmountVal('pi-etc-allowance',  draft.etc_allowance           || 0);
  const _etcMemoDraft = document.getElementById('pi-etc-allowance-memo');
  if(_etcMemoDraft) _etcMemoDraft.value = draft.etc_allowance_memo || '';
  document.getElementById('pi-work-days').value    = draft.work_days        || 0;
  // 총 근로시간은 자동계산 (pi-total-hours 직접 세팅 제거)
  if(typeof calcPITotalHours === 'function') calcPITotalHours();
  { const autoLbl = document.getElementById('pi-workdays-auto-label'); if(autoLbl) autoLbl.style.display='none'; }
  document.getElementById('pi-paydate').value      = draft.pay_date || '';
  // 임시저장 복원: 저장된 지급일 유지 + readonly 제어만 적용
  _applyPIPayDate(false);
  document.getElementById('pi-note').value         = draft.note    || '';
  setAmountVal('pi-yearend',       draft.year_end_tax_adjust);
  const _yeMemo = document.getElementById('pi-yearend-memo');
  if(_yeMemo) _yeMemo.value = draft.year_end_tax_adjust_memo || '';
  setAmountVal('pi-health-adj',    draft.health_insurance_adjust);
  const _haMemo = document.getElementById('pi-health-adj-memo');
  if(_haMemo) _haMemo.value = draft.health_insurance_adjust_memo || '';
  setAmountVal('pi-health-adj-retro', draft.health_insurance_adjust_retro);
  setAmountVal('pi-health-adj-yearend', draft.health_insurance_adjust_yearend);
  const _hayMemo = document.getElementById('pi-health-adj-yearend-memo');
  if(_hayMemo) _hayMemo.value = draft.health_insurance_adjust_yearend_memo || '';
  setAmountVal('pi-ltcare-adj-yearend', draft.ltcare_adjust_yearend);
  const _ltMemo = document.getElementById('pi-ltcare-adj-yearend-memo');
  if(_ltMemo) _ltMemo.value = draft.ltcare_adjust_yearend_memo || '';
  setAmountVal('pi-advance',       draft.advance_deduction);
  const _advMemo = document.getElementById('pi-advance-memo');
  if(_advMemo) _advMemo.value = draft.advance_deduction_memo || '';
  setAmountVal('pi-std-pay',       draft.standard_monthly_pay);
  // 확정액 기준 고객사 보험료
  const _draftInsCo = getCompanies().find(x => x.id === draft.company_id);
  if(_draftInsCo?.insurance_basis === '확정액 기준'){
    setAmountVal('pi-pension-fixed', draft.national_pension);
    setAmountVal('pi-health-fixed',  draft.health_insurance);
    setAmountVal('pi-ltcare-fixed',  draft.long_term_care);
    setAmountVal('pi-employ-fixed',  draft.employment_insurance);
  }

  // 연도·월 복원 (이미 선택되어 있어야 하나 혹시 모를 경우 대비)
  if(draft.pay_year)  document.getElementById('pi-year').value  = draft.pay_year;
  if(draft.pay_month) document.getElementById('pi-month').value = draft.pay_month;

  // pay_type 복원 완료 후 비정기 섹션 이동 재처리
  _renderPIIrregularRows();
  calcAnnualLeaveTable();
  calcPI();

  // 배너 숨김 (불러온 뒤에는 더 이상 안내 불필요)
  const banner = document.getElementById('pi-draft-banner');
  if(banner) banner.style.display = 'none';
  // 직전월 메모 배너도 숨김 (임시저장 복원 데이터가 우선)
  _hidePrevMemoBanner();

  // ── 수정 모드 draft 복원: edit_source_id가 있으면 수정 모드 UI 재진입 ──
  // 세션 이탈 후 임시저장 배너로 재진입하는 경우에도 수정 모드를 유지한다.
  if(draft.edit_source_id){
    const srcPayroll = getPayrolls().find(p => p.id === draft.edit_source_id);
    if(srcPayroll){
      window.piEditPayrollId = draft.edit_source_id;
      _updatePICancelBtn();
      // 저장 버튼 → "수정 저장" 표기 + 수정 배너 표시
      document.querySelectorAll('#page-payroll-input .btn-primary').forEach(btn => {
        if(btn.textContent.includes('급여 저장') || btn.textContent.includes('저장')){
          btn.innerHTML = '<i class="fas fa-save"></i> 수정 저장';
          btn.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
        }
      });
      // 수정 모드 배너 제거됨 — 드롭존만 숨김
      document.getElementById('pi-upload-drop-zone').style.display = 'none';
      const emp2 = getEmployees().find(e => e.id === draft.employee_id) || {};
      // draft에 채워진 폼 상태를 원상복구 기준점으로 저장
      // (이후 사용자가 폼을 변경하면 원상복구 버튼이 활성화됨)
      window._piEditSnapshot = _readPIFormSnapshot();
      _checkPIRestoreBtn();
      _w('toast')(`✔ ${draft.pay_year}년 ${draft.pay_month}월 수정 임시저장을 불러왔습니다.\n[수정 저장]을 눌러 최종 반영하세요.`, 'info');
      return;
    }
    // edit_source_id가 있지만 원본 레코드가 없으면(삭제된 경우) 신규로 전환
    window.piEditPayrollId = null;
  }

  const emp = getEmployees().find(e => e.id === draft.employee_id) || {};
  _w('toast')(`✔ ${draft.pay_year}년 ${draft.pay_month}월 임시저장 내용을 불러왔습니다.\n확인 후 [급여 저장]을 눌러 최종 저장하세요.`, 'info');
}

// ==============================================================================
// discardPIDraft()
//   임시저장 배너의 [삭제] 버튼 핸들러.
//   DB에서 임시저장 레코드를 삭제하고 배너를 숨긴다.
// ==============================================================================
export async function discardPIDraft(){
  if(!piDraftId) return;
  if(!confirm('임시저장된 급여 입력을 삭제하시겠습니까?')) return;
  try {
    await _w('api')(`../tables/payrolls/${piDraftId}`, { method: 'DELETE' });
    window.piDraftId = null;
    await _w('loadPayrolls')();
    const banner = document.getElementById('pi-draft-banner');
    if(banner) banner.style.display = 'none';
    // 전체 임시저장 목록 배너 갱신
    renderPIAllDraftBanner();
    _w('toast')('임시저장이 삭제되었습니다.', 'info');
  } catch(e){
    _w('toast')('삭제 중 오류: ' + e.message, 'error');
  }
}

export async function savePI(){
  try {
  const empId=document.getElementById('pi-employee').value;
  const coId=window.currentGlobalCompanyId || document.getElementById('pi-company').value;
  const yr=parseInt(document.getElementById('pi-year').value);
  const mo=parseInt(document.getElementById('pi-month').value);
  if(!empId) return _w('toast')('직원을 선택하세요.','error');
  if(!yr||!mo) return _w('toast')('년도와 월을 선택하세요.','error');

  // ── 수습 만료일 초과 최종 차단 (저장 버튼이 우회된 경우 대비 이중 방어) ──
  {
    const _probResult = _checkPIProbationOverrun();
    if(_probResult === true){
      // 케이스①: 월 전체 초과 → 채용확정 계약 자동 생성 버튼을 사용하도록 안내
      const probEndStr = _calcProbationEndDate(piContract);
      const fmtD = d => d ? `${d.slice(0,4)}년 ${d.slice(5,7)}월 ${d.slice(8,10)}일` : '-';
      _w('toast')(
        `수습 만료일(${fmtD(probEndStr)})이 지난 달입니다.\n` +
        `상단 배너의 [채용확정 계약 자동 생성 후 저장] 버튼을 사용하세요.`,
        'error'
      );
      return;
    }
    if(_probResult === 'split'){
      // 케이스②: 월 중간 분리 → 분리 저장 버튼을 사용하도록 안내
      _w('toast')(
        `이 달은 수습 기간과 채용확정 기간이 혼재합니다.\n` +
        `상단 배너의 [수습 / 채용확정 분리 저장] 버튼을 사용하세요.`,
        'error'
      );
      return;
    }
  }

  // ── 산정기준 등록 여부 검증 ──
  const _stdCheck = _checkPIStandardsReady(yr, mo, coId || window.currentGlobalCompanyId);
  if(!_stdCheck.ok){
    _showPIStandardsWarn(yr, mo, _stdCheck.missing);
    return;
  }
  // ── 계약 유효성 검증 ──
  if(!piContract){
    return _w('toast')('유효한 근로계약서가 없습니다. 계약서를 먼저 등록·완료해 주세요.','error');
  }
  if(piContract.is_draft){
    return _w('toast')('근로계약서가 임시저장 상태입니다. 계약서 등록을 완료한 후 급여를 입력해 주세요.','error');
  }
  // ── 보험요율 캐시 로드 여부 확인 (백그라운드 로드가 아직 완료되지 않은 경우 방어) ──
  if(window._allInsuranceRates.length === 0 && _getPIInsuranceBasis() === '요율 기준'){
    try {
      await loadStandards();
    } catch(e){ console.warn('[savePI] loadStandards 재시도 실패', e); }
  }
  calcPI();
  const c=window._piCalc||{};
  // ── 통상임금 포함여부 미선택 차단: 금액 > 0 인데 pay_type 미선택('')이면 저장 불가 ──
  {
    const _ptItems = [
      { field:'transport',    label:'차량교통비' },
      { field:'meal',         label:'식대' },
      { field:'childcare',    label:'보육수당' },
      { field:'research',     label:'연구활동비' },
      { field:'communication',label:'통신비' },
      { field:'fitness',       label:'체력증진비' },
      { field:'self_dev',      label:'자기계발비' },
      { field:'book',          label:'도서지원비' },
      { field:'overseas',      label:'해외근무수당' },
    ];
    const _unset = _ptItems.filter(x => gv(`pi-${x.field}`) > 0 && _getPIPayTypeVal(x.field) === '');
    if(_unset.length > 0){
      const _names = _unset.map(x => x.label).join(', ');
      _w('toast')(`통상임금 포함여부를 선택해 주세요: ${_names}`, 'error');
      // 첫 번째 미선택 항목 select에 포커스
      const _firstSel = document.getElementById(`pi-${_piFieldToHtmlId(_unset[0].field)}-pay-type-select`);
      if(_firstSel) _firstSel.focus();
      return;
    }
  }
  // ── _piCalc 결과 검증: 요율 기준인데 공제가 모두 0이면 경고 ──
  const _isRateBasis = _getPIInsuranceBasis() === '요율 기준';
  if(_isRateBasis && c.gross > 0 && !(c.pension > 0 || c.health > 0 || c.incomeTax > 0)){
    const _cont = confirm('⚠️ 공제항목이 계산되지 않았습니다.\n보험요율 산정기준을 다시 확인해 주세요.\n\n그래도 저장하시겠습니까?');
    if(!_cont) return;
  }
  const body={employee_id:empId,company_id:coId,pay_year:yr,pay_month:mo,work_days:gv('pi-work-days'),total_work_hours:gv('pi-total-hours'),overtime_hours:gv('pi-ot-hours'),night_hours:gv('pi-night-hours'),holiday_hours:gv('pi-hol-hours'),hourly_wage:piContract?piContract.hourly_wage:0,base_salary:gv('pi-base'),weekly_holiday_pay:gv('pi-weekly-hol'),position_allowance:gv('pi-position'),remote_area_allowance:gv('pi-remote-area')||0,site_allowance:gv('pi-site')||0,skill_allowance:gv('pi-skill'),license_allowance:gv('pi-license'),overtime_pay:c.otPay||0,night_pay:c.nightPay||0,holiday_pay:c.holPay||0,..._getPITransportFields(),transport_type:_piTransportType,transport_pay_type:_getPIPayTypeVal('transport'),meal_allowance:gv('pi-meal'),meal_pay_type:_getPIPayTypeVal('meal'),childcare_allowance:gv('pi-childcare'),childcare_pay_type:_getPIPayTypeVal('childcare'),research_allowance:gv('pi-research'),research_pay_type:_getPIPayTypeVal('research'),communication_pay_type:_getPIPayTypeVal('communication'),annual_leave_used:parseFloat(document.getElementById('pi-annual-used')?.value||0)||0,annual_leave_pay:gv('pi-annual-pay'),bonus_pay:gv('pi-bonus'),performance_pay:gv('pi-performance'),actual_expense_pay:gv('pi-actual-expense'),communication_pay:gv('pi-communication'),fitness_allowance:gv('pi-fitness')||0,fitness_pay_type:_getPIPayTypeVal('fitness'),self_dev_allowance:gv('pi-self-dev')||0,self_dev_pay_type:_getPIPayTypeVal('self_dev'),book_allowance:gv('pi-book')||0,book_pay_type:_getPIPayTypeVal('book'),overseas_allowance:gv('pi-overseas')||0,overseas_pay_type:_getPIPayTypeVal('overseas'),contract_etc_allowance:0,etc_allowance:gv('pi-etc-allowance'),etc_allowance_memo:document.getElementById('pi-etc-allowance-memo')?.value||'',gross_pay:c.gross||0,standard_monthly_pay:c.std||0,income_tax:c.incomeTax||0,local_income_tax:c.localTax||0,health_insurance:c.health||0,long_term_care:c.ltCare||0,national_pension:c.pension||0,employment_insurance:c.empIns||0,year_end_tax_adjust:gv('pi-yearend'),year_end_tax_adjust_memo:document.getElementById('pi-yearend-memo')?.value||'',health_insurance_adjust:gv('pi-health-adj'),health_insurance_adjust_memo:document.getElementById('pi-health-adj-memo')?.value||'',health_insurance_adjust_retro:gv('pi-health-adj-retro'),health_insurance_adjust_yearend:gv('pi-health-adj-yearend'),health_insurance_adjust_yearend_memo:document.getElementById('pi-health-adj-yearend-memo')?.value||'',ltcare_adjust_yearend:gv('pi-ltcare-adj-yearend'),ltcare_adjust_yearend_memo:document.getElementById('pi-ltcare-adj-yearend-memo')?.value||'',advance_deduction:gv('pi-advance'),advance_deduction_memo:document.getElementById('pi-advance-memo')?.value||'',total_deduction:c.totalDed||0,net_pay:c.net||0,pay_date:document.getElementById('pi-paydate')?.value||'',note:document.getElementById('pi-note')?.value||'',dependents:Math.max(1,parseInt(document.getElementById('pi-dependents')?.value||'1')||1)};
  if(piEditPayrollId){
    // ── 수정 모드: PUT ──
    await _w('api')(`../tables/payrolls/${piEditPayrollId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 임시저장 레코드 정리 (수정 모드에서 임시저장 후 확정 저장 시 고아 레코드 방지) ──
    if(piDraftId){
      try { await _w('api')(`../tables/payrolls/${piDraftId}`,{method:'DELETE'}); } catch(e){}
      window.piDraftId = null;
    } else {
      const orphanDraft = getPayrolls().find(p=>p.employee_id===empId&&Number(p.pay_year)===yr&&Number(p.pay_month)===mo&&!!p.is_draft);
      if(orphanDraft){ try{ await _w('api')(`../tables/payrolls/${orphanDraft.id}`,{method:'DELETE'}); }catch(e){} }
    }
    // 임시저장 배너 숨김
    const _editDraftBanner = document.getElementById('pi-draft-banner');
    if(_editDraftBanner) _editDraftBanner.style.display = 'none';
    renderPIAllDraftBanner();
    await _w('loadPayrolls')(); _w('renderPayrolls')(); _w('renderDashboard')();
    // ── [연동] Payroll → Ledger: 급여 저장 후 관리대장 해당 월 자동 갱신 ──
    await _syncPayrollToLedger(empId, yr, mo, body.annual_leave_used || 0);
    // 임금대장 완성 여부 체크
    await _checkWageLedgerComplete(coId, yr, mo);
    // 고객사 인앱 알림 발송 (급여 수정 완료)
    {
      const _piCo  = getCompanies().find(x => x.id === coId) || {};
      const _piEmp = getEmployees().find(x => x.id === empId) || {};
      const _coRep = _w('getCompanyRepGreeting')(_piCo);
      if(coId){
        await _w('_sendCompanyNotice')({
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
    // ── 수정 모드 해제 후 저장 완료 모달 표시 ──
    const _editEmp       = getEmployees().find(x => x.id === empId) || {};
    const _savedPayrollId = piEditPayrollId; // cancelEditPayroll()이 null로 초기화하기 전에 보존
    cancelEditPayroll(); // 수정 모드 해제 + 목록 복귀 (pi-period-section도 복원)
    _showPISavedModal(_editEmp.name || empId, yr, mo, _savedPayrollId, true);
  } else {
    // ── 신규 모드: POST ──
    // 확정 저장 레코드(is_draft=false) 중복 체크 (임시저장 레코드는 제외)
    const dup=getPayrolls().find(p=>p.employee_id===empId&&p.pay_year===yr&&p.pay_month===mo&&!p.is_draft);
    if(dup){if(!confirm(`${yr}년 ${mo}월 급여가 이미 존재합니다. 덮어쓰시겠습니까?`)) return;await _w('api')(`../tables/payrolls/${dup.id}`,{method:'DELETE'});}
    // ── 임시저장 레코드가 있으면 먼저 삭제 (확정 저장으로 대체) ──
    if(piDraftId){
      try { await _w('api')(`../tables/payrolls/${piDraftId}`,{method:'DELETE'}); } catch(e){}
      window.piDraftId = null;
    } else {
      // piDraftId가 없어도 혹시 남은 임시저장 레코드가 있으면 삭제
      const orphanDraft = getPayrolls().find(p=>p.employee_id===empId&&p.pay_year===yr&&p.pay_month===mo&&p.is_draft);
      if(orphanDraft){ try{ await _w('api')(`../tables/payrolls/${orphanDraft.id}`,{method:'DELETE'}); }catch(e){} }
    }
    const _newPayrollId = 'pay' + Date.now();
    body.id = _newPayrollId;
    await _w('api')('../tables/payrolls',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // 임시저장 배너 숨김 + 갱신
    const _draftBannerEl = document.getElementById('pi-draft-banner');
    if(_draftBannerEl) _draftBannerEl.style.display = 'none';
    await _w('loadPayrolls')(); _w('renderPayrolls')(); _w('renderDashboard')();
    renderPIAllDraftBanner();
    // ── [연동] Payroll → Ledger: 급여 저장 후 관리대장 해당 월 자동 갱신 ──
    await _syncPayrollToLedger(empId, yr, mo, body.annual_leave_used || 0);
    // 임금대장 완성 여부 체크
    await _checkWageLedgerComplete(coId, yr, mo);
    // 고객사 인앱 알림 발송 (급여 입력 완료 — 개별 건)
    {
      const _piCo  = getCompanies().find(x => x.id === coId) || {};
      const _piEmp = getEmployees().find(x => x.id === empId) || {};
      const _coRep = _w('getCompanyRepGreeting')(_piCo);
      if(coId){
        await _w('_sendCompanyNotice')({
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
    // ── 신규 모드: 폼 → 목록 전환 후 저장 완료 모달 표시 ──
    const _newEmp = getEmployees().find(x => x.id === empId) || {};
    backToPITargetList(); // 폼 닫고 목록으로 (pi-period-section 복원 포함)
    _showPISavedModal(_newEmp.name || empId, yr, mo, _newPayrollId, false);
  }
  } catch(err) {
    console.error('[savePI] 저장 중 오류:', err);
    _w('toast')('저장 중 오류가 발생했습니다. 콘솔을 확인해 주세요.', 'error');
  }
}

// ===============================================================================
// _autoCreateConfirmedContract(probEndDate)
//   수습 계약(piContract)을 기반으로 채용확정 근로계약서를 자동 생성한다.
//
//   ┌──────────────────────────────────────────────────────────────────┐
//   │ 수습 계약의 의미                                                  │
//   │   - contract_start = 실제 입사일(= 수습 시작일)                   │
//   │   - contract_end   = 약정 계약 만료일(수습+채용확정 전체 기간)     │
//   │   → 수습 기간의 유효 기간은 contract_start ~ 수습만료일까지        │
//   │                                                                  │
//   │ 채용확정 계약 생성 규칙                                           │
//   │ [정규직 수습 → 정규직]                                            │
//   │   contract_start = 수습만료일 + 1일 (채용확정 효력 개시일)         │
//   │   contract_end   = '' (정규직 무기한)                             │
//   │   salary_start_date = contract_start (= 수습만료익일)             │
//   │   salary_end_date   = '' (무기한)                                 │
//   │   hire_date(직원)   = 원본 수습 contract_start (= 실제 입사일)     │
//   │                                                                  │
//   │ [계약직 수습 → 계약직]                                            │
//   │   contract_start = 수습만료일 + 1일 (채용확정 효력 개시일)         │
//   │   contract_end   = 원본 수습의 contract_end (약정 만료일 유지)     │
//   │   salary_start_date = contract_start (= 수습만료익일)             │
//   │   salary_end_date   = 원본 수습의 contract_end                    │
//   │   hire_date(직원)   = 원본 수습 contract_start (= 실제 입사일)     │
//   └──────────────────────────────────────────────────────────────────┘
//   - status = '서류미비' (날인본 미첨부 상태로 생성)
//   - amended_from = piContract.id (원본 수습 계약 참조)
//   - POST /tables/contracts
//   - PATCH /tables/contracts/:origId  { is_voided_by_amend: true } (원본 수습 무효화)
//   - PATCH /tables/employees/:id { employment_category, hire_date }
//   - getContracts() / getEmployees() 갱신
//   반환: 생성된 계약 객체 (실패 시 throw)
// ===============================================================================
export async function _autoCreateConfirmedContract(probEndDate){
  if(!piContract) throw new Error('piContract가 없습니다.');

  // 채용확정 고용형태 결정
  const confirmedType = piContract.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION ? '정규직' : '계약직';

  // 실제 입사일 = 원본 수습 계약의 contract_start
  // (수습 계약의 contract_start는 수습 시작일 = 입사일)
  const hireDate = piContract.contract_start || '';

  // 채용확정 계약의 효력 개시일 = 수습 만료일 + 1일
  const probEndObj  = new Date(probEndDate);
  const newStartObj = new Date(probEndObj);
  newStartObj.setDate(newStartObj.getDate() + 1);
  const newStart = newStartObj.toISOString().slice(0,10);

  // 계약 종료일:
  //   계약직 → 원본 수습 계약의 contract_end (약정 만료일) 유지
  //   정규직 → '' (무기한)
  const newEnd = confirmedType ===CONTRACT_TYPE.FIXED ? (piContract.contract_end || '') : '';

  // 신규 채용확정 계약 body
  const newContractBody = {
    id: 'cont' + Date.now(),
    employee_id:             piContract.employee_id,
    company_id:              piContract.company_id,
    // ── 기간 필드 ──
    // contract_start: 채용확정 효력 개시일(수습만료익일) — 계약서 상 "계약 시작일"
    // contract_end  : 계약직이면 약정 만료일 유지, 정규직은 빈값(무기한)
    // salary_start_date: 급여 산정 시작일 = 채용확정 효력 개시일(수습만료익일)
    // salary_end_date  : 급여 산정 종료일 = contract_end 와 동일
    contract_start:          newStart,
    contract_end:            newEnd,
    salary_start_date:       newStart,
    salary_end_date:         newEnd,
    contract_type:           confirmedType,
    status: CONTRACT_STATUS.DOCS_INCOMPLETE,
    // ── 수습 필드 초기화 ──
    probation_months:        0,
    probation_pct:           0,
    probation_amt:           0,
    probation_basis:         'salary',
    // ── 임금/근로조건: 원본 수습 계약에서 그대로 승계 ──
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
    site_allowance:          piContract.site_allowance          || 0,
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
    insurance_employment:    piContract.insurance_employment    ?? true,
    insurance_industrial:    piContract.insurance_industrial    ?? true,
    insurance_pension:       piContract.insurance_pension       ?? true,
    insurance_health:        piContract.insurance_health        ?? true,
    note:                    '',
    amended_from:            piContract.id,
    is_draft:                false,
    is_voided_by_amend:      false,
    signed_file_name:        '',
    signed_file_data:        '',
    consent_file_name:       '',
    consent_file_data:       '',
  };

  // 계약서 POST
  const savedContract = await _w('api')('../tables/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newContractBody)
  });

  // ── 원본 수습 계약 무효화 ──
  // 채용확정 계약이 생성되었으므로 원본 수습 계약의 is_voided_by_amend를 true로 설정.
  // 이렇게 해야 loadPIContract()의 필터(!is_voided_by_amend)에서 제외되어
  // 복수 활성 계약이 동시에 선택되는 문제를 방지한다.
  // (status는 '활성' 유지 — 수습 기간 실적/이력 보존을 위해 계약 내용은 삭제하지 않음)
  try {
    const _origProbId = piContract.id;
    await _w('api')(`../tables/contracts/${_origProbId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_voided_by_amend: true,
        voided_at: new Date().toISOString(),
      })
    });
  } catch(e) {
    console.warn('[_autoCreateConfirmedContract] 원본 수습 계약 무효화 실패 (계속 진행):', e);
  }

  // ── 직원 정보 PATCH ──
  // employment_category: 채용확정 고용형태로 변경
  // hire_date: 원본 수습 계약의 contract_start(= 실제 입사일)를 명시적으로 유지.
  //   수습 계약의 contract_start가 실제 입사일이며, 채용확정 후에도 입사일은 변하지 않는다.
  //   명시적으로 PATCH해야 재입사 등 예외 상황에서도 hire_date가 정확히 관리된다.
  await _w('api')(`../tables/employees/${piContract.employee_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employment_category: confirmedType,
      hire_date: hireDate,
    })
  });

  // 메모리 갱신
  await _w('loadContracts')();
  await _w('loadEmployees')();

  return savedContract.id ? savedContract : { ...newContractBody, ...savedContract };
}

// ===============================================================================
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
//   6. getPayrolls() 갱신, UI 반영
// ===============================================================================
export async function savePISplit(){
  const saveBtn = document.getElementById('pi-prob-split-save-btn');
  if(saveBtn && saveBtn.disabled) return;

  const empId = document.getElementById('pi-employee').value;
  const coId  = window.currentGlobalCompanyId || document.getElementById('pi-company').value;
  const yr    = parseInt(document.getElementById('pi-year').value);
  const mo    = parseInt(document.getElementById('pi-month').value);
  if(!empId || !yr || !mo) return _w('toast')('직원·연월을 확인하세요.', 'error');
  if(!piContract) return _w('toast')('활성 계약서가 없습니다.', 'error');

  // 수습 만료일
  const probEnd = _calcProbationEndDate(piContract);
  if(!probEnd) return _w('toast')('수습 만료일을 계산할 수 없습니다.', 'error');

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
    return _w('toast')('근로일수를 입력하세요.', 'error');
  }

  // ── 통상임금 포함여부 미선택 차단 ──
  {
    const _ptItems2 = [
      { field:'transport',    label:'차량교통비' },
      { field:'meal',         label:'식대' },
      { field:'childcare',    label:'보육수당' },
      { field:'research',     label:'연구활동비' },
      { field:'communication',label:'통신비' },
      { field:'fitness',       label:'체력증진비' },
      { field:'self_dev',      label:'자기계발비' },
      { field:'book',          label:'도서지원비' },
      { field:'overseas',      label:'해외근무수당' },
    ];
    const _unset2 = _ptItems2.filter(x => gv(`pi-${x.field}`) > 0 && _getPIPayTypeVal(x.field) === '');
    if(_unset2.length > 0){
      const _names2 = _unset2.map(x => x.label).join(', ');
      _w('toast')(`통상임금 포함여부를 선택해 주세요: ${_names2}`, 'error');
      const _firstSel2 = document.getElementById(`pi-${_piFieldToHtmlId(_unset2[0].field)}-pay-type-select`);
      if(_firstSel2) _firstSel2.focus();
      return;
    }
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
    health_insurance_adjust_retro: 0,
    health_insurance_adjust_yearend: 0,
    health_insurance_adjust_yearend_memo: '',
    ltcare_adjust_yearend: 0,
    ltcare_adjust_yearend_memo: '',
    advance_deduction: 0,
    advance_deduction_memo: '',
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
    weekly_holiday_pay: round0(gv('pi-weekly-hol') * ratioProb), // 자동계산 값 비율 분할
    position_allowance: round0((gv('pi-position')) * ratioProb),
    remote_area_allowance: round0((gv('pi-remote-area') || 0) * ratioProb),
    site_allowance:     round0((gv('pi-site') || 0) * ratioProb),
    skill_allowance:    round0((gv('pi-skill') || 0) * ratioProb),
    license_allowance:  round0((gv('pi-license') || 0) * ratioProb),
    ..._getPITransportFields(round0(gv('pi-transport') * ratioProb)),
    transport_type:    _piTransportType,
    transport_pay_type:_getPIPayTypeVal('transport'),
    meal_allowance:    round0((gv('pi-meal')) * ratioProb),
    meal_pay_type:     _getPIPayTypeVal('meal'),
    childcare_allowance: gv('pi-childcare') || 0,  // 보육수당: 비율 적용 안 함, 입력값 그대로
    childcare_pay_type:     _getPIPayTypeVal('childcare'),
    research_allowance:  round0((gv('pi-research') || 0) * ratioProb),
    research_pay_type:      _getPIPayTypeVal('research'),
    communication_pay_type: _getPIPayTypeVal('communication'),
    fitness_allowance:   round0((gv('pi-fitness')  || 0) * ratioProb),
    fitness_pay_type:    _getPIPayTypeVal('fitness'),
    self_dev_allowance:  round0((gv('pi-self-dev') || 0) * ratioProb),
    self_dev_pay_type:   _getPIPayTypeVal('self_dev'),
    book_allowance:      round0((gv('pi-book')     || 0) * ratioProb),
    book_pay_type:       _getPIPayTypeVal('book'),
    overseas_allowance:  round0((gv('pi-overseas') || 0) * ratioProb),
    overseas_pay_type:   _getPIPayTypeVal('overseas'),
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
    _w('toast')('채용확정 계약서 자동 생성 중...', 'info');
    const confirmedContract = await _autoCreateConfirmedContract(probEnd);
    const confirmedType = piContract.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION ? CONTRACT_TYPE.REGULAR : CONTRACT_TYPE.FIXED;

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
      weekly_holiday_pay: round0(gv('pi-weekly-hol') * ratioPost), // 자동계산 값 비율 분할
      position_allowance: round0((confirmedContract.position_allowance || gv('pi-position')) * ratioPost),
      remote_area_allowance: round0((confirmedContract.remote_area_allowance || 0) * ratioPost),
      site_allowance:     round0((confirmedContract.site_allowance || 0) * ratioPost),
      skill_allowance:    round0((confirmedContract.skill_allowance || 0) * ratioPost),
      license_allowance:  round0((confirmedContract.license_allowance || 0) * ratioPost),
      ...(()=>{ const tt2 = confirmedContract.transport_type || _piTransportType;
                 const ta2 = tt2==='transportation'?(confirmedContract.transportation_allowance||gv('pi-transport'))
                           : (confirmedContract.self_driving_allowance||gv('pi-transport'));
                 return _getPITransportFields(round0(ta2 * ratioPost)); })(),
      transport_type:    confirmedContract.transport_type || _piTransportType,
      transport_pay_type:confirmedContract.transport_pay_type || _getPIPayTypeVal('transport'),
      meal_allowance:    round0((confirmedContract.meal_allowance || gv('pi-meal')) * ratioPost),
      meal_pay_type:     confirmedContract.meal_pay_type || 'fixed',
      childcare_allowance: gv('pi-childcare') || 0,  // 보육수당: 비율 적용 안 함, 입력값 그대로
      childcare_pay_type:     _getPIPayTypeVal('childcare'),
      research_allowance:  round0((confirmedContract.research_allowance || 0) * ratioPost),
      research_pay_type:      confirmedContract.research_pay_type      || _getPIPayTypeVal('research'),
      communication_pay_type: confirmedContract.communication_pay_type || _getPIPayTypeVal('communication'),
      fitness_allowance:   round0((confirmedContract.fitness_allowance  || 0) * ratioPost),
      fitness_pay_type:    confirmedContract.fitness_pay_type  || _getPIPayTypeVal('fitness'),
      self_dev_allowance:  round0((confirmedContract.self_dev_allowance || 0) * ratioPost),
      self_dev_pay_type:   confirmedContract.self_dev_pay_type || _getPIPayTypeVal('self_dev'),
      book_allowance:      round0((confirmedContract.book_allowance     || 0) * ratioPost),
      book_pay_type:       confirmedContract.book_pay_type     || _getPIPayTypeVal('book'),
      overseas_allowance:  round0((confirmedContract.overseas_allowance || 0) * ratioPost),
      overseas_pay_type:   confirmedContract.overseas_pay_type || _getPIPayTypeVal('overseas'),
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
    const dupList = getPayrolls().filter(p => p.employee_id === empId && p.pay_year === yr && p.pay_month === mo);
    if(dupList.length > 0){
      const empName = (getEmployees().find(e => e.id === empId) || {}).name || '';
      if(!confirm(`${yr}년 ${mo}월 기존 급여 ${dupList.length}건이 있습니다.\n삭제 후 수습/채용확정 2건으로 교체하시겠습니까?\n(${empName})`)) {
        if(saveBtn){ saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-cut"></i> 수습 / 채용확정 분리 저장 (2건)'; }
        return;
      }
      for(const dup of dupList){
        await _w('api')(`../tables/payrolls/${dup.id}`, { method: 'DELETE' });
      }
    }

    // ── 4단계: 두 건 POST ──
    _w('toast')('수습 기간 급여 저장 중...', 'info');
    await _w('api')('../tables/payrolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyProb)
    });
    _w('toast')('채용확정 기간 급여 저장 중...', 'info');
    await _w('api')('../tables/payrolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPost)
    });

    // ── 5단계: 메모리 갱신 및 UI 반영 ──
    await _w('loadPayrolls')();
    _w('renderPayrolls')();
    _w('renderDashboard')();

    const emp = getEmployees().find(e => e.id === empId) || {};
    _w('toast')(`✔ ${yr}년 ${mo}월 급여 분리 저장 완료!\n수습 기간(${wdProb}일) + 채용확정 기간(${wdPost}일)\n고용형태: ${_w('contractTypeLabel')(confirmedType)}(으)로 변경됨`, 'success');

    // piContract 갱신 (새로 생성된 채용확정 계약으로 교체)
    window.piContract = getContracts().find(c => c.id === confirmedContract.id) || confirmedContract;

    // 케이스② 배너 숨김 (처리 완료)
    const banner = document.getElementById('pi-prob-overrun-banner');
    if(banner) banner.style.display = 'none';
    _setPIInputLocked(false);

    // 임금대장 완성 여부 체크
    await _checkWageLedgerComplete(coId, yr, mo);

  } catch(e){
    console.error('[savePISplit]', e);
    _w('toast')('분리 저장 중 오류가 발생했습니다: ' + e.message, 'error');
  } finally {
    if(saveBtn){
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-cut"></i> 수습 / 채용확정 분리 저장 (2건)';
    }
  }
}

// ==============================================================================
// [연동 헬퍼] Payroll → 관리대장(annual_leave_ledger) annual_leave_used 동기화
// ==============================================================================

/**
 * 급여 저장 후, 해당 직원·연도에 관리대장(annual_leave_ledger) 레코드가 있으면
 * 해당 월(month)의 month_data.days를 annual_leave_used 값으로 업데이트하고
 * total_used / remain_days도 함께 재계산하여 PUT한다.
 *
 * 관리대장이 없는 경우는 자동 생성하지 않는다 (명시적 저장 필요).
 *
 * @param {string} empId         - 직원 ID
 * @param {number} year          - 급여 연도 (pay_year)
 * @param {number} month         - 급여 월  (pay_month)
 * @param {number} annualUsedVal - 저장된 annual_leave_used 값
 */
export async function _syncPayrollToLedger(empId, year, month, annualUsedVal){
  try {
    // 해당 직원·연도 관리대장 찾기
    const ledger = (window.allLeaveLedgers || []).find(r =>
      r.employee_id === empId && Number(r.year) === Number(year)
    );
    if(!ledger) return; // 관리대장 없으면 skip

    // 기존 month_data 파싱
    let monthData = [];
    try { monthData = JSON.parse(ledger.month_data || '[]'); } catch(e){ monthData = []; }

    // 해당 월 찾기/갱신
    const mIdx = monthData.findIndex(d => Number(d.month) === Number(month));
    const newDays = parseFloat(annualUsedVal) || 0;

    if(mIdx > -1){
      const oldDays = parseFloat(monthData[mIdx].days) || 0;
      if(oldDays === newDays) return; // 변경 없으면 skip
      monthData[mIdx] = { ...monthData[mIdx], days: newDays };
    } else {
      if(newDays === 0) return; // 0이고 레코드 없으면 skip
      monthData.push({ month: Number(month), dates: '', days: newDays, note: '' });
    }

    // total_used 재계산
    const totalUsed = monthData.reduce((s, d) => s + (parseFloat(d.days) || 0), 0);

    // remain_days 재계산
    const carryoverDays = parseFloat(ledger.carryover_days) || 0;
    const totalDays     = parseFloat(ledger.total_days)     || 0;
    const remainDays    = Math.max(0, carryoverDays + totalDays - totalUsed);

    // PATCH
    const patchBody = {
      month_data  : JSON.stringify(monthData),
      total_used  : totalUsed,
      remain_days : remainDays,
    };

    const patchRes = await fetch(`../tables/annual_leave_ledger/${ledger.id}`, {
      method : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(patchBody),
    });

    if(!patchRes.ok){
      console.warn('[PayrollSync] 관리대장 PATCH 실패:', patchRes.status);
      return;
    }

    // window.allLeaveLedgers 캐시 즉시 갱신
    const idx = window.allLeaveLedgers.findIndex(r => r.id === ledger.id);
    if(idx > -1){
      window.allLeaveLedgers[idx] = {
        ...allLeaveLedgers[idx],
        ...patchBody,
      };
    }

    // 연차관리 화면이 현재 열려 있으면 테이블 재렌더링
    if(typeof renderAlTable === 'function'){
      renderAlTable();
    }

  } catch(e) {
    console.warn('[PayrollSync] 관리대장 연동 중 오류 (급여 저장은 완료):', e);
  }
}


﻿// ============================================================================
// 급여 입력 페이지 — 전직원 임금대장 일괄 업로드 모달
// ============================================================================
export function openPIUploadModal(){
  const coId = window.currentGlobalCompanyId;
  if(!coId){ _w('toast')('고객사를 먼저 선택하세요.','warning'); return; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);

  const co = getCompanies().find(c => c.id === coId);
  const coName = co ? co.company_name : '';

  // 부제목 업데이트
  const subEl = document.getElementById('pi-upload-modal-sub');
  if(subEl) subEl.textContent = `${coName}${yr && mo ? `ㆍ${yr}년 ${mo}월` : ''}`;

  // 드롭존·라벨 초기화
  const labelEl = document.getElementById('pi-upload-file-label');
  if(labelEl) labelEl.textContent = '';
  const progressEl = document.getElementById('pi-upload-progress');
  if(progressEl) progressEl.style.display = 'none';

  const modal = document.getElementById('pi-upload-modal');
  if(modal){ modal.style.display = 'flex'; }
}

export function closePIUploadModal(){
  const modal = document.getElementById('pi-upload-modal');
  if(modal) modal.style.display = 'none';
  // 파일 input 초기화
  const fileInput = document.getElementById('pi-upload-file-input');
  if(fileInput) fileInput.value = '';
}

/**
 * 전직원 임금대장 일괄 업로드 핸들러
 * - 기존 handleExcelUpload() + validateAndParseExcel() 로직을 그대로 재사용
 */
export function handlePIBulkUpload(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;

  // 파일명 표시
  const labelEl = document.getElementById('pi-upload-file-label');
  if(labelEl) labelEl.textContent = '📎 ' + file.name;

  // 진행 표시
  const progressEl = document.getElementById('pi-upload-progress');
  if(progressEl) progressEl.style.display = 'block';

  // 파일 input 초기화 (같은 파일 재업로드 허용)
  if(event.target && event.target.value !== undefined) event.target.value = '';

  // upload-file-name(기존 UI 라벨)도 동기화 (showUploadReport 내 참조 방지)
  const legacyLabel = document.getElementById('upload-file-name');
  if(legacyLabel) legacyLabel.textContent = '📎 ' + file.name;

  const reader = new FileReader();
  reader.onload = e => {
    if(progressEl) progressEl.style.display = 'none';
    try{
      const wb = XLSX.read(e.target.result, { type:'array', cellStyles:true });
      closePIUploadModal();
      validateAndParseExcel(wb, file.name);
    } catch(err){
      if(progressEl) progressEl.style.display = 'none';
      showUploadReport(false, [`파일을 읽는 중 오류가 발생했습니다: ${err.message}`], [], [], [], []);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ────────────────────────────────────────────────────────────────────────────
// 지급대상자 목록 관련 함수
// ────────────────────────────────────────────────────────────────────────────

/**
 * 급여지급 년월 선택 카드(pi-period-section)의 가시성 동기화
 * - formVisible=true  : 폼(급여 입력/수정 중) → 년월 카드 숨김
 * - formVisible=false : 목록/초기 상태  → 년월 카드 표시
 */
export function _syncPIPeriodSectionVisibility(formVisible){
  const sec = document.getElementById('pi-period-section');
  if(!sec) return;
  sec.style.display = formVisible ? 'none' : '';
}

/**
 * '지급대상자 목록보기' 버튼 클릭 핸들러
 * - 선택된 년/월에 유효한 근로계약이 있는 해당 고객사 근로자 목록을 테이블로 표시
 */
window._buildPIBody = _buildPIBody;
window.savePIDraft = savePIDraft;
window._checkAndShowPIDraftBanner = _checkAndShowPIDraftBanner;
window.loadPIDraft = loadPIDraft;
window.discardPIDraft = discardPIDraft;
window.savePI = savePI;
window._autoCreateConfirmedContract = _autoCreateConfirmedContract;
window.savePISplit = savePISplit;
window._syncPayrollToLedger = _syncPayrollToLedger;
window.openPIUploadModal = openPIUploadModal;
window.closePIUploadModal = closePIUploadModal;
window.handlePIBulkUpload = handlePIBulkUpload;
window._syncPIPeriodSectionVisibility = _syncPIPeriodSectionVisibility;