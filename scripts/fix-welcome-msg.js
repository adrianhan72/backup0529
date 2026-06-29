const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'app.db'));

const co = db.prepare('SELECT representative FROM companies WHERE id = ?').get('comp-welcome-test');
const repName = co?.representative || '대표';

const newBody = `안녕하세요, ${repName} 대표님.

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

db.prepare(`UPDATE company_notices
  SET employee_id = '',
      employee_name = '',
      body = ?,
      updated_at = ?
  WHERE id = 'notice-welcome-01'`).run(newBody, Date.now());

console.log('✅ 수정 완료');
console.log('대표자명:', repName);
console.log('employee_id: (비움)');
console.log('employee_name: (비움)');
console.log('\n--- 본문 ---');
console.log(newBody);

db.close();
