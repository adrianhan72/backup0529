// Phase 0: employees 확장 컬럼 10개 추가 + 상태 정규화 (Q7~Q9 확정 반영)
//
// 확정 컬럼 (모두 TEXT, 자유입력):
//   career_history(경력·이력), military_status(병역),
//   education(최종학력), major(전공), certifications(자격증),
//   language_skills(어학능력), special_notes(특이사항),
//   marital_status(결혼 여부), emergency_contact(비상연락처), emergency_relation(비상연락처 관계)
//
// 상태 정규화: '재직'(한글 레거시) → 'active'
//
// 실행 전제: 서버 완전 종료 → WAL 체크포인트 → 백업 (글로벌 룰)
// 멱등성: 컬럼 존재 시 ALTER 생략, 정규화는 반복 실행해도 무해
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));

const NEW_COLS = [
  'career_history',
  'military_status',
  'education',
  'major',
  'certifications',
  'language_skills',
  'special_notes',
  'marital_status',
  'emergency_contact',
  'emergency_relation',
];

console.log('── 확장 컬럼 추가 ──');
const existing = new Set(db.prepare('PRAGMA table_info(employees)').all().map(c => c.name));
for (const col of NEW_COLS) {
  if (!existing.has(col)) {
    db.exec(`ALTER TABLE employees ADD COLUMN ${col} TEXT`);
    console.log(`[ALTER] employees.${col} 추가됨`);
  } else {
    console.log(`[SKIP] ${col} 이미 존재`);
  }
}

console.log('── 상태 정규화 ──');
const legacy = db.prepare("SELECT COUNT(*) c FROM employees WHERE status='재직'").get().c;
if (legacy > 0) {
  db.prepare("UPDATE employees SET status='active' WHERE status='재직'").run();
  console.log(`[NORMALIZE] '재직' ${legacy}건 → 'active'`);
} else {
  console.log('[NORMALIZE] 대상 없음');
}

console.log('── 결과 ──');
const statusRows = db.prepare('SELECT status, COUNT(*) c FROM employees GROUP BY status').all();
console.log('status:', JSON.stringify(statusRows));
const colList = db.prepare('PRAGMA table_info(employees)').all().map(c => c.name);
console.log('columns:', colList.length);

console.log('── 무결성 검사 ──');
console.log('[CHECK]', db.prepare('PRAGMA integrity_check').get().integrity_check);

db.close();
console.log('완료. 이어서 `node scripts/dump_schema.js` 실행.');
