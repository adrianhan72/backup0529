/**
 * lib/cron/retention-cleanup.js — 5년 보존기간 경과 계약 자동 정리 (매일 오전 4:00 KST)
 */
const cron = require('node-cron');

module.exports = function(db) {
  cron.schedule('0 4 * * *', async () => {
    console.log('[CRON] 5년 보존기간 경과 계약 정리 시작...');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const FIVE_YEARS_AGO = new Date();
      FIVE_YEARS_AGO.setFullYear(FIVE_YEARS_AGO.getFullYear() - 5);
      const cutoff = FIVE_YEARS_AGO.toISOString().slice(0, 10);

      const oldContracts = db.all(`
        SELECT c.*, e.name AS emp_name, co.company_name
        FROM contracts c
        LEFT JOIN employees e ON e.id = c.employee_id
        LEFT JOIN companies co ON co.id = c.company_id
        WHERE c.status IN ('terminated', 'expired', 'voided', 'canceled')
          AND (
            COALESCE(c.terminate_date, c.contract_end, c.voided_at, date(c.updated_at)) <= ?
          )
          AND (c.retention_cleared IS NULL OR c.retention_cleared = 0)
      `, [cutoff]);

      if (oldContracts.length === 0) {
        console.log('[CRON] 5년 경과 계약 없음');
        return;
      }

      console.log(`[CRON] 5년 경과 계약 ${oldContracts.length}건 정리 중...`);

      for (const c of oldContracts) {
        try {
          db.run(`UPDATE consent_dispatch SET is_expired = 1 WHERE contract_id = ?`, [c.id]);
          db.run(`UPDATE contracts SET retention_cleared = 1, retention_cleared_at = ? WHERE id = ?`, [today, c.id]);
          db.run(`UPDATE contract_files SET is_expired = 1 WHERE contract_id = ?`, [c.id]);

          console.log(
            `[CRON]   정리 완료: ${c.emp_name||'?'} / ${c.company_name||'?'}` +
            ` (종료: ${c.terminate_date||c.contract_end||'?'}, 계약ID: ${c.id})`
          );
        } catch (e) {
          console.error(`[CRON]   정리 실패 (${c.id}):`, e.message);
        }
      }

      console.log(`[CRON] 5년 보존기간 경과 계약 정리 완료: ${oldContracts.length}건`);
    } catch (e) {
      console.error('[CRON] 5년 보존기간 정리 오류:', e.message);
    }
  }, { timezone: 'Asia/Seoul' });
};
