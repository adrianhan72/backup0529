/**
 * modules/main.mjs — ES Modules 진입점 (Phase 3-C)
 * 
 * 기존 전역 스크립트와 병행 실행됩니다.
 */
import './constants.mjs';
import './dashboard.mjs';
import './company.mjs';
import './contract.mjs';
import './payroll.mjs';
import './payroll-input.mjs';
import './standards.mjs';
import './wage-ledger.mjs';
import './badges.mjs';          // Phase 3-3: updateMenuBadges ESM 오버라이드
import './severance.mjs';
import './loader.mjs';
import './helpers.mjs';
import './router.mjs';
import './dashboard/core.mjs';
import './dashboard/charts.mjs';
import './company/core.mjs';
import './contract/core.mjs';
import './payroll/core.mjs';
import './payroll-bulk.mjs';     // Phase 3-3: payroll-bulk.js 완전 변환
import './payroll/payroll-core.mjs';  // Phase 5: payroll-core.js 완전 변환
import './contract/contract-dispatch.mjs';  // Phase 5: contract-dispatch.js 완전 변환
import './billing/core.mjs';
import './payroll-input/core.mjs';
import './wage-ledger/core.mjs';
import './severance/core.mjs';

console.log('[ESM] ✅ 모듈 시스템 준비 완료');
