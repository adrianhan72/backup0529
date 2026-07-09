// scripts/convert-lifecycle.cjs — contract-lifecycle.js → .mjs 변환
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync('admin/js/admin-contract/contract-lifecycle.js', 'utf-8');

// 1. 헤더
const header = `/**
 * modules/contract/contract-lifecycle.mjs — Phase 5: 근로계약서 문서생성·생애주기
 * contract-lifecycle.js → 완전 ESM 변환 (Node.js 자동변환)
 */
import { getCompanies, getEmployees, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS, CONTRACT_TYPE_LEGACY_MAP, EMP_STATUS } from '../constants.mjs';

const _w = (name) => window[name];

`;

// 2. export 추가
let out = src.replace(/^(async )?function /gm, 'export $&');

// 3. 전역 함수 → _w() 래핑
const globals = [
  'normalizeContractType', 'contractTypeLabel', 'getCompanyRepName', 'getCompanyRepGreeting',
  'empCatBadge', 'won2', 'getEmpName', 'toast', 'openModal', 'closeModal',
  '_getAdminUsername', '_resolveAdminName', '_sendCompanyNotice', '_updateDashUnsentContractBanner',
  '_fileToBase64', 'openContractPrintModal', 'renderContractDispatchPage', 'loadContractDispatchList',
  'getScheduleJSON', 'getAmountVal', 'loadContracts', 'loadEmployees', 'renderContracts', 'renderDashboard',
  'viewContract', 'api',
];

globals.forEach(fn => {
  // fn( → _w('fn')(  (but not _w('fn') already, not window.fn, not .fn)
  const re = new RegExp(`(?<![\\w.])${fn}\\(`, 'g');
  out = out.replace(re, `_w('${fn}')(`);
});

// 4. 전역 상수 (CONTRACT_TYPE, CONTRACT_STATUS → 이미 import 됨, 그대로 사용)
//    EMP_STATUS → import 됨
//    CONTRACT_TYPE_LEGACY_MAP → import 됨

// 5. window.xxx 는 그대로 유지

// 6. 함수명 추출
const funcs = [...out.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]);
console.log(`Found ${funcs.length} functions`);

// 7. window 등록 블록
let regBlock = '\n// ══ window 등록 (레거시 호환) ══\n';
funcs.forEach(fn => { regBlock += `window.${fn} = ${fn};\n`; });

// 8. 저장
const result = header + out + '\n' + regBlock;
fs.writeFileSync('admin/js/modules/contract/contract-lifecycle.mjs', result, 'utf-8');
console.log(`Written ${result.split('\n').length} lines to admin/js/modules/contract/contract-lifecycle.mjs`);
