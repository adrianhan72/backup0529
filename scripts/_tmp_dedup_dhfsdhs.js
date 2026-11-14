// 임시 정리: dhfsdhs(dafhfhadh) 중복 3건 → 1건(임시저장→등록 플로우)만 유지
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
db.pragma('foreign_keys = ON');

// 대상: 대표자 dhfsdhs 또는 회사명 dafhfhadh
const cos = db.prepare(
  `SELECT id, company_name, representative, access_code, created_at
   FROM companies
   WHERE representative LIKE '%dhfsdhs%' OR company_name LIKE '%dhfsdhs%' OR company_name LIKE '%dafhfhadh%'
   ORDER BY created_at`
).all();
console.log('중복 후보:', cos.length);
cos.forEach(c => console.log(' -', c.id, c.company_name, c.representative, c.access_code));

// 유지: 임시저장→등록 플로우(comp_draft_...) — 가장 마지막 생성
const keep = cos.find(c => c.id.startsWith('comp_draft_')) || cos[cos.length - 1];
const del = cos.filter(c => c.id !== keep.id);
console.log('\n유지:', keep.id);
console.log('삭제 대상:', del.map(c => c.id).join(', '));

const tx = db.transaction(() => {
  for (const c of del) {
    const empDel = db.prepare('DELETE FROM employees WHERE company_id=?').run(c.id).changes;
    const histDel = db.prepare('DELETE FROM company_history WHERE company_id=?').run(c.id).changes;
    const notiDel = db.prepare('DELETE FROM company_notices WHERE company_id=?').run(c.id).changes;
    const ledgDel = db.prepare('DELETE FROM employee_number_ledger WHERE company_id=?').run(c.id).changes;
    const coDel = db.prepare('DELETE FROM companies WHERE id=?').run(c.id).changes;
    console.log(`[${c.id}] employees=${empDel} history=${histDel} notices=${notiDel} ledger=${ledgDel} companies=${coDel}`);
  }
});
tx();

// 검증
const left = db.prepare(
  `SELECT id, company_name, representative, access_code, is_draft FROM companies
   WHERE representative LIKE '%dhfsdhs%' OR company_name LIKE '%dafhfhadh%'`
).all();
console.log('\n남은 건수:', left.length);
left.forEach(c => console.log('남음:', JSON.stringify(c)));
db.close();
