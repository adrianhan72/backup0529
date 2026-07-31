/**
 * lib/cron/regular-conversion.js — 정규직 전환 안내 자동발송 (매일 오전 9:00 KST)
 */
const cron = require('node-cron');
const { generatePrefixedId } = require('../utils');
const { regularConversion } = require('../message-templates');

module.exports = function(db, solapi) {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] 정규직 전환 안내 자동발송 시작...');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const TWO_YEARS_DAYS = 730;
      const NOTICE_BEFORE  = 30;

      const contact = db.get(
        `SELECT * FROM representative_contact WHERE id = 'default'`
      ) || {};

      const rows = db.all(`
        SELECT c.employee_id, e.name AS emp_name, c.company_id, co.company_name, co.phone AS company_phone,
               MIN(c.contract_start) AS first_start,
               MAX(c.contract_end) AS last_end,
               CAST(julianday(?) - julianday(MIN(c.contract_start)) AS INTEGER) AS total_days,
               CAST(
                 julianday(COALESCE(MAX(c.contract_end), date('9999-12-31')))
                 - julianday(MIN(c.contract_start)) AS INTEGER
               ) AS days_to_end
        FROM contracts c
        JOIN employees e ON e.id = c.employee_id
        JOIN companies co ON co.id = c.company_id
        WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
          AND c.contract_type IN ('fixed_term', 'fixed_probation', 'daily', 'regular_probation')
          AND c.contract_start IS NOT NULL
          AND c.status NOT IN ('canceled', 'voided')
        GROUP BY c.employee_id
        HAVING total_days >= ?
           AND days_to_end >= ?
      `, [today, TWO_YEARS_DAYS - NOTICE_BEFORE, TWO_YEARS_DAYS]);

      const now = new Date().toISOString();
      let sent = 0;

      for (const r of rows) {
        const already = db.get(`
          SELECT id FROM company_notices
          WHERE employee_id = ? AND notice_type = 'regular_conversion'
            AND date(sent_at) = ?
        `, [r.employee_id, today]);
        if (already) continue;

        const y = Math.floor(r.total_days / 365);
        const m = Math.floor((r.total_days % 365) / 30);
        const durationStr = (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${r.total_days}일)`;
        const isExceeded = r.total_days > TWO_YEARS_DAYS;
        const { title, body } = regularConversion(
          r.company_name, r.emp_name, r.first_start,
          durationStr, contact, isExceeded
        );

        const noticeId = generatePrefixedId('cn');
        db.run(`INSERT INTO company_notices (
            id, company_id, company_name, notice_type,
            title, body, contract_id, employee_id, employee_name,
            contract_end, days_until_expiry, sent_at, sent_by,
            is_read, read_at, gn_status, gn_scheduled_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          noticeId, r.company_id, r.company_name, 'regular_conversion',
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
            console.error(`[CRON] 정규직 전환 알림톡 발송 실패 (${r.company_name}):`, err.message);
          }
        }
        sent++;
      }
      console.log(`[CRON] 정규직 전환 안내 완료: ${rows.length}건 대상, ${sent}건 발송`);
    } catch(e) {
      console.error('[CRON] 정규직 전환 안내 실패:', e.message);
    }
  }, { timezone: 'Asia/Seoul' });
};
