/**
 * lib/repositories/minimumWagesRepository.js — 최저임금(minimum_wages)
 */
const { BaseRepository } = require('../database');

class MinimumWagesRepository extends BaseRepository {
  constructor(conn) { super('minimum_wages', conn); }

  /** 연도별 최저임금 조회 */
  findByYear(year) {
    return this.db.prepare(
      'SELECT * FROM minimum_wages WHERE year = ?'
    ).get(year) || null;
  }

  /** 최신 최저임금 */
  findLatest() {
    return this.db.prepare(
      'SELECT * FROM minimum_wages ORDER BY year DESC LIMIT 1'
    ).get() || null;
  }
}

module.exports = { MinimumWagesRepository };
