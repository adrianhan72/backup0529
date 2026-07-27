// ===============================================================================
// _probAutoCreateAndSave()
//   케이스① (해당 월 전체가 수습 만료 이후): 채용확정 계약서를 자동 생성하고
//   현재 폼에 입력된 급여를 채용확정 계약 기준으로 저장한다.
// ===============================================================================
async function _probAutoCreateAndSave(){
  const empId = document.getElementById('pi-employee').value;
  const coId  = currentGlobalCompanyId || document.getElementById('pi-company').value;
  const yr    = parseInt(document.getElementById('pi-year').value);
  const mo    = parseInt(document.getElementById('pi-month').value);
  if(!empId || !yr || !mo) return toast('직원·연월을 확인하세요.', 'error');
  if(!piContract) return toast('활성 계약서가 없습니다.', 'error');

  const probEnd = _calcProbationEndDate(piContract);
  if(!probEnd) return toast('수습 만료일을 계산할 수 없습니다.', 'error');

  const confirmedType = piContract.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION ? CONTRACT_TYPE.REGULAR : CONTRACT_TYPE.FIXED;

  const confirmMsg =
    `수습 계약(${contractTypeLabel(piContract.contract_type)})을 기반으로\n` +
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
      remote_area_allowance: gv('pi-remote-area') || 0,
      site_allowance:     gv('pi-site')    || 0,
      skill_allowance:    gv('pi-skill')   || 0,
      license_allowance:  gv('pi-license') || 0,
      hazard_allowance:   gv('pi-hazard') || 0,
      overtime_pay:    c.otPay    || 0,
      night_pay:       c.nightPay || 0,
      holiday_pay:     c.holPay   || 0,
      ..._getPITransportFields(),
      transport_type:     _piTransportType,
      transport_pay_type: _getPIPayTypeVal('transport'),
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
      fitness_allowance:   gv('pi-fitness')  || 0,
      fitness_pay_type:    _getPIPayTypeVal('fitness'),
      self_dev_allowance:  gv('pi-self-dev') || 0,
      self_dev_pay_type:   _getPIPayTypeVal('self_dev'),
      book_allowance:      gv('pi-book')     || 0,
      book_pay_type:       _getPIPayTypeVal('book'),
      overseas_allowance:  gv('pi-overseas') || 0,
      overseas_pay_type:   _getPIPayTypeVal('overseas'),
      contract_etc_allowance: 0,
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
      year_end_tax_adjust_memo: document.getElementById('pi-yearend-memo').value || '',
      health_insurance_adjust: gv('pi-health-adj'),
      health_insurance_adjust_memo: document.getElementById('pi-health-adj-memo').value || '',
      health_insurance_adjust_retro: gv('pi-health-adj-retro'),
      health_insurance_adjust_yearend: gv('pi-health-adj-yearend'),
      health_insurance_adjust_yearend_memo: document.getElementById('pi-health-adj-yearend-memo')?.value || '',
      ltcare_adjust_yearend: gv('pi-ltcare-adj-yearend'),
      ltcare_adjust_yearend_memo: document.getElementById('pi-ltcare-adj-yearend-memo')?.value || '',
      advance_deduction:  gv('pi-advance'),
      advance_deduction_memo: document.getElementById('pi-advance-memo')?.value || '',
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
    toast(`✔ ${yr}년 ${mo}월 급여 저장 완료 (채용확정 계약 기준)\n고용형태: ${contractTypeLabel(confirmedType)}(으)로 변경됨`, 'success');
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
  loadPIEmployees().then(() => {
    // 직원 선택
    const empSel = document.getElementById('pi-employee');
    empSel.value = employeeId;
    loadPIContract();
  });
  // 연월 설정
  document.getElementById('pi-year').value = year;
  document.getElementById('pi-month').value = month;
  // 신규 입력 모드 보장 (수정 배너 숨김)
  piEditPayrollId = null;
  // pi-edit-banner 제거됨 — 드롭존만 복원
  document.getElementById('pi-upload-drop-zone').style.display = '';
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
  // ★ 수정 모드 ID를 showPage 이전에 먼저 설정
  //   → selectPICompany()가 수정 모드 진입임을 감지해
  //     pi-form-section 숨김·년월 초기화를 건너뛸 수 있도록 함
  piEditPayrollId=payrollId;
  _updatePICancelBtn();
  // 급여 입력 페이지로 이동
  const piMenuItem=document.querySelector('[data-page="payroll-input"]');
  showPage('payroll-input', piMenuItem);
  // 저장 버튼 텍스트를 "수정 저장"으로 변경
  document.querySelectorAll('#page-payroll-input .btn-primary').forEach(btn=>{
    if(btn.textContent.includes('급여 저장')||btn.textContent.includes('저장')){
      btn.innerHTML='<i class="fas fa-save"></i> 수정 저장';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-warning');
    }
  });
  // 엑셀 업로드 드롭존 숨김 + 임시저장 복원 배너 숨김 (수정 모드에서는 불필요)
  document.getElementById('pi-upload-drop-zone').style.display='none';
  const _editDraftBannerHide = document.getElementById('pi-draft-banner');
  if(_editDraftBannerHide) _editDraftBannerHide.style.display = 'none';
  // ★ 수정 모드 진입 시 임시저장 전체 배너 숨김 (년월 선택 단계에서만 표시)
  const _editAllDraftBanner = document.getElementById('pi-all-draft-banner');
  if(_editAllDraftBanner) _editAllDraftBanner.style.display = 'none';
  // 고객사 칩 UI 전환
  const coEdit = allCompanies.find(x=>x.id===p.company_id);
  if(coEdit){
    document.getElementById('pi-company-select-card').style.display='none';
    document.getElementById('pi-input-section').style.display='';
    document.getElementById('pi-selected-company-label').textContent=coEdit.company_name+' 급여 입력';
    // 대상자 목록 숨기고 폼 섹션 표시 + 년월 카드 숨김
    const _tSec = document.getElementById('pi-target-list-section');
    if(_tSec) _tSec.style.display='none';
    const _fSec = document.getElementById('pi-form-section');
    if(_fSec) _fSec.style.display='';
    _syncPIPeriodSectionVisibility(true);
    // 직원 헤더 업데이트
    const _nameEl  = document.getElementById('pi-form-emp-name');
    const _badgeEl = document.getElementById('pi-form-emp-badge');
    const _cat = emp.employment_category || '';
    if(_nameEl)  _nameEl.textContent  = `${emp.name||''} (${p.pay_year}년 ${p.pay_month}월) — 수정 모드`;
    if(_badgeEl){ _badgeEl.textContent=_cat; }
    currentGlobalCompanyId   = p.company_id;
    currentGlobalCompanyName = coEdit.company_name;
  }
  // 수정 대상 급여의 직원 계약 시작일 기준 고객사 스냅샷으로 allowance_config 적용
  const _editEmpContract = (allContracts||[]).find(c => c.employee_id === p.employee_id && (c.status===CONTRACT_STATUS.ACTIVE||c.status===EMP_STATUS.ACTIVE));
  const _editContractTs  = _editEmpContract?.contract_start ? new Date(_editEmpContract.contract_start).getTime() : null;
  const _editCfgCo = (typeof getCompanySnapshotAt === 'function' && _editContractTs)
    ? (getCompanySnapshotAt(p.company_id, _editContractTs) || coEdit)
    : coEdit;
  // allowance_config 기반 옵셔널 항목 show/hide
  applyPIAllowanceConfig(_editCfgCo?.allowance_config ?? null);
  // 이미 값이 입력된 항목은 config 설정과 무관하게 강제 노출 (수정 모드 하위호환)
  _forceShowNonZeroPIRows(p);
  // 숨김 select 동기화
  const coSel=document.getElementById('pi-company');
  coSel.value=p.company_id;
  loadPIEmployees().then(() => {
    // 직원 선택
    const empSel=document.getElementById('pi-employee');
    empSel.value=p.employee_id;
    // 계약 정보 로드
    loadPIContract();
  });
  // 년도·월 설정
  document.getElementById('pi-year').value=p.pay_year;
  // 월 셀렉트에 해당 월 옵션 세팅 후 선택
  const moSel=document.getElementById('pi-month');
  moSel.value=p.pay_month;
  // 수정 모드: 년/월 세팅 후 급여 산정기간 재계산
  // (loadPIContract 시점에는 pi-year/pi-month가 아직 미세팅 → 부분월 판정 불가)
  { const _ppElEdit = document.getElementById('pi-pay-period');
    if(_ppElEdit && piContract){
      const _cTypeEdit = piContract.contract_type || '';
      const _isPartialTargetEdit =
        _cTypeEdit ===CONTRACT_TYPE.REGULAR_PROBATION || _cTypeEdit ===CONTRACT_TYPE.FIXED || _cTypeEdit ===CONTRACT_TYPE.FIXED_PROBATION;
      const _endRawEdit = piContract.salary_end_date || piContract.contract_end || '';
      if(_isPartialTargetEdit && _endRawEdit){
        const _endDateEdit  = new Date(_endRawEdit);
        const _monthEndEdit = new Date(p.pay_year, p.pay_month, 0);
        if(_endDateEdit < _monthEndEdit){
          const _coIdEdit = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
          const _coEdit   = allCompanies.find(c => c.id === _coIdEdit);
          // pay_period_month / pay_period_day 컬럼 우선 사용, fallback: pay_period 문자열 파싱
          const _coMoEdit  = _coEdit?.pay_period_month || null;
          const _coDayEdit = parseInt(_coEdit?.pay_period_day) || 1;
          const _isJeonwolEdit = _coMoEdit
            ? (_coMoEdit === '전월')
            : (_coEdit?.pay_period || '').replace(/\s/g,'').startsWith('전월');
          let _sStrEdit;
          if(_isJeonwolEdit){
            const _pm = p.pay_month === 1 ? 12 : p.pay_month - 1;
            const _py = p.pay_month === 1 ? p.pay_year - 1 : p.pay_year;
            _sStrEdit = `${_py}-${String(_pm).padStart(2,'0')}-${String(_coDayEdit).padStart(2,'0')}`;
          } else {
            _sStrEdit = `${p.pay_year}-${String(p.pay_month).padStart(2,'0')}-${String(_coDayEdit).padStart(2,'0')}`;
          }
          const _sd = new Date(_sStrEdit);
          const fmt = d => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
          _ppElEdit.value = `${fmt(_sd)}~${fmt(_endDateEdit)}`;
        }
      }
    }
  }
  // 지급·공제 필드 채우기 (공통 헬퍼로 위임)
  _fillPayrollFields(p, _editCfgCo);
  toast(`${emp.name||''} ${p.pay_year}년 ${p.pay_month}월 급여 수정 모드로 진입했습니다.`,'info');
  // 페이지 상단으로 스크롤
  window.scrollTo({top:0,behavior:'smooth'});
}

/**
 * _fillPayrollFields(p, cfgCo)
 *   확정 레코드 p의 모든 지급·공제 필드를 폼에 채운다.
 *   editPayroll() 최초 진입과 restoreEditPayroll() 재복원 모두에서 사용.
 *   cfgCo : 계약 시작일 기준 고객사 스냅샷 (allowance_config 참조용)
 *            생략 시 p.company_id 기준 현재 고객사 사용.
 */
function _fillPayrollFields(p, cfgCo){
  if(!cfgCo) cfgCo = allCompanies.find(x=>x.id===p.company_id);
  // setPIPayType 내부의 calcPI 즉시 호출을 막아
  // 행 show/hide side-effect 없이 모든 pay_type 을 한 번에 세팅
  _piContractLoading = true;
  // 지급 항목 채우기 (금액 필드는 setAmountVal로 쉼표 포맷 적용)
  setAmountVal('pi-base',       p.base_salary);
  // 주휴수당은 출근일수 기반 자동계산 — DB 저장값 복원 안 함 (calcPI에서 재계산)
  setAmountVal('pi-position',   p.position_allowance);
  setAmountVal('pi-remote-area', p.remote_area_allowance||0);
  setAmountVal('pi-site',       p.site_allowance||0);
  setAmountVal('pi-skill',      p.skill_allowance||0);
  setAmountVal('pi-license',    p.license_allowance||0);
  setAmountVal('pi-hazard',     p.hazard_allowance||0);
  // 차량유지비 복원 (항상 self_driving 고정)
  // ── pay_type 복원: DB 저장값 우선, 없으면 allowance_config 기본값 fallback ──
  // loadPIContract() 이후 실행되므로 allowance_config의 fixed 세팅이 이미 적용된 상태.
  // DB 저장값이 비어 있으면 '' 을 넘기면 fixed 배지가 사라지므로, 비어있는 경우 config 값 사용.
  const _editCfg = cfgCo?.allowance_config || {};
  const _ptRestore = (dbPt, cfgKey) => dbPt || _editCfg[`${cfgKey}_pay_type`] || (_editCfg[cfgKey] ? 'fixed' : '');
  { const ta = p.self_driving_allowance || p.transportation_allowance || p.car_maintenance || 0;
    // DB 저장된 pay_type → 없으면 allowance_config.car_pay_type fallback (다른 항목과 동일 패턴)
    const _rawPt = p.transport_pay_type || p.self_driving_pay_type || p.transportation_pay_type || '';
    const tp = _ptRestore(_rawPt, 'car');
    setAmountVal('pi-transport', ta);
    setPIPayType('transport', tp);
  }
  setAmountVal('pi-meal',          p.meal_allowance);
  setPIPayType('meal',         _ptRestore(p.meal_pay_type,          'meal'));
  setAmountVal('pi-childcare',     p.childcare_allowance||0);
  setPIPayType('childcare',     _ptRestore(p.childcare_pay_type,    'childcare'));
  setAmountVal('pi-research',      p.research_allowance||0);
  setPIPayType('research',      _ptRestore(p.research_pay_type,     'research'));
  setPIPayType('communication', _ptRestore(p.communication_pay_type,'communication'));
  setPIPayType('fitness',       _ptRestore(p.fitness_pay_type,      'fitness'));
  setPIPayType('self_dev',      _ptRestore(p.self_dev_pay_type,     'self_dev'));
  setPIPayType('book',          _ptRestore(p.book_pay_type,         'book'));
  setPIPayType('overseas',      _ptRestore(p.overseas_pay_type,     'overseas'));
  // ★ pay_type 복원이 모두 끝난 뒤 계약 고정 항목 잠금 재적용
  //   (loadPIContract 내 _setPIContractReadonly(true) 이후 setPIPayType이 다시 호출되므로
  //    fixed 항목의 select 숨김 상태가 깨질 수 있어 명시적으로 재호출)
  _setPIContractReadonly(true);
  setAmountVal('pi-fitness',    p.fitness_allowance      || 0);
  setAmountVal('pi-self-dev',   p.self_dev_allowance     || 0);
  setAmountVal('pi-book',       p.book_allowance         || 0);
  setAmountVal('pi-overseas',   p.overseas_allowance     || 0);
  document.getElementById('pi-dependents').value = p.dependents||0;
  document.getElementById('pi-ot-hours').value=p.overtime_hours||0;
  document.getElementById('pi-night-hours').value=p.night_hours||0;
  document.getElementById('pi-hol-hours').value=p.holiday_hours||0;
  const _alUsedEl = document.getElementById('pi-annual-used'); if(_alUsedEl) _alUsedEl.value = p.annual_leave_used || 0;
  setAmountVal('pi-annual-pay',    p.annual_leave_pay);
  // 정기 상여금: 계약서 고정값이 있으면 계약서 값 우선 (DB 저장값은 fallback)
  { const _contractBonus = parseFloat(piContract?.regular_bonus||0)||0;
    setAmountVal('pi-bonus', _contractBonus > 0 ? _contractBonus : (p.bonus_pay||0));
  }
  setAmountVal('pi-performance',   p.performance_pay||0);
  setAmountVal('pi-actual-expense',p.actual_expense_pay||0);
  setAmountVal('pi-communication',  p.communication_pay||0);
  setAmountVal('pi-etc-allowance',  p.etc_allowance||0);
  const _etcMemoEdit = document.getElementById('pi-etc-allowance-memo');
  if(_etcMemoEdit) _etcMemoEdit.value = p.etc_allowance_memo || '';
  // 근로 실적 (수정 모드: 기존 저장값 복원 → 자동입력 배지 숨김)
  document.getElementById('pi-work-days').value=p.work_days||0;
  // 기본급 hidden input 및 주휴수당 자동계산 (pi-base, pi-weekly-hol 갱신)
  if(typeof calcPIWorkActual === 'function') calcPIWorkActual();
  { const autoLbl = document.getElementById('pi-workdays-auto-label'); if(autoLbl) autoLbl.style.display='none'; }
  document.getElementById('pi-paydate').value=p.pay_date||'';
  // 수정 모드: 기존 지급일 유지 + readonly 제어만 적용 (값은 덮어쓰지 않음)
  _applyPIPayDate(false);
  document.getElementById('pi-note').value=p.note||'';
  // 정산/추가공제
  setAmountVal('pi-yearend',     p.year_end_tax_adjust);
  const _yeMemoEl = document.getElementById('pi-yearend-memo');
  if(_yeMemoEl) _yeMemoEl.value = p.year_end_tax_adjust_memo || '';
  setAmountVal('pi-health-adj',  p.health_insurance_adjust);
  const _haMemoEl = document.getElementById('pi-health-adj-memo');
  if(_haMemoEl) _haMemoEl.value = p.health_insurance_adjust_memo || '';
  setAmountVal('pi-health-adj-retro', p.health_insurance_adjust_retro);
  setAmountVal('pi-health-adj-yearend', p.health_insurance_adjust_yearend);
  const _hayMemoEl = document.getElementById('pi-health-adj-yearend-memo');
  if(_hayMemoEl) _hayMemoEl.value = p.health_insurance_adjust_yearend_memo || '';
  setAmountVal('pi-ltcare-adj-yearend', p.ltcare_adjust_yearend);
  const _ltMemoEl = document.getElementById('pi-ltcare-adj-yearend-memo');
  if(_ltMemoEl) _ltMemoEl.value = p.ltcare_adjust_yearend_memo || '';
  setAmountVal('pi-advance',     p.advance_deduction);
  const _advMemoEl = document.getElementById('pi-advance-memo');
  if(_advMemoEl) _advMemoEl.value = p.advance_deduction_memo || '';
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
    const wp = document.getElementById('pi-work-auto-panel');
    const sw = document.getElementById('pi-ot-pay-simple-wrap');
    if(sw) sw.style.display = 'none';
    if(wp) wp.style.display = (p.work_days||p.overtime_hours||p.night_hours||p.holiday_hours) ? '' : 'none';
  })();
  // 모든 pay_type 세팅 완료 → calcPI 잠금 해제
  _piContractLoading = false;
  // 값 있는 옵셔널 행(보육수당 등) 강제 노출 재확인 후 비정기 섹션 이동 처리
  _forceShowNonZeroPIRows(p);
  _renderPIIrregularRows();
  // 계산 갱신
  calcAnnualLeaveTable();
  calcPI();
  // ── 스냅샷 저장: 모든 필드가 채워지고 calcPI까지 완료된 시점 ──
  if(piEditPayrollId){
    _piEditSnapshot = _readPIFormSnapshot();
    _checkPIRestoreBtn(); // 진입 직후에는 비활성
  }
}

// ─── 원상복구: 수정 모드에서 원본 데이터로 전체 재복원 ───
function restoreEditPayroll(){
  if(!piEditPayrollId){
    toast('수정 모드가 아닙니다.', 'error');
    return;
  }
  if(!confirm('현재 입력 내용을 버리고 원본 데이터로 되돌리겠습니까?')) return;

  const p = allPayrolls.find(x => x.id === piEditPayrollId);
  if(!p){ toast('원본 급여 데이터를 찾을 수 없습니다.', 'error'); return; }

  // 임시저장 draft가 있으면 메모리 참조만 해제 (DB는 유지 — 복원 후 다시 임시저장 가능)
  piDraftId = null;

  // ── 계약 기준 고객사 스냅샷 취득 (allowance_config pay_type fallback에 필요) ──
  const _restoreEmpCon = (allContracts||[]).find(c =>
    c.employee_id === p.employee_id && (c.status===CONTRACT_STATUS.ACTIVE||c.status===EMP_STATUS.ACTIVE)
  );
  const _restoreConTs = _restoreEmpCon?.contract_start
    ? new Date(_restoreEmpCon.contract_start).getTime() : null;
  const _restoreCo = allCompanies.find(x => x.id === p.company_id);
  const _restoreCfgCo = (typeof getCompanySnapshotAt === 'function' && _restoreConTs)
    ? (getCompanySnapshotAt(p.company_id, _restoreConTs) || _restoreCo)
    : _restoreCo;

  // ── 년/월 복원 (부분월 산정기간도 재계산) ──
  document.getElementById('pi-year').value  = p.pay_year;
  document.getElementById('pi-month').value = p.pay_month;

  // ── 모든 지급·공제 필드 원본 값으로 덮어쓰기 ──
  // ※ applyPIAllowanceConfig 를 여기서 호출하지 않는다.
  //   수정 모드 진입 시(_editPayroll)에 이미 올바르게 적용되어 있고,
  //   원상복구는 "현재 폼 UI 구조를 유지한 채 값만 원본으로 되돌리는" 동작이다.
  //   applyPIAllowanceConfig 를 재호출하면 cfg.childcare=false 인 고객사에서
  //   보육수당 행이 숨겨지는 side-effect 가 발생한다.
  _fillPayrollFields(p, _restoreCfgCo);

  // ── 복원 후 계산 갱신 + 스냅샷 재설정 ──
  // (calcPI가 pi-std-pay 등 계산 필드를 갱신하므로, 이 시점이 진짜 "원본 상태")
  calcAnnualLeaveTable();
  calcPI();
  _piEditSnapshot = _readPIFormSnapshot(); // ← 복원 직후를 새 기준점으로

  // 수정 모드 UI는 그대로 유지
  _updatePIBottomBtns();
  _hidePrevMemoBanner();
  toast('원본 데이터로 복원했습니다.', 'info');
  window.scrollTo({top:0, behavior:'smooth'});
}

// ─── 수정 취소 ───
async function cancelEditPayroll(){
  // 수정 모드 중 임시저장한 draft 레코드가 있으면 삭제 (고아 레코드 방지)
  if(piDraftId){
    try { await api(`../tables/payrolls/${piDraftId}`, { method: 'DELETE' }); } catch(e){}
    piDraftId = null;
    await loadPayrolls();
    renderPIAllDraftBanner();
  }
  // ── 수정 모드 상태 완전 해제 ──
  piEditPayrollId  = null;
  _piEditSnapshot  = null;
  // ── 수정 배너 제거됨 — 엑셀 업로드 드롭존만 복원 ──
  const dropZone = document.getElementById('pi-upload-drop-zone');
  if(dropZone) dropZone.style.display = '';
  // ── 저장 버튼 텍스트 복원 ──
  document.querySelectorAll('#page-payroll-input .btn-primary').forEach(btn => {
    if(btn.textContent.includes('수정 저장') || btn.textContent.includes('저장')){
      btn.innerHTML = '<i class="fas fa-save"></i> 급여 저장';
      btn.style.background = '';
    }
  });
  // ── 버튼 레이블 초기화 (신규 모드로 전환) ──
  _updatePICancelBtn();
  // ── 즉시 대상자 목록으로 복귀 ──
  // (clearPI()를 거치면 직원 선택 상태에서 목록으로 안 넘어가는 문제 해소)
  piContract = null;
  if(typeof clearPIFields === 'function') clearPIFields();
  const card = document.getElementById('pi-contract-card');
  if(card) card.style.display = 'none';
  loadPITargetList();
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

  // ========================================
  //  보조 유틸
  // ========================================
  const fmt = v => Math.round(v).toLocaleString('ko-KR');
  const nv  = v => (v===''||v===null||v===undefined) ? 0 : parseFloat(v)||0;

  // ── 연도별 요율 조회 헬퍼 ──
  // _allInsuranceRates: [{insurance_type, year, period_start, period_end, rate, ...}]
  // 적용기간 내 요율이 없으면 최신 요율을 지속 적용 (갱신되지 않아도 유효)
  function _findLatestRate(type, dateStr){
    // ① 적용기간 내 정확히 매칭
    let r = _allInsuranceRates.find(r =>
      r.insurance_type===type &&
      r.period_start && r.period_end &&
      dateStr >= r.period_start && dateStr <= r.period_end
    );
    // ② 매칭 실패 시: 연도 매칭
    if(!r){
      const yr = parseInt(dateStr.slice(0,4));
      r = _allInsuranceRates.find(r => r.insurance_type===type && Number(r.year)===yr);
    }
    // ③ 그래도 없으면: 해당 유형의 최신 요율 (period_end 내림차순)
    if(!r){
      const candidates = _allInsuranceRates.filter(r=>r.insurance_type===type);
      candidates.sort((a,b)=>(b.period_end||'').localeCompare(a.period_end||''));
      r = candidates[0] || null;
    }
    return r;
  }
  function getRateForYearMonth(type, year, month){
    const dateStr = `${year}-${String(month).padStart(2,'0')}-01`;
    const r = _findLatestRate(type, dateStr);
    // DB의 rate는 % 단위 (예: 12.95)로 저장 → /100 하여 소수 비율(0.1295)로 반환
    return r ? (parseFloat(r.rate)||0) / 100 : 0;
  }

  function getCapForYearMonth(type, year, month){
    const dateStr = `${year}-${String(month).padStart(2,'0')}-01`;
    const r = _findLatestRate(type, dateStr);
    return r ? parseFloat(r.cap_amount)||0 : 0;
  }

  // ========================================
  //  1. 파일명 검증
  //  [회사명]_임금대장_YYYY년MM월.xlsx
  // ========================================
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

  // ========================================
  //  2. 시트 존재 확인
  // ========================================
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

  // ========================================
  //  3. 타이틀 행에서 회사명·년월 파싱
  //  row0: "회사명  |  YYYY년 MM월 임금대장"  (업로드용 양식)
  //        또는 "회사명  YYYY년 MM월 임금대장"  (기타 형식 허용)
  // ========================================
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

  // ========================================
  //  4. 파일명 ↔ 시트 메타 일치 확인
  // ========================================
  if(fnCoName && shCoName && fnCoName !== shCoName){
    errors.push(`❌ 회사명 불일치\n파일명: "${fnCoName}" / 시트 타이틀: "${shCoName}"`);
  }
  if(fnYear && shYear && (fnYear!==shYear || fnMonth!==shMonth)){
    errors.push(`❌ 년월 불일치\n파일명: ${fnYear}년 ${fnMonth}월 / 시트 타이틀: ${shYear}년 ${shMonth}월`);
  }

  // ========================================
  //  5. DB 고객사 매칭
  // ========================================
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

  // ========================================
  //  5-B. 검증 항목 안내 문구 갱신 (insurance_basis 반영)
  // ========================================
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

  // ========================================
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
  // ========================================

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
      '보육수당':  'childcare_allowance',
      '연구활동비':     'research_allowance',
      '연차수당':       'annual_leave_pay',
      '정기상여금':     'bonus_pay',
      '성과급':         'performance_pay',
      '실비변상적급여': 'actual_expense_pay',
      '통신비':         'communication_pay',
      '체력증진비':     'fitness_allowance',
      '자기계발비':     'self_dev_allowance',
      '도서지원비':     'book_allowance',
      '해외근무수당':   'overseas_allowance',
      '현장수당':       'site_allowance',
      '기술수당':       'skill_allowance',
      '면허수당':       'license_allowance',
      '위험수당':       'hazard_allowance',
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
    const coEmps     = allEmployees.filter(e => e.company_id===co.id && (e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE));
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
        (c.status===CONTRACT_STATUS.ACTIVE||c.status===EMP_STATUS.ACTIVE||c.status==='유효')) || null;
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
      const otherPay = (row.bonus_pay??0)+(row.performance_pay??0)+(row.site_allowance??0)+(row.skill_allowance??0)
                      +(row.license_allowance??0)+(row.communication_pay??0)+(row.fitness_allowance??0)+(row.self_dev_allowance??0)+(row.book_allowance??0)+(row.overseas_allowance??0)
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

  // ========================================
  //  7. 데이터 행 파싱 (테이블형)
  // ========================================
  const dataRows = raw.slice(headerRowIdx+1).filter(r => {
    const nm = String(r[CI.NAME]||'').trim();
    return nm && nm !== '합 계' && nm !== '합계' && nm !== '';
  });

  if(!dataRows.length){
    errors.push('❌ 데이터 행이 없습니다. 직원 데이터가 입력되어 있는지 확인하세요.');
    return showUploadReport(false, errors, warnings, calcErrors, fixedErrors, validRows);
  }

  // ========================================
  //  8. 직원 명단 검증 (테이블형)
  // ========================================
  const coEmps     = allEmployees.filter(e => e.company_id===co.id && (e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE));
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

  // ========================================
  //  9. 행별 검증
  // ========================================
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
      c.employee_id===emp.id && (c.status===CONTRACT_STATUS.ACTIVE||c.status===EMP_STATUS.ACTIVE||c.status==='유효')
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
      (e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE)
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
  const emps=allEmployees.filter(e=>e.company_id===coId&&(e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE));
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
  const emps=allEmployees.filter(e=>e.company_id===coId&&(e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE));
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
    txt(`사업자번호: ${co.business_number||'-'}  /  대표자: ${getCompanyRepName(co)}  /  급여지급일: ${co.pay_day||'-'}일  /  산정기간: ${co.pay_period_month&&co.pay_period_day?`${co.pay_period_month} ${co.pay_period_day}일부터 1개월간`:(co.pay_period&&co.pay_period.includes('~')?co.pay_period:'미설정')}`,C.COINFO_BG,C.COINFO_FG,false,9)
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
    const ct=allContracts.find(c=>c.employee_id===e.id&&(c.status===CONTRACT_STATUS.ACTIVE||c.status===EMP_STATUS.ACTIVE))||null;
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
  data1.push([txt('※ 본 임금대장은 [인사톡 노무톡]에서 자동 생성된 양식입니다. 금액 입력 후 서명·날인하여 보관하십시오.',C.GRAY,'94A3B8',false)]);

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
    const ct=allContracts.find(c=>c.employee_id===e.id&&(c.status===CONTRACT_STATUS.ACTIVE||c.status===EMP_STATUS.ACTIVE))||null;
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
      sl(getCompanyRepName(co),signBg,'374151',false),
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

// ==============================================================================
