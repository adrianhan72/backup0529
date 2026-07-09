/**
 * routes/billing.js — 청구·기준·계정 API
 * 
 * /api/billing           — 청구서
 * /api/standards         — 보험요율·최저임금
 * /api/admin/accounts    — 관리자 계정
 */
module.exports = function(db) {
  const { Router } = require('express');
  const router = Router();

  // ── 청구서 ──
  router.get('/', (req, res) => {
    try { res.json(db.billing.find(req.query)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });
  router.post('/', (req, res) => {
    try { res.status(201).json(db.billing.insert(req.body)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  router.patch('/:id', (req, res) => {
    try { db.billing.patch(req.params.id, req.body); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
