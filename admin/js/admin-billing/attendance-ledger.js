/**
 * admin/js/admin-billing/attendance-ledger.js
 * 근태 관리대장 (결근·지각·조퇴)
 * 보존년한: 근로계약 종료일로부터 5년
 */

let _atlCompanyId   = '';
let _atlCompanyName = '';
let _atlRefYear     = new Date().getFullYear();
let _atlLedgerCache = [];

function initAttendanceLedgerPage() {
  _atlCompanyId   = '';
  _atlCompanyName = '';
  _atlRefYear     = new Date().getFullYear();
  _atlLedgerCache = [];
  document.getElementById('atl-company-select-card').style.display = '';
  document.getElementById('atl-main-section').style.display = 'none';
  atlInitYearSelect();
  atlRenderCompanyChips();
}

function atlInitYearSelect() {
  const sel = document.getElementById('atl-year-sel');
  if (!sel) return;
  sel.innerHTML = '';
  const cur = new Date().getFullYear();
  for (let y = cur; y >= cur - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '년';
    if (y === _atlRefYear) opt.selected = true;
    sel.appendChild(opt);
  }
}

function atlRenderCompanyChips() {
  const container = document.getElementById('atl-company-chips');
  if (!container) return;
  const q = (document.getElementById('atl-company-search')?.value || '').trim().toLowerCase();
  const activeCos = (allCompanies || []).filter(c => {
    const status = c.status || 'active';
    return status === 'active' || status === '' || !status;
  });
  const filtered = q ? activeCos.filter(c => (c.company_name || '').toLowerCase().includes(q)) : activeCos;
  filtered.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || '', 'ko'));
  container.innerHTML = filtered.map(co => {
    const empCount = (allEmployees || []).filter(e => e.company_id === co.id && e.status === 'active').length;
    return '<button class="co-chip" onclick="atlSelectCompany(\x27' + co.id + '\x27,\x27' + (co.company_name||'').replace(/'/g,'\\\x27') + '\x27)"><span>' + (co.company_name||co.id) + '</span><span class="co-chip-badge">' + empCount + '명</span></button>';
  }).join('') || '<div style="color:#9ca3af;font-size:12.5px;padding:8px 0;">조건에 맞는 고객사가 없습니다.</div>';
}

async function atlSelectCompany(companyId, companyName) {
  _atlCompanyId   = companyId;
  _atlCompanyName = companyName;
  document.getElementById('atl-company-select-card').style.display = 'none';
  document.getElementById('atl-main-section').style.display = '';
  document.getElementById('atl-company-name-title').textContent = companyName;
  _atlRefYear = parseInt(document.getElementById('atl-year-sel')?.value) || new Date().getFullYear();

  try {
    const res = await fetch('../tables/attendance_ledger?company_id=' + companyId + '&limit=500');
    const data = await res.json();
    _atlLedgerCache = (data.data || []).filter(r => r.company_id === companyId);
  } catch(e) { _atlLedgerCache = []; }
  atlRenderTable();
}

function atlBackToCompanyList() {
  document.getElementById('atl-company-select-card').style.display = '';
  document.getElementById('atl-main-section').style.display = 'none';
  _atlCompanyId = '';
  _atlCompanyName = '';
  _atlLedgerCache = [];
}

function atlRenderTable() {
  _atlRefYear = parseInt(document.getElementById('atl-year-sel')?.value) || new Date().getFullYear();
  const searchQ = (document.getElementById('atl-emp-search')?.value || '').trim().toLowerCase();
  const tbody = document.getElementById('atl-tbody');
  if (!tbody || !_atlCompanyId) return;

  const _ATL_EXCLUDED_TYPES = new Set(['daily', CONTRACT_TYPE.EXECUTIVE, CONTRACT_TYPE.REPRESENTATIVE, CONTRACT_TYPE.RELATED_PARTY]);
  const emps = (allEmployees || []).filter(e =>
    e.company_id === _atlCompanyId &&
    e.status === 'active' &&
    !_ATL_EXCLUDED_TYPES.has(e.employment_category)
  ).sort((a,b) => (a.name||'').localeCompare(b.name||'', 'ko'));

  const filtered = searchQ ? emps.filter(e => (e.name||'').toLowerCase().includes(searchQ)) : emps;

  const empStats = filtered.map(emp => {
    const ledger = _atlLedgerCache.find(l => l.employee_id === emp.id && l.year === _atlRefYear);
    let absentDays = 0, lateCount = 0, earlyCount = 0;
    if (ledger) {
      let entries = [];
      try { entries = JSON.parse(ledger.month_data || '[]'); } catch(e) {}
      entries.forEach(e => {
        if (e.type === 'absent') {
          const expandedDates = _atlExpandDateRange(e.date, e.dateTo || '');
          absentDays += expandedDates.length;
        } else if (e.type === 'late') {
          lateCount++;
        } else if (e.type === 'earlyleave') {
          earlyCount++;
        }
      });
    }
    return { emp, absentDays, lateCount, earlyCount };
  });

  document.getElementById('atl-stat-emp').textContent = empStats.length;
  document.getElementById('atl-stat-absent').textContent = empStats.reduce((s,x) => s + x.absentDays, 0);
  document.getElementById('atl-stat-late').textContent = empStats.reduce((s,x) => s + x.lateCount, 0);
  document.getElementById('atl-stat-early').textContent = empStats.reduce((s,x) => s + x.earlyCount, 0);

  if (!empStats.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="cen-empty"><i class="fas fa-inbox"></i> 대상 직원이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = empStats.map(({emp, absentDays, lateCount, earlyCount}) => {
    const catLabel = (typeof contractTypeLabel === 'function' ? contractTypeLabel(emp.employment_category) : null) || emp.employment_category || '-';
    const catBadge = (typeof CAT_BADGE_CLS !== 'undefined' ? CAT_BADGE_CLS[emp.employment_category] : null) || 'badge-gray';
    const escName = (emp.name||'').replace(/'/g, "\'");
    return '<tr><td>' + (emp.name||'-') + '</td><td style="text-align:center;font-size:12px;">' + (typeof genderLabel==='function'?genderLabel(emp):'-') + '</td><td><span class="badge ' + catBadge + '">' + catLabel + '</span></td><td>' + (emp.department||'-') + '</td><td class="right" style="font-weight:600;color:' + (absentDays>0?'#dc2626':'#9ca3af') + ';">' + absentDays + '일</td><td class="right" style="font-weight:600;color:' + (lateCount>0?'#d97706':'#9ca3af') + ';">' + lateCount + '회</td><td class="right" style="font-weight:600;color:' + (earlyCount>0?'#4f46e5':'#9ca3af') + ';">' + earlyCount + '회</td><td style="text-align:center;"><button class="btn btn-sm btn-indigo" onclick="atlOpenLedger(\x27' + emp.id + '\x27,\x27' + escName + '\x27)"><i class="fas fa-clipboard-check"></i> 근태관리</button></td></tr>';
  }).join('');
}

function atlOpenLedger(empId, empName) {
  const modal = document.getElementById('atl-ledger-modal');
  const body  = document.getElementById('atl-ledger-body');
  if (!modal || !body) return;

  document.getElementById('atl-ledger-title').textContent = empName + ' — 근태 관리대장';

  const sickRate = _atlGetSickLeaveRate();
  const emp = (allEmployees || []).find(e => e.id === empId) || {};
  const isFemale = emp.gender === 'female' || emp.gender === '여성' || emp.gender === '여';
  const isMale   = emp.gender === 'male'   || emp.gender === '남성' || emp.gender === '남';

  body.innerHTML = '<div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;padding:12px;background:#f9fafb;border-radius:8px;"><div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:11px;color:#6b7280;font-weight:600;">시작일</label><input type="date" id="atl-new-date" class="form-input input-slim" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" /></div><div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:11px;color:#6b7280;font-weight:600;">종료일</label><input type="date" id="atl-new-date-to" class="form-input input-slim" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" placeholder="단일일은 비워둠" /></div><div style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:11px;color:#6b7280;font-weight:600;">유형</label><select id="atl-new-type" class="filt-select input-slim" onchange="atlToggleTimeInput()"><option value="absent">결근</option><option value="late">지각</option><option value="earlyleave">조퇴</option></select></div><div id="atl-absent-type-wrap" style="display:flex;flex-direction:column;gap:4px;"><label style="font-size:11px;color:#6b7280;font-weight:600;">결근 사유</label><select id="atl-absent-type" class="filt-select input-slim"><option value="unauthorized">무단 (무급)</option><option value="sick_unpaid">병가 (무급)</option>' + (sickRate > 0 ? '<option value="sick_paid">병가 (유급 ' + sickRate + '%)</option>' : '') + '<option value="industrial">산재 (근로복지공단 지급)</option>' + (isFemale ? '<option value="menstrual">생리휴가 (무급)</option><option value="maternity_paid">본인 출산휴가 (유급)</option><option value="maternity_unpaid">본인 출산휴가 (무급)</option>' : '') + (isMale ? '<option value="paternity_paid">배우자 출산휴가 (유급)</option>' : '') + '<option value="childcare_leave">육아휴직 (고용보험지급)</option><option value="family_care">가족돌봄휴직 (무급)</option><option value="layoff_leave">휴업휴직 (평균임금의 70%)</option></select></div><div id="atl-time-input-wrap" style="display:none;flex-direction:column;gap:4px;"><label style="font-size:11px;color:#6b7280;font-weight:600;" id="atl-time-label">출근 시각</label><input type="time" id="atl-new-time" class="form-input input-slim" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" /></div><button class="btn btn-sm btn-primary input-slim" onclick="atlAddEntry(\x27' + empId + '\x27)"><i class="fas fa-plus"></i> 추가</button></div><div id="atl-ledger-entries" style="max-height:400px;overflow-y:auto;">로딩 중...</div><div style="display:flex;justify-content:flex-end;gap:8px;padding-top:16px;border-top:1px solid #e5e7eb;margin-top:16px;"><button class="btn btn-secondary btn-sm" onclick="atlCloseLedgerModal()"><i class="fas fa-times"></i> 취소</button><button class="btn btn-indigo btn-sm" onclick="atlSaveAndClose()"><i class="fas fa-check"></i> 저장</button></div>';

  modal.style.display = '';
  modal.classList.add('open');
  atlToggleTimeInput();
  atlRenderLedgerEntries(empId);
}

function _atlGetSickLeaveRate() {
  try {
    const co = (allCompanies || []).find(c => c.id === _atlCompanyId);
    return parseFloat(co?.sick_leave_pay_rate) || 0;
  } catch(e) { return 0; }
}

function atlToggleTimeInput() {
  const type = document.getElementById('atl-new-type')?.value || 'absent';
  const timeWrap = document.getElementById('atl-time-input-wrap');
  const absentTypeWrap = document.getElementById('atl-absent-type-wrap');
  const label = document.getElementById('atl-time-label');
  if (absentTypeWrap) absentTypeWrap.style.display = type === 'absent' ? 'flex' : 'none';
  if (!timeWrap || !label) return;
  if (type === 'absent') { timeWrap.style.display = 'none'; }
  else { timeWrap.style.display = 'flex'; label.textContent = type === 'late' ? '출근 시각' : '조퇴 시각'; }
}

function atlRenderLedgerEntries(empId) {
  const container = document.getElementById('atl-ledger-entries');
  if (!container) return;

  // 모든 연도의 근태 기록을 수집
  const ledgers = _atlLedgerCache.filter(l => l.employee_id === empId);
  let entries = [];
  ledgers.forEach(ledger => {
    try { entries = entries.concat(JSON.parse(ledger.month_data || '[]')); } catch(e) {}
  });

  // 날짜순 정렬
  entries.sort((a,b) => (a.date||'').localeCompare(b.date||''));

  if (!entries.length) { container.innerHTML = '<div style="text-align:center;padding:30px;color:#9ca3af;">기록된 근태 내역이 없습니다.</div>'; return; }

  const typeLabel = { absent: '결근', late: '지각', earlyleave: '조퇴' };
  const typeColor = { absent: '#dc2626', late: '#d97706', earlyleave: '#4f46e5' };
  const typeBg    = { absent: '#fef2f2', late: '#fff7ed', earlyleave: '#eef2ff' };
  const absentLabels = { unauthorized: '무단(무급)', sick_unpaid: '병가(무급)', sick_paid: '병가(유급)', industrial: '산재', menstrual: '생리휴가(무급)', maternity_paid: '출산(유급)', maternity_unpaid: '출산(무급)', paternity_paid: '배우자출산(유급)', childcare_leave: '육아휴직', family_care: '가족돌봄휴직', layoff_leave: '휴업휴직' };
  const absentBg   = { unauthorized: '#f3f4f6', sick_unpaid: '#fff7ed', sick_paid: '#dcfce7', industrial: '#dbeafe', menstrual: '#f5f3ff', maternity_paid: '#fdf2f8', maternity_unpaid: '#fef2f2', paternity_paid: '#ecfeff', childcare_leave: '#f0fdfa', family_care: '#f5f3ff', layoff_leave: '#fef2f2' };
  const absentFg   = { unauthorized: '#374151', sick_unpaid: '#c2410c', sick_paid: '#166534', industrial: '#1e40af', menstrual: '#7c3aed', maternity_paid: '#be185d', maternity_unpaid: '#dc2626', paternity_paid: '#0e7490', childcare_leave: '#0f766e', family_care: '#6d28d9', layoff_leave: '#b91c1c' };

  container.innerHTML = entries.map((e, i) => {
    let extraInfo = '';
    if (e.type === 'absent' && e.absentType) {
      const al = absentLabels[e.absentType] || e.absentType;
      const bg = absentBg[e.absentType] || '#f3f4f6';
      const fg = absentFg[e.absentType] || '#374151';
      const rateText = (e.absentType === 'sick_paid' && e.rate > 0) ? ' ' + e.rate + '%' : '';
      extraInfo = '<span style="display:inline-block;background:' + bg + ';color:' + fg + ';padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;margin-left:4px;">' + al + rateText + '</span>';
    }
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:6px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;"><div style="display:flex;align-items:center;gap:10px;"><span style="font-weight:600;">' + (e.date||'-') + '</span><span style="display:inline-block;background:' + (typeBg[e.type]||'#f3f4f6') + ';color:' + (typeColor[e.type]||'#374151') + ';padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">' + (typeLabel[e.type]||e.type) + '</span>' + extraInfo + (e.time ? '<span style="color:#6b7280;font-size:12px;">' + e.time + '</span>' : '') + '</div><button class="btn btn-sm" onclick="atlDeleteEntry(\x27' + empId + '\x27,' + i + ',\x27' + e.date + '\x27,\x27' + e.type + '\x27)"><i class="fas fa-trash"></i></button></div>';
  }).join('');
}

async function atlAddEntry(empId) {
  const dateFromEl = document.getElementById('atl-new-date');
  const dateToEl   = document.getElementById('atl-new-date-to');
  const typeEl     = document.getElementById('atl-new-type');
  const timeEl     = document.getElementById('atl-new-time');
  const absentTypeEl = document.getElementById('atl-absent-type');
  if (!dateFromEl || !dateFromEl.value) { if(typeof toast==='function') toast('시작일을 선택하세요.', 'error'); return; }

  const dateFrom = dateFromEl.value;
  const dateTo   = dateToEl?.value || '';
  const type = typeEl?.value || 'absent';
  const time = timeEl?.value || '';
  const absentType = absentTypeEl?.value || 'unauthorized';

  // 중복 체크
  const [y] = dateFrom.split('-');
  const year = parseInt(y);
  const existingLedger = _atlLedgerCache.find(l => l.employee_id === empId && l.year === year);
  let entries = [];
  if (existingLedger) {
    try { entries = JSON.parse(existingLedger.month_data || '[]'); } catch(e) { entries = []; }
  }
  const allDates = _atlExpandDateRange(dateFrom, dateTo);
  const dupDates = allDates.filter(d => entries.some(e => e.date === d));
  if (dupDates.length > 0) { if(typeof toast==='function') toast('이미 등록된 날짜가 포함되어 있습니다: ' + dupDates.join(', '), 'error'); return; }

  // ── 근로계약 시작일 이전 차단 ──
  const _contracts = (allContracts || []).filter(c =>
    c.employee_id === empId && c.company_id === _atlCompanyId && !c.is_draft && !c.is_voided_by_amend
  );
  if (_contracts.length > 0) {
    const _earliestStart = _contracts
      .map(c => c.contract_start)
      .filter(Boolean)
      .sort()[0];
    if (_earliestStart && dateFrom < _earliestStart) {
      if(typeof toast==='function') toast(`근로계약 시작일(${_earliestStart}) 이전 날짜는 등록할 수 없습니다.`, 'error');
      return;
    }
  }

  // ── 법정 한도 초과 검사 (기간 제한이 있는 결근 사유) ──
  if (type === 'absent') {
    const LIMITS = {
      maternity_paid:   { max: 90,  label: '출산휴가(유급)', combineWith: ['maternity_unpaid'] },
      maternity_unpaid: { max: 90,  label: '출산휴가(무급)', combineWith: ['maternity_paid'] },
      paternity_paid:   { max: 10,  label: '배우자출산휴가' },
      childcare_leave:  { max: 365, label: '육아휴직' },
      family_care:      { max: 90,  label: '가족돌봄휴직', perYear: true },
      menstrual:        { max: 1,   label: '생리휴가', perPayPeriod: true },
    };
    const limit = LIMITS[absentType];
    if (limit) {
      // 전체 ledger에서 해당 유형(+결합유형)의 누적 사용일수 집계
      const checkTypes = [absentType, ...(limit.combineWith || [])];
      // perPayPeriod: 추가하려는 날짜가 속한 급여 산정기간 경계 계산
      let _ppStart = '', _ppEnd = '';
      if (limit.perPayPeriod) {
        const _co = (allCompanies || []).find(c => c.id === _atlCompanyId);
        [_ppStart, _ppEnd] = _atlGetPayPeriod(dateFrom, _co);
      }
      let cumulativeDays = 0;
      _atlLedgerCache.filter(l => l.employee_id === empId).forEach(ledger => {
        let ledgerEntries = [];
        try { ledgerEntries = JSON.parse(ledger.month_data || '[]'); } catch(e) {}
        ledgerEntries.forEach(e => {
          if (e.type === 'absent' && checkTypes.includes(e.absentType)) {
            // perYear 한도: 해당 년도만 집계
            if (limit.perYear && ledger.year !== year) return;
            // perPayPeriod 한도: 급여 산정기간 내 날짜만 집계 (생리휴가)
            if (limit.perPayPeriod) {
              const entryDates = _atlExpandDateRange(e.date, e.dateTo || '');
              if (!entryDates.some(d => d >= _ppStart && d <= _ppEnd)) return;
            }
            cumulativeDays += _atlExpandDateRange(e.date, e.dateTo || '').length;
          }
        });
      });
      const newDays = allDates.length;
      const totalAfterAdd = cumulativeDays + newDays;
      if (totalAfterAdd > limit.max) {
        const exceeded = totalAfterAdd - limit.max;
        if(typeof toast==='function') toast(`${limit.label} 법정 한도 ${limit.max}일을 초과합니다. (누적 ${cumulativeDays}일 + 추가 ${newDays}일 = ${totalAfterAdd}일, ${exceeded}일 초과)`, 'error');
        return;
      }
    }
  }

  // 새 항목 추가
  const newEntry = { date: dateFrom, type: type };
  if (type === 'absent') {
    newEntry.absentType = absentType;
    newEntry.rate = absentType === 'sick_paid' ? _atlGetSickLeaveRate() : 0;
    if (dateTo && dateTo !== dateFrom) newEntry.dateTo = dateTo;
  } else if (type === 'late' || type === 'earlyleave') {
    newEntry.time = time;
  }
  entries.push(newEntry);
  entries.sort((a,b) => (a.date||'').localeCompare(b.date||''));

  // 집계 재계산
  let totalAbsent = 0, totalLate = 0, totalEarly = 0;
  entries.forEach(e => {
    if (e.type === 'absent') { totalAbsent += _atlExpandDateRange(e.date, e.dateTo || '').length; }
    else if (e.type === 'late') { totalLate++; }
    else if (e.type === 'earlyleave') { totalEarly++; }
  });

  const now = Date.now();
  const emp = (allEmployees || []).find(e => e.id === empId) || {};

  if (existingLedger) {
    // UPDATE
    const patch = {
      month_data: JSON.stringify(entries),
      total_absent_days: totalAbsent,
      total_late_count: totalLate,
      total_earlyleave_count: totalEarly,
      updated_at: now,
    };
    try {
      const res = await fetch('../tables/attendance_ledger/' + existingLedger.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      Object.assign(existingLedger, patch);
      if(typeof toast==='function') toast('근태 기록이 추가되었습니다.', 'success');
    } catch(e) { if(typeof toast==='function') toast('저장 실패: ' + e.message, 'error'); return; }
  } else {
    // CREATE
    const newId = crypto.randomUUID ? crypto.randomUUID() : 'atl_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    const body = {
      id: newId,
      employee_id: empId,
      company_id: _atlCompanyId,
      year: year,
      month_data: JSON.stringify(entries),
      total_absent_days: totalAbsent,
      total_late_count: totalLate,
      total_earlyleave_count: totalEarly,
      created_at: now,
      updated_at: now,
      status: 'active',
    };
    try {
      const res = await fetch('../tables/attendance_ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _atlLedgerCache.push(body);
      if(typeof toast==='function') toast('근태 기록이 추가되었습니다.', 'success');
    } catch(e) { if(typeof toast==='function') toast('저장 실패: ' + e.message, 'error'); return; }
  }

  // UI 초기화 및 갱신
  dateFromEl.value = ''; if (dateToEl) dateToEl.value = ''; if (timeEl) timeEl.value = '';
  atlRenderLedgerEntries(empId); atlRenderTable();
}

function _atlExpandDateRange(from, to) {
  if (!from) return [];
  if (!to || to === from) return [from];
  const dates = [];
  const start = new Date(from), end = new Date(to);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [from];
  const cur = new Date(start);
  while (cur <= end) { dates.push(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate() + 1); }
  return dates;
}

/**
 * 특정 날짜가 속한 급여 산정기간의 시작일·종료일을 반환한다.
 * 고객사 pay_period_day 설정 기준으로 날짜 그룹 경계를 계산.
 * (당월/전월 구분은 payroll labeling용이며, 날짜 그룹핑에는 영향 없음)
 * @param {string} dateStr - YYYY-MM-DD
 * @param {object} company - { pay_period_day }
 * @returns {[string, string]} [periodStart, periodEnd]
 */
function _atlGetPayPeriod(dateStr, company) {
  const ppDay = parseInt(company?.pay_period_day) || 1;
  const [y, m, d] = dateStr.split('-').map(Number);

  // 날짜가 pay_day 이전이면 전월에 시작된 산정기간에 속함
  // 예: pay_day=21, 7/15 → 6/21~7/20 기간
  let refY = y, refM = m;
  if (d < ppDay) {
    refM = m - 1;
    if (refM <= 0) { refM += 12; refY--; }
  }

  const startStr = `${refY}-${String(refM).padStart(2,'0')}-${String(ppDay).padStart(2,'0')}`;
  const endDate = new Date(refY, refM - 1, ppDay);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(endDate.getDate() - 1);
  const endStr = fmtLocalDate(endDate);

  return [startStr, endStr];
}

async function atlDeleteEntry(empId, idx, date, type) {
  if (!confirm(date + ' ' + (type==='absent'?'결근':type==='late'?'지각':'조퇴') + ' 기록을 삭제하시겠습니까?')) return;

  const year = parseInt((date || '').split('-')[0]) || _atlRefYear;
  const ledger = _atlLedgerCache.find(l => l.employee_id === empId && l.year === year);
  if (!ledger) { if(typeof toast==='function') toast('근태 데이터를 찾을 수 없습니다.', 'error'); return; }

  let entries = [];
  try { entries = JSON.parse(ledger.month_data || '[]'); } catch(e) { entries = []; }
  if (idx < 0 || idx >= entries.length) { if(typeof toast==='function') toast('항목을 찾을 수 없습니다.', 'error'); return; }

  entries.splice(idx, 1);

  // 집계 재계산
  let totalAbsent = 0, totalLate = 0, totalEarly = 0;
  entries.forEach(e => {
    if (e.type === 'absent') { totalAbsent += _atlExpandDateRange(e.date, e.dateTo || '').length; }
    else if (e.type === 'late') { totalLate++; }
    else if (e.type === 'earlyleave') { totalEarly++; }
  });

  const patch = {
    month_data: JSON.stringify(entries),
    total_absent_days: totalAbsent,
    total_late_count: totalLate,
    total_earlyleave_count: totalEarly,
    updated_at: Date.now(),
  };

  try {
    const res = await fetch('../tables/attendance_ledger/' + ledger.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    Object.assign(ledger, patch);
    if(typeof toast==='function') toast('삭제되었습니다.', 'success');
    atlRenderLedgerEntries(empId); atlRenderTable();
  } catch(e) { if(typeof toast==='function') toast('삭제 실패: ' + e.message, 'error'); }
}

function atlCloseLedgerModal() {
  document.getElementById('atl-ledger-modal').classList.remove('open');
}

function atlSaveAndClose(){
  if(typeof atlRenderTable === 'function') atlRenderTable();
  atlCloseLedgerModal();
  if(typeof _updatePIAttendanceSummary === 'function') _updatePIAttendanceSummary();
}
