/* =====================================================================
 * _hr_clear_orphan_emp_fields.js (멱등)
 *  - 근로계약이 한 번도 등록된 적 없는 직원(직원 유형)의 인사카드에
 *    잘못 남아 있는 계약 기반 필드를 초기화:
 *    employment_category, job_description, department, position → ''
 *  - 대상 판정: 비임시저장·비파기·비파기상태 계약이 0건인 직원
 *  - 실행 전 data/app.db 백업 생성 (bak_pre_hr_orphan_clear)
 * ===================================================================== */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const root = path.join(__dirname, '..');
const dbPath = path.join(root, 'data', 'app.db');
const bakPath = path.join(root, 'data', 'app.db.bak_pre_hr_orphan_clear');

if (!fs.existsSync(bakPath)) {
  fs.copyFileSync(dbPath, bakPath);
  console.log('[백업]', bakPath);
} else {
  console.log('[SKIP 백업] 이미 존재:', path.basename(bakPath));
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const emps = db.prepare(`SELECT id, name, company_id, employment_category, job_description, department, position
  FROM employees WHERE personnel_type = 'employee'`).all();

const hasReal = empId => db.prepare(
  `SELECT COUNT(*) n FROM contracts
   WHERE employee_id = ? AND (is_draft IS NULL OR is_draft = 0)
     AND (is_voided_by_amend IS NULL OR is_voided_by_amend = 0)
     AND (status IS NULL OR status <> 'voided')`
).get(empId).n > 0;

const upd = db.prepare(
  `UPDATE employees SET employment_category = '', job_description = '', department = '', position = '', updated_at = ? WHERE id = ?`
);

let done = 0;
for (const e of emps) {
  if (hasReal(e.id)) continue;
  const hasVal = [e.employment_category, e.job_description, e.department, e.position].some(v => v);
  if (!hasVal) continue;
  upd.run(Date.now(), e.id);
  console.log(`[초기화] ${e.name} (cat:${e.employment_category || '-'}, job:${e.job_description || '-'}, dept:${e.department || '-'}, pos:${e.position || '-'})`);
  done++;
}

console.log(`\n처리 ${done}건`);
db.close();
