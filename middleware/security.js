/**
 * middleware/security.js — 보안 헤더 (Helmet) + 민감 경로 차단
 */
const helmet = require('helmet');
const path   = require('path');

module.exports = function(app) {
  // ── Helmet 보안 헤더 ──
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", 'cdn.jsdelivr.net', "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc:   ["'self'", 'cdn.jsdelivr.net', 'fonts.googleapis.com', "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:', 'blob:'],
        fontSrc:    ["'self'", 'cdn.jsdelivr.net', 'fonts.gstatic.com', 'data:'],
        connectSrc: ["'self'"],
        frameSrc:   ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    strictTransportSecurity: false,  // HSTS 비활성화 (로컬 HTTP 서버)
  }));

  // ── 민감 경로 차단 ──
  const ROOT = path.join(__dirname, '..');
  const BLOCKED = ['/data', '/node_modules', '/.git', '/package.json', '/server.js', '/.gitignore', '/.env'];
  BLOCKED.forEach(p => app.use(p, (req, res) => res.status(403).json({ error: 'Forbidden' })));
};
