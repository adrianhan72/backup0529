/**
 * lib/repositories/companyHistoryRepository.js — 고객사 변경이력(company_history)
 */
const { BaseRepository } = require('../database');

class CompanyHistoryRepository extends BaseRepository {
  constructor(conn) { super('company_history', conn); }

  /** 고객사별 변경이력 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM company_history WHERE company_id = ? ORDER BY changed_at DESC'
    ).all(companyId);
  }
}

module.exports = { CompanyHistoryRepository };
