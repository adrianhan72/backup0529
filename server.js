/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 */
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const Database = require('better-sqlite3');

const app  = express();
const PORT = 3000;
const ROOT = __dirname;

const db = new Database(path.join(ROOT, 'data', 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const TABLE_ALIAS = { billings: 'billing', contract_expiry_notices: 'contract_expiry_notice', company_histories: 'company_history' };
function resolveTable(n) { return TABLE_ALIAS[n] || n; }

const VALID_TABLES = new Set(['companies','employees','contracts','payrolls','billing','payroll_send_logs','contract_dispatch','contract_expiry_notice','company_notices','admin_accounts','insurance_rates','minimum_wages','annual_leave_promotions','annual_leave_ledger','company_history','wage_ledger_notifications']);
function validateTable(name) { const t = resolveTable(name); if (!VALID_TABLES.has(t)) { console.warn('Unknown table (returning empty): ' + t); return null; } return t; }

function buildWhere(params) { const exclude = new Set(['limit','page','sort','order']); const clauses = []; const values = []; for (const [k, v] of Object.entries(params)) { if (exclude.has(k)) continue; clauses.push(k + ' = ?'); values.push(String(v)); } return { where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', values }; }
function buildOrder(params) { if (!params.sort) return ''; const dir = params.order === 'asc' ? 'ASC' : 'DESC'; return 'ORDER BY ' + params.sort + ' ' + dir; }
function toSQL(v) { if (typeof v === 'boolean') return v ? 1 : 0; if (typeof v === 'object' && v !== null) return JSON.stringify(v); return v; }
function toSQLValues(obj) { return Object.values(obj).map(toSQL); }

app.get('/tables/:t', (req, res) => { try { const t = validateTable(req.params.t); if (!t) return res.json({ data: [], total: 0, page: 1, limit: 200 }); const { where, values } = buildWhere(req.query); const order = buildOrder(req.query); const limit = parseInt(req.query.limit) || 200; const page = parseInt(req.query.page) || 1; const offset = (page - 1) * limit; const rows = db.prepare('SELECT * FROM ' + t + ' ' + where + ' ' + order + ' LIMIT ? OFFSET ?').all(...values, limit, offset); const total = db.prepare('SELECT COUNT(*) as cnt FROM ' + t + ' ' + where).get(...values).cnt; res.json({ data: rows, total, page, limit }); } catch(e) { res.status(500).json({error:e.message}); }});
app.get('/tables/:t/:id', (req, res) => { try { const t = validateTable(req.params.t); if (!t) return res.status(404).json({error:'Not found'}); const row = db.prepare('SELECT * FROM ' + t + ' WHERE id = ?').get(req.params.id); row ? res.json(row) : res.status(404).json({error:'Not found'}); } catch(e) { res.status(500).json({error:e.message}); }});
app.post('/tables/:t', (req, res) => { try { const t = validateTable(req.params.t); if (!t) { db.exec('CREATE TABLE IF NOT EXISTS ' + resolveTable(req.params.t) + ' (id TEXT PRIMARY KEY, created_at INTEGER, updated_at INTEGER)'); } const body = {...req.body}; const now = Date.now(); if (!body.id) body.id = require('uuid').v4(); if (!body.created_at) body.created_at = now; body.updated_at = now; const cols = Object.keys(body); const vals = toSQLValues(body); db.prepare('INSERT INTO ' + t + ' (' + cols.join(', ') + ') VALUES (' + cols.map(()=>'?').join(', ') + ')').run(...vals); res.status(201).json(db.prepare('SELECT * FROM ' + t + ' WHERE id = ?').get(body.id)); } catch(e) { res.status(500).json({error:e.message}); }});
app.put('/tables/:t/:id', (req, res) => { try { const t = validateTable(req.params.t); const body = {...req.body, id: req.params.id, updated_at: Date.now()}; const cols = Object.keys(body); const vals = toSQLValues(body); if (db.prepare('SELECT id FROM ' + t + ' WHERE id = ?').get(req.params.id)) { db.prepare('UPDATE ' + t + ' SET ' + cols.map(c=>c+' = ?').join(', ') + ' WHERE id = ?').run(...vals, req.params.id); } else { if (!body.created_at) body.created_at = Date.now(); db.prepare('INSERT INTO ' + t + ' (' + cols.join(', ') + ') VALUES (' + cols.map(()=>'?').join(', ') + ')').run(...vals); } res.json(db.prepare('SELECT * FROM ' + t + ' WHERE id = ?').get(req.params.id)); } catch(e) { res.status(500).json({error:e.message}); }});
app.patch('/tables/:t/:id', (req, res) => { try { const t = validateTable(req.params.t); const body = {...req.body, updated_at: Date.now()}; const cols = Object.keys(body); const vals = toSQLValues(body); if (!db.prepare('SELECT id FROM ' + t + ' WHERE id = ?').get(req.params.id)) return res.status(404).json({error:'Not found'}); db.prepare('UPDATE ' + t + ' SET ' + cols.map(c=>c+' = ?').join(', ') + ' WHERE id = ?').run(...vals, req.params.id); res.json(db.prepare('SELECT * FROM ' + t + ' WHERE id = ?').get(req.params.id)); } catch(e) { res.status(500).json({error:e.message}); }});
app.delete('/tables/:t/:id', (req, res) => { try { const t = validateTable(req.params.t); const r = db.prepare('DELETE FROM ' + t + ' WHERE id = ?').run(req.params.id); r.changes > 0 ? res.json({ok:true}) : res.status(404).json({error:'Not found'}); } catch(e) { res.status(500).json({error:e.message}); }});

app.post('/api/kakao/send', (req, res) => { res.json({ok:true, stub:true, message:'카카오 전송 (스텁)'}); });
app.use(express.static(ROOT));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ SQLite 서버 실행 중  →  http://0.0.0.0:' + PORT);
  console.log('   🏠 메인       →  http://localhost:' + PORT + '/');
  console.log('   ⚙️  관리자     →  http://localhost:' + PORT + '/admin/');
  console.log('   📱 고객사     →  http://localhost:' + PORT + '/client/\n');
});
