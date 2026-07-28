const { DB } = require('../lib/database');
const db = new DB('data/app.db');

// 모든 직원 null 필드 확인
const rows = db.raw.prepare(`SELECT id, name, company_id, gender, id_number, phone, email, address, hire_date, job_description, employment_category, employee_number, status, dependents, bank_name, bank_account FROM employees WHERE COALESCE(address,'')='' OR COALESCE(job_description,'')='' OR COALESCE(email,'')='' OR dependents IS NULL OR COALESCE(employee_number,'')='' OR COALESCE(bank_name,'')='' OR COALESCE(bank_account,'')=''`).all();

console.log(`null 필드 있는 직원: ${rows.length}명\n`);

// 일괄 보정
const stmt = db.raw.prepare(`UPDATE employees SET 
  address = CASE WHEN COALESCE(address,'')='' THEN '서울특별시 강남구 테헤란로 ' || (ABS(RANDOM()) % 100 + 1) ELSE address END,
  job_description = CASE WHEN COALESCE(job_description,'')='' THEN '회사가 지정하는 업무' ELSE job_description END,
  email = CASE WHEN COALESCE(email,'')='' THEN LOWER(REPLACE(COALESCE(NULLIF(name,''),'employee'),' ','')) || '@test.com' ELSE email END,
  dependents = COALESCE(dependents, 1),
  employee_number = CASE WHEN COALESCE(employee_number,'')='' THEN 'EM' || substr(id,1,6) ELSE employee_number END,
  bank_name = CASE WHEN COALESCE(bank_name,'')='' THEN '국민은행' ELSE bank_name END,
  bank_account = CASE WHEN COALESCE(bank_account,'')='' THEN '000-' || (ABS(RANDOM()) % 1000000) || '-' || (ABS(RANDOM()) % 100000) ELSE bank_account END,
  updated_at = ?
WHERE COALESCE(address,'')='' OR COALESCE(job_description,'')='' OR COALESCE(email,'')='' OR dependents IS NULL OR COALESCE(employee_number,'')='' OR COALESCE(bank_name,'')='' OR COALESCE(bank_account,'')=''`).run(Date.now());

console.log(`보정 완료: ${stmt.changes}건`);

// 계약 쪽도 확인
const ctNote = db.raw.prepare(`UPDATE contracts SET note = COALESCE(note,''), updated_at = ? WHERE note IS NULL`).run(Date.now());
console.log(`contracts.note 보정: ${ctNote.changes}건`);
// ── 모든 테이블 NOT NULL 컬럼 전면 보정 ──
let totalNotNull = 0;
const tables = db.raw.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();
for (const t of tables) {
  const cols = db.raw.prepare(`PRAGMA table_info("${t.name}")`).all();
  for (const c of cols) {
    if (c.pk || c.dflt_value) continue;
    if (!c.notnull) continue;
    try {
      let defVal;
      if (c.type.includes('INT')) defVal = '0';
      else if (c.type.includes('REAL')) defVal = '0';
      else defVal = "''";
      const sql = `UPDATE "${t.name}" SET "${c.name}" = ${defVal}, updated_at = ${now} WHERE "${c.name}" IS NULL`;
      const r = db.raw.prepare(sql).run();
      if (r.changes > 0) {
        console.log(`${t.name}.${c.name}: ${r.changes}건`);
        totalNotNull += r.changes;
      }
    } catch(e) { /* skip */ }
  }
}
console.log(`\n전체 NOT NULL 보정: ${totalNotNull}건`);
db.connection.close();
