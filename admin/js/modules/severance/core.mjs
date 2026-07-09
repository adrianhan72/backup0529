/**
 * modules/severance/core.mjs — 퇴직급여 모듈 브릿지 (Phase 3-C)
 */
import { CONTRACT_ACTIVE_STATUSES } from '../constants.mjs';

/** 1년 이상 근속자 수 */
export function getLongTermEmployeeCount() {
  const contracts = window.allContracts || [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return contracts.filter(c =>
    CONTRACT_ACTIVE_STATUSES.includes(c.status) &&
    c.contract_start_date && new Date(c.contract_start_date) <= oneYearAgo
  ).length;
}

/** 퇴직급여 통계 */
export function getSeveranceStats() {
  const employees = (window.allEmployees || []).length;
  const contracts = window.allContracts || [];
  const active = contracts.filter(c => CONTRACT_ACTIVE_STATUSES.includes(c.status)).length;
  const longTerm = getLongTermEmployeeCount();
  return { totalEmployees: employees, activeContracts: active, longTermEmployees: longTerm };
}

if (typeof window !== 'undefined') {
  window._esmSeveranceCore = { getLongTermEmployeeCount, getSeveranceStats };
}
