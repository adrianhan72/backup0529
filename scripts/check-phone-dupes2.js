const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const emps = db.employees || [];
const cos = db.companies || [];

// 전체 전화번호 수집 (하이픈 제거해서 비교)
const allPhones = {};
function addPhone(type, id, name, phone) {
  const key = (phone || '').replace(/-/g, '');
  if (!key) return;
  if (!allPhones[key]) allPhones[key] = [];
  allPhones[key].push({ type, id, name, phone });
}

cos.forEach(co => addPhone('회사', co.id, co.company_name, co.phone));
emps.forEach(e => addPhone('직원', e.id, e.name, e.phone));

// 중복 (2개 이상)
const dupes = Object.entries(allPhones).filter(([k, v]) => v.length > 1);
console.log(`전체 전화번호 ${Object.keys(allPhones).length}개 중 ${dupes.length}개 중복\n`);

if (dupes.length > 0) {
  dupes.forEach(([key, entries]) => {
    console.log(`${entries[0].phone}:`);
    entries.forEach(e => console.log(`  ${e.type}: ${e.id} ${e.name}`));
    console.log();
  });
}
