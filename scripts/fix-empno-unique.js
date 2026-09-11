/**
 * scripts/fix-empno-unique.js — 사원번호 전면 재발급 (고객사별 0001부터 연번)
 *
 * 부여 순서: 대표이사(companies.representatives) → 등기임원(registered_executives)
 *           → 특수관계인(related_party_workers) → 직원(employees, 입사일 기준)
 * 번호 체계: 4자리 연번 '0001', '0002', ...
 * 대상: 전 고객사 · 전 직원 (기존 사원번호 전량 삭제 후 재부여)
 *
 * 실행: node scripts/fix-empno-unique.js
 */
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const pad4 = n => String(n).padStart(4, '0');

const execCols = db.prepare('PRAGMA table_info(registered_executives)').all().map(c => c.name);
const relCols  = db.prepare('PRAGMA table_info(related_party_workers)').all().map(c => c.name);
const execOrder = execCols.includes('created_at') ? 'created_at, id' : 'id';
const relOrder  = relCols.includes('created_at') ? 'created_at, id' : 'id';

const companies = db.prepare('SELECT id, company_name, representatives FROM companies').all();
const log = [];
let totalAssigned = 0;

const tx = db.transaction(() => {
  for (const co of companies) {
    let seq = 1;
    const used = new Set();

    // 1) 대표자 (companies.representatives JSON)
    let reps = [];
    try { reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : (co.representatives || []); } catch(e) { reps = []; }
    if (Array.isArray(reps) && reps.length) {
      reps = reps.map(r => {
        const no = pad4(seq++);
        used.add(no);
        return { ...r, employee_number: no };
      });
      db.prepare('UPDATE companies SET representatives = ? WHERE id = ?')
        .run(JSON.stringify(reps), co.id);
      log.push(`${co.company_name || co.id} 대표자 ${reps.length}명 → 0001~${pad4(seq-1)}`);
    }

    // 2) 등기임원
    const execs = db.prepare(`SELECT id FROM registered_executives WHERE company_id = ? ORDER BY ${execOrder}`).all(co.id);
    execs.forEach(e => {
      const no = pad4(seq++);
      used.add(no);
      db.prepare('UPDATE registered_executives SET employee_number = ? WHERE id = ?').run(no, e.id);
    });
    if (execs.length) log.push(`${co.company_name || co.id} 등기임원 ${execs.length}명 → ${pad4(seq - execs.length)}~${pad4(seq-1)}`);

    // 3) 특수관계인
    const rels = db.prepare(`SELECT id FROM related_party_workers WHERE company_id = ? ORDER BY ${relOrder}`).all(co.id);
    rels.forEach(r => {
      const no = pad4(seq++);
      used.add(no);
      db.prepare('UPDATE related_party_workers SET employee_number = ? WHERE id = ?').run(no, r.id);
    });
    if (rels.length) log.push(`${co.company_name || co.id} 특수관계인 ${rels.length}명 → ${pad4(seq - rels.length)}~${pad4(seq-1)}`);

    // 4) 직원 (입사일 기준 연번, 입사일 없으면 마지막)
    const emps = db.prepare(`
      SELECT id, hire_date FROM employees WHERE company_id = ?
      ORDER BY (hire_date IS NULL OR hire_date = '') ASC, hire_date ASC, name ASC
    `).all(co.id);
    emps.forEach(e => {
      const no = pad4(seq++);
      used.add(no);
      db.prepare('UPDATE employees SET employee_number = ? WHERE id = ?').run(no, e.id);
    });
    if (emps.length) log.push(`${co.company_name || co.id} 직원 ${emps.length}명 → ${pad4(seq - emps.length)}~${pad4(seq-1)}`);
    totalAssigned += seq - 1;
  }
});
tx();

console.log('총 발급 수:', totalAssigned);
console.log(log.join('\n'));

// ── 검증 ──
const integrity = db.pragma('integrity_check');
console.log('integrity_check:', JSON.stringify(integrity));

const companiesFresh = db.prepare('SELECT id, company_name, representatives FROM companies').all();
const verify = [];
for (const co of companiesFresh) {
  const map = new Map();
  const add = (no, src) => {
    if (!no) return;
    const key = String(no).trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(src);
  };
  db.prepare('SELECT employee_number FROM employees WHERE company_id=?').all(co.id).forEach(r => add(r.employee_number, '직원'));
  db.prepare('SELECT employee_number FROM registered_executives WHERE company_id=?').all(co.id).forEach(r => add(r.employee_number, '임원'));
  db.prepare('SELECT employee_number FROM related_party_workers WHERE company_id=?').all(co.id).forEach(r => add(r.employee_number, '특수'));
  try {
    const reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : (co.representatives || []);
    if (Array.isArray(reps)) reps.forEach(r => add(r.employee_number, '대표'));
  } catch(e) {}
  const dupes = [...map.entries()].filter(([, v]) => v.length > 1);
  if (dupes.length) verify.push({ co: co.company_name, dupes });
}
console.log('중복 잔존 고객사 수:', verify.length);
if (verify.length) console.log(JSON.stringify(verify, null, 1));

db.close();
console.log('완료');
