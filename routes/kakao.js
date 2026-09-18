/**
 * routes/kakao.js — 카카오 알림톡/SMS 발송 API
 */
const { generatePrefixedId } = require('../lib/utils');

module.exports = function(db, solapi) {
  const { Router } = require('express');
  const router = Router();

  router.post('/send', async (req, res) => {
    try {
      const { to, templateId, variables, type, text, from, pfId, reserveTime, relatedTable, relatedId } = req.body;

      let result;
      if (type === 'friendtalk') {
        result = await solapi.sendFriendtalk({ to, text, from, pfId });
      } else if (type === 'sms') {
        result = await solapi.sendSMS({ to, text, from });
      } else {
        result = await solapi.sendAlimtalk({ to, templateId, variables, from, pfId, reserveTime });
      }

      // 발송 성공 로그 저장
      try {
        const logId = generatePrefixedId('ksl');
        db.run(
          `INSERT INTO kakao_send_logs (
            id, send_type, template_id, recipient, variables,
            message_id, group_id, status, related_table, related_id,
            created_at, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?)`,
          [
            logId,
            type || 'alimtalk',
            templateId || null,
            to,
            variables ? JSON.stringify(variables) : null,
            result.messageId || null,
            result.groupId || null,
            relatedTable || null,
            relatedId || null,
            Date.now(),
            new Date().toISOString(),
          ]
        );
      } catch (logErr) {
        console.error('[KAKAO] 로그 저장 실패:', logErr.message);
      }

      res.json({
        ok: true,
        messageId: result.messageId,
        groupId: result.groupId,
        status: result.status,
      });
    } catch (err) {
      console.error('[KAKAO] 발송 실패:', err.message);

      // 발송 실패 로그 저장
      try {
        const { to, templateId, variables, type, relatedTable, relatedId } = req.body;
        const logId = generatePrefixedId('ksl');
        db.run(
          `INSERT INTO kakao_send_logs (
            id, send_type, template_id, recipient, variables,
            status, error_message, related_table, related_id, created_at
          ) VALUES (?, ?, ?, ?, ?, 'failed', ?, ?, ?, ?)`,
          [
            logId,
            type || 'alimtalk',
            templateId || null,
            to,
            variables ? JSON.stringify(variables) : null,
            err.message,
            relatedTable || null,
            relatedId || null,
            Date.now(),
          ]
        );
      } catch (logErr) {
        console.error('[KAKAO] 실패 로그 저장 실패:', logErr.message);
      }

      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};
