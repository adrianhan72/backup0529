/**
 * scripts/_add_severance_inapp_type.js
 * 인앱 알림 발송항목 체크리스트에 '퇴직금 명세서 발송(severance_dispatched)' 추가
 * 기본값: 체크 해제 (disabled 목록에 포함)
 */
const path = require('path');
const { DB } = require('../lib/database');

const db = new DB(path.join(__dirname, '..', 'data', 'app.db'));

for (const key of ['inapp_notice_types_disabled', 'inapp_notice_types_default']) {
  const row = db.all('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key])[0];
  let arr = [];
  try { arr = (row && row.setting_value) ? JSON.parse(row.setting_value) : []; } catch (e) { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  if (!arr.includes('severance_dispatched')) {
    arr.push('severance_dispatched');
    db.run('UPDATE system_settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?',
      [JSON.stringify(arr), Date.now(), key]);
    console.log(`[OK] ${key} — severance_dispatched 추가 (${arr.length}개)`);
  } else {
    console.log(`[SKIP] ${key} — 이미 포함`);
  }
}
try { db.connection.raw.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
console.log('[DONE]');
