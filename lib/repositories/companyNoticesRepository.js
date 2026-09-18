/**
 * lib/repositories/companyNoticesRepository.js — 고지사항(company_notices)
 */
const { BaseRepository } = require('../database');

class CompanyNoticesRepository extends BaseRepository {
  constructor(conn) { super('company_notices', conn); }

  /** 고객사별 고지사항 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM company_notices WHERE company_id = ? ORDER BY sent_at DESC'
    ).all(companyId);
  }

  /** 직원별 고지사항 */
  findByEmployee(employeeId) {
    return this.db.prepare(
      'SELECT * FROM company_notices WHERE employee_id = ? ORDER BY sent_at DESC'
    ).all(employeeId);
  }

  /** 유형별 고지사항 (welcome, regular-conversion 등) */
  findByType(type) {
    return this.db.prepare(
      'SELECT * FROM company_notices WHERE notice_type = ? ORDER BY sent_at DESC'
    ).all(type);
  }
}

module.exports = { CompanyNoticesRepository };
