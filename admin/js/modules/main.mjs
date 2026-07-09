/**
 * modules/main.mjs — ES Modules 진입점 (Phase 1)
 * 
 * 기존 전역 스크립트와 병행 실행됩니다.
 * 향후 Phase 2+에서 점진적으로 모듈을 추가합니다.
 */
import './constants.mjs';
import { loadTable, createRow, updateRow, patchRow, deleteRow } from './api.mjs';
import { isCompanyActive, hasActiveContract, todayStr, fmt, s, formatCurrency } from './utils.mjs';
import {
  getCompanies, getEmployees, getContracts, getPayrolls, getBillings,
  loadCoreData, loadHeavyDataModules,
  loadCompanies, loadEmployees, loadContracts, loadPayrolls, loadBillings,
  isDataReady, isHeavyDataReady,
} from './state.mjs';

console.log('[ESM] ✅ 모듈 시스템 준비 완료');
console.log('[ESM]   constants.mjs  — 상수·헬퍼 (44 exports)');
console.log('[ESM]   api.mjs        — REST 통신 (5 exports)');
console.log('[ESM]   utils.mjs      — 공통 유틸 (7 exports)');
console.log('[ESM]   state.mjs      — 상태 관리 (21 exports)');
