// ═══════════════════════════════════════════════════════════════════════
// annual_salary 가드 트리거 (2026-09-03)
//   연봉(annual_salary)은 정규직·정규직 수습 계약에만 허용.
//   계약직·계약직 수습·일용직 계약에 연봉값이 INSERT/UPDATE로 들어오면
//   RAISE(ABORT)로 차단한다. (관련 DB구조 수정 — schema.sql에도 문서화)
// ═══════════════════════════════════════════════════════════════════════
const path = require('path');
const { DB } = require('../lib/database');
const db = new DB(path.join(__dirname, '..', 'data', 'app.db'));

const tx = db.connection.raw.transaction(() => {
  db.run(`DROP TRIGGER IF EXISTS trg_contracts_annual_insert`);
  db.run(`DROP TRIGGER IF EXISTS trg_contracts_annual_update`);
  db.run(`
    CREATE TRIGGER trg_contracts_annual_insert
    BEFORE INSERT ON contracts
    WHEN NEW.contract_type NOT IN ('regular','regular_probation')
      AND COALESCE(NEW.annual_salary, 0) <> 0
    BEGIN
      SELECT RAISE(ABORT, 'annual_salary는 정규직·정규직 수습 계약에만 허용됩니다');
    END;
  `);
  db.run(`
    CREATE TRIGGER trg_contracts_annual_update
    BEFORE UPDATE OF annual_salary, contract_type ON contracts
    WHEN NEW.contract_type NOT IN ('regular','regular_probation')
      AND COALESCE(NEW.annual_salary, 0) <> 0
    BEGIN
      SELECT RAISE(ABORT, 'annual_salary는 정규직·정규직 수습 계약에만 허용됩니다');
    END;
  `);
});
tx();
db.raw.pragma('wal_checkpoint(TRUNCATE)');

const triggers = db.all(`
  SELECT name, tbl_name FROM sqlite_master
  WHERE type='trigger' AND name LIKE 'trg_contracts_annual%'
`);
console.table(triggers);

// 가드 동작 검증: 비정규 계약에 연봉 1원이라도 쓰면 ABORT 되어야 함
let guardOk = false;
try {
  db.run(`INSERT INTO contracts (id, contract_type, annual_salary) VALUES ('__guard_test__', 'fixed_term', 1000)`);
} catch (e) {
  guardOk = /annual_salary/.test(String(e.message || ''));
}
db.run(`DELETE FROM contracts WHERE id = '__guard_test__'`);
console.log('guard test (fixed_term + annual_salary=1000 → ABORT):', guardOk ? 'PASS' : 'FAIL');
console.log('done');
