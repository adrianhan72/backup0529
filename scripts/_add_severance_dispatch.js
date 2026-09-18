/**
 * scripts/_add_severance_dispatch.js
 * 퇴직금 명세서 발송 기능 (2026-09-03)
 *  1) contracts.severance_file_url 컬럼 추가 (퇴직금 명세서 PDF 파일서버 URL)
 *  2) severance_dispatch 테이블 생성 (퇴직금 명세서 발송 이력)
 */
const path = require('path');
const { DB } = require('../lib/database');

const ROOT = path.join(__dirname, '..');
const db = new DB(path.join(ROOT, 'data', 'app.db'));

function hasColumn(table, col) {
  const rows = db.all(`PRAGMA table_info(${table})`);
  return (rows || []).some(r => r.name === col);
}

function main() {
  // 1) contracts.severance_file_url
  if (!hasColumn('contracts', 'severance_file_url')) {
    db.run(`ALTER TABLE contracts ADD COLUMN severance_file_url TEXT`);
    console.log('[OK] contracts.severance_file_url 컬럼 추가');
  } else {
    console.log('[SKIP] contracts.severance_file_url 이미 존재');
  }

  // 2) severance_dispatch 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS severance_dispatch (
      id TEXT PRIMARY KEY,            -- 고유식별자
      contract_id TEXT,               -- 계약 ID
      employee_id TEXT,               -- 직원 ID
      employee_name TEXT,             -- 직원명
      company_id TEXT,                -- 회사 ID
      company_name TEXT,              -- 회사명
      dispatch_method TEXT,           -- 발송 방식 (kakao/email/manual)
      dispatch_status TEXT,           -- 발송 상태 (completed 등)
      recipient TEXT,                 -- 수신처
      file_url TEXT,                  -- 퇴직금 명세서 PDF 파일 주소
      dispatched_at TEXT,             -- 발송 일시
      dispatched_by TEXT,             -- 발송 처리자
      note TEXT,                      -- 비고
      created_at INTEGER,             -- 생성일시
      updated_at INTEGER              -- 수정일시
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_severance_dispatch_contract ON severance_dispatch(contract_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_severance_dispatch_company ON severance_dispatch(company_id)`);
  console.log('[OK] severance_dispatch 테이블 생성 완료');

  // WAL 체크포인트
  try { db.connection.raw.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
  console.log('[DONE] 마이그레이션 완료');
}

main();
