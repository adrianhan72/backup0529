const db = require('better-sqlite3')('data/app.db');

function makeSlug(s) {
  const eng = s.replace(/[^a-zA-Z0-9]/g, '');
  if (eng.length >= 3) return eng.toLowerCase().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  return 'c' + Math.abs(hash).toString(36).slice(0, 6);
}

// 1. registered_executives
const execs = db.prepare('SELECT id, name, company_id, email FROM registered_executives').all();
for (const r of execs) {
  if (!r.email) {
    const email = 'exec' + r.id.slice(-4) + '@' + makeSlug(r.company_id) + '.test';
    db.prepare('UPDATE registered_executives SET email=? WHERE id=?').run(email, r.id);
    console.log('Exec: ' + r.name + ' -> ' + email);
  }
}

// 2. related_party_workers
const rels = db.prepare('SELECT id, name, company_id, email FROM related_party_workers').all();
for (const r of rels) {
  if (!r.email) {
    const email = 'rel' + r.id.slice(-4) + '@' + makeSlug(r.company_id) + '.test';
    db.prepare('UPDATE related_party_workers SET email=? WHERE id=?').run(email, r.id);
    console.log('Rel: ' + r.name + ' -> ' + email);
  }
}

// 3. representatives in companies JSON
const cos = db.prepare("SELECT id, company_name, representatives FROM companies WHERE is_draft=0 AND representatives IS NOT NULL AND representatives != ''").all();
for (const c of cos) {
  try {
    const reps = JSON.parse(c.representatives);
    let changed = false;
    const slug = makeSlug(c.id);
    reps.forEach((rep, i) => {
      if (!rep.email) {
        rep.email = 'rep' + (i+1) + '@' + slug + '.test';
        changed = true;
      }
    });
    if (changed) {
      db.prepare('UPDATE companies SET representatives=? WHERE id=?').run(JSON.stringify(reps), c.id);
      console.log('Rep: ' + c.company_name + ' -> ' + reps.map(r => r.email).join(', '));
    }
  } catch(e) {}
}

// 4. companies.email
const cos2 = db.prepare("SELECT id, company_name FROM companies WHERE is_draft=0 AND (email IS NULL OR email = '')").all();
for (const c of cos2) {
  const email = 'office@' + makeSlug(c.id) + '.test';
  db.prepare('UPDATE companies SET email=? WHERE id=?').run(email, c.id);
  console.log('Co: ' + c.company_name + ' -> ' + email);
}

console.log('Done');
