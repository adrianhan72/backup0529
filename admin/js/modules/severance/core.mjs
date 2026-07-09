/**
 * modules/severance/core.mjs — 퇴직급여 모듈 (Phase 3)
 */
import { CONTRACT_ACTIVE_STATUSES } from '../constants.mjs';
import { getContracts, getEmployees } from '../state.mjs';

/** 1년 이상 근속자 수 */
export function getLongTermEmployeeCount() {
  const contracts = getContracts();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return contracts.filter(c =>
    CONTRACT_ACTIVE_STATUSES.includes(c.status) &&
    c.contract_start_date && new Date(c.contract_start_date) <= oneYearAgo
  ).length;
}

/** 퇴직급여 통계 */
export function getSeveranceStats() {
  const employees = getEmployees().length;
  const contracts = getContracts();
  const active = contracts.filter(c => CONTRACT_ACTIVE_STATUSES.includes(c.status)).length;
  const longTerm = getLongTermEmployeeCount();
  return { totalEmployees: employees, activeContracts: active, longTermEmployees: longTerm };
}

export function register() {
  return { getLongTermEmployeeCount, getSeveranceStats };
}
