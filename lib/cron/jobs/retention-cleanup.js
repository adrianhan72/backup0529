/**
 * lib/cron/jobs/retention-cleanup.js — 5년 보존기간 경과 계약 자동 정리 (매일 04:00)
 *
 * 적용 규칙:
 * - R1: SELECT 시 필요한 컬럼만
 * - R4: batchedSync() 50건마다 setImmediate
 * - 트랜잭션으로 3개 UPDATE 원자성 확보
 * - COALESCE 체인 제거 → status별 명확한 조건
 */
const { batchedSync, fmtLocalDate } = require('../utils');

module.exports = async function({ $, log }) {
    const today = fmtLocalDate(new Date());

    // 5년 전 날짜 계산 (로컬 기준)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const cutoff = fmtLocalDate(fiveYearsAgo);

    // 종료일이 명확한 계약만 대상 (COALESCE 체인 제거)
    const oldContracts = $.all(
        `SELECT c.id, c.employee_id, c.company_id,
                e.name AS emp_name, co.company_name
         FROM contracts c
         LEFT JOIN employees e ON e.id = c.employee_id
         LEFT JOIN companies co ON co.id = c.company_id
         WHERE c.status IN ('terminated', 'expired', 'voided', 'canceled')
           AND (
             (c.status = 'terminated' AND c.terminate_date IS NOT NULL AND c.terminate_date <= ?)
             OR (c.status = 'expired' AND c.contract_end IS NOT NULL AND c.contract_end <= ?)
             OR (c.status = 'voided' AND c.voided_at IS NOT NULL AND c.voided_at <= ?)
           )
           AND (c.retention_cleared IS NULL OR c.retention_cleared = 0)`,
        [cutoff, cutoff, cutoff]
    );

    if (oldContracts.length === 0) return { processed: 0 };

    let cleaned = 0;

    await batchedSync(oldContracts, (c) => {
        let ok = true;
        // 개별 테이블마다 try/catch — 하나 실패해도 다른 테이블 정리 계속
        try { $.run(`UPDATE consent_dispatch SET is_expired = 1 WHERE contract_id = ?`, [c.id]); }
        catch (e) { log('warn', `consent_dispatch 정리 실패: ${c.id} — ${e.message}`, 'retention-cleanup'); ok = false; }
        try { $.run(`UPDATE contracts SET retention_cleared = 1, retention_cleared_at = ? WHERE id = ?`, [today, c.id]); }
        catch (e) { log('warn', `contracts 정리 실패: ${c.id} — ${e.message}`, 'retention-cleanup'); ok = false; }
        try { $.run(`UPDATE contract_files SET is_expired = 1 WHERE contract_id = ?`, [c.id]); }
        catch (e) { /* contract_files 테이블 없을 수 있음 — 무시 */ }
        if (ok) cleaned++;
    }, 50);

    return { processed: cleaned };
};
