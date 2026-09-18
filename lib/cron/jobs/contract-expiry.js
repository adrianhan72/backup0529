/**
 * lib/cron/jobs/contract-expiry.js — 계약만료 통지 자동발송 (매일 09:00)
 *
 * 적용 규칙:
 * - R1: SELECT 시 필요한 컬럼만 (c.* → 10개 컬럼)
 * - R2: batchedQuery() 100건 배치
 * - R3: API-First (발송 성공 → DB 기록)
 * - R5: 실패 시 status='failed' + error_message
 * - R6: 활성 상태만 필터 (active, pending, renewal_pending, docs_incomplete)
 * - 'regular' 타입 제외 (정규직은 무기계약이므로 만료 통지 불필요)
 * - 단기계약 조건에 contract_end >= today 추가 (과거 계약 필터)
 */
const { batchedQuery, yieldEventLoop, fmtLocalDate } = require('../utils');

const ALL_TARGET_TYPES = ['fixed_term', 'fixed_probation', 'daily', 'regular_probation'];
const PROBATION_TYPES = ['fixed_probation', 'regular_probation'];
const ACTIVE_STATUSES = ['active', 'pending', 'renewal_pending', 'docs_incomplete'];

module.exports = async function({ $, solapi, log, generateId }) {
    const today = fmtLocalDate(new Date());

    // 계약만료 통지 기능 OFF → 전체 건너뛰기
    const ceEnabled = ($.get(
        `SELECT setting_value FROM system_settings WHERE setting_key = ?`,
        ['contract_expiry_notice_enabled']
    ) || {}).setting_value === '1';
    if (!ceEnabled) {
        log('[contract-expiry] 계약만료 통지 기능 OFF — 건너뜀');
        return 0;
    }

    // 수습 기능 OFF → 수습 타입 제외
    const probationEnabled = ($.get(
        `SELECT setting_value FROM system_settings WHERE setting_key = ?`,
        ['probation_feature_enabled']
    ) || {}).setting_value === '1';
    const TARGET_TYPES = probationEnabled
        ? ALL_TARGET_TYPES
        : ALL_TARGET_TYPES.filter(t => !PROBATION_TYPES.includes(t));

    // ── 배치 SELECT + 양보 ──
    const placeholders = {
        statuses: ACTIVE_STATUSES.map(() => '?').join(','),
        types:    TARGET_TYPES.map(() => '?').join(','),
    };

    const contracts = await batchedQuery(
        (lim, off) => $.all(
            `SELECT c.id, c.employee_id, c.company_id, c.contract_type,
                    c.contract_end, c.contract_start,
                    e.name AS emp_name, e.phone, e.email,
                    co.company_name
             FROM contracts c
             JOIN employees e ON e.id = c.employee_id
             JOIN companies co ON co.id = c.company_id
             WHERE c.is_draft = 0
               AND c.is_voided_by_amend = 0
               AND c.status IN (${placeholders.statuses})
               AND c.contract_type IN (${placeholders.types})
               AND c.contract_end IS NOT NULL
               AND c.contract_start IS NOT NULL
               AND (
                 julianday(c.contract_end) - julianday(?) BETWEEN 0 AND 29
                 OR (
                   julianday(c.contract_end) - julianday(c.contract_start) <= 29
                   AND c.contract_end >= ?
                 )
               )
             LIMIT ? OFFSET ?`,
            [...ACTIVE_STATUSES, ...TARGET_TYPES, today, today, lim, off]
        ),
        100
    );

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < contracts.length; i++) {
        const c = contracts[i];

        // 중복 발송 체크 (당일)
        const already = $.get(
            `SELECT id FROM contract_expiry_notice
             WHERE contract_id = ? AND date(noticed_at) = ?`,
            [c.id, today]
        );
        if (already) continue;

        const daysLeft = Math.ceil(
            (new Date(c.contract_end) - new Date(today)) / 86400000
        );
        const now = new Date().toISOString();

        // ── 카카오 알림톡 발송 (API-First) ──
        if (c.phone?.trim()) {
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

                // 성공 → DB 기록
                const noticeId = generateId('cn');
                $.run(
                    `INSERT INTO contract_expiry_notice (
                        id, contract_id, employee_id, employee_name,
                        company_id, company_name, contract_type, contract_end,
                        days_until_expiry, notice_method, notice_status,
                        recipient, message_id, noticed_at, note
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [
                        noticeId, c.id, c.employee_id, c.emp_name,
                        c.company_id, c.company_name, c.contract_type, c.contract_end,
                        daysLeft, 'kakao', 'sent', c.phone,
                        result.messageId || null, now,
                        '시스템 자동발송 (매일 9시)'
                    ]
                );
                sent++;
            } catch (err) {
                // 실패 → DB 기록 (추적용)
                const noticeId = generateId('cn');
                $.run(
                    `INSERT INTO contract_expiry_notice (
                        id, contract_id, employee_id, employee_name,
                        company_id, company_name, contract_type, contract_end,
                        days_until_expiry, notice_method, notice_status,
                        recipient, error_message, noticed_at, note
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [
                        noticeId, c.id, c.employee_id, c.emp_name,
                        c.company_id, c.company_name, c.contract_type, c.contract_end,
                        daysLeft, 'kakao', 'failed', c.phone,
                        err.message, now,
                        '시스템 자동발송 실패'
                    ]
                );
                failed++;
                log('error', `알림톡 실패: ${c.emp_name} (${c.company_name})`, 'contract-expiry');
            }
        }

        // ── 이메일 발송은 DB 기록만 (실제 이메일 발송은 미구현) ──
        if (c.email?.trim()) {
            const noticeId = generateId('cn');
            $.run(
                `INSERT INTO contract_expiry_notice (
                    id, contract_id, employee_id, employee_name,
                    company_id, company_name, contract_type, contract_end,
                    days_until_expiry, notice_method, notice_status,
                    recipient, noticed_at, note
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    noticeId, c.id, c.employee_id, c.emp_name,
                    c.company_id, c.company_name, c.contract_type, c.contract_end,
                    daysLeft, 'email', 'pending', c.email, now,
                    '시스템 자동발송 (이메일)'
                ]
            );
            sent++;
        }

        // 50건마다 양보
        if ((i + 1) % 50 === 0) await yieldEventLoop();
    }

    log('info', `완료: ${contracts.length}건 대상, ${sent}건 발송, ${failed}건 실패`, 'contract-expiry');
    return { processed: contracts.length, sent, failed };
};
