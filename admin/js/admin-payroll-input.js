// ─── PAYROLL INPUT ───
let piContract=null;

// ════════════════════════════════════════════════════════════════════════════
// 급여 입력 페이지 — 전월 임금대장 엑셀 다운로드
// ════════════════════════════════════════════════════════════════════════════

/**
 * 특정 고객사의 특정 년월에 유효 계약이 있는 직원 전원의 급여가
 * is_draft=false 로 모두 입력완료 되었는지 확인한다.
 * @returns {boolean} 전원 입력완료 여부
 */
function _isPIMonthFullyPaid(coId, yr, mo){
  const VALID_STATUSES = new Set(['활성','active','계약예정','서류미비']);
  const periodStart = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const periodEnd   = new Date(yr, mo, 0).toISOString().slice(0,10);

  // 해당 월에 유효 계약이 있는 직원 Set
  const validEmpIds = new Set(
    allContracts
      .filter(c => {
        if(c.company_id !== coId) return false;
        if(c.is_draft) return false;
        if(c.is_voided_by_amend) return false;
        if(!VALID_STATUSES.has(c.status)) return false;
        const cStart = c.contract_start || '';
        const cEnd   = c.contract_end   || '';
        if(cStart && cStart > periodEnd)   return false;
        if(cEnd   && cEnd   < periodStart) return false;
        return true;
      })
      .map(c => c.employee_id)
  );

  if(!validEmpIds.size) return false; // 유효 계약 직원 자체가 없으면 "완료 아님"

  // 확정 저장(is_draft=false)된 직원 Set
  const paidEmpIds = new Set(
    (allPayrolls||[])
      .filter(p => p.company_id===coId && p.pay_year===yr && p.pay_month===mo && !p.is_draft)
      .map(p => p.employee_id)
  );

  // 유효 계약 직원 전원이 확정 저장되어 있어야 true
  for(const empId of validEmpIds){
    if(!paidEmpIds.has(empId)) return false;
  }
  return true;
}

/**
 * xl-* 숨김 DOM 요소를 설정(없으면 생성)하여 downloadPayrollExcel()이 참조할 수 있도록 한다.
 */
function _syncXlFields(coId, yr, mo){
  function _setOrCreate(id, val){
    let el = document.getElementById(id);
    if(!el){
      el = document.createElement('select');
      el.id = id; el.style.display = 'none';
      document.body.appendChild(el);
    }
    if(![...el.options].some(o => o.value === String(val))){
      const opt = document.createElement('option');
      opt.value = String(val); el.appendChild(opt);
    }
    el.value = String(val);
  }
  function _setOrCreateCheckbox(id, checked){
    let el = document.getElementById(id);
    if(!el){
      el = document.createElement('input');
      el.type = 'checkbox'; el.id = id; el.style.display = 'none';
      document.body.appendChild(el);
    }
    el.checked = checked;
  }
  _setOrCreate('xl-company', coId);
  _setOrCreate('xl-year',    yr);
  _setOrCreate('xl-month',   mo);
  _setOrCreateCheckbox('xl-opt-existing', true);
  _setOrCreateCheckbox('xl-opt-contract', true);
}

/**
 * pi-period-section의 년월 선택 기준으로 전월 임금대장 엑셀을 다운로드한다.
 *
 * [동작 순서]
 * 1. 선택 년월의 전월 계산
 * 2. 전월에 유효 계약 직원 전원 급여 입력완료 여부 확인
 * 3. 완료 → 즉시 다운로드
 * 4. 미완료 → 가장 최근 "전원 입력완료" 월 탐색 (최대 24개월 전까지)
 *    4a. 찾은 월이 있으면 확인 다이얼로그 → 확인 시 해당 월 다운로드
 *    4b. 찾지 못하면 안내 토스트
 */
async function downloadPrevMonthExcel(){
  const coId = currentGlobalCompanyId;
  if(!coId){ toast('고객사를 먼저 선택하세요.','warning'); return; }

  const selYr = parseInt(document.getElementById('pi-year')?.value);
  const selMo = parseInt(document.getElementById('pi-month')?.value);
  if(!selYr || !selMo){ toast('년도와 월을 선택하세요.','warning'); return; }

  const co = allCompanies.find(c => c.id === coId);
  if(!co){ toast('고객사 정보를 찾을 수 없습니다.','error'); return; }

  // ── ① 전월 계산 ──
  let prevYr = selYr, prevMo = selMo - 1;
  if(prevMo < 1){ prevMo = 12; prevYr -= 1; }

  // ── ② 전월 완료 여부 확인 ──
  if(_isPIMonthFullyPaid(coId, prevYr, prevMo)){
    // 전월 정상 다운로드
    _syncXlFields(coId, prevYr, prevMo);
    toast(`${prevYr}년 ${prevMo}월 임금대장 엑셀 생성 중…`, 'success');
    await downloadPayrollExcel();
    return;
  }

  // ── ③ 전월 미완료 → 가장 최근 완료 월 탐색 (전전월부터 최대 24개월) ──
  let foundYr = null, foundMo = null;
  let scanYr = prevYr, scanMo = prevMo - 1;
  if(scanMo < 1){ scanMo = 12; scanYr -= 1; }

  for(let i = 0; i < 24; i++){
    if(_isPIMonthFullyPaid(coId, scanYr, scanMo)){
      foundYr = scanYr; foundMo = scanMo;
      break;
    }
    scanMo--;
    if(scanMo < 1){ scanMo = 12; scanYr -= 1; }
  }

  if(!foundYr){
    toast(`전월(${prevYr}년 ${prevMo}월) 임금대장이 존재하지 않으며, 대체할 수 있는 완료된 임금대장도 없습니다.`, 'warning');
    return;
  }

  // ── ④ 확인 다이얼로그 ──
  const confirmed = await _showPIDownloadFallbackConfirm(
    prevYr, prevMo, foundYr, foundMo, co.company_name
  );
  if(!confirmed) return;

  _syncXlFields(coId, foundYr, foundMo);
  toast(`${foundYr}년 ${foundMo}월 임금대장 엑셀 생성 중…`, 'success');
  await downloadPayrollExcel();
}

/**
 * 전월 임금대장 없음 → 대체 월 확인 다이얼로그 (Promise<boolean>)
 */
function _showPIDownloadFallbackConfirm(prevYr, prevMo, foundYr, foundMo, coName){
  return new Promise(resolve => {
    // 기존 모달이 있으면 제거
    const OLD = document.getElementById('pi-dl-fallback-modal');
    if(OLD) OLD.remove();

    const modal = document.createElement('div');
    modal.id = 'pi-dl-fallback-modal';
    modal.style.cssText = [
      'position:fixed','inset:0','z-index:9100',
      'background:rgba(0,0,0,.45)','backdrop-filter:blur(3px)',
      'display:flex','align-items:center','justify-content:center'
    ].join(';');

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:460px;max-width:calc(100vw - 32px);
                  box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;">
        <!-- 헤더 -->
        <div style="padding:22px 24px 16px;border-bottom:1px solid #f0f0f5;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:10px;
                        background:linear-gradient(135deg,#f59e0b,#d97706);
                        display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas fa-file-excel" style="color:#fff;font-size:17px;"></i>
            </div>
            <div>
              <div style="font-size:15px;font-weight:800;color:#1e1b4b;">임금대장 다운로드</div>
              <div style="font-size:12px;color:#6b7280;margin-top:2px;">${coName}</div>
            </div>
          </div>
        </div>
        <!-- 본문 -->
        <div style="padding:22px 24px;">
          <div style="background:#fff7ed;border:1px solid #fde68a;border-radius:10px;
                      padding:14px 16px;margin-bottom:18px;font-size:13px;color:#92400e;line-height:1.9;">
            <i class="fas fa-exclamation-triangle" style="color:#f59e0b;margin-right:6px;"></i>
            <strong>${prevYr}년 ${prevMo}월</strong> 임금대장이 존재하지 않습니다.<br>
            <span style="font-size:12px;color:#b45309;">
              (일부 직원의 급여 입력이 완료되지 않았거나 입력 내역이 없습니다.)
            </span>
          </div>
          <div style="font-size:13.5px;color:#374151;line-height:1.9;text-align:center;">
            가장 최근에 모든 입력이 완료된<br>
            <span style="font-size:18px;font-weight:800;color:#1e1b4b;">
              ${foundYr}년 ${foundMo}월
            </span>
            임금대장으로 대신 받으시겠습니까?
          </div>
        </div>
        <!-- 버튼 -->
        <div style="display:flex;gap:10px;padding:0 24px 22px;justify-content:flex-end;">
          <button id="pi-dl-fb-cancel"
            style="padding:9px 22px;background:#fff;border:1.5px solid #e5e7eb;border-radius:9px;
                   font-size:13px;font-weight:600;color:#6b7280;cursor:pointer;font-family:inherit;">
            취소
          </button>
          <button id="pi-dl-fb-ok"
            style="padding:9px 22px;background:linear-gradient(135deg,#10b981,#059669);
                   border:none;border-radius:9px;font-size:13px;font-weight:700;
                   color:#fff;cursor:pointer;font-family:inherit;
                   box-shadow:0 2px 8px rgba(16,185,129,.3);">
            <i class="fas fa-file-excel" style="margin-right:6px;"></i>${foundYr}년 ${foundMo}월 다운로드
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    function _close(result){
      modal.remove();
      resolve(result);
    }
    document.getElementById('pi-dl-fb-ok').onclick     = () => _close(true);
    document.getElementById('pi-dl-fb-cancel').onclick = () => _close(false);
    // 배경 클릭 시 취소
    modal.addEventListener('click', e => { if(e.target === modal) _close(false); });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 급여 입력 페이지 — 전직원 임금대장 일괄 업로드 모달
// ════════════════════════════════════════════════════════════════════════════
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
  const VALID_STATUSES = new Set(['활성','active','계약예정','서류미비']);
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
    return { emp, contract: c };
  }).filter(t => t.emp)
    .sort((a,b) => (a.emp.name||'').localeCompare(b.emp.name||'','ko'));

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
    tbody.innerHTML = targets.map(({emp, contract}) => {
      // 유효 계약의 contract_type이 현재 고용형태의 정확한 상태(수습 만료 후 전환 포함)를 반영.
      // emp.employment_category는 갱신이 지연될 수 있으므로 contract_type을 우선 사용.
      const cat      = contract.contract_type || emp.employment_category || '-';
      const catStyle = CAT_BADGE[cat] || 'background:#f3f4f6;color:#374151;';
      const cStart   = contract.contract_start || '-';
      const cEnd     = contract.contract_end   || '무기한';
      const isDraft  = draftEmpMap.has(emp.id);
      const isPaid   = paidEmpIds.has(emp.id);
      const draftId  = isDraft ? draftEmpMap.get(emp.id) : null;
      const deptPos  = [emp.department, emp.position].filter(v=>v&&v.trim()).join('/');

      // ④-0 계약상태 배지
      const _cs = contract.status || '활성';
      let contractStatusBadge;
      if(_cs === '서류미비'){
        contractStatusBadge = `<span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;margin-right:3px;">유효</span>`
          + `<span style="display:inline-block;background:#fff7ed;color:#c2410c;border:1px solid #fdba74;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;">서류미비</span>`;
      } else if(_cs === '활성' || _cs === 'active'){
        contractStatusBadge = `<span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700;">계약유효</span>`;
      } else if(_cs === '계약예정'){
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

      // ⑤ 관리 버튼: isDraft → '이어 입력'(파랑)+'삭제'(빨강), isPaid → '수정'(보라), else → '입력'(초록)
      let actionBtn;
      if(isDraft){
        actionBtn = `<button onclick="selectPITarget('${emp.id}','${contract.id}','${draftId}')"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 16px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-play-circle"></i> 이어 입력
        </button>
        <button onclick="deletePIDraft('${draftId}','${emp.name}')"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-left:6px;">
          <i class="fas fa-trash-alt"></i> 삭제
        </button>`;
      } else if(isPaid){
        actionBtn = `<button onclick="selectPITarget('${emp.id}','${contract.id}')"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 16px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-edit"></i> 수정
        </button>`;
      } else {
        actionBtn = `<button onclick="selectPITarget('${emp.id}','${contract.id}')"
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
 * 급여 입력 임시저장 삭제
 * @param {string} draftId  - 삭제할 payroll 레코드 ID (is_draft=true)
 * @param {string} empName  - 직원명 (확인 다이얼로그용)
 */
async function deletePIDraft(draftId, empName){
  if(!draftId){ toast('삭제할 임시저장 데이터가 없습니다.', 'error'); return; }
  const draft = (allPayrolls||[]).find(p => p.id === draftId);
  if(!draft || !draft.is_draft){
    toast('임시저장 급여 데이터만 삭제할 수 있습니다.', 'error');
    return;
  }
  const yr = draft.pay_year || '';
  const mo = draft.pay_month ? String(draft.pay_month).padStart(2,'0') : '';
  const label = (yr && mo) ? `${yr}년 ${mo}월` : '';
  if(!confirm(`[${empName}] ${label} 임시저장 급여를 삭제하시겠습니까?\n\n삭제 후 복구할 수 없습니다.`)) return;

  try {
    await api(`../tables/payrolls/${draftId}`, { method: 'DELETE' });
    const idx = (allPayrolls||[]).findIndex(p => p.id === draftId);
    if(idx !== -1) allPayrolls.splice(idx, 1);
    // 목록 새로고침
    if(typeof loadPITargetList === 'function') loadPITargetList();
    if(typeof renderPIAllDraftBanner === 'function') renderPIAllDraftBanner();
    toast(`${empName} ${label} 임시저장 급여가 삭제되었습니다.`, 'success');
  } catch(e) {
    console.error('[deletePIDraft]', e);
    toast('삭제에 실패했습니다.', 'error');
  }
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
  const cat     = contract.contract_type || emp.employment_category || '';
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
  const empId=document.getElementById('pi-employee').value;
  const card=document.getElementById('pi-contract-card');
  if(!empId){card.style.display='none';piContract=null;_piContractLoading=false;return;}
  // 유효 계약 후보를 모두 수집한 뒤, 복수일 경우 contract_start가 가장 최근인 것을 우선 선택.
  // - 수습→채용확정 자동 생성 시 원본 수습 계약이 is_voided_by_amend=true로 무효화되지 않은
  //   예외 상황(네트워크 오류 등)에서도 가장 최근 계약이 올바르게 선택되도록 방어한다.
  {
    const _piCandidates = allContracts.filter(c=>
      c.employee_id===empId &&
      (c.status==='active'||c.status==='활성'||c.status==='서류미비'||c.status==='계약예정') &&
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
    const isPI_Daily = piContract.contract_type === '일용직';
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
    // 출산·보육수당: 계약서 확정값 readonly 표시 (부양가족 수·금액 모두 계약서 기준)
    setAmountVal('pi-childcare', piContract.childcare_allowance||0);
    setPIPayType('childcare',    _ptOf(piContract.childcare_pay_type, 'childcare'));
    { const _depDisp = document.getElementById('pi-dependents-display');
      if(_depDisp) _depDisp.textContent = piContract.childcare_dependents || 1; }
    setAmountVal('pi-research',      piContract.research_allowance||0);
    setPIPayType('research',         _ptOf(piContract.research_pay_type,      'research'));
    setPIPayType('communication',    _ptOf(piContract.communication_pay_type, 'communication'));
    setPIPayType('fitness',          _ptOf(piContract.fitness_pay_type,       'fitness'));
    setPIPayType('self_dev',         _ptOf(piContract.self_dev_pay_type,      'self_dev'));
    setPIPayType('book',             _ptOf(piContract.book_pay_type,          'book'));
    setPIPayType('overseas',         _ptOf(piContract.overseas_pay_type,      'overseas'));
    // custom_allowances: 계약서 확정값 세팅 (readonly 처리는 하지 않음 — 급여 월별 직접 입력)
    { const _ca = _parsePICustomAllowances(piContract.custom_allowances);
      Object.entries(_ca).forEach(([k,v]) => setAmountVal(`pi-${k}`, v||0)); }
    const _alInit = document.getElementById('pi-annual-used'); if(_alInit) _alInit.value = 0;
    calcAnnualLeaveTable();
    setAmountVal('pi-annual-pay',    0);
    // 급여 산정기간: 계약 만료 부분월이면 고객사 설정 시작일~만료일로 자동 계산,
    //   그 외에는 계약서에 입력된 값(pay_period) 그대로 표시
    { const _ppEl = document.getElementById('pi-pay-period');
      if(_ppEl){
        const _cType = piContract.contract_type || '';
        const _isPartialTarget =
          _cType === '정규직 수습' || _cType === '계약직' || _cType === '계약직 수습';

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
            // 고객사 pay_period 파싱: "전월" or "당월" 기준 시작일 결정
            const _coId  = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
            const _co    = allCompanies.find(c => c.id === _coId);
            const _coPayPeriod = (_co?.pay_period || '').replace(/\s/g, ''); // 공백 제거

            let _periodStartStr;
            if(_coPayPeriod.startsWith('전월')){
              // 전월 1일: 급여 월의 전월
              const _prevMo = _ppMo === 1 ? 12 : _ppMo - 1;
              const _prevYr = _ppMo === 1 ? _ppYr - 1 : _ppYr;
              _periodStartStr = `${_prevYr}-${String(_prevMo).padStart(2,'0')}-01`;
            } else {
              // 당월 1일 (기본 fallback)
              _periodStartStr = `${_ppYr}-${String(_ppMo).padStart(2,'0')}-01`;
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
    const _piContractStatusBanner = piContract.status==='서류미비'
      ? `<div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:#92400e;">
           ⚠️ <b>서류미비</b> 상태 — 유효 계약으로 급여 처리됩니다. 날인 서류를 <a href="#" onclick="event.preventDefault();_piOpenDocUpload('${piContract.id}')" style="color:#b45309;font-weight:700;text-decoration:underline;cursor:pointer;">보완</a>해 주세요.</div>`
      : piContract.status==='계약예정'
      ? `<div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:#92400e;">
           ⚠️ <b>계약예정</b> 상태 — 계약 효력 개시 전입니다.</div>`
      : '';
    // ── 계약정보 카드 본문 빌드 ──────────────────────────────────────────────
    {
      const _ct       = piContract.contract_type || '';
      const _isProb   = _ct === '정규직 수습' || _ct === '계약직 수습';
      const _isFixed  = _ct === '계약직'     || _ct === '계약직 수습';
      const _isRegular = _ct === '정규직';

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
  if(cType === '일용직') return;

  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;
  if(!yr || !mo) return;

  const wdEl = document.getElementById('pi-work-days');
  const thEl = document.getElementById('pi-total-hours');
  if(!wdEl || !thEl) return;

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
  const isProb     = cType === '정규직 수습' || cType === '계약직 수습';
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

  // ── 고객사 pay_day 기반 자동 계산 ──────────────────────────────────────
  const coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const co   = allCompanies.find(c => c.id === coId);
  const rawPayDay = co?.pay_day;
  const payDayNum = parseInt(String(rawPayDay || '').replace(/[^0-9]/g, '')) || 0;

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
    badgeEl.textContent   = `고객사 설정: 매월${day}일`;
    badgeEl.style.color   = '#6b7280';
    badgeEl.style.background = '#f3f4f6';
    badgeEl.style.borderColor = '#e5e7eb';
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
    if(wdEl) wdEl.value = 0;
    if(thEl) thEl.value = 0;
    const autoLbl = document.getElementById('pi-workdays-auto-label');
    if(autoLbl) autoLbl.style.display = 'none';
    _applyPIDefaultWorkDays(true);
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

  // ── 근로일수 상한 클램프: 만근일수 or 계약직 잔여일수 초과 입력 방지 ────
  {
    const _maxDays = _getPIFullMonthWorkDays();  // 계약직 partial 시 잔여일수 반영
    const _wdEl    = document.getElementById('pi-work-days');
    if(_maxDays > 0 && _wdEl){
      const _entered = parseFloat(_wdEl.value) || 0;
      if(_entered > _maxDays){
        _wdEl.value = _maxDays;
        if(typeof toast === 'function'){
          const _cType = piContract.contract_type || '';
          const _seRaw = piContract.salary_end_date || piContract.contract_end;
          const _yr    = parseInt(document.getElementById('pi-year')?.value)  || 0;
          const _mo    = parseInt(document.getElementById('pi-month')?.value) || 0;
          const _mStart = new Date(_yr, _mo - 1, 1);
          const _mEnd   = new Date(_yr, _mo, 0);
          const _endDate = _seRaw ? new Date(_seRaw) : null;
          const _isPartial = _cType.includes('계약직') && _endDate &&
                             _endDate >= _mStart && _endDate <= _mEnd;
          const _msg = _isPartial
            ? `근로일수는 계약 잔여일수(${_maxDays}일)를 초과할 수 없습니다.`
            : `근로일수는 만근일수(${_maxDays}일)를 초과할 수 없습니다.`;
          toast(_msg, 'warning');
        }
      }
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
  if(piContract && piContract.contract_type !== '일용직'){
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
      const _isDaily   = piContract.contract_type === '일용직';
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
  // custom 항목 합산
  let _customGrossSum = 0, _customStdSum = 0;
  document.querySelectorAll('.pi-custom-item-row').forEach(row => {
    const key = row.dataset.customKey || '';
    const pt  = row.dataset.payType   || 'fixed';
    const amt = gv(`pi-${key}`);
    _customGrossSum += amt;
    if(pt === 'fixed') _customStdSum += amt;
  });
  const gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')+gv('pi-skill')+gv('pi-license')+gv('pi-transport')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+otPay+nightPay+holPay+_fixedOtPay+_fixedNightPay+_fixedHolPay+gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-fitness')+gv('pi-self-dev')+gv('pi-book')+gv('pi-overseas')+gv('pi-etc-allowance')+_customGrossSum;
  // ── 통상임금 기준 산정 ──
  // 통상임금 = 기본급 + 주휴수당 + 통상임금수당합
  // 통상임금 수당: 직책수당·정기상여금·현장수당·기술수당·면허수당·벽지수당·custom(통상임금포함)
  // ※ 평균임금 수당(차량·식대·출산보육·연구·통신·체력·자기계발·도서·해외) 및
  //   OT수당·연차수당은 통상임금에 포함되지 않음
  const std=gv('pi-base')+gv('pi-weekly-hol')
    +gv('pi-position')   // 직책수당 — 통상임금
    +gv('pi-site')       // 현장수당 — 통상임금
    +gv('pi-remote-area')// 벽지수당 — 통상임금
    +gv('pi-skill')      // 기술수당 — 통상임금
    +gv('pi-license')    // 면허수당 — 통상임금
    +gv('pi-bonus')      // 정기상여금 — 통상임금
    +_customStdSum;      // custom(pay_type=fixed, 통상임금포함) — 통상임금
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
  let _cmGrossManual = 0;
  document.querySelectorAll('.pi-custom-item-row').forEach(row => {
    const key = row.dataset.customKey || '';
    if(key) _cmGrossManual += gv(`pi-${key}`);
  });
  const gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')+gv('pi-skill')+gv('pi-license')
             +gv('pi-transport')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+gv('pi-fitness')+gv('pi-self-dev')+gv('pi-book')+gv('pi-overseas')
             +otPay+nightPay+holPay
             +gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-etc-allowance')+_cmGrossManual;
  const isFixed = _getPIInsuranceBasis() === '확정액 기준';
  if(isFixed) calcPIFixed(gross);
  else calcPIDeductions(gross);
}

// ── 요율 기준 자동 계산 ──
function calcPIDeductions(gross){
  const std=gv('pi-std-pay')||gross;
  const dependents=_piGetDependents();
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
  const dependents=_piGetDependents();
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

  const VALID_ST = new Set(['활성','active','계약예정','서류미비']);
  const monthStart = new Date(yr, mo-1, 1);
  const monthEnd   = new Date(yr, mo, 0);   // 말일
  const totalDays  = monthEnd.getDate();

  // 이 달에 유효 계약이 걸쳐있는 근로자 목록 (직원별 최신 계약 1건)
  const empContractMap = new Map();
  (allContracts||[])
    .filter(c =>
      c.company_id === coId &&
      !c.is_draft && !c.is_voided_by_amend &&
      VALID_ST.has(c.status)
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
    const ce = c.contract_end   ? new Date(c.contract_end)   : monthEnd;
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

  if(!piContract || piContract.contract_type === '일용직'){
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

// ─── 평균임금 지급유형 관리 (차량·식대·연구활동비 등 평균임금 수당) ───
// 'fixed'=매월 정기지급(평균임금 포함), 'daily'=출근일수에 따름(평균임금 제외), ''=미선택
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

/** 현재 급여입력의 부양가족 수 반환 (계약서 childcare_dependents 기준, readonly) */
function _piGetDependents(){
  const disp = document.getElementById('pi-dependents-display');
  return Math.max(1, parseInt(disp?.textContent||'1')||1);
}

function setPIPayType(field, type){
  // 내부 상태만 갱신 (select·badge UI 요소 삭제됨)
  _piPayTypes[field] = type;
  // 지급유형 변경 시 std 재계산 (loadPIContract 실행 중에는 스킵 — 마지막에 일괄 calcPI 호출)
  if(!_piContractLoading) calcPI();
}

function _getPIPayTypeVal(field){
  // 'fixed'=평균임금 포함(매월 정기지급), 'daily'=평균임금 제외(출근일수 비례), ''=미선택(저장 불가)
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
// 옵셔널 항목 정의: { key, rowId, ptField(있으면) }
const _PI_OPT_ROWS = [
  { key:'regular_bonus', rowId:'pi-row-bonus' },  // 정기 상여금: 통상임금 수당 (항상 포함)
  { key:'childcare',     rowId:'pi-row-childcare', ptField:'childcare' },  // 출산·보육수당
  { key:'site',          rowId:'pi-row-site' },
  { key:'position',      rowId:'pi-row-position' },
  { key:'skill',         rowId:'pi-row-skill' },
  { key:'license',       rowId:'pi-row-license' },
  { key:'remote_area',   rowId:'pi-row-remote-area' },
  { key:'research',      rowId:'pi-row-research',      ptField:'research' },
  { key:'communication', rowId:'pi-row-communication', ptField:'communication' },
  { key:'fitness',       rowId:'pi-row-fitness',       ptField:'fitness' },
  { key:'self_dev',      rowId:'pi-row-self-dev',      ptField:'self_dev' },
  { key:'book',          rowId:'pi-row-book',           ptField:'book' },
  { key:'overseas',      rowId:'pi-row-overseas',       ptField:'overseas' },
];

/** 비정기 지급 섹션으로 이동하는 항목의 한글 레이블 */
const _PI_IRREGULAR_LABELS = {
  childcare:     '출산·보육수당',
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
  //    (비정기 이동은 여기서 하지 않고, setPIPayType 호출이 모두 끝난 뒤
  //     loadPIContract / editPayroll 에서 _renderPIIrregularRows() 로 처리)
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
  // ② custom_items 동적 행 생성
  _applyPICustomItems(cfg ? (cfg.custom_items || []) : []);
}

/* ── 급여입력: custom_items 동적 행 ── */

function _applyPICustomItems(items){
  // 기존 동적 custom 행 제거
  document.querySelectorAll('.pi-custom-item-row').forEach(el => el.remove());
  if(!items || !items.length) return;

  // pi-row-overseas 다음에 삽입 (없으면 pi-row-etc-allowance 앞에)
  const anchor = document.getElementById('pi-row-overseas');
  items.forEach(item => {
    const key    = item.key   || '';
    const label  = item.label || '';
    const pt     = item.pay_type || 'fixed';
    const rowId  = `pi-row-${key}`;
    const inputId = `pi-${key}`;
    if(!key || document.getElementById(rowId)) return;

    const row = document.createElement('div');
    row.className = 'pi-row pi-custom-item-row';
    row.id = rowId;
    row.dataset.customKey = key;
    row.dataset.payType   = pt;
    row.innerHTML =
      `<label>${_piEscHtml(label)}</label>`
      + `<div class="pi-row-right">`
      + `<input type="text" inputmode="numeric" id="${inputId}" data-amount`
      + ` oninput="onAmountInput(this,calcPI)" class="pi-row-amount" />`
      + `</div>`;

    if(anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
    }
  });
}

/** HTML 이스케이프 (급여입력 레이블용) */
function _piEscHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/** custom_allowances JSON → {key:amount} 파싱 */
function _parsePICustomAllowances(src){
  if(!src) return {};
  try{ return typeof src === 'string' ? JSON.parse(src) : (src || {}); }
  catch(e){ return {}; }
}

/** 급여입력 화면에서 현재 custom 항목 금액 수집 → {key:amount} */
function _collectPICustomAllowances(){
  const result = {};
  document.querySelectorAll('.pi-custom-item-row').forEach(row => {
    const key = row.dataset.customKey || '';
    if(key) result[key] = getAmountVal(`pi-${key}`) || 0;
  });
  return result;
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
  // custom_allowances — 저장된 값이 있는 custom 행 강제 노출
  const _pca = _parsePICustomAllowances(p.custom_allowances);
  Object.entries(_pca).forEach(([key, amt]) => {
    if(Number(amt) > 0){
      const rowEl = document.getElementById(`pi-row-${key}`);
      if(rowEl) rowEl.style.display = '';
    }
  });
}

/**
 * 계약서 금액이 0(또는 미입력)인 정기지급(fixed) 옵셔널 항목을 숨김.
 * - 출산·보육수당(childcare)은 매월 직접 입력 항목이므로 제외.
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
    if(key === 'childcare') return;  // 출산·보육수당: 매월 직접 입력 — 제외
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
  // ※ 'pi-childcare' 제외 — 출산·보육수당은 매월 직접 입력 항목 (readonly 불가)
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
  // custom 항목 입력값 0으로 초기화 (행 자체는 유지)
  document.querySelectorAll('.pi-custom-item-row').forEach(row => {
    const key = row.dataset.customKey || '';
    if(key){ const el=document.getElementById(`pi-${key}`); if(el) el.value=''; }
  });
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
  { const _depDisp=document.getElementById('pi-dependents-display'); if(_depDisp) _depDisp.textContent='1'; }
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
  // custom 동적 행 제거 (직원 미선택 완전 초기화 시)
  document.querySelectorAll('.pi-custom-item-row').forEach(el => el.remove());
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
  'pi-std-pay','pi-paydate','pi-note',
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
      cancelBtn.style.background   = '#fff7ed';
      cancelBtn.style.color        = '#c2410c';
      cancelBtn.style.borderColor  = '#fdba74';
    }
    if(clearBtn && clearLabel){
      clearLabel.textContent       = '원상복구';
      if(clearIcon) clearIcon.className = 'fas fa-rotate-left';
      clearBtn.style.background    = '#fef3c7';
      clearBtn.style.color         = '#92400e';
      clearBtn.style.borderColor   = '#fcd34d';
      clearBtn.classList.remove('btn-secondary');
    }
    // 진입 직후(스냅샷 있음)에는 비활성 → 변경 감지 후 활성
    _checkPIRestoreBtn();
  } else {
    // ── 신규 모드 ──
    if(cancelBtn && cancelLabel){
      cancelLabel.textContent      = '취소';
      cancelBtn.style.background   = '#f1f5f9';
      cancelBtn.style.color        = '#64748b';
      cancelBtn.style.borderColor  = '#cbd5e1';
    }
    if(clearBtn && clearLabel){
      clearLabel.textContent       = '초기화';
      if(clearIcon) clearIcon.className = 'fas fa-redo';
      clearBtn.style.background    = '';
      clearBtn.style.color         = '';
      clearBtn.style.borderColor   = '';
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
 * 신규 임시저장 완료 후 선택 모달
 * @param {boolean}  confirmOnly  true: '확인' 버튼 하나만 표시 (페이지 이동용 임시저장)
 * @param {Function} onConfirm    '확인' 버튼 클릭 시 실행할 콜백 (확인 전용 모드에서만 적용)
 */
function _showPIDraftSavedModal(yr, mo, timeStr, confirmOnly = false, onConfirm = null){
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
        ${confirmOnly
          ? `<button id="_pi-draft-confirm-ok-btn"
              style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
              <i class="fas fa-check" style="margin-right:5px;"></i>확인
             </button>`
          : `<button onclick="document.getElementById('pi-draft-saved-modal').remove()"
              style="flex:1;padding:11px;background:#f1f5f9;color:#374151;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
              <i class="fas fa-pen" style="margin-right:5px;"></i>계속 입력
             </button>
             <button onclick="document.getElementById('pi-draft-saved-modal').remove(); backToPITargetList();"
              style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
              <i class="fas fa-list" style="margin-right:5px;"></i>목록으로 돌아가기
             </button>`
        }
      </div>
    </div>`;
  document.body.appendChild(modal);

  // confirmOnly 모드: '확인' 버튼에 onConfirm 콜백 연결
  if(confirmOnly){
    const _okBtn = document.getElementById('_pi-draft-confirm-ok-btn');
    if(_okBtn){
      _okBtn.onclick = () => {
        modal.remove();
        if(typeof onConfirm === 'function') onConfirm();
      };
    }
  }
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
    custom_allowances:   JSON.stringify(_collectPICustomAllowances()),
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
    dependents: _piGetDependents(),
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
  // 수정 모드에서는 임시저장 불가 → 알림 모달 표시
  if(piEditPayrollId){
    _showPIDraftEditModeAlert(); return;
    return;
  }
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
      // 수정 모드에서 임시저장하면 원본 확정 레코드 ID를 기록
      // → 불러오기(loadPIDraft) 시 piEditPayrollId를 복원해 수정 모드 유지
      edit_source_id: piEditPayrollId || null,
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
      // 수정 모드: 동일 직원·연월의 기존 임시저장(이전 수정 세션의 고아 draft)이 있으면 재활용
      // 신규 모드: 동일 직원·연월에 기존 임시저장이 있으면 재활용
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

    // 임시저장 배너 갱신 (현재 직원 기준)
    _checkAndShowPIDraftBanner(empId, yr, mo);
    // 전체 임시저장 목록 배너 갱신
    renderPIAllDraftBanner();

    // ── 임시저장 완료 모달 표시 ──
    // 페이지 이동용 임시저장(보완 버튼 경유)이면 '확인' 버튼만 + onConfirm 콜백으로 페이지 이동
    // 일반 임시저장이면 '계속 입력 / 목록으로 돌아가기' 선택
    const _confirmOnly = !!window._piDraftSaveFromDocUpload;
    const _onConfirm   = window._piDraftSaveOnConfirm || null;
    window._piDraftSaveFromDocUpload = false;
    window._piDraftSaveOnConfirm     = null;
    _showPIDraftSavedModal(yr, mo, timeStr, _confirmOnly, _onConfirm);

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

  // 수정 모드 중에는 임시저장 복원 배너를 표시하지 않음
  if(piEditPayrollId){ banner.style.display = 'none'; return; }

  const _yr = yr || parseInt(document.getElementById('pi-year')?.value);
  const _mo = mo || parseInt(document.getElementById('pi-month')?.value);
  if(!empId || !_yr || !_mo){ banner.style.display = 'none'; return; }

  const draft = allPayrolls.find(
    p => p.employee_id === empId && p.pay_year === _yr && p.pay_month === _mo && p.is_draft
  );
  if(!draft){ piDraftId = null; banner.style.display = 'none'; return; }

  // 확정 레코드가 이미 있는 경우:
  //   - 수정 모드 draft(edit_source_id 있음) → 배너 표시 (수정 세션 진행 중)
  //   - 일반 신규 draft → 배너 숨김 (확정 레코드가 우선)
  const confirmedExists = allPayrolls.some(
    p => p.employee_id === empId && p.pay_year === _yr && p.pay_month === _mo && !p.is_draft
  );
  if(confirmedExists && !draft.edit_source_id){
    banner.style.display = 'none';
    return;
  }

  piDraftId = draft.id;
  const savedAt = draft.draft_saved_at
    ? new Date(draft.draft_saved_at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : '';
  const editLabel = draft.edit_source_id ? ' [수정 임시저장]' : '';
  if(subLabel) subLabel.textContent = `${_yr}년 ${_mo}월분${editLabel}${savedAt ? '  ·  ' + savedAt + ' 저장' : ''}`;
  banner.style.display = 'flex';
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

  // 임시저장 당시 계약 시작일 기준 고객사 스냅샷으로 allowance_config 적용
  const _draftCoId = draft.company_id || currentGlobalCompanyId;
  const _draftEmpContract = (allContracts||[]).find(c => c.employee_id === draft.employee_id && (c.status==='활성'||c.status==='active'));
  const _draftContractTs  = _draftEmpContract?.contract_start ? new Date(_draftEmpContract.contract_start).getTime() : null;
  const _draftCo = (typeof getCompanySnapshotAt === 'function' && _draftContractTs)
    ? (getCompanySnapshotAt(_draftCoId, _draftContractTs) || allCompanies.find(c=>c.id===_draftCoId))
    : allCompanies.find(c=>c.id===_draftCoId);
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
  { const _dd=document.getElementById('pi-dependents-display'); if(_dd) _dd.textContent = draft.dependents||1; }
  // custom_allowances 복원 (draft)
  { const _dca = _parsePICustomAllowances(draft.custom_allowances);
    Object.entries(_dca).forEach(([k,v]) => setAmountVal(`pi-${k}`, v||0)); }
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
  const _draftInsCo = allCompanies.find(x => x.id === draft.company_id);
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
    const srcPayroll = allPayrolls.find(p => p.id === draft.edit_source_id);
    if(srcPayroll){
      piEditPayrollId = draft.edit_source_id;
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
      const emp2 = allEmployees.find(e => e.id === draft.employee_id) || {};
      // draft에 채워진 폼 상태를 원상복구 기준점으로 저장
      // (이후 사용자가 폼을 변경하면 원상복구 버튼이 활성화됨)
      _piEditSnapshot = _readPIFormSnapshot();
      _checkPIRestoreBtn();
      toast(`✔ ${draft.pay_year}년 ${draft.pay_month}월 수정 임시저장을 불러왔습니다.\n[수정 저장]을 눌러 최종 반영하세요.`, 'info');
      return;
    }
    // edit_source_id가 있지만 원본 레코드가 없으면(삭제된 경우) 신규로 전환
    piEditPayrollId = null;
  }

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
  try {
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
  // ── 지급유형(평균임금 포함여부) 미선택 차단: 금액 > 0 인데 pay_type 미선택('')이면 저장 불가 ──
  // 해당 항목들은 평균임금 수당으로, 매월 정기지급(fixed) 또는 출근일수 비례(daily) 선택 필요
  {
    const _ptItems = [
      { field:'transport',    label:'차량교통비' },
      { field:'meal',         label:'식대' },
      { field:'childcare',    label:'출산·보육수당' },
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
      toast(`지급유형(평균임금 포함여부)을 선택해 주세요: ${_names}`, 'error');
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
  const body={employee_id:empId,company_id:coId,pay_year:yr,pay_month:mo,work_days:gv('pi-work-days'),total_work_hours:gv('pi-total-hours'),overtime_hours:gv('pi-ot-hours'),night_hours:gv('pi-night-hours'),holiday_hours:gv('pi-hol-hours'),hourly_wage:piContract?piContract.hourly_wage:0,base_salary:gv('pi-base'),weekly_holiday_pay:gv('pi-weekly-hol'),position_allowance:gv('pi-position'),remote_area_allowance:gv('pi-remote-area')||0,site_allowance:gv('pi-site')||0,skill_allowance:gv('pi-skill'),license_allowance:gv('pi-license'),overtime_pay:c.otPay||0,night_pay:c.nightPay||0,holiday_pay:c.holPay||0,..._getPITransportFields(),transport_type:_piTransportType,transport_pay_type:_getPIPayTypeVal('transport'),meal_allowance:gv('pi-meal'),meal_pay_type:_getPIPayTypeVal('meal'),childcare_allowance:gv('pi-childcare'),childcare_pay_type:_getPIPayTypeVal('childcare'),research_allowance:gv('pi-research'),research_pay_type:_getPIPayTypeVal('research'),communication_pay_type:_getPIPayTypeVal('communication'),annual_leave_used:parseFloat(document.getElementById('pi-annual-used')?.value||0)||0,annual_leave_pay:gv('pi-annual-pay'),bonus_pay:gv('pi-bonus'),performance_pay:gv('pi-performance'),actual_expense_pay:gv('pi-actual-expense'),communication_pay:gv('pi-communication'),fitness_allowance:gv('pi-fitness')||0,fitness_pay_type:_getPIPayTypeVal('fitness'),self_dev_allowance:gv('pi-self-dev')||0,self_dev_pay_type:_getPIPayTypeVal('self_dev'),book_allowance:gv('pi-book')||0,book_pay_type:_getPIPayTypeVal('book'),overseas_allowance:gv('pi-overseas')||0,overseas_pay_type:_getPIPayTypeVal('overseas'),contract_etc_allowance:0,etc_allowance:gv('pi-etc-allowance'),etc_allowance_memo:document.getElementById('pi-etc-allowance-memo')?.value||'',gross_pay:c.gross||0,standard_monthly_pay:c.std||0,income_tax:c.incomeTax||0,local_income_tax:c.localTax||0,health_insurance:c.health||0,long_term_care:c.ltCare||0,national_pension:c.pension||0,employment_insurance:c.empIns||0,year_end_tax_adjust:gv('pi-yearend'),year_end_tax_adjust_memo:document.getElementById('pi-yearend-memo')?.value||'',health_insurance_adjust:gv('pi-health-adj'),health_insurance_adjust_memo:document.getElementById('pi-health-adj-memo')?.value||'',health_insurance_adjust_retro:gv('pi-health-adj-retro'),health_insurance_adjust_yearend:gv('pi-health-adj-yearend'),health_insurance_adjust_yearend_memo:document.getElementById('pi-health-adj-yearend-memo')?.value||'',ltcare_adjust_yearend:gv('pi-ltcare-adj-yearend'),ltcare_adjust_yearend_memo:document.getElementById('pi-ltcare-adj-yearend-memo')?.value||'',advance_deduction:gv('pi-advance'),advance_deduction_memo:document.getElementById('pi-advance-memo')?.value||'',total_deduction:c.totalDed||0,net_pay:c.net||0,pay_date:document.getElementById('pi-paydate')?.value||'',note:document.getElementById('pi-note')?.value||'',dependents:_piGetDependents(),custom_allowances:JSON.stringify(_collectPICustomAllowances())};
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
    await loadPayrolls(); renderPayrolls(); renderDashboard();
    // 임금대장 완성 여부 체크
    await _checkWageLedgerComplete(coId, yr, mo);
    // 고객사 인앱 알림 발송 (급여 수정 완료)
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
    // ── 수정 모드 해제 후 저장 완료 모달 표시 ──
    const _editEmp       = allEmployees.find(x => x.id === empId) || {};
    const _savedPayrollId = piEditPayrollId; // cancelEditPayroll()이 null로 초기화하기 전에 보존
    cancelEditPayroll(); // 수정 모드 해제 + 목록 복귀 (pi-period-section도 복원)
    _showPISavedModal(_editEmp.name || empId, yr, mo, _savedPayrollId, true);
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
    const _newPayrollId = 'pay' + Date.now();
    body.id = _newPayrollId;
    await api('../tables/payrolls',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // 임시저장 배너 숨김 + 갱신
    const _draftBannerEl = document.getElementById('pi-draft-banner');
    if(_draftBannerEl) _draftBannerEl.style.display = 'none';
    await loadPayrolls(); renderPayrolls(); renderDashboard();
    renderPIAllDraftBanner();
    // 임금대장 완성 여부 체크
    await _checkWageLedgerComplete(coId, yr, mo);
    // 고객사 인앱 알림 발송 (급여 입력 완료 — 개별 건)
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
    // ── 신규 모드: 폼 → 목록 전환 후 저장 완료 모달 표시 ──
    const _newEmp = allEmployees.find(x => x.id === empId) || {};
    backToPITargetList(); // 폼 닫고 목록으로 (pi-period-section 복원 포함)
    _showPISavedModal(_newEmp.name || empId, yr, mo, _newPayrollId, false);
  }
  } catch(err) {
    console.error('[savePI] 저장 중 오류:', err);
    toast('저장 중 오류가 발생했습니다. 콘솔을 확인해 주세요.', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
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
//   - allContracts / allEmployees 갱신
//   반환: 생성된 계약 객체 (실패 시 throw)
// ═══════════════════════════════════════════════════════════════════════════════
async function _autoCreateConfirmedContract(probEndDate){
  if(!piContract) throw new Error('piContract가 없습니다.');

  // 채용확정 고용형태 결정
  const confirmedType = piContract.contract_type === '정규직 수습' ? '정규직' : '계약직';

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
  const newEnd = confirmedType === '계약직' ? (piContract.contract_end || '') : '';

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
    status:                  '서류미비',
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

  // ── 원본 수습 계약 무효화 ──
  // 채용확정 계약이 생성되었으므로 원본 수습 계약의 is_voided_by_amend를 true로 설정.
  // 이렇게 해야 loadPIContract()의 필터(!is_voided_by_amend)에서 제외되어
  // 복수 활성 계약이 동시에 선택되는 문제를 방지한다.
  // (status는 '활성' 유지 — 수습 기간 실적/이력 보존을 위해 계약 내용은 삭제하지 않음)
  try {
    const _origProbId = piContract.id;
    await api(`../tables/contracts/${_origProbId}`, {
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
  await api(`../tables/employees/${piContract.employee_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employment_category: confirmedType,
      hire_date: hireDate,
    })
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

  // ── 지급유형(평균임금 포함여부) 미선택 차단 ──
  {
    const _ptItems2 = [
      { field:'transport',    label:'차량교통비' },
      { field:'meal',         label:'식대' },
      { field:'childcare',    label:'출산·보육수당' },
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
      toast(`지급유형(평균임금 포함여부)을 선택해 주세요: ${_names2}`, 'error');
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
    dependents:      _piGetDependents(),
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
    childcare_allowance: gv('pi-childcare') || 0,  // 출산·보육수당: 비율 적용 안 함, 입력값 그대로
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
      childcare_allowance: gv('pi-childcare') || 0,  // 출산·보육수당: 비율 적용 안 함, 입력값 그대로
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
      remote_area_allowance: gv('pi-remote-area') || 0,
      site_allowance:     gv('pi-site')    || 0,
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
      dependents: _piGetDependents(),
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
  // 회사 allowance_config 기반 항목 show/hide
  applyPIAllowanceConfig(allCompanies.find(x=>x.id===companyId)?.allowance_config ?? null);
  // 직원 선택
  const empSel = document.getElementById('pi-employee');
  empSel.value = employeeId;
  loadPIContract();
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
      btn.style.background='linear-gradient(135deg,#f59e0b,#d97706)';
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
  const _editEmpContract = (allContracts||[]).find(c => c.employee_id === p.employee_id && (c.status==='활성'||c.status==='active'));
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
  // 수정 모드: 년/월 세팅 후 급여 산정기간 재계산
  // (loadPIContract 시점에는 pi-year/pi-month가 아직 미세팅 → 부분월 판정 불가)
  { const _ppElEdit = document.getElementById('pi-pay-period');
    if(_ppElEdit && piContract){
      const _cTypeEdit = piContract.contract_type || '';
      const _isPartialTargetEdit =
        _cTypeEdit === '정규직 수습' || _cTypeEdit === '계약직' || _cTypeEdit === '계약직 수습';
      const _endRawEdit = piContract.salary_end_date || piContract.contract_end || '';
      if(_isPartialTargetEdit && _endRawEdit){
        const _endDateEdit  = new Date(_endRawEdit);
        const _monthEndEdit = new Date(p.pay_year, p.pay_month, 0);
        if(_endDateEdit < _monthEndEdit){
          const _coIdEdit = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
          const _coEdit   = allCompanies.find(c => c.id === _coIdEdit);
          const _coPPEdit = (_coEdit?.pay_period || '').replace(/\s/g,'');
          let _sStrEdit;
          if(_coPPEdit.startsWith('전월')){
            const _pm = p.pay_month === 1 ? 12 : p.pay_month - 1;
            const _py = p.pay_month === 1 ? p.pay_year - 1 : p.pay_year;
            _sStrEdit = `${_py}-${String(_pm).padStart(2,'0')}-01`;
          } else {
            _sStrEdit = `${p.pay_year}-${String(p.pay_month).padStart(2,'0')}-01`;
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
  { const _dd=document.getElementById('pi-dependents-display'); if(_dd) _dd.textContent = p.dependents||1; }
  // custom_allowances 복원 (editPayroll)
  { const _pca = _parsePICustomAllowances(p.custom_allowances);
    Object.entries(_pca).forEach(([k,v]) => setAmountVal(`pi-${k}`, v||0)); }
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
  // 값 있는 옵셔널 행(출산보육수당 등) 강제 노출 재확인 후 비정기 섹션 이동 처리
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
    c.employee_id === p.employee_id && (c.status==='활성'||c.status==='active')
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
  //   출산보육수당 행이 숨겨지는 side-effect 가 발생한다.
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
      '체력증진비':     'fitness_allowance',
      '자기계발비':     'self_dev_allowance',
      '도서지원비':     'book_allowance',
      '해외근무수당':   'overseas_allowance',
      '현장수당':       'site_allowance',
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

// ══════════════════════════════════════════════════════════════════════════════
// 급여 입력 폼 변경 감지 → 원상복구 버튼 활성/비활성 동적 갱신
// pi-form-section에 이벤트 위임(input + change) 한 번만 등록
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function(){
  const formSec = document.getElementById('pi-form-section');
  if(!formSec) return;
  function _onPIFormChange(){
    // 신규 모드(piEditPayrollId===null): 초기화 버튼 활성 여부 갱신
    // 수정 모드: 스냅샷과 비교해 원상복구 버튼 활성 여부 갱신
    // → 조건 없이 호출, _checkPIRestoreBtn() 내부에서 모드 판단
    _checkPIRestoreBtn();
  }
  // ── 수정 모드에서 임시저장 버튼 비활성화 갱신 (모드 전환 감지) ──
  // _updatePIDraftBtnForMode()는 piEditPayrollId 변경 시마다 호출됨
  // (DOMContentLoaded 시점에 한 번 실행 — 이후 _updatePIBottomBtns()에서 호출)
  _updatePIDraftBtnForMode();
  formSec.addEventListener('input',  _onPIFormChange);
  formSec.addEventListener('change', _onPIFormChange);
});

// ══════════════════════════════════════════════════════════════════════════════
// 급여 입력 '보완' 링크 클릭 처리
// 근로계약 목록 서류미비 필터로 이동 전에 현재 작성 내용 처리 방법을 확인한다.
// ══════════════════════════════════════════════════════════════════════════════
function _piOpenDocUpload(contractId){
  // 수정 모드에서는 임시저장 옵션 제공 안 함 (수정 모드는 이미 저장된 데이터)
  const isEditMode = (typeof piEditPayrollId !== 'undefined') && !!piEditPayrollId;

  // 기존 동일한 모달이 있으면 제거
  const _old = document.getElementById('_pi-doc-upload-confirm-modal');
  if(_old) _old.remove();

  const modal = document.createElement('div');
  modal.id = '_pi-doc-upload-confirm-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px 28px 22px;max-width:400px;width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="font-size:18px;font-weight:800;color:#1e1b4b;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
        <i class="fas fa-exclamation-triangle" style="color:#d97706;"></i>근로계약 목록으로 이동
      </div>
      <p style="font-size:13.5px;color:#374151;line-height:1.75;margin-bottom:20px;">
        근로계약 목록 페이지로 이동합니다.<br>
        <strong>작성 중인 내용을 어떻게 처리할까요?</strong>
      </p>
      <div style="display:flex;flex-direction:column;gap:9px;">
        ${!isEditMode ? `
        <button id="_pi-doc-draft-btn"
          style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;border-radius:10px;padding:11px 0;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">
          <i class="fas fa-save"></i> 임시저장 후 이동
        </button>` : ''}
        <button id="_pi-doc-discard-btn"
          style="background:#fff;color:#dc2626;border:1.5px solid #fca5a5;border-radius:10px;padding:11px 0;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">
          <i class="fas fa-times-circle"></i> 작성 취소 후 이동
        </button>
        <button id="_pi-doc-cancel-btn"
          style="background:#f3f4f6;color:#6b7280;border:none;border-radius:10px;padding:9px 0;font-size:13px;font-weight:600;cursor:pointer;">
          취소 (계속 작성)
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // 닫기 헬퍼
  const closeConfirm = () => { modal.remove(); };

  // 취소 → 그냥 닫기
  document.getElementById('_pi-doc-cancel-btn').onclick = closeConfirm;

  // 임시저장 후 이동 (신규 모드에만 표시)
  const draftBtn = document.getElementById('_pi-doc-draft-btn');
  if(draftBtn){
    draftBtn.onclick = async () => {
      closeConfirm();
      try{
        if(typeof savePIDraft === 'function'){
          window._piDraftSaveFromDocUpload = true;
          // '확인' 버튼 클릭 시 페이지 이동 실행
          window._piDraftSaveOnConfirm = () => _piNavigateToContractDocUpload(contractId);
          await savePIDraft();
          // savePIDraft 내부에서 모달을 표시하므로, 여기서는 추가 이동 없이 종료
          return;
        }
      } catch(e){
        console.error('[_piOpenDocUpload] 임시저장 오류:', e);
        window._piDraftSaveFromDocUpload = false;
        window._piDraftSaveOnConfirm     = null;
      }
      _piNavigateToContractDocUpload(contractId);
    };
  }

  // 작성 취소 후 이동
  document.getElementById('_pi-doc-discard-btn').onclick = () => {
    closeConfirm();
    _piNavigateToContractDocUpload(contractId);
  };
}

/**
 * 근로계약 관리 페이지로 이동해서 서류미비 필터를 적용한다.
 */
function _piNavigateToContractDocUpload(contractId){
  // 급여 입력 폼 초기화
  if(typeof backToPITargetList === 'function') backToPITargetList();

  // 근로계약 관리 페이지로 전환
  const menuEl = document.querySelector('[data-page="contracts"]');
  if(typeof showPage === 'function') showPage('contracts', menuEl);

  // 페이지 전환 후 서류미비 필터 적용 + 목록 렌더링
  requestAnimationFrame(() => {
    const filterEl = document.getElementById('cont-filter-status');
    if(filterEl){ filterEl.value = '서류미비'; }
    if(typeof renderContracts === 'function') renderContracts();
  });
}
