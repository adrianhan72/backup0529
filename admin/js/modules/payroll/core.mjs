/**
 * modules/payroll/core.mjs — 급여 관리 모듈 브릿지 (Phase 3-C)
 */
import { formatCurrency } from '../utils.mjs';

/** 이번 달 급여 데이터 */
export function getThisMonthPayrolls() {
  const payrolls = window.allPayrolls || [];
  const now = new Date();
  return payrolls.filter(p => !p.is_draft && p.pay_year === now.getFullYear() && p.pay_month === now.getMonth() + 1);
}

/** 임시저장 급여 목록 */
export function getDraftPayrolls() {
  return (window.allPayrolls || []).filter(p => !!p.is_draft);
}

/** 급여 통계 */
export function getPayrollStats() {
  const all = window.allPayrolls || [];
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

if (typeof window !== 'undefined') {
  window._esmPayrollCore = { getThisMonthPayrolls, getDraftPayrolls, getPayrollStats };
}
