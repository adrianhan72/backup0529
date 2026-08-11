/**
 * lib/cron/worker.js — Worker Thread: 크론잡 실행 엔진
 *
 * Main Thread (Express) 와 완전히 분리된 이벤트 루프에서 실행됩니다.
 * better-sqlite3의 동기 블록이 Express에 영향을 주지 않습니다.
 */
const { workerData, parentPort } = require('worker_threads');
const Database = require('better-sqlite3');
const { CronJob } = require('cron');
const { createSolapiClient } = require('../solapi');
const { log } = require('./utils');

// ── DB (별도 연결, WAL 모드로 Main Thread와 동시성 확보) ──
const db = new Database(workerData.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// ── Solapi ──
const solapiCfg = workerData.solapiConfig || {};
const solapi = createSolapiClient();

// ── DB 숏컷 ──
const $ = {
    all:  (sql, p = []) => db.prepare(sql).all(...p),
    get:  (sql, p = []) => db.prepare(sql).get(...p) || null,
    run:  (sql, p = []) => db.prepare(sql).run(...p),
};

// ── 크론 작업 import ──
const jobs = {
    'scheduled-notice':          require('./jobs/scheduled-notice'),
    'contract-expiry':           require('./jobs/contract-expiry'),
    'regular-conversion':        require('./jobs/regular-conversion'),
    'regular-conversion-weekly': require('./jobs/regular-conversion-weekly'),
    'probation-expiry':          require('./jobs/probation-expiry'),
    'kakao-retry':               require('./jobs/kakao-retry'),
    'retention-cleanup':         require('./jobs/retention-cleanup'),
};

// ── 프리픽스 ID 생성 (utils 의존 회피) ──
function generateId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── 실행 래퍼: run(name, cronExpr, jobFn) ──
function register(name, cronExpr, jobFn) {
    new CronJob(cronExpr, async () => {
        const start = Date.now();
        log('info', 'START', name);
        try {
            const result = await jobFn({ $, solapi, log, generateId, name });
            const elapsed = Date.now() - start;
            log('info', `END — ${result?.processed ?? '?'}건 처리 (${elapsed}ms)`, name);
            parentPort?.postMessage({
                type: 'health',
                data: { job: name, lastRun: new Date().toISOString(), ok: true, elapsed }
            });
        } catch (e) {
            log('error', `FAIL: ${e.message}`, name);
            parentPort?.postMessage({
                type: 'health',
                data: { job: name, lastRun: new Date().toISOString(), ok: false, error: e.message }
            });
        }
    }, null, true, 'Asia/Seoul', null, true);
    //     ↑ start  ↑ timezone         ↑ waitForCompletion
}

// ── 크론 등록 (스케줄 분산: 09:00 동시 실행 방지) ──
register('scheduled-notice',          '* * * * *',    jobs['scheduled-notice']);
register('contract-expiry',           '0 9 * * *',    jobs['contract-expiry']);
register('regular-conversion',        '10 9 * * *',   jobs['regular-conversion']);
register('regular-conversion-weekly', '0 9 * * 1',    jobs['regular-conversion-weekly']);
register('probation-expiry',          '20 9 * * *',   jobs['probation-expiry']);
register('kakao-retry',               '*/10 * * * *', jobs['kakao-retry']);
register('retention-cleanup',         '0 4 * * *',    jobs['retention-cleanup']);

// ── Main Thread 메시지 수신 ──
parentPort?.on('message', (msg) => {
    if (msg?.type === 'shutdown') {
        log('warn', 'Shutdown signal received — exiting');
        db.close();
        process.exit(0);
    }
});

log('info', '7개 크론잡 등록 완료');
