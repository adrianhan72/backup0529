/**
 * api.mjs — REST API 통신 모듈
 * 
 * 서버 API 호출을 위한 래퍼 함수.
 * 기존 글로벌 api() 함수를 ES Module 패턴으로 대체합니다.
 */

const BASE = '..';

/**
 * 기본 API 호출
 * @param {string} url - 상대 URL
 * @param {object} options - fetch options
 * @returns {Promise<object>}
 */
async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

/**
 * 테이블 데이터 로드 (GET)
 * @param {string} table - 테이블명
 * @param {number} limit - 최대 행 수
 * @param {number} page - 페이지 번호
 */
export async function loadTable(table, limit = 500, page = 1) {
  return api(`/tables/${table}?limit=${limit}&page=${page}`);
}

/**
 * 행 생성 (POST)
 */
export async function createRow(table, data) {
  return api(`/tables/${table}`, { method: 'POST', body: JSON.stringify(data) });
}

/**
 * 행 전체 수정 (PUT)
 */
export async function updateRow(table, id, data) {
  return api(`/tables/${table}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * 행 부분 수정 (PATCH)
 */
export async function patchRow(table, id, data) {
  return api(`/tables/${table}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/**
 * 행 삭제 (DELETE)
 */
export async function deleteRow(table, id) {
  return api(`/tables/${table}/${id}`, { method: 'DELETE' });
}

// ── Phase A: 도메인별 API ──

/** 고객사 API */
export async function fetchCompanies(params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return api(`/api/companies${qs}`);
}
export async function fetchCompany(id) {
  return api(`/api/companies/${id}`);
}
export async function createCompany(data) {
  return api('/api/companies', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateCompany(id, data) {
  return api(`/api/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function fetchCompanyEmployees(companyId) {
  return api(`/api/companies/${companyId}/employees`);
}
export async function fetchCompanyContracts(companyId) {
  return api(`/api/companies/${companyId}/contracts`);
}

/** 직원 API */
export async function fetchEmployees(params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return api(`/api/employees${qs}`);
}
export async function fetchEmployee(id) {
  return api(`/api/employees/${id}`);
}
export async function createEmployee(data) {
  return api('/api/employees', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateEmployee(id, data) {
  return api(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** 계약 API */
export async function fetchContracts(params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return api(`/api/contracts${qs}`);
}
export async function fetchContract(id) {
  return api(`/api/contracts/${id}`);
}
export async function createContract(data) {
  return api('/api/contracts', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateContract(id, data) {
  return api(`/api/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function renewContract(id, data) {
  return api(`/api/contracts/${id}/renew`, { method: 'POST', body: JSON.stringify(data || {}) });
}
export async function terminateContract(id, data) {
  return api(`/api/contracts/${id}/terminate`, { method: 'POST', body: JSON.stringify(data || {}) });
}

/** 급여 API */
export async function fetchPayrolls(params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return api(`/api/payrolls${qs}`);
}
export async function createPayroll(data) {
  return api('/api/payrolls', { method: 'POST', body: JSON.stringify(data) });
}
export async function updatePayroll(id, data) {
  return api(`/api/payrolls/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// 기존 글로벌 api()와 호환성을 위해 window에도 등록
if (typeof window !== 'undefined') {
  window._esmApi = {
    loadTable, createRow, updateRow, patchRow, deleteRow,
    fetchCompanies, fetchCompany, createCompany, updateCompany,
    fetchEmployees, fetchEmployee, createEmployee, updateEmployee,
    fetchContracts, fetchContract, createContract, updateContract,
    renewContract, terminateContract,
    fetchPayrolls, createPayroll, updatePayroll,
  };
}
