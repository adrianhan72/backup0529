// scripts/convert-core.cjs — 범용 .js → .mjs 변환 (계약/임금/청구 core 파일)
const fs = require('fs');

const [srcPath, destPath, modName, desc] = process.argv.slice(2);
if (!srcPath || !destPath) {
  console.error('Usage: node convert-core.cjs <src.js> <dest.mjs> [module-name] [description]');
  process.exit(1);
}

const src = fs.readFileSync(srcPath, 'utf-8');

const header = `/**
 * ${destPath.replace('admin/js/modules/', '')} — Phase 6: ${desc || modName || '완전 변환'}
 * Node.js 자동변환 (convert-core.cjs)
 */
import { getCompanies, getEmployees, getPayrolls, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS, COMPANY_STATUS, EMP_STATUS, CONTRACT_TYPE_LEGACY_MAP, DISPATCH_METHOD, DISPATCH_STATUS } from '../constants.mjs';

const _w = (name) => window[name];

`;

let out = src;

// 1. export 추가
out = out.replace(/^(async )?function /gm, 'export $&');

// 2. 전역 함수 → _w() 래핑 (함수 선언 제외)
const globals = [
  'normalizeContractType', 'contractTypeLabel', 'getCompanyRepName', 'getCompanyRepGreeting',
  'empCatBadge', 'won2', 'getEmpName', 'toast', 'openModal', 'closeModal',
  '_getAdminUsername', '_resolveAdminName', '_sendCompanyNotice', '_updateDashUnsentContractBanner',
  '_fileToBase64', 'openContractPrintModal', 'generateContractHTMLFromData',
  '_getContractPrintCSS', '_resetStatusBanner', 'viewContract', 'api',
  'loadContracts', 'loadEmployees', 'renderContracts', 'renderDashboard',
  'loadContractDispatchList', 'renderContractDispatchPage',
  'getScheduleJSON', 'getAmountVal', 'buildScheduleTableHTML',
  'updateMenuBadges', '_updateWLMenuBadge', 'renderPayrolls',
  'loadPayrolls', 'loadBillings', 'loadAllSendLogs', 'loadWLNotifications',
  'cenLoadHistory', 'loadSeveranceNotices', 'loadLeaveLedgers',
  'saveContract', 'renderBillingStats',
];

globals.forEach(fn => {
  const re = new RegExp(`(?<!\\bfunction\\s)(?<!\\bexport\\s)(?<![\\w.])${fn}\\(`, 'g');
  out = out.replace(re, `_w('${fn}')(`);
});

// 3. 데이터 배열 → state.mjs getter 치환
out = out.replace(/(?<!\.)allContracts(?!\s*[=:])/g, 'getContracts()');
out = out.replace(/(?<!\.)allEmployees(?!\s*[=:])/g, 'getEmployees()');
out = out.replace(/(?<!\.)allCompanies(?!\s*[=:])/g, 'getCompanies()');
out = out.replace(/(?<!\.)allPayrolls(?!\s*[=:])/g, 'getPayrolls()');
out = out.replace(/(?<!\.)allBillings(?!\s*[=:])/g, 'getPayrolls()');

// 3b. 전역 상태 변수 → window.xxx 치환 (ESM strict mode 대응)
const stateVars = [
  'currentGlobalCompanyId', 'currentGlobalCompanyName',
  'currentContCompanyId', 'currentPayCompanyId', 'currentLsCompanyId',
  'allExecutives', 'allRelatedParties', 'allLeaveLedgers', 'allWLNotifications',
  'allAdminAccounts', 'allCompanyHistories', '_allSendLogs',
  'editId', 'pages', '_dataReady', '_heavyDataReady',
  '_allInsuranceRates', 'ITEMS',
];
stateVars.forEach(v => {
  const re = new RegExp(`(?<!window\\.)(?<!var |let |const |\\.)(?<![\\w.])${v}\\b(?!\\s*=)`, 'g');
  out = out.replace(re, `window.${v}`);
});

// 4. 함수명 추출
const funcs = [...out.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]);
console.log(`[${modName || srcPath}] Found ${funcs.length} functions`);

// 5. window 등록 블록
let regBlock = '\n// ══ window 등록 (레거시 호환) ══\n';
funcs.forEach(fn => { regBlock += `window.${fn} = ${fn};\n`; });

const result = header + out + '\n' + regBlock;
fs.writeFileSync(destPath, result, 'utf-8');
console.log(`  → Written ${result.split('\\n').length} lines to ${destPath}`);
