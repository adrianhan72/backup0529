/* =====================================================================
 * admin-hr.js — 인사관리대장 (직원명부)
 *
 * Phase 1 범위:
 *   - 고객사 선택 → 직원 목록(검색·상태 필터)
 *   - 직원 상세 조회 모달 (3섹션 + 근로계약 이력)
 *   - 신규 직원 등록 / 개인정보 편집 (계약과 독립)
 *
 * 룰 준수:
 *   - DB 저장값 영문 코드, 표시는 *_LABEL / 헬퍼
 *   - 상태 비교는 normalizeEmpStatus / EMP_STATUS 상수
 * ===================================================================== */

let _hrSelectedCoId = null;   // 선택된 고객사
let _hrViewEmpId    = null;   // 상세 조회 중인 직원
let _hrEditEmpId    = null;   // 폼 편집 대상 (null=신규)

function _hrEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/** 인사카드 수정 이력 파싱 (배열 또는 JSON 텍스트) */
function _hrParseHistory(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; }
  }
  return [];
}

/**
 * 목록 표시용 실효 상태 도출
 *  - 명시적 퇴직(status=resigned) → 퇴직
 *  - 대표자 본인·등기임원·특수관계인: 별도계약 대상이므로 계약 만료와 무관하게 재직 유지
 *  - 일반 직원: 유효(예정 포함) 계약이 하나라도 있으면 재직,
 *    계약이 모두 만료·해지·파기된 경우 퇴직으로 표시 (계약 기준 퇴직)
 */
function _hrEffectiveStatus(e) {
  const base = normalizeEmpStatus(e.status);
  if (base === EMP_STATUS.RESIGNED) return EMP_STATUS.RESIGNED;
  if (personnelTypeOf(e) !== PERSONNEL_TYPE.EMPLOYEE) return e.resign_date ? EMP_STATUS.RESIGNED : EMP_STATUS.ACTIVE;
  const cts = (allContracts || []).filter(c => c.employee_id === e.id && !c.is_draft && !c.is_voided_by_amend);
  if (!cts.length) return EMP_STATUS.ACTIVE;
  const LIVE = new Set([
    CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.PENDING, CONTRACT_STATUS.DOCS_INCOMPLETE,
    CONTRACT_STATUS.RENEWAL_PENDING, CONTRACT_STATUS.TERMINATE_PENDING,
  ]);
  return cts.some(c => LIVE.has(c.status)) ? EMP_STATUS.ACTIVE : EMP_STATUS.RESIGNED;
}

// ── 고객사 칩 렌더링 ──
function renderHrCompanyList() {
  const q = (document.getElementById('hr-company-search')?.value || '').toLowerCase().trim();
  const container = document.getElementById('hr-company-chips');
  if (!container) return;

  const companies = allCompanies.filter(c =>
    isCompanyActive(c) && (!q || (c.company_name || '').toLowerCase().includes(q))
  ).sort((a, b) => (a.company_name || '').localeCompare(b.company_name || '', 'ko'));

  if (!companies.length) {
    container.innerHTML = `<div style="color:#9ca3af;font-size:13px;padding:8px 0;">${q ? `"${_hrEsc(q)}" 검색 결과 없음` : '이용 중인 고객사가 없습니다'}</div>`;
    return;
  }
  container.innerHTML = companies.map(c => {
    const isSelected = c.id === _hrSelectedCoId;
    return `<button onclick="selectHrCompany('${c.id}','${_hrEsc(c.company_name).replace(/'/g, "\\'")}')" class="co-chip${isSelected ? ' selected' : ''}">
      <i class="fas fa-building" style="font-size:11px;"></i> ${_hrEsc(c.company_name)}
    </button>`;
  }).join('');
}

// ── 고객사 선택 ──
function selectHrCompany(companyId, companyName) {
  _hrSelectedCoId = companyId;
  currentGlobalCompanyId = companyId;
  currentGlobalCompanyName = companyName;
  document.getElementById('hr-selected-company-label').innerHTML =
    `<i class="fas fa-id-card" style="margin-right:6px;"></i>${_hrEsc(companyName)} 인사관리대장`;
  document.getElementById('hr-company-select-card').style.display = 'none';
  document.getElementById('hr-list-section').style.display = 'block';
  const _s = document.getElementById('hr-search'); if (_s) _s.value = '';
  const _f = document.getElementById('hr-filter-status'); if (_f) _f.value = 'active';
  const _ft = document.getElementById('hr-filter-type'); if (_ft) _ft.value = 'all';
  renderHrEmployees();
}

function clearHrCompanySelect() {
  _hrSelectedCoId = null;
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  document.getElementById('hr-company-select-card').style.display = '';
  document.getElementById('hr-list-section').style.display = 'none';
  const _s = document.getElementById('hr-company-search'); if (_s) _s.value = '';
  renderHrCompanyList();
}

// ── 직원 목록 렌더링 ──
function renderHrEmployees() {
  const tbody = document.getElementById('hr-tbody');
  if (!tbody || !_hrSelectedCoId) return;

  const q = (document.getElementById('hr-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('hr-filter-status')?.value || 'all';
  const typeFilter = document.getElementById('hr-filter-type')?.value || 'all';
  const categoryFilter = document.getElementById('hr-filter-category')?.value || 'all';

  let list = (allEmployees || []).filter(e => e.company_id === _hrSelectedCoId);
  if (statusFilter !== 'all') {
    list = list.filter(e => _hrEffectiveStatus(e) === statusFilter);
  }
  if (typeFilter !== 'all') {
    list = list.filter(e => personnelTypeOf(e) === typeFilter);
  }
  if (categoryFilter !== 'all') {
    list = list.filter(e => (e.employment_category || '').toLowerCase() === categoryFilter);
  }
  // 수습근로자 관리 OFF → 정규직 수습·계약직 수습 고용형태는 목록에서 제외
  if (window._probationFeatureEnabled !== true) {
    list = list.filter(e =>
      ![CONTRACT_TYPE.REGULAR_PROBATION, CONTRACT_TYPE.FIXED_PROBATION].includes(e.employment_category)
    );
  }
  if (q) {
    list = list.filter(e => {
      const hay = [e.name, e.employee_number].map(v => String(v || '').toLowerCase()).join(' ');
      return hay.includes(q);
    });
  }
  list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

  const cnt = document.getElementById('hr-emp-count');
  if (cnt) cnt.textContent = `재직 ${list.filter(e => _hrEffectiveStatus(e) === EMP_STATUS.ACTIVE).length}명 / 퇴직 ${list.filter(e => _hrEffectiveStatus(e) === EMP_STATUS.RESIGNED).length}명`;

  if (!list.length) {
    const _hasFilter = statusFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all' || q;
    tbody.innerHTML = `<tr><td colspan="10" class="cen-empty"><i class="fas fa-users"></i> ${_hasFilter ? '조건에 맞는 인원이 없습니다' : '등록된 인원이 없습니다'}</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => {
    const st = _hrEffectiveStatus(e);
    const stBadge = st === EMP_STATUS.RESIGNED ? 'badge-gray' : 'badge-green';
    const stLabel = st === EMP_STATUS.RESIGNED ? '퇴직' : '재직';
    const deptPos = [e.department, e.position].filter(v => v && String(v).trim()).join(' / ');
    const pType = personnelTypeOf(e);
    const isEmp = pType === PERSONNEL_TYPE.EMPLOYEE;
    // 실효 계약: 임시저장·파기(수정 재발행 산출물)·파기상태 제외
    const hasRealCt = (allContracts || []).some(c =>
      c.employee_id === e.id && !c.is_draft && !c.is_voided_by_amend && c.status !== CONTRACT_STATUS.VOIDED
    );
    // 고용형태: 다른 테이블과 동일한 뱃지 스타일, 미확정이면 파란색 텍스트만
    const catCell = isEmp && !e.employment_category
      ? '<span style="color:#3b82f6;">(미정)</span>'
      : (e.employment_category
        ? `<span class="badge ${CAT_BADGE_CLS[e.employment_category] || 'badge-gray'}">${_hrEsc(contractTypeLabel(e.employment_category) || e.employment_category)}</span>`
        : '-');
    // 부서/직책: 실효 계약 없음 → '(미정)', 계약 있으나 값 없음 → '-'
    const deptPosCell = isEmp
      ? (!hasRealCt ? '<span style="color:#3b82f6;">(미정)</span>' : (_hrEsc(deptPos) || '-'))
      : (_hrEsc(deptPos) || '-');
    const typeBadge = pType !== PERSONNEL_TYPE.EMPLOYEE
      ? ` <span class="badge ${pType === PERSONNEL_TYPE.REPRESENTATIVE ? 'badge-indigo' : pType === PERSONNEL_TYPE.EXECUTIVE ? 'badge-blue' : 'badge-purple'}">${personnelTypeLabel(pType)}</span>`
      : '';
    // 삭제: 근로계약이 한 번도 등록된 적 없거나 예정 계약이 파기된 경우에만 (직원 유형)
    const delBtn = (isEmp && !hasRealCt)
      ? `<button class="btn btn-sm btn-secondary" onclick="_hrDeleteEmployee('${e.id}')"><i class="fas fa-trash-alt"></i> 삭제</button>`
      : '';
    return `<tr>
      <td style="font-weight:600;">${_hrEsc(e.name)}${typeBadge}</td>
      <td style="font-size:12px;">${catCell}</td>
      <td style="font-size:12px;text-align:center;">${genderLabel(e)}</td>
      <td style="font-size:12px;">${_hrEsc(e.employee_number) || '-'}</td>
      <td style="font-size:12px;">${deptPosCell}</td>
      <td style="font-size:12px;">${isEmp && !e.hire_date ? '<span style="color:#3b82f6;">(미정)</span>' : (_hrEsc(e.hire_date) || '-')}</td>
      <td style="font-size:12px;">${_hrEsc(e.resign_date) || '-'}</td>
      <td style="font-size:12px;">${_hrEsc(e.phone) || '-'}</td>
      <td><span class="badge ${stBadge}">${stLabel}</span></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-indigo" onclick="openHrEmployeeView('${e.id}')"><i class="fas fa-search"></i> 인사카드 조회</button>
        <button class="btn btn-sm btn-warning" onclick="openHrEmployeeForm('${e.id}')"><i class="fas fa-pencil-alt"></i> 수정</button>
        ${delBtn}
      </td>
    </tr>`;
  }).join('');
}

/** 계약 없는 직원 인사카드 삭제 (임시저장 계약 있으면 차단) */
async function _hrDeleteEmployee(empId) {
  const e = (allEmployees || []).find(x => x.id === empId);
  if (!e) return;
  const drafts = (allContracts || []).filter(c => c.employee_id === empId && c.is_draft);
  if (drafts.length) {
    await _showConfirm({
      message: '이 직원의 임시저장 중인 근로계약을 먼저 삭제해주세요.',
      okText: '확인',
      okClass: 'btn-primary',
    });
    return;
  }
  // 재차 가드: 등록(파기 제외) 계약이 있으면 삭제 불가
  const hasReal = (allContracts || []).some(c =>
    c.employee_id === empId && !c.is_draft && !c.is_voided_by_amend && c.status !== CONTRACT_STATUS.VOIDED
  );
  if (hasReal) {
    toast('등록된 근로계약이 있어 삭제할 수 없습니다.', 'error');
    return;
  }
  const ok = await _showConfirm({
    message: `'${e.name}' 직원의 인사카드를 삭제하시겠습니까?\n삭제된 인사카드는 복구할 수 없습니다.`,
    okText: '삭제',
    okClass: 'btn-danger',
  });
  if (!ok) return;
  try {
    await api(`../tables/employees/${empId}`, { method: 'DELETE' });
    await loadEmployees();
    renderHrEmployees();
    toast(`${e.name} — 삭제되었습니다.`, 'success');
  } catch (err) {
    console.warn('[_hrDeleteEmployee]', err);
    toast('삭제 중 오류가 발생했습니다.', 'error');
  }
}

// ── 계약 조회 (근로계약 이력의 조회 버튼에서 사용) ──
function _hrActView(cid){ closeHrEmployeeView(); viewContract(cid); }

// ── 상세 조회 모달 ──
function openHrEmployeeView(empId) {
  const e = (allEmployees || []).find(x => x.id === empId);
  if (!e) return;
  _hrViewEmpId = empId;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };

  set('hr-view-title', '');
  const pType = personnelTypeOf(e);
  const typeBadge = pType !== PERSONNEL_TYPE.EMPLOYEE
    ? ` <span class="badge ${pType === PERSONNEL_TYPE.REPRESENTATIVE ? 'badge-indigo' : pType === PERSONNEL_TYPE.EXECUTIVE ? 'badge-blue' : 'badge-purple'}">${personnelTypeLabel(pType)}</span>`
    : '';
  const titleEl = document.getElementById('hr-view-title');
  if (titleEl) titleEl.innerHTML = `<i class="fas fa-id-card"></i> ${_hrEsc(e.name)}${typeBadge} — 인사카드`;

  // 관계: 특수관계인일 때만 첫 번째 항목으로 노출
  const relWrap = document.getElementById('hr-v-relationship-wrap');
  if (relWrap) relWrap.style.display = pType === PERSONNEL_TYPE.RELATED ? '' : 'none';
  set('hr-v-relationship', e.relationship);

  set('hr-v-empno', e.employee_number);
  set('hr-v-name', e.name);
  set('hr-v-gender', genderLabel(e));
  set('hr-v-id', e.id_number);
  // 근로계약 체결 전 미확정 항목(고용형태·부서·직책·입사일)은 '(미정)' 파란색 표시 (직원만)
  const _isEmpType = pType === PERSONNEL_TYPE.EMPLOYEE;
  const _setV = (id, val, pending) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (pending && _isEmpType && !val) { el.innerHTML = '<span style="color:#3b82f6;">(미정)</span>'; return; }
    el.textContent = val || '-';
  };
  _setV('hr-v-category', e.employment_category ? (contractTypeLabel(e.employment_category) || '') : '', true);
  set('hr-v-job', e.job_description);
  _setV('hr-v-dept', e.department, true);
  _setV('hr-v-position', e.position, true);
  _setV('hr-v-hire', e.hire_date, true);
  _hrSetupViewResign(e);
  set('hr-v-phone', e.phone);
  set('hr-v-email', e.email);
  set('hr-v-address', e.address);
  set('hr-v-emergency', [e.emergency_contact, e.emergency_relation].filter(Boolean).join(' (') + ([e.emergency_contact, e.emergency_relation].filter(Boolean).length ? ')' : ''));
  set('hr-v-bank', e.bank_name);
  set('hr-v-account', e.bank_account);
  // 부양가족 수(과세 기준): 0명도 0으로 표시 (기본값 미설정 시에만 '-')
  {
    const _dep = e.tax_dependents != null ? e.tax_dependents : (e.dependents != null ? e.dependents : null);
    const _dv = document.getElementById('hr-v-dependents');
    if(_dv) _dv.textContent = _dep != null ? _dep : '-';
  }
  set('hr-v-education', e.education);
  set('hr-v-major', e.major);
  set('hr-v-career', e.career_history);
  set('hr-v-certifications', e.certifications);
  set('hr-v-language', e.language_skills);
  set('hr-v-marital', e.marital_status);
  set('hr-v-military', e.military_status);
  set('hr-v-special', e.special_notes);

  // 인사카드 수정 이력 아코디언
  _hrRenderHistory(e);

  // 계약 이력
  const tb = document.getElementById('hr-view-contracts-tbody');
  if (tb) {
    const cts = (allContracts || []).filter(c => c.employee_id === empId && !c.is_draft)
      .sort((a, b) => String(b.contract_start || '').localeCompare(String(a.contract_start || '')));
    if (!cts.length) {
      tb.innerHTML = '<tr><td colspan="4" class="cen-empty">근로계약 이력이 없습니다</td></tr>';
    } else {
      const today = fmtLocalDate(new Date());
      tb.innerHTML = cts.map(c => {
        const { badge: stBadge, label: stName } = calcContractStatusDisplay(c, today);
        const end = c.terminate_date || c.contract_end || '현재';
        const period = `${c.contract_start || '-'} ~ ${end}`;
        return `<tr>
          <td style="font-size:12px;${(c.status === CONTRACT_STATUS.VOIDED || c.is_voided_by_amend) ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${_hrEsc(period)}</td>
          <td style="font-size:12px;">${contractTypeLabel(c.contract_type) || '-'}</td>
          <td><span class="badge ${stBadge}">${stName}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn btn-sm btn-indigo" onclick="_hrActView('${c.id}')"><i class="fas fa-search"></i> 조회</button>
            ${c.edited_file_url
              ? `<a class="btn btn-sm btn-danger" style="text-decoration:none;" href="${c.edited_file_url}" target="_blank" title="관리자가 업로드한 최종 PDF 보기"><i class="fas fa-file-pdf"></i> 계약서</a>`
              : `<button class="btn btn-sm btn-indigo" disabled title="업로드된 PDF 파일이 없습니다"><i class="fas fa-file-contract"></i> 계약서</button>`}
          </td>
        </tr>`;
      }).join('');
    }
  }

const modal = document.getElementById('hr-emp-view-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('open'); }
}

/** 인사카드 수정 이력 아코디언 렌더 (근로계약 이력 아래) — 이력 없으면 섹션 숨김 */
function _hrRenderHistory(e) {
  const section = document.getElementById('hr-history-section');
  const body = document.getElementById('hr-history-body');
  const toggle = document.getElementById('hr-history-toggle');
  if (!section || !body) return;
  const hist = _hrParseHistory(e && e.hr_edit_history);
  if (!hist.length) {
    section.style.display = 'none';
    body.style.display = 'none';
    if (toggle) toggle.innerHTML = '<i class="fas fa-chevron-down"></i> 펼치기';
    return;
  }
  section.style.display = '';
  body.style.display = 'none';
  if (toggle) toggle.innerHTML = '<i class="fas fa-chevron-down"></i> 펼치기';
  const _f = v => (v === '' || v == null) ? '-' : String(v);
  body.innerHTML = hist.slice().reverse().map(h => {
    const at = h.at ? new Date(h.at) : null;
    const timeStr = at && !isNaN(at) ? at.toLocaleString('ko-KR', { hour12: false }) : (h.at || '');
    const kindLabel = h.kind === 'contract' ? '근로계약' : h.kind === 'create' ? '등록' : '수정';
    const badgeCls = h.kind === 'contract' ? 'badge-indigo' : h.kind === 'create' ? 'badge-green' : 'badge-blue';
    const fields = Array.isArray(h.fields) ? h.fields : [];
    const detail = fields.map(f => `
      <div style="font-size:12px;color:#475569;padding:3px 0;">
        <span style="font-weight:600;color:#1e293b;">${_hrEsc(f.label)}</span>
        <span style="color:#94a3b8;"> ${_hrEsc(_f(f.before))}</span>
        <i class="fas fa-arrow-right" style="color:#94a3b8;margin:0 5px;"></i>
        <span style="color:#2563eb;">${_hrEsc(_f(f.after))}</span>
      </div>`).join('');
    return `<div style="border:1px solid #e8eaed;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#fff;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="badge ${badgeCls}">${kindLabel}</span>
        <span style="font-size:12px;color:#6b7280;">${_hrEsc(timeStr)}</span>
        ${h.summary ? `<span style="font-size:12px;color:#334155;">${_hrEsc(h.summary)}</span>` : ''}
      </div>
      ${detail ? `<div style="margin-top:6px;border-top:1px dashed #e8eaed;padding-top:6px;">${detail}</div>` : ''}
    </div>`;
  }).join('');
}

/** 수정 이력 펼치기/접기 */
function _hrToggleHistory() {
  const body = document.getElementById('hr-history-body');
  const toggle = document.getElementById('hr-history-toggle');
  if (!body || !toggle) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : '';
  toggle.innerHTML = open ? '<i class="fas fa-chevron-down"></i> 펼치기' : '<i class="fas fa-chevron-up"></i> 접기';
}

function closeHrEmployeeView() {
  const modal = document.getElementById('hr-emp-view-modal');
  if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
  _hrViewEmpId = null;
}

/**
 * 조회 모달 퇴사일자 표시 규칙
 *  - 일반 직원: 유효 계약 있으면 항목 숨김 / 만료·해지일이 당일 이하인 경우 확정 퇴사일 readonly 표시
 *  - 대표자·등기임원·특수관계인: 계약 없으면 직접 입력 가능 / 계약 있으면 계약 기준 readonly
 *    단, 비퇴사 대표자가 본인뿐(단일 대표)이면 항목 숨김
 */
function _hrSetupViewResign(e){
  const wrap = document.getElementById('hr-v-resign-wrap');
  const input = document.getElementById('hr-v-resign');
  if(!wrap || !input) return;
  const pType = personnelTypeOf(e);
  const today = fmtLocalDate(new Date());
  const cts = (allContracts||[]).filter(c => c.employee_id === e.id && !c.is_draft && !c.is_voided_by_amend);
  const LIVE = new Set([
    CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.PENDING, CONTRACT_STATUS.DOCS_INCOMPLETE,
    CONTRACT_STATUS.RENEWAL_PENDING, CONTRACT_STATUS.TERMINATE_PENDING,
  ]);
  const live = cts.filter(c => LIVE.has(c.status));
  // 확정 퇴사일자: 해지일(terminate_date) 우선, 없으면 만료일(contract_end) — 당일 이하만
  let confirmed = null;
  cts.filter(c => [CONTRACT_STATUS.TERMINATED, CONTRACT_STATUS.EXPIRED].includes(c.status)).forEach(c => {
    const d = c.terminate_date || c.contract_end || '';
    if(d && d <= today && (!confirmed || d > confirmed)) confirmed = d;
  });

  if(pType === PERSONNEL_TYPE.EMPLOYEE){
    if(live.length){ wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    input.value = confirmed || e.resign_date || '';
    input.readOnly = true;
    return;
  }

  // 대표자 본인: 퇴사 가능 여부 판단
  //  - 대표자가 본인뿐(복수 개념 아님)이면 항목 숨김
  //  - 비퇴사 대표자가 본인뿐인 상태(마지막 남은 대표)이면 항목 숨김
  //  - 이미 퇴사일자가 설정된 본인은 되돌릴 수 있도록 표시
  if(pType === PERSONNEL_TYPE.REPRESENTATIVE){
    const allReps = (allEmployees||[]).filter(x =>
      x.company_id === e.company_id && personnelTypeOf(x) === PERSONNEL_TYPE.REPRESENTATIVE
    );
    if(allReps.length <= 1){ wrap.style.display = 'none'; return; }
    const activeReps = allReps.filter(x => !x.resign_date);
    if(!e.resign_date && activeReps.length <= 1){ wrap.style.display = 'none'; return; }
  }

  if(live.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  if(confirmed){
    input.value = confirmed;
    input.readOnly = true; // 계약 기준 확정 퇴사일자
  } else {
    input.value = e.resign_date || '';
    input.readOnly = false; // 계약 없음 → 직접 입력 활성
  }
}

/** 조회 모달에서 퇴사일자 직접 입력 저장 */
async function _hrViewResignChange(){
  const input = document.getElementById('hr-v-resign');
  const empId = _hrViewEmpId;
  if(!input || !empId) return;
  const val = input.value || '';
  try {
    const _emp = (allEmployees || []).find(x => x.id === empId);
    const _hist = _hrParseHistory(_emp && _emp.hr_edit_history);
    _hist.push({
      at: new Date().toISOString(), kind: 'edit',
      fields: [{ label: '퇴사일자', before: _emp?.resign_date || '', after: val }],
    });
    await api(`../tables/employees/${empId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resign_date: val, hr_edit_history: _hist }),
    });
    await loadEmployees();
    renderHrEmployees();
    toast(val ? `퇴사일자(${val})가 저장되었습니다. 고객사 정보에서 제외됩니다.` : '퇴사일자가 해제되었습니다.', 'success');
  } catch(err){
    console.warn('[_hrViewResignChange]', err);
    toast('퇴사일자 저장 중 오류가 발생했습니다.', 'error');
  }
}

// ── 인원 구분 변경 시 연동 UI ──
function _hrOnPersonnelTypeChange() {
  const type = document.getElementById('hr-em-personnel-type')?.value || PERSONNEL_TYPE.EMPLOYEE;
  const relWrap = document.getElementById('hr-em-relationship-wrap');
  if (relWrap) relWrap.style.display = type === PERSONNEL_TYPE.RELATED ? '' : 'none';
  // 담당업무·부서·직책 잠금은 직원(계약 없음)에만 적용
  if (type === PERSONNEL_TYPE.EMPLOYEE) {
    const _emp = _hrEditEmpId ? (allEmployees || []).find(x => x.id === _hrEditEmpId) : null;
    const _hasCt = _emp ? (allContracts || []).some(c => c.employee_id === _emp.id && !c.is_draft) : false;
    _hrSetContractFieldsLock(!_hasCt);
  } else {
    _hrSetContractFieldsLock(false);
  }
}

// ── 신규/편집 폼 모달 ──
// presetCompanyId: 신규 등록 시 고객사 강제 지정 (계약 모달에서 호출 시 사용)
function openHrEmployeeForm(empId, presetCompanyId) {
  closeHrEmployeeView(); // 조회 모달이 열려 있으면 닫고 편집 모달로 전환
  _hrEditEmpId = empId || null;
  const isEdit = !!empId;

  // ── 7종 리셋: 값 / 표시 / 체크 / readonly / 힌트 / 상태 / 오류 ──
  const textIds = ['hr-em-empno','hr-em-name','hr-em-job','hr-em-dept','hr-em-position','hr-em-hire',
    'hr-em-id','hr-em-foreign-id','hr-em-nationality','hr-em-residence-status','hr-em-occupation',
    'hr-em-phone','hr-em-email','hr-em-address','hr-em-bank','hr-em-account',
    'hr-em-education','hr-em-major','hr-em-language','hr-em-marital','hr-em-military',
    'hr-em-emergency-contact','hr-em-emergency-relation','hr-em-relationship'];
  textIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['hr-em-career','hr-em-certifications','hr-em-special-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  { const el = document.getElementById('hr-em-category'); if (el) { el.value = ''; el.disabled = true; } }
  { const el = document.getElementById('hr-em-personnel-type'); if (el) el.value = PERSONNEL_TYPE.EMPLOYEE; }
  { const el = document.getElementById('hr-em-gender'); if (el) el.value = ''; }
  { const el = document.getElementById('hr-em-tax-dependents'); if (el) el.value = 1; }
  // 내국인/외국인 구분 초기화 (기본: 내국인)
  { const _rk = document.querySelector('input[name="hr-em-id-type"][value="korean"]'); if (_rk) _rk.checked = true; }
  document.querySelectorAll('input[name="hr-em-id-type"]').forEach(r => { r.disabled = false; });
  _hrOnIdTypeChange();
  // 담당업무·부서·직책: 기본 해제 (아래에서 계약 보유 여부에 따라 재잠금)
  _hrSetContractFieldsLock(false);
  // 등록 후 수정 불가 필드 잠금 — 사원번호는 항상 readonly (자동부여), 이름·주민번호는 신규 모드에서만 입력
  ['hr-em-name','hr-em-id'].forEach(id => { const el = document.getElementById(id); if (el) el.readOnly = false; });
  { const el = document.getElementById('hr-em-empno'); if (el) { el.readOnly = true; el.style.background = '#f1f5f9'; } }
  { const el = document.getElementById('hr-em-empno-auto-hint'); if (el) { el.style.display = 'none'; el.textContent = ''; } }

  { const el = document.getElementById('hr-em-empno-alert'); if (el) { el.className = 'va-hint'; el.innerHTML = ''; } }
  { const el = document.getElementById('hr-em-name-dup-alert'); if (el) { el.className = 'va-hint'; el.innerHTML = ''; } }
  { const el = document.getElementById('hr-em-gender-hint'); if (el) { el.textContent = '주민번호 입력 시 자동 설정됩니다'; el.style.color = '#6b7280'; } }
  { const el = document.getElementById('hr-form-error'); if (el) { el.className = 'va-hint'; el.textContent = ''; } }
  // 이전 세션 포맷 힌트 제거
  document.querySelectorAll('#hr-emp-form-modal .id-format-hint, #hr-emp-form-modal .phone-format-hint, #hr-emp-form-modal .email-format-hint').forEach(el => el.remove());

  const titleEl = document.getElementById('hr-form-title');
  const coId = isEdit ? ((allEmployees || []).find(x => x.id === empId) || {}).company_id : (presetCompanyId || _hrSelectedCoId);
  const hiddenCo = document.getElementById('hr-em-company');
  if (hiddenCo) hiddenCo.value = coId || '';

  if (isEdit) {
    const e = (allEmployees || []).find(x => x.id === empId);
    if (!e) { toast('직원 정보를 찾을 수 없습니다.', 'error'); return; }
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-pencil-alt"></i> 개인정보 편집 — ${_hrEsc(e.name)}`;
    document.getElementById('hr-em-empno').value = e.employee_number || '';
    document.getElementById('hr-em-name').value = e.name || '';
    document.getElementById('hr-em-gender').value = e.gender === 'female' ? 'female' : 'male';
    document.getElementById('hr-em-category').value = e.employment_category || '';
    document.getElementById('hr-em-job').value = e.job_description || '';
    document.getElementById('hr-em-dept').value = e.department || '';
    document.getElementById('hr-em-position').value = e.position || '';
    document.getElementById('hr-em-hire').value = e.hire_date || '';
    document.getElementById('hr-em-id').value = e.id_number || '';
    // ── 내국인/외국인 구분 복원 (2026-09-01 규칙): 저장값 글자 수 기준 ──
    //   내국인 = 주민등록번호 앞 7자리만 저장, 외국인 = 외국인등록번호 전체 13자리 저장
    const _idDigits = String(e.id_number || '').replace(/[^0-9]/g, '');
    const _isForeignEmp = _idDigits.length >= 13;
    { const _tr = document.querySelector(`input[name="hr-em-id-type"][value="${_isForeignEmp ? 'foreign' : 'korean'}"]`); if (_tr) _tr.checked = true; }
    document.querySelectorAll('input[name="hr-em-id-type"]').forEach(r => { r.disabled = true; });
    if (_isForeignEmp) {
      { const el = document.getElementById('hr-em-foreign-id'); if (el) el.value = e.id_number || ''; }
      { const el = document.getElementById('hr-em-id'); if (el) el.value = ''; }
      { const el = document.getElementById('hr-em-nationality'); if (el) el.value = e.nationality || ''; }
      { const el = document.getElementById('hr-em-residence-status'); if (el) el.value = e.residence_status || ''; }
      { const el = document.getElementById('hr-em-occupation'); if (el) el.value = e.occupation || ''; }
    }
    _hrOnIdTypeChange();
    { const el = document.getElementById('hr-em-gender'); if (el) el.value = e.gender === 'female' ? 'female' : 'male'; }
    document.getElementById('hr-em-phone').value = e.phone || '';
    document.getElementById('hr-em-email').value = e.email || '';
    document.getElementById('hr-em-address').value = e.address || '';
    document.getElementById('hr-em-tax-dependents').value = e.tax_dependents != null ? e.tax_dependents : 1;
    document.getElementById('hr-em-bank').value = e.bank_name || '';
    document.getElementById('hr-em-account').value = e.bank_account || '';
    document.getElementById('hr-em-education').value = e.education || '';
    document.getElementById('hr-em-major').value = e.major || '';
    document.getElementById('hr-em-career').value = e.career_history || '';
    document.getElementById('hr-em-certifications').value = e.certifications || '';
    document.getElementById('hr-em-language').value = e.language_skills || '';
    document.getElementById('hr-em-marital').value = e.marital_status || '';
    document.getElementById('hr-em-military').value = e.military_status || '';
    document.getElementById('hr-em-emergency-contact').value = e.emergency_contact || '';
    document.getElementById('hr-em-emergency-relation').value = e.emergency_relation || '';
    document.getElementById('hr-em-special-notes').value = e.special_notes || '';
    // 등록 후 수정 불가 필드 잠금 (사원번호·이름·주민등록번호 앞7자리)
    ['hr-em-empno','hr-em-name','hr-em-id','hr-em-foreign-id'].forEach(id => { const el = document.getElementById(id); if (el) el.readOnly = true; });
    { const el = document.getElementById('hr-em-empno-auto-hint'); if (el) { el.style.display = 'block'; el.textContent = '🔒 사원번호는 수정할 수 없습니다.'; } }
    const _ptEl = document.getElementById('hr-em-personnel-type');
    if (_ptEl) _ptEl.value = personnelTypeOf(e);
    document.getElementById('hr-em-relationship').value = e.relationship || '';
    // 직원이면서 근로계약이 없으면 담당업무·부서·직책 잠금 (근로계약에서 등록됨)
    const _hasCt = (allContracts || []).some(c => c.employee_id === empId && !c.is_draft);
    _hrSetContractFieldsLock(personnelTypeOf(e) === PERSONNEL_TYPE.EMPLOYEE && !_hasCt);
  } else {
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-user-plus"></i> 신규 직원 등록`;
    // 신규 직원: 계약 없음 → 담당업무·부서·직책 잠금 (근로계약 등록 후 자동 기재)
    _hrSetContractFieldsLock(true);
    // 신규 직원: 사번 원장 기준 max+1 자동 부여 (readonly — 수정 불가, append-only 정책)
    if (typeof _suggestEmpNo === 'function') {
      const _empNoEl = document.getElementById('hr-em-empno');
      if (_empNoEl && !_empNoEl.value && coId) {
        _empNoEl.value = _suggestEmpNo(coId);
        _empNoEl.readOnly = true;
        _empNoEl.style.background = '#f1f5f9';
      }
    }
    { const el = document.getElementById('hr-em-empno-auto-hint'); if (el) { el.style.display = 'block'; el.textContent = '🔒 자동으로 부여됩니다.'; } }
  }

  _hrOnPersonnelTypeChange();

  const modal = document.getElementById('hr-emp-form-modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('open'); }
}

function closeHrEmployeeForm() {
  const modal = document.getElementById('hr-emp-form-modal');
  if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
  _hrEditEmpId = null;
}

/** 담당업무·부서·직책 잠금 토글 (근로계약에서 등록되는 항목) */
function _hrSetContractFieldsLock(locked) {
  ['hr-em-job', 'hr-em-dept', 'hr-em-position'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = locked;
  });
  const hint = document.getElementById('hr-em-job-hint');
  if (hint) {
    hint.style.display = locked ? '' : 'none';
    hint.textContent = '근로계약서가 입력되면 자동으로 기재됩니다.';
  }
}

// ── 사원번호 중복 검사 (회사 내 unique) ──
function hrCheckEmpNoUniqueness() {
  const el = document.getElementById('hr-em-empno');
  const alertEl = document.getElementById('hr-em-empno-alert');
  if (!el || !alertEl) return;
  const empNo = (el.value || '').trim();
  const coId = document.getElementById('hr-em-company')?.value || '';
  if (!empNo) { alertEl.className = 'va-hint'; alertEl.innerHTML = ''; return; }

  const dup = (allEmployees || []).find(e =>
    e.company_id === coId && String(e.employee_number || '').trim() === empNo && e.id !== _hrEditEmpId);
  if (dup) {
    alertEl.className = 'va-hint va-err';
    alertEl.innerHTML = `<span>✗ 동일 고객사에 같은 사원번호(${_hrEsc(dup.name)})가 이미 등록되어 있습니다.</span>`;
    return;
  }
  // 사번 원장 재사용 금지 (C11)
  if (typeof _elnReuseInfo === 'function') {
    const _reuse = _elnReuseInfo(coId, empNo, _hrEditEmpId);
    if (_reuse.blocked) {
      alertEl.className = 'va-hint va-err';
      alertEl.innerHTML = `<span>✗ ${_hrEsc(_reuse.reason)}</span>`;
      return;
    }
  }
  alertEl.className = 'va-hint va-ok';
  alertEl.innerHTML = '<span>✓ 사용 가능한 사원번호입니다.</span>';
}

// ── 동일인 제안 (이름 + 주민번호 앞7자리, 비차단 안내) ──
function _hrCheckDuplicateName() {
  const alertEl = document.getElementById('hr-em-name-dup-alert');
  if (!alertEl) return;
  const name = (document.getElementById('hr-em-name')?.value || '').trim();
  const idNumber = (typeof _hrActiveIdValue === 'function') ? _hrActiveIdValue() : (document.getElementById('hr-em-id')?.value || '').trim();
  const coId = document.getElementById('hr-em-company')?.value || '';
  const idPre = idNumber.replace(/[^0-9]/g, '').slice(0, 7);
  const nameKey = (typeof _ctNameKey === 'function') ? _ctNameKey(name) : name.replace(/[0-9]+$/, '').trim();
  if (!nameKey) { alertEl.className = 'va-hint'; alertEl.innerHTML = ''; return; }

  const candidates = (allEmployees || []).filter(e =>
    e.company_id === coId && e.id !== _hrEditEmpId &&
    (typeof _ctNameKey === 'function' ? _ctNameKey(e.name) : String(e.name || '').replace(/[0-9]+$/, '').trim()) === nameKey &&
    (!idPre || (e.id_number || '').replace(/[^0-9]/g, '').slice(0, 7) === idPre)
  );
  if (!candidates.length) { alertEl.className = 'va-hint'; alertEl.innerHTML = ''; return; }

  alertEl.className = 'va-hint va-info';
  alertEl.innerHTML = `<span>ℹ 동일한 이름·주민번호의 직원이 이미 등록되어 있습니다. 동일인이라면 신규 등록 대신 기존 직원을 사용해 주세요.</span>
    <div style="margin-top:4px;">${candidates.slice(0, 3).map(c =>
      `<span class="badge badge-indigo" style="margin:2px;">${_hrEsc(c.name)} (사번 ${_hrEsc(c.employee_number) || '-'})</span>`).join('')}</div>`;
}

// ── 주민번호/외국인번호 입력 (포맷 + 성별 자동) ──
function _hrOnIdInput(el) {
  const isForeign = (el.id === 'hr-em-foreign-id');
  if (isForeign) _hrFormatForeignId(el); else _formatIdInput(el);
  const val = el.value;
  let hint = el.parentElement.querySelector('.id-format-hint');
  if (!hint) {
    hint = document.createElement('span');
    hint.className = 'id-format-hint ct-hint-normal';
    el.parentElement.appendChild(hint);
  }
  const genderEl = document.getElementById('hr-em-gender');
  const genderHint = document.getElementById('hr-em-gender-hint');
  if (!val) {
    hint.textContent = '';
    hint.className = 'id-format-hint ct-hint-normal';
    if (genderEl) genderEl.value = '';
    if (genderHint) { genderHint.textContent = (isForeign ? '외국인등록번호' : '주민번호') + ' 입력 시 자동 설정됩니다'; genderHint.style.color = '#6b7280'; }
    return;
  }
  if (isForeign) {
    const digits = val.replace(/[^0-9]/g, '');
    if (!/^\d{6}-\d{1,7}$/.test(val)) {
      hint.textContent = digits.length < 6 ? `생년월일 ${6 - digits.length}자리 더 입력` : '하이픈(-) 뒤 번호 입력';
      hint.className = 'id-format-hint ct-hint-normal';
    } else if (digits.length < 13) {
      hint.textContent = `하이픈(-) 뒤 번호 ${13 - digits.length}자리 더 입력`;
      hint.className = 'id-format-hint ct-hint-normal';
    } else {
      const g = _inferForeignGender(digits);
      if (g) {
        hint.textContent = '✓ 형식 확인';
        hint.className = 'id-format-hint ct-hint-success';
        if (genderEl) genderEl.value = g;
        if (genderHint) { genderHint.textContent = (g === 'male' ? '남성' : '여성') + ' (자동 설정)'; genderHint.style.color = '#059669'; }
      } else {
        hint.textContent = '✗ 외국인등록번호 성별코드는 5·6·7·8 중 하나여야 합니다.';
        hint.className = 'id-format-hint ct-hint-error';
      }
    }
  } else {
    const { ok, msg } = _validateKoreanId(val);
    if (ok) {
      hint.textContent = '✓ 형식 확인';
      hint.className = 'id-format-hint ct-hint-success';
      const gCode = val.replace(/-/g, '').slice(6, 7);
      const g = _inferGender(gCode);
      if (g) {
        if (genderEl) genderEl.value = g;
        if (genderHint) { genderHint.textContent = (g === 'male' ? '남성' : '여성') + ' (자동 설정)'; genderHint.style.color = '#059669'; }
      }
    } else if (val.replace(/[^0-9]/g, '').length < 7) {
      const digits = val.replace(/[^0-9]/g, '');
      hint.textContent = digits.length < 6 ? `생년월일 ${6 - digits.length}자리 더 입력` : '하이픈(-) 뒤 성별코드(1~4) 입력';
      hint.className = 'id-format-hint ct-hint-normal';
    } else {
      hint.textContent = '✗ ' + msg;
      hint.className = 'id-format-hint ct-hint-error';
    }
  }
}

// ── 내국인/외국인 구분 헬퍼 ──
function _hrIdType() {
  return document.querySelector('input[name="hr-em-id-type"]:checked')?.value || 'korean';
}
function _hrActiveIdValue() {
  const el = _hrIdType() === 'foreign'
    ? document.getElementById('hr-em-foreign-id')
    : document.getElementById('hr-em-id');
  return (el && el.value ? el.value : '').trim();
}
function _hrOnIdTypeChange() {
  const t = _hrIdType();
  const kEl = document.getElementById('hr-em-korean-wrap');
  const fEl = document.getElementById('hr-em-foreign-wrap');
  const fxEl = document.getElementById('hr-em-foreign-extra-wrap');
  if (kEl) kEl.style.display = (t === 'korean') ? '' : 'none';
  if (fEl) fEl.style.display = (t === 'foreign') ? '' : 'none';
  if (fxEl) fxEl.style.display = (t === 'foreign') ? '' : 'none';
  document.querySelectorAll('#hr-emp-form-modal .id-format-hint').forEach(el => el.remove());
  // 활성 id가 비어있을 때만 성별 기본값 리셋 (수정 모드는 값 유지)
  const idVal = _hrActiveIdValue();
  const genderEl = document.getElementById('hr-em-gender');
  const genderHint = document.getElementById('hr-em-gender-hint');
  if (!idVal) {
    if (genderEl) genderEl.value = '';
    if (genderHint) { genderHint.textContent = (t === 'foreign' ? '외국인등록번호' : '주민번호') + ' 입력 시 자동 설정됩니다'; genderHint.style.color = '#6b7280'; }
  }
  if (typeof _hrCheckDuplicateName === 'function') _hrCheckDuplicateName();
}
function _hrFormatForeignId(el) {
  const prev = el.value;
  const digits = prev.replace(/[^0-9]/g, '').slice(0, 13);
  let next = '';
  if (digits.length <= 6) next = digits;
  else next = digits.slice(0, 6) + '-' + digits.slice(6);
  if (next !== prev) {
    const sel = el.selectionStart || 0;
    el.value = next;
    const newPos = Math.min(sel, next.length);
    el.setSelectionRange(newPos, newPos);
  }
}
/** 3자리 숫자 코드 전용 입력 (국적·직종코드 — 숫자만, 최대 3자리) */
function _hrOnNumericCodeInput(el) {
  const v = (el.value || '').replace(/[^0-9]/g, '').slice(0, 3);
  if (el.value !== v) el.value = v;
}
function _inferForeignGender(digits) {
  const n = parseInt((digits || '').charAt(6), 10);
  if (n === 5 || n === 7) return 'male';
  if (n === 6 || n === 8) return 'female';
  return null;
}
function _validateForeignId(val) {
  if (!val || !val.trim()) return { ok: false, msg: '외국인등록번호를 입력해 주세요.' };
  if (!/^\d{6}-\d{7}$/.test(val.trim()))
    return { ok: false, msg: '외국인등록번호는 6자리-7자리 (총 13자리) 형식으로 입력해 주세요.' };
  const gd = parseInt(val.replace(/\D/g, '').charAt(6), 10);
  if (![5, 6, 7, 8].includes(gd))
    return { ok: false, msg: '외국인등록번호 성별코드는 5·6·7·8 중 하나여야 합니다.' };
  return { ok: true, msg: '' };
}
function _validateKoreanId(val) {
  const r = _validateIdNumber(val);
  if (!r.ok) return r;
  const gd = parseInt(val.replace(/\D/g, '').charAt(6), 10);
  if (gd >= 5) return { ok: false, msg: '내국인 주민등록번호 성별코드는 1~4여야 합니다. (5~8은 외국인 — 외국인 선택)' };
  return { ok: true, msg: '' };
}
/** 체류자격 코드 조회 페이지 (새 창) */
function _hrOpenVisaCode() {
  window.open('pages/visa-code.html', '_blank', 'width=1000,height=780');
}

// ── 저장 ──
async function saveHrEmployee() {
  const get = id => document.getElementById(id)?.value?.trim() ?? '';
  const coId = get('hr-em-company');
  const empNo = get('hr-em-empno');
  const name = get('hr-em-name');
  const category = get('hr-em-category');
  const job = get('hr-em-job');
  const hire = get('hr-em-hire');
  const idType = _hrIdType();
  const idNumber = _hrActiveIdValue();
  const phone = get('hr-em-phone');
  const address = get('hr-em-address');
  const genderEl = document.getElementById('hr-em-gender');
  const gender = genderEl ? genderEl.value : 'male';
  const personnelType = document.getElementById('hr-em-personnel-type')?.value || PERSONNEL_TYPE.EMPLOYEE;
  const relationship = get('hr-em-relationship');
  const position = get('hr-em-position');

  // ── 검증 ──
  const errEl = document.getElementById('hr-form-error');
  const fail = msg => {
    if (errEl) { errEl.className = 'va-hint va-err'; errEl.textContent = '✗ ' + msg; }
    toast(msg, 'error');
  };
  if (!coId) return fail('고객사를 먼저 선택해 주세요.');
  if (!empNo) return fail('사원번호를 입력해 주세요.');
  if (!name) return fail('이름을 입력해 주세요.');
  // 고용형태·담당업무: 근로계약에서 등록 (잠금 해제 상태일 때만 필수)
  const _jobEl = document.getElementById('hr-em-job');
  if (_jobEl && !_jobEl.disabled && !job) return fail('담당업무를 입력해 주세요.');
  if (!idNumber) return fail(idType === 'foreign' ? '외국인등록번호를 입력해 주세요.' : '주민등록번호를 입력해 주세요.');
  if (idType === 'foreign') {
    if (!_validateForeignId(idNumber).ok) return fail(_validateForeignId(idNumber).msg);
  } else {
    if (!_validateKoreanId(idNumber).ok) return fail(_validateKoreanId(idNumber).msg);
  }
  if (phone && !_validatePhoneNumber(phone).ok) return fail('휴대전화번호 형식이 올바르지 않습니다.');
  if (!address) return fail('주소를 입력해 주세요.');
  if (personnelType === PERSONNEL_TYPE.EXECUTIVE && !position) return fail('등기임원 직책을 입력해 주세요.');
  if (personnelType === PERSONNEL_TYPE.RELATED && !relationship) return fail('대표자와의 관계를 입력해 주세요.');

  // 사원번호 중복 (회사 내) + 사번 원장 재사용 금지 (C11)
  const dup = (allEmployees || []).find(e =>
    e.company_id === coId && String(e.employee_number || '').trim() === empNo && e.id !== _hrEditEmpId);
  if (dup) return fail(`동일 고객사에 같은 사원번호(${dup.name})가 이미 등록되어 있습니다.`);
  if (typeof _elnReuseInfo === 'function') {
    const _reuse = _elnReuseInfo(coId, empNo, _hrEditEmpId);
    if (_reuse.blocked) return fail(_reuse.reason);
  }

  const body = {
    company_id: coId,
    employee_number: empNo,
    name,
    gender,
    job_description: job,
    department: get('hr-em-dept'),
    position: get('hr-em-position'),
    hire_date: hire,
    id_number: idNumber,
    phone,
    email: get('hr-em-email'),
    address,
    tax_dependents: parseInt(document.getElementById('hr-em-tax-dependents')?.value) || 1,
    bank_name: get('hr-em-bank'),
    bank_account: get('hr-em-account'),
    education: get('hr-em-education'),
    major: get('hr-em-major'),
    career_history: get('hr-em-career'),
    certifications: get('hr-em-certifications'),
    language_skills: get('hr-em-language'),
    marital_status: get('hr-em-marital'),
    military_status: get('hr-em-military'),
    emergency_contact: get('hr-em-emergency-contact'),
    emergency_relation: get('hr-em-emergency-relation'),
    special_notes: get('hr-em-special-notes'),
    nationality: (idType === 'foreign') ? get('hr-em-nationality') : '',
    residence_status: (idType === 'foreign') ? get('hr-em-residence-status') : '',
    occupation: (idType === 'foreign') ? get('hr-em-occupation') : '',
    personnel_type: personnelType,
    relationship,
    is_representative: personnelType === PERSONNEL_TYPE.REPRESENTATIVE ? 1 : 0,
  };

  const saveBtn = document.getElementById('hr-form-save-btn');
  const wasEdit = !!_hrEditEmpId;

  // ── 인사카드 수정 이력 기록 ──
  const _orig = wasEdit ? (allEmployees || []).find(x => x.id === _hrEditEmpId) : null;
  const _hist = _orig ? _hrParseHistory(_orig.hr_edit_history) : [];
  if (!wasEdit) {
    _hist.push({ at: new Date().toISOString(), kind: 'create', summary: '인사카드 등록' });
  } else if (_orig) {
    const _lbl = {
      employee_number: '사원번호', name: '이름', gender: '성별',
      job_description: '담당업무', department: '부서', position: '직책', hire_date: '입사일',
      phone: '휴대전화', email: '이메일', address: '주소', tax_dependents: '부양가족 수',
      bank_name: '은행명', bank_account: '계좌번호', education: '최종학력', major: '전공',
      career_history: '경력', certifications: '자격증', language_skills: '어학능력',
      marital_status: '결혼 여부', military_status: '병역',
      emergency_contact: '비상연락처', emergency_relation: '비상연락처 관계',
      special_notes: '특이사항', personnel_type: '구분', relationship: '관계',
      nationality: '국적', residence_status: '체류자격', occupation: '직종',
    };
    const _fields = [];
    Object.keys(_lbl).forEach(k => {
      const _b = _orig[k] == null ? '' : String(_orig[k]);
      const _a = body[k] == null ? '' : String(body[k]);
      if (_b !== _a) _fields.push({ label: _lbl[k], before: _b, after: _a });
    });
    if (_fields.length) _hist.push({ at: new Date().toISOString(), kind: 'edit', fields: _fields });
  }
  body.hr_edit_history = _hist;

  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }
  try {
    if (_hrEditEmpId) {
      await api(`../tables/employees/${_hrEditEmpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      const saved = await api('../tables/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, status: EMP_STATUS.ACTIVE })
      });
      _hrEditEmpId = saved?.id || null;
    }
    // ── 사번 원장 부여/동기화 (재사용 방지 append-only 정책) ──
    if (typeof _elnAssign === 'function' && _hrEditEmpId) {
      try {
        if (!wasEdit) {
          await _elnAssign(coId, empNo, _hrEditEmpId, personnelType);
        } else if (_orig && _orig.employee_number) {
          await _elnAssign(coId, _orig.employee_number, _hrEditEmpId, personnelType);
        }
      } catch (e) { console.warn('[HR 사번 원장 동기화 실패]', e); }
    }
    await loadEmployees();
    renderHrEmployees();
    const _savedEmpId = _hrEditEmpId;
    closeHrEmployeeForm();
    toast(`${name} — ${wasEdit ? '저장되었습니다.' : '등록되었습니다.'}`, 'success');
    // 대표자·등기임원·특수관계인은 고객사 정보와 동기화 (write-through)
    _hrSyncPersonnel(_savedEmpId, personnelType);
    // 계약 모달 등 외부 호출자 콜백 (신규 등록 직원을 근로자로 선택)
    if (typeof window._hrOnSaved === 'function') {
      try { window._hrOnSaved(_savedEmpId, wasEdit); } catch (e) { console.warn('[hrOnSaved]', e); }
      window._hrOnSaved = null;
    }
  } catch (e) {
    console.error('[saveHrEmployee]', e);
    toast('저장 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-check"></i> 저장'; }
  }
}

/**
 * 인원 구분별 고객사 정보 동기화 (write-through)
 *  - executive      → registered_executives upsert (사번 우선, 이름 차선)
 *  - related        → related_party_workers upsert
 *  - representative → companies.representatives JSON upsert
 */
async function _hrSyncPersonnel(empId, type) {
  try {
    const e = (allEmployees || []).find(x => x.id === empId);
    if (!e || !e.company_id) return;
    const empNo = String(e.employee_number || '').trim();

    if (type === PERSONNEL_TYPE.EXECUTIVE) {
      const rows = await api(`../tables/registered_executives?company_id=${e.company_id}`).then(r => r?.data || []).catch(() => []);
      const existing = rows.find(r => empNo && String(r.employee_number || '').trim() === empNo)
                    || rows.find(r => r.name === e.name);
      const body = {
        company_id: e.company_id, name: e.name, position: e.position || '', phone: e.phone || '',
        email: e.email || '', id_number: e.id_number || '', employee_number: e.employee_number || '',
        bank_name: e.bank_name || '', bank_account: e.bank_account || '', bank_holder: e.name || '',
        updated_at: Date.now(),
      };
      if (existing) {
        await api(`../tables/registered_executives/${existing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        await api('../tables/registered_executives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: 'exec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), created_at: Date.now() }) });
      }
    } else if (type === PERSONNEL_TYPE.RELATED) {
      const rows = await api(`../tables/related_party_workers?company_id=${e.company_id}`).then(r => r?.data || []).catch(() => []);
      const existing = rows.find(r => empNo && String(r.employee_number || '').trim() === empNo)
                    || rows.find(r => r.name === e.name);
      const body = {
        company_id: e.company_id, name: e.name, relationship: e.relationship || '', phone: e.phone || '',
        email: e.email || '', id_number: e.id_number || '', employee_number: e.employee_number || '',
        bank_name: e.bank_name || '', bank_account: e.bank_account || '', bank_holder: e.name || '',
        updated_at: Date.now(),
      };
      if (existing) {
        await api(`../tables/related_party_workers/${existing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        await api('../tables/related_party_workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: 'rel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), created_at: Date.now() }) });
      }
    } else if (type === PERSONNEL_TYPE.REPRESENTATIVE) {
      const co = (allCompanies || []).find(c => c.id === e.company_id);
      if (co) {
        let reps = [];
        try { reps = typeof co.representatives === 'string' ? JSON.parse(co.representatives) : (co.representatives || []); } catch (err) { reps = []; }
        if (!Array.isArray(reps)) reps = [];
        const hit = reps.find(r => (empNo && String(r.employee_number || '').trim() === empNo) || r.name === e.name);
        if (hit) {
          Object.assign(hit, { name: e.name, phone: e.phone || hit.phone || '', email: e.email || hit.email || '', employee_number: e.employee_number || hit.employee_number || '' });
        } else {
          reps.push({ name: e.name, phone: e.phone || '', email: e.email || '', employee_number: e.employee_number || '' });
        }
        await api(`../tables/companies/${e.company_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ representatives: JSON.stringify(reps) }) });
        await loadCompanies();
      }
    }
  } catch (err) {
    console.warn('[_hrSyncPersonnel]', type, empId, err);
  }
}
