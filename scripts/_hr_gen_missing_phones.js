/* =====================================================================
 * _hr_gen_missing_phones.js (멱등)
 *  - 휴대전화가 없는 직원에게 결정론적 유니크 번호 생성 (010-XXXX-XXXX)
 *  - 인사카드 수정 이력에 기록
 * ===================================================================== */
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
db.pragma('journal_mode = WAL');

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const all = db.prepare(`SELECT id, name, company_id, phone, hr_edit_history FROM employees`).all();
const used = new Set(all.map(e => (e.phone || '').replace(/[^0-9]/g, '')).filter(Boolean));

const targets = all.filter(e => !e.phone);
const upd = db.prepare(`UPDATE employees SET phone = ?, updated_at = ?, hr_edit_history = ? WHERE id = ?`);

let done = 0;
for (const e of targets) {
  let phone = '';
  let seed = fnv1a(e.company_id + '|' + e.name);
  let guard = 0;
  do {
    const mid = String(Math.abs((seed >> 8) % 10000)).padStart(4, '0');
    const end = String(Math.abs((seed >> 16) % 10000)).padStart(4, '0');
    phone = `010-${mid}-${end}`;
    seed = (seed * 2654435761) >>> 0;
  } while (used.has(phone.replace(/[^0-9]/g, '')) && ++guard < 50);
  used.add(phone.replace(/[^0-9]/g, ''));

  let hist = [];
  if (typeof e.hr_edit_history === 'string' && e.hr_edit_history.trim()) {
    try { hist = JSON.parse(e.hr_edit_history); } catch (err) { hist = []; }
  } else if (Array.isArray(e.hr_edit_history)) {
    hist = e.hr_edit_history;
  }
  hist.push({
    at: new Date().toISOString(), kind: 'edit',
    fields: [{ label: '휴대전화', before: '', after: phone }],
  });
  upd.run(phone, Date.now(), JSON.stringify(hist), e.id);
  console.log(`[생성] ${e.name} → ${phone}`);
  done++;
}

console.log(`\n처리 ${done}건 / 잔여 결측 ${db.prepare(`SELECT COUNT(*) n FROM employees WHERE phone IS NULL OR phone=''`).get().n}건`);

// ── 규칙: WAL 작업 내용은 app.db 본체에 즉시 반영 (체크포인트 후 WAL 0 확인) ──
const chk = db.pragma('wal_checkpoint(TRUNCATE)');
console.log('[체크포인트]', JSON.stringify(chk));
db.close();
