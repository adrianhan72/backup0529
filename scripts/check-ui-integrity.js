/**
 * UI 무결성 감사 스크립트 (재사용)
 * - 데드 ID: JS getElementById가 참조하지만 어떤 HTML에도 없는 ID
 * - 미정의 함수: HTML 인라인 핸들러에 지정됐지만 JS에 정의 없는 함수
 * - 중복 OR 조건: X||X 형태의 무의미한 조건
 * - 표시 불일치: HTML style="display:none"인데 JS가 classList.remove('d-none')만 호출
 *
 * 사용: node scripts/check-ui-integrity.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML_FILES = [];
const JS_FILES = [];

function walk(dir, exts, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(p, exts, out);
    } else if (exts.some(e => entry.name.endsWith(e))) {
      out.push(p);
    }
  }
}

for (const sub of ['admin', 'client']) {
  const found = [];
  walk(path.join(ROOT, sub), ['.html', '.js'], found);
  found.forEach(p => (p.endsWith('.html') ? HTML_FILES : JS_FILES).push(p));
}

const read = p => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; } };

const adminHtml = HTML_FILES.filter(p => p.includes(`${path.sep}admin${path.sep}`));
const clientHtml = HTML_FILES.filter(p => p.includes(`${path.sep}client${path.sep}`));
const adminJs = JS_FILES.filter(p => p.includes(`${path.sep}admin${path.sep}`));
const clientJs = JS_FILES.filter(p => p.includes(`${path.sep}client${path.sep}`));

// 외부 페이지 파일: 자신의 최상위 page-xxx 래퍼를 제거 (admin-loader의 _extractPageContent와 동일 규칙)
function stripPageWrapper(src, f) {
  const name = path.basename(f).replace(/\.html$/, '');
  if (!f.includes(`${path.sep}pages${path.sep}`)) return src;
  const id = `page-${name}`;
  const re = new RegExp(`<div\\s+id="${id}"[^>]*class="page[^"]*"[^>]*>`, 'i');
  const m = src.match(re);
  if (!m) return src;
  const innerStart = m.index + m[0].length;
  const lastClose = src.lastIndexOf('</div>');
  if (lastClose > innerStart) return src.substring(innerStart, lastClose).trimEnd();
  return src;
}

// ── 1. 데드 ID ──
const htmlIds = new Set();
const jsDefinedIds = new Set(); // JS innerHTML 템플릿/생성 코드에서 정의되는 ID

for (const f of HTML_FILES) {
  const src = stripPageWrapper(read(f), f);
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) htmlIds.add(m[1]);
}

for (const f of JS_FILES) {
  const src = read(f);
  let m;
  const re1 = /\bid\s*=\s*["']([^"']+)["']/g;
  while ((m = re1.exec(src))) jsDefinedIds.add(m[1]);
  const re2 = /\.\s*id\s*=\s*["']([^"']+)["']/g;
  while ((m = re2.exec(src))) jsDefinedIds.add(m[1]);
  // 시간선택기(_timePickerHTML/_setTimePickerValue) 등 헬퍼가 동적 생성하는 ID
  const re3 = /_(?:timePickerHTML|setTimePickerValue)\(\s*["']([^"']+)["']/g;
  while ((m = re3.exec(src))) jsDefinedIds.add(m[1]);
}

const usedIds = new Map(); // id → [{file, line}]
for (const f of JS_FILES) {
  const lines = read(f).split('\n');
  lines.forEach((line, i) => {
    const re = /getElementById\(\s*["']([^"']+)["']\s*\)/g;
    let m;
    while ((m = re.exec(line))) {
      const id = m[1];
      if (id.includes('${')) continue; // 템플릿 리터럴 제외
      if (!usedIds.has(id)) usedIds.set(id, []);
      usedIds.get(id).push({ file: path.relative(ROOT, f), line: i + 1 });
    }
  });
}

const deadIds = [...usedIds.entries()].filter(([id]) => !htmlIds.has(id) && !jsDefinedIds.has(id));
console.log('=== 1. 데드 ID (HTML·JS 어디에도 없는 getElementById 참조) ===');
if (deadIds.length === 0) console.log('이슈 없음');
else deadIds.forEach(([id, refs]) => {
  refs.slice(0, 5).forEach(r => console.log(`  ${r.file}:${r.line} - ${id}`));
  if (refs.length > 5) console.log(`  ... 외 ${refs.length - 5}건`);
});
console.log(`  데드 ID 종류: ${deadIds.length}\n`);

// ── 2. 미정의 함수 (인라인 핸들러) ──
const jsAll = JS_FILES.map(f => read(f)).join('\n');
// HTML 내 인라인 <script> 블록의 함수 정의도 포함
const inlineScripts = HTML_FILES.map(f => {
  const src = read(f);
  const blocks = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src))) blocks.push(m[1]);
  return blocks.join('\n');
}).join('\n');
const allJsText = jsAll + '\n' + inlineScripts;

const defined = new Set();
{
  let m;
  const re = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  while ((m = re.exec(allJsText))) defined.add(m[1]);
}
{
  let m;
  const re = /\b([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  while ((m = re.exec(allJsText))) defined.add(m[1]);
}
{
  let m;
  const re = /(?:window\.)?([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b/g;
  while ((m = re.exec(allJsText))) defined.add(m[1]);
}

// 인라인 핸들러 코드 내에서 허용할 DOM/CSS 메서드·키워드
const ALLOWED_CALLS = new Set([
  'if', 'for', 'while', 'return',
  'rgba', 'rgb', 'hsl', 'hsla', 'var', 'calc', 'url',
  'getElementById', 'querySelector', 'querySelectorAll', 'closest',
  'preventDefault', 'stopPropagation', 'click', 'add', 'remove', 'classList',
]);

const undefinedFns = new Map(); // fn → [{file, line}]
for (const f of HTML_FILES) {
  const lines = read(f).split('\n');
  lines.forEach((line, i) => {
    const attrRe = /on\w+\s*=\s*"([^"]*)"/g;
    let am;
    while ((am = attrRe.exec(line))) {
      const code = am[1];
      // 함수 호출 추출 (객체 메서드 호출은 제외)
      const callRe = /(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
      let cm;
      while ((cm = callRe.exec(code))) {
        const fn = cm[1];
        if (ALLOWED_CALLS.has(fn)) continue;
        if (!defined.has(fn)) {
          if (!undefinedFns.has(fn)) undefinedFns.set(fn, []);
          undefinedFns.get(fn).push({ file: path.relative(ROOT, f), line: i + 1 });
        }
      }
    }
  });
}
console.log('=== 2. 미정의 함수 (인라인 핸들러) ===');
if (undefinedFns.size === 0) console.log('이슈 없음');
else undefinedFns.forEach((refs, fn) => {
  refs.slice(0, 5).forEach(r => console.log(`  ${r.file}:${r.line} - ${fn}`));
});
console.log(`  미정의 함수: ${undefinedFns.size}개\n`);

// ── 3. 중복 OR 조건 (X || X) ──
const dupOr = [];
for (const f of JS_FILES) {
  const lines = read(f).split('\n');
  lines.forEach((line, i) => {
    const re = /([A-Za-z_$][\w$.]*)\s*(===|==)\s*([^|&()]+?)\s*\|\|\s*\1\s*\2\s*\3\b/g;
    let m;
    while ((m = re.exec(line))) {
      dupOr.push(`${path.relative(ROOT, f)}:${i + 1} - ${m[1]}${m[2]}${m[3]} 중복`);
    }
  });
}
console.log('=== 3. 중복 OR 조건 ===');
if (dupOr.length === 0) console.log('이슈 없음');
else dupOr.forEach(x => console.log('  ' + x));
console.log(`  중복 OR: ${dupOr.length}건\n`);

// ── 4. 표시 불일치 (HTML style="display:none" + JS classList.remove('d-none')만) ──
const inlineHiddenIds = new Set();
for (const f of HTML_FILES) {
  const src = read(f);
  let m;
  const re = /\bid\s*=\s*["']([^"']+)["'][^>]*style\s*=\s*["'][^"']*display\s*:\s*none/g;
  while ((m = re.exec(src))) inlineHiddenIds.add(m[1]);
  const re2 = /style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*\bid\s*=\s*["']([^"']+)["']/g;
  while ((m = re2.exec(src))) inlineHiddenIds.add(m[1]);
}

const showOnly = [];
for (const f of JS_FILES) {
  const lines = read(f).split('\n');
  lines.forEach((line, i) => {
    const re = /getElementById\(\s*["']([^"']+)["']\s*\)\s*\.classList\.remove\(\s*['"]d-none['"]\s*\)/g;
    let m;
    while ((m = re.exec(line))) {
      const id = m[1];
      if (inlineHiddenIds.has(id)) {
        const next = lines[i + 1] || '';
        const hasClear = line.includes("style.display=''") || line.includes('style.display=""')
          || next.includes("style.display=''") || next.includes('style.display=""');
        if (!hasClear) showOnly.push(`${path.relative(ROOT, f)}:${i + 1} - ${id} (style.display 해제 누락)`);
      }
    }
  });
}
console.log('=== 4. 표시 불일치 (display:none + d-none remove만) ===');
if (showOnly.length === 0) console.log('이슈 없음');
else showOnly.forEach(x => console.log('  ' + x));
console.log(`  표시 불일치: ${showOnly.length}건\n`);

// ── 5. 중복 함수 정의 (전역 함수명 충돌) ──
function collectTopLevelFns(files, label){
  const fnDefs = new Map(); // fn → [{file, line}]
  for (const f of files) {
    const lines = read(f).split('\n');
    lines.forEach((line, i) => {
      // 컬럼 0 함수 선언만 전역 함수로 간주 (중첩 함수 제외)
      const re = /^function\s+([A-Za-z_$][\w$]*)\s*\(/;
      const m = re.exec(line);
      if (m) {
        const fn = m[1];
        if (!fnDefs.has(fn)) fnDefs.set(fn, []);
        fnDefs.get(fn).push({ file: path.relative(ROOT, f), line: i + 1 });
      }
    });
  }
  const dupFns = [...fnDefs.entries()].filter(([, refs]) => {
    const files = new Set(refs.map(r => r.file));
    return files.size > 1; // 서로 다른 파일에서 동일 함수명 정의
  });
  console.log(`=== 5. 중복 함수 정의 (${label}) ===`);
  if (dupFns.length === 0) console.log('이슈 없음');
  else dupFns.forEach(([fn, refs]) => {
    refs.slice(0, 5).forEach(r => console.log(`  ${r.file}:${r.line} - ${fn}`));
  });
  console.log(`  중복 함수: ${dupFns.length}개\n`);
  return dupFns;
}
const adminDupFns = collectTopLevelFns(adminJs, 'admin');
const clientDupFns = collectTopLevelFns(clientJs, 'client');

// ── 6. HTML ID 중복 (같은 id가 여러 번 정의) ──
function collectHtmlIdDups(files, label){
  const htmlIdDup = new Map(); // id → [{file, line}]
  for (const f of files) {
    const src = stripPageWrapper(read(f), f);
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      const re = /\bid\s*=\s*["']([^"']+)["']/g;
      let m;
      while ((m = re.exec(line))) {
        const id = m[1];
        if (!htmlIdDup.has(id)) htmlIdDup.set(id, []);
        htmlIdDup.get(id).push({ file: path.relative(ROOT, f), line: i + 1 });
      }
    });
  }
  const dupIds = [...htmlIdDup.entries()].filter(([, refs]) => refs.length > 1);
  console.log(`=== 6. HTML ID 중복 (${label}) ===`);
  if (dupIds.length === 0) console.log('이슈 없음');
  else dupIds.forEach(([id, refs]) => {
    refs.slice(0, 5).forEach(r => console.log(`  ${r.file}:${r.line} - ${id}`));
  });
  console.log(`  중복 ID: ${dupIds.length}개\n`);
  return dupIds;
}
const adminDupIds = collectHtmlIdDups(adminHtml, 'admin');
const clientDupIds = collectHtmlIdDups(clientHtml, 'client');

const total = deadIds.length + undefinedFns.size + dupOr.length + showOnly.length + adminDupFns.length + clientDupFns.length + adminDupIds.length + clientDupIds.length;
console.log(`TOTAL: ${total}`);
