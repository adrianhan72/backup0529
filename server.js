/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 */
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const crypto   = require('crypto');
const Database = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const db = new Database(path.join(ROOT, 'data', 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
// 테이블 검증
// ═══════════════════════════════════════════════
const TABLE_ALIAS = { billings: 'billing', contract_expiry_notices: 'contract_expiry_notice', company_histories: 'company_history' };
function resolveTable(n) { return TABLE_ALIAS[n] || n; }

const VALID_TABLES = new Set(['companies','employees','contracts','payrolls','billing','payroll_send_logs','contract_dispatch','contract_expiry_notice','company_notices','admin_accounts','insurance_rates','minimum_wages','annual_leave_promotions','annual_leave_ledger','company_history','wage_ledger_notifications']);
function validateTable(name) { const t = resolveTable(name); if (!VALID_TABLES.has(t)) return null; return t; }

// ═══════════════════════════════════════════════
// 컬럼 화이트리스트 (SQL Injection 방어)
// ═══════════════════════════════════════════════
const TABLE_COLUMNS = {
  companies: new Set(['company_name','business_number','representative','industry','address','phone','email','pay_period','pay_day','access_code','note','insurance_basis','annual_leave_basis','is_draft','draft_saved_at','status','allowance_config','service_contract_file_name','service_contract_file_data','contract_start_date','contract_end_date','pay_period_month','pay_period_day','created_at','updated_at']),
  employees: new Set(['company_id','name','gender','employment_category','employee_number','department','position','hire_date','contract_period','status','note','id_number','phone','email','address','dependents','job_description','is_representative','expire_date','resign_date','bank_name','bank_account','created_at','updated_at']),
  contracts: new Set(['employee_id','company_id','contract_start','contract_end','work_hours_per_day','work_days_per_week','work_days_per_month','break_time','annual_leave_days','monthly_salary_agreed','annual_salary','base_salary','hourly_wage','weekly_holiday_pay','daily_wage','contract_type','status','pay_period','pay_day','meal_allowance','meal_pay_type','transportation_allowance','transportation_pay_type','self_driving_allowance','self_driving_pay_type','remote_area_allowance','remote_area_pay_type','research_allowance','research_pay_type','communication_allowance','communication_pay_type','fitness_allowance','fitness_pay_type','self_dev_allowance','self_dev_pay_type','book_allowance','book_pay_type','overseas_allowance','overseas_pay_type','car_maintenance','regular_bonus','childcare_allowance','childcare_dependents','site_allowance','skill_allowance','license_allowance','position_allowance','insurance_employment','insurance_industrial','insurance_pension','insurance_health','fixed_ot_pay','fixed_ot_hours','fixed_night_pay','fixed_night_hours','fixed_hol_pay','fixed_hol_hours','probation_months','probation_pct','probation_amt','probation_basis','amended_from','is_voided_by_amend','voided_at','signed_file_name','signed_file_data','consent_file_name','consent_file_data','salary_start_date','salary_end_date','is_draft','draft_saved_at','note','schedule_json','terminate_date','terminate_reason','created_at','updated_at']),
  payrolls: new Set(['employee_id','company_id','pay_year','pay_month','pay_date','work_days','base_salary','weekly_holiday_pay','standard_monthly_pay','gross_pay','national_pension','health_insurance','long_term_care','employment_insurance','income_tax','local_income_tax','total_deduction','net_pay','is_draft','draft_saved_at','edit_source_id','note','total_work_hours','overtime_hours','night_hours','holiday_hours','hourly_wage','position_allowance','skill_allowance','license_allowance','overtime_pay','night_pay','holiday_pay','transport_type','transport_pay_type','transportation_allowance','transportation_pay_type','self_driving_allowance','self_driving_pay_type','meal_allowance','meal_pay_type','childcare_allowance','childcare_pay_type','childcare_dependents','research_allowance','research_pay_type','communication_allowance','communication_pay_type','fitness_allowance','fitness_pay_type','self_dev_allowance','self_dev_pay_type','book_allowance','book_pay_type','overseas_allowance','overseas_pay_type','contract_etc_allowance','annual_leave_used','annual_leave_pay','bonus_pay','performance_pay','actual_expense_pay','communication_pay','etc_allowance','etc_allowance_memo','year_end_tax_adjust','year_end_tax_adjust_memo','health_insurance_adjust','health_insurance_adjust_memo','health_insurance_adjust_yearend','health_insurance_adjust_yearend_memo','ltcare_adjust_yearend','ltcare_adjust_yearend_memo','advance_deduction','advance_deduction_memo','dependents','site_allowance','remote_area_allowance','regular_bonus','created_at','updated_at']),
};

function validateColumns(table, keys) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) return;
  for (const key of keys) {
    if (key === 'id') continue;
    if (!allowed.has(key)) {
      throw new Error(`Invalid column for ${table}: ${key}`);
    }
  }
}

// ═══════════════════════════════════════════════
// 정렬 화이트리스트 (SQL Injection 방어)
// ═══════════════════════════════════════════════
const SORTABLE_COLUMNS = {
  companies: new Set(['company_name','created_at','updated_at','status','pay_day']),
  employees: new Set(['name','employee_number','hire_date','department','created_at']),
  contracts: new Set(['contract_start','contract_end','base_salary','monthly_salary_agreed','status','created_at']),
  payrolls: new Set(['pay_year','pay_month','gross_pay','net_pay','created_at']),
  billing: new Set(['billing_year','billing_month','total_amount','due_date','created_at']),
  contract_dispatch: new Set(['dispatched_at','created_at']),
  contract_expiry_notice: new Set(['noticed_at','contract_end','created_at']),
  company_notices: new Set(['sent_at','created_at']),
  payroll_send_logs: new Set(['sent_at','created_at']),
  annual_leave_promotions: new Set(['sent_at','created_at']),
  annual_leave_ledger: new Set(['year','created_at']),
  company_history: new Set(['changed_at','effective_date','created_at']),
};

function buildWhere(params) {
  const exclude = new Set(['limit','page','sort','order']);
  const clauses = []; const values = [];
  for (const [k, v] of Object.entries(params)) {
    if (exclude.has(k)) continue;
    clauses.push(k + ' = ?'); values.push(String(v));
  }
  return { where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', values };
}

function buildOrder(params, tableName) {
  if (!params.sort) return '';
  const cols = SORTABLE_COLUMNS[tableName];
  if (!cols || !cols.has(params.sort)) return '';
  const dir = params.order === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${params.sort} ${dir}`;
}

function toSQL(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return v;
}
function toSQLValues(obj) { return Object.values(obj).map(toSQL); }

// ═══════════════════════════════════════════════
// 인증 미들웨어 — REST API 라우트보다 먼저 등록
// ═══════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({error:'Username and password required'});
    
    const admin = db.prepare('SELECT id, username, display_name FROM admin_accounts WHERE username=? AND password=?').get(username, password);
    if (!admin) return res.status(401).json({error:'Invalid credentials'});
    
    const payload = JSON.stringify({
      id: admin.id,
      username: admin.username,
      display_name: admin.display_name,
      exp: Date.now() + 8 * 3600000,
    });
    const token = Buffer.from(payload).toString('base64');
    res.json({ token, display_name: admin.display_name });
  } catch(e) {
    console.error('[LOGIN]', e.message);
    res.status(500).json({error: 'Internal server error'});
  }
});

function authMiddleware(req, res, next) {
  // DEV=false 일 때만 인증 활성화 (기본값: 인증 스킵)
  if (process.env.DEV !== 'false') return next();
  if (req.method === 'GET') return next();
  
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({error:'Authentication required'});
  }
  
  try {
    const payload = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
    if (payload.exp < Date.now()) {
      return res.status(401).json({error:'Token expired'});
    }
    req.user = payload;
    next();
  } catch(e) {
    res.status(401).json({error:'Invalid token'});
  }
}

app.use('/tables', authMiddleware);

// ═══════════════════════════════════════════════
// REST API
// ═══════════════════════════════════════════════

app.get('/tables/:t', (req, res) => {
  try {
    const t = validateTable(req.params.t);
    if (!t) return res.json({ data: [], total: 0, page: 1, limit: 200 });
    const { where, values } = buildWhere(req.query);
    const order = buildOrder(req.query, t);
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const rows = db.prepare(`SELECT * FROM ${t} ${where} ${order} LIMIT ? OFFSET ?`).all(...values, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM ${t} ${where}`).get(...values).cnt;
    res.json({ data: rows, total, page, limit });
  } catch(e) {
    console.error(`[GET /tables/${req.params.t}]`, e.message);
    res.status(500).json({error: 'Internal server error'});
  }
});

app.get('/tables/:t/:id', (req, res) => {
  try {
    const t = validateTable(req.params.t);
    if (!t) return res.status(404).json({error:'Not found'});
    const row = db.prepare(`SELECT * FROM ${t} WHERE id = ?`).get(req.params.id);
    row ? res.json(row) : res.status(404).json({error:'Not found'});
  } catch(e) {
    console.error(`[GET /tables/${req.params.t}/:id]`, e.message);
    res.status(500).json({error: 'Internal server error'});
  }
});

app.post('/tables/:t', (req, res) => {
  try {
    const t = validateTable(req.params.t);
    if (!t) return res.status(400).json({error: `Unknown table: ${req.params.t}`});
    
    const body = {...req.body};
    validateColumns(t, Object.keys(body));
    
    const now = Date.now();
    if (!body.id) body.id = require('uuid').v4();
    if (!body.created_at) body.created_at = now;
    body.updated_at = now;
    
    const cols = Object.keys(body);
    const vals = toSQLValues(body);
    db.prepare(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(()=>'?').join(', ')})`).run(...vals);
    res.status(201).json(db.prepare(`SELECT * FROM ${t} WHERE id = ?`).get(body.id));
  } catch(e) {
    console.error(`[POST /tables/${req.params.t}]`, e.message);
    res.status(400).json({error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error'});
  }
});

app.put('/tables/:t/:id', (req, res) => {
  try {
    const t = validateTable(req.params.t);
    if (!t) return res.status(400).json({error: `Unknown table: ${req.params.t}`});

    const body = {...req.body, id: req.params.id, updated_at: Date.now()};
    validateColumns(t, Object.keys(body));
    
    const cols = Object.keys(body);
    const vals = toSQLValues(body);
    
    if (db.prepare(`SELECT id FROM ${t} WHERE id = ?`).get(req.params.id)) {
      db.prepare(`UPDATE ${t} SET ${cols.map(c=>c+' = ?').join(', ')} WHERE id = ?`).run(...vals, req.params.id);
    } else {
      if (!body.created_at) body.created_at = Date.now();
      db.prepare(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(()=>'?').join(', ')})`).run(...vals);
    }
    res.json(db.prepare(`SELECT * FROM ${t} WHERE id = ?`).get(req.params.id));
  } catch(e) {
    console.error(`[PUT /tables/${req.params.t}/:id]`, e.message);
    res.status(400).json({error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error'});
  }
});

app.patch('/tables/:t/:id', (req, res) => {
  try {
    const t = validateTable(req.params.t);
    if (!t) return res.status(400).json({error: `Unknown table: ${req.params.t}`});

    const body = {...req.body, updated_at: Date.now()};
    validateColumns(t, Object.keys(body));
    
    if (!db.prepare(`SELECT id FROM ${t} WHERE id = ?`).get(req.params.id)) {
      return res.status(404).json({error:'Not found'});
    }
    
    const cols = Object.keys(body);
    const vals = toSQLValues(body);
    db.prepare(`UPDATE ${t} SET ${cols.map(c=>c+' = ?').join(', ')} WHERE id = ?`).run(...vals, req.params.id);
    res.json(db.prepare(`SELECT * FROM ${t} WHERE id = ?`).get(req.params.id));
  } catch(e) {
    console.error(`[PATCH /tables/${req.params.t}/:id]`, e.message);
    res.status(400).json({error: e.message.startsWith('Invalid column') ? e.message : 'Internal server error'});
  }
});

app.delete('/tables/:t/:id', (req, res) => {
  try {
    const t = validateTable(req.params.t);
    if (!t) return res.status(404).json({error:'Not found'});
    const r = db.prepare(`DELETE FROM ${t} WHERE id = ?`).run(req.params.id);
    r.changes > 0 ? res.json({ok:true}) : res.status(404).json({error:'Not found'});
  } catch(e) {
    console.error(`[DELETE /tables/${req.params.t}/:id]`, e.message);
    res.status(500).json({error: 'Internal server error'});
  }
});

// ═══════════════════════════════════════════════
// 기타 API
// ═══════════════════════════════════════════════
app.post('/api/kakao/send', (req, res) => { res.json({ok:true, stub:true, message:'카카오 전송 (스텁)'}); });

// ═══════════════════════════════════════════════
// 정적 파일 — 필요한 디렉토리만 노출
// ═══════════════════════════════════════════════
app.use('/admin',   express.static(path.join(ROOT, 'admin')));
app.use('/client',  express.static(path.join(ROOT, 'client')));
app.use('/scripts', express.static(path.join(ROOT, 'scripts')));
app.use('/docs',    express.static(path.join(ROOT, 'docs')));

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

const BLOCKED = ['/data', '/node_modules', '/.git', '/package.json', '/server.js', '/.gitignore', '/.env'];
BLOCKED.forEach(p => app.use(p, (req, res) => res.status(403).json({error:'Forbidden'})));

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
