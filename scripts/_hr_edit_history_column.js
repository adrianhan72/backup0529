/* =====================================================================
 * _hr_edit_history_column.js (멱등)
 *  - employees 테이블에 인사카드 수정 이력 저장용 JSON 텍스트 컬럼 추가
 *  - hr_edit_history TEXT — [{at, kind, summary, fields:[{label,before,after}]}]
 * ===================================================================== */
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
db.pragma('journal_mode = WAL');

const cols = db.prepare(`PRAGMA table_info(employees)`).all().map(c => c.name);
if (!cols.includes('hr_edit_history')) {
  db.exec(`ALTER TABLE employees ADD COLUMN hr_edit_history TEXT`);
  console.log('[OK] employees.hr_edit_history 컬럼 추가');
} else {
  console.log('[SKIP] employees.hr_edit_history 이미 존재');
}
db.close();
