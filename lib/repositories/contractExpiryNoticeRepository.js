/**
 * lib/repositories/contractExpiryNoticeRepository.js — 계약만료안내(contract_expiry_notice)
 */
const { BaseRepository } = require('../database');

class ContractExpiryNoticeRepository extends BaseRepository {
  constructor(conn) { super('contract_expiry_notice', conn); }

  /** 계약별 안내 이력 */
  findByContract(contractId) {
    return this.db.prepare(
      'SELECT * FROM contract_expiry_notice WHERE contract_id = ? ORDER BY noticed_at DESC'
    ).all(contractId);
  }

  /** 고객사별 안내 이력 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM contract_expiry_notice WHERE company_id = ? ORDER BY noticed_at DESC'
    ).all(companyId);
  }
}

module.exports = { ContractExpiryNoticeRepository };
