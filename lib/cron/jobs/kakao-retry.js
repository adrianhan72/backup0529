/**
 * lib/cron/jobs/kakao-retry.js — 카카오 발송 실패 건 자동 재시도 (10분마다)
 *
 * 적용 규칙:
 * - R1: SELECT 시 필요한 컬럼만 (LIMIT 50 유지)
 * - R3: API 호출 성공 후 DB 상태 변경
 * - R4: 건별 await solapi → 자연스러운 양보, 추가 batchedSync 불필요
 */
const { yieldEventLoop } = require('../utils');

const MAX_RETRY = 3;

module.exports = async function({ $, solapi, log }) {
    const failedRows = $.all(
        `SELECT id, send_type, template_id, recipient, variables, retry_count
         FROM kakao_send_logs
         WHERE status = 'failed' AND retry_count < ?
         ORDER BY created_at ASC
         LIMIT 50`,
        [MAX_RETRY]
    );

    let retried = 0;
    let succeeded = 0;

    for (const row of failedRows) {
        const variables = row.variables ? JSON.parse(row.variables) : {};
        const now = new Date().toISOString();

        try {
            let result;
            if (row.send_type === 'friendtalk') {
                result = await solapi.sendFriendtalk({
                    to: row.recipient,
                    text: variables?.message || '',
                    pfId: process.env.SOLAPI_KAKAO_PF_ID || '',
                });
            } else if (row.send_type === 'sms') {
                result = await solapi.sendSMS({
                    to: row.recipient,
                    text: variables?.message || '',
                });
            } else {
                result = await solapi.sendAlimtalk({
                    to: row.recipient,
                    templateId: row.template_id,
                    variables,
                });
            }

            // API-First: 성공 후 DB 업데이트
            $.run(
                `UPDATE kakao_send_logs
                 SET status = 'sent', message_id = ?,
                     sent_at = ?, retry_count = retry_count + 1
                 WHERE id = ?`,
                [result.messageId || null, now, row.id]
            );
            succeeded++;
        } catch (err) {
            const newRetryCount = (row.retry_count || 0) + 1;
            $.run(
                `UPDATE kakao_send_logs
                 SET error_message = ?, retry_count = ?
                 WHERE id = ?`,
                [err.message, newRetryCount, row.id]
            );

            if (newRetryCount >= MAX_RETRY) {
                log('warn', `영구 실패: ${row.id} → ${row.recipient} (${MAX_RETRY}회 초과)`, 'kakao-retry');
            }
        }
        retried++;

        // 건별 이벤트 루프 양보 (다른 크론 실행 기회)
        if (retried % 10 === 0) await yieldEventLoop();
    }

    return { processed: retried, succeeded };
};
