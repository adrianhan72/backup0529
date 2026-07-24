// ─── DASHBOARD ───


// ── 대시보드 임시저장 알림 카드 ──
/* ── 대시보드 할일 그리드 표시/숨김 ── */
function _updateDashTodoGrid(){
  const grid = document.querySelector('.dash-todo-grid');
  const todoSec = document.getElementById('dash-todo-section');
  if(!grid || !todoSec) return;
  const ids = ['dash-contract-unsent-section','dash-consent-section','dash-unsent-section',
               'dash-probation-banner'];
  const anyVisible = ids.some(id => {
    const el = document.getElementById(id);
    return el && el.style.display !== 'none' && el.innerHTML.trim().length > 0;
  });
  grid.style.display = anyVisible ? '' : 'none';
  todoSec.style.display = anyVisible ? '' : 'none';
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
    if(c.contract_type !==CONTRACT_TYPE.REGULAR_PROBATION && c.contract_type !==CONTRACT_TYPE.FIXED_PROBATION) return;
    // 임시저장·파기·취소된 계약 제외
    if(c.is_draft) return;
    if([CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.TERMINATED, CONTRACT_STATUS.CANCELED, CONTRACT_STATUS.EXPIRED].includes(c.status)) return;
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
    if(c.contract_type !==CONTRACT_TYPE.REGULAR_PROBATION && c.contract_type !==CONTRACT_TYPE.FIXED_PROBATION) return;
    if(c.is_draft) return;
    if([CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.TERMINATED, CONTRACT_STATUS.CANCELED, CONTRACT_STATUS.EXPIRED].includes(c.status)) return;
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
  const noticTargets = targets.filter(t => t.probMonths > 3 && t.daysLeft >= 30);
  const urgentAll = targets.filter(t => t.probMonths > 3 && t.daysLeft < 30);
  const total = noticTargets.length + urgentAll.length;
  const inactive = total === 0;

  sec.style.display = '';
  sec.innerHTML = `
  <div class="dash-alert-banner probation${inactive ? ' inactive' : ''}"
       ${inactive ? '' : `onclick="showPage('probation-mgmt', document.querySelector('.menu-item[data-page=\\'probation-mgmt\\']'))"`}>
    <div class="dash-alert-banner-head">
      <div class="dash-alert-banner-icon" style="background:${inactive ? '#d1d5db' : ''};">
        <i class="fas fa-user-clock"></i>
      </div>
      <div class="dash-alert-banner-body">
        <div class="dash-alert-banner-title${inactive ? ' inactive' : ''}">
          관리가 필요한 수습 근로자
          <span class="dash-alert-banner-count" style="color:${inactive ? '#9ca3af' : ''};">${total}명</span>
        </div>
        <div class="dash-alert-banner-sub" style="color:${inactive ? '#9ca3af' : ''};">${inactive ? '수습기간 3개월 초과 근로자가 없습니다' : '수습기간 3개월 초과 근로자 해고 시 30일 전 서면 통지 의무'}</div>
      </div>
      ${inactive ? '' : '<div class="dash-alert-banner-arrow"><i class="fas fa-chevron-right"></i></div>'}
    </div>
  </div>`;
  _updateDashTodoGrid();
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
let _rcContact              = null; // 대표 연락처 캐시

function renderProbMgmtCompanyList(){
  const chips = document.getElementById('probmgmt-company-chips');
  if(!chips) return;
  const q = (document.getElementById('probmgmt-company-search')?.value || '').toLowerCase();

  // 수습 중인 직원이 있는 고객사 전체 추출 (45일 통지 제한 없음)
  const allTargets = _getProbationAllTargets();
  const coIds = [...new Set(allTargets.map(t => t.contract.company_id))];

  let filtered = allCompanies.filter(c =>
    coIds.includes(c.id) && isCompanyActive(c) && (!q || c.company_name.toLowerCase().includes(q))
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
      ? `<span class="count-badge">${noticeCnt}</span>`
      : '';
    const severBadge    = severCnt > 0
      ? `<span class="count-badge">${severCnt}</span>`
      : '';
    const defaultBadge  = (!noticeCnt && !severCnt && coTargets.length > 0)
      ? `<span class="count-badge">${coTargets.length}</span>`
      : '';
    return `<button class="probmgmt-co-chip${isSelected?' selected':''}"
      onclick="selectProbMgmtCompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}')">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
      ${noticeBadge}${severBadge}${defaultBadge}
    </button>`;
  }).join('');
}

async function selectProbMgmtCompany(coId, coName){
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
  // 대표 연락처 로드
  if(!_rcContact) { try { _rcContact = await getRepresentativeContact(); } catch(e) { _rcContact = {}; } }
  renderProbationMgmtTable();
  renderProbMgmtTemplate();
  renderProbMgmtCompanyList(); // 칩 선택 상태 갱신
}

async function renderProbMgmtTemplate(){
  const section = document.getElementById('probmgmt-template-section');
  if(!section){ section.style.display = 'none'; return; }
  section.style.display = '';

  const setTxt = (id,v) => { const el = document.getElementById(id); if(el) el.textContent = v; };

  const phone = _rcContact?.phone || '02)3487-8841';
  const email = _rcContact?.email || 'eunyangpark@naver.com';
  const fax   = _rcContact?.fax   || '02)3487-8882';

  const title = '[수습만료 예정] 홍길동 — 수습기간 6개월 (D-25)';
  const plain =
`안녕하세요, (주)예시기업 김대표 사장님.

소속 직원의 수습기간 만료일이 다가와 안내드립니다.

■ 직원명: 홍길동
■ 고용형태: 정규직 수습
■ 수습기간: 6개월
■ 수습 만료일: 2026.08.16 (D-25)

◆ 중요 안내
수습기간이 3개월을 초과하는 근로자의 경우, 해고 시 「근로기준법」에 따른 해고예고(30일 전 서면통지) 의무가 발생합니다.
만료 30일 전까지 본채용 여부를 결정하시어 담당 노무사에게 알려주시기 바랍니다.

※ 본 안내는 대화인사노무파트너스에서 발송한 법적 의무 안내입니다.

─────────────────────
인사톡 노무톡 · 대화인사노무파트너스 담당자
● 전화: ${phone}
● 이메일: ${email}
● 팩스: ${fax}`;

  setTxt('probmgmt-tmpl-title', title);
  setTxt('probmgmt-tmpl-plain', plain);
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

  // 처리결과 레이블 맵
  const _actionLabels = { confirm:'채용확정', cancel:'채용취소', dismiss:'조기해고', extend:'수습연장' };
  const _actionBadgeMap = { confirm:'badge-green', cancel:'badge-red', dismiss:'badge-orange', extend:'badge-blue' };

  tbody.innerHTML = targets.map(t => {
    const { empName, probEnd, probMonths, daysLeft, contract: c, emp } = t;
    // D-day 배지: D-30 이내=긴급, D-45 이내=통지대상, 그 외=일반
    let ddayCls;
    if(daysLeft <= 30)      ddayCls = 'urgent';
    else if(daysLeft <= 45) ddayCls = 'soon';
    else                    ddayCls = 'normal';
    // 계약 유형 뱃지 (글로벌 CAT_BADGE_CLS 사용)
    const typeBadge = `<span class="badge ${empCatBadge(c.contract_type)}">${CONTRACT_TYPE_LABEL[c.contract_type] || c.contract_type}</span>`;
    // 처리결과 셀
    const actionCell = c.probmgmt_action
      ? `<span class="badge ${_actionBadgeMap[c.probmgmt_action] || 'badge-gray'}">${_actionLabels[c.probmgmt_action]||c.probmgmt_action}</span>`
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
      <td style="text-align:center;font-size:12px;">${genderLabel(emp)}</td>
      <td>${typeBadge}</td>
      <td style="color:#6b7280;font-size:12.5px;">${c.contract_start || '-'}</td>
      <td style="color:#6b7280;font-size:12.5px;">${probMonths}개월</td>
      <td style="font-weight:600;color:#134e4a;">${probEnd}</td>
      <td><span class="probmgmt-dday ${ddayCls}">D-${daysLeft}</span></td>
      <td style="text-align:center;">${actionCell}</td>
      <td style="text-align:center;">${actionAtCell}</td>
      <td style="text-align:center;">
      <button class="btn btn-sm btn-indigo" onclick="openContractInNewWindow('${c.id}')" title="수습 계약서 새 창으로 보기">
          <i class="fas fa-file-contract" style="font-size:11px;"></i> 계약서
        </button>
      </td>
      <td style="text-align:center;">
        <button class="btn btn-danger btn-sm" onclick="openProbMgmtModal('${c.id}')">
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
     계약 유형: ${contractTypeLabel(c.contract_type)} · 수습기간: ${t.probMonths}개월<br>
     수습 만료일: <strong>${t.probEnd}</strong>
     <span class="probmgmt-dday ${ddayCls}" style="margin-left:8px;">D-${t.daysLeft}</span>`;

  // 급여 정보 계산 (채용 확정 카드에서 사용)
  const isRegular = c.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION;
  const salaryAmt = isRegular ? c.annual_salary : c.base_salary;
  const salaryLabel = isRegular ? '연봉 (정규직)' : '월 급여 (계약직)';
  const salaryDisplay = salaryAmt
    ? (isRegular
        ? `${Number(salaryAmt).toLocaleString()}원`
        : `${Number(salaryAmt).toLocaleString()}원/월`)
    : '미입력';
  const newContractType = isRegular ? CONTRACT_TYPE.REGULAR : CONTRACT_TYPE.FIXED;

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
      x.amended_from === c.id && x.status===CONTRACT_STATUS.PENDING
    );
    const pendingId    = pendingContract?.id || '';
    const pendingStart = pendingContract?.contract_start || '';

    // 만료일 경과 여부 (처리취소 버튼 활성/비활성)
    const _today2 = new Date(); _today2.setHours(0,0,0,0);
    const _probEndDate2 = new Date(t.probEnd); _probEndDate2.setHours(0,0,0,0);
    const isExpired = _today2 > _probEndDate2;

    const pdfBtnHtml = pendingId
      ? `<button onclick="event.stopPropagation();openContractInNewWindow('${pendingId}')" class="btn btn-slate" style="padding:7px 16px;font-size:12.5px;"><i class="fas fa-file-pdf"></i> 근로계약서 PDF 보기 (새창)</button>`
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
            `<td style="padding:7px 4px;color:#1e293b;font-weight:700;">${contractTypeLabel(newContractType)}</td>` +
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
    noteHtml = `<span style="background:#dbeafe;color:#1e40af;border-radius:12px;padding:1px 8px;font-size:11px;font-weight:600;margin-left:6px;">서면통지대상</span>`;
  else if(months > 3 && daysLeft < 30)
    noteHtml = `<span style="background:#fee2e2;color:#991b1b;border-radius:12px;padding:1px 8px;font-size:11px;font-weight:600;margin-left:6px;">해고예고수당대상</span>`;

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

  const isRegular      = c.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION;
  const newType        = isRegular ? CONTRACT_TYPE.REGULAR : CONTRACT_TYPE.FIXED;
  const newTypeLabel   = isRegular ? CONTRACT_TYPE_LABEL[CONTRACT_TYPE.REGULAR] : CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED];
  const salaryAmt      = isRegular ? c.annual_salary : c.base_salary;
  const salaryLabel    = isRegular ? '연봉' : '월 급여';
  const salaryDisplay  = salaryAmt
    ? (isRegular ? `${(salaryAmt/10000).toLocaleString()}만원` : `${Math.round(salaryAmt).toLocaleString()}원/월`)
    : '미입력';

  if(!confirm(
    `[채용 확정] ${t.empName}님\n\n` +
    `전환일자: ${transferDate}\n` +
    `계약 유형: ${newTypeLabel}\n` +
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
      status           : CONTRACT_STATUS.PENDING,
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
    x.amended_from === c.id && x.status===CONTRACT_STATUS.PENDING
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
        body: JSON.stringify({ status: CONTRACT_STATUS.VOIDED, is_voided_by_amend:true, voided_at:nowISO })
      });
      const pi = allContracts.findIndex(x => x.id === pendingContract.id);
      if(pi > -1){
        allContracts[pi].status             = CONTRACT_STATUS.VOIDED;
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
      body: JSON.stringify({ status: CONTRACT_STATUS.EXPIRED })
    });
    const idx = allContracts.findIndex(c => c.id === t.contract.id);
    if(idx > -1) allContracts[idx].status = CONTRACT_STATUS.EXPIRED;
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

  // 해고예고수당 발생 여부 확인: 수습 3개월 초과 + 만료 30일 미만
  const probMonths = t.contract.probation_months || 3;
  const probEnd = t.probEnd || '';
  const daysLeft = t.daysLeft || 0;
  const owesNoticePay = probMonths > 3 && daysLeft < 30;

  let confirmMsg = `${t.empName}님을 조기 해고 처리하시겠습니까?\n(계약 상태 → '해지')`;
  if(owesNoticePay){
    const hw = parseFloat(t.contract.hourly_wage) || 0;
    const hpd = parseFloat(t.contract.work_hours_per_day) || 8;
    const noticePay = hw * hpd * 30;
    confirmMsg = `⚠️ 해고예고수당 발생 대상입니다.\n\n` +
      `근로자: ${t.empName}\n` +
      `수습기간: ${probMonths}개월 (3개월 초과)\n` +
      `수습 만료일: ${probEnd} (D-${daysLeft})\n` +
      `예상 해고예고수당: ${noticePay.toLocaleString('ko-KR')}원 (30일분 통상임금)\n\n` +
      `근로기준법 제26조에 따라 수습 3개월 초과 근로자 해고 시\n` +
      `30일분 통상임금을 해고예고수당으로 지급해야 합니다.\n` +
      `이 금액은 고객사가 전액 부담합니다.\n\n` +
      `그래도 해고 처리하시겠습니까?`;
  }
  if(!confirm(confirmMsg)) return;
  try {
    const patchBody = { status: CONTRACT_STATUS.TERMINATED };
    if(owesNoticePay){
      const hw = parseFloat(t.contract.hourly_wage) || 0;
      const hpd = parseFloat(t.contract.work_hours_per_day) || 8;
      const noticePay = Math.round(hw * hpd * 30);
      patchBody.dismissal_notice_pay = noticePay;
      patchBody.dismissal_notice_pay_reason = `수습 ${probMonths}개월(3개월 초과) 조기해고 — 근로기준법 제26조`;
    }
    await fetch(`../tables/contracts/${t.contract.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(patchBody)
    });
    const idx = allContracts.findIndex(c => c.id === t.contract.id);
    if(idx > -1){
      allContracts[idx].status = CONTRACT_STATUS.TERMINATED;
      if(patchBody.dismissal_notice_pay) allContracts[idx].dismissal_notice_pay = patchBody.dismissal_notice_pay;
    }
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
      body: JSON.stringify({ status: CONTRACT_STATUS.VOIDED, is_voided_by_amend:true, voided_at:nowISO })
    });
    const origIdx = allContracts.findIndex(c => c.id === origC.id);
    if(origIdx !== -1){
      allContracts[origIdx].status             = CONTRACT_STATUS.VOIDED;
      allContracts[origIdx].is_voided_by_amend = true;
      allContracts[origIdx].voided_at          = nowISO;
    }
    // ② 새 계약 생성
    const { id, gs_project_id, gs_table_name, created_at, updated_at, ...origFields } = origC;
    const newContract = {
      ...origFields,
      probation_months  : newMonths,
      contract_end      : newEndStr,
      status            : CONTRACT_STATUS.ACTIVE,
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
          <span class="dash-alert-banner-count">${total}건</span>
        </div>
        <div class="dash-alert-banner-sub">퇴직금 정산내역서 발송 완료 — 클릭하여 ${PAGE_LABELS['severance']} 페이지로 이동</div>
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
    const progressSec = document.getElementById('dash-progress-section');
    if(progressSec) progressSec.style.display = 'none';
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
    return `<div class="draft-item-row" style="cursor:default;">
      <div class="draft-item-icon co"><i class="fas fa-building"></i></div>
      <div class="pi-adb-row-main">
        <div class="pi-adb-row-name">${c.company_name || '(이름 없음)'}</div>
      </div>
      <div class="pi-adb-row-right" style="flex-direction:row;align-items:center;gap:8px;">
        ${savedAt ? `<span class="pi-adb-row-time">${savedAt} 저장</span>` : ''}
        <button onclick="goDraftCompany('${c.id}')" class="btn-draft-edit-sm"><i class="fas fa-pencil-alt"></i> 이어 작성</button>
          <button onclick="_deleteDraft('${c.id}','companies','${c.company_name||'(이름 없음)'}')" class="btn-draft-del-sm"><i class="fas fa-trash-alt"></i> 삭제</button>
      </div>
    </div>`;
  }).join('');

  // 계약서 행 HTML
  const contractRows = draftContracts.map(c => {
    const emp     = allEmployees.find(e => e.id === c.employee_id);
    const co      = allCompanies.find(x => x.id === c.company_id);
    const empName = emp ? emp.name : '-';
    const coName  = co ? co.company_name : '-';
    const savedAt = fmtDraftTime(c.updated_at);
    return `<div class="draft-item-row" style="cursor:default;">
      <div class="draft-item-icon ct"><i class="fas fa-file-contract"></i></div>
      <div class="pi-adb-row-main">
        <div class="pi-adb-row-name">${empName}</div>
        <div class="pi-adb-row-meta"><span class="pi-adb-row-co">${coName}</span></div>
      </div>
      <div class="pi-adb-row-right" style="flex-direction:row;align-items:center;gap:8px;">
        ${savedAt ? `<span class="pi-adb-row-time">${savedAt} 저장</span>` : ''}
        <button onclick="goDraftContract('${c.id}')" class="btn-draft-edit-sm"><i class="fas fa-pencil-alt"></i> 이어 작성</button>
          <button onclick="_deleteDraft('${c.id}','contracts','${empName}')" class="btn-draft-del-sm"><i class="fas fa-trash-alt"></i> 삭제</button>
      </div>
    </div>`;
  }).join('');

  // 급여 임시저장 행 HTML — draft_saved_at 내림차순 정렬
  const sortedDraftPayrolls = [...draftPayrolls].sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
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
    const empCat = typeof contractTypeLabel === 'function' ? contractTypeLabel(emp?.employment_category) : (emp?.employment_category || '');
    // 급여일: 근로계약서 pay_day > 급여레코드 pay_date > 고객사 pay_day
    const ct = (allContracts||[]).find(c => c.employee_id === p.employee_id && c.company_id === p.company_id && !c.is_draft && CONTRACT_ACTIVE_STATUSES.includes(c.status));
    const ctPayDay = ct?.pay_day;
    const coPayDay = co?.pay_day;
    const fallbackDay = p.pay_date ? (p.pay_date.includes('-') ? parseInt(p.pay_date.slice(8)) : parseInt(p.pay_date)) : 0;
    const displayDay = ctPayDay || parseInt(coPayDay) || fallbackDay;
    const payDateStr = displayDay ? `급여일: 매월 ${displayDay}일` : '';
    const savedAt = fmtDraftTime(p.updated_at);
    const metaParts = [coName, yrMo, empCat, payDateStr].filter(Boolean);
    return `<div class="draft-item-row" style="cursor:default;">
      <div class="draft-item-icon pi"><i class="fas fa-file-invoice-dollar"></i></div>
      <div class="pi-adb-row-main">
        <div class="pi-adb-row-name">${empName}</div>
        <div class="pi-adb-row-meta">
          ${metaParts.map((v,i) => i===0
            ? `<span class="pi-adb-row-co">${v}</span>`
            : `<span class="pi-adb-row-yrmo"> · ${v}</span>`
          ).join('')}
        </div>
      </div>
      <div class="pi-adb-row-right" style="flex-direction:row;align-items:center;gap:10px;">
        ${savedAt ? `<span class="pi-adb-row-time">${savedAt} 저장</span>` : ''}
        <span style="display:inline-flex;gap:10px;">
          <button onclick="goDraftPayroll('${p.id}')" class="btn-draft-edit-sm"><i class="fas fa-pencil-alt"></i>이어 입력</button>
          <button onclick="_deleteDraft('${p.id}','payrolls','${empName} ${yrMo||''}')" class="btn-draft-del-sm"><i class="fas fa-trash-alt"></i> 삭제</button>
        </span>
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
      <span class="dash-ac-group-label"><i class="fas fa-building" style="margin-right:5px;font-size:14px;color:#111827;"></i>고객사 <span class="count-badge">${draftCompanies.length}</span></span>
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
      <span class="dash-ac-group-label"><i class="fas fa-file-contract" style="margin-right:5px;font-size:14px;color:#111827;"></i>근로계약서 <span class="count-badge">${draftContracts.length}</span></span>
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
      <span class="dash-ac-group-label"><i class="fas fa-file-invoice-dollar" style="margin-right:5px;font-size:14px;color:#111827;"></i>급여 입력 <span class="count-badge">${draftPayrolls.length}</span></span>
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
    </div>
    <div class="draft-alert-card-body">${coGroup}${ctGroup}${piGroup}</div>
  </div>`;
  const progressSec = document.getElementById('dash-progress-section');
  if(progressSec) progressSec.style.display = '';
  // 메뉴 배지 + 고객사 관리 페이지 배너 동기화
  if(typeof updateMenuBadges === 'function') updateMenuBadges();
  if(typeof _renderCompaniesDraftBanner === 'function') _renderCompaniesDraftBanner();
}

// 계약서 날인본 미등록 알림 카드
/* =================================================================
   _renderContractsBanners()
   근로 계약 관리 페이지 최상단 3개 배너
   ① 근로계약서 임시저장  ② 날인본 미등록  ③ 제3자동의서 미등록
   ================================================================= */
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

  // ── ① 임시저장 배너 (대시보드와 동일한 아코디언 구조) ──
  (function(){
    const sec    = document.getElementById('contracts-draft-banner');
    if(!sec) return;
    const drafts = allContracts.filter(c => !!c.is_draft);
    if(!drafts.length){ sec.style.display='none'; sec.innerHTML=''; return; }

    function fmtDraftTime(ts){
      if(!ts) return '';
      const num = Number(ts);
      const d = isNaN(num) ? new Date(ts) : new Date(num);
      if(isNaN(d.getTime())) return '';
      return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    const contractRows = drafts.map(c => {
      const emp     = allEmployees.find(e => e.id === c.employee_id);
      const co      = allCompanies.find(x => x.id === c.company_id);
      const empName = emp ? emp.name : '-';
      const coName  = co ? co.company_name : '-';
      const savedAt = fmtDraftTime(c.updated_at);
      return `<div class="draft-item-row" style="cursor:default;">
        <div class="draft-item-icon ct"><i class="fas fa-file-contract"></i></div>
        <div class="pi-adb-row-main">
          <div class="pi-adb-row-name">${empName}</div>
          <div class="pi-adb-row-meta"><span class="pi-adb-row-co">${coName}</span></div>
        </div>
        <div class="pi-adb-row-right" style="flex-direction:row;align-items:center;gap:8px;">
          ${savedAt ? `<span class="pi-adb-row-time">${savedAt} 저장</span>` : ''}
          <button onclick="goDraftContract('${c.id}')" class="btn-draft-edit-sm"><i class="fas fa-pencil-alt"></i> 이어 작성</button>
          <button onclick="_deleteDraft('${c.id}','contracts','${empName}')" class="btn-draft-del-sm"><i class="fas fa-trash-alt"></i> 삭제</button>
        </div>
      </div>`;
    }).join('');

    sec.style.display = '';
    sec.innerHTML = `
    <div class="dash-ac-card draft-alert-card">
      <div class="draft-alert-card-header">
        <div class="dash-ac-title draft-alert-title">
          <span class="pulse-dot"></span>
          임시저장 미완료 항목
        </div>
      </div>
      <div class="draft-alert-card-body">
        <div class="dash-ac-group-row" style="padding:8px 20px;">
          <span class="dash-ac-group-label"><i class="fas fa-file-contract" style="margin-right:5px;font-size:14px;color:#111827;"></i>근로계약서 <span class="count-badge">${drafts.length}</span></span>
          <button class="dash-ac-toggle" onclick="toggleDashAccordion('cont-draft-ct-body',this,event)" title="펼치기/접기" style="background:rgba(99,102,241,.15);color:#3730a3;margin-left:2px;">
            <i class="fas fa-chevron-down"></i>
          </button>
        </div>
        <div id="cont-draft-ct-body" class="dash-ac-body" style="padding:0 20px;">
          <div style="padding:12px 0 16px;">${contractRows}</div>
        </div>
      </div>
    </div>`;
  })();

  // ── ② 근로계약서 미발송 배너 ──
  (function(){
    const sec = document.getElementById('contracts-signed-banner');
    if(!sec) return;
    const unsignedContracts = (allContracts || []).filter(c =>
      !c.is_draft && !c.is_voided_by_amend &&
      ![CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.CANCELED].includes(c.status) &&
      CONTRACT_ACTIVE_STATUSES.includes(c.status) &&
      !c.signed_file_name
    );
    const cnt = unsignedContracts.length;
    const inactive = cnt === 0;
    sec.style.display = '';
    sec.innerHTML = `<div class="dash-alert-banner contract-unsent${inactive ? ' inactive' : ''}"
         ${inactive ? '' : `onclick="showPage('contract-dispatch',document.querySelector('.menu-item[data-page=\\'contract-dispatch\\']'))"`}
         style="cursor:${inactive ? 'default' : 'pointer'}">
        <div class="dash-alert-banner-head">
          <div class="dash-alert-banner-icon" style="background:${inactive ? '#d1d5db' : ''};"><i class="fas fa-file-contract"></i></div>
          <div class="dash-alert-banner-body">
            <div class="dash-alert-banner-title${inactive ? ' inactive' : ''}">근로계약서 미발송 <span class="dash-alert-banner-count" style="color:${inactive ? '#9ca3af' : ''};">${cnt}건</span></div>
            <div class="dash-alert-banner-sub" style="color:${inactive ? '#9ca3af' : ''};">${inactive ? '미발송 계약서가 없습니다' : `클릭하여 ${PAGE_LABELS['contract-dispatch']} 페이지로 이동`}</div>
          </div>
          ${inactive ? '' : '<div class="dash-alert-banner-arrow"><i class="fas fa-chevron-right"></i></div>'}
        </div>
      </div>`;
  })();

  // ── ③ 정보제공동의서 미발송 배너 ──
  (function(){
    const sec = document.getElementById('contracts-consent-banner');
    if(!sec) return;
    const unsignedConsent = (allContracts || []).filter(c =>
      !c.is_draft && !c.is_voided_by_amend &&
      ![CONTRACT_STATUS.VOIDED, CONTRACT_STATUS.CANCELED].includes(c.status) &&
      CONTRACT_ACTIVE_STATUSES.includes(c.status) &&
      !c.consent_file_name
    );
    const cnt2 = unsignedConsent.length;
    const inactive2 = cnt2 === 0;
    sec.style.display = '';
    sec.innerHTML = `<div class="dash-alert-banner consent${inactive2 ? ' inactive' : ''}"
         ${inactive2 ? '' : `onclick="showPage('consent-dispatch',document.querySelector('.menu-item[data-page=\\'consent-dispatch\\']'))"`}
         style="cursor:${inactive2 ? 'default' : 'pointer'}">
        <div class="dash-alert-banner-head">
          <div class="dash-alert-banner-icon" style="background:${inactive2 ? '#d1d5db' : ''};"><i class="fas fa-file-shield"></i></div>
          <div class="dash-alert-banner-body">
            <div class="dash-alert-banner-title${inactive2 ? ' inactive' : ''}">정보제공동의서 미발송 <span class="dash-alert-banner-count" style="color:${inactive2 ? '#9ca3af' : ''};">${cnt2}건</span></div>
            <div class="dash-alert-banner-sub" style="color:${inactive2 ? '#9ca3af' : ''};">${inactive2 ? '미발송 동의서가 없습니다' : `클릭하여 ${PAGE_LABELS['consent-dispatch']} 페이지로 이동`}</div>
          </div>
          ${inactive2 ? '' : '<div class="dash-alert-banner-arrow"><i class="fas fa-chevron-right"></i></div>'}
        </div>
      </div>`;
  })();

  // ── ⑥ 수습근로자 관리 배너 ──
  (function(){
    const sec = document.getElementById('contracts-probation-banner');
    if(!sec) return;
    if(typeof _getProbationNoticeTargets !== 'function'){ sec.style.display='none'; return; }
    const targets = _getProbationNoticeTargets();
    const noticTargets = targets.filter(t => t.probMonths > 3 && t.daysLeft >= 30);
    const urgentAll = targets.filter(t => t.probMonths > 3 && t.daysLeft < 30);
    const total = noticTargets.length + urgentAll.length;
    const inactive3 = total === 0;
    sec.style.display = '';
    sec.innerHTML = `<div class="dash-alert-banner probation${inactive3 ? ' inactive' : ''}"
         ${inactive3 ? '' : `onclick="showPage('probation-mgmt',document.querySelector('.menu-item[data-page=\\'probation-mgmt\\']'))"`}
         style="cursor:${inactive3 ? 'default' : 'pointer'}">
        <div class="dash-alert-banner-head">
          <div class="dash-alert-banner-icon" style="background:${inactive3 ? '#d1d5db' : ''};"><i class="fas fa-user-clock"></i></div>
          <div class="dash-alert-banner-body">
            <div class="dash-alert-banner-title${inactive3 ? ' inactive' : ''}">관리가 필요한 수습 근로자 <span class="dash-alert-banner-count" style="color:${inactive3 ? '#9ca3af' : ''};">${total}명</span></div>
            <div class="dash-alert-banner-sub" style="color:${inactive3 ? '#9ca3af' : ''};">${inactive3 ? '수습기간 3개월 초과 근로자가 없습니다' : '수습기간 3개월 초과 근로자 해고 시 30일 전 서면 통지 의무'}</div>
          </div>
          ${inactive3 ? '' : '<div class="dash-alert-banner-arrow"><i class="fas fa-chevron-right"></i></div>'}
        </div>
      </div>`;
  })();

  // ── 할일 목록 섹션 표시/숨김 (4열 그리드 포함) ──
  (function(){
    const todoSec = document.getElementById('cont-todo-section');
    const grid = document.querySelector('.cont-todo-grid');
    if(!todoSec) return;
    const gridIds = ['contracts-signed-banner','contracts-consent-banner',
                     'contracts-probation-banner'];
    const anyGridVisible = gridIds.some(id => {
      const el = document.getElementById(id);
      return el && el.style.display !== 'none' && el.innerHTML.trim().length > 0;
    });
    todoSec.style.display = anyGridVisible ? '' : 'none';
    if(grid) grid.style.display = anyGridVisible ? '' : 'none';
  })();

  // ── 진행 중인 업무 섹션 표시/숨김 ──
  (function(){
    const progressSec = document.getElementById('cont-progress-section');
    if(!progressSec) return;
    const draftEl = document.getElementById('contracts-draft-banner');
    const hasDrafts = draftEl && draftEl.style.display !== 'none' && draftEl.innerHTML.trim().length > 0;
    progressSec.style.display = hasDrafts ? '' : 'none';
  })();
}

function renderSignedAlerts(){
  // [사용안함] 서류미비 계약도 유효 계약으로 처리하므로 알림 카드 제거
  const sec = document.getElementById('dash-signed-section');
  if(sec){ sec.style.display='none'; sec.innerHTML=''; }
}


// 제3자 정보제공동의서 미등록 알림 카드
function renderConsentAlerts(){
  if (typeof _updateDashConsentBanner === 'function') {
    _updateDashConsentBanner();
  }
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
  const c = allCompanies.find(x=>x.id===id);
  if(c) currentGlobalCompanyId = id; // showPage가 올바른 필터로 진입하도록
  showPage('companies', document.querySelector('.menu-item[data-page="companies"]'));
  setTimeout(()=>{
    if(typeof openCompanyModal === 'function') openCompanyModal(id);
  }, 400);
}

// draft 계약서 → 근로 계약 관리 페이지로 이동 후 모달 열기
function goDraftContract(id){
  const c = allContracts.find(x=>x.id===id);
  if(!c) return;
  if(c.company_id){
    const co = allCompanies.find(x=>x.id===c.company_id);
    if(co){
      // 페이지 이동 전 글로벌 상태 미리 설정 (showPage가 올바른 회사로 select 하도록)
      currentGlobalCompanyId = c.company_id;
      currentGlobalCompanyName = co.company_name || '';
      showPage('contracts', document.querySelector('.menu-item[data-page="contracts"]'));
      // showPage 내부에서 selectContCompany가 호출되므로 중복 호출 방지
      setTimeout(()=>{
        if(typeof continueDraftContract === 'function') continueDraftContract(id);
        else if(typeof editContract === 'function') editContract(id);
      }, 600);
      return;
    }
  }
  showPage('contracts', document.querySelector('.menu-item[data-page="contracts"]'));
  setTimeout(()=>{
    if(typeof continueDraftContract === 'function') continueDraftContract(id);
    else if(typeof editContract === 'function') editContract(id);
  }, 600);
}

// ── 급여 임시저장 → 급여 입력 페이지로 이동 후 해당 직원·연월 세팅 + 임시저장 복원 ──
function goDraftPayroll(draftId){
  const p = (allPayrolls||[]).find(x => x.id === draftId);
  if(!p){ toast('임시저장 데이터를 찾을 수 없습니다.', 'error'); return; }

  // showPage가 select 하도록 글로벌 상태 미리 설정
  currentGlobalCompanyId = p.company_id;
  const co = allCompanies.find(x => x.id === p.company_id);
  if(co) currentGlobalCompanyName = co.company_name;

  const piMenuItem = document.querySelector('[data-page="payroll-input"]');
  showPage('payroll-input', piMenuItem);

  // showPage 완료 후 DOM 세팅
  setTimeout(() => {
    if(co){
      const card = document.getElementById('pi-company-select-card');
      const sec  = document.getElementById('pi-input-section');
      const lbl  = document.getElementById('pi-selected-company-label');
      if(card) card.style.display = 'none';
      if(sec)  sec.style.display  = '';
      if(lbl)  lbl.textContent    = co.company_name + ' 급여 입력';
      const targetSec = document.getElementById('pi-target-list-section');
      if(targetSec) targetSec.style.display = 'none';
      const formSec = document.getElementById('pi-form-section');
      if(formSec) formSec.style.display = '';
      const emp = allEmployees.find(e => e.id === p.employee_id);
      const nameEl  = document.getElementById('pi-form-emp-name');
      const badgeEl = document.getElementById('pi-form-emp-badge');
      if(nameEl && emp) nameEl.textContent = `${emp.name} (${p.pay_year}년 ${p.pay_month}월) — 임시저장 복원`;
      if(badgeEl) badgeEl.textContent = '';
    }

    const coSel = document.getElementById('pi-company');
    if(coSel){ coSel.value = p.company_id; if(typeof loadPIEmployees === 'function') loadPIEmployees().then(() => {
      const empSel2 = document.getElementById('pi-employee');
      if(empSel2){ empSel2.value = p.employee_id; }
    }); }

    const yrEl = document.getElementById('pi-year');
    const moEl = document.getElementById('pi-month');
    if(yrEl) yrEl.value = p.pay_year;
    if(moEl) moEl.value = p.pay_month;

    piEditPayrollId = null;
    const editBanner = document.getElementById('pi-edit-banner');
    if(editBanner) editBanner.style.display = 'none';

    piDraftId = draftId;
    
    // 계약 로드 및 임시저장 복원
    setTimeout(() => {
      if(typeof loadPIContract === 'function') loadPIContract();
      if(typeof loadPIDraft === 'function') setTimeout(() => loadPIDraft(), 300);
    }, 200);
  }, 500);
}

