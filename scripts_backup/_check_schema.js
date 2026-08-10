const db = require('better-sqlite3')('data/app.db', { readonly: true });
const fs = require('fs');

// Get actual DB columns
const dbSchema = {};
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
for (const t of tables) {
  const cols = db.prepare('PRAGMA table_info(' + t.name + ')').all();
  dbSchema[t.name] = cols.map(c => c.name);
}

// Parse schema.sql
const schemaSql = fs.readFileSync('data/schema.sql', 'utf8');
const sqlSchema = {};
const createRegex = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/g;
let match;
while ((match = createRegex.exec(schemaSql)) !== null) {
  const tableName = match[1];
  const body = match[2];
  const cols = [];
  body.split('\n').forEach(line => {
    const m = line.match(/^\s*(\w+)\s/);
    if (m && m[1] !== 'PRIMARY' && m[1] !== 'FOREIGN' && m[1] !== 'UNIQUE' && m[1] !== 'CHECK' && m[1] !== 'CREATE') {
      cols.push(m[1]);
    }
  });
  sqlSchema[tableName] = cols;
}

// Compare
console.log('=== Tables only in DB (not in schema.sql) ===');
for (const t of Object.keys(dbSchema)) {
  if (!sqlSchema[t]) console.log('  + ' + t + ' (missing in schema.sql)');
}
console.log('=== Tables only in schema.sql (not in DB) ===');
for (const t of Object.keys(sqlSchema)) {
  if (!dbSchema[t]) console.log('  - ' + t + ' (not in DB)');
}

console.log('\n=== Column differences ===');
for (const t of Object.keys(dbSchema)) {
  if (!sqlSchema[t]) continue;
  const dbCols = dbSchema[t];
  const sqlCols = sqlSchema[t];
  const missingInSql = dbCols.filter(c => !sqlCols.includes(c));
  const missingInDb = sqlCols.filter(c => !dbCols.includes(c));
  if (missingInSql.length || missingInDb.length) {
    console.log('\n[' + t + ']');
    missingInSql.forEach(c => console.log('  + ' + c + ' (in DB, missing in schema.sql)'));
    missingInDb.forEach(c => console.log('  - ' + c + ' (in schema.sql, missing in DB)'));
  }
}

if (Object.keys(dbSchema).every(t => sqlSchema[t] && dbSchema[t].length === sqlSchema[t].length && dbSchema[t].every(c => sqlSchema[t].includes(c)))) {
  console.log('\n✅ Schema is in sync!');
}
