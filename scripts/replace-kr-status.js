/**
 * 한글 상태값 문자열 → 상수 참조로 일괄 교체
 * usage: node scripts/replace-kr-status.js
 */
const fs = require('fs');
const path = require('path');

// 없으면 수동으로 파일 목록 사용
const JS_DIR = path.join(__dirname, '..', 'admin', 'js');

// 교체 규칙: [정규식, 치환문자열] — 비교문(===) 및 할당문(status:)만 대상
const replacements = [
  // ── companies.status 비교문 ──
  [/\.status\s*===?\s*'이용중'/g, ".status===COMPANY_STATUS.ACTIVE"],
  [/\.status\s*!==?\s*'이용중'/g, ".status!==COMPANY_STATUS.ACTIVE"],
  [/\.status\s*===?\s*'해지'(?!예정)/g, ".status===COMPANY_STATUS.INACTIVE"],
  [/\.status\s*===?\s*'임시저장'/g, ".status===COMPANY_STATUS.DRAFT"],
  
  // ── employees.status 비교문 ──
  [/\.status\s*===?\s*'재직'/g, ".status===EMP_STATUS.ACTIVE"],
  [/\.status\s*===?\s*'퇴직'(?!금)/g, ".status===EMP_STATUS.RESIGNED"],
  [/\.status\s*===\s*'active'(?!\w)/g, ".status===EMP_STATUS.ACTIVE"],
  [/\.status\s*===\s*'resigned'(?!\w)/g, ".status===EMP_STATUS.RESIGNED"],
  
  // ── contracts.status 비교문 ──
  [/\.status\s*===?\s*'활성'/g, ".status===CONTRACT_STATUS.ACTIVE"],
  [/\.status\s*===?\s*'만료'/g, ".status===CONTRACT_STATUS.EXPIRED"],
  [/\.status\s*===?\s*'파기'/g, ".status===CONTRACT_STATUS.VOIDED"],
  [/\.status\s*===?\s*'취소'(?!진행)/g, ".status===CONTRACT_STATUS.CANCELED"],
  [/\.status\s*===?\s*'계약예정'/g, ".status===CONTRACT_STATUS.PENDING"],
  [/\.status\s*===?\s*'갱신예정'/g, ".status===CONTRACT_STATUS.RENEWAL_PENDING"],
  [/\.status\s*===?\s*'해지예정'/g, ".status===CONTRACT_STATUS.TERMINATE_PENDING"],
  [/\.status\s*===?\s*'서류미비'/g, ".status===CONTRACT_STATUS.DOCS_INCOMPLETE"],
  [/\.status\s*===?\s*'갱신됨'/g, ".status===CONTRACT_STATUS.RENEWED"],
  [/\.status\s*===?\s*'expired'(?!\w)/g, ".status===CONTRACT_STATUS.EXPIRED"],
  [/\.status\s*===?\s*'terminated'(?!\w)/g, ".status===CONTRACT_STATUS.TERMINATED"],

  // ── contract_type / employment_category 비교문 ──
  [/===?\s*'정규직 수습'/g, "===CONTRACT_TYPE.REGULAR_PROBATION"],
  [/===?\s*'정규직'(?! 수습)(?!\w)/g, "===CONTRACT_TYPE.REGULAR"],
  [/===?\s*'계약직 수습'/g, "===CONTRACT_TYPE.FIXED_PROBATION"],
  [/===?\s*'계약직'(?! 수습)(?!\w)/g, "===CONTRACT_TYPE.FIXED"],
  [/===?\s*'일용직'/g, "===CONTRACT_TYPE.DAILY"],

  // ── billing.payment_status 비교문 ──
  [/===?\s*'납부대기'/g, "===PAYMENT_STATUS.PENDING"],
  [/===?\s*'일부납'/g, "===PAYMENT_STATUS.PARTIAL"],
  [/===?\s*'미납'(?!금)/g, "===PAYMENT_STATUS.UNPAID"],
  [/===?\s*'완납'/g, "===PAYMENT_STATUS.PAID"],

  // ── PATCH body 등 status 할당문 ──
  [/status:\s*'활성'/g, "status: CONTRACT_STATUS.ACTIVE"],
  [/status:\s*'만료'/g, "status: CONTRACT_STATUS.EXPIRED"],
  [/status:\s*'해지예정'/g, "status: CONTRACT_STATUS.TERMINATE_PENDING"],
  [/status:\s*'해지'(?!예정)/g, "status: CONTRACT_STATUS.TERMINATED"],
  [/status:\s*'파기'/g, "status: CONTRACT_STATUS.VOIDED"],
  [/status:\s*'서류미비'/g, "status: CONTRACT_STATUS.DOCS_INCOMPLETE"],
  [/status:\s*'계약예정'/g, "status: CONTRACT_STATUS.PENDING"],
  [/status:\s*'재직'/g, "status: EMP_STATUS.ACTIVE"],
  [/status:\s*'퇴직'(?!금)/g, "status: EMP_STATUS.RESIGNED"],

  // ── dispatch_method / send_method 비교문 ──
  [/===?\s*'알림톡'/g, "===DISPATCH_METHOD.KAKAO"],
  [/===?\s*'이메일'/g, "===DISPATCH_METHOD.EMAIL"],
  [/===?\s*'수동배부'/g, "===DISPATCH_METHOD.MANUAL"],
  [/===?\s*'수동 교부'/g, "===DISPATCH_METHOD.MANUAL"],
  [/===?\s*'직접배부'/g, "===DISPATCH_METHOD.MANUAL"],
  
  // ── dispatch_status 비교문 ──
  [/===?\s*'완료'/g, "===DISPATCH_STATUS.COMPLETED"],
  [/===?\s*'실패'/g, "===DISPATCH_STATUS.FAILED"],
  [/===?\s*'대기'/g, "===DISPATCH_STATUS.PENDING"],
];

// 건너뛸 파일
const SKIP = ['admin.js.bak', 'constants.js'];

function walkDir(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.name.endsWith('.js') && !SKIP.includes(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const files = walkDir(JS_DIR);
let totalChanges = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  replacements.forEach(([regex, replacement]) => {
    const newContent = content.replace(regex, replacement);
    if (newContent !== content) {
      changed = true;
      content = newContent;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.relative(JS_DIR, filePath)}`);
    totalChanges++;
  }
});

console.log(`\n📊 ${totalChanges}개 파일 업데이트 완료`);
