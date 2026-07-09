/**
 * modules/bridge.mjs — window 글로벌 데이터 브릿지 (Phase 4)
 * 
 * 모든 모듈에서 공통으로 사용하는 window 데이터 접근자를 한 곳에 통합.
 * 중복 제거 + 일관된 접근 패턴 제공.
 */

// ── 핵심 데이터 ──
export const getCompanies  = () => window.allCompanies || [];
export const getEmployees  = () => window.allEmployees || [];
export const getContracts  = () => window.allContracts || [];
export const getPayrolls   = () => window.allPayrolls || [];
export const getBillings   = () => window.allBillings || [];

// ── 보조 데이터 ──
export const getExecutives     = () => window.allExecutives || [];
export const getRelatedParties = () => window.allRelatedParties || [];
export const getLeaveLedgers   = () => window.allLeaveLedgers || [];
export const getWLNotifications = () => window.allWLNotifications || [];
export const getCompanyHistories = () => window.allCompanyHistories || [];
export const getSendLogs        = () => window.allSendLogs || [];

// ── 상태 플래그 ──
export const isDataReady      = () => typeof window._dataReady !== 'undefined' && window._dataReady;
export const isHeavyDataReady = () => typeof window._heavyDataReady !== 'undefined' && window._heavyDataReady;

// ── 글로벌 함수 참조 ──
export const callGlobal = (name, ...args) => {
  const fn = window[name];
  if (typeof fn === 'function') return fn(...args);
  return null;
};

export const hasGlobal = (name) => typeof window[name] === 'function';

// ── 자주 사용되는 조합 ──
// (개별 모듈에서 import { isCompanyActive } from './utils.mjs' 와 조합 사용)
