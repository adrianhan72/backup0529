/**
 * lib/cron/jobs/probation-expiry.js — 수습만료 통지 자동발송 (매일 09:20)
 *
 * 적용 규칙:
 * - R1: SELECT 시 필요한 컬럼만 (c.* → 필요한 10개 컬럼)
 * - R3: API-First
 * - R5: 실패 시 status='failed' 기록
 * - 중복 SQL 계산 제거 → probation_end_date 미리 계산하여 변수로
 */
const { probationExpiry } = require('../../message-templates');
const { yieldEventLoop } = require('../utils');

const NOTICE_DAYS = 30;

module.exports = async function({ $, solapi, log, generateId }) {
    const today = new Date().toISOString().slice(0, 10);

    const contactP = $.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};

    // prob_end를 서브쿼리로 한 번만 계산
    const rows = $.all(
        `SELECT c.id, c.employee_id, c.company_id, c.contract_type,
                c.contract_start, c.probation_months, c.probation_end_date,
                e.name AS emp_name, co.company_name, co.phone AS company_phone,
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
           AND COALESCE(c.probation_months, 3) >= 1
           AND COALESCE(
             c.probation_end_date,
             date(c.contract_start,
               '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')
           ) >= ?
           AND COALESCE(
             c.probation_end_date,
             date(c.contract_start,
               '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')
           ) <= date(?, '+' || ? || ' days')`,
        [today, today, NOTICE_DAYS]
    );

    const now = new Date().toISOString();
    let sent = 0;

    for (let i = 0; i < rows.length; i++) {
        const c = rows[i];

        // 중복 체크
        const already = $.get(
            `SELECT id FROM company_notices
             WHERE contract_id = ? AND notice_type = 'probation_expiry'
               AND date(sent_at) = ?`,
            [c.id, today]
        );
        if (already) continue;

        const probMonths = c.probation_months || 3;
        const daysLeft = Math.ceil((new Date(c.prob_end) - new Date(today)) / 86400000);
        const ddayStr = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
        const probEndKr = c.prob_end ? c.prob_end.replace(/-/g, '.') : '-';

        const hireType = c.contract_type === 'regular_probation'
            ? '정규직 수습' : '계약직 수습';
        const { title, body } = probationExpiry(
            c.company_name, c.emp_name, hireType,
            probMonths, probEndKr, ddayStr, contactP
        );

        // ── API-First: 알림톡 발송 ──
        let noticeStatus = 'pending';

        if (c.company_phone?.trim()) {
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
                noticeStatus = 'sent';
            } catch (err) {
                noticeStatus = 'failed';
                log('error', `알림톡 실패: ${c.company_name} → ${c.emp_name}`, 'probation-expiry');
            }
        }

        // DB 기록
        const noticeIdP = generateId('cn');
        $.run(
            `INSERT INTO company_notices (
                id, company_id, company_name, notice_type,
                title, body, contract_id, employee_id, employee_name,
                contract_end, days_until_expiry, sent_at, sent_by,
                is_read, read_at, gn_status, gn_scheduled_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                noticeIdP, c.company_id, c.company_name, 'probation_expiry',
                title, body, c.id, c.employee_id, c.emp_name, c.prob_end,
                daysLeft, now, null, 0, '', noticeStatus, ''
            ]
        );

        if (noticeStatus === 'sent') sent++;

        // 50건마다 양보
        if ((i + 1) % 50 === 0) await yieldEventLoop();
    }

    return { processed: rows.length, sent };
};
