// scripts/extract-notices.cjs — contract-lifecycle.mjs 알림 본문 추출
const fs = require('fs');

const src = fs.readFileSync('admin/js/modules/contract/contract-lifecycle.mjs', 'utf-8');

// 11개 body 템플릿 패턴 찾기
const pattern = /body\s*:\s*\n\s*`([^`]+)`/g;
const matches = [...src.matchAll(pattern)];

console.log(`Found ${matches.length} body templates`);

// 각 템플릿의 변수 추출
const templates = [];
matches.forEach((m, i) => {
  const body = m[1].trim();
  // 변수 추출: ${...}
  const vars = [...body.matchAll(/\$\{([^}]+)\}/g)].map(v => v[1]);
  const uniqueVars = [...new Set(vars)];
  
  // 주변 컨텍스트 (noticeType, title 찾기)
  const idx = m.index;
  const before = src.slice(Math.max(0, idx - 300), idx);
  const noticeTypeMatch = before.match(/noticeType\s*:\s*'([^']+)'/);
  const titleMatch = before.match(/title\s*:\s*`([^`]+)`/);
  
  templates.push({
    index: i,
    noticeType: noticeTypeMatch ? noticeTypeMatch[1] : '?',
    title: titleMatch ? titleMatch[1].replace(/\$\{[^}]+\}/g, '...') : '?',
    vars: uniqueVars,
    lines: body.split('\n').length,
  });
});

templates.forEach(t => {
  console.log(`\n[${t.noticeType}] (${t.lines} lines)`);
  console.log(`  Title: ${t.title.substring(0, 80)}...`);
  console.log(`  Vars: ${t.vars.join(', ')}`);
});
