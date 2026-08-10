const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const p = db.payrolls || [];

// 1. work_days 없는 급여
const noWorkDays = p.filter(x => !x.is_draft && (!x.work_days || x.work_days === 0));
console.log('work_days가 0이거나 없는 급여:', noWorkDays.length, '건');
if (noWorkDays.length > 0) {
  noWorkDays.slice(0, 10).forEach(x => {
    console.log(`  ${x.id} | ${x.employee_id} | ${x.pay_year}-${x.pay_month} | gross=${x.gross_pay} | work_days=${x.work_days}`);
  });
}

// 2. standard_monthly_pay 누락
const noStdPay = p.filter(x => !x.is_draft && (!x.standard_monthly_pay || x.standard_monthly_pay === 0));
console.log('\nstandard_monthly_pay 누락:', noStdPay.length, '건');

// 3. 연도별 분포
const years = {};
p.filter(x => !x.is_draft).forEach(x => {
  const y = x.pay_year || '?';
  years[y] = (years[y] || 0) + 1;
});
console.log('\n연도별 급여 분포:');
Object.keys(years).sort().forEach(y => console.log(`  ${y}년: ${years[y]}건`));
