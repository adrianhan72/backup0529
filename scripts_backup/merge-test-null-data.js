/**
 * test-null-required-fields.json 의 테스트 데이터를 db.json에 병합하는 스크립트
 * 사용법: node scripts/merge-test-null-data.js
 */
const fs = require('fs');
const path = require('path');

const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const TEST_PATH = path.join(__dirname, '..', 'data', 'generated', 'test-null-required-fields.json');

console.log('DB 경로:', DB_PATH);
console.log('테스트 데이터 경로:', TEST_PATH);

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const testData = JSON.parse(fs.readFileSync(TEST_PATH, 'utf8'));

let addedEmployees = 0;
let addedContracts = 0;
let skippedEmployees = 0;
let skippedContracts = 0;

// employees 병합
if (testData.employees && testData.employees.length > 0) {
  const existingIds = new Set((db.employees || []).map(e => e.id));
  for (const emp of testData.employees) {
    if (existingIds.has(emp.id)) {
      console.log(`  ⏭ 직원 건너뜀 (이미 존재): ${emp.id} (${emp.name || '이름없음'})`);
      skippedEmployees++;
      continue;
    }
    db.employees.push(emp);
    existingIds.add(emp.id);
    console.log(`  ✓ 직원 추가: ${emp.id} (${emp.name || '이름없음'}) — ${emp.note || ''}`);
    addedEmployees++;
  }
}

// contracts 병합
if (testData.contracts && testData.contracts.length > 0) {
  const existingCtIds = new Set((db.contracts || []).map(c => c.id));
  for (const ct of testData.contracts) {
    if (existingCtIds.has(ct.id)) {
      console.log(`  ⏭ 계약 건너뜀 (이미 존재): ${ct.id}`);
      skippedContracts++;
      continue;
    }
    db.contracts.push(ct);
    existingCtIds.add(ct.id);
    console.log(`  ✓ 계약 추가: ${ct.id} (직원: ${ct.employee_id}) — ${ct.note || ''}`);
    addedContracts++;
  }
}

// 저장
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log('\n=== 병합 완료 ===');
console.log(`직원: ${addedEmployees}건 추가, ${skippedEmployees}건 건너뜀`);
console.log(`계약: ${addedContracts}건 추가, ${skippedContracts}건 건너뜀`);
console.log(`파일 크기: ${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(2)} MB`);
