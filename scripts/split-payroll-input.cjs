// scripts/split-payroll-input.cjs — payroll-input-full.mjs 분할
const fs = require('fs');

const content = fs.readFileSync('admin/js/modules/payroll-input/_full.mjs', 'utf-8');
const lines = content.split('\n');

// Boundaries (line numbers, 0-indexed)
const headerEnd  = 15;   // last header line (blank before JSDoc of first function)
const saveStart  = 2764; // export function _buildPIBody
const mainStart  = 3964; // export function loadPITargetList
const winRegStart = 7095; // window registrations

// Common header: lines 0-20 (imports + _w + variable declarations, BEFORE first function)
const headerLines = lines.slice(0, headerEnd + 1);

// Remove shared variable declarations
const filteredHeader = headerLines
  .map(l => l.replace(/^let piContract=null;\s*$/, ''))
  .map(l => l.replace(/^let piEditPayrollId=null;\s*$/, ''))
  .map(l => l.replace(/^let piDraftId=null;\s*$/, ''))
  .map(l => l.replace(/^let _piEditSnapshot=null;\s*$/, ''))
  .map(l => l.replace(/^let _piContractLoading=false;\s*$/, ''))
  .map(l => l.replace(/^const _piPayTypes = new Map\(\);\s*$/, ''))
  .filter(l => l.trim() !== '');

// Insert state.mjs import after the last existing import (before const _w)
const lastImportIdx = filteredHeader.findIndex(l => l.includes('} from'));
const stateImport = 'import { piContract, piEditPayrollId, piDraftId, _piEditSnapshot, _piContractLoading, _piPayTypes } from "./state.mjs";';
filteredHeader.splice(lastImportIdx + 1, 0, stateImport);
const newHeader = filteredHeader.join('\n');

// Extract section bodies
let coreBody = lines.slice(headerEnd + 1, saveStart).join('\n');
let saveBody = lines.slice(saveStart, mainStart).join('\n');
let mainBody = lines.slice(mainStart, winRegStart).join('\n');

// Remove ALL duplicate shared variable declarations from all body sections
const sharedVarPatterns = [
  /^let piContract\s*=\s*null;.*$/m,
  /^let piEditPayrollId\s*=\s*null;.*$/m,
  /^let piDraftId\s*=\s*null;.*$/m,
  /^let _piEditSnapshot\s*=\s*null;.*$/m,
  /^let _piContractLoading\s*=\s*false;.*$/m,
  /^const _piPayTypes\s*=\s*\{[^}]*\};.*$/m,
  /^const _piPayTypes\s*=\s*new Map\(\);.*$/m,
];
function removeSharedVars(body) {
  let result = body;
  sharedVarPatterns.forEach(p => { result = result.replace(p, ''); });
  // Clean up double blank lines
  result = result.replace(/\n\n\n+/g, '\n\n');
  return result;
}
coreBody = removeSharedVars(coreBody);
saveBody = removeSharedVars(saveBody);
mainBody = removeSharedVars(mainBody);

// Extract window registrations for specific functions
const allRegs = lines.slice(winRegStart).join('\n');
function extractRegs(sectionBody) {
  const funcNames = [...sectionBody.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]);
  const needed = new Set(funcNames);
  const regLines = allRegs.split('\n');
  const filtered = regLines.filter(l => {
    const m = l.match(/^window\.(\w+) = /);
    return m && needed.has(m[1]);
  }).join('\n');
  return filtered;
}

// Write split files
const dir = 'admin/js/modules/payroll-input';
fs.writeFileSync(dir + '/core.mjs',  newHeader + '\n' + coreBody + '\n' + extractRegs(coreBody), 'utf-8');
fs.writeFileSync(dir + '/save.mjs',  newHeader + '\n' + saveBody + '\n' + extractRegs(saveBody), 'utf-8');
fs.writeFileSync(dir + '/main.mjs',  newHeader + '\n' + mainBody + '\n' + extractRegs(mainBody), 'utf-8');

// Report
['core.mjs', 'save.mjs', 'main.mjs'].forEach(f => {
  const c = fs.readFileSync(dir + '/' + f, 'utf-8');
  const funcs = [...c.matchAll(/^export (?:async )?function (\w+)/gm)];
  console.log(f + ': ' + funcs.length + ' functions, ' + (c.length / 1024).toFixed(1) + ' KB');
});

// Verify total
const totalFuncs = ['core.mjs', 'save.mjs', 'main.mjs'].reduce((sum, f) => {
  const c = fs.readFileSync(dir + '/' + f, 'utf-8');
  return sum + [...c.matchAll(/^export (?:async )?function (\w+)/gm)].length;
}, 0);
console.log('Total: ' + totalFuncs + ' functions (expected 92)');
