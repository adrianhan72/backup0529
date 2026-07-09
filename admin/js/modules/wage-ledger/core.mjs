/**
 * modules/wage-ledger/core.mjs — 임금대장 모듈 브릿지 (Phase 3-C)
 */
import { formatCurrency } from '../utils.mjs';

/** 연도별 급여 총계 */
export function getYearlyPayrollSummary(year) {
  const yr = year || new Date().getFullYear();
  const payrolls = (window.allPayrolls || []).filter(p => !p.is_draft && p.pay_year === yr);
  const total = payrolls.reduce((s, p) => s + (p.total_amount || 0), 0);
  return { year: yr, count: payrolls.length, totalAmount: total, avgMonthly: Math.round(total / 12) };
}

/** 미확인 임금대장 알림 수 */
export function getWLNotificationCount() {
  return (window.allWLNotifications || []).length || 0;
}

if (typeof window !== 'undefined') {
  window._esmWageLedgerCore = { getYearlyPayrollSummary, getWLNotificationCount };
}
