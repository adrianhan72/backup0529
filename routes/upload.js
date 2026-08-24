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
      // field별 접두사: signed=날인본 / consent=동의서 / contract=계약서(워드·재편집본)
      const prefix = file.fieldname === 'signed' ? 'signed'
        : file.fieldname === 'contract' ? 'contract'
        : 'consent';
      // Windows 경로구분자(\\)를 URL 호환 슬래시(/)로 변환해 저장·URL 모두 정상화
      const rel = path.join(contractId, prefix + ext).replace(/\\/g, '/');
      cb(null, rel);
    }
  });
  const upload = multer({ storage: uploadStorage, limits: { fileSize: 10 * 1024 * 1024 } });

  router.post('/upload/:id', upload.fields([
    { name: 'signed', maxCount: 1 },
    { name: 'consent', maxCount: 1 },
    { name: 'contract', maxCount: 1 }
  ]), (req, res) => {
    const files = {};
    if (req.files['signed']) files.signed = '/uploads/contracts/' + req.files['signed'][0].filename;
    if (req.files['consent']) files.consent = '/uploads/contracts/' + req.files['consent'][0].filename;
    if (req.files['contract']) files.contract = '/uploads/contracts/' + req.files['contract'][0].filename;
    res.json({ ok: true, files });
  });

  return router;
};
