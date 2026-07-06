/**
 * lib/repositories/billingRepository.js — 과금(billing)
 */
const { BaseRepository } = require('../database');

class BillingRepository extends BaseRepository {
  constructor(conn) { super('billing', conn); }

  // ── 주요 조회 ──────────────────────────────────────────────────────────

  /** 고객사별 과금 내역 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM billing WHERE company_id = ? ORDER BY billing_year DESC, billing_month DESC'
    ).all(companyId);
  }

  /** 연월별 과금 내역 */
  findByYearMonth(year, month) {
    return this.db.prepare(
      'SELECT * FROM billing WHERE billing_year = ? AND billing_month = ? ORDER BY company_id'
    ).all(year, month);
  }

  /** 특정 고객사+연월 과금 조회 */
  findByCompanyMonth(companyId, year, month) {
    return this.db.prepare(
      'SELECT * FROM billing WHERE company_id = ? AND billing_year = ? AND billing_month = ?'
    ).get(companyId, year, month) || null;
  }

  /** 미납 과금 목록 */
  findUnpaid() {
    return this.db.prepare(
      "SELECT * FROM billing WHERE status != 'paid' ORDER BY due_date"
    ).all();
  }

  // ── 비즈니스 로직 ──────────────────────────────────────────────────────

  /** 납부 완료 처리 */
  markPaid(id) {
    return this.patch(id, { status: 'paid', updated_at: Date.now() });
  }

  /** 과금 합계 (연월) */
  sumByYearMonth(year, month) {
    return this.db.prepare(`
      SELECT
        COUNT(*) AS company_count,
        SUM(total_amount) AS total_amount,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS paid_amount,
        SUM(CASE WHEN status != 'paid' THEN total_amount ELSE 0 END) AS unpaid_amount
      FROM billing
      WHERE billing_year = ? AND billing_month = ?
    `).get(year, month);
  }
}

module.exports = { BillingRepository };
