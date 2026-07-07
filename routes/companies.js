/**
 * routes/companies.js — 고객사 API (Public — 클라이언트 앱용)
 */
module.exports = function(db) {
  const { Router } = require('express');
  const router = Router();

  /** GET /api/companies/check-code — 접근코드 중복 확인 */
  router.get('/check-code', (req, res) => {
    try {
      const { code, exclude } = req.query;
      if (!code) return res.json({ duplicate: false });
      let result;
      if (exclude) {
        result = db.companies.findOne({ access_code: code, 'id__!=': exclude });
      } else {
        result = db.companies.findOne({ access_code: code });
      }
      res.json({ duplicate: !!result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** PATCH /api/companies/:id */
  router.patch('/:id', (req, res) => {
    try {
      const allowed = ['access_code'];
      const patch = {};
      for (const k of allowed) {
        if (req.body[k] !== undefined) patch[k] = req.body[k];
      }
      if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No valid fields' });
      db.companies.patch(req.params.id, patch);
      res.json({ success: true, data: db.companies.findById(req.params.id) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
