// ══ STATE ══
let currentCompany = null;
let allEmployees = [], allPayrolls = [], allContracts = [], allBillings = [];
let _clientSevTab = 'history'; // severance tab state
let statsYear    = new Date().getFullYear();
let statsMonth   = new Date().getMonth() + 1;
let psEmpId = null;  // 명세서 모달용 (유지)
let psCatFilter = 'all'; // 하위호환 유지
let psGroup    = 'all'; // 1단계: all | cat | dept | rank
let psSubVal   = '__all__'; // 2단계 세부 선택값 ('__all__' = 해당 그룹 전체)
let psYear   = new Date().getFullYear(), psMonth   = new Date().getMonth() + 1;
let billingYear  = new Date().getFullYear(), billingMonth  = new Date().getMonth() + 1;
let distTab = 'emp';

let distChart = null, distDonutChart = null, trendChart = null;

const TREND_ITEMS = [
  {key:'gross',  label:'총 지급액',    color:'#3b82f6', borderColor:'#3b82f6', bgColor:'#eff6ff', textColor:'#1d4ed8', def:true},
  {key:'ded',    label:'공제 총액',    color:'#ef4444', borderColor:'#ef4444', bgColor:'#fef2f2', textColor:'#b91c1c', def:true},
  {key:'net',    label:'실지급액',     color:'#10b981', borderColor:'#10b981', bgColor:'#f0fdf4', textColor:'#065f46', def:true},
  {key:'extra',  label:'추가근로수당', color:'#f59e0b', borderColor:'#f59e0b', bgColor:'#fffbeb', textColor:'#92400e', def:false},
  {key:'irreg',  label:'부정기지급',   color:'#8b5cf6', borderColor:'#8b5cf6', bgColor:'#f5f3ff', textColor:'#5b21b6', def:false},
  {key:'tax',    label:'세금',         color:'#ec4899', borderColor:'#ec4899', bgColor:'#fdf2f8', textColor:'#9d174d', def:false},
  {key:'ins',    label:'4대보험',      color:'#06b6d4', borderColor:'#06b6d4', bgColor:'#ecfeff', textColor:'#155e75', def:false},
  {key:'adj',    label:'정산/추가공제',color:'#6b7280', borderColor:'#6b7280', bgColor:'#f9fafb', textColor:'#374151', def:false},
];
const trendOn = {};
TREND_ITEMS.forEach(t => trendOn[t.key] = t.def);

// ══ LOGIN ══
const LS_CODE_KEY = 'gs_saved_access_code';

// 페이지 로드 시 저장된 코드 자동 복원
(function(){
  const saved = localStorage.getItem(LS_CODE_KEY);
  if(saved){
    document.getElementById('login-code').value = saved;
    document.getElementById('login-remember').checked = true;
  }
})();

async function tryLogin(){
  const code = document.getElementById('login-code').value.trim();
  if(!code){ showErr('코드를 입력하세요.'); return; }
  const res = await fetch('../tables/companies?limit=100');
  const data = await res.json();
  const found = (data.data||[]).find(c => c.access_code === code);
  if(!found){ showErr('코드가 올바르지 않습니다. 담당 노무사에게 문의하세요.'); return; }
  // 자동 입력 체크 여부에 따라 코드 저장/삭제
  if(document.getElementById('login-remember').checked){
    localStorage.setItem(LS_CODE_KEY, code);
  } else {
    localStorage.removeItem(LS_CODE_KEY);
  }
  currentCompany = found;
  // loadData + 알림 동시 로드
  await Promise.all([ loadData(), loadClientNotices() ]);
  startApp();
}
function showErr(msg){ const e=document.getElementById('login-error'); e.textContent=msg; setTimeout(()=>e.textContent='',3000); }

// ── 햄버거 메뉴 ──
function toggleHamburgerMenu(){
  const panel   = document.getElementById('hmenu-panel');
  const backdrop = document.getElementById('hmenu-backdrop');
  const isOpen  = panel.classList.contains('open');
  if(isOpen){ closeHamburgerMenu(); }
  else {
    panel.classList.add('open');
    backdrop.classList.add('open');
  }
}
function closeHamburgerMenu(){
  document.getElementById('hmenu-panel').classList.remove('open');
  document.getElementById('hmenu-backdrop').classList.remove('open');
}

function logout(){
  currentCompany=null; allEmployees=[]; allPayrolls=[]; allContracts=[]; allBillings=[];
  psEmpId=null; psCatFilter='all'; psGroup='all'; psSubVal='__all__'; [distChart,distDonutChart,trendChart].forEach(c=>{if(c)c.destroy()}); distChart=distDonutChart=trendChart=null;
  // 알림 상태 초기화
  _clientNotices=[]; _notifDetailId=null;
  closeNotifModal(); closeNotifDetail();
  const badge=document.getElementById('notif-badge'); if(badge) badge.style.cssText='';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-code').value='';
  showPage('stats', document.getElementById('nav-stats'));
}

// ══ DATA ══
async function loadData(){
  const [er,pr,cr,br] = await Promise.all([
    fetch('../tables/employees?limit=300'),
    fetch('../tables/payrolls?limit=1000'),
    fetch('../tables/contracts?limit=300'),
    fetch('../tables/billings?limit=200'),
  ]);
  const [ed,pd,cd,bd] = await Promise.all([er.json(),pr.json(),cr.json(),br.json()]);
  allEmployees = (ed.data||[]).filter(e => e.company_id === currentCompany.id);
  allPayrolls  = (pd.data||[]).filter(p => p.company_id === currentCompany.id);
  allContracts = (cd.data||[]).filter(c => c.company_id === currentCompany.id);
  allBillings  = (bd.data||[]).filter(b => b.company_id === currentCompany.id);
}

// ══ APP START ══
function startApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').classList.add('visible');
  const subTxt = (currentCompany.industry||'') + ' · 급여일: ' + (currentCompany.pay_day||'-');
  document.getElementById('app-company-name').textContent = currentCompany.company_name;
  document.getElementById('app-company-sub').textContent  = subTxt;
  // 햄버거 메뉴 회사 정보
  document.getElementById('hmenu-company-name').textContent = currentCompany.company_name;
  document.getElementById('hmenu-company-sub').textContent  = subTxt;
  // 초기 탭(급여현황)에 맞게 헤더 월 네비 설정
  _configHeaderMonth('stats');
  renderStats();
  renderBilling();
  renderMyco();
  // 로그인 시 loadClientNotices가 이미 완료되어 _clientNotices가 스토어됨 — 로드된 데이터로 즉시 업데이트
  _updateNotifBadge();

  // 중요공지(general) 중 미읽음 + 실제 발송 완료(gn_status === 'sent') 건만 강제 모달 표시
  // scheduled(예약 대기) 는 아직 발송 전이므로 제외
  // is_read: DB에서 boolean false / null / undefined / 문자열 "false" 모두 미읽음으로 처리
  const unreadGenerals = _clientNotices.filter(
    n => n.notice_type === 'general'
      && !_isReadVal(n.is_read)
      && (n.gn_status === 'sent' || !n.gn_status)  // sent 이거나 필드 없는 구형 데이터
  );
  if(unreadGenerals.length > 0){
    // 살짝 딜레이 후 표시 (앱 화면 전환 애니메이션 완료 후)
    setTimeout(() => showGnAlerts(unreadGenerals), 350);
  }
}

// ══ PAGE NAVIGATION ══

// 헤더 월 네비 표시/숨김 + 탭별 년월·버튼 콜백 설정
function _configHeaderMonth(tab){
  const row    = document.getElementById('header-month-row');
  const label  = document.getElementById('hm-month-label');
  const sub    = document.getElementById('hm-sub-label');
  const prev   = document.getElementById('hm-prev-btn');
  const next   = document.getElementById('hm-next-btn');
  if(!row) return;

  const TAB_META = {
    stats:   { sub:'급여현황',  getY:()=>statsYear,   getM:()=>statsMonth,
      fn: d => { statsMonth+=d; if(statsMonth>12){statsMonth=1;statsYear++;}if(statsMonth<1){statsMonth=12;statsYear--;} label.textContent=`${statsYear}년 ${statsMonth}월`; renderStats(); } },

    payslip: { sub:'급여명세서', getY:()=>psYear,      getM:()=>psMonth,
      fn: d => { psMonth+=d; if(psMonth>12){psMonth=1;psYear++;}if(psMonth<1){psMonth=12;psYear--;} label.textContent=`${psYear}년 ${psMonth}월`; renderPayslipList(); } },
    billing: { sub:'사용료',    getY:()=>billingYear, getM:()=>billingMonth,
      fn: d => { billingMonth+=d; if(billingMonth>12){billingMonth=1;billingYear++;}if(billingMonth<1){billingMonth=12;billingYear--;} label.textContent=`${billingYear}년 ${billingMonth}월`; renderBilling(); } },
  };

  const meta = TAB_META[tab];
  if(!meta){ row.classList.add('hidden'); return; }

  row.classList.remove('hidden');
  label.textContent = `${meta.getY()}년 ${meta.getM()}월`;
  sub.textContent   = meta.sub;

  // 버튼 콜백 – 기존 리스너 제거 후 재등록
  const newPrev = prev.cloneNode(true);
  const newNext = next.cloneNode(true);
  prev.parentNode.replaceChild(newPrev, prev);
  next.parentNode.replaceChild(newNext, next);
  newPrev.addEventListener('click', () => meta.fn(-1));
  newNext.addEventListener('click', () => meta.fn(1));

  // 년월 레이블 클릭 → 피커 열기
  const wrap = document.getElementById('hm-label-wrap');
  if(wrap){
    const newWrap = wrap.cloneNode(true);
    wrap.parentNode.replaceChild(newWrap, wrap);
    newWrap.addEventListener('click', () => openYmPicker(tab));
  }
}

// ══ 년월 피커 ══
let _ymCurrentTab  = 'stats';  // 피커를 연 탭 이름
let _ymPickerYear  = new Date().getFullYear(); // 피커 내 탐색 년도

function openYmPicker(tab){
  _ymCurrentTab = tab;
  // 현재 탭 상태 년도를 초기값으로
  if(tab==='stats') _ymPickerYear = statsYear;
  if(tab==='payslip') _ymPickerYear = psYear;
  if(tab==='billing') _ymPickerYear = billingYear;
  _renderYmGrid();
  document.getElementById('ym-picker').classList.add('open');
}

function closeYmPicker(){
  document.getElementById('ym-picker').classList.remove('open');
}

function _renderYmGrid(){
  const now = new Date();
  const todayY = now.getFullYear(), todayM = now.getMonth()+1;
  // 탭별 현재 선택된 년/월
  const curY = _ymCurrentTab==='stats' ? statsYear : _ymCurrentTab==='payslip' ? psYear : billingYear;
  const curM = _ymCurrentTab==='stats' ? statsMonth: _ymCurrentTab==='payslip' ? psMonth: billingMonth;

  document.getElementById('ym-year-val').textContent = _ymPickerYear + '년';

  // 년도 버튼 콜백 재등록 (중복 방지 cloneNode)
  ['ym-prev-year','ym-next-year'].forEach((id, isNext) => {
    const el = document.getElementById(id);
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', () => { _ymPickerYear += (isNext ? 1 : -1); _renderYmGrid(); });
  });

  // 월 12칸 그리드
  document.getElementById('ym-month-grid').innerHTML = Array.from({length:12}, (_,i) => {
    const m = i+1;
    const isCurrent = (_ymPickerYear===curY && m===curM);
    const isToday   = (_ymPickerYear===todayY && m===todayM && !isCurrent);
    const cls = ['ym-month-btn', isCurrent?'current':'', isToday?'today':''].filter(Boolean).join(' ');
    return `<button class="${cls}" onclick="selectYmMonth(${m})">${m}월</button>`;
  }).join('');
}

function selectYmMonth(month){
  const label = document.getElementById('hm-month-label');
  if(_ymCurrentTab==='stats')  { statsYear=_ymPickerYear;   statsMonth=month;   if(label) label.textContent=`${statsYear}년 ${statsMonth}월`;   renderStats(); }
  
  if(_ymCurrentTab==='payslip'){ psYear=_ymPickerYear;      psMonth=month;      if(label) label.textContent=`${psYear}년 ${psMonth}월`;         renderPayslipList(); }
  if(_ymCurrentTab==='billing'){ billingYear=_ymPickerYear; billingMonth=month; if(label) label.textContent=`${billingYear}년 ${billingMonth}월`; renderBilling(); }
  closeYmPicker();
}

function showPage(name, el){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el) el.classList.add('active');

  // 헤더 월 네비 표시 탭 목록 (ct는 월 선택 불필요)
  if(['stats','payslip','billing'].includes(name)){
    _configHeaderMonth(name);
    if(name === 'billing') renderBilling();
    if(name === 'payslip') { renderPayslipList(); _adjustPsStickyTop(); }
  } else {
    const row = document.getElementById('header-month-row');
    if(row) row.classList.add('hidden');
  }
  if(name === 'ct') renderCtContracts();
  if(name === 'myco') renderMyco();
  if(name === 'severance') renderClientSeverance();
  if(name === 'annual-leave') renderClientAnnualLeave();
}

// ── 명세서 sticky 필터 top 위치 동적 조정 ──