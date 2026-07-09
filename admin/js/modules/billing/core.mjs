/**
 * modules/billing/core.mjs — 청구·기준·계정 모듈 브릿지 (Phase 3-C)
 */
import { PAYMENT_STATUS, PAYMENT_STATUS_LABEL } from '../constants.mjs';
import { formatCurrency } from '../utils.mjs';

/** 미납 청구서 */
export function getUnpaidBillings() {
  return (window.allBillings || []).filter(b => b.payment_status === PAYMENT_STATUS.UNPAID || b.payment_status === PAYMENT_STATUS.PENDING);
}

/** 청구 통계 */
export function getBillingStats() {
  const billings = window.allBillings || [];
  const now = new Date();
  const thisMonth = billings.filter(b => b.bill_year === now.getFullYear() && b.bill_month === now.getMonth() + 1);
  const totalAmount = thisMonth.reduce((s, b) => s + (b.total_amount || 0), 0);
  return {
    total: billings.length,
    thisMonth: thisMonth.length,
    thisMonthAmount: totalAmount,
    unpaid: billings.filter(b => b.payment_status === PAYMENT_STATUS.UNPAID).length,
    paid: billings.filter(b => b.payment_status === PAYMENT_STATUS.PAID).length,
  };
}

/** 관리자 계정 수 */
export function getAdminAccountCount() {
  return (window.adminAccounts || []).length || 0;
}

if (typeof window !== 'undefined') {
  window._esmBillingCore = { getUnpaidBillings, getBillingStats, getAdminAccountCount };
}
