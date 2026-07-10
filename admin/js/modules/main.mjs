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
import './admin-loader.mjs';                         // Phase 8-D: admin-loader.js 완전 변환 (5함수)
import './helpers.mjs';
import './router.mjs';
import './dashboard/core.mjs';
import './dashboard/charts.mjs';
import './dashboard/core-full.mjs';                 // Phase 8-D: dashboard-core.js 완전 변환 (30함수)
import './dashboard/charts-full.mjs';               // Phase 8-D: dashboard-charts.js 완전 변환 (10함수)
import './company/core.mjs';
import './contract/core.mjs';
import './payroll/core.mjs';
import './payroll-bulk.mjs';     // Phase 3-3: payroll-bulk.js 완전 변환
import './payroll/payroll-core.mjs';  // Phase 5: payroll-core.js 완전 변환
import './contract/contract-dispatch.mjs';  // Phase 5: contract-dispatch.js 완전 변환
import './contract/contract-lifecycle.mjs';       // Phase 5: contract-lifecycle.js (43함수, 생애주기)
import './contract/contract-lifecycle-print.mjs';  // Phase 9: 인쇄 분할 (3함수)
import './contract/contract-lifecycle-notices.mjs'; // Phase 10: 알림 본문 헬퍼
import './contract/contract-docs.mjs';             // Phase 5: contract-docs.js 완전 변환 (39함수)
import './contract/contract-core.mjs';      // Phase 6: contract-core.js 완전 변환 (36함수)
import './wage-ledger/wage-ledger.mjs';      // Phase 6: wage-ledger.js 완전 변환 (20함수)
import './billing/billing-core.mjs';         // Phase 6: billing-core.js 완전 변환 (14함수)
import './contract/contract-form.mjs';       // Phase 7: contract-form.js 완전 변환 (61함수)
import './billing/payslip-send.mjs';         // Phase 7: payslip-send.js 완전 변환 (36함수)
import './company/company-core.mjs';         // Phase 7: company-core.js 완전 변환 (56함수)
import './billing/core.mjs';
import './payroll-input/state.mjs';                 // Phase 8-E: 공유 상태 (live binding)
import './payroll-input/core.mjs';                  // Phase 8-E: core+excel (17함수, 123KB)
import './payroll-input/save.mjs';                  // Phase 8-E: save (13함수, 57KB)
import './payroll-input/main.mjs';                  // Phase 8-E: main (62함수, 139KB)
import './company/company-history.mjs';              // Phase 8-B: company-history (35함수)
import './billing/auth.mjs';                         // Phase 8-B: auth (7함수)
import './billing/annual-leave.mjs';                 // Phase 8-B: annual-leave (29함수)
import './billing/regular-conversion.mjs';           // Phase 8-B: regular-conversion (13함수)
import './billing/company-notice.mjs';               // Phase 8-B: company-notice (20함수)
import './billing/admin-accounts.mjs';               // Phase 8-C: admin-accounts (15함수)
import './billing/two-year-exceed.mjs';              // Phase 8-C: two-year-exceed (5함수)
import './billing/company-notice-log.mjs';           // Phase 8-C: company-notice-log (12함수)
import './billing/general-notice.mjs';               // Phase 8-C: general-notice (18함수)
import './labor.mjs';                                // Phase 8-C: labor (9함수)
import './standards-full.mjs';                       // Phase 8-C: standards (14함수)
import './wage-ledger/severance-full.mjs';           // Phase 8-C: severance (13함수)
import './wage-ledger/core.mjs';
import './severance/core.mjs';

console.log('[ESM] ✅ 모듈 시스템 준비 완료');
