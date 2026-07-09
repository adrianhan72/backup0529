/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 *
 * v2.38.0 — JWT + 라우트 분리, BaseRepository 기반
 */
const express = require('express');
const path    = require('path');
const { DB }  = require('./lib/database');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── DB ──
const db = new DB(path.join(ROOT, 'data', 'app.db'));

// ── 미들웨어 ──
app.use(require('./middleware/cors')());
app.use(express.json({ limit: '10mb' }));

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
