/** 인쇄 전용 CSS */
function _getContractPrintCSS(){
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
function buildScheduleTableHTML(activeDays){
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
function generateContractHTMLFromData(c, emp, co){
  // contract_type 우선 — emp.employment_category는 직원 현재 상태이므로
  // 채용 확정 후 생성된 계약(contract_type='정규직') 계약서가 수습 양식으로
  // 출력되는 문제를 방지. emp.employment_category는 폴백으로만 사용.
  // 계약예정 상태인 경우 수습 카테고리 정규화 (채용확정 → 본계약 전환이므로 수습 아님)
  const _ctTypeBase = c.contract_type || emp.employment_category || '정규직';
  const _isPendingContract = (c.status===CONTRACT_STATUS.PENDING);
  const ctType = _isPendingContract
    ? (_ctTypeBase ===CONTRACT_TYPE.REGULAR_PROBATION ? '정규직' : _ctTypeBase ===CONTRACT_TYPE.FIXED_PROBATION ? '계약직' : _ctTypeBase)
    : _ctTypeBase;
  const isDaily  = ctType ===CONTRACT_TYPE.DAILY;
  const isProb   = ctType ===CONTRACT_TYPE.REGULAR_PROBATION || ctType ===CONTRACT_TYPE.FIXED_PROBATION;
  const isRegular= ctType ===CONTRACT_TYPE.REGULAR || ctType ===CONTRACT_TYPE.REGULAR_PROBATION;

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
      ${row('대표자(사용자)', co.representative)}
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
    ${buildScheduleTableHTML(activeDays)}
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
        <tr><th>대표자</th><td>${co.representative||''}</td></tr>
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
function _resetStatusBanner(){
  const sbEl = document.getElementById('ct-status-banner');
  if(sbEl) sbEl.style.display = 'none';
  const btnEdit    = document.getElementById('ct-sb-btn-edit');
  const btnSave    = document.getElementById('ct-sb-btn-save');
  const btnCancel  = document.getElementById('ct-sb-btn-cancel');
  const btnDestroy = document.getElementById('ct-sb-btn-destroy');
  if(btnEdit)    btnEdit.style.display    = 'inline-flex';
  if(btnSave)    btnSave.style.display    = 'none';
  if(btnCancel)  btnCancel.style.display  = 'none';
  if(btnDestroy) btnDestroy.style.display = 'inline-flex';
}

// ─── 예정 계약 수정 모드 진입 (해지예정 / 계약예정 / 갱신예정 공용) ───
function editPendingContract(){
  const modalEl = document.querySelector('#contract-modal .modal');
  const bodyEl  = modalEl?.querySelector('.modal-body');
  if(!bodyEl) return;

  // readonly 해제 및 입력 활성화
  modalEl.classList.remove('ct-readonly');
  bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    el.disabled = false;
    el.style.background = '';
    el.style.color = '';
    el.style.cursor = '';
  });

  // 배너 버튼 전환: [수정] [파기] → [수정완료] [취소]
  document.getElementById('ct-sb-btn-edit').style.display    = 'none';
  document.getElementById('ct-sb-btn-save').style.display    = 'inline-flex';
  document.getElementById('ct-sb-btn-cancel').style.display  = 'inline-flex';
  document.getElementById('ct-sb-btn-destroy').style.display = 'none';

  // 상단/하단 액션 바 버튼 숨김 (수정 중 혼동 방지)
  ['ct-btn-renew','ct-btn-renew2','ct-btn-void','ct-btn-void2',
   'ct-btn-recontract','ct-btn-recontract2','ct-btn-terminate','ct-btn-terminate2'].forEach(bid=>{
    const el = document.getElementById(bid); if(el) el.style.display='none';
  });

  // 해지예정 계약이면: 퇴사예정일 입력 패널을 수정 가능하게 열어줌
  const c = allContracts.find(x=>x.id===editId.contract);
  if(c?.status===CONTRACT_STATUS.TERMINATE_PENDING){
    const termPanel = document.getElementById('ct-terminate-panel');
    if(termPanel){
      termPanel.style.display = 'block';
      // 현재 퇴사예정일 값을 패널 input에 세팅
      const termDateInput = document.getElementById('ct-terminate-date');
      if(termDateInput && c.terminate_date) termDateInput.value = c.terminate_date;
      // 패널 내 확정 버튼은 숨기고 안내 문구 변경 (수정완료로 저장)
      const termConfirmBtn = termPanel.querySelector('button.btn-terminate');
      if(termConfirmBtn) termConfirmBtn.style.display = 'none';
      const termCancelBtn = termPanel.querySelector('button.btn-secondary');
      if(termCancelBtn)  termCancelBtn.style.display  = 'none';
    }
  }

  // 모달 제목 변경
  const titleMap = { '해지예정':'근로계약서 수정 (해지예정)', '계약예정':'근로계약서 수정 (계약예정)', '갱신예정':'근로계약서 수정 (갱신예정)' };
  document.getElementById('ct-title').textContent = titleMap[c?.status] || '근로계약서 수정 (예정 계약)';

  // 일괄 설정 바 다시 표시
  const bulkBar = document.getElementById('ct-bulk-bar-wrap');
  if(bulkBar) bulkBar.style.display = '';

  toast('예정 계약을 수정합니다. 변경 후 수정완료를 눌러 저장하세요.');
}

// ─── 예정 계약 수정 취소 ───
function cancelPendingEdit(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(c) viewContract(c.id);  // 조회 모드로 재진입 (원본 데이터로 복원)
}

// ─── 예정 계약 수정완료 저장 ───
async function savePendingContractEdit(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');
  console.log('[savePendingContractEdit] 시작, contract id:', editId.contract);

  // ── 최저임금 위반 차단 (예정 계약 수정 경로) ──
  const _mwWarnRowPend  = document.getElementById('ct-prob-minwage-warning-row');
  const _mwWarnRowPend2 = document.getElementById('ct-general-minwage-warning-row');
  if((_mwWarnRowPend  && _mwWarnRowPend.style.display  !== 'none') ||
     (_mwWarnRowPend2 && _mwWarnRowPend2.style.display !== 'none')){
    openModal('ct-minwage-warn-modal');
    return;
  }

  // 현재 폼에서 수정된 값을 수집 (saveContract 로직에서 필요한 필드만)
  const newStart = document.getElementById('ct-start')?.value || c.contract_start;
  const newEnd   = document.getElementById('ct-end')?.value   || '';
  const today3   = new Date().toISOString().slice(0,10);

  // 시작일 유효성
  if(!newStart) return toast('계약 시작일을 입력해 주세요.','error');

  // ── 상태 재결정 ──
  let newStatus = c.status;
  const isPreTermEdit = (c.status===CONTRACT_STATUS.TERMINATE_PENDING);

  if(isPreTermEdit){
    // 해지예정 수정: terminate_date(퇴사예정일) 재평가
    const newTermDate = document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
    if(newTermDate && newTermDate <= today3){
      newStatus = '해지';       // 퇴사예정일이 오늘 이하이면 즉시 해지
    } else if(newTermDate){
      newStatus = '해지예정';   // 퇴사예정일이 미래면 해지예정 유지
    } else {
      newStatus = '활성';       // 퇴사예정일을 지웠으면 활성 복귀
    }
  } else {
    // 계약예정 / 갱신예정: 시작일 기준
    if(newStart <= today3){
      newStatus = '활성';
    }
    // 종료일이 이미 지났으면 만료
    if(newEnd && newEnd < today3){
      newStatus = '만료';
    }
  }

  // 수정 페이로드 구성 (스케줄·급여 등 모든 폼 필드 수집)
  const scheduleJSON = (typeof getScheduleJSON === 'function') ? getScheduleJSON() : [];
  const workDaysCount = parseInt(document.getElementById('ct-days')?.value)||0;
  const avgDayHours   = parseFloat(document.getElementById('ct-hours')?.value)||0;

  // 급여 관련
  function getAmtVal(id){ const el=document.getElementById(id); if(!el)return 0; const v=el.value.replace(/[^\d]/g,''); return parseInt(v)||0; }
  const _pendCtType   = c.contract_type || '정규직';
  const _pendIsReg    = _pendCtType===CONTRACT_TYPE.REGULAR || _pendCtType===CONTRACT_TYPE.REGULAR_PROBATION;
  const _pendIsFixed  = _pendCtType===CONTRACT_TYPE.FIXED || _pendCtType===CONTRACT_TYPE.FIXED_PROBATION;
  const _pendIsDaily  = _pendCtType===CONTRACT_TYPE.DAILY;
  const annualSalInputPend = getAmtVal('ct-annual-sal'); // 정규직:연봉 / 계약직:월약정급여
  const annual    = _pendIsReg ? annualSalInputPend : 0;  // annual_salary에는 정규직만 저장
  const baseSal   = _pendIsDaily ? 0 : getAmtVal('ct-base');
  // 주휴수당은 자동계산 표시값에서 읽기
  const weeklyHolEl = document.getElementById('ct-weekly-hol-computed');
  const weeklyHol = weeklyHolEl ? (parseFloat(weeklyHolEl.textContent.replace(/[^\d]/g,''))||0) : 0;
  // 월 약정임금: 계약직→월약정급여 입력값, 정규직→연봉÷12
  const _pendMonthly = _pendIsDaily ? 0
    : _pendIsFixed && annualSalInputPend > 0 ? annualSalInputPend
    : _pendIsReg   && annualSalInputPend > 0 ? Math.round(annualSalInputPend / 12)
    : (baseSal + weeklyHol);

  const body = {
    contract_start:        newStart,
    contract_end:          newEnd,
    status:                newStatus,
    work_hours_per_day:    avgDayHours,
    work_days_per_week:    workDaysCount,
    schedule_json:         JSON.stringify(scheduleJSON),
    annual_leave_days:     parseFloat(document.getElementById('ct-annual')?.value)||15,
    annual_salary:         annual,
    monthly_salary_agreed: _pendMonthly,
    base_salary:           baseSal,
    weekly_holiday_pay:    weeklyHol,
    fixed_ot_pay:          getAmtVal('ct-fixed-ot-pay'),
    fixed_ot_hours:        parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0,
    fixed_night_pay:       getAmtVal('ct-fixed-night-pay'),
    fixed_night_hours:     parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0,
    fixed_hol_pay:         getAmtVal('ct-fixed-hol-pay'),
    fixed_hol_hours:       parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0,
    position_allowance:    getAmtVal('ct-position'),
    car_maintenance:       getAmtVal('ct-car'),
    meal_allowance:        getAmtVal('ct-meal'),
    other_allowance:       getAmtVal('ct-other'),
    site_allowance:        getAmtVal('ct-site'),
    skill_allowance:       getAmtVal('ct-skill'),
    license_allowance:     getAmtVal('ct-license'),
    communication_allowance: getAmtVal('ct-communication'),
    fitness_allowance:     getAmtVal('ct-fitness'),
    self_dev_allowance:    getAmtVal('ct-self-dev'),
    book_allowance:        getAmtVal('ct-book'),
    overseas_allowance:    getAmtVal('ct-overseas'),
    note:                  document.getElementById('ct-note')?.value||'',
    salary_start_date:     document.getElementById('ct-start')?.value || '',  // contract_start 와 동일값 (통합)
    salary_end_date:       '',
    is_draft:              false,
    // 해지예정 수정 시 terminate_date 업데이트 (해지예정이 아닌 상태로 변경되면 비움)
    terminate_date: (()=>{
      if(c.status===CONTRACT_STATUS.TERMINATE_PENDING){
        return document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
      }
      return c.terminate_date || '';
    })(),
  };

  try {
    await api(`../tables/contracts/${c.id}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...c, ...body, id: c.id})
    });

    // 직원 정보도 함께 업데이트 (수정 모드와 동일)
    const editEmpId = c.employee_id;
    if(editEmpId){
      const empPatch = {};
      const genderEl  = document.getElementById('ct-edit-em-gender');
      const jobEl     = document.getElementById('ct-edit-em-job');
      const deptEl    = document.getElementById('ct-edit-em-dept');
      const posEl     = document.getElementById('ct-edit-em-position');
      const phoneEl   = document.getElementById('ct-edit-em-phone');
      const idEl      = document.getElementById('ct-edit-em-id');
      const depsEl    = document.getElementById('ct-edit-em-dependents');
      const addrEl    = document.getElementById('ct-edit-em-address');
      const nameEl2 = document.getElementById('ct-edit-emp-name');
      const catEl2  = document.getElementById('ct-edit-em-category');
      if(nameEl2 && !nameEl2.readOnly && nameEl2.value.trim()) empPatch.name = nameEl2.value.trim();
      if(catEl2  && !catEl2.disabled  && catEl2.value)         empPatch.employment_category = catEl2.value;
      if(genderEl)  empPatch.gender            = genderEl.value;
      if(jobEl)     empPatch.job_description   = jobEl.value;
      if(deptEl)    empPatch.department        = deptEl.value;
      if(posEl)     empPatch.position          = posEl.value;
      if(phoneEl && phoneEl.value.trim()) empPatch.phone = phoneEl.value.trim();
      if(idEl)      empPatch.id_number         = idEl.value;
      if(depsEl)    empPatch.dependents        = parseInt(depsEl.value)||0;
      if(addrEl)    empPatch.address           = addrEl.value;
      const emailEl = document.getElementById('ct-edit-em-email');
      if(emailEl)   empPatch.email             = emailEl.value;
      const empnoEl = document.getElementById('ct-edit-em-empno');
      if(empnoEl && empnoEl.value.trim()) empPatch.employee_number = empnoEl.value.trim();
      if(Object.keys(empPatch).length){
        await api(`../tables/employees/${editEmpId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(empPatch)});
      }
    }

    // ── 고객사 인앱 알림 발송 (예정 계약 수정) ──
    {
      const _pendEmp = allEmployees.find(x => x.id === c.employee_id) || {};
      const _pendCo  = allCompanies.find(x => x.id === c.company_id)  || {};
      const _coRep   = _pendCo.representative ? `, ${_pendCo.representative} 사장님` : '';
      const _fmtD    = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
      if(isPreTermEdit && newStatus === '해지예정'){
        // 해지 예약
        const _termDate = document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
        await _sendCompanyNotice({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_termination_scheduled',
          title      : `[해지 예약] ${_pendEmp.name||''} — 계약 해지가 예약되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 해지가 예약 처리되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ''}
■ 퇴사 예정일: ${_fmtD(_termDate)}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : c.id,
          employeeId  : c.employee_id, employeeName: _pendEmp.name || '',
          contractEnd : c.contract_end || '',
        });
      } else if(isPreTermEdit && newStatus === '해지'){
        // 해지예정 → 즉시 해지로 전환
        await _sendCompanyNotice({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_terminated',
          title      : `[계약 해지] ${_pendEmp.name||''} — 근로계약이 해지되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 해지 처리되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ''}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : c.id,
          employeeId  : c.employee_id, employeeName: _pendEmp.name || '',
          contractEnd : c.contract_end || '',
        });
      } else {
        // 일반 예정 계약 수정 (계약예정/갱신예정 날짜 수정 등)
        await _sendCompanyNotice({
          companyId  : c.company_id, companyName: _pendCo.company_name || '',
          noticeType : 'contract_updated',
          title      : `[계약 수정] ${_pendEmp.name||''} — 근로계약이 수정되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약 내용이 수정되었습니다.

■ 근로자: ${_pendEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(newStart)}${newEnd ? ' ~ ' + _fmtD(newEnd) : ' (기간 미정)'}
■ 계약 상태: ${newStatus}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : c.id,
          employeeId  : c.employee_id, employeeName: _pendEmp.name || '',
          contractEnd : newEnd,
        });
      }
    }
    closeModal('contract-modal');
    await loadContracts(); await loadEmployees(); renderContracts(); renderDashboard();
    const statusLabelMap = {'활성':'계약유효 (활성)','해지예정':'해지예정 유지','해지':'해지 처리됨','만료':'만료','계약예정':'계약예정','갱신예정':'갱신예정'};
    const statusLabel = statusLabelMap[newStatus] || newStatus;
    toast(`계약이 수정됐습니다. 상태: ${statusLabel}`);
  } catch(e){
    toast('수정 저장 중 오류가 발생했습니다.','error');
    console.error(e);
  }
}

// ─── 배너 파기/해지취소 버튼 라우터 ───
async function doContractVoidOrCancel(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;
  if(c.status===CONTRACT_STATUS.TERMINATE_PENDING){
    // 해지예정 → 해지 취소 (활성으로 복귀)
    await cancelPreTerminate();
  } else {
    // 계약예정 / 갱신예정 → 레코드 삭제 (파기 기록 없이 제거)
    await cancelPendingContract();
  }
}

// ─── 해지예정 취소 (활성으로 복귀) ───
async function cancelPreTerminate(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;

  const ct       = c.contract_type || '';
  const isFixed  = (ct===CONTRACT_TYPE.FIXED||ct===CONTRACT_TYPE.FIXED_PROBATION||ct===CONTRACT_TYPE.DAILY);
  const emp      = allEmployees.find(e=>e.id===c.employee_id)||{};
  const empName  = emp.name || '';
  const termDate = c.terminate_date || '';

  // 계약직/정규직 구분 메시지
  const typeLabel  = isFixed ? '조기 해지 예정' : '퇴사예정';
  const dateLabel  = termDate ? `\n${typeLabel}일: ${termDate}` : '';
  const extraMsg   = isFixed
    ? '\n\n해지 예정이 취소되고 계약이 계약유효 상태로 복귀됩니다.\n직원의 퇴직예정일(resign_date)도 함께 초기화됩니다.'
    : '\n\n퇴사예정일 설정을 해제하고 계약을 활성 상태로 되돌립니다.\n직원의 퇴직예정일(resign_date)도 함께 초기화됩니다.';

  if(!confirm(`[${typeLabel} 취소]${empName ? `\n\n직원: ${empName}` : ''}${dateLabel}${extraMsg}\n\n진행하시겠습니까?`)) return;

  // 1) 계약 상태 복귀
  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status: CONTRACT_STATUS.ACTIVE, terminate_date:''})});

  // 2) 직원 resign_date 초기화 (status는 재직 상태 유지 — 이미 퇴직으로 바뀐 경우는 재직으로 복귀)
  if(emp.id){
    const empPatch = emp.status===EMP_STATUS.RESIGNED
      ? {status: EMP_STATUS.ACTIVE, resign_date:''}
      : {resign_date:''};
    await api(`../tables/employees/${emp.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(empPatch)});
  }

  // ── 고객사 인앱 알림 발송 (해지 예정 취소) ──
  {
    const _cptCo  = allCompanies.find(x => x.id === c.company_id) || {};
    const _coRep  = _cptCo.representative ? `, ${_cptCo.representative} 사장님` : '';
    const _fmtD   = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    await _sendCompanyNotice({
      companyId  : c.company_id, companyName: _cptCo.company_name || '',
      noticeType : 'contract_termination_cancelled',
      title      : `[해지 예정 취소] ${empName} — 계약 해지 예정이 취소되었습니다`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 해지 예정이 취소되어 기존 계약이 정상 유효 상태로 복귀되었습니다.

■ 근로자: ${empName}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ' (기간 미정)'}
■ 취소된 ${typeLabel}일: ${termDate ? _fmtD(termDate) : '-'}
■ 현재 계약 상태: 계약유효 (활성) 복귀
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
      contractId  : c.id,
      employeeId  : c.employee_id, employeeName: empName,
      contractEnd : c.contract_end || '',
    });
  }

  closeModal('contract-modal');
  await Promise.all([loadContracts(), loadEmployees()]);
  renderContracts(); renderDashboard();
  toast(`${typeLabel} 취소 완료 — 계약이 활성 상태로 복귀됐습니다.`, 'success');
}

// ─── 계약예정·갱신예정 취소 플로우 (레코드 삭제) ───
async function cancelPendingContract(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;

  // 시작일 당일부터 취소 불가
  const _todayCancel = new Date().toISOString().slice(0,10);
  if(c.contract_start && _todayCancel >= c.contract_start){
    toast(`계약 시작일(${c.contract_start}) 이후에는 예정 계약을 취소할 수 없습니다.`, 'error');
    return;
  }

  const isRenew     = (c.status===CONTRACT_STATUS.RENEWAL_PENDING)
                   || ((c.status===CONTRACT_STATUS.ACTIVE||c.status==='유효'||c.status===EMP_STATUS.ACTIVE) && (c.contract_start||'') > new Date().toISOString().slice(0,10));
  const statusLabel = isRenew ? '갱신예정' : '계약예정';
  const emp         = allEmployees.find(e=>e.id===c.employee_id)||{};
  const empName     = emp.name || '';

  if(!confirm(
    `[${statusLabel} 취소]${empName ? `\n\n직원: ${empName}` : ''}\n` +
    `계약 시작일: ${c.contract_start||'—'}\n\n` +
    `아직 시작되지 않은 계약을 취소합니다.\n` +
    `취소된 계약은 목록에서 삭제되며 별도로 보관하지 않습니다.\n\n` +
    `진행하시겠습니까?`
  )) return;

  // 갱신 취소 시: 이전 계약(만료 처리됐던 것)을 활성으로 복귀시켜야 하는지 확인
  // note 필드에 '전계약:' 패턴이 있으면 해당 계약 ID를 복원
  const prevContractMatch = (c.note||'').match(/전계약:([^\s)]+)/);
  if(isRenew && prevContractMatch){
    const prevId = prevContractMatch[1];
    const prevC  = allContracts.find(x=>x.id===prevId);
    if(prevC && prevC.status===CONTRACT_STATUS.EXPIRED){
      // 이전 계약을 활성 상태로 복귀
      await api(`../tables/contracts/${prevId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status: CONTRACT_STATUS.ACTIVE, contract_end: prevC.contract_end||''})});
    }
  }

  // 해당 계약 레코드 삭제
  await api(`../tables/contracts/${c.id}`,{method:'DELETE'});

  closeModal('contract-modal');
  await Promise.all([loadContracts(), loadEmployees()]);
  renderContracts(); renderDashboard();
  toast(`${statusLabel} 취소 완료 — 계약이 삭제됐습니다.`, 'success');
}

// ─── 파기 플로우 (수정재발행 등 명시적 파기 전용 — 배너 경로에서는 더 이상 사용 안 함) ───
async function doContractVoid(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;
  const statusLabel = c.status===CONTRACT_STATUS.RENEWAL_PENDING ? '갱신예정' : '계약예정';

  if(!confirm(`정말 이 계약을 파기하시겠습니까?\n\n[${statusLabel}] 상태의 계약을 파기합니다.\n파기된 계약은 복구할 수 없으며, 계약이 성립되지 않은 것으로 처리됩니다.`)) return;

  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status: CONTRACT_STATUS.VOIDED})});

  // ── 고객사 인앱 알림 발송 (계약 파기) ──
  {
    const _voidEmp = allEmployees.find(x => x.id === c.employee_id) || {};
    const _voidCo  = allCompanies.find(x => x.id === c.company_id)  || {};
    const _coRep   = _voidCo.representative ? `, ${_voidCo.representative} 사장님` : '';
    const _fmtD    = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    await _sendCompanyNotice({
      companyId  : c.company_id, companyName: _voidCo.company_name || '',
      noticeType : 'contract_voided',
      title      : `[계약 파기] ${_voidEmp.name||''} — 근로계약이 파기되었습니다`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 파기 처리되었습니다.

■ 근로자: ${_voidEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ' (기간 미정)'}
■ 파기 사유: ${statusLabel} 상태의 계약 파기
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
      contractId  : c.id,
      employeeId  : c.employee_id, employeeName: _voidEmp.name || '',
      contractEnd : c.contract_end || '',
    });
  }

  closeModal('contract-modal');
  await loadContracts(); renderContracts(); renderDashboard();
  toast('계약이 파기 처리됐습니다.');
}

// ─── 갱신 플로우 ───
function doContractRenew(){
  // 패널 토글
  document.getElementById('ct-terminate-panel').style.display = 'none';
  const rp = document.getElementById('ct-renew-panel');
  rp.style.display = rp.style.display==='none' ? 'block' : 'none';
  if(rp.style.display==='block'){
    const today    = new Date().toISOString().slice(0,10);
    const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
    const c = allContracts.find(x=>x.id===editId.contract)||{};
    // 기존 계약 종료일 기본값: 계약서에 등록된 종료일 또는 오늘
    document.getElementById('ct-renew-old-end').value   = c.contract_end || today;
    document.getElementById('ct-renew-new-start').value = tomorrow;
    document.getElementById('ct-renew-old-end').disabled  = false;
    document.getElementById('ct-renew-new-start').disabled= false;
    setTimeout(()=>rp.scrollIntoView({behavior:'smooth',block:'center'}),100);
  }
}
async function confirmContractRenew(){
  const oldEnd   = document.getElementById('ct-renew-old-end').value;
  const newStart = document.getElementById('ct-renew-new-start').value;
  if(!oldEnd)   return toast('기존 계약 종료일을 입력하세요.','error');
  if(!newStart) return toast('신규 계약 시작일을 입력하세요.','error');

  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');

  const today = new Date().toISOString().slice(0,10);
  const origEnd = c.contract_end || '';

  // 종료일이 원래보다 앞당겨졌는지 확인 → 연장(만료)이 아닌 단축 경고
  if(origEnd && oldEnd < origEnd){
    if(!confirm(`기존 계약 종료일(${origEnd})보다 앞당겨진 날짜(${oldEnd})입니다.\n계약 종료일 단축은 [해지] 처리를 권장합니다.\n그래도 계속 진행하시겠습니까?`)) return;
  }

  // 1. 기존 계약: 종료일 확정 + 상태 '만료' (후속 계약이 이어지므로 만료 처리)
  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contract_end: oldEnd, status: CONTRACT_STATUS.EXPIRED})});

  // 2. 신규 계약 생성 (기존 조건 복사)
  //    - 시작일이 오늘 이후면 '계약예정', 오늘이거나 이전이면 '활성'
  const newStatus = newStart > today ? '계약예정' : '활성';
  const newId = 'cont'+Date.now();
  const newContract = Object.assign({}, c, {
    id: newId,
    contract_start: newStart,
    contract_end:   '',          // 정규직 연장: 새 종료일 없음
    status:         newStatus,
    is_draft:       false,
    terminate_date: '',
    note: (c.note?c.note+' / ':'') + `연장계약 (전계약:${c.id})`
  });
  // API 시스템 필드 제거
  ['gs_project_id','gs_table_name','created_at','updated_at','deleted'].forEach(k=>delete newContract[k]);
  await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newContract)});

  // ── 고객사 인앱 알림 발송 (갱신/갱신예약) ──
  {
    const _renewEmp = allEmployees.find(x => x.id === c.employee_id) || {};
    const _renewCo  = allCompanies.find(x => x.id === c.company_id)  || {};
    const _coRep    = _renewCo.representative ? `, ${_renewCo.representative} 사장님` : '';
    const _fmtD     = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    if(newStatus === '계약예정'){
      // 갱신 예약
      await _sendCompanyNotice({
        companyId  : c.company_id, companyName: _renewCo.company_name || '',
        noticeType : 'contract_renewal_scheduled',
        title      : `[갱신 예약] ${_renewEmp.name||''} — 계약 갱신이 예약되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 갱신이 예약되었습니다.

■ 근로자: ${_renewEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 기존 계약 종료일: ${_fmtD(oldEnd)}
■ 새 계약 시작일: ${_fmtD(newStart)} (시작일 미도래 — 계약예정)
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : newId,
        employeeId  : c.employee_id, employeeName: _renewEmp.name || '',
        contractEnd : '',
      });
    } else {
      // 갱신 (즉시 활성)
      await _sendCompanyNotice({
        companyId  : c.company_id, companyName: _renewCo.company_name || '',
        noticeType : 'contract_renewed',
        title      : `[계약 갱신] ${_renewEmp.name||''} — 계약이 갱신되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 갱신이 완료되었습니다.

■ 근로자: ${_renewEmp.name||''}
■ 고용형태: ${c.contract_type||''}
■ 기존 계약 종료일: ${_fmtD(oldEnd)}
■ 새 계약 시작일: ${_fmtD(newStart)}
■ 계약 상태: 계약유효 (활성)
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : newId,
        employeeId  : c.employee_id, employeeName: _renewEmp.name || '',
        contractEnd : '',
      });
    }
  }

  closeModal('contract-modal');
  await loadContracts(); await loadEmployees(); renderContracts(); renderDashboard();
  const label = newStatus === '계약예정' ? '계약예정 (시작일 미도래)' : '계약유효 (활성)';
  toast(`연장 처리 완료. 전 계약: 만료 / 새 계약: ${label}`);
}

// ─── 재계약 플로우 ───
function doContractRecontract(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;
  // 기존 계약 데이터를 복사해서 편집 가능한 새 계약 모달 열기
  // 임시 플래그로 "재계약 모드" 표시
  _recontractSourceId = c.id;
  closeModal('contract-modal');
  // 잠시 후 새 계약 모달 오픈 (신규 모드 + 프리셋)
  setTimeout(()=>openRecontractModal(c), 50);
}
let _recontractSourceId = null;
function openRecontractModal(srcContract){
  // 동일 회사 기준 신규 계약 모달 오픈 (신규 모드)
  openContractModal(null, srcContract.company_id);

  // 신규 모드에서 기존 계약 데이터로 필드 채우기
  const emp = allEmployees.find(e=>e.id===srcContract.employee_id)||{};

  // 직원 섹션 → 수정 직원 섹션으로 전환
  document.getElementById('ct-new-emp-section').style.display = 'none';
  document.getElementById('ct-edit-emp-info').style.display = 'block';
  // 계약 시작일·종료일·고용형태·계약상태는 수정 모드 섹션 내부에 있으므로 별도 제어 불필요

  // 직원 정보 채우기
  document.getElementById('ct-edit-emp-name').value = emp.name||'';
  // 재계약: 고용형태는 직원 인사정보(employment_category) 기준
  const rcCtType = (emp && emp.employment_category) || srcContract.contract_type || '정규직';
  const rcIsFixed = (rcCtType===CONTRACT_TYPE.FIXED||rcCtType===CONTRACT_TYPE.FIXED_PROBATION||rcCtType===CONTRACT_TYPE.DAILY);
  if(emp){
    document.getElementById('ct-edit-em-gender').value     = emp.gender||'남';
    (function(){ const _h=document.getElementById('ct-edit-em-gender-hint'); if(_h){ _h.textContent='주민번호 입력 시 자동 설정됩니다'; _h.style.color='#6b7280'; } })();
    document.getElementById('ct-edit-em-category').value = emp.employment_category||'';
    document.getElementById('ct-edit-em-job').value        = emp.job_description||'';
    document.getElementById('ct-edit-em-dept').value       = emp.department||'';
    document.getElementById('ct-edit-em-position').value   = emp.position||'';
    // 계약직/일용직: 입사일·퇴사예정일 행 숨김 (계약 시작일·종료일과 동일)
    // 정규직/정규직 수습: 무기한 계약이므로 퇴사예정일 행 숨김
    const rcIsRegular = (rcCtType===CONTRACT_TYPE.REGULAR||rcCtType===CONTRACT_TYPE.REGULAR_PROBATION);
    const rcHireRow   = document.getElementById('ct-edit-row-hire');
    const rcExpRow    = document.getElementById('ct-edit-row-expire');
    const rcEndRow    = document.getElementById('ct-row-end');
    if(rcHireRow)   rcHireRow.style.display   = rcIsFixed ? 'none' : '';
    // 정규직이면 퇴사예정일 숨김, 계약직이면 입사일과 함께 숨김
    if(rcExpRow)    rcExpRow.style.display    = (rcIsFixed || rcIsRegular) ? 'none' : '';
    // 정규직이면 계약 종료일도 숨김
    if(rcEndRow)    rcEndRow.style.display    = rcIsRegular ? 'none' : '';
    // 입사일: 고용형태에 무관하게 항상 채움 (유효성 검사 통과 + hire_date 갱신 목적)
    const _rcEarliestStart = getEarliestContractStart(emp.id);
    document.getElementById('ct-edit-em-hire').value = _rcEarliestStart || emp.hire_date || '';
    if(!rcIsFixed && !rcIsRegular){
      document.getElementById('ct-edit-em-expire').value = emp.expire_date||emp.resign_date||'';
    }
    document.getElementById('ct-edit-em-id').value         = emp.id_number||'';
    const _editDepEl3=document.getElementById('ct-edit-em-dependents'); if(_editDepEl3) _editDepEl3.value = (emp.dependents ?? 0) < 1 ? 1 : emp.dependents;
    document.getElementById('ct-edit-em-phone').value      = emp.phone||'';
    document.getElementById('ct-edit-em-address').value    = emp.address||'';
    document.getElementById('ct-edit-em-bank').value       = emp.bank_name||'';
    document.getElementById('ct-edit-em-account').value    = emp.bank_account||'';
  }

  // 계약 조건 복사
  document.getElementById('ct-start').value   = '';
  document.getElementById('ct-type').value    = rcCtType; toggleCtEndDate(true);
  document.getElementById('ct-end').value     = srcContract.contract_end||'';
  document.getElementById('ct-status').value  = '활성';
  document.getElementById('ct-annual').value  = srcContract.annual_leave_days||15;
  // 요일별 스케줄 복원 (재계약: 이전 계약 스케줄 그대로 복사)
  if(srcContract.schedule_json){
    try{ setScheduleFromJSON(JSON.parse(srcContract.schedule_json)); }
    catch(e){ setScheduleFromLegacy(srcContract); }
  } else {
    setScheduleFromLegacy(srcContract);
  }

  const ct = srcContract.contract_type||'정규직';
  const isDailySrc    = ct===CONTRACT_TYPE.DAILY;
  const isRegSrc      = ct===CONTRACT_TYPE.REGULAR||ct===CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedSrc    = ct===CONTRACT_TYPE.FIXED||ct===CONTRACT_TYPE.FIXED_PROBATION;
  const isProbSrc     = ct===CONTRACT_TYPE.REGULAR_PROBATION||ct===CONTRACT_TYPE.FIXED_PROBATION;
  const showSalSrc    = isRegSrc || isFixedSrc; // 연봉/월약정급여 행 표시 여부

  const rowA=document.getElementById('ct-row-annual-sal'); const rowM=document.getElementById('ct-row-monthly');
  if(rowA) rowA.style.display=showSalSrc?'':'none';
  if(rowM) rowM.style.display=showSalSrc?'':'none';
  const rowDaysS=document.getElementById('ct-row-days'); const rowAnnualS=document.getElementById('ct-row-annual');
  const rowBaseS=document.getElementById('ct-row-base'); const rowWeeklyS=document.getElementById('ct-row-weekly-hol');
  const rowDailyS=document.getElementById('ct-row-daily-wage');
  if(rowDaysS)   rowDaysS.style.display  = isDailySrc?'none':'';
  if(rowAnnualS) rowAnnualS.style.display= isDailySrc?'none':'';
  if(rowBaseS)   rowBaseS.style.display  = isDailySrc?'none':'';
  if(rowWeeklyS) rowWeeklyS.style.display= isDailySrc?'none':'';
  if(rowDailyS)  rowDailyS.style.display = isDailySrc?'':'none';

  const probSec=document.getElementById('ct-probation-section');
  if(probSec) probSec.style.display=isProbSrc?'':'none';
  if(isProbSrc){
    document.getElementById('ct-probation-months').value=srcContract.probation_months||3;
    document.getElementById('ct-probation-pct').value=srcContract.probation_pct||'';
    document.getElementById('ct-probation-amt').value=srcContract.probation_amt||'';
    // 산정기준 라디오 복원
    const _basisSrc = srcContract.probation_basis || 'salary';
    const _rbSrc = document.querySelector(`input[name="ct-probation-basis"][value="${_basisSrc}"]`);
    if(_rbSrc){ _rbSrc.checked = true; }
    onProbationBasisChange();
  }

  if(isDailySrc){
    setAmountVal('ct-daily-wage', srcContract.daily_wage||srcContract.base_salary||0);
    setAmountVal('ct-base', 0);
  } else if(isFixedSrc){
    // 계약직: ct-annual-sal에 월약정급여(monthly_salary_agreed) 복원
    setAmountVal('ct-annual-sal', srcContract.monthly_salary_agreed||0);
    setAmountVal('ct-base',       srcContract.base_salary);
  } else {
    // 정규직: ct-annual-sal에 연봉(annual_salary) 복원
    setAmountVal('ct-annual-sal', srcContract.annual_salary||0);
    setAmountVal('ct-base',       srcContract.base_salary);
  }
  setAmountVal('ct-position',    srcContract.position_allowance||0);
  // 차량지원비 = 구 교통비 + 구 자가운전보조금 합산 (레거시 하위호환)
  setAmountVal('ct-car', (parseFloat(srcContract.transportation_allowance||srcContract.car_maintenance||0)) + (parseFloat(srcContract.self_driving_allowance||0)));
  setCTPayType('car', srcContract.transportation_pay_type||srcContract.self_driving_pay_type||'fixed');
  setAmountVal('ct-remote-area', srcContract.remote_area_allowance||0);
  // remote-area는 통상임금 항상 포함 — pay_type 세팅 불필요
  setAmountVal('ct-meal',        srcContract.meal_allowance||200000);
  setCTPayType('meal',           srcContract.meal_pay_type||'fixed');
  setAmountVal('ct-research',    srcContract.research_allowance||0);
  setCTPayType('research',       srcContract.research_pay_type||'fixed');
  setAmountVal('ct-site',        srcContract.site_allowance||0);
  setAmountVal('ct-skill',       srcContract.skill_allowance||0);
  setAmountVal('ct-license',     srcContract.license_allowance||0);
  setAmountVal('ct-communication',srcContract.communication_allowance||0);
  setCTPayType('communication',  srcContract.communication_pay_type||'fixed');
  setAmountVal('ct-fitness',     srcContract.fitness_allowance||0);
  setCTPayType('fitness',        srcContract.fitness_pay_type||'fixed');
  setAmountVal('ct-self-dev',    srcContract.self_dev_allowance||0);
  setCTPayType('self_dev',       srcContract.self_dev_pay_type||'fixed');
  setAmountVal('ct-book',        srcContract.book_allowance||0);
  setCTPayType('book',           srcContract.book_pay_type||'fixed');
  setAmountVal('ct-overseas',    srcContract.overseas_allowance||0);
  setCTPayType('overseas',       srcContract.overseas_pay_type||'fixed');
  // 출산·보육수당 복원
  setAmountVal('ct-childcare',   srcContract.childcare_allowance||0);
  { const _ccDep=document.getElementById('ct-childcare-dependents'); if(_ccDep) _ccDep.value=srcContract.childcare_dependents||1; }
  document.getElementById('ct-note').value = '';
  calcContractSalary();

  document.getElementById('ct-title').textContent = '재계약 (신규 계약서)';
  // 재계약 모드: 이름·주민번호·성별은 잠금, 고용형태는 변경 가능
  _setEditNameCategoryLock(true, false);
  // _prevEditCategory를 현재 값으로 초기화 (모달 열릴 때 Alert 방지)
  _prevEditCategory = document.getElementById('ct-edit-em-category')?.value || '';
  // saveContract 재계약 플래그 저장
  _recontractEmpId = srcContract.employee_id;
}
let _recontractEmpId = null;

// ─── 종료 플로우 ───
function doContractTerminate(){
  document.getElementById('ct-renew-panel').style.display = 'none';
  const tp = document.getElementById('ct-terminate-panel');
  tp.style.display = tp.style.display==='none' ? 'block' : 'none';
  if(tp.style.display==='block'){
    const c = allContracts.find(x=>x.id===editId.contract)||{};
    const dateEl = document.getElementById('ct-terminate-date');
    // 이미 해지예정일(terminate_date)이 설정된 경우 그 값으로, 없으면 빈값
    // contract_end(계약만료일)는 건드리지 않음
    dateEl.value = c.terminate_date || '';
    dateEl.disabled = false;
    setTimeout(()=>tp.scrollIntoView({behavior:'smooth',block:'center'}),100);
  }
}
async function confirmContractTerminate(){
  // 정규직 전용: 퇴사예정일 입력 → 해지예정 또는 해지 처리
  // contract_end(원래 계약만료일)는 절대 변경하지 않음
  // terminate_date 필드에만 해지예정일 저장
  const termDate = document.getElementById('ct-terminate-date').value;
  if(!termDate) return toast('퇴사예정일을 선택하세요.','error');

  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');
  const today = new Date().toISOString().slice(0,10);

  // 계약 만료일(contract_end)보다 이후 날짜는 입력 불가
  if(c.contract_end && termDate >= c.contract_end){
    return toast(`해지예정일은 계약 만료일(${c.contract_end}) 이전이어야 합니다.`, 'error');
  }

  // 미래 날짜 → 해지예정, 오늘 이하 → 즉시 해지
  const newStatus = termDate > today ? '해지예정' : '해지';

  // contract_end 는 유지, terminate_date 에만 해지예정일 기록
  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({terminate_date: termDate, status: newStatus})});

  // 퇴사예정일 → 직원 resign_date 기록 (퇴사 처리는 실제 해지 시)
  const emp = allEmployees.find(e=>e.id===c.employee_id);
  if(emp){
    const empPatch = newStatus==='해지'
      ? {status: EMP_STATUS.RESIGNED, resign_date: termDate}
      : {resign_date: termDate};  // 예정만 기록, 재직 상태 유지
    await api(`../tables/employees/${emp.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(empPatch)});
  }

  closeModal('contract-modal');
  await loadContracts(); await loadEmployees(); renderContracts(); renderDashboard();
  toast(`퇴사예정일(${termDate})이 설정됐습니다. 계약 상태: ${newStatus}`);
}

function editContract(id){openContractModal(id)}

/**
 * 서류미비 계약에서 호출: 계약조건 입력 모달을 열고
 * contract-preview-modal의 '날인본 업로드' 탭으로 바로 이동한다.
 * - 대시보드·근로계약 관리·급여 입력 서류미비 배너에서 공통 사용
 */
function openContractForUpload(contractId){
  if(!contractId) return;
  openContractModal(contractId);
  // openContractModal은 동기 처리이므로 한 틱 후 미리보기 모달 진입
  requestAnimationFrame(() => {
    openContractPreview();                 // contract-preview-modal 열기
    requestAnimationFrame(() => {
      showCpTab('upload');                 // 업로드 탭 전환
      // 업로드 섹션 상단으로 스크롤
      const _uploadBody = document.getElementById('cp-body-upload');
      if(_uploadBody) _uploadBody.scrollTo({ top: 0, behavior: 'instant' });
      // contract-preview-modal 본문 스크롤도 최상단으로
      const _previewModal = document.querySelector('#contract-preview-modal .modal');
      if(_previewModal) _previewModal.scrollTo({ top: 0, behavior: 'instant' });
    });
  });
}
function loadCtEmployees(preselect=null){
  // 직원 드롭다운 제거됨 - 회사 변경 시 불필요한 동작 없음
  // 고객사 변경 → 옵셔널 수당 show/hide 적용
  // ※ onchange 핸들러에서 loadCtEmployees() 직후 onCtCompanyChange()가 호출되므로
  //   여기서는 최소한의 show/hide만 적용 (onCtCompanyChange가 스냅샷 기준으로 덮어씀)
  const coId = document.getElementById('ct-company')?.value;
  const co   = coId ? (allCompanies||[]).find(x=>x.id===coId) : null;
  const isEditMode = !!editId?.contract;
  // 수정/amend 모드: 값 초기화 없이 show/hide만 갱신 (onCtCompanyChange가 덮어쓰지 않음)
  // 신규/재계약 모드: onCtCompanyChange가 바로 뒤에서 스냅샷+clearValues로 덮어씀
  if(!isEditMode){
    // 신규/재계약: onCtCompanyChange가 뒤에서 처리하므로 여기서는 생략
    return;
  }
  applyCTAllowanceConfig(co?.allowance_config ?? null, false);
}

// ==================================================================
//  계약직 조기 해지 설정 함수 그룹
//  대상: 계약직 / 계약직수습 / 일용직 (isFixed 플래그)
// ==================================================================

/**
 * 해지 설정 패널 토글
 * - 다른 패널(ct-terminate-panel, ct-renew-panel) 닫기
 * - 열릴 때: 계약 정보 표시 + 입력 초기화
 * - 이미 열려있으면 닫기
 */
function doFixedTerminate(){
  const panel = document.getElementById('ct-fixed-terminate-panel');
  const isOpen = panel.style.display !== 'none';

  // 다른 패널 모두 닫기
  const terminatePanel = document.getElementById('ct-terminate-panel');
  const renewPanel     = document.getElementById('ct-renew-panel');
  if(terminatePanel) terminatePanel.style.display = 'none';
  if(renewPanel)     renewPanel.style.display     = 'none';

  // 이미 열려있으면 토글로 닫기
  if(isOpen){ panel.style.display = 'none'; return; }

  // 계약 정보 조회
  const c   = allContracts.find(x => x.id === editId.contract) || {};
  const emp = allEmployees.find(e => e.id === c.employee_id)   || {};
  const cat = emp.employment_category || c.contract_type || '';

  // 계약 정보 인포 텍스트
  const infoEl = document.getElementById('cft-contract-info');
  if(infoEl){
    const parts = [emp.name||'', cat, c.contract_end ? `만료일: ${c.contract_end}` : '만료일: 미정']
                    .filter(Boolean);
    infoEl.textContent = `(${parts.join(' · ')})`;
  }

  // 날짜 입력란 초기화 — 기존 terminate_date가 있으면 미리 채워두기
  const dateEl = document.getElementById('ct-fixed-terminate-date');
  if(dateEl){
    dateEl.value = c.terminate_date || '';
  }

  // 나머지 입력 초기화
  const noteEl        = document.getElementById('ct-fixed-terminate-note');
  const hintEl        = document.getElementById('ct-cft-date-hint');
  const statusHintEl  = document.getElementById('ct-cft-status-hint');
  const confirmBtn    = document.getElementById('ct-cft-confirm-btn');
  if(noteEl)       noteEl.value = '';
  if(hintEl)       hintEl.innerHTML = '';
  if(statusHintEl) statusHintEl.innerHTML = '';
  if(confirmBtn)   confirmBtn.disabled = true;

  // 사유 칩 선택 초기화
  document.querySelectorAll('.cft-reason-chip').forEach(ch => ch.classList.remove('selected'));

  // 패널 열기 + 스크롤
  panel.style.display = 'block';
  setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'center' }), 100);

  // 기존 terminate_date가 있으면 validate 실행하여 버튼 활성화 처리
  if(dateEl && dateEl.value) _cftValidate();
}

/**
 * 해지일 입력 유효성 검사
 * - 만료일(contract_end) 이상 날짜 불가 (정상 만료와 구분)
 * - 오늘 이전 → '해지', 오늘 이후 → '해지예정'
 * - 유효 시 확정 버튼 활성화 + 상태 힌트 표시
 */
function _cftValidate(){
  const c          = allContracts.find(x => x.id === editId.contract) || {};
  const today      = new Date().toISOString().slice(0, 10);
  const termDate   = (document.getElementById('ct-fixed-terminate-date') || {}).value || '';
  const hintEl     = document.getElementById('ct-cft-date-hint');
  const statusHint = document.getElementById('ct-cft-status-hint');
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');

  // 입력 없으면 초기화
  if(!termDate){
    if(confirmBtn)   confirmBtn.disabled = true;
    if(hintEl)       hintEl.innerHTML = '';
    if(statusHint)   statusHint.innerHTML = '';
    return;
  }

  // 계약 만료일(contract_end) 이상이면 오류
  if(c.contract_end && termDate >= c.contract_end){
    if(hintEl) hintEl.innerHTML =
      `<span style="color:#dc2626;">⚠ 계약 만료일(${c.contract_end}) 이전 날짜만 입력 가능합니다.</span>`;
    if(statusHint) statusHint.innerHTML = '';
    if(confirmBtn) confirmBtn.disabled = true;
    return;
  }

  // 계약 시작일보다 이전이면 오류
  if(c.contract_start && termDate < c.contract_start){
    if(hintEl) hintEl.innerHTML =
      `<span style="color:#dc2626;">⚠ 계약 시작일(${c.contract_start}) 이후 날짜만 입력 가능합니다.</span>`;
    if(statusHint) statusHint.innerHTML = '';
    if(confirmBtn) confirmBtn.disabled = true;
    return;
  }

  // 유효 — 상태 계산
  const isFuture   = termDate > today;
  const newStatus  = isFuture ? '해지예정' : '해지';
  const statusColor= isFuture ? '#c2410c'  : '#dc2626';
  const statusBg   = isFuture ? '#fff7ed'  : '#fef2f2';
  const statusBorder= isFuture? '#fdba74'  : '#fca5a5';

  // 날짜 힌트
  if(hintEl){
    const startLabel = c.contract_start ? `계약 시작: ${c.contract_start}` : '';
    const endLabel   = c.contract_end   ? `만료일: ${c.contract_end}`      : '';
    const labels     = [startLabel, endLabel].filter(Boolean).join(' · ');
    hintEl.innerHTML = labels
      ? `<span style="color:#6b7280;">${labels}</span>`
      : '';
  }

  // 상태 힌트 (확정 버튼 옆)
  if(statusHint){
    statusHint.innerHTML =
      `→ 계약 상태: <span style="background:${statusBg};border:1px solid ${statusBorder};` +
      `border-radius:4px;padding:1px 8px;font-size:11.5px;font-weight:800;color:${statusColor};">` +
      `${newStatus}</span>` +
      (newStatus === '해지'
        ? ' <span style="font-size:11px;color:#9ca3af;">(직원 상태 → 퇴직)</span>'
        : '');
  }

  // 확정 버튼 활성화
  if(confirmBtn) confirmBtn.disabled = false;
}

/**
 * 해지 사유 칩 선택 / 토글
 * - 동일 칩 재클릭 시 선택 해제
 */
function _cftSelectReason(el, reason){
  const isAlreadySelected = el.classList.contains('selected');
  // 모든 칩 선택 해제
  document.querySelectorAll('.cft-reason-chip').forEach(ch => ch.classList.remove('selected'));
  // 같은 칩이면 해제(토글), 다른 칩이면 선택
  if(!isAlreadySelected) el.classList.add('selected');
}

/**
 * 해지 설정 패널 닫기 + 입력 초기화
 */
function _cftClose(){
  const panel = document.getElementById('ct-fixed-terminate-panel');
  if(panel) panel.style.display = 'none';

  // 폼 초기화 (다음 열기에서 이전 값이 남지 않도록)
  const dateEl     = document.getElementById('ct-fixed-terminate-date');
  const noteEl     = document.getElementById('ct-fixed-terminate-note');
  const hintEl     = document.getElementById('ct-cft-date-hint');
  const statusHint = document.getElementById('ct-cft-status-hint');
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');
  if(dateEl)     dateEl.value = '';
  if(noteEl)     noteEl.value = '';
  if(hintEl)     hintEl.innerHTML = '';
  if(statusHint) statusHint.innerHTML = '';
  if(confirmBtn) confirmBtn.disabled = true;
  document.querySelectorAll('.cft-reason-chip').forEach(ch => ch.classList.remove('selected'));
}

/**
 * 해지 확정 처리
 * 1. 입력값 검증
 * 2. 사용자 confirm 대화상자
 * 3. contracts PATCH  → terminate_date, status, note
 * 4. employees PATCH  → resign_date, (즉시 해지 시) status='퇴직'
 * 5. 모달 닫기 + 데이터 갱신 + 토스트
 */
async function confirmFixedTerminate(){
  const c = allContracts.find(x => x.id === editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.', 'error');

  const termDate = (document.getElementById('ct-fixed-terminate-date') || {}).value || '';
  if(!termDate) return toast('해지일을 선택하세요.', 'error');

  const today = new Date().toISOString().slice(0, 10);

  // 만료일 이상 불가
  if(c.contract_end && termDate >= c.contract_end){
    return toast(`해지일은 계약 만료일(${c.contract_end}) 이전이어야 합니다.`, 'error');
  }
  // 시작일 이전 불가
  if(c.contract_start && termDate < c.contract_start){
    return toast(`해지일은 계약 시작일(${c.contract_start}) 이후이어야 합니다.`, 'error');
  }

  const selectedChip = document.querySelector('.cft-reason-chip.selected');
  const reason       = selectedChip ? selectedChip.textContent.trim() : '';
  const noteInput    = (document.getElementById('ct-fixed-terminate-note') || {}).value || '';
  const note         = noteInput.trim();
  const newStatus    = termDate > today ? '해지예정' : '해지';

  // 기존 note에 사유/메모 추가 (덮어쓰기 방지)
  const addendum = [reason, note].filter(Boolean).join(' — ');
  const finalNote= addendum
    ? (c.note ? `${c.note}\n[해지] ${addendum}` : `[해지] ${addendum}`)
    : c.note || '';

  const emp    = allEmployees.find(e => e.id === c.employee_id) || {};
  const empName= emp.name || '(이름 없음)';
  const cat    = emp.employment_category || c.contract_type || '';

  // 사용자 확인 다이얼로그
  const confirmMsg = [
    `[계약 조기 해지 확정]`,
    ``,
    `직원: ${empName}${cat ? ` (${cat})` : ''}`,
    `해지일: ${termDate}`,
    `처리 상태: ${newStatus}`,
    reason ? `해지 사유: ${reason}` : null,
    note    ? `메모: ${note}`       : null,
    ``,
    newStatus === '해지'
      ? `⚠ 직원 상태가 "퇴직"으로 변경됩니다.`
      : `ℹ 해지 예정일 이후 실제 해지 처리가 필요합니다.`,
    ``,
    `이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?`
  ].filter(v => v !== null).join('\n');

  if(!confirm(confirmMsg)) return;

  // 버튼 로딩 상태
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');
  if(confirmBtn){ confirmBtn.disabled = true; confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }

  try{
    // 1) 계약 업데이트
    await api(`../tables/contracts/${c.id}`, {
      method  : 'PATCH',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({
        terminate_date : termDate,
        status         : newStatus,
        note           : finalNote
      })
    });

    // 2) 직원 업데이트
    if(emp.id){
      const empPatch = newStatus === '해지'
        ? { status: EMP_STATUS.RESIGNED, resign_date: termDate }
        : { resign_date: termDate };   // 해지예정: 재직 상태 유지, 날짜만 기록
      await api(`../tables/employees/${emp.id}`, {
        method  : 'PATCH',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(empPatch)
      });
    }

    // 3) 모달 닫기 및 데이터 갱신
    closeModal('contract-modal');
    await Promise.all([loadContracts(), loadEmployees()]);
    renderContracts();
    renderDashboard();

    const statusLabel = newStatus === '해지예정'
      ? `해지예정 (해지일: ${termDate})`
      : `해지 완료 (해지일: ${termDate})`;
    toast(`${empName} — ${statusLabel}`, 'success');

  } catch(e){
    console.error('[confirmFixedTerminate] error:', e);
    toast('처리 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    if(confirmBtn){
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-check"></i> 해지 확정';
    }
  }
}
// ── 임시저장 ──
async function saveDraftContract(reason){
  const coId  = document.getElementById('ct-company').value;
  if(!coId) return toast('회사를 선택하세요.','error');

  // 직원 ID: 수정모드→기존 계약에서, 재계약→_recontractEmpId, 신규→아직 없음
  let empId = editId.contract
    ? (allContracts.find(x=>x.id===editId.contract)||{}).employee_id||''
    : (_recontractEmpId||'');

  // 신규이면서 직원 이름만 입력된 경우: 이름이라도 있으면 임시 저장 허용 (직원 생성 없이)
  // → 임시저장은 직원 생성 없이 계약 데이터만 저장한다
  //   (등록 시 신규 직원도 함께 저장됨)
  const isNew     = !editId.contract && !_recontractEmpId;
  const isEditMode = !!editId.contract;

  // 현재 입력값 수집 (유효성 검사 없이 최대한 수집)
  const catForDraft = isEditMode
    ? (allContracts.find(x=>x.id===editId.contract)||{}).contract_type||'정규직'
    : (isNew ? document.getElementById('ct-em-category').value : document.getElementById('ct-type').value);
  const isDailyDraft = catForDraft ===CONTRACT_TYPE.DAILY;

  const scheduleJSON = getScheduleJSON();
  const workDays = parseInt(document.getElementById('ct-days').value)||0;
  const avgHours = parseFloat(document.getElementById('ct-hours').value)||0;

  // 신규 모드: ct-em-start(계약시작일) 전용 필드 사용. 없으면 ct-em-hire 폴백(하위호환)
  const contractStart = isNew
    ? (document.getElementById('ct-em-start')?.value || document.getElementById('ct-em-hire').value||'')
    : (document.getElementById('ct-start').value||'');
  const contractEnd = isNew
    ? (document.getElementById('ct-em-expire').value||'')
    : (document.getElementById('ct-end').value||'');

  const baseDraft       = getAmountVal('ct-base')||0;
  const annualDraft     = getAmountVal('ct-annual-sal')||0;
  const dailyDraft      = getAmountVal('ct-daily-wage')||0;
  const wkHolDraft      = isDailyDraft ? 0 : Math.round(baseDraft / 5); // 월 주휴수당 = 기본급 ÷ 5
  const isRegDraft      = catForDraft ===CONTRACT_TYPE.REGULAR || catForDraft ===CONTRACT_TYPE.REGULAR_PROBATION;
  const posDraft        = getAmountVal('ct-position')||0;
  const carDraft        = getAmountVal('ct-car')||0;
  const remoteAreaDraft = getAmountVal('ct-remote-area')||0;
  const mealDraft       = getAmountVal('ct-meal')||0;
  const researchDraft   = getAmountVal('ct-research')||0;
  const siteDraft       = getAmountVal('ct-site')||0;
  const skillDraft      = getAmountVal('ct-skill')||0;
  const licenseDraft    = getAmountVal('ct-license')||0;
  const commDraft       = getAmountVal('ct-communication')||0;
  const fitnessDraft    = getAmountVal('ct-fitness')||0;
  const selfDevDraft    = getAmountVal('ct-self-dev')||0;
  const bookDraft       = getAmountVal('ct-book')||0;
  const overseasDraft   = getAmountVal('ct-overseas')||0;
  // 임시저장: 출근일수 비례(daily) 항목은 월 약정임금 합산에서 제외
  const allAllowDraft   = posDraft
    + (_isFixedAllow('car')           ? carDraft        : 0)
    + remoteAreaDraft
    + (_isFixedAllow('meal')          ? mealDraft       : 0)
    + (_isFixedAllow('research')      ? researchDraft   : 0)
    + siteDraft + skillDraft + licenseDraft
    + (_isFixedAllow('communication') ? commDraft       : 0)
    + (_isFixedAllow('fitness')       ? fitnessDraft    : 0)
    + (_isFixedAllow('self_dev')      ? selfDevDraft    : 0)
    + (_isFixedAllow('book')          ? bookDraft       : 0)
    + (_isFixedAllow('overseas')      ? overseasDraft   : 0);
  // \uc815\uaddc\uc9c1: \uc5f0\ubd09\u00f712, \uc5f4\ubc18: \uae30\ubcf8\uae09+\uc8fc\ud734+\uc218\ub2f9, \uc77c\uc6a9\uc9c1: 0
  const monthlyDraft    = isDailyDraft ? 0
    : (isRegDraft && annualDraft > 0 ? Math.round(annualDraft / 12)
      : baseDraft + wkHolDraft + allAllowDraft);
  // 통상시급: 직접 입력값(ct-hourly-input)을 그대로 사용
  const hourlyDraft   = getAmountVal('ct-hourly-input') || 0;

  const draftBody = {
    employee_id:          empId||'',
    company_id:           coId,
    contract_start:       contractStart,
    contract_end:         contractEnd,
    contract_type:        catForDraft,
    status:               '임시저장',
    work_hours_per_day:   avgHours,
    work_days_per_week:   workDays,
    schedule_json:        JSON.stringify(scheduleJSON),
    annual_leave_days:    parseInt(document.getElementById('ct-annual').value)||15,
    annual_salary:        annualDraft,
    monthly_salary_agreed:monthlyDraft,
    base_salary:          isDailyDraft ? 0 : baseDraft,
    daily_wage:           isDailyDraft ? dailyDraft : 0,
    weekly_holiday_pay:   0,
    hourly_wage:          hourlyDraft,
    position_allowance:      posDraft,
    transportation_allowance:carDraft,
    transportation_pay_type: _getCTPayTypeVal('car'),
    self_driving_allowance:  0,
    self_driving_pay_type:   'fixed',
    remote_area_allowance:   remoteAreaDraft,
    remote_area_pay_type:    'fixed', // 벽지수당 항상 통상임금 포함
    meal_allowance:          mealDraft,
    meal_pay_type:           _getCTPayTypeVal('meal'),
    research_allowance:      researchDraft,
    research_pay_type:       _getCTPayTypeVal('research'),
    site_allowance:          siteDraft,
    skill_allowance:         skillDraft,
    license_allowance:       licenseDraft,
    communication_allowance: commDraft,
    communication_pay_type:  _getCTPayTypeVal('communication'),
    fitness_allowance:       fitnessDraft,
    fitness_pay_type:        _getCTPayTypeVal('fitness'),
    self_dev_allowance:      selfDevDraft,
    self_dev_pay_type:       _getCTPayTypeVal('self_dev'),
    book_allowance:          bookDraft,
    book_pay_type:           _getCTPayTypeVal('book'),
    overseas_allowance:      overseasDraft,
    overseas_pay_type:       _getCTPayTypeVal('overseas'),
    car_maintenance:         carDraft,
    regular_bonus:           getAmountVal('ct-regular-bonus')||0,
    childcare_allowance:     getAmountVal('ct-childcare')||0,
    childcare_dependents:    parseInt(document.getElementById('ct-childcare-dependents')?.value||1)||1,
    insurance_employment: true,
    insurance_industrial: true,
    insurance_pension:    true,
    insurance_health:     true,
    note:                 document.getElementById('ct-note').value||'',
    salary_start_date:    (editId.contract || _recontractEmpId)
      ? (document.getElementById('ct-start')?.value || '')
      : (document.getElementById('ct-em-start')?.value || document.getElementById('ct-em-hire')?.value || ''),
    salary_end_date:      '',
    is_draft:             true,
    draft_saved_at:       Date.now(),
  };

  // 신규 임시저장: 직원명 정도는 note에 보관 (직원 미생성)
  if(isNew){
    const tmpName = document.getElementById('ct-em-name').value.trim();
    if(tmpName) draftBody.note = `[임시저장] 직원명: ${tmpName}${draftBody.note ? ' / '+draftBody.note : ''}`;
  }

  let savedId;
  if(isEditMode){
    // 기존 계약 수정 중 임시저장 → PATCH
    draftBody.id = editId.contract;
    await api(`../tables/contracts/${editId.contract}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
    savedId = editId.contract;
  } else if(editId.contract === null && _currentDraftId){
    // 이전 임시저장 ID가 있으면 덮어쓰기
    draftBody.id = _currentDraftId;
    await api(`../tables/contracts/${_currentDraftId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
    savedId = _currentDraftId;
  } else {
    // 최초 임시저장 → POST
    draftBody.id = 'cont_draft_'+Date.now();
    const res = await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
    savedId = res.id || draftBody.id;
    _currentDraftId = savedId;
  }

  await loadContracts();
  renderContracts();

  // 임시저장 시각 표시
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const infoEl = document.getElementById('ct-draft-saved-info');
  if(infoEl){ infoEl.style.display='inline'; infoEl.innerHTML=`<i class="fas fa-check" style="color:#10b981;margin-right:3px;"></i>임시저장 완료 (${timeStr})`; }

  if(reason){
    toast(`⚠ 필수 항목 누락으로 임시저장 되었습니다.\n[${reason}]`, 'warning');
  } else {
    toast(`임시저장 되었습니다. (${timeStr})`, 'success');
  }
}

// 임시저장 진행 중인 draft ID (신규 작성 시 추적용)
let _currentDraftId = null;

// ── 주민등록번호 포맷·유효성 헬퍼 ──────────────────────────────────────────
/**
 * _formatIdInput(el)
 *  - 입력 중 숫자만 추출 → YYMMDD 6자리 입력 후 자동 하이픈 삽입
 *  - 하이픈 뒤 1자리(성별코드)까지만 허용 → 최대 8문자 "YYMMDD-N"
 *  - 커서 위치 보정 (하이픈 자동 삽입 시 +1)
 */
function _formatIdInput(el){
  const sel  = el.selectionStart;       // 현재 커서 위치
  const prev = el.value;
  // 숫자만 추출 (최대 7자리: 6 생년월일 + 1 성별)
  const digits = prev.replace(/[^0-9]/g, '').slice(0, 7);
  let next = '';
  let cursorAdj = 0;                    // 하이픈 자동 삽입으로 인한 커서 보정

  if(digits.length <= 6){
    next = digits;
  } else {
    // 7번째 자리가 입력됐으면 하이픈 삽입
    next = digits.slice(0,6) + '-' + digits.slice(6);
    // 이전 값에 하이픈이 없었으면 커서 1칸 앞으로 보정
    if(!prev.includes('-')) cursorAdj = 1;
  }

  if(next !== prev){
    el.value = next;
    // 커서 복원
    const newPos = Math.min(sel + cursorAdj, next.length);
    el.setSelectionRange(newPos, newPos);
  }
}

/**
 * _inferGender(genderCode)
 *  주민번호 7번째 자리(성별코드)로 남/여 판단
 *  1·3·5·7 → 남,  2·4·6·8 → 여,  그 외 → null
 */
function _inferGender(genderCode){
  const n = parseInt(genderCode, 10);
  if([1,3,5,7].includes(n)) return '남';
  if([2,4,6,8].includes(n)) return '여';
  return null;
}

/**
 * _validateIdNumber(val)
 *  입력값이 "YYMMDD-N" 7자리 규격에 맞는지 검사
 *  반환: { ok: boolean, msg: string }
 *    ok=true  → 형식 정상
 *    ok=false → msg에 오류 설명
 */
function _validateIdNumber(val){
  if(!val || !val.trim()) return { ok: false, msg: '주민등록번호를 입력해 주세요.' };
  // 반드시 "YYMMDD-N" 형식 (하이픈 필수)
  if(!/^\d{6}-\d{1}$/.test(val.trim()))
    return { ok: false, msg: '주민등록번호는 생년월일 6자리 + 하이픈(-) + 성별코드 1자리(YYMMDD-N) 형식으로 입력해 주세요.' };
  const s = val.replace(/-/g,'');

  const yy = parseInt(s.slice(0,2), 10);
  const mm = parseInt(s.slice(2,4), 10);
  const dd = parseInt(s.slice(4,6), 10);
  const gd = parseInt(s.slice(6,7), 10);

  // 월 검사
  if(mm < 1 || mm > 12) return { ok: false, msg: `주민등록번호 월(${String(mm).padStart(2,'0')})이 올바르지 않습니다.` };
  // 일 검사 (간단 범위 — 성별코드로 연도 유추 후 정밀 검사)
  const maxDay = [0,31,29,31,30,31,30,31,31,30,31,30,31];
  if(dd < 1 || dd > maxDay[mm]) return { ok: false, msg: `주민등록번호 일(${String(dd).padStart(2,'0')})이 올바르지 않습니다.` };
  // 성별코드 검사: 1(남·1900년대), 2(여·1900년대), 3(남·2000년대), 4(여·2000년대)
  //               5(남·외국인·1900년대), 6(여·외국인·1900년대), 7(남·외국인·2000년대), 8(여·외국인·2000년대)
  if(gd < 1 || gd > 8) return { ok: false, msg: '성별코드는 1~8 사이의 숫자여야 합니다.' };

  return { ok: true, msg: '' };
}

/**
 * _onIdInput(el, checkBtnFn)
 *  주민번호 입력 필드 oninput 핸들러
 *  1) 자동 포맷 적용
 *  2) 인라인 오류 힌트 표시/제거
 *  3) 버튼 상태 갱신 콜백 호출
 */
function _onIdInput(el, checkBtnFn){
  _formatIdInput(el);
  const val = el.value;
  // 힌트 span (없으면 생성)
  let hint = el.parentElement.querySelector('.id-format-hint');
  if(!hint){
    hint = document.createElement('span');
    hint.className = 'id-format-hint';
    hint.style.cssText = 'font-size:11px;margin-top:3px;display:block;';
    el.parentElement.appendChild(hint);
  }
  if(!val){
    hint.textContent = '';
    hint.style.color = '';
    // 주민번호 지워지면 성별 힌트도 초기화
    const _nhint = document.getElementById('ct-em-gender-hint');
    const _ehint = document.getElementById('ct-edit-em-gender-hint');
    if(_nhint && document.getElementById('ct-em-id') === el)
      { _nhint.textContent = '주민번호 입력 시 자동 설정됩니다'; _nhint.style.color='#6b7280'; }
    if(_ehint && document.getElementById('ct-edit-em-id') === el)
      { _ehint.textContent = '주민번호 입력 시 자동 설정됩니다'; _ehint.style.color='#6b7280'; }
  } else {
    const { ok, msg } = _validateIdNumber(val);
    if(ok){
      hint.textContent = '✓ 형식 확인';
      hint.style.color = '#16a34a';  // green
      // ── 성별 자동 설정 ──
      const _gCode = val.replace(/-/g,'').slice(6,7);
      const _gender = _inferGender(_gCode);
      if(_gender){
        // 신규 폼
        const _newGenderEl = document.getElementById('ct-em-gender');
        if(_newGenderEl && document.getElementById('ct-em-id') === el){
          _newGenderEl.value = _gender;
          const _newHint = document.getElementById('ct-em-gender-hint');
          if(_newHint){ _newHint.textContent = `성별 자동 설정: ${_gender}`; _newHint.style.color='#16a34a'; }
        }
        // 수정/재계약 폼
        const _editGenderEl = document.getElementById('ct-edit-em-gender');
        if(_editGenderEl && document.getElementById('ct-edit-em-id') === el){
          _editGenderEl.value = _gender;
          const _editHint = document.getElementById('ct-edit-em-gender-hint');
          if(_editHint){ _editHint.textContent = `성별 자동 설정: ${_gender}`; _editHint.style.color='#16a34a'; }
        }
      }
    } else if(val.replace(/-/g,'').length < 7){
      // 아직 입력 중 — 부드러운 안내
      const digits = val.replace(/[^0-9]/g,'');
      hint.textContent = digits.length < 6
        ? `생년월일 ${6-digits.length}자리 더 입력`
        : '하이픈(-) 뒤 성별코드(1~8) 입력';
      hint.style.color = '#6b7280';  // gray
    } else {
      hint.textContent = '✗ ' + msg;
      hint.style.color = '#dc2626';  // red
    }
  }
  if(typeof checkBtnFn === 'function') checkBtnFn();
}

// ── 필수 입력 유효성 검사 + 하이라이트 헬퍼 ──────────────────────────────
function _ctClearErrors(){
  // 이전 오류 하이라이트 전부 초기화
  document.querySelectorAll('#contract-modal .ct-field-error').forEach(el=>{
    el.classList.remove('ct-field-error');
  });
  const banner = document.getElementById('ct-validation-banner');
  if(banner) banner.style.display = 'none';
}

function _ctMarkError(fieldId, label, errors){
  // form-group 부모에 에러 클래스 부여
  const el = document.getElementById(fieldId);
  if(!el) return;
  const fg = el.closest('.form-group') || el.parentElement;
  if(fg) fg.classList.add('ct-field-error');
  errors.push(label);
}

function _ctShowErrors(errors){
  if(!errors.length) return;
  const banner = document.getElementById('ct-validation-banner');
  const list   = document.getElementById('ct-validation-list');
  if(!banner || !list) return;
  list.innerHTML = errors.map(e=>`<li>${e}</li>`).join('');
  banner.style.display = 'block';
  // 배너로 스크롤
  banner.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

// 유효성 검사 실행 → 오류 있으면 true 반환 (saveDraftContract 진입 전 분기)
function _ctValidate(){
  _ctClearErrors();
  const errors = [];
  const isNew     = !editId.contract && !_recontractEmpId;
  const isEditOrRecontract = !isNew;

  // ── 공통: 회사 ──
  const coId = document.getElementById('ct-company').value;
  if(!coId) _ctMarkError('ct-company', '회사 선택', errors);

  // ── 수정/재계약: 계약 시작일 ──
  if(isEditOrRecontract){
    const start = document.getElementById('ct-start').value;
    if(!start) _ctMarkError('ct-start', '계약 시작일', errors);
  }

  if(isNew){
    // ── 신규 직원 필수 필드 ──
    const _empNoNewVal = document.getElementById('ct-em-empno')?.value.trim() || '';
    if(!_empNoNewVal){
      _ctMarkError('ct-em-empno', '사원번호', errors);
    } else {
      const _coIdForEmpno = document.getElementById('ct-company')?.value || '';
      const _empNoCheck = _validateEmpNoUniqueness(_empNoNewVal, _coIdForEmpno, null, null, null);
      if(!_empNoCheck.ok) _ctMarkError('ct-em-empno', `사원번호 중복: ${_empNoCheck.msg}`, errors);
    }
    if(!document.getElementById('ct-em-name').value.trim())
      _ctMarkError('ct-em-name', '이름', errors);
    if(!document.getElementById('ct-em-hire').value)
      _ctMarkError('ct-em-hire', '입사일', errors);
    if(!document.getElementById('ct-em-start')?.value)
      _ctMarkError('ct-em-start', '계약 시작일', errors);
    (function(){
      const _idVal = document.getElementById('ct-em-id').value.trim();
      if(!_idVal){
        _ctMarkError('ct-em-id', '주민등록번호', errors);
      } else {
        const _idChk = _validateIdNumber(_idVal);
        if(!_idChk.ok) _ctMarkError('ct-em-id', '주민등록번호 형식 오류', errors);
      }
    })();
    if(!document.getElementById('ct-em-job').value.trim())
      _ctMarkError('ct-em-job', '담당업무', errors);
    if(!document.getElementById('ct-em-address').value.trim())
      _ctMarkError('ct-em-address', '주소', errors);
    if(!document.getElementById('ct-em-phone').value.trim())
      _ctMarkError('ct-em-phone', '휴대전화', errors);
    if(!document.getElementById('ct-em-category').value)
      _ctMarkError('ct-em-category', '고용형태', errors);
    const _depVal = parseInt(document.getElementById('ct-em-dependents')?.value);
    if(isNaN(_depVal) || _depVal < 0)
      _ctMarkError('ct-em-dependents', '부양가족 수', errors);

    // ── 임금 관련 (고용형태 기준) ──
    const cat = document.getElementById('ct-em-category').value;
    if(cat ===CONTRACT_TYPE.DAILY){
      if(!getAmountVal('ct-daily-wage'))
        _ctMarkError('ct-daily-wage', '일급여', errors);
    } else if(cat){
      // 정규직·정규직 수습·계약직·계약직 수습은 기본급이 자동계산이므로 필수 체크 제외
      if(cat !==CONTRACT_TYPE.REGULAR && cat !==CONTRACT_TYPE.REGULAR_PROBATION && cat !==CONTRACT_TYPE.FIXED && cat !==CONTRACT_TYPE.FIXED_PROBATION){
        if(!getAmountVal('ct-base'))
          _ctMarkError('ct-base', '기본급', errors);
      }
      if(cat ===CONTRACT_TYPE.REGULAR || cat ===CONTRACT_TYPE.REGULAR_PROBATION){
        if(!getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '연봉', errors);
      } else if(cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION){
        if(!getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '월 약정급여', errors);
      }
    }
    // ── 계약직·계약직 수습·일용직: 계약 종료일(퇴사예정일) 필수 ──
    if(cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION || cat ===CONTRACT_TYPE.DAILY){
      if(!document.getElementById('ct-em-expire')?.value)
        _ctMarkError('ct-em-expire', '계약 종료일', errors);
    }
    // ── 수습 계약: 수습 조건 전체 필수 ──
    if(cat ===CONTRACT_TYPE.REGULAR_PROBATION || cat ===CONTRACT_TYPE.FIXED_PROBATION){
      // 수습기간
      if(!document.getElementById('ct-probation-months')?.value)
        _ctMarkError('ct-probation-months', '수습기간', errors);
      // 수습 임금 비율 (direct 모드가 아닐 때)
      const _probBasis = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || '';
      if(_probBasis !== 'direct'){
        const _probPctVal = parseFloat(document.getElementById('ct-probation-pct')?.value);
        if(!_probPctVal || _probPctVal <= 0)
          _ctMarkError('ct-probation-pct', '수습 임금 비율(%)', errors);
      }
      // 수습 임금 월 금액 (항상 필수)
      const _probAmtVal = parseFloat(document.getElementById('ct-probation-amt')?.value);
      if(!_probAmtVal || _probAmtVal <= 0)
        _ctMarkError('ct-probation-amt', '수습 임금(월 금액)', errors);
    }
  } else {
    // ── 수정/재계약: 직원 필수 필드 ──
    const _empNoEditVal = document.getElementById('ct-edit-em-empno')?.value.trim() || '';
    if(!_empNoEditVal){
      _ctMarkError('ct-edit-em-empno', '사원번호', errors);
    } else {
      const _editC = editId.contract ? allContracts.find(x => x.id === editId.contract) : null;
      const _editSelfEmpId = _editC ? _editC.employee_id : null;
      const _coIdForEditEmpno = currentContCompanyId || document.getElementById('ct-company')?.value || '';
      const _editEmpNoCheck = _validateEmpNoUniqueness(_empNoEditVal, _coIdForEditEmpno, _editSelfEmpId, null, null);
      if(!_editEmpNoCheck.ok) _ctMarkError('ct-edit-em-empno', `사원번호 중복: ${_editEmpNoCheck.msg}`, errors);
    }
    (function(){
      const _idValE = document.getElementById('ct-edit-em-id')?.value.trim();
      if(!_idValE){
        _ctMarkError('ct-edit-em-id', '주민등록번호', errors);
      } else {
        const _idChkE = _validateIdNumber(_idValE);
        if(!_idChkE.ok) _ctMarkError('ct-edit-em-id', '주민등록번호 형식 오류', errors);
      }
    })();
    if(!document.getElementById('ct-edit-emp-name')?.value.trim())
      _ctMarkError('ct-edit-emp-name', '이름', errors);
    // 입사일: 행이 표시된 경우에만 필수 검사 (계약직·일용직 재계약 시 행 숨김)
    { const _hireRow = document.getElementById('ct-edit-row-hire');
      const _hireRowVisible = !_hireRow || _hireRow.style.display !== 'none';
      if(_hireRowVisible && !document.getElementById('ct-edit-em-hire')?.value)
        _ctMarkError('ct-edit-em-hire', '입사일', errors);
    }
    if(!document.getElementById('ct-edit-em-job')?.value.trim())
      _ctMarkError('ct-edit-em-job', '담당업무', errors);
    if(!document.getElementById('ct-edit-em-phone')?.value.trim())
      _ctMarkError('ct-edit-em-phone', '휴대전화', errors);
    if(!document.getElementById('ct-edit-em-address')?.value.trim())
      _ctMarkError('ct-edit-em-address', '주소', errors);
    const _editDepVal = parseInt(document.getElementById('ct-edit-em-dependents')?.value);
    if(isNaN(_editDepVal) || _editDepVal < 0)
      _ctMarkError('ct-edit-em-dependents', '부양가족 수', errors);

    // ── 수정/재계약: 임금 관련 ──
    const catForCheck = (document.getElementById('ct-edit-em-category')?.value)
      || (document.getElementById('ct-type')?.value) || '정규직';
    if(catForCheck ===CONTRACT_TYPE.DAILY){
      if(!getAmountVal('ct-daily-wage'))
        _ctMarkError('ct-daily-wage', '일급여', errors);
    } else {
      // 정규직·정규직 수습·계약직·계약직 수습은 기본급이 자동계산이므로 필수 체크 제외
      if(catForCheck !==CONTRACT_TYPE.REGULAR && catForCheck !==CONTRACT_TYPE.REGULAR_PROBATION && catForCheck !==CONTRACT_TYPE.FIXED && catForCheck !==CONTRACT_TYPE.FIXED_PROBATION){
        if(!getAmountVal('ct-base'))
          _ctMarkError('ct-base', '기본급', errors);
      }
      if(catForCheck ===CONTRACT_TYPE.REGULAR || catForCheck ===CONTRACT_TYPE.REGULAR_PROBATION){
        if(!getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '연봉', errors);
      } else if(catForCheck ===CONTRACT_TYPE.FIXED || catForCheck ===CONTRACT_TYPE.FIXED_PROBATION){
        if(!getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '월 약정급여', errors);
      }
    }
    // ── 계약직·계약직 수습·일용직: 계약 종료일 필수 ──
    if(catForCheck ===CONTRACT_TYPE.FIXED || catForCheck ===CONTRACT_TYPE.FIXED_PROBATION || catForCheck ===CONTRACT_TYPE.DAILY){
      if(!document.getElementById('ct-end')?.value)
        _ctMarkError('ct-end', '계약 종료일', errors);
    }
    // ── 수습 계약: 수습 조건 전체 필수 ──
    if(catForCheck ===CONTRACT_TYPE.REGULAR_PROBATION || catForCheck ===CONTRACT_TYPE.FIXED_PROBATION){
      if(!document.getElementById('ct-probation-months')?.value)
        _ctMarkError('ct-probation-months', '수습기간', errors);
      const _probBasis2 = document.querySelector('input[name="ct-probation-basis"]:checked')?.value || '';
      if(_probBasis2 !== 'direct'){
        const _probPctVal2 = parseFloat(document.getElementById('ct-probation-pct')?.value);
        if(!_probPctVal2 || _probPctVal2 <= 0)
          _ctMarkError('ct-probation-pct', '수습 임금 비율(%)', errors);
      }
      const _probAmtVal2 = parseFloat(document.getElementById('ct-probation-amt')?.value);
      if(!_probAmtVal2 || _probAmtVal2 <= 0)
        _ctMarkError('ct-probation-amt', '수습 임금(월 금액)', errors);
    }
  }

  // ── 최저임금 위반 검사 ──
  const _mwProbRow    = document.getElementById('ct-prob-minwage-warning-row');
  const _mwGeneralRow = document.getElementById('ct-general-minwage-warning-row');
  const _violatesMW   = !!(_mwProbRow    && _mwProbRow.style.display    !== 'none')
                     || !!(_mwGeneralRow && _mwGeneralRow.style.display !== 'none');
  if(_violatesMW)
    errors.push('최저임금 위반 — 기본급(또는 일급여)을 최저임금 이상으로 올려주세요.');

  // ── 계약기간 1개월 미만 위반 검사 (계약직·계약직 수습) ──
  const _shortTermRow = document.getElementById('ct-short-term-warning-row');
  if(_shortTermRow && _shortTermRow.style.display !== 'none')
    errors.push('계약기간 1개월 미만 — 일용직으로 변경하거나 종료일을 조정해 주세요.');

  if(errors.length){
    _ctShowErrors(errors);
    return true; // 오류 있음
  }
  return false;  // 통과
}
// ─────────────────────────────────────────────────────────────────────────────

async function saveContract(){
  console.log('[saveContract] 시작');
  // ── 필수 입력 일괄 검사 (하이라이트 + 배너) ──
  const _valResult = _ctValidate();
  console.log('[saveContract] _ctValidate 결과:', _valResult);
  if(_valResult) return;

  // 재계약 모드: _recontractEmpId 사용
  let empId = editId.contract ? (allContracts.find(x=>x.id===editId.contract)||{}).employee_id||'' : (_recontractEmpId||'');
  const coId = document.getElementById('ct-company').value;
  const start = (editId.contract||_recontractEmpId) ? document.getElementById('ct-start').value : '';
  const base  = getAmountVal('ct-base');

  // ── 신규 직원인 경우 먼저 직원 저장 ──
  if(!empId && !editId.contract && !_recontractEmpId){
    const newName = document.getElementById('ct-em-name').value.trim();
    const newHire  = document.getElementById('ct-em-hire').value.trim();
    const newId    = document.getElementById('ct-em-id').value.trim();
    const newDep   = document.getElementById('ct-em-dependents')?.value ?? 0;
    const newJob = document.getElementById('ct-em-job').value.trim();
    const newAddress = document.getElementById('ct-em-address').value.trim();
    const newPhone = document.getElementById('ct-em-phone').value.trim();
    const newCat = document.getElementById('ct-em-category').value;
    const empBody = {
      id: 'emp'+Date.now(),
      company_id: coId,
      name: newName,
      gender: document.getElementById('ct-em-gender').value,
      employment_category: document.getElementById('ct-em-category').value,
      employee_number: document.getElementById('ct-em-empno')?.value.trim() || '',
      job_description: newJob,
      id_number: document.getElementById('ct-em-id').value,
      department: document.getElementById('ct-em-dept').value,
      position: document.getElementById('ct-em-position').value,
      hire_date: document.getElementById('ct-em-hire').value,
      expire_date: document.getElementById('ct-em-expire').value,
      status: EMP_STATUS.ACTIVE,
      dependents: parseInt(document.getElementById('ct-em-dependents')?.value)||0,
      phone: document.getElementById('ct-em-phone').value,
      email: document.getElementById('ct-em-email').value,
      address: document.getElementById('ct-em-address').value,
      bank_name: document.getElementById('ct-em-bank')?.value.trim()    || '',
      bank_account: document.getElementById('ct-em-account')?.value.trim() || '',
      is_representative: document.getElementById('ct-em-is-rep')?.checked ? 1 : 0,
      note: ''
    };
    const saved = await api('../tables/employees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(empBody)});
    empId = saved.id || empBody.id;
    await loadEmployees();
  }

  if(!empId) return saveDraftContract('직원 정보 누락');

  // 정규직 계열 여부 판단 (신규: 구분 선택값, 수정/재계약: 계약유형 select)
  // 고용형태는 인사정보(ct-edit-em-category) 기준으로 읽음
  const catForSave = editId.contract
    ? (document.getElementById('ct-edit-em-category')?.value||(allContracts.find(x=>x.id===editId.contract)||{}).contract_type||'정규직')
    : (_recontractEmpId ? (document.getElementById('ct-edit-em-category')?.value||'정규직') : (document.getElementById('ct-em-category').value||'정규직'));
  const isRegularGroup = catForSave ===CONTRACT_TYPE.REGULAR || catForSave ===CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedTermSave = catForSave ===CONTRACT_TYPE.FIXED || catForSave ===CONTRACT_TYPE.FIXED_PROBATION;
  const isProbationSave = catForSave ===CONTRACT_TYPE.REGULAR_PROBATION || catForSave ===CONTRACT_TYPE.FIXED_PROBATION;
  const isDailySave = catForSave ===CONTRACT_TYPE.DAILY;

  const annualSalInputSave = getAmountVal('ct-annual-sal'); // 정규직:연봉 / 계약직:월약정급여
  const annual = isRegularGroup ? annualSalInputSave : 0;   // annual_salary에는 정규직만 저장
  // 수습 데이터 (_ctValidate에서 필수 검증 통과 후이므로 값이 항상 존재)
  const probMonths = isProbationSave ? (parseInt(document.getElementById('ct-probation-months').value) || 0) : 0;
  const probPct    = isProbationSave ? (parseFloat(document.getElementById('ct-probation-pct').value) || 0) : 0;
  const probAmt    = isProbationSave ? (parseFloat(document.getElementById('ct-probation-amt').value) || 0) : 0;
  const probBasis  = isProbationSave ? (document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary') : 'salary';
  const hours=parseFloat(document.getElementById('ct-hours').value)||0;
  const days=parseFloat(document.getElementById('ct-days').value)||5;

  // ── 임금 계산 (일용직 vs 계약직 vs 정규직) ──
  let weeklyHol, monthly, baseSalaryForSave, dailyWageForSave;
  // 통상시급: 직접 입력값(ct-hourly-input)을 그대로 사용
  const hourlyWage = getAmountVal('ct-hourly-input') || 0;
  if(isDailySave){
    dailyWageForSave = getAmountVal('ct-daily-wage');
    baseSalaryForSave = 0;
    weeklyHol = 0;
    monthly = 0;
  } else {
    dailyWageForSave = 0;
    baseSalaryForSave = base;
    weeklyHol = Math.round(base / days); // 월 주휴수당 = 기본급 ÷ dpw (단시간 비례 적용)
    const position2   = getAmountVal('ct-position');
    const car2        = getAmountVal('ct-car');
    const remoteArea2 = getAmountVal('ct-remote-area');
    const meal2       = getAmountVal('ct-meal');
    const research2   = getAmountVal('ct-research');
    const other2      = getAmountVal('ct-other')||0;
    const site2       = getAmountVal('ct-site')||0;
    const skill2      = getAmountVal('ct-skill')||0;
    const lic2        = getAmountVal('ct-license')||0;
    const comm2       = getAmountVal('ct-communication')||0;
    const fit2        = getAmountVal('ct-fitness')||0;
    const sdev2       = getAmountVal('ct-self-dev')||0;
    const book2       = getAmountVal('ct-book')||0;
    const ovseas2     = getAmountVal('ct-overseas')||0;
    // 등록 저장: 출근일수 비례(daily) 항목은 월 약정임금 합산에서 제외
    const allAllow2   = position2
      + (_isFixedAllow('car')           ? car2        : 0)
      + remoteArea2
      + (_isFixedAllow('meal')          ? meal2       : 0)
      + (_isFixedAllow('research')      ? research2   : 0)
      + other2
      + site2 + skill2 + lic2
      + (_isFixedAllow('communication') ? comm2       : 0)
      + (_isFixedAllow('fitness')       ? fit2        : 0)
      + (_isFixedAllow('self_dev')      ? sdev2       : 0)
      + (_isFixedAllow('book')          ? book2       : 0)
      + (_isFixedAllow('overseas')      ? ovseas2     : 0);
    // 월 약정임금 결정:
    //   계약직 → ct-annual-sal 입력값(월약정급여) 그대로
    //   정규직 → 연봉÷12
    //   그 외  → 기본급+주휴+수당 합산
    if(isFixedTermSave && annualSalInputSave > 0){
      monthly = annualSalInputSave;
    } else if(isRegularGroup && annual > 0){
      monthly = Math.round(annual / 12);
    } else {
      monthly = base + weeklyHol + allAllow2;
    }
  }

  // ── 최저임금 검증 ① 공용 경고 행 표시 중이면 즉시 차단 ──
  {
    const _gwRow = document.getElementById('ct-general-minwage-warning-row');
    if(_gwRow && _gwRow.style.display !== 'none'){
      openModal('ct-minwage-warn-modal');
      return;
    }
  }

  // ── 최저임금 검증 ② 시급 계산 기반 검증 (비과세 수당 포함 월 환산시급 기준) ──
  {
    // 계약 시작 연도 결정
    // 신규 모드: ct-em-start(계약시작일) 우선, 없으면 ct-em-hire 폴백
    const _hireRaw = editId.contract
      ? document.getElementById('ct-start')?.value
      : (_recontractEmpId
          ? document.getElementById('ct-start')?.value
          : (document.getElementById('ct-em-start')?.value || document.getElementById('ct-em-hire')?.value));
    const _contractYear = _hireRaw ? parseInt(_hireRaw.slice(0,4)) : new Date().getFullYear();
    const _mw = _allMinimumWages.find(w => Number(w.year) === _contractYear);

    if(_mw && Number(_mw.hourly_wage) > 0){
      const _legalMinWage = Number(_mw.hourly_wage);

      // ── 정규직 수습 예외: 최저임금법 §5②에 따라 수습 사용 3개월 이내 → 최저시급의 90%까지 허용
      // (1년 미만 단기계약직·일용직에는 적용 안 됨)
      const _isRegularProbation = (catForSave ===CONTRACT_TYPE.REGULAR_PROBATION);
      const _isProbationContract = (catForSave ===CONTRACT_TYPE.REGULAR_PROBATION || catForSave ===CONTRACT_TYPE.FIXED_PROBATION);
      const _effectiveMinWage   = _isRegularProbation
        ? Math.ceil(_legalMinWage * 0.9)   // 정규직 수습: 90% 기준 (올림)
        : _legalMinWage;                    // 그 외: 100% 기준

      // ── 산정기준에 따른 비교 시급 결정 ──
      // [minwage/direct]: probAmt(수습 보수) ÷ 209 → 수습 보수 기준 시급 비교
      // [salary / 비수습]: hourlyWage(비과세 포함 월임금 ÷ 209) 비교
      const _useProbAmt = _isProbationContract && (probBasis === 'minwage' || probBasis === 'direct');
      let _compareHourly;
      let _compareMonthly;
      if(_useProbAmt){
        // 수습 보수 직접 비교: probAmt → 시급 환산
        _compareHourly  = probAmt > 0 ? Math.round(probAmt / MAGIC.MONTHLY_STD_HOURS) : 0;
        _compareMonthly = probAmt;
      } else {
        // 약정 보수 대비 기준 또는 비수습: 비과세 포함 월 환산시급
        _compareHourly  = hourlyWage;
        _compareMonthly = isDailySave
          ? (dailyWageForSave * (hours > 0 ? Math.round(209 / hours) : 1))
          : monthly;
      }

      if(_compareHourly > 0 && _compareHourly < _effectiveMinWage){
        const _detail = document.getElementById('ct-minwage-warn-detail');
        if(_detail){
          const _mwMonthly = Math.round(_effectiveMinWage * 209);
          _detail.innerHTML =
            `<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>📅 계약 연도</span><strong>${_contractYear}년</strong>
             </div>
             <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>⚖️ ${_contractYear}년 법정 최저시급</span>
               <strong style="color:#b91c1c;">${_legalMinWage.toLocaleString('ko-KR')}원</strong>
             </div>
             ${_isRegularProbation ? `
             <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>🌱 정규직 수습 적용 최저시급 <span style="font-size:10.5px;color:#9ca3af;">(법정×90%)</span></span>
               <strong style="color:#b45309;">${_effectiveMinWage.toLocaleString('ko-KR')}원 (월 ${_mwMonthly.toLocaleString('ko-KR')}원)</strong>
             </div>` : ''}
             <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>💰 입력 시급 <span style="font-size:10.5px;color:#9ca3af;">${_useProbAmt ? '(수습 보수÷209)' : '(비과세 포함, 월÷209)'}</span></span>
               <strong style="color:#ef4444;">${_compareHourly.toLocaleString('ko-KR')}원</strong>
             </div>
             <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #fca5a5;padding-bottom:6px;margin-bottom:6px;">
               <span>📋 ${_useProbAmt ? '수습 월 보수' : '월 환산임금'} <span style="font-size:10.5px;color:#9ca3af;">${_useProbAmt ? '' : '(비과세 포함)'}</span></span>
               <strong style="color:#6b7280;">${_compareMonthly.toLocaleString('ko-KR')}원</strong>
             </div>
             <div style="display:flex;justify-content:space-between;">
               <span>📉 시급 부족액 <span style="font-size:10.5px;color:#9ca3af;">(적용 최저시급 기준)</span></span>
               <strong style="color:#ef4444;">-${(_effectiveMinWage - _compareHourly).toLocaleString('ko-KR')}원/시간</strong>
             </div>`;
        }
        // 모달 타이틀·설명 문구 동적 업데이트
        const _warnMsg = document.getElementById('ct-minwage-warn-msg');
        if(_warnMsg){
          if(_isRegularProbation){
            _warnMsg.innerHTML = '입력된 수습 급여가 최저임금의 90%에 미달합니다.<br><span style="font-size:12px;font-weight:500;color:#92400e;">정규직 수습은 최저시급의 90%까지 허용됩니다.</span>';
          } else if(_isProbationContract && probBasis === 'minwage'){
            _warnMsg.innerHTML = '입력된 수습 보수가 최저임금에 미달합니다.<br><span style="font-size:12px;font-weight:500;color:#92400e;">최저임금 대비 요율 기준으로 계산된 금액을 확인해주세요.</span>';
          } else if(_isProbationContract && probBasis === 'direct'){
            _warnMsg.innerHTML = '직접 입력한 수습 보수가 최저임금보다 낮습니다.<br><span style="font-size:12px;font-weight:500;color:#92400e;">적용 최저시급 이상의 금액으로 다시 입력해주세요.</span>';
          } else {
            _warnMsg.innerHTML = '입력된 급여가 최저임금보다 낮습니다.<br>올바르게 다시 입력해주세요.';
          }
        }
        openModal('ct-minwage-warn-modal');
        return; // 저장 차단
      }
    }
  }

  // 신규/재계약 모드: 계약시작일, 종료일, 유형, 상태 결정
  const isRecontract = !!_recontractEmpId && !editId.contract;
  const isEditMode   = !!editId.contract;
  const today3 = new Date().toISOString().slice(0,10);
  let contractStart, contractEnd, contractType, contractStatus;
  if(isEditMode){
    contractStart = start;
    contractEnd   = document.getElementById('ct-end').value;
    contractType  = document.getElementById('ct-type').value;
    // 편집 모드: 계약직/일용직 종료일 변경 시 상태 자동 처리
    const origContract = allContracts.find(x=>x.id===editId.contract)||{};
    const isFixedEdit  = (contractType===CONTRACT_TYPE.FIXED||contractType===CONTRACT_TYPE.FIXED_PROBATION||contractType===CONTRACT_TYPE.DAILY);
    const origEnd2     = origContract.contract_end||'';
    const origStart2   = origContract.contract_start||'';
    const newEnd2      = contractEnd;
    let autoStatus = document.getElementById('ct-status').value;
    if(isFixedEdit && newEnd2 && newEnd2 !== origEnd2){
      if(newEnd2 < origStart2){
        // 시작일 이전으로 종료일 소급 → 해지
        autoStatus = '해지';
      } else if(newEnd2 <= today3){
        // 현재 이전 날짜로 변경 → 즉시 해지 (계약 종료일 앞당김)
        autoStatus = '해지';
      } else if(origEnd2 && newEnd2 > origEnd2){
        // 종료일 연장: 기존 계약 만료 + 새 계약 등록 정책 → 등록 차단 후 갱신 플로우 유도
        toast('계약 종료일을 연장하려면 [갱신] 버튼을 사용해 주세요.\n편집 저장으로는 종료일을 연장할 수 없습니다.', 'error');
        return;
      } else {
        // 종료일 앞당김 (원래보다 이전, 오늘 이후) → 해지로 처리
        autoStatus = '해지';
      }
    }
    contractStatus= autoStatus;
  } else if(isRecontract){
    contractStart = document.getElementById('ct-start').value;
    contractEnd   = document.getElementById('ct-end').value;
    contractType  = document.getElementById('ct-type').value;
    const today2  = new Date().toISOString().slice(0,10);
    contractStatus= contractStart > today2 ? '계약예정' : '활성';
  } else {
    // 신규 모드: ct-em-start(계약시작일) 전용 필드 사용. 없으면 ct-em-hire 폴백(하위호환)
    contractStart = document.getElementById('ct-em-start')?.value
                 || document.getElementById('ct-em-hire').value;
    contractEnd   = document.getElementById('ct-em-expire').value;
    contractType  = document.getElementById('ct-em-category').value;
    const today2new = new Date().toISOString().slice(0,10);
    contractStatus = contractStart > today2new ? '계약예정' : '활성';
  }

  // 요일별 스케줄 수집
  const scheduleJSON = getScheduleJSON();
  const workDaysCount = parseInt(document.getElementById('ct-days').value)||0;
  const avgDayHours   = parseFloat(document.getElementById('ct-hours').value)||0;

  // ── 파일 업로드 처리 (Base64 변환) ──
  const _skipUpload = document.getElementById('cp-skip-upload')?.checked;
  let signedFileName='', signedFileData='', consentFileName='', consentFileData='';
  if(!_skipUpload && !isEditMode){
    if(window._contractSignedFile){
      signedFileName = window._contractSignedFile.name;
      signedFileData = await _fileToBase64(window._contractSignedFile);
    }
    if(window._contractConsentFile){
      consentFileName = window._contractConsentFile.name;
      consentFileData = await _fileToBase64(window._contractConsentFile);
    }
  } else if(isEditMode){
    // 편집 모드: 기존 파일 데이터 유지 (새 파일 선택 시에만 덮어쓰기)
    const origC = allContracts.find(x=>x.id===editId.contract)||{};
    signedFileName  = origC.signed_file_name  || '';
    signedFileData  = origC.signed_file_data  || '';
    consentFileName = origC.consent_file_name || '';
    consentFileData = origC.consent_file_data || '';
    // 편집 모드에서도 새 파일이 선택된 경우 덮어쓰기
    if(window._contractSignedFile){
      signedFileName = window._contractSignedFile.name;
      signedFileData = await _fileToBase64(window._contractSignedFile);
    }
    if(window._contractConsentFile){
      consentFileName = window._contractConsentFile.name;
      consentFileData = await _fileToBase64(window._contractConsentFile);
    }
  }

  // 파일 완비 여부에 따라 최종 계약 상태 결정
  // skip 체크 또는 파일 미첨부 시 → '서류미비'로 강제 (해지/만료/파기 등 최종 상태 제외)
  const _isTerminalStatus = (contractStatus==='해지'||contractStatus==='만료'||contractStatus==='파기'||contractStatus==='expired'||contractStatus==='terminated');
  if(!_isTerminalStatus && !isEditMode){
    const _hasBothFiles = signedFileData && consentFileData;
    if(!_hasBothFiles) contractStatus = '서류미비';
  } else if(isEditMode && !_isTerminalStatus){
    // 편집 모드: 두 파일 모두 있으면 서류미비 해제, 없으면 서류미비 유지
    const _hasBothFilesEdit = signedFileData && consentFileData;
    const origC2 = allContracts.find(x=>x.id===editId.contract)||{};
    // 기존 상태가 서류미비였고, 이번에 두 파일이 모두 갖춰진 경우 → 활성으로 전환
    if(origC2.status===CONTRACT_STATUS.DOCS_INCOMPLETE && _hasBothFilesEdit){
      contractStatus = '활성';
    } else if(!_hasBothFilesEdit && !_isTerminalStatus && origC2.status!=='계약예정' && origC2.status!=='갱신예정' && origC2.status!=='해지예정'){
      contractStatus = '서류미비';
    }
  }

  const body={employee_id:empId,company_id:coId,contract_start:contractStart,contract_end:contractEnd,contract_type:contractType,status:contractStatus,probation_months:probMonths,probation_pct:probPct,probation_amt:probAmt,probation_basis:probBasis,work_hours_per_day:avgDayHours,work_days_per_week:isDailySave?0:workDaysCount,schedule_json:JSON.stringify(scheduleJSON),annual_leave_days:isDailySave?0:parseFloat(document.getElementById('ct-annual').value)||15,annual_salary:annual,monthly_salary_agreed:monthly,base_salary:baseSalaryForSave,daily_wage:dailyWageForSave,weekly_holiday_pay:weeklyHol,fixed_ot_pay:getAmountVal('ct-fixed-ot-pay'),fixed_ot_hours:parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0,fixed_night_pay:getAmountVal('ct-fixed-night-pay'),fixed_night_hours:parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0,fixed_hol_pay:getAmountVal('ct-fixed-hol-pay'),fixed_hol_hours:parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0,hourly_wage:hourlyWage,position_allowance:getAmountVal('ct-position'),transportation_allowance:getAmountVal('ct-car'),transportation_pay_type:_getCTPayTypeVal('car'),self_driving_allowance:0,self_driving_pay_type:'fixed',remote_area_allowance:getAmountVal('ct-remote-area'),remote_area_pay_type:'fixed',meal_allowance:getAmountVal('ct-meal'),meal_pay_type:_getCTPayTypeVal('meal'),research_allowance:getAmountVal('ct-research'),research_pay_type:_getCTPayTypeVal('research'),site_allowance:getAmountVal('ct-site'),skill_allowance:getAmountVal('ct-skill'),license_allowance:getAmountVal('ct-license'),communication_allowance:getAmountVal('ct-communication'),communication_pay_type:_getCTPayTypeVal('communication'),fitness_allowance:getAmountVal('ct-fitness'),fitness_pay_type:_getCTPayTypeVal('fitness'),self_dev_allowance:getAmountVal('ct-self-dev'),self_dev_pay_type:_getCTPayTypeVal('self_dev'),book_allowance:getAmountVal('ct-book'),book_pay_type:_getCTPayTypeVal('book'),overseas_allowance:getAmountVal('ct-overseas'),overseas_pay_type:_getCTPayTypeVal('overseas'),car_maintenance:getAmountVal('ct-car'),regular_bonus:getAmountVal('ct-regular-bonus')||0,childcare_allowance:getAmountVal('ct-childcare')||0,childcare_dependents:parseInt(document.getElementById('ct-childcare-dependents')?.value||1)||1,pay_period:document.getElementById('ct-pay-period')?.value.trim()||'',insurance_employment:true,insurance_industrial:true,insurance_pension:true,insurance_health:true,note:document.getElementById('ct-note').value,salary_start_date:document.getElementById('ct-salary-start')?.value||'',salary_end_date:document.getElementById('ct-salary-end')?.value||'',is_draft:false,draft_saved_at:null,signed_file_name:signedFileName,signed_file_data:signedFileData,consent_file_name:consentFileName,consent_file_data:consentFileData};
  if(isEditMode){
    body.id=editId.contract;
    await api(`../tables/contracts/${editId.contract}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 직원 정보도 함께 업데이트 ──
    const editEmpId = (allContracts.find(x=>x.id===editId.contract)||{}).employee_id;
    if(editEmpId){
      const empUpdatePhone = document.getElementById('ct-edit-em-phone').value.trim();
      if(!empUpdatePhone) return toast('휴대전화 번호를 입력하세요.','error');
      // 계약직/일용직은 입사일=계약시작일, 만료일=계약종료일이므로 ct-start/ct-end 값 사용
      const _ctTypeForSave = document.getElementById('ct-type').value||'정규직';
      const _isFixedForSave = (_ctTypeForSave===CONTRACT_TYPE.FIXED||_ctTypeForSave===CONTRACT_TYPE.FIXED_PROBATION||_ctTypeForSave===CONTRACT_TYPE.DAILY);
      const _nameElSave = document.getElementById('ct-edit-emp-name');
      const _catElSave  = document.getElementById('ct-edit-em-category');
      const empPatch = {
        gender:              document.getElementById('ct-edit-em-gender').value,
        employee_number:     document.getElementById('ct-edit-em-empno')?.value.trim() || '',
        job_description:     document.getElementById('ct-edit-em-job').value,
        department:          document.getElementById('ct-edit-em-dept').value,
        position:            document.getElementById('ct-edit-em-position').value,
        hire_date:           _isFixedForSave ? document.getElementById('ct-start').value : document.getElementById('ct-edit-em-hire').value,
        expire_date:         _isFixedForSave ? document.getElementById('ct-end').value   : document.getElementById('ct-edit-em-expire').value,
        id_number:           document.getElementById('ct-edit-em-id').value,
        dependents:          parseInt(document.getElementById('ct-edit-em-dependents')?.value)||0,
        phone:               empUpdatePhone,
        email:               document.getElementById('ct-edit-em-email').value,
        address:             document.getElementById('ct-edit-em-address').value,
        bank_name:           document.getElementById('ct-edit-em-bank').value,
        bank_account:        document.getElementById('ct-edit-em-account').value,
      };
      // 이름·고용형태: readOnly/disabled가 아닐 때만 업데이트 (수정 모드에서만 반영)
      if(_nameElSave && !_nameElSave.readOnly && _nameElSave.value.trim()) empPatch.name = _nameElSave.value.trim();
      if(_catElSave  && !_catElSave.disabled  && _catElSave.value)         empPatch.employment_category = _catElSave.value;
      await api(`../tables/employees/${editEmpId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(empPatch)});
    }
  } else {
    // 임시저장에서 이어서 등록하는 경우: 기존 draft ID 재사용
    body.id = _currentDraftId || ('cont'+Date.now());
    if(_currentDraftId){
      await api(`../tables/contracts/${_currentDraftId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    } else {
      await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    }
  }
  // ── 고객사 인앱 알림 발송 ──
  {
    const _savedContractId = isEditMode ? editId.contract : (body.id || '');
    const _co  = allCompanies.find(x => x.id === coId) || {};
    const _emp = allEmployees.find(x => x.id === empId) || {};
    const _coName  = _co.company_name || '';
    const _empName = _emp.name || '';
    const _coRep   = _co.representative ? `, ${_co.representative} 사장님` : '';
    const _fmtDate = d => {
      if(!d) return '-';
      const [y,m,dd] = d.split('-');
      return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`;
    };

    if(isEditMode){
      // ─ 계약 수정 완료 OR 해지 처리
      const _origC = allContracts.find(x => x.id === editId.contract) || {};
      if(contractStatus === '해지'){
        // ── 계약 해지 ──
        await _sendCompanyNotice({
          companyId  : coId, companyName: _coName,
          noticeType : 'contract_terminated',
          title      : `[계약 해지] ${_empName} — 근로계약이 해지되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 해지 처리되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractType}
■ 계약 시작일: ${_fmtDate(contractStart)}
■ 계약 종료일: ${_fmtDate(contractEnd || _origC.contract_end || '')}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : _savedContractId,
          employeeId  : empId, employeeName: _empName,
          contractEnd : contractEnd || _origC.contract_end || '',
        });
      } else {
        // ── 계약 수정 완료 ──
        await _sendCompanyNotice({
          companyId  : coId, companyName: _coName,
          noticeType : 'contract_updated',
          title      : `[계약 수정] ${_empName} — 근로계약이 수정되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약 내용이 수정되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractType}
■ 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId  : _savedContractId,
          employeeId  : empId, employeeName: _empName,
          contractEnd : contractEnd,
        });
      }
    } else if(isRecontract){
      // ── 재계약 완료 ──
      await _sendCompanyNotice({
        companyId  : coId, companyName: _coName,
        noticeType : 'contract_renewed_new',
        title      : `[재계약 완료] ${_empName} — 새 근로계약이 작성되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 재계약이 완료되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractType}
■ 새 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 계약 상태: ${contractStatus === '계약예정' ? '계약예정 (시작일 미도래)' : '계약유효 (활성)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : _savedContractId,
        employeeId  : empId, employeeName: _empName,
        contractEnd : contractEnd,
      });
    } else {
      // ── 신규 계약 작성 완료 ──
      await _sendCompanyNotice({
        companyId  : coId, companyName: _coName,
        noticeType : 'contract_created',
        title      : `[신규 계약] ${_empName} — 근로계약이 작성되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 새로 작성되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractType}
■ 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 계약 상태: ${contractStatus === '서류미비' ? '서류미비 (파일 업로드 필요)' : contractStatus === '계약예정' ? '계약예정' : '계약유효 (활성)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
        contractId  : _savedContractId,
        employeeId  : empId, employeeName: _empName,
        contractEnd : contractEnd,
      });
    }
  }
  _recontractEmpId = null; // 재계약 플래그 초기화
  _currentDraftId  = null; // 임시저장 ID 초기화
  closeModal('contract-modal');await loadContracts();await loadEmployees();renderContracts();renderDashboard();toast('근로계약서가 등록되었습니다. ✔');
}
function deleteContract(id){
  // 근로계약 보존 정책: 삭제 불가 (보존 의무 준수)
  toast('근로계약서는 보존 정책에 따라 삭제할 수 없습니다.','error');
}
