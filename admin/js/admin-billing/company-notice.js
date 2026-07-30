// 계약만료 통지 관리 (CEN = Contract Expiry Notice)
// ======================================================================

/** 전역 상태 */
let _cenNoticeList  = [];   // contract_expiry_notice 테이블 캐시
let _cenHistoryLoaded = false;
let _cenTab         = 'history';  // 현재 탭 (발송이력 기본)
let _cenHistoryPage = 1;
const CEN_PAGE_SIZE = 20;
const CEN_NOTICE_DAYS = 29;  // 만료 N일 전 통지 대상
let _cenContact      = null; // 대표 연락처 캐시

/** 탭 전환 */
function cenSwitchTab(tab){
  _cenTab = tab;
  document.getElementById('cen-tab-history').classList.toggle('active',  tab==='history');
  document.getElementById('cen-tab-template').classList.toggle('active', tab==='template');
  document.getElementById('cen-panel-history').style.display  = tab==='history'  ? '' : 'none';
  document.getElementById('cen-panel-template').style.display = tab==='template' ? '' : 'none';
  if(tab==='history'){
    if(!_cenHistoryLoaded){
      (async()=>{ await cenLoadHistory(true); renderCenHistory(); })();
    } else {
      renderCenHistory();
    }
  }
  if(tab==='template'){
    _cenFillTemplateSampleSel();
    renderCenTemplate();
  }
}

// ==================================================================
//  메시지 예시 탭 — 알림톡 / 이메일 템플릿 미리보기
// ==================================================================

/**
 * 샘플 선택 셀렉트 채우기
 * - 현재 통지 대상 목록(_cenNoticeList)을 옵션으로 제공
 * - 목록이 없으면 "예시 데이터로 보기"만 유지
 */
function _cenFillTemplateSampleSel(){
  // 미리보기 샘플 선택 바 제거됨 — 항상 예시 데이터 사용
}

/**
 * 메시지 템플릿 렌더링
 * 근로자용(알림톡·이메일) + 고객사용(인앱 알림) 두 섹션 모두 갱신
 */
function renderCenTemplate(){
  // ── 1. 데이터 준비 (항상 예시 데이터) ──────────────────────────
  let empName='홍길동', catLabel=CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED], coName='(주)샘플코리아',
      coRep='김대표', contractEnd='2025-07-18', daysLeft=29,
      phone='010-1234-5678', email='sample@example.com',
      adminPhone='02-000-0000', adminEmail='labor@example.com';

  const [ey,em,ed] = contractEnd.split('-');
  const endKr    = `${parseInt(ey)}년 ${parseInt(em)}월 ${parseInt(ed)}일`;
  const ddayStr  = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
  const ddayClass= daysLeft <= 7 ? 'urgent' : daysLeft <= 14 ? 'soon' : 'normal';

  // 긴급도별 문구
  const urgencyWorker  = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박했습니다. 빠른 확인이 필요합니다.'
                       : daysLeft <= 14 ? '조속한 확인을 부탁드립니다.'
                       :                 '충분한 준비 기간이 있으니 미리 확인해 주세요.';
  const urgencyCompany = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박하였습니다. 즉시 갱신 여부를 결정해 주세요.'
                       : daysLeft <= 14 ? '조속히 갱신 또는 종료 여부를 확인해 주시기 바랍니다.'
                       :                 '미리 갱신 여부를 검토하시어 원활한 인사 관리가 되시길 바랍니다.';

  // ── 2. 공통 본문 ────────────────────────────────────────────
  const messageBody =
`안녕하세요, ${empName}님.

귀하의 근로계약이 아래와 같이 만료될 예정입니다.

■ 소속회사: ${coName}
■ 고용형태: ${catLabel}
■ 만료예정: ${endKr}

남은 계약기간 내에 계약 갱신 또는 종료 여부를 소속회사와 상의하시기 바랍니다.`;

  const contactPhone = _cenContact?.phone || '02)3487-8841';
  const contactFax   = _cenContact?.fax   || '02)3487-8882';
  const contactEmail = _cenContact?.email || 'eunyangpark@naver.com';
  const contactText  = `문의 전화: ${contactPhone} | Fax: ${contactFax}`;

  // ── 3. 근로자 — 알림톡 ────────────────────────────────────────
  const kakaoBody = messageBody;
  const kakaoFooter =
`${_BRAND_SIG}
${contactText}

* 이 메시지는 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 계약만료 사전 통지로, 계약만료 예정일까지 잔여기간이 29일 이하인 경우 시스템에서 자동발송됩니다.`;

  // ── 4. 근로자 — 이메일 ────────────────────────────────────────
  const emailSubject = `[근로계약 만료 예정일 안내] ${empName}님의 ${catLabel} 계약`;
  const emailIntro = messageBody;
  const emailBody2 = '';
  const emailNotice =
`<div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:6px;">인사톡 노무톡 · 대화인사노무파트너스</div>
<div style="font-size:12px;color:#6b7280;margin-bottom:10px;">문의 전화: <span style="color:#4f46e5;font-weight:600;">${contactPhone}</span> | Fax: <span style="color:#4f46e5;font-weight:600;">${contactFax}</span></div>
<div style="font-size:11px;color:#9ca3af;line-height:1.7;border-top:1px solid #f1f5f9;padding-top:10px;">* 본 메일은 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 계약만료 사전 통지로, 계약만료 예정일까지 잔여기간이 29일 이하인 경우 시스템에서 자동발송됩니다.</div>`;

  // ── 4. 고객사 — 인앱 알림 ────────────────────────────────────
  const inappTitle  = `[근로계약 만료 예정일 안내] ${empName} ${catLabel}`;
  const inappShort  = `${empName}(${catLabel})님 계약이 ${endKr} 만료됩니다.`;

  const inappFullBody =
`안녕하세요, ${coName} ${coRep} 사장님.

소속 직원의 근로계약 만료일이 다가와 안내드립니다.

■ 직원명: ${empName}
■ 고용형태: ${catLabel}
■ 만료예정: ${endKr}

위 직원에게는 「기간제 및 단시간근로자 보호 등에 관한 법률」의 사전 통지 의무에 따라 안내를 발송하였습니다. 계약 만료일 전에 근로계약의 갱신/연장/종료 여부를 확정하셔서 저희 담당자에게 알려주시기 바랍니다.`;

  const inappFoot =
`─────────────────────
인사톡 노무톡 · 대화인사노무파트너스 담당자
● 전화: ${contactPhone}
● 이메일: ${contactEmail}
● 팩스: ${contactFax}`;

  // ── 5. DOM 반영: 근로자 알림톡 (플레인 텍스트) ────────────
  const kakaoPlain = `[근로계약 만료 예정일 안내]\n\n${kakaoBody}\n\n${kakaoFooter}`;
  _setText('cen-tmpl-kakao-plain', kakaoPlain);

  // ── 6. DOM 반영: 근로자 이메일 ──────────────────────────────
  _setText('cen-tmpl-email-subject',  `📋 ${emailSubject}`);
  _setText('cen-tmpl-email-to',       `수신: ${email || '이메일 미등록'}`);
  _setText('cen-tmpl-email-intro',    emailIntro);
  _setText('cen-tmpl-email-body2',    emailBody2);
  const body2El = document.getElementById('cen-tmpl-email-body2');
  if(body2El) body2El.style.display = emailBody2 ? '' : 'none';
  const emailNoticeEl = document.getElementById('cen-tmpl-email-notice');
  if(emailNoticeEl) emailNoticeEl.innerHTML = emailNotice;

  // ── 7. DOM 반영: 고객사 인앱 알림 ────────
  _setText('cen-tmpl-inapp-title', '[근로계약 만료 예정일 안내]');
  const inappPlain = `${inappFullBody}\n\n${inappFoot}`;
  _setText('cen-tmpl-inapp-plain', inappPlain);

}

/** 텍스트 설정 헬퍼 */
function _setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

/** showPage 진입 시 초기화 */
async function initCenPage(){
  // 대표 연락처 정보 로드 (없으면 캐시)
  if(!_cenContact) {
    try { _cenContact = await getRepresentativeContact(); } catch(e) { _cenContact = {}; }
  }
  // 고객사 필터 옵션 채우기
  _cenFillCompanyFilter('cen-log-filter-company');
  // 통지 이력 로드 (캐시 없으면)
  if(!_cenHistoryLoaded) await cenLoadHistory(true);
  // 발송 이력 렌더 (기본 탭)
  renderCenHistory();
}

/** 고객사 필터 select 옵션 자동 채우기 */
function _cenFillCompanyFilter(selId){
  const sel = document.getElementById(selId);
  if(!sel || sel.options.length > 1) return;
  allCompanies
    .filter(c => isCompanyActive(c))
    .sort((a,b)=>(a.company_name||'').localeCompare(b.company_name||'','ko'))
    .forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.company_name || c.id;
      sel.appendChild(opt);
    });
}

/** 통지 이력 DB에서 로드 */
async function cenLoadHistory(force=false){
  if(!force && _cenHistoryLoaded) return;
  try{
    const res = await fetch('../tables/contract_expiry_notice?page=1&limit=1000');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _cenNoticeList = (data.data || []).sort((a,b)=>{
      const ta = a.noticed_at || a.created_at || '';
      const tb = b.noticed_at || b.created_at || '';
      return tb.localeCompare(ta);
    });
    _cenHistoryLoaded = true;
  } catch(e){
    console.error('[CEN 이력 로드 오류]', e);
    _cenNoticeList = [];
  }
}

/**
 * 통지 대상 계산
 * 조건: 계약직/계약직수습/일용직 + 활성 + 만료일이 오늘~29일 후 + is_draft=false + status≠파기/해지/만료
 */
function _cenGetTargetContracts(){
  const today = new Date();
  today.setHours(0,0,0,0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + CEN_NOTICE_DAYS);

  // 이미 통지한 contract_id 집합 (이번 달 통지 기준)
  const nowYM = new Date().toISOString().slice(0,7); // 'YYYY-MM'
  const noticedThisMonth = new Set(
    _cenNoticeList
      .filter(r => {
        const raw = r.noticed_at || r.created_at || '';
        const ym = typeof raw === 'string' ? raw.slice(0,7) : String(raw).slice(0,7);
        return ym === nowYM;
      })
      .map(r => r.contract_id)
      .filter(Boolean)
  );

  return allContracts.filter(c => {
    if(c.is_draft) return false;
    if([CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.TERMINATED, CONTRACT_STATUS.EXPIRED].includes(c.status)) return false;
    if(c.is_voided_by_amend) return false;
    // 고용형태 확인 (emp.employment_category 우선)
    const emp = allEmployees.find(e=>e.id===c.employee_id);
    const cat = emp?.employment_category || c.contract_type || '';
    const normalizedCat = normalizeContractType(cat);
    if(![CONTRACT_TYPE.FIXED, CONTRACT_TYPE.FIXED_PROBATION, CONTRACT_TYPE.DAILY].includes(normalizedCat)) return false;
    // 계약 만료일 확인
    if(!c.contract_end) return false;
    const endDate = new Date(c.contract_end);
    endDate.setHours(0,0,0,0);
    if(endDate < today || endDate > limit) return false;
    // 이번 달 이미 통지한 계약 제외
    if(noticedThisMonth.has(c.id)) return false;
    return true;
  }).map(c => {
    const emp = allEmployees.find(e=>e.id===c.employee_id);
    const co  = allCompanies.find(x=>x.id===c.company_id);
    const cat = emp?.employment_category || c.contract_type || '-';
    const endDate = new Date(c.contract_end);
    endDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((endDate - today) / (1000*60*60*24));
    return { ...c, _emp: emp, _co: co, _cat: cat, _daysLeft: daysLeft };
  }).sort((a,b) => a._daysLeft - b._daysLeft); // 만료 임박순
}

/** 선택 건수 업데이트 및 일괄 버튼 상태 */
function cenUpdateSelectedCount(){
  const checked = document.querySelectorAll('.cen-row-chk:checked');
  const count = checked.length;
  const el = document.getElementById('cen-selected-count');
  if(el) el.textContent = count > 0 ? `${count}건 선택됨` : '';
  _cenUpdateBulkBtns();
}

function _cenUpdateBulkBtns(){
  const checked = document.querySelectorAll('.cen-row-chk:checked');
  const hasPhone = [...checked].some(chk => {
    const cId = chk.dataset.contractId;
    const c = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    return !!(emp?.phone);
  });
  const hasEmail = [...checked].some(chk => {
    const cId = chk.dataset.contractId;
    const c = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    return !!(emp?.email);
  });
  const kakaoBtn = document.getElementById('cen-btn-bulk-kakao');
  const emailBtn = document.getElementById('cen-btn-bulk-email');
  if(kakaoBtn) kakaoBtn.disabled = !(checked.length > 0 && hasPhone);
  if(emailBtn) emailBtn.disabled = !(checked.length > 0 && hasEmail);
}

/** 전체 선택/해제 */
function cenToggleAll(chkEl){
  const isChecked = chkEl.checked;
  document.querySelectorAll('.cen-row-chk').forEach(c=>{ c.checked = isChecked; });
  // thead/footer 체크박스 동기화
  ['cen-chk-all','cen-thead-chk'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.checked=isChecked;
  });
  cenUpdateSelectedCount();
}

/** 개별 통지 발송 */
async function cenSendOne(contractId, method){
  const c   = allContracts.find(x=>x.id===contractId);
  const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
  const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
  if(!c||!emp||!co){ toast('계약 정보를 찾을 수 없습니다.','error'); return; }

  if(method===DISPATCH_METHOD.KAKAO && !emp.phone){ toast(`${emp.name} — 전화번호가 등록되지 않았습니다.`,'error'); return; }
  if(method===DISPATCH_METHOD.EMAIL && !emp.email){ toast(`${emp.name} — 이메일이 등록되지 않았습니다.`,'error'); return; }

  const today = new Date(); today.setHours(0,0,0,0);
  const endDate = new Date(c.contract_end); endDate.setHours(0,0,0,0);
  const daysLeft = Math.ceil((endDate-today)/(1000*60*60*24));

  const recipient = method===DISPATCH_METHOD.KAKAO ? emp.phone : method===DISPATCH_METHOD.EMAIL ? emp.email : '직접배부';
  const confirmMsg = method===DISPATCH_METHOD.MANUAL
    ? `[수동 교부 완료]\n\n${emp.name} (${co.company_name}) 님의 계약만료 통지를\n직접 교부하셨습니까?\n\n계약 만료일: ${c.contract_end} (D-${daysLeft})`
    : `[계약만료 통지 — ${method}]\n\n${emp.name} (${co.company_name})\n계약 만료일: ${c.contract_end} (D-${daysLeft})\n수신: ${recipient}\n\n발송 후 고객사(${co.company_name}) 앱에도 알림이 함께 전송됩니다.\n\n발송하시겠습니까?`;

  if(!confirm(confirmMsg)) return;
  try{
    // 1) 근로자 통지 이력 저장
    await _cenSaveNotice({ contractId, method, status: DISPATCH_STATUS.COMPLETED, recipient, note:`개별 ${method} — ${emp.name}`, daysLeft });
    // 2) 고객사 인앱 알림 발송 (수동교부 포함 항상 전송)
    await _cenSendCompanyNotice({ c, emp, co, daysLeft });
    toast(`✅ ${emp.name} 계약만료 통지(${method}) 완료 + 고객사 알림 발송`, 'success');
    await cenRefresh();
  } catch(e){ console.error(e); toast('발송 중 오류가 발생했습니다.','error'); }
}

/** 일괄 발송 */
async function cenBulkSend(method){
  const checked = [...document.querySelectorAll('.cen-row-chk:checked')];
  if(!checked.length){ toast('발송할 항목을 선택하세요.','warning'); return; }

  const targets = checked.map(chk=>{
    const cId = chk.dataset.contractId;
    const c   = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
    return { c, emp, co };
  }).filter(({c,emp,co})=>{
    if(!c||!emp||!co) return false;
    if(method===DISPATCH_METHOD.KAKAO && !emp.phone) return false;
    if(method===DISPATCH_METHOD.EMAIL && !emp.email) return false;
    return true;
  });

  if(!targets.length){ toast(`${method} 발송 가능한 대상이 없습니다. (연락처 미등록)`, 'warning'); return; }

  const names = targets.slice(0,3).map(({emp})=>emp.name).join(', ');
  const more  = targets.length > 3 ? ` 외 ${targets.length-3}명` : '';
  if(!confirm(`[계약만료 일괄 ${method} 발송]\n\n총 ${targets.length}건을 발송하시겠습니까?\n대상: ${names}${more}`)) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const bulkKakaoBtn = document.getElementById('cen-btn-bulk-kakao');
  const bulkEmailBtn = document.getElementById('cen-btn-bulk-email');
  if(bulkKakaoBtn) bulkKakaoBtn.disabled=true;
  if(bulkEmailBtn) bulkEmailBtn.disabled=true;

  let ok=0, fail=0;
  for(const {c, emp, co} of targets){
    const endDate = new Date(c.contract_end); endDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((endDate-today)/(1000*60*60*24));
    const recipient = method===DISPATCH_METHOD.KAKAO ? emp.phone : emp.email;
    try{
      // 근로자 통지 이력 저장
      await _cenSaveNotice({ contractId: c.id, method, status: DISPATCH_STATUS.COMPLETED, recipient, note:`일괄 ${method} — ${emp.name}`, daysLeft });
      // 고객사 인앱 알림 발송
      await _cenSendCompanyNotice({ c, emp, co, daysLeft });
      ok++;
    } catch(e){ fail++; }
  }
  toast(`일괄 ${method} 완료 — 성공 ${ok}건 + 고객사 알림 발송${fail?` / 실패 ${fail}건`:''}`, ok>0?'success':'error');
  await cenRefresh();
}

/**
 * 통일된 인앱 알림 푸터 (● 불릿 형식)
 * 모든 고객사 인앱 메시지 하단에 공통 적용
 */
async function _getContactFoot() {
  const c = await getRepresentativeContact();
  const phone = c?.phone || '02)3487-8841';
  const email = c?.email || 'eunyangpark@naver.com';
  const fax   = c?.fax   || '02)3487-8882';
  return `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n● 전화: ${phone}\n● 이메일: ${email}\n● 팩스: ${fax}`;
}

/**
 * ─────────────────────────────────────────────────────────────────
 * 공통 고객사 인앱 알림 발송 헬퍼
 * ─────────────────────────────────────────────────────────────────
 * @param {object} opts
 *   companyId      {string}  고객사 ID (필수)
 *   companyName    {string}  고객사명
 *   noticeType     {string}  알림 유형 식별자 (필수)
 *   title          {string}  알림 제목 (필수)
 *   body           {string}  알림 본문 (필수)
 *   contractId     {string}  관련 계약 ID
 *   employeeId     {string}  관련 근로자 ID
 *   employeeName   {string}  관련 근로자명
 *   contractEnd    {string}  계약 종료일
 *   extraData      {object}  추가 메타데이터 (JSON 직렬화 가능)
 */
async function _sendCompanyNotice({
  companyId, companyName='',
  noticeType, title, body,
  contractId='', employeeId='', employeeName='',
  contractEnd='', extraData={}
}){
  if(!companyId || !noticeType || !title || !body) return;
  const adminName = _getAdminUsername();
  const foot = await _getContactFoot();
  try {
    await fetch('../tables/company_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        company_id   : companyId,
        company_name : companyName,
        notice_type  : noticeType,
        title,
        body: body + '\n\n' + foot,
        contract_id  : contractId,
        employee_id  : employeeId,
        employee_name: employeeName,
        contract_end : contractEnd,
        days_until_expiry: 0,
        sent_at      : new Date().toISOString(),
        sent_by      : adminName,
        is_read      : false,
        read_at      : '',
        ...extraData,
      }),
    });
  } catch(e){
    console.warn('[_sendCompanyNotice 오류]', e);
  }
}

/**
 * 고객사 인앱 알림 발송 — company_notices 테이블 INSERT
 */
async function _cenSendCompanyNotice({ c, emp, co, daysLeft }){
  if(!c || !co) return;
  const cat       = emp?.employment_category || c.contract_type || '';
    const coRep     = getCompanyRepName(co);
  const ddayStr   = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
  const [ey,em,ed]= (c.contract_end||'----/--/--').split('-');
  const endKr     = ey ? `${parseInt(ey)}년 ${parseInt(em)}월 ${parseInt(ed)}일` : c.contract_end;
  const urgencyCompany = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박하였습니다. 즉시 갱신 여부를 결정해 주세요.'
                       : daysLeft <= 14 ? '조속히 갱신 또는 종료 여부를 확인해 주시기 바랍니다.'
                       :                 '미리 갱신 여부를 검토하시어 원활한 인사 관리가 되시길 바랍니다.';

  const title = `[계약만료 예정] ${emp?.name||''} ${contractTypeLabel(cat)} — ${ddayStr}`;
  const body  =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원의 근로계약 만료일이 다가와 안내드립니다.
${urgencyCompany}

■ 직원명: ${emp?.name||''}
■ 고용형태: ${contractTypeLabel(cat)}
■ 계약 만료일: ${endKr} (${ddayStr})

담당 노무사에게 갱신 여부를 확인해 주세요.

※ 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 사전 통지`;

  await _sendCompanyNotice({
    companyId   : co.id, companyName: co.company_name || '',
    noticeType  : 'contract_expiry',
    title, body,
    contractId  : c.id,
    employeeId  : emp?.id || '', employeeName: emp?.name || '',
    contractEnd : c.contract_end || '',
    extraData   : { days_until_expiry: daysLeft },
  });
}

/** 통지 이력 DB 저장 */
async function _cenSaveNotice({ contractId, method, status, recipient, note, daysLeft }){
  const c   = allContracts.find(x=>x.id===contractId);
  const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
  const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
  const adminName = _getAdminUsername();
  const cat = emp?.employment_category || c?.contract_type || '';

  const payload = {
    contract_id     : contractId,
    employee_id     : emp?.id || '',
    employee_name   : emp?.name || '',
    company_id      : co?.id || '',
    company_name    : co?.company_name || '',
    contract_type   : cat,
    contract_end    : c?.contract_end || '',
    days_until_expiry: daysLeft,
    notice_method   : method,
    notice_status   : status,
    recipient       : recipient || '',
    noticed_at      : new Date().toISOString(),
    noticed_by      : adminName,
    note            : note || '',
  };

  const res = await fetch('../tables/contract_expiry_notice', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(payload),
  });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const saved = await res.json();
  // 캐시에 즉시 반영
  _cenNoticeList.unshift(saved);
  return saved;
}

/** 새로고침 */
async function cenRefresh(){
  _cenHistoryLoaded = false;
  await cenLoadHistory(true);
  render2YrStats();
  if(_cenTab === 'history') renderCenHistory();
}

// ==================================================================
