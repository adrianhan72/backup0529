/**
 * lib/repositories/companiesRepository.js — 고객사(companies)
 */
const { BaseRepository } = require('../database');

const COMPANY_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TERMINATED: 'terminated',
});

class CompaniesRepository extends BaseRepository {
  constructor(conn) { super('companies', conn); }

  // ── 주요 조회 ──────────────────────────────────────────────────────────

  /** 활성 고객사 목록 (해지일 지난 것 제외) */
  findActive() {
    const today = new Date().toISOString().slice(0, 10);
    return this.db.prepare(`
      SELECT * FROM companies
      WHERE status = ? AND is_draft = 0
        AND (contract_end_date IS NULL OR contract_end_date > ?)
      ORDER BY company_name
    `).all(COMPANY_STATUS.ACTIVE, today);
  }

  /** 접근코드로 고객사 조회 */
  findByAccessCode(code) {
    return this.db.prepare('SELECT * FROM companies WHERE access_code = ?').get(code) || null;
  }

  /** 전체 고객사 + 직원 수 */
  findWithEmployeeCount() {
    return this.db.prepare(`
      SELECT c.*, COUNT(e.id) AS employee_count
      FROM companies c
      LEFT JOIN employees e ON e.company_id = c.id AND e.status = 'active'
      GROUP BY c.id
      ORDER BY c.company_name
    `).all();
  }

  /** 임시저장 고객사 목록 */
  findDrafts() {
    return this.db.prepare("SELECT * FROM companies WHERE is_draft = 1 ORDER BY draft_saved_at DESC").all();
  }

  // ── 비즈니스 로직 ──────────────────────────────────────────────────────

  /** 고객사 해지 처리 */
  terminate(id, endDate = null) {
    const today = new Date().toISOString().slice(0, 10);
    return this.patch(id, {
      status: COMPANY_STATUS.TERMINATED,
      contract_end_date: endDate || today,
      updated_at: Date.now(),
    });
  }

  /** 접근코드 중복 확인 */
  isAccessCodeTaken(code, excludeId = null) {
    const sql = excludeId
      ? 'SELECT id FROM companies WHERE access_code = ? AND id != ?'
      : 'SELECT id FROM companies WHERE access_code = ?';
    return !!this.db.prepare(sql).get(...(excludeId ? [code, excludeId] : [code]));
  }

  /** 사업자번호 중복 확인 */
  isBusinessNumberTaken(bn, excludeId = null) {
    const sql = excludeId
      ? 'SELECT id FROM companies WHERE business_number = ? AND id != ?'
      : 'SELECT id FROM companies WHERE business_number = ?';
    return !!this.db.prepare(sql).get(...(excludeId ? [bn, excludeId] : [bn]));
  }
}

module.exports = { CompaniesRepository, COMPANY_STATUS };
