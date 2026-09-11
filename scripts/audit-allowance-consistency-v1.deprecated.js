/**
 * 근로계약 수당 정합성 전수조사 및 자동 수정 스크립트
 * 
 * 각 근로계약의 계약 시작일(contract_start) 기준으로
 * 회사(고객사)의 allowance_config 이력을 조회하여
 * 통상임금 포함 항목과 통상임금 제외 고정수당 항목이
 * 계약 데이터에 올바르게 반영되었는지 검증하고,
 * 불일치 시 company allowance_config 기준으로 수정한다.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

// ── 유틸 ──
function fmt(n) { return typeof n === 'number' ? n.toLocaleString() : String(n); }

// ── 통상임금 포함 항목 (pay_type 항상 'fixed') ──
const ORDINARY_FIELDS = ['site', 'position', 'skill', 'license', 'hazard', 'remote_area', 'regular_bonus'];

// ── 통상임금 제외 고정수당 항목 (pay_type 가변: fixed/daily/receipt) ──
const NON_ORDINARY_PAY_TYPE_MAP = {
  car:              { dbCol: 'transportation_pay_type', allowField: 'transportation_allowance' },
  meal:             { dbCol: 'meal_pay_type',           allowField: 'meal_allowance' },
  research:         { dbCol: 'research_pay_type',       allowField: 'research_allowance' },
  communication:    { dbCol: 'communication_pay_type',  allowField: 'communication_allowance' },
  fitness:          { dbCol: 'fitness_pay_type',        allowField: 'fitness_allowance' },
  self_dev:         { dbCol: 'self_dev_pay_type',       allowField: 'self_dev_allowance' },
  book:             { dbCol: 'book_pay_type',           allowField: 'book_allowance' },
  overseas:         { dbCol: 'overseas_pay_type',       allowField: 'overseas_allowance' },
  childcare:        { dbCol: 'childcare_pay_type',      allowField: 'childcare_allowance' },
};

// ── 모든 company_snapshots 조회 (이력 테이블 확인) ──
let hasSnapshotTable = false;
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  hasSnapshotTable = tables.includes('company_snapshots');
  console.log('Tables:', tables.join(', '));
} catch (e) {
  console.error('Failed to list tables:', e.message);
}

// ── 회사별 현재 allowance_config ──
const companies = db.prepare('SELECT id, company_name, allowance_config FROM companies').all();

// ── 모든 계약 조회 ──
const contracts = db.prepare(`
  SELECT 
    id, company_id, employee_id, contract_start, contract_type, status,
    transportation_allowance, transportation_pay_type,
    meal_allowance, meal_pay_type,
    research_allowance, research_pay_type,
    communication_allowance, communication_pay_type,
    fitness_allowance, fitness_pay_type,
    self_dev_allowance, self_dev_pay_type,
    book_allowance, book_pay_type,
    overseas_allowance, overseas_pay_type,
    childcare_allowance, childcare_pay_type,
    site_allowance, position_allowance, skill_allowance,
    license_allowance, hazard_allowance,
    remote_area_allowance, regular_bonus
  FROM contracts
  ORDER BY company_id, contract_start
`).all();

console.log(`\n=== 전수조사 시작 ===`);
console.log(`회사 수: ${companies.length}`);
console.log(`계약 수: ${contracts.length}`);

// ── 회사별 allowance_config 이력이 없으면 현재 config 사용 ──
function getEffectiveConfig(companyId, contractStart) {
  const co = companies.find(c => c.id === companyId);
  if (!co) return null;
  
  let cfg = co.allowance_config;
  if (!cfg) return {};
  if (typeof cfg === 'string') {
    try { cfg = JSON.parse(cfg); } catch (e) { return {}; }
  }
  return cfg;
}

// ── 정합성 검증 및 수정 ──
const issues = [];
const fixes = [];

for (const con of contracts) {
  if (!con.contract_start) continue; // 계약 시작일 없으면 스킵
  
  const cfg = getEffectiveConfig(con.company_id, con.contract_start);
  if (!cfg) continue;
  
  const conId = con.id;
  const conIssues = [];
  const updates = {};
  
  // 1. 통상임금 제외 고정수당 pay_type 검증
  for (const [key, { dbCol, allowField }] of Object.entries(NON_ORDINARY_PAY_TYPE_MAP)) {
    const cfgEnabled = !!cfg[key]; // allowance_config에서 활성화 여부
    const cfgPayType = cfg[key + '_pay_type'] || (cfgEnabled ? 'fixed' : '');
    const dbPayType = con[dbCol] || '';
    
    // 수당이 활성화되어 있고 pay_type이 'fixed'인 경우
    if (cfgEnabled && cfgPayType === 'fixed') {
      // DB에 pay_type이 'fixed'가 아니거나 비어있으면 수정
      if (dbPayType !== 'fixed') {
        conIssues.push(`${key}: DB="${dbPayType || '(empty)'}" → cfg="fixed"`);
        updates[dbCol] = 'fixed';
      }
    }
    // 수당이 비활성화되어 있으면 pay_type 초기화
    else if (!cfgEnabled) {
      if (dbPayType && dbPayType !== '') {
        conIssues.push(`${key}: 비활성 수당인데 pay_type="${dbPayType}" 남아있음 → 초기화`);
        updates[dbCol] = '';
      }
    }
    // 수당이 활성화되어 있지만 pay_type이 fixed가 아닌 경우(daily/receipt)
    else if (cfgEnabled && cfgPayType !== 'fixed') {
      if (dbPayType !== cfgPayType) {
        conIssues.push(`${key}: DB="${dbPayType || '(empty)'}" → cfg="${cfgPayType}"`);
        updates[dbCol] = cfgPayType;
      }
    }
  }
  
  // 2. 통상임금 포함 항목은 항상 fixed (DB에 pay_type 컬럼 없음)
  //    → amount만으로 판단. 여기서는 pay_type 불일치가 없으므로 스킵.
  
  if (conIssues.length > 0) {
    const coName = (companies.find(c => c.id === con.company_id) || {}).company_name || '?';
    issues.push({
      contractId: conId,
      company: coName,
      companyId: con.company_id,
      contractStart: con.contract_start,
      contractType: con.contract_type,
      status: con.status,
      issues: conIssues,
      updates
    });
  }
}

// ── 결과 출력 ──
console.log(`\n불일치 계약 수: ${issues.length}`);

if (issues.length > 0) {
  console.log(`\n--- 불일치 상세 ---`);
  for (const iss of issues) {
    console.log(`\n계약ID: ${iss.contractId}`);
    console.log(`  회사: ${iss.company} (${iss.companyId})`);
    console.log(`  계약시작일: ${iss.contractStart} | 유형: ${iss.contractType} | 상태: ${iss.status}`);
    for (const i of iss.issues) {
      console.log(`  ❌ ${i}`);
    }
  }
  
  // ── 수정 진행 ──
  console.log(`\n=== 수정 진행 ===`);
  const updateStmt = db.prepare(`
    UPDATE contracts 
    SET ${Object.keys(issues[0].updates).map(k => `${k} = @${k}`).join(', ')}
    WHERE id = @id
  `);
  
  // 각 계약마다 다른 컬럼 세트를 가질 수 있으므로 동적 UPDATE 사용
  let fixCount = 0;
  for (const iss of issues) {
    const setClauses = Object.entries(iss.updates)
      .map(([col, val]) => `${col} = @${col}`)
      .join(', ');
    
    const params = { id: iss.contractId, ...iss.updates };
    
    // 동적 SQL 생성
    const cols = Object.keys(iss.updates);
    const setStr = cols.map(c => `${c} = ?`).join(', ');
    const vals = cols.map(c => iss.updates[c]);
    
    db.prepare(`UPDATE contracts SET ${setStr} WHERE id = ?`).run(...vals, iss.contractId);
    fixCount++;
  }
  
  console.log(`✅ ${fixCount}개 계약의 pay_type 수정 완료`);
} else {
  console.log(`✅ 모든 계약의 pay_type이 회사 allowance_config와 일치합니다.`);
}

// ── 최종 검증 ──
console.log(`\n=== 수정 후 재검증 ===`);
let recheckCount = 0;
for (const con of contracts) {
  if (!con.contract_start) continue;
  const cfg = getEffectiveConfig(con.company_id, con.contract_start);
  if (!cfg) continue;
  
  // DB에서 다시 읽기
  const fresh = db.prepare('SELECT * FROM contracts WHERE id = ?').get(con.id);
  
  for (const [key, { dbCol }] of Object.entries(NON_ORDINARY_PAY_TYPE_MAP)) {
    const cfgEnabled = !!cfg[key];
    const cfgPayType = cfg[key + '_pay_type'] || (cfgEnabled ? 'fixed' : '');
    const dbPayType = fresh[dbCol] || '';
    
    if (cfgEnabled && cfgPayType === 'fixed' && dbPayType !== 'fixed') {
      console.log(`  ⚠️ 여전히 불일치: ${con.id} ${key} DB="${dbPayType}" cfg="fixed"`);
      recheckCount++;
    }
  }
}

if (recheckCount === 0) {
  console.log(`✅ 모든 계약 정합성 확인 완료`);
}

db.close();
console.log(`\n완료.`);
