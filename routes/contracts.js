/**
 * routes/contracts.js — 계약 API
 * 
 * GET    /api/contracts              — 목록 (필터: company_id, employee_id, status)
 * GET    /api/contracts/:id          — 상세
 * POST   /api/contracts              — 생성
 * PATCH  /api/contracts/:id          — 수정
 * DELETE /api/contracts/:id          — 삭제
 * POST   /api/contracts/:id/renew     — 갱신
 * POST   /api/contracts/:id/terminate — 종료
 */
module.exports = function(db) {
  const { Router } = require('express');
  const router = Router();

  // 목록 (필터 지원)
  router.get('/', (req, res) => {
    try {
      const rows = db.contracts.find(req.query);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 상세
  router.get('/:id', (req, res) => {
    try {
      const contract = db.contracts.findById(req.params.id);
      if (!contract) return res.status(404).json({ error: '계약을 찾을 수 없습니다' });

      const employee = db.employees.findById(contract.employee_id);
      const company = db.companies.findById(contract.company_id);

      res.json({ ...contract, _employee: employee, _company: company });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 생성
  router.post('/', (req, res) => {
    try {
      const result = db.contracts.insert(req.body);
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // 수정
  router.patch('/:id', (req, res) => {
    try {
      db.contracts.patch(req.params.id, req.body);
      res.json({ success: true, data: db.contracts.findById(req.params.id) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 삭제
  router.delete('/:id', (req, res) => {
    try {
      db.contracts.delete(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 갱신
  router.post('/:id/renew', (req, res) => {
    try {
      const original = db.contracts.findById(req.params.id);
      if (!original) return res.status(404).json({ error: '원본 계약을 찾을 수 없습니다' });

      const newContract = {
        ...original,
        id: undefined,
        status: 'renewal_pending',
        previous_contract_id: req.params.id,
        ...req.body,
      };
      delete newContract.created_at;
      delete newContract.updated_at;

      const result = db.contracts.insert(newContract);
      res.status(201).json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 종료
  router.post('/:id/terminate', (req, res) => {
    try {
      const { terminate_date, terminate_reason } = req.body;
      db.contracts.patch(req.params.id, {
        status: 'terminate_pending',
        terminate_date: terminate_date || new Date().toISOString().slice(0, 10),
        terminate_reason: terminate_reason || '',
      });
      res.json({ success: true, data: db.contracts.findById(req.params.id) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
