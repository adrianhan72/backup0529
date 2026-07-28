const db = JSON.parse(require('fs').readFileSync('data/db.json', 'utf8'));
const employees = db.employees || [];
const companies = db.companies || [];

const requiredFields = [
  'name', 'gender', 'employment_category', 'hire_date', 'id_number',
  'phone', 'status', 'company_id'
];

console.log(`전체 직원: ${employees.length}건\n`);

for (const f of requiredFields) {
  const missing = employees.filter(e => 
    e[f] === null || e[f] === undefined || e[f] === '' || e[f] === 0
  );
  if (missing.length > 0) {
    console.log(`${f}: ${missing.length}건 누락`);
    missing.slice(0, 5).forEach(e => {
      console.log(`  ${e.id} (${e.name || '이름없음'}, ${e.employment_category || '?'})`);
    });
  }
}

// company_id 연결 확인
const noCompany = employees.filter(e => {
  if (!e.company_id) return true;
  return !companies.find(c => c.id === e.company_id);
});
console.log(`\n연결된 회사 없음: ${noCompany.length}건`);
noCompany.forEach(e => console.log(`  ${e.id} ${e.name} company_id=${e.company_id}`));

// 중복 id_number 확인
const idNums = employees.filter(e => e.id_number).map(e => e.id_number);
const dupes = idNums.filter((v, i) => idNums.indexOf(v) !== i);
if (dupes.length > 0) console.log(`\n중복 주민번호: ${[...new Set(dupes)].join(', ')}`);

// status 비정상 값 확인
const badStatus = employees.filter(e => e.status && !['재직','퇴직'].includes(e.status));
if (badStatus.length > 0) {
  console.log(`\n비정상 status: ${badStatus.length}건`);
  badStatus.forEach(e => console.log(`  ${e.id} ${e.name} status=${e.status}`));
}
