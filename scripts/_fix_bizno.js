const betterSqlite3 = require('better-sqlite3');
const path = require('path');
const db = betterSqlite3(path.join(__dirname, '..', 'data', 'app.db'));

function isValidBizNumber(raw) {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length !== 10 || !/^\d{10}$/.test(digits)) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * weights[i];
  sum += Math.floor((parseInt(digits[8]) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(digits[9]);
}

function generateValidBizNumber() {
  // Generate 9 random digits, compute valid check digit
  let prefix = '';
  for (let i = 0; i < 9; i++) prefix += Math.floor(Math.random() * 10);
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(prefix[i]) * weights[i];
  sum += Math.floor((parseInt(prefix[8]) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return prefix + check;
}

const all = db.prepare('SELECT id, company_name, business_number FROM companies').all();
const bad = all.filter(c => !isValidBizNumber(c.business_number));

console.log(`Total companies: ${all.length}, Invalid: ${bad.length}`);
bad.forEach(c => console.log(`  ${c.company_name}: "${c.business_number || '(empty)'}"`));

// Fix
const update = db.prepare('UPDATE companies SET business_number = ? WHERE id = ?');
let fixed = 0;
for (const c of bad) {
  const newBiz = generateValidBizNumber();
  update.run(newBiz, c.id);
  console.log(`  ${c.company_name}: "${c.business_number || '(empty)'}" → "${newBiz}"`);
  fixed++;
}

console.log(`\nFixed ${fixed} companies.`);
db.close();
