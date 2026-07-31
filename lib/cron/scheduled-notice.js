/**
 * lib/cron/scheduled-notice.js — 예약 발송 고객사 공지 처리 (1분마다)
 */
const cron = require('node-cron');

module.exports = function(db) {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date().toISOString();
      const rows = db.all(`
        SELECT * FROM company_notices
        WHERE gn_status = 'scheduled'
          AND gn_scheduled_at IS NOT NULL
          AND gn_scheduled_at <= ?
      `, [now]);
      let processed = 0;
      for (const r of rows) {
        db.run(`UPDATE company_notices SET gn_status = 'sent', sent_at = ? WHERE id = ?`, [now, r.id]);
        processed++;
      }
      if (processed > 0) console.log(`[CRON] 예약 공지 처리 완료: ${processed}건 발송`);
    } catch(e) {
      console.error('[CRON] 예약 공지 처리 실패:', e.message);
    }
  }, { timezone: 'Asia/Seoul' });
};
