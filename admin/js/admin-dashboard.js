// ─── DASHBOARD ───


// ── 대시보드 임시저장 알림 카드 ──
/* ─────────────────────────────────────────────────────────────────
   renderDashExpiryBanner()
   계약만료 통지 대상(D-29 이내 미통지)을 모아 배너로 표시
   ───────────────────────────────────────────────────────────────── */
function renderDashExpiryBanner(){
  const sec = document.getElementById('dash-expiry-banner');
  if(!sec) return;

  const targets = _cenGetTargetContracts();   // 이미 만료일 임박순 정렬됨
  if(!targets.length){ sec.style.display='none'; sec.innerHTML=''; return; }

  const urgent = targets.filter(c => c._daysLeft <= 7);   // D-7 이내
  const total  = targets.length;

  // 고객사별 집계 → 칩 목록 (최대 8개 표시)
  const byCoMap = {};
  targets.forEach(c => {
    const coId   = c.company_id;
    const coName = c._co?.company_name || '-';
    if(!byCoMap[coId]) byCoMap[coId] = { coName, urgent:0, total:0 };
    byCoMap[coId].total++;
    if(c._daysLeft <= 7) byCoMap[coId].urgent++;
  });

  const chips = Object.values(byCoMap)
    .sort((a,b) => b.urgent - a.urgent || b.total - a.total)
    .slice(0, 8)
    .map(co => {
      const cls   = co.urgent > 0 ? 'urgent' : '';
      const label = co.urgent > 0
        ? `<i class="fas fa-exclamation-circle" style="font-size:10px;"></i> ${co.coName} <strong>${co.total}명</strong> (D-7 이내 ${co.urgent}명)`
        : `<i class="fas fa-bell" style="font-size:10px;"></i> ${co.coName} <strong>${co.total}명</strong>`;
      return `<span class="dash-alert-banner-chip ${cls}">${label}</span>`;
    }).join('');

  const moreLabel = Object.keys(byCoMap).length > 8
    ? `<span class="dash-alert-banner-chip" style="opacity:.65;">외 ${Object.keys(byCoMap).length - 8}개 고객사</span>` : '';

  sec.style.display = '';
  sec.innerHTML = `
  <div class="dash-alert-banner expiry"
       onclick="showPage('contract-expiry-notice', document.querySelector('.menu-item[data-page=\\'contract-expiry-notice\\']'))">
    <div class="dash-alert-banner-head">
      <div class="dash-alert-banner-icon">
        <i class="fas fa-file-contract"></i>
      </div>
      <div class="dash-alert-banner-body">
        <div class="dash-alert-banner-title">
          계약만료 통지 대상
          <span class="dash-alert-banner-count">${total}명</span>이 있습니다
          ${urgent.length ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700;margin-left:6px;"><i class="fas fa-exclamation-circle" style="font-size:9px;"></i> D-7 이내 ${urgent.length}명</span>` : ''}
        </div>
        <div class="dash-alert-banner-sub">29일 이내 계약 만료 예정 — 클릭하여 통지 관리로 이동</div>
      </div>
      <div class="dash-alert-banner-arrow"><i class="fas fa-chevron-right"></i></div>
    </div>
    ${chips || moreLabel ? `<div class="dash-alert-banner-list">${chips}${moreLabel}</div>` : ''}
  </div>`;
}

/* ─────────────────────────────────────────────────────────────────
   renderDashRegularBanner()
   정규직 전환 의무 대상(2년 초과)을 모아 배너로 표시
   ───────────────────────────────────────────────────────────────── */
function renderDashRegularBanner(){
  const sec = document.getElementById('dash-regular-banner');
  if(!sec) return;

  const list     = _calc2YrExceedList();
  const exceeded = list.filter(x => x.status === 'exceeded');
  if(!exceeded.length){ sec.style.display='none'; sec.innerHTML=''; return; }

  // 고객사별 집계 → 칩 목록 (최대 8개 표시)
  const byCoMap = {};
  exceeded.forEach(x => {
    if(!byCoMap[x.companyId]) byCoMap[x.companyId] = { coName: x.company, count: 0 };
    byCoMap[x.companyId].count++;
  });

  const chips = Object.values(byCoMap)
    .sort((a,b) => b.count - a.count)
    .slice(0, 8)
    .map(co => `<span class="dash-alert-banner-chip exceeded">
      <i class="fas fa-user-check" style="font-size:10px;"></i>
      ${co.coName} <strong>${co.count}명</strong>
    </span>`).join('');

  const moreLabel = Object.keys(byCoMap).length > 8
    ? `<span class="dash-alert-banner-chip" style="opacity:.65;">외 ${Object.keys(byCoMap).length - 8}개 고객사</span>` : '';

  sec.style.display = '';
  sec.innerHTML = `
  <div class="dash-alert-banner regular"
       onclick="showPage('regular-conversion', document.querySelector('.menu-item[data-page=\\'regular-conversion\\']'))">
    <div class="dash-alert-banner-head">
      <div class="dash-alert-banner-icon">
        <i class="fas fa-user-check"></i>
      </div>
      <div class="dash-alert-banner-body">
        <div class="dash-alert-banner-title">
          정규직 전환 의무 대상
          <span class="dash-alert-banner-count">${exceeded.length}명</span>이 있습니다
        </div>
        <div class="dash-alert-banner-sub">기간제 2년 초과 — 클릭하여 정규직 전환 관리로 이동</div>
      </div>
      <div class="dash-alert-banner-arrow"><i class="fas fa-chevron-right"></i></div>
    </div>
    ${chips || moreLabel ? `<div class="dash-alert-banner-list">${chips}${moreLabel}</div>` : ''}
  </div>`;
}

/* ─────────────────────────────────────────────────────────────────
   _getProbationNoticeTargets()
   수습기간 만료일로부터 1.5개월(45일) 이전부터 만료일까지 해당하는
   활성 수습 계약 목록을 반환 (만료 안 됐고 아직 활성인 것만)
   ───────────────────────────────────────────────────────────────── */
function _getProbationNoticeTargets(){
  const NOTICE_DAYS_BEFORE = 45;  // 1.5개월 ≈ 45일
  const today = new Date();
  today.setHours(0,0,0,0);

  const results = [];

  (allContracts || []).forEach(c => {
    // 수습 계약 유형 필터
    if(c.contract_type !== '정규직 수습' && c.contract_type !== '계약직 수습') return;
    // 임시저장·파기·취소된 계약 제외
    if(c.is_draft) return;
    if(['파기','해지','취소','expired','terminated'].includes(c.status)) return;
    if(c.is_voided_by_amend) return;
    // 계약 시작일 필수
    if(!c.contract_start) return;

    // 수습 만료일 계산
    const probMonths = c.probation_months ? Number(c.probation_months) : 3;
    const startDate  = new Date(c.contract_start);
    const probEnd    = new Date(startDate);
    probEnd.setMonth(probEnd.getMonth() + probMonths);
    probEnd.setDate(probEnd.getDate() - 1);
    probEnd.setHours(0,0,0,0);

    // 이미 만료된 수습(만료일 < 오늘) 제외
    if(probEnd < today) return;

    // 통지 시작일 = 만료일 - 45일
    const noticeStart = new Date(probEnd);
    noticeStart.setDate(noticeStart.getDate() - NOTICE_DAYS_BEFORE);

    // 오늘이 통지 시작일~만료일 범위 안에 있어야 표시
    if(today < noticeStart) return;

    const daysLeft = Math.round((probEnd - today) / (1000 * 60 * 60 * 24));
    const emp = allEmployees.find(e => e.id === c.employee_id);
    const co  = allCompanies.find(x => x.id === c.company_id);

    results.push({
      contract: c,
      emp,
      co,
      empName:   emp?.name || '(직원 미지정)',
      coName:    co?.company_name || '-',
      probEnd:   probEnd.toISOString().slice(0, 10),
      probMonths,
      daysLeft,
    });
  });

  // 만료일 임박순 정렬
  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ─────────────────────────────────────────────────────────────────
// _getProbationAllTargets()
//   수습 근로자 관리 페이지 전용.
//   45일 통지 범위 제한 없이 현재 수습 중인 직원 전체를 반환한다.
//   (만료일이 오늘 이후인 수습 계약 전체 = 아직 수습 기간 중)
// ─────────────────────────────────────────────────────────────────
function _getProbationAllTargets(){
  const today = new Date();
  today.setHours(0,0,0,0);

  const results = [];

  (allContracts || []).forEach(c => {
    if(c.contract_type !== '정규직 수습' && c.contract_type !== '계약직 수습') return;
    if(c.is_draft) return;
    if(['파기','해지','취소','expired','terminated'].includes(c.status)) return;
    if(c.is_voided_by_amend) return;
    if(!c.contract_start) return;

    const probMonths = c.probation_months ? Number(c.probation_months) : 3;
    const startDate  = new Date(c.contract_start);
    const probEnd    = new Date(startDate);
    probEnd.setMonth(probEnd.getMonth() + probMonths);
    probEnd.setDate(probEnd.getDate() - 1);
    probEnd.setHours(0,0,0,0);

    // 만료일이 오늘 이후인 경우만 포함 (아직 수습 중)
    if(probEnd < today) return;

    const daysLeft = Math.round((probEnd - today) / (1000 * 60 * 60 * 24));
    const emp = allEmployees.find(e => e.id === c.employee_id);
    const co  = allCompanies.find(x => x.id === c.company_id);

    results.push({
      contract: c,
      emp,
      co,
      empName:   emp?.name || '(직원 미지정)',
      coName:    co?.company_name || '-',
      probEnd:   probEnd.toISOString().slice(0, 10),
      probMonths,
      daysLeft,
    });
  });

  // 만료일 임박순 정렬
  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}

/* ─────────────────────────────────────────────────────────────────
   renderDashProbationBanner()
   대시보드 수습 만료 통지 대상 배너 렌더링
   ───────────────────────────────────────────────────────────────── */
function renderDashProbationBanner(){
  const sec = document.getElementById('dash-probation-banner');
  if(!sec) return;

  const targets = _getProbationNoticeTargets();
  if(!targets.length){ sec.style.display = 'none'; sec.innerHTML = ''; return; }

  // 해고 시 서면통지 대상자: 수습기간 3개월 초과 + 만료일 30일 이상 남은 인원
  const noticTargets = targets.filter(t => t.probMonths > 3 && t.daysLeft >= 30);
  // 해고예고수당 발생 위험: 수습기간 3개월 초과 + 만료일 30일 미만
  const urgentAll = targets.filter(t => t.probMonths > 3 && t.daysLeft < 30);
  const total     = noticTargets.length + urgentAll.length;

  // 고객사별 그룹핑
  const byCoMap = {};
  targets.forEach(t => {
    const coId = t.contract.company_id;
    if(!byCoMap[coId]) byCoMap[coId] = { coId, coName: t.coName, urgent: 0, total: 0, notice: 0, severance: 0, emps: [] };
    byCoMap[coId].total++;
    if(t.daysLeft <= 37) byCoMap[coId].urgent++;
    if(t.probMonths > 3 && t.daysLeft >= 30) byCoMap[coId].notice++;
    if(t.probMonths > 3 && t.daysLeft < 30)  byCoMap[coId].severance++;
    byCoMap[coId].emps.push(t);
  });

  const coList = Object.values(byCoMap).sort((a,b) => a.urgent !== b.urgent ? b.urgent - a.urgent : a.emps[0].daysLeft - b.emps[0].daysLeft);

  // 고객사별 행 생성 (클릭 시 수습 근로자 관리 페이지로 바로 이동)
  const coRows = coList.map(co => {
    const noticeBadge    = co.notice > 0
      ? `<span style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:600;">서면통지대상 ${co.notice}명</span>`
      : '';
    const severanceBadge = co.severance > 0
      ? `<span style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:600;">해고예고수당대상 ${co.severance}명</span>`
      : '';

    return `<div class="prob-acc-co-item" style="cursor:pointer;"
      onclick="selectProbMgmtCompanyFromDash('${co.coId}','${co.coName.replace(/'/g,"\\'")}',null)">
      <div class="prob-acc-co-header" style="cursor:pointer;">
        <i class="fas fa-building" style="color:#0d9488;font-size:12px;flex-shrink:0;"></i>
        <span class="prob-acc-co-name">${co.coName}</span>
        <span class="prob-acc-co-badges">${noticeBadge}${severanceBadge}</span>
        <i class="fas fa-chevron-right" style="color:#0d9488;font-size:11px;margin-left:auto;flex-shrink:0;"></i>
      </div>
    </div>`;
  }).join('');

  sec.style.display = '';
  sec.innerHTML = `
  <div class="prob-acc-wrap">
    <div class="prob-acc-header" onclick="toggleDashAccordion('prob-acc-main-list', this.querySelector('.dash-ac-toggle'))">
      <div class="prob-acc-icon"><i class="fas fa-user-clock"></i></div>
      <div class="prob-acc-body">
        <div class="prob-acc-title">
          관리가 필요한 수습 근로자 <span class="prob-acc-count">${total}명</span>이 있습니다
        </div>
        <div class="prob-acc-sub">수습기간 3개월 초과 근로자는 해고 시 30일 전 서면 통지 의무 · 미통지 시 해고예고 수당(30일치 급여) 지급 의무 발생</div>
      </div>
      <div class="dash-ac-toggle" style="background:#99f6e4;color:#0f766e;"><i class="fas fa-chevron-down"></i></div>
    </div>
    <div class="prob-acc-list dash-ac-body" id="prob-acc-main-list">
      ${coRows}
    </div>
  </div>`;
}



function selectProbMgmtCompanyFromDash(coId, coName, contractId){
  // 수습 근로자 관리 페이지로 이동 후 해당 고객사 선택 및 모달 열기
  const menuEl = document.querySelector('.menu-item[data-page="probation-mgmt"]');
  showPage('probation-mgmt', menuEl);
  // 페이지 전환 후 고객사 선택 및 모달 열기
  setTimeout(() => {
    selectProbMgmtCompany(coId, coName);
    if(contractId) setTimeout(() => openProbMgmtModal(contractId), 150);
  }, 80);
}

/* ─────────────────────────────────────────────────────────────────
   수습 근로자 관리 — 고객사 선택 관련
   ───────────────────────────────────────────────────────────────── */
let _probMgmtSelectedCoId   = null;
let _probMgmtSelectedCoName = '';

function renderProbMgmtCompanyList(){
  const chips = document.getElementById('probmgmt-company-chips');
  if(!chips) return;
  const q = (document.getElementById('probmgmt-company-search')?.value || '').toLowerCase();

  // 수습 중인 직원이 있는 고객사 전체 추출 (45일 통지 제한 없음)
  const allTargets = _getProbationAllTargets();
  const coIds = [...new Set(allTargets.map(t => t.contract.company_id))];

  let filtered = allCompanies.filter(c =>
    coIds.includes(c.id) && (!q || c.company_name.toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'','ko'));

  if(!filtered.length){
    chips.innerHTML = `<div style="font-size:12.5px;color:#9ca3af;padding:8px 0;">${q ? `"${q}" 검색 결과가 없습니다` : '현재 수습 중인 근로자가 있는 고객사가 없습니다'}</div>`;
    return;
  }

  chips.innerHTML = filtered.map(c => {
    const coTargets  = allTargets.filter(t => t.contract.company_id === c.id);
    const noticeCnt  = coTargets.filter(t => t.probMonths > 3 && t.daysLeft >= 30).length;
    const severCnt   = coTargets.filter(t => t.probMonths > 3 && t.daysLeft < 30).length;
    const isSelected = c.id === _probMgmtSelectedCoId;
    const noticeBadge   = noticeCnt > 0
      ? `<span class="chip-badge" style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;">서면통지대상 ${noticeCnt}명</span>`
      : '';
    const severBadge    = severCnt > 0
      ? `<span class="chip-badge has-urgent">해고예고수당대상 ${severCnt}명</span>`
      : '';
    const defaultBadge  = (!noticeCnt && !severCnt)
      ? `<span class="chip-badge normal">${coTargets.length}명</span>`
      : '';
    return `<button class="probmgmt-co-chip${isSelected?' selected':''}"
      onclick="selectProbMgmtCompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}')">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
      ${noticeBadge}${severBadge}${defaultBadge}
    </button>`;
  }).join('');
}

function selectProbMgmtCompany(coId, coName){
  _probMgmtSelectedCoId   = coId;
  _probMgmtSelectedCoName = coName;
  // 글로벌 공유 변수 업데이트 — 다른 페이지(근로 계약 관리 등) 이동 시 고객사 유지
  currentGlobalCompanyId   = coId;
  currentGlobalCompanyName = coName;
  // 헤더 레이블
  const lbl = document.getElementById('probmgmt-selected-label');
  if(lbl) lbl.textContent = coName + ' — 수습 근로자 관리';
  // 카드 전환
  document.getElementById('probmgmt-company-select-card').style.display = 'none';
  document.getElementById('probmgmt-content-section').style.display     = '';
  // 검색어 초기화 후 테이블 렌더
  const srch = document.getElementById('probmgmt-search');
  if(srch) srch.value = '';
  renderProbationMgmtTable();
  renderProbMgmtCompanyList(); // 칩 선택 상태 갱신
}

function clearProbMgmtCompany(){
  _probMgmtSelectedCoId   = null;
  _probMgmtSelectedCoName = '';
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  document.getElementById('probmgmt-company-select-card').style.display = '';
  document.getElementById('probmgmt-content-section').style.display     = 'none';
  const srch = document.getElementById('probmgmt-company-search');
  if(srch) srch.value = '';
  renderProbMgmtCompanyList();
}

/* ─────────────────────────────────────────────────────────────────
   renderProbationMgmtTable()
   수습 근로자 관리 페이지 테이블 렌더링 (선택된 고객사 기준)
   ───────────────────────────────────────────────────────────────── */
function renderProbationMgmtTable(){
  const tbody = document.getElementById('probmgmt-table-body');
  if(!tbody) return;

  const keyword = (document.getElementById('probmgmt-search')?.value || '').trim().toLowerCase();
  // 전체 수습 중인 직원 기준 (45일 통지 범위 제한 없음)
  let targets   = _getProbationAllTargets();

  // 선택된 고객사 기준 필터
  if(_probMgmtSelectedCoId){
    targets = targets.filter(t => t.contract.company_id === _probMgmtSelectedCoId);
  }
  if(keyword){
    targets = targets.filter(t => t.empName.toLowerCase().includes(keyword));
  }

  // 통계 업데이트
  // ② 해고 시 서면통지 대상자: 수습기간 3개월 초과 + 만료일까지 30일 이상 남은 인원
  const noticeCnt = targets.filter(t => t.probMonths > 3 && t.daysLeft >= 30).length;
  // ③ 해고예고수당 지급 대상: 수습기간 3개월 초과 + D-30 미만 (해고예고 없이 해고 시 30일치 수당 의무)
  const urgentCnt = targets.filter(t => t.probMonths > 3 && t.daysLeft < 30).length;
  const _s = id => document.getElementById(id);
  if(_s('probmgmt-stat-total'))     _s('probmgmt-stat-total').textContent     = targets.length;
  if(_s('probmgmt-stat-urgent'))    _s('probmgmt-stat-urgent').textContent    = noticeCnt;
  if(_s('probmgmt-stat-thismonth')) _s('probmgmt-stat-thismonth').textContent = urgentCnt;

  if(!targets.length){
    tbody.innerHTML = `<tr><td colspan="10" class="probmgmt-empty"><i class="fas fa-check-circle" style="color:#22c55e;margin-right:6px;font-size:16px;"></i>${keyword ? '검색 결과가 없습니다.' : '현재 수습 중인 근로자가 없습니다.'}</td></tr>`;
    return;
  }

  // 처리결과 레이블/색상 맵
  const _actionLabels = { confirm:'채용확정', cancel:'채용취소', dismiss:'조기해고', extend:'수습연장' };
  const _actionStyles = {
    confirm: 'background:#d1fae5;color:#065f46;',
    cancel:  'background:#fee2e2;color:#991b1b;',
    dismiss: 'background:#fff7ed;color:#c2410c;',
    extend:  'background:#eff6ff;color:#1d4ed8;',
  };

  tbody.innerHTML = targets.map(t => {
    const { empName, probEnd, probMonths, daysLeft, contract: c } = t;
    // D-day 배지: D-30 이내=긴급, D-45 이내=통지대상, 그 외=일반
    let ddayCls;
    if(daysLeft <= 30)      ddayCls = 'urgent';
    else if(daysLeft <= 45) ddayCls = 'soon';
    else                    ddayCls = 'normal';
    // 계약 유형 뱃지
    const typeBadge = c.contract_type === '정규직 수습'
      ? `<span style="background:#d1fae5;color:#065f46;border-radius:5px;padding:1px 7px;font-size:11px;font-weight:700;">정규직 수습</span>`
      : `<span style="background:#ffedd5;color:#9a3412;border-radius:5px;padding:1px 7px;font-size:11px;font-weight:700;">계약직 수습</span>`;
    // 처리결과 셀
    const actionCell = c.probmgmt_action
      ? `<span style="${_actionStyles[c.probmgmt_action]||'background:#f1f5f9;color:#64748b;'}border-radius:5px;padding:2px 8px;font-size:11.5px;font-weight:700;">${_actionLabels[c.probmgmt_action]||c.probmgmt_action}</span>`
      : `<span style="color:#d1d5db;font-size:12px;">—</span>`;
    // 처리일시 셀
    let actionAtCell = `<span style="color:#d1d5db;font-size:12px;">—</span>`;
    if(c.probmgmt_action_at){
      const dt  = new Date(c.probmgmt_action_at);
      const pad = n => String(n).padStart(2,'0');
      actionAtCell = `<span style="font-size:11.5px;color:#6b7280;">${dt.getFullYear()}.${pad(dt.getMonth()+1)}.${pad(dt.getDate())}<br><span style="color:#9ca3af;">${pad(dt.getHours())}:${pad(dt.getMinutes())}</span></span>`;
    }

    return `<tr>
      <td style="font-weight:700;color:#1e293b;">${empName}</td>
      <td>${typeBadge}</td>
      <td style="color:#6b7280;font-size:12.5px;">${c.contract_start || '-'}</td>
      <td style="color:#6b7280;font-size:12.5px;">${probMonths}개월</td>
      <td style="font-weight:600;color:#134e4a;">${probEnd}</td>
      <td><span class="probmgmt-dday ${ddayCls}">D-${daysLeft}</span></td>
      <td style="text-align:center;">${actionCell}</td>
      <td style="text-align:center;">${actionAtCell}</td>
      <td style="text-align:center;">
      <button class="probmgmt-action-btn" onclick="openContractInNewWindow('${c.id}')" style="background:#f0f9ff;color:#0369a1;border-color:#bae6fd;" title="수습 계약서 새 창으로 보기">
          <i class="fas fa-file-contract" style="font-size:11px;"></i> 조회
        </button>
      </td>
      <td style="text-align:center;">
        <button class="probmgmt-action-btn" onclick="openProbMgmtModal('${c.id}')">
          <i class="fas fa-cog" style="font-size:11px;"></i> 관리
        </button>
      </td>
    </tr>`;
  }).join('');
}

/* ─────────────────────────────────────────────────────────────────
   수습 근로자 관리 모달 열기 / 닫기 / 옵션 확장 UI
   ───────────────────────────────────────────────────────────────── */
let _probMgmtCurrentId    = null;  // 현재 모달이 열린 계약 ID
let _probMgmtSelectedOpt  = null;  // 선택한 처리 옵션

/* ── 모달 열기 ── */
function openProbMgmtModal(contractId){
  _probMgmtCurrentId   = contractId;
  _probMgmtSelectedOpt = null;

  const targets = _getProbationAllTargets();
  const t = targets.find(x => x.contract.id === contractId);
  if(!t){ alert('계약 정보를 찾을 수 없습니다.'); return; }

  const c = t.contract;
  const ddayCls = t.daysLeft <= 30 ? 'urgent' : t.daysLeft <= 45 ? 'soon' : 'normal';

  document.getElementById('probmgmt-modal-title').textContent = `수습 근로자 처리 — ${t.empName}`;
  document.getElementById('probmgmt-modal-info').innerHTML =
    `<strong>${t.empName}</strong> (${t.coName})<br>
     계약 유형: ${c.contract_type} · 수습기간: ${t.probMonths}개월<br>
     수습 만료일: <strong>${t.probEnd}</strong>
     <span class="probmgmt-dday ${ddayCls}" style="margin-left:8px;">D-${t.daysLeft}</span>`;

  // 급여 정보 계산 (채용 확정 카드에서 사용)
  const isRegular = c.contract_type === '정규직 수습';
  const salaryAmt = isRegular ? c.annual_salary : c.base_salary;
  const salaryLabel = isRegular ? '연봉 (정규직)' : '월 급여 (계약직)';
  const salaryDisplay = salaryAmt
    ? (isRegular
        ? `${Number(salaryAmt).toLocaleString()}원`
        : `${Number(salaryAmt).toLocaleString()}원/월`)
    : '미입력';
  const newContractType = isRegular ? '정규직' : '계약직';

  // ── 채용 확정 완료 상태: 일반 옵션 카드 대신 확정 상세 뷰 렌더링 ──
  if(c.probmgmt_action === 'confirm'){
    // 처리일시 포맷
    let actionAtStr = '—';
    if(c.probmgmt_action_at){
      const dt  = new Date(c.probmgmt_action_at);
      const pad = n => String(n).padStart(2,'0');
      actionAtStr = `${dt.getFullYear()}.${pad(dt.getMonth()+1)}.${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }

    // 예정 계약 찾기 (amended_from = 수습계약ID & status = '계약예정')
    const pendingContract = allContracts.find(x =>
      x.amended_from === c.id && x.status === '계약예정'
    );
    const pendingId    = pendingContract?.id || '';
    const pendingStart = pendingContract?.contract_start || '';

    // 만료일 경과 여부 (처리취소 버튼 활성/비활성)
    const _today2 = new Date(); _today2.setHours(0,0,0,0);
    const _probEndDate2 = new Date(t.probEnd); _probEndDate2.setHours(0,0,0,0);
    const isExpired = _today2 > _probEndDate2;

    const pdfBtnHtml = pendingId
      ? `<button onclick="event.stopPropagation();openContractInNewWindow('${pendingId}')" style="display:inline-flex;align-items:center;gap:6px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;"><i class="fas fa-file-pdf"></i> 근로계약서 PDF 보기 (새창)</button>`
      : `<span style="font-size:12.5px;color:#9ca3af;">계약서를 찾을 수 없습니다.</span>`;

    const revokeDisabledAttr = isExpired ? 'disabled' : '';
    const revokeTitle = isExpired
      ? '수습 만료일이 경과하여 처리취소가 불가합니다.'
      : '채용 확정을 취소하고 예정 계약을 파기합니다.';
    const revokeBtnStyle = isExpired
      ? 'display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;color:#9ca3af;border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 16px;font-size:12.5px;font-weight:700;cursor:not-allowed;font-family:inherit;'
      : 'display:inline-flex;align-items:center;gap:6px;background:#fff;color:#b91c1c;border:1.5px solid #fca5a5;border-radius:8px;padding:7px 16px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;';

    document.getElementById('probmgmt-opt-list').innerHTML =
      `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:18px 20px;">` +
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">` +
          `<span style="width:32px;height:32px;border-radius:50%;background:#d1fae5;display:inline-flex;align-items:center;justify-content:center;">` +
            `<i class="fas fa-check-circle" style="color:#065f46;font-size:16px;"></i>` +
          `</span>` +
          `<span style="font-size:14px;font-weight:800;color:#065f46;">채용 확정 처리 완료</span>` +
        `</div>` +
        `<table style="width:100%;border-collapse:collapse;font-size:13px;">` +
          `<tr style="border-bottom:1px solid #bbf7d0;">` +
            `<th style="text-align:left;padding:7px 4px;color:#6b7280;font-weight:600;width:38%;">처리일시</th>` +
            `<td style="padding:7px 4px;color:#1e293b;font-weight:700;">${actionAtStr}</td>` +
          `</tr>` +
          `<tr style="border-bottom:1px solid #bbf7d0;">` +
            `<th style="text-align:left;padding:7px 4px;color:#6b7280;font-weight:600;">${salaryLabel}</th>` +
            `<td style="padding:7px 4px;color:#1e293b;font-weight:700;">${salaryDisplay}</td>` +
          `</tr>` +
          `<tr style="border-bottom:1px solid #bbf7d0;">` +
            `<th style="text-align:left;padding:7px 4px;color:#6b7280;font-weight:600;">전환 계약 유형</th>` +
            `<td style="padding:7px 4px;color:#1e293b;font-weight:700;">${newContractType}</td>` +
          `</tr>` +
          (pendingStart
            ? `<tr style="border-bottom:1px solid #bbf7d0;">` +
                `<th style="text-align:left;padding:7px 4px;color:#6b7280;font-weight:600;">계약 시작일</th>` +
                `<td style="padding:7px 4px;color:#1e293b;font-weight:700;">${pendingStart}</td>` +
              `</tr>`
            : '') +
        `</table>` +
        `<div style="margin-top:14px;">${pdfBtnHtml}</div>` +
      `</div>` +
      `<div style="margin-top:14px;padding:14px 16px;background:#fff;border:1.5px solid #fecaca;border-radius:10px;">` +
        `<div style="font-size:12px;color:#6b7280;margin-bottom:8px;">` +
          `<i class="fas fa-info-circle" style="color:#f59e0b;margin-right:4px;"></i>` +
          `처리취소는 <strong>수습 만료일(${t.probEnd})</strong>까지만 가능합니다.` +
          (isExpired ? ' <span style="color:#dc2626;font-weight:700;">만료일이 경과하였습니다.</span>' : '') +
        `</div>` +
        `<button ${revokeDisabledAttr} title="${revokeTitle}"` +
        ` onclick="event.stopPropagation();execProbConfirmRevoke()"` +
        ` style="${revokeBtnStyle}">` +
          `<i class="fas fa-undo"></i> 처리취소` +
        `</button>` +
      `</div>`;

    document.getElementById('probmgmt-modal').style.display = 'flex';
    return;  // 일반 옵션 카드 렌더 생략
  }

  const opts = [
    {
      key:'confirm', icon:'fas fa-check-circle', iconBg:'#d1fae5', iconColor:'#065f46',
      title:'채용 확정',
      desc:'수습기간 종료 후 정식 채용으로 전환합니다.',
      expandHtml: `
        <div class="probmgmt-opt-expand-title"><i class="fas fa-file-contract"></i> 정규 계약서 자동 생성</div>
        <div class="probmgmt-opt-expand-hint">아래 정보를 확인하고 계약서를 자동으로 생성합니다.<br>생성된 계약은 <strong>계약예정</strong> 상태로 저장되며, 전환일자가 되면 자동으로 <strong>활성</strong>으로 변경됩니다.</div>
        <div class="probmgmt-opt-expand-row">
          <span class="probmgmt-opt-expand-label">채용 전환일자</span>
          <input type="date" id="probmgmt-confirm-date" class="probmgmt-opt-expand-input"
            style="flex:1;" value="${t.probEnd}" min="${new Date().toISOString().slice(0,10)}" />
        </div>
        <div class="probmgmt-opt-expand-row">
          <span class="probmgmt-opt-expand-label">${salaryLabel}</span>
          <span class="probmgmt-opt-expand-val">${salaryDisplay}</span>
        </div>
        <div class="probmgmt-opt-expand-row">
          <span class="probmgmt-opt-expand-label">전환 계약 유형</span>
          <span style="font-size:13px;font-weight:700;color:#374151;">${newContractType}</span>
        </div>
        <div style="margin-top:4px;">
          <button class="probmgmt-opt-action-btn primary" onclick="execProbConfirm()">
            <i class="fas fa-file-alt"></i> 계약서 자동생성
          </button>
        </div>`
    },
    {
      key:'cancel', icon:'fas fa-times-circle', iconBg:'#fee2e2', iconColor:'#991b1b',
      title:'채용 취소 (만료 후)',
      desc:'수습 만료 후 채용하지 않습니다. 현재 수습 계약을 종료 처리합니다.',
      expandHtml: `
        <div class="probmgmt-opt-expand-title"><i class="fas fa-ban"></i> 채용 취소 처리</div>
        <div class="probmgmt-opt-expand-hint">${t.empName}님의 수습 계약을 <strong>만료</strong> 처리합니다.<br>처리 후 해당 근로자의 수습 계약이 종료됩니다.</div>
        <button class="probmgmt-opt-action-btn danger" onclick="execProbCancel()">
          <i class="fas fa-times"></i> 채용 취소 확정
        </button>`
    },
    {
      key:'dismiss', icon:'fas fa-user-slash', iconBg:'#fff7ed', iconColor:'#c2410c',
      title:'조기 해고',
      desc:'수습 만료 전 조기에 해고합니다. 계약을 해지 처리합니다.',
      expandHtml: `
        <div class="probmgmt-opt-expand-title"><i class="fas fa-user-times"></i> 조기 해고 처리</div>
        <div class="probmgmt-opt-expand-hint">${t.empName}님의 수습 계약을 <strong>해지</strong> 처리합니다.<br>수습기간 중 조기 해고 시 법적 요건을 반드시 확인하세요.</div>
        <button class="probmgmt-opt-action-btn warning" onclick="execProbDismiss()">
          <i class="fas fa-exclamation-triangle"></i> 조기 해고 확정
        </button>`
    },
    {
      key:'extend', icon:'fas fa-calendar-plus', iconBg:'#eff6ff', iconColor:'#1d4ed8',
      title:'수습 연장',
      desc:'수습기간을 연장합니다. 기존 계약을 파기하고 새 계약이 생성됩니다.',
      expandHtml: `
        <div class="probmgmt-opt-expand-title"><i class="fas fa-calendar-plus"></i> 연장 후 총 수습기간</div>
        <div class="probmgmt-opt-expand-row">
          <span class="probmgmt-opt-expand-label">최초 시작일로부터</span>
          <input type="number" id="probmgmt-extend-months" min="1" max="24" step="1"
            class="probmgmt-opt-expand-input" style="width:70px;text-align:center;font-weight:700;color:#1d4ed8;"
            placeholder="${t.probMonths}" value="${t.probMonths}" oninput="updateProbExtendPreview()" />
          <span style="font-size:12.5px;color:#374151;">개월</span>
        </div>
        <div id="probmgmt-extend-preview" style="margin-bottom:10px;font-size:12px;color:#1e40af;min-height:18px;"></div>
        <button class="probmgmt-opt-action-btn info" onclick="execProbExtend()">
          <i class="fas fa-save"></i> 수습 연장 적용
        </button>`
    },
  ];

  document.getElementById('probmgmt-opt-list').innerHTML = opts.map(o => `
    <div class="probmgmt-opt" id="probopt-${o.key}" onclick="selectProbMgmtOpt('${o.key}')">
      <div class="probmgmt-opt-icon" style="background:${o.iconBg};color:${o.iconColor};">
        <i class="${o.icon}"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div class="probmgmt-opt-title">${o.title}</div>
        <div class="probmgmt-opt-desc">${o.desc}</div>
        <div class="probmgmt-opt-expand" onclick="event.stopPropagation()">${o.expandHtml}</div>
      </div>
    </div>`).join('');

  document.getElementById('probmgmt-modal').style.display = 'flex';
}

/* ── 옵션 선택 (카드 확장) ── */
function selectProbMgmtOpt(key){
  _probMgmtSelectedOpt = key;
  document.querySelectorAll('.probmgmt-opt').forEach(el => el.classList.remove('selected'));
  const sel = document.getElementById('probopt-' + key);
  if(sel) sel.classList.add('selected');

  // 수습 연장 선택 시 미리보기 초기화
  if(key === 'extend') updateProbExtendPreview();
}

/* ── 수습 연장 미리보기 ── */
function updateProbExtendPreview(){
  const preview = document.getElementById('probmgmt-extend-preview');
  if(!preview) return;
  const inp = document.getElementById('probmgmt-extend-months');
  const months = parseInt(inp?.value || '0', 10);
  if(!months || months < 1){ preview.textContent = ''; return; }

  const targets = _getProbationAllTargets();
  const t = targets.find(x => x.contract.id === _probMgmtCurrentId);
  if(!t){ preview.textContent = ''; return; }

  const startDate = new Date(t.contract.contract_start);
  const newEnd = new Date(startDate);
  newEnd.setMonth(newEnd.getMonth() + months);
  newEnd.setDate(newEnd.getDate() - 1);
  const newEndStr = newEnd.toISOString().slice(0, 10);

  const today = new Date(); today.setHours(0,0,0,0);
  const daysLeft = Math.round((newEnd - today) / (1000 * 60 * 60 * 24));

  let noteHtml = '';
  if(months > 3 && daysLeft >= 30)
    noteHtml = `<span style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:12px;padding:1px 8px;font-size:11px;font-weight:600;margin-left:6px;">서면통지대상</span>`;
  else if(months > 3 && daysLeft < 30)
    noteHtml = `<span style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;border-radius:12px;padding:1px 8px;font-size:11px;font-weight:600;margin-left:6px;">해고예고수당대상</span>`;

  preview.innerHTML = `연장 후 수습 만료일: <strong>${newEndStr}</strong> (D-${daysLeft})${noteHtml}`;
}

/* ── 모달 닫기 ── */
function closeProbMgmtModal(){
  document.getElementById('probmgmt-modal').style.display = 'none';
  _probMgmtCurrentId   = null;
  _probMgmtSelectedOpt = null;
}

/* ── 처리결과 PATCH 공통 헬퍼 ── */
async function _patchProbmgmtAction(contractId, action){
  const nowISO = new Date().toISOString();
  await fetch(`../tables/contracts/${contractId}`, {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ probmgmt_action: action, probmgmt_action_at: nowISO })
  });
  const idx = allContracts.findIndex(c => c.id === contractId);
  if(idx > -1){
    allContracts[idx].probmgmt_action    = action;
    allContracts[idx].probmgmt_action_at = nowISO;
  }
}

/* ─────────────────────────────────────────────────────────────────
   각 옵션별 실행 함수
   ───────────────────────────────────────────────────────────────── */

/* ── 채용 확정 ── */
async function execProbConfirm(){
  const targets = _getProbationAllTargets();
  const t = targets.find(x => x.contract.id === _probMgmtCurrentId);
  if(!t) return;
  const c = t.contract;

  const transferDate = document.getElementById('probmgmt-confirm-date')?.value;
  if(!transferDate){ alert('채용 전환일자를 선택해 주세요.'); return; }

  const isRegular      = c.contract_type === '정규직 수습';
  const newType        = isRegular ? '정규직' : '계약직';
  const salaryAmt      = isRegular ? c.annual_salary : c.base_salary;
  const salaryLabel    = isRegular ? '연봉' : '월 급여';
  const salaryDisplay  = salaryAmt
    ? (isRegular ? `${(salaryAmt/10000).toLocaleString()}만원` : `${Math.round(salaryAmt).toLocaleString()}원/월`)
    : '미입력';

  if(!confirm(
    `[채용 확정] ${t.empName}님\n\n` +
    `전환일자: ${transferDate}\n` +
    `계약 유형: ${newType}\n` +
    `${salaryLabel}: ${salaryDisplay}\n\n` +
    `계약예정 상태로 저장되며, 전환일자가 되면 자동으로 활성화됩니다.\n계속하시겠습니까?`
  )) return;

  try {
    // ① 수습 계약에 처리결과 기록
    await _patchProbmgmtAction(c.id, 'confirm');

    // ② 정규/계약직 새 계약 생성 (계약예정 상태)
    const { id, gs_project_id, gs_table_name, created_at, updated_at,
            probation_months, probation_pct, probation_amt, probation_basis,
            contract_type, status, probmgmt_action, probmgmt_action_at,
            is_voided_by_amend, voided_at, amended_from, ...baseFields } = c;
    const newContract = {
      ...baseFields,
      contract_type    : newType,
      contract_start   : transferDate,
      contract_end     : null,   // 정규직은 기간 없음
      status           : '계약예정',
      amended_from     : c.id,
      probation_months : 0,
      probation_pct    : null,
      probation_amt    : null,
      probation_basis  : null,
      is_voided_by_amend: false,
      voided_at        : null,
    };
    // 계약직이면 contract_end 유지
    if(!isRegular && c.contract_end) newContract.contract_end = c.contract_end;

    const res     = await fetch('../tables/contracts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(newContract)
    });
    const created = await res.json();
    allContracts.push(created);

    closeProbMgmtModal();
    renderProbMgmtCompanyList();
    renderProbationMgmtTable();
    renderDashProbationBanner();
    updateMenuBadges();
    alert(`${t.empName}님의 채용이 확정되었습니다.\n전환일(${transferDate})에 계약이 자동으로 활성화됩니다.`);
  } catch(e){ alert('처리 중 오류가 발생했습니다: ' + e.message); }
}

/* ── 채용 확정 처리취소 ── */
async function execProbConfirmRevoke(){
  const targets = _getProbationAllTargets();
  const t = targets.find(x => x.contract.id === _probMgmtCurrentId);
  if(!t) return;
  const c = t.contract;

  // 만료일 재검증 (버튼 비활성 우회 방어)
  const today2 = new Date(); today2.setHours(0,0,0,0);
  const probEndDate2 = new Date(t.probEnd); probEndDate2.setHours(0,0,0,0);
  if(today2 > probEndDate2){
    alert('수습 만료일이 경과하여 처리취소가 불가합니다.');
    return;
  }

  // 파기할 예정 계약 확인
  const pendingContract = allContracts.find(x =>
    x.amended_from === c.id && x.status === '계약예정'
  );

  if(!confirm(
    `[채용 확정 처리취소] ${t.empName}님\n\n` +
    `채용 확정을 취소합니다.\n` +
    (pendingContract
      ? `예정 계약(시작일: ${pendingContract.contract_start})이 파기됩니다.\n\n`
      : `연결된 예정 계약이 없습니다.\n\n`) +
    `계속하시겠습니까?`
  )) return;

  try {
    const nowISO = new Date().toISOString();

    // ① 예정 계약 파기
    if(pendingContract){
      await fetch(`../tables/contracts/${pendingContract.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status:'파기', is_voided_by_amend:true, voided_at:nowISO })
      });
      const pi = allContracts.findIndex(x => x.id === pendingContract.id);
      if(pi > -1){
        allContracts[pi].status             = '파기';
        allContracts[pi].is_voided_by_amend = true;
        allContracts[pi].voided_at          = nowISO;
      }
    }

    // ② 수습 계약 처리결과 초기화
    await fetch(`../tables/contracts/${c.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ probmgmt_action: null, probmgmt_action_at: null })
    });
    const ci = allContracts.findIndex(x => x.id === c.id);
    if(ci > -1){
      allContracts[ci].probmgmt_action    = null;
      allContracts[ci].probmgmt_action_at = null;
    }

    closeProbMgmtModal();
    renderProbMgmtCompanyList();
    renderProbationMgmtTable();
    renderDashProbationBanner();
    updateMenuBadges();
    alert(`${t.empName}님의 채용 확정이 취소되었습니다.${pendingContract ? '\n예정 계약이 파기되었습니다.' : ''}`);
  } catch(e){ alert('처리 중 오류가 발생했습니다: ' + e.message); }
}

/* ── 채용 취소 ── */
async function execProbCancel(){
  const targets = _getProbationAllTargets();
  const t = targets.find(x => x.contract.id === _probMgmtCurrentId);
  if(!t) return;

  if(!confirm(`${t.empName}님의 수습 계약을 만료 처리하시겠습니까?\n(계약 상태 → '만료')`)) return;
  try {
    await fetch(`../tables/contracts/${t.contract.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status:'만료' })
    });
    const idx = allContracts.findIndex(c => c.id === t.contract.id);
    if(idx > -1) allContracts[idx].status = '만료';
    await _patchProbmgmtAction(t.contract.id, 'cancel');

    closeProbMgmtModal();
    renderProbationMgmtTable();
    renderDashProbationBanner();
    updateMenuBadges();
    alert(`${t.empName}님의 수습 계약이 만료 처리되었습니다.`);
  } catch(e){ alert('처리 중 오류가 발생했습니다: ' + e.message); }
}

/* ── 조기 해고 ── */
async function execProbDismiss(){
  const targets = _getProbationAllTargets();
  const t = targets.find(x => x.contract.id === _probMgmtCurrentId);
  if(!t) return;

  if(!confirm(`${t.empName}님을 조기 해고 처리하시겠습니까?\n(계약 상태 → '해지')`)) return;
  try {
    await fetch(`../tables/contracts/${t.contract.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status:'해지' })
    });
    const idx = allContracts.findIndex(c => c.id === t.contract.id);
    if(idx > -1) allContracts[idx].status = '해지';
    await _patchProbmgmtAction(t.contract.id, 'dismiss');

    closeProbMgmtModal();
    renderProbationMgmtTable();
    renderDashProbationBanner();
    updateMenuBadges();
    alert(`${t.empName}님의 계약이 해지 처리되었습니다.`);
  } catch(e){ alert('처리 중 오류가 발생했습니다: ' + e.message); }
}

/* ── 수습 연장 ── */
async function execProbExtend(){
  const targets = _getProbationAllTargets();
  const t = targets.find(x => x.contract.id === _probMgmtCurrentId);
  if(!t) return;

  const inp       = document.getElementById('probmgmt-extend-months');
  const newMonths = parseInt(inp?.value || '0', 10);
  if(!newMonths || newMonths < 1){ alert('연장 후 총 수습기간(개월수)을 입력해 주세요.'); return; }
  if(newMonths <= t.probMonths){
    alert(`현재 수습기간(${t.probMonths}개월)보다 긴 개월수를 입력해 주세요.`);
    return;
  }

  const startDate = new Date(t.contract.contract_start);
  const newEnd    = new Date(startDate);
  newEnd.setMonth(newEnd.getMonth() + newMonths);
  newEnd.setDate(newEnd.getDate() - 1);
  const newEndStr = newEnd.toISOString().slice(0, 10);
  const today     = new Date(); today.setHours(0,0,0,0);
  const daysLeft  = Math.round((newEnd - today) / (1000*60*60*24));

  let noteMsg = '';
  if(newMonths > 3 && daysLeft >= 30) noteMsg = '\n\n⚠️ 서면통지대상: 해고 시 30일 전 서면 통지 의무가 있습니다.';
  else if(newMonths > 3 && daysLeft < 30) noteMsg = '\n\n🚨 해고예고수당대상: 해고 시 30일치 급여 지급 의무가 발생합니다.';

  if(!confirm(
    `${t.empName}님의 수습기간을 ${newMonths}개월로 연장합니다.\n` +
    `새 수습 만료일: ${newEndStr} (D-${daysLeft})${noteMsg}\n\n` +
    `기존 계약은 파기 처리되고 새 계약이 생성됩니다.\n계속하시겠습니까?`
  )) return;

  const nowISO = new Date().toISOString();
  const origC  = t.contract;
  try {
    // ① 기존 계약 파기
    await fetch(`../tables/contracts/${origC.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status:'파기', is_voided_by_amend:true, voided_at:nowISO })
    });
    const origIdx = allContracts.findIndex(c => c.id === origC.id);
    if(origIdx !== -1){
      allContracts[origIdx].status             = '파기';
      allContracts[origIdx].is_voided_by_amend = true;
      allContracts[origIdx].voided_at          = nowISO;
    }
    // ② 새 계약 생성
    const { id, gs_project_id, gs_table_name, created_at, updated_at, ...origFields } = origC;
    const newContract = {
      ...origFields,
      probation_months  : newMonths,
      contract_end      : newEndStr,
      status            : '활성',
      is_voided_by_amend: false,
      voided_at         : null,
      amended_from      : origC.id,
      probmgmt_action   : null,
      probmgmt_action_at: null,
    };

    const res     = await fetch('../tables/contracts', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(newContract)
    });
    const created = await res.json();
    allContracts.push(created);

    closeProbMgmtModal();
    renderProbMgmtCompanyList();
    renderProbationMgmtTable();
    renderDashProbationBanner();
    updateMenuBadges();
    alert(`${t.empName}님의 수습기간이 ${newMonths}개월로 연장되었습니다.\n새 수습 만료일: ${newEndStr}`);
  } catch(e){ alert('처리 중 오류가 발생했습니다: ' + e.message); }
}

/* ─────────────────────────────────────────────────────────────────
   퇴직금 지급 이력 배너
   severance_paid 미읽음 공지를 모아 배너로 표시
   ───────────────────────────────────────────────────────────────── */
let allSeveranceNotices = [];   // severance_paid 미읽음 캐시

async function loadSeveranceNotices(){
  try {
    const res  = await fetch('../tables/company_notices?limit=500');
    const data = await res.json();
    // severance_paid 타입 + 미읽음(is_read:false) + 발송완료(sent) 건만 캐시
    allSeveranceNotices = (data.data || []).filter(n =>
      n.notice_type === 'severance_paid' && !n.is_read && n.gn_status === 'sent'
    ).sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''));
  } catch(e){
    console.warn('[퇴직금 알림 로드 오류]', e);
    allSeveranceNotices = [];
  }
}

function renderDashSeveranceBanner(){
  const sec = document.getElementById('dash-severance-banner');
  if(!sec) return;
  if(!allSeveranceNotices.length){ sec.style.display = 'none'; sec.innerHTML = ''; return; }

  // 고객사별 집계
  const byCoMap = {};
  allSeveranceNotices.forEach(n => {
    const id = n.company_id;
    if(!byCoMap[id]) byCoMap[id] = { coName: n.company_name || '-', count: 0, latest: '' };
    byCoMap[id].count++;
    if(!byCoMap[id].latest || (n.sent_at || '') > byCoMap[id].latest)
      byCoMap[id].latest = n.sent_at || '';
  });

  const total = allSeveranceNotices.length;
  const coEntries = Object.values(byCoMap).sort((a, b) => b.count - a.count);

  const chips = coEntries.slice(0, 8).map(co => {
    const fmtDate = co.latest
      ? new Date(co.latest).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
      : '';
    return `<span class="dash-alert-banner-chip unread">
      <i class="fas fa-hand-holding-usd" style="font-size:10px;"></i>
      ${co.coName} <strong>${co.count}건</strong>${fmtDate ? ' · ' + fmtDate : ''}
    </span>`;
  }).join('');

  const moreLabel = coEntries.length > 8
    ? `<span class="dash-alert-banner-chip" style="opacity:.65;">외 ${coEntries.length - 8}개 고객사</span>`
    : '';

  sec.style.display = '';
  sec.innerHTML = `
  <div class="dash-alert-banner severance"
       onclick="showPage('severance', document.querySelector('.menu-item[data-page=\\'severance\\']'))">
    <div class="dash-alert-banner-head">
      <div class="dash-alert-banner-icon"><i class="fas fa-hand-holding-usd"></i></div>
      <div class="dash-alert-banner-body">
        <div class="dash-alert-banner-title">
          확인되지 않은 퇴직금 지급 이력
          <span class="dash-alert-banner-count">${total}건</span>이 있습니다
        </div>
        <div class="dash-alert-banner-sub">퇴직금 정산내역서 발송 완료 — 클릭하여 퇴직급여 관리로 이동</div>
      </div>
      <div class="dash-alert-banner-arrow"><i class="fas fa-chevron-right"></i></div>
    </div>
    ${chips || moreLabel ? `<div class="dash-alert-banner-list">${chips}${moreLabel}</div>` : ''}
  </div>`;
}

function renderDraftAlerts(){
  const sec = document.getElementById('dash-draft-section');
  if(!sec) return;

  const draftCompanies = allCompanies.filter(c => !!c.is_draft);
  const draftContracts = allContracts.filter(c => !!c.is_draft);
  // 급여 임시저장: is_draft:true 레코드 (직원·연월 기준 최신 1건만 표시)
  const draftPayrolls  = (allPayrolls || []).filter(p => !!p.is_draft);
  const total = draftCompanies.length + draftContracts.length + draftPayrolls.length;

  if(total === 0){
    sec.style.display='none'; sec.innerHTML='';
    if(typeof updateMenuBadges === 'function') updateMenuBadges();
    return;
  }

  // 저장 시각 포맷 헬퍼
  function fmtDraftTime(ts){
    if(!ts) return '';
    const num = Number(ts);
    const d = isNaN(num) ? new Date(ts) : new Date(num);
    if(isNaN(d.getTime())) return '';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  // 고객사 행 HTML
  const companyRows = draftCompanies.map(c => {
    const savedAt = fmtDraftTime(c.draft_saved_at);
    return `<div class="draft-item-row" onclick="goDraftCompany('${c.id}')" title="클릭하여 이어 작성">
      <div class="draft-item-icon co"><i class="fas fa-building"></i></div>
      <div class="draft-item-name">${c.company_name || '(이름 없음)'}</div>
      <div class="draft-item-meta">${savedAt ? '임시저장 ' + savedAt : '임시저장'}</div>
      <div class="draft-item-action"><i class="fas fa-pencil-alt"></i> 이어 작성</div>
    </div>`;
  }).join('');

  // 계약서 행 HTML
  const contractRows = draftContracts.map(c => {
    const emp     = allEmployees.find(e => e.id === c.employee_id);
    const co      = allCompanies.find(x => x.id === c.company_id);
    const empName = emp ? emp.name : (c.note ? c.note.replace('[임시저장] 직원명: ','').split(' / ')[0] : '(직원 미지정)');
    const coName  = co ? co.company_name : '-';
    const savedAt = fmtDraftTime(c.draft_saved_at);
    return `<div class="draft-item-row" onclick="goDraftContract('${c.id}')" title="클릭하여 이어 작성">
      <div class="draft-item-icon ct"><i class="fas fa-file-contract"></i></div>
      <div class="draft-item-name">${empName}</div>
      <div class="draft-item-meta">${coName}${savedAt ? ' · ' + savedAt : ''}</div>
      <div class="draft-item-action"><i class="fas fa-pencil-alt"></i> 이어 작성</div>
    </div>`;
  }).join('');

  // 급여 임시저장 행 HTML — draft_saved_at 내림차순 정렬
  const sortedDraftPayrolls = [...draftPayrolls].sort((a, b) => {
    const ta = a.draft_saved_at ? new Date(a.draft_saved_at).getTime() : 0;
    const tb = b.draft_saved_at ? new Date(b.draft_saved_at).getTime() : 0;
    return tb - ta;
  });
  const payrollRows = sortedDraftPayrolls.map(p => {
    const emp    = allEmployees.find(e => e.id === p.employee_id);
    const co     = allCompanies.find(x => x.id === p.company_id);
    const empName= emp ? emp.name : '(직원 미지정)';
    const coName = co  ? (co.company_name || '-') : '-';
    const yrMo   = (p.pay_year && p.pay_month)
      ? `${p.pay_year}년 ${p.pay_month}월`
      : '';
    const netPay = p.net_pay
      ? Number(p.net_pay).toLocaleString('ko-KR') + '원'
      : '';
    const savedAt = fmtDraftTime(p.draft_saved_at);
    const noteSnip = p.note
      ? `<span class="pi-adb-row-note" title="${p.note.replace(/"/g,'&quot;')}">· ${p.note}</span>`
      : '';
    return `<div class="draft-item-row" onclick="goDraftPayroll('${p.id}')" title="${empName} ${yrMo} 임시저장 — 클릭하여 이어 입력">
      <div class="draft-item-icon pi"><i class="fas fa-file-invoice-dollar"></i></div>
      <div class="pi-adb-row-main">
        <div class="pi-adb-row-name">${empName}</div>
        <div class="pi-adb-row-meta">
          <span class="pi-adb-row-co">${coName}</span>
          ${yrMo   ? `<span class="pi-adb-row-yrmo">${yrMo}</span>` : ''}
          ${netPay ? `<span class="pi-adb-row-net">${netPay}</span>` : ''}
          ${noteSnip}
        </div>
      </div>
      <div class="pi-adb-row-right">
        ${savedAt ? `<span class="pi-adb-row-time">${savedAt} 저장</span>` : ''}
        <span class="pi-adb-row-action"><i class="fas fa-pencil-alt" style="font-size:10px;margin-right:3px;"></i>이어 입력</span>
      </div>
    </div>`;
  }).join('');

  // ── 아코디언 구분선 헬퍼 (앞 그룹이 있을 때만 구분선 표시) ──
  // 구분선 헬퍼 — 좌우 패딩 없이 전체 폭으로 가로지름 (날인본 카드와 동일 구조)
  function _grpDivider(hasPrev){
    return hasPrev
      ? 'border-top:1px solid #fde68a;margin-top:0;padding-top:0;'
      : '';
  }

  // 아코디언 그룹 — 고객사
  const coGroup = draftCompanies.length ? `
    <div class="dash-ac-group-row" style="padding:8px 20px;">
      <span class="dash-ac-group-label"><i class="fas fa-building" style="margin-right:5px;font-size:14px;color:#111827;"></i>고객사</span>
      <span class="dash-ac-group-badge co">${draftCompanies.length}건</span>
      <button class="dash-ac-toggle" onclick="toggleDashAccordion('draft-co-body',this,event)" title="펼치기/접기" style="background:rgba(245,158,11,.18);color:#92400e;margin-left:2px;">
        <i class="fas fa-chevron-down"></i>
      </button>
    </div>
    <div id="draft-co-body" class="dash-ac-body" style="padding:0 20px;">
      <div style="padding:12px 0 16px;">${companyRows}</div>
    </div>` : '';

  // 아코디언 그룹 — 근로계약서
  const ctGroup = draftContracts.length ? `
    <div class="dash-ac-group-row" style="padding:8px 20px;${draftCompanies.length ? 'border-top:1px solid #fde68a;' : ''}">
      <span class="dash-ac-group-label"><i class="fas fa-file-contract" style="margin-right:5px;font-size:14px;color:#111827;"></i>근로계약서</span>
      <span class="dash-ac-group-badge ct">${draftContracts.length}건</span>
      <button class="dash-ac-toggle" onclick="toggleDashAccordion('draft-ct-body',this,event)" title="펼치기/접기" style="background:rgba(99,102,241,.15);color:#3730a3;margin-left:2px;">
        <i class="fas fa-chevron-down"></i>
      </button>
    </div>
    <div id="draft-ct-body" class="dash-ac-body" style="padding:0 20px;">
      <div style="padding:12px 0 16px;">${contractRows}</div>
    </div>` : '';

  // 아코디언 그룹 — 급여 입력
  const hasPrevForPi = (draftCompanies.length + draftContracts.length) > 0;
  const piGroup = draftPayrolls.length ? `
    <div class="dash-ac-group-row" style="padding:8px 20px;${hasPrevForPi ? 'border-top:1px solid #fde68a;' : ''}">
      <span class="dash-ac-group-label"><i class="fas fa-file-invoice-dollar" style="margin-right:5px;font-size:14px;color:#111827;"></i>급여 입력</span>
      <span class="dash-ac-group-badge pi">${draftPayrolls.length}건</span>
      <button class="dash-ac-toggle" onclick="toggleDashAccordion('draft-pi-body',this,event)" title="펼치기/접기" style="background:rgba(22,163,74,.18);color:#15803d;margin-left:2px;">
        <i class="fas fa-chevron-down"></i>
      </button>
    </div>
    <div id="draft-pi-body" class="dash-ac-body" style="padding:0 20px;">
      <div style="padding:12px 0 16px;">${payrollRows}</div>
    </div>` : '';

  sec.style.display = 'block';
  sec.innerHTML = `
  <div class="dash-ac-card draft-alert-card">
    <div class="draft-alert-card-header">
      <div class="dash-ac-title draft-alert-title">
        <span class="pulse-dot"></span>
        임시저장 미완료 항목
      </div>
      <div class="dash-ac-badges">
        ${draftCompanies.length ? `<span class="dash-ac-badge" style="background:rgba(245,158,11,.15);border-color:#fde68a;color:#92400e;"><i class="fas fa-building" style="margin-right:4px;font-size:10px;"></i>고객사 ${draftCompanies.length}건</span>` : ''}
        ${draftContracts.length ? `<span class="dash-ac-badge" style="background:rgba(99,102,241,.12);border-color:#c7d2fe;color:#3730a3;"><i class="fas fa-file-contract" style="margin-right:4px;font-size:10px;"></i>계약서 ${draftContracts.length}건</span>` : ''}
        ${draftPayrolls.length  ? `<span class="dash-ac-badge" style="background:rgba(22,163,74,.1);border-color:#86efac;color:#15803d;"><i class="fas fa-file-invoice-dollar" style="margin-right:4px;font-size:10px;"></i>급여 ${draftPayrolls.length}건</span>` : ''}
      </div>
    </div>
    <div class="draft-alert-card-body">${coGroup}${ctGroup}${piGroup}</div>
  </div>`;
  // 메뉴 배지 + 고객사 관리 페이지 배너 동기화
  if(typeof updateMenuBadges === 'function') updateMenuBadges();
  if(typeof _renderCompaniesDraftBanner === 'function') _renderCompaniesDraftBanner();
}

// 계약서 날인본 미등록 알림 카드
/* ═════════════════════════════════════════════════════════════════
   _renderContractsBanners()
   근로 계약 관리 페이지 최상단 3개 배너
   ① 근로계약서 임시저장  ② 날인본 미등록  ③ 제3자동의서 미등록
   ═════════════════════════════════════════════════════════════════ */
function _renderContractsBanners(){
  // ── 공통 헬퍼 ──
  function fmtTime(ts){
    if(!ts) return '';
    const d = new Date(isNaN(Number(ts)) ? ts : Number(ts));
    if(isNaN(d.getTime())) return '';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} `
         + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function getEmpCo(c){
    const emp = allEmployees.find(e => e.id === c.employee_id);
    const co  = allCompanies.find(x => x.id === c.company_id);
    return {
      name  : emp ? emp.name : '(미지정)',
      phone : emp ? (emp.phone || '-') : '-',
      coName: co  ? (co.company_name || '-') : '-',
    };
  }

  // ── ① 임시저장 배너 ──
  (function(){
    const sec    = document.getElementById('contracts-draft-banner');
    if(!sec) return;
    const drafts = allContracts.filter(c => !!c.is_draft);
    if(!drafts.length){ sec.style.display='none'; sec.innerHTML=''; return; }

    const rows = drafts.map(c => {
      const {name, coName} = getEmpCo(c);
      const savedAt = fmtTime(c.draft_saved_at);
      return `<div class="draft-item-row" onclick="goDraftContract('${c.id}')" title="클릭하여 이어 작성">
        <div class="draft-item-icon ct"><i class="fas fa-file-contract"></i></div>
        <div class="draft-item-name">${name}</div>
        <div class="draft-item-meta" style="font-size:11.5px;color:#6b7280;">${coName}</div>
        <div class="draft-item-meta" style="font-size:11.5px;color:#92400e;white-space:nowrap;">${savedAt ? '임시저장 '+savedAt : '임시저장'}</div>
        <div style="font-size:11.5px;color:#d97706;white-space:nowrap;flex-shrink:0;"><i class="fas fa-pencil-alt"></i> 이어 작성</div>
      </div>`;
    }).join('');

    sec.style.display = '';
    sec.innerHTML = `
      <div class="dash-ac-card draft-alert-card">
        <div class="draft-alert-card-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="pulse-dot"></span>
            <span class="dash-ac-title draft-alert-title" style="font-size:13.5px;">근로계약서 임시저장 미완료</span>
            <span class="dash-ac-badge">${drafts.length}건</span>
          </div>
          <button class="dash-ac-toggle" onclick="toggleDashAccordion('ct-draft-body',this,event)"
                  style="background:#fde68a;color:#92400e;">
            <i class="fas fa-chevron-down"></i>
          </button>
        </div>
        <div id="ct-draft-body" class="dash-ac-body" style="padding:0 20px;"><div style="padding:16px 0;">${rows}</div></div>
      </div>`;
  })();

  // ── ② 날인본 미등록 배너 ──
  (function(){
    const sec     = document.getElementById('contracts-signed-banner');
    if(!sec) return;
    const missing = allContracts.filter(c =>
      !c.is_draft && (c.status === '활성' || c.status === '계약예정') && !c.signed_file_name
    );
    if(!missing.length){ sec.style.display='none'; sec.innerHTML=''; return; }

    const rows = missing.map(c => {
      const {name, phone, coName} = getEmpCo(c);
      return `<div class="signed-item-row" onclick="goDraftContract('${c.id}')" title="클릭하여 계약 편집">
        <div class="signed-item-icon"><i class="fas fa-file-contract"></i></div>
        <div class="signed-item-name">${name}</div>
        <div class="signed-item-meta">${coName}</div>
        <div class="signed-item-phone">${phone}</div>
      </div>`;
    }).join('');

    sec.style.display = '';
    sec.innerHTML = `
      <div class="dash-ac-card signed-alert-card">
        <div class="dash-ac-header" onclick="toggleDashAccordion('ct-signed-body',this.querySelector('.dash-ac-toggle'))">
          <div class="dash-ac-left">
            <div>
              <div class="dash-ac-title signed-alert-title">
                <span class="pulse-dot-indigo"></span>계약서 날인본 미등록
              </div>
              <div class="dash-ac-sub signed-alert-sub">근로계약서 날인본이 등록되지 않은 근로자가 있습니다.</div>
            </div>
          </div>
          <div class="dash-ac-badges"><span class="dash-ac-badge">${missing.length}건</span></div>
          <div class="dash-ac-toggle"><i class="fas fa-chevron-down"></i></div>
        </div>
        <div id="ct-signed-body" class="dash-ac-body" style="padding:0 20px;">
          <div style="padding:16px 0;">${rows}</div>
        </div>
      </div>`;
  })();

  // ── ③ 제3자 정보제공동의서 미등록 배너 ──
  (function(){
    const sec     = document.getElementById('contracts-consent-banner');
    if(!sec) return;
    const missing = allContracts.filter(c =>
      !c.is_draft && (c.status === '활성' || c.status === '계약예정') && !c.consent_file_name
    );
    if(!missing.length){ sec.style.display='none'; sec.innerHTML=''; return; }

    const rows = missing.map(c => {
      const {name, phone, coName} = getEmpCo(c);
      return `<div class="consent-item-row" onclick="goDraftContract('${c.id}')" title="클릭하여 계약 편집">
        <div class="consent-item-icon"><i class="fas fa-file-signature"></i></div>
        <div class="consent-item-name">${name}</div>
        <div class="consent-item-meta">${coName}</div>
        <div class="consent-item-phone">${phone}</div>
      </div>`;
    }).join('');

    sec.style.display = '';
    sec.innerHTML = `
      <div class="dash-ac-card consent-alert-card">
        <div class="dash-ac-header" onclick="toggleDashAccordion('ct-consent-body',this.querySelector('.dash-ac-toggle'))">
          <div class="dash-ac-left">
            <div>
              <div class="dash-ac-title consent-alert-title">
                <span class="pulse-dot-red"></span>제3자 정보제공동의서 미등록
              </div>
              <div class="dash-ac-sub consent-alert-sub">정보제공동의서가 등록되지 않은 근로자가 있습니다.</div>
            </div>
          </div>
          <div class="dash-ac-badges"><span class="dash-ac-badge">${missing.length}건</span></div>
          <div class="dash-ac-toggle"><i class="fas fa-chevron-down"></i></div>
        </div>
        <div id="ct-consent-body" class="dash-ac-body" style="padding:0 20px;">
          <div style="padding:16px 0;">${rows}</div>
        </div>
      </div>`;
  })();
}

function renderSignedAlerts(){
  const sec = document.getElementById('dash-signed-section');
  if(!sec) return;

  const missing = allContracts.filter(c =>
    !c.is_draft &&
    (c.status === '활성' || c.status === '계약예정') &&
    !c.signed_file_name
  );

  if(missing.length === 0){ sec.style.display='none'; sec.innerHTML=''; return; }

  const rows = missing.map(c => {
    const emp    = allEmployees.find(e => e.id === c.employee_id);
    const co     = allCompanies.find(x => x.id === c.company_id);
    const name   = emp ? emp.name : '(미지정)';
    const phone  = emp ? (emp.phone || '-') : '-';
    const coName = co ? (co.company_name || '-') : '-';
    return `<div class="signed-item-row" onclick="goDraftContract('${c.id}')" title="클릭하여 계약 편집">
      <div class="signed-item-icon"><i class="fas fa-file-contract"></i></div>
      <div class="signed-item-name">${name}</div>
      <div class="signed-item-meta">${coName}</div>
      <div class="signed-item-phone">${phone}</div>
    </div>`;
  }).join('');

  sec.style.display = 'block';
  sec.innerHTML = `
  <div class="dash-ac-card signed-alert-card">
    <div class="dash-ac-header" onclick="toggleDashAccordion('signed-main-body', this.querySelector('.dash-ac-toggle'))">
      <div class="dash-ac-left">
        <div>
          <div class="dash-ac-title signed-alert-title">
            <span class="pulse-dot-indigo"></span>
            계약서 날인본 미등록
          </div>
          <div class="dash-ac-sub signed-alert-sub">근로계약서 날인본이 등록되지 않은 근로자가 있습니다.</div>
        </div>
      </div>
      <div class="dash-ac-badges">
        <span class="dash-ac-badge">${missing.length}건</span>
      </div>
      <div class="dash-ac-toggle"><i class="fas fa-chevron-down"></i></div>
    </div>
    <div id="signed-main-body" class="dash-ac-body" style="padding:0 20px;">
    <div style="padding:16px 0;">${rows}</div>
  </div>
  </div>`;
  if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
}

// 제3자 정보제공동의서 미등록 알림 카드
function renderConsentAlerts(){
  const sec = document.getElementById('dash-consent-section');
  if(!sec) return;

  const missing = allContracts.filter(c =>
    !c.is_draft &&
    (c.status === '활성' || c.status === '계약예정') &&
    !c.consent_file_name
  );

  if(missing.length === 0){ sec.style.display='none'; sec.innerHTML=''; return; }

  const rows = missing.map(c => {
    const emp    = allEmployees.find(e => e.id === c.employee_id);
    const co     = allCompanies.find(x => x.id === c.company_id);
    const name   = emp ? emp.name : '(미지정)';
    const phone  = emp ? (emp.phone || '-') : '-';
    const coName = co ? (co.company_name || '-') : '-';
    return `<div class="consent-item-row" onclick="goDraftContract('${c.id}')" title="클릭하여 계약 편집">
      <div class="consent-item-icon"><i class="fas fa-file-signature"></i></div>
      <div class="consent-item-name">${name}</div>
      <div class="consent-item-meta">${coName}</div>
      <div class="consent-item-phone">${phone}</div>
    </div>`;
  }).join('');

  sec.style.display = 'block';
  sec.innerHTML = `
  <div class="dash-ac-card consent-alert-card">
    <div class="dash-ac-header" onclick="toggleDashAccordion('consent-main-body', this.querySelector('.dash-ac-toggle'))">
      <div class="dash-ac-left">
        <div>
          <div class="dash-ac-title consent-alert-title">
            <span class="pulse-dot-red"></span>
            제3자 정보제공동의서 미등록
          </div>
          <div class="dash-ac-sub consent-alert-sub">정보제공동의서가 등록되지 않은 근로자가 있습니다.</div>
        </div>
      </div>
      <div class="dash-ac-badges">
        <span class="dash-ac-badge">${missing.length}건</span>
      </div>
      <div class="dash-ac-toggle"><i class="fas fa-chevron-down"></i></div>
    </div>
    <div id="consent-main-body" class="dash-ac-body" style="padding:0 20px;">
    <div style="padding:16px 0;">${rows}</div>
  </div>
  </div>`;
  if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
}

// ─── 대시보드 알림 카드 아코디언 토글 ───
function toggleDashAccordion(bodyId, toggleBtn, event){
  if(event) event.stopPropagation();
  const body = document.getElementById(bodyId);
  if(!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  // 토글 버튼 화살표 회전
  const btn = (toggleBtn instanceof Element) ? toggleBtn
            : (typeof toggleBtn === 'string') ? document.getElementById(toggleBtn)
            : null;
  if(btn){
    const icon = btn.querySelector('i');
    if(icon){
      icon.style.transition = 'transform .25s';
      icon.style.transform  = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
  }
}

// draft 고객사 → 고객사 관리 페이지로 이동 후 모달 열기
function goDraftCompany(id){
  showPage('companies', document.querySelector('.menu-item[data-page="companies"]'));
  const sf = document.getElementById('company-status-filter');
  if(sf){ sf.value='임시저장'; }
  renderCompanies();
  setTimeout(()=>openCompanyModal(id), 200);
}

// draft 계약서 → 근로계약 관리 페이지로 이동 후 모달 열기
function goDraftContract(id){
  const c = allContracts.find(x=>x.id===id);
  if(!c) return;
  if(c.company_id){
    const co = allCompanies.find(x=>x.id===c.company_id);
    if(co) goContractsByCompany(c.company_id, co.company_name);
  }
  showPage('contracts', document.querySelector('.menu-item[data-page="contracts"]'));
  setTimeout(()=>editContract(id), 300);
}

// ── 급여 임시저장 → 급여 입력 페이지로 이동 후 해당 직원·연월 세팅 + 임시저장 복원 ──
function goDraftPayroll(draftId){
  const p = (allPayrolls||[]).find(x => x.id === draftId);
  if(!p){ toast('임시저장 데이터를 찾을 수 없습니다.', 'error'); return; }

  const piMenuItem = document.querySelector('[data-page="payroll-input"]');
  showPage('payroll-input', piMenuItem);

  // 고객사 칩 UI 전환
  const co = allCompanies.find(x => x.id === p.company_id);
  if(co){
    const card = document.getElementById('pi-company-select-card');
    const sec  = document.getElementById('pi-input-section');
    const lbl  = document.getElementById('pi-selected-company-label');
    if(card) card.style.display = 'none';
    if(sec)  sec.style.display  = '';
    if(lbl)  lbl.textContent    = co.company_name + ' 급여 입력';
    // 대상자 목록 숨기고 폼 섹션 표시 (임시저장 직접 진입)
    const targetSec = document.getElementById('pi-target-list-section');
    if(targetSec) targetSec.style.display = 'none';
    const formSec = document.getElementById('pi-form-section');
    if(formSec) formSec.style.display = '';
    // 직원 헤더 업데이트
    const emp = allEmployees.find(e => e.id === p.employee_id);
    const nameEl  = document.getElementById('pi-form-emp-name');
    const badgeEl = document.getElementById('pi-form-emp-badge');
    if(nameEl && emp) nameEl.textContent = `${emp.name} (${p.pay_year}년 ${p.pay_month}월) — 임시저장 복원`;
    if(badgeEl) badgeEl.textContent = '';
    // 글로벌 고객사 동기화
    currentGlobalCompanyId   = p.company_id;
    currentGlobalCompanyName = co.company_name;
  }

  // 숨김 select 동기화 → 직원 목록 로드
  const coSel = document.getElementById('pi-company');
  if(coSel){ coSel.value = p.company_id; loadPIEmployees(); }

  // 직원 선택
  const empSel = document.getElementById('pi-employee');
  if(empSel){ empSel.value = p.employee_id; }

  // 연월 설정
  const yrEl = document.getElementById('pi-year');
  const moEl = document.getElementById('pi-month');
  if(yrEl) yrEl.value = p.pay_year;
  if(moEl) moEl.value = p.pay_month;

  // 신규 입력 모드 보장 (수정 배너 숨김)
  piEditPayrollId = null;
  const editBanner = document.getElementById('pi-edit-banner');
  if(editBanner) editBanner.style.display = 'none';

  // piDraftId 를 미리 세팅한 뒤 loadPIContract 및 복원 실행
  piDraftId = draftId;

  // 계약 로드 후 폼 복원 (loadPIContract 내부가 async이므로 약간 지연 후 실행)
  loadPIContract();
  setTimeout(() => {
    // _checkAndShowPIDraftBanner 가 내부에서 배너를 띄우지만,
    // 여기서는 바로 loadPIDraft() 를 호출해 폼에 값을 채운다.
    loadPIDraft();
  }, 400);

  // 스크롤 상단
  document.getElementById('page-payroll-input')?.scrollTo(0, 0);
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════════════════════════════════════
// renderPIAllDraftBanner()
//   급여 입력 페이지 최상단의 "전체 임시저장 목록" 배너를 렌더링한다.
//   선택된 고객사·직원과 무관하게 allPayrolls 내 is_draft:true 전건을 표시.
//   건수 0이면 배너 숨김.
// ══════════════════════════════════════════════════════════════════════════════
function renderPIAllDraftBanner(){
  const banner   = document.getElementById('pi-all-draft-banner');
  const countEl  = document.getElementById('pi-all-draft-count');
  const listEl   = document.getElementById('pi-all-draft-list');
  if(!banner || !countEl || !listEl) return;

  // ── heavy 데이터 미준비: 로딩 스켈레톤 표시 후 대기 ──
  const _heavyReady = typeof _heavyDataReady !== 'undefined' && _heavyDataReady;
  if(!_heavyReady){
    banner.classList.add('visible');
    banner.style.display = 'block';
    countEl.textContent  = '…';
    listEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 4px;font-size:12.5px;color:#6b7280;">
        <div style="width:16px;height:16px;border:2px solid #bbf7d0;border-top-color:#16a34a;border-radius:50%;animation:tblSpin .7s linear infinite;flex-shrink:0;"></div>
        임시저장 목록 불러오는 중…
      </div>`;
    // 아코디언 상태 유지 (강제 열기 없음 — 닫힘 기본값 보존)
    return;
  }

  const drafts = (allPayrolls||[])
    .filter(p => !!p.is_draft)
    .sort((a, b) => {                                        // 최신 저장순
      const ta = a.draft_saved_at ? new Date(a.draft_saved_at).getTime() : 0;
      const tb = b.draft_saved_at ? new Date(b.draft_saved_at).getTime() : 0;
      return tb - ta;
    });

  if(!drafts.length){
    banner.classList.remove('visible');
    banner.style.display = 'none';
    return;
  }

  // 저장 시각 포맷 헬퍼
  function _fmt(ts){
    if(!ts) return '';
    const d = new Date(ts);
    if(isNaN(d.getTime())) return '';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} `
         + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  countEl.textContent = drafts.length;

  // 아코디언: 기본값 닫힘 — 사용자가 직접 열기 전까지 접혀 있음
  // (열린 상태는 사용자 클릭으로만 진입; 렌더링 시 상태 변경하지 않음)

  listEl.innerHTML = drafts.map(p => {
    const emp    = (allEmployees||[]).find(e => e.id === p.employee_id);
    const co     = (allCompanies||[]).find(x => x.id === p.company_id);
    const empName= emp ? emp.name : '(직원 미지정)';
    const coName = co  ? (co.company_name || '-') : '-';
    const yrMo   = (p.pay_year && p.pay_month) ? `${p.pay_year}년 ${p.pay_month}월` : '';
    const netPay = p.net_pay   ? Number(p.net_pay).toLocaleString('ko-KR') + '원' : '';
    const savedAt= _fmt(p.draft_saved_at);
    const noteHtml = p.note
      ? `<span class="pi-adb-row-note" title="${p.note.replace(/"/g,'&quot;')}">· ${p.note}</span>`
      : '';
    return `
    <div class="pi-adb-row" onclick="goDraftPayroll('${p.id}')" title="${empName} ${yrMo} 임시저장 — 클릭하여 이어 입력">
      <div class="pi-adb-row-icon"><i class="fas fa-file-invoice-dollar"></i></div>
      <div class="pi-adb-row-main">
        <div class="pi-adb-row-name">${empName}</div>
        <div class="pi-adb-row-meta">
          <span class="pi-adb-row-co">${coName}</span>
          ${yrMo   ? `<span class="pi-adb-row-yrmo">${yrMo}</span>` : ''}
          ${netPay ? `<span class="pi-adb-row-net">${netPay}</span>` : ''}
          ${noteHtml}
        </div>
      </div>
      <div class="pi-adb-row-right">
        ${savedAt ? `<span class="pi-adb-row-time">${savedAt} 저장</span>` : ''}
        <span class="pi-adb-row-action"><i class="fas fa-pencil-alt" style="font-size:10px;margin-right:3px;"></i>이어 입력</span>
      </div>
    </div>`;
  }).join('');

  banner.classList.add('visible');
  banner.style.display = 'block';
}

// ── pi-all-draft-banner 아코디언 토글 ──
function togglePIAllDraftBanner(headerEl){
  const body    = document.getElementById('pi-all-draft-body');
  const chevron = document.querySelector('#pi-all-draft-banner .pi-adb-chevron i');
  if(!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if(chevron){
    chevron.style.transition = 'transform .25s';
    chevron.style.transform  = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  }
}

function renderDashboard(){
  // 임시저장 알림 카드 (최우선 렌더)
  renderDraftAlerts();
  // 계약서 날인본 미등록 알림 카드
  renderSignedAlerts();
  // 제3자 정보제공동의서 미등록 알림 카드
  renderConsentAlerts();
  // 계약만료 통지 대상 배너 (임시저장 위)
  renderDashExpiryBanner();
  // 수습 만료 통지 대상 배너 (계약만료 ~ 정규직 전환 사이)
  renderDashProbationBanner();
  // 정규직 전환 의무 대상 배너 (임시저장 위)
  renderDashRegularBanner();
  // 퇴직금 지급 이력 배너 (임시저장 위)
  renderDashSeveranceBanner();

  const activeCompanyCount=allCompanies.filter(c=>!c.is_draft && c.status==='이용중').length;

  // 이용중 고객사 건수 뱃지 업데이트
  const activeCountEl = document.getElementById('active-count');
  if(activeCountEl) activeCountEl.textContent=`(${activeCompanyCount})`;

  // 고객사 목록 렌더링
  renderDashboardCompanies();

  // [사용료 숨김] 이번달 사용료 요약 카드 + 매출추이 차트 - 원복 시 아래 주석 해제
  // renderDashBillingCards();
  // renderBillingTrendChart();

  // 월별 고객사 수 변동 추이 차트
  renderCompanyTrendChart();
  // 월별 관리대상 직원 수 변동 추이 차트
  renderEmployeeTrendChart();
}

/* [사용료 숨김] renderDashBillingCards 함수 전체 - 원복 시 아래 주석 해제
function renderDashBillingCards(){
  // 급여·청구 데이터 미준비 시 로딩 표시
  if(!_heavyDataReady){
    ['dash-bill-total','dash-bill-paid','dash-bill-pending','dash-bill-unpaid'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.innerHTML = '<span style="font-size:12px;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="margin-right:4px;"></i>로딩 중</span>';
    });
    ['dash-bill-count','dash-bill-paid-count','dash-bill-pending-count','dash-bill-unpaid-count'].forEach(id=>{
      const el = document.getElementById(id); if(el) el.textContent = '';
    });
    return;
  }
  const now    = new Date();
  const yr     = now.getFullYear();
  const mo     = now.getMonth() + 1;
  const today  = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

  // 섹션 타이틀 동적 업데이트
  const titleEl = document.getElementById('dash-billing-section-title');
  if(titleEl) titleEl.textContent = `${yr}년 ${mo}월 사용료 징수현황`;

  // 이번달 실제 청구 건
  const thisMonthBillings = allBillings.filter(b =>
    Number(b.billing_year) === yr && Number(b.billing_month) === mo
  );

  // ── 청구 총액 ──
  const totalAmount = thisMonthBillings.reduce((s, b) => s + (b.total_amount || 0), 0);

  // ── 납부 총액: partial_paid_amount 합산 ──
  const totalPaid = thisMonthBillings.reduce((s, b) => s + (b.partial_paid_amount || 0), 0);
  // 완납 건수 (payment_status === '완납' 또는 잔액 0)
  const paidCount = thisMonthBillings.filter(b => {
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    return b.payment_status === '완납' || rem <= 0;
  }).length;

  // ── 납부대기 총액: 이번달 청구 중 완납 아니고 잔액 있으며 마감일 미경과인 건 ──
  const pendingBillings = thisMonthBillings.filter(b => {
    if(b.payment_status === '완납') return false;
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    if(rem <= 0) return false;
    // 마감일이 없거나 아직 안 지난 건만 납부대기
    return !b.due_date || b.due_date >= today;
  });
  const totalPending = pendingBillings.reduce((s, b) =>
    s + ((b.total_amount || 0) - (b.partial_paid_amount || 0)), 0);

  // ── 누적 미납금: 전체 청구(모든 월) 중 마감일이 지났는데도 잔액이 남은 건 합산 ──
  const overdueBillings = allBillings.filter(b => {
    if(b.payment_status === '완납') return false;
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    if(rem <= 0) return false;
    // 마감일이 존재하고 이미 경과한 건만 미납금
    return b.due_date && b.due_date < today;
  });
  const totalUnpaid = overdueBillings.reduce((s, b) =>
    s + ((b.total_amount || 0) - (b.partial_paid_amount || 0)), 0);

  // ── DOM 업데이트 ──
  document.getElementById('dash-bill-total').textContent         = Math.round(totalAmount).toLocaleString('ko-KR') + '원';
  document.getElementById('dash-bill-count').textContent         = `청구 ${thisMonthBillings.length}건`;
  document.getElementById('dash-bill-paid').textContent          = Math.round(totalPaid).toLocaleString('ko-KR') + '원';
  document.getElementById('dash-bill-paid-count').textContent    = `완납 ${paidCount}건`;
  document.getElementById('dash-bill-pending').textContent       = Math.round(totalPending).toLocaleString('ko-KR') + '원';
  document.getElementById('dash-bill-pending-count').textContent = `대기 ${pendingBillings.length}건`;
  document.getElementById('dash-bill-unpaid').textContent        = Math.round(totalUnpaid).toLocaleString('ko-KR') + '원';
  document.getElementById('dash-bill-unpaid-count').textContent  = `미결제 ${overdueBillings.length}건`;

  // 누적 미납금 있으면 카드 배경 강조
  const unpaidCard = document.querySelector('#dash-billing-cards .stat-card:last-child');
  if(unpaidCard){
    unpaidCard.style.background = totalUnpaid > 0
      ? 'linear-gradient(135deg,#fff5f5,#fff)' : '#fff';
  }
}
*/ // [사용료 숨김] renderDashBillingCards 끝

// ─── 월별 고객사 수 변동 추이 차트 ───
let companyTrendChartInstance = null;

function renderCompanyTrendChart(){
  const rangeEl = document.getElementById('dash-chart-range');
  const months = rangeEl ? parseInt(rangeEl.value) : 12;

  const now = new Date();
  const labels = [];
  const activeData = [];  // 해당 월 급여가 입력된 고객사 수
  const totalData = [];   // 누적 전체 고객사 수

  for(let i = months - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    labels.push(`${yr}.${String(mo).padStart(2,'0')}`);

    // 해당 월에 급여 데이터가 1건 이상 있는 고객사 수 (이용중·해지 무관, 당시 실제 이용 기준)
    const totalCount = new Set(
      allPayrolls
        .filter(p => Number(p.pay_year) === yr && Number(p.pay_month) === mo)
        .map(p => p.company_id)
    ).size;

    activeData.push(totalCount);
    totalData.push(totalCount);
  }

  const ctx = document.getElementById('company-trend-chart');
  if(!ctx) return;

  // 기존 차트 인스턴스 제거
  if(companyTrendChartInstance){
    companyTrendChartInstance.destroy();
    companyTrendChartInstance = null;
  }

  companyTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '급여 입력 고객사',
          data: activeData,
          borderColor: '#e94560',
          backgroundColor: 'rgba(233,69,96,0.08)',
          pointBackgroundColor: '#e94560',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 4,
            useBorderRadius: true,
            font: { size: 12, family: "'Noto Sans KR', sans-serif" },
            color: '#555'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26,26,46,0.92)',
          titleColor: '#fff',
          bodyColor: '#ddd',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          bodyFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          callbacks: {
            label: function(ctx){
              return ` ${ctx.dataset.label}: ${ctx.parsed.y}개`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            maxRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          grace: 1,
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            stepSize: 1,
            precision: 0,
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            callback: function(val){ return val + '개'; }
          }
        }
      }
    }
  });
}

// ─── 월별 관리대상 직원 수 변동 추이 차트 ───
let employeeTrendChartInstance = null;

function renderEmployeeTrendChart(){
  const rangeEl = document.getElementById('dash-chart-range');
  const months = rangeEl ? parseInt(rangeEl.value) : 12;

  const now = new Date();
  const labels = [];
  const managedData = [];  // 이용중 고객사에서 해당 월 급여가 입력된 직원 수

  // 이용중 고객사 ID 목록 (현재 기준)
  const activeCompanyIds = new Set(
    allCompanies.filter(c => c.status === '이용중').map(c => c.id)
  );

  for(let i = months - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    labels.push(`${yr}.${String(mo).padStart(2,'0')}`);

    // 해당 월에 급여가 입력된 직원 중 이용중 고객사 소속 직원 수
    // → 급여 데이터가 실제 근무/관리의 가장 정확한 기록
    const managedSet = new Set(
      allPayrolls
        .filter(p =>
          Number(p.pay_year) === yr &&
          Number(p.pay_month) === mo &&
          activeCompanyIds.has(p.company_id)
        )
        .map(p => p.employee_id)
    );

    managedData.push(managedSet.size);
  }

  const ctx = document.getElementById('employee-trend-chart');
  if(!ctx) return;

  if(employeeTrendChartInstance){
    employeeTrendChartInstance.destroy();
    employeeTrendChartInstance = null;
  }

  // 최대값 기반 y축 범위
  const maxVal = Math.max(...managedData, 1);

  employeeTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '관리대상 직원',
          data: managedData,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139,92,246,0.10)',
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12, boxHeight: 12,
            borderRadius: 4, useBorderRadius: true,
            font: { size: 12, family: "'Noto Sans KR', sans-serif" },
            color: '#555'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26,26,46,0.92)',
          titleColor: '#fff',
          bodyColor: '#ddd',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          bodyFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}명`,
            afterBody: (items) => {
              const idx = items[0]?.dataIndex;
              if(idx === undefined) return '';
              // 해당 월의 전월 대비 증감
              const cur = managedData[idx];
              const prev = idx > 0 ? managedData[idx - 1] : null;
              if(prev === null) return '';
              const diff = cur - prev;
              if(diff === 0) return '  전월 대비 변동 없음';
              return diff > 0 ? `  전월 대비 +${diff}명 증가` : `  전월 대비 ${diff}명 감소`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            maxRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          grace: Math.max(1, Math.ceil(maxVal * 0.1)),
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            precision: 0,
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            callback: val => val + '명'
          }
        }
      }
    }
  });
}

// ─── 사용료 매출 추이 차트 ───
let billingTrendChartInstance = null;

/* [사용료 숨김] renderBillingTrendChart 함수 전체 - 원복 시 아래 주석 해제
function renderBillingTrendChart(){
  if(!_heavyDataReady) return; // 급여·청구 데이터 미준비 시 skip
  const rangeEl = document.getElementById('billing-trend-range');
  const months = rangeEl ? parseInt(rangeEl.value) : 12;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const labels = [];
  const billedData  = [];  // 총 청구금액
  const paidData    = [];  // 납부 총액
  const unpaidData  = [];  // 누적 미납금 (마감일 경과)
  const lossData    = [];  // 손실 처리금

  for(let i = months - 1; i >= 0; i--){
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    labels.push(`${yr}.${String(mo).padStart(2,'0')}`);

    // 해당 월 말일 (누적 미납금 기준점)
    const lastDayOfMonth = new Date(yr, mo, 0).toISOString().slice(0, 10);

    // 해당 월 청구 건
    const monthBillings = allBillings.filter(b =>
      Number(b.billing_year) === yr && Number(b.billing_month) === mo
    );

    // 총 청구금액 (해당 월 청구 합계)
    const totalBilled = monthBillings.reduce((s, b) => s + (b.total_amount || 0), 0);

    // 납부 총액 (해당 월 청구 건의 partial_paid_amount 합산)
    const totalPaid = monthBillings.reduce((s, b) => s + (b.partial_paid_amount || 0), 0);

    // 누적 미납금: 해당 월까지 발생한 모든 청구 중
    // 마감일이 해당 월 말일 이하이고 잔액이 남아있는 건의 합계
    const totalUnpaid = allBillings.reduce((s, b) => {
      if(b.payment_status === '완납') return s;
      const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
      if(rem <= 0) return s;
      // 청구월이 해당 월 이하인 건만
      const bYM = Number(b.billing_year) * 100 + Number(b.billing_month);
      const tYM = yr * 100 + mo;
      if(bYM > tYM) return s;
      // 마감일이 해당 월 말일 이전인 건만 (마감일 없으면 제외)
      if(!b.due_date || b.due_date > lastDayOfMonth) return s;
      return s + rem;
    }, 0);

    // 손실 처리금: 해당 월에 loss_date가 기록된 billing 건의 loss_amount 합산
    const totalLoss = allBillings.reduce((s, b) => {
      if(!b.loss_date || !b.loss_amount) return s;
      const ld = b.loss_date.slice(0, 7); // "YYYY-MM"
      const label = `${yr}.${String(mo).padStart(2,'0')}`;
      if(ld !== `${yr}-${String(mo).padStart(2,'0')}`) return s;
      return s + (b.loss_amount || 0);
    }, 0);

    billedData.push(totalBilled);
    paidData.push(totalPaid);
    unpaidData.push(totalUnpaid);
    lossData.push(totalLoss);
  }

  const ctx = document.getElementById('billing-trend-chart');
  if(!ctx) return;

  if(billingTrendChartInstance){
    billingTrendChartInstance.destroy();
    billingTrendChartInstance = null;
  }

  const maxVal = Math.max(...billedData, ...lossData, 1);

  billingTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '총 청구금액',
          data: billedData,
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          fill: false,
          tension: 0.35,
          order: 1
        },
        {
          label: '납부 총액',
          data: paidData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.15)',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          order: 2
        },
        {
          label: '누적 미납금',
          data: unpaidData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.12)',
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          order: 3
        },
        {
          label: '손실 처리금',
          data: lossData,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.13)',
          pointBackgroundColor: '#7c3aed',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          borderDash: [5,3],
          fill: true,
          tension: 0.35,
          order: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12, boxHeight: 12,
            borderRadius: 4, useBorderRadius: true,
            font: { size: 12, family: "'Noto Sans KR', sans-serif" },
            color: '#555'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26,26,46,0.92)',
          titleColor: '#fff',
          bodyColor: '#ddd',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          bodyFont: { size: 12, family: "'Noto Sans KR', sans-serif" },
          callbacks: {
            label: item => ` ${item.dataset.label}: ${Math.round(item.parsed.y).toLocaleString('ko-KR')}원`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            maxRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          grace: Math.ceil(maxVal * 0.1),
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            font: { size: 11, family: "'Noto Sans KR', sans-serif" },
            color: '#999',
            callback: val => {
              if(val >= 1000000) return (val / 1000000).toFixed(1) + '백만';
              if(val >= 10000)   return (val / 10000).toFixed(0) + '만';
              return Math.round(val).toLocaleString('ko-KR');
            }
          }
        }
      }
    }
  });
}
*/ // [사용료 숨김] renderBillingTrendChart 끝

function goCompaniesWithFilter(status){
  const sf=document.getElementById('company-status-filter');
  if(sf) sf.value=status||'';
  showPage('companies',document.querySelector('.menu-item[data-page="companies"]'));
  renderCompanies();
}

// ── 대시보드 고객사 테이블 행 HTML 생성 ──
function _buildDashCompanyRow(c){
  const now = new Date();
  const cYear = now.getFullYear();
  const cMonth = now.getMonth() + 1;
  // 유효계약 근로자 (활성·계약예정, is_draft=false)
  const validContracts = allContracts.filter(ct =>
    ct.company_id === c.id && !ct.is_draft &&
    (ct.status === '활성' || ct.status === '계약예정')
  );
  const validEmpIds = [...new Set(validContracts.map(ct => ct.employee_id))];
  const totalValid  = validEmpIds.length;
  // 이번 달 급여 입력된 직원
  const inputtedEmpIds = new Set(
    allPayrolls
      .filter(p => p.company_id === c.id && p.pay_year == cYear && p.pay_month == cMonth)
      .map(p => p.employee_id)
  );
  const inputtedCnt = validEmpIds.filter(id => inputtedEmpIds.has(id)).length;
  const pendingCnt  = totalValid - inputtedCnt;
  const payDay = c.pay_day ? `매월 ${c.pay_day}일` : '-';
  const safeId   = c.id.replace(/'/g, "\\'");
  let statusCell;
  if(pendingCnt > 0){
    statusCell = `<span class="dash-co-pending"><i class="fas fa-exclamation-circle" style="font-size:11px;margin-right:3px;"></i>${pendingCnt}명 미입력</span>`;
  } else if(totalValid === 0){
    statusCell = `<span style="font-size:12px;color:#9ca3af;">유효계약 없음</span>`;
  } else {
    statusCell = `<span class="dash-co-done"><i class="fas fa-check-circle" style="font-size:11px;margin-right:3px;"></i>총 ${inputtedCnt}건 / ${totalValid}명 입력완료</span>`;
  }
  const btnClass = pendingCnt > 0 ? 'dash-co-btn-input' : 'dash-co-btn-edit';
  const btnLabel = pendingCnt > 0
    ? `<i class="fas fa-plus-circle"></i> 급여 입력`
    : `<i class="fas fa-edit"></i> 수정`;
  return `<tr>
    <td><span class="dash-co-name" title="${c.company_name}">${c.company_name}</span></td>
    <td><span class="dash-co-payday">${payDay}</span></td>
    <td>${statusCell}</td>
    <td><button class="dash-co-btn ${btnClass}" onclick="openPayrollInputModal('${safeId}')">${btnLabel}</button></td>
  </tr>`;
}

function renderDashboardCompanies(){
  // 이용중 고객사만 표시
  const searchInput=document.getElementById('dash-company-search');
  const searchTerm=searchInput?searchInput.value.toLowerCase().trim():'';

  let companies=allCompanies.filter(c=>!c.is_draft && c.status==='이용중');

  if(searchTerm){
    companies=companies.filter(c=>(c.company_name||'').toLowerCase().includes(searchTerm));
  }

  const today = new Date().getDate(); // 오늘 일자 (1~31)
  companies.sort((a,b)=>{
    const da = parseInt(a.pay_day)||0;
    const db = parseInt(b.pay_day)||0;
    // 급여일이 없는 경우 맨 뒤로
    if(!da && !db) return (a.company_name||'').localeCompare(b.company_name||'','ko');
    if(!da) return 1;
    if(!db) return -1;
    // 오늘 기준으로 "앞으로 며칠 후"인지 계산 (순환: 이미 지난 날은 다음달로)
    const diffA = da >= today ? da - today : da + 31 - today;
    const diffB = db >= today ? db - today : db + 31 - today;
    return diffA - diffB;
  });

  const wrap=document.getElementById('dash-companies');
  if(!wrap) return;

  if(companies.length===0){
    const msg=searchTerm?`"${searchTerm}" 검색 결과가 없습니다`:'이용중인 고객사가 없습니다';
    wrap.innerHTML=`<div class="empty-state" style="padding:24px 0;"><i class="fas fa-building"></i><p>${msg}</p></div>`;
    return;
  }

  const rows=companies.map(c=>_buildDashCompanyRow(c)).join('');
  wrap.innerHTML=`
    <table class="dash-co-table">
      <thead>
        <tr>
          <th>고객사명</th>
          <th>급여일</th>
          <th>이번 달 급여 현황</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
