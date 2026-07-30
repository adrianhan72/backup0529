/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 *
 * v2.38.0 — JWT + 라우트 분리, BaseRepository 기반
 */
require('dotenv').config();
const express = require('express');
const path    = require('path');
const cron    = require('node-cron');
const { DB }  = require('./lib/database');
const { createSolapiClient } = require('./lib/solapi');
const solapi = createSolapiClient();

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── DB ──
const db = new DB(path.join(ROOT, 'data', 'app.db'));

// ── 자동 마이그레이션 (테이블 없으면 생성, 컬럼 없으면 추가) ──
db.run(`CREATE TABLE IF NOT EXISTS kakao_send_logs (
  id TEXT PRIMARY KEY,
  send_type TEXT NOT NULL DEFAULT 'alimtalk',
  template_id TEXT,
  recipient TEXT NOT NULL,
  variables TEXT,
  message_id TEXT,
  group_id TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  related_table TEXT,
  related_id TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER,
  sent_at TEXT
)`);

// contract_expiry_notice.message_id 컬럼 추가 (없으면)
try { db.run(`ALTER TABLE contract_expiry_notice ADD COLUMN message_id TEXT`); } catch(e) { /* 이미 존재함 */ }

// attendance_ledger 테이블 생성 (없으면)
db.run(`CREATE TABLE IF NOT EXISTS attendance_ledger (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  company_id TEXT,
  year INTEGER,
  month_data TEXT,
  total_absent_days REAL DEFAULT 0,
  total_late_count INTEGER DEFAULT 0,
  total_earlyleave_count INTEGER DEFAULT 0,
  note TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  contract_id TEXT,
  status TEXT
)`);

// payrolls 근태 컬럼 추가 (없으면)
try { db.run(`ALTER TABLE payrolls ADD COLUMN absent_dates TEXT`); } catch(e) {}
try { db.run(`ALTER TABLE payrolls ADD COLUMN earlyleave_data TEXT`); } catch(e) {}
try { db.run(`ALTER TABLE payrolls ADD COLUMN late_data TEXT`); } catch(e) {}
try { db.run(`ALTER TABLE payrolls ADD COLUMN absent_data TEXT`); } catch(e) {}

// companies 병가 지급율 컬럼 추가 (없으면)
try { db.run(`ALTER TABLE companies ADD COLUMN sick_leave_pay_rate REAL DEFAULT 0`); } catch(e) {}
try { db.run(`ALTER TABLE companies ADD COLUMN proration_method TEXT DEFAULT '30day_fixed'`); } catch(e) {}

// ── 미들웨어 ──
app.use(require('./middleware/cors')());
app.use(express.json({ limit: '10mb' }));

// ── 라우트 ──
app.use('/api/auth',      require('./routes/auth')(db));
app.use('/api/companies', require('./routes/companies')(db));
app.use('/tables',        require('./routes/tables')(db));

// ── 기타 API ──
app.post('/api/kakao/send', async (req, res) => {
  try {
    const { to, templateId, variables, type, text, from, pfId, reserveTime, relatedTable, relatedId } = req.body;

    let result;
    if (type === 'friendtalk') {
      result = await solapi.sendFriendtalk({ to, text, from, pfId });
    } else if (type === 'sms') {
      result = await solapi.sendSMS({ to, text, from });
    } else {
      // 기본: 알림톡
      result = await solapi.sendAlimtalk({ to, templateId, variables, from, pfId, reserveTime });
    }

    // 발송 성공 로그 저장
    try {
      const logId = 'ksl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      db.run(
        `INSERT INTO kakao_send_logs (id, send_type, template_id, recipient, variables, message_id, group_id, status, related_table, related_id, created_at, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?)`,
        [
          logId,
          type || 'alimtalk',
          templateId || null,
          to,
          variables ? JSON.stringify(variables) : null,
          result.messageId || null,
          result.groupId || null,
          relatedTable || null,
          relatedId || null,
          Date.now(),
          new Date().toISOString(),
        ]
      );
    } catch (logErr) {
      console.error('[KAKAO] 로그 저장 실패:', logErr.message);
    }

    res.json({
      ok: true,
      messageId: result.messageId,
      groupId: result.groupId,
      status: result.status,
    });
  } catch (err) {
    console.error('[KAKAO] 발송 실패:', err.message);

    // 발송 실패 로그 저장
    try {
      const { to, templateId, variables, type, relatedTable, relatedId } = req.body;
      const logId = 'ksl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      db.run(
        `INSERT INTO kakao_send_logs (id, send_type, template_id, recipient, variables, status, error_message, related_table, related_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'failed', ?, ?, ?, ?)`,
        [
          logId,
          type || 'alimtalk',
          templateId || null,
          to,
          variables ? JSON.stringify(variables) : null,
          err.message,
          relatedTable || null,
          relatedId || null,
          Date.now(),
        ]
      );
    } catch (logErr) {
      console.error('[KAKAO] 실패 로그 저장 실패:', logErr.message);
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 파일 업로드 API ──
const multer = require('multer');
const uploadStorage = multer.diskStorage({
  destination: path.join(ROOT, 'data', 'uploads', 'contracts'),
  filename: (req, file, cb) => {
    const contractId = req.params.id || 'temp';
    const dir = path.join(ROOT, 'data', 'uploads', 'contracts', contractId);
    require('fs').mkdirSync(dir, { recursive: true });
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'signed' ? 'signed' : 'consent';
    cb(null, path.join(contractId, prefix + ext));
  }
});
const upload = multer({ storage: uploadStorage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload/:id', upload.fields([
  { name: 'signed', maxCount: 1 },
  { name: 'consent', maxCount: 1 }
]), (req, res) => {
  const files = {};
  if (req.files['signed']) files.signed = '/uploads/contracts/' + req.files['signed'][0].filename;
  if (req.files['consent']) files.consent = '/uploads/contracts/' + req.files['consent'][0].filename;
  res.json({ ok: true, files });
});

// ── PDF 생성 + 링크 발급 API ──
app.post('/api/generate-pdf', (req, res) => {
  const { type, id, html } = req.body;  // type: 'payslip'|'contract'|'consent', id: 식별자, html: HTML 내용
  if (!type || !id) return res.status(400).json({ error: 'type and id required' });
  
  const fs = require('fs');
  const dir = path.join(ROOT, 'data', 'generated', type === 'payslip' ? 'payslips' : 'contracts');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.pdf`);
  const url = `/generated/${type === 'payslip' ? 'payslips' : 'contracts'}/${id}.pdf`;
  
  // TODO: 실제 PDF 생성 (puppeteer 연동 시 HTML → PDF 변환)
  // 현재는 HTML을 텍스트로 저장 (스텁 — puppeteer 연동 시 교체)
  if (html) {
    fs.writeFileSync(filePath, html, 'utf8');
  }
  
  res.json({ ok: true, url, filePath });
});

// ── 정적 파일 ──
const staticOpts = { maxAge: 0, etag: false };
app.use('/admin',   express.static(path.join(ROOT, 'admin'), staticOpts));
app.use('/client',  express.static(path.join(ROOT, 'client'), staticOpts));
app.use('/scripts', express.static(path.join(ROOT, 'scripts'), staticOpts));
app.use('/docs',    express.static(path.join(ROOT, 'docs'), staticOpts));
app.use('/uploads', express.static(path.join(ROOT, 'data', 'uploads'), staticOpts));
app.use('/generated', express.static(path.join(ROOT, 'data', 'generated'), staticOpts));

// ── PDF 열람 게이트웨이 (근로자: 주민번호 / 고객사앱: 접근코드) ──
app.get('/view/:type/:id', (req, res) => {
  const { type, id } = req.params;
  if (!['contracts','payslips'].includes(type)) {
    return res.status(400).send('잘못된 문서 유형입니다.');
  }
  const filePath = path.join(ROOT, 'data', 'generated', type, `${id}.pdf`);
  const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('문서를 찾을 수 없습니다. 관리자에게 문의하세요.');
  }

  // ── 고객사 앱 접근코드 검증 (비밀번호 면제) ──
  const accessCode = (req.query.code || '').trim();
  if (accessCode) {
    try {
      const company = db.companies.findByAccessCode(accessCode);
      if (company) {
        // 문서가 해당 고객사 소속인지 확인
        let belongsToCompany = false;
        if (type === 'contracts') {
          const contract = db.contracts.findById(id);
          if (contract && contract.company_id === company.id) belongsToCompany = true;
        } else if (type === 'payslips') {
          const payslip = db.payrolls.findById(id);
          if (payslip && payslip.company_id === company.id) belongsToCompany = true;
        }
        if (belongsToCompany) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${type}_${id}.pdf"`);
          return res.sendFile(filePath);
        }
      }
    } catch(e) { /* 코드 검증 실패 → 비밀번호 페이지로 진행 */ }
  }

  // ── 근로자용 비밀번호 입력 페이지 ──
  res.send(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>문서 열람 - 인사톡 노무톡</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans KR',sans-serif;background:linear-gradient(135deg,#1e1b4b,#312e81);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#fff;border-radius:16px;padding:40px 32px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center}.icon{width:56px;height:56px;background:#eff6ff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}.icon i{font-size:24px;color:#3b82f6}h2{font-size:16px;color:#1e293b;margin-bottom:8px}p.desc{font-size:13px;color:#64748b;margin-bottom:24px;line-height:1.6}input[type=password]{width:100%;padding:12px 14px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;font-family:monospace;letter-spacing:4px;text-align:center;outline:none;transition:border .15s}input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}.error{color:#ef4444;font-size:12px;margin-top:8px;display:none}button{margin-top:16px;width:100%;padding:12px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .15s}button:hover{background:#4f46e5}button:disabled{background:#a5b4fc;cursor:not-allowed}</style></head>
<body><div class="card">
<div class="icon"><i class="fas fa-lock"></i></div>
<h2>문서 열람을 위해 인증이 필요합니다</h2>
<p class="desc">${type==='contracts'?'근로계약서':'급여명세서'}를 열람하려면<br><strong>주민등록번호 앞 7자리</strong>를 입력해 주세요.</p>
<form onsubmit="return verifyPw(event)" autocomplete="off">
<input type="password" id="pw" placeholder="주민번호 앞 7자리 (예: 900101)" maxlength="7" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
<div class="error" id="err"></div>
<button type="submit" id="btn"><i class="fas fa-check"></i> 확인</button>
</form>
</div>
<script>
async function verifyPw(e){e.preventDefault();const pw=document.getElementById('pw').value.trim();const err=document.getElementById('err');const btn=document.getElementById('btn');err.style.display='none';if(!pw||pw.length!==7||!/^[0-9]{7}$/.test(pw)){err.textContent='주민등록번호 앞 7자리를 정확히 입력해주세요.';err.style.display='block';return}btn.disabled=true;btn.innerHTML='확인 중...';try{const r=await fetch('/api/verify-pdf-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'${type}',id:'${id}',password:pw})});if(!r.ok){const d=await r.json();err.textContent=d.error||'인증에 실패했습니다.';err.style.display='block';btn.disabled=false;btn.innerHTML='<i class="fas fa-check"></i> 확인';return}const blob=await r.blob();const url=URL.createObjectURL(blob);window.location.href=url}catch(ex){err.textContent='서버 연결에 실패했습니다.';err.style.display='block';btn.disabled=false;btn.innerHTML='<i class="fas fa-check"></i> 확인'}}</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"></body></html>`);
});

// ── PDF 접근 검증 API ──
app.post('/api/verify-pdf-access', (req, res) => {
  try {
    const { type, id, password } = req.body;
    if (!type || !id || !password) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }
    if (!['contracts','payslips'].includes(type)) {
      return res.status(400).json({ error: '잘못된 문서 유형입니다.' });
    }
    const filePath = path.join(ROOT, 'data', 'generated', type, `${id}.pdf`);
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // 직원의 주민번호 앞 7자리 조회
    let idNumber = '';
    if (type === 'contracts') {
      // 계약서 ID로 직원 찾기
      const contract = db.contracts.findById(id);
      if (contract && contract.employee_id) {
        const emp = db.employees.findById(contract.employee_id);
        if (emp) idNumber = emp.id_number || '';
      }
    } else if (type === 'payslips') {
      // 급여명세서 ID로 직원 찾기
      const payslip = db.payrolls.findById(id);
      if (payslip && payslip.employee_id) {
        const emp = db.employees.findById(payslip.employee_id);
        if (emp) idNumber = emp.id_number || '';
      }
    }

    const expectedPw = (idNumber || '').replace(/-/g, '').substring(0, 7);
    if (!expectedPw || password !== expectedPw) {
      return res.status(403).json({ error: '주민등록번호가 일치하지 않습니다. 다시 확인해 주세요.' });
    }

    // 인증 성공 → PDF 파일 전송
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${type}_${id}.pdf"`);
    res.sendFile(filePath);
  } catch (e) {
    console.error('[PDF 접근 검증 오류]', e.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// ── 고객사 앱용 PDF 접근 (암호 없이 회사 인증으로 열람) ──
app.post('/api/client-pdf-access', (req, res) => {
  try {
    const { type, id, accessCode } = req.body;
    if (!type || !id || !accessCode) {
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }
    if (!['contracts','payslips'].includes(type)) {
      return res.status(400).json({ error: '잘못된 문서 유형입니다.' });
    }

    // 접근 코드로 회사 조회
    const company = db.companies.findByAccessCode(accessCode);
    if (!company) {
      return res.status(403).json({ error: '유효하지 않은 접근 코드입니다.' });
    }

    // 문서가 해당 회사 소속 직원의 것인지 확인
    let employeeId = '';
    if (type === 'contracts') {
      const contract = db.contracts.findById(id);
      if (contract) employeeId = contract.employee_id || '';
    } else if (type === 'payslips') {
      const payslip = db.payrolls.findById(id);
      if (payslip) employeeId = payslip.employee_id || '';
    }

    if (!employeeId) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    const employee = db.employees.findById(employeeId);
    if (!employee || employee.company_id !== company.id) {
      return res.status(403).json({ error: '해당 문서에 접근할 권한이 없습니다.' });
    }

    // 인증 성공 → PDF 전송
    const fs = require('fs');
    const filePath = path.join(ROOT, 'data', 'generated', type, `${id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${type}_${id}.pdf"`);
    res.sendFile(filePath);
  } catch (e) {
    console.error('[고객사 PDF 접근 오류]', e.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});
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

// ── 예약 발송 고객사 공지 처리 (1분마다) ──
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date().toISOString();
    const rows = db.all(`
      SELECT * FROM company_notices
      WHERE gn_status = 'scheduled'
        AND gn_scheduled_at IS NOT NULL
        AND gn_scheduled_at <= ?
    `, [now]);
    let processed = 0;
    for (const r of rows) {
      db.run(`UPDATE company_notices SET gn_status = 'sent', sent_at = ? WHERE id = ?`, [now, r.id]);
      processed++;
    }
    if (processed > 0) console.log(`[CRON] 예약 공지 처리 완료: ${processed}건 발송`);
  } catch(e) {
    console.error('[CRON] 예약 공지 처리 실패:', e.message);
  }
});

// ── 계약만료 통지 자동발송 (매일 오전 9:00 KST) ──
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] 계약만료 통지 자동발송 시작...');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const targetTypes = ['fixed_term', 'fixed_probation', 'daily', 'regular_probation', 'regular'];
    
    const contracts = db.all(`
      SELECT c.*, e.name AS emp_name, e.phone, e.email, co.company_name
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN companies co ON co.id = c.company_id
      WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
        AND c.contract_type IN (${targetTypes.map(()=>'?').join(',')})
        AND c.contract_end IS NOT NULL
        AND c.contract_start IS NOT NULL
        AND (
          julianday(c.contract_end) - julianday(?) BETWEEN 0 AND 29
          OR julianday(c.contract_end) - julianday(c.contract_start) <= 29
        )
    `, [...targetTypes, today]);

    let sent = 0;
    for (const c of contracts) {
      // 오늘 이미 발송했는지 확인
      const already = db.get(`
        SELECT id FROM contract_expiry_notice
        WHERE contract_id = ? AND date(noticed_at) = ?
      `, [c.id, today]);
      if (already) continue;

      const now = new Date().toISOString();
      const daysLeft = Math.ceil((new Date(c.contract_end) - new Date(today)) / (1000*60*60*24));
      
      // 카카오 알림톡 발송 (전화번호 있으면)
      if (c.phone && c.phone.trim()) {
        const noticeId = generateId();
        db.run(`INSERT INTO contract_expiry_notice (id, contract_id, employee_id, employee_name, company_id, company_name, contract_type, contract_end, days_until_expiry, notice_method, notice_status, recipient, noticed_at, note)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          noticeId, c.id, c.employee_id, c.emp_name, c.company_id, c.company_name, c.contract_type, c.contract_end,
          daysLeft, 'kakao', 'completed', c.phone, now, '시스템 자동발송 (매일 9시)'
        ]);

        // 실제 알림톡 발송 (솔라피 API)
        try {
          const result = await solapi.sendAlimtalk({
            to: c.phone,
            templateId: 'CONTRACT_EXPIRY_001',
            variables: {
              '#{name}': c.emp_name,
              '#{company}': c.company_name,
              '#{date}': c.contract_end,
              '#{days}': String(daysLeft),
            },
          });
          // 발송 성공 시 message_id 업데이트
          db.run(`UPDATE contract_expiry_notice SET message_id = ? WHERE id = ?`,
            [result.messageId || null, noticeId]);
        } catch (err) {
          console.error(`[CRON] 계약만료 알림톡 발송 실패 (${c.emp_name}):`, err.message);
          // 실패해도 DB 기록은 유지 → 추후 재시도 가능
        }
        sent++;
      }
      // 이메일 발송 (이메일 있으면)
      if (c.email && c.email.trim()) {
        db.run(`INSERT INTO contract_expiry_notice (id, contract_id, employee_id, employee_name, company_id, company_name, contract_type, contract_end, days_until_expiry, notice_method, notice_status, recipient, noticed_at, note)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          generateId(), c.id, c.employee_id, c.emp_name, c.company_id, c.company_name, c.contract_type, c.contract_end,
          daysLeft, 'email', 'completed', c.email, now, '시스템 자동발송 (매일 9시)'
        ]);
        sent++;
      }
    }
    console.log(`[CRON] 계약만료 통지 완료: ${contracts.length}건 대상, ${sent}건 발송`);
  } catch(e) {
    console.error('[CRON] 계약만료 통지 실패:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ── 정규직 전환 안내 자동발송 (매일 오전 9:00 KST, 고객사 앱 only) ──
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] 정규직 전환 안내 자동발송 시작...');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const TWO_YEARS_DAYS = 730;
    const NOTICE_BEFORE  = 30;  // 730일 30일 전부터 사전 고지

    // 대표 연락처 정보 조회
    const contact = db.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};
    const contactFoot = `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n● 전화: ${contact.phone || '02)3487-8841'}\n● 이메일: ${contact.email || 'eunyangpark@naver.com'}\n● 팩스: ${contact.fax || '02)3487-8882'}`;

    // 계약직·계약직 수습·정규직 수습·일용직 계약의 누적 기간 계산 (최초 입사일 기준)
    // 조건: 누적 700일 이상 AND 계약 종료일까지 730일 이상
    const rows = db.all(`
      SELECT c.employee_id, e.name AS emp_name, c.company_id, co.company_name, co.phone AS company_phone,
             MIN(c.contract_start) AS first_start,
             MAX(c.contract_end) AS last_end,
             CAST(julianday(?) - julianday(MIN(c.contract_start)) AS INTEGER) AS total_days,
             CAST(julianday(COALESCE(MAX(c.contract_end), date('9999-12-31'))) - julianday(MIN(c.contract_start)) AS INTEGER) AS days_to_end
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN companies co ON co.id = c.company_id
      WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
        AND c.contract_type IN ('fixed_term', 'fixed_probation', 'daily', 'regular_probation')
        AND c.contract_start IS NOT NULL
        AND c.status NOT IN ('voided')
      GROUP BY c.employee_id
      HAVING total_days >= ?
         AND days_to_end >= ?
    `, [today, TWO_YEARS_DAYS - NOTICE_BEFORE, TWO_YEARS_DAYS]);

    const now = new Date().toISOString();
    let sent = 0;

    for (const r of rows) {
      // 오늘 이미 발송했는지 확인 (같은 직원, 같은 알림유형, 오늘)
      const already = db.get(`
        SELECT id FROM company_notices
        WHERE employee_id = ? AND notice_type = 'regular_conversion'
          AND date(sent_at) = ?
      `, [r.employee_id, today]);
      if (already) continue;

      const y = Math.floor(r.total_days / 365);
      const m = Math.floor((r.total_days % 365) / 30);
      const durationStr = (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${r.total_days}일)`;
      const isExceeded = r.total_days > TWO_YEARS_DAYS; // 이미 730일 초과

      const title = isExceeded
        ? `[정규직 전환 의무] ${r.emp_name} — 기간제 2년 초과 (${durationStr})`
        : `[정규직 전환 사전 고지] ${r.emp_name} — 2년 도달 30일 전 (${durationStr})`;

      const bodyIntro = isExceeded
        ? `소속 직원의 기간제 근로 누적 기간이 2년(730일)을 초과하여 법률에 따른 정규직 전환 의무가 발생하였음을 안내드립니다.`
        : `소속 직원의 기간제 근로 누적 기간이 2년(730일) 도달 30일 전입니다. 정규직 전환 의무 발생에 대비해 미리 준비해 주세요.`;

      const bodyFooter = isExceeded
        ? `※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 위반 발생 고지로 해당 근로자에게는 통보되지 않습니다.`
        : `※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 사전 고지로 해당 근로자에게는 통보되지 않습니다.`;

      const body =
`안녕하세요, ${r.company_name} 사장님.

${bodyIntro}

■ 직원명: ${r.emp_name}
■ 입사일: ${r.first_start || '-'}
■ 누적 근로일수: ${durationStr}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요.

${bodyFooter}

${contactFoot}`;

      const noticeId = generateId();
      db.run(`INSERT INTO company_notices (id, company_id, company_name, notice_type, title, body, contract_id, employee_id, employee_name, contract_end, days_until_expiry, sent_at, sent_by, is_read, read_at, gn_status, gn_scheduled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        noticeId, r.company_id, r.company_name, 'regular_conversion', title, body,
        '', r.employee_id, r.emp_name, '', 0, now, null, 0, '', 'sent', ''
      ]);

      // 실제 알림톡 발송 (고객사 사장님 전화번호 있으면)
      if (r.company_phone && r.company_phone.trim()) {
        try {
          await solapi.sendAlimtalk({
            to: r.company_phone,
            templateId: 'REGULAR_CONVERSION_001',
            variables: {
              '#{name}': r.emp_name,
              '#{company}': r.company_name,
              '#{duration}': durationStr,
            },
          });
        } catch (err) {
          console.error(`[CRON] 정규직 전환 알림톡 발송 실패 (${r.company_name}):`, err.message);
        }
      }
      sent++;
    }
    console.log(`[CRON] 정규직 전환 안내 완료: ${rows.length}건 대상, ${sent}건 발송`);
  } catch(e) {
    console.error('[CRON] 정규직 전환 안내 실패:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ── 정규직 전환 안내 주간 재발송 (매주 월요일 오전 9:00 KST) ──
// 이미 730일을 초과한 근로자 중 정규직 계약이 등록되지 않은 경우 재안내
cron.schedule('0 9 * * 1', async () => {
  console.log('[CRON] 정규직 전환 주간 재발송 시작...');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const TWO_YEARS_DAYS = 730;

    // 대표 연락처 정보 조회
    const contactW = db.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};
    const contactFootW = `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n● 전화: ${contactW.phone || '02)3487-8841'}\n● 이메일: ${contactW.email || 'eunyangpark@naver.com'}\n● 팩스: ${contactW.fax || '02)3487-8882'}`;

    // 이미 730일 초과 + 정규직 계약 없는 근로자
    const rows = db.all(`
      SELECT c.employee_id, e.name AS emp_name, c.company_id, co.company_name, co.phone AS company_phone,
             MIN(c.contract_start) AS first_start,
             CAST(julianday(?) - julianday(MIN(c.contract_start)) AS INTEGER) AS total_days
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN companies co ON co.id = c.company_id
      WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
        AND c.contract_type IN ('fixed_term', 'fixed_probation', 'daily', 'regular_probation')
        AND c.contract_start IS NOT NULL
        AND c.status NOT IN ('voided')
      GROUP BY c.employee_id
      HAVING total_days > ?
    `, [today, TWO_YEARS_DAYS]);

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let resent = 0;

    for (const r of rows) {
      // 이미 정규직 계약이 등록되어 있는지 확인
      const hasRegular = db.get(`
        SELECT id FROM contracts
        WHERE employee_id = ? AND contract_type = 'regular'
          AND is_draft = 0 AND is_voided_by_amend = 0
          AND status NOT IN ('voided')
        LIMIT 1
      `, [r.employee_id]);
      if (hasRegular) continue; // 정규직 전환 완료 → 건너뜀

      // 최근 7일 이내에 이미 발송했는지 확인
      const recentlySent = db.get(`
        SELECT id FROM company_notices
        WHERE employee_id = ? AND notice_type = 'regular_conversion'
          AND sent_at >= ?
        LIMIT 1
      `, [r.employee_id, sevenDaysAgo]);
      if (recentlySent) continue; // 최근 발송 이력 있음 → 건너뜀

      const y = Math.floor(r.total_days / 365);
      const m = Math.floor((r.total_days % 365) / 30);
      const durationStr = (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${r.total_days}일)`;

      const title = `[재안내] 정규직 전환 의무 — ${r.emp_name} (누적 ${durationStr})`;
      const body =
`안녕하세요, ${r.company_name} 사장님.

소속 직원의 기간제 근로 누적 기간이 2년(730일)을 초과하였으나, 아직 정규직 근로계약이 등록되지 않아 재안내드립니다.

■ 직원명: ${r.emp_name}
■ 입사일: ${r.first_start || '-'}
■ 누적 근로일수: ${durationStr}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
아직 정규직 근로계약서가 등록되지 않았습니다. 담당 노무사에게 정규직 근로계약서 작성을 요청해 주세요.

※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 위반 발생 고지로 해당 근로자에게는 통보되지 않습니다.
※ 정규직 계약이 이미 등록된 경우 이 메시지를 무시하셔도 됩니다.

${contactFootW}`;

      const noticeIdW = generateId();
      db.run(`INSERT INTO company_notices (id, company_id, company_name, notice_type, title, body, contract_id, employee_id, employee_name, contract_end, days_until_expiry, sent_at, sent_by, is_read, read_at, gn_status, gn_scheduled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        noticeIdW, r.company_id, r.company_name, 'regular_conversion', title, body,
        '', r.employee_id, r.emp_name, '', 0, now, null, 0, '', 'sent', ''
      ]);

      // 실제 알림톡 발송 (고객사 사장님 전화번호 있으면)
      if (r.company_phone && r.company_phone.trim()) {
        try {
          await solapi.sendAlimtalk({
            to: r.company_phone,
            templateId: 'REGULAR_CONVERSION_001',
            variables: {
              '#{name}': r.emp_name,
              '#{company}': r.company_name,
              '#{duration}': durationStr,
            },
          });
        } catch (err) {
          console.error(`[CRON] 정규직 전환 재발송 알림톡 실패 (${r.company_name}):`, err.message);
        }
      }
      resent++;
    }
    console.log(`[CRON] 정규직 전환 주간 재발송 완료: ${rows.length}건 확인, ${resent}건 재발송`);
  } catch(e) {
    console.error('[CRON] 정규직 전환 주간 재발송 실패:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ── 수습만료 통지 자동발송 (매일 오전 9:00 KST, 고객사 앱 only) ──
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] 수습만료 통지 자동발송 시작...');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const NOTICE_DAYS = 30; // 수습만료 30일 전부터 통지

    // 대표 연락처 정보 조회
    const contactP = db.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};
    const contactFootP = `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n● 전화: ${contactP.phone || '02)3487-8841'}\n● 이메일: ${contactP.email || 'eunyangpark@naver.com'}\n● 팩스: ${contactP.fax || '02)3487-8882'}`;

    // 수습 계약 중 수습기간 3개월 초과, 만료일 30일 이내인 건 조회
    // probation_end_date 우선, 없으면 contract_start + probation_months(기본3)으로 계산
    const rows = db.all(`
      SELECT c.*, e.name AS emp_name, co.company_name, co.phone AS company_phone,
             COALESCE(c.probation_end_date, date(c.contract_start, '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')) AS prob_end
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN companies co ON co.id = c.company_id
      WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
        AND c.contract_type IN ('regular_probation', 'fixed_probation')
        AND c.contract_start IS NOT NULL
        AND c.status NOT IN ('voided', 'terminated', 'expired')
        AND COALESCE(c.probation_months, 3) > 3
        AND COALESCE(c.probation_end_date, date(c.contract_start, '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')) >= ?
        AND COALESCE(c.probation_end_date, date(c.contract_start, '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')) <= date(?, '+' || ? || ' days')
    `, [today, today, NOTICE_DAYS]);

    const now = new Date().toISOString();
    let sent = 0;

    for (const c of rows) {
      // 오늘 이미 발송했는지 확인 (같은 계약, 같은 알림유형, 오늘)
      const already = db.get(`
        SELECT id FROM company_notices
        WHERE contract_id = ? AND notice_type = 'probation_expiry'
          AND date(sent_at) = ?
      `, [c.id, today]);
      if (already) continue;

      const probMonths = c.probation_months || 3;
      const daysLeft = Math.ceil((new Date(c.prob_end) - new Date(today)) / (1000 * 60 * 60 * 24));
      const ddayStr = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
      const probEndKr = c.prob_end ? c.prob_end.replace(/-/g, '.') : '-';

      const title = `[수습만료 예정] ${c.emp_name} — 수습기간 ${probMonths}개월 (${ddayStr})`;
      const body =
`안녕하세요, ${c.company_name} 사장님.

소속 직원의 수습기간 만료일이 다가와 안내드립니다.

■ 직원명: ${c.emp_name}
■ 고용형태: ${c.contract_type === 'regular_probation' ? '정규직 수습' : '계약직 수습'}
■ 수습기간: ${probMonths}개월
■ 수습 만료일: ${probEndKr} (${ddayStr})

◆ 중요 안내
수습기간이 3개월을 초과하는 근로자의 경우, 해고 시 「근로기준법」에 따른 해고예고(30일 전 서면통지) 의무가 발생합니다.
만료 30일 전까지 본채용 여부를 결정하시어 담당 노무사에게 알려주시기 바랍니다.

※ 본 안내는 대화인사노무파트너스에서 발송한 법적 의무 안내입니다.

${contactFootP}`;

      const noticeIdP = generateId();
      db.run(`INSERT INTO company_notices (id, company_id, company_name, notice_type, title, body, contract_id, employee_id, employee_name, contract_end, days_until_expiry, sent_at, sent_by, is_read, read_at, gn_status, gn_scheduled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        noticeIdP, c.company_id, c.company_name, 'probation_expiry', title, body,
        c.id, c.employee_id, c.emp_name, c.prob_end, daysLeft, now, null, 0, '', 'sent', ''
      ]);

      // 실제 알림톡 발송 (고객사 사장님 전화번호 있으면)
      if (c.company_phone && c.company_phone.trim()) {
        try {
          await solapi.sendAlimtalk({
            to: c.company_phone,
            templateId: 'PROBATION_EXPIRY_001',
            variables: {
              '#{name}': c.emp_name,
              '#{company}': c.company_name,
              '#{date}': c.prob_end,
              '#{days}': String(daysLeft),
            },
          });
        } catch (err) {
          console.error(`[CRON] 수습만료 알림톡 발송 실패 (${c.emp_name}):`, err.message);
        }
      }
      sent++;
    }
    console.log(`[CRON] 수습만료 통지 완료: ${rows.length}건 대상, ${sent}건 발송`);
  } catch(e) {
    console.error('[CRON] 수습만료 통지 실패:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ── 카카오 발송 실패 건 자동 재시도 (10분마다) ──
cron.schedule('*/10 * * * *', async () => {
  try {
    const MAX_RETRY = 3;
    const failedRows = db.all(`
      SELECT * FROM kakao_send_logs
      WHERE status = 'failed' AND retry_count < ?
      ORDER BY created_at ASC
      LIMIT 50
    `, [MAX_RETRY]);

    for (const log of failedRows) {
      try {
        const variables = log.variables ? JSON.parse(log.variables) : {};
        let result;
        if (log.send_type === 'friendtalk') {
          result = await solapi.sendFriendtalk({ to: log.recipient, text: variables?.message || '', pfId: process.env.SOLAPI_KAKAO_PF_ID || '' });
        } else if (log.send_type === 'sms') {
          result = await solapi.sendSMS({ to: log.recipient, text: variables?.message || '' });
        } else {
          result = await solapi.sendAlimtalk({ to: log.recipient, templateId: log.template_id, variables });
        }

        db.run(
          `UPDATE kakao_send_logs SET status = 'sent', message_id = ?, sent_at = ?, retry_count = retry_count + 1 WHERE id = ?`,
          [result.messageId || null, new Date().toISOString(), log.id]
        );
        console.log(`[CRON] 카카오 재시도 성공: ${log.id} → ${log.recipient}`);
      } catch (err) {
        db.run(
          `UPDATE kakao_send_logs SET error_message = ?, retry_count = retry_count + 1 WHERE id = ?`,
          [err.message, log.id]
        );
        console.error(`[CRON] 카카오 재시도 실패 (${log.id}):`, err.message);
      }
    }
  } catch (e) {
    console.error('[CRON] 카카오 재시도 크론잡 오류:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

function generateId() {
  return 'cn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}
