/**
 * 근로계약 수당 정합성 전수조사 및 자동 수정 스크립트 v2
 * 
 * 각 근로계약의 계약 시작일(contract_start) 기준으로
 * company_history 테이블에서 effective_date <= contract_start 인
 * 가장 최신 snapshot을 조회하여 당시 allowance_config 기준으로
 * 통상임금 제외 고정수당의 pay_type 정합성을 검증하고,
 * 불일치 시 해당 시점의 allowance_config 기준으로 수정한다.
 * 
 * 이력이 없는 회사는 현재 companies.allowance_config를 사용한다.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

// ── 통상임금 제외 고정수당 항목 (pay_type 가변: fixed/daily/receipt) ──
const NON_ORDINARY_PAY_TYPE_MAP = {
  car:              { dbCol: 'transportation_pay_type' },
  meal:             { dbCol: 'meal_pay_type' },
  research:         { dbCol: 'research_pay_type' },
  communication:    { dbCol: 'communication_pay_type' },
  fitness:          { dbCol: 'fitness_pay_type' },
  self_dev:         { dbCol: 'self_dev_pay_type' },
  book:             { dbCol: 'book_pay_type' },
  overseas:         { dbCol: 'overseas_pay_type' },
  childcare:        { dbCol: 'childcare_pay_type' },
};

// ── 회사별 현재 allowance_config ──
const companies = db.prepare('SELECT id, company_name, allowance_config FROM companies').all();
const coMap = {};
for (const co of companies) {
  let cfg = co.allowance_config;
  if (!cfg) { coMap[co.id] = {}; continue; }
  if (typeof cfg === 'string') {
    try { cfg = JSON.parse(cfg); } catch (e) { cfg = {}; }
  }
  coMap[co.id] = cfg;
}

// ── 회사별 이력 조회 (effective_date 기준 정렬) ──
const allHistory = db.prepare(`
  SELECT company_id, effective_date, changed_at, snapshot 
  FROM company_history 
  ORDER BY company_id, effective_date ASC
`).all();

// 회사별로 이력 그룹화
const historyByCompany = {};
for (const h of allHistory) {
  if (!historyByCompany[h.company_id]) historyByCompany[h.company_id] = [];
  historyByCompany[h.company_id].push(h);
}

// ── 계약 시작일 기준 유효한 allowance_config 조회 ──
function getConfigAtDate(companyId, contractStart) {
  const histories = historyByCompany[companyId];
  
  if (!histories || histories.length === 0) {
    return { cfg: coMap[companyId] || {}, source: 'current (no history)' };
  }
  
  // effective_date <= contract_start 인 것 중 가장 최신 찾기 (ASC 정렬이므로 마지막 매칭)
  let bestHistory = null;
  for (const h of histories) {
    const effDate = h.effective_date || '';
    if (effDate && effDate <= contractStart) {
      bestHistory = h;
    }
  }
  
  if (bestHistory && bestHistory.snapshot) {
    try {
      const snap = typeof bestHistory.snapshot === 'string' 
        ? JSON.parse(bestHistory.snapshot) 
        : bestHistory.snapshot;
      const cfg = snap.allowance_config || {};
      return { 
        cfg: typeof cfg === 'string' ? JSON.parse(cfg) : cfg, 
        source: `history eff_date=${bestHistory.effective_date}` 
      };
    } catch (e) {
      return { cfg: coMap[companyId] || {}, source: 'current (snapshot parse error)' };
    }
  }
  
  // contract_start 이전 이력 없음 → 가장 오래된 이력 사용
  if (histories.length > 0) {
    const oldest = histories[0];
    if (oldest.snapshot) {
      try {
        const snap = typeof oldest.snapshot === 'string' 
          ? JSON.parse(oldest.snapshot) 
          : oldest.snapshot;
        const cfg = snap.allowance_config || {};
        return { 
          cfg: typeof cfg === 'string' ? JSON.parse(cfg) : cfg, 
          source: `oldest history eff_date=${oldest.effective_date || 'NULL'} (contract before any history)` 
        };
      } catch (e) {}
    }
  }
  
  return { cfg: coMap[companyId] || {}, source: 'current (fallback)' };
}

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
    childcare_allowance, childcare_pay_type
  FROM contracts
  ORDER BY company_id, contract_start
`).all();

console.log(`=== 근로계약 수당 pay_type 정합성 전수조사 v2 ===`);
console.log(`회사: ${companies.length} | 이력레코드: ${allHistory.length} | 계약: ${contracts.length}`);
console.log(`기준: company_history.effective_date <= contract_start 인 최신 snapshot\n`);

// ── 정합성 검증 ──
const issues = [];
let totalChecked = 0;
let historyHits = 0;
let currentFallbacks = 0;

for (const con of contracts) {
  if (!con.contract_start) continue;
  totalChecked++;
  
  const { cfg, source } = getConfigAtDate(con.company_id, con.contract_start);
  if (!cfg || Object.keys(cfg).length === 0) continue;
  
  if (source.startsWith('history')) historyHits++;
  else if (source.startsWith('oldest')) historyHits++;
  else currentFallbacks++;
  
  const conIssues = [];
  const updates = {};
  
  for (const [key, { dbCol }] of Object.entries(NON_ORDINARY_PAY_TYPE_MAP)) {
    const cfgEnabled = !!cfg[key];
    const cfgPayType = cfg[key + '_pay_type'] || (cfgEnabled ? 'fixed' : '');
    const dbPayType = con[dbCol] || '';
    
    if (cfgEnabled && cfgPayType === 'fixed') {
      if (dbPayType !== 'fixed') {
        conIssues.push(key + ': DB="' + (dbPayType || '(empty)') + '" -> cfg="fixed"');
        updates[dbCol] = 'fixed';
      }
    } else if (!cfgEnabled) {
      if (dbPayType && dbPayType !== '') {
        conIssues.push(key + ': disabled but pay_type="' + dbPayType + '" -> clear');
        updates[dbCol] = null;
      }
    } else if (cfgEnabled && cfgPayType !== 'fixed') {
      if (dbPayType !== cfgPayType) {
        conIssues.push(key + ': DB="' + (dbPayType || '(empty)') + '" -> cfg="' + cfgPayType + '"');
        updates[dbCol] = cfgPayType;
      }
    }
  }
  
  if (conIssues.length > 0) {
    const coName = (companies.find(c => c.id === con.company_id) || {}).company_name || '?';
    issues.push({
      contractId: con.id,
      company: coName,
      companyId: con.company_id,
      contractStart: con.contract_start,
      source: source,
      issues: conIssues,
      updates
    });
  }
}

// ── 결과 출력 ──
console.log('검증 완료: ' + totalChecked + '건 (이력기반: ' + historyHits + ', 현재설정: ' + currentFallbacks + ')');
console.log('불일치 계약 수: ' + issues.length);

if (issues.length > 0) {
  const byCompany = {};
  for (const iss of issues) {
    if (!byCompany[iss.companyId]) byCompany[iss.companyId] = { name: iss.company, count: 0 };
    byCompany[iss.companyId].count++;
  }
  console.log('\n--- 회사별 불일치 ---');
  for (const [coId, info] of Object.entries(byCompany)) {
    console.log('  ' + info.name + ' (' + coId + '): ' + info.count + '건');
  }
  
  console.log('\n--- 불일치 상세 (최초 30건) ---');
  for (let i = 0; i < Math.min(30, issues.length); i++) {
    const iss = issues[i];
    console.log('\n[' + (i+1) + '] ' + iss.contractId.substring(0,8) + '...');
    console.log('  회사: ' + iss.company + ' | 시작일: ' + iss.contractStart + ' | 기준: ' + iss.source);
    for (const detail of iss.issues) {
      console.log('  X ' + detail);
    }
  }
  if (issues.length > 30) console.log('  ... 외 ' + (issues.length - 30) + '건');
  
  // ── 수정 진행 ──
  console.log('\n=== 수정 진행 (' + issues.length + '건) ===');
  let fixCount = 0;
  for (const iss of issues) {
    const cols = Object.keys(iss.updates);
    if (cols.length === 0) continue;
    const setStr = cols.map(function(c) { return c + ' = ?'; }).join(', ');
    const vals = cols.map(function(c) { return iss.updates[c]; });
    vals.push(iss.contractId);
    db.prepare('UPDATE contracts SET ' + setStr + ' WHERE id = ?').run(...vals);
    fixCount++;
  }
  console.log(fixCount + '건 수정 완료');
} else {
  console.log('모든 계약 정합성 확인 완료');
}

// ── 최종 재검증 ──
console.log('\n=== 수정 후 재검증 ===');
let recheckIssues = 0;
for (const con of contracts) {
  if (!con.contract_start) continue;
  const { cfg } = getConfigAtDate(con.company_id, con.contract_start);
  if (!cfg || Object.keys(cfg).length === 0) continue;
  
  const fresh = db.prepare('SELECT * FROM contracts WHERE id = ?').get(con.id);
  
  for (const [key, { dbCol }] of Object.entries(NON_ORDINARY_PAY_TYPE_MAP)) {
    const cfgEnabled = !!cfg[key];
    const cfgPayType = cfg[key + '_pay_type'] || (cfgEnabled ? 'fixed' : '');
    const dbPayType = fresh[dbCol] || '';
    
    if (cfgEnabled && cfgPayType === 'fixed' && dbPayType !== 'fixed') {
      console.log('  WARN: ' + con.id + ' ' + key + ' DB="' + dbPayType + '" cfg="fixed"');
      recheckIssues++;
    }
  }
}

if (recheckIssues === 0) {
  console.log('모든 계약 정합성 확인 완료');
}

// ── 이력 사용 통계 ──
console.log('\n=== 이력 사용 통계 ===');
const coWithHistory = Object.keys(historyByCompany);
console.log('이력 보유 회사: ' + coWithHistory.length + '개');
for (const coId of coWithHistory) {
  const co = companies.find(function(c) { return c.id === coId; });
  const name = co ? co.company_name : coId;
  const cnt = historyByCompany[coId].length;
  console.log('  ' + name + ': ' + cnt + '개 이력');
}
const coWithoutHistory = companies.filter(function(c) { return !historyByCompany[c.id]; });
if (coWithoutHistory.length > 0) {
  console.log('이력 없는 회사 (현재 config 사용): ' + coWithoutHistory.length + '개');
  for (const co of coWithoutHistory) {
    console.log('  ' + co.company_name + ' (' + co.id + ')');
  }
}

db.close();
console.log('\n=== 전수조사 완료 ===');
