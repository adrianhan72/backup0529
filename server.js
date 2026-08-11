/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 *
 * v2.40.0 — 크론잡 Worker Thread 분리 (Main Thread 블록 해소)
 *   lib/cron/worker.js  — Worker Thread (better-sqlite3 별도 연결, cron 패키지)
 *   lib/cron/index.js   — CronWorkerManager (Main Thread에서 Worker 관리)
 *   lib/cron/jobs/      — 7개 크론 작업 함수 (API-First, batchedQuery, setImmediate)
 */
require('dotenv').config();
const express = require('express');
const path    = require('path');
const { DB }  = require('./lib/database');
const { createSolapiClient } = require('./lib/solapi');
const { CronWorkerManager } = require('./lib/cron');

// Solapi 클라이언트 (카카오 라우트 + 크론 Worker 각각 별도 인스턴스)
const solapi = createSolapiClient();

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── DB ──
const db = new DB(path.join(ROOT, 'data', 'app.db'));

// ── 미들웨어 ──
app.use(require('./middleware/cors')());
app.use(express.json({ limit: '10mb' }));

// ── 라우트 ──
app.use('/api/auth',      require('./routes/auth')(db));
app.use('/api/companies', require('./routes/companies')(db));
app.use('/api/kakao',     require('./routes/kakao')(db, solapi));
app.use('/api',           require('./routes/upload')(ROOT));
// PDF: /view/:type/:id (root) + /api/generate-pdf, /api/verify-pdf-access, /api/client-pdf-access
app.use('/',    require('./routes/pdf')(db, ROOT));
app.use('/api', require('./routes/pdf')(db, ROOT));
app.use('/api', require('./routes/wage-ledger-files')(db, ROOT));
app.use('/tables',        require('./routes/tables')(db));

// ── 정적 파일 ──
const staticOpts = { maxAge: 0, etag: false };
app.use('/admin',   express.static(path.join(ROOT, 'admin'), staticOpts));
app.use('/client',  express.static(path.join(ROOT, 'client'), staticOpts));
app.use('/scripts', express.static(path.join(ROOT, 'scripts'), staticOpts));
app.use('/docs',    express.static(path.join(ROOT, 'docs'), staticOpts));
app.use('/uploads', express.static(path.join(ROOT, 'data', 'uploads'), staticOpts));
app.use('/generated', express.static(path.join(ROOT, 'data', 'generated'), staticOpts));

// ── 보안 ──
require('./middleware/security')(app);

// ── 크론잡 Worker Thread (별도 이벤트 루프, Express 블록 영향 ZERO) ──
const cronManager = new CronWorkerManager(
  path.join(ROOT, 'data', 'app.db'),
  {
    apiKey: process.env.SOLAPI_API_KEY || '',
    apiSecret: process.env.SOLAPI_API_SECRET || '',
    pfId: process.env.SOLAPI_KAKAO_PF_ID || '',
    defaultSender: process.env.SOLAPI_DEFAULT_SENDER || '',
  }
);
cronManager.start();

// ── 크론 헬스체크 API (catch-all 보다 먼저 등록) ──
app.get('/health/cron', (req, res) => res.json(cronManager.getHealth()));

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

// ── Graceful Shutdown ──
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM — shutting down');
  cronManager.stop();
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('[Server] SIGINT — shutting down');
  cronManager.stop();
  process.exit(0);
});

// ── 서버 시작 ──
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ SQLite 서버 실행 중  →  http://0.0.0.0:' + PORT);
  console.log('   🏠 메인       →  http://localhost:' + PORT + '/');
  console.log('   ⚙️  관리자     →  http://localhost:' + PORT + '/admin/');
  console.log('   📱 고객사     →  http://localhost:' + PORT + '/client/\n');
});

