/**
 * lib/database.js — 인사톡 노무톡 Database + BaseRepository
 *
 * - DatabaseConnection: SQLite 연결 관리
 * - BaseRepository:     공통 CRUD + 컬럼/정렬 검증 (베이스)
 * - DB:                 Repository 팩토리 + 숏컷 제공
 *
 * 모든 Repository 클래스는 BaseRepository를 extends 하여 정의합니다.
 */

const path     = require('path');
const Database = require('better-sqlite3');
const { v4: uuid } = require('uuid');

// ─── 상수 ───────────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
const SORT_DIRS = new Set(['ASC', 'DESC']);
const RESERVED_PARAMS = new Set(['limit', 'page', 'sort', 'order']);

// ═══════════════════════════════════════════════════════════════════════════════
// Database 클래스 — 연결 관리 + 테이블 팩토리
// ═══════════════════════════════════════════════════════════════════════════════
class DatabaseConnection {
  /** @type {Map<string, import('better-sqlite3').Database>} */
  #db;

  /**
   * @param {string} dbPath — SQLite 파일 경로
   */
  constructor(dbPath) {
    this.#db = new Database(dbPath);
    this.#db.pragma('journal_mode = WAL');
    this.#db.pragma('foreign_keys = ON');
  }

  /** 원본 better-sqlite3 인스턴스 */
  get raw() { return this.#db; }

  /**
   * SQL 실행 (prepared statement)
   * @param {string} sql
   * @param {...any} params
   * @returns {import('better-sqlite3').Statement}
   */
  prepare(sql) { return this.#db.prepare(sql); }

  /**
   * 트랜잭션 래퍼
   * @param {() => void} fn
   */
  transaction(fn) {
    const tx = this.#db.transaction(fn);
    return tx();
  }

  close() { this.#db.close(); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BaseRepository — 모든 Repository 클래스의 부모
// ═══════════════════════════════════════════════════════════════════════════════
class BaseRepository {
  /** @type {string} */ #name;
  /** @type {DatabaseConnection} */ #conn;
  /** @type {Set<string>|null} */ #columns = null;
  /** @type {Set<string>|null} */ #sortable  = null;

  /**
   * @param {string} tableName — DB 테이블명
   * @param {DatabaseConnection} conn — DB 연결 인스턴스
   */
  constructor(tableName, conn) {
    this.#name = tableName;
    this.#conn = conn;
  }

  // ── 기본 getter ──────────────────────────────────────────────────────────
  get tableName()  { return this.#name; }
  get db()         { return this.#conn.raw; }
  get connection() { return this.#conn; }

  // ── 컬럼 정보 (PRAGMA 기반 자동 추출) ───────────────────────────────────
  /**
   * 테이블의 모든 컬럼명 Set (id 포함) — PRAGMA table_info 캐싱
   * @returns {Set<string>}
   */
  get columns() {
    if (!this.#columns) {
      const rows = this.#conn.raw.prepare(`PRAGMA table_info(${this.#name})`).all();
      this.#columns = new Set(rows.map(r => r.name));
    }
    return this.#columns;
  }

  /**
   * 정렬 가능 컬럼 — BLOB 타입 제외
   * @returns {Set<string>}
   */
  get sortableColumns() {
    if (!this.#sortable) {
      const rows = this.#conn.raw.prepare(`PRAGMA table_info(${this.#name})`).all();
      this.#sortable = new Set(
        rows.filter(r => r.type.toUpperCase() !== 'BLOB').map(r => r.name)
      );
    }
    return this.#sortable;
  }

  // ── 컬럼 검증 ───────────────────────────────────────────────────────────
  /**
   * 지정된 키가 테이블의 유효 컬럼인지 검증
   * @param {string[]} keys
   * @throws {Error} 유효하지 않은 컬럼이 있을 경우
   */
  validateColumns(keys) {
    for (const key of keys) {
      if (key === 'id') continue;             // id는 항상 허용
      if (!this.columns.has(key)) {
        throw new Error(`Invalid column for ${this.#name}: ${key}`);
      }
    }
  }

  // ── WHERE 빌더 ──────────────────────────────────────────────────────────
  /**
   * 쿼리 파라미터 → WHERE 절 + 값 배열
   * @param {object} params
   * @returns {{where:string, values:any[]}}
   */
  buildWhere(params = {}) {
    const clauses = [];
    const values  = [];
    for (const [k, v] of Object.entries(params)) {
      if (RESERVED_PARAMS.has(k) || v === undefined || v === null || v === '') continue;
      // operator 지원: key__op=value  (예: contract_start__gte=2026-01-01)
      const parts = k.split('__');
      const col = parts[0];
      const op  = parts[1] || '=';
      const OPS = { '=': '=', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=',
                    'like': 'LIKE', 'in': 'IN' };
      const sqlOp = OPS[op] || '=';
      if (sqlOp === 'IN') {
        // in 은 값이 배열이라고 가정 → 안전을 위해 무시
        continue;
      }
      clauses.push(`${col} ${sqlOp} ?`);
      values.push(v);
    }
    return {
      where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
      values,
    };
  }

  // ── ORDER BY 빌더 ───────────────────────────────────────────────────────
  /**
   * @param {object} params — { sort, order }
   * @returns {string}
   */
  buildOrder(params = {}) {
    if (!params.sort || !this.sortableColumns.has(params.sort)) return '';
    const dir = SORT_DIRS.has(String(params.order).toUpperCase())
      ? String(params.order).toUpperCase()
      : 'DESC';
    return `ORDER BY ${params.sort} ${dir}`;
  }

  // ── 공통 CRUD ───────────────────────────────────────────────────────────

  /**
   * 목록 조회 (페이징)
   * @param {object} [params={}] — WHERE 조건 + {sort, order, limit, page}
   * @returns {{data:object[], total:number, page:number, limit:number}}
   */
  find(params = {}) {
    const { where, values } = this.buildWhere(params);
    const order = this.buildOrder(params);
    const limit = Math.min(parseInt(params.limit) || 200, 1000);
    const page  = Math.max(parseInt(params.page)  || 1,   1);
    const offset = (page - 1) * limit;

    const rows = this.#conn.raw.prepare(
      `SELECT * FROM ${this.#name} ${where} ${order} LIMIT ? OFFSET ?`
    ).all(...values, limit, offset);

    const total = this.#conn.raw.prepare(
      `SELECT COUNT(*) AS cnt FROM ${this.#name} ${where}`
    ).get(...values).cnt;

    return { data: rows, total, page, limit };
  }

  /**
   * 단건 조회 (ID)
   * @param {string} id
   * @returns {object|null}
   */
  findById(id) {
    return this.#conn.raw.prepare(`SELECT * FROM ${this.#name} WHERE id = ?`).get(id) || null;
  }

  /**
   * 조건으로 단건 조회
   * @param {object} where — {col:val, ...}
   * @returns {object|null}
   */
  findOne(where = {}) {
    const { where: w, values } = this.buildWhere(where);
    if (!w) return null;
    return this.#conn.raw.prepare(`SELECT * FROM ${this.#name} ${w} LIMIT 1`).get(...values) || null;
  }

  /**
   * 신규 레코드 삽입
   * @param {object} data
   * @returns {object} 삽입된 레코드
   */
  insert(data) {
    this.validateColumns(Object.keys(data));
    const now = Date.now();
    const row = { ...data };
    if (!row.id) row.id = uuid();
    if (!row.created_at) row.created_at = now;
    row.updated_at = now;

    const cols = Object.keys(row);
    const vals = cols.map(k => this.#toSQL(row[k]));
    this.#conn.raw.prepare(
      `INSERT INTO ${this.#name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    ).run(...vals);
    return this.findById(row.id);
  }

  /**
   * Upsert (id 있으면 UPDATE, 없으면 INSERT)
   * @param {string} id
   * @param {object} data
   * @returns {object}
   */
  upsert(id, data) {
    this.validateColumns(Object.keys({ ...data, id }));
    const now = Date.now();
    const row = { ...data, id, updated_at: now };
    const cols = Object.keys(row);
    const vals = cols.map(k => this.#toSQL(row[k]));

    if (this.findById(id)) {
      this.#conn.raw.prepare(
        `UPDATE ${this.#name} SET ${cols.map(c => c + ' = ?').join(', ')} WHERE id = ?`
      ).run(...vals, id);
    } else {
      if (!row.created_at) row.created_at = now;
      this.#conn.raw.prepare(
        `INSERT INTO ${this.#name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      ).run(...vals);
    }
    return this.findById(id);
  }

  /**
   * 부분 업데이트 (PATCH)
   * @param {string} id
   * @param {object} data
   * @returns {object|null}
   */
  patch(id, data) {
    if (!this.findById(id)) return null;
    this.validateColumns(Object.keys(data));
    const row = { ...data, updated_at: Date.now() };
    const cols = Object.keys(row);
    const vals = cols.map(k => this.#toSQL(row[k]));
    this.#conn.raw.prepare(
      `UPDATE ${this.#name} SET ${cols.map(c => c + ' = ?').join(', ')} WHERE id = ?`
    ).run(...vals, id);
    return this.findById(id);
  }

  /**
   * 레코드 삭제
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const r = this.#conn.raw.prepare(`DELETE FROM ${this.#name} WHERE id = ?`).run(id);
    return r.changes > 0;
  }

  /**
   * COUNT 쿼리
   * @param {object} [where={}]
   * @returns {number}
   */
  count(where = {}) {
    const { where: w, values } = this.buildWhere(where);
    return this.#conn.raw.prepare(`SELECT COUNT(*) AS cnt FROM ${this.#name} ${w}`).get(...values).cnt;
  }

  /**
   * 일괄 삽입 (트랜잭션)
   * @param {object[]} rows
   */
  insertMany(rows) {
    const insert = this.#conn.raw.prepare(
      `INSERT INTO ${this.#name} (${Object.keys(rows[0]).join(', ')}) VALUES (${Object.keys(rows[0]).map(() => '?').join(', ')})`
    );
    const tx = this.#conn.raw.transaction((items) => {
      for (const row of items) {
        this.validateColumns(Object.keys(row));
        const r = { ...row, id: row.id || uuid(), created_at: row.created_at || Date.now(), updated_at: Date.now() };
        insert.run(...Object.keys(rows[0]).map(k => this.#toSQL(r[k])));
      }
    });
    tx(rows);
  }

  // ── private helpers ──────────────────────────────────────────────────────
  /** @private */
  #toSQL(v) {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'object' && v !== null) return JSON.stringify(v);
    return v;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DB — Repository 팩토리 + 숏컷
// ═══════════════════════════════════════════════════════════════════════════════
class DB {
  /** @type {DatabaseConnection} */
  #conn;
  /** @type {Map<string, BaseRepository>} */
  #repos = new Map();

  /**
   * @param {string} dbPath
   */
  constructor(dbPath) {
    this.#conn = new DatabaseConnection(dbPath);
    this.#registerAll();
  }

  get raw() { return this.#conn.raw; }
  get connection() { return this.#conn; }

  // ── 지연 등록 ────────────────────────────────────────────────────────────
  #registerAll() {
    // Repository 클래스들은 require 순환 참조를 피하기 위해 lazy 로딩
  }

  /**
   * Repository 인스턴스 획득
   * @param {string} name
   * @returns {BaseRepository}
   */
  table(name) {
    if (!this.#repos.has(name)) {
      const RepoClass = this.#resolveRepoClass(name);
      // BaseRepository는 (tableName, conn) 시그니처, 커스텀 Repo는 (conn) 시그니처
      if (RepoClass === BaseRepository) {
        this.#repos.set(name, new BaseRepository(name, this.#conn));
      } else {
        this.#repos.set(name, new RepoClass(this.#conn));
      }
    }
    return this.#repos.get(name);
  }

  /** @private */
  #resolveRepoClass(name) {
    switch (name) {
      case 'companies':                 return require('./repositories/companiesRepository').CompaniesRepository;
      case 'employees':                 return require('./repositories/employeesRepository').EmployeesRepository;
      case 'contracts':                 return require('./repositories/contractsRepository').ContractsRepository;
      case 'payrolls':                  return require('./repositories/payrollsRepository').PayrollsRepository;
      case 'billing':                   return require('./repositories/billingRepository').BillingRepository;
      case 'contract_dispatch':         return require('./repositories/contractDispatchRepository').ContractDispatchRepository;
      case 'consent_dispatch':          return require('./repositories/consentDispatchRepository').ConsentDispatchRepository;
      case 'contract_expiry_notice':    return require('./repositories/contractExpiryNoticeRepository').ContractExpiryNoticeRepository;
      case 'company_notices':           return require('./repositories/companyNoticesRepository').CompanyNoticesRepository;
      case 'payroll_send_logs':         return require('./repositories/payrollSendLogsRepository').PayrollSendLogsRepository;
      case 'annual_leave_ledger':       return require('./repositories/annualLeaveLedgerRepository').AnnualLeaveLedgerRepository;
      case 'annual_leave_promotions':   return require('./repositories/annualLeavePromotionsRepository').AnnualLeavePromotionsRepository;
      case 'company_history':           return require('./repositories/companyHistoryRepository').CompanyHistoryRepository;
      case 'wage_ledger_notifications': return require('./repositories/wageLedgerNotificationsRepository').WageLedgerNotificationsRepository;
      case 'admin_accounts':            return require('./repositories/adminAccountsRepository').AdminAccountsRepository;
      case 'insurance_rates':           return require('./repositories/insuranceRatesRepository').InsuranceRatesRepository;
      case 'minimum_wages':             return require('./repositories/minimumWagesRepository').MinimumWagesRepository;
      default:                          return BaseRepository;
    }
  }

  // ── 주요 테이블 숏컷 (자주 쓰는 테이블은 getter로) ──────────────────────
  get companies()             { return this.table('companies'); }
  get employees()             { return this.table('employees'); }
  get contracts()             { return this.table('contracts'); }
  get payrolls()              { return this.table('payrolls'); }
  get billing()               { return this.table('billing'); }
  get contract_dispatch()     { return this.table('contract_dispatch'); }
  get contract_expiry_notice(){ return this.table('contract_expiry_notice'); }
  get company_notices()       { return this.table('company_notices'); }
  get payroll_send_logs()     { return this.table('payroll_send_logs'); }
  get annual_leave_ledger()   { return this.table('annual_leave_ledger'); }
  get annual_leave_promotions(){ return this.table('annual_leave_promotions'); }
  get company_history()       { return this.table('company_history'); }
  get wage_ledger_notifications(){ return this.table('wage_ledger_notifications'); }
  get admin_accounts()        { return this.table('admin_accounts'); }
  get insurance_rates()       { return this.table('insurance_rates'); }
  get minimum_wages()         { return this.table('minimum_wages'); }

  close() { this.#conn.close(); }
}

module.exports = { DatabaseConnection, BaseRepository, DB };
