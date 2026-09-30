/**
 * scripts/build-dist.js — 배포 패키지(dist/) 빌더
 *
 * 사용법:
 *   node scripts/build-dist.js   (또는 npm run build:dist)
 *
 * 동작:
 *   - dist/ 를 삭제 후 재생성하고 배포에 필요한 파일만 복사
 *   - 포함: 서버 코드, admin/client/docs, data/app.db·schema.sql·uploads·generated,
 *           운영 스크립트 4종(backup/restore-db/init-db/dump_schema), .env.example
 *   - 제외: node_modules, .git, .env(개발용), data/backups, data/db.sqlite,
 *           scripts 의 일회성 파일(_*, audit-*, check-*, fix-*, deprecated)
 *
 * 대상 PC 절차:
 *   1) Node.js 20+ 설치 → dist 압축 해제
 *   2) npm install --omit=dev
 *   3) .env.example 을 복사해 .env 작성 (JWT_SECRET 필수)
 *   4) npm run prod (또는 node server.js)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ── 포함 목록 ──
const ROOT_FILES = ['server.js', 'index.html', 'package.json', 'package-lock.json', 'start-server.bat', 'start-server.sh'];
const DIRS = ['lib', 'routes', 'middleware', 'admin', 'client', '.well-known'];
const SCRIPTS = ['backup.js', 'restore-db.js', 'init-db.js', 'dump_schema.js'];
const DATA_FILES = ['app.db', 'schema.sql'];
const DATA_DIRS = ['uploads', 'generated'];
const ENV_EXAMPLE = '.env.example';

let fileCount = 0;
let totalBytes = 0;

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  fileCount++;
  totalBytes += fs.statSync(src).size;
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

// ── 1) dist 초기화 ──
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// ── 2) 루트 파일 ──
for (const f of ROOT_FILES) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) copyFile(src, path.join(DIST, f));
}

// ── 3) 디렉터리 ──
for (const d of DIRS) copyDir(path.join(ROOT, d), path.join(DIST, d));

// ── 4) 운영 스크립트만 ──
for (const s of SCRIPTS) {
  const src = path.join(ROOT, 'scripts', s);
  if (fs.existsSync(src)) copyFile(src, path.join(DIST, 'scripts', s));
}

// ── 5) data: app.db, schema.sql + uploads/generated (있으면) ──
for (const f of DATA_FILES) {
  const src = path.join(ROOT, 'data', f);
  if (fs.existsSync(src)) copyFile(src, path.join(DIST, 'data', f));
}
for (const d of DATA_DIRS) copyDir(path.join(ROOT, 'data', d), path.join(DIST, 'data', d));

// ── 6) .env.example (있으면) ──
const envExample = path.join(ROOT, ENV_EXAMPLE);
if (fs.existsSync(envExample)) copyFile(envExample, path.join(DIST, ENV_EXAMPLE));

console.log(`[build-dist] 완료: ${path.relative(ROOT, DIST)} (파일 ${fileCount}개, ${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`[build-dist] Windows: npm install --omit=dev → .env 작성 → npm run prod`);
console.log(`[build-dist] Linux(Amazon Linux): npm install --omit=dev → .env 작성(DEV=false) → ./start-server.sh  (상세: docs/DEPLOY_AMAZON_LINUX.md)`);
