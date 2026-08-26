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
          <span class="dash-ac-badge" style="background:#fef3c7;color:#92400e;border-radius:20px;padding:2px 9px;font-size:11.5px;">${drafts.length}건</span>
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
  const _todayStr = fmtLocalDate(new Date());

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
    // 인사관리대장 기반 대표자 본인·등기임원·특수관계인 (계약 없어도 급여 대상)
    const personnelIds=[];
    {
      let reps=[];
      try { reps = typeof c.representatives==='string' ? JSON.parse(c.representatives) : (c.representatives||[]); } catch(e){ reps=[]; }
      if(Array.isArray(reps)) reps.forEach((r,i)=>{ if(r.name) personnelIds.push(`rep_${c.id}_${i}`); });
      (allExecutives||[]).filter(e=>e.company_id===c.id).forEach(e=>personnelIds.push(e.id));
      (allRelatedParties||[]).filter(r=>r.company_id===c.id).forEach(r=>personnelIds.push(r.id));
    }
    const targetIds=[...new Set([...activeEmpIds, ...personnelIds])];
    const totalTarget=targetIds.length; // 급여 입력 대상 수
    // 이번 달 입력 완료(non-draft) payroll이 있는 직원 수
    const thisMonthPayrolls=(allPayrolls||[]).filter(p=>!p.is_draft&&p.company_id===c.id&&p.pay_year==nowYear&&p.pay_month==nowMonth);
    const paidEmpIds=new Set(thisMonthPayrolls.map(p=>p.employee_id));
    const paidCount=targetIds.filter(eid=>paidEmpIds.has(eid)).length; // 급여 대상 중 입력완료 수
    const allPaid=totalTarget>0&&paidCount===totalTarget; // 전원 완료 여부
    const totalNetPay=thisMonthPayrolls.reduce((sum,p)=>sum+(p.net_pay||0),0);

    // 급여 입력 섹션 (이용중 고객사만, 임시저장·실질해지 제외)
    let payrollSection='';
    if(c.status===COMPANY_STATUS.ACTIVE&&!isDraftComp&&!isEffectivelyInactive){
      if(totalTarget===0){
        // 급여 대상 없음 (유효 계약·대표자·등기임원·특수관계인 모두 없음) — 섹션 미표시
        payrollSection='';
      } else if(allPaid){
        // 전원 완료 → 총액 표시
        payrollSection=`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-top:10px;">
           <div>
             <div style="font-size:10px;color:#0369a1;margin-bottom:2px;">이번 달 급여 총액 <span style="color:#16a34a;font-weight:700;">(${paidCount}/${totalTarget}건 완료)</span></div>
             <div style="font-size:15px;font-weight:700;color:#0c4a6e;">${Math.round(totalNetPay).toLocaleString('ko-KR')}<span style="font-size:11px;font-weight:500;">원</span></div>
           </div>
           <button class="btn btn-sm btn-primary" onclick="openPayrollInputModal('${c.id}')">
             <i class="fas fa-list"></i> 목록 확인
           </button>
         </div>`;
      } else {
        // 미완료 → 미입력 건수 강조 표시
        const pendingCnt = totalTarget - paidCount;
        payrollSection=`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-top:10px;">
           <div>
             <div style="font-size:10px;color:#c2410c;margin-bottom:2px;">이번 달 급여</div>
             <div style="font-size:13px;font-weight:800;color:#e94560;">${pendingCnt}/${totalTarget}건 미입력</div>
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
      <p style="margin-top:10px;">대표: ${(()=>{const reps=_cmCombinedReps(c.id);return reps.length>1?`${reps[0].name} 외 ${reps.length-1}명`:(reps[0]?.name||'-')})()} · 업종: ${c.industry||'-'}<br>사업자: ${c.business_number||'-'}<br>급여일: ${c.pay_day||'-'} · 산정: ${(c.pay_period_month||c.pay_period) ? `${_cmPeriodMonthLabel(c.pay_period_month)||''} ${c.pay_period_day||''}일부터 1개월간` : '미설정'}<br><i class="fas fa-shield-alt" style="color:#6366f1;margin-right:3px;font-size:10px;"></i>4대보험: ${_cmInsuranceLabel(c.insurance_basis)} · <i class="fas fa-umbrella-beach" style="color:#0891b2;margin-right:3px;font-size:10px;"></i>연차: ${_cmAnnualLabel(c.annual_leave_basis)}<br>${c.phone||''}</p>
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px;font-weight:600;color:#3b82f6;"><i class="fas fa-users"></i> 유효 근로계약: ${activeContractCount}건</div>
      ${/* 사용료 수납관리 ON → 카드에 사용료 현황 표시 */
        window._billingFeatureEnabled ? (() => {
          const bi = typeof getBillingInfoForDashCard === 'function' ? getBillingInfoForDashCard(c.id) : null;
          if (!bi) return '';
          const statusColors = {
            paid:    { bg:'#f0fdf4', color:'#166534', label:'완납' },
            partial: { bg:'#fef3c7', color:'#92400e', label:'부분납' },
            unpaid:  { bg:'#fef2f2', color:'#991b1b', label:'미납' },
            pending: { bg:'#f8fafc', color:'#64748b', label:'납부대기' },
          };
          const sc = statusColors[bi.status] || statusColors.pending;
          const won = v => Math.round(v||0).toLocaleString('ko-KR') + '원';
          return `<div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${sc.bg};color:${sc.color};font-weight:600;">${sc.label}</span>
            ${bi.type === 'actual' ? `<span style="font-size:11px;color:#6b7280;">청구: ${won(bi.bill?.total_amount)}</span>` : ''}
            ${bi.prevUnpaid > 0 ? `<span style="font-size:11px;color:#dc2626;font-weight:600;">이월미납: ${won(bi.prevUnpaid)}</span>` : ''}
            ${bi.totalUnpaid > 0 ? `<span style="font-size:11px;color:#991b1b;font-weight:700;">미납합계: ${won(bi.totalUnpaid)}</span>` : ''}
          </div>`;
        })() : ''
      }
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
              <div style="display:flex;gap:6px;">
                <button class="btn btn-sm btn-indigo" style="flex:1;" onclick="viewCompanyInfo('${c.id}')">
                  <i class="fas fa-building"></i>고객정보
                </button>
                <button class="btn btn-sm btn-secondary" style="flex:1;" onclick="cancelTerminate('${c.id}','${c.company_name}')">
                  <i class="fas fa-undo"></i>해지 취소
                </button>
              </div>
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
    if(hidden)    hidden.value    = `${_cmPeriodMonthLabel(mo)} ${day}일부터 1개월간`;
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
 * @param {string} month - pay_period_month DB 컬럼값 ('prev_month'|'current_month')
 * @param {number|string} day - pay_period_day DB 컬럼값 (1~31)
 */
function _cmPeriodRestore(val, month, day){
  const pmEl = document.getElementById('cm-period-month');
  const pdEl = document.getElementById('cm-period-day');

  // 월 복원 (DB 값: prev_month / current_month)
  let resolvedMonth = '';
  if(month){
    resolvedMonth = month;
  } else if(val){
    const s = val.replace(/\s/g,'');
    const m = s.match(/^(prev_month|current_month)(\d+)일/);
    if(m) resolvedMonth = m[1];
  }
  if(pmEl) pmEl.value = resolvedMonth; // 값 없으면 '월 선택' 유지

  // 일 복원
  let resolvedDay = '';
  if(day !== undefined && day !== null && day !== ''){
    resolvedDay = String(day);
  } else if(val){
    const s = val.replace(/\s/g,'');
    const m = s.match(/^(prev_month|current_month)(\d+)일/);
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

// ── 필드값 → 한글 라벨 변환 (DB 영문코드 대응) ──────────────────────────
function _cmInsuranceLabel(v){
  const map = { rate_based:'요율 기준', fixed_amount:'확정액 기준' };
  return map[v] || '요율 기준';
}
function _cmAnnualLabel(v){
  const map = { fiscal_year:'회계년도 기준', hire_date:'입사일 기준' };
  return map[v] || '회계년도 기준';
}
function _cmPeriodMonthLabel(v){
  const map = { prev_month:'전월', current_month:'당월' };
  return map[v] || '전월';
}

// ── 앱 접근코드 자동 생성 ──────────────────────────────────────────────────
function generateAccessCode(){
  // 형식: 숫자 + 대문자 알파벳 혼합 6자리 (예: A3BK9X)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // O·I·0·1 제외 (혼동 방지)
  let code = '';
  for(let i=0; i<6; i++){ code += chars[Math.floor(Math.random() * chars.length)]; }
  // 기존 고객사 코드와 충돌 검사
  const used = (allCompanies||[]).map(c=>c.access_code).filter(Boolean);
  return used.includes(code) ? generateAccessCode() : code; // 충돌 시 재귀 재생성
}
/** 접근코드 유효성 검사: 6~8자리, 숫자+대문자 모두 포함 */
function _isValidAccessCode(code){
  if(!code) return false;
  const s = String(code).trim();
  return s.length >= 6 && s.length <= 8 && /[A-Z]/.test(s) && /[0-9]/.test(s) && /^[A-Z0-9]+$/.test(s);
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
  if(displayEl){ displayEl.value = normalized || ''; displayEl.readOnly = true; displayEl.className = (displayEl.className||'').replace(/cm-input-[a-z-]+/g,'') + ' cm-input-readonly'; }
  const btnEl = document.getElementById('cm-code-action-btn');
  if(btnEl){ btnEl.className = btnEl.className.replace(/btn-blue/g, 'btn-warning'); btnEl.innerHTML = '<i class="fas fa-pen"></i> 변경'; btnEl.onclick = _toggleCmCodeEdit; }
  // 취소 버튼 숨김, 메시지 초기화
  const cancelBtn = document.getElementById('cm-code-cancel-btn');
  if(cancelBtn) cancelBtn.style.display = 'none';
  _resetCmCodeMsg();
}

// ── 원래 접근코드 임시 저장 (취소 복원용) ──
let _cmOriginalCode = '';

function _toggleCmCodeEdit(){
  const inputEl = document.getElementById('cm-code-display');
  const btnEl = document.getElementById('cm-code-action-btn');
  const cancelBtn = document.getElementById('cm-code-cancel-btn');
  if(!inputEl || !btnEl) return;
  // 원본 코드 백업
  _cmOriginalCode = inputEl.value;
  // 입력 필드 초기화 및 편집 모드로 전환
  inputEl.value = '';
  inputEl.readOnly = false;
  inputEl.className = (inputEl.className||'').replace(/cm-input-[a-z-]+/g,'') + ' cm-input-active';
  inputEl.focus();
  // 버튼 전환
  btnEl.className = btnEl.className.replace(/btn-warning/g, 'btn-blue');
  btnEl.innerHTML = '<i class="fas fa-check-circle"></i> 중복체크';
  btnEl.onclick = checkAccessCodeDuplicate;
  if(cancelBtn) cancelBtn.style.display = '';
  _resetCmCodeMsg();
}

function _cancelCmCodeEdit(){
  const inputEl = document.getElementById('cm-code-display');
  const btnEl = document.getElementById('cm-code-action-btn');
  const cancelBtn = document.getElementById('cm-code-cancel-btn');
  if(!inputEl || !btnEl) return;
  // 원본 코드 복원
  inputEl.value = _cmOriginalCode;
  document.getElementById('cm-code').value = _cmOriginalCode;
  _cmOriginalCode = '';
  // 읽기 전용 모드로 복귀
  inputEl.readOnly = true;
  inputEl.className = (inputEl.className||'').replace(/cm-input-[a-z-]+/g,'') + ' cm-input-readonly';
  // 버튼 복원
  btnEl.className = btnEl.className.replace(/btn-blue/g, 'btn-warning');
  btnEl.innerHTML = '<i class="fas fa-pen"></i> 변경';
  btnEl.onclick = _toggleCmCodeEdit;
  if(cancelBtn) cancelBtn.style.display = 'none';
  _resetCmCodeMsg();
}

function _resetCmCodeMsg(){
  const m = document.getElementById('cm-code-msg');
  if(m){ m.className = 'cm-msg-muted'; m.innerHTML = '<i class="fas fa-info-circle"></i> 숫자+영문 대문자 혼합 6~8자리'; }
}

function checkAccessCodeDuplicate(){
  const inputEl = document.getElementById('cm-code-display');
  const code = (inputEl?.value || '').trim();
  const msgEl = document.getElementById('cm-code-msg');

  // 1) 빈 값 검사
  if(!code){
    if(msgEl){ msgEl.className = 'cm-msg-error'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 접근 코드를 입력하세요.'; }
    if(inputEl){ inputEl.className = (inputEl.className||'').replace(/cm-input-[a-z-]+/g,'') + ' cm-input-error'; inputEl.focus(); }
    return;
  }

  // 2) 형식 검증: 6~8자리, 숫자+영문 대문자 모두 포함
  if(!_isValidAccessCode(code)){
    if(msgEl){ msgEl.className = 'cm-msg-error'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 숫자+영문 대문자 혼합 6~8자리로 입력하세요.'; }
    if(inputEl){ inputEl.className = (inputEl.className||'').replace(/cm-input-[a-z-]+/g,'') + ' cm-input-error'; inputEl.focus(); }
    return;
  }

  // 3) 서버 중복 검사
  const currentId = editId.company || (typeof _cmpData !== 'undefined' ? _cmpData?.id : null);
  if(msgEl){ msgEl.className = 'cm-msg-muted'; msgEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 확인 중...'; }
  if(inputEl) inputEl.classList.remove('cm-input-error','cm-input-success');

  fetch(`/api/companies/check-code?code=${encodeURIComponent(code)}&exclude=${currentId||''}`)
    .then(r => r.json())
    .then(data => {
      if(data.duplicate){
        if(msgEl){ msgEl.className = 'cm-msg-error'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 이미 사용 중인 코드입니다. 다른 코드를 입력하세요.'; }
        if(inputEl){ inputEl.className = (inputEl.className||'').replace(/cm-input-[a-z-]+/g,'') + ' cm-input-error'; }
      } else {
        if(msgEl){ msgEl.className = 'cm-msg-success'; msgEl.innerHTML = '<i class="fas fa-check-circle"></i> 사용 가능한 코드입니다.'; }
        if(inputEl){ inputEl.className = (inputEl.className||'').replace(/cm-input-[a-z-]+/g,'') + ' cm-input-success'; }
      }
    }).catch(() => {
      if(msgEl){ msgEl.className = 'cm-msg-error'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 확인 중 오류가 발생했습니다.'; }
      if(inputEl){ inputEl.className = (inputEl.className||'').replace(/cm-input-[a-z-]+/g,'') + ' cm-input-error'; }
    });
}

// ── 대표자 정보 동적 행 ──
let _cmRepIdx = 0;
function _cmRepRowHTML(idx, data = { name: '', phone: '', email: '', employee_number: '' }) {
  const totalRows = document.querySelectorAll('#cm-rep-rows .cm-rep-row').length;
  const isOnlyOne = totalRows <= 1;
  return `<div class="cm-rep-row" id="cm-rep-row-${idx}" style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:14px;align-items:start;">
    <div class="form-group"><label>대표자명<span style="color:#e94560;">*</span></label><input type="text" id="cm-rep-name-${idx}" placeholder="대표자명" value="${_esc(data.name)}" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group"><label>사원번호<span style="color:#e94560;">*</span></label><input type="text" id="cm-rep-empno-${idx}" placeholder="자동 부여" value="${_esc(data.employee_number)}" onblur="_cmRepEmpNoBlur(${idx})" style="width:100%;box-sizing:border-box;" /><div id="cm-empno-err-rep-${idx}" class="va-hint"></div></div>
    <div class="form-group"><label>휴대전화번호</label><input type="text" id="cm-rep-phone-${idx}" placeholder="010-0000-0000" value="${_esc(data.phone)}" oninput="_onPhoneInput(this)" onblur="_cmCheckRepPhone(${idx})" maxlength="13" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group"><label>이메일</label><input type="text" id="cm-rep-email-${idx}" placeholder="example@email.com" value="${_esc(data.email)}" oninput="_onEmailInput(this)" style="width:100%;box-sizing:border-box;" /></div>
    <div style="grid-column:1/-1;text-align:right;">
      <button type="button" onclick="_cmRemoveRepRow(${idx})" class="btn btn-sm btn-secondary" ${isOnlyOne ? 'disabled' : ''}><i class="fas fa-trash-alt"></i> 삭제</button>
    </div>
  </div>`;
}
function _cmAddRepRow(data = { name: '', phone: '', email: '', employee_number: '' }) {
  const container = document.getElementById('cm-rep-rows');
  if (!container) return;
  const idx = _cmRepIdx++;
  const row = document.createElement('div');
  row.innerHTML = _cmRepRowHTML(idx, data);
  container.appendChild(row.firstElementChild);
  // 사원번호 추천값 설정 (기존값이 없을 때만)
  if (!data.employee_number) _cmSuggestRepEmpNo(idx);
  // 2행 이상이면 모든 삭제 버튼 활성화
  const allRows = container.querySelectorAll('.cm-rep-row');
  if (allRows.length >= 2) {
    allRows.forEach(r => {
      const btn = r.querySelector('button');
      if (btn) btn.disabled = false;
    });
  }
}
function _cmRemoveRepRow(idx) {
  const row = document.getElementById('cm-rep-row-' + idx);
  if (row) row.remove();
  _cmSuggestAllEmpNos();
  // 남은 행이 1개면 모든 삭제 버튼 비활성화
  const remaining = document.querySelectorAll('#cm-rep-rows .cm-rep-row');
  if (remaining.length <= 1) {
    remaining.forEach(r => {
      const btn = r.querySelector('button');
      if (btn) btn.disabled = true;
    });
  }
}
/** 대표자 사원번호 blur: 비어 있으면 자동 부여, 값이 있으면 중복 검사 */
function _cmRepEmpNoBlur(idx) {
  const el = document.getElementById('cm-rep-empno-' + idx);
  if (!el) return;
  if (!el.value.trim()) { _cmSuggestRepEmpNo(idx); }
  else { _cmCheckEmpNoDup(el); }
}
function _cmCollectReps() {
  const reps = [];
  for (let i = 0; i < _cmRepIdx; i++) {
    const nameEl = document.getElementById('cm-rep-name-' + i);
    const phoneEl = document.getElementById('cm-rep-phone-' + i);
    const emailEl = document.getElementById('cm-rep-email-' + i);
    const empNoEl = document.getElementById('cm-rep-empno-' + i);
    const name = nameEl?.value?.trim() || '';
    if (name) {
      reps.push({ name, employee_number: empNoEl?.value?.trim() || '', phone: phoneEl?.value?.trim() || '', email: emailEl?.value?.trim() || '' });
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

// ── 담당자 정보 동적 행 ──
let _cmContactIdx = 0;
function _cmContactRowHTML(idx, data = { name: '', position: '', office_phone: '', mobile_phone: '', email: '', fax: '' }) {
  return `<div class="cm-rep-row" id="cm-contact-row-${idx}" style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:14px;align-items:start;">
    <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;margin-bottom:2px;">
      <label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px;">
        <input type="checkbox" id="cm-contact-sync-${idx}" onchange="_cmContactSyncFromRep(${idx}, this.checked)" />
        <span>대표자와 동일</span>
      </label>
    </div>
    <div class="form-group"><label>담당자명 <span style="color:#c00;">*</span></label><input type="text" id="cm-contact-name-${idx}" placeholder="담당자명" value="${_esc(data.name)}" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group"><label>직급 <span style="color:#c00;">*</span></label><input type="text" id="cm-contact-position-${idx}" placeholder="직급" value="${_esc(data.position)}" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group"><label>사무실 전화번호</label><input type="text" id="cm-contact-office-phone-${idx}" placeholder="02-000-0000" value="${_esc(data.office_phone)}" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group"><label>휴대전화번호 <span style="color:#c00;">*</span></label><input type="text" id="cm-contact-mobile-phone-${idx}" placeholder="010-0000-0000" value="${_esc(data.mobile_phone)}" oninput="_onPhoneInput(this)" maxlength="13" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group"><label>이메일</label><input type="text" id="cm-contact-email-${idx}" placeholder="example@email.com" value="${_esc(data.email)}" oninput="_onEmailInput(this)" style="width:100%;box-sizing:border-box;" /></div>
    <div class="form-group"><label>팩스번호</label><input type="text" id="cm-contact-fax-${idx}" placeholder="02-000-0000" value="${_esc(data.fax)}" style="width:100%;box-sizing:border-box;" /></div>
    <div style="grid-column:1/-1;text-align:right;">
      <button type="button" onclick="_cmRemoveContactRow(${idx})" class="btn btn-sm btn-secondary"><i class="fas fa-trash-alt"></i> 삭제</button>
    </div>
  </div>`;
}
function _cmAddContactRow(data = { name: '', position: '', office_phone: '', mobile_phone: '', email: '', fax: '' }) {
  const container = document.getElementById('cm-contact-rows');
  if (!container) return;
  const idx = _cmContactIdx++;
  const row = document.createElement('div');
  row.innerHTML = _cmContactRowHTML(idx, data);
  container.appendChild(row.firstElementChild);
}
function _cmRemoveContactRow(idx) {
  const row = document.getElementById('cm-contact-row-' + idx);
  if (row) row.remove();
}
function _cmCollectContacts() {
  const contacts = [];
  for (let i = 0; i < _cmContactIdx; i++) {
    const nameEl = document.getElementById('cm-contact-name-' + i);
    const name = nameEl?.value?.trim() || '';
    if (name) {
      contacts.push({
        name,
        position:     document.getElementById('cm-contact-position-' + i)?.value?.trim() || '',
        office_phone: document.getElementById('cm-contact-office-phone-' + i)?.value?.trim() || '',
        mobile_phone: document.getElementById('cm-contact-mobile-phone-' + i)?.value?.trim() || '',
        email:        document.getElementById('cm-contact-email-' + i)?.value?.trim() || '',
        fax:          document.getElementById('cm-contact-fax-' + i)?.value?.trim() || ''
      });
    }
  }
  return contacts;
}
function _cmClearContactRows() {
  _cmContactIdx = 0;
  const container = document.getElementById('cm-contact-rows');
  if (container) container.innerHTML = '';
}

/** 담당자 정보를 대표자와 동일하게 동기화 */
function _cmContactSyncFromRep(idx, checked) {
  if (!checked) return;
  // 신규·임시저장 모드(인사관리대장 없음)는 직접 입력한 대표자 행 기반, 기존 고객사는 인사관리대장 기반
  const reps = editId.company ? _cmCombinedReps(editId.company) : _cmCollectReps();
  if (reps.length === 0) return;
  let rep;
  if (reps.length === 1) {
    rep = reps[0];
  } else {
    const names = reps.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
    const sel = prompt(`대표자가 여러 명입니다. 담당자로 지정할 대표자를 선택하세요.\n\n${names}\n\n번호를 입력하세요 (1~${reps.length}):`, '1');
    const num = parseInt(sel);
    if (isNaN(num) || num < 1 || num > reps.length) return;
    rep = reps[num - 1];
  }
  if (!rep) return;
  document.getElementById(`cm-contact-name-${idx}`).value = rep.name || '';
  document.getElementById(`cm-contact-position-${idx}`).value = '대표';
  document.getElementById(`cm-contact-mobile-phone-${idx}`).value = rep.phone || '';
  document.getElementById(`cm-contact-email-${idx}`).value = rep.email || '';
}

function _onCmCodeInput(){
  const el = document.getElementById('cm-code-display');
  // 숫자와 대문자만 허용 (소문자 입력 시 자동 대문자 변환, 그 외 문자 제거)
  const filtered = el.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if(filtered !== el.value) el.value = filtered;
  document.getElementById('cm-code').value = el.value;
  el.classList.remove('cm-input-error','cm-input-success');
  const m = document.getElementById('cm-code-msg');
  if(m){ m.className = 'cm-msg-muted'; m.innerHTML = '<i class="fas fa-info-circle"></i> 숫자+영문 대문자 혼합 6~8자리'; }
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
  window._cmViewOnly = false; // 기본: 편집 모드
  // ── 조회 전용 모드(viewCompanyInfo) 잔재 복원 ──
  // viewCompanyInfo가 모든 입력 disabled/readOnly + 버튼 숨김 처리 → 다음 신규/수정 열 때 해제
  {
    const _cmModalEl = document.getElementById('company-modal');
    if(_cmModalEl){
      _cmModalEl.querySelectorAll('input, textarea, select').forEach(el=>{
        el.disabled = false;
        el.readOnly = false;
      });
      _cmModalEl.querySelectorAll('button:not(.modal-close)').forEach(b=>{
        b.style.display = '';
      });
      // 조회 모드에서 숨겨진 섹션 복원 (이후 _cmRenderExecutives/_cmRenderRelated가 내용 재구성)
      const _cmExecSec = document.getElementById('cm-executives-section');
      const _cmRelSec  = document.getElementById('cm-related-section');
      if(_cmExecSec) _cmExecSec.style.display = '';
      if(_cmRelSec)  _cmRelSec.style.display  = '';
    }
  }
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
  _validateBizNumber();
  // 병가 급여 지급율 초기화 (기본값 0 = 무급만)
  { const _cmSickEl = document.getElementById('cm-sick-leave-pay-rate'); if(_cmSickEl) _cmSickEl.value = 0; }
  // 일할 계산 방식 초기화 (기본값 30일 고정)
  { const _cmProrRadio = document.querySelector('input[name="cm-proration-method"][value="30day_fixed"]'); if(_cmProrRadio) _cmProrRadio.checked = true; }
  // 가산수당 지급 기준 초기화 (미선택 — 필수)
  document.querySelectorAll('input[name="cm-premium-mode"]').forEach(r => { r.checked = false; });
  { const _pmHint = document.getElementById('cm-premium-mode-hint'); if(_pmHint){ _pmHint.className = 'va-hint'; _pmHint.textContent = ''; } }
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
      document.getElementById('cm-biz').value=c.business_number||''; _onBizInput();
      document.getElementById('cm-industry').value=c.industry||'';
      document.getElementById('cm-addr').value=c.address||'';
      document.getElementById('cm-phone').value=c.phone||'';
      document.getElementById('cm-email').value=c.email||'';
      // 대표자 정보: 인사관리대장 등록 인원 readonly 표시
      _cmRenderRosterReps();
      // 담당자 정보 복원
      _cmClearContactRows();
      let _contacts = [];
      if(c.contacts){
        try { _contacts = typeof c.contacts === 'string' ? JSON.parse(c.contacts) : c.contacts; } catch(e){ _contacts = []; }
      }
      if(_contacts.length === 0) _contacts = [{ name: '', position: '', office_phone: '', mobile_phone: '', email: '', fax: '' }];
      _contacts.forEach(ct => _cmAddContactRow(ct));
      _cmPeriodRestore(c.pay_period||'', c.pay_period_month||null, c.pay_period_day!=null?c.pay_period_day:null);
      document.getElementById('cm-payday').value=c.pay_day||'';
      document.getElementById('cm-note').value=c.note||'';
      document.getElementById('cm-insurance-basis').value=c.insurance_basis||'';
      document.getElementById('cm-annual-leave-basis').value=c.annual_leave_basis||'';
      document.getElementById('cm-sick-leave-pay-rate').value=c.sick_leave_pay_rate ?? 0;
      { const _pmRadio = document.querySelector(`input[name="cm-proration-method"][value="${c.proration_method||'30day_fixed'}"]`); if(_pmRadio) _pmRadio.checked = true; }
      document.getElementById('cm-contract-start').value=c.contract_start_date||'';
      // 가산수당 지급 기준 복원
      { const _prmRadio = document.querySelector(`input[name="cm-premium-mode"][value="${c.premium_mode||'none'}"]`); if(_prmRadio) _prmRadio.checked = true; }
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
      document.getElementById('cm-biz').value=c.business_number||''; _onBizInput();
      document.getElementById('cm-industry').value=c.industry||'';
      document.getElementById('cm-addr').value=c.address||'';
      document.getElementById('cm-phone').value=c.phone||'';
      document.getElementById('cm-email').value=c.email||'';
      // 대표자 정보: 임시저장 복원 (직접 입력 행)
      _cmRenderRepInputRows();
      // 담당자 정보 복원 (임시저장)
      _cmClearContactRows();
      let _draftContacts = [];
      if(c.contacts){
        try { _draftContacts = typeof c.contacts === 'string' ? JSON.parse(c.contacts) : c.contacts; } catch(e){ _draftContacts = []; }
      }
      if(_draftContacts.length === 0) _draftContacts = [{ name: '', position: '', office_phone: '', mobile_phone: '', email: '', fax: '' }];
      _draftContacts.forEach(ct => _cmAddContactRow(ct));
      // 등기임원·특수관계인: 인사관리대장 등록 인원 readonly 표시
      Promise.all([_cmLoadExecutives(c.id), _cmLoadRelated(c.id)]).then(() => { _cmRenderRosterExecs(); _cmRenderRosterRels(); });
      _cmPeriodRestore(c.pay_period||'', c.pay_period_month||null, c.pay_period_day!=null?c.pay_period_day:null);
      document.getElementById('cm-payday').value=c.pay_day||'';
      document.getElementById('cm-note').value=c.note||'';
      document.getElementById('cm-insurance-basis').value=c.insurance_basis||'';
      document.getElementById('cm-annual-leave-basis').value=c.annual_leave_basis||'';
      document.getElementById('cm-sick-leave-pay-rate').value=c.sick_leave_pay_rate ?? 0;
      { const _pmRadio = document.querySelector(`input[name="cm-proration-method"][value="${c.proration_method||'30day_fixed'}"]`); if(_pmRadio) _pmRadio.checked = true; }
      document.getElementById('cm-contract-start').value=c.contract_start_date||'';
      // 가산수당 지급 기준 복원 (임시저장)
      { const _prmRadio = document.querySelector(`input[name="cm-premium-mode"][value="${c.premium_mode||'none'}"]`); if(_prmRadio) _prmRadio.checked = true; }
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
      // 대표자 정보: 신규 고객사 직접 입력 행
      _cmRenderRepInputRows();
      // 담당자 기본 행
      _cmClearContactRows(); _cmAddContactRow();
    }
    // 신규/임시저장 모드: 이력 섹션 숨김
    const _histSec = document.getElementById('cm-history-section');
    if(_histSec) _histSec.style.display = 'none';
    // 신규/임시저장 모드: 적용일 UI 숨김
    const _effRow = document.getElementById('cm-effective-date-row');
    if(_effRow) _effRow.style.display = 'none';
  }

  // ── 등기임원 / 특수관계인 데이터 로드 (임시저장 이어쓰기는 위에서 이미 복원 완료) ──
  if (!_isDraft) {
    Promise.all([_cmLoadExecutives(id), _cmLoadRelated(id)]).then(() => { _cmRenderRosterExecs(); _cmRenderRosterRels(); });
  } else if (id) {
    _cmRenderRosterExecs(); _cmRenderRosterRels();
  }

  openModal('company-modal');
}
function editCompany(id){openCompanyModal(id)}

// ── 해지 고객사 정보 조회 (readonly 모달) ──
function viewCompanyInfo(id){
  openCompanyModal(id);
  window._cmViewOnly = true; // readonly 플래그 (openCompanyModal 이후 설정)
  // 모든 입력 필드 readonly 처리
  const modal = document.getElementById('company-modal');
  if(!modal) return;
  modal.querySelectorAll('input, textarea, select').forEach(el => { el.disabled = true; el.readOnly = true; });
  // 버튼 숨김
  const btns = modal.querySelectorAll('button:not(.modal-close)');
  btns.forEach(b => b.style.display = 'none');
  // 타이틀 변경
  const title = document.getElementById('cm-title');
  if(title) title.textContent = '고객사 정보 (조회 전용)';
  // 이력 섹션은 표시
  const histSec = document.getElementById('cm-history-section');
  if(histSec) histSec.style.display = '';
  // 적용일 행 숨김
  const effRow = document.getElementById('cm-effective-date-row');
  if(effRow) effRow.style.display = 'none';
}

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
    minDate = fmtLocalDate(new Date());
  }
  dateInput.min   = minDate;
  dateInput.value = fmtLocalDate(new Date()); // 기본값: 오늘 날짜

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

  // 대표자 정보 수집: 신규·임시저장은 직접 입력 행 기반 (인사관리대장 없음)
  const _draftReps = editId.company ? _cmCombinedReps(editId.company) : _cmCollectReps();
  document.getElementById('cm-rep').value = _draftReps[0]?.name || '';
  document.getElementById('cm-phone').value = _draftReps[0]?.phone || '';
  document.getElementById('cm-email').value = _draftReps[0]?.email || '';

  const draftBody = {
    company_name:    name,
    business_number: document.getElementById('cm-biz').value.trim(),
    representative:  document.getElementById('cm-rep').value.trim(),
    representatives: JSON.stringify(_draftReps),
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
    sick_leave_pay_rate: parseFloat(document.getElementById('cm-sick-leave-pay-rate').value) || 0,
    proration_method: document.querySelector('input[name="cm-proration-method"]:checked')?.value || '30day_fixed',
    premium_mode:     document.querySelector('input[name="cm-premium-mode"]:checked')?.value || 'none',
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
  sick_leave_pay_rate:'병가 급여 지급율',
  proration_method:  '일할 계산 방식',
  premium_mode:      '가산수당 지급 기준',
  contacts:          '담당자 정보',
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

/** 사업자등록번호 자동 포맷 (숫자만 허용, XXX-XX-XXXXX) */
function _onBizInput() {
  const el = document.getElementById('cm-biz');
  if (!el) return;
  let digits = el.value.replace(/[^0-9]/g, '').slice(0, 10);
  if (digits.length > 5) {
    digits = digits.slice(0, 3) + '-' + digits.slice(3, 5) + '-' + digits.slice(5);
  } else if (digits.length > 3) {
    digits = digits.slice(0, 3) + '-' + digits.slice(3);
  }
  el.value = digits;
  _validateBizNumber();
}

/** 사업자등록번호 실시간 유효성 검사 */
function _validateBizNumber() {
  const el = document.getElementById('cm-biz');
  const hint = document.getElementById('cm-biz-hint');
  if (!el || !hint) return true;
  const raw = el.value.trim();
  hint.classList.remove('va-err', 'va-ok');
  hint.textContent = '';
  el.classList.remove('va-input-err');
  if (!raw) return false;

  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length !== 10 || !/^\d{10}$/.test(digits)) {
    hint.textContent = '사업자등록번호는 10자리 숫자여야 합니다 (예: 000-00-00000)';
    hint.classList.add('va-err');
    el.classList.add('va-input-err');
    return false;
  }

  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * weights[i];
  }
  sum += Math.floor((parseInt(digits[8]) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  if (check !== parseInt(digits[9])) {
    hint.textContent = '유효하지 않은 사업자등록번호입니다';
    hint.classList.add('va-err');
    el.classList.add('va-input-err');
    return false;
  }

  hint.textContent = '유효한 사업자등록번호입니다';
  hint.classList.add('va-ok');
  return true;
}

/** 저장 중복 실행 방지 (등록/임시저장 버튼 이중 클릭 가드) */
let _cmSaving = false;
function _cmSetSaveState(saving){
  ['cm-btn-register','cm-btn-draft'].forEach(id=>{
    const b = document.getElementById(id);
    if(!b) return;
    if(saving){
      b.dataset.prevHtml = b.innerHTML;
      b.dataset.prevDisabled = b.disabled ? 'true' : 'false';
      b.disabled = true;
      b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
    } else {
      b.disabled = (b.dataset.prevDisabled === 'true');
      if(b.dataset.prevHtml) b.innerHTML = b.dataset.prevHtml;
    }
  });
}
async function saveCompany(){
  if (_cmSaving) return;
  _cmSaving = true;
  _cmSetSaveState(true);
  try {
    await _saveCompanyImpl();
  } catch(e){
    console.error('[saveCompany]', e);
    toast('저장 중 오류가 발생했습니다.', 'error');
  } finally {
    _cmSaving = false;
    _cmSetSaveState(false);
  }
}
async function _saveCompanyImpl(){
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
    focusEl.classList.add('va-input-err');
    focusEl.scrollIntoView({ behavior:'smooth', block:'center' });
    focusEl.focus();
    setTimeout(() => { focusEl.classList.remove('va-input-err'); }, 2500);
    toast(msg, 'error');
    return false;
  }

  if(!_cmRequire('cm-name',           '회사명을 입력하세요.'))            return;
  if(!_cmRequire('cm-biz',            '사업자등록번호를 입력하세요.'))     return;
  if(!_validateBizNumber()) return;
  if(!_cmRequire('cm-contract-start', '자문계약 시작일을 입력하세요.'))    return;
  if(!_cmRequire('cm-addr',           '사업장 주소를 입력하세요.'))        return;
  // 급여 산정기간: 저장 전 강제 동기화 후 월·일 각각 검사 (포커스는 해당 셀렉트로)
  _cmPeriodCompose();
  if(!_cmRequire('cm-period-month', '급여 산정기간의 월(전월/당월)을 선택하세요.')) return;
  if(!_cmRequire('cm-period-day',   '급여 산정기간의 시작 일자를 선택하세요.'))     return;
  if(!_cmRequire('cm-payday',         '급여 지급일을 입력하세요.'))        return;
  if(!_cmRequire('cm-insurance-basis',   '4대보험 적용 기준을 선택하세요.'))  return;
  if(!_cmRequire('cm-annual-leave-basis','연차 휴가 산정 기준을 선택하세요.')) return;
  // 가산수당 지급 기준 필수 선택 (라디오 그룹)
  if(!document.querySelector('input[name="cm-premium-mode"]:checked')){
    const _pmHint = document.getElementById('cm-premium-mode-hint');
    if(_pmHint){ _pmHint.className = 'va-hint va-err'; _pmHint.textContent = '연장·야간·휴일 가산수당 지급 기준을 선택하세요.'; }
    const _pmFirst = document.querySelector('input[name="cm-premium-mode"]');
    if(_pmFirst){ _pmFirst.scrollIntoView({ behavior:'smooth', block:'center' }); _pmFirst.focus(); }
    return toast('연장·야간·휴일 가산수당 지급 기준을 선택하세요.', 'error');
  }

  // ── 대표자 정보 수집: 기존 고객사=인사관리대장 readonly, 신규·임시저장=직접 입력 ──
  const _isNewCompany = !editId.company; // 신규 또는 임시저장 이어쓰기 (인사관리대장 없음)
  const _representatives = _isNewCompany ? _cmCollectReps() : _cmCombinedReps(editId.company);
  if (_isNewCompany && !_representatives.length) {
    const _repName0 = document.querySelector('#cm-rep-rows input[id^="cm-rep-name-"]');
    if (_repName0) { _repName0.classList.add('va-input-err'); _repName0.scrollIntoView({ behavior: 'smooth', block: 'center' }); _repName0.focus(); setTimeout(() => { _repName0.classList.remove('va-input-err'); }, 2500); }
    return toast('대표자 이름을 입력하세요.', 'error');
  }
  // hidden 필드 동기화 (하위호환)
  document.getElementById('cm-rep').value = _representatives[0]?.name || '';
  document.getElementById('cm-phone').value = _representatives[0]?.phone || '';
  document.getElementById('cm-email').value = _representatives[0]?.email || '';

  const name   = document.getElementById('cm-name').value.trim();
  const biz    = document.getElementById('cm-biz').value.replace(/[^0-9]/g,'').trim();

  // ── 중복 등록 방지: 동일 회사명의 기존 고객사가 있으면 경고 (신규·임시저장 확정 시) ──
  if (_isNewCompany) {
    const _targetCoId = _currentCompanyDraftId || null;
    const _dup = (allCompanies || []).find(c =>
      c.id !== _targetCoId &&
      c.id !== editId.company &&
      String(c.company_name || '').trim().toLowerCase() === name.toLowerCase()
    );
    if (_dup) {
      const _dupCode = _dup.access_code ? ` (접근코드: ${_dup.access_code})` : '';
      if (!confirm(`이미 동일한 이름의 고객사가 등록되어 있습니다.\n\n[${_dup.company_name || name}]${_dupCode}\n\n그래도 계속 등록하시겠습니까?`)) return;
    }
  }
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
      sel.classList.add('va-input-err');
      sel.focus();
      setTimeout(() => { sel.classList.remove('va-input-err'); }, 2000);
      return toast(`[${_CM_AW_PT_LABEL[f]}] 통상임금 포함여부(지급 방식)를 선택하세요.`, 'error');
    }
  }

  const newAllowanceCfg = _cmGetAllowanceConfig();
  // 수정 모드: 기존 status 유지 / 신규·임시저장: ACTIVE 설정
  const _prevStatus = editId.company
    ? (allCompanies.find(x=>x.id===editId.company)?.status || COMPANY_STATUS.ACTIVE)
    : COMPANY_STATUS.ACTIVE;
  const body={company_name:name,business_number:document.getElementById('cm-biz').value.replace(/[^0-9]/g,''),representative:_representatives[0]?.name||'',representatives:JSON.stringify(_representatives),contacts:JSON.stringify(_cmCollectContacts()),industry:document.getElementById('cm-industry').value,address:document.getElementById('cm-addr').value,phone:_representatives[0]?.phone||'',email:_representatives[0]?.email||'',pay_period:document.getElementById('cm-period').value,pay_period_month:document.getElementById('cm-period-month-hidden').value||null,pay_period_day:parseInt(document.getElementById('cm-period-day-hidden').value)||null,pay_day:document.getElementById('cm-payday').value,access_code:code,note:document.getElementById('cm-note').value,insurance_basis:insuranceBasis,annual_leave_basis:annualLeaveBasis,sick_leave_pay_rate:parseFloat(document.getElementById('cm-sick-leave-pay-rate')?.value)||0,proration_method:document.querySelector('input[name="cm-proration-method"]:checked')?.value||'30day_fixed',premium_mode:document.querySelector('input[name="cm-premium-mode"]:checked')?.value||'none',service_contract_file_name:_cmSvcGetSaveData().name,service_contract_file_data:_cmSvcGetSaveData().data,allowance_config:newAllowanceCfg,contract_start_date:document.getElementById('cm-contract-start').value||null,is_draft:false,draft_saved_at:null,status:_prevStatus};

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

    const _allChangeLines = _fieldChangeLines;

    // ② 변경 확인 다이얼로그 (회사 정보)
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
          _effDateEl.classList.add('va-input-err');
          setTimeout(() => { _effDateEl.classList.remove('va-input-err'); }, 2000);
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

        // ⑥ 고객사 정보 변경 인앱 알림
        const _changeLines = changedFields.map(f => `· ${_CM_FIELD_LABELS[f] || f}`).join('\n');
        const _coName = allCompanies.find(x => x.id === editId.company)?.company_name || name;
        let _updTitle = `[고객사 정보 변경 안내] ${_coName}`;
        let _updBody = `안녕하세요, ${_coName} 대표자님.\n\n${_coName}의 정보가 다음과 같이 변경되었습니다.\n\n■ 변경사항\n${_changeLines}\n\n■ 적용일: ${_effDateStr}\n\n※ 변경 사항은 적용일부터 이루어지는 모든 근로계약에 반영됩니다.\n※ 변경사항은 이미 체결한 근로계약 및 그에 종속된 급여조건에는\n   어떠한 영향도 미치지 않습니다.\n   기존에 체결하셨던 근로계약에도 변경이 필요한 경우에는\n   근로계약을 갱신해야 합니다.\n※ 기타 문의사항이 있으시면 담당자에게 연락해 주시기 바랍니다.`;
        try {
          const _updRes = await fetch('../tables/representative_contact/default');
          if (_updRes.ok) {
            const _updData = await _updRes.json();
            if (_updData?.msg_body_rules) {
              const _updRules = typeof _updData.msg_body_rules === 'string'
                ? JSON.parse(_updData.msg_body_rules) : _updData.msg_body_rules;
              const _updRule = _updRules?.company_updated;
              if (_updRule) {
                if (_updRule.title) _updTitle = _updRule.title.replace(/\{회사명\}/g, _coName);
                if (_updRule.body) _updBody = _updRule.body
                  .replace(/\{회사명\}/g, _coName)
                  .replace(/\{변경내역\}/g, _changeLines)
                  .replace(/\{적용일\}/g, _effDateStr);
              }
            }
          }
        } catch(_) {}
        _sendCompanyNotice({
          companyId: editId.company, companyName: _coName,
          noticeType: 'company_updated',
          title: _updTitle, body: _updBody,
        }).catch(() => {});
      }
    }
  } else if(_currentCompanyDraftId){
    body.id=_currentCompanyDraftId;
    await api(`../tables/companies/${_currentCompanyDraftId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 임시저장 확정: 대표자 → 인사기록카드 생성 ──
    const _createdReps = await _cmCreateRepEmployees(body.id, _representatives);
    _representatives.forEach((r,i) => { if(_createdReps[i]?.emp_id) r.emp_id = _createdReps[i].emp_id; });
  } else {
    body.id='comp'+Date.now();
    await api('../tables/companies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 신규 고객사 대표자 → 인사기록카드 생성 ──
    const _createdReps = await _cmCreateRepEmployees(body.id, _representatives);
    _representatives.forEach((r,i) => { if(_createdReps[i]?.emp_id) r.emp_id = _createdReps[i].emp_id; });
    // ── 신규 등록 이력 기록 ──
    const _histNew = { id: 'cmhist_'+Date.now(), company_id: body.id, changed_at: Date.now(), effective_date: fmtLocalDate(new Date()),
      changes: [{ field: 'status', label: '고객사 상태', before: '', after: 'active' }],
      snapshot: {}
    };
    await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(_histNew)}).catch(()=>{});
    await loadCompanyHistories();
    // ── 신규 고객사 환영 인앱 알림 ──
    const _repName = _representatives[0]?.name || rep;
    const _startDate = body.contract_start_date || '-';
    let _welcomeTitle = `[환영] ${name} — 인사톡 노무톡 가입을 환영합니다`;
    let _welcomeBody = `안녕하세요, ${_repName} 사장님.\n\n${name}의 인사톡 노무톡 가입이 완료되었습니다.\n지금부터 근로계약 관리, 급여 명세서 발행, 4대보험 산정, 연차 관리 등\n다양한 인사노무 업무를 인사톡 노무톡이 대행해드립니다.\n\n■ 가입정보\n· 회사명: ${name}\n· 사업자번호: ${biz}\n· 대표자: ${_repName}\n· 앱 접근코드: ${code}\n· 자문계약 시작일: ${_startDate}\n\n※ 근로계약 등록 후 계약서 PDF를 근로자에게 발송하시면\n   앱에서 바로 확인하실 수 있습니다.\n※ 급여가 입력되면 급여명세서가 즉시 발급되어 해당 직원에게\n   자동 발송되며, 앱에서도 바로 확인하실 수 있습니다.\n※ 임금대장과 급여 통계는 급여가 입력된 직원부터 고객사 앱을\n   통해 즉시 확인하실 수 있습니다.\n※ 4대보험 요율과 최저임금 기준, 관련 법령의 변경 사항 등을\n   고지해드립니다.\n※ 관련 법령 위반의 위험이 감지되면 예방할 수 있게\n   사전에 미리 알려드립니다.\n※ 문의사항은 아래 담당자 연락처로 연락 주시기 바랍니다.`;

    // 시스템 설정에서 커스텀 규칙 조회 시도
    try {
      const _contactRes = await fetch('../tables/representative_contact/default');
      if (_contactRes.ok) {
        const _contactData = await _contactRes.json();
        if (_contactData?.msg_body_rules) {
          const _rules = typeof _contactData.msg_body_rules === 'string'
            ? JSON.parse(_contactData.msg_body_rules) : _contactData.msg_body_rules;
          const _rule = _rules?.company_welcome;
          if (_rule) {
            if (_rule.title) _welcomeTitle = _rule.title.replace(/\{회사명\}/g, name).replace(/\{대표자명\}/g, _repName);
            if (_rule.body) _welcomeBody = _rule.body
              .replace(/\{회사명\}/g, name).replace(/\{대표자명\}/g, _repName)
              .replace(/\{사업자번호\}/g, biz).replace(/\{접근코드\}/g, code)
              .replace(/\{계약시작일\}/g, _startDate);
          }
        }
      }
    } catch(_) { /* API unavailable — use defaults */ }

    _sendCompanyNotice({
      companyId: body.id, companyName: name,
      noticeType: 'company_welcome',
      title: _welcomeTitle,
      body: _welcomeBody
    }).catch(() => {});
  }
  _currentCompanyDraftId = null;

  // ── 담당자 필수 입력 검증 (대표자·등기임원·특수관계인은 인사관리대장 readonly 표시) ──
  {
    // ── 헬퍼: 오류 필드에 힌트 표시 + 포커스 ──
    const _cmShowFieldError = (el, msg) => {
      if(!el) return;
      el.classList.add('va-input-err');
      el.focus(); el.select();
      // 힌트 div 찾기 (필드 다음 형제 또는 부모 내 .va-hint)
      let hint = el.nextElementSibling;
      if(!hint || !hint.classList.contains('va-hint')) hint = el.parentElement?.querySelector('.va-hint');
      if(!hint){ hint = document.createElement('div'); hint.className = 'va-hint'; el.parentElement?.appendChild(hint); }
      hint.classList.add('va-err');
      hint.textContent = msg;
    };

    // 담당자 필수 입력 검증
    for (let i = 0; i < _cmContactIdx; i++) {
      const name = document.getElementById(`cm-contact-name-${i}`)?.value?.trim() || '';
      const position = document.getElementById(`cm-contact-position-${i}`)?.value?.trim() || '';
      const mobile = document.getElementById(`cm-contact-mobile-phone-${i}`)?.value?.trim() || '';
      if(!name){ _cmShowFieldError(document.getElementById(`cm-contact-name-${i}`), '담당자 이름을 입력하세요.'); return; }
      if(!position){ _cmShowFieldError(document.getElementById(`cm-contact-position-${i}`), '담당자 직급을 입력하세요.'); return; }
      if(!mobile){ _cmShowFieldError(document.getElementById(`cm-contact-mobile-phone-${i}`), '담당자 휴대전화번호를 입력하세요.'); return; }
    }
  }

  // ── 사번 원장 기록 (C18/C15): 대표자 부여 (동일 인원이 직원이면 직원 ID 연계) ──
  {
    const _repCoId = editId.company || body.id || '';
    if (_repCoId && typeof _elnAssign === 'function') {
      try {
        for (const r of _representatives) {
          if (!r.employee_number) continue;
          const _empId = r.emp_id || ((allEmployees || []).find(e => e.company_id === _repCoId && e.name === r.name)?.id || null);
          await _elnAssign(_repCoId, r.employee_number, _empId, 'representative');
        }
      } catch(e) { console.warn('[대표자 사번 원장 동기화 실패]', e); }
    }
  }

  closeModal('company-modal');await loadCompanies();await loadEmployees();populateFilters();populatePICompanies();renderCompanies();renderDashboard();
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
    c.status !== CONTRACT_STATUS.VOIDED
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

function _cmExecutiveHTML(idx, data = { name: '', position: '', phone: '', email: '', id_number: '', employee_number: '', bank_name: '', bank_account: '', bank_holder: '' }) {
  const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `
  <div class="cm-person-card" id="cm-exec-card-${idx}" style="background:#f8faff;border:1.5px solid #e0e7ff;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:13px;font-weight:700;color:#374151;">등기임원 #${idx+1}</span>
      <button type="button" class="btn btn-sm btn-secondary" onclick="_cmRemoveExecutive(${idx})"><i class="fas fa-trash-alt"></i> 삭제</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;">
      <div class="cm-person-fg"><label>이름 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-name-${idx}" value="${esc(data.name)}" placeholder="이름" /></div>
      <div class="cm-person-fg"><label>사원번호 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-empno-${idx}" value="${esc(data.employee_number)}" placeholder="사원번호" readonly style="background:#f1f5f9;" /><div id="cm-empno-err-exec-${idx}" class="va-hint"></div></div>
      <div class="cm-person-fg"><label>직책 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-position-${idx}" value="${esc(data.position)}" placeholder="예: 전무이사" /></div>
      <div class="cm-person-fg"><label>휴대전화번호 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-phone-${idx}" value="${esc(data.phone)}" placeholder="010-0000-0000" maxlength="13" oninput="_onPhoneInput(this)" onblur="_cmCheckExecPhone(${idx})" /></div>
      <div class="cm-person-fg"><label>주민번호 앞7자리 <span style="color:#c00;">*</span></label><input type="text" id="cm-exec-idnum-${idx}" value="${esc(data.id_number)}" placeholder="YYMMDD-N" maxlength="8" oninput="_onIdInput(this)" /></div>
      <div class="cm-person-fg"><label>이메일</label><input type="text" id="cm-exec-email-${idx}" value="${esc(data.email)}" placeholder="example@email.com" oninput="_onEmailInput(this)" /></div>
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

function _cmRelatedHTML(idx, data = { name: '', relationship: '', phone: '', email: '', id_number: '', employee_number: '', bank_name: '', bank_account: '', bank_holder: '' }) {
  const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `
  <div class="cm-person-card" id="cm-rel-card-${idx}" style="background:#f8faff;border:1.5px solid #e0e7ff;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:13px;font-weight:700;color:#374151;">특수관계인 #${idx+1}</span>
      <button type="button" class="btn btn-sm btn-secondary" onclick="_cmRemoveRelated(${idx})"><i class="fas fa-trash-alt"></i> 삭제</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;">
      <div class="cm-person-fg"><label>이름 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-name-${idx}" value="${esc(data.name)}" placeholder="이름" /></div>
      <div class="cm-person-fg"><label>사원번호 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-empno-${idx}" value="${esc(data.employee_number)}" placeholder="사원번호" readonly style="background:#f1f5f9;" /><div id="cm-empno-err-rel-${idx}" class="va-hint"></div></div>
      <div class="cm-person-fg"><label>관계 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-relationship-${idx}" value="${esc(data.relationship)}" placeholder="예: 배우자" /></div>
      <div class="cm-person-fg"><label>휴대전화번호 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-phone-${idx}" value="${esc(data.phone)}" placeholder="010-0000-0000" maxlength="13" oninput="_onPhoneInput(this)" onblur="_cmCheckRelPhone(${idx})" /></div>
      <div class="cm-person-fg"><label>주민번호 앞7자리 <span style="color:#c00;">*</span></label><input type="text" id="cm-rel-idnum-${idx}" value="${esc(data.id_number)}" placeholder="YYMMDD-N" maxlength="8" oninput="_onIdInput(this)" /></div>
      <div class="cm-person-fg"><label>이메일</label><input type="text" id="cm-rel-email-${idx}" value="${esc(data.email)}" placeholder="example@email.com" oninput="_onEmailInput(this)" /></div>
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

// ── 인사관리대장 인원 readonly 표시 (대표자/등기임원/특수관계인) ──────────
/** 해당 고객사 + 인원 유형의 인사관리대장 인원 반환 (퇴사일자 설정 인원 제외) */
function _cmRosterOfType(coId, type) {
  if (!coId) return [];
  return (allEmployees || []).filter(e => e.company_id === coId && personnelTypeOf(e) === type && !e.resign_date);
}

/** 대표자 통합 목록: 인사관리대장 대표자 본인 우선 + 레거시 companies.representatives JSON 보완 (이름 중복 제거) */
function _cmCombinedReps(coId) {
  const reps = [];
  const seen = new Set();
  _cmRosterOfType(coId, PERSONNEL_TYPE.REPRESENTATIVE).forEach(e => {
    if (!e.name || seen.has(e.name)) return;
    seen.add(e.name);
    reps.push({ name: e.name, employee_number: e.employee_number || '', phone: e.phone || '', email: e.email || '', emp_id: e.id });
  });
  const co = coId ? (allCompanies || []).find(c => c.id === coId) : null;
  if (co) {
    let legacy = [];
    try { legacy = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : (co.representatives || []); } catch (e) { legacy = []; }
    if (!Array.isArray(legacy)) legacy = [];
    // 퇴사일자가 설정된 대표자 본인 이름은 legacy JSON에서 제외 (고객사 정보 노출 중단)
    const resignedRepNames = new Set((allEmployees || []).filter(x =>
      x.company_id === coId && personnelTypeOf(x) === PERSONNEL_TYPE.REPRESENTATIVE && x.resign_date
    ).map(x => x.name));
    legacy.forEach(r => {
      if (!r || !r.name || seen.has(r.name) || resignedRepNames.has(r.name)) return;
      seen.add(r.name);
      const _emp = (allEmployees || []).find(x => x.company_id === coId && x.name === r.name);
      reps.push({ name: r.name, employee_number: r.employee_number || '', phone: r.phone || '', email: r.email || '', emp_id: _emp?.id || '' });
    });
  }
  return reps;
}

function _cmRoField(label, value) {
  return `<div class="form-group" style="margin-top:0;"><label>${_esc(label)}</label><div class="cm-ro-val">${_esc(value || '-')}</div></div>`;
}
function _cmRoEmpty(msg) {
  return `<div style="font-size:12px;color:#9ca3af;padding:10px 0;">${msg}</div>`;
}
function _cmJsStr(s) { return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
/** 인사관리대장 페이지로 이동해 해당 인원 모달 열기 */
function _cmOpenHrCard(coId, empId, name) {
  if (!coId) { toast('고객사를 먼저 등록해 주세요.', 'warning'); return; }
  closeModal('company-modal');
  const menuEl = document.querySelector('.menu-item[data-page="employees"]');
  showPage('employees', menuEl);
  setTimeout(() => {
    const co = (allCompanies || []).find(c => c.id === coId);
    if (typeof selectHrCompany === 'function') selectHrCompany(coId, co?.company_name || '');
    setTimeout(() => {
      if (typeof openHrEmployeeView !== 'function') return;
      if (empId) { openHrEmployeeView(empId); return; }
      const emp = (allEmployees || []).find(e => e.company_id === coId && e.name === name);
      if (emp) openHrEmployeeView(emp.id);
    }, 400);
  }, 250);
}
function _cmRoHrBtn(coId, empId, name) {
  return `<div style="grid-column:1/-1;display:flex;justify-content:flex-end;">
    <button type="button" class="btn btn-sm btn-indigo" onclick="_cmOpenHrCard('${_cmJsStr(coId)}','${_cmJsStr(empId)}','${_cmJsStr(name)}')"><i class="fas fa-id-card"></i> 인사관리대장</button>
  </div>`;
}

/** 신규 고객사 대표자 입력 → 인사기록카드(employees) 자동 생성 */
async function _cmCreateRepEmployees(coId, reps) {
  if (!coId || !reps) return [];
  const created = [];
  for (const r of reps) {
    if (!r || !r.name) continue;
    // 이미 동일 인원(같은 이름 + 대표자)이 인사관리대장에 있으면 재생성하지 않음
    const existing = (allEmployees || []).find(e =>
      e.company_id === coId && e.name === r.name && personnelTypeOf(e) === PERSONNEL_TYPE.REPRESENTATIVE
    );
    if (existing) { created.push({ ...r, emp_id: existing.id }); continue; }
    const empBody = {
      company_id: coId,
      employee_number: r.employee_number || '',
      name: r.name,
      gender: '',
      phone: r.phone || '',
      email: r.email || '',
      hire_date: document.getElementById('cm-contract-start').value || fmtLocalDate(new Date()),
      department: '',
      position: '대표이사',
      personnel_type: PERSONNEL_TYPE.REPRESENTATIVE,
      is_representative: 1,
      status: EMP_STATUS.ACTIVE,
    };
    try {
      const saved = await api('../tables/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empBody)
      });
      created.push({ ...r, emp_id: saved?.id || '' });
    } catch (e) { console.warn('[대표자 인사카드 생성 실패]', e); created.push({ ...r, emp_id: '' }); }
  }
  return created;
}

/** 대표자 정보 입력 행 렌더 (신규·임시저장 모드 — 인사관리대장이 아직 없어 직접 입력) */
function _cmRenderRepInputRows() {
  const container = document.getElementById('cm-rep-rows');
  if (!container) return;
  // 초기 데이터: 임시저장 이어쓰기면 저장된 representatives JSON 복원
  let init = [];
  if (_currentCompanyDraftId) {
    const c = (allCompanies || []).find(x => x.id === _currentCompanyDraftId);
    if (c) {
      try { const r = typeof c.representatives === 'string' ? JSON.parse(c.representatives) : (c.representatives || []); if (Array.isArray(r)) init = r; } catch(e){ init = []; }
    }
  }
  _cmClearRepRows();
  if (!init.length) init = [{}];
  init.forEach(d => _cmAddRepRow({ name: d.name||'', phone: d.phone||'', email: d.email||'', employee_number: d.employee_number||'' }));
  // 하위호환 hidden 동기화
  const first = _cmCollectReps()[0] || {};
  document.getElementById('cm-rep').value = first.name || '';
  document.getElementById('cm-phone').value = first.phone || '';
  document.getElementById('cm-email').value = first.email || '';
}

/** 대표자 정보 readonly 렌더 */
function _cmRenderRosterReps() {
  const container = document.getElementById('cm-rep-rows');
  if (!container) return;
  const reps = _cmCombinedReps(editId.company || _currentCompanyDraftId);
  // 하위호환 hidden 동기화
  document.getElementById('cm-rep').value = reps[0]?.name || '';
  document.getElementById('cm-phone').value = reps[0]?.phone || '';
  document.getElementById('cm-email').value = reps[0]?.email || '';
  if (!reps.length) {
    container.innerHTML = _cmRoEmpty('인사관리대장에 등록된 대표자 본인이 없습니다.');
    return;
  }
  container.innerHTML = reps.map(r => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;">
      ${_cmRoField('이름', r.name)}
      ${_cmRoField('사원번호', r.employee_number)}
      ${_cmRoField('휴대전화', r.phone)}
      ${_cmRoField('이메일', r.email)}
      ${_cmRoHrBtn(editId.company || _currentCompanyDraftId, r.emp_id || '', r.name)}
    </div>`).join('');
}

/** 등기임원 readonly 렌더 (인사관리대장 우선 + 레거시 보완, 이름 중복 제거) */
function _cmRenderRosterExecs() {
  const list = document.getElementById('cm-executives-list');
  if (!list) return;
  const coId = editId.company || _currentCompanyDraftId;
  const map = new Map(); // name → item (동일인 중복 방지)
  (_cmExecutives || []).forEach(x => {
    if (!x.name) return;
    const _emp = (allEmployees || []).find(e => e.company_id === coId && e.name === x.name);
    if (_emp?.resign_date) return; // 퇴사일자 설정 → 고객사 정보에서 제외
    map.set(x.name, { name: x.name, empno: x.employee_number || '', position: x.position || '', phone: x.phone || '', empId: _emp?.id || '' });
  });
  _cmRosterOfType(coId, PERSONNEL_TYPE.EXECUTIVE).forEach(e => {
    if (!e.name) return;
    map.set(e.name, { name: e.name, empno: e.employee_number || '', position: e.position || '', phone: e.phone || '', empId: e.id });
  });
  const items = Array.from(map.values());
  if (!items.length) {
    list.innerHTML = _cmRoEmpty('인사관리대장에 등록된 등기임원이 없습니다.');
    return;
  }
  list.innerHTML = items.map(it => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;">
      ${_cmRoField('이름', it.name)}
      ${_cmRoField('사원번호', it.empno)}
      ${_cmRoField('직책', it.position)}
      ${_cmRoField('휴대전화', it.phone)}
      ${_cmRoHrBtn(editId.company || _currentCompanyDraftId, it.empId || '', it.name)}
    </div>`).join('');
}

/** 특수관계인 readonly 렌더 (인사관리대장 우선 + 레거시 보완, 이름 중복 제거) */
function _cmRenderRosterRels() {
  const list = document.getElementById('cm-related-list');
  if (!list) return;
  const coId = editId.company || _currentCompanyDraftId;
  const map = new Map(); // name → item (동일인 중복 방지)
  (_cmRelatedParties || []).forEach(x => {
    if (!x.name) return;
    const _emp = (allEmployees || []).find(e => e.company_id === coId && e.name === x.name);
    if (_emp?.resign_date) return; // 퇴사일자 설정 → 고객사 정보에서 제외
    map.set(x.name, { name: x.name, empno: x.employee_number || '', relationship: x.relationship || '', phone: x.phone || '', empId: _emp?.id || '' });
  });
  _cmRosterOfType(coId, PERSONNEL_TYPE.RELATED).forEach(e => {
    if (!e.name) return;
    map.set(e.name, { name: e.name, empno: e.employee_number || '', relationship: e.relationship || '', phone: e.phone || '', empId: e.id });
  });
  const items = Array.from(map.values());
  if (!items.length) {
    list.innerHTML = _cmRoEmpty('인사관리대장에 등록된 특수관계인이 없습니다.');
    return;
  }
  list.innerHTML = items.map(it => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;">
      ${_cmRoField('이름', it.name)}
      ${_cmRoField('사원번호', it.empno)}
      ${_cmRoField('관계', it.relationship)}
      ${_cmRoField('휴대전화', it.phone)}
      ${_cmRoHrBtn(editId.company || _currentCompanyDraftId, it.empId || '', it.name)}
    </div>`).join('');
}

function _cmRenderExecutives() {
  const list = document.getElementById('cm-executives-list');
  if (!list) return;
  list.innerHTML = _cmExecutives.map((d, i) => _cmExecutiveHTML(i, d)).join('');
  // readonly 모드: 등록 내역 없으면 섹션 숨김
  if (window._cmViewOnly) {
    const sec = document.getElementById('cm-executives-section');
    if (sec) sec.style.display = _cmExecutives.length ? '' : 'none';
  }
}

function _cmRenderRelated() {
  const list = document.getElementById('cm-related-list');
  if (!list) return;
  list.innerHTML = _cmRelatedParties.map((d, i) => _cmRelatedHTML(i, d)).join('');
  // readonly 모드: 등록 내역 없으면 섹션 숨김
  if (window._cmViewOnly) {
    const sec = document.getElementById('cm-related-section');
    if (sec) sec.style.display = _cmRelatedParties.length ? '' : 'none';
  }
}

function _cmAddExecutive() {
  _cmExecutives.push({ name: '', position: '', phone: '', email: '', id_number: '', employee_number: '', bank_name: '', bank_account: '', bank_holder: '' });
  _cmRenderExecutives();
  _cmSuggestAllEmpNos();
}

function _cmRemoveExecutive(idx) {
  _cmExecutives.splice(idx, 1);
  _cmRenderExecutives();
  _cmSuggestAllEmpNos();
  toast('수정 완료 버튼을 눌러야 삭제하신 내용이 최종 반영됩니다.', 'warning');
}

function _cmAddRelated() {
  _cmRelatedParties.push({ name: '', relationship: '', phone: '', email: '', id_number: '', employee_number: '', bank_name: '', bank_account: '', bank_holder: '' });
  _cmRenderRelated();
  _cmSuggestAllEmpNos();
}

function _cmRemoveRelated(idx) {
  _cmRelatedParties.splice(idx, 1);
  _cmRenderRelated();
  _cmSuggestAllEmpNos();
  toast('수정 완료 버튼을 눌러야 삭제하신 내용이 최종 반영됩니다.', 'warning');
}

// ── 사원번호 추천 헬퍼 (대표자/등기임원/특수관계인 공통) ──
function _cmSuggestEmpNoFor(inputEl) {
  if (!inputEl) return;
  const coId = editId.company || _currentCompanyDraftId;
  // ── 사번 원장 기준 max+1 (C14/C18): 원장 최대값 + 현재 폼에 입력된 다른 번호 고려 ──
  let maxNum = 0;
  if (coId && typeof _elnMaxNum === 'function') maxNum = Math.max(maxNum, _elnMaxNum(coId));
  document.querySelectorAll('[id^="cm-rep-empno-"],[id^="cm-exec-empno-"],[id^="cm-rel-empno-"]').forEach(el => {
    if (el === inputEl) return;
    const n = parseInt((el.value || '').trim(), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  });
  let sugg = maxNum + 1;
  // 폼 내 동시 신규 행 충돌 방지
  while (Array.from(document.querySelectorAll('[id^="cm-rep-empno-"],[id^="cm-exec-empno-"],[id^="cm-rel-empno-"]')).some(el =>
    el !== inputEl && parseInt((el.value || '').trim(), 10) === sugg
  )) sugg++;
  const val = String(sugg).padStart(4, '0');
  inputEl.value = val;
  inputEl.placeholder = `추천: ${val}`;
}

function _cmSuggestRepEmpNo(idx) {
  _cmSuggestEmpNoFor(document.getElementById('cm-rep-empno-' + idx));
}
function _cmSuggestExecEmpNo(idx) {
  _cmSuggestEmpNoFor(document.getElementById('cm-exec-empno-' + idx));
}
function _cmSuggestRelEmpNo(idx) {
  _cmSuggestEmpNoFor(document.getElementById('cm-rel-empno-' + idx));
}

// ── 사원번호 중복 검사 (대표자/등기임원/특수관계인 공통) ──
function _cmCheckEmpNoDup(el) {
  if (!el || !el.value.trim()) { if(el) el.classList.remove('va-input-err'); _cmEmpNoHint(el, '', ''); return; }
  const coId = editId.company;
  const empNo = el.value.trim();

  // 1) 같은 폼 내 다른 사원번호 필드와 중복 체크 (coId 불필요 — 항상 실행)
  const allEmpNoInputs = document.querySelectorAll('[id^="cm-rep-empno-"],[id^="cm-exec-empno-"],[id^="cm-rel-empno-"]');
  for (const other of allEmpNoInputs) {
    if (other === el) continue;
    if ((other.value || '').trim() === empNo) {
      el.classList.add('va-input-err');
      _cmEmpNoHint(el, 'va-err', `사원번호 "${empNo}"은(는) 이미 다른 항목에서 입력된 번호입니다.`);
      return;
    }
  }

  // 2) DB에 저장된 직원과 중복 체크 (coId 필요 — 신규작성 시 생략)
  if (!coId) { el.classList.remove('va-input-err'); _cmEmpNoHint(el, '', ''); return; }
  const matched = allEmployees.find(e => e.company_id === coId && e.employee_number === empNo);
  if (!matched) {
    // 2-1) 등기임원·특수관계인·대표자와 교차 중복 체크
    const _execHit = (allExecutives||[]).find(e => e.company_id === coId && String(e.employee_number||'').trim() === empNo);
    if (_execHit) {
      el.classList.add('va-input-err');
      _cmEmpNoHint(el, 'va-err', `사원번호 "${empNo}"은(는) 이미 ${_execHit.name} 등기임원이 사용 중입니다.`);
      return;
    }
    const _relHit = (allRelatedParties||[]).find(r => r.company_id === coId && String(r.employee_number||'').trim() === empNo);
    if (_relHit) {
      el.classList.add('va-input-err');
      _cmEmpNoHint(el, 'va-err', `사원번호 "${empNo}"은(는) 이미 ${_relHit.name} 특수관계인이 사용 중입니다.`);
      return;
    }
    let _repHit = null;
    const _co = allCompanies.find(c => c.id === coId);
    if(_co){
      let _reps = [];
      try { _reps = typeof _co.representatives==='string' ? JSON.parse(_co.representatives) : (_co.representatives||[]); } catch(e){ _reps = []; }
      if(Array.isArray(_reps)) _repHit = _reps.find(r => String(r.employee_number||'').trim() === empNo);
    }
    if (_repHit) {
      el.classList.add('va-input-err');
      _cmEmpNoHint(el, 'va-err', `사원번호 "${empNo}"은(는) 이미 대표자(${_repHit.name||''})가 사용 중입니다.`);
      return;
    }
    // ── 사번 원장 재사용 금지 (C11): voided 번호 재사용 불가 / 타인 used 번호 중복 불가 ──
    if (typeof _elnReuseInfo === 'function') {
      const _rowName = (document.getElementById(el.id.replace(/^cm-(rep|exec|rel)-empno-/, '$1-') + '-name') || {}).value || '';
      const _selfEmpId = (allEmployees || []).find(e => e.company_id === coId && e.name === _rowName)?.id || null;
      const _reuse = _elnReuseInfo(coId, empNo, _selfEmpId);
      if (_reuse.blocked) {
        el.classList.add('va-input-err');
        _cmEmpNoHint(el, 'va-err', `사원번호 "${empNo}"은(는) ${_reuse.reason}`);
        return;
      }
    }
    el.classList.remove('va-input-err');
    _cmEmpNoHint(el, 'va-ok', '사용 가능한 사원번호입니다.');
    return;
  }

  // 기존 직원이 사용 중 → 사용 불가
  el.classList.add('va-input-err');
  _cmEmpNoHint(el, 'va-err', `사원번호 "${empNo}"은(는) 이미 ${matched.name} 직원이 사용 중입니다.`);
}

/** 사원번호 필드 아래 힌트 표시 */
function _cmEmpNoHint(el, cls, msg) {
  const hintId = 'cm-empno-err-' + el.id.replace(/^cm-(rep|exec|rel)-empno-/, '$1-');
  const hint = document.getElementById(hintId);
  if (!hint) return;
  hint.classList.remove('va-ok', 'va-err');
  hint.textContent = '';
  if (cls) { hint.classList.add(cls); hint.textContent = msg; }
}

function _cmCheckRepEmpNo(idx) {
  _cmCheckEmpNoDup(document.getElementById('cm-rep-empno-' + idx));
  _cmSuggestAllEmpNos();
}
function _cmCheckExecEmpNo(idx) {
  _cmCheckEmpNoDup(document.getElementById('cm-exec-empno-' + idx));
  _cmSuggestAllEmpNos();
}
function _cmCheckRelEmpNo(idx) {
  _cmCheckEmpNoDup(document.getElementById('cm-rel-empno-' + idx));
  _cmSuggestAllEmpNos();
}

// ── 전화번호 중복 검사 (대표자/등기임원/특수관계인 공통) ──
function _cmCheckPhoneDup(el) {
  if (!el || !el.value.trim()) { if(el) el.style.borderColor = ''; return; }
  const phone = el.value.trim().replace(/[^0-9]/g, '');
  if (!phone) { el.style.borderColor = ''; return; }

  // 같은 폼 내 다른 전화번호 필드와 중복 체크
  const allPhoneInputs = document.querySelectorAll('[id^="cm-rep-phone-"],[id^="cm-exec-phone-"],[id^="cm-rel-phone-"]');
  for (const other of allPhoneInputs) {
    if (other === el) continue;
    const otherPhone = (other.value || '').trim().replace(/[^0-9]/g, '');
    if (otherPhone && otherPhone === phone) {
      el.style.borderColor = '#dc2626';
      toast('이미 다른 항목에 입력된 전화번호입니다.', 'error');
      return;
    }
  }

  el.style.borderColor = '#16a34a';
}

function _cmCheckRepPhone(idx) {
  _cmCheckPhoneDup(document.getElementById('cm-rep-phone-' + idx));
}
function _cmCheckExecPhone(idx) {
  _cmCheckPhoneDup(document.getElementById('cm-exec-phone-' + idx));
}
function _cmCheckRelPhone(idx) {
  _cmCheckPhoneDup(document.getElementById('cm-rel-phone-' + idx));
}

/** 모든 사원번호 필드의 placeholder 추천값을 재계산 */
function _cmSuggestAllEmpNos() {
  document.querySelectorAll('[id^="cm-rep-empno-"],[id^="cm-exec-empno-"],[id^="cm-rel-empno-"]').forEach(el => {
    if (!el.value.trim()) _cmSuggestEmpNoFor(el);
  });
}

/** 저장 전: 모든 사원번호를 0001부터 순차적으로 재정렬 (gap 제거) */
/** 저장 전 최종 유효성 검증: 사원번호 중복·DB 충돌 확인 */
function _cmValidateAllEmpNos() {
  const coId = editId.company;
  const seen = {}; // { empNo: label } — 폼 내 중복 검사용
  const allInputs = document.querySelectorAll('[id^="cm-rep-empno-"],[id^="cm-exec-empno-"],[id^="cm-rel-empno-"]');
  const errors = [];
  const errorEls = []; // 오류 발생한 input 요소

  // 1) DB 기존 직원 사원번호 Set (본 회사 소속만, 자기 자신 제외)
  const dbUsed = new Set();
  if (coId) {
    for (const emp of allEmployees) {
      if (emp.company_id !== coId) continue;
      if (emp.employee_number) dbUsed.add(emp.employee_number);
    }
  }

  for (const el of allInputs) {
    const val = (el.value || '').trim();
    if (!val) continue;

    // 1) 폼 내 중복 검사
    if (seen[val]) {
      errors.push(`사원번호 "${val}" 중복: ${seen[val]} / 현재 필드`);
      errorEls.push(el);
    } else {
      seen[val] = _cmGetEmpNoLabel(el);
    }

    // 2) DB 중복 검사 (기존 직원과 충돌)
    if (dbUsed.has(val)) {
      const dupEmp = allEmployees.find(e => e.company_id === coId && e.employee_number === val);
      if (dupEmp) {
        errors.push(`사원번호 "${val}"은(는) 이미 ${dupEmp.name} 직원이 사용 중입니다.`);
        errorEls.push(el);
      }
    }

    // 3) 사번 원장 재사용 금지 (C11): voided 번호 재사용 불가 / 타인 used 번호 중복 불가
    if (typeof _elnReuseInfo === 'function' && coId) {
      const _rowName = (document.getElementById(el.id.replace(/^cm-(rep|exec|rel)-empno-/, '$1-') + '-name') || {}).value || '';
      const _selfEmpId = (allEmployees || []).find(e => e.company_id === coId && e.name === _rowName)?.id || null;
      const _reuse = _elnReuseInfo(coId, val, _selfEmpId);
      if (_reuse.blocked) {
        errors.push(`사원번호 "${val}"은(는) ${_reuse.reason}`);
        errorEls.push(el);
      }
    }
  }

  if (errors.length) {
    if (errorEls.length > 0) {
      const firstEl = errorEls[0];
      firstEl.classList.add('va-input-err');
      firstEl.focus();
      firstEl.select();
      _cmEmpNoHint(firstEl, 'va-err', errors[0]);
    }
    return false;
  }
  return true;
}

/** 사원번호 입력 필드의 소속 라벨 반환 (오류 메시지용) */
function _cmGetEmpNoLabel(el) {
  const id = el.id || '';
  if (id.startsWith('cm-rep-'))  return '대표자';
  if (id.startsWith('cm-exec-')) return '등기임원';
  if (id.startsWith('cm-rel-'))  return '특수관계인';
  return '기타';
}

/** 저장 전 최종 유효성 검증: 전화번호 폼 내 중복 확인 */
function _cmValidateAllPhones() {
  const seen = {};
  const allInputs = document.querySelectorAll('[id^="cm-rep-phone-"],[id^="cm-exec-phone-"],[id^="cm-rel-phone-"]');
  const errors = [];

  for (const el of allInputs) {
    const raw = (el.value || '').trim();
    if (!raw) continue;
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) continue;

    if (seen[digits]) {
      errors.push(`전화번호 "${raw}" 중복: ${seen[digits]} / ${_cmGetPhoneLabel(el)}`);
    } else {
      seen[digits] = _cmGetPhoneLabel(el);
    }
  }

  if (errors.length) {
    toast(errors.join('\n'), 'error');
    return false;
  }
  return true;
}

/** 전화번호 입력 필드의 소속 라벨 반환 */
function _cmGetPhoneLabel(el) {
  const id = el.id || '';
  if (id.startsWith('cm-rep-'))  return '대표자';
  if (id.startsWith('cm-exec-')) return '등기임원';
  if (id.startsWith('cm-rel-'))  return '특수관계인';
  return '기타';
}

function _cmCollectExecutives() {
  const result = [];
  _cmExecutives.forEach((_, i) => {
    const name = document.getElementById(`cm-exec-name-${i}`)?.value?.trim() || '';
    const position = document.getElementById(`cm-exec-position-${i}`)?.value?.trim() || '';
    const phone = document.getElementById(`cm-exec-phone-${i}`)?.value?.trim() || '';
    const email = document.getElementById(`cm-exec-email-${i}`)?.value?.trim() || '';
    const id_number = document.getElementById(`cm-exec-idnum-${i}`)?.value?.trim() || '';
    const employee_number = document.getElementById(`cm-exec-empno-${i}`)?.value?.trim() || '';
    const bank_name = document.getElementById(`cm-exec-bank-${i}`)?.value?.trim() || '';
    const bank_account = document.getElementById(`cm-exec-account-${i}`)?.value?.trim() || '';
    const bank_holder = document.getElementById(`cm-exec-holder-${i}`)?.value?.trim() || '';
    if (name || position || phone || id_number) {
      result.push({ name, position, phone, email, id_number, employee_number, bank_name, bank_account, bank_holder });
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
    const email = document.getElementById(`cm-rel-email-${i}`)?.value?.trim() || '';
    const id_number = document.getElementById(`cm-rel-idnum-${i}`)?.value?.trim() || '';
    const employee_number = document.getElementById(`cm-rel-empno-${i}`)?.value?.trim() || '';
    const bank_name = document.getElementById(`cm-rel-bank-${i}`)?.value?.trim() || '';
    const bank_account = document.getElementById(`cm-rel-account-${i}`)?.value?.trim() || '';
    const bank_holder = document.getElementById(`cm-rel-holder-${i}`)?.value?.trim() || '';
    if (name || relationship || phone || id_number) {
      result.push({ name, relationship, phone, email, id_number, employee_number, bank_name, bank_account, bank_holder });
    }
  });
  return result;
}

async function _cmLoadExecutives(companyId) {
  _cmExecutives = [];
  if (!companyId) { _cmRenderExecutives(); return; }
  try {
    const res = await api(`../tables/registered_executives?company_id=${companyId}`);
    // 비동기 경합 가드: 응답이 도착했을 때 열려 있는 모달이 다른 고객사면 폐기
    if (editId.company !== companyId) return;
    const rows = res?.data || res || [];
    _cmExecutives = (Array.isArray(rows) ? rows : []).map(r => ({
      id: r.id, name: r.name, position: r.position, phone: r.phone, id_number: r.id_number,
      employee_number: r.employee_number || '',
      bank_name: r.bank_name || '', bank_account: r.bank_account || '', bank_holder: r.bank_holder || ''
    }));
  } catch(e) { console.error('[_cmLoadExecutives]', e); }
  _cmRenderExecutives();
  _cmSuggestAllEmpNos();
}

async function _cmLoadRelated(companyId) {
  _cmRelatedParties = [];
  if (!companyId) { _cmRenderRelated(); return; }
  try {
    const res = await api(`../tables/related_party_workers?company_id=${companyId}`);
    // 비동기 경합 가드: 응답이 도착했을 때 열려 있는 모달이 다른 고객사면 폐기
    if (editId.company !== companyId) return;
    const rows = res?.data || res || [];
    _cmRelatedParties = (Array.isArray(rows) ? rows : []).map(r => ({
      id: r.id, name: r.name, relationship: r.relationship, phone: r.phone, id_number: r.id_number,
      employee_number: r.employee_number || '',
      bank_name: r.bank_name || '', bank_account: r.bank_account || '', bank_holder: r.bank_holder || ''
    }));
  } catch(e) { console.error('[_cmLoadRelated]', e); }
  _cmRenderRelated();
  _cmSuggestAllEmpNos();
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
        phone: d.phone, email: d.email, id_number: d.id_number,
        employee_number: d.employee_number,
        bank_name: d.bank_name, bank_account: d.bank_account, bank_holder: d.bank_holder,
        created_at: Date.now(), updated_at: Date.now()
      };
      await api('../tables/registered_executives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      // ── 사번 원장 기록 (C18/C15): 등기임원 부여 (동일 인원이 직원이면 직원 ID 연계) ──
      if (d.employee_number && typeof _elnAssign === 'function') {
        const _empId = (allEmployees || []).find(e => e.company_id === companyId && e.name === d.name)?.id || null;
        await _elnAssign(companyId, d.employee_number, _empId, 'executive');
      }
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
        phone: d.phone, email: d.email, id_number: d.id_number,
        employee_number: d.employee_number,
        bank_name: d.bank_name, bank_account: d.bank_account, bank_holder: d.bank_holder,
        created_at: Date.now(), updated_at: Date.now()
      };
      await api('../tables/related_party_workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      // ── 사번 원장 기록 (C18/C15): 특수관계인 부여 (동일 인원이 직원이면 직원 ID 연계) ──
      if (d.employee_number && typeof _elnAssign === 'function') {
        const _empId = (allEmployees || []).find(e => e.company_id === companyId && e.name === d.name)?.id || null;
        await _elnAssign(companyId, d.employee_number, _empId, 'related_party');
      }
    }
  } catch(e) {
    console.error('[_cmSaveRelated]', e);
    throw e;
  }
}

// ==============================================================================
