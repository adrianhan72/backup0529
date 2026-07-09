/**
 * routes/payrolls.js — 급여 API
 */
module.exports = function(db) {
  const { Router } = require('express');
  const { authMiddleware } = require('../middleware/auth');
  const router = Router();

  router.use(authMiddleware);

  router.get('/', (req, res) => {
    try { res.json(db.payrolls.find(req.query)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const row = db.payrolls.findById(req.params.id);
      row ? res.json(row) : res.status(404).json({ error: 'Not found' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/', (req, res) => {
    try { res.status(201).json(db.payrolls.insert(req.body)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.patch('/:id', (req, res) => {
    try {
      db.payrolls.patch(req.params.id, req.body);
      res.json({ success: true, data: db.payrolls.findById(req.params.id) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.delete('/:id', (req, res) => {
    try { db.payrolls.delete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
