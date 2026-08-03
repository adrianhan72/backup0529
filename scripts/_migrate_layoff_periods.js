// migration: add layoff_periods to companies
const Database = require('better-sqlite3');
const db = new Database('data/app.db');
db.pragma('journal_mode=WAL');
try {
  db.exec("ALTER TABLE companies ADD COLUMN layoff_periods TEXT DEFAULT '[]'");
  console.log('OK: layoff_periods column added');
} catch(e) {
  if (e.message.includes('duplicate')) console.log('SKIP: column already exists');
  else console.error(e.message);
}
db.close();
