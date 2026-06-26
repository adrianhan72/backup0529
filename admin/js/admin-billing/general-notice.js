//  중요공지 관리 (page-general-notice)
// ======================================================================

// ── 상태 변수 ──
let _gnSelectedIds    = new Set(); // 선택된 고객사 ID 집합
let _gnScheduleTimers = [];        // 예약 타이머 핸들 목록

// ─────────────────────────────────────────────
// 페이지 초기화
// ─────────────────────────────────────────────
async function initGnPage(){
  renderGnCompanyChips();
}

// ─────────────────────────────────────────────
// 고객사 칩 렌더
// ─────────────────────────────────────────────
function renderGnCompanyChips(){
  const q = (document.getElementById('gn-company-search')?.value || '').toLowerCase();
  const chips = document.getElementById('gn-company-chips');
  if(!chips) return;
  const list = allCompanies
    .filter(c => !c.is_draft && c.status===COMPANY_STATUS.ACTIVE && (!q || (c.company_name||'').toLowerCase().includes(q)))
    .sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'','ko'));
  if(!list.length){
    chips.innerHTML = `<div style="font-size:12.5px;color:#9ca3af;padding:8px 0;">${q ? `"${q}" 검색 결과가 없습니다` : '이용 중인 고객사가 없습니다'}</div>`;
    _updateGnSelectedCount();
    return;
  }
  chips.innerHTML = list.map(c => {
    const isSel = _gnSelectedIds.has(c.id);
    return `<button onclick="toggleGnCompany('${c.id}')"
      class="co-chip${isSel?' selected':''}">
      ${isSel?'<i class="fas fa-check" style="font-size:10px;"></i>':'<i class="fas fa-building" style="font-size:11px;"></i>'}
      ${c.company_name||''}
    </button>`;
  }).join('');
  _updateGnSelectedCount();
  _updateGnSelectBtn();
}

function toggleGnCompany(id){
  if(_gnSelectedIds.has(id)) _gnSelectedIds.delete(id);
  else _gnSelectedIds.add(id);
  renderGnCompanyChips();
}

function gnSelectAll(){
  const q = (document.getElementById('gn-company-search')?.value || '').toLowerCase();
  allCompanies
    .filter(c => !c.is_draft && c.status===COMPANY_STATUS.ACTIVE && (!q || (c.company_name||'').toLowerCase().includes(q)))
    .forEach(c => _gnSelectedIds.add(c.id));
  renderGnCompanyChips();
}

function gnDeselectAll(){
  _gnSelectedIds.clear();
  renderGnCompanyChips();
}

function _updateGnSelectBtn(){
  const q = (document.getElementById('gn-company-search')?.value || '').toLowerCase();
  const total = allCompanies.filter(c => !c.is_draft && c.status===COMPANY_STATUS.ACTIVE && (!q || (c.company_name||'').toLowerCase().includes(q))).length;
  const btn = document.querySelector('.gn-sel-btn.select');
  if(!btn) return;
  const isAll = total > 0 && _gnSelectedIds.size >= total;
  btn.classList.toggle('active', isAll);
}

function _updateGnSelectedCount(){
  const cnt = _gnSelectedIds.size;
  const el  = document.getElementById('gn-selected-count');
  if(el) el.textContent = cnt > 0 ? `${cnt}개 고객사 선택됨` : '선택된 고객사가 없습니다.';
  const btn = document.getElementById('gn-compose-btn');
  if(btn){ btn.disabled = cnt === 0; btn.style.opacity = cnt > 0 ? '1' : '.4'; }
}

// ─────────────────────────────────────────────
// 공지 작성 모달
// ─────────────────────────────────────────────
function openGnComposeModal(){
  if(_gnSelectedIds.size === 0){ toast('고객사를 먼저 선택하세요.','error'); return; }

  const modal = document.getElementById('gn-compose-modal');
  modal.dataset.editId = '';  // 작성 모드

  // 헤더 작성 모드로
  document.getElementById('gn-modal-icon').className  = 'fas fa-bullhorn';
  document.getElementById('gn-modal-icon').style.color = '#f59e0b';
  document.getElementById('gn-modal-title').textContent = '중요공지 작성';

  // 수신 고객사 영역 표시 / 안내 배너 숨김
  document.getElementById('gn-modal-targets-wrap').style.display = '';
  document.getElementById('gn-modal-edit-banner').style.display  = 'none';

  // 수신 고객사 표시
  const targets = document.getElementById('gn-modal-targets');
  if(targets){
    targets.innerHTML = [..._gnSelectedIds].map(id => {
      const co = allCompanies.find(x => x.id === id);
      return `<span style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:14px;
                           font-size:12px;font-weight:700;">${co?.company_name||id}</span>`;
    }).join('');
  }

  // 입력 초기화
  document.getElementById('gn-title').value = '';
  document.getElementById('gn-body').value  = '';
  const tog = document.getElementById('gn-schedule-toggle');
  tog.checked = false;
  tog.disabled = false;
  document.getElementById('gn-schedule-panel').style.display = 'none';
  document.getElementById('gn-schedule-toggle-label').style.opacity = '';

  // 버튼 작성 모드
  document.getElementById('gn-submit-icon').className = 'fas fa-paper-plane';
  document.getElementById('gn-submit-label').textContent = '즉시 발송';

  // 예약 일시 기본값: 현재 + 1시간
  const dtEl = document.getElementById('gn-scheduled-at');
  if(dtEl){
    const d = new Date(Date.now() + 3600000);
    dtEl.value = d.toISOString().slice(0,16);
  }
  modal.style.display = 'flex';
}

/** 예약 메시지 수정 모달 오픈 */
async function openGnEditModal(recordId){
  const n = _cnlList.find(x => x.id === recordId);
  if(!n){ toast('레코드를 찾을 수 없습니다.', 'error'); return; }
  if(n.gn_status !== 'scheduled'){
    toast('이미 발송되었거나 취소된 공지는 수정할 수 없습니다.', 'error');
    return;
  }

  const modal = document.getElementById('gn-compose-modal');
  modal.dataset.editId = recordId;  // 수정 모드

  // 헤더 수정 모드로
  document.getElementById('gn-modal-icon').className  = 'fas fa-edit';
  document.getElementById('gn-modal-icon').style.color = '#6366f1';
  document.getElementById('gn-modal-title').textContent = '예약 공지 수정';

  // 수신 고객사 영역 숨김 / 안내 배너 표시
  document.getElementById('gn-modal-targets-wrap').style.display = 'none';
  document.getElementById('gn-modal-edit-banner').style.display  = '';
  document.getElementById('gn-modal-edit-company').textContent   = n.company_name || '';

  // 기존 값 쇼입
  document.getElementById('gn-title').value = n.title || '';
  document.getElementById('gn-body').value  = n.body  || '';

  // 예약 발송은 항상 체크 (=해제 불가)
  const tog = document.getElementById('gn-schedule-toggle');
  tog.checked  = true;
  tog.disabled = true;
  document.getElementById('gn-schedule-toggle-label').style.opacity = '0.6';
  document.getElementById('gn-schedule-panel').style.display = '';

  // 예약 일시 쇼입
  const dtEl = document.getElementById('gn-scheduled-at');
  if(dtEl && n.gn_scheduled_at){
    const d = new Date(n.gn_scheduled_at);
    dtEl.value = isNaN(d) ? '' : d.toISOString().slice(0,16);
  }

  // 버튼 수정 모드로
  document.getElementById('gn-submit-icon').className = 'fas fa-save';
  document.getElementById('gn-submit-label').textContent = '예약 수정 저장';

  modal.style.display = 'flex';
}

function closeGnComposeModal(){
  document.getElementById('gn-compose-modal').style.display = 'none';
}

function toggleGnSchedule(){
  const on = document.getElementById('gn-schedule-toggle').checked;
  document.getElementById('gn-schedule-panel').style.display = on ? '' : 'none';
  const lbl = document.getElementById('gn-submit-label');
  if(lbl) lbl.textContent = on ? '예약 등록' : '즉시 발송';
}

// 모달 외부 클릭 닫기
document.addEventListener('click', function(e){
  const modal = document.getElementById('gn-compose-modal');
  if(modal && modal.style.display === 'flex' && e.target === modal) closeGnComposeModal();
});

// ─────────────────────────────────────────────
// 공지 제출 (즉시 / 예약)
// ─────────────────────────────────────────────
async function submitGnNotice(){
  const modal     = document.getElementById('gn-compose-modal');
  const editId    = modal?.dataset?.editId || '';   // '' = 작성, 값 있으면 수정 모드
  const title     = (document.getElementById('gn-title')?.value || '').trim();
  const body      = (document.getElementById('gn-body')?.value  || '').trim();
  const isSchedule= document.getElementById('gn-schedule-toggle')?.checked;
  const scheduledAt = document.getElementById('gn-scheduled-at')?.value;

  if(!title) return toast('제목을 입력하세요.','error');
  if(!body)  return toast('본문을 입력하세요.','error');
  if(isSchedule){
    if(!scheduledAt) return toast('예약 발송 일시를 설정하세요.','error');
    const schedDt = new Date(scheduledAt);
    if(schedDt <= new Date()) return toast('예약 일시는 현재 시각 이후로 설정하세요.','error');
  }

  // ── 수정 모드: 기존 예약 레코드 PATCH ──
  if(editId){
    try {
      await fetch(`../tables/company_notices/${editId}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          title,
          body,
          gn_scheduled_at: scheduledAt,
          sent_at        : scheduledAt,
        }),
      });

      // 기존 타이머 제거 후 새 타이머 등록
      _gnScheduleTimers.forEach(id => clearTimeout(id));
      _gnScheduleTimers = [];
      const n = _cnlList.find(x => x.id === editId);
      if(n){
        const co = { id: n.company_id, name: n.company_name };
        const adminName = _getAdminUsername();
        const delay = new Date(scheduledAt).getTime() - Date.now();
        if(delay > 0){
          const timerId = setTimeout(() => _gnFireScheduled(editId, co, title, body, adminName), delay);
          _gnScheduleTimers.push(timerId);
        }
        // _cnlList 캐시도 즉시 갱신
        n.title = title; n.body = body;
        n.gn_scheduled_at = scheduledAt; n.sent_at = scheduledAt;
      }

      toast('✅ 예약 공지가 수정되었습니다.', 'success');
    } catch(e){
      console.error('[예약 수정 오류]', e);
      toast('수정 중 오류가 발생했습니다.', 'error');
      return;
    }
    closeGnComposeModal();
    renderCnlReserveCard();
    return;
  }

  const adminName = _getAdminUsername();
  const targets   = [..._gnSelectedIds].map(id => {
    const co = allCompanies.find(x => x.id === id);
    return { id, name: co?.company_name || '' };
  });

  if(isSchedule){
    // ── 예약 발송: DB에 status='scheduled' 로 저장 후 타이머 등록 ──
    for(const co of targets){
      const record = {
        company_id   : co.id,
        company_name : co.name,
        notice_type  : 'general',
        title,
        body,
        employee_id  : '',
        employee_name: '',
        contract_id  : '',
        contract_end : '',
        days_until_expiry: 0,
        sent_at      : scheduledAt,           // 예약 일시를 sent_at에 저장
        sent_by      : adminName,
        is_read      : false,
        read_at      : '',
        gn_status    : 'scheduled',           // 예약 상태 구분 필드
        gn_scheduled_at: scheduledAt,
      };
      try {
        const saved = await fetch('../tables/company_notices', {
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(record)
        });
        const savedData = await saved.json();
        // 타이머 등록
        const delay = new Date(scheduledAt).getTime() - Date.now();
        const timerId = setTimeout(() => _gnFireScheduled(savedData.id || record.id, co, title, body, adminName), delay);
        _gnScheduleTimers.push(timerId);
      } catch(e){ console.error('[예약 저장 오류]', e); }
    }
    toast(`✅ ${targets.length}개 고객사에 예약 발송이 등록되었습니다.`, 'success');
  } else {
    // ── 즉시 발송 ──
    const nowISO = new Date().toISOString();
    for(const co of targets){
      await _sendCompanyNotice({
        companyId  : co.id,
        companyName: co.name,
        noticeType : 'general',
        title,
        body,
        extraData  : { gn_status: 'sent', gn_scheduled_at: '' },
      });
    }
    toast(`✅ ${targets.length}개 고객사에 공지를 즉시 발송했습니다.`, 'success');
  }

  closeGnComposeModal();
  // 발송 이력은 알림 발송 이력 페이지로 이동하여 확인 (데이터 리셋 후 전체 재로드)
  _cnlLoaded = false;
  const _cnlMenu = document.querySelector('.menu-item[data-page="company-notice-log"]');
  showPage('company-notice-log', _cnlMenu);
}

// ─────────────────────────────────────────────
// 예약 발송 실행 (타이머 콜백)
// ─────────────────────────────────────────────
async function _gnFireScheduled(recordId, co, title, body, adminName){
  const nowISO = new Date().toISOString();
  try {
    // 기존 레코드를 sent 상태로 패치
    await fetch(`../tables/company_notices/${recordId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ gn_status:'sent', sent_at: nowISO, is_read: false })
    });
    toast(`📣 [${co.name}] 예약 공지가 발송되었습니다.`, 'success');
    // 알림 발송 이력 페이지가 열려 있으면 이력 갱신
    if(document.getElementById('page-company-notice-log')?.classList.contains('active')){
      await cnlReload();
    }
  } catch(e){ console.error('[예약 발송 실행 오류]', e); }
}

// ─────────────────────────────────────────────
// 페이지 진입 시 미발송 예약 건 타이머 복원
// ─────────────────────────────────────────────
async function _gnRestoreScheduledTimers(){
  try {
    const res  = await api('../tables/company_notices?limit=500');
    const rows = (res.data || []).filter(n => n.notice_type === 'general' && n.gn_status === 'scheduled');
    const now  = Date.now();
    const adminName = _getAdminUsername();
    for(const r of rows){
      const schedTime = new Date(r.gn_scheduled_at || r.sent_at).getTime();
      if(isNaN(schedTime)) continue;
      const delay = schedTime - now;
      const co = { id: r.company_id, name: r.company_name || '' };
      if(delay <= 0){
        // 이미 지난 예약 → 즉시 실행
        await _gnFireScheduled(r.id, co, r.title, r.body, adminName);
      } else {
        const timerId = setTimeout(() => _gnFireScheduled(r.id, co, r.title, r.body, adminName), delay);
        _gnScheduleTimers.push(timerId);
      }
    }
  } catch(e){ console.error('[예약 타이머 복원 오류]', e); }
}

// ─────────────────────────────────────────────
// 예약 발송 폴링 (60초마다 미발송 scheduled 건 재확인)
// 관리자 페이지가 열린 동안 주기적으로 DB를 체크해
// setTimeout 누락분을 보완합니다.
// ─────────────────────────────────────────────
let _gnPollingTimer = null;
function _gnStartPolling(){
  if(_gnPollingTimer) return; // 중복 방지
  _gnPollingTimer = setInterval(async () => {
    try {
      const res  = await fetch('../tables/company_notices?limit=500');
      if(!res.ok) return;
      const data = await res.json();
      const rows = (data.data || []).filter(n =>
        n.notice_type === 'general' && n.gn_status === 'scheduled'
      );
      if(!rows.length) return;
      const now       = Date.now();
      const adminName = _getAdminUsername();
      for(const r of rows){
        const schedTime = new Date(r.gn_scheduled_at || r.sent_at).getTime();
        if(isNaN(schedTime)) continue;
        if(schedTime <= now){
          const co = { id: r.company_id, name: r.company_name || '' };
          await _gnFireScheduled(r.id, co, r.title, r.body, adminName);
        }
      }
    } catch(e){ console.warn('[GN 폴링 오류]', e); }
  }, 60 * 1000); // 60초마다
}

// ─────────────────────────────────────────────
// 예약 취소
// ─────────────────────────────────────────────
async function cancelGnScheduled(recordId){
  if(!confirm('이 예약 공지를 취소하시겠습니까?')) return;
  try {
    await fetch(`../tables/company_notices/${recordId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ gn_status:'cancelled' })
    });
    toast('예약 공지가 취소되었습니다.', 'success');
    // CNL 페이지에서 호출되므로 cnlReload()로 갱신
    await cnlReload();
  } catch(e){ toast('취소 처리 중 오류가 발생했습니다.','error'); }
}

// ─────────────────────────────────────────────
// 산정기준 업데이트 시 전체 고객사 중요공지 자동 발송
// ─────────────────────────────────────────────
async function _gnSendStandardsUpdateNotice(updateType, detail){
  const adminName = _getAdminUsername();
  const targets   = allCompanies.filter(c => !c.is_draft && c.status===COMPANY_STATUS.ACTIVE);
  if(!targets.length) return;
  const title = `[산정기준 업데이트] ${updateType} 기준이 변경되었습니다`;
  const body  =
`안녕하세요.

대화인사노무파트너스에서 최신 산정기준을 업데이트하였습니다.

■ 업데이트 항목: ${updateType}
${detail}
■ 업데이트 일시: ${new Date().toLocaleString('ko-KR')}

급여 계산 시 변경된 기준이 자동 반영됩니다.
상세 내용은 담당 노무사에게 문의하세요.

${_BRAND_SIG}`;

  let cnt = 0;
  for(const co of targets){
    await _sendCompanyNotice({
      companyId  : co.id,
      companyName: co.company_name || '',
      noticeType : 'general',
      title, body,
      extraData  : { gn_status:'sent', gn_scheduled_at:'' },
    });
    cnt++;
  }
  toast(`📣 ${cnt}개 고객사에 산정기준 업데이트 공지를 발송했습니다.`, 'success');
}

// ======================================================================
// END 중요공지 관리
// ======================================================================

// ======================================================================
// END 알림 발송 이력
