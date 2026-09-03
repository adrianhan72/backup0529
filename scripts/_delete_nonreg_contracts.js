// ═══════════════════════════════════════════════════════════════════════
// 비정규(계약직·계약직수습·일용직) 계약 + 연관 데이터 일괄 삭제 (2026-09-03)
//   · 레거시 연봉값(월약정급여/일급 복제값) 보유 계약 정리 후속.
//   · 연봉 0화로 원래 33건을 구분할 수 없어 비정규 계약 전체를 대상으로 함
//     (사용자 지시: "연봉값이 0인 계약들을 찾아서 삭제").
//   · 삭제 범위: 계약, 계약서 발송이력, 만료안내, 앱 알림, 카카오 발송이력,
//     급여대장(+항목+발송이력), 근태관리대장, 연차관리대장, 연차촉진이력.
//   · 인사카드(employees)는 보존.
//   · DB 백업: app.db.bak_pre_nonreg_cleanup_20260903
// ═══════════════════════════════════════════════════════════════════════
const path = require('path');
const fs = require('fs');
const { DB } = require('../lib/database');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const BAK_PATH = path.join(DATA_DIR, 'app.db.bak_pre_nonreg_cleanup_20260903');

// 1) 백업 (WAL 반영 후 — 서버 실행 중일 수 있음)
if (fs.existsSync(BAK_PATH)) {
  console.log('[백업] 기존 백업 존재 → 덮어쓰지 않고 종료');
  process.exit(1);
}
{
  const preDb = new DB(DB_PATH);
  preDb.raw.pragma('wal_checkpoint(TRUNCATE)');
  preDb.close();
}
fs.copyFileSync(DB_PATH, BAK_PATH);
console.log('[백업] 생성:', BAK_PATH);

const db = new DB(DB_PATH);
const q = (sql, params = []) => db.all(sql, params);
const run = (sql, params = []) => db.run(sql, params);

const contIds = q(`SELECT id FROM contracts WHERE contract_type IN ('fixed_term','fixed_term_probation','daily')`).map(r => r.id);
const empIds = q(`SELECT DISTINCT employee_id FROM contracts WHERE contract_type IN ('fixed_term','fixed_term_probation','daily')`)
  .map(r => r.employee_id).filter(Boolean);
console.log(`[대상] 계약 ${contIds.length}건 / 직원 ${empIds.length}명`);

// 삭제할 급여대장 ID (파일 정리용)
const payrollIds = q(`SELECT id FROM payrolls WHERE employee_id IN (${empIds.map(() => '?').join(',')})`, empIds).map(r => r.id);

// 계약서 파일 아티팩트 (generated/contracts/<id>.pdf, edited_file_url)
const editedUrls = q(`SELECT edited_file_url FROM contracts WHERE id IN (${contIds.map(() => '?').join(',')}) AND edited_file_url IS NOT NULL AND edited_file_url != ''`, contIds)
  .map(r => r.edited_file_url);
const deletedFiles = [];
for (const id of contIds) {
  const pdf = path.join(DATA_DIR, 'generated', 'contracts', id + '.pdf');
  if (fs.existsSync(pdf)) deletedFiles.push(pdf);
}
for (const id of payrollIds) {
  const payslip = path.join(DATA_DIR, 'generated', 'payslips', id + '.html');
  if (fs.existsSync(payslip)) deletedFiles.push(payslip);
}
for (const url of editedUrls) {
  if (typeof url === 'string' && url.includes('uploads/')) {
    const f = path.join(DATA_DIR, url.replace(/^.*uploads\//, ''));
    if (fs.existsSync(f)) deletedFiles.push(f);
  }
}

// ── 삭제 대상 건수 집계 (BEFORE) ──
const cnt = (sql, params) => q(`SELECT COUNT(*) n FROM (${sql})`, params)[0].n;
const before = {};
const reportRows = [
  ['contracts', `SELECT id FROM contracts WHERE id IN (${contIds.map(() => '?').join(',')})`, contIds],
  ['contract_dispatch', `SELECT id FROM contract_dispatch WHERE contract_id IN (${contIds.map(() => '?').join(',')})`, contIds],
  ['contract_expiry_notice', `SELECT id FROM contract_expiry_notice WHERE contract_id IN (${contIds.map(() => '?').join(',')})`, contIds],
  ['company_notices', `SELECT id FROM company_notices WHERE contract_id IN (${contIds.map(() => '?').join(',')})`, contIds],
  ['kakao_send_logs', `SELECT id FROM kakao_send_logs WHERE related_table='contracts' AND related_id IN (${contIds.map(() => '?').join(',')})`, contIds],
  ['payrolls', `SELECT id FROM payrolls WHERE employee_id IN (${empIds.map(() => '?').join(',')})`, empIds],
  ['payroll_items', `SELECT pi.id FROM payroll_items pi JOIN payrolls p ON p.id=pi.payroll_id WHERE p.employee_id IN (${empIds.map(() => '?').join(',')})`, empIds],
  ['payroll_send_logs', `SELECT id FROM payroll_send_logs WHERE employee_id IN (${empIds.map(() => '?').join(',')})`, empIds],
  ['attendance_ledger', `SELECT id FROM attendance_ledger WHERE employee_id IN (${empIds.map(() => '?').join(',')}) OR contract_id IN (${contIds.map(() => '?').join(',')})`, [...empIds, ...contIds]],
  ['annual_leave_ledger', `SELECT id FROM annual_leave_ledger WHERE employee_id IN (${empIds.map(() => '?').join(',')}) OR contract_id IN (${contIds.map(() => '?').join(',')})`, [...empIds, ...contIds]],
  ['annual_leave_promotions', `SELECT id FROM annual_leave_promotions WHERE employee_id IN (${empIds.map(() => '?').join(',')})`, empIds],
];
for (const [t, sql, params] of reportRows) before[t] = cnt(sql, params);
console.log('[BEFORE]', before);

// ── 삭제 실행 (단일 트랜잭션) ──
const ph = empIds.map(() => '?').join(',');
const ch = contIds.map(() => '?').join(',');

// 정규 계약의 비정규 계약 참조(갱신/수정/재계약 링크) 끊기 — 고아 참조 방지
run(`UPDATE contracts SET renewed_from_id=NULL, renewed_to_id=NULL WHERE
     (renewed_from_id IN (${ch}) OR renewed_to_id IN (${ch})) AND contract_type IN ('regular','regular_probation')`, [...contIds, ...contIds]);
run(`UPDATE contracts SET amended_from=NULL, edit_source_id=NULL WHERE
     (amended_from IN (${ch}) OR edit_source_id IN (${ch})) AND contract_type IN ('regular','regular_probation')`, [...contIds, ...contIds]);

const tx = db.connection.raw.transaction(() => {
  run(`DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payrolls WHERE employee_id IN (${ph}))`, empIds);
  run(`DELETE FROM payroll_send_logs WHERE employee_id IN (${ph})`, empIds);
  run(`DELETE FROM payrolls WHERE employee_id IN (${ph})`, empIds);
  run(`DELETE FROM contract_dispatch WHERE contract_id IN (${ch})`, contIds);
  run(`DELETE FROM contract_expiry_notice WHERE contract_id IN (${ch})`, contIds);
  run(`DELETE FROM company_notices WHERE contract_id IN (${ch})`, contIds);
  run(`DELETE FROM kakao_send_logs WHERE related_table='contracts' AND related_id IN (${ch})`, contIds);
  run(`DELETE FROM attendance_ledger WHERE employee_id IN (${ph}) OR contract_id IN (${ch})`, [...empIds, ...contIds]);
  run(`DELETE FROM annual_leave_ledger WHERE employee_id IN (${ph}) OR contract_id IN (${ch})`, [...empIds, ...contIds]);
  run(`DELETE FROM annual_leave_promotions WHERE employee_id IN (${ph})`, empIds);
  run(`DELETE FROM contracts WHERE id IN (${ch})`, contIds);
});
tx();
db.raw.pragma('wal_checkpoint(TRUNCATE)');

// 파일 삭제
for (const f of deletedFiles) {
  try { fs.unlinkSync(f); console.log('[파일삭제]', path.relative(path.join(__dirname, '..'), f)); }
  catch (e) { console.log('[파일삭제 실패]', f, String(e.message).slice(0, 80)); }
}

// ── 삭제 결과 검증 ──
const after = {};
for (const [t, sql, params] of reportRows) after[t] = cnt(sql, params);
console.log('[AFTER] ', after);

const remainingNonReg = q(`SELECT COUNT(*) n FROM contracts WHERE contract_type IN ('fixed_term','fixed_term_probation','daily')`)[0].n;
const remainingReg = q(`SELECT COUNT(*) n FROM contracts WHERE contract_type IN ('regular','regular_probation')`)[0].n;
const empKept = q(`SELECT COUNT(*) n FROM employees`)[0].n;
console.log(`[결과] 비정규 계약 잔여: ${remainingNonReg} / 정규 계약: ${remainingReg} / 인사카드 보존: ${empKept}`);
console.log('done');
