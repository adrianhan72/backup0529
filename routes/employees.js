/**
 * routes/employees.js — 직원 API
 * 
 * GET    /api/employees              — 목록
 * GET    /api/employees/:id          — 상세
 * POST   /api/employees              — 생성
 * PATCH  /api/employees/:id          — 수정
 * DELETE /api/employees/:id          — 삭제
 * GET    /api/employees/:id/contracts — 직원 계약 이력
 */
module.exports = function(db) {
  const { Router } = require('express');
  const { authMiddleware } = require('../middleware/auth');
  const router = Router();

  router.use(authMiddleware);

  // 목록
  router.get('/', (req, res) => {
    try {
      const rows = db.employees.find(req.query);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 상세 + 현 계약
  router.get('/:id', (req, res) => {
    try {
      const emp = db.employees.findById(req.params.id);
      if (!emp) return res.status(404).json({ error: '직원을 찾을 수 없습니다' });

      const contracts = db.contracts.find({ employee_id: req.params.id, is_draft: 0 });
      const activeContract = contracts.find(c => c.status === 'active');

      res.json({ ...emp, contracts, activeContract });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 계약 이력
  router.get('/:id/contracts', (req, res) => {
    try {
      const rows = db.contracts.find({ employee_id: req.params.id });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 생성
  router.post('/', (req, res) => {
    try {
      const result = db.employees.insert(req.body);
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // 수정
  router.patch('/:id', (req, res) => {
    try {
      db.employees.patch(req.params.id, req.body);
      res.json({ success: true, data: db.employees.findById(req.params.id) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 삭제
  router.delete('/:id', (req, res) => {
    try {
      db.employees.delete(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
