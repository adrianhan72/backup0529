/**
 * lib/repositories/insuranceRatesRepository.js — 보험요율(insurance_rates)
 */
const { BaseRepository } = require('../database');

class InsuranceRatesRepository extends BaseRepository {
  constructor(conn) { super('insurance_rates', conn); }

  /** 적용일자 기준 최신 요율 */
  findLatest() {
    return this.db.prepare(
      'SELECT * FROM insurance_rates ORDER BY effective_date DESC LIMIT 1'
    ).get() || null;
  }

  /** 특정 일자에 적용되는 요율 */
  findByDate(date) {
    return this.db.prepare(
      'SELECT * FROM insurance_rates WHERE effective_date <= ? ORDER BY effective_date DESC LIMIT 1'
    ).get(date) || null;
  }
}

module.exports = { InsuranceRatesRepository };
