/**
 * lib/repositories/payrollsRepository.js — 급여(payrolls)
 */
const { BaseRepository } = require('../database');

class PayrollsRepository extends BaseRepository {
  constructor(conn) { super('payrolls', conn); }

  // ── 주요 조회 ──────────────────────────────────────────────────────────

  /** 연월별 급여 목록 */
  findByMonth(year, month) {
    return this.db.prepare(
      'SELECT * FROM payrolls WHERE pay_year = ? AND pay_month = ? ORDER BY employee_id'
    ).all(year, month);
  }

  /** 고객사+연월별 급여 목록 */
  findByCompanyMonth(companyId, year, month) {
    return this.db.prepare(`
      SELECT * FROM payrolls
      WHERE company_id = ? AND pay_year = ? AND pay_month = ?
      ORDER BY employee_id
    `).all(companyId, year, month);
  }

  /** 직원별 급여 이력 */
  findByEmployee(employeeId) {
    return this.db.prepare(
      'SELECT * FROM payrolls WHERE employee_id = ? ORDER BY pay_year DESC, pay_month DESC'
    ).all(employeeId);
  }

  /** 임시저장 급여 목록 */
  findDrafts() {
    return this.db.prepare(
      'SELECT * FROM payrolls WHERE is_draft = 1 ORDER BY draft_saved_at DESC'
    ).all();
  }

  /** 특정 급여의 원본(edit_source_id) 조회 */
  findSource(sourceId) {
    return this.findById(sourceId);
  }

  // ── 비즈니스 로직 ──────────────────────────────────────────────────────

  /** 임시저장 → 확정 */
  finalize(id) {
    return this.patch(id, {
      is_draft: 0,
      updated_at: Date.now(),
    });
  }

  /** 급여 합계 (고객사+연월) */
  sumByCompanyMonth(companyId, year, month) {
    return this.db.prepare(`
      SELECT
        COUNT(*) AS employee_count,
        SUM(gross_pay) AS total_gross,
        SUM(net_pay) AS total_net,
        SUM(total_deduction) AS total_deduction
      FROM payrolls
      WHERE company_id = ? AND pay_year = ? AND pay_month = ? AND is_draft = 0
    `).get(companyId, year, month);
  }
}

module.exports = { PayrollsRepository };
