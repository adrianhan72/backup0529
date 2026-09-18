/**
 * lib/repositories/annual-leave-promotions.js — 연차촉진 안내(annual_leave_promotions)
 */
const { BaseRepository } = require('../database');

class AnnualLeavePromotionsRepository extends BaseRepository {
  constructor(conn) { super('annual_leave_promotions', conn); }

  /** 직원별 안내 이력 */
  findByEmployee(employeeId) {
    return this.db.prepare(
      'SELECT * FROM annual_leave_promotions WHERE employee_id = ? ORDER BY sent_at DESC'
    ).all(employeeId);
  }

  /** 고객사별 안내 이력 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM annual_leave_promotions WHERE company_id = ? ORDER BY sent_at DESC'
    ).all(companyId);
  }
}

module.exports = { AnnualLeavePromotionsRepository };
