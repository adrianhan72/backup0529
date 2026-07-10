// scripts/convert-payroll-input.cjs — payroll-input .js → .mjs (공유 상태 포함)
const fs = require('fs');

const [srcPath, destPath] = process.argv.slice(2);
if (!srcPath || !destPath) { console.error('Usage: node convert-payroll-input.cjs <src.js> <dest.mjs>'); process.exit(1); }

let out = fs.readFileSync(srcPath, 'utf-8');

// ============================================================
// 1. 공유 변수 → P.xxx 치환 (선언 제외, 레거시 window 제외)
// ============================================================
const sharedVars = ['piContract', 'piEditPayrollId', 'piDraftId', '_piEditSnapshot', '_piContractLoading', '_piTransportType'];
sharedVars.forEach(v => {
  // 선언(let/var v =)은 제외, window.v 도 제외
  const re = new RegExp(`(?<!\\blet |\\bvar |\\bconst |window\\.|\\.)${v}\\b(?!\\s*=)`, 'g');
  out = out.replace(re, `P.${v}`);
});

// _piPayTypes (객체 속성 접근은 그대로, 변수 자체만 P. 없이 접근 가능하게)
out = out.replace(/(?<!\.)(?<!P\.)_piPayTypes\b/g, '_piPayTypes');

// ============================================================
// 2. export 추가
// ============================================================
out = out.replace(/^(async )?function /gm, 'export $&');

// ============================================================
// 3. 전역 함수 → _w() 래핑
// ============================================================
const globals = [
  'normalizeContractType','contractTypeLabel','getCompanyRepName','getCompanyRepGreeting',
  'empCatBadge','won2','getEmpName','toast','openModal','closeModal',
  '_getAdminUsername','_resolveAdminName','_sendCompanyNotice',
  'api','loadContracts','loadEmployees','renderContracts','renderDashboard',
  'loadPayrolls','loadExecutives','loadRelatedParties',
  'getScheduleJSON','getAmountVal','setAmountVal','calcPI','calcPITotalHours',
  'calcPIWorkActual','calcWeeklyHolidayPay','calcAnnualLeaveTable',
  'loadPITargetList','backToPITargetList','loadPIContract',
  'clearPIFields','_applyPIDefaultWorkDays','_applyPIPayDate',
  '_checkAndShowPIDraftBanner','loadPIDraft','_loadPrevMonthMemos',
  'savePI','editPayroll','cancelEditPayroll','restoreEditPayroll',
  'validateAndParseExcel','showUploadReport',
  '_checkPIProbationOverrun','_setPIInputLocked','_switchInsuranceModeUI',
  'applyPIAllowanceConfig','_renderPIIrregularRows','_hideZeroContractPIRows',
  '_setPIContractReadonly','_forceShowNonZeroPIRows','_resetPIPayTypes',
  '_checkPIRestoreBtn','_updatePIBottomBtns','_updatePIDraftBtnForMode',
  'calcPIFixed','calcPIDeductions','_getPIRates','_getPIInsuranceBasis',
  '_checkPIStandardsReady','_showPIStandardsWarn','_getPISmallFirmInfo',
  '_updatePISmallFirmBadge','_onProbSplitInputChange','_calcProbationEndDate',
  'calcMonthWorkDays','_countWorkDays','_getPIFullMonthWorkDays',
  '_updatePIWorkDaysAutoLabel','_calcPIDefaultWorkDays',
  'renderPIAllDraftBanner','updateMenuBadges',
  'setPIPayType','_getPIPayTypeVal','setPITransportType','_piFieldToHtmlId',
  'getCTPayTypeVal','_isFixedAllow','_getCTPayTypeVal','setCTPayType',
  'getCompanySnapshotAt','openContractModal','_renderCpExistingFiles',
  'toggleCtEndDate','setScheduleFromJSON','setScheduleFromLegacy',
  'getEarliestContractStart','calcContractSalary','onProbationBasisChange',
  '_setEditNameCategoryLock','_validateEmpNoUniqueness',
  'loadExecutives','loadRelatedParties',
];
globals.forEach(fn => {
  const re = new RegExp(`(?<!\\bfunction\\s)(?<!\\bexport\\s)(?<![\\w.])${fn}\\(`, 'g');
  out = out.replace(re, `_w('${fn}')(`);
});

// ============================================================
// 4. 데이터 배열 → state.mjs getter
// ============================================================
out = out.replace(/(?<!\.)allContracts(?!\s*[=:])/g, 'getContracts()');
out = out.replace(/(?<!\.)allEmployees(?!\s*[=:])/g, 'getEmployees()');
out = out.replace(/(?<!\.)allCompanies(?!\s*[=:])/g, 'getCompanies()');
out = out.replace(/(?<!\.)allPayrolls(?!\s*[=:])/g, 'getPayrolls()');
out = out.replace(/(?<!\.)allExecutives(?!\s*[=:])/g, 'window.allExecutives');
out = out.replace(/(?<!\.)allRelatedParties(?!\s*[=:])/g, 'window.allRelatedParties');
out = out.replace(/(?<!\.)allLeaveLedgers(?!\s*[=:])/g, 'window.allLeaveLedgers');

// ============================================================
// 5. 전역 상태 변수 → window.xxx
// ============================================================
const stateVars = [
  'currentGlobalCompanyId','currentGlobalCompanyName',
  'currentContCompanyId','currentPayCompanyId','currentLsCompanyId',
  'editId','pages','_allInsuranceRates','_allMinimumWages','_BRAND_SIG',
];
stateVars.forEach(v => {
  const re = new RegExp(`(?<!window\\.)(?<!var |let |const |\\.)(?<![\\w.])${v}\\b(?!\\s*=)`, 'g');
  out = out.replace(re, `window.${v}`);
});

// ============================================================
// 6. 헤더 + 임포트 추가
// ============================================================
const stateImport = `import { P, _piPayTypes, _PI_SNAP_FIELDS, _PI_ID_TO_PT_FIELD, syncWindow } from './payroll-input-state.mjs';`;
const imports = `import { getCompanies, getEmployees, getPayrolls, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS, COMPANY_STATUS, EMP_STATUS, CONTRACT_TYPE_LEGACY_MAP, DISPATCH_METHOD, DISPATCH_STATUS } from '../constants.mjs';
${stateImport}

const _w = (name) => window[name];
syncWindow(); // window.piContract 등 동기화

`;

// ============================================================
// 7. 기존 let/var 선언 제거 (공유 변수들)
// ============================================================
sharedVars.forEach(v => {
  out = out.replace(new RegExp(`^(let|var) ${v}\\s*=.*$\\n`, 'gm'), '');
  out = out.replace(new RegExp(`^window\\.${v}\\s*=.*$\\n`, 'gm'), '');
});
// piDraftId 선언 제거
out = out.replace(/^let piDraftId = null;.*\n/gm, '');
// _currentDraftId 선언 제거
out = out.replace(/^let _currentDraftId = null;.*\n/gm, '');
// _piEditSnapshot 선언 제거
out = out.replace(/^let _piEditSnapshot = null;.*\n/gm, '');

// ============================================================
// 8. 함수명 추출 + window 등록
// ============================================================
const funcs = [...out.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]);
let regBlock = '\n// ══ window 등록 ══\n';
funcs.forEach(fn => { regBlock += `window.${fn} = ${fn};\n`; });

const result = imports + out + '\n' + regBlock;
fs.writeFileSync(destPath, result, 'utf-8');
console.log(`[${srcPath}] ${funcs.length} funcs → ${result.split('\\n').length} lines`);
