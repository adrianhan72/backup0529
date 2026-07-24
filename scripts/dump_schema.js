// schema.sql 덤프 유틸리티: node dump_schema.js
// PRAGMA table_info 기반으로 실제 DB 스키마를 정확히 덤프 (ALTER TABLE 반영)
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('./data/app.db');

const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();

let schema = '-- SQLite Schema\n';
schema += `-- Updated: ${new Date().toISOString().slice(0, 10)}\n\n`;
schema += 'PRAGMA journal_mode = WAL;\n\n';

for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  // Check if original sql exists for quoting
  const orig = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(t.name);
  const quoted = orig && orig.sql ? orig.sql.match(/["`[]?\w+["`\]]?/) : null;

  schema += `CREATE TABLE IF NOT EXISTS ${t.name} (\n`;
  cols.forEach((c, i) => {
    let def = `  ${c.name} ${c.type.toUpperCase()}`;
    if (c.pk) def += ' PRIMARY KEY';
    if (c.notnull && !c.pk) def += ' NOT NULL';
    if (c.dflt_value != null) def += ` DEFAULT ${c.dflt_value}`;
    if (i < cols.length - 1) def += ',';
    schema += def + '\n';
  });
  schema += ');\n';

  const indexes = db.prepare(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`).all(t.name);
  for (const idx of indexes) {
    schema += idx.sql.replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS ') + ';\n';
  }
  schema += '\n';
}

fs.writeFileSync('./data/schema.sql', schema);
console.log(`schema.sql updated (${tables.length} tables, ${tables.reduce((s, t) => s + db.prepare('PRAGMA table_info(' + t.name + ')').all().length, 0)} columns)`);
db.close();
