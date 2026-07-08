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
  'payroll_send_logs','contract_dispatch','contract_expiry_notice',
  'company_notices','admin_accounts','insurance_rates','minimum_wages',
  'annual_leave_promotions','annual_leave_ledger','company_history',
  'wage_ledger_notifications',
  'registered_executives','related_party_workers',
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
      res.status(201).json(table.insert(req.body));
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
      res.json(table.upsert(req.params.id, req.body));
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

  return router;
};
