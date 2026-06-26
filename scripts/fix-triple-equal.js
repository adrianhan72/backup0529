const fs = require('fs');
const path = require('path');

const JS_DIR = path.join(__dirname, '..', 'admin', 'js');
const SKIP = ['admin.js.bak', 'constants.js'];

const fixes = [
  // !=== → !== (잘못된 삼중 등호)
  [/!===/g, '!=='],
];

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
let fixed = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  fixes.forEach(([regex, replacement]) => {
    const newContent = content.replace(regex, replacement);
    if (newContent !== content) {
      changed = true;
      content = newContent;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.relative(JS_DIR, filePath)}`);
    fixed++;
  }
});

console.log(`\n📊 ${fixed}개 파일 수정 완료`);
