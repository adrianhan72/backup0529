/* =====================================================================
 * _hr_gen_rep_identity.js (멱등)
 *  - 대표자 본인(representative) 중 주민번호·성별이 없는 직원에게
 *    주민번호(앞7자리, YYMMDD-N)와 성별(male/female)을 생성·기입
 *  - 생성값은 (company_id + name) 해시 기반 결정론적 값
 *  - 7번째 자리(성별코드)와 gender 값 항상 일치 (1→male, 2→female)
 *  - 기존 employees.id_number 전체와 충돌하지 않도록 일자 보정
 *  - 이미 값이 있는 직원은 건너뜀 (재실행 안전)
 * ===================================================================== */
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
db.pragma('journal_mode = WAL');

// FNV-1a 해시 (문자열 → 32bit unsigned)
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const all = db.prepare(`SELECT id, name, company_id, personnel_type, id_number, gender FROM employees`).all();
const used = new Set();
for (const e of all) {
  const norm = (e.id_number || '').replace(/[^0-9]/g, '');
  if (norm) used.add(norm);
}

const targets = all.filter(e =>
  e.personnel_type === 'representative' &&
  (!e.id_number || !e.gender)
);

const upd = db.prepare(`UPDATE employees SET id_number = ?, gender = ?, updated_at = ? WHERE id = ?`);
let done = 0;

for (const e of targets) {
  const seed = fnv1a(`${e.company_id}|${e.name}`);
  // 성별: 명백히 여성인 이름은 female, 그 외 male (생성 데이터의 자연스러움 우선)
  const FEMALE_NAMES = new Set(['박소연']);
  const genderCode = FEMALE_NAMES.has(e.name) ? 2 : 1;    // 1=남(male), 2=여(female)
  let yy = 1950 + (Math.floor(seed / 7) % 45);            // 1950~1994
  let mm = 1 + (Math.floor(seed / 13) % 12);
  let dd = 1 + (Math.floor(seed / 17) % 28);              // 1~28 (월 일수 무관 안전)
  let idn = '';
  let guard = 0;
  do {
    const yymmdd = String(yy % 100).padStart(2, '0') + String(mm).padStart(2, '0') + String(dd).padStart(2, '0');
    idn = `${yymmdd}-${genderCode}`;
    const norm = idn.replace(/[^0-9]/g, '');
    if (!used.has(norm)) { used.add(norm); break; }
    dd += 1;
    if (dd > 28) { dd = 1; mm += 1; }
    if (mm > 12) { mm = 1; yy += 1; }
  } while (++guard < 2000);

  upd.run(idn, genderCode === 1 ? 'male' : 'female', Date.now(), e.id);
  console.log(`[생성] ${e.company_id} | ${e.name} → ${idn} / ${genderCode === 1 ? 'male(남)' : 'female(여)'}`);
  done++;
}

// 검증
const remains = db.prepare(`SELECT COUNT(*) c FROM employees WHERE personnel_type='representative' AND (id_number IS NULL OR id_number='' OR gender IS NULL OR gender='')`).get().c;
console.log(`\n처리 ${done}건 / 잔여 결측 ${remains}건`);
db.close();
