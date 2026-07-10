// schema.sql 덤프 유틸리티: node dump_schema.js
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('./data/app.db');

const tables = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();

let schema = '-- SQLite Schema\n';
schema += `-- Updated: ${new Date().toISOString().slice(0,10)}\n\n`;
schema += 'PRAGMA journal_mode = WAL;\n\n';

for (const t of tables) {
  schema += t.sql.replace(/CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS ') + ';\n';
  const indexes = db.prepare(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`).all(t.name);
  for (const idx of indexes) {
    schema += idx.sql + ';\n';
  }
  schema += '\n';
}

fs.writeFileSync('./data/schema.sql', schema);
console.log(`schema.sql updated (${tables.length} tables)`);
db.close();
