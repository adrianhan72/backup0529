/**
 * lib/repositories/severanceDispatchRepository.js — 퇴직금 명세서 발송 이력(severance_dispatch)
 */
const { BaseRepository } = require('../database');

const DISPATCH_METHOD = Object.freeze({
  KAKAO: 'kakao',
  EMAIL: 'email',
  MANUAL: 'manual',
});

class SeveranceDispatchRepository extends BaseRepository {
  constructor(conn) { super('severance_dispatch', conn); }

  /** 계약별 발송 이력 */
  findByContract(contractId) {
    return this.db.prepare(
      'SELECT * FROM severance_dispatch WHERE contract_id = ? ORDER BY dispatched_at DESC'
    ).all(contractId);
  }

  /** 고객사별 발송 이력 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM severance_dispatch WHERE company_id = ? ORDER BY dispatched_at DESC'
    ).all(companyId);
  }
}

module.exports = { SeveranceDispatchRepository, DISPATCH_METHOD };
