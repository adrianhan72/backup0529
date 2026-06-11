/**
 * 인사톡 노무톡 - Express 서버 (대화인사노무파트너스)
 *
 * [앱 API]
 *   GET/POST   /tables/:table
 *   GET/PUT/DELETE /tables/:table/:id
 *   POST       /api/kakao/send
 *
 * [정적]
 *   /*         → 프로젝트 파일 서빙
 */

const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const { v4: uuidv4 } = require('uuid');

const app     = express();
const PORT    = 3000;
const ROOT    = __dirname;
const DB_FILE = path.join(ROOT, 'data', 'db.json');

// ─── 미들웨어 ────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── DB 유틸 ─────────────────────────────────────────────
function readDB()    { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }

const TABLE_ALIAS = { billings: 'billing', contract_expiry_notices: 'contract_expiry_notice', company_histories: 'company_history' };
function resolveTable(n) { return TABLE_ALIAS[n] || n; }
function getTable(db, n) { const k = resolveTable(n); if (!db[k]) db[k] = []; return db[k]; }

function applyQuery(records, q) {
  let r = [...records];
  Object.entries(q).forEach(([k, v]) => {
    if (['limit','page','sort','order'].includes(k)) return;
    r = r.filter(x => String(x[k]) === String(v));
  });
  if (q.sort) {
    const f = q.sort, o = q.order === 'asc' ? 1 : -1;
    r.sort((a, b) => a[f] == null ? 1 : b[f] == null ? -1 : a[f] > b[f] ? o : -o);
  }
  const total = r.length;
  const limit = parseInt(q.limit) || 200;
  const page  = parseInt(q.page)  || 1;
  r = r.slice((page-1)*limit, page*limit);
  return { data: r, total, page, limit };
}

// ─── Tables REST ──────────────────────────────────────────
app.get('/tables/:t',     (req,res) => { try { const db=readDB(); res.json(applyQuery(getTable(db,req.params.t), req.query)); } catch(e){ res.status(500).json({error:e.message}); }});
app.get('/tables/:t/:id', (req,res) => { try { const db=readDB(); const row=getTable(db,req.params.t).find(r=>String(r.id)===req.params.id); row ? res.json(row) : res.status(404).json({error:'Not found'}); } catch(e){ res.status(500).json({error:e.message}); }});
app.post('/tables/:t',    (req,res) => { try { const db=readDB(),k=resolveTable(req.params.t); if(!db[k])db[k]=[]; const now=Date.now(),rec={...req.body,id:req.body.id||uuidv4(),created_at:req.body.created_at||now,updated_at:now}; db[k].push(rec); writeDB(db); res.status(201).json(rec); } catch(e){ res.status(500).json({error:e.message}); }});
app.put('/tables/:t/:id', (req,res) => { try { const db=readDB(),k=resolveTable(req.params.t); if(!db[k])db[k]=[]; const i=db[k].findIndex(r=>String(r.id)===req.params.id); if(i===-1){ const rec={...req.body,id:req.params.id,updated_at:Date.now()}; db[k].push(rec); writeDB(db); return res.json(rec); } db[k][i]={...db[k][i],...req.body,updated_at:Date.now()}; writeDB(db); res.json(db[k][i]); } catch(e){ res.status(500).json({error:e.message}); }});
app.patch('/tables/:t/:id', (req,res) => { try { const db=readDB(),k=resolveTable(req.params.t); if(!db[k])db[k]=[]; const i=db[k].findIndex(r=>String(r.id)===req.params.id); if(i===-1) return res.status(404).json({error:'Not found'}); db[k][i]={...db[k][i],...req.body,updated_at:Date.now()}; writeDB(db); res.json(db[k][i]); } catch(e){ res.status(500).json({error:e.message}); }});
app.delete('/tables/:t/:id',(req,res)=>{ try { const db=readDB(),k=resolveTable(req.params.t); if(!db[k])return res.status(404).json({error:'Table not found'}); const b=db[k].length; db[k]=db[k].filter(r=>String(r.id)!==req.params.id); if(db[k].length===b)return res.status(404).json({error:'Not found'}); writeDB(db); res.json({ok:true}); } catch(e){ res.status(500).json({error:e.message}); }});

// ─── Kakao 스텁 ───────────────────────────────────────────
app.post('/api/kakao/send', (req,res) => {
  res.json({ ok:true, stub:true, message:'카카오 전송 (스텁)' });
});

// ─── 정적 파일 ───────────────────────────────────────────
app.use(express.static(ROOT));
app.get('*', (req,res) => res.sendFile(path.join(ROOT,'index.html')));

// ─── 서버 시작 ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ 서버 실행 중  →  http://0.0.0.0:${PORT}`);
  console.log(`   🏠 메인       →  http://localhost:${PORT}/`);
  console.log(`   ⚙️  관리자     →  http://localhost:${PORT}/admin/`);
  console.log(`   📱 고객사     →  http://localhost:${PORT}/client/\n`);
});
