/**
 * modules/main.mjs — ES Modules 진입점 (Phase 2)
 * 
 * 기존 전역 스크립트와 병행 실행됩니다.
 * Phase 2: 대시보드 + 고객사 + 계약 + 급여 + 급여입력 + 제기준 + 임금대장 + 퇴직급여
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
import { enhanceDashboard, printDashboardSummary } from './dashboard.mjs';
import { addCompanyStatsPanel, enhanceCompanySearch } from './company.mjs';
import { addContractStatsPanel, addContractTypeSummary } from './contract.mjs';
import { addPayrollStatsPanel } from './payroll.mjs';
import { addPayrollInputStatsPanel } from './payroll-input.mjs';
import { addStandardsStatsPanel } from './standards.mjs';
import { addWageLedgerStatsPanel } from './wage-ledger.mjs';
import { addSeveranceStatsPanel } from './severance.mjs';

console.log('[ESM] ✅ 모듈 시스템 준비 완료 (Phase 2)');
console.log('[ESM]   constants.mjs      — 상수·헬퍼');
console.log('[ESM]   api.mjs            — REST 통신');
console.log('[ESM]   utils.mjs          — 공통 유틸');
console.log('[ESM]   state.mjs          — 상태 관리');
console.log('[ESM]   dashboard.mjs      — 대시보드');
console.log('[ESM]   company.mjs        — 고객사 관리');
console.log('[ESM]   contract.mjs       — 계약 관리');
console.log('[ESM]   payroll.mjs        — 급여 관리');
console.log('[ESM]   payroll-input.mjs  — 급여 입력');
console.log('[ESM]   standards.mjs      — 제 기준');
console.log('[ESM]   wage-ledger.mjs    — 임금대장');
console.log('[ESM]   severance.mjs      — 퇴직급여');
