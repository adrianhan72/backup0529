/**
 * lib/repositories/contractsRepository.js — 근로계약(contracts)
 */
const { BaseRepository } = require('../database');
const { fmtLocalDate } = require('../utils');

const CONTRACT_STATUS = Object.freeze({
  ACTIVE:            'active',
  EXPIRED:           'expired',
  TERMINATED:        'terminated',
  VOIDED:            'voided',
  PENDING:           'pending',
  RENEWAL_PENDING:   'renewal_pending',
  TERMINATE_PENDING: 'terminate_pending',
  DOCS_INCOMPLETE:   'docs_incomplete',
  RENEWED:           'renewed',
});

const CONTRACT_TYPE = Object.freeze({
  REGULAR:           'regular',
  REGULAR_PROBATION: 'regular_probation',
  FIXED:             'fixed_term',
  FIXED_PROBATION:   'fixed_term_probation',
  DAILY:             'daily',
  EXECUTIVE:         'executive',
  RELATED_PARTY:     'related_party',
  REPRESENTATIVE:    'representative',
});

class ContractsRepository extends BaseRepository {
  constructor(conn) { super('contracts', conn); }

  // ── 주요 조회 ──────────────────────────────────────────────────────────

  /** 직원별 계약 목록 */
  findByEmployee(employeeId) {
    return this.db.prepare(
      'SELECT * FROM contracts WHERE employee_id = ? ORDER BY contract_start DESC'
    ).all(employeeId);
  }

  /** 고객사별 계약 목록 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM contracts WHERE company_id = ? ORDER BY contract_start DESC'
    ).all(companyId);
  }

  /** 직원의 현재 활성 계약 */
  findActiveByEmployee(employeeId) {
    const today = fmtLocalDate(new Date());
    return this.db.prepare(`
      SELECT * FROM contracts
      WHERE employee_id = ? AND status = ? AND is_draft = 0 AND is_voided_by_amend = 0
        AND (contract_start IS NULL OR contract_start <= ?)
        AND (contract_end IS NULL OR contract_end >= ?)
      ORDER BY contract_start DESC LIMIT 1
    `).get(employeeId, CONTRACT_STATUS.ACTIVE, today, today) || null;
  }

  /** 고객사별 모든 활성 계약 */
  findActiveByCompany(companyId) {
    const today = fmtLocalDate(new Date());
    return this.db.prepare(`
      SELECT * FROM contracts
      WHERE company_id = ? AND status = ? AND is_draft = 0 AND is_voided_by_amend = 0
        AND (contract_start IS NULL OR contract_start <= ?)
        AND (contract_end IS NULL OR contract_end >= ?)
      ORDER BY contract_start DESC
    `).all(companyId, CONTRACT_STATUS.ACTIVE, today, today);
  }

  /** 특정 월에 유효했던 계약 (임금대장용) */
  findActiveInMonth(companyId, year, month) {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return this.db.prepare(`
      SELECT * FROM contracts
      WHERE company_id = ?
        AND status = ?
        AND is_draft = 0
        AND is_voided_by_amend = 0
        AND (contract_start IS NULL OR contract_start <= ?)
        AND (contract_end IS NULL OR contract_end >= ?)
      ORDER BY employee_id
    `).all(companyId, CONTRACT_STATUS.ACTIVE, endOfMonth, startOfMonth);
  }

  /** 임시저장 계약 목록 */
  findDrafts() {
    return this.db.prepare(
      'SELECT * FROM contracts WHERE is_draft = 1 ORDER BY draft_saved_at DESC'
    ).all();
  }

  /** 만료 예정 계약 (n일 이내) */
  findExpiringSoon(days = 30) {
    const today = new Date();
    const target = new Date(today);
    target.setDate(target.getDate() + days);
    return this.db.prepare(`
      SELECT * FROM contracts
      WHERE status = ? AND is_draft = 0 AND is_voided_by_amend = 0
        AND contract_end IS NOT NULL
        AND contract_end >= ?
        AND contract_end <= ?
      ORDER BY contract_end
    `).all(CONTRACT_STATUS.ACTIVE, fmtLocalDate(today), fmtLocalDate(target));
  }

  // ── 비즈니스 로직 ──────────────────────────────────────────────────────

  /** 계약 해지 */
  terminate(id, reason = '', terminateDate = null) {
    const date = terminateDate || fmtLocalDate(new Date());
    return this.patch(id, {
      status: CONTRACT_STATUS.TERMINATED,
      terminate_date: date,
      terminate_reason: reason,
      updated_at: Date.now(),
    });
  }

  /** 계약 해지 예정 */
  markTerminatePending(id, reason = '') {
    return this.patch(id, {
      status: CONTRACT_STATUS.TERMINATE_PENDING,
      terminate_reason: reason,
      updated_at: Date.now(),
    });
  }

  /** 계약 활성화 (임시저장 → 정식) */
  activate(id) {
    return this.patch(id, {
      status: CONTRACT_STATUS.ACTIVE,
      is_draft: 0,
      updated_at: Date.now(),
    });
  }

  /** 개정에 의한 무효화 */
  voidByAmend(id) {
    return this.patch(id, {
      is_voided_by_amend: 1,
      voided_at: Date.now(),
      updated_at: Date.now(),
    });
  }

  /** 계약이 해지/만료되었는지 확인 */
  isTerminated(contract) {
    if (!contract) return true;
    if (contract.status === CONTRACT_STATUS.TERMINATED) return true;
    if (contract.is_voided_by_amend) return true;
    if (contract.contract_end) {
      const today = fmtLocalDate(new Date());
      if (contract.contract_end < today) return true;
    }
    return false;
  }
}

module.exports = { ContractsRepository, CONTRACT_STATUS, CONTRACT_TYPE };
