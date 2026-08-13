/**
 * scripts/fix-minimum-wage.js — 통상시급 최저임금 미달 데이터 일괄 수정
 *
 * 1) minimum_wages: 2026년 중복 레코드 제거 (법정 10,320원 유지, 10,030원 중복 삭제)
 * 2) contracts: hourly_wage > 0 이고 계약시작연도 법정 최저시급 미만인 계약의
 *    - hourly_wage → 법정 최저시급으로 상향
 *    - base_salary / annual_salary / monthly_salary_agreed / weekly_holiday_pay
 *      → 기존 시급 대비 비율로 비례 재계산 (값이 0 이상일 때만)
 *
 * 실행: node scripts/fix-minimum-wage.js
 */
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(DB_PATH);

const minRows = db.prepare('SELECT year, MAX(hourly_wage) AS hw FROM minimum_wages GROUP BY year').all();
const minMap = {};
minRows.forEach(m => { minMap[m.year] = m.hw; });
console.log('최저시급 기준:', JSON.stringify(minMap));

const log = [];
const tx = db.transaction(() => {
  // 1) 2026년 중복 최저임금 레코드 제거 (최고값 외 삭제)
  const dup2026 = db.prepare('SELECT id, hourly_wage FROM minimum_wages WHERE year = 2026').all();
  const max2026 = Math.max(...dup2026.map(r => r.hourly_wage));
  dup2026.forEach(r => {
    if (r.hourly_wage !== max2026) {
      db.prepare('DELETE FROM minimum_wages WHERE id = ?').run(r.id);
      log.push(`minimum_wages 삭제: id=${r.id} (2026년 ${r.hourly_wage}원 중복)`);
    }
  });

  // 2) 최저시급 미만 계약 수정 (임시저장·is_draft NULL 포함 전체)
  const contracts = db.prepare(`
    SELECT id, contract_start, hourly_wage, base_salary, annual_salary,
           monthly_salary_agreed, weekly_holiday_pay
    FROM contracts
    WHERE hourly_wage IS NOT NULL AND hourly_wage > 0
  `).all();

  let changed = 0;
  contracts.forEach(c => {
    const yr = c.contract_start ? parseInt(String(c.contract_start).slice(0, 4)) : 0;
    const min = minMap[yr];
    if (!min || c.hourly_wage >= min) return;

    const scale = min / c.hourly_wage;
    const upd = {};
    upd.hourly_wage = min;
    if (c.base_salary > 0)          upd.base_salary          = Math.round(c.base_salary * scale);
    if (c.annual_salary > 0)        upd.annual_salary        = Math.round(c.annual_salary * scale);
    if (c.monthly_salary_agreed > 0) upd.monthly_salary_agreed = Math.round(c.monthly_salary_agreed * scale);
    if (c.weekly_holiday_pay > 0)   upd.weekly_holiday_pay   = Math.round(c.weekly_holiday_pay * scale);
    upd.updated_at = Date.now();

    const sets = Object.keys(upd).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE contracts SET ${sets} WHERE id = @id`).run({ ...upd, id: c.id });
    changed++;
    log.push(`계약 수정: id=${c.id} 시급 ${c.hourly_wage}→${min} (base ${c.base_salary}→${upd.base_salary ?? '-'})`);
  });
  console.log(`수정된 계약 수: ${changed}`);
});
tx();

const integrity = db.pragma('integrity_check');
console.log('integrity_check:', JSON.stringify(integrity));

// 재검증: 남은 미달 계약 0인지
const remain = db.prepare(`
  SELECT id, contract_start, hourly_wage FROM contracts
  WHERE hourly_wage IS NOT NULL AND hourly_wage > 0
`).all().filter(c => {
  const yr = c.contract_start ? parseInt(String(c.contract_start).slice(0, 4)) : 0;
  const min = minMap[yr];
  return min && c.hourly_wage < min;
});
console.log('남은 미달 계약 수:', remain.length);
if (remain.length) console.log(JSON.stringify(remain, null, 1));

db.close();
console.log('완료');
