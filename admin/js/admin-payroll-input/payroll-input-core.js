// ─── PAYROLL INPUT ───
let piContract=null;

// ============================================================================
// 급여 입력 페이지 — 전월 임금대장 엑셀 다운로드
// ============================================================================

/**
 * 특정 고객사의 특정 년월에 유효 계약이 있는 직원 전원의 급여가
 * is_draft=false 로 모두 입력완료 되었는지 확인한다.
 * @returns {boolean} 전원 입력완료 여부
 */
function _isPIMonthFullyPaid(coId, yr, mo){
  const VALID_STATUSES = new Set([CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.PENDING, CONTRACT_STATUS.DOCS_INCOMPLETE, CONTRACT_STATUS.TERMINATE_PENDING]);

  // 고객사 산정기준으로 급여 산정기간 계산
  const _co = (allCompanies||[]).find(c => c.id === coId);
  const _ppMo  = _co?.pay_period_month || 'current_month';
  const _ppDay = parseInt(_co?.pay_period_day) || 1;
  const _isJeonwol = _ppMo === 'prev_month';

  let periodStart, periodEnd;
  if(_isJeonwol){
    const _prevMo = mo === 1 ? 12 : mo - 1;
    const _prevYr = mo === 1 ? yr - 1 : yr;
    periodStart = `${_prevYr}-${String(_prevMo).padStart(2,'0')}-${String(_ppDay).padStart(2,'0')}`;
    const _eDate = new Date(_prevYr, _prevMo - 1, _ppDay);
    _eDate.setMonth(_eDate.getMonth() + 1);
    _eDate.setDate(_eDate.getDate() - 1);
    periodEnd = _eDate.toISOString().slice(0,10);
  } else {
    periodStart = `${yr}-${String(mo).padStart(2,'0')}-${String(_ppDay).padStart(2,'0')}`;
    const _eDate = new Date(yr, mo - 1, _ppDay);
    _eDate.setMonth(_eDate.getMonth() + 1);
    _eDate.setDate(_eDate.getDate() - 1);
    periodEnd = _eDate.toISOString().slice(0,10);
  }

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
            class="btn btn-success" style="padding:9px 22px;font-size:13px;box-shadow:0 2px 8px rgba(16,185,129,.3);">
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

// 급여 입력 폼 변경 감지 → 원상복구 버튼 활성/비활성 동적 갱신
// pi-form-section에 이벤트 위임(input + change) 한 번만 등록
// ==============================================================================
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
