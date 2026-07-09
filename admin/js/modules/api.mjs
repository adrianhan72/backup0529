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

// 기존 글로벌 api()와 호환성을 위해 window에도 등록
if (typeof window !== 'undefined') {
  window._esmApi = { loadTable, createRow, updateRow, patchRow, deleteRow };
}
