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

  let list = (allEmployees || []).filter(e => e.company_id === _hrSelectedCoId);
  if (statusFilter !== 'all') {
    list = list.filter(e => normalizeEmpStatus(e.status) === statusFilter);
  }
  if (q) {
    list = list.filter(e => {
      const hay = [e.name, e.employee_number, e.department, e.position].map(v => String(v || '').toLowerCase()).join(' ');
      return hay.includes(q);
    });
  }
  list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

  const cnt = document.getElementById('hr-emp-count');
  if (cnt) cnt.textContent = `재직 ${list.filter(e => normalizeEmpStatus(e.status) === EMP_STATUS.ACTIVE).length}명 / 퇴직 ${list.filter(e => normalizeEmpStatus(e.status) === EMP_STATUS.RESIGNED).length}명`;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="cen-empty"><i class="fas fa-users"></i> 등록된 직원이 없습니다</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(e => {
    const st = normalizeEmpStatus(e.status);
    const stBadge = st === EMP_STATUS.RESIGNED ? 'badge-gray' : 'badge-green';
    const stLabel = st === EMP_STATUS.RESIGNED ? '퇴직' : '재직';
    const deptPos = [e.department, e.position].filter(v => v && String(v).trim()).join(' / ');
    return `<tr>
      <td style="font-weight:600;">${_hrEsc(e.name)}${e.is_representative ? ' <span class="badge badge-indigo">대표자</span>' : ''}</td>
      <td style="font-size:12px;text-align:center;">${genderLabel(e)}</td>
      <td style="font-size:12px;">${_hrEsc(e.employee_number) || '-'}</td>
      <td style="font-size:12px;">${_hrEsc(deptPos) || '-'}</td>
      <td style="font-size:12px;">${_hrEsc(e.hire_date) || '-'}</td>
      <td style="font-size:12px;">${_hrEsc(e.resign_date) || '-'}</td>
      <td style="font-size:12px;">${_hrEsc(e.phone) || '-'}</td>
      <td><span class="badge ${stBadge}">${stLabel}</span></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-indigo" onclick="openHrEmployeeView('${e.id}')"><i class="fas fa-search"></i> 조회</button>
        <button class="btn btn-sm btn-secondary" onclick="openHrEmployeeForm('${e.id}')"><i class="fas fa-pencil-alt"></i> 편집</button>
      </td>
    </tr>`;
  }).join('');
}

// ── 상세 조회 모달 ──
function openHrEmployeeView(empId) {
  const e = (allEmployees || []).find(x => x.id === empId);
  if (!e) return;
  _hrViewEmpId = empId;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };

  set('hr-view-title', '');
  const titleEl = document.getElementById('hr-view-title');
  if (titleEl) titleEl.innerHTML = `<i class="fas fa-id-card"></i> ${_hrEsc(e.name)} — 인사관리대장`;

  set('hr-v-empno', e.employee_number);
  set('hr-v-name', e.name + (e.is_representative ? ' (대표자)' : ''));
  set('hr-v-gender', genderLabel(e));
  set('hr-v-category', contractTypeLabel(e.employment_category) || '-');
  set('hr-v-job', e.job_description);
  set('hr-v-dept', e.department);
  set('hr-v-position', e.position);
  set('hr-v-hire', e.hire_date);
  set('hr-v-resign', e.resign_date);
  set('hr-v-rep', e.is_representative ? '예' : '아니오');
  set('hr-v-phone', e.phone);
  set('hr-v-email', e.email);
  set('hr-v-address', e.address);
  set('hr-v-emergency', [e.emergency_contact, e.emergency_relation].filter(Boolean).join(' (') + ([e.emergency_contact, e.emergency_relation].filter(Boolean).length ? ')' : ''));
  set('hr-v-bank', e.bank_name);
  set('hr-v-account', e.bank_account);
  set('hr-v-dependents', e.tax_dependents != null ? e.tax_dependents : e.dependents);
  set('hr-v-education', e.education);
  set('hr-v-major', e.major);
  set('hr-v-career', e.career_history);
  set('hr-v-certifications', e.certifications);
  set('hr-v-language', e.language_skills);
  set('hr-v-marital', e.marital_status);
  set('hr-v-military', e.military_status);
  set('hr-v-special', e.special_notes);

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
          <td><button class="btn btn-sm btn-indigo" onclick="viewContract('${c.id}')"><i class="fas fa-search"></i> 조회</button></td>
        </tr>`;
      }).join('');
    }
  }

  const modal = document.getElementById('hr-emp-view-modal');
  if (modal) modal.style.display = 'flex';
}

function closeHrEmployeeView() {
  const modal = document.getElementById('hr-emp-view-modal');
  if (modal) modal.style.display = 'none';
  _hrViewEmpId = null;
}

// ── 신규/편집 폼 모달 ──
function openHrEmployeeForm(empId) {
  _hrEditEmpId = empId || null;
  const isEdit = !!empId;

  // ── 7종 리셋: 값 / 표시 / 체크 / readonly / 힌트 / 상태 / 오류 ──
  const textIds = ['hr-em-empno','hr-em-name','hr-em-job','hr-em-dept','hr-em-position','hr-em-hire',
    'hr-em-id','hr-em-phone','hr-em-email','hr-em-address','hr-em-bank','hr-em-account',
    'hr-em-education','hr-em-major','hr-em-language','hr-em-marital','hr-em-military',
    'hr-em-emergency-contact','hr-em-emergency-relation'];
  textIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['hr-em-career','hr-em-certifications','hr-em-special-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  { const el = document.getElementById('hr-em-category'); if (el) el.value = ''; }
  { const el = document.getElementById('hr-em-gender'); if (el) el.value = 'male'; }
  { const el = document.getElementById('hr-em-tax-dependents'); if (el) el.value = 1; }
  { const el = document.getElementById('hr-em-is-rep'); if (el) el.checked = false; }

  { const el = document.getElementById('hr-em-empno-alert'); if (el) { el.className = 'va-hint'; el.innerHTML = ''; } }
  { const el = document.getElementById('hr-em-name-dup-alert'); if (el) { el.className = 'va-hint'; el.innerHTML = ''; } }
  { const el = document.getElementById('hr-em-gender-hint'); if (el) { el.textContent = '주민번호 입력 시 자동 설정됩니다'; el.style.color = '#6b7280'; } }
  { const el = document.getElementById('hr-form-error'); if (el) { el.className = 'va-hint'; el.textContent = ''; } }
  // 이전 세션 포맷 힌트 제거
  document.querySelectorAll('#hr-emp-form-modal .id-format-hint, #hr-emp-form-modal .phone-format-hint, #hr-emp-form-modal .email-format-hint').forEach(el => el.remove());

  const titleEl = document.getElementById('hr-form-title');
  const coId = isEdit ? ((allEmployees || []).find(x => x.id === empId) || {}).company_id : _hrSelectedCoId;
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
    document.getElementById('hr-em-is-rep').checked = !!e.is_representative;
  } else {
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-user-plus"></i> 신규 직원 등록`;
  }

  const modal = document.getElementById('hr-emp-form-modal');
  if (modal) modal.style.display = 'flex';
}

function closeHrEmployeeForm() {
  const modal = document.getElementById('hr-emp-form-modal');
  if (modal) modal.style.display = 'none';
  _hrEditEmpId = null;
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
  } else {
    alertEl.className = 'va-hint va-ok';
    alertEl.innerHTML = '<span>✓ 사용 가능한 사원번호입니다.</span>';
  }
}

// ── 동일인 제안 (이름 + 주민번호 앞7자리, 비차단 안내) ──
function _hrCheckDuplicateName() {
  const alertEl = document.getElementById('hr-em-name-dup-alert');
  if (!alertEl) return;
  const name = (document.getElementById('hr-em-name')?.value || '').trim();
  const idNumber = (document.getElementById('hr-em-id')?.value || '').trim();
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

// ── 주민번호 입력 (포맷 + 성별 자동) ──
function _hrOnIdInput(el) {
  _formatIdInput(el);
  const val = el.value;
  let hint = el.parentElement.querySelector('.id-format-hint');
  if (!hint) {
    hint = document.createElement('span');
    hint.className = 'id-format-hint ct-hint-normal';
    el.parentElement.appendChild(hint);
  }
  const genderHint = document.getElementById('hr-em-gender-hint');
  if (!val) {
    hint.textContent = '';
    hint.className = 'id-format-hint ct-hint-normal';
    if (genderHint) { genderHint.textContent = '주민번호 입력 시 자동 설정됩니다'; genderHint.style.color = '#6b7280'; }
    return;
  }
  const { ok, msg } = _validateIdNumber(val);
  if (ok) {
    hint.textContent = '✓ 형식 확인';
    hint.className = 'id-format-hint ct-hint-success';
    const gCode = val.replace(/-/g, '').slice(6, 7);
    const g = _inferGender(gCode);
    if (g) {
      const genderEl = document.getElementById('hr-em-gender');
      if (genderEl) genderEl.value = g;
      if (genderHint) { genderHint.textContent = (g === 'male' ? '남성' : '여성') + ' (자동 설정)'; genderHint.style.color = '#059669'; }
    }
  } else if (val.replace(/[^0-9]/g, '').length < 7) {
    const digits = val.replace(/[^0-9]/g, '');
    hint.textContent = digits.length < 6 ? `생년월일 ${6 - digits.length}자리 더 입력` : '하이픈(-) 뒤 성별코드(1~8) 입력';
    hint.className = 'id-format-hint ct-hint-normal';
  } else {
    hint.textContent = '✗ ' + msg;
    hint.className = 'id-format-hint ct-hint-error';
  }
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
  const idNumber = get('hr-em-id');
  const phone = get('hr-em-phone');
  const address = get('hr-em-address');
  const genderEl = document.getElementById('hr-em-gender');
  const gender = genderEl ? genderEl.value : 'male';

  // ── 검증 ──
  const errEl = document.getElementById('hr-form-error');
  const fail = msg => {
    if (errEl) { errEl.className = 'va-hint va-err'; errEl.textContent = '✗ ' + msg; }
    toast(msg, 'error');
  };
  if (!coId) return fail('고객사를 먼저 선택해 주세요.');
  if (!empNo) return fail('사원번호를 입력해 주세요.');
  if (!name) return fail('이름을 입력해 주세요.');
  if (!category) return fail('고용형태를 선택해 주세요.');
  if (!job) return fail('담당업무를 입력해 주세요.');
  if (!hire) return fail('입사일을 입력해 주세요.');
  if (!idNumber) return fail('주민등록번호를 입력해 주세요.');
  if (!_validateIdNumber(idNumber).ok) return fail('주민등록번호 형식이 올바르지 않습니다.');
  if (!phone) return fail('휴대전화번호를 입력해 주세요.');
  if (!_validatePhoneNumber(phone).ok) return fail('휴대전화번호 형식이 올바르지 않습니다.');
  if (!address) return fail('주소를 입력해 주세요.');

  // 사원번호 중복 (회사 내)
  const dup = (allEmployees || []).find(e =>
    e.company_id === coId && String(e.employee_number || '').trim() === empNo && e.id !== _hrEditEmpId);
  if (dup) return fail(`동일 고객사에 같은 사원번호(${dup.name})가 이미 등록되어 있습니다.`);

  const body = {
    company_id: coId,
    employee_number: empNo,
    name,
    gender,
    employment_category: category,
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
    is_representative: document.getElementById('hr-em-is-rep')?.checked ? 1 : 0,
  };

  const saveBtn = document.getElementById('hr-form-save-btn');
  const wasEdit = !!_hrEditEmpId;
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
    await loadEmployees();
    renderHrEmployees();
    closeHrEmployeeForm();
    toast(`${name} — ${wasEdit ? '저장되었습니다.' : '등록되었습니다.'}`, 'success');
  } catch (e) {
    console.error('[saveHrEmployee]', e);
    toast('저장 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-check"></i> 저장'; }
  }
}
