/**
 * lib/repositories/annual-leave-ledger.js — 연차휴가 관리대장(annual_leave_ledger)
 */
const { BaseRepository } = require('../database');

class AnnualLeaveLedgerRepository extends BaseRepository {
  constructor(conn) { super('annual_leave_ledger', conn); }

  /** 직원+연도별 연차 */
  findByEmployeeYear(employeeId, year) {
    return this.db.prepare(
      'SELECT * FROM annual_leave_ledger WHERE employee_id = ? AND year = ?'
    ).get(employeeId, year) || null;
  }

  /** 고객사+연도별 연차 */
  findByCompanyYear(companyId, year) {
    return this.db.prepare(
      'SELECT * FROM annual_leave_ledger WHERE company_id = ? AND year = ? ORDER BY employee_id'
    ).all(companyId, year);
  }
}

module.exports = { AnnualLeaveLedgerRepository };
