// ==========================================
//   관리자 계정 관리 페이지
// ==========================================

let _aaAccounts = []; // 캐시

/* ── 목록 렌더 ── */
async function renderAdminAccounts(){
  const tbody = document.getElementById('aa-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#aaa;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</td></tr>';

  // 신규 등록 버튼: 마스터 관리자(admin)만 표시
  const isMasterSession = sessionStorage.getItem('admin_username') === 'admin';
  const addBtn = document.getElementById('aa-add-btn');
  if(addBtn) addBtn.style.display = isMasterSession ? '' : 'none';

  try{
    const res  = await fetch('../tables/admin_accounts?limit=200&sort=created_at');
    const data = await res.json();
    _aaAccounts = data.data || [];
    _aaRenderTable();
  } catch(e){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#ef4444;">불러오기 실패</td></tr>';
  }
}

function _aaRenderTable(){
  const tbody           = document.getElementById('aa-tbody');
  const current         = sessionStorage.getItem('admin_username');
  const isMasterSession = current === 'admin';
  if(!_aaAccounts.length){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#aaa;">등록된 계정이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = _aaAccounts.map((a, i)=>{
    const isMaster = a.username === 'admin';
    const isSelf   = a.username === current;
    const isLast   = _aaAccounts.length === 1;

    // ── 삭제 버튼 ──
    const delReason = isMaster ? '마스터 관리자 계정은 삭제할 수 없습니다'
                    : isSelf   ? '현재 접속 중인 계정입니다'
                    : isLast   ? '마지막 계정은 삭제할 수 없습니다' : '';
    const delBtn = delReason
      ? `<button class="btn btn-sm btn-icon" disabled title="${delReason}"
           style="background:#f3f4f6;color:#d1d5db;cursor:not-allowed;">
           <i class="fas fa-trash-alt"></i></button>`
      : `<button class="btn btn-danger btn-sm btn-icon"
           onclick="deleteAdminAccount('${a.id}','${_esc(a.username)}')"
           title="계정 삭제">
           <i class="fas fa-trash-alt"></i></button>`;

    // ── 표시 이름 변경 버튼 (마스터 세션 + 마스터 계정 행만) ──
    const nameBtn = (isMasterSession && isMaster)
      ? `<button class="btn btn-sm btn-icon" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;"
           onclick="openChangeNameModal('${a.id}','${_esc(a.display_name||a.username)}')"
           title="표시 이름 변경">
           <i class="fas fa-pen"></i></button>`
      : '';

    // ── 비밀번호 변경 버튼 (마스터 세션) ──
    const pwBtn = isMasterSession
      ? `<button class="btn btn-warning btn-sm btn-icon"
           onclick="openChangePwModal('${a.id}','${_esc(a.username)}','${_esc(a.display_name||a.username)}')"
           title="${isSelf ? '본인 비밀번호 변경' : '비밀번호 변경'}">
           <i class="fas fa-key"></i></button>`
      : '';

    // ── 배지 ──
    const masterBadge = isMaster
      ? '<span class="badge badge-red" style="margin-left:6px;font-size:10px;"><i class="fas fa-crown" style="margin-right:2px;"></i>마스터</span>' : '';
    const selfBadge = isSelf
      ? '<span class="badge badge-blue" style="margin-left:6px;font-size:10px;">접속 중</span>' : '';

    // ── 등록일 ──
    const dt    = a.created_at ? new Date(Number(a.created_at)) : null;
    const dtStr = dt ? dt.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})
                     : (a.created_at_label || '-');

    return `<tr>
      <td style="color:#aaa;font-size:12px;">${i+1}</td>
      <td style="font-weight:700;color:#1a1a2e;">${_esc(a.username)}${masterBadge}${selfBadge}</td>
      <td style="color:#374151;">${_esc(a.display_name||'-')}</td>
      <td style="color:#6b7280;font-size:12px;">${dtStr}</td>
      <td style="text-align:center;">
        <div style="display:inline-flex;gap:5px;align-items:center;">
          ${nameBtn}
          ${pwBtn}
          ${delBtn}
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── XSS 방지 이스케이프 ── */
function _esc(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── 신규 계정 등록 모달 열기 (마스터만 허용) ── */
function openAdminAccountModal(){
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 신규 계정을 등록할 수 있습니다.', 'error');
    return;
  }
  ['aa-input-id','aa-input-name','aa-input-pw','aa-input-pw2'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.value=''; el.style.borderColor=''; }
  });
  ['aa-err-id','aa-err-name','aa-err-pw','aa-err-pw2'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display='none';
  });
  // eye 초기화
  ['aa-input-pw','aa-input-pw2'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.type = 'password';
  });
  document.getElementById('aa-eye1').className = 'fas fa-eye';
  document.getElementById('aa-eye2').className = 'fas fa-eye';
  openModal('admin-account-modal');
  setTimeout(()=>document.getElementById('aa-input-id').focus(), 150);
}

/* ── 모달 내 눈 토글 ── */
function aaTogglePw(inputId, iconId){
  const el   = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if(el.type==='password'){ el.type='text';     icon.className='fas fa-eye-slash'; }
  else                    { el.type='password'; icon.className='fas fa-eye';       }
}

/* ── 인라인 에러 표시 헬퍼 ── */
function _aaFieldErr(inputId, errId, msg){
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errId);
  if(inp) inp.style.borderColor = '#ef4444';
  if(err){ err.textContent = msg; err.style.display = 'block'; }
  if(inp) inp.focus();
}
function _aaFieldOk(inputId, errId){
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errId);
  if(inp) inp.style.borderColor = '';
  if(err) err.style.display = 'none';
}

/* ── 신규 계정 저장 ── */
async function saveAdminAccount(){
  const idVal   = document.getElementById('aa-input-id').value.trim();
  const nameVal = document.getElementById('aa-input-name').value.trim();
  const pwVal   = document.getElementById('aa-input-pw').value;
  const pw2Val  = document.getElementById('aa-input-pw2').value;

  // 초기화
  ['aa-input-id','aa-input-name','aa-input-pw','aa-input-pw2'].forEach(id=>_aaFieldOk(id, id.replace('input','err')));

  // 유효성 검사
  if(!idVal){        _aaFieldErr('aa-input-id',  'aa-err-id',  '아이디를 입력하세요.'); return; }
  if(!/^[a-zA-Z0-9_]{4,20}$/.test(idVal)){
    _aaFieldErr('aa-input-id','aa-err-id','영문·숫자·밑줄(_) 4~20자로 입력하세요.'); return;
  }
  if(!nameVal){      _aaFieldErr('aa-input-name','aa-err-name','표시 이름을 입력하세요.'); return; }
  if(!pwVal){        _aaFieldErr('aa-input-pw',  'aa-err-pw',  '비밀번호를 입력하세요.'); return; }
  if(pwVal.length < 8){ _aaFieldErr('aa-input-pw','aa-err-pw','비밀번호는 8자 이상이어야 합니다.'); return; }
  if(pwVal !== pw2Val){ _aaFieldErr('aa-input-pw2','aa-err-pw2','비밀번호가 일치하지 않습니다.'); return; }

  // 중복 아이디 검사
  const dup = _aaAccounts.find(a => a.username === idVal);
  if(dup){ _aaFieldErr('aa-input-id','aa-err-id','이미 사용 중인 아이디입니다.'); return; }

  // 저장
  const saveBtn = document.querySelector('#admin-account-modal .btn-primary');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
  try{
    const now = new Date();
    const label = now.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'});
    await fetch('../tables/admin_accounts', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username: idVal, password: pwVal, display_name: nameVal, created_at_label: label })
    });
    closeModal('admin-account-modal');
    toast('계정이 등록되었습니다.', 'success');
    await renderAdminAccounts();
  } catch(e){
    toast('저장에 실패했습니다.', 'error');
  } finally{
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-check"></i> 등록';
  }
}

/* ── 계정 삭제 ── */
async function deleteAdminAccount(id, username){
  if(username === 'admin'){
    toast('마스터 관리자 계정은 삭제할 수 없습니다.', 'error'); return;
  }
  if(_aaAccounts.length <= 1){
    toast('마지막 계정은 삭제할 수 없습니다.', 'error'); return;
  }
  if(!confirm(`'${username}' 계정을 삭제하시겠습니까?\n삭제 후 해당 계정으로 로그인할 수 없습니다.`)) return;
  try{
    await fetch('../tables/admin_accounts/' + id, { method: 'DELETE' });
    toast('계정이 삭제되었습니다.', 'success');
    await renderAdminAccounts();
  } catch(e){
    toast('삭제에 실패했습니다.', 'error');
  }
}

/* ── 표시 이름 변경 모달 열기 (마스터 전용) ── */
let _cnmTargetId = null;

function openChangeNameModal(id, currentName){
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 표시 이름을 변경할 수 있습니다.', 'error'); return;
  }
  _cnmTargetId = id;

  const inp = document.getElementById('aa-name-input');
  const err = document.getElementById('aa-name-err');
  if(inp){ inp.value = currentName || ''; inp.style.borderColor = ''; }
  if(err) err.style.display = 'none';

  const btn = document.getElementById('aa-name-submit-btn');
  if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 변경'; }

  openModal('aa-name-change-modal');
  setTimeout(()=>{ const el = document.getElementById('aa-name-input'); if(el){ el.focus(); el.select(); } }, 150);
}

/* ── 표시 이름 변경 저장 ── */
async function submitChangeName(){
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 표시 이름을 변경할 수 있습니다.', 'error'); return;
  }
  if(!_cnmTargetId){ toast('대상 계정 정보가 없습니다.', 'error'); return; }

  const inp = document.getElementById('aa-name-input');
  const err = document.getElementById('aa-name-err');
  const val = (inp?.value || '').trim();

  // 유효성 검사
  if(inp) inp.style.borderColor = '';
  if(err) err.style.display = 'none';
  if(!val){
    if(inp) inp.style.borderColor = '#ef4444';
    if(err){ err.textContent = '표시 이름을 입력하세요.'; err.style.display = 'block'; }
    if(inp) inp.focus();
    return;
  }
  if(val.length > 20){
    if(inp) inp.style.borderColor = '#ef4444';
    if(err){ err.textContent = '20자 이하로 입력하세요.'; err.style.display = 'block'; }
    if(inp) inp.focus();
    return;
  }

  const btn = document.getElementById('aa-name-submit-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try{
    await fetch('../tables/admin_accounts/' + _cnmTargetId, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ display_name: val })
    });

    // ① 로컬 캐시 동기화 (allAdminAccounts)
    const cached = allAdminAccounts.find(a => a.id === _cnmTargetId);
    if(cached) cached.display_name = val;

    // ② sessionStorage 동기화 (마스터 본인 계정이므로 항상 해당)
    sessionStorage.setItem('admin_display_name', val);

    // ③ topbar 텍스트 + data-name 갱신
    _alnUpdateTopbar();

    closeModal('aa-name-change-modal');
    toast('표시 이름이 변경되었습니다.', 'success');
    _cnmTargetId = null;
    await renderAdminAccounts();   // 테이블 즉시 갱신
  } catch(e){
    toast('저장에 실패했습니다.', 'error');
    if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 변경'; }
  }
}

/* ── 비밀번호 변경 모달 열기 ── */
let _cpwTargetId = null;

function openChangePwModal(id, username, displayName){
  // 마스터 세션 이중 검사
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 비밀번호를 변경할 수 있습니다.', 'error'); return;
  }
  _cpwTargetId = id;

  // 대상 계정 정보 표시
  const info = document.getElementById('aa-cpw-target-info');
  info.innerHTML = `<i class="fas fa-user-circle" style="color:#6366f1;margin-right:7px;"></i>`
    + `<strong>${_esc(displayName)}</strong>`
    + `<span style="color:#9ca3af;margin-left:6px;font-size:12px;">(${_esc(username)})</span>`
    + ` 계정의 비밀번호를 변경합니다.`;

  // username hidden 동기화 (브라우저 autocomplete 경고 방지)
  document.getElementById('aa-cpw-username-hidden').value = username;

  // 필드·에러 초기화
  ['aa-cpw-new','aa-cpw-new2'].forEach(id=>{
    const el = document.getElementById(id);
    el.value = ''; el.type = 'password'; el.style.borderColor = '';
  });
  document.getElementById('aa-cpw-eye1').className = 'fas fa-eye';
  document.getElementById('aa-cpw-eye2').className = 'fas fa-eye';
  ['aa-cpw-err-new','aa-cpw-err-new2'].forEach(id=>{
    document.getElementById(id).style.display = 'none';
  });

  const btn = document.getElementById('aa-cpw-submit-btn');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> 변경';

  openModal('aa-pw-change-modal');
  setTimeout(()=> document.getElementById('aa-cpw-new').focus(), 150);
}

/* ── 비밀번호 변경 인라인 에러 헬퍼 ── */
function _cpwFieldErr(inputId, errId, msg){
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errId);
  inp.style.borderColor = '#ef4444';
  err.textContent = msg; err.style.display = 'block';
  inp.focus();
}
function _cpwFieldOk(inputId, errId){
  document.getElementById(inputId).style.borderColor = '';
  document.getElementById(errId).style.display = 'none';
}

/* ── 비밀번호 변경 저장 ── */
async function submitChangePw(){
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 비밀번호를 변경할 수 있습니다.', 'error'); return;
  }
  if(!_cpwTargetId){ toast('대상 계정 정보가 없습니다.', 'error'); return; }

  const newPw  = document.getElementById('aa-cpw-new').value;
  const newPw2 = document.getElementById('aa-cpw-new2').value;

  // 초기화
  _cpwFieldOk('aa-cpw-new',  'aa-cpw-err-new');
  _cpwFieldOk('aa-cpw-new2', 'aa-cpw-err-new2');

  // 유효성 검사
  if(!newPw){              _cpwFieldErr('aa-cpw-new',  'aa-cpw-err-new',  '새 비밀번호를 입력하세요.'); return; }
  if(newPw.length < 8){   _cpwFieldErr('aa-cpw-new',  'aa-cpw-err-new',  '비밀번호는 8자 이상이어야 합니다.'); return; }
  if(!newPw2){             _cpwFieldErr('aa-cpw-new2', 'aa-cpw-err-new2', '비밀번호 확인을 입력하세요.'); return; }
  if(newPw !== newPw2){    _cpwFieldErr('aa-cpw-new2', 'aa-cpw-err-new2', '비밀번호가 일치하지 않습니다.'); return; }

  const btn = document.getElementById('aa-cpw-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

  try{
    await fetch('../tables/admin_accounts/' + _cpwTargetId, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ password: newPw })
    });
    closeModal('aa-pw-change-modal');
    toast('비밀번호가 변경되었습니다.', 'success');
    _cpwTargetId = null;
  } catch(e){
    toast('저장에 실패했습니다.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> 변경';
  }
}

// ======================================================================
