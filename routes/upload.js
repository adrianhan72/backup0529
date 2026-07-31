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
      const prefix = file.fieldname === 'signed' ? 'signed' : 'consent';
      cb(null, path.join(contractId, prefix + ext));
    }
  });
  const upload = multer({ storage: uploadStorage, limits: { fileSize: 10 * 1024 * 1024 } });

  router.post('/upload/:id', upload.fields([
    { name: 'signed', maxCount: 1 },
    { name: 'consent', maxCount: 1 }
  ]), (req, res) => {
    const files = {};
    if (req.files['signed']) files.signed = '/uploads/contracts/' + req.files['signed'][0].filename;
    if (req.files['consent']) files.consent = '/uploads/contracts/' + req.files['consent'][0].filename;
    res.json({ ok: true, files });
  });

  return router;
};
