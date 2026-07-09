// scripts/split-lifecycle.cjs — contract-lifecycle.mjs 분할 (인쇄 ↔ 생애주기)
const fs = require('fs');

const src = fs.readFileSync('admin/js/modules/contract/contract-lifecycle-full.mjs', 'utf-8');

// 함수 경계 찾기
const printStart = src.indexOf('export function _getContractPrintCSS');
const lifecycleStart = src.indexOf('export function _resetStatusBanner');

const printPart = src.slice(printStart, lifecycleStart);
const lifecyclePart = src.slice(lifecycleStart);

// === 인쇄 모듈 ===
const printHeader = `/**
 * modules/contract/contract-lifecycle-print.mjs — 근로계약서 인쇄·문서 생성
 * contract-lifecycle.mjs 에서 분할 (Phase 9)
 */
import { getCompanies, getEmployees, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS } from '../constants.mjs';

const _w = (name) => window[name];

`;

// 인쇄 모듈 함수명 추출
const printFuncs = [...printPart.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]);
let printReg = '\n// ══ window 등록 ══\n';
printFuncs.forEach(fn => { printReg += `window.${fn} = ${fn};\n`; });

const printOut = printHeader + printPart + '\n' + printReg;
fs.writeFileSync('admin/js/modules/contract/contract-lifecycle-print.mjs', printOut, 'utf-8');
console.log(`Print module: ${printFuncs.length} functions, ${printOut.split('\\n').length} lines`);

// === 생애주기 모듈 (헤더 + lifecyclePart + 등록) ===
const beforeHeader = src.slice(0, printStart); // imports + _w + blank lines

// 기존 window 등록 블록 제거 (printStart 이후 부분에서)
const oldRegStart = src.lastIndexOf('\n// ══ window 등록');
const cleanLifecycle = lifecyclePart.replace(/\n\/\/ ══ window 등록[^\n]*\n(?:window\.\w+ = \w+;\n?)*/g, '');

const lifecycleFuncs = [...cleanLifecycle.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]);
let lifeReg = '\n// ══ window 등록 ══\n';
lifecycleFuncs.forEach(fn => { lifeReg += `window.${fn} = ${fn};\n`; });

const lifeOut = beforeHeader + '\n' + cleanLifecycle + '\n' + lifeReg;
fs.writeFileSync('admin/js/modules/contract/contract-lifecycle.mjs', lifeOut, 'utf-8');
console.log(`Lifecycle module: ${lifecycleFuncs.length} functions, ${lifeOut.split('\\n').length} lines`);
