const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.utils.book_new();

const COLS = ['No','사원번호','성명','부서','직책','고용형태',
  '근로일수','총근로시간','연장시간','야간시간','휴일시간',
  '기본급','주휴수당','직책수당','차량유지비','식대',
  '연장수당','야간수당','휴일수당','연차수당',
  '정기상여금','성과급','실비변상적급여','연구활동비','보육수당',
  '통신비','기술수당','면허수당','현장수당','위험수당',
  '벽지수당','체력증진비','자기계발비','도서지원비','해외근무수당',
  '기타수당','지급합계','보수월액',
  '소득세','지방소득세','건강보험','장기요양','국민연금','고용보험',
  '연말정산','건보정산','기타공제','공제합계','영수액','지급일','비고'];

// 명시적으로 51개 요소를 가진 행 생성
function row(no, empno, name, dept, pos, cat,
  wd, wh, oh, nh, hh,
  base, whol, posAlw, car, meal,
  otP, ntP, hlP, alP,
  bonus, perf, expense, research, childcare,
  comm, skill, license, site, hazard,
  remote, fitness, selfdev, book, overseas,
  etc, gross, std,
  incTax, localTax, health, ltCare, pension, empIns,
  yearend, healthAdj, advance, totalDed, net,
  payDate, note)
{
  return [
    no, empno, name, dept, pos, cat,
    wd, wh, oh, nh, hh,
    base, whol, posAlw, car, meal,
    otP, ntP, hlP, alP,
    bonus, perf, expense, research, childcare,
    comm, skill, license, site, hazard,
    remote, fitness, selfdev, book, overseas,
    etc, gross, std,
    incTax, localTax, health, ltCare, pension, empIns,
    yearend, healthAdj, advance, totalDed, net,
    payDate, note
  ];
}

const data = [
  row(1,'A001','홍길동','개발팀','대리','정규직',
    22,176,10,0,0,
    2000000,363636,200000,0,200000,
    150000,0,0,0,
    0,0,0,0,0,
    0,0,0,0,0,
    0,0,0,0,0,
    0,2563636,2200000,
    50000,5000,78000,10000,99000,19800,
    0,0,0,380000,2183636,
    '2026-07-25',''),
  row(2,'A002','김철수','영업팀','과장','정규직',
    22,176,0,5,0,
    2500000,454545,300000,200000,200000,
    0,25000,0,0,
    100000,0,0,0,0,
    0,0,0,0,0,
    0,0,0,0,0,
    0,3004545,2700000,
    70000,7000,95700,12400,121500,24300,
    0,0,0,450000,2554545,
    '2026-07-25',''),
  row(3,'A003','박지성','관리팀','사원','계약직',
    20,160,0,0,0,
    1800000,327272,0,0,150000,
    0,0,0,100000,
    0,0,0,0,0,
    0,0,0,0,0,
    0,0,0,0,0,
    50000,2177272,1950000,
    45000,4500,69100,9000,87750,17550,
    0,0,0,320000,1857272,
    '2026-07-25','계약만료 2026-12-31'),
];

// 검증
console.log('COLS:', COLS.length);
data.forEach((r, i) => {
  if (r.length !== COLS.length) console.log('ROW'+(i+1)+' LEN MISMATCH:', r.length, 'vs', COLS.length);
  console.log(' ROW'+(i+1), '[48]영수액='+r[48], '[49]지급일='+r[49], '[50]비고='+r[50]);
});

// Sheet 1
const ws1 = XLSX.utils.aoa_to_sheet([['[한빛노무법인] 임금대장 (편집용) - 2026년 07월'], COLS, ...data]);
ws1['!cols'] = COLS.map(c => ({wch: c==='No'?5:c==='비고'?18:11}));
XLSX.utils.book_append_sheet(wb, ws1, '임금대장');

// Sheet 2
const ws2 = XLSX.utils.aoa_to_sheet([
  ['[한빛노무법인] 근태 관리대장 - 2026년 07월'],
  ['직원명','날짜','유형','결근사유','지급율(%)','시간','종료일','비고'],
  ['홍길동','2026-07-03','결근','무단',0,'','',''],
  ['홍길동','2026-07-15','지각','',0,'09:45','',''],
  ['홍길동','2026-07-22','조퇴','',0,'15:30','',''],
  ['김철수','2026-07-08','결근','병가(무급)',0,'','',''],
  ['김철수','2026-07-10','결근','병가(무급)',0,'','',''],
  ['박지성','2026-07-12','결근','병가(유급)',70,'','2026-07-14','3일간'],
  ['박지성','2026-07-13','결근','병가(유급)',70,'','',''],
  ['박지성','2026-07-14','결근','병가(유급)',70,'','',''],
  [],[],[],['※ 무단·병가(무급)=100% 차감, 유급병가=회사지급율, 산재·출산·육아=제외'],
]);
ws2['!cols'] = [{wch:10},{wch:13},{wch:8},{wch:14},{wch:10},{wch:8},{wch:13},{wch:20}];
XLSX.utils.book_append_sheet(wb, ws2, '근태관리대장');

// Sheet 3
const ws3 = XLSX.utils.aoa_to_sheet([
  ['[한빛노무법인] 연차 관리대장'],
  ['직원명','기준년도','발생일수','사용일수','잔여일수','이월일수','비고'],
  ['홍길동',2026,15,3,12,0,''],
  ['홍길동',2025,15,12,0,3,'이월 3일→2026년'],
  ['김철수',2026,15,0,15,0,'신규입사(2026-03-01)'],
  ['박지성',2026,15,8,7,0,''],
  ['박지성',2025,15,10,0,5,'이월 5일→2026년'],
  [],[],[],['※ 입사일 기준, 1년 미만 1개월 개근 시 1일, 1년 이상 15일(2년마다 1일 가산)'],
]);
ws3['!cols'] = [{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:24}];
XLSX.utils.book_append_sheet(wb, ws3, '연차관리대장');

const outPath = path.join(__dirname, '..', 'data', 'generated', '근태_연차_예시_v3.xlsx');
XLSX.writeFile(wb, outPath);
console.log('OK:', outPath);
