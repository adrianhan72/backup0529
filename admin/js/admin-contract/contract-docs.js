
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

  const isReadonly = document.querySelector('#contract-modal .modal')?.classList.contains('ct-readonly');
  section.innerHTML = `
    <div class="ctf-section-title">
      <i class="fas fa-paperclip" style="color:#6366f1;"></i>첨부 서류
    </div>
    ${voidedBannerHtml}
    ${_ctfMakeRow('signed',  c, '계약서 날인본',               'fas fa-file-signature', '#4f46e5', '#eff6ff', isVoided, isReadonly)}
    ${_ctfMakeRow('consent', c, '제3자 개인정보 제공 동의서 날인본', 'fas fa-shield-alt',    '#7c3aed', '#f5f3ff', false, isReadonly)}
  `;
  modalBody.appendChild(section);
}

// ── 서류 업로드 전용 모달 (근로계약 현황 테이블의 "서류 업로드" 버튼) ──
function openDocsUploadModal(contractId){
  const c = allContracts.find(x => x.id === contractId);
  if(!c) return;
  // 중복 오버레이 방지: 기존에 열린 모달이 있으면 제거 (이중 생성 시 화면 클릭 차단 버그 예방)
  const _existingOverlay = document.getElementById('ctf-upload-modal-overlay');
  if(_existingOverlay) _existingOverlay.remove();
  const isVoided = !!(c.is_voided_by_amend);
  const emp = allEmployees.find(e => e.id === c.employee_id);
  const empName = emp?.name || '';
  const co = (allCompanies||[]).find(x => x.id === c.company_id);
  const coName = co?.company_name || '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'ctf-upload-modal-overlay';
  overlay.style.zIndex = '300';
  overlay.dataset.contractId = contractId;
  overlay.innerHTML = `
    <div class="modal" style="max-width:560px;width:95%;">
      <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;">
        <span class="modal-title"><i class="fas fa-upload" style="color:#10b981;margin-right:8px;"></i>날인본등록</span>
        <button onclick="closeDocsUploadModal()" class="btn-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:18px 24px;">
        <div style="font-size:13px;color:#374151;margin-bottom:14px;line-height:1.6;">
          <strong>${empName}</strong> (${coName})<br>
          <span style="font-size:11.5px;color:#6b7280;">계약서 날인본과 개인정보 제공 동의서를 업로드하세요.</span>
        </div>
        <div id="ctf-upload-modal-rows">
          ${_ctfMakeRow('signed',  c, '계약서 날인본',               'fas fa-file-signature', '#4f46e5', '#eff6ff', isVoided, false)}
          ${_ctfMakeRow('consent', c, '제3자 개인정보 제공 동의서 날인본', 'fas fa-shield-alt',    '#7c3aed', '#f5f3ff', false, false)}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  // 모달 표시 (open 클래스 추가로 opacity/pointer-events 활성화)
  requestAnimationFrame(() => { overlay.classList.add('open'); });
  overlay.addEventListener('click', function(e){
    if(e.target === overlay) closeDocsUploadModal();
  });
}

function closeDocsUploadModal(){
  const overlay = document.getElementById('ctf-upload-modal-overlay');
  if(overlay) overlay.remove();
  // 업로드 후 계약 목록 갱신
  if(typeof renderContracts === 'function') renderContracts();
}

// isVoidedFile=true: 날인본에 파기 워터마크 표시 (수정재발행으로 파기된 계약의 서명본)
// readonly=true: 업로드/삭제 버튼 숨기고 파일 상태만 표시 (조회 모드)
function _ctfMakeRow(type, c, label, icon, color, bgColor, isVoidedFile=false, readonly=false){
  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
  const hasFile   = !!(c[dataField]);
  const fileName  = c[nameField] || '첨부파일';
  const rowId     = `ctf-row-${type}`;
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
      <button class="ctf-btn ctf-btn-preview-voided" onclick="_ctfPreviewFile('${type}')"><i class="fas fa-eye"></i> 원본 보기</button>
      <button class="ctf-btn ctf-btn-download" onclick="_ctfDownload('${type}')"><i class="fas fa-download"></i> 다운로드</button>
    ` : `<span style="font-size:11.5px;color:#9ca3af;font-style:italic;">날인본 없음</span>`;
  } else if(hasFile) {
    actionBtns = `
      <button class="ctf-btn ctf-btn-preview" onclick="_ctfPreviewFile('${type}')"><i class="fas fa-eye"></i> 미리보기</button>
      <button class="ctf-btn ctf-btn-download" onclick="_ctfDownload('${type}')"><i class="fas fa-download"></i> 다운로드</button>
      <button class="ctf-btn ctf-btn-delete"   onclick="_ctfDelete('${type}','${c.id}')"><i class="fas fa-trash-alt"></i> 삭제</button>
    `;
  } else {
    actionBtns = readonly
      ? ''
      : `<button class="ctf-btn ctf-btn-upload" onclick="document.getElementById('${inputId}').click()"><i class="fas fa-upload"></i> 업로드</button>`;
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
      ${(!isVoidedFile && !readonly) ? `<input type="file" id="${inputId}" accept="image/*,.pdf" style="display:none;" onchange="_ctfUpload('${type}','${c.id}',this)">` : ''}
    </div>`;
}

// ── 파일 미리보기: 이미지·PDF 모두 새 브라우저 창에서 열기 ──
function _ctfPreviewFile(type){
  const overlay = document.getElementById('ctf-upload-modal-overlay');
  const contractId = editId?.contract || (overlay?.dataset?.contractId);
  const c = contractId ? allContracts.find(x => x.id === contractId) : null;
  if(!c) return;
  const nameField = type === 'signed' ? 'signed_file_name'  : 'consent_file_name';
  const dataField = type === 'signed' ? 'signed_file_data'  : 'consent_file_data';
  const base64 = c[dataField];
  const fileName = c[nameField] || '';
  if(!base64) return;
  const isPdf = base64.startsWith('data:application/pdf') || fileName.toLowerCase().endsWith('.pdf');
  const w = window.open('', '_blank');
  if(!w) return;
  if(isPdf){
    w.document.write(`<html><head><title>${fileName}</title></head><body style="margin:0;"><iframe src="${base64}" width="100%" height="100%" style="border:none;position:fixed;inset:0;"></iframe></body></html>`);
  } else {
    w.document.write(`<html><head><title>${fileName}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a2e;}img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head><body><img src="${base64}" alt="${fileName}"></body></html>`);
  }
  w.document.close();
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
    // 업로드 모달이 열려있으면 업로드 모달 갱신, 아니면 조회 모달 섹션 갱신
    const uploadModal = document.getElementById('ctf-upload-modal-overlay');
    if(uploadModal && c){
      const rowsEl = document.getElementById('ctf-upload-modal-rows');
      if(rowsEl){
        const isVoidedUpload = !!(c.is_voided_by_amend);
        rowsEl.innerHTML = `
          ${_ctfMakeRow('signed',  c, '계약서 날인본',               'fas fa-file-signature', '#4f46e5', '#eff6ff', isVoidedUpload, false)}
          ${_ctfMakeRow('consent', c, '제3자 개인정보 제공 동의서 날인본', 'fas fa-shield-alt',    '#7c3aed', '#f5f3ff', false, false)}
        `;
      }
    } else if(c){
      _renderContractFilesSection(c);
    }
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
          title      : `[날인본등록] ${_ufEmp.name||''} — ${_typeLabel}이 업로드되었습니다`,
          body       :
`안녕하세요${_coRep}.

소속 근로자 ${_ufEmp.name||''}의 ${_typeLabel}이(가) 업로드되었습니다.

■ 업로드 서류: ${_typeLabel}
■ 파일명: ${file.name}
■ 업로드 일시: ${new Date().toLocaleString('ko-KR')}

* 근로계약서 날인본 사진을 계약 종료일로부터 5년간 보관합니다.`,
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
            title      : `[계약 유효 전환] ${_ufEmp.name||''} — 모든 서류 완비`,
            body       :
`안녕하세요${_coRep}.

소속 근로자 ${_ufEmp.name||''}의 ${contractTypeLabel(c.contract_type)||''} 계약 관련 서류가 모두 완비되어 계약이 유효 상태로 전환되었습니다.

■ 고용형태: ${contractTypeLabel(c.contract_type)||''}
■ 계약 기간: ${c.contract_start||''}${c.contract_end ? ' ~ ' + c.contract_end : ''}
■ 완비 서류: 계약서 날인본 + 제3자 정보제공 동의서
■ 전환 일시: ${new Date().toLocaleString('ko-KR')}

* 근로계약서 날인본 사진을 계약 종료일로부터 5년간 보관합니다.`,
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
  const confirmed = (typeof _showConfirm === 'function')
    ? await _showConfirm({
        title   : `${label} 삭제`,
        message : '삭제된 데이터는 복구할 수 없습니다.\n정말 삭제하시겠습니까?',
        okText  : '삭제',
        okClass : 'btn-danger',
      })
    : confirm(`[${label} 삭제]\n\n삭제된 데이터는 복구할 수 없습니다.\n정말 삭제하시겠습니까?`);
  if(!confirmed) return;

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
    // 업로드 모달이 열려있으면 업로드 모달 갱신, 아니면 조회 모달 섹션 갱신
    const uploadModalDel = document.getElementById('ctf-upload-modal-overlay');
    if(uploadModalDel && c){
      const rowsEl = document.getElementById('ctf-upload-modal-rows');
      if(rowsEl){
        const isVoidedDel = !!(c.is_voided_by_amend);
        rowsEl.innerHTML = `
          ${_ctfMakeRow('signed',  c, '계약서 날인본',               'fas fa-file-signature', '#4f46e5', '#eff6ff', isVoidedDel, false)}
          ${_ctfMakeRow('consent', c, '제3자 개인정보 제공 동의서 날인본', 'fas fa-shield-alt',    '#7c3aed', '#f5f3ff', false, false)}
        `;
      }
    } else if(c){
      _renderContractFilesSection(c);
    }
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
  const overlay = document.getElementById('ctf-upload-modal-overlay');
  const contractId = editId?.contract || (overlay?.dataset?.contractId);
  const c = contractId ? allContracts.find(x => x.id === contractId) : null;
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

  const rowId  = `cp-row-${type}`;
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

  // actions — 모든 미리보기는 _ctfPreviewFile로 통일 (새 창)
  const actions = document.createElement('div');
  actions.className = 'ctf-row-actions';
  if(isVoidedFile){
    if(hasFile){
      const previewBtn = _cpCreateBtn('원본 보기', 'ctf-btn ctf-btn-preview-voided', 'fas fa-eye', () => _ctfPreviewFile(type));
      actions.appendChild(previewBtn);
      const downloadBtn = _cpCreateBtn('다운로드', 'ctf-btn ctf-btn-download', 'fas fa-download', () => _ctfDownload(type));
      actions.appendChild(downloadBtn);
    } else {
      const noneSpan = document.createElement('span');
      noneSpan.style.cssText = 'font-size:11.5px;color:#9ca3af;font-style:italic;';
      noneSpan.textContent = '날인본 없음';
      actions.appendChild(noneSpan);
    }
  } else if(hasFile){
    const previewBtn = _cpCreateBtn('미리보기', 'ctf-btn ctf-btn-preview', 'fas fa-eye', () => _ctfPreviewFile(type));
    actions.appendChild(previewBtn);
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
        ondragover="event.preventDefault();this.classList.add('va-input-err');"
        ondragleave="this.classList.remove('va-input-err');"
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
        ondragover="event.preventDefault();this.classList.add('va-input-err');"
        ondragleave="this.classList.remove('va-input-err');"
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
  e.currentTarget.classList.remove('va-input-err');
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
  e.currentTarget.classList.remove('va-input-err');
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

// ════════════════════════════════════════════════════════════
// WORD(docx) 다운로드 — 화면에 보이는 계약서 HTML을 서버(docx 라이브러리)가
// 인라인 스타일 기반으로 재구성해 화면과 동일한 디자인을 Word에 재현
// (2026-09-02: 클래스 매핑 → getComputedStyle 인라인화 방식으로 전면 개편)
// ════════════════════════════════════════════════════════════

// ── WORD 생성용 인라인 스타일 변환 (2026-09-02, 룰 예외: 워드 생성 경로 한정 인라인 허용) ──
//   조회 모달(#cpm-doc-area)/미리보기(#ct-print-area)에서 현재 보여지는 디자인 그대로
//   Word에 재현하기 위해, 브라우저가 계산한 최종 스타일(getComputedStyle)을
//   모든 요소에 인라인으로 심어 전송한다.
//   ※ 인쇄 CSS(_getContractPrintCSS)는 미적용 — 인쇄 전용 구규칙이 섞여
//     화면과 다른(구버전) 디자인이 워드에 입혀지는 문제 방지.
const _DOCX_INLINE_PROPS = [
  'font-family','font-size','font-weight','font-style','color','letter-spacing','line-height','text-align',
  'background-color',
  'border-top-width','border-top-style','border-top-color',
  'border-right-width','border-right-style','border-right-color',
  'border-bottom-width','border-bottom-style','border-bottom-color',
  'border-left-width','border-left-style','border-left-color',
  'padding-top','padding-right','padding-bottom','padding-left',
  'margin-top','margin-bottom',
  'text-decoration-line','white-space','width','height','display','vertical-align','column-gap','row-gap',
];

function _inlineDocStylesForWord(sourceEl){
  if(!sourceEl) return '';
  const root = document.createElement('div');
  root.id = '_docx_inline_root';
  root.style.cssText = 'position:absolute;left:-99999px;top:0;width:794px;visibility:hidden;';
  // 화면과 동일한 조상 문맥을 유지하도록 원본의 부모(모달 내부)에 부착 —
  // absolute 배치라 화면 레이아웃에는 영향 없음. 원본 id/class가 그대로
  // 복제되므로 화면용 CSS(#cpm-doc-area 등)가 복제본에도 동일하게 적용된다.
  const host = sourceEl.parentElement || document.body;
  root.appendChild(sourceEl.cloneNode(true));
  host.appendChild(root);
  try {
    // 깊은 요소부터 역순으로 인라인화 — 조상에 먼저 px 행간 등이 심기면
    // 자식의 상속 계산이 오염되므로(예: h1 행간이 27.3px→17.33px로 잘못 계산)
    const els = Array.from(root.querySelectorAll('*')).reverse();
    els.forEach(el => {
      const cs = getComputedStyle(el);
      if(cs.display === 'none'){ el.setAttribute('data-docx-skip', '1'); return; }
      const out = [];
      for(const p of _DOCX_INLINE_PROPS){
        let v = cs.getPropertyValue(p);
        if(v == null || v === '') continue;
        if((p === 'width' || p === 'height') && !/px$/.test(v)) continue; // px 크기만 반영
        // 투명 배경(rgba 알파0)은 제외 — Word에서 검정 배경으로 오염되는 것 방지
        if(p === 'background-color' && (/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.\d*)?\s*\)/i.test(v) || /^transparent$/i.test(v))) continue;
        out.push(p + ':' + v);
      }
      el.setAttribute('style', out.join(';'));
    });
    return root.innerHTML;
  } finally {
    if(root.parentNode) root.parentNode.removeChild(root);
  }
}

/** 계약서 HTML → 서버 docx 변환 → 다운로드 */
async function _downloadContractDocxFromHtml(sourceEl, filename){
  if(!sourceEl || !sourceEl.innerHTML.trim()){ toast('계약서 내용이 없습니다.'); return; }
  // 파기 워터마크(고정 오버레이)는 docx에서 제외
  const clone = sourceEl.cloneNode(true);
  clone.querySelectorAll('[style*="position:fixed"], [style*="position: fixed"]').forEach(n=>n.remove());
  // 화면 디자인 그대로 Word에 재현하도록 전 요소 인라인 스타일화
  const html = _inlineDocStylesForWord(clone);
  try {
    const res = await fetch('../api/contract-docx', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ html, filename })
    });
    if(!res.ok){
      const j = await res.json().catch(()=>({}));
      toast('WORD 생성 실패: ' + (j.error || res.status), 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (filename || '근로계약서') + '.docx'; a.click();
    URL.revokeObjectURL(url);
    toast('WORD 파일이 다운로드됐습니다. (화면 계약서와 동일 내용)');
  } catch(e){
    console.error('[계약서 DOCX 다운로드]', e);
    toast('WORD 생성 중 오류가 발생했습니다.', 'error');
  }
}

/** 계약 조회(print 모달) WORD 저장 — 화면과 동일 */
async function downloadContractWord(){
  const el = document.getElementById('cpm-doc-area');
  const empName = window._printingEmpName || '근로자';
  await _downloadContractDocxFromHtml(el, '근로계약서_' + empName);
}

/** 계약 작성(미리보기) WORD 다운로드 — 화면과 동일 */
async function downloadContractDocx(){
  const el = document.getElementById('ct-print-area');
  const empName = document.getElementById('ct-edit-emp-name')?.value || '근로자';
  await _downloadContractDocxFromHtml(el, '근로계약서_' + empName);
}

function _buildDocx(data){
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, AlignmentType, BorderStyle, ShadingType,
          VerticalAlign, UnderlineType } = docx;

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

  const contractDate = data.contractStart || fmtLocalDate(new Date());

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
    probEndDate = fmtLocalDate(st);
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
    salaryRows.push(infoRow('통상시급', won(Math.round(data.hourlyWage))+'/시간'));
  } else {
    // 일용직: 통상일급(시급×8) + 일 기준 고정수당 → 일급여 합계
    salaryRows.push(infoRow('통상일급', `${won(Math.round((data.hourlyWage||0)*8))} (시급×8, 일 8시간 기준)`));
    if(data.positionAllowance>0) salaryRows.push(infoRow('직책수당(일급)', won(data.positionAllowance)));
    if(data.siteAllowance>0) salaryRows.push(infoRow('현장수당(일급)', won(data.siteAllowance)));
    if(data.skillAllowance>0) salaryRows.push(infoRow('기술수당(일급)', won(data.skillAllowance)));
    if(data.licenseAllowance>0) salaryRows.push(infoRow('면허수당(일급)', won(data.licenseAllowance)));
    if(data.hazardAllowance>0) salaryRows.push(infoRow('위험수당(일급)', won(data.hazardAllowance)));
    if(data.remoteAreaAllowance>0) salaryRows.push(infoRow('벽지수당(일급)', won(data.remoteAreaAllowance)));
    if(data.carMaintenance>0) salaryRows.push(infoRow('차량지원비(일급)', won(data.carMaintenance)));
    if(data.mealAllowance>0) salaryRows.push(infoRow('식대(일급)', won(data.mealAllowance)));
    if(data.researchAllowance>0) salaryRows.push(infoRow('연구보조비(일급)', won(data.researchAllowance)));
    if(data.communicationAllowance>0) salaryRows.push(infoRow('통신비(일급)', won(data.communicationAllowance)));
    if(data.fitnessAllowance>0) salaryRows.push(infoRow('체력증진비(일급)', won(data.fitnessAllowance)));
    if(data.selfDevAllowance>0) salaryRows.push(infoRow('자기계발비(일급)', won(data.selfDevAllowance)));
    if(data.bookAllowance>0) salaryRows.push(infoRow('도서지원비(일급)', won(data.bookAllowance)));
    if(data.overseasAllowance>0) salaryRows.push(infoRow('해외근무수당(일급)', won(data.overseasAllowance)));
    if(data.childcareAllowance>0) salaryRows.push(infoRow('보육수당', won(data.childcareAllowance)));
    if(data.weeklyHol>0) salaryRows.push(infoRow('주휴수당', won(data.weeklyHol)));
    salaryRows.push(infoRow('일급여 합계', won(data.dailyWage), true));
  }
  // 일용직: 지급방법별 임금 지급일 표기
  let _payDayStr = '';
  if(data.isDaily){
    const _PM = data.payMethod || 'monthly';
    const _WD = ['일','월','화','수','목','금','토'];
    if(_PM === 'daily'){
      _payDayStr = data.payCondition === 'after_n_days'
        ? `근무일로부터 ${data.payAfterDays || 'n'}일 후 지급`
        : '근무일 당일 지급';
    } else if(_PM === 'weekly'){
      const _pws = (data.payPeriodWeekday >= 0 && data.payPeriodWeekday <= 6) ? data.payPeriodWeekday : -1;
      _payDayStr = (data.payWeekday >= 0 && data.payWeekday <= 6)
        ? (_pws >= 0 ? `매주 ${_WD[_pws]}요일~${_WD[data.payWeekday]}요일 근무분 · ${_WD[data.payWeekday]}요일 지급` : `매주 ${_WD[data.payWeekday]}요일 지급`)
        : '매주 지급 요일 미설정';
    } else {
      const _payD = data.payDay ? (typeof data.payDay === 'number' ? data.payDay : (parseInt(String(data.payDay).slice(8,10)) || 0)) : 0;
      _payDayStr = _payD ? `매월 ${_payD}일` : '매월 말일';
    }
    salaryRows.push(infoRow('임금 지급일', _payDayStr));
    salaryRows.push(infoRow('임금 지급 주기', data.payMethodLabel || '월합산'));
  } else {
    salaryRows.push(infoRow('임금 지급일', data.payDay ? `매월 ${data.payDay}일` : '매월 말일'));
  }
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

// ── 계약·직원·고객사 레코드 기반 docx 데이터 수집 (print 모달·조회용) ──
// generateContractHTMLFromData와 동일한 정규화·스케줄 규칙을 적용해
// _buildDocx(data)가 필요로 하는 필드를 레코드에서 직접 산출한다.
function _collectContractDataFromRecord(c, emp, co){
  const _ctTypeRaw = c.contract_type || emp.employment_category || CONTRACT_TYPE.REGULAR;
  const _ctTypeNorm = typeof normalizeContractType === 'function'
    ? normalizeContractType(_ctTypeRaw) : _ctTypeRaw;
  const _isPendingRec = (c.status===CONTRACT_STATUS.PENDING);
  const contractType = _isPendingRec
    ? (_ctTypeNorm === CONTRACT_TYPE.REGULAR_PROBATION ? CONTRACT_TYPE.REGULAR
      : _ctTypeNorm === CONTRACT_TYPE.FIXED_PROBATION ? CONTRACT_TYPE.FIXED
      : _ctTypeNorm)
    : _ctTypeNorm;
  const isDaily = contractType === CONTRACT_TYPE.DAILY;
  const isProb  = contractType === CONTRACT_TYPE.REGULAR_PROBATION || contractType === CONTRACT_TYPE.FIXED_PROBATION;
  const isRegularGroupRec = contractType === CONTRACT_TYPE.REGULAR || contractType === CONTRACT_TYPE.REGULAR_PROBATION;

  // ── 근무 스케줄 파싱 (generateContractHTMLFromData와 동일 규칙) ──
  let schedule = [];
  if(c.schedule_json){
    try { const p = JSON.parse(c.schedule_json); schedule = Array.isArray(p) ? p : []; }
    catch(e){ schedule = []; }
  }
  let activeDays = schedule.filter(s => s.active===true || s.active===1 || s.active==='true');
  if(activeDays.length === 0){
    const _DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'];
    const _start  = c.start_time || '09:00';
    const _end    = c.end_time   || '18:00';
    const _wDays  = parseInt(c.work_days_per_week || c.days_per_week || 5);
    const _brkMins = parseInt(c.break_mins || 60);
    const _toM = t => { const p = t.split(':'); return parseInt(p[0])*60+parseInt(p[1]); };
    const _fmtT = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    const _sMins = _toM(_start); let _eMins = _toM(_end);
    if(_eMins <= _sMins) _eMins += 24*60;
    const _half = Math.round((_eMins - _sMins - _brkMins)/2);
    const _bs = _brkMins > 0 ? _fmtT(_sMins + _half) : '';
    const _be = _brkMins > 0 ? _fmtT(_sMins + _half + _brkMins) : '';
    activeDays = _DAY_KEYS.map((k,i)=>({
      day:k, active:i<_wDays,
      start:i<_wDays?_start:'', end:i<_wDays?_end:'',
      brk_start:i<_wDays?_bs:'', brk_end:i<_wDays?_be:''
    }));
  }
  activeDays = activeDays.map(s=>{
    const shift = (Array.isArray(s.shifts)&&s.shifts.length>0) ? s.shifts[0] : {};
    return {
      day:s.day, start:shift.start||s.start||'', end:shift.end||s.end||'',
      breaks:Array.isArray(shift.breaks)?shift.breaks:(Array.isArray(s.breaks)?s.breaks:[]),
      brk_start:shift.brk_start||s.brk_start||'', brk_end:shift.brk_end||s.brk_end||''
    };
  });
  const dayNamesFull = {mon:'월요일',tue:'화요일',wed:'수요일',thu:'목요일',fri:'금요일',sat:'토요일',sun:'일요일'};
  const dayNamesK = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
  let workDays = '';
  if(activeDays.length) workDays = activeDays.map(s=>dayNamesFull[s.day]||s.day).join(', ');
  else if(c.work_days) workDays = c.work_days;
  else workDays = '월요일 ~ 금요일';
  const startTime  = activeDays[0]?.start || c.start_time || '09:00';
  const endTime    = activeDays[activeDays.length-1]?.end || c.end_time || '18:00';
  const hoursPerDay = parseFloat(c.hours_per_day || c.work_hours_per_day || c.daily_hours || 8);
  const daysPerWeek = parseInt(c.days_per_week || c.work_days_count || c.work_days_per_week || (activeDays.length||5));
  const weekHours   = Math.round(hoursPerDay * daysPerWeek * 10)/10;
  const _normBrk = s => {
    if(Array.isArray(s.breaks)&&s.breaks.length) return s.breaks;
    if(s.brk_start||s.brk_end) return [{s:s.brk_start||'',e:s.brk_end||''}];
    return [];
  };
  const uniqBrk = {};
  activeDays.forEach(day=>{
    _normBrk(day).forEach(b=>{ if(!b.s||!b.e) return; const k=`${b.s}~${b.e}`; if(!uniqBrk[k]) uniqBrk[k]=new Set(); uniqBrk[k].add(dayNamesK[day.day]||day.day); });
  });
  let breakInfo = '';
  if(Object.keys(uniqBrk).length){
    breakInfo = Object.entries(uniqBrk).map(([time,set])=>{
      const [hs,ms]=time.split('~')[0].split(':').map(Number);
      const [he,me]=time.split('~')[1].split(':').map(Number);
      let mins=(he*60+me)-(hs*60+ms); if(mins<=0) mins+=24*60;
      return `[${[...set].join('·')}] ${time} (${mins}분)`;
    }).join(', ');
  } else {
    breakInfo = '1일 근로시간 4시간인 경우 30분, 8시간인 경우 1시간 이상';
  }

  const payMethodLabel = isDaily ? ({daily:'일급', weekly:'주급', monthly:'월합산'}[c.pay_method]||'월합산') : '매월';

  return {
    companyName: co.company_name||'', bizNumber: co.business_number||'', companyAddr: co.address||'',
    representative: (typeof getCompanyRepName === 'function') ? getCompanyRepName(co) : (co.representative||''),
    empName: emp.name||'', idNumber: emp.id_number||'', address: emp.address||'', phone: emp.phone||'',
    jobDescription: emp.job_description||'', department: emp.department||'', position: emp.position||'',
    contractType, contractStart: c.contract_start||'', contractEnd: c.contract_end||'',
    isDaily,
    probationMonths: isProb?(parseInt(c.probation_months)||3):0,
    probationPct:    isProb?(parseFloat(c.probation_pct)||80):0,
    probationAmt:    isProb?(parseFloat(c.probation_amt)||0):0,
    probationBasis:  c.probation_basis||'salary',
    annualLeave:     parseFloat(c.annual_leave_days)||15,
    workDays, startTime, endTime, hoursPerDay, daysPerWeek, weekHours, breakInfo,
    annualSalary:  isRegularGroupRec ? (parseFloat(c.annual_salary)||0) : 0, // 계약직은 연봉 없음 (2026-09-03)
    baseSalary:    parseFloat(c.base_salary)||0,
    weeklyHol:     parseFloat(c.weekly_holiday_pay)||0,
    fixedOtPay:    parseFloat(c.fixed_ot_pay)||0,
    fixedNightPay: parseFloat(c.fixed_night_pay)||0,
    fixedHolPay:   parseFloat(c.fixed_hol_pay)||0,
    positionAllowance: parseFloat(c.position_allowance)||0,
    carMaintenance: parseFloat(c.car_maintenance||c.transportation_allowance)||0,
    mealAllowance:  parseFloat(c.meal_allowance)||0,
    researchAllowance: parseFloat(c.research_allowance)||0,
    siteAllowance:  parseFloat(c.site_allowance)||0,
    skillAllowance: parseFloat(c.skill_allowance)||0,
    licenseAllowance: parseFloat(c.license_allowance)||0,
    communicationAllowance: parseFloat(c.communication_allowance)||0,
    fitnessAllowance: parseFloat(c.fitness_allowance)||0,
    selfDevAllowance: parseFloat(c.self_dev_allowance)||0,
    bookAllowance:  parseFloat(c.book_allowance)||0,
    overseasAllowance: parseFloat(c.overseas_allowance)||0,
    otherAllowance: parseFloat(c.etc_allowance||c.contract_etc_allowance)||0,
    childcareAllowance: parseFloat(c.childcare_allowance)||0,
    remoteAreaAllowance: parseFloat(c.remote_area_allowance)||0,
    hazardAllowance: parseFloat(c.hazard_allowance)||0,
    monthlySalary:  parseFloat(c.monthly_salary_agreed)||0,
    hourlyWage:     parseFloat(c.hourly_wage)||0,
    dailyWage:      parseFloat(c.daily_wage)||0,
    payMethod:  c.pay_method || (isDaily?'daily':'monthly'),
    payMethodLabel,
    payCondition: c.pay_condition||'same_day',
    payAfterDays: parseInt(c.pay_after_days)||0,
    payWeekday:   c.pay_weekday!=null?parseInt(c.pay_weekday):-1,
    payPeriodWeekday: c.pay_period_weekday!=null?parseInt(c.pay_period_weekday):-1,
    payDay: c.pay_day,
  };
}

// ── 폼 데이터 수집 ──
function _collectContractData(){
  const coId = document.getElementById('ct-company')?.value;
  // 계약 체결 시점 기준 고객사 스냅샷 사용 (수정 모드: 계약 시작일 기준)
  const _ctStartForSnap = document.getElementById('ct-start')?.value || '';
  const _ctTsForSnap = _ctStartForSnap ? new Date(_ctStartForSnap).getTime() : 0;
  const company = (coId && typeof getCompanySnapshotAt === 'function')
    ? (getCompanySnapshotAt(coId, _ctTsForSnap) || allCompanies.find(c=>c.id===coId) || {})
    : (allCompanies.find(c=>c.id===coId)||{});
  // 고용형태는 인사정보 기준으로 읽음: 수정 모드는 ct-edit-em-category, 신규는 선택된 근로자
  const _isEditModeCD = !!editId.contract;
  const ctType = _isEditModeCD
    ? (document.getElementById('ct-edit-em-category')?.value||CONTRACT_TYPE.REGULAR)
    : (_ctNewCat()||CONTRACT_TYPE.REGULAR);
  const isEdit = !!editId.contract;
  const isDaily = ctType===CONTRACT_TYPE.DAILY;
  const isProbation = ctType===CONTRACT_TYPE.REGULAR_PROBATION || ctType===CONTRACT_TYPE.FIXED_PROBATION;
  const isRegularGroupCD = ctType===CONTRACT_TYPE.REGULAR || ctType===CONTRACT_TYPE.REGULAR_PROBATION;

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
    const selE = _ctSelectedEmpId ? (allEmployees||[]).find(e=>e.id===_ctSelectedEmpId) : null;
    empName       = selE?.name || '';
    phone         = selE?.phone || '';
    address       = selE?.address || '';
    idNumber      = selE?.id_number || '';
    jobDescription= selE?.job_description || '';
    department    = selE?.department || '';
    position      = selE?.position || '';
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
      let mins = (he*60+me) - (hs*60+ms);
      if(mins <= 0) mins += 24*60; // 익일 종료 휴게
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
  // 통상시급: ct-hourly-input에서 수집 (구 ct-hourly-computed는 UI 재구성으로 제거됨)
  const hourlyText    = String((typeof getAmountVal === 'function') ? getAmountVal('ct-hourly-input') : 0);

  // 수습 조건
  const probationMonths = isProbation ? parseInt(document.getElementById('ct-probation-months')?.value)||3 : 0;
  const probationPct    = isProbation ? parseFloat(document.getElementById('ct-probation-pct')?.value)||80 : 0;
  const probationAmt    = isProbation ? parseFloat(document.getElementById('ct-probation-amt')?.value)||0 : 0;
  const probationBasis  = isProbation ? (document.querySelector('input[name="ct-probation-basis"]:checked')?.value || 'salary') : 'salary';

  return {
    companyId:         coId,
    premiumMode:       company.premium_mode || 'none',
    companyName:       company.company_name||'',
    bizNumber:         company.business_number||'',
    companyAddr:       company.address||'',
    representative:    getCompanyRepName(company),
    payDay:            isDaily ? (document.getElementById('ct-pay-day-date')?.value || '') : (document.getElementById('ct-pay-day')?.value || ''),
    payMethod:         isDaily ? ((typeof _ctPayMethodVal === 'function' ? _ctPayMethodVal() : '') || 'daily') : 'monthly',
    payMethodLabel:    isDaily ? ({daily:'일급', weekly:'주급', monthly:'월합산'}[(typeof _ctPayMethodVal === 'function' ? _ctPayMethodVal() : '') || 'daily'] || '일급') : '매월',
    payCondition:      isDaily ? (document.querySelector('input[name="ct-pay-condition"]:checked')?.value || 'same_day') : '',
    payAfterDays:      isDaily ? (parseInt(document.getElementById('ct-pay-after-days')?.value) || 0) : 0,
    payWeekday:        isDaily ? (parseInt(document.getElementById('ct-pay-weekday')?.value) || -1) : -1,
    payPeriodWeekday:  isDaily ? (parseInt(document.getElementById('ct-pay-period-weekday')?.value) || -1) : -1,
    empName, phone, address, idNumber, jobDescription, department, position,
    contractStart:     document.getElementById('ct-start')?.value || '',
    contractEnd:       document.getElementById('ct-end')?.value || '',
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
    childcareAllowance:  getAmountVal('ct-childcare')||0,
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
    annualSalary:      isRegularGroupCD ? getAmountVal('ct-annual-sal') : 0, // 계약직은 연봉 없음 (월 약정임금만, 2026-09-03)
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
  const today = fmtLocalDate(new Date());
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
  // 임금지급일 (일용직: 지급방법별 표기)
  let payDayStr = '';
  if(d.isDaily){
    const _PM = d.payMethod || 'monthly';
    const _WD = ['일','월','화','수','목','금','토'];
    if(_PM === 'daily'){
      payDayStr = d.payCondition === 'after_n_days'
        ? `근무일로부터 ${d.payAfterDays || 'n'}일 후 지급`
        : '근무일 당일 지급';
    } else if(_PM === 'weekly'){
      const _pws = (d.payPeriodWeekday >= 0 && d.payPeriodWeekday <= 6) ? d.payPeriodWeekday : -1;
      payDayStr = (d.payWeekday >= 0 && d.payWeekday <= 6)
        ? (_pws >= 0 ? `매주 ${_WD[_pws]}요일~${_WD[d.payWeekday]}요일 근무분 · ${_WD[d.payWeekday]}요일 지급` : `매주 ${_WD[d.payWeekday]}요일 지급`)
        : '매주 지급 요일 미설정';
    } else {
      const _payD = d.payDay ? (typeof d.payDay === 'number' ? d.payDay : (parseInt(String(d.payDay).slice(8,10)) || 0)) : 0;
      payDayStr = _payD ? `매월 ${_payD}일` : '매월 말일';
    }
  } else {
    payDayStr = d.payDay ? ('매월 ' + d.payDay + '일') : '매월 말일';
  }
  const payFreqStr = d.isDaily ? (d.payMethodLabel || '월합산') : '';

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
      ${row('통상일급', `${won(Math.round((d.hourlyWage||0)*8))}원 (시급×8, 일 8시간 기준)`)}
      ${d.positionAllowance>0 ? row('직책수당(일급)', `${won(d.positionAllowance)}원`) : ''}
      ${d.siteAllowance>0 ? row('현장수당(일급)', `${won(d.siteAllowance)}원`) : ''}
      ${d.skillAllowance>0 ? row('기술수당(일급)', `${won(d.skillAllowance)}원`) : ''}
      ${d.licenseAllowance>0 ? row('면허수당(일급)', `${won(d.licenseAllowance)}원`) : ''}
      ${d.hazardAllowance>0 ? row('위험수당(일급)', `${won(d.hazardAllowance)}원`) : ''}
      ${d.remoteAreaAllowance>0 ? row('벽지수당(일급)', `${won(d.remoteAreaAllowance)}원`) : ''}
      ${d.carMaintenance>0       ? row('차량지원비(일급)', `${won(d.carMaintenance)}원`)       : ''}
      ${d.mealAllowance>0        ? row('식대(일급)',      `${won(d.mealAllowance)}원`)        : ''}
      ${d.researchAllowance>0    ? row('연구보조비(일급)', `${won(d.researchAllowance)}원`)    : ''}
      ${d.communicationAllowance>0 ? row('통신비(일급)',   `${won(d.communicationAllowance)}원`) : ''}
      ${d.fitnessAllowance>0     ? row('체력증진비(일급)', `${won(d.fitnessAllowance)}원`)     : ''}
      ${d.selfDevAllowance>0     ? row('자기계발비(일급)', `${won(d.selfDevAllowance)}원`)     : ''}
      ${d.bookAllowance>0        ? row('도서지원비(일급)', `${won(d.bookAllowance)}원`)        : ''}
      ${d.overseasAllowance>0    ? row('해외근무수당(일급)', `${won(d.overseasAllowance)}원`)  : ''}
      ${d.childcareAllowance>0   ? row('보육수당',        `${won(d.childcareAllowance)}원`)   : ''}
      ${d.weeklyHol > 0 ? row('주휴수당', `${won(d.weeklyHol)}원`) : ''}
      <tr class="total-row"><th>일급여 합계</th><td><strong class="highlight">${won(d.dailyWage)}원</strong></td></tr>
      ${payFreqStr ? row('임금 지급 주기', payFreqStr) : ''}
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
      ${row('통상시급', `${won(Math.round(d.hourlyWage))}원/시간`)}
      ${row('임금 지급일', payDayStr)}
      ${row('지급 방법', '근로자 명의 계좌 직접 입금')}
    </table>
    `}
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
  const _ctTypeRaw = c.contract_type || emp.employment_category || CONTRACT_TYPE.REGULAR;
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

  // ── 파기 계약 여부 (초안 보기·인쇄는 유지, 발송은 목록 '발송' 열에서 처리) ──

  // 모달 열기
  document.getElementById('contract-print-modal').classList.add('open');
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
  // 수정 재발행 후 즉시 목록 갱신 (서버 동기화는 백그라운드)
  if(wasAmend){
    renderContracts();
    renderDashboard();
    (async () => {
      await loadContracts();
      await loadEmployees();
      renderContracts();
      renderDashboard();
    })();
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

// ════════════════════════════════════════════════════════════
// 최종 편집본(PDF) 업로드 → 파일서버 저장 + DB 기록 / 날인본 보기
// (계약 목록 — 계약서 열 '편집본 업로드'·'재등록', 날인본 열 '보기')
// ════════════════════════════════════════════════════════════

/** 최종 편집본(PDF) 업로드 → 파일서버 저장 + contracts.edited_file_url 기록 */
async function uploadEditedContractFile(contractId){
  if(!contractId){ toast('계약 정보가 없습니다.'); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,application/pdf';
  input.onchange = async () => {
    const file = input.files[0];
    if(!file) return;
    // 최종 편집본은 PDF 파일만 허용
    const isPdf = (file.type === 'application/pdf') || /\.pdf$/i.test(file.name);
    if(!isPdf){ toast('최종 편집본은 PDF 파일만 업로드할 수 있습니다.', 'error'); return; }
    try {
      const fd = new FormData();
      fd.append('contract', file);
      const res  = await fetch(`../api/upload/${contractId}`, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if(!res.ok || !json.ok || !json.files || !json.files.contract){
        toast(json.error || '업로드에 실패했습니다.', 'error');
        return;
      }
      const url = json.files.contract;
      // DB에 최종 편집본 URL 기록 (발송 열 활성화·계약서 열 표시에 사용)
      await api(`../tables/contracts/${contractId}`, {
        method: 'PATCH', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ edited_file_url: url })
      });
      toast('✅ 최종 편집본이 파일서버에 저장됐습니다.', 'success');
      await loadContracts();
      renderContracts();
    } catch(e){
      console.error('[편집본 업로드]', e);
      toast('업로드 중 오류가 발생했습니다.', 'error');
    }
  };
  input.click();
}

/** 날인본(계약서 서명본) 새 창 미리보기 — 이미지 또는 PDF */
function viewContractSignedFile(contractId){
  const c = (allContracts||[]).find(x => x.id === contractId);
  if(!c || !c.signed_file_data){ toast('날인본 파일이 없습니다.', 'warning'); return; }
  const base64   = c.signed_file_data;
  const fileName = c.signed_file_name || '날인본';
  const isPdf = base64.startsWith('data:application/pdf') || String(fileName).toLowerCase().endsWith('.pdf');
  const w = window.open('', '_blank');
  if(!w){ toast('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.', 'warning'); return; }
  if(isPdf){
    w.document.write(`<html><head><title>${fileName}</title></head><body style="margin:0;"><iframe src="${base64}" width="100%" height="100%" style="border:none;position:fixed;inset:0;"></iframe></body></html>`);
  } else {
    w.document.write(`<html><head><title>${fileName}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a2e;}img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head><body><img src="${base64}" alt="${fileName}"></body></html>`);
  }
  w.document.close();
}

// ======================================================
// ======================================================
// 근로계약서 발송 관리 페이지 — 데이터 로드 & 렌더링
// ======================================================
// 전역 캐시
