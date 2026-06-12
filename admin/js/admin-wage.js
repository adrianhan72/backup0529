// ─── WAGE LEDGER (임금대장) ───
let _wlCompanyId = null;
let _wlCompanyName = '';

/* ════════════════════════════════════════════════════════════════
   updateMenuBadges()
   대시보드 배너 건수를 읽어 좌측 메뉴 뱃지에 반영
   ━ 배너 div의 display:none 여부 + 건수 텍스트를 파싱해서 표시
   ═══════════════════════════════════════════════════════════════ */
function updateMenuBadges(){
  // 뱃지 설정 헬퍼
  function _setBadge(id, count){
    const el = document.getElementById(id);
    if(!el) return;
    if(count > 0){
      el.textContent = String(count);
      el.style.display = 'inline-flex';
    } else {
      el.style.display = 'none';
    }
  }

  // 0) 고객사 임시저장 미완료 → companies (계약서 임시저장은 포함하지 않음)
  const draftCompanyCount = (allCompanies||[]).filter(c => !!c.is_draft).length;
  _setBadge('badge-companies', draftCompanyCount);

  // ── heavy 데이터 로드 완료 여부 판별 ──
  // loadHeavyData() Promise.all 완료 후 _heavyDataReady=true 로 설정됨.
  // 그 전에 호출되면 _contractDispatchList·_allSendLogs·allPayrolls 등이 빈 배열 상태이므로
  // 해당 뱃지들은 과다/과소 집계됨 → heavy 데이터 의존 항목은 로드 완료 전 skip.
  const _heavyReady = typeof _heavyDataReady !== 'undefined' && _heavyDataReady;

  // 1) 근로계약서 미발송 → contract-dispatch
  // _contractDispatchList(발송 이력)가 heavy 데이터 → 로드 전에는 sentIds=Set([])이 되어 과다 집계
  if(_heavyReady){
    const unsentList = typeof _cdpGetUnsentContracts === 'function' ? _cdpGetUnsentContracts() : [];
    _setBadge('badge-contract-dispatch', unsentList.length);
  }

  // 2) 급여명세서 미발송 → payslip-send
  // _allSendLogs·allPayrolls 모두 heavy 데이터 → 로드 전에는 미발송=전체급여건수로 과다 집계
  if(_heavyReady){
    const sentPayrollIds = new Set((_allSendLogs||[]).map(l => l.payroll_id));
    const unsentPayrolls = (allPayrolls||[]).filter(p => !sentPayrollIds.has(p.id)).length;
    _setBadge('badge-payslip-send', unsentPayrolls);
  }

  // 3) 계약서 날인본 미등록 + 제3자동의서 미등록 + 근로계약서 임시저장 → contracts (합산)
  // allContracts는 critical path 데이터 → 항상 정확하게 계산 가능
  const missingSign = (allContracts||[]).filter(c =>
    !c.is_draft && (c.status === '활성' || c.status === '계약예정') && !c.signed_file_name
  ).length;
  const missingConsent = (allContracts||[]).filter(c =>
    !c.is_draft && (c.status === '활성' || c.status === '계약예정') && !c.consent_file_name
  ).length;
  const draftContractCount = (allContracts||[]).filter(c => !!c.is_draft).length;
  _setBadge('badge-contracts', missingSign + missingConsent + draftContractCount);

  // 4) 계약만료 통지 → contract-expiry-notice
  // _cenNoticeList(통지 이력)가 heavy 데이터 → 로드 전에는 "이미 통지된 계약" 필터 미작동 → 과다 집계
  if(typeof _cenHistoryLoaded !== 'undefined' && !_cenHistoryLoaded){
    // loadHeavyData() 완료 후 updateMenuBadges() 재호출 시 올바른 값으로 갱신됨
  } else {
    const expiryTargets = typeof _cenGetTargetContracts === 'function' ? _cenGetTargetContracts() : [];
    _setBadge('badge-contract-expiry-notice', expiryTargets.length);
  }

  // 5) 정규직 전환 의무 대상 → regular-conversion
  // allContracts 기반 계산 → critical path 완료 후 정확 (heavy 데이터 불필요)
  const regularList = typeof _calc2YrExceedList === 'function'
    ? _calc2YrExceedList().filter(x => x.status === 'exceeded')
    : [];
  _setBadge('badge-regular-conversion', regularList.length);

  // 5-1) 해고 시 서면통지 대상자 수 → probation-mgmt 뱃지
  // 수습기간 3개월 초과 + 만료일까지 30일 이상 남은 인원
  const probTargets = typeof _getProbationAllTargets === 'function'
    ? _getProbationAllTargets().filter(t => t.probMonths > 3 && t.daysLeft >= 30)
    : [];
  _setBadge('badge-probation-mgmt', probTargets.length);

  // 6) 퇴직급여 지급 발생 → severance
  // allSeveranceNotices는 heavy 데이터 → 로드 전에는 빈 배열이므로 뱃지=0으로 표시됨
  // (과다가 아닌 과소 집계지만 일관성을 위해 동일하게 guard)
  if(_heavyReady){
    _setBadge('badge-severance', (allSeveranceNotices||[]).length);
  }

  // 7) 급여 입력 임시저장 미완료 → payroll-input
  // allPayrolls는 heavy 데이터이므로 로드 완료 후에만 정확히 집계
  if(_heavyReady){
    const draftPayrollCount = (allPayrolls||[]).filter(p => !!p.is_draft).length;
    _setBadge('badge-payroll-input', draftPayrollCount);
  }
}

// ── 임금대장 메뉴 뱃지 업데이트 ──
function _updateWLMenuBadge(){
  const menuItem = document.querySelector('[data-page="wage-ledger"]');
  if(!menuItem) return;
  // 기존 뱃지 제거
  menuItem.querySelectorAll('.wl-menu-badge').forEach(el=>el.remove());
  const unreadCount = allWLNotifications.filter(n=>!n.is_read).length;
  if(unreadCount > 0){
    const badge = document.createElement('span');
    badge.className = 'wl-menu-badge';
    badge.textContent = 'N';
    badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#e94560;color:#fff;font-size:10px;font-weight:800;border-radius:10px;padding:1px 6px;margin-left:6px;letter-spacing:0;line-height:1.4;vertical-align:middle;';
    menuItem.appendChild(badge);
  }
}

// ── 급여 전체 입력 완료 여부 확인 → 알림 생성 ──
async function _checkWageLedgerComplete(companyId, year, month){
  // 열람 대상 월의 첫날·말일
  const mStart = new Date(year, month - 1, 1).toISOString().slice(0,10);
  const mEnd   = new Date(year, month, 0).toISOString().slice(0,10);

  // 해당 월에 유효했던 계약 중 서류완비(is_draft=false, signed+consent) 직원
  const validContracts = allContracts.filter(ct => {
    if(ct.company_id !== companyId) return false;
    if(ct.is_draft) return false;
    if(ct.is_voided_by_amend) return false;
    if(!(ct.signed_file_data) || !(ct.consent_file_data)) return false;
    const s = ct.contract_start || '';
    const e = ct.contract_end   || '';
    if(s && s > mEnd)   return false;
    if(e && e < mStart) return false;
    return true;
  });
  const validEmpIds = [...new Set(validContracts.map(ct => ct.employee_id))];
  if(validEmpIds.length === 0) return; // 유효 계약 없음

  // 해당 년월에 입력된 급여 직원 목록 (임시저장 제외)
  const inputtedEmpIds = new Set(
    allPayrolls
      .filter(p => !p.is_draft && p.company_id === companyId && Number(p.pay_year)===year && Number(p.pay_month)===month)
      .map(p => p.employee_id)
  );
  const allInputted = validEmpIds.every(id => inputtedEmpIds.has(id));
  if(!allInputted) return; // 아직 미입력 직원 있음

  // ── 모든 직원 급여 입력 완료! ──
  // 이미 해당 년월 알림이 존재하는지 확인 (중복 방지)
  const existingNotif = allWLNotifications.find(n =>
    n.company_id === companyId && Number(n.pay_year)===year && Number(n.pay_month)===month
  );
  // DB 전체 조회로 중복 체크 (allWLNotifications는 미확인만 담을 수 있으므로)
  const checkRes = await api(`../tables/wage_ledger_notifications?limit=500`);
  const allNotifs = checkRes.data || [];
  const alreadyExists = allNotifs.find(n =>
    n.company_id === companyId && Number(n.pay_year)===year && Number(n.pay_month)===month
  );
  if(alreadyExists){
    // 이미 존재하면 is_read=false로 리셋 (재입력 완료 시 다시 N 표시)
    await api(`../tables/wage_ledger_notifications/${alreadyExists.id}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({is_read:false})
    });
  } else {
    // 신규 알림 생성
    await api('../tables/wage_ledger_notifications',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        id:'wln'+Date.now(),
        company_id:companyId,
        pay_year:year,
        pay_month:month,
        is_read:false
      })
    });
  }
  // 캐시 갱신 + 뱃지 업데이트
  await loadWLNotifications();
  _updateWLMenuBadge();
  // 임금대장 페이지가 열려있으면 칩 목록도 갱신
  if(document.getElementById('page-wage-ledger')?.classList.contains('active')){
    renderWLCompanyList();
  }
  // 완료 토스트
  const co = allCompanies.find(x=>x.id===companyId);
  toast(`📋 ${co?.company_name||''} ${year}년 ${month}월 임금대장이 생성되었습니다!`, 'success');
}

function renderWLCompanyList(){
  const q = (document.getElementById('wl-company-search')?.value || '').toLowerCase();
  const chips = document.getElementById('wl-company-chips');
  if(!chips) return;
  const list = allCompanies.filter(c =>
    !c.is_draft && c.status === '이용중' && (!q || (c.company_name||'').toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'','ko'));
  if(!list.length){
    chips.innerHTML = `<div style="font-size:12.5px;color:#9ca3af;padding:8px 0;">${q ? `"${q}" 검색 결과가 없습니다` : '이용 중인 고객사가 없습니다'}</div>`;
    return;
  }
  chips.innerHTML = list.map(c => {
    const isSel = c.id === _wlCompanyId;
    const hasNew = allWLNotifications.some(n => n.company_id === c.id && !n.is_read);
    const newBadge = hasNew
      ? `<span class="co-chip-badge new-dot">N</span>`
      : '';
    return `<button onclick="selectWLCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}');"
      class="co-chip${isSel?' selected':''}${hasNew&&!isSel?' has-new':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>${c.company_name}${newBadge}
    </button>`;
  }).join('');
}

function selectWLCompany(id, name){
  _wlCompanyId = id;
  _wlCompanyName = name;
  currentGlobalCompanyId = id;  // 글로벌 공유 동기화
  document.getElementById('wl-company-select-card').style.display = 'none';
  document.getElementById('wl-main-section').style.display = '';
  document.getElementById('wl-selected-company-label').innerHTML =
    `<i class="fas fa-building" style="margin-right:6px;"></i>${name}`;
  _initWLFilters();
  // 급여 데이터 로드 완료 여부에 따라 필터 활성/비활성화
  _setWLFilterReady(_heavyDataReady);
  renderWageLedger();
  // 해당 고객사의 미확인 알림 → 읽음 처리 (비동기, UI는 즉시 업데이트)
  _markWLNotificationsRead(id);
}

// 해당 고객사 임금대장 알림을 모두 읽음 처리
async function _markWLNotificationsRead(companyId){
  const unread = allWLNotifications.filter(n => n.company_id === companyId && !n.is_read);
  if(!unread.length) return;
  // 로컬 캐시 즉시 업데이트 (UI 반응성)
  allWLNotifications = allWLNotifications.filter(n => n.company_id !== companyId);
  _updateWLMenuBadge();
  renderWLCompanyList(); // 칩 뱃지 즉시 제거
  // DB 읽음 처리 (병렬)
  await Promise.all(unread.map(n =>
    api(`../tables/wage_ledger_notifications/${n.id}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({is_read:true})
    })
  ));
}

// 임금대장 차단 UI → 급여 입력 페이지로 이동 (해당 고객사 + 해당 연월 선택)
// 임금대장 → 급여 입력 이동 (임시저장 여부 확인 후 모달 또는 직행)
let _wlPendingEmpId = null; // 모달 대기 중 직원 ID

function _wlGoToPayInput(empId){
  const yr = parseInt(document.getElementById('wl-year-filter')?.value);
  const mo = parseInt(document.getElementById('wl-month-filter')?.value);

  // 해당 직원의 해당 월 임시저장 급여 존재 여부 확인
  const draftRec = (allPayrolls || []).find(p =>
    p.employee_id === empId &&
    Number(p.pay_year) === yr &&
    Number(p.pay_month) === mo &&
    !!p.is_draft
  );

  if(draftRec){
    // 임시저장 있음 → 모달 표시
    _wlPendingEmpId = empId;
    const emp = allEmployees.find(e => e.id === empId);
    const empName = emp?.name || empId;
    const savedAt = draftRec.draft_saved_at
      ? new Date(draftRec.draft_saved_at).toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})
      : '';
    const infoEl = document.getElementById('wl-resume-modal-info');
    if(infoEl) infoEl.innerHTML =
      `<strong>${empName}</strong> · ${yr}년 ${mo}월분 급여<br>` +
      (savedAt ? `저장일시: ${savedAt}` : '');
    document.getElementById('wl-resume-modal').style.display = 'flex';
  } else {
    // 임시저장 없음 → 바로 이동
    _wlNavigateToPayInput(empId, yr, mo, false);
  }
}

function closeWLResumeModal(){
  document.getElementById('wl-resume-modal').style.display = 'none';
  _wlPendingEmpId = null;
}

// 이어서 작성 버튼
function _wlResumeDraft(){
  const empId = _wlPendingEmpId;
  const yr    = parseInt(document.getElementById('wl-year-filter')?.value);
  const mo    = parseInt(document.getElementById('wl-month-filter')?.value);
  closeWLResumeModal();
  _wlNavigateToPayInput(empId, yr, mo, true);   // resume=true → 임시저장 불러오기
}

// 초기화 후 새로 작성 버튼
function _wlFreshInput(){
  const empId = _wlPendingEmpId;
  const yr    = parseInt(document.getElementById('wl-year-filter')?.value);
  const mo    = parseInt(document.getElementById('wl-month-filter')?.value);
  closeWLResumeModal();
  _wlNavigateToPayInput(empId, yr, mo, false);  // resume=false → 새로 작성
}

// 실제 급여 입력 페이지 이동 공통 함수
function _wlNavigateToPayInput(empId, yr, mo, resume){
  showPage('payroll-input', document.querySelector('[data-page="payroll-input"]'));
  setTimeout(() => {
    // 연월 설정
    const yrEl = document.getElementById('pi-year');
    const moEl = document.getElementById('pi-month');
    if(yrEl && yr) yrEl.value = yr;
    if(moEl && mo) moEl.value = mo;
    // 고객사 자동 선택
    const co = allCompanies.find(c => c.id === _wlCompanyId);
    if(co) selectPICompany(_wlCompanyId, co.company_name);
    // 직원 선택 + 임시저장 처리
    setTimeout(() => {
      const empSel = document.getElementById('pi-employee');
      if(empSel && empId){
        empSel.value = empId;
        loadPIContract();
        // 임시저장 불러오기 처리
        setTimeout(() => {
          if(resume){
            // 이어서 작성: 임시저장 폼 복원
            const draftRec = (allPayrolls || []).find(p =>
              p.employee_id === empId &&
              Number(p.pay_year) === yr &&
              Number(p.pay_month) === mo &&
              !!p.is_draft
            );
            if(draftRec){
              piDraftId = draftRec.id;
              loadPIDraft();
            }
          } else {
            // 새로 작성: 임시저장 레코드가 있으면 piDraftId만 연결(덮어쓰기용), 폼은 초기화 유지
            const draftRec = (allPayrolls || []).find(p =>
              p.employee_id === empId &&
              Number(p.pay_year) === yr &&
              Number(p.pay_month) === mo &&
              !!p.is_draft
            );
            if(draftRec) piDraftId = draftRec.id; // 저장 시 기존 draft에 덮어쓰기
          }
        }, 350);
      }
    }, 200);
  }, 150);
}

function clearWLCompanySelect(){
  _wlCompanyId = null;
  _wlCompanyName = '';
  currentGlobalCompanyId = null;  // 글로벌 공유 초기화
  document.getElementById('wl-company-select-card').style.display = '';
  document.getElementById('wl-main-section').style.display = 'none';
  document.getElementById('wl-company-search').value = '';
  renderWLCompanyList();
  // 고객사 선택 해제 시 버튼 비활성화
  ['.wl-excel-btn','.wl-pdf-btn','.wl-print-btn'].forEach(sel=>{
    const btn=document.querySelector(sel);
    if(!btn) return;
    btn.disabled=true; btn.style.opacity='0.4';
    btn.style.cursor='not-allowed'; btn.style.pointerEvents='none';
  });
}

function _initWLFilters(){
  const now = new Date();
  const yrSel = document.getElementById('wl-year-filter');
  const moSel = document.getElementById('wl-month-filter');
  if(!yrSel || !moSel) return;
  // 연도 옵션 (최근 3년)
  if(!yrSel.options.length){
    const curYr = now.getFullYear();
    for(let y = curYr; y >= curYr - 2; y--){
      const o = document.createElement('option');
      o.value = y; o.textContent = y + '년';
      yrSel.appendChild(o);
    }
  }
  // 월 옵션
  if(!moSel.options.length){
    for(let m = 1; m <= 12; m++){
      const o = document.createElement('option');
      o.value = m; o.textContent = m + '월';
      moSel.appendChild(o);
    }
  }
  yrSel.value = now.getFullYear();
  moSel.value = now.getMonth() + 1;
}

// 임금대장 필터 select 활성/비활성 + 로딩 안내 제어
function _setWLFilterReady(ready){
  const yrSel = document.getElementById('wl-year-filter');
  const moSel = document.getElementById('wl-month-filter');
  const area  = document.getElementById('wl-table-area');
  if(!yrSel || !moSel) return;
  if(ready){
    yrSel.disabled = false;
    moSel.disabled = false;
    yrSel.style.opacity = '';
    moSel.style.opacity = '';
    yrSel.title = '';
    moSel.title = '';
  } else {
    yrSel.disabled = true;
    moSel.disabled = true;
    yrSel.style.opacity = '0.45';
    moSel.style.opacity = '0.45';
    yrSel.title = '데이터 로드 중...';
    moSel.title = '데이터 로드 중...';
    if(area && _wlCompanyId){
      area.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:40px 20px;color:#64748b;font-size:13px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite;flex-shrink:0;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        <span>급여 데이터를 불러오는 중입니다. 잠시만 기다려 주세요...</span>
      </div>`;
    }
  }
}

function renderWageLedger(){
  const area = document.getElementById('wl-table-area');
  if(!area || !_wlCompanyId) return;

  // 아직 급여 데이터 로드 중이면 필터 비활성화 상태 유지 후 대기
  if(!_heavyDataReady){
    _setWLFilterReady(false);
    return;
  }

  const yr = parseInt(document.getElementById('wl-year-filter')?.value);
  const mo = parseInt(document.getElementById('wl-month-filter')?.value);

  // 해당 월 급여 데이터
  const pays = allPayrolls.filter(p =>
    p.company_id === _wlCompanyId &&
    Number(p.pay_year) === yr &&
    Number(p.pay_month) === mo
  );

  // 버튼 상태 헬퍼
  const _setWLBtns = enabled => {
    const excelBtn = document.querySelector('.wl-excel-btn');
    const pdfBtn   = document.querySelector('.wl-pdf-btn');
    const printBtn = document.querySelector('.wl-print-btn');
    [excelBtn, pdfBtn, printBtn].forEach(btn => {
      if(!btn) return;
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '' : '0.4';
      btn.style.cursor  = enabled ? '' : 'not-allowed';
      btn.style.pointerEvents = enabled ? '' : 'none';
    });
  };

  // ══════════════════════════════════════════════════════════
  //  선행 조건 검증 — 열람 대상 월(yr/mo)에 유효했던 계약 기준
  //  ① 해당 월에 유효했던 계약 중 임시저장 계약 없음
  //  ② 해당 월에 유효했던 계약 중 서류미비 계약 없음
  //  ③ 해당 월에 유효했던 계약 직원 전원의 급여 입력 완료
  //
  //  ★ "해당 월에 유효"의 정의:
  //     contract_start <= 대상월 말일
  //     AND (contract_end 없음 OR contract_end >= 대상월 1일)
  //     AND is_voided_by_amend != true (수정재발행으로 무효화된 계약 제외)
  // ══════════════════════════════════════════════════════════

  // 열람 대상 월의 첫날·말일 계산
  const targetMonthStart = new Date(yr, mo - 1, 1);          // 1일 00:00
  const targetMonthEnd   = new Date(yr, mo, 0);              // 말일 23:59
  const tmStartStr = targetMonthStart.toISOString().slice(0,10); // 'YYYY-MM-DD'
  const tmEndStr   = targetMonthEnd.toISOString().slice(0,10);

  // 해당 고객사의 모든 계약 목록
  const coContracts = allContracts.filter(c => c.company_id === _wlCompanyId);

  // 열람 대상 월에 유효했던 계약 필터 함수
  const wasActiveInMonth = c => {
    if(c.is_voided_by_amend) return false;          // 수정재발행으로 무효화된 계약 제외
    const start = c.contract_start || '';
    const end   = c.contract_end   || '';
    // contract_start 가 대상월 말일 이전이어야 함
    if(start && start > tmEndStr) return false;
    // contract_end 가 있으면 대상월 1일 이후이어야 함
    if(end && end < tmStartStr) return false;
    return true;
  };

  // 열람 대상 월에 유효했던 계약 전체
  const activeInMonth = coContracts.filter(wasActiveInMonth);

  // ① 해당 월에 유효했던 계약 중 임시저장
  const draftContracts = activeInMonth.filter(c => c.is_draft);

  // ② 해당 월에 유효했던 계약 중 서류미비
  //    (is_draft=false이고 날인본 또는 동의서 미등록)
  const docsIncomplete = activeInMonth.filter(c => {
    if(c.is_draft) return false;
    return !(c.signed_file_data) || !(c.consent_file_data);
  });

  // ③ 해당 월에 유효했던 계약 중 서류완비된 계약의 직원 → 급여 미입력 확인
  const validContracts = activeInMonth.filter(c =>
    !c.is_draft && !!(c.signed_file_data) && !!(c.consent_file_data)
  );
  const validEmpIds = [...new Set(validContracts.map(c => c.employee_id))];
  // 확정 저장된 급여 직원 집합 (is_draft=false 만)
  const confirmedPayEmpIds = new Set(pays.filter(p => !p.is_draft).map(p => p.employee_id));
  // 임시저장 급여만 있는 직원 집합
  const draftPayEmpIds = new Set(pays.filter(p => !!p.is_draft).map(p => p.employee_id));
  // 미입력 = 확정도 없고 임시저장도 없는 직원
  const missingPay     = validEmpIds.filter(eid => !confirmedPayEmpIds.has(eid) && !draftPayEmpIds.has(eid));
  // 임시저장만 있는 직원 (확정 저장 없음)
  const draftOnlyPay   = validEmpIds.filter(eid => !confirmedPayEmpIds.has(eid) &&  draftPayEmpIds.has(eid));

  // 하나라도 조건 미충족 → 차단 UI 표시
  const hasBlock = draftContracts.length > 0 || docsIncomplete.length > 0 || missingPay.length > 0 || draftOnlyPay.length > 0;

  if(hasBlock){
    _setWLBtns(false);

    // 사유 카드 HTML 생성 헬퍼
    const _empInitial = name => (name||'?').charAt(0);
    const _empInfo = id => {
      const e = allEmployees.find(x => x.id === id);
      return e ? { name: e.name, dept: e.department||'', pos: e.position||'' } : { name:'(미지정)', dept:'', pos:'' };
    };
    const _coName = _wlCompanyName || '';

    // 카드①: 임시저장 계약
    const draftCard = draftContracts.length === 0 ? '' : `
    <div class="wl-block-card">
      <div class="wl-block-card-head">
        <div class="wl-block-card-icon draft"><i class="fas fa-pencil-alt"></i></div>
        <div class="wl-block-card-title">${yr}년 ${mo}월 유효 계약 중 임시저장 — 최종 등록 필요</div>
        <span class="wl-block-card-badge draft">${draftContracts.length}건</span>
      </div>
      <div class="wl-block-item-list">
        ${draftContracts.map(c => {
          const ei = _empInfo(c.employee_id);
          return `<div class="wl-block-item">
            <div class="wl-block-item-left">
              <div class="wl-block-item-avatar">${_empInitial(ei.name)}</div>
              <div>
                <div class="wl-block-item-name">${ei.name}</div>
                <div class="wl-block-item-sub">${ei.dept}${ei.pos ? ' · '+ei.pos : ''} · 작성일: ${(c.updated_at ? new Date(c.updated_at).toLocaleDateString('ko-KR') : '-')}</div>
              </div>
            </div>
            <button class="wl-block-item-link draft" onclick="goDraftContract('${c.id}')">
              <i class="fas fa-edit"></i> 계속 작성 →
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    // 카드②: 서류미비 계약
    const docsCard = docsIncomplete.length === 0 ? '' : `
    <div class="wl-block-card">
      <div class="wl-block-card-head">
        <div class="wl-block-card-icon docs"><i class="fas fa-file-upload"></i></div>
        <div class="wl-block-card-title">${yr}년 ${mo}월 유효 계약 중 서류 미등록 — 날인본·동의서 첨부 필요</div>
        <span class="wl-block-card-badge docs">${docsIncomplete.length}건</span>
      </div>
      <div class="wl-block-item-list">
        ${docsIncomplete.map(c => {
          const ei = _empInfo(c.employee_id);
          const missSigned  = !c.signed_file_data;
          const missConsent = !c.consent_file_data;
          const missList = [
            missSigned  ? '계약서 날인본' : null,
            missConsent ? '개인정보 제3자 제공 동의서 날인본' : null,
          ].filter(Boolean).join(', ');
          return `<div class="wl-block-item">
            <div class="wl-block-item-left">
              <div class="wl-block-item-avatar">${_empInitial(ei.name)}</div>
              <div>
                <div class="wl-block-item-name">${ei.name}</div>
                <div class="wl-block-item-sub" style="color:#c2410c;">미등록: ${missList}</div>
              </div>
            </div>
            <button class="wl-block-item-link docs" onclick="viewContract('${c.id}')">
              <i class="fas fa-upload"></i> 서류 등록 →
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    // 카드③: 급여 미입력 + 임시저장 중 직원 통합 표시
    const allPayPending = [...draftOnlyPay, ...missingPay]; // 임시저장 먼저
    const payCard = allPayPending.length === 0 ? '' : (() => {
      const draftSet = new Set(draftOnlyPay);
      const rows = allPayPending.map(eid => {
        const ei       = _empInfo(eid);
        const isDraft  = draftSet.has(eid);
        const draftRec = isDraft ? pays.find(p => p.employee_id === eid && !!p.is_draft) : null;
        const savedAt  = draftRec?.draft_saved_at
          ? new Date(draftRec.draft_saved_at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
          : '';
        const subText  = isDraft
          ? `임시저장 중${savedAt ? '  ·  ' + savedAt : ''}`
          : (ei.dept || ei.pos ? (ei.dept + (ei.pos ? ' · '+ei.pos : '')) : '미입력');
        const subColor = isDraft ? '#15803d' : '#64748b';
        const btnCls   = isDraft ? 'pay-draft' : 'pay';
        const btnLabel = isDraft
          ? `<i class="fas fa-edit"></i> 이어서 입력 →`
          : `<i class="fas fa-keyboard"></i> 급여 입력 →`;
        const badge    = isDraft
          ? `<span class="wl-block-item-draft-badge"><i class="fas fa-save" style="font-size:9px;"></i> 임시저장</span>`
          : '';
        return `<div class="wl-block-item">
          <div class="wl-block-item-left">
            <div class="wl-block-item-avatar" style="${isDraft?'background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;':''}">${_empInitial(ei.name)}</div>
            <div>
              <div class="wl-block-item-name">${ei.name}${badge}</div>
              <div class="wl-block-item-sub" style="color:${subColor};">${subText}</div>
            </div>
          </div>
          <button class="wl-block-item-link ${btnCls}" onclick="_wlGoToPayInput('${eid}')">
            ${btnLabel}
          </button>
        </div>`;
      }).join('');

      const totalCnt  = allPayPending.length;
      const draftCnt  = draftOnlyPay.length;
      const missCnt   = missingPay.length;
      const badgeExtra = draftCnt > 0
        ? ` <span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:12px;background:#dcfce7;color:#15803d;margin-left:4px;">임시저장 ${draftCnt}명</span>`
        : '';

      return `<div class="wl-block-card">
        <div class="wl-block-card-head">
          <div class="wl-block-card-icon pay"><i class="fas fa-won-sign"></i></div>
          <div class="wl-block-card-title">${yr}년 ${mo}월 급여 미입력 직원${badgeExtra}</div>
          <span class="wl-block-card-badge pay">${totalCnt}명</span>
        </div>
        <div class="wl-block-item-list">${rows}</div>
      </div>`;
    })();

    area.innerHTML = `
    <div class="wl-block-wrap">
      <div class="wl-block-header">
        <div class="wl-block-header-icon">⚠️</div>
        <div class="wl-block-header-body">
          <div class="wl-block-header-title">임금대장을 표시할 수 없습니다</div>
          <div class="wl-block-header-sub">
            <strong>${yr}년 ${mo}월</strong> 기준으로 유효했던 계약과 급여 데이터가 모두 완비되어야 임금대장을 열람할 수 있습니다.<br>
            완료되지 않은 선행 작업을 클릭하여 바로 이동하세요.
          </div>
        </div>
      </div>
      ${draftCard}
      ${docsCard}
      ${payCard}
    </div>`;
    return;
  }

  // 유효 계약이 아예 없는 경우(신규 고객사 등) → 계약 없음 안내
  if(validEmpIds.length === 0 && !pays.length){
    area.innerHTML = `<div class="empty-state" style="padding:40px 0;">
      <i class="fas fa-file-contract" style="font-size:36px;color:#c7d2fe;margin-bottom:12px;"></i>
      <p style="color:#64748b;">유효한 근로계약이 없습니다.<br>
      <button class="wl-block-item-link docs" style="margin-top:10px;display:inline-flex;" onclick="showPage('contracts',document.querySelector('.menu-item[data-page=\\'contracts\\']'))">
        <i class="fas fa-plus"></i> 근로계약 등록하러 가기
      </button></p>
    </div>`;
    _setWLBtns(false);
    return;
  }

  if(!pays.length){
    area.innerHTML = `<div class="empty-state" style="padding:40px 0;"><i class="fas fa-table"></i><p>${yr}년 ${mo}월 급여 데이터가 없습니다.</p></div>`;
    _setWLBtns(false);
    return;
  }

  // 직원 정보 매핑
  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  // 합계 계산용
  const sumFields = [
    'base_salary','weekly_holiday_pay',
    'bonus_pay','meal_allowance','self_driving_allowance','transportation_allowance',
    'remote_area_allowance','research_allowance','childcare_allowance',
    'overtime_pay','night_pay','holiday_pay','annual_leave_pay',
    'position_allowance','site_allowance',
    'license_allowance','skill_allowance','communication_pay','performance_pay',
    'fitness_allowance','self_dev_allowance','book_allowance','overseas_allowance',
    'actual_expense_pay','etc_allowance','other_pay',
    'gross_pay',
    'national_pension','health_insurance','employment_insurance','long_term_care',
    'income_tax','local_income_tax',
    'year_end_tax_adjust','health_insurance_adjust',
    'advance_deduction','total_deduction','net_pay'
  ];
  const sums = {};
  sumFields.forEach(f => sums[f] = 0);

  const wonNum = v => (!v || v === 0) ? 0 : Number(v);
  const num    = v => { const n = Number(v); return (!v || n === 0) ? '-' : n.toLocaleString('ko-KR'); };

  // ══ 동적 헤더 테이블 렌더링 ══
  // 열 구성 (총 13열):
  //  C1: 사원번호  C2: 성명  C3~C8: 지급항목(6열)  C9~C12: 공제항목(4열)  C13: 영수인
  //
  // 지급항목은 고객사 allowance_config에 따라 활성 슬롯만 표시.
  // 슬롯을 6개씩 묶어 행으로 배치하고, 마지막 행의 마지막 슬롯은 항상 '지급합계'.
  // 최소 행 수는 인적사항(부서/직급/입사일/퇴사일) 4행 + 헤더 행 1행 = 5행.

  // ── 금액 포맷 헬퍼 ──
  const fmtV = v => {
    const n = Number(v);
    return (!v || n === 0) ? '' : n.toLocaleString('ko-KR');
  };
  const fmtB = v => {  // bold
    const n = Number(v);
    return (!v || n === 0) ? '' : `<strong>${n.toLocaleString('ko-KR')}</strong>`;
  };

  // ── 고객사 allowance_config 읽기 ──
  const _cfg = allCompanies.find(x => x.id === _wlCompanyId)?.allowance_config || {};

  // ── 지급 슬롯 목록 구성 ──
  // 각 슬롯: { lbl: 헤더 텍스트, getVal: p => 값(number), getSumVal: () => 합계값 }
  // 슬롯 순서:
  //   1) 기본급 (항상)
  //   2) 통상임금 고정수당: 정기상여금, 직책수당, 현장수당, 기술수당, 면허수당, 벽지수당
  //   3) 평균임금 수당: 식대, 차량유지비, 출산·보육수당, 연구활동비, 통신비,
  //                    체력단련비, 자기계발비, 도서구입비, 해외근무수당
  //   4) 기타 고정지급 custom items
  //   5) 고정 항목: 연장근로수당, 야간근로수당, 휴일근로수당, 주휴수당, 연차수당, 성과급, 기타
  //   마지막 슬롯(마지막 행 끝): 지급합계

  const _paySlots = [];

  // 1) 기본급 (항상)
  _paySlots.push({ lbl:'기본급',
    getVal: p => fmtV(p.base_salary),
    getSumVal: () => fmtV(sums.base_salary) });

  // 2) 통상임금 고정수당 (config 설정 시 포함)
  if(_cfg.regular_bonus)
    _paySlots.push({ lbl:'정기상여금',
      getVal: p => fmtV(p.bonus_pay),
      getSumVal: () => fmtV(sums.bonus_pay) });
  if(_cfg.position)
    _paySlots.push({ lbl:'직책수당',
      getVal: p => fmtV(p.position_allowance),
      getSumVal: () => fmtV(sums.position_allowance) });
  if(_cfg.site)
    _paySlots.push({ lbl:'현장수당',
      getVal: p => fmtV(p.site_allowance),
      getSumVal: () => fmtV(sums.site_allowance) });
  if(_cfg.skill)
    _paySlots.push({ lbl:'기술수당',
      getVal: p => fmtV(p.skill_allowance),
      getSumVal: () => fmtV(sums.skill_allowance) });
  if(_cfg.license)
    _paySlots.push({ lbl:'면허수당',
      getVal: p => fmtV(p.license_allowance),
      getSumVal: () => fmtV(sums.license_allowance) });
  if(_cfg.remote_area)
    _paySlots.push({ lbl:'벽지수당',
      getVal: p => fmtV(p.remote_area_allowance),
      getSumVal: () => fmtV(sums.remote_area_allowance) });

  // 3) 평균임금 수당 (config 설정 시 포함)
  if(_cfg.meal)
    _paySlots.push({ lbl:'식대',
      getVal: p => fmtV(p.meal_allowance),
      getSumVal: () => fmtV(sums.meal_allowance) });
  if(_cfg.car)
    _paySlots.push({ lbl:'차량유지비',
      getVal: p => fmtV(p.self_driving_allowance || p.transportation_allowance || 0),
      getSumVal: () => fmtV((sums.self_driving_allowance||0)+(sums.transportation_allowance||0)) });
  if(_cfg.childcare)
    _paySlots.push({ lbl:'출산·보육수당',
      getVal: p => fmtV(p.childcare_allowance),
      getSumVal: () => fmtV(sums.childcare_allowance) });
  if(_cfg.research)
    _paySlots.push({ lbl:'연구활동비',
      getVal: p => fmtV(p.research_allowance),
      getSumVal: () => fmtV(sums.research_allowance) });
  if(_cfg.communication)
    _paySlots.push({ lbl:'통신비',
      getVal: p => fmtV(p.communication_pay),
      getSumVal: () => fmtV(sums.communication_pay) });
  if(_cfg.fitness)
    _paySlots.push({ lbl:'체력단련비',
      getVal: p => fmtV(p.fitness_allowance),
      getSumVal: () => fmtV(sums.fitness_allowance||0) });
  if(_cfg.self_dev)
    _paySlots.push({ lbl:'자기계발비',
      getVal: p => fmtV(p.self_dev_allowance),
      getSumVal: () => fmtV(sums.self_dev_allowance||0) });
  if(_cfg.book)
    _paySlots.push({ lbl:'도서구입비',
      getVal: p => fmtV(p.book_allowance),
      getSumVal: () => fmtV(sums.book_allowance||0) });
  if(_cfg.overseas)
    _paySlots.push({ lbl:'해외근무수당',
      getVal: p => fmtV(p.overseas_allowance),
      getSumVal: () => fmtV(sums.overseas_allowance||0) });

  // 4) 기타 고정지급 custom items
  (_cfg.custom_items || []).forEach(item => {
    const key = item.key;
    const lbl = item.label;
    _paySlots.push({ lbl,
      getVal: p => {
        const ca = p.custom_allowances ? (typeof p.custom_allowances === 'string'
          ? JSON.parse(p.custom_allowances) : p.custom_allowances) : {};
        return fmtV(ca[key] || 0);
      },
      getSumVal: () => {
        const total = pays.reduce((s, p) => {
          const ca = p.custom_allowances ? (typeof p.custom_allowances === 'string'
            ? JSON.parse(p.custom_allowances) : p.custom_allowances) : {};
          return s + (Number(ca[key]) || 0);
        }, 0);
        return fmtV(total);
      }
    });
  });

  // 5) 고정 항목 (항상 포함)
  _paySlots.push({ lbl:'연장근로수당',
    getVal: p => fmtV(p.overtime_pay),
    getSumVal: () => fmtV(sums.overtime_pay) });
  _paySlots.push({ lbl:'야간근로수당',
    getVal: p => fmtV(p.night_pay),
    getSumVal: () => fmtV(sums.night_pay) });
  _paySlots.push({ lbl:'휴일근로수당',
    getVal: p => fmtV(p.holiday_pay),
    getSumVal: () => fmtV(sums.holiday_pay) });
  _paySlots.push({ lbl:'주휴수당',
    getVal: p => fmtV(p.weekly_holiday_pay),
    getSumVal: () => fmtV(sums.weekly_holiday_pay) });
  _paySlots.push({ lbl:'연차수당',
    getVal: p => fmtV(p.annual_leave_pay),
    getSumVal: () => fmtV(sums.annual_leave_pay) });
  _paySlots.push({ lbl:'성과급',
    getVal: p => fmtV(p.performance_pay),
    getSumVal: () => fmtV(sums.performance_pay) });
  _paySlots.push({ lbl:'기타',
    getVal: p => fmtV((p.etc_allowance||0)+(p.other_pay||0)),
    getSumVal: () => fmtV(sums.etc_allowance + sums.other_pay) });

  // ── 행 패킹 ──
  // 슬롯 수 + 지급합계 1개를 6개씩 묶음. 마지막 슬롯은 지급합계 고정.
  // 최소 5행(인적사항 행 때문).
  const SLOTS_PER_ROW = 6;
  const NROWS = Math.max(5, Math.ceil((_paySlots.length + 1) / SLOTS_PER_ROW));

  // PAY_TH: NROWS행 × 6열 레이블 배열 (마지막 셀 = '지급합계', 나머지 빈칸으로 패딩)
  const PAY_TH = Array.from({ length: NROWS }, (_, ri) => {
    return Array.from({ length: SLOTS_PER_ROW }, (__, ci) => {
      const slotIdx = ri * SLOTS_PER_ROW + ci;
      const isLastSlot = (ri === NROWS - 1 && ci === SLOTS_PER_ROW - 1);
      if(isLastSlot) return '지급합계';
      return _paySlots[slotIdx]?.lbl || '';
    });
  });

  // 공제항목 th 레이블 — NROWS행에 맞춰 앞 행들은 공란으로 패딩
  // 공제 정보는 항상 마지막 5행에 배치 (행이 5개 미만이면 NROWS 기준으로 축소)
  const DED_TH_BASE = [
    [ '국민연금', '건강보험', '고용보험', '장기요양보험료' ],
    [ '', '건강보험연말정산', '', '장기요양보험연말정산' ],
    [ '', '', '', '' ],
    [ '소득세', '지방소득세', '소득세연말정산', '' ],
    [ '', '기타공제', '공제합계', '차인지급액' ],
  ];
  // DED_TH: NROWS행. 앞쪽 패딩 행은 공란 4개.
  const DED_PAD = NROWS - DED_TH_BASE.length; // 여분 행 수 (0 이상 보장 by NROWS>=5)
  const DED_TH = [
    ...Array.from({ length: Math.max(0, DED_PAD) }, () => ['','','','']),
    ...DED_TH_BASE
  ];

  // ── 공제 특수 행 인덱스 (NROWS 기준 절대 인덱스) ──
  // DED_TH_BASE의 행2(index 2, N/A행) → DED_TH의 인덱스 DED_PAD+2
  // DED_TH_BASE 행2(index 2, N/A행)의 절대 행 인덱스
  const _dedNaRowIdx = Math.max(0, DED_PAD) + 2;

  // ── 직원별 지급 데이터 행 값 배열 반환 ──
  const getPayVals = (p, rowIdx) => {
    return Array.from({ length: SLOTS_PER_ROW }, (_, ci) => {
      const slotIdx = rowIdx * SLOTS_PER_ROW + ci;
      const isLastSlot = (rowIdx === NROWS - 1 && ci === SLOTS_PER_ROW - 1);
      if(isLastSlot) return fmtB(p.gross_pay);
      return _paySlots[slotIdx]?.getVal(p) || '';
    });
  };
  const getDedVals = (p, rowIdx) => {
    switch(rowIdx - Math.max(0, DED_PAD)){
      case 0: return [ fmtV(p.national_pension), fmtV(p.health_insurance),
                       fmtV(p.employment_insurance), fmtV(p.long_term_care) ];
      case 1: return [ '', fmtV(p.health_insurance_adjust), '', '' ];
      case 2: return [ '', '', '', '' ];
      case 3: return [ fmtV(p.income_tax), fmtV(p.local_income_tax),
                       fmtV(p.year_end_tax_adjust), '' ];
      case 4: return [ '', fmtV(p.advance_deduction),
                       fmtB(p.total_deduction), fmtB(p.net_pay) ];
      default: return ['','','',''];
    }
  };

  // ── 합계용 지급 값 배열 ──
  const getSumPayVals = rowIdx => {
    return Array.from({ length: SLOTS_PER_ROW }, (_, ci) => {
      const slotIdx = rowIdx * SLOTS_PER_ROW + ci;
      const isLastSlot = (rowIdx === NROWS - 1 && ci === SLOTS_PER_ROW - 1);
      if(isLastSlot) return fmtB(sums.gross_pay);
      return _paySlots[slotIdx]?.getSumVal() || '';
    });
  };
  const getSumDedVals = rowIdx => {
    switch(rowIdx - Math.max(0, DED_PAD)){
      case 0: return [ fmtV(sums.national_pension), fmtV(sums.health_insurance),
                       fmtV(sums.employment_insurance), fmtV(sums.long_term_care) ];
      case 1: return [ '', fmtV(sums.health_insurance_adjust), '', '' ];
      case 2: return [ '', '', '', '' ];
      case 3: return [ fmtV(sums.income_tax), fmtV(sums.local_income_tax),
                       fmtV(sums.year_end_tax_adjust), '' ];
      case 4: return [ '', fmtV(sums.advance_deduction),
                       fmtB(sums.total_deduction), fmtB(sums.net_pay) ];
      default: return ['','','',''];
    }
  };

  // ── 동적 thead 생성 ──
  // 행1: 그룹 헤더 (영수인 rowspan = NROWS+1)
  // 행2: 사원번호 | 성명 | 지급row0 | 공제row0
  // 행3~N+1: colspan=2 인적사항 | 지급rowN | 공제rowN
  const buildThead = () => {
    // 행1 그룹 헤더
    const r1 = `<tr class="wl-th-group">
      <th colspan="2" class="wl-th-personal">인적사항</th>
      <th colspan="6" class="wl-th-pay">기본급여 및 제수당</th>
      <th colspan="4" class="wl-th-ded">공제 및 차인지급액</th>
      <th rowspan="${NROWS + 1}" class="wl-th-sign">영수인</th>
    </tr>`;

    // 행2: 사원번호, 성명, 지급row0, 공제row0
    const payR0 = PAY_TH[0];
    const dedR0 = DED_TH[0];
    const r2 = `<tr class="wl-th-row wl-th-row-ind">
      <th class="wl-th-cell">사원번호</th>
      <th class="wl-th-cell">성명</th>
      ${payR0.map((t,i) => `<th class="wl-th-cell${t==='지급합계'?' wl-th-gross':i===5?' wl-th-pay-last':''}">${t}</th>`).join('')}
      ${dedR0.map(t => `<th class="wl-th-cell">${t}</th>`).join('')}
    </tr>`;

    // 행3~N+1: 인적사항 레이블(부서/직급/입사일/퇴사일, 이후 공란)
    const _infoLabels = ['부서','직급','입사일','퇴사일'];
    const rowsRest = Array.from({ length: NROWS - 1 }, (_, mi) => {
      const ri   = mi + 1; // PAY_TH/DED_TH index 1~(NROWS-1)
      const pv   = PAY_TH[ri];
      const dv   = DED_TH[ri];
      const info = _infoLabels[mi] || '';
      const isNaRow  = (ri === _dedNaRowIdx);
      return `<tr class="wl-th-row wl-th-row-mrg">
        <th colspan="2" class="wl-th-cell wl-th-merged">${info}</th>
        ${pv.map((t,i) => `<th class="wl-th-cell${t==='지급합계'?' wl-th-gross':i===5?' wl-th-pay-last':''}">${t}</th>`).join('')}
        ${dv.map((t,i) => `<th class="wl-th-cell${t==='공제합계'?' wl-th-ded-sum':t==='차인지급액'?' wl-th-net':(isNaRow&&(i===0||i===2))?' wl-th-na':''}">${t}</th>`).join('')}
      </tr>`;
    }).join('');

    return `<thead>${r1}${r2}${rowsRest}</thead>`;
  };

  // ── 직원 데이터 tbody 행 생성 ──
  // 각 직원 = NROWS 행.
  // 행1: 사원번호 | 성명 | 지급row0 | 공제row0 | 영수인(rowspan=NROWS)
  // 행2~N: colspan=2 인적사항 | 지급rowN | 공제rowN
  const buildTbody = (p, emp, idx, isSum) => {
    const resign = (allContracts.filter(c => c.employee_id === (p?.employee_id||'') && !c.is_draft)
      .sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))[0]?.contract_end) || '';

    const cls = `wl-data-row${isSum?' wl-sum-row':''}`;

    const empNo   = isSum ? '' : (emp.employee_number||'-');
    const empName = isSum ? `합계 (${pays.length}명)` : (emp.name||'-');

    // 인적사항 레이블 (행2~N 순서)
    const _infoVals = [
      isSum ? '' : (emp.department||''),
      isSum ? '' : (emp.position||''),
      isSum ? '' : (emp.hire_date||''),
      isSum ? '' : resign,
    ];

    // 행1
    const pv0 = isSum ? getSumPayVals(0) : getPayVals(p, 0);
    const dv0 = isSum ? getSumDedVals(0) : getDedVals(p, 0);
    const row1 = `<tr class="${cls}">
      <td class="wl-td-center wl-td-empno">${empNo}</td>
      <td class="wl-td-center wl-td-name">${empName}</td>
      ${pv0.map((v,i)=> {
        const isGross = (0 === NROWS-1 && i === SLOTS_PER_ROW-1);
        return isGross ? `<td class="wl-td-gross">${v}</td>`
          : i===SLOTS_PER_ROW-1 ? `<td class="wl-td-num wl-td-pay-last">${v}</td>`
          : `<td class="wl-td-num">${v}</td>`;
      }).join('')}
      ${dv0.map(v=>`<td class="wl-td-num">${v}</td>`).join('')}
      <td rowspan="${NROWS}" class="wl-td-sign"></td>
    </tr>`;

    // 행2~NROWS
    const restRows = Array.from({ length: NROWS - 1 }, (_, mi) => {
      const ri     = mi + 1;
      const info   = _infoVals[mi] !== undefined ? _infoVals[mi] : '';
      const pv     = isSum ? getSumPayVals(ri) : getPayVals(p, ri);
      const dv     = isSum ? getSumDedVals(ri) : getDedVals(p, ri);
      const isNaRow   = (ri === _dedNaRowIdx);
      const isLastRow = (ri === NROWS - 1);

      const pvCells = pv.map((v, i) => {
        const isGross = isLastRow && (i === SLOTS_PER_ROW - 1);
        return isGross ? `<td class="wl-td-gross">${v}</td>`
          : i === SLOTS_PER_ROW-1 ? `<td class="wl-td-num wl-td-pay-last">${v}</td>`
          : `<td class="wl-td-num">${v}</td>`;
      }).join('');

      const dvCells = dv.map((v, i) => {
        if(isLastRow && i === 2) return `<td class="wl-td-ded-sum">${v}</td>`;
        if(isLastRow && i === 3) return `<td class="wl-td-net">${v}</td>`;
        if(isNaRow   && (i===0||i===2)) return `<td class="wl-td-num wl-td-na">${v}</td>`;
        return `<td class="wl-td-num">${v}</td>`;
      }).join('');

      return `<tr class="${cls}">
        <td colspan="2" class="wl-td-center wl-td-dept">${info}</td>
        ${pvCells}
        ${dvCells}
      </tr>`;
    }).join('');

    return row1 + restRows;
  };

  // ── 직원 정렬 (가나다) ──
  pays.sort((a, b) => {
    const na = (empMap[a.employee_id]?.name || '');
    const nb = (empMap[b.employee_id]?.name || '');
    return na.localeCompare(nb, 'ko');
  });

  // ── 합계 누산 + tbody HTML 생성 ──
  let tbodyRows = '';
  pays.forEach((p, idx) => {
    sumFields.forEach(f => sums[f] += wonNum(p[f]));
    const emp = empMap[p.employee_id] || {};
    tbodyRows += buildTbody(p, emp, idx, false);
  });
  // 합계 행 출력 없음 (삭제)

  const thead = buildThead();

  // colgroup (13열)
  const CG = `<colgroup>
    <col class="wl-col-empno">
    <col class="wl-col-name">
    <col class="wl-col-pay"><col class="wl-col-pay"><col class="wl-col-pay">
    <col class="wl-col-pay"><col class="wl-col-pay"><col class="wl-col-pay">
    <col class="wl-col-ded"><col class="wl-col-ded"><col class="wl-col-ded"><col class="wl-col-ded">
    <col class="wl-col-sign">
  </colgroup>`;

  area.innerHTML = `
    <div style="padding:10px 16px 6px;font-size:12px;color:#6b7280;">
      ${_wlCompanyName} &nbsp;·&nbsp; ${yr}년 ${mo}월 임금대장 &nbsp;·&nbsp; 총 <strong style="color:#1a1a2e;">${pays.length}명</strong>
    </div>
    <div class="wl-ledger-wrap">
      <table class="wl-ledger-tbl">${CG}
        ${thead}
        <tbody>${tbodyRows}</tbody>
      </table>
    </div>`;

  // ── 직원 구분선: NROWS행마다 첫번째 행에 border-top 강조 ──
  requestAnimationFrame(() => {
    const rows = area.querySelectorAll('.wl-ledger-tbl tbody tr');
    rows.forEach((tr, i) => {
      if(i % NROWS === 0){
        tr.querySelectorAll('td').forEach(td => {
          td.style.borderTop = '2px solid #64748b';
        });
      }
    });
  });

  _setWLBtns(true);
}

// ─── 임금대장 인쇄/PDF 공통 실행 함수 ───
// body에 .wl-print-mode 클래스를 추가 → @media print CSS가 임금대장만 표시
// afterprint 이벤트에서 클래스·title 복원
function _wlDoPrint(isPdf){
  const yr    = Number(document.getElementById('wl-year-filter').value);
  const mo    = Number(document.getElementById('wl-month-filter').value);
  const moStr = String(mo).padStart(2,'0');

  const origTitle = document.title;
  document.title  = `[${_wlCompanyName}]_임금대장_${yr}년${moStr}월`;

  // body에 wl-print-mode 클래스 추가 → 임금대장 print CSS 활성화
  document.body.classList.add('wl-print-mode');

  const cleanup = () => {
    document.body.classList.remove('wl-print-mode');
    document.title = origTitle;
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  window.print();
}

// ─── 임금대장 PDF 다운로드 ───
function downloadWageLedgerPdf(){
  if(!_wlCompanyId){ toast('고객사를 먼저 선택해 주세요.','warning'); return; }
  _wlDoPrint(true);
}

// ─── 임금대장 인쇄 ───
function printWageLedger(){
  if(!_wlCompanyId){ toast('고객사를 먼저 선택해 주세요.','warning'); return; }
  _wlDoPrint(false);
}

// ─── 임금대장 엑셀 다운로드 (xlsx-js-style@1.2.0) ───
// ★ XLSX.writeFile(wb, fn, {cellStyles:true}) 옵션 필수
// ★ fill: {patternType:'solid', fgColor:{rgb:...}} — patternType 없으면 색상 미적용
// ★ A4 가로: pageSetup + sheetView 동시 설정
function downloadWageLedgerExcel(){
  if(!_wlCompanyId){ toast('고객사를 먼저 선택하세요.','error'); return; }

  const yr    = parseInt(document.getElementById('wl-year-filter')?.value);
  const mo    = parseInt(document.getElementById('wl-month-filter')?.value);
  const moStr = String(mo).padStart(2,'0');

  let pays = allPayrolls.filter(p =>
    p.company_id === _wlCompanyId &&
    Number(p.pay_year) === yr &&
    Number(p.pay_month) === mo
  );
  if(!pays.length){ toast(`${yr}년 ${mo}월 급여 데이터가 없습니다.`,'error'); return; }

  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  pays.sort((a,b) => (empMap[a.employee_id]?.name||'').localeCompare(empMap[b.employee_id]?.name||'','ko'));

  const nv = v => (v===null||v===undefined||v==='') ? 0 : Number(v);
  const numFmt = '#,##0';

  // ════════════════════════════════════════════════════════
  //  열 구조 (총 9열)
  //  C0: 구분(지급내역/공제내역/No)
  //  C1: 항목1  C2: 금액1
  //  C3: 항목2  C4: 금액2
  //  C5: 항목3  C6: 금액3
  //  C7: 항목4  C8: 금액4
  // ════════════════════════════════════════════════════════
  const COLS = 9;

  // ════════════════════════════════════════════════════════
  //  xlsx-js-style 스타일 형식
  //  fill   → {patternType:'solid', fgColor:{rgb:'RRGGBB'}}
  //  font   → {name, sz, bold, color:{rgb:'RRGGBB'}}
  //  border → {top:{style,color:{rgb}}, bottom, left, right}
  //  alignment → {horizontal, vertical, wrapText}
  // ════════════════════════════════════════════════════════

  // ── 유틸 ──
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const CL = i => i<26 ? alpha[i] : alpha[Math.floor(i/26)-1]+alpha[i%26];
  const CR = (r,c) => CL(c)+(r+1);

  // 테두리 생성자
  const bd = (clr, style='thin') => ({style, color:{rgb:clr}});
  const border = (clr, style='thin') => ({top:bd(clr,style), bottom:bd(clr,style), left:bd(clr,style), right:bd(clr,style)});
  // 공제/지급 첫 행 상단만 double 구분선
  const borderDivTop = (sideClr='E5E7EB') => ({
    top:    bd('94A3B8','double'),
    bottom: bd(sideClr,'thin'),
    left:   bd(sideClr,'thin'),
    right:  bd(sideClr,'thin')
  });
  // fill
  const fill = rgb => ({patternType:'solid', fgColor:{rgb}});
  // font
  const font = (sz, bold, rgb, name='맑은 고딕') => ({name, sz, bold, color:{rgb}});
  // alignment
  const al = (h='center', v='center', wrap=false) => ({horizontal:h, vertical:v, wrapText:wrap});

  // ════════════════════════════════════════════════════════
  //  스타일 상수 (화면 CSS 1:1 대응)
  //
  //  [ 헤더 영역 - 다크 배경 ]
  //  .wl-head-no              bg:#0f172a  color:#94a3b8
  //  .wl-card-head            bg:#1e293b  border:#334155
  //  .wl-head-cell .lbl       color:#94a3b8
  //  .wl-head-cell .val       color:#f1f5f9
  //  .wl-head-cell.c-gross    bg:#1e3a5f  color:#93c5fd
  //  .wl-head-cell.c-ded      bg:#3b0f0f  color:#fca5a5
  //  .wl-head-cell.c-net      bg:#052e16  color:#86efac
  //  합계카드 head             bg:#0f172a
  //  합계카드 no               bg:#020617
  //
  //  [ 테이블 영역 - 라이트 ]
  //  td.wl-sec-pay            bg:#dbeafe  color:#1d4ed8  border:#bfdbfe
  //  td.wl-sec-ded            bg:#fee2e2  color:#b91c1c  border:#fecaca
  //  .wl-tbl th(항목명)       bg:#f8fafc  color:#64748b  border:#e5e7eb
  //  .wl-pay-row td(금액)     bg:#f8fbff  color:#1e293b  border:#e5e7eb
  //  .wl-ded-row td(금액)     bg:#fff9f9  color:#1e293b  border:#e5e7eb
  //  .wl-tbl td.wl-empty      bg:#f9fafb
  //  합계카드 th               bg:#f1f5f9  color:#475569
  //  합계카드 pay-td           bg:#f0f7ff  color:#1e293b
  //  합계카드 ded-td           bg:#fff9f9  color:#1e293b
  // ════════════════════════════════════════════════════════

  const BD_HEAD   = border('334155');   // 헤더 구분선
  const BD_CELL   = border('E5E7EB');   // 일반 셀
  const BD_PAY_S  = border('BFDBFE');   // 지급구분셀 테두리
  const BD_DED_S  = border('FECACA');   // 공제구분셀 테두리
  const BD_DIV    = borderDivTop('E5E7EB');   // 공제 첫행 double top
  const BD_DIV_DED= borderDivTop('FECACA');   // 공제구분셀 첫행 double top

  // 헤더 셀 스타일 생성
  const sHead = (bg, fg, sz=8, bold=false, h='center') => ({
    fill:font_fill(bg), font:font(sz,bold,fg), alignment:al(h), border:BD_HEAD
  });
  // fill+font 동시 객체 (sHead 내부용)
  function font_fill(bg){ return fill(bg); }

  // 완전한 셀 스타일 객체 생성 (fill 포함)
  const S = (bg, fg, sz, bold, h, v, wrap, bdr) => ({
    fill: fill(bg),
    font: font(sz, bold, fg),
    alignment: al(h, v, wrap),
    border: bdr
  });

  // ─ 헤더 행 스타일 ─
  // No 셀 bg:#0f172a / 합계No bg:#020617
  const S_NO     = S('0F172A','94A3B8',11,true,'center','center',false,BD_HEAD);
  const S_NO_SUM = S('020617','94A3B8',11,true,'center','center',false,BD_HEAD);

  // 헤더 배경 #1e293b / 합계 #0f172a
  const S_HDR     = (fg,sz=8,bold=false,h='center') => S('1E293B',fg,sz,bold,h,'center',false,BD_HEAD);
  const S_HDR_SUM = (fg,sz=8,bold=false,h='center') => S('0F172A',fg,sz,bold,h,'center',false,BD_HEAD);

  // 지급총액 bg:#1e3a5f / 공제합계 bg:#3b0f0f / 실수령액 bg:#052e16
  const S_GROSS = S('1E3A5F','93C5FD',9,true,'right','center',false,BD_HEAD);
  const S_DED_V = S('3B0F0F','FCA5A5',9,true,'right','center',false,BD_HEAD);
  const S_NET   = S('052E16','86EFAC',9,true,'right','center',false,BD_HEAD);

  // ─ 지급내역 구분셀 ─  bg:#dbeafe  color:#1d4ed8  border:#bfdbfe
  const S_SEC_PAY   = S('DBEAFE','1D4ED8',9,true,'center','center',true, BD_PAY_S);
  const S_SEC_PAY_E = S('DBEAFE','DBEAFE',9,false,'center','center',false,BD_PAY_S); // 병합 하위행

  // ─ 공제내역 구분셀 ─  bg:#fee2e2  color:#b91c1c  border:#fecaca  첫행 double top
  const S_SEC_DED   = S('FEE2E2','B91C1C',9,true,'center','center',true, BD_DIV_DED);
  const S_SEC_DED_E = S('FEE2E2','FEE2E2',9,false,'center','center',false,BD_DED_S);

  // ─ 지급내역 항목명 th ─  bg:#f8fafc  color:#64748b  | 합계: bg:#f1f5f9 color:#475569
  const S_PAY_LBL     = S('F8FAFC','64748B',8,true, 'center','center',false,BD_CELL);
  const S_PAY_LBL_SUM = S('F1F5F9','475569',8,true, 'center','center',false,BD_CELL);

  // ─ 지급내역 금액 td ─  bg:#f8fbff  color:#1e293b  | 합계: bg:#f0f7ff
  const S_PAY_VAL     = S('F8FBFF','1E293B',9,false,'right','center',false,BD_CELL);
  const S_PAY_VAL_SUM = S('F0F7FF','1E293B',9,false,'right','center',false,BD_CELL);

  // ─ 공제내역 항목명 th ─  bg:#f8fafc  color:#64748b  첫행 double top
  const S_DED_LBL     = S('F8FAFC','64748B',8,true, 'center','center',false,BD_CELL);
  const S_DED_LBL_F   = S('F8FAFC','64748B',8,true, 'center','center',false,BD_DIV);   // 첫행
  const S_DED_LBL_SUM = S('F1F5F9','475569',8,true, 'center','center',false,BD_CELL);
  const S_DED_LBL_SF  = S('F1F5F9','475569',8,true, 'center','center',false,BD_DIV);   // 합계첫행

  // ─ 공제내역 금액 td ─  bg:#fff9f9  color:#1e293b  첫행 double top
  const S_DED_VAL     = S('FFF9F9','1E293B',9,false,'right','center',false,BD_CELL);
  const S_DED_VAL_F   = S('FFF9F9','1E293B',9,false,'right','center',false,BD_DIV);    // 첫행
  const S_DED_VAL_SUM = S('FFF9F9','1E293B',9,false,'right','center',false,BD_CELL);
  const S_DED_VAL_SF  = S('FFF9F9','1E293B',9,false,'right','center',false,BD_DIV);    // 합계첫행

  // ─ 빈 칸 ─  bg:#f9fafb
  const S_EMPTY   = S('F9FAFB','F9FAFB',9,false,'center','center',false,BD_CELL);
  const S_EMPTY_F = S('F9FAFB','F9FAFB',9,false,'center','center',false,BD_DIV);       // 첫행

  // ─ 타이틀 ─  bg:#1a1a2e  color:#ffffff
  const S_TITLE = S('1A1A2E','FFFFFF',13,true,'center','center',false,border('1A1A2E'));

  // ─ 빈 행 (카드 구분) ─  bg:#ffffff
  const S_BLANK = S('FFFFFF','FFFFFF',8,false,'center','center',false,border('FFFFFF'));

  // ════════════════════════════════════════════════════════
  //  워크시트 셀 직접 생성 방식
  //  (aoa_to_sheet + 나중에 .s 덮어쓰기 방식은 숫자셀 타입 충돌 발생)
  //  각 셀을 {v, t, z?, s} 형태로 바로 생성
  // ════════════════════════════════════════════════════════
  const wsCells  = {};   // { 'A1': {v,t,z?,s} }
  const merges   = [];   // !merges
  const rowHts   = [];   // !rows
  let   curRow   = 0;

  // 셀 하나 생성
  function mkCell(r, c, val, sty, numFmt){
    const ref    = CR(r, c);
    const isNum  = typeof val === 'number';
    const cell   = { v: (val ?? ''), t: isNum ? 'n' : 's', s: sty };
    if(isNum && numFmt) cell.z = numFmt;
    wsCells[ref] = cell;
  }

  // 한 행 전체 밀어넣기
  // vals: 값 배열[COLS], hpt: 행높이, stys: 스타일 배열[COLS], fmts: 포맷 배열[COLS]
  function pushRow(vals, hpt, stys, fmts){
    rowHts.push({ hpt: hpt || 15 });
    for(let c=0; c<COLS; c++){
      mkCell(curRow, c, vals ? (vals[c] ?? '') : '', stys ? stys[c] : null, fmts ? fmts[c] : null);
    }
    curRow++;
  }

  const addMg = (r1,c1,r2,c2) => merges.push({ s:{r:r1,c:c1}, e:{r:r2,c:c2} });

  // ── 타이틀 행 (전체 병합) ──
  pushRow(
    [`${_wlCompanyName}  ${yr}년 ${moStr}월 임금대장`, ...Array(COLS-1).fill('')],
    26,
    [S_TITLE, ...Array(COLS-1).fill(S('1A1A2E','1A1A2E',8,false,'center','center',false,border('1A1A2E')))]
  );
  addMg(0, 0, 0, COLS-1);

  // ── 타이틀 아래 빈행 ──
  pushRow(Array(COLS).fill(''), 5, Array(COLS).fill(S_BLANK));

  // ── 합계 누적 필드 ──
  const sumFields = [
    'work_days','total_work_hours','overtime_hours','night_hours','holiday_hours',
    'base_salary','weekly_holiday_pay','position_allowance',
    'overtime_pay','night_pay','holiday_pay',
    'transportation_allowance','self_driving_allowance','remote_area_allowance',
    'meal_allowance','childcare_allowance','research_allowance',
    'annual_leave_pay','bonus_pay','performance_pay','actual_expense_pay','communication_pay',
    'skill_allowance','license_allowance','etc_allowance','other_pay',
    'gross_pay','standard_monthly_pay',
    'income_tax','local_income_tax',
    'health_insurance','long_term_care','national_pension','employment_insurance',
    'year_end_tax_adjust','health_insurance_adjust','advance_deduction','total_deduction','net_pay'
  ];
  const sums = {};
  sumFields.forEach(f => sums[f]=0);

  // ════════════════════════════════════════════════════════
  //  카드 빌더 (직원 1장 = 10행 + 1빈행)
  //   r0: 헤더A — No | 성명lbl·val | 부서lbl·val | 직책lbl·val | 고용형태lbl·val
  //   r1: 헤더B — No병합 | 근로일수 | 연장야간 | 지급총액lbl·val | 공제합계lbl·val | 실수령액lbl·val
  //   r2~r6: 지급내역 5행 (A열 5행 병합)
  //   r7~r9: 공제내역 3행 (A열 3행 병합)
  //   r10: 빈행
  // ════════════════════════════════════════════════════════
  function buildCard(p, seq, isSum){
    const emp = isSum ? {} : (empMap[p.employee_id] || {});
    const SR  = curRow;  // 이 카드 시작 행

    const gv  = isSum ? sums.gross_pay        : nv(p.gross_pay);
    const dv  = isSum ? sums.total_deduction  : nv(p.total_deduction);
    const nev = isSum ? sums.net_pay          : nv(p.net_pay);
    const wd  = isSum ? sums.work_days        : nv(p.work_days);
    const wh  = isSum ? sums.total_work_hours : nv(p.total_work_hours);
    const oh  = isSum ? sums.overtime_hours   : nv(p.overtime_hours);
    const nh  = isSum ? sums.night_hours      : nv(p.night_hours);
    const hh  = isSum ? sums.holiday_hours    : nv(p.holiday_hours);
    const pd  = isSum ? '' : (p.pay_date ? p.pay_date.slice(0,10) : '-');

    // ── 헤더 A행 (r0) ──
    pushRow(
      isSum
        ? ['합계', '총 인원', `${pays.length}명`, '', '', '', '', '', '']
        : [seq+1, '성명', emp.name||'', '부서', emp.department||'', '직책', emp.position||'', '고용형태', emp.employment_category||''],
      17,
      [
        isSum ? S_NO_SUM : S_NO,
        isSum ? S_HDR_SUM('94A3B8')             : S_HDR('94A3B8'),
        isSum ? S_HDR_SUM('F1F5F9',9,true,'left') : S_HDR('F1F5F9',9,true,'left'),
        isSum ? S_HDR_SUM('94A3B8')             : S_HDR('94A3B8'),
        isSum ? S_HDR_SUM('F1F5F9',9,true,'left') : S_HDR('F1F5F9',9,true,'left'),
        isSum ? S_HDR_SUM('94A3B8')             : S_HDR('94A3B8'),
        isSum ? S_HDR_SUM('F1F5F9',9,true,'left') : S_HDR('F1F5F9',9,true,'left'),
        isSum ? S_HDR_SUM('94A3B8')             : S_HDR('94A3B8'),
        isSum ? S_HDR_SUM('F1F5F9',9,true,'left') : S_HDR('F1F5F9',9,true,'left'),
      ]
    );

    // ── 헤더 B행 (r1) ──
    pushRow(
      ['', `${wd}일 / ${wh}H`, `연장${oh} 야간${nh} 휴일${hh}H`,
       isSum?'지급총액합계':'지급총액', gv, '공제합계', dv,
       isSum?'실수령액 합계':`실수령액 / ${pd}`, nev],
      17,
      [
        isSum ? S_NO_SUM : S_NO,
        isSum ? S_HDR_SUM('CBD5E1',8,true) : S_HDR('CBD5E1',8,true),
        isSum ? S_HDR_SUM('94A3B8',8,true) : S_HDR('94A3B8',8,true),
        isSum ? S_HDR_SUM('93C5FD',8)      : S_HDR('93C5FD',8),
        S_GROSS,
        isSum ? S_HDR_SUM('FCA5A5',8)      : S_HDR('FCA5A5',8),
        S_DED_V,
        isSum ? S_HDR_SUM('86EFAC',8)      : S_HDR('86EFAC',8),
        S_NET
      ],
      [null, null, null, null, numFmt, null, numFmt, null, numFmt]
    );

    // No 셀 2행 병합
    addMg(SR, 0, SR+1, 0);

    // ── 지급내역 5행 ──
    const payData = [
      [{lbl:'기본급',        val:isSum?sums.base_salary            :nv(p.base_salary)},
       {lbl:'주휴수당',      val:isSum?sums.weekly_holiday_pay     :nv(p.weekly_holiday_pay)},
       {lbl:'직책수당',      val:isSum?sums.position_allowance     :nv(p.position_allowance)},
       {lbl:'연장근로수당',  val:isSum?sums.overtime_pay           :nv(p.overtime_pay)}],
      [{lbl:'야간근로수당',  val:isSum?sums.night_pay              :nv(p.night_pay)},
       {lbl:'휴일근로수당',  val:isSum?sums.holiday_pay            :nv(p.holiday_pay)},
       {lbl:'교통비',        val:isSum?sums.transportation_allowance:nv(p.transportation_allowance)},
       {lbl:'자가운전보조금',val:isSum?sums.self_driving_allowance  :nv(p.self_driving_allowance)}],
      [{lbl:'벽지수당',      val:isSum?sums.remote_area_allowance  :nv(p.remote_area_allowance)},
       {lbl:'식대',          val:isSum?sums.meal_allowance         :nv(p.meal_allowance)},
       {lbl:'출산·보육수당', val:isSum?sums.childcare_allowance    :nv(p.childcare_allowance)},
       {lbl:'연구활동비',    val:isSum?sums.research_allowance     :nv(p.research_allowance)}],
      [{lbl:'연차수당',      val:isSum?sums.annual_leave_pay       :nv(p.annual_leave_pay)},
       {lbl:'정기상여금',    val:isSum?sums.bonus_pay              :nv(p.bonus_pay)},
       {lbl:'성과급',        val:isSum?sums.performance_pay        :nv(p.performance_pay)},
       {lbl:'실비변상적급여',val:isSum?sums.actual_expense_pay     :nv(p.actual_expense_pay)}],
      [{lbl:'통신비',        val:isSum?sums.communication_pay      :nv(p.communication_pay)},
       {lbl:'기술수당',      val:isSum?sums.skill_allowance        :nv(p.skill_allowance)},
       {lbl:'면허수당',      val:isSum?sums.license_allowance      :nv(p.license_allowance)},
       // 국외근로소득 + other_pay를 '기타수당'으로 합산 표시
       // 화면(임금대장 카드) · 엑셀 빌더 · 파서 레이블을 '기타수당'으로 통일
       {lbl:'기타수당',    val:isSum?(sums.etc_allowance+sums.other_pay):(nv(p.etc_allowance)+nv(p.other_pay))}],
    ];
    const lPay = isSum ? S_PAY_LBL_SUM : S_PAY_LBL;
    const vPay = isSum ? S_PAY_VAL_SUM : S_PAY_VAL;
    for(let pi=0; pi<5; pi++){
      const it = payData[pi];
      pushRow(
        [pi===0?'지급내역':'', it[0].lbl,it[0].val, it[1].lbl,it[1].val, it[2].lbl,it[2].val, it[3].lbl,it[3].val],
        15,
        [pi===0 ? S_SEC_PAY : S_SEC_PAY_E, lPay,vPay, lPay,vPay, lPay,vPay, lPay,vPay],
        [null, null,numFmt, null,numFmt, null,numFmt, null,numFmt]
      );
    }
    addMg(SR+2, 0, SR+6, 0); // 지급내역 A열 5행 병합 (열 수 고정으로 기타지급은 r4 마지막 슬롯에 포함됨)

    // ── 공제내역 3행 ──
    const dedData = [
      [{lbl:'보수월액',       val:isSum?sums.standard_monthly_pay   :nv(p.standard_monthly_pay)},
       {lbl:'소득세',         val:isSum?sums.income_tax             :nv(p.income_tax)},
       {lbl:'주민세',         val:isSum?sums.local_income_tax       :nv(p.local_income_tax)},
       {lbl:'건강보험',       val:isSum?sums.health_insurance       :nv(p.health_insurance)}],
      [{lbl:'장기요양보험료', val:isSum?sums.long_term_care         :nv(p.long_term_care)},
       {lbl:'국민연금',       val:isSum?sums.national_pension       :nv(p.national_pension)},
       {lbl:'고용보험',       val:isSum?sums.employment_insurance   :nv(p.employment_insurance)},
       {lbl:'연말정산',       val:isSum?sums.year_end_tax_adjust    :nv(p.year_end_tax_adjust)}],
      [{lbl:'건강보험정산',   val:isSum?sums.health_insurance_adjust:nv(p.health_insurance_adjust)},
       {lbl:'기타공제',       val:isSum?sums.advance_deduction      :nv(p.advance_deduction)},
       null, null],
    ];
    for(let di=0; di<3; di++){
      const isF = di===0;
      const it  = dedData[di];
      const getLbl = (has) => {
        if(!has) return isF ? S_EMPTY_F : S_EMPTY;
        if(isSum) return isF ? S_DED_LBL_SF : S_DED_LBL_SUM;
        return isF ? S_DED_LBL_F : S_DED_LBL;
      };
      const getVal = (has) => {
        if(!has) return isF ? S_EMPTY_F : S_EMPTY;
        if(isSum) return isF ? S_DED_VAL_SF : S_DED_VAL_SUM;
        return isF ? S_DED_VAL_F : S_DED_VAL;
      };
      pushRow(
        [di===0?'공제내역':'',
         it[0]?it[0].lbl:'', it[0]?it[0].val:0,
         it[1]?it[1].lbl:'', it[1]?it[1].val:0,
         it[2]?it[2].lbl:'', it[2]?it[2].val:0,
         it[3]?it[3].lbl:'', it[3]?it[3].val:0],
        15,
        [isF ? S_SEC_DED : S_SEC_DED_E,
         getLbl(!!it[0]), getVal(!!it[0]),
         getLbl(!!it[1]), getVal(!!it[1]),
         getLbl(!!it[2]), getVal(!!it[2]),
         getLbl(!!it[3]), getVal(!!it[3])],
        [null, null,numFmt, null,numFmt, null,numFmt, null,numFmt]
      );
    }
    addMg(SR+7, 0, SR+9, 0); // 공제내역 A열 3행 병합

    // ── 카드 간 빈행 ──
    pushRow(Array(COLS).fill(''), 5, Array(COLS).fill(S_BLANK));
  }

  // ── 직원 카드 ──
  pays.forEach((p, idx) => {
    sumFields.forEach(f => sums[f] += nv(p[f]));
    buildCard(p, idx, false);
  });
  // ── 합계 카드 ──
  buildCard(null, pays.length, true);

  // ════════════════════════════════════════
  //  워크시트 조립 (직접 생성한 wsCells 주입)
  // ════════════════════════════════════════
  const ws = {};
  // !ref 설정
  ws['!ref'] = XLSX.utils.encode_range({ s:{r:0,c:0}, e:{r:curRow-1,c:COLS-1} });
  // 셀 주입
  Object.assign(ws, wsCells);
  ws['!merges'] = merges;
  ws['!rows']   = rowHts;

  // 열 너비 (px 기준 요청: A=68px, B/D/F=90px, C=130px, H=140px / 1wch ≈ 7px)
  ws['!cols'] = [
    { wch:  9.7 },  // A: 구분          (68px)
    { wch: 12.9 },  // B: 항목1         (90px)
    { wch: 18.6 },  // C: 금액1        (130px)
    { wch: 12.9 },  // D: 항목2         (90px)
    { wch: 13   },  // E: 금액2
    { wch: 12.9 },  // F: 항목3         (90px)
    { wch: 13   },  // G: 금액3
    { wch: 20   },  // H: 항목4(실수령액/지급일 라벨) (140px)
    { wch: 13   },  // I: 금액4
  ];

  // ── 인쇄 설정 ──
  ws['!pageSetup'] = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  ws['!printOptions'] = { fitToPage: true };
  ws['!margins'] = { left:0.39, right:0.39, top:0.39, bottom:0.39, header:0.15, footer:0.15 };

  // ── 워크북 조립 ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '임금대장');

  // ── XLSX 직렬화 → 직접 Blob 다운로드 ──
  // ★★ cellStyles:true 필수 ★★
  const wbout = XLSX.write(wb, { cellStyles: true, bookType: 'xlsx', type: 'array' });

  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `[${_wlCompanyName}]_임금대장_${yr}년${moStr}월.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast(`📥 ${yr}년 ${mo}월 임금대장 엑셀 다운로드 완료`, 'success');
}

// ══════════════════════════════════════════════════════════════
//  퇴직급여 관리
// ══════════════════════════════════════════════════════════════
let _sevCompanyId = null;
let _sevCompanyName = '';
let _sevCurrentRecord = null; // 현재 팝업에 열린 퇴직금 정산 데이터

// ── 고객사 목록 렌더 ──
function renderSevCompanyList(){
  const chips = document.getElementById('sev-company-chips');
  if(!chips) return;
  const q = (document.getElementById('sev-company-search')?.value||'').toLowerCase();
  const list = allCompanies.filter(c => !c.is_draft && (c.status==='이용중'||c.status==='해지') &&
    (c.company_name||'').toLowerCase().includes(q))
    .sort((a,b)=>(a.company_name||'').localeCompare(b.company_name||'','ko'));
  if(!list.length){
    chips.innerHTML = '<span style="color:#9ca3af;font-size:12.5px;">등록된 고객사가 없습니다.</span>';
    return;
  }
  chips.innerHTML = list.map(c => {
    const isSel = _sevCompanyId === c.id;
    const isTerminated = c.status === '해지';
    return `<button onclick="selectSevCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}') "
      class="co-chip${isSel?' selected':''}${isTerminated?' terminated':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name||''}
      ${isTerminated?'<span class="co-chip-badge count">(해지)</span>':''}
    </button>`;
  }).join('');
}

// ── 고객사 선택 ──
function selectSevCompany(id, name){
  _sevCompanyId = id;
  _sevCompanyName = name;
  currentGlobalCompanyId = id;  // 글로벌 공유 동기화
  document.getElementById('sev-company-select-card').style.display = 'none';
  document.getElementById('sev-main-section').style.display = '';
  document.getElementById('sev-selected-company-label').innerHTML =
    `<i class="fas fa-hand-holding-usd" style="margin-right:6px;"></i>${name} — 퇴직급여 관리`;
  const today = new Date();
  document.getElementById('sev-as-of-date').textContent =
    `기준일: ${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;

  // 해지 고객사: 추계 탭 숨김, 이력 탭만 표시
  const co = allCompanies.find(c => c.id === id);
  const isTerminated = co?.status === '해지';
  const sBtn = document.getElementById('sev-tab-status-btn');
  if(sBtn) sBtn.style.display = isTerminated ? 'none' : '';

  // 기본 탭: 항상 지급 발생 이력(history)으로 시작
  switchSevTab('history');

  renderSevCompanyList();
  renderSeverance();
}

// ── 고객사 선택 해제 ──
function clearSevCompanySelect(){
  _sevCompanyId = null;
  _sevCompanyName = '';
  currentGlobalCompanyId = null;  // 글로벌 공유 초기화
  document.getElementById('sev-company-select-card').style.display = '';
  document.getElementById('sev-main-section').style.display = 'none';
  // 추계 탭 버튼 다시 표시 (다음 고객사 선택을 위해 초기화)
  const sBtn = document.getElementById('sev-tab-status-btn');
  if(sBtn) sBtn.style.display = '';
  // 합계 카드 숨기기
  const sc = document.getElementById('sev-summary-card');
  if(sc) sc.style.display = 'none';
  renderSevCompanyList();
}

// ── 탭 전환 ──
function switchSevTab(tab){
  const isStatus = tab === 'status';
  document.getElementById('sev-tab-status').style.display = isStatus ? '' : 'none';
  document.getElementById('sev-tab-history').style.display = isStatus ? 'none' : '';
  const sBtn = document.getElementById('sev-tab-status-btn');
  const hBtn = document.getElementById('sev-tab-history-btn');
  // history 탭 (첫번째, 항상 표시)
  if(hBtn){ hBtn.style.borderBottomColor = isStatus?'transparent':'#6366f1'; hBtn.style.color=isStatus?'#9ca3af':'#4c1d95'; hBtn.style.fontWeight=isStatus?'600':'700'; }
  // status 탭 (두번째, 해지 고객사에서는 숨김)
  if(sBtn){ sBtn.style.borderBottomColor = isStatus?'#f59e0b':'transparent'; sBtn.style.color=isStatus?'#92400e':'#9ca3af'; sBtn.style.fontWeight=isStatus?'700':'600'; }
}

// ── 재직 기간 계산 (년·개월·일 텍스트) ──
function calcTenure(hireDate, baseDate){
  if(!hireDate) return { text:'-', totalDays:0, years:0 };
  const s = new Date(hireDate);
  const e = baseDate ? new Date(baseDate) : new Date();
  if(isNaN(s.getTime())) return { text:'-', totalDays:0, years:0 };
  let y = e.getFullYear() - s.getFullYear();
  let m = e.getMonth() - s.getMonth();
  let d = e.getDate() - s.getDate();
  if(d < 0){ m--; }
  if(m < 0){ y--; m += 12; }
  const totalDays = Math.floor((e - s) / 86400000);
  const years = totalDays / 365.25; // 퇴직금 계산용 연수
  let text = '';
  if(y > 0) text += `${y}년 `;
  if(m > 0) text += `${Math.abs(m)}개월 `;
  text += `${Math.abs(d >= 0 ? e.getDate()-s.getDate() : 0)}일`;
  // 더 단순하게
  const yy = Math.floor(totalDays/365);
  const mm = Math.floor((totalDays%365)/30);
  const dd = totalDays%30;
  text = '';
  if(yy>0) text+=`${yy}년 `;
  if(mm>0) text+=`${mm}개월 `;
  text+=`${dd}일`;
  return { text: text.trim()||'0일', totalDays, years };
}

// ── 직전 3개월 급여 데이터 취득 ──
// 기준일(baseDate) 기준 이전 3개월 payrolls 반환
function getPrev3MonthsPayrolls(empId, baseDate){
  const base = baseDate ? new Date(baseDate) : new Date();
  // 기준 연월보다 이전 3개월 (pay_year/pay_month 기준)
  const months = [];
  for(let i = 1; i <= 3; i++){
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
  }
  return allPayrolls.filter(p =>
    p.employee_id === empId &&
    months.some(mo => Number(p.pay_year) === mo.y && Number(p.pay_month) === mo.m)
  );
}

// ── 통상임금 (3개월 합계) 계산 ──
// 통상임금: 기본급 + 주휴수당 + 직책수당 + 기술수당 + 면허수당 + 출산보육수당 + 연구활동비
// (식대/교통비 등 실비 비과세 항목, 성과급 등 비정기 항목 제외)
function calcOrdinaryWage3(pays){
  return pays.reduce((sum, p) =>
    sum + (p.base_salary||0) + (p.weekly_holiday_pay||0) + (p.position_allowance||0)
        + (p.skill_allowance||0) + (p.license_allowance||0)
        + (p.childcare_allowance||0) + (p.research_allowance||0)
  , 0);
}

// ── 평균임금 (3개월 합계) 계산 ──
// 평균임금: 3개월간 지급된 총 임금(gross_pay) 합계
function calcAverageWage3(pays){
  return pays.reduce((sum, p) => sum + (p.gross_pay||0), 0);
}

// ── 퇴직금 계산 ──
// 퇴직금 = 1일 평균임금 × 30일 × (총 재직일수 / 365)
// 단, 통상임금 기준 퇴직금이 더 높을 경우 통상임금 기준 사용 (근로기준법 준용)
function calcSeverancePay(empId, hireDate, baseDate, pays3){
  const tenure = calcTenure(hireDate, baseDate);
  if(tenure.totalDays < 365) return { amount: 0, ordinary3: 0, average3: 0, tenure, daily1: 0, note:'1년 미만' };

  const totalDays = tenure.totalDays;
  // 직전 3개월 총일수 (실제 역일수)
  const base = baseDate ? new Date(baseDate) : new Date();
  const start3 = new Date(base.getFullYear(), base.getMonth()-3, base.getDate());
  const days3 = Math.ceil((base - start3) / 86400000); // 3개월 역일수

  const ordinary3 = calcOrdinaryWage3(pays3);
  const average3  = calcAverageWage3(pays3);

  // 1일 통상임금 (3개월 합계 ÷ 3개월 일수)
  const dailyOrdinary = days3 > 0 ? (ordinary3 / days3) : 0;
  // 1일 평균임금 (3개월 합계 ÷ 3개월 역일수)
  const dailyAverage  = days3 > 0 ? (average3 / days3) : 0;

  // 평균임금이 통상임금보다 낮으면 통상임금 적용 (근로기준법 §2)
  const daily1 = Math.max(dailyOrdinary, dailyAverage);

  const amount = Math.floor(daily1 * 30 * (totalDays / 365));
  return { amount, ordinary3, average3, tenure, daily1, days3, dailyOrdinary, dailyAverage };
}

// ── 계약 상태 뱃지 HTML ──
function sevStatusBadge(emp, contract){
  if(!contract) return '<span style="font-size:11px;color:#9ca3af;">계약 없음</span>';
  const s = contract.status || '';
  const today = new Date().toISOString().slice(0,10);
  if(s==='해지' || emp?.status==='resigned' || emp?.status==='퇴직'){
    const resignDate = emp?.resign_date || contract.terminate_date || contract.contract_end || '';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fee2e2;color:#dc2626;font-size:11px;font-weight:600;">해지·퇴직${resignDate?' ('+resignDate+')':''}</span>`;
  }
  if(s==='만료' || s==='expired'){
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#b45309;font-size:11px;font-weight:600;">만료${contract.contract_end?' ('+contract.contract_end+')':''}</span>`;
  }
  // 활성 계약 중 종료일이 임박한 경우 (90일 이내)
  if(contract.contract_end && contract.contract_type !== '기간의 정함이 없는 근로계약'){
    const endDate = new Date(contract.contract_end);
    const diffDays = Math.ceil((endDate - new Date()) / 86400000);
    if(!isNaN(endDate) && diffDays >= 0 && diffDays <= 90){
      return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fef9c3;color:#854d0e;font-size:11px;font-weight:600;">만료예정 D-${diffDays} (${contract.contract_end})</span>`;
    }
    if(!isNaN(endDate) && diffDays < 0){
      return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#b45309;font-size:11px;font-weight:600;">만료 (${contract.contract_end})</span>`;
    }
  }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#dcfce7;color:#15803d;font-size:11px;font-weight:600;">재직중</span>`;
}

// ── 메인 렌더 (탭1 + 탭2 모두) ──
function renderSeverance(){
  if(!_sevCompanyId) return;
  renderSevStatusTab();
  renderSevHistoryTab();
}

// ── 탭1: 근로자별 퇴직급여 현황 ──
function renderSevStatusTab(){
  const tbody = document.getElementById('sev-status-tbody');
  const tfoot = document.getElementById('sev-status-tfoot');
  const totalEl = document.getElementById('sev-total-amount');
  if(!tbody) return;

  // 데이터 미준비 — 테이블 스피너
  if(!_dataReady){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="margin-right:8px;color:#6366f1;"></i>데이터 불러오는 중...</td></tr>';
    if(tfoot) tfoot.style.display = 'none';
    return;
  }

  const todayStr = new Date().toISOString().slice(0,10);

  // 해당 고객사 재직 직원 (일용직 제외)
  const emps = allEmployees.filter(e =>
    e.company_id === _sevCompanyId &&
    (e.status === 'active' || e.status === '재직' || !e.status || e.status === '') &&
    e.employment_category !== '일용직'
  );

  const summaryCard   = document.getElementById('sev-summary-card');
  const summaryCount   = document.getElementById('sev-summary-count');
  const summaryNodata  = document.getElementById('sev-summary-nodata');
  const summaryUnder1  = document.getElementById('sev-summary-under1yr');
  const summaryNote    = document.getElementById('sev-summary-note');

  if(!emps.length){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#9ca3af;">해당 고객사에 재직 중인 근로자가 없습니다.</td></tr>';
    if(tfoot) tfoot.style.display = 'none';
    if(summaryCard) summaryCard.style.display = 'none';
    return;
  }

  const won = v => v ? Math.round(v).toLocaleString('ko-KR') + '원' : '-';
  const fmtDate = d => d || '-';
  let totalSev = 0;
  let cntTarget = 0;    // 추계 대상 (유효 계약 + 1년 이상)
  let cntUnder1yr = 0;  // 1년 미만 제외
  let cntNodata = 0;    // 급여 미입력
  let rows = [];

  emps.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(emp => {
    // 해당 직원의 모든 계약을 시작일 오름차순 정렬 (임시저장 제외)
    const empContracts = allContracts
      .filter(c => c.employee_id === emp.id && !c.is_draft)
      .sort((a,b) => (a.contract_start||'').localeCompare(b.contract_start||''));

    // ── 오늘 기준 유효 계약이 없는 직원은 퇴직급여 추계 대상 제외 ──
    // 유효 계약 조건: contract_start <= today AND (contract_end 없음 OR contract_end >= today)
    const hasActiveContract = empContracts.some(c => {
      const started = !c.contract_start || c.contract_start <= todayStr;
      const notEnded = !c.contract_end || c.contract_end >= todayStr;
      return started && notEnded;
    });
    if(!hasActiveContract) return;  // 만료·해지된 계약만 있으면 skip

    const lastContract = empContracts[empContracts.length - 1] || null;

    // 최초 입사일: 계약 중 가장 빠른 시작일, 없으면 emp.hire_date
    const firstContractStart = empContracts.length > 0 ? (empContracts[0].contract_start || '') : '';
    const hireDate = firstContractStart || emp.hire_date || '';

    // 총 재직기간: 최초 입사일 ~ 오늘
    const totalTenure = calcTenure(hireDate, todayStr);

    // 직전 3개월 급여 (오늘 기준)
    const pays3 = getPrev3MonthsPayrolls(emp.id, todayStr);
    const sev = calcSeverancePay(emp.id, hireDate, todayStr, pays3);
    const under1yr = totalTenure.totalDays < 365;
    if(!under1yr){
      totalSev += sev.amount || 0;
      cntTarget++;
      if(!pays3.length) cntNodata++;
    } else {
      cntUnder1yr++;
    }

    const amtColor = sev.amount > 0 ? '#b45309' : '#9ca3af';
    const nameColor = under1yr ? '#9ca3af' : '#1a1a2e';
    const totalDaysLabel = under1yr
      ? '<span style="color:#9ca3af;font-size:11px;font-style:italic;">1년 미만</span>'
      : `<span style="font-size:11.5px;color:#92400e;font-weight:700;">${totalTenure.text}</span>`;

    // ── 계약 이력 행들 생성 ──
    // 각 계약별 행: 계약 n건 표시 (rowspan으로 성명/부서/고용형태/통상임금/퇴직금/상태 묶음)
    const contractCount = Math.max(empContracts.length, 1);
    // 총 재직기간 행 포함 → rowspan = contractCount + 1
    const mainRowspan = contractCount + 1;

    let contractRows = '';

    if(empContracts.length === 0){
      // 계약 데이터 없음 — 입사일만 표시
      contractRows = `<tr>
        <td style="padding:7px 10px;font-size:12px;color:#9ca3af;border-bottom:1px dashed #f3f4f6;" colspan="2">계약 데이터 없음</td>
      </tr>`;
    } else {
      empContracts.forEach((c, idx) => {
        const cStart = fmtDate(c.contract_start);
        const cEnd   = c.contract_end ? fmtDate(c.contract_end) : '현재';
        const cEndForCalc = c.contract_end || todayStr;
        const cTenure = calcTenure(c.contract_start || hireDate, cEndForCalc);
        const isLast = idx === empContracts.length - 1;
        const rowBg = idx % 2 === 0 ? '' : 'background:#fafaf8;';
        const numBadge = `<span style="display:inline-block;min-width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;margin-right:5px;">${idx+1}</span>`;
        const cStatus = c.status === '해지' ? '<span style="font-size:10px;color:#dc2626;background:#fee2e2;padding:1px 5px;border-radius:4px;margin-left:4px;">해지</span>'
          : (c.status === '만료'||c.status === 'expired') ? '<span style="font-size:10px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:4px;margin-left:4px;">만료</span>'
          : (c.status === 'active'||c.status === '활성'||c.status === '유효') ? '<span style="font-size:10px;color:#15803d;background:#dcfce7;padding:1px 5px;border-radius:4px;margin-left:4px;">진행중</span>'
          : '';
        contractRows += `<tr style="${rowBg}border-bottom:1px dashed ${isLast?'#fcd34d':'#f3f4f6'};cursor:pointer;"
          onclick="openSevContractModal('${c.id}','${(emp.name||'').replace(/'/g,"&#39;")}',${idx})"
          onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='${rowBg?'#fafaf8':''}'"
          title="클릭하여 계약 조건 상세 보기">
          <td style="padding:6px 10px;font-size:12px;color:#374151;">
            ${numBadge}<span style="font-weight:500;">${cStart}</span>
            <span style="color:#9ca3af;margin:0 3px;">~</span>
            <span style="font-weight:500;">${cEnd}</span>${cStatus}
            <i class="fas fa-search" style="font-size:10px;color:#93c5fd;margin-left:5px;opacity:.8;"></i>
          </td>
          <td style="padding:6px 10px;font-size:12px;color:#6b7280;text-align:right;">${cTenure.text}</td>
        </tr>`;
      });
    }

    // 총 재직기간 합산 행
    const totalRow = `<tr style="background:#fffbeb;border-top:1px solid #fcd34d;">
      <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#92400e;">
        <i class="fas fa-sigma" style="font-size:10px;margin-right:4px;"></i>
        총 재직기간 &nbsp;<span style="font-weight:400;font-size:11px;color:#78716c;">(${fmtDate(hireDate)} ~ ${todayStr})</span>
      </td>
      <td style="padding:7px 10px;text-align:right;">${totalDaysLabel}</td>
    </tr>`;

    // ── 메인 그룹 행 (성명·부서 등은 첫 번째 계약 행에 rowspan) ──
    rows.push(`
      <tr style="border-top:2px solid #fde68a;">
        <td rowspan="${mainRowspan}" style="padding:10px 10px;font-weight:700;font-size:13px;color:${nameColor};vertical-align:top;border-right:1px solid #fef3c7;">${emp.name||'-'}</td>
        <td rowspan="${mainRowspan}" style="padding:10px 10px;color:#374151;vertical-align:top;border-right:1px solid #fef3c7;">${[emp.department,emp.position].filter(Boolean).join(' / ')||'-'}</td>
        <td rowspan="${mainRowspan}" style="padding:10px 10px;color:#374151;vertical-align:top;border-right:1px solid #fef3c7;">${emp.employment_category||'-'}</td>
        ${empContracts.length > 0 ? `
          <td style="padding:6px 10px;font-size:12px;color:#374151;cursor:pointer;"
            onclick="openSevContractModal('${empContracts[0].id}','${(emp.name||'').replace(/'/g,"&#39;")}',0)"
            onmouseover="this.parentElement.style.background='#eff6ff'"
            onmouseout="this.parentElement.style.background=''"
            title="클릭하여 계약 조건 상세 보기">
            <span style="display:inline-block;min-width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;margin-right:5px;">1</span>
            <span style="font-weight:500;">${fmtDate(empContracts[0].contract_start)}</span>
            <span style="color:#9ca3af;margin:0 3px;">~</span>
            <span style="font-weight:500;">${empContracts[0].contract_end ? fmtDate(empContracts[0].contract_end) : '현재'}</span>
            ${empContracts[0].status==='해지'?'<span style="font-size:10px;color:#dc2626;background:#fee2e2;padding:1px 5px;border-radius:4px;margin-left:4px;">해지</span>'
              :(empContracts[0].status==='만료'||empContracts[0].status==='expired')?'<span style="font-size:10px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:4px;margin-left:4px;">만료</span>'
              :(empContracts[0].status==='active'||empContracts[0].status==='활성'||empContracts[0].status==='유효')?'<span style="font-size:10px;color:#15803d;background:#dcfce7;padding:1px 5px;border-radius:4px;margin-left:4px;">진행중</span>':''}
            <i class="fas fa-search" style="font-size:10px;color:#93c5fd;margin-left:5px;opacity:.8;"></i>
          </td>
          <td style="padding:6px 10px;font-size:12px;color:#6b7280;text-align:right;cursor:pointer;"
            onclick="openSevContractModal('${empContracts[0].id}','${(emp.name||'').replace(/'/g,"&#39;")}',0)"
            title="클릭하여 계약 조건 상세 보기">${calcTenure(empContracts[0].contract_start||hireDate, empContracts[0].contract_end||todayStr).text}</td>
        ` : `<td style="padding:6px 10px;font-size:12px;color:#9ca3af;" colspan="2">계약 데이터 없음</td>`}
        <td rowspan="${mainRowspan}" style="padding:10px 10px;text-align:right;vertical-align:top;border-left:1px solid #fef3c7;color:#1d4ed8;font-weight:600;">
          ${under1yr ? '<span style="color:#d1d5db;font-size:11px;">-</span>' : pays3.length ? won(sev.ordinary3 / 3) : '<span style="color:#9ca3af;font-size:11px;">급여 데이터 없음</span>'}
        </td>
        <td rowspan="${mainRowspan}" style="padding:10px 10px;text-align:right;vertical-align:top;font-weight:700;font-size:13.5px;border-left:1px solid #fef3c7;color:${amtColor};">
          ${under1yr ? '<span style="color:#9ca3af;font-size:11px;">1년 미만</span>' : sev.amount>0 ? won(sev.amount) : '<span style="color:#9ca3af;font-size:11px;">급여 데이터 필요</span>'}
        </td>
        <td rowspan="${mainRowspan}" style="padding:10px 10px;text-align:center;vertical-align:top;border-left:1px solid #fef3c7;">${sevStatusBadge(emp, lastContract)}</td>
      </tr>
      ${empContracts.slice(1).map((c, idx) => {
        const cStart = fmtDate(c.contract_start);
        const cEnd   = c.contract_end ? fmtDate(c.contract_end) : '현재';
        const cEndForCalc = c.contract_end || todayStr;
        const cTenure = calcTenure(c.contract_start || hireDate, cEndForCalc);
        const isLast = idx === empContracts.length - 2;
        const rowBg = (idx+1) % 2 === 0 ? '' : 'background:#fafaf8;';
        const numBadge = `<span style="display:inline-block;min-width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;margin-right:5px;">${idx+2}</span>`;
        const cStatus = c.status==='해지'?'<span style="font-size:10px;color:#dc2626;background:#fee2e2;padding:1px 5px;border-radius:4px;margin-left:4px;">해지</span>'
          :(c.status==='만료'||c.status==='expired')?'<span style="font-size:10px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:4px;margin-left:4px;">만료</span>'
          :(c.status==='active'||c.status==='활성'||c.status==='유효')?'<span style="font-size:10px;color:#15803d;background:#dcfce7;padding:1px 5px;border-radius:4px;margin-left:4px;">진행중</span>':'';
        const realIdx = idx + 1;
        return `<tr style="${rowBg}border-bottom:1px dashed ${isLast?'#fcd34d':'#f3f4f6'};cursor:pointer;"
          onclick="openSevContractModal('${c.id}','${(emp.name||'').replace(/'/g,"&#39;")}',${realIdx})"
          onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='${rowBg?'#fafaf8':''}'"
          title="클릭하여 계약 조건 상세 보기">
          <td style="padding:6px 10px;font-size:12px;color:#374151;">
            ${numBadge}<span style="font-weight:500;">${cStart}</span>
            <span style="color:#9ca3af;margin:0 3px;">~</span>
            <span style="font-weight:500;">${cEnd}</span>${cStatus}
            <i class="fas fa-search" style="font-size:10px;color:#93c5fd;margin-left:5px;opacity:.8;"></i>
          </td>
          <td style="padding:6px 10px;font-size:12px;color:#6b7280;text-align:right;">${cTenure.text}</td>
        </tr>`;
      }).join('')}
      <tr style="background:#fffbeb;border-bottom:2px solid #fde68a;">
        <td style="padding:7px 10px;font-size:12px;font-weight:700;color:#92400e;">
          <i class="fas fa-layer-group" style="font-size:10px;margin-right:4px;"></i>
          총 재직기간
          <span style="font-weight:400;font-size:11px;color:#78716c;margin-left:4px;">(${fmtDate(hireDate)} ~ ${todayStr})</span>
        </td>
        <td style="padding:7px 10px;text-align:right;">${totalDaysLabel}
          ${!under1yr ? `<span style="display:block;font-size:10.5px;color:#9ca3af;font-weight:400;">총 ${totalTenure.totalDays.toLocaleString('ko-KR')}일</span>` : ''}
        </td>
      </tr>
    `);
  });

  tbody.innerHTML = rows.join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#9ca3af;">해당하는 근로자가 없습니다.</td></tr>';
  if(tfoot) tfoot.style.display = 'none'; // tfoot은 사용하지 않음

  // ── 합계 요약 카드 ──
  if(summaryCard){
    if(rows.length === 0){
      summaryCard.style.display = 'none';
    } else {
      summaryCard.style.display = '';
      if(summaryCount)  summaryCount.textContent  = cntTarget.toLocaleString('ko-KR');
      if(summaryNodata) summaryNodata.textContent  = cntNodata.toLocaleString('ko-KR');
      if(summaryUnder1) summaryUnder1.textContent  = cntUnder1yr.toLocaleString('ko-KR');
      const totalEl = document.getElementById('sev-total-amount');
      if(totalEl){
        totalEl.textContent = totalSev > 0
          ? Math.round(totalSev).toLocaleString('ko-KR')
          : '0';
      }
      if(summaryNote){
        summaryNote.textContent = cntNodata > 0
          ? `※ 급여 미입력 ${cntNodata}명은 추계액이 0원으로 반영됨`
          : '오늘 기준 예상 추계액 (실제 퇴직 시 달라질 수 있음)';
      }
    }
  }
}

// ── 탭2: 지급 발생 이력 ──
function renderSevHistoryTab(){
  const tbody = document.getElementById('sev-history-tbody');
  if(!tbody) return;

  // 데이터 미준비 — 테이블 스피너
  if(!_dataReady){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="margin-right:8px;color:#6366f1;"></i>데이터 불러오는 중...</td></tr>';
    return;
  }

  // ── 퇴직금 지급 발생 이력 대상 조건 ──
  // "마지막 계약의 status가 해지 또는 만료로 명시 선언된" 직원만 표시
  // contract_end < today 여부만으로는 노출하지 않음 (명시적 선언 필요)
  const todayStr2 = new Date().toISOString().slice(0,10);
  const resignedEmps = allEmployees.filter(e => {
    if(e.company_id !== _sevCompanyId) return false;
    if(e.employment_category === '일용직') return false;
    // 해당 직원의 마지막 계약 확인
    const conts = allContracts
      .filter(c => c.employee_id === e.id && !c.is_draft)
      .sort((a,b) => (a.contract_start||'').localeCompare(b.contract_start||''));
    const last = conts[conts.length - 1];
    if(!last) return false;
    // 마지막 계약 status가 해지 또는 만료로 명시된 경우만
        return last.status === '해지' || last.status === '만료' ||
           last.status === 'expired' || last.status === 'terminated';
  });
}
