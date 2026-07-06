/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 *
 * v2.36.0 — lib/database.js (BaseRepository) 기반 리팩토링
 */
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const crypto  = require('crypto');
const { DB }  = require('./lib/database');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ═══════════════════════════════════════════════
// DB — 테이블 클래스 기반 인스턴스
// ═══════════════════════════════════════════════
const db = new DB(path.join(ROOT, 'data', 'app.db'));

// ═══════════════════════════════════════════════
// CORS — 허용된 오리진만
// ═══════════════════════════════════════════════
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════
// 테이블 별칭 (프론트엔드 호환 — 복수→단수 매핑 유지)
// ═══════════════════════════════════════════════
const TABLE_ALIAS = {
  billings: 'billing',
  contract_expiry_notices: 'contract_expiry_notice',
  company_histories: 'company_history',
};
const VALID_TABLES = new Set([
  'companies','employees','contracts','payrolls','billing',
  'payroll_send_logs','contract_dispatch','contract_expiry_notice',
  'company_notices','admin_accounts','insurance_rates','minimum_wages',
  'annual_leave_promotions','annual_leave_ledger','company_history',
  'wage_ledger_notifications',
]);

/**
 * 테이블명 검증 + 별칭 해결 → Table 인스턴스
 * @param {string} name
 * @returns {import('./lib/database').Table|null}
 */
function resolveTable(name) {
  const t = TABLE_ALIAS[name] || name;
  if (!VALID_TABLES.has(t)) return null;
  return db.table(t);
}

// ═══════════════════════════════════════════════
// 인증 미들웨어
// ═══════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const admin = db.admin_accounts.authenticate(username, password);
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = JSON.stringify({
      id: admin.id,
      username: admin.username,
      display_name: admin.display_name,
      exp: Date.now() + 8 * 3600000,
    });
    const token = Buffer.from(payload).toString('base64');
    res.json({ token, display_name: admin.display_name });
  } catch (e) {
    console.error('[LOGIN]', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function authMiddleware(req, res, next) {
  if (process.env.DEV !== 'false') return next();
  if (req.method === 'GET') return next();

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
    if (payload.exp < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ═══════════════════════════════════════════════
// 고객사 접근코드 중복 확인 (Public — 클라이언트 앱용)
// ═══════════════════════════════════════════════
app.get('/api/companies/check-code', (req, res) => {
  try {
    const { code, exclude } = req.query;
    if (!code) return res.json({ duplicate: false });
    let result;
    if (exclude) {
      result = db.companies.findOne({ access_code: code, 'id__!=': exclude });
    } else {
      result = db.companies.findOne({ access_code: code });
    }
    res.json({ duplicate: !!result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/companies/:id — 고객사 정보 업데이트 (클라이언트 앱용, access_code 수정 허용)
app.patch('/api/companies/:id', (req, res) => {
  try {
    const id = req.params.id;
    const allowed = ['access_code'];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'No valid fields' });
    db.companies.patch(id, patch);
    const updated = db.companies.findById(id);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use('/tables', authMiddleware);

// ═══════════════════════════════════════════════
// REST API — BaseRepository 클래스 위임 (컬럼 화이트리스트는 PRAGMA 기반 자동 검증)
// ═══════════════════════════════════════════════

/** GET /tables/:t — 목록 조회 */
app.get('/tables/:t', (req, res) => {
  try {
    const table = resolveTable(req.params.t);
    if (!table) return res.json({ data: [], total: 0, page: 1, limit: 200 });
    const result = table.find(req.query);
    res.json(result);
  } catch (e) {
    console.error(`[GET /tables/${req.params.t}]`, e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /tables/:t/:id — 단건 조회 */
app.get('/tables/:t/:id', (req, res) => {
  try {
    const table = resolveTable(req.params.t);
    if (!table) return res.status(404).json({ error: 'Not found' });
    const row = table.findById(req.params.id);
    row ? res.json(row) : res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error(`[GET /tables/${req.params.t}/:id]`, e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /tables/:t — 신규 생성 */
app.post('/tables/:t', (req, res) => {
  try {
    const table = resolveTable(req.params.t);
    if (!table) return res.status(400).json({ error: `Unknown table: ${req.params.t}` });
    const row = table.insert(req.body);
    res.status(201).json(row);
  } catch (e) {
    console.error(`[POST /tables/${req.params.t}]`, e.message);
    const status = e.message.startsWith('Invalid column') ? 400 : 500;
    res.status(status).json({ error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error' });
  }
});

/** PUT /tables/:t/:id — Upsert */
app.put('/tables/:t/:id', (req, res) => {
  try {
    const table = resolveTable(req.params.t);
    if (!table) return res.status(400).json({ error: `Unknown table: ${req.params.t}` });
    const row = table.upsert(req.params.id, req.body);
    res.json(row);
  } catch (e) {
    console.error(`[PUT /tables/${req.params.t}/:id]`, e.message);
    const status = e.message.startsWith('Invalid column') ? 400 : 500;
    res.status(status).json({ error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error' });
  }
});

/** PATCH /tables/:t/:id — 부분 업데이트 */
app.patch('/tables/:t/:id', (req, res) => {
  try {
    const table = resolveTable(req.params.t);
    if (!table) return res.status(400).json({ error: `Unknown table: ${req.params.t}` });
    const row = table.patch(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    console.error(`[PATCH /tables/${req.params.t}/:id]`, e.message);
    const status = e.message.startsWith('Invalid column') ? 400 : 500;
    res.status(status).json({ error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error' });
  }
});

/** DELETE /tables/:t/:id — 삭제 */
app.delete('/tables/:t/:id', (req, res) => {
  try {
    const table = resolveTable(req.params.t);
    if (!table) return res.status(404).json({ error: 'Not found' });
    const ok = table.delete(req.params.id);
    ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error(`[DELETE /tables/${req.params.t}/:id]`, e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════
// 기타 API
// ═══════════════════════════════════════════════
app.post('/api/kakao/send', (req, res) => {
  res.json({ ok: true, stub: true, message: '카카오 전송 (스텁)' });
});

// ═══════════════════════════════════════════════
// 정적 파일 — 필요한 디렉토리만 노출
// ═══════════════════════════════════════════════
app.use('/admin',   express.static(path.join(ROOT, 'admin')));
app.use('/client',  express.static(path.join(ROOT, 'client')));
app.use('/scripts', express.static(path.join(ROOT, 'scripts')));
app.use('/docs',    express.static(path.join(ROOT, 'docs')));

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

const BLOCKED = ['/data', '/node_modules', '/.git', '/package.json', '/server.js', '/.gitignore', '/.env'];
BLOCKED.forEach(p => app.use(p, (req, res) => res.status(403).json({ error: 'Forbidden' })));

app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

// ═══════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ SQLite 서버 실행 중  →  http://0.0.0.0:' + PORT);
  console.log('   🏠 메인       →  http://localhost:' + PORT + '/');
  console.log('   ⚙️  관리자     →  http://localhost:' + PORT + '/admin/');
  console.log('   📱 고객사     →  http://localhost:' + PORT + '/client/\n');
});
