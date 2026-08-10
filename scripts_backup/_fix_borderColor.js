const fs = require('fs');
const files = [
  'admin/js/admin-billing/annual-leave.js',
  'admin/js/admin-billing/company-notice-log.js',
  'admin/js/admin-billing/payslip-send.js',
  'admin/js/admin-billing/regular-conversion.js',
  'admin/js/admin-contract/consent-dispatch.js',
  'admin/js/admin-contract/contract-dispatch.js',
  'admin/js/admin-contract/contract-form.js',
  'admin/js/admin-contract/contract-lifecycle.js',
  'admin/js/admin-contract/contract-docs.js',
];

for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  // d1d5db → remove class
  c = c.replace(/\.style\.borderColor\s*=\s*'#d1d5db'\s*;/g, ".classList.remove('va-input-err');");
  // dc2626 → add class
  c = c.replace(/\.style\.borderColor\s*=\s*'#dc2626'/g, ".classList.add('va-input-err')");
  // ef4444 → add class
  c = c.replace(/\.style\.borderColor\s*=\s*'#ef4444'/g, ".classList.add('va-input-err')");
  // empty string → remove class
  c = c.replace(/\.style\.borderColor\s*=\s*''/g, ".classList.remove('va-input-err')");
  // drag/drop inline (this.style.borderColor)
  c = c.replace(/this\.style\.borderColor='#6366f1'/g, "this.classList.add('va-input-err')");
  c = c.replace(/this\.style\.borderColor='#7c3aed'/g, "this.classList.add('va-input-err')");
  c = c.replace(/this\.style\.borderColor=''/g, "this.classList.remove('va-input-err')");
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed: ' + f);
  } else {
    console.log('Skip: ' + f);
  }
}
console.log('Done');
