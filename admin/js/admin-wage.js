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
    'year_end_tax_adjust','health_insurance_adjust','advance_deduction','total_deduction',
    'net_pay'
  ];
  const sums = {};
  sumFields.forEach(f => sums[f] = 0);

  const won = v => (!v || v === 0) ? '-' : Number(v).toLocaleString('ko-KR');
  const wonNum = v => (!v || v === 0) ? 0 : Number(v);

  // ══ 카드형 렌더링 ══
  // 구조: .wl-card-head (인적+요약, flex) + .wl-tbl (지급/공제 상세, 9열 테이블)
  // 9열 구성: [구분5%] [항목th9%·금액td12%]×4쌍 [여백4%]
  //           = 1 + 4×2 + 1 = 10열 (colgroup)

  // ── 헬퍼 ──
  const num  = v => { const n = Number(v); return (!v || n === 0) ? '-' : n.toLocaleString('ko-KR'); };
  const numB = v => { const n = Number(v); return (!v || n === 0) ? '<span style="color:#94a3b8;">-</span>' : `<strong>${n.toLocaleString('ko-KR')}</strong>`; };

  // 10열 colgroup (공통)
  // col1: 구분 | col2~9: th·td ×4쌍 | col10: 여백
  const CG = `<colgroup>
    <col class="c-sec">
    <col class="c-lbl"><col class="c-val">
    <col class="c-lbl"><col class="c-val">
    <col class="c-lbl"><col class="c-val">
    <col class="c-lbl"><col class="c-val">
  </colgroup>`;

  // 지급 행 생성: 구분레이블, [항목·값]×4
  // items = [{label, val}, ...] (최대 4개, 부족하면 빈칸)
  const payRow = (secLabel, items) => {
    const cells = Array(4).fill(null).map((_, i) => {
      const it = items[i];
      if (!it) return `<th class="wl-empty" style="background:#f9fafb;border-color:#e5e7eb;"></th><td class="wl-empty"></td>`;
      return `<th>${it.label}</th><td>${numB(it.val)}</td>`;
    });
    return `<tr class="wl-pay-row">
      <td class="wl-sec wl-sec-pay">${secLabel}</td>
      ${cells.join('')}
    </tr>`;
  };

  // 공제 행 생성: 구분레이블, [항목·값]×4
  // secLabel이 있는 첫 번째 행 → 인라인 border-top으로 지급/공제 경계선 강제 적용
  const DIVIDER = 'border-top:4px double #94a3b8;';
  const dedRow = (secLabel, items) => {
    const isFirst = !!secLabel;
    const bt = isFirst ? DIVIDER : '';
    const cells = Array(4).fill(null).map((_, i) => {
      const it = items[i];
      if (!it) return `<th class="wl-empty" style="background:#f9fafb;border-color:#e5e7eb;${bt}"></th><td class="wl-empty" style="${bt}"></td>`;
      return `<th style="${bt}">${it.label}</th><td style="${bt}">${numB(it.val)}</td>`;
    });
    return `<tr class="wl-ded-row">
      <td class="wl-sec wl-sec-ded" style="${bt}">${secLabel}</td>
      ${cells.join('')}
    </tr>`;
  };

  // ── 직원 카드 목록 (가나다 순 정렬) ──
  pays.sort((a, b) => {
    const na = (empMap[a.employee_id]?.name || '');
    const nb = (empMap[b.employee_id]?.name || '');
    return na.localeCompare(nb, 'ko');
  });
  // 지급월 범위 (계약 조회용)
  const _wlMonthStart = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const _wlMonthEnd   = new Date(yr, mo, 0).toISOString().slice(0,10);

  const cards = pays.map((p, idx) => {
    sumFields.forEach(f => sums[f] += wonNum(p[f]));
    const emp = empMap[p.employee_id] || {};

    // 헤더 셀 데이터
    const payDate = p.pay_date ? p.pay_date.slice(0,10) : '-';

    // ── 계약상 임금 정보 조회 ──
    // ① 우선: 지급월과 기간이 겹치는 유효 계약
    // ② fallback: 기간이 안 맞더라도 해당 직원의 가장 최근 계약
    //    (계약 갱신 누락 상태에서 급여가 입력된 경우 계약연봉 셀 공백 방지)
    const _empCtCandidates = allContracts.filter(c => {
      if(c.employee_id !== p.employee_id) return false;
      if(c.is_draft || c.is_voided_by_amend) return false;
      if(['취소','파기'].includes(c.status)) return false;
      return true;
    });
    const empCt = _empCtCandidates.find(c => {
      const s  = c.contract_start || '';
      const ed = c.contract_end   || '';
      if(s && s > _wlMonthEnd)    return false;
      if(ed && ed < _wlMonthStart) return false;
      return true;
    }) || _empCtCandidates.sort((a, b) =>
      (b.contract_start || '').localeCompare(a.contract_start || '')
    )[0] || null;
    const fmtWon = v => v ? Number(v).toLocaleString('ko-KR') + '원' : null;
    const cat = emp.employment_category || (empCt ? empCt.contract_type : '') || '';
    const isRegOrCont = ['정규직','정규직 수습','계약직','계약직 수습'].includes(cat);
    const isHourly    = ['시급제','단시간','아르바이트'].includes(cat);
    // ── 계약임금 표시 항목 결정 ──
    // 규칙: 고용형태별로 가장 의미있는 항목 1~2개만 표시하여 헤더 셀 중복 방지
    //   ① 연봉제(정규직·계약직): annual_salary 우선, 없으면 base_salary
    //   ② 시급제·단시간: hourly_wage
    //   ③ 일급제 해당 직원: daily_wage
    //   → annual_salary와 base_salary를 동시에 표시하지 않음
    //   → isRegOrCont가 아닌 직원에게 계약연봉/월기본급이 표시되지 않도록 가드
    const ctWageItems = [];
    if(isRegOrCont && empCt?.annual_salary) {
      ctWageItems.push({ lbl:'계약연봉',  val: fmtWon(empCt.annual_salary) });
    } else if(isRegOrCont && empCt?.base_salary) {
      ctWageItems.push({ lbl:'월 기본급', val: fmtWon(empCt.base_salary) });
    }
    if(isHourly && empCt?.hourly_wage)
      ctWageItems.push({ lbl:'통상시급',  val: fmtWon(empCt.hourly_wage) });
    if(!isRegOrCont && !isHourly && empCt?.daily_wage)
      ctWageItems.push({ lbl:'계약일급',  val: fmtWon(empCt.daily_wage) });
    // 헤더 셀 HTML — 고용형태 셀과 동일한 .lbl/.val.sm 클래스 색상 그대로 사용
    const ctWageCells = ctWageItems.map(it => `
      <div class="wl-head-cell narrow" style="border-left:1px solid #334155;">
        <span class="lbl">${it.lbl}</span>
        <span class="val sm">${it.val}</span>
      </div>`).join('');

    // 지급내역 행 구성 (20항목 → 5행 × 4쌍)
    const payRows = [
      payRow('지급내역', [
        {label:'기본급',         val: p.base_salary},
        {label:'주휴수당',       val: p.weekly_holiday_pay},
        {label:'직책수당',       val: p.position_allowance},
        {label:'연장근로수당',   val: p.overtime_pay},
      ]),
      payRow('', [
        {label:'야간근로수당',   val: p.night_pay},
        {label:'휴일근로수당',   val: p.holiday_pay},
        {label:'교통비',         val: p.transportation_allowance},
        {label:'자가운전보조금', val: p.self_driving_allowance},
      ]),
      payRow('', [
        {label:'벽지수당',       val: p.remote_area_allowance},
        {label:'식대',           val: p.meal_allowance},
        {label:'출산·보육수당',  val: p.childcare_allowance},
        {label:'연구활동비',     val: p.research_allowance},
      ]),
      payRow('', [
        {label:'연차수당',       val: p.annual_leave_pay},
        {label:'정기상여금',     val: p.bonus_pay},
        {label:'성과급',         val: p.performance_pay},
        {label:'실비변상적급여', val: p.actual_expense_pay},
      ]),
      payRow('', [
        {label:'통신비',         val: p.communication_pay},
        {label:'기술수당',       val: p.skill_allowance},
        {label:'면허수당',       val: p.license_allowance},
        {label:'기타수당',       val: (p.etc_allowance||0)+(p.other_pay||0)},
      ]),
    ].join('');

    // 공제내역 행 구성 (보수월액 + 9항목 → 3행)
    const dedRows = [
      dedRow('공제내역', [
        {label:'보수월액',   val: p.standard_monthly_pay},
        {label:'소득세',     val: p.income_tax},
        {label:'주민세',     val: p.local_income_tax},
        {label:'건강보험',   val: p.health_insurance},
      ]),
      dedRow('', [
        {label:'장기요양보험료', val: p.long_term_care},
        {label:'국민연금',       val: p.national_pension},
        {label:'고용보험',       val: p.employment_insurance},
        {label:'연말정산',       val: p.year_end_tax_adjust},
      ]),
      dedRow('', [
        {label:'건강보험정산',   val: p.health_insurance_adjust},
        {label:'기타공제',       val: p.advance_deduction},
        null,
        null,
      ]),
    ].join('');

    return `
    <div class="wl-card">
      <!-- 인적사항 + 요약 헤더 -->
      <div class="wl-card-head">
        <div class="wl-head-no">${idx+1}</div>
        <div class="wl-head-cell wide">
          <span class="lbl">성명</span>
          <span class="val">${emp.name||'-'}</span>
        </div>
        <div class="wl-head-cell">
          <span class="lbl">부서</span>
          <span class="val sm">${emp.department||'-'}</span>
        </div>
        <div class="wl-head-cell">
          <span class="lbl">직책</span>
          <span class="val sm">${emp.position||'-'}</span>
        </div>
        <div class="wl-head-cell">
          <span class="lbl">고용형태</span>
          <span class="val sm">${emp.employment_category||'-'}</span>
        </div>
        ${ctWageCells}
        <div class="wl-head-cell narrow">
          <span class="lbl">근로일수 / 총근로시간</span>
          <span class="val sm">${num(p.work_days)}일 / ${num(p.total_work_hours)}H</span>
        </div>
        <div class="wl-head-cell narrow">
          <span class="lbl">연장 / 야간 / 휴일</span>
          <span class="val sm">${num(p.overtime_hours)} / ${num(p.night_hours)} / ${num(p.holiday_hours)} H</span>
        </div>
        <div class="wl-head-cell narrow c-gross">
          <span class="lbl">지급총액</span>
          <span class="val">${num(p.gross_pay)}</span>
        </div>
        <div class="wl-head-cell narrow c-ded">
          <span class="lbl">공제합계</span>
          <span class="val">${num(p.total_deduction)}</span>
        </div>
        <div class="wl-head-cell narrow c-net">
          <span class="lbl">실수령액</span>
          <span class="val">${num(p.net_pay)}</span>
        </div>
        <div class="wl-head-cell fixed">
          <span class="lbl">급여지급일</span>
          <span class="val sm">${payDate}</span>
        </div>

      </div>
      <!-- 지급·공제 상세 테이블 -->
      <div class="wl-tbl-wrap"><table class="wl-tbl">${CG}
        <tbody>
          ${payRows}
          ${dedRows}
        </tbody>
      </table></div>
    </div>`;
  }).join('');

  // ── 합계 카드 ──
  const SB = f => { const n = sums[f]; return (!n || n===0) ? '<span style="color:#475569;">-</span>' : `<strong>${n.toLocaleString('ko-KR')}</strong>`; };
  const SBn= f => { const n = sums[f]; return n===0 ? '<span style="color:#475569;">-</span>' : `<strong>${n.toLocaleString('ko-KR')}</strong>`; };

  const sumPayRows = [
    payRow('지급내역', [
      {label:'기본급',         val: sums.base_salary},
      {label:'주휴수당',       val: sums.weekly_holiday_pay},
      {label:'직책수당',       val: sums.position_allowance},
      {label:'연장근로수당',   val: sums.overtime_pay},
    ]),
    payRow('', [
      {label:'야간근로수당',   val: sums.night_pay},
      {label:'휴일근로수당',   val: sums.holiday_pay},
      {label:'교통비',         val: sums.transportation_allowance},
      {label:'자가운전보조금', val: sums.self_driving_allowance},
    ]),
    payRow('', [
      {label:'벽지수당',       val: sums.remote_area_allowance},
      {label:'식대',           val: sums.meal_allowance},
      {label:'출산·보육수당',  val: sums.childcare_allowance},
      {label:'연구활동비',     val: sums.research_allowance},
    ]),
    payRow('', [
      {label:'연차수당',       val: sums.annual_leave_pay},
      {label:'정기상여금',     val: sums.bonus_pay},
      {label:'성과급',         val: sums.performance_pay},
      {label:'실비변상적급여', val: sums.actual_expense_pay},
    ]),
    payRow('', [
      {label:'통신비',         val: sums.communication_pay},
      {label:'기술수당',       val: sums.skill_allowance},
      {label:'면허수당',       val: sums.license_allowance},
      {label:'기타수당',       val: sums.etc_allowance + sums.other_pay},
    ]),
  ].join('');

  const sumDedRows = [
    dedRow('공제내역', [
      {label:'보수월액',   val: sums.standard_monthly_pay},
      {label:'소득세',     val: sums.income_tax},
      {label:'주민세',     val: sums.local_income_tax},
      {label:'건강보험',   val: sums.health_insurance},
    ]),
    dedRow('', [
      {label:'장기요양보험료', val: sums.long_term_care},
      {label:'국민연금',       val: sums.national_pension},
      {label:'고용보험',       val: sums.employment_insurance},
      {label:'연말정산',       val: sums.year_end_tax_adjust},
    ]),
    dedRow('', [
      {label:'건강보험정산',   val: sums.health_insurance_adjust},
      {label:'기타공제',       val: sums.advance_deduction},
      null,
      null,
    ]),
  ].join('');

  const sumCard = `
  <div class="wl-sum-card">
    <div class="wl-card-head">
      <div class="wl-head-no" style="font-size:11px;">합계</div>
      <div class="wl-head-cell wide">
        <span class="lbl">총 인원</span>
        <span class="val">${pays.length}명</span>
      </div>
      <div class="wl-head-cell narrow">
        <span class="lbl">총 근로일수</span>
        <span class="val sm">${sums.work_days.toLocaleString('ko-KR')}일</span>
      </div>
      <div class="wl-head-cell narrow">
        <span class="lbl">총 근로시간</span>
        <span class="val sm">${sums.total_work_hours.toLocaleString('ko-KR')}H</span>
      </div>
      <div class="wl-head-cell narrow">
        <span class="lbl">연장 / 야간 / 휴일</span>
        <span class="val sm">${sums.overtime_hours} / ${sums.night_hours} / ${sums.holiday_hours} H</span>
      </div>
      <div class="wl-head-cell narrow c-gross">
        <span class="lbl">지급총액 합계</span>
        <span class="val">${sums.gross_pay.toLocaleString('ko-KR')}</span>
      </div>
      <div class="wl-head-cell narrow c-ded">
        <span class="lbl">공제합계</span>
        <span class="val">${sums.total_deduction.toLocaleString('ko-KR')}</span>
      </div>
      <div class="wl-head-cell narrow c-net">
        <span class="lbl">실수령액 합계</span>
        <span class="val">${sums.net_pay.toLocaleString('ko-KR')}</span>
      </div>
    </div>
    <div class="wl-tbl-wrap"><table class="wl-tbl">${CG}
      <tbody>
        ${sumPayRows}
        ${sumDedRows}
      </tbody>
    </table></div>
  </div>`;

  area.innerHTML = `
    <div style="padding:12px 16px 6px;font-size:12px;color:#6b7280;">
      ${_wlCompanyName} &nbsp;·&nbsp; ${yr}년 ${mo}월 임금대장 &nbsp;·&nbsp; 총 <strong style="color:#1a1a2e;">${pays.length}명</strong>
    </div>
    <div style="padding:0 4px 12px;">
      ${cards}
      ${sumCard}
    </div>`;

  // ── No 셀 너비를 테이블 구분 열(첫 번째 td.wl-sec) 실제 너비에 동기화 ──
  // table-layout:auto 에서 실제 렌더링 너비는 JS로만 알 수 있음
  requestAnimationFrame(() => {
    const firstSecCell = area.querySelector('.wl-tbl td.wl-sec');
    if (firstSecCell) {
      const secW = firstSecCell.getBoundingClientRect().width;
      area.querySelectorAll('.wl-head-no').forEach(el => {
        el.style.width    = secW + 'px';
        el.style.minWidth = secW + 'px';
      });
    }
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

  if(!resignedEmps.length){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#9ca3af;">퇴직금 발생 이력이 없습니다.<br><span style="font-size:11px;color:#d1d5db;">계약이 만료 또는 해지 처리된 직원이 없습니다.</span></td></tr>';
    return;
  }

  const won = v => v ? Math.round(v).toLocaleString('ko-KR') + '원' : '-';
  const fmtDate = d => d || '-';

  // 근로자명 가나다순 정렬
  const sorted = [...resignedEmps].sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));

  const contractBadges = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];

  const rows = sorted.map(emp => {
    // ── 해당 직원의 모든 계약을 시작일 오름차순 정렬 ──
    const empContracts = allContracts
      .filter(c => c.employee_id === emp.id && !c.is_draft)
      .sort((a,b) => (a.contract_start||'').localeCompare(b.contract_start||''));

    const lastContract = empContracts[empContracts.length - 1] || null;

    // 퇴사(계약종료)일: 마지막 계약의 contract_end → emp.resign_date → 오늘 순
    const resignDate = lastContract?.contract_end || emp.resign_date || todayStr2;

    // 최초 입사일
    const firstContractStart = empContracts.length > 0 ? (empContracts[0].contract_start||'') : '';
    const hireDate = firstContractStart || emp.hire_date || '';

    // 총 재직기간 (최초 입사일 ~ 퇴사일)
    const totalTenure = calcTenure(hireDate, resignDate);
    const under1yr = totalTenure.totalDays < 365;

    // 퇴사 사유
    const reason = lastContract?.status==='해지' ? '계약 해지'
      : (lastContract?.status==='만료'||lastContract?.status==='expired') ? '계약 만료'
      : '퇴사';

    // 퇴직금 계산
    const pays3 = getPrev3MonthsPayrolls(emp.id, resignDate);
    const sev   = calcSeverancePay(emp.id, hireDate, resignDate, pays3);

    // window[key] 패턴 — 정산내역서 팝업용
    const _sevRowKey = `sev_hist_${emp.id}`;
    window[_sevRowKey] = {
      empId:emp.id, empName:emp.name||'', hireDate, resignDate,
      department:emp.department||'', position:emp.position||'',
      phone:emp.phone||'', email:emp.email||'',
      reason,
      tenureText: totalTenure.text,
      tenureDays: totalTenure.totalDays,
      ordinary3:sev.ordinary3, average3:sev.average3,
      daily1:sev.daily1, days3:sev.days3,
      dailyOrdinary:sev.dailyOrdinary, dailyAverage:sev.dailyAverage,
      amount:sev.amount, pays3count:pays3.length
    };

    const contractCount = empContracts.length;
    const deptPos = [emp.department, emp.position].filter(Boolean).join(' / ') || '-';

    // ── 1년 미만 — 퇴직금 없음 ──
    if(under1yr){
      // 계약 이력 행 + 총재직기간 합산 행 = contractCount + 1
      const mainRowspan = Math.max(contractCount, 1) + 1;
      let html = '';

      // 공통 앞부분 셀 (열1~3 rowspan): 퇴사일 | 성명 | 부서/직책
      const commonFront = `
        <td style="padding:9px 10px;font-weight:600;color:#4c1d95;vertical-align:middle;" rowspan="${mainRowspan}">${resignDate||'-'}</td>
        <td style="padding:9px 10px;font-weight:700;color:#6b7280;vertical-align:middle;" rowspan="${mainRowspan}">${emp.name||'-'}</td>
        <td style="padding:9px 10px;color:#9ca3af;vertical-align:middle;" rowspan="${mainRowspan}">${deptPos}</td>`;

      // 공통 뒷부분 셀 (열6~8 rowspan): 통상임금 | 퇴직금 | 사유
      const commonTrail = `
        <td style="padding:9px 10px;text-align:right;color:#9ca3af;vertical-align:middle;" rowspan="${mainRowspan}">-</td>
        <td style="padding:9px 10px;text-align:right;color:#9ca3af;vertical-align:middle;" rowspan="${mainRowspan}">1년 미만 — 해당 없음</td>
        <td style="padding:9px 10px;vertical-align:middle;" rowspan="${mainRowspan}"><span style="padding:2px 8px;border-radius:10px;background:#f3f4f6;color:#9ca3af;font-size:11px;">${reason}</span></td>`;

      if(contractCount === 0){
        // 계약 데이터 없음: 열1~3(front) + 열4(계약없음) + 열5(재직기간) + 열6~8(trail)
        html += `<tr style="background:#fafafa;color:#9ca3af;">
          ${commonFront}
          <td style="padding:9px 10px;color:#9ca3af;font-style:italic;">계약 정보 없음</td>
          <td style="padding:9px 10px;text-align:right;color:#9ca3af;">${totalTenure.text}</td>
          ${commonTrail}
        </tr>`;
      } else {
        empContracts.forEach((ct, idx) => {
          const badge    = contractBadges[idx] || `(${idx+1})`;
          const ctStart  = ct.contract_start  || '-';
          const ctEnd    = ct.contract_end    || '재직 중';
          const ctTenure = calcTenure(ct.contract_start||'', ct.contract_end||resignDate);
          const ctHistCell = `<td style="padding:9px 10px;color:#9ca3af;">
            <span style="display:inline-block;width:20px;font-weight:700;color:#9ca3af;">${badge}</span>
            ${ctStart} ~ ${ctEnd}
          </td>`;
          const ctTenureCell = `<td style="padding:9px 10px;text-align:right;color:#9ca3af;">${ctTenure.text}</td>`;
          if(idx === 0){
            // 첫 계약 행: front(1~3) + 계약이력(4) + 재직기간(5) + trail(6~8)
            html += `<tr style="background:#fafafa;color:#9ca3af;">${commonFront}${ctHistCell}${ctTenureCell}${commonTrail}</tr>`;
          } else {
            // 추가 계약 행: 계약이력(4) + 재직기간(5) 만 채움
            html += `<tr style="background:#fafafa;color:#9ca3af;">${ctHistCell}${ctTenureCell}</tr>`;
          }
        });
      }

      // 총재직기간 합산 행: 열4(라벨) + 열5(값) 만 채움 (열1~3, 6~8은 rowspan으로 이미 점유)
      html += `<tr style="background:#fef9c3;color:#9ca3af;">
        <td style="padding:7px 10px;font-size:11.5px;color:#b45309;font-weight:600;text-align:center;">▶ 총 재직기간 합산</td>
        <td style="padding:7px 10px;text-align:right;font-weight:700;color:#b45309;">${totalTenure.text} (${totalTenure.totalDays.toLocaleString('ko-KR')}일)</td>
      </tr>`;

      return html;
    }

    // ── 메인 케이스 ──
    const mainRowspan = Math.max(contractCount, 1) + 1;
    let html = '';

    // 공통 앞부분 셀 (열1~3 rowspan): 퇴사일 | 성명 | 부서/직책
    const commonFront = `
      <td style="padding:9px 10px;font-weight:600;color:#4c1d95;vertical-align:middle;" rowspan="${mainRowspan}">${resignDate}</td>
      <td style="padding:9px 10px;font-weight:700;color:#1a1a2e;vertical-align:middle;" rowspan="${mainRowspan}">${emp.name||'-'}</td>
      <td style="padding:9px 10px;color:#374151;vertical-align:middle;" rowspan="${mainRowspan}">${deptPos}</td>`;

    // 공통 뒷부분 셀 (열6~8 rowspan): 평균 월 통상임금 | 퇴직금 | 사유
    const commonTrail = `
      <td style="padding:9px 10px;text-align:right;color:#1d4ed8;font-weight:600;vertical-align:middle;" rowspan="${mainRowspan}">${pays3.length ? won(sev.ordinary3 / 3) : '<span style="color:#9ca3af;font-size:11px;">급여 데이터 없음</span>'}</td>
      <td style="padding:9px 10px;text-align:right;font-weight:700;vertical-align:middle;color:${sev.amount>0?'#7c3aed':'#9ca3af'};" rowspan="${mainRowspan}">${sev.amount>0 ? won(sev.amount) : '<span style="font-size:11px;">급여 데이터 필요</span>'}</td>
      <td style="padding:9px 10px;vertical-align:middle;" rowspan="${mainRowspan}"><span style="padding:2px 8px;border-radius:10px;background:#f3f4f6;color:#374151;font-size:11px;">${reason}</span></td>`;

    const rowClickAttr = `style="cursor:pointer;" onclick="openSevDetail(window['${_sevRowKey}'])"
      onmouseover="this.parentElement.querySelectorAll('tr[data-sev-emp=\\'${emp.id}\\']').forEach(r=>r.style.background='#f5f3ff')"
      onmouseout="this.parentElement.querySelectorAll('tr[data-sev-emp=\\'${emp.id}\\']').forEach(r=>r.style.background='')"
      title="클릭하여 퇴직금 정산내역서 확인" data-sev-emp="${emp.id}"`;

    if(contractCount === 0){
      // 계약 없음: front(1~3) + 계약없음(4) + 재직기간(5) + trail(6~8)
      html += `<tr ${rowClickAttr}>
        ${commonFront}
        <td style="padding:9px 10px;color:#9ca3af;font-style:italic;">계약 정보 없음</td>
        <td style="padding:9px 10px;text-align:right;color:#374151;">${totalTenure.text}</td>
        ${commonTrail}
      </tr>`;
    } else {
      empContracts.forEach((ct, idx) => {
        const badge    = contractBadges[idx] || `(${idx+1})`;
        const ctStart  = ct.contract_start  || '-';
        const ctEnd    = ct.contract_end    || '재직 중';
        const ctTenure = calcTenure(ct.contract_start||'', ct.contract_end||resignDate);
        const ctHistCell = `<td style="padding:9px 10px;color:#374151;">
          <span style="display:inline-block;width:20px;font-weight:700;color:#7c3aed;">${badge}</span>
          ${ctStart} ~ ${ctEnd}
        </td>`;
        const ctTenureCell = `<td style="padding:9px 10px;text-align:right;color:#374151;">${ctTenure.text}</td>`;

        if(idx === 0){
          // 첫 계약 행: front(1~3) + 계약이력(4) + 재직기간(5) + trail(6~8)
          html += `<tr ${rowClickAttr}>${commonFront}${ctHistCell}${ctTenureCell}${commonTrail}</tr>`;
        } else {
          // 추가 계약 행: 계약이력(4) + 재직기간(5) 만 채움
          html += `<tr data-sev-emp="${emp.id}" style="cursor:pointer;" onclick="openSevDetail(window['${_sevRowKey}'])"
            onmouseover="this.parentElement.querySelectorAll('tr[data-sev-emp=\\'${emp.id}\\']').forEach(r=>r.style.background='#f5f3ff')"
            onmouseout="this.parentElement.querySelectorAll('tr[data-sev-emp=\\'${emp.id}\\']').forEach(r=>r.style.background='')"
            title="클릭하여 퇴직금 정산내역서 확인">
            ${ctHistCell}${ctTenureCell}
          </tr>`;
        }
      });
    }

    // 총재직기간 합산 행: 열4(라벨) + 열5(값) 만 채움 (열1~3, 6~8은 rowspan으로 이미 점유)
    html += `<tr style="background:#fffbeb;" data-sev-emp="${emp.id}">
      <td style="padding:7px 10px;font-size:11.5px;color:#92400e;font-weight:600;text-align:center;">▶ 총 재직기간 합산</td>
      <td style="padding:7px 10px;text-align:right;font-weight:700;color:#92400e;">${totalTenure.text} (${totalTenure.totalDays.toLocaleString('ko-KR')}일)</td>
    </tr>`;

    return html;
  });

  tbody.innerHTML = rows.join('');
}

// ── 정산내역표 팝업 열기 ──
function openSevDetail(data){
  _sevCurrentRecord = data;
  const modal = document.getElementById('sev-detail-modal');
  const body  = document.getElementById('sev-detail-body');
  if(!modal||!body) return;

  const won = v => v ? Math.round(v).toLocaleString('ko-KR') : '0';
  const wonW = v => v ? Math.round(v).toLocaleString('ko-KR') + '원' : '0원';

  // 이메일 버튼 활성/비활성
  const emailBtn = document.getElementById('sev-btn-email');
  if(emailBtn){
    const hasEmail = !!data.email;
    emailBtn.disabled = !hasEmail;
    emailBtn.style.opacity = hasEmail ? '1' : '0.4';
    emailBtn.style.cursor = hasEmail ? 'pointer' : 'not-allowed';
    emailBtn.title = hasEmail ? '' : '직원 정보에 이메일이 등록되지 않았습니다.';
  }

  const today = new Date().toISOString().slice(0,10);
  const noData = data.pays3count === 0;

  body.innerHTML = `
    <!-- 정산내역서 타이틀 -->
    <div id="sev-print-area" style="font-family:'맑은 고딕',sans-serif;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-size:18px;font-weight:800;color:#1a1a2e;letter-spacing:2px;margin-bottom:4px;">퇴 직 금 정 산 내 역 서</div>
        <div style="font-size:12px;color:#6b7280;">작성일: ${today} &nbsp;|&nbsp; ${_sevCompanyName}</div>
      </div>

      <!-- 근로자 기본 정보 -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12.5px;">
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;border:1px solid #e2e8f0;width:100px;font-weight:700;color:#374151;text-align:left;">성 명</th>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">${data.empName}</td>
          <th style="padding:8px 12px;border:1px solid #e2e8f0;width:100px;font-weight:700;color:#374151;text-align:left;">부서/직책</th>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;">${[data.department,data.position].filter(Boolean).join(' / ')||'-'}</td>
        </tr>
        <tr>
          <th style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#374151;text-align:left;">입 사 일</th>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;">${data.hireDate||'-'}</td>
          <th style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#374151;text-align:left;">퇴 사 일</th>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;color:#dc2626;">${data.resignDate||'-'}</td>
        </tr>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#374151;text-align:left;">재직기간</th>
          <td colspan="3" style="padding:8px 12px;border:1px solid #e2e8f0;">${data.tenureText} (총 ${data.tenureDays.toLocaleString('ko-KR')}일)</td>
        </tr>
        <tr>
          <th style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#374151;text-align:left;">퇴사 사유</th>
          <td colspan="3" style="padding:8px 12px;border:1px solid #e2e8f0;">${data.reason}</td>
        </tr>
      </table>

      <!-- 퇴직금 산정 내역 -->
      <div style="font-size:13px;font-weight:700;color:#4c1d95;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #c4b5fd;">
        <i class="fas fa-calculator" style="margin-right:6px;"></i>퇴직금 산정 내역
      </div>
      ${noData ? `<div style="padding:14px;background:#fef9c3;border:1px solid #fde047;border-radius:8px;color:#713f12;font-size:12.5px;margin-bottom:12px;">
        <i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>
        직전 3개월 급여 데이터가 없어 정확한 퇴직금을 계산할 수 없습니다. 급여 데이터 입력 후 다시 확인하세요.
      </div>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12.5px;">
        <thead>
          <tr style="background:#f5f3ff;">
            <th style="padding:8px 12px;border:1px solid #ddd8fe;text-align:left;color:#4c1d95;font-weight:700;">항 목</th>
            <th style="padding:8px 12px;border:1px solid #ddd8fe;text-align:right;color:#4c1d95;font-weight:700;">금 액</th>
            <th style="padding:8px 12px;border:1px solid #ddd8fe;text-align:left;color:#4c1d95;font-weight:700;">산정 기준</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px 12px;border:1px solid #ede9fe;">직전 3개월 통상임금 합계</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:right;font-weight:600;color:#1d4ed8;">${wonW(data.ordinary3)}</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;font-size:11.5px;color:#6b7280;">기본급+주휴수당+직책수당+기술/면허수당+출산보육+연구활동비</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:8px 12px;border:1px solid #ede9fe;">직전 3개월 평균임금 합계</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:right;font-weight:600;">${wonW(data.average3)}</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;font-size:11.5px;color:#6b7280;">3개월간 지급 총액 합계</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #ede9fe;">3개월 역일수</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:right;">${data.days3||'-'}일</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;font-size:11.5px;color:#6b7280;">퇴사일 기준 직전 3개월</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:8px 12px;border:1px solid #ede9fe;">1일 통상임금</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:right;">${wonW(data.dailyOrdinary)}</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;font-size:11.5px;color:#6b7280;">통상임금합계 ÷ 역일수</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #ede9fe;">1일 평균임금</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:right;">${wonW(data.dailyAverage)}</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;font-size:11.5px;color:#6b7280;">평균임금합계 ÷ 역일수</td>
          </tr>
          <tr style="background:#fefce8;">
            <td style="padding:8px 12px;border:1px solid #ede9fe;font-weight:700;color:#92400e;">적용 1일 임금</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:right;font-weight:700;color:#92400e;">${wonW(data.daily1)}</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;font-size:11.5px;color:#6b7280;">통상임금·평균임금 중 유리한 기준 적용</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:8px 12px;border:1px solid #ede9fe;">총 재직일수</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;text-align:right;">${data.tenureDays.toLocaleString('ko-KR')}일</td>
            <td style="padding:8px 12px;border:1px solid #ede9fe;font-size:11.5px;color:#6b7280;">${data.hireDate} ~ ${data.resignDate}</td>
          </tr>
        </tbody>
      </table>

      <!-- 퇴직금 산식 -->
      <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:14px 18px;margin-bottom:16px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">퇴직금 산정 공식</div>
        <div style="font-size:13px;color:#4c1d95;font-weight:600;">
          퇴직금 = 1일 평균임금(${won(data.daily1)}원) × 30일 × (재직일수 ${data.tenureDays.toLocaleString('ko-KR')}일 ÷ 365)
        </div>
        <div style="font-size:13px;color:#4c1d95;margin-top:6px;">
          = ${won(data.daily1)}원 × 30 × ${(data.tenureDays/365).toFixed(4)} = <strong style="font-size:15px;color:#7c3aed;">${won(data.amount)}원</strong>
        </div>
      </div>

      <!-- 최종 지급액 -->
      <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:10px;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;color:#fff;">
        <div>
          <div style="font-size:12px;opacity:.8;margin-bottom:3px;">최종 퇴직금 지급액</div>
          <div style="font-size:11px;opacity:.6;">(1원 미만 절사)</div>
        </div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">${won(data.amount)}<span style="font-size:16px;font-weight:600;margin-left:2px;">원</span></div>
      </div>

      <!-- 서명란 -->
      <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:12px;">
        <tr>
          <td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:center;width:33%;">
            <div style="color:#6b7280;margin-bottom:24px;">회 사 (확인)</div>
            <div style="border-top:1px solid #374151;padding-top:6px;color:#374151;">${_sevCompanyName}</div>
          </td>
          <td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:center;width:33%;">
            <div style="color:#6b7280;margin-bottom:24px;">근 로 자 (수령)</div>
            <div style="border-top:1px solid #374151;padding-top:6px;color:#374151;">${data.empName} (인)</div>
          </td>
          <td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:center;width:33%;">
            <div style="color:#6b7280;margin-bottom:24px;">작 성 일</div>
            <div style="border-top:1px solid #374151;padding-top:6px;color:#374151;">${today}</div>
          </td>
        </tr>
      </table>
    </div><!-- /sev-print-area -->
  `;

  modal.style.display = 'flex';
}

// ── 정산내역표 팝업 닫기 ──
function closeSevDetailModal(){
  const modal = document.getElementById('sev-detail-modal');
  if(modal) modal.style.display = 'none';
  _sevCurrentRecord = null;
}

// ── 계약 조건 조회 모달 ──
function openSevContractModal(contractId, empName, contractIdx){
  const modal = document.getElementById('sev-contract-modal');
  const body  = document.getElementById('sev-contract-modal-body');
  const title = document.getElementById('sev-contract-modal-title');
  if(!modal || !body) return;

  const ct = allContracts.find(c => c.id === contractId);
  if(!ct){ toast('계약 데이터를 찾을 수 없습니다.', 'error'); return; }

  const badgeNum = contractIdx != null ? contractIdx + 1 : '';
  title.innerHTML = `<span style="background:rgba(255,255,255,.25);border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">${badgeNum}</span>&nbsp;${empName} — 계약 조건 상세`;

  const fmtDate  = d => d || '-';
  const fmtWon   = v => v ? Math.round(v).toLocaleString('ko-KR') + '원' : '-';
  const fmtHr    = v => v ? v + 'h' : '-';
  const fmtDay   = v => v != null && v !== '' ? v + '일' : '-';
  const payType  = t => t === 'daily' ? '출근일수 비례' : t === 'fixed' ? '매월 정액' : (t || '-');

  // 계약 상태 뱃지
  const statusBadge = ct.status === '해지'
    ? '<span style="background:#fee2e2;color:#dc2626;padding:2px 9px;border-radius:10px;font-size:11.5px;font-weight:700;">해지</span>'
    : (ct.status === '만료' || ct.status === 'expired')
    ? '<span style="background:#fef3c7;color:#b45309;padding:2px 9px;border-radius:10px;font-size:11.5px;font-weight:700;">만료</span>'
    : (ct.status === 'active' || ct.status === '활성' || ct.status === '유효')
    ? '<span style="background:#dcfce7;color:#15803d;padding:2px 9px;border-radius:10px;font-size:11.5px;font-weight:700;">진행중</span>'
    : ct.status
    ? `<span style="background:#f3f4f6;color:#6b7280;padding:2px 9px;border-radius:10px;font-size:11.5px;">${ct.status}</span>`
    : '-';

  // 4대보험 체크 렌더
  const insBox = (val, label) => {
    const on = val === true || val === 'true' || val === 1;
    return `<span style="display:inline-flex;align-items:center;gap:3px;margin-right:10px;font-size:12px;color:${on?'#15803d':'#9ca3af'};">
      <i class="fas fa-${on?'check-circle':'times-circle'}" style="font-size:13px;"></i>${label}
    </span>`;
  };

  // 수습 정보
  let probationHtml = '-';
  if(ct.probation_months > 0){
    const basis = ct.probation_basis === 'minwage' ? '최저임금 기준'
      : ct.probation_basis === 'direct' ? '직접 입력'
      : '계약 급여 기준';
    probationHtml = `${ct.probation_months}개월`;
    if(ct.probation_pct)  probationHtml += ` / ${ct.probation_pct}%`;
    if(ct.probation_amt)  probationHtml += ` (${fmtWon(ct.probation_amt)})`;
    probationHtml += ` <span style="font-size:11px;color:#9ca3af;">[${basis}]</span>`;
  }

  // 근무 일정
  let scheduleHtml = '';
  try {
    const sch = typeof ct.schedule_json === 'string' ? JSON.parse(ct.schedule_json) : ct.schedule_json;
    if(sch && typeof sch === 'object'){
      const dayNames = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
      const activeDays = Object.entries(sch)
        .filter(([,v]) => v && v.work)
        .map(([k,v]) => {
          const s = v.start || ''; const e = v.end || '';
          return `<span style="display:inline-block;background:#eff6ff;border-radius:5px;padding:2px 7px;margin:2px 2px 2px 0;font-size:11.5px;color:#1d4ed8;">
            <b>${dayNames[k]||k}</b>${s&&e ? ` ${s}~${e}` : ''}
          </span>`;
        });
      scheduleHtml = activeDays.length ? activeDays.join('') : '-';
    }
  } catch(e){ scheduleHtml = '-'; }

  // 급여 항목 행 헬퍼
  const wageRow = (label, val, sub) => val ? `
    <tr>
      <td style="padding:7px 12px;color:#6b7280;font-size:12.5px;width:44%;border-bottom:1px solid #f3f4f6;">${label}</td>
      <td style="padding:7px 12px;font-weight:600;font-size:12.5px;border-bottom:1px solid #f3f4f6;">${fmtWon(val)}${sub ? `<span style="font-size:11px;color:#9ca3af;font-weight:400;margin-left:5px;">${sub}</span>` : ''}</td>
    </tr>` : '';

  // 급여 요약 계산
  const base = ct.base_salary || 0;
  const fixedAllows = [
    ct.weekly_holiday_pay||0, ct.position_allowance||0, ct.skill_allowance||0,
    ct.license_allowance||0, ct.childcare_allowance||0, ct.research_allowance||0,
    ct.transportation_allowance||ct.car_maintenance||0,
    ct.self_driving_allowance||0, ct.remote_area_allowance||0,
    ct.meal_allowance||0, ct.other_allowance||0
  ].reduce((a,b)=>a+b,0);
  const totalMonthly = base + fixedAllows;

  body.innerHTML = `
    <div style="font-size:13px;line-height:1.6;">

      <!-- ① 계약 기간 & 상태 -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="font-size:11px;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">계약기간</span>
            <div style="font-size:15px;font-weight:700;color:#1e40af;margin-top:2px;">
              ${fmtDate(ct.contract_start)} ~ ${ct.contract_end ? fmtDate(ct.contract_end) : '<span style="color:#15803d;">현재 진행 중</span>'}
            </div>
            ${ct.terminate_date ? `<div style="font-size:11.5px;color:#dc2626;margin-top:2px;"><i class="fas fa-ban" style="margin-right:3px;"></i>해지일: ${fmtDate(ct.terminate_date)}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            ${statusBadge}
            ${ct.contract_type ? `<span style="font-size:11.5px;color:#374151;background:#e0f2fe;padding:2px 8px;border-radius:8px;">${ct.contract_type}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- ② 근무 조건 -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
          <i class="fas fa-clock" style="color:#6366f1;"></i> 근무 조건
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div style="background:#f9fafb;border-radius:8px;padding:10px 12px;">
            <div style="font-size:10.5px;color:#9ca3af;margin-bottom:2px;">1일 근무시간</div>
            <div style="font-weight:700;color:#1f2937;">${fmtHr(ct.work_hours_per_day)}</div>
          </div>
          <div style="background:#f9fafb;border-radius:8px;padding:10px 12px;">
            <div style="font-size:10.5px;color:#9ca3af;margin-bottom:2px;">주 근무일수</div>
            <div style="font-weight:700;color:#1f2937;">${ct.work_days_per_week != null ? ct.work_days_per_week + '일' : '-'}</div>
          </div>
          <div style="background:#f9fafb;border-radius:8px;padding:10px 12px;">
            <div style="font-size:10.5px;color:#9ca3af;margin-bottom:2px;">휴게시간</div>
            <div style="font-weight:700;color:#1f2937;">${ct.break_time != null ? ct.break_time + '분' : '-'}</div>
          </div>
        </div>
        ${scheduleHtml && scheduleHtml !== '-' ? `
        <div style="margin-top:8px;background:#f9fafb;border-radius:8px;padding:10px 12px;">
          <div style="font-size:10.5px;color:#9ca3af;margin-bottom:5px;">근무 요일·시간</div>
          <div>${scheduleHtml}</div>
        </div>` : ''}
        ${ct.annual_leave_days ? `
        <div style="margin-top:8px;background:#f9fafb;border-radius:8px;padding:10px 12px;">
          <div style="font-size:10.5px;color:#9ca3af;margin-bottom:2px;">연차 일수</div>
          <div style="font-weight:700;color:#1f2937;">${fmtDay(ct.annual_leave_days)}</div>
        </div>` : ''}
      </div>

      <!-- ③ 급여 구성 -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
          <i class="fas fa-won-sign" style="color:#f59e0b;"></i> 급여 구성
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">
          <tbody>
            ${ct.hourly_wage     ? wageRow('시급', ct.hourly_wage) : ''}
            ${ct.daily_wage      ? wageRow('일급', ct.daily_wage) : ''}
            ${ct.monthly_salary_agreed ? wageRow('약정 월급', ct.monthly_salary_agreed) : ''}
            ${ct.annual_salary   ? wageRow('연봉', ct.annual_salary) : ''}
            ${wageRow('기본급', ct.base_salary)}
            ${wageRow('주휴수당', ct.weekly_holiday_pay)}
            ${wageRow('직책수당', ct.position_allowance)}
            ${wageRow('기술수당', ct.skill_allowance)}
            ${wageRow('면허수당', ct.license_allowance)}
            ${wageRow('출산·보육수당', ct.childcare_allowance)}
            ${wageRow('연구활동비', ct.research_allowance)}
            ${ct.transportation_allowance||ct.car_maintenance
              ? wageRow('교통비', ct.transportation_allowance||ct.car_maintenance, payType(ct.transportation_pay_type))
              : ''}
            ${wageRow('자가운전보조금', ct.self_driving_allowance, payType(ct.self_driving_pay_type))}
            ${wageRow('벽지수당', ct.remote_area_allowance, payType(ct.remote_area_pay_type))}
            ${wageRow('식대', ct.meal_allowance, payType(ct.meal_pay_type))}
            ${ct.other_allowance ? wageRow('기타수당', ct.other_allowance) : ''}
          </tbody>
          ${totalMonthly ? `
          <tfoot>
            <tr style="background:#fef3c7;border-top:2px solid #fcd34d;">
              <td style="padding:9px 12px;font-weight:700;color:#92400e;font-size:13px;">월 합계 (기본급+제수당)</td>
              <td style="padding:9px 12px;font-weight:800;font-size:14px;color:#92400e;">${totalMonthly.toLocaleString('ko-KR')}원</td>
            </tr>
          </tfoot>` : ''}
        </table>
        ${ct.salary_start_date ? `
        <div style="margin-top:6px;font-size:11.5px;color:#9ca3af;padding:0 4px;">
          <i class="fas fa-calendar-check" style="margin-right:3px;"></i>
          연봉적용 시작일: ${fmtDate(ct.salary_start_date)}
        </div>` : ''}
      </div>

      <!-- ④ 수습 조건 -->
      ${ct.probation_months > 0 ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
          <i class="fas fa-user-clock" style="color:#8b5cf6;"></i> 수습 조건
        </div>
        <div style="background:#fdf4ff;border:1px solid #e9d5ff;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#6b21a8;">${probationHtml}</div>
      </div>` : ''}

      <!-- ⑤ 4대보험 -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
          <i class="fas fa-shield-alt" style="color:#10b981;"></i> 4대보험 적용
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:10px 14px;">
          ${insBox(ct.insurance_employment, '고용보험')}
          ${insBox(ct.insurance_industrial, '산재보험')}
          ${insBox(ct.insurance_pension,    '국민연금')}
          ${insBox(ct.insurance_health,     '건강보험')}
        </div>
      </div>

      <!-- ⑥ 비고 -->
      ${ct.note ? `
      <div style="margin-bottom:6px;">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
          <i class="fas fa-sticky-note" style="color:#f59e0b;"></i> 비고
        </div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#78716c;white-space:pre-wrap;">${ct.note}</div>
      </div>` : ''}

    </div>
  `;

  modal.style.display = 'flex';
}

function closeSevContractModal(){
  const modal = document.getElementById('sev-contract-modal');
  if(modal) modal.style.display = 'none';
}

// ── 엑셀 다운로드 ──
function sevDownloadExcel(){
  if(!_sevCurrentRecord){ toast('정산 데이터가 없습니다.','error'); return; }
  const d = _sevCurrentRecord;
  const won = v => Math.round(v)||0;
  const wonW = v => (Math.round(v)||0).toLocaleString('ko-KR')+'원';
  const today = new Date().toISOString().slice(0,10);

  const wsData = [
    [`퇴직금 정산내역서`],
    [`${_sevCompanyName}  |  작성일: ${today}`],
    [],
    ['구 분', '내 용'],
    ['성 명', d.empName],
    ['부서/직책', [d.department,d.position].filter(Boolean).join(' / ')||'-'],
    ['입사일', d.hireDate||'-'],
    ['퇴사일', d.resignDate||'-'],
    ['재직기간', `${d.tenureText} (총 ${d.tenureDays.toLocaleString('ko-KR')}일)`],
    ['퇴사 사유', d.reason],
    [],
    ['항 목', '금 액', '산정 기준'],
    ['직전 3개월 통상임금 합계', won(d.ordinary3), '기본급+주휴수당+직책수당+기술/면허수당+출산보육+연구활동비'],
    ['직전 3개월 평균임금 합계', won(d.average3), '3개월간 지급 총액 합계'],
    ['3개월 역일수', `${d.days3||0}일`, '퇴사일 기준 직전 3개월'],
    ['1일 통상임금', won(d.dailyOrdinary), '통상임금합계 ÷ 역일수'],
    ['1일 평균임금', won(d.dailyAverage), '평균임금합계 ÷ 역일수'],
    ['적용 1일 임금', won(d.daily1), '통상임금·평균임금 중 유리한 기준 적용'],
    ['총 재직일수', `${d.tenureDays}일`, `${d.hireDate} ~ ${d.resignDate}`],
    [],
    ['퇴직금 산정 공식', `1일평균임금(${won(d.daily1)}) × 30일 × (${d.tenureDays}일 ÷ 365) = ${wonW(d.amount)}`],
    [],
    ['최종 퇴직금 지급액', won(d.amount), '원'],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{wch:30},{wch:25},{wch:55}];
  XLSX.utils.book_append_sheet(wb, ws, '퇴직금정산');
  XLSX.writeFile(wb, `퇴직금정산내역서_${d.empName}_${d.resignDate||today}.xlsx`);
  toast('📥 퇴직금 정산내역서 엑셀 저장 완료', 'success');
}

// ── PDF 생성 공통 (html2canvas + jsPDF) ──
async function _sevGeneratePDF(){
  const printArea = document.getElementById('sev-print-area');
  if(!printArea) throw new Error('출력 영역을 찾을 수 없습니다.');

  // html2canvas / jsPDF CDN 동적 로드
  if(typeof html2canvas === 'undefined'){
    await new Promise((res,rej)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  if(typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined'){
    await new Promise((res,rej)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const canvas = await html2canvas(printArea, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const JsPDF = window.jspdf?.jsPDF || jsPDF;
  const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW - 20;
  const imgH = (canvas.height * imgW) / canvas.width;
  let y = 10;
  if(imgH <= pageH - 20){
    pdf.addImage(imgData,'PNG',10,y,imgW,imgH);
  } else {
    // 페이지 분할
    let renderedH = 0;
    const ratio = imgW / canvas.width;
    while(renderedH < canvas.height){
      const sliceH = Math.min((pageH-20) / ratio, canvas.height - renderedH);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceH;
      sliceCanvas.getContext('2d').drawImage(canvas, 0, -renderedH);
      pdf.addImage(sliceCanvas.toDataURL('image/png'),'PNG',10,10,imgW,sliceH*ratio);
      renderedH += sliceH;
      if(renderedH < canvas.height) pdf.addPage();
    }
  }
  return pdf;
}

// ── PDF 저장 ──
async function sevDownloadPDF(){
  if(!_sevCurrentRecord){ toast('정산 데이터가 없습니다.','error'); return; }
  const d = _sevCurrentRecord;
  const today = new Date().toISOString().slice(0,10);
  toast('PDF 생성 중...', 'info');
  try {
    const pdf = await _sevGeneratePDF();
    pdf.save(`퇴직금정산내역서_${d.empName}_${d.resignDate||today}.pdf`);
    toast('📄 PDF 저장 완료', 'success');
  } catch(e){
    console.error(e);
    toast('PDF 생성 중 오류가 발생했습니다.', 'error');
  }
}

// ── 알림톡 발송 (PDF 첨부 안내) ──
async function sevSendAlimtalk(){
  if(!_sevCurrentRecord){ toast('정산 데이터가 없습니다.','error'); return; }
  const d = _sevCurrentRecord;
  const won = v => (Math.round(v)||0).toLocaleString('ko-KR');

  // PDF 먼저 생성 (다운로드 없이 blob URL만 생성)
  toast('PDF 생성 중...', 'info');
  try {
    const pdf = await _sevGeneratePDF();
    const pdfBlob = pdf.output('blob');
    const pdfUrl  = URL.createObjectURL(pdfBlob);

    // 알림톡 발송 확인 팝업
    const msg = `[퇴직금 정산내역서 발송 확인]\n\n수신인: ${d.empName} (${d.phone||'휴대폰 미등록'})\n퇴직금: ${won(d.amount)}원\n\n※ 실제 알림톡 발송은 카카오 비즈메시지 API 연동이 필요합니다.\nPDF가 생성되었습니다. 아래에서 PDF를 미리 확인한 후 수동 발송하세요.`;
    if(confirm(msg)){
      // PDF 미리보기 새 탭 오픈
      window.open(pdfUrl, '_blank');
      toast(`📲 알림톡 발송 준비 완료 — PDF가 새 탭에 열렸습니다.\n실제 발송은 카카오 비즈메시지 API 연동이 필요합니다.`, 'success');

      // ── 고객사 인앱 알림 발송 (퇴직급여 지급) ──
      {
        const _svCo  = allCompanies.find(x => x.id === _sevCompanyId) || {};
        const _coRep = _svCo.representative ? `, ${_svCo.representative} 사장님` : '';
        await _sendCompanyNotice({
          companyId  : _sevCompanyId || '', companyName: _sevCompanyName || '',
          noticeType : 'severance_paid',
          title      : `[퇴직급여 지급] ${d.empName} — 퇴직금 정산이 처리되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 퇴직금 정산내역서가 발송되었습니다.

■ 근로자: ${d.empName}
■ 입사일: ${d.hireDate||'-'}
■ 퇴사일: ${d.resignDate||'-'}
■ 재직기간: ${d.tenureText||'-'}
■ 퇴직금 지급액: ${won(d.amount)}원
■ 발송 방법: 카카오 알림톡
■ 발송 시각: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 퇴직급여 관리 메뉴에서 확인하세요.`,
          employeeId  : d.empId || '', employeeName: d.empName || '',
        });
      }
    }
  } catch(e){
    console.error(e);
    toast('PDF 생성 중 오류가 발생했습니다.', 'error');
  }
}

// ── 이메일 발송 ──
async function sevSendEmail(){
  if(!_sevCurrentRecord){ toast('정산 데이터가 없습니다.','error'); return; }
  const d = _sevCurrentRecord;
  if(!d.email){ toast('직원 이메일 정보가 없습니다.','error'); return; }
  const won = v => (Math.round(v)||0).toLocaleString('ko-KR');

  toast('PDF 생성 중...', 'info');
  try {
    const pdf = await _sevGeneratePDF();
    const pdfBlob = pdf.output('blob');
    const pdfUrl  = URL.createObjectURL(pdfBlob);

    // 이메일 발송 확인 팝업
    const msg = `[이메일 발송 확인]\n\n수신: ${d.empName} <${d.email}>\n퇴직금: ${won(d.amount)}원\n\n※ 실제 이메일 발송은 서버측 SMTP/API 연동이 필요합니다.\nPDF가 생성되었습니다. 아래에서 확인 후 별도 이메일 클라이언트를 통해 발송하세요.`;
    if(confirm(msg)){
      window.open(pdfUrl, '_blank');

      // ── 고객사 인앱 알림 발송 (퇴직급여 이메일 발송) ──
      {
        const _sveCo  = allCompanies.find(x => x.id === _sevCompanyId) || {};
        const _coRep2 = _sveCo.representative ? `, ${_sveCo.representative} 사장님` : '';
        await _sendCompanyNotice({
          companyId  : _sevCompanyId || '', companyName: _sevCompanyName || '',
          noticeType : 'severance_paid',
          title      : `[퇴직급여 지급] ${d.empName} — 퇴직금 정산이 처리되었습니다`,
          body       :
`안녕하세요${_coRep2}.

소속 근로자의 퇴직금 정산내역서가 이메일로 발송되었습니다.

■ 근로자: ${d.empName}
■ 입사일: ${d.hireDate||'-'}
■ 퇴사일: ${d.resignDate||'-'}
■ 재직기간: ${d.tenureText||'-'}
■ 퇴직금 지급액: ${won(d.amount)}원
■ 발송 방법: 이메일 (${d.email})
■ 발송 시각: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 퇴직급여 관리 메뉴에서 확인하세요.`,
          employeeId  : d.empId || '', employeeName: d.empName || '',
        });
      }

      // mailto 링크 (본문만, 첨부는 브라우저 제한으로 불가)
      const subject = encodeURIComponent(`[${_sevCompanyName}] 퇴직금 정산내역서 — ${d.empName}`);
      const body = encodeURIComponent(
        `${d.empName} 귀중\n\n퇴직금 정산내역서를 안내드립니다.\n\n· 퇴직금: ${won(d.amount)}원\n· 재직기간: ${d.tenureText}\n· 퇴사일: ${d.resignDate}\n\n상세 내역은 첨부된 PDF를 확인해 주시기 바랍니다.\n\n감사합니다.\n${_sevCompanyName}`
      );
      setTimeout(()=>{ window.location.href = `mailto:${d.email}?subject=${subject}&body=${body}`; }, 500);
      toast(`📧 이메일 발송 준비 완료 — PDF 새 탭 + 메일 클라이언트가 열립니다.`, 'success');
    }
  } catch(e){
    console.error(e);
    toast('PDF 생성 중 오류가 발생했습니다.', 'error');
  }
}

// ── 모달 바깥 클릭 시 닫기 ──
document.addEventListener('click', function(e){
  const modal = document.getElementById('sev-detail-modal');
  if(modal && modal.style.display==='flex' && e.target===modal) closeSevDetailModal();
});
