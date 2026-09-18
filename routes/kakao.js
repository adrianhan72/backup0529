/**
 * routes/kakao.js — 카카오 알림톡/SMS 발송 API
 *
 * 보안: authMiddleware 적용 — 관리자 JWT 없이는 발송 불가
 * 템플릿: 프론트는 논리 키(templateKey)만 전송하고,
 *         실제 템플릿 ID는 서버의 lib/alimtalk-template-ids.js에서 매핑
 */
const { generatePrefixedId } = require('../lib/utils');
const { authMiddleware } = require('../middleware/auth');
const { ALIMTALK_TPL_IDS } = require('../lib/alimtalk-template-ids');

module.exports = function(db, solapi) {
  const { Router } = require('express');
  const router = Router();

  // ── 관리자 JWT 인증 (무단 발송·요금 탈취 차단) ──
  router.use(authMiddleware);

  router.post('/send', async (req, res) => {
    try {
      const { to, templateId, templateKey, variables, type, text, from, pfId, reserveTime, relatedTable, relatedId } = req.body;
      // 템플릿 ID 결정: templateKey(논리 키) 우선 → 서버 상수 매핑, 없으면 기존 templateId 통과
      const resolvedTemplateId = (() => {
        const key = String(templateKey || '').toUpperCase();
        if (key && ALIMTALK_TPL_IDS[key]) return ALIMTALK_TPL_IDS[key];
        return templateId || null;
      })();

      let result;

      if (type === 'friendtalk') {
        result = await solapi.sendFriendtalk({ to, text, from, pfId });
      } else if (type === 'sms') {
        result = await solapi.sendSMS({ to, text, from });
      } else {
        if (!resolvedTemplateId) throw new Error('템플릿 ID(templateId 또는 templateKey)는 필수입니다.');
        result = await solapi.sendAlimtalk({ to, templateId: resolvedTemplateId, variables, from, pfId, reserveTime });
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
            resolvedTemplateId || null,
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
        const { to, templateId, templateKey, variables, type, relatedTable, relatedId } = req.body;
        const failedTemplateId = (() => {
          const key = String(templateKey || '').toUpperCase();
          if (key && ALIMTALK_TPL_IDS[key]) return ALIMTALK_TPL_IDS[key];
          return templateId || null;
        })();
        const logId = generatePrefixedId('ksl');
        db.run(
          `INSERT INTO kakao_send_logs (
            id, send_type, template_id, recipient, variables,
            status, error_message, related_table, related_id, created_at
          ) VALUES (?, ?, ?, ?, ?, 'failed', ?, ?, ?, ?)`,
          [
            logId,
            type || 'alimtalk',
            failedTemplateId || null,
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
