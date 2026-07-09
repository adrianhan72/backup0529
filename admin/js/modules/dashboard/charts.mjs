/**
 * modules/dashboard/charts.mjs — 대시보드 차트 모듈 (Phase 3-C)
 * 
 * 기존 dashboard-charts.js 차트 함수들을 모듈로 브릿지.
 */
import { getPayrolls, getBillings } from '../state.mjs';
import { formatCurrency } from '../utils.mjs';

/** 급여 추세 차트 데이터 계산 */
export function calcPayrollTrend() {
  const payrolls = getPayrolls();
  const monthly = {};
  payrolls.filter(p => !p.is_draft).forEach(p => {
    const key = `${p.pay_year}-${String(p.pay_month).padStart(2,'0')}`;
    monthly[key] = (monthly[key] || 0) + (p.total_amount || 0);
  });
  return Object.entries(monthly).sort().slice(-12);
}

/** 청구 추세 차트 데이터 */
export function calcBillingTrend() {
  const billings = getBillings();
  const monthly = {};
  billings.forEach(b => {
    const key = `${b.bill_year}-${String(b.bill_month).padStart(2,'0')}`;
    monthly[key] = (monthly[key] || 0) + (b.total_amount || 0);
  });
  return Object.entries(monthly).sort().slice(-12);
}

// Phase 4: 레거시 차트 렌더 함수 호출 헬퍼
const _callLegacy = (name) => {
  const fn = window[name];
  if (typeof fn === 'function') fn();
};

/** 대시보드 차트 새로고침 */
export function refreshCharts() {
  _callLegacy('renderCompanyTrendChart');
  _callLegacy('renderEmployeeTrendChart');
  _callLegacy('renderBillingTrendChart');
}
