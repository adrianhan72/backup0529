/**
 * routes/pdf.js — PDF 생성 / 열람 게이트웨이 / 접근 검증 API
 */
const path = require('path');
const fs   = require('fs');

/** 근로자용 비밀번호 입력 페이지 HTML (inline) */
function pwPageHTML(type) {
  const label = type === 'contracts' ? '근로계약서' : '급여명세서';
  return [
    '<!DOCTYPE html><html lang="ko"><head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
    '<title>문서 열람 - 인사톡 노무톡</title>',
    '<style>',
    '*{margin:0;padding:0;box-sizing:border-box}',
    'body{font-family:\'Noto Sans KR\',sans-serif;',
    'background:linear-gradient(135deg,#1e1b4b,#312e81);',
    'min-height:100vh;display:flex;align-items:center;',
    'justify-content:center;padding:20px}',
    '.card{background:#fff;border-radius:16px;padding:40px 32px;',
    'max-width:420px;width:100%;',
    'box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center}',
    '.icon{width:56px;height:56px;background:#eff6ff;',
    'border-radius:50%;display:flex;align-items:center;',
    'justify-content:center;margin:0 auto 16px}',
    '.icon i{font-size:24px;color:#3b82f6}',
    'h2{font-size:16px;color:#1e293b;margin-bottom:8px}',
    'p.desc{font-size:13px;color:#64748b;margin-bottom:24px;',
    'line-height:1.6}',
    'input[type=password]{width:100%;padding:12px 14px;',
    'border:1.5px solid #d1d5db;border-radius:10px;font-size:15px;',
    'font-family:monospace;letter-spacing:4px;text-align:center;',
    'outline:none;transition:border .15s}',
    'input:focus{border-color:#6366f1;',
    'box-shadow:0 0 0 3px rgba(99,102,241,.15)}',
    '.error{color:#ef4444;font-size:12px;margin-top:8px;display:none}',
    'button{margin-top:16px;width:100%;padding:12px;',
    'background:#6366f1;color:#fff;border:none;border-radius:10px;',
    'font-size:14px;font-weight:700;cursor:pointer;',
    'font-family:inherit;transition:background .15s}',
    'button:hover{background:#4f46e5}',
    'button:disabled{background:#a5b4fc;cursor:not-allowed}',
    '</style></head><body><div class="card">',
    '<div class="icon"><i class="fas fa-lock"></i></div>',
    '<h2>문서 열람을 위해 인증이 필요합니다</h2>',
    '<p class="desc">', label, '를 열람하려면<br>',
    '<strong>주민등록번호 앞 7자리</strong>를 입력해 주세요.</p>',
    '<form onsubmit="return verifyPw(event)" autocomplete="off">',
    '<input type="password" id="pw" ',
    'placeholder="주민번호 앞 7자리 (예: 900101)" ',
    'maxlength="7" inputmode="numeric" pattern="[0-9]*" ',
    'autocomplete="off" />',
    '<div class="error" id="err"></div>',
    '<button type="submit" id="btn">',
    '<i class="fas fa-check"></i> 확인</button>',
    '</form></div><script>',
    'async function verifyPw(e){e.preventDefault();',
    'const pw=document.getElementById(\'pw\').value.trim();',
    'const err=document.getElementById(\'err\');',
    'const btn=document.getElementById(\'btn\');',
    'err.style.display=\'none\';',
    'if(!pw||pw.length!==7||!/^[0-9]{7}$/.test(pw)){',
    'err.textContent=\'주민등록번호 앞 7자리를 정확히 입력해주세요.\';',
    'err.style.display=\'block\';return}',
    'btn.disabled=true;btn.innerHTML=\'확인 중...\';',
    'try{const r=await fetch(\'/api/verify-pdf-access\',',
    '{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},',
    'body:JSON.stringify({type:\'', type, '\',id:\'', id,
    '\',password:pw})});',
    'if(!r.ok){const d=await r.json();',
    'err.textContent=d.error||\'인증에 실패했습니다.\';',
    'err.style.display=\'block\';btn.disabled=false;',
    'btn.innerHTML=\'<i class="fas fa-check"></i> 확인\';return}',
    'const blob=await r.blob();',
    'const url=URL.createObjectURL(blob);',
    'window.location.href=url}catch(ex){',
    'err.textContent=\'서버 연결에 실패했습니다.\';',
    'err.style.display=\'block\';btn.disabled=false;',
    'btn.innerHTML=\'<i class="fas fa-check"></i> 확인\'}}',
    '</script>',
    '<link rel="stylesheet" ',
    'href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">',
    '</body></html>',
  ].join('');
}

module.exports = function(db, ROOT) {
  const { Router } = require('express');
  const router = Router();

  // PDF 생성 + 링크 발급
  router.post('/generate-pdf', (req, res) => {    const { type, id, html } = req.body;
    if (!type || !id) return res.status(400).json({ error: 'type and id required' });

    const dir = path.join(ROOT, 'data', 'generated', type === 'payslip' ? 'payslips' : 'contracts');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${id}.pdf`);
    const url = `/generated/${type === 'payslip' ? 'payslips' : 'contracts'}/${id}.pdf`;

    if (html) {
      fs.writeFileSync(filePath, html, 'utf8');
    }

    res.json({ ok: true, url, filePath });
  });

  // ── 계약서 HTML → DOCX 변환 (재편집용 워드) ──
  // body: { html, filename } — 화면에 보이는 계약서 HTML을 docx로 변환해 다운로드
  // 클라이언트(contract-docs.js _inlineDocStylesForWord)가 getComputedStyle 기반으로
  // 전 요소를 인라인 스타일화한 HTML을 보내면, lib/contract-docx.js가 이를 파싱해
  // 화면 디자인 그대로 Word에 재현한다 (2026-09-02 전면 개편).
  router.post('/contract-docx', async (req, res) => {
    try {
      const { html, filename } = req.body || {};
      if (!html || typeof html !== 'string') {
        return res.status(400).json({ error: 'html required' });
      }
      const { buildContractDocx } = require('../lib/contract-docx');
      const docxBuffer = await buildContractDocx(html);
      const safeName = String(filename || '근로계약서').replace(/[\\/:*?"<>|]/g, '_');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName + '.docx')}`);
      res.send(docxBuffer);
    } catch (e) {
      console.error('[계약서 DOCX 변환 오류]', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // PDF 열람 게이트웨이
  router.get('/view/:type/:id', (req, res) => {
    const { type, id } = req.params;
    if (!['contracts', 'payslips'].includes(type)) {
      return res.status(400).send('잘못된 문서 유형입니다.');
    }
    const filePath = path.join(ROOT, 'data', 'generated', type, `${id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('문서를 찾을 수 없습니다. 관리자에게 문의하세요.');
    }

    // 고객사 앱 접근코드 검증
    const accessCode = (req.query.code || '').trim();
    if (accessCode) {
      try {
        const company = db.companies.findByAccessCode(accessCode);
        if (company) {
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
      } catch (e) { /* 코드 검증 실패 → 비밀번호 페이지로 진행 */ }
    }

    // 근로자용 비밀번호 입력 페이지
    res.send(pwPageHTML(type));
  });

  // ── 임금대장 HTML 열람 (고객사 앱 접근코드 검증) ──
  router.get('/view-wage-ledger/:companyId/:year/:month', (req, res) => {
    const { companyId, year, month } = req.params;
    const accessCode = (req.query.code || '').trim();

    if (!accessCode) {
      return res.status(403).send(`
        <!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>접근 제한</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;color:#64748b;text-align:center}</style>
        </head><body><div><h2>🔒 접근이 제한된 문서입니다</h2><p>고객사 앱에서 로그인 후 접근해 주세요.</p></div></body></html>`);
    }

    try {
      const company = db.companies.findByAccessCode(accessCode);
      if (!company || company.id !== companyId) {
        return res.status(403).send('<h2>🔒 접근 권한이 없습니다</h2>');
      }
    } catch (e) {
      return res.status(403).send('<h2>🔒 인증 오류</h2>');
    }

    // wage_ledger_notifications에서 파일 경로 조회
    const notif = db.get(
      'SELECT * FROM wage_ledger_notifications WHERE company_id = ? AND year = ? AND month = ? LIMIT 1',
      [companyId, Number(year), Number(month)]
    );
    if (!notif || !notif.file_html_path) {
      return res.status(404).send('<h2>📋 아직 생성된 임금대장이 없습니다</h2>');
    }

    const filePath = path.join(ROOT, notif.file_html_path.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('<h2>📋 임금대장 파일을 찾을 수 없습니다</h2>');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(filePath);
  });

  // PDF 접근 검증
  router.post('/verify-pdf-access', (req, res) => {
    try {
      const { type, id, password } = req.body;
      if (!type || !id || !password) {
        return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
      }
      if (!['contracts', 'payslips'].includes(type)) {
        return res.status(400).json({ error: '잘못된 문서 유형입니다.' });
      }
      const filePath = path.join(ROOT, 'data', 'generated', type, `${id}.pdf`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
      }

      let idNumber = '';
      if (type === 'contracts') {
        const contract = db.contracts.findById(id);
        if (contract && contract.employee_id) {
          const emp = db.employees.findById(contract.employee_id);
          if (emp) idNumber = emp.id_number || '';
        }
      } else if (type === 'payslips') {
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

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${type}_${id}.pdf"`);
      res.sendFile(filePath);
    } catch (e) {
      console.error('[PDF 접근 검증 오류]', e.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  });

  // 고객사 앱용 PDF 접근
  router.post('/client-pdf-access', (req, res) => {
    try {
      const { type, id, accessCode } = req.body;
      if (!type || !id || !accessCode) {
        return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
      }
      if (!['contracts', 'payslips'].includes(type)) {
        return res.status(400).json({ error: '잘못된 문서 유형입니다.' });
      }

      const company = db.companies.findByAccessCode(accessCode);
      if (!company) {
        return res.status(403).json({ error: '유효하지 않은 접근 코드입니다.' });
      }

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

  return router;
};
