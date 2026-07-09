// scripts/convert-contract-docs.cjs — contract-docs.js → .mjs 변환
const fs = require('fs');

const src = fs.readFileSync('admin/js/admin-contract/contract-docs.js', 'utf-8');

const header = `/**
 * modules/contract/contract-docs.mjs — Phase 5: 근로계약서 미리보기·인쇄·파일관리
 * contract-docs.js → 완전 ESM 변환 (Node.js 자동변환)
 */
import { getCompanies, getEmployees, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS, COMPANY_STATUS } from '../constants.mjs';

const _w = (name) => window[name];

`;

let out = src.replace(/^(async )?function /gm, 'export $&');

const globals = [
  'normalizeContractType', 'contractTypeLabel', 'getCompanyRepName', 'getCompanyRepGreeting',
  'empCatBadge', 'won2', 'getEmpName', 'toast', 'openModal', 'closeModal',
  '_getAdminUsername', '_resolveAdminName', '_sendCompanyNotice', '_updateDashUnsentContractBanner',
  '_fileToBase64', 'openContractPrintModal', 'generateContractHTMLFromData',
  '_getContractPrintCSS', '_resetStatusBanner', 'viewContract', 'api',
  'loadContracts', 'loadEmployees', 'renderContracts', 'renderDashboard',
  'loadContractDispatchList', 'renderContractDispatchPage',
];

globals.forEach(fn => {
  // 함수 선언(function fnName)은 제외하고 호출(fnName() 만 치환
  const re = new RegExp(`(?<!\\bfunction\\s)(?<!\\bexport\\s)(?<![\\w.])${fn}\\(`, 'g');
  out = out.replace(re, `_w('${fn}')(`);
});

// 데이터 배열 → state.mjs getter 치환
out = out.replace(/(?<!\.)allContracts(?!\s*[=:])/g, 'getContracts()');
out = out.replace(/(?<!\.)allEmployees(?!\s*[=:])/g, 'getEmployees()');
out = out.replace(/(?<!\.)allCompanies(?!\s*[=:])/g, 'getCompanies()');

const funcs = [...out.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]);
console.log(`Found ${funcs.length} functions`);

let regBlock = '\n// ══ window 등록 (레거시 호환) ══\n';
funcs.forEach(fn => { regBlock += `window.${fn} = ${fn};\n`; });

const result = header + out + '\n' + regBlock;
fs.writeFileSync('admin/js/modules/contract/contract-docs.mjs', result, 'utf-8');
console.log(`Written ${result.split('\n').length} lines to admin/js/modules/contract/contract-docs.mjs`);
