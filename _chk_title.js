const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join('data', 'app.db'));

const rows = db.prepare("SELECT title FROM company_notices WHERE notice_type = 'contract_dispatched' LIMIT 5").all();
console.log('Stored titles:');
rows.forEach(r => console.log(' ', r.title));
db.close();
