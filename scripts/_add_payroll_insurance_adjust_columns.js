// 일회성 스크립트: payrolls에 보험료 정산 컬럼 3종 추가
//  - national_pension_retro      국민연금 소급분
//  - ltcare_adjust               장기요양보험 정산
//  - employment_insurance_adjust 고용보험 정산
// 사용 전 서버 정상 종료(Ctrl+C) 필수 — DB 스키마 변경 안전 수칙
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const have = new Set(db.prepare('PRAGMA table_info(payrolls)').all().map(c => c.name));
const COLS = [
  ['national_pension_retro', 'REAL'],
  ['ltcare_adjust', 'REAL'],
  ['employment_insurance_adjust', 'REAL'],
];
for (const [name, type] of COLS) {
  if (have.has(name)) {
    console.log(`skip (exists): payrolls.${name}`);
    continue;
  }
  db.exec(`ALTER TABLE payrolls ADD COLUMN ${name} ${type}`);
  console.log(`added: payrolls.${name} ${type}`);
}

db.pragma('wal_checkpoint(TRUNCATE)');
console.log('integrity=' + db.pragma('integrity_check', { simple: true }));
console.log('columns=' + db.prepare('PRAGMA table_info(payrolls)').all().map(c => c.name).filter(n => /retro|adjust/.test(n)).join(','));
db.close();
