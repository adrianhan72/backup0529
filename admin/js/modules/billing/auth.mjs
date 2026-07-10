/**
 * billing/auth.mjs — Phase 6: 완전 변환
 * Node.js 자동변환 (convert-core.cjs)
 */
import { getCompanies, getEmployees, getPayrolls, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS, COMPANY_STATUS, EMP_STATUS, CONTRACT_TYPE_LEGACY_MAP, DISPATCH_METHOD, DISPATCH_STATUS } from '../constants.mjs';

const _w = (name) => window[name];
window._w = _w;

// ==========================================
//   관리자 로그인 / 계정 관리
// ==========================================

/* ── 세션 초기화: 이미 인증된 경우 바로 앱 진입 ── */
(function(){
  if(sessionStorage.getItem('admin_auth') === 'ok'){
    _alnShowApp();
    _alnUpdateTopbar();
    window.init();
  }
})();

/* ── 로그인 화면 ↔ 앱 전환 헬퍼 ── */
export function _alnShowApp(){
  const screen  = document.getElementById('admin-login-screen');
  const sidebar = document.querySelector('.sidebar');
  const main    = document.querySelector('.main');
  if(screen)  screen.style.display = 'none';
  if(sidebar) sidebar.style.display = '';
  if(main)    main.style.display    = '';
}

/* ── 비밀번호 눈 토글 (로그인 화면) ── */
export function alnToggleEye(){
  const pw   = document.getElementById('aln-pw');
  const icon = document.getElementById('aln-eye-icon');
  if(pw.type === 'password'){ pw.type = 'text';     icon.className = 'fas fa-eye-slash'; }
  else                      { pw.type = 'password'; icon.className = 'fas fa-eye';       }
}

/* ── 로그인 에러 표시 / 초기화 ── */
export function _alnSetError(msg, shakeEl){
  const err = document.getElementById('aln-error-msg');
  document.getElementById('aln-error-text').textContent = msg;
  err.style.display = 'block';
  const target = shakeEl || document.getElementById('aln-pw');
  target.classList.add('error');
  setTimeout(()=>target.classList.remove('error'), 400);
}
export function _alnClearError(){
  document.getElementById('aln-error-msg').style.display = 'none';
  ['aln-id','aln-pw'].forEach(id=>document.getElementById(id)?.classList.remove('error'));
}
document.addEventListener('DOMContentLoaded', function(){
  ['aln-id','aln-pw'].forEach(id=>{
    document.getElementById(id)?.addEventListener('input', _alnClearError);
  });
});

/* ── 로그인: API 서버에서 bcrypt 해시 검증 ── */
export async function adminLogin(){
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
    // POST /api/auth/login → 서버에서 bcrypt 검증 + JWT 발급
    const res = await fetch('../api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: idVal, password: pwVal }),
    });
    const data = await res.json();

    if(!res.ok || !data.token){
      _alnSetError(data.error || '아이디 또는 비밀번호가 올바르지 않습니다.', pwEl);
      pwEl.value = '';
      pwEl.focus();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>&nbsp; 로그인';
      return;
    }

    // 인증 성공 — JWT 토큰 + 계정 정보 세션에 저장
    sessionStorage.setItem('admin_auth', 'ok');
    sessionStorage.setItem('admin_token', data.token);
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
export function _alnUpdateTopbar(){
  const name = sessionStorage.getItem('admin_display_name') || '마스터관리자';
  const span = document.getElementById('topbar-admin-name');
  if(span){
    span.textContent = name + ' 님 접속 중';
    span.dataset.name = name;   // 발송자 추출용 순수 이름 보관
  }
}

/* ── 로그아웃 ── */
export function adminLogout(){
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



// ══ window 등록 (레거시 호환) ══
window._alnShowApp = _alnShowApp;
window.alnToggleEye = alnToggleEye;
window._alnSetError = _alnSetError;
window._alnClearError = _alnClearError;
window.adminLogin = adminLogin;
window._alnUpdateTopbar = _alnUpdateTopbar;
window.adminLogout = adminLogout;
