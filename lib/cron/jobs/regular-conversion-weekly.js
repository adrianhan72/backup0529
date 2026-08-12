/**
 * lib/cron/jobs/regular-conversion-weekly.js — 정규직 전환 주간 재발송 (매주 월요일 09:00)
 *
 * 적용 규칙:
 * - R1: 필요한 컬럼만 SELECT
 * - R3: API-First
 * - R5: 실패 시 status='failed' 기록
 * - 무한 재발송 방지: total_days > 730 AND total_days <= 790 (60일간만 재발송)
 */
const { regularConversionWeekly } = require('../../message-templates');
const { yieldEventLoop } = require('../utils');

const TWO_YEARS_DAYS = 730;
const MAX_RESEND_DAYS = 790; // 2년 + 60일까지만 재발송

module.exports = async function({ $, solapi, log, generateId }) {
    const today = new Date().toISOString().slice(0, 10);

    // 수습 기능 OFF → probation 타입 제외
    const probationEnabled = ($.get(
        `SELECT setting_value FROM system_settings WHERE setting_key = ?`,
        ['probation_feature_enabled']
    ) || {}).setting_value === '1';
    const contractTypes = probationEnabled
        ? ['fixed_term', 'fixed_probation', 'daily', 'regular_probation']
        : ['fixed_term', 'daily'];
    const typePlaceholders = contractTypes.map(() => '?').join(',');

    const contactW = $.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};

    const rows = $.all(
        `SELECT c.employee_id, e.name AS emp_name,
                c.company_id, co.company_name, co.phone AS company_phone,
                MIN(c.contract_start) AS first_start,
                CAST(julianday(?) - julianday(MIN(c.contract_start)) AS INTEGER) AS total_days
         FROM contracts c
         JOIN employees e ON e.id = c.employee_id
         JOIN companies co ON co.id = c.company_id
         WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
           AND c.contract_type IN (${typePlaceholders})
           AND c.contract_start IS NOT NULL
           AND c.status NOT IN ('canceled', 'voided')
         GROUP BY c.employee_id
         HAVING total_days > ? AND total_days <= ?`,
        [today, ...contractTypes, TWO_YEARS_DAYS, MAX_RESEND_DAYS]
    );

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    let resent = 0;

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        // 정규직 전환 완료 여부 확인
        const hasRegular = $.get(
            `SELECT id FROM contracts
             WHERE employee_id = ? AND contract_type = 'regular'
               AND is_draft = 0 AND is_voided_by_amend = 0
               AND status NOT IN ('canceled', 'voided')
             LIMIT 1`,
            [r.employee_id]
        );
        if (hasRegular) continue;

        // 최근 7일 내 발송 여부 확인
        const recentlySent = $.get(
            `SELECT id FROM company_notices
             WHERE employee_id = ? AND notice_type = 'regular_conversion'
               AND sent_at >= ?
             LIMIT 1`,
            [r.employee_id, sevenDaysAgo]
        );
        if (recentlySent) continue;

        const y = Math.floor(r.total_days / 365);
        const m = Math.floor((r.total_days % 365) / 30);
        const durationStr = (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${r.total_days}일)`;

        const title = `[재안내] 정규직 전환 의무 — ${r.emp_name} (누적 ${durationStr})`;
        const { body } = regularConversionWeekly(
            r.company_name, r.emp_name, r.first_start,
            durationStr, contactW
        );

        // ── API-First: 알림톡 발송 ──
        let messageId = null;
        let noticeStatus = 'pending';

        if (r.company_phone?.trim()) {
            try {
                const result = await solapi.sendAlimtalk({
                    to: r.company_phone,
                    templateId: 'REGULAR_CONVERSION_001',
                    variables: {
                        '#{name}': r.emp_name,
                        '#{company}': r.company_name,
                        '#{duration}': durationStr,
                    },
                });
                messageId = result.messageId || null;
                noticeStatus = 'sent';
            } catch (err) {
                noticeStatus = 'failed';
                log('error', `알림톡 실패: ${r.company_name} → ${r.emp_name}`, 'regular-conversion-weekly');
            }
        }

        // DB 기록
        const noticeIdW = generateId('cn');
        $.run(
            `INSERT INTO company_notices (
                id, company_id, company_name, notice_type,
                title, body, contract_id, employee_id, employee_name,
                contract_end, days_until_expiry, sent_at, sent_by,
                is_read, read_at, gn_status, gn_scheduled_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                noticeIdW, r.company_id, r.company_name, 'regular_conversion',
                title, body, '', r.employee_id, r.emp_name, '', 0, now,
                null, 0, '', noticeStatus, ''
            ]
        );

        if (noticeStatus === 'sent') resent++;

        // 50건마다 양보
        if ((i + 1) % 50 === 0) await yieldEventLoop();
    }

    return { processed: rows.length, resent };
};
