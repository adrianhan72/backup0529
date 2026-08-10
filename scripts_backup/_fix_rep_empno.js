/**
 * scripts/_fix_rep_empno.js
 * 대표자(representatives) JSON에서 employee_number가 누락된 항목들을
 * employees 테이블에 등록하고 representatives JSON을 갱신한다.
 */
const path = require('path');
const { DB } = require('../lib/database');
const db = new DB(path.join(__dirname, '..', 'data', 'app.db'));

const { v4: uuid } = require('uuid');

console.log('=== 대표자 사원번호 생성 시작 ===\n');

// 1. 회사별 사용 중인 최대 사원번호 캐시
const maxNumCache = {};
function getNextEmpNo(companyId) {
  if (maxNumCache[companyId] === undefined) {
    const row = db.get(
      'SELECT MAX(CAST(employee_number AS INTEGER)) as mx FROM employees WHERE company_id = ?',
      [companyId]
    );
    maxNumCache[companyId] = (row?.mx || 0) + 1;
  }
  return maxNumCache[companyId]++;
}

// 2. 이름+회사로 기존 직원 찾기
function findExistingEmployee(companyId, name) {
  return db.get(
    'SELECT id, employee_number FROM employees WHERE company_id = ? AND name = ?',
    [companyId, name]
  );
}

// 3. 모든 고객사 조회
const companies = db.all(
  'SELECT id, company_name, representatives FROM companies WHERE representatives IS NOT NULL'
);

let created = 0;
let updated = 0;
let skipped = 0;

for (const c of companies) {
  let reps = [];
  try {
    reps = typeof c.representatives === 'string'
      ? JSON.parse(c.representatives)
      : c.representatives;
  } catch (e) {
    console.log(`  [SKIP] ${c.company_name}: JSON 파싱 실패`);
    continue;
  }
  if (!Array.isArray(reps) || reps.length === 0) continue;

  let modified = false;
  for (let i = 0; i < reps.length; i++) {
    const r = reps[i];
    if (r.employee_number) continue; // 이미 있음

    // 기존 직원 레코드 확인
    const existing = findExistingEmployee(c.id, r.name);

    if (existing) {
      // 이미 employees에 등록되어 있으면 그 번호 사용
      r.employee_number = existing.employee_number;
      modified = true;
      skipped++;
      console.log(`  [SKIP] ${c.company_name} / ${r.name}: 기존 직원 (${existing.employee_number}) 재사용`);
    } else {
      // 새 직원 생성
      const newEmpNo = String(getNextEmpNo(c.id)).padStart(4, '0');
      const empId = uuid();
      db.run(
        `INSERT INTO employees (id, company_id, name, employee_number, phone, email, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now','localtime'))`,
        [empId, c.id, r.name, newEmpNo, r.phone || '', r.email || '']
      );
      r.employee_number = newEmpNo;
      modified = true;
      created++;
      console.log(`  [CREATE] ${c.company_name} / ${r.name}: empno=${newEmpNo} (신규 직원 등록)`);
    }
  }

  if (modified) {
    db.run('UPDATE companies SET representatives = ? WHERE id = ?', [
      JSON.stringify(reps),
      c.id,
    ]);
    updated++;
  }
}

console.log(`\n=== 완료: 생성 ${created}건, 기존재사용 ${skipped}건, 업데이트된 회사 ${updated}개 ===`);
db.close();
