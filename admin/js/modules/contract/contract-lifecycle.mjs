/**
 * contract/contract-lifecycle-full.mjs — Phase 6: 완전 변환
 * Node.js 자동변환 (convert-core.cjs)
 */
import { getCompanies, getEmployees, getPayrolls, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS, COMPANY_STATUS, EMP_STATUS, CONTRACT_TYPE_LEGACY_MAP, DISPATCH_METHOD, DISPATCH_STATUS } from '../constants.mjs';

const _w = (name) => window[name];

﻿/** 인쇄 전용 CSS */

export function _resetStatusBanner(){
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
export function editPendingContract(){
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
  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(c?.status===CONTRACT_STATUS.TERMINATE_PENDING){
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

  _w('toast')('예정 계약을 수정합니다. 변경 후 수정완료를 눌러 저장하세요.');
}

// ─── 예정 계약 수정 취소 ───
export function cancelPendingEdit(){
  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(c) _w('viewContract')(c.id);  // 조회 모드로 재진입 (원본 데이터로 복원)
}

// ─── 예정 계약 수정완료 저장 ───
export async function savePendingContractEdit(){
  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(!c) return _w('toast')('계약 정보를 찾을 수 없습니다.','error');

  // ── 최저임금 위반 차단 (예정 계약 수정 경로) ──
  const _mwWarnRowPend  = document.getElementById('ct-prob-minwage-warning-row');
  const _mwWarnRowPend2 = document.getElementById('ct-general-minwage-warning-row');
  if((_mwWarnRowPend  && _mwWarnRowPend.style.display  !== 'none') ||
     (_mwWarnRowPend2 && _mwWarnRowPend2.style.display !== 'none')){
    _w('openModal')('ct-minwage-warn-modal');
    return;
  }

  // 현재 폼에서 수정된 값을 수집 (saveContract 로직에서 필요한 필드만)
  const newStart = document.getElementById('ct-start')?.value || c.contract_start;
  const newEnd   = document.getElementById('ct-end')?.value   || '';
  const today3   = new Date().toISOString().slice(0,10);

  // 시작일 유효성
  if(!newStart) return _w('toast')('계약 시작일을 입력해 주세요.','error');

  // ── 상태 재결정 ──
  let newStatus = c.status;
  const isPreTermEdit = (c.status===CONTRACT_STATUS.TERMINATE_PENDING);

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
  const scheduleJSON = (typeof getScheduleJSON === 'function') ? _w('getScheduleJSON')() : [];
  const workDaysCount = parseInt(document.getElementById('ct-days')?.value)||0;
  const avgDayHours   = parseFloat(document.getElementById('ct-hours')?.value)||0;

  // 급여 관련
  function getAmtVal(id){ const el=document.getElementById(id); if(!el)return 0; const v=el.value.replace(/[^\d]/g,''); return parseInt(v)||0; }
  const _pendCtType   = c.contract_type || '정규직';
  const _pendIsReg    = _pendCtType===CONTRACT_TYPE.REGULAR || _pendCtType===CONTRACT_TYPE.REGULAR_PROBATION;
  const _pendIsFixed  = _pendCtType===CONTRACT_TYPE.FIXED || _pendCtType===CONTRACT_TYPE.FIXED_PROBATION;
  const _pendIsDaily  = _pendCtType===CONTRACT_TYPE.DAILY;
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
      if(c.status===CONTRACT_STATUS.TERMINATE_PENDING){
        return document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
      }
      return c.terminate_date || '';
    })(),
  };

  try {
    await _w('api')(`../tables/contracts/${c.id}`,{
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
      const repChkEl = document.getElementById('ct-edit-em-is-rep');
      if(repChkEl) empPatch.is_representative = repChkEl.checked ? 1 : 0;
      if(Object.keys(empPatch).length){
        await _w('api')(`../tables/employees/${editEmpId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(empPatch)});
      }
    }

    // ── 고객사 인앱 알림 발송 (예정 계약 수정) ──
    {
      const _pendEmp = getEmployees().find(x => x.id === c.employee_id) || {};
      const _pendCo  = getCompanies().find(x => x.id === c.company_id)  || {};
      const _coRep   = _w('getCompanyRepGreeting')(_pendCo);
      const _fmtD    = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
      if(isPreTermEdit && newStatus === '해지예정'){
        // 해지 예약
        const _termDate = document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
        await _w('_sendCompanyNotice')({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_termination_scheduled',
          title      : `[해지 예약] ${_pendEmp.name||''} — 계약 해지가 예약되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 해지가 예약 처리되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${_w('contractTypeLabel')(c.contract_type)||c.contract_type||''}
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
        await _w('_sendCompanyNotice')({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_terminated',
          title      : `[계약 해지] ${_pendEmp.name||''} — 근로계약이 해지되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 해지 처리되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${_w('contractTypeLabel')(c.contract_type)||c.contract_type||''}
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
        await _w('_sendCompanyNotice')({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_updated',
          title      : `[계약 수정] ${_pendEmp.name||''} — 근로계약이 수정되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약 내용이 수정되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${_w('contractTypeLabel')(c.contract_type)||c.contract_type||''}
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
    _w('closeModal')('contract-modal');
    await _w('loadContracts')(); await _w('loadEmployees')(); _w('renderContracts')(); _w('renderDashboard')();
    const statusLabelMap = {
      [CONTRACT_STATUS.ACTIVE]:            '계약유효 (활성)',
      [CONTRACT_STATUS.TERMINATE_PENDING]: '해지예정 유지',
      [CONTRACT_STATUS.TERMINATED]:        '해지 처리됨',
      [CONTRACT_STATUS.EXPIRED]:           '만료',
      [CONTRACT_STATUS.PENDING]:           '계약예정',
      [CONTRACT_STATUS.RENEWAL_PENDING]:   '갱신예정',
    };
    const statusLabel = statusLabelMap[newStatus] || newStatus;
    _w('toast')(`계약이 수정됐습니다. 상태: ${statusLabel}`);
  } catch(e){
    _w('toast')('수정 저장 중 오류가 발생했습니다.','error');
    console.error(e);
  }
}

// ─── 배너 파기/해지취소 버튼 라우터 ───
export async function doContractVoidOrCancel(){
  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(!c) return;
  if(c.status===CONTRACT_STATUS.TERMINATE_PENDING){
    // 해지예정 → 해지 취소 (활성으로 복귀)
    await cancelPreTerminate();
  } else {
    // 계약예정 / 갱신예정 → 레코드 삭제 (파기 기록 없이 제거)
    await cancelPendingContract();
  }
}

// ─── 해지예정 취소 (활성으로 복귀) ───
export async function cancelPreTerminate(){
  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(!c) return;

  const ct       = c.contract_type || '';
  const isFixed  = (ct===CONTRACT_TYPE.FIXED||ct===CONTRACT_TYPE.FIXED_PROBATION||ct===CONTRACT_TYPE.DAILY);
  const emp      = getEmployees().find(e=>e.id===c.employee_id)||{};
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
  await _w('api')(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status: CONTRACT_STATUS.ACTIVE, terminate_date:''})});

  // 2) 직원 resign_date 초기화 (status는 재직 상태 유지 — 이미 퇴직으로 바뀐 경우는 재직으로 복귀)
  if(emp.id){
    const empPatch = emp.status===EMP_STATUS.RESIGNED
      ? {status: EMP_STATUS.ACTIVE, resign_date:''}
      : {resign_date:''};
    await _w('api')(`../tables/employees/${emp.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(empPatch)});
  }

  // ── 고객사 인앱 알림 발송 (해지 예정 취소) ──
  {
    const _cptCo  = getCompanies().find(x => x.id === c.company_id) || {};
    const _coRep  = _w('getCompanyRepGreeting')(_cptCo);
    const _fmtD   = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    await _w('_sendCompanyNotice')({
      companyId  : c.company_id, companyName: _cptCo.company_name || '',
      noticeType : 'contract_termination_cancelled',
      title      : `[해지 예정 취소] ${empName} — 계약 해지 예정이 취소되었습니다`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 해지 예정이 취소되어 기존 계약이 정상 유효 상태로 복귀되었습니다.

■ 근로자: ${empName}
■ 고용형태: ${_w('contractTypeLabel')(c.contract_type)||c.contract_type||''}
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

  _w('closeModal')('contract-modal');
  await Promise.all([_w('loadContracts')(), _w('loadEmployees')()]);
  _w('renderContracts')(); _w('renderDashboard')();
  _w('toast')(`${typeLabel} 취소 완료 — 계약이 활성 상태로 복귀됐습니다.`, 'success');
}

// ─── 계약예정·갱신예정 취소 플로우 (레코드 삭제) ───
export async function cancelPendingContract(){
  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(!c) return;

  // 시작일 당일부터 취소 불가
  const _todayCancel = new Date().toISOString().slice(0,10);
  if(c.contract_start && _todayCancel >= c.contract_start){
    _w('toast')(`계약 시작일(${c.contract_start}) 이후에는 예정 계약을 취소할 수 없습니다.`, 'error');
    return;
  }

  const isRenew     = (c.status===CONTRACT_STATUS.RENEWAL_PENDING)
                   || ((c.status===CONTRACT_STATUS.ACTIVE||c.status==='유효'||c.status===EMP_STATUS.ACTIVE) && (c.contract_start||'') > new Date().toISOString().slice(0,10));
  const statusLabel = isRenew ? '갱신예정' : '계약예정';
  const emp         = getEmployees().find(e=>e.id===c.employee_id)||{};
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
    const prevC  = getContracts().find(x=>x.id===prevId);
    if(prevC && (prevC.status===CONTRACT_STATUS.EXPIRED || prevC.status===CONTRACT_STATUS.TERMINATED)){
      // 이전 계약을 활성 상태로 복귀
      await _w('api')(`../tables/contracts/${prevId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status: CONTRACT_STATUS.ACTIVE, contract_end: prevC.contract_end||''})});
    }
  }

  // 해당 계약 레코드 삭제 + 연결 직원도 다른 계약 없으면 삭제 시도
  let _empIdToCleanup = null;
  if(c.employee_id){
    const otherContracts = getContracts().filter(x => x.id !== c.id && x.employee_id === c.employee_id);
    if(otherContracts.length === 0) _empIdToCleanup = c.employee_id;
  }
  await _w('api')(`../tables/contracts/${c.id}`,{method:'DELETE'});
  if(_empIdToCleanup){
    fetch(`../tables/employees/${_empIdToCleanup}`, { method: 'DELETE' });
  }

  _w('closeModal')('contract-modal');
  await Promise.all([_w('loadContracts')(), _w('loadEmployees')()]);
  _w('renderContracts')(); _w('renderDashboard')();
  _w('toast')(`${statusLabel} 취소 완료 — 계약이 삭제됐습니다.`, 'success');
}

// ─── 파기 플로우 (수정재발행 등 명시적 파기 전용 — 배너 경로에서는 더 이상 사용 안 함) ───
export async function doContractVoid(){
  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(!c) return;
  const statusLabel = c.status===CONTRACT_STATUS.RENEWAL_PENDING ? '갱신예정' : '계약예정';

  if(!confirm(`정말 이 계약을 파기하시겠습니까?\n\n[${statusLabel}] 상태의 계약을 파기합니다.\n파기된 계약은 복구할 수 없으며, 계약이 성립되지 않은 것으로 처리됩니다.`)) return;

  await _w('api')(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status: CONTRACT_STATUS.VOIDED})});

  // ── 고객사 인앱 알림 발송 (계약 파기) ──
  {
    const _voidEmp = getEmployees().find(x => x.id === c.employee_id) || {};
    const _voidCo  = getCompanies().find(x => x.id === c.company_id)  || {};
    const _coRep   = _w('getCompanyRepGreeting')(_voidCo);
    const _fmtD    = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    await _w('_sendCompanyNotice')({
      companyId  : c.company_id, companyName: _voidCo.company_name || '',
      noticeType : 'contract_voided',
      title      : `[계약 파기] ${_voidEmp.name||''} — 근로계약이 파기되었습니다`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 파기 처리되었습니다.

■ 근로자: ${_voidEmp.name||''}
■ 고용형태: ${_w('contractTypeLabel')(c.contract_type)||c.contract_type||''}
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

  _w('closeModal')('contract-modal');
  await _w('loadContracts')(); _w('renderContracts')(); _w('renderDashboard')();
  _w('toast')('계약이 파기 처리됐습니다.');
}

// ─── 갱신 플로우 ───
/**
 * 갱신 시 현재 폼에 입력된 값을 수집하여 신규 계약에 반영
 * 기존 계약을 베이스로, 사용자가 수정한 필드만 덮어쓴다.
 */
export function _collectRenewFormFields(){
  const fields = {};

  // 계약 유형
  const typeEl = document.getElementById('ct-type');
  if(typeEl) fields.contract_type = CONTRACT_TYPE_LEGACY_MAP[typeEl.value] || typeEl.value;

  // 계약 시작일·종료일 (폼에 입력된 값, 정규직은 종료일 강제 공백)
  const ctNorm = fields.contract_type;
  const isRegular = (ctNorm === CONTRACT_TYPE.REGULAR || ctNorm === CONTRACT_TYPE.REGULAR_PROBATION);
  const startEl = document.getElementById('ct-start');
  if(startEl) fields.contract_start = startEl.value;
  const endEl = document.getElementById('ct-end');
  if(endEl) fields.contract_end = isRegular ? '' : endEl.value;

  // 근무시간
  const hoursEl = document.getElementById('ct-hours');
  if(hoursEl) fields.work_hours_per_day = parseFloat(hoursEl.value) || 0;
  const daysEl = document.getElementById('ct-days');
  if(daysEl) fields.work_days_per_week = parseFloat(daysEl.value) || 5;

  // 기본급·일급·연봉
  fields.base_salary   = _w('getAmountVal')('ct-base');
  fields.annual_salary = _w('getAmountVal')('ct-annual-sal');
  fields.daily_wage    = _w('getAmountVal')('ct-daily-wage');

  // 월약정급여: 정규직이면 연봉/12, 그 외는 폼 계산값에서 읽기
  const ctNorm2 = fields.contract_type;
  const isRegGroup2 = (ctNorm2 === CONTRACT_TYPE.REGULAR || ctNorm2 === CONTRACT_TYPE.REGULAR_PROBATION);
  if (isRegGroup2 && fields.annual_salary > 0) {
    fields.monthly_salary_agreed = Math.round(fields.annual_salary / 12);
  } else {
    // 계약직·일용직은 ct-monthly-computed의 텍스트 값에서 숫자 추출
    const monthlyEl = document.getElementById('ct-monthly-computed');
    if (monthlyEl) {
      const txt = monthlyEl.textContent || '';
      const num = parseInt(txt.replace(/[^0-9]/g, '')) || 0;
      if (num > 0) fields.monthly_salary_agreed = num;
    }
  }

  // 수당
  fields.position_allowance    = _w('getAmountVal')('ct-position') || 0;
  fields.transportation_allowance = _w('getAmountVal')('ct-car') || 0;
  fields.remote_area_allowance = _w('getAmountVal')('ct-remote-area') || 0;
  fields.meal_allowance        = _w('getAmountVal')('ct-meal') || 0;
  fields.research_allowance    = _w('getAmountVal')('ct-research') || 0;
  fields.site_allowance        = _w('getAmountVal')('ct-site') || 0;
  fields.skill_allowance       = _w('getAmountVal')('ct-skill') || 0;
  fields.license_allowance     = _w('getAmountVal')('ct-license') || 0;
  fields.communication_allowance = _w('getAmountVal')('ct-communication') || 0;
  fields.fitness_allowance     = _w('getAmountVal')('ct-fitness') || 0;
  fields.self_dev_allowance    = _w('getAmountVal')('ct-self-dev') || 0;
  fields.book_allowance        = _w('getAmountVal')('ct-book') || 0;
  fields.overseas_allowance    = _w('getAmountVal')('ct-overseas') || 0;
  fields.regular_bonus         = _w('getAmountVal')('ct-regular-bonus') || 0;
  fields.childcare_allowance   = _w('getAmountVal')('ct-childcare') || 0;

  // 수당 지급유형
  const payTypeMap = {
    car:'transportation_pay_type', meal:'meal_pay_type', research:'research_pay_type',
    communication:'communication_pay_type', fitness:'fitness_pay_type',
    self_dev:'self_dev_pay_type', book:'book_pay_type', overseas:'overseas_pay_type'
  };
  Object.keys(payTypeMap).forEach(k => {
    fields[payTypeMap[k]] = _getCTPayTypeVal(k);
  });

  // 연차
  const annualEl = document.getElementById('ct-annual');
  if(annualEl) fields.annual_leave_days = parseFloat(annualEl.value) || 15;

  // 급여 산정기간·지급일
  const ppEl = document.getElementById('ct-pay-period');
  if(ppEl) fields.pay_period = ppEl.value.trim();
  const ppMonEl = document.getElementById('ct-pay-period-month-hidden');
  if(ppMonEl) fields.pay_period_month = ppMonEl.value || null;
  const ppDayEl = document.getElementById('ct-pay-period-day-hidden');
  if(ppDayEl) fields.pay_period_day = parseInt(ppDayEl.value) || null;
  const payDayEl = document.getElementById('ct-pay-day');
  if(payDayEl) fields.pay_day = parseInt(payDayEl.value) || null;

  // 근무시간표
  try {
    const sch = _w('getScheduleJSON')();
    if(Array.isArray(sch) && sch.some(d=>d.active)) fields.schedule_json = JSON.stringify(sch);
  } catch(e){}

  // 수습
  const probMonEl = document.getElementById('ct-probation-months');
  if(probMonEl) fields.probation_months = parseInt(probMonEl.value) || 0;
  const probPctEl = document.getElementById('ct-probation-pct');
  if(probPctEl) fields.probation_pct = parseFloat(probPctEl.value) || 0;
  const probAmtEl = document.getElementById('ct-probation-amt');
  if(probAmtEl) fields.probation_amt = parseFloat(probAmtEl.value) || 0;
  const probBasisEl = document.querySelector('input[name="ct-probation-basis"]:checked');
  if(probBasisEl) fields.probation_basis = probBasisEl.value;

  return fields;
}

/**
 * 갱신 신규 계약 시작일 유효성 검사
 * @param {string} oldEnd - 기존 계약 종료일 (YYYY-MM-DD)
 */
export function _validateRenewNewStart(oldEnd){
  const newStartEl = document.getElementById('ct-renew-new-start');
  const newStartErr = document.getElementById('ct-renew-new-start-err');
  const ns = newStartEl?.value;
  if(!ns) {
    if(newStartErr){ newStartErr.textContent = '신규 계약 시작일을 입력하세요.'; newStartErr.style.display = 'block'; }
    return false;
  }
  if(ns <= oldEnd){
    if(newStartErr){ newStartErr.textContent = '신규 계약 시작일은 기존 계약 종료일보다 이후여야 합니다.'; newStartErr.style.display = 'block'; }
    newStartEl.style.borderColor = '#dc2626';
    return false;
  }
  if(newStartErr) newStartErr.style.display = 'none';
  newStartEl.style.borderColor = '#93c5fd';
  return true;
}

export function doContractRenew(){
  // 종료 패널 숨김
  document.getElementById('ct-terminate-panel').style.display = 'none';
  const rp = document.getElementById('ct-renew-panel');
  if(!rp) return;
  rp.style.display = 'block';

  const oldEndEl = document.getElementById('ct-renew-old-end');
  const newStartEl = document.getElementById('ct-renew-new-start');
  const newStartErr = document.getElementById('ct-renew-new-start-err');

  // 기존 계약 종료일: 사용자가 직접 입력 (기본값 없음)
  oldEndEl.value = '';
  oldEndEl.disabled = false;
  // 신규 계약 시작일: 비활성 상태로 시작 (기존 종료일 입력 후 활성화)
  newStartEl.value = '';
  newStartEl.disabled = true;
  newStartEl.removeAttribute('min');
  if(newStartErr) newStartErr.style.display = 'none';

  // ── 기존 계약 종료일 변경 시 신규 시작일 활성화 + 유효성 검사 ──
  oldEndEl.onchange = function(){
    const oe = oldEndEl.value;
    if(oe){
      const minDate = new Date(oe);
      minDate.setDate(minDate.getDate() + 1);
      const minStr = minDate.toISOString().slice(0,10);
      newStartEl.min = minStr;
      newStartEl.disabled = false;
      if(newStartEl.value) _validateRenewNewStart(oe);
      else {
        newStartEl.value = minStr;
        if(newStartErr) newStartErr.style.display = 'none';
      }
    } else {
      newStartEl.disabled = true;
      newStartEl.value = '';
      newStartEl.removeAttribute('min');
      if(newStartErr) newStartErr.style.display = 'none';
    }
  };

  // ── 신규 계약 시작일 변경 시 유효성 검사 ──
  newStartEl.onchange = function(){
    const oe = oldEndEl.value;
    if(oe) _validateRenewNewStart(oe);
  };

  // ── 갱신 시 전체 폼 필드 편집 가능하게 해제 ──
  const modalEl = document.querySelector('#contract-modal .modal');
  if(modalEl){
    modalEl.classList.remove('ct-readonly');
    const bodyEl = modalEl.querySelector('.modal-body');
    if(bodyEl) bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
      if(el.closest('#ct-renew-panel')) return;
      el.disabled = false;
      el.tabIndex = 0;
      el.style.pointerEvents = '';
      el.style.background = '';
      el.style.color = '';
      el.style.cursor = '';
    });
    if(bodyEl){
      bodyEl.querySelectorAll('.pi-pay-type-btn').forEach(btn=>{
        btn.disabled = false; btn.style.cursor = ''; btn.style.pointerEvents = '';
      });
      bodyEl.querySelectorAll('.btn-brk-add').forEach(btn=>{
        btn.disabled = false; btn.style.cursor = ''; btn.style.pointerEvents = '';
      });
    }
  }

  // 액션 버튼 숨김 (갱신 중에는 다른 액션 불가)
  ['ct-btn-amend','ct-btn-amend2','ct-btn-renew','ct-btn-renew2',
   'ct-btn-terminate','ct-btn-terminate2','ct-btn-recontract','ct-btn-recontract2',
   'ct-btn-fixed-terminate','ct-btn-fixed-terminate2'].forEach(bid=>{
    const el = document.getElementById(bid); if(el) el.style.display='none';
  });

  // 하단 갱신완료·취소 버튼 표시
  const btnComplete2 = document.getElementById('ct-btn-renew-complete2');
  if(btnComplete2) btnComplete2.style.display = 'inline-flex';
  const btnCancel2 = document.getElementById('ct-btn-renew-cancel2');
  if(btnCancel2) btnCancel2.style.display = 'inline-flex';

  // amend 패널 숨김
  const amendPanel = document.getElementById('ct-amend-panel');
  if(amendPanel) amendPanel.style.display = 'none';

  // 첨부서류 섹션 숨김 (갱신 모드에서는 불필요)
  const filesSection = document.getElementById('ct-files-section');
  if(filesSection) filesSection.style.display = 'none';

  setTimeout(()=>rp.scrollIntoView({behavior:'smooth',block:'center'}),100);
}

/** 갱신 모드 취소: 계약 조회 모드로 복귀 */
export function cancelContractRenew(){
  const cid = window.editId.contract;
  if(!cid) return;
  _w('viewContract')(cid);
}
export async function confirmContractRenew(){
  const oldEndEl = document.getElementById('ct-renew-old-end');
  const newStartEl = document.getElementById('ct-renew-new-start');
  const oldEnd   = oldEndEl?.value;
  const newStart = newStartEl?.value;
  if(!oldEnd){
    oldEndEl?.focus();
    oldEndEl?.scrollIntoView({behavior:'smooth',block:'center'});
    return _w('toast')('기존 계약 종료일을 입력하세요.','error');
  }
  if(!newStart){
    newStartEl?.focus();
    newStartEl?.scrollIntoView({behavior:'smooth',block:'center'});
    return _w('toast')('신규 계약 시작일을 입력하세요.','error');
  }
  if(newStart <= oldEnd){
    newStartEl?.focus();
    newStartEl?.scrollIntoView({behavior:'smooth',block:'center'});
    return _w('toast')('신규 계약 시작일은 기존 계약 종료일보다 이후여야 합니다.','error');
  }

  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(!c) return _w('toast')('계약 정보를 찾을 수 없습니다.','error');

  const today = new Date().toISOString().slice(0,10);
  const origEnd = c.contract_end || '';

  // 종료일이 원래보다 앞당겨졌는지 확인 → 연장(만료)이 아닌 단축 경고
  if(origEnd && oldEnd < origEnd){
    if(!confirm(`기존 계약 종료일(${origEnd})보다 앞당겨진 날짜(${oldEnd})입니다.\n계약 종료일 단축은 [해지] 처리를 권장합니다.\n그래도 계속 진행하시겠습니까?`)) return;
  }

  // 1. 기존 계약: 종료일 확정 + 상태 '해지' (갱신으로 인한 계약 종료, 기록 5년 보존)
  await _w('api')(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contract_end: oldEnd, status: CONTRACT_STATUS.TERMINATED})});

  // 2. 신규 계약 생성 (현재 폼 입력값 + 기존 계약 병합)
  //    - 시작일이 오늘 이후면 '계약예정', 오늘이거나 이전이면 '활성'
  const newStatus = newStart > today ? CONTRACT_STATUS.PENDING : CONTRACT_STATUS.ACTIVE;
  const newId = 'cont'+Date.now();
  const _renewFields = _collectRenewFormFields();
  const newContract = Object.assign({}, c, _renewFields, {
    id: newId,
    contract_start: newStart,                              // 갱신 패널에서 지정한 시작일 우선
    contract_end:   _renewFields.contract_end !== undefined ? _renewFields.contract_end : '',  // 계약직은 폼 종료일, 정규직은 빈값
    status:         newStatus,
    is_draft:       false,
    terminate_date: '',
    note: document.getElementById('ct-note')?.value || c.note || '',
  });
  // API 시스템 필드 및 DB 미존재 컬럼 제거
  ['gs_project_id','gs_table_name','created_at','updated_at','deleted','terminate_date'].forEach(k=>delete newContract[k]);
  await _w('api')('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newContract)});

  // ── 고객사 인앱 알림 발송 (갱신/갱신예약) ──
  {
    const _renewEmp = getEmployees().find(x => x.id === c.employee_id) || {};
    const _renewCo  = getCompanies().find(x => x.id === c.company_id)  || {};
    const _coRep    = _w('getCompanyRepGreeting')(_renewCo);
    const _fmtD     = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    if(newStatus === '계약예정'){
      // 갱신 예약
      await _w('_sendCompanyNotice')({
        companyId  : c.company_id, companyName: _renewCo.company_name || '',
        noticeType : 'contract_renewal_scheduled',
        title      : `[갱신 예약] ${_renewEmp.name||''} — 계약 갱신이 예약되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 갱신이 예약되었습니다.

■ 근로자: ${_renewEmp.name||''}
■ 고용형태: ${_w('contractTypeLabel')(c.contract_type)||c.contract_type||''}
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
      await _w('_sendCompanyNotice')({
        companyId  : c.company_id, companyName: _renewCo.company_name || '',
        noticeType : 'contract_renewed',
        title      : `[계약 갱신] ${_renewEmp.name||''} — 계약이 갱신되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 갱신이 완료되었습니다.

■ 근로자: ${_renewEmp.name||''}
■ 고용형태: ${_w('contractTypeLabel')(c.contract_type)||c.contract_type||''}
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

  _w('closeModal')('contract-modal');
  await _w('loadContracts')(); await _w('loadEmployees')(); _w('renderContracts')(); _w('renderDashboard')();
  const label = newStatus === '계약예정' ? '계약예정 (시작일 미도래)' : '계약유효 (활성)';
  _w('toast')(`연장 처리 완료. 전 계약: 해지 / 새 계약: ${label}`);
}

// ─── 재계약 플로우 ───
export function doContractRecontract(){
  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(!c) return;
  // 기존 계약 데이터를 복사해서 편집 가능한 새 계약 모달 열기
  // 임시 플래그로 "재계약 모드" 표시
  _recontractSourceId = c.id;
  _w('closeModal')('contract-modal');
  // 잠시 후 새 계약 모달 오픈 (신규 모드 + 프리셋)
  setTimeout(()=>openRecontractModal(c), 50);
}
let _recontractSourceId = null;
export function openRecontractModal(srcContract){
  // 동일 회사 기준 신규 계약 모달 오픈 (신규 모드)
  openContractModal(null, srcContract.company_id);

  // 첨부서류 섹션 숨김 (재계약 입력 모드에서는 불필요)
  const filesSection = document.getElementById('ct-files-section');
  if(filesSection) filesSection.style.display = 'none';

  // 신규 모드에서 기존 계약 데이터로 필드 채우기
  const emp = getEmployees().find(e=>e.id===srcContract.employee_id)||{};

  // 직원 섹션 → 수정 직원 섹션으로 전환
  document.getElementById('ct-new-emp-section').style.display = 'none';
  document.getElementById('ct-edit-emp-info').style.display = 'block';
  // 계약 시작일·종료일·고용형태·계약상태는 수정 모드 섹션 내부에 있으므로 별도 제어 불필요

  // 직원 정보 채우기
  document.getElementById('ct-edit-emp-name').value = emp.name||'';
  // 재계약: 고용형태는 직원 인사정보(employment_category) 기준
  const rcCtType = (emp && emp.employment_category) || srcContract.contract_type || '정규직';
  const rcIsFixed = (rcCtType===CONTRACT_TYPE.FIXED||rcCtType===CONTRACT_TYPE.FIXED_PROBATION||rcCtType===CONTRACT_TYPE.DAILY);
  if(emp){
    document.getElementById('ct-edit-em-gender').value     = emp.gender||'남';
    (function(){ const _h=document.getElementById('ct-edit-em-gender-hint'); if(_h){ _h.textContent='주민번호 입력 시 자동 설정됩니다'; _h.style.color='#6b7280'; } })();
    document.getElementById('ct-edit-em-category').value = emp.employment_category||'';
    document.getElementById('ct-edit-em-job').value        = emp.job_description||'';
    document.getElementById('ct-edit-em-dept').value       = emp.department||'';
    document.getElementById('ct-edit-em-position').value   = emp.position||'';
    // 계약직/일용직: 입사일·퇴사예정일 행 숨김 (계약 시작일·종료일과 동일)
    // 정규직/정규직 수습: 무기한 계약이므로 퇴사예정일 행 숨김
    const rcIsRegular = (rcCtType===CONTRACT_TYPE.REGULAR||rcCtType===CONTRACT_TYPE.REGULAR_PROBATION);
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
  const isDailySrc    = ct===CONTRACT_TYPE.DAILY;
  const isRegSrc      = ct===CONTRACT_TYPE.REGULAR||ct===CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedSrc    = ct===CONTRACT_TYPE.FIXED||ct===CONTRACT_TYPE.FIXED_PROBATION;
  const isProbSrc     = ct===CONTRACT_TYPE.REGULAR_PROBATION||ct===CONTRACT_TYPE.FIXED_PROBATION;
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
  // 보육수당 복원
  setAmountVal('ct-childcare',   srcContract.childcare_allowance||0);
  { const _ccDep=document.getElementById('ct-childcare-dependents'); if(_ccDep) _ccDep.value=srcContract.childcare_dependents||1; }
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
export function doContractTerminate(){
  document.getElementById('ct-renew-panel').style.display = 'none';
  document.getElementById('ct-amend-panel').style.display = 'none';
  const tp = document.getElementById('ct-terminate-panel');
  tp.style.display = tp.style.display==='none' ? 'block' : 'none';
  if(tp.style.display==='block'){
    const c = getContracts().find(x=>x.id===window.editId.contract)||{};
    const dateEl = document.getElementById('ct-terminate-date');
    // 이미 해지예정일(terminate_date)이 설정된 경우 그 값으로, 없으면 오늘
    // contract_end(계약만료일)는 건드리지 않음
    dateEl.value = c.terminate_date || new Date().toISOString().slice(0,10);
    dateEl.disabled = false;

    // 액션 버튼 숨김 (퇴사 설정 중에는 다른 액션 불가)
    ['ct-btn-amend','ct-btn-amend2','ct-btn-renew','ct-btn-renew2',
     'ct-btn-terminate','ct-btn-terminate2','ct-btn-recontract','ct-btn-recontract2',
     'ct-btn-fixed-terminate','ct-btn-fixed-terminate2',
     'ct-btn-amend-complete2','ct-btn-amend-cancel2',
     'ct-btn-renew-complete2','ct-btn-renew-cancel2'].forEach(bid=>{
      const el = document.getElementById(bid); if(el) el.style.display='none';
    });

    setTimeout(()=>tp.scrollIntoView({behavior:'smooth',block:'center'}),100);
  }
}
/** 퇴사 설정 모드 취소: 계약 조회 모드로 복귀 */
export function cancelContractTerminate(){
  const cid = window.editId.contract;
  if(!cid) return;
  _w('viewContract')(cid);
}

export async function confirmContractTerminate(){
  // 정규직 전용: 퇴사예정일 입력 → 해지예정 또는 해지 처리
  // contract_end(원래 계약만료일)는 절대 변경하지 않음
  // terminate_date 필드에만 해지예정일 저장
  const termDate = document.getElementById('ct-terminate-date').value;
  if(!termDate) return _w('toast')('퇴사예정일을 선택하세요.','error');

  const c = getContracts().find(x=>x.id===window.editId.contract);
  if(!c) return _w('toast')('계약 정보를 찾을 수 없습니다.','error');
  const today = new Date().toISOString().slice(0,10);

  // 계약 만료일(contract_end)보다 이후 날짜는 입력 불가
  if(c.contract_end && termDate >= c.contract_end){
    return _w('toast')(`해지예정일은 계약 만료일(${c.contract_end}) 이전이어야 합니다.`, 'error');
  }

  // 오늘 이전 → 즉시 해지, 오늘 또는 이후 → 해지예정
  const newStatus = termDate < today ? CONTRACT_STATUS.TERMINATED : CONTRACT_STATUS.TERMINATE_PENDING;

  // contract_end 는 유지, terminate_date 에만 해지예정일 기록
  await _w('api')(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({terminate_date: termDate, status: newStatus})});

  // 퇴사일 → 직원 기록 업데이트
  const emp = getEmployees().find(e=>e.id===c.employee_id);
  if(emp){
    const empPatch = newStatus === CONTRACT_STATUS.TERMINATED
      ? {status: EMP_STATUS.RESIGNED, resign_date: termDate}
      : {resign_date: termDate};  // 예정만 기록, 재직 상태 유지
    await _w('api')(`../tables/employees/${emp.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(empPatch)});
  }

  _w('closeModal')('contract-modal');
  await _w('loadContracts')(); await _w('loadEmployees')(); _w('renderContracts')(); _w('renderDashboard')();
  const statusLabel = newStatus === CONTRACT_STATUS.TERMINATED ? '해지' : '해지예정';
  _w('toast')(`퇴사일(${termDate})이 설정됐습니다. 계약 상태: ${statusLabel}`);
}

export function editContract(id){openContractModal(id)}

/** 임시저장 근로계약서 이어 작성: edit 모드 + 삭제버튼 표시 */
export function continueDraftContract(id){
  const c = getContracts().find(x => x.id === id);
  if(!c || !c.is_draft) { editContract(id); return; }
  
  editContract(id);
  window._resumeDraftId = id;
  
  setTimeout(() => {
    document.getElementById('ct-title').textContent = '근로계약서 추가 (이어 작성)';
    const draftBtn = document.getElementById('ct-btn-draft');
    if(draftBtn) draftBtn.style.display = '';
    const delBtn = document.getElementById('ct-btn-delete-draft');
    if(delBtn) delBtn.style.display = '';
  }, 200);
}

/** 임시저장 계약서 모달에서 삭제 */
export async function deleteDraftContract(){
  const id = window._resumeDraftId || window.editId.contract;
  if(!id) return;
  const c = getContracts().find(x => x.id === id);
  if(!c?.is_draft) return;
  const emp = getEmployees().find(e => e.id === c.employee_id);
  const label = emp?.name || '(직원 미지정)';
  if(!confirm(`'${label}' 임시저장 계약서를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
  try {
    // 계약 삭제 + 연결 직원 정리
    let _empIdToCleanup = null;
    if(c.employee_id){
      const otherContracts = getContracts().filter(x => x.id !== id && x.employee_id === c.employee_id);
      if(otherContracts.length === 0) _empIdToCleanup = c.employee_id;
    }
    await _w('api')(`../tables/contracts/${id}`, { method: 'DELETE' });
    if(_empIdToCleanup){
      fetch(`../tables/employees/${_empIdToCleanup}`, { method: 'DELETE' }).finally(() => _w('loadEmployees')());
    }
    _w('toast')('임시저장 계약서가 삭제되었습니다.', 'success');
    _w('closeModal')('contract-modal');
    await _w('loadContracts')();
    _w('renderContracts')();
    if(typeof renderDraftAlerts === 'function') renderDraftAlerts();
    if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
    if(typeof renderDashboard === 'function') _w('renderDashboard')();
    window._resumeDraftId = null;
  } catch(e){
    _w('toast')('삭제 중 오류가 발생했습니다.', 'error');
  }
}

/**
 * 서류미비 계약에서 호출: 계약조건 입력 모달을 열고
 * contract-preview-modal의 '날인본 업로드' 탭으로 바로 이동한다.
 * - 대시보드·근로계약 관리·급여 입력 서류미비 배너에서 공통 사용
 */
export function openContractForUpload(contractId){
  if(!contractId) return;
  const c = getContracts().find(x => x.id === contractId);
  if(!c) return;
  window._cpUploadOnly = true;
  openContractModal(contractId);            // 데이터 채우기
  requestAnimationFrame(() => {
    _w('closeModal')('contract-modal');           // 수정 모달 숨김
    _renderCpExistingFiles(c);             // 기존 계약 파일 섹션 렌더링
    document.getElementById('contract-preview-modal').classList.add('open');
  });
}
export function loadCtEmployees(preselect=null){
  // 직원 드롭다운 제거됨 - 회사 변경 시 불필요한 동작 없음
  // 고객사 변경 → 옵셔널 수당 show/hide 적용
  // ※ onchange 핸들러에서 loadCtEmployees() 직후 onCtCompanyChange()가 호출되므로
  //   여기서는 최소한의 show/hide만 적용 (onCtCompanyChange가 스냅샷 기준으로 덮어씀)
  const coId = document.getElementById('ct-company')?.value;
  const co   = coId ? (getCompanies()||[]).find(x=>x.id===coId) : null;
  const isEditMode = !!window.editId?.contract;
  // 수정/amend 모드: 값 초기화 없이 show/hide만 갱신 (onCtCompanyChange가 덮어쓰지 않음)
  // 신규/재계약 모드: onCtCompanyChange가 바로 뒤에서 스냅샷+clearValues로 덮어씀
  if(!isEditMode){
    // 신규/재계약: onCtCompanyChange가 뒤에서 처리하므로 여기서는 생략
    return;
  }
  applyCTAllowanceConfig(co?.allowance_config ?? null, false);
}

// ==================================================================
//  계약직 조기 해지 설정 함수 그룹
//  대상: 계약직 / 계약직수습 / 일용직 (isFixed 플래그)
// ==================================================================

/**
 * 해지 설정 패널 토글
 * - 다른 패널(ct-terminate-panel, ct-renew-panel) 닫기
 * - 열릴 때: 계약 정보 표시 + 입력 초기화
 * - 이미 열려있으면 닫기
 */
export function doFixedTerminate(){
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
  const c   = getContracts().find(x => x.id === window.editId.contract) || {};
  const emp = getEmployees().find(e => e.id === c.employee_id)   || {};
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
export function _cftValidate(){
  const c          = getContracts().find(x => x.id === window.editId.contract) || {};
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
  const newStatus  = isFuture ? CONTRACT_STATUS.TERMINATE_PENDING : CONTRACT_STATUS.TERMINATED;
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
export function _cftSelectReason(el, reason){
  const isAlreadySelected = el.classList.contains('selected');
  // 모든 칩 선택 해제
  document.querySelectorAll('.cft-reason-chip').forEach(ch => ch.classList.remove('selected'));
  // 같은 칩이면 해제(토글), 다른 칩이면 선택
  if(!isAlreadySelected) el.classList.add('selected');
}

/**
 * 해지 설정 패널 닫기 + 입력 초기화
 */
export function _cftClose(){
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
export async function confirmFixedTerminate(){
  const c = getContracts().find(x => x.id === window.editId.contract);
  if(!c) return _w('toast')('계약 정보를 찾을 수 없습니다.', 'error');

  const termDate = (document.getElementById('ct-fixed-terminate-date') || {}).value || '';
  if(!termDate) return _w('toast')('해지일을 선택하세요.', 'error');

  const today = new Date().toISOString().slice(0, 10);

  // 만료일 이상 불가
  if(c.contract_end && termDate >= c.contract_end){
    return _w('toast')(`해지일은 계약 만료일(${c.contract_end}) 이전이어야 합니다.`, 'error');
  }
  // 시작일 이전 불가
  if(c.contract_start && termDate < c.contract_start){
    return _w('toast')(`해지일은 계약 시작일(${c.contract_start}) 이후이어야 합니다.`, 'error');
  }

  const selectedChip = document.querySelector('.cft-reason-chip.selected');
  const reason       = selectedChip ? selectedChip.textContent.trim() : '';
  const noteInput    = (document.getElementById('ct-fixed-terminate-note') || {}).value || '';
  const note         = noteInput.trim();
  const newStatus    = termDate > today ? CONTRACT_STATUS.TERMINATE_PENDING : CONTRACT_STATUS.TERMINATED;

  // 기존 note에 사유/메모 추가 (덮어쓰기 방지)
  const addendum = [reason, note].filter(Boolean).join(' — ');
  const finalNote = c.note || '';

  const emp    = getEmployees().find(e => e.id === c.employee_id) || {};
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
    await _w('api')(`../tables/contracts/${c.id}`, {
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
        ? { status: EMP_STATUS.RESIGNED, resign_date: termDate }
        : { resign_date: termDate };   // 해지예정: 재직 상태 유지, 날짜만 기록
      await _w('api')(`../tables/employees/${emp.id}`, {
        method  : 'PATCH',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(empPatch)
      });
    }

    // 3) 모달 닫기 및 데이터 갱신
    _w('closeModal')('contract-modal');
    await Promise.all([_w('loadContracts')(), _w('loadEmployees')()]);
    _w('renderContracts')();
    _w('renderDashboard')();

    const statusLabel = newStatus === '해지예정'
      ? `해지예정 (해지일: ${termDate})`
      : `해지 완료 (해지일: ${termDate})`;
    _w('toast')(`${empName} — ${statusLabel}`, 'success');

  } catch(e){
    console.error('[confirmFixedTerminate] error:', e);
    _w('toast')('처리 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    if(confirmBtn){
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-check"></i> 해지 확정';
    }
  }
}
// ── 임시저장 ──
export async function saveDraftContract(reason){
  const activeEl = document.activeElement; // 포커스 보존

  // 직원 ID: 수정모드→기존 계약에서, 재계약→_recontractEmpId, 신규→아직 없음
  let empId = window.editId.contract
    ? (getContracts().find(x=>x.id===window.editId.contract)||{}).employee_id||''
    : (_recontractEmpId||'');

  // 신규이면서 직원 이름만 입력된 경우: 이름이라도 있으면 임시 저장 허용 (직원 생성 없이)
  // → 임시저장은 직원 생성 없이 계약 데이터만 저장한다
  //   (등록 시 신규 직원도 함께 저장됨)
  const isNew     = !window.editId.contract && !_recontractEmpId;
  const isEditMode = !!window.editId.contract;

  // ── 파기된 계약(수정재발행)은 편집 불가 ──
  if(isEditMode){
    const _origDraft = getContracts().find(x => x.id === window.editId.contract);
    if(_origDraft && _origDraft.is_voided_by_amend){
      _w('toast')('이 계약은 수정재발행으로 파기되어 편집할 수 없습니다.', 'error');
      return;
    }
  }

  // ── 신규 직원인 경우 먼저 직원 생성 (임시저장도 직원 DB에 저장) ──
  if(isNew && !empId){
    const newEmpNo = document.getElementById('ct-em-empno')?.value.trim() || '';
    // 동일 사번 직원이 이미 있으면 재사용 (이전 저장 시도 실패 후 재시도 대응)
    const existingEmp = newEmpNo
      ? (getEmployees()||[]).find(e => e.company_id === coId && e.employee_number === newEmpNo)
      : null;
    if(existingEmp){
      empId = existingEmp.id;
    } else {
    const saved = await _w('api')('../tables/employees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      id: 'emp'+Date.now(),
      company_id: coId,
      name: document.getElementById('ct-em-name').value.trim(),
      gender: document.getElementById('ct-em-gender').value,
      employment_category: CONTRACT_TYPE_LEGACY_MAP[document.getElementById('ct-em-category').value] || document.getElementById('ct-em-category').value,
      employee_number: document.getElementById('ct-em-empno')?.value.trim() || '',
      job_description: document.getElementById('ct-em-job').value.trim(),
      id_number: document.getElementById('ct-em-id').value,
      department: document.getElementById('ct-em-dept').value,
      position: document.getElementById('ct-em-position').value,
      hire_date: document.getElementById('ct-em-hire').value,
      expire_date: document.getElementById('ct-em-expire').value,
      status: EMP_STATUS.ACTIVE,
      dependents: parseInt(document.getElementById('ct-em-dependents')?.value)||0,
      phone: document.getElementById('ct-em-phone').value,
      email: document.getElementById('ct-em-email').value,
      address: document.getElementById('ct-em-address').value,
      bank_name: document.getElementById('ct-em-bank')?.value.trim() || '',
      bank_account: document.getElementById('ct-em-account')?.value.trim() || '',
      is_representative: document.getElementById('ct-em-is-rep')?.checked ? 1 : 0,
      note: ''
    })});
    empId = saved.id || ('emp'+Date.now());
    await _w('loadEmployees')();
  }

  // 현재 입력값 수집 + 영문 정규화
  const _rawCatDraft = isEditMode
    ? (getContracts().find(x=>x.id===window.editId.contract)||{}).contract_type||'정규직'
    : (isNew ? document.getElementById('ct-em-category').value : document.getElementById('ct-type').value);
  const catForDraft = CONTRACT_TYPE_LEGACY_MAP[_rawCatDraft] || _rawCatDraft;
  const isDailyDraft = catForDraft ===CONTRACT_TYPE.DAILY;

  const scheduleJSON = _w('getScheduleJSON')();
  const workDays = parseInt(document.getElementById('ct-days').value)||0;
  const avgHours = parseFloat(document.getElementById('ct-hours').value)||0;

  // 신규 모드: ct-em-start(계약시작일) 전용 필드 사용. 없으면 ct-em-hire 폴백(하위호환)
  const contractStart = isNew
    ? (document.getElementById('ct-em-start')?.value || document.getElementById('ct-em-hire').value||'')
    : (document.getElementById('ct-start').value||'');
  const contractEnd = isNew
    ? (document.getElementById('ct-em-expire').value||'')
    : (document.getElementById('ct-end').value||'');

  const baseDraft       = _w('getAmountVal')('ct-base')||0;
  const annualDraft     = _w('getAmountVal')('ct-annual-sal')||0;
  const dailyDraft      = _w('getAmountVal')('ct-daily-wage')||0;
  const wkHolDraft      = isDailyDraft ? 0 : Math.round(baseDraft / 5); // 월 주휴수당 = 기본급 ÷ 5
  const isRegDraft      = catForDraft ===CONTRACT_TYPE.REGULAR || catForDraft ===CONTRACT_TYPE.REGULAR_PROBATION;
  const posDraft        = _w('getAmountVal')('ct-position')||0;
  const carDraft        = _w('getAmountVal')('ct-car')||0;
  const remoteAreaDraft = _w('getAmountVal')('ct-remote-area')||0;
  const mealDraft       = _w('getAmountVal')('ct-meal')||0;
  const researchDraft   = _w('getAmountVal')('ct-research')||0;
  const siteDraft       = _w('getAmountVal')('ct-site')||0;
  const skillDraft      = _w('getAmountVal')('ct-skill')||0;
  const licenseDraft    = _w('getAmountVal')('ct-license')||0;
  const commDraft       = _w('getAmountVal')('ct-communication')||0;
  const fitnessDraft    = _w('getAmountVal')('ct-fitness')||0;
  const selfDevDraft    = _w('getAmountVal')('ct-self-dev')||0;
  const bookDraft       = _w('getAmountVal')('ct-book')||0;
  const overseasDraft   = _w('getAmountVal')('ct-overseas')||0;
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
  // 통상시급: 직접 입력값(ct-hourly-input)을 그대로 사용
  const hourlyDraft   = _w('getAmountVal')('ct-hourly-input') || 0;

  const draftBody = {
    employee_id:          empId||null,
    company_id:           coId,
    contract_start:       contractStart,
    contract_end:         contractEnd,
    contract_type:        catForDraft,
    status:               'draft',
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
    regular_bonus:           _w('getAmountVal')('ct-regular-bonus')||0,
    childcare_allowance:     _w('getAmountVal')('ct-childcare')||0,
    childcare_dependents:    parseInt(document.getElementById('ct-childcare-dependents')?.value||1)||1,
    insurance_employment: true,
    insurance_industrial: true,
    insurance_pension:    true,
    insurance_health:     true,
    note:                 document.getElementById('ct-note').value||'',
    salary_start_date:    (window.editId.contract || _recontractEmpId)
      ? (document.getElementById('ct-start')?.value || '')
      : (document.getElementById('ct-em-start')?.value || document.getElementById('ct-em-hire')?.value || ''),
    salary_end_date:      '',
    is_draft:             true,
    draft_saved_at:       Date.now(),
  };

  // (직원이 이미 생성되었으므로 note에 직원명 별도 보관 불필요)
  let savedId;
  const bodyJSON = JSON.stringify(draftBody);
  try {
  if(isEditMode){
    // 기존 계약 수정 중 임시저장 → PATCH
    draftBody.id = window.editId.contract;
    const res = await _w('api')(`../tables/contracts/${window.editId.contract}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:bodyJSON});
    if(res && res.error){ _w('toast')('임시저장 실패: ' + res.error, 'error'); return; }
    savedId = window.editId.contract;
  } else if(window.editId.contract === null && (_currentDraftId || window._resumeDraftId)){
    // 이전 임시저장 ID가 있으면 덮어쓰기
    const draftId = window._resumeDraftId || _currentDraftId;
    draftBody.id = draftId;
    const res = await _w('api')(`../tables/contracts/${draftId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:bodyJSON});
    if(res && res.error){ _w('toast')('임시저장 실패: ' + res.error, 'error'); return; }
    savedId = draftId;
    _currentDraftId = draftId;
    window._resumeDraftId = null;
  } else {
    // 최초 임시저장 → POST
    draftBody.id = 'cont_draft_'+Date.now();
    const res = await _w('api')('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:bodyJSON});
    if(res && res.error){ console.error('[saveDraftContract] Server error:', res.error); _w('toast')('임시저장 실패: ' + res.error, 'error'); return; }
    savedId = res.id || draftBody.id;
    _currentDraftId = savedId;
  }
  } catch(e){
    console.error('[saveDraftContract] Exception:', e);
    _w('toast')('임시저장 중 오류가 발생했습니다.', 'error');
    return;
  }

  await _w('loadContracts')();
  // 경량 배너만 갱신 (전체 테이블 재렌더링 X — 폼 깜빡임 방지)
  if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
  if(typeof renderDraftAlerts === 'function') renderDraftAlerts();
  if(typeof updateMenuBadges === 'function') _w('updateMenuBadges')();

  // 임시저장 시각 표시
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const infoEl = document.getElementById('ct-draft-saved-info');
  if(infoEl){ infoEl.style.display='inline'; infoEl.innerHTML=`<i class="fas fa-check" style="color:#10b981;margin-right:3px;"></i>임시저장 완료 (${timeStr})`; }

  if(reason){
    _w('toast')(`⚠ 필수 항목 누락으로 임시저장 되었습니다.\n[${reason}]`, 'warning');
  } else {
    _w('toast')(`임시저장 되었습니다. (${timeStr})`, 'success');
  }
  // 포커스 복원
  if(activeEl && typeof activeEl.focus === 'function'){
    setTimeout(() => { try { activeEl.focus(); } catch(e) {} }, 100);
  }
  } // if(isNew && !empId)
} // saveDraftContract

// 임시저장 진행 중인 draft ID (신규 작성 시 추적용)
let _currentDraftId = null;

// ── 주민등록번호 포맷·유효성 헬퍼 ──────────────────────────────────────────
/**
 * _formatIdInput(el)
 *  - 입력 중 숫자만 추출 → YYMMDD 6자리 입력 후 자동 하이픈 삽입
 *  - 하이픈 뒤 1자리(성별코드)까지만 허용 → 최대 8문자 "YYMMDD-N"
 *  - 커서 위치 보정 (하이픈 자동 삽입 시 +1)
 */
export function _formatIdInput(el){
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
export function _inferGender(genderCode){
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
export function _validateIdNumber(val){
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
export function _onIdInput(el, checkBtnFn){
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

// ── 휴대전화번호 포맷·유효성 헬퍼 ──────────────────────────────────────────
/**
 * _formatPhoneInput(el)
 *  - 숫자만 추출 → 최대 11자리
 *  - 010-XXXX-XXXX 형식으로 자동 하이픈 삽입
 */
export function _formatPhoneInput(el){
  const sel  = el.selectionStart;
  const prev = el.value;
  const digits = prev.replace(/[^0-9]/g, '').slice(0, 11);
  let next = '';
  let cursorAdj = 0;

  if(digits.length <= 3){
    next = digits;
  } else if(digits.length <= 7){
    next = digits.slice(0,3) + '-' + digits.slice(3);
    if(!prev.includes('-')) cursorAdj = 1;
  } else {
    next = digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7);
    // 하이픈 개수 차이만큼 커서 보정
    const prevHyphens = (prev.match(/-/g)||[]).length;
    const nextHyphens = (next.match(/-/g)||[]).length;
    cursorAdj = nextHyphens - prevHyphens;
  }

  if(next !== prev){
    el.value = next;
    const newPos = Math.min(Math.max(0, sel + cursorAdj), next.length);
    el.setSelectionRange(newPos, newPos);
  }
}

/**
 * _validatePhoneNumber(val)
 *  - 010으로 시작하는 11자리(하이픈 제외) 번호인지 검사
 *  반환: { ok: boolean, msg: string }
 */
export function _validatePhoneNumber(val){
  if(!val || !val.trim()) return { ok: false, msg: '휴대전화번호를 입력해 주세요.' };
  const digits = val.replace(/[^0-9]/g, '');
  if(digits.length !== 11)
    return { ok: false, msg: '휴대전화번호는 11자리여야 합니다 (현재 '+digits.length+'자리).' };
  if(!digits.startsWith('010'))
    return { ok: false, msg: '휴대전화번호는 010으로 시작해야 합니다.' };
  // 010 다음 8자리: 두 번째 자리는 1~9 (통신사 식별번호)
  const secondPart = digits.slice(3);
  if(!/^\d{8}$/.test(secondPart))
    return { ok: false, msg: '휴대전화번호 뒷 8자리가 올바르지 않습니다.' };
  return { ok: true, msg: '' };
}

/**
 * _onPhoneInput(el, checkBtnFn)
 *  휴대전화번호 입력 필드 oninput 핸들러
 *  1) 자동 포맷 적용
 *  2) 인라인 오류 힌트 표시/제거
 *  3) 버튼 상태 갱신 콜백 호출
 */
export function _onPhoneInput(el, checkBtnFn){
  _formatPhoneInput(el);
  const val = el.value;
  let hint = el.parentElement.querySelector('.phone-format-hint');
  if(!hint){
    hint = document.createElement('span');
    hint.className = 'phone-format-hint';
    hint.style.cssText = 'font-size:11px;margin-top:3px;display:block;';
    el.parentElement.appendChild(hint);
  }
  if(!val){
    hint.textContent = '';
    hint.style.color = '';
  } else {
    const digits = val.replace(/[^0-9]/g, '');
    const { ok, msg } = _validatePhoneNumber(val);
    if(ok){
      hint.textContent = '✓ 형식 확인';
      hint.style.color = '#16a34a';
    } else if(digits.length < 11){
      hint.textContent = `${11-digits.length}자리 더 입력하세요`;
      hint.style.color = '#6b7280';
    } else {
      hint.textContent = '✗ ' + msg;
      hint.style.color = '#dc2626';
    }
  }
  if(typeof checkBtnFn === 'function') checkBtnFn();
}

// ── 이메일 주소 포맷·유효성 헬퍼 (선택 입력) ──────────────────────────────
/**
 * _validateEmail(val)
 *  - 이메일 형식 검사 (간단한 RFC5322 기반)
 *  - 선택사항: 빈 값은 ok:true 반환
 */
export function _validateEmail(val){
  if(!val || !val.trim()) return { ok: true, msg: '' };  // 선택 입력
  // 기본 이메일 패턴: x@y.z
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()))
    return { ok: false, msg: '올바른 이메일 주소 형식이 아닙니다 (예: example@email.com).' };
  return { ok: true, msg: '' };
}

/**
 * _onEmailInput(el)
 *  이메일 입력 필드 oninput 핸들러
 *  - 인라인 오류 힌트만 표시 (선택사항이므로 형식 검증만)
 */
export function _onEmailInput(el){
  const val = el.value;
  let hint = el.parentElement.querySelector('.email-format-hint');
  if(!hint){
    hint = document.createElement('span');
    hint.className = 'email-format-hint';
    hint.style.cssText = 'font-size:11px;margin-top:3px;display:block;';
    el.parentElement.appendChild(hint);
  }
  if(!val){
    hint.textContent = '';
    hint.style.color = '';
  } else {
    const { ok, msg } = _validateEmail(val);
    if(ok){
      hint.textContent = '✓ 형식 확인';
      hint.style.color = '#16a34a';
    } else {
      hint.textContent = '✗ ' + msg;
      hint.style.color = '#dc2626';
    }
  }
}

// ── 필수 입력 유효성 검사 + 하이라이트 헬퍼 ──────────────────────────────
export function _ctMarkError(fieldId, label, errors){
  // form-group 부모에 에러 클래스 부여
  const el = document.getElementById(fieldId);
  if(!el) return;
  const fg = el.closest('.form-group') || el.parentElement;
  if(fg) fg.classList.add('ct-field-error');
  errors.push(label);
}

export function _ctShowErrors(errors){
  if(!errors.length) return;
  // 첫 번째 오류 필드로 포커스 이동 + 스크롤
  const firstError = document.querySelector('#contract-modal .ct-field-error');
  if(firstError){
    const input = firstError.querySelector('input, select, textarea');
    if(input){
      input.focus();
      input.scrollIntoView({ behavior:'smooth', block:'center' });
    } else {
      firstError.scrollIntoView({ behavior:'smooth', block:'center' });
    }
  }
}

export function _ctValidate(){
  _ctClearErrors();
  const errors = [];
  const isNew     = !window.editId.contract && !_recontractEmpId;
  const isEditOrRecontract = !isNew;

  // ── 공통: 회사 (모달 오픈 시 항상 설정됨) ──
  const coId = document.getElementById('ct-company').value;

  // ── 수정/재계약: 계약 시작일 ──
  if(isEditOrRecontract){
    const start = document.getElementById('ct-start').value;
    if(!start) _ctMarkError('ct-start', '계약 시작일', errors);
    // 계약 시작일은 입사일보다 이전일 수 없음
    (function(){
      const _hire = document.getElementById('ct-edit-em-hire')?.value;
      if(_hire && start && start < _hire){
        _ctMarkError('ct-start', '계약 시작일은 입사일보다 이전일 수 없습니다', errors);
      }
    })();
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
    if(!document.getElementById('ct-em-start')?.value)
      _ctMarkError('ct-em-start', '계약 시작일', errors);
    // 계약 시작일은 입사일보다 이전일 수 없음
    (function(){
      const _hire = document.getElementById('ct-em-hire')?.value;
      const _start = document.getElementById('ct-em-start')?.value;
      if(_hire && _start && _start < _hire){
        _ctMarkError('ct-em-start', '계약 시작일은 입사일보다 이전일 수 없습니다', errors);
      }
    })();
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
    (function(){
      const _phoneVal = document.getElementById('ct-em-phone').value.trim();
      if(!_phoneVal){
        _ctMarkError('ct-em-phone', '휴대전화', errors);
      } else {
        const _phoneChk = _validatePhoneNumber(_phoneVal);
        if(!_phoneChk.ok) _ctMarkError('ct-em-phone', '휴대전화 형식 오류', errors);
      }
    })();
    (function(){
      const _emailVal = document.getElementById('ct-em-email').value.trim();
      if(_emailVal){
        const _emailChk = _validateEmail(_emailVal);
        if(!_emailChk.ok) _ctMarkError('ct-em-email', '이메일 형식 오류', errors);
      }
    })();
    if(!document.getElementById('ct-em-category').value)
      _ctMarkError('ct-em-category', '고용형태', errors);
    const _depVal = parseInt(document.getElementById('ct-em-dependents')?.value);
    if(isNaN(_depVal) || _depVal < 0)
      _ctMarkError('ct-em-dependents', '부양가족 수', errors);

    // ── 통상시급: 모든 고용형태 공통 필수 ──
    if(!_w('getAmountVal')('ct-hourly-input'))
      _ctMarkError('ct-hourly-input', '통상시급', errors);

    // ── 임금 관련 (고용형태 기준) ──
    const cat = CONTRACT_TYPE_LEGACY_MAP[document.getElementById('ct-em-category').value] || document.getElementById('ct-em-category').value;
    if(cat ===CONTRACT_TYPE.DAILY){
      if(!_w('getAmountVal')('ct-daily-wage'))
        _ctMarkError('ct-daily-wage', '일급여', errors);
    } else if(cat){
      // 정규직·정규직 수습·계약직·계약직 수습은 기본급이 자동계산이므로 필수 체크 제외
      if(cat !==CONTRACT_TYPE.REGULAR && cat !==CONTRACT_TYPE.REGULAR_PROBATION && cat !==CONTRACT_TYPE.FIXED && cat !==CONTRACT_TYPE.FIXED_PROBATION){
        if(!_w('getAmountVal')('ct-base'))
          _ctMarkError('ct-base', '기본급', errors);
      }
      if(cat ===CONTRACT_TYPE.REGULAR || cat ===CONTRACT_TYPE.REGULAR_PROBATION){
        if(!_w('getAmountVal')('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '연봉', errors);
      } else if(cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION){
        if(!_w('getAmountVal')('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '월 약정급여', errors);
      }
    }
    // ── 계약직·계약직 수습·일용직: 계약 종료일(퇴사예정일) 필수 ──
    if(cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION || cat ===CONTRACT_TYPE.DAILY){
      if(!document.getElementById('ct-em-expire')?.value)
        _ctMarkError('ct-em-expire', '계약 종료일', errors);
    }
    // ── 수습 계약: 수습 조건 전체 필수 ──
    if(cat ===CONTRACT_TYPE.REGULAR_PROBATION || cat ===CONTRACT_TYPE.FIXED_PROBATION){
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
      const _editC = window.editId.contract ? getContracts().find(x => x.id === window.editId.contract) : null;
      const _editSelfEmpId = _editC ? _editC.employee_id : null;
      const _coIdForEditEmpno = window.currentContCompanyId || document.getElementById('ct-company')?.value || '';
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
    (function(){
      const _phoneValE = document.getElementById('ct-edit-em-phone')?.value.trim();
      if(!_phoneValE){
        _ctMarkError('ct-edit-em-phone', '휴대전화', errors);
      } else {
        const _phoneChkE = _validatePhoneNumber(_phoneValE);
        if(!_phoneChkE.ok) _ctMarkError('ct-edit-em-phone', '휴대전화 형식 오류', errors);
      }
    })();
    (function(){
      const _emailValE = document.getElementById('ct-edit-em-email')?.value.trim();
      if(_emailValE){
        const _emailChkE = _validateEmail(_emailValE);
        if(!_emailChkE.ok) _ctMarkError('ct-edit-em-email', '이메일 형식 오류', errors);
      }
    })();
    if(!document.getElementById('ct-edit-em-address')?.value.trim())
      _ctMarkError('ct-edit-em-address', '주소', errors);
    const _editDepVal = parseInt(document.getElementById('ct-edit-em-dependents')?.value);
    if(isNaN(_editDepVal) || _editDepVal < 0)
      _ctMarkError('ct-edit-em-dependents', '부양가족 수', errors);

    // ── 통상시급: 모든 고용형태 공통 필수 ──
    if(!_w('getAmountVal')('ct-hourly-input'))
      _ctMarkError('ct-hourly-input', '통상시급', errors);

    // ── 수정/재계약: 임금 관련 ──
    const _rawCatForCheck = (document.getElementById('ct-edit-em-category')?.value)
      || (document.getElementById('ct-type')?.value) || '정규직';
    const catForCheck = CONTRACT_TYPE_LEGACY_MAP[_rawCatForCheck] || _rawCatForCheck;
    if(catForCheck ===CONTRACT_TYPE.DAILY){
      if(!_w('getAmountVal')('ct-daily-wage'))
        _ctMarkError('ct-daily-wage', '일급여', errors);
    } else {
      // 정규직·정규직 수습·계약직·계약직 수습은 기본급이 자동계산이므로 필수 체크 제외
      if(catForCheck !==CONTRACT_TYPE.REGULAR && catForCheck !==CONTRACT_TYPE.REGULAR_PROBATION && catForCheck !==CONTRACT_TYPE.FIXED && catForCheck !==CONTRACT_TYPE.FIXED_PROBATION){
        if(!_w('getAmountVal')('ct-base'))
          _ctMarkError('ct-base', '기본급', errors);
      }
      if(catForCheck ===CONTRACT_TYPE.REGULAR || catForCheck ===CONTRACT_TYPE.REGULAR_PROBATION){
        if(!_w('getAmountVal')('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '연봉', errors);
      } else if(catForCheck ===CONTRACT_TYPE.FIXED || catForCheck ===CONTRACT_TYPE.FIXED_PROBATION){
        if(!_w('getAmountVal')('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '월 약정급여', errors);
      }
    }
    // ── 계약직·계약직 수습·일용직: 계약 종료일 필수 ──
    if(catForCheck ===CONTRACT_TYPE.FIXED || catForCheck ===CONTRACT_TYPE.FIXED_PROBATION || catForCheck ===CONTRACT_TYPE.DAILY){
      if(!document.getElementById('ct-end')?.value)
        _ctMarkError('ct-end', '계약 종료일', errors);
    }
    // ── 수습 계약: 수습 조건 전체 필수 ──
    if(catForCheck ===CONTRACT_TYPE.REGULAR_PROBATION || catForCheck ===CONTRACT_TYPE.FIXED_PROBATION){
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

export async function saveContract(){
  // ── 필수 입력 일괄 검사 (하이라이트 + 배너) ──
  const _valResult = _ctValidate();
  if(_valResult) return;

  // 재계약 모드: _recontractEmpId 사용
  let empId = window.editId.contract ? (getContracts().find(x=>x.id===window.editId.contract)||{}).employee_id||'' : (_recontractEmpId||'');
  const coId = document.getElementById('ct-company').value;
  const start = (window.editId.contract||_recontractEmpId) ? document.getElementById('ct-start').value : '';
  const base  = _w('getAmountVal')('ct-base');
  const isEditMode = !!window.editId.contract;

  // ── 파기된 계약(수정재발행)은 편집 불가 ──
  if(isEditMode){
    const _origEdit = getContracts().find(x => x.id === window.editId.contract);
    if(_origEdit && _origEdit.is_voided_by_amend){
      _w('toast')('이 계약은 수정재발행으로 파기되어 편집할 수 없습니다.', 'error');
      return;
    }
  }

  // ── 신규 직원인 경우 먼저 직원 저장 ──
  if(!empId && !window.editId.contract && !_recontractEmpId){
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
      employment_category: CONTRACT_TYPE_LEGACY_MAP[document.getElementById('ct-em-category').value] || document.getElementById('ct-em-category').value,
      employee_number: document.getElementById('ct-em-empno')?.value.trim() || '',
      job_description: newJob,
      id_number: document.getElementById('ct-em-id').value,
      department: document.getElementById('ct-em-dept').value,
      position: document.getElementById('ct-em-position').value,
      hire_date: document.getElementById('ct-em-hire').value,
      expire_date: document.getElementById('ct-em-expire').value,
      status: EMP_STATUS.ACTIVE,
      dependents: parseInt(document.getElementById('ct-em-dependents')?.value)||0,
      phone: document.getElementById('ct-em-phone').value,
      email: document.getElementById('ct-em-email').value,
      address: document.getElementById('ct-em-address').value,
      bank_name: document.getElementById('ct-em-bank')?.value.trim()    || '',
      bank_account: document.getElementById('ct-em-account')?.value.trim() || '',
      is_representative: document.getElementById('ct-em-is-rep')?.checked ? 1 : 0,
      note: ''
    };
    const saved = await _w('api')('../tables/employees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(empBody)});
    empId = saved.id || empBody.id;
    await _w('loadEmployees')();
  }

  if(!empId) return saveDraftContract('직원 정보 누락');

  // 정규직 계열 여부 판단 (신규: 구분 선택값, 수정/재계약: 계약유형 select)
  // 고용형태는 인사정보(ct-edit-em-category) 기준으로 읽음
  const _rawCatForSave = window.editId.contract
    ? (document.getElementById('ct-edit-em-category')?.value||(getContracts().find(x=>x.id===window.editId.contract)||{}).contract_type||'정규직')
    : (_recontractEmpId ? (document.getElementById('ct-edit-em-category')?.value||'정규직') : (document.getElementById('ct-em-category').value||'정규직'));
  const catForSave = CONTRACT_TYPE_LEGACY_MAP[_rawCatForSave] || _rawCatForSave;
  const isRegularGroup = catForSave ===CONTRACT_TYPE.REGULAR || catForSave ===CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedTermSave = catForSave ===CONTRACT_TYPE.FIXED || catForSave ===CONTRACT_TYPE.FIXED_PROBATION;
  const isProbationSave = catForSave ===CONTRACT_TYPE.REGULAR_PROBATION || catForSave ===CONTRACT_TYPE.FIXED_PROBATION;
  const isDailySave = catForSave ===CONTRACT_TYPE.DAILY;

  const annualSalInputSave = _w('getAmountVal')('ct-annual-sal'); // 정규직:연봉 / 계약직:월약정급여
  const annual = isRegularGroup ? annualSalInputSave : 0;   // annual_salary에는 정규직만 저장
  // 수습 데이터 (_ctValidate에서 필수 검증 통과 후이므로 값이 항상 존재)
  const probMonths = isProbationSave ? (parseInt(document.getElementById('ct-probation-months').value) || 0) : 0;
  const probPct    = isProbationSave ? (parseFloat(document.getElementById('ct-probation-pct').value) || 0) : 0;
  const probAmt    = isProbationSave ? (parseFloat(document.getElementById('ct-probation-amt').value) || 0) : 0;
  const probBasis  = isProbationSave ? (document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary') : 'salary';
  const hours=parseFloat(document.getElementById('ct-hours').value)||0;
  const days=parseFloat(document.getElementById('ct-days').value)||5;

  // ── 임금 계산 (일용직 vs 계약직 vs 정규직) ──
  let weeklyHol, monthly, baseSalaryForSave, dailyWageForSave;
  // 통상시급: 직접 입력값(ct-hourly-input)을 그대로 사용
  const hourlyWage = _w('getAmountVal')('ct-hourly-input') || 0;
  if(isDailySave){
    dailyWageForSave = _w('getAmountVal')('ct-daily-wage');
    baseSalaryForSave = 0;
    weeklyHol = 0;
    monthly = 0;
  } else {
    dailyWageForSave = 0;
    baseSalaryForSave = base;
    weeklyHol = Math.round(base / days); // 월 주휴수당 = 기본급 ÷ dpw (단시간 비례 적용)
    const position2   = _w('getAmountVal')('ct-position');
    const car2        = _w('getAmountVal')('ct-car');
    const remoteArea2 = _w('getAmountVal')('ct-remote-area');
    const meal2       = _w('getAmountVal')('ct-meal');
    const research2   = _w('getAmountVal')('ct-research');
    const other2      = _w('getAmountVal')('ct-other')||0;
    const site2       = _w('getAmountVal')('ct-site')||0;
    const skill2      = _w('getAmountVal')('ct-skill')||0;
    const lic2        = _w('getAmountVal')('ct-license')||0;
    const comm2       = _w('getAmountVal')('ct-communication')||0;
    const fit2        = _w('getAmountVal')('ct-fitness')||0;
    const sdev2       = _w('getAmountVal')('ct-self-dev')||0;
    const book2       = _w('getAmountVal')('ct-book')||0;
    const ovseas2     = _w('getAmountVal')('ct-overseas')||0;
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
  }

  // ── 최저임금 검증 ① 공용 경고 행 표시 중이면 즉시 차단 ──
  {
    const _gwRow = document.getElementById('ct-general-minwage-warning-row');
    if(_gwRow && _gwRow.style.display !== 'none'){
      _w('openModal')('ct-minwage-warn-modal');
      return;
    }
  }

  // ── 최저임금 검증 ② 시급 계산 기반 검증 (비과세 수당 포함 월 환산시급 기준) ──
  {
    // 계약 시작 연도 결정
    // 신규 모드: ct-em-start(계약시작일) 우선, 없으면 ct-em-hire 폴백
    const _hireRaw = window.editId.contract
      ? document.getElementById('ct-start')?.value
      : (_recontractEmpId
          ? document.getElementById('ct-start')?.value
          : (document.getElementById('ct-em-start')?.value || document.getElementById('ct-em-hire')?.value));
    const _contractYear = _hireRaw ? parseInt(_hireRaw.slice(0,4)) : new Date().getFullYear();
    const _mw = _allMinimumWages.find(w => Number(w.year) === _contractYear);

    if(_mw && Number(_mw.hourly_wage) > 0){
      const _legalMinWage = Number(_mw.hourly_wage);

      // ── 정규직 수습 예외: 최저임금법 §5②에 따라 수습 사용 3개월 이내 → 최저시급의 90%까지 허용
      // (1년 미만 단기계약직·일용직에는 적용 안 됨)
      const _isRegularProbation = (catForSave ===CONTRACT_TYPE.REGULAR_PROBATION);
      const _isProbationContract = (catForSave ===CONTRACT_TYPE.REGULAR_PROBATION || catForSave ===CONTRACT_TYPE.FIXED_PROBATION);
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
        _compareHourly  = probAmt > 0 ? Math.round(probAmt / MAGIC.MONTHLY_STD_HOURS) : 0;
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
        _w('openModal')('ct-minwage-warn-modal');
        return; // 저장 차단
      }
    }
  }

  // 신규/재계약 모드: 계약시작일, 종료일, 유형, 상태 결정
  const isRecontract = !!_recontractEmpId && !window.editId.contract;
  const today3 = new Date().toISOString().slice(0,10);
  let contractStart, contractEnd, contractType, contractStatus;
  if(isEditMode){
    contractStart = start;
    contractEnd   = document.getElementById('ct-end').value;
    contractType  = document.getElementById('ct-type').value;
    // 편집 모드: 계약직/일용직 종료일 변경 시 상태 자동 처리
    const origContract = getContracts().find(x=>x.id===window.editId.contract)||{};
    const isFixedEdit  = (contractType===CONTRACT_TYPE.FIXED||contractType===CONTRACT_TYPE.FIXED_PROBATION||contractType===CONTRACT_TYPE.DAILY);
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
        _w('toast')('계약 종료일을 연장하려면 [갱신] 버튼을 사용해 주세요.\n편집 저장으로는 종료일을 연장할 수 없습니다.', 'error');
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
    contractStatus= contractStart > today2 ? CONTRACT_STATUS.PENDING : CONTRACT_STATUS.ACTIVE;
  } else {
    // 신규 모드: ct-em-start(계약시작일) 전용 필드 사용. 없으면 ct-em-hire 폴백(하위호환)
    contractStart = document.getElementById('ct-em-start')?.value
                 || document.getElementById('ct-em-hire').value;
    contractEnd   = document.getElementById('ct-em-expire').value;
    contractType  = document.getElementById('ct-em-category').value;
    const today2new = new Date().toISOString().slice(0,10);
    contractStatus = contractStart > today2new ? CONTRACT_STATUS.PENDING : CONTRACT_STATUS.ACTIVE;
  }

  // ── contract_type / status 영문 정규화 ──
  contractType   = CONTRACT_TYPE_LEGACY_MAP[contractType]     || contractType;
  contractStatus = CONTRACT_STATUS_LEGACY_MAP[contractStatus] || contractStatus;

  // 요일별 스케줄 수집
  const scheduleJSON = _w('getScheduleJSON')();
  const workDaysCount = parseInt(document.getElementById('ct-days').value)||0;
  const avgDayHours   = parseFloat(document.getElementById('ct-hours').value)||0;

  // ── 파일 업로드 처리 (Base64 변환) ──
  const _skipUpload = document.getElementById('cp-skip-upload')?.checked;
  let signedFileName='', signedFileData='', consentFileName='', consentFileData='';
  if(!_skipUpload && !isEditMode){
    if(window._contractSignedFile){
      signedFileName = window._contractSignedFile.name;
      signedFileData = await _w('_fileToBase64')(window._contractSignedFile);
    }
    if(window._contractConsentFile){
      consentFileName = window._contractConsentFile.name;
      consentFileData = await _w('_fileToBase64')(window._contractConsentFile);
    }
  } else if(isEditMode){
    // 편집 모드: 기존 파일 데이터 유지 (새 파일 선택 시에만 덮어쓰기)
    const origC = getContracts().find(x=>x.id===window.editId.contract)||{};
    signedFileName  = origC.signed_file_name  || '';
    signedFileData  = origC.signed_file_data  || '';
    consentFileName = origC.consent_file_name || '';
    consentFileData = origC.consent_file_data || '';
    // 편집 모드에서도 새 파일이 선택된 경우 덮어쓰기
    if(window._contractSignedFile){
      signedFileName = window._contractSignedFile.name;
      signedFileData = await _w('_fileToBase64')(window._contractSignedFile);
    }
    if(window._contractConsentFile){
      consentFileName = window._contractConsentFile.name;
      consentFileData = await _w('_fileToBase64')(window._contractConsentFile);
    }
  }

  // 파일 완비 여부에 따라 최종 계약 상태 결정
  // 서류미비는 더 이상 상태값으로 저장하지 않음 (docsIncomplete 플래그로 관리)
  const _isTerminalStatus = (contractStatus==='해지'||contractStatus==='만료'||contractStatus==='파기'||contractStatus==='expired'||contractStatus==='terminated');
  if(!_isTerminalStatus && !isEditMode){
    const _hasBothFiles = !!(signedFileData && consentFileData);
  } else if(isEditMode && !_isTerminalStatus){
    // 편집 모드: 파일 상태에 따라 status 변경하지 않음 (docsIncomplete 플래그로 관리)
    const _hasBothFilesEdit = !!(signedFileData && consentFileData);
  }

  const body={employee_id:empId,company_id:coId,contract_start:contractStart,contract_end:contractEnd,contract_type:contractType,status:contractStatus,probation_months:probMonths,probation_pct:probPct,probation_amt:probAmt,probation_basis:probBasis,work_hours_per_day:avgDayHours,work_days_per_week:isDailySave?0:workDaysCount,schedule_json:JSON.stringify(scheduleJSON),annual_leave_days:isDailySave?0:parseFloat(document.getElementById('ct-annual').value)||15,annual_salary:annual,monthly_salary_agreed:monthly,base_salary:baseSalaryForSave,daily_wage:dailyWageForSave,weekly_holiday_pay:weeklyHol,fixed_ot_pay:_w('getAmountVal')('ct-fixed-ot-pay'),fixed_ot_hours:parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0,fixed_night_pay:_w('getAmountVal')('ct-fixed-night-pay'),fixed_night_hours:parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0,fixed_hol_pay:_w('getAmountVal')('ct-fixed-hol-pay'),fixed_hol_hours:parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0,hourly_wage:hourlyWage,position_allowance:_w('getAmountVal')('ct-position'),transportation_allowance:_w('getAmountVal')('ct-car'),transportation_pay_type:_getCTPayTypeVal('car'),self_driving_allowance:0,self_driving_pay_type:'fixed',remote_area_allowance:_w('getAmountVal')('ct-remote-area'),remote_area_pay_type:'fixed',meal_allowance:_w('getAmountVal')('ct-meal'),meal_pay_type:_getCTPayTypeVal('meal'),research_allowance:_w('getAmountVal')('ct-research'),research_pay_type:_getCTPayTypeVal('research'),site_allowance:_w('getAmountVal')('ct-site'),skill_allowance:_w('getAmountVal')('ct-skill'),license_allowance:_w('getAmountVal')('ct-license'),communication_allowance:_w('getAmountVal')('ct-communication'),communication_pay_type:_getCTPayTypeVal('communication'),fitness_allowance:_w('getAmountVal')('ct-fitness'),fitness_pay_type:_getCTPayTypeVal('fitness'),self_dev_allowance:_w('getAmountVal')('ct-self-dev'),self_dev_pay_type:_getCTPayTypeVal('self_dev'),book_allowance:_w('getAmountVal')('ct-book'),book_pay_type:_getCTPayTypeVal('book'),overseas_allowance:_w('getAmountVal')('ct-overseas'),overseas_pay_type:_getCTPayTypeVal('overseas'),car_maintenance:_w('getAmountVal')('ct-car'),regular_bonus:_w('getAmountVal')('ct-regular-bonus')||0,childcare_allowance:_w('getAmountVal')('ct-childcare')||0,childcare_dependents:parseInt(document.getElementById('ct-childcare-dependents')?.value||1)||1,pay_period:document.getElementById('ct-pay-period')?.value.trim()||'',pay_period_month:document.getElementById('ct-pay-period-month-hidden')?.value||null,pay_period_day:parseInt(document.getElementById('ct-pay-period-day-hidden')?.value)||null,pay_day:parseInt(document.getElementById('ct-pay-day')?.value)||null,insurance_employment:true,insurance_industrial:true,insurance_pension:true,insurance_health:true,note:document.getElementById('ct-note').value,salary_start_date:document.getElementById('ct-salary-start')?.value||'',salary_end_date:document.getElementById('ct-salary-end')?.value||'',is_draft:false,draft_saved_at:null,signed_file_name:signedFileName,signed_file_data:signedFileData,consent_file_name:consentFileName,consent_file_data:consentFileData};
  if(isEditMode){
    body.id=window.editId.contract;
    await _w('api')(`../tables/contracts/${window.editId.contract}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 직원 정보도 함께 업데이트 ──
    const editEmpId = (getContracts().find(x=>x.id===window.editId.contract)||{}).employee_id;
    if(editEmpId){
      const empUpdatePhone = document.getElementById('ct-edit-em-phone').value.trim();
      if(!empUpdatePhone) return _w('toast')('휴대전화 번호를 입력하세요.','error');
      // 계약직/일용직은 입사일=계약시작일, 만료일=계약종료일이므로 ct-start/ct-end 값 사용
      const _ctTypeForSave = document.getElementById('ct-type').value||'정규직';
      const _isFixedForSave = (_ctTypeForSave===CONTRACT_TYPE.FIXED||_ctTypeForSave===CONTRACT_TYPE.FIXED_PROBATION||_ctTypeForSave===CONTRACT_TYPE.DAILY);
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
        is_representative:   document.getElementById('ct-edit-em-is-rep')?.checked ? 1 : 0,
      };
      // 이름·고용형태: readOnly/disabled가 아닐 때만 업데이트 (수정 모드에서만 반영)
      if(_nameElSave && !_nameElSave.readOnly && _nameElSave.value.trim()) empPatch.name = _nameElSave.value.trim();
      if(_catElSave  && !_catElSave.disabled  && _catElSave.value)         empPatch.employment_category = _catElSave.value;
      await _w('api')(`../tables/employees/${editEmpId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(empPatch)});
    }
  } else {
    // 임시저장에서 이어서 등록하는 경우: 기존 draft ID 재사용
    const _resumeId = window._resumeDraftId || _currentDraftId;
    body.id = _resumeId || ('cont'+Date.now());
    if(_resumeId){
      await _w('api')(`../tables/contracts/${_resumeId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      window._resumeDraftId = null;
    } else {
      await _w('api')('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    }
  }
  // ── 고객사 인앱 알림 발송 ──
  {
    const _savedContractId = isEditMode ? window.editId.contract : (body.id || '');
    const _co  = getCompanies().find(x => x.id === coId) || {};
    const _emp = getEmployees().find(x => x.id === empId) || {};
    const _coName  = _co.company_name || '';
    const _empName = _emp.name || '';
    const _coRep   = _w('getCompanyRepGreeting')(_co);
    const _fmtDate = d => {
      if(!d) return '-';
      const [y,m,dd] = d.split('-');
      return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`;
    };

    if(isEditMode){
      // ─ 계약 수정 완료 OR 해지 처리
      const _origC = getContracts().find(x => x.id === window.editId.contract) || {};
      if(contractStatus === '해지'){
        // ── 계약 해지 ──
        await _w('_sendCompanyNotice')({
          companyId  : coId, companyName: _coName,
          noticeType : 'contract_terminated',
          title      : `[계약 해지] ${_empName} — 근로계약이 해지되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 해지 처리되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${_w('contractTypeLabel')(contractType)||contractType}
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
        await _w('_sendCompanyNotice')({
          companyId  : coId, companyName: _coName,
          noticeType : 'contract_updated',
          title      : `[계약 수정] ${_empName} — 근로계약이 수정되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약 내용이 수정되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${_w('contractTypeLabel')(contractType)||contractType}
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
      await _w('_sendCompanyNotice')({
        companyId  : coId, companyName: _coName,
        noticeType : 'contract_renewed_new',
        title      : `[재계약 완료] ${_empName} — 새 근로계약이 작성되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 재계약이 완료되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${_w('contractTypeLabel')(contractType)||contractType}
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
      await _w('_sendCompanyNotice')({
        companyId  : coId, companyName: _coName,
        noticeType : 'contract_created',
        title      : `[신규 계약] ${_empName} — 근로계약이 작성되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 새로 작성되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${_w('contractTypeLabel')(contractType)||contractType}
■ 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 계약 상태: ${contractStatus === CONTRACT_STATUS.DOCS_INCOMPLETE ? '서류미비 (파일 업로드 필요)' : contractStatus === CONTRACT_STATUS.PENDING ? '계약예정' : '계약유효 (활성)'}
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
  _w('closeModal')('contract-modal');await _w('loadContracts')();await _w('loadEmployees')();_w('renderContracts')();_w('renderDashboard')();_w('toast')('근로계약서가 등록되었습니다. ✔');
}
export async function deleteContract(id){
  const c = getContracts().find(x => x.id === id);
  if(!c) return _w('toast')('계약 정보를 찾을 수 없습니다.', 'error');

  // 파기된 계약만 삭제 허용
  const isVoided = c.status === 'voided' || c.is_voided_by_amend;
  if(!isVoided){
    _w('toast')('근로계약서는 보존 정책에 따라 삭제할 수 없습니다.', 'error');
    return;
  }

  if(!confirm('삭제 후에는 다시 조회할 수 없습니다.\n정말 파기 기록을 삭제하시겠습니까?')) return;

  try {
    // FK 제약 해소: 연관 레코드 먼저 삭제
    await _w('api')(`../tables/contract_dispatch?contract_id=${id}&limit=100`, { method: 'GET' }).then(res => {
      const list = res?.data || [];
      return Promise.all(list.map(r => _w('api')(`../tables/contract_dispatch/${r.id}`, { method: 'DELETE' }).catch(()=>{})));
    }).catch(()=>{});
    await _w('api')(`../tables/contract_expiry_notice?contract_id=${id}&limit=100`, { method: 'GET' }).then(res => {
      const list = res?.data || [];
      return Promise.all(list.map(r => _w('api')(`../tables/contract_expiry_notice/${r.id}`, { method: 'DELETE' }).catch(()=>{})));
    }).catch(()=>{});

    await _w('api')(`../tables/contracts/${id}`, { method: 'DELETE' });
    await _w('loadContracts')();
    _w('renderContracts')();
    _w('toast')('파기된 계약서가 삭제되었습니다.', 'success');
  } catch(e){
    console.error('[deleteContract]', e);
    _w('toast')('삭제에 실패했습니다.', 'error');
  }
}



// ══ window 등록 ══
window._resetStatusBanner = _resetStatusBanner;
window.editPendingContract = editPendingContract;
window.cancelPendingEdit = cancelPendingEdit;
window.savePendingContractEdit = savePendingContractEdit;
window.doContractVoidOrCancel = doContractVoidOrCancel;
window.cancelPreTerminate = cancelPreTerminate;
window.cancelPendingContract = cancelPendingContract;
window.doContractVoid = doContractVoid;
window._collectRenewFormFields = _collectRenewFormFields;
window._validateRenewNewStart = _validateRenewNewStart;
window.doContractRenew = doContractRenew;
window.cancelContractRenew = cancelContractRenew;
window.confirmContractRenew = confirmContractRenew;
window.doContractRecontract = doContractRecontract;
window.openRecontractModal = openRecontractModal;
window.doContractTerminate = doContractTerminate;
window.cancelContractTerminate = cancelContractTerminate;
window.confirmContractTerminate = confirmContractTerminate;
window.editContract = editContract;
window.continueDraftContract = continueDraftContract;
window.deleteDraftContract = deleteDraftContract;
window.openContractForUpload = openContractForUpload;
window.loadCtEmployees = loadCtEmployees;
window.doFixedTerminate = doFixedTerminate;
window._cftValidate = _cftValidate;
window._cftSelectReason = _cftSelectReason;
window._cftClose = _cftClose;
window.confirmFixedTerminate = confirmFixedTerminate;
window.saveDraftContract = saveDraftContract;
window._formatIdInput = _formatIdInput;
window._inferGender = _inferGender;
window._validateIdNumber = _validateIdNumber;
window._onIdInput = _onIdInput;
window._formatPhoneInput = _formatPhoneInput;
window._validatePhoneNumber = _validatePhoneNumber;
window._onPhoneInput = _onPhoneInput;
window._validateEmail = _validateEmail;
window._onEmailInput = _onEmailInput;
window._ctMarkError = _ctMarkError;
window._ctShowErrors = _ctShowErrors;
window._ctValidate = _ctValidate;
window.saveContract = saveContract;
window.deleteContract = deleteContract;
