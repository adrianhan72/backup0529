/**
 * routes/auth.js — 인증 라우트
 */
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

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

  return router;
};
