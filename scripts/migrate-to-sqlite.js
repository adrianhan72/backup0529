/**
 * migrate-to-sqlite.js
 * db.json → SQLite 마이그레이션 스크립트 (1회 실행)
 * 실행: node scripts/migrate-to-sqlite.js
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_FILE   = path.join(__dirname, '..', 'data', 'app.db');
const JSON_FILE = path.join(__dirname, '..', 'data', 'db.json');
const SCHEMA    = path.join(__dirname, '..', 'data', 'schema.sql');

console.log('📂 db.json 로드 중...');
const old = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

console.log('🔨 SQLite DB 생성 + 스키마 적용...');
if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');
const schema = fs.readFileSync(SCHEMA, 'utf8');
db.exec(schema);

// 테이블 목록 (스키마에 정의된 순서대로)
const TABLES = [
  'companies', 'employees', 'contracts', 'payrolls',
  'billing', 'payroll_send_logs', 'contract_dispatch',
  'contract_expiry_notice', 'company_notices', 'admin_accounts',
  'insurance_rates', 'minimum_wages', 'annual_leave_promotions',
  'annual_leave_ledger', 'company_history',
];

// GS 메타데이터 필드 (제외)
const EXCLUDE = new Set([
  'gs_project_id','gs_table_name','_rid','_self','_etag','_attachments','_ts',
]);

// SQLite 바인딩 가능 타입으로 변환
function toBindable(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'number') return v;
  return String(v);
}

function migrateTable(name) {
  const records = old[name] || [];
  if (records.length === 0) {
    console.log(`  ${name}: 0건 (스킵)`);
    return;
  }

  // 첫 레코드에서 컬럼 추출
  const first = records[0];
  const columns = Object.keys(first).filter(c => !EXCLUDE.has(c));
  const placeholders = columns.map(() => '?').join(', ');
  const colNames = columns.join(', ');

  const stmt = db.prepare(`INSERT INTO ${name} (${colNames}) VALUES (${placeholders})`);

  const tx = db.transaction((rows) => {
    for (const row of rows) {
      const values = columns.map(c => toBindable(row[c]));
      stmt.run(...values);
    }
  });

  tx(records);
  console.log(`  ${name}: ${records.length}건 완료`);
}

// ── 실행 ──
console.log('📦 데이터 이관 중...');
for (const table of TABLES) {
  migrateTable(table);
}

// ── 검증 ──
console.log('\n✅ 검증:');
for (const table of TABLES) {
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get().cnt;
  console.log(`  ${table}: ${count} rows`);
}

db.close();
console.log(`\n🎉 완료! → ${DB_FILE}`);
console.log('   server.js를 SQLite 버전으로 교체하세요.');
