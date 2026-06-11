/**
 * 테스트 데이터 보완 스크립트
 * - 직원: id_number(주민번호), address 누락분 생성
 * - 직원: phone 누락분 생성 (emp04_t6, emp04_t5, emp04_t7)
 * - 계약: monthly_salary_agreed 누락분 → base_salary + weekly_holiday_pay + 수당 합산
 * - 계약: con01_t05 (일용직) daily_wage=0 → 80,240원 보완
 * - 계약: cen-test-01 base_salary/monthly_salary_agreed null → 최저임금 기준 보완
 */

const fs   = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, '../data/db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

// ─── 헬퍼: 주민번호 생성 ────────────────────────────────────────────────────
// 입사일 기준 25~39세 생년 역산, seq로 생월/일 분산
function makeIdNumber(gender, hireDate, seq) {
  const hireYear  = parseInt((hireDate || '2024-01-01').slice(0, 4));
  const age       = 25 + (seq % 15);                    // 25~39세 분산
  const birthYear = hireYear - age;
  const bYear2    = String(birthYear).slice(2);          // 2자리 연도

  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const days   = ['01','05','10','12','15','18','20','22','25','28','07','14'];
  const bMonth = months[seq % 12];
  const bDay   = days[seq % 12];

  // 성별 코드: 2000년대생 남=3/여=4, 1900년대생 남=1/여=2
  const genderCode = birthYear < 2000
    ? (gender === '남' ? '1' : '2')
    : (gender === '남' ? '3' : '4');

  // 뒷 6자리: seq 기반 고유값 (체크섬은 테스트용이므로 패스)
  const tail = String(100001 + seq * 17).slice(1, 7);
  return `${bYear2}${bMonth}${bDay}-${genderCode}${tail}`;
}

// ─── 헬퍼: 고객사별 주소 풀 ─────────────────────────────────────────────────
const addressPools = {
  'comp01': [
    '서울시 강남구 테헤란로 123, 201호',
    '서울시 강남구 역삼동 456-7, 302호',
    '서울시 서초구 반포대로 89, 501호',
    '서울시 송파구 올림픽로 321, 703호',
    '서울시 강동구 천호대로 78, 1004호',
    '서울시 광진구 능동로 15, 201호',
    '서울시 성동구 왕십리로 56, 308호',
    '경기도 성남시 분당구 황새울로 258, 1201호',
    '경기도 용인시 기흥구 동백중앙로 16, 405호',
    '경기도 수원시 영통구 광교로 107, 607호',
    '경기도 화성시 동탄대로 607, 2002호',
    '경기도 안양시 동안구 평촌대로 123, 301호',
  ],
  'comp02': [
    '서울시 강서구 마곡중앙로 161, 505호',
    '서울시 양천구 목동서로 225, 301호',
    '서울시 구로구 디지털로 300, 1201호',
    '서울시 영등포구 당산로 123, 402호',
    '서울시 관악구 봉천로 456, 203호',
    '서울시 동작구 노량진로 78, 601호',
    '인천시 부평구 부평대로 168, 903호',
    '인천시 남동구 인하로 456, 701호',
    '경기도 부천시 원미구 길주로 40, 1102호',
    '경기도 김포시 김포한강4로 159, 304호',
  ],
  'comp03': [
    '서울시 중구 을지로 185, 601호',
    '서울시 종로구 인사동길 54, 302호',
    '서울시 마포구 홍익로 10, 1504호',
    '서울시 용산구 이태원로 245, 201호',
    '서울시 은평구 연서로 10, 403호',
    '서울시 서대문구 신촌로 77, 802호',
    '서울시 노원구 동일로 1234, 305호',
    '서울시 도봉구 도봉로 167, 1001호',
    '서울시 강북구 한천로 123, 204호',
    '경기도 고양시 일산서구 탄현로 55, 702호',
    '경기도 파주시 금촌로 45, 1301호',
    '경기도 남양주시 경춘로 33, 601호',
    '경기도 의정부시 의정부로 78, 401호',
    '경기도 구리시 인창로 25, 302호',
    '경기도 하남시 미사강변한강로 175, 804호',
    '경기도 광주시 경충대로 1, 503호',
    '경기도 이천시 부악로 42, 201호',
    '경기도 양평군 양평로 5, 102호',
  ],
  'comp04': [
    '경기도 안산시 단원구 산단로 123, 105호',
    '경기도 시흥시 공단1대로 68, 301호',
    '경기도 평택시 포승읍 평택항만길 56, 202호',
    '인천시 서구 청라국제대로 63, 605호',
    '경기도 화성시 서신면 홍법산로 789, 102호',
    '경기도 안성시 공도읍 공도로 33, 201호',
    '경기도 이천시 마장면 이평로 22, 104호',
    '충남 아산시 둔포면 아산밸리로 40, 303호',
    '경기도 오산시 오산로 50, 401호',
  ],
  'comp05': [
    '전남 나주시 빛가람로 601, 305호',
    '충남 당진시 합덕읍 도청로 10, 201호',
    '경북 경주시 양남면 해안로 123, 102호',
    '전북 부안군 계화면 간척4로 44, 104호',
    '충남 보령시 오천면 소성리 123-4',
    '강원 태백시 황지연못길 20, 201호',
    '경남 고성군 하이면 덕명리 50-2',
    '전남 영광군 홍농읍 계마리 1-1',
    '충북 청주시 서원구 산단로 15, 302호',
    '경남 밀양시 삼랑진읍 가수리 45-3',
    '전남 해남군 현산면 두모리 200-1',
    '강원 영월군 영월읍 동강로 25, 101호',
    '경북 울진군 평해읍 월송리 15-3',
    '충남 서산시 지곡면 도성리 22-5',
    '전북 고창군 공음면 선동리 33-7',
  ],
  'co-sev-test-01': [
    '서울시 강남구 논현로 508, 1001호',
    '서울시 서초구 강남대로 345, 802호',
    '서울시 강남구 선릉로 428, 1201호',
    '서울시 강남구 삼성로 512, 601호',
    '서울시 강남구 도산대로 156, 401호',
    '서울시 서초구 반포대로 304, 1102호',
    '서울시 서초구 효령로 77, 503호',
    '서울시 강남구 역삼로 204, 302호',
    '서울시 강남구 봉은사로 411, 904호',
    '서울시 강남구 삼성동 78-1 현대빌딩 201호',
  ],
};

function getAddress(companyId, seq) {
  const pool = addressPools[companyId] || addressPools['comp01'];
  return pool[seq % pool.length];
}

// ─── 직원 데이터 보완 ────────────────────────────────────────────────────────
let empUpdated = 0;
db.employees.forEach((emp, idx) => {
  const idn        = String(emp.id_number || '').replace(/-/g, '');
  const needsId    = !emp.id_number || idn.length < 7;
  const needsAddr  = !emp.address  || String(emp.address).trim() === '';
  const needsPhone = !emp.phone    || String(emp.phone).trim()   === '';

  if (!needsId && !needsAddr && !needsPhone) return;

  // seq: ID에서 숫자 추출, 없으면 배열 인덱스
  const numPart = emp.id.replace(/[^0-9]/g, '');
  const seq     = (numPart ? parseInt(numPart) : idx + 1);

  if (needsId) {
    emp.id_number = makeIdNumber(emp.gender || '남', emp.hire_date || '2024-01-01', seq);
  }
  if (needsAddr) {
    emp.address = getAddress(emp.company_id, seq);
  }
  if (needsPhone) {
    const mid  = String(1000 + (seq * 37 + 500) % 9000).padStart(4, '0');
    const last = String(1000 + (seq * 53 + 300) % 9000).padStart(4, '0');
    emp.phone = `010-${mid}-${last}`;
  }
  emp.updated_at = Date.now();
  empUpdated++;
});

console.log(`✅ 직원 업데이트: ${empUpdated}명`);

// ─── 계약 데이터 보완 ────────────────────────────────────────────────────────
let ctUpdated = 0;

// ① con01_t05: 일용직, daily_wage=0 → note에 기재된 80,240원으로 보완
const dailyCt = db.contracts.find(c => c.id === 'con01_t05');
if (dailyCt && (!dailyCt.daily_wage || parseFloat(dailyCt.daily_wage) === 0)) {
  dailyCt.daily_wage  = 80240;
  dailyCt.base_salary = 80240;
  dailyCt.hourly_wage = Math.round(80240 / 8);
  dailyCt.updated_at  = Date.now();
  console.log('✅ con01_t05 일용직 daily_wage → 80,240원');
  ctUpdated++;
}

// ② cen-test-01: base_salary null → 최저임금 기준 보완
const cenCt = db.contracts.find(c => c.id === 'cen-test-01');
if (cenCt && (!cenCt.base_salary || parseFloat(cenCt.base_salary) === 0)) {
  const base     = 2096270;                       // 2026년 최저임금 기준
  const wkHol    = Math.round(base / 5);          // 주5일 기준 주휴수당
  const meal     = 100000;
  const monthly  = base + wkHol + meal;
  cenCt.base_salary             = base;
  cenCt.weekly_holiday_pay      = wkHol;
  cenCt.meal_allowance          = meal;
  cenCt.transportation_allowance = 0;
  cenCt.monthly_salary_agreed   = monthly;
  cenCt.hourly_wage             = Math.round(monthly / 209);
  cenCt.updated_at              = Date.now();
  console.log(`✅ cen-test-01 기본급 ${base.toLocaleString()}원, 월합계 ${monthly.toLocaleString()}원`);
  ctUpdated++;
}

// ③ monthly_salary_agreed 누락 계약 (일용직 제외) → 수당 합산으로 계산
db.contracts.forEach(c => {
  if (c.contract_type === '일용직') return;
  const monthly = parseFloat(c.monthly_salary_agreed || 0);
  if (monthly > 0) return;
  const base = parseFloat(c.base_salary || 0);
  if (base === 0) return;  // 기본급도 없으면 스킵

  const computed =
      base
    + parseFloat(c.weekly_holiday_pay    || 0)
    + parseFloat(c.position_allowance    || 0)
    + parseFloat(c.transportation_allowance || c.car_maintenance || 0)
    + parseFloat(c.meal_allowance        || 0)
    + parseFloat(c.remote_area_allowance || 0)
    + parseFloat(c.childcare_allowance   || 0)
    + parseFloat(c.research_allowance    || 0)
    + parseFloat(c.site_allowance        || 0)
    + parseFloat(c.skill_allowance       || 0)
    + parseFloat(c.license_allowance     || 0)
    + parseFloat(c.communication_allowance || 0)
    + parseFloat(c.fitness_allowance     || 0)
    + parseFloat(c.self_dev_allowance    || 0)
    + parseFloat(c.book_allowance        || 0)
    + parseFloat(c.overseas_allowance    || 0);

  c.monthly_salary_agreed = computed;
  if (!c.hourly_wage || parseFloat(c.hourly_wage) === 0) {
    c.hourly_wage = Math.round(computed / 209);
  }
  c.updated_at = Date.now();
  ctUpdated++;
});

console.log(`✅ 계약 업데이트: ${ctUpdated}건`);

// ─── 저장 ────────────────────────────────────────────────────────────────────
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log('\n✅ db.json 저장 완료');
