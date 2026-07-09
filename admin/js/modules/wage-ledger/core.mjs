/**
 * modules/wage-ledger/core.mjs — 임금대장 모듈 (Phase 3)
 */
import { formatCurrency } from '../utils.mjs';
import { getPayrolls, getWLNotifications } from '../state.mjs';

/** 연도별 급여 총계 */
export function getYearlyPayrollSummary(year) {
  const yr = year || new Date().getFullYear();
  const payrolls = getPayrolls().filter(p => !p.is_draft && p.pay_year === yr);
  const total = payrolls.reduce((s, p) => s + (p.total_amount || 0), 0);
  return { year: yr, count: payrolls.length, totalAmount: total, avgMonthly: Math.round(total / 12) };
}

/** 미확인 임금대장 알림 수 */
export function getWLNotificationCount() {
  return getWLNotifications().length || 0;
}

export function register() {
  return { getYearlyPayrollSummary, getWLNotificationCount };
}
