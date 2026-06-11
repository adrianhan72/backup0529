// 사원번호 없는 직원에게 회사별 형식으로 사원번호 부여
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../data/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 회사별 형식 및 현재 최대 번호 파악
const companyFormats = {
  'comp01': { prefix: 'HT',  fmt: (n) => `HT-${n.year}-${String(n.seq).padStart(3,'0')}`, yearBased: true },
  'comp02': { prefix: 'MC',  fmt: (n) => `MC-${n.year}-${String(n.seq).padStart(3,'0')}`, yearBased: true },
  'comp03': { prefix: 'SF',  fmt: (n) => `SF-${n.year}-${String(n.seq).padStart(3,'0')}`, yearBased: true },
  'comp04': { prefix: 'DB',  fmt: (n) => `DB-${String(n.seq).padStart(3,'0')}`,            yearBased: false },
  'comp05': { prefix: 'GE',  fmt: (n) => `GE-${n.year}-${String(n.seq).padStart(2,'0')}`, yearBased: true },
  'co-sev-test-01': { prefix: 'SEV', fmt: (n) => `SEV-${String(n.seq).padStart(3,'0')}`, yearBased: false },
};

// 회사별 현재 최대 seq 파악
const maxSeq = {};
const usedNumbers = new Set();
db.employees.filter(e => e.employee_number).forEach(e => {
  usedNumbers.add(e.employee_number);
  const fmt = companyFormats[e.company_id];
  if (!fmt) return;
  const m = e.employee_number.match(/(\d+)$/);
  if (m) {
    const n = parseInt(m[1]);
    if (!maxSeq[e.company_id] || n > maxSeq[e.company_id]) maxSeq[e.company_id] = n;
  }
});

// comp01(HT): hire_date 기준 연도 포함, seq는 전체 통합 시퀀스
// 연도별 최대 seq 파악
const yearSeqMax = {};
db.employees.filter(e => e.employee_number && e.company_id === 'comp01').forEach(e => {
  const m = e.employee_number.match(/HT-(\d{4})-(\d+)/);
  if (m) {
    const yr = m[1], seq = parseInt(m[2]);
    if (!yearSeqMax[`comp01_${yr}`] || seq > yearSeqMax[`comp01_${yr}`]) yearSeqMax[`comp01_${yr}`] = seq;
  }
});
['comp02','comp03','comp05'].forEach(cid => {
  db.employees.filter(e => e.employee_number && e.company_id === cid).forEach(e => {
    const m = e.employee_number.match(/-(\d{4})-(\d+)/);
    if (m) {
      const yr = m[1], seq = parseInt(m[2]);
      const key = `${cid}_${yr}`;
      if (!yearSeqMax[key] || seq > yearSeqMax[key]) yearSeqMax[key] = seq;
    }
  });
});

// 사원번호 없는 직원에게 부여
let count = 0;
db.employees.filter(e => !e.employee_number).forEach(e => {
  const fmt = companyFormats[e.company_id];
  if (!fmt) return;

  const hireDate = e.hire_date || '2024-01-01';
  const year = hireDate.substring(0,4);

  let empNo;
  if (fmt.yearBased) {
    const key = `${e.company_id}_${year}`;
    if (!yearSeqMax[key]) yearSeqMax[key] = 0;
    yearSeqMax[key]++;
    empNo = fmt.fmt({ year, seq: yearSeqMax[key] });
  } else {
    if (!maxSeq[e.company_id]) maxSeq[e.company_id] = 0;
    maxSeq[e.company_id]++;
    empNo = fmt.fmt({ seq: maxSeq[e.company_id] });
  }

  e.employee_number = empNo;
  count++;
  console.log(`[부여] ${e.name} (${e.company_id}) → ${empNo}`);
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`\n✅ 완료: ${count}명에게 사원번호 부여됨`);
