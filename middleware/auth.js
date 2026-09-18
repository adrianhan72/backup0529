/**
 * middleware/auth.js — JWT 인증 미들웨어
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'nomusa-dev-secret-change-in-production';

function authMiddleware(req, res, next) {
  if (process.env.DEV !== 'false') return next();
  if (req.method === 'GET') return next();

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({
      error: 'Invalid token',
      code: e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
    });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
