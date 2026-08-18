// ══ STATE ══
let currentCompany = null;
let allEmployees = [], allPayrolls = [], allContracts = [], allBillings = [];
let _wlNotifications = []; // 임금대장 알림 (파일 경로 포함)
let _clientSevTab = 'history'; // severance tab state
let statsYear    = new Date().getFullYear();
let statsMonth   = new Date().getMonth() + 1;
let psEmpId = null;  // 명세서 모달용 (유지)
let psCatFilter = 'all'; // 하위호환 유지
let psGroup    = 'all'; // 1단계: all | cat | dept | rank
let psSubVal   = '__all__'; // 2단계 세부 선택값 ('__all__' = 해당 그룹 전체)
let psYear   = new Date().getFullYear(), psMonth   = new Date().getMonth() + 1;
let billingYear  = new Date().getFullYear(), billingMonth  = new Date().getMonth() + 1;
let _billingFeatureEnabled = false; // 사용료 수납관리 스위치 (시스템 설정)
let distTab = 'emp';

let distChart = null, distDonutChart = null, trendChart = null;
let _allClientMinWages = []; // 연도별 최저임금 (어드민 산정기준표 DB 연동)
let _allClientInsRates = []; // 4대보험 요율 (어드민 산정기준표 DB 연동)

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

// ══ 공통 상태 정규화 헬퍼 (constants.js 의존) ══
const _normEmpStatus = (status) => EMP_STATUS_LEGACY_MAP[status] || status || EMP_STATUS.ACTIVE;
const _isEmpActive = (emp) => _normEmpStatus(emp.status) === EMP_STATUS.ACTIVE;
const _isEmpResigned = (emp) => _normEmpStatus(emp.status) === EMP_STATUS.RESIGNED;
const _normContractStatus = (status) => CONTRACT_STATUS_LEGACY_MAP[status] || status;
const _isContractActive = (c) => {
  const s = _normContractStatus(c.status);
  return CONTRACT_ACTIVE_STATUSES.includes(s);
};
const _normContractType = (cat) => CONTRACT_TYPE_LEGACY_MAP[cat] || cat;
const _normPaymentStatus = (status) => PAYMENT_STATUS_LEGACY_MAP[status] || status;
const contractTypeLabel_c = (cat) => CONTRACT_TYPE_LABEL[_normContractType(cat)] || cat || '-';
const empCatBadge = (cat) => CAT_BADGE_CLS[_normContractType(cat)] || 'badge-gray';

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

  // 해지된 고객사 차단
  const today = fmtLocalDate(new Date());
  const isInactive = found.status === 'inactive';
  const isAutoTerminated = found.status === 'active' && found.contract_end_date && found.contract_end_date <= today;
  if(isInactive || isAutoTerminated){
    const endDate = found.contract_end_date;
    const msg = endDate
      ? `${endDate}부로 해지된 고객사입니다.`
      : '해지된 고객사입니다.';
    showTermModal(msg);
    return;
  }

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
function showErr(msg, permanent){ const e=document.getElementById('login-error'); e.textContent=msg; if(!permanent) setTimeout(()=>e.textContent='',3000); }

function showTermModal(msg){
  document.getElementById('term-msg').textContent = msg;
  document.getElementById('term-overlay').classList.add('open');
}
function dismissTermModal(){
  document.getElementById('term-overlay').classList.remove('open');
  // 저장된 접근 코드 초기화
  localStorage.removeItem(LS_CODE_KEY);
  document.getElementById('login-code').value = '';
  document.getElementById('login-remember').checked = false;
}

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
  const [er,pr,cr,br,wr] = await Promise.all([
    fetch('../tables/employees?limit=300'),
    fetch('../tables/payrolls?limit=1000'),
    fetch('../tables/contracts?limit=300'),
    fetch('../tables/billings?limit=200'),
    fetch('../tables/wage_ledger_notifications?limit=100'),
  ]);
  const [ed,pd,cd,bd,wd] = await Promise.all([er.json(),pr.json(),cr.json(),br.json(),wr.json()]);
  allEmployees = (ed.data||[]).filter(e => e.company_id === currentCompany.id);
  allPayrolls  = (pd.data||[]).filter(p => p.company_id === currentCompany.id);
  allContracts = (cd.data||[]).filter(c => c.company_id === currentCompany.id);
  allBillings  = (bd.data||[]).filter(b => b.company_id === currentCompany.id);
  _wlNotifications = (wd.data||[]).filter(n => n.company_id === currentCompany.id);
  // 시스템 설정 로드 (사용료 스위치)
  try {
    const sr = await fetch('../tables/system_settings?setting_key=billing_feature_enabled');
    const sd = await sr.json();
    const row = (sd.data||[]).find(r => r.setting_key === 'billing_feature_enabled');
    _billingFeatureEnabled = row ? row.setting_value === '1' : false;
  } catch(e) { _billingFeatureEnabled = false; }
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
  // 사용료 수납관리 ON → 사용료 탭/페이지 활성화
  if (_billingFeatureEnabled) {
    const navBilling = document.getElementById('nav-billing');
    const pageBilling = document.getElementById('page-billing');
    if (navBilling) navBilling.style.display = '';
    if (pageBilling) pageBilling.style.display = '';
  }
  renderBilling();
  renderMyco();
  loadClientMinWages(); // 연도별 최저임금표 (산정기준표 DB 연동)
  loadClientInsRates(); // 4대보험 요율표 (산정기준표 DB 연동)
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
  if(name === 'min-wage' && !_allClientMinWages.length) loadClientMinWages();
  if(name === 'insurance-rates' && !_allClientInsRates.length) loadClientInsRates();
}

// ══ 연도별 최저임금 (어드민 년도별 산정기준표 DB 연동) ══
async function loadClientMinWages(){
  try{
    const res = await fetch('../tables/minimum_wages?limit=100');
    const jd  = await res.json();
    _allClientMinWages = (jd.data||[]).slice().sort((a,b)=> Number(b.year) - Number(a.year));
  }catch(e){ console.error('[최저임금] 로드 실패', e); }
  renderClientMinWages();
}
function renderClientMinWages(){
  const list  = _allClientMinWages;
  const tbody = document.getElementById('min-wage-tbody');
  if(!list.length){
    if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="padding:16px;text-align:center;color:#9ca3af;">산정기준표 데이터가 없습니다</td></tr>';
    return;
  }
  const fmt = n => Number(n||0).toLocaleString('ko-KR');
  const _set = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  const _rateHtml = (cur, prev) => {
    if(!prev || Number(prev.hourly_wage||0) <= 0) return '<span style="color:#9ca3af;">-</span>';
    const r = (Number(cur.hourly_wage) - Number(prev.hourly_wage)) / Number(prev.hourly_wage) * 100;
    const color = r > 0 ? '#16a34a' : (r < 0 ? '#dc2626' : '#6b7280');
    return `<span style="color:${color};font-weight:600;">${r>=0?'+':''}${r.toFixed(1)}%${r>0?' ↑':(r<0?' ↓':'')}</span>`;
  };
  // ── 최신 연도 강조 카드 ──
  const latest = list[0], prev = list[1];
  _set('mw-hero-year',   latest.year);
  _set('mw-hero-hourly', fmt(latest.hourly_wage));
  _set('mw-hero-daily',  fmt((Number(latest.hourly_wage)||0) * 8) + '원');
  _set('mw-hero-monthly',fmt(latest.monthly_wage) + '원');
  const heroRateEl = document.getElementById('mw-hero-rate');
  if(heroRateEl) heroRateEl.innerHTML = _rateHtml(latest, prev);
  // ── 연도별 표 ──
  if(tbody){
    tbody.innerHTML = list.map((w, i) => {
      const p = list[i+1];
      const hlBg = i === 0 ? 'background:#f5f3ff;' : (i % 2 === 0 ? 'background:#faf5ff;' : '');
      const hlTx = i === 0 ? 'font-weight:800;color:#7c3aed;' : '';
      return `<tr style="${hlBg}">
        <td style="padding:9px 12px;text-align:center;${hlTx}">${w.year}</td>
        <td style="padding:9px 12px;text-align:right;${i===0?'font-weight:700;':''}">${fmt(w.hourly_wage)}원</td>
        <td style="padding:9px 12px;text-align:right;">${fmt(w.monthly_wage)}원</td>
        <td style="padding:9px 12px;text-align:right;">${_rateHtml(w, p)}</td>
      </tr>`;
    }).join('');
  }
}

// ══ 4대보험 요율표 (어드민 년도별 산정기준표 DB 연동) ══
async function loadClientInsRates(){
  try{
    const res = await fetch('../tables/insurance_rates?limit=200');
    const jd  = await res.json();
    _allClientInsRates = (jd.data||[]).slice();
  }catch(e){ console.error('[보험요율] 로드 실패', e); }
  renderClientInsRates();
}
// 오늘 적용 중인 요율 행 우선, 없으면 기간 있는 최신 연도 폴백
function _pickInsRate(type){
  const rows = _allClientInsRates.filter(r => r.insurance_type === type);
  if(!rows.length) return null;
  const today = fmtLocalDate(new Date());
  const cur = rows.find(r => r.period_start && r.period_end && r.period_start <= today && today <= r.period_end);
  if(cur) return cur;
  const dated = rows.filter(r => r.period_start);
  return dated.sort((a,b) => (Number(b.year)||0) - (Number(a.year)||0))[0] || rows[0];
}
function renderClientInsRates(){
  const cardsEl = document.getElementById('ir-cards');
  const sumEl   = document.getElementById('ir-summary');
  if(!cardsEl && !sumEl) return;

  const _fmtRate = n => String(parseFloat(Number(n||0).toFixed(4)));
  const _fmtPeriod = r => {
    if(r.period_start && r.period_end) return `${String(r.period_start).replace(/-/g,'.')} ~ ${String(r.period_end).replace(/-/g,'.')} 적용`;
    if(r.year) return `${r.year}년 적용`;
    return '';
  };
  const _card = (icon, grad, title, en, bodyHtml) => `
    <div style="background:#fff;border-radius:14px;box-shadow:0 1px 8px rgba(0,0,0,.07);padding:16px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:36px;height:36px;background:${grad};border-radius:10px;display:flex;align-items:center;justify-content:center;"><i class="fas ${icon}" style="color:#fff;font-size:16px;"></i></div>
        <div><div style="font-size:14px;font-weight:800;color:#1a1a2e;">${title}</div><div style="font-size:11px;color:#6b7280;">${en}</div></div>
      </div>
      ${bodyHtml}
    </div>`;
  const _tri = (bg1, bg2, bg3, c1, c2, c3, v1, v2, v3) => `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
      <div style="background:${bg1};border-radius:10px;padding:10px;text-align:center;"><div style="font-size:10px;color:${c1};font-weight:600;">근로자</div><div style="font-size:18px;font-weight:800;color:${c2};">${v1}</div></div>
      <div style="background:${bg2};border-radius:10px;padding:10px;text-align:center;"><div style="font-size:10px;color:${c1};font-weight:600;">사용자</div><div style="font-size:18px;font-weight:800;color:${c2};">${v2}</div></div>
      <div style="background:${bg3};border-radius:10px;padding:10px;text-align:center;"><div style="font-size:10px;color:${c3};font-weight:600;">합계</div><div style="font-size:18px;font-weight:800;color:${c2};">${v3}</div></div>
    </div>`;

  const pension = _pickInsRate('national_pension');
  const health  = _pickInsRate('health');
  const ltcare  = _pickInsRate('long_term_care');
  const employ  = _pickInsRate('employment');

  const pRate = pension ? Number(pension.rate) : 0;
  const hRate = health  ? Number(health.rate)  : 0;
  const ltRate= ltcare  ? Number(ltcare.rate)  : 0;
  const eRate = employ  ? Number(employ.rate)  : 0;
  const ltWorker = hRate * ltRate / 100; // 건강보험료의 장기요양 비율

  const noData = !pension && !health && !employ;
  if(noData){
    if(cardsEl) cardsEl.innerHTML = '<div style="text-align:center;padding:24px;color:#9ca3af;">산정기준표 데이터가 없습니다</div>';
    if(sumEl) sumEl.innerHTML = '';
    return;
  }
  const yearTxt = (pension||health||employ)?.year ? `${(pension||health||employ).year}년` : '현재 적용 기준';
  const infoEl = document.getElementById('ir-info-year');
  if(infoEl) infoEl.textContent = yearTxt;

  // ── 국민연금 카드 ──
  let cardsHtml = '';
  if(pension){
    const capTxt = pension.cap_amount ? `• 기준소득월액 상한: <strong>${Number(pension.cap_amount).toLocaleString('ko-KR')}원</strong><br>` : '';
    cardsHtml += _card('fa-shield-alt', 'linear-gradient(135deg,#3b82f6,#1d4ed8)', '국민연금', 'National Pension',
      _tri('#eff6ff','#dbeafe','#bfdbfe','#3b82f6','#1d4ed8','#1d4ed8',
           `${_fmtRate(pRate)}%`, `${_fmtRate(pRate)}%`, `${_fmtRate(pRate*2)}%`) +
      `<div style="margin-top:10px;font-size:11px;color:#6b7280;line-height:1.7;">
        ${capTxt}• 적용기간: <strong>${_fmtPeriod(pension)}</strong><br>
        • 의무 가입: 18세 이상 60세 미만 근로자
      </div>`);
  }
  // ── 건강보험 카드 (장기요양 포함) ──
  if(health){
    cardsHtml += _card('fa-heartbeat', 'linear-gradient(135deg,#10b981,#059669)', '건강보험', 'Health Insurance',
      _tri('#ecfdf5','#d1fae5','#a7f3d0','#059669','#065f46','#065f46',
           `${_fmtRate(hRate)}%`, `${_fmtRate(hRate)}%`, `${_fmtRate(hRate*2)}%`) +
      `<div style="background:#f0fdf4;border-radius:8px;padding:8px 10px;margin:8px 0 6px;">
        <div style="font-size:11.5px;font-weight:700;color:#065f46;margin-bottom:4px;">└ 장기요양보험 (건강보험료의 ${_fmtRate(ltRate)}%)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
          <div style="background:#ecfdf5;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:#059669;">근로자</div><div style="font-size:15px;font-weight:700;color:#065f46;">${_fmtRate(ltWorker)}%</div></div>
          <div style="background:#d1fae5;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:#059669;">사용자</div><div style="font-size:15px;font-weight:700;color:#065f46;">${_fmtRate(ltWorker)}%</div></div>
          <div style="background:#a7f3d0;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:#065f46;">합계</div><div style="font-size:15px;font-weight:700;color:#065f46;">${_fmtRate(ltWorker*2)}%</div></div>
        </div>
      </div>
      <div style="font-size:11px;color:#6b7280;line-height:1.7;">• 적용기간: <strong>${_fmtPeriod(health)}</strong></div>`);
  }
  // ── 고용보험 카드 ──
  if(employ){
    cardsHtml += _card('fa-briefcase', 'linear-gradient(135deg,#f59e0b,#d97706)', '고용보험', 'Employment Insurance',
      `<div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#fffbeb;">
            <th style="padding:8px;text-align:left;color:#92400e;font-weight:700;border-bottom:1px solid #fde68a;">구분</th>
            <th style="padding:8px;text-align:center;color:#92400e;font-weight:700;border-bottom:1px solid #fde68a;">근로자</th>
            <th style="padding:8px;text-align:center;color:#92400e;font-weight:700;border-bottom:1px solid #fde68a;">사용자</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:8px;color:#374151;">실업급여</td><td style="padding:8px;text-align:center;font-weight:700;">${_fmtRate(eRate)}%</td><td style="padding:8px;text-align:center;font-weight:700;">${_fmtRate(eRate)}%</td></tr>
            <tr style="background:#fffbeb;"><td style="padding:8px;color:#374151;">고용안정·직업능력개발<br><span style="font-size:10px;color:#9ca3af;">(사업주 부담)</span></td><td style="padding:8px;text-align:center;color:#9ca3af;">-</td><td style="padding:8px;text-align:center;font-weight:700;">0.25%~0.85%</td></tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:8px;font-size:11px;color:#6b7280;line-height:1.7;">• 적용기간: <strong>${_fmtPeriod(employ)}</strong><br>• 고용안정·직업능력개발 사업 부담률은 사업장 규모에 따라 상이</div>`);
  }
  if(cardsEl) cardsEl.innerHTML = cardsHtml;

  // ── 근로자 공제 요율 요약 ──
  const total = pRate + hRate + ltWorker + eRate;
  const _sumTile = (label, bg, lc, bc, val) => `
    <div style="background:${bg};border-radius:10px;padding:10px;text-align:center;"><div style="font-size:10px;color:${lc};">${label}</div><div style="font-size:17px;font-weight:800;color:${bc};">${val}</div></div>`;
  if(sumEl){
    sumEl.innerHTML = `
      <div style="background:#fff;border-radius:14px;box-shadow:0 1px 8px rgba(0,0,0,.07);padding:16px;">
        <div style="font-size:13px;font-weight:800;color:#1a1a2e;margin-bottom:10px;"><i class="fas fa-calculator" style="color:#6366f1;margin-right:6px;"></i>근로자 공제 요율 요약</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${_sumTile('국민연금', '#eff6ff', '#3b82f6', '#1d4ed8', `${_fmtRate(pRate)}%`)}
          ${_sumTile('건강보험', '#ecfdf5', '#059669', '#065f46', `${_fmtRate(hRate)}%`)}
          ${_sumTile('장기요양', '#f0fdf4', '#16a34a', '#15803d', `${_fmtRate(ltWorker)}%`)}
          ${_sumTile('고용보험', '#fffbeb', '#d97706', '#92400e', `${_fmtRate(eRate)}%`)}
        </div>
        <div style="margin-top:10px;background:#f5f3ff;border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:#7c3aed;">근로자 총 부담률 (실업급여 기준)</div>
          <div style="font-size:22px;font-weight:800;color:#5b21b6;">약 ${total.toFixed(1)}%</div>
        </div>
      </div>`;
  }
}

// ── 명세서 sticky 필터 top 위치 동적 조정 ──