/**
 * modules/contract/core.mjs — 계약 관리 모듈 브릿지 (Phase 3-C)
 */
import { CONTRACT_ACTIVE_STATUSES, CONTRACT_PROBATION_TYPES, contractTypeLabel } from '../constants.mjs';

/** 활성 계약 목록 */
export function getActiveContracts() {
  const contracts = window.allContracts || [];
  return contracts.filter(c => !c.is_draft && CONTRACT_ACTIVE_STATUSES.includes(c.status));
}

/** 수습 계약 목록 */
export function getProbationContracts() {
  const contracts = window.allContracts || [];
  return contracts.filter(c => !c.is_draft && CONTRACT_PROBATION_TYPES.includes(c.contract_type));
}

/** 만료 임박 계약 (N일 이내) */
export function getExpiringContracts(days = 30) {
  const contracts = getActiveContracts();
  const today = new Date(); today.setHours(0,0,0,0);
  const deadline = new Date(today); deadline.setDate(deadline.getDate() + days);
  return contracts.filter(c => {
    if (!c.contract_end_date) return false;
    const end = new Date(c.contract_end_date); end.setHours(0,0,0,0);
    return end >= today && end <= deadline;
  });
}

/** 계약 유형별 집계 */
export function getContractTypeSummary() {
  const contracts = (window.allContracts || []).filter(c => !c.is_draft);
  const summary = {};
  contracts.forEach(c => {
    const label = contractTypeLabel(c.contract_type) || c.contract_type || '기타';
    summary[label] = (summary[label] || 0) + 1;
  });
  return summary;
}

if (typeof window !== 'undefined') {
  window._esmContractCore = { getActiveContracts, getProbationContracts, getExpiringContracts, getContractTypeSummary };
}
