/**
 * modules/company/core.mjs — 고객사 관리 모듈 브릿지 (Phase 3-C)
 */
import { fetchCompanies, createCompany, updateCompany } from '../api.mjs';
import { isCompanyActive } from '../utils.mjs';

/** 고객사 목록 필터링 (ESM) */
export function filterActiveCompanies() {
  const companies = window.allCompanies || [];
  return companies.filter(c => isCompanyActive(c) && !c.is_draft);
}

/** 고객사 검색 */
export function searchCompanies(query) {
  const q = (query || '').toLowerCase();
  const companies = window.allCompanies || [];
  return companies.filter(c => (c.company_name || '').toLowerCase().includes(q));
}

/** 고객사 통계 */
export function getCompanyStats() {
  const all = window.allCompanies || [];
  const employees = window.allEmployees || [];
  const contracts = window.allContracts || [];
  return {
    total: all.length,
    active: all.filter(c => isCompanyActive(c)).length,
    withEmployees: [...new Set(employees.map(e => e.company_id))].length,
    withContracts: [...new Set(contracts.map(c => c.company_id))].length,
  };
}

if (typeof window !== 'undefined') {
  window._esmCompanyCore = { filterActiveCompanies, searchCompanies, getCompanyStats };
}
