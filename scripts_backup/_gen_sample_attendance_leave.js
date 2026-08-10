/**
 * 근태관리대장 + 연차관리대장 예시 엑셀 생성
 * node scripts/_gen_sample_attendance_leave.js
 */
const XLSX = require('xlsx-js-style');

const bd = (clr) => ({style:'thin', color:{rgb:clr}});
const border = (clr) => ({top:bd(clr), bottom:bd(clr), left:bd(clr), right:bd(clr)});
const fill = rgb => ({patternType:'solid', fgColor:{rgb}});
const font = (sz, bold, rgb) => ({name:'맑은 고딕', sz, bold, color:{rgb}});

const S_TITLE = { fill:fill('1A1A2E'), font:font(13,true,'FFFFFF'), alignment:{horizontal:'center',vertical:'center'}, border:border('1A1A2E') };
const S_HDR   = { fill:fill('1E293B'), font:font(9,true,'FFFFFF'), alignment:{horizontal:'center',vertical:'center'}, border:border('334155') };
const S_TEXT  = { font:font(9,false,'1E293B'), alignment:{horizontal:'left',vertical:'center'}, border:border('E5E7EB') };
const S_TEXT2 = { fill:fill('F8FAFC'), font:font(9,false,'1E293B'), alignment:{horizontal:'left',vertical:'center'}, border:border('E5E7EB') };
const S_VAL   = { font:font(9,false,'1E293B'), alignment:{horizontal:'right',vertical:'center'}, border:border('E5E7EB') };
const S_VAL2  = { fill:fill('F8FAFC'), font:font(9,false,'1E293B'), alignment:{horizontal:'right',vertical:'center'}, border:border('E5E7EB') };
const S_RED   = { fill:fill('FFF5F5'), font:font(9,true,'DC2626'), alignment:{horizontal:'right',vertical:'center'}, border:border('FECACA') };
const S_DED   = { fill:fill('FEF2F2'), font:font(9,true,'B91C1C'), alignment:{horizontal:'left',vertical:'center'}, border:border('FECACA') };

// 스타일 상수 (임금대장 호환)
const S_GROSS = { fill:fill('DBEAFE'), font:font(9,true,'1D4ED8'), alignment:{horizontal:'right',vertical:'center'}, border:border('BFDBFE') };
const S_DED2  = { fill:fill('FEE2E2'), font:font(9,true,'B91C1C'), alignment:{horizontal:'right',vertical:'center'}, border:border('FECACA') };
const S_NET   = { fill:fill('DCFCE7'), font:font(9,true,'059669'), alignment:{horizontal:'right',vertical:'center'}, border:border('BBF7D0') };
const footerFont = font(8,false,'6B7280');

// ========================================================
//  워크북 생성
// ========================================================
const wb = XLSX.utils.book_new();

// ── Sheet 1: 임금대장 (미리보기용 축약) ──
{
  const cols = ['No','사원번호','성명','부서','기본급','주휴수당','연장수당','지급합계','공제합계','영수액'];
  const data = [
    [1,'A001','홍길동','개발팀',2000000,363636,150000,2563636,380000,2183636],
    [2,'A002','김철수','영업팀',2500000,454545,0,3004545,450000,2554545],
    [3,'A003','박지성','관리팀',1800000,327272,0,2177272,320000,1857272],
  ];
  const cells = {}; let r = 0;
  const set = (r,c,v,s) => { cells[XLSX.utils.encode_cell({r,c})] = {t:typeof v==='number'?'n':'s',v,s}; };
  for(let c=0;c<cols.length;c++) set(r,c,c===0?'[한빛노무법인] 임금대장 (편집용) — 2026년 07월':'',S_TITLE);
  r++;
  cols.forEach((h,ci) => set(r,ci,h,S_HDR));
  r++;
  data.forEach((row,di) => {
    const sty = di%2===0?S_TEXT:S_TEXT2;
    const styV = di%2===0?S_VAL:S_VAL2;
    row.forEach((v,ci) => {
      if(ci<4) set(r,ci,v,sty);
      else if(ci===7) set(r,ci,v,S_GROSS);
      else if(ci===8) set(r,ci,v,S_DED2);
      else if(ci===9) set(r,ci,v,S_NET);
      else set(r,ci,v,styV);
    });
    r++;
  });
  const ws = {'!ref':XLSX.utils.encode_range({s:{r:0,c:0},e:{r:r-1,c:cols.length-1}})};
  Object.assign(ws, cells);
  ws['!cols'] = cols.map(()=>({wch:12}));
  XLSX.utils.book_append_sheet(wb, ws, '임금대장');
}

// ── Sheet 2: 근태관리대장 ──
{
  const ATT_COLS = 8;
  const attHeaders = ['직원명','날짜','유형','결근사유','지급율(%)','시간','종료일','비고'];
  const attData = [
    ['홍길동','2026-07-03','결근','무단','0','','',''],
    ['홍길동','2026-07-15','지각','','0','09:45','',''],
    ['홍길동','2026-07-22','조퇴','','0','15:30','',''],
    ['김철수','2026-07-08','결근','병가(무급)','0','','',''],
    ['김철수','2026-07-10','결근','병가(무급)','0','','',''],
    ['박지성','2026-07-12','결근','병가(유급)','70','','2026-07-14','3일간'],
    ['박지성','2026-07-13','결근','병가(유급)','70','','',''],
    ['박지성','2026-07-14','결근','병가(유급)','70','','',''],
  ];
  const cells = {}; let r = 0;
  const set = (r,c,v,s) => { cells[XLSX.utils.encode_cell({r,c})] = {t:typeof v==='number'?'n':'s',v,s}; };
  for(let c=0;c<ATT_COLS;c++) set(r,c,c===0?'[한빛노무법인] 근태 관리대장 — 2026년 07월':'',S_TITLE);
  r++;
  attHeaders.forEach((h,ci) => set(r,ci,h,S_HDR));
  r++;
  let prevName = '';
  attData.forEach((row,di) => {
    const isNewEmp = row[0] !== prevName;
    prevName = row[0];
    const sty = di%2===0?S_TEXT:S_TEXT2;
    const styV = di%2===0?S_VAL:S_VAL2;
    const isDed = row[2]==='결근' && (row[3]==='무단'||row[3]==='병가(무급)');
    row.forEach((v,ci) => {
      if(ci===4) set(r,ci,v==='0'?0:Number(v),isDed?S_RED:styV);
      else if(ci===3 && isDed) set(r,ci,v,S_DED);
      else set(r,ci,v,sty);
    });
    r++;
  });
  // 하단 범례
  r++;
  set(r,0,'※ 결근 유형: 무단=100% 차감, 병가(무급)=100% 차감, 병가(유급)=회사지급율에 따름, 산재/출산/육아휴직=차감 제외',footerFont);
  const ws = {'!ref':XLSX.utils.encode_range({s:{r:0,c:0},e:{r:r-1,c:ATT_COLS-1}})};
  Object.assign(ws, cells);
  ws['!cols'] = [{wch:10},{wch:13},{wch:8},{wch:14},{wch:10},{wch:8},{wch:13},{wch:15}];
  XLSX.utils.book_append_sheet(wb, ws, '근태관리대장');
}

// ── Sheet 3: 연차관리대장 ──
{
  const LV_COLS = 7;
  const lvHeaders = ['직원명','기준년도','발생일수','사용일수','잔여일수','이월일수','비고'];
  const lvData = [
    ['홍길동',2026,15,3,12,0,''],
    ['홍길동',2025,15,12,0,3,'이월 3일→2026년'],
    ['김철수',2026,15,0,15,0,'신규입사(2026-03-01)'],
    ['박지성',2026,15,8,7,0,''],
    ['박지성',2025,15,10,0,5,'이월 5일→2026년'],
  ];
  const cells = {}; let r = 0;
  const set = (r,c,v,s) => { cells[XLSX.utils.encode_cell({r,c})] = {t:typeof v==='number'?'n':'s',v,s}; };
  for(let c=0;c<LV_COLS;c++) set(r,c,c===0?'[한빛노무법인] 연차 관리대장':'',S_TITLE);
  r++;
  lvHeaders.forEach((h,ci) => set(r,ci,h,S_HDR));
  r++;
  let prevName2 = '';
  lvData.forEach((row,di) => {
    const isNewEmp = row[0] !== prevName2;
    prevName2 = row[0];
    const sty = di%2===0?S_TEXT:S_TEXT2;
    const styV = di%2===0?S_VAL:S_VAL2;
    row.forEach((v,ci) => {
      if(ci>=2 && ci<=5) set(r,ci,v,styV);
      else set(r,ci,v,sty);
    });
    r++;
  });
  r++;
  set(r,0,'※ 연차 발생 기준: 입사일 기준, 1년 미만 1개월 개근 시 1일, 1년 이상 15일(2년마다 1일 가산)',footerFont);
  const ws = {'!ref':XLSX.utils.encode_range({s:{r:0,c:0},e:{r:r-1,c:LV_COLS-1}})};
  Object.assign(ws, cells);
  ws['!cols'] = [{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:22}];
  XLSX.utils.book_append_sheet(wb, ws, '연차관리대장');
}

// ── 저장 ──
const wbout = XLSX.write(wb, { cellStyles:true, bookType:'xlsx', type:'buffer' });
const fs = require('fs');
const outPath = __dirname + '/../data/generated/근태_연차_예시_2026년07월.xlsx';
fs.mkdirSync(require('path').dirname(outPath), {recursive:true});
fs.writeFileSync(outPath, wbout);
console.log('✅ 예시 파일 생성 완료:', outPath);
