// ═══════════════════════════════════════════════════════════════════════
// annual_salary 정규화 (2026-09-03)
//   계약직 월약정급여(통상월급) 중복 필드 제거 후속 — 연봉(annual_salary)은
//   정규직·정규직 수습 전용. 계약직·일용직에 레거시로 저장된 연봉값(실제로는
//   월약정급여/일급 값)을 0으로 초기화한다.
//   ※ 급여 계산은 monthly_salary_agreed/base_salary/hourly_wage를 사용하므로
//     계산 결과에는 영향 없음 (표시 정합성 목적).
// ═══════════════════════════════════════════════════════════════════════
const path = require('path');
const { DB } = require('../lib/database');
const db = new DB(path.join(__dirname, '..', 'data', 'app.db'));

const before = db.all(`
  SELECT contract_type, COUNT(*) AS n
  FROM contracts WHERE COALESCE(annual_salary,0) > 0
  GROUP BY contract_type
`);

const tx = db.connection.raw.transaction(() => {
  db.run(`
    UPDATE contracts SET annual_salary = 0
    WHERE contract_type NOT IN ('regular', 'regular_probation')
      AND COALESCE(annual_salary, 0) > 0
  `);
});
tx();
db.raw.pragma('wal_checkpoint(TRUNCATE)');

const after = db.all(`
  SELECT contract_type, COUNT(*) AS n
  FROM contracts WHERE COALESCE(annual_salary,0) > 0
  GROUP BY contract_type
`);

console.log('BEFORE (annual_salary > 0):');
console.table(before);
console.log('AFTER (annual_salary > 0):');
console.table(after);
console.log('done');
