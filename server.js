/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 *
 * v2.39.0 — Rate Limit + Health Check
 */
const express    = require('express');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const { DB }     = require('./lib/database');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── DB ──
const db = new DB(path.join(ROOT, 'data', 'app.db'));

// ── 미들웨어 ──
app.use(require('./middleware/cors')());
app.use(express.json({ limit: '10mb' }));

// ── Health Check (Rate Limit 제외) ──
app.get('/api/health', (req, res) => {
  try {
    db.connection.raw.prepare('SELECT 1').get();
    res.json({ status: 'ok', uptime: process.uptime(), db: 'connected', memory: process.memoryUsage().rss, version: '2.39.0', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: e.message });
  }
});

// ── Rate Limiting ──
const loginLimiter = rateLimit({ windowMs: 60*1000, max: 5, message: { error: '로그인 시도 횟수 초과. 1분 후 다시 시도하세요.' } });
const apiLimiter   = rateLimit({ windowMs: 60*1000, max: 100, message: { error: '요청 횟수 초과' } });
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);

// ── 라우트 ──
app.use('/api/auth',        require('./routes/auth')(db));
app.use('/api/companies',   require('./routes/companies')(db));
app.use('/api/employees',   require('./routes/employees')(db));
app.use('/api/contracts',   require('./routes/contracts')(db));
app.use('/api/payrolls',    require('./routes/payrolls')(db));
app.use('/api/billing',     require('./routes/billing')(db));
app.use('/tables',          require('./routes/tables')(db));       // 하위 호환 유지

// ── 기타 API ──
app.post('/api/kakao/send', (req, res) => {
  res.json({ ok: true, stub: true, message: '카카오 전송 (스텁)' });
});

// ── ES Module (.mjs) MIME 타입 보장 ──
app.use('/admin', (req, res, next) => {
  if (req.path.endsWith('.mjs')) {
    const relPath = req.path.replace(/^[\/\\]/, '');
    const filePath = path.join(ROOT, 'admin', relPath);
    res.type('application/javascript');
    res.sendFile(filePath, err => err && next());
  } else {
    next();
  }
});

// ── 정적 파일 ──
app.use('/admin',   express.static(path.join(ROOT, 'admin')));
app.use('/client',  express.static(path.join(ROOT, 'client')));
app.use('/scripts', express.static(path.join(ROOT, 'scripts')));
app.use('/docs',    express.static(path.join(ROOT, 'docs')));

// ── 보안 ──
require('./middleware/security')(app);

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

// ── 서버 시작 ──
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ SQLite 서버 실행 중  →  http://0.0.0.0:' + PORT);
  console.log('   🏠 메인       →  http://localhost:' + PORT + '/');
  console.log('   ⚙️  관리자     →  http://localhost:' + PORT + '/admin/');
  console.log('   📱 고객사     →  http://localhost:' + PORT + '/client/\n');
});
