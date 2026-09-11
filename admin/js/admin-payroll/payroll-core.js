// ─── PAYROLLS ───
/**
 * 주휴수당이 지급총액(gross)에 실제 포함되어 있는지 판정 (2026-09-11)
 *  - 현행 산식(시급×209 기본급): 주휴는 기본급에 이미 포함 → weekly_holiday_pay는 참고값
 *  - 레거시(174h 분할 저장) 행: 주휴가 gross의 일부로 별도 지급 → 포함
 * 판정: 전체 지급 항목 합(주휴 포함)이 gross와 ±50원 이내면 주휴가 gross에 포함된 것으로 본다.
 */
function _payWeeklyInGross(p){
  const _sumCustom = (json) => {
    let v = [];
    try { v = typeof json === 'string' ? JSON.parse(json) : (json || []); } catch(e){ v = []; }
    if(!Array.isArray(v)) v = [];
    return v.reduce((s,x)=>s+(Number(x&&x.amount)||0),0);
  };
  const sumWith = (p.base_salary||0)+(p.weekly_holiday_pay||0)
    +(p.position_allowance||0)+(p.site_allowance||0)+(p.skill_allowance||0)+(p.license_allowance||0)
    +(p.hazard_allowance||0)+(p.remote_area_allowance||0)
    +(p.transportation_allowance||p.car_maintenance||0)+(p.self_driving_allowance||0)
    +(p.meal_allowance||0)+(p.regular_bonus||0)+(p.childcare_allowance||0)+(p.research_allowance||0)
    +(p.contract_etc_allowance||0)+(p.etc_allowance||0)+(p.other_pay||0)
    +(p.overtime_pay||0)+(p.night_pay||0)+(p.holiday_pay||0)
    +(p.annual_leave_pay||0)+(p.bonus_pay||0)+(p.performance_pay||0)
    +(p.actual_expense_pay||0)+(p.communication_pay||0)+(p.communication_allowance||0)
    +(p.fitness_allowance||0)+(p.self_dev_allowance||0)+(p.book_allowance||0)+(p.overseas_allowance||0)
    +(p.severance_interim_pay||0)
    +_sumCustom(p.custom_ordinary_values)+_sumCustom(p.custom_fixed_values)+_sumCustom(p.etc_allowance_items);
  return Math.abs(sumWith - (Number(p.gross_pay)||0)) <= 50;
}

function renderPayrolls(){
  if(!currentPayCompanyId) return;
  const yr=parseInt(document.getElementById('pay-year-filter')?.value)||0;
  const mo=parseInt(document.getElementById('pay-month-filter')?.value)||0;
  const q=(document.getElementById('pay-search')?.value||'').toLowerCase();
  let f=allPayrolls.filter(p=>{
    if(p.is_draft) return false; // ── 임시저장 레코드 제외 ──
    // 수습근로자 관리 OFF → 수습(정규직 수습·계약직 수습) 고용형태 제외
    if (!window._probationFeatureEnabled && typeof isProbationType === 'function') {
      const _emp = (allEmployees||[]).find(e => e.id === p.employee_id);
      if (_emp && isProbationType(_emp.employment_category)) return false;
    }
    if(String(p.company_id)!==String(currentPayCompanyId)) return false;
    if(yr && Number(p.pay_year)!==yr) return false;
    if(mo && Number(p.pay_month)!==mo) return false;
    if(q&&!getEmpName(p.employee_id).toLowerCase().includes(q)) return false;
    // 익월을 초과하는 미래 월은 제외 (당월 + 익월까지만 표시)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const limitYm = nextMonth.getFullYear() * 100 + (nextMonth.getMonth() + 1);
    if(Number(p.pay_year) * 100 + Number(p.pay_month) > limitYm) return false;
    // 정식 등록 계약(is_draft=false)이 없고 임시저장 계약만 있는 직원의 급여는 제외
    const hasRealContract = allContracts.some(c => c.employee_id === p.employee_id && !c.is_draft);
    if(!hasRealContract && allContracts.some(c => c.employee_id === p.employee_id && c.is_draft)) return false;
    return true;
  }).sort((a,b)=>getEmpName(a.employee_id).localeCompare(getEmpName(b.employee_id),'ko'));
  const paged=f.slice((pages.pay-1)*ITEMS,pages.pay*ITEMS);
  const tb=document.getElementById('pay-tbody');
  if(!f.length){tb.innerHTML='<tr><td colspan="12" class="cen-empty"><i class="fas fa-inbox"></i> 급여 내역이 없습니다</td></tr>';document.getElementById('pay-pagination').innerHTML='';return;}
  tb.innerHTML=paged.map(p=>{
    // ── 커스텀 항목 합산 ──
    const _sumCustomOrd = (() => { try { const v=typeof p.custom_ordinary_values==='string'?JSON.parse(p.custom_ordinary_values):(p.custom_ordinary_values||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(x.amount||0),0); } catch(e) { return 0; } })();
    const _sumCustomFixed = (() => { try { const v=typeof p.custom_fixed_values==='string'?JSON.parse(p.custom_fixed_values):(p.custom_fixed_values||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(x.amount||0),0); } catch(e) { return 0; } })();
    const _sumEtcItems = (() => { try { const v=typeof p.etc_allowance_items==='string'?JSON.parse(p.etc_allowance_items):(p.etc_allowance_items||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(x.amount||0),0); } catch(e) { return 0; } })();
    // 매월지급 소계: 기본급(주휴포함) + 각종 수당 (주휴는 gross에 포함된 경우에만 가산 — 2026-09-11)
    const monthlyTotal = (p.base_salary||0)+(p.position_allowance||0)
      +(p.site_allowance||0)+(p.skill_allowance||0)+(p.license_allowance||0)
      +(p.hazard_allowance||0)+(p.remote_area_allowance||0)
      +(p.transportation_allowance||p.car_maintenance||0)+(p.meal_allowance||0)
      +(p.regular_bonus||0)+(p.childcare_allowance||0)+(p.research_allowance||0)
      +(_sumCustomOrd||0)
      +(_payWeeklyInGross(p) ? (p.weekly_holiday_pay||0) : 0);
    // 추가근로수당 소계
    const extraTotal = (p.overtime_pay||0)+(p.night_pay||0)+(p.holiday_pay||0);
    // 비정기지급 소계
    const irregularTotal = (p.annual_leave_pay||0)+(p.bonus_pay||0)+(p.performance_pay||0)
      +(p.actual_expense_pay||0)+(p.communication_pay||0)+(p.fitness_allowance||0)
      +(p.self_dev_allowance||0)+(p.book_allowance||0)+(p.overseas_allowance||0)
      +(p.severance_interim_pay||0)+(p.etc_allowance||0)+(p.other_pay||0)
      +(_sumCustomFixed||0)+(_sumEtcItems||0);
    const payEmp = allEmployees.find(x=>x.id===p.employee_id)||{};
    const payCat = payEmp.employment_category||'-';
    return `<tr class="pay-tbody-row">
    <td class="pay-emp-name">${getEmpName(p.employee_id)}</td>
    <td class="pay-gender">${(()=>{const e=(allEmployees||[]).find(x=>x.id===p.employee_id);return genderLabel(e);})()}</td>
    <td><span class="badge ${empCatBadge(payCat)}">${contractTypeLabel(payCat)}</span></td>
    <td>${p.work_days||'-'}일</td>
    <td>${p.overtime_hours||0}h</td>
    <td class="amount-blue">${won2(p.gross_pay)}</td>
    <td class="pay-sub-monthly">${won2(monthlyTotal)}</td>
    <td class="pay-sub-extra">${won2(extraTotal)}</td>
    <td class="pay-sub-irregular">${won2(irregularTotal)}</td>
    <td class="amount-red">${won2(p.total_deduction)}</td>
    <td class="amount-green pay-net">${won2(p.net_pay)}</td>
    <td onclick="event.stopPropagation()" style="text-align:center;white-space:nowrap;"><button onclick="openPayslipModal('${p.id}')" class="btn btn-indigo btn-sm" style="padding:5px 10px;font-size:11.5px;"><i class="fas fa-file-alt" style="margin-right:3px;"></i>발송용 파일 미리보기</button> <button onclick="editPayroll('${p.id}')" class="btn btn-warning btn-sm" style="padding:5px 10px;font-size:11.5px;"><i class="fas fa-pen" style="margin-right:3px;"></i>급여 수정</button></td>
  </tr>`;
  }).join('');
  renderPagination('pay-pagination',f.length,pages.pay,'setPayPage');
}
function setPayPage(p){pages.pay=p;renderPayrolls()}

// ─── 급여명세서 모달 ───
function openPayslipModal(payrollId){
  const p = allPayrolls.find(x=>x.id===payrollId);
  if(!p) return;
  window._currentPayslipId = payrollId; // 수정 버튼에서 참조
  const e = allEmployees.find(x=>x.id===p.employee_id)||{};
  const co = allCompanies.find(x=>x.id===p.company_id)||{};

  // 수치 계산 (renderPayrolls와 동일 방어 로직)
  const gross   = p.gross_pay||0;
  const incTax  = p.income_tax||0;
  const locTax  = p.local_income_tax||0;
  const health  = p.health_insurance||0;
  const ltCare  = p.long_term_care||0;
  const pension = p.national_pension||0;
  const empIns  = p.employment_insurance||0;
  const yearEnd = p.year_end_tax_adjust||0;
  const hlAdj   = p.health_insurance_adjust||0;
  const advance = p.advance_deduction||0;
  const calcDed = incTax+locTax+health+ltCare+pension+empIns+yearEnd+hlAdj+advance;
  const rawDed  = p.total_deduction||calcDed;
  const totalDed= Math.abs(rawDed-calcDed)>50?calcDed:rawDed;
  const rawNet  = p.net_pay||(gross-totalDed);
  const netPay  = Math.abs(rawNet-(gross-totalDed))>50?(gross-totalDed):rawNet;

  const moStr = String(p.pay_month).padStart(2,'0');
  const payDate = p.pay_date || (co.pay_day?`${p.pay_year}-${moStr}-${String(co.pay_day).padStart(2,'0')}`:'');

  // ── 헤더 영역 채우기 ──
  document.getElementById('ps-subtitle').textContent  = `${p.pay_year}년 ${p.pay_month}월분 · ${co.company_name||''}`;
  document.getElementById('ps-company-name').textContent = co.company_name||'';
  document.getElementById('ps-period').textContent    = `${p.pay_year}년 ${moStr}월분 급여`;
  document.getElementById('ps-paydate').textContent   = payDate ? `지급일: ${payDate}` : '';

  // ── 인적사항 ──
  document.getElementById('ps-name').textContent       = e.name||'-';
  document.getElementById('ps-dept').textContent       = `${e.department||'-'} / ${e.position||'-'}`;
  document.getElementById('ps-empcat').textContent     = contractTypeLabel(e.employment_category) || '-';
  document.getElementById('ps-hiredate').textContent   = e.hire_date||'-';
  document.getElementById('ps-workdays').textContent   = p.work_days        ? `${p.work_days}일`            : '-';
  document.getElementById('ps-totalhours').textContent = p.total_work_hours ? `${p.total_work_hours}시간`   : '-';
  document.getElementById('ps-ot').textContent         = p.overtime_hours   ? `${p.overtime_hours}시간`     : '-';
  document.getElementById('ps-night').textContent      = p.night_hours      ? `${p.night_hours}시간`        : '-';
  document.getElementById('ps-hol').textContent        = p.holiday_hours    ? `${p.holiday_hours}시간`      : '-';
  document.getElementById('ps-paydate-cell').textContent = payDate || '-';

  // ── PDF 발송용 컨텍스트 저장 (sendPayslipPDF에서 로그 저장에 사용) ──
  window._currentPayslipPhone    = e.phone||e.mobile||'';
  window._currentPayslipEmail     = e.email||'';
  window._currentPayslipPayrollId = p.id;
  window._currentPayslipEmpId     = p.employee_id;
  window._currentPayslipCompanyId = p.company_id;
  window._currentPayslipYear      = p.pay_year;
  window._currentPayslipMonth     = p.pay_month;
  // 이메일 버튼 활성/비활성 갱신
  const emailBtns = document.querySelectorAll('.ps-email-btn');
  emailBtns.forEach(btn=>{
    if(e.email && e.email.trim()){
      btn.disabled = false;
      btn.title = e.email;
    } else {
      btn.disabled = true;
      btn.title = '이메일 정보 없음';
    }
  });

  // PDF 알림톡 버튼 활성/비활성 갱신 (전화번호 미등록 시 비활성)
  const _psPhone = (e.phone||e.mobile||'').trim();
  const kakaoBtns = document.querySelectorAll('#ps-send-btn-top, #ps-send-btn-bottom');
  kakaoBtns.forEach(btn=>{
    if(_psPhone){
      btn.disabled = false;
      btn.title = `PDF 알림톡 발송 (${_psPhone})`;
    } else {
      btn.disabled = true;
      btn.title = '전화번호 미등록 — 직원 정보에 전화번호를 먼저 등록하세요';
    }
  });

  const fmt  = v => (v||0).toLocaleString('ko-KR')+'원';
  const fmtZ = v => v ? fmt(v) : '—';   // 0원이면 '—' 표시

  // ── 지급 항목 (엑셀 명세서와 동일 구조: 매월지급 / 추가근로수당 / 부정기지급) ──
  const payTb = document.getElementById('ps-pay-items');
  const makePayRow = (label, val) => {
    const isZero = !val || val === 0;
    return `<tr class="ps-item-row${isZero?' ps-zero':''}">
      <td>${label}</td><td>${fmtZ(val)}</td>
    </tr>`;
  };
  const makeGroupRow = (label, isDed=false) =>
    `<tr class="${isDed?'ps-ded-group-row':'ps-group-row'}">
      <td colspan="2">${label}</td>
    </tr>`;

  // 지급유형 태그 생성 헬퍼
  const payTypeTag = (type) => type === 'daily'
    ? '<span class="pay-type-tag pay-type-tag-daily">출근일수</span>'
    : type === 'receipt'
    ? '<span class="pay-type-tag pay-type-tag-receipt">영수증 청구</span>'
    : '<span class="pay-type-tag pay-type-tag-monthly">정기지급</span>';
  const makePayRowType = (label, val, type) => {
    const isZero = !val || val === 0;
    return `<tr class="ps-item-row${isZero?' ps-zero':''}">
      <td>${label}${payTypeTag(type)}</td><td>${fmtZ(val)}</td>
    </tr>`;
  };
  // (payTb.innerHTML 은 수습 판정 이후 "지급항목 렌더링" 블록에서 처리)

  // ── 공제 항목 (엑셀 명세서와 동일 구조) ──
  const dedTb = document.getElementById('ps-ded-items');
  const makeDedRow = (label, val) => {
    const isZero = !val || val === 0;
    return `<tr class="ps-item-row${isZero?' ps-zero':''}">
      <td>${label}</td><td>${fmtZ(val)}</td>
    </tr>`;
  };
  // ── 정산 / 추가공제 본문 (전부 0이면 섹션 전체 숨김) ──
  const _hasSettlement = !!(yearEnd || hlAdj || advance);
  const _settleBody = _hasSettlement
    ? makeGroupRow('▸ 정산 / 추가공제', true) +
      makeDedRow('연말정산',             yearEnd) +
      makeDedRow('건강보험 정산',        hlAdj) +
      makeDedRow('기타(선지급) 공제',    advance)
    : '';

  dedTb.innerHTML =
    makeGroupRow('▸ 세금', true) +
    makeDedRow('소득세',              incTax) +
    makeDedRow('지방소득세 (주민세)',  locTax) +
    makeGroupRow('▸ 4대보험', true) +
    makeDedRow('건강보험',            health) +
    makeDedRow('장기요양보험',         ltCare) +
    makeDedRow('국민연금',             pension) +
    makeDedRow('고용보험',             empIns) +
    _settleBody;

  // ── 합계 ──
  document.getElementById('ps-gross').textContent     = fmt(gross);
  document.getElementById('ps-total-ded').textContent = fmt(totalDed);
  document.getElementById('ps-net').textContent       = fmt(netPay);

  // ── 근로시간 요약 바 ──
  const totalHours = p.total_work_hours || 0;
  const otHours    = p.overtime_hours   || 0;
  const nightHours = p.night_hours      || 0;
  const holHours   = p.holiday_hours    || 0;
  // (근로시간 요약 바 삭제로 인해 해당 DOM 참조 제거)

  // ── 계약 조회 (인적사항 그리드 임금 정보 + 계산방법 표 공용) ──
  // 1차: 지급월에 기간이 겹치는 유효 계약 탐색
  // 2차: 없으면 해당 직원의 가장 최근 계약(start 기준 내림차순)을 폴백으로 사용
  const _psYr = Number(p.pay_year), _psMo = Number(p.pay_month);
  const _psMonthStart = `${_psYr}-${String(_psMo).padStart(2,'0')}-01`;
  const _psMonthEnd   = fmtLocalDate(new Date(_psYr, _psMo, 0)); // 말일

  // 유효 계약 후보 (취소·파기·임시저장·개정무효 제외)
  const _empContracts = allContracts.filter(c => {
    if(c.employee_id !== e.id) return false;
    if(c.is_draft || c.is_voided_by_amend) return false;
    if([CONTRACT_STATUS.VOIDED].includes(c.status)) return false;
    return true;
  });

  // 1차: 지급월 기간 일치
  let ct = _empContracts.find(c => {
    const s  = c.contract_start || '';
    const ed = c.contract_end   || '';
    if(s && s > _psMonthEnd)    return false; // 시작일이 지급월 이후
    if(ed && ed < _psMonthStart) return false; // 종료일이 지급월 이전
    return true;
  }) || null;

  // 2차 폴백: 기간 일치하는 계약이 없으면 → 가장 최근 시작 계약 사용
  if(!ct && _empContracts.length > 0){
    ct = _empContracts.slice().sort((a,b) =>
      (b.contract_start||'').localeCompare(a.contract_start||'')
    )[0];
  }
  // ── 수습기간 판정 ──
  // 수습 조건: contract_type 이 수습 → probation_months 없어도 수습 계약으로 간주
  //   probation_months 있으면 수습기간 계산, 없으면 계약 전체 기간을 수습으로 처리
  const _probFeatureOn = window._probationFeatureEnabled === true;
  const _isProbContract = _probFeatureOn && ct && (ct.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION || ct.contract_type ===CONTRACT_TYPE.FIXED_PROBATION);
  let _inProbation = false;   // 이번 지급월이 수습기간 내인가
  let _probBaseSal  = 0;      // 수습 중 기본급 (= base_salary × pct/100)
  let _probHourly   = 0;      // 수습 중 통상시급
  let _probMonthly  = 0;      // 수습 중 월 급여 (= monthly_salary_agreed × pct/100)
  let _probEndStr   = '';     // 수습 종료일 (YYYY-MM-DD)
  let _probMonths   = 0;      // 수습 개월수 (0이면 미입력)

  if(_isProbContract){
    _probMonths = ct.probation_months ? Number(ct.probation_months) : 0;

    if(_probMonths > 0){
      // probation_months 있음 → 수습 종료일 계산
      const _probStartDate = new Date(ct.contract_start);
      const _probEndDate   = new Date(_probStartDate);
      _probEndDate.setMonth(_probEndDate.getMonth() + _probMonths);
      _probEndDate.setDate(_probEndDate.getDate() - 1);
      _probEndStr = _probEndDate.toISOString().slice(0,10);
      _inProbation = ct.contract_start <= _psMonthEnd && _probEndStr >= _psMonthStart;
    } else {
      // probation_months 미입력 → 계약 기간 전체를 수습으로 간주
      _probEndStr = ct.contract_end || '';
      _inProbation = true;  // 계약이 존재하는 한 수습 기간
    }

    if(_inProbation){
      const pct = ct.probation_pct ? Number(ct.probation_pct) : 100;
      // 수습 기준 기본급: base_salary × pct/100
      _probBaseSal = ct.base_salary ? Math.round(Number(ct.base_salary) * pct / 100) : 0;
      // 수습 기준 월 급여: monthly_salary_agreed × pct/100 (없으면 base_salary 기준)
      const agreedSal = ct.monthly_salary_agreed || ct.base_salary || 0;
      _probMonthly = agreedSal ? Math.round(agreedSal * pct / 100) : 0;
      // 수습 기준 시급: hourly_wage × pct/100 (필수값, 폴백 없음)
      if(ct.hourly_wage && Number(ct.hourly_wage) > 0){
        _probHourly = Math.round(Number(ct.hourly_wage) * pct / 100);
      }
    }
  }

  // hourly_wage / monthlySal — 수습기간 내이면 수습 기준값 사용
  // (계산방법 표 산출식, 공제 보수월액 등에 활용)
  const hourlyWage = _inProbation
    ? _probHourly
    : ct
      ? (ct.hourly_wage && Number(ct.hourly_wage) > 0
          ? Number(ct.hourly_wage) : 0)
      : 0;
  const monthlySal = _inProbation
    ? _probMonthly
    : ct ? (ct.monthly_salary_agreed || ct.base_salary || 0) : gross;

  // ── 지급 항목 렌더링 (수습 판정 이후 — _inProbation / _probBaseSal 참조 가능) ──
  // 수습 중이면 기본급 레이블에 '(수습)' 명시, 금액은 p.base_salary 우선 / 없으면 _probBaseSal 폴백
  const _baseSalLabel = _inProbation ? '기본급 (수습)' : '기본급';
  const _baseSalAmt   = (p.base_salary && p.base_salary > 0)
                          ? p.base_salary
                          : (_inProbation ? _probBaseSal : p.base_salary);
  // ── 커스텀 항목 행 생성 ──
  const _customOrdRows = (() => {
    const vals = (() => { try { return typeof p.custom_ordinary_values === 'string' ? JSON.parse(p.custom_ordinary_values) : (p.custom_ordinary_values || []); } catch(e) { return []; } })();
    return (Array.isArray(vals) ? vals : []).filter(v => v && v.amount > 0).map(v => makePayRow(v.name, v.amount)).join('');
  })();
  const _customFixedRows = (() => {
    const vals = (() => { try { return typeof p.custom_fixed_values === 'string' ? JSON.parse(p.custom_fixed_values) : (p.custom_fixed_values || []); } catch(e) { return []; } })();
    return (Array.isArray(vals) ? vals : []).filter(v => v && v.amount > 0).map(v => makePayRowType(v.name, v.amount, v.pay_type || 'fixed')).join('');
  })();
  const _etcAllowanceRows = (() => {
    const vals = (() => { try { return typeof p.etc_allowance_items === 'string' ? JSON.parse(p.etc_allowance_items) : (p.etc_allowance_items || []); } catch(e) { return []; } })();
    return (Array.isArray(vals) ? vals : []).filter(v => v && v.amount > 0).map(v => makePayRowType(v.name, v.amount, v.pay_type || 'daily')).join('');
  })();

  // null/0 항목은 렌더링에서 제외 (매월 지급 · 비정기 지급)
  const payRowIf = (label, val, type) => {
    if(!val || Number(val) === 0) return '';
    return type ? makePayRowType(label, val, type) : makePayRow(label, val);
  };

  // ── 매월 지급 본문 (null/0 항목 제외) ──
  // 주휴수당: 기본급(시급×209h)에 이미 포함된 정규직·계약직 및 참고값인 일용직은 지급 항목에서 제외.
  // gross에 실제 포함된 레거시(174h 분할) 행만 지급 항목으로 표시 (2026-09-11)
  const _weeklyCounted = _payWeeklyInGross(p);
  const _monthlyBody =
    payRowIf(_baseSalLabel,      _baseSalAmt) +
    (_weeklyCounted ? payRowIf('주휴수당', p.weekly_holiday_pay) : '') +
    payRowIf('직책수당',          p.position_allowance) +
    payRowIf('현장수당',          p.site_allowance) +
    payRowIf('교통비',        p.transportation_allowance||p.car_maintenance, p.transportation_pay_type||'fixed') +
    payRowIf('자가운전보조금',p.self_driving_allowance, p.self_driving_pay_type||'fixed') +
    payRowIf('벽지수당',      p.remote_area_allowance, p.remote_area_pay_type||'fixed') +
    payRowIf('식대',          p.meal_allowance, p.meal_pay_type||'fixed') +
    payRowIf('보육수당',          p.childcare_allowance) +
    payRowIf('연구활동비',        p.research_allowance) +
    payRowIf('기술수당',          p.skill_allowance) +
    payRowIf('면허수당',          p.license_allowance) +
    payRowIf('위험수당',          p.hazard_allowance) +
    _customOrdRows;

  // ── 비정기 지급 본문 (null/0 항목 제외) ──
  const _irregBody =
    payRowIf('연차수당',          p.annual_leave_pay) +
    payRowIf('정기 상여금',       p.bonus_pay) +
    payRowIf('비정기 성과급',     p.performance_pay) +
    payRowIf('실비변상적급여',    p.actual_expense_pay) +
    payRowIf('통신비',        p.communication_pay, p.communication_pay_type||'fixed') +
    payRowIf('체력증진비',    p.fitness_allowance, p.fitness_pay_type||'fixed') +
    payRowIf('자기계발비',    p.self_dev_allowance, p.self_dev_pay_type||'fixed') +
    payRowIf('도서지원비',    p.book_allowance, p.book_pay_type||'fixed') +
    payRowIf('해외근무수당',  p.overseas_allowance, p.overseas_pay_type||'fixed') +
    _customFixedRows +
    payRowIf('퇴직금 중간정산',   p.severance_interim_pay) +
    payRowIf('기타수당',          (p.etc_allowance||0)+(p.other_pay||0)) +
    _etcAllowanceRows;

  // ── 추가 근로수당 본문 (연장/야간/휴일 전부 0이면 섹션 전체 숨김) ──
  const _hasOvertime = !!(p.overtime_pay || p.night_pay || p.holiday_pay);
  const _overtimeBody = _hasOvertime
    ? makeGroupRow('▸ 추가 근로수당') +
      makePayRow('연장근로수당',      p.overtime_pay) +
      makePayRow('야간근로수당',      p.night_pay) +
      makePayRow('휴일근로수당',      p.holiday_pay)
    : '';

  payTb.innerHTML =
    (_monthlyBody ? makeGroupRow('▸ 매월 지급') + _monthlyBody : '') +
    _overtimeBody +
    (_irregBody ? makeGroupRow('▸ 비정기 지급') + _irregBody : '');

  // ── 계약상 임금 정보 행 (인적사항 그리드) ──
  // 고용형태별 표시 규칙:
  //   정규직/수습   : 계약연봉(값 없으면 공란) + 월기본급(값 없으면 공란) + 일급/시급
  //   계약직/수습   : 월기본급(값 없으면 공란) + 일급/시급 (연봉 행 없음 — 월 약정임금 필드, 2026-09-03)
  //   일용직        : 연봉·월기본급 행 제외, 일급/시급만 표시
  //   기타          : 보유한 임금 항목만 표시
  (function _renderPsContractWage(){
    const fmtW  = v => v ? Number(v).toLocaleString('ko-KR') + '원' : '';
    const cat   = e.employment_category || (ct ? ct.contract_type : '') || '';
    const isReg      = [CONTRACT_TYPE.REGULAR, CONTRACT_TYPE.REGULAR_PROBATION].includes(normalizeContractType(cat));
    const isCont     = [CONTRACT_TYPE.FIXED, CONTRACT_TYPE.FIXED_PROBATION].includes(normalizeContractType(cat));
    const isDaily    = cat ===CONTRACT_TYPE.DAILY;
    const isRegOrCont = isReg || isCont;

    // 항목 목록 구성 — 고용형태 기준
    // · 정규직: 연봉·월기본급 항상 행 포함(값 없으면 빈 문자열 → 공란 표시)
    // · 계약직: 월기본급 항상 행 포함 (연봉 행 없음)
    // · 일용직: 연봉·월기본급 행 자체 제외
    const wageItems = [];

    if(isRegOrCont){
      // 계약연봉: 정규직만 표시 (계약직은 연봉 필드 없음 — 월 약정임금 사용, 2026-09-03)
      if(isReg){
        wageItems.push({ lbl: _inProbation ? '정규 연봉' : '계약연봉',
                         val: fmtW(ct ? ct.annual_salary : 0) });
      }
      // 월 기본급: 수습 중이면 수습 기본급(_probBaseSal) 사용
      wageItems.push({ lbl: _inProbation ? '수습 기본급' : '월 기본급',
                       val: fmtW(_inProbation ? _probBaseSal : (ct ? ct.base_salary : 0)) });
    }

    // 계약일급 (보유 시 전 고용형태 표시)
    if(ct && ct.daily_wage)
      wageItems.push({ lbl: '계약일급', val: fmtW(ct.daily_wage) });

    // 통상시급 결정:
    //   수습 중  → _probHourly (이미 수습 비율 적용된 시급)
    //   수습 외  → hourly_wage 직접 보유 → 그대로 사용
    // 통상시급: ct.hourly_wage 직접 사용 (필수값, 폴백 없음)
    const hpd = parseFloat(ct ? ct.work_hours_per_day : 0) || 8;
    let effHourlyWage = 0;
    if(_inProbation && _probHourly > 0){
      effHourlyWage = _probHourly;
    } else if(ct && ct.hourly_wage && Number(ct.hourly_wage) > 0){
      effHourlyWage = Number(ct.hourly_wage);
    }

    // 통상일급: 통상시급 × 소정근로시간/일
    if(effHourlyWage > 0)
      wageItems.push({ lbl: '통상일급', val: fmtW(Math.round(effHourlyWage * hpd)) });

    // 통상시급 (표시 1원 반올림 — 저장값은 정밀도 유지, 2026-09-11)
    if(effHourlyWage > 0)
      wageItems.push({ lbl: '통상시급', val: fmtW(Math.round(effHourlyWage)) });

    // 슬롯 전체 쒈기화 (이전 명세서 잔류 방지)
    for(let i = 1; i <= 6; i++){
      const _l = document.getElementById(`ps-ct-wage-lbl${i}`);
      const _v = document.getElementById(`ps-ct-wage-val${i}`);
      if(_l){ _l.textContent=''; _l.classList.add('d-none'); _l.style.display='none'; }
      if(_v){ _v.textContent=''; _v.classList.add('d-none'); _v.style.display='none'; }
    }

    // 슬롯 채우기 (최대 6개, lbl1~6 / val1~6)
    for(let i = 1; i <= 6; i++){
      const lbl = document.getElementById(`ps-ct-wage-lbl${i}`);
      const val = document.getElementById(`ps-ct-wage-val${i}`);
      if(!lbl || !val) continue;
      const item = wageItems[i - 1];
      if(item){
        lbl.textContent   = item.lbl;
        val.textContent   = item.val;
        lbl.classList.remove('d-none'); lbl.style.display='';
        val.classList.remove('d-none'); val.style.display='';
      } else {
        lbl.textContent   = '';
        val.textContent   = '';
        lbl.classList.add('d-none'); lbl.style.display='none';
        val.classList.add('d-none'); val.style.display='none';
      }
    }
  })();

  // ── 수습기간 급여 산정 기준 배너 ──
  (function _renderProbationBanner(){
    const banner = document.getElementById('ps-probation-banner');
    if(!banner) return;
    // 수습 기능 OFF → 배너 완전 숨김
    if (!window._probationFeatureEnabled) { banner.classList.add('d-none'); return; }

    // 수습 계약 유형 여부 (contract_type 또는 employment_category 기준)
    const catStr = (ct ? ct.contract_type : '') || e.employment_category || '';
    const isProbType = catStr ===CONTRACT_TYPE.REGULAR_PROBATION || catStr ===CONTRACT_TYPE.FIXED_PROBATION;
    if(!isProbType || !ct){ banner.classList.add('d-none'); return; }

    const probStart = ct.contract_start || '';
    if(!probStart){ banner.classList.add('d-none'); return; }

    if(!_inProbation){ banner.classList.add('d-none'); return; }

    const fmtDate = s => s ? s.replace(/-/g, '.') : '';
    const pct   = ct.probation_pct ? Number(ct.probation_pct) : null;
    const basis = ct.probation_basis === 'salary' ? '기본급 기준'
                : ct.probation_basis === 'hourly'  ? '시급 기준'
                : ct.probation_basis               ? ct.probation_basis
                : '미입력';

    // 수습기간 텍스트: probation_months 있으면 종료일 표시, 없으면 계약 종료일 표시
    let periodTxt;
    if(_probMonths > 0){
      periodTxt = `${fmtDate(probStart)} ~ ${fmtDate(_probEndStr)} (${_probMonths}개월)`;
    } else {
      periodTxt = _probEndStr
        ? `${fmtDate(probStart)} ~ ${fmtDate(_probEndStr)} (계약 기간 전체)`
        : `${fmtDate(probStart)} ~ (기간 미입력)`;
    }

    document.getElementById('ps-prob-period').textContent  = periodTxt;
    document.getElementById('ps-prob-pct').textContent     = pct ? `${pct}%` : '미입력 (100% 적용)';
    document.getElementById('ps-prob-basis').textContent   = basis;
    document.getElementById('ps-prob-amount').textContent  = _probBaseSal
      ? `기본급 ${_probBaseSal.toLocaleString('ko-KR')}원 / 통상시급 ${_probHourly.toLocaleString('ko-KR')}원`
      : '(기본급 정보 없음)';

    banner.classList.remove('d-none');
    banner.style.display = ''; // 인라인 display:none 해제
  })();

  // ── 수습 만료일 초과 경고 배너 ──
  (function _renderProbOverrunBanner(){
    const ob  = document.getElementById('ps-prob-overrun-banner');
    const obd = document.getElementById('ps-prob-overrun-detail');
    if(!ob || !obd){ return; }
    // 수습 기능 OFF → 배너 완전 숨김
    if (!window._probationFeatureEnabled) { ob.classList.add('d-none'); return; }

    // 수습 계약이 아닌 경우 숨김
    const catStr2 = (ct ? ct.contract_type : '') || e.employment_category || '';
    const isProbType2 = catStr2 ===CONTRACT_TYPE.REGULAR_PROBATION || catStr2 ===CONTRACT_TYPE.FIXED_PROBATION;
    if(!isProbType2 || !ct){ ob.classList.add('d-none'); return; }

    // 수습 종료일: 외부 스코프 _probEndStr 재사용 (이미 계산됨)
    if(!_probEndStr){ ob.classList.add('d-none'); return; }

    // 급여 연월의 시작일·말일
    const payYr  = Number(p.pay_year);
    const payMo  = Number(p.pay_month);
    const mStart = `${payYr}-${String(payMo).padStart(2,'0')}-01`;
    const lastD  = new Date(payYr, payMo, 0).getDate();
    const mEnd   = `${payYr}-${String(payMo).padStart(2,'0')}-${String(lastD).padStart(2,'0')}`;

    const fmtD = d => d ? `${d.slice(0,4)}년 ${d.slice(5,7)}월 ${d.slice(8,10)}일` : '-';
    const nextDay = d => {
      const dt = new Date(d); dt.setDate(dt.getDate()+1);
      return dt.toISOString().slice(0,10);
    };

    // ① 해당 월 전체가 수습 종료일 이후
    if(mStart > _probEndStr){
      obd.innerHTML =
        `<div>· 수습 종료일: <strong class="text-danger-red">${fmtD(_probEndStr)}</strong></div>` +
        `<div>· 이 명세서 기간 <strong>${payYr}년 ${payMo}월</strong>은 수습이 이미 만료된 달입니다.</div>` +
        `<div class="prob-overrun-warn">채용확정 근로계약서 기준으로 급여명세서를 별도 발행하세요.</div>`;
      ob.classList.remove('d-none');
      ob.style.display = ''; // 인라인 display:none 해제
      return;
    }

    // ② 해당 월 중간에 수습 만료일이 껴있음
    if(_probEndStr >= mStart && _probEndStr < mEnd){
      obd.innerHTML =
        `<div>· 수습 종료일: <strong class="text-danger-red">${fmtD(_probEndStr)}</strong></div>` +
        `<div>· 이 명세서 기간 <strong>${payYr}년 ${payMo}월</strong> 안에 수습이 만료됩니다.</div>` +
        `<div class="prob-overrun-warn">
          ① <u>${fmtD(mStart)} ~ ${fmtD(_probEndStr)}</u>: 수습 기준 급여명세서 (현재 명세서)<br>
          ② <u>${fmtD(nextDay(_probEndStr))} ~ ${fmtD(mEnd)}</u>: 채용확정 기준 급여명세서 <strong>별도 발행 필요</strong>
         </div>`;
      ob.classList.remove('d-none');
      ob.style.display = ''; // 인라인 display:none 해제
      return;
    }

    // ③ 수습 기간 내 → 숨김
    ob.classList.add('d-none');
  })();

  // 산출식 계산 (엑셀 양식의 계산 방법 표와 동일 구조)
  // ── 급여년월 기준 보험 요율·상한 매칭 (insurance_rates 테이블, 없으면 폴백) ──
  const _psStd = (p.standard_monthly_pay && Number(p.standard_monthly_pay) > 0)
    ? Number(p.standard_monthly_pay) : gross;
  const _psPeriod = `${p.pay_year}-${String(p.pay_month).padStart(2,'0')}`;
  const _psRateFor = (type, fb) => {
    const list = ((typeof _allInsuranceRates !== 'undefined') ? _allInsuranceRates : [])
      .filter(r => r.insurance_type === type);
    let r = list.find(r =>
      (!r.period_start || r.period_start <= _psPeriod + '-31') &&
      (!r.period_end   || r.period_end   >= _psPeriod + '-01')
    );
    if(!r){
      r = list.filter(r => !r.period_start || r.period_start <= _psPeriod + '-01')
        .sort((a,b)=>(b.period_start||'').localeCompare(a.period_start||''))[0];
    }
    return r
      ? { rate: (Number(r.rate)||0)/100, cap: Number(r.cap_amount)||0, label: `${Number(r.rate)}%` }
      : fb;
  };
  const _psPension = _psRateFor('national_pension', { rate: 0.045, cap: 6370000, label: '4.5%' });
  const _psHealth  = _psRateFor('health',           { rate: 0.03545, cap: 0, label: '3.545%' });
  const _psLtcare  = _psRateFor('long_term_care',   { rate: 0.1295,  cap: 0, label: '12.95%' });
  const _psEmploy  = _psRateFor('employment',       { rate: 0.009,   cap: 0, label: '0.9%' });
  const _psTaxYear = (() => {
    const keys = (typeof _TAX_BRACKET_DATA !== 'undefined')
      ? Object.keys(_TAX_BRACKET_DATA).map(Number).sort((a,b)=>b-a) : [];
    return keys.length ? keys[0] : new Date().getFullYear();
  })();
  const _psStdFmt = Math.round(_psStd).toLocaleString('ko-KR');
  const calcRows = [
    {
      label:'연장근로수당',
      formula: hourlyWage
        ? `통상시급 ${Math.round(hourlyWage).toLocaleString('ko-KR')}원 × 연장 ${otHours}h × 150%`
        : '통상시간급 × 연장근로시간 수 × 150%',
      value: p.overtime_pay||0,
      color:'#1d4ed8', bg:'#eff6ff'
    },
    {
      label:'야간근로수당',
      formula: hourlyWage
        ? `통상시급 ${Math.round(hourlyWage).toLocaleString('ko-KR')}원 × 야간 ${nightHours}h × 50%`
        : '통상시간급 × 야간근로시간 수 × 50%',
      value: p.night_pay||0,
      color:'#7e22ce', bg:'#fdf4ff'
    },
    {
      label:'휴일근로수당',
      formula: hourlyWage
        ? `통상시급 ${Math.round(hourlyWage).toLocaleString('ko-KR')}원 × 휴일 ${holHours}h × 150%`
        : '통상시간급 × 휴일근로시간 수 × 150%',
      value: p.holiday_pay||0,
      color:'#c2410c', bg:'#fff7ed'
    },
    {
      label:'소득세',
      formula:`${_psTaxYear}년 근로소득 간이세액표 적용`,
      value: incTax,
      color:'#7f1d1d', bg:'#fff5f5'
    },
    {
      label:'지방소득세',
      formula:'근로소득세 × 10%',
      value: locTax,
      color:'#7f1d1d', bg:'#fff5f5'
    },
    {
      label:'건강보험',
      formula: `보수월액 ${_psStdFmt}원 × ${_psHealth.label}`,
      value: health,
      color:'#065f46', bg:'#f0fdf4'
    },
    {
      label:'장기요양보험',
      formula:`건강보험료 × ${_psLtcare.label}`,
      value: ltCare,
      color:'#065f46', bg:'#f0fdf4'
    },
    {
      label:'국민연금',
      formula: _psPension.cap > 0
        ? `보수월액(최대 ${_psPension.cap.toLocaleString('ko-KR')}원) ${Math.round(Math.min(_psStd, _psPension.cap)).toLocaleString('ko-KR')}원 × ${_psPension.label}`
        : `보수월액 ${_psStdFmt}원 × ${_psPension.label}`,
      value: pension,
      color:'#92400e', bg:'#fffbeb'
    },
    {
      label:'고용보험',
      formula: `보수월액 ${_psStdFmt}원 × ${_psEmploy.label}`,
      value: empIns,
      color:'#1e40af', bg:'#eff6ff'
    },
  ];

  // 값이 0인 항목도 포함 (계산 근거를 보여주기 위해)
  // 모든 행을 th와 동일한 렌더링 스타일로 통일
  // (th 실제 스타일: 배경 #f8f9fb / 텍스트 #555 / 테두리 1px #e2e8f0 / 패딩 6px 12px)
  const calcTb = document.getElementById('ps-calc-tbody');
  if(calcTb) calcTb.innerHTML = calcRows.map((r,i)=>`
    <tr class="ps-calc-row" style="background:#f8f9fb;color:#555;">
      <td class="ps-calc-label" style="padding:6px 12px;border:1px solid #e2e8f0;width:130px;color:#555;background:#f8f9fb;">${r.label}</td>
      <td class="ps-calc-formula" style="padding:6px 12px;border:1px solid #e2e8f0;color:#555;background:#f8f9fb;">${r.formula}</td>
      <td class="ps-calc-value" style="padding:6px 12px;border:1px solid #e2e8f0;width:110px;text-align:right;color:#555;background:#f8f9fb;">${r.value?fmt(r.value):'—'}</td>
    </tr>
  `).join('');

  openModal('payslip-modal');
}

async function downloadPayslipPDF(){
  const btn1 = document.querySelector('#payslip-modal button[onclick="downloadPayslipPDF()"]');
  const btn2 = document.querySelectorAll('#payslip-modal button[onclick="downloadPayslipPDF()"]');
  // 버튼 로딩 표시
  btn2.forEach(b=>{ b.disabled=true; b.innerHTML='<i class="fas fa-spinner fa-spin"></i> 생성 중...'; });

  try{
    const el = document.getElementById('payslip-content');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin*2;
    const imgH = (canvas.height / canvas.width) * imgW;

    // 페이지를 넘어가면 여러 페이지로 분할
    let y = margin;
    let remaining = imgH;
    let srcY = 0;
    const ratio = canvas.width / imgW;

    while(remaining > 0){
      const sliceH = Math.min(pageH - margin*2, remaining);
      const sliceSrcH = sliceH * ratio;

      // 슬라이스 캔버스
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceSrcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceSrcH, 0, 0, canvas.width, sliceSrcH);

      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, y, imgW, sliceH);

      remaining -= sliceH;
      srcY += sliceSrcH;
      if(remaining > 0) { pdf.addPage(); y = margin; }
    }

    // 파일명: 직원명_연월_급여명세서.pdf
    const sub = document.getElementById('ps-subtitle').textContent;
    const empName = document.getElementById('ps-name').textContent;
    const periodTxt = document.getElementById('ps-period').textContent.replace('분 급여','').replace('년 ','년').replace('월','월');
    pdf.save(`${empName}_${periodTxt}_급여명세서.pdf`);
    toast('PDF 다운로드 완료!','success');
  } catch(err){
    console.error(err);
    toast('PDF 생성 중 오류가 발생했습니다.','error');
  } finally{
    btn2.forEach(b=>{ b.disabled=false; b.innerHTML='<i class="fas fa-file-pdf"></i> PDF 다운로드'; });
  }
}

async function sendPayslipPDF(){
  const empPhone = (window._currentPayslipPhone || '').trim();
  if(!empPhone){ toast('전화번호가 등록되어 있지 않아 알림톡 발송이 불가합니다.', 'error'); return; }

  // 버튼 상태 업데이트
  const sendBtns = document.querySelectorAll('#ps-send-btn-top, #ps-send-btn-bottom');
  const _kakaoSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>';
  sendBtns.forEach(b=>{ b.disabled=true; b.innerHTML='<i class="fas fa-spinner fa-spin"></i> PDF 생성 중...'; });

  try{
    // 직원명 및 기간 정보 수집
    const empName = document.getElementById('ps-name').textContent.trim();
    const periodTxt = document.getElementById('ps-period').textContent
      .replace('분 급여','').replace('년 ','년').replace('월','월').trim();
    const fileName = `${empName}_${periodTxt}_급여명세서.pdf`;

    // html2canvas로 명세서 캔버스 생성
    const el = document.getElementById('payslip-content');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin*2;
    const imgH = (canvas.height / canvas.width) * imgW;

    // 페이지 분할 처리
    let y = margin;
    let remaining = imgH;
    let srcY = 0;
    const ratio = canvas.width / imgW;

    while(remaining > 0){
      const sliceH = Math.min(pageH - margin*2, remaining);
      const sliceSrcH = sliceH * ratio;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceSrcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceSrcH, 0, 0, canvas.width, sliceSrcH);
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, y, imgW, sliceH);
      remaining -= sliceH;
      srcY += sliceSrcH;
      if(remaining > 0){ pdf.addPage(); y = margin; }
    }

    // PDF → Blob → File 객체 생성
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // 전역 변수에 첨부 파일 등록 (추후 카카오 알림톡 발송에 사용)
    window._payslipPdfFile = pdfFile;
    window._payslipEmpPhone = empPhone;
    window._payslipEmpName = empName;
    window._payslipFileName = fileName;

    // ── 발송 로그 저장 (payroll_send_logs) ──
    const payrollId = window._currentPayslipPayrollId;
    const empId     = window._currentPayslipEmpId;
    const companyId = window._currentPayslipCompanyId;
    const payYear   = window._currentPayslipYear;
    const payMonth  = window._currentPayslipMonth;

    if(payrollId && empId && companyId){
      try{
        const sentBy = sessionStorage.getItem('admin_username') || 'admin';
        const logBody = {
          id:          'psl_' + Date.now() + '_' + empId,
          company_id:  companyId,
          employee_id: empId,
          payroll_id:  payrollId,
          pay_year:    payYear,
          pay_month:   payMonth,
          sent_at:     new Date().toISOString(),
          sent_by:     sentBy,
          send_method: 'kakao',
          note:        '급여명세서 조회 모달에서 개별 발송'
        };
        await api('../tables/payroll_send_logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logBody)
        });
        // 발송 관리 페이지가 같은 고객사를 열어 두고 있으면 캐시에도 즉시 반영
        if(typeof _pssSendLogs !== 'undefined' && _pssCompanyId === companyId){
          _pssSendLogs.push(logBody);
          renderPssLogs();
          renderPssMonthTabs();
          _pssUpdateStats();
        }
      } catch(logErr){
        console.warn('[발송 로그 저장 실패]', logErr);
      }
    }

    // ── 고객사 인앱 알림 발송 (카카오 알림톡 개별 발송) ──
    {
      const _skCo  = allCompanies.find(x => x.id === companyId) || {};
      const _coRep = getCompanyRepGreeting(_skCo);
      await _sendCompanyNotice({
        companyId  : companyId || '', companyName: _skCo.company_name || '',
        noticeType : 'payslip_dispatched',
        title      : `[급여명세서 발송] ${empName} — ${payYear}년 ${payMonth}월 알림톡 발송`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 급여명세서가 카카오 알림톡으로 발송되었습니다.

■ 근로자: ${empName}
■ 지급 기간: ${payYear}년 ${payMonth}월
■ 발송 방법: 카카오 알림톡
■ 발송 시각: ${new Date().toLocaleString('ko-KR')}

`,
        employeeId : empId, employeeName: empName,
      });
    }
    toast(`✅ ${empName} 급여명세서 PDF 발송 완료!`, 'success');

  } catch(err){
    console.error('[sendPayslipPDF]', err);
    toast('PDF 생성 중 오류가 발생했습니다.', 'error');
  } finally{
    sendBtns.forEach(b=>{ b.disabled = !empPhone; b.innerHTML=_kakaoSvg+' PDF 알림톡 발송'; });
  }
}

/* 이메일 개별 발송 (급여명세서 모달) */
async function sendPayslipEmail(){
  const email     = window._currentPayslipEmail || '';
  const empName   = document.getElementById('ps-name').textContent || '';
  const payYear   = window._currentPayslipYear;
  const payMonth  = window._currentPayslipMonth;
  const payrollId = window._currentPayslipPayrollId;
  const empId     = window._currentPayslipEmpId;
  const companyId = window._currentPayslipCompanyId;

  if(!email){ toast('이메일 주소가 등록되어 있지 않습니다.', 'error'); return; }

  const moStr   = String(payMonth).padStart(2,'0');
  const fileName = `${empName}_${payYear}년${moStr}월_급여명세서.pdf`;

  // 버튼 로딩 처리
  const emailBtns = document.querySelectorAll('.ps-email-btn');
  emailBtns.forEach(b=>{ b.disabled=true; b.innerHTML='<i class="fas fa-spinner fa-spin"></i> 발송 중...'; });

  try{
    // PDF 생성
    const blob = await _generatePayslipBlob(payrollId);
    const file = new File([blob], fileName, { type:'application/pdf' });

    // 이메일 발송 stub (실제 연동 시 교체)
    await _sendEmailWithAttachment(email, fileName, file);

    // 발송 로그 저장
    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  companyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    payYear,
      pay_month:   payMonth,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'email',
      note:        `이메일 발송 (${email})`
    };
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logBody)
    });
    // 발송 관리 캐시 즉시 반영
    if(typeof _pssSendLogs !== 'undefined' && _pssCompanyId === companyId){
      _pssSendLogs.push(logBody);
      renderPssLogs();
      renderPssMonthTabs();
      _pssUpdateStats();
    }

    // ── 고객사 인앱 알림 발송 (이메일 개별 발송 — 모달) ──
    {
      const _seCo  = allCompanies.find(x => x.id === companyId) || {};
      const _coRep = getCompanyRepGreeting(_seCo);
      await _sendCompanyNotice({
        companyId  : companyId || '', companyName: _seCo.company_name || '',
        noticeType : 'payslip_dispatched',
        title      : `[급여명세서 발송] ${empName} — ${payYear}년 ${payMonth}월 이메일 발송`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 급여명세서가 이메일로 발송되었습니다.

■ 근로자: ${empName}
■ 지급 기간: ${payYear}년 ${payMonth}월
■ 발송 방법: 이메일 (${email})
■ 발송 시각: ${new Date().toLocaleString('ko-KR')}

`,
        employeeId : empId, employeeName: empName,
      });
    }
    toast(`✅ ${empName} 급여명세서를 ${email}로 발송했습니다.`, 'success');
  } catch(err){
    console.error('[sendPayslipEmail]', err);
    toast('이메일 발송 중 오류가 발생했습니다.', 'error');
  } finally{
    emailBtns.forEach(b=>{
      b.disabled = !(window._currentPayslipEmail);
      b.innerHTML = '<i class="fas fa-envelope"></i> 이메일 발송';
    });
  }
}

