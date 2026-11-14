/**
 * lib/repositories/adminAccountsRepository.js — 관리자 계정(admin_accounts)
 */
const bcrypt = require('bcrypt');
const { BaseRepository } = require('../database');

const SALT_ROUNDS = 12;

class AdminAccountsRepository extends BaseRepository {
  constructor(conn) { super('admin_accounts', conn); }

  /** 로그인 인증 — bcrypt.compare 사용 */
  authenticate(username, password) {
    const row = this.db.prepare(
      'SELECT id, username, display_name, password FROM admin_accounts WHERE username = ?'
    ).get(username);
    if (!row) return null;
    // bcrypt 해시 비교
    if (bcrypt.compareSync(password, row.password)) {
      return { id: row.id, username: row.username, display_name: row.display_name };
    }
    return null;
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

  /** 비밀번호 해싱 헬퍼 */
  hashPassword(plain) {
    return bcrypt.hashSync(plain, SALT_ROUNDS);
  }

  /** 비밀번호 변경 — bcrypt 해시 저장 */
  changePassword(id, newPassword) {
    return this.patch(id, {
      password: this.hashPassword(newPassword),
      updated_at: Date.now()
    });
  }

  /** INSERT 오버라이드 — password 필드 자동 해싱 */
  insert(data) {
    const d = { ...data };
    if (d.password) d.password = this.hashPassword(d.password);
    return super.insert(d);
  }

  /** PATCH 오버라이드 — password 필드 자동 해싱 */
  patch(id, data) {
    const d = { ...data };
    if (d.password) d.password = this.hashPassword(d.password);
    return super.patch(id, d);
  }

  /** UPSERT 오버라이드 — password 필드 자동 해싱 */
  upsert(id, data) {
    const d = { ...data };
    if (d.password) d.password = this.hashPassword(d.password);
    return super.upsert(id, d);
  }

  /** 기존 평문 비밀번호를 bcrypt 해시로 일괄 마이그레이션 */
  migratePasswordsToBcrypt() {
    const rows = this.db.prepare('SELECT id, password FROM admin_accounts').all();
    let migrated = 0;
    const updateStmt = this.db.prepare('UPDATE admin_accounts SET password = ? WHERE id = ?');
    const migrateAll = this.db.transaction(() => {
      for (const row of rows) {
        // bcrypt 해시는 $2b$로 시작 → 이미 해시된 것은 건너뜀
        if (row.password && !row.password.startsWith('$2')) {
          const hash = this.hashPassword(row.password);
          updateStmt.run(hash, row.id);
          migrated++;
        }
      }
    });
    migrateAll();
    return migrated;
  }

  /** GET 응답에서 password 필드 제거 (보안) */
  find(params = {}) {
    const result = super.find(params);
    result.data = result.data.map(r => { const { password, ...rest } = r; return rest; });
    return result;
  }

  findById(id) {
    const row = super.findById(id);
    if (row) { const { password, ...rest } = row; return rest; }
    return null;
  }
}

module.exports = { AdminAccountsRepository };
