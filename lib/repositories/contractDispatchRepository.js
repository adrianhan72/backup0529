/**
 * lib/repositories/contractDispatchRepository.js — 근로계약서 발송(contract_dispatch)
 */
const { BaseRepository } = require('../database');

const DISPATCH_METHOD = Object.freeze({
  KAKAO: 'kakao',
  EMAIL: 'email',
  MANUAL: 'manual',
});

class ContractDispatchRepository extends BaseRepository {
  constructor(conn) { super('contract_dispatch', conn); }

  /** 계약별 발송 이력 */
  findByContract(contractId) {
    return this.db.prepare(
      'SELECT * FROM contract_dispatch WHERE contract_id = ? ORDER BY dispatched_at DESC'
    ).all(contractId);
  }

  /** 고객사별 발송 이력 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM contract_dispatch WHERE company_id = ? ORDER BY dispatched_at DESC'
    ).all(companyId);
  }

  /** 미발송 건수 */
  countPending(companyId = null) {
    const sql = companyId
      ? "SELECT COUNT(*) AS cnt FROM contract_dispatch WHERE company_id = ? AND dispatch_status = 'pending'"
      : "SELECT COUNT(*) AS cnt FROM contract_dispatch WHERE dispatch_status = 'pending'";
    return this.db.prepare(sql).get(...(companyId ? [companyId] : [])).cnt;
  }
}

module.exports = { ContractDispatchRepository, DISPATCH_METHOD };
