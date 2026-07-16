// ─── COMPANIES ───
/* ─────────────────────────────────────────────────────────────────
   고객사 관리 페이지 — 임시저장 배너
   ───────────────────────────────────────────────────────────────── */
function _renderCompaniesDraftBanner(){
  const sec = document.getElementById('companies-draft-banner');
  if(!sec) return;

  const drafts = allCompanies.filter(c => !!c.is_draft);
  if(!drafts.length){ sec.style.display = 'none'; sec.innerHTML = ''; return; }

  // 저장 시각 포맷 헬퍼
  function fmtTime(ts){
    if(!ts) return '';
    const d = new Date(isNaN(Number(ts)) ? ts : Number(ts));
    if(isNaN(d.getTime())) return '';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} `
         + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  const rows = drafts.map(c => {
    const savedAt = fmtTime(c.draft_saved_at);
    return `
      <div class="draft-item-row" style="cursor:default;">
        <div class="draft-item-icon co"><i class="fas fa-building"></i></div>
        <div class="pi-adb-row-main">
          <div class="pi-adb-row-name">${c.company_name || '(이름 없음)'}</div>
        </div>
        <div class="pi-adb-row-right" style="flex-direction:row;align-items:center;gap:8px;">
          ${savedAt ? `<span class="pi-adb-row-time">임시저장 ${savedAt}</span>` : ''}
          <button onclick="openCompanyModal('${c.id}')" class="btn-draft-edit-sm"><i class="fas fa-pencil-alt"></i> 이어 작성</button>
          <button onclick="_deleteDraft('${c.id}','companies','${(c.company_name||'(이름 없음)').replace(/'/g,"\\'")}')" class="btn-draft-del-sm"><i class="fas fa-trash-alt"></i> 삭제</button>
        </div>
      </div>`;
  }).join('');

  sec.style.display = '';
  sec.innerHTML = `
    <div class="dash-ac-card draft-alert-card">
      <div class="draft-alert-card-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="pulse-dot"></span>
          <span class="dash-ac-title draft-alert-title" style="font-size:13.5px;">임시저장 미완료 고객사</span>
          <span class="dash-ac-badge" style="background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:20px;padding:2px 9px;font-size:11.5px;font-weight:700;">${drafts.length}건</span>
        </div>
        <span style="font-size:11.5px;color:#b45309;">클릭하여 이어 작성할 수 있습니다</span>
      </div>
      <div class="draft-alert-card-body" style="padding:0;">
        <div style="padding:16px 20px;">${rows}</div>
      </div>
    </div>`;
}

function renderCompanies(){
  const list=document.getElementById('company-list');
  if(!list) return;

  // ── 고객사 임시저장 배너 ──
  _renderCompaniesDraftBanner();

  // ── 데이터 로딩 중: 스켈레톤 카드 표시 ──
  if(!_dataReady){
    list.innerHTML = Array.from({length:6}, (_,i) => `
      <div class="company-card-skel" style="animation-delay:${i*0.1}s;">
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
          <div class="skel-line" style="width:72px;height:18px;"></div>
          <div class="skel-line" style="width:44px;height:18px;border-radius:20px;"></div>
        </div>
        <div class="skel-line" style="width:55%;height:16px;margin-bottom:10px;"></div>
        <div class="skel-line" style="width:38%;height:11px;margin-bottom:18px;"></div>
        <div class="skel-line" style="width:100%;height:48px;border-radius:8px;margin-bottom:12px;"></div>
        <div class="skel-line" style="width:90%;height:11px;margin-bottom:6px;"></div>
        <div class="skel-line" style="width:75%;height:11px;margin-bottom:6px;"></div>
        <div class="skel-line" style="width:82%;height:11px;"></div>
      </div>`).join('');
    return;
  }

  // 필터
  const statusFilter=document.getElementById('company-status-filter').value;
  const searchInput=document.getElementById('company-search').value.toLowerCase();
  
  // 오늘 날짜 (필터 기준)
  const _todayStr = new Date().toISOString().slice(0, 10);

  // effectiveStatus 계산 헬퍼: DB status=ACTIVE이더라도 해지일이 오늘 이하면 inactive 취급
  function _effectiveStatus(c){
    if(c.is_draft) return 'draft';
    if(c.status === COMPANY_STATUS.ACTIVE && c.contract_end_date && c.contract_end_date <= _todayStr)
      return COMPANY_STATUS.INACTIVE;
    return c.status || COMPANY_STATUS.ACTIVE;
  }

  let filtered=allCompanies.filter(c=>{
    // 임시저장 항목은 상단 배너에서 별도 표시되므로 목록 카드에서 제외
    if(c.is_draft) return false;
    const effStatus = _effectiveStatus(c);
    if(statusFilter&&effStatus!==statusFilter) return false;
    if(searchInput&&!(c.company_name||'').toLowerCase().includes(searchInput)) return false;
    return true;
  }).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));
  
  if(!filtered.length){list.innerHTML='<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-building"></i><p>조건에 맞는 고객사가 없습니다</p></div>';return;}
  
  list.innerHTML=filtered.map(c=>{
    const activeContractCount = (allContracts||[]).filter(ct =>
      ct.company_id === c.id && ct.status === CONTRACT_STATUS.ACTIVE
    ).length;
    const isDraftComp = !!c.is_draft;
    // 해지예정: DB=ACTIVE + 해지일이 오늘보다 미래
    const isTerminatePending = !isDraftComp
      && c.status === COMPANY_STATUS.ACTIVE
      && c.contract_end_date
      && c.contract_end_date > _todayStr;
    // 실질 해지: DB=ACTIVE이지만 해지일이 오늘 이하 (자동 해지 도래)
    const isEffectivelyInactive = !isDraftComp
      && c.status === COMPANY_STATUS.ACTIVE
      && c.contract_end_date
      && c.contract_end_date <= _todayStr;
    // 뱃지 렌더링
    const statusBadge = isDraftComp
      ? '<span class="badge-draft"><i class="fas fa-cloud" style="font-size:9px;margin-right:2px;"></i>임시저장</span>'
      : (isEffectivelyInactive || c.status===COMPANY_STATUS.INACTIVE
          ? '<span class="badge badge-gray">'+companyStatusLabel(COMPANY_STATUS.INACTIVE)+'</span>'
          : '<span class="badge badge-green">'+companyStatusLabel(COMPANY_STATUS.ACTIVE)+'</span>');


    // 이번 달 급여 데이터
    const now=new Date();
    const nowYear=now.getFullYear(), nowMonth=now.getMonth()+1;
    // 유효 근로계약(active) 직원 ID 목록 (중복 제거)
    const activeEmpIds=[...new Set(
      (allContracts||[]).filter(ct=>ct.company_id===c.id&&ct.status===CONTRACT_STATUS.ACTIVE).map(ct=>ct.employee_id)
    )];
    const totalTarget=activeEmpIds.length; // 급여 입력 대상 수
    // 이번 달 입력 완료(non-draft) payroll이 있는 직원 수
    const thisMonthPayrolls=(allPayrolls||[]).filter(p=>!p.is_draft&&p.company_id===c.id&&p.pay_year==nowYear&&p.pay_month==nowMonth);
    const paidEmpIds=new Set(thisMonthPayrolls.map(p=>p.employee_id));
    const paidCount=activeEmpIds.filter(eid=>paidEmpIds.has(eid)).length; // 유효계약 직원 중 입력완료 수
    const allPaid=totalTarget>0&&paidCount===totalTarget; // 전원 완료 여부
    const totalNetPay=thisMonthPayrolls.reduce((sum,p)=>sum+(p.net_pay||0),0);

    // 급여 입력 섹션 (이용중 고객사만, 임시저장·실질해지 제외)
    let payrollSection='';
    if(c.status===COMPANY_STATUS.ACTIVE&&!isDraftComp&&!isEffectivelyInactive){
      if(totalTarget===0){
        // 유효 계약 없음 — 섹션 미표시
        payrollSection='';
      } else if(allPaid){
        // 전원 완료 → 총액 표시
        payrollSection=`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-top:10px;">
           <div>
             <div style="font-size:10px;color:#0369a1;margin-bottom:2px;">이번 달 급여 총액 <span style="color:#16a34a;font-weight:700;">(${paidCount}/${totalTarget}건 완료)</span></div>
             <div style="font-size:15px;font-weight:700;color:#0c4a6e;">${Math.round(totalNetPay).toLocaleString('ko-KR')}<span style="font-size:11px;font-weight:500;">원</span></div>
           </div>
           <button class="btn btn-sm btn-warning" onclick="openPayrollInputModal('${c.id}')">
             <i class="fas fa-edit"></i> 내역 수정
           </button>
         </div>`;
      } else {
        // 미완료 → 미입력 + 진행률 표시
        const progressTxt=paidCount>0?`${paidCount}/${totalTarget}건 입력`:`0/${totalTarget}건 입력`;
        payrollSection=`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-top:10px;">
           <div>
             <div style="font-size:10px;color:#c2410c;margin-bottom:2px;">이번 달 급여</div>
             <div style="font-size:13px;font-weight:600;color:#9a3412;">미입력 ⏳ <span style="font-size:11px;font-weight:500;color:#b45309;">(${progressTxt})</span></div>
           </div>
           <button class="btn btn-sm btn-danger" onclick="openPayrollInputModal('${c.id}')">
             <i class="fas fa-plus-circle"></i> 급여 입력
           </button>
         </div>`;
      }
    }
    
    return `<div class="company-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="code-badge">코드: ${_normalizeAccessCode(c.access_code)}</span>
        ${statusBadge}
      </div>
      <h3>${c.company_name}</h3>
      <div style="font-size:11px;color:#aaa;margin-top:2px;margin-bottom:6px;">
        <div><i class="fas fa-calendar-alt" style="margin-right:3px;"></i>계약시작일: ${c.contract_start_date||'-'}</div>
        ${(c.status===COMPANY_STATUS.INACTIVE||isEffectivelyInactive)&&c.contract_end_date
          ? `<div style="margin-top:2px;"><i class="fas fa-ban" style="color:#dc2626;margin-right:3px;"></i><span style="color:#dc2626;">계약 해지일: ${c.contract_end_date}</span></div>`
          : isTerminatePending&&c.contract_end_date
          ? `<div style="margin-top:2px;"><i class="fas fa-clock" style="color:#d97706;margin-right:3px;"></i><span style="color:#d97706;">해지 예정일: ${c.contract_end_date}</span></div>`
          : ''}
      </div>
      ${payrollSection}
      <p style="margin-top:10px;">대표: ${(()=>{const reps=_cmParseReps(c);return reps.length>1?`${reps[0].name} 외 ${reps.length-1}명`:c.representative||'-'})()} · 업종: ${c.industry||'-'}<br>사업자: ${c.business_number||'-'}<br>급여일: ${c.pay_day||'-'} · 산정: ${c.pay_period_month&&c.pay_period_day?`${c.pay_period_month} ${c.pay_period_day}일부터 1개월간`:(c.pay_period&&c.pay_period.includes('~')?c.pay_period:'미설정')}<br><i class="fas fa-shield-alt" style="color:#6366f1;margin-right:3px;font-size:10px;"></i>4대보험: ${c.insurance_basis||'요율 기준'} · <i class="fas fa-umbrella-beach" style="color:#0891b2;margin-right:3px;font-size:10px;"></i>연차: ${c.annual_leave_basis||'회계년도 기준'}<br>${c.phone||''}</p>
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px;font-weight:600;color:#3b82f6;"><i class="fas fa-users"></i> 유효 근로계약: ${activeContractCount}건</div>
      ${c.note ? `<div style="margin-top:6px;font-size:11.5px;color:#6b7280;"><i class="fas fa-sticky-note" style="margin-right:4px;color:#9ca3af;"></i>${c.note}</div>` : ''}
      ${isDraftComp
        ? `<div style="margin-top:10px;padding:9px 12px;background:linear-gradient(90deg,#fffbeb,#fef3c7);border:1.5px dashed #f59e0b;border-radius:8px;display:flex;flex-direction:column;gap:8px;">
             <span style="font-size:11.5px;color:#92400e;font-weight:600;"><i class="fas fa-exclamation-circle" style="margin-right:4px;color:#f59e0b;"></i>임시저장 상태 — 등록을 완료해 주세요</span>
             <button class="btn btn-draft btn-sm" style="width:100%;" onclick="editCompany('${c.id}')"><i class="fas fa-pencil-alt"></i> 계속 작성</button>
           </div>`
        : (c.status===COMPANY_STATUS.INACTIVE||isEffectivelyInactive)
          ? `<div style="margin-top:8px;">
              <div style="padding:8px 10px;background:#fff3f3;border:1px solid #fca5a5;border-radius:6px;font-size:11px;color:#b91c1c;line-height:1.5;margin-bottom:8px;">
                <i class="fas fa-info-circle"></i> 해지고객사의 데이터 보존년한은 해지일로부터 5년입니다
              </div>
              <button class="btn btn-sm btn-secondary" style="width:100%;" onclick="cancelTerminate('${c.id}','${c.company_name}')">
                <i class="fas fa-undo"></i>해지 취소
              </button>
             </div>`
          : isTerminatePending
          ? `<div style="margin-top:10px;">
              <div style="display:flex;gap:6px;margin-bottom:6px;">
                <button class="btn btn-sm btn-indigo" style="flex:1;" onclick="goContractsByCompany('${c.id}','${c.company_name}')">근로계약</button>
                <button class="btn btn-sm btn-indigo" style="flex:1;" onclick="goPayrollsByCompany('${c.id}','${c.company_name}')">급여명세</button>
                ${allPaid
                  ? `<button class="btn btn-sm btn-indigo" style="flex:1;" onclick="goWageLedgerByCompany('${c.id}','${c.company_name}')">임금대장</button>`
                  : `<button class="btn btn-sm" disabled style="flex:1;">임금대장</button>`}
              </div>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-warning btn-sm" style="flex:1;" onclick="editCompany('${c.id}')">고객정보 수정</button>
                <button class="btn btn-sm btn-warning" style="flex:1;" onclick="changeEndDate('${c.id}','${c.company_name}','${c.contract_end_date}')">
                  <i class="fas fa-calendar-edit"></i>해지일 변경
                </button>
                <button class="btn btn-sm btn-secondary" style="flex:1;" onclick="cancelTerminate('${c.id}','${c.company_name}')">
                  <i class="fas fa-undo"></i>해지 취소
                </button>
              </div>
             </div>`
          : `<div style="margin-top:10px;">
              <div style="display:flex;gap:6px;margin-bottom:6px;">
                <button class="btn btn-sm btn-indigo" style="flex:1;" onclick="goContractsByCompany('${c.id}','${c.company_name}')">근로계약</button>
                <button class="btn btn-sm btn-indigo" style="flex:1;" onclick="goPayrollsByCompany('${c.id}','${c.company_name}')">급여명세</button>
                ${allPaid
                  ? `<button class="btn btn-sm btn-indigo" style="flex:1;" onclick="goWageLedgerByCompany('${c.id}','${c.company_name}')">임금대장</button>`
                  : `<button class="btn btn-sm" disabled style="flex:1;">임금대장</button>`}
              </div>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-warning btn-sm" style="flex:1;" onclick="editCompany('${c.id}')">고객정보 수정</button>
                <button class="btn btn-sm btn-secondary" style="flex:1;" onclick="terminateCompany('${c.id}','${c.company_name}')">자문계약 해지</button>
              </div>
             </div>`
      }
    </div>`;
  }).join('');
}

// ── 고객사 카드에서 임금대장 페이지로 이동 ──
function goWageLedgerByCompany(companyId, companyName){
  const menuEl = document.querySelector('.menu-item[data-page="wage-ledger"]');
  showPage('wage-ledger', menuEl);
  setTimeout(() => {
    if(typeof selectWLCompany === 'function') selectWLCompany(companyId, companyName);
  }, 100);
}

// ── 급여 산정기간 UI ──────────────────────────────────────────────────────────
/**
 * 2개 셀렉트(월/일) → hidden #cm-period(표시용 텍스트) + #cm-period-month-hidden + #cm-period-day-hidden 값 조합 + 미리보기 갱신
 * 저장 포맷: "전월 1일부터 1개월간" (pay_period 컬럼 호환용 텍스트)
 */
function _cmPeriodCompose(){
  const mo  = document.getElementById('cm-period-month')?.value || '';
  const day = document.getElementById('cm-period-day')?.value   || '';
  const hidden    = document.getElementById('cm-period');
  const moHidden  = document.getElementById('cm-period-month-hidden');
  const dayHidden = document.getElementById('cm-period-day-hidden');
  // 월·일 모두 선택된 경우에만 합성값 세팅, 하나라도 없으면 hidden 비움
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

/**
 * 저장된 pay_period_month / pay_period_day 컬럼값(우선) 또는 pay_period 문자열을 파싱해 2개 셀렉트에 복원.
 * @param {string} val  - pay_period 텍스트 (fallback용)
 * @param {string} month - pay_period_month DB 컬럼값 ('전월'|'당월')
 * @param {number|string} day - pay_period_day DB 컬럼값 (1~31)
 */
function _cmPeriodRestore(val, month, day){
  const pmEl = document.getElementById('cm-period-month');
  const pdEl = document.getElementById('cm-period-day');

  // 월 복원
  let resolvedMonth = '';
  if(month){
    resolvedMonth = month;
  } else if(val){
    const s = val.replace(/\s/g,'');
    const m = s.match(/^(전월|당월)(\d+)일/);
    if(m) resolvedMonth = m[1];
  }
  if(pmEl) pmEl.value = resolvedMonth; // 값 없으면 '월 선택' 유지

  // 일 복원
  let resolvedDay = '';
  if(day !== undefined && day !== null && day !== ''){
    resolvedDay = String(day);
  } else if(val){
    const s = val.replace(/\s/g,'');
    const m = s.match(/^(전월|당월)(\d+)일/);
    if(m) resolvedDay = m[2];
  }
  if(pdEl) pdEl.value = resolvedDay; // 값 없으면 '일 선택' 유지

  _cmPeriodCompose();
}

/** select 요소에 value 세팅. 없는 옵션이면 첫 번째 옵션(빈 값) 유지 */
function _cmSetSelect(id, value){
  const el = document.getElementById(id);
  if(!el) return;
  const opt = [...el.options].find(o => o.value === value);
  el.value = opt ? value : '';
}

// 임시저장 진행 중인 고객사 draft ID (신규 작성 시 추적용)
let _currentCompanyDraftId = null;

// ── 앱 접근코드 자동 생성 ──────────────────────────────────────────────────
function generateAccessCode(){
  // 형식: 숫자 + 대소문자 알파벳 혼합 6자리 (예: A3bK9x)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // O·I·0·1·l 제외 (혼동 방지)
  let code = '';
  for(let i=0; i<6; i++){ code += chars[Math.floor(Math.random() * chars.length)]; }
  // 기존 고객사 코드와 충돌 검사
  const used = (allCompanies||[]).map(c=>c.access_code).filter(Boolean);
  return used.includes(code) ? generateAccessCode() : code; // 충돌 시 재귀 재생성
}
/** SQLite type affinity로 인해 숫자형 코드가 "2345.0" 형태로 저장될 수 있어 정제 */
function _normalizeAccessCode(code){
  if(!code && code !== 0) return '';
  const s = String(code);
  // "2345.0" 처럼 정수.0 형태면 정수 문자열로 변환
  if(/^\d+\.0$/.test(s)) return String(Math.trunc(parseFloat(s)));
  return s;
}
function _setAccessCode(code){
  const normalized = _normalizeAccessCode(code);
  document.getElementById('cm-code').value = normalized;
  const displayEl = document.getElementById('cm-code-display');
  if(displayEl){ displayEl.value = normalized || ''; displayEl.readOnly = true; displayEl.style.background = '#f1f5f9'; displayEl.style.borderColor = '#e2e8f0'; }
  const btnEl = document.getElementById('cm-code-action-btn');
  if(btnEl){ btnEl.innerHTML = '<i class="fas fa-pen"></i> 변경'; btnEl.onclick = _toggleCmCodeEdit; }
}

// ── 대표자 정보 동적 행 ──
let _cmRepIdx = 0;
function _cmRepRowHTML(idx, data = { name: '', phone: '', email: '' }) {
  return `<div class="cm-rep-row" id="cm-rep-row-${idx}" style="display:flex;align-items:flex-end;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
    <div class="form-group" style="flex:1;min-width:100px;"><label>대표자명</label><input type="text" id="cm-rep-name-${idx}" placeholder="대표자명" value="${_esc(data.name)}" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group" style="flex:1;min-width:110px;"><label>연락처</label><input type="text" id="cm-rep-phone-${idx}" placeholder="연락처" value="${_esc(data.phone)}" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group" style="flex:2;min-width:180px;"><label>이메일</label><input type="text" id="cm-rep-email-${idx}" placeholder="이메일" value="${_esc(data.email)}" style="width:100%;box-sizing:border-box;" /></div>
    ${idx > 0 ? `<button type="button" onclick="_cmRemoveRepRow(${idx})" class="btn btn-sm btn-secondary" style="flex-shrink:0;"><i class="fas fa-trash-alt"></i></button>` : `<span style="width:32px;flex-shrink:0;"></span>`}
  </div>`;
}
function _cmAddRepRow(data = { name: '', phone: '', email: '' }) {
  const container = document.getElementById('cm-rep-rows');
  if (!container) return;
  const idx = _cmRepIdx++;
  const row = document.createElement('div');
  row.innerHTML = _cmRepRowHTML(idx, data);
  container.appendChild(row.firstElementChild);
}
function _cmRemoveRepRow(idx) {
  const row = document.getElementById('cm-rep-row-' + idx);
  if (row) row.remove();
}
function _cmCollectReps() {
  const reps = [];
  for (let i = 0; i < _cmRepIdx; i++) {
    const nameEl = document.getElementById('cm-rep-name-' + i);
    const phoneEl = document.getElementById('cm-rep-phone-' + i);
    const emailEl = document.getElementById('cm-rep-email-' + i);
    const name = nameEl?.value?.trim() || '';
    if (name) {
      reps.push({ name, phone: phoneEl?.value?.trim() || '', email: emailEl?.value?.trim() || '' });
    }
  }
  return reps;
}
function _cmParseReps(c) {
  if (!c) return [];
  if (c.representatives) {
    try { const r = typeof c.representatives === 'string' ? JSON.parse(c.representatives) : c.representatives; if (Array.isArray(r)) return r; } catch(e){}
  }
  if (c.representative || c.phone || c.email) {
    return [{ name: c.representative || '', phone: c.phone || '', email: c.email || '' }];
  }
  return [];
}
// 전역 헬퍼: 고객사 대표자명 표시 (계약서 등에서 사용)
function getCompanyRepName(co) {
  const reps = _cmParseReps(co);
  return reps.map(r => r.name).filter(Boolean).join(', ') || '-';
}
function getCompanyRepGreeting(co) {
  const reps = _cmParseReps(co);
  const names = reps.map(r => r.name).filter(Boolean);
  if (names.length === 0) return '';
  return `, ${names.join(', ')} 사장님`;
}
function _cmClearRepRows() {
  _cmRepIdx = 0;
  const container = document.getElementById('cm-rep-rows');
  if (container) container.innerHTML = '';
}
function _esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function _onCmCodeInput(){
  const el = document.getElementById('cm-code-display');
  document.getElementById('cm-code').value = el.value;
  el.style.borderColor = ''; el.style.background = '';
  const m = document.getElementById('cm-code-msg');
  if(m){ m.style.color = '#9ca3af'; m.innerHTML = '<i class="fas fa-info-circle"></i> 숫자와 알파벳을 포함한 6글자 이상'; }
}
function _toggleCmCodeEdit(){
  const inputEl = document.getElementById('cm-code-display');
  const btnEl = document.getElementById('cm-code-action-btn');
  if(!inputEl || !btnEl) return;
  if(inputEl.readOnly){
    inputEl.readOnly = false;
    inputEl.style.background = '#fff';
    inputEl.style.borderColor = '#6366f1';
    inputEl.focus();
    btnEl.innerHTML = '<i class="fas fa-check-circle"></i> 중복체크';
    btnEl.onclick = checkAccessCodeDuplicate;
  }
}
function checkAccessCodeDuplicate(){
  const inputEl = document.getElementById('cm-code-display');
  const code = inputEl?.value?.trim();
  const msgEl = document.getElementById('cm-code-msg');
  if(!code){ toast('접근 코드를 입력하세요.', 'error'); return; }
  // 형식 검증: 6글자 이상, 숫자+알파벳 모두 포함
  if(code.length < 6 || !/[a-zA-Z]/.test(code) || !/[0-9]/.test(code)){
    if(msgEl){ msgEl.style.display = 'block'; msgEl.style.color = '#dc2626'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 숫자와 알파벳을 포함한 6글자 이상'; }
    if(inputEl){ inputEl.style.borderColor = '#dc2626'; inputEl.style.background = '#fef2f2'; inputEl.focus(); }
    toast('숫자와 알파벳을 포함한 6글자 이상 입력하세요.', 'error');
    return;
  }
  // 형식 통과 시 테두리 복원
  if(inputEl){ inputEl.style.borderColor = ''; inputEl.style.background = ''; }
  // 서버에서 중복 검사 (loadCompanies limit=100 이슈 회피)
  const currentId = editId.company || _cmpData?.id;
  fetch(`/api/companies/check-code?code=${encodeURIComponent(code)}&exclude=${currentId||''}`)
    .then(r => r.json())
    .then(data => {
      if(data.duplicate){
        if(msgEl){ msgEl.style.display = 'block'; msgEl.style.color = '#dc2626'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 사용할 수 없는 코드입니다. 다른 코드를 입력하세요.'; }
        if(inputEl){ inputEl.style.borderColor = '#dc2626'; inputEl.style.background = '#fef2f2'; }
        toast('다른 고객사에서 사용 중인 코드입니다.', 'error');
      } else {
        if(msgEl){ msgEl.style.display = 'block'; msgEl.style.color = '#16a34a'; msgEl.innerHTML = '<i class="fas fa-check-circle"></i> 사용 가능한 코드입니다.'; }
        if(inputEl){ inputEl.style.borderColor = '#16a34a'; inputEl.style.background = '#f0fdf4'; }
        toast('사용 가능한 코드입니다.', 'success');
      }
    }).catch(() => {
      if(msgEl){ msgEl.style.display = 'block'; msgEl.style.color = '#dc2626'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 확인 중 오류가 발생했습니다.'; }
      toast('확인 중 오류가 발생했습니다.', 'error');
    });
}
// ──────────────────────────────────────────────────────────────────────────
// ── 고객사 모달 - 노무대행 서비스 계약서 파일 처리 (복수 파일) ──
// _cmSvcFiles: [{name, data, size}] 배열로 관리
// DB 저장: service_contract_file_data = JSON.stringify(_cmSvcFiles)
//          service_contract_file_name = 파일 수 요약 문자열 (표시용)
let _cmSvcFiles = [];  // {name:string, data:string(dataURL), size:number}

const _CM_SVC_MAX_MB   = 20;   // 파일 1개 최대 크기
const _CM_SVC_MAX_COUNT = 20;  // 최대 파일 개수

function _cmSvcFileIcon(name){
  const ext = name.split('.').pop().toLowerCase();
  if(ext === 'pdf')              return '<i class="fas fa-file-pdf cm-svc-file-item-icon pdf"></i>';
  if(ext === 'zip')              return '<i class="fas fa-file-archive cm-svc-file-item-icon zip"></i>';
  if(['jpg','jpeg','png','gif','webp'].includes(ext))
                                 return '<i class="fas fa-file-image cm-svc-file-item-icon img"></i>';
  return '<i class="fas fa-file cm-svc-file-item-icon"></i>';
}

function _cmSvcFormatSize(bytes){
  if(bytes < 1024)       return bytes + ' B';
  if(bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

function _cmSvcRenderList(){
  const listEl = document.getElementById('cm-svc-file-list');
  const wrapEl = document.getElementById('cm-svc-file-list-wrap');
  const noEl   = document.getElementById('cm-svc-no-file');
  if(!listEl) return;

  if(_cmSvcFiles.length === 0){
    noEl.style.display   = '';
    wrapEl.style.display = 'none';
    return;
  }
  noEl.style.display   = 'none';
  wrapEl.style.display = '';

  listEl.innerHTML = _cmSvcFiles.map((f, idx) => `
    <div class="cm-svc-file-item">
      ${_cmSvcFileIcon(f.name)}
      <span class="cm-svc-file-item-name" title="${f.name}">${f.name}</span>
      <span class="cm-svc-file-item-size">${_cmSvcFormatSize(f.size)}</span>
      <div class="cm-svc-file-item-btns">
        <button type="button" class="ctf-btn ctf-btn-download" onclick="cmSvcDownloadOne(${idx})">
          <i class="fas fa-download"></i> 다운로드
        </button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="cmSvcRemoveOne(${idx})">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>`).join('');
}

function _cmSvcReadFiles(fileList, callback){
  // FileList → [{name, data, size}] 비동기 변환 후 callback
  const results = [];
  let pending = 0;
  const files = Array.from(fileList);
  if(!files.length){ callback([]); return; }

  files.forEach((file, i) => {
    pending++;
    const reader = new FileReader();
    reader.onload = function(e){
      results[i] = { name: file.name, data: e.target.result, size: file.size };
      if(--pending === 0) callback(results);
    };
    reader.readAsDataURL(file);
  });
}

function cmSvcFileChange(input){
  const files = Array.from(input.files);
  if(!files.length) return;

  // 크기 검사
  const overSize = files.find(f => f.size > _CM_SVC_MAX_MB * 1024 * 1024);
  if(overSize){
    toast(`"${overSize.name}" 파일이 ${_CM_SVC_MAX_MB}MB를 초과합니다.`, 'error');
    input.value = '';
    return;
  }
  if(files.length > _CM_SVC_MAX_COUNT){
    toast(`파일은 최대 ${_CM_SVC_MAX_COUNT}개까지 업로드할 수 있습니다.`, 'error');
    input.value = '';
    return;
  }

  _cmSvcReadFiles(files, function(results){
    _cmSvcFiles = results;
    _cmSvcRenderList();
    input.value = '';
  });
}

function cmSvcFileAdd(input){
  const files = Array.from(input.files);
  if(!files.length) return;

  const overSize = files.find(f => f.size > _CM_SVC_MAX_MB * 1024 * 1024);
  if(overSize){
    toast(`"${overSize.name}" 파일이 ${_CM_SVC_MAX_MB}MB를 초과합니다.`, 'error');
    input.value = '';
    return;
  }
  if(_cmSvcFiles.length + files.length > _CM_SVC_MAX_COUNT){
    toast(`파일은 최대 ${_CM_SVC_MAX_COUNT}개까지 업로드할 수 있습니다.`, 'error');
    input.value = '';
    return;
  }

  _cmSvcReadFiles(files, function(results){
    // 중복 파일명 제거 후 추가
    const existNames = new Set(_cmSvcFiles.map(f => f.name));
    const newFiles   = results.filter(f => {
      if(existNames.has(f.name)){
        toast(`"${f.name}"은 이미 추가된 파일입니다.`, 'info');
        return false;
      }
      return true;
    });
    _cmSvcFiles = [..._cmSvcFiles, ...newFiles];
    _cmSvcRenderList();
    input.value = '';
  });
}

function cmSvcDownloadOne(idx){
  const f = _cmSvcFiles[idx];
  if(!f) return;
  const a = document.createElement('a');
  a.href = f.data;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function cmSvcRemoveOne(idx){
  _cmSvcFiles.splice(idx, 1);
  _cmSvcRenderList();
}

function _cmSvcReset(){
  _cmSvcFiles = [];
  _cmSvcRenderList();
  const fi1 = document.getElementById('cm-svc-file-input');
  const fi2 = document.getElementById('cm-svc-file-add-input');
  if(fi1) fi1.value = '';
  if(fi2) fi2.value = '';
}

function _cmSvcRestore(fileNameSummary, fileDataJson){
  // fileDataJson: JSON 문자열 "[{name,data,size},...]" 또는 레거시 단일 data URL
  if(!fileDataJson){ _cmSvcReset(); return; }
  let parsed;
  try {
    parsed = JSON.parse(fileDataJson);
    if(!Array.isArray(parsed)) throw new Error('not array');
  } catch(e) {
    // 레거시: 단일 base64 data URL로 저장된 경우 래핑
    if(fileDataJson.startsWith('data:')){
      parsed = [{ name: fileNameSummary || '계약서', data: fileDataJson, size: 0 }];
    } else {
      _cmSvcReset(); return;
    }
  }
  _cmSvcFiles = parsed.filter(f => f && f.name && f.data);
  _cmSvcRenderList();
}

// DB 저장용 값 반환
function _cmSvcGetSaveData(){
  if(!_cmSvcFiles.length) return { name: '', data: '' };
  const name = _cmSvcFiles.length === 1
    ? _cmSvcFiles[0].name
    : `${_cmSvcFiles[0].name} 외 ${_cmSvcFiles.length - 1}개`;
  return { name, data: JSON.stringify(_cmSvcFiles) };
}
// ──────────────────────────────────────────────────────────────────────────

/** 고객사 임시저장 모달에서 삭제 */
async function deleteDraftCompany(){
  const id = _currentCompanyDraftId;
  if(!id) return;
  const c = allCompanies.find(x => x.id === id);
  const label = c?.company_name || '(이름 없음)';
  if(!confirm(`'${label}' 임시저장을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
  try {
    await api(`../tables/companies/${id}`, { method: 'DELETE' });
    toast(`'${label}' 임시저장이 삭제되었습니다.`, 'success');
    closeModal('company-modal');
    await loadCompanies();
    renderCompanies();
    if(typeof renderDraftAlerts === 'function') renderDraftAlerts();
    if(typeof renderDashboard === 'function') renderDashboard();
  } catch(e){
    toast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

function openCompanyModal(id=null){
  // 임시저장 항목인지 먼저 확인
  const _cmpData = id ? allCompanies.find(x=>x.id===id) : null;
  const _isDraft = !!(_cmpData && _cmpData.is_draft);

  // 임시저장 항목은 신규 입력 양식으로 처리 (editId.company = null)
  if(_isDraft){
    editId.company = null;
    _currentCompanyDraftId = id;  // 덮어쓰기용 draft ID 보존
  } else {
    editId.company = id;
    _currentCompanyDraftId = null;
  }

  // 임시저장 안내 텍스트 초기화
  const _cmDraftInfo = document.getElementById('cm-draft-saved-info');
  if(_cmDraftInfo){ _cmDraftInfo.style.display='none'; _cmDraftInfo.textContent=''; }

  // 타이틀: 임시저장 이어쓰기 / 수정 / 추가
  document.getElementById('cm-title').textContent =
    _isDraft ? '고객사 추가 (이어 작성)' :
    id       ? '고객사 수정' : '고객사 추가';

  // 임시저장 버튼: 신규·임시저장 모드에서만 노출
  const _cmDraftBtn = document.getElementById('cm-btn-draft');
  if(_cmDraftBtn) _cmDraftBtn.style.display = (id && !_isDraft) ? 'none' : '';

  // 삭제 버튼: 임시저장(이어작성) 모드에서만 노출
  const _cmDelBtn = document.getElementById('cm-btn-delete');
  if(_cmDelBtn) _cmDelBtn.style.display = _isDraft ? '' : 'none';

  // 등록 버튼 텍스트
  const _cmRegBtn = document.getElementById('cm-btn-register');
  if(_cmRegBtn) _cmRegBtn.innerHTML = (id && !_isDraft)
    ? '<i class="fas fa-check-circle"></i> 수정완료'
    : '<i class="fas fa-check-circle"></i> 등록';

  ['cm-name','cm-biz','cm-rep','cm-industry','cm-addr','cm-phone','cm-email','cm-period','cm-payday','cm-note','cm-contract-start','cm-contract-end'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
  // 해지일 행 초기화 (기본 숨김)
  const _cmEndRow = document.getElementById('cm-contract-end-row');
  if(_cmEndRow) _cmEndRow.style.display = 'none';
  document.getElementById('cm-insurance-basis').value='';
  document.getElementById('cm-annual-leave-basis').value='';
  // 산정기간 셀렉트 초기화 (전월 1일부터 1개월간)
  // 신규 모달: 산정기간 빈 값으로 초기화 (유효성 검사 유도)
  const _pmEl = document.getElementById('cm-period-month');
  const _pdEl = document.getElementById('cm-period-day');
  if(_pmEl) _pmEl.value = '';
  if(_pdEl) _pdEl.value = '';
  _cmPeriodCompose();

  if(id && !_isDraft){
    // ── 수정 모드 (정식 등록된 고객사): 기존 데이터 복원 ──
    const c=_cmpData;
    if(c){
      document.getElementById('cm-name').value=c.company_name||'';
      document.getElementById('cm-biz').value=c.business_number||'';
      document.getElementById('cm-industry').value=c.industry||'';
      document.getElementById('cm-addr').value=c.address||'';
      document.getElementById('cm-phone').value=c.phone||'';
      document.getElementById('cm-email').value=c.email||'';
      // 대표자 정보: representatives JSON 우선, 없으면 기존 rep/phone/email 단일값
      _cmClearRepRows();
      let _reps = [];
      if(c.representatives){
        try { _reps = typeof c.representatives === 'string' ? JSON.parse(c.representatives) : c.representatives; } catch(e){ _reps = []; }
      }
      if(_reps.length === 0 && (c.representative || c.phone || c.email)){
        _reps = [{ name: c.representative || '', phone: c.phone || '', email: c.email || '' }];
      }
      if(_reps.length === 0) _reps = [{ name: '', phone: '', email: '' }];
      _reps.forEach(r => _cmAddRepRow(r));
      document.getElementById('cm-rep').value = _reps[0]?.name || '';
      _cmPeriodRestore(c.pay_period||'', c.pay_period_month||null, c.pay_period_day!=null?c.pay_period_day:null);
      document.getElementById('cm-payday').value=c.pay_day||'';
      document.getElementById('cm-note').value=c.note||'';
      document.getElementById('cm-insurance-basis').value=c.insurance_basis||'';
      document.getElementById('cm-annual-leave-basis').value=c.annual_leave_basis||'';
      document.getElementById('cm-contract-start').value=c.contract_start_date||'';
      // 해지 상태면 계약 해지일 행 표시
      const _endRow = document.getElementById('cm-contract-end-row');
      const _endEl  = document.getElementById('cm-contract-end');
      if(c.status === COMPANY_STATUS.INACTIVE && c.contract_end_date){
        if(_endRow) _endRow.style.display = '';
        if(_endEl)  _endEl.value = c.contract_end_date;
      } else {
        if(_endRow) _endRow.style.display = 'none';
        if(_endEl)  _endEl.value = '';
      }
      // 기존 코드 표시
      _setAccessCode(c.access_code || generateAccessCode());
      // 서비스 계약서 파일 복원
      _cmSvcRestore(c.service_contract_file_name||'', c.service_contract_file_data||'');
      // 급여 항목 설정 복원
      _cmSetAllowanceConfig(c.allowance_config || {});
    }
    // 수정 모드: 이력 섹션 렌더링
    _renderCompanyHistory(id);
    // ── 수정 내용 적용일 UI 표시 + 최소 날짜 설정 ──
    _cmInitEffectiveDateUI(id);
  } else {
    // ── 신규 모드 또는 임시저장 이어쓰기 모드 ──
    const c = _isDraft ? _cmpData : null;
    if(c){
      // 임시저장 데이터 복원
      document.getElementById('cm-name').value=c.company_name||'';
      document.getElementById('cm-biz').value=c.business_number||'';
      document.getElementById('cm-industry').value=c.industry||'';
      document.getElementById('cm-addr').value=c.address||'';
      document.getElementById('cm-phone').value=c.phone||'';
      document.getElementById('cm-email').value=c.email||'';
      // 대표자 정보 복원
      _cmClearRepRows();
      let _draftReps = [];
      if(c.representatives){
        try { _draftReps = typeof c.representatives === 'string' ? JSON.parse(c.representatives) : c.representatives; } catch(e){ _draftReps = []; }
      }
      if(_draftReps.length === 0 && (c.representative || c.phone || c.email)){
        _draftReps = [{ name: c.representative || '', phone: c.phone || '', email: c.email || '' }];
      }
      if(_draftReps.length === 0) _draftReps = [{ name: '', phone: '', email: '' }];
      _draftReps.forEach(r => _cmAddRepRow(r));
      document.getElementById('cm-rep').value = _draftReps[0]?.name || '';
      _cmPeriodRestore(c.pay_period||'', c.pay_period_month||null, c.pay_period_day!=null?c.pay_period_day:null);
      document.getElementById('cm-payday').value=c.pay_day||'';
      document.getElementById('cm-note').value=c.note||'';
      document.getElementById('cm-insurance-basis').value=c.insurance_basis||'';
      document.getElementById('cm-annual-leave-basis').value=c.annual_leave_basis||'';
      document.getElementById('cm-contract-start').value=c.contract_start_date||'';
      // 임시저장 시 생성된 접근코드 유지
      _setAccessCode(c.access_code || generateAccessCode());
      // 서비스 계약서 파일 복원
      _cmSvcRestore(c.service_contract_file_name||'', c.service_contract_file_data||'');
      // 급여 항목 설정 복원
      _cmSetAllowanceConfig(c.allowance_config || {});
    } else {
      // 순수 신규: 접근코드 자동 생성
      _setAccessCode(generateAccessCode());
      // 서비스 계약서 파일 초기화
      _cmSvcReset();
      // 급여 항목 설정 초기화
      _cmSetAllowanceConfig({});
      // 대표자 기본 행
      _cmClearRepRows(); _cmAddRepRow();
    }
    // 신규/임시저장 모드: 이력 섹션 숨김
    const _histSec = document.getElementById('cm-history-section');
    if(_histSec) _histSec.style.display = 'none';
    // 신규/임시저장 모드: 적용일 UI 숨김
    const _effRow = document.getElementById('cm-effective-date-row');
    if(_effRow) _effRow.style.display = 'none';
  }

  // ── 등기임원 / 특수관계인 데이터 로드 ──
  _cmLoadExecutives(id && !_isDraft ? id : null);
  _cmLoadRelated(id && !_isDraft ? id : null);

  openModal('company-modal');
}
function editCompany(id){openCompanyModal(id)}

// ── 수정 내용 적용일 UI 초기화 ──
function _cmInitEffectiveDateUI(companyId){
  const row      = document.getElementById('cm-effective-date-row');
  const dateInput= document.getElementById('cm-effective-date');
  const hintEl   = document.getElementById('cm-effective-date-hint');
  if(!row || !dateInput) return;

  row.style.display = '';

  // 해당 고객사의 최종 확정 급여 지급일 산출
  const lastPay = (allPayrolls||[])
    .filter(p => p.company_id === companyId && !p.is_draft && p.pay_date)
    .map(p => p.pay_date)
    .sort()
    .pop(); // 'YYYY-MM-DD' 문자열 최대값

  // 최소 날짜: 마지막 지급일 다음날, 없으면 오늘
  let minDate;
  if(lastPay){
    const d = new Date(lastPay);
    d.setDate(d.getDate() + 1);
    minDate = d.toISOString().slice(0, 10);
  } else {
    minDate = new Date().toISOString().slice(0, 10);
  }
  dateInput.min   = minDate;
  dateInput.value = new Date().toISOString().slice(0, 10); // 기본값: 오늘 날짜

  if(hintEl){
    hintEl.textContent = lastPay
      ? `최종 급여 지급일(${lastPay}) 이후부터 선택 가능`
      : '최초 수정 — 오늘 이후부터 선택 가능';
  }
  // 경고 초기화
  const warnEl = document.getElementById('cm-effective-date-warn');
  if(warnEl) warnEl.style.display = 'none';
}

// ── 적용일 변경 시 실시간 검증 ──
function cmOnEffectiveDateChange(){
  const dateInput = document.getElementById('cm-effective-date');
  const warnEl    = document.getElementById('cm-effective-date-warn');
  const warnMsg   = document.getElementById('cm-effective-date-warn-msg');
  if(!dateInput || !warnEl || !warnMsg) return;

  const val = dateInput.value;
  const min = dateInput.min;
  if(val && min && val < min){
    warnEl.style.display = '';
    warnMsg.textContent  = `최종 급여 지급일(${min.replace(/(\d{4})-(\d{2})-(\d{2})/,'$1년 $2월 $3일')}) 이전은 선택할 수 없습니다.`;
  } else {
    warnEl.style.display = 'none';
  }
}

// ── 고객사 임시저장 ──
async function saveDraftCompany(){
  const name = document.getElementById('cm-name').value.trim();
  if(!name) return toast('회사명을 먼저 입력하세요.', 'error');

  const draftBody = {
    company_name:    name,
    business_number: document.getElementById('cm-biz').value.trim(),
    representative:  document.getElementById('cm-rep').value.trim(),
    industry:        document.getElementById('cm-industry').value.trim(),
    address:         document.getElementById('cm-addr').value.trim(),
    phone:           document.getElementById('cm-phone').value.trim(),
    email:           document.getElementById('cm-email').value.trim(),
    pay_period:      document.getElementById('cm-period').value.trim(),
    pay_period_month: document.getElementById('cm-period-month-hidden').value || null,
    pay_period_day:   parseInt(document.getElementById('cm-period-day-hidden').value) || null,
    pay_day:         document.getElementById('cm-payday').value.trim(),
    access_code:     document.getElementById('cm-code').value || generateAccessCode(),
    note:            document.getElementById('cm-note').value.trim(),
    insurance_basis:    document.getElementById('cm-insurance-basis').value,
    annual_leave_basis: document.getElementById('cm-annual-leave-basis').value,
    service_contract_file_name: _cmSvcGetSaveData().name,
    service_contract_file_data: _cmSvcGetSaveData().data,
    allowance_config:   _cmGetAllowanceConfig(),
    contract_start_date: document.getElementById('cm-contract-start').value || null,
    status:          COMPANY_STATUS.DRAFT,
    is_draft:        true,
    draft_saved_at:  Date.now(),
  };

  if(editId.company){
    // 기존 고객사 수정 중 임시저장 → PATCH
    draftBody.id = editId.company;
    await api(`../tables/companies/${editId.company}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
  } else if(_currentCompanyDraftId){
    // 이전에 임시저장한 적 있으면 덮어쓰기
    draftBody.id = _currentCompanyDraftId;
    await api(`../tables/companies/${_currentCompanyDraftId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
  } else {
    // 최초 임시저장 → POST
    draftBody.id = 'comp_draft_'+Date.now();
    const res = await api('../tables/companies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
    _currentCompanyDraftId = res.id || draftBody.id;
  }

  await loadCompanies(); populateFilters(); populatePICompanies(); renderCompanies(); renderDashboard();

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const infoEl = document.getElementById('cm-draft-saved-info');
  if(infoEl){ infoEl.style.display='inline'; infoEl.innerHTML=`<i class="fas fa-check" style="color:#10b981;margin-right:3px;"></i>임시저장 완료 (${timeStr})`; }
  toast(`임시저장 되었습니다. (${timeStr})`, 'success');
}

// ── 고객사 필드 레이블 (이력 diff 표시용) ──
const _CM_FIELD_LABELS = {
  company_name:      '회사명',
  business_number:   '사업자번호',
  representative:    '대표이사',
  representatives:   '대표자 정보',
  industry:          '업종',
  address:           '사업장주소',
  phone:             '대표연락처',
  email:             '이메일',
  pay_period:        '급여 산정기간',
  pay_period_month:  '급여 산정기간(월기준)',
  pay_period_day:    '급여 산정기간(시작일)',
  pay_day:           '급여 지급일',
  insurance_basis:   '4대보험 기준',
  annual_leave_basis:'연차 산정 기준',
  contract_start_date:'계약 시작일',
  note:              '비고',
  allowance_config:  '급여항목 설정',
  access_code:       '접근코드',
};

/** 두 값이 실질적으로 같은지 비교 */
function _cmValEqual(a, b){
  // null/undefined ↔ 빈 문자열 동등 처리
  if((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return true;
  // JSON 배열/객체 정규화 비교
  const normalize = v => {
    if(v === null || v === undefined) return '';
    if(typeof v === 'object'){
      // 빈 객체/배열은 null과 동등하게 처리
      const s = Array.isArray(v) ? JSON.stringify(v) : JSON.stringify(v, Object.keys(v).sort());
      if(s === '{}' || s === '[]') return '';
      return s;
    }
    if(typeof v === 'string'){
      const t = v.trim();
      if(t === '[]' || t === '{}') return ''; // 빈 JSON은 null/empty와 동등
      if((t.startsWith('{') || t.startsWith('[')) && (t.endsWith('}') || t.endsWith(']'))){
        try { const p = JSON.parse(t); const s2 = JSON.stringify(p, Object.keys(p).sort()); if(s2 === '{}' || s2 === '[]') return ''; return s2; } catch(e){}
      }
    }
    return String(v||'');
  };
  // null/empty를 먼저 한 번 더 체크 (normalize 후 둘 다 ''이면 동등)
  const na = normalize(a);
  const nb = normalize(b);
  if(na === '' && nb === '') return true;
  return na === nb;
}

async function saveCompany(){
  const code=document.getElementById('cm-code').value || generateAccessCode();

  // ── 필수 입력 검사 헬퍼: 오류 시 빨간 테두리 + 스크롤 + 포커스 ──
  // focusId: 포커스할 요소가 다를 때(hidden 등) 별도 지정
  function _cmRequire(id, msg, focusId){
    const el = document.getElementById(id);
    if(!el) return true;
    const val = el.value.trim();
    if(val) return true;
    // 포커스 대상: focusId 우선, 없으면 el 자체
    const focusEl = focusId ? (document.getElementById(focusId) || el) : el;
    focusEl.style.borderColor = '#e94560';
    focusEl.style.boxShadow   = '0 0 0 2px rgba(233,69,96,0.15)';
    focusEl.scrollIntoView({ behavior:'smooth', block:'center' });
    focusEl.focus();
    setTimeout(() => { focusEl.style.borderColor = ''; focusEl.style.boxShadow = ''; }, 2500);
    toast(msg, 'error');
    return false;
  }

  if(!_cmRequire('cm-name',           '회사명을 입력하세요.'))            return;
  if(!_cmRequire('cm-biz',            '사업자등록번호를 입력하세요.'))     return;
  if(!_cmRequire('cm-contract-start', '자문계약 시작일을 입력하세요.'))    return;
  if(!_cmRequire('cm-addr',           '사업장 주소를 입력하세요.'))        return;
  // 급여 산정기간: 저장 전 강제 동기화 후 월·일 각각 검사 (포커스는 해당 셀렉트로)
  _cmPeriodCompose();
  if(!_cmRequire('cm-period-month', '급여 산정기간의 월(전월/당월)을 선택하세요.')) return;
  if(!_cmRequire('cm-period-day',   '급여 산정기간의 시작 일자를 선택하세요.'))     return;
  if(!_cmRequire('cm-payday',         '급여 지급일을 입력하세요.'))        return;
  if(!_cmRequire('cm-insurance-basis',   '4대보험 적용 기준을 선택하세요.'))  return;
  if(!_cmRequire('cm-annual-leave-basis','연차 휴가 산정 기준을 선택하세요.')) return;

  // ── 대표자 정보 수집 및 검증 ──
  const _representatives = _cmCollectReps();
  if(_representatives.length === 0){
    return toast('대표자 정보를 1명 이상 입력하세요.', 'error');
  }
  // hidden 필드 동기화 (하위호환)
  document.getElementById('cm-rep').value = _representatives[0]?.name || '';
  document.getElementById('cm-phone').value = _representatives[0]?.phone || '';
  document.getElementById('cm-email').value = _representatives[0]?.email || '';

  const name   = document.getElementById('cm-name').value.trim();
  const biz    = document.getElementById('cm-biz').value.trim();
  const rep    = _representatives[0]?.name || '';
  const phone  = _representatives[0]?.phone || '';
  const period = document.getElementById('cm-period').value.trim();
  const payday = document.getElementById('cm-payday').value.trim();
  const addr   = document.getElementById('cm-addr').value.trim();
  const insuranceBasis    = document.getElementById('cm-insurance-basis').value;
  const annualLeaveBasis  = document.getElementById('cm-annual-leave-basis').value;

  // ── 급여 항목 설정: 체크된 항목의 통상임금 포함여부 미선택 유효성 검사 ──
  const _CM_AW_PT_LABEL = {
    car:'차량지원비', meal:'식대', research:'연구활동비',
    communication:'통신비', fitness:'체력증진비',
    self_dev:'자기계발비', book:'도서지원비', overseas:'해외근무수당'
  };
  for(const f of _CM_AW_PT_FIELDS){
    const hid = _cmAwHtmlId(f);
    const cb  = document.getElementById(`cm-aw-${hid}`);
    const sel = document.getElementById(`cm-aw-${hid}-pt`);
    if(cb?.checked && sel && !sel.value){
      // 해당 select에 빨간 테두리 표시 후 포커스
      sel.style.borderColor = '#e94560';
      sel.focus();
      setTimeout(() => { sel.style.borderColor = ''; }, 2000);
      return toast(`[${_CM_AW_PT_LABEL[f]}] 통상임금 포함여부(지급 방식)를 선택하세요.`, 'error');
    }
  }

  const newAllowanceCfg = _cmGetAllowanceConfig();
  // 수정 모드: 기존 status 유지 / 신규·임시저장: ACTIVE 설정
  const _prevStatus = editId.company
    ? (allCompanies.find(x=>x.id===editId.company)?.status || COMPANY_STATUS.ACTIVE)
    : COMPANY_STATUS.ACTIVE;
  const body={company_name:name,business_number:document.getElementById('cm-biz').value,representative:_representatives[0]?.name||'',representatives:JSON.stringify(_representatives),industry:document.getElementById('cm-industry').value,address:document.getElementById('cm-addr').value,phone:_representatives[0]?.phone||'',email:_representatives[0]?.email||'',pay_period:document.getElementById('cm-period').value,pay_period_month:document.getElementById('cm-period-month-hidden').value||null,pay_period_day:parseInt(document.getElementById('cm-period-day-hidden').value)||null,pay_day:document.getElementById('cm-payday').value,access_code:code,note:document.getElementById('cm-note').value,insurance_basis:insuranceBasis,annual_leave_basis:annualLeaveBasis,service_contract_file_name:_cmSvcGetSaveData().name,service_contract_file_data:_cmSvcGetSaveData().data,allowance_config:newAllowanceCfg,contract_start_date:document.getElementById('cm-contract-start').value||null,is_draft:false,draft_saved_at:null,status:_prevStatus};

  // ── 수정 모드: diff 계산 → 변경 있을 때만 적용일 검증 + company_history 기록 ──
  let _effDateStr = ''; // 상위 스코프에서 선언 (등기임원 이력에서도 사용)
  if(editId.company){
    // ① 회사 정보 diff 계산 (allowance_config는 빈 커스텀 배열 제거 후 비교)
    const prev = allCompanies.find(x=>x.id===editId.company) || {};
    // allowance_config 양쪽 정규화: 빈 _custom_ordinary / _custom_fixed 제거
    const _normAllowanceCfg = (v) => {
      if(!v) return v;
      let obj = v;
      if(typeof v === 'string'){ try { obj = JSON.parse(v); } catch(e){ return v; } }
      if(typeof obj === 'object' && !Array.isArray(obj)){
        if(Array.isArray(obj._custom_ordinary) && obj._custom_ordinary.length === 0) delete obj._custom_ordinary;
        if(Array.isArray(obj._custom_fixed) && obj._custom_fixed.length === 0) delete obj._custom_fixed;
        return JSON.stringify(obj, Object.keys(obj).sort());
      }
      return v;
    };
    const _prevNorm = { ...prev, allowance_config: _normAllowanceCfg(prev.allowance_config) };
    const _bodyNorm = { ...body, allowance_config: _normAllowanceCfg(body.allowance_config) };
    const changedFields = Object.keys(_CM_FIELD_LABELS).filter(f =>
      !_cmValEqual(_prevNorm[f], _bodyNorm[f])
    );
    const _fieldChangeLines = changedFields.map(f => `• ${_CM_FIELD_LABELS[f]}`);

    // ①-2 등기임원/특수관계인 변경 감지 (confirm 전에 미리 수집)
    const _newExecsPre = _cmCollectExecutives();
    const _newRelsPre  = _cmCollectRelated();
    const _prevExecsPre = await api(`../tables/registered_executives?company_id=${editId.company}`).then(r => (r?.data || [])).catch(() => []);
    const _prevRelsPre  = await api(`../tables/related_party_workers?company_id=${editId.company}`).then(r => (r?.data || [])).catch(() => []);

    const _execChangeLines = [];
    const _prevExecNamesPre = _prevExecsPre.map(e => e.name);
    const _newExecNamesPre  = _newExecsPre.map(e => e.name);
    _newExecsPre.forEach(e => { if(!_prevExecNamesPre.includes(e.name)) _execChangeLines.push(`• 등기임원 ${e.name} 추가`); });
    _prevExecsPre.forEach(e => { if(!_newExecNamesPre.includes(e.name)) _execChangeLines.push(`• 등기임원 ${e.name} 삭제`); });
    // 동일 이름 항목의 상세 변경 감지 (직책, 전화, 주민번호, 은행 등)
    _newExecsPre.forEach(ne => {
      const pe = _prevExecsPre.find(p => p.name === ne.name);
      if(!pe) return;
      const diffs = [];
      if(ne.position !== pe.position) diffs.push(`직책: ${pe.position||'(없음)'} → ${ne.position||'(없음)'}`);
      if(ne.phone    !== pe.phone)    diffs.push(`전화: ${pe.phone||'(없음)'} → ${ne.phone||'(없음)'}`);
      if(ne.id_number!== pe.id_number) diffs.push(`주민번호 변경`);
      if(ne.bank_name!== pe.bank_name) diffs.push(`은행: ${pe.bank_name||'(없음)'} → ${ne.bank_name||'(없음)'}`);
      if(ne.bank_account!== pe.bank_account) diffs.push(`계좌번호 변경`);
      if(diffs.length > 0) _execChangeLines.push(`• 등기임원 ${ne.name} 정보 변경 (${diffs.join(', ')})`);
    });

    const _relChangeLines = [];
    const _prevRelNamesPre = _prevRelsPre.map(r => r.name);
    const _newRelNamesPre  = _newRelsPre.map(r => r.name);
    _newRelsPre.forEach(r => { if(!_prevRelNamesPre.includes(r.name)) _relChangeLines.push(`• 특수관계인 ${r.name} 추가`); });
    _prevRelsPre.forEach(r => { if(!_newRelNamesPre.includes(r.name)) _relChangeLines.push(`• 특수관계인 ${r.name} 삭제`); });
    // 동일 이름 항목의 상세 변경 감지
    _newRelsPre.forEach(nr => {
      const pr = _prevRelsPre.find(p => p.name === nr.name);
      if(!pr) return;
      const diffs = [];
      if(nr.relationship !== pr.relationship) diffs.push(`관계: ${pr.relationship||'(없음)'} → ${nr.relationship||'(없음)'}`);
      if(nr.phone        !== pr.phone)        diffs.push(`전화: ${pr.phone||'(없음)'} → ${nr.phone||'(없음)'}`);
      if(nr.id_number    !== pr.id_number)     diffs.push(`주민번호 변경`);
      if(nr.bank_name    !== pr.bank_name)     diffs.push(`은행: ${pr.bank_name||'(없음)'} → ${nr.bank_name||'(없음)'}`);
      if(nr.bank_account !== pr.bank_account)  diffs.push(`계좌번호 변경`);
      if(diffs.length > 0) _relChangeLines.push(`• 특수관계인 ${nr.name} 정보 변경 (${diffs.join(', ')})`);
    });

    const _allChangeLines = [..._fieldChangeLines, ..._execChangeLines, ..._relChangeLines];
    const _hasExecRelChanges = _execChangeLines.length > 0 || _relChangeLines.length > 0;

    // ② 변경 확인 다이얼로그 (회사 정보 + 등기임원/특수관계인 모두 표시)
    if(_allChangeLines.length > 0){
      const changeSummary = _allChangeLines.join('\n');
      if(!confirm(`다음 항목이 수정되었습니다:\n\n${changeSummary}\n\n계속 진행하시겠습니까?`)) return;

      // 적용일 검증 (회사 정보 변경 시에만 필요)
      if(changedFields.length > 0){
        const _effDateEl  = document.getElementById('cm-effective-date');
        _effDateStr = _effDateEl?.value || '';
        const _effDateMin = _effDateEl?.min   || '';
        if(!_effDateStr){
          return toast('수정 내용 적용일을 선택하세요.', 'error');
        }
        if(_effDateMin && _effDateStr < _effDateMin){
          _effDateEl.style.borderColor = '#e94560';
          setTimeout(() => { _effDateEl.style.borderColor = ''; }, 2000);
          return toast(`적용일은 최종 급여 지급일(${_effDateMin}) 이후여야 합니다.`, 'error');
        }
      }

      // ③ 고객사 정보 PUT (변경된 필드가 있을 때만)
      if(changedFields.length > 0){
        body.id=editId.company;
        const putRes = await api(`../tables/companies/${editId.company}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        if(!putRes){ toast('저장에 실패했습니다.', 'error'); return; }

        // ④ 변경 이력 기록
        const changes = changedFields.map(f => ({
          field:     f,
          label:     _CM_FIELD_LABELS[f],
          before:    (prev[f] !== null && typeof prev[f]==='object') ? JSON.stringify(prev[f]) : String(prev[f]??''),
          after:     (body[f] !== null && typeof body[f]==='object') ? JSON.stringify(body[f]) : String(body[f]??''),
        }));
        const snapshot = Object.fromEntries(
          Object.keys(_CM_FIELD_LABELS).map(f=>[f, prev[f]])
        );
        const histEntry = {
          id:           'cmhist_'+Date.now(),
          company_id:   editId.company,
          changed_at:   Date.now(),
          effective_date: _effDateStr,
          changes:      changes,
          snapshot:     snapshot,
        };
        await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(histEntry)});
        await loadCompanyHistories();

        // ⑤ 적용일 이후 계약에 allowance_config 반영
        if(changedFields.includes('allowance_config')){
          await _cmApplyAllowanceToContracts(editId.company, _effDateStr, newAllowanceCfg);
        }
      }
    }
  } else if(_currentCompanyDraftId){
    body.id=_currentCompanyDraftId;
    await api(`../tables/companies/${_currentCompanyDraftId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  } else {
    body.id='comp'+Date.now();
    await api('../tables/companies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 신규 등록 이력 기록 ──
    const _histNew = { id: 'cmhist_'+Date.now(), company_id: body.id, changed_at: Date.now(), effective_date: new Date().toISOString().slice(0,10),
      changes: [{ field: 'status', label: '고객사 상태', before: '', after: 'active' }],
      snapshot: {}
    };
    await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(_histNew)}).catch(()=>{});
    await loadCompanyHistories();
  }
  _currentCompanyDraftId = null;

  // ── 등기임원 / 특수관계인 저장 (companyId 확정 후) ──
  const _savedCoId = editId.company || body.id;
  if(_savedCoId){
    // 등기임원 필수 입력 검증
    const _execErrors = [];
    _cmExecutives.forEach((_, i) => {
      const name = document.getElementById(`cm-exec-name-${i}`)?.value?.trim() || '';
      const position = document.getElementById(`cm-exec-position-${i}`)?.value?.trim() || '';
      const phone = document.getElementById(`cm-exec-phone-${i}`)?.value?.trim() || '';
      const idnum = document.getElementById(`cm-exec-idnum-${i}`)?.value?.trim() || '';
      if(!name || !position || !phone || !idnum) {
        _execErrors.push(`등기임원 #${i+1}: ${!name?'이름 ':''}${!position?'직책 ':''}${!phone?'전화번호 ':''}${!idnum?'주민번호 ':''}필수`);
      }
    });
    if(_execErrors.length){ toast(_execErrors.join('\n'), 'error'); return; }

    // 특수관계인 필수 입력 검증
    const _relErrors = [];
    _cmRelatedParties.forEach((_, i) => {
      const name = document.getElementById(`cm-rel-name-${i}`)?.value?.trim() || '';
      const rel = document.getElementById(`cm-rel-relationship-${i}`)?.value?.trim() || '';
      const phone = document.getElementById(`cm-rel-phone-${i}`)?.value?.trim() || '';
      const idnum = document.getElementById(`cm-rel-idnum-${i}`)?.value?.trim() || '';
      if(!name || !rel || !phone || !idnum) {
        _relErrors.push(`특수관계인 #${i+1}: ${!name?'이름 ':''}${!rel?'관계 ':''}${!phone?'전화번호 ':''}${!idnum?'주민번호 ':''}필수`);
      }
    });
    if(_relErrors.length){ toast(_relErrors.join('\n'), 'error'); return; }

    // ── 변경 전 데이터 수집 (이력 기록용) ──
    const _prevExecs = await api(`../tables/registered_executives?company_id=${_savedCoId}`).then(r => (r?.data || [])).catch(() => []);
    const _prevRels  = await api(`../tables/related_party_workers?company_id=${_savedCoId}`).then(r => (r?.data || [])).catch(() => []);

    await _cmSaveExecutives(_savedCoId);
    await _cmSaveRelated(_savedCoId);

    // ── 변경 이력 생성 ──
    const _newExecs = _cmCollectExecutives();
    const _newRels  = _cmCollectRelated();

    const _execChanges = [];
    const _prevExecNames = _prevExecs.map(e => e.name);
    const _newExecNames  = _newExecs.map(e => e.name);
    _newExecs.forEach(e => { if(!_prevExecNames.includes(e.name)) _execChanges.push(`등기임원 ${e.name} 추가`); });
    _prevExecs.forEach(e => { if(!_newExecNames.includes(e.name)) _execChanges.push(`등기임원 ${e.name} 삭제`); });
    // 동일 이름 상세 변경 감지
    _newExecs.forEach(ne => {
      const pe = _prevExecs.find(p => p.name === ne.name);
      if(!pe) return;
      const diffs = [];
      if(ne.position !== pe.position) diffs.push(`직책: ${pe.position||'(없음)'} → ${ne.position||'(없음)'}`);
      if(ne.phone    !== pe.phone)    diffs.push(`전화: ${pe.phone||'(없음)'} → ${ne.phone||'(없음)'}`);
      if(ne.id_number!== pe.id_number) diffs.push(`주민번호 변경`);
      if(ne.bank_name!== pe.bank_name) diffs.push(`은행 변경`);
      if(ne.bank_account!== pe.bank_account) diffs.push(`계좌번호 변경`);
      if(diffs.length > 0) _execChanges.push(`등기임원 ${ne.name}: ${diffs.join(', ')}`);
    });

    const _relChanges = [];
    const _prevRelNames = _prevRels.map(r => r.name);
    const _newRelNames  = _newRels.map(r => r.name);
    _newRels.forEach(r => { if(!_prevRelNames.includes(r.name)) _relChanges.push(`특수관계인 ${r.name} 추가`); });
    _prevRels.forEach(r => { if(!_newRelNames.includes(r.name)) _relChanges.push(`특수관계인 ${r.name} 삭제`); });
    // 동일 이름 상세 변경 감지
    _newRels.forEach(nr => {
      const pr = _prevRels.find(p => p.name === nr.name);
      if(!pr) return;
      const diffs = [];
      if(nr.relationship !== pr.relationship) diffs.push(`관계: ${pr.relationship||'(없음)'} → ${nr.relationship||'(없음)'}`);
      if(nr.phone        !== pr.phone)        diffs.push(`전화: ${pr.phone||'(없음)'} → ${nr.phone||'(없음)'}`);
      if(nr.id_number    !== pr.id_number)     diffs.push(`주민번호 변경`);
      if(nr.bank_name    !== pr.bank_name)     diffs.push(`은행 변경`);
      if(nr.bank_account !== pr.bank_account)  diffs.push(`계좌번호 변경`);
      if(diffs.length > 0) _relChanges.push(`특수관계인 ${nr.name}: ${diffs.join(', ')}`);
    });

    if(_execChanges.length > 0 || _relChanges.length > 0){
      const histEntry = {
        id:           'cmhist_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        company_id:   _savedCoId,
        changed_at:   Date.now(),
        effective_date: _effDateStr || '',
        changes:      [
          ...(_execChanges.length ? [{ field: 'registered_executives', label: '등기임원', before: _prevExecNames.join(', ') || '(없음)', after: _newExecNames.join(', ') || '(없음)' }] : []),
          ...(_relChanges.length  ? [{ field: 'related_party_workers', label: '특수관계인', before: _prevRelNames.join(', ') || '(없음)', after: _newRelNames.join(', ') || '(없음)' }] : []),
        ],
        snapshot:     {},
      };
      await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(histEntry)});
      await loadCompanyHistories();
    }
  }

  closeModal('company-modal');await loadCompanies();populateFilters();populatePICompanies();renderCompanies();renderDashboard();
  const _isEdit = !!editId.company;
  toast(_isEdit ? '고객사 정보가 수정되었습니다. ✔' : '고객사가 등록되었습니다. ✔');
}
/**
 * 적용일 이후 시작되는 모든 계약에 변경된 allowance_config pay_type 을 일괄 반영.
 * - 파기(파기) 상태 계약 제외
 * - 계약별 개별 *_pay_type 필드만 갱신 (금액·기본 정보는 건드리지 않음)
 *
 * @param {string} companyId     고객사 ID
 * @param {string} effectiveDateStr  적용일 'YYYY-MM-DD'
 * @param {object} newCfg        새 allowance_config
 */
async function _cmApplyAllowanceToContracts(companyId, effectiveDateStr, newCfg){
  if(!newCfg) return;

  // 적용 대상: 해당 고객사 + 계약 시작일 >= 적용일 + 파기/취소 아님
  const targets = (allContracts||[]).filter(c =>
    c.company_id === companyId &&
    (c.contract_start || '') >= effectiveDateStr &&
    c.status !== CONTRACT_STATUS.VOIDED &&
    c.status !== CONTRACT_STATUS.CANCELED
  );
  if(!targets.length) return;

  // pay_type 필드 매핑: allowance_config key → contract pay_type 필드명
  const PT_MAP = {
    car:           'transport_pay_type',        // 차량지원비
    meal:          'meal_pay_type',
    childcare:     'childcare_pay_type',        // 보육수당
    research:      'research_pay_type',
    communication: 'communication_pay_type',
    fitness:       'fitness_pay_type',
    self_dev:      'self_dev_pay_type',
    book:          'book_pay_type',
    overseas:      'overseas_pay_type',
  };

  let updated = 0;
  for(const contract of targets){
    const patch = {};
    for(const [cfgKey, contractField] of Object.entries(PT_MAP)){
      if(newCfg[cfgKey]){
        // 항목이 체크된 경우 → 새 pay_type 적용 (값 없으면 'fixed' 기본)
        patch[contractField] = newCfg[`${cfgKey}_pay_type`] || 'fixed';
      }
      // 체크 해제된 항목은 계약의 pay_type을 건드리지 않음
    }
    if(Object.keys(patch).length === 0) continue;
    await api(`../tables/contracts/${contract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    updated++;
  }

  if(updated > 0){
    await loadContracts();
    toast(`${effectiveDateStr} 이후 시작 계약 ${updated}건에 수당 항목 설정이 반영되었습니다.`, 'success');
  }
}

async function deleteCompany(id){
  if(!confirm('삭제하시겠습니까?')) return;
  await api(`../tables/companies/${id}`,{method:'DELETE'});await loadCompanies();populateFilters();renderCompanies();renderDashboard();toast('삭제됨');
}

// ── 등기임원 / 특수관계인 급여대상자 관리 ──────────────────────────────────
let _cmExecutives = [];
let _cmRelatedParties = [];

function _cmExecutiveHTML(idx, data = { name: '', position: '', phone: '', id_number: '', bank_name: '', bank_account: '', bank_holder: '' }) {
  const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `
  <div class="cm-person-card" id="cm-exec-card-${idx}" style="background:#f8faff;border:1.5px solid #e0e7ff;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:13px;font-weight:700;color:#374151;">등기임원 #${idx+1}</span>
      <button type="button" class="btn btn-sm btn-secondary" onclick="_cmRemoveExecutive(${idx})"><i class="fas fa-trash-alt"></i></button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;">
      <div class="cm-person-fg"><label>이름 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-name-${idx}" value="${esc(data.name)}" placeholder="이름" /></div>
      <div class="cm-person-fg"><label>직책 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-position-${idx}" value="${esc(data.position)}" placeholder="예: 전무이사" /></div>
      <div class="cm-person-fg"><label>전화번호 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-phone-${idx}" value="${esc(data.phone)}" placeholder="010-0000-0000" maxlength="13" oninput="_onPhoneInput(this)" /></div>
      <div class="cm-person-fg"><label>주민번호 앞7자리 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-idnum-${idx}" value="${esc(data.id_number)}" placeholder="YYMMDD-N" maxlength="8" oninput="_onIdInput(this)" /></div>
    </div>
    <div style="margin-top:10px;border-top:1px dashed #d1d5db;padding-top:10px;">
      <div class="cm-aw-section-title" style="margin-bottom:6px;">급여지급계좌 <span style="font-size:10.5px;font-weight:400;color:#9ca3af;">(선택)</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 10px;margin-top:6px;">
        <div class="cm-person-fg"><label>은행명</label><input type="text" id="cm-exec-bank-${idx}" value="${esc(data.bank_name)}" placeholder="예: 국민은행" /></div>
        <div class="cm-person-fg"><label>계좌번호</label><input type="text" id="cm-exec-account-${idx}" value="${esc(data.bank_account)}" placeholder="000-0000-000000" /></div>
        <div class="cm-person-fg"><label>예금주</label><input type="text" id="cm-exec-holder-${idx}" value="${esc(data.bank_holder)}" placeholder="예금주명" /></div>
      </div>
    </div>
  </div>`;
}

function _cmRelatedHTML(idx, data = { name: '', relationship: '', phone: '', id_number: '', bank_name: '', bank_account: '', bank_holder: '' }) {
  const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `
  <div class="cm-person-card" id="cm-rel-card-${idx}" style="background:#f8faff;border:1.5px solid #e0e7ff;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:13px;font-weight:700;color:#374151;">특수관계인 #${idx+1}</span>
      <button type="button" class="btn btn-sm btn-secondary" onclick="_cmRemoveRelated(${idx})"><i class="fas fa-trash-alt"></i></button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;">
      <div class="cm-person-fg"><label>이름 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-name-${idx}" value="${esc(data.name)}" placeholder="이름" /></div>
      <div class="cm-person-fg"><label>관계 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-relationship-${idx}" value="${esc(data.relationship)}" placeholder="예: 배우자" /></div>
      <div class="cm-person-fg"><label>전화번호 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-phone-${idx}" value="${esc(data.phone)}" placeholder="010-0000-0000" maxlength="13" oninput="_onPhoneInput(this)" /></div>
      <div class="cm-person-fg"><label>주민번호 앞7자리 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-idnum-${idx}" value="${esc(data.id_number)}" placeholder="YYMMDD-N" maxlength="8" oninput="_onIdInput(this)" /></div>
    </div>
    <div style="margin-top:10px;border-top:1px dashed #d1d5db;padding-top:10px;">
      <div class="cm-aw-section-title" style="margin-bottom:6px;">급여지급계좌 <span style="font-size:10.5px;font-weight:400;color:#9ca3af;">(선택)</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 10px;margin-top:6px;">
        <div class="cm-person-fg"><label>은행명</label><input type="text" id="cm-rel-bank-${idx}" value="${esc(data.bank_name)}" placeholder="예: 국민은행" /></div>
        <div class="cm-person-fg"><label>계좌번호</label><input type="text" id="cm-rel-account-${idx}" value="${esc(data.bank_account)}" placeholder="000-0000-000000" /></div>
        <div class="cm-person-fg"><label>예금주</label><input type="text" id="cm-rel-holder-${idx}" value="${esc(data.bank_holder)}" placeholder="예금주명" /></div>
      </div>
    </div>
  </div>`;
}

function _cmRenderExecutives() {
  const list = document.getElementById('cm-executives-list');
  if (!list) return;
  list.innerHTML = _cmExecutives.map((d, i) => _cmExecutiveHTML(i, d)).join('');
}

function _cmRenderRelated() {
  const list = document.getElementById('cm-related-list');
  if (!list) return;
  list.innerHTML = _cmRelatedParties.map((d, i) => _cmRelatedHTML(i, d)).join('');
}

function _cmAddExecutive() {
  _cmExecutives.push({ name: '', position: '', phone: '', id_number: '', bank_name: '', bank_account: '', bank_holder: '' });
  _cmRenderExecutives();
}

function _cmRemoveExecutive(idx) {
  _cmExecutives.splice(idx, 1);
  _cmRenderExecutives();
  toast('수정 완료 버튼을 눌러야 삭제하신 내용이 최종 반영됩니다.', 'warning');
}

function _cmAddRelated() {
  _cmRelatedParties.push({ name: '', relationship: '', phone: '', id_number: '', bank_name: '', bank_account: '', bank_holder: '' });
  _cmRenderRelated();
}

function _cmRemoveRelated(idx) {
  _cmRelatedParties.splice(idx, 1);
  _cmRenderRelated();
  toast('수정 완료 버튼을 눌러야 삭제하신 내용이 최종 반영됩니다.', 'warning');
}

function _cmCollectExecutives() {
  const result = [];
  _cmExecutives.forEach((_, i) => {
    const name = document.getElementById(`cm-exec-name-${i}`)?.value?.trim() || '';
    const position = document.getElementById(`cm-exec-position-${i}`)?.value?.trim() || '';
    const phone = document.getElementById(`cm-exec-phone-${i}`)?.value?.trim() || '';
    const id_number = document.getElementById(`cm-exec-idnum-${i}`)?.value?.trim() || '';
    const bank_name = document.getElementById(`cm-exec-bank-${i}`)?.value?.trim() || '';
    const bank_account = document.getElementById(`cm-exec-account-${i}`)?.value?.trim() || '';
    const bank_holder = document.getElementById(`cm-exec-holder-${i}`)?.value?.trim() || '';
    if (name || position || phone || id_number) {
      result.push({ name, position, phone, id_number, bank_name, bank_account, bank_holder });
    }
  });
  return result;
}

function _cmCollectRelated() {
  const result = [];
  _cmRelatedParties.forEach((_, i) => {
    const name = document.getElementById(`cm-rel-name-${i}`)?.value?.trim() || '';
    const relationship = document.getElementById(`cm-rel-relationship-${i}`)?.value?.trim() || '';
    const phone = document.getElementById(`cm-rel-phone-${i}`)?.value?.trim() || '';
    const id_number = document.getElementById(`cm-rel-idnum-${i}`)?.value?.trim() || '';
    const bank_name = document.getElementById(`cm-rel-bank-${i}`)?.value?.trim() || '';
    const bank_account = document.getElementById(`cm-rel-account-${i}`)?.value?.trim() || '';
    const bank_holder = document.getElementById(`cm-rel-holder-${i}`)?.value?.trim() || '';
    if (name || relationship || phone || id_number) {
      result.push({ name, relationship, phone, id_number, bank_name, bank_account, bank_holder });
    }
  });
  return result;
}

async function _cmLoadExecutives(companyId) {
  _cmExecutives = [];
  if (!companyId) { _cmRenderExecutives(); return; }
  try {
    const res = await api(`../tables/registered_executives?company_id=${companyId}`);
    const rows = res?.data || res || [];
    _cmExecutives = (Array.isArray(rows) ? rows : []).map(r => ({
      id: r.id, name: r.name, position: r.position, phone: r.phone, id_number: r.id_number,
      bank_name: r.bank_name || '', bank_account: r.bank_account || '', bank_holder: r.bank_holder || ''
    }));
  } catch(e) { console.error('[_cmLoadExecutives]', e); }
  _cmRenderExecutives();
}

async function _cmLoadRelated(companyId) {
  _cmRelatedParties = [];
  if (!companyId) { _cmRenderRelated(); return; }
  try {
    const res = await api(`../tables/related_party_workers?company_id=${companyId}`);
    const rows = res?.data || res || [];
    _cmRelatedParties = (Array.isArray(rows) ? rows : []).map(r => ({
      id: r.id, name: r.name, relationship: r.relationship, phone: r.phone, id_number: r.id_number,
      bank_name: r.bank_name || '', bank_account: r.bank_account || '', bank_holder: r.bank_holder || ''
    }));
  } catch(e) { console.error('[_cmLoadRelated]', e); }
  _cmRenderRelated();
}

async function _cmSaveExecutives(companyId) {
  const collected = _cmCollectExecutives();
  try {
    const res = await api(`../tables/registered_executives?company_id=${companyId}`);
    const existing = res?.data || [];
    for (const r of existing) {
      await api(`../tables/registered_executives/${r.id}`, { method: 'DELETE' });
    }
    for (const d of collected) {
      const body = {
        id: 'exec_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        company_id: companyId, name: d.name, position: d.position,
        phone: d.phone, id_number: d.id_number,
        bank_name: d.bank_name, bank_account: d.bank_account, bank_holder: d.bank_holder,
        created_at: Date.now(), updated_at: Date.now()
      };
      await api('../tables/registered_executives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
  } catch(e) {
    console.error('[_cmSaveExecutives]', e);
    throw e;
  }
}

async function _cmSaveRelated(companyId) {
  const collected = _cmCollectRelated();
  try {
    const res = await api(`../tables/related_party_workers?company_id=${companyId}`);
    const existing = res?.data || [];
    for (const r of existing) {
      await api(`../tables/related_party_workers/${r.id}`, { method: 'DELETE' });
    }
    for (const d of collected) {
      const body = {
        id: 'rel_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        company_id: companyId, name: d.name, relationship: d.relationship,
        phone: d.phone, id_number: d.id_number,
        bank_name: d.bank_name, bank_account: d.bank_account, bank_holder: d.bank_holder,
        created_at: Date.now(), updated_at: Date.now()
      };
      await api('../tables/related_party_workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
  } catch(e) {
    console.error('[_cmSaveRelated]', e);
    throw e;
  }
}

// ==============================================================================
