// 계약만료 통지 관리 (CEN = Contract Expiry Notice)
// ======================================================================

/** 전역 상태 */
let _cenNoticeList  = [];   // contract_expiry_notice 테이블 캐시
let _cenHistoryLoaded = false;
let _cenTab         = 'target';  // 현재 탭
let _cenTargetPage  = 1;
let _cenHistoryPage = 1;
const CEN_PAGE_SIZE = 20;
const CEN_NOTICE_DAYS = 29;  // 만료 N일 전 통지 대상

/** 탭 전환 */
function cenSwitchTab(tab){
  _cenTab = tab;
  document.getElementById('cen-tab-target').classList.toggle('active',   tab==='target');
  document.getElementById('cen-tab-history').classList.toggle('active',  tab==='history');
  document.getElementById('cen-tab-template').classList.toggle('active', tab==='template');
  document.getElementById('cen-panel-target').style.display   = tab==='target'   ? '' : 'none';
  document.getElementById('cen-panel-history').style.display  = tab==='history'  ? '' : 'none';
  document.getElementById('cen-panel-template').style.display = tab==='template' ? '' : 'none';
  if(tab==='history'){
    if(!_cenHistoryLoaded){
      (async()=>{ await cenLoadHistory(true); renderCenHistory(); })();
    } else {
      renderCenHistory();
    }
  }
  if(tab==='template'){
    _cenFillTemplateSampleSel();
    renderCenTemplate();
  }
}

// ==================================================================
//  메시지 예시 탭 — 알림톡 / 이메일 템플릿 미리보기
// ==================================================================

/**
 * 샘플 선택 셀렉트 채우기
 * - 현재 통지 대상 목록(_cenNoticeList)을 옵션으로 제공
 * - 목록이 없으면 "예시 데이터로 보기"만 유지
 */
function _cenFillTemplateSampleSel(){
  const sel = document.getElementById('cen-tmpl-sample-sel');
  if(!sel) return;
  sel.innerHTML = '<option value="__demo__">— 예시 데이터로 보기 —</option>';
  (_cenNoticeList || []).forEach(item => {
    const emp = item.emp || {}, co = item.co || {};
    const opt = document.createElement('option');
    opt.value       = item.c?.id || '';
    opt.textContent = `${emp.name||'(이름없음)'} · ${item.cat||''} · ${co.company_name||''} · D-${item.daysLeft}`;
    sel.appendChild(opt);
  });
}

/**
 * 메시지 템플릿 렌더링
 * 근로자용(알림톡·이메일) + 고객사용(인앱 알림) 두 섹션 모두 갱신
 */
function renderCenTemplate(){
  const sel    = document.getElementById('cen-tmpl-sample-sel');
  const selVal = sel ? sel.value : '__demo__';

  // ── 1. 데이터 준비 ────────────────────────────────────────────
  let empName='홍길동', catLabel=CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED], coName='(주)샘플코리아',
      coRep='김대표', contractEnd='2025-07-18', daysLeft=29,
      phone='010-1234-5678', email='sample@example.com',
      adminPhone='02-000-0000', adminEmail='labor@example.com';

  if(selVal !== '__demo__'){
    const item = (_cenNoticeList||[]).find(x => x.c?.id === selVal);
    if(item){
      empName     = item.emp?.name          || empName;
      catLabel    = item.cat                || catLabel;
      coName      = item.co?.company_name   || coName;
      coRep       = getCompanyRepName(item.co) || coRep;
      contractEnd = item.c?.contract_end    || contractEnd;
      daysLeft    = item.daysLeft           ?? daysLeft;
      phone       = item.emp?.phone         || phone;
      email       = item.emp?.email         || email;
    }
  }

  const [ey,em,ed] = contractEnd.split('-');
  const endKr    = `${parseInt(ey)}년 ${parseInt(em)}월 ${parseInt(ed)}일`;
  const ddayStr  = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
  const ddayClass= daysLeft <= 7 ? 'urgent' : daysLeft <= 14 ? 'soon' : 'normal';

  // 긴급도별 문구
  const urgencyWorker  = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박했습니다. 빠른 확인이 필요합니다.'
                       : daysLeft <= 14 ? '조속한 확인을 부탁드립니다.'
                       :                 '충분한 준비 기간이 있으니 미리 확인해 주세요.';
  const urgencyCompany = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박하였습니다. 즉시 갱신 여부를 결정해 주세요.'
                       : daysLeft <= 14 ? '조속히 갱신 또는 종료 여부를 확인해 주시기 바랍니다.'
                       :                 '미리 갱신 여부를 검토하시어 원활한 인사 관리가 되시길 바랍니다.';

  // ── 2. 근로자 — 알림톡 ────────────────────────────────────────
  const kakaoBody =
`안녕하세요, ${empName}님.

귀하의 근로계약이 곧 만료될 예정입니다.

■ 고용형태: ${catLabel}
■ 만료 예정일: ${endKr}
■ 남은 기간: ${ddayStr}

${urgencyWorker}
계약 갱신 또는 종료 여부를 담당 노무사와 미리 상의해 주시기 바랍니다.

${_BRAND_SIG}`;

  const kakaoFooter =
`※ 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 계약만료 사전 통지입니다.
문의: ${adminPhone}`;

  // ── 3. 근로자 — 이메일 ────────────────────────────────────────
  const emailSubject = `[계약만료 안내] ${empName}님의 ${catLabel} 계약이 ${ddayStr} 후 만료됩니다`;
  const emailIntro =
`항상 성실히 근무해 주셔서 감사합니다.

귀하의 근로계약 만료일이 다가와 사전에 안내드립니다.
${urgencyWorker}`;

  const emailBody2 =
`계약 갱신을 희망하시거나 만료 처리에 관한 문의 사항이 있으시면 담당 노무사에게 연락해 주시기 바랍니다.

고용 유지 또는 종료 여부와 관계없이 퇴직금, 실업급여 등 귀하의 권리를 충분히 안내해 드리겠습니다.`;

  const emailNotice =
`본 메일은 「기간제 및 단시간근로자 보호 등에 관한 법률」 및 근로기준법에 따른 계약만료 사전 통지 메일입니다.
수신을 원하지 않으시면 담당자에게 문의해 주세요.

${_BRAND_SIG}`;

  // ── 4. 고객사 — 인앱 알림 ────────────────────────────────────
  const inappTitle  = `[계약만료 예정] ${empName} ${catLabel} — ${ddayStr}`;
  const inappShort  = `${empName}(${catLabel})님 계약이 ${endKr} 만료됩니다. (${ddayStr})`;

  const inappFullBody =
`안녕하세요, ${coName} ${coRep} 사장님.

소속 직원의 근로계약 만료일이 다가와 안내드립니다.
${urgencyCompany}`;

  const inappFoot =
`담당 노무사에게 갱신 여부를 확인해 주세요.
문의: ${adminPhone} / ${adminEmail}
※ 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 사전 통지

${_BRAND_SIG}`;

  // ── 5. DOM 반영: 근로자 알림톡 ──────────────────────────────
  _setText('cen-tmpl-kakao-body',   kakaoBody);
  _setText('cen-tmpl-kakao-footer', kakaoFooter);

  // ── 6. DOM 반영: 근로자 이메일 ──────────────────────────────
  _setText('cen-tmpl-email-subject',  `📋 ${emailSubject}`);
  _setText('cen-tmpl-email-to',       `수신: ${email || '이메일 미등록'}`);
  _setText('cen-tmpl-email-greeting', `안녕하세요, ${empName}님.`);
  _setText('cen-tmpl-email-intro',    emailIntro);
  _setText('cen-tmpl-email-body2',    emailBody2);
  _setText('cen-tmpl-email-notice',   emailNotice);
  _setText('cen-tmpl-email-footer',   `${coName} 담당 노무사 · ${adminPhone} · ${adminEmail}`);

  const infoBox = document.getElementById('cen-tmpl-email-infobox');
  if(infoBox) infoBox.innerHTML = `
    <div class="cen-email-info-row"><span class="cen-email-info-label">직원명</span><span class="cen-email-info-val">${empName}</span></div>
    <div class="cen-email-info-row"><span class="cen-email-info-label">고용형태</span><span class="cen-email-info-val">${catLabel}</span></div>
    <div class="cen-email-info-row"><span class="cen-email-info-label">소속 회사</span><span class="cen-email-info-val">${coName}</span></div>
    <div class="cen-email-info-row">
      <span class="cen-email-info-label">계약 만료일</span>
      <span class="cen-email-info-val">${endKr} <span class="cen-email-dday-badge ${ddayClass}">${ddayStr}</span></span>
    </div>`;

  // ── 7. DOM 반영: 고객사 인앱 알림 ───────────────────────────
  _setText('cen-tmpl-inapp-title',      inappTitle);
  _setText('cen-tmpl-inapp-body',       inappShort);
  _setText('cen-tmpl-inapp-full-title', inappTitle);
  _setText('cen-tmpl-inapp-full-body',  inappFullBody);
  _setText('cen-tmpl-inapp-foot',       inappFoot);

  const inappInfoBox = document.getElementById('cen-tmpl-inapp-infobox');
  if(inappInfoBox) inappInfoBox.innerHTML = `
    <div class="cen-email-info-row"><span class="cen-email-info-label">직원명</span><span class="cen-email-info-val">${empName}</span></div>
    <div class="cen-email-info-row"><span class="cen-email-info-label">고용형태</span><span class="cen-email-info-val">${catLabel}</span></div>
    <div class="cen-email-info-row">
      <span class="cen-email-info-label">계약 만료일</span>
      <span class="cen-email-info-val">${endKr} <span class="cen-email-dday-badge ${ddayClass}">${ddayStr}</span></span>
    </div>`;

  // 시간 표시
  const now = new Date();
  _setText('cen-tmpl-inapp-time', `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);

  // ── 8. 변수 안내 테이블 ──────────────────────────────────────
  const vars = [
    ['{직원명}',     '수신 근로자의 이름',                    empName,           '근로자·고객사 공통'],
    ['{고용형태}',   '계약직 / 계약직(수습) / 일용직',         catLabel,          '근로자·고객사 공통'],
    ['{회사명}',     '소속 고객사 회사명',                    coName,            '근로자·고객사 공통'],
    ['{대표자명}',   '고객사 대표자명 (사장님 호칭)',           coRep,             '고객사 전용'],
    ['{계약만료일}', '계약 종료일 (YYYY년 MM월 DD일)',         endKr,             '근로자·고객사 공통'],
    ['{남은기간}',   'D-day 형식 (D-29 ~ D-0)',              ddayStr,           '근로자·고객사 공통'],
    ['{수신번호}',   '알림톡 수신 직원 휴대폰 번호',            phone||'미등록',   '근로자 알림톡'],
    ['{수신이메일}', '이메일 수신 직원 이메일 주소',             email||'미등록',   '근로자 이메일'],
    ['{긴급도_근로자}', '남은 기간별 근로자 촉구 문구',         urgencyWorker,     '근로자 전용'],
    ['{긴급도_고객사}', '남은 기간별 고객사 촉구 문구',         urgencyCompany,    '고객사 전용'],
  ];
  const tbody = document.getElementById('cen-tmpl-var-tbody');
  if(tbody){
    tbody.innerHTML = vars.map(([v, desc, ex, target]) => `
      <tr>
        <td><span class="cen-var-chip">${v}</span></td>
        <td style="color:#374151;">${desc}</td>
        <td style="color:#6b7280;font-size:11.5px;">${ex}</td>
        <td><span style="background:#f3f4f6;color:#374151;border-radius:20px;padding:1px 8px;font-size:10.5px;font-weight:600;white-space:nowrap;">${target}</span></td>
      </tr>`).join('');
  }

  // 변수 안내 헤더도 컬럼 추가 반영
  const varHead = document.querySelector('#cen-tmpl-var-tbody')?.closest('table')?.querySelector('thead tr');
  if(varHead && varHead.children.length === 3){
    const th = document.createElement('th');
    th.textContent = '적용 대상';
    varHead.appendChild(th);
  }
}

/** 텍스트 설정 헬퍼 */
function _setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

/** showPage 진입 시 초기화 */
async function initCenPage(){
  // 고객사 필터 옵션 채우기
  _cenFillCompanyFilter('cen-filter-company');
  _cenFillCompanyFilter('cen-log-filter-company');
  // 통지 이력 로드 (캐시 없으면)
  if(!_cenHistoryLoaded) await cenLoadHistory(true);
  // 통지 대상 렌더
  renderCenTargetList();
  renderCenStats();
}

/** 고객사 필터 select 옵션 자동 채우기 */
function _cenFillCompanyFilter(selId){
  const sel = document.getElementById(selId);
  if(!sel || sel.options.length > 1) return;
  allCompanies
    .filter(c => isCompanyActive(c))
    .sort((a,b)=>(a.company_name||'').localeCompare(b.company_name||'','ko'))
    .forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.company_name || c.id;
      sel.appendChild(opt);
    });
}

/** 통지 이력 DB에서 로드 */
async function cenLoadHistory(force=false){
  if(!force && _cenHistoryLoaded) return;
  try{
    const res = await fetch('../tables/contract_expiry_notice?page=1&limit=1000');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _cenNoticeList = (data.data || []).sort((a,b)=>{
      const ta = a.noticed_at || a.created_at || '';
      const tb = b.noticed_at || b.created_at || '';
      return tb.localeCompare(ta);
    });
    _cenHistoryLoaded = true;
  } catch(e){
    console.error('[CEN 이력 로드 오류]', e);
    _cenNoticeList = [];
  }
}

/**
 * 통지 대상 계산
 * 조건: 계약직/계약직수습/일용직 + 활성 + 만료일이 오늘~29일 후 + is_draft=false + status≠파기/해지/만료
 */
function _cenGetTargetContracts(){
  const today = new Date();
  today.setHours(0,0,0,0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + CEN_NOTICE_DAYS);

  // 이미 통지한 contract_id 집합 (이번 달 통지 기준)
  const nowYM = new Date().toISOString().slice(0,7); // 'YYYY-MM'
  const noticedThisMonth = new Set(
    _cenNoticeList
      .filter(r => (r.noticed_at || r.created_at || '').slice(0,7) === nowYM)
      .map(r => r.contract_id)
      .filter(Boolean)
  );

  return allContracts.filter(c => {
    if(c.is_draft) return false;
    if([CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.TERMINATED, CONTRACT_STATUS.EXPIRED, CONTRACT_STATUS.CANCELED].includes(c.status)) return false;
    if(c.is_voided_by_amend) return false;
    // 고용형태 확인 (emp.employment_category 우선)
    const emp = allEmployees.find(e=>e.id===c.employee_id);
    const cat = emp?.employment_category || c.contract_type || '';
    const normalizedCat = normalizeContractType(cat);
    if(![CONTRACT_TYPE.FIXED, CONTRACT_TYPE.FIXED_PROBATION, CONTRACT_TYPE.DAILY].includes(normalizedCat)) return false;
    // 계약 만료일 확인
    if(!c.contract_end) return false;
    const endDate = new Date(c.contract_end);
    endDate.setHours(0,0,0,0);
    if(endDate < today || endDate > limit) return false;
    // 이번 달 이미 통지한 계약 제외
    if(noticedThisMonth.has(c.id)) return false;
    return true;
  }).map(c => {
    const emp = allEmployees.find(e=>e.id===c.employee_id);
    const co  = allCompanies.find(x=>x.id===c.company_id);
    const cat = emp?.employment_category || c.contract_type || '-';
    const endDate = new Date(c.contract_end);
    endDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((endDate - today) / (1000*60*60*24));
    return { ...c, _emp: emp, _co: co, _cat: cat, _daysLeft: daysLeft };
  }).sort((a,b) => a._daysLeft - b._daysLeft); // 만료 임박순
}

/** 요약 통계 업데이트 */
function renderCenStats(){
  const targets = _cenGetTargetContracts();
  const urgent = targets.filter(c=>c._daysLeft<=7).length;
  const soon   = targets.filter(c=>c._daysLeft>=8&&c._daysLeft<=14).length;
  const normal = targets.filter(c=>c._daysLeft>=15).length;

  const nowYM = new Date().toISOString().slice(0,7);
  const done  = _cenNoticeList.filter(r=>(r.noticed_at||r.created_at||'').slice(0,7)===nowYM).length;

  document.getElementById('cen-stat-urgent').textContent = urgent;
  document.getElementById('cen-stat-soon').textContent   = soon;
  document.getElementById('cen-stat-normal').textContent = normal;
  document.getElementById('cen-stat-done').textContent   = done;
  document.getElementById('cen-tab-target-badge').textContent = targets.length;
}

/** 통지 대상 목록 테이블 렌더링 */
function renderCenTargetList(){
  const tbody = document.getElementById('cen-target-tbody');
  if(!tbody) return;

  const filterCompany = document.getElementById('cen-filter-company')?.value || '';
  const filterEmpCat  = document.getElementById('cen-filter-empcat')?.value  || '';
  const filterRange   = document.getElementById('cen-filter-range')?.value   || '';
  const searchQ       = (document.getElementById('cen-search')?.value || '').trim().toLowerCase();

  let list = _cenGetTargetContracts().filter(c => {
    if(filterCompany && c.company_id !== filterCompany) return false;
    if(filterEmpCat  && c._cat !== filterEmpCat) return false;
    if(filterRange === 'urgent' && c._daysLeft > 7) return false;
    if(filterRange === 'soon'   && (c._daysLeft < 8 || c._daysLeft > 14)) return false;
    if(filterRange === 'normal' && c._daysLeft < 15) return false;
    if(searchQ && !(c._emp?.name||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>(a._emp?.name||'').localeCompare(b._emp?.name||'','ko'));

  const totalPages = Math.max(1, Math.ceil(list.length / CEN_PAGE_SIZE));
  if(_cenTargetPage > totalPages) _cenTargetPage = totalPages;
  const pageData = list.slice((_cenTargetPage-1)*CEN_PAGE_SIZE, _cenTargetPage*CEN_PAGE_SIZE);

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="9" class="cen-empty">
      <i class="fas fa-check-circle" style="color:#10b981;"></i>
      29일 이내 계약만료 통지 대상이 없습니다.
    </td></tr>`;
    document.getElementById('cen-target-pagination').innerHTML = '';
    _cenUpdateBulkBtns();
    return;
  }

  const fmtDday = (d) => {
    if(d === 0) return `<span class="cen-dday urgent">D-day</span>`;
    const cls = d<=7?'urgent':d<=14?'soon':'normal';
    return `<span class="cen-dday ${cls}">D-${d}</span>`;
  };

  tbody.innerHTML = pageData.map((c, idx) => {
    const globalIdx = (_cenTargetPage-1)*CEN_PAGE_SIZE + idx;
    const empName  = c._emp?.name || '(알 수 없음)';
    const coName   = c._co?.company_name || '-';
    const phone    = c._emp?.phone || '';
    const email    = c._emp?.email || '';
    const hasPhone = !!phone.trim();
    const hasEmail = !!email.trim();
    return `<tr>
      <td style="text-align:center;">
        <input type="checkbox" class="cen-chk cen-row-chk" data-idx="${globalIdx}" data-contract-id="${c.id}"
          onchange="cenUpdateSelectedCount()" />
      </td>
      <td style="font-weight:700;color:#1f2937;">${empName}</td>
      <td><span class="badge ${CAT_BADGE_CLS[normalizeContractType(c._cat)]||'badge-gray'}" style="font-size:11px;">${contractTypeLabel(c._cat)}</span></td>
      <td style="font-size:12px;color:#374151;">${coName}</td>
      <td style="font-size:12px;color:#6b7280;font-weight:600;">${c.contract_end}</td>
      <td>${fmtDday(c._daysLeft)}</td>
      <td style="font-size:12px;">${hasPhone ? phone : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="font-size:12px;">${hasEmail ? `<span style="color:#374151;">${email}</span>` : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button onclick="cenSendOne('${c.id}','알림톡')" ${hasPhone?'':'disabled'}
          class="${hasPhone ? 'btn btn-kakao btn-sm' : 'btn btn-sm'}" style="margin-right:3px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡
        </button>
        <button onclick="cenSendOne('${c.id}','이메일')" ${hasEmail?'':'disabled'}
          class="${hasEmail ? 'btn btn-sky btn-sm' : 'btn btn-sm'}" style="margin-right:3px;">
          ✉ 이메일
        </button>
        <button onclick="cenSendOne('${c.id}','수동교부')"
          class="btn btn-success btn-sm">
          <i class="fas fa-hand-paper"></i> 수동교부
        </button>
      </td>
    </tr>`;
  }).join('');

  // 전체 선택 체크박스 상태 갱신
  document.getElementById('cen-chk-all').checked = false;
  document.getElementById('cen-thead-chk').checked = false;
  cenUpdateSelectedCount();

  // 페이지네이션
  _cenRenderPagination('cen-target-pagination', list.length, _cenTargetPage, 'setCenTargetPage');
}

function setCenTargetPage(p){ _cenTargetPage = p; renderCenTargetList(); }

/** 선택 건수 업데이트 및 일괄 버튼 상태 */
function cenUpdateSelectedCount(){
  const checked = document.querySelectorAll('.cen-row-chk:checked');
  const count = checked.length;
  const el = document.getElementById('cen-selected-count');
  if(el) el.textContent = count > 0 ? `${count}건 선택됨` : '';
  _cenUpdateBulkBtns();
}

function _cenUpdateBulkBtns(){
  const checked = document.querySelectorAll('.cen-row-chk:checked');
  const hasPhone = [...checked].some(chk => {
    const cId = chk.dataset.contractId;
    const c = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    return !!(emp?.phone);
  });
  const hasEmail = [...checked].some(chk => {
    const cId = chk.dataset.contractId;
    const c = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    return !!(emp?.email);
  });
  const kakaoBtn = document.getElementById('cen-btn-bulk-kakao');
  const emailBtn = document.getElementById('cen-btn-bulk-email');
  if(kakaoBtn) kakaoBtn.disabled = !(checked.length > 0 && hasPhone);
  if(emailBtn) emailBtn.disabled = !(checked.length > 0 && hasEmail);
}

/** 전체 선택/해제 */
function cenToggleAll(chkEl){
  const isChecked = chkEl.checked;
  document.querySelectorAll('.cen-row-chk').forEach(c=>{ c.checked = isChecked; });
  // thead/footer 체크박스 동기화
  ['cen-chk-all','cen-thead-chk'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.checked=isChecked;
  });
  cenUpdateSelectedCount();
}

/** 개별 통지 발송 */
async function cenSendOne(contractId, method){
  const c   = allContracts.find(x=>x.id===contractId);
  const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
  const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
  if(!c||!emp||!co){ toast('계약 정보를 찾을 수 없습니다.','error'); return; }

  if(method===DISPATCH_METHOD.KAKAO && !emp.phone){ toast(`${emp.name} — 전화번호가 등록되지 않았습니다.`,'error'); return; }
  if(method===DISPATCH_METHOD.EMAIL && !emp.email){ toast(`${emp.name} — 이메일이 등록되지 않았습니다.`,'error'); return; }

  const today = new Date(); today.setHours(0,0,0,0);
  const endDate = new Date(c.contract_end); endDate.setHours(0,0,0,0);
  const daysLeft = Math.ceil((endDate-today)/(1000*60*60*24));

  const recipient = method===DISPATCH_METHOD.KAKAO ? emp.phone : method===DISPATCH_METHOD.EMAIL ? emp.email : '직접배부';
  const confirmMsg = method===DISPATCH_METHOD.MANUAL
    ? `[수동 교부 완료]\n\n${emp.name} (${co.company_name}) 님의 계약만료 통지를\n직접 교부하셨습니까?\n\n계약 만료일: ${c.contract_end} (D-${daysLeft})`
    : `[계약만료 통지 — ${method}]\n\n${emp.name} (${co.company_name})\n계약 만료일: ${c.contract_end} (D-${daysLeft})\n수신: ${recipient}\n\n발송 후 고객사(${co.company_name}) 앱에도 알림이 함께 전송됩니다.\n\n발송하시겠습니까?`;

  if(!confirm(confirmMsg)) return;
  try{
    // 1) 근로자 통지 이력 저장
    await _cenSaveNotice({ contractId, method, status: DISPATCH_STATUS.COMPLETED, recipient, note:`개별 ${method} — ${emp.name}`, daysLeft });
    // 2) 고객사 인앱 알림 발송 (수동교부 포함 항상 전송)
    await _cenSendCompanyNotice({ c, emp, co, daysLeft });
    toast(`✅ ${emp.name} 계약만료 통지(${method}) 완료 + 고객사 알림 발송`, 'success');
    await cenRefresh();
  } catch(e){ console.error(e); toast('발송 중 오류가 발생했습니다.','error'); }
}

/** 일괄 발송 */
async function cenBulkSend(method){
  const checked = [...document.querySelectorAll('.cen-row-chk:checked')];
  if(!checked.length){ toast('발송할 항목을 선택하세요.','warning'); return; }

  const targets = checked.map(chk=>{
    const cId = chk.dataset.contractId;
    const c   = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
    return { c, emp, co };
  }).filter(({c,emp,co})=>{
    if(!c||!emp||!co) return false;
    if(method===DISPATCH_METHOD.KAKAO && !emp.phone) return false;
    if(method===DISPATCH_METHOD.EMAIL && !emp.email) return false;
    return true;
  });

  if(!targets.length){ toast(`${method} 발송 가능한 대상이 없습니다. (연락처 미등록)`, 'warning'); return; }

  const names = targets.slice(0,3).map(({emp})=>emp.name).join(', ');
  const more  = targets.length > 3 ? ` 외 ${targets.length-3}명` : '';
  if(!confirm(`[계약만료 일괄 ${method} 발송]\n\n총 ${targets.length}건을 발송하시겠습니까?\n대상: ${names}${more}`)) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const bulkKakaoBtn = document.getElementById('cen-btn-bulk-kakao');
  const bulkEmailBtn = document.getElementById('cen-btn-bulk-email');
  if(bulkKakaoBtn) bulkKakaoBtn.disabled=true;
  if(bulkEmailBtn) bulkEmailBtn.disabled=true;

  let ok=0, fail=0;
  for(const {c, emp, co} of targets){
    const endDate = new Date(c.contract_end); endDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((endDate-today)/(1000*60*60*24));
    const recipient = method===DISPATCH_METHOD.KAKAO ? emp.phone : emp.email;
    try{
      // 근로자 통지 이력 저장
      await _cenSaveNotice({ contractId: c.id, method, status: DISPATCH_STATUS.COMPLETED, recipient, note:`일괄 ${method} — ${emp.name}`, daysLeft });
      // 고객사 인앱 알림 발송
      await _cenSendCompanyNotice({ c, emp, co, daysLeft });
      ok++;
    } catch(e){ fail++; }
  }
  toast(`일괄 ${method} 완료 — 성공 ${ok}건 + 고객사 알림 발송${fail?` / 실패 ${fail}건`:''}`, ok>0?'success':'error');
  await cenRefresh();
}

/**
 * ─────────────────────────────────────────────────────────────────
 * 공통 고객사 인앱 알림 발송 헬퍼
 * ─────────────────────────────────────────────────────────────────
 * @param {object} opts
 *   companyId      {string}  고객사 ID (필수)
 *   companyName    {string}  고객사명
 *   noticeType     {string}  알림 유형 식별자 (필수)
 *   title          {string}  알림 제목 (필수)
 *   body           {string}  알림 본문 (필수)
 *   contractId     {string}  관련 계약 ID
 *   employeeId     {string}  관련 근로자 ID
 *   employeeName   {string}  관련 근로자명
 *   contractEnd    {string}  계약 종료일
 *   extraData      {object}  추가 메타데이터 (JSON 직렬화 가능)
 */
async function _sendCompanyNotice({
  companyId, companyName='',
  noticeType, title, body,
  contractId='', employeeId='', employeeName='',
  contractEnd='', extraData={}
}){
  if(!companyId || !noticeType || !title || !body) return;
  const adminName = _getAdminUsername();
  try {
    await fetch('../tables/company_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        company_id   : companyId,
        company_name : companyName,
        notice_type  : noticeType,
        title,
        body,
        contract_id  : contractId,
        employee_id  : employeeId,
        employee_name: employeeName,
        contract_end : contractEnd,
        days_until_expiry: 0,
        sent_at      : new Date().toISOString(),
        sent_by      : adminName,
        is_read      : false,
        read_at      : '',
        ...extraData,
      }),
    });
  } catch(e){
    console.warn('[_sendCompanyNotice 오류]', e);
  }
}

/**
 * 고객사 인앱 알림 발송 — company_notices 테이블 INSERT
 */
async function _cenSendCompanyNotice({ c, emp, co, daysLeft }){
  if(!c || !co) return;
  const adminName = _getAdminUsername();
  const cat       = emp?.employment_category || c.contract_type || '';
    const coRep     = getCompanyRepName(co);
  const ddayStr   = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
  const [ey,em,ed]= (c.contract_end||'----/--/--').split('-');
  const endKr     = ey ? `${parseInt(ey)}년 ${parseInt(em)}월 ${parseInt(ed)}일` : c.contract_end;
  const urgencyCompany = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박하였습니다. 즉시 갱신 여부를 결정해 주세요.'
                       : daysLeft <= 14 ? '조속히 갱신 또는 종료 여부를 확인해 주시기 바랍니다.'
                       :                 '미리 갱신 여부를 검토하시어 원활한 인사 관리가 되시길 바랍니다.';

  const title = `[계약만료 예정] ${emp?.name||''} ${cat} — ${ddayStr}`;
  const body  =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원의 근로계약 만료일이 다가와 안내드립니다.
${urgencyCompany}

■ 직원명: ${emp?.name||''}
■ 고용형태: ${cat}
■ 계약 만료일: ${endKr} (${ddayStr})

담당 노무사에게 갱신 여부를 확인해 주세요.

※ 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 사전 통지

${_BRAND_SIG}`;

  await fetch('../tables/company_notices', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      company_id        : co.id,
      company_name      : co.company_name || '',
      notice_type       : 'contract_expiry',
      title,
      body,
      contract_id       : c.id,
      employee_id       : emp?.id || '',
      employee_name     : emp?.name || '',
      contract_end      : c.contract_end || '',
      days_until_expiry : daysLeft,
      sent_at           : new Date().toISOString(),
      sent_by           : adminName,
      is_read           : false,
      read_at           : '',
    }),
  });
}

/** 통지 이력 DB 저장 */
async function _cenSaveNotice({ contractId, method, status, recipient, note, daysLeft }){
  const c   = allContracts.find(x=>x.id===contractId);
  const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
  const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
  const adminName = _getAdminUsername();
  const cat = emp?.employment_category || c?.contract_type || '';

  const payload = {
    contract_id     : contractId,
    employee_id     : emp?.id || '',
    employee_name   : emp?.name || '',
    company_id      : co?.id || '',
    company_name    : co?.company_name || '',
    contract_type   : cat,
    contract_end    : c?.contract_end || '',
    days_until_expiry: daysLeft,
    notice_method   : method,
    notice_status   : status,
    recipient       : recipient || '',
    noticed_at      : new Date().toISOString(),
    noticed_by      : adminName,
    note            : note || '',
  };

  const res = await fetch('../tables/contract_expiry_notice', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(payload),
  });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const saved = await res.json();
  // 캐시에 즉시 반영
  _cenNoticeList.unshift(saved);
  return saved;
}

/** 새로고침 */
async function cenRefresh(){
  _cenHistoryLoaded = false;
  await cenLoadHistory(true);
  renderCenTargetList();
  renderCenStats();
  render2YrStats();
  renderDashRegularBanner();
  if(_cenTab === 'history') renderCenHistory();
}

// ==================================================================
