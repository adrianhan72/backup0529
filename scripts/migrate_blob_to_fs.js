// BLOB → 파일시스템 마이그레이션
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./data/app.db');
const uploadsDir = path.join(__dirname, 'data', 'uploads', 'contracts');
fs.mkdirSync(uploadsDir, { recursive: true });

let migrated = 0;

// ── signed_file_data → data/uploads/contracts/{id}/signed.ext ──
const signedFiles = db.prepare(`SELECT id, signed_file_name, signed_file_data FROM contracts WHERE signed_file_data IS NOT NULL AND signed_file_data != ''`).all();
for (const row of signedFiles) {
  const ext = path.extname(row.signed_file_name || '.bin') || '.bin';
  const dir = path.join(uploadsDir, row.id);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'signed' + ext);
  const data = Buffer.from(row.signed_file_data, 'base64').toString('utf8') === row.signed_file_data 
    ? Buffer.from(row.signed_file_data, 'utf8') 
    : Buffer.from(row.signed_file_data, 'base64');
  fs.writeFileSync(filePath, data);
  migrated++;
}

// ── consent_file_data → data/uploads/contracts/{id}/consent.ext ──
const consentFiles = db.prepare(`SELECT id, consent_file_name, consent_file_data FROM contracts WHERE consent_file_data IS NOT NULL AND consent_file_data != ''`).all();
for (const row of consentFiles) {
  const ext = path.extname(row.consent_file_name || '.bin') || '.bin';
  const dir = path.join(uploadsDir, row.id);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'consent' + ext);
  const data = Buffer.from(row.consent_file_data, 'base64').toString('utf8') === row.consent_file_data
    ? Buffer.from(row.consent_file_data, 'utf8')
    : Buffer.from(row.consent_file_data, 'base64');
  fs.writeFileSync(filePath, data);
  migrated++;
}

// ── service_contract_file_data → data/uploads/companies/{id}/service.ext ──
const companiesDir = path.join(__dirname, 'data', 'uploads', 'companies');
fs.mkdirSync(companiesDir, { recursive: true });
const svcFiles = db.prepare(`SELECT id, service_contract_file_name, service_contract_file_data FROM companies WHERE service_contract_file_data IS NOT NULL AND service_contract_file_data != ''`).all();
for (const row of svcFiles) {
  const ext = path.extname(row.service_contract_file_name || '.bin') || '.bin';
  const dir = path.join(companiesDir, row.id);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'service' + ext);
  const data = Buffer.from(row.service_contract_file_data, 'base64').toString('utf8') === row.service_contract_file_data
    ? Buffer.from(row.service_contract_file_data, 'utf8')
    : Buffer.from(row.service_contract_file_data, 'base64');
  fs.writeFileSync(filePath, data);
  migrated++;
}

console.log(`Migrated ${migrated} files to data/uploads/`);
db.close();
