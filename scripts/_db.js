/**
 * scripts/_db.js — app.db → db.json 호환 인터페이스
 * 기존 scripts/에서 db.json을 쓰던 코드를 app.db로 전환하기 위한 유틸
 *
 * 사용법:
 *   const { loadDB, saveDB } = require('./_db');
 *   const db = loadDB();            // db.json 형태의 인메모리 객체 반환
 *   db.contracts.push({...});       // 수정
 *   saveDB(db);                     // app.db에 반영
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');

const TABLES = [
  'admin_accounts','companies','contracts','employees','payrolls','payroll_items',
  'billing','insurance_rates','minimum_wages','tax_brackets','tax_bracket_rows',
  'registered_executives','related_party_workers','representative_contact',
  'company_notices','contract_dispatch','consent_dispatch','contract_expiry_notice',
  'annual_leave_ledger','annual_leave_promotions','wage_ledger_notifications',
  'payroll_send_logs','attendance_ledger','kakao_send_logs','company_history',
  'severance_interim_settlements',
];

function loadDB() {
  const conn = new Database(DB_PATH);
  const db = {};
  for (const table of TABLES) {
    try {
      db[table] = conn.prepare('SELECT * FROM ' + table).all();
    } catch (e) {
      db[table] = [];
    }
  }
  conn.close();
  return db;
}

function saveDB(db) {
  const conn = new Database(DB_PATH);
  const tx = conn.transaction(() => {
    for (const table of TABLES) {
      if (!db[table]) continue;
      // Clear and re-insert
      conn.prepare('DELETE FROM ' + table).run();
      if (db[table].length === 0) continue;
      const cols = Object.keys(db[table][0]);
      const insert = conn.prepare(
        'INSERT INTO ' + table + ' (' + cols.join(', ') + ') VALUES (' + cols.map(() => '?').join(', ') + ')'
      );
      for (const row of db[table]) {
        insert.run(...cols.map(c => row[c]));
      }
    }
  });
  tx();
  conn.close();
}

module.exports = { loadDB, saveDB };
