/**
 * _fix_guaco_payrolls.js — 구에코 급여 6건을 계약서 산식과 일치하도록 보정 (2026-09-11)
 * 계약(2024-01-01~2026-07-28): 시급 11,164, 기본급 2,333,276(×209), 월약정 2,433,276,
 *   연봉 29,199,312, 식대 100,000(비과세 미설정 → 보수월액 포함)
 * 보정: 기본급=2,333,276 / 주휴수당=390,740(참고) / 지급총액=보수월액=2,433,276
 *   4대보험 = 보수월액 × 기간별 요율, 소득세 = 2025 간이세액표(1인)
 */
const { DB } = require('../lib/database');
const db = new DB('data/app.db');

const EMP = '03902105-de50-48b5-945f-db8b325c9203';
const HW = 11164;
const BASE = Math.round(HW * 209);      // 2,333,276
const WEEKLY = Math.round(HW * 35);     // 390,740 (참고)
const MEAL = 100000;
const GROSS = BASE + MEAL;              // 2,433,276
const STD = GROSS;                      // 식대 비과세 미설정 → 전액 포함

// 기간별 요율 (insurance_rates)
const rateFor = (type, ym) => {
  const pStart = ym + '-01', pEnd = ym + '-31';
  const rows = db.all(`SELECT rate, cap_amount, period_start, period_end FROM insurance_rates WHERE insurance_type=?`, [type]);
  let r = rows.find(r => (!r.period_start || r.period_start <= pEnd) && (!r.period_end || r.period_end >= pStart));
  if (!r) r = rows.filter(r => !r.period_start || r.period_start <= pStart).sort((a, b) => (b.period_start || '').localeCompare(a.period_start || ''))[0];
  return r ? { rate: r.rate / 100, cap: r.cap_amount } : null;
};

const TAX2025 = [
  [2400000,2450000,63820],[2350000,2400000,61060],[2300000,2350000,58310],
];
const taxFor = (std) => {
  const row = TAX2025.find(r => std >= r[0] && std < r[1]);
  const incomeTax = row ? row[2] : 0;
  return { incomeTax, localTax: Math.floor((incomeTax * 0.1) / 10) * 10 };
};

// 실제 평일 근무일수
const wd = (y, m) => {
  let n = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1) break;
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
};

const rows = db.all(`SELECT id, pay_year, pay_month FROM payrolls WHERE employee_id=? AND id LIKE 'pay_c05_e01_%'`, [EMP]);
console.log('대상 행:', rows.length);

for (const p of rows) {
  const ym = `${p.pay_year}-${String(p.pay_month).padStart(2, '0')}`;
  const days = wd(p.pay_year, p.pay_month);
  const R_p = rateFor('national_pension', ym);
  const R_h = rateFor('health', ym);
  const R_l = rateFor('long_term_care', ym);
  const R_e = rateFor('employment', ym);
  const pension = Math.round(Math.min(STD, R_p.cap || 1e12) * R_p.rate);
  const health = Math.round(STD * R_h.rate);
  const ltcare = Math.round(health * R_l.rate);
  const employ = Math.round(STD * R_e.rate);
  const { incomeTax, localTax } = taxFor(STD);
  const totalDed = pension + health + ltcare + employ + incomeTax + localTax;
  const net = GROSS - totalDed;

  db.run(`UPDATE payrolls SET
    base_salary=?, weekly_holiday_pay=?, standard_monthly_pay=?, gross_pay=?,
    national_pension=?, health_insurance=?, long_term_care=?, employment_insurance=?,
    income_tax=?, local_income_tax=?, total_deduction=?, net_pay=?,
    hourly_wage=?, meal_allowance=?, work_days=?, total_work_hours=?, updated_at=?
    WHERE id=?`,
    [BASE, WEEKLY, STD, GROSS, pension, health, ltcare, employ,
      incomeTax, localTax, totalDed, net, HW, MEAL, days, days * 8, Date.now(), p.id]);
  console.log(`${ym}: base=${BASE.toLocaleString()} gross=${GROSS.toLocaleString()} ded=${totalDed.toLocaleString()} net=${net.toLocaleString()} wd=${days}`);
}

// 검증
const after = db.all(`SELECT id, pay_year, pay_month, base_salary, weekly_holiday_pay, standard_monthly_pay,
  gross_pay, total_deduction, net_pay, hourly_wage, work_days FROM payrolls WHERE employee_id=? AND id LIKE 'pay_c05_e01_%' ORDER BY pay_year, pay_month`, [EMP]);
console.log(JSON.stringify(after, null, 1));
