const { DB } = require('../lib/database');
const db = new DB('./data/app.db');

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT DEFAULT '0',
    description TEXT,
    updated_at INTEGER
  )
`);

// Seed probation feature toggle
const existing = db.get('SELECT id FROM system_settings WHERE setting_key = ?', ['probation_feature_enabled']);
if (!existing) {
  db.run(
    'INSERT INTO system_settings (id, setting_key, setting_value, description, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['set_probation', 'probation_feature_enabled', '0', '수습근로자 관리 기능 ON/OFF', Date.now()]
  );
  console.log('[OK] Seeded: probation_feature_enabled = 0');
} else {
  console.log('[SKIP] Already exists:', existing.id);
}

console.log('[DONE] system_settings ready');
