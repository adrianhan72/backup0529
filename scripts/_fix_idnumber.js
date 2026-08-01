const betterSqlite3 = require('better-sqlite3');
const path = require('path');
const db = betterSqlite3(path.join(__dirname, '..', 'data', 'app.db'));

// Helper: generate a valid random id_number (YYMMDD-S)
function randomIdNumber() {
  const y = String(Math.floor(Math.random() * 50) + 50).padStart(2, '0'); // 50-99
  const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const gd = Math.random() < 0.5 ? '1' : '2'; // 1=male(1900), 2=female(1900)
  return `${y}${m}${d}-${gd}`;
}

function genderFromIdNumber(idNumber) {
  const raw = (idNumber || '').replace(/[^0-9]/g, '');
  if (raw.length < 7) return null;
  const gd = parseInt(raw[6]);
  if ([1,3,5,7].includes(gd)) return '남';
  if ([2,4,6,8].includes(gd)) return '여';
  return null;
}

function isValidIdNumber(idNumber) {
  const raw = (idNumber || '').replace(/[^0-9]/g, '');
  if (raw.length < 7) return false;
  const gd = parseInt(raw[6]);
  return gd >= 1 && gd <= 8;
}

const all = db.prepare('SELECT id, name, id_number, gender FROM employees').all();
const updateStmt = db.prepare('UPDATE employees SET id_number = ?, gender = ? WHERE id = ?');

let fixed = 0;
for (const emp of all) {
  const raw = (emp.id_number || '').replace(/[^0-9]/g, '');
  let newIdNumber = emp.id_number;
  let newGender = emp.gender;

  // Fix invalid id_number
  if (!isValidIdNumber(emp.id_number)) {
    newIdNumber = randomIdNumber();
    console.log(`  ${emp.name}: "${emp.id_number || '(empty)'}" → "${newIdNumber}"`);
  }

  // Fix gender based on id_number
  const expectedGender = genderFromIdNumber(newIdNumber);
  if (expectedGender && emp.gender !== expectedGender) {
    console.log(`  ${emp.name}: gender "${emp.gender || '(empty)'}" → "${expectedGender}"`);
    newGender = expectedGender;
  }

  if (newIdNumber !== emp.id_number || newGender !== emp.gender) {
    updateStmt.run(newIdNumber, newGender, emp.id);
    fixed++;
  }
}

console.log(`\nFixed ${fixed} employees.`);

// Verify
const remaining = db.prepare(`
  SELECT name, id_number, gender FROM employees 
  WHERE id_number IS NULL OR id_number = '' 
     OR CAST(SUBSTR(REPLACE(id_number, '-', ''), 7, 1) AS INTEGER) NOT BETWEEN 1 AND 8
     OR gender IS NULL OR gender = ''
`).all();
console.log(`\nRemaining issues: ${remaining.length}`);
if (remaining.length > 0) console.log(JSON.stringify(remaining, null, 2));

db.close();
