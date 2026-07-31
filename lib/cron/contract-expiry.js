/**
 * lib/cron/contract-expiry.js — 계약만료 통지 자동발송 (매일 오전 9:00 KST)
 */
const cron = require('node-cron');
const { generatePrefixedId } = require('../utils');

module.exports = function(db, solapi) {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] 계약만료 통지 자동발송 시작...');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const targetTypes = ['fixed_term', 'fixed_probation', 'daily', 'regular_probation', 'regular'];

      const contracts = db.all(`
        SELECT c.*, e.name AS emp_name, e.phone, e.email, co.company_name
        FROM contracts c
        JOIN employees e ON e.id = c.employee_id
        JOIN companies co ON co.id = c.company_id
        WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
          AND c.contract_type IN (${targetTypes.map(()=>'?').join(',')})
          AND c.contract_end IS NOT NULL
          AND c.contract_start IS NOT NULL
          AND (
            julianday(c.contract_end) - julianday(?) BETWEEN 0 AND 29
            OR julianday(c.contract_end) - julianday(c.contract_start) <= 29
          )
      `, [...targetTypes, today]);

      let sent = 0;
      for (const c of contracts) {
        const already = db.get(`
          SELECT id FROM contract_expiry_notice
          WHERE contract_id = ? AND date(noticed_at) = ?
        `, [c.id, today]);
        if (already) continue;

        const now = new Date().toISOString();
        const daysLeft = Math.ceil((new Date(c.contract_end) - new Date(today)) / (1000*60*60*24));

        if (c.phone && c.phone.trim()) {
          const noticeId = generatePrefixedId('cn');
          db.run(`INSERT INTO contract_expiry_notice (
              id, contract_id, employee_id, employee_name,
              company_id, company_name, contract_type, contract_end,
              days_until_expiry, notice_method, notice_status,
              recipient, noticed_at, note
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            noticeId, c.id, c.employee_id, c.emp_name,
            c.company_id, c.company_name, c.contract_type, c.contract_end,
            daysLeft, 'kakao', 'completed', c.phone, now,
            '시스템 자동발송 (매일 9시)'
          ]);

          try {
            const result = await solapi.sendAlimtalk({
              to: c.phone,
              templateId: 'CONTRACT_EXPIRY_001',
              variables: {
                '#{name}': c.emp_name,
                '#{company}': c.company_name,
                '#{date}': c.contract_end,
                '#{days}': String(daysLeft),
              },
            });
            db.run(`UPDATE contract_expiry_notice SET message_id = ? WHERE id = ?`,
              [result.messageId || null, noticeId]);
          } catch (err) {
            console.error(`[CRON] 계약만료 알림톡 발송 실패 (${c.emp_name}):`, err.message);
          }
          sent++;
        }

        if (c.email && c.email.trim()) {
          db.run(`INSERT INTO contract_expiry_notice (
              id, contract_id, employee_id, employee_name,
              company_id, company_name, contract_type, contract_end,
              days_until_expiry, notice_method, notice_status,
              recipient, noticed_at, note
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            generatePrefixedId('cn'), c.id, c.employee_id, c.emp_name,
            c.company_id, c.company_name, c.contract_type, c.contract_end,
            daysLeft, 'email', 'completed', c.email, now,
            '시스템 자동발송 (매일 9시)'
          ]);
          sent++;
        }
      }
      console.log(
        `[CRON] 계약만료 통지 완료: ${contracts.length}건 대상, ${sent}건 발송`
      );
    } catch(e) {
      console.error('[CRON] 계약만료 통지 실패:', e.message);
    }
  }, { timezone: 'Asia/Seoul' });
};
