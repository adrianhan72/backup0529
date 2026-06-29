// ==========================================
//   급여 명세서 발송 관리 페이지
// ==========================================

// ─── 상태 ───
let _pssCompanyId   = null;
let _pssCompanyName = '';
let _pssYM          = { year: new Date().getFullYear(), month: new Date().getMonth()+1 }; // 선택된 년월
let _pssSendLogs    = [];   // 이 고객사의 전체 발송 이력 캐시
let _pssSelectedMethod = 'kakao';   // 단건 모달 선택 방법
let _pssBulkMethod     = 'kakao';   // 일괄 모달 선택 방법
let _pssConfirmTarget  = null;      // 단건 발송 대상 {payrollId, empId, empName, phone, year, month}
let _pssLogPage = 1;
const PSS_LOG_ITEMS = 20;
let _pssSingleSendRunning = false;  // 단건 카카오 발송 중 플래그
let _pssBulkSendRunning   = false;  // 일괄 카카오 발송 중 플래그

// ─── 고객사 선택 칩 렌더 ───
function renderPssCompanyList(){
  const q = (document.getElementById('pss-company-search')?.value || '').toLowerCase();
  const wrap = document.getElementById('pss-company-chips');
  if(!wrap) return;
  const list = allCompanies.filter(c =>
    isCompanyActive(c) &&
    (!q || (c.company_name||'').toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));
  if(!list.length){
    wrap.innerHTML = '<span style="font-size:12px;color:#9ca3af;">검색 결과가 없습니다.</span>';
    return;
  }

  // 고객사별 미발송 건수 사전 계산
  const sentPayrollIds = new Set((_allSendLogs||[]).map(l => l.payroll_id));
  const unsentByCompany = {};
  (allPayrolls||[]).forEach(p => {
    if(!sentPayrollIds.has(p.id)){
      unsentByCompany[p.company_id] = (unsentByCompany[p.company_id] || 0) + 1;
    }
  });

  wrap.innerHTML = list.map(c => {
    const unsent = unsentByCompany[c.id] || 0;
    const badgeHtml = unsent > 0
      ? `<span class="pss-co-unsent-badge">${unsent}</span>`
      : '';
    const isSelected = _pssCompanyId === c.id;
    return `
      <div class="company-chip${isSelected ? ' selected' : ''}"
           onclick="selectPssCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}')">
        <i class="fas fa-building" style="font-size:10px;opacity:.7;"></i>${c.company_name}${badgeHtml}
      </div>`;
  }).join('');
}

// ─── 고객사 선택 ───
async function selectPssCompany(id, name){
  _pssCompanyId   = id;
  _pssCompanyName = name;
  currentGlobalCompanyId   = id;
  currentGlobalCompanyName = name;

  document.getElementById('pss-company-select-card').style.display = 'none';
  document.getElementById('pss-main-section').style.display = '';
  document.getElementById('pss-selected-company-label').innerHTML =
    `<i class="fas fa-building" style="margin-right:6px;color:#7c3aed;"></i>${name} — 급여명세서 발송 관리`;

  // 이력 로드 중 tbody 스피너 표시
  const _pssUTb = document.getElementById('pss-unsent-tbody');
  const _pssLTb = document.getElementById('pss-log-tbody');
  const _spinRow = (cols) => `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#7c3aed;margin-right:8px;"></i>불러오는 중...</td></tr>`;
  if(_pssUTb) _pssUTb.innerHTML = _spinRow(6);
  if(_pssLTb) _pssLTb.innerHTML = _spinRow(6);

  // 발송 이력 로드 → 년월 탭 → 목록 렌더
  await _pssLoadLogs();
  renderPssMonthTabs();   // 탭 렌더 (가장 최근 년월 자동 선택)
  renderPssUnsentList();
  renderPssLogs();
  _pssUpdateStats();
}

// ─── 고객사 선택 해제 ───
function clearPssCompanySelect(){
  _pssCompanyId = null;
  document.getElementById('pss-company-select-card').style.display = '';
  document.getElementById('pss-main-section').style.display = 'none';
  renderPssCompanyList();
}

// ─── 발송 이력 로드 (전체, 이 고객사) ───
async function _pssLoadLogs(){
  const data = await api(`../tables/payroll_send_logs?limit=500`);
  _pssSendLogs = (data.data || []).filter(l => l.company_id === _pssCompanyId);
}

// ─── 년월 탭 렌더 ───
function renderPssMonthTabs(){
  const wrap = document.getElementById('pss-month-tabs');
  if(!wrap) return;

  // 미발송이 있는 년월만 수집 → 최신순 정렬
  const ymSet = new Map(); // 'YYYY-MM' → {year, month}
  allPayrolls
    .filter(p => p.company_id === _pssCompanyId)
    .forEach(p => {
      const key = `${Number(p.pay_year)}-${String(Number(p.pay_month)).padStart(2,'0')}`;
      ymSet.set(key, { year: Number(p.pay_year), month: Number(p.pay_month) });
    });

  const ymList = [...ymSet.values()]
    .sort((a,b) => b.year!==a.year ? b.year-a.year : b.month-a.month)
    .filter(ym => _pssGetUnsentList(ym.year, ym.month).length > 0); // 미발송 있는 월만

  if(!ymList.length){
    wrap.innerHTML = `<div class="pss-empty" style="padding:10px 0;">미발송 급여 명세서가 없습니다.</div>`;
    return;
  }

  // 현재 _pssYM이 목록에 없으면 가장 최근 년월로 초기화
  const isInList = ymList.some(x => x.year===_pssYM.year && x.month===_pssYM.month);
  if(!isInList){
    _pssYM = { ...ymList[0] };
  }

  wrap.innerHTML = ymList.map(ym => {
    const isActive  = ym.year===_pssYM.year && ym.month===_pssYM.month;
    const unsentCnt = _pssGetUnsentList(ym.year, ym.month).length;
    const moStr     = String(ym.month).padStart(2,'0');
    return `<div class="pss-month-tab${isActive?' active':''}" onclick="selectPssYM(${ym.year},${ym.month})">
      ${ym.year}년 ${moStr}월<span class="pss-tab-badge unsent">${unsentCnt}</span>
    </div>`;
  }).join('');
}

// ─── 년월 선택 ───
function selectPssYM(year, month){
  _pssYM = { year, month };
  _pssLogPage = 1;
  renderPssMonthTabs();
  renderPssUnsentList();
  renderPssLogs();
  _pssUpdateStats();
}

// ─── 해당 년월 급여 레코드 목록 (유효 계약 직원만) ───
function _pssGetMonthPayrolls(year, month){
  const yr = year  ?? _pssYM.year;
  const mo = month ?? _pssYM.month;
  return allPayrolls.filter(p => {
    if(p.company_id !== _pssCompanyId) return false;
    if(Number(p.pay_year)  !== yr) return false;
    if(Number(p.pay_month) !== mo) return false;
    // 계약이 임시저장 상태인 직원 제외
    const ct = allContracts.find(c => c.employee_id === p.employee_id &&
      (c.status===EMP_STATUS.ACTIVE || c.status===CONTRACT_STATUS.ACTIVE))
      || allContracts.find(c => c.employee_id === p.employee_id);
    if(ct && ct.is_draft) return false;
    return true;
  });
}

// ─── 해당 년월 이미 발송된 payroll_id 집합 ───
function _pssGetSentPayrollIds(year, month){
  const yr = year  ?? _pssYM.year;
  const mo = month ?? _pssYM.month;
  return new Set(
    _pssSendLogs
      .filter(l => Number(l.pay_year) === yr && Number(l.pay_month) === mo)
      .map(l => l.payroll_id)
  );
}

// ─── 해당 년월 발송 완료 레코드 목록 ───
function _pssGetSentPayrolls(year, month){
  const sentIds = _pssGetSentPayrollIds(year, month);
  return _pssGetMonthPayrolls(year, month).filter(p => sentIds.has(p.id));
}

// ─── 해당 년월 미발송 목록 ───
function _pssGetUnsentList(year, month){
  const sentIds = _pssGetSentPayrollIds(year, month);
  return _pssGetMonthPayrolls(year, month).filter(p => !sentIds.has(p.id));
}

// ─── 미발송 목록 렌더 ───
function renderPssUnsentList(){
  const tbody = document.getElementById('pss-unsent-tbody');
  const allClearMsg = document.getElementById('pss-all-clear-msg');
  const sendAllBtn  = document.getElementById('pss-send-all-btn');
  const countBadge  = document.getElementById('pss-unsent-count');
  if(!tbody) return;

  const unsentList = _pssGetUnsentList(_pssYM.year, _pssYM.month);
  countBadge.textContent = unsentList.length;

  const tableWrap = document.getElementById('pss-unsent-table-wrap');

  if(!unsentList.length){
    tbody.innerHTML = '';
    allClearMsg.style.display = '';
    sendAllBtn.disabled = true;
    if(tableWrap) tableWrap.style.display = 'none';
    return;
  }
  allClearMsg.style.display = 'none';
  sendAllBtn.disabled = false;
  if(tableWrap) tableWrap.style.display = '';

  tbody.innerHTML = unsentList.map((p, idx) => {
    const emp      = allEmployees.find(e => e.id === p.employee_id) || {};
    const cat      = emp.employment_category || '-';
    const phone    = emp.phone || emp.mobile || '';
    const email    = emp.email || '';
    const hasEmail = !!(email.trim());
    const emailBtnStyle = hasEmail
      ? 'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    return `<tr id="pss-urow-${idx}">
      <td style="font-weight:700;color:#1f2937;">${emp.name || '-'}</td>
      <td><span class="badge ${empCatBadge(cat)}" style="font-size:10.5px;padding:2px 7px;">${contractTypeLabel(cat)}</span></td>
      <td style="color:#6b7280;font-size:12px;">${phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="font-size:12px;">${hasEmail ? `<span style="color:#374151;">${email}</span>` : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button onclick="_pssKakaoSendRow('${p.id}','${p.employee_id}')" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;margin-right:3px;display:inline-flex;align-items:center;gap:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡 발송</button>
        <button onclick="_pssEmailSendRow('${p.id}','${p.employee_id}')" ${hasEmail ? '' : 'disabled'} style="${emailBtnStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:3px;">✉ 이메일 발송</button>
        <button onclick="_pssManualDoneRow('${p.id}','${p.employee_id}')" style="background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;">✔ 수동교부 완료</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── 미발송 목록 개별 관리 — 알림톡 발송 ───
async function _pssKakaoSendRow(payrollId, empId){
  const p   = allPayrolls.find(x => x.id === payrollId);
  const emp = allEmployees.find(e => e.id === empId) || {};
  if(!p) return;

  const yr    = _pssYM.year;
  const mo    = _pssYM.month;
  const moStr = String(mo).padStart(2,'0');
  const phone = emp.phone || emp.mobile || '';
  const empName = emp.name || '-';

  if(!phone){
    toast(`${empName} — 휴대전화번호가 등록되어 있지 않습니다.`, 'error');
    return;
  }

  const sentBy = sessionStorage.getItem('admin_username') || 'admin';

  try{
    // ① PDF 생성
    toast(`${empName} — PDF 생성 중...`, 'info');
    const fileName = `${empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const blob     = await _generatePayslipBlob(payrollId);
    const pdfFile  = new File([blob], fileName, { type:'application/pdf' });

    // ② 카카오 알림톡 발송
    toast(`${empName} — 알림톡 발송 중...`, 'info');
    await _sendKakaoAlimtalk(phone, fileName, pdfFile);

    // ③ 로그 저장
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    yr,
      pay_month:   mo,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'kakao',
      note:        '미발송 목록에서 개별 알림톡 발송'
    };
    await api('../tables/payroll_send_logs', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(logBody)
    });
    _pssSendLogs.push(logBody);
    _allSendLogs.push(logBody);
    _updateDashUnsentBanner();

    toast(`✅ ${empName} — ${yr}년 ${mo}월 알림톡 발송 완료`, 'success');
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[알림톡 발송 실패]', empName, err);
    toast(`✖ ${empName} — 알림톡 발송 실패`, 'error');
  }
}

// ─── 미발송 목록 개별 관리 — 이메일 발송 ───
async function _pssEmailSendRow(payrollId, empId){
  const p   = allPayrolls.find(x => x.id === payrollId);
  const emp = allEmployees.find(e => e.id === empId) || {};
  if(!p) return;

  const yr      = _pssYM.year;
  const mo      = _pssYM.month;
  const moStr   = String(mo).padStart(2,'0');
  const email   = emp.email || '';
  const empName = emp.name || '-';

  if(!email.trim()){
    toast(`${empName} — 이메일 주소가 등록되어 있지 않습니다.`, 'error');
    return;
  }

  const sentBy = sessionStorage.getItem('admin_username') || 'admin';

  try{
    // ① PDF 생성
    toast(`${empName} — PDF 생성 중...`, 'info');
    const fileName = `${empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const blob     = await _generatePayslipBlob(payrollId);
    const pdfFile  = new File([blob], fileName, { type:'application/pdf' });

    // ② 이메일 발송 (stub)
    await _sendEmailWithAttachment(email, fileName, pdfFile);

    // ③ 로그 저장
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    yr,
      pay_month:   mo,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'email',
      note:        `이메일 발송 (${email})`
    };
    await api('../tables/payroll_send_logs', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(logBody)
    });
    _pssSendLogs.push(logBody);
    _allSendLogs.push(logBody);
    _updateDashUnsentBanner();

    alert(`${empName}의 ${yr}년 ${mo}월 급여명세서를 이메일로 발송하였습니다.`);
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[이메일 발송 실패]', empName, err);
    toast(`✖ ${empName} — 이메일 발송 실패`, 'error');
  }
}

// ─── 미발송 목록 개별 관리 — 수동 교부 완료 ───
async function _pssManualDoneRow(payrollId, empId){
  const p   = allPayrolls.find(x => x.id === payrollId);
  const emp = allEmployees.find(e => e.id === empId) || {};
  if(!p) return;

  const yr      = _pssYM.year;
  const mo      = _pssYM.month;
  const empName = emp.name || '-';

  const ok = confirm(`${empName}의 ${yr}년 ${mo}월 급여명세서를 수동 교부 완료한 것으로 기록하겠습니까?`);
  if(!ok) return;

  const sentBy = sessionStorage.getItem('admin_username') || 'admin';

  try{
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    yr,
      pay_month:   mo,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'manual',
      note:        '수동 교부 완료'
    };
    await api('../tables/payroll_send_logs', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(logBody)
    });
    _pssSendLogs.push(logBody);
    _allSendLogs.push(logBody);
    _updateDashUnsentBanner();

    toast(`✔ ${empName} — 수동 교부 완료 처리됐습니다.`, 'success');
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[수동 교부 저장 실패]', empName, err);
    toast('저장 중 오류가 발생했습니다.', 'error');
  }
}

// ─── 요약 통계 업데이트 ───
function _pssUpdateStats(){
  // ── 대시보드 미발송 알림 배너 업데이트 ──
  _updateDashUnsentBanner();
}

function _updateDashUnsentContractBanner(){
  const section = document.getElementById('dash-contract-unsent-section');
  if(!section) return;

  // _contractDispatchList(발송 이력)가 heavy 데이터이므로 로드 완료 전에는 계산 불가
  // → _heavyDataReady=false 시 배너 업데이트 skip (loadHeavyData 완료 후 재호출됨)
  if(typeof _heavyDataReady !== 'undefined' && !_heavyDataReady) return;

  // _cdpGetUnsentContracts()로 미발송 계약서 전체 건수 산출
  const unsentList = _cdpGetUnsentContracts();
  const totalUnsent = unsentList.length;

  if(totalUnsent === 0){
    section.style.display = 'none';
    section.innerHTML = '';
    return;
  }

  section.style.display = '';
  section.innerHTML = `
    <div onclick="showPage('contract-dispatch', document.querySelector('.menu-item[data-page=\\'contract-dispatch\\']'))"
         style="cursor:pointer;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #3b82f6;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px;transition:box-shadow .15s;"
         onmouseover="this.style.boxShadow='0 4px 18px rgba(59,130,246,.2)'"
         onmouseout="this.style.boxShadow='none'">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas fa-file-contract" style="color:#fff;font-size:17px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:700;color:#1e40af;">
          근로계약서 미발송 <span style="color:#2563eb;font-size:16px;font-weight:800;">${totalUnsent}건</span>이 있습니다
        </div>
        <div style="font-size:12px;color:#3b82f6;margin-top:3px;">클릭하여 계약서 발송 관리 페이지로 이동합니다.</div>
      </div>
      <div style="color:#3b82f6;font-size:14px;flex-shrink:0;"><i class="fas fa-chevron-right"></i></div>
    </div>`;
  // 메뉴 배지 동기화
  if(typeof updateMenuBadges === 'function') updateMenuBadges();
}

function _updateDashUnsentBanner(){
  const section = document.getElementById('dash-unsent-section');
  if(!section) return;

  // 전체 고객사 × 전체 월 미발송 합산 (_allSendLogs 사용)
  const sentPayrollIds = new Set(_allSendLogs.map(l => l.payroll_id));
  const totalUnsent = allPayrolls.filter(p => !sentPayrollIds.has(p.id)).length;


  if(totalUnsent === 0){
    section.style.display = 'none';
    section.innerHTML = '';
    return;
  }

  section.style.display = '';
  section.innerHTML = `
    <div onclick="showPage('payslip-send', document.querySelector('.menu-item[data-page=\\'payslip-send\\']'))"
         style="cursor:pointer;background:linear-gradient(135deg,#fff7ed,#fef3c7);border:1px solid #f59e0b;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px;transition:box-shadow .15s;"
         onmouseover="this.style.boxShadow='0 4px 18px rgba(245,158,11,.2)'"
         onmouseout="this.style.boxShadow='none'">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas fa-exclamation-triangle" style="color:#fff;font-size:17px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:700;color:#92400e;">
          급여명세서 미발송 <span style="color:#d97706;font-size:16px;font-weight:800;">${totalUnsent}건</span>이 있습니다
        </div>
        <div style="font-size:12px;color:#b45309;margin-top:3px;">클릭하여 급여 명세서 발송 관리 페이지로 이동합니다.</div>
      </div>
      <div style="color:#d97706;font-size:14px;flex-shrink:0;"><i class="fas fa-chevron-right"></i></div>
    </div>`;
}

// ─── 발송 이력 렌더 ───
function renderPssLogs(){
  const tbody   = document.getElementById('pss-log-tbody');
  const pagWrap = document.getElementById('pss-log-pagination');
  const countBadge = document.getElementById('pss-log-count');
  if(!tbody) return;

  let logs = [..._pssSendLogs];

  // 직원명 검색 필터
  const q = (document.getElementById('pss-log-search')?.value || '').trim().toLowerCase();
  if(q){
    logs = logs.filter(l => {
      const emp = allEmployees.find(e => e.id === l.employee_id) || {};
      return (emp.name || '').toLowerCase().includes(q);
    });
  }

  // 최신순 정렬
  logs.sort((a,b) => (b.sent_at||'').localeCompare(a.sent_at||''));

  countBadge.textContent = logs.length;

  if(!logs.length){
    tbody.innerHTML = `<tr><td colspan="7" class="pss-empty">발송 이력이 없습니다.</td></tr>`;
    pagWrap.innerHTML = '';
    return;
  }

  const total = logs.length;
  const paged = logs.slice((_pssLogPage-1)*PSS_LOG_ITEMS, _pssLogPage*PSS_LOG_ITEMS);

  const methodLabel = { kakao:'카카오', email:'이메일', manual:'수동 교부' };
  const methodIcon  = { kakao:'fas fa-comment', email:'fas fa-envelope', manual:'fas fa-hand-paper' };
  const methodColor = { kakao:'#f9d000', email:'#3b82f6', manual:'#6b7280' };

  tbody.innerHTML = paged.map(l => {
    const emp = allEmployees.find(e => e.id === l.employee_id) || {};
    const cat = emp.employment_category || '-';
    const sentDt = l.sent_at ? new Date(l.sent_at).toLocaleString('ko-KR',{
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit'
    }) : '-';
    const meth = l.send_method || 'manual';
    return `<tr>
      <td style="font-weight:700;">${emp.name||l.employee_id||'-'}</td>
      <td><span class="badge ${empCatBadge(cat)}" style="font-size:10.5px;padding:2px 7px;">${contractTypeLabel(cat)}</span></td>
      <td style="font-size:12px;color:#374151;">${l.pay_year||'-'}년 ${l.pay_month||'-'}월</td>
      <td style="font-size:12px;color:#374151;">${sentDt}</td>
      <td><span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;">
        <i class="${methodIcon[meth]||'fas fa-paper-plane'}" style="color:${methodColor[meth]||'#6b7280'};"></i>
        ${methodLabel[meth]||meth}
      </span></td>
      <td style="font-size:12px;color:#6b7280;">${_resolveAdminName(l.sent_by)||'-'}</td>
      <td style="font-size:11.5px;color:#6b7280;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(l.note||'').replace(/"/g,'&quot;')}">${l.note||'-'}</td>
    </tr>`;
  }).join('');

  // 페이지네이션 (PSS_LOG_ITEMS 기준 자체 렌더)
  const totalPages = Math.ceil(total / PSS_LOG_ITEMS);
  const ps = Math.min((_pssLogPage-1)*PSS_LOG_ITEMS+1, total);
  const pe = Math.min(_pssLogPage*PSS_LOG_ITEMS, total);
  document.getElementById('pss-log-pagination').innerHTML = totalPages <= 1 ? '' : `
    <span class="page-info">${total}건 중 ${ps}-${pe}</span>
    <div class="page-btns">
      <button class="page-btn" onclick="setPssLogPage(${_pssLogPage-1})" ${_pssLogPage<=1?'disabled style="opacity:.4"':''}><i class="fas fa-chevron-left"></i></button>
      ${Array.from({length:Math.min(totalPages,5)},(_,i)=>{const p=Math.max(1,Math.min(_pssLogPage-2,totalPages-4))+i;return p>totalPages?'':`<button class="page-btn ${p===_pssLogPage?'active':''}" onclick="setPssLogPage(${p})">${p}</button>`;}).join('')}
      <button class="page-btn" onclick="setPssLogPage(${_pssLogPage+1})" ${_pssLogPage>=totalPages?'disabled style="opacity:.4"':''}><i class="fas fa-chevron-right"></i></button>
    </div>`;
}

function setPssLogPage(p){ _pssLogPage = p; renderPssLogs(); }
function clearPssLogSearch(){ const el = document.getElementById('pss-log-search'); if(el) el.value=''; _pssLogPage=1; renderPssLogs(); }

// ─── 단건 발송 모달 열기 ───
function openPssConfirmModal(payrollId, empId, year, month){
  const p   = allPayrolls.find(x => x.id === payrollId);
  const emp = allEmployees.find(e => e.id === empId) || {};
  if(!p) return;

  const yr = parseInt(year)  || _pssYM.year;
  const mo = parseInt(month) || _pssYM.month;

  _pssConfirmTarget = { payrollId, empId, empName: emp.name||'-',
    phone: emp.phone||emp.mobile||'', year: yr, month: mo };
  _pssSelectedMethod = 'kakao';
  _pssRefreshMethodBtns('pss-method');

  const moStr = String(mo).padStart(2,'0');
  document.getElementById('pss-confirm-info').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div><span style="color:#7c3aed;font-weight:700;font-size:13.5px;">${emp.name||'-'}</span>
        <span class="badge ${empCatBadge(emp.employment_category||'-')}" style="font-size:10.5px;padding:2px 7px;margin-left:6px;">${contractTypeLabel(emp.employment_category) || '-'}</span>
      </div>
      <div style="color:#374151;">📅 <b>${yr}년 ${moStr}월</b> 급여명세서</div>
      <div style="color:#374151;">💰 실수령액 <b>${won2(p.net_pay)}원</b></div>
      <div style="color:#6b7280;font-size:12px;">📱 ${emp.phone||emp.mobile||'연락처 미등록'}</div>
    </div>`;
  document.getElementById('pss-confirm-note').value = '';
  document.getElementById('pss-confirm-modal').classList.add('open');
}

function closePssConfirmModal(){
  if(_pssSingleSendRunning) return; // 단건 카카오 발송 진행 중엔 닫기 방지
  document.getElementById('pss-confirm-modal').classList.remove('open');
  _pssConfirmTarget = null;
  _pssSingleSendRunning = false;
  // 진행 상태 초기화
  const progWrap = document.getElementById('pss-confirm-progress');
  if(progWrap) progWrap.style.display = 'none';
  const sendBtn  = document.getElementById('pss-confirm-send-btn');
  if(sendBtn){ sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-check"></i> 발송 처리'; sendBtn.style.background=''; sendBtn.onclick = confirmPssSend; }
  const cancelBtn = document.getElementById('pss-confirm-cancel-btn');
  if(cancelBtn){ cancelBtn.disabled = false; }
}

// ─── 발송 방법 선택 버튼 토글 ───
function selectPssMethod(method){
  _pssSelectedMethod = method;
  _pssRefreshMethodBtns('pss-method');
}
function selectPssBulkMethod(method){
  _pssBulkMethod = method;
  _pssRefreshMethodBtns('pss-bulk-method');
}
function _pssRefreshMethodBtns(prefix){
  const method = prefix === 'pss-method' ? _pssSelectedMethod : _pssBulkMethod;
  ['kakao','email','manual'].forEach(m => {
    const btn = document.getElementById(`${prefix}-${m}`);
    if(btn) btn.classList.toggle('selected', m === method);
  });
}

// ─── 단건 발송 처리 확정 ───
async function confirmPssSend(){
  if(!_pssConfirmTarget) return;
  const { payrollId, empId, empName, phone, year, month } = _pssConfirmTarget;
  const note   = document.getElementById('pss-confirm-note').value.trim();
  const sentBy = sessionStorage.getItem('admin_username') || 'admin';
  const method = _pssSelectedMethod;

  // ── kakao가 아닌 경우: 기존 수동 기록 방식 유지 ──
  if(method !== 'kakao'){
    const body = {
      id:          'psl_' + Date.now(),
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    year,
      pay_month:   month,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: method,
      note:        note
    };
    try{
      await api('../tables/payroll_send_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      _pssSendLogs.push(body);
      _allSendLogs.push(body);
      _updateDashUnsentBanner();
      closePssConfirmModal();
      toast(`✅ ${empName} — ${year}년 ${month}월 발송 처리 완료`, 'success');
      renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
    } catch(e){
      toast('발송 처리 중 오류가 발생했습니다.', 'error');
      console.error(e);
    }
    return;
  }

  // ── kakao: PDF 생성 → 발송 → 로그 저장 플로우 ──
  if(_pssSingleSendRunning) return;
  _pssSingleSendRunning = true;

  const sendBtn   = document.getElementById('pss-confirm-send-btn');
  const cancelBtn = document.getElementById('pss-confirm-cancel-btn');
  const progWrap  = document.getElementById('pss-confirm-progress');
  const progIcon  = document.getElementById('pss-confirm-prog-icon');
  const progLabel = document.getElementById('pss-confirm-prog-label');
  const progBar   = document.getElementById('pss-confirm-prog-bar');

  // UI 잠금
  sendBtn.disabled  = true;
  cancelBtn.disabled = true;
  progWrap.style.display = 'block';

  const setStep = (icon, spin, label, pct, color) => {
    progIcon.className = spin ? `fas ${icon} fa-spin` : `fas ${icon}`;
    progIcon.style.color  = color || '#059669';
    progLabel.textContent = label;
    progLabel.style.color = color === '#ef4444' ? '#991b1b' : '#065f46';
    progBar.style.width   = pct + '%';
    progBar.style.background = color === '#ef4444'
      ? 'linear-gradient(90deg,#ef4444,#b91c1c)'
      : 'linear-gradient(90deg,#10b981,#059669)';
  };

  try{
    // ① PDF 생성
    setStep('fa-spinner', true, 'PDF 생성 중...', 30);
    const moStr   = String(month).padStart(2,'0');
    const fileName = `${empName}_${year}년${moStr}월_급여명세서.pdf`;
    const blob = await _generatePayslipBlob(payrollId);
    const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

    // ② 카카오 발송
    setStep('fa-paper-plane', true, '카카오로 발송 중...', 65);
    await _sendKakaoAlimtalk(phone, fileName, pdfFile);

    // ③ 로그 저장
    setStep('fa-database', true, '발송 이력 저장 중...', 85);
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    year,
      pay_month:   month,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'kakao',
      note:        note || '급여명세서 발송 관리에서 단건 발송'
    };
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logBody)
    });
    _pssSendLogs.push(logBody);
    _allSendLogs.push(logBody);
    _updateDashUnsentBanner();

    // ④ 완료
    setStep('fa-check-circle', false, '발송 완료!', 100);
    await new Promise(r => setTimeout(r, 700));

    _pssSingleSendRunning = false;
    closePssConfirmModal();
    toast(`✅ ${empName} — ${year}년 ${month}월 카카오 발송 완료`, 'success');
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();

  } catch(err){
    console.error('[단건 카카오 발송 실패]', err);
    _pssSingleSendRunning = false;
    setStep('fa-exclamation-circle', false, 'PDF 발송 실패. 다시 시도해 주세요.', 100, '#ef4444');
    sendBtn.disabled   = false;
    cancelBtn.disabled = false;
    sendBtn.innerHTML  = '<i class="fas fa-redo"></i> 다시 시도';
  }
}

// ─── 발송 관리 일괄 발송 헬퍼 ───
let _pssBulkSendItems = [];  // 발송 대상 목록

/* 직원별 상태 테이블 초기 렌더 */
function _pssBulkRenderTable(){
  const tbody = document.getElementById('pss-bulk-send-tbody');
  if(!tbody) return;
  tbody.innerHTML = _pssBulkSendItems.map((item, i) => {
    const hasEmail = !!(item.email && item.email.trim());
    const emailCell = hasEmail
      ? `<span style="font-size:12px;color:#374151;">${item.email}</span>`
      : `<span style="color:#d1d5db;font-size:12px;">미등록</span>`;
    const emailBtnStyle = hasEmail
      ? 'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    return `<tr id="pss-brow-${i}" style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:9px 12px;font-weight:700;color:#1a1a2e;">${item.empName}</td>
      <td style="padding:9px 12px;color:#6b7280;font-size:12.5px;">${item.phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="padding:9px 12px;">${emailCell}</td>
      <td id="pss-bstatus-${i}" style="padding:9px 12px;">${_pssBulkStatusHtml('idle')}</td>
      <td id="pss-baction-${i}" style="padding:9px 12px;text-align:center;white-space:nowrap;">
        <button onclick="_pssEmailSend(${i})" ${hasEmail ? '' : 'disabled'} style="${emailBtnStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:4px;">✉ 이메일 발송</button>
        <button onclick="_pssManualDone(${i})" style="background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;">✔ 수동 교부 완료</button>
      </td>
    </tr>`;
  }).join('');
}

/* 상태 배지 HTML */
function _pssBulkStatusHtml(status){
  const map = {
    idle:       ['idle',       '⏳ 대기'],
    generating: ['generating', '⚙️ PDF 생성 중'],
    sending:    ['sending',    '📨 발송 중'],
    success:    ['success',    '✔ 발송 성공'],
    fail:       ['fail',       '✖ 발송 실패'],
  };
  const [cls, label] = map[status] || ['idle', '⏳ 대기'];
  return `<span class="bs-status ${cls}">${label}</span>`;
}

/* 행 상태 업데이트 */
function _pssBulkSetStatus(i, status){
  if(_pssBulkSendItems[i]) _pssBulkSendItems[i].status = status;
  const cell = document.getElementById(`pss-bstatus-${i}`);
  if(cell) cell.innerHTML = _pssBulkStatusHtml(status);
}

/* 진행바 업데이트 */
function _pssBulkUpdateProgress(){
  const total = _pssBulkSendItems.length;
  const done  = _pssBulkSendItems.filter(x => x.status === 'success' || x.status === 'fail').length;
  const pct   = total ? Math.round(done / total * 100) : 0;
  const bar   = document.getElementById('pss-bulk-prog-bar');
  const pct_el = document.getElementById('pss-bulk-prog-pct');
  const lbl   = document.getElementById('pss-bulk-prog-label');
  if(bar)   bar.style.width   = pct + '%';
  if(pct_el) pct_el.textContent = `${done} / ${total} (${pct}%)`;
  if(lbl)   lbl.textContent   = done === total ? '발송 완료' : '발송 진행 중...';
}

// ─── 일괄 발송 모달 열기 ───
async function openPssSendAllModal(){
  const unsentList = _pssGetUnsentList(_pssYM.year, _pssYM.month);
  const targets    = unsentList;

  if(!targets.length){ toast('발송 대상이 없습니다.', 'error'); return; }

  // 항상 최신 직원 데이터 보장
  await loadEmployees();

  // 상태 초기화
  _pssBulkSendRunning = false;

  // 헤더 자막
  const moStr = String(_pssYM.month).padStart(2,'0');
  document.getElementById('pss-bulk-subtitle').textContent =
    `${_pssCompanyName} · ${_pssYM.year}년 ${moStr}월 · ${targets.length}명`;

  // 발송 대상 구성 (email 포함)
  _pssBulkSendItems = targets.map(p => {
    const emp = allEmployees.find(e => e.id === p.employee_id) || {};
    return {
      payrollId:  p.id,
      empId:      p.employee_id,
      empName:    emp.name || '(이름없음)',
      phone:      emp.phone || emp.mobile || '',
      email:      emp.email || '',
      companyId:  _pssCompanyId,
      payYear:    _pssYM.year,
      payMonth:   _pssYM.month,
      netPay:     p.net_pay,
      status:     'idle'
    };
  });

  // 직원 테이블 초기 렌더
  _pssBulkRenderTable();

  // 진행바 숨김, 버튼 초기화
  document.getElementById('pss-bulk-progress-bar-wrap').style.display = 'none';
  document.getElementById('pss-bulk-prog-bar').style.width = '0%';

  const sendBtn = document.getElementById('pss-bulk-send-btn');
  sendBtn.disabled  = false;
  sendBtn.style.background = '';
  sendBtn.style.color = '';
  sendBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡 일괄 발송 시작';
  sendBtn.onclick = confirmPssBulkSend;

  const cancelBtn = document.getElementById('pss-bulk-cancel-btn');
  cancelBtn.disabled    = false;
  cancelBtn.textContent = '닫기';

  document.getElementById('pss-bulk-modal').classList.add('open');
}

function closePssBulkModal(){
  if(_pssBulkSendRunning){ if(!confirm('발송이 진행 중입니다. 닫으시겠습니까?')) return; _pssBulkSendRunning = false; }
  document.getElementById('pss-bulk-modal').classList.remove('open');
}

/* 개별 이메일 발송 */
async function _pssEmailSend(i){
  if(_pssBulkSendRunning) return;
  const item = _pssBulkSendItems[i];
  if(!item || !item.email) return;

  const yr    = _pssYM.year;
  const mo    = _pssYM.month;
  const moStr = String(mo).padStart(2,'0');

  // 버튼 비활성 처리
  const actionCell = document.getElementById(`pss-baction-${i}`);
  if(actionCell) actionCell.innerHTML = '<span style="color:#6b7280;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> 처리 중...</span>';

  try{
    // PDF 생성
    const blob     = await _generatePayslipBlob(item.payrollId);
    const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const file     = new File([blob], fileName, { type:'application/pdf' });

    // 이메일 발송 (stub)
    await _sendEmailWithAttachment(item.email, fileName, file);

    // 발송 로그 저장
    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          'psl_' + Date.now() + '_' + (item.empId||''),
        company_id:  _pssCompanyId,
        employee_id: item.empId,
        payroll_id:  item.payrollId,
        pay_year:    yr,
        pay_month:   mo,
        sent_at:     new Date().toISOString(),
        sent_by:     sentBy,
        send_method: 'email',
        note:        `이메일 발송 (${item.email})`
      })
    });

    // 확인 메시지 → 행 제거
    alert(`${item.empName}의 ${yr}년 ${mo}월 급여명세서를 이메일로 발송하였습니다.`);
    _pssBulkSendItems.splice(i, 1);
    _pssBulkRenderTable();
    _pssCheckAllDone();
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[이메일 발송 실패]', err);
    toast(`✖ ${item.empName} 이메일 발송 실패`, 'error');
    _pssBulkRenderTable(); // 버튼 복원
  }
}

/* 개별 수동 교부 완료 처리 */
async function _pssManualDone(i){
  const item = _pssBulkSendItems[i];
  if(!item) return;

  const yr = _pssYM.year;
  const mo = _pssYM.month;

  const ok = confirm(`${item.empName}의 ${yr}년 ${mo}월 급여명세서를 수동 교부 완료한 것으로 기록하고 미발송 내역에서 제외하겠습니까?`);
  if(!ok) return;

  try{
    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          'psl_' + Date.now() + '_' + (item.empId||''),
        company_id:  _pssCompanyId,
        employee_id: item.empId,
        payroll_id:  item.payrollId,
        pay_year:    yr,
        pay_month:   mo,
        sent_at:     new Date().toISOString(),
        sent_by:     sentBy,
        send_method: 'manual',
        note:        '수동 교부 완료'
      })
    });

    _pssBulkSendItems.splice(i, 1);
    _pssBulkRenderTable();
    _pssCheckAllDone();
    toast(`✔ ${item.empName} 수동 교부 완료 처리됐습니다.`, 'success');
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[수동 교부 저장 실패]', err);
    toast('저장 중 오류가 발생했습니다.', 'error');
  }
}

/* 전체 완료 여부 체크 → 목록이 비면 발송 버튼 비활성 */
function _pssCheckAllDone(){
  if(_pssBulkSendItems.length === 0){
    const btn = document.getElementById('pss-bulk-send-btn');
    if(btn){
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> 전체 처리 완료';
      btn.style.background = 'linear-gradient(135deg,#059669,#047857)';
      btn.style.color = '#fff'; // disabled CSS를 override해야 하므로 인라인 유지
    }
  }
}

// ─── 일괄 발송 처리 (발송 시작 버튼) — kakao 전용 ───
async function confirmPssBulkSend(){
  if(_pssBulkSendRunning) return;
  if(!_pssBulkSendItems.length){ toast('발송 대상이 없습니다.', 'error'); return; }

  const sentBy = sessionStorage.getItem('admin_username') || 'admin';
  const yr     = _pssYM.year;
  const mo     = _pssYM.month;
  const moStr  = String(mo).padStart(2,'0');

  const sendBtn   = document.getElementById('pss-bulk-send-btn');
  const cancelBtn = document.getElementById('pss-bulk-cancel-btn');

  // ── kakao: PDF 생성 → 발송 → 로그 저장 순차 플로우 ──
  _pssBulkSendRunning = true;

  sendBtn.disabled   = true;
  sendBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> 발송 중...';
  cancelBtn.disabled = true;

  // 진행 바 표시
  const progBarWrap = document.getElementById('pss-bulk-progress-bar-wrap');
  progBarWrap.style.display = 'block';
  _pssBulkUpdateProgress();

  let successCnt = 0, failCnt = 0;

  for(let i = 0; i < _pssBulkSendItems.length; i++){
    if(!_pssBulkSendRunning) break;
    const item = _pssBulkSendItems[i];
    if(item.status === 'success') continue; // 재시도 시 성공 건 스킵

    // ① PDF 생성
    _pssBulkSetStatus(i, 'generating');
    document.getElementById(`pss-brow-${i}`)?.scrollIntoView({ block:'nearest' });
    let blob;
    try{
      blob = await _generatePayslipBlob(item.payrollId);
    } catch(err){
      console.error(`[PDF 생성 실패] ${item.empName}`, err);
      _pssBulkSetStatus(i, 'fail'); failCnt++; _pssBulkUpdateProgress(); continue;
    }

    // ② 카카오 알림톡 발송
    _pssBulkSetStatus(i, 'sending');
    const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const pdfFile  = new File([blob], fileName, { type:'application/pdf' });
    try{
      await _sendKakaoAlimtalk(item.phone, fileName, pdfFile);
    } catch(err){
      console.error(`[카카오 발송 실패] ${item.empName}`, err);
      _pssBulkSetStatus(i, 'fail'); failCnt++; _pssBulkUpdateProgress(); continue;
    }

    // ③ 로그 저장
    const logBody = {
      id:          'psl_' + Date.now() + '_' + item.empId,
      company_id:  _pssCompanyId,
      employee_id: item.empId,
      payroll_id:  item.payrollId,
      pay_year:    yr,
      pay_month:   mo,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'kakao',
      note:        '급여명세서 발송 관리에서 일괄 발송'
    };
    try{
      await api('../tables/payroll_send_logs', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(logBody) });
      _pssSendLogs.push(logBody);
      _allSendLogs.push(logBody);
    } catch(e){ console.warn('[발송 로그 저장 실패]', e); }
    _updateDashUnsentBanner();

    _pssBulkSetStatus(i, 'success');
    successCnt++;
    _pssBulkUpdateProgress();
  }

  _pssBulkSendRunning = false;
  cancelBtn.disabled    = false;
  cancelBtn.textContent = '닫기';

  if(failCnt === 0){
    sendBtn.disabled  = true;
    sendBtn.innerHTML = '<i class="fas fa-check-circle"></i> 전체 발송 완료';
    sendBtn.style.background = 'linear-gradient(135deg,#059669,#047857)';
    sendBtn.style.color = '#fff';
    document.getElementById('pss-bulk-prog-label').textContent = '전체 발송 완료! ✅';
    toast(`✅ 전체 ${successCnt}명 알림톡 발송 완료!`, 'success');
  } else {
    sendBtn.disabled  = false;
    sendBtn.style.background = '';
    sendBtn.style.color = '';
    sendBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡 재발송 (실패 건만)';
    sendBtn.onclick = confirmPssBulkSend; // 재호출 시 success 건 스킵
    document.getElementById('pss-bulk-prog-label').textContent = `발송 완료 — 성공 ${successCnt}명 / 실패 ${failCnt}명`;
    toast(`⚠ 발송 완료: ${successCnt}명 성공, ${failCnt}명 실패`, 'error');
  }

  renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
}

