// ============================================================================
// 급여 입력 페이지 — 전직원 임금대장 일괄 업로드 모달
// ============================================================================
function openPIUploadModal(){
  const coId = currentGlobalCompanyId;
  if(!coId){ toast('고객사를 먼저 선택하세요.','warning'); return; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);

  const co = allCompanies.find(c => c.id === coId);
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

function closePIUploadModal(){
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
function handlePIBulkUpload(event){
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
function _syncPIPeriodSectionVisibility(formVisible){
  const sec = document.getElementById('pi-period-section');
  if(!sec) return;
  sec.style.display = formVisible ? 'none' : '';
}

/**
 * '지급대상자 목록보기' 버튼 클릭 핸들러
 * - 선택된 년/월에 유효한 근로계약이 있는 해당 고객사 근로자 목록을 테이블로 표시
 */
function loadPITargetList(){
  const coId = currentGlobalCompanyId;
  if(!coId){ toast('고객사를 먼저 선택하세요.', 'warning'); return; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);
  if(!yr || !mo){ toast('년도와 월을 선택하세요.', 'warning'); return; }

  // 등기임원 / 특수관계인 데이터 보장 로드 후 재렌더링
  const _needReload = (!allExecutives || allExecutives.length === 0) || (!allRelatedParties || allRelatedParties.length === 0);
  if(_needReload){
    Promise.all([
      allExecutives && allExecutives.length > 0 ? Promise.resolve() : loadExecutives().catch(()=>{}),
      allRelatedParties && allRelatedParties.length > 0 ? Promise.resolve() : loadRelatedParties().catch(()=>{})
    ]).then(() => loadPITargetList());
    return;
  }

  // 산정기준 등록 여부 확인
  const stdCheck = _checkPIStandardsReady(yr, mo, coId);
  if(!stdCheck.ok){
    _showPIStandardsWarn(yr, mo, stdCheck.missing);
    return;
  }

  // 해당 년월의 마지막 날
  const periodStart = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const periodEnd   = new Date(yr, mo, 0).toISOString().slice(0,10); // 말일

  // 해당 고객사 + 해당 년월에 유효 계약이 있는 근로자 필터링
  // 유효 조건: is_draft=false, 파기되지 않음, 계약 기간이 해당 월과 겹침
  // terminate_pending 포함: 해지일 전까지는 급여 지급 대상
  const VALID_STATUSES = new Set([CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.PENDING, CONTRACT_STATUS.DOCS_INCOMPLETE, CONTRACT_STATUS.TERMINATE_PENDING]);
  const targetContracts = allContracts.filter(c => {
    if(c.company_id !== coId) return false;
    if(c.is_draft) return false;
    if(c.is_voided_by_amend) return false;
    if(!VALID_STATUSES.has(c.status)) return false;
    // 계약 시작일이 해당 월 말일 이전, 계약 종료일(없으면 무기한)이 해당 월 시작일 이후
    const cStart = c.contract_start || '';
    const cEnd   = c.contract_end   || '';
    if(cStart && cStart > periodEnd)   return false; // 아직 시작 안 함
    if(cEnd   && cEnd   < periodStart) return false; // 이미 종료됨
    return true;
  });

  // 중복 직원 제거 (한 직원에 계약이 여러 개면 최신 계약 1개만)
  const empContractMap = new Map();
  targetContracts.forEach(c => {
    const prev = empContractMap.get(c.employee_id);
    if(!prev || (c.contract_start||'') > (prev.contract_start||'')){
      empContractMap.set(c.employee_id, c);
    }
  });

  const targets = [...empContractMap.entries()].map(([empId, c]) => {
    const emp = allEmployees.find(e => e.id === empId);
    return { emp, contract: c, _type: 'employee' };
  }).filter(t => t.emp)
    .sort((a,b) => (a.emp.name||'').localeCompare(b.emp.name||'','ko'));

  // ── 대표자, 등기임원, 특수관계인 추가 (별도 근로계약 없음) ──
  const coData = (allCompanies||[]).find(c => c.id === coId);
  
  // 대표자
  if(coData){
    let reps = [];
    try { reps = typeof coData.representatives === 'string' ? JSON.parse(coData.representatives) : (coData.representatives || []); } catch(e){ reps = []; }
    if(!Array.isArray(reps)) reps = [];
    reps.forEach((r, i) => {
      if(r.name){
        targets.push({
          emp: { id: `rep_${coId}_${i}`, name: r.name, company_id: coId, employment_category: '대표자' },
          contract: null, _type: 'representative'
        });
      }
    });
  }

  // 등기임원
  (allExecutives||[]).filter(e => e.company_id === coId).forEach(e => {
    targets.push({
      emp: { id: e.id, name: e.name, company_id: coId, employment_category: '등기임원', position: e.position, created_at: e.created_at },
      contract: null, _type: 'executive'
    });
  });

  // 특수관계인
  (allRelatedParties||[]).filter(r => r.company_id === coId).forEach(r => {
    targets.push({
      emp: { id: r.id, name: r.name, company_id: coId, employment_category: '특수관계인', position: r.relationship, created_at: r.created_at },
      contract: null, _type: 'related_party'
    });
  });

  // ① pi-all-draft-banner 숨기기 (목록 표시 중에는 최상단 배너 숨김)
  const allDraftBanner = document.getElementById('pi-all-draft-banner');
  if(allDraftBanner) allDraftBanner.style.display = 'none';

  // ② 임시저장 직원 Map: empId → draftPayrollId
  const draftEmpMap = new Map(
    (allPayrolls||[])
      .filter(p => p.company_id===coId && p.pay_year===yr && p.pay_month===mo && p.is_draft)
      .map(p => [p.employee_id, p.id])
  );

  // ③ 확정 저장 직원 Set (is_draft=false 만)
  const paidEmpIds = new Set(
    (allPayrolls||[])
      .filter(p => p.company_id===coId && p.pay_year===yr && p.pay_month===mo && !p.is_draft)
      .map(p => p.employee_id)
  );

  // 제목·배지 업데이트
  const moLabel = `${yr}년 ${mo}월`;
  const titleEl = document.getElementById('pi-target-list-title');
  const badgeEl = document.getElementById('pi-target-list-badge');
  if(titleEl) titleEl.textContent = `${moLabel} 지급대상자 목록`;
  if(badgeEl) badgeEl.textContent = `${targets.length}명`;

  // 테이블 바디 렌더링
  const tbody = document.getElementById('pi-target-list-body');
  if(!tbody) return;

  if(!targets.length){
    tbody.innerHTML = `<tr><td colspan="6" style="padding:30px;text-align:center;color:#9ca3af;font-size:13px;">
      <i class="fas fa-inbox" style="font-size:24px;margin-bottom:8px;display:block;opacity:.4;"></i>
      ${moLabel}에 유효한 근로계약이 있는 직원이 없습니다.
    </td></tr>`;
  } else {
    const CAT_BADGE = {
      '정규직':'background:#dbeafe;color:#1d4ed8;','정규직 수습':'background:#cffafe;color:#0e7490;',
      '계약직':'background:#ede9fe;color:#6d28d9;','계약직 수습':'background:#fce7f3;color:#9d174d;',
      '일용직':'background:#fef3c7;color:#92400e;'
    };
    tbody.innerHTML = targets.map(({emp, contract, _type}) => {
      // 대표자·등기임원·특수관계인: 가상 계약 데이터
      const isVirtual = !contract;
      
      // 실제 근로계약이 존재하는지 확인 (이름 + 회사로 매칭)
      let actualContract = contract;
      if(isVirtual && emp.name){
        const matchedEmp = allEmployees.find(e => e.company_id === coId && e.name === emp.name);
        if(matchedEmp){
          const matchedContract = allContracts.find(c => 
            c.employee_id === matchedEmp.id && !c.is_draft && !c.is_voided_by_amend &&
            [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.PENDING].includes(c.status)
          );
          if(matchedContract) actualContract = matchedContract;
        }
      }
      
      const catRaw  = emp.employment_category || '';
      const cat     = CONTRACT_TYPE_LABEL[catRaw] || catRaw;
      // 대표자·등기임원·특수관계인 뱃지: 밝은회색 배경 + 짙은회색 글씨
      const catStyle = (cat==='등기임원'||cat==='특수관계인'||cat==='대표자')
        ? 'background:#e5e7eb;color:#374151;'
        : (CAT_BADGE[cat] || 'background:#f3f4f6;color:#374151;');
      
      // 계약 기간: 실제 계약이 있으면 계약기간, 없으면 등록일~무기한
      // 대표자: 등록일 없으면 고객사 자문계약 시작일 기준
      let cStart;
      if(actualContract){
        cStart = actualContract.contract_start || '-';
      } else if(emp.created_at){
        cStart = new Date(emp.created_at).toISOString().slice(0,10);
      } else if(_type === 'representative' && coData){
        cStart = coData.contract_start_date || '-';
      } else {
        cStart = '-';
      }
      const cEnd = actualContract ? (actualContract.contract_end || '무기한') : '무기한';
      
      const isDraft  = draftEmpMap.has(emp.id);
      const isPaid   = paidEmpIds.has(emp.id);
      const draftId  = isDraft ? draftEmpMap.get(emp.id) : null;
      const deptPos  = isVirtual ? (emp.position || '') : [emp.department, emp.position].filter(v=>v&&v.trim()).join('/');

      // ④-0 계약상태 배지
      const _cs = actualContract ? (actualContract.status || CONTRACT_STATUS.ACTIVE) : '';
      let contractStatusBadge;
      if(!actualContract){
        contractStatusBadge = `<span style="display:inline-block;background:#f5f3ff;color:#7c3aed;border:1px solid #c4b5fd;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;">별도계약</span>`;
      } else if(_cs === CONTRACT_STATUS.DOCS_INCOMPLETE){
        contractStatusBadge = `<span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;margin-right:3px;">유효</span>`
          + `<span style="display:inline-block;background:#fff7ed;color:#c2410c;border:1px solid #fdba74;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;">서류미비</span>`;
      } else if(CONTRACT_ACTIVE_STATUSES.includes(_cs)){
        contractStatusBadge = `<span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;">유효</span>`;
      } else if(_cs === CONTRACT_STATUS.PENDING){
        contractStatusBadge = `<span style="display:inline-block;background:#e0e7ff;color:#3730a3;border:1px solid #a5b4fc;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;">계약예정</span>`;
      } else {
        contractStatusBadge = `<span style="display:inline-block;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;">${_cs}</span>`;
      }

      // ④ 급여입력 여부 배지: isDraft(황색) > isPaid(녹색) > 미입력(주황)
      let statusBadge;
      if(isDraft){
        statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;background:#fefce8;color:#a16207;border:1px solid #fde047;border-radius:6px;padding:3px 10px;font-size:11.5px;font-weight:700;"><i class="fas fa-clock"></i> 임시저장</span>`;
      } else if(isPaid){
        statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;background:#f0fdf4;color:#16a34a;border:1px solid #86efac;border-radius:6px;padding:3px 10px;font-size:11.5px;font-weight:700;"><i class="fas fa-check-circle"></i> 입력완료</span>`;
      } else {
        statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;background:#fff7ed;color:#c2410c;border:1px solid #fdba74;border-radius:6px;padding:3px 10px;font-size:11.5px;font-weight:700;"><i class="fas fa-exclamation-circle"></i> 미입력</span>`;
      }

      // ⑤ 관리 버튼
      let actionBtn;
      const targetEmpId = emp.id;
      const targetContractId = contract ? contract.id : '';
      if(isDraft){
        actionBtn = `<button onclick="selectPITarget('${targetEmpId}','${targetContractId}','${draftId}')"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 16px;background:#d97706;color:#fff;border:1px solid #b45309;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-play-circle"></i> 이어 입력
        </button>`;
      } else if(isPaid){
        actionBtn = `<button onclick="selectPITarget('${targetEmpId}','${targetContractId}')"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 16px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-edit"></i> 수정
        </button>`;
      } else {
        actionBtn = `<button onclick="selectPITarget('${targetEmpId}','${targetContractId}')"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 16px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-calculator"></i> 입력
        </button>`;
      }

      return `<tr style="border-bottom:1px solid #f1f5f9;transition:background .12s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:12px 14px;font-weight:700;color:#111827;">
          ${emp.name}${deptPos?`<span style="font-size:11px;color:#9ca3af;font-weight:400;margin-left:5px;">${deptPos}</span>`:''}
        </td>
        <td style="padding:12px 14px;">
          <span style="font-size:11.5px;font-weight:600;border-radius:5px;padding:2px 9px;${catStyle}">${cat}</span>
        </td>
        <td style="padding:12px 14px;font-size:12px;color:#6b7280;">
          ${cStart} ~ ${cEnd}
        </td>
        <td style="padding:12px 14px;text-align:center;">${contractStatusBadge}</td>
        <td style="padding:12px 14px;text-align:center;">${statusBadge}</td>
        <td style="padding:12px 14px;text-align:center;">${actionBtn}</td>
      </tr>`;
    }).join('');
  }

  // 섹션 표시 (폼 숨김) + 년월 카드 복원
  document.getElementById('pi-target-list-section').style.display='';
  document.getElementById('pi-form-section').style.display='none';
  _syncPIPeriodSectionVisibility(false);
}

/** 대상자 목록 닫기 */
function hidePITargetList(){
  const sec = document.getElementById('pi-target-list-section');
  if(sec) sec.style.display='none';
  // pi-all-draft-banner 복원
  if(typeof renderPIAllDraftBanner === 'function') renderPIAllDraftBanner();
}

/**
 * 대상자 클릭 → 급여 입력 폼 진입
 * @param {string} empId       - 직원 ID
 * @param {string} contractId  - 계약 ID
 * @param {string|null} draftId - 임시저장 급여 ID (이어 입력 시 전달)
 */
function selectPITarget(empId, contractId, draftId=null){
  const emp      = allEmployees.find(e => e.id === empId);
  const contract = allContracts.find(c => c.id === contractId);
  if(!emp || !contract){ toast('직원 또는 계약 정보를 찾을 수 없습니다.', 'error'); return; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);

  // 직원 헤더 업데이트
  // 유효 계약의 contract_type이 현재 고용형태의 정확한 상태를 반영.
  // emp.employment_category는 갱신이 지연될 수 있으므로 contract_type을 우선 사용.
  const cat     = CONTRACT_TYPE_LABEL[contract.contract_type] || CONTRACT_TYPE_LABEL[emp.employment_category] || contract.contract_type || emp.employment_category || '';
  const CAT_COLORS = {
    '정규직':'background:#dbeafe;color:#1d4ed8;border-color:#93c5fd;',
    '정규직 수습':'background:#cffafe;color:#0e7490;border-color:#67e8f9;',
    '계약직':'background:#ede9fe;color:#6d28d9;border-color:#c4b5fd;',
    '계약직 수습':'background:#fce7f3;color:#9d174d;border-color:#f9a8d4;',
    '일용직':'background:#fef3c7;color:#92400e;border-color:#fcd34d;'
  };
  const badgeStyle = CAT_COLORS[cat] || 'background:#f3f4f6;color:#374151;border-color:#e5e7eb;';
  const nameEl  = document.getElementById('pi-form-emp-name');
  const badgeEl = document.getElementById('pi-form-emp-badge');
  if(nameEl)  nameEl.textContent  = `${emp.name} (${yr}년 ${mo}월)`;
  if(badgeEl){ badgeEl.textContent = cat; badgeEl.style.cssText = `font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px;border:1px solid;${badgeStyle}`; }

  // 숨김 select 동기화 (기존 loadPIContract 의존)
  const empSel = document.getElementById('pi-employee');
  if(empSel){
    // 옵션이 없으면 동적 추가
    if(![...empSel.options].some(o=>o.value===empId)){
      const opt = document.createElement('option');
      opt.value = empId;
      opt.textContent = emp.name;
      empSel.appendChild(opt);
    }
    // onchange 임시 제거 → value 설정 → 복원
    // (value 변경 시 onchange="loadPIContract()"가 트리거되어 이중 호출 방지)
    const _prevOnchange = empSel.onchange;
    empSel.onchange = null;
    empSel.value = empId;
    empSel.onchange = _prevOnchange;
  }

  // 폼 표시 + 년월 카드 숨김 + 임시저장 전체 배너 숨김
  document.getElementById('pi-target-list-section').style.display='none';
  document.getElementById('pi-form-section').style.display='';
  _syncPIPeriodSectionVisibility(true);
  // ★ 직원 폼 진입 시 임시저장 배너 숨김 (년월 선택 단계에서만 표시)
  const _adbHideOnSelect = document.getElementById('pi-all-draft-banner');
  if(_adbHideOnSelect) _adbHideOnSelect.style.display = 'none';

  // 계약 데이터 로드 + 자동입력 (onchange 이중 호출 없이 1회만 실행)
  loadPIContract();

  if(draftId){
    // ── '이어 입력': 임시저장 자동 복원 ──
    if(typeof piDraftId !== 'undefined') piDraftId = draftId;
    setTimeout(() => {
      if(typeof loadPIDraft === 'function') loadPIDraft();
    }, 400);
  } else {
    // 이미 확정 저장된 급여가 있으면 수정 모드로 로드
    const existingPayroll = (allPayrolls||[]).find(p =>
      p.employee_id===empId && p.company_id===currentGlobalCompanyId &&
      p.pay_year===yr && p.pay_month===mo && !p.is_draft
    );
    if(existingPayroll){
      if(typeof editPayroll === 'function') editPayroll(existingPayroll.id);
    } else {
      // ── 신규 입력 모드 진입: 수정 모드 잔존 상태 완전 해제 ──
      // 원상복구 후 목록 복귀 → 미입력 직원 선택 시 이전 piEditPayrollId가 남아
      // 수정 배너·비활성 버튼이 잔존하는 버그 방지
      piEditPayrollId = null;
      _piEditSnapshot = null;
      // pi-edit-banner 제거됨
      const _newDropZone = document.getElementById('pi-upload-drop-zone');
      if(_newDropZone) _newDropZone.style.display = '';
      // 저장 버튼 텍스트 신규 모드로 복원
      document.querySelectorAll('#page-payroll-input .btn-primary').forEach(btn => {
        if(btn.textContent.includes('수정 저장') || btn.textContent.includes('저장')){
          btn.innerHTML = '<i class="fas fa-save"></i> 급여 저장';
          btn.style.background = '';
        }
      });
      _updatePICancelBtn();
      _updatePIDraftBtnForMode();
      _updatePIBottomBtns();

      // 임시저장 배너 체크 (목록에서 직접 '입력' 클릭한 경우)
      // ※ loadPIContract()에서 _applyPIDefaultWorkDays(true)를 직접 호출하므로
      //    setTimeout 재시도 불필요 — onchange 이중호출·calcPI 중복 문제 근본 수정됨
      const _checkDraft = typeof _checkAndShowPIDraftBanner === 'function';
      if(_checkDraft) _checkAndShowPIDraftBanner(empId, yr, mo);
    }
  }
}

/** 급여 입력 폼에서 대상자 목록으로 돌아가기 */
function backToPITargetList(){
  // 수정 모드 중 이탈 시 → cancelEditPayroll()이 목록 복귀까지 처리하고 종료
  if(typeof piEditPayrollId !== 'undefined' && piEditPayrollId){
    if(typeof cancelEditPayroll === 'function') cancelEditPayroll();
    return; // cancelEditPayroll 내부에서 loadPITargetList() 호출하므로 중복 방지
  }
  // 신규 모드에서 목록으로 복귀
  piContract = null;
  if(typeof clearPIFields === 'function') clearPIFields();
  const card = document.getElementById('pi-contract-card');
  if(card) card.style.display = 'none';
  // 목록 새로고침 후 표시 (내부에서 pi-all-draft-banner 숨김 처리됨)
  loadPITargetList();
  // ※ loadPITargetList() 실패 경로(대상자 없음 등)에서도 배너 복원 보장
  // → loadPITargetList 내 return 전 배너 숨김이 이미 처리되므로 별도 복원 불필요
}

async function loadPIEmployees(){
  const co=currentGlobalCompanyId || document.getElementById('pi-company').value;
  const s=document.getElementById('pi-employee');
  s.innerHTML='<option value="">선택</option>';

  // 등기임원 / 특수관계인 데이터 보장 로드
  if(!allExecutives || allExecutives.length === 0){ await loadExecutives().catch(()=>{}); }
  if(!allRelatedParties || allRelatedParties.length === 0){ await loadRelatedParties().catch(()=>{}); }

  // 일반 직원
  [...allEmployees.filter(e=>e.company_id===co&&(e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE))].sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(e=>{const _deptPos=[e.department,e.position].filter(v=>v&&v.trim()).join('/');s.innerHTML+=`<option value="${e.id}" data-type="employee">${e.name}${_deptPos?` (${_deptPos})`:''}</option>`;});

  // 대표자 (고객사 representatives에서 추출)
  const coData = (allCompanies||[]).find(c => c.id === co);
  if(coData){
    let reps = [];
    try { reps = typeof coData.representatives === 'string' ? JSON.parse(coData.representatives) : (coData.representatives || []); } catch(e){ reps = []; }
    if(!Array.isArray(reps)) reps = [];
    reps.forEach((r, i) => {
      if(r.name){
        s.innerHTML += `<option value="rep_${co}_${i}" data-type="representative" style="color:#7c3aed;">${r.name} — 대표자</option>`;
      }
    });
  }

  // 등기임원
  (allExecutives||[]).filter(e=>e.company_id===co).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(e=>{s.innerHTML+=`<option value="${e.id}" data-type="executive" style="color:#4f46e5;">${e.name} (${e.position||'등기임원'}) — 등기임원</option>`;});

  // 특수관계인
  (allRelatedParties||[]).filter(r=>r.company_id===co).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(r=>{s.innerHTML+=`<option value="${r.id}" data-type="related_party" style="color:#0891b2;">${r.name} (${r.relationship||'특수관계인'}) — 특수관계인</option>`;});

  document.getElementById('pi-contract-card').style.display='none';
  piContract=null;clearPIFields();
}
// ── 연차 현황 표 계산·렌더링 ──
function calcAnnualLeaveTable(){
  const box = document.getElementById('pi-annual-leave-box');
  if(!box) return;

  // 계약서 없거나 일용직이면 표 숨김
  if(!piContract || piContract.contract_type ===CONTRACT_TYPE.DAILY){
    box.style.display = 'none';
    return;
  }

  // ── 총 발생 연차: 계약서 저장값 대신 규정에 따라 동적 계산 ──
  // 입사일(hire_date) → 고객사 annual_leave_basis → calcAnnualLeaveDays()
  const empId   = document.getElementById('pi-employee')?.value || '';
  const empData = (allEmployees || []).find(e => e.id === empId) || {};
  const hireDate = empData.hire_date || piContract.contract_start || '';

  const coId   = currentGlobalCompanyId || document.getElementById('pi-company')?.value || '';
  const co     = (allCompanies || []).find(c => c.id === coId);
  const basis  = co?.annual_leave_basis || '회계년도 기준';

  // calcAnnualLeaveDays: admin-contract.js에 정의 (먼저 로드됨)
  // 입사일 기준: 계약 시작일을 산정 기준일로 사용
  const contractStart = piContract.contract_start || '';
  const totalDays = (typeof calcAnnualLeaveDays === 'function' && hireDate)
    ? (calcAnnualLeaveDays(hireDate, basis, contractStart) ?? 0)
    : (parseFloat(piContract.annual_leave_days) || 0);

  if(totalDays <= 0){
    box.style.display = 'none';
    return;
  }
  box.style.display = '';

  // 이번달 사용 연차
  const thisUsed = parseFloat(document.getElementById('pi-annual-used')?.value || 0) || 0;

  // 현재 입력 중인 연도·월 (empId는 위에서 이미 선언됨)
  const curYear  = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const curMonth = parseInt(document.getElementById('pi-month')?.value) || 0;

  // ── 누적 사용연차: 관리대장(allLeaveLedgers) 우선, 없으면 payroll 합산 ──
  //
  // [관리대장 있는 경우]
  //   - 관리대장 total_used 가 '이번달 제외한 누적' 기준이 아니라 '해당연도 전체 합계'이므로
  //     이번달 입력값(thisUsed)과 합산하면 안 됨.
  //   - 대신 관리대장의 month_data에서 이번달을 제외한 나머지 달의 합계를 prevCum으로 쓰고,
  //     thisUsed와 더해 cumUsed를 구함.
  //   - 관리대장에 이번달 데이터가 없으면 prevCum = total_used 전체 그대로 사용.
  //
  // [관리대장 없는 경우]
  //   - 기존 로직: allPayrolls에서 이번달 편집 레코드 제외한 합산 + thisUsed
  let prevCum = 0;
  const _ledger = (allLeaveLedgers || []).find(r =>
    r.employee_id === empId && Number(r.year) === curYear
  );

  if(_ledger){
    // 관리대장의 month_data에서 이번달을 뺀 나머지 합산
    let _md = [];
    try { _md = JSON.parse(_ledger.month_data || '[]'); } catch(e){ _md = []; }
    prevCum = _md
      .filter(d => Number(d.month) !== curMonth)
      .reduce((s, d) => s + (parseFloat(d.days) || 0), 0);
  } else {
    // 관리대장 없음 → payroll 합산 (기존 로직)
    prevCum = (allPayrolls || [])
      .filter(p => {
        if(p.employee_id !== empId) return false;
        if(piEditPayrollId && p.id === piEditPayrollId) return false; // 수정 중인 레코드 제외
        if(Number(p.pay_year) === curYear && Number(p.pay_month) === curMonth) return false; // 이번달 제외
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
  }

  const cumUsed  = prevCum + thisUsed;
  const remain   = totalDays - cumUsed;

  // 렌더링 — 총 발생 연차에 계산 근거 힌트 추가
  const _alTotalEl = document.getElementById('pi-al-total');
  if(_alTotalEl){
    // 근속연수 힌트 계산
    let _hintText = '';
    if(hireDate){
      const _hire = new Date(hireDate);
      // 회계년도 기준: 올해 1월 1일 / 입사일 기준: 오늘 날짜
      // ※ 입사일 기준은 오늘 기준 만 근속기간으로 산정 (calcAnnualLeaveDays와 동일)
      const _base = (basis !== '입사일 기준')
        ? new Date(new Date().getFullYear(), 0, 1)
        : new Date();
      const _safeBase = (_base < _hire) ? new Date() : _base;
      const _bY = _safeBase.getFullYear(), _bM = _safeBase.getMonth(), _bD = _safeBase.getDate();
      const _hY = _hire.getFullYear(),     _hM = _hire.getMonth(),     _hD = _hire.getDate();
      let _fy = _bY - _hY; if(_bM < _hM || (_bM===_hM && _bD<_hD)) _fy--;
      let _fm = (_bY-_hY)*12 + (_bM-_hM); if(_bD<_hD) _fm--;
      if(_fy < 0) _fy = 0; if(_fm < 0) _fm = 0;
      if(_fy === 0){
        // 1년 미만: 회계년도 기준이면 비례연차 공식 근거 표시
        if(basis !== '입사일 기준'){
          _hintText = `(${_fm}개월 근속 · 비례연차: ⌈15×${_fm}/12⌉ 올림)`;
        } else {
          _hintText = `(${_fm}개월 근속)`;
        }
      } else {
        _hintText = `(${_fy}년 근속)`;
      }
    }
    _alTotalEl.textContent = `${totalDays}일 ${_hintText}`;
  }
  document.getElementById('pi-al-cum').textContent     = `${cumUsed % 1 === 0 ? cumUsed.toFixed(2) : cumUsed.toFixed(2)}일`;
  const remainDisp = remain.toFixed(2);
  const remainEl = document.getElementById('pi-al-remain');
  remainEl.textContent = `${remainDisp}일`;
  // 잔여가 0 이하면 빨간 경고색
  remainEl.style.color = remain <= 0 ? '#dc2626' : '#15803d';
  remainEl.closest('tr').style.background = remain <= 0 ? '#fff1f2' : '#f0fdf4';
  remainEl.closest('tr').querySelector('td:first-child').style.color = remain <= 0 ? '#9f1239' : '#166534';

  // ── 잔여 연차 자동계산 체크박스 ON이면 연차수당 재산정 ──
  const _autoChk = document.getElementById('pi-annual-auto-chk');
  if(_autoChk && _autoChk.checked){
    const _amt = _calcAnnualAutoPayAmount(remain);
    setAmountVal('pi-annual-pay', _amt);
    calcPI();
  }
}

/**
 * 잔여 연차 × 통상시급 × 일 소정근로시간 = 연차수당
 * @param {number} remainDays - 잔여 연차일수 (음수이면 0으로 처리)
 * @returns {number} 계산된 연차수당 (원, 정수)
 */
function _calcAnnualAutoPayAmount(remainDays){
  if(!piContract) return 0;
  const days = Math.max(0, remainDays || 0);
  const hw   = parseFloat(piContract.hourly_wage)        || 0;  // 통상시급
  const hpd  = parseFloat(piContract.work_hours_per_day) || 8;  // 일 소정근로시간
  return Math.round(days * hw * hpd);
}

/**
 * 연차수당 자동계산 체크박스 토글 핸들러
 * - 체크 ON : 잔여연차 기반 자동계산 → pi-annual-pay 세팅 + readonly 스타일
 * - 체크 OFF: 직접 입력 모드 복귀 (값 유지, readonly 해제)
 */
function onAnnualAutoChkChange(){
  const chk     = document.getElementById('pi-annual-auto-chk');
  const payEl   = document.getElementById('pi-annual-pay');
  if(!chk || !payEl) return;

  if(chk.checked){
    // 잔여 연차 텍스트에서 값 파싱
    const remainText = document.getElementById('pi-al-remain')?.textContent || '0';
    const remain = parseFloat(remainText) || 0;
    const amt = _calcAnnualAutoPayAmount(remain);
    setAmountVal('pi-annual-pay', amt);
    // readonly 스타일
    payEl.readOnly = true;
    payEl.style.background = '#f3f4f6';
    payEl.style.color      = '#4f46e5';
    payEl.style.fontWeight = '600';
    payEl.style.cursor     = 'default';
    calcPI();
  } else {
    // 직접 입력 모드 복귀
    payEl.readOnly = false;
    payEl.style.background = '';
    payEl.style.color      = '';
    payEl.style.fontWeight = '';
    payEl.style.cursor     = '';
  }
}

function loadPIContract(){
  _piContractLoading = true;  // setPIPayType 내 calcPI 중복 호출 방지 시작
  const empSel = document.getElementById('pi-employee');
  const empId = empSel?.value;
  const card=document.getElementById('pi-contract-card');
  if(!empId){card.style.display='none';piContract=null;_piContractLoading=false;return;}

  // 선택된 옵션의 data-type 확인 (등기임원/특수관계인 여부)
  const selectedOption = empSel?.selectedOptions?.[0];
  const personType = selectedOption?.dataset?.type || 'employee';

  if(personType === 'executive' || personType === 'representative'){
    const exec = personType === 'executive' ? (allExecutives||[]).find(e => e.id === empId) : null;
    const repName = personType === 'representative' ? (() => {
      // empId 형식: rep_{coId}_{idx}
      const parts = empId.split('_');
      const idx = parseInt(parts.pop());
      const coId2 = parts.join('_');
      const co2 = (allCompanies||[]).find(c => c.id === coId2);
      if(co2){
        let reps = [];
        try { reps = typeof co2.representatives === 'string' ? JSON.parse(co2.representatives) : (co2.representatives || []); } catch(e){}
        return (reps[idx] || {}).name || '';
      }
      return '';
    })() : '';
    const coIdForExec = personType === 'executive' ? exec?.company_id : empId.split('_').slice(0, -1).join('_');
    piContract = {
      id: null, employee_id: empId, company_id: coIdForExec || '',
      contract_type: personType === 'executive' ? CONTRACT_TYPE.EXECUTIVE : CONTRACT_TYPE.REGULAR,
      contract_start: '', contract_end: '',
      hourly_wage: 0, base_salary: 0, daily_wage: 0, weekly_holiday_pay: 0,
      annual_salary: 0, monthly_salary_agreed: 0,
      work_hours_per_day: 0, work_days_per_week: 0,
      position_allowance: 0, transportation_allowance: 0, meal_allowance: 0,
      research_allowance: 0, communication_allowance: 0, fitness_allowance: 0,
      self_dev_allowance: 0, book_allowance: 0, overseas_allowance: 0,
      remote_area_allowance: 0, site_allowance: 0, skill_allowance: 0, license_allowance: 0,
      is_virtual: true, _personType: personType
    };
    card.style.display = 'none';
    _piContractLoading = false;
    _applyPIDefaultWorkDays(false);
    return;
  }

  if(personType === 'related_party'){
    const rel = (allRelatedParties||[]).find(r => r.id === empId);
    piContract = rel ? {
      id: null, employee_id: empId, company_id: rel.company_id,
      contract_type: CONTRACT_TYPE.RELATED_PARTY, contract_start: '', contract_end: '',
      hourly_wage: 0, base_salary: 0, daily_wage: 0, weekly_holiday_pay: 0,
      annual_salary: 0, monthly_salary_agreed: 0,
      work_hours_per_day: 0, work_days_per_week: 0,
      position_allowance: 0, transportation_allowance: 0, meal_allowance: 0,
      research_allowance: 0, communication_allowance: 0, fitness_allowance: 0,
      self_dev_allowance: 0, book_allowance: 0, overseas_allowance: 0,
      remote_area_allowance: 0, site_allowance: 0, skill_allowance: 0, license_allowance: 0,
      is_virtual: true, _personType: 'related_party'
    } : null;
    card.style.display = 'none';
    _piContractLoading = false;
    _applyPIDefaultWorkDays(false);
    return;
  }

  // 유효 계약 후보를 모두 수집한 뒤, 복수일 경우 contract_start가 가장 최근인 것을 우선 선택.
  // - 수습→채용확정 자동 생성 시 원본 수습 계약이 is_voided_by_amend=true로 무효화되지 않은
  //   예외 상황(네트워크 오류 등)에서도 가장 최근 계약이 올바르게 선택되도록 방어한다.
  {
    const _piCandidates = allContracts.filter(c=>
      c.employee_id===empId &&
      (c.status===EMP_STATUS.ACTIVE||c.status===CONTRACT_STATUS.ACTIVE||c.status===CONTRACT_STATUS.DOCS_INCOMPLETE||c.status===CONTRACT_STATUS.PENDING) &&
      !c.is_voided_by_amend && !c.is_draft
    );
    if(_piCandidates.length > 1){
      // 복수 활성 계약: contract_start 기준 내림차순 → 가장 최근 계약 선택
      _piCandidates.sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''));
    }
    piContract = _piCandidates[0] || null;
  }
  // 기준 모드 UI 전환 (고객사마다 다를 수 있으므로 직원 선택 시도 재확인)
  _switchInsuranceModeUI();
  // 계약 시작일 기준 고객사 스냅샷 취득 (계약 당시 allowance_config 사용)
  const _piLcCoId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const _piLcContractTs = piContract?.contract_start ? new Date(piContract.contract_start).getTime() : null;
  const _piLcCo = (typeof getCompanySnapshotAt === 'function' && _piLcContractTs)
    ? (getCompanySnapshotAt(_piLcCoId, _piLcContractTs) || allCompanies.find(c=>c.id===_piLcCoId))
    : allCompanies.find(c=>c.id===_piLcCoId);
  const _piLcCfg = _piLcCo?.allowance_config || {};
  /** 계약서 pay_type → 없으면 회사 설정(계약 당시) fallback */
  const _ptOf = (contractPt, cfgKey) => contractPt || _piLcCfg[`${cfgKey}_pay_type`] || (_piLcCfg[cfgKey] ? 'fixed' : '');
  // 계약 시작일 기준 allowance_config 적용 (show/hide)
  applyPIAllowanceConfig(_piLcCfg || null);

  if(piContract){
    const isPI_Daily = piContract.contract_type ===CONTRACT_TYPE.DAILY;
    // 일용직: 기본급 자리에 일급여 채움, 주휴수당 0
    setAmountVal('pi-base',          isPI_Daily ? (piContract.daily_wage||0) : piContract.base_salary);
    // 주휴수당은 출근일수 기반 자동계산 → 계약서 고정값 사용 안 함, 0으로 초기화 (calcPI에서 재계산)
    setAmountVal('pi-weekly-hol',    0);
    setAmountVal('pi-remote-area',     piContract.remote_area_allowance||0);
    setAmountVal('pi-site',           piContract.site_allowance||0);
    setAmountVal('pi-position',      piContract.position_allowance);
    // 차량유지비: 항상 self_driving 고정
    { const ta = piContract.self_driving_allowance || piContract.transportation_allowance || piContract.car_maintenance || 0;
      // 계약서 pay_type → 없으면 allowance_config.car_pay_type fallback (다른 항목과 동일 패턴)
      const _ctRawPt = piContract.transportation_pay_type || piContract.self_driving_pay_type || piContract.transport_pay_type || '';
      const tp = _ptOf(_ctRawPt, 'car');
      setAmountVal('pi-transport', ta);
      setPIPayType('transport', tp);
    }
    setAmountVal('pi-meal',          piContract.meal_allowance);
    setPIPayType('meal',             _ptOf(piContract.meal_pay_type,          'meal'));
    setAmountVal('pi-childcare',     piContract.childcare_allowance||0);
    setPIPayType('childcare',        _ptOf(piContract.childcare_pay_type,     'childcare'));
    setAmountVal('pi-research',      piContract.research_allowance||0);
    setPIPayType('research',         _ptOf(piContract.research_pay_type,      'research'));
    setPIPayType('communication',    _ptOf(piContract.communication_pay_type, 'communication'));
    setPIPayType('fitness',          _ptOf(piContract.fitness_pay_type,       'fitness'));
    setPIPayType('self_dev',         _ptOf(piContract.self_dev_pay_type,      'self_dev'));
    setPIPayType('book',             _ptOf(piContract.book_pay_type,          'book'));
    setPIPayType('overseas',         _ptOf(piContract.overseas_pay_type,      'overseas'));
    // 부양가족 수: 계약서 보육수당 부양가족 수 자동 반영
    (function(){
      const depEl = document.getElementById('pi-dependents');
      if(depEl) depEl.value = piContract.childcare_dependents || 0;
    })();
    // ── 이번달 사용연차 초기값: 관리대장에 해당 월 데이터가 있으면 우선 적용 + max 설정 ──
    {
      const _alInitEl = document.getElementById('pi-annual-used');
      if(_alInitEl){
        const _alYr = parseInt(document.getElementById('pi-year')?.value)  || 0;
        const _alMo = parseInt(document.getElementById('pi-month')?.value) || 0;
        // max: 해당 월 법정공휴일+주말 제외 소정근로일수
        if(_alYr && _alMo && typeof calcMonthWorkDays === 'function')
          _alInitEl.max = calcMonthWorkDays(_alYr, _alMo);
        let _alInitVal = 0;
        if(_alYr && _alMo){
          const _alLedger = (allLeaveLedgers || []).find(r =>
            r.employee_id === empId && Number(r.year) === _alYr
          );
          if(_alLedger){
            let _alMd = [];
            try { _alMd = JSON.parse(_alLedger.month_data || '[]'); } catch(e){}
            const _alMEntry = _alMd.find(d => Number(d.month) === _alMo);
            if(_alMEntry) _alInitVal = parseFloat(_alMEntry.days) || 0;
          }
        }
        _alInitEl.value = _alInitVal;
      }
    }
    calcAnnualLeaveTable();
    setAmountVal('pi-annual-pay',    0);
    // 급여 산정기간: 계약 만료 부분월이면 고객사 설정 시작일~만료일로 자동 계산,
    //   그 외에는 계약서에 입력된 값(pay_period) 그대로 표시
    { const _ppEl = document.getElementById('pi-pay-period');
      if(_ppEl){
        const _cType = piContract.contract_type || '';
        const _isPartialTarget =
          _cType ===CONTRACT_TYPE.REGULAR_PROBATION || _cType ===CONTRACT_TYPE.FIXED || _cType ===CONTRACT_TYPE.FIXED_PROBATION;

        // 만료일: salary_end_date 우선, 없으면 contract_end
        const _endRaw = piContract.salary_end_date || piContract.contract_end || '';

        // 급여 월
        const _ppYr = parseInt(document.getElementById('pi-year')?.value)  || 0;
        const _ppMo = parseInt(document.getElementById('pi-month')?.value) || 0;

        let _ppVal = piContract.pay_period || '';

        if(_isPartialTarget && _endRaw && _ppYr && _ppMo){
          const _endDate   = new Date(_endRaw);
          const _monthEnd  = new Date(_ppYr, _ppMo, 0);   // 해당 월 말일

          // 만료일이 해당 월 말일보다 이전 → 부분월(만근 미달)
          if(_endDate < _monthEnd){
            // 고객사 pay_period_month / pay_period_day 컬럼으로 산정기간 시작일 결정
            // fallback: pay_period 문자열 파싱 ("전월"/"당월" 시작 여부)
            const _coId  = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
            const _co    = allCompanies.find(c => c.id === _coId);
            const _coMo  = _co?.pay_period_month || null;  // '전월' | '당월' | null
            const _coDay = parseInt(_co?.pay_period_day) || 1; // 시작일 (1~31)

            // pay_period_month 컬럼 없으면 pay_period 문자열로 fallback
            const _isJeonwol = _coMo
              ? (_coMo === '전월')
              : (_co?.pay_period || '').replace(/\s/g,'').startsWith('전월');

            let _periodStartStr;
            if(_isJeonwol){
              // 전월 N일: 급여 월의 전월 지정일
              const _prevMo = _ppMo === 1 ? 12 : _ppMo - 1;
              const _prevYr = _ppMo === 1 ? _ppYr - 1 : _ppYr;
              _periodStartStr = `${_prevYr}-${String(_prevMo).padStart(2,'0')}-${String(_coDay).padStart(2,'0')}`;
            } else {
              // 당월 N일
              _periodStartStr = `${_ppYr}-${String(_ppMo).padStart(2,'0')}-${String(_coDay).padStart(2,'0')}`;
            }

            // 만료일을 MM/DD 형식으로 표시
            const _endMo  = String(_endDate.getMonth() + 1).padStart(2,'0');
            const _endDay = String(_endDate.getDate()).padStart(2,'0');
            const _endYr  = _endDate.getFullYear();
            // 시작일 파싱
            const _sDate = new Date(_periodStartStr);
            const _sMo   = String(_sDate.getMonth() + 1).padStart(2,'0');
            const _sDay  = String(_sDate.getDate()).padStart(2,'0');
            const _sYr   = _sDate.getFullYear();

            _ppVal = `${_sYr}.${_sMo}.${_sDay}~${_endYr}.${_endMo}.${_endDay}`;
          }
        }

        _ppEl.value = _ppVal;
      }
    }
    // 통상시급: 계약서 hourly_wage → readonly 표시
    { const _hwDisp = document.getElementById('pi-hourly-wage-disp');
      if(_hwDisp){
        const _hw = parseFloat(piContract.hourly_wage) || 0;
        _hwDisp.textContent = _hw > 0 ? won(_hw) : '-';
      }
    }
    // 고정 연장/야간/휴일근로수당: 계약서 → readonly 표시
    {
      const _fotDisp = document.getElementById('pi-fixed-ot-pay-disp');
      const _fniDisp = document.getElementById('pi-fixed-night-pay-disp');
      const _fhoDisp = document.getElementById('pi-fixed-hol-pay-disp');
      const _fotRow  = document.getElementById('pi-row-fixed-ot-disp');
      const _fniRow  = document.getElementById('pi-row-fixed-night-disp');
      const _fhoRow  = document.getElementById('pi-row-fixed-hol-disp');
      const _fot   = parseFloat(piContract.fixed_ot_pay)     || 0;
      const _fni   = parseFloat(piContract.fixed_night_pay)  || 0;
      const _fho   = parseFloat(piContract.fixed_hol_pay)    || 0;
      const _fotH  = parseFloat(piContract.fixed_ot_hours)   || 0;
      const _fniH  = parseFloat(piContract.fixed_night_hours)|| 0;
      const _fhoH  = parseFloat(piContract.fixed_hol_hours)  || 0;
      const _fmtH  = h => h > 0 ? ` (${h}h/월)` : '';
      if(_fotDisp) _fotDisp.textContent = _fot > 0 ? won(_fot) + _fmtH(_fotH) : '0원';
      if(_fniDisp) _fniDisp.textContent = _fni > 0 ? won(_fni) + _fmtH(_fniH) : '0원';
      if(_fhoDisp) _fhoDisp.textContent = _fho > 0 ? won(_fho) + _fmtH(_fhoH) : '0원';
      if(_fotRow)  _fotRow.style.display  = _fot > 0 ? '' : 'none';
      if(_fniRow)  _fniRow.style.display  = _fni > 0 ? '' : 'none';
      if(_fhoRow)  _fhoRow.style.display  = _fho > 0 ? '' : 'none';
    }
    // 정기 상여금: 계약서에 명시된 경우 자동 세팅 (없으면 0 초기화)
    setAmountVal('pi-bonus', parseFloat(piContract.regular_bonus||0)||0);
    setAmountVal('pi-performance',   0);
    setAmountVal('pi-actual-expense',0);
    setAmountVal('pi-communication',  0);
    setAmountVal('pi-etc-allowance',  0);
    const _etcMemoEl = document.getElementById('pi-etc-allowance-memo');
    if(_etcMemoEl) _etcMemoEl.value = '';
    document.getElementById('pi-ot-hours').value=0;
    document.getElementById('pi-night-hours').value=0;
    document.getElementById('pi-hol-hours').value=0;
    // 근로 실적 자동산출 패널 초기화 및 계약 정보 표시
    (function(){
      const wp = document.getElementById('pi-work-auto-panel');
      const sw = document.getElementById('pi-ot-pay-simple-wrap');
      if(wp) wp.style.display = 'none';
      if(sw) sw.style.display = 'none';
    })();
    // 서류미비/계약예정 상태 안내 배너 (활성이 아닌 경우) — 계약 조건은 정상 표시, 유효 계약으로 처리
    const _piContractStatusBanner = piContract.status===CONTRACT_STATUS.DOCS_INCOMPLETE
      ? `<div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:#92400e;">
           ⚠️ <b>서류미비</b> 상태 — 유효 계약으로 급여 처리됩니다. 날인 서류를 <a href="#" onclick="event.preventDefault();openContractForUpload('${piContract.id}')" style="color:#b45309;font-weight:700;text-decoration:underline;cursor:pointer;">보완</a>해 주세요.</div>`
      : piContract.status===CONTRACT_STATUS.PENDING
      ? `<div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:#92400e;">
           ⚠️ <b>계약예정</b> 상태 — 계약 효력 개시 전입니다.</div>`
      : '';
    // ── 계약정보 카드 본문 빌드 ──────────────────────────────────────────────
    {
      const _ct       = piContract.contract_type || '';
      const _isProb   = _ct ===CONTRACT_TYPE.REGULAR_PROBATION || _ct ===CONTRACT_TYPE.FIXED_PROBATION;
      const _isFixed  = _ct ===CONTRACT_TYPE.FIXED     || _ct ===CONTRACT_TYPE.FIXED_PROBATION;
      const _isRegular = _ct ===CONTRACT_TYPE.REGULAR;

      // 계약기간 포맷 (계약직·계약직 수습·일용직)
      const _fmtDate = s => s ? s.replace(/-/g, '.') : '-';
      const _contractPeriod = `${_fmtDate(piContract.contract_start)} ~ ${_fmtDate(piContract.contract_end || '무기한')}`;

      // 수습기간: contract_start ~ _calcProbationEndDate 결과
      let _probPeriodStr = '';
      if(_isProb){
        const _probEnd = _calcProbationEndDate(piContract);
        _probPeriodStr = `${_fmtDate(piContract.contract_start)} ~ ${_fmtDate(_probEnd || piContract.contract_end)}`;
      }

      // 수습 월 약정임금: probation_amt(직접입력) 우선, 없으면 monthly_salary_agreed × probation_pct/100
      let _probMonthly = 0;
      if(_isProb){
        const _pAmt = parseFloat(piContract.probation_amt) || 0;
        const _pPct = parseFloat(piContract.probation_pct) || 0;
        const _mSal = parseFloat(piContract.monthly_salary_agreed) || 0;
        _probMonthly = _pAmt > 0 ? _pAmt : Math.round(_mSal * _pPct / 100);
      }

      // 유형별 임금 행
      let _salaryLine = '';
      if(isPI_Daily){
        _salaryLine = `<b>일급여:</b> ${won(piContract.daily_wage || piContract.base_salary)}<br>`;
      } else if(_isProb){
        _salaryLine = `<b>수습 월 약정임금:</b> ${won(_probMonthly)}<br>`;
      } else if(_isFixed){
        _salaryLine = `<b>월 약정임금:</b> ${won(piContract.monthly_salary_agreed)}<br>`;
      } else {
        // 정규직
        _salaryLine = `<b>연봉:</b> ${won(piContract.annual_salary)}<br>`;
      }

      // 계약기간 행 (계약직·계약직 수습·일용직)
      const _contractPeriodLine = (isPI_Daily || _isFixed)
        ? `<b>계약기간:</b> ${_contractPeriod}<br>`
        : '';

      // 수습기간 행
      const _probPeriodLine = _isProb
        ? `<b>수습기간:</b> ${_probPeriodStr}<br>`
        : '';

      // 입사일 행 (정규직 전용)
      let _hireDateLine = '';
      if(_isRegular){
        const _piEmpData = allEmployees.find(e => e.id === empId);
        const _hireDate  = _piEmpData?.hire_date || piContract.contract_start || '';
        _hireDateLine = `<b>입사일:</b> ${_fmtDate(_hireDate)}<br>`;
      }

      // 공통 하단 행
      const _bottomLine = isPI_Daily
        ? `<b>기본근로:</b> 일${piContract.work_hours_per_day}h<br>` +
          `<b>식대:</b> ${won(piContract.meal_allowance)} · 휴게: ${piContract.break_time != null && piContract.break_time !== '' ? piContract.break_time + '분' : '-'}`
        : `<b>기본근로:</b> 일${piContract.work_hours_per_day}h · 주${piContract.work_days_per_week}일<br>` +
          `<b>식대:</b> ${won(piContract.meal_allowance)} · 휴게: ${piContract.break_time != null && piContract.break_time !== '' ? piContract.break_time + '분' : '-'}`;

      document.getElementById('pi-contract-info').innerHTML =
        _piContractStatusBanner +
        _contractPeriodLine +
        _probPeriodLine +
        _hireDateLine +
        _salaryLine +
        `<b>통상시급:</b> ${won(piContract.hourly_wage)}/h<br>` +
        _bottomLine;
    }
    card.style.display='block';
    // 계약서 고정 항목 잠금
    _setPIContractReadonly(true);
    // 계약서 금액 0인 fixed 항목 숨김 (childcare 제외)
    _hideZeroContractPIRows();
  } else {
    document.getElementById('pi-contract-info').innerHTML='⚠️ 유효한 계약서가 없습니다.';
    card.style.display='block';
    const _alBox2 = document.getElementById('pi-annual-leave-box'); if(_alBox2) _alBox2.style.display='none';
    // 계약 없으면 산정기간·통상시급·연차자동계산 초기화
    const _ppEl2 = document.getElementById('pi-pay-period'); if(_ppEl2) _ppEl2.value = '';
    const _hwDisp2 = document.getElementById('pi-hourly-wage-disp'); if(_hwDisp2) _hwDisp2.textContent = '-';
    // 계약 없으면 고정수당 행 숨김
    { const _r1=document.getElementById('pi-row-fixed-ot-disp');    if(_r1) _r1.style.display='none'; }
    { const _r2=document.getElementById('pi-row-fixed-night-disp'); if(_r2) _r2.style.display='none'; }
    { const _r3=document.getElementById('pi-row-fixed-hol-disp');   if(_r3) _r3.style.display='none'; }
    { const _chk2=document.getElementById('pi-annual-auto-chk'); if(_chk2) _chk2.checked=false;
      const _ap2=document.getElementById('pi-annual-pay');
      if(_ap2){ _ap2.readOnly=false; _ap2.style.background=''; _ap2.style.color=''; _ap2.style.fontWeight=''; _ap2.style.cursor=''; } }
    // 계약 없으면 잠금 해제
    _setPIContractReadonly(false);
  }
  // ── 수습 만료일 초과 검사 (직원/계약 변경 시 즉시 갱신) ──
  const _probOverrunOnLoad = _checkPIProbationOverrun();
  if(_probOverrunOnLoad) _setPIInputLocked(true);

  // ── 근로일수 · 총 근로시간 자동 입력 (직원 선택 시 항상 새로 계산) ──
  // 직원을 바꿔도 이전 값이 남지 않도록 필드를 먼저 초기화한 후 강제 적용
  {
    const _wdEl = document.getElementById('pi-work-days');
    const _thEl = document.getElementById('pi-total-hours');
    const _lbl  = document.getElementById('pi-workdays-auto-label');
    // max 속성: piContract 유무와 무관하게 항상 당월 달력 일수로 갱신
    {
      const _yr0 = parseInt(document.getElementById('pi-year')?.value)  || 0;
      const _mo0 = parseInt(document.getElementById('pi-month')?.value) || 0;
      if(_wdEl && _yr0 && _mo0) _wdEl.max = new Date(_yr0, _mo0, 0).getDate();
    }
    if(_wdEl) _wdEl.value = '';
    if(_thEl) _thEl.value = '';
    if(_lbl)  _lbl.style.display = 'none';
  }
  // setPIPayType 호출이 모두 끝났으므로 비정기 섹션 이동 처리 후 calcPI 1회 실행
  _renderPIIrregularRows();
  _piContractLoading = false;
  calcPI();

  // ── 근로일수 · 총 근로시간 자동 입력 (직원 선택 시 항상 새로 계산) ──
  _applyPIDefaultWorkDays(true);

  // ── 지급일 자동 입력 + readonly 제어 ──
  _applyPIPayDate(true);

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

  // ── 직전월 메모 인계 (직원 선택 시) ──
  _loadPrevMonthMemos();
}

// ── 직전월 급여 메모 인계 ──────────────────────────────────────────────────────
// 건강보험연말정산·장기요양보험연말정산·소득세연말정산·기타 4개 메모를
// 직전 달 확정 급여(is_draft=false)에서 읽어와 현재 입력폼에 채운다.
// 이미 수정 모드(piEditPayrollId)이거나 임시저장 복원 직후에는 실행하지 않는다.
function _loadPrevMonthMemos(){
  // 수정 모드 또는 임시저장 복원 상태에서는 덮어쓰지 않음
  if(piEditPayrollId) return;

  const empId = document.getElementById('pi-employee')?.value;
  const yr    = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo    = parseInt(document.getElementById('pi-month')?.value) || 0;
  if(!empId || !yr || !mo) { _hidePrevMemoBanner(); return; }

  // 직전월 계산 (1월→전년 12월)
  const prevYr = mo === 1 ? yr - 1 : yr;
  const prevMo = mo === 1 ? 12     : mo - 1;

  // 직전월 확정 급여 레코드 검색 (is_draft=false 또는 없는 레코드)
  const prevPay = (allPayrolls || []).find(p =>
    p.employee_id === empId &&
    p.pay_year    === prevYr &&
    p.pay_month   === prevMo &&
    !p.is_draft
  );

  // 인계할 메모 4개 추출
  const memos = {
    'pi-health-adj-yearend-memo': (prevPay?.health_insurance_adjust_yearend_memo || '').trim(),
    'pi-ltcare-adj-yearend-memo': (prevPay?.ltcare_adjust_yearend_memo           || '').trim(),
    'pi-yearend-memo':            (prevPay?.year_end_tax_adjust_memo              || '').trim(),
    'pi-advance-memo':            (prevPay?.advance_deduction_memo                || '').trim(),
  };

  const hasAny = Object.values(memos).some(v => v !== '');
  if(!hasAny){ _hidePrevMemoBanner(); return; }

  // 각 textarea에 값 설정 (현재 폼이 비어있을 때만 채움 — 사용자가 이미 입력한 내용 보호)
  let filled = 0;
  for(const [id, val] of Object.entries(memos)){
    const el = document.getElementById(id);
    if(el && val){
      // 현재 textarea가 비어있을 때만 인계 (수동 입력 보호)
      if((el.value || '').trim() === ''){
        el.value = val;
        filled++;
      }
    }
  }

  if(filled > 0){
    // 배너 표시
    const banner = document.getElementById('pi-prev-memo-banner');
    const title  = document.getElementById('pi-prev-memo-banner-title');
    if(banner){
      if(title) title.textContent = `직전월(${prevYr}년 ${prevMo}월) 메모 인계`;
      banner.style.display = 'block';
    }
  } else {
    _hidePrevMemoBanner();
  }
}

function _hidePrevMemoBanner(){
  const banner = document.getElementById('pi-prev-memo-banner');
  if(banner) banner.style.display = 'none';
}

function _dismissPrevMemoBanner(){
  _hidePrevMemoBanner();
}
const gv=id=>{const el=document.getElementById(id);return el?parseFloat((el.value||'').replace(/,/g,''))||0:0;};
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
// _calcPIDefaultWorkDays(contract, year, month)
//   근로계약서 기준으로 해당 연월의 기본 근로일수·총 근로시간을 자동 계산한다.
//
//   ■ 정규직 / 정규직 수습
//     → 해당 월 만근 기준 (주 소정근로일 × 해당 월 평일 카운팅)
//     → work_days_per_month 계약 필드가 있으면 그 값 사용 (가장 우선)
//
//   ■ 계약직 / 계약직 수습
//     → 급여산정기간(salary_start_date ~ salary_end_date) 우선,
//        없으면 계약 기간(contract_start ~ contract_end) 사용
//     → 급여산정 종료일이 해당 월 안에 있으면 잔여 평일만 계산 (partial_end)
//     → 급여산정 시작일이 해당 월 안에 있으면 입사 후 평일만 계산 (partial_start)
//     → 양쪽 다 해당 월 안이면 교집합 범위만 계산 (partial_both)
//
//   반환: { workDays: number, totalHours: number, mode: 'full'|'partial_end'|'partial_start'|'partial_both'|'none', description: string }
//   - workDays  : 정수 (평일 기준)
//   - totalHours: workDays × work_hours_per_day
// ──────────────────────────────────────────────────────────────────────────────
function _calcPIDefaultWorkDays(contract, year, month){
  if(!contract || !year || !month){
    return { workDays: 0, totalHours: 0, mode: 'none', description: '' };
  }

  const hpd = parseFloat(contract.work_hours_per_day) || 8;  // 일 소정근로시간
  const dpw = parseFloat(contract.work_days_per_week)  || 5;  // 주 소정근로일수
  const cType = contract.contract_type || '';
  const isFixed = cType.includes('계약직');

  // ── 해당 월의 첫날/마지막날 ─────────────────────────────────────────────
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0);           // 해당 월 말일

  // ── 계약직: 급여산정기간 우선 / fallback 계약기간 ────────────────────────
  //   salary_start_date/salary_end_date: 급여산정 시작~종료 (YYYY-MM-DD)
  //   계약직의 "이 달 근무 범위" 계산에 이 값을 사용한다.
  let periodStartDate = null;  // 계약직의 급여산정 시작일
  let periodEndDate   = null;  // 계약직의 급여산정 종료일

  if(isFixed){
    // 급여산정기간 우선
    const ssRaw = contract.salary_start_date || contract.contract_start;
    const seRaw = contract.salary_end_date   || contract.contract_end;
    periodStartDate = ssRaw ? new Date(ssRaw) : null;
    periodEndDate   = seRaw ? new Date(seRaw) : null;
  }

  // 정규직: contract_start만 참조 (입사 첫달 partial_start 처리용)
  const csDate = contract.contract_start ? new Date(contract.contract_start) : null;

  // ── 해당 월 내 실제 근무 범위 결정 ─────────────────────────────────────
  let rangeStart, rangeEnd;
  if(isFixed){
    rangeStart = (periodStartDate && periodStartDate > monthStart) ? periodStartDate : monthStart;
    rangeEnd   = (periodEndDate   && periodEndDate   < monthEnd)   ? periodEndDate   : monthEnd;
  } else {
    // 정규직: 입사 첫달이면 입사일부터, 그 외 만근
    rangeStart = (csDate && csDate > monthStart) ? csDate : monthStart;
    rangeEnd   = monthEnd;
  }

  if(rangeStart > rangeEnd){
    return { workDays: 0, totalHours: 0, mode: 'none', description: '해당 월 근무 없음' };
  }

  // ── 만근 기준 소정근로일수 ──────────────────────────────────────────────
  let fullMonthWorkDays;
  if(contract.work_days_per_month){
    fullMonthWorkDays = parseFloat(contract.work_days_per_month);
  } else {
    fullMonthWorkDays = _countWorkDays(monthStart, monthEnd, dpw);
  }

  // ── 실제 근무 범위 평일 카운팅 ─────────────────────────────────────────
  const isFullMonth = (rangeStart.getTime() === monthStart.getTime() &&
                       rangeEnd.getTime()   === monthEnd.getTime());
  let actualWorkDays;
  if(isFullMonth){
    actualWorkDays = fullMonthWorkDays;
  } else {
    actualWorkDays = _countWorkDays(rangeStart, rangeEnd, dpw);
  }
  actualWorkDays = Math.round(actualWorkDays);

  // ── 모드 판별 ───────────────────────────────────────────────────────────
  let mode, description;
  if(isFixed){
    const pStartInMonth = periodStartDate && periodStartDate >= monthStart && periodStartDate <= monthEnd;
    const pEndInMonth   = periodEndDate   && periodEndDate   >= monthStart && periodEndDate   <= monthEnd;
    const ssLabel = contract.salary_start_date || contract.contract_start || '';
    const seLabel = contract.salary_end_date   || contract.contract_end   || '';
    if(pStartInMonth && pEndInMonth){
      mode = 'partial_both';
      description = `급여산정기간 ${ssLabel}~${seLabel} (시작+종료 모두 이달)`;
    } else if(pEndInMonth){
      mode = 'partial_end';
      description = `급여산정 종료일 ${seLabel} 기준 잔여 근무`;
    } else if(pStartInMonth){
      mode = 'partial_start';
      description = `급여산정 시작일 ${ssLabel} 이후 근무`;
    } else {
      mode = 'full';
      description = `만근 기준 (계약직 – 해당 월 전체 급여산정기간 내)`;
    }
  } else {
    const csInMonth = csDate && csDate >= monthStart && csDate <= monthEnd;
    if(csInMonth){
      mode = 'partial_start';
      description = `입사일 ${contract.contract_start} 이후 근무`;
    } else {
      mode = 'full';
      description = `만근 기준 (${cType || '정규직'})`;
    }
  }

  const totalHours = actualWorkDays * hpd;
  return { workDays: actualWorkDays, totalHours, mode, description };
}

// ──────────────────────────────────────────────────────────────────────────────
// _countWorkDays(startDate, endDate, daysPerWeek)
//   startDate ~ endDate (포함) 사이의 소정근로일수를 카운팅.
//   daysPerWeek: 5 → 월~금 / 6 → 월~토 / 그 외 → 월~금 기본
// ──────────────────────────────────────────────────────────────────────────────
function _countWorkDays(startDate, endDate, daysPerWeek){
  const dpw = daysPerWeek || 5;
  // 주 마지막 휴일 요일 집합: 0=일, 6=토
  const offDays = dpw >= 6 ? new Set([0]) : new Set([0, 6]); // 5일제: 토·일 쉬고, 6일제: 일만 쉬고
  let count = 0;
  const cur = new Date(startDate);
  while(cur <= endDate){
    if(!offDays.has(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ──────────────────────────────────────────────────────────────────────────────
// _applyPIDefaultWorkDays(forceOverwrite)
//   현재 선택된 계약·연·월 기준으로 근로일수·총 근로시간을 자동 입력한다.
//   forceOverwrite=true  → 기존 값과 무관하게 항상 덮어씀 (직원 선택·연월 변경 시)
//   forceOverwrite=false → 이미 값이 있으면 readonly·배지만 재적용 (수정 모드 복원 시)
//   일용직은 날짜별 수동 입력이므로 항상 스킵.
// ──────────────────────────────────────────────────────────────────────────────
function _applyPIDefaultWorkDays(forceOverwrite){
  if(!piContract) return;
  const cType = piContract.contract_type || '';
  // 일용직은 자동 계산 제외 (날짜별 입력)
  if(cType ===CONTRACT_TYPE.DAILY) return;

  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;
  if(!yr || !mo) return;

  const wdEl = document.getElementById('pi-work-days');
  const thEl = document.getElementById('pi-total-hours');
  if(!wdEl || !thEl) return;

  // ── max 속성: 당월 달력 일수(말일)로 항상 갱신 ──
  const _maxCalDays = new Date(yr, mo, 0).getDate(); // 해당 월의 마지막 날짜 (28~31)
  wdEl.max = _maxCalDays;

  // 수정 모드 복원(forceOverwrite=false): 이미 값 있으면 배지만 업데이트 후 종료
  if(!forceOverwrite){
    const existWd = parseFloat(wdEl.value) || 0;
    const existTh = parseFloat(thEl.value) || 0;
    if(existWd > 0 || existTh > 0){
      // 기존 값 기준으로 배지 텍스트만 표시
      const yr2 = parseInt(document.getElementById('pi-year')?.value) || 0;
      const mo2 = parseInt(document.getElementById('pi-month')?.value) || 0;
      const res2 = _calcPIDefaultWorkDays(piContract, yr2, mo2);
      if(res2.workDays > 0) _updatePIWorkDaysAutoLabel(res2);
      return;
    }
  }

  const result = _calcPIDefaultWorkDays(piContract, yr, mo);
  if(result.workDays <= 0) return;

  wdEl.value = result.workDays;
  // 총 근로시간은 자동계산 함수로 세팅 (thEl 직접 세팅 제거)
  if(typeof calcPITotalHours === 'function') calcPITotalHours();
  else thEl.value = result.totalHours; // fallback

  // 자동 입력 안내 배지 업데이트
  _updatePIWorkDaysAutoLabel(result);

  // calcPI 재트리거
  if(typeof calcPIWorkActual === 'function') calcPIWorkActual();
  else if(typeof calcPI === 'function') calcPI();
}

// ──────────────────────────────────────────────────────────────────────────────
// _getPIFullMonthWorkDays()
//   현재 선택된 계약·연·월 기준으로 근로일수 입력 상한을 반환한다.
//
//   ■ 계약직(계약직/계약직 수습)이고 해당 월에 급여산정 종료일(or 계약 만료일)이
//     존재하는 경우 → 종료일까지의 소정근로일수(partial)를 상한으로 사용.
//
//   ■ 정규직 수습 / 계약직 수습이고 해당 월에 수습 종료일이 존재하는 경우
//     → 수습 종료일까지의 소정근로일수를 상한으로 사용.
//     (케이스② split: 수습+확정 합산 상한 = 월 만근일수, 각 파트는 별도 검증)
//
//   ■ 그 외(정규직 만근·이달 전체) → 월 만근 소정근로일수 반환
//     · work_days_per_month 계약 필드 우선
//     · 없으면 해당 월 소정근로일(월~금 or 월~토) 카운팅
//
//   - piContract 없으면 0 반환
// ──────────────────────────────────────────────────────────────────────────────
function _getPIFullMonthWorkDays(){
  if(!piContract) return 0;
  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;
  if(!yr || !mo) return 0;

  const cType      = piContract.contract_type || '';
  const isFixed    = cType.includes('계약직');   // 계약직 / 계약직 수습
  const isProb     = cType ===CONTRACT_TYPE.REGULAR_PROBATION || cType ===CONTRACT_TYPE.FIXED_PROBATION;
  const dpw        = parseFloat(piContract.work_days_per_week) || 5;
  const monthStart = new Date(yr, mo - 1, 1);
  const monthEnd   = new Date(yr, mo, 0);

  // 월 만근 소정근로일수 (기본 상한)
  const fullMonthDays = piContract.work_days_per_month
    ? parseFloat(piContract.work_days_per_month)
    : _countWorkDays(monthStart, monthEnd, dpw);

  // ── 수습(정규직 수습 / 계약직 수습): 수습 종료일이 이달 내면 잔여일수로 상한 제한
  //    케이스③ (이달 전체 수습)은 만근일수 그대로.
  //    케이스② (이달 중간 종료, split UI)는 메인 근로일수 필드 = 수습 파트만 해당하므로
  //    수습 종료일까지의 소정근로일수를 상한으로 쓴다.
  //    (split 분리 입력의 각 파트 상한은 _onProbSplitInputChange 에서 별도 검증)
  if(isProb){
    const probEndRaw = _calcProbationEndDate(piContract);
    if(probEndRaw){
      const probEndDate = new Date(probEndRaw);
      if(probEndDate >= monthStart && probEndDate < monthEnd){
        // 이달 중간 종료: 월시작 ~ 수습종료일 소정근로일수
        const remainingDays = _countWorkDays(monthStart, probEndDate, dpw);
        return Math.min(remainingDays, fullMonthDays);
      }
      if(probEndDate < monthStart) return 0; // 수습 만료 달 이후 (저장 자체가 차단됨)
    }
  }

  // ── 계약직(계약직 / 계약직 수습): 급여산정 종료일(or 계약 만료일)이 이달 내면 상한 제한
  if(isFixed){
    const seRaw = piContract.salary_end_date || piContract.contract_end;
    if(seRaw){
      const endDate = new Date(seRaw);
      if(endDate >= monthStart && endDate <= monthEnd){
        const remainingDays = _countWorkDays(monthStart, endDate, dpw);
        return Math.min(remainingDays, fullMonthDays);
      }
      if(endDate < monthStart) return 0;
    }
  }

  return fullMonthDays;
}

// 자동 입력 안내 배지 텍스트 업데이트
function _updatePIWorkDaysAutoLabel(result){
  const el = document.getElementById('pi-workdays-auto-label');
  if(!el) return;
  if(!result || result.workDays <= 0){
    el.style.display = 'none';
    return;
  }
  const modeLabel = {
    full:          '만근 기준',
    partial_end:   '급여산정 종료일 기준',
    partial_start: '급여산정 시작일 기준',
    partial_both:  '급여산정 시작+종료 기준',
  }[result.mode] || '';
  el.textContent  = `⚡ 자동입력 (${modeLabel} · ${result.workDays}일·${result.totalHours}h) — 직접 수정 가능`;
  el.style.display = '';
}

// ──────────────────────────────────────────────────────────────────────────────
// _applyPIPayDate(forceOverwrite)
//   고객사 pay_day × 선택된 연월 기준으로 지급일을 자동 계산하여 입력한다.
//
//   ■ 지급일 계산 규칙
//     - pay_day(숫자 or "25일" 형태) 파싱 → parseInt()
//     - 해당 월의 pay_day 일자로 날짜 문자열 구성 (YYYY-MM-DD)
//     - pay_day가 해당 월 말일 초과이면 말일(예: 30일→2월28일)
//
//   ■ readonly 제어
//     - 일용직: readonly 해제, 배지 숨김
//     - 정규직/계약직 모두: readonly 적용, 배지 "고객사 설정 자동입력" 표시
//     - pay_day 미설정 고객사: readonly 해제, 배지 "지급일 미설정" 경고
// ──────────────────────────────────────────────────────────────────────────────
function _applyPIPayDate(forceOverwrite){
  const pdEl    = document.getElementById('pi-paydate');
  const badgeEl = document.getElementById('pi-paydate-badge');
  if(!pdEl) return;

  // 모든 계약 유형에서 수정 가능 (readonly 없음)
  pdEl.readOnly = false;
  pdEl.style.background = '';
  pdEl.style.color      = '';
  pdEl.style.cursor     = '';

  // ── 급여일 우선순위: 근로계약서 pay_day > 고객사 pay_day ────────────
  const coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const co   = allCompanies.find(c => c.id === coId);
  // 근로계약서에 개별 급여일이 설정된 경우 우선 사용
  const contractPayDay = piContract?.pay_day;
  const rawPayDay = contractPayDay ? String(contractPayDay) : (co?.pay_day);
  const payDayNum = parseInt(String(rawPayDay || '').replace(/[^0-9]/g, '')) || 0;
  const isFromContract = !!(contractPayDay && payDayNum);

  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;

  if(!payDayNum || !yr || !mo){
    // pay_day 미설정: 경고 배지 표시 후 직접 입력
    if(badgeEl){
      badgeEl.textContent  = '⚠ 고객사 급여지급일 미설정 — 직접 입력';
      badgeEl.style.color  = '#b45309';
      badgeEl.style.background = '#fef3c7';
      badgeEl.style.borderColor = '#fde68a';
      badgeEl.style.display = '';
    }
    return;
  }

  // 지급일 날짜 구성: pay_day일이 해당 월 말일 초과이면 말일로 clamp
  const lastDayOfMonth = new Date(yr, mo, 0).getDate();
  const day = Math.min(payDayNum, lastDayOfMonth);
  const moStr  = String(mo).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const payDateStr = `${yr}-${moStr}-${dayStr}`;

  // 기존 값 있고 강제 덮어쓰기 아니면 값 유지
  if(!forceOverwrite && pdEl.value && pdEl.value !== '') {
    // 값 유지, 배지만 갱신
  } else {
    pdEl.value = payDateStr;
  }

  if(badgeEl){
    badgeEl.textContent   = isFromContract ? `근로계약서 설정: 매월${day}일` : `고객사 설정: 매월${day}일`;
    badgeEl.style.color   = isFromContract ? '#4f46e5' : '#6b7280';
    badgeEl.style.background = isFromContract ? '#eef2ff' : '#f3f4f6';
    badgeEl.style.borderColor = isFromContract ? '#c7d2fe' : '#e5e7eb';
    badgeEl.style.display = '';
  }
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
  const isProb = (ct.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION || ct.contract_type ===CONTRACT_TYPE.FIXED_PROBATION);
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
    (piContract.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION || piContract.contract_type ===CONTRACT_TYPE.FIXED_PROBATION);
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
    const confirmedType = piContract.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION ? '정규직' : '계약직';

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
let _prevPIYear = null;
function onPIYearMonthChange(){
  // 연도 변경 시 월 옵션 갱신 (익월 제한)
  const yrEl = document.getElementById('pi-year');
  const curYr = yrEl ? parseInt(yrEl.value) : null;
  if(curYr && curYr !== _prevPIYear){ _prevPIYear = curYr; initPIMonths(); }
  // 급여 입력 섹션이 보이는 상태(고객사 선택된 상태)일 때만 체크
  const inputSection = document.getElementById('pi-input-section');
  if(!inputSection || inputSection.style.display === 'none') return;
  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);
  if(!yr || !mo) return;

  // ── 급여 입력 폼이 열려있지 않으면 (대상자 목록 단계) 체크 스킵 ──
  const formSec = document.getElementById('pi-form-section');
  if(!formSec || formSec.style.display === 'none') return;

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

  // ── 연월 변경 시 근로일수·총 근로시간 재계산 (강제 덮어쓰기) ──
  {
    const wdEl = document.getElementById('pi-work-days');
    const thEl = document.getElementById('pi-total-hours');
    // max 속성: piContract 유무와 무관하게 항상 당월 달력 일수로 갱신
    if(wdEl && yr && mo) wdEl.max = new Date(yr, mo, 0).getDate();
    if(wdEl) wdEl.value = 0;
    if(thEl) thEl.value = 0;
    const autoLbl = document.getElementById('pi-workdays-auto-label');
    if(autoLbl) autoLbl.style.display = 'none';
    _applyPIDefaultWorkDays(true);
  }

  // ── 연월 변경 시 이번달 사용연차: 관리대장에 해당 월 데이터 있으면 우선 적용 + max 설정 ──
  {
    const _alYmEl = document.getElementById('pi-annual-used');
    const _empIdYm = document.getElementById('pi-employee')?.value || '';
    if(_alYmEl && _empIdYm && yr && mo){
      // max: 해당 월 법정공휴일+주말 제외 소정근로일수
      if(typeof calcMonthWorkDays === 'function')
        _alYmEl.max = calcMonthWorkDays(yr, mo);
      const _alLedgerYm = (allLeaveLedgers || []).find(r =>
        r.employee_id === _empIdYm && Number(r.year) === yr
      );
      let _alValYm = 0;
      if(_alLedgerYm){
        let _alMdYm = [];
        try { _alMdYm = JSON.parse(_alLedgerYm.month_data || '[]'); } catch(e){}
        const _alEntryYm = _alMdYm.find(d => Number(d.month) === mo);
        if(_alEntryYm) _alValYm = parseFloat(_alEntryYm.days) || 0;
      }
      _alYmEl.value = _alValYm;
      calcAnnualLeaveTable();
    }
  }

  // ── 연월 변경 시 지급일 재계산 ──
  _applyPIPayDate(true);

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
//   ① 각 파트의 소정근로일수 상한 클램프 (초과 시 자동 교정 + 경고)
//   ② 합계를 현재 입력된 pi-work-days · pi-total-hours 와 비교
//   ③ 분리 저장 버튼 활성/비활성을 제어한다.
// ──────────────────────────────────────────────────────────────────────────────
function _onProbSplitInputChange(){
  const hpd = parseFloat(piContract?.work_hours_per_day) || 8;
  const dpw = parseFloat(piContract?.work_days_per_week) || 5;

  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;
  const monthStart = yr && mo ? new Date(yr, mo - 1, 1) : null;
  const monthEnd   = yr && mo ? new Date(yr, mo, 0)     : null;

  // ── 각 파트별 소정근로일수 상한 계산 ──────────────────────────────────────
  // 수습 파트 상한: 월시작 ~ 수습 종료일
  // 확정 파트 상한: 수습 종료 다음날 ~ 월말
  let maxProbDays = Infinity;
  let maxPostDays = Infinity;

  if(piContract && monthStart && monthEnd){
    const probEndRaw = _calcProbationEndDate(piContract);
    if(probEndRaw){
      const probEndDate = new Date(probEndRaw);
      // 수습 파트 상한
      if(probEndDate >= monthStart){
        const cap = _countWorkDays(monthStart, probEndDate < monthEnd ? probEndDate : monthEnd, dpw);
        maxProbDays = Math.round(cap);
      }
      // 확정 파트 상한: 수습 종료일 다음날부터 월말까지
      const postStartDate = new Date(probEndDate);
      postStartDate.setDate(postStartDate.getDate() + 1);
      if(postStartDate <= monthEnd){
        const cap = _countWorkDays(postStartDate, monthEnd, dpw);
        maxPostDays = Math.round(cap);
      } else {
        maxPostDays = 0; // 수습 종료일이 월말이면 확정 파트 없음
      }
    }
  }

  // ── 파트별 클램프 적용 ─────────────────────────────────────────────────────
  const wdProbEl = document.getElementById('pi-prob-wd-prob');
  const whProbEl = document.getElementById('pi-prob-wh-prob');
  const wdPostEl = document.getElementById('pi-prob-wd-post');
  const whPostEl = document.getElementById('pi-prob-wh-post');

  // max 속성: 당월 달력 일수(말일)로 동적 설정
  const _calDaysForSplit = (yr && mo) ? new Date(yr, mo, 0).getDate() : 31;
  if(wdProbEl) wdProbEl.max = _calDaysForSplit;
  if(wdPostEl) wdPostEl.max = _calDaysForSplit;

  if(wdProbEl && maxProbDays !== Infinity){
    const v = parseFloat(wdProbEl.value) || 0;
    if(v > maxProbDays){
      wdProbEl.value = maxProbDays;
      if(whProbEl) whProbEl.value = maxProbDays * hpd;
      if(typeof toast === 'function')
        toast(`수습 기간 근로일수는 ${maxProbDays}일을 초과할 수 없습니다.`, 'warning');
    }
  }
  if(wdPostEl && maxPostDays !== Infinity){
    const v = parseFloat(wdPostEl.value) || 0;
    if(v > maxPostDays){
      wdPostEl.value = maxPostDays;
      if(whPostEl) whPostEl.value = maxPostDays * hpd;
      if(typeof toast === 'function')
        toast(`채용확정 기간 근로일수는 ${maxPostDays}일을 초과할 수 없습니다.`, 'warning');
    }
  }

  // ── 클램프 적용 후 값 재조회 ───────────────────────────────────────────────
  const wdProb  = parseFloat(wdProbEl?.value || 0) || 0;
  const whProb  = parseFloat(whProbEl?.value || 0) || 0;
  const wdPost  = parseFloat(wdPostEl?.value || 0) || 0;
  const whPost  = parseFloat(whPostEl?.value || 0) || 0;

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

// ──────────────────────────────────────────────────────────────────────────────
// calcPITotalHours()
//   총 근로시간 자동계산:
//     기본근로시간 = 근로일수 × 일 소정근로시간(hpd)
//     총 근로시간 = 기본근로시간 + 연장근로 + 야간근로 + 휴일근로
//   결과를 pi-total-hours 에 반영 (읽기전용 필드).
//   calcPIWorkActual() 과 연장·야간·휴일 oninput 에서 호출됨.
// ──────────────────────────────────────────────────────────────────────────────
function calcPITotalHours(){
  const thEl = document.getElementById('pi-total-hours');
  if(!thEl) return;

  const workDays = parseFloat(document.getElementById('pi-work-days')?.value || 0) || 0;
  const otH      = parseFloat(document.getElementById('pi-ot-hours')?.value   || 0) || 0;
  const nightH   = parseFloat(document.getElementById('pi-night-hours')?.value|| 0) || 0;
  const holH     = parseFloat(document.getElementById('pi-hol-hours')?.value  || 0) || 0;

  // 일 소정근로시간: 계약서가 있으면 계약서 기준, 없으면 8h 기본
  const hpd = piContract ? (parseFloat(piContract.work_hours_per_day) || 8) : 8;

  const basicHours = workDays * hpd;
  const total      = basicHours + otH + nightH + holH;

  // 소수점 1자리까지 (0.5 단위 입력이므로)
  thEl.value = Math.round(total * 10) / 10 || 0;
}

// ─── 구버전 호환 alias (혹시 다른 곳에서 clampPITotalHours 참조 시) ───
function clampPITotalHours(){ calcPITotalHours(); calcPI(); }

// ── 근로 실적 자동 산출 ──
// 근로일수 / OT·야간·휴일 시간 입력 시 계약서 기반 금액 자동 산출 후 표시
// 실제 기본급·수당 입력 필드는 직접 건드리지 않음 (사용자 수정 우선)
function calcPIWorkActual(){
  const workAutoPanel = document.getElementById('pi-work-auto-panel');
  const simpleWrap    = document.getElementById('pi-ot-pay-simple-wrap');

  if(!piContract){
    if(workAutoPanel) workAutoPanel.style.display = 'none';
    if(simpleWrap)    simpleWrap.style.display     = '';
    return;
  }

  // ── 근로일수 input.max: 당월 달력 일수(말일)로 갱신 ────
  {
    const _wdEl = document.getElementById('pi-work-days');
    if(_wdEl){
      const _yr2 = parseInt(document.getElementById('pi-year')?.value)  || 0;
      const _mo2 = parseInt(document.getElementById('pi-month')?.value) || 0;
      if(_yr2 && _mo2) _wdEl.max = new Date(_yr2, _mo2, 0).getDate();
    }
  }
  // 총 근로시간 자동계산: 근로일수 변경 시 즉시 반영
  calcPITotalHours();

  // 주휴수당 자동계산 (출근일수 변경 시마다 재계산)
  // ※ 기본급 disp·hidden input·수당 disp·패널 표시·5인 배지는 이어서 호출되는 calcPI()에서 일괄 처리
  calcWeeklyHolidayPay();

  calcPI();
}

function calcPI(){
  // 주휴수당 자동계산 — 매번 recalc (출근일수·계약 변경 시 반영)
  // ※ calcWeeklyHolidayPay 내부에서 setAmountVal만 호출, calcPI 재진입 없음
  if(piContract && piContract.contract_type !==CONTRACT_TYPE.DAILY){
    calcWeeklyHolidayPay();
  }

  const hw=piContract?piContract.hourly_wage:0;
  const otH=gv('pi-ot-hours'),nightH=gv('pi-night-hours'),holH=gv('pi-hol-hours');

  // ── 5인 미만 사업장 판정 ─────────────────────────────────────────────────
  const _coId = currentGlobalCompanyId;
  const _yr   = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const _mo   = parseInt(document.getElementById('pi-month')?.value) || 0;
  const _sfInfo = (_coId && _yr && _mo) ? _getPISmallFirmInfo(_coId, _yr, _mo) : { isSmall:false };
  const _isSmall = _sfInfo.isSmall;

  // 연장·야간: 5인 미만이면 가산 없음(×1.0), 5인 이상이면 법정 배율 적용
  // 휴일: 5인 미만이면 0, 5인 이상이면 8h 이하 ×1.5 / 초과분 ×2.0
  const otPay    = _isSmall ? 0 : Math.round(hw * otH    * 1.5);
  const nightPay = _isSmall ? 0 : Math.round(hw * nightH * 0.5);
  const _holH8   = Math.min(holH, 8);
  const _holHOvr = Math.max(holH - 8, 0);
  const holPay   = _isSmall ? 0 : Math.round(hw * _holH8 * 1.5 + hw * _holHOvr * 2.0);

  // 5인 미만 안내 배지 업데이트 (calcPIWorkActual 미경유 시에도 반영)
  _updatePISmallFirmBadge(_sfInfo, _yr, _mo);

  // 패널 방식 (piContract 있을 때) vs 단순 표시 (없을 때) 구분
  if(piContract){
    // ── 기본급 일할 재계산 (calcPI 단독 호출 시에도 pi-base-daily-disp 항상 최신 유지) ──
    {
      const _workDays  = parseFloat(document.getElementById('pi-work-days')?.value) || 0;
      const _isDaily   = piContract.contract_type ===CONTRACT_TYPE.DAILY;
      const _cBase     = parseFloat(piContract.base_salary) || 0;
      const _dpw       = parseFloat(piContract.work_days_per_week) || 5;
      const _cDpm      = parseFloat(piContract.work_days_per_month) || null;
      const _monthDays = _cDpm || Math.round(_dpw * 4.345);
      const _dispEl    = document.getElementById('pi-base-daily-disp');

      let _baseLabel;
      if(!_isDaily && _workDays > 0 && _monthDays > 0){
        const _calc = Math.round(_cBase / _monthDays * _workDays);
        _baseLabel = `${won(_calc)} (${won(_cBase)} ÷ ${_monthDays}일 × ${_workDays}일)`;
        setAmountVal('pi-base', _calc);
      } else if(_isDaily && _workDays > 0){
        const _dWage = parseFloat(piContract.daily_wage) || _cBase;
        const _calc  = Math.round(_dWage * _workDays);
        _baseLabel = `${won(_calc)} (일급 × ${_workDays}일)`;
        setAmountVal('pi-base', _calc);
      } else if(!_isDaily){
        _baseLabel = _cBase > 0 ? won(_cBase) : '-';
        setAmountVal('pi-base', _cBase);
      } else {
        _baseLabel = '-';
        setAmountVal('pi-base', 0);
      }
      if(_dispEl) _dispEl.textContent = _baseLabel;
    }

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
    // 패널: 계약이 있으면 항상 표시 (기본급·주휴수당도 패널에 포함)
    const wp = document.getElementById('pi-work-auto-panel');
    if(wp) wp.style.display = '';
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

  // 고정 연장/야간/휴일근로수당: 계약서 데이터에서 가져옴 (readonly)
  const _fixedOtPay    = parseFloat(piContract?.fixed_ot_pay)    || 0;
  const _fixedNightPay = parseFloat(piContract?.fixed_night_pay) || 0;
  const _fixedHolPay   = parseFloat(piContract?.fixed_hol_pay)   || 0;
  const gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')+gv('pi-skill')+gv('pi-license')+gv('pi-transport')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+otPay+nightPay+holPay+_fixedOtPay+_fixedNightPay+_fixedHolPay+gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-fitness')+gv('pi-self-dev')+gv('pi-book')+gv('pi-overseas')+gv('pi-etc-allowance');
  // 통상임금 기준: 매월 정기지급 항목만 포함 (출근일수에 따름은 제외)
  const std=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')
    +(_getPIPayTypeVal('transport')==='fixed'    ?gv('pi-transport')    :0)
    +(_getPIPayTypeVal('meal')==='fixed'         ?gv('pi-meal')         :0)
    +(_getPIPayTypeVal('research')==='fixed'     ?gv('pi-research')     :0)
    +(_getPIPayTypeVal('communication')==='fixed'?gv('pi-communication'):0)
    +(_getPIPayTypeVal('fitness')==='fixed'    ?gv('pi-fitness')    :0)
    +(_getPIPayTypeVal('self_dev')==='fixed'   ?gv('pi-self-dev')   :0)
    +(_getPIPayTypeVal('book')==='fixed'       ?gv('pi-book')       :0)
    +(_getPIPayTypeVal('overseas')==='fixed'   ?gv('pi-overseas')   :0)
    +gv('pi-skill')
    +gv('pi-license')
    +(_getPIPayTypeVal('childcare')==='fixed'    ?gv('pi-childcare')    :0)
    +otPay+nightPay+holPay+gv('pi-annual-pay');
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
  const gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')+gv('pi-skill')+gv('pi-license')
             +gv('pi-transport')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+gv('pi-fitness')+gv('pi-self-dev')+gv('pi-book')+gv('pi-overseas')
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
  const yearEnd=gv('pi-yearend'), healthAdj=gv('pi-health-adj'), healthAdjRetro=gv('pi-health-adj-retro');
  const healthAdjYearend=gv('pi-health-adj-yearend'), ltcareAdjYearend=gv('pi-ltcare-adj-yearend');
  const advance=gv('pi-advance');
  const totalDed=pension+health+ltCare+empIns+incomeTax+localTax+yearEnd+healthAdj+healthAdjRetro+healthAdjYearend+ltcareAdjYearend+advance;
  const net=gross-totalDed;
  document.getElementById('pi-ded-detail').innerHTML=`
    <div style="display:flex;justify-content:space-between"><span style="color:#888">소득세 (부양가족 ${dependents}인)</span><span>${won(incomeTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">주민세 (소득세×10%)</span><span>${won(localTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">국민연금 (보수월액×${R.pensionLabel})</span><span>${won(pension)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">건강보험 (보수월액×${R.healthLabel})</span><span>${won(health)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">장기요양보험 (건강보험×${R.ltcareLabel})</span><span>${won(ltCare)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">고용보험 (보수월액×${R.employLabel})</span><span>${won(empIns)}</span></div>`;
  _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,healthAdjRetro,healthAdjYearend,ltcareAdjYearend,advance);
}

// ── 확정액 기준: 직접 입력 + 소득세만 자동계산 ──
function calcPIFixed(gross){
  if(gross===undefined){
    const _pf=id=>parseFloat((document.getElementById(id)?.textContent||'').replace(/[^0-9]/g,'')||0);
    const otPay=   _pf('pi-ot-pay-disp')    || _pf('pi-ot-pay-disp-simple');
    const nightPay=_pf('pi-night-pay-disp') || _pf('pi-night-pay-disp-simple');
    const holPay=  _pf('pi-hol-pay-disp')   || _pf('pi-hol-pay-disp-simple');
    gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')+gv('pi-skill')+gv('pi-license')+gv('pi-transport')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+otPay+nightPay+holPay+gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-fitness')+gv('pi-self-dev')+gv('pi-book')+gv('pi-overseas')+gv('pi-etc-allowance');
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
  const yearEnd=gv('pi-yearend'), healthAdj=gv('pi-health-adj'), healthAdjRetro=gv('pi-health-adj-retro');
  const healthAdjYearend=gv('pi-health-adj-yearend'), ltcareAdjYearend=gv('pi-ltcare-adj-yearend');
  const advance=gv('pi-advance');
  const totalDed=pension+health+ltCare+empIns+incomeTax+localTax+yearEnd+healthAdj+healthAdjRetro+healthAdjYearend+ltcareAdjYearend+advance;
  const net=gross-totalDed;
  document.getElementById('pi-ded-detail-fixed').innerHTML=`
    <div style="display:flex;justify-content:space-between"><span style="color:#888">소득세 (부양가족 ${dependents}인, 자동)</span><span>${won(incomeTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">주민세 (소득세×10%, 자동)</span><span>${won(localTax)}</span></div>`;
  _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,healthAdjRetro,healthAdjYearend,ltcareAdjYearend,advance);
}

function _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,healthAdjRetro,healthAdjYearend,ltcareAdjYearend,advance){
  const updateAmounts=(g,d,n)=>{ document.getElementById(g).textContent=won(gross); document.getElementById(d).textContent=won(totalDed); document.getElementById(n).textContent=won(net); };
  updateAmounts('pi-gross-disp','pi-ded-disp','pi-net-disp');
  updateAmounts('pi-gross-disp2','pi-ded-disp2','pi-net-disp2');
  const _pv=id=>parseFloat((document.getElementById(id)?.textContent||'').replace(/[^0-9]/g,'')||0);
  window._piCalc={gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,
    otPay:   _pv('pi-ot-pay-disp')    || _pv('pi-ot-pay-disp-simple'),
    nightPay:_pv('pi-night-pay-disp') || _pv('pi-night-pay-disp-simple'),
    holPay:  _pv('pi-hol-pay-disp')   || _pv('pi-hol-pay-disp-simple')};
  // 모든 계산 완료 후 원상복구/초기화 버튼 상태 갱신
  // (calcPI가 pi-std-pay 등을 자동계산·갱신하므로, 이벤트 위임만으로는 최신 폼 상태를 반영 못할 수 있음)
  // 신규 모드: piEditPayrollId===null이어도 _checkPIRestoreBtn()이 내부에서 항상 활성 처리
  // 수정 모드: 스냅샷 있을 때만 비교 (_checkPIRestoreBtn 내부에서 null 체크)
  _checkPIRestoreBtn();
}
// ─── 상시근로자 수 산정 및 5인 미만 사업장 자동 판정 ───
/**
 * 상시근로자 수 법적 산식 적용:
 *   상시근로자 수 = 1개월간 사용한 근로자의 총 연인원 ÷ 1개월간 사업장 가동 일수
 *
 * 5인 이상 판정 특례:
 *   위 결과가 5인 미만이더라도, 가동 일수의 50% 초과하는 날에 5인 이상이 근무하면
 *   5인 이상 사업장으로 간주.
 *
 * 가동 일수: 해당 월의 모든 날짜 중 1명 이상의 근로자가 근무한 날 수
 * 연인원: 각 가동일에 근무한 근로자 수의 합계
 * 근무 여부 판단: 각 근로자의 유효 계약(is_draft=false, is_voided_by_amend=false,
 *               status ∈ {활성,active,계약예정,서류미비})의 계약기간(contract_start~
 *               contract_end)에 해당 날짜가 포함되는지 여부로 판단.
 *               (실제 출근 기록 없으므로 계약 유효 = 근무로 간주)
 *
 * @param {string} coId  고객사 ID
 * @param {number} yr    급여 년도
 * @param {number} mo    급여 월
 * @returns {{ isSmall:boolean, headcount:number, operDays:number, totalPersonDays:number }}
 */
function _getPISmallFirmInfo(coId, yr, mo){
  const NONE = { isSmall:false, headcount:0, operDays:0, totalPersonDays:0 };
  if(!coId || !yr || !mo) return NONE;

  // 상시근로자 산정 대상 상태:
  //   active, docs_incomplete, terminate_pending → 포함 (현재 근로관계 유지)
  //   pending, renewal_pending → 제외 (계약 시작일 미도래)
  const VALID_ST = new Set([CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.DOCS_INCOMPLETE, CONTRACT_STATUS.TERMINATE_PENDING]);
  const monthStart = new Date(yr, mo-1, 1);
  const monthEnd   = new Date(yr, mo, 0);   // 말일
  const totalDays  = monthEnd.getDate();

  // 이 달에 유효 계약이 걸쳐있는 근로자 목록 (직원별 최신 계약 1건)
  // ※ 대표자 본인(is_representative=1)·등기임원·특수관계인은 상시근로자 수에서 제외
  const coData = (allCompanies||[]).find(c => c.id === coId);
  let repNames = [];
  if(coData){
    try { const reps = typeof coData.representatives === 'string' ? JSON.parse(coData.representatives) : (coData.representatives || []); repNames = (Array.isArray(reps) ? reps : []).map(r => r.name).filter(Boolean); } catch(e){}
  }
  const execNames = (allExecutives||[]).filter(e => e.company_id === coId).map(e => e.name).filter(Boolean);
  const relNames  = (allRelatedParties||[]).filter(r => r.company_id === coId).map(r => r.name).filter(Boolean);
  const excludedNames = new Set([...repNames, ...execNames, ...relNames]);
  const repEmpIds = new Set(
    (allEmployees||[]).filter(e => e.company_id === coId && (e.is_representative || excludedNames.has(e.name))).map(e => e.id)
  );
  const empContractMap = new Map();
  (allContracts||[])
    .filter(c =>
      c.company_id === coId &&
      !c.is_draft && !c.is_voided_by_amend &&
      VALID_ST.has(c.status) &&
      !repEmpIds.has(c.employee_id)
    )
    .sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))
    .forEach(c => {
      if(!empContractMap.has(c.employee_id)) empContractMap.set(c.employee_id, c);
    });

  // 각 날짜별 근무 인원 계산
  // dayWorkers[d] = d번째 날(1-based) 근무 인원 수
  const dayWorkers = new Array(totalDays+1).fill(0);
  empContractMap.forEach(c => {
    const cs = c.contract_start ? new Date(c.contract_start) : monthStart;
    // 해지예정: 근로관계 종료일은 terminate_date 기준
    const ce = c.status === CONTRACT_STATUS.TERMINATE_PENDING
      ? (c.terminate_date ? new Date(c.terminate_date) : monthEnd)
      : (c.contract_end ? new Date(c.contract_end) : monthEnd);
    for(let d = 1; d <= totalDays; d++){
      const day = new Date(yr, mo-1, d);
      if(day >= cs && day <= ce) dayWorkers[d]++;
    }
  });

  // 가동 일수: 1명 이상 근무한 날
  let operDays       = 0;
  let totalPersonDays= 0;
  let daysOver5      = 0;   // 5인 이상 근무한 날 수
  for(let d = 1; d <= totalDays; d++){
    if(dayWorkers[d] > 0){
      operDays++;
      totalPersonDays += dayWorkers[d];
      if(dayWorkers[d] >= 5) daysOver5++;
    }
  }

  if(operDays === 0) return NONE;

  // 상시근로자 수 = 연인원 ÷ 가동일수
  const headcount = totalPersonDays / operDays;

  // 5인 이상 특례: 가동일의 50% 초과 날 동안 5인 이상이면 5인 이상 사업장
  const specialOver5 = daysOver5 > operDays / 2;

  const isSmall = headcount < 5 && !specialOver5;
  return { isSmall, headcount, operDays, totalPersonDays, daysOver5 };
}

/** 간편 래퍼: true = 5인 미만 */
function _getPISmallFirm(coId, yr, mo){
  return _getPISmallFirmInfo(coId, yr, mo).isSmall;
}

/**
 * 5인 미만 판정 결과를 #pi-small-firm-badge 배지에 반영.
 * calcPI() / calcPIWorkActual() 양쪽에서 공통 호출.
 * @param {Object} sfInfo  _getPISmallFirmInfo() 반환값
 * @param {number} yr      급여 연도
 * @param {number} mo      급여 월
 */
function _updatePISmallFirmBadge(sfInfo, yr, mo){
  const badge = document.getElementById('pi-small-firm-badge');
  if(!badge) return;
  if(!yr || !mo || !sfInfo){
    badge.style.display = 'none';
    return;
  }
  const { isSmall, headcount, operDays, totalPersonDays, daysOver5 } = sfInfo;
  const hcStr = (typeof headcount === 'number' && !isNaN(headcount))
    ? headcount.toFixed(2)
    : '-';
  if(isSmall){
    badge.style.display = '';
    badge.innerHTML =
      `<span style="color:#b45309;font-weight:700;">⚠ 5인 미만 사업장</span>` +
      `<span style="color:#92400e;margin-left:6px;">` +
        `상시근로자 약 <strong>${hcStr}명</strong>` +
        ` (연인원 ${totalPersonDays}명 ÷ 가동 ${operDays}일)` +
        ` — 연장·야간·휴일 <strong>가산수당 미적용</strong>` +
      `</span>`;
  } else {
    badge.style.display = '';
    let reason = '';
    if(daysOver5 > operDays / 2){
      reason = ` (5인↑ 근무일 ${daysOver5}일 > 가동일 ${operDays}일의 50% — 특례 적용)`;
    } else {
      reason = ` (상시 약 ${hcStr}명)`;
    }
    badge.innerHTML =
      `<span style="color:#166534;font-weight:700;">✔ 5인 이상 사업장${reason}</span>` +
      `<span style="color:#14532d;margin-left:6px;">` +
        `연장 ×1.5 &nbsp;·&nbsp; 야간 ×0.5 &nbsp;·&nbsp; 휴일 8h↓×1.5 / 8h↑×2.0` +
      `</span>`;
  }
}

// ─── 주휴수당 자동계산 ───
/**
 * 출근일수(workDays) 기반 주휴수당 계산.
 * 계약서의 work_days_per_week, work_hours_per_day, hourly_wage 사용.
 *
 * 규칙:
 *  - 일용직: 주휴수당 없음 (0)
 *  - 1주 소정근로시간 < 15h: 주휴수당 없음 (0)
 *  - 주 5일(소정근로시간 40h 이상): 8h × 시급 / 주 × 주수
 *  - 주 5일 미만(15h ≤ 총근로시간 < 40h): (1주 총근로시간 ÷ 5) × 시급 / 주 × 주수
 *
 * 주수 산정: workDays ÷ dpw  (나머지 < dpw이면 해당 주는 결근 간주 → floor)
 *
 * @returns {{ pay: number, desc: string }}
 */
function calcWeeklyHolidayPay(){
  const el   = document.getElementById('pi-weekly-hol');       // hidden input (DB 저장·calcPI용)
  const disp = document.getElementById('pi-weekly-hol-disp'); // 패널 표시 span
  const desc = document.getElementById('pi-weekly-hol-desc'); // 산출내역 텍스트

  const _setAll = (pay, dText) => {
    if(el)   setAmountVal('pi-weekly-hol', pay);
    if(disp) disp.textContent = won(pay);
    if(desc) desc.textContent = dText;
  };

  if(!piContract || piContract.contract_type ===CONTRACT_TYPE.DAILY){
    _setAll(0, '');
    return { pay: 0, desc: '' };
  }

  const hw        = parseFloat(piContract.hourly_wage)       || 0;
  const hpd       = parseFloat(piContract.work_hours_per_day)|| 8;   // 일 소정근로시간
  const dpw       = parseFloat(piContract.work_days_per_week)|| 5;   // 주 소정근로일수
  const weeklyH   = hpd * dpw;                                         // 1주 소정근로시간
  const workDays  = parseFloat(document.getElementById('pi-work-days')?.value || 0) || 0;

  // 15시간 미만 단시간: 주휴수당 없음
  if(weeklyH < 15){
    const d = `주 소정 ${weeklyH}h < 15h → 주휴 없음`;
    _setAll(0, d);
    return { pay: 0, desc: d };
  }

  // 해당 월 완전한 주(week) 수 = ⌊workDays ÷ dpw⌋
  // (마지막 주를 다 채우지 못하면 해당 주 주휴 미발생)
  const fullWeeks = Math.floor(workDays / dpw);

  let payPerWeek, formula;
  if(weeklyH >= 40){
    // 주 40h 이상(주 5일): 8h × 시급
    payPerWeek = Math.round(8 * hw);
    formula = `8h×${hw.toLocaleString()}원/h`;
  } else {
    // 단시간(15h ≤ 주XXh < 40h): (주간근로시간 ÷ 5) × 시급
    // 근거: 근로기준법 제18조 제3항 「단시간근로자 주휴 = (주소정근로시간÷40) × 8 × 시급」
    //   ⇒ weeklyH÷40×8 = weeklyH÷5 (수학적 동치) — 어느 식으로 계산해도 결과 동일
    const proH = weeklyH / 5;
    payPerWeek = Math.round(proH * hw);
    formula = `(${weeklyH}h÷5)×${hw.toLocaleString()}원/h=${Math.round(proH*10)/10}h×시급`;
  }

  const totalPay = payPerWeek * fullWeeks;
  const d = fullWeeks > 0
    ? `${formula} × ${fullWeeks}주 = ${totalPay.toLocaleString()}원`
    : `출근 ${workDays}일 → 완전한 주 없음 (미발생)`;

  _setAll(totalPay, d);
  return { pay: totalPay, desc: d };
}

// ─── 통상임금 지급유형 관리 ───
// 'fixed'=매월 정기지급(통상임금 포함), 'daily'=출근일수에 따름(통상임금 제외), ''=미선택
const _piPayTypes = { transport:'', meal:'', childcare:'', research:'', communication:'', fitness:'', self_dev:'', book:'', overseas:'' };
// loadPIContract() 실행 중 setPIPayType()의 calcPI() 중복 호출 방지 플래그
let _piContractLoading = false;

// ─── 차량교통비 항목 선택 관리 (차량유지비·교통비 중 택1) ───
// 차량유지비 고정 (self_driving)
const _piTransportType = 'self_driving';

function setPITransportType(type){
  // 선택옵션 제거 — 항상 self_driving 고정, no-op
}

/** JS field명(언더스코어) → HTML id용 하이픈 변환 헬퍼 */
function _piFieldToHtmlId(field){ return field.replace(/_/g, '-'); }

function setPIPayType(field, type){
  // 내부 상태만 갱신 (select·badge UI 요소 삭제됨)
  _piPayTypes[field] = type;
  // 지급유형 변경 시 std 재계산 (loadPIContract 실행 중에는 스킵 — 마지막에 일괄 calcPI 호출)
  if(!_piContractLoading) calcPI();
}

function _getPIPayTypeVal(field){
  // 'fixed'=통상임금 포함, 'daily'=제외, ''=미선택(저장 불가)
  return _piPayTypes[field] ?? '';
}

function _resetPIPayTypes(){
  ['transport','meal','childcare','research','communication','fitness','self_dev','book','overseas'].forEach(f=>{
    _piPayTypes[f] = '';
    setPIPayType(f, '');
  });
  // 차량교통비 선택 기본값 복원
  setPITransportType('self_driving');
}

// ── 회사별 allowance_config 기반 급여 입력 항목 show/hide ──
// ※ 입력 순서: 통상임금(ordinaryGroup) 먼저 → 고정수당(fixedGroup) 나중
const _PI_OPT_ROWS = [
  // ── 통상임금 설정 그룹 ──
  { key:'site',          rowId:'pi-row-site' },
  { key:'position',      rowId:'pi-row-position' },
  { key:'skill',         rowId:'pi-row-skill' },
  { key:'license',       rowId:'pi-row-license' },
  { key:'remote_area',   rowId:'pi-row-remote-area' },
  { key:'regular_bonus', rowId:'pi-row-bonus' },
  // ── 고정수당 설정 그룹 ──
  { key:'childcare',     rowId:'pi-row-childcare', ptField:'childcare' },
  { key:'research',      rowId:'pi-row-research',      ptField:'research' },
  { key:'communication', rowId:'pi-row-communication', ptField:'communication' },
  { key:'fitness',       rowId:'pi-row-fitness',       ptField:'fitness' },
  { key:'self_dev',      rowId:'pi-row-self-dev',      ptField:'self_dev' },
  { key:'book',          rowId:'pi-row-book',           ptField:'book' },
  { key:'overseas',      rowId:'pi-row-overseas',       ptField:'overseas' },
];

/** 비정기 지급 섹션으로 이동하는 항목의 한글 레이블 */
const _PI_IRREGULAR_LABELS = {
  childcare:     '보육수당',
  car:           '차량지원비',
  meal:          '식대',
  research:      '연구활동비',
  communication: '통신비',
  fitness:       '체력증진비',
  self_dev:      '자기계발비',
  book:          '도서지원비',
  overseas:      '해외근무수당',
};

/**
 * _piPayTypes 현재 상태 기반으로 daily/receipt 항목을
 * 비정기 지급 섹션(#pi-irregular-dynamic-rows)으로 이동 렌더링.
 *
 * - cfg가 아닌 _piPayTypes를 기준으로 동작하므로
 *   loadPIContract / editPayroll 에서 setPIPayType 호출이 모두 끝난
 *   뒤에 1회 실행하면 항상 올바른 위치에 배치된다.
 * - 미체크 항목(row.style.display === 'none')은 이동 대상에서 제외.
 */
function _renderPIIrregularRows(){
  const container = document.getElementById('pi-irregular-dynamic-rows');
  if(!container) return;

  // 이전에 이동된 행을 모두 원래 자리(계약 내용 섹션)로 복원
  container.querySelectorAll('.pi-row[data-irregular-moved]').forEach(row => {
    // 뱃지 제거
    const oldBadge = row.querySelector('.pi-irreg-pt-badge');
    if(oldBadge) oldBadge.remove();

    const originId = row.dataset.irregularOrigin;
    const anchor   = originId && document.getElementById(originId);
    if(anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
    }
    row.removeAttribute('data-irregular-moved');
    row.removeAttribute('data-irregular-origin');
  });

  // _piPayTypes 기준: daily/receipt 인 체크(노출) 항목을 비정기 섹션으로 이동
  _PI_OPT_ROWS.forEach(({ rowId, ptField }) => {
    if(!ptField) return;                    // pay_type 없는 항목(site 등) 제외
    const pt = _piPayTypes[ptField] || '';
    if(pt !== 'daily' && pt !== 'receipt') return;  // fixed/미선택은 정기 섹션 유지

    const row = document.getElementById(rowId);
    if(!row || row.style.display === 'none') return;  // 미체크(숨김) 항목 제외

    // 이전 형제 요소 id 를 anchor 로 기록 (복원용)
    const prevSib = row.previousElementSibling;
    row.dataset.irregularOrigin = prevSib?.id || '';
    row.dataset.irregularMoved  = '1';

    // 레이블 옆 뱃지 추가 (지급유형 표기)
    const label = row.querySelector('label');
    if(label && !label.querySelector('.pi-irreg-pt-badge')){
      const badgeText = pt === 'receipt' ? '영수증 청구' : '출근일수에 따름';
      const badge = document.createElement('span');
      badge.className = 'pi-irreg-pt-badge';
      badge.textContent = badgeText;
      badge.style.cssText = 'font-size:10px;font-weight:400;color:#6b7280;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;padding:1px 6px;margin-left:4px;vertical-align:middle;white-space:nowrap;';
      label.appendChild(badge);
    }

    // 비정기 지급 섹션으로 이동
    container.appendChild(row);
    row.style.display = '';  // 반드시 노출
  });
}

/**
 * 고객사 allowance_config 기반으로 옵셔널 항목 show/hide + pay_type 기본값 적용.
 *
 * - cfg 가 null/undefined 이거나 allowance_config 가 없는 구버전 고객사이면
 *   모든 옵셔널 항목을 숨김 처리한다 (체크된 항목만 노출 원칙).
 * - cfg 가 있으면 cfg[key] === true 인 항목만 노출.
 * - pay_type 이 daily/receipt 인 항목은 비정기 지급 섹션으로 이동.
 *
 * @param {object|null} cfg  allCompanies[*].allowance_config
 */
function applyPIAllowanceConfig(cfg){
  // ① 계약 내용 섹션 show/hide + pay_type 기본값 세팅
  _PI_OPT_ROWS.forEach(({ key, rowId, ptField }) => {
    const row = document.getElementById(rowId);
    const visible = !!(cfg && cfg[key]);
    if(row) row.style.display = visible ? '' : 'none';
    if(ptField){
      const defaultPt = visible
        ? (cfg[`${key}_pay_type`] || 'fixed')
        : '';
      setPIPayType(ptField, defaultPt);
    }
  });
  // ② 사용자 정의 통상임금 항목 렌더링
  _renderPICustomOrdinaryRows(cfg);
}

// ── 급여 입력: 사용자 정의 통상임금 항목 ──
const _PI_CUSTOM_ORD_CONTAINER = 'pi-custom-ord-container';
let _piCustomOrdCount = 0;

function _renderPICustomOrdinaryRows(cfg){
  let container = document.getElementById(_PI_CUSTOM_ORD_CONTAINER);
  if(!container){
    const refRow = document.getElementById('pi-row-license');
    if(!refRow) return;
    container = document.createElement('div');
    container.id = _PI_CUSTOM_ORD_CONTAINER;
    refRow.parentNode.insertBefore(container, refRow.nextSibling);
  }
  container.querySelectorAll('.pi-custom-ord-row').forEach(r => r.remove());
  _piCustomOrdCount = 0;

  const items = (cfg && Array.isArray(cfg._custom_ordinary)) ? cfg._custom_ordinary : [];
  if(!items.length){ container.style.display = 'none'; return; }
  container.style.display = '';

  items.forEach(item => {
    if(!item || !item.name) return;
    const idx = _piCustomOrdCount++;
    const div = document.createElement('div');
    div.className = 'pi-row pi-custom-ord-row';
    div.id = `pi-row-custom-ord-${idx}`;
    div.style.display = '';
    div.innerHTML = `
      <label>${item.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</label>
      <input type="text" inputmode="numeric" id="pi-custom-ord-${idx}" data-amount oninput="onAmountInput(this,calcPI)" />
    `;
    container.appendChild(div);
  });
}

/** 급여 입력 → 커스텀 통상임금 값 수집 */
function _getPICustomOrdinaryValues(){
  const items = [];
  for(let i = 0; i < _piCustomOrdCount; i++){
    const nameEl = document.querySelector(`#pi-row-custom-ord-${i} label`);
    const amtEl  = document.getElementById(`pi-custom-ord-${i}`);
    const name = nameEl ? nameEl.textContent.trim() : '';
    const amount = (() => { const v=(amtEl?.value||'').replace(/[^\d]/g,''); return parseInt(v)||0; })();
    if(name) items.push({ name, amount });
  }
  return items;
}

/**
 * 급여 수정 모드에서 이미 값이 입력된 옵셔널 항목은
 * allowance_config 에 체크 여부와 무관하게 강제 노출.
 * applyPIAllowanceConfig() 호출 직후에 사용.
 *
 * @param {object} p  payroll 레코드 객체
 */
function _forceShowNonZeroPIRows(p){
  // key → 급여 레코드 필드명 매핑 (communication DB 필드는 communication_pay)
  const _fieldMap = {
    regular_bonus: ['bonus_pay'],          // 급여 레코드의 bonus_pay 필드
    site        : ['site_allowance'],
    position    : ['position_allowance'],
    skill       : ['skill_allowance'],
    license     : ['license_allowance'],
    remote_area : ['remote_area_allowance'],
    research    : ['research_allowance'],
    communication: ['communication_pay'],
    fitness     : ['fitness_allowance'],
    self_dev    : ['self_dev_allowance'],
    book        : ['book_allowance'],
    overseas    : ['overseas_allowance'],
    childcare   : ['childcare_allowance'],
  };
  _PI_OPT_ROWS.forEach(({ key, rowId }) => {
    const fields = _fieldMap[key] || [];
    const hasValue = fields.some(f => Number(p[f] || 0) > 0);
    if(hasValue){
      const row = document.getElementById(rowId);
      if(row) row.style.display = '';
    }
  });
}

/**
 * 계약서 금액이 0(또는 미입력)인 정기지급(fixed) 옵셔널 항목을 숨김.
 * - 보육수당(childcare)은 매월 직접 입력 항목이므로 제외.
 * - daily/receipt 항목은 _renderPIIrregularRows()가 별도 처리하므로 제외.
 * - applyPIAllowanceConfig() + 계약서 값 세팅 이후, _renderPIIrregularRows() 이전에 호출.
 */
function _hideZeroContractPIRows(){
  if(!piContract) return;
  // key → 계약서(piContract) 필드명 매핑
  const _ctFieldMap = {
    regular_bonus: 'regular_bonus',
    site:          'site_allowance',
    position:      'position_allowance',
    skill:         'skill_allowance',
    license:       'license_allowance',
    remote_area:   'remote_area_allowance',
    research:      'research_allowance',
    communication: 'communication_allowance',
    fitness:       'fitness_allowance',
    self_dev:      'self_dev_allowance',
    book:          'book_allowance',
    overseas:      'overseas_allowance',
  };
  _PI_OPT_ROWS.forEach(({ key, rowId, ptField }) => {
    if(key === 'childcare') return;  // 보육수당: 매월 직접 입력 — 제외
    const ctField = _ctFieldMap[key];
    if(!ctField) return;
    const ctAmt = parseFloat(piContract[ctField] || 0);
    if(ctAmt > 0) return;  // 계약서 금액 있으면 그대로 표시
    // 계약서 금액 0 → 숨김 (단, daily/receipt 항목은 _renderPIIrregularRows가 처리)
    const pt = ptField ? (_piPayTypes[ptField] || '') : '';
    if(pt === 'daily' || pt === 'receipt') return;  // 비정기 항목은 건드리지 않음
    const row = document.getElementById(rowId);
    if(row) row.style.display = 'none';
  });
}

// ── 차량교통비 값 읽기 헬퍼 (선택된 항목의 금액 반환) ──
function _getPITransportAmount(){
  return gv('pi-transport');
}
// ── 차량교통비를 각 DB 필드에 매핑해 {field: value} 반환 ──
function _getPITransportFields(amount){
  const amt  = (amount !== undefined) ? amount : _getPITransportAmount();
  const type = _piTransportType;
  const pt   = _getPIPayTypeVal('transport');
  return {
    transportation_allowance: type === 'transportation' ? amt : 0,
    transportation_pay_type:  type === 'transportation' ? pt  : 'fixed',
    self_driving_allowance:   type === 'self_driving'   ? amt : 0,
    self_driving_pay_type:    type === 'self_driving'   ? pt  : 'fixed',
    transport_type:           type,
  };
}

// ── 계약서 고정 항목 readonly 토글 ──
// on=true : 계약서 값 채운 후 잠금 (편집 불가)
// on=false: 잠금 해제 (직원 미선택 or 계약 없을 때)
const _PI_CONTRACT_FIXED_IDS = [
  // ※ 'pi-base', 'pi-weekly-hol' 제외 — 자동계산 hidden input, _setPIContractReadonly 대상 아님
  'pi-site','pi-remote-area','pi-position',
  'pi-transport','pi-meal',
  'pi-research','pi-communication','pi-skill','pi-license',
  'pi-fitness','pi-self-dev','pi-book','pi-overseas'
  // ※ 'pi-childcare' 제외 — 보육수당은 매월 직접 입력 항목 (readonly 불가)
];
const _PI_PAY_TYPE_FIELDS = ['transport','meal','childcare','research','communication','fitness','self_dev','book','overseas'];

// input id → _piPayTypes 키 역매핑 (pay_type이 있는 항목만)
const _PI_ID_TO_PT_FIELD = {
  'pi-transport':   'transport',
  'pi-meal':        'meal',
  'pi-research':    'research',
  'pi-communication':'communication',
  'pi-fitness':     'fitness',
  'pi-self-dev':    'self_dev',
  'pi-book':        'book',
  'pi-overseas':    'overseas',
};

function _setPIContractReadonly(on){
  // 입력 필드 잠금/해제
  _PI_CONTRACT_FIXED_IDS.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    // daily/receipt 항목은 계약서 고정값이 없으므로 잠금 제외 (비정기 섹션에서 직접 입력)
    if(on){
      const ptField = _PI_ID_TO_PT_FIELD[id];
      const pt = ptField ? (_piPayTypes[ptField] || '') : '';
      if(pt === 'daily' || pt === 'receipt') return;
    }
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

  });

  // ── 정기 상여금(pi-bonus) 계약서 고정값 잠금/해제 ──
  // piContract.regular_bonus > 0 인 경우에만 잠금 적용
  (function(){
    const bonusEl    = document.getElementById('pi-bonus');
    const bonusBadge = document.getElementById('pi-bonus-contract-badge');
    const bonusRow   = document.getElementById('pi-row-bonus');
    const hasContractBonus = on && piContract && (parseFloat(piContract.regular_bonus)||0) > 0;
    if(bonusEl){
      if(hasContractBonus){
        bonusEl.readOnly = true;
        bonusEl.classList.add('pi-readonly-field');
        bonusEl.style.background = '#f4f6fb';
        bonusEl.style.color = '#6b7280';
        bonusEl.style.cursor = 'default';
        bonusEl.style.borderColor = '#e5e7eb';
        bonusEl._savedOninput = bonusEl.getAttribute('oninput') || 'onAmountInput(this,calcPI)';
        bonusEl.removeAttribute('oninput');
      } else {
        bonusEl.readOnly = false;
        bonusEl.classList.remove('pi-readonly-field');
        bonusEl.style.background = '';
        bonusEl.style.color = '';
        bonusEl.style.cursor = '';
        bonusEl.style.borderColor = '';
        const saved = bonusEl._savedOninput || 'onAmountInput(this,calcPI)';
        bonusEl.setAttribute('oninput', saved);
      }
    }
    if(bonusBadge) bonusBadge.style.display = hasContractBonus ? '' : 'none';

  })();

  // 지급유형 select 잠금/해제
  // ※ fixed(매월 정기지급) 항목은 select 자체가 이미 숨겨지고 배지로 대체되므로
  //   잠금 여부와 무관하게 select disabled 처리는 daily/receipt 항목에만 적용
  _PI_PAY_TYPE_FIELDS.forEach(field=>{
    const ptSel   = document.getElementById(`pi-${_piFieldToHtmlId(field)}-pay-type-select`);
    const ptBadge = document.getElementById(`pi-${_piFieldToHtmlId(field)}-pt-badge`);
    const isFixed = _piPayTypes[field] === 'fixed';
    if(ptSel){
      // fixed 배지가 보이는 동안에는 select 항상 숨김 유지 (잠금 무관)
      if(isFixed){
        ptSel.style.display = 'none';
        ptSel.disabled = false; // 내부 값은 유지, 숨김으로 편집 차단
      } else {
        ptSel.style.display = '';
        ptSel.disabled = on;
      }
    }
    // 배지 상태는 setPIPayType에서 이미 제어하므로 여기서는 건드리지 않음
    // 차량교통비 항목 선택 select 잠금
    if(field === 'transport'){
      const tSel = document.getElementById('pi-transport-type-select');
      if(tSel){ tSel.disabled = on; }
    }
  });
}

function clearPIFields(){
  // pi-dependents는 직원별 고정값이므로 여기서 초기화하지 않음 (clearPI에서만 리셋)
  const _alClearEl = document.getElementById('pi-annual-used'); if(_alClearEl) _alClearEl.value = 0;
  ['pi-base','pi-weekly-hol','pi-site','pi-remote-area','pi-position','pi-skill','pi-license','pi-transport','pi-meal','pi-childcare','pi-research','pi-fitness','pi-self-dev','pi-book','pi-overseas',
   'pi-ot-hours','pi-night-hours','pi-hol-hours',
   'pi-annual-pay','pi-bonus','pi-performance','pi-actual-expense','pi-communication','pi-etc-allowance',
   'pi-std-pay','pi-yearend','pi-yearend-memo','pi-health-adj','pi-health-adj-memo','pi-health-adj-retro','pi-advance','pi-work-days','pi-total-hours',
   'pi-pension-fixed','pi-health-fixed','pi-ltcare-fixed','pi-employ-fixed'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['pi-ot-pay-disp','pi-night-pay-disp','pi-hol-pay-disp',
   'pi-ot-pay-disp-simple','pi-night-pay-disp-simple','pi-hol-pay-disp-simple'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='0원';});
  const _baseDailyEl=document.getElementById('pi-base-daily-disp'); if(_baseDailyEl) _baseDailyEl.textContent='-';
  const _whdDesc=document.getElementById('pi-weekly-hol-desc'); if(_whdDesc) _whdDesc.textContent='';
  const _whdDisp=document.getElementById('pi-weekly-hol-disp'); if(_whdDisp) _whdDisp.textContent='0원';
  const _ppDisp=document.getElementById('pi-pay-period'); if(_ppDisp) _ppDisp.value='';
  const _hwReset=document.getElementById('pi-hourly-wage-disp'); if(_hwReset) _hwReset.textContent='-';
  // 연말정산·기타 textarea 메모 초기화
  ['pi-health-adj-yearend-memo','pi-ltcare-adj-yearend-memo','pi-yearend-memo','pi-advance-memo']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  // 직전월 메모 인계 배너 숨김
  _hidePrevMemoBanner();
  // 연차수당 자동계산 체크박스 초기화
  const _autoChkReset=document.getElementById('pi-annual-auto-chk');
  if(_autoChkReset){ _autoChkReset.checked=false; }
  const _annPayReset=document.getElementById('pi-annual-pay');
  if(_annPayReset){ _annPayReset.readOnly=false; _annPayReset.style.background=''; _annPayReset.style.color=''; _annPayReset.style.fontWeight=''; _annPayReset.style.cursor=''; }
  ['pi-gross-disp','pi-ded-disp','pi-net-disp','pi-gross-disp2','pi-ded-disp2','pi-net-disp2'].forEach(id=>document.getElementById(id).textContent='0원');
  const d1=document.getElementById('pi-ded-detail'); if(d1) d1.innerHTML='';
  const d2=document.getElementById('pi-ded-detail-fixed'); if(d2) d2.innerHTML='';
}
function clearPI(){
  // ── 직원이 선택된 상태라면 "입력값 리셋" 모드 실행 ──────────────────────────
  // 산정기준(계약 정보), 정기 지급항목, 연차 현황, 직전월 메모는 그대로 보존.
  // 비정기 지급항목·정산/추가공제 금액·근로 실적만 만근 기준으로 복원.
  const _empId = document.getElementById('pi-employee')?.value;
  if(_empId && piContract){
    _resetPIInputsOnly();
    return;
  }
  // ── 직원 미선택 상태: 기존 완전 초기화 ────────────────────────────────────
  document.getElementById('pi-employee').value='';
  document.getElementById('pi-contract-card').style.display='none';
  const _depEl=document.getElementById('pi-dependents'); if(_depEl) _depEl.value=0;
  const _alBox=document.getElementById('pi-annual-leave-box'); if(_alBox) _alBox.style.display='none';
  // 근로 실적 자동산출 패널 초기화
  const _wp=document.getElementById('pi-work-auto-panel'); if(_wp) _wp.style.display='none';
  const _sw=document.getElementById('pi-ot-pay-simple-wrap'); if(_sw) _sw.style.display='none';
  const _autoLbl=document.getElementById('pi-workdays-auto-label'); if(_autoLbl) _autoLbl.style.display='none';
  // 지급일 readonly 해제 + 배지 숨김
  const _pdEl=document.getElementById('pi-paydate');
  if(_pdEl){ _pdEl.readOnly=false; _pdEl.style.background=''; _pdEl.style.color=''; _pdEl.style.cursor=''; }
  const _pdBadge=document.getElementById('pi-paydate-badge'); if(_pdBadge) _pdBadge.style.display='none';
  _setPIContractReadonly(false); // 잠금 해제
  piContract=null; clearPIFields();
  // 직원 초기화 시 회사 allowance_config로 항목 show/hide 복원
  const _clrCoId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const _clrCo   = allCompanies.find(c=>c.id===_clrCoId);
  if(typeof applyPIAllowanceConfig === 'function')
    applyPIAllowanceConfig(_clrCo?.allowance_config ?? null);
}

// ── 입력값 리셋 (직원·계약 선택 상태 유지, 만근 기준 복원) ──────────────────
// ■ 보존 항목 (손대지 않음):
//   - 직원 선택 / 계약 카드 (산정기준: 산정기간·통상시급 포함)
//   - 정기 지급항목 (base·weekly-hol·계약 고정 수당 등 — _setPIContractReadonly로 잠긴 값)
//   - 연차 현황 박스 (calcAnnualLeaveTable 재실행으로 자동 갱신)
//   - 4개 정산 메모 (직전월 인계 또는 사용자 입력 보호)
// ■ 초기화 항목:
//   - 비정기 지급항목 (연차수당·상여·성과·실비·통신·기타)
//   - 근로 실적 (만근 기준으로 재계산)
//   - 정산/추가공제 금액 (0으로)
//   - 초과·야간·휴일 근로시간
//   - 메모(note)
// ────────────────────────────────────────────────────────────────────────────
function _resetPIInputsOnly(){
  // 1) 비정기 지급항목 금액 초기화
  [
    'pi-annual-pay','pi-annual-used',
    'pi-bonus','pi-performance','pi-actual-expense',
    'pi-communication','pi-etc-allowance',
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });

  // etc-allowance 메모는 초기화 (비정기 입력값이므로)
  const _etcMemoClr=document.getElementById('pi-etc-allowance-memo'); if(_etcMemoClr) _etcMemoClr.value='';

  // 2) 초과·야간·휴일 근로시간 초기화
  ['pi-ot-hours','pi-night-hours','pi-hol-hours'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  ['pi-ot-pay-disp','pi-night-pay-disp','pi-hol-pay-disp',
   'pi-ot-pay-disp-simple','pi-night-pay-disp-simple','pi-hol-pay-disp-simple'
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='0원'; });

  // 3) 정산/추가공제 금액만 초기화 (메모는 보존)
  [
    'pi-health-adj-yearend','pi-ltcare-adj-yearend',
    'pi-yearend','pi-health-adj','pi-health-adj-memo',
    'pi-health-adj-retro','pi-advance',
    'pi-std-pay',
    'pi-pension-fixed','pi-health-fixed','pi-ltcare-fixed','pi-employ-fixed',
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });

  // 4) 메모(비고) 초기화
  const _noteEl=document.getElementById('pi-note'); if(_noteEl) _noteEl.value='';

  // 5) 연차수당 자동계산 체크박스 초기화
  const _chkRst=document.getElementById('pi-annual-auto-chk');
  if(_chkRst){ _chkRst.checked=false; }
  const _apRst=document.getElementById('pi-annual-pay');
  if(_apRst){ _apRst.readOnly=false; _apRst.style.background=''; _apRst.style.color=''; _apRst.style.fontWeight=''; _apRst.style.cursor=''; }

  // 6) 수정 모드 해제
  piEditPayrollId = null;
  _piEditSnapshot = null;  // 스냅샷 초기화
  _updatePIBottomBtns();

  // 7) 근로 실적 패널 리셋 후 만근 기준 재계산
  const _wpR=document.getElementById('pi-work-auto-panel'); if(_wpR) _wpR.style.display='none';
  const _swR=document.getElementById('pi-ot-pay-simple-wrap'); if(_swR) _swR.style.display='none';
  ['pi-work-days','pi-total-hours'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  _applyPIDefaultWorkDays(true);  // 만근 기준 근로일수 재입력

  // 8) 연차 현황 재계산
  calcAnnualLeaveTable();

  // 9) 지급일 재적용 (고객사 설정 기준)
  _applyPIPayDate(true);

  // 10) 공제 재계산
  calcPI();

  toast('입력값을 초기화했습니다.', 'info');
}
// ─── 수정 모드 상태 ───
let piEditPayrollId = null; // 수정 중인 payroll ID (null이면 신규)

// ─── 원상복구 비교용 스냅샷 ───
let _piEditSnapshot = null; // 수정 모드 진입·복원 직후 폼 상태 (JSON string)

/** 스냅샷 비교 대상 폼 필드 ID 목록 */
const _PI_SNAP_FIELDS = [
  // pi-base 제외: type="hidden", calcPI()가 pi-work-days 기반으로 자동계산 — 사용자 직접 입력 불가
  'pi-position','pi-remote-area','pi-site','pi-skill','pi-license',
  'pi-transport','pi-meal','pi-childcare','pi-research',
  'pi-fitness','pi-self-dev','pi-book','pi-overseas',
  'pi-etc-allowance','pi-etc-allowance-memo',
  'pi-annual-pay','pi-annual-used','pi-bonus','pi-performance',
  'pi-actual-expense','pi-communication',
  'pi-ot-hours','pi-night-hours','pi-hol-hours','pi-work-days',
  'pi-yearend','pi-yearend-memo',
  'pi-health-adj','pi-health-adj-memo',
  'pi-health-adj-yearend','pi-health-adj-yearend-memo',
  'pi-ltcare-adj-yearend','pi-ltcare-adj-yearend-memo',
  'pi-advance','pi-advance-memo',
  'pi-std-pay','pi-paydate','pi-note','pi-dependents',
  'pi-pension-fixed','pi-health-fixed','pi-ltcare-fixed','pi-employ-fixed',
];

/** 현재 폼 상태를 JSON 문자열로 반환 (스냅샷 저장·비교용) */
function _readPIFormSnapshot(){
  const obj = {};
  _PI_SNAP_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    obj[id] = el.value;
  });
  return JSON.stringify(obj);
}

/** 원상복구 버튼 활성/비활성 갱신 */
function _checkPIRestoreBtn(){
  const btn = document.getElementById('pi-clear-btn');
  if(!btn) return;
  if(!piEditPayrollId){
    // 신규 모드 → 초기화 버튼, 항상 활성
    btn.disabled      = false;
    btn.style.opacity = '';
    btn.style.cursor  = '';
    return;
  }
  if(_piEditSnapshot === null){
    // 수정 모드이지만 스냅샷 아직 미생성(필드 채우기 진행 중) → 비활성
    btn.disabled      = true;
    btn.style.opacity = '0.4';
    btn.style.cursor  = 'not-allowed';
    return;
  }
  // 수정 모드 + 스냅샷 있음 → 현재 폼과 비교
  const _curSnap = _readPIFormSnapshot();
  const changed = (_curSnap !== _piEditSnapshot);
  btn.disabled      = !changed;
  btn.style.opacity = changed ? '' : '0.4';
  btn.style.cursor  = changed ? '' : 'not-allowed';
}

/**
 * 하단 버튼 영역(초기화/원상복구 · 취소/수정취소)을
 * 현재 모드(신규/수정)에 맞게 레이블·스타일 갱신.
 */
function _updatePIBottomBtns(){
  // ── 취소 버튼 ──
  const cancelBtn   = document.getElementById('pi-cancel-btn');
  const cancelLabel = document.getElementById('pi-cancel-btn-label');
  // ── 초기화/원상복구 버튼 ──
  const clearBtn   = document.getElementById('pi-clear-btn');
  const clearLabel = document.getElementById('pi-clear-btn-label');
  const clearIcon  = document.getElementById('pi-clear-btn-icon');

  if(piEditPayrollId){
    // ── 수정 모드 ──
    if(cancelBtn && cancelLabel){
      cancelLabel.textContent      = '수정 취소';
      cancelBtn.classList.remove('btn-secondary');
      cancelBtn.classList.add('btn-warning');
    }
    if(clearBtn && clearLabel){
      clearLabel.textContent       = '원상복구';
      if(clearIcon) clearIcon.className = 'fas fa-rotate-left';
      clearBtn.classList.remove('btn-secondary');
      clearBtn.classList.add('btn-warning');
    }
    // 진입 직후(스냅샷 있음)에는 비활성 → 변경 감지 후 활성
    _checkPIRestoreBtn();
  } else {
    // ── 신규 모드 ──
    if(cancelBtn && cancelLabel){
      cancelLabel.textContent      = '취소';
      cancelBtn.classList.remove('btn-warning');
      cancelBtn.classList.add('btn-secondary');
    }
    if(clearBtn && clearLabel){
      clearLabel.textContent       = '초기화';
      if(clearIcon) clearIcon.className = 'fas fa-redo';
      clearBtn.classList.remove('btn-warning');
      clearBtn.classList.add('btn-secondary');
    }
    // 신규 모드: 초기화 버튼 항상 활성 보장
    _checkPIRestoreBtn();
  }
  // 모드 전환 시마다 임시저장 버튼 활성/비활성 동기화
  _updatePIDraftBtnForMode();
}
/** 하위호환 alias */
const _updatePICancelBtn = _updatePIBottomBtns;

/**
 * 수정 모드에서 임시저장 버튼 클릭 시 안내 알림 모달
 */
function _showPIDraftEditModeAlert(){
  const old = document.getElementById('pi-draft-edit-alert-modal');
  if(old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'pi-draft-edit-alert-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:340px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;">
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fde68a,#f59e0b);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <i class="fas fa-lock" style="color:#fff;font-size:22px;"></i>
      </div>
      <div style="font-size:16px;font-weight:800;color:#1e1b4b;margin-bottom:10px;">임시저장 사용 불가</div>
      <div style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:24px;">
        수정 모드에서는 임시저장을<br>지원하지 않습니다.
      </div>
      <button onclick="document.getElementById('pi-draft-edit-alert-modal').remove()"
        style="width:100%;padding:12px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
        확인
      </button>
    </div>`;
  // 배경 클릭으로도 닫기
  modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/**
 * 수정 모드 여부에 따라 임시저장 버튼 활성/비활성 전환
 * - 수정 모드(piEditPayrollId !== null): disabled + 반투명
 * - 신규 모드: enabled
 */
function _updatePIDraftBtnForMode(){
  const btn = document.getElementById('pi-draft-btn');
  if(!btn) return;
  if(piEditPayrollId){
    // disabled 대신 aria-disabled 사용 → onclick 이벤트 유지 (클릭 시 안내 알림 표시)
    btn.disabled               = false;
    btn.setAttribute('aria-disabled', 'true');
    btn.style.opacity          = '0.4';
    btn.style.cursor           = 'not-allowed';
    btn.title                  = '수정 모드에서는 임시저장을 사용할 수 없습니다.';
  } else {
    btn.disabled               = false;
    btn.removeAttribute('aria-disabled');
    btn.style.opacity          = '';
    btn.style.cursor           = '';
    btn.title                  = '';
  }
}

/**
 * 신규 임시저장 완료 후 '계속 입력' / '목록으로 돌아가기' 선택 모달
 */
function _showPIDraftSavedModal(yr, mo, timeStr){
  // 기존 모달 제거
  const old = document.getElementById('pi-draft-saved-modal');
  if(old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'pi-draft-saved-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:360px;width:calc(100%-32px);box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;">
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#6ee7b7,#10b981);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <i class="fas fa-floppy-disk" style="color:#fff;font-size:22px;"></i>
      </div>
      <div style="font-size:16px;font-weight:800;color:#1e1b4b;margin-bottom:8px;">임시저장 완료</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:24px;">
        작성 중인 급여가 임시저장 되었습니다.<br>
        <span style="font-size:11.5px;color:#9ca3af;">${yr}년 ${mo}월 · ${timeStr} 저장</span>
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('pi-draft-saved-modal').remove()"
          style="flex:1;padding:11px;background:#f1f5f9;color:#374151;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-pen" style="margin-right:5px;"></i>계속 입력
        </button>
        <button onclick="document.getElementById('pi-draft-saved-modal').remove(); backToPITargetList();"
          style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-list" style="margin-right:5px;"></i>목록으로 돌아가기
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

/**
 * 급여 저장 완료 모달
 * @param {string} empName  근로자명
 * @param {number} yr       지급 연도
 * @param {number} mo       지급 월
 * @param {string} payrollId 저장된 payroll ID (급여명세서 보기에 사용)
 * @param {boolean} isEdit  수정 모드 여부 (메시지 문구 분기)
 */
function _showPISavedModal(empName, yr, mo, payrollId, isEdit){
  const old = document.getElementById('pi-saved-modal');
  if(old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'pi-saved-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:380px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;">
      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6ee7b7,#10b981);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <i class="fas fa-check" style="color:#fff;font-size:24px;"></i>
      </div>
      <div style="font-size:16px;font-weight:800;color:#1e1b4b;margin-bottom:10px;">
        ${isEdit ? '수정 저장 완료' : '급여 저장 완료'}
      </div>
      <div style="font-size:13.5px;color:#374151;margin-bottom:24px;line-height:1.7;">
        <strong>${empName}</strong>님의<br>
        <strong>${yr}년 ${mo}월 급여</strong>가 저장되었습니다.
      </div>
      <div style="display:flex;gap:10px;">
        <button
          onclick="document.getElementById('pi-saved-modal').remove(); openPayslipModal('${payrollId}');"
          style="flex:1;padding:12px 8px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-file-invoice-dollar" style="margin-right:5px;"></i>급여명세서 보기
        </button>
        <button
          onclick="document.getElementById('pi-saved-modal').remove(); loadPITargetList();"
          style="flex:1;padding:12px 8px;background:#f1f5f9;color:#374151;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-list" style="margin-right:5px;"></i>지급대상 목록 보기
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ─── 임시저장 상태 ───
let piDraftId = null; // 현재 임시저장 레코드 ID (null이면 없음)

