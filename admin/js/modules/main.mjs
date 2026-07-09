/**
 * modules/main.mjs — ES Modules 진입점 (Phase 3-A)
 * 
 * 기존 전역 스크립트와 병행 실행됩니다.
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
import { PAGE_REGISTRY, isExternalPage, getPageNames } from './loader.mjs';
import { show, hide, $, toDateStr, fmtShortTime, formatPhone } from './helpers.mjs';
import { navigateTo, getCurrentPage, onPageChange, getPageTitle } from './router.mjs';
import { renderExpiryBanner, refreshDashboard } from './dashboard/core.mjs';
import { calcPayrollTrend, refreshCharts } from './dashboard/charts.mjs';
import { filterActiveCompanies, getCompanyStats } from './company/core.mjs';
import { getActiveContracts, getExpiringContracts, getContractTypeSummary } from './contract/core.mjs';

console.log('[ESM] ✅ 모듈 시스템 준비 완료 (Phase 3-C)');
console.log('[ESM]   19 modules loaded');
