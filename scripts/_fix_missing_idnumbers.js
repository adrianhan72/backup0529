// 주민번호 부재 직원에 테스트용 주민번호 채움 (전 고객사·직원이 테스트 가상 데이터임)
//
// 생성 규칙 (결정적 — 재실행해도 동일 값):
//   - "YYMMDD-N" 형식 (앱 _validateIdNumber 규격 준수: 생년월일 6자리 + 하이픈 + 성별코드 1~8)
//   - 생년월일은 직원 ID 해시 기반 (1970~1999년, 일 1~28일 — 유효성 안전 범위)
//   - 성별코드: female('여' 포함) → 2, 그 외(남·미기재) → 1
//   - 회사 내 기존 주민번호 앞7자리와 충돌 시 일자를 +1씩 이동 (동일인 오판 방지)
// 멱등성: 주민번호가 이미 있는 직원은 건너뜀
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const targets = db.prepare(
  "SELECT id, name, gender, company_id FROM employees WHERE id_number IS NULL OR id_number = ''"
).all();

const usedId7ByCompany = new Map();
const all = db.prepare('SELECT company_id, id_number FROM employees WHERE id_number IS NOT NULL AND id_number != \'\'').all();
for (const r of all) {
  const id7 = r.id_number.replace(/[^0-9]/g, '').slice(0, 7);
  if (!usedId7ByCompany.has(r.company_id)) usedId7ByCompany.set(r.company_id, new Set());
  usedId7ByCompany.get(r.company_id).add(id7);
}

let filled = 0;
const upd = db.prepare('UPDATE employees SET id_number = ? WHERE id = ?');

for (const e of targets) {
  const h = hashStr(e.id);
  const genderCode = (e.gender === 'female' || e.gender === '여' || e.gender === '여성') ? '2' : '1';
  let yy = 70 + (h % 30);          // 1970 ~ 1999
  let mm = 1 + ((h >>> 3) % 12);
  let dd = 1 + ((h >>> 5) % 28);   // 1~28 (월 길이 안전 범위)
  const used = usedId7ByCompany.get(e.company_id) || new Set();
  // 충돌 회피: 회사 내 기존/신규 주민번호 앞7자리와 겹치면 일자 이동
  let id7 = `${String(yy).padStart(2, '0')}${String(mm).padStart(2, '0')}${String(dd).padStart(2, '0')}${genderCode}`;
  let guard = 0;
  while (used.has(id7) && guard < 400) {
    dd += 1;
    if (dd > 28) { dd = 1; mm += 1; }
    if (mm > 12) { mm = 1; yy += 1; }
    id7 = `${String(yy).padStart(2, '0')}${String(mm).padStart(2, '0')}${String(dd).padStart(2, '0')}${genderCode}`;
    guard++;
  }
  used.add(id7);
  const idNumber = `${id7.slice(0, 6)}-${id7.slice(6)}`;
  upd.run(idNumber, e.id);
  filled++;
  console.log(`[FILL] ${e.name} (${e.company_id}): ${idNumber}`);
}

console.log(`[RESULT] ${targets.length}명 중 ${filled}명 채움`);
console.log('[CHECK] integrity:', db.prepare('PRAGMA integrity_check').get().integrity_check);
db.pragma('wal_checkpoint(TRUNCATE)');
db.close();
console.log('완료.');
