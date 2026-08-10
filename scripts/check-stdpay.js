const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const p = db.payrolls || [];
const noStd = p.filter(x => !x.is_draft && (!x.standard_monthly_pay || x.standard_monthly_pay === 0));

console.log('standard_monthly_pay 누락 건수:', noStd.length);
console.log('\n연도별:');
const yc = {};
noStd.forEach(x => { const y = x.pay_year; yc[y] = (yc[y]||0)+1; });
Object.keys(yc).sort().forEach(y => console.log(`  ${y}년: ${yc[y]}건`));

console.log('\n샘플 (처음 5건):');
noStd.slice(0, 5).forEach(x => {
  console.log(`  ${x.id} | ${x.employee_id} | ${x.pay_year}-${x.pay_month} | gross=${x.gross_pay} | work_days=${x.work_days} | base_sal=${x.base_salary} | weekly=${x.weekly_holiday_pay}`);
});

// gross_pay 분포 확인
const grosses = noStd.map(x => x.gross_pay || 0).filter(x => x > 0);
if (grosses.length > 0) {
  console.log(`\ngross_pay 범위: ${Math.min(...grosses).toLocaleString()} ~ ${Math.max(...grosses).toLocaleString()}`);
}
