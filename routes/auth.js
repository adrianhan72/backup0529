/**
 * routes/auth.js — 인증 라우트
 */
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { fmtLocalDate } = require('../lib/utils');

module.exports = function(db) {
  const { Router } = require('express');
  const router = Router();

  /** POST /api/auth/login */
  router.post('/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

      const admin = db.admin_accounts.authenticate(username, password);
      if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { id: admin.id, username: admin.username, display_name: admin.display_name },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      res.json({ token, display_name: admin.display_name });
    } catch (e) {
      console.error('[LOGIN]', e.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /** POST /api/auth/client-login — 고객사 앱 access_code 로그인 (JWT 발급) */
  router.post('/client-login', (req, res) => {
    try {
      const { access_code } = req.body || {};
      if (!access_code) return res.status(400).json({ error: 'Access code required' });

      const company = db.companies.findByAccessCode(String(access_code).trim());
      if (!company) return res.status(401).json({ error: 'Invalid access code' });

      // 해지된 고객사 차단 (client-core.js 의 tryLogin 과 동일 규칙)
      const today = fmtLocalDate(new Date());
      const isInactive = company.status === 'inactive';
      const isAutoTerminated = company.status === 'active' && company.contract_end_date && company.contract_end_date <= today;
      if (isInactive || isAutoTerminated) {
        return res.status(403).json({ error: 'Terminated company', endDate: company.contract_end_date || null });
      }

      const token = jwt.sign(
        { role: 'client', company_id: company.id, access_code: company.access_code },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      res.json({ token, company_id: company.id, company_name: company.company_name });
    } catch (e) {
      console.error('[CLIENT-LOGIN]', e.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
