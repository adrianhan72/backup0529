// Step 1: payroll_items 테이블 생성 + 데이터 마이그레이션
// 기존 payrolls 수당 컬럼은 유지 (호환성)

const Database = require('better-sqlite3');
const { v4: uuid } = require('uuid');
const db = new Database('./data/app.db');

// ── 수당 항목 정의: [payrolls_column, item_type, has_pay_type, pay_type_column] ──
const ALLOWANCE_DEFS = [
  ['weekly_holiday_pay',   'weekly_holiday',     false, null],
  ['position_allowance',   'position',           false, null],
  ['skill_allowance',      'skill',              false, null],
  ['license_allowance',    'license',            false, null],
  ['overtime_pay',         'overtime',           false, null],
  ['night_pay',            'night',              false, null],
  ['holiday_pay',          'holiday',            false, null],
  ['transportation_allowance', 'transportation', true,  'transportation_pay_type'],
  ['self_driving_allowance',   'self_driving',   true,  'self_driving_pay_type'],
  ['meal_allowance',           'meal',           true,  'meal_pay_type'],
  ['childcare_allowance',      'childcare',      true,  'childcare_pay_type'],
  ['research_allowance',       'research',       true,  'research_pay_type'],
  ['communication_allowance',  'communication',  true,  'communication_pay_type'],
  ['fitness_allowance',        'fitness',        true,  'fitness_pay_type'],
  ['self_dev_allowance',       'self_dev',       true,  'self_dev_pay_type'],
  ['book_allowance',           'book',           true,  'book_pay_type'],
  ['overseas_allowance',       'overseas',       true,  'overseas_pay_type'],
  ['contract_etc_allowance',   'contract_etc',   false, null],
  ['annual_leave_pay',         'annual_leave',   false, null],
  ['bonus_pay',                'bonus',          false, null],
  ['performance_pay',          'performance',    false, null],
  ['actual_expense_pay',       'actual_expense', false, null],
  ['communication_pay',        'comm_expense',   false, null],
  ['etc_allowance',            'etc',            true,  'etc_allowance_memo'],
  ['site_allowance',           'site',           false, null],
  ['remote_area_allowance',    'remote_area',    false, null],
  ['regular_bonus',            'regular_bonus',  false, null],
  ['hazard_allowance',         'hazard',         false, null],
];

const tx = db.transaction(() => {
  // 1. 테이블 생성
  db.prepare(`
    CREATE TABLE IF NOT EXISTS payroll_items (
      id          TEXT PRIMARY KEY,
      payroll_id  TEXT NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
      item_type   TEXT NOT NULL,
      amount      REAL DEFAULT 0,
      pay_type    TEXT,
      memo        TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  INTEGER,
      updated_at  INTEGER
    )
  `).run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll ON payroll_items(payroll_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_payroll_items_type ON payroll_items(item_type)').run();
  console.log('[1] payroll_items table created');

  // 2. 기존 데이터가 이미 마이그레이션 되었는지 확인
  const existing = db.prepare('SELECT COUNT(*) AS cnt FROM payroll_items').get();
  if (existing.cnt > 0) {
    console.log('[2] Already migrated (' + existing.cnt + ' items exist). Skipping data migration.');
    return;
  }

  // 3. payrolls → payroll_items 마이그레이션
  const payrolls = db.prepare('SELECT * FROM payrolls').all();
  let totalItems = 0;

  for (const p of payrolls) {
    let sortOrder = 0;
    for (const [colName, itemType, hasPayType, payTypeCol] of ALLOWANCE_DEFS) {
      const amount = parseFloat(p[colName]) || 0;
      // amount가 0이면 건너뛰기 (불필요한 row 방지)
      if (amount === 0 && itemType !== 'etc') continue; // etc는 memo만 있어도 저장

      const payType = hasPayType && payTypeCol ? (p[payTypeCol] || null) : null;
      const memo = colName === 'etc_allowance' ? (p['etc_allowance_memo'] || null) : null;

      db.prepare(`
        INSERT INTO payroll_items (id, payroll_id, item_type, amount, pay_type, memo, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuid(), p.id, itemType, amount, payType, memo, sortOrder,
        p.created_at || Date.now(), p.updated_at || Date.now()
      );
      sortOrder++;
      totalItems++;
    }
  }
  console.log(`[2] Migrated ${totalItems} items from ${payrolls.length} payroll records`);
});

tx();
db.close();
console.log('\nDone. Run "node dump_schema.js" to update schema.sql');
