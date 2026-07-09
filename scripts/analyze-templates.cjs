const fs = require('fs');
const c = fs.readFileSync('admin/js/modules/contract/contract-lifecycle.mjs', 'utf-8');
const lines = c.split('\n');

let inTemplate = false, templateLines = 0, templateCount = 0;
lines.forEach((l) => {
  if (l.includes('안녕하세요')) { inTemplate = true; templateCount++; }
  if (inTemplate) templateLines++;
  if (inTemplate && (l.trim().endsWith('`;') || l.includes('_BRAND_SIG}`'))) { inTemplate = false; }
});

console.log('Template blocks:', templateCount);
console.log('Template lines:', templateLines);
console.log('Total lines:', lines.length);
console.log('Potential saving:', templateLines, 'lines (' + (templateLines/lines.length*100).toFixed(1) + '%)');
