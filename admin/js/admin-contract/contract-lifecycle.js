/** 인쇄 전용 CSS */
function _getContractPrintCSS(){
  return [
    '*{box-sizing:border-box;margin:0;padding:0;}',
    'body{font-family:"Noto Sans KR",sans-serif;font-size:12.5px;line-height:1.9;color:#1a1a1a;padding:24px 40px;max-width:800px;margin:0 auto;background:#fff;}',
    'h1{text-align:center;font-size:21px;font-weight:900;letter-spacing:7px;margin-bottom:4px;color:#0f172a;padding-bottom:8px;border-bottom:3px double #0f172a;}',
    'h2{text-align:center;font-size:19px;font-weight:900;letter-spacing:5px;margin-bottom:4px;color:#0f172a;padding-bottom:8px;border-bottom:3px double #0f172a;}',
    '.doc-subtitle{text-align:center;font-size:11.5px;color:#64748b;margin-bottom:20px;margin-top:4px;}',
    '.doc-type-banner{text-align:center;margin-bottom:14px;}',
    '.doc-type-badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:400;letter-spacing:1px;}',
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
    // ── 근무시간표 ──
    '.work-schedule-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:4px;}',
    '.work-schedule-table{width:100%;min-width:580px;border-collapse:collapse;font-size:12px;}',
    '.work-schedule-table th{background:#1e293b;color:#fff;padding:7px 6px;text-align:center;font-weight:600;font-size:11.5px;white-space:nowrap;}',
    '.work-schedule-table th.th-brk{background:#7c3aed;}',
    '.work-schedule-table td{padding:5px 4px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:middle;}',
    '.work-schedule-table td.td-brk{background:rgba(124,58,237,0.04);}',
    '.work-schedule-table tr.day-sat td{background:#eff6ff;}',
    '.work-schedule-table tr.day-sat td.td-brk{background:#e0e7ff;}',
    '.work-schedule-table tr.day-sun td{background:#fff5f5;}',
    '.work-schedule-table tr.day-sun td.td-brk{background:#fce7f3;}',
    '.work-schedule-table tr:last-child td{border-bottom:none;}',
    '.work-schedule-table .day-label{font-weight:700;font-size:12.5px;}',
    '.work-schedule-table .computed-h{font-size:11.5px;color:#0369a1;font-weight:600;min-width:48px;display:inline-block;}',
    '.wsh-total{font-size:12px;color:#374151;margin-top:8px;padding:7px 12px;background:#f8fafc;border-radius:7px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:4px;}',
    '.wsh-total .wsh-row{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 8px;width:100%;}',
    '.wsh-total .wsh-item{text-align:left;}',
    '.wsh-total span{font-weight:400;color:#374151;}',
    '.wsh-total .wsh-val{color:#0369a1;}',
    '.wsh-total .wsh-extra{font-size:11.5px;}',
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
  const toM = function(t){ if(!t) return null; var m=t.match(/^(\d{1,2}):(\d{2})$/); return m ? parseInt(m[1])*60+parseInt(m[2]) : null; };
  const sortedDays = activeDays.slice().sort(function(a,b){ return dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day); });

  const STATUTORY_DAILY = 8 * 60;
  const STATUTORY_WEEKLY = 40 * 60;
  const NIGHT_START = 22 * 60;
  const NIGHT_END   = 30 * 60;

  var normBreaks = function(s){
    if(Array.isArray(s.breaks) && s.breaks.length) return s.breaks;
    if(s.brk_start||s.brk_end) return [{s:s.brk_start||'', e:s.brk_end||''}];
    return [];
  };
  var totalBrkMins = function(s){
    return normBreaks(s).reduce(function(sum,b){
      var bs=toM(b.s), be=toM(b.e);
      if(bs===null||be===null) return sum;
      if(be<=bs) be += 24*60;
      return sum+(be-bs);
    },0);
  };
  var nightMins = function(sm, em, breakSlots){
    // 근무시간과 22:00~06:00 교차분
    var overlap = Math.max(0, Math.min(em, NIGHT_END) - Math.max(sm, NIGHT_START))
                + Math.max(0, Math.min(em, NIGHT_END + 24*60) - Math.max(sm, NIGHT_START + 24*60));
    // 야간 시간대와 겹치는 휴게시간 차감
    var nightBrk = 0;
    (breakSlots||[]).forEach(function(b){
      var bs = toM(b.s), be = toM(b.e);
      if(bs===null||be===null) return;
      if(be<=bs) be += 24*60;
      nightBrk += Math.max(0, Math.min(be, NIGHT_END) - Math.max(bs, NIGHT_START))
                + Math.max(0, Math.min(be, NIGHT_END + 24*60) - Math.max(bs, NIGHT_START + 24*60));
    });
    return Math.max(0, overlap - nightBrk);
  };

  var totalStatMins = 0, totalOtMins = 0, totalNightMins = 0, totalHolMins = 0, totalHolOtMins = 0;
  var totalWdayNightMins = 0, totalSunNightMins = 0; // 평일야간/휴일야간(토·일) 구분

  // ── Pass 1: 요일별 근로시간 산출 ──
  var dayData = sortedDays.map(function(s){
    var isWork = !!(s.start && s.end);
    var isHol = s.day === 'sun' || s.day === 'sat'; // 토·일 모두 휴일근로 (2026-08-14 규칙)
    var sm=toM(s.start), em=toM(s.end);
    if(sm!==null && em!==null && em<=sm) em += 24*60;
    var brk = totalBrkMins(s);
    var mins = (sm!==null&&em!==null&&em>sm) ? Math.max(0,em-sm-brk) : 0;

    var dayStat = 0, dayOt = 0, dayHol = 0, dayHolOt = 0;
    if (isHol) {
      dayHol   = Math.min(mins, STATUTORY_DAILY);
      dayHolOt = Math.max(0, mins - STATUTORY_DAILY);
      totalHolMins   += dayHol;
      totalHolOtMins += dayHolOt;
    } else {
      dayStat = Math.min(mins, STATUTORY_DAILY);
      dayOt   = Math.max(0, mins - STATUTORY_DAILY);
      totalStatMins += dayStat;
      totalOtMins   += dayOt;
    }

    var dayNight = (sm!==null&&em!==null) ? nightMins(sm, em, normBreaks(s)) : 0;
    totalNightMins += dayNight;
    if (isHol) totalSunNightMins += dayNight; else totalWdayNightMins += dayNight;

    return { s:s, isWork:isWork, isHol:isHol, mins:mins, dayStat:dayStat, dayOt:dayOt, dayHol:dayHol, dayHolOt:dayHolOt, dayNight:dayNight, satFill:0 };
  });

  // ── Pass 1.5: 토요일 40h 미달 충당 (2026-08-14 규칙) ──
  var satD = null;
  dayData.forEach(function(dd){ if(dd.s.day === 'sat' && dd.mins > 0) satD = dd; });
  if(satD && totalStatMins < STATUTORY_WEEKLY){
    var gap2 = STATUTORY_WEEKLY - totalStatMins;
    var fill2 = Math.min(satD.mins, gap2, STATUTORY_DAILY);
    if(fill2 > 0){
      totalHolMins   -= satD.dayHol;
      totalHolOtMins -= satD.dayHolOt;
      satD.dayStat   = fill2;
      satD.satFill   = fill2;
      var rem2 = satD.mins - fill2;
      satD.dayHol    = Math.min(rem2, STATUTORY_DAILY);
      satD.dayHolOt  = Math.max(0, rem2 - STATUTORY_DAILY);
      totalHolMins   += satD.dayHol;
      totalHolOtMins += satD.dayHolOt;
      totalStatMins  += fill2;
    }
  }

  // ── 주 40h 상한: 초과분을 토→월 역순으로 dayStat→dayOt 재분배 ──
  if(totalStatMins > STATUTORY_WEEKLY){
    var overflow = totalStatMins - STATUTORY_WEEKLY;
    totalOtMins += overflow;
    totalStatMins = STATUTORY_WEEKLY;
    // 토→월 역순으로 순회하며 overflow 차감
    for(var i = dayData.length-1; i >= 0 && overflow > 0; i--){
      var dd = dayData[i];
      if(dd.isHol || dd.dayStat <= 0) continue;
      var deduct = Math.min(dd.dayStat, overflow);
      dd.dayStat -= deduct;
      dd.dayOt   += deduct;
      overflow   -= deduct;
    }
  }

  // ── Pass 2: HTML 행 생성 ──
  var rows = dayData.map(function(dd){
    var s = dd.s;
    var isWork = dd.isWork, isHol = dd.isHol;
    var cls   = s.day==='sat' ? 'day-sat' : s.day==='sun' ? 'day-sun' : '';
    var color = dayColors[s.day] || '#1e293b';
    var fmtH = function(h){ return Number.isInteger(h) ? h : h.toFixed(1); };

    var hrsLines = [];
    if (dd.mins===0) {
      hrsLines.push('-');
    } else if (isHol) {
      if (dd.dayStat>0) hrsLines.push(fmtH(dd.dayStat/60) + 'h <span style="color:#64748b;font-size:10px;">40h충당</span>');
      if (dd.dayHol>0) hrsLines.push('<span style="color:#dc2626;font-size:10px;">휴일 ' + fmtH(dd.dayHol/60) + 'h</span>');
      if (dd.dayHolOt>0) hrsLines.push('<span style="color:#b91c1c;font-size:10px;">휴일연장 +' + fmtH(dd.dayHolOt/60) + 'h</span>');
    } else {
      // 월~금: 소정근로 + 연장근로 (40h 캡 반영 완료)
      hrsLines.push(fmtH(dd.dayStat/60) + 'h');
      if (dd.dayOt>0) hrsLines.push('<span style="color:#f59e0b;font-size:10px;">연장 +' + fmtH(dd.dayOt/60) + 'h</span>');
    }
    if (dd.dayNight>0) {
      var nightLabel = isHol ? '휴일야간' : '야간';
      hrsLines.push('<span style="color:#7c3aed;font-size:10px;">' + nightLabel + ' +' + fmtH(dd.dayNight/60) + 'h</span>');
    }
    var hrs = hrsLines.join('<br>');

    var chk = isWork ? '✔' : '';
    var brkSlots = normBreaks(s);
    var brkCell = brkSlots.length
      ? brkSlots.map(function(b){ return (b.s||'') + (b.s&&b.e?' ~ ':'') + (b.e||''); }).join('<br/>')
      : '-';
    return '<tr class="'+cls+'">'+'<td style="text-align:center;">'+chk+'</td>'+'<td style="text-align:center;"><span class="day-label" style="color:'+color+';">'+( daysKr[s.day]||s.day)+'</span></td>'+'<td style="text-align:center;">'+(s.start||'')+'</td>'+'<td style="text-align:center;">'+(s.end||'')+'</td>'+'<td class="td-brk" style="text-align:center;line-height:1.6;">'+brkCell+'</td>'+'<td style="text-align:center;"><span class="computed-h">'+hrs+'</span></td>'+'</tr>';
  }).join('');

  // 주 40h 초과 → 연장 이관 (이미 Pass 1 후 처리됨, totalStatMins/totalOtMins는 여기서 재확인용)

  var wDays  = sortedDays.filter(function(s){ return !!(s.start && s.end); }).length;
  // 주 소정근무일수: 최대 5일
  var statDays = Math.min(wDays, 5);
  var weekStatH = totalStatMins/60;
  // 일 평균 소정근로시간: 총 주간근로시간 ÷ 5, 최대 8h
  var totalWeekMins = totalStatMins + totalOtMins + totalNightMins + totalHolMins + totalHolOtMins;
  var avgDay = totalWeekMins > 0 ? totalWeekMins / 5 / 60 : 0;
  var fmtH   = function(h){ return Number.isInteger(h)?h:h.toFixed(1); };

  var extraLines = [];
  if(totalOtMins > 0) extraLines.push('<span class="wsh-item">&bull; 고정연장근로시간: <span class="wsh-val">'+fmtH(totalOtMins/60)+'</span>h/주</span>');
  if(totalWdayNightMins > 0) extraLines.push('<span class="wsh-item">&bull; 고정야간근로시간: <span class="wsh-val">'+fmtH(totalWdayNightMins/60)+'</span>h/주</span>');
  if((totalHolMins + totalHolOtMins) > 0) extraLines.push('<span class="wsh-item">&bull; 고정휴일근로시간: <span class="wsh-val">'+fmtH((totalHolMins + totalHolOtMins)/60)+'</span>h/주</span>');
  if(totalHolOtMins > 0) extraLines.push('<span class="wsh-item">&bull; 고정휴일연장근로시간: <span class="wsh-val">'+fmtH(totalHolOtMins/60)+'</span>h/주</span>');
  if(totalSunNightMins > 0) extraLines.push('<span class="wsh-item">&bull; 고정휴일야간근로시간: <span class="wsh-val">'+fmtH(totalSunNightMins/60)+'</span>h/주</span>');

  return '<div class="work-schedule-wrap">'
    +'<table class="work-schedule-table">'
    +'<thead><tr>'
    +'<th style="width:34px;">근무</th>'
    +'<th style="width:30px;">요일</th>'
    +'<th style="width:88px;">출근</th>'
    +'<th style="width:88px;">퇴근</th>'
    +'<th class="th-brk">휴게시간</th>'
    +'<th style="width:72px;">소정시간</th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table>'
    +'<div class="wsh-total">'
    +'<div class="wsh-row"><span class="wsh-item">&bull; 주 소정근무일수: <span class="wsh-val">'+statDays+'</span>일</span>'
    +'<span class="wsh-item">&bull; 주 소정근로시간: <span class="wsh-val">'+fmtH(weekStatH)+'</span>시간</span>'
    +'<span class="wsh-item">&bull; 일 평균 소정근로시간: <span class="wsh-val">'+fmtH(Math.min(avgDay,8))+'</span>시간</span></div>'
    +(extraLines.length > 0 ? '<div class="wsh-row wsh-extra">' + extraLines.join(' ') + '</div>' : '')
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
  const _ctTypeRaw = c.contract_type || emp.employment_category || CONTRACT_TYPE.REGULAR;
  // 영문 정규화 → 내부 비교용
  const _ctTypeNorm = typeof normalizeContractType === 'function'
    ? normalizeContractType(_ctTypeRaw) : _ctTypeRaw;
  const _isPendingContract = (c.status===CONTRACT_STATUS.PENDING);
  // 계약예정 시 수습→본계약 전환: 정규직 수습→정규직, 계약직 수습→계약직
  const _ctTypeFinal = _isPendingContract
    ? (_ctTypeNorm ===CONTRACT_TYPE.REGULAR_PROBATION ? CONTRACT_TYPE.REGULAR : _ctTypeNorm ===CONTRACT_TYPE.FIXED_PROBATION ? CONTRACT_TYPE.FIXED : _ctTypeNorm)
    : _ctTypeNorm;
  // 표시용 한글 라벨
  const ctType = typeof contractTypeLabel === 'function'
    ? contractTypeLabel(_ctTypeFinal) : _ctTypeFinal;
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
    let   _eMins    = _toM(_end);
    if(_eMins <= _sMins) _eMins += 24*60; // 익일 종료
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
  // ── schedule_json 중첩 구조(shifts[0].start) → 평면 구조(start/end) 변환 ──
  activeDays = activeDays.map(s => {
    const shift = (Array.isArray(s.shifts) && s.shifts.length > 0) ? s.shifts[0] : {};
    return {
      day: s.day,
      start: shift.start || s.start || '',
      end: shift.end || s.end || '',
      breaks: Array.isArray(shift.breaks) ? shift.breaks : (Array.isArray(s.breaks) ? s.breaks : []),
      brk_start: shift.brk_start || s.brk_start || '',
      brk_end: shift.brk_end || s.brk_end || ''
    };
  });
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
      let mins = (he*60+me)-(hs*60+ms);
      if(mins <= 0) mins += 24*60; // 익일 종료 휴게
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
  const carPayType        = c.transportation_pay_type||c.self_driving_pay_type||'';
  const remoteAreaAllow   = parseFloat(c.remote_area_allowance||0);
  // remoteAreaPayType: 항상 'fixed' — 선언 생략
  const mealAllow         = parseFloat(c.meal_allowance||0);
  const mealPayType       = c.meal_pay_type||'';
  const researchAllow     = parseFloat(c.research_allowance||0);
  const researchPayType   = c.research_pay_type||'';
  const siteAllow         = parseFloat(c.site_allowance||0);
  const skillAllow        = parseFloat(c.skill_allowance||0);
  const licenseAllow      = parseFloat(c.license_allowance||0);
  const hazardAllow       = parseFloat(c.hazard_allowance||0);
  // 사용자 정의 통상임금 항목
  let customOrdinaryItems = [];
  try { customOrdinaryItems = JSON.parse(c.custom_ordinary_values||'[]'); } catch(e){}
  if(!Array.isArray(customOrdinaryItems)) customOrdinaryItems = [];
  // 사용자 정의 고정수당 항목 (통상임금 제외)
  let customFixedItems = [];
  try { customFixedItems = JSON.parse(c.custom_fixed_values||'[]'); } catch(e){}
  if(!Array.isArray(customFixedItems)) customFixedItems = [];
  const commAllow         = parseFloat(c.communication_allowance||0);
  const commPayType       = c.communication_pay_type||'';
  const fitnessAllow      = parseFloat(c.fitness_allowance||0);
  const fitnessPayType    = c.fitness_pay_type||'';
  const selfDevAllow      = parseFloat(c.self_dev_allowance||0);
  const selfDevPayType    = c.self_dev_pay_type||'';
  const bookAllow         = parseFloat(c.book_allowance||0);
  const bookPayType       = c.book_pay_type||'';
  const overseasAllow     = parseFloat(c.overseas_allowance||0);
  const overseasPayType   = c.overseas_pay_type||'';
  const childcareAllow    = parseFloat(c.childcare_allowance||0);
  const regularBonus      = parseFloat(c.regular_bonus||0);
  // acfg: allowance_config가 있으면 그 키 값으로 제어, 없으면 null (값>0이면 무조건 표시)
  // JSON 문자열인 경우 파싱 (getCompanySnapshotAt는 파싱하지만, 다른 호출자는 아닐 수 있음)
  const _rawCfgRaw = (co && co.allowance_config) ? co.allowance_config : null;
  const _rawAcfg = (() => {
    if (!_rawCfgRaw) return null;
    if (typeof _rawCfgRaw === 'string') { try { return JSON.parse(_rawCfgRaw); } catch(e) { return null; } }
    return _rawCfgRaw;
  })();
  // acfgShow(key, amount): allowance_config 없으면 amount>0으로만 판단, 있으면 cfg[key] && amount>0
  const acfgShow = (key, amount) => amount > 0 && (_rawAcfg === null || !!_rawAcfg[key]);
  // acfgIsFixed(key): 회사 allowance_config 기준 pay_type 확인 (계약서 데이터보다 회사 설정 우선)
  const acfgIsFixed = (key) => {
    if (!_rawAcfg) return true; // config 없으면 기본 fixed로 간주
    const pt = _rawAcfg[key + '_pay_type'] || 'fixed';
    return pt === 'fixed';
  };
  const fixedOtPay        = parseFloat(c.fixed_ot_pay||0);
  const fixedNightPay     = parseFloat(c.fixed_night_pay||0);
  const fixedHolPay       = parseFloat(c.fixed_hol_pay||0);
  const monthlySal        = parseFloat(c.monthly_salary_agreed||0);
  const annualSal         = parseFloat(c.annual_salary||0);
  const hourlyWage        = parseFloat(c.hourly_wage||0);
  const dailyWage         = parseFloat(c.daily_wage||c.base_salary||0);
  // 통상임금 지급유형 뱃지 생성 헬퍼
  const payTypeBadge = (type) => type==='fixed'
    ? '<span style="font-size:10px;color:#1d4ed8;background:#dbeafe;border-radius:4px;padding:1px 6px;margin-left:6px;">매월 정기지급 (통상임금 포함)</span>'
    : '<span style="font-size:10px;color:#92400e;background:#fef3c7;border-radius:4px;padding:1px 6px;margin-left:6px;">출근일수에 따름 (통상임금 제외)</span>';
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
          ${acfgShow('position',      posAllow)                                          ? row('직책수당',     `${fmt(posAllow)}원`)          : ''}
          ${acfgShow('car',           carAllow)      && acfgIsFixed('car')              ? row('차량지원비',   `${fmt(carAllow)}원`)          : ''}
          ${acfgShow('remote_area',   remoteAreaAllow)                                  ? row('벽지수당',     `${fmt(remoteAreaAllow)}원`)   : ''}
          ${acfgShow('meal',          mealAllow)     && acfgIsFixed('meal')             ? row('식대',         `${fmt(mealAllow)}원`)         : ''}
          ${acfgShow('research',      researchAllow) && acfgIsFixed('research')         ? row('연구활동비',   `${fmt(researchAllow)}원`)     : ''}
          ${acfgShow('site',          siteAllow)                                        ? row('현장수당',     `${fmt(siteAllow)}원`)         : ''}
          ${acfgShow('skill',         skillAllow)                                       ? row('기술수당',     `${fmt(skillAllow)}원`)        : ''}
          ${acfgShow('license',       licenseAllow)                                     ? row('면허수당',     `${fmt(licenseAllow)}원`)      : ''}
          ${acfgShow('hazard',        hazardAllow)                                      ? row('위험수당',     `${fmt(hazardAllow)}원`)       : ''}
          ${customOrdinaryItems.filter(it=>it&&it.amount>0).map(it=>row((it.name||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'), `${fmt(it.amount)}원`)).join('')}
          ${customFixedItems.filter(it=>it&&it.amount>0).map(it=>row((it.name||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'), `${fmt(it.amount)}원`)).join('')}
          ${acfgShow('communication', commAllow)    && acfgIsFixed('communication')     ? row('통신비',       `${fmt(commAllow)}원`)         : ''}
          ${acfgShow('fitness',       fitnessAllow) && acfgIsFixed('fitness')           ? row('체력증진비',   `${fmt(fitnessAllow)}원`)      : ''}
          ${acfgShow('self_dev',      selfDevAllow) && acfgIsFixed('self_dev')          ? row('자기계발비',   `${fmt(selfDevAllow)}원`)      : ''}
          ${acfgShow('book',          bookAllow)    && acfgIsFixed('book')              ? row('도서지원비',   `${fmt(bookAllow)}원`)         : ''}
          ${acfgShow('overseas',      overseasAllow)&& acfgIsFixed('overseas')          ? row('해외근무수당', `${fmt(overseasAllow)}원`)     : ''}
          ${acfgShow('childcare',     childcareAllow) && acfgIsFixed('childcare')       ? row('보육수당',     `${fmt(childcareAllow)}원`)     : ''}
          ${acfgShow('regular_bonus', regularBonus)                                     ? row('정기상여금',   `${fmt(regularBonus)}원`)       : ''}
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
      ${row('대표자(사용자)', getCompanyRepName(co))}
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
    <p class="doc-text" style="padding:6px 0;">
      "근로자"는 당사에 채용됨에 따라 상호 신뢰를 바탕으로 근로계약을 체결하며 당사의 운영규정을 준수하고 성실히 업무를 수행할 의무를 진다.
    </p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art('(근무장소 및 업무내용)')}</div>
    <p class="doc-text" style="padding:4px 0 4px;">
      ① "근로자"는 아래의 근무장소에서 근무함을 원칙으로 한다. 다만, "사용자"는 업무상 필요한 경우 "근로자"의 근무장소를 변경할 수 있다.
    </p>
    <p class="doc-text" style="padding:4px 0 8px;">
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
      ${row('고용형태', `<span class="badge ${empCatBadge(_ctTypeRaw)}">${ctType}</span>`)}
      ${isProb ? row('수습기간', `${probStartKr} ~ ${probEndDate} (${probMonths}개월)`) : ''}
    </table>
    <p class="doc-text" style="padding:8px 0 4px;">
      ① 계약의 갱신은 계약기간 만료 1개월 전 협의하는 것으로 하며, 만료 전까지 당사자간 별도의 의사표시 또는 협의가 없는 경우 고용기간이 종료되는 것으로 한다.
    </p>
    <p class="doc-text" style="padding:4px 0 4px;">
      ② 정규 근로시간은 주 40시간제를 원칙으로 하며, 근무시간은 다음과 같다.
    </p>
    ${buildScheduleTableHTML(activeDays)}
    <p class="doc-text" style="padding:8px 0 4px;">
      ③ 제②항에 명시된 시간 외에 "사용자"는 "근로자"에게 업무상의 필요에 의하여 연장근무, 야간근무 및 휴일근무를 명할 수 있으며 "근로자"는 이에 포괄적으로 합의한 것으로 본다.
    </p>
    <p class="doc-text" style="padding:4px 0 4px;">
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
    <p class="doc-text" style="padding:4px 0 4px;">① "사용자"는 1주일에 소정근로일수를 개근한 경우 주휴일을 부여한다.</p>
    <p class="doc-text" style="padding:4px 0 4px;">② 주휴일(일요일)과 근로자의 날(5월 1일) 및 토요일은 휴일로 한다. 단, 휴일이 중복되는 경우 1일의 휴일로 처리한다.</p>
    <p class="doc-text" style="padding:4px 0 4px;">③ 기타 휴일에 관한 사항은 "공휴일에 관한 법률"에 따른다.</p>
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
        <tr><th>대표자</th><td>${getCompanyRepName(co)}</td></tr>
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
  const btnTermChange = document.getElementById('ct-sb-term-change-btn');
  const reasonBadge   = document.getElementById('ct-sb-reason-badge');
  if(btnEdit)    btnEdit.style.display    = 'inline-flex';
  if(btnSave)    btnSave.style.display    = 'none';
  if(btnCancel)  btnCancel.style.display  = 'none';
  if(btnDestroy) btnDestroy.style.display = 'inline-flex';
  if(btnTermChange) btnTermChange.style.display = 'none';
  if(reasonBadge){ reasonBadge.style.display = 'none'; reasonBadge.innerHTML = ''; }
}

// ─── 예정 계약 수정 모드 진입 (해지예정 / 계약예정 / 갱신예정 공용) ───
function editPendingContract(){
  const modalEl = document.querySelector('#contract-modal .modal');
  const bodyEl  = modalEl?.querySelector('.modal-body');
  if(!bodyEl) return;

  // readonly 해제 및 입력 활성화
  modalEl.classList.remove('ct-readonly');
  // 편집 모드: 관리자 메모 placeholder 복원
  const _ctNoteEP = document.getElementById('ct-note');
  if(_ctNoteEP) _ctNoteEP.placeholder = '계약 관련 내부 메모를 입력하세요...';
  bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
    el.disabled = false;
    el.classList.remove('ct-input-locked','ct-input-locked-dark'); });

  // 배너 버튼 전환: [수정 및 재발행] [파기] → [수정 및 재발행 완료] [취소]
  document.getElementById('ct-sb-btn-edit').style.display    = 'none';
  document.getElementById('ct-sb-btn-save').style.display    = 'inline-flex';
  document.getElementById('ct-sb-btn-cancel').style.display  = 'inline-flex';
  document.getElementById('ct-sb-btn-destroy').style.display = 'none';

  // 상단/하단 액션 바 버튼 숨김 (수정 중 혼동 방지)
  ['ct-btn-renew','ct-btn-renew2',
   'ct-btn-recontract','ct-btn-recontract2','ct-btn-terminate','ct-btn-terminate2'].forEach(bid=>{
    const el = document.getElementById(bid); if(el) el.style.display='none';
  });

  // 해지예정 계약이면: 퇴사예정일 입력 패널을 수정 가능하게 열어줌
  const c = allContracts.find(x=>x.id===editId.contract);
  // 근무시간표 재렌더링: readonly 해제 후 비활성 요일의 disabled 상태 복원
  if(c && c.schedule_json){
    try { if(typeof setScheduleFromJSON === 'function') setScheduleFromJSON(JSON.parse(c.schedule_json)); }
    catch(e){ if(typeof setScheduleFromLegacy === 'function') setScheduleFromLegacy(c); }
  } else if(c && typeof setScheduleFromLegacy === 'function'){
    setScheduleFromLegacy(c);
  }
  if(c?.status===CONTRACT_STATUS.TERMINATE_PENDING){
    const termPanel = document.getElementById('ct-terminate-panel');
    if(termPanel){
      termPanel.style.display = 'block';
      const termDateInput = document.getElementById('ct-terminate-date');
      if(termDateInput && c.terminate_date) termDateInput.value = c.terminate_date;
      const termConfirmBtn = termPanel.querySelector('button.btn-terminate');
      if(termConfirmBtn) termConfirmBtn.style.display = 'none';
      const termCancelBtn = termPanel.querySelector('button.btn-secondary');
      if(termCancelBtn)  termCancelBtn.style.display  = 'none';
    }
  }

  // 모달 제목 변경
  const titleMap = {
    [CONTRACT_STATUS.TERMINATE_PENDING]: '근로계약서 수정 및 재발행 (해지예정)',
    [CONTRACT_STATUS.PENDING]:           '근로계약서 수정 및 재발행 (계약예정)',
    [CONTRACT_STATUS.RENEWAL_PENDING]:   '근로계약서 수정 및 재발행 (갱신예정)'
  };
  document.getElementById('ct-title').textContent = titleMap[c?.status] || '근로계약서 수정 및 재발행 (예정 계약)';

  // 일괄 설정 바 다시 표시
  const bulkBar = document.getElementById('ct-bulk-bar-wrap');
  if(bulkBar) bulkBar.style.display = '';

  toast('예정 계약을 수정 및 재발행합니다. 변경 후 수정 및 재발행 완료를 눌러 저장하세요.');
}

// ─── 예정 계약 수정 취소 ───
function cancelPendingEdit(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(c) viewContract(c.id);
}

// ─── 계약 변경 → 임금대장 재생성 트리거 ───
// 계약 저장/수정/갱신/해지/파기 시 당월 임금대장이 이미 생성되어 있으면 자동 갱신
async function _triggerWageLedgerRegen(companyId){
  if(!companyId) return;
  if(typeof _checkWageLedgerComplete !== 'function') return;
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // 기존 임금대장 알림이 있으면 갱신 표시 후 재생성
    const checkRes = await api('../tables/wage_ledger_notifications?limit=500');
    const allNotifs = (checkRes && checkRes.data) ? checkRes.data : [];
    const existing = allNotifs.find(n =>
      n.company_id === companyId &&
      (Number(n.pay_year)===year || Number(n.year)===year) &&
      (Number(n.pay_month)===month || Number(n.month)===month)
    );
    if(existing){
      await api('../tables/wage_ledger_notifications/' + existing.id, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({is_renewed: 1, updated_at: Date.now()})
      });
      await _checkWageLedgerComplete(companyId, year, month);
    }
  } catch(e){
    // 조용히 실패 (임금대장 페이지 아닌 곳에서도 호출될 수 있음)
    console.warn('[계약→임금대장]', e.message);
  }
}

// ─── 예정 계약 수정완료 저장 ───
async function savePendingContractEdit(){
  if(_ctValidate()) return;
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');
  // 최저임금 위반 차단
  const _mwWarnRowPend  = document.getElementById('ct-prob-minwage-warning-row');
  const _mwWarnRowPend2 = document.getElementById('ct-general-minwage-warning-row');
  if((_mwWarnRowPend  && _mwWarnRowPend.style.display  !== 'none') ||
     (_mwWarnRowPend2 && _mwWarnRowPend2.style.display !== 'none')){
    openModal('ct-minwage-warn-modal');
    return;
  }
  // 현재 폼에서 수정된 값을 수집
  const newStart = document.getElementById('ct-start')?.value || c.contract_start;
  const newEnd   = document.getElementById('ct-end')?.value   || '';
  const today3   = fmtLocalDate(new Date());
  if(!newStart) return toast('계약 시작일을 입력해 주세요.','error');
  // 상태 재결정
  let newStatus = c.status;
  const isPreTermEdit = (c.status===CONTRACT_STATUS.TERMINATE_PENDING);
  if(isPreTermEdit){
    const newTermDate = document.getElementById('ct-terminate-date')?.value || c.terminate_date || '';
    if(newTermDate && newTermDate <= today3) newStatus = CONTRACT_STATUS.TERMINATED;
    else if(newTermDate) newStatus = CONTRACT_STATUS.TERMINATE_PENDING;
    else newStatus = CONTRACT_STATUS.ACTIVE;
  } else {
    if(newStart <= today3) newStatus = CONTRACT_STATUS.ACTIVE;
    if(newEnd && newEnd < today3) newStatus = CONTRACT_STATUS.EXPIRED;
  }
  // 저장
  try {
    await api('../tables/contracts/' + c.id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...c, contract_start: newStart, contract_end: newEnd, status: newStatus, is_draft: false, id: c.id })
    });
    await loadContracts(); renderContracts(); renderDashboard();
    closeModal('contract-modal');
    toast('계약이 수정됐습니다.');
    _triggerWageLedgerRegen(c.company_id);
  } catch(e) {
    toast('수정 저장 중 오류가 발생했습니다.', 'error');
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
    // 계약예정 / 갱신예정 → VOIDED 처리 (삭제 대신 파기)
    await cancelPendingContract();
  }
}

// ── 계약 인앱 알림 헬퍼 (시스템 설정 메시지 규칙 적용) ──
let __cachedMsgRules = null;
async function _getContractMsgRule(noticeType){
  if(!__cachedMsgRules){
    try {
      const _res = await fetch('../tables/representative_contact/default');
      if(_res.ok){
        const _data = await _res.json();
        if(_data?.msg_body_rules){
          __cachedMsgRules = typeof _data.msg_body_rules === 'string'
            ? JSON.parse(_data.msg_body_rules) : _data.msg_body_rules;
        }
      }
    } catch(_){}
    if(!__cachedMsgRules) __cachedMsgRules = {};
  }
  return __cachedMsgRules[noticeType] || null;
}
function _applyMsgVars(text, vars){
  let result = text;
  for(const [k, v] of Object.entries(vars)){
    result = result.replace(new RegExp('\\{'+k+'\\}', 'g'), v != null ? String(v) : '');
  }
  return result;
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

  // 계약직/정규직 공통 메시지
  const dateLabel  = termDate ? `\n계약 해지일: ${termDate}` : '';

  const confirmed = await _showConfirm({
    message: `[해지예정 철회]${empName ? `\n\n${empName}` : ''}${dateLabel}\n\n` +
      `근로계약 해지를 철회하시면 계약 해지일 설정을 해제하고 계약을 원래 상태로 되돌립니다.\n` +
      `정말 철회하시겠습니까?`,
    okText: '철회',
    okClass: 'btn-primary'
  });
  if(!confirmed) return;

  try {
    // 1) 계약 상태 복귀 + 페어 관계 정리
    await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({status: CONTRACT_STATUS.ACTIVE, terminate_date:''})});
    // 갱신 페어가 있는 경우 해제 (P4)
    if(typeof breakPair === 'function') await breakPair(c);

    // 2) 직원 상태 복원
    if(emp.id){
      const empPatch = emp.status === EMP_STATUS.RESIGNED
        ? { status: EMP_STATUS.ACTIVE, resign_date: '', expire_date: '' }
        : { resign_date: '' };
      await api(`../tables/employees/${emp.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(empPatch)});
    }

    // 3) 모달 닫기 + 페이지 새로고침
    closeModal('contract-modal');
    await Promise.all([loadContracts(), loadEmployees()]);
    renderContracts(); renderDashboard();
    toast('근로계약 해지가 철회되었습니다.', 'success');
  } catch(e) {
    console.error('cancelPreTerminate:', c?.id, e);
    toast('해지 철회 중 오류: ' + (e.message || e), 'error');
    return;
  }

  // 4) 고객사 인앱 알림 발송 (비동기, 실패해도 무시)
  try {
    const _cptCo  = allCompanies.find(x => x.id === c.company_id) || {};
    const _coRep  = getCompanyRepGreeting(_cptCo);
    const _fmtD   = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    await _sendCompanyNotice({
      companyId  : c.company_id, companyName: _cptCo.company_name || '',
      noticeType : 'contract_termination_cancelled',
      title      : `[해지 예정 취소] ${empName} — 계약 해지 예정이 취소되었습니다`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 해지 예정이 취소되어 기존 계약이 정상 유효 상태로 복귀되었습니다.

■ 근로자: ${empName}
■ 고용형태: ${contractTypeLabel(c.contract_type)||''}
■ 계약 시작일: ${_fmtD(c.contract_start)}
${c.contract_end ? `■ 계약 만료일: ${_fmtD(c.contract_end)}` : '■ 계약 기간: 무기한'}
■ 취소된 해지일: ${termDate ? _fmtD(termDate) : '-'}
■ 현재 계약 상태: 계약유효 (활성) 복귀
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

※ 계약 조건(임금·근로시간 등)에는 변동이 없습니다.
※ 퇴직 예정이었던 경우, 해당 직원의 근속기간과 퇴직금 산정에 유의해 주시기 바랍니다.`,
      contractId  : c.id,
      employeeId  : c.employee_id, employeeName: empName,
      contractEnd : c.contract_end || '',
    });
  } catch(e) { /* 알림 발송 실패는 무시 */ }
}

// ─── 계약예정·갱신예정 취소 플로우 (VOIDED 처리 — 삭제 대신 파기) ───
async function cancelPendingContract(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;

  // 시작일 당일부터 취소 불가
  const _todayCancel = fmtLocalDate(new Date());
  if(c.contract_start && _todayCancel >= c.contract_start){
    toast(`계약 시작일(${c.contract_start}) 이후에는 예정 계약을 취소할 수 없습니다.`, 'error');
    return;
  }

  const isRenew     = (c.status===CONTRACT_STATUS.RENEWAL_PENDING)
                   || (CONTRACT_ACTIVE_STATUSES.includes(c.status) && (c.contract_start||'') > fmtLocalDate(new Date()));
  const statusLabel = isRenew ? '갱신예정' : '계약예정';
  const emp         = allEmployees.find(e=>e.id===c.employee_id)||{};
  const empName     = emp.name || '';

  const confirmed = await _showConfirm({
    message: `[${statusLabel} 취소]${empName ? `\n\n직원: ${empName}` : ''}\n` +
      `계약 시작일: ${c.contract_start||'—'}\n\n` +
      `이 계약을 정말 취소하고 파기처리하시겠습니까?\n파기된 계약은 계약 목록에서 확인 후 관리자가 직접 삭제할 수 있습니다.`,
    okText: '파기',
    okClass: 'btn-danger'
  });
  if(!confirmed) return;

  // 갱신 취소 시: 이전 계약(만료 처리됐던 것)을 활성으로 복귀시켜야 하는지 확인
  // note 필드에 '전계약:' 패턴이 있으면 해당 계약 ID를 복원
  const prevContractMatch = (c.note||'').match(/전계약:([^\s)]+)/);
  if(isRenew && prevContractMatch){
    const prevId = prevContractMatch[1];
    const prevC  = allContracts.find(x=>x.id===prevId);
    if(prevC && (prevC.status===CONTRACT_STATUS.EXPIRED || prevC.status===CONTRACT_STATUS.TERMINATED)){
      // 이전 계약을 활성 상태로 복귀
      await api(`../tables/contracts/${prevId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status: CONTRACT_STATUS.ACTIVE, contract_end: prevC.contract_end||''})});
    }
  }

  // 계약을 VOIDED(파기) 상태로 변경 (삭제하지 않음 — 관리자가 추후 확인 후 직접 삭제)
  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status: CONTRACT_STATUS.VOIDED, close_reason:'void'})});

  closeModal('contract-modal');
  await loadContracts();
  renderContracts(); renderDashboard();
  toast(`${statusLabel} 취소 완료 — 계약이 파기 처리됐습니다.`, 'success');
}

// ─── 파기 플로우 (수정재발행 등 명시적 파기 전용 — 배너 경로에서는 더 이상 사용 안 함) ───
async function doContractVoid(){
  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return;

  // 상태 가드: PENDING 또는 RENEWAL_PENDING 상태만 파기 가능
  if(c.status !== CONTRACT_STATUS.PENDING && c.status !== CONTRACT_STATUS.RENEWAL_PENDING){
    toast('계약예정 또는 갱신예정 상태의 계약만 파기할 수 있습니다.', 'error');
    return;
  }

  const statusLabel = c.status===CONTRACT_STATUS.RENEWAL_PENDING ? '갱신예정' : '계약예정';

  if(!confirm(`정말 이 계약을 파기하시겠습니까?\n\n[${statusLabel}] 상태의 계약을 파기합니다.\n파기된 계약은 복구할 수 없으며, 계약이 성립되지 않은 것으로 처리됩니다.`)) return;

  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({status: CONTRACT_STATUS.VOIDED, close_reason:'void'})});

  // ── 고객사 인앱 알림 발송 (계약 파기) ──
  {
    const _voidEmp = allEmployees.find(x => x.id === c.employee_id) || {};
    const _voidCo  = allCompanies.find(x => x.id === c.company_id)  || {};
    const _coRep   = getCompanyRepGreeting(_voidCo);
    const _fmtD    = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    await _sendCompanyNotice({
      companyId  : c.company_id, companyName: _voidCo.company_name || '',
      noticeType : 'contract_voided',
      title      : `[계약 파기] ${_voidEmp.name||''} — 근로계약이 파기되었습니다`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 파기 처리되었습니다.

■ 근로자: ${_voidEmp.name||''}
■ 고용형태: ${contractTypeLabel(c.contract_type)||''}
■ 계약 기간: ${_fmtD(c.contract_start)}${c.contract_end ? ' ~ ' + _fmtD(c.contract_end) : ' (기간 미정)'}
■ 파기 사유: ${statusLabel} 상태의 계약 파기
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

`,
      contractId  : c.id,
      employeeId  : c.employee_id, employeeName: _voidEmp.name || '',
      contractEnd : c.contract_end || '',
    });
  }

  closeModal('contract-modal');
  await loadContracts(); renderContracts(); renderDashboard();
  toast('계약이 파기 처리됐습니다.');
  _triggerWageLedgerRegen(c.company_id);
}

// ─── 갱신 플로우 ───
/**
 * 갱신 시 현재 폼에 입력된 값을 수집하여 신규 계약에 반영
 * 기존 계약을 베이스로, 사용자가 수정한 필드만 덮어쓴다.
 */
function _collectRenewFormFields(){
  const fields = {};

  // 계약 유형
  const typeEl = document.getElementById('ct-type');
  if(typeEl) fields.contract_type = CONTRACT_TYPE_LEGACY_MAP[typeEl.value] || typeEl.value;

  // 계약 시작일·종료일 (폼에 입력된 값, 정규직(수습 제외)만 종료일 강제 공백)
  const ctNorm = fields.contract_type;
  const isRegularNoProb = (ctNorm === CONTRACT_TYPE.REGULAR);
  const startEl = document.getElementById('ct-start');
  if(startEl) fields.contract_start = startEl.value;
  const endEl = document.getElementById('ct-end');
  if(endEl) fields.contract_end = isRegularNoProb ? '' : endEl.value;

  // 근무시간
  const hoursEl = document.getElementById('ct-hours');
  if(hoursEl) fields.work_hours_per_day = parseFloat(hoursEl.value) || 0;
  const daysEl = document.getElementById('ct-days');
  if(daysEl) fields.work_days_per_week = parseFloat(daysEl.value) || 5;

  // 기본급·일급·연봉
  fields.base_salary   = getAmountVal('ct-base');
  fields.annual_salary = getAmountVal('ct-annual-sal');
  fields.daily_wage    = getAmountVal('ct-daily-wage');

  // 월약정급여: 정규직이면 연봉/12, 그 외는 폼 계산값에서 읽기
  const ctNorm2 = fields.contract_type;
  const isRegGroup2 = (ctNorm2 === CONTRACT_TYPE.REGULAR || ctNorm2 === CONTRACT_TYPE.REGULAR_PROBATION);
  if (isRegGroup2 && fields.annual_salary > 0) {
    fields.monthly_salary_agreed = Math.round(fields.annual_salary / 12);
  } else {
    // 계약직·일용직은 ct-monthly-computed의 텍스트 값에서 숫자 추출
    const monthlyEl = document.getElementById('ct-monthly-computed');
    if (monthlyEl) {
      const txt = monthlyEl.textContent || '';
      const num = parseInt(txt.replace(/[^0-9]/g, '')) || 0;
      if (num > 0) fields.monthly_salary_agreed = num;
    }
  }

  // 수당
  fields.position_allowance    = getAmountVal('ct-position') || 0;
  fields.transportation_allowance = getAmountVal('ct-car') || 0;
  fields.remote_area_allowance = getAmountVal('ct-remote-area') || 0;
  fields.meal_allowance        = getAmountVal('ct-meal') || 0;
  fields.research_allowance    = getAmountVal('ct-research') || 0;
  fields.site_allowance        = getAmountVal('ct-site') || 0;
  fields.skill_allowance       = getAmountVal('ct-skill') || 0;
  fields.license_allowance     = getAmountVal('ct-license') || 0;
  fields.hazard_allowance      = getAmountVal('ct-hazard') || 0;
  fields.custom_ordinary_values = JSON.stringify(typeof _getCustomOrdinaryValues==='function' ? _getCustomOrdinaryValues() : []);
  fields.custom_fixed_values    = JSON.stringify(typeof _getCustomFixedValues==='function'    ? _getCustomFixedValues()    : []);
  fields.communication_allowance = getAmountVal('ct-communication') || 0;
  fields.fitness_allowance     = getAmountVal('ct-fitness') || 0;
  fields.self_dev_allowance    = getAmountVal('ct-self-dev') || 0;
  fields.book_allowance        = getAmountVal('ct-book') || 0;
  fields.overseas_allowance    = getAmountVal('ct-overseas') || 0;
  fields.regular_bonus         = getAmountVal('ct-regular-bonus') || 0;
  fields.childcare_allowance   = getAmountVal('ct-childcare') || 0;

  // 수당 지급유형
  const payTypeMap = {
    car:'transportation_pay_type', meal:'meal_pay_type', research:'research_pay_type',
    communication:'communication_pay_type', fitness:'fitness_pay_type',
    self_dev:'self_dev_pay_type', book:'book_pay_type', overseas:'overseas_pay_type'
  };
  Object.keys(payTypeMap).forEach(k => {
    fields[payTypeMap[k]] = _getCTPayTypeVal(k);
  });

  // 연차
  const annualEl = document.getElementById('ct-annual');
  if(annualEl) fields.annual_leave_days = parseFloat(annualEl.value) || 15;
  const preUsedEl = document.getElementById('ct-pre-used-annual');
  if(preUsedEl) fields.pre_used_annual_leave = parseFloat(preUsedEl.value) || 0;

  // 급여 산정기간·지급일
  const ppEl = document.getElementById('ct-pay-period');
  if(ppEl) fields.pay_period = ppEl.value.trim();
  const ppMonEl = document.getElementById('ct-pay-period-month-hidden');
  if(ppMonEl) fields.pay_period_month = ppMonEl.value || null;
  const ppDayEl = document.getElementById('ct-pay-period-day-hidden');
  if(ppDayEl) fields.pay_period_day = parseInt(ppDayEl.value) || null;
  const payDayEl = document.getElementById('ct-pay-day');
  if(payDayEl) fields.pay_day = parseInt(payDayEl.value) || null;

  // 근무시간표
  try {
    const sch = getScheduleJSON();
    if(Array.isArray(sch) && sch.some(d=>d.active)) fields.schedule_json = JSON.stringify(sch);
  } catch(e){}

  // 수습
  const probMonEl = document.getElementById('ct-probation-months');
  if(probMonEl) fields.probation_months = parseInt(probMonEl.value) || 0;
  const probPctEl = document.getElementById('ct-probation-pct');
  if(probPctEl) fields.probation_pct = parseFloat(probPctEl.value) || 0;
  const probAmtEl = document.getElementById('ct-probation-amt');
  if(probAmtEl) fields.probation_amt = parseFloat(probAmtEl.value) || 0;
  const probBasisEl = document.querySelector('input[name="ct-probation-basis"]:checked');
  if(probBasisEl) fields.probation_basis = probBasisEl.value;
  const probEndEl = document.getElementById('ct-probation-end-date');
  if(probEndEl) fields.probation_end_date = probEndEl.value || null;

  // 고정OT
  fields.fixed_ot_pay    = getAmountVal('ct-fixed-ot-pay') || 0;
  fields.fixed_ot_hours  = typeof _weeklyToMonthlyHours === 'function' ? _weeklyToMonthlyHours('ct-fixed-ot-hours') : (parseFloat(document.getElementById('ct-fixed-ot-hours')?.value) || 0);
  fields.fixed_night_pay = getAmountVal('ct-fixed-night-pay') || 0;
  fields.fixed_night_hours = typeof _weeklyToMonthlyHours === 'function' ? _weeklyToMonthlyHours('ct-fixed-night-hours') : (parseFloat(document.getElementById('ct-fixed-night-hours')?.value) || 0);
  fields.fixed_hol_pay   = getAmountVal('ct-fixed-hol-pay') || 0;
  fields.fixed_hol_hours = typeof _weeklyToMonthlyHours === 'function' ? _weeklyToMonthlyHours('ct-fixed-hol-hours') : (parseFloat(document.getElementById('ct-fixed-hol-hours')?.value) || 0);

  // 보육수당
  fields.childcare_dependents = parseInt(document.getElementById('ct-childcare-dependents')?.value) || 0;
  fields.childcare_pay_type   = _getCTPayTypeVal('childcare');

  // 차량유지비 (transportation_allowance와 동일값)
  fields.car_maintenance = getAmountVal('ct-car') || 0;

  // ── 주휴수당·통상시급 재계산 (급여 변경 반영) ──
  // 기본급 = 시급×209h (주휴 35h 포함), 주휴수당 = 시급×35h (참고용)
  const ht = fields.work_hours_per_day || 8;
  const dy = fields.work_days_per_week || 5;
  const _renewMonthlyHolH = typeof _calcMonthlyHolHours === 'function'
    ? _calcMonthlyHolHours(ht) : Math.round(ht * 365 / 12 / 7);
  // 통상시급: 폼에서 입력된 값 읽기 (필수값 — 갱신 시 원본 덮어쓰기 방지)
  fields.hourly_wage = getAmountVal('ct-hourly-input') || 0;
  // 주휴수당: 통상시급 × 월주휴시간(35h) [근로기준법 제55조]
  fields.weekly_holiday_pay = fields.hourly_wage > 0
    ? Math.round(fields.hourly_wage * _renewMonthlyHolH) : 0;

  return fields;
}

/**
 * 갱신 신규 계약 시작일 유효성 검사
 * @param {string} oldEnd - 기존 계약 해지일 (YYYY-MM-DD)
 */
function _validateRenewNewStart(oldEnd){
  const newStartEl = document.getElementById('ct-renew-new-start');
  const newStartErr = document.getElementById('ct-renew-new-start-err');
  const ns = newStartEl?.value;
  if(!ns) {
    if(newStartErr){ newStartErr.textContent = '신규 계약 시작일을 입력하세요.'; newStartErr.style.display = 'block'; }
    return false;
  }
  if(ns <= oldEnd){
    if(newStartErr){ newStartErr.textContent = '신규 계약 시작일은 기존 계약 해지일보다 이후여야 합니다.'; newStartErr.style.display = 'block'; }
    newStartEl.classList.add('va-input-err');
    return false;
  }
  if(newStartErr) newStartErr.style.display = 'none';
  // auto-set to valid state (remove error if any)
  return true;
}

/**
 * 갱신 모드 전용 유효성 검사 (직원 신상정보 제외, 계약 조건만)
 * - 사원번호·주민번호·이름·전화번호 등은 갱신 시 locked 상태이므로 검증 제외
 */
function _validateRenewFields(){
  const errors = [];

  // 계약 시작일
  const _startEl = document.getElementById('ct-start');
  if(_startEl && _startEl.offsetParent !== null && !_startEl.value.trim()){
    _ctMarkError('ct-start', '계약 시작일', errors);
  }
  // 통상시급
  const _hwEl = document.getElementById('ct-hourly-input');
  if(_hwEl && (!_hwEl.value || parseFloat(_hwEl.value) <= 0)){
    _ctMarkError('ct-hourly-input', '통상시급', errors);
  } else if(_hwEl){
    // 통상시급 최저임금 하한 (계약시작연도 법정 최저시급 기준)
    const _hwValRenew = parseFloat(_hwEl.value) || 0;
    const _startRawR = document.getElementById('ct-start')?.value || '';
    const _yrR = _startRawR ? parseInt(_startRawR.slice(0,4)) : new Date().getFullYear();
    const _minR = _getCTLegalMinWage(_yrR);
    if(_minR > 0 && _hwValRenew < _minR){
      _ctMarkError('ct-hourly-input',
        `통상시급은 ${_yrR}년 법정 최저시급(${_minR.toLocaleString('ko-KR')}원) 이상이어야 합니다`, errors);
    }
  }
  // 급여 산정기간
  const _ppEl = document.getElementById('ct-pay-period-month');
  if(_ppEl && !_ppEl.value.trim()){
    _ctMarkError('ct-pay-period-month', '급여 산정기간', errors);
  }

  if(errors.length){
    _ctShowErrors(errors);
    return true;
  }
  return false;
}

const _yearHolidayCache = {};

/**
 * 해당 날짜가 공휴일 또는 근로자의 날(5/1)인지 확인
 * @param {Date} d
 * @returns {boolean}
 */
/**
 * 익영업일 반환: dateStr(YYYY-MM-DD)의 다음 평일(주말·공휴일 제외)
 */
function _nextBusinessDay(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  let tries = 0;
  while(tries < 14){
    const dow = d.getDay();
    if(dow !== 0 && dow !== 6 && !_isHoliday(d)) break;
    d.setDate(d.getDate() + 1);
    tries++;
  }
  return d.toISOString().slice(0,10);
}

/**
 * 전영업일 반환: dateStr(YYYY-MM-DD)의 이전 평일(주말·공휴일 제외)
 */
function _prevBusinessDay(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  let tries = 0;
  while(tries < 14){
    const dow = d.getDay();
    if(dow !== 0 && dow !== 6 && !_isHoliday(d)) break;
    d.setDate(d.getDate() - 1);
    tries++;
  }
  return d.toISOString().slice(0,10);
}

function _isHoliday(d){
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dateStr = `${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  return _getYearHolidays(y).has(dateStr);
}

/**
 * 해당 연도의 모든 공휴일 Set(MM-DD)을 반환 (대체공휴일 포함, 연도별 캐싱)
 * @param {number} y
 * @returns {Set<string>}
 */
function _getYearHolidays(y){
  if(_yearHolidayCache[y]) return _yearHolidayCache[y];

  // ── 매년 고정 공휴일 (제헌절은 2026년부터 공휴일) ──
  const fixed = [
    '01-01', // 신정
    '03-01', // 삼일절
    '05-01', // 근로자의 날
    '05-05', // 어린이날
    '06-06', // 현충일
    '08-15', // 광복절
    '10-03', // 개천절
    '10-09', // 한글날
    '12-25', // 성탄절
  ];
  if(y >= 2026) fixed.push('07-17'); // 제헌절

  // ── 연도별 음력 공휴일 (설날 3일, 석가탄신일, 추석 3일) ──
  const LUNAR_HOLIDAYS = {
    2021: ['02-11','02-12','02-13', '05-19', '09-20','09-21','09-22'],
    2022: ['01-31','02-01','02-02', '05-08', '09-09','09-10','09-11'],
    2023: ['01-21','01-22','01-23', '05-27', '09-28','09-29','09-30'],
    2024: ['02-09','02-10','02-11', '05-15', '09-16','09-17','09-18'],
    2025: ['01-28','01-29','01-30', '05-05', '10-05','10-06','10-07'],
    2026: ['02-16','02-17','02-18', '05-24', '09-24','09-25','09-26'],
    2027: ['02-05','02-06','02-07', '05-13', '09-14','09-15','09-16'],
    2028: ['01-25','01-26','01-27', '05-02', '10-02','10-03','10-04'],
    2029: ['02-12','02-13','02-14', '05-20', '09-21','09-22','09-23'],
  };

  // ── 연도별 대체공휴일 (법령 기준) ──
  // 대상: 설·추석 연휴(토·일 포함 또는 다른 공휴일 겹침), 어린이날, 삼일절, 광복절, 개천절, 한글날
  // (신정·현충일·석가탄신일·성탄절·근로자의날·제헌절은 대체공휴일 없음)
  const SUBSTITUTE_HOLIDAYS = {
    2021: ['02-15', '08-16', '10-04', '10-11'],
    2022: ['09-12', '10-10'],
    2023: ['01-24', '10-02'],
    2024: ['02-12', '05-06'],
    2025: ['03-03', '10-08'],
    2026: ['03-02', '08-17', '09-28', '10-05'],
    2027: ['02-08', '08-16', '10-04', '10-11'],
    2028: ['10-05'],
    2029: ['05-07', '09-24'],
  };

  const allDates = new Set([
    ...fixed,
    ...(LUNAR_HOLIDAYS[y] || []),
    ...(SUBSTITUTE_HOLIDAYS[y] || []),
  ]);

  _yearHolidayCache[y] = allDates;
  return allDates;
}

/**
 * 두 날짜 사이에 평일(월~금, 공휴일 제외)이 존재하는지 확인
 * @param {string} oldEnd - YYYY-MM-DD
 * @param {string} newStart - YYYY-MM-DD
 * @returns {boolean} true = 평일 갭 있음 (연속계약 아님), false = 연속계약 또는 주말·공휴일만 갭
 */
function _hasWeekdayGap(oldEnd, newStart){
  const oldD = new Date(oldEnd);
  const newD = new Date(newStart);
  // oldEnd 다음날부터 newStart 전날까지 검사
  for (let d = new Date(oldD.getTime() + 86400000); d < newD; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0=일, 6=토
    if (day !== 0 && day !== 6 && !_isHoliday(d)) return true; // 평일(공휴일 제외) 발견 → 단절된 계약
  }
  return false; // 주말·공휴일만 있거나 연속된 경우
}

/**
 * 입사일 상속·시작일 역전 차단용 "이전 계약" 탐색 (재계약·신규계약 모드 전용)
 * - 재계약 모드: _recontractSourceId 계약
 * - 신규계약 모드: 동일인(이름+주민번호 앞7자리 매칭)의 과거 만료/해지 계약 중 종료일 최신
 * @returns {{contract:object, endDate:string, hireDate:string}|null}
 */
function _ctGetPrevContractForContinuity(){
  // ── 재계약 모드: 원본 계약 ──
  if(_recontractSourceId){
    const src = (allContracts||[]).find(x => x.id === _recontractSourceId && !x.is_draft);
    if(src){
      const end = src.terminate_date || src.contract_end || '';
      const emp = (allEmployees||[]).find(e => e.id === src.employee_id);
      return { contract: src, endDate: end, hireDate: emp?.hire_date || '', empNo: emp?.employee_number || '', prevEmpId: emp?.id || '' };
    }
    return null;
  }
  // ── 신규계약 모드: 선택된 근로자 기준 (Phase 2: 인사관리대장 선택) ──
  if(_ctSelectedEmpId){
    const prevs = (allContracts||[]).filter(c =>
      c.employee_id === _ctSelectedEmpId && !c.is_draft && !c.is_voided_by_amend &&
      [CONTRACT_STATUS.TERMINATED, CONTRACT_STATUS.EXPIRED].includes(c.status) &&
      (c.terminate_date || c.contract_end)
    );
    if(prevs.length){
      prevs.sort((a,b)=>(b.terminate_date||b.contract_end||'').localeCompare(a.terminate_date||a.contract_end||''));
      const prev = prevs[0];
      const emp = (allEmployees||[]).find(e=>e.id===_ctSelectedEmpId);
      return { contract: prev, endDate: prev.terminate_date || prev.contract_end || '', hireDate: emp?.hire_date || '', empNo: emp?.employee_number || '', prevEmpId: emp?.id || '' };
    }
    return null;
  }
  // ── 신규계약 모드: 신규 직원 입력 섹션이 보일 때만 ──
  const newSec = document.getElementById('ct-new-emp-section');
  if(newSec && newSec.style.display !== 'none'){
    const name = document.getElementById('ct-em-name')?.value?.trim() || '';
    const idNumber = document.getElementById('ct-em-id')?.value?.trim() || '';
    const idPre = idNumber.replace(/[^0-9]/g, '').slice(0, 7);
    const nameKey = _ctNameKey(name);
    if(!name || !idPre || !nameKey) return null;
    const coId = document.getElementById('ct-company')?.value || '';
    const matchedEmpIds = new Set(
      (allEmployees||[]).filter(e =>
        _ctNameKey(e.name) === nameKey &&
        ((e.id_number || '').replace(/[^0-9]/g, '').slice(0, 7) === idPre) &&
        (!coId || e.company_id === coId)
      ).map(e => e.id)
    );
    if(!matchedEmpIds.size) return null;
    const prevs = (allContracts||[]).filter(c =>
      matchedEmpIds.has(c.employee_id) && !c.is_draft && !c.is_voided_by_amend &&
      [CONTRACT_STATUS.TERMINATED, CONTRACT_STATUS.EXPIRED].includes(c.status) &&
      (c.terminate_date || c.contract_end)
    );
    if(!prevs.length) return null;
    prevs.sort((a,b) => (b.terminate_date||b.contract_end||'').localeCompare(a.terminate_date||a.contract_end||''));
    const prev = prevs[0];
    const emp = (allEmployees||[]).find(e => e.id === prev.employee_id);
    return { contract: prev, endDate: prev.terminate_date || prev.contract_end || '', hireDate: emp?.hire_date || '', empNo: emp?.employee_number || '', prevEmpId: emp?.id || '' };
  }
  return null;
}

function doContractRenew(){
  // P9: 이중 갱신 방지 가드
  const _renewC = allContracts.find(x => x.id === editId.contract);
  if(_renewC && _renewC.renewed_to_id){
    const _existingNew = allContracts.find(x => x.id === _renewC.renewed_to_id);
    if(_existingNew && _existingNew.status !== CONTRACT_STATUS.VOIDED){
      toast('이 계약은 이미 갱신된 계약입니다. 기존 갱신 계약을 확인하세요.', 'error');
      return;
    }
  }
  
  // ACTIVE 상태 가드: 유효(ACTIVE) 계약만 갱신 가능
  if(!_renewC || !CONTRACT_ACTIVE_STATUSES.includes(_renewC.status)){
    toast('유효(ACTIVE) 상태의 계약만 갱신할 수 있습니다.', 'error');
    return;
  }
  
  // 종료 패널 숨김
  document.getElementById('ct-terminate-panel').style.display = 'none';
  const rp = document.getElementById('ct-renew-panel');
  if(!rp) return;
  rp.style.display = 'block';

  // ── 갱신 모드: 계약정보 섹션 숨김 (해지일·시작일은 갱신 카드 내에서 설정) ──
  ['ct-start','ct-row-end','ct-row-terminate','ct-row-voided','ct-row-renewed-pair-end','ct-row-probation-period','ct-probation-row','ct-probation-end-col'].forEach(id => {
    const el = document.getElementById(id);
    if(el){
      const parent = el.closest('.form-group');
      if(parent) parent.style.display = 'none';
      else el.style.display = 'none';
    }
  });
  // ct-start-hint 숨김 (구 ct-end-hint는 UI 재구성으로 제거됨)
  ['ct-start-hint'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });
  // 계약정보 섹션 타이틀도 숨김
  const _sectionTitles = document.querySelectorAll('.form-section-title');
  _sectionTitles.forEach(el => {
    if(el.textContent.includes('계약 정보')) el.style.display = 'none';
  });

  const oldEndEl = document.getElementById('ct-renew-old-end');
  const newStartEl = document.getElementById('ct-renew-new-start');
  const newStartErr = document.getElementById('ct-renew-new-start-err');

  // 기존 계약 해지일: 사용자가 직접 입력 (기본값 없음)
  oldEndEl.value = '';
  oldEndEl.disabled = false;
  // 신규 계약 시작일: 비활성 상태로 시작 (해지일 입력 후 활성화)
  newStartEl.value = '';
  newStartEl.disabled = true;
  newStartEl.removeAttribute('min');
  if(newStartErr) newStartErr.style.display = 'none';

  // ── 기존 계약 해지일 ↔ 신규 시작일 양방향 자동설정 (gap 규칙) ──
  let _renewDateSyncing = false; // 무한루프 방지 플래그
  oldEndEl.onchange = function(){
    if(_renewDateSyncing) return;
    const oe = oldEndEl.value;
    if(oe){
      newStartEl.disabled = false;
      _renewDateSyncing = true;
      newStartEl.value = _nextBusinessDay(oe);
      newStartEl.min = oe;
      _renewDateSyncing = false;
      if(newStartErr) newStartErr.style.display = 'none';
      // 해지일 입력으로 새 시작일 자동 설정 시에도 allowance_config 재적용
      const _renewCoId2 = (_renewC && _renewC.company_id) || '';
      if (_renewCoId2 && newStartEl.value && typeof _reapplyAllowanceConfigForDate === 'function') {
        _reapplyAllowanceConfigForDate(_renewCoId2, newStartEl.value, true);
      }
    } else {
      newStartEl.disabled = true;
      newStartEl.value = '';
      newStartEl.removeAttribute('min');
      if(newStartErr) newStartErr.style.display = 'none';
    }
  };

  newStartEl.onchange = function(){
    if(_renewDateSyncing) return;
    const ns = newStartEl.value;
    if(ns){
      _renewDateSyncing = true;
      oldEndEl.value = _prevBusinessDay(ns);
      _renewDateSyncing = false;
      _validateRenewNewStart(oldEndEl.value);
      // ── 갱신: 새 계약 시작일 기준 allowance_config 재적용 ──
      const _renewCoId = (allContracts||[]).find(x => x.id === editId.contract)?.company_id;
      if (_renewCoId && typeof _reapplyAllowanceConfigForDate === 'function') {
        _reapplyAllowanceConfigForDate(_renewCoId, ns, true);
      }
    } else {
      // 시작일 삭제 시 해지일도 함께 초기화
      oldEndEl.value = '';
      if(newStartErr) newStartErr.style.display = 'none';
    }
  };

  // ── 갱신 시 전체 폼 필드 편집 가능하게 해제 ──
  const modalEl = document.querySelector('#contract-modal .modal');
  if(modalEl){
    modalEl.classList.remove('ct-readonly');
    // 편집 모드: 관리자 메모 placeholder 복원
    const _ctNoteRN = document.getElementById('ct-note');
    if(_ctNoteRN) _ctNoteRN.placeholder = '계약 관련 내부 메모를 입력하세요...';
    const bodyEl = modalEl.querySelector('.modal-body');
    if(bodyEl) bodyEl.querySelectorAll('input,select,textarea').forEach(el=>{
      if(el.closest('#ct-renew-panel')) return;
      el.disabled = false;
      el.tabIndex = 0;
      el.style.pointerEvents = '';
      el.classList.remove('ct-input-locked','ct-input-locked-dark'); });
    if(bodyEl){
      bodyEl.querySelectorAll('.pi-pay-type-btn').forEach(btn=>{
        btn.disabled = false; btn.style.cursor = ''; btn.style.pointerEvents = '';
      });
      bodyEl.querySelectorAll('.btn-brk-add').forEach(btn=>{
        btn.disabled = false; btn.style.cursor = ''; btn.style.pointerEvents = '';
      });
    }
    // 근무시간표 재렌더링: readonly 해제 후 비활성 요일의 disabled 상태 복원
    const _renewC = allContracts.find(x => x.id === editId.contract);
    if(_renewC && _renewC.schedule_json){
      try { if(typeof setScheduleFromJSON === 'function') setScheduleFromJSON(JSON.parse(_renewC.schedule_json)); }
      catch(e){ if(typeof setScheduleFromLegacy === 'function') setScheduleFromLegacy(_renewC); }
    } else if(_renewC && typeof setScheduleFromLegacy === 'function'){
      setScheduleFromLegacy(_renewC);
    }
  }

  // 액션 버튼 숨김 (갱신 중에는 다른 액션 불가)
  ['ct-btn-amend','ct-btn-amend2','ct-btn-renew','ct-btn-renew2',
   'ct-btn-terminate','ct-btn-terminate2','ct-btn-recontract','ct-btn-recontract2',
   'ct-btn-fixed-terminate','ct-btn-fixed-terminate2'].forEach(bid=>{
    const el = document.getElementById(bid); if(el) el.style.display='none';
  });

  // ── 갱신 모드: 사원번호·이름·주민번호 잠금 ──
  ['ct-edit-em-empno','ct-edit-emp-name','ct-edit-em-id'].forEach(fid => {
    const el = document.getElementById(fid);
    if(el){
      el.disabled = true;
      el.setAttribute('readonly', '');
      el.classList.add('ct-input-locked-dark');
    }
  });
  // 주휴수당·월 약정임금·연봉 계산값도 비활성 스타일 적용
  ['ct-weekly-hol-computed','ct-monthly-computed','ct-annual-sal'].forEach(fid => {
    const el = document.getElementById(fid);
    if(el) el.classList.add('ct-input-locked-dark');
  });
  // 개별 안내 문구
  const empnoHint = document.getElementById('ct-edit-empno-lock-hint');
  if(empnoHint){ empnoHint.textContent = '계약 갱신 시에는 기 발급된 사원번호는 변경할 수 없습니다.'; empnoHint.classList.add('va-ok'); }
  const nameHint = document.getElementById('ct-edit-name-lock-hint');
  if(nameHint){ nameHint.textContent = '계약 갱신 시에는 기 등록된 이름은 수정할 수 없습니다.'; nameHint.classList.add('va-ok'); }
  const idHint = document.getElementById('ct-edit-id-lock-hint');
  if(idHint){ idHint.textContent = '계약 갱신 시에는 기 등록된 주민번호는 수정할 수 없습니다.'; idHint.classList.add('va-ok'); }

  // 하단 갱신완료·취소 버튼 표시
  const btnComplete2 = document.getElementById('ct-btn-renew-complete2');
  if(btnComplete2) btnComplete2.style.display = 'inline-flex';
  const btnCancel2 = document.getElementById('ct-btn-renew-cancel2');
  if(btnCancel2) btnCancel2.style.display = 'inline-flex';
  // 패널 내 갱신완료·취소 버튼도 표시
  const btnCompletePanel = document.getElementById('ct-btn-renew-complete-panel');
  if(btnCompletePanel) btnCompletePanel.style.display = 'inline-flex';
  const btnCancelPanel = document.getElementById('ct-btn-renew-cancel-panel');
  if(btnCancelPanel) btnCancelPanel.style.display = 'inline-flex';

  // amend 패널 숨김
  const amendPanel = document.getElementById('ct-amend-panel');
  if(amendPanel) amendPanel.style.display = 'none';

  // 일괄설정 바 표시
  const bulkBar = document.getElementById('ct-bulk-bar-wrap');
  if(bulkBar) bulkBar.style.display = '';

  // 단계바 표시
  const stepBar = document.getElementById('ct-step-bar');
  if(stepBar) stepBar.style.display = '';
  if(typeof setContractStep === 'function') setContractStep(1);

  // 첨부서류 섹션 숨김 (갱신 모드에서는 불필요)
  const filesSection = document.getElementById('ct-files-section');
  if(filesSection) filesSection.style.display = 'none';

  setTimeout(()=>rp.scrollIntoView({behavior:'smooth',block:'center'}),100);
}

/** 갱신 모드 취소: 계약 조회 모드로 복귀 */
async function cancelContractRenew(){
  const cid = editId.contract;
  if(!cid) return;

  const c = allContracts.find(x => x.id === cid);
  if(!c) return;

  // 갱신예정/계약예정 상태이고 renewed_from_id가 있는 경우만 갱신 취소 처리
  const isPendingRenew = (c.status === CONTRACT_STATUS.PENDING || c.status === CONTRACT_STATUS.RENEWAL_PENDING)
                      && c.renewed_from_id;

  if(!isPendingRenew){
    // 단순 갱신 패널 닫기 (갱신 확정 전 취소)
    viewContract(cid);
    return;
  }

  const origId = c.renewed_from_id;
  const orig = allContracts.find(x => x.id === origId);

  const confirmed = await _showConfirm({
    message: `[갱신 취소] 다음 작업이 진행됩니다:\n\n`
      + `① 갱신 예정 계약 → 파기 처리\n`
      + `② 원본 계약 → 유효 상태로 복원\n`
      + `③ 원본 계약의 해지일 데이터 삭제 (계약 종료일은 보존)\n\n`
      + `계속하시겠습니까?`,
    okText: '갱신 취소',
    okClass: 'btn-primary'
  });
  if(!confirmed) return;

  try {
    // 1. 원본 계약 복원: ACTIVE, 해지일 제거, renewed_to_id 제거 (contract_end는 보존)
    if(orig){
      await api(`../tables/contracts/${origId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          status: CONTRACT_STATUS.ACTIVE,
          terminate_date: '',
          renewed_to_id: null
        })});
    }

    // 2. 갱신예정 계약 삭제 (또는 void 처리)
    await api(`../tables/contracts/${cid}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({status: CONTRACT_STATUS.VOIDED, close_reason:'void'})});

    closeModal('contract-modal');
    await loadContracts(); await loadEmployees();
    renderContracts(); renderDashboard();
    toast('갱신이 취소되고 원본 계약이 유효 상태로 복원되었습니다.', 'success');
  } catch(e){
    console.error('[cancelContractRenew]', e);
    toast('갱신 취소 중 오류가 발생했습니다.', 'error');
  }
}
async function confirmContractRenew(){
  const oldEndEl = document.getElementById('ct-renew-old-end');
  const newStartEl = document.getElementById('ct-renew-new-start');
  const oldEnd   = oldEndEl?.value;
  const newStart = newStartEl?.value;
  if(!oldEnd){
    oldEndEl?.focus();
    oldEndEl?.scrollIntoView({behavior:'smooth',block:'center'});
    return toast('기존 계약 해지일을 입력하세요.','error');
  }
  if(!newStart){
    newStartEl?.focus();
    newStartEl?.scrollIntoView({behavior:'smooth',block:'center'});
    return toast('신규 계약 시작일을 입력하세요.','error');
  }
  if(newStart <= oldEnd){
    newStartEl?.focus();
    newStartEl?.scrollIntoView({behavior:'smooth',block:'center'});
    return toast('신규 계약 시작일은 기존 계약 해지일보다 이후여야 합니다.','error');
  }

  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');

  // ── 갱신 전용 유효성 검사 (직원 신상정보 제외, 계약조건만) ──
  if(_validateRenewFields()) return;

  const today = fmtLocalDate(new Date());
  const origEnd = c.contract_end || '';

  // ── 갱신 폼 필드 미리 수집 (요약 메시지에 필요) ──
  const _renewFields = _collectRenewFormFields();
  const newStatus = newStart > today ? CONTRACT_STATUS.PENDING : CONTRACT_STATUS.ACTIVE;

  // ── 계약 연속성 검사: 해지일~시작일 사이에 평일 갭이 있으면 입사일 변경 ──
  const _emp = allEmployees.find(e => e.id === c.employee_id);
  const _oldHireDate = _emp?.hire_date || '';
  const _hasGap = _hasWeekdayGap(oldEnd, newStart);
  if(_hasGap && _emp){
    const _fmtOld = oldEnd.replace(/-/g, '.');
    const _fmtNew = newStart.replace(/-/g, '.');
    const confirmed = await _showConfirm({
      message: `⚠️ 계약 연속성 단절 안내\n\n` +
        `기존 계약 해지일(${_fmtOld})과 신규 계약 시작일(${_fmtNew}) 사이에 평일 공백이 있습니다.\n` +
        `이 경우 입사일이 신규 계약 시작일(${_fmtNew})로 변경됩니다.\n\n` +
        `현재 입사일: ${_oldHireDate.replace(/-/g, '.')}\n` +
        `변경될 입사일: ${_fmtNew}`,
      okText: '계속 진행',
      cancelText: '취소'
    });
    if(!confirmed) return;
  }

  // 갱신 변경사항 요약
  const _empName = _emp?.name || '';
  const _ctLabel = contractTypeLabel(c.contract_type) || '';
  const _fmtD = d => d ? d.replace(/-/g, '.') : '-';
  const _fmtW = v => Math.round(v||0).toLocaleString('ko-KR') + '원';

  const _changes = [];
  _changes.push(`기존 계약 종료: ${_fmtD(oldEnd)} → 신규 계약 시작: ${_fmtD(newStart)}`);
  if(_renewFields.contract_end) _changes.push(`신규 계약 종료일: ${_fmtD(_renewFields.contract_end)}`);
  if(_renewFields.hourly_wage !== c.hourly_wage) _changes.push(`통상시급: ${_fmtW(c.hourly_wage)} → ${_fmtW(_renewFields.hourly_wage)}`);
  if(_renewFields.base_salary !== c.base_salary) _changes.push(`기본급: ${_fmtW(c.base_salary)} → ${_fmtW(_renewFields.base_salary)}`);
  if(_renewFields.monthly_salary_agreed !== c.monthly_salary_agreed) _changes.push(`월 약정임금: ${_fmtW(c.monthly_salary_agreed)} → ${_fmtW(_renewFields.monthly_salary_agreed)}`);
  if(_renewFields.work_hours_per_day !== c.work_hours_per_day) _changes.push(`1일 근로시간: ${c.work_hours_per_day||0}h → ${_renewFields.work_hours_per_day||0}h`);
  if(_renewFields.work_days_per_week !== c.work_days_per_week) _changes.push(`주 근로일수: ${c.work_days_per_week||0}일 → ${_renewFields.work_days_per_week||0}일`);
  const _changedAllowances = [];
  for(const key of ['position_allowance','meal_allowance','transportation_allowance','site_allowance','skill_allowance','license_allowance','hazard_allowance','remote_area_allowance','communication_allowance','research_allowance','regular_bonus','childcare_allowance']){
    if((_renewFields[key]||0) !== (c[key]||0)) _changedAllowances.push(key);
  }
  if(_changedAllowances.length) _changes.push(`수당 변경: ${_changedAllowances.length}개 항목`);

  const _summaryMsg = `[계약 갱신 확인]\n\n` +
    `근로자: ${_empName} (${_ctLabel})\n\n` +
    `갱신 내용:\n` +
    _changes.map((ch, i) => `${i+1}. ${ch}`).join('\n');

  const confirmed = await _showConfirm({
    message: _summaryMsg,
    okText: '갱신 완료',
    cancelText: '취소'
  });
  if(!confirmed) return;

  // 1. 신규 계약 생성 (현재 폼 입력값 + 기존 계약 병합)
  const newContract = Object.assign({}, c, _renewFields, {
    contract_start: newStart,                              // 갱신 패널에서 지정한 시작일 우선
    contract_end:   _renewFields.contract_end !== undefined ? _renewFields.contract_end : '',  // 계약직은 폼 종료일, 정규직은 빈값
    status:         newStatus,
    is_draft:       false,
    terminate_date: '',
    renewed_from_id: c.id,                                 // 원본 계약 ID 참조
    created_reason:  'renewal',                            // 갱신으로 생성된 계약 (영문 코드)
    note: document.getElementById('ct-note')?.value || c.note || '',
  });
  // API 시스템 필드 및 DB 미존재 컬럼 제거 (id는 서버에서 UUID 생성)
  ['id','gs_project_id','gs_table_name','created_at','updated_at','deleted','terminate_date'].forEach(k=>delete newContract[k]);
  const savedNew = await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newContract)});
  const newId = savedNew.id;

  // 2. 기존 계약: 해지일 기록 + 상태 변경 (해지일 미래면 TERMINATE_PENDING, 과거면 TERMINATED)
  //    실패 시 새로 생성한 계약 롤백
  try {
    const _oldTermStatus = oldEnd > today ? CONTRACT_STATUS.TERMINATE_PENDING : CONTRACT_STATUS.TERMINATED;
    await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({terminate_date: oldEnd, status: _oldTermStatus, renewed_to_id: newId, close_reason:'renewal'})});
    // 로컬 갱신
    c.terminate_date = oldEnd;
    c.status = _oldTermStatus;
    c.renewed_to_id = newId;

    // ── 계약 연속성 단절 시 근로자 입사일 변경 ──
    if(_hasGap && _emp){
      try {
        await api(`../tables/employees/${_emp.id}`, {
          method: 'PATCH', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ hire_date: newStart })
        });
        _emp.hire_date = newStart;
        toast(`계약 연속성 단절로 입사일이 ${newStart.replace(/-/g, '.')}(으)로 변경되었습니다.`, 'warning');
      } catch(e){
        console.error('[입사일 변경 실패]', e);
      }
    }
  } catch(e){
    // PATCH 실패 → 새 계약 롤백
    console.error('[갱신 PATCH 실패]', e);
    try { await api('../tables/contracts/' + newId, { method: 'DELETE' }); }
    catch(e2){ console.error('[롤백 실패]', e2); }
    toast('갱신 처리 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    return;
  }

  // ── 고객사 인앱 알림 발송 (갱신/갱신예약) ──
  {
    const _renewEmp = allEmployees.find(x => x.id === c.employee_id) || {};
    const _renewCo  = allCompanies.find(x => x.id === c.company_id)  || {};
    const _coRep    = getCompanyRepGreeting(_renewCo);
    const _fmtD     = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    if(newStatus === CONTRACT_STATUS.PENDING){
      // 갱신 예약
      await _sendCompanyNotice({
        companyId  : c.company_id, companyName: _renewCo.company_name || '',
        noticeType : 'contract_renewal_scheduled',
        title      : `[갱신 예약] ${_renewEmp.name||''} — 계약 갱신이 예약되었습니다`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 갱신이 예약되었습니다.

■ 근로자: ${_renewEmp.name||''}
■ 고용형태: ${contractTypeLabel(c.contract_type)||''}
■ 기존 계약 해지일: ${_fmtD(oldEnd)}
■ 새 계약 시작일: ${_fmtD(newStart)} (시작일 미도래 — 계약예정)
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

`,
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
■ 고용형태: ${contractTypeLabel(c.contract_type)||''}
■ 기존 계약 해지일: ${_fmtD(oldEnd)}
■ 새 계약 시작일: ${_fmtD(newStart)}
■ 계약 상태: 계약유효 (활성)
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

`,
        contractId  : newId,
        employeeId  : c.employee_id, employeeName: _renewEmp.name || '',
        contractEnd : '',
      });
    }
  }

  closeModal('contract-modal');
  await loadContracts(); await loadEmployees(); renderContracts(); renderDashboard();
  const label = newStatus === CONTRACT_STATUS.PENDING ? '계약예정 (시작일 미도래)' : '계약유효 (활성)';
  toast(`연장 처리 완료. 전 계약: 해지 / 새 계약: ${label}`);
  _triggerWageLedgerRegen(c.company_id);

  // ── 갱신 계약: 계약서 확인 및 발송 여부 확인 ──
  if(newId){
    const _newEmpName = _renewEmp?.name || '';
    const confirmed = await _showConfirm({
      message: `근로계약 갱신이 완료되었습니다.\n\n계약서를 확인하고 ${_newEmpName ? _newEmpName+'님에게 ' : ''}인쇄용 파일 주소를 즉시 발송하시겠습니까?`,
      okText: '예',
      cancelText: '아니오 (나중에 발송)',
      okClass: 'btn-primary'
    });
    if(confirmed){
      openContractPrintModal(newId);
    }
  }
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

  // 첨부서류 섹션 숨김 (재계약 입력 모드에서는 불필요)
  const filesSection = document.getElementById('ct-files-section');
  if(filesSection) filesSection.style.display = 'none';

  // 신규 모드에서 기존 계약 데이터로 필드 채우기
  const emp = allEmployees.find(e=>e.id===srcContract.employee_id)||{};

  // 직원 섹션 → 수정 직원 섹션으로 전환
  document.getElementById('ct-new-emp-section').style.display = 'none';
  document.getElementById('ct-edit-emp-info').style.display = 'block';
  const _selSecRc = document.getElementById('ct-emp-select-section');
  if(_selSecRc) _selSecRc.style.display = 'none';
  // 계약 시작일·종료일·고용형태·계약상태는 수정 모드 섹션 내부에 있으므로 별도 제어 불필요

  // 직원 정보 채우기
  document.getElementById('ct-edit-emp-name').value = emp.name||'';
  // 재계약: 고용형태는 직원 인사정보(employment_category) 기준
  const rcCtType = (emp && emp.employment_category) || srcContract.contract_type || CONTRACT_TYPE.REGULAR;
  const rcIsFixed = (rcCtType===CONTRACT_TYPE.FIXED||rcCtType===CONTRACT_TYPE.FIXED_PROBATION||rcCtType===CONTRACT_TYPE.DAILY);
  if(emp){
    document.getElementById('ct-edit-em-gender').value     = emp.gender==='여'?'female':emp.gender==='남'?'male':(emp.gender||'male');
    document.getElementById('ct-edit-em-category').value = emp.employment_category||'';
    document.getElementById('ct-edit-em-job').value        = emp.job_description||'';
    document.getElementById('ct-edit-em-dept').value       = emp.department||'';
    document.getElementById('ct-edit-em-position').value   = emp.position||'';
    // 계약직/일용직: 입사일·퇴사예정일 행 숨김 (계약 시작일·종료일과 동일)
    // 정규직/정규직 수습: 무기한 계약이므로 퇴사예정일 행 숨김
    const rcIsRegular = (rcCtType===CONTRACT_TYPE.REGULAR||rcCtType===CONTRACT_TYPE.REGULAR_PROBATION);
    const rcHireRow   = document.getElementById('ct-contract-hire-row');
    const rcExpRow    = document.getElementById('ct-edit-row-expire');
    const rcEndRow    = document.getElementById('ct-row-end');
    if(rcHireRow)   rcHireRow.style.display   = rcIsFixed ? 'none' : '';
    // 정규직이면 퇴사예정일 숨김, 계약직이면 입사일과 함께 숨김
    if(rcExpRow)    rcExpRow.style.display    = (rcIsFixed || rcIsRegular) ? 'none' : '';
    // 정규직이면 계약 종료일도 숨김
    if(rcEndRow)    rcEndRow.style.display    = rcIsRegular ? 'none' : '';
    // 재계약 = 재입사: 입사일은 이전 계약에서 승계하지 않고 새로 입력 (빈 값)
    document.getElementById('ct-edit-em-hire').value = '';
    if(!rcIsFixed && !rcIsRegular){
      document.getElementById('ct-edit-em-expire').value = emp.expire_date||emp.resign_date||'';
    }
    document.getElementById('ct-edit-em-id').value         = emp.id_number||'';
    document.getElementById('ct-edit-em-phone').value      = emp.phone||'';
    document.getElementById('ct-edit-em-address').value    = emp.address||'';
    document.getElementById('ct-edit-em-bank').value       = emp.bank_name||'';
    document.getElementById('ct-edit-em-account').value    = emp.bank_account||'';
  }

  // 계약 조건 복사
  document.getElementById('ct-start').value   = '';
  document.getElementById('ct-type').value    = rcCtType; toggleCtEndDate(true); toggleProbation();
  // 재계약 = 새 계약: 종료일은 승계하지 않고 빈 값 (새 기간 직접 입력)
  document.getElementById('ct-end').value     = '';
  document.getElementById('ct-status').value  = CONTRACT_STATUS.ACTIVE;
  // 재계약 = 재입사: 연차일수 0으로 리셋, 기사용 연차는 발생 불가 → 0 + 잠금
  document.getElementById('ct-annual').value  = 0;
  { const _preUsedEl = document.getElementById('ct-pre-used-annual');
    if(_preUsedEl){
      _preUsedEl.value = 0;
      _preUsedEl.disabled = true; // select는 readOnly 미적용 → disabled로 잠금
      _preUsedEl.classList.add('ct-input-locked-dark');
    }
  }
  // 요일별 스케줄 복원 (재계약: 이전 계약 스케줄 그대로 복사)
  if(srcContract.schedule_json){
    try{ setScheduleFromJSON(JSON.parse(srcContract.schedule_json)); }
    catch(e){ setScheduleFromLegacy(srcContract); }
  } else {
    setScheduleFromLegacy(srcContract);
  }

  const ct = srcContract.contract_type||CONTRACT_TYPE.REGULAR;
  const isDailySrc    = ct===CONTRACT_TYPE.DAILY;
  const isRegSrc      = ct===CONTRACT_TYPE.REGULAR||ct===CONTRACT_TYPE.REGULAR_PROBATION;
  const isFixedSrc    = ct===CONTRACT_TYPE.FIXED||ct===CONTRACT_TYPE.FIXED_PROBATION;
  const isProbSrc     = ct===CONTRACT_TYPE.REGULAR_PROBATION||ct===CONTRACT_TYPE.FIXED_PROBATION;
  const showSalSrc    = isRegSrc || isFixedSrc; // 연봉/월약정급여 행 표시 여부

  const rowA=document.getElementById('ct-row-annual-sal'); const rowM=document.getElementById('ct-row-monthly');
  if(rowA) rowA.style.display=showSalSrc?'':'none';
  if(rowM) rowM.style.display=showSalSrc?'':'none';
  const rowAnnualS=document.getElementById('ct-row-annual');
  const rowBaseS=document.getElementById('ct-row-base'); const rowWeeklyS=document.getElementById('ct-row-weekly-hol');
  const rowDailyS=document.getElementById('ct-row-daily-wage');
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
  // ── 통상임금·고정수당: 일용직은 모두 0 처리 ──
  if(isDailySrc){
    setAmountVal('ct-position',    0);
    setAmountVal('ct-car',         0); setCTPayType('car', '');
    setAmountVal('ct-remote-area', 0);
    setAmountVal('ct-meal',        0); setCTPayType('meal', '');
    setAmountVal('ct-research',    0); setCTPayType('research', '');
    setAmountVal('ct-site',        0);
    setAmountVal('ct-skill',       0);
    setAmountVal('ct-license',     0);
    setAmountVal('ct-communication',0); setCTPayType('communication', '');
    setAmountVal('ct-fitness',     0); setCTPayType('fitness', '');
    setAmountVal('ct-self-dev',    0); setCTPayType('self_dev', '');
    setAmountVal('ct-book',        0); setCTPayType('book', '');
    setAmountVal('ct-overseas',    0); setCTPayType('overseas', '');
    setAmountVal('ct-childcare',   0);
    { const _ccDep=document.getElementById('ct-childcare-dependents'); if(_ccDep) _ccDep.value=0; }
  } else {
  // ── 초기 pay_type: 현재 회사 설정 사용 (시작일 변경 시 onCtStartChange가 historical로 보정) ──
  const _coForPT = (allCompanies||[]).find(x => x.id === (srcContract.company_id || ''));
  let _cfgForPT = _coForPT?.allowance_config ?? null;
  if (typeof _cfgForPT === 'string') { try { _cfgForPT = JSON.parse(_cfgForPT); } catch(e) { _cfgForPT = {}; } }
  const _getPTSrc = (key, contractVal) => {
    const cfgPT = (_cfgForPT && _cfgForPT[key + '_pay_type']) || '';
    return cfgPT || contractVal || '';
  };
  setAmountVal('ct-position',    srcContract.position_allowance||0);
  // 차량지원비 = 구 교통비 + 구 자가운전보조금 합산 (레거시 하위호환)
  setAmountVal('ct-car', (parseFloat(srcContract.transportation_allowance||srcContract.car_maintenance||0)) + (parseFloat(srcContract.self_driving_allowance||0)));
  setCTPayType('car', _getPTSrc('car', srcContract.transportation_pay_type||srcContract.self_driving_pay_type));
  setAmountVal('ct-remote-area', srcContract.remote_area_allowance||0);
  // remote-area는 통상임금 항상 포함 — pay_type 세팅 불필요
  setAmountVal('ct-meal',        srcContract.meal_allowance != null ? srcContract.meal_allowance : 200000);
  setCTPayType('meal',           _getPTSrc('meal', srcContract.meal_pay_type));
  setAmountVal('ct-research',    srcContract.research_allowance||0);
  setCTPayType('research',       _getPTSrc('research', srcContract.research_pay_type));
  setAmountVal('ct-site',        srcContract.site_allowance||0);
  setAmountVal('ct-skill',       srcContract.skill_allowance||0);
  setAmountVal('ct-license',     srcContract.license_allowance||0);
  setAmountVal('ct-communication',srcContract.communication_allowance||0);
  setCTPayType('communication',  _getPTSrc('communication', srcContract.communication_pay_type));
  setAmountVal('ct-fitness',     srcContract.fitness_allowance||0);
  setCTPayType('fitness',        _getPTSrc('fitness', srcContract.fitness_pay_type));
  setAmountVal('ct-self-dev',    srcContract.self_dev_allowance||0);
  setCTPayType('self_dev',       _getPTSrc('self_dev', srcContract.self_dev_pay_type));
  setAmountVal('ct-book',        srcContract.book_allowance||0);
  setCTPayType('book',           _getPTSrc('book', srcContract.book_pay_type));
  setAmountVal('ct-overseas',    srcContract.overseas_allowance||0);
  setCTPayType('overseas',       _getPTSrc('overseas', srcContract.overseas_pay_type));
  // 보육수당 복원
  setAmountVal('ct-childcare',   srcContract.childcare_allowance||0);
  { const _ccDep=document.getElementById('ct-childcare-dependents'); if(_ccDep) _ccDep.value=srcContract.childcare_dependents||0; }
  }
  document.getElementById('ct-note').value = '';
  calcContractSalary();

  document.getElementById('ct-title').textContent = '재계약 (신규 계약서)';
  // 재계약 모드: 이름·주민번호·성별은 잠금, 고용형태는 변경 가능
  _setEditNameCategoryLock(true, false);
  // _prevEditCategory를 현재 값으로 초기화 (모달 열릴 때 Alert 방지)
  _prevEditCategory = document.getElementById('ct-edit-em-category')?.value || '';
  // saveContract 재계약 플래그 저장
  _recontractEmpId = srcContract.employee_id;
  // 재계약 원본 계약 ID 저장 — openContractModal이 리셋한 _recontractSourceId를 복원
  // (저장 시 연속성 판정·renewed_from_id 페어링에 사용)
  _recontractSourceId = srcContract.id;

  // ── 재계약: 사원번호는 이전 계약의 것을 승계하지 않고 새로 추천 ──
  const _reconEmpNoEl = document.getElementById('ct-edit-em-empno');
  if(_reconEmpNoEl){
    _reconEmpNoEl.value = '';
    // 재계약 = 재입사: 새 사원번호 직접 입력 가능 (잠금 해제, 추천번호는 placeholder로 안내)
    _reconEmpNoEl.readOnly = false;
    _reconEmpNoEl.classList.remove('ct-input-locked-dark');
    _reconEmpNoEl.style.background = ''; // 인라인 회색 배경 제거 (잠금 스타일 잔재)
    const _empnoLockHintR = document.getElementById('ct-edit-empno-lock-hint');
    if(_empnoLockHintR) _empnoLockHintR.style.display = 'none';
    // 해당 고객사 내 사용 중인 사원번호 기준으로 추천 생성
    const _coId = srcContract.company_id;
    const _usedNos = new Set();
    for(const _e of (allEmployees||[])){
      if(_e.company_id === _coId && _e.employee_number){
        const _n = parseInt(_e.employee_number);
        if(!isNaN(_n)) _usedNos.add(_n);
      }
    }
    let _next = 1;
    while(_usedNos.has(_next)) _next++;
    _reconEmpNoEl.placeholder = '추천: ' + String(_next).padStart(4, '0');
  }
}
let _recontractEmpId = null;

// ─── 종료 플로우 ───
function doContractTerminate(){
  document.getElementById('ct-renew-panel').style.display = 'none';
  document.getElementById('ct-amend-panel').style.display = 'none';
  const tp = document.getElementById('ct-terminate-panel');
  tp.style.display = tp.style.display==='none' ? 'block' : 'none';
  if(tp.style.display==='block'){
    const c = allContracts.find(x=>x.id===editId.contract)||{};
    const dateEl = document.getElementById('ct-terminate-date');
    dateEl.value = c.terminate_date || fmtLocalDate(new Date());
    dateEl.disabled = false;

    // 사유 칩 초기화
    document.querySelectorAll('#ct-term-reason-chips .cft-reason-chip').forEach(ch => ch.classList.remove('selected'));
    const _termNoticeRow = document.getElementById('ct-term-notice-pay-row');
    const _termNoticeChk = document.getElementById('ct-term-notice-pay-chk');
    if(_termNoticeRow) _termNoticeRow.style.display = 'none';
    if(_termNoticeChk) _termNoticeChk.checked = false;
    // 해고예고수당 금액·안내 초기화 (이전 계약 잔재 방지)
    { const _tna = document.getElementById('ct-term-notice-pay-amount'); if(_tna) _tna.value = '0'; }
    { const _tni = document.getElementById('ct-term-notice-pay-info'); if(_tni){ _tni.style.display = 'none'; _tni.innerHTML = ''; } }

    // 액션 버튼 숨김
    ['ct-btn-amend','ct-btn-amend2','ct-btn-renew','ct-btn-renew2',
     'ct-btn-terminate','ct-btn-terminate2','ct-btn-recontract','ct-btn-recontract2',
     'ct-btn-fixed-terminate','ct-btn-fixed-terminate2',
     'ct-btn-amend-complete2','ct-btn-amend-cancel2',
     'ct-btn-renew-complete2','ct-btn-renew-cancel2'].forEach(bid=>{
      const el = document.getElementById(bid); if(el) el.style.display='none';
    });

    setTimeout(()=>tp.scrollIntoView({behavior:'smooth',block:'center'}),100);
  }
}
/** 퇴사 설정 모드 취소: 계약 조회 모드로 복귀 */
function cancelContractTerminate(){
  const cid = editId.contract;
  if(!cid) return;
  viewContract(cid);
}

async function confirmContractTerminate(){
  const termDate = document.getElementById('ct-terminate-date').value;
  if(!termDate) return toast('퇴사일을 선택하세요.','error');

  const c = allContracts.find(x=>x.id===editId.contract);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.','error');

  const emp = allEmployees.find(e=>e.id===c.employee_id);

  // 해지 사유 필수
  const selectedChip = document.querySelector('#ct-term-reason-chips .cft-reason-chip.selected');
  const reason = selectedChip ? selectedChip.textContent.trim() : '';
  if(!reason) return toast('해지 사유를 선택하세요.', 'error');

  // 해고예고수당
  const isDismissal  = selectedChip?.dataset?.type === 'dismissal';
  const noticePayChk = document.getElementById('ct-term-notice-pay-chk');
  const noticePayAmt = parseInt(document.getElementById('ct-term-notice-pay-amount')?.value || '0') || 0;

  const today = fmtLocalDate(new Date());

  // 계약 만료일(contract_end)보다 이후 날짜는 입력 불가
  if(c.contract_end && termDate >= c.contract_end){
    return toast(`퇴사예정일은 계약 만료일(${c.contract_end}) 이전이어야 합니다.`, 'error');
  }

  // P5: 갱신 페어 존재 시 경고 및 페어 해제
  if(typeof findPairContract === 'function'){
    const _existPair = findPairContract(c);
    if(_existPair){
      const _confirmed = confirm(
        `이 계약은 갱신 페어(${_existPair.employee_name || '알 수 없음'})와 연결되어 있습니다.\n` +
        `퇴사/해지 처리 시 페어 관계가 해제됩니다.\n계속 진행하시겠습니까?`
      );
      if(!_confirmed) return;
      if(typeof breakPair === 'function') await breakPair(c);
    }
  }

  const newStatus = termDate < today ? CONTRACT_STATUS.TERMINATED : CONTRACT_STATUS.TERMINATE_PENDING;

  // confirm dialog
  const _confirmLines = [
    `[퇴사·해지 확정]`, ``,
    `직원: ${emp?.name||''} (${contractTypeLabel(c.contract_type)||''})`,
    `퇴사일: ${termDate}`,
    `해지 사유: ${reason}`,
  ];
  if(isDismissal && noticePayChk?.checked && noticePayAmt > 0){
    _confirmLines.push(``, `⚠️ 해고예고수당: ${noticePayAmt.toLocaleString('ko-KR')}원 (근로기준법 제26조)`);
  }
  _confirmLines.push(``, `이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?`);
  if(!confirm(_confirmLines.join('\n'))) return;

  // 계약 PATCH
  const patchBody = { terminate_date: termDate, status: newStatus, close_reason: isDismissal ? 'dismissal' : 'resignation' };
  if(isDismissal && noticePayChk?.checked && noticePayAmt > 0){
    patchBody.dismissal_notice_pay = noticePayAmt;
    patchBody.dismissal_notice_pay_reason = `해고 (${reason}) — 근로기준법 제26조`;
  }
  await api(`../tables/contracts/${c.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(patchBody)});

  // 퇴사일 → 직원 기록 업데이트
  if(emp){
    const empPatch = newStatus === CONTRACT_STATUS.TERMINATED
      ? {status: EMP_STATUS.RESIGNED, resign_date: termDate}
      : {resign_date: termDate};  // 예정만 기록, 재직 상태 유지
    await api(`../tables/employees/${emp.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(empPatch)});
  }

  // 인앱 알림 발송 (비동기, 실패해도 무시)
  try {
    const _tCo  = allCompanies.find(x => x.id === c.company_id) || {};
    const _coRep = getCompanyRepGreeting(_tCo);
    const _fmtD  = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
    const _isTerminated = newStatus === CONTRACT_STATUS.TERMINATED;
    const _noticePayNote = (isDismissal && noticePayAmt > 0)
      ? `\n⚠️ 해고예고수당: ${noticePayAmt.toLocaleString('ko-KR')}원 (근로기준법 제26조)` +
        `\n※ 해고사유서면통지서를 근로자에게 직접 교부하셔야 합니다 (근로기준법 제27조).\n`
      : (isDismissal
        ? `\n※ 해고사유서면통지서를 근로자에게 직접 교부하셔야 합니다 (근로기준법 제27조).\n`
        : '');
    const _actionGuide = _isTerminated
      ? `\n※ 퇴직금 정산, 4대보험 상실신고 등 후속 조치를 진행해 주시기 바랍니다.`
      : `\n※ 해지예정일 전까지 해지를 철회하실 수 있습니다. 해지예정일이 도래하면 계약이 자동 해지됩니다.`;
    await _sendCompanyNotice({
      companyId  : c.company_id, companyName: _tCo.company_name || '',
      noticeType : _isTerminated ? 'contract_terminated' : 'contract_terminate_scheduled',
      title      : `[${_isTerminated ? '계약 해지' : '해지 예정'}] ${emp?.name||''} — 근로계약이 ${_isTerminated ? '해지되었습니다' : '해지 예정 처리되었습니다'}`,
      body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 ${_isTerminated ? '해지 처리' : '해지 예정 처리'}되었습니다.

■ 근로자: ${emp?.name||''}
■ 고용형태: ${contractTypeLabel(c.contract_type)||''}
■ 계약 시작일: ${_fmtD(c.contract_start)}
${c.contract_end ? `■ 계약 만료일: ${_fmtD(c.contract_end)}` : ''}
■ 해지 사유: ${reason}
■ ${_isTerminated ? '퇴사일' : '해지 예정일'}: ${_fmtD(termDate)}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}
${_noticePayNote}${_actionGuide}`,
      contractId  : c.id,
      employeeId  : c.employee_id, employeeName: emp?.name||'',
      contractId  : c.id,
      employeeId  : c.employee_id, employeeName: emp?.name||'',
      contractEnd : c.contract_end || '',
    });
  } catch(_){ /* ignore */ }

  closeModal('contract-modal');
  await loadContracts(); await loadEmployees(); renderContracts(); renderDashboard();
  toast(`퇴사일(${termDate})이 설정됐습니다.`);
  _triggerWageLedgerRegen(c.company_id);
}

function editContract(id){
  // 조회 모드(ct-readonly)에서 수정 모드로 전환 시 readonly 클래스 제거
  const modalEl = document.querySelector('#contract-modal .modal');
  if(modalEl) modalEl.classList.remove('ct-readonly');
  openContractModal(id);
}

/** 임시저장 근로계약서 이어 작성: edit 모드 + 삭제버튼 표시 */
function continueDraftContract(id){
  const c = allContracts.find(x => x.id === id);
  if(!c || !c.is_draft) { editContract(id); return; }
  
  editContract(id);
  window._resumeDraftId = id;
  
  setTimeout(() => {
    // 비동기 경합 가드: 대기 중 다른 모달(신규 작성 등)이 열렸으면 이어쓰기 UI 복원 금지
    if(window._resumeDraftId !== id) return;
    document.getElementById('ct-title').textContent = '근로계약서 추가 (이어 작성)';
    const draftBtn = document.getElementById('ct-btn-draft');
    if(draftBtn) draftBtn.style.display = '';
    const delBtn = document.getElementById('ct-btn-delete-draft');
    if(delBtn) delBtn.style.display = '';
  }, 200);
}

/** 임시저장 계약서 모달에서 삭제 */
async function deleteDraftContract(){
  const id = window._resumeDraftId || editId.contract;
  if(!id) return;
  const c = allContracts.find(x => x.id === id);
  if(!c?.is_draft) return;
  const emp = allEmployees.find(e => e.id === c.employee_id);
  const label = emp?.name || '(직원 미지정)';
  if(!confirm(`'${label}' 임시저장 계약서를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
  try {
    // 계약 삭제 + 연결 직원 정리
    let _empIdToCleanup = null;
    if(c.employee_id){
      const otherContracts = allContracts.filter(x => x.id !== id && x.employee_id === c.employee_id);
      if(otherContracts.length === 0) _empIdToCleanup = c.employee_id;
    }
    await api(`../tables/contracts/${id}`, { method: 'DELETE' });
    if(_empIdToCleanup){
      fetch(`../tables/employees/${_empIdToCleanup}`, { method: 'DELETE' }).finally(() => loadEmployees());
    }
    toast('임시저장 계약서가 삭제되었습니다.', 'success');
    closeModal('contract-modal');
    await loadContracts();
    renderContracts();
    if(typeof renderDraftAlerts === 'function') renderDraftAlerts();
    if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
    if(typeof renderDashboard === 'function') renderDashboard();
    window._resumeDraftId = null;
  } catch(e){
    toast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

/**
 * 서류미비 계약에서 호출: 계약조건 입력 모달을 열고
 * contract-preview-modal의 '날인본 업로드' 탭으로 바로 이동한다.
 * - 대시보드·근로계약 관리·급여 입력 서류미비 배너에서 공통 사용
 */
function openContractForUpload(contractId){
  if(!contractId) return;
  const c = allContracts.find(x => x.id === contractId);
  if(!c) return;
  window._cpUploadOnly = true;
  openContractModal(contractId);            // 데이터 채우기
  requestAnimationFrame(() => {
    closeModal('contract-modal');           // 수정 모달 숨김
    _renderCpExistingFiles(c);             // 기존 계약 파일 섹션 렌더링
    document.getElementById('contract-preview-modal').classList.add('open');
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

  // 이미 열려있으면 토글로 닫기 (액션 버튼 복구)
  if(isOpen){
    panel.style.display = 'none';
    const _cid = editId?.contract;
    if(_cid) viewContract(_cid);
    return;
  }

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
  const confirmBtn    = document.getElementById('ct-cft-confirm-btn');
  if(noteEl)       noteEl.value = '';
  if(hintEl)       hintEl.innerHTML = '';
  if(confirmBtn)   confirmBtn.disabled = true;

  // 사유 칩 선택 초기화
  document.querySelectorAll('.cft-reason-chip').forEach(ch => ch.classList.remove('selected'));

  // 해고예고수당 상태 초기화 (이전 계약 잔재 방지)
  { const _nr = document.getElementById('cft-notice-pay-row');   if(_nr) _nr.style.display = 'none'; }
  { const _nc = document.getElementById('cft-notice-pay-chk');   if(_nc) _nc.checked = false; }
  { const _na = document.getElementById('cft-notice-pay-amount'); if(_na) _na.value = '0'; }
  { const _ni = document.getElementById('cft-notice-pay-info');  if(_ni){ _ni.style.display = 'none'; _ni.innerHTML = ''; } }

  // 패널 열기 + 스크롤
  panel.style.display = 'block';
  setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'center' }), 100);

  // 액션 버튼 숨김 (상단·하단: 수정 및 재발행 / 갱신 / 퇴사·해지 설정)
  ['ct-btn-amend','ct-btn-amend2','ct-btn-renew','ct-btn-renew2',
   'ct-btn-terminate','ct-btn-terminate2','ct-btn-recontract','ct-btn-recontract2',
   'ct-btn-fixed-terminate','ct-btn-fixed-terminate2',
   'ct-btn-amend-complete2','ct-btn-amend-cancel2',
   'ct-btn-renew-complete2','ct-btn-renew-cancel2'].forEach(bid=>{
    const el = document.getElementById(bid); if(el) el.style.display='none';
  });

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
  const today      = fmtLocalDate(new Date());
  const termDate   = (document.getElementById('ct-fixed-terminate-date') || {}).value || '';
  const hintEl     = document.getElementById('ct-cft-date-hint');
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');

  // 입력 없으면 초기화
  if(!termDate){
    if(confirmBtn)   confirmBtn.disabled = true;
    if(hintEl)       hintEl.innerHTML = '';
    return;
  }

  // 계약 만료일(contract_end) 이상이면 오류
  if(c.contract_end && termDate >= c.contract_end){
    if(hintEl) hintEl.innerHTML =
      `<span style="color:#dc2626;">⚠ 계약 만료일(${c.contract_end}) 이전 날짜만 입력 가능합니다.</span>`;
    if(confirmBtn) confirmBtn.disabled = true;
    return;
  }

  // 계약 시작일보다 이전이면 오류
  if(c.contract_start && termDate < c.contract_start){
    if(hintEl) hintEl.innerHTML =
      `<span style="color:#dc2626;">⚠ 계약 시작일(${c.contract_start}) 이후 날짜만 입력 가능합니다.</span>`;
    if(confirmBtn) confirmBtn.disabled = true;
    return;
  }

  // 유효 — 상태 계산
  const isFuture   = termDate > today;
  const newStatus  = isFuture ? CONTRACT_STATUS.TERMINATE_PENDING : CONTRACT_STATUS.TERMINATED;

  // 날짜 힌트
  if(hintEl){
    const startLabel = c.contract_start ? `계약 시작: ${c.contract_start}` : '';
    const endLabel   = c.contract_end   ? `만료일: ${c.contract_end}`      : '';
    const labels     = [startLabel, endLabel].filter(Boolean).join(' · ');
    hintEl.innerHTML = labels
      ? `<span style="color:#6b7280;">${labels}</span>`
      : '';
  }

  // 확정 버튼 활성화
  if(confirmBtn) confirmBtn.disabled = false;
}

/**
 * 해고예고수당 계산 (근로기준법 제26조)
 * @returns {{ applicable: boolean, amount: number, tenureDays: number, noticeDays: number, reason: string }}
 */
function _calcDismissalNoticePay(contract, termDate){
  if(!contract || !termDate) return { applicable: false, amount: 0, tenureDays: 0, noticeDays: 0, reason: '' };
  const cStart  = contract.contract_start || '';
  const today   = fmtLocalDate(new Date());
  if(!cStart) return { applicable: false, amount: 0, tenureDays: 0, noticeDays: 0, reason: '입사일 정보 없음' };

  const hireDate = new Date(cStart);
  const termDateObj = new Date(termDate);
  const todayObj = new Date(today);
  if(isNaN(hireDate.getTime()) || isNaN(termDateObj.getTime())) return { applicable: false, amount: 0, tenureDays: 0, noticeDays: 0, reason: '' };

  const tenureDays = Math.ceil((todayObj - hireDate) / (1000 * 60 * 60 * 24));
  const noticeDays = Math.ceil((termDateObj - todayObj) / (1000 * 60 * 60 * 24));

  // 3개월(90일) 미만 근속 → 해고예고 면제
  if(tenureDays < 90) return { applicable: false, amount: 0, tenureDays, noticeDays, reason: `근속 ${tenureDays}일 (3개월 미만 → 해고예고 면제)` };

  // 30일 이상 전 예고 → 수당 없음
  if(noticeDays >= 30) return { applicable: false, amount: 0, tenureDays, noticeDays, reason: `${noticeDays}일 전 예고 (30일 이상 → 해고예고수당 면제)` };

  // 해고예고수당 = 통상시급 × 8h × 30일
  const hw  = parseFloat(contract.hourly_wage) || 0;
  const hpd = parseFloat(contract.work_hours_per_day) || 8;
  const amount = Math.round(hw * hpd * 30);

  return {
    applicable: true,
    amount,
    tenureDays,
    noticeDays,
    reason: `근속 ${tenureDays}일, 예고 ${noticeDays}일 (30일 미달 → 해고예고수당 발생)`
  };
}

/**
 * 해지 사유 칩 선택 / 토글 (ct-fixed-terminate-panel)
 */
function _cftSelectReason(el, reason){
  const isAlreadySelected = el.classList.contains('selected');
  document.querySelectorAll('#cft-reason-chips .cft-reason-chip').forEach(ch => ch.classList.remove('selected'));
  if(!isAlreadySelected) el.classList.add('selected');

  // 해고 선택 시 해고예고수당 행 표시
  const isDismissal = el.dataset.type === 'dismissal';
  const noticeRow = document.getElementById('cft-notice-pay-row');
  if(noticeRow) noticeRow.style.display = isDismissal ? '' : 'none';
  if(!isDismissal){
    const chk = document.getElementById('cft-notice-pay-chk');
    if(chk) chk.checked = false;
    _cftRefreshNoticePay();
  }
}

/** 해고예고수당 체크박스 변경 시 정보 갱신 */
function _cftRefreshNoticePay(){
  const chk = document.getElementById('cft-notice-pay-chk');
  const infoEl = document.getElementById('cft-notice-pay-info');
  const amountEl = document.getElementById('cft-notice-pay-amount');
  const checked = chk?.checked || false;
  if(infoEl) infoEl.style.display = checked ? '' : 'none';
  if(!checked){ if(amountEl) amountEl.value = '0'; return; }

  const c = allContracts.find(x => x.id === editId.contract) || {};
  const termDate = document.getElementById('ct-fixed-terminate-date')?.value || '';
  const result = _calcDismissalNoticePay(c, termDate);

  if(amountEl) amountEl.value = result.amount;
  if(infoEl){
    if(result.applicable){
      const hw = parseFloat(c.hourly_wage) || 0;
      infoEl.innerHTML =
        `<div>· 근속기간: ${result.tenureDays}일 (${Math.floor(result.tenureDays/30)}개월)</div>` +
        `<div>· 해지 예고일: ${result.noticeDays}일 전</div>` +
        `<div>· 통상시급: ${hw.toLocaleString('ko-KR')}원 × 8h × 30일</div>` +
        `<div style="margin-top:4px;font-weight:700;">· 해고예고수당: <span style="color:#dc2626;">${result.amount.toLocaleString('ko-KR')}원</span></div>`;
    } else {
      infoEl.innerHTML = `<div>· ${result.reason}</div>`;
    }
  }
}

/** ct-terminate-panel 사유 칩 선택 */
function _ctTermSelectReason(el, reason){
  const isAlreadySelected = el.classList.contains('selected');
  document.querySelectorAll('#ct-term-reason-chips .cft-reason-chip').forEach(ch => ch.classList.remove('selected'));
  if(!isAlreadySelected) el.classList.add('selected');

  const isDismissal = el.dataset.type === 'dismissal';
  const noticeRow = document.getElementById('ct-term-notice-pay-row');
  if(noticeRow) noticeRow.style.display = isDismissal ? '' : 'none';
  if(!isDismissal){
    const chk = document.getElementById('ct-term-notice-pay-chk');
    if(chk) chk.checked = false;
    _ctTermRefreshNoticePay();
  }
}

/** ct-terminate-panel 해고예고수당 체크박스 변경 */
function _ctTermRefreshNoticePay(){
  const chk = document.getElementById('ct-term-notice-pay-chk');
  const infoEl = document.getElementById('ct-term-notice-pay-info');
  const amountEl = document.getElementById('ct-term-notice-pay-amount');
  const checked = chk?.checked || false;
  if(infoEl) infoEl.style.display = checked ? '' : 'none';
  if(!checked){ if(amountEl) amountEl.value = '0'; return; }

  const c = allContracts.find(x => x.id === editId.contract) || {};
  const termDate = document.getElementById('ct-terminate-date')?.value || '';
  const result = _calcDismissalNoticePay(c, termDate);

  if(amountEl) amountEl.value = result.amount;
  if(infoEl){
    if(result.applicable){
      const hw = parseFloat(c.hourly_wage) || 0;
      infoEl.innerHTML =
        `<div>· 근속기간: ${result.tenureDays}일 (${Math.floor(result.tenureDays/30)}개월)</div>` +
        `<div>· 해지 예고일: ${result.noticeDays}일 전</div>` +
        `<div>· 통상시급: ${hw.toLocaleString('ko-KR')}원 × 8h × 30일</div>` +
        `<div style="margin-top:4px;font-weight:700;">· 해고예고수당: <span style="color:#dc2626;">${result.amount.toLocaleString('ko-KR')}원</span></div>`;
    } else {
      infoEl.innerHTML = `<div>· ${result.reason}</div>`;
    }
  }
}

/**
 * 해지 설정 패널 닫기 + 입력 초기화
 */
function _cftClose(){
  const panel = document.getElementById('ct-fixed-terminate-panel');
  if(panel) panel.style.display = 'none';

  // 폼 초기화
  const dateEl     = document.getElementById('ct-fixed-terminate-date');
  const noteEl     = document.getElementById('ct-fixed-terminate-note');
  const hintEl     = document.getElementById('ct-cft-date-hint');
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');
  const noticeRow  = document.getElementById('cft-notice-pay-row');
  const noticeChk  = document.getElementById('cft-notice-pay-chk');
  if(dateEl)     dateEl.value = '';
  if(noteEl)     noteEl.value = '';
  if(hintEl)     hintEl.innerHTML = '';
  if(confirmBtn) confirmBtn.disabled = true;
  if(noticeRow)  noticeRow.style.display = 'none';
  if(noticeChk)  noticeChk.checked = false;
  document.querySelectorAll('#cft-reason-chips .cft-reason-chip').forEach(ch => ch.classList.remove('selected'));

  // 액션 버튼(상단·하단) 복구 — 조회 모드 재렌더
  const _cid = editId?.contract;
  if(_cid) viewContract(_cid);
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

  const today = fmtLocalDate(new Date());

  // 만료일 이상 불가
  if(c.contract_end && termDate >= c.contract_end){
    return toast(`해지일은 계약 만료일(${c.contract_end}) 이전이어야 합니다.`, 'error');
  }
  // 시작일 이전 불가
  if(c.contract_start && termDate < c.contract_start){
    return toast(`해지일은 계약 시작일(${c.contract_start}) 이후이어야 합니다.`, 'error');
  }

  // ── 갱신 페어 존재 시 경고 및 페어 해제 ──
  if(typeof findPairContract === 'function'){
    const _existPair = findPairContract(c);
    if(_existPair){
      const _confirmed = confirm(
        `이 계약은 갱신 페어(${_existPair.employee_name || '알 수 없음'})와 연결되어 있습니다.\n` +
        `해지 처리 시 페어 관계가 해제됩니다.\n계속 진행하시겠습니까?`
      );
      if(!_confirmed) return;
      if(typeof breakPair === 'function') await breakPair(c);
    }
  }

  const selectedChip = document.querySelector('#cft-reason-chips .cft-reason-chip.selected');
  const reason       = selectedChip ? selectedChip.textContent.trim() : '';
  if(!reason) return toast('해지 사유를 선택하세요.', 'error');

  // 해고예고수당
  const isDismissal  = selectedChip?.dataset?.type === 'dismissal';
  const noticePayChk = document.getElementById('cft-notice-pay-chk');
  const noticePayAmt = parseInt(document.getElementById('cft-notice-pay-amount')?.value || '0') || 0;

  const noteInput    = (document.getElementById('ct-fixed-terminate-note') || {}).value || '';
  const note         = noteInput.trim();
  const newStatus    = termDate > today ? CONTRACT_STATUS.TERMINATE_PENDING : CONTRACT_STATUS.TERMINATED;

  // 기존 note에 사유/메모 추가
  const addendum = [reason, note].filter(Boolean).join(' — ');
  const finalNote = (c.note ? c.note + '\n' : '') + addendum;

  const emp    = allEmployees.find(e => e.id === c.employee_id) || {};
  const empName= emp.name || '(이름 없음)';

  // 사용자 확인 다이얼로그
  const confirmMsg = [
    `[계약 조기 해지 확정]`,
    ``,
    `직원: ${empName} (${contractTypeLabel(c.contract_type)||''})`,
    `해지일: ${termDate}`,
    `해지 사유: ${reason}`,
    note ? `메모: ${note}` : null,
  ];
  if(isDismissal && noticePayChk?.checked && noticePayAmt > 0){
    confirmMsg.push(``,
      `⚠️ 해고예고수당: ${noticePayAmt.toLocaleString('ko-KR')}원`,
      `(통상시급 ${(parseFloat(c.hourly_wage)||0).toLocaleString('ko-KR')}원 × 8h × 30일)`,
      `근거: 근로기준법 제26조`);
  }
  confirmMsg.push(``,
    newStatus === CONTRACT_STATUS.TERMINATED
      ? `⚠ 직원 상태가 "퇴직"으로 변경됩니다.`
      : `ℹ 해지 예정일 이후 실제 해지 처리가 필요합니다.`,
    ``,
    `이 작업은 되돌릴 수 없습니다. 진행하시겠습니까?`);

  if(!confirm(confirmMsg.filter(v => v !== null).join('\n'))) return;

  // 버튼 로딩 상태
  const confirmBtn = document.getElementById('ct-cft-confirm-btn');
  if(confirmBtn){ confirmBtn.disabled = true; confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리 중...'; }

  try{
    // 1) 계약 업데이트
    const patchBody = {
      terminate_date : termDate,
      status         : newStatus,
      note           : finalNote,
      close_reason   : isDismissal ? 'dismissal' : 'resignation'
    };
    // 해고예고수당 저장
    if(isDismissal && noticePayChk?.checked && noticePayAmt > 0){
      patchBody.dismissal_notice_pay = noticePayAmt;
      patchBody.dismissal_notice_pay_reason = `해고 (${reason}) — 근로기준법 제26조`;
    }
    await api(`../tables/contracts/${c.id}`, {
      method  : 'PATCH',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(patchBody)
    });

    // 2) 직원 업데이트
    if(emp.id){
      const empPatch = newStatus === CONTRACT_STATUS.TERMINATED
        ? { status: EMP_STATUS.RESIGNED, resign_date: termDate }
        : { resign_date: termDate };   // 해지예정: 재직 상태 유지, 날짜만 기록
      await api(`../tables/employees/${emp.id}`, {
        method  : 'PATCH',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(empPatch)
      });
    }

    // 3) 인앱 알림 발송 (비동기, 실패해도 무시)
    try {
      const _ftCo  = allCompanies.find(x => x.id === c.company_id) || {};
      const _coRep = getCompanyRepGreeting(_ftCo);
      const _fmtD  = d => { if(!d) return '-'; const [y,m,dd]=d.split('-'); return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`; };
      const _isTerminated = newStatus === CONTRACT_STATUS.TERMINATED;
      const _noticePayNote2 = (isDismissal && noticePayAmt > 0)
        ? `\n⚠️ 해고예고수당: ${noticePayAmt.toLocaleString('ko-KR')}원 (근로기준법 제26조)` +
          `\n※ 해고사유서면통지서를 근로자에게 직접 교부하셔야 합니다 (근로기준법 제27조).\n`
        : (isDismissal
          ? `\n※ 해고사유서면통지서를 근로자에게 직접 교부하셔야 합니다 (근로기준법 제27조).\n`
          : '');
      await _sendCompanyNotice({
        companyId  : c.company_id, companyName: _ftCo.company_name || '',
        noticeType : _isTerminated ? 'contract_terminated' : 'contract_terminate_scheduled',
        title      : `[${_isTerminated ? '계약 해지' : '해지 예정'}] ${empName} — 근로계약이 ${_isTerminated ? '해지되었습니다' : '해지 예정 처리되었습니다'}`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 ${_isTerminated ? '해지 처리' : '해지 예정 처리'}되었습니다.

■ 근로자: ${empName}
■ 고용형태: ${contractTypeLabel(c.contract_type)||''}
■ 해지 사유: ${reason}
■ ${_isTerminated ? '해지일' : '해지예정일'}: ${_fmtD(termDate)}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}${_noticePayNote2}

`,
        contractId  : c.id,
        employeeId  : c.employee_id, employeeName: empName,
        contractEnd : c.contract_end || '',
      });
    } catch(_){ /* ignore notice failure */ }

    // 4) 모달 닫기 및 데이터 갱신
    closeModal('contract-modal');
    await Promise.all([loadContracts(), loadEmployees()]);
    renderContracts();
    renderDashboard();

    const statusLabel = newStatus === CONTRACT_STATUS.TERMINATE_PENDING
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
  const activeEl = document.activeElement; // 포커스 보존

  // 직원 ID: 수정모드→기존 계약에서, 재계약→_recontractEmpId, 신규→아직 없음
  let empId = editId.contract
    ? (allContracts.find(x=>x.id===editId.contract)||{}).employee_id||''
    : (_recontractEmpId||'');

  // 신규이면서 직원 이름만 입력된 경우: 이름이라도 있으면 임시 저장 허용 (직원 생성 없이)
  // → 임시저장은 직원 생성 없이 계약 데이터만 저장한다
  //   (등록 시 신규 직원도 함께 저장됨)
  const isNew     = !editId.contract && !_recontractEmpId;
  const isEditMode = !!editId.contract;

  // ── 파기된 계약(수정재발행)은 편집 불가 ──
  if(isEditMode){
    const _origDraft = allContracts.find(x => x.id === editId.contract);
    if(_origDraft && _origDraft.is_voided_by_amend){
      toast('이 계약은 수정재발행으로 파기되어 편집할 수 없습니다.', 'error');
      return;
    }
  }

  // ── 신규 모드: 선택된 근로자 사용 (직원 등록은 인사관리대장에서 선행) ──
  const coId = document.getElementById('ct-company')?.value || '';
  let _isNewEmpForDraft = false;
  if(isNew && !empId){
    empId = _ctSelectedEmpId || '';
    if(!empId){
      toast('근로자(직원)를 선택해 주세요.', 'error');
      return;
    }
  }

  // ── 임시저장 최소 검증 ──
  if(!empId){
    toast('직원 정보를 확인할 수 없습니다. 이름을 입력해 주세요.', 'error');
    return;
  }

  // ── 통상시급 최저임금 하한 차단 (값이 입력된 경우만) ──
  (function(){
    const _hwDraft = getAmountVal('ct-hourly-input') || 0;
    if(_hwDraft <= 0) return;
    const _startRawD = document.getElementById('ct-start')?.value || '';
    const _yrD = _startRawD ? parseInt(_startRawD.slice(0,4)) : new Date().getFullYear();
    const _minD = _getCTLegalMinWage(_yrD);
    if(_minD > 0 && _hwDraft < _minD){
      toast(`통상시급은 ${_yrD}년 법정 최저시급(${_minD.toLocaleString('ko-KR')}원) 이상이어야 합니다.`, 'error');
      throw new Error('MIN_WAGE_BELOW');
    }
  })();

  // 현재 입력값 수집 + 영문 정규화
  const _rawCatDraft = isEditMode
    ? (allContracts.find(x=>x.id===editId.contract)||{}).contract_type||CONTRACT_TYPE.REGULAR
    : (isNew ? _ctNewCat() : document.getElementById('ct-type').value);
  const catForDraft = CONTRACT_TYPE_LEGACY_MAP[_rawCatDraft] || _rawCatDraft;
  const isDailyDraft = catForDraft ===CONTRACT_TYPE.DAILY;
  const isRegDraft   = catForDraft ===CONTRACT_TYPE.REGULAR || catForDraft ===CONTRACT_TYPE.REGULAR_PROBATION;

  const scheduleJSON = getScheduleJSON();
  const workDays = parseInt(document.getElementById('ct-days').value)||0;
  const avgHours = parseFloat(document.getElementById('ct-hours').value)||0;

  // 계약 시작일: 신규/수정 공통 ct-start 참조
  const contractStart = document.getElementById('ct-start')?.value || '';
  const contractEnd = document.getElementById('ct-end')?.value || '';

  // 정규직(수습 제외)은 계약 종료일을 항상 빈 값으로 강제
  const isRegNoProbDraft = catForDraft === CONTRACT_TYPE.REGULAR;
  const finalContractEnd = isRegNoProbDraft ? '' : contractEnd;

  // ── 정규직 전환 의무 검사 (임시저장 시에도 적용) ──
  const TARGET_TYPES_DRAFT = ['fixed_term', 'fixed_probation', 'fixed_term_probation', 'regular_probation', 'daily'];
  if(TARGET_TYPES_DRAFT.includes(catForDraft) && finalContractEnd){
    const _hireDraft = document.getElementById('ct-edit-em-hire')?.value || '';
    if(_hireDraft){
      const _hireDt = new Date(_hireDraft);
      const _endDt  = new Date(finalContractEnd);
      if(!isNaN(_hireDt.getTime()) && !isNaN(_endDt.getTime())){
        const _daysFromHire = Math.ceil((_endDt - _hireDt) / (1000 * 60 * 60 * 24));
        if(_daysFromHire > 730){
          const _maxEnd = new Date(_hireDt);
          _maxEnd.setDate(_maxEnd.getDate() + 730);
          const _maxEndStr = _maxEnd.toISOString().slice(0, 10);
          toast(`입사일로부터 730일을 초과하면 정규직 전환 의무 대상이 됩니다. 계약 종료일을 ${_maxEndStr} 이내로 설정하세요.`, 'error');
          return;
        }
      }
    }
  }

  const baseDraft       = getAmountVal('ct-base')||0;
  const annualDraft     = getAmountVal('ct-annual-sal')||0;
  const dailyDraft      = getAmountVal('ct-daily-wage')||0;
  const fixedOtDr       = getAmountVal('ct-fixed-ot-pay')||0;
  const fixedNgtDr      = getAmountVal('ct-fixed-night-pay')||0;
  const fixedHolDr      = getAmountVal('ct-fixed-hol-pay')||0;
  const fixedExtraDr    = fixedOtDr + fixedNgtDr + fixedHolDr;
  // 통상임금 설정 그룹 (주휴수당 계산용)
  const _ordinaryDraft  = (_isFixedAllow('site')? getAmountVal('ct-site') : 0)
    + (_isFixedAllow('position')? getAmountVal('ct-position') : 0)
    + (_isFixedAllow('skill')? getAmountVal('ct-skill') : 0)
    + (_isFixedAllow('license')? getAmountVal('ct-license') : 0)
    + (_isFixedAllow('hazard')? getAmountVal('ct-hazard') : 0)
    + (_isFixedAllow('remote_area')? getAmountVal('ct-remote-area') : 0)
    + (typeof _getCustomOrdinarySum==='function' ? _getCustomOrdinarySum() : 0);
  const hourlyDraft     = getAmountVal('ct-hourly-input') || 0;
  const wkHolDraft      = (() => {
    if(isDailyDraft) return 0;
    if(hourlyDraft > 0){
      const _drHpd = parseFloat(document.getElementById('ct-hours')?.value) || 8;
      const _drMonthlyHolH = typeof _calcMonthlyHolHours === 'function'
        ? _calcMonthlyHolHours(_drHpd) : Math.round(_drHpd * 365 / 12 / 7);
      return Math.round(hourlyDraft * _drMonthlyHolH);
    }
    return Math.round((baseDraft + _ordinaryDraft + fixedExtraDr) / 5);
  })();
  const posDraft        = getAmountVal('ct-position')||0;
  const carDraft        = getAmountVal('ct-car')||0;
  const remoteAreaDraft = getAmountVal('ct-remote-area')||0;
  const mealDraft       = getAmountVal('ct-meal')||0;
  const researchDraft   = getAmountVal('ct-research')||0;
  const siteDraft       = getAmountVal('ct-site')||0;
  const skillDraft      = getAmountVal('ct-skill')||0;
  const licenseDraft    = getAmountVal('ct-license')||0;
  const hazardDraft     = getAmountVal('ct-hazard')||0;
  const commDraft       = getAmountVal('ct-communication')||0;
  const fitnessDraft    = getAmountVal('ct-fitness')||0;
  const selfDevDraft    = getAmountVal('ct-self-dev')||0;
  const bookDraft       = getAmountVal('ct-book')||0;
  const overseasDraft   = getAmountVal('ct-overseas')||0;
  // 임시저장: 통상임금 여부는 pay_type으로 판단
  const fixedGroupDr = (_isFixedAllow('car')           ? carDraft        : 0)
    + (_isFixedAllow('meal')          ? mealDraft       : 0)
    + (_isFixedAllow('research')      ? researchDraft   : 0)
    + (_isFixedAllow('communication') ? commDraft       : 0)
    + (_isFixedAllow('fitness')       ? fitnessDraft    : 0)
    + (_isFixedAllow('self_dev')      ? selfDevDraft    : 0)
    + (_isFixedAllow('book')          ? bookDraft       : 0)
    + (_isFixedAllow('overseas')      ? overseasDraft   : 0);
  const allAllowDraft   = _ordinaryDraft + fixedGroupDr;
  // 정규직: 연봉÷12, 그 외: 기본급+주휴+수당, 일용직: 0
  const monthlyDraft    = isDailyDraft ? 0
    : (isRegDraft && annualDraft > 0 ? Math.round(annualDraft / 12)
      : baseDraft + wkHolDraft + allAllowDraft);

  const draftBody = {
    employee_id:          empId||null,
    company_id:           coId,
    contract_start:       contractStart,
    contract_end:         finalContractEnd,
    contract_type:        catForDraft,
    status:               CONTRACT_STATUS.PENDING,  // is_draft:true 가 임시저장 식별자, status는 PENDING
    work_hours_per_day:   avgHours,
    work_days_per_week:   workDays,
    schedule_json:        JSON.stringify(scheduleJSON),
    annual_leave_days:    parseInt(document.getElementById('ct-annual').value)||15,
    pre_used_annual_leave:parseFloat(document.getElementById('ct-pre-used-annual')?.value)||0,
    annual_salary:        annualDraft,
    monthly_salary_agreed:monthlyDraft,
    base_salary:          isDailyDraft ? 0 : baseDraft,
    daily_wage:           isDailyDraft ? dailyDraft : 0,
    weekly_holiday_pay:   0,
    hourly_wage:          hourlyDraft,
    probation_months:      parseInt(document.getElementById('ct-probation-months')?.value)||0,
    probation_pct:         parseFloat(document.getElementById('ct-probation-pct')?.value)||0,
    probation_amt:         getAmountVal('ct-probation-amt')||0,
    probation_basis:       document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary',
    probation_end_date:    document.getElementById('ct-probation-end-date')?.value || null,
    position_allowance:      posDraft,
    transportation_allowance:carDraft,
    transportation_pay_type: _getCTPayTypeVal('car'),
    self_driving_allowance:  0,
    self_driving_pay_type:   _getCTPayTypeVal('car'),
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
    childcare_dependents:    parseInt(document.getElementById('ct-childcare-dependents')?.value||0)||0,
    childcare_pay_type:      _getCTPayTypeVal('childcare'),
    fixed_ot_pay:            getAmountVal('ct-fixed-ot-pay'),
    fixed_ot_hours:          typeof _weeklyToMonthlyHours==='function'?_weeklyToMonthlyHours('ct-fixed-ot-hours'):(parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0),
    fixed_night_pay:         getAmountVal('ct-fixed-night-pay'),
    fixed_night_hours:       typeof _weeklyToMonthlyHours==='function'?_weeklyToMonthlyHours('ct-fixed-night-hours'):(parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0),
    fixed_hol_pay:           getAmountVal('ct-fixed-hol-pay'),
    fixed_hol_hours:         typeof _weeklyToMonthlyHours==='function'?_weeklyToMonthlyHours('ct-fixed-hol-hours'):(parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0),
    insurance_employment: true,
    insurance_industrial: true,
    insurance_pension:    true,
    insurance_health:     true,
    note:                 document.getElementById('ct-note').value||'',
    salary_start_date:    (editId.contract || _recontractEmpId)
      ? (document.getElementById('ct-start')?.value || '')
      : (document.getElementById('ct-start')?.value || document.getElementById('ct-edit-em-hire')?.value || ''),
    salary_end_date:      '',
    created_reason:       'new',
    is_draft:             true,
    draft_saved_at:       Date.now(),
  };

  // (직원이 이미 생성되었으므로 note에 직원명 별도 보관 불필요)
  let savedId;
  const bodyJSON = JSON.stringify(draftBody);

  // ── 고아 레코드 방지: 신규 직원 생성 실패 시 롤백 헬퍼 ──
  const _rollbackDraftEmp = async () => {
    if(_isNewEmpForDraft && empId){
      try { await api('../tables/employees/' + empId, { method: 'DELETE' }); await loadEmployees(); }
      catch(e2){ console.warn('[임시저장 직원 롤백 실패]', empId, e2); }
    }
  };

  try {
  if(isEditMode){
    // 기존 계약 수정 중 임시저장 → PATCH (신규 직원 생성 없음, 롤백 불필요)
    draftBody.id = editId.contract;
    const res = await api(`../tables/contracts/${editId.contract}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:bodyJSON});
    if(res && res.error){ toast('임시저장 실패: ' + res.error, 'error'); return; }
    savedId = editId.contract;
  } else if(editId.contract == null && (_currentDraftId || window._resumeDraftId)){
    // 이전 임시저장 ID가 있으면 덮어쓰기
    const draftId = window._resumeDraftId || _currentDraftId;
    draftBody.id = draftId;
    const res = await api(`../tables/contracts/${draftId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:bodyJSON});
    if(res && res.error){ await _rollbackDraftEmp(); toast('임시저장 실패: ' + res.error, 'error'); return; }
    savedId = draftId;
    _currentDraftId = draftId;
    window._resumeDraftId = null;
  } else {
    // 최초 임시저장 → POST (ID는 서버에서 UUID 생성) — 실패 시 신규 직원 롤백
    delete draftBody.id;
    const res = await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:bodyJSON});
    if(res && res.error){ await _rollbackDraftEmp(); console.error('[saveDraftContract] Server error:', res.error); toast('임시저장 실패: ' + res.error, 'error'); return; }
    savedId = res.id;
    _currentDraftId = savedId;
  }
  } catch(e){
    console.error('[saveDraftContract] Exception:', e);
    await _rollbackDraftEmp();
    toast('임시저장 중 오류가 발생했습니다.', 'error');
    return;
  }

  await loadContracts();
  // 경량 배너만 갱신 (전체 테이블 재렌더링 X — 폼 깜빡임 방지)
  if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
  if(typeof renderDraftAlerts === 'function') renderDraftAlerts();
  if(typeof updateMenuBadges === 'function') updateMenuBadges();

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
  // 포커스 복원
  if(activeEl && typeof activeEl.focus === 'function'){
    setTimeout(() => { try { activeEl.focus(); } catch(e) {} }, 100);
  }
} // saveDraftContract

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
  if([1,3,5,7].includes(n)) return 'male';
  if([2,4,6,8].includes(n)) return 'female';
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
  let hint = el.parentElement.querySelector('.id-format-hint');
  if(!hint){
    hint = document.createElement('span');
    hint.className = 'id-format-hint ct-hint-normal';
    el.parentElement.appendChild(hint);
  }
  if(!val){
    hint.textContent = '';
    hint.className = 'id-format-hint ct-hint-normal';
    const _nhint = document.getElementById('ct-em-gender-hint');
    const _ehint = document.getElementById('ct-edit-em-gender-hint');
    if(_nhint && document.getElementById('ct-em-id') === el)
      { _nhint.textContent = ''; _nhint.className=''; }
    if(_ehint && document.getElementById('ct-edit-em-id') === el)
      { _ehint.textContent = ''; _ehint.className=''; }
  } else {
    const { ok, msg } = _validateIdNumber(val);
    if(ok){
      hint.textContent = '✓ 형식 확인';
      hint.className = 'id-format-hint ct-hint-success';
      const _gCode = val.replace(/-/g,'').slice(6,7);
      const _gender = _inferGender(_gCode);
      if(_gender){
        const _genderLabel = _gender === 'male' ? '남성' : '여성';
        const _newGenderEl = document.getElementById('ct-em-gender');
        if(_newGenderEl && document.getElementById('ct-em-id') === el){
          _newGenderEl.value = _gender;
          const _newHint = document.getElementById('ct-em-gender-hint');
          if(_newHint){ _newHint.textContent = _genderLabel + ' (자동 설정)'; _newHint.className='ct-hint-success'; }
        }
        const _editGenderEl = document.getElementById('ct-edit-em-gender');
        if(_editGenderEl && document.getElementById('ct-edit-em-id') === el){
          _editGenderEl.value = _gender;
          let _editHint = document.getElementById('ct-edit-em-gender-hint');
          if(!_editHint){
            _editHint = document.createElement('span');
            _editHint.id = 'ct-edit-em-gender-hint';
            _editHint.style.cssText = 'font-size:11px;margin-top:3px;display:block;';
            _editGenderEl.parentElement.appendChild(_editHint);
          }
          _editHint.textContent = _genderLabel + ' (자동 설정)';
          _editHint.className = 'ct-hint-success';
        }
      }
    } else if(val.replace(/[^0-9]/g,'').length < 7){
      const digits = val.replace(/[^0-9]/g,'');
      hint.textContent = digits.length < 6
        ? `생년월일 ${6-digits.length}자리 더 입력`
        : '하이픈(-) 뒤 성별코드(1~8) 입력';
      hint.className = 'id-format-hint ct-hint-normal';
    } else {
      hint.textContent = '✗ ' + msg;
      hint.className = 'id-format-hint ct-hint-error';
    }
  }
  if(typeof checkBtnFn === 'function') checkBtnFn();
}

// ── 휴대전화번호 포맷·유효성 헬퍼 ──────────────────────────────────────────
/**
 * _formatPhoneInput(el)
 *  - 숫자만 추출 → 최대 11자리
 *  - 010-XXXX-XXXX 형식으로 자동 하이픈 삽입
 */
function _formatPhoneInput(el){
  const sel  = el.selectionStart;
  const prev = el.value;
  const digits = prev.replace(/[^0-9]/g, '').slice(0, 11);
  let next = '';
  let cursorAdj = 0;

  if(digits.length <= 3){
    next = digits;
  } else if(digits.length <= 7){
    next = digits.slice(0,3) + '-' + digits.slice(3);
    if(!prev.includes('-')) cursorAdj = 1;
  } else {
    next = digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7);
    // 하이픈 개수 차이만큼 커서 보정
    const prevHyphens = (prev.match(/-/g)||[]).length;
    const nextHyphens = (next.match(/-/g)||[]).length;
    cursorAdj = nextHyphens - prevHyphens;
  }

  if(next !== prev){
    el.value = next;
    const newPos = Math.min(Math.max(0, sel + cursorAdj), next.length);
    el.setSelectionRange(newPos, newPos);
  }
}

/**
 * _validatePhoneNumber(val)
 *  - 010으로 시작하는 11자리(하이픈 제외) 번호인지 검사
 *  반환: { ok: boolean, msg: string }
 */
function _validatePhoneNumber(val){
  if(!val || !val.trim()) return { ok: false, msg: '휴대전화번호를 입력해 주세요.' };
  const digits = val.replace(/[^0-9]/g, '');
  if(digits.length !== 11)
    return { ok: false, msg: '휴대전화번호는 11자리여야 합니다 (현재 '+digits.length+'자리).' };
  if(!digits.startsWith('010'))
    return { ok: false, msg: '휴대전화번호는 010으로 시작해야 합니다.' };
  // 010 다음 8자리: 두 번째 자리는 1~9 (통신사 식별번호)
  const secondPart = digits.slice(3);
  if(!/^\d{8}$/.test(secondPart))
    return { ok: false, msg: '휴대전화번호 뒷 8자리가 올바르지 않습니다.' };
  return { ok: true, msg: '' };
}

/**
 * _onPhoneInput(el, checkBtnFn)
 *  휴대전화번호 입력 필드 oninput 핸들러
 *  1) 자동 포맷 적용
 *  2) 인라인 오류 힌트 표시/제거
 *  3) 버튼 상태 갱신 콜백 호출
 */
function _onPhoneInput(el, checkBtnFn){
  _formatPhoneInput(el);
  const val = el.value;
  const fg = el.closest('.form-group') || el.parentElement;
  let hint = fg.querySelector('.phone-format-hint');
  if(!hint){
    hint = document.createElement('span');
    hint.className = 'phone-format-hint ct-hint-normal';
    fg.appendChild(hint);
  }
  if(!val){
    hint.textContent = '';
    hint.className = 'phone-format-hint ct-hint-normal';
    if(fg) fg.classList.remove('ct-field-error');
  } else {
    const digits = val.replace(/[^0-9]/g, '');
    const { ok, msg } = _validatePhoneNumber(val);
    if(ok){
      hint.textContent = '✓ 형식 확인';
      hint.className = 'phone-format-hint ct-hint-success';
      if(fg) fg.classList.remove('ct-field-error');
    } else if(digits.length < 11){
      hint.textContent = `${11-digits.length}자리 더 입력하세요`;
      hint.className = 'phone-format-hint ct-hint-normal';
    } else {
      hint.textContent = '✗ ' + msg;
      hint.className = 'phone-format-hint ct-hint-error';
    }
  }
  if(typeof checkBtnFn === 'function') checkBtnFn();
}

// ── 이메일 주소 포맷·유효성 헬퍼 (선택 입력) ──────────────────────────────
/**
 * _validateEmail(val)
 *  - 이메일 형식 검사 (간단한 RFC5322 기반)
 *  - 선택사항: 빈 값은 ok:true 반환
 */
function _validateEmail(val){
  if(!val || !val.trim()) return { ok: true, msg: '' };  // 선택 입력
  // 기본 이메일 패턴: x@y.z
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()))
    return { ok: false, msg: '올바른 이메일 주소 형식이 아닙니다 (예: example@email.com).' };
  return { ok: true, msg: '' };
}

/**
 * _onEmailInput(el)
 *  이메일 입력 필드 oninput 핸들러
 *  - 인라인 오류 힌트만 표시 (선택사항이므로 형식 검증만)
 */
function _onEmailInput(el){
  const val = el.value;
  let hint = el.parentElement.querySelector('.email-format-hint');
  if(!hint){
    hint = document.createElement('span');
    hint.className = 'email-format-hint ct-hint-normal';
    el.parentElement.appendChild(hint);
  }
  if(!val){
    hint.textContent = '';
    hint.className = 'email-format-hint ct-hint-normal';
  } else {
    const { ok, msg } = _validateEmail(val);
    if(ok){
      hint.textContent = '✓ 형식 확인';
      hint.className = 'email-format-hint ct-hint-success';
    } else {
      hint.textContent = '✗ ' + msg;
      hint.className = 'email-format-hint ct-hint-error';
    }
  }
}

// ── 필수 입력 유효성 검사 + 하이라이트 헬퍼 ──────────────────────────────
function _ctMarkError(fieldId, label, errors){
  const el = document.getElementById(fieldId);
  if(!el) return;
  const fg = el.closest('.form-group') || el.parentElement;
  if(fg) fg.classList.add('ct-field-error');
  // phone/email 포맷 힌트도 오류 메시지로 갱신
  const hint = fg?.querySelector('.phone-format-hint, .email-format-hint');
  if(hint){
    hint.textContent = '✗ ' + label;
    hint.className = (hint.className.includes('phone') ? 'phone-format-hint' : 'email-format-hint') + ' ct-hint-error';
  }
  errors.push(label);
}

function _ctShowErrors(errors){
  if(!errors.length) return;
  // 첫 번째 오류 필드로 포커스 이동 + 스크롤
  const firstError = document.querySelector('#contract-modal .ct-field-error');
  if(firstError){
    const input = firstError.querySelector('input, select, textarea');
    if(input){
      input.focus();
      input.scrollIntoView({ behavior:'smooth', block:'center' });
    } else {
      firstError.scrollIntoView({ behavior:'smooth', block:'center' });
    }
  }
}

/**
 * 계약시작연도 기준 법정 최저시급 반환 (해당 연도 없으면 최신 연도 폴백)
 * @param {number} year
 * @returns {number}
 */
function _getCTLegalMinWage(year){
  const list = _allMinimumWages || [];
  const mw = list.find(w => Number(w.year) === year)
    || list.slice().sort((a,b) => Number(b.year) - Number(a.year))[0];
  return mw ? Number(mw.hourly_wage) : 0;
}

function _ctValidate(){
  _ctClearErrors();
  const errors = [];
  const isNew     = !editId.contract && !_recontractEmpId;
  const isEditOrRecontract = !isNew;
  // ── 공통: 근무시간표 (일괄적용 또는 개별 입력 필수) ──
  const _schDays  = parseInt(document.getElementById('ct-days')?.value) || 0;
  const _schHours = parseFloat(document.getElementById('ct-hours')?.value) || 0;
  if(_schDays <= 0 || _schHours <= 0){
    _ctMarkError('ct-schedule-table', '근무시간표 (일괄적용 또는 요일별 입력)', errors);
  }

  // ── 공통: 보육수당 (통상임금 포함·매월 정기지급 시, 부양가족 1인 이상이면 월 지급액 필수) ──
  const _ccRow = document.getElementById('ct-row-childcare');
  if(_ccRow && _ccRow.style.display !== 'none' && _isFixedAllow('childcare')){
    const _ccDep = parseInt(document.getElementById('ct-childcare-dependents')?.value);
    if(isNaN(_ccDep) || _ccDep < 0)
      _ctMarkError('ct-childcare-dependents', '보육수당 부양가족 수', errors);
    if(_ccDep >= 1 && !getAmountVal('ct-childcare'))
      _ctMarkError('ct-childcare', '보육수당 월 지급액', errors);
  }

  // ── 공통: 회사 (모달 오픈 시 항상 설정됨) ──
  const coId = document.getElementById('ct-company')?.value || '';

  // ── 신규/재계약: 계약 시작일 역전 차단 — 이전 계약 만료/해지일보다 같거나 앞설 수 없음 ──
  // ── + 연속성 컨텍스트 (익영업일 이내 = 연속 → 입사일·사원번호 승계 면제 판정용) ──
  const _prevContCtx = ((isNew || _recontractEmpId) && typeof _ctGetPrevContractForContinuity === 'function')
    ? _ctGetPrevContractForContinuity() : null;
  const _startValCtx = document.getElementById('ct-start')?.value || '';
  const _nextBizCtx = (_prevContCtx && _prevContCtx.endDate && typeof _nextBusinessDay === 'function')
    ? _nextBusinessDay(_prevContCtx.endDate) : '';
  const _isContinuity = !!(_prevContCtx && _prevContCtx.endDate && _startValCtx > _prevContCtx.endDate && _nextBizCtx && _startValCtx <= _nextBizCtx);
  if(_prevContCtx && _prevContCtx.endDate && _startValCtx && _startValCtx <= _prevContCtx.endDate){
    _ctMarkError('ct-start', `계약 시작일은 이전 계약의 만료/해지일(${_prevContCtx.endDate.replace(/-/g, '.')})보다 이후여야 합니다.`, errors);
  }

  // ── 수정/재계약: 계약 시작일 ──
  if(isEditOrRecontract){
    const start = document.getElementById('ct-start')?.value || '';
    if(!start) _ctMarkError('ct-start', '계약 시작일', errors);
    // 계약 시작일은 입사일보다 이전일 수 없음
    (function(){
      const _hire = document.getElementById('ct-edit-em-hire')?.value;
      if(_hire && start && start < _hire){
        _ctMarkError('ct-start', '계약 시작일은 입사일보다 이전일 수 없습니다', errors);
      }
    })();
  }

  if(isNew){
    // ── 근로자 선택 필수 (Phase 2: 인사관리대장 기반) ──
    const _hasSelEmp = !!_ctSelectedEmpId;
    if(!_hasSelEmp){
      _ctMarkError('ct-emp-select-section', '근로자 선택', errors);
    }
    // ── 신규 직원 입력 필드 검증 — 선택된 근로자가 있으면 생략 (인사관리대장에서 이미 검증) ──
    if(!_hasSelEmp){
      const _empNoNewVal = document.getElementById('ct-em-empno')?.value?.trim() || '';
      if(!_empNoNewVal){
        _ctMarkError('ct-em-empno', '사원번호', errors);
      } else {
        const _coIdForEmpno = document.getElementById('ct-company')?.value || '';
        // 연속 계약: 이전 계약 사원번호 승계 시 동일인 중복 검사 면제
        const _isEmpNoInherited = _isContinuity && _prevContCtx && _prevContCtx.empNo === _empNoNewVal;
        if(!_isEmpNoInherited){
          const _empNoCheck = _validateEmpNoUniqueness(_empNoNewVal, _coIdForEmpno, null, null, null);
          if(!_empNoCheck.ok) {
            _ctMarkError('ct-em-empno', `사원번호 중복: ${_empNoCheck.msg}`, errors);
            _showEmpNoAlert(document.getElementById('ct-em-empno-alert'), _empNoCheck.msg, 'error');
          }
        }
      }
      if(!(document.getElementById('ct-em-name')?.value?.trim() || ''))
        _ctMarkError('ct-em-name', '이름', errors);
      (function(){
        const _idVal = document.getElementById('ct-em-id')?.value?.trim() || '';
        if(!_idVal){
          _ctMarkError('ct-em-id', '주민등록번호', errors);
        } else {
          const _idChk = _validateIdNumber(_idVal);
          if(!_idChk.ok) _ctMarkError('ct-em-id', '주민등록번호 형식 오류', errors);
        }
      })();
      if(!(document.getElementById('ct-em-job')?.value?.trim() || ''))
        _ctMarkError('ct-em-job', '담당업무', errors);
      if(!(document.getElementById('ct-em-address')?.value?.trim() || ''))
        _ctMarkError('ct-em-address', '주소', errors);
      (function(){
        const _phoneVal = document.getElementById('ct-em-phone')?.value?.trim() || '';
        if(!_phoneVal){
          _ctMarkError('ct-em-phone', '휴대전화', errors);
        } else {
          const _phoneChk = _validatePhoneNumber(_phoneVal);
          if(!_phoneChk.ok) _ctMarkError('ct-em-phone', '휴대전화 형식 오류', errors);
          else {
            // 휴대폰번호 중복 검사 (유효·예정 계약 기준)
            const _phoneDigits = _phoneVal.replace(/[^0-9]/g, '');
            const _newStart = document.getElementById('ct-start')?.value || '';
            const _newName = document.getElementById('ct-em-name')?.value?.trim() || '';
            const _newIdFront = document.getElementById('ct-em-id')?.value?.trim() || '';
            const _phoneUniq = _validatePhoneUniqueness(_phoneDigits, coId, null, _newStart, _newName, _newIdFront);
            if(!_phoneUniq.ok) _ctMarkError('ct-em-phone', _phoneUniq.msg, errors);
          }
        }
      })();
      (function(){
        const _emailVal = document.getElementById('ct-em-email')?.value?.trim() || '';
        if(_emailVal){
          const _emailChk = _validateEmail(_emailVal);
          if(!_emailChk.ok) _ctMarkError('ct-em-email', '이메일 형식 오류', errors);
        }
      })();
      if(!(document.getElementById('ct-em-category')?.value || ''))
        _ctMarkError('ct-em-category', '고용형태', errors);
    }

    if(!document.getElementById('ct-edit-em-hire')?.value)
      _ctMarkError('ct-edit-em-hire', '입사일', errors);
    if(!document.getElementById('ct-start')?.value)
      _ctMarkError('ct-start', '계약 시작일', errors);
    // 계약 시작일은 입사일보다 이전일 수 없음
    (function(){
      const _hire = document.getElementById('ct-edit-em-hire')?.value;
      const _start = document.getElementById('ct-start')?.value;
      if(_hire && _start && _start < _hire){
        _ctMarkError('ct-start', '계약 시작일은 입사일보다 이전일 수 없습니다', errors);
      }
    })();

    // ── 통상시급: 모든 고용형태 공통 필수 ──
    if(!getAmountVal('ct-hourly-input'))
      _ctMarkError('ct-hourly-input', '통상시급', errors);

    // ── 임금 관련 (고용형태 기준) ──
    const _newCat = _ctNewCat();
    const cat = CONTRACT_TYPE_LEGACY_MAP[_newCat] || _newCat;
    if(cat ===CONTRACT_TYPE.DAILY){
      if(!getAmountVal('ct-daily-wage'))
        _ctMarkError('ct-daily-wage', '일급여', errors);
    } else if(cat){
      // 정규직·정규직 수습·계약직·계약직 수습은 기본급이 자동계산이므로 필수 체크 제외
      if(cat !==CONTRACT_TYPE.REGULAR && cat !==CONTRACT_TYPE.REGULAR_PROBATION && cat !==CONTRACT_TYPE.FIXED && cat !==CONTRACT_TYPE.FIXED_PROBATION){
        if(!getAmountVal('ct-base'))
          _ctMarkError('ct-base', '기본급', errors);
      }
      if(cat === CONTRACT_TYPE.REGULAR){
        // 정규직: 시급 입력 시 연봉 자동계산, 시급 미입력 시 연봉 필수
        const _hwReg = getAmountVal('ct-hourly-input') || 0;
        if(_hwReg <= 0 && !getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '연봉 (또는 통상시급 입력)', errors);
      } else if(cat === CONTRACT_TYPE.REGULAR_PROBATION){
        // 정규직 수습: 시급 기반 자동계산 (연봉 불필요)
      } else if(cat === CONTRACT_TYPE.FIXED || cat === CONTRACT_TYPE.FIXED_PROBATION){
        // 계약직·계약직 수습: 시급 기반 자동계산 우선, 월약정급여는 선택
      }
    }
    // ── 계약직·계약직 수습·일용직: 계약 종료일(퇴사예정일) 필수 ──
    if(cat ===CONTRACT_TYPE.FIXED || cat ===CONTRACT_TYPE.FIXED_PROBATION || cat ===CONTRACT_TYPE.DAILY){
      if(!document.getElementById('ct-end')?.value)
        _ctMarkError('ct-end', '계약 종료일', errors);
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
      // 연속 계약: 이전 계약 사원번호 승계 시 동일인 중복 검사 면제
      const _isEditEmpNoInherited = _isContinuity && _prevContCtx && _prevContCtx.empNo === _empNoEditVal;
      if(!_isEditEmpNoInherited){
        const _editEmpNoCheck = _validateEmpNoUniqueness(_empNoEditVal, _coIdForEditEmpno, _editSelfEmpId, null, null);
        if(!_editEmpNoCheck.ok) {
          _ctMarkError('ct-edit-em-empno', `사원번호 중복: ${_editEmpNoCheck.msg}`, errors);
          _showEmpNoAlert(document.getElementById('ct-edit-em-empno-alert'), _editEmpNoCheck.msg, 'error');
        }
      }
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
    { const _hireRow = document.getElementById('ct-contract-hire-row');
      const _hireRowVisible = !_hireRow || _hireRow.style.display !== 'none';
      if(_hireRowVisible && !document.getElementById('ct-edit-em-hire')?.value)
        _ctMarkError('ct-edit-em-hire', '입사일', errors);
    }
    if(!document.getElementById('ct-edit-em-job')?.value.trim())
      _ctMarkError('ct-edit-em-job', '담당업무', errors);
    (function(){
      const _phoneValE = document.getElementById('ct-edit-em-phone')?.value.trim();
      if(!_phoneValE){
        _ctMarkError('ct-edit-em-phone', '휴대전화', errors);
      } else {
        const _phoneChkE = _validatePhoneNumber(_phoneValE);
        if(!_phoneChkE.ok) _ctMarkError('ct-edit-em-phone', '휴대전화 형식 오류', errors);
        else {
          // 휴대폰번호 중복 검사 (자기 자신 제외)
          const _phoneDigitsE = _phoneValE.replace(/[^0-9]/g, '');
          const _editEmpId = editId.contract
            ? (allContracts.find(c => c.id === editId.contract)?.employee_id || '')
            : '';
          const _newStartE = document.getElementById('ct-start')?.value || '';
          const _newNameE = document.getElementById('ct-edit-emp-name')?.value?.trim() || '';
          const _newIdFrontE = document.getElementById('ct-edit-em-id')?.value?.trim() || '';
          const _phoneUniqE = _validatePhoneUniqueness(_phoneDigitsE, coId, _editEmpId, _newStartE, _newNameE, _newIdFrontE);
          if(!_phoneUniqE.ok) _ctMarkError('ct-edit-em-phone', _phoneUniqE.msg, errors);
        }
      }
    })();
    (function(){
      const _emailValE = document.getElementById('ct-edit-em-email')?.value.trim();
      if(_emailValE){
        const _emailChkE = _validateEmail(_emailValE);
        if(!_emailChkE.ok) _ctMarkError('ct-edit-em-email', '이메일 형식 오류', errors);
      }
    })();
    if(!document.getElementById('ct-edit-em-address')?.value.trim())
      _ctMarkError('ct-edit-em-address', '주소', errors);

    // ── 통상시급: 모든 고용형태 공통 필수 ──
    if(!getAmountVal('ct-hourly-input'))
      _ctMarkError('ct-hourly-input', '통상시급', errors);

    // ── 수정/재계약: 임금 관련 ──
    const _rawCatForCheck = (document.getElementById('ct-edit-em-category')?.value)
      || (document.getElementById('ct-type')?.value) || CONTRACT_TYPE.REGULAR;
    const catForCheck = CONTRACT_TYPE_LEGACY_MAP[_rawCatForCheck] || _rawCatForCheck;
    if(catForCheck ===CONTRACT_TYPE.DAILY){
      if(!getAmountVal('ct-daily-wage'))
        _ctMarkError('ct-daily-wage', '일급여', errors);
    } else {
      // 정규직·정규직 수습·계약직·계약직 수습은 기본급이 자동계산이므로 필수 체크 제외
      if(catForCheck !==CONTRACT_TYPE.REGULAR && catForCheck !==CONTRACT_TYPE.REGULAR_PROBATION && catForCheck !==CONTRACT_TYPE.FIXED && catForCheck !==CONTRACT_TYPE.FIXED_PROBATION){
        if(!getAmountVal('ct-base'))
          _ctMarkError('ct-base', '기본급', errors);
      }
      if(catForCheck === CONTRACT_TYPE.REGULAR){
        // 정규직: 시급 입력 시 연봉 자동계산, 시급 미입력 시 연봉 필수
        const _hwReg2 = getAmountVal('ct-hourly-input') || 0;
        if(_hwReg2 <= 0 && !getAmountVal('ct-annual-sal'))
          _ctMarkError('ct-annual-sal', '연봉 (또는 통상시급 입력)', errors);
      } else if(catForCheck === CONTRACT_TYPE.REGULAR_PROBATION){
        // 정규직 수습: 시급 기반 자동계산 (연봉 불필요)
      } else if(catForCheck === CONTRACT_TYPE.FIXED || catForCheck === CONTRACT_TYPE.FIXED_PROBATION){
        // 계약직·계약직 수습: 시급 기반 자동계산 우선, 월약정급여는 선택
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

  // ── 통상시급 최저임금 하한 (계약시작연도 법정 최저시급 기준) ──
  (function(){
    const _hwVal = getAmountVal('ct-hourly-input') || 0;
    if(_hwVal <= 0) return; // 미입력은 위에서 필수 검증
    const _startRaw = document.getElementById('ct-start')?.value || '';
    const _yr = _startRaw ? parseInt(_startRaw.slice(0,4)) : new Date().getFullYear();
    const _min = _getCTLegalMinWage(_yr);
    if(_min > 0 && _hwVal < _min){
      _ctMarkError('ct-hourly-input',
        `통상시급은 ${_yr}년 법정 최저시급(${_min.toLocaleString('ko-KR')}원) 이상이어야 합니다`, errors);
    }
  })();

  // ── 계약기간 1개월 미만 위반 검사 (계약직·계약직 수습) ──
  const _shortTermRow = document.getElementById('ct-short-term-warning-row');
  const _editShortTermRow = document.getElementById('ct-edit-short-term-warning-row');
  if((_shortTermRow && _shortTermRow.style.display !== 'none') ||
     (_editShortTermRow && _editShortTermRow.style.display !== 'none'))
    errors.push('계약기간 1개월 미만 — 일용직으로 변경하거나 종료일을 조정해 주세요.');

  // ── 정규직 전환 의무 검사 (계약직·계약직 수습·정규직 수습·일용직) ──
  // ── 정규직 전환 의무 검사 (계약직·계약직 수습·정규직 수습·일용직) ──
  // 입사일로부터 730일을 초과하는 계약 종료일 설정 불가
  (function(){
    // 신규: 선택된 근로자 기준, 수정/재계약: ct-type (hidden)
    const _ctTypeRaw = isNew
      ? _ctNewCat()
      : (document.getElementById('ct-type')?.value || '');
    const _ctType = CONTRACT_TYPE_LEGACY_MAP[_ctTypeRaw] || _ctTypeRaw;
    const TARGET_TYPES = ['fixed_term', 'fixed_probation', 'fixed_term_probation', 'regular_probation', 'daily'];
    if(!TARGET_TYPES.includes(_ctType)) return;

    const _hireEl = document.getElementById('ct-edit-em-hire');
    const _hire = _hireEl?.value || '';
    if(!_hire) return;

    const _endEl = document.getElementById('ct-end');
    const _end = _endEl?.value || '';
    if(!_end) return;

    const hireDate = new Date(_hire);
    const endDate  = new Date(_end);
    if(isNaN(hireDate.getTime()) || isNaN(endDate.getTime())) return;

    const daysFromHire = Math.ceil((endDate - hireDate) / (1000 * 60 * 60 * 24));
    if(daysFromHire > 730){
      const maxEndDate = new Date(hireDate);
      maxEndDate.setDate(maxEndDate.getDate() + 730);
      const maxEndStr = maxEndDate.toISOString().slice(0, 10);
      _ctMarkError('ct-end',
        `입사일로부터 730일을 초과하면 정규직 전환 의무 대상이 됩니다. 계약 종료일을 ${maxEndStr} 이내로 설정하세요.`,
        errors);
    }
  })();

  // ── 급여 산정기간 필수 ──
  if(!document.getElementById('ct-pay-period')?.value.trim()){
    _ctMarkError('ct-pay-period-month', '급여 산정기간', errors);
  }

  // ── 급여지급일 필수 (근로계약 기준, 1~31) ──
  {
    const _payDayVal = parseInt(document.getElementById('ct-pay-day')?.value) || 0;
    if(_payDayVal < 1 || _payDayVal > 31){
      _ctMarkError('ct-pay-day', '급여지급일 (1~31)', errors);
    }
  }

  // ── 신규계약/재계약: 제3자정보제공동의서 필수 (Rule 9) ──
  if(isNew || _recontractEmpId){
    const _hasConsent = !!window._contractConsentFile
      || (editId.contract && !!(allContracts.find(c => c.id === editId.contract) || {}).consent_file_name);
    if(!_hasConsent){
      _ctMarkError('cp-consent-zone', '제3자정보제공동의서 (필수 첨부)', errors);
    }
  }

  if(errors.length){
    _ctShowErrors(errors);
    return true; // 오류 있음
  }
  return false;  // 통과
}

// ─────────────────────────────────────────────────────────────────────────────

async function saveContract(){
  // ── 필수 입력 일괄 검사 (하이라이트 + 배너) ──
  const _valResult = _ctValidate();
  if(_valResult) return;

  // 재계약 모드: _recontractEmpId 사용
  let empId = editId.contract ? (allContracts.find(x=>x.id===editId.contract)||{}).employee_id||'' : (_recontractEmpId||'');
  const coId = document.getElementById('ct-company').value;
  const start = (editId.contract||_recontractEmpId) ? document.getElementById('ct-start').value : '';
  const base  = getAmountVal('ct-base');
  const isEditMode = !!editId.contract;

  // ── 파기된 계약(수정재발행)은 편집 불가 ──
  if(isEditMode){
    const _origEdit = allContracts.find(x => x.id === editId.contract);
    if(_origEdit && _origEdit.is_voided_by_amend){
      toast('이 계약은 수정재발행으로 파기되어 편집할 수 없습니다.', 'error');
      return;
    }
  }

  // ── 신규 모드: 선택된 근로자 사용 (직원 등록은 인사관리대장에서 선행) ──
  let _isNewEmployee = false;
  if(!empId && !editId.contract && !_recontractEmpId){
    empId = _ctSelectedEmpId || '';
    if(!empId){
      toast('근로자(직원)를 선택해 주세요.', 'error');
      return;
    }
  }

  if(!empId) return saveDraftContract('직원 정보 누락');

  // ── 고아 레코드 방지 헬퍼: 신규 생성된 직원 삭제 ──
  const _cleanupNewEmployee = async () => {
    if(_isNewEmployee && empId){
      try { await api('../tables/employees/' + empId, { method: 'DELETE' }); await loadEmployees(); }
      catch(e){ console.warn('[직원 롤백 실패]', empId, e); }
    }
  };

  // 정규직 계열 여부 판단 (신규: 구분 선택값, 수정/재계약: 계약유형 select)
  // 고용형태는 인사정보(ct-edit-em-category) 기준으로 읽음
  const _rawCatForSave = editId.contract
    ? (document.getElementById('ct-edit-em-category')?.value||(allContracts.find(x=>x.id===editId.contract)||{}).contract_type||CONTRACT_TYPE.REGULAR)
    : (_recontractEmpId ? (document.getElementById('ct-edit-em-category')?.value||CONTRACT_TYPE.REGULAR) : _ctNewCat());
  const catForSave = CONTRACT_TYPE_LEGACY_MAP[_rawCatForSave] || _rawCatForSave;
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
    // 기본급 = 시급 × 209h (한국 표준, calcContractSalary와 동일)
    baseSalaryForSave = base;
    // 주휴수당 = 통상시급 × 월주휴시간(35h) [근로기준법 제55조] — 기본급에 포함, 참고용
    const _svMonthlyHolH = typeof _calcMonthlyHolHours === 'function'
      ? _calcMonthlyHolHours(hours) : Math.round(hours * 365 / 12 / 7);
    weeklyHol = hourlyWage > 0 ? Math.round(hourlyWage * _svMonthlyHolH) : 0;
    const fixedOt2    = getAmountVal('ct-fixed-ot-pay')    || 0;
    const fixedNgt2   = getAmountVal('ct-fixed-night-pay') || 0;
    const fixedHol2   = getAmountVal('ct-fixed-hol-pay')   || 0;
    const fixedExtra2 = fixedOt2 + fixedNgt2 + fixedHol2;
    const position2   = getAmountVal('ct-position');
    const car2        = getAmountVal('ct-car');
    const remoteArea2 = getAmountVal('ct-remote-area');
    const meal2       = getAmountVal('ct-meal');
    const research2   = getAmountVal('ct-research');
    const site2       = getAmountVal('ct-site')||0;
    const skill2      = getAmountVal('ct-skill')||0;
    const lic2        = getAmountVal('ct-license')||0;
    const hazard2     = getAmountVal('ct-hazard')||0;
    const comm2       = getAmountVal('ct-communication')||0;
    const fit2        = getAmountVal('ct-fitness')||0;
    const sdev2       = getAmountVal('ct-self-dev')||0;
    const book2       = getAmountVal('ct-book')||0;
    const ovseas2     = getAmountVal('ct-overseas')||0;
    // 통상임금 포함 고정 수당 (pay_type='fixed')
    const _ordinarySave2 = (_isFixedAllow('site')? site2 : 0)
      + (_isFixedAllow('position')? position2 : 0)
      + (_isFixedAllow('skill')? skill2 : 0)
      + (_isFixedAllow('license')? lic2 : 0)
      + (_isFixedAllow('hazard')? hazard2 : 0)
      + (_isFixedAllow('remote_area')? remoteArea2 : 0)
      + (typeof _getCustomOrdinarySum==='function' ? _getCustomOrdinarySum() : 0);
    // 통상임금 제외 고정 수당 (pay_type='fixed'이나 식대 등)
    const fixedGroup2 = (_isFixedAllow('car')           ? car2        : 0)
      + (_isFixedAllow('meal')          ? meal2       : 0)
      + (_isFixedAllow('research')      ? research2   : 0)
      + other2
      + (_isFixedAllow('communication') ? comm2       : 0)
      + (_isFixedAllow('fitness')       ? fit2        : 0)
      + (_isFixedAllow('self_dev')      ? sdev2       : 0)
      + (_isFixedAllow('book')          ? book2       : 0)
      + (_isFixedAllow('overseas')      ? ovseas2     : 0);
    const allAllow2 = _ordinarySave2 + fixedGroup2;
    // 월 약정임금 = 기본급(시급×209, 주휴포함) + 각종 수당 + 고정OT/야간/휴일
    // 주휴수당은 기본급에 이미 포함되어 있으므로 별도 합산하지 않음
    if(isFixedTermSave && annualSalInputSave > 0){
      monthly = annualSalInputSave;
    } else if(isRegularGroup && annual > 0){
      monthly = Math.round(annual / 12);
    } else {
      monthly = base + allAllow2 + fixedExtra2;
    }
  }

  // ── 최저임금 검증 ① 공용 경고 행 표시 중이면 즉시 차단 ──
  {
    const _gwRow = document.getElementById('ct-general-minwage-warning-row');
    if(_gwRow && _gwRow.style.display !== 'none'){
      openModal('ct-minwage-warn-modal');
      await _cleanupNewEmployee();
      return;
    }
  }

  // ── 최저임금 검증 ② 시급 계산 기반 검증 (비과세 수당 포함 월 환산시급 기준) ──
  {
    // 계약 시작 연도 결정 (신규/수정 공통 ct-start 참조)
    const _hireRaw = document.getElementById('ct-start')?.value;
    const _contractYear = _hireRaw ? parseInt(_hireRaw.slice(0,4)) : new Date().getFullYear();
    // 최저임금: 해당 연도 데이터가 없으면 최신 연도 데이터로 폴백
    const _mw = _allMinimumWages.find(w => Number(w.year) === _contractYear)
      || (_allMinimumWages||[]).sort((a,b)=>b.year-a.year)[0];

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
        await _cleanupNewEmployee();
        return; // 저장 차단
      }
    }
  }

  // 신규/재계약 모드: 계약시작일, 종료일, 유형, 상태 결정
  const isRecontract = !!_recontractEmpId && !editId.contract;
  const today3 = fmtLocalDate(new Date());
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
        autoStatus = CONTRACT_STATUS.TERMINATED;
      } else if(newEnd2 <= today3){
        // 현재 이전 날짜로 변경 → 즉시 해지 (계약 종료일 앞당김)
        autoStatus = CONTRACT_STATUS.TERMINATED;
      } else if(origEnd2 && newEnd2 > origEnd2){
        // 종료일 연장: 기존 계약 만료 + 새 계약 등록 정책 → 등록 차단 후 갱신 플로우 유도
        toast('계약 종료일을 연장하려면 [갱신] 버튼을 사용해 주세요.\n편집 저장으로는 종료일을 연장할 수 없습니다.', 'error');
        return;
      }
      // 그 외 (종료일 단축 but 미래): 기존 상태 유지, 종료일만 변경
    }
    contractStatus= autoStatus;
  } else if(isRecontract){
    contractStart = document.getElementById('ct-start').value;
    contractEnd   = document.getElementById('ct-end').value;
    contractType  = document.getElementById('ct-type').value;
    const today2  = fmtLocalDate(new Date());
    contractStatus= contractStart > today2 ? CONTRACT_STATUS.PENDING : CONTRACT_STATUS.ACTIVE;

    // ── 재계약 연속성 검사: 기존 계약 해지/만료일과 연속되면 계약 연장으로 처리 ──
    const _srcContract = allContracts.find(x => x.id === _recontractSourceId);
    const _srcEndDate = _srcContract?.terminate_date || _srcContract?.contract_end || '';
    if(_srcContract && _srcEndDate && contractStart && !_hasWeekdayGap(_srcEndDate, contractStart)){
      const _fmtOld = _srcEndDate.replace(/-/g, '.');
      const _fmtNew = contractStart.replace(/-/g, '.');
      const _empRecon = allEmployees.find(e => e.id === _srcContract.employee_id);
      const _oldHire = _empRecon?.hire_date || '';
      if(!confirm(
        `🔗 계약 연장 안내\n\n` +
        `기존 계약 종료일(${_fmtOld})과 신규 계약 시작일(${_fmtNew})이 연속되어\n` +
        `계약의 연장으로 처리됩니다.\n\n` +
        `• 입사일(${_oldHire.replace(/-/g, '.')})이 유지됩니다.\n` +
        `• 기존 계약과 새 계약이 페어로 관리됩니다.\n\n` +
        `계속 진행하시겠습니까?`
      )) return;
    }
  } else {
    // 신규 모드: ct-start(계약시작일) 전용 필드 사용. 없으면 ct-edit-em-hire 폴백(하위호환)
    contractStart = document.getElementById('ct-start')?.value
                 || document.getElementById('ct-edit-em-hire')?.value || '';
    contractEnd   = document.getElementById('ct-end')?.value || '';
    contractType  = document.getElementById('ct-em-category').value;
    const today2new = fmtLocalDate(new Date());
    contractStatus = contractStart > today2new ? CONTRACT_STATUS.PENDING : CONTRACT_STATUS.ACTIVE;
  }

  // ── 중복 활성 계약 방지: 신규/재계약 시 이미 활성 계약이 있으면 차단 ──
  if(contractStatus === CONTRACT_STATUS.ACTIVE && (!editId.contract || isRecontract)){
    const existingActive = allContracts.find(ac =>
      ac.employee_id === empId &&
      ac.id !== editId.contract &&
      ac.status === CONTRACT_STATUS.ACTIVE
    );
    if(existingActive){
      return toast(`이 직원에게 이미 활성 계약(${existingActive.id.substring(0,8)}...)이 존재합니다. 기존 계약을 해지·만료 처리하거나 갱신해 주세요.`, 'error');
    }
  }

  // ── contract_type / status 영문 정규화 ──
  contractType   = CONTRACT_TYPE_LEGACY_MAP[contractType]     || contractType;
  contractStatus = CONTRACT_STATUS_LEGACY_MAP[contractStatus] || contractStatus;

  // 정규직(수습 제외)은 계약 종료일을 항상 빈 값으로 강제 (기간의 정함 없음)
  // 정규직 수습은 수습기간 만료일이 계약 종료일이므로 contract_end 유지
  if(contractType === CONTRACT_TYPE.REGULAR) contractEnd = '';

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
  // 서류미비는 더 이상 상태값으로 저장하지 않음 (docsIncomplete 플래그로 관리)
  const _isTerminalStatus = CONTRACT_TERMINAL_STATUSES.includes(contractStatus);
  if(!_isTerminalStatus && !isEditMode){
    const _hasBothFiles = !!(signedFileData && consentFileData);
  } else if(isEditMode && !_isTerminalStatus){
    // 편집 모드: 파일 상태에 따라 status 변경하지 않음 (docsIncomplete 플래그로 관리)
    const _hasBothFilesEdit = !!(signedFileData && consentFileData);
  }

  const body={employee_id:empId,company_id:coId,contract_start:contractStart,contract_end:contractEnd,contract_type:contractType,status:contractStatus,probation_months:probMonths,probation_pct:probPct,probation_amt:probAmt,probation_basis:probBasis,probation_end_date:document.getElementById('ct-probation-end-date')?.value||null,work_hours_per_day:avgDayHours,work_days_per_week:isDailySave?0:workDaysCount,schedule_json:JSON.stringify(scheduleJSON),annual_leave_days:parseFloat(document.getElementById('ct-annual')?.value)||15,pre_used_annual_leave:parseFloat(document.getElementById('ct-pre-used-annual')?.value)||0,annual_salary:annual,monthly_salary_agreed:monthly,base_salary:baseSalaryForSave,daily_wage:dailyWageForSave,weekly_holiday_pay:weeklyHol,fixed_ot_pay:getAmountVal('ct-fixed-ot-pay'),fixed_ot_hours:typeof _weeklyToMonthlyHours==='function'?_weeklyToMonthlyHours('ct-fixed-ot-hours'):(parseFloat(document.getElementById('ct-fixed-ot-hours')?.value)||0),fixed_night_pay:getAmountVal('ct-fixed-night-pay'),fixed_night_hours:typeof _weeklyToMonthlyHours==='function'?_weeklyToMonthlyHours('ct-fixed-night-hours'):(parseFloat(document.getElementById('ct-fixed-night-hours')?.value)||0),fixed_hol_pay:getAmountVal('ct-fixed-hol-pay'),fixed_hol_hours:typeof _weeklyToMonthlyHours==='function'?_weeklyToMonthlyHours('ct-fixed-hol-hours'):(parseFloat(document.getElementById('ct-fixed-hol-hours')?.value)||0),hourly_wage:hourlyWage,position_allowance:getAmountVal('ct-position'),transportation_allowance:getAmountVal('ct-car'),transportation_pay_type:_getCTPayTypeVal('car'),self_driving_allowance:0,self_driving_pay_type:_getCTPayTypeVal('car'),remote_area_allowance:getAmountVal('ct-remote-area'),remote_area_pay_type:'fixed',meal_allowance:getAmountVal('ct-meal'),meal_pay_type:_getCTPayTypeVal('meal'),research_allowance:getAmountVal('ct-research'),research_pay_type:_getCTPayTypeVal('research'),site_allowance:getAmountVal('ct-site'),skill_allowance:getAmountVal('ct-skill'),license_allowance:getAmountVal('ct-license'),hazard_allowance:getAmountVal('ct-hazard'),custom_ordinary_values:JSON.stringify(typeof _getCustomOrdinaryValues==='function'?_getCustomOrdinaryValues():[]),communication_allowance:getAmountVal('ct-communication'),communication_pay_type:_getCTPayTypeVal('communication'),fitness_allowance:getAmountVal('ct-fitness'),fitness_pay_type:_getCTPayTypeVal('fitness'),self_dev_allowance:getAmountVal('ct-self-dev'),self_dev_pay_type:_getCTPayTypeVal('self_dev'),book_allowance:getAmountVal('ct-book'),book_pay_type:_getCTPayTypeVal('book'),overseas_allowance:getAmountVal('ct-overseas'),overseas_pay_type:_getCTPayTypeVal('overseas'),car_maintenance:getAmountVal('ct-car'),regular_bonus:getAmountVal('ct-regular-bonus')||0,childcare_allowance:getAmountVal('ct-childcare')||0,childcare_dependents:parseInt(document.getElementById('ct-childcare-dependents')?.value||0)||0,childcare_pay_type:_getCTPayTypeVal('childcare'),pay_period:document.getElementById('ct-pay-period')?.value.trim()||'',pay_period_month:document.getElementById('ct-pay-period-month-hidden')?.value||null,pay_period_day:parseInt(document.getElementById('ct-pay-period-day-hidden')?.value)||null,pay_day:parseInt(document.getElementById('ct-pay-day')?.value)||null,insurance_employment:true,insurance_industrial:true,insurance_pension:true,insurance_health:true,note:document.getElementById('ct-note').value,salary_start_date:contractStart,salary_end_date:contractEnd,is_draft:false,draft_saved_at:null,signed_file_name:signedFileName,signed_file_data:signedFileData,consent_file_name:consentFileName,consent_file_data:consentFileData};

  // 재계약 연장 페어: renewed_from_id 추가 (기존 계약과 연속되는 경우)
  if(_recontractSourceId){
    const _srcRecon = allContracts.find(x => x.id === _recontractSourceId);
    const _srcReconEnd = _srcRecon?.terminate_date || _srcRecon?.contract_end || '';
    if(_srcRecon && _srcReconEnd && contractStart && !_hasWeekdayGap(_srcReconEnd, contractStart)){
      body.renewed_from_id = _recontractSourceId;
    }
  }

  // ── 계약 생성 사유 기록 (신규/재계약 — DB 영문 코드, 편집 모드는 기존값 유지) ──
  if(!isEditMode){
    if(isRecontract){
      body.created_reason = 'recontract';
      body.hire_reason    = 're_hire';
    } else {
      body.created_reason = 'new';
      const _empHire  = allEmployees.find(e => e.id === empId);
      const _hasOwnP  = typeof _ctHasOwnPastContracts === 'function' ? _ctHasOwnPastContracts(empId, null) : false;
      const _crossIds = typeof _ctPastEmpIds === 'function' ? _ctPastEmpIds(_empHire) : new Set();
      const _hasCross = _crossIds.size > 0 && (allContracts || []).some(x =>
        !x.is_draft && !x.is_voided_by_amend &&
        [CONTRACT_STATUS.TERMINATED, CONTRACT_STATUS.EXPIRED].includes(x.status) &&
        _crossIds.has(x.employee_id));
      const _hasPast = _hasOwnP || _hasCross;
      body.hire_reason = !_hasPast ? 'new_hire'
        : (_empHire?.hire_date && _empHire.hire_date === contractStart ? 're_hire' : 'contract_renewal');
    }
  }

  let _savedContractId_ = '';

  if(isEditMode){
    try {
      body.id=editId.contract;
    await api(`../tables/contracts/${editId.contract}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    // ── 직원 정보도 함께 업데이트 ──
    const editEmpId = (allContracts.find(x=>x.id===editId.contract)||{}).employee_id;
    if(editEmpId){
      const empUpdatePhone = document.getElementById('ct-edit-em-phone').value.trim();
      if(!empUpdatePhone) return toast('휴대전화 번호를 입력하세요.','error');
      // 계약직/일용직은 입사일=계약시작일, 만료일=계약종료일이므로 ct-start/ct-end 값 사용
      const _ctTypeForSave = document.getElementById('ct-type').value||CONTRACT_TYPE.REGULAR;
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
        dependents:          parseInt(document.getElementById('ct-childcare-dependents')?.value)||0,
        phone:               empUpdatePhone,
        email:               document.getElementById('ct-edit-em-email').value,
        address:             document.getElementById('ct-edit-em-address').value,
        bank_name:           document.getElementById('ct-edit-em-bank').value,
        bank_account:        document.getElementById('ct-edit-em-account').value,
        is_representative:   document.getElementById('ct-edit-em-is-rep')?.checked ? 1 : 0,
      };
      // 이름·고용형태: readOnly/disabled가 아닐 때만 업데이트 (수정 모드에서만 반영)
      if(_nameElSave && !_nameElSave.readOnly && _nameElSave.value.trim()) empPatch.name = _nameElSave.value.trim();
      if(_catElSave  && !_catElSave.disabled  && _catElSave.value)         empPatch.employment_category = _catElSave.value;
      await api(`../tables/employees/${editEmpId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(empPatch)});
    }
    } catch(e){
      console.error('[saveContract edit PUT 오류]', e);
      toast('저장 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
      return;
    }
  } else {
    // 임시저장에서 이어서 등록하는 경우: 기존 draft ID 재사용
    const _resumeId = window._resumeDraftId || _currentDraftId;
    _savedContractId_ = '';
    if(_resumeId){
      await api(`../tables/contracts/${_resumeId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      _savedContractId_ = _resumeId;
      window._resumeDraftId = null;
    } else {
      // ID는 서버에서 UUID 생성 (프론트에서 미리 만들지 않음)
      delete body.id;
      try {
        const _saved = await api('../tables/contracts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        _savedContractId_ = _saved.id;
      } catch(e){
        console.error('[계약 저장 실패]', e);
        await _cleanupNewEmployee();
        toast('계약 저장 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
        return;
      }
    }
    // ── 재계약 연장 페어: 기존 계약에 renewed_to_id 설정 ──
    if(body.renewed_from_id && _savedContractId_){
      try {
        await api(`../tables/contracts/${body.renewed_from_id}`, {
          method: 'PATCH', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ renewed_to_id: _savedContractId_ })
        });
        // 로컬 캐시에도 반영
        const _oldPair = allContracts.find(x => x.id === body.renewed_from_id);
        if(_oldPair) _oldPair.renewed_to_id = _savedContractId_;
      } catch(e){ console.warn('[재계약 페어링 실패]', e); }
    }
    // ── 재계약: 직원 입사일·사원번호 반영 (연속이면 이전 값 유지, 갭이면 새 입력값) ──
    if(isRecontract && _savedContractId_){
      try {
        const _rcType = document.getElementById('ct-type')?.value || CONTRACT_TYPE.REGULAR;
        const _rcIsFixed = _rcType===CONTRACT_TYPE.FIXED || _rcType===CONTRACT_TYPE.FIXED_PROBATION || _rcType===CONTRACT_TYPE.DAILY;
        const _rcPatch = { hire_date: _rcIsFixed ? contractStart : (document.getElementById('ct-edit-em-hire')?.value || '') };
        const _rcEmpNoVal = document.getElementById('ct-edit-em-empno')?.value?.trim() || '';
        if(_rcEmpNoVal) _rcPatch.employee_number = _rcEmpNoVal;
        await api(`../tables/employees/${empId}`, { method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify(_rcPatch) });
      } catch(e){ console.warn('[재계약 입사일·사원번호 반영 실패]', e); }
    }
  }
  // ── 고객사 인앱 알림 발송 ──
  const _savedContractId = isEditMode ? editId.contract : (_savedContractId_ || '');
  {
    const _co  = allCompanies.find(x => x.id === coId) || {};
    const _emp = allEmployees.find(x => x.id === empId) || {};
    const _coName  = _co.company_name || '';
    const _empName = _emp.name || '';
    const _coRep   = getCompanyRepGreeting(_co);
    const _fmtDate = d => {
      if(!d) return '-';
      const [y,m,dd] = d.split('-');
      return `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(dd)}일`;
    };

    if(isEditMode){
      // ─ 계약 수정 완료 OR 해지 처리
      const _origC = allContracts.find(x => x.id === editId.contract) || {};
      if(contractStatus === CONTRACT_STATUS.TERMINATED){
        // ── 계약 해지 ──
        await _sendCompanyNotice({
          companyId  : coId, companyName: _coName,
          noticeType : 'contract_terminated',
          title      : `[계약 해지] ${_empName} — 근로계약이 해지되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 근로계약이 해지 처리되었습니다.

■ 근로자: ${_empName}
■ 고용형태: ${contractTypeLabel(contractType)||''}
■ 계약 시작일: ${_fmtDate(contractStart)}
■ 계약 종료일: ${_fmtDate(contractEnd || _origC.contract_end || '')}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

`,
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
■ 고용형태: ${contractTypeLabel(contractType)||''}
■ 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

`,
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
■ 고용형태: ${contractTypeLabel(contractType)||''}
■ 새 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 계약 상태: ${contractStatus === CONTRACT_STATUS.PENDING ? '계약예정 (시작일 미도래)' : '계약유효 (활성)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

`,
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
■ 고용형태: ${contractTypeLabel(contractType)||''}
■ 계약 기간: ${_fmtDate(contractStart)}${contractEnd ? ' ~ ' + _fmtDate(contractEnd) : ' (기간 미정)'}
■ 계약 상태: ${contractStatus === CONTRACT_STATUS.DOCS_INCOMPLETE ? '서류미비 (파일 업로드 필요)' : contractStatus === CONTRACT_STATUS.PENDING ? '계약예정' : '계약유효 (활성)'}
■ 처리 일시: ${new Date().toLocaleString('ko-KR')}

`,
        contractId  : _savedContractId,
        employeeId  : empId, employeeName: _empName,
        contractEnd : contractEnd,
      });
    }
  }
  const _wasRecontract = !!_recontractEmpId;
  _recontractEmpId = null; // 재계약 플래그 초기화
  _recontractSourceId = null;
  _currentDraftId  = null; // 임시저장 ID 초기화
  closeModal('contract-modal');await loadContracts();await loadEmployees();renderContracts();renderDashboard();
  const _ctIsEdit = !!editId.contract;
  toast(_ctIsEdit ? '근로계약서가 수정되었습니다. ✔' : '근로계약서가 등록되었습니다. ✔');
  _triggerWageLedgerRegen(coId);

  // ── 신규 계약: 계약서 확인 및 발송 여부 확인 ──
  if(!_ctIsEdit && !_wasRecontract && _savedContractId){
    const _newEmp = allEmployees.find(e => e.id === empId);
    const _newEmpName = _newEmp?.name || '';
    const confirmed = await _showConfirm({
      message: `근로계약서가 등록되었습니다.\n\n계약서를 확인하고 ${_newEmpName ? _newEmpName+'님에게 ' : ''}인쇄용 파일 주소를 즉시 발송하시겠습니까?`,
      okText: '예',
      cancelText: '아니오 (나중에 발송)',
      okClass: 'btn-primary'
    });
    if(confirmed){
      openContractPrintModal(_savedContractId);
    }
  }

  // ── 연차 관리대장 자동 생성·상태 연동 ──
  if(!_ctIsEdit && contractStatus !== CONTRACT_STATUS.VOIDED){
    _syncLeaveLedgerWithContract(empId, coId, contractStart, contractStatus);
    _syncAttendanceLedgerWithContract(empId, coId, contractStart);
  } else if(_ctIsEdit){
    // 수정 모드: 해지·만료 시 관리대장 상태 동기화
    const _editContract = allContracts.find(x => x.id === editId.contract);
    if(_editContract && (contractStatus === CONTRACT_STATUS.TERMINATED || contractStatus === CONTRACT_STATUS.EXPIRED || contractStatus === CONTRACT_STATUS.RENEWED)){
      _syncLeaveLedgerWithContract(_editContract.employee_id, _editContract.company_id, _editContract.contract_start, contractStatus);
    }
  }
}

/**
 * 연차 관리대장 자동 생성·상태 연동
 * 계약 등록 시 해당 연도 관리대장이 없으면 생성, 해지/만료 시 상태 동기화
 */
async function _syncLeaveLedgerWithContract(empId, coId, contractStart, contractStatus){
  if(!empId || !contractStart) return;
  const year = parseInt(contractStart.slice(0,4));
  if(!year) return;

  try {
    // 기존 관리대장 조회
    const _res = await api(`../tables/annual_leave_ledger?employee_id=${empId}&year=${year}&limit=10`);
    const _exist = (_res?.data || []).find(r => Number(r.year) === year);

    if(_exist){
      // 이미 있으면 상태만 업데이트 (해지/만료 시)
      if(contractStatus === CONTRACT_STATUS.TERMINATED || contractStatus === CONTRACT_STATUS.EXPIRED || contractStatus === CONTRACT_STATUS.RENEWED){
        await api(`../tables/annual_leave_ledger/${_exist.id}`, {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: contractStatus })
        });
      }
    } else {
      // 없으면 새로 생성
      const emp = allEmployees.find(e => e.id === empId);
      const contract = allContracts.find(c => c.employee_id === empId && c.contract_start === contractStart);
      const _preUsed = parseFloat(contract?.pre_used_annual_leave) || 0;
      const _totalDays = parseFloat(contract?.annual_leave_days) || 0;
      // 기사용 연차 month_data 항목 생성
      const _preMonthData = [];
      if (_preUsed > 0) {
        const _startMonth = parseInt(contractStart.slice(5,7)) || 1;
        _preMonthData.push({
          month: _startMonth,
          dates: '',
          days: _preUsed,
          note: '기사용 연차(서비스 가입 이전)'
        });
      }
      const newLedger = {
        employee_id: empId,
        company_id: coId || emp?.company_id || '',
        year: year,
        contract_id: contract?.id || '',
        status: contractStatus || 'active',
        ref_date: `${year}-01-01`,
        period_start: `${year}-01-01`,
        period_end: `${year}-12-31`,
        total_days: _totalDays,
        carryover_days: 0,
        month_data: JSON.stringify(_preMonthData),
        total_used: _preUsed,
        remain_days: _totalDays - _preUsed,
        ordinary_wage: 0,
        leave_pay_estimate: 0,
      };
      const res = await api('../tables/annual_leave_ledger', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newLedger)
      });
      // allLeaveLedgers 캐시 즉시 갱신 (응답에서 id를 받아 추가)
      const created = await res.json();
      if(created?.id && typeof allLeaveLedgers !== 'undefined'){
        newLedger.id = created.id;
        allLeaveLedgers.push(newLedger);
      }
    }
  } catch(e){
    console.warn('[syncLeaveLedger]', e);
  }
}

/**
 * 근태 관리대장 자동 생성
 * 계약 등록 시 해당 연도 근태 관리대장이 없으면 빈 대장 생성
 */
async function _syncAttendanceLedgerWithContract(empId, coId, contractStart){
  if(!empId || !contractStart) return;
  const year = parseInt(contractStart.slice(0,4));
  if(!year) return;

  try {
    // 이미 존재하는지 확인
    const _res = await api(`../tables/attendance_ledger?employee_id=${empId}&year=${year}&limit=10`);
    const _exist = (_res?.data || []).find(r => Number(r.year) === year);
    if(_exist) return; // 이미 있으면 스킵

    const emp = allEmployees.find(e => e.id === empId);
    const contract = allContracts.find(c => c.employee_id === empId && c.contract_start === contractStart);
    await api('../tables/attendance_ledger', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        employee_id: empId,
        company_id: coId || emp?.company_id || '',
        year: year,
        contract_id: contract?.id || '',
        status: 'active',
        month_data: '[]',
        total_absent_days: 0,
        total_late_count: 0,
        total_earlyleave_count: 0,
      })
    });
  } catch(e){
    console.warn('[syncAttendanceLedger]', e);
  }
}

async function deleteContract(id){
  const c = allContracts.find(x => x.id === id);
  if(!c) return toast('계약 정보를 찾을 수 없습니다.', 'error');

  // 파기된 계약만 삭제 허용
  const isVoided = c.status === CONTRACT_STATUS.VOIDED || c.is_voided_by_amend;
  if(!isVoided){
    toast('근로계약서는 보존 정책에 따라 삭제할 수 없습니다.', 'error');
    return;
  }

  if(!confirm('삭제 후에는 다시 조회할 수 없습니다.\n정말 파기 기록을 삭제하시겠습니까?')) return;

  try {
    // FK 제약 해소: 연관 레코드 먼저 삭제
    await api(`../tables/contract_dispatch?contract_id=${id}&limit=100`, { method: 'GET' }).then(res => {
      const list = res?.data || [];
      return Promise.all(list.map(r => api(`../tables/contract_dispatch/${r.id}`, { method: 'DELETE' }).catch(()=>{})));
    }).catch(()=>{});
    await api(`../tables/contract_expiry_notice?contract_id=${id}&limit=100`, { method: 'GET' }).then(res => {
      const list = res?.data || [];
      return Promise.all(list.map(r => api(`../tables/contract_expiry_notice/${r.id}`, { method: 'DELETE' }).catch(()=>{})));
    }).catch(()=>{});

    // 연차 관리대장도 함께 파기 (contract_id 기준)
    if(c.employee_id && c.company_id){
      try {
        const _ledgers = await api(`../tables/annual_leave_ledger?employee_id=${c.employee_id}&limit=100`);
        const _list = _ledgers?.data || [];
        for(const _l of _list){
          if(_l.contract_id === id){
            await api(`../tables/annual_leave_ledger/${_l.id}`, { method: 'DELETE' }).catch(()=>{});
          }
        }
      } catch(e){ console.warn('[deleteContract] ledger 정리 실패:', e); }
    }

    await api(`../tables/contracts/${id}`, { method: 'DELETE' });
    await loadContracts();
    renderContracts();
    toast('파기된 계약서가 삭제되었습니다.', 'success');
  } catch(e){
    console.error('[deleteContract]', e);
    toast('삭제에 실패했습니다.', 'error');
  }
}
