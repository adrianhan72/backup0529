/**
 * routes/tables.js — REST API (Generic CRUD for all tables)
 */
const { authMiddleware } = require('../middleware/auth');

/** 테이블 별칭 (프론트엔드 호환) */
const TABLE_ALIAS = {
  billings: 'billing',
  contract_expiry_notices: 'contract_expiry_notice',
  company_histories: 'company_history',
};
const VALID_TABLES = new Set([
  'companies','employees','contracts','payrolls','billing',
  'payroll_send_logs','contract_dispatch','consent_dispatch','contract_expiry_notice',
  'company_notices','admin_accounts','insurance_rates','minimum_wages',
  'annual_leave_promotions','annual_leave_ledger','company_history',
  'wage_ledger_notifications',
  'registered_executives','related_party_workers','tax_brackets','tax_bracket_rows',
  'representative_contact','payroll_items',
  'attendance_ledger','kakao_send_logs','system_settings',
  'employee_number_ledger',
]);

function resolveTable(name, db) {
  const t = TABLE_ALIAS[name] || name;
  if (!VALID_TABLES.has(t)) return null;
  return db.table(t);
}

module.exports = function(db) {
  const { Router } = require('express');
  const router = Router();

  router.use(authMiddleware);

  // ── 급여 저장 전 서버 측 산정기준 검증 미들웨어 ──
  function validateStandardsBeforePayrollSave(req, res, next) {
    const table = resolveTable(req.params.t, db);
    if (!table || table.tableName !== 'payrolls') return next();
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') return next();

    const INSURANCE_TYPES = ['national_pension', 'health', 'long_term_care', 'employment'];
    const TYPE_LABELS = { national_pension:'국민연금', health:'건강보험', long_term_care:'장기요양보험', employment:'고용보험' };

    // ① 4대보험 요율 데이터 존재 확인
    const missingRates = INSURANCE_TYPES.filter(type => {
      const cnt = db.insurance_rates.connection.raw.prepare(
        'SELECT COUNT(*) AS cnt FROM insurance_rates WHERE insurance_type = ?'
      ).get(type).cnt;
      return cnt === 0;
    });

    if (missingRates.length > 0) {
      const labels = missingRates.map(t => TYPE_LABELS[t]).join(', ');
      return res.status(400).json({
        error: `산정기준 누락: ${labels} 요율 데이터가 없습니다. 년도별 산정기준에서 먼저 등록해 주세요.`,
        code: 'MISSING_INSURANCE_RATES',
        missingTypes: missingRates
      });
    }

    // ② 보험요율 적용기간 초과 여부 확인 (경고만)
    const payYear  = req.body.pay_year  || (req.body.pay_date ? parseInt(req.body.pay_date.slice(0,4)) : null);
    const payMonth = req.body.pay_month || (req.body.pay_date ? parseInt(req.body.pay_date.slice(5,7)) : null);

    if (payYear && payMonth) {
      const payDate = `${payYear}-${String(payMonth).padStart(2,'0')}-01`;
      const hasCurrentRates = INSURANCE_TYPES.every(type => {
        return db.insurance_rates.connection.raw.prepare(
          'SELECT COUNT(*) AS cnt FROM insurance_rates WHERE insurance_type = ? AND ? >= period_start AND ? <= period_end'
        ).get(type, payDate, payDate).cnt > 0;
      });

      if (!hasCurrentRates) {
        // 적용기간 내 요율은 없지만 최신 요율로 폴백 가능 → 경고만 헤더에 추가
        res.set('X-Standards-Warning', 'outdated-rates');
      }
    }

    // ③ 최저임금 데이터 존재 확인 (경고만)
    const mwCnt = db.minimum_wages.connection.raw.prepare(
      'SELECT COUNT(*) AS cnt FROM minimum_wages'
    ).get().cnt;
    if (mwCnt === 0) {
      res.set('X-Standards-Warning-MinWage', 'missing');
    }

    next();
  }

  router.use(validateStandardsBeforePayrollSave);

  // ── payrolls 저장 시 payroll_items 동기화 ──
  const { PayrollItemsRepository } = require('../lib/repositories/payrollItemsRepository');
  const { v4: uuid } = require('uuid');

  function syncPayrollItems(payrollId, body) {
    if (!payrollId || !body) return;
    const itemsRepo = new PayrollItemsRepository(db.connection);
    const items = [];
    let sortOrder = 0;
    for (const [colName, itemType, hasPayType, payTypeCol] of PayrollItemsRepository.ALLOWANCE_MAP) {
      const amount = parseFloat(body[colName]) || 0;
      if (amount === 0 && itemType !== 'etc') continue;
      const payType = hasPayType && payTypeCol ? (body[payTypeCol] || null) : null;
      const memo = colName === 'etc_allowance' ? (body['etc_allowance_memo'] || null) : null;
      items.push({
        id: uuid(), payroll_id: payrollId, item_type: itemType,
        amount, pay_type: payType, memo, sort_order: sortOrder,
        created_at: Date.now(), updated_at: Date.now()
      });
      sortOrder++;
    }
    if (items.length > 0) itemsRepo.replaceItems(payrollId, items);
  }

  /** GET /tables/:t */
  router.get('/:t', (req, res) => {
    try {
      const table = resolveTable(req.params.t, db);
      if (!table) return res.json({ data: [], total: 0, page: 1, limit: 200 });
      res.json(table.find(req.query));
    } catch (e) {
      console.error(`[GET /tables/${req.params.t}]`, e.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /** GET /tables/:t/:id */
  router.get('/:t/:id', (req, res) => {
    try {
      const table = resolveTable(req.params.t, db);
      if (!table) return res.status(404).json({ error: 'Not found' });
      const row = table.findById(req.params.id);
      row ? res.json(row) : res.status(404).json({ error: 'Not found' });
    } catch (e) {
      console.error(`[GET /tables/${req.params.t}/:id]`, e.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /** POST /tables/:t */
  router.post('/:t', (req, res) => {
    try {
      const table = resolveTable(req.params.t, db);
      if (!table) return res.status(400).json({ error: `Unknown table: ${req.params.t}` });
      const result = table.insert(req.body);
      if (table.tableName === 'payrolls') syncPayrollItems(result.id, req.body);
      res.status(201).json(result);
    } catch (e) {
      console.error(`[POST /tables/${req.params.t}]`, e.message);
      const status = e.message.startsWith('Invalid column') ? 400 : 500;
      res.status(status).json({ error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error' });
    }
  });

  /** PUT /tables/:t/:id */
  router.put('/:t/:id', (req, res) => {
    try {
      const table = resolveTable(req.params.t, db);
      if (!table) return res.status(400).json({ error: `Unknown table: ${req.params.t}` });
      const result = table.upsert(req.params.id, req.body);
      if (table.tableName === 'payrolls') syncPayrollItems(result.id, req.body);
      res.json(result);
    } catch (e) {
      console.error(`[PUT /tables/${req.params.t}/:id]`, e.message);
      const status = e.message.startsWith('Invalid column') ? 400 : 500;
      res.status(status).json({ error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error' });
    }
  });

  /** PATCH /tables/:t/:id */
  router.patch('/:t/:id', (req, res) => {
    try {
      const table = resolveTable(req.params.t, db);
      if (!table) return res.status(400).json({ error: `Unknown table: ${req.params.t}` });
      const row = table.patch(req.params.id, req.body);
      if (!row) return res.status(404).json({ error: 'Not found' });
      if (table.tableName === 'payrolls') syncPayrollItems(row.id, req.body);
      res.json(row);
    } catch (e) {
      console.error(`[PATCH /tables/${req.params.t}/:id]`, e.message);
      const status = e.message.startsWith('Invalid column') ? 400 : 500;
      res.status(status).json({ error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error' });
    }
  });

  /** DELETE /tables/:t/:id */
  router.delete('/:t/:id', (req, res) => {
    try {
      const table = resolveTable(req.params.t, db);
      if (!table) return res.status(404).json({ error: 'Not found' });
      table.delete(req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
    } catch (e) {
      console.error(`[DELETE /tables/${req.params.t}/:id]`, e.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /** GET /tables/payrolls/:id/items — payrolls + payroll_items 조인 */
  router.get('/payrolls/:id/items', (req, res) => {
    try {
      const payroll = db.payrolls.findById(req.params.id);
      if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
      const itemsRepo = new PayrollItemsRepository(db.connection);
      const items = itemsRepo.findByPayroll(req.params.id);
      res.json({ ...payroll, items });
    } catch (e) {
      console.error('[GET /tables/payrolls/:id/items]', e.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
