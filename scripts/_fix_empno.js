const betterSqlite3 = require('better-sqlite3');
const path = require('path');
const db = betterSqlite3(path.join(__dirname, '..', 'data', 'app.db'));

// Verify
const bad = db.prepare(`
  SELECT name, employee_number, company_id 
  FROM employees 
  WHERE employee_number IS NULL 
     OR employee_number = '' 
     OR employee_number NOT GLOB '[0-9][0-9][0-9][0-9]'
`).all();

if (bad.length === 0) {
  console.log('All employee numbers are now valid 4-digit format.');
} else {
  console.log('Still have issues:', bad);
}

db.close();
