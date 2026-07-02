const Database = require('better-sqlite3');
const db = new Database('data/app.db');

const existing = db.prepare('PRAGMA table_info(contracts)').all().map(c => c.name);

const needed = [
  { name: 'schedule_json', type: 'TEXT' },
  { name: 'daily_wage', type: 'REAL' },
  { name: 'position_allowance', type: 'REAL' },
  { name: 'skill_allowance', type: 'REAL' },
  { name: 'license_allowance', type: 'REAL' },
  { name: 'site_allowance', type: 'REAL' },
  { name: 'self_driving_allowance', type: 'REAL' },
  { name: 'self_driving_pay_type', type: 'TEXT' },
  { name: 'remote_area_allowance', type: 'REAL' },
  { name: 'remote_area_pay_type', type: 'TEXT' },
  { name: 'car_maintenance', type: 'REAL' },
  { name: 'regular_bonus', type: 'REAL' },
  { name: 'childcare_allowance', type: 'REAL' },
  { name: 'childcare_dependents', type: 'INTEGER' },
  { name: 'childcare_pay_type', type: 'TEXT' },
  { name: 'contract_etc_allowance', type: 'REAL' },
  { name: 'etc_allowance', type: 'REAL' },
  { name: 'etc_allowance_memo', type: 'TEXT' },
  { name: 'draft_saved_at', type: 'INTEGER' },
  { name: 'edit_source_id', type: 'TEXT' },
  { name: 'employment_category', type: 'TEXT' },
  { name: 'transport_pay_type', type: 'TEXT' },
  { name: 'transport_type', type: 'TEXT' },
];

let added = [];
needed.forEach(({ name, type }) => {
  if (!existing.includes(name)) {
    try {
      db.prepare(`ALTER TABLE contracts ADD COLUMN ${name} ${type}`).run();
      added.push(name);
    } catch (e) {
      console.log(`FAILED: ${name} - ${e.message}`);
    }
  }
});

console.log(`Added ${added.length} columns: ${added.join(', ')}`);
db.close();
