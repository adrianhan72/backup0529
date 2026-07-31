/**
 * lib/cron/probation-expiry.js — 수습만료 통지 자동발송 (매일 오전 9:00 KST)
 */
const cron = require('node-cron');
const { generatePrefixedId } = require('../utils');
const { probationExpiry } = require('../message-templates');

module.exports = function(db, solapi) {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] 수습만료 통지 자동발송 시작...');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const NOTICE_DAYS = 30;

      const contactP = db.get(
        `SELECT * FROM representative_contact WHERE id = 'default'`
      ) || {};

      const rows = db.all(`
        SELECT c.*, e.name AS emp_name, co.company_name, co.phone AS company_phone,
               COALESCE(
                 c.probation_end_date,
                 date(c.contract_start,
                   '+' || COALESCE(c.probation_months, 3) || ' months',
                   '-1 day')
               ) AS prob_end
        FROM contracts c
        JOIN employees e ON e.id = c.employee_id
        JOIN companies co ON co.id = c.company_id
        WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
          AND c.contract_type IN ('regular_probation', 'fixed_probation')
          AND c.contract_start IS NOT NULL
          AND c.status NOT IN ('voided', 'terminated', 'canceled', 'expired')
          AND COALESCE(c.probation_months, 3) > 3
          AND COALESCE(
            c.probation_end_date,
            date(c.contract_start,
              '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')
          ) >= ?
          AND COALESCE(
            c.probation_end_date,
            date(c.contract_start,
              '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')
          ) <= date(?, '+' || ? || ' days')
      `, [today, today, NOTICE_DAYS]);

      const now = new Date().toISOString();
      let sent = 0;

      for (const c of rows) {
        const already = db.get(`
          SELECT id FROM company_notices
          WHERE contract_id = ? AND notice_type = 'probation_expiry'
            AND date(sent_at) = ?
        `, [c.id, today]);
        if (already) continue;

        const probMonths = c.probation_months || 3;
        const daysLeft = Math.ceil((new Date(c.prob_end) - new Date(today)) / (1000 * 60 * 60 * 24));
        const ddayStr = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
        const probEndKr = c.prob_end ? c.prob_end.replace(/-/g, '.') : '-';

        const title = `[수습만료 예정] ${c.emp_name} — 수습기간 ${probMonths}개월 (${ddayStr})`;
        const hireType = c.contract_type === 'regular_probation'
          ? '정규직 수습' : '계약직 수습';
        const { body } = probationExpiry(
          c.company_name, c.emp_name, hireType,
          probMonths, probEndKr, ddayStr, contactP
        );

        const noticeIdP = generatePrefixedId('cn');
        db.run(`INSERT INTO company_notices (
            id, company_id, company_name, notice_type,
            title, body, contract_id, employee_id, employee_name,
            contract_end, days_until_expiry, sent_at, sent_by,
            is_read, read_at, gn_status, gn_scheduled_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          noticeIdP, c.company_id, c.company_name, 'probation_expiry',
          title, body, c.id, c.employee_id, c.emp_name, c.prob_end,
          daysLeft, now, null, 0, '', 'sent', ''
        ]);

        if (c.company_phone && c.company_phone.trim()) {
          try {
            await solapi.sendAlimtalk({
              to: c.company_phone,
              templateId: 'PROBATION_EXPIRY_001',
              variables: {
                '#{name}': c.emp_name,
                '#{company}': c.company_name,
                '#{date}': c.prob_end,
                '#{days}': String(daysLeft),
              },
            });
          } catch (err) {
            console.error(`[CRON] 수습만료 알림톡 발송 실패 (${c.emp_name}):`, err.message);
          }
        }
        sent++;
      }
      console.log(`[CRON] 수습만료 통지 완료: ${rows.length}건 대상, ${sent}건 발송`);
    } catch(e) {
      console.error('[CRON] 수습만료 통지 실패:', e.message);
    }
  }, { timezone: 'Asia/Seoul' });
};
