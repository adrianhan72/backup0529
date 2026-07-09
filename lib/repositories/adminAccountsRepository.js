/**
 * lib/repositories/adminAccountsRepository.js — 관리자 계정(admin_accounts)
 */
const { BaseRepository } = require('../database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

class AdminAccountsRepository extends BaseRepository {
  constructor(conn) { super('admin_accounts', conn); }

  /** 로그인 인증 (bcrypt 해시 검증, 평문 하위 호환) */
  authenticate(username, password) {
    const row = this.db.prepare(
      'SELECT id, username, password, display_name FROM admin_accounts WHERE username = ?'
    ).get(username);
    if (!row) return null;

    // bcrypt 해시 검증 ($2b$...)
    if (row.password && row.password.startsWith('$2')) {
      const match = bcrypt.compareSync(password, row.password);
      return match ? { id: row.id, username: row.username, display_name: row.display_name } : null;
    }

    // 하위 호환: 평문 비교 (기존 계정)
    if (row.password === password) {
      // 자동 해시화 마이그레이션
      const hash = bcrypt.hashSync(password, SALT_ROUNDS);
      this.db.prepare('UPDATE admin_accounts SET password = ? WHERE id = ?').run(hash, row.id);
      return { id: row.id, username: row.username, display_name: row.display_name };
    }
    return null;
  }

  /** 계정 생성 (비밀번호 해시화) */
  createAccount(username, password, displayName) {
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    return this.insert({ username, password: hash, display_name: displayName || username });
  }

  /** 비밀번호 변경 */
  changePassword(id, newPassword) {
    const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
    return this.patch(id, { password: hash });
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
}

module.exports = { AdminAccountsRepository };
