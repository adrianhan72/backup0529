/**
 * scripts/_hr_personnel_types.js
 *
 * 인사관리대장 인원 구분(personeel_type) 도입 마이그레이션:
 *  1) employees.personnel_type / employees.relationship 컬럼 추가
 *  2) 기존 대표자(is_representative=1) → 'representative' 백필
 *  3) registered_executives → 'executive' 직원으로 병합 (사번·이름 매칭 시 유형만 승격)
 *  4) related_party_workers → 'related' 직원으로 병합
 *  5) personnel_type NULL → 'employee' 정리
 *
 * 병합 규칙:
 *  - 같은 고객사에서 사원번호(employee_number)가 일치하는 직원 → 유형 승격 + 누락 필드 보충
 *  - 사번 매칭 실패 시 같은 고객사에서 이름 일치 직원 → 유형 승격
 *  - 일치하는 직원이 없으면 새 직원 행으로 INSERT
 *  - 기존 registered_executives / related_party_workers 테이블은 그대로 유지 (고객사 저장 흐름 호환)
 */
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));
db.pragma('journal_mode = WAL');

const out = { added: 0, upgraded: 0, skipped: 0 };

const hasCol = (table, col) =>
  db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);

// ── 1) 컬럼 추가 ──
if (!hasCol('employees', 'personnel_type')) {
  db.exec(`ALTER TABLE employees ADD COLUMN personnel_type TEXT DEFAULT 'employee'`);
  console.log('[1] employees.personnel_type 컬럼 추가됨');
} else {
  console.log('[1] employees.personnel_type 이미 존재');
}
if (!hasCol('employees', 'relationship')) {
  db.exec(`ALTER TABLE employees ADD COLUMN relationship TEXT`);
  console.log('[1] employees.relationship 컬럼 추가됨');
} else {
  console.log('[1] employees.relationship 이미 존재');
}

// ── 2) 대표자 백필 ──
const repN = db.prepare(
  `UPDATE employees SET personnel_type='representative' WHERE is_representative=1 AND COALESCE(personnel_type,'employee')!='representative'`
).run().changes;
console.log(`[2] 대표자 → representative 백필: ${repN}건`);

// ── 2.5) 고객사 representatives JSON(및 단일 대표자값) → 인사관리대장 백필 ──
// 인사관리대장에 없는 대표자만 새 직원으로 생성, 이미 있으면 유형 승격만 수행
let repInserted = 0, repUpgraded = 0;
const companies = db.prepare(`SELECT id, representative, representatives FROM companies`).all();
for (const co of companies) {
  let reps = [];
  if (co.representatives) {
    try { reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : co.representatives; } catch (e) { reps = []; }
  }
  if (!Array.isArray(reps)) reps = [];
  if (reps.length === 0 && co.representative) reps = [{ name: co.representative, phone: '', email: '', employee_number: '' }];
  for (const r of reps) {
    if (!r || !r.name) continue;
    const found = findEmployee(co.id, r.employee_number, r.name);
    if (found) {
      if (found.personnel_type !== 'representative' || !found.is_representative) {
        db.prepare(`UPDATE employees SET personnel_type='representative', is_representative=1, updated_at=? WHERE id=?`).run(Date.now(), found.id);
        repUpgraded++;
      }
      continue;
    }
    insertEmployee('representative', {
      name: r.name, employee_number: r.employee_number || '',
      phone: r.phone || '', email: r.email || '',
    }, co.id, 1);
    repInserted++;
  }
}
console.log(`[2.5] 고객사 대표자 백필: 신규 ${repInserted}건 / 유형승격 ${repUpgraded}건`);

// ── 헬퍼: 주민번호 앞7자리 → 성별 ──
function inferGender(idNumber) {
  const digit = String(idNumber || '').replace(/[^0-9]/g, '').slice(6, 7);
  if (digit === '1' || digit === '3') return 'male';
  if (digit === '2' || digit === '4') return 'female';
  return null;
}

// ── 헬퍼: 고객사 내 다음 사원번호 생성 ──
function nextEmpNo(companyId) {
  const rows = db.prepare(
    `SELECT employee_number FROM employees WHERE company_id=? AND employee_number IS NOT NULL AND employee_number != ''`
  ).all(companyId);
  const used = new Set();
  for (const r of rows) {
    const n = parseInt(String(r.employee_number).trim(), 10);
    if (!isNaN(n)) used.add(n);
  }
  let next = 1;
  while (used.has(next)) next++;
  return String(next).padStart(4, '0');
}

// ── 헬퍼: 직원 매칭 (사번 우선 → 이름) ──
function findEmployee(companyId, empNo, name) {
  if (empNo) {
    const byNo = db.prepare(
      `SELECT * FROM employees WHERE company_id=? AND employee_number=? LIMIT 1`
    ).get(companyId, String(empNo).trim());
    if (byNo) return byNo;
  }
  if (name) {
    return db.prepare(
      `SELECT * FROM employees WHERE company_id=? AND name=? LIMIT 1`
    ).get(companyId, String(name).trim());
  }
  return null;
}

// ── 헬퍼: 직원 유형 승격 + 누락 필드 보충 ──
function upgradeEmployee(row, type, extra = {}) {
  const sets = [`personnel_type='${type}'`, `updated_at=${Date.now()}`];
  for (const [col, val] of Object.entries(extra)) {
    if (val == null || val === '') continue;
    const lit = `'${String(val).replace(/'/g, "''")}'`;
    sets.push(`${col}=COALESCE(NULLIF(${col},''), ${lit})`);
  }
  db.prepare(`UPDATE employees SET ${sets.join(',')} WHERE id=?`).run(row.id);
  out.upgraded++;
}

// ── 헬퍼: 새 직원 INSERT ──
function insertEmployee(type, data, companyId, isRep = 0) {
  const empNo = data.employee_number || nextEmpNo(companyId);
  const id = `hr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    INSERT INTO employees (id, company_id, name, employee_number, position, phone, email, id_number,
      bank_name, bank_account, personnel_type, relationship, gender, status, is_representative, created_at, updated_at)
    VALUES (@id, @company_id, @name, @employee_number, @position, @phone, @email, @id_number,
      @bank_name, @bank_account, @personnel_type, @relationship, @gender, 'active', @is_representative, @created_at, @updated_at)
  `).run({
    id, company_id: companyId,
    name: data.name, employee_number: empNo,
    position: data.position || '', phone: data.phone || '', email: data.email || '', id_number: data.id_number || '',
    bank_name: data.bank_name || '', bank_account: data.bank_account || '',
    personnel_type: type, relationship: data.relationship || '',
    gender: inferGender(data.id_number) || null,
    is_representative: isRep,
    created_at: Date.now(), updated_at: Date.now(),
  });
  out.added++;
}

// ── 3) 등기임원 병합 ──
const execs = db.prepare(`SELECT * FROM registered_executives`).all();
for (const ex of execs) {
  const found = findEmployee(ex.company_id, ex.employee_number, ex.name);
  if (found) {
    upgradeEmployee(found, 'executive', { position: ex.position, phone: ex.phone, id_number: ex.id_number, bank_name: ex.bank_name, bank_account: ex.bank_account, employee_number: ex.employee_number });
  } else {
    insertEmployee('executive', {
      name: ex.name, employee_number: ex.employee_number, position: ex.position,
      phone: ex.phone, id_number: ex.id_number, bank_name: ex.bank_name, bank_account: ex.bank_account,
    }, ex.company_id);
  }
}
console.log(`[3] 등기임원 병합 완료: ${execs.length}건 처리`);

// ── 4) 특수관계인 병합 ──
const rels = db.prepare(`SELECT * FROM related_party_workers`).all();
for (const r of rels) {
  const found = findEmployee(r.company_id, r.employee_number, r.name);
  if (found) {
    upgradeEmployee(found, 'related', { relationship: r.relationship, phone: r.phone, id_number: r.id_number, bank_name: r.bank_name, bank_account: r.bank_account, employee_number: r.employee_number });
  } else {
    insertEmployee('related', {
      name: r.name, employee_number: r.employee_number, relationship: r.relationship,
      phone: r.phone, id_number: r.id_number, bank_name: r.bank_name, bank_account: r.bank_account,
    }, r.company_id);
  }
}
console.log(`[4] 특수관계인 병합 완료: ${rels.length}건 처리`);

// ── 5) NULL 정리 ──
const fixed = db.prepare(
  `UPDATE employees SET personnel_type='employee' WHERE personnel_type IS NULL OR personnel_type=''`
).run().changes;
console.log(`[5] personnel_type NULL 정리: ${fixed}건`);

// ── 결과 요약 ──
const summary = db.prepare(
  `SELECT personnel_type, COUNT(*) n FROM employees GROUP BY personnel_type`
).all();
console.log('=== 결과 ===');
console.log(`신규 직원 생성: ${out.added}건 / 유형 승격: ${out.upgraded}건`);
console.log('유형별 직원 수:', JSON.stringify(summary));
console.log('완료.');
