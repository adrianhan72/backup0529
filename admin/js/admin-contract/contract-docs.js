
// ── 계약 조회 모달 첨부 서류 섹션 렌더링 (업로드/삭제/미리보기/다운로드) ──
function _renderContractFilesSection(c){
  const existing = document.getElementById('ct-files-section');
  if(existing) existing.remove();
  const modalBody = document.querySelector('#contract-modal .modal-body');
  if(!modalBody || !c) return;

  const isVoided = !!(c.is_voided_by_amend);  // 수정재발행으로 파기된 계약서 여부

  const section = document.createElement('div');
  section.id = 'ct-files-section';
  section.className = 'ctf-section';

  // 파기된 계약서면 섹션 상단에 안내 배너 추가
  const voidedBannerHtml = isVoided ? `
    <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1.5px solid #fca5a5;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#991b1b;display:flex;align-items:center;gap:8px;">
      <i class="fas fa-ban" style="font-size:16px;color:#dc2626;flex-shrink:0;"></i>
      <div>
        <strong>파기된 계약서</strong> — 이 계약서는 수정 재발행으로 인해 파기 처리되었습니다.<br>
        <span style="font-size:11px;color:#b91c1c;">파기일시: ${c.voided_at ? new Date(c.voided_at).toLocaleString('ko-KR') : '—'}</span>
      </div>
    </div>` : '';

  section.innerHTML = `
    <div class="ctf-section-title">
      <i class="fas fa-paperclip" style="color:#6366f1;"></i>첨부 서류
    </div>
    ${voidedBannerHtml}
    ${_ctfMakeRow('signed',  c, '계약서 날인본',               'fas fa-file-signature', '#4f46e5', '#eff6ff', isVoided)}
    ${_ctfMakeRow('consent', c, '제3자 개인정보 제공 동의서 날인본', 'fas fa-shield-alt',    '#7c3aed', '#f5f3ff', false)}
  `;
  modalBody.appendChild(section);
}

// isVoidedFile=true: 날인본에 파기 워터마크 표시 (수정재발행으로 파기된 계약의 서명본)
function _ctfMakeRow(type, c, label, icon, color, bgColor, isVoidedFile=false){
  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
  const hasFile   = !!(c[dataField]);
  const fileName  = c[nameField] || '첨부파일';
  const isPdf     = hasFile && ((fileName.toLowerCase().endsWith('.pdf')) || (c[dataField]||'').startsWith('data:application/pdf'));
  const rowId     = `ctf-row-${type}`;
  const prevId    = `ctf-prev-${type}`;
  const inputId   = `ctf-input-${type}`;

  // 파기 날인본 배지
  const badgeHtml = hasFile
    ? (isVoidedFile
        ? `<span class="ctf-status-badge ctf-badge-voided"><i class="fas fa-ban"></i> 파기</span>`
        : `<span class="ctf-status-badge ctf-badge-ok"><i class="fas fa-check"></i> 등록됨</span>`)
    : `<span class="ctf-status-badge ctf-badge-none">미등록</span>`;

  const fileInfoHtml = hasFile
    ? `<div class="ctf-label-file" title="${_esc(fileName)}">${_esc(fileName)}</div>`
    : `<div class="ctf-label-none">업로드된 파일 없음</div>`;

  // 파기된 날인본: 미리보기/다운로드만 허용, 삭제·업로드 버튼 제거
  // 파기 파일이더라도 열람 가능하게 하되 편집 불가
  let actionBtns;
  if(isVoidedFile){
    actionBtns = hasFile ? `
      ${!isPdf ? `<button class="ctf-btn ctf-btn-preview-voided" onclick="_ctfTogglePreview('${prevId}',this)"><i class="fas fa-eye"></i> 원본 보기</button>` : ''}
      <button class="ctf-btn ctf-btn-download" onclick="_ctfDownload('${type}')"><i class="fas fa-download"></i> 다운로드</button>
    ` : `<span style="font-size:11.5px;color:#9ca3af;font-style:italic;">날인본 없음</span>`;
  } else if(hasFile) {
    actionBtns = `
      ${!isPdf ? `<button class="ctf-btn ctf-btn-preview" onclick="_ctfTogglePreview('${prevId}',this)"><i class="fas fa-eye"></i> 미리보기</button>` : ''}
      <button class="ctf-btn ctf-btn-download" onclick="_ctfDownload('${type}')"><i class="fas fa-download"></i> 다운로드</button>
      <button class="ctf-btn ctf-btn-delete"   onclick="_ctfDelete('${type}','${c.id}')"><i class="fas fa-trash-alt"></i> 삭제</button>
    `;
  } else {
    actionBtns = `<button class="ctf-btn ctf-btn-upload" onclick="document.getElementById('${inputId}').click()"><i class="fas fa-upload"></i> 업로드</button>`;
  }

  // 미리보기: 파기 파일이면 워터마크 오버레이 추가
  let previewHtml = '';
  if(hasFile && !isPdf){
    if(isVoidedFile){
      // 파기 워터마크 레이어
      previewHtml = `
        <div class="ctf-voided-wrap" id="${prevId}">
          <img src="${c[dataField]}" alt="${_esc(label)}">
          <div class="ctf-voided-overlay">
            <div class="ctf-voided-stamp">파 기</div>
          </div>
        </div>
        <div class="ctf-voided-banner">
          <i class="fas fa-exclamation-triangle"></i>
          이 날인본은 수정 재발행으로 인해 <strong>파기</strong>된 계약서의 사본입니다. 법적 효력이 없습니다.
        </div>`;
    } else {
      previewHtml = `<div class="ctf-preview-wrap" id="${prevId}"><img src="${c[dataField]}" alt="${_esc(label)}"></div>`;
    }
  }

  const rowClass = isVoidedFile ? 'ctf-row ctf-row-voided' : 'ctf-row';

  return `
    <div class="${rowClass}" id="${rowId}">
      <div class="ctf-row-header">
        <div class="ctf-row-icon" style="background:${isVoidedFile ? '#fff5f5' : bgColor};color:${isVoidedFile ? '#dc2626' : color};"><i class="${icon}"></i></div>
        <div class="ctf-row-label">
          <div class="ctf-label-title">${label}${badgeHtml}</div>
          ${fileInfoHtml}
        </div>
        <div class="ctf-row-actions">${actionBtns}</div>
      </div>
      <div class="ctf-uploading" id="ctf-loading-${type}">
        <i class="fas fa-spinner fa-spin"></i> 업로드 중...
      </div>
      ${previewHtml}
      ${!isVoidedFile ? `<input type="file" id="${inputId}" accept="image/*,.pdf" style="display:none;" onchange="_ctfUpload('${type}','${c.id}',this)">` : ''}
    </div>`;
}

// ── 미리보기 토글 (일반 + 파기 워터마크 래퍼 모두 지원) ──
function _ctfTogglePreview(prevId, btn){
  const wrap = document.getElementById(prevId);
  if(!wrap) return;
  const shown = wrap.style.display === 'block';
  wrap.style.display = shown ? 'none' : 'block';
  const isVoidedBtn = btn.classList.contains('ctf-btn-preview-voided');
  if(shown){
    btn.innerHTML = isVoidedBtn
      ? '<i class="fas fa-eye"></i> 원본 보기'
      : '<i class="fas fa-eye"></i> 미리보기';
  } else {
    btn.innerHTML = '<i class="fas fa-eye-slash"></i> 닫기';
  }
}

// ── 파일 업로드 ──
async function _ctfUpload(type, contractId, inputEl){
  const file = inputEl.files[0];
  if(!file) return;

  const MAX = 10 * 1024 * 1024; // 10MB
  if(file.size > MAX){ toast('파일 크기는 10MB 이하만 허용됩니다.', 'error'); inputEl.value=''; return; }

  const loadingEl = document.getElementById(`ctf-loading-${type}`);
  if(loadingEl) loadingEl.style.display = 'flex';

  try{
    const base64 = await _ctfToBase64(file);
    const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
    const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
    const body = { [nameField]: file.name, [dataField]: base64 };

    await fetch(`../tables/contracts/${contractId}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });

    // 로컬 캐시 갱신
    const idx = allContracts.findIndex(x => x.id === contractId);
    if(idx !== -1){ allContracts[idx][nameField] = file.name; allContracts[idx][dataField] = base64; }

    // ── 서류미비 → 유효 자동 전환 (양쪽 파일 모두 업로드 완료 시) ──
    const c = allContracts.find(x => x.id === contractId);
    if(c && c.status === CONTRACT_STATUS.DOCS_INCOMPLETE){
      if(c.signed_file_data && c.consent_file_data){
        await fetch(`../tables/contracts/${contractId}`, {
          method: 'PATCH',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ status: CONTRACT_STATUS.ACTIVE })
        });
        if(idx !== -1) allContracts[idx].status = CONTRACT_STATUS.ACTIVE;
      }
    }

    toast('파일이 업로드되었습니다.', 'success');
    // 섹션 재렌더링
    if(c) _renderContractFilesSection(c);
    // 업로드 모달도 갱신
    if(document.getElementById('contract-preview-modal')?.classList.contains('open')){
      _renderCpExistingFiles(c);
    }
    // 계약 목록 테이블 갱신 (서류미비 뱃지 반영)
    if(typeof renderContracts === 'function') renderContracts();

    // ── 고객사 인앱 알림 발송 (날인본/동의서 업로드) ──
    {
      const _ufCo  = allCompanies.find(x => x.id === c?.company_id) || {};
      const _ufEmp = allEmployees.find(x => x.id === c?.employee_id) || {};
      const _coRep = getCompanyRepGreeting(_ufCo);
      const _typeLabel = type === 'signed' ? '계약서 날인본' : '제3자 정보제공 동의서';
      if(c?.company_id){
        // 업로드 종류별 알림
        await _sendCompanyNotice({
          companyId  : c.company_id, companyName: _ufCo.company_name || '',
          noticeType : type === 'signed' ? 'contract_signed_uploaded' : 'contract_consent_uploaded',
          title      : `[서류 업로드] ${_ufEmp.name||''} — ${_typeLabel}이 업로드되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자의 서류가 업로드되었습니다.

■ 근로자: ${_ufEmp.name||''}
■ 업로드 서류: ${_typeLabel}
■ 파일명: ${file.name}
■ 업로드 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
          contractId : contractId,
          employeeId : c.employee_id, employeeName: _ufEmp.name || '',
          contractEnd: c.contract_end || '',
        });

        // 두 파일 모두 완비 시 → 계약 유효 전환 알림
        const _updatedC = allContracts.find(x => x.id === contractId);
        const _hasBoth = _updatedC?.signed_file_data && _updatedC?.consent_file_data;
        if(_hasBoth && c.status===CONTRACT_STATUS.DOCS_INCOMPLETE){
          await _sendCompanyNotice({
            companyId  : c.company_id, companyName: _ufCo.company_name || '',
            noticeType : 'contract_fully_documented',
            title      : `[계약 유효 전환] ${_ufEmp.name||''} — 모든 서류 완비, 계약이 유효합니다`,
            body       :
`안녕하세요${_coRep}.

소속 근로자의 계약 관련 서류가 모두 완비되어 계약이 유효 상태로 전환되었습니다.

■ 근로자: ${_ufEmp.name||''}
■ 고용형태: ${contractTypeLabel(c.contract_type)||c.contract_type||''}
■ 계약 기간: ${c.contract_start||''}${c.contract_end ? ' ~ ' + c.contract_end : ''}
■ 완비 서류: 계약서 날인본 + 제3자 정보제공 동의서
■ 전환 일시: ${new Date().toLocaleString('ko-KR')}

자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.

${_BRAND_SIG}`,
            contractId : contractId,
            employeeId : c.employee_id, employeeName: _ufEmp.name || '',
            contractEnd: c.contract_end || '',
          });
        }
      }
    }

  } catch(e){
    console.error('[파일 업로드 오류]', e);
    toast('업로드에 실패했습니다.', 'error');
  } finally{
    if(loadingEl) loadingEl.style.display = 'none';
    inputEl.value = '';
  }
}

// ── 파일 삭제 ──
async function _ctfDelete(type, contractId){
  const label = type === 'signed' ? '계약서 날인본' : '제3자 개인정보 제공 동의서 날인본';
  if(!confirm(`[${label} 삭제]\n\n삭제된 데이터는 복구할 수 없습니다.\n정말 삭제하시겠습니까?`)) return;

  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';

  try{
    const res = await fetch(`../tables/contracts/${contractId}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ [nameField]: '', [dataField]: '' })
    });
    if(!res.ok){ const err = await res.json().catch(()=>({})); throw new Error(err.error || `HTTP ${res.status}`); }

    // DB 재조회 후 목록 갱신 (로컬 캐시만 수정하면 필터/정렬 불일치 발생 가능)
    await loadContracts();
    if(typeof renderContracts === 'function') renderContracts();

    toast(`'${label}' 파일이 삭제되었습니다.`, 'success');
    const c = allContracts.find(x => x.id === contractId);
    if(c) _renderContractFilesSection(c);
    // 업로드 모달도 갱신
    if(document.getElementById('contract-preview-modal')?.classList.contains('open')){
      _renderCpExistingFiles(c);
    }

  } catch(e){
    toast('삭제에 실패했습니다.', 'error');
  }
}

// ── 파일 다운로드 ──
function _ctfDownload(type){
  const contractId = editId.contract;
  const c = allContracts.find(x => x.id === contractId);
  if(!c) return;
  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
  const a = document.createElement('a');
  a.href = c[dataField];
  a.download = c[nameField] || '첨부파일';
  a.click();
}

// ── File → Base64 변환 ──
function _ctfToBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── 서류 업로드 모달: DOM API로 파일 섹션 직접 생성 (innerHTML/inline onclick 의존성 제거) ──
function _renderCpExistingFiles(c){
  if(!c) return;
  const container = document.getElementById('cp-files-container');
  if(!container) return;
  // 기존 내용 제거
  container.innerHTML = '';

  const isVoided = !!(c.is_voided_by_amend);
  const files = [
    { type:'signed',  label:'계약서 날인본',               icon:'fas fa-file-signature', color:'#4f46e5', bg:'#eff6ff', voided:isVoided },
    { type:'consent', label:'제3자 개인정보 제공 동의서 날인본', icon:'fas fa-shield-alt',    color:'#7c3aed', bg:'#f5f3ff', voided:false    },
  ];

  files.forEach(f => {
    const row = _cpCreateFileRow(c, f.type, f.label, f.icon, f.color, f.bg, f.voided);
    container.appendChild(row);
  });

  // 푸터 버튼 숨김
  const finalBtn = document.getElementById('cp-btn-final');
  const wordBtn  = document.getElementById('cp-btn-word');
  const printBtn = document.getElementById('cp-btn-print');
  const skipRow  = document.getElementById('cp-skip-row');
  const noticeEl = document.getElementById('cp-upload-notice');
  if(finalBtn) finalBtn.style.display = 'none';
  if(wordBtn)  wordBtn.style.display  = 'none';
  if(printBtn) printBtn.style.display = 'none';
  if(skipRow)  skipRow.style.display  = 'none';
  if(noticeEl) noticeEl.style.display = 'none';
  const backBtn = document.querySelector('#contract-preview-modal .btn-secondary');
  if(backBtn) backBtn.innerHTML = '<i class="fas fa-times"></i> 닫기';
}

// ── 개별 파일 행 DOM 생성 ──
function _cpCreateFileRow(c, type, label, icon, color, bgColor, isVoidedFile){
  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
  const hasFile   = !!(c[dataField]);
  const fileName  = c[nameField] || '첨부파일';
  const isPdf     = hasFile && ((fileName.toLowerCase().endsWith('.pdf')) || (c[dataField]||'').startsWith('data:application/pdf'));

  const rowId  = `cp-row-${type}`;
  const prevId = `cp-prev-${type}`;
  const inputId= `cp-input-${type}`;

  const row = document.createElement('div');
  row.className = isVoidedFile ? 'ctf-row ctf-row-voided' : 'ctf-row';
  row.id = rowId;

  // ── row-header ──
  const header = document.createElement('div');
  header.className = 'ctf-row-header';

  // icon
  const iconDiv = document.createElement('div');
  iconDiv.className = 'ctf-row-icon';
  iconDiv.style.background = isVoidedFile ? '#fff5f5' : bgColor;
  iconDiv.style.color = isVoidedFile ? '#dc2626' : color;
  iconDiv.innerHTML = `<i class="${icon}"></i>`;

  // label
  const labelDiv = document.createElement('div');
  labelDiv.className = 'ctf-row-label';
  const titleDiv = document.createElement('div');
  titleDiv.className = 'ctf-label-title';
  titleDiv.textContent = label;
  // badge
  const badge = document.createElement('span');
  if(hasFile){
    if(isVoidedFile){
      badge.className = 'ctf-status-badge ctf-badge-voided';
      badge.innerHTML = '<i class="fas fa-ban"></i> 파기';
    } else {
      badge.className = 'ctf-status-badge ctf-badge-ok';
      badge.innerHTML = '<i class="fas fa-check"></i> 등록됨';
    }
  } else {
    badge.className = 'ctf-status-badge ctf-badge-none';
    badge.textContent = '미등록';
  }
  titleDiv.appendChild(badge);
  labelDiv.appendChild(titleDiv);
  // file name
  const fileDiv = document.createElement('div');
  if(hasFile){
    fileDiv.className = 'ctf-label-file';
    fileDiv.title = fileName;
    fileDiv.textContent = fileName;
  } else {
    fileDiv.className = 'ctf-label-none';
    fileDiv.textContent = '업로드된 파일 없음';
  }
  labelDiv.appendChild(fileDiv);

  // actions
  const actions = document.createElement('div');
  actions.className = 'ctf-row-actions';
  if(isVoidedFile){
    if(hasFile){
      if(!isPdf){
        const previewBtn = _cpCreateBtn('원본 보기', 'ctf-btn ctf-btn-preview-voided', 'fas fa-eye', () => _ctfTogglePreview(prevId, previewBtn));
        actions.appendChild(previewBtn);
      }
      const downloadBtn = _cpCreateBtn('다운로드', 'ctf-btn ctf-btn-download', 'fas fa-download', () => _ctfDownload(type));
      actions.appendChild(downloadBtn);
    } else {
      const noneSpan = document.createElement('span');
      noneSpan.style.cssText = 'font-size:11.5px;color:#9ca3af;font-style:italic;';
      noneSpan.textContent = '날인본 없음';
      actions.appendChild(noneSpan);
    }
  } else if(hasFile){
    if(!isPdf){
      const previewBtn = _cpCreateBtn('미리보기', 'ctf-btn ctf-btn-preview', 'fas fa-eye', function(){ _ctfTogglePreview(prevId, this); });
      actions.appendChild(previewBtn);
    }
    const downloadBtn = _cpCreateBtn('다운로드', 'ctf-btn ctf-btn-download', 'fas fa-download', () => _ctfDownload(type));
    actions.appendChild(downloadBtn);
    const deleteBtn = _cpCreateBtn('삭제', 'ctf-btn ctf-btn-delete', 'fas fa-trash-alt', () => _ctfDelete(type, c.id));
    actions.appendChild(deleteBtn);
  } else {
    const uploadBtn = _cpCreateBtn('업로드', 'ctf-btn ctf-btn-upload', 'fas fa-upload', () => document.getElementById(inputId).click());
    actions.appendChild(uploadBtn);
  }

  header.appendChild(iconDiv);
  header.appendChild(labelDiv);
  header.appendChild(actions);
  row.appendChild(header);

  // uploading spinner
  const loading = document.createElement('div');
  loading.className = 'ctf-uploading';
  loading.id = `ctf-loading-${type}`;
  loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';
  row.appendChild(loading);

  // preview
  if(hasFile && !isPdf){
    if(isVoidedFile){
      const voidedWrap = document.createElement('div');
      voidedWrap.className = 'ctf-voided-wrap';
      voidedWrap.id = prevId;
      const img = document.createElement('img');
      img.src = c[dataField];
      img.alt = label;
      voidedWrap.appendChild(img);
      const overlay = document.createElement('div');
      overlay.className = 'ctf-voided-overlay';
      overlay.innerHTML = '<div class="ctf-voided-stamp">파 기</div>';
      voidedWrap.appendChild(overlay);
      row.appendChild(voidedWrap);
      const banner = document.createElement('div');
      banner.className = 'ctf-voided-banner';
      banner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 이 날인본은 수정 재발행으로 인해 <strong>파기</strong>된 계약서의 사본입니다. 법적 효력이 없습니다.';
      row.appendChild(banner);
    } else {
      const previewWrap = document.createElement('div');
      previewWrap.className = 'ctf-preview-wrap';
      previewWrap.id = prevId;
      const img = document.createElement('img');
      img.src = c[dataField];
      img.alt = label;
      previewWrap.appendChild(img);
      row.appendChild(previewWrap);
    }
  }

  // hidden file input
  if(!isVoidedFile){
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = inputId;
    fileInput.accept = 'image/*,.pdf';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', function(){ _ctfUpload(type, c.id, this); });
    row.appendChild(fileInput);
  }

  return row;
}

// ── 버튼 생성 헬퍼 ──
function _cpCreateBtn(text, className, iconClass, clickHandler){
  const btn = document.createElement('button');
  btn.className = className;
  btn.innerHTML = `<i class="${iconClass}"></i> ${text}`;
  btn.addEventListener('click', clickHandler);
  return btn;
}

// ── 서류 업로드 모달: 신규 등록용 업로드 존 (임시 파일 저장) ──
function _renderCpRegistrationUpload(){
  const container = document.getElementById('cp-files-container');
  if(!container) return;
  container.innerHTML = `
    <!-- 계약서 날인본 -->
    <div style="margin-bottom:12px;">
      <div style="font-size:12.5px;font-weight:700;color:#374151;margin-bottom:8px;">
        <i class="fas fa-file-signature" style="color:#4f46e5;margin-right:6px;"></i>① 계약서 날인본
        <span id="cp-signed-check" style="display:none;color:#10b981;margin-left:8px;font-size:12px;"><i class="fas fa-check-circle"></i> 업로드 완료</span>
      </div>
      <div class="upload-zone" id="cp-upload-zone"
        onclick="document.getElementById('cp-file-input').click()"
        ondragover="event.preventDefault();this.style.borderColor='#6366f1';"
        ondragleave="this.style.borderColor='';"
        ondrop="handleContractFileDrop(event)">
        <div class="upload-zone-icon">📄</div>
        <div class="upload-zone-text">날인된 근로계약서를 업로드하세요</div>
        <div class="upload-zone-sub">JPG, PNG, PDF 지원 · 클릭 또는 드래그</div>
      </div>
      <input type="file" id="cp-file-input" accept="image/*,.pdf" style="display:none;" onchange="handleContractFileSelect(event)">
      <div class="upload-preview" id="cp-upload-preview" style="display:none;">
        <i class="fas fa-check-circle" style="color:#10b981;font-size:20px;"></i>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:#166534;" id="cp-upload-filename">파일명</div>
          <div style="font-size:11.5px;color:#4b7c59;" id="cp-upload-filesize">크기</div>
        </div>
        <button onclick="clearContractUpload()" class="btn btn-close"><i class="fas fa-times-circle"></i></button>
      </div>
    </div>
    <!-- 제3자 동의서 -->
    <div style="margin-bottom:12px;">
      <div style="font-size:12.5px;font-weight:700;color:#374151;margin-bottom:8px;">
        <i class="fas fa-shield-alt" style="color:#7c3aed;margin-right:6px;"></i>② 제3자 개인정보 제공 동의서 날인본
        <span id="cp-consent-check" style="display:none;color:#10b981;margin-left:8px;font-size:12px;"><i class="fas fa-check-circle"></i> 업로드 완료</span>
      </div>
      <div class="upload-zone" id="cp-consent-zone"
        onclick="document.getElementById('cp-consent-input').click()"
        ondragover="event.preventDefault();this.style.borderColor='#7c3aed';"
        ondragleave="this.style.borderColor='';"
        ondrop="handleConsentFileDrop(event)"
        style="border-color:#c4b5fd;">
        <div class="upload-zone-icon">🤝</div>
        <div class="upload-zone-text">제3자 개인정보 제공 동의서를 업로드하세요</div>
        <div class="upload-zone-sub">JPG, PNG, PDF 지원 · 클릭 또는 드래그</div>
      </div>
      <input type="file" id="cp-consent-input" accept="image/*,.pdf" style="display:none;" onchange="handleConsentFileSelect(event)">
      <div class="upload-preview" id="cp-consent-preview" style="display:none;border-color:#c4b5fd;background:#f5f3ff;">
        <i class="fas fa-check-circle" style="color:#7c3aed;font-size:20px;"></i>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:#4c1d95;" id="cp-consent-filename">파일명</div>
          <div style="font-size:11.5px;color:#6d28d9;" id="cp-consent-filesize">크기</div>
        </div>
        <button onclick="clearConsentUpload()" class="btn btn-close"><i class="fas fa-times-circle"></i></button>
      </div>
    </div>`;
  // 등록 모드: 푸터 버튼 표시
  const finalBtn = document.getElementById('cp-btn-final');
  const wordBtn  = document.getElementById('cp-btn-word');
  const printBtn = document.getElementById('cp-btn-print');
  const skipRow  = document.getElementById('cp-skip-row');
  const noticeEl = document.getElementById('cp-upload-notice');
  if(finalBtn) finalBtn.style.display = '';
  if(wordBtn)  wordBtn.style.display  = '';
  if(printBtn) printBtn.style.display = '';
  if(skipRow)  skipRow.style.display  = '';
  if(noticeEl) noticeEl.style.display = '';
  const backBtn = document.querySelector('#contract-preview-modal .btn-secondary');
  if(backBtn) backBtn.innerHTML = '← 수정하기';
}

// Base64 파일 다운로드 헬퍼 (레거시 호환)
function _downloadContractFile(encodedData, encodedName){
  const a = document.createElement('a');
  a.href     = decodeURIComponent(encodedData);
  a.download = decodeURIComponent(encodedName);
  a.click();
}

// ===================================================
// ── 계약서 자동완성 프로세스 ──
// ===================================================

// 단계바 상태 업데이트
function setContractStep(step){
  [1,2,3].forEach(n=>{
    const el = document.getElementById(`ct-step-${n}`);
    const line = document.getElementById(`ct-step-line-${n}`);
    if(!el) return;
    el.className = 'ct-step' + (n < step ? ' done' : n === step ? ' active' : '');
    if(line) line.className = 'ct-step-line' + (n < step ? ' done' : '');
  });
}

// 폼 유효성 간단 검사
// 계약서 미리보기 모달 열기
async function openContractPreview(){
  _resetUploadState();
  if(_ctValidate()) return;
  setContractStep(2);
  // 계약서 HTML 생성
  try { let html = generateContractHTML(); document.getElementById('ct-print-area').innerHTML = html; } catch(e){ console.error('[openContractPreview] generateContractHTML 오류:', e); }
  // 바로 저장
  setContractStep(3);
  if(typeof saveContract !== 'function'){ toast('saveContract 함수를 찾을 수 없습니다.', 'error'); return; }
  try { await saveContract(); } catch(e) {
    console.error('[openContractPreview] saveContract 오류:', e);
    toast('저장 중 오류: ' + (e.message || '알 수 없는 오류'), 'error');
  }
}

function closeContractPreview(){
  document.getElementById('contract-preview-modal').classList.remove('open');
  setContractStep(1);
  const finalBtn = document.getElementById('cp-btn-final');
  if(finalBtn){
    finalBtn.style.display = '';
    finalBtn.innerHTML = '<i class="fas fa-check-circle"></i> 최종 등록';
    finalBtn.onclick   = finalSaveContract;
    finalBtn.disabled  = true;
  }
  window._isAmendMode = false;
  window._amendNewContractId = null;
  // 업로드 전용 모드에서 닫을 때 계약 목록 갱신 (서류 상태 반영)
  if(window._cpUploadOnly){
    window._cpUploadOnly = false;
    if(typeof loadContracts === 'function') loadContracts().then(() => {
      if(typeof renderContracts === 'function') renderContracts();
    });
  }
}

function showCpTab(tab){
  // 탭 구조 제거됨 — upload body 항상 표시
  const uploadBody = document.getElementById('cp-body-upload');
  if(uploadBody) uploadBody.style.display = 'block';
}

// 최종 등록 버튼 활성화 조건 체크
function _updateFinalBtn(){
  const skip     = document.getElementById('cp-skip-upload')?.checked;
  const hasSigned  = !!window._contractSignedFile;
  const hasConsent = !!window._contractConsentFile;
  const btn = document.getElementById('cp-btn-final');
  // 수정재발행 모드: 날인본(계약서)만 필수 / 일반 등록: 스킵이면 무조건 활성, 아니면 두 파일 모두 필요
  if(window._isAmendMode){
    if(btn) btn.disabled = !hasSigned;
  } else {
    if(btn) btn.disabled = !(skip || (hasSigned && hasConsent));
  }
}

// ── 계약서 날인본 핸들러 ──
function handleContractFileSelect(e){
  const file = e.target.files[0];
  if(file) _setContractFile(file);
}
function handleContractFileDrop(e){
  e.preventDefault();
  e.currentTarget.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if(file) _setContractFile(file);
}
function _setContractFile(file){
  window._contractSignedFile = file;
  document.getElementById('cp-upload-filename').textContent = file.name;
  document.getElementById('cp-upload-filesize').textContent = (file.size/1024).toFixed(1) + ' KB';
  document.getElementById('cp-upload-preview').classList.add('show');
  document.getElementById('cp-upload-zone').style.display = 'none';
  const chk = document.getElementById('cp-signed-check');
  if(chk) chk.style.display = '';
  _updateFinalBtn();
}
function clearContractUpload(){
  window._contractSignedFile = null;
  document.getElementById('cp-file-input').value = '';
  document.getElementById('cp-upload-preview').classList.remove('show');
  document.getElementById('cp-upload-zone').style.display = '';
  const chk = document.getElementById('cp-signed-check');
  if(chk) chk.style.display = 'none';
  _updateFinalBtn();
}

// ── 제3자 개인정보 제공 동의서 핸들러 ──
function handleConsentFileSelect(e){
  const file = e.target.files[0];
  if(file) _setConsentFile(file);
}
function handleConsentFileDrop(e){
  e.preventDefault();
  e.currentTarget.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if(file) _setConsentFile(file);
}
function _setConsentFile(file){
  window._contractConsentFile = file;
  document.getElementById('cp-consent-filename').textContent = file.name;
  document.getElementById('cp-consent-filesize').textContent = (file.size/1024).toFixed(1) + ' KB';
  document.getElementById('cp-consent-preview').classList.add('show');
  document.getElementById('cp-consent-zone').style.display = 'none';
  const chk = document.getElementById('cp-consent-check');
  if(chk) chk.style.display = '';
  _updateFinalBtn();
}
function clearConsentUpload(){
  window._contractConsentFile = null;
  document.getElementById('cp-consent-input').value = '';
  document.getElementById('cp-consent-preview').classList.remove('show');
  document.getElementById('cp-consent-zone').style.display = '';
  const chk = document.getElementById('cp-consent-check');
  if(chk) chk.style.display = 'none';
  _updateFinalBtn();
}

// 스킵 체크박스 변경 시
document.addEventListener('DOMContentLoaded',()=>{
  const skip = document.getElementById('cp-skip-upload');
  if(skip) skip.addEventListener('change', _updateFinalBtn);
});

// 계약 미리보기 모달을 열 때마다 파일 전역변수 초기화
function _resetUploadState(){
  window._contractSignedFile  = null;
  window._contractConsentFile = null;
  // UI 초기화
  ['cp-file-input','cp-consent-input'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  ['cp-upload-preview','cp-consent-preview'].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('show'); });
  ['cp-upload-zone','cp-consent-zone'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display=''; });
  ['cp-signed-check','cp-consent-check'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
  const skip=document.getElementById('cp-skip-upload'); if(skip) skip.checked=false;
}

// File → Base64 변환 헬퍼
function _fileToBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result); // data:mime;base64,xxx
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 최종 등록 (saveContract 호출)
async function finalSaveContract(){
  setContractStep(3);
  document.getElementById('contract-preview-modal').classList.remove('open');
  try { await saveContract(); } catch(e){ console.error('[finalSaveContract] saveContract 오류:', e); toast('저장 중 오류가 발생했습니다: ' + e.message, 'error'); }
  // 모달 닫기 + 페이지 새로고침
  closeModal('contract-modal');
  await loadContracts(); await loadEmployees();
  renderContracts(); renderDashboard();
  toast('근로계약이 등록되었습니다.', 'success');
}

// ── 인쇄 ──
function printContract(){
  const html = document.getElementById('ct-print-area').innerHTML;
  const win = window.open('','_blank','width=960,height=800');
  const css = [
    '*{box-sizing:border-box;margin:0;padding:0;}',
    'body{font-family:\'Noto Sans KR\',sans-serif;font-size:13px;line-height:1.9;color:#1a1a1a;padding:30px 50px;max-width:840px;margin:0 auto;background:#fff;}',
    'h1{text-align:center;font-size:22px;font-weight:900;letter-spacing:6px;margin-bottom:4px;color:#0f172a;padding-bottom:8px;border-bottom:3px double #0f172a;}',
    '.doc-subtitle{text-align:center;font-size:12px;color:#64748b;margin-bottom:20px;margin-top:4px;}',
    '.doc-parties{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:18px;font-size:12.5px;line-height:1.8;}',
    '.doc-section{margin-bottom:16px;}',
    '.doc-section-title{font-size:13px;font-weight:800;color:#0f172a;background:#f1f5f9;border-left:4px solid #4f46e5;padding:5px 10px;margin-bottom:7px;border-radius:0 3px 3px 0;}',
    '.info-table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:12px;}',
    '.info-table th{background:#f8fafc;border:1px solid #cbd5e1;padding:6px 10px;font-weight:700;color:#374151;white-space:nowrap;width:30%;text-align:left;}',
    '.info-table td{border:1px solid #cbd5e1;padding:6px 10px;color:#1e293b;}',
    '.info-table tr.total-row th{background:#eff6ff;color:#1d4ed8;}',
    '.info-table tr.total-row td{background:#eff6ff;}',
    '.doc-note{font-size:11px;color:#64748b;margin-top:3px;padding-left:4px;line-height:1.6;}',
    '.doc-text{font-size:12.5px;margin:4px 0;line-height:1.9;}',
    '.doc-divider{border:none;border-top:1.5px dashed #cbd5e1;margin:14px 0;}',
    '.doc-insurance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px;}',
    '.insurance-item{border:1.5px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;font-size:12px;font-weight:600;color:#94a3b8;background:#f8fafc;}',
    '.insurance-item.active{border-color:#818cf8;color:#4f46e5;background:#eef2ff;}',
    '.ins-icon{display:block;font-size:14px;margin-bottom:1px;}',
    '.doc-sign-date{text-align:center;font-size:13px;margin:24px 0 16px;padding:10px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;color:#374151;line-height:1.9;}',
    '.doc-sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:0;}',
    '.doc-sign-box{border:1.5px solid #cbd5e1;border-radius:8px;padding:12px 14px;}',
    '.doc-sign-box .sign-title{font-size:12px;font-weight:800;color:#374151;margin-bottom:8px;text-align:center;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}',
    '.sign-info-table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:10px;}',
    '.sign-info-table th{background:#f8fafc;border:1px solid #e2e8f0;padding:4px 8px;font-weight:700;color:#374151;white-space:nowrap;width:30%;}',
    '.sign-info-table td{border:1px solid #e2e8f0;padding:4px 8px;color:#1e293b;}',
    '.sign-stamp-area{text-align:center;padding-top:2px;}',
    '.sign-stamp{width:56px;height:56px;border:2px dashed #cbd5e1;border-radius:50%;margin:0 auto 3px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;line-height:1.4;}',
    '.sign-label{font-size:10.5px;color:#94a3b8;}',
    '.highlight{font-weight:700;color:#1d4ed8;}',
    '@media print{@page{margin:18mm 16mm;}body{padding:0;font-size:12px;}.doc-section-title{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.info-table th{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.doc-sign{page-break-inside:avoid;}}'
  ].join('\n');
  const doc = '<!DOCTYPE html><html><he'+'ad><meta charset="UTF-8"><title>\uADFC\uB85C\uACC4\uC57D\uC11C</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">'
    + '<st'+'yle>'+css+'</st'+'yle>'
    + '</he'+'ad><bo'+'dy>'+html+'</bo'+'dy></ht'+'ml>';
  win.document.write(doc);
  win.document.close();
  setTimeout(()=>{ win.focus(); win.print(); }, 800);
}

// ── WORD(docx) 다운로드 ──
function downloadContractDocx(){
  // docx.js 라이브러리 동적 로드 후 생성
  if(!window.docx){
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js';
    s.onload = ()=>_buildDocx();
    document.head.appendChild(s);
  } else {
    _buildDocx();
  }
}

function _buildDocx(){
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, AlignmentType, BorderStyle, ShadingType,
          VerticalAlign, UnderlineType } = docx;

  const data = _collectContractData();
  const won = v => Number(v||0).toLocaleString('ko-KR')+'원';
  const FONT = '맑은 고딕';

  // ── 헬퍼 함수 ──
  const mkCell = (text, opts={}) => new TableCell({
    children:[new Paragraph({
      children:[new TextRun({text:String(text||''), bold:opts.bold||false, size:opts.size||22, font:FONT, color: opts.color||'000000'})],
      alignment: opts.align || AlignmentType.LEFT,
    })],
    shading: opts.shade ? {type:ShadingType.CLEAR, fill:'F0F4F8'} : undefined,
    margins:{top:80,bottom:80,left:120,right:120},
    width: opts.width ? {size:opts.width,type:WidthType.PERCENTAGE} : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
      bottom:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
      left:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
      right:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
    },
  });

  const infoRow = (label, value, highlightVal=false) => new TableRow({children:[
    mkCell(label, {bold:true, shade:true, width:32}),
    mkCell(value, {bold:highlightVal, color: highlightVal?'1D4ED8':'1E293B', width:68}),
  ]});

  const mkTable = (rows) => new Table({
    rows, width:{size:100,type:WidthType.PERCENTAGE},
    borders:{
      top:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
      bottom:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
      left:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
      right:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
      insideH:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
      insideV:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},
    },
  });

  const para = (text, opts={}) => new Paragraph({
    children:[new TextRun({text:String(text||''), size:opts.size||22, bold:opts.bold||false, font:FONT, color:opts.color||'1A1A1A'})],
    alignment: opts.align || AlignmentType.LEFT,
    spacing:{after:opts.after!=null?opts.after:100, before:opts.before||0},
    indent: opts.indent ? {left:opts.indent} : undefined,
  });

  const heading = (text) => new Paragraph({
    children:[new TextRun({text, bold:true, size:23, font:FONT, color:'0F172A'})],
    spacing:{before:240, after:100},
    border:{bottom:{style:BorderStyle.SINGLE,size:6,color:'6366F1',space:4}},
    shading:{type:ShadingType.CLEAR, fill:'F1F5F9'},
    indent:{left:120},
  });

  const note = (text) => new Paragraph({
    children:[new TextRun({text:'※ '+text, size:19, font:FONT, color:'64748B'})],
    spacing:{after:80},
    indent:{left:60},
  });

  const contractDate = data.contractStart || new Date().toISOString().slice(0,10);

  // ── 동적 조항 번호 카운터 (Word 문서용) ──
  let _wArtNo = 0;
  const wart = (title) => `제${++_wArtNo}조 ${title}`;

  // 수습 조건
  const hasProbation = (data.contractType===CONTRACT_TYPE.REGULAR_PROBATION||data.contractType===CONTRACT_TYPE.FIXED_PROBATION) && data.probationMonths > 0;
  const _probBasisDocx = (data.probationBasis||'salary') === 'minwage'
    ? `최저임금의 ${data.probationPct}%`
    : (data.probationBasis === 'direct'
      ? '직접 입력'
      : `약정 보수의 ${data.probationPct}%`);
  let probEndDate = '';
  if(hasProbation && data.contractStart){
    const st = new Date(data.contractStart);
    st.setMonth(st.getMonth() + parseInt(data.probationMonths));
    st.setDate(st.getDate()-1);
    probEndDate = st.toISOString().slice(0,10);
  }

  // 계약기간 표현
  let contractPeriod = '';
  if(data.isDaily){
    contractPeriod = `${data.contractStart} ~ ${data.contractEnd||'별도 지정'} (일용직)`;
  } else if(data.contractType===CONTRACT_TYPE.REGULAR||data.contractType===CONTRACT_TYPE.REGULAR_PROBATION){
    contractPeriod = `${data.contractStart}부터 기간의 정함 없음`;
  } else {
    contractPeriod = `${data.contractStart} ~ ${data.contractEnd||'미정'}`;
  }

  // 임금 행 조건부
  const salaryRows = [];
  if(!data.isDaily){
    if(data.annualSalary>0) salaryRows.push(infoRow('연봉', won(data.annualSalary)));
    salaryRows.push(infoRow('기본급', won(data.baseSalary), true));
    if(data.weeklyHol>0)     salaryRows.push(infoRow('주휴수당',          won(data.weeklyHol)));
    if(data.fixedOtPay>0)    salaryRows.push(infoRow('고정 연장근로수당', won(data.fixedOtPay)));
    if(data.fixedNightPay>0) salaryRows.push(infoRow('고정 야간근로수당', won(data.fixedNightPay)));
    if(data.fixedHolPay>0)   salaryRows.push(infoRow('고정 휴일근로수당', won(data.fixedHolPay)));
    if(data.positionAllowance>0) salaryRows.push(infoRow('직책수당', won(data.positionAllowance)));
    if(data.carMaintenance>0) salaryRows.push(infoRow('차량지원비', won(data.carMaintenance)));
    if(data.mealAllowance>0) salaryRows.push(infoRow('식대', won(data.mealAllowance)));
    if(data.researchAllowance>0) salaryRows.push(infoRow('연구보조비', won(data.researchAllowance)));
    if(data.siteAllowance>0) salaryRows.push(infoRow('현장수당', won(data.siteAllowance)));
    if(data.skillAllowance>0) salaryRows.push(infoRow('기술수당', won(data.skillAllowance)));
    if(data.licenseAllowance>0) salaryRows.push(infoRow('면허수당', won(data.licenseAllowance)));
    if(data.communicationAllowance>0) salaryRows.push(infoRow('통신비', won(data.communicationAllowance)));
    if(data.fitnessAllowance>0) salaryRows.push(infoRow('체력증진비', won(data.fitnessAllowance)));
    if(data.selfDevAllowance>0) salaryRows.push(infoRow('자기계발비', won(data.selfDevAllowance)));
    if(data.bookAllowance>0) salaryRows.push(infoRow('도서지원비', won(data.bookAllowance)));
    if(data.overseasAllowance>0) salaryRows.push(infoRow('해외근무수당', won(data.overseasAllowance)));
    if(data.otherAllowance>0) salaryRows.push(infoRow('기타수당', won(data.otherAllowance)));
    salaryRows.push(infoRow('월 약정임금 합계', won(data.monthlySalary), true));
    salaryRows.push(infoRow('통상시급', won(data.hourlyWage)+'/시간'));
  } else {
    salaryRows.push(infoRow('일급여', won(data.dailyWage), true));
  }
  salaryRows.push(infoRow('임금 지급일', data.payDay ? `매월 ${data.payDay}일` : '매월 말일'));
  salaryRows.push(infoRow('지급 방법', '근로자 명의 계좌 직접 입금'));

  const doc = new Document({
    creator:'대화인사노무파트너스',
    description:'표준 근로계약서',
    sections:[{
      properties:{
        page:{margin:{top:1000,bottom:1000,left:1200,right:1200}},
      },
      children:[
        // ── 제목 ──
        new Paragraph({
          children:[new TextRun({text:'근  로  계  약  서', bold:true, size:52, font:FONT, color:'0F172A'})],
          alignment:AlignmentType.CENTER, spacing:{after:60},
          border:{bottom:{style:BorderStyle.DOUBLE,size:8,color:'0F172A',space:6}},
        }),
        new Paragraph({
          children:[new TextRun({text:'( 표 준 근 로 계 약 서 )', size:22, font:FONT, color:'64748B'})],
          alignment:AlignmentType.CENTER, spacing:{after:280},
        }),

        // 전문
        new Paragraph({
          children:[
            new TextRun({text:data.companyName||'(회사명)', bold:true, size:22, font:FONT}),
            new TextRun({text:'(이하 "사업주"라 함)과 ', size:22, font:FONT}),
            new TextRun({text:data.empName||'(근로자)', bold:true, size:22, font:FONT}),
            new TextRun({text:'(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.', size:22, font:FONT}),
          ],
          spacing:{after:240},
          shading:{type:ShadingType.CLEAR, fill:'F8FAFC'},
          indent:{left:120, right:120},
          border:{
            top:{style:BorderStyle.SINGLE,size:4,color:'E2E8F0'},
            bottom:{style:BorderStyle.SINGLE,size:4,color:'E2E8F0'},
            left:{style:BorderStyle.SINGLE,size:4,color:'E2E8F0'},
            right:{style:BorderStyle.SINGLE,size:4,color:'E2E8F0'},
          },
        }),

        // ── 사업주 정보 ──
        heading('◼ 사업주 정보'),
        mkTable([
          infoRow('상호(사업장명)', data.companyName),
          infoRow('사업자등록번호', data.bizNumber),
          infoRow('소재지', data.companyAddr),
          infoRow('대표자(사용자)', data.representative),
        ]),

        // ── 근로자 정보 ──
        heading('◼ 근로자 정보'),
        mkTable([
          infoRow('성명', data.empName),
          infoRow('생년월일', data.idNumber ? data.idNumber.slice(0,6).replace(/(\d{2})(\d{2})(\d{2})/,'$1년 $2월 $3일생') : ''),
          infoRow('주소', data.address),
          infoRow('연락처', data.phone),
        ]),

        // ── 제1조 계약기간 ──
        heading(wart('【근로계약기간】')),
        mkTable([
          ...[infoRow('계약기간', contractPeriod)],
          ...(hasProbation ? [infoRow('수습기간', `${data.contractStart} ~ ${probEndDate} (${data.probationMonths}개월)\n수습임금 ${won(data.probationAmt)}/월 (${_probBasisDocx})`)] : []),
          infoRow('고용형태', contractTypeLabel(data.contractType)||data.contractType),
        ]),

        // ── 제2조 근무장소 ──
        heading(wart('【근무 장소 및 담당 업무】')),
        mkTable([
          infoRow('근무 장소', data.companyAddr||data.companyName),
          infoRow('담당 업무', data.jobDescription||'회사가 지정하는 업무'),
          ...(data.department ? [infoRow('부서', data.department)] : []),
          ...(data.position ? [infoRow('직책/직위', data.position)] : []),
        ]),

        // ── 제3조 근로시간 ──
        heading(wart('【근로시간 및 휴게시간】')),
        mkTable([
          infoRow('소정근로시간', `1일 ${data.hoursPerDay}시간 / 주 ${data.daysPerWeek}일 (주 ${data.weekHours}시간)`),
          infoRow('기본 근무시간', `${data.startTime} ~ ${data.endTime}`),
          infoRow('근무 요일', data.workDays||'월요일~금요일'),
          infoRow('휴게시간', data.breakInfo||'법정 기준에 따름'),
        ]),
        note('법정 근로시간(주 40시간)을 초과하는 연장근로는 당사자 합의 하에 실시하며, 근로기준법에 따라 가산 지급한다.'),

        // ── 제4조 임금 ──
        heading(wart('【임금】')),
        mkTable(salaryRows),
        note('제세공과금(4대 보험료, 소득세 등)은 관계법령에 따라 공제 후 지급한다.'),

        // ── 제5조 연차 (일용직 제외) ──
        ...(!data.isDaily ? [
          heading(wart('【연차 유급휴가】')),
          para(`연차 유급휴가는 근로기준법 제60조에 따라 부여하며, 1년간 80% 이상 출근한 근로자에게 ${data.annualLeave}일의 유급휴가를 준다.`),
          note('1년 미만 근로 또는 80% 미만 출근 시에는 1개월 개근 시 1일의 유급휴가를 부여한다.'),
        ] : []),

        // ── 제6조 계약서 교부 ──
        heading(wart('(근로계약서 교부)')),
        para('"사용자"는 근로계약을 체결함과 동시에 본 계약서를 사본하여 "근로자"의 교부요구와 관계없이 "근로자"에게 교부한다.'),

        // ── 제7조 기타 ──
        heading(wart('【기타】')),
        para('이 계약에 명시되지 않은 사항은 근로기준법 및 관계 법령, 사업장 취업규칙에서 정하는 바에 따른다.'),
       
        // ── 날짜 ──
        new Paragraph({
          children:[new TextRun({text:`위와 같이 근로계약을 체결하고 서명날인한다.    ${contractDate.replace(/-/g,'년 ').replace(/-/g,'월 ')}일`, size:22, font:FONT})],
          alignment:AlignmentType.CENTER, spacing:{before:400, after:240},
        }),

        // ── 서명란 ──
        new Table({
          rows:[
            new TableRow({children:[
              new TableCell({
                children:[
                  new Paragraph({children:[new TextRun({text:'사업주 (사용자)', bold:true, size:24, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:100}}),
                  new Paragraph({children:[new TextRun({text:`상호: ${data.companyName}`, size:21, font:FONT})], alignment:AlignmentType.CENTER}),
                  new Paragraph({children:[new TextRun({text:`주소: ${data.companyAddr}`, size:21, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:20}}),
                  new Paragraph({children:[new TextRun({text:`대표자: ${data.representative}`, size:21, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:120}}),
                  new Paragraph({children:[new TextRun({text:'(서명 또는 날인)', size:20, font:FONT, color:'94A3B8'})], alignment:AlignmentType.CENTER, spacing:{before:120}}),
                ],
                margins:{top:160,bottom:160,left:200,right:200},
                borders:{
                  top:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  bottom:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  left:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  right:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                },
              }),
              new TableCell({
                children:[
                  new Paragraph({children:[new TextRun({text:'근로자', bold:true, size:24, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:100}}),
                  new Paragraph({children:[new TextRun({text:`성명: ${data.empName}`, size:21, font:FONT})], alignment:AlignmentType.CENTER}),
                  new Paragraph({children:[new TextRun({text:`주소: ${data.address||''}`, size:21, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:20}}),
                  new Paragraph({children:[new TextRun({text:`연락처: ${data.phone||''}`, size:21, font:FONT})], alignment:AlignmentType.CENTER, spacing:{after:120}}),
                  new Paragraph({children:[new TextRun({text:'(서명 또는 날인)', size:20, font:FONT, color:'94A3B8'})], alignment:AlignmentType.CENTER, spacing:{before:120}}),
                ],
                margins:{top:160,bottom:160,left:200,right:200},
                borders:{
                  top:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  bottom:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  left:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                  right:{style:BorderStyle.SINGLE,size:6,color:'94A3B8'},
                },
              }),
            ]}),
          ],
          width:{size:100,type:WidthType.PERCENTAGE},
          columnWidths:[4500,4500],
        }),

        para(''),
        new Paragraph({
          children:[new TextRun({text:'본 계약서는 고용노동부 표준근로계약서 양식에 따라 작성되었습니다.', size:18, font:FONT, color:'94A3B8', italics:true})],
          alignment:AlignmentType.CENTER, spacing:{before:200},
        }),
      ]
    }]
  });

  Packer.toBlob(doc).then(blob=>{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `근로계약서_${data.empName}_${data.contractStart||'미정'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toast('WORD 파일이 다운로드됐습니다. (고용노동부 표준 양식)');
  });
}

// ── 폼 데이터 수집 ──
function _collectContractData(){
  const coId = document.getElementById('ct-company')?.value;
  // 계약 체결 시점 기준 고객사 스냅샷 사용 (수정 모드: 계약 시작일 기준)
  const _ctStartForSnap = document.getElementById('ct-start')?.value || document.getElementById('ct-em-hire')?.value || '';
  const _ctTsForSnap = _ctStartForSnap ? new Date(_ctStartForSnap).getTime() : 0;
  const company = (coId && typeof getCompanySnapshotAt === 'function')
    ? (getCompanySnapshotAt(coId, _ctTsForSnap) || allCompanies.find(c=>c.id===coId) || {})
    : (allCompanies.find(c=>c.id===coId)||{});
  // 고용형태는 인사정보 기준으로 읽음: 수정 모드는 ct-edit-em-category, 신규는 ct-em-category
  const _isEditModeCD = !!editId.contract;
  const ctType = _isEditModeCD
    ? (document.getElementById('ct-edit-em-category')?.value||'정규직')
    : (document.getElementById('ct-em-category')?.value||'정규직');
  const isEdit = !!editId.contract;
  const isDaily = ctType===CONTRACT_TYPE.DAILY;
  const isProbation = ctType===CONTRACT_TYPE.REGULAR_PROBATION || ctType===CONTRACT_TYPE.FIXED_PROBATION;

  // 직원 정보 (신규 vs 수정)
  let empName='', phone='', address='', idNumber='', jobDescription='', department='', position='';
  if(isEdit){
    const existC = allContracts.find(x=>x.id===editId.contract);
    const existE = existC ? allEmployees.find(e=>e.id===existC.employee_id) : null;
    empName       = document.getElementById('ct-edit-emp-name')?.value || existE?.name || '';
    phone         = document.getElementById('ct-edit-em-phone')?.value || existE?.phone || '';
    address       = document.getElementById('ct-edit-em-address')?.value || existE?.address || '';
    idNumber      = document.getElementById('ct-edit-em-id')?.value || existE?.id_number || '';
    jobDescription= document.getElementById('ct-edit-em-job')?.value || existE?.job_description || '';
    department    = document.getElementById('ct-edit-em-dept')?.value || existE?.department || '';
    position      = document.getElementById('ct-edit-em-position')?.value || existE?.position || '';
  } else {
    empName       = document.getElementById('ct-em-name')?.value || '';
    phone         = document.getElementById('ct-em-phone')?.value || '';
    address       = document.getElementById('ct-em-address')?.value || '';
    idNumber      = document.getElementById('ct-em-id')?.value || '';
    jobDescription= document.getElementById('ct-em-job')?.value || '';
    department    = document.getElementById('ct-em-dept')?.value || '';
    position      = document.getElementById('ct-em-position')?.value || '';
  }

  // 근무 스케줄 파싱
  const schedule = (typeof getScheduleJSON==='function') ? getScheduleJSON() : [];
  let activeDays = schedule.filter(s=>s.active);
  const dayNames = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};

  // ── schedule_json 중첩 구조(shifts[0].start) → 평면 구조(start/end) 변환 ──
  activeDays = activeDays.map(s => {
    const shift = (Array.isArray(s.shifts) && s.shifts.length > 0) ? s.shifts[0] : {};
    return {
      day: s.day, label: s.label,
      start: shift.start || s.start || '',
      end: shift.end || s.end || '',
      breaks: Array.isArray(shift.breaks) ? shift.breaks : (Array.isArray(s.breaks) ? s.breaks : []),
      brk_start: shift.brk_start || s.brk_start || '',
      brk_end: shift.brk_end || s.brk_end || ''
    };
  });

  // 요일별 시간 정리 (같은 시간대이면 대표만)
  const workDays = activeDays.map(s=>dayNames[s.day]||s.label).join(', ');
  const startTime = activeDays[0]?.start || '09:00';
  const endTime   = activeDays[0]?.end   || '18:00';

  // 휴게시간 상세 (일별)
  const breakSchedule = activeDays
    .filter(s=>s.brk_start && s.brk_end)
    .map(s=>{
      const [hs,ms] = (s.brk_start||'00:00').split(':').map(Number);
      const [he,me] = (s.brk_end  ||'00:00').split(':').map(Number);
      const mins = (he*60+me) - (hs*60+ms);
      return { day: s.day, label: dayNames[s.day]||s.label, brk_start: s.brk_start, brk_end: s.brk_end, brk_mins: mins };
    });

  // 대표 휴게시간 (첫 번째 활성 요일)
  const breakInfo = breakSchedule.length
    ? breakSchedule.map(b=>`${b.label} ${b.brk_start}~${b.brk_end} (${b.brk_mins}분)`).join(' / ')
    : '법정 기준에 따름';

  const hoursPerDay  = parseFloat(document.getElementById('ct-hours')?.value)||8;
  const daysPerWeek  = parseInt(document.getElementById('ct-days')?.value)||5;
  const weekHours    = Math.round(hoursPerDay * daysPerWeek * 10)/10;

  const monthlySalary = parseFloat(document.getElementById('ct-monthly-computed')?.textContent?.replace(/[^\d]/g,'')||0)||0;
  const weeklyHolText = document.getElementById('ct-weekly-hol-computed')?.textContent||'0원';
  const hourlyText    = document.getElementById('ct-hourly-computed')?.textContent||'0원/시간';

  // 수습 조건
  const probationMonths = isProbation ? parseInt(document.getElementById('ct-probation-months')?.value)||3 : 0;
  const probationPct    = isProbation ? parseFloat(document.getElementById('ct-probation-pct')?.value)||80 : 0;
  const probationAmt    = isProbation ? parseFloat(document.getElementById('ct-probation-amt')?.value)||0 : 0;
  const probationBasis  = isProbation ? (document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary') : 'salary';

  return {
    companyName:       company.company_name||'',
    bizNumber:         company.business_number||'',
    companyAddr:       company.address||'',
    representative:    getCompanyRepName(company),
    payDay:            company.pay_day||'',
    empName, phone, address, idNumber, jobDescription, department, position,
    contractStart:     document.getElementById('ct-start')?.value || document.getElementById('ct-em-hire')?.value || '',
    contractEnd:       document.getElementById('ct-end')?.value || document.getElementById('ct-em-expire')?.value || '',
    contractType:      ctType,
    hoursPerDay, daysPerWeek, weekHours,
    workDays, breakInfo, breakSchedule, startTime, endTime,
    baseSalary:        getAmountVal('ct-base'),
    dailyWage:         isDaily ? getAmountVal('ct-daily-wage') : 0,
    weeklyHol:         parseFloat(weeklyHolText.replace(/[^\d]/g,''))||0,
    fixedOtPay:        getAmountVal('ct-fixed-ot-pay'),
    fixedNightPay:     getAmountVal('ct-fixed-night-pay'),
    fixedHolPay:       getAmountVal('ct-fixed-hol-pay'),
    positionAllowance:   getAmountVal('ct-position'),
    carMaintenance:      getAmountVal('ct-car'),
    carPayType:          _getCTPayTypeVal('car'),
    remoteAreaAllowance: getAmountVal('ct-remote-area'),
    remoteAreaPayType:   'fixed', // 벽지수당 항상 통상임금 포함
    mealAllowance:       getAmountVal('ct-meal'),
    mealPayType:         _getCTPayTypeVal('meal'),
    researchAllowance:   getAmountVal('ct-research'),
    researchPayType:     _getCTPayTypeVal('research'),
    siteAllowance:       getAmountVal('ct-site')||0,
    skillAllowance:      getAmountVal('ct-skill')||0,
    licenseAllowance:    getAmountVal('ct-license')||0,
    communicationAllowance: getAmountVal('ct-communication')||0,
    communicationPayType:   _getCTPayTypeVal('communication'),
    fitnessAllowance:    getAmountVal('ct-fitness')||0,
    fitnessPayType:      _getCTPayTypeVal('fitness'),
    selfDevAllowance:    getAmountVal('ct-self-dev')||0,
    selfDevPayType:      _getCTPayTypeVal('self_dev'),
    bookAllowance:       getAmountVal('ct-book')||0,
    bookPayType:         _getCTPayTypeVal('book'),
    overseasAllowance:   getAmountVal('ct-overseas')||0,
    overseasPayType:     _getCTPayTypeVal('overseas'),
    monthlySalary,
    annualSalary:      getAmountVal('ct-annual-sal'),
    hourlyWage:        parseFloat(hourlyText.replace(/[^\d.]/g,''))||0,
    annualLeave:       document.getElementById('ct-annual')?.value||15,
    note:              document.getElementById('ct-note')?.value||'',
    isDaily,
    probationMonths, probationPct, probationAmt, probationBasis,
    insEmployment: true,
    insIndustrial: true,
    insPension:    true,
    insHealth:     true,
  };
}

// ── 계약서 HTML 생성 ──
function generateContractHTML(){
  const d = _collectContractData();
  const won = v => Number(v||0).toLocaleString('ko-KR');
  const isFixedType = (type) => (type || 'fixed') === 'fixed';
  const row = (label, value, highlight=false) => {
    const cellContent = highlight
      ? '<strong class="highlight">' + (value||'—') + '</strong>'
      : (value||'—');
    return '<tr><th>' + label + '</th><td>' + cellContent + '</td></tr>';
  };
  const today = new Date().toISOString().slice(0,10);
  const todayKr = new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  const contractDateKr = d.contractStart ? new Date(d.contractStart).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'}) : todayKr;

  // 수습 조건 계산
  const probMonths = d.probationMonths || 0;
  const probPct    = d.probationPct || 0;
  const probAmt    = d.probationAmt || 0;
  const probBasis  = d.probationBasis || 'salary'; // 'salary' | 'minwage'
  const hasProbation = (d.contractType ===CONTRACT_TYPE.REGULAR_PROBATION || d.contractType ===CONTRACT_TYPE.FIXED_PROBATION) && probMonths > 0;

  // 수습 종료일 계산
  let probEndDate = '';
  if(hasProbation && d.contractStart){
    const st = new Date(d.contractStart);
    st.setMonth(st.getMonth() + parseInt(probMonths));
    st.setDate(st.getDate() - 1);
    probEndDate = st.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  }
  // 수습 임금 기준 표시 문구
  const probBasisLabel = probBasis === 'minwage'
    ? `최저임금의 ${probPct}%`
    : (probBasis === 'direct'
      ? '직접 입력'
      : `약정 보수의 ${probPct}%`);

  // 근무요일 정리 (연속 표현)
  const dayOrder = ['mon','tue','wed','thu','fri','sat','sun'];
  const dayNamesFull = {mon:'월요일',tue:'화요일',wed:'수요일',thu:'목요일',fri:'금요일',sat:'토요일',sun:'일요일'};
  const dayNamesShort = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};

  // 휴게시간 정리
  const breakRows = d.breakSchedule || [];
  let breakHTML = '';
  if(breakRows.length){
    breakHTML = breakRows.map(b=>`${dayNamesShort[b.day]||b.day} ${b.brk_start}~${b.brk_end} (${b.brk_mins||60}분)`).join(', ');
  } else {
    breakHTML = `1일 근로시간 4시간 경우 30분, 8시간인 경우 1시간 이상 (법정 기준에 따름)`;
  }

  // 계약기간 표현
  let contractPeriodHTML = '';
  if(d.isDaily){
    contractPeriodHTML = `${d.contractStart} ~ ${d.contractEnd || '별도 지정'} (일용직)`;
  } else if(d.contractType ===CONTRACT_TYPE.REGULAR || d.contractType ===CONTRACT_TYPE.REGULAR_PROBATION){
    contractPeriodHTML = `${d.contractStart}부터 기간의 정함 없음`;
  } else {
    contractPeriodHTML = `${d.contractStart} ~ ${d.contractEnd || '미정'}`;
  }

  // 임금지급일
  const payDayStr = d.payDay ? ('매월 ' + d.payDay + '일') : '매월 말일';

  // 연봉 표현
  const annualStr = d.annualSalary && d.annualSalary > 0 ? ('연봉 ' + won(d.annualSalary) + '원') : '';

  // 생년월일 포맷 (백틱 중첩 방지용 사전 계산)
  const birthStr = (function(){
    if(!d.idNumber) return '';
    const s = String(d.idNumber).replace(/-/g,'');
    if(s.length < 6) return s;
    return s.slice(0,6).replace(/(\d{2})(\d{2})(\d{2})/, '$1년 $2월 $3일생');
  })();

  // ── 동적 조항 번호 카운터 ──
  let _artNo2 = 0;
  const art2 = (title) => `제${++_artNo2}조 ${title}`;
  
  return `
  <h1>근 로 계 약 서</h1>
  <div class="doc-subtitle">(표준근로계약서)</div>

  <div class="doc-parties">
    <p><strong>${d.companyName}</strong>(이하 "사업주"라 함)과 <strong>${d.empName || '(근로자명)'}</strong>(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">◼ 사업주 정보</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('상호(사업장명)', d.companyName)}
      ${row('사업자등록번호', d.bizNumber)}
      ${row('소재지(주소)', d.companyAddr)}
      ${row('대표자(사용자)', d.representative)}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">◼ 근로자 정보</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('성명', d.empName)}
      ${row('생년월일', birthStr)}
      ${row('주소', d.address)}
      ${row('연락처', d.phone)}
    </table>
  </div>

  <div class="doc-divider"></div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【근로계약기간】')}</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('계약기간', contractPeriodHTML)}
      ${d.contractEnd && !d.isDaily && d.contractType !==CONTRACT_TYPE.REGULAR && d.contractType !==CONTRACT_TYPE.REGULAR_PROBATION ? row('계약 종료일', d.contractEnd) : ''}
      ${row('고용형태', contractTypeLabel(d.contractType)||d.contractType)}
      ${hasProbation ? row('수습기간', `${d.contractStart} ~ ${probEndDate} (${probMonths}개월)<br>수습 임금 ${won(probAmt)}원/월 · ${probBasisLabel}`) : ''}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【근무 장소 및 담당 업무】')}</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('근무 장소', d.companyAddr || d.companyName)}
      ${row('담당 업무', d.jobDescription || '회사가 지정하는 업무')}
      ${d.department ? row('부서', d.department) : ''}
      ${d.position ? row('직책/직위', d.position) : ''}
    </table>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【근로시간 및 휴게시간】')}</div>
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('소정근로시간', `1일 <strong>${d.hoursPerDay}시간</strong> / 주 <strong>${d.daysPerWeek}일</strong> (주 <strong>${d.weekHours}시간</strong>)`)}
      ${row('기본 근무시간', `${d.startTime} ~ ${d.endTime}`)}
      ${row('근무 요일', d.workDays || '월요일 ~ 금요일')}
      ${row('휴게시간', breakHTML)}
    </table>
    <div class="doc-note">※ 법정 근로시간(주 40시간)을 초과하는 연장근로는 당사자 합의 하에 실시하며, 근로기준법에 따라 가산하여 지급한다.</div>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【임금】')}</div>
    ${d.isDaily ? `
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${row('일급여', `<strong class="highlight">${won(d.dailyWage)}원</strong>`)}
      ${row('임금 지급일', payDayStr + ' (현금 또는 계좌이체)')}
    </table>
    ` : `
    <table class="info-table">
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      ${annualStr ? row('연봉', `<strong>${won(d.annualSalary)}원</strong>`) : ''}
      ${row('기본급', `<strong class="highlight">${won(d.baseSalary)}원</strong>`)}
      ${d.weeklyHol > 0     ? row('주휴수당',          `${won(d.weeklyHol)}원`)     : ''}
      ${d.fixedOtPay > 0    ? row('고정 연장근로수당', `${won(d.fixedOtPay)}원`)    : ''}
      ${d.fixedNightPay > 0 ? row('고정 야간근로수당', `${won(d.fixedNightPay)}원`) : ''}
      ${d.fixedHolPay > 0   ? row('고정 휴일근로수당', `${won(d.fixedHolPay)}원`)   : ''}
      ${d.positionAllowance > 0 ? row('직책수당', `${won(d.positionAllowance)}원`) : ''}
      ${d.carMaintenance > 0      && isFixedType(d.carPayType)               ? row('차량지원비',    `${won(d.carMaintenance)}원`)         : ''}
      ${d.remoteAreaAllowance > 0                                              ? row('벽지수당',     `${won(d.remoteAreaAllowance)}원`)    : ''}
      ${d.mealAllowance > 0       && isFixedType(d.mealPayType)              ? row('식대',         `${won(d.mealAllowance)}원`)          : ''}
      ${d.researchAllowance > 0   && isFixedType(d.researchPayType)          ? row('연구활동비',   `${won(d.researchAllowance)}원`)      : ''}
      ${d.siteAllowance > 0                                                    ? row('현장수당',     `${won(d.siteAllowance)}원`)          : ''}
      ${d.skillAllowance > 0                                                   ? row('기술수당',     `${won(d.skillAllowance)}원`)         : ''}
      ${d.licenseAllowance > 0                                                 ? row('면허수당',     `${won(d.licenseAllowance)}원`)       : ''}
      ${d.communicationAllowance > 0 && isFixedType(d.communicationPayType)  ? row('통신비',       `${won(d.communicationAllowance)}원`) : ''}
      ${d.fitnessAllowance > 0    && isFixedType(d.fitnessPayType)           ? row('체력증진비',   `${won(d.fitnessAllowance)}원`)       : ''}
      ${d.selfDevAllowance > 0    && isFixedType(d.selfDevPayType)           ? row('자기계발비',   `${won(d.selfDevAllowance)}원`)       : ''}
      ${d.bookAllowance > 0       && isFixedType(d.bookPayType)              ? row('도서지원비',   `${won(d.bookAllowance)}원`)          : ''}
      ${d.overseasAllowance > 0   && isFixedType(d.overseasPayType)          ? row('해외근무수당', `${won(d.overseasAllowance)}원`)      : ''}
      <tr class="total-row"><th>월 약정임금 합계</th><td><strong class="highlight">${won(d.monthlySalary)}원</strong></td></tr>
      ${row('통상시급', `${won(d.hourlyWage)}원/시간`)}
      ${row('임금 지급일', payDayStr)}
      ${row('지급 방법', '근로자 명의 계좌 직접 입금')}
    </table>
    `}
    <div class="doc-note">※ 제세공과금(4대 보험료, 소득세 등)은 관계법령에 따라 공제 후 지급한다.</div>
  </div>

  ${!d.isDaily ? `
  <div class="doc-section">
    <div class="doc-section-title">${art2('【연차 유급휴가】')}</div>
    <p class="doc-text">연차 유급휴가는 <strong>근로기준법 제60조</strong>에 따라 부여하며, 1년간 80% 이상 출근한 근로자에게 <strong>${d.annualLeave}일</strong>의 유급휴가를 준다.</p>
    <div class="doc-note">※ 1년 미만 근로 또는 80% 미만 출근 시에는 1개월 개근 시 1일의 유급휴가를 부여한다.</div>
  </div>` : ''}

  <div class="doc-section">
    <div class="doc-section-title">${art2('【근로계약서 교부】')}</div>
    <p class="doc-text">"사용자"는 근로계약을 체결함과 동시에 본 계약서를 사본하여 "근로자"의 교부요구와 관계없이 "근로자"에게 교부한다.</p>
  </div>

  <div class="doc-section">
    <div class="doc-section-title">${art2('【기타】')}</div>
    <p class="doc-text">기타 본 계약서상 명시되지 않은 사항은 당사의 단체협약, 취업규칙, 근로기준법 및 관계법령에서 정하는 바에 따른다.</p>
  </div>

  <div class="doc-sign-date">
    위와 같이 근로계약을 체결하고 서명날인한다.<br>
    <strong>${contractDateKr}</strong>
  </div>

  <div class="doc-sign">
    <div class="doc-sign-box">
      <div class="sign-title">사업주 (사용자)</div>
      <table class="sign-info-table">
        <tr><th>상호</th><td>${d.companyName}</td></tr>
        <tr><th>주소</th><td>${d.companyAddr}</td></tr>
        <tr><th>대표자</th><td>${d.representative}</td></tr>
      </table>
      <div class="sign-stamp-area">
        <div class="sign-stamp"></div>
        <div class="sign-label">(서명 또는 날인)</div>
      </div>
    </div>
    <div class="doc-sign-box">
      <div class="sign-title">근로자</div>
      <table class="sign-info-table">
        <tr><th>성명</th><td>${d.empName}</td></tr>
        <tr><th>주소</th><td>${d.address || ''}</td></tr>
        <tr><th>연락처</th><td>${d.phone || ''}</td></tr>
      </table>
      <div class="sign-stamp-area">
        <div class="sign-stamp"></div>
        <div class="sign-label">(서명 또는 날인)</div>
      </div>
    </div>
  </div>
  `;
}

// ==============================================================
// ── 계약서 출력 전용 기능 (조회 모드에서 DB 데이터 직접 사용) ──
// ==============================================================

/**
 * 조회 모드에서 "계약서 출력" 버튼 클릭 시 호출
 * allContracts / allEmployees / allCompanies 전역 배열로 데이터 수집
 */
function openContractPrintModal(contractId){
  if(!contractId){ toast('계약 정보를 찾을 수 없습니다.'); return; }
  const c   = allContracts.find(x=>x.id===contractId);
  const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
  // 계약 체결 시점 기준 고객사 스냅샷 사용 (계약서에 당시 고객사 정보 반영)
  const _printCtTs = c?.contract_start ? new Date(c.contract_start).getTime() : (c?.created_at||0);
  const co  = c ? (getCompanySnapshotAt(c.company_id, _printCtTs) || allCompanies.find(x=>x.id===c.company_id)) : null;
  if(!c||!emp||!co){ toast('계약·직원·고객사 정보를 불러올 수 없습니다.'); return; }

  // c.contract_type 우선 참조 (채용확정 생성 계약예정은 c.contract_type이 실제 유형)
  // 계약예정 상태인 경우 수습 카테고리 정규화 (예: '계약직 수습' → '계약직')
  const _ctTypeRaw = c.contract_type || emp.employment_category || '정규직';
  const _ctTypeNorm = typeof normalizeContractType === 'function'
    ? normalizeContractType(_ctTypeRaw) : _ctTypeRaw;
  const _isPendingPrint = (c.status===CONTRACT_STATUS.PENDING);
  const _ctTypeFinal = _isPendingPrint
    ? (_ctTypeNorm ===CONTRACT_TYPE.REGULAR_PROBATION ? CONTRACT_TYPE.REGULAR : _ctTypeNorm ===CONTRACT_TYPE.FIXED_PROBATION ? CONTRACT_TYPE.FIXED : _ctTypeNorm)
    : _ctTypeNorm;
  const ctType = typeof contractTypeLabel === 'function'
    ? contractTypeLabel(_ctTypeFinal) : _ctTypeFinal;

  // 모달 타이틀·배지 업데이트
  const typeColor = {
    '정규직':'#2563eb','정규직 수습':'#0891b2','계약직':'#7c3aed',
    '계약직 수습':'#db2777','일용직':'#d97706'
  }[ctType]||'#374151';
  document.getElementById('cpm-title').textContent = `근로계약서 — ${emp.name}`;
  const badge = document.getElementById('cpm-type-badge');
  badge.textContent = ctType;
  badge.style.background = typeColor;

  // 계약서 HTML 생성 후 삽입
  let html;
  try{
    html = generateContractHTMLFromData(c, emp, co);
  } catch(err){
    console.error('[계약서 생성 오류] contractId:', contractId, err);
    toast('계약서 생성 중 오류가 발생했습니다. 계약 데이터를 확인해 주세요.\n(' + err.message + ')');
    return;
  }
  document.getElementById('cpm-doc-area').innerHTML = html;

  // 전역에 현재 계약 ID 저장 (PDF 다운로드·발송에서 사용)
  window._printingContractId  = contractId;
  window._printingEmpName     = emp.name;
  window._printingContractType= ctType;
  window._printingEmpId       = emp.id;
  window._printingEmpPhone    = emp.phone || '';
  window._printingEmpEmail    = emp.email || '';
  window._printingCompanyId   = co.id;
  window._printingCompanyName = co.company_name || '';
  window._printingContractStart = c.contract_start || '';
  window._printingContractEnd   = c.contract_end   || '';

  // ── 파기된 계약서 여부 확인 (status='파기' 또는 수정재발행으로 파기된 경우) ──
  const isVoided = (c.status===CONTRACT_STATUS.VOIDED) || !!(c.is_voided_by_amend);

  // ── 이메일 버튼: 이메일 등록 시에만 활성화 (파기 계약이면 비활성) ──
  const emailBtn = document.getElementById('cpm-email-btn');
  if(emailBtn){
    const hasEmail = !isVoided && !!(emp.email && emp.email.trim());
    emailBtn.disabled    = !hasEmail;
    emailBtn.style.cursor  = hasEmail ? 'pointer' : 'not-allowed';
    emailBtn.title = isVoided
      ? '파기된 계약서는 발송할 수 없습니다'
      : hasEmail
        ? `이메일 발송 (${emp.email})`
        : '이메일 미등록 — 직원 정보에 이메일을 먼저 등록하세요';
  }

  // ── 알림톡 버튼: 전화번호 등록 시에만 활성화 (파기 계약이면 비활성) ──
  const kakaoBtn = document.getElementById('cpm-kakao-btn');
  if(kakaoBtn){
    const hasPhone = !isVoided && !!(emp.phone && emp.phone.trim());
    kakaoBtn.disabled    = !hasPhone;
    kakaoBtn.style.cursor  = hasPhone ? 'pointer' : 'not-allowed';
    kakaoBtn.title = isVoided
      ? '파기된 계약서는 발송할 수 없습니다'
      : hasPhone
        ? `알림톡 발송 (${emp.phone})`
        : '전화번호 미등록 — 직원 정보에 전화번호를 먼저 등록하세요';
  }

  // ── 수동 교부 버튼: 파기 계약이면 비활성화 ──
  const manualBtn = document.getElementById('cpm-manual-btn');
  if(manualBtn){
    manualBtn.disabled   = isVoided;
    manualBtn.style.cursor  = isVoided ? 'not-allowed' : 'pointer';
    manualBtn.title = isVoided ? '파기된 계약서는 발송할 수 없습니다' : '출력물 직접 배부 완료 처리';
  }

  // ── 안내문구 동적 업데이트 (발송 이력 확인) ──
  _updateCpmGuide(contractId, isVoided, c.voided_at);

  // 모달 열기
  document.getElementById('contract-print-modal').classList.add('open');
}

/**
 * 계약서 조회 모달 안내문구: 발송 이력에 따라 동적 표시
 */
async function _updateCpmGuide(contractId, isVoided, voidedAt){
  const guideEl = document.getElementById('cpm-guide-text');
  if(!guideEl) return;
  const spanEl = guideEl.querySelector('span');
  if(!spanEl) return;

  // 파기된 계약서인 경우
  if(isVoided && voidedAt){
    const vDt = new Date(voidedAt);
    const vDtStr = !isNaN(vDt)
      ? `${vDt.getFullYear()}-${String(vDt.getMonth()+1).padStart(2,'0')}-${String(vDt.getDate()).padStart(2,'0')} ${String(vDt.getHours()).padStart(2,'0')}:${String(vDt.getMinutes()).padStart(2,'0')}`
      : voidedAt;
    spanEl.innerHTML = `• 수정 및 재발행으로 인한 파기일시: ${vDtStr}`;
    spanEl.style.color = '#ef4444';
    return;
  }

  // 발송 이력 조회
  let lastDispatch = null;
  try {
    await loadContractDispatchList();
    const list = window._contractDispatchList || [];
    const contractDispatches = list
      .filter(d => d.contract_id === contractId && d.dispatch_status === 'completed')
      .sort((a, b) => (b.dispatched_at || '').localeCompare(a.dispatched_at || ''));
    lastDispatch = contractDispatches[0] || null;
  } catch(e) { /* 무시 */ }

  if(lastDispatch){
    const dt = lastDispatch.dispatched_at ? new Date(lastDispatch.dispatched_at) : null;
    const dtStr = dt && !isNaN(dt) 
      ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
      : '-';
    const methodLabel = { kakao:'알림톡', email:'이메일', manual:'수동교부', direct:'직접배부' }[lastDispatch.dispatch_method] || lastDispatch.dispatch_method || '-';
    spanEl.innerHTML = `• 최종 발송 일시: ${dtStr}, 발송방식: ${methodLabel}<br>• 조회 모드에서 계약서와 제3자 정보제공동의서는 각 날인본을 업로드해서 보관할 수 있습니다.`;
    spanEl.style.color = '#64748b';
  } else {
    spanEl.innerHTML = `• <span style="color:#dc2626;font-weight:600;">(계약서 미발송)</span> 계약서는 반드시 근로자에게 알림톡 또는 이메일로 발송하거나 수동교부해야 합니다.<br>• 조회 모드에서 계약서와 제3자 정보제공동의서는 각 날인본을 업로드해서 보관할 수 있습니다.`;
    spanEl.style.color = '#64748b';
  }
}

function closeContractPrintModal(){
  const wasAmend = window._amendFromContractModal;
  document.getElementById('contract-print-modal').classList.remove('open');
  // 수정 재발행 완료 배너 제거
  const banner = document.getElementById('cpm-amend-banner');
  if(banner) banner.remove();
  // 수정 재발행 흐름에서 열린 경우 계약 수정 모달도 함께 닫기
  if(window._amendFromContractModal){
    window._amendFromContractModal = false;
    closeModal('contract-modal');
  }
  // 수정 재발행(또는 재계약/갱신) 후 목록과 대시보드 갱신
  if(wasAmend){
    loadContracts().then(() => {
      renderContracts();
      renderDashboard();
    });
  }
}

/** 계약서를 모달 없이 바로 새 창으로 열기 (수습관리 모달 등 중첩 방지용) */
function openContractInNewWindow(contractId){
  if(!contractId){ toast('계약 정보를 찾을 수 없습니다.'); return; }
  const c   = allContracts.find(x => x.id === contractId);
  const emp = c ? allEmployees.find(e => e.id === c.employee_id) : null;
  const co  = c ? allCompanies.find(x => x.id === c.company_id) : null;
  if(!c || !emp || !co){ toast('계약·직원·고객사 정보를 불러올 수 없습니다.'); return; }

  let html;
  try {
    html = generateContractHTMLFromData(c, emp, co);
  } catch(err){
    toast('계약서 생성 중 오류: ' + err.message);
    return;
  }

  const css = _getContractPrintCSS();
  const win = window.open('', '_blank', 'width=1000,height=820');
  if(!win){ toast('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.'); return; }
  const doc = '<!DOCTYPE html><html><he' + 'ad><meta charset="UTF-8">'
    + '<title>근로계약서 - ' + (emp.name || '') + '<\/title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">'
    + '<st' + 'yle>' + css + '<\/st' + 'yle>'
    + '<\/he' + 'ad><bo' + 'dy>' + html + '<\/bo' + 'dy><\/ht' + 'ml>';
  win.document.write(doc);
  win.document.close();
}

/** 계약서 인쇄 (새 창) */
function printContractDoc(){
  const html = document.getElementById('cpm-doc-area').innerHTML;
  const empName = window._printingEmpName || '근로자';
  const win = window.open('','_blank','width=1000,height=820');
  const css = _getContractPrintCSS();
  // 닫힘 태그를 문자열 연결로 분리 → 브라우저 HTML 파서 오작동 방지
  const doc = '<!DOCTYPE html><html><he'+'ad><meta charset="UTF-8">'
    + '<title>근로계약서 - ' + empName + '<\/title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">'
    + '<st'+'yle>' + css + '<\/st'+'yle>'
    + '<\/he'+'ad><bo'+'dy>' + html + '<\/bo'+'dy><\/ht'+'ml>';
  win.document.write(doc);
  win.document.close();
  setTimeout(()=>{ win.focus(); win.print(); }, 900);
}

/** PDF 저장 (html2canvas → jsPDF) */
async function downloadContractPdf(){
  const btn = document.getElementById('cpm-pdf-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 생성 중...'; }
  try {
    const docArea = document.getElementById('cpm-doc-area');
    // jsPDF / html2canvas는 이미 CDN으로 로드됨
    const { jsPDF } = window.jspdf;
    const canvas = await html2canvas(docArea, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW  = pageW;
    const imgH  = (canvas.height * imgW) / canvas.width;

    let posY = 0;
    let remainH = imgH;
    let page = 0;
    while(remainH > 0){
      if(page > 0) pdf.addPage();
      // 현재 페이지에 그릴 높이
      const drawH = Math.min(pageH, remainH);
      // 이미지의 y오프셋 (mm단위)
      pdf.addImage(imgData, 'PNG', 0, -posY, imgW, imgH);
      posY    += pageH;
      remainH -= pageH;
      page++;
    }

    const empName = window._printingEmpName || '근로자';
    const ctType  = window._printingContractType || '';
    const today   = new Date().toISOString().slice(0,10).replace(/-/g,'');
    pdf.save(`근로계약서_${empName}_${ctType}_${today}.pdf`);
    toast('PDF가 저장되었습니다.');
  } catch(e){
    console.error('[계약서 PDF]', e);
    toast('PDF 생성 중 오류가 발생했습니다. 인쇄(Ctrl+P)를 이용해 PDF로 저장하세요.');
  } finally {
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-file-pdf"></i> PDF 저장'; }
  }
}

// ======================================================
// ======================================================
// 근로계약서 발송 관리 페이지 — 데이터 로드 & 렌더링
// ======================================================

// 전역 캐시
