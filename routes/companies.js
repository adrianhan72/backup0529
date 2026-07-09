/**
 * routes/companies.js — 고객사 API
 * 
 * GET    /api/companies              — 목록
 * GET    /api/companies/:id          — 상세 + 직원·계약 수
 * POST   /api/companies              — 생성
 * PATCH  /api/companies/:id          — 수정
 * DELETE /api/companies/:id          — 삭제 (soft-delete)
 * GET    /api/companies/:id/employees — 소속 직원
 * GET    /api/companies/:id/contracts — 소속 계약
 * GET    /api/companies/check-code   — 접근코드 중복 확인
 */
module.exports = function(db) {
  const { Router } = require('express');
  const router = Router();

  // ── 목록 ──
  router.get('/', (req, res) => {
    try {
      const rows = db.companies.find(req.query);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── 접근코드 중복 확인 (목록보다 위에 있어야 /:id 에 매칭되지 않음) ──
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

  // ── 상세 + 연관 데이터 ──
  router.get('/:id', (req, res) => {
    try {
      const company = db.companies.findById(req.params.id);
      if (!company) return res.status(404).json({ error: '고객사를 찾을 수 없습니다' });

      const employeeCount = db.employees.count({ company_id: req.params.id });
      const contractCount = db.contracts.count({ company_id: req.params.id, is_draft: 0 });

      res.json({ ...company, employeeCount, contractCount });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── 소속 직원 ──
  router.get('/:id/employees', (req, res) => {
    try {
      const rows = db.employees.find({ company_id: req.params.id });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── 소속 계약 ──
  router.get('/:id/contracts', (req, res) => {
    try {
      const rows = db.contracts.find({ company_id: req.params.id });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── 생성 ──
  router.post('/', (req, res) => {
    try {
      if (!req.body.company_name || !req.body.company_name.trim()) {
        return res.status(400).json({ error: '고객사명은 필수입니다' });
      }
      const result = db.companies.insert(req.body);
      res.status(201).json(result);
    } catch (e) {
      const status = e.message.includes('Invalid column') ? 400 : 500;
      res.status(status).json({ error: e.message });
    }
  });

  // ── 수정 ──
  router.patch('/:id', (req, res) => {
    try {
      const result = db.companies.patch(req.params.id, req.body);
      res.json({ success: true, data: db.companies.findById(req.params.id) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── 삭제 (soft-delete: is_draft = 1) ──
  router.delete('/:id', (req, res) => {
    try {
      db.companies.patch(req.params.id, { is_draft: 1 });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
