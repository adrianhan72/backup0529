/**
 * DB 상태값 한글 → 영문 마이그레이션
 * v2.35.0
 */
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));

console.log('🔍 DB 한글 → 영문 마이그레이션 시작...\n');

const migrations = [
  // ── employees.status ──
  { table: 'employees', col: 'status', map: {
    '재직': 'active', '퇴직': 'resigned',
  }},
  // ── contracts.status ──
  { table: 'contracts', col: 'status', map: {
    '활성': 'active', '만료': 'expired', '해지': 'terminated',
    '파기': 'voided', '취소': 'canceled', '계약예정': 'pending',
    '갱신예정': 'renewal_pending', '해지예정': 'terminate_pending',
    '서류미비': 'docs_incomplete', '갱신됨': 'renewed',
  }},
  // ── contracts.contract_type ──
  { table: 'contracts', col: 'contract_type', map: {
    '정규직': 'regular', '정규직 수습': 'regular_probation',
    '계약직': 'fixed_term', '계약직 수습': 'fixed_term_probation',
    '일용직': 'daily',
  }},
  // ── employees.employment_category ──
  { table: 'employees', col: 'employment_category', map: {
    '정규직': 'regular', '정규직 수습': 'regular_probation',
    '계약직': 'fixed_term', '계약직 수습': 'fixed_term_probation',
    '일용직': 'daily',
  }},
  // ── companies.status ──
  { table: 'companies', col: 'status', map: {
    '이용중': 'active', '해지': 'inactive', '임시저장': 'draft',
  }},
  // ── billing.payment_status ──
  { table: 'billing', col: 'payment_status', map: {
    '납부대기': 'pending', '일부납': 'partial', '미납': 'unpaid', '완납': 'paid',
  }},
  // ── contract_dispatch.dispatch_method ──
  { table: 'contract_dispatch', col: 'dispatch_method', map: {
    '알림톡': 'kakao', '이메일': 'email', '수동배부': 'manual', '수정재발행': 'amended',
  }},
  { table: 'contract_dispatch', col: 'dispatch_status', map: {
    '완료': 'completed', '실패': 'failed', '대기': 'pending',
  }},
  // ── contract_expiry_notice ──
  { table: 'contract_expiry_notice', col: 'notice_method', map: {
    '알림톡': 'kakao', '이메일': 'email', '수동배부': 'manual',
  }},
  { table: 'contract_expiry_notice', col: 'notice_status', map: {
    '완료': 'completed', '실패': 'failed', '대기': 'pending',
  }},
  { table: 'contract_expiry_notice', col: 'contract_type', map: {
    '정규직': 'regular', '계약직': 'fixed_term', '일용직': 'daily',
    '정규직 수습': 'regular_probation', '계약직 수습': 'fixed_term_probation',
  }},
  // ── payroll_send_logs ──
  { table: 'payroll_send_logs', col: 'send_method', map: {
    '알림톡': 'kakao', '이메일': 'email', '수동 교부': 'manual', '직접배부': 'manual',
  }},
  // ── annual_leave_promotions ──
  { table: 'annual_leave_promotions', col: 'contract_type', map: {
    '정규직': 'regular', '계약직': 'fixed_term',
    '정규직 수습': 'regular_probation', '계약직 수습': 'fixed_term_probation',
  }},
  { table: 'annual_leave_promotions', col: 'worker_send_method', map: {
    '알림톡': 'kakao', '이메일': 'email', '유선 직접 안내': 'phone',
  }},
];

let totalChanged = 0;
migrations.forEach(({ table, col, map }) => {
  const before = db.prepare(`SELECT ${col}, COUNT(*) as cnt FROM ${table} GROUP BY ${col}`).all();
  let tableTotal = 0;
  for (const [from, to] of Object.entries(map)) {
    const result = db.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${col} = ?`).run(to, from);
    if (result.changes > 0) {
      console.log(`   ${table}.${col}: '${from}' → '${to}' — ${result.changes}건`);
      tableTotal += result.changes;
    }
  }
  if (tableTotal > 0) {
    totalChanged += tableTotal;
    const after = db.prepare(`SELECT ${col}, COUNT(*) as cnt FROM ${table} GROUP BY ${col}`).all();
    console.log(`   → ${table}.${col} 최종:`, after.map(r => `${r[col]}:${r.cnt}`).join(', '));
  }
});

console.log(`\n✅ 총 ${totalChanged}건 마이그레이션 완료`);
db.close();
