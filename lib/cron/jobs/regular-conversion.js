/**
 * lib/cron/jobs/regular-conversion.js — 정규직 전환 안내 자동발송 (매일 10:00)
 *
 * 적용 규칙:
 * - R1: 필요한 컬럼만 SELECT
 * - R3: API-First
 * - R5: 실패 시 status='failed' 기록
 * - lib/message-templates.js의 regularConversion() 사용
 */
const { regularConversion, getMsgRuleFromContact, applyMsgRuleVars, contactFooter, CONTRACT_TYPE_KR } = require('../../message-templates');
const { yieldEventLoop } = require('../utils');

const TWO_YEARS_DAYS = 730;
const NOTICE_BEFORE  = 30;

module.exports = async function({ $, solapi, log, generateId }) {
    const today = new Date().toISOString().slice(0, 10);

    // 정규직 전환 고지 기능 OFF → 전체 건너뛰기
    const rcEnabled = ($.get(
        `SELECT setting_value FROM system_settings WHERE setting_key = ?`,
        ['regular_conversion_notice_enabled']
    ) || {}).setting_value === '1';
    if (!rcEnabled) {
        log('[regular-conversion] 정규직 전환 고지 기능 OFF — 건너뜀');
        return 0;
    }

    // 수습 기능 OFF → probation 타입 제외
    const probationEnabled = ($.get(
        `SELECT setting_value FROM system_settings WHERE setting_key = ?`,
        ['probation_feature_enabled']
    ) || {}).setting_value === '1';
    const contractTypes = probationEnabled
        ? ['fixed_term', 'fixed_probation', 'daily', 'regular_probation']
        : ['fixed_term', 'daily'];

    const contact = $.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};

    const typePlaceholders = contractTypes.map(() => '?').join(',');
    const rows = $.all(
        `SELECT c.employee_id, e.name AS emp_name,
                c.company_id, co.company_name, co.phone AS company_phone,
                MIN(c.contract_start) AS first_start,
                MAX(c.contract_end) AS last_end,
                MAX(c.contract_type) AS contract_type,
                CAST(julianday(?) - julianday(MIN(c.contract_start)) AS INTEGER) AS total_days,
                CAST(
                  julianday(COALESCE(MAX(c.contract_end), date('9999-12-31')))
                  - julianday(MIN(c.contract_start)) AS INTEGER
                ) AS days_to_end
         FROM contracts c
         JOIN employees e ON e.id = c.employee_id
         JOIN companies co ON co.id = c.company_id
         WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
           AND c.contract_type IN (${typePlaceholders})
           AND c.contract_start IS NOT NULL
           AND c.status NOT IN ('canceled', 'voided')
         GROUP BY c.employee_id
         HAVING total_days >= ?
            AND days_to_end >= ?`,
        [today, ...contractTypes, TWO_YEARS_DAYS - NOTICE_BEFORE, TWO_YEARS_DAYS]
    );

    const now = new Date().toISOString();
    let sent = 0;

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        // 중복 체크
        const already = $.get(
            `SELECT id FROM company_notices
             WHERE employee_id = ? AND notice_type = 'regular_conversion'
               AND date(sent_at) = ?`,
            [r.employee_id, today]
        );
        if (already) continue;

        const y = Math.floor(r.total_days / 365);
        const m = Math.floor((r.total_days % 365) / 30);
        const durationStr = (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${r.total_days}일)`;
        const isExceeded = r.total_days > TWO_YEARS_DAYS;
        let { title, body } = regularConversion(
            r.company_name, r.emp_name, r.first_start,
            durationStr, contact, isExceeded
        );

        // ── 시스템 설정 본문 규칙 적용 (커스텀 규칙 있으면 덮어씀) ──
        const _rcRule = getMsgRuleFromContact(contact, 'regular_conversion');
        if (_rcRule && (_rcRule.title || _rcRule.body)) {
            const _vars = {
                '회사명': r.company_name,
                '근로자명': r.emp_name,
                '고용형태': CONTRACT_TYPE_KR[r.contract_type] || r.contract_type || '',
                '입사일': r.first_start || '-',
                '근속일수': durationStr,
                '처리일시': new Date().toLocaleString('ko-KR'),
            };
            if (_rcRule.title) title = applyMsgRuleVars(_rcRule.title, _vars);
            if (_rcRule.body) body = applyMsgRuleVars(_rcRule.body, _vars) + '\n\n' + contactFooter(contact);
        }

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
                log('error', `알림톡 실패: ${r.company_name} → ${r.emp_name}`, 'regular-conversion');
            }
        }

        // DB 기록
        const noticeId = generateId('cn');
        $.run(
            `INSERT INTO company_notices (
                id, company_id, company_name, notice_type,
                title, body, contract_id, employee_id, employee_name,
                contract_end, days_until_expiry, sent_at, sent_by,
                is_read, read_at, gn_status, gn_scheduled_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                noticeId, r.company_id, r.company_name, 'regular_conversion',
                title, body, '', r.employee_id, r.emp_name, '', 0, now,
                null, 0, '', noticeStatus, ''
            ]
        );

        if (noticeStatus === 'sent') sent++;

        // 50건마다 양보
        if ((i + 1) % 50 === 0) await yieldEventLoop();
    }

    return { processed: rows.length, sent };
};
