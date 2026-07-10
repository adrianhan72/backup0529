/**
 * modules/payroll/payroll-core.mjs — Phase 5: 급여대장 코어
 * 
 * payroll-core.js → 완전 ESM 변환
 * state.mjs / constants.mjs import + 레거시 window 함수 하이브리드.
 */
import { getCompanies, getEmployees, getPayrolls, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, MAGIC } from '../constants.mjs';

// ═══════════════════════════════════════════
// 로컬 상수 (레거시 const ITEMS → ESM)
// ═══════════════════════════════════════════
const ITEMS = 10;

// ═══════════════════════════════════════════
// 레거시 브릿지 (window 함수들)
// ═══════════════════════════════════════════
const _w = (name) => window[name];
window._w = _w;

// ─── PAYROLLS ───
export function renderPayrolls() {
  const cpId = window.currentPayCompanyId;
  if (!cpId) return;
  const yr = parseInt(document.getElementById('pay-year-filter')?.value) || 0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value) || 0;
  const q = (document.getElementById('pay-search')?.value || '').toLowerCase();
  const allP = getPayrolls();
  const allC = getContracts();
  let f = allP.filter(p => {
    if (p.is_draft) return false;
    if (String(p.company_id) !== String(cpId)) return false;
    if (yr && Number(p.pay_year) !== yr) return false;
    if (mo && Number(p.pay_month) !== mo) return false;
    if (q && !_w('getEmpName')(p.employee_id).toLowerCase().includes(q)) return false;
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const limitYm = nextMonth.getFullYear() * 100 + (nextMonth.getMonth() + 1);
    if (Number(p.pay_year) * 100 + Number(p.pay_month) > limitYm) return false;
    const hasRealContract = allC.some(c => c.employee_id === p.employee_id && !c.is_draft);
    if (!hasRealContract && allC.some(c => c.employee_id === p.employee_id && c.is_draft)) return false;
    return true;
  }).sort((a, b) => _w('getEmpName')(a.employee_id).localeCompare(_w('getEmpName')(b.employee_id), 'ko'));
  const paged = f.slice((window.pages.pay - 1) * ITEMS, window.pages.pay * ITEMS);
  const tb = document.getElementById('pay-tbody');
  if (!tb) return;
  if (!f.length) {
    tb.innerHTML = '<tr><td colspan="11" class="empty-state">급여 내역이 없습니다</td></tr>';
    const pagination = document.getElementById('pay-pagination');
    if (pagination) pagination.innerHTML = '';
    return;
  }
  const allE = getEmployees();
  tb.innerHTML = paged.map(p => {
    const monthlyTotal = (p.base_salary || 0) + (p.weekly_holiday_pay || 0) + (p.position_allowance || 0) + (p.car_maintenance || 0) + (p.meal_allowance || 0);
    const extraTotal = (p.overtime_pay || 0) + (p.night_pay || 0) + (p.holiday_pay || 0);
    const irregularTotal = (p.annual_leave_pay || 0) + (p.other_pay || 0);
    const payEmp = allE.find(x => x.id === p.employee_id) || {};
    const payCat = payEmp.employment_category || '-';
    return `<tr class="pay-tbody-row" onclick="openPayslipModal('${p.id}')" title="클릭하면 급여명세서를 볼 수 있습니다">
    <td style="font-weight:600">${_w('getEmpName')(p.employee_id)}</td>
    <td><span class="badge ${_w('empCatBadge')(payCat)}" style="font-size:10.5px;padding:2px 7px;">${_w('contractTypeLabel')(payCat)}</span></td>
    <td>${p.work_days || '-'}일</td>
    <td>${p.overtime_hours || 0}h</td>
    <td class="amount-blue">${_w('won2')(p.gross_pay)}</td>
    <td style="font-size:11.5px;color:#3b82f6;">${_w('won2')(monthlyTotal)}</td>
    <td style="font-size:11.5px;color:#6366f1;">${_w('won2')(extraTotal)}</td>
    <td style="font-size:11.5px;color:#8b5cf6;">${_w('won2')(irregularTotal)}</td>
    <td class="amount-red">${_w('won2')(p.total_deduction)}</td>
    <td class="amount-green" style="font-size:13px;font-weight:700;">${_w('won2')(p.net_pay)}</td>
    <td onclick="event.stopPropagation()" style="text-align:center;"><button onclick="editPayroll('${p.id}')" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;"><i class="fas fa-pen" style="margin-right:3px;"></i>수정</button></td>
  </tr>`;
  }).join('');
  _w('renderPagination')('pay-pagination', f.length, window.pages.pay, 'setPayPage');
  _w('updateBulkSendBtn')();
}

export function setPayPage(p) { window.pages.pay = p; renderPayrolls(); }

// ─── 급여명세서 모달 ───
export function openPayslipModal(payrollId) {
  const allP = getPayrolls();
  const allE = getEmployees();
  const allCo = getCompanies();
  const allC = getContracts();

  const p = allP.find(x => x.id === payrollId);
  if (!p) return;
  window._currentPayslipId = payrollId;
  const e = allE.find(x => x.id === p.employee_id) || {};
  const co = allCo.find(x => x.id === p.company_id) || {};

  const gross = p.gross_pay || 0;
  const incTax = p.income_tax || 0;
  const locTax = p.local_income_tax || 0;
  const health = p.health_insurance || 0;
  const ltCare = p.long_term_care || 0;
  const pension = p.national_pension || 0;
  const empIns = p.employment_insurance || 0;
  const yearEnd = p.year_end_tax_adjust || 0;
  const hlAdj = p.health_insurance_adjust || 0;
  const advance = p.advance_deduction || 0;
  const calcDed = incTax + locTax + health + ltCare + pension + empIns + yearEnd + hlAdj + advance;
  const rawDed = p.total_deduction || calcDed;
  const totalDed = Math.abs(rawDed - calcDed) > 50 ? calcDed : rawDed;
  const rawNet = p.net_pay || (gross - totalDed);
  const netPay = Math.abs(rawNet - (gross - totalDed)) > 50 ? (gross - totalDed) : rawNet;

  const moStr = String(p.pay_month).padStart(2, '0');
  const payDate = p.pay_date || (co.pay_day ? `${p.pay_year}-${moStr}-${String(co.pay_day).padStart(2, '0')}` : '');

  document.getElementById('ps-subtitle').textContent = `${p.pay_year}년 ${p.pay_month}월분 · ${co.company_name || ''}`;
  document.getElementById('ps-company-name').textContent = co.company_name || '';
  document.getElementById('ps-period').textContent = `${p.pay_year}년 ${moStr}월분 급여`;
  document.getElementById('ps-paydate').textContent = payDate ? `지급일: ${payDate}` : '';

  document.getElementById('ps-name').textContent = e.name || '-';
  document.getElementById('ps-dept').textContent = `${e.department || '-'} / ${e.position || '-'}`;
  document.getElementById('ps-empcat').textContent = _w('contractTypeLabel')(e.employment_category) || '-';
  document.getElementById('ps-hiredate').textContent = e.hire_date || '-';
  document.getElementById('ps-workdays').textContent = p.work_days ? `${p.work_days}일` : '-';
  document.getElementById('ps-totalhours').textContent = p.total_work_hours ? `${p.total_work_hours}시간` : '-';
  document.getElementById('ps-ot').textContent = p.overtime_hours ? `${p.overtime_hours}시간` : '-';
  document.getElementById('ps-night').textContent = p.night_hours ? `${p.night_hours}시간` : '-';
  document.getElementById('ps-hol').textContent = p.holiday_hours ? `${p.holiday_hours}시간` : '-';
  document.getElementById('ps-paydate-cell').textContent = payDate || '-';

  window._currentPayslipPhone = e.phone || e.mobile || '';
  window._currentPayslipEmail = e.email || '';
  window._currentPayslipPayrollId = p.id;
  window._currentPayslipEmpId = p.employee_id;
  window._currentPayslipCompanyId = p.company_id;
  window._currentPayslipYear = p.pay_year;
  window._currentPayslipMonth = p.pay_month;

  const emailBtns = document.querySelectorAll('.ps-email-btn');
  emailBtns.forEach(btn => {
    if (e.email && e.email.trim()) {
      btn.disabled = false;
      btn.title = e.email;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    } else {
      btn.disabled = true;
      btn.title = '이메일 정보 없음';
      btn.style.opacity = '0.45';
      btn.style.cursor = 'not-allowed';
    }
  });

  const fmt = v => (v || 0).toLocaleString('ko-KR') + '원';
  const fmtZ = v => v ? fmt(v) : '—';

  const payTb = document.getElementById('ps-pay-items');
  const makePayRow = (label, val) => {
    const isZero = !val || val === 0;
    return `<tr class="ps-item-row${isZero ? ' ps-zero' : ''}"><td>${label}</td><td>${fmtZ(val)}</td></tr>`;
  };
  const makeGroupRow = (label, isDed = false) =>
    `<tr class="${isDed ? 'ps-ded-group-row' : 'ps-group-row'}"><td colspan="2">${label}</td></tr>`;
  const payTypeTag = (type) => type === 'daily'
    ? '<span style="font-size:9px;background:#fef3c7;color:#92400e;border-radius:3px;padding:1px 4px;margin-left:4px;border:1px solid #fde68a;">출근일수</span>'
    : '<span style="font-size:9px;background:#dbeafe;color:#1d4ed8;border-radius:3px;padding:1px 4px;margin-left:4px;border:1px solid #bfdbfe;">정기지급</span>';
  const makePayRowType = (label, val, type) => {
    const isZero = !val || val === 0;
    return `<tr class="ps-item-row${isZero ? ' ps-zero' : ''}"><td>${label}${payTypeTag(type)}</td><td>${fmtZ(val)}</td></tr>`;
  };

  const dedTb = document.getElementById('ps-ded-items');
  const makeDedRow = (label, val) => {
    const isZero = !val || val === 0;
    return `<tr class="ps-item-row${isZero ? ' ps-zero' : ''}"><td>${label}</td><td>${fmtZ(val)}</td></tr>`;
  };
  dedTb.innerHTML =
    makeGroupRow('▸ 세금', true) +
    makeDedRow('소득세', incTax) +
    makeDedRow('지방소득세 (주민세)', locTax) +
    makeGroupRow('▸ 4대보험', true) +
    makeDedRow('건강보험', health) +
    makeDedRow('장기요양보험', ltCare) +
    makeDedRow('국민연금', pension) +
    makeDedRow('고용보험', empIns) +
    makeGroupRow('▸ 정산 / 추가공제', true) +
    makeDedRow('연말정산', yearEnd) +
    makeDedRow('건강보험 정산', hlAdj) +
    makeDedRow('기타(선지급) 공제', advance);

  document.getElementById('ps-gross').textContent = fmt(gross);
  document.getElementById('ps-total-ded').textContent = fmt(totalDed);
  document.getElementById('ps-net').textContent = fmt(netPay);

  const otHours = p.overtime_hours || 0;
  const nightHours = p.night_hours || 0;
  const holHours = p.holiday_hours || 0;

  const _psYr = Number(p.pay_year), _psMo = Number(p.pay_month);
  const _psMonthStart = `${_psYr}-${String(_psMo).padStart(2, '0')}-01`;
  const _psMonthEnd = new Date(_psYr, _psMo, 0).toISOString().slice(0, 10);

  const _empContracts = allC.filter(c => {
    if (c.employee_id !== e.id) return false;
    if (c.is_draft || c.is_voided_by_amend) return false;
    if (['취소', '파기'].includes(c.status)) return false;
    return true;
  });

  let ct = _empContracts.find(c => {
    const s = c.contract_start || '';
    const ed = c.contract_end || '';
    if (s && s > _psMonthEnd) return false;
    if (ed && ed < _psMonthStart) return false;
    return true;
  }) || null;

  if (!ct && _empContracts.length > 0) {
    ct = _empContracts.slice().sort((a, b) =>
      (b.contract_start || '').localeCompare(a.contract_start || '')
    )[0];
  }

  const _isProbContract = ct && (ct.contract_type === CONTRACT_TYPE.REGULAR_PROBATION || ct.contract_type === CONTRACT_TYPE.FIXED_PROBATION);
  let _inProbation = false;
  let _probBaseSal = 0;
  let _probHourly = 0;
  let _probMonthly = 0;
  let _probEndStr = '';
  let _probMonths = 0;

  if (_isProbContract) {
    _probMonths = ct.probation_months ? Number(ct.probation_months) : 0;
    if (_probMonths > 0) {
      const _probStartDate = new Date(ct.contract_start);
      const _probEndDate = new Date(_probStartDate);
      _probEndDate.setMonth(_probEndDate.getMonth() + _probMonths);
      _probEndDate.setDate(_probEndDate.getDate() - 1);
      _probEndStr = _probEndDate.toISOString().slice(0, 10);
      _inProbation = ct.contract_start <= _psMonthEnd && _probEndStr >= _psMonthStart;
    } else {
      _probEndStr = ct.contract_end || '';
      _inProbation = true;
    }
    if (_inProbation) {
      const pct = ct.probation_pct ? Number(ct.probation_pct) : 100;
      _probBaseSal = ct.base_salary ? Math.round(Number(ct.base_salary) * pct / 100) : 0;
      const agreedSal = ct.monthly_salary_agreed || ct.base_salary || 0;
      _probMonthly = agreedSal ? Math.round(agreedSal * pct / 100) : 0;
      if (ct.hourly_wage && Number(ct.hourly_wage) > 0) {
        _probHourly = Math.round(Number(ct.hourly_wage) * pct / 100);
      } else if (_probBaseSal > 0) {
        _probHourly = Math.round(_probBaseSal / MAGIC.MONTHLY_STD_HOURS);
      }
    }
  }

  const hourlyWage = _inProbation
    ? _probHourly
    : ct
      ? (ct.hourly_wage && Number(ct.hourly_wage) > 0
          ? Number(ct.hourly_wage)
          : (ct.base_salary ? Math.round(Number(ct.base_salary) / MAGIC.MONTHLY_STD_HOURS) : 0))
      : 0;
  const monthlySal = _inProbation
    ? _probMonthly
    : ct ? (ct.monthly_salary_agreed || ct.base_salary || 0) : gross;

  const _baseSalLabel = _inProbation ? '기본급 (수습)' : '기본급';
  const _baseSalAmt = (p.base_salary && p.base_salary > 0)
    ? p.base_salary
    : (_inProbation ? _probBaseSal : p.base_salary);
  payTb.innerHTML =
    makeGroupRow('▸ 매월 지급') +
    makePayRow(_baseSalLabel, _baseSalAmt) +
    makePayRow('주휴수당', p.weekly_holiday_pay) +
    makePayRow('직책수당', p.position_allowance) +
    makePayRowType('교통비', p.transportation_allowance || p.car_maintenance, p.transportation_pay_type || 'fixed') +
    makePayRowType('자가운전보조금', p.self_driving_allowance, p.self_driving_pay_type || 'fixed') +
    makePayRowType('벽지수당', p.remote_area_allowance, p.remote_area_pay_type || 'fixed') +
    makePayRowType('식대', p.meal_allowance, p.meal_pay_type || 'fixed') +
    makePayRow('보육수당', p.childcare_allowance) +
    makePayRow('연구활동비', p.research_allowance) +
    makeGroupRow('▸ 추가 근로수당') +
    makePayRow('연장근로수당', p.overtime_pay) +
    makePayRow('야간근로수당', p.night_pay) +
    makePayRow('휴일근로수당', p.holiday_pay) +
    makeGroupRow('▸ 비정기 지급') +
    makePayRow('연차수당', p.annual_leave_pay) +
    makePayRow('정기 상여금', p.bonus_pay) +
    makePayRow('비정기 성과급', p.performance_pay) +
    makePayRow('실비변상적급여', p.actual_expense_pay) +
    makePayRow('통신비', p.communication_pay) +
    makePayRow('기술수당', p.skill_allowance) +
    makePayRow('면허수당', p.license_allowance) +
    makePayRow('기타수당', (p.etc_allowance || 0) + (p.other_pay || 0));

  // ── 계약상 임금 정보 행 ──
  (function _renderPsContractWage() {
    const fmtW = v => v ? Number(v).toLocaleString('ko-KR') + '원' : '';
    const cat = e.employment_category || (ct ? ct.contract_type : '') || '';
    const isReg = ['정규직', '정규직 수습'].includes(cat);
    const isCont = ['계약직', '계약직 수습'].includes(cat);
    const isDaily = cat === CONTRACT_TYPE.DAILY;
    const isRegOrCont = isReg || isCont;
    const wageItems = [];

    if (isRegOrCont) {
      wageItems.push({
        lbl: _inProbation ? '정규 연봉' : '계약연봉',
        val: fmtW(ct ? ct.annual_salary : 0)
      });
      wageItems.push({
        lbl: _inProbation ? '수습 기본급' : '월 기본급',
        val: fmtW(_inProbation ? _probBaseSal : (ct ? ct.base_salary : 0))
      });
    }
    if (ct && ct.daily_wage)
      wageItems.push({ lbl: '계약일급', val: fmtW(ct.daily_wage) });

    const hpd = parseFloat(ct ? ct.work_hours_per_day : 0) || 8;
    let effHourlyWage = 0;
    if (_inProbation && _probHourly > 0) {
      effHourlyWage = _probHourly;
    } else if (ct && ct.hourly_wage && Number(ct.hourly_wage) > 0) {
      effHourlyWage = Number(ct.hourly_wage);
    } else if (ct && ct.base_salary && Number(ct.base_salary) > 0) {
      effHourlyWage = Math.round(Number(ct.base_salary) / MAGIC.MONTHLY_STD_HOURS);
    }
    if (effHourlyWage > 0)
      wageItems.push({ lbl: '통상일급', val: fmtW(Math.round(effHourlyWage * hpd)) });
    if (effHourlyWage > 0)
      wageItems.push({ lbl: '통상시급', val: fmtW(effHourlyWage) });

    for (let i = 1; i <= 6; i++) {
      const _l = document.getElementById(`ps-ct-wage-lbl${i}`);
      const _v = document.getElementById(`ps-ct-wage-val${i}`);
      if (_l) { _l.textContent = ''; _l.style.display = 'none'; }
      if (_v) { _v.textContent = ''; _v.style.display = 'none'; }
    }
    for (let i = 1; i <= 6; i++) {
      const lbl = document.getElementById(`ps-ct-wage-lbl${i}`);
      const val = document.getElementById(`ps-ct-wage-val${i}`);
      if (!lbl || !val) continue;
      const item = wageItems[i - 1];
      if (item) {
        lbl.textContent = item.lbl;
        val.textContent = item.val;
        lbl.style.display = '';
        val.style.display = '';
      } else {
        lbl.textContent = '';
        val.textContent = '';
        lbl.style.display = 'none';
        val.style.display = 'none';
      }
    }
  })();

  // ── 수습기간 급여 산정 기준 배너 ──
  (function _renderProbationBanner() {
    const banner = document.getElementById('ps-probation-banner');
    if (!banner) return;
    const catStr = (ct ? ct.contract_type : '') || e.employment_category || '';
    const isProbType = catStr === CONTRACT_TYPE.REGULAR_PROBATION || catStr === CONTRACT_TYPE.FIXED_PROBATION;
    if (!isProbType || !ct) { banner.style.display = 'none'; return; }
    const probStart = ct.contract_start || '';
    if (!probStart) { banner.style.display = 'none'; return; }
    if (!_inProbation) { banner.style.display = 'none'; return; }

    const fmtDate = s => s ? s.replace(/-/g, '.') : '';
    const pct = ct.probation_pct ? Number(ct.probation_pct) : null;
    const basis = ct.probation_basis === 'salary' ? '기본급 기준'
      : ct.probation_basis === 'hourly' ? '시급 기준'
      : ct.probation_basis ? ct.probation_basis
      : '미입력';

    let periodTxt;
    if (_probMonths > 0) {
      periodTxt = `${fmtDate(probStart)} ~ ${fmtDate(_probEndStr)} (${_probMonths}개월)`;
    } else {
      periodTxt = _probEndStr
        ? `${fmtDate(probStart)} ~ ${fmtDate(_probEndStr)} (계약 기간 전체)`
        : `${fmtDate(probStart)} ~ (기간 미입력)`;
    }
    document.getElementById('ps-prob-period').textContent = periodTxt;
    document.getElementById('ps-prob-pct').textContent = pct ? `${pct}%` : '미입력 (100% 적용)';
    document.getElementById('ps-prob-basis').textContent = basis;
    document.getElementById('ps-prob-amount').textContent = _probBaseSal
      ? `기본급 ${_probBaseSal.toLocaleString('ko-KR')}원 / 통상시급 ${_probHourly.toLocaleString('ko-KR')}원`
      : '(기본급 정보 없음)';
    banner.style.display = '';
  })();

  // ── 수습 만료일 초과 경고 배너 ──
  (function _renderProbOverrunBanner() {
    const ob = document.getElementById('ps-prob-overrun-banner');
    const obd = document.getElementById('ps-prob-overrun-detail');
    if (!ob || !obd) { return; }
    const catStr2 = (ct ? ct.contract_type : '') || e.employment_category || '';
    const isProbType2 = catStr2 === CONTRACT_TYPE.REGULAR_PROBATION || catStr2 === CONTRACT_TYPE.FIXED_PROBATION;
    if (!isProbType2 || !ct) { ob.style.display = 'none'; return; }
    if (!_probEndStr) { ob.style.display = 'none'; return; }

    const payYr = Number(p.pay_year);
    const payMo = Number(p.pay_month);
    const mStart = `${payYr}-${String(payMo).padStart(2, '0')}-01`;
    const lastD = new Date(payYr, payMo, 0).getDate();
    const mEnd = `${payYr}-${String(payMo).padStart(2, '0')}-${String(lastD).padStart(2, '0')}`;

    const fmtD = d => d ? `${d.slice(0, 4)}년 ${d.slice(5, 7)}월 ${d.slice(8, 10)}일` : '-';
    const nextDay = d => {
      const dt = new Date(d); dt.setDate(dt.getDate() + 1);
      return dt.toISOString().slice(0, 10);
    };

    if (mStart > _probEndStr) {
      obd.innerHTML =
        `<div>· 수습 종료일: <strong style="color:#dc2626;">${fmtD(_probEndStr)}</strong></div>` +
        `<div>· 이 명세서 기간 <strong>${payYr}년 ${payMo}월</strong>은 수습이 이미 만료된 달입니다.</div>` +
        `<div style="margin-top:4px;color:#b91c1c;font-weight:600;">채용확정 근로계약서 기준으로 급여명세서를 별도 발행하세요.</div>`;
      ob.style.display = '';
      return;
    }
    if (_probEndStr >= mStart && _probEndStr < mEnd) {
      obd.innerHTML =
        `<div>· 수습 종료일: <strong style="color:#dc2626;">${fmtD(_probEndStr)}</strong></div>` +
        `<div>· 이 명세서 기간 <strong>${payYr}년 ${payMo}월</strong> 안에 수습이 만료됩니다.</div>` +
        `<div style="margin-top:4px;color:#b91c1c;font-weight:600;">
          ① <u>${fmtD(mStart)} ~ ${fmtD(_probEndStr)}</u>: 수습 기준 급여명세서 (현재 명세서)<br>
          ② <u>${fmtD(nextDay(_probEndStr))} ~ ${fmtD(mEnd)}</u>: 채용확정 기준 급여명세서 <strong>별도 발행 필요</strong>
         </div>`;
      ob.style.display = '';
      return;
    }
    ob.style.display = 'none';
  })();

  // 산출식 계산
  const calcRows = [
    { label: '연장근로수당', formula: hourlyWage ? `통상시급 ${Math.round(hourlyWage).toLocaleString('ko-KR')}원 × 연장 ${otHours}h × 150%` : '통상시간급 × 연장근로시간 수 × 150%', value: p.overtime_pay || 0, color: '#1d4ed8', bg: '#eff6ff' },
    { label: '야간근로수당', formula: hourlyWage ? `통상시급 ${Math.round(hourlyWage).toLocaleString('ko-KR')}원 × 야간 ${nightHours}h × 50%` : '통상시간급 × 야간근로시간 수 × 50%', value: p.night_pay || 0, color: '#7e22ce', bg: '#fdf4ff' },
    { label: '휴일근로수당', formula: hourlyWage ? `통상시급 ${Math.round(hourlyWage).toLocaleString('ko-KR')}원 × 휴일 ${holHours}h × 150%` : '통상시간급 × 휴일근로시간 수 × 150%', value: p.holiday_pay || 0, color: '#c2410c', bg: '#fff7ed' },
    { label: '소득세', formula: '2023년 근로소득 간이세액표 적용', value: incTax, color: '#7f1d1d', bg: '#fff5f5' },
    { label: '지방소득세', formula: '근로소득세 × 10%', value: locTax, color: '#7f1d1d', bg: '#fff5f5' },
    { label: '건강보험', formula: monthlySal ? `보수월액 ${Math.round(monthlySal).toLocaleString('ko-KR')}원 × 3.595%` : '보수월액 × 3.595%', value: health, color: '#065f46', bg: '#f0fdf4' },
    { label: '장기요양보험', formula: '건강보험료 × 13.14%', value: ltCare, color: '#065f46', bg: '#f0fdf4' },
    { label: '국민연금', formula: monthlySal ? `보수월액(최대 6,370,000원) ${Math.round(Math.min(monthlySal, 6370000)).toLocaleString('ko-KR')}원 × 4.75%` : '보수월액(최대 6,370,000원) × 4.75%', value: pension, color: '#92400e', bg: '#fffbeb' },
    { label: '고용보험', formula: monthlySal ? `보수월액 ${Math.round(monthlySal).toLocaleString('ko-KR')}원 × 0.9%` : '보수월액 × 0.9%', value: empIns, color: '#1e40af', bg: '#eff6ff' },
  ];

  const calcTb = document.getElementById('ps-calc-tbody');
  if (calcTb) calcTb.innerHTML = calcRows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'};">
      <td style="padding:8px 14px;font-weight:600;color:${r.color};background:${r.bg};border-bottom:1px solid #e2e8f0;">${r.label}</td>
      <td style="padding:8px 14px;color:#4b5563;border-bottom:1px solid #e2e8f0;font-size:11.5px;">${r.formula}</td>
      <td style="padding:8px 14px;text-align:right;font-weight:700;color:${r.color};border-bottom:1px solid #e2e8f0;">${r.value ? fmt(r.value) : '—'}</td>
    </tr>
  `).join('');

  _w('openModal')('payslip-modal');
}

// ─── PDF 다운로드 ───
export async function downloadPayslipPDF() {
  const btn2 = document.querySelectorAll('#payslip-modal button[onclick="downloadPayslipPDF()"]');
  btn2.forEach(b => { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 생성 중...'; });

  try {
    const el = document.getElementById('payslip-content');
    const canvas = await window.html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false
    });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height / canvas.width) * imgW;

    let y = margin;
    let remaining = imgH;
    let srcY = 0;
    const ratio = canvas.width / imgW;

    while (remaining > 0) {
      const sliceH = Math.min(pageH - margin * 2, remaining);
      const sliceSrcH = sliceH * ratio;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceSrcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceSrcH, 0, 0, canvas.width, sliceSrcH);
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, y, imgW, sliceH);
      remaining -= sliceH;
      srcY += sliceSrcH;
      if (remaining > 0) { pdf.addPage(); y = margin; }
    }

    const empName = document.getElementById('ps-name').textContent;
    const periodTxt = document.getElementById('ps-period').textContent.replace('분 급여', '').replace('년 ', '년').replace('월', '월');
    pdf.save(`${empName}_${periodTxt}_급여명세서.pdf`);
    _w('toast')('PDF 다운로드 완료!', 'success');
  } catch (err) {
    console.error(err);
    _w('toast')('PDF 생성 중 오류가 발생했습니다.', 'error');
  } finally {
    btn2.forEach(b => { b.disabled = false; b.innerHTML = '<i class="fas fa-file-pdf"></i> PDF 다운로드'; });
  }
}

// ─── PDF 알림톡 발송 ───
export async function sendPayslipPDF() {
  const sendBtns = document.querySelectorAll('#ps-send-btn-top, #ps-send-btn-bottom');
  const _kakaoSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>';
  sendBtns.forEach(b => { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF 생성 중...'; });

  try {
    const empName = document.getElementById('ps-name').textContent.trim();
    const empPhone = window._currentPayslipPhone || '';
    const periodTxt = document.getElementById('ps-period').textContent.replace('분 급여', '').replace('년 ', '년').replace('월', '월').trim();
    const fileName = `${empName}_${periodTxt}_급여명세서.pdf`;

    const el = document.getElementById('payslip-content');
    const canvas = await window.html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false
    });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height / canvas.width) * imgW;

    let y = margin;
    let remaining = imgH;
    let srcY = 0;
    const ratio = canvas.width / imgW;

    while (remaining > 0) {
      const sliceH = Math.min(pageH - margin * 2, remaining);
      const sliceSrcH = sliceH * ratio;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceSrcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceSrcH, 0, 0, canvas.width, sliceSrcH);
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, y, imgW, sliceH);
      remaining -= sliceH;
      srcY += sliceSrcH;
      if (remaining > 0) { pdf.addPage(); y = margin; }
    }

    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    window._payslipPdfFile = pdfFile;
    window._payslipEmpPhone = empPhone;
    window._payslipEmpName = empName;
    window._payslipFileName = fileName;

    const payrollId = window._currentPayslipPayrollId;
    const empId = window._currentPayslipEmpId;
    const companyId = window._currentPayslipCompanyId;
    const payYear = window._currentPayslipYear;
    const payMonth = window._currentPayslipMonth;

    if (payrollId && empId && companyId) {
      try {
        const sentBy = sessionStorage.getItem('admin_username') || 'admin';
        const logBody = {
          id: 'psl_' + Date.now() + '_' + empId,
          company_id: companyId, employee_id: empId, payroll_id: payrollId,
          pay_year: payYear, pay_month: payMonth,
          sent_at: new Date().toISOString(), sent_by: sentBy,
          send_method: 'kakao', note: '급여명세서 조회 모달에서 개별 발송'
        };
        await _w('api')('../tables/payroll_send_logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logBody)
        });
        if (typeof window._pssSendLogs !== 'undefined' && window._pssCompanyId === companyId) {
          window._pssSendLogs.push(logBody);
          _w('renderPssLogs')();
          _w('renderPssMonthTabs')();
          _w('_pssUpdateStats')();
        }
      } catch (logErr) {
        console.warn('[발송 로그 저장 실패]', logErr);
      }
    }

    {
      const allCo = getCompanies();
      const _skCo = allCo.find(x => x.id === companyId) || {};
      const _coRep = _w('getCompanyRepGreeting')(_skCo);
      await _w('_sendCompanyNotice')({
        companyId: companyId || '', companyName: _skCo.company_name || '',
        noticeType: 'payslip_individual_sent',
        title: `[급여명세서 발송] ${empName} — ${payYear}년 ${payMonth}월 알림톡 발송`,
        body: `안녕하세요${_coRep}.\n\n소속 근로자의 급여명세서가 카카오 알림톡으로 발송되었습니다.\n\n■ 근로자: ${empName}\n■ 지급 기간: ${payYear}년 ${payMonth}월\n■ 발송 방법: 카카오 알림톡\n■ 발송 시각: ${new Date().toLocaleString('ko-KR')}\n\n발송 상세 내역은 급여명세서 발송 관리 메뉴에서 확인하세요.\n\n${window._BRAND_SIG}`,
        employeeId: empId, employeeName: empName,
      });
    }
    _w('toast')(`✅ ${empName} 급여명세서 PDF 발송 완료!`, 'success');
  } catch (err) {
    console.error('[sendPayslipPDF]', err);
    _w('toast')('PDF 생성 중 오류가 발생했습니다.', 'error');
  } finally {
    sendBtns.forEach(b => { b.disabled = false; b.innerHTML = _kakaoSvg + ' PDF 알림톡 발송'; });
  }
}

// ─── 이메일 개별 발송 ───
export async function sendPayslipEmail() {
  const email = window._currentPayslipEmail || '';
  const empName = document.getElementById('ps-name').textContent || '';
  const payYear = window._currentPayslipYear;
  const payMonth = window._currentPayslipMonth;
  const payrollId = window._currentPayslipPayrollId;
  const empId = window._currentPayslipEmpId;
  const companyId = window._currentPayslipCompanyId;

  if (!email) { _w('toast')('이메일 주소가 등록되어 있지 않습니다.', 'error'); return; }

  const moStr = String(payMonth).padStart(2, '0');
  const fileName = `${empName}_${payYear}년${moStr}월_급여명세서.pdf`;

  const emailBtns = document.querySelectorAll('.ps-email-btn');
  emailBtns.forEach(b => { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중...'; });

  try {
    const blob = await _w('_generatePayslipBlob')(payrollId);
    const file = new File([blob], fileName, { type: 'application/pdf' });
    await _w('_sendEmailWithAttachment')(email, fileName, file);

    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    const logBody = {
      id: 'psl_' + Date.now() + '_' + empId,
      company_id: companyId, employee_id: empId, payroll_id: payrollId,
      pay_year: payYear, pay_month: payMonth,
      sent_at: new Date().toISOString(), sent_by: sentBy,
      send_method: 'email', note: `이메일 발송 (${email})`
    };
    await _w('api')('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logBody)
    });
    if (typeof window._pssSendLogs !== 'undefined' && window._pssCompanyId === companyId) {
      window._pssSendLogs.push(logBody);
      _w('renderPssLogs')();
      _w('renderPssMonthTabs')();
      _w('_pssUpdateStats')();
    }

    {
      const allCo = getCompanies();
      const _seCo = allCo.find(x => x.id === companyId) || {};
      const _coRep = _w('getCompanyRepGreeting')(_seCo);
      await _w('_sendCompanyNotice')({
        companyId: companyId || '', companyName: _seCo.company_name || '',
        noticeType: 'payslip_individual_sent',
        title: `[급여명세서 발송] ${empName} — ${payYear}년 ${payMonth}월 이메일 발송`,
        body: `안녕하세요${_coRep}.\n\n소속 근로자의 급여명세서가 이메일로 발송되었습니다.\n\n■ 근로자: ${empName}\n■ 지급 기간: ${payYear}년 ${payMonth}월\n■ 발송 방법: 이메일 (${email})\n■ 발송 시각: ${new Date().toLocaleString('ko-KR')}\n\n발송 상세 내역은 급여명세서 발송 관리 메뉴에서 확인하세요.\n\n${window._BRAND_SIG}`,
        employeeId: empId, employeeName: empName,
      });
    }
    _w('toast')(`✅ ${empName} 급여명세서를 ${email}로 발송했습니다.`, 'success');
  } catch (err) {
    console.error('[sendPayslipEmail]', err);
    _w('toast')('이메일 발송 중 오류가 발생했습니다.', 'error');
  } finally {
    emailBtns.forEach(b => {
      b.disabled = !(window._currentPayslipEmail);
      b.style.opacity = window._currentPayslipEmail ? '1' : '0.45';
      b.style.cursor = window._currentPayslipEmail ? 'pointer' : 'not-allowed';
      b.innerHTML = '<i class="fas fa-envelope"></i> 이메일 발송';
    });
  }
}

// ═══════════════════════════════════════════
// window 등록 (레거시 스크립트 + HTML onclick 호환)
// ═══════════════════════════════════════════
window.renderPayrolls = renderPayrolls;
window.setPayPage = setPayPage;
window.openPayslipModal = openPayslipModal;
window.downloadPayslipPDF = downloadPayslipPDF;
window.sendPayslipPDF = sendPayslipPDF;
window.sendPayslipEmail = sendPayslipEmail;
