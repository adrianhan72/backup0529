/**
 * 갱신 계약 시작일 일괄 수정
 * - 대상: 직전 계약의 해지일(또는 만료일)의 익영업일이 아닌 시작일을 가진 갱신 계약
 * - 영업일 제외: 주말, 법정 공휴일(2026년부터 제헌절 포함), 대체공휴일, 근로자의 날(5/1)
 * - 제외: 파기(voided), 임시저장, 직전 계약 없음, 갭 31일 초과(재입사로 간주)
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// ── 대한민국 법정 공휴일 (대체공휴일 포함, 제헌절은 2026년부터) ──
// 대체공휴일 대상: 설날·추석 연휴, 어린이날, 삼일절, 광복절, 개천절, 한글날
const HOLIDAYS = {
  2022: new Set(['01-01','01-31','02-01','02-02','03-01','05-01','05-05','05-08','06-06','08-15','09-09','09-10','09-11','09-12','10-03','10-09','10-10','12-25']),
  2023: new Set(['01-01','01-21','01-22','01-23','01-24','03-01','05-01','05-05','05-27','06-06','08-15','09-28','09-29','09-30','10-02','10-03','10-09','12-25']),
  2024: new Set(['01-01','02-09','02-10','02-11','02-12','03-01','05-01','05-05','05-06','05-15','06-06','08-15','09-16','09-17','09-18','10-03','10-09','12-25']),
  2025: new Set(['01-01','01-28','01-29','01-30','03-01','03-03','05-01','05-05','06-06','08-15','10-05','10-06','10-07','10-08','10-09','12-25']),
  2026: new Set(['01-01','02-16','02-17','02-18','03-01','03-02','05-01','05-05','05-24','06-06','07-17','08-15','08-17','09-24','09-25','09-26','09-28','10-03','10-05','10-09','12-25']),
  2027: new Set(['01-01','02-05','02-06','02-07','02-08','03-01','05-01','05-05','05-13','06-06','07-17','08-15','08-16','09-14','09-15','09-16','10-03','10-04','10-09','10-11','12-25']),
  2028: new Set(['01-01','01-25','01-26','01-27','03-01','05-01','05-02','05-05','06-06','07-17','08-15','10-02','10-03','10-04','10-09','12-25']),
};

function isHoliday(d) {
  const s = HOLIDAYS[d.getFullYear()];
  return !!s && s.has(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}

function nextBusinessDay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr); // UTC 기준 파싱 (프론트와 동일)
  d.setDate(d.getDate() + 1);
  let tries = 0;
  while (tries < 14) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !isHoliday(d)) break;
    d.setDate(d.getDate() + 1);
    tries++;
  }
  return d.toISOString().slice(0, 10);
}

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');

// ── 1) 백업 (3종 세트: db + shm + wal) ──
const ts = new Date().toISOString().slice(0, 10) + '_' + new Date().toTimeString().slice(0, 8).replace(/:/g, '');
const backupDir = path.join(__dirname, '..', 'data', 'backups', `renewal_start_${ts}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const ext of ['', '-shm', '-wal']) {
  const src = DB_PATH + ext;
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(backupDir, 'app.db' + ext));
}
console.log('백업 완료:', backupDir);

const db = new Database(DB_PATH);

// ── 2) 대상 수집 ──
const rows = db.prepare(`
  SELECT c.*, e.name AS emp_name
  FROM contracts c LEFT JOIN employees e ON e.id = c.employee_id
  ORDER BY c.employee_id, c.contract_start, c.created_at
`).all();
const byEmp = {};
for (const r of rows) { (byEmp[r.employee_id] ||= []).push(r); }

const updates = [];
const skipped = [];
for (const [eid, list] of Object.entries(byEmp)) {
  list.forEach((cur, i) => {
    const isRenewal =
      cur.hire_reason === 'contract_renewal' ||
      cur.created_reason === 'renewal' ||
      (cur.renewed_from_id && cur.renewed_from_id.trim());
    if (!isRenewal) return;
    if (cur.is_draft) return;

    // 직전 계약 결정
    let prev = null;
    if (cur.renewed_from_id) prev = list.find(p => p.id === cur.renewed_from_id) || null;
    if (!prev) {
      for (let j = i - 1; j >= 0; j--) {
        const p = list[j];
        const base = p.terminate_date || (p.close_reason === 'expiry' ? p.contract_end : '');
        if (base && base < cur.contract_start) { prev = p; break; }
      }
    }
    const base = prev ? (prev.terminate_date || (prev.close_reason === 'expiry' ? prev.contract_end : '')) : '';
    if (!base) {
      skipped.push({ id: cur.id, why: '직전 계약 없음/기준일 없음', start: cur.contract_start });
      return;
    }
    const expect = nextBusinessDay(base);
    if (cur.contract_start === expect) return; // 정상

    const gap = (new Date(cur.contract_start) - new Date(base)) / 86400000;
    if (cur.status === 'voided') {
      skipped.push({ id: cur.id, why: '파기(voided)', start: cur.contract_start, expect });
      return;
    }
    if (gap > 31) {
      skipped.push({ id: cur.id, why: `갭 ${gap}일 초과(재입사 간주)`, start: cur.contract_start, expect });
      return;
    }
    updates.push({ id: cur.id, emp: prev.emp_name || cur.emp_name, co: cur.company_id, oldStart: cur.contract_start, newStart: expect, base });
  });
}

console.log(`\n수정 대상: ${updates.length}건`);
updates.forEach(u => console.log(`  ${u.emp} (${u.co}) ${u.oldStart} → ${u.newStart} (직전 종료 ${u.base})`));
console.log(`제외: ${skipped.length}건`);
skipped.forEach(s => console.log(`  ${s.id.slice(0, 8)} ${s.why} start=${s.start}${s.expect ? ' expect=' + s.expect : ''}`));

// ── 3) 적용 ──
if (updates.length === 0) { console.log('\n수정할 데이터 없음.'); db.close(); process.exit(0); }
const upd = db.prepare('UPDATE contracts SET contract_start = ?, updated_at = ? WHERE id = ?');
const now = Date.now();
const tx = db.transaction(() => { for (const u of updates) upd.run(u.newStart, now, u.id); });
tx();

// ── 4) 검증 ──
console.log('\nintegrity_check:', JSON.stringify(db.pragma('integrity_check')));
const recheck = [];
for (const [eid, list] of Object.entries(byEmp)) {
  list.forEach((cur, i) => {
    if (cur.hire_reason !== 'contract_renewal' && cur.created_reason !== 'renewal' && !(cur.renewed_from_id && cur.renewed_from_id.trim())) return;
    let prev = null;
    if (cur.renewed_from_id) prev = list.find(p => p.id === cur.renewed_from_id) || null;
    if (!prev) {
      for (let j = i - 1; j >= 0; j--) {
        const p = list[j];
        const b = p.terminate_date || (p.close_reason === 'expiry' ? p.contract_end : '');
        if (b && b < cur.contract_start) { prev = p; break; }
      }
    }
    const b = prev ? (prev.terminate_date || (prev.close_reason === 'expiry' ? prev.contract_end : '')) : '';
    if (!b || cur.status === 'voided') return;
    const expect = nextBusinessDay(b);
    const fresh = db.prepare('SELECT contract_start FROM contracts WHERE id = ?').get(cur.id);
    const gap = (new Date(fresh.contract_start) - new Date(b)) / 86400000;
    if (gap <= 31 && fresh.contract_start !== expect) recheck.push({ id: cur.id, start: fresh.contract_start, expect });
  });
}
console.log('수정 후 잔여 불일치:', recheck.length, JSON.stringify(recheck));
db.close();
console.log('완료.');
