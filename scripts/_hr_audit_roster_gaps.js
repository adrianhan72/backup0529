/**
 * scripts/_hr_audit_roster_gaps.js
 *
 * 전 고객사 인사관리대장 누락 점검 (dry-run, 데이터 변경 없음):
 *  1) companies.representatives JSON(및 단일 representative 값)의 대표자가
 *     employees에 representative로 존재하는지
 *  2) registered_executives의 등기임원이 employees에 executive로 존재하는지
 *  3) related_party_workers의 특수관계인이 employees에 related로 존재하는지
 *
 * 누락 발견 시 → node scripts/_hr_personnel_types.js 실행으로 보완
 */
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));

const findEmp = (companyId, empNo, name) => {
  if (empNo) {
    const byNo = db.prepare(`SELECT * FROM employees WHERE company_id=? AND employee_number=? LIMIT 1`).get(companyId, String(empNo).trim());
    if (byNo) return byNo;
  }
  if (name) return db.prepare(`SELECT * FROM employees WHERE company_id=? AND name=? LIMIT 1`).get(companyId, String(name).trim());
  return null;
};

const gaps = { reps: [], execs: [], rels: [] };

// ── 1) 대표자 ──
for (const co of db.prepare(`SELECT id, company_name, representative, representatives FROM companies`).all()) {
  let reps = [];
  if (co.representatives) {
    try { reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : co.representatives; } catch (e) { reps = []; }
  }
  if (!Array.isArray(reps)) reps = [];
  if (reps.length === 0 && co.representative) reps = [{ name: co.representative, employee_number: '' }];
  for (const r of reps) {
    if (!r || !r.name) continue;
    const emp = findEmp(co.id, r.employee_number, r.name);
    if (!emp) gaps.reps.push({ company: co.company_name, name: r.name, empno: r.employee_number || '-' });
    else if (emp.personnel_type !== 'representative') gaps.reps.push({ company: co.company_name, name: r.name, empno: emp.employee_number, issue: '유형 불일치: ' + emp.personnel_type });
  }
}

// ── 2) 등기임원 ──
for (const ex of db.prepare(`SELECT id, company_id, name, employee_number FROM registered_executives`).all()) {
  const co = db.prepare(`SELECT company_name FROM companies WHERE id=?`).get(ex.company_id);
  const emp = findEmp(ex.company_id, ex.employee_number, ex.name);
  if (!emp) gaps.execs.push({ company: co?.company_name || ex.company_id, name: ex.name, empno: ex.employee_number || '-' });
  else if (emp.personnel_type !== 'executive') gaps.execs.push({ company: co?.company_name || ex.company_id, name: ex.name, empno: emp.employee_number, issue: '유형 불일치: ' + emp.personnel_type });
}

// ── 3) 특수관계인 ──
for (const r of db.prepare(`SELECT id, company_id, name, employee_number FROM related_party_workers`).all()) {
  const co = db.prepare(`SELECT company_name FROM companies WHERE id=?`).get(r.company_id);
  const emp = findEmp(r.company_id, r.employee_number, r.name);
  if (!emp) gaps.rels.push({ company: co?.company_name || r.company_id, name: r.name, empno: r.employee_number || '-' });
  else if (emp.personnel_type !== 'related') gaps.rels.push({ company: co?.company_name || r.company_id, name: r.name, empno: emp.employee_number, issue: '유형 불일치: ' + emp.personnel_type });
}

const total = gaps.reps.length + gaps.execs.length + gaps.rels.length;
console.log('=== 인사관리대장 누락 점검 결과 ===');
console.log('대표자 누락:', JSON.stringify(gaps.reps, null, 0));
console.log('등기임원 누락:', JSON.stringify(gaps.execs, null, 0));
console.log('특수관계인 누락:', JSON.stringify(gaps.rels, null, 0));
console.log(`총 누락: ${total}건`);
