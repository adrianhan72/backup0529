const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const emps = db.employees || [];
const cos = db.companies || [];

// 회사별로 전화번호 수집 (직원 + 회사 대표전화)
const byCo = {};
cos.forEach(co => {
  if (!byCo[co.id]) byCo[co.id] = { name: co.company_name, phones: {} };
  // 회사 대표전화
  if (co.phone) {
    const key = co.phone.replace(/-/g, '');
    if (!byCo[co.id].phones[key]) byCo[co.id].phones[key] = [];
    byCo[co.id].phones[key].push({ type: '회사', id: co.id, name: co.company_name, phone: co.phone });
  }
});

emps.forEach(e => {
  if (!e.company_id || !e.phone) return;
  const cid = e.company_id;
  if (!byCo[cid]) byCo[cid] = { name: cid, phones: {} };
  const key = e.phone.replace(/-/g, '');
  if (!byCo[cid].phones[key]) byCo[cid].phones[key] = [];
  byCo[cid].phones[key].push({ type: '직원', id: e.id, name: e.name, phone: e.phone, emp: e });
});

// 중복 찾기
let totalDupes = 0;
Object.keys(byCo).sort().forEach(cid => {
  const co = byCo[cid];
  Object.keys(co.phones).forEach(key => {
    const entries = co.phones[key];
    if (entries.length > 1) {
      console.log(`\n${co.name} (${cid}): ${entries[0].phone}`);
      entries.forEach(en => console.log(`  ${en.type}: ${en.id} ${en.name}`));
      totalDupes += entries.length - 1;
    }
  });
});

console.log(`\n총 중복 건수: ${totalDupes}`);
