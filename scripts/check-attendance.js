const { loadDB, saveDB } = require('./_db');
const db = loadDB();
const p = db.payrolls || [];

// 출근 관련 필드 체크
const fields = ['work_days', 'total_work_hours', 'overtime_hours', 'night_hours', 'holiday_hours', 'hourly_wage'];
console.log('=== 출근/근로시간 관련 필드 누락 현황 (임시저장 제외) ===\n');

const nonDraft = p.filter(x => !x.is_draft);

fields.forEach(f => {
  const missing = nonDraft.filter(x => x[f] === null || x[f] === undefined || x[f] === 0);
  const hasVal = nonDraft.filter(x => x[f] !== null && x[f] !== undefined && x[f] !== 0);
  console.log(`${f}: 값 있음=${hasVal.length}건, 0/null=${missing.length}건`);
});

// 샘플
console.log('\n=== 0/null 샘플 (overtime_hours) ===');
const noOt = nonDraft.filter(x => !x.overtime_hours || x.overtime_hours === 0);
noOt.slice(0, 5).forEach(x => {
  console.log(`  ${x.id} | ${x.employee_id} | ${x.pay_year}-${x.pay_month} | work_days=${x.work_days} | ot=${x.overtime_hours} | night=${x.night_hours} | hol=${x.holiday_hours} | total_h=${x.total_work_hours}`);
});
