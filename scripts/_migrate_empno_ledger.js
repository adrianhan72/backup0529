/**
 * scripts/_migrate_empno_ledger.js — 사원번호 원장(employee_number_ledger) 생성 + 백필
 *
 * 정책:
 * - 사번은 숫자로만 관리 (비숫자는 존재 시 보존하되 시퀀스 제외)
 * - 부여된 번호: used (employee_id + assigned_at 기록, 파기 후에도 유지)
 * - 계약취소/재입사/해지로 해제된 번호: voided (이력 보존)
 * - 중간 공백(1~max 사이 미부여 번호): voided / reason='gap' (employee_id/assigned_at NULL)
 * - 부여 규칙: next = max(숫자 used/voided) + 1 (append-only)
 *
 * 실행: 서버 정지 상태에서 1회 실행. 멱등(INSERT OR IGNORE + CREATE TABLE IF NOT EXISTS).
 */
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuid } = require('uuid');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
db.pragma('journal_mode = WAL');

const NOW = Date.now();

// ── 1. 테이블 생성 ──
db.exec(`
CREATE TABLE IF NOT EXISTS employee_number_ledger (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL,
  employee_number TEXT NOT NULL,
  employee_id     TEXT,
  source_type     TEXT,
  status          TEXT NOT NULL,
  voided_reason   TEXT,
  assigned_at     INTEGER,
  voided_at       INTEGER,
  created_at      INTEGER,
  updated_at      INTEGER,
  UNIQUE(company_id, employee_number)
);
CREATE INDEX IF NOT EXISTS idx_eln_company       ON employee_number_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_eln_company_status ON employee_number_ledger(company_id, status);
`);

// ── 2. 정규화 헬퍼: 숫자 사번 → 표준 문자열 (앞0 제거), 비숫자 → 원문 ──
function normNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return String(parseInt(s, 10));
  return null; // 비숫자는 시퀀스 대상 아님 (존재 시 used로만 등록은 별도 처리)
}

const insertUsed = db.prepare(`
  INSERT OR IGNORE INTO employee_number_ledger
    (id, company_id, employee_number, employee_id, source_type, status, assigned_at, created_at)
  VALUES (?, ?, ?, ?, ?, 'used', ?, ?)
`);

let usedCount = 0;

function register(companyId, empNo, empId, sourceType, assignedAt) {
  if (!companyId || empNo === null || empNo === undefined || String(empNo).trim() === '') return;
  const norm = normNum(empNo);
  const val = norm !== null ? norm : String(empNo).trim();
  insertUsed.run(uuid(), companyId, val, empId || null, sourceType, assignedAt || NOW, NOW);
  usedCount++;
}

// ── 3. 백필: 직원(대표자 본인 포함) ──
{
  const rows = db.prepare(`
    SELECT id, company_id, employee_number, personnel_type, created_at FROM employees
  `).all();
  for (const r of rows) {
    const type = r.personnel_type === 'representative' ? 'representative' : 'employee';
    register(r.company_id, r.employee_number, r.id, type, r.created_at || NOW);
  }
}

// ── 4. 백필: 등기임원 / 특수관계인 ──
for (const [table, type] of [['registered_executives', 'executive'], ['related_party_workers', 'related_party']]) {
  const rows = db.prepare(`SELECT id, company_id, employee_number, created_at FROM ${table}`).all();
  for (const r of rows) register(r.company_id, r.employee_number, r.id, type, r.created_at || NOW);
}

// ── 5. 백필: 고객사 대표자 (companies.representatives JSON) ──
{
  const coRows = db.prepare(`SELECT id, company_name, representatives FROM companies`).all();
  for (const co of coRows) {
    let reps = [];
    try { reps = JSON.parse(co.representatives || '[]'); } catch (e) { reps = []; }
    for (const rep of reps) {
      if (rep && rep.employee_number) {
        register(co.id, rep.employee_number, rep.emp_id || rep.employee_id || null, 'representative', NOW);
      }
    }
  }
}

// ── 6. 중간 공백 → gap 파기 (회사별 1 ~ max 사이 미부여 숫자) ──
const insertGap = db.prepare(`
  INSERT OR IGNORE INTO employee_number_ledger
    (id, company_id, employee_number, employee_id, source_type, status, voided_reason, voided_at, created_at)
  VALUES (?, ?, ?, NULL, NULL, 'voided', 'gap', ?, ?)
`);
let gapCount = 0;
{
  const companies = db.prepare(`SELECT DISTINCT company_id FROM employee_number_ledger`).all();
  for (const { company_id } of companies) {
    const nums = db.prepare(`
      SELECT employee_number FROM employee_number_ledger
      WHERE company_id = ? AND employee_number GLOB '[0-9]*'
    `).all(company_id)
      .map(r => parseInt(r.employee_number, 10))
      .filter(n => !isNaN(n) && n > 0);
    if (!nums.length) continue;
    const usedSet = new Set(nums);
    const max = Math.max(...nums);
    for (let n = 1; n <= max; n++) {
      if (!usedSet.has(n)) {
        insertGap.run(uuid(), company_id, String(n), NOW, NOW);
        gapCount++;
      }
    }
  }
}

// ── 7. 결과 보고 ──
const stats = {
  used: usedCount,
  gapVoided: gapCount,
  byCompany: db.prepare(`
    SELECT company_id,
      SUM(CASE WHEN status='used' THEN 1 ELSE 0 END) used,
      SUM(CASE WHEN status='voided' AND voided_reason='gap' THEN 1 ELSE 0 END) gaps,
      MAX(CASE WHEN status='used' THEN CAST(employee_number AS INTEGER) ELSE 0 END) max_used
    FROM employee_number_ledger GROUP BY company_id
  `).all().map(r => ({ ...r, company: (db.prepare('SELECT company_name FROM companies WHERE id=?').get(r.company_id)||{}).company_name })),
};
console.log(JSON.stringify(stats, null, 1));

// ── 8. 체크포인트 (WAL 즉시 반영 룰) ──
const chk = db.pragma('wal_checkpoint(TRUNCATE)');
console.log('checkpoint:', JSON.stringify(chk));
console.log('integrity:', db.pragma('integrity_check', { simple: true }));
db.close();
