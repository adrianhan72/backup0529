/**
 * lib/repositories/consentDispatchRepository.js — 제3자 정보제공 동의서 발송(consent_dispatch)
 */
const { BaseRepository } = require('../database');

const DISPATCH_METHOD = Object.freeze({
  KAKAO: 'kakao',
  EMAIL: 'email',
  MANUAL: 'manual',
});

const DISPATCH_STATUS = Object.freeze({
  PENDING: 'pending',
  SENT:    'sent',
  FAILED:  'failed',
});

class ConsentDispatchRepository extends BaseRepository {
  constructor(conn) { super('consent_dispatch', conn); }

  /** 계약별 발송 이력 */
  findByContract(contractId) {
    return this.db.prepare(
      'SELECT * FROM consent_dispatch WHERE contract_id = ? ORDER BY dispatched_at DESC'
    ).all(contractId);
  }

  /** 고객사별 발송 이력 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM consent_dispatch WHERE company_id = ? ORDER BY dispatched_at DESC'
    ).all(companyId);
  }

  /** 직원의 동의서 교부 이력 확인 (이미 교부했는지) */
  hasConsentHistory(employeeId) {
    const row = this.db.prepare(
      `SELECT COUNT(*) AS cnt FROM consent_dispatch 
       WHERE employee_id = ? AND dispatch_status = 'sent'`
    ).get(employeeId);
    return (row?.cnt || 0) > 0;
  }
}

module.exports = { ConsentDispatchRepository, DISPATCH_METHOD, DISPATCH_STATUS };
