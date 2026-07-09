/**
 * state.mjs — 캡슐화된 상태 관리 모듈
 * 
 * 기존 전역 변수(allCompanies, allEmployees 등)를 모듈 스코프로 캡슐화.
 * getter/setter/loader 함수만 export하여 외부에서 안전하게 접근.
 */

import { loadTable } from './api.mjs';

// ═══════════════════════════════════════════
// 내부 상태 (모듈 스코프 — 외부 접근 불가)
// ═══════════════════════════════════════════

let _companies = [];
let _employees = [];
let _contracts = [];
let _payrolls = [];
let _billings = [];
let _executives = [];
let _relatedParties = [];
let _leaveLedgers = [];
let _wlNotifications = [];
let _dataReady = false;
let _heavyDataReady = false;

// ═══════════════════════════════════════════
// 읽기 전용 Getters
// ═══════════════════════════════════════════

export function getCompanies()  { return [..._companies]; }
export function getEmployees()  { return [..._employees]; }
export function getContracts()  { return [..._contracts]; }
export function getPayrolls()   { return [..._payrolls]; }
export function getBillings()   { return [..._billings]; }
export function getExecutives() { return [..._executives]; }
export function getRelatedParties() { return [..._relatedParties]; }
export function getLeaveLedgers()   { return [..._leaveLedgers]; }
export function getWLNotifications(){ return [..._wlNotifications]; }
export function isDataReady()       { return _dataReady; }
export function isHeavyDataReady()  { return _heavyDataReady; }

// ═══════════════════════════════════════════
// 데이터 로더
// ═══════════════════════════════════════════

export async function loadCompanies() {
  const d = await loadTable('companies', 100);
  _companies = d.data || [];
  return _companies;
}

export async function loadEmployees() {
  const d = await loadTable('employees', 200);
  _employees = d.data || [];
  return _employees;
}

export async function loadContracts() {
  const d = await loadTable('contracts', 500);
  _contracts = d.data || [];
  return _contracts;
}

export async function loadPayrolls(page = 1) {
  const d = await loadTable('payrolls', 500, page);
  _payrolls = d.data || [];
  return _payrolls;
}

export async function loadBillings() {
  const d = await loadTable('billing', 100);
  _billings = d.data || [];
  return _billings;
}

export async function loadExecutives() {
  const d = await loadTable('registered_executives', 200);
  _executives = d.data || [];
  return _executives;
}

export async function loadRelatedParties() {
  const d = await loadTable('related_party_workers', 200);
  _relatedParties = d.data || [];
  return _relatedParties;
}

export async function loadLeaveLedgers() {
  const d = await loadTable('annual_leave_ledger', 200);
  _leaveLedgers = d.data || [];
  return _leaveLedgers;
}

/**
 * 핵심 데이터 로드 (대시보드·고객사·계약 표시에 필요한 최소 데이터)
 */
export async function loadCoreData() {
  const t0 = performance.now();
  await Promise.all([loadCompanies(), loadEmployees(), loadContracts()]);
  _dataReady = true;
  const ms = Math.round(performance.now() - t0);
  console.log(`[ESM] 핵심 데이터 로드 완료 (${ms}ms): {고객사: ${_companies.length}, 직원: ${_employees.length}, 계약: ${_contracts.length}}`);
  return { companies: _companies, employees: _employees, contracts: _contracts };
}

/**
 * Heavy 데이터 로드 (급여·청구·발송이력 등)
 */
export async function loadHeavyDataModules() {
  const t0 = performance.now();
  await Promise.all([loadPayrolls(), loadBillings(), loadExecutives(), loadRelatedParties(), loadLeaveLedgers()]);
  _heavyDataReady = true;
  const ms = Math.round(performance.now() - t0);
  console.log(`[ESM] Heavy 데이터 로드 완료 (${ms}ms): {급여: ${_payrolls.length}, 청구: ${_billings.length}}`);
  return { payrolls: _payrolls, billings: _billings };
}

// ═══════════════════════════════════════════
// window 브릿지 (기존 글로벌 코드와 호환)
// ═══════════════════════════════════════════

if (typeof window !== 'undefined') {
  // 기존 코드가 allCompanies 등을 참조할 수 있도록 동기화
  Object.defineProperty(window, '_esmState', {
    value: { getCompanies, getEmployees, getContracts, getPayrolls, getBillings, loadCoreData, loadHeavyDataModules },
    writable: false,
    configurable: true,
  });
}
