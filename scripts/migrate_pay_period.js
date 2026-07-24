const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, '..', 'data', 'app.db'));

// 누락된 pay_period 찾기
const rows = db.prepare(`
  SELECT c.id, c.employee_id, c.company_id, c.contract_type, 
         c.pay_period, c.pay_period_month, c.pay_period_day,
         co.pay_period_month as co_pp_month, co.pay_period_day as co_pp_day
  FROM contracts c
  LEFT JOIN companies co ON co.id = c.company_id
  WHERE c.pay_period IS NULL 
     OR c.pay_period = '' 
     OR c.pay_period = '월급' 
     OR c.pay_period = '연봉'
     OR c.pay_period NOT LIKE '%.%'
  ORDER BY c.company_id, c.employee_id
`).all();

console.log(`누락된 pay_period 계약 수: ${rows.length}`);

if (rows.length > 0) {
  console.log('\n샘플 (최대 5개):');
  rows.slice(0, 5).forEach(r => {
    console.log(`  id=${r.id} type=${r.contract_type} pay_period="${r.pay_period}" co_period=${r.co_pp_month||'없음'} ${r.co_pp_day||'없음'}일`);
  });

  // 마이그레이션 실행
  const update = db.prepare(`
    UPDATE contracts 
    SET pay_period = ?,
        pay_period_month = ?,
        pay_period_day = ?
    WHERE id = ?
  `);

  let migrated = 0;
  const tx = db.transaction(() => {
    rows.forEach(r => {
      const ppMonth = r.pay_period_month || r.co_pp_month || '당월';
      const ppDay = r.pay_period_day || r.co_pp_day || 1;
      const payPeriod = `${ppMonth} ${ppDay}일부터 1개월간`;
      update.run(payPeriod, ppMonth, ppDay, r.id);
      migrated++;
    });
  });
  tx();
  
  console.log(`\n✅ ${migrated}건 마이그레이션 완료`);
}

db.close();
