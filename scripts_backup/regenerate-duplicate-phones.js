const Database = require('better-sqlite3');
const db = new Database('data/app.db');

db.pragma('foreign_keys = OFF');

console.log('=== 휴대전화번호 중복 재생성 ===\n');

const digits = (phone) => (phone || '').replace(/[^0-9]/g, '');

// ── Helper: check if two persons are the same individual ──
// Same person = employee who is also a representative/executive/related party
// We check by name match + source

// ── Collect all persons per company ──
const companies = db.prepare('SELECT id, company_name, phone, representatives FROM companies').all();

// Build a map of "protected" phones (company phone = rep phone is normal)
const protectedPhones = new Set();

for (const co of companies) {
  const coPhone = digits(co.phone);
  
  // Company phone = any representative phone → protected
  if (co.representatives) {
    try {
      const reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : co.representatives;
      if (Array.isArray(reps)) {
        for (const rep of reps) {
          const repPhone = digits(rep.phone);
          if (repPhone && repPhone === coPhone) {
            protectedPhones.add(co.id + ':' + repPhone);
          }
        }
      }
    } catch(e) {}
  }
}

// ── Find duplicate phones within each company ──
const allPhones = [];

// Employees
const emps = db.prepare("SELECT id, name, company_id, phone, is_representative, employee_number FROM employees WHERE phone IS NOT NULL AND phone != ''").all();
for (const e of emps) {
  allPhones.push({ ...e, phoneDigits: digits(e.phone), source: 'employee', table: 'employees' });
}

// Executives
const execs = db.prepare("SELECT id, name, company_id, phone FROM registered_executives WHERE phone IS NOT NULL AND phone != ''").all();
for (const e of execs) {
  allPhones.push({ ...e, phoneDigits: digits(e.phone), source: 'executive', table: 'registered_executives' });
}

// Related parties
const rels = db.prepare("SELECT id, name, company_id, phone FROM related_party_workers WHERE phone IS NOT NULL AND phone != ''").all();
for (const r of rels) {
  allPhones.push({ ...r, phoneDigits: digits(r.phone), source: 'related_party', table: 'related_party_workers' });
}

// Group by company + phone
const byCoPhone = {};
for (const p of allPhones) {
  const key = p.company_id + ':' + p.phoneDigits;
  if (!byCoPhone[key]) byCoPhone[key] = [];
  byCoPhone[key].push(p);
}

// Find duplicates
const duplicateGroups = Object.entries(byCoPhone).filter(([key, persons]) => persons.length > 1);

console.log('중복 그룹: ' + duplicateGroups.length + '개\n');

let totalRegenerated = 0;
let phoneCounter = Math.floor(Date.now() / 1000) % 100000000; // Unique starting counter

for (const [key, persons] of duplicateGroups) {
  const [coId, phoneDigits] = key.split(':');
  const co = companies.find(c => c.id === coId);
  const coName = co ? co.company_name : coId;
  
  // Check if all persons are the same individual (employee = rep/exec/rel)
  // Same individual if: name matches across sources
  const names = new Set(persons.map(p => p.name.replace(/\(대표\)$/, '')));
  const sources = new Set(persons.map(p => p.source));
  
  // If it's company phone = rep phone, skip (protected)
  if (protectedPhones.has(key)) {
    console.log('⏭️  ' + coName + ': ' + phoneDigits + ' (회사=대표번호, 유지)');
    continue;
  }
  
  // If all are same person (employee + rep/exec/rel for same name), skip
  if (names.size === 1 && sources.size > 1) {
    console.log('⏭️  ' + coName + ': ' + phoneDigits + ' (동일인 ' + [...names][0] + ', 유지)');
    continue;
  }
  
  // If only 2 persons: one is employee, one is same-name representative → same person
  if (persons.length === 2) {
    const p1Name = persons[0].name.replace(/\(대표\)$/, '');
    const p2Name = persons[1].name.replace(/\(대표\)$/, '');
    if (p1Name === p2Name && persons[0].source !== persons[1].source) {
      console.log('⏭️  ' + coName + ': ' + phoneDigits + ' (동일인 ' + p1Name + ', 유지)');
      continue;
    }
  }
  
  // ── This is a true duplicate: regenerate phone numbers ──
  console.log('🔧 ' + coName + ': ' + phoneDigits + ' → ' + persons.length + '명 재생성');
  
  // Keep the first person's phone, regenerate the rest
  for (let i = 1; i < persons.length; i++) {
    const person = persons[i];
    
    // Generate unique phone: 010-XXXX-XXXX using global counter
    phoneCounter++;
    const unique = '010' + String(phoneCounter).slice(-8).padStart(8, '0');
    const formatted = unique.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    
    // Update in the correct table
    if (person.table === 'employees') {
      db.prepare('UPDATE employees SET phone = ? WHERE id = ?').run(formatted, person.id);
    } else if (person.table === 'registered_executives') {
      db.prepare('UPDATE registered_executives SET phone = ? WHERE id = ?').run(formatted, person.id);
    } else if (person.table === 'related_party_workers') {
      db.prepare('UPDATE related_party_workers SET phone = ? WHERE id = ?').run(formatted, person.id);
    }
    
    console.log('   ' + person.name + ' [' + person.source + '] → ' + formatted);
    totalRegenerated++;
  }
}

console.log('\n총 재생성: ' + totalRegenerated + '건');

// ── Final verification ──
console.log('\n=== 최종 검증 ===');

// Re-collect all phones
const allPhonesAfter = [];
const empsAfter = db.prepare("SELECT id, name, company_id, phone FROM employees WHERE phone IS NOT NULL AND phone != ''").all();
for (const e of empsAfter) allPhonesAfter.push({ ...e, phoneDigits: digits(e.phone), source: 'employee' });
const execsAfter = db.prepare("SELECT id, name, company_id, phone FROM registered_executives WHERE phone IS NOT NULL AND phone != ''").all();
for (const e of execsAfter) allPhonesAfter.push({ ...e, phoneDigits: digits(e.phone), source: 'executive' });
const relsAfter = db.prepare("SELECT id, name, company_id, phone FROM related_party_workers WHERE phone IS NOT NULL AND phone != ''").all();
for (const r of relsAfter) allPhonesAfter.push({ ...r, phoneDigits: digits(r.phone), source: 'related_party' });

const byCoPhoneAfter = {};
for (const p of allPhonesAfter) {
  const key = p.company_id + ':' + p.phoneDigits;
  if (!byCoPhoneAfter[key]) byCoPhoneAfter[key] = [];
  byCoPhoneAfter[key].push(p);
}

const remainingDupes = Object.entries(byCoPhoneAfter).filter(([key, persons]) => {
  if (persons.length <= 1) return false;
  // Check if all same person
  const names = new Set(persons.map(p => p.name));
  const sources = new Set(persons.map(p => p.source));
  if (names.size === 1 && sources.size > 1) return false; // same person, different roles
  
  // Check protected
  if (protectedPhones.has(key)) return false;
  
  return true;
});

if (remainingDupes.length > 0) {
  console.log('⚠️  잔여 중복: ' + remainingDupes.length + '개');
  for (const [key, persons] of remainingDupes) {
    console.log('   ' + key + ': ' + persons.map(p => p.name + '[' + p.source + ']').join(', '));
  }
} else {
  console.log('✅ 모든 중복 해소 완료!');
}

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDone.');
