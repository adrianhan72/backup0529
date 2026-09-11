/**
 * middleware/security.js — 보안 헤더 (수동 설정) + 민감 경로 차단
 * Helmet 제거: HSTS가 HTTP에서 캐시된 후 서버에서 해제 불가 (RFC 6797)
 */
const path = require('path');

module.exports = function(app) {
  // ── 보안 헤더 (HSTS 없음 — 로컬 HTTP 서버) ──
  app.use((req, res, next) => {
    // CSP
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' cdn.jsdelivr.net fonts.googleapis.com 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self' cdn.jsdelivr.net fonts.gstatic.com data:; " +
      "connect-src 'self'; " +
      "frame-src 'self'"
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // HSTS 의도적 제외 — HTTP 서버에서 설정하면 해제 불가
    next();
  });

  // ── 민감 경로 차단 ──
  const ROOT = path.join(__dirname, '..');
  const BLOCKED = ['/data', '/node_modules', '/.git', '/package.json', '/server.js', '/.gitignore', '/.env'];
  BLOCKED.forEach(p => app.use(p, (req, res) => res.status(403).json({ error: 'Forbidden' })));
};
