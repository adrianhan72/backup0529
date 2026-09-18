/**
 * lib/cron/jobs/scheduled-notice.js — 예약 발송 고객사 공지 처리 (1분마다)
 *
 * 적용 규칙:
 * - R2: LIMIT 200 + 배치 내 양보 없음 (200건 이내, 1분 주기에 적합)
 * - R3: 해당 없음 (API 호출 없음, DB 상태 변경만)
 * - R4: batchedSync() 50건마다 setImmediate
 */
const { batchedSync } = require('../utils');

module.exports = async function({ $, log }) {
    const now = new Date().toISOString();

    const rows = $.all(
        `SELECT id FROM company_notices
         WHERE gn_status = 'scheduled'
           AND gn_scheduled_at IS NOT NULL
           AND gn_scheduled_at <= ?
         LIMIT 200`,
        [now]
    );

    if (rows.length === 0) return { processed: 0 };

    // prepared statement 재사용 → db.run() 비용 최소화
    const stmt = $.run; // $.run 내부에서 prepare 후 실행

    await batchedSync(rows, (row) => {
        $.run(
            `UPDATE company_notices SET gn_status = 'sent', sent_at = ? WHERE id = ?`,
            [now, row.id]
        );
    }, 50);

    return { processed: rows.length };
};
