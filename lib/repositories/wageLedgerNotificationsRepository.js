/**
 * lib/repositories/wageLedgerNotificationsRepository.js — 임금대장 알림(wage_ledger_notifications)
 */
const { BaseRepository } = require('../database');

class WageLedgerNotificationsRepository extends BaseRepository {
  constructor(conn) { super('wage_ledger_notifications', conn); }

  /** 확인되지 않은 알림 */
  findUnacknowledged() {
    return this.db.prepare(
      "SELECT * FROM wage_ledger_notifications WHERE acknowledged = 0 ORDER BY created_at DESC"
    ).all();
  }

  /** 알림 확인 처리 */
  acknowledge(id) {
    return this.patch(id, { acknowledged: 1, updated_at: Date.now() });
  }
}

module.exports = { WageLedgerNotificationsRepository };
