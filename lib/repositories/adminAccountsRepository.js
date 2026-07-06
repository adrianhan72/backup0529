/**
 * lib/repositories/adminAccountsRepository.js — 관리자 계정(admin_accounts)
 */
const { BaseRepository } = require('../database');

class AdminAccountsRepository extends BaseRepository {
  constructor(conn) { super('admin_accounts', conn); }

  /** 로그인 인증 */
  authenticate(username, password) {
    return this.db.prepare(
      'SELECT id, username, display_name FROM admin_accounts WHERE username = ? AND password = ?'
    ).get(username, password) || null;
  }

  /** 아이디 중복 확인 */
  isUsernameTaken(username, excludeId = null) {
    const sql = excludeId
      ? 'SELECT id FROM admin_accounts WHERE username = ? AND id != ?'
      : 'SELECT id FROM admin_accounts WHERE username = ?';
    return !!this.db.prepare(sql).get(...(excludeId ? [username, excludeId] : [username]));
  }

  /** 마지막 관리자 계정이면 삭제 불가 */
  isLastAdmin() {
    return this.db.prepare('SELECT COUNT(*) AS cnt FROM admin_accounts').get().cnt <= 1;
  }

  /** 비밀번호 변경 (⚠️ 평문 — 향후 해싱 필요) */
  changePassword(id, newPassword) {
    return this.patch(id, { password: newPassword, updated_at: Date.now() });
  }
}

module.exports = { AdminAccountsRepository };
