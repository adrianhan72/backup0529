/**
 * lib/cron/regular-conversion-weekly.js — 정규직 전환 안내 주간 재발송 (매주 월요일 오전 9:00 KST)
 */
const cron = require('node-cron');
const { generatePrefixedId } = require('../utils');
const { regularConversionWeekly } = require('../message-templates');

module.exports = function(db, solapi) {
  cron.schedule('0 9 * * 1', async () => {
    console.log('[CRON] 정규직 전환 주간 재발송 시작...');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const TWO_YEARS_DAYS = 730;

      const contactW = db.get(
        `SELECT * FROM representative_contact WHERE id = 'default'`
      ) || {};

      const rows = db.all(`
        SELECT c.employee_id, e.name AS emp_name, c.company_id, co.company_name, co.phone AS company_phone,
               MIN(c.contract_start) AS first_start,
               CAST(julianday(?) - julianday(MIN(c.contract_start)) AS INTEGER) AS total_days
        FROM contracts c
        JOIN employees e ON e.id = c.employee_id
        JOIN companies co ON co.id = c.company_id
        WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
          AND c.contract_type IN ('fixed_term', 'fixed_probation', 'daily', 'regular_probation')
          AND c.contract_start IS NOT NULL
          AND c.status NOT IN ('canceled', 'voided')
        GROUP BY c.employee_id
        HAVING total_days > ?
      `, [today, TWO_YEARS_DAYS]);

      const now = new Date().toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let resent = 0;

      for (const r of rows) {
        const hasRegular = db.get(`
          SELECT id FROM contracts
          WHERE employee_id = ? AND contract_type = 'regular'
            AND is_draft = 0 AND is_voided_by_amend = 0
            AND status NOT IN ('canceled', 'voided')
          LIMIT 1
        `, [r.employee_id]);
        if (hasRegular) continue;

        const recentlySent = db.get(`
          SELECT id FROM company_notices
          WHERE employee_id = ? AND notice_type = 'regular_conversion'
            AND sent_at >= ?
          LIMIT 1
        `, [r.employee_id, sevenDaysAgo]);
        if (recentlySent) continue;

        const y = Math.floor(r.total_days / 365);
        const m = Math.floor((r.total_days % 365) / 30);
        const durationStr = (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${r.total_days}일)`;

        const title = `[재안내] 정규직 전환 의무 — ${r.emp_name} (누적 ${durationStr})`;
        const { body } = regularConversionWeekly(
          r.company_name, r.emp_name, r.first_start,
          durationStr, contactW
        );

        const noticeIdW = generatePrefixedId('cn');
        db.run(`INSERT INTO company_notices (
            id, company_id, company_name, notice_type,
            title, body, contract_id, employee_id, employee_name,
            contract_end, days_until_expiry, sent_at, sent_by,
            is_read, read_at, gn_status, gn_scheduled_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          noticeIdW, r.company_id, r.company_name, 'regular_conversion',
          title, body, '', r.employee_id, r.emp_name, '', 0, now,
          null, 0, '', 'sent', ''
        ]);

        if (r.company_phone && r.company_phone.trim()) {
          try {
            await solapi.sendAlimtalk({
              to: r.company_phone,
              templateId: 'REGULAR_CONVERSION_001',
              variables: { '#{name}': r.emp_name, '#{company}': r.company_name, '#{duration}': durationStr },
            });
          } catch (err) {
            console.error(`[CRON] 정규직 전환 재발송 알림톡 실패 (${r.company_name}):`, err.message);
          }
        }
        resent++;
      }
      console.log(`[CRON] 정규직 전환 주간 재발송 완료: ${rows.length}건 확인, ${resent}건 재발송`);
    } catch(e) {
      console.error('[CRON] 정규직 전환 주간 재발송 실패:', e.message);
    }
  }, { timezone: 'Asia/Seoul' });
};
