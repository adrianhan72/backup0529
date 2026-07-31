/**
 * lib/cron/kakao-retry.js — 카카오 발송 실패 건 자동 재시도 (10분마다)
 */
const cron = require('node-cron');

module.exports = function(db, solapi) {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const MAX_RETRY = 3;
      const failedRows = db.all(`
        SELECT * FROM kakao_send_logs
        WHERE status = 'failed' AND retry_count < ?
        ORDER BY created_at ASC
        LIMIT 50
      `, [MAX_RETRY]);

      for (const log of failedRows) {
        try {
          const variables = log.variables ? JSON.parse(log.variables) : {};
          let result;
          if (log.send_type === 'friendtalk') {
            result = await solapi.sendFriendtalk({
              to: log.recipient,
              text: variables?.message || '',
              pfId: process.env.SOLAPI_KAKAO_PF_ID || '',
            });
          } else if (log.send_type === 'sms') {
            result = await solapi.sendSMS({
              to: log.recipient,
              text: variables?.message || '',
            });
          } else {
            result = await solapi.sendAlimtalk({ to: log.recipient, templateId: log.template_id, variables });
          }

          db.run(
            `UPDATE kakao_send_logs
               SET status = 'sent', message_id = ?,
                   sent_at = ?, retry_count = retry_count + 1
             WHERE id = ?`,
            [result.messageId || null, new Date().toISOString(), log.id]
          );
          console.log(`[CRON] 카카오 재시도 성공: ${log.id} → ${log.recipient}`);
        } catch (err) {
          db.run(
            `UPDATE kakao_send_logs SET error_message = ?, retry_count = retry_count + 1 WHERE id = ?`,
            [err.message, log.id]
          );
          console.error(`[CRON] 카카오 재시도 실패 (${log.id}):`, err.message);
        }
      }
    } catch (e) {
      console.error('[CRON] 카카오 재시도 크론잡 오류:', e.message);
    }
  }, { timezone: 'Asia/Seoul' });
};
