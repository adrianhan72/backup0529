const path = require('path');
const { DB } = require('../lib/database');
const db = new DB(path.join(__dirname, '..', 'data', 'app.db'));
const rows = db.all(`SELECT id, employee_id, company_id, contract_type, daily_worker_type, status FROM contracts WHERE contract_type='daily'`);
console.table(rows);
