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

// Seed all system setting keys
const SEEDS = [
  { id: 'set_probation',   key: 'probation_feature_enabled',          desc: '수습근로자 관리 기능 ON/OFF' },
  { id: 'set_ce_notice',   key: 'contract_expiry_notice_enabled',     desc: '계약만료 통지 발송 ON/OFF' },
  { id: 'set_rc_notice',   key: 'regular_conversion_notice_enabled',  desc: '정규직 전환 고지 발송 ON/OFF' },
  { id: 'set_billing',     key: 'billing_feature_enabled',            desc: '고객사 사용료 수납관리 ON/OFF' },
  { id: 'set_retirement',  key: 'retirement_mgmt_enabled',           desc: '퇴직 관리 기능 ON/OFF' },
];

SEEDS.forEach(s => {
  const existing = db.get('SELECT id FROM system_settings WHERE setting_key = ?', [s.key]);
  if (!existing) {
    db.run(
      'INSERT INTO system_settings (id, setting_key, setting_value, description, updated_at) VALUES (?, ?, ?, ?, ?)',
      [s.id, s.key, '0', s.desc, Date.now()]
    );
    console.log('[OK] Seeded:', s.key, '= 0');
  } else {
    console.log('[SKIP] Already exists:', s.key, '=', existing.id);
  }
});

console.log('[DONE] system_settings ready');
