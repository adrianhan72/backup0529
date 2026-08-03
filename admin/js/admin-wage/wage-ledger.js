// ─── WAGE LEDGER (임금대장) ───
let _wlCompanyId = null;
let _wlCompanyName = '';

/* ================================================================
   updateMenuBadges()
   대시보드 배너 건수를 읽어 좌측 메뉴 뱃지에 반영
   ━ 배너 div의 display:none 여부 + 건수 텍스트를 파싱해서 표시
   =============================================================== */
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
    !c.is_draft && (c.status===CONTRACT_STATUS.ACTIVE || c.status===CONTRACT_STATUS.PENDING) && !c.signed_file_name
  ).length;
  const missingConsent = (allContracts||[]).filter(c =>
    !c.is_draft && (c.status===CONTRACT_STATUS.ACTIVE || c.status===CONTRACT_STATUS.PENDING) && !c.consent_file_name
  ).length;
  const draftContractCount = (allContracts||[]).filter(c => !!c.is_draft).length;
  _setBadge('badge-contracts', draftContractCount);

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
    badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#e94560;color:#fff;font-size:10px;font-weight:400;border-radius:10px;padding:1px 6px;margin-left:6px;letter-spacing:0;line-height:1.4;vertical-align:middle;';
    menuItem.appendChild(badge);
  }
}

// ── 급여 전체 입력 완료 여부 확인 → 알림 생성 ──
async function _checkWageLedgerComplete(companyId, year, month, changedEmpId = null){
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

  // ── 법정보호휴직자(산재·육아·61~90일차 출산) 제외 ──
  // 당월 모든 근로일이 법정보호휴직인 직원은 회사 지급분이 없으므로
  // 급여명세서 발행 대상에서 제외 → 임금대장 완료 조건에서도 제외
  const PROTECTED_LEAVE_TYPES = new Set(['industrial', 'childcare_leave', 'maternity_paid', 'maternity_unpaid', 'paternity_paid']);
  const _protectedEmpIds = new Set();
  try {
    const _attRes = await api(`../tables/attendance_ledger?company_id=${companyId}&limit=1000`);
    const _attRows = (_attRes.data || _attRes || []);
    if (Array.isArray(_attRows) && _attRows.length > 0) {
      // 월 전체 근로일수 계산
      const _dpw = 5; // 기본 주5일
      const _totalMonthDays = new Date(year, month, 0).getDate();
      let _workDaysInMonth = 0;
      for (let d = 1; d <= _totalMonthDays; d++) {
        const dt = new Date(year, month - 1, d);
        const dow = dt.getDay();
        if (dow !== 0 && dow !== 6) _workDaysInMonth++; // 주말 제외
      }
      // 직원별 법정보호휴직 일수 집계
      const _empProtectedDays = {};
      _attRows.forEach(ledger => {
        const eid = ledger.employee_id;
        try {
          const monthData = typeof ledger.month_data === 'string' ? JSON.parse(ledger.month_data) : (ledger.month_data || []);
          monthData.forEach(entry => {
            if (entry.type !== 'absent') return;
            if (!PROTECTED_LEAVE_TYPES.has(entry.absentType || '')) return;
            // 출산휴가 61~90일차만 회사 지급분 없음 (1~60일차는 회사 차액 보충 있음)
            if (entry.absentType === 'maternity_paid') {
              const dayNum = entry.dayNumber || 0;
              if (dayNum > 0 && dayNum <= 60) return; // 1~60일차는 제외 대상 아님
            }
            const dates = typeof _atlExpandDateRange === 'function'
              ? _atlExpandDateRange(entry.date, entry.dateTo || '') : [entry.date];
            if (!_empProtectedDays[eid]) _empProtectedDays[eid] = 0;
            // 해당 월에 속한 날짜만 카운트
            dates.forEach(dt => {
              if (dt >= mStart && dt <= mEnd) _empProtectedDays[eid]++;
            });
          });
        } catch(e) {}
      });
      // 모든 근로일이 보호휴직인 직원 → 제외
      Object.entries(_empProtectedDays).forEach(([eid, days]) => {
        if (days >= _workDaysInMonth) {
          _protectedEmpIds.add(eid);
        }
      });
    }
  } catch(e) { console.warn('[임금대장] 근태 조회 실패, 보호휴직자 제외 건너뜀:', e.message); }

  // 법정보호휴직자 제외한 유효 직원 목록
  const _checkEmpIds = validEmpIds.filter(id => !_protectedEmpIds.has(id));
  if (_checkEmpIds.length === 0) return; // 모든 직원이 보호휴직 → 임금대장 생성 안 함

  // 해당 년월에 입력된 급여 직원 목록 (임시저장 제외)
  const inputtedEmpIds = new Set(
    allPayrolls
      .filter(p => !p.is_draft && p.company_id === companyId && Number(p.pay_year)===year && Number(p.pay_month)===month)
      .map(p => p.employee_id)
  );
  const allInputted = _checkEmpIds.every(id => inputtedEmpIds.has(id));
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
  let _wlExistingId = null;
  let _wlIsRenewal = false;
  if(alreadyExists){
    // 이미 존재하면 갱신
    _wlExistingId = alreadyExists.id;
    _wlIsRenewal = true;
    // changedEmpId가 있으면 updated_employees에 추가
    let updEmps = [];
    try {
      const existingUpd = alreadyExists.updated_employees;
      updEmps = existingUpd ? (typeof existingUpd === 'string' ? JSON.parse(existingUpd) : existingUpd) : [];
    } catch(e){ updEmps = []; }
    if(changedEmpId){
      const emp = allEmployees.find(e => e.id === changedEmpId);
      if(emp){
        updEmps.push({ empId: changedEmpId, name: emp.name || '', updatedAt: new Date().toISOString() });
        // 최대 20개까지만 유지
        if(updEmps.length > 20) updEmps = updEmps.slice(-20);
      }
    }
    await api(`../tables/wage_ledger_notifications/${alreadyExists.id}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        is_read:false, is_renewed:1, updated_at:Date.now(),
        updated_employees: JSON.stringify(updEmps)
      })
    });
  } else {
    // 신규 알림 생성
    const newId = 'wln'+Date.now();
    await api('../tables/wage_ledger_notifications',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        id:newId,
        company_id:companyId,
        year, month,
        is_read:false,
        is_renewed:0,
        created_at:Date.now()
      })
    });
    _wlExistingId = newId;
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

  // ── 신고용 Excel + HTML(열람용) 자동 생성 및 파일서버 저장 ──
  let _wlFileHtmlPath = '';
  try {
    const genRes = await api('../api/generate-wage-ledger-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, year, month })
    });
    if (genRes.ok) {
      console.log('[임금대장] 파일 생성 완료:', genRes.safeName);
      _wlFileHtmlPath = genRes.html || '';
      // 생성된 파일 경로를 wage_ledger_notifications에 저장
      if (_wlExistingId) {
        await api('../tables/wage_ledger_notifications/' + _wlExistingId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_excel_path: genRes.excel || '',
            file_html_path: genRes.html || ''
          })
        });
      }
    }
  } catch (e) {
    console.warn('[임금대장] 파일 생성 실패 (무시됨):', e.message);
  }

  // ── 직원별 급여명세서 HTML 자동 생성 및 파일서버 저장 ──
  try {
    const psRes = await api('../api/generate-payslip-pdfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, year, month })
    });
    if (psRes.ok) {
      console.log('[급여명세서]', psRes.count + '명 생성 완료');
    }
  } catch (e) {
    console.warn('[급여명세서] 생성 실패 (무시됨):', e.message);
  }

  // ── 고객사 앱 인앱 알림 발송 (임금대장 발행 + PDF 링크) ──
  if (typeof _sendCompanyNotice === 'function') {
    try {
      const _wlCo = allCompanies.find(x => x.id === companyId) || {};
      const _coRep = typeof getCompanyRepGreeting === 'function'
        ? getCompanyRepGreeting(_wlCo) : '';
      const wlHtmlUrl = _wlFileHtmlPath || '';
      const wlFullUrl = wlHtmlUrl
        ? (window.location.origin + wlHtmlUrl)
        : '';

      await _sendCompanyNotice({
        companyId, companyName: _wlCo.company_name || '',
        noticeType: 'wage_ledger_generated',
        title: `[임금대장 발행] ${_wlCo.company_name || ''} — ${year}년 ${month}월 임금대장이 발행되었습니다`,
        body: [
          `안녕하세요${_coRep}.`,
          '',
          `${year}년 ${month}월 임금대장이 발행되었습니다.`,
          '아래 링크에서 신고용 임금대장 PDF를 확인하실 수 있습니다.',
          '',
          `📎 임금대장 보기: ${wlFullUrl || '(링크 생성 중...)'}`,
          '',
          '⚠️ 아직 근로계약이 등록되지 않은 직원의 급여 명세서는 별도로 발행되어 해당 근로자에게 개별 발송되며, 이 임금대장에서는 제외되어 있습니다. 누락된 근로계약과 급여정보가 시스템에 정상 반영되면 임금대장은 업데이트되어 발행됩니다.'
        ].join('\n'),
        extraData: {
          ruleVars: {
            '{급여년도}': String(year),
            '{급여월}': String(month),
            '{임금대장링크}': wlFullUrl
          }
        }
      });
    } catch (e) {
      console.warn('[임금대장] 알림 발송 실패 (무시됨):', e.message);
    }

    // ── 갱신된 경우: wage_ledger_renewed 알림 별도 발송 ──
    if (_wlIsRenewal) {
      try {
        await _sendCompanyNotice({
          companyId, companyName: _wlCo.company_name || '',
          noticeType: 'wage_ledger_renewed',
          title: `[임금대장 갱신] ${_wlCo.company_name || ''} — ${year}년 ${month}월 임금대장이 갱신되었습니다`,
          body: [
            `안녕하세요${_coRep}.`,
            '',
            `${year}년 ${month}월 임금대장이 급여 정정으로 인해 갱신되었습니다.`,
            '갱신된 임금대장 PDF를 아래 링크에서 확인하실 수 있습니다.',
            '',
            `📎 갱신된 임금대장 보기: ${wlFullUrl || '(링크 생성 중...)'}`,
            '',
            '⚠️ 아직 근로계약이 등록되지 않은 직원의 급여 명세서는 별도로 발행되어 해당 근로자에게 개별 발송되며, 이 임금대장에서는 제외되어 있습니다.'
          ].join('\n'),
          extraData: {
            ruleVars: {
              '{급여년도}': String(year),
              '{급여월}': String(month),
              '{임금대장링크}': wlFullUrl
            }
          }
        });
      } catch (e) {
        console.warn('[임금대장] 갱신 알림 발송 실패 (무시됨):', e.message);
      }
    }
  }
}

function renderWLCompanyList(){
  const q = (document.getElementById('wl-company-search')?.value || '').toLowerCase();
  const chips = document.getElementById('wl-company-chips');
  if(!chips) return;
  const list = allCompanies.filter(c =>
    !c.is_draft && isCompanyActive(c) && (!q || (c.company_name||'').toLowerCase().includes(q))
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
  ['#wl-excel-btn','#wl-excel-report-btn','#wl-pdf-btn','#wl-print-btn'].forEach(id=>{
    const btn=document.getElementById(id);
    if(!btn) return;
    btn.disabled=true;
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
  // 월 옵션 (당월 + 익월까지만 표시, 익월 초과는 제외)
  _populateWLMonthOptions(now.getFullYear());
  yrSel.value = now.getFullYear();
  moSel.value = now.getMonth() + 1;
  // 연도 변경 시 월 옵션 재생성
  yrSel.addEventListener('change', function(){
    _populateWLMonthOptions(parseInt(this.value));
    const curNow = new Date();
    const maxMo = parseInt(this.value) === curNow.getFullYear() ? curNow.getMonth() + 2 : 12;
    if(parseInt(moSel.value) > maxMo) moSel.value = Math.min(curNow.getMonth() + 1, maxMo);
  });
}

function _populateWLMonthOptions(year){
  const moSel = document.getElementById('wl-month-filter');
  if(!moSel) return;
  const now = new Date();
  const curYr = now.getFullYear();
  const maxMo = (year === curYr) ? Math.min(now.getMonth() + 2, 12) : 12; // 당월+익월까지만, 최대 12
  const curVal = moSel.value;
  moSel.innerHTML = '';
  for(let m = 1; m <= maxMo; m++){
    const o = document.createElement('option');
    o.value = m; o.textContent = m + '월';
    moSel.appendChild(o);
  }
  if(parseInt(curVal) <= maxMo) moSel.value = curVal;
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

// ── 임금대장 갱신 정보 배너 (관리자 화면) ──
function _wlRenewalBanner(yr, mo){
  if(!_wlCompanyId) return '';
  const notif = allWLNotifications.find(n =>
    n.company_id === _wlCompanyId &&
    (Number(n.pay_year)===yr || Number(n.year)===yr) &&
    (Number(n.pay_month)===mo || Number(n.month)===mo)
  );
  if(!notif || !(Number(notif.is_renewed) === 1)) return '';

  let updEmps = [];
  try {
    const raw = notif.updated_employees;
    updEmps = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  } catch(e){ updEmps = []; }

  const updatedAt = notif.updated_at
    ? new Date(Number(notif.updated_at)).toLocaleString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})
    : '';
  const empNames = updEmps.map(e => e.name).filter(Boolean).join(', ');

  return `<div style="display:flex;align-items:center;gap:8px;padding:6px 16px;background:#fef3c7;border-bottom:1px solid #fcd34d;font-size:11px;color:#92400e;">
    <span style="background:#f59e0b;color:#fff;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;">갱신됨</span>
    <span>${updatedAt}${empNames ? ' · ' + empNames + ' 급여 정정' : ''}</span>
  </div>`;
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
    const excelBtn = document.getElementById('wl-excel-btn');
    const excelReportBtn = document.getElementById('wl-excel-report-btn');
    const pdfBtn   = document.getElementById('wl-pdf-btn');
    const printBtn = document.getElementById('wl-print-btn');
    [excelBtn, excelReportBtn, pdfBtn, printBtn].forEach(btn => {
      if(!btn) return;
      btn.disabled = !enabled;
    });
  };

  // ==========================================================
  //  선행 조건 검증 — 열람 대상 월(yr/mo)에 유효했던 계약 기준
  //  ① 해당 월에 유효했던 계약 중 임시저장 계약 없음
  //  ② 해당 월에 유효했던 계약 중 서류미비 계약 없음
  //  ③ 해당 월에 유효했던 계약 직원 전원의 급여 입력 완료
  //
  //  ★ "해당 월에 유효"의 정의:
  //     contract_start <= 대상월 말일
  //     AND (contract_end 없음 OR contract_end >= 대상월 1일)
  //     AND is_voided_by_amend != true (수정재발행으로 무효화된 계약 제외)
  // ==========================================================

  // 열람 대상 월의 첫날·말일 계산
  const targetMonthStart = new Date(yr, mo - 1, 1);          // 1일 00:00
  const targetMonthEnd   = new Date(yr, mo, 0);              // 말일 23:59
  const tmStartStr = targetMonthStart.toISOString().slice(0,10); // 'YYYY-MM-DD'
  const tmEndStr   = targetMonthEnd.toISOString().slice(0,10);

  // 해당 고객사의 모든 계약 목록
  const coContracts = allContracts.filter(c => c.company_id === _wlCompanyId);

  // 열람 대상 월에 유효했던 계약 필터 함수
  const wasActiveInMonth = c => {
    if(c.is_draft) return false;                     // 임시저장 계약은 제외
    if(c.is_voided_by_amend) return false;
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

  // ② 해당 월에 유효했던 계약 중 서류미비 포함 모든 유효계약 → 급여 미입력 확인
  const validContracts = activeInMonth.filter(c =>
    !c.is_draft && c.status !== CONTRACT_STATUS.VOIDED
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

  // 하나라도 조건 미충족 → 차단 UI 표시 (서류미비는 차단 사유에서 제외)
  const hasBlock = draftContracts.length > 0 || missingPay.length > 0 || draftOnlyPay.length > 0;

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

    // 카드②: 급여 미입력 + 임시저장 중 직원 통합 표시
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
        const btnCls   = isDraft ? 'btn btn-teal btn-sm' : 'btn btn-danger btn-sm';
        const btnLabel = isDraft
          ? `<i class="fas fa-play-circle"></i> 이어 입력`
          : `<i class="fas fa-calculator"></i> 급여 입력`;
        const btnStyle = isDraft
          ? 'padding:5px 12px;font-size:11.5px;'
          : 'padding:5px 12px;font-size:11.5px;';
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
          <button class="${btnCls}" style="${btnStyle}" onclick="_wlGoToPayInput('${eid}')">
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
    'license_allowance','skill_allowance','communication_pay','performance_pay',
    'actual_expense_pay','position_allowance','site_allowance',
    'hazard_allowance','fitness_allowance','self_dev_allowance','book_allowance','overseas_allowance',
    'etc_allowance','other_pay',
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

  // == 6행 헤더 테이블 렌더링 ==
  // 열 구성 (총 13열):
  //  C1: 사원번호  C2: 성명  C3~C8: 지급항목(6열)  C9~C12: 공제항목(4열)  C13: 영수인
  //
  // 데이터가 전혀 없는 항목(전 직원 0)은 th를 공란으로 표시

  // ── 전체 pays 기준으로 각 항목 유무 판별 ──
  const hasData = f => pays.some(p => p[f] && Number(p[f]) !== 0);

  // ── 차량유지비: 항상 self_driving 고정 (레이블 '차량유지비') ──
  const _transportLabel = '차량유지비';
  // 직원별 transport 값 가져오기 헬퍼 (하위호환: 구 transportation_allowance 필드도 합산)
  const _transportVal = p => p.self_driving_allowance || p.transportation_allowance || 0;

  // ── 커스텀 수당 합산 헬퍼 ──
  const _sumCustomOrd = p => { try { const v=typeof p.custom_ordinary_values==='string'?JSON.parse(p.custom_ordinary_values):(p.custom_ordinary_values||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(x.amount||0),0); } catch(e){return 0;} };
  const _sumCustomFixed = p => { try { const v=typeof p.custom_fixed_values==='string'?JSON.parse(p.custom_fixed_values):(p.custom_fixed_values||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(x.amount||0),0); } catch(e){return 0;} };
  const _sumEtcItems = p => { try { const v=typeof p.etc_allowance_items==='string'?JSON.parse(p.etc_allowance_items):(p.etc_allowance_items||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(x.amount||0),0); } catch(e){return 0;} };

  // ── 고객사 allowance_config에서 실제 사용 항목 확인 ──
  const _wlCfg = (() => {
    const co = allCompanies.find(c => c.id === currentPayCompanyId || c.id === (pays[0]?.company_id));
    if (!co?.allowance_config) return {};
    const cfg = co.allowance_config;
    return typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
  })();
  const _hasCfg = key => !!(_wlCfg && _wlCfg[key]);
  const _hasCustomOrd = _wlCfg && Array.isArray(_wlCfg._custom_ordinary) && _wlCfg._custom_ordinary.length > 0;
  const _hasCustomFixed = _wlCfg && Array.isArray(_wlCfg._custom_fixed) && _wlCfg._custom_fixed.length > 0;
  const _hasEtcItems = pays.some(p => _sumEtcItems(p) > 0);

  // 지급항목 th 레이블 정의 (데이터 없으면 공란) — 6열 × 5행
  // 행2: C3=기본급, C4=정기상여금, C5=식대, C6=차량유지비(기본)/교통비/벽지수당(선택), C7~C8=공란
  // 요청 스펙대로 행·열 매핑
  // [행][열-3] (0-indexed, 지급 cols 0~5)
  const PAY_TH = [
    // 행2 (index 0): 기본급~현장수당
    [ '기본급',
      '정기상여금',
      '식대',
      _transportLabel,
      hasData('position_allowance') ? '직책수당' : '',
      hasData('site_allowance') ? '현장수당' : '' ],
    // 행3 (index 1): 연구~주휴
    [ hasData('research_allowance') ? '연구활동비' : '',
      hasData('childcare_allowance') ? '보육수당' : '',
      '연장근로수당',
      '야간근로수당',
      '휴일근로수당',
      '주휴수당' ],
    // 행4 (index 2): 연차~실비
    [ '연차수당',
      hasData('license_allowance') ? '면허수당' : '',
      hasData('skill_allowance') ? '기술수당' : '',
      hasData('communication_pay') ? '통신비' : '',
      hasData('performance_pay') ? '성과급' : '',
      hasData('actual_expense_pay') ? '실비변상적급여' : '' ],
    // 행5 (index 3): 위험~해외
    [ hasData('hazard_allowance') ? '위험수당' : '',
      hasData('remote_area_allowance') ? '벽지수당' : '',
      hasData('fitness_allowance') ? '체력증진비' : '',
      hasData('self_dev_allowance') ? '자기계발비' : '',
      hasData('book_allowance') ? '도서지원비' : '',
      hasData('overseas_allowance') ? '해외근무수당' : '' ],
    // 행6 (index 4): 커스텀 + 기타 + 지급합계
    [ _hasCustomOrd ? '커스텀통상임금' : '',
      _hasCustomFixed ? '커스텀고정수당' : '',
      _hasEtcItems ? '기타수당(커스텀)' : '',
      '',
      hasData('etc_allowance')||hasData('other_pay') ? '기타' : '',
      '지급합계' ],
  ];

  // 공제항목 th 레이블 정의 (C9~C12, index 0~3) — 데이터 유무 무관 항상 표기
  const DED_TH = [
    // 행2: C9=국민연금, C10=건강보험, C11=고용보험, C12=장기요양보험료
        [ '국민연금', '건강보험', '고용보험', '장기요양보험료' ],
    // 행3: C9=국민연금소급분, C10=건강보험료정산, C11=고용보험정산, C12=장기요양보험정산
    [ '', '건강보험연말정산', '', '장기요양보험연말정산' ],
    // 행4: C9~C12 모두 공란
    [ '', '', '', '' ],
    // 행5: C9=소득세, C10=지방소득세, C11=소득세연말정산, C12=공란
    [ '소득세', '지방소득세', '소득세연말정산', '' ],
    // 행6: C9 공란, C10=기타공제, C11=공제합계(bold), C12=차인지급액(bold)
    [ '', '기타공제', '공제합계', '차인지급액' ],
  ];

  // ── 행 최적화: 어떤 직원도 데이터가 없는 행(PAY+DED 모두 0)은 숨김 ──
  // 각 행 인덱스(0~4)별 pay/ded 컬럼이 전 직원 0인지 검사
  const _payRowFields = [
    ['base_salary','bonus_pay','meal_allowance','transport','position_allowance','site_allowance'],
    ['research_allowance','childcare_allowance','overtime_pay','night_pay','holiday_pay','weekly_holiday_pay'],
    ['annual_leave_pay','license_allowance','skill_allowance','communication_pay','performance_pay','actual_expense_pay'],
    ['hazard_allowance','remote_area_allowance','fitness_allowance','self_dev_allowance','book_allowance','overseas_allowance'],
    ['_customOrd','_customFixed','_etcItems','_empty','_etcOther','gross_pay']  // row4 항상 표시 (gross 존재)
  ];
  const _dedRowFields = [
    ['national_pension','health_insurance','employment_insurance','long_term_care'],
    ['_empty','health_insurance_adjust','_empty','_empty2'],
    ['_empty','_empty','_empty','_empty'],
    ['income_tax','local_income_tax','year_end_tax_adjust','_empty'],
    ['_empty','advance_deduction','total_deduction','net_pay']
  ];
  const _rowHasData = rowIdx => {
    // row4는 항상 지급합계/공제합계가 있어서 표시
    if(rowIdx === 4) return true;
    // pay 컬럼 중 하나라도 데이터 있는 직원이 있으면 표시
    const payFields = _payRowFields[rowIdx];
    const hasPay = payFields.some(f => {
      if(f==='transport') return pays.some(p => (p.self_driving_allowance||p.transportation_allowance||0) !== 0);
      if(f==='_customOrd') return pays.some(p => _sumCustomOrd(p) > 0);
      if(f==='_customFixed') return pays.some(p => _sumCustomFixed(p) > 0);
      if(f==='_etcItems') return pays.some(p => _sumEtcItems(p) > 0);
      if(f==='_etcOther') return pays.some(p => (p.etc_allowance||0)+(p.other_pay||0) !== 0);
      if(f==='_empty'||f==='_empty2') return false;
      return pays.some(p => p[f] && Number(p[f]) !== 0);
    });
    if(hasPay) return true;
    // ded 컬럼 중 하나라도 데이터 있는 직원이 있으면 표시
    const dedFields = _dedRowFields[rowIdx];
    return dedFields.some(f => {
      if(f==='_empty'||f==='_empty2') return false;
      return pays.some(p => p[f] && Number(p[f]) !== 0);
    });
  };
  const _rowVisible = [0,1,2,3,4].map(i => _rowHasData(i));
  // visibleRows: 표시할 행 인덱스 배열 (0-based, 항상 row4 포함)
  const _visRows = _rowVisible.map((v,i)=>v?i:-1).filter(i=>i>=0);
  // 원본 인덱스 → 표시 인덱스 매핑
  const _rowMap = [0,1,2,3,4].map(i => _visRows.indexOf(i)); // -1 = 숨김
  const fmtB = v => {  // bold
    const n = Number(v);
    return (!v || n === 0) ? '' : `<strong>${n.toLocaleString('ko-KR')}</strong>`;
  };

  // ── 직원별 데이터 행 (데이터 rows) 값 배열 반환 ──
  // 지급 C3~C8 (6개), 공제 C9~C12 (4개) 각 행별
  const getPayVals = (p, rowIdx) => {
    switch(rowIdx){
      case 0: return [ fmtV(p.base_salary), fmtV(p.bonus_pay),
                       fmtV(p.meal_allowance), fmtV(_transportVal(p)),
                       fmtV(p.position_allowance), fmtV(p.site_allowance) ];
      case 1: return [ fmtV(p.research_allowance), fmtV(p.childcare_allowance),
                       fmtV(p.overtime_pay), fmtV(p.night_pay),
                       fmtV(p.holiday_pay), fmtV(p.weekly_holiday_pay) ];
      case 2: return [ fmtV(p.annual_leave_pay), fmtV(p.license_allowance),
                       fmtV(p.skill_allowance), fmtV(p.communication_pay),
                       fmtV(p.performance_pay), fmtV(p.actual_expense_pay) ];
      case 3: return [ fmtV(p.hazard_allowance), fmtV(p.remote_area_allowance),
                       fmtV(p.fitness_allowance), fmtV(p.self_dev_allowance),
                       fmtV(p.book_allowance), fmtV(p.overseas_allowance) ];
      case 4: return [ fmtV(_sumCustomOrd(p)), fmtV(_sumCustomFixed(p)),
                       fmtV(_sumEtcItems(p)), '',
                       fmtV((p.etc_allowance||0)+(p.other_pay||0)), fmtB(p.gross_pay) ];
      default: return ['','','','','',''];
    }
  };
  const getDedVals = (p, rowIdx) => {
    switch(rowIdx){
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

  // ── 합계용 값 배열 ──
  const getSumPayVals = rowIdx => {
    switch(rowIdx){
      case 0: return [ fmtV(sums.base_salary), fmtV(sums.bonus_pay),
                       fmtV(sums.meal_allowance),
                       fmtV((sums.self_driving_allowance||0)+(sums.transportation_allowance||0)+(sums.remote_area_allowance||0)),
                       fmtV(sums.position_allowance), fmtV(sums.site_allowance) ];
      case 1: return [ fmtV(sums.research_allowance), fmtV(sums.childcare_allowance),
                       fmtV(sums.overtime_pay), fmtV(sums.night_pay),
                       fmtV(sums.holiday_pay), fmtV(sums.weekly_holiday_pay) ];
      case 2: return [ fmtV(sums.annual_leave_pay), fmtV(sums.license_allowance),
                       fmtV(sums.skill_allowance), fmtV(sums.communication_pay),
                       fmtV(sums.performance_pay), fmtV(sums.actual_expense_pay) ];
      case 3: return [ fmtV(sums.hazard_allowance), fmtV(sums.remote_area_allowance),
                       fmtV(sums.fitness_allowance), fmtV(sums.self_dev_allowance),
                       fmtV(sums.book_allowance), fmtV(sums.overseas_allowance) ];
      case 4: return [ fmtV(sums.custom_ord_total||0), fmtV(sums.custom_fixed_total||0),
                       fmtV(sums.etc_items_total||0), '',
                       fmtV(sums.etc_allowance + sums.other_pay), fmtB(sums.gross_pay) ];
      default: return ['','','','','',''];
    }
  };
  const getSumDedVals = rowIdx => {
    switch(rowIdx){
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

  // ── 6행 thead 생성 (행 최적화: 데이터 없는 행은 숨김) ──
  // visibleCount = 표시할 데이터 행 수 (영수인 rowspan = visibleCount + 1(그룹헤더))
  const _visCount = _visRows.length;
  const buildThead = () => {
    // 행1 그룹 헤더 (항상 표시)
    const signRowspan = _visCount + 1; // 그룹헤더 1 + 데이터 행 n
    const r1 = `<tr class="wl-th-group">
      <th colspan="2" class="wl-th-personal">인적사항</th>
      <th colspan="6" class="wl-th-pay">기본급여 및 제수당</th>
      <th colspan="4" class="wl-th-ded">공제 및 차인지급액</th>
      <th rowspan="${signRowspan}" class="wl-th-sign">영수인</th>
    </tr>`;

    // 행2: 사원번호, 성명, 지급row0, 공제row0 (rowIdx=0)
    let rows = '';
    if(_rowVisible[0]){
      const pv = PAY_TH[0]; const dv = DED_TH[0];
      rows += `<tr class="wl-th-row wl-th-row-ind">
        <th class="wl-th-cell">사원번호</th>
        <th class="wl-th-cell">성명</th>
        ${pv.map(t => `<th class="wl-th-cell">${t}</th>`).join('')}
        ${dv.map(t => `<th class="wl-th-cell">${t}</th>`).join('')}
      </tr>`;
    }

    // 행3~6: 부서/직급/입사일/퇴사일 (rowIdx 1~4)
    const mergedLabels = ['부서','직급','입사일','퇴사일'];
    for(let ri=1; ri<=4; ri++){
      if(!_rowVisible[ri]) continue;
      const pv = PAY_TH[ri]; const dv = DED_TH[ri];
      rows += `<tr class="wl-th-row wl-th-row-mrg">
        <th colspan="2" class="wl-th-cell wl-th-merged">${mergedLabels[ri-1]}</th>
        ${pv.map((t,i) => `<th class="wl-th-cell${t==='지급합계'?' wl-th-gross':i===5?' wl-th-pay-last':''}">${t}</th>`).join('')}
        ${dv.map((t,i) => `<th class="wl-th-cell${t==='공제합계'?' wl-th-ded-sum':t==='차인지급액'?' wl-th-net':(ri===2&&(i===0||i===2))?' wl-th-na':''}">${t}</th>`).join('')}
      </tr>`;
    }

    return `<thead>${r1}${rows}</thead>`;
  };

  // ── 직원 데이터 tbody 행 생성 (행 최적화: 데이터 없는 행 숨김) ──
  // rowIdx 0: 사원번호+성명, rowIdx 1: 부서, rowIdx 2: 직급, rowIdx 3: 입사일, rowIdx 4: 퇴사일
  const _empInfoLabels = ['사원번호/성명','부서','직급','입사일','퇴사일'];
  const buildTbody = (p, emp, idx, isSum) => {
    const resign = (allContracts.filter(c => c.employee_id === (p?.employee_id||'') && !c.is_draft)
      .sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))[0]?.contract_end) || '';

    const cls = `wl-data-row${isSum?' wl-sum-row':''}`;
    const empNo   = isSum ? '' : (emp.employee_number||'-');
    const empName = isSum ? `합계 (${pays.length}명)` : (emp.name||'-');
    const dept = isSum ? '' : (emp.department||'');
    const pos  = isSum ? '' : (emp.position||'');
    const hire = isSum ? '' : (emp.hire_date||'');
    const res  = isSum ? '' : resign;

    // rowIdx → 왼쪽 셀(인적사항) + pay/ded 값 생성기
    const _buildDataRow = (rowIdx, isFirst) => {
      const pv = isSum ? getSumPayVals(rowIdx) : getPayVals(p, rowIdx);
      const dv = isSum ? getSumDedVals(rowIdx) : getDedVals(p, rowIdx);

      // 왼쪽 인적사항 셀
      let leftCell = '';
      if(rowIdx === 0){
        leftCell = `<td class="wl-td-center wl-td-empno">${empNo}</td><td class="wl-td-center wl-td-name">${empName}</td>`;
      } else {
        const infoMap = {1:dept, 2:pos, 3:hire, 4:res};
        leftCell = `<td colspan="2" class="wl-td-center wl-td-dept">${infoMap[rowIdx]||''}</td>`;
      }

      // 지급 셀 (row4는 지급합계/공제합계/차인지급액 특별 스타일)
      let payCells = '';
      if(rowIdx === 4){
        payCells = pv.map((v, i) =>
          i === 5 ? `<td class="wl-td-gross">${v}</td>` : `<td class="wl-td-num">${v}</td>`
        ).join('');
      } else {
        payCells = pv.map((v,i)=>i===5?`<td class="wl-td-num wl-td-pay-last">${v}</td>`:`<td class="wl-td-num">${v}</td>`).join('');
      }

      // 공제 셀
      let dedCells = '';
      if(rowIdx === 4){
        dedCells = dv.map((v, i) =>
          i === 2 ? `<td class="wl-td-ded-sum">${v}</td>` :
          i === 3 ? `<td class="wl-td-net">${v}</td>` :
          `<td class="wl-td-num">${v}</td>`
        ).join('');
      } else if(rowIdx === 2){
        dedCells = dv.map((v,i)=>i===0||i===2?`<td class="wl-td-num wl-td-na">${v}</td>`:`<td class="wl-td-num">${v}</td>`).join('');
      } else {
        dedCells = dv.map(v=>`<td class="wl-td-num">${v}</td>`).join('');
      }

      // 영수인 셀 (첫 번째 표시 행에만 rowspan 적용)
      const signCell = isFirst ? `<td rowspan="${_visCount}" class="wl-td-sign"></td>` : '';

      return `<tr class="${cls}">${leftCell}${payCells}${dedCells}${signCell}</tr>`;
    };

    // visibleRows만 렌더링
    let rows = '';
    _visRows.forEach((origIdx, visIdx) => {
      rows += _buildDataRow(origIdx, visIdx === 0);
    });
    return rows;
  };

  // ── 직원 정렬 (가나다) ──
  pays.sort((a, b) => {
    const na = (empMap[a.employee_id]?.name || '');
    const nb = (empMap[b.employee_id]?.name || '');
    return na.localeCompare(nb, 'ko');
  });

  // ── 합계 누산 + tbody HTML 생성 ──
  let tbodyRows = '';
  sums.custom_ord_total = 0;
  sums.custom_fixed_total = 0;
  sums.etc_items_total = 0;
  pays.forEach((p, idx) => {
    sumFields.forEach(f => sums[f] += wonNum(p[f]));
    sums.custom_ord_total += _sumCustomOrd(p);
    sums.custom_fixed_total += _sumCustomFixed(p);
    sums.etc_items_total += _sumEtcItems(p);
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
    ${_wlRenewalBanner(yr, mo)}
    <div class="wl-ledger-wrap">
      <table class="wl-ledger-tbl">${CG}
        ${thead}
        <tbody>${tbodyRows}</tbody>
      </table>
    </div>`;

  // ── 직원 구분선: 5행마다 첫번째 행에 border-top 강조 ──
  requestAnimationFrame(() => {
    const rows = area.querySelectorAll('.wl-ledger-tbl tbody tr');
    rows.forEach((tr, i) => {
      if(i % 5 === 0){
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
// isPdf=true → 신고용(report) 모드: 영수인 컬럼 숨김, 빈 셀 공란 (fmtV가 이미 처리)
// afterprint 이벤트에서 클래스·title 복원 및 편집용 모드로 복구
function _wlDoPrint(isPdf){
  const yr    = Number(document.getElementById('wl-year-filter').value);
  const mo    = Number(document.getElementById('wl-month-filter').value);
  const moStr = String(mo).padStart(2,'0');

  const origTitle = document.title;
  const suffix = isPdf ? '_신고용' : '';
  document.title  = `[${_wlCompanyName}]_임금대장_${yr}년${moStr}월${suffix}`;

  // PDF(신고용): 영수인 컬럼 숨김 클래스 추가
  if(isPdf){
    document.body.classList.add('wl-report-pdf');
  }

  // body에 wl-print-mode 클래스 추가 → 임금대장 print CSS 활성화
  document.body.classList.add('wl-print-mode');

  const cleanup = () => {
    document.body.classList.remove('wl-print-mode');
    document.body.classList.remove('wl-report-pdf');
    document.title = origTitle;
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  window.print();
}

// ─── 임금대장 PDF 다운로드 (신고용) ───
function downloadWageLedgerPdf(){
  if(!_wlCompanyId){ toast('고객사를 먼저 선택해 주세요.','warning'); return; }
  _wlDoPrint(true);
}

// ─── 임금대장 인쇄 (편집용) ───
function printWageLedger(){
  if(!_wlCompanyId){ toast('고객사를 먼저 선택해 주세요.','warning'); return; }
  _wlDoPrint(false);
}

// ─── 임금대장 엑셀 다운로드 (xlsx-js-style@1.2.0) ───
// ★ XLSX.writeFile(wb, fn, {cellStyles:true}) 옵션 필수
// ★ fill: {patternType:'solid', fgColor:{rgb:...}} — patternType 없으면 색상 미적용
// ★ A4 가로: pageSetup + sheetView 동시 설정
function downloadWageLedgerExcel(mode = 'edit', optCompanyId = null, optYear = null, optMonth = null){
  // 호출자가 companyId/yr/mo를 지정하면 그걸 사용, 아니면 wage-ledger 필터에서 읽음
  const _coId = optCompanyId || _wlCompanyId;
  if(!_coId){ toast('고객사를 먼저 선택하세요.','error'); return; }

  const yr = optYear || parseInt(document.getElementById('wl-year-filter')?.value);
  const mo = optMonth || parseInt(document.getElementById('wl-month-filter')?.value);
  const moStr = String(mo).padStart(2,'0');

  let pays = allPayrolls.filter(p =>
    p.company_id === _coId &&
    Number(p.pay_year) === yr &&
    Number(p.pay_month) === mo
  );
  if(!pays.length){ toast(`${yr}년 ${mo}월 급여 데이터가 없습니다.`,'error'); return; }

  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  pays.sort((a,b) => (empMap[a.employee_id]?.name||'').localeCompare(empMap[b.employee_id]?.name||'','ko'));

  const nv = v => (v===null||v===undefined||v==='') ? 0 : Number(v);
  const numFmt = '#,##0';

  // ========================================================
  //  편집용: 고정 열 테이블 형식 (업로드·검증 최적화)
  //  신고용: 카드 레이아웃 (값 없는 항목 공란)
  // ========================================================
  if (mode === 'edit') {
    _downloadEditExcel(pays, empMap, yr, mo, moStr).catch(e => {
      console.error('편집용 엑셀 생성 오류:', e);
      toast('엑셀 생성 중 오류가 발생했습니다.', 'error');
    });
  } else {
    _downloadReportExcel(pays, empMap, yr, mo, moStr);
  }
}

// ─── 편집용 엑셀 다운로드 (고정 열 테이블 + 근태·연차 시트) ───
async function _downloadEditExcel(pays, empMap, yr, mo, moStr) {
  const nv = v => (v===null||v===undefined||v==='') ? 0 : Number(v);
  const numFmt = '#,##0';

  // ── 고객사 allowance_config에서 커스텀 항목 정보 ──
  const co = allCompanies.find(c => c.id === (pays[0]?.company_id));
  const cfg = co?.allowance_config ? (typeof co.allowance_config === 'string' ? JSON.parse(co.allowance_config) : co.allowance_config) : {};
  const customOrd = Array.isArray(cfg._custom_ordinary) ? cfg._custom_ordinary.filter(x => x.checked) : [];
  const customFixed = Array.isArray(cfg._custom_fixed) ? cfg._custom_fixed.filter(x => x.checked) : [];

  // ── 열 정의: [헤더레이블, 값추출함수(p), 너비(wch)] ──
  const COLDEF = [
    ['No',              (_p,i) => i+1, 5],
    ['사원번호',        p => (empMap[p.employee_id]||{}).employee_number||'', 10],
    ['성명',            p => (empMap[p.employee_id]||{}).name||'', 10],
    ['부서',            p => (empMap[p.employee_id]||{}).department||'', 8],
    ['직책',            p => (empMap[p.employee_id]||{}).position||'', 8],
    ['고용형태',        p => (empMap[p.employee_id]||{}).employment_category||'', 10],
    ['근로일수',        p => nv(p.work_days), 7],
    ['총근로시간',      p => nv(p.total_work_hours), 8],
    ['연장시간',        p => nv(p.overtime_hours), 7],
    ['야간시간',        p => nv(p.night_hours), 7],
    ['휴일시간',        p => nv(p.holiday_hours), 7],
    ['기본급',          p => nv(p.base_salary), 12],
    ['주휴수당',        p => nv(p.weekly_holiday_pay), 10],
    ['직책수당',        p => nv(p.position_allowance), 10],
    ['차량유지비',      p => nv(p.self_driving_allowance||p.transportation_allowance), 10],
    ['식대',            p => nv(p.meal_allowance), 10],
    ['연장수당',        p => nv(p.overtime_pay), 10],
    ['야간수당',        p => nv(p.night_pay), 10],
    ['휴일수당',        p => nv(p.holiday_pay), 10],
    ['연차수당',        p => nv(p.annual_leave_pay), 10],
    ['정기상여금',      p => nv(p.bonus_pay), 10],
    ['성과급',          p => nv(p.performance_pay), 10],
    ['실비변상적급여',  p => nv(p.actual_expense_pay), 10],
    ['연구활동비',      p => nv(p.research_allowance), 10],
    ['보육수당',        p => nv(p.childcare_allowance), 10],
    ['통신비',          p => nv(p.communication_pay), 10],
    ['기술수당',        p => nv(p.skill_allowance), 10],
    ['면허수당',        p => nv(p.license_allowance), 10],
    ['현장수당',        p => nv(p.site_allowance), 10],
    ['위험수당',        p => nv(p.hazard_allowance), 10],
    ['벽지수당',        p => nv(p.remote_area_allowance), 10],
    ['체력증진비',      p => nv(p.fitness_allowance), 10],
    ['자기계발비',      p => nv(p.self_dev_allowance), 10],
    ['도서지원비',      p => nv(p.book_allowance), 10],
    ['해외근무수당',    p => nv(p.overseas_allowance), 10],
  ];
  // 커스텀 통상임금 항목
  customOrd.forEach(item => {
    const name = item.name || '커스텀';
    COLDEF.push([name, p => {
      try { const v = typeof p.custom_ordinary_values==='string' ? JSON.parse(p.custom_ordinary_values) : (p.custom_ordinary_values||[]); const found = (Array.isArray(v)?v:[]).find(x => x.name===item.name); return found?.amount||0; } catch(e){ return 0; }
    }, 12]);
  });
  // 커스텀 고정수당 항목
  customFixed.forEach(item => {
    const name = item.name || '커스텀고정';
    COLDEF.push([name, p => {
      try { const v = typeof p.custom_fixed_values==='string' ? JSON.parse(p.custom_fixed_values) : (p.custom_fixed_values||[]); const found = (Array.isArray(v)?v:[]).find(x => x.name===item.name); return found?.amount||0; } catch(e){ return 0; }
    }, 12]);
  });
  // 나머지 고정 열
  const restCols = [
    ['기타수당',        p => nv(p.etc_allowance)+nv(p.other_pay), 10],
    ['지급합계',        p => nv(p.gross_pay), 12],
    ['보수월액',        p => nv(p.standard_monthly_pay), 10],
    ['소득세',          p => nv(p.income_tax), 10],
    ['지방소득세',      p => nv(p.local_income_tax), 10],
    ['건강보험',        p => nv(p.health_insurance), 10],
    ['장기요양',        p => nv(p.long_term_care), 10],
    ['국민연금',        p => nv(p.national_pension), 10],
    ['고용보험',        p => nv(p.employment_insurance), 10],
    ['연말정산',        p => nv(p.year_end_tax_adjust), 10],
    ['건보정산',        p => nv(p.health_insurance_adjust), 10],
    ['기타공제',        p => nv(p.advance_deduction), 10],
    ['공제합계',        p => nv(p.total_deduction), 12],
    ['영수액',          p => nv(p.net_pay), 12],
    ['지급일',          p => (p.pay_date||'').slice(0,10), 10],
    ['비고',            p => p.note||'', 15],
  ];
  restCols.forEach(c => COLDEF.push(c));

  const COLS = COLDEF.length;

  // ── 스타일 상수 ──
  const bd = (clr, style='thin') => ({style, color:{rgb:clr}});
  const border = (clr) => ({top:bd(clr), bottom:bd(clr), left:bd(clr), right:bd(clr)});
  const fill = rgb => ({patternType:'solid', fgColor:{rgb}});
  const font = (sz, bold, rgb, name='맑은 고딕') => ({name, sz, bold, color:{rgb}});
  const al = (h='center', v='center') => ({horizontal:h, vertical:v});

  const S_HDR = { fill: fill('1E293B'), font: font(9, true, 'FFFFFF'), alignment: al('center'), border: border('334155') };
  const S_VAL = { fill: fill('F8FBFF'), font: font(9, false, '1E293B'), alignment: al('right'), border: border('E5E7EB') };
  const S_VAL_ALT = { fill: fill('FFFFFF'), font: font(9, false, '1E293B'), alignment: al('right'), border: border('E5E7EB') };
  const S_GROSS = { fill: fill('DBEAFE'), font: font(9, true, '1D4ED8'), alignment: al('right'), border: border('BFDBFE') };
  const S_DED = { fill: fill('FEE2E2'), font: font(9, true, 'B91C1C'), alignment: al('right'), border: border('FECACA') };
  const S_NET = { fill: fill('DCFCE7'), font: font(9, true, '059669'), alignment: al('right'), border: border('BBF7D0') };
  const S_TITLE = { fill: fill('1A1A2E'), font: font(13, true, 'FFFFFF'), alignment: al('center'), border: border('1A1A2E') };
  const S_TEXT = { fill: fill('FFFFFF'), font: font(9, false, '1E293B'), alignment: al('left'), border: border('E5E7EB') };
  const S_TEXT_ALT = { fill: fill('F8FAFC'), font: font(9, false, '1E293B'), alignment: al('left'), border: border('E5E7EB') };

  const wsCells = {};
  const merges = [];
  let curRow = 0;

  function setCell(r, c, v, s) {
    const ref = XLSX.utils.encode_cell({r, c});
    wsCells[ref] = { t: typeof v === 'number' ? 'n' : 's', v, s };
  }

  // ── 타이틀 행 ──
  for (let c = 0; c < COLS; c++) setCell(curRow, c, c === 0 ? `[${_wlCompanyName}] 임금대장 (편집용) — ${yr}년 ${moStr}월` : '', S_TITLE);
  merges.push({ s: {r: curRow, c: 0}, e: {r: curRow, c: COLS-1} });
  curRow++;

  // ── 헤더 행 ──
  COLDEF.forEach((def, ci) => {
    setCell(curRow, ci, def[0], S_HDR);
  });
  curRow++;

  // ── 직원 데이터 행 ──
  const grossIdx = COLDEF.findIndex(d => d[0] === '지급합계');
  const dedIdx = COLDEF.findIndex(d => d[0] === '공제합계');
  const netIdx = COLDEF.findIndex(d => d[0] === '영수액');

  pays.forEach((p, idx) => {
    const rowStyle = idx % 2 === 0 ? S_VAL : S_VAL_ALT;
    COLDEF.forEach((def, ci) => {
      let val = def[1](p, idx);
      let sty = rowStyle;
      if (ci === grossIdx) sty = S_GROSS;
      else if (ci === dedIdx) sty = S_DED;
      else if (ci === netIdx) sty = S_NET;
      else if (ci < 5) sty = idx % 2 === 0 ? S_TEXT : S_TEXT_ALT;
      if (typeof val === 'number' && val === 0) val = 0; // 빈칸 대신 0 표시
      setCell(curRow, ci, val, sty);
    });
    curRow++;
  });

  // ── 열 너비 ──
  const colWidths = COLDEF.map(d => ({ wch: d[2] || 10 }));

  // ── 워크시트 조립 ──
  const ws = { '!ref': XLSX.utils.encode_range({ s: {r:0,c:0}, e: {r:curRow-1,c:COLS-1} }) };
  Object.assign(ws, wsCells);
  ws['!merges'] = merges;
  ws['!cols'] = colWidths;
  ws['!pageSetup'] = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '임금대장');

  // ── 근태 관리대장 시트 (Sheet2) ──
  const _coId = pays[0]?.company_id;
  if (_coId) {
    try {
      const _attRes = await fetch(`../tables/attendance_ledger?company_id=${_coId}&limit=1000`);
      const _attData = _attRes.ok ? (await _attRes.json()) : [];
      const _attRows = (_attData.data || _attData || []);
      if (_attRows.length > 0) {
        // 직원별 근태 데이터 수집
        const _attByEmp = {};
        _attRows.forEach(ledger => {
          const eid = ledger.employee_id;
          if (!_attByEmp[eid]) _attByEmp[eid] = [];
          try {
            const monthData = typeof ledger.month_data === 'string' ? JSON.parse(ledger.month_data) : (ledger.month_data || []);
            monthData.forEach(entry => {
              _attByEmp[eid].push({
                date: entry.date || '',
                dateTo: entry.dateTo || '',
                type: entry.type || 'absent',
                absentType: entry.absentType || '',
                rate: entry.rate || 0,
                time: entry.time || ''
              });
            });
          } catch(e) {}
        });

        const _attTypeLabel = { absent:'결근', late:'지각', earlyleave:'조퇴' };
        const _absentLabel = { unauthorized:'무단', sick_unpaid:'병가(무급)', sick_paid:'병가(유급)', industrial:'산재', menstrual:'생리휴가', maternity_paid:'출산(유급)', maternity_unpaid:'출산(무급)', paternity_paid:'배우자출산', childcare_leave:'육아휴직', family_care:'가족돌봄', layoff_leave:'휴업휴직' };
        const ATT_COLS = 8;
        const _attCells = {};
        let _attRow = 0;
        const _attSet = (r,c,v,s) => { _attCells[XLSX.utils.encode_cell({r,c})] = {t:typeof v==='number'?'n':'s',v,s}; };
        // 타이틀
        for(let c=0;c<ATT_COLS;c++) _attSet(_attRow,c,c===0?`[${_wlCompanyName}] 근태 관리대장 — ${yr}년 ${moStr}월`:'',S_TITLE);
        _attRow++;
        // 헤더
        ['직원명','날짜','유형','결근사유','지급율(%)','시간','종료일','비고'].forEach((h,ci) => _attSet(_attRow,ci,h,S_HDR));
        _attRow++;
        // 데이터
        Object.entries(_attByEmp).forEach(([eid, entries]) => {
          const empName = (empMap[eid]||{}).name || '';
          let _attDi = 0;
          entries.forEach(e => {
            const typeLabel = _attTypeLabel[e.type] || e.type;
            const absLabel = e.type==='absent' ? (_absentLabel[e.absentType]||'결근') : '';
            const _sty = _attDi % 2 === 0 ? S_TEXT : S_TEXT_ALT;
            const _styVal = _attDi % 2 === 0 ? S_VAL : S_VAL_ALT;
            _attSet(_attRow,0,empName, _sty);
            _attSet(_attRow,1,e.date, _sty);
            _attSet(_attRow,2,typeLabel, _sty);
            _attSet(_attRow,3,absLabel, _sty);
            _attSet(_attRow,4,e.rate||0, _styVal);
            _attSet(_attRow,5,e.time||'', _sty);
            _attSet(_attRow,6,e.dateTo||'', _sty);
            _attSet(_attRow,7,'', _sty);
            _attRow++;
            _attDi++;
          });
        });
        const _attWs = { '!ref': XLSX.utils.encode_range({s:{r:0,c:0},e:{r:_attRow-1,c:ATT_COLS-1}}) };
        Object.assign(_attWs, _attCells);
        _attWs['!cols'] = [{wch:10},{wch:12},{wch:8},{wch:14},{wch:10},{wch:8},{wch:12},{wch:15}];
        XLSX.utils.book_append_sheet(wb, _attWs, '근태관리대장');
      }
    } catch(e) { console.warn('근태관리대장 시트 생성 실패:', e); }
  }

  // ── 연차 관리대장 시트 (Sheet3) ──
  if (typeof allLeaveLedgers !== 'undefined' && allLeaveLedgers.length > 0) {
    const _leaveRows = allLeaveLedgers.filter(l => {
      const emp = empMap[l.employee_id];
      return emp && emp.company_id === _coId;
    });
    if (_leaveRows.length > 0) {
      const LV_COLS = 7;
      const _lvCells = {};
      let _lvRow = 0;
      const _lvSet = (r,c,v,s) => { _lvCells[XLSX.utils.encode_cell({r,c})] = {t:typeof v==='number'?'n':'s',v,s}; };
      for(let c=0;c<LV_COLS;c++) _lvSet(_lvRow,c,c===0?`[${_wlCompanyName}] 연차 관리대장`:'',S_TITLE);
      _lvRow++;
      ['직원명','기준년도','발생일수','사용일수','잔여일수','이월일수','비고'].forEach((h,ci) => _lvSet(_lvRow,ci,h,S_HDR));
      _lvRow++;
      _leaveRows.forEach((l, idx) => {
        const empName = (empMap[l.employee_id]||{}).name||'';
        _lvSet(_lvRow,0,empName, idx%2===0?S_TEXT:S_TEXT_ALT);
        _lvSet(_lvRow,1,l.year||'', idx%2===0?S_TEXT:S_TEXT_ALT);
        _lvSet(_lvRow,2,l.granted_days||0, idx%2===0?S_VAL:S_VAL_ALT);
        _lvSet(_lvRow,3,l.used_days||0, idx%2===0?S_VAL:S_VAL_ALT);
        _lvSet(_lvRow,4,l.remain_days||0, idx%2===0?S_VAL:S_VAL_ALT);
        _lvSet(_lvRow,5,l.carried_days||0, idx%2===0?S_VAL:S_VAL_ALT);
        _lvSet(_lvRow,6,l.note||'', idx%2===0?S_TEXT:S_TEXT_ALT);
        _lvRow++;
      });
      const _lvWs = { '!ref': XLSX.utils.encode_range({s:{r:0,c:0},e:{r:_lvRow-1,c:LV_COLS-1}}) };
      Object.assign(_lvWs, _lvCells);
      _lvWs['!cols'] = [{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:20}];
      XLSX.utils.book_append_sheet(wb, _lvWs, '연차관리대장');
    }
  }

  const wbout = XLSX.write(wb, { cellStyles: true, bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `[${_wlCompanyName}]_임금대장_${yr}년${moStr}월.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast(`📥 ${yr}년 ${mo}월 임금대장 엑셀 다운로드 완료 (편집용)`, 'success');
}

// ─── 신고용 엑셀 다운로드 (기존 카드 레이아웃) ───
function _downloadReportExcel(pays, empMap, yr, mo, moStr) {
  const nv = v => (v===null||v===undefined||v==='') ? 0 : Number(v);
  const numFmt = '#,##0';

  // ========================================================
  //  열 구조 (총 9열) - 카드 레이아웃
  // ========================================================
  const COLS = 9;

  // ========================================================
  //  xlsx-js-style 스타일 형식
  //  fill   → {patternType:'solid', fgColor:{rgb:'RRGGBB'}}
  //  font   → {name, sz, bold, color:{rgb:'RRGGBB'}}
  //  border → {top:{style,color:{rgb}}, bottom, left, right}
  //  alignment → {horizontal, vertical, wrapText}
  // ========================================================

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

  // ========================================================
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
  // ========================================================

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

  // ========================================================
  //  워크시트 셀 직접 생성 방식
  //  (aoa_to_sheet + 나중에 .s 덮어쓰기 방식은 숫자셀 타입 충돌 발생)
  //  각 셀을 {v, t, z?, s} 형태로 바로 생성
  // ========================================================
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

  // ========================================================
  //  카드 빌더 (직원 1장 = 10행 + 1빈행)
  //   r0: 헤더A — No | 성명lbl·val | 부서lbl·val | 직책lbl·val | 고용형태lbl·val
  //   r1: 헤더B — No병합 | 근로일수 | 연장야간 | 지급총액lbl·val | 공제합계lbl·val | 실수령액lbl·val
  //   r2~r6: 지급내역 5행 (A열 5행 병합)
  //   r7~r9: 공제내역 3행 (A열 3행 병합)
  //   r10: 빈행
  // ========================================================
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

    // ── 지급내역 (신고용: 값 없는 항목은 공란으로 표시) ──
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
       {lbl:'보육수당', val:isSum?sums.childcare_allowance    :nv(p.childcare_allowance)},
       {lbl:'연구활동비',    val:isSum?sums.research_allowance     :nv(p.research_allowance)}],
      [{lbl:'연차수당',      val:isSum?sums.annual_leave_pay       :nv(p.annual_leave_pay)},
       {lbl:'정기상여금',    val:isSum?sums.bonus_pay              :nv(p.bonus_pay)},
       {lbl:'성과급',        val:isSum?sums.performance_pay        :nv(p.performance_pay)},
       {lbl:'실비변상적급여',val:isSum?sums.actual_expense_pay     :nv(p.actual_expense_pay)}],
      [{lbl:'통신비',        val:isSum?sums.communication_pay      :nv(p.communication_pay)},
       {lbl:'기술수당',      val:isSum?sums.skill_allowance        :nv(p.skill_allowance)},
       {lbl:'면허수당',      val:isSum?sums.license_allowance      :nv(p.license_allowance)},
       {lbl:'기타수당',    val:isSum?(sums.etc_allowance+sums.other_pay):(nv(p.etc_allowance)+nv(p.other_pay))}],
    ];
    const lPay = isSum ? S_PAY_LBL_SUM : S_PAY_LBL;
    const vPay = isSum ? S_PAY_VAL_SUM : S_PAY_VAL;
    // 신고용: 값이 0인 항목은 셀을 비움 (행 구조 유지)
    const _showVal = (v) => mode==='report' && v===0 ? 0 : v;
    const _showLbl = (lbl, v) => mode==='report' && v===0 ? '' : lbl;
    for(let pi=0; pi<5; pi++){
      const it = payData[pi];
      pushRow(
        [pi===0?'지급내역':'',
         _showLbl(it[0].lbl,it[0].val), _showVal(it[0].val),
         _showLbl(it[1].lbl,it[1].val), _showVal(it[1].val),
         _showLbl(it[2].lbl,it[2].val), _showVal(it[2].val),
         _showLbl(it[3].lbl,it[3].val), _showVal(it[3].val)],
        15,
        [pi===0 ? S_SEC_PAY : S_SEC_PAY_E, lPay,vPay, lPay,vPay, lPay,vPay, lPay,vPay],
        [null, null,numFmt, null,numFmt, null,numFmt, null,numFmt]
      );
    }
    addMg(SR+2, 0, SR+6, 0); // 지급내역 A열 5행 병합 (열 수 고정으로 기타지급은 r4 마지막 슬롯에 포함됨)

    // ── 공제내역 (신고용: 값 없는 항목 공란) ──
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
    const _showDedLbl = (it, v) => mode==='report' && (!it || v===0) ? '' : (it?it.lbl:'');
    const _showDedVal = (it, v) => mode==='report' && (!it || v===0) ? 0 : (it?it.val:0);
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
         _showDedLbl(it[0], it[0]?it[0].val:0), _showDedVal(it[0], it[0]?it[0].val:0),
         _showDedLbl(it[1], it[1]?it[1].val:0), _showDedVal(it[1], it[1]?it[1].val:0),
         _showDedLbl(it[2], it[2]?it[2].val:0), _showDedVal(it[2], it[2]?it[2].val:0),
         _showDedLbl(it[3], it[3]?it[3].val:0), _showDedVal(it[3], it[3]?it[3].val:0)],
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

  // ========================================
  //  워크시트 조립 (직접 생성한 wsCells 주입)
  // ========================================
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
  toast(`📥 ${yr}년 ${mo}월 임금대장 엑셀 다운로드 완료 (신고용)`, 'success');
}
