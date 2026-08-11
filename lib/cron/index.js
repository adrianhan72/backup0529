/**
 * lib/cron/index.js — CronWorkerManager
 *
 * Main Thread에서 Worker Thread를 생성/관리합니다.
 * Worker에서 보낸 로그를 콘솔에 출력하고, health 상태를 수집합니다.
 */
const { Worker } = require('worker_threads');
const path = require('path');

class CronWorkerManager {
    #worker = null;
    #health = {};
    #dbPath;
    #solapiConfig;

    /**
     * @param {string} dbPath — SQLite DB 파일 경로
     * @param {object} solapiConfig — { apiKey, apiSecret, pfId, defaultSender }
     */
    constructor(dbPath, solapiConfig) {
        this.#dbPath = dbPath;
        this.#solapiConfig = solapiConfig;
    }

    /** Worker Thread 시작 */
    start() {
        this.#worker = new Worker(path.join(__dirname, 'worker.js'), {
            workerData: {
                dbPath: this.#dbPath,
                solapiConfig: this.#solapiConfig,
            }
        });

        this.#worker.on('message', (msg) => {
            if (msg.type === 'log') {
                const prefix = `[CRON:${msg.job}]`;
                if (msg.level === 'error') console.error(prefix, msg.message);
                else if (msg.level === 'warn')  console.warn(prefix, msg.message);
                else                             console.log(prefix, msg.message);
            }
            if (msg.type === 'health') {
                this.#health[msg.data.job] = msg.data;
            }
        });

        this.#worker.on('error', (err) =>
            console.error('[CRON:Worker] Thread error:', err.message));

        this.#worker.on('exit', (code) =>
            console.warn(`[CRON:Worker] Thread exited (code=${code})`));

        console.log('[CRON] Worker Thread started');
    }

    /** Worker Thread 종료 요청 (Graceful) */
    stop() {
        if (this.#worker) {
            this.#worker.postMessage({ type: 'shutdown' });
            // 5초 후에도 종료되지 않으면 강제 종료
            setTimeout(() => {
                try { this.#worker?.terminate(); } catch {}
            }, 5000);
        }
    }

    /** 현재 크론 health 상태 반환 (GET /health/cron) */
    getHealth() {
        return this.#health;
    }
}

module.exports = { CronWorkerManager };
