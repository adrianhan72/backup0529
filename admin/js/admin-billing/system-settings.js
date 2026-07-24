// ==========================================
//   시스템 설정 페이지 (대표 연락처 + 발신 이메일)
// ==========================================

let _ssContactData = null;

// ── 페이지 진입 시 데이터 로드 ──
async function renderSystemSettings() {
  try {
    const res = await fetch('../tables/representative_contact/default');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _ssContactData = data;

    // 대표 연락처
    const phoneEl = document.getElementById('ss-rc-phone');
    const emailEl = document.getElementById('ss-rc-email');
    const faxEl   = document.getElementById('ss-rc-fax');
    if (phoneEl) phoneEl.value = data.phone || '';
    if (emailEl) emailEl.value = data.email || '';
    if (faxEl)   faxEl.value   = data.fax   || '';

    // 발신전용 이메일
    const oeEmailEl = document.getElementById('ss-oe-email');
    const oePwEl    = document.getElementById('ss-oe-password');
    const oeHostEl  = document.getElementById('ss-oe-smtp-host');
    const oePortEl  = document.getElementById('ss-oe-smtp-port');
    if (oeEmailEl) oeEmailEl.value = data.outbound_email     || '';
    if (oePwEl)    oePwEl.value    = data.outbound_password  || '';
    if (oeHostEl)  oeHostEl.value  = data.outbound_smtp_host || '';
    if (oePortEl)  oePortEl.value  = data.outbound_smtp_port || '';
    // 푸터 미리보기 갱신 + 실시간 연동
    ssUpdateFooterPreview();
    _ssBindFooterPreviewInputs();

    // 메시지 규칙 로드
    ssLoadMessageRule();
  } catch (e) {
    console.warn('[시스템 설정 로드 오류]', e);
    toast('설정 정보를 불러오지 못했습니다.', 'error');
  }
}

// ── 대표 연락처 저장 ──
async function ssSaveRepresentativeContact() {
  const phone = document.getElementById('ss-rc-phone')?.value.trim() || '';
  const email = document.getElementById('ss-rc-email')?.value.trim() || '';
  const fax   = document.getElementById('ss-rc-fax')?.value.trim()   || '';

  const saveBtn = document.getElementById('ss-rc-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try {
    await fetch('../tables/representative_contact/default', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, email, fax, updated_at: Date.now() })
    });
    _ssContactData = { ...(_ssContactData || {}), phone, email, fax };
    // 다른 페이지에서 사용하는 글로벌 캐시도 갱신
    if (typeof _rcContactData !== 'undefined') {
      _rcContactData = _ssContactData;
    }
    const msg = document.getElementById('ss-rc-saved-msg');
    if (msg) { msg.style.display = ''; setTimeout(() => { msg.style.display = 'none'; }, 2000); }
    toast('대표 연락처가 저장되었습니다.', 'success');
  } catch (e) {
    console.error('[대표 연락처 저장 오류]', e);
    toast('저장에 실패했습니다.', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 저장'; }
  }
}

// ── 발신전용 이메일 저장 ──
async function ssSaveOutboundEmail() {
  const outbound_email     = document.getElementById('ss-oe-email')?.value.trim()     || '';
  const outbound_password  = document.getElementById('ss-oe-password')?.value.trim()  || '';
  const outbound_smtp_host = document.getElementById('ss-oe-smtp-host')?.value.trim() || '';
  const outbound_smtp_port = document.getElementById('ss-oe-smtp-port')?.value.trim() || '';

  const saveBtn = document.getElementById('ss-oe-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try {
    await fetch('../tables/representative_contact/default', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outbound_email, outbound_password, outbound_smtp_host, outbound_smtp_port, updated_at: Date.now() })
    });
    if (_ssContactData) {
      Object.assign(_ssContactData, { outbound_email, outbound_password, outbound_smtp_host, outbound_smtp_port });
    }
    // 다른 페이지에서 사용하는 글로벌 캐시도 갱신
    if (typeof _rcContactData !== 'undefined' && _rcContactData) {
      Object.assign(_rcContactData, { outbound_email, outbound_password, outbound_smtp_host, outbound_smtp_port });
    }
    const msg = document.getElementById('ss-oe-saved-msg');
    if (msg) { msg.style.display = ''; setTimeout(() => { msg.style.display = 'none'; }, 2000); }
    toast('발신전용 이메일 계정이 저장되었습니다.', 'success');
  } catch (e) {
    console.error('[발신전용 이메일 저장 오류]', e);
    toast('저장에 실패했습니다.', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 저장'; }
  }
  // 저장 후 푸터 미리보기 갱신
  ssUpdateFooterPreview();
}

// ═══════════════════════════════════════════
// 인앱 알림 공통 푸터 미리보기 (실시간)
// ═══════════════════════════════════════════

function _ssBindFooterPreviewInputs() {
  ['ss-rc-phone', 'ss-rc-email', 'ss-rc-fax'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', ssUpdateFooterPreview);
  });
}

function ssUpdateFooterPreview() {
  const preview = document.getElementById('ss-footer-preview');
  if (!preview) return;
  const phone = document.getElementById('ss-rc-phone')?.value.trim() || '02)3487-8841';
  const email = document.getElementById('ss-rc-email')?.value.trim() || 'eunyangpark@naver.com';
  const fax   = document.getElementById('ss-rc-fax')?.value.trim()   || '02)3487-8882';
  preview.textContent = 
`─────────────────────
인사톡 노무톡 · 대화인사노무파트너스 담당자
● 전화: ${phone}
● 이메일: ${email}
● 팩스: ${fax}`;
}

// ═══════════════════════════════════════════
// 메시지 본문 규칙 관리
// ═══════════════════════════════════════════

const MSG_RULE_DEFAULTS = {
  contract_dispatched: {
    title: `[근로계약서 발송] {근로자명} — 근로계약서가 발송되었습니다`,
    body: `안녕하세요, {회사명} 대표자님.

근로기준법 제17조(근로조건의 명시)에 따라 소속 근로자 {근로자명}에게 {고용형태} 근로계약서가 {발송방법}(으)로 발송 완료되었음을 알려드립니다.

■ 발송 시각: {발송시각}

* 근로계약서 날인본 사진은 계약 종료일로부터 5년간 보관됩니다.`
  }
};

// ── 발송 수단별 메시지 유형 매핑 ──
const MSG_CHANNEL_TYPES = {
  inapp: [
    { value: 'contract_dispatched', label: '근로계약서 발송 완료' },
  ],
  kakao: [
    { value: '', label: '— 추후 지원 예정 —', disabled: true },
  ],
  email: [
    { value: '', label: '— 추후 지원 예정 —', disabled: true },
  ],
};

/** 발송 수단 변경 → 메시지 유형 목록 활성화 */
function ssOnChannelChange() {
  const channelEl = document.getElementById('ss-rule-channel');
  const typeEl    = document.getElementById('ss-rule-type');
  const titleEl   = document.getElementById('ss-rule-title');
  const bodyEl    = document.getElementById('ss-rule-body');
  if (!channelEl || !typeEl) return;

  const channel = channelEl.value;
  const types   = MSG_CHANNEL_TYPES[channel] || [];

  // 메시지 유형 select 재구성
  typeEl.innerHTML = '';
  if (types.length === 0) {
    typeEl.innerHTML = '<option value="">발송 수단을 먼저 선택하세요</option>';
    typeEl.disabled = true;
  } else {
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = t.label;
      if (t.disabled) opt.disabled = true;
      typeEl.appendChild(opt);
    });
    typeEl.disabled = false;
  }

  // 제목/본문 초기화
  if (titleEl) titleEl.value = '';
  if (bodyEl)  bodyEl.value  = '';

  // 첫 번째 활성 타입 자동 선택
  const firstActive = types.find(t => !t.disabled);
  if (firstActive) {
    typeEl.value = firstActive.value;
    ssLoadMessageRule();
  }
}

function _ssGetRulesData() {
  try {
    const raw = _ssContactData?.msg_body_rules;
    if (!raw) return {};
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch(e) { return {}; }
}

async function ssLoadMessageRule() {
  const typeEl = document.getElementById('ss-rule-type');
  const titleEl = document.getElementById('ss-rule-title');
  const bodyEl  = document.getElementById('ss-rule-body');
  if (!typeEl || !titleEl || !bodyEl) return;

  const ruleType = typeEl.value;
  if (!ruleType) {
    titleEl.value = '';
    bodyEl.value  = '';
    _ssSetRuleInputsDisabled(true);
    return;
  }
  _ssSetRuleInputsDisabled(false);

  const rules = _ssGetRulesData();
  const rule = rules[ruleType] || MSG_RULE_DEFAULTS[ruleType] || { title: '', body: '' };

  titleEl.value = rule.title || '';
  bodyEl.value  = rule.body  || '';
}

function ssResetMessageRule() {
  const typeEl = document.getElementById('ss-rule-type');
  const titleEl = document.getElementById('ss-rule-title');
  const bodyEl  = document.getElementById('ss-rule-body');
  if (!typeEl || !titleEl || !bodyEl) return;

  const ruleType = typeEl.value;
  if (!ruleType) return;
  const def = MSG_RULE_DEFAULTS[ruleType];
  if (!def) return;

  titleEl.value = def.title || '';
  bodyEl.value  = def.body  || '';
  toast('기본값으로 초기화되었습니다. 저장 버튼을 눌러 적용하세요.', 'info');
}

function _ssSetRuleInputsDisabled(disabled) {
  const titleEl = document.getElementById('ss-rule-title');
  const bodyEl  = document.getElementById('ss-rule-body');
  const saveBtn = document.getElementById('ss-rule-save-btn');
  const resetBtn = document.getElementById('ss-rule-reset-btn');
  if (titleEl) { titleEl.disabled = disabled; titleEl.style.opacity = disabled ? '0.5' : ''; }
  if (bodyEl)  { bodyEl.disabled  = disabled; bodyEl.style.opacity  = disabled ? '0.5' : ''; }
  if (saveBtn) { saveBtn.disabled = disabled; saveBtn.style.opacity = disabled ? '0.5' : ''; }
  if (resetBtn) { resetBtn.disabled = disabled; resetBtn.style.opacity = disabled ? '0.5' : ''; }
}

async function ssSaveMessageRule() {
  const typeEl = document.getElementById('ss-rule-type');
  const titleEl = document.getElementById('ss-rule-title');
  const bodyEl  = document.getElementById('ss-rule-body');
  if (!typeEl || !titleEl || !bodyEl) return;

  const ruleType = typeEl.value;
  if (!ruleType) { toast('메시지 유형을 선택하세요.', 'error'); return; }
  const title = titleEl.value.trim();
  const body  = bodyEl.value.trim();
  if (!title || !body) { toast('제목과 본문을 모두 입력하세요.', 'error'); return; }

  const saveBtn = document.getElementById('ss-rule-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try {
    const rules = _ssGetRulesData();
    rules[ruleType] = { title, body };
    await fetch('../tables/representative_contact/default', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_body_rules: JSON.stringify(rules), updated_at: Date.now() })
    });
    if (_ssContactData) _ssContactData.msg_body_rules = JSON.stringify(rules);
    // 글로벌 캐시 갱신
    if (typeof _rcContactData !== 'undefined' && _rcContactData) {
      _rcContactData.msg_body_rules = JSON.stringify(rules);
    }
    const msg = document.getElementById('ss-rule-saved-msg');
    if (msg) { msg.style.display = ''; setTimeout(() => { msg.style.display = 'none'; }, 2000); }
    toast('메시지 규칙이 저장되었습니다.', 'success');
  } catch (e) {
    console.error('[메시지 규칙 저장 오류]', e);
    toast('저장에 실패했습니다.', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 규칙 저장'; }
  }
}

/**
 * 메시지 본문 규칙 조회 (발송 코드에서 호출)
 * @param {string} ruleType - 'contract_dispatched' 등
 * @returns {{title: string, body: string}|null}
 */
function getMsgBodyRule(ruleType) {
  // 캐시된 연락처 데이터에서 규칙 조회
  const contactData = (typeof _rcContactData !== 'undefined' && _rcContactData) 
    || (typeof _ssContactData !== 'undefined' && _ssContactData);
  if (!contactData) return MSG_RULE_DEFAULTS[ruleType] || null;

  try {
    const raw = contactData.msg_body_rules;
    if (!raw) return MSG_RULE_DEFAULTS[ruleType] || null;
    const rules = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return rules[ruleType] || MSG_RULE_DEFAULTS[ruleType] || null;
  } catch(e) {
    return MSG_RULE_DEFAULTS[ruleType] || null;
  }
}

// ═══════════════════════════════════════════
// 시스템 설정 재인증 가드 (마스터 관리자 전용)
// ═══════════════════════════════════════════

let _ssPendingMenuEl = null;

/**
 * 시스템 설정 메뉴 표시 여부 제어 (마스터 관리자만 접근)
 * 로그인 직후 호출됨
 */
function _ssInitMenuVisibility() {
  const menuItem = document.querySelector('[data-page="system-settings"]');
  if (!menuItem) return;
  const username = sessionStorage.getItem('admin_username') || '';
  if (username === 'admin') {
    menuItem.style.display = '';
  } else {
    menuItem.style.display = 'none';
  }
}

// 페이지 로드 시 메뉴 표시 여부 초기화 (DOM ready 후 실행)
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _ssInitMenuVisibility);
  } else {
    _ssInitMenuVisibility();
  }
  // auth.js의 _alnShowApp 호출 후에도 갱신되도록 오버라이드
  var _origShowApp = window._alnShowApp;
  window._alnShowApp = function() {
    if (_origShowApp) _origShowApp();
    _ssInitMenuVisibility();
  };
})();

/**
 * 시스템 설정 메뉴 클릭 → 항상 비밀번호 재인증
 */
function ssGuardSystemSettings(menuEl) {
  _ssPendingMenuEl = menuEl;
  const username = sessionStorage.getItem('admin_username') || 'admin';
  const displayEl = document.getElementById('ss-reauth-username');
  if (displayEl) displayEl.textContent = username;
  const pwEl = document.getElementById('ss-reauth-password');
  const errEl = document.getElementById('ss-reauth-error');
  const eyeIcon = document.getElementById('ss-reauth-eye-icon');
  if (pwEl) { pwEl.value = ''; pwEl.type = 'password'; }
  if (errEl) errEl.style.display = 'none';
  if (eyeIcon) eyeIcon.className = 'fas fa-eye';
  const modal = document.getElementById('ss-reauth-modal');
  if (modal) { modal.classList.add('open'); setTimeout(() => pwEl?.focus(), 150); }
}

function closeSSReauth() {
  const modal = document.getElementById('ss-reauth-modal');
  if (modal) modal.classList.remove('open');
  _ssPendingMenuEl = null;
}

function ssToggleReauthEye() {
  const pwEl = document.getElementById('ss-reauth-password');
  const icon = document.getElementById('ss-reauth-eye-icon');
  if (!pwEl || !icon) return;
  if (pwEl.type === 'password') { pwEl.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { pwEl.type = 'password'; icon.className = 'fas fa-eye'; }
}

async function ssConfirmReauth() {
  const username = sessionStorage.getItem('admin_username') || 'admin';
  const password = document.getElementById('ss-reauth-password')?.value || '';
  const btn = document.getElementById('ss-reauth-btn');
  const errEl = document.getElementById('ss-reauth-error');
  const errText = document.getElementById('ss-reauth-error-text');

  if (!password) {
    if (errEl) { errEl.style.display = 'block'; if (errText) errText.textContent = '비밀번호를 입력하세요.'; }
    return;
  }
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 확인 중...'; }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      if (errEl) { errEl.style.display = 'block'; if (errText) errText.textContent = '비밀번호가 올바르지 않습니다.'; }
      const pwEl = document.getElementById('ss-reauth-password');
      if (pwEl) { pwEl.value = ''; pwEl.focus(); }
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 확인'; }
      return;
    }
    // 인증 성공 → 바로 시스템 설정 페이지로 진입 (세션 플래그 저장 안 함: 매번 재인증)
    const menuEl = _ssPendingMenuEl;
    closeSSReauth();
    if (menuEl) showPage('system-settings', menuEl);
  } catch (e) {
    console.error('[재인증 오류]', e);
    if (errEl) { errEl.style.display = 'block'; if (errText) errText.textContent = '서버 연결에 실패했습니다.'; }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 확인'; }
  }
}
