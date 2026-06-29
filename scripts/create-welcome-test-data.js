/**
 * 환영 메시지 테스트 데이터 생성 스크립트
 * 실행: node scripts/create-welcome-test-data.js
 */
const Database = require('better-sqlite3');
const path     = require('path');
const { v4: uuid } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const now = Date.now();
const YESTERDAY = '2026-06-28';
const ACCESS_CODE = 'WLCM2026';

// ═══════════════════════════════════════════════════
// 1. 고객사 생성
// ═══════════════════════════════════════════════════
const companyId = 'comp-welcome-test';

const existingCo = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId);
if (existingCo) {
  console.log('⚠️  기존 테스트 고객사 삭제 후 재생성...');
  db.prepare('DELETE FROM company_notices WHERE company_id = ?').run(companyId);
  db.prepare('DELETE FROM contracts WHERE company_id = ?').run(companyId);
  db.prepare('DELETE FROM employees WHERE company_id = ?').run(companyId);
  db.prepare('DELETE FROM companies WHERE id = ?').run(companyId);
}

db.prepare(`INSERT INTO companies (
  id, company_name, business_number, representative, industry,
  address, phone, email, pay_period, pay_day, access_code,
  insurance_basis, annual_leave_basis, is_draft, status,
  created_at, updated_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  companyId,
  '환영테스트 주식회사',
  '123-45-67890',
  '김테스트',
  'IT/소프트웨어',
  '서울특별시 강남구 테헤란로 123',
  '02-1234-5678',
  'test@welcometest.com',
  'monthly',
  25,
  ACCESS_CODE,
  '입사일 기준',
  '회계년도 기준',
  0,
  'active',
  now,
  now
);

console.log('✅ 고객사 생성 완료:', companyId);

// ═══════════════════════════════════════════════════
// 2. 직원 생성
// ═══════════════════════════════════════════════════
const employeeId = 'emp-welcome-01';

db.prepare(`INSERT INTO employees (
  id, company_id, name, gender, employment_category, employee_number,
  department, position, hire_date, status, phone, email,
  created_at, updated_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  employeeId,
  companyId,
  '박환영',
  'male',
  'regular',
  'EMP001',
  '개발팀',
  '선임',
  YESTERDAY,
  'active',
  '010-1111-2222',
  'park@welcometest.com',
  now,
  now
);

console.log('✅ 직원 생성 완료:', employeeId);

// ═══════════════════════════════════════════════════
// 3. 계약 생성 (시작일: 어제)
// ═══════════════════════════════════════════════════
const contractId = 'ct-welcome-01';

db.prepare(`INSERT INTO contracts (
  id, employee_id, company_id,
  contract_start, contract_end,
  work_hours_per_day, work_days_per_week,
  monthly_salary_agreed, hourly_wage,
  contract_type, status, pay_period,
  created_at, updated_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  contractId,
  employeeId,
  companyId,
  YESTERDAY,           // contract_start = 2026-06-28
  '2027-06-27',        // 1년 계약
  8,                   // work_hours_per_day
  5,                   // work_days_per_week
  3500000,             // monthly_salary_agreed
  16746,               // hourly_wage
  'regular',
  'active',
  'monthly',
  now,
  now
);

console.log('✅ 계약 생성 완료:', contractId);

// ═══════════════════════════════════════════════════
// 4. 환영 알림 생성 (어제 09:00 발송 완료)
// ═══════════════════════════════════════════════════
const noticeId = 'notice-welcome-01';
const sentAt = new Date(`${YESTERDAY}T09:00:00+09:00`).toISOString();
const sentAtMs = new Date(`${YESTERDAY}T09:00:00+09:00`).getTime();

const title = '[인사톡 노무톡] 서비스 가입을 환영합니다! 🎉';
const body = `안녕하세요, 김테스트 대표님.

인사톡 노무톡 서비스에 가입해 주셔서 진심으로 감사드립니다.

✅ 가입 완료 안내
• 서비스 시작일: 2026년 6월 28일

📋 주요 기능
• 급여 명세서 발송 및 조회
• 근로 계약서 전자 발송
• 연차 휴가 관리
• 정규직 전환 알림
• 퇴직금 계산

감사합니다.
인사톡 노무톡 드림`;

db.prepare(`INSERT INTO company_notices (
  id, company_id, company_name,
  notice_type, title, body,
  contract_id, employee_id, employee_name,
  contract_end, days_until_expiry,
  sent_at, sent_by, is_read, read_at,
  gn_status, gn_scheduled_at,
  created_at, updated_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
  noticeId,
  companyId,
  '환영테스트 주식회사',
  'welcome',           // notice_type
  title,
  body,
  contractId,
  '',                  // employee_id → 고객사 대상 알림이므로 비움
  '',                  // employee_name → 고객사 대상 알림이므로 비움
  '2027-06-27',
  364,
  sentAt,              // sent_at = 어제 09:00
  '마스터관리자',
  0,                   // is_read (0 = 미읽음)
  '',
  'sent',              // gn_status = 발송 완료
  '',
  sentAtMs,
  sentAtMs
);

console.log('✅ 환영 알림 생성 완료:', noticeId);

// ═══════════════════════════════════════════════════
// 결과 출력
// ═══════════════════════════════════════════════════
console.log('\n' + '='.repeat(60));
console.log('🎉 테스트 데이터 생성 완료!');
console.log('='.repeat(60));
console.log('');
console.log('📋 고객사 정보');
console.log('   회사명   : 환영테스트 주식회사');
console.log('   접속코드 : ' + ACCESS_CODE);
console.log('   업종     : IT/소프트웨어');
console.log('');
console.log('📱 고객사 앱 접속 방법');
console.log('   1. http://localhost:3000/client/ 접속');
console.log('   2. 접속 코드 입력: ' + ACCESS_CODE);
console.log('   3. 로그인 후 알림함(🔔)에서 환영 메시지 확인');
console.log('');
console.log('📝 환영 알림 정보');
console.log('   발송일시 : 2026년 6월 28일 오전 09:00');
console.log('   알림타입 : welcome');
console.log('   상태     : 발송 완료 (sent)');
console.log('');

db.close();
