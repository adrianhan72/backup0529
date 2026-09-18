/**
 * lib/repositories/attendanceLedgerRepository.js — 근태 관리대장(attendance_ledger)
 */
const { BaseRepository } = require('../database');

class AttendanceLedgerRepository extends BaseRepository {
  constructor(conn) { super('attendance_ledger', conn); }

  /** 직원별 근태 조회 (연도 기준) */
  findByEmployee(employeeId, year) {
    const sql = year
      ? 'SELECT * FROM attendance_ledger WHERE employee_id = ? AND year = ? ORDER BY year DESC'
      : 'SELECT * FROM attendance_ledger WHERE employee_id = ? ORDER BY year DESC';
    return this.db.prepare(sql).all(...(year ? [employeeId, year] : [employeeId]));
  }

  /** 회사별 근태 조회 */
  findByCompany(companyId, year) {
    const sql = year
      ? 'SELECT * FROM attendance_ledger WHERE company_id = ? AND year = ? ORDER BY employee_id, year DESC'
      : 'SELECT * FROM attendance_ledger WHERE company_id = ? ORDER BY employee_id, year DESC';
    return this.db.prepare(sql).all(...(year ? [companyId, year] : [companyId]));
  }

  /** 직원+연도별 단건 조회 (upsert용) */
  findByEmployeeYear(employeeId, year) {
    return this.db.prepare(
      'SELECT * FROM attendance_ledger WHERE employee_id = ? AND year = ?'
    ).get(employeeId, year) || null;
  }
}

module.exports = { AttendanceLedgerRepository };
