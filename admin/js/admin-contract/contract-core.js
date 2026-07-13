function _renderContAlertCards(){
  const wrap = document.getElementById('cont-alert-cards-wrap');
  if(!wrap || !currentContCompanyId) return;

  const today = new Date().toISOString().slice(0,10);

  // 현재 고객사 계약 전체 분류
  const companyContracts = allContracts.filter(c => c.company_id === currentContCompanyId);

  const ALERT_LABELS = ['갱신예정','계약예정','해지예정'];
  const groups = {};
  ALERT_LABELS.forEach(l => groups[l] = []);

  companyContracts.forEach(c => {
    const {label} = calcContractStatusDisplay(c, today);
    if(groups[label] !== undefined) groups[label].push(c);
  });

  // 카드 정의 (임시저장 카드는 _renderContractsBanners 로 통일)
  const CARD_CONFIG = [
    {
      key: '갱신예정', cls: 'cont-alert-renew',
      icon: 'fas fa-sync-alt', iconColor: '#b45309',
      title: '갱신 예정 계약',
      desc: '계약 시작일이 아직 도래하지 않은 갱신 계약입니다.',
      cols: ['직원명','고용형태','계약 시작일','D-day','관리'],
      row: (c) => {
        const emp = allEmployees.find(e=>e.id===c.employee_id);
        const _rawCat = c.contract_type || emp?.employment_category || '-';
        const empCat = contractTypeLabel(_rawCat);
        const catBadge = CAT_BADGE_CLS[_rawCat] || 'badge-gray';
        const diff = c.contract_start ? Math.ceil((new Date(c.contract_start)-new Date(today))/(1000*60*60*24)) : null;
        const dday = diff !== null ? (diff>0?`D-${diff}`:diff===0?'D-day':`D+${Math.abs(diff)}`) : '-';
        const ddayColor = diff !== null && diff <= 7 ? '#dc2626' : '#b45309';
        return `<td style="font-weight:700;color:#1f2937;">${getEmpName(c.employee_id)}</td>
          <td><span class="badge ${catBadge}" style="font-size:11px;">${empCat}</span></td>
          <td style="font-size:12px;color:#6b7280;">${c.contract_start||'-'}</td>
          <td><span style="font-weight:700;color:${ddayColor};font-size:12.5px;">${dday}</span></td>
          <td style="white-space:nowrap;">
            <button onclick="viewContract('${c.id}')" class="btn btn-sm btn-indigo"><i class="fas fa-search"></i> 조회</button>
          </td>`;
      }
    },
    {
      key: '계약예정', cls: 'cont-alert-pending',
      icon: 'fas fa-calendar-alt', iconColor: '#4338ca',
      title: '계약 예정',
      desc: '시작일이 미도래한 신규 계약입니다.',
      cols: ['직원명','고용형태','계약 시작일','D-day','관리'],
      row: (c) => {
        const emp = allEmployees.find(e=>e.id===c.employee_id);
        const _rawCat = c.contract_type || emp?.employment_category || '-';
        // 수습→정규 전환 계약은 probation 제거 후 표시
        const empCat = _rawCat ===CONTRACT_TYPE.REGULAR_PROBATION ? '정규직' : _rawCat ===CONTRACT_TYPE.FIXED_PROBATION ? '계약직' : contractTypeLabel(_rawCat);
        const catBadge = CAT_BADGE_CLS[_rawCat] || 'badge-gray';
        const diff = c.contract_start ? Math.ceil((new Date(c.contract_start)-new Date(today))/(1000*60*60*24)) : null;
        const dday = diff !== null ? (diff>0?`D-${diff}`:diff===0?'D-day':`D+${Math.abs(diff)}`) : '-';
        const ddayColor = diff !== null && diff <= 7 ? '#dc2626' : '#4338ca';
        return `<td style="font-weight:700;color:#1f2937;">${getEmpName(c.employee_id)}</td>
          <td><span class="badge ${catBadge}" style="font-size:11px;">${empCat}</span></td>
          <td style="font-size:12px;color:#6b7280;">${c.contract_start||'-'}</td>
          <td><span style="font-weight:700;color:${ddayColor};font-size:12.5px;">${dday}</span></td>
          <td style="white-space:nowrap;">
            <button onclick="viewContract('${c.id}')" class="btn btn-sm btn-indigo"><i class="fas fa-search"></i> 조회</button>
          </td>`;
      }
    },
    {
      key: '해지예정', cls: 'cont-alert-preterminate',
      icon: 'fas fa-user-clock', iconColor: '#be123c',
      title: '해지 예정 (퇴사예정)',
      desc: '퇴사예정일이 설정된 계약입니다. 해지 처리를 준비하세요.',
      cols: ['직원명','고용형태','퇴사 예정일','D-day','관리'],
      row: (c) => {
        const emp = allEmployees.find(e=>e.id===c.employee_id);
        const _rawCat = c.contract_type || emp?.employment_category || '-';
        const empCat = _rawCat ===CONTRACT_TYPE.REGULAR_PROBATION ? '정규직 수습' : _rawCat ===CONTRACT_TYPE.FIXED_PROBATION ? '계약직 수습' : contractTypeLabel(_rawCat);
        const catBadge = CAT_BADGE_CLS[_rawCat] || CAT_BADGE_CLS[empCat] || 'badge-gray';
        const termDate = c.terminate_date || '';
        const diff = termDate ? Math.ceil((new Date(termDate)-new Date(today))/(1000*60*60*24)) : null;
        const dday = diff !== null ? (diff>0?`D-${diff}`:diff===0?'D-day':`D+${Math.abs(diff)}`) : '-';
        const ddayColor = diff !== null && diff <= 14 ? '#dc2626' : '#be123c';
        return `<td style="font-weight:700;color:#1f2937;">${getEmpName(c.employee_id)}</td>
          <td><span class="badge ${catBadge}" style="font-size:11px;">${empCat}</span></td>
          <td style="font-size:12px;color:#9f1239;font-weight:600;">${termDate||'-'}</td>
          <td><span style="font-weight:700;color:${ddayColor};font-size:12.5px;">${dday}</span></td>
          <td style="white-space:nowrap;">
            <button onclick="viewContract('${c.id}')" class="btn btn-sm btn-indigo"><i class="fas fa-search"></i> 조회</button>
          </td>`;
      }
    },
  ];

  // 열려있던 카드 상태 기억 (기존 cont-alert-card 한정)
  const prevOpen = {};
  wrap.querySelectorAll('.cont-alert-card').forEach(el => {
    prevOpen[el.dataset.alertKey] = el.querySelector('.cont-alert-card-body')?.style.display !== 'none';
  });

  // 기존 cont-alert-card 만 제거 (배너 div는 유지)
  wrap.querySelectorAll('.cont-alert-card').forEach(el => el.remove());

  CARD_CONFIG.forEach(cfg => {
    const list = groups[cfg.key];
    if(!list.length) return; // 해당 상태 없으면 카드 자체 숨김

    const isOpen = prevOpen[cfg.key] !== false; // 기본 열림
    const div = document.createElement('div');
    div.className = `cont-alert-card ${cfg.cls}`;
    div.dataset.alertKey = cfg.key;
    div.innerHTML = `
      <div class="cont-alert-card-head" onclick="_toggleContAlertCard(this)">
        <div class="cont-alert-card-title">
          <i class="${cfg.icon}" style="color:${cfg.iconColor};font-size:15px;"></i>
          ${cfg.title}
          <span class="cont-alert-card-count">${list.length}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:11.5px;font-weight:500;opacity:.7;">${cfg.desc}</span>
          <i class="fas fa-chevron-down cont-alert-card-chevron${isOpen?' open':''}"></i>
        </div>
      </div>
      <div class="cont-alert-card-body" style="display:${isOpen?'':'none'};">
        <div style="overflow-x:auto;">
          <table class="cont-alert-table">
            <thead><tr>${cfg.cols.map(col=>`<th>${col}</th>`).join('')}</tr></thead>
            <tbody>
              ${list.map(c=>`<tr>${cfg.row(c)}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    wrap.append(div);
  });
}

function _toggleContAlertCard(headEl){
  const body = headEl.closest('.cont-alert-card').querySelector('.cont-alert-card-body');
  const chevron = headEl.querySelector('.cont-alert-card-chevron');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : '';
  chevron.classList.toggle('open', !isOpen);
}

function renderContracts(){
  if(!document.getElementById('cont-list-section')) return;
  // 고객사 선택 여부와 무관하게 상단 배너 항상 갱신
  _renderContractsBanners();

  // 고객사 미선택 시 목록 숨김
  if(!currentContCompanyId){
    document.getElementById('cont-list-section').style.display='none';
    return;
  }
  document.getElementById('cont-list-section').style.display='block';

  // ── 알림 카드 렌더링 ──
  _renderContAlertCards();

  const q=(document.getElementById('cont-search')?.value||'').toLowerCase();
  const filterEmpCat=(document.getElementById('cont-filter-empcat')?.value||'');
  const filterStatus=Array.from(document.querySelectorAll('.cont-filter-status-cb:checked')).map(cb=>cb.value).filter(v=>v!=='전체');
  const filterDocsOnly=document.getElementById('cont-filter-docs-incomplete')?.checked||false;
  const filterById=(document.getElementById('cont-filter-id')?.value||'').trim();
  const today=new Date().toISOString().slice(0,10);

  // 알림 카드에서 관리되는 상태는 메인 테이블 기본 제외 (서류미비는 유효 계약이므로 메인 테이블에 포함)
  const ALERT_ONLY_LABELS = new Set(['임시저장','갱신예정','계약예정','해지예정']);

  let f=allContracts.filter(c=>{
    if(c.company_id!==currentContCompanyId) return false;
    // 계약서 고유 ID 검색 (독립적 — ID 입력 시 해당 계약만 표시)
    if(filterById && c.id !== filterById) return false;
    // 직원명 검색
    if(q&&!getEmpName(c.employee_id).toLowerCase().includes(q)) return false;
    // 고용형태 필터
    if(filterEmpCat){
      const emp=allEmployees.find(e=>e.id===c.employee_id);
      const empName = emp?.name || '';
      // 계약 유형은 c.contract_type 우선 (직원 카테고리와 다를 수 있음)
      const ctCat = c.contract_type || emp?.employment_category || '';
      // 대표자·등기임원·특수관계인: 실제 고용형태가 아닌 이름 매칭으로 필터
      if(filterEmpCat === 'representative'){
        const co2 = (allCompanies||[]).find(x => x.id === c.company_id);
        let reps2 = [];
        try { reps2 = typeof co2?.representatives === 'string' ? JSON.parse(co2.representatives) : (co2?.representatives || []); } catch(e){}
        if(!Array.isArray(reps2) || !reps2.some(r => r.name === empName)) return false;
      } else if(filterEmpCat === 'executive'){
        if(!(allExecutives||[]).some(e => e.company_id === c.company_id && e.name === empName)) return false;
      } else if(filterEmpCat === 'related_party'){
        if(!(allRelatedParties||[]).some(r => r.company_id === c.company_id && r.name === empName)) return false;
      } else {
        // 한글/영문 모두 매칭 (예: '계약직 수습' ↔ 'fixed_term_probation')
        if(ctCat !== filterEmpCat && ctCat !== CONTRACT_TYPE_LABEL[filterEmpCat] && CONTRACT_TYPE_LABEL[ctCat] !== filterEmpCat) return false;
      }
    }
    // 계약상태 필터 (다중 선택 — 하나라도 일치하면 통과)
    const {label, docsIncomplete} = calcContractStatusDisplay(c,today);
    if(filterStatus.length > 0){
      if(!filterStatus.includes(label)) return false;
    } else {
      // 필터 없음(전체): 알림 카드 전용 상태는 메인 테이블에서 제외
      if(ALERT_ONLY_LABELS.has(label)) return false;
    }
    // 서류미비만 보기 필터 (status가 서류미비이거나 실제 파일이 누락된 경우)
    if(filterDocsOnly && c.status !== CONTRACT_STATUS.DOCS_INCOMPLETE && !docsIncomplete) return false;
    return true;
  }).sort((a,b)=>getEmpName(a.employee_id).localeCompare(getEmpName(b.employee_id),'ko'));
  const paged=f.slice((pages.cont-1)*ITEMS,pages.cont*ITEMS);
  const tb=document.getElementById('cont-tbody');
  if(!f.length){tb.innerHTML='<tr><td colspan="10" class="empty-state">계약서가 없습니다</td></tr>';document.getElementById('cont-pagination').innerHTML='';return;}
  tb.innerHTML=paged.map(c=>{
    // ── 표시 상태 스마트 계산 ──
    const {badge:stBadge, label:stName, docsIncomplete} = calcContractStatusDisplay(c, today);
    const emp=allEmployees.find(e=>e.id===c.employee_id);
    // 계약 유형은 c.contract_type 우선 (직원의 현재 employment_category와 다를 수 있음)
    const ctRaw = c.contract_type || emp?.employment_category || '-';
    const empCat=typeof normalizeContractType === 'function' ? normalizeContractType(ctRaw) : ctRaw;
    const catBadge=CAT_BADGE_CLS[empCat]||'badge-gray';
    const isResigned = emp?.status===EMP_STATUS.RESIGNED && emp?.resign_date;
    // terminate_date가 있으면 모든 고용형태에서 우선 표시 (갱신/해지/퇴사)
    // contract_end는 최초 계약 당시의 원래 종료일로만 사용
    // 정규직 수습은 수습기간 만료일 = contract_end 이므로 별도 처리
    const periodTxt = c.terminate_date
      ? `${c.contract_start||'-'} ~ ${c.terminate_date}`
      : (empCat===CONTRACT_TYPE.REGULAR)
        ? (isResigned ? `${c.contract_start||'-'} ~ ${emp.resign_date}` : `${c.contract_start||'-'} ~ 현재`)
        : `${c.contract_start||'-'} ~ ${c.contract_end||'미정'}`;
    const isContDaily = empCat ===CONTRACT_TYPE.DAILY;
    const baseSalaryDisplay = isContDaily
      ? `<span style="font-size:11px;color:#9ca3af;">일급여</span> ${won(c.daily_wage||c.base_salary)}`
      : won(c.base_salary);
    // ── 서류미비 배지 (파기된 계약은 서류미비 관리 안 함) ──
    // ── 대표자·등기임원·특수관계인 추가 배지 ──
    const empName = emp?.name || '';
    let specialBadge = '';
    if(empName){
      // 대표자 확인
      const co = (allCompanies||[]).find(x => x.id === c.company_id);
      if(co){
        let reps = [];
        try { reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : (co.representatives || []); } catch(e){}
        if(Array.isArray(reps) && reps.some(r => r.name === empName)){
          specialBadge = `<span class="badge" style="background:#e5e7eb;color:#374151;margin-left:4px;">대표자</span>`;
        }
      }
      // 등기임원 확인
      if(!specialBadge && (allExecutives||[]).some(e => e.company_id === c.company_id && e.name === empName)){
        specialBadge = `<span class="badge" style="background:#e5e7eb;color:#374151;margin-left:4px;">등기임원</span>`;
      }
      // 특수관계인 확인
      if(!specialBadge && (allRelatedParties||[]).some(r => r.company_id === c.company_id && r.name === empName)){
        specialBadge = `<span class="badge" style="background:#e5e7eb;color:#374151;margin-left:4px;">특수관계인</span>`;
      }
    }
    return `<tr>
      <td style="font-weight:600">${getEmpName(c.employee_id)}</td>
      <td><span class="badge ${catBadge}">${contractTypeLabel(empCat)}</span>${specialBadge}</td>
      <td style="font-size:11.5px;${stName==='파기'?'text-decoration:line-through;color:#9ca3af;':''}">${periodTxt}</td>
      <td class="amount">${won(c.hourly_wage)}/h</td>
      <td class="amount-blue">${isContDaily ? '<span style="color:#9ca3af;font-size:11px;">-</span>' : won(c.annual_salary)}</td>
      <td class="amount">${baseSalaryDisplay}</td>
      <td style="color:#f59e0b;font-weight:600">${isContDaily ? '<span style="color:#9ca3af;font-size:11px;">-</span>' : won(c.weekly_holiday_pay)}</td>
      <td class="amount-green">${isContDaily ? '<span style="color:#9ca3af;font-size:11px;">-</span>' : won(c.monthly_salary_agreed)}</td>
      <td>
        ${docsIncomplete && stName !== '파기' ? `<span class="badge badge-orange">서류미비</span>` : `<span style="font-size:11px;color:#9ca3af;">-</span>`}
      </td>
      <td>
        <span class="badge ${stBadge}">${stName}</span>
      </td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-indigo" onclick="viewContract('${c.id}')"><i class="fas fa-search"></i> 조회</button>
        ${c.is_draft
          ? `<button class="btn btn-sm" disabled title="임시저장 상태에서는 출력할 수 없습니다"><i class="fas fa-file-contract"></i> 계약서</button>`
          : `<button class="btn btn-sm btn-indigo" onclick="openContractPrintModal('${c.id}')"><i class="fas fa-file-contract"></i> 계약서</button>`
        }
        ${docsIncomplete && stName !== '파기'
          ? `<button class="btn btn-sm btn-danger" onclick="openContractForUpload('${c.id}')"><i class="fas fa-upload"></i> 서류 업로드</button>`
          : ''
        }
        ${stName === '파기'
          ? `<button class="btn btn-sm btn-secondary" onclick="deleteContract('${c.id}')"><i class="fas fa-trash-alt"></i> 삭제</button>`
          : ''
        }
      </td>
    </tr>`;
  }).join('');
  renderPagination('cont-pagination',f.length,pages.cont,'setContPage');
}
function setContPage(p){pages.cont=p;renderContracts()}
function filterContracts(){pages.cont=1;renderContracts()}

// 개별 상태 체크박스 변경 시 전체 연동
function _onStatusFilterChange(){
  const allCbs = document.querySelectorAll('.cont-filter-status-cb');
  const allChecked = Array.from(allCbs).filter(c=>c.value!=='전체').every(c=>c.checked);
  const allCb = Array.from(allCbs).find(c=>c.value==='전체');
  if(allCb) allCb.checked = allChecked;
  filterContracts();
}

// 상태 필터 '전체' 토글 — 전체 선택 시 모든 항목 체크, 해제 시 유효만 선택
function _toggleAllStatus(cb){
  const allCbs = document.querySelectorAll('.cont-filter-status-cb');
  if(cb.checked){
    allCbs.forEach(c=>{c.checked=true;});
  } else {
    allCbs.forEach(c=>{c.checked=c.value==='유효';});
  }
  filterContracts();
}

// ── 계약서 고유 ID 클립보드 복사 ──
function _copyContractId(id){
  if(!id) return;
  navigator.clipboard.writeText(id).then(()=>{
    if(typeof toast === 'function') toast(`계약서 고유 ID가 복사되었습니다. (${id})`);
  }).catch(()=>{
    if(typeof toast === 'function') toast('복사에 실패했습니다.', 'error');
  });
}
// ── 계약 모달 유효성 검사 오류 초기화 ──
function _ctClearErrors(){
  document.querySelectorAll('#contract-modal .ct-field-error').forEach(el=>{
    el.classList.remove('ct-field-error');
  });
  const banner = document.getElementById('ct-validation-banner');
  if(banner) banner.style.display = 'none';
}

// ── 계약 시작일 ↔ 입사일 연동 ──
function _onCtHireChange(){
  const hireEl = document.getElementById('ct-em-hire');
  const startEl = document.getElementById('ct-em-start');
  const hintEl = document.getElementById('ct-em-start-hint');
  if(!startEl || !hintEl) return;
  if(hireEl && hireEl.value){
    startEl.disabled = false;
    startEl.style.background = '';
    startEl.style.color = '';
    startEl.style.cursor = '';
    // 입사일 변경 시 이미 입력된 계약 시작일도 재검증
    if(startEl.value){
      _validateCtStartVsHire('ct-em-start','ct-em-hire','ct-em-start-hint');
    } else {
      hintEl.style.color = '#6b7280';
      hintEl.textContent = '이 계약의 효력 발생일';
    }
    // 시작일 활성화 시 수습기간도 활성화 체크
    _updateProbationPeriodState();
  } else {
    startEl.disabled = true;
    startEl.value = '';
    startEl.style.background = '#f3f4f6';
    startEl.style.color = '#9ca3af';
    startEl.style.cursor = 'not-allowed';
    hintEl.style.color = '#9ca3af';
    hintEl.textContent = '입사일을 먼저 입력하세요.';
    // 시작일 비활성화 → 수습기간도 비활성화
    _disableProbationPeriod();
  }
}

// 수습기간 필드 활성화/비활성화 (계약 시작일 입력 여부 기준)
function _updateProbationPeriodState(){
  const startEl = document.getElementById('ct-em-start') || document.getElementById('ct-start');
  const startVal = startEl?.value;
  // 활성 섹션 기준으로 수습기간 요소 찾기 (신규 섹션 우선)
  const probMonEl = document.getElementById('ct-new-probation-months') || document.getElementById('ct-probation-months');
  if(!probMonEl) return;
  if(startVal){
    probMonEl.disabled = false;
    probMonEl.style.background = '';
    probMonEl.style.color = '';
    probMonEl.style.cursor = '';
  } else {
    _disableProbationPeriod();
  }
}

function _disableProbationPeriod(){
  const probMonEl = document.getElementById('ct-new-probation-months') || document.getElementById('ct-probation-months');
  if(!probMonEl) return;
  probMonEl.disabled = true;
  probMonEl.value = '';
  probMonEl.style.background = '#f3f4f6';
  probMonEl.style.color = '#9ca3af';
  probMonEl.style.cursor = 'not-allowed';
  // 계약 종료일도 초기화
  const endEl = document.getElementById('ct-new-end') || document.getElementById('ct-end');
  if(endEl) endEl.value = '';
}

function _validateCtStartVsHire(startId, hireId, hintId){
  const startEl = document.getElementById(startId);
  const hireEl = document.getElementById(hireId);
  const hintEl = document.getElementById(hintId);
  if(!startEl || !hireEl || !hintEl) return true;
  const start = startEl.value;
  const hire  = hireEl.value;
  if(!start || !hire){ startEl.style.borderColor = ''; startEl.style.background = ''; return true; }
  if(start < hire){
    startEl.style.borderColor = '#e94560';
    startEl.style.background = '#fef2f2';
    hintEl.style.color = '#dc2626';
    hintEl.innerHTML = '<i class=\"fas fa-exclamation-triangle\"></i> 계약 시작일은 입사일(' + hire + ')보다 이전일 수 없습니다.';
    return false;
  } else {
    startEl.style.borderColor = '';
    startEl.style.background = '';
    hintEl.style.color = '#6b7280';
    hintEl.textContent = '이번 계약의 효력 발생일 — 급여항목·계약 기간 기준.';
    return true;
  }
}

function openContractModal(id=null, preCompanyId=null){
  editId.contract=id;
  _recontractEmpId = null; // 재계약 플래그 초기화
  if(!id) _currentDraftId = null; // 신규 작성 시 임시저장 ID 초기화
  // 임시저장 안내 텍스트 초기화
  const _draftInfoEl = document.getElementById('ct-draft-saved-info');
  if(_draftInfoEl){ _draftInfoEl.style.display='none'; _draftInfoEl.textContent=''; }
  const isNew = !id;
  document.getElementById('ct-title').textContent = isNew ? '근로계약서 추가' : '계약서 수정';
  // 단계 표시바: 작성/수정 모드에서만 표시
  const _stepBar = document.getElementById('ct-step-bar');
  if(_stepBar){ _stepBar.style.display = ''; setContractStep(1); }
  // 편집/추가 모드: 조회 액션 바 숨김, 편집 footer 표시, 일괄설정 바 표시
  document.getElementById('ct-footer-edit').style.display = '';
  document.getElementById('ct-action-bar-top').style.display = 'none';
  document.getElementById('ct-action-bar-bottom').style.display = 'none';
  const _bulkBar = document.getElementById('ct-bulk-bar-wrap');
  if(_bulkBar) _bulkBar.style.display = '';
  document.getElementById('ct-terminate-panel').style.display = 'none';
  document.getElementById('ct-renew-panel').style.display = 'none';
  // 신규 등록/수정 모드: 첨부서류 섹션 숨김 (계약 등록 후 별도 업로드)
  const _filesSectionInit = document.getElementById('ct-files-section');
  if(_filesSectionInit) _filesSectionInit.style.display = 'none';
  const _amendPanelInit = document.getElementById('ct-amend-panel');
  if(_amendPanelInit) _amendPanelInit.style.display = 'none';
  const _cftPanelInit = document.getElementById('ct-fixed-terminate-panel');
  if(_cftPanelInit) _cftPanelInit.style.display = 'none';
  // amend 모드 플래그 초기화
  window._isAmendMode = false;
  // 통합 상태 배너 초기화
  _resetStatusBanner();
  // readonly 클래스 제거 + 모든 필드 활성화
  const modalEl = document.querySelector('#contract-modal .modal');
  modalEl.classList.remove('ct-readonly');
  modalEl.querySelectorAll('input,select,textarea').forEach(el=>{
    // 성별 필드는 항상 readonly (주민번호 자동설정 전용)
    if(el.id === 'ct-em-gender' || el.id === 'ct-edit-em-gender') return;
    el.disabled = false;
    el.tabIndex = 0;
    el.style.pointerEvents = '';
    el.style.background = '';
    el.style.color = '';
    el.style.cursor = '';
  });
  // 지급유형 버튼 + 휴게시간 추가 버튼 재활성화 (신규/수정 모드)
  modalEl.querySelectorAll('.modal-body .pi-pay-type-btn').forEach(btn=>{
    btn.disabled = false; btn.style.cursor = ''; btn.style.pointerEvents = '';
  });
  modalEl.querySelectorAll('.modal-body .btn-brk-add').forEach(btn=>{
    btn.disabled = false; btn.style.cursor = ''; btn.style.pointerEvents = '';
  });
  ['ct-start','ct-end','ct-annual-sal','ct-base','ct-note','ct-pay-period','ct-pay-period-month-hidden','ct-pay-period-day-hidden','ct-pay-day'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
  { const _tdEl=document.getElementById('ct-terminate-display'); if(_tdEl) _tdEl.value=''; }
  { const _trEl=document.getElementById('ct-row-terminate'); if(_trEl) _trEl.style.display='none'; }
  { const _vdEl=document.getElementById('ct-voided-display'); if(_vdEl) _vdEl.value=''; }
  { const _vrEl=document.getElementById('ct-row-voided'); if(_vrEl) _vrEl.style.display='none'; }
  { const _ppRow=document.getElementById('ct-row-probation-period'); if(_ppRow) _ppRow.style.display='none'; }
  ['ct-pay-period-month','ct-pay-period-day'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
  const _ppHint = document.getElementById('ct-pay-period-hint'); if(_ppHint) _ppHint.textContent='';
  document.getElementById('ct-annual').value=15;
  // 요일별 스케줄 테이블 초기화 (기본값: 월~금 09:00~18:00, 휴게 1h)
  initScheduleTable();
  document.getElementById('ct-annual-sal').value='';
  setAmountVal('ct-position',0);
  setAmountVal('ct-car',0); setAmountVal('ct-remote-area',0);
  setAmountVal('ct-meal',0); setAmountVal('ct-research',0);
  setAmountVal('ct-site',0); setAmountVal('ct-skill',0); setAmountVal('ct-license',0);
  setAmountVal('ct-communication',0); setAmountVal('ct-fitness',0);
  setAmountVal('ct-self-dev',0); setAmountVal('ct-book',0); setAmountVal('ct-overseas',0);
  setAmountVal('ct-regular-bonus',0);
  setAmountVal('ct-childcare',0); { const _ccDep=document.getElementById('ct-childcare-dependents'); if(_ccDep) _ccDep.value=0; }
  setAmountVal('ct-hourly-input',0);
  // 고정 연장/야간/휴일근로수당 초기화
  setAmountVal('ct-fixed-ot-pay',    0); setAmountVal('ct-fixed-night-pay', 0); setAmountVal('ct-fixed-hol-pay',   0);
  { const _foh=document.getElementById('ct-fixed-ot-hours');    if(_foh) _foh.value=''; }
  { const _fnh=document.getElementById('ct-fixed-night-hours'); if(_fnh) _fnh.value=''; }
  { const _fhh=document.getElementById('ct-fixed-hol-hours');   if(_fhh) _fhh.value=''; }
  _resetCTPayTypes();
  // 모달 초기화: _CT_OPT_ROWS 전체 숨김 리셋 (이전 모달 상태 잔재 제거)
  // applyCTAllowanceConfig가 이후에 고객사 설정에 따라 개별 show 처리
  if(typeof _CT_OPT_ROWS !== 'undefined'){
    _CT_OPT_ROWS.forEach(({rowId})=>{ const el=document.getElementById(rowId); if(el) el.style.display='none'; });
  }
  document.getElementById('ct-type').value='정규직';
  document.getElementById('ct-status').value=CONTRACT_STATUS.ACTIVE;toggleCtEndDate();
  document.getElementById('ct-monthly-computed').textContent='0원';document.getElementById('ct-weekly-hol-computed').textContent='0원';

  // 신규 직원 섹션 초기화
  ['ct-em-empno','ct-em-name','ct-em-id','ct-em-dept','ct-em-position','ct-em-job','ct-em-hire','ct-em-start','ct-em-expire','ct-em-phone','ct-em-email','ct-em-address'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
  const _emDepEl=document.getElementById('ct-em-dependents'); if(_emDepEl) _emDepEl.value=1;
  document.getElementById('ct-em-gender').value='남';
  document.getElementById('ct-em-category').value='';toggleEmExpire();toggleAnnualSal();toggleProbation();
  // 수정 직원 섹션 초기화
  ['ct-edit-em-empno','ct-edit-em-job','ct-edit-em-dept','ct-edit-em-position','ct-edit-em-hire','ct-edit-em-expire','ct-edit-em-id','ct-edit-em-phone','ct-edit-em-email','ct-edit-em-address','ct-edit-em-bank','ct-edit-em-account'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
  const editCatEl=document.getElementById('ct-edit-em-category');if(editCatEl)editCatEl.value='';
  const editGenderEl=document.getElementById('ct-edit-em-gender');if(editGenderEl)editGenderEl.value='남';
  const editDepEl=document.getElementById('ct-edit-em-dependents');if(editDepEl)editDepEl.value=1;
  document.getElementById('ct-probation-months').value='3';
  document.getElementById('ct-probation-pct').value='';
  document.getElementById('ct-probation-amt').value='';
  
  document.getElementById('ct-em-name-dup-alert').style.display='none';
  const _editNameDupAlert = document.getElementById('ct-edit-em-name-dup-alert');
  if(_editNameDupAlert) _editNameDupAlert.style.display='none';
  const _repRowNew = document.getElementById('ct-em-rep-self-row');
  const _repRowEdit = document.getElementById('ct-edit-em-rep-self-row');
  if(_repRowNew) _repRowNew.style.display = 'none';
  if(_repRowEdit) _repRowEdit.style.display = 'none';
  const _empnoAlertNew  = document.getElementById('ct-em-empno-alert');      if(_empnoAlertNew)  _empnoAlertNew.style.display='none';
  const _empnoAlertEdit = document.getElementById('ct-edit-em-empno-alert'); if(_empnoAlertEdit) _empnoAlertEdit.style.display='none';

  // 계약 시작일·종료일·고용형태·계약상태는 수정 모드 섹션 내부에 있으므로
  // ct-edit-emp-info 섹션의 show/hide로 자동 제어됨

  if(isNew){
    // 신규: 첨부서류 파일 전역변수 초기화 (이전 조회 계약의 파일 잔재 방지)
    if(typeof _resetUploadState === 'function') _resetUploadState();
    // 신규: 고객사 프리셋 지원, 신규 직원 입력 섹션 표시
    document.getElementById('ct-company').value = preCompanyId || '';
    { const _co = preCompanyId ? (allCompanies||[]).find(x=>x.id===preCompanyId) : null;
      const _nameEl = document.getElementById('ct-company-name'); if(_nameEl) _nameEl.textContent = _co?.company_name || ''; }
    // 고객사 급여산정기간·급여일 기본값 자동 채움
    if(preCompanyId){ _autoFillCTPeriod(); _setCtPayDayDefault(preCompanyId); _suggestEmpNo(preCompanyId); }
    // 신규 모드: 프리셋 고객사의 allowance_config 적용 (값 초기화 포함)
    { const _newCo = preCompanyId ? (allCompanies||[]).find(x=>x.id===preCompanyId) : null;
      let _newCfg = _newCo?.allowance_config ?? null;
      if(typeof _newCfg === 'string'){ try{ _newCfg = JSON.parse(_newCfg); }catch(e){ _newCfg = {}; } }
      applyCTAllowanceConfig(_newCfg, true); }
    document.getElementById('ct-new-emp-section').style.display = 'block';
    document.getElementById('ct-edit-emp-info').style.display = 'none';
    // 계약 시작일: 입사일 입력 전까지 비활성화
    const _startNew = document.getElementById('ct-em-start');
    const _hintNew = document.getElementById('ct-em-start-hint');
    if(_startNew){ _startNew.disabled = true; _startNew.value = ''; }
    if(_hintNew){ _hintNew.style.color = '#9ca3af'; _hintNew.textContent = '입사일을 먼저 입력하세요.'; }
    document.getElementById('ct-title').textContent = '근로계약서 추가';
  } else {
    // 수정: 기존 직원 정보 표시, 신규 입력 섹션 숨김 (draft도 employee_id 있으므로 정상 동작)
    document.getElementById('ct-new-emp-section').style.display = 'none';
    document.getElementById('ct-edit-emp-info').style.display = 'block';
    const c = allContracts.find(x => x.id === id);
    if(c){
      // 계약예정 여부 — 이하 여러 곳에서 공통 사용
      const _isPendingCt = (c.status===CONTRACT_STATUS.PENDING);
      // 직원 정보 표시·편집 필드 채우기
      const emp = allEmployees.find(e=>e.id===c.employee_id);
      document.getElementById('ct-edit-emp-name').value = emp ? emp.name : '';
      if(emp){
        document.getElementById('ct-edit-em-gender').value    = emp.gender || '남';
        // 계약예정 상태이면 수습 카테고리 정규화 (예: '계약직 수습' → '계약직')
        const _empCatRaw = emp.employment_category || '';
        const _empCatKorean = contractTypeLabel(_empCatRaw) || '-';
        const _isPendingDisplay = _isPendingCt;
        document.getElementById('ct-edit-em-category').value = _isPendingDisplay
          ? (_empCatRaw ===CONTRACT_TYPE.REGULAR_PROBATION ? '정규직' : _empCatRaw ===CONTRACT_TYPE.FIXED_PROBATION ? '계약직' : _empCatKorean)
          : _empCatKorean;
        document.getElementById('ct-edit-em-job').value       = emp.job_description || '';
        document.getElementById('ct-edit-em-dept').value      = emp.department || '';
        document.getElementById('ct-edit-em-position').value  = emp.position || '';
        // 입사일: 동일 직원의 가장 앞선 계약 시작일을 상속 (emp.hire_date 폴백)
        const _earliestStart = getEarliestContractStart(emp.id);
        document.getElementById('ct-edit-em-hire').value = _earliestStart || emp.hire_date || '';
        document.getElementById('ct-edit-em-expire').value    = emp.expire_date || emp.resign_date || '';
        document.getElementById('ct-edit-em-id').value        = emp.id_number || '';
        const _editDepEl2=document.getElementById('ct-edit-em-dependents'); if(_editDepEl2) _editDepEl2.value= (emp.dependents ?? 0) < 1 ? 1 : emp.dependents;
        document.getElementById('ct-edit-em-phone').value     = emp.phone || '';
        document.getElementById('ct-edit-em-email').value     = emp.email || '';
        document.getElementById('ct-edit-em-address').value   = emp.address || '';
        document.getElementById('ct-edit-em-bank').value      = emp.bank_name || '';
        document.getElementById('ct-edit-em-account').value   = emp.bank_account || '';
        const _empnoEl = document.getElementById('ct-edit-em-empno'); if(_empnoEl) _empnoEl.value = emp.employee_number || '';
        const _editRepChk = document.getElementById('ct-edit-em-is-rep');
        if(_editRepChk) _editRepChk.checked = emp.is_representative ? true : false;
      }
      document.getElementById('ct-company').value=c.company_id||'';
      { const _co = c.company_id ? (allCompanies||[]).find(x=>x.id===c.company_id) : null;
        const _nameEl = document.getElementById('ct-company-name'); if(_nameEl) _nameEl.textContent = _co?.company_name || ''; }
      // 수정 모드: 계약 체결 시점의 고객사 allowance_config 적용 (getCompanySnapshotAt)
      { const _ctStartTs = c.contract_start ? new Date(c.contract_start).getTime() : 0;
        const _editCo = getCompanySnapshotAt(c.company_id||'', _ctStartTs);
        let _editCfg = _editCo?.allowance_config ?? null;
        if(typeof _editCfg === 'string'){ try{ _editCfg = JSON.parse(_editCfg); }catch(e){ _editCfg = {}; } }
        applyCTAllowanceConfig(_editCfg); }
      document.getElementById('ct-start').value=c.contract_start||'';
      // 고용형태: c.contract_type 우선 참조 (채용확정 생성 계약예정은 c.contract_type이 실제 유형)
      // 계약예정 상태인 경우 수습 카테고리 정규화 (예: '계약직 수습' → '계약직')
      const _ctValRaw = c.contract_type || (emp ? emp.employment_category : '') || '정규직';
      const ctVal = _isPendingCt
        ? (_ctValRaw ===CONTRACT_TYPE.REGULAR_PROBATION ? '정규직' : _ctValRaw ===CONTRACT_TYPE.FIXED_PROBATION ? '계약직' : _ctValRaw)
        : _ctValRaw;
      document.getElementById('ct-type').value=ctVal; toggleCtEndDate(true);
      document.getElementById('ct-status').value=c.status||CONTRACT_STATUS.ACTIVE;
      // 계약직/일용직: 입사일·퇴사예정일 행 숨김 (계약 시작일·종료일과 동일하므로 중복)
      // 정규직/정규직 수습: 무기한 계약이므로 퇴사예정일 행 숨김
      const isFixedType  = (ctVal===CONTRACT_TYPE.FIXED||ctVal===CONTRACT_TYPE.FIXED_PROBATION||ctVal===CONTRACT_TYPE.DAILY);
      const isRegularType= (ctVal===CONTRACT_TYPE.REGULAR||ctVal===CONTRACT_TYPE.REGULAR_PROBATION);
      // 계약 종료일: 항상 원래 contract_end를 표시 (terminate_date로 덮어쓰지 않음)
      const hasTermDate = !!(c.terminate_date);
      const isTerminatedOrPending = (c.status===CONTRACT_STATUS.TERMINATED || c.status===CONTRACT_STATUS.TERMINATE_PENDING);
      document.getElementById('ct-end').value = c.contract_end||'';
      // 계약 해지일 행: terminate_date가 있을 때만 표시 (해지 상태인데 null이면 contract_end로 폴백)
      const termRowEl = document.getElementById('ct-row-terminate');
      const termDispEl = document.getElementById('ct-terminate-display');
      if(termRowEl && termDispEl){
        const _effectiveTermDate = c.terminate_date || (isTerminatedOrPending ? c.contract_end : '');
        if(_effectiveTermDate){
          termRowEl.style.display = '';
          termDispEl.value = _effectiveTermDate;
        } else {
          termRowEl.style.display = 'none';
        }
      }
      // 계약 파기일 행: is_voided_by_amend인 경우 표시
      const voidedRowEl = document.getElementById('ct-row-voided');
      const voidedDispEl = document.getElementById('ct-voided-display');
      if(voidedRowEl && voidedDispEl){
        if(c.is_voided_by_amend && c.voided_at){
          voidedRowEl.style.display = '';
          voidedDispEl.value = new Date(c.voided_at).toLocaleString('ko-KR');
        } else {
          voidedRowEl.style.display = 'none';
        }
      }
      const hireRowEl   = document.getElementById('ct-edit-row-hire');
      const expireRowEl = document.getElementById('ct-edit-row-expire');
      const endRowEl    = document.getElementById('ct-row-end');
      // 입사일은 고용형태 무관하게 항상 표시
      if(hireRowEl)   hireRowEl.style.display   = '';
      // 정규직이면 퇴사예정일 숨김, 계약직이면 입사일과 함께 숨김 (종료일과 동일)
      if(expireRowEl) expireRowEl.style.display  = (isFixedType || isRegularType) ? 'none' : '';
      // 계약 종료일 행: 정규직(수습 제외)만 숨김 (기간의 정함 없음)
      // 정규직 수습은 수습기간 만료일 = 계약 종료일이므로 표시됨
      const isRegularNoProbation = ctVal === CONTRACT_TYPE.REGULAR;
      if(endRowEl){
        if(isRegularNoProbation){
          endRowEl.style.display = 'none';
        } else {
          endRowEl.style.display = '';
          const endLabel = endRowEl.querySelector('label');
          if(endLabel){
            endLabel.innerHTML = '계약 종료일 <span id="ct-end-required" style="color:#c00;font-weight:900;font-size:13px;margin-left:1px;display:none;">*</span>';
          }
        }
      }
      // 계약유형에 따라 연봉 행 표시 제어
      // ctVal = emp.employment_category || c.contract_type (위 5920줄에서 이미 결정된 값)
      const isRegEdit  = ctVal===CONTRACT_TYPE.REGULAR || ctVal===CONTRACT_TYPE.REGULAR_PROBATION;
      const isProbEdit = ctVal===CONTRACT_TYPE.REGULAR_PROBATION || ctVal===CONTRACT_TYPE.FIXED_PROBATION;
      const isDailyEdit= ctVal===CONTRACT_TYPE.DAILY;
      const rowM=document.getElementById('ct-row-monthly');
      if(rowM) rowM.style.display=isRegEdit?'':'none';
      // 연봉 섹션 (연봉 필드 포함)
      ['ct-row-salary-period','ct-row-annual-sal'].forEach(id=>{
        const el=document.getElementById(id); if(el) el.style.display=isRegEdit?'':'none';
      });
      // 일용직 조건부 필드
      const rowDaysE = document.getElementById('ct-row-days');
      const rowAnnualE = document.getElementById('ct-row-annual');
      const rowBaseE = document.getElementById('ct-row-base');
      const rowWeeklyHolE = document.getElementById('ct-row-weekly-hol');
      const rowDailyWageE = document.getElementById('ct-row-daily-wage');
      if(rowDaysE) rowDaysE.style.display = isDailyEdit ? 'none' : '';
      if(rowAnnualE) rowAnnualE.style.display = isDailyEdit ? 'none' : '';
      if(rowBaseE) rowBaseE.style.display = isDailyEdit ? 'none' : '';
      if(rowWeeklyHolE) rowWeeklyHolE.style.display = isDailyEdit ? 'none' : '';
      if(rowDailyWageE) rowDailyWageE.style.display = isDailyEdit ? '' : 'none';
      // 수습 섹션 복원
      const probSec=document.getElementById('ct-probation-section');
      const probPeriodRow=document.getElementById('ct-row-probation-period');
      if(probSec) probSec.style.display=isProbEdit?'':'none';
      if(probPeriodRow) probPeriodRow.style.display=isProbEdit?'':'none';
      if(isProbEdit){
        const _probMonEl = document.getElementById('ct-probation-months') || document.getElementById('ct-new-probation-months');
        if(_probMonEl) _probMonEl.value = c.probation_months||'';
        document.getElementById('ct-probation-pct').value=c.probation_pct||'';
        document.getElementById('ct-probation-amt').value=c.probation_amt||'';
        // 산정기준 라디오 복원
        const _basis = c.probation_basis || 'salary';
        const _rbEl = document.querySelector(`input[name="ct-probation-basis"][value="${_basis}"]`);
        if(_rbEl){ _rbEl.checked = true; }
        onProbationBasisChange();
        // 수습 계약: 계약 종료일 readonly + 힌트
        if(typeof _setProbationEndReadonly === 'function') _setProbationEndReadonly(true);
      }
      // 연차일수: 저장된 값 복원 후 자동계산으로 힌트 표시 (입사일 복원 후 호출)
      document.getElementById('ct-annual').value=c.annual_leave_days||15;
      // 요일별 스케줄 복원: schedule_json 우선, 없으면 레거시 필드로 변환
      if(c.schedule_json){
        try{ setScheduleFromJSON(JSON.parse(c.schedule_json)); }
        catch(e){ setScheduleFromLegacy(c); }
      } else {
        setScheduleFromLegacy(c);
      }
      // ct-annual-sal: 정규직→연봉, 계약직→월약정급여, 일용직→0
      {
        const _isFixedEditLoad = ctVal===CONTRACT_TYPE.FIXED || ctVal===CONTRACT_TYPE.FIXED_PROBATION;
        if(isDailyEdit){
          setAmountVal('ct-annual-sal', 0);
        } else if(_isFixedEditLoad){
          setAmountVal('ct-annual-sal', c.monthly_salary_agreed||0);
        } else {
          setAmountVal('ct-annual-sal', c.annual_salary||0);
        }
      }

      if(isDailyEdit){
        setAmountVal('ct-daily-wage', c.daily_wage||c.base_salary||0);
        setAmountVal('ct-base', 0);
      } else {
        setAmountVal('ct-base', c.base_salary);
        const dwEl = document.getElementById('ct-daily-wage'); if(dwEl) dwEl.value='';
      }
      setAmountVal('ct-position',    c.position_allowance||0);
      // 차량지원비 = 구 교통비 + 구 자가운전보조금 합산 (레거시 데이터 하위호환)
      setAmountVal('ct-car', (parseFloat(c.transportation_allowance||c.car_maintenance||0)) + (parseFloat(c.self_driving_allowance||0)));
      setCTPayType('car', c.transportation_pay_type||c.self_driving_pay_type||'fixed');
      setAmountVal('ct-remote-area', c.remote_area_allowance||0);
      // remote-area는 통상임금 항상 포함 — pay_type 세팅 불필요
      setAmountVal('ct-meal',        c.meal_allowance||200000);
      setCTPayType('meal',           c.meal_pay_type||'fixed');
      setAmountVal('ct-research',    c.research_allowance||0);
      setCTPayType('research',       c.research_pay_type||'fixed');
      setAmountVal('ct-site',        c.site_allowance||0);
      setAmountVal('ct-skill',       c.skill_allowance||0);
      setAmountVal('ct-license',     c.license_allowance||0);
      setAmountVal('ct-communication',c.communication_allowance||0);
      setCTPayType('communication',  c.communication_pay_type||'fixed');
      setAmountVal('ct-fitness',     c.fitness_allowance||0);
      setCTPayType('fitness',        c.fitness_pay_type||'fixed');
      setAmountVal('ct-self-dev',    c.self_dev_allowance||0);
      setCTPayType('self_dev',       c.self_dev_pay_type||'fixed');
      setAmountVal('ct-book',        c.book_allowance||0);
      setCTPayType('book',           c.book_pay_type||'fixed');
      setAmountVal('ct-overseas',    c.overseas_allowance||0);
      setCTPayType('overseas',       c.overseas_pay_type||'fixed');
      setAmountVal('ct-regular-bonus', c.regular_bonus||0);
      // 보육수당 복원
      setAmountVal('ct-childcare', c.childcare_allowance||0);
      { const _ccDep=document.getElementById('ct-childcare-dependents'); if(_ccDep) _ccDep.value=c.childcare_dependents||0; }
      // 급여 산정기간 복원
      _ctPeriodRestore(c.pay_period||'', c.pay_period_month||null, c.pay_period_day!=null?c.pay_period_day:null);
      const _pdEl = document.getElementById('ct-pay-day');
      if(_pdEl) _pdEl.value = (typeof c.pay_day === 'number' || /^\d+$/.test(c.pay_day)) ? c.pay_day : '';
      _autoFillCTPeriod(); // 힌트 갱신
      // 계약에 급여일이 없으면 고객사 기본값으로 채움
      _setCtPayDayDefault(c.company_id);
      // DB에 값이 있는 항목은 allowance_config와 무관하게 강제 노출 (하위호환)
      _forceShowNonZeroCTRows(c);
      document.getElementById('ct-note').value=c.note||'';
      document.getElementById('ct-monthly-computed').textContent=won(c.monthly_salary_agreed);
      document.getElementById('ct-weekly-hol-computed').textContent=won(c.weekly_holiday_pay);
      setAmountVal('ct-hourly-input', c.hourly_wage||0);
      // 고정 연장/야간/휴일근로수당 복원
      setAmountVal('ct-fixed-ot-pay',    c.fixed_ot_pay   ||0);
      setAmountVal('ct-fixed-night-pay', c.fixed_night_pay||0);
      setAmountVal('ct-fixed-hol-pay',   c.fixed_hol_pay  ||0);
      const _fotH = document.getElementById('ct-fixed-ot-hours');    if(_fotH)    _fotH.value    = c.fixed_ot_hours   ||'';
      const _fniH = document.getElementById('ct-fixed-night-hours'); if(_fniH)    _fniH.value    = c.fixed_night_hours||'';
      const _fhoH = document.getElementById('ct-fixed-hol-hours');   if(_fhoH)    _fhoH.value    = c.fixed_hol_hours  ||'';
      // ── 연봉/월약정급여 섹션 표시 최종 강제 적용 (ctVal 기준 — emp.employment_category 우선) ──
      const isFixedEdit2 = ctVal===CONTRACT_TYPE.FIXED || ctVal===CONTRACT_TYPE.FIXED_PROBATION;
      const showSalRow = isRegEdit || isFixedEdit2;
      ['ct-row-salary-period','ct-row-annual-sal'].forEach(sid=>{
        const el=document.getElementById(sid); if(el) el.style.display=showSalRow?'':'none';
      });
      if(isRegEdit){
        setAmountVal('ct-annual-sal', c.annual_salary||0);
      } else if(isFixedEdit2){
        // 계약직: ct-annual-sal에 월약정급여(monthly_salary_agreed) 복원
        setAmountVal('ct-annual-sal', c.monthly_salary_agreed||0);
      }
    }
    // 수정(amend) 모드: 이름·고용형태 편집 가능, 갱신/재계약 모드는 openRecontractModal에서 잠금
    _setEditNameCategoryLock(false);
    // _prevEditCategory 초기화 (모달 열릴 때 즉시 Alert 방지)
    _prevEditCategory = document.getElementById('ct-edit-em-category')?.value || '';
    // 수정 모드: 데이터 복원 완료 후 연차일수 자동계산 힌트 표시
    autoFillAnnualLeave();
  }
  // 신규 모드: 힌트 초기화
  if(isNew){ const h=document.getElementById('ct-annual-hint'); if(h) h.style.display='none'; }
  // 모달 열릴 때 이전 오류 상태 초기화
  _ctClearErrors();
  // 신규 모드: 등록 버튼 초기 비활성화 상태 세팅
  _checkRegisterBtnState();
  openModal('contract-modal');

  // 입력 수정 시 해당 필드 하이라이트 자동 해제
  const _modalEl = document.getElementById('contract-modal');
  _modalEl.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input',  _ctClearFieldError, { once: false });
    el.addEventListener('change', _ctClearFieldError, { once: false });
  });
}
function _ctClearFieldError(e){
  const fg = e.target.closest('.form-group');
  if(fg && fg.classList.contains('ct-field-error')){
    fg.classList.remove('ct-field-error');
  }
}
function onCtEmployeeChange(){/* 직원 드롭다운 제거됨 - 신규 직원 섹션 항상 표시(신규 모드) */}

// ─── 수정 모드 이름·고용형태 잠금 제어 ────────────────────────────────────
/**
 * 갱신·재계약 모드: 이름·주민번호·성별 readonly 잠금
 * 수정(amend) 모드: 이름·고용형태 모두 편집 가능
 * @param {boolean} lock  true = 잠금(갱신·재계약), false = 편집 가능(수정)
 */
// ─── 수정 모드 고용형태 변경 핸들러 ────────────────────────────────────────
// 이전 고용형태 값 추적 (Alert 판별용)
let _prevEditCategory = '';

function _onEditCategoryChange() {
  // ct-edit-em-category 변경 시 ct-type(hidden)도 동기화하여 toggleAnnualSal 등 연동
  const catEl = document.getElementById('ct-edit-em-category');
  const typeEl = document.getElementById('ct-type');
  if(!catEl || !typeEl) return;
  const newCat = catEl.value;
  const newCatNorm = CONTRACT_TYPE_LEGACY_MAP[newCat] || newCat;
  const prevCat = _prevEditCategory;

  // ── 예외 그룹: Alert·초기화 불필요 ──
  // - 정규직 ↔ 정규직 수습
  // - 계약직 ↔ 계약직 수습
  const _sameGroup = (a, b) => {
    const regGroup   = ['정규직', '정규직 수습'];
    const fixedGroup = ['계약직', '계약직 수습'];
    return (regGroup.includes(a) && regGroup.includes(b)) ||
           (fixedGroup.includes(a) && fixedGroup.includes(b));
  };

  // 이전 값이 있고, 그룹이 달라졌을 때 → Alert + 임금 초기화
  if(prevCat && prevCat !== newCat && !_sameGroup(prevCat, newCat)){
    alert('고용형태 변경 시 임금 조건 입력항목이 초기화되니 유의하세요.');
    _resetWageInputs();
  }

  // 현재 값을 다음 변경 감지용으로 저장
  _prevEditCategory = newCat;

  typeEl.value = newCat;
  // 임금조건 섹션 연동
  toggleAnnualSal();
  // 계약 종료일 행 표시 제어
  toggleCtEndDate(true);
  // 수습 섹션 제어 (ct-em-category가 아닌 ct-type을 보는 toggleProbation 우회)
  const isProbation = (newCatNorm ===CONTRACT_TYPE.REGULAR_PROBATION || newCatNorm ===CONTRACT_TYPE.FIXED_PROBATION);
  const probSec = document.getElementById('ct-probation-section');
  const probPeriodRow = document.getElementById('ct-row-probation-period');
  if(probSec) probSec.style.display = isProbation ? '' : 'none';
  if(probPeriodRow) probPeriodRow.style.display = isProbation ? '' : 'none';
  // 수습 계약: 계약 종료일 readonly + 힌트
  if(typeof _setProbationEndReadonly === 'function') _setProbationEndReadonly(isProbation);
  if(isProbation && typeof _autoCalcProbationEndDate === 'function') _autoCalcProbationEndDate();
  // 입사일·퇴사예정일 행 표시 제어
  const isFixed   = (newCatNorm ===CONTRACT_TYPE.FIXED || newCatNorm ===CONTRACT_TYPE.FIXED_PROBATION || newCatNorm ===CONTRACT_TYPE.DAILY);
  const isRegular = (newCatNorm ===CONTRACT_TYPE.REGULAR || newCatNorm ===CONTRACT_TYPE.REGULAR_PROBATION);
  const hireRowEl   = document.getElementById('ct-edit-row-hire');
  const expireRowEl = document.getElementById('ct-edit-row-expire');
  if(hireRowEl)   hireRowEl.style.display   = '';
  if(expireRowEl) expireRowEl.style.display  = (isFixed || isRegular) ? 'none' : '';
}

// 임금 조건 입력항목 일괄 초기화 (고용형태 변경 시 호출)
function _resetWageInputs(){
  // 연봉·월약정급여·기본급·일급
  ['ct-annual-sal','ct-base','ct-daily-wage'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  // 수당 전체
  ['ct-position','ct-car','ct-remote-area','ct-meal','ct-research',
   'ct-site','ct-skill','ct-license','ct-communication','ct-fitness',
   'ct-self-dev','ct-book','ct-overseas','ct-other'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  // 자동계산 표시값 초기화
  ['ct-monthly-computed','ct-weekly-hol-computed'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.textContent = '0원';
  });
  setAmountVal('ct-hourly-input', 0);
}

// lock     : 이름·주민번호·성별·사원번호 잠금 여부 (수정=false, 갱신·재계약=true)
// lockCat  : 고용형태 잠금 여부 (기본값 = lock과 동일 — 하위 호환)
//            재계약도 고용형태는 변경 가능하므로 false로 호출
function _setEditNameCategoryLock(lock, lockCat = lock) {
  const nameEl     = document.getElementById('ct-edit-emp-name');
  const catEl      = document.getElementById('ct-edit-em-category');
  const idEl       = document.getElementById('ct-edit-em-id');
  const genderEl   = document.getElementById('ct-edit-em-gender');
  const empnoEl    = document.getElementById('ct-edit-em-empno');
  const nameLock   = document.getElementById('ct-edit-name-lock-hint');
  const catLock    = document.getElementById('ct-edit-category-lock-hint');

  // 이름·주민번호·성별·사원번호: lock 적용
  if(nameEl)   { nameEl.readOnly   = lock;    nameEl.style.background   = lock    ? '#f3f4f6' : ''; nameEl.style.color    = lock    ? '#6b7280' : ''; }
  if(idEl)     { idEl.readOnly     = lock;    idEl.style.background     = lock    ? '#f3f4f6' : ''; idEl.style.color      = lock    ? '#6b7280' : ''; }
  if(genderEl) { genderEl.disabled = lock;    genderEl.style.background = lock    ? '#f3f4f6' : ''; genderEl.style.color  = lock    ? '#6b7280' : ''; }
  if(empnoEl)  { empnoEl.readOnly  = lock;    empnoEl.style.background  = lock    ? '#f3f4f6' : ''; empnoEl.style.color   = lock    ? '#6b7280' : ''; }
  // 고용형태: lockCat 적용 (재계약은 false → 편집 가능)
  if(catEl)    { catEl.disabled    = lockCat; catEl.style.background    = lockCat ? '#f3f4f6' : ''; catEl.style.color     = lockCat ? '#6b7280' : ''; }
  if(nameLock) nameLock.style.display = lock    ? 'block' : 'none';
  if(catLock)  catLock.style.display  = lockCat ? 'block' : 'none';
}
/**
 * 직원명이 선택된 고객사의 대표자명·등기임원·특수관계인과 일치하면 경고 표시
 * @param {string} nameInputId  - 이름 input 요소 ID
 * @param {string} repRowId     - 대표자 행 div ID
 * @param {string} repChkId     - 대표자 체크박스 ID
 * @param {string} altNamesId   - 대체 이름 버튼 컨테이너 ID
 */
function _checkRepSelf(nameInputId, repRowId, repChkId, altNamesId){
  const nameEl  = document.getElementById(nameInputId);
  const rowEl   = document.getElementById(repRowId);
  const chkEl   = document.getElementById(repChkId);
  const altEl   = document.getElementById(altNamesId);
  const coId    = document.getElementById('ct-company')?.value;
  if(!nameEl || !rowEl || !coId){ if(rowEl) rowEl.style.display='none'; return; }
  const empName = nameEl.value.trim();
  const co = (allCompanies||[]).find(c => c.id === coId);

  // 대표자명 수집
  const reps = typeof _cmParseReps === 'function' ? _cmParseReps(co) : [];
  const repNames = reps.map(r => r.name).filter(Boolean);

  // 등기임원명 수집
  const execNames = (allExecutives||[]).filter(e => e.company_id === coId).map(e => e.name).filter(Boolean);

  // 특수관계인명 수집
  const relatedNames = (allRelatedParties||[]).filter(r => r.company_id === coId).map(r => r.name).filter(Boolean);

  // 중복 확인: 대표자·등기임원·특수관계인 중 하나라도 일치
  const allProtectedNames = [...new Set([...repNames, ...execNames, ...relatedNames])];
  const isRep = empName && allProtectedNames.length > 0 && allProtectedNames.includes(empName);

  // 어떤 카테고리와 일치하는지 파악 (메시지용)
  let matchCategory = '';
  if(repNames.includes(empName)) matchCategory = '대표자';
  else if(execNames.includes(empName)) matchCategory = '등기임원';
  else if(relatedNames.includes(empName)) matchCategory = '특수관계인';

  if(isRep){
    // ── 대표자·등기임원·특수관계인명과 일치: 선택 UI 표시 ──
    rowEl.style.display = '';
    // 경고 메시지 동적 설정
    const msgEl = rowEl.querySelector('div:first-child');
    if(msgEl){
      const categoryLabel = matchCategory === '대표자' ? '대표자명' :
                            matchCategory === '등기임원' ? '등기임원명' :
                            matchCategory === '특수관계인' ? '특수관계인명' : '대표자·등기임원·특수관계인명';
      msgEl.innerHTML = `<i class="fas fa-info-circle"></i> 입력한 이름이 <strong>${categoryLabel}</strong>과 동일합니다.`;
    }
    // 체크박스 라벨 동적 설정
    const chkLabel = rowEl.querySelector('label span');
    if(chkLabel){
      const selfLabel = matchCategory === '등기임원' ? '등기임원 본인입니다.' :
                        matchCategory === '특수관계인' ? '특수관계인 본인입니다.' :
                        '대표자 본인입니다.';
      chkLabel.textContent = selfLabel;
    }
    // 대체 이름 제안 생성
    if(altEl){
      const escaped = empName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const existingNames = allEmployees
        .filter(e => e.company_id===coId && new RegExp(`^${escaped}(\\d+)?$`).test(e.name))
        .map(e => e.name);
      const suggestions = [];
      for(let n=2; n<=existingNames.length+3; n++){
        const c = `${empName}${n}`;
        if(!existingNames.includes(c)){ suggestions.push(c); if(suggestions.length>=1) break; }
      }
      altEl.innerHTML = suggestions.length
        ? suggestions.map(s =>
          `<button type="button" onclick="_repUseAltName('${nameInputId}','${repRowId}','${s}')"
            class="btn btn-sm btn-secondary" style="font-size:11px;">` +
            `${s} (으)로 입력</button>`).join('')
        : `<span style="font-size:11px;color:#9ca3af;">대체 가능한 이름이 없습니다. 직접 수정해 주세요.</span>`;
    }
  } else {
    rowEl.style.display = 'none';
    if(chkEl) chkEl.checked = false;
  }
}

/** 대표자명과 겹칠 때 대체 이름으로 변경 */
function _repUseAltName(inputId, rowId, altName){
  const inputEl = document.getElementById(inputId);
  if(inputEl) inputEl.value = altName;
  const rowEl = document.getElementById(rowId);
  if(rowEl) rowEl.style.display = 'none';
  // 이름 변경 후 재검사 트리거
  if(inputId === 'ct-em-name') checkCtDuplicateName();
  else if(inputId === 'ct-edit-emp-name') checkCtEditDuplicateName();
}
function checkCtDuplicateName(){
  const name = (document.getElementById('ct-em-name')?.value || '').trim();
  const coId = document.getElementById('ct-company')?.value || '';
  _renderNameDuplicateAlert(name, coId, null, 'ct-em-name', 'ct-em-name-dup');
  _checkRepSelf('ct-em-name', 'ct-em-rep-self-row', 'ct-em-is-rep', 'ct-em-rep-alt-names');
}

// ── 수정 모드(이어쓰기) 이름 중복 검사 ──
function checkCtEditDuplicateName(){
  const name = (document.getElementById('ct-edit-emp-name')?.value || '').trim();
  const coId = document.getElementById('ct-company')?.value || currentContCompanyId || '';
  const c = editId.contract ? allContracts.find(x => x.id === editId.contract) : null;
  const selfEmpId = c ? c.employee_id : null;
  _renderNameDuplicateAlert(name, coId, selfEmpId, 'ct-edit-emp-name', 'ct-edit-em-name-dup');
  _checkRepSelf('ct-edit-emp-name', 'ct-edit-em-rep-self-row', 'ct-edit-em-is-rep', 'ct-edit-em-rep-alt-names');
}

// ── 이름 중복 검사 공통 코어 (신규 모드 + 수정 모드) ──
function _renderNameDuplicateAlert(name, coId, selfEmpId, inputId, alertPrefix){
  const alertEl   = document.getElementById(alertPrefix + '-alert');
  const msgEl     = document.getElementById(alertPrefix + '-msg');
  const actionsEl = document.getElementById(alertPrefix + '-actions');
  const suggestEl = document.getElementById(alertPrefix + '-suggestions');
  if(!alertEl) return;

  if(!name){ alertEl.style.display='none'; return; }
  if(!coId){ alertEl.style.display='none'; return; }

  // ── 유효 계약 상태 (이름 중복: 현재 유효한 계약만 대조) ──
  const VALID_FOR_NAME = new Set([
    CONTRACT_STATUS.ACTIVE,
    CONTRACT_STATUS.DOCS_INCOMPLETE,
    CONTRACT_STATUS.PENDING,
    CONTRACT_STATUS.RENEWAL_PENDING,
  ]);

  // 같은 이름 + 유효 계약이 있는 직원만 필터링 (자기 자신 제외)
  const allDupes = allEmployees.filter(e => e.company_id===coId && e.name===name && e.id!==selfEmpId);
  const dupes = allDupes.filter(emp => {
    return (allContracts||[]).some(c =>
      c.employee_id === emp.id && VALID_FOR_NAME.has(c.status)
    );
  });
  if(!dupes.length){ alertEl.style.display='none'; return; }

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const existingNames = allEmployees.filter(e=>e.company_id===coId && new RegExp(`^${escaped}(\\d+)?$`).test(e.name)).map(e=>e.name);
  const suggestions=[];
  for(let n=2;n<=existingNames.length+2;n++){
    const c=`${name}${n}`;
    if(!existingNames.includes(c)){ suggestions.push(c); if(suggestions.length>=1) break; }
  }

  // ── 동명 직원별 계약 상태 판별 ──
  let hasActiveDupes = false, hasInactiveDupes = false;
  const dupesWithStatus = dupes.map(emp => {
    const activeCt = (allContracts||[]).find(c =>
      c.employee_id === emp.id && VALID_FOR_NAME.has(c.status)
    );
    const latestCt = (allContracts||[])
      .filter(c => c.employee_id === emp.id)
      .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];
    const isActive = !!activeCt;
    if(isActive) hasActiveDupes = true; else hasInactiveDupes = true;
    return { emp, activeCt, latestCt, isActive };
  });

  // ── 메시지 ──
  const activeCount = dupesWithStatus.filter(d=>d.isActive).length;
  const inactiveCount = dupesWithStatus.length - activeCount;
  let msgParts = [`동일한 이름 "${name}"의 직원이 이미 ${dupes.length}명 있습니다.`];
  if(activeCount > 0) msgParts.push(`재직 중: ${activeCount}명`);
  if(inactiveCount > 0) msgParts.push(`퇴직·만료: ${inactiveCount}명`);
  msgEl.textContent = msgParts.join(' / ');

  // ── 액션 버튼 ──
  let actionsHtml = '';
  dupesWithStatus.forEach(({ emp, activeCt, latestCt, isActive }) => {
    const empLabel = `${emp.name}(${emp.employee_number||'무번호'})`;
    if(isActive && activeCt){
      actionsHtml += `<button type="button" onclick="_ctDupRenew('${activeCt.id}')"
        style="padding:4px 10px;background:#ecfdf5;border:1.5px solid #6ee7b7;border-radius:20px;color:#065f46;font-size:11px;cursor:pointer;font-weight:600;">
        <i class="fas fa-sync-alt"></i> ${empLabel} 계약 갱신</button>`;
      actionsHtml += `<button type="button" onclick="_ctDupEdit('${activeCt.id}')"
        style="padding:4px 10px;background:#eff6ff;border:1.5px solid #93c5fd;border-radius:20px;color:#1e40af;font-size:11px;cursor:pointer;font-weight:600;">
        <i class="fas fa-edit"></i> ${empLabel} 계약 수정</button>`;
    } else if(latestCt){
      actionsHtml += `<button type="button" onclick="_ctDupRecontract('${latestCt.id}')"
        style="padding:4px 10px;background:#fef3c7;border:1.5px solid #fcd34d;border-radius:20px;color:#92400e;font-size:11px;cursor:pointer;font-weight:600;">
        <i class="fas fa-file-signature"></i> ${empLabel} 재계약</button>`;
    }
  });
  actionsEl.innerHTML = actionsHtml;

  // ── 번호 붙인 대체 이름 제안 ──
  suggestEl.innerHTML = suggestions.length
    ? `<div style="font-size:10.5px;color:#9a3412;margin-bottom:4px;">또는 새 이름으로:</div>` + suggestions.map(s=>
      `<button type="button" onclick="document.getElementById('${inputId}').value='${s}';document.getElementById('${alertPrefix}-alert').style.display='none'"
        style="padding:3px 10px;background:#FFF;border:1.5px solid #FB923C;border-radius:20px;color:#9A3412;font-size:11px;cursor:pointer;font-weight:600;">
        ${s} 로 입력</button>`).join('')
    : '';
  alertEl.style.display='block';
}

/** 중복이름 → 기존 계약 갱신 (활성 계약을 edit 모달로 열고 갱신 패널 표시) */
function _ctDupRenew(contractId){
  _hideAllNameDupAlerts();
  closeModal('contract-modal');
  setTimeout(() => {
    openContractModal(contractId);
    setTimeout(() => { if(typeof doContractRenew==='function') doContractRenew(); }, 300);
  }, 200);
}

/** 중복이름 → 기존 계약 수정 (활성 계약을 edit 모달로 열기) */
function _ctDupEdit(contractId){
  _hideAllNameDupAlerts();
  closeModal('contract-modal');
  setTimeout(() => { openContractModal(contractId); }, 200);
}

/** 중복이름 → 재계약 (가장 최근 계약 기준으로 재계약 모달 열기) */
function _ctDupRecontract(contractId){
  _hideAllNameDupAlerts();
  closeModal('contract-modal');
  setTimeout(() => {
    const src = (allContracts||[]).find(c => c.id === contractId);
    if(src && typeof openRecontractModal === 'function') openRecontractModal(src);
  }, 200);
}

function _hideAllNameDupAlerts(){
  const _a1 = document.getElementById('ct-em-name-dup-alert');
  const _a2 = document.getElementById('ct-edit-em-name-dup-alert');
  if(_a1) _a1.style.display = 'none';
  if(_a2) _a2.style.display = 'none';
}

// ─── 사원번호 유니크 유효성 검사 ───────────────────────────────────────────
/**
 * 사원번호 유효성 검사 규칙:
 *  규칙1: 동일 고객사 내 사원번호는 고유 (해지·만료·파기·취소·임시저장 포함 모든 계약 대조)
 *  규칙2: 동일 직원이라도 계약 공백(기간 단절) → 새 번호 필요
 *  규칙3: 연속 계약이라도 고용형태 변경 → 새 번호 필요
 *  허용:  수정(amend)·갱신·동일 고용형태 연속 재계약 → 기존 번호 유지 가능
 *
 * @param {string} empNo       - 검사할 사원번호
 * @param {string} companyId   - 현재 고객사 ID
 * @param {string|null} selfEmpId - 수정 모드 시 현재 직원 ID (자기 자신 제외)
 * @param {string} newContractStart - 신규 계약 시작일 (YYYY-MM-DD) [신규 모드]
 * @param {string} newContractType  - 신규 계약 고용형태 [신규 모드]
 * @returns {{ ok: boolean, type: string, msg: string }}
 *   type: 'ok' | 'duplicate' | 'gap' | 'type_change'
 */
function _validateEmpNoUniqueness(empNo, companyId, selfEmpId, newContractStart, newContractType) {
  if(!empNo || !companyId) return { ok: true, type: 'ok', msg: '' };

  // ── 같은 회사 내 동일 사원번호를 가진 직원 탐색 (해지·만료·파기·취소·임시저장 포함 모든 계약) ──
  const sameNoEmps = allEmployees.filter(e =>
    e.company_id === companyId &&
    e.employee_number === empNo &&
    e.id !== selfEmpId   // 수정 모드: 자기 자신 제외
  );

  if(!sameNoEmps.length) return { ok: true, type: 'ok', msg: '' };

  // 같은 사원번호를 가진 직원이 있으면 무조건 중복 처리 (계약 상태 불문)
  const existEmp = sameNoEmps[0];
  return {
    ok: false,
    type: 'duplicate',
    msg: `사원번호 "${empNo}"은(는) 이미 ${existEmp.name} 직원이 사용 중입니다. 다른 번호를 입력하세요.`
  };
}

/**
 * 휴대폰번호 중복 검사
 * 현재 유효상태(active, docs_incomplete)이거나 예정(pending, renewal_pending,
 * terminate_pending) 상태인 근로계약의 휴대폰번호 중 중복이 있는지 확인
 *
 * @param {string} phoneDigits - 검사할 휴대폰번호 (숫자만, 11자리)
 * @param {string} companyId   - 현재 고객사 ID
 * @param {string|null} selfEmpId - 수정 모드 시 현재 직원 ID (자기 자신 제외)
 * @returns {{ ok: boolean, msg: string }}
 */
function _validatePhoneUniqueness(phoneDigits, companyId, selfEmpId) {
  if(!phoneDigits || !companyId) return { ok: true, msg: '' };
  if(phoneDigits.length < 10) return { ok: true, msg: '' }; // 불완전한 번호는 통과

  // 유효·예정 상태 정의
  const CHECK_STATUSES = [
    CONTRACT_STATUS.ACTIVE,
    CONTRACT_STATUS.DOCS_INCOMPLETE,
    CONTRACT_STATUS.PENDING,
    CONTRACT_STATUS.RENEWAL_PENDING,
    CONTRACT_STATUS.TERMINATE_PENDING,
  ];

  // 1. 같은 전화번호를 가진 직원 찾기 (자기 자신 제외)
  const samePhoneEmps = allEmployees.filter(e =>
    e.id !== selfEmpId &&
    e.phone &&
    e.phone.replace(/[^0-9]/g, '') === phoneDigits
  );

  if(!samePhoneEmps.length) return { ok: true, msg: '' };

  // 2. 그 직원들 중 유효·예정 상태의 계약이 있는지 확인
  for(const emp of samePhoneEmps) {
    const hasActiveContract = allContracts.some(c =>
      c.employee_id === emp.id &&
      CHECK_STATUSES.includes(c.status)
    );
    if(hasActiveContract) {
      return {
        ok: false,
        msg: `이미 이 휴대폰번호로 등록된 계약이 있습니다.`
      };
    }
  }

  return { ok: true, msg: '' };
}

/**
 * 신규 계약 모드: 동일 직원(이름·주민번호 동일)이 이전에 같은 번호를 사용했는지 연속성 검사
 * - 이전 계약과 새 계약 사이 공백이 있으면 → 재발행 필요
 * - 이전 계약 고용형태와 다르면 → 재발행 필요
 * @param {string} empNo
 * @param {string} companyId
 * @param {string} selfEmpId  수정 모드: 현재 직원 ID
 * @param {string} newStart   새 계약 시작일 (YYYY-MM-DD)
 * @param {string} newType    새 계약 고용형태
 * @returns {{ ok:boolean, type:string, msg:string }}
 */
function _checkEmpNoContinuity(empNo, companyId, selfEmpId, newStart, newType) {
  if(!empNo || !companyId || !selfEmpId || !newStart || !newType)
    return { ok: true, type: 'ok', msg: '' };

  // 현재 직원(selfEmpId)의 기존 계약 조회 (파기·취소·임시저장 제외)
  const VALID_STATUSES = [
    CONTRACT_STATUS.ACTIVE,
    CONTRACT_STATUS.EXPIRED,
    CONTRACT_STATUS.TERMINATED,
    CONTRACT_STATUS.PENDING,
    CONTRACT_STATUS.RENEWAL_PENDING,
    CONTRACT_STATUS.TERMINATE_PENDING,
    CONTRACT_STATUS.DOCS_INCOMPLETE,
    CONTRACT_STATUS.RENEWED,
    // draft는 연속성 검사에서 제외 (임시저장은 실제 계약이 아님)
  ];
  const myContracts = allContracts.filter(c =>
    c.employee_id === selfEmpId &&
    VALID_STATUSES.includes(c.status)
  );

  if(!myContracts.length) return { ok: true, type: 'ok', msg: '' };

  // 가장 최근 계약 (contract_start 기준 내림차순)
  const sorted = [...myContracts].sort((a, b) =>
    new Date(b.contract_start) - new Date(a.contract_start)
  );
  const lastContract = sorted[0];
  const lastEnd = lastContract.contract_end ? new Date(lastContract.contract_end) : null;
  const newStartDate = new Date(newStart);

  // ── 규칙3: 고용형태 변경 검사 (연속성 먼저 확인) ──
  const lastType = lastContract.contract_type || '';

  // 날짜 연속성 판단: 이전 종료일 + 1일 >= 새 시작일 (당일 포함)
  let isContinuous = false;
  if(lastEnd) {
    const gapMs = newStartDate - lastEnd;
    const gapDays = Math.round(gapMs / (1000 * 60 * 60 * 24));
    isContinuous = (gapDays <= 1); // 0일(당일) 또는 1일 차이까지 연속으로 판단
  }

  if(!isContinuous) {
    // 규칙2: 계약 공백 발생
    const lastEndStr = lastEnd ? lastEnd.toLocaleDateString('ko-KR') : '(미정)';
    return {
      ok: false,
      type: 'gap',
      msg: `이전 계약 종료일(${lastEndStr})과 새 계약 시작일(${newStartDate.toLocaleDateString('ko-KR')}) 사이에 공백이 있습니다. 사원번호를 재발행해야 합니다.`
    };
  }

  if(lastType && newType && lastType !== newType) {
    // 규칙3: 고용형태 변경
    return {
      ok: false,
      type: 'type_change',
      msg: `고용형태가 "${lastType}"에서 "${newType}"으로 변경됩니다. 사원번호를 새로 발행해야 합니다.`
    };
  }

  return { ok: true, type: 'ok', msg: '' };
}

// ── 사원번호 실시간 피드백 UI 표시 (신규 모드) ──
function checkCtEmpNoUniqueness(){
  const empNo    = (document.getElementById('ct-em-empno')?.value || '').trim();
  const alertEl  = document.getElementById('ct-em-empno-alert');
  if(!alertEl) return;
  if(!empNo){ alertEl.style.display='none'; return; }

  const companyId = document.getElementById('ct-company')?.value || '';
  if(!companyId){ alertEl.style.display='none'; return; }

  const result = _validateEmpNoUniqueness(empNo, companyId, null, null, null);
  if(!result.ok){
    _showEmpNoAlert(alertEl, result.msg, 'error');
    return;
  }
  _showEmpNoAlert(alertEl, `사용 가능한 사원번호입니다.`, 'ok');
}

// ── 사원번호 실시간 피드백 UI 표시 (수정 모드) ──
function checkCtEditEmpNoUniqueness(){
  const empNo    = (document.getElementById('ct-edit-em-empno')?.value || '').trim();
  const alertEl  = document.getElementById('ct-edit-em-empno-alert');
  if(!alertEl) return;
  if(!empNo){ alertEl.style.display='none'; return; }

  const companyId = currentContCompanyId || document.getElementById('ct-company')?.value || '';
  if(!companyId){ alertEl.style.display='none'; return; }

  // 수정 모드: 현재 계약의 employee_id를 selfEmpId로 넘겨 자기 자신 제외
  const c = editId.contract ? allContracts.find(x => x.id === editId.contract) : null;
  const selfEmpId = c ? c.employee_id : null;

  const result = _validateEmpNoUniqueness(empNo, companyId, selfEmpId, null, null);
  if(!result.ok){
    _showEmpNoAlert(alertEl, result.msg, 'error');
    return;
  }
  _showEmpNoAlert(alertEl, `사용 가능한 사원번호입니다.`, 'ok');
}

function _showEmpNoAlert(alertEl, msg, type){
  const isOk = (type === 'ok');
  alertEl.style.display = 'block';
  alertEl.style.background = isOk ? '#F0FDF4' : '#FFF1F2';
  alertEl.style.border     = `1.5px solid ${isOk ? '#86EFAC' : '#FCA5A5'}`;
  alertEl.style.color      = isOk ? '#166534' : '#991B1B';
  alertEl.querySelector('.empno-alert-msg').textContent = msg;
}

// ─── 동일 직원의 최초 계약 시작일 반환 (입사일 상속용) ───
// 파기·임시저장 계약 제외, contract_start 가장 앞선 값 반환
function getEarliestContractStart(employeeId){
  if(!employeeId || !Array.isArray(allContracts)) return '';
  const dates = allContracts
    .filter(x => x.employee_id === employeeId
               && !x.is_draft
               && x.status !== CONTRACT_STATUS.VOIDED
               && x.contract_start)
    .map(x => x.contract_start)
    .sort();   // 'YYYY-MM-DD' 문자열 정렬 = 날짜 오름차순
  return dates.length ? dates[0] : '';
}

// ─── 계약 상태 표시 계산 ───
function calcContractStatusDisplay(c, today){
  // ── 서류미비 여부 (계약 상태와 무관하게 판별) ──
  const docsIncomplete = !!(c && (!c.signed_file_data || !c.consent_file_data));
  // 임시저장 상태 최우선 처리 (임시저장은 서류미비와 무관)
  if(c.is_draft) return {badge:'badge-yellow', label:'임시저장', docsIncomplete: false};
  // 수정재발행으로 파기된 계약 (is_voided_by_amend 플래그 우선)
  if(c.is_voided_by_amend) return {badge:'badge-slate', label:'파기', docsIncomplete};
  // 상태 정규화: DB 영문값('pending' 등) → 한글 표시값('계약예정' 등)
  const s = (CONTRACT_STATUS_LABEL[c.status] || c.status || '활성');
  const start = c.contract_start || '';
  // 명시적 상태 우선
  if(s==='갱신예정'||s==='renewal_pending')  return {badge:'badge-amber',  label:'갱신예정', docsIncomplete};
  if(s==='계약예정'||s==='pending')  return {badge:'badge-indigo', label:'계약예정', docsIncomplete};
  if(s==='해지예정'||s==='terminate_pending'){
    // terminate_date가 오늘 이하이면 이미 해지된 것으로 표시
    if(c.terminate_date && c.terminate_date <= today){
      return {badge:'badge-red', label:'해지', docsIncomplete};
    }
    return {badge:'badge-rose', label:'해지예정', docsIncomplete};
  }
  if(s==='파기'||s==='voided')      return {badge:'badge-slate',  label:'파기', docsIncomplete};
  if(s==='갱신됨')    return {badge:'badge-gray',   label:'만료', docsIncomplete}; // 레거시 → 만료로 표시
  if(s==='만료'||s==='expired')    return {badge:'badge-gray',  label:'만료', docsIncomplete};
  if(s==='해지'||s==='terminated') return {badge:'badge-red',   label:'해지', docsIncomplete};
  // 만료예정·종료예정은 레거시 값 → 계약유효로 표시 (유효한 계약)
  if(s==='만료예정'||s==='종료예정') return {badge:'badge-green', label:'유효', docsIncomplete};
  // 서류미비는 독립된 상태가 아님 — 유효/만료/해지 등 실제 상태를 유지하고 docsIncomplete 플래그로만 관리
  if(c.status === CONTRACT_STATUS.DOCS_INCOMPLETE){
    // DB에 남아있는 레거시 값 → 유효로 폴백 (실제 상태는 DB 정리 완료)
    if(start && start > today) return {badge:'badge-indigo',  label:'계약예정', docsIncomplete:true};
    return {badge:'badge-green', label:'유효', docsIncomplete:true};
  }
  // 활성/유효 상태 — 서류와 무관하게 유효 계약으로 처리
  if(CONTRACT_ACTIVE_STATUSES.includes(c.status)){
    if(start && start > today) return {badge:'badge-amber', label:'갱신예정', docsIncomplete};
    // 계약직/일용직: 유효 종료일(terminate_date 우선, 없으면 contract_end)이 지났으면 만료 처리
    const ct = (c.contract_type || '').toLowerCase();
    const isFixedTerm = ct === 'fixed_term' || ct === 'fixed_term_probation' || ct === 'daily'
                     || ct === '계약직' || ct === '계약직 수습' || ct === '일용직';
    const effectiveEnd = c.terminate_date || c.contract_end || '';
    if(isFixedTerm && effectiveEnd && effectiveEnd < today){
      return {badge:'badge-gray', label:'만료', docsIncomplete};
    }
    return {badge:'badge-green', label:'유효', docsIncomplete};
  }
  return {badge:'badge-gray', label: s, docsIncomplete};
}

// ─── 조회 모드로 모달 열기 ───
function viewContract(id){
  // 먼저 openContractModal로 데이터를 채운다
  openContractModal(id);

  const c = allContracts.find(x=>x.id===id);
  const today = new Date().toISOString().slice(0,10);
  const {label:stName} = calcContractStatusDisplay(c||{}, today);

  // openContractModal 에서 이미 c.contract_type 우선 기준으로 ctVal이 결정되지만,
  // viewContract 에서도 동일 로직으로 한 번 더 보정한다 (연봉 섹션 표시 최종 확정).
  if(c){
    const emp2 = allEmployees.find(e => e.id === c.employee_id);
    const _ctVal2Raw = c.contract_type || (emp2 ? emp2.employment_category : '') || '정규직';
    const _isPendingCt2 = (c.status===CONTRACT_STATUS.PENDING);
    const ctVal2 = _isPendingCt2
      ? (_ctVal2Raw ===CONTRACT_TYPE.REGULAR_PROBATION ? '정규직' : _ctVal2Raw ===CONTRACT_TYPE.FIXED_PROBATION ? '계약직' : _ctVal2Raw)
      : _ctVal2Raw;
    const isReg = ctVal2 ===CONTRACT_TYPE.REGULAR || ctVal2 ===CONTRACT_TYPE.REGULAR_PROBATION;
    ['ct-row-salary-period','ct-row-annual-sal'].forEach(sid=>{
      const el = document.getElementById(sid);
      if(el) el.style.display = isReg ? '' : 'none';
    })
    // 연봉 값도 다시 채우기 (openContractModal에서 초기화될 수 있으므로)
    if(isReg){
      if(c.annual_salary) setAmountVal('ct-annual-sal', c.annual_salary);
      // salary_start_date = contract_start 통합 — 별도 로드 불필요
    }
  }

  // 모달 제목 변경
  document.getElementById('ct-title').textContent = '근로계약 정보';

  // 편집/저장 footer 숨기고 조회 액션 바 표시, 일괄설정 바 숨김
  document.getElementById('ct-footer-edit').style.display = 'none';
  document.getElementById('ct-action-bar-top').style.display = 'flex';
  document.getElementById('ct-action-bar-bottom').style.display = 'flex';
  const _bulkBarView = document.getElementById('ct-bulk-bar-wrap');
  if(_bulkBarView) _bulkBarView.style.display = 'none';
  // 단계바 숨김 (조회 모드)
  const _stepBarV = document.getElementById('ct-step-bar');
  if(_stepBarV) _stepBarV.style.display = 'none';

  // 패널 초기화
  document.getElementById('ct-terminate-panel').style.display = 'none';
  document.getElementById('ct-renew-panel').style.display = 'none';
  const _amendPanelV = document.getElementById('ct-amend-panel');
  if(_amendPanelV) _amendPanelV.style.display = 'none';

  // ── 계약 상태 통합 배너 처리 (해지예정 / 계약예정 / 갱신예정) ──
  const sbEl = document.getElementById('ct-status-banner');
  if(sbEl){
    const cStatus = c?.status || '';
    const isPreTerm   = (cStatus === CONTRACT_STATUS.TERMINATE_PENDING);
    const isPendingSt = (cStatus === CONTRACT_STATUS.PENDING);
    // '갱신예정': DB status가 'renewal_pending' 이거나, status가 'active'이면서 시작일이 오늘 이후인 경우
    const isActiveFutureStart = (cStatus === CONTRACT_STATUS.ACTIVE)
                                && (c?.contract_start || '') > today;
    const isRenewSt   = (cStatus === CONTRACT_STATUS.RENEWAL_PENDING) || isActiveFutureStart;
    const needsBanner = !c?.is_draft && (isPreTerm || isPendingSt || isRenewSt);

    if(c && needsBanner){
      // DB status가 'active'이지만 시작일이 미래인 경우 → renewal_pending으로 취급
      const effectiveStatus = isActiveFutureStart ? CONTRACT_STATUS.RENEWAL_PENDING : cStatus;

      // ── 타입별 스타일·텍스트 설정 ──
      const typeMap = {
        [CONTRACT_STATUS.TERMINATE_PENDING]: { cls:'type-preterminate', icon:'⚠️', ddayBg:'#be123c',
                      editCls:'btn-sb btn-sb-edit rose', destroyLabel:'<i class="fas fa-undo-alt"></i> 해지 철회' },
        [CONTRACT_STATUS.PENDING]:           { cls:'type-pending',       icon:'📋', ddayBg:'#4338ca',
                      editCls:'btn-sb btn-sb-edit',      destroyLabel:'<i class="fas fa-times-circle"></i> 계약 취소' },
        [CONTRACT_STATUS.RENEWAL_PENDING]:   { cls:'type-renew',         icon:'🔄', ddayBg:'#d97706',
                      editCls:'btn-sb btn-sb-edit amber', destroyLabel:'<i class="fas fa-times-circle"></i> 갱신 취소' },
      };
      const tm = typeMap[effectiveStatus];
      sbEl.className = `ct-status-banner ${tm.cls}`;
      document.getElementById('ct-sb-icon').textContent = tm.icon;
      document.getElementById('ct-sb-title-text').textContent = CONTRACT_STATUS_LABEL[effectiveStatus] || effectiveStatus;

      // 아이콘 (FontAwesome)
      const iconMap = {
        [CONTRACT_STATUS.TERMINATE_PENDING]: 'fa-user-clock',
        [CONTRACT_STATUS.PENDING]:           'fa-calendar-alt',
        [CONTRACT_STATUS.RENEWAL_PENDING]:   'fa-sync-alt'
      };
      document.getElementById('ct-sb-title-icon').innerHTML = `<i class="fas ${iconMap[effectiveStatus]}"></i>`;

      // ── 날짜 정보 및 D-day ──
      function fmtDate(str){ if(!str)return null; const [y,m,d]=str.split('-'); return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`; }
      function calcDday(str){ if(!str)return null; const diff=Math.ceil((new Date(str)-new Date(today))/(1000*60*60*24)); return diff>0?`D-${diff}`:diff===0?'D-day':`D+${Math.abs(diff)}`; }

      const ddayEl = document.getElementById('ct-sb-dday');
      let dateHtml = '';

      if(isPreTerm){
        // 해지예정: 계약 해지일 + D-day + 변경 버튼 + (계약직/일용직: 원래 계약 종료일)
        const termDate = c.terminate_date || '';
        const dday = calcDday(termDate);
        if(dday){ ddayEl.textContent = dday; ddayEl.style.background = tm.ddayBg; ddayEl.style.display = 'inline-block'; }
        else { ddayEl.style.display = 'none'; }
        const termKr    = fmtDate(termDate) || '—';
        const ctType = c.contract_type || '';
        const isRegType = (ctType===CONTRACT_TYPE.REGULAR||ctType===CONTRACT_TYPE.REGULAR_PROBATION);
        const contractEndKr = fmtDate(c.contract_end) || '—';
        dateHtml = `계약 해지일: <span id="ct-sb-term-text"><strong>${termKr}</strong></span>`
          + `<span id="ct-sb-term-edit" style="display:none;"><input type="date" id="ct-sb-term-input" value="${termDate}" style="border:1.5px solid #6366f1;border-radius:6px;padding:3px 8px;font-size:13px;font-family:inherit;width:140px;" /></span>`
          + ` <button id="ct-sb-term-change-btn" onclick="changeTerminateDate()" style="background:#d97706;color:#fff;border:none;border-radius:5px;padding:2px 10px;font-size:11.5px;cursor:pointer;margin-left:4px;transition:all .15s;" onmouseenter="this.style.background='#b45309'" onmouseleave="this.style.background='#d97706'">변경</button>`
          + ` <button id="ct-sb-term-confirm-btn" onclick="confirmTerminateDateChange()" style="display:none;background:#6366f1;color:#fff;border:none;border-radius:5px;padding:2px 10px;font-size:11.5px;cursor:pointer;margin-left:4px;">확인</button>`
          + ` <button id="ct-sb-term-cancel-btn" onclick="cancelTerminateDateChange()" style="display:none;background:#9ca3af;color:#fff;border:1px solid #6b7280;border-radius:5px;padding:2px 10px;font-size:11.5px;cursor:pointer;margin-left:2px;">취소</button>`;
        if(!isRegType && c.contract_end){
          dateHtml += `<span style="font-size:11.5px;margin-left:12px;">(원래 계약 종료일: ${contractEndKr})</span>`;
        }
      } else {
        // 계약예정 / 갱신예정(DB status='갱신예정' or '활성'+미래시작일): 계약시작일 + D-day + 계약종료일
        const startVal = c.contract_start || '';
        const dday = calcDday(startVal);
        if(dday){ ddayEl.textContent = dday; ddayEl.style.background = tm.ddayBg; ddayEl.style.display = 'inline-block'; }
        else { ddayEl.style.display = 'none'; }
        const startKr = fmtDate(startVal) || '—';
        const endKr   = fmtDate(c.contract_end) || '미정';
        dateHtml = `계약 시작일: <strong>${startKr}</strong>&nbsp;&nbsp;계약 종료일: <strong>${endKr}</strong>`;
      
        // 계약예정: 수정·취소 기한 안내문구 추가
        if(isPendingSt){
          const _deadlineKr = fmtDate(startVal) || '—';
          const _isExpired  = startVal && today >= startVal;
          dateHtml += _isExpired
            ? `<span style="display:block;margin-top:6px;font-size:11.5px;color:#dc2626;font-weight:600;">
                <i class="fas fa-lock" style="margin-right:4px;"></i>계약 시작일이 도래하여 수정·취소가 불가합니다.
               </span>`
            : `<span style="display:block;margin-top:6px;font-size:11.5px;color:#4338ca;">
                <i class="fas fa-info-circle" style="margin-right:4px;"></i>수정·취소는 계약 시작일(<strong>${_deadlineKr}</strong>) 전날까지만 가능합니다.
               </span>`;
        }
      }
      document.getElementById('ct-sb-date').innerHTML = dateHtml;

      // ── 버튼 초기 상태 (조회 모드) ──
      const _editBtn    = document.getElementById('ct-sb-btn-edit');
      const _destroyBtn = document.getElementById('ct-sb-btn-destroy');
      _editBtn.className    = tm.editCls;
      // 해지예정: 수정 및 재발행 버튼 숨김 (해지일 변경 버튼으로 대체)
      _editBtn.style.display    = isPreTerm ? 'none' : 'inline-flex';
      document.getElementById('ct-sb-btn-save').style.display    = 'none';
      document.getElementById('ct-sb-btn-cancel').style.display  = 'none';
      _destroyBtn.className     = 'btn btn-secondary';
      _destroyBtn.style.display = 'inline-flex';
      _destroyBtn.innerHTML     = tm.destroyLabel;

      // 계약예정: 시작일 도래 시 수정·취소 버튼 비활성화
      if(isPendingSt && c.contract_start && today >= c.contract_start){
        [_editBtn, _destroyBtn].forEach(btn => {
          btn.disabled = true;
          btn.style.cursor  = 'not-allowed';
          btn.title = '계약 시작일이 도래하여 수정·취소가 불가합니다.';
        });
      } else {
        [_editBtn, _destroyBtn].forEach(btn => {
          btn.disabled = false;
          btn.style.cursor  = '';
          btn.title = '';
        });
      }

      sbEl.style.display = 'flex';
    } else {
      sbEl.style.display = 'none';
    }
  }

  // 모달 본문(modal-body) 읽기전용 - 액션 패널 제외
  const modalEl = document.querySelector('#contract-modal .modal');
  modalEl.classList.add('ct-readonly');
  // modal-body 내 input/select/textarea 비활성화 (액션 패널 제외)
  // select는 disabled 대신 pointer-events로 차단 (브라우저 기본 opacity 방지)
  // 단, 입사일(ct-edit-em-hire)은 재입사 케이스를 위해 항상 편집 가능하게 유지
  const bodyEl = modalEl.querySelector('.modal-body');
  if(bodyEl) bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    // 해지일·파기일 필드는 readonly 유지, disabled로 인한 검정색 강제 방지
    if(el.id === 'ct-terminate-display' || el.id === 'ct-voided-display') return;
    if(el.tagName === 'SELECT'){
      el.tabIndex = -1;
      el.style.pointerEvents = 'none';
    } else {
      el.disabled = true;
    }
    el.style.background = '#f8f9fb';
    el.style.color = '#374151';
    el.style.cursor = 'default';
  });
  // 지급유형 버튼(매월 정기지급/출근일수에 따름) + 휴게시간 추가 버튼 비활성화
  if(bodyEl){
    bodyEl.querySelectorAll('.pi-pay-type-btn').forEach(btn=>{
      btn.disabled = true;
      btn.style.cursor = 'default';
      btn.style.pointerEvents = 'none';
    });
    bodyEl.querySelectorAll('.btn-brk-add').forEach(btn=>{
      btn.disabled = true;
      btn.style.cursor = 'not-allowed';
      btn.style.pointerEvents = 'none';
    });
  }

  // 버튼 표시 로직
  const ct = c?.contract_type||'';
  const isDraft       = !!c?.is_draft;                         // 임시저장 여부
  const isRegular     = (ct===CONTRACT_TYPE.REGULAR||ct===CONTRACT_TYPE.REGULAR_PROBATION);  // 무기한 계약 (만료일 없음)
  const isFixed       = (ct===CONTRACT_TYPE.FIXED||ct===CONTRACT_TYPE.FIXED_PROBATION||ct===CONTRACT_TYPE.DAILY);  // 기간제 계약
  const isTerminated  = !isDraft && (c?.status===CONTRACT_STATUS.EXPIRED||c?.status===COMPANY_STATUS.INACTIVE||c?.status===CONTRACT_STATUS.EXPIRED||c?.status===CONTRACT_STATUS.TERMINATED||c?.status===CONTRACT_STATUS.VOIDED||c?.status===CONTRACT_STATUS.RENEWED);
  const isPending     = !isDraft && (c?.status===CONTRACT_STATUS.RENEWAL_PENDING||c?.status===CONTRACT_STATUS.PENDING);  // 시작일 미도래
  const isPreTerminate= !isDraft && (c?.status===CONTRACT_STATUS.TERMINATE_PENDING);  // 퇴사예정일 설정된 정규직
  const isActive      = !isDraft && !isTerminated && !isPending && !isPreTerminate;

  // ── 모달 제목 옆: 계약서 고유 ID + 복사 아이콘 + 상태 뱃지 ──
  const {badge:stBadgeCls, label:stLabel} = calcContractStatusDisplay(c||{}, today);
  const _buildLabelHTML = (id, statusLabel, badgeCls, isDraftFlag, isVoidedAmend) => {
    const idHTML = `<span style="font-weight:500;color:#9ca3af;">계약서 고유 ID: ${id||'—'}</span>`
      + ` <button onclick="event.stopPropagation();_copyContractId('${id||''}')" title="ID 복사" style="background:none;border:none;cursor:pointer;color:#9ca3af;padding:2px 4px;font-size:11px;border-radius:4px;transition:color .15s;" onmouseenter="this.style.color='#6366f1'" onmouseleave="this.style.color='#9ca3af'"><i class="far fa-copy"></i></button>`;
    if(isDraftFlag){
      return `${idHTML} <span class="badge badge-yellow" style="margin-left:6px;">임시저장</span>`;
    }
    if(isVoidedAmend){
      return `${idHTML} <span class="badge ${badgeCls}" style="margin-left:6px;">${statusLabel}</span>`
        + `&nbsp;<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:20px;padding:1px 9px;font-size:10.5px;font-weight:700;"><i class="fas fa-ban" style="margin-right:3px;"></i>수정재발행 파기</span>`;
    }
    return `${idHTML} <span class="badge ${badgeCls}" style="margin-left:6px;">${statusLabel}</span>`;
  };
  const _titleInfoEl = document.getElementById('ct-title-info');
  if(_titleInfoEl && c){
    _titleInfoEl.innerHTML = _buildLabelHTML(c.id, stLabel, stBadgeCls, isDraft, c?.is_voided_by_amend);
    _titleInfoEl.style.display = 'inline-flex';
  } else if(_titleInfoEl){
    _titleInfoEl.style.display = 'none';
  }
  // 액션 바 라벨은 비움 (정보는 제목 옆으로 이동)
  [document.getElementById('ct-action-label'), document.getElementById('ct-action-label-bottom')].forEach(el=>{
    if(el) el.textContent = '';
  });

  // 임시저장 계속 수정 버튼 (draft 전용)
  const draftEditBtn = document.getElementById('ct-btn-draft-edit');
  if(draftEditBtn) draftEditBtn.style.display = isDraft ? 'flex' : 'none';

  // draft 상태이면 다른 액션 버튼은 모두 숨김 + 출력 버튼 비활성
  if(isDraft){
    ['ct-btn-amend','ct-btn-amend2',
     'ct-btn-renew','ct-btn-renew2','ct-btn-recontract','ct-btn-recontract2',
     'ct-btn-terminate','ct-btn-terminate2'].forEach(bid=>{
      const el=document.getElementById(bid); if(el) el.style.display='none';
    });
    ['ct-btn-print-doc'].forEach(bid=>{
      const el=document.getElementById(bid);
      if(el){
        el.style.pointerEvents='none';
        el.style.cursor='not-allowed';
        el.title='임시저장 상태에서는 출력할 수 없습니다';
      }
    });
    return;
  }

  // 정상 상태: 출력 버튼 활성 복원
  ['ct-btn-print-doc'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el){
      el.style.pointerEvents='';
      el.style.cursor='';
      el.title='';
    }
  });

  // 버튼 표시/숨김
  // 수정 및 재발행: 유효(active) 계약만 가능 (해지예정은 상태 배너에서 처리)
  ['ct-btn-amend','ct-btn-amend2'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el) el.style.display=isActive?'inline-flex':'none';
  });
  // 갱신: 유효(active) 계약만 가능 (해지예정은 상태 배너에서 처리)
  ['ct-btn-renew','ct-btn-renew2'].forEach(bid=>{
    const el=document.getElementById(bid); if(el) el.style.display=isActive?'':'none';
  });
  // 재계약: 만료·해지된 계약만 (파기 제외)
  //   - 동일인에게 유효(active/pending) 계약이 있으면 숨김
  //   - 여러 만료/해지 계약 중 가장 최근 계약에만 표시
  ['ct-btn-recontract','ct-btn-recontract2'].forEach(bid=>{
    const el=document.getElementById(bid);
    const isVoided = c?.status===CONTRACT_STATUS.VOIDED || c?.is_voided_by_amend;
    let showRecontract = (isTerminated && !isVoided);
    if(showRecontract && c?.employee_id){
      // 동일인 활성 계약 존재 시 숨김
      const hasActive = allContracts.some(x =>
        x.employee_id === c.employee_id &&
        x.id !== c.id &&
        (x.status===CONTRACT_STATUS.ACTIVE || x.status===CONTRACT_STATUS.PENDING)
      );
      if(hasActive) showRecontract = false;
      // 가장 최근 만료/해지 계약인지 확인
      if(showRecontract){
        const latestTerminated = allContracts
          .filter(x =>
            x.employee_id === c.employee_id &&
            (x.status===CONTRACT_STATUS.EXPIRED || x.status===CONTRACT_STATUS.TERMINATED) &&
            !(x.status===CONTRACT_STATUS.VOIDED || x.is_voided_by_amend)
          )
          .sort((a,b) => (b.contract_end||'').localeCompare(a.contract_end||''));
        if(latestTerminated.length > 0 && latestTerminated[0].id !== c.id){
          showRecontract = false;
        }
      }
    }
    if(el) el.style.display=showRecontract?'':'none';
  });
  // 퇴사예정 설정: 정규직 유효 계약만 (계약직/일용직은 별도 해지설정 버튼 사용)
  ['ct-btn-terminate','ct-btn-terminate2'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el) el.style.display=(isActive && isRegular)?'inline-flex':'none';
  });

  // 해지 설정: 계약직·계약직수습·일용직 — 유효(isActive) 계약만 가능
  const showFixedTermBtn = isFixed && isActive;
  const fixedTermLabel   = '<i class="fas fa-scissors"></i> 해지 설정';
  ['ct-btn-fixed-terminate','ct-btn-fixed-terminate2'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el){
      el.style.display = showFixedTermBtn ? 'inline-flex' : 'none';
      el.innerHTML     = fixedTermLabel;
    }
  });

  // 패널 초기화 (이전 조회에서 열려있을 수 있음)
  const _cftPanel = document.getElementById('ct-fixed-terminate-panel');
  if(_cftPanel) _cftPanel.style.display = 'none';

  // 계약서 확인 버튼명: 만료·해지·파기된 계약 → '이전 계약서 확인', 유효한 계약 → '현 계약서 확인'
  const _printBtnLabel = isTerminated
    ? '<i class="fas fa-file-contract"></i> 이전 계약서 확인'
    : '<i class="fas fa-file-contract"></i> 현 계약서 확인';
  ['ct-btn-print-doc'].forEach(bid=>{
    const el=document.getElementById(bid);
    if(el) el.innerHTML = _printBtnLabel;
  });

  // 조회 모드 전환 시 하단 수정완료·취소 버튼 숨김 초기화
  const _btnAC2 = document.getElementById('ct-btn-amend-complete2');
  if(_btnAC2) _btnAC2.style.display = 'none';
  const _btnCancel2 = document.getElementById('ct-btn-amend-cancel2');
  if(_btnCancel2) _btnCancel2.style.display = 'none';
  const _btnRenewComplete2 = document.getElementById('ct-btn-renew-complete2');
  if(_btnRenewComplete2) _btnRenewComplete2.style.display = 'none';
  const _btnRenewCancel2 = document.getElementById('ct-btn-renew-cancel2');
  if(_btnRenewCancel2) _btnRenewCancel2.style.display = 'none';

  // ── 첨부 서류 섹션 렌더링 ──
  _renderContractFilesSection(c);
}

// ─── 해지예정일 인라인 변경 ───
let _savedTerminateDate = '';

function changeTerminateDate(){
  const textEl   = document.getElementById('ct-sb-term-text');
  const editEl   = document.getElementById('ct-sb-term-edit');
  const changeBtn = document.getElementById('ct-sb-term-change-btn');
  const confirmBtn = document.getElementById('ct-sb-term-confirm-btn');
  const cancelBtn  = document.getElementById('ct-sb-term-cancel-btn');
  const inputEl    = document.getElementById('ct-sb-term-input');

  if(!textEl || !editEl || !inputEl) return;
  _savedTerminateDate = inputEl.value;

  textEl.style.display      = 'none';
  editEl.style.display      = 'inline';
  changeBtn.style.display   = 'none';
  confirmBtn.style.display  = 'inline';
  cancelBtn.style.display   = 'inline';
  inputEl.focus();
}

async function confirmTerminateDateChange(){
  const inputEl = document.getElementById('ct-sb-term-input');
  const newDate = inputEl?.value;
  if(!newDate) return toast('해지일을 입력해 주세요.', 'error');

  const cid = editId?.contract;
  if(!cid) return;

  const today = new Date().toISOString().slice(0,10);
  const newStatus = newDate <= today ? CONTRACT_STATUS.TERMINATED : CONTRACT_STATUS.TERMINATE_PENDING;

  await api(`../tables/contracts/${cid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminate_date: newDate, status: newStatus })
  });

  toast('해지일이 변경되었습니다.');
  await Promise.all([loadContracts(), loadEmployees()]);
  viewContract(cid);
}

function cancelTerminateDateChange(){
  const textEl   = document.getElementById('ct-sb-term-text');
  const editEl   = document.getElementById('ct-sb-term-edit');
  const changeBtn = document.getElementById('ct-sb-term-change-btn');
  const confirmBtn = document.getElementById('ct-sb-term-confirm-btn');
  const cancelBtn  = document.getElementById('ct-sb-term-cancel-btn');
  const inputEl    = document.getElementById('ct-sb-term-input');

  if(!textEl || !editEl || !inputEl) return;
  inputEl.value = _savedTerminateDate;

  textEl.style.display      = 'inline';
  editEl.style.display      = 'none';
  changeBtn.style.display   = 'inline';
  confirmBtn.style.display  = 'none';
  cancelBtn.style.display   = 'none';
}

// ─── 범용 커스텀 확인 모달 (confirm 대체) ───
/**
 * @param {Object} opts
 * @param {string} opts.message  - 표시할 메시지 (pre-wrap)
 * @param {string} [opts.okText] - 확인 버튼 텍스트 (기본: '확인')
 * @param {string} [opts.okClass] - 확인 버튼 클래스 (기본: 'btn-primary')
 * @returns {Promise<boolean>} true=확인, false=취소
 */
function _showConfirm(opts){
  return new Promise(resolve => {
    const msgEl = document.getElementById('ct-confirm-msg');
    const okBtn = document.getElementById('ct-confirm-ok-btn');
    const cancelBtn = document.getElementById('ct-confirm-cancel-btn');

    msgEl.textContent = opts.message;
    okBtn.textContent = opts.okText || '확인';
    okBtn.className = 'btn ' + (opts.okClass || 'btn-primary');
    okBtn.style.background = opts.okClass ? '' : '#d97706';
    cancelBtn.textContent = opts.cancelText || '취소';

    // 클릭 핸들러 등록 (살짝 지연시켜 모달 close 애니메이션 완료 후 resolve)
    okBtn.onclick = () => { closeModal('ct-confirm-modal'); setTimeout(() => resolve(true), 100); };
    cancelBtn.onclick = () => { closeModal('ct-confirm-modal'); setTimeout(() => resolve(false), 100); };

    openModal('ct-confirm-modal');
  });
}

// ==============================================================================
// 계약 내용 수정 및 재발행
// ==============================================================================

// 수정 모드로 진입: readonly 해제 → amend 패널 표시 → 필드 변경 감지 시작
function doContractAmend(){
  const modalEl = document.querySelector('#contract-modal .modal');
  if(!modalEl) return;

  // 계약예정: 시작일 당일부터 수정 불가
  const _amendC = allContracts.find(x => x.id === editId.contract);
  if(_amendC && _amendC.status===CONTRACT_STATUS.PENDING){
    const _today = new Date().toISOString().slice(0,10);
    if(_amendC.contract_start && _today >= _amendC.contract_start){
      toast(`계약 시작일(${_amendC.contract_start}) 이후에는 예정 계약을 수정할 수 없습니다.`, 'error');
      return;
    }
  }

  // readonly 클래스 제거 + 필드 활성화
  modalEl.classList.remove('ct-readonly');
  const bodyEl = modalEl.querySelector('.modal-body');
  if(bodyEl) bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    el.disabled = false;
    el.tabIndex = 0;
    el.style.pointerEvents = '';
    el.style.background = '';
    el.style.color = '';
    el.style.cursor = '';
  });
  // 지급유형 버튼 + 휴게시간 추가 버튼 재활성화
  if(bodyEl){
    bodyEl.querySelectorAll('.pi-pay-type-btn').forEach(btn=>{
      btn.disabled = false;
      btn.style.cursor = '';
      btn.style.pointerEvents = '';
    });
    bodyEl.querySelectorAll('.btn-brk-add').forEach(btn=>{
      btn.disabled = false;
      btn.style.cursor = '';
      btn.style.pointerEvents = '';
    });
  }

  // 액션 버튼 숨김 (수정 중에는 다른 액션 불가)
  ['ct-btn-amend','ct-btn-amend2','ct-btn-renew','ct-btn-renew2',
   'ct-btn-terminate','ct-btn-terminate2','ct-btn-recontract','ct-btn-recontract2'].forEach(bid=>{
    const el = document.getElementById(bid); if(el) el.style.display='none';
  });

  // 갱신 패널·버튼 숨김
  const renewPanel = document.getElementById('ct-renew-panel');
  if(renewPanel) renewPanel.style.display = 'none';
  const _btnRenewC2 = document.getElementById('ct-btn-renew-complete2');
  if(_btnRenewC2) _btnRenewC2.style.display = 'none';
  const _btnRenewX2 = document.getElementById('ct-btn-renew-cancel2');
  if(_btnRenewX2) _btnRenewX2.style.display = 'none';

  // 하단 수정완료·취소 버튼 표시
  const btnComplete2 = document.getElementById('ct-btn-amend-complete2');
  if(btnComplete2) btnComplete2.style.display = 'inline-flex';
  const btnCancel2 = document.getElementById('ct-btn-amend-cancel2');
  if(btnCancel2) btnCancel2.style.display = 'inline-flex';

  // 수정 안내 패널 표시
  const panel = document.getElementById('ct-amend-panel');
  if(panel) panel.style.display = '';

  // 첨부서류 섹션 숨김 (수정 모드에서는 불필요)
  const filesSection = document.getElementById('ct-files-section');
  if(filesSection) filesSection.style.display = 'none';

  // 단계바 표시 (수정 진행 상황 안내)
  const stepBar = document.getElementById('ct-step-bar');
  if(stepBar) stepBar.style.display = '';
  setContractStep(1);

  // 일괄설정 바 표시
  const bulkBar = document.getElementById('ct-bulk-bar-wrap');
  if(bulkBar) bulkBar.style.display = '';

  // 수정완료 버튼 초기 상태 설정 + 최저임금 경고 초기 평가
  _checkMinWageWarning();
  _checkAmendBtnState();

  // ── 상태 배너 숨김 (amend 패널과 하단 버튼으로 대체) ──
  const sbEl = document.getElementById('ct-status-banner');
  if(sbEl) sbEl.style.display = 'none';

  // 필드 변경 감지 → 수정완료 버튼 재평가
  if(bodyEl) bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('input',  _checkAmendBtnState);
    el.addEventListener('change', _checkAmendBtnState);
  });
}

// 수정 취소: viewContract()로 복원
function cancelContractAmend(){
  const cid = editId.contract;
  if(!cid) return;
  viewContract(cid);
}

// 수정완료 버튼 활성화 여부 판단 (수정 모드 전용)
// 수정 완료 후 재발행 미리보기 모달 열기
async function openAmendPreview(){
  if(!editId.contract) return;
  // 유효성 재확인
  if(_ctValidate()) return;

  const origId = editId.contract;
  const origC  = allContracts.find(x => x.id === origId);
  if(!origC){ toast('원본 계약 정보를 찾을 수 없습니다.', 'error'); return; }

  // 계약서 HTML 생성
  let html;
  try { html = generateContractHTML(); }
  catch(e){ console.error('[openAmendPreview] generateContractHTML 오류:', e); toast('계약서 미리보기 생성 중 오류가 발생했습니다.', 'error'); return; }

  // ── 즉시 DB 저장 ──
  const nowISO = new Date().toISOString();
  const _isPendingAmend = origC.status===CONTRACT_STATUS.PENDING;

  // ① 원본 파기 (계약예정이 아닌 경우만)
  if(!_isPendingAmend){
    try {
            const patchResp = await fetch(`../tables/contracts/${origId}`, {
              method : 'PATCH',
              headers: {'Content-Type':'application/json'},
              body   : JSON.stringify({ status: CONTRACT_STATUS.VOIDED, is_voided_by_amend:true, voided_at:nowISO })
            });
            if(!patchResp.ok) throw new Error(`원본 파기 실패 (HTTP ${patchResp.status})`);
      const origIdx = allContracts.findIndex(x => x.id === origId);
      if(origIdx !== -1){
        allContracts[origIdx].status             = CONTRACT_STATUS.VOIDED;
        allContracts[origIdx].is_voided_by_amend = true;
        allContracts[origIdx].voided_at          = nowISO;
      }
    } catch(e){
      console.error('[원본 파기 처리 오류]', e);
      toast('원본 계약서 파기 처리에 실패했습니다.', 'error');
      return;
    }
  }

  // ② 수정 내용 수집
  const coId    = document.getElementById('ct-company').value;
  const empId   = origC.employee_id;
  const start   = document.getElementById('ct-start').value;
  const end     = document.getElementById('ct-end').value;
  const cTypeRaw   = document.getElementById('ct-type').value;
  const cType  = CONTRACT_TYPE_LEGACY_MAP[cTypeRaw] || cTypeRaw;
  const catTxtRaw = document.getElementById('ct-edit-em-category')?.value || cType;
  const catTxt  = CONTRACT_TYPE_LEGACY_MAP[catTxtRaw] || catTxtRaw;
  const isRegGrp= catTxt ===CONTRACT_TYPE.REGULAR || catTxt ===CONTRACT_TYPE.REGULAR_PROBATION;
  const isDailyA= catTxt ===CONTRACT_TYPE.DAILY;
  const isFixedA= catTxt ===CONTRACT_TYPE.FIXED || catTxt ===CONTRACT_TYPE.FIXED_PROBATION;
  const isProbA = catTxt ===CONTRACT_TYPE.REGULAR_PROBATION || catTxt ===CONTRACT_TYPE.FIXED_PROBATION;
  const hours_  = parseFloat(document.getElementById('ct-hours').value)||0;
  const days_   = parseFloat(document.getElementById('ct-days').value)||5;
  const base_   = isDailyA ? 0 : getAmountVal('ct-base');
  const dWage_  = isDailyA ? getAmountVal('ct-daily-wage') : 0;
  const annualSalInput_ = getAmountVal('ct-annual-sal');
  const annual_ = isRegGrp ? annualSalInput_ : 0;
  const wkHol_  = isDailyA ? 0 : Math.round(base_ / days_);  // 단시간 비례: ÷dpw
  const pos_    = getAmountVal('ct-position');
  const car_    = getAmountVal('ct-car');
  const meal_   = getAmountVal('ct-meal');
  const res_    = getAmountVal('ct-research');
  const other_  = getAmountVal('ct-other')||0;
  const regBonus_= getAmountVal('ct-regular-bonus')||0;
  const site_   = getAmountVal('ct-site')||0;
  const skill_  = getAmountVal('ct-skill')||0;
  const lic_    = getAmountVal('ct-license')||0;
  const comm_   = getAmountVal('ct-communication')||0;
  const fit_    = getAmountVal('ct-fitness')||0;
  const sdev_   = getAmountVal('ct-self-dev')||0;
  const book_   = getAmountVal('ct-book')||0;
  const ovseas_ = getAmountVal('ct-overseas')||0;
  const monthly_= isDailyA ? 0
    : isFixedA && annualSalInput_ > 0 ? annualSalInput_
    : isRegGrp && annual_ > 0         ? Math.round(annual_ / 12)
    : (base_+wkHol_+pos_+car_+meal_+res_+other_+site_+skill_+lic_+comm_+fit_+sdev_+book_+ovseas_);
  // 통상시급 = 월 통상임금 ÷ 법령 기준 산정시간 (근로기준법 시행령 제6조 제2항)
  const hWage_  = monthly_>0 ? Math.round(monthly_/_calcMonthlyStdHours(hours_,days_)) : (dWage_>0&&hours_>0 ? Math.round(dWage_/hours_) : 0);

  const commonFields = {
    employee_id:'', company_id:coId, contract_start:start, contract_end:end, contract_type:cType,
    probation_months: isProbA?(parseInt(document.getElementById('ct-probation-months').value)||3):0,
    probation_pct:    isProbA?(parseFloat(document.getElementById('ct-probation-pct').value)||0):0,
    probation_amt:    isProbA?(parseFloat(document.getElementById('ct-probation-amt').value)||0):0,
    probation_basis:  isProbA?(document.querySelector('input[name="ct-probation-basis"]:checked')?.value||'salary'):'salary',
    work_hours_per_day: hours_, work_days_per_week: isDailyA?0:days_,
    schedule_json: (() => {
      const _newSch = getScheduleJSON();
      const _hasActive = Array.isArray(_newSch) && _newSch.some(d => d.active);
      return _hasActive ? JSON.stringify(_newSch) : (origC.schedule_json || JSON.stringify(_newSch));
    })(),
    annual_leave_days: isDailyA?0:(parseFloat(document.getElementById('ct-annual').value)||15),
    annual_salary: annual_, monthly_salary_agreed: monthly_, base_salary: base_,
    daily_wage: dWage_, weekly_holiday_pay: wkHol_, hourly_wage: hWage_,
    position_allowance: pos_,
    transportation_allowance: car_, transportation_pay_type: _getCTPayTypeVal('car'),
    self_driving_allowance:0, self_driving_pay_type:'fixed',
    remote_area_allowance: getAmountVal('ct-remote-area'), remote_area_pay_type:'fixed',
    meal_allowance: meal_, meal_pay_type: _getCTPayTypeVal('meal'),
    research_allowance: res_,
    research_pay_type: _getCTPayTypeVal('research'),
    site_allowance: site_, skill_allowance: skill_, license_allowance: lic_,
    communication_allowance: comm_, communication_pay_type: _getCTPayTypeVal('communication'),
    fitness_allowance: fit_, fitness_pay_type: _getCTPayTypeVal('fitness'),
    self_dev_allowance: sdev_, self_dev_pay_type: _getCTPayTypeVal('self_dev'),
    book_allowance: book_, book_pay_type: _getCTPayTypeVal('book'),
    overseas_allowance: ovseas_, overseas_pay_type: _getCTPayTypeVal('overseas'),
    regular_bonus: regBonus_,
    childcare_allowance: getAmountVal('ct-childcare')||0,
    childcare_dependents: parseInt(document.getElementById('ct-childcare-dependents')?.value||0)||0,
    pay_period: document.getElementById('ct-pay-period')?.value.trim() || '',
    pay_period_month: document.getElementById('ct-pay-period-month-hidden')?.value || null,
    pay_period_day: parseInt(document.getElementById('ct-pay-period-day-hidden')?.value) || null,
    pay_day: parseInt(document.getElementById('ct-pay-day')?.value) || null,
    car_maintenance: car_,
    insurance_employment: origC.insurance_employment!==undefined ? origC.insurance_employment : true,
    insurance_industrial: origC.insurance_industrial!==undefined ? origC.insurance_industrial : true,
    insurance_pension:    origC.insurance_pension!==undefined    ? origC.insurance_pension    : true,
    insurance_health:     origC.insurance_health!==undefined     ? origC.insurance_health     : true,
    note: document.getElementById('ct-note').value,
    salary_start_date: start, salary_end_date:'', is_draft:false, draft_saved_at:null,
  };
  commonFields.employee_id = empId;

  let newContractId;

  if(_isPendingAmend){
    // 계약예정: 기존 레코드 PUT 덮어쓰기
    const putBody = {
      ...commonFields,
      status: CONTRACT_STATUS.PENDING, amended_from: origC.amended_from||null, is_voided_by_amend:false,
      signed_file_name: origC.signed_file_name||'', signed_file_data: origC.signed_file_data||'',
      consent_file_name: origC.consent_file_name||'', consent_file_data: origC.consent_file_data||'',
    };
    try {
      const res = await fetch(`../tables/contracts/${origId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(putBody)
      });
      const saved = await res.json();
      newContractId = saved.id || origId;
      const idx = allContracts.findIndex(x => x.id === origId);
      if(idx !== -1) allContracts[idx] = { ...allContracts[idx], ...putBody };
    } catch(e){
      console.error('[계약예정 수정 저장 오류]', e);
      toast('계약 수정 저장에 실패했습니다.', 'error');
      return;
    }
    // 계약예정 수정은 모달 없이 즉시 완료
    closeModal('contract-modal');
    await loadContracts(); await loadEmployees();
    renderContracts(); renderDashboard();
    toast('예정 계약이 수정되었습니다. ✔', 'success');
    return;
  }

  // ③ 신규 계약서 POST (수정 재발행) — ID는 서버에서 UUID 생성
  const newStatus = '서류미비'; // 날인본 없이 저장 → 발송 후 날인본 별도 첨부
  const newBody = {
    ...commonFields,
    status: newStatus,
    amended_from: origId, is_voided_by_amend: false,
    // 계약서 날인본: 수정 시 반드시 재업로드 필요 → 초기화
    signed_file_name: '',
    signed_file_data: '',
    // 제3자정보제공 동의서 날인본: 원본 계약에서 복사
    consent_file_name: origC.consent_file_name||'',
    consent_file_data: origC.consent_file_data||'',
  };
  try {
    const saved = await fetch('../tables/contracts', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newBody)
    });
    if(!saved.ok){
      const errData = await saved.json().catch(()=>({}));
      throw new Error(errData.error || `HTTP ${saved.status}`);
    }
    const savedJson = await saved.json();
    newContractId = savedJson.id;
    allContracts.push({ ...newBody, id: newContractId });
  } catch(e){
    console.error('[재발행 계약서 저장 오류]', e);
    toast('재발행 계약서 저장에 실패했습니다.', 'error');
    return;
  }

  // ④ 발송 이력 기록
  const _emp = allEmployees.find(e => e.id === empId) || {};
  const _co  = allCompanies.find(x => x.id === coId)  || {};
  await _saveDispatchRecord({
    method:'수정재발행', status: DISPATCH_STATUS.COMPLETED, recipient: _emp.phone||_emp.email||'',
    note: `계약 내용 수정 후 재발행 완료 (원본 ID: ${origId})`, contractId: newContractId,
  });

  // ⑤ 고객사 인앱 알림
  const _coRep = getCompanyRepGreeting(_co);
  const _fmtD  = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
  await _sendCompanyNotice({
    companyId:coId, companyName:_co.company_name||'', noticeType:'contract_voided',
    title:`[계약 파기] ${_emp.name||''} — 기존 계약이 파기되었습니다 (수정재발행)`,
    body:`안녕하세요${_coRep}.\n\n소속 근로자의 기존 근로계약이 수정재발행으로 인해 파기 처리되었습니다.\n\n■ 근로자: ${_emp.name||''}\n■ 파기된 계약 기간: ${_fmtD(origC.contract_start)}${origC.contract_end?' ~ '+_fmtD(origC.contract_end):''}\n■ 처리 일시: ${new Date().toLocaleString('ko-KR')}\n\n새 계약이 동시에 발행되었습니다. 자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.\n\n${_BRAND_SIG}`,
    contractId:origId, employeeId:empId, employeeName:_emp.name||'', contractEnd:origC.contract_end||'',
  });
  await _sendCompanyNotice({
    companyId:coId, companyName:_co.company_name||'', noticeType:'contract_amended',
    title:`[계약 수정재발행] ${_emp.name||''} — 수정된 새 계약이 발행되었습니다`,
    body:`안녕하세요${_coRep}.\n\n소속 근로자의 수정재발행 근로계약이 완료되었습니다.\n\n■ 근로자: ${_emp.name||''}\n■ 고용형태: ${cType}\n■ 새 계약 기간: ${_fmtD(start)}${end?' ~ '+_fmtD(end):' (기간 미정)'}\n■ 처리 일시: ${new Date().toLocaleString('ko-KR')}\n\n자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.\n\n${_BRAND_SIG}`,
    contractId:newContractId, employeeId:empId, employeeName:_emp.name||'', contractEnd:end,
  });

  // ⑥ 목록 갱신
  await loadContracts(); await loadEmployees();
  renderContracts(); renderDashboard();

  // ⑦ 계약서 조회 모달(contract-print-modal)을 그대로 재사용 — 수정 재발행 완료 배너 삽입 후 오픈
  window._isAmendMode = false;
  window._amendNewContractId = null;
  window._amendFromContractModal = true; // closeContractPrintModal 시 contract-modal도 함께 닫기
  _openAmendResultModal(newContractId);
}

/**
 * 수정 재발행 완료 후 계약서 조회 UI(contract-print-modal)를 열고
 * 툴바 상단에 "수정 재발행 완료" 안내 배너를 추가합니다.
 */
function _openAmendResultModal(newContractId){
  // 기존 배너 제거
  const oldBanner = document.getElementById('cpm-amend-banner');
  if(oldBanner) oldBanner.remove();

  // 저장 완료 배너 생성 후 툴바 위에 삽입
  const modal = document.getElementById('contract-print-modal');
  const toolbar = modal ? modal.querySelector('[style*="f8fafc"]') : null;
  if(toolbar){
    const banner = document.createElement('div');
    banner.id = 'cpm-amend-banner';
    banner.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 20px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-bottom:1.5px solid #86efac;flex-shrink:0;';
    banner.innerHTML = '<i class="fas fa-check-circle" style="color:#16a34a;font-size:16px;flex-shrink:0;"></i>'
      + '<span style="font-size:12.5px;font-weight:700;color:#15803d;">수정 재발행 완료</span>'
      + '<span style="font-size:12px;color:#166534;margin-left:4px;">— 기존 계약서는 파기 처리되었습니다. 아래에서 수정된 계약서를 발송해 주세요.</span>';
    toolbar.parentNode.insertBefore(banner, toolbar);
  }

  // contract-print-modal 열기 (기존 함수 그대로 재사용 — PDF·인쇄·알림톡·이메일·수동교부 포함)
  openContractPrintModal(newContractId);
}

// ──────────────────────────────────────────────────────────────────────────────
// finalAmendContract() — 하위호환용 stub (더 이상 사용 안 함, openAmendPreview로 통합)
// ──────────────────────────────────────────────────────────────────────────────
async function finalAmendContract(){
  // 더 이상 사용되지 않습니다. openAmendPreview()에서 즉시 저장 처리합니다.
  toast('수정 재발행은 수정완료 버튼 클릭 시 자동 저장됩니다.', 'warning');
}
