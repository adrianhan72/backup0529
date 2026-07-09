/**
 * modules/payroll/core.mjs — 급여 관리 모듈 (Phase 3)
 */
import { formatCurrency } from '../utils.mjs';
import { getPayrolls } from '../state.mjs';

/** 이번 달 급여 데이터 */
export function getThisMonthPayrolls() {
  const payrolls = getPayrolls();
  const now = new Date();
  return payrolls.filter(p => !p.is_draft && p.pay_year === now.getFullYear() && p.pay_month === now.getMonth() + 1);
}

/** 임시저장 급여 목록 */
export function getDraftPayrolls() {
  return getPayrolls().filter(p => !!p.is_draft);
}

/** 급여 통계 */
export function getPayrollStats() {
  const all = getPayrolls();
  const completed = all.filter(p => !p.is_draft);
  const drafts = all.filter(p => !!p.is_draft);
  const now = new Date();
  const thisMonth = completed.filter(p => p.pay_year === now.getFullYear() && p.pay_month === now.getMonth() + 1);
  const totalAmount = thisMonth.reduce((s, p) => s + (p.total_amount || 0), 0);
  const avgAmount = completed.length ? Math.round(completed.reduce((s, p) => s + (p.total_amount || 0), 0) / completed.length) : 0;
  return {
    total: all.length,
    drafts: drafts.length,
    thisMonth: thisMonth.length,
    thisMonthAmount: totalAmount,
    avgAmount,
    companyCount: new Set(completed.map(p => p.company_id)).size,
  };
}

export function register() {
  return { getThisMonthPayrolls, getDraftPayrolls, getPayrollStats };
}
