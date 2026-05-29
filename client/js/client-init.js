// period-nav 없음 처리
document.getElementById('period-nav') && (document.getElementById('period-nav').style.display='none');

// ══════════════════════════════════════════════════════════════
// 퇴직금 관리 (고객사 앱)
// ══════════════════════════════════════════════════════════════

function switchClientSevTab(tab){
  _clientSevTab = tab;
  const hBtn = document.getElementById('sev-tab-btn-history');
  const sBtn = document.getElementById('sev-tab-btn-status');
  const hPane = document.getElementById('sev-client-history');
  const sPane = document.getElementById('sev-client-status');
  const activeStyle = 'color:#f59e0b;border-bottom:2px solid #f59e0b;font-weight:700;';
  const inactiveStyle = 'color:#9ca3af;border-bottom:2px solid transparent;font-weight:600;';
  if(tab === 'history'){
    if(hBtn){ hBtn.style.cssText += activeStyle; }
    if(sBtn){ sBtn.style.cssText += inactiveStyle; }
    if(hPane) hPane.style.display = '';
    if(sPane) sPane.style.display = 'none';
    renderClientSevHistory();
  } else {
    if(sBtn){ sBtn.style.cssText += activeStyle; }
    if(hBtn){ hBtn.style.cssText += inactiveStyle; }
    if(sPane) sPane.style.display = '';
    if(hPane) hPane.style.display = 'none';
    renderClientSevStatus();
  }
}

function renderClientSeverance(){
  switchClientSevTab(_clientSevTab);
}

// 퇴직급여 계산 헬퍼
function _clientCalcTenure(start, end){
  if(!start) return {totalDays:0, text:'0일', years:0};
  const s = new Date(start), e = new Date(end || new Date());
  const days = Math.max(0, Math.floor((e - s) / 86400000));
  const yy = Math.floor(days / 365);
  const mm = Math.floor((days % 365) / 30);
  const dd = days % 30;
  let text = '';
  if(yy > 0) text += yy + '년 ';
  if(mm > 0) text += mm + '개월 ';
  text += dd + '일';
  return { totalDays: days, text: text.trim() || '0일', years: yy };
}

function _clientGetPrev3(empId, baseDate){
  const base = new Date(baseDate || new Date());
  const months = [];
  for(let i = 1; i <= 3; i++){
    const t = new Date(base.getFullYear(), base.getMonth() - i, 1);
    months.push({ y: t.getFullYear(), m: t.getMonth() + 1 });
  }
  return allPayrolls.filter(p =>
    p.employee_id === empId &&
    months.some(mo => Number(p.pay_year) === mo.y && Number(p.pay_month) === mo.m)
  );
}

function _clientCalcSev(empId, hireDate, baseDate, pays3){
  const tenure = _clientCalcTenure(hireDate, baseDate);
  if(tenure.totalDays < 365) return { amount: 0, tenure, under1yr: true, ordinary3: 0 };
  const base = new Date(baseDate || new Date());
  let calDays = 0;
  for(let i = 1; i <= 3; i++){
    const t = new Date(base.getFullYear(), base.getMonth() - i + 1, 0);
    calDays += t.getDate();
  }
  const ordinary3 = pays3.reduce((s, p) =>
    s + (p.base_salary||0) + (p.weekly_holiday_pay||0) + (p.position_allowance||0), 0);
  const average3  = pays3.reduce((s, p) => s + (p.gross_pay||0), 0);
  const dailyOrd  = calDays > 0 ? (ordinary3 / calDays) * 30 : 0;
  const dailyAvg  = calDays > 0 ? (average3  / calDays) * 30 : 0;
  const daily1    = Math.max(dailyOrd, dailyAvg);
  const amount    = Math.round(daily1 * (tenure.totalDays / 365));
  return { amount, tenure, under1yr: false, ordinary3, daily1 };
}

// ── 지급 발생 이력 탭 ──
function renderClientSevHistory(){
  const list = document.getElementById('sev-history-list');
  if(!list || !currentCompany) return;
  const coId = currentCompany.id;
  const today = new Date().toISOString().slice(0, 10);

  const resignedEmps = allEmployees.filter(e => {
    if(e.company_id !== coId) return false;
    if(e.employment_category === '일용직') return false;
    // 직원 status 우선: 퇴직/resigned
    if(e.status === '퇴직' || e.status === 'resigned') return true;
    // 직원 status가 재직이면 제외 (퇴직급여 미발생)
    if(e.status === '재직' || e.status === 'active') return false;
    // status 없는 경우: 마지막 계약으로 판단
    const conts = allContracts.filter(c => c.employee_id === e.id && !c.is_draft)
      .sort((a,b) => (a.contract_start||'').localeCompare(b.contract_start||''));
    const last = conts[conts.length - 1];
    if(!last) return false;
    return last.status === '해지' || last.status === '만료' ||
           last.status === 'expired' || last.status === 'terminated';
  });

  if(!resignedEmps.length){
    list.innerHTML = `<div style="text-align:center;padding:48px 20px;color:#9ca3af;">
      <i class="fas fa-inbox" style="font-size:36px;margin-bottom:12px;display:block;"></i>
      <div style="font-size:14px;font-weight:600;">지급 발생 이력이 없습니다</div>
      <div style="font-size:12px;margin-top:4px;">퇴직·만료된 근로자가 없습니다.</div>
    </div>`;
    return;
  }

  list.innerHTML = resignedEmps.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).map(emp => {
    const conts = allContracts.filter(c => c.employee_id === emp.id && !c.is_draft)
      .sort((a,b) => (a.contract_start||'').localeCompare(b.contract_start||''));
    const lastC = conts[conts.length - 1];
    const firstC = conts[0];
    const hireDate = firstC?.contract_start || emp.hire_date || '';
    const resignDate = lastC?.contract_end || emp.resign_date || today;
    const pays3 = _clientGetPrev3(emp.id, resignDate);
    const sev = _clientCalcSev(emp.id, hireDate, resignDate, pays3);
    const statusBadge = lastC?.status === '해지'
      ? `<span style="background:#fee2e2;color:#dc2626;padding:2px 7px;border-radius:12px;font-size:10px;font-weight:700;">해지</span>`
      : `<span style="background:#fef3c7;color:#b45309;padding:2px 7px;border-radius:12px;font-size:10px;font-weight:700;">만료</span>`;

    return `<div style="background:#fff;border-radius:14px;box-shadow:0 1px 8px rgba(0,0,0,.07);margin-bottom:10px;overflow:hidden;">
      <div style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:34px;height:34px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#92400e;">${(emp.name||'?').charAt(0)}</div>
            <div>
              <div style="font-size:14px;font-weight:800;color:#1a1a2e;">${emp.name||'-'}</div>
              <div style="font-size:11px;color:#6b7280;">${emp.department||''} ${emp.position||''} · ${emp.employment_category||'-'}</div>
            </div>
          </div>
          ${statusBadge}
        </div>
      </div>
      <div style="padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:#f9fafb;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#9ca3af;">입사일</div>
          <div style="font-size:12px;font-weight:600;color:#374151;">${hireDate||'-'}</div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#9ca3af;">퇴직·만료일</div>
          <div style="font-size:12px;font-weight:600;color:#374151;">${resignDate||'-'}</div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#9ca3af;">재직 기간</div>
          <div style="font-size:12px;font-weight:600;color:#374151;">${sev.tenure.text}</div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#9ca3af;">1일 평균임금</div>
          <div style="font-size:12px;font-weight:600;color:#374151;">${sev.under1yr ? '-' : (sev.daily1 ? Math.round(sev.daily1).toLocaleString()+'원' : '-')}</div>
        </div>
      </div>
      <div style="padding:0 16px 14px;">
        <div style="background:${sev.under1yr?'#f9fafb':'linear-gradient(135deg,#fffbeb,#fef3c7)'};border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:11px;color:#92400e;">퇴직금 추계</div>
            <div style="font-size:9.5px;color:#9ca3af;margin-top:1px;">${pays3.length ? '' : '급여 데이터 없음'}</div>
          </div>
          <div style="font-size:20px;font-weight:900;color:${sev.under1yr?'#9ca3af':'#b45309'};">
            ${sev.under1yr ? '1년 미만' : (sev.amount > 0 ? sev.amount.toLocaleString()+'원' : (pays3.length ? '-' : '급여 필요'))}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── 퇴직급여 추계 탭 ──
function renderClientSevStatus(){
  const list = document.getElementById('sev-status-list');
  const summaryCard = document.getElementById('sev-client-summary');
  if(!list || !currentCompany) return;
  const coId = currentCompany.id;
  const today = new Date().toISOString().slice(0, 10);

  const activeEmps = allEmployees.filter(e => {
    if(e.company_id !== coId) return false;
    if(e.employment_category === '일용직') return false;
    return e.status === 'active' || e.status === '재직' || !e.status || e.status === '';
  });

  if(!activeEmps.length){
    list.innerHTML = `<div style="text-align:center;padding:48px 20px;color:#9ca3af;"><i class="fas fa-users-slash" style="font-size:36px;margin-bottom:12px;display:block;"></i><div style="font-size:14px;font-weight:600;">재직 중인 근로자가 없습니다</div></div>`;
    if(summaryCard) summaryCard.style.display = 'none';
    return;
  }

  let totalSev = 0, cntTarget = 0, cntNodata = 0, cntUnder1 = 0;
  const cards = activeEmps.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).map(emp => {
    const conts = allContracts.filter(c => c.employee_id === emp.id && !c.is_draft)
      .sort((a,b) => (a.contract_start||'').localeCompare(b.contract_start||''));
    const hireDate = (conts[0]?.contract_start) || emp.hire_date || '';
    const pays3 = _clientGetPrev3(emp.id, today);
    const sev = _clientCalcSev(emp.id, hireDate, today, pays3);
    const tenure = _clientCalcTenure(hireDate, today);

    if(!sev.under1yr){ cntTarget++; totalSev += sev.amount || 0; }
    else cntUnder1++;
    if(!sev.under1yr && !pays3.length) cntNodata++;

    const amtColor = sev.under1yr ? '#9ca3af' : '#b45309';
    const bgGradient = sev.under1yr ? '#f9fafb' : 'linear-gradient(135deg,#fffbeb,#fef3c7)';

    return `<div style="background:#fff;border-radius:14px;box-shadow:0 1px 8px rgba(0,0,0,.07);overflow:hidden;">
      <div style="padding:12px 14px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#92400e;">${(emp.name||'?').charAt(0)}</div>
          <div>
            <div style="font-size:13px;font-weight:800;color:#1a1a2e;">${emp.name||'-'}</div>
            <div style="font-size:11px;color:#6b7280;">${emp.department||''} ${emp.position||''}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:#9ca3af;">재직 기간</div>
          <div style="font-size:11px;font-weight:600;color:#374151;">${tenure.text}</div>
        </div>
      </div>
      <div style="padding:10px 14px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div style="background:#f9fafb;border-radius:8px;padding:7px;">
            <div style="font-size:10px;color:#9ca3af;">입사일</div>
            <div style="font-size:11.5px;font-weight:600;color:#374151;">${hireDate||'-'}</div>
          </div>
          <div style="background:#f9fafb;border-radius:8px;padding:7px;">
            <div style="font-size:10px;color:#9ca3af;">3개월 평균임금</div>
            <div style="font-size:11.5px;font-weight:600;color:#374151;">${pays3.length && !sev.under1yr ? Math.round(sev.ordinary3/3).toLocaleString()+'원' : '-'}</div>
          </div>
        </div>
        <div style="background:${bgGradient};border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:11px;color:#92400e;font-weight:600;">퇴직급여 추계액</div>
          <div style="font-size:18px;font-weight:900;color:${amtColor};">
            ${sev.under1yr ? '<span style="font-size:12px;color:#9ca3af;">1년 미만</span>' : (pays3.length ? sev.amount.toLocaleString()+'원' : '<span style="font-size:11px;color:#9ca3af;">급여 데이터 없음</span>')}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  list.innerHTML = cards;

  if(summaryCard){
    summaryCard.style.display = '';
    const setT = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    setT('sev-client-cnt', cntTarget);
    setT('sev-client-nodata', cntNodata);
    setT('sev-client-under1', cntUnder1);
    const totalEl = document.getElementById('sev-client-total');
    if(totalEl) totalEl.textContent = totalSev.toLocaleString() + '원';
  }
}

// ══════════════════════════════════════════════════════════════
// 연차 관리 (고객사 앱)
// ══════════════════════════════════════════════════════════════

function renderClientAnnualLeave(){
  // 기준 연도 셀렉트 초기화
  const ySel = document.getElementById('al-client-year');
  if(ySel && !ySel.options.length){
    const cur = new Date().getFullYear();
    for(let y = cur; y >= cur - 4; y--){
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y + '년';
      if(y === cur) opt.selected = true;
      ySel.appendChild(opt);
    }
  }
  _doRenderClientAL();
}

function _doRenderClientAL(){
  const list = document.getElementById('al-client-list');
  if(!list || !currentCompany) return;
  const coId = currentCompany.id;
  const refYear = parseInt(document.getElementById('al-client-year')?.value) || new Date().getFullYear();
  const co = currentCompany;

  const emps = allEmployees.filter(e =>
    e.company_id === coId &&
    e.employment_category !== '일용직' &&
    (e.status === 'active' || e.status === '재직' || !e.status || e.status === '')
  ).sort((a,b) => (a.name||'').localeCompare(b.name||'','ko'));

  if(!emps.length){
    list.innerHTML = `<div style="text-align:center;padding:48px 20px;color:#9ca3af;"><i class="fas fa-users-slash" style="font-size:36px;margin-bottom:12px;display:block;"></i><div style="font-size:14px;font-weight:600;">재직 중인 직원이 없습니다</div></div>`;
    return;
  }

  const basis = co.annual_leave_basis || '회계년도 기준';

  const calcAL = (emp) => {
    const contract = allContracts.filter(c => c.employee_id === emp.id && !c.is_draft)
      .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))
      .find(c => c.status === '활성' || c.status === 'active') ||
      allContracts.filter(c => c.employee_id === emp.id && !c.is_draft)
        .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];
    if(!contract) return null;

    const hireDateStr = emp.hire_date || contract.contract_start || '';
    if(!hireDateStr) return null;
    const hire = new Date(hireDateStr);
    if(isNaN(hire)) return null;

    let baseDate;
    if(basis === '입사일 기준'){
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

    const usedDays = allPayrolls.filter(p => {
      if(p.employee_id !== emp.id) return false;
      if(basis === '입사일 기준'){
        const pDate = new Date(p.pay_year||0, (p.pay_month||1)-1, 1);
        const pStart = new Date(refYear-1, hire.getMonth(), hire.getDate());
        const pEnd   = new Date(refYear,   hire.getMonth(), hire.getDate());
        return pDate >= pStart && pDate < pEnd;
      }
      return p.pay_year == refYear;
    }).reduce((s,p) => s + (parseFloat(p.annual_leave_used)||0), 0);

    const remainDays = Math.max(0, totalDays - usedDays);

    const bs = parseFloat(contract.base_salary) || 0;
    const wh = parseFloat(contract.weekly_holiday_pay) || 0;
    const pa = parseFloat(contract.position_allowance) || 0;
    const stdMonthly = bs + wh + pa;
    const hourlyWage = stdMonthly > 0 ? Math.round(stdMonthly / 209) : 0;
    const workHours = parseFloat(contract.work_hours_per_day) || 8;
    const leavePay = Math.round(hourlyWage * workHours * remainDays);

    return { totalDays, usedDays, remainDays, leavePay, contract, basis };
  };

  let sumTotal = 0, sumUsed = 0, sumRemain = 0, sumPay = 0;
  const cards = emps.map(emp => {
    const al = calcAL(emp);
    if(!al) return '';
    sumTotal  += al.totalDays;
    sumUsed   += al.usedDays;
    sumRemain += al.remainDays;
    sumPay    += al.leavePay;

    const remainColor = al.remainDays <= 0 ? '#dc2626' : al.remainDays <= 3 ? '#d97706' : '#059669';
    const remainBg    = al.remainDays <= 0 ? '#fef2f2' : al.remainDays <= 3 ? '#fffbeb' : '#f0fdf4';

    return `<div style="background:#fff;border-radius:14px;box-shadow:0 1px 8px rgba(0,0,0,.07);overflow:hidden;">
      <div style="padding:12px 14px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:10px;">
        <div style="width:34px;height:34px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1.5px solid #a7f3d0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#065f46;">${(emp.name||'?').charAt(0)}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:800;color:#1a1a2e;">${emp.name||'-'}</div>
          <div style="font-size:11px;color:#6b7280;">${emp.department||''} ${emp.position||''} · ${emp.employment_category||'-'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:#9ca3af;">${al.basis}</div>
          <div style="font-size:11px;color:#374151;font-weight:600;">${emp.hire_date||'-'} 입사</div>
        </div>
      </div>
      <div style="padding:10px 14px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;">
          <div style="background:#ecfdf5;border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:10px;color:#059669;">총 발생</div>
            <div style="font-size:16px;font-weight:800;color:#065f46;">${al.totalDays}<span style="font-size:10px;">일</span></div>
          </div>
          <div style="background:#f9fafb;border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:10px;color:#6b7280;">사용</div>
            <div style="font-size:16px;font-weight:800;color:#374151;">${al.usedDays}<span style="font-size:10px;">일</span></div>
          </div>
          <div style="background:${remainBg};border-radius:8px;padding:8px;text-align:center;border:1px solid ${al.remainDays>0?'transparent':'#fecaca'};">
            <div style="font-size:10px;color:${remainColor};font-weight:600;">잔여</div>
            <div style="font-size:16px;font-weight:800;color:${remainColor};">${al.remainDays}<span style="font-size:10px;">일</span></div>
          </div>
        </div>
        ${al.leavePay > 0 ? `<div style="background:#faf5ff;border-radius:8px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:11px;color:#7c3aed;">잔여 연차 수당 추계</div>
          <div style="font-size:14px;font-weight:800;color:#5b21b6;">${al.leavePay.toLocaleString()}원</div>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');

  list.innerHTML = cards || `<div style="text-align:center;padding:40px;color:#9ca3af;">계약 데이터가 없습니다.</div>`;

  // 요약 카드 업데이트
  const setT = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  setT('al-client-total',  sumTotal + '일');
  setT('al-client-used',   sumUsed + '일');
  setT('al-client-remain', sumRemain + '일');
  const payEl = document.getElementById('al-client-pay');
  if(payEl) payEl.textContent = sumPay ? sumPay.toLocaleString() + '원' : '-';
}

// ═══════════════════════════════════════════════════════════════════════════════

// ── INIT ──
// period-nav 없음 처리
// (위에서 이미 처리됨)
