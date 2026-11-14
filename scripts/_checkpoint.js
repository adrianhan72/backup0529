const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('data/app.db');
db.pragma('wal_checkpoint(TRUNCATE)');
console.log('wal_size=' + fs.statSync('data/app.db-wal').size);
console.log('integrity=' + db.pragma('integrity_check', { simple: true }));
db.close();
