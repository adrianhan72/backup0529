// ═══════════════════════════════════════════════════════════════════════════════
// 고객사 앱 — 근태 기록 + 연차 사용 기록
// - 어드민과 동일한 테이블(attendance_ledger / annual_leave_ledger / payrolls) 사용
// - 어느 쪽에서 기록해도 서버 데이터가 즉시 갱신 → 양방향 반영 (양쪽 모두 재조회 시 동일)
// - 엔트리 스키마는 어드민(admin-billing/attendance-ledger.js · annual-leave.js)과 동일하게 유지
// ═══════════════════════════════════════════════════════════════════════════════

// ── 근태 상태 ──
let _clientAttLedgers = [];                 // attendance_ledger 캐시 (고객사 전체)
let _clientAttYear    = new Date().getFullYear();
let _clientAttEmpId   = '';                 // 편집 중 직원
let _clientAttRecordId= '';
let _clientAttEntries = [];                 // 작업 중 엔트리 (month_data 배열)

// ── 연차 상태 ──
let _clientLeaveLedgers  = [];              // annual_leave_ledger 캐시
let _clientLeaveEmpId    = '';
let _clientLeaveRecordId = '';
let _clientLeaveEntries  = [];              // [{date, days, note}]
let _clientLeaveYear     = new Date().getFullYear();
let _clientLeaveTotalDays= 0;               // 당해 발생 연차
let _clientLeaveDailyWage= 0;               // 통상임금 일급

const _cAttTypeLabel    = { absent:'결근', late:'지각', earlyleave:'조퇴', overtime:'추가근무' };
const _cAttTypeColor    = { absent:'#dc2626', late:'#d97706', earlyleave:'#4f46e5', overtime:'#059669' };
const _cAttTypeBg       = { absent:'#fef2f2', late:'#fff7ed', earlyleave:'#eef2ff', overtime:'#ecfdf5' };
const _cAttAbsentLabels = {
  unauthorized:'무단(무급)', sick_unpaid:'병가(무급)', sick_paid:'병가(유급)', industrial:'산재',
  menstrual:'생리휴가(무급)', maternity_paid:'출산(유급)', maternity_unpaid:'출산(무급)',
  paternity_paid:'배우자출산(유급)', childcare_leave:'육아휴직', family_care:'가족돌봄휴직',
  approved_unpaid:'사전승인 무급휴가', layoff_leave:'휴업(회사사정)'
};

/** 고객사 앱 공용 토스트 */
function _clientToast(msg, type){
  let el = document.getElementById('client-toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'client-toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 18px;border-radius:24px;font-size:12.5px;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:86%;text-align:center;transition:opacity .25s;pointer-events:none;';
    document.body.appendChild(el);
  }
  el.textContent = (type === 'error' ? '⚠️ ' : '✅ ') + msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

/** from ~ to 날짜 목록 확장 (YYYY-MM-DD) */
function _cExpandDateRange(from, to){
  const out = [];
  if(!from) return out;
  const f = new Date(from + 'T00:00:00');
  const t = to ? new Date(to + 'T00:00:00') : new Date(from + 'T00:00:00');
  if(isNaN(f) || isNaN(t)) return out;
  const cur = new Date(f);
  while(cur <= t){
    out.push(fmtLocalDate(cur));
    cur.setDate(cur.getDate() + 1);
    if(out.length > 400) break;
  }
  return out;
}

/** 해당 직원의 최초 계약 시작일 (이전 날짜 차단용) */
function _cEarliestContractStart(empId){
  const starts = (allContracts || [])
    .filter(c => c.employee_id === empId && !c.is_draft && !c.is_voided_by_amend)
    .map(c => c.contract_start).filter(Boolean).sort();
  return starts[0] || '';
}

/** 고객사 재직 직원 목록 (연차·근태 대상) */
function _cActiveEmployees(){
  return allEmployees.filter(e =>
    e.company_id === currentCompany.id &&
    (e.status === 'active' || !e.status || e.status === '')
  ).sort((a,b) => (a.name||'').localeCompare(b.name||'','ko'));
}

// ══════════════════════════════════════════════════════════════
// ① 근태 관리
// ══════════════════════════════════════════════════════════════

async function renderClientAttendance(){
  const ySel = document.getElementById('att-client-year');
  if(ySel && !ySel.options.length){
    const cur = new Date().getFullYear();
    for(let y = cur; y >= cur - 4; y--){
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y + '년';
      if(y === cur) opt.selected = true;
      ySel.appendChild(opt);
    }
  }
  _clientAttYear = parseInt(ySel?.value) || new Date().getFullYear();
  _clientAttEmpId = ''; _clientAttEntries = []; _clientAttRecordId = '';

  // 서버 최신 데이터 재조회 (어드민에서 기록된 내용 즉시 반영)
  try{
    const res = await fetch(`../tables/attendance_ledger?company_id=${encodeURIComponent(currentCompany.id)}&limit=500`);
    const jd  = await res.json();
    _clientAttLedgers = jd.data || [];
  }catch(e){ console.error('[근태] 조회 실패', e); }

  _renderClientAttList();
  _renderClientAttEditor();
}

function _renderClientAttList(){
  const list = document.getElementById('att-client-list');
  if(!list) return;
  const emps = _cActiveEmployees();
  if(!emps.length){
    list.innerHTML = `<div style="text-align:center;padding:48px 20px;color:#9ca3af;"><i class="fas fa-users-slash" style="font-size:36px;margin-bottom:12px;display:block;"></i><div style="font-size:14px;font-weight:600;">재직 중인 직원이 없습니다</div></div>`;
    return;
  }

  list.innerHTML = emps.map(emp => {
    const led = _clientAttLedgers.find(l => l.employee_id === emp.id && Number(l.year) === _clientAttYear);
    const absent = led ? (parseFloat(led.total_absent_days)||0) : 0;
    const late   = led ? (parseInt(led.total_late_count)||0) : 0;
    const early  = led ? (parseInt(led.total_earlyleave_count)||0) : 0;
    const isSel  = _clientAttEmpId === emp.id;
    return `<div style="background:#fff;border-radius:14px;box-shadow:0 1px 8px rgba(0,0,0,.07);overflow:hidden;${isSel?'border:1.5px solid #0ea5e9;':''}">
      <div style="padding:12px 14px;display:flex;align-items:center;gap:10px;">
        <div style="width:34px;height:34px;background:linear-gradient(135deg,#e0f2fe,#bae6fd);border:1.5px solid #7dd3fc;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#075985;">${(emp.name||'?').charAt(0)}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:800;color:#1a1a2e;">${emp.name||'-'}</div>
          <div style="font-size:11px;color:#6b7280;">${emp.department||''} ${emp.position||''} · ${contractTypeLabel_c(emp.employment_category)}</div>
        </div>
        <button class="btn btn-sm btn-danger" onclick="openClientAttEditor('${emp.id}')">근태 기록</button>
      </div>
      <div style="padding:8px 14px 12px;display:flex;gap:6px;flex-wrap:wrap;">
        <span style="font-size:10.5px;background:#fef2f2;color:#b91c1c;padding:3px 9px;border-radius:20px;">결근 ${absent}일</span>
        <span style="font-size:10.5px;background:#fff7ed;color:#c2410c;padding:3px 9px;border-radius:20px;">지각 ${late}회</span>
        <span style="font-size:10.5px;background:#eef2ff;color:#4338ca;padding:3px 9px;border-radius:20px;">조퇴 ${early}회</span>
        ${!led ? '<span style="font-size:10.5px;color:#9ca3af;padding:3px 6px;">기록 없음</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

function openClientAttEditor(empId){
  _clientAttEmpId = empId;
  const emp = allEmployees.find(e => e.id === empId);
  const led = _clientAttLedgers.find(l => l.employee_id === empId && Number(l.year) === _clientAttYear);
  _clientAttRecordId = led ? led.id : '';
  try{ _clientAttEntries = led ? JSON.parse(led.month_data || '[]') : []; }catch(e){ _clientAttEntries = []; }
  _clientAttEntries.sort((a,b) => (a.date||'').localeCompare(b.date||''));
  const title = document.getElementById('att-modal-title');
  if(title) title.innerHTML = `<i class="fas fa-clipboard-list" style="color:#0ea5e9;margin-right:6px;"></i>${emp?.name||''} · ${_clientAttYear}년 근태 기록`;
  document.getElementById('att-modal').classList.add('open');
  _renderClientAttEditor();
}

function _renderClientAttEditor(){
  const box = document.getElementById('att-modal-content');
  if(!box) return;
  const emp = allEmployees.find(e => e.id === _clientAttEmpId);
  if(!emp){ box.innerHTML = ''; return; }
  const entriesHtml = _clientAttEntries.length
    ? _clientAttEntries.map((e, i) => {
        let extra = '';
        if(e.type === 'absent'){
          const al = _cAttAbsentLabels[e.absentType] || e.absentType || '';
          const rateTxt = (e.absentType === 'sick_paid' && e.rate > 0) ? ' ' + e.rate + '%' : '';
          extra = `<span style="font-size:10px;color:#6b7280;background:#f3f4f6;padding:1px 6px;border-radius:10px;">${al}${rateTxt}</span>`;
        } else if(e.type === 'overtime'){
          extra = `<span style="font-size:10px;color:#6b7280;">${e.otStart||'-'}~${e.otEnd||'-'}</span>`;
        } else if(e.time){
          extra = `<span style="font-size:10px;color:#6b7280;">${e.time}</span>`;
        }
        const dTo = e.dateTo ? ` ~ ${e.dateTo}` : '';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;margin-bottom:5px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-weight:700;">${e.date||'-'}${dTo}</span>
            <span style="display:inline-block;background:${_cAttTypeBg[e.type]||'#f3f4f6'};color:${_cAttTypeColor[e.type]||'#374151'};padding:1px 8px;border-radius:10px;font-size:10.5px;font-weight:700;">${_cAttTypeLabel[e.type]||e.type}</span>
            ${extra}
          </div>
          <button class="btn btn-sm" onclick="removeClientAttEntry(${i})" title="삭제"><i class="fas fa-times"></i></button>
        </div>`;
      }).join('')
    : `<div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px;">등록된 근태 내역이 없습니다</div>`;

  box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
      <label style="font-size:11px;color:#6b7280;">시작일
        <input type="date" id="catt-new-date" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;box-sizing:border-box;margin-top:3px;" />
      </label>
      <label style="font-size:11px;color:#6b7280;">종료일 (1일이면 비움)
        <input type="date" id="catt-new-date-to" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;box-sizing:border-box;margin-top:3px;" />
      </label>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
      <label style="font-size:11px;color:#6b7280;">유형
        <select id="catt-new-type" onchange="_cAttTypeChanged()" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;margin-top:3px;">
          <option value="absent">결근</option>
          <option value="late">지각</option>
          <option value="earlyleave">조퇴</option>
          <option value="overtime">추가근무</option>
        </select>
      </label>
      <label id="catt-absent-wrap" style="font-size:11px;color:#6b7280;">결근 사유
        <select id="catt-absent-type" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;margin-top:3px;">
          ${Object.entries(_cAttAbsentLabels).map(([k,v]) => `<option value="${k}" ${k==='unauthorized'?'selected':''}>${v}</option>`).join('')}
        </select>
      </label>
    </div>
    <div id="catt-time-wrap" style="display:none;grid-template-columns:1fr;gap:6px;margin-bottom:6px;">
      <label style="font-size:11px;color:#6b7280;">시간
        <input type="time" id="catt-new-time" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;box-sizing:border-box;margin-top:3px;" />
      </label>
    </div>
    <div id="catt-ot-wrap" style="display:none;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
      <label style="font-size:11px;color:#6b7280;">시작
        <input type="time" id="catt-ot-start" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;box-sizing:border-box;margin-top:3px;" />
      </label>
      <label style="font-size:11px;color:#6b7280;">종료
        <input type="time" id="catt-ot-end" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;box-sizing:border-box;margin-top:3px;" />
      </label>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:12px;">
      <button class="btn btn-warning" onclick="addClientAttEntry()" style="flex:1;"><i class="fas fa-plus"></i> 내역 추가</button>
    </div>
    <div style="max-height:220px;overflow-y:auto;">${entriesHtml}</div>
    <button class="btn btn-primary" id="catt-save-btn" onclick="saveClientAttendance()" style="width:100%;margin-top:12px;"><i class="fas fa-save"></i> 근태 기록 저장</button>
    <div style="margin-top:8px;font-size:10.5px;color:#9ca3af;text-align:center;">어드민 근태관리대장과 동일한 데이터에 저장됩니다.</div>
  `;
  _cAttTypeChanged();
}

function _cAttTypeChanged(){
  const type = document.getElementById('catt-new-type')?.value;
  const absentWrap = document.getElementById('catt-absent-wrap');
  const timeWrap   = document.getElementById('catt-time-wrap');
  const otWrap     = document.getElementById('catt-ot-wrap');
  if(absentWrap) absentWrap.style.display = type === 'absent' ? '' : 'none';
  if(timeWrap)   timeWrap.style.display   = (type === 'late' || type === 'earlyleave') ? 'grid' : 'none';
  if(otWrap)     otWrap.style.display     = type === 'overtime' ? 'grid' : 'none';
}

function closeClientAttEditor(){
  document.getElementById('att-modal')?.classList.remove('open');
  const box = document.getElementById('att-modal-content'); if(box) box.innerHTML = '';
  _clientAttEmpId = '';
  _clientAttEntries = [];
  _clientAttRecordId = '';
  // 닫기 시 목록 새로고침 → 저장 내용 즉시 반영 (2026-09-21)
  renderClientAttendance();
}

function addClientAttEntry(){
  const dateEl = document.getElementById('catt-new-date');
  const type   = document.getElementById('catt-new-type')?.value || 'absent';
  const dateFrom = dateEl?.value || '';
  if(!dateFrom){ _clientToast('시작일을 선택하세요.', 'error'); return; }
  const dateTo = document.getElementById('catt-new-date-to')?.value || '';

  // 계약 시작일 이전 차단 (어드민과 동일 규칙)
  const earliest = _cEarliestContractStart(_clientAttEmpId);
  if(earliest && dateFrom < earliest){ _clientToast(`근로계약 시작일(${earliest}) 이전 날짜는 등록할 수 없습니다.`, 'error'); return; }

  const dates = _cExpandDateRange(dateFrom, dateTo);
  const dups = dates.filter(d => _clientAttEntries.some(e => e.date === d));
  if(dups.length){ _clientToast('이미 등록된 날짜가 포함되어 있습니다: ' + dups.join(', '), 'error'); return; }

  const entry = { date: dateFrom, type };
  if(type === 'absent'){
    entry.absentType = document.getElementById('catt-absent-type')?.value || 'unauthorized';
    entry.rate = entry.absentType === 'sick_paid' ? 70 : 0;
    if(dateTo && dateTo !== dateFrom) entry.dateTo = dateTo;
  } else if(type === 'late' || type === 'earlyleave'){
    entry.time = document.getElementById('catt-new-time')?.value || '';
  } else if(type === 'overtime'){
    const s = document.getElementById('catt-ot-start')?.value || '';
    const e = document.getElementById('catt-ot-end')?.value || '';
    if(!s || !e){ _clientToast('추가근무 시작·종료 시간을 입력하세요.', 'error'); return; }
    if(e <= s){ _clientToast('종료 시간은 시작 시간보다 늦어야 합니다.', 'error'); return; }
    entry.otStart = s; entry.otEnd = e;
  }
  _clientAttEntries.push(entry);
  _clientAttEntries.sort((a,b) => (a.date||'').localeCompare(b.date||''));
  dateEl.value = '';
  const toEl = document.getElementById('catt-new-date-to'); if(toEl) toEl.value = '';
  ['catt-new-time','catt-ot-start','catt-ot-end'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  _renderClientAttEditor();
}

function removeClientAttEntry(idx){
  _clientAttEntries.splice(idx, 1);
  _renderClientAttEditor();
}

async function saveClientAttendance(){
  const btn = document.getElementById('catt-save-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }
  try{
    let totalAbsent = 0, totalLate = 0, totalEarly = 0;
    _clientAttEntries.forEach(e => {
      if(e.type === 'absent') totalAbsent += _cExpandDateRange(e.date, e.dateTo || '').length;
      else if(e.type === 'late') totalLate++;
      else if(e.type === 'earlyleave') totalEarly++;
    });

    const now = Date.now();
    let res;
    if(_clientAttRecordId){
      res = await fetch('../tables/attendance_ledger/' + _clientAttRecordId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month_data: JSON.stringify(_clientAttEntries),
          total_absent_days: totalAbsent,
          total_late_count: totalLate,
          total_earlyleave_count: totalEarly,
          updated_at: now,
        }),
      });
    } else {
      res = await fetch('../tables/attendance_ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: (crypto.randomUUID ? crypto.randomUUID() : 'catt_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)),
          employee_id: _clientAttEmpId,
          company_id: currentCompany.id,
          year: _clientAttYear,
          month_data: JSON.stringify(_clientAttEntries),
          total_absent_days: totalAbsent,
          total_late_count: totalLate,
          total_earlyleave_count: totalEarly,
          created_at: now,
          updated_at: now,
          status: 'active',
        }),
      });
    }
    if(!res.ok) throw new Error('HTTP ' + res.status);
    // 최신 데이터 재조회 → 목록·요약 즉시 갱신 (양방향 반영)
    const fresh = await fetch(`../tables/attendance_ledger?company_id=${encodeURIComponent(currentCompany.id)}&limit=500`);
    const jd = await fresh.json();
    _clientAttLedgers = jd.data || [];
    _clientAttRecordId = _clientAttLedgers.find(l => l.employee_id === _clientAttEmpId && Number(l.year) === _clientAttYear)?.id || '';
    _renderClientAttList();
    _renderClientAttEditor();
    _clientToast('근태 기록이 저장되었습니다.', 'success');
  }catch(e){
    console.error('[근태저장]', e);
    _clientToast('저장 실패: ' + e.message, 'error');
  }finally{
    if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> 근태 기록 저장'; }
  }
}

// ══════════════════════════════════════════════════════════════
// ② 연차 사용 기록
// ══════════════════════════════════════════════════════════════

/** 연차 발생·통상임금 산출 (renderClientAnnualLeave calcAL과 동일 규칙) */
function _clientCalcAL(emp, refYear){
  const co = currentCompany;
  const basis = co.annual_leave_basis || 'fiscal_year';
  const contract = allContracts.filter(c => c.employee_id === emp.id && !c.is_draft)
    .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))
    .find(c => _normContractStatus(c.status) === CONTRACT_STATUS.ACTIVE) ||
    allContracts.filter(c => c.employee_id === emp.id && !c.is_draft)
      .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];
  if(!contract) return null;

  const hireDateStr = emp.hire_date || contract.contract_start || '';
  if(!hireDateStr) return null;
  const hire = new Date(hireDateStr + 'T00:00:00');
  if(isNaN(hire)) return null;

  let baseDate;
  if(basis === 'hire_date'){
    baseDate = new Date(refYear, hire.getMonth(), hire.getDate());
    const today = new Date(); today.setHours(0,0,0,0);
    if(baseDate > today) baseDate = new Date(refYear - 1, hire.getMonth(), hire.getDate());
  } else {
    baseDate = new Date(refYear, 0, 1);
  }
  if(baseDate < hire) return null;

  const diffMs = baseDate - hire;
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = (baseDate.getFullYear() - hire.getFullYear()) * 12 + (baseDate.getMonth() - hire.getMonth());
  const diffYears = diffDays / 365.25;

  let totalDays = 0;
  if(diffYears < 1){
    totalDays = Math.min(Math.max(0, diffMonths), 11);
  } else {
    const fullYears = Math.floor(diffYears);
    const bonus = fullYears >= 3 ? Math.floor((fullYears - 1) / 2) : 0;
    totalDays = Math.min(15 + bonus, 25);
  }

  const bs = parseFloat(contract.base_salary) || 0;
  const wh = parseFloat(contract.weekly_holiday_pay) || 0;
  const pa = parseFloat(contract.position_allowance) || 0;
  const stdMonthly = bs + wh + pa;
  const hourlyWage = stdMonthly > 0 ? Math.round(stdMonthly / 209) : 0;
  const workHours = parseFloat(contract.work_hours_per_day) || 8;
  const dailyWage = Math.round(hourlyWage * workHours);

  return { totalDays, dailyWage, hourlyWage, workHours, contract, basis, hireDateStr };
}

/** 연차 사용 기록 모달 열기 (직원 카드의 '연차 사용 기록' 버튼) */
async function openClientLeaveEditor(empId){
  _clientLeaveEmpId = empId;
  _clientLeaveYear = parseInt(document.getElementById('al-client-year')?.value) || new Date().getFullYear();
  const emp = allEmployees.find(e => e.id === empId);

  // 서버 최신 데이터 재조회 (어드민에서 기록된 내용 즉시 반영)
  try{
    const res = await fetch(`../tables/annual_leave_ledger?company_id=${encodeURIComponent(currentCompany.id)}&limit=500`);
    const jd  = await res.json();
    _clientLeaveLedgers = jd.data || [];
  }catch(e){ console.error('[연차기록] 조회 실패', e); }

  _loadClientLeaveEntries();
  const title = document.getElementById('alc-modal-title');
  if(title) title.innerHTML = `<i class="fas fa-pen" style="color:#059669;margin-right:6px;"></i>${emp?.name||''} · ${_clientLeaveYear}년 연차 사용 기록`;
  document.getElementById('alc-modal').classList.add('open');
  _renderClientLeaveModal();
}

/** 연차 사용 기록 모달 콘텐츠 렌더링 */
function _renderClientLeaveModal(){
  const box = document.getElementById('alc-modal-content');
  if(!box) return;
  box.innerHTML = `
    <div id="alc-info" style="margin:4px 0 10px;font-size:11px;color:#6b7280;background:#f9fafb;border-radius:8px;padding:8px 10px;line-height:1.7;"></div>
    <div style="display:grid;grid-template-columns:1fr 90px 1fr;gap:6px;margin-bottom:8px;align-items:end;">
      <label style="font-size:11px;color:#6b7280;">사용일
        <input type="date" id="alc-new-date" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;box-sizing:border-box;margin-top:3px;" />
      </label>
      <label style="font-size:11px;color:#6b7280;">일수
        <select id="alc-new-days" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 6px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;margin-top:3px;">
          <option value="1">1일</option>
          <option value="0.5">0.5일</option>
        </select>
      </label>
      <button class="btn btn-warning" onclick="addClientLeaveEntry()" style="height:34px;"><i class="fas fa-plus"></i> 추가</button>
    </div>
    <div id="alc-entries" style="max-height:220px;overflow-y:auto;margin-bottom:10px;"></div>
    <label style="font-size:11px;color:#6b7280;">이월 연차 (일)
      <input type="number" id="alc-carryover" step="0.5" min="0" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 8px;font-size:12.5px;font-family:inherit;color:#1a1a2e;background:#fff;box-sizing:border-box;margin-top:3px;" />
    </label>
    <button class="btn btn-primary" id="alc-save-btn" onclick="saveClientLeaveLedger()" style="width:100%;margin-top:10px;"><i class="fas fa-save"></i> 연차 기록 저장</button>
    <div style="margin-top:8px;font-size:10.5px;color:#9ca3af;text-align:center;">저장 시 해당 월 급여의 연차수당(사용일수)에도 자동 반영됩니다.</div>
  `;
  // 이월 연차 입력값 복원 (기존 저장 레코드 기준)
  const _rec = _clientLeaveLedgers.find(r => r.employee_id === _clientLeaveEmpId && Number(r.year) === _clientLeaveYear);
  const _carryEl = document.getElementById('alc-carryover');
  if(_carryEl) _carryEl.value = _rec ? (parseFloat(_rec.carryover_days)||0) : 0;
  _renderClientLeaveEntries();
  _renderClientLeaveInfo();
}

/** 연차 기록 모달 닫기 → 요약 카드 새로고침 (2026-09-21) */
function closeClientLeaveEditor(){
  document.getElementById('alc-modal')?.classList.remove('open');
  const box = document.getElementById('alc-modal-content'); if(box) box.innerHTML = '';
  _clientLeaveEmpId = '';
  _clientLeaveEntries = [];
  _clientLeaveRecordId = '';
  // 닫기 시 요약 새로고침 → 저장 내용 즉시 반영
  if(typeof renderClientAnnualLeave === 'function') renderClientAnnualLeave();
}

function _loadClientLeaveEntries(){
  _clientLeaveEntries = [];
  const rec = _clientLeaveLedgers.find(r => r.employee_id === _clientLeaveEmpId && Number(r.year) === _clientLeaveYear);
  _clientLeaveRecordId = rec ? rec.id : '';
  if(!rec) return;
  try{
    const md = JSON.parse(rec.month_data || '[]');
    md.forEach(m => {
      const month = m.month;
      const datesStr = (m.dates || '').trim();
      if(datesStr){
        datesStr.split(/[,，、]/).forEach(p => {
          p = p.trim().replace(/일/g,'').trim();
          if(!p) return;
          if(p.includes('~')){
            const [from, to] = p.split('~').map(s => parseInt(s));
            if(from && to){
              for(let d = from; d <= to; d++){
                _clientLeaveEntries.push({ date: `${_clientLeaveYear}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`, days: 1, note: m.note || '' });
              }
            }
          } else {
            const d = parseInt(p);
            if(d) _clientLeaveEntries.push({ date: `${_clientLeaveYear}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`, days: 1, note: m.note || '' });
          }
        });
      } else if(m.days > 0){
        _clientLeaveEntries.push({ date: `${_clientLeaveYear}-${String(month).padStart(2,'0')}-01`, days: m.days, note: m.note || '(월 합계)' });
      }
    });
  }catch(e){}
  _clientLeaveEntries.sort((a,b) => a.date.localeCompare(b.date));
}

function _clientLeaveEmpChanged(empId){
  _clientLeaveEmpId = empId;
  _loadClientLeaveEntries();
  _renderClientLeaveEntries();
  _renderClientLeaveInfo();
  const carryEl = document.getElementById('alc-carryover');
  const rec = _clientLeaveLedgers.find(r => r.employee_id === empId && Number(r.year) === _clientLeaveYear);
  if(carryEl) carryEl.value = rec ? (parseFloat(rec.carryover_days)||0) : 0;
}

function _renderClientLeaveEntries(){
  const box = document.getElementById('alc-entries');
  if(!box) return;
  if(!_clientLeaveEntries.length){
    box.innerHTML = `<div style="text-align:center;padding:14px;color:#9ca3af;font-size:11.5px;">등록된 연차 사용 내역이 없습니다</div>`;
    return;
  }
  box.innerHTML = _clientLeaveEntries.map((e, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;margin-bottom:4px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;">
      <span style="font-weight:700;color:#374151;">${e.date}${e.days !== 1 ? ` <span style="color:#059669;">(${e.days}일)</span>` : ''}</span>
      <button class="btn btn-sm" onclick="removeClientLeaveEntry(${i})" title="삭제"><i class="fas fa-times"></i></button>
    </div>`).join('');
}

function _renderClientLeaveInfo(){
  const box = document.getElementById('alc-info');
  if(!box) return;
  const emp = allEmployees.find(e => e.id === _clientLeaveEmpId);
  const al = emp ? _clientCalcAL(emp, _clientLeaveYear) : null;
  _clientLeaveTotalDays = al ? al.totalDays : 0;
  _clientLeaveDailyWage = al ? al.dailyWage : 0;
  const used = _clientLeaveEntries.reduce((s,e) => s + (e.days||0), 0);
  const rec = _clientLeaveLedgers.find(r => r.employee_id === _clientLeaveEmpId && Number(r.year) === _clientLeaveYear);
  const carry = parseFloat(document.getElementById('alc-carryover')?.value || (rec ? (parseFloat(rec.carryover_days)||0) : 0)) || 0;
  const remain = carry + _clientLeaveTotalDays - used;
  box.innerHTML = !al
    ? '계약 데이터가 없어 연차를 산정할 수 없습니다.'
    : `발생 연차 <b>${_clientLeaveTotalDays}일</b> · 이월 ${carry}일 · 사용 <b>${used}일</b> · 잔여 <b style="color:${remain<0?'#dc2626':remain===0?'#d97706':'#059669'};">${remain}일</b>${_clientLeaveDailyWage>0?` · 통상임금 ${_clientLeaveDailyWage.toLocaleString('ko-KR')}원/일`:''}`;
}

function addClientLeaveEntry(){
  const dateEl = document.getElementById('alc-new-date');
  const dateVal = dateEl?.value || '';
  const daysVal = parseFloat(document.getElementById('alc-new-days')?.value) || 1;
  if(!dateVal){ _clientToast('사용일 날짜를 선택하세요.', 'error'); return; }
  const entryYear = parseInt(dateVal.slice(0,4));
  if(entryYear !== _clientLeaveYear){ _clientToast(`${_clientLeaveYear}년 날짜만 등록할 수 있습니다.`, 'error'); return; }
  if(_clientLeaveEntries.some(e => e.date === dateVal)){ _clientToast('이미 등록된 날짜입니다.', 'error'); return; }
  const earliest = _cEarliestContractStart(_clientLeaveEmpId);
  if(earliest && dateVal < earliest){ _clientToast(`근로계약 시작일(${earliest}) 이전 날짜는 등록할 수 없습니다.`, 'error'); return; }
  _clientLeaveEntries.push({ date: dateVal, days: daysVal, note: '' });
  _clientLeaveEntries.sort((a,b) => a.date.localeCompare(b.date));
  dateEl.value = '';
  _renderClientLeaveEntries();
  _renderClientLeaveInfo();
}

function removeClientLeaveEntry(idx){
  _clientLeaveEntries.splice(idx, 1);
  _renderClientLeaveEntries();
  _renderClientLeaveInfo();
}

async function saveClientLeaveLedger(){
  const btn = document.getElementById('alc-save-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }
  try{
    const emp = allEmployees.find(e => e.id === _clientLeaveEmpId);
    const al  = emp ? _clientCalcAL(emp, _clientLeaveYear) : null;
    if(!al){ _clientToast('계약 데이터가 없어 저장할 수 없습니다.', 'error'); return; }

    // ── _clientLeaveEntries → month_data 변환 (어드민과 동일 포맷) ──
    const monthMap = {};
    _clientLeaveEntries.forEach(e => {
      const m = parseInt(e.date.slice(5,7));
      const d = parseInt(e.date.slice(8,10));
      if(!monthMap[m]) monthMap[m] = { days: 0, dates: [], notes: [] };
      monthMap[m].days += e.days || 0;
      monthMap[m].dates.push(d);
      if(e.note) monthMap[m].notes.push(e.note);
    });
    const monthData = [];
    let totalUsed = 0;
    for(let m = 1; m <= 12; m++){
      const md = monthMap[m];
      if(md){
        const sorted = [...new Set(md.dates)].sort((a,b)=>a-b);
        const ranges = [];
        let rs = sorted[0], re = sorted[0];
        for(let i = 1; i < sorted.length; i++){
          if(sorted[i] === re + 1){ re = sorted[i]; }
          else { ranges.push(rs === re ? `${rs}일` : `${rs}~${re}일`); rs = sorted[i]; re = sorted[i]; }
        }
        ranges.push(rs === re ? `${rs}일` : `${rs}~${re}일`);
        monthData.push({
          month: m,
          dates: ranges.join(', '),
          days: Math.round(md.days * 100) / 100,
          note: [...new Set(md.notes)].join('; ')
        });
        totalUsed += md.days;
      } else {
        monthData.push({ month: m, dates: '', days: 0, note: '' });
      }
    }

    // ── 기준일 / 산정기간 (어드민 openLeaveLedger와 동일 규칙) ──
    const basis = currentCompany.annual_leave_basis || 'fiscal_year';
    const hire = al.hireDateStr ? new Date(al.hireDateStr + 'T00:00:00') : null;
    const today = new Date(); today.setHours(0,0,0,0);
    let refDate, periodStart, periodEnd;
    if(basis === 'hire_date' && hire && !isNaN(hire)){
      const annivThis = new Date(_clientLeaveYear, hire.getMonth(), hire.getDate());
      refDate = annivThis <= today ? annivThis : new Date(_clientLeaveYear - 1, hire.getMonth(), hire.getDate());
      periodStart = fmtLocalDate(refDate);
      const pEnd = new Date(refDate); pEnd.setFullYear(pEnd.getFullYear() + 1); pEnd.setDate(pEnd.getDate() - 1);
      periodEnd = fmtLocalDate(pEnd);
      refDate = fmtLocalDate(refDate);
    } else {
      refDate = `${_clientLeaveYear}-01-01`;
      periodStart = `${_clientLeaveYear}-01-01`;
      periodEnd   = `${_clientLeaveYear}-12-31`;
    }

    const carryover = parseFloat(document.getElementById('alc-carryover')?.value) || 0;
    const remain    = carryover + _clientLeaveTotalDays - totalUsed;
    const leavePay  = Math.round(_clientLeaveDailyWage * remain);

    const payload = {
      employee_id        : _clientLeaveEmpId,
      company_id         : currentCompany.id,
      year               : _clientLeaveYear,
      contract_id        : al.contract?.id || '',
      status             : al.contract?.status || 'active',
      ref_date           : refDate,
      period_start       : periodStart,
      period_end         : periodEnd,
      total_days         : _clientLeaveTotalDays,
      carryover_days     : carryover,
      month_data         : JSON.stringify(monthData),
      total_used         : totalUsed,
      remain_days        : remain,
      ordinary_wage      : _clientLeaveDailyWage,
      leave_pay_estimate : leavePay,
    };

    let res;
    if(_clientLeaveRecordId){
      res = await fetch('../tables/annual_leave_ledger/' + _clientLeaveRecordId, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } else {
      res = await fetch('../tables/annual_leave_ledger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    }
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const saved = await res.json();
    _clientLeaveRecordId = saved.id;

    // ── 급여 payroll.annual_leave_used 동기화 (어드민 _syncLedgerToPayrolls와 동일 규칙) ──
    for(const { month, days } of monthData){
      const payroll = (allPayrolls || []).find(p =>
        p.employee_id === _clientLeaveEmpId && Number(p.pay_year) === Number(_clientLeaveYear) && Number(p.pay_month) === Number(month) && !p.is_draft
      ) || (allPayrolls || []).find(p =>
        p.employee_id === _clientLeaveEmpId && Number(p.pay_year) === Number(_clientLeaveYear) && Number(p.pay_month) === Number(month) && p.is_draft
      );
      if(!payroll) continue;
      const newVal = parseFloat(days) || 0;
      if(newVal === (parseFloat(payroll.annual_leave_used) || 0)) continue;
      try{
        await fetch('../tables/payrolls/' + payroll.id, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ annual_leave_used: newVal }),
        });
        payroll.annual_leave_used = newVal;
      }catch(e){ console.warn('[연차연동] payroll PATCH 실패', e); }
    }

    // ── 캐시·화면 갱신 ──
    const fresh = await fetch(`../tables/annual_leave_ledger?company_id=${encodeURIComponent(currentCompany.id)}&limit=500`);
    const jd = await fresh.json();
    _clientLeaveLedgers = jd.data || [];
    _loadClientLeaveEntries();
    _renderClientLeaveEntries();
    _renderClientLeaveInfo();
    if(typeof renderClientAnnualLeave === 'function') renderClientAnnualLeave(); // 요약 카드 갱신

    _clientToast('연차 기록이 저장되었습니다.', 'success');
  }catch(e){
    console.error('[연차저장]', e);
    _clientToast('저장 실패: ' + e.message, 'error');
  }finally{
    if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> 연차 기록 저장'; }
  }
}
