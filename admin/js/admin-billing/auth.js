// ==========================================
//   관리자 로그인 / 계정 관리
// ==========================================

/* ── 세션 초기화: 이미 인증된 경우 바로 앱 진입 ── */
(function(){
  if(sessionStorage.getItem('admin_auth') === 'ok'){
    _alnShowApp();
    _alnUpdateTopbar();
    init();
  }
})();

/* ── 로그인 화면 ↔ 앱 전환 헬퍼 ── */
function _alnShowApp(){
  const screen  = document.getElementById('admin-login-screen');
  const sidebar = document.querySelector('.sidebar');
  const main    = document.querySelector('.main');
  if(screen)  screen.style.display = 'none';
  if(sidebar) sidebar.style.display = '';
  if(main)    main.style.display    = '';
}

/* ── 비밀번호 눈 토글 (로그인 화면) ── */
function alnToggleEye(){
  const pw   = document.getElementById('aln-pw');
  const icon = document.getElementById('aln-eye-icon');
  if(pw.type === 'password'){ pw.type = 'text';     icon.className = 'fas fa-eye-slash'; }
  else                      { pw.type = 'password'; icon.className = 'fas fa-eye';       }
}

/* ── 로그인 에러 표시 / 초기화 ── */
function _alnSetError(msg, shakeEl){
  const err = document.getElementById('aln-error-msg');
  document.getElementById('aln-error-text').textContent = msg;
  err.classList.add('va-err');
  const target = shakeEl || document.getElementById('aln-pw');
  target.classList.add('error');
  setTimeout(()=>target.classList.remove('error'), 400);
}
function _alnClearError(){
  const err = document.getElementById('aln-error-msg');
  if(err) err.classList.remove('va-err');
  ['aln-id','aln-pw'].forEach(id=>document.getElementById(id)?.classList.remove('error'));
}
document.addEventListener('DOMContentLoaded', function(){
  ['aln-id','aln-pw'].forEach(id=>{
    document.getElementById(id)?.addEventListener('input', _alnClearError);
  });
});

/* ── 로그인: 서버 /api/auth/login 호출 (bcrypt 해시 검증) ── */
async function adminLogin(){
  const idEl  = document.getElementById('aln-id');
  const pwEl  = document.getElementById('aln-pw');
  const idVal = idEl.value.trim();
  const pwVal = pwEl.value;
  const btn   = document.getElementById('aln-submit-btn');

  if(!idVal){ _alnSetError('아이디를 입력하세요.', idEl); idEl.focus(); return; }
  if(!pwVal){ _alnSetError('비밀번호를 입력하세요.', pwEl); pwEl.focus(); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp; 확인 중...';

  try{
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: idVal, password: pwVal })
    });

    if(!res.ok){
      _alnSetError('아이디 또는 비밀번호가 올바르지 않습니다.', pwEl);
      pwEl.value = '';
      pwEl.focus();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>&nbsp; 로그인';
      return;
    }

    const data = await res.json();

    // 인증 성공 — 계정 정보 세션에 저장
    sessionStorage.setItem('admin_auth', 'ok');
    sessionStorage.setItem('admin_username', idVal);
    sessionStorage.setItem('admin_display_name', data.display_name || idVal);

    setTimeout(()=>{
      _alnShowApp();
      _alnUpdateTopbar();
      init();
    }, 350);

  } catch(e){
    console.error('[로그인 오류]', e);
    _alnSetError('서버 연결에 실패했습니다. 잠시 후 다시 시도하세요.', pwEl);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>&nbsp; 로그인';
  }
}

/* ── topbar 접속자 이름 표시 갱신 ── */
function _alnUpdateTopbar(){
  const name = sessionStorage.getItem('admin_display_name') || '마스터관리자';
  const span = document.getElementById('topbar-admin-name');
  if(span){
    span.textContent = name + ' 님 접속 중';
    span.dataset.name = name;   // 발송자 추출용 순수 이름 보관
  }
}

/* ── 로그아웃 ── */
function adminLogout(){
  if(!confirm('로그아웃 하시겠습니까?')) return;
  sessionStorage.removeItem('admin_auth');
  sessionStorage.removeItem('admin_username');
  sessionStorage.removeItem('admin_display_name');
  const screen  = document.getElementById('admin-login-screen');
  const sidebar = document.querySelector('.sidebar');
  const main    = document.querySelector('.main');
  if(screen){
    screen.style.display = '';
    const btn = document.getElementById('aln-submit-btn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>&nbsp; 로그인';
    document.getElementById('aln-id').value = '';
    document.getElementById('aln-pw').value = '';
    _alnClearError();
    setTimeout(()=>document.getElementById('aln-id').focus(), 100);
  }
  if(sidebar) sidebar.style.display = 'none';
  if(main)    main.style.display    = 'none';
}

