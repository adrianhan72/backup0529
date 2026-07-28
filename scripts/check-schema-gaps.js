const db = JSON.parse(require('fs').readFileSync('data/db.json', 'utf8'));
const ct = db.contracts.filter(c => !c.is_draft);
const first = ct[0];
console.log('Contract fields:', Object.keys(first).filter(k => !k.startsWith('_') && !k.startsWith('gs_')).sort().join('\n'));

// etc_allowance vs other_allowance 체크
const etc = ct.filter(c => c.etc_allowance !== undefined).length;
const other = ct.filter(c => c.other_allowance !== undefined).length;
console.log('\netc_allowance present:', etc, 'contracts');
console.log('other_allowance present:', other, 'contracts');

// insurance 필드 타입 체크
const insFields = ['insurance_pension','insurance_health','insurance_employment','insurance_industrial'];
insFields.forEach(f => {
  const vals = ct.filter(c => c[f] !== null && c[f] !== undefined).map(c => c[f]);
  const types = [...new Set(vals.map(v => typeof v))];
  console.log(`${f}: types=${types.join(',')}, samples=${vals.slice(0,5).join(',')}`);
});

// payroll 필드 확인
const pay = db.payrolls.filter(p => !p.is_draft);
const pf = pay[0];
const payFields = Object.keys(pf).filter(k => !k.startsWith('_') && !k.startsWith('gs_')).sort();
console.log('\nPayroll data fields count:', payFields.length);
// schema에 있고 data에 없는 필드 찾기
const schemaPayFields = ['regular_bonus','hazard_allowance','absent_dates','earlyleave_data','late_data','absent_data','severance_interim_pay','retro_absent_dates','retro_absent_data','retro_late_data','retro_earlyleave_data','tax_dependents'];
schemaPayFields.forEach(f => {
  const has = pay.filter(p => p[f] !== undefined && p[f] !== null).length;
  console.log(`  schema ${f}: data has ${has} records`);
});
