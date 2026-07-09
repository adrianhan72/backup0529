/**
 * state.mjs — 상태 관리 모듈 (Phase 3)
 * 
 * 기존 window.allXxx 전역 변수와 동기화.
 */

import { loadTable } from './api.mjs';

export function getCompanies()  { return window.allCompanies || []; }
export function getEmployees()  { return window.allEmployees || []; }
export function getContracts()  { return window.allContracts || []; }
export function getPayrolls()   { return window.allPayrolls || []; }
export function getBillings()   { return window.allBillings || []; }
export function getExecutives() { return window.allExecutives || []; }
export function getRelatedParties() { return window.allRelatedParties || []; }
export function getLeaveLedgers()   { return window.allLeaveLedgers || []; }
export function getWLNotifications(){ return window.allWLNotifications || []; }
export function isDataReady()       { return !!window._dataReady; }
export function isHeavyDataReady()  { return !!window._heavyDataReady; }

export async function loadCompanies() {
  const d = await loadTable('companies', 100);
  window.allCompanies = d.data || [];
  return window.allCompanies;
}
export async function loadEmployees() {
  const d = await loadTable('employees', 200);
  window.allEmployees = d.data || [];
  return window.allEmployees;
}
export async function loadContracts() {
  const d = await loadTable('contracts', 500);
  window.allContracts = d.data || [];
  return window.allContracts;
}
export async function loadPayrolls(page = 1) {
  const d = await loadTable('payrolls', 500, page);
  window.allPayrolls = d.data || [];
  return window.allPayrolls;
}
export async function loadBillings() {
  const d = await loadTable('billing', 100);
  window.allBillings = d.data || [];
  return window.allBillings;
}
export async function loadExecutives() {
  const d = await loadTable('registered_executives', 200);
  window.allExecutives = d.data || [];
  return window.allExecutives;
}
export async function loadRelatedParties() {
  const d = await loadTable('related_party_workers', 200);
  window.allRelatedParties = d.data || [];
  return window.allRelatedParties;
}
export async function loadCoreData() {
  await Promise.all([loadCompanies(), loadEmployees(), loadContracts()]);
  window._dataReady = true;
}
export async function loadHeavyDataModules() {
  await Promise.all([loadPayrolls(), loadBillings(), loadExecutives(), loadRelatedParties()]);
  window._heavyDataReady = true;
}
