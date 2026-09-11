/**
 * routes/upload.js — 파일 업로드 API
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

module.exports = function(ROOT) {
  const { Router } = require('express');
  const router = Router();

  const uploadStorage = multer.diskStorage({
    destination: path.join(ROOT, 'data', 'uploads', 'contracts'),
    filename: (req, file, cb) => {
      const contractId = req.params.id || 'temp';
      const dir = path.join(ROOT, 'data', 'uploads', 'contracts', contractId);
      fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(file.originalname);
      // field별 접두사: signed=날인본 / consent=동의서 / contract=계약서(워드·재편집본) / severance=퇴직금 명세서
      const prefix = file.fieldname === 'signed' ? 'signed'
        : file.fieldname === 'contract' ? 'contract'
        : file.fieldname === 'severance' ? 'severance'
        : 'consent';
      // Windows 경로구분자(\\)를 URL 호환 슬래시(/)로 변환해 저장·URL 모두 정상화
      const rel = path.join(contractId, prefix + ext).replace(/\\/g, '/');
      cb(null, rel);
    }
  });
  // 근로계약서 편집본(contract) 필드는 PDF 파일만 허용 (2026-08-27)
  const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'contract') {
      const isPdf = (file.mimetype === 'application/pdf') || /\.pdf$/i.test(file.originalname);
      if (!isPdf) return cb(new Error('최종 편집본은 PDF 파일만 업로드할 수 있습니다.'));
    }
    cb(null, true);
  };
  const upload = multer({ storage: uploadStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });

  router.post('/upload/:id', (req, res) => {
    upload.fields([
      { name: 'signed', maxCount: 1 },
      { name: 'consent', maxCount: 1 },
      { name: 'contract', maxCount: 1 },
      { name: 'severance', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) {
        // 실패 시 이미 디스크에 기록된 파일 정리 (orphan 방지, 2026-09-01)
        try {
          const fields = req.files || {};
          Object.keys(fields).forEach(k => {
            (fields[k] || []).forEach(f => {
              try { fs.unlinkSync(path.join(ROOT, 'data', 'uploads', 'contracts', f.filename)); } catch(_) {}
            });
          });
        } catch(_) {}
        // multer/fileFilter 오류 (contract 필드는 PDF만 허용)
        return res.status(400).json({ ok: false, error: err.message || '업로드 실패' });
      }
      const files = {};
      if (req.files['signed']) files.signed = '/uploads/contracts/' + req.files['signed'][0].filename;
      if (req.files['consent']) files.consent = '/uploads/contracts/' + req.files['consent'][0].filename;
      if (req.files['contract']) files.contract = '/uploads/contracts/' + req.files['contract'][0].filename;
      if (req.files['severance']) files.severance = '/uploads/contracts/' + req.files['severance'][0].filename;
      res.json({ ok: true, files });
    });
  });

  return router;
};
