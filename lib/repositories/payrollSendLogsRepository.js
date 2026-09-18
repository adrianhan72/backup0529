/**
 * lib/repositories/payrollSendLogsRepository.js — 급여명세서 발송 로그(payroll_send_logs)
 */
const { BaseRepository } = require('../database');

class PayrollSendLogsRepository extends BaseRepository {
  constructor(conn) { super('payroll_send_logs', conn); }

  /** 급여별 발송 로그 */
  findByPayroll(payrollId) {
    return this.db.prepare(
      'SELECT * FROM payroll_send_logs WHERE payroll_id = ? ORDER BY sent_at DESC'
    ).all(payrollId);
  }

  /** 고객사별 발송 로그 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM payroll_send_logs WHERE company_id = ? ORDER BY sent_at DESC'
    ).all(companyId);
  }

  /** 연월별 발송 로그 */
  findByYearMonth(year, month) {
    return this.db.prepare(
      'SELECT * FROM payroll_send_logs WHERE pay_year = ? AND pay_month = ? ORDER BY sent_at DESC'
    ).all(year, month);
  }
}

module.exports = { PayrollSendLogsRepository };
