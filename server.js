/**
 * 인사톡 노무톡 - Express 서버 (SQLite 버전)
 * 대화인사노무파트너스
 *
 * v2.38.0 — JWT + 라우트 분리, BaseRepository 기반
 */
const express = require('express');
const path    = require('path');
const cron    = require('node-cron');
const { DB }  = require('./lib/database');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ── DB ──
const db = new DB(path.join(ROOT, 'data', 'app.db'));

// ── 미들웨어 ──
app.use(require('./middleware/cors')());
app.use(express.json({ limit: '10mb' }));

// ── 라우트 ──
app.use('/api/auth',      require('./routes/auth')(db));
app.use('/api/companies', require('./routes/companies')(db));
app.use('/tables',        require('./routes/tables')(db));

// ── 기타 API ──
app.post('/api/kakao/send', (req, res) => {
  res.json({ ok: true, stub: true, message: '카카오 전송 (스텁)' });
});

// ── 정적 파일 ──
const staticOpts = { maxAge: 0, etag: false };
app.use('/admin',   express.static(path.join(ROOT, 'admin'), staticOpts));
app.use('/client',  express.static(path.join(ROOT, 'client'), staticOpts));
app.use('/scripts', express.static(path.join(ROOT, 'scripts'), staticOpts));
app.use('/docs',    express.static(path.join(ROOT, 'docs'), staticOpts));

// ── 보안 ──
require('./middleware/security')(app);

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

// ── 서버 시작 ──
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ SQLite 서버 실행 중  →  http://0.0.0.0:' + PORT);
  console.log('   🏠 메인       →  http://localhost:' + PORT + '/');
  console.log('   ⚙️  관리자     →  http://localhost:' + PORT + '/admin/');
  console.log('   📱 고객사     →  http://localhost:' + PORT + '/client/\n');
});

// ── 예약 발송 고객사 공지 처리 (1분마다) ──
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date().toISOString();
    const rows = db.all(`
      SELECT * FROM company_notices
      WHERE gn_status = 'scheduled'
        AND gn_scheduled_at IS NOT NULL
        AND gn_scheduled_at <= ?
    `, [now]);
    let processed = 0;
    for (const r of rows) {
      db.run(`UPDATE company_notices SET gn_status = 'sent', sent_at = ? WHERE id = ?`, [now, r.id]);
      processed++;
    }
    if (processed > 0) console.log(`[CRON] 예약 공지 처리 완료: ${processed}건 발송`);
  } catch(e) {
    console.error('[CRON] 예약 공지 처리 실패:', e.message);
  }
});

// ── 계약만료 통지 자동발송 (매일 오전 9:00 KST) ──
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] 계약만료 통지 자동발송 시작...');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const targetTypes = ['fixed_term', 'fixed_probation', 'daily', 'regular_probation', 'regular'];
    
    const contracts = db.all(`
      SELECT c.*, e.name AS emp_name, e.phone, e.email, co.company_name
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN companies co ON co.id = c.company_id
      WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
        AND c.contract_type IN (${targetTypes.map(()=>'?').join(',')})
        AND c.contract_end IS NOT NULL
        AND c.contract_start IS NOT NULL
        AND (
          julianday(c.contract_end) - julianday(?) BETWEEN 0 AND 29
          OR julianday(c.contract_end) - julianday(c.contract_start) <= 29
        )
    `, [...targetTypes, today]);

    let sent = 0;
    for (const c of contracts) {
      // 오늘 이미 발송했는지 확인
      const already = db.get(`
        SELECT id FROM contract_expiry_notice
        WHERE contract_id = ? AND date(noticed_at) = ?
      `, [c.id, today]);
      if (already) continue;

      const now = new Date().toISOString();
      const daysLeft = Math.ceil((new Date(c.contract_end) - new Date(today)) / (1000*60*60*24));
      
      // 카카오 알림톡 발송 (전화번호 있으면)
      if (c.phone && c.phone.trim()) {
        db.run(`INSERT INTO contract_expiry_notice (id, contract_id, employee_id, employee_name, company_id, company_name, contract_type, contract_end, days_until_expiry, notice_method, notice_status, recipient, noticed_at, note)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          generateId(), c.id, c.employee_id, c.emp_name, c.company_id, c.company_name, c.contract_type, c.contract_end,
          daysLeft, 'kakao', 'completed', c.phone, now, '시스템 자동발송 (매일 9시)'
        ]);
        sent++;
      }
      // 이메일 발송 (이메일 있으면)
      if (c.email && c.email.trim()) {
        db.run(`INSERT INTO contract_expiry_notice (id, contract_id, employee_id, employee_name, company_id, company_name, contract_type, contract_end, days_until_expiry, notice_method, notice_status, recipient, noticed_at, note)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          generateId(), c.id, c.employee_id, c.emp_name, c.company_id, c.company_name, c.contract_type, c.contract_end,
          daysLeft, 'email', 'completed', c.email, now, '시스템 자동발송 (매일 9시)'
        ]);
        sent++;
      }
    }
    console.log(`[CRON] 계약만료 통지 완료: ${contracts.length}건 대상, ${sent}건 발송`);
  } catch(e) {
    console.error('[CRON] 계약만료 통지 실패:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ── 정규직 전환 안내 자동발송 (매일 오전 9:00 KST, 고객사 앱 only) ──
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] 정규직 전환 안내 자동발송 시작...');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const TWO_YEARS_DAYS = 730;
    const NOTICE_BEFORE  = 30;  // 730일 30일 전부터 사전 고지

    // 대표 연락처 정보 조회
    const contact = db.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};
    const contactFoot = `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n전화: ${contact.phone || '02)3487-8841'}\nE-mail: ${contact.email || 'eunyangpark@naver.com'}\n팩스: ${contact.fax || '02)3487-8882'}`;

    // 계약직·계약직 수습·정규직 수습·일용직 계약의 누적 기간 계산 (최초 입사일 기준)
    // 조건: 누적 700일 이상 AND 계약 종료일까지 730일 이상
    const rows = db.all(`
      SELECT c.employee_id, e.name AS emp_name, c.company_id, co.company_name,
             MIN(c.contract_start) AS first_start,
             MAX(c.contract_end) AS last_end,
             CAST(julianday(?) - julianday(MIN(c.contract_start)) AS INTEGER) AS total_days,
             CAST(julianday(COALESCE(MAX(c.contract_end), date('9999-12-31'))) - julianday(MIN(c.contract_start)) AS INTEGER) AS days_to_end
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN companies co ON co.id = c.company_id
      WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
        AND c.contract_type IN ('fixed_term', 'fixed_probation', 'daily', 'regular_probation')
        AND c.contract_start IS NOT NULL
        AND c.status NOT IN ('canceled', 'voided')
      GROUP BY c.employee_id
      HAVING total_days >= ?
         AND days_to_end >= ?
    `, [today, TWO_YEARS_DAYS - NOTICE_BEFORE, TWO_YEARS_DAYS]);

    const now = new Date().toISOString();
    let sent = 0;

    for (const r of rows) {
      // 오늘 이미 발송했는지 확인 (같은 직원, 같은 알림유형, 오늘)
      const already = db.get(`
        SELECT id FROM company_notices
        WHERE employee_id = ? AND notice_type = 'regular_conversion'
          AND date(sent_at) = ?
      `, [r.employee_id, today]);
      if (already) continue;

      const y = Math.floor(r.total_days / 365);
      const m = Math.floor((r.total_days % 365) / 30);
      const durationStr = (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${r.total_days}일)`;
      const isExceeded = r.total_days > TWO_YEARS_DAYS; // 이미 730일 초과

      const title = isExceeded
        ? `[정규직 전환 의무] ${r.emp_name} — 기간제 2년 초과 (${durationStr})`
        : `[정규직 전환 사전 고지] ${r.emp_name} — 2년 도달 30일 전 (${durationStr})`;

      const bodyIntro = isExceeded
        ? `소속 직원의 기간제 근로 누적 기간이 2년(730일)을 초과하여 법률에 따른 정규직 전환 의무가 발생하였음을 안내드립니다.`
        : `소속 직원의 기간제 근로 누적 기간이 2년(730일) 도달 30일 전입니다. 정규직 전환 의무 발생에 대비해 미리 준비해 주세요.`;

      const bodyFooter = isExceeded
        ? `※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 위반 발생 고지로 해당 근로자에게는 통보되지 않습니다.`
        : `※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 사전 고지로 해당 근로자에게는 통보되지 않습니다.`;

      const body =
`안녕하세요, ${r.company_name} 사장님.

${bodyIntro}

■ 직원명: ${r.emp_name}
■ 입사일: ${r.first_start || '-'}
■ 누적 근로일수: ${durationStr}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요.

${bodyFooter}

${contactFoot}`;

      db.run(`INSERT INTO company_notices (id, company_id, company_name, notice_type, title, body, contract_id, employee_id, employee_name, contract_end, days_until_expiry, sent_at, sent_by, is_read, read_at, gn_status, gn_scheduled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        generateId(), r.company_id, r.company_name, 'regular_conversion', title, body,
        '', r.employee_id, r.emp_name, '', 0, now, null, 0, '', 'sent', ''
      ]);
      sent++;
    }
    console.log(`[CRON] 정규직 전환 안내 완료: ${rows.length}건 대상, ${sent}건 발송`);
  } catch(e) {
    console.error('[CRON] 정규직 전환 안내 실패:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ── 정규직 전환 안내 주간 재발송 (매주 월요일 오전 9:00 KST) ──
// 이미 730일을 초과한 근로자 중 정규직 계약이 등록되지 않은 경우 재안내
cron.schedule('0 9 * * 1', async () => {
  console.log('[CRON] 정규직 전환 주간 재발송 시작...');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const TWO_YEARS_DAYS = 730;

    // 대표 연락처 정보 조회
    const contactW = db.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};
    const contactFootW = `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n전화: ${contactW.phone || '02)3487-8841'}\nE-mail: ${contactW.email || 'eunyangpark@naver.com'}\n팩스: ${contactW.fax || '02)3487-8882'}`;

    // 이미 730일 초과 + 정규직 계약 없는 근로자
    const rows = db.all(`
      SELECT c.employee_id, e.name AS emp_name, c.company_id, co.company_name,
             MIN(c.contract_start) AS first_start,
             CAST(julianday(?) - julianday(MIN(c.contract_start)) AS INTEGER) AS total_days
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN companies co ON co.id = c.company_id
      WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
        AND c.contract_type IN ('fixed_term', 'fixed_probation', 'daily', 'regular_probation')
        AND c.contract_start IS NOT NULL
        AND c.status NOT IN ('canceled', 'voided')
      GROUP BY c.employee_id
      HAVING total_days > ?
    `, [today, TWO_YEARS_DAYS]);

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let resent = 0;

    for (const r of rows) {
      // 이미 정규직 계약이 등록되어 있는지 확인
      const hasRegular = db.get(`
        SELECT id FROM contracts
        WHERE employee_id = ? AND contract_type = 'regular'
          AND is_draft = 0 AND is_voided_by_amend = 0
          AND status NOT IN ('canceled', 'voided')
        LIMIT 1
      `, [r.employee_id]);
      if (hasRegular) continue; // 정규직 전환 완료 → 건너뜀

      // 최근 7일 이내에 이미 발송했는지 확인
      const recentlySent = db.get(`
        SELECT id FROM company_notices
        WHERE employee_id = ? AND notice_type = 'regular_conversion'
          AND sent_at >= ?
        LIMIT 1
      `, [r.employee_id, sevenDaysAgo]);
      if (recentlySent) continue; // 최근 발송 이력 있음 → 건너뜀

      const y = Math.floor(r.total_days / 365);
      const m = Math.floor((r.total_days % 365) / 30);
      const durationStr = (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${r.total_days}일)`;

      const title = `[재안내] 정규직 전환 의무 — ${r.emp_name} (누적 ${durationStr})`;
      const body =
`안녕하세요, ${r.company_name} 사장님.

소속 직원의 기간제 근로 누적 기간이 2년(730일)을 초과하였으나, 아직 정규직 근로계약이 등록되지 않아 재안내드립니다.

■ 직원명: ${r.emp_name}
■ 입사일: ${r.first_start || '-'}
■ 누적 근로일수: ${durationStr}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
아직 정규직 근로계약서가 등록되지 않았습니다. 담당 노무사에게 정규직 근로계약서 작성을 요청해 주세요.

※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 위반 발생 고지로 해당 근로자에게는 통보되지 않습니다.
※ 정규직 계약이 이미 등록된 경우 이 메시지를 무시하셔도 됩니다.

${contactFootW}`;

      db.run(`INSERT INTO company_notices (id, company_id, company_name, notice_type, title, body, contract_id, employee_id, employee_name, contract_end, days_until_expiry, sent_at, sent_by, is_read, read_at, gn_status, gn_scheduled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        generateId(), r.company_id, r.company_name, 'regular_conversion', title, body,
        '', r.employee_id, r.emp_name, '', 0, now, null, 0, '', 'sent', ''
      ]);
      resent++;
    }
    console.log(`[CRON] 정규직 전환 주간 재발송 완료: ${rows.length}건 확인, ${resent}건 재발송`);
  } catch(e) {
    console.error('[CRON] 정규직 전환 주간 재발송 실패:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

// ── 수습만료 통지 자동발송 (매일 오전 9:00 KST, 고객사 앱 only) ──
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] 수습만료 통지 자동발송 시작...');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const NOTICE_DAYS = 30; // 수습만료 30일 전부터 통지

    // 대표 연락처 정보 조회
    const contactP = db.get(`SELECT * FROM representative_contact WHERE id = 'default'`) || {};
    const contactFootP = `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n전화: ${contactP.phone || '02)3487-8841'}\nE-mail: ${contactP.email || 'eunyangpark@naver.com'}\n팩스: ${contactP.fax || '02)3487-8882'}`;

    // 수습 계약 중 수습기간 3개월 초과, 만료일 30일 이내인 건 조회
    // probation_end_date 우선, 없으면 contract_start + probation_months(기본3)으로 계산
    const rows = db.all(`
      SELECT c.*, e.name AS emp_name, co.company_name,
             COALESCE(c.probation_end_date, date(c.contract_start, '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')) AS prob_end
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN companies co ON co.id = c.company_id
      WHERE c.is_draft = 0 AND c.is_voided_by_amend = 0
        AND c.contract_type IN ('regular_probation', 'fixed_probation')
        AND c.contract_start IS NOT NULL
        AND c.status NOT IN ('voided', 'terminated', 'canceled', 'expired')
        AND COALESCE(c.probation_months, 3) > 3
        AND COALESCE(c.probation_end_date, date(c.contract_start, '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')) >= ?
        AND COALESCE(c.probation_end_date, date(c.contract_start, '+' || COALESCE(c.probation_months, 3) || ' months', '-1 day')) <= date(?, '+' || ? || ' days')
    `, [today, today, NOTICE_DAYS]);

    const now = new Date().toISOString();
    let sent = 0;

    for (const c of rows) {
      // 오늘 이미 발송했는지 확인 (같은 계약, 같은 알림유형, 오늘)
      const already = db.get(`
        SELECT id FROM company_notices
        WHERE contract_id = ? AND notice_type = 'probation_expiry'
          AND date(sent_at) = ?
      `, [c.id, today]);
      if (already) continue;

      const probMonths = c.probation_months || 3;
      const daysLeft = Math.ceil((new Date(c.prob_end) - new Date(today)) / (1000 * 60 * 60 * 24));
      const ddayStr = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
      const probEndKr = c.prob_end ? c.prob_end.replace(/-/g, '.') : '-';

      const title = `[수습만료 예정] ${c.emp_name} — 수습기간 ${probMonths}개월 (${ddayStr})`;
      const body =
`안녕하세요, ${c.company_name} 사장님.

소속 직원의 수습기간 만료일이 다가와 안내드립니다.

■ 직원명: ${c.emp_name}
■ 고용형태: ${c.contract_type === 'regular_probation' ? '정규직 수습' : '계약직 수습'}
■ 수습기간: ${probMonths}개월
■ 수습 만료일: ${probEndKr} (${ddayStr})

◆ 중요 안내
수습기간이 3개월을 초과하는 근로자의 경우, 해고 시 「근로기준법」에 따른 해고예고(30일 전 서면통지) 의무가 발생합니다.
만료 30일 전까지 본채용 여부를 결정하시어 담당 노무사에게 알려주시기 바랍니다.

※ 본 안내는 대화인사노무파트너스에서 발송한 법적 의무 안내입니다.

${contactFootP}`;

      db.run(`INSERT INTO company_notices (id, company_id, company_name, notice_type, title, body, contract_id, employee_id, employee_name, contract_end, days_until_expiry, sent_at, sent_by, is_read, read_at, gn_status, gn_scheduled_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        generateId(), c.company_id, c.company_name, 'probation_expiry', title, body,
        c.id, c.employee_id, c.emp_name, c.prob_end, daysLeft, now, null, 0, '', 'sent', ''
      ]);
      sent++;
    }
    console.log(`[CRON] 수습만료 통지 완료: ${rows.length}건 대상, ${sent}건 발송`);
  } catch(e) {
    console.error('[CRON] 수습만료 통지 실패:', e.message);
  }
}, { timezone: 'Asia/Seoul' });

function generateId() {
  return 'cn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}
