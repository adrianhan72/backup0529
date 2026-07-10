/**
 * modules/contract/contract-lifecycle-print.mjs — 근로계약서 인쇄·문서 생성
 * contract-lifecycle.mjs 에서 분할 (Phase 9)
 */
import { getCompanies, getEmployees, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS } from '../constants.mjs';

const _w = (name) => window[name];
window._w = _w;

export function _getContractPrintCSS(){
  return [
    '*{box-sizing:border-box;margin:0;padding:0;}',
    'body{font-family:"Noto Sans KR",sans-serif;font-size:12.5px;line-height:1.9;color:#1a1a1a;padding:24px 40px;max-width:800px;margin:0 auto;background:#fff;}',
    'h1{text-align:center;font-size:21px;font-weight:900;letter-spacing:7px;margin-bottom:4px;color:#0f172a;padding-bottom:8px;border-bottom:3px double #0f172a;}',
    'h2{text-align:center;font-size:19px;font-weight:900;letter-spacing:5px;margin-bottom:4px;color:#0f172a;padding-bottom:8px;border-bottom:3px double #0f172a;}',
    '.doc-subtitle{text-align:center;font-size:11.5px;color:#64748b;margin-bottom:20px;margin-top:4px;}',
    '.doc-type-banner{text-align:center;margin-bottom:14px;}',
    '.doc-type-badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;}',
    '.doc-parties{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;line-height:1.8;}',
    '.doc-section{margin-bottom:14px;}',
    '.doc-section-title{font-size:12.5px;font-weight:800;color:#0f172a;background:#f1f5f9;border-left:4px solid #4f46e5;padding:5px 10px;margin-bottom:6px;border-radius:0 3px 3px 0;}',
    '.info-table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:11.5px;}',
    '.info-table th{background:#f8fafc;border:1px solid #cbd5e1;padding:5px 9px;font-weight:700;color:#374151;white-space:nowrap;width:30%;text-align:left;}',
    '.info-table td{border:1px solid #cbd5e1;padding:5px 9px;color:#1e293b;}',
    '.info-table tr.total-row th{background:#eff6ff;color:#1d4ed8;}',
    '.info-table tr.total-row td{background:#eff6ff;font-weight:700;}',
    '.doc-note{font-size:10.5px;color:#64748b;margin-top:3px;padding-left:4px;line-height:1.6;}',
    '.doc-text{font-size:12px;margin:4px 0;line-height:1.9;}',
    '.doc-divider{border:none;border-top:1.5px dashed #cbd5e1;margin:12px 0;}',
    '.doc-insurance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:6px;}',
    '.insurance-item{border:1.5px solid #e2e8f0;border-radius:5px;padding:7px;text-align:center;font-size:11.5px;font-weight:600;color:#94a3b8;background:#f8fafc;}',
    '.insurance-item.active{border-color:#818cf8;color:#4f46e5;background:#eef2ff;}',
    '.ins-icon{display:block;font-size:13px;margin-bottom:1px;}',
    '.doc-sign-date{text-align:center;font-size:12.5px;margin:20px 0 14px;padding:9px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;color:#374151;line-height:1.9;}',
    '.doc-sign{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:0;}',
    '.doc-sign-box{border:1.5px solid #cbd5e1;border-radius:8px;padding:11px 13px;}',
    '.doc-sign-box .sign-title{font-size:12px;font-weight:800;color:#374151;margin-bottom:8px;text-align:center;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}',
    '.sign-info-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:9px;}',
    '.sign-info-table th{background:#f8fafc;border:1px solid #e2e8f0;padding:4px 7px;font-weight:700;color:#374151;white-space:nowrap;width:30%;}',
    '.sign-info-table td{border:1px solid #e2e8f0;padding:4px 7px;color:#1e293b;}',
    '.sign-stamp-area{text-align:center;padding-top:2px;}',
    '.sign-stamp{width:52px;height:52px;border:2px dashed #cbd5e1;border-radius:50%;margin:0 auto 2px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;line-height:1.4;}',
    '.sign-label{font-size:10px;color:#94a3b8;}',
    '.highlight{font-weight:700;color:#1d4ed8;}',
    '.daily-highlight{font-weight:700;color:#d97706;}',
    '.doc-probation-box{background:#fefce8;border:1.5px solid #fde047;border-radius:7px;padding:10px 13px;margin-top:6px;font-size:11.5px;line-height:1.8;color:#854d0e;}',
    '.doc-daily-note{background:#fff7ed;border:1.5px solid #fed7aa;border-radius:7px;padding:10px 13px;margin-top:8px;font-size:11.5px;line-height:1.8;color:#9a3412;}',
    '@media print{@page{margin:15mm 14mm;}body{padding:0;font-size:11.5px;max-width:100%;}',
    '.doc-section-title{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '.info-table th{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '.info-table tr.total-row th,.info-table tr.total-row td{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '.insurance-item.active{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '.doc-sign{page-break-inside:avoid;}',
    '.doc-parties{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}'
  ].join('');
}

/**
 * 제3조 ② 요일별 근무시간표 HTML 생성 (work-schedule-table 동일 구조)
 */
export function buildScheduleTableHTML(activeDays){
  const dayOrder  = ['mon','tue','wed','thu','fri','sat','sun'];
  const daysKr    = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
  const dayColors = {sat:'#2563eb', sun:'#dc2626'};
  const toM = function(t){ if(!t) return null; var p=t.split(':'); return parseInt(p[0])*60+parseInt(p[1]); };
  const sortedDays = activeDays.slice().sort(function(a,b){ return dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day); });

  // breaks 배열 정규화: 없으면 레거시 brk_start/brk_end 폴백
  var normBreaks = function(s){
    if(Array.isArray(s.breaks) && s.breaks.length) return s.breaks;
    if(s.brk_start||s.brk_end) return [{s:s.brk_start||'', e:s.brk_end||''}];
    return [];
  };
  var totalBrkMins = function(s){
    return normBreaks(s).reduce(function(sum,b){
      var bs=toM(b.s), be=toM(b.e);
      return sum+((bs!==null&&be!==null&&be>bs)?(be-bs):0);
    },0);
  };

  var rows = sortedDays.map(function(s){
    var isWork = !!(s.start && s.end);
    var cls   = s.day==='sat' ? 'day-sat' : s.day==='sun' ? 'day-sun' : '';
    var color = dayColors[s.day] || '#1e293b';
    var sm=toM(s.start), em=toM(s.end);
    var brk = totalBrkMins(s);
    var mins = (sm!==null&&em!==null&&em>sm) ? Math.max(0,em-sm-brk) : 0;
    var h = mins/60;
    var hrs = mins===0 ? '-' : (Number.isInteger(h)?h:h.toFixed(1))+'시간';
    var chk = isWork ? '✔' : '';
    // 휴게 슬롯 표시: 복수 슬롯을 줄바꿈으로
    var brkSlots = normBreaks(s);
    var brkCell = brkSlots.length
      ? brkSlots.map(function(b){ return (b.s||'') + (b.s&&b.e?' ~ ':'') + (b.e||''); }).join('<br/>')
      : '-';
    return '<tr class="'+cls+'">'+'<td style="text-align:center;">'+chk+'</td>'+'<td style="text-align:center;"><span class="day-label" style="color:'+color+';">'+( daysKr[s.day]||s.day)+'</span></td>'+'<td style="text-align:center;">'+(s.start||'')+'</td>'+'<td style="text-align:center;">'+(s.end||'')+'</td>'+'<td class="td-brk" style="text-align:center;line-height:1.6;">'+brkCell+'</td>'+'<td style="text-align:center;"><span class="computed-h">'+hrs+'</span></td>'+'<td></td>'+'</tr>';
  }).join('');

  var totalMins = sortedDays.reduce(function(sum,s){
    var sm=toM(s.start),em=toM(s.end);
    if(sm===null||em===null||em<=sm) return sum;
    return sum+Math.max(0,em-sm-totalBrkMins(s));
  },0);
  var wDays  = sortedDays.filter(function(s){ return !!(s.start && s.end); }).length;
  var avgDay = wDays>0 ? totalMins/wDays/60 : 0;
  var weekH  = totalMins/60;
  var fmtH   = function(h){ return Number.isInteger(h)?h:h.toFixed(1); };

  return '<div class="work-schedule-wrap">'
    +'<table class="work-schedule-table">'
    +'<thead><tr>'
    +'<th style="width:34px;">근무</th>'
    +'<th style="width:30px;">요일</th>'
    +'<th style="width:88px;">출근</th>'
    +'<th style="width:88px;">퇴근</th>'
    +'<th class="th-brk">휴게시간</th>'
    +'<th style="width:60px;">소정시간</th>'
    +'<th>비고</th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table>'
    +'<div class="wsh-total">'
    +'주 근무일수: <span>'+wDays+'</span>일 &nbsp;|&nbsp;'
    +'주 소정근로시간: <span>'+fmtH(weekH)+'</span>시간 &nbsp;|&nbsp;'
    +'일 평균 소정근로시간: <span>'+fmtH(avgDay)+'</span>시간'
    +'</div>'
    +'</div>';
}

/**
 * DB 데이터(c=계약, emp=직원, co=회사)를 받아 계약서 HTML 생성
 * 유형별 분기: 정규직 / 정규직 수습 / 계약직 / 계약직 수습 / 일용직
 */
export function generateContractHTMLFromData(c, emp, co){
  // contract_type 우선 — emp.employment_category는 직원 현재 상태이므로
  // 채용 확정 후 생성된 계약(contract_type='정규직') 계약서가 수습 양식으로
  // 출력되는 문제를 방지. emp.employment_category는 폴백으로만 사용.
  // 계약예정 상태인 경우 수습 카테고리 정규화 (채용확정 → 본계약 전환이므로 수습 아님)
  const _ctTypeRaw = c.contract_type || emp.employment_category || '정규직';
  // 영문 정규화 → 내부 비교용
  const _ctTypeNorm = typeof normalizeContractType === 'function'
    ? _w('normalizeContractType')(_ctTypeRaw) : _ctTypeRaw;
  const _isPendingContract = (c.status===CONTRACT_STATUS.PENDING);
  // 계약예정 시 수습→본계약 전환: 정규직 수습→정규직, 계약직 수습→계약직
  const _ctTypeFinal = _isPendingContract
    ? (_ctTypeNorm ===CONTRACT_TYPE.REGULAR_PROBATION ? CONTRACT_TYPE.REGULAR : _ctTypeNorm ===CONTRACT_TYPE.FIXED_PROBATION ? CONTRACT_TYPE.FIXED : _ctTypeNorm)
    : _ctTypeNorm;
  // 표시용 한글 라벨
  const ctType = typeof contractTypeLabel === 'function'
    ? _w('contractTypeLabel')(_ctTypeFinal) : _ctTypeFinal;
  const isDaily  = _ctTypeFinal ===CONTRACT_TYPE.DAILY;
  const isProb   = _ctTypeFinal ===CONTRACT_TYPE.REGULAR_PROBATION || _ctTypeFinal ===CONTRACT_TYPE.FIXED_PROBATION;
  const isRegular= _ctTypeFinal ===CONTRACT_TYPE.REGULAR || _ctTypeFinal ===CONTRACT_TYPE.REGULAR_PROBATION;

  const fmt  = v => Number(v||0).toLocaleString('ko-KR');
  const row  = (label, val, cls='') => `<tr${cls?' class="'+cls+'"':''}><th>${label}</th><td>${val||'—'}</td></tr>`;
  const wons = v => fmt(v) + '원';

  // ── 날짜 포맷 ──
  const fmtDateKr = str => {
    if(!str) return '';
    try{ return new Date(str).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'}); }
    catch(e){ return str; }
  };
  const contractDateKr = fmtDateKr(c.contract_start) || new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});

  // ── 계약기간 ──
  let contractPeriod = '';
  if(isDaily){
    contractPeriod = `${c.contract_start||'—'} ~ ${c.contract_end||'별도 지정'}`;
  } else if(isRegular){
    contractPeriod = `${c.contract_start||'—'}부터 <strong>기간의 정함 없음</strong>`;
  } else {
    contractPeriod = `${c.contract_start||'—'} ~ ${c.contract_end||'미정'}`;
  }

  // ── 수습기간 계산 ──
  let probEndDate = '';
  const probMonths = isProb ? (parseInt(c.probation_months)||3) : 0;
  const probPct    = isProb ? (parseFloat(c.probation_pct)||80) : 0;
  const probAmt    = isProb ? (parseFloat(c.probation_amt)||0) : 0;
  if(isProb && c.contract_start){
    const st = new Date(c.contract_start);
    st.setMonth(st.getMonth() + probMonths);
    st.setDate(st.getDate() - 1);
    probEndDate = fmtDateKr(st.toISOString().slice(0,10));
  }
  const probStartKr = fmtDateKr(c.contract_start);

  // ── 근무 스케줄 파싱 ──
  let schedule = [];
  if(c.schedule_json){
    try{
      const _parsed = JSON.parse(c.schedule_json);
      schedule = Array.isArray(_parsed) ? _parsed : [];  // 배열 아닌 경우(객체·null 등) 빈 배열로 폴백
    } catch(e){
      console.warn('[schedule_json 파싱 실패]', e, c.schedule_json);
    }
  }
  let activeDays = Array.isArray(schedule)
    ? schedule.filter(s=>s.active===true||s.active===1||s.active==='true')
    : [];  // schedule이 배열이 아닌 경우 최종 방어

  // schedule_json 없을 경우 레거시 필드로 폴백 스케줄 생성
  if(activeDays.length === 0){
    const _DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];
    const _start    = c.start_time || '09:00';
    const _end      = c.end_time   || '18:00';
    const _wDays    = parseInt(c.work_days_per_week || c.days_per_week || 5);
    // 휴게시간 추정: break_mins 필드 기반, 없으면 60분
    const _brkMins  = parseInt(c.break_mins || 60);
    const _toM      = t=>{ const p=t.split(':'); return parseInt(p[0])*60+parseInt(p[1]); };
    const _fmtT     = m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    const _sMins    = _toM(_start);
    const _eMins    = _toM(_end);
    const _halfWork = Math.round((_eMins - _sMins - _brkMins) / 2);
    const _brkStart = _brkMins > 0 ? _fmtT(_sMins + _halfWork) : '';
    const _brkEnd   = _brkMins > 0 ? _fmtT(_sMins + _halfWork + _brkMins) : '';
    activeDays = _DAY_KEYS.map((key, i)=>{
      const active = i < _wDays;
      return {
        day: key, active: true,
        start:     active ? _start    : '',
        end:       active ? _end      : '',
        brk_start: active ? _brkStart : '',
        brk_end:   active ? _brkEnd   : '',
        note: ''
      };
    });
  }
  const dayNamesK  = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
  const dayNamesFull = {mon:'월요일',tue:'화요일',wed:'수요일',thu:'목요일',fri:'금요일',sat:'토요일',sun:'일요일'};

  // 근무 요일 문자열
  let workDaysStr = '';
  if(activeDays.length){
    workDaysStr = activeDays.map(s=>dayNamesFull[s.day]||s.day).join(', ');
  } else if(c.work_days){
    workDaysStr = c.work_days;
  } else {
    workDaysStr = '월요일 ~ 금요일';
  }

  // 대표 출퇴근 시간
  const startTime = activeDays[0]?.start || c.start_time || '09:00';
  const endTime   = activeDays[activeDays.length-1]?.end || c.end_time || '18:00';

  // 소정근로시간
  const hoursPerDay = parseFloat(c.hours_per_day||c.daily_hours||8);
  const daysPerWeek = parseInt(c.days_per_week||c.work_days_count||(activeDays.length||5));
  const weekHours   = Math.round(hoursPerDay * daysPerWeek * 10) / 10;

  // 휴게시간 — breaks 배열 우선, 없으면 레거시 brk_start/brk_end 폴백
  const _normBreaks = s => {
    if(Array.isArray(s.breaks) && s.breaks.length) return s.breaks;
    if(s.brk_start||s.brk_end) return [{s:s.brk_start||'', e:s.brk_end||''}];
    return [];
  };
  let breakHTML = '';
  // 요일별 모든 슬롯을 수집 → 동일 시간대끼리 묶어 표시
  const uniqBrk = {};
  activeDays.forEach(day=>{
    _normBreaks(day).forEach(b=>{
      if(!b.s || !b.e) return;
      const key = `${b.s}~${b.e}`;
      if(!uniqBrk[key]) uniqBrk[key] = new Set();
      uniqBrk[key].add(dayNamesK[day.day]||day.day);
    });
  });
  if(Object.keys(uniqBrk).length){
    breakHTML = Object.entries(uniqBrk).map(([time, daysSet])=>{
      const [hs,ms] = time.split('~')[0].split(':').map(Number);
      const [he,me] = time.split('~')[1].split(':').map(Number);
      const mins = (he*60+me)-(hs*60+ms);
      return `[${[...daysSet].join('·')}] ${time} (${mins}분)`;
    }).join(', ');
  } else {
    breakHTML = '1일 근로시간 4시간인 경우 30분, 8시간인 경우 1시간 이상';
  }

  // ── 임금 ──
  const baseSalary        = parseFloat(c.base_salary||0);
  const weeklyHol         = parseFloat(c.weekly_holiday_pay||0);
  const posAllow          = parseFloat(c.position_allowance||0);
  // 차량지원비 = 구 교통비 + 구 자가운전보조금 합산 (레거시 하위호환)
  const carAllow          = parseFloat(c.transportation_allowance||c.car_maintenance||0) + parseFloat(c.self_driving_allowance||0);
  const carPayType        = c.transportation_pay_type||c.self_driving_pay_type||'fixed';
  const remoteAreaAllow   = parseFloat(c.remote_area_allowance||0);
  // remoteAreaPayType: 항상 'fixed' — 선언 생략
  const mealAllow         = parseFloat(c.meal_allowance||0);
  const mealPayType       = c.meal_pay_type||'fixed';
  const researchAllow     = parseFloat(c.research_allowance||0);
  const researchPayType   = c.research_pay_type||'fixed';
  const siteAllow         = parseFloat(c.site_allowance||0);
  const skillAllow        = parseFloat(c.skill_allowance||0);
  const licenseAllow      = parseFloat(c.license_allowance||0);
  const commAllow         = parseFloat(c.communication_allowance||0);
  const commPayType       = c.communication_pay_type||'fixed';
  const fitnessAllow      = parseFloat(c.fitness_allowance||0);
  const fitnessPayType    = c.fitness_pay_type||'fixed';
  const selfDevAllow      = parseFloat(c.self_dev_allowance||0);
  const selfDevPayType    = c.self_dev_pay_type||'fixed';
  const bookAllow         = parseFloat(c.book_allowance||0);
  const bookPayType       = c.book_pay_type||'fixed';
  const overseasAllow     = parseFloat(c.overseas_allowance||0);
  const overseasPayType   = c.overseas_pay_type||'fixed';
  // acfg: allowance_config가 있으면 그 키 값으로 제어, 없으면 null (값>0이면 무조건 표시)
  const _rawAcfg = (co && co.allowance_config) ? co.allowance_config : null;
  // acfgShow(key, amount): allowance_config 없으면 amount>0으로만 판단, 있으면 cfg[key] && amount>0
  const acfgShow = (key, amount) => amount > 0 && (_rawAcfg === null || !!_rawAcfg[key]);
  const fixedOtPay        = parseFloat(c.fixed_ot_pay||0);
  const fixedNightPay     = parseFloat(c.fixed_night_pay||0);
  const fixedHolPay       = parseFloat(c.fixed_hol_pay||0);
  const monthlySal        = parseFloat(c.monthly_salary_agreed||0);
  const annualSal         = parseFloat(c.annual_salary||0);
  const hourlyWage        = parseFloat(c.hourly_wage||0);
  const dailyWage         = parseFloat(c.daily_wage||c.base_salary||0);
  // 통상임금 지급유형 뱃지 생성 헬퍼
  const payTypeBadge = (type) => type==='fixed'
    ? '<span style="font-size:10px;color:#1d4ed8;background:#dbeafe;border-radius:4px;padding:1px 6px;margin-left:6px;font-weight:700;">매월 정기지급 (통상임금 포함)</span>'
    : '<span style="font-size:10px;color:#92400e;background:#fef3c7;border-radius:4px;padding:1px 6px;margin-left:6px;font-weight:700;">출근일수에 따름 (통상임금 제외)</span>';
  // 통상임금 포함 여부: fixed = 포함, 그 외(daily/receipt) = 제외
  const isFixedType = (type) => (type||'fixed') === 'fixed';

  // 임금지급일
  const payDayStr = co.pay_day ? `매월 ${co.pay_day}일` : '매월 말일';

  // ── 주민등록번호(외국인번호) 마스킹: 앞 7자리 이후 * 처리 ──
  const idNum = emp.id_number || '';
  const maskedId = (()=>{
    if(!idNum) return '';
    // 하이픈 제거 후 처리
    const s = String(idNum).replace(/-/g,'');
    if(s.length === 0) return '';
    // 앞 6자리 + 하이픈 + 뒷첫자리(7번째) + ******
    const front = s.slice(0, 6);          // 생년월일 6자리
    const mid   = s.slice(6, 7);          // 뒷 첫 번째 자리
    const stars = '******';               // 나머지 마스킹
    if(s.length <= 6) return front;       // 앞 6자리만 있는 경우
    return front + '-' + mid + stars;
  })();

  // ── 입사일 포맷 ──
  const hireDateStr = emp.hire_date || '';



  // ── 유형별 배지 색상 ──
  const typeBadgeStyle = {
    '정규직':      'background:#dbeafe;color:#1d4ed8;',
    '정규직 수습': 'background:#cffafe;color:#0e7490;',
    '계약직':      'background:#ede9fe;color:#6d28d9;',
    '계약직 수습': 'background:#fce7f3;color:#9d174d;',
    '일용직':      'background:#fef3c7;color:#b45309;',
  }[ctType] || 'background:#f3f4f6;color:#374151;';

  // ── 유형별 제목 ──
  const titleByType = {
    '정규직':      '근 로 계 약 서',
    '정규직 수습': '근 로 계 약 서',
    '계약직':      '근 로 계 약 서',
    '계약직 수습': '근 로 계 약 서',
    '일용직':      '일 용 근 로 계 약 서',
  };
  const subtitleByType = {
    '정규직':      '(표준근로계약서 — 정규직)',
    '정규직 수습': '(표준근로계약서 — 수습직)',
    '계약직':      '(표준근로계약서 — 기간제 근로자)',
    '계약직 수습': '(표준근로계약서 — 기간제 수습직)',
    '일용직':      '(표준근로계약서 — 일용직)',
  };

  // ── 임금 섹션 ──
  let salarySection = '';
  if(isDaily){
    salarySection = `
      <div class="doc-section">
        <div class="doc-section-title">__ART_SALARY__</div>
        <table class="info-table">
          <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
          ${row('일급여', `<strong class="daily-highlight">${fmt(dailyWage)}원</strong>`)}
          ${row('임금 지급일', payDayStr + ' (현금 또는 계좌이체)')}
          ${row('지급 방법', '현금 지급 또는 근로자 명의 계좌 직접 입금')}
        </table>
        <div class="doc-note">※ 제세공과금(소득세, 4대 보험료 등)은 관계법령에 따라 공제 후 지급한다.</div>
        <div class="doc-daily-note">
          <strong>📌 일용직 임금 안내</strong><br>
          • 일급여는 실제 근로일수에 따라 지급합니다.<br>
          • 초과 근무 시 근로기준법 제56조에 따라 통상시급의 150%를 가산하여 지급합니다.<br>
          • 야간(22:00~06:00) 및 휴일 근로 시 법정 가산율을 적용합니다.
        </div>
      </div>`;
  } else {
    // salary_start_date = contract_start 통합 — contract_start 직접 참조
    const salaryStartDate = c.contract_start || '';
    const salaryPeriodRow = (isRegular && salaryStartDate)
      ? row('연봉적용 시작일', salaryStartDate)
      : '';
    salarySection = `
      <div class="doc-section">
        <div class="doc-section-title">__ART_SALARY__</div>
        ${isRegular && annualSal > 0 ? `
        <p class="doc-text">① "사용자"는 "근로자"의 임금에 관하여 연봉제를 원칙으로 하며, 연봉에 관한 사항의 기간은 다음과 같다.</p>
        <table class="info-table">
          <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
          ${row('연봉', '<strong>' + fmt(annualSal) + '원</strong>')}
          ${salaryPeriodRow}
        </table>
        <p class="doc-text">② 월지급액은 업무의 특성과 계산의 용이성을 감안하여 법정 제수당을 포함한 포괄임금제도에 의해 매월 지급됨을 원칙으로 한다. 단, 수습기간의 급여는 관계법령에 위반되지 않는 한도(정규직은 최저임금의 90%, 계약직은 최저임금액)에서 별도로 정할 수 있다.</p>
        ` : ''}
        <p class="doc-text">③ 제⑤항의 임금지급기에 따른 급여 구성은 다음과 같다.</p>
        <table class="info-table">
          <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
          ${row('기본급', `<strong class="highlight">${fmt(baseSalary)}원</strong>`)}
          ${weeklyHol > 0      ? row('주휴수당',           `${fmt(weeklyHol)}원`)   : ''}
          ${fixedOtPay > 0    ? row('고정 연장근로수당', `${fmt(fixedOtPay)}원`)   : ''}
          ${fixedNightPay > 0 ? row('고정 야간근로수당', `${fmt(fixedNightPay)}원`) : ''}
          ${fixedHolPay > 0   ? row('고정 휴일근로수당', `${fmt(fixedHolPay)}원`)   : ''}
          ${posAllow > 0       ? row('직책수당',         `${fmt(posAllow)}원`)     : ''}
          ${carAllow > 0        && isFixedType(carPayType)                              ? row('차량지원비',    `${fmt(carAllow)}원`)        : ''}
          ${remoteAreaAllow > 0                                                          ? row('벽지수당',     `${fmt(remoteAreaAllow)}원`) : ''}
          ${mealAllow > 0       && isFixedType(mealPayType)                             ? row('식대',         `${fmt(mealAllow)}원`)       : ''}
          ${researchAllow > 0   && isFixedType(researchPayType)                         ? row('연구활동비',   `${fmt(researchAllow)}원`)   : ''}
          ${acfgShow('site',          siteAllow)                                         ? row('현장수당',     `${fmt(siteAllow)}원`)       : ''}
          ${acfgShow('skill',         skillAllow)                                        ? row('기술수당',     `${fmt(skillAllow)}원`)      : ''}
          ${acfgShow('license',       licenseAllow)                                      ? row('면허수당',     `${fmt(licenseAllow)}원`)    : ''}
          ${acfgShow('communication', commAllow)    && isFixedType(commPayType)          ? row('통신비',       `${fmt(commAllow)}원`)       : ''}
          ${acfgShow('fitness',       fitnessAllow) && isFixedType(fitnessPayType)       ? row('체력증진비',   `${fmt(fitnessAllow)}원`)    : ''}
          ${acfgShow('self_dev',      selfDevAllow) && isFixedType(selfDevPayType)       ? row('자기계발비',   `${fmt(selfDevAllow)}원`)    : ''}
          ${acfgShow('book',          bookAllow)    && isFixedType(bookPayType)          ? row('도서지원비',   `${fmt(bookAllow)}원`)       : ''}
          ${acfgShow('overseas',      overseasAllow)&& isFixedType(overseasPayType)      ? row('해외근무수당', `${fmt(overseasAllow)}원`)   : ''}
          <tr class="total-row"><th>월 약정임금 합계</th><td><strong class="highlight">${fmt(monthlySal)}원</strong></td></tr>
          ${hourlyWage > 0 ? row('통상시급', `${fmt(hourlyWage)}원/시간`) : ''}
          ${row('임금 지급일', payDayStr)}
          ${row('지급 방법', '근로자 명의 계좌 직접 입금')}
        </table>
        <div class="doc-note">※ 제세공과금(4대 보험료, 소득세 등)은 관계법령에 따라 공제 후 지급한다.</div>
        <p class="doc-text">④ 위 급여는 세전금액으로 법정세금 및 보험료(본인부담금)는 "근로자"가 부담한다.</p>
        <p class="doc-text">⑤ 위 급여는 매월 초일부터 말일까지 기산하여 매월 25일에 본인의 계좌로 입금하며 지급일이 휴일인 경우는 순차적으로 그 전일에 지급함을 원칙으로 한다. 다만, 본인이 원하는 경우 직접 지급할 수 있다.</p>
        <p class="doc-text">⑥ "사용자"는 "근로자"의 결근, 지각, 휴직, 계약만료전 근로관계종료 기타 사유에 의하여 근무하지 아니한 기간에 대한 임금을 감액하여 지급할 수 있다.</p>
      </div>`;
  }

  // ── 퇴직급여 섹션 (번호는 return 블록에서 art() 로 부여) ──
  const retirementSection = `
    <div class="doc-section">
      <div class="doc-section-title">__ART_RETIREMENT__</div>
      <p class="doc-text">① "사용자"는 "근로자"의 퇴직 시에 계속근로년수 1년에 대하여 30일분의 평균임금을 퇴직급여로서 지급한다.</p>
      <p class="doc-text">② "사용자"는 계속근로년수 1년 이상이 된 "근로자"의 신청이 있고 주택구입 등 대통령령이 정하는 사유와 요건을 갖춘 경우에 퇴직금을 중간정산 할 수 있다.</p>
      <p class="doc-text">③ "근로자"는 퇴직금 중간정산을 원하는 경우 그 사유를 명시한 퇴직금중간정산 신청서와 주택구입 등 대통령령이 정하는 사유와 요건을 갖추었다는 것을 증빙할 수 있는 서류를 제출하여야 한다.</p>
      <p class="doc-text">④ 퇴직급여는 퇴직한 날 이후 최초 임금지급기일에 지급하기로 하며, 중간정산시는 중간정산 신청 후 도래하는 임금지급 기일에 지급하기로 한다.</p>
      <p class="doc-text">⑤ 퇴직연금제도를 도입할 경우 제①항~제③항에도 불구하고 퇴직급여와 관련된 사항은 퇴직연금규약에 따른다.</p>
    </div>`;

  // ── 해고 등 섹션 (번호는 return 블록에서 art() 로 부여) ──
  const dismissalSection = `
    <div class="doc-section">
      <div class="doc-section-title">__ART_DISMISSAL__</div>
      <p class="doc-text">① 해고 등 징계는 취업규칙에 의한다.</p>
      <p class="doc-text">② "사용자"는 위①의 징계 사유가 발생한 경우 및 정당한 업무지시의 범위내에서 "근로자"에게 해당사항에 대한 경위서 제출을 요구할 수 있고, "근로자"는 특별한 사정이 없는 한 경위서를 제출하여야 한다.</p>
      <p class="doc-text">③ 기타 "근로자"는 별도의 근무수칙을 준수하여야 한다.</p>
    </div>`;

  // ── 수습 조건 섹션 (번호는 return 블록에서 art() 로 부여) ──
  const probSection = isProb ? `
    <div class="doc-section">
      <div class="doc-section-title">__ART_PROB__</div>
      <table class="info-table">
        <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
        ${row('수습기간', `${probStartKr} ~ ${probEndDate} (${probMonths}개월)`)}
        ${row('수습 임금 (월)', `<strong>${fmt(probAmt)}원</strong> (약정임금의 ${probPct}%)`)}
      </table>
      <div class="doc-probation-box">
        <strong>📋 수습기간 안내</strong><br>
        • 수습기간 중 임금은 위 금액을 적용하며, 수습 종료 후 약정임금 전액을 지급합니다.<br>
        • 수습기간 중 업무 부적격 판정 시 사업주는 계약을 해지할 수 있습니다.<br>
        • 수습기간은 근속기간에 포함하여 산정합니다.
      </div>
    </div>` : '';

    // ── 동적 조항 번호 카운터 ──
    // art(title) 을 호출 순서대로 부르면 제1조·제2조·… 가 자동 생성됨
    // 조건부 섹션이 빠져도 번호가 자동으로 당겨지므로 연번 보장
    let _artNo = 0;
    const art = (title) => `제${++_artNo}조 ${title}`;

    // ── 기간제 특별 고지 (content만 쿠우고, return 블록에서 art()로 번호 부여) ──
    const fixedTermContent = (!isRegular && !isDaily) ? `

    <div class="doc-probation-box" style="background:#f5f3ff;border-color:#c4b5fd;color:#4c1d95;">
      <strong>📋 기간제법 적용 안내</strong><br>
      • 본 계약은 <strong>기간제 및 단시간근로자 보호 등에 관한 법률</strong>의 적용을 받습니다.<br>
      • 동일 사업장에서 2년을 초과하여 계속 근무 시 기간의 정함이 없는 근로자로 간주될 수 있습니다.<br>
      • 계약기간 만료 시 근로관계는 자동으로 종료되며, 별도의 해고 절차 없이 종료됩니다.
    </div>` : '';

  // ── 동적 태그명 사전 계산 (template literal 내 동적 태그명 패턴은 HTML 파서를 오작동시킴) ──
  const _hTag   = isDaily ? 'h2' : 'h1';
  const _hOpen  = '<' + _hTag + '>';
  const _hClose = '</' + _hTag + '>';
  const titleHTML = _hOpen + (titleByType[ctType]||'근 로 계 약 서') + _hClose;

  return `
  ${(c.status===CONTRACT_STATUS.VOIDED || c.is_voided_by_amend) ? `
  <div style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0.12;">
    <div style="font-size:80px;font-weight:900;color:#dc2626;transform:rotate(-30deg);white-space:nowrap;border:8px solid #dc2626;padding:20px 60px;border-radius:16px;">파기</div>
  </div>` : ''}
  ${titleHTML}


  <div class="doc-parties">
    <p><strong>${co.company_name||'(회사명)'}</strong>(이하 "사업주"라 함)과 <strong>${emp.name||'(근로자명)'}</strong>(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">◼ 사업주 정보</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('상호(사업장명)', co.company_name)}
      ${row('사업자등록번호', co.business_number)}
      ${row('소재지(주소)',   co.address)}
      ${row('대표자(사용자)', _w('getCompanyRepName')(co))}
      ${row('대표 연락처',   co.phone)}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">◼ 근로자 정보</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('성명', emp.name)}
      ${row('주민등록번호(외국인번호)', maskedId)}
      ${row('입사일', hireDateStr)}
      ${row('주소', emp.address)}
      ${row('연락처', emp.phone)}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(의무)')}</div>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:6px 0;">
      "근로자"는 당사에 채용됨에 따라 상호 신뢰를 바탕으로 근로계약을 체결하며 당사의 운영규정을 준수하고 성실히 업무를 수행할 의무를 진다.
    </p>
  </div>

  <div class="doc-divider"></div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(근무장소 및 업무내용)')}</div>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">
      ① "근로자"는 아래의 근무장소에서 근무함을 원칙으로 한다. 다만, "사용자"는 업무상 필요한 경우 "근로자"의 근무장소를 변경할 수 있다.
    </p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 8px;">
      ② "근로자"의 담당업무는 아래와 같으며, 그 외 "사용자"가 지시하는 업무 및 "사용자"가 별도로 부여한 업무를 수행한다. 다만, "사용자"는 업무상 필요한 경우 "근로자"의 담당업무를 변경할 수 있다.
    </p>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('근무 장소', co.address || co.company_name)}
      ${row('담당 업무', emp.job_description || '회사가 지정하는 업무')}
      ${emp.department ? row('부서', emp.department) : ''}
      ${emp.position   ? row('직책/직위', emp.position) : ''}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(계약기간 및 근무시간)')}</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('계약기간', contractPeriod)}
      ${row('고용형태', `<span style="${typeBadgeStyle}padding:1px 8px;border-radius:10px;font-weight:700;font-size:11px;">${ctType}</span>`)}
      ${isProb ? row('수습기간', `${probStartKr} ~ ${probEndDate} (${probMonths}개월)`) : ''}
    </table>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:8px 0 4px;">
      ① 계약의 갱신은 계약기간 만료 1개월 전 협의하는 것으로 하며, 만료 전까지 당사자간 별도의 의사표시 또는 협의가 없는 경우 고용기간이 종료되는 것으로 한다.
    </p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">
      ② 정규 근로시간은 주 40시간제를 원칙으로 하며, 근무시간은 다음과 같다.
    </p>
    ${_w('buildScheduleTableHTML')(activeDays)}
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:8px 0 4px;">
      ③ 제②항에 명시된 시간 외에 "사용자"는 "근로자"에게 업무상의 필요에 의하여 연장근무, 야간근무 및 휴일근무를 명할 수 있으며 "근로자"는 이에 포괄적으로 합의한 것으로 본다.
    </p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">
      ④ "근로자"는 업무상 연장, 야간 및 휴일 근로가 필요한 경우 "사용자"에게 연장근로신청서 등을 제출하여 사전 승인을 받아야 한다. 사전 승인 없는 임의의 연장 등은 인정하지 아니할 수 있다.
    </p>
  </div>

  ${!isDaily ? `
  <div class="doc-section">
    <div class="doc-section-title">${art('(연차휴가)')}</div>
    <p class="doc-text">연차유급휴가는 단체협약, 취업규칙 및 근로기준법이 정하는 바에 따라 부여한다.</p>
  </div>
  <div class="doc-section">
    <div class="doc-section-title">${art('(휴일)')}</div>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">① "사용자"는 1주일에 소정근로일수를 개근한 경우 주휴일을 부여한다.</p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">② 주휴일과 근로자의 날(5월 1일)은 유급휴일로, 토요일은 무급휴일로 한다. 단, 휴일이 중복되는 경우 1일의 휴일로 처리한다.</p>
    <p style="font-size:13px;line-height:1.9;color:#374151;padding:4px 0 4px;">③ 기타 휴일에 관한 사항은 "공휴일에 관한 법률"에 따른다.</p>
  </div>` : ''}
  ${salarySection.replace('__ART_SALARY__', art('(임금)'))}
  ${retirementSection.replace('__ART_RETIREMENT__', art('(퇴직급여)'))}
  ${dismissalSection.replace('__ART_DISMISSAL__', art('(해고 등)'))}
  ${fixedTermContent ? `
  <div class="doc-section" style="border-left-color:#7c3aed;">
    <div class="doc-section-title" style="color:#6d28d9;">${art('(기간제 근로자 고지사항)')}</div>
    ${fixedTermContent}
  </div>` : ''}

  <div class="doc-section">
    <div class="doc-section-title">${art('(근로계약서 교부)')}</div>
    <p class="doc-text">"사용자"는 근로계약을 체결함과 동시에 본 계약서를 사본하여 "근로자"의 교부요구와 관계없이 "근로자"에게 교부한다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(비밀유지 및 업무의 인수·인계)')}</div>
    <p class="doc-text">① "근로자"는 동의한 연봉에 관한 비밀을 누설하지 아니한다.</p>
    <p class="doc-text">② "근로자"는 근로기간 중 지득한 "사용자"의 업무에 관한 사항 및 업무외 주요사항에 대하여 그 경중을 막론하고 누설하지 아니한다. 근로기간이 종료된 이후에도 또한 같다.</p>
    <p class="doc-text">③ "근로자"는 퇴직시 퇴직일로부터 30일 이전에 "사용자"에게 그 사실을 고지하고 업무 인수·인계에 협조한다.</p>
    <p class="doc-text">④ "사용자"는 "근로자"가 위 제①항 또는 제②항을 위반하였을 경우 징계 및 민∙형사상의 조치를 취할 수 있다. 이에 대해 "근로자"는 동의한 것으로 본다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(기타)')}</div>
    <p class="doc-text">기타 본 계약서상 명시되지 않은 사항은 당사의 단체협약, 취업규칙, 근로기준법 및 관계법령에서 정하는 바에 따른다.</p>
    ${c.note ? `<p class="doc-text" style="margin-top:8px;"><strong>【특이사항】</strong> ${c.note}</p>` : ''}
  </div>

  ${isProb ? probSection.replace('__ART_PROB__', art('(수습기간 및 수습임금에 관한 특약)')) : ''}

  <div class="doc-sign-date">
    위와 같이 근로계약을 체결하고 서명날인한다.<br>
    <strong>${contractDateKr}</strong>
  </div>

  <div class="doc-sign">
    <div class="doc-sign-box">
      <div class="sign-title">사업주 (사용자)</div>
      <table class="sign-info-table">
        <tr><th>상호</th><td>${co.company_name||''}</td></tr>
        <tr><th>주소</th><td>${co.address||''}</td></tr>
        <tr><th>대표자</th><td>${_w('getCompanyRepName')(co)}</td></tr>
      </table>
      <div class="sign-stamp-area">
        <div class="sign-stamp"></div>
        <div class="sign-label">(서명 또는 날인)</div>
      </div>
    </div>
    <div class="doc-sign-box">
      <div class="sign-title">근로자</div>
      <table class="sign-info-table">
        <tr><th>성명</th><td>${emp.name||''}</td></tr>
        <tr><th>주소</th><td>${emp.address||''}</td></tr>
        <tr><th>연락처</th><td>${emp.phone||''}</td></tr>
      </table>
      <div class="sign-stamp-area">
        <div class="sign-stamp"></div>
        <div class="sign-label">(서명 또는 날인)</div>
      </div>
    </div>
  </div>
  `;
}

// ─── 통합 배너 초기화 헬퍼 ───


// ══ window 등록 ══
window._getContractPrintCSS = _getContractPrintCSS;
window.buildScheduleTableHTML = buildScheduleTableHTML;
window.generateContractHTMLFromData = generateContractHTMLFromData;
