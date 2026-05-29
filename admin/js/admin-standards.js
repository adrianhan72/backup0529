// ─── STANDARDS (년도별 산정기준) ───
let _allInsuranceRates = [];
let _allMinimumWages   = [];

async function loadStandards(){
  try{
    const [rd, wd] = await Promise.all([
      api('../tables/insurance_rates?limit=200'),
      api('../tables/minimum_wages?limit=100')
    ]);
    _allInsuranceRates = (rd.data||[]).sort((a,b)=> b.year - a.year || (b.period_start||'').localeCompare(a.period_start||''));
    _allMinimumWages   = (wd.data||[]).sort((a,b)=> b.year - a.year);
  }catch(e){ console.error('[산정기준] 로드 실패',e); }
}

function switchStdTab(tab){
  ['insurance','minwage','taxbracket'].forEach(t=>{
    document.getElementById('std-tab-'+t).classList.toggle('active', t===tab);
    document.getElementById('std-panel-'+t).style.display = t===tab ? '' : 'none';
  });
  if(tab==='insurance') renderInsuranceRates();
  else if(tab==='minwage') renderMinimumWages();
  else if(tab==='taxbracket') renderTaxBracketPanel();
}

// ── 4대보험 요율표 렌더링 ──
function renderInsuranceRates(){
  const now      = new Date();
  const todayStr = now.toISOString().slice(0,10);

  const typeMap = {
    national_pension:'std-pension-table',
    health:          'std-health-table',
    long_term_care:  'std-ltcare-table',
    employment:      'std-employ-table'
  };
  const hasCap = { national_pension:true };

  Object.entries(typeMap).forEach(([type, tableId])=>{
    const tbody = document.querySelector(`#${tableId} tbody`);
    if(!tbody) return;
    const rows = _allInsuranceRates.filter(r => r.insurance_type === type);
    if(!rows.length){ tbody.innerHTML='<tr><td colspan="4" style="color:#9ca3af;text-align:center;padding:16px;">데이터 없음</td></tr>'; return; }
    tbody.innerHTML = rows.map(r=>{
      const isCurrent = todayStr >= r.period_start && todayStr <= r.period_end;
      const period = `${r.period_start||''} ~ ${r.period_end||''}`;
      const capTd = hasCap[type]
        ? `<td class="std-cap">${r.cap_amount ? Number(r.cap_amount).toLocaleString('ko-KR')+'원' : '-'}</td>`
        : '';
      const noteTd = `<td style="font-size:11.5px;color:#9ca3af;">${r.note||'-'}</td>`;
      return `<tr class="${isCurrent?'std-current-row':''}">
        <td class="std-period">${period}${isCurrent?' <span style="display:inline-block;background:#e94560;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px;">현재</span>':''}</td>
        <td class="std-rate">${r.rate}%</td>
        ${capTd}
        ${noteTd}
      </tr>`;
    }).join('');
  });
}

// ── 최저임금표 렌더링 ──
function renderMinimumWages(){
  const curYear  = new Date().getFullYear();
  const tbody    = document.querySelector('#std-minwage-table tbody');
  if(!tbody) return;
  if(!_allMinimumWages.length){ tbody.innerHTML='<tr><td colspan="4" style="color:#9ca3af;text-align:center;padding:16px;">데이터 없음</td></tr>'; return; }
  tbody.innerHTML = _allMinimumWages.map(w=>{
    const isCurrent = Number(w.year) === curYear;
    return `<tr class="${isCurrent?'mw-current-row':''}">
      <td class="mw-year">${w.year}년${isCurrent?' <span style="display:inline-block;background:#10b981;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px;">현재</span>':''}</td>
      <td class="mw-hourly">${Number(w.hourly_wage).toLocaleString('ko-KR')}원</td>
      <td class="mw-monthly">${Number(w.monthly_wage).toLocaleString('ko-KR')}원</td>
      <td style="font-size:11.5px;color:#9ca3af;">${w.note||'-'}</td>
    </tr>`;
  }).join('');
}

// ── 과세 기준 패널 렌더링 ──
// 소득세법 시행령 별표 2 근로소득 간이세액표
// 각 행: [월과세급여 이상, 미만, 부양가족1인세액, 2인, 3인, 4인, 5인, 6인, 7인+공제단위]
// 부양가족 7인 이상: 7인 세액에서 1인 초과마다 _TAX_EXTRA_PER_DEP 만큼 차감
// 지방소득세 = 소득세 × 10%
// ── 부양가족 수별 세액 차감 단계 (소득세법 시행령 별표 2 비고) ──
// 각 구간별 8인 이상 1인 추가 시 차감액은 _TAX_BRACKET_DATA 마지막 원소로 저장
const _TAX_BRACKET_DATA = {
  // 형식: [이상, 미만, 1인, 2인, 3인, 4인, 5인, 6인, 7인, 8인이상1인추가공제단위]
  // 소득세법 시행령 별표 2 (2025년 기준) — 소득세만 (지방소득세 = 소득세 × 10%)
  2025: [
    [1060000,1080000,   1130,      0,      0,      0,      0,      0,      0,   0],
    [1080000,1100000,   2040,      0,      0,      0,      0,      0,      0,   0],
    [1100000,1120000,   2960,      0,      0,      0,      0,      0,      0,   0],
    [1120000,1140000,   3870,      0,      0,      0,      0,      0,      0,   0],
    [1140000,1160000,   4790,      0,      0,      0,      0,      0,      0,   0],
    [1160000,1180000,   5710,      0,      0,      0,      0,      0,      0,   0],
    [1180000,1200000,   6640,      0,      0,      0,      0,      0,      0,   0],
    [1200000,1240000,   7560,      0,      0,      0,      0,      0,      0,   0],
    [1240000,1280000,   9300,      0,      0,      0,      0,      0,      0,   0],
    [1280000,1320000,  11060,      0,      0,      0,      0,      0,      0,   0],
    [1320000,1360000,  12800,      0,      0,      0,      0,      0,      0,   0],
    [1360000,1400000,  14550,      0,      0,      0,      0,      0,      0,   0],
    [1400000,1440000,  16290,      0,      0,      0,      0,      0,      0,   0],
    [1440000,1480000,  18050,      0,      0,      0,      0,      0,      0,   0],
    [1480000,1520000,  19790,      0,      0,      0,      0,      0,      0,   0],
    [1520000,1560000,  21540,      0,      0,      0,      0,      0,      0,   0],
    [1560000,1600000,  23280,      0,      0,      0,      0,      0,      0,   0],
    [1600000,1640000,  25030,      0,      0,      0,      0,      0,      0,   0],
    [1640000,1680000,  26770,      0,      0,      0,      0,      0,      0,   0],
    [1680000,1720000,  28520,      0,      0,      0,      0,      0,      0,   0],
    [1720000,1760000,  30260,      0,      0,      0,      0,      0,      0,   0],
    [1760000,1800000,  32010,      0,      0,      0,      0,      0,      0,   0],
    [1800000,1850000,  33980,      0,      0,      0,      0,      0,      0,   0],
    [1850000,1900000,  36180,      0,      0,      0,      0,      0,      0,   0],
    [1900000,1950000,  38370,      0,      0,      0,      0,      0,      0,   0],
    [1950000,2000000,  40570,      0,      0,      0,      0,      0,      0,   0],
    [2000000,2050000,  42760,      0,      0,      0,      0,      0,      0,   0],
    [2050000,2100000,  44960,      0,      0,      0,      0,      0,      0,   0],
    [2100000,2150000,  47310,  25940,      0,      0,      0,      0,      0,   0],
    [2150000,2200000,  50060,  28690,      0,      0,      0,      0,      0,   0],
    [2200000,2250000,  52810,  31440,   9790,      0,      0,      0,      0,   0],
    [2250000,2300000,  55560,  34190,  12540,      0,      0,      0,      0,   0],
    [2300000,2350000,  58310,  36940,  15290,      0,      0,      0,      0,   0],
    [2350000,2400000,  61060,  39690,  18040,      0,      0,      0,      0,   0],
    [2400000,2450000,  63820,  42450,  20800,      0,      0,      0,      0,   0],
    [2450000,2500000,  66570,  45200,  23550,   1300,      0,      0,      0,   0],
    [2500000,2600000,  70490,  49120,  27470,   5220,      0,      0,      0,   0],
    [2600000,2700000,  77380,  56010,  34360,  12110,      0,      0,      0,   0],
    [2700000,2800000,  84270,  62900,  41250,  19000,      0,      0,      0,   0],
    [2800000,2900000,  91160,  69790,  48140,  25890,   3640,      0,      0,   0],
    [2900000,3000000,  98050,  76680,  55030,  32780,  10530,      0,      0,   0],
    [3000000,3100000, 104940,  83570,  61920,  39670,  17420,      0,      0,   0],
    [3100000,3200000, 111830,  90460,  68810,  46560,  24310,   2060,      0,   0],
    [3200000,3300000, 118720,  97350,  75700,  53450,  31200,   8950,      0,   0],
    [3300000,3400000, 125610, 104240,  82590,  60340,  38090,  15840,      0,   0],
    [3400000,3500000, 133210, 111840,  90190,  67940,  45690,  23440,   1190,   0],
    [3500000,3600000, 141030, 119660,  98010,  75760,  53510,  31260,   9010,   0],
    [3600000,3700000, 148840, 127470, 105820,  83570,  61320,  39070,  16820,   0],
    [3700000,3800000, 156660, 135290, 113640,  91390,  69140,  46890,  24640,   0],
    [3800000,3900000, 164470, 143100, 121450,  99200,  76950,  54700,  32450,   0],
    [3900000,4000000, 172290, 150920, 129270, 107020,  84770,  62520,  40270,   0],
    [4000000,4100000, 180100, 158730, 137080, 114830,  92580,  70330,  48080,   0],
    [4100000,4200000, 187920, 166550, 144900, 122650, 100400,  78150,  55900,   0],
    [4200000,4300000, 195730, 174360, 152710, 130460, 108210,  85960,  63710,   0],
    [4300000,4400000, 203550, 182180, 160530, 138280, 116030,  93780,  71530,   0],
    [4400000,4500000, 211360, 189990, 168340, 146090, 123840, 101590,  79340,   0],
    [4500000,4600000, 220970, 199600, 177950, 155700, 133450, 111200,  88950,   0],
    [4600000,4700000, 231910, 210540, 188890, 166640, 144390, 122140,  99890,   0],
    [4700000,4800000, 242850, 221480, 199830, 177580, 155330, 133080, 110830,   0],
    [4800000,4900000, 253790, 232420, 210770, 188520, 166270, 144020, 121770,   0],
    [4900000,5000000, 264730, 243360, 221710, 199460, 177210, 154960, 132710,   0],
    [5000000,5100000, 275670, 254300, 232650, 210400, 188150, 165900, 143650,   0],
    [5100000,5200000, 286610, 265240, 243590, 221340, 199090, 176840, 154590,   0],
    [5200000,5300000, 297550, 276180, 254530, 232280, 210030, 187780, 165530,   0],
    [5300000,5400000, 308490, 287120, 265470, 243220, 220970, 198720, 176470,   0],
    [5400000,5500000, 319430, 298060, 276410, 254160, 231910, 209660, 187410,   0],
    [5500000,5600000, 330370, 309000, 287350, 265100, 242850, 220600, 198350,   0],
    [5600000,5700000, 341840, 320470, 298820, 276570, 254320, 232070, 209820,   0],
    [5700000,5800000, 353530, 332160, 310510, 288260, 266010, 243760, 221510,   0],
    [5800000,5900000, 365220, 343850, 322200, 299950, 277700, 255450, 233200,   0],
    [5900000,6000000, 376910, 355540, 333890, 311640, 289390, 267140, 244890,   0],
    [6000000,6100000, 388600, 367230, 345580, 323330, 301080, 278830, 256580,   0],
    [6100000,6200000, 400290, 378920, 357270, 335020, 312770, 290520, 268270,   0],
    [6200000,6300000, 411980, 390610, 368960, 346710, 324460, 302210, 279960,   0],
    [6300000,6400000, 423670, 402300, 380650, 358400, 336150, 313900, 291650,   0],
    [6400000,6500000, 435360, 413990, 392340, 370090, 347840, 325590, 303340,   0],
    [6500000,6600000, 447050, 425680, 404030, 381780, 359530, 337280, 315030,   0],
    [6600000,6700000, 459050, 437680, 416030, 393780, 371530, 349280, 327030,   0],
    [6700000,6800000, 471250, 449880, 428230, 405980, 383730, 361480, 339230,   0],
    [6800000,6900000, 483450, 462080, 440430, 418180, 395930, 373680, 351430,   0],
    [6900000,7000000, 495650, 474280, 452630, 430380, 408130, 385880, 363630,   0],
    [7000000,7200000, 514750, 493380, 471730, 449480, 427230, 404980, 382730,   0],
    [7200000,7400000, 540990, 519620, 497970, 475720, 453470, 431220, 408970,   0],
    [7400000,7600000, 567230, 545860, 524210, 501960, 479710, 457460, 435210,   0],
    [7600000,7800000, 593470, 572100, 550450, 528200, 505950, 483700, 461450,   0],
    [7800000,8000000, 619710, 598340, 576690, 554440, 532190, 509940, 487690,   0],
    [8000000,8200000, 645950, 624580, 602930, 580680, 558430, 536180, 513930,   0],
    [8200000,8400000, 672190, 650820, 629170, 606920, 584670, 562420, 540170,   0],
    [8400000,8600000, 698430, 677060, 655410, 633160, 610910, 588660, 566410,   0],
    [8600000,8800000, 724670, 703300, 681650, 659400, 637150, 614900, 592650,   0],
    [8800000,9000000, 750910, 729540, 707890, 685640, 663390, 641140, 618890,   0],
    [9000000,9200000, 777150, 755780, 734130, 711880, 689630, 667380, 645130,   0],
    [9200000,9400000, 808230, 786860, 765210, 742960, 720710, 698460, 676210,   0],
    [9400000,9600000, 840720, 819350, 797700, 775450, 753200, 730950, 708700,   0],
    [9600000,9800000, 873210, 851840, 830190, 807940, 785690, 763440, 741190,   0],
    [9800000,10000000, 905700, 884330, 862680, 840430, 818180, 795930, 773680,  0],
    [10000000,10200000,938190, 916820, 895170, 872920, 850670, 828420, 806170,  0],
  ],
  2024: [
    [1060000, 1080000,   1130,   110],
    [1080000, 1100000,   2040,   200],
    [1100000, 1120000,   2960,   290],
    [1120000, 1140000,   3870,   380],
    [1140000, 1160000,   4790,   470],
    [1160000, 1180000,   5710,   570],
    [1180000, 1200000,   6640,   660],
    [1200000, 1240000,   7560,   750],
    [1240000, 1280000,   9300,   930],
    [1280000, 1320000,  11060,  1100],
    [1320000, 1360000,  12800,  1280],
    [1360000, 1400000,  14550,  1450],
    [1400000, 1440000,  16290,  1620],
    [1440000, 1480000,  18050,  1800],
    [1480000, 1520000,  19790,  1970],
    [1520000, 1560000,  21540,  2150],
    [1560000, 1600000,  23280,  2320],
    [1600000, 1640000,  25030,  2500],
    [1640000, 1680000,  26770,  2670],
    [1680000, 1720000,  28520,  2850],
    [1720000, 1760000,  30260,  3020],
    [1760000, 1800000,  32010,  3200],
    [1800000, 1850000,  33980,  3390],
    [1850000, 1900000,  36180,  3610],
    [1900000, 1950000,  38370,  3830],
    [1950000, 2000000,  40570,  4050],
    [2000000, 2050000,  42760,  4270],
    [2050000, 2100000,  44960,  4490],
    [2100000, 2150000,  47310,  4730],
    [2150000, 2200000,  50060,  5000],
    [2200000, 2250000,  52810,  5280],
    [2250000, 2300000,  55560,  5550],
    [2300000, 2350000,  58310,  5830],
    [2350000, 2400000,  61060,  6100],
    [2400000, 2450000,  63820,  6380],
    [2450000, 2500000,  66570,  6650],
    [2500000, 2600000,  70490,  7040],
    [2600000, 2700000,  77380,  7730],
    [2700000, 2800000,  84270,  8420],
    [2800000, 2900000,  91160,  9110],
    [2900000, 3000000,  98050,  9800],
    [3000000, 3100000, 104940, 10490],
    [3100000, 3200000, 111830, 11180],
    [3200000, 3300000, 118720, 11870],
    [3300000, 3400000, 125610, 12560],
    [3400000, 3500000, 132500, 13250],
    [3500000, 3600000, 140080, 14000],
    [3600000, 3700000, 147890, 14780],
    [3700000, 3800000, 155700, 15570],
    [3800000, 3900000, 163520, 16350],
    [3900000, 4000000, 171330, 17130],
    [4000000, 4100000, 179140, 17910],
    [4100000, 4200000, 186960, 18690],
    [4200000, 4300000, 194770, 19470],
    [4300000, 4400000, 202580, 20250],
    [4400000, 4500000, 210400, 21040],
    [4500000, 4600000, 219890, 21980],
    [4600000, 4700000, 230830, 23080],
    [4700000, 4800000, 241770, 24170],
    [4800000, 4900000, 252710, 25270],
    [4900000, 5000000, 263650, 26360],
    [5000000, 5200000, 280520, 28050],
    [5200000, 5400000, 302400, 30240],
    [5400000, 5600000, 324280, 32420],
    [5600000, 5800000, 346820, 34680],
    [5800000, 6000000, 369830, 36980],
    [6000000, 6200000, 392840, 39280],
    [6200000, 6400000, 415850, 41580],
    [6400000, 6600000, 438860, 43880],
    [6600000, 6800000, 461870, 46180],
    [6800000, 7000000, 485730, 48570],
    [7000000, 7200000, 510230, 51020],
    [7200000, 7400000, 536470, 53640],
    [7400000, 7600000, 562710, 56270],
    [7600000, 7800000, 588950, 58890],
    [7800000, 8000000, 615190, 61510],
    [8000000, 8500000, 652480, 65240],
    [8500000, 9000000, 704070, 70400],
    [9000000, 9500000, 755660, 75560],
    [9500000,10000000, 807250, 80720],
    [10000000,10500000, 858840, 85880],
  ],
  2023: [
    [1060000, 1080000,   1130,   110],
    [1080000, 1100000,   2040,   200],
    [1100000, 1120000,   2960,   290],
    [1120000, 1140000,   3870,   380],
    [1140000, 1160000,   4790,   470],
    [1160000, 1180000,   5710,   570],
    [1180000, 1200000,   6640,   660],
    [1200000, 1240000,   7560,   750],
    [1240000, 1280000,   9300,   930],
    [1280000, 1320000,  11060,  1100],
    [1320000, 1360000,  12800,  1280],
    [1360000, 1400000,  14550,  1450],
    [1400000, 1440000,  16290,  1620],
    [1440000, 1480000,  18050,  1800],
    [1480000, 1520000,  19790,  1970],
    [1520000, 1560000,  21540,  2150],
    [1560000, 1600000,  23280,  2320],
    [1600000, 1640000,  25030,  2500],
    [1640000, 1680000,  26770,  2670],
    [1680000, 1720000,  28520,  2850],
    [1720000, 1760000,  30260,  3020],
    [1760000, 1800000,  32010,  3200],
    [1800000, 1850000,  33980,  3390],
    [1850000, 1900000,  36180,  3610],
    [1900000, 1950000,  38370,  3830],
    [1950000, 2000000,  40570,  4050],
    [2000000, 2050000,  42760,  4270],
    [2050000, 2100000,  44960,  4490],
    [2100000, 2150000,  47310,  4730],
    [2150000, 2200000,  50060,  5000],
    [2200000, 2250000,  52810,  5280],
    [2250000, 2300000,  55560,  5550],
    [2300000, 2350000,  58310,  5830],
    [2350000, 2400000,  61060,  6100],
    [2400000, 2450000,  63820,  6380],
    [2450000, 2500000,  66570,  6650],
    [2500000, 2600000,  70490,  7040],
    [2600000, 2700000,  77380,  7730],
    [2700000, 2800000,  84270,  8420],
    [2800000, 2900000,  91160,  9110],
    [2900000, 3000000,  98050,  9800],
    [3000000, 3100000, 104940, 10490],
    [3100000, 3200000, 111830, 11180],
    [3200000, 3300000, 118720, 11870],
    [3300000, 3400000, 125610, 12560],
    [3400000, 3500000, 132490, 13240],
    [3500000, 3600000, 139760, 13970],
    [3600000, 3700000, 147570, 14750],
    [3700000, 3800000, 155380, 15530],
    [3800000, 3900000, 163190, 16310],
    [3900000, 4000000, 171000, 17100],
    [4000000, 4100000, 178810, 17880],
    [4100000, 4200000, 186620, 18660],
    [4200000, 4300000, 194430, 19440],
    [4300000, 4400000, 202240, 20220],
    [4400000, 4500000, 210050, 21000],
    [4500000, 4700000, 224040, 22400],
    [4700000, 4900000, 245160, 24510],
    [4900000, 5100000, 266280, 26620],
    [5100000, 5300000, 287400, 28740],
    [5300000, 5500000, 309040, 30900],
    [5500000, 5700000, 331170, 33110],
    [5700000, 5900000, 353300, 35330],
    [5900000, 6100000, 375430, 37540],
    [6100000, 6300000, 397560, 39750],
    [6300000, 6500000, 419690, 41960],
    [6500000, 6700000, 441820, 44180],
    [6700000, 7000000, 469390, 46930],
    [7000000, 7500000, 510580, 51050],
    [7500000, 8000000, 562170, 56210],
    [8000000, 8500000, 613760, 61370],
    [8500000, 9000000, 665350, 66530],
    [9000000, 9500000, 716940, 71690],
    [9500000,10000000, 768530, 76850],
    [10000000,10500000, 820120, 82010],
  ],
  2022: [
    [1060000, 1080000,   1130,   110],
    [1080000, 1100000,   2040,   200],
    [1100000, 1120000,   2960,   290],
    [1120000, 1140000,   3870,   380],
    [1140000, 1160000,   4790,   470],
    [1160000, 1180000,   5710,   570],
    [1180000, 1200000,   6640,   660],
    [1200000, 1240000,   7560,   750],
    [1240000, 1280000,   9300,   930],
    [1280000, 1320000,  11060,  1100],
    [1320000, 1360000,  12800,  1280],
    [1360000, 1400000,  14550,  1450],
    [1400000, 1440000,  16290,  1620],
    [1440000, 1480000,  18050,  1800],
    [1480000, 1520000,  19790,  1970],
    [1520000, 1560000,  21540,  2150],
    [1560000, 1600000,  23280,  2320],
    [1600000, 1640000,  25030,  2500],
    [1640000, 1680000,  26770,  2670],
    [1680000, 1720000,  28520,  2850],
    [1720000, 1760000,  30260,  3020],
    [1760000, 1800000,  32010,  3200],
    [1800000, 1850000,  33980,  3390],
    [1850000, 1900000,  36180,  3610],
    [1900000, 1950000,  38370,  3830],
    [1950000, 2000000,  40570,  4050],
    [2000000, 2050000,  42760,  4270],
    [2050000, 2100000,  44960,  4490],
    [2100000, 2150000,  47310,  4730],
    [2150000, 2200000,  50060,  5000],
    [2200000, 2250000,  52810,  5280],
    [2250000, 2300000,  55560,  5550],
    [2300000, 2350000,  58310,  5830],
    [2350000, 2400000,  61060,  6100],
    [2400000, 2450000,  63820,  6380],
    [2450000, 2500000,  66570,  6650],
    [2500000, 2600000,  70490,  7040],
    [2600000, 2700000,  77380,  7730],
    [2700000, 2800000,  84270,  8420],
    [2800000, 2900000,  91160,  9110],
    [2900000, 3000000,  98050,  9800],
    [3000000, 3100000, 104940, 10490],
    [3100000, 3200000, 111830, 11180],
    [3200000, 3300000, 118720, 11870],
    [3300000, 3400000, 125610, 12560],
    [3400000, 3500000, 132490, 13240],
    [3500000, 3600000, 139380, 13930],
    [3600000, 3700000, 146900, 14690],
    [3700000, 3800000, 154710, 15470],
    [3800000, 3900000, 162520, 16250],
    [3900000, 4000000, 170330, 17030],
    [4000000, 4100000, 178140, 17810],
    [4100000, 4200000, 185950, 18590],
    [4200000, 4300000, 193760, 19370],
    [4300000, 4400000, 201570, 20150],
    [4400000, 4500000, 209380, 20930],
    [4500000, 4700000, 223370, 22330],
    [4700000, 4900000, 244490, 24440],
    [4900000, 5100000, 265610, 26560],
    [5100000, 5300000, 286730, 28670],
    [5300000, 5500000, 308370, 30830],
    [5500000, 5700000, 330500, 33050],
    [5700000, 5900000, 352630, 35260],
    [5900000, 6100000, 374760, 37470],
    [6100000, 6300000, 396890, 39680],
    [6300000, 6500000, 419020, 41900],
    [6500000, 6700000, 441150, 44110],
    [6700000, 7000000, 468720, 46870],
    [7000000, 7500000, 509910, 50990],
    [7500000, 8000000, 561500, 56150],
    [8000000, 8500000, 613090, 61300],
    [8500000, 9000000, 664680, 66460],
    [9000000, 9500000, 716270, 71620],
    [9500000,10000000, 767860, 76780],
    [10000000,10500000, 819450, 81940],
  ],
  2021: [
    [1060000, 1080000,   1130,   110],
    [1080000, 1100000,   2040,   200],
    [1100000, 1120000,   2960,   290],
    [1120000, 1140000,   3870,   380],
    [1140000, 1160000,   4790,   470],
    [1160000, 1180000,   5710,   570],
    [1180000, 1200000,   6640,   660],
    [1200000, 1240000,   7560,   750],
    [1240000, 1280000,   9300,   930],
    [1280000, 1320000,  11060,  1100],
    [1320000, 1360000,  12800,  1280],
    [1360000, 1400000,  14550,  1450],
    [1400000, 1440000,  16290,  1620],
    [1440000, 1480000,  18050,  1800],
    [1480000, 1520000,  19790,  1970],
    [1520000, 1560000,  21540,  2150],
    [1560000, 1600000,  23280,  2320],
    [1600000, 1640000,  25030,  2500],
    [1640000, 1680000,  26770,  2670],
    [1680000, 1720000,  28520,  2850],
    [1720000, 1760000,  30260,  3020],
    [1760000, 1800000,  32010,  3200],
    [1800000, 1850000,  33980,  3390],
    [1850000, 1900000,  36180,  3610],
    [1900000, 1950000,  38370,  3830],
    [1950000, 2000000,  40570,  4050],
    [2000000, 2050000,  42760,  4270],
    [2050000, 2100000,  44960,  4490],
    [2100000, 2150000,  47310,  4730],
    [2150000, 2200000,  50060,  5000],
    [2200000, 2250000,  52810,  5280],
    [2250000, 2300000,  55560,  5550],
    [2300000, 2350000,  58310,  5830],
    [2350000, 2400000,  61060,  6100],
    [2400000, 2450000,  63820,  6380],
    [2450000, 2500000,  66570,  6650],
    [2500000, 2600000,  70490,  7040],
    [2600000, 2700000,  77380,  7730],
    [2700000, 2800000,  84270,  8420],
    [2800000, 2900000,  91160,  9110],
    [2900000, 3000000,  98050,  9800],
    [3000000, 3100000, 104940, 10490],
    [3100000, 3200000, 111830, 11180],
    [3200000, 3300000, 118720, 11870],
    [3300000, 3400000, 125610, 12560],
    [3400000, 3500000, 132500, 13250],
    [3500000, 3600000, 139380, 13930],
    [3600000, 3700000, 146270, 14620],
    [3700000, 3800000, 154080, 15400],
    [3800000, 3900000, 161890, 16180],
    [3900000, 4000000, 169700, 16970],
    [4000000, 4100000, 177510, 17750],
    [4100000, 4200000, 185320, 18530],
    [4200000, 4300000, 193130, 19310],
    [4300000, 4400000, 200940, 20090],
    [4400000, 4500000, 208750, 20870],
    [4500000, 4700000, 222740, 22270],
    [4700000, 4900000, 243860, 24380],
    [4900000, 5100000, 264980, 26490],
    [5100000, 5300000, 286100, 28610],
    [5300000, 5500000, 307740, 30770],
    [5500000, 5700000, 329870, 32980],
    [5700000, 5900000, 352000, 35200],
    [5900000, 6100000, 374130, 37410],
    [6100000, 6300000, 396260, 39620],
    [6300000, 6500000, 418390, 41830],
    [6500000, 6700000, 440520, 44050],
    [6700000, 7000000, 468090, 46800],
    [7000000, 7500000, 509280, 50920],
    [7500000, 8000000, 560870, 56080],
    [8000000, 8500000, 612460, 61240],
    [8500000, 9000000, 664050, 66400],
    [9000000, 9500000, 715640, 71560],
    [9500000,10000000, 767230, 76720],
    [10000000,10500000, 818820, 81880],
  ],
};

// 현재 선택 연도 (과세 기준 탭)
let _taxBracketYear = new Date().getFullYear();
// 현재 선택 부양가족 수 (1~7+, 기본 1인)
let _taxBracketDep  = 1;

// ── 부양가족 수별 세액 조회 헬퍼 ──
// 2025년 이후: 행 형식 [이상,미만,1인,2인,3인,4인,5인,6인,7인,8인이상초과공제]
// 2024년 이하: 행 형식 [이상,미만,소득세(1인),지방소득세] → dep 컬럼 없음
function _getTaxForDep(row, dep){
  if(row.length <= 4){
    // 구형(2024 이하): 1인 기준만 있음 → dep 무관하게 1인 값 반환
    return Math.max(0, row[2]);
  }
  // 신형(2025 이상): [이상,미만,1인,2인,3인,4인,5인,6인,7인,초과공제]
  const idx = Math.min(dep, 7);     // 최대 7인 인덱스 (col 2~8)
  const colIdx = 1 + idx;           // col: dep=1→2, dep=2→3, ..., dep=7→8
  let tax = row[colIdx] || 0;
  if(dep > 7){
    // 8인 이상: 7인 세액에서 초과 1인당 row[9] 차감
    const extraPerDep = row[9] || 0;
    tax = Math.max(0, (row[8]||0) - (dep - 7) * extraPerDep);
  }
  return Math.max(0, tax);
}

// ── 연도+부양가족 수가 신형 데이터인지 판단 ──
function _isNewTaxFormat(year){ return (year >= 2025); }

function renderTaxBracketPanel(){
  const curYear = new Date().getFullYear();
  const years   = [curYear, curYear-1, curYear-2, curYear-3, curYear-4];

  // ── 연도 탭 렌더 ──
  const tabsEl = document.getElementById('tax-year-tabs');
  if(tabsEl){
    tabsEl.innerHTML = years.map(y => {
      const hasData = !!_TAX_BRACKET_DATA[y];
      const active  = y === _taxBracketYear;
      return `<button onclick="selectTaxBracketYear(${y})"
        style="padding:6px 18px;border-radius:20px;font-size:12.5px;font-weight:700;
               border:1.5px solid ${active?'#3b82f6':'#e2e8f0'};
               background:${active?'#eff6ff':'#f8fafc'};
               color:${active?'#1d4ed8':'#64748b'};
               cursor:${hasData?'pointer':'not-allowed'};
               opacity:${hasData?'1':'0.45'};
               font-family:inherit;transition:all .15s;">
        ${y}년${y===curYear?' <span style="font-size:10px;background:#3b82f6;color:#fff;padding:1px 5px;border-radius:8px;margin-left:2px;">현재</span>':''}
      </button>`;
    }).join('');
  }
  _renderTaxBracketTable(_taxBracketYear);
}

function selectTaxBracketYear(y){
  if(!_TAX_BRACKET_DATA[y]) return;
  _taxBracketYear = y;
  // 구형 연도 선택 시 부양가족 1인으로 초기화
  if(!_isNewTaxFormat(y)) _taxBracketDep = 1;
  renderTaxBracketPanel();
}

function selectTaxBracketDep(dep){
  _taxBracketDep = parseInt(dep)||1;
  _renderTaxBracketTable(_taxBracketYear);
  // 검색값 유지 시 재검색
  const sv = document.getElementById('tax-bracket-search')?.value;
  if(sv) searchTaxBracket();
}

function _renderTaxBracketTable(year){
  const contentEl = document.getElementById('tax-bracket-content');
  if(!contentEl) return;

  const rows = _TAX_BRACKET_DATA[year];
  if(!rows){
    contentEl.innerHTML = `<div style="text-align:center;padding:32px;color:#9ca3af;font-size:13px;">
      ${year}년 간이세액표 데이터가 준비되지 않았습니다.
    </div>`;
    return;
  }

  const isNew  = _isNewTaxFormat(year);
  const dep    = isNew ? _taxBracketDep : 1;
  const maxDep = isNew ? 11 : 1;  // 신형은 최대 11인까지 허용 (표시용)

  // 실효세율 계산 헬퍼
  const effRate = (income, tax) => income > 0 ? (tax/income*100).toFixed(2) : '0.00';

  // 요약 통계
  const maxRow   = rows[rows.length-1];
  const firstRow = rows[0];
  const firstTax = _getTaxForDep(firstRow, dep);
  const maxTax   = _getTaxForDep(maxRow, dep);

  // 부양가족 선택 UI (신형만 표시)
  const depSelectorHTML = isNew ? `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;
                background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 14px;">
      <span style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap;">
        <i class="fas fa-users" style="color:#6366f1;margin-right:4px;"></i>부양가족 수
      </span>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${[1,2,3,4,5,6,7,8,9,10,11].map(n=>{
          const active = n === dep;
          const label  = n===1 ? '1인<span style="font-size:9.5px;display:block;line-height:1.1;">(본인만)</span>'
                       : n===11 ? '11인+' : `${n}인`;
          return `<button onclick="selectTaxBracketDep(${n})"
            style="min-width:44px;padding:5px 6px;border-radius:7px;font-size:11.5px;font-weight:700;line-height:1.3;
                   border:1.5px solid ${active?'#6366f1':'#e2e8f0'};
                   background:${active?'#eef2ff':'#fff'};
                   color:${active?'#4338ca':'#6b7280'};
                   cursor:pointer;font-family:inherit;transition:all .15s;text-align:center;">
            ${label}</button>`;
        }).join('')}
      </div>
      <div style="font-size:11.5px;color:#6b7280;margin-left:4px;">
        현재: <strong style="color:#4338ca;">${dep}인 기준</strong>
        ${dep===1 ? '<span style="font-size:10px;color:#9ca3af;">(본인 포함)</span>' : ''}
      </div>
    </div>
  ` : `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;
                background:#fef3c7;border:1.5px solid #fcd34d;border-radius:10px;padding:10px 14px;">
      <i class="fas fa-info-circle" style="color:#d97706;"></i>
      <span style="font-size:12px;color:#92400e;">${year}년 데이터는 <strong>부양가족 1인(본인만)</strong> 기준으로만 제공됩니다.</span>
    </div>
  `;

  const html = `
    ${depSelectorHTML}

    <!-- 요약 카드 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px;margin-bottom:18px;">
      <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;text-align:center;">
        <div style="font-size:10.5px;color:#1d4ed8;font-weight:600;margin-bottom:4px;">과세 시작 구간</div>
        <div style="font-size:15px;font-weight:800;color:#1e40af;">${(firstRow[0]/10000).toFixed(0)}만원</div>
        <div style="font-size:10px;color:#93c5fd;">이하 비과세</div>
      </div>
      <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fcd34d;border-radius:10px;padding:12px 16px;text-align:center;">
        <div style="font-size:10.5px;color:#92400e;font-weight:600;margin-bottom:4px;">표 최고 구간 소득세</div>
        <div style="font-size:15px;font-weight:800;color:#b45309;">${(maxRow[0]/10000).toFixed(0)}만원~</div>
        <div style="font-size:10px;color:#d97706;">${maxTax > 0 ? maxTax.toLocaleString('ko-KR')+'원~' : '비과세'}</div>
      </div>
      <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:10px;padding:12px 16px;text-align:center;">
        <div style="font-size:10.5px;color:#065f46;font-weight:600;margin-bottom:4px;">지방소득세</div>
        <div style="font-size:15px;font-weight:800;color:#065f46;">소득세 × 10%</div>
        <div style="font-size:10px;color:#34d399;">별도 납부</div>
      </div>
      <div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #a5b4fc;border-radius:10px;padding:12px 16px;text-align:center;">
        <div style="font-size:10.5px;color:#3730a3;font-weight:600;margin-bottom:4px;">현재 적용 기준</div>
        <div style="font-size:13px;font-weight:800;color:#3730a3;">부양가족 ${dep}인</div>
        <div style="font-size:10px;color:#818cf8;">${dep===1?'본인만 포함':dep+'인 기준 세액'}</div>
      </div>
    </div>

    <!-- 검색 입력 + 부양가족 선택 결과 -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
      <div class="search-input" style="max-width:260px;">
        <i class="fas fa-search"></i>
        <input type="number" id="tax-bracket-search" placeholder="월 과세급여 입력 (원)"
               oninput="searchTaxBracket()" style="font-family:inherit;"
               value="${document.getElementById('tax-bracket-search')?.value||''}" />
      </div>
      <div id="tax-bracket-search-result" style="font-size:12.5px;color:#374151;font-weight:600;"></div>
    </div>

    <!-- 표 -->
    <div class="table-wrap">
      <table class="tax-bracket-table" id="tax-bracket-table-main">
        <thead>
          <tr>
            <th rowspan="2" style="min-width:160px;">월 과세급여 구간</th>
            <th colspan="2" style="background:#eff6ff;color:#1d4ed8;">
              소득세 <span style="font-size:10px;background:#6366f1;color:#fff;padding:1px 6px;border-radius:8px;margin-left:4px;">부양가족 ${dep}인</span>
            </th>
            <th colspan="2" style="background:#f0fdf4;color:#065f46;">지방소득세</th>
          </tr>
          <tr>
            <th style="background:#eff6ff;color:#1d4ed8;">금액 (원)</th>
            <th style="background:#dbeafe;color:#1d4ed8;font-size:10.5px;">실효세율</th>
            <th style="background:#f0fdf4;color:#065f46;">금액 (원)</th>
            <th style="background:#dcfce7;color:#065f46;font-size:10.5px;">실효세율</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r,i) => {
            const from     = r[0], to = r[1];
            const tax      = _getTaxForDep(r, dep);
            const localTax = Math.round(tax * 0.1);
            const midIncome = (from+to)/2;
            const highlight = i % 2 === 0 ? '' : 'background:#fafbff;';
            const isZero    = tax === 0;
            return `<tr class="tax-row" data-from="${from}" data-to="${to}" data-tax="${tax}" data-local="${localTax}" style="${highlight}">
              <td class="tax-range">${(from/10000).toFixed(0)}만원 이상 ~ ${(to/10000).toFixed(0)}만원 미만</td>
              <td class="tax-income-tax"${isZero?' style="color:#9ca3af;"':''}>${isZero ? '<span style="color:#10b981;font-weight:700;">0</span>' : tax.toLocaleString('ko-KR')}</td>
              <td class="tax-rate-cell" style="font-size:11px;color:${isZero?'#10b981':'#3b82f6'};">${isZero?'비과세':effRate(midIncome,tax)+'%'}</td>
              <td class="tax-local-tax"${isZero?' style="color:#9ca3af;"':''}>${isZero ? '0' : localTax.toLocaleString('ko-KR')}</td>
              <td class="tax-rate-cell" style="font-size:11px;color:${isZero?'#10b981':'#10b981'};">${isZero?'비과세':effRate(midIncome,localTax)+'%'}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc;">
            <td colspan="5" style="font-size:11px;color:#9ca3af;text-align:left;padding:8px 14px;">
              ※ 소득세법 시행령 별표 2 근로소득 간이세액표 / 부양가족 <strong>${dep}인</strong> 기준 / 지방소득세 = 소득세 × 10%<br>
              ※ ${isNew ? '2025년 이후 부양가족 수 선택 기능 지원 · ' : ''}실제 공제액은 공제 항목에 따라 달라질 수 있습니다.
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
  contentEl.innerHTML = html;

  // 검색값이 있으면 즉시 재하이라이트
  const sv = document.getElementById('tax-bracket-search')?.value;
  if(sv) searchTaxBracket();
}

function searchTaxBracket(){
  const val = parseFloat(document.getElementById('tax-bracket-search')?.value);
  const resultEl = document.getElementById('tax-bracket-search-result');
  // 모든 행 초기화
  document.querySelectorAll('#tax-bracket-table-main .tax-row').forEach(tr=>{
    const bg = tr.style.background;
    // 기존 highlight 해제, zebra 유지
    if(bg === '#fef9c3') tr.style.background = '';
    tr.style.outline = '';
  });
  if(!val || isNaN(val)){
    if(resultEl) resultEl.textContent = '';
    return;
  }
  let found = null;
  document.querySelectorAll('#tax-bracket-table-main .tax-row').forEach(tr=>{
    const from = parseInt(tr.dataset.from);
    const to   = parseInt(tr.dataset.to);
    if(val >= from && val < to){
      tr.style.background = '#fef9c3';
      tr.style.outline = '2px solid #fbbf24';
      tr.scrollIntoView({behavior:'smooth', block:'center'});
      const tax      = parseInt(tr.dataset.tax)||0;
      const localTax = parseInt(tr.dataset.local)||0;
      found = {from, to, tax, localTax};
    }
  });
  if(resultEl){
    if(found){
      const dep = _isNewTaxFormat(_taxBracketYear) ? _taxBracketDep : 1;
      const depLabel = dep===1 ? '부양가족 1인(본인)' : `부양가족 ${dep}인`;
      resultEl.innerHTML = `<span style="font-size:11px;color:#6b7280;margin-right:4px;">[${depLabel}]</span>`
        + ` 소득세 <strong style="color:#1d4ed8;">${found.tax.toLocaleString('ko-KR')}원</strong>`
        + ` + 지방소득세 <strong style="color:#065f46;">${found.localTax.toLocaleString('ko-KR')}원</strong>`
        + ` = 합계 <strong style="color:#e94560;">${(found.tax+found.localTax).toLocaleString('ko-KR')}원</strong>`;
    } else {
      resultEl.innerHTML = `<span style="color:#9ca3af;">표 범위 외 (${Math.round(val/10000)}만원대)</span>`;
    }
  }
}

// ── 4대보험 요율 저장 ──
async function saveInsuranceRate(){
  const type  = document.getElementById('std-new-type').value;
  const year  = parseInt(document.getElementById('std-new-year').value);
  const start = document.getElementById('std-new-start').value;
  const end   = document.getElementById('std-new-end').value;
  const rate  = parseFloat(document.getElementById('std-new-rate').value);
  const cap   = parseInt(document.getElementById('std-new-cap').value)||0;
  const note  = document.getElementById('std-new-note').value.trim();
  if(!year||isNaN(year)) return toast('적용 연도를 입력하세요.','error');
  if(!start||!end)       return toast('적용 기간을 입력하세요.','error');
  if(!rate||isNaN(rate)) return toast('요율을 입력하세요.','error');
  const typeKey = {national_pension:'pension',health:'health',long_term_care:'ltcare',employment:'employment'}[type]||type;
  const id = `${typeKey}_${year}`;
  // 기존 레코드 있으면 PATCH, 없으면 POST
  const existing = _allInsuranceRates.find(r=>r.id===id);
  const body = { id, insurance_type:type, year, period_start:start, period_end:end, rate, rate_base: type==='long_term_care'?'건강보험료':'월보수액', cap_amount:cap, note };
  if(existing){
    await api(`../tables/insurance_rates/${existing.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  } else {
    await api('../tables/insurance_rates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  }
  await loadStandards();
  renderInsuranceRates();
  // 입력 초기화
  ['std-new-year','std-new-start','std-new-end','std-new-rate','std-new-cap','std-new-note'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  toast('요율이 업데이트 되었습니다. ✔','success');
  _renderStandardsBanner(); // 배너 재확인
  // 중요공지 자동 발송
  const _irTypeLabel = {national_pension:'국민연금 요율',health:'건강보험 요율',long_term_care:'장기요양보험 요율',employment:'고용보험 요율'}[type]||'4대보험 요율';
  await _gnSendStandardsUpdateNotice(
    _irTypeLabel,
    `■ 적용 연도: ${year}년\n■ 적용 기간: ${start} ~ ${end}\n■ 요율: ${rate}%${cap?'\n■ 상한금액: '+Number(cap).toLocaleString('ko-KR')+'원':''}`
  );
}

// ── 최저임금 저장 ──
async function saveMinimumWage(){
  const year    = parseInt(document.getElementById('mw-new-year').value);
  const hourly  = parseInt(document.getElementById('mw-new-hourly').value);
  const monthly = parseInt(document.getElementById('mw-new-monthly').value);
  const note    = document.getElementById('mw-new-note').value.trim();
  if(!year||isNaN(year))     return toast('연도를 입력하세요.','error');
  if(!hourly||isNaN(hourly)) return toast('시급을 입력하세요.','error');
  if(!monthly||isNaN(monthly)) return toast('월급여를 입력하세요.','error');
  const id = `mw_${year}`;
  const existing = _allMinimumWages.find(w=>w.id===id);
  const body = { id, year, hourly_wage:hourly, monthly_wage:monthly, note };
  if(existing){
    await api(`../tables/minimum_wages/${existing.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  } else {
    await api('../tables/minimum_wages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  }
  await loadStandards();
  renderMinimumWages();
  ['mw-new-year','mw-new-hourly','mw-new-monthly','mw-new-note'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  toast('최저임금이 업데이트 되었습니다. ✔','success');
  _renderStandardsBanner();
  // 중요공지 자동 발송
  await _gnSendStandardsUpdateNotice(
    `${year}년 최저임금`,
    `■ 시급: ${Number(hourly).toLocaleString('ko-KR')}원\n■ 월급여: ${Number(monthly).toLocaleString('ko-KR')}원`
  );
}

// ── 대시보드 산정기준 배너 ──
function _renderStandardsBanner(){
  const banner = document.getElementById('dash-standards-banner');
  if(!banner) return;
  const now    = new Date();
  const today  = now.toISOString().slice(0,10);
  const curYear= now.getFullYear();
  const month  = now.getMonth()+1; // 1~12
  const day    = now.getDate();
  const notices= [];

  // ① 국민연금: 매년 7월 1일 변경. 현재 기간 커버하는 데이터 없으면 알림
  const hasPension = _allInsuranceRates.some(r=>
    r.insurance_type==='national_pension' && today >= r.period_start && today <= r.period_end
  );
  // 6월 이후(새 적용기간 발표 예상) 또는 데이터 없을 때 알림
  if(!hasPension){
    notices.push({cls:'pension', icon:'🏛️',
      title: '국민연금 요율 업데이트 필요',
      desc:  `${curYear}년 7월 1일부터 적용될 국민연금 요율 및 상한금액을 입력해 주세요.`,
      tab:   'insurance'});
  } else if(month===6 && day>=15){
    // 6월 15일 이후엔 다음 기간 미리 알림
    const nextStart = `${curYear}-07-01`;
    const hasNext = _allInsuranceRates.some(r=>r.insurance_type==='national_pension' && r.period_start===nextStart);
    if(!hasNext) notices.push({cls:'pension', icon:'🏛️',
      title: `${curYear+1}년 7월 국민연금 요율 사전 입력 안내`,
      desc:  `7월 1일부터 적용될 국민연금 새 요율이 발표되면 미리 입력해 두세요.`,
      tab:   'insurance'});
  }

  // ② 건강보험: 매년 1월 1일 변경. 현재 연도 데이터 없으면 알림
  const hasHealth = _allInsuranceRates.some(r=>
    r.insurance_type==='health' && Number(r.year)===curYear
  );
  if(!hasHealth){
    notices.push({cls:'health', icon:'🏥',
      title: `${curYear}년 건강보험·장기요양 요율 업데이트 필요`,
      desc:  `${curYear}년 1월 1일부터 적용되는 건강보험 및 장기요양보험 요율을 입력해 주세요.`,
      tab:   'insurance'});
  } else if(month===12 && day>=1){
    const hasNextHealth = _allInsuranceRates.some(r=>r.insurance_type==='health' && Number(r.year)===(curYear+1));
    if(!hasNextHealth) notices.push({cls:'health', icon:'🏥',
      title: `${curYear+1}년 건강보험 요율 사전 입력 안내`,
      desc:  `내년 1월 1일부터 적용될 건강보험 새 요율이 발표되면 미리 입력해 두세요.`,
      tab:   'insurance'});
  }

  // ③ 최저임금: 매년 1월 1일 변경. 현재 연도 데이터 없으면 알림
  const hasMinWage = _allMinimumWages.some(w=> Number(w.year)===curYear);
  if(!hasMinWage){
    notices.push({cls:'minwage', icon:'💰',
      title: `${curYear}년 최저임금 업데이트 필요`,
      desc:  `${curYear}년 1월 1일부터 적용되는 최저임금(시급·월급여)을 입력해 주세요.`,
      tab:   'minwage'});
  } else if(month>=9){
    // 9월 이후 다음연도 최저임금 고시 예상
    const hasNextMW = _allMinimumWages.some(w=>Number(w.year)===(curYear+1));
    if(!hasNextMW) notices.push({cls:'minwage', icon:'💰',
      title: `${curYear+1}년 최저임금 사전 입력 안내`,
      desc:  `내년도 최저임금이 발표되면 최저임금표에 입력해 두세요. (보통 8~9월 고시)`,
      tab:   'minwage'});
  }

  if(!notices.length){ banner.style.display='none'; banner.innerHTML=''; return; }
  banner.style.display='';
  banner.innerHTML = notices.map(n=>`
    <div class="std-banner ${n.cls}" style="margin-bottom:8px;">
      <div class="std-banner-icon">${n.icon}</div>
      <div class="std-banner-body">
        <div class="std-banner-title" style="color:${n.cls==='minwage'?'#065f46':n.cls==='health'?'#991b1b':'#1e40af'};">${n.title}</div>
        <div class="std-banner-desc">${n.desc}</div>
      </div>
      <button class="std-banner-btn" onclick="showPage('standards',document.querySelector('[data-page=\\'standards\\']'));switchStdTab('${n.tab}')">
        입력하기
      </button>
    </div>`).join('');
}
