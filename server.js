/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 *
 * v2.39.0 — 구조 리팩토링 (라우트/크론잡 분리, DB 마이그레이션 제거)
 *   routes/   — API 라우트 (auth, companies, kakao, upload, pdf, tables)
 *   lib/      — 유틸리티, 크론잡, DB, 솔라피
 *   middleware/ — 인증, CORS, 보안
 *   data/     — schema.sql (DBA 관리), app.db
 */
require('dotenv').config();
const express = require('express');
const path    = require('path');
const { DB }  = require('./lib/database');
const { createSolapiClient } = require('./lib/solapi');
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

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

// ── 크론잡 ──
require('./lib/cron')(db, solapi);

// ── 서버 시작 ──
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ SQLite 서버 실행 중  →  http://0.0.0.0:' + PORT);
  console.log('   🏠 메인       →  http://localhost:' + PORT + '/');
  console.log('   ⚙️  관리자     →  http://localhost:' + PORT + '/admin/');
  console.log('   📱 고객사     →  http://localhost:' + PORT + '/client/\n');
});

