function _notifFmtDate(ms){
  if(!ms) return '';
  const d  = new Date(Number(ms));
  const now = new Date();
  const diff = now - d;
  if(diff < 60000)   return '방금 전';
  if(diff < 3600000) return Math.floor(diff/60000) + '분 전';
  if(diff < 86400000) return Math.floor(diff/3600000) + '시간 전';
  if(diff < 86400000*7) return Math.floor(diff/86400000) + '일 전';
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

/* ── D-day 계산 ── */
function _notifDday(dateStr){
  if(!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const end   = new Date(dateStr); end.setHours(0,0,0,0);
  return Math.round((end - today) / 86400000);
}

/* ── 알림 아이콘 타입별 ── */
function _notifIcon(type){
  const map = {
    'contract_expiry':     { icon:'fas fa-file-contract', bg:'linear-gradient(135deg,#f59e0b,#d97706)' },
    'contract_renewal':    { icon:'fas fa-sync-alt',       bg:'linear-gradient(135deg,#10b981,#059669)' },
    'contract_dispatched': { icon:'fas fa-paper-plane',    bg:'linear-gradient(135deg,#3b82f6,#2563eb)' },
    'payslip_dispatched':  { icon:'fas fa-file-invoice',   bg:'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
    'payment':             { icon:'fas fa-won-sign',        bg:'linear-gradient(135deg,#3b82f6,#2563eb)' },
    'notice':              { icon:'fas fa-bullhorn',        bg:'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
    'welcome':             { icon:'fas fa-handshake',       bg:'linear-gradient(135deg,#06b6d4,#0891b2)' },
    'company_welcome':     { icon:'fas fa-handshake',       bg:'linear-gradient(135deg,#06b6d4,#0891b2)' },
  };
  return map[type] || { icon:'fas fa-bell', bg:'linear-gradient(135deg,#4f46e5,#6366f1)' };
}

/* ────────────────────────────────────────────────────────────────
   loadClientNotices()
   company_notices 테이블에서 currentCompany.id 기준으로 알림 조회
   ──────────────────────────────────────────────────────────────── */
async function loadClientNotices(){
  if(!currentCompany || !currentCompany.id) return;
  try {
    const res  = await fetch(`../tables/company_notices?limit=1000&sort=created_at`);
    const data = await res.json();
    const myId = String(currentCompany.id);
    const all  = (data.data||[]).filter(n => String(n.company_id) === myId);

    // ── 예약 발송 자동 처리 ──
    // scheduled 상태이고 예약 시각이 지난 공지는 고객사 앱 접속 시 자동으로 sent 처리
    const now = Date.now();
    const overdueScheduled = all.filter(n =>
      n.notice_type === 'general' &&
      n.gn_status   === 'scheduled' &&
      new Date(n.gn_scheduled_at || n.sent_at || 0).getTime() <= now
    );
    for(const n of overdueScheduled){
      try {
        await fetch(`../tables/company_notices/${n.id}`, {
          method : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ gn_status: 'sent', sent_at: new Date().toISOString(), is_read: false }),
        });
        n.gn_status = 'sent';
        n.is_read   = false;
      } catch(pe){ console.warn('[알림] 예약 발송 자동 처리 오류:', pe); }
    }

    _clientNotices = all
      .filter(n => n.gn_status !== 'scheduled' && n.gn_status !== 'cancelled')
      .sort((a,b) => Number(b.created_at||0) - Number(a.created_at||0));
    _updateNotifBadge();
  } catch(e){
    console.warn('[알림] loadClientNotices 오류:', e);
  }
}

/* ── is_read 값 안전 판별 (boolean/string/number 모두 처리) ── */
function _isReadVal(v){ return v === true || v === 'true' || v === 1 || v === '1'; }

/* ── 미읽음 뱃지 업데이트 ── */
function _updateNotifBadge(){
  // general(중요공지)은 강제 모달 처리이므로 벨 뱃지에서 제외
  const unread = _clientNotices.filter(n => n.notice_type !== 'general' && !_isReadVal(n.is_read)).length;
  const badge       = document.getElementById('notif-badge');
  const headerBadge = document.getElementById('notif-unread-count-badge');
  if(!badge) return;
  if(unread > 0){
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.style.cssText = 'display:flex!important';
  } else {
    badge.style.cssText = '';
  }
  if(headerBadge){
    if(unread > 0){
      headerBadge.textContent = `미읽음 ${unread}`;
      headerBadge.style.display = '';
    } else {
      headerBadge.style.display = 'none';
    }
  }
}

/* ────────────────────────────────────────────────────────────────
   _notifBodyHtml()
   본문 HTML 변환 — 이스케이프 후 URL 처리
   - '파일주소: <url>' → 다운로드 버튼(링크) + 주소복사 버튼
   - 그 외 http(s) URL → 클릭 시 바로 다운로드되는 링크
   ──────────────────────────────────────────────────────────────── */
function _notifBodyHtml(text){
  if(!text) return '';
  const esc = _escHtml(text);
  return esc.replace(/(파일주소\s*:\s*)(https?:\/\/[^\s<>"']+)|(https?:\/\/[^\s<>"']+)/g, (m, label, fileUrl, plainUrl) => {
    // 문장부호(마침표·쉼표 등)는 URL 밖으로 분리
    const _clean = (u) => {
      const c = u.replace(/[.,;:!?)\]\}]+$/, '');
      return { clean: c, tail: u.slice(c.length) };
    };
    if(label && fileUrl){
      const { clean, tail } = _clean(fileUrl);
      return `${label}<span class="notif-file-actions">`
        + `<a href="${clean}" target="_blank" rel="noopener" download onclick="event.stopPropagation()" class="notif-file-btn notif-download-btn"><i class="fas fa-download"></i> 다운로드</a>`
        + `<button type="button" class="notif-file-btn notif-copy-btn" onclick="event.stopPropagation();copyNotifFileUrl(this,'${clean}')"><i class="fas fa-copy"></i> 주소복사</button>`
        + `</span>${tail}`;
    }
    const raw = plainUrl || m;
    const { clean, tail } = _clean(raw);
    return `<a href="${clean}" target="_blank" rel="noopener" download onclick="event.stopPropagation()" class="notif-link">${clean}</a>${tail}`;
  });
}

/* ── 파일주소 복사 (클립보드 API + 폴백) ── */
function copyNotifFileUrl(btn, url){
  if(!url) return;
  const done = () => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> 복사됨';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;top:-100px;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch(e){}
    document.body.removeChild(ta);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(done).catch(fallback);
  } else {
    fallback();
  }
}

/* ────────────────────────────────────────────────────────────────
   renderClientNotices()
   모달 바디에 알림 목록 렌더링
   ──────────────────────────────────────────────────────────────── */
function renderClientNotices(){
  const body   = document.getElementById('notif-modal-body');
  const footer = document.getElementById('notif-modal-footer');
  if(!body) return;

  // general(중요공지)은 알림함 목록에서 제외 — 강제 모달로만 처리
  const listNotices = _clientNotices.filter(n => n.notice_type !== 'general');

  if(listNotices.length === 0){
    body.innerHTML = `
      <div class="notif-empty">
        <i class="fas fa-bell-slash"></i>
        알림이 없습니다.
      </div>`;
    if(footer) footer.style.display = 'none';
    return;
  }

  const hasUnread = listNotices.some(n => !n.is_read);
  if(footer) footer.style.display = hasUnread ? '' : 'none';

  body.innerHTML = listNotices.map(n => {
    const { icon, bg } = _notifIcon(n.notice_type);
    const isUnread = !n.is_read;
    return `
      <div class="notif-item${isUnread ? ' unread' : ''}" onclick="openNotifDetail('${n.id}')">
        <div class="notif-icon" style="background:${bg};">
          <i class="${icon}"></i>
        </div>
        <div class="notif-content">
          <div class="notif-title">${_escHtml(n.title||'알림')}</div>
          <div class="notif-body">${_notifBodyHtml(n.body||'')}</div>
          <div class="notif-time">${_notifFmtDate(n.created_at)}</div>
        </div>
        ${isUnread ? '<div class="notif-unread-dot" title="미읽음"></div>' : ''}
      </div>`;
  }).join('');
}

/* ────────────────────────────────────────────────────────────────
   openNotifModal() / closeNotifModal()
   ──────────────────────────────────────────────────────────────── */
async function openNotifModal(){
  // 모달 열 때마다 최신 데이터를 서버에서 다시 fetch
  await loadClientNotices();
  renderClientNotices();
  const ov = document.getElementById('notif-modal-overlay');
  if(ov) ov.classList.add('open');
}

function closeNotifModal(){
  const ov = document.getElementById('notif-modal-overlay');
  if(ov) ov.classList.remove('open');
}

/* ────────────────────────────────────────────────────────────────
   openNotifDetail(id)
   알림 상세 바텀시트 열기 + 읽음 처리
   ──────────────────────────────────────────────────────────────── */
async function openNotifDetail(id){
  const n = _clientNotices.find(x => x.id === id);
  if(!n) return;

  _notifDetailId = id;

  // 상세 DOM 채우기
  const titleEl   = document.getElementById('notif-detail-title');
  const metaEl    = document.getElementById('notif-detail-meta');
  const bodyEl    = document.getElementById('notif-detail-body');
  const infoBox   = document.getElementById('notif-detail-infobox');
  const empEl     = document.getElementById('notif-info-employee');
  const endDateEl = document.getElementById('notif-info-end-date');
  const ddayEl    = document.getElementById('notif-info-dday');

  if(titleEl)   titleEl.textContent  = n.title || '알림';
  if(metaEl)    metaEl.textContent   = _notifFmtDate(n.created_at) + (n.sent_by ? ' · 발송: ' + n.sent_by : '');
  if(bodyEl)    bodyEl.innerHTML     = _notifBodyHtml(n.body || '');

  // 계약 정보 박스 표시 여부 — 검수/날인 요청은 정보 박스 숨김 (본문의 파일주소 안내만 표시)
  const isNoInfo  = n.notice_type === 'contract_review_request' || n.notice_type === 'contract_seal_request';
  const isWelcome = n.notice_type === 'company_welcome' || n.notice_type === 'welcome';
  const label1El  = document.getElementById('notif-info-label-1');
  const row2El    = document.getElementById('notif-info-row-2');

  if(isNoInfo){
    if(infoBox) infoBox.style.display = 'none';
  } else if(isWelcome){
    // welcome: 고객사명 표시, 계약종료일 행 숨김
    if(label1El) label1El.textContent = '고객사';
    if(empEl)    empEl.textContent    = n.company_name || '-';
    if(row2El)   row2El.style.display = 'none';
    if(infoBox)  infoBox.style.display = '';  // 항상 표시
  } else {
    // 일반 알림: 근로자명 + 계약종료일
    if(label1El) label1El.textContent = '근로자';
    if(row2El)   row2El.style.display = '';
    const hasInfo = n.employee_name || n.contract_end;
    if(infoBox) infoBox.style.display = hasInfo ? '' : 'none';
    if(empEl)   empEl.textContent     = n.employee_name || '-';
  }
  if(endDateEl) endDateEl.textContent = n.contract_end || '-';

  // D-day 표시
  if(n.contract_end && ddayEl){
    const dd = _notifDday(n.contract_end);
    if(dd !== null){
      ddayEl.textContent = dd > 0 ? `D-${dd}` : dd === 0 ? 'D-day' : `D+${Math.abs(dd)}`;
      ddayEl.style.display = '';
      ddayEl.style.background = dd <= 0 ? '#fef2f2' : dd <= 7 ? '#fff7ed' : '#f0fdf4';
      ddayEl.style.color      = dd <= 0 ? '#dc2626' : dd <= 7 ? '#d97706' : '#16a34a';
      ddayEl.style.borderColor= dd <= 0 ? '#fca5a5' : dd <= 7 ? '#fdba74' : '#86efac';
    } else {
      ddayEl.style.display = 'none';
    }
  } else if(ddayEl) {
    ddayEl.style.display = 'none';
  }

  // 시트 열기 (모달을 닫고 시트를 표시)
  closeNotifModal();
  const ov = document.getElementById('notif-detail-overlay');
  if(ov) ov.classList.add('open');

  // 읽음 처리 (미읽음 상태일 때만)
  if(!n.is_read){
    await markNotifRead(id);
  }
}

/* ── 알림 상세 닫기 ── */
function closeNotifDetail(){
  const ov = document.getElementById('notif-detail-overlay');
  if(ov) ov.classList.remove('open');
  _notifDetailId = null;
}

/* ────────────────────────────────────────────────────────────────
   markNotifRead(id)
   단일 알림 읽음 처리: PATCH is_read:true, read_at:now
   ──────────────────────────────────────────────────────────────── */
async function markNotifRead(id){
  try {
    await fetch(`../tables/company_notices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true, read_at: String(Date.now()) }),
    });
    // 로컬 캐시 업데이트
    const n = _clientNotices.find(x => x.id === id);
    if(n){ n.is_read = true; n.read_at = String(Date.now()); }
    _updateNotifBadge();
  } catch(e){
    console.warn('[알림] markNotifRead 오류:', e);
  }
}

/* ────────────────────────────────────────────────────────────────
   markAllNotifRead()
   전체 읽음 처리: 미읽음 알림 모두 PATCH
   ──────────────────────────────────────────────────────────────── */
async function markAllNotifRead(){
  const unread = _clientNotices.filter(n => !n.is_read);
  if(unread.length === 0) return;

  const now = String(Date.now());
  try {
    await Promise.all(unread.map(n =>
      fetch(`../tables/company_notices/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true, read_at: now }),
      })
    ));
    // 로컬 캐시 업데이트
    unread.forEach(n => { n.is_read = true; n.read_at = now; });
    _updateNotifBadge();
    renderClientNotices();   // 모달 바디 재렌더
    showToast('모든 알림을 읽음 처리했습니다.');
  } catch(e){
    console.warn('[알림] markAllNotifRead 오류:', e);
  }
}

/* ── HTML 이스케이프 헬퍼 (notif 전용) ── */
function _escHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ════════════════════════════════════════════════════════════════
   중요공지(general) 강제 확인 모달
   ════════════════════════════════════════════════════════════════ */

let _gnAlertQueue  = [];   // 표시 대기 중인 general 공지 배열
let _gnAlertIndex  = 0;    // 현재 표시 중인 인덱스

/**
 * showGnAlerts(notices)
 * general + is_read:false 인 공지를 sent_at 오름차순으로 순차 표시
 */
function showGnAlerts(notices){
  // sent_at 오래된 것부터 순서대로
  _gnAlertQueue = [...notices].sort((a,b) => {
    const ta = new Date(a.sent_at||0).getTime();
    const tb = new Date(b.sent_at||0).getTime();
    return ta - tb;
  });
  _gnAlertIndex = 0;
  if(_gnAlertQueue.length === 0) return;
  _renderGnAlert();
}

/** 현재 인덱스의 공지를 모달에 채우고 표시 */
function _renderGnAlert(){
  const n       = _gnAlertQueue[_gnAlertIndex];
  const total   = _gnAlertQueue.length;
  const current = _gnAlertIndex + 1;

  const titleEl   = document.getElementById('gn-alert-title-el');
  const metaEl    = document.getElementById('gn-alert-meta');
  const bodyEl    = document.getElementById('gn-alert-body');
  const counterEl = document.getElementById('gn-alert-counter');
  const confirmBtn= document.getElementById('gn-alert-confirm-btn');

  if(!titleEl) return;

  // 제목·발신일·본문
  titleEl.textContent = n.title || '중요공지';
  const sentDate = n.sent_at
    ? new Date(n.sent_at).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
    : '';
  metaEl.textContent  = sentDate + (n.sent_by ? ' · ' + n.sent_by : '');
  bodyEl.textContent  = n.body  || '';

  // 복수 건 카운터 (2건 이상일 때만 표시)
  if(total > 1){
    counterEl.textContent = `${current} / ${total}`;
    counterEl.style.display = '';
  } else {
    counterEl.style.display = 'none';
  }

  // 마지막 건이면 "확인", 중간이면 "확인 (다음 공지 →)"
  const isLast = current === total;
  confirmBtn.innerHTML = isLast
    ? `<i class="fas fa-check"></i>&nbsp; 확인`
    : `<i class="fas fa-check"></i>&nbsp; 확인 <span style="font-size:12px;opacity:.85;">(${current}/${total})</span>&nbsp;<i class="fas fa-chevron-right" style="font-size:12px;"></i>`;

  // 모달 열기
  const ov = document.getElementById('gn-alert-overlay');
  if(ov) ov.classList.add('open');
}

/**
 * gnAlertConfirm()
 * 확인 버튼 클릭 → 현재 공지 읽음 처리 → 다음 건 있으면 이어서, 없으면 닫기
 */
async function gnAlertConfirm(){
  const n = _gnAlertQueue[_gnAlertIndex];
  if(!n) { _closeGnAlert(); return; }

  // 읽음 처리 (백그라운드) — is_read 타입 무관하게 안전 처리
  if(!_isReadVal(n.is_read)){
    try {
      await fetch(`../tables/company_notices/${n.id}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ is_read: true, read_at: String(Date.now()) }),
      });
      const cached = _clientNotices.find(x => x.id === n.id);
      if(cached){ cached.is_read = true; cached.read_at = String(Date.now()); }
    } catch(e){ console.warn('[공지 읽음 처리 오류]', e); }
  }

  _gnAlertIndex++;

  if(_gnAlertIndex < _gnAlertQueue.length){
    // 다음 건 렌더
    _renderGnAlert();
  } else {
    _closeGnAlert();
  }
}

/** 강제 모달 닫기 */
function _closeGnAlert(){
  const ov = document.getElementById('gn-alert-overlay');
  if(ov) ov.classList.remove('open');
  _gnAlertQueue = [];
  _gnAlertIndex = 0;
  // 뱃지·알림함 목록은 변화 없음 (general은 목록에서 제외)
}

/* ────────────────────────────────────────────────────────────────
   알림함 모달 — 배경 클릭 닫기
   모달 HTML이 script 블록 이후에 위치하므로 DOMContentLoaded 사용
   ──────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function(){
  const ov = document.getElementById('notif-modal-overlay');
  if(ov) ov.addEventListener('click', function(e){
    if(e.target === ov) closeNotifModal();
  });
  const dov = document.getElementById('notif-detail-overlay');
  if(dov) dov.addEventListener('click', function(e){
    if(e.target === dov) closeNotifDetail();
  });
  // 중요공지 모달: 배경 클릭으로 닫기 불가 (의도적으로 이벤트 리스너 없음)
});

// ═══════════════════════════════════════════════════════════════════════════════

// ── INIT ──