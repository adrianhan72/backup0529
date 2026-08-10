const { DatabaseConnection } = require('../lib/database');
const db = new DatabaseConnection('./data/app.db');

console.log('=== 1. 갱신 페어: 원본이 expired인 경우 ===');
const expiredOriginals = db.raw.prepare(`
  SELECT o.id as orig_id, o.status as orig_status, o.terminate_date, o.contract_end,
         n.id as new_id, n.status as new_status, n.contract_start,
         o.employee_id, e.name as emp_name
  FROM contracts o
  JOIN contracts n ON o.renewed_to_id = n.id
  JOIN employees e ON e.id = o.employee_id
  WHERE o.status = 'expired'
`).all();
console.log(JSON.stringify(expiredOriginals, null, 2));

console.log('\n=== 2. 모든 갱신 페어 현황 ===');
const allPairs = db.raw.prepare(`
  SELECT o.id as orig_id, o.status as orig_status, o.terminate_date,
         n.id as new_id, n.status as new_status, n.contract_start,
         o.employee_id, e.name as emp_name
  FROM contracts o
  JOIN contracts n ON o.renewed_to_id = n.id
  JOIN employees e ON e.id = o.employee_id
  ORDER BY o.status, o.terminate_date
`).all();
allPairs.forEach(p => {
  console.log(p.orig_id.substring(0,8), p.orig_status, p.terminate_date, '->', p.new_status, p.contract_start, p.emp_name);
});

console.log('\n=== 3. 갱신 페어: 해지일-시작일 갭 확인 ===');
const pairsWithGap = [];
allPairs.forEach(p => {
  if (!p.terminate_date || !p.contract_start) return;
  const endD = new Date(p.terminate_date);
  const startD = new Date(p.contract_start);
  const diffDays = Math.round((startD - endD) / 86400000);
  if (diffDays > 1) {
    // Check if only weekends in between
    let hasWeekday = false;
    for (let d = new Date(endD.getTime() + 86400000); d < startD; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { hasWeekday = true; break; }
    }
    pairsWithGap.push({
      orig_id: p.orig_id.substring(0,8),
      new_id: p.new_id.substring(0,8),
      terminate_date: p.terminate_date,
      contract_start: p.contract_start,
      diffDays,
      hasWeekday,
      emp_name: p.emp_name,
      orig_status: p.orig_status
    });
  }
});
console.log(JSON.stringify(pairsWithGap, null, 2));

// Also check for renewed_from_id pairs
console.log('\n=== 4. renewed_from_id 페어 ===');
const fromPairs = db.raw.prepare(`
  SELECT n.id as new_id, n.status as new_status, n.contract_start,
         o.id as orig_id, o.status as orig_status, o.terminate_date,
         n.employee_id, e.name as emp_name
  FROM contracts n
  JOIN contracts o ON n.renewed_from_id = o.id
  JOIN employees e ON e.id = n.employee_id
  ORDER BY o.status, o.terminate_date
`).all();
fromPairs.forEach(p => {
  console.log(p.orig_id.substring(0,8), p.orig_status, p.terminate_date, '<-', p.new_status, p.contract_start, p.emp_name);
});

// Check for contracts that should be terminated but are expired (without pair)
console.log('\n=== 5. 해지일은 있는데 상태가 expired인 계약 ===');
const expiredWithTermDate = db.raw.prepare(`
  SELECT c.id, c.status, c.terminate_date, c.contract_end, e.name as emp_name
  FROM contracts c
  JOIN employees e ON e.id = c.employee_id
  WHERE c.status = 'expired' AND c.terminate_date IS NOT NULL AND c.terminate_date != ''
`).all();
expiredWithTermDate.forEach(c => {
  console.log(c.id.substring(0,8), c.status, 'term:', c.terminate_date, 'end:', c.contract_end, c.emp_name);
});
