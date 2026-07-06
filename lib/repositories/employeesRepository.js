/**
 * lib/repositories/employeesRepository.js — 직원(employees)
 */
const { BaseRepository } = require('../database');

const EMP_STATUS = Object.freeze({
  ACTIVE: 'active',
  RESIGNED: 'resigned',
});

class EmployeesRepository extends BaseRepository {
  constructor(conn) { super('employees', conn); }

  // ── 주요 조회 ──────────────────────────────────────────────────────────

  /** 고객사별 직원 목록 */
  findByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM employees WHERE company_id = ? ORDER BY name'
    ).all(companyId);
  }

  /** 고객사별 재직중인 직원 */
  findActiveByCompany(companyId) {
    return this.db.prepare(
      'SELECT * FROM employees WHERE company_id = ? AND status = ? ORDER BY name'
    ).all(companyId, EMP_STATUS.ACTIVE);
  }

  /** 대표자 조회 */
  findRepresentatives(companyId) {
    return this.db.prepare(
      'SELECT * FROM employees WHERE company_id = ? AND is_representative = 1'
    ).all(companyId);
  }

  /** 고객사별 직원 수 */
  countByCompany(companyId) {
    return this.db.prepare(
      'SELECT COUNT(*) AS cnt FROM employees WHERE company_id = ? AND status = ?'
    ).get(companyId, EMP_STATUS.ACTIVE).cnt;
  }

  /** 고용형태별 직원 수 */
  countByCategory(companyId) {
    return this.db.prepare(`
      SELECT employment_category, COUNT(*) AS cnt
      FROM employees
      WHERE company_id = ? AND status = ?
      GROUP BY employment_category
    `).all(companyId, EMP_STATUS.ACTIVE);
  }

  /** 전화번호로 직원 검색 */
  findByPhone(phone) {
    return this.db.prepare('SELECT * FROM employees WHERE phone = ?').get(phone) || null;
  }

  // ── 비즈니스 로직 ──────────────────────────────────────────────────────

  /** 퇴직 처리 */
  resign(id, resignDate = null) {
    return this.patch(id, {
      status: EMP_STATUS.RESIGNED,
      resign_date: resignDate || new Date().toISOString().slice(0, 10),
      updated_at: Date.now(),
    });
  }

  /** 재입사 처리 */
  rehire(id) {
    return this.patch(id, {
      status: EMP_STATUS.ACTIVE,
      resign_date: null,
      updated_at: Date.now(),
    });
  }
}

module.exports = { EmployeesRepository, EMP_STATUS };
