/**
 * 마이그레이션: contracts 테이블에 pay_day 컬럼 추가 (개별 근로계약 급여일)
 * 실행: node scripts/migrate-add-contract-payday.js
 */
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
db.pragma('journal_mode = WAL');

try {
  db.exec('ALTER TABLE contracts ADD COLUMN pay_day INTEGER');
  console.log('✅ contracts.pay_day 컬럼 추가 완료');
} catch(e) {
  if(e.message.includes('duplicate column')){
    console.log('ℹ️  컬럼이 이미 존재합니다. 건너뜁니다.');
  } else {
    console.error('❌ 오류:', e.message);
  }
}

db.close();
