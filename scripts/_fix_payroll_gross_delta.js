// 고정수당 산식 변경(2026-08-14)에 따른 payrolls.gross_pay/net_pay 보정
// - standard_monthly_pay(보수월액)는 고정수당 미포함(기존 규칙) → 불변
// - total_deduction(세금·보험)은 std 기준 → 불변
// - gross_pay/net_pay에만 해당 월 활성 계약의 고정수당 차이(delta)를 반영
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
const bak = new Database(path.join(__dirname, '..', 'data', 'app.db.bak_pre_formula_audit'));

// 1) 계약별 고정수당 합계 delta (백업 vs 현재)
const oldC = bak.prepare('select id, employee_id, contract_start, contract_end, fixed_ot_pay, fixed_night_pay, fixed_hol_pay from contracts').all();
const newC = db.prepare('select id, fixed_ot_pay, fixed_night_pay, fixed_hol_pay from contracts').all();
const newMap = new Map(newC.map(r => [r.id, r]));
const deltaByContract = new Map();
oldC.forEach(r => {
  const n = newMap.get(r.id);
  if (!n) return;
  const d = (n.fixed_ot_pay - r.fixed_ot_pay) + (n.fixed_night_pay - r.fixed_night_pay) + (n.fixed_hol_pay - r.fixed_hol_pay);
  if (d !== 0) deltaByContract.set(r.id, { employee_id: r.employee_id, start: r.contract_start, end: r.contract_end, d });
});

// 2) 직원별 계약 목록 (월 매핑용)
const contractsByEmp = new Map();
for (const c of oldC) {
  if (!contractsByEmp.has(c.employee_id)) contractsByEmp.set(c.employee_id, []);
  contractsByEmp.get(c.employee_id).push(c);
}

function monthDelta(employeeId, payYear, payMonth) {
  const list = contractsByEmp.get(employeeId) || [];
  const moStart = `${payYear}-${String(payMonth).padStart(2, '0')}-01`;
  const moEnd = `${payYear}-${String(payMonth).padStart(2, '0')}-${String(new Date(payYear, payMonth, 0).getDate()).padStart(2, '0')}`;
  let best = null;
  for (const c of list) {
    if (c.contract_start && c.contract_start > moEnd) continue;          // 계약 시작 전
    if (c.contract_end && c.contract_end < moStart) continue;            // 계약 종료 후
    const delta = deltaByContract.get(c.id);
    if (delta === undefined) continue;
    if (!best || (c.contract_start || '') >= (best.contract_start || '')) best = { ...delta, contract_id: c.id };
  }
  return best ? best.d : 0;
}

const payRows = db.prepare("select * from payrolls where (is_draft is null or is_draft != 1)").all();
const upd = db.prepare('update payrolls set gross_pay=?, net_pay=? where id=?');
let changed = 0;
const report = [];
for (const p of payRows) {
  if (p.gross_pay === null || p.gross_pay === undefined) continue;
  const d = monthDelta(p.employee_id, p.pay_year, p.pay_month);
  if (d === 0) continue;
  const newGross = Math.round((p.gross_pay || 0) + d);
  const newNet = Math.round((p.net_pay || 0) + d);
  upd.run(newGross, newNet, p.id);
  changed++;
  report.push({ id: p.id, ym: `${p.pay_year}-${String(p.pay_month).padStart(2, '0')}`, gross: `${p.gross_pay}→${newGross}`, net: `${p.net_pay}→${newNet}`, delta: d });
}
console.log(JSON.stringify({ changed, report }, null, 1));
