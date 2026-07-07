/**
 * scripts/backup.js — DB 자동 백업 (매일 새벽 2시 or 수동 실행)
 *
 * 실행: node scripts/backup.js
 * 스케줄: server.js 시작 시 cron 등록
 */
const fs   = require('fs');
const path = require('path');

const DB_PATH     = path.join(__dirname, '..', 'data', 'app.db');
const BACKUP_DIR  = path.join(__dirname, '..', 'data', 'backups');
const MAX_BACKUPS = 7; // 7일치 보관

function backup() {
  try {
    // 1. WAL 체크포인트 (안전한 상태로)
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();

    // 2. 파일 복사
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dest = path.join(BACKUP_DIR, `app_${timestamp}.db`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.copyFileSync(DB_PATH, dest);
    console.log(`✅ 백업 완료: ${dest}`);

    // 3. 오래된 백업 정리 (최신 7일만 유지)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('app_') && f.endsWith('.db'))
      .sort()
      .reverse();
    files.slice(MAX_BACKUPS).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`🗑️  오래된 백업 삭제: ${f}`);
    });
  } catch (e) {
    console.error('❌ 백업 실패:', e.message);
  }
}

// 직접 실행 or 스케줄러 등록용 export
if (require.main === module) {
  backup();
}

module.exports = { backup };
