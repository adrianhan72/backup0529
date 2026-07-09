// scripts/build-notices-helper.cjs v2
const fs = require('fs');
const src = fs.readFileSync('admin/js/modules/contract/contract-lifecycle.mjs', 'utf-8');

// 헬퍼 함수
const helperFn = `
function _buildLifecycleBody(p) {
  const periodLine = p.period ? \`■ 계약 기간: \${p.period}\\n\` : '';
  const extraLine  = p.extra  ? p.extra + '\\n' : '';
  return \`안녕하세요\${p.coRep}.

\${p.message}

■ 근로자: \${p.empName}
■ 고용형태: \${p.contractType}
\${periodLine}\${extraLine}■ 처리 일시: \${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

\${window._BRAND_SIG}\`;
}
`;

// 각 body 템플릿을 순서대로 찾아서 치환
// 패턴: body :\n(공백)` ... _BRAND_SIG}` 
const bodyRe = /(body\s*:\s*\n\s*)`([^`]*_BRAND_SIG}\s*)`/g;

// 각 body의 메시지로 분류
const msgMap = [
  { msg: '계약 해지가 예약', extra: true },   // 0
  { msg: '근로계약이 해지 처리', extra: false, isPendEmp: true },  // 1
  { msg: '근로계약 내용이 수정', extra: true, hasNewStatus: true, isPendEmp: true },  // 2
  { msg: '계약 해지 예정이 취소', extra: true },  // 3
  { msg: '근로계약이 파기 처리', extra: true },   // 4
  { msg: '계약 갱신이 예약', extra: true },        // 5
  { msg: '계약 갱신이 완료', extra: true },         // 6
  { msg: '근로계약이 해지 처리', extra: false, isSaveContract: true },  // 7
  { msg: '근로계약 내용이 수정', extra: false, isSaveContract: true },  // 8
  { msg: '재계약이 완료', extra: true },            // 9
  { msg: '근로계약이 새로 작성', extra: true },      // 10
];

// 수동으로 순서대로 치환 (각 body를 정확히 찾아야 함)
let out = src;
let count = 0;

// 모든 body 위치 찾기
const bodies = [...src.matchAll(bodyRe)];
console.log(`Found ${bodies.length} bodies`);

if (bodies.length !== 11) {
  console.error('Expected 11, found', bodies.length);
  // show first few
  bodies.slice(0,3).forEach((b,i) => console.log(i, b[2].substring(0,60)));
}

// 역순으로 치환 (인덱스 보존)
for (let i = bodies.length - 1; i >= 0; i--) {
  const b = bodies[i];
  const content = b[2];
  const map = msgMap[i];
  
  // 변수명 추론
  let empVar, ctVar, periodVar, extraVar = null;
  
  if (content.includes('_pendEmp.name')) {
    empVar = '_pendEmp.name||\'\'';
    ctVar = '_w(\'contractTypeLabel\')(c.contract_type)||c.contract_type||\'\'';
    if (content.includes('newStart')) periodVar = '_fmtD(newStart)+(newEnd?\' ~ \'+_fmtD(newEnd):\' (기간 미정)\')';
    else periodVar = '_fmtD(c.contract_start)+(c.contract_end?\' ~ \'+_fmtD(c.contract_end):\'\')';
  } else if (content.includes('_voidEmp.name')) {
    empVar = '_voidEmp.name||\'\'';
    ctVar = '_w(\'contractTypeLabel\')(c.contract_type)||c.contract_type||\'\'';
    periodVar = '_fmtD(c.contract_start)+(c.contract_end?\' ~ \'+_fmtD(c.contract_end):\' (기간 미정)\')';
  } else if (content.includes('_renewEmp.name')) {
    empVar = '_renewEmp.name||\'\'';
    ctVar = '_w(\'contractTypeLabel\')(c.contract_type)||c.contract_type||\'\'';
    periodVar = 'null';
  } else if (content.includes('empName')) {
    empVar = 'empName';
    ctVar = '_w(\'contractTypeLabel\')(c.contract_type)||c.contract_type||\'\'';
    periodVar = '_fmtD(c.contract_start)+(c.contract_end?\' ~ \'+_fmtD(c.contract_end):\' (기간 미정)\')';
  } else {
    empVar = '_empName';
    ctVar = '_w(\'contractTypeLabel\')(contractType)||contractType';
    if (content.includes('_fmtDate(contractStart)')) {
      periodVar = '`${_fmtDate(contractStart)} ~ ${_fmtDate(contractEnd || _origC.contract_end || \'\')}`';
    } else {
      periodVar = '_fmtDate(contractStart)+(contractEnd?\' ~ \'+_fmtDate(contractEnd):\' (기간 미정)\')';
    }
  }
  
  // extra 추출
  if (map.extra) {
    // Find the unique line(s) between period and 처리일시
    const afterPeriod = content.split('■ 계약 기간:')[1] || content.split('■ 기존 계약')[1] || '';
    const beforeTimestamp = afterPeriod.split('■ 처리 일시')[0] || '';
    const extraLines = beforeTimestamp.trim();
    if (extraLines) {
      extraVar = '`' + extraLines.replace(/\n/g, '\\n').replace(/\$\{/g, '\\${').replace(/`/g, '\\`') + '`';
    }
  }
  
  // message 추출
  const msgLine = content.split('\n').filter(l => l.includes('소속 근로자') || l.includes('재계약이') || l.includes('계약 해지') || l.includes('계약 갱신이'))[0] || '';
  const message = msgLine.trim();
  
  const parts = [`coRep: _coRep`, `empName: ${empVar}`, `contractType: ${ctVar}`];
  if (periodVar) parts.push(`period: ${periodVar}`);
  parts.push(`message: '${message}'`);
  if (extraVar) parts.push(`extra: ${extraVar}`);
  
  const newCall = `_buildLifecycleBody({ ${parts.join(', ')} })`;
  
  out = out.slice(0, b.index) + b[1] + newCall + out.slice(b.index + b[0].length);
  count++;
}

// Insert helper
const insertPos = out.indexOf('const _w = (name) => window[name];') + 'const _w = (name) => window[name];\n'.length;
out = out.slice(0, insertPos) + '\n' + helperFn + out.slice(insertPos);

console.log(`Replaced ${count} templates`);
fs.writeFileSync('admin/js/modules/contract/contract-lifecycle.mjs', out, 'utf-8');
console.log(`Lines: ${out.split('\\n').length}`);
