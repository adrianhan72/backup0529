const fs = require('fs');
const s = fs.readFileSync('data/schema.sql', 'utf8');
const lines = s.split('\n');

console.log('=== 주석 누락된 필드 ===\n');
lines.forEach((l, i) => {
  const t = l.trim();
  if (!t) return;
  if (t.startsWith('--')) return;
  if (t.startsWith('CREATE')) return;
  if (t.startsWith('PRAGMA')) return;
  if (t === ')') return;
  if (t === ');') return;
  // 필드 정의 줄인지 확인 (TEXT, REAL, INTEGER 포함)
  if (t.includes('TEXT') || t.includes('REAL') || t.includes('INTEGER')) {
    if (!t.includes(' -- ')) {
      console.log(`${i+1}: ${t}`);
    }
  }
});

// 누락 개수
const total = lines.filter(l => {
  const t = l.trim();
  return t && (t.includes('TEXT') || t.includes('REAL') || t.includes('INTEGER')) && !t.startsWith('--') && !t.startsWith('CREATE');
}).length;
const withComment = lines.filter(l => {
  const t = l.trim();
  return t && (t.includes('TEXT') || t.includes('REAL') || t.includes('INTEGER')) && t.includes(' -- ') && !t.startsWith('--');
}).length;
console.log(`\n총 필드: ${total}, 주석 있음: ${withComment}, 누락: ${total - withComment}`);
