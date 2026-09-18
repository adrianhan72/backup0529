// 일회성 스크립트: contracts 테이블에 주급 산정기간 시작 요일 컬럼 추가
// 사용 전 서버 정상 종료(Ctrl+C) 필수 — DB 스키마 변경 안전 수칙
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const have = new Set(db.prepare('PRAGMA table_info(contracts)').all().map(c => c.name));
if (have.has('pay_period_weekday')) {
  console.log('skip (exists): pay_period_weekday');
} else {
  db.exec('ALTER TABLE contracts ADD COLUMN pay_period_weekday INTEGER');
  console.log('added: pay_period_weekday INTEGER');
}

db.pragma('wal_checkpoint(TRUNCATE)');
const wsize = fs.statSync(DB_PATH + '-wal').size;
console.log('wal_size=' + wsize);
console.log('integrity=' + db.pragma('integrity_check', { simple: true }));
const payCols = db.prepare('PRAGMA table_info(contracts)').all().map(c => c.name).filter(n => n.startsWith('pay_'));
console.log('pay_cols=' + payCols.join(','));
db.close();
