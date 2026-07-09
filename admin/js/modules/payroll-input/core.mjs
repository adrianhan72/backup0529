/**
 * modules/payroll-input/core.mjs — 급여입력 모듈 브릿지 (Phase 3-C)
 */

/** 이번 달 임시저장 급여 */
export function getThisMonthDrafts() {
  const now = new Date();
  return (window.allPayrolls || []).filter(p =>
    p.is_draft && p.pay_year === now.getFullYear() && p.pay_month === now.getMonth() + 1
  );
}

/** 전월 미완료 급여 */
export function getPrevMonthDrafts() {
  const now = new Date();
  const pm = now.getMonth() === 0 ? 12 : now.getMonth();
  const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return (window.allPayrolls || []).filter(p =>
    p.is_draft && p.pay_year === py && p.pay_month === pm
  );
}

/** 급여입력 통계 */
export function getPayrollInputStats() {
  const all = window.allPayrolls || [];
  const drafts = all.filter(p => !!p.is_draft);
  const now = new Date();
  const thisMonth = drafts.filter(p => p.pay_year === now.getFullYear() && p.pay_month === now.getMonth() + 1);
  const prevMonth = getPrevMonthDrafts();
  const completedThisMonth = all.filter(p => !p.is_draft && p.pay_year === now.getFullYear() && p.pay_month === now.getMonth() + 1);
  return {
    totalDrafts: drafts.length,
    thisMonthDrafts: thisMonth.length,
    prevMonthDrafts: prevMonth.length,
    completedThisMonth: completedThisMonth.length,
    draftCompanyCount: new Set(drafts.map(p => p.company_id)).size,
  };
}

if (typeof window !== 'undefined') {
  window._esmPayrollInputCore = { getThisMonthDrafts, getPrevMonthDrafts, getPayrollInputStats };
}
