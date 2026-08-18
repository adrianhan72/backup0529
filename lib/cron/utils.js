const { parentPort } = require('worker_threads');

/**
 * 이벤트 루프를 양보하여 Worker Thread 내 다른 작업이 실행될 기회를 제공합니다.
 * setImmediate() → Node.js 이벤트 루프 Phase 5 (Check)에서 resolve
 */
function yieldEventLoop() {
    return new Promise(resolve => setImmediate(resolve));
}

/**
 * 동기 작업이 포함된 루프를 배치 단위로 실행하며, 배치 사이마다 이벤트 루프를 양보합니다.
 * Worker Thread 내부에서도 여러 크론이 동시 실행될 수 있으므로 적용합니다.
 *
 * @param {Array} items         처리할 아이템 배열
 * @param {Function} fn         동기 처리 함수 (item, index) => void
 * @param {number} [batchSize=50]  몇 건마다 양보할지
 */
async function batchedSync(items, fn, batchSize = 50) {
    for (let i = 0; i < items.length; i++) {
        fn(items[i], i);
        if ((i + 1) % batchSize === 0 && i + 1 < items.length) {
            await yieldEventLoop();
        }
    }
}

/**
 * 대량 SELECT를 LIMIT/OFFSET 배치로 분할 조회, 배치 사이마다 양보합니다.
 *
 * @param {Function} queryFn   (limit, offset) => rows[]
 * @param {number} [batchSize=100]
 * @returns {Promise<Array>}   모든 row의 flat 배열
 */
async function batchedQuery(queryFn, batchSize = 100) {
    const all = [];
    let off = 0;
    while (true) {
        const rows = queryFn(batchSize, off);
        if (rows.length === 0) break;
        all.push(...rows);
        off += batchSize;
        if (rows.length === batchSize) await yieldEventLoop();
    }
    return all;
}

/**
 * Worker → Main Thread 로그 전송
 * @param {'info'|'warn'|'error'} level
 * @param {string} message
 * @param {string} [job='worker']
 */
function log(level, message, job = 'worker') {
    parentPort?.postMessage({ type: 'log', level, message, job });
}

/** 로컬 타임존 기준 'YYYY-MM-DD' — toISOString UTC 밀림 방지 (규칙) */
function fmtLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

module.exports = { yieldEventLoop, batchedSync, batchedQuery, log, fmtLocalDate };
