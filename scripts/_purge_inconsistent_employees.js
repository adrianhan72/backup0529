/**
 * _purge_inconsistent_employees.js — 불일치 직원 연계 데이터 전부 삭제 (2026-09-11)
 * 대상: scripts/_inconsistent_emp_ids.json 목록
 * 삭제 범위 (인사카드 employees·사번원장 employee_number_ledger는 유지):
 *   contracts, payrolls, payroll_items, payroll_send_logs,
 *   contract_dispatch, consent_dispatch, contract_expiry_notice,
 *   company_notices, annual_leave_ledger, annual_leave_promotions,
 *   attendance_ledger, severance_dispatch, severance_interim_settlements
 */
const fs = require('fs');
const path = require('path');
const { DB } = require('../lib/database');
const db = new DB('data/app.db');

const ids = JSON.parse(fs.readFileSync(path.join(__dirname, '_inconsistent_emp_ids.json'), 'utf8'));
if (!Array.isArray(ids) || !ids.length) { console.log('대상 없음'); process.exit(0); }
const ph = ids.map(() => '?').join(',');

const cnt = (sql) => db.all(sql, [...ids]).length || 0;

console.log('삭제 대상 직원 수:', ids.length);

// 삭제할 payroll id 수집 → payroll_items 정리
const payIds = db.all(`SELECT id FROM payrolls WHERE employee_id IN (${ph})`, [...ids]).map(r => r.id);
const payPh = payIds.length ? payIds.map(() => '?').join(',') : null;

const del = db.conn ? null : null; // DB 래퍼는 run만 제공 — 아래에서 직접 호출
const runDel = (sql, params) => {
  const r = db.run(sql, params);
  return r && typeof r.changes === 'number' ? r.changes : 0;
};

let total = 0;
const delAndLog = (label, sql, params) => {
  const n = runDel(sql, params);
  total += n;
  console.log(`  ${label}: ${n}건`);
};

console.log('--- 삭제 시작 ---');
delAndLog('payroll_items', payPh ? `DELETE FROM payroll_items WHERE payroll_id IN (${payPh})` : `DELETE FROM payroll_items WHERE 0`, payIds);
delAndLog('payroll_send_logs', `DELETE FROM payroll_send_logs WHERE employee_id IN (${ph})`, ids);
delAndLog('payrolls', `DELETE FROM payrolls WHERE employee_id IN (${ph})`, ids);
delAndLog('contract_dispatch', `DELETE FROM contract_dispatch WHERE employee_id IN (${ph})`, ids);
delAndLog('consent_dispatch', `DELETE FROM consent_dispatch WHERE employee_id IN (${ph})`, ids);
delAndLog('contract_expiry_notice', `DELETE FROM contract_expiry_notice WHERE employee_id IN (${ph})`, ids);
delAndLog('company_notices', `DELETE FROM company_notices WHERE employee_id IN (${ph})`, ids);
delAndLog('annual_leave_ledger', `DELETE FROM annual_leave_ledger WHERE employee_id IN (${ph})`, ids);
delAndLog('annual_leave_promotions', `DELETE FROM annual_leave_promotions WHERE employee_id IN (${ph})`, ids);
delAndLog('attendance_ledger', `DELETE FROM attendance_ledger WHERE employee_id IN (${ph})`, ids);
delAndLog('severance_dispatch', `DELETE FROM severance_dispatch WHERE employee_id IN (${ph})`, ids);
delAndLog('severance_interim_settlements', `DELETE FROM severance_interim_settlements WHERE employee_id IN (${ph})`, ids);
delAndLog('contracts', `DELETE FROM contracts WHERE employee_id IN (${ph})`, ids);
console.log(`--- 삭제 완료: 총 ${total}건 ---`);

// 잔여 확인
const remain = {};
for (const [t, col] of [['contracts','employee_id'],['payrolls','employee_id'],['attendance_ledger','employee_id'],
  ['annual_leave_ledger','employee_id'],['annual_leave_promotions','employee_id'],['company_notices','employee_id'],
  ['contract_dispatch','employee_id'],['consent_dispatch','employee_id'],['contract_expiry_notice','employee_id'],
  ['severance_dispatch','employee_id'],['severance_interim_settlements','employee_id'],['payroll_send_logs','employee_id']]) {
  const n = db.all(`SELECT COUNT(*) AS n FROM ${t} WHERE ${col} IN (${ph})`, [...ids])[0].n;
  if (n > 0) remain[t] = n;
}
console.log('잔여(0이어야 정상):', JSON.stringify(remain));
// 인사카드 유지 확인
console.log('인사카드 유지:', db.all(`SELECT COUNT(*) AS n FROM employees WHERE id IN (${ph})`, [...ids])[0].n, '명');
