const db = require('better-sqlite3')('data/app.db');

const execs = db.prepare('SELECT * FROM registered_executives ORDER BY company_id').all();
const rels = db.prepare('SELECT * FROM related_party_workers ORDER BY company_id').all();

const companyEmpNos = {};
const allEmps = db.prepare("SELECT company_id, employee_number FROM employees WHERE employee_number IS NOT NULL AND employee_number != ''").all();
allEmps.forEach(e => {
  if (!companyEmpNos[e.company_id]) companyEmpNos[e.company_id] = new Set();
  const num = parseInt(e.employee_number);
  if (!isNaN(num)) companyEmpNos[e.company_id].add(num);
});

function assignEmpNos(records) {
  for (const r of records) {
    if (r.employee_number) continue;
    const used = companyEmpNos[r.company_id] || new Set();
    let next = 1;
    while (used.has(next)) next++;
    const newNo = String(next).padStart(4, '0');
    used.add(next);
    r._newEmpNo = newNo;
  }
}

assignEmpNos(execs);
assignEmpNos(rels);

let count = 0;
for (const r of execs) {
  if (r._newEmpNo) {
    db.prepare('UPDATE registered_executives SET employee_number = ? WHERE id = ?').run(r._newEmpNo, r.id);
    console.log('등기임원 ' + r.name + ' (' + r.company_id + ') → 사원번호: ' + r._newEmpNo);
    count++;
  }
}
for (const r of rels) {
  if (r._newEmpNo) {
    db.prepare('UPDATE related_party_workers SET employee_number = ? WHERE id = ?').run(r._newEmpNo, r.id);
    console.log('특수관계인 ' + r.name + ' (' + r.company_id + ') → 사원번호: ' + r._newEmpNo);
    count++;
  }
}
console.log('Fixed ' + count + ' employee numbers');
