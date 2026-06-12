// ─── COMPANIES ───
/* ─────────────────────────────────────────────────────────────────
   고객사 관리 페이지 — 임시저장 배너
   ───────────────────────────────────────────────────────────────── */
function _renderCompaniesDraftBanner(){
  const sec = document.getElementById('companies-draft-banner');
  if(!sec) return;

  const drafts = allCompanies.filter(c => !!c.is_draft);
  if(!drafts.length){ sec.style.display = 'none'; sec.innerHTML = ''; return; }

  // 저장 시각 포맷 헬퍼
  function fmtTime(ts){
    if(!ts) return '';
    const d = new Date(isNaN(Number(ts)) ? ts : Number(ts));
    if(isNaN(d.getTime())) return '';
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} `
         + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  const rows = drafts.map(c => {
    const savedAt = fmtTime(c.draft_saved_at);
    return `
      <div class="draft-item-row" onclick="openCompanyModal('${c.id}')" title="클릭하여 이어 작성">
        <div class="draft-item-icon co"><i class="fas fa-building"></i></div>
        <div class="draft-item-name">${c.company_name || '(이름 없음)'}</div>
        <div class="draft-item-meta" style="font-size:11.5px;color:#92400e;white-space:nowrap;">${savedAt ? '임시저장 ' + savedAt : '임시저장'}</div>
        <div class="draft-item-action" style="font-size:11.5px;color:#d97706;white-space:nowrap;flex-shrink:0;"><i class="fas fa-pencil-alt"></i> 이어 작성</div>
      </div>`;
  }).join('');

  sec.style.display = '';
  sec.innerHTML = `
    <div class="dash-ac-card draft-alert-card">
      <div class="draft-alert-card-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="pulse-dot"></span>
          <span class="dash-ac-title draft-alert-title" style="font-size:13.5px;">임시저장 미완료 고객사</span>
          <span class="dash-ac-badge" style="background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:20px;padding:2px 9px;font-size:11.5px;font-weight:700;">${drafts.length}건</span>
        </div>
        <span style="font-size:11.5px;color:#b45309;">클릭하여 이어 작성할 수 있습니다</span>
      </div>
      <div class="draft-alert-card-body" style="padding:0;">
        <div style="padding:16px 20px;">${rows}</div>
      </div>
    </div>`;
}

function renderCompanies(){
  const list=document.getElementById('company-list');
  if(!list) return;

  // ── 고객사 임시저장 배너 ──
  _renderCompaniesDraftBanner();

  // ── 데이터 로딩 중: 스켈레톤 카드 표시 ──
  if(!_dataReady){
    list.innerHTML = Array.from({length:6}, (_,i) => `
      <div class="company-card-skel" style="animation-delay:${i*0.1}s;">
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
          <div class="skel-line" style="width:72px;height:18px;"></div>
          <div class="skel-line" style="width:44px;height:18px;border-radius:20px;"></div>
        </div>
        <div class="skel-line" style="width:55%;height:16px;margin-bottom:10px;"></div>
        <div class="skel-line" style="width:38%;height:11px;margin-bottom:18px;"></div>
        <div class="skel-line" style="width:100%;height:48px;border-radius:8px;margin-bottom:12px;"></div>
        <div class="skel-line" style="width:90%;height:11px;margin-bottom:6px;"></div>
        <div class="skel-line" style="width:75%;height:11px;margin-bottom:6px;"></div>
        <div class="skel-line" style="width:82%;height:11px;"></div>
      </div>`).join('');
    return;
  }

  // 필터
  const statusFilter=document.getElementById('company-status-filter').value;
  const searchInput=document.getElementById('company-search').value.toLowerCase();
  
  let filtered=allCompanies.filter(c=>{
    // is_draft인 경우 status를 '임시저장'으로 취급
    const effectiveStatus = c.is_draft ? '임시저장' : (c.status||'이용중');
    if(statusFilter&&effectiveStatus!==statusFilter) return false;
    if(searchInput&&!(c.company_name||'').toLowerCase().includes(searchInput)) return false;
    return true;
  }).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));
  
  if(!filtered.length){list.innerHTML='<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-building"></i><p>조건에 맞는 고객사가 없습니다</p></div>';return;}
  
  list.innerHTML=filtered.map(c=>{
    const cnt=allEmployees.filter(e=>e.company_id===c.id&&(e.status==='active'||e.status==='재직')).length;
    const totalEmp=allEmployees.filter(e=>e.company_id===c.id).length;
    const isDraftComp = !!c.is_draft;
    const statusBadge = isDraftComp
      ? '<span class="badge-draft"><i class="fas fa-cloud" style="font-size:9px;margin-right:2px;"></i>임시저장</span>'
      : (c.status==='이용중'?'<span class="badge badge-green">이용중</span>':'<span class="badge badge-gray">해지</span>');
    const contractInfo=c.status==='해지'?`<br>계약기간: ${c.contract_start_date||'-'} ~ ${c.contract_end_date||'-'}`:'';

    // 이번 달 급여 데이터
    const now=new Date();
    const thisMonthPayrolls=allPayrolls.filter(p=>!p.is_draft&&p.company_id===c.id&&p.pay_year==now.getFullYear()&&p.pay_month==(now.getMonth()+1));
    const hasPayroll=thisMonthPayrolls.length>0;
    const totalNetPay=thisMonthPayrolls.reduce((sum,p)=>sum+(p.net_pay||0),0);

    // 급여 입력 섹션 (이용중 고객사만, 임시저장 제외)
    const payrollSection = (c.status!=='이용중' || isDraftComp) ? '' : hasPayroll
      ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-top:10px;">
           <div>
             <div style="font-size:10px;color:#0369a1;margin-bottom:2px;">이번 달 급여 총액</div>
             <div style="font-size:15px;font-weight:700;color:#0c4a6e;">${Math.round(totalNetPay).toLocaleString('ko-KR')}<span style="font-size:11px;font-weight:500;">원</span></div>
           </div>
           <button class="btn btn-sm" style="background:#3b82f6;color:#fff;padding:5px 11px;font-size:11.5px;font-weight:600;" onclick="openPayrollInputModal('${c.id}')">
             <i class="fas fa-edit"></i> 내역 수정
           </button>
         </div>`
      : `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-top:10px;">
           <div>
             <div style="font-size:10px;color:#c2410c;margin-bottom:2px;">이번 달 급여</div>
             <div style="font-size:13px;font-weight:600;color:#9a3412;">미입력 ⏳</div>
           </div>
           <button class="btn btn-sm" style="background:#e94560;color:#fff;padding:5px 11px;font-size:11.5px;font-weight:600;" onclick="openPayrollInputModal('${c.id}')">
             <i class="fas fa-plus-circle"></i> 급여 입력
           </button>
         </div>`;
    
    return `<div class="company-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="code-badge">코드: ${c.access_code}</span>
        ${statusBadge}
      </div>
      <h3>${c.company_name}</h3>
      <div style="font-size:11px;color:#aaa;margin-top:2px;margin-bottom:6px;"><i class="fas fa-calendar-alt" style="margin-right:3px;"></i>등록일: ${c.contract_start_date||'-'}</div>
      ${payrollSection}
      <p style="margin-top:10px;">대표: ${c.representative||'-'} · 업종: ${c.industry||'-'}<br>사업자: ${c.business_number||'-'}<br>급여일: ${c.pay_day||'-'} · 산정: ${c.pay_period||'-'}<br><i class="fas fa-shield-alt" style="color:#6366f1;margin-right:3px;font-size:10px;"></i>4대보험: ${c.insurance_basis||'요율 기준'} · <i class="fas fa-umbrella-beach" style="color:#0891b2;margin-right:3px;font-size:10px;"></i>연차: ${c.annual_leave_basis||'회계년도 기준'}<br>${c.phone||''}${contractInfo}</p>
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px;font-weight:600;color:#3b82f6"><i class="fas fa-users"></i> 재직 ${cnt}명 / 전체 ${totalEmp}명</div>
      ${isDraftComp
        ? `<div style="margin-top:10px;padding:9px 12px;background:linear-gradient(90deg,#fffbeb,#fef3c7);border:1.5px dashed #f59e0b;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
             <span style="font-size:11.5px;color:#92400e;font-weight:600;"><i class="fas fa-exclamation-circle" style="margin-right:4px;color:#f59e0b;"></i>임시저장 상태 — 등록을 완료해 주세요</span>
             <button class="btn btn-draft btn-sm" style="padding:5px 12px;font-size:12px;" onclick="editCompany('${c.id}')"><i class="fas fa-pencil-alt"></i> 계속 작성</button>
           </div>`
        : c.status==='해지'
          ? `<div style="margin-top:8px;padding:8px 10px;background:#fff3f3;border:1px solid #fca5a5;border-radius:6px;font-size:11px;color:#b91c1c;line-height:1.5;">
              <i class="fas fa-info-circle"></i> 해지고객사의 데이터 보존년한은 해지일로부터 5년입니다
             </div>`
          : `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:10px;">
              <div style="display:flex;gap:6px;">
                <button class="btn btn-primary btn-sm" onclick="editCompany('${c.id}')">정보수정</button>
                <button class="btn btn-sm" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-weight:600;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" onclick="goContractsByCompany('${c.id}','${c.company_name}')">근로계약서</button>
                <button class="btn btn-sm" style="background:#f0fdf4;color:#166534;border:1px solid #86efac;font-weight:600;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'" onclick="goPayrollsByCompany('${c.id}','${c.company_name}')">급여명세</button>
              </div>
              <button class="btn btn-sm" style="background:#e5e7eb;color:#9ca3af;border:1px solid #d1d5db;" onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='#e5e7eb'" onclick="terminateCompany('${c.id}','${c.company_name}')">해지</button>
             </div>`
      }
    </div>`;
  }).join('');
}
// 임시저장 진행 중인 고객사 draft ID (신규 작성 시 추적용)
let _currentCompanyDraftId = null;

// ── 앱 접근코드 자동 생성 ──────────────────────────────────────────────────
function generateAccessCode(){
  // 형식: 영대문자 2자 + 숫자 3자 + 영대문자 1자 + 숫자 1자  (총 7자, 예: AB123C4)
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // O·I 제외 (0·1과 혼동 방지)
  const digit = '23456789';                  // 0·1 제외
  const rand = (s) => s[Math.floor(Math.random() * s.length)];
  const code = rand(alpha)+rand(alpha)+rand(digit)+rand(digit)+rand(digit)+rand(alpha)+rand(digit);
  // 기존 고객사 코드와 충돌 검사
  const used = (allCompanies||[]).map(c=>c.access_code).filter(Boolean);
  return used.includes(code) ? generateAccessCode() : code; // 충돌 시 재귀 재생성
}
function _setAccessCode(code){
  document.getElementById('cm-code').value = code;
  document.getElementById('cm-code-display').textContent = code || '—';
}
function regenAccessCode(){
  if(!confirm('접근코드를 새로 생성하면 기존 코드로는 앱 로그인이 불가능해집니다.\n재생성하시겠습니까?')) return;
  _setAccessCode(generateAccessCode());
  toast('새 접근코드가 생성되었습니다. 저장 후 고객사에 안내해 주세요.', 'info');
}
// ──────────────────────────────────────────────────────────────────────────
// ── 고객사 모달 - 노무대행 서비스 계약서 파일 처리 (복수 파일) ──
// _cmSvcFiles: [{name, data, size}] 배열로 관리
// DB 저장: service_contract_file_data = JSON.stringify(_cmSvcFiles)
//          service_contract_file_name = 파일 수 요약 문자열 (표시용)
let _cmSvcFiles = [];  // {name:string, data:string(dataURL), size:number}

const _CM_SVC_MAX_MB   = 20;   // 파일 1개 최대 크기
const _CM_SVC_MAX_COUNT = 20;  // 최대 파일 개수

function _cmSvcFileIcon(name){
  const ext = name.split('.').pop().toLowerCase();
  if(ext === 'pdf')              return '<i class="fas fa-file-pdf cm-svc-file-item-icon pdf"></i>';
  if(ext === 'zip')              return '<i class="fas fa-file-archive cm-svc-file-item-icon zip"></i>';
  if(['jpg','jpeg','png','gif','webp'].includes(ext))
                                 return '<i class="fas fa-file-image cm-svc-file-item-icon img"></i>';
  return '<i class="fas fa-file cm-svc-file-item-icon"></i>';
}

function _cmSvcFormatSize(bytes){
  if(bytes < 1024)       return bytes + ' B';
  if(bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

function _cmSvcRenderList(){
  const listEl = document.getElementById('cm-svc-file-list');
  const wrapEl = document.getElementById('cm-svc-file-list-wrap');
  const noEl   = document.getElementById('cm-svc-no-file');
  if(!listEl) return;

  if(_cmSvcFiles.length === 0){
    noEl.style.display   = '';
    wrapEl.style.display = 'none';
    return;
  }
  noEl.style.display   = 'none';
  wrapEl.style.display = '';

  listEl.innerHTML = _cmSvcFiles.map((f, idx) => `
    <div class="cm-svc-file-item">
      ${_cmSvcFileIcon(f.name)}
      <span class="cm-svc-file-item-name" title="${f.name}">${f.name}</span>
      <span class="cm-svc-file-item-size">${_cmSvcFormatSize(f.size)}</span>
      <div class="cm-svc-file-item-btns">
        <button type="button" class="cm-svc-file-item-btn dl" onclick="cmSvcDownloadOne(${idx})">
          <i class="fas fa-download"></i> 다운로드
        </button>
        <button type="button" class="cm-svc-file-item-btn rm" onclick="cmSvcRemoveOne(${idx})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>`).join('');
}

function _cmSvcReadFiles(fileList, callback){
  // FileList → [{name, data, size}] 비동기 변환 후 callback
  const results = [];
  let pending = 0;
  const files = Array.from(fileList);
  if(!files.length){ callback([]); return; }

  files.forEach((file, i) => {
    pending++;
    const reader = new FileReader();
    reader.onload = function(e){
      results[i] = { name: file.name, data: e.target.result, size: file.size };
      if(--pending === 0) callback(results);
    };
    reader.readAsDataURL(file);
  });
}

function cmSvcFileChange(input){
  const files = Array.from(input.files);
  if(!files.length) return;

  // 크기 검사
  const overSize = files.find(f => f.size > _CM_SVC_MAX_MB * 1024 * 1024);
  if(overSize){
    toast(`"${overSize.name}" 파일이 ${_CM_SVC_MAX_MB}MB를 초과합니다.`, 'error');
    input.value = '';
    return;
  }
  if(files.length > _CM_SVC_MAX_COUNT){
    toast(`파일은 최대 ${_CM_SVC_MAX_COUNT}개까지 업로드할 수 있습니다.`, 'error');
    input.value = '';
    return;
  }

  _cmSvcReadFiles(files, function(results){
    _cmSvcFiles = results;
    _cmSvcRenderList();
    input.value = '';
  });
}

function cmSvcFileAdd(input){
  const files = Array.from(input.files);
  if(!files.length) return;

  const overSize = files.find(f => f.size > _CM_SVC_MAX_MB * 1024 * 1024);
  if(overSize){
    toast(`"${overSize.name}" 파일이 ${_CM_SVC_MAX_MB}MB를 초과합니다.`, 'error');
    input.value = '';
    return;
  }
  if(_cmSvcFiles.length + files.length > _CM_SVC_MAX_COUNT){
    toast(`파일은 최대 ${_CM_SVC_MAX_COUNT}개까지 업로드할 수 있습니다.`, 'error');
    input.value = '';
    return;
  }

  _cmSvcReadFiles(files, function(results){
    // 중복 파일명 제거 후 추가
    const existNames = new Set(_cmSvcFiles.map(f => f.name));
    const newFiles   = results.filter(f => {
      if(existNames.has(f.name)){
        toast(`"${f.name}"은 이미 추가된 파일입니다.`, 'info');
        return false;
      }
      return true;
    });
    _cmSvcFiles = [..._cmSvcFiles, ...newFiles];
    _cmSvcRenderList();
    input.value = '';
  });
}

function cmSvcDownloadOne(idx){
  const f = _cmSvcFiles[idx];
  if(!f) return;
  const a = document.createElement('a');
  a.href = f.data;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function cmSvcRemoveOne(idx){
  _cmSvcFiles.splice(idx, 1);
  _cmSvcRenderList();
}

function _cmSvcReset(){
  _cmSvcFiles = [];
  _cmSvcRenderList();
  const fi1 = document.getElementById('cm-svc-file-input');
  const fi2 = document.getElementById('cm-svc-file-add-input');
  if(fi1) fi1.value = '';
  if(fi2) fi2.value = '';
}

function _cmSvcRestore(fileNameSummary, fileDataJson){
  // fileDataJson: JSON 문자열 "[{name,data,size},...]" 또는 레거시 단일 data URL
  if(!fileDataJson){ _cmSvcReset(); return; }
  let parsed;
  try {
    parsed = JSON.parse(fileDataJson);
    if(!Array.isArray(parsed)) throw new Error('not array');
  } catch(e) {
    // 레거시: 단일 base64 data URL로 저장된 경우 래핑
    if(fileDataJson.startsWith('data:')){
      parsed = [{ name: fileNameSummary || '계약서', data: fileDataJson, size: 0 }];
    } else {
      _cmSvcReset(); return;
    }
  }
  _cmSvcFiles = parsed.filter(f => f && f.name && f.data);
  _cmSvcRenderList();
}

// DB 저장용 값 반환
function _cmSvcGetSaveData(){
  if(!_cmSvcFiles.length) return { name: '', data: '' };
  const name = _cmSvcFiles.length === 1
    ? _cmSvcFiles[0].name
    : `${_cmSvcFiles[0].name} 외 ${_cmSvcFiles.length - 1}개`;
  return { name, data: JSON.stringify(_cmSvcFiles) };
}
// ──────────────────────────────────────────────────────────────────────────

function openCompanyModal(id=null){
  editId.company=id;
  if(!id){
    _currentCompanyDraftId = null; // 신규 작성 시 초기화
  } else {
    // 기존 고객사가 임시저장 상태라면 draft ID 복원
    const _cmpData = allCompanies.find(x=>x.id===id);
    _currentCompanyDraftId = (_cmpData && _cmpData.is_draft) ? id : null;
  }
  // 임시저장 안내 텍스트 초기화
  const _cmDraftInfo = document.getElementById('cm-draft-saved-info');
  if(_cmDraftInfo){ _cmDraftInfo.style.display='none'; _cmDraftInfo.textContent=''; }
  document.getElementById('cm-title').textContent=id?'고객사 수정':'고객사 추가';
  // 수정 모드에서는 임시저장 버튼 숨김 + 등록 버튼 텍스트 변경
  const _cmDraftBtn = document.getElementById('cm-btn-draft');
  if(_cmDraftBtn) _cmDraftBtn.style.display = id ? 'none' : '';
  const _cmRegBtn = document.getElementById('cm-btn-register');
  if(_cmRegBtn) _cmRegBtn.innerHTML = id
    ? '<i class="fas fa-check-circle"></i> 수정완료'
    : '<i class="fas fa-check-circle"></i> 등록';
  ['cm-name','cm-biz','cm-rep','cm-industry','cm-addr','cm-phone','cm-email','cm-period','cm-payday','cm-note'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('cm-insurance-basis').value='';
  document.getElementById('cm-annual-leave-basis').value='';
  if(id){
    // ── 수정 모드: 기존 데이터 복원, 접근코드는 기존 코드 그대로 유지 ──
    const c=allCompanies.find(x=>x.id===id);
    if(c){
      document.getElementById('cm-name').value=c.company_name||'';
      document.getElementById('cm-biz').value=c.business_number||'';
      document.getElementById('cm-rep').value=c.representative||'';
      document.getElementById('cm-industry').value=c.industry||'';
      document.getElementById('cm-addr').value=c.address||'';
      document.getElementById('cm-phone').value=c.phone||'';
      document.getElementById('cm-email').value=c.email||'';
      document.getElementById('cm-period').value=c.pay_period||'';
      document.getElementById('cm-payday').value=c.pay_day||'';
      document.getElementById('cm-note').value=c.note||'';
      document.getElementById('cm-insurance-basis').value=c.insurance_basis||'';
      document.getElementById('cm-annual-leave-basis').value=c.annual_leave_basis||'';
      // 기존 코드 표시 (수정 불가, 재생성 버튼만 노출)
      _setAccessCode(c.access_code || generateAccessCode());
      document.getElementById('cm-code-regen-btn').style.display = 'inline-flex';
      // 서비스 계약서 파일 복원
      _cmSvcRestore(c.service_contract_file_name||'', c.service_contract_file_data||'');
      // 급여 항목 설정 복원
      _cmSetAllowanceConfig(c.allowance_config || {});
    }
    // 수정 모드: 이력 섹션 렌더링
    _renderCompanyHistory(id);
    // ── 수정 내용 적용일 UI 표시 + 최소 날짜 설정 ──
    _cmInitEffectiveDateUI(id);
  } else {
    // ── 신규 모드: 접근코드 자동 생성, 재생성 버튼 숨김 ──
    _setAccessCode(generateAccessCode());
    document.getElementById('cm-code-regen-btn').style.display = 'none';
    // 서비스 계약서 파일 초기화
    _cmSvcReset();
    // 급여 항목 설정 초기화
    _cmSetAllowanceConfig({});
    // 신규 모드: 이력 섹션 숨김
    const _histSec = document.getElementById('cm-history-section');
    if(_histSec) _histSec.style.display = 'none';
    // 신규 모드: 적용일 UI 숨김
    const _effRow = document.getElementById('cm-effective-date-row');
    if(_effRow) _effRow.style.display = 'none';
  }
  openModal('company-modal');
}
function editCompany(id){openCompanyModal(id)}

// ── 수정 내용 적용일 UI 초기화 ──
function _cmInitEffectiveDateUI(companyId){
  const row      = document.getElementById('cm-effective-date-row');
  const dateInput= document.getElementById('cm-effective-date');
  const hintEl   = document.getElementById('cm-effective-date-hint');
  if(!row || !dateInput) return;

  row.style.display = '';

  // 해당 고객사의 최종 확정 급여 지급일 산출
  const lastPay = (allPayrolls||[])
    .filter(p => p.company_id === companyId && !p.is_draft && p.pay_date)
    .map(p => p.pay_date)
    .sort()
    .pop(); // 'YYYY-MM-DD' 문자열 최대값

  // 최소 날짜: 마지막 지급일 다음날, 없으면 오늘
  let minDate;
  if(lastPay){
    const d = new Date(lastPay);
    d.setDate(d.getDate() + 1);
    minDate = d.toISOString().slice(0, 10);
  } else {
    minDate = new Date().toISOString().slice(0, 10);
  }
  dateInput.min   = minDate;
  dateInput.value = minDate; // 기본값: 최소 날짜

  if(hintEl){
    hintEl.textContent = lastPay
      ? `최종 급여 지급일(${lastPay}) 이후부터 선택 가능`
      : '최초 수정 — 오늘 이후부터 선택 가능';
  }
  // 경고 초기화
  const warnEl = document.getElementById('cm-effective-date-warn');
  if(warnEl) warnEl.style.display = 'none';
}

// ── 적용일 변경 시 실시간 검증 ──
function cmOnEffectiveDateChange(){
  const dateInput = document.getElementById('cm-effective-date');
  const warnEl    = document.getElementById('cm-effective-date-warn');
  const warnMsg   = document.getElementById('cm-effective-date-warn-msg');
  if(!dateInput || !warnEl || !warnMsg) return;

  const val = dateInput.value;
  const min = dateInput.min;
  if(val && min && val < min){
    warnEl.style.display = '';
    warnMsg.textContent  = `최종 급여 지급일(${min.replace(/(\d{4})-(\d{2})-(\d{2})/,'$1년 $2월 $3일')}) 이전은 선택할 수 없습니다.`;
  } else {
    warnEl.style.display = 'none';
  }
}

// ── 고객사 임시저장 ──
async function saveDraftCompany(){
  const name = document.getElementById('cm-name').value.trim();
  if(!name) return toast('회사명을 먼저 입력하세요.', 'error');

  const draftBody = {
    company_name:    name,
    business_number: document.getElementById('cm-biz').value.trim(),
    representative:  document.getElementById('cm-rep').value.trim(),
    industry:        document.getElementById('cm-industry').value.trim(),
    address:         document.getElementById('cm-addr').value.trim(),
    phone:           document.getElementById('cm-phone').value.trim(),
    email:           document.getElementById('cm-email').value.trim(),
    pay_period:      document.getElementById('cm-period').value.trim(),
    pay_day:         document.getElementById('cm-payday').value.trim(),
    access_code:     document.getElementById('cm-code').value || generateAccessCode(),
    note:            document.getElementById('cm-note').value.trim(),
    insurance_basis:    document.getElementById('cm-insurance-basis').value,
    annual_leave_basis: document.getElementById('cm-annual-leave-basis').value,
    service_contract_file_name: _cmSvcGetSaveData().name,
    service_contract_file_data: _cmSvcGetSaveData().data,
    allowance_config:   _cmGetAllowanceConfig(),
    status:          '임시저장',
    is_draft:        true,
    draft_saved_at:  Date.now(),
  };

  if(editId.company){
    // 기존 고객사 수정 중 임시저장 → PATCH
    draftBody.id = editId.company;
    await api(`../tables/companies/${editId.company}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
  } else if(_currentCompanyDraftId){
    // 이전에 임시저장한 적 있으면 덮어쓰기
    draftBody.id = _currentCompanyDraftId;
    await api(`../tables/companies/${_currentCompanyDraftId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
  } else {
    // 최초 임시저장 → POST
    draftBody.id = 'comp_draft_'+Date.now();
    const res = await api('../tables/companies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftBody)});
    _currentCompanyDraftId = res.id || draftBody.id;
  }

  await loadCompanies(); populateFilters(); populatePICompanies(); renderCompanies(); renderDashboard();

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const infoEl = document.getElementById('cm-draft-saved-info');
  if(infoEl){ infoEl.style.display='inline'; infoEl.innerHTML=`<i class="fas fa-check" style="color:#10b981;margin-right:3px;"></i>임시저장 완료 (${timeStr})`; }
  toast(`임시저장 되었습니다. (${timeStr})`, 'success');
}

// ── 고객사 필드 레이블 (이력 diff 표시용) ──
const _CM_FIELD_LABELS = {
  company_name:      '회사명',
  business_number:   '사업자번호',
  representative:    '대표이사',
  industry:          '업종',
  address:           '사업장주소',
  phone:             '대표연락처',
  email:             '이메일',
  pay_period:        '급여 산정기간',
  pay_day:           '급여 지급일',
  insurance_basis:   '4대보험 기준',
  annual_leave_basis:'연차 산정 기준',
  note:              '비고',
  allowance_config:  '급여항목 설정',
  access_code:       '접근코드',
};

/** 두 값이 실질적으로 같은지 비교 (JSON stringify로 깊은 비교) */
function _cmValEqual(a, b){
  if(typeof a === 'object' || typeof b === 'object')
    return JSON.stringify(a||{}) === JSON.stringify(b||{});
  return String(a||'') === String(b||'');
}

async function saveCompany(){
  const name=document.getElementById('cm-name').value.trim();
  const code=document.getElementById('cm-code').value || generateAccessCode(); // 자동 생성값 사용
  const biz=document.getElementById('cm-biz').value.trim();
  const rep=document.getElementById('cm-rep').value.trim();
  const phone=document.getElementById('cm-phone').value.trim();
  const period=document.getElementById('cm-period').value.trim();
  const payday=document.getElementById('cm-payday').value.trim();
  if(!name)   return toast('회사명을 입력하세요.','error');
  if(!biz)    return toast('사업자등록번호를 입력하세요.','error');
  if(!rep)    return toast('대표이사명을 입력하세요.','error');
  if(!phone)  return toast('대표 연락처를 입력하세요.','error');
  if(!period) return toast('급여 산정기간을 입력하세요.','error');
  if(!payday) return toast('급여 지급일을 입력하세요.','error');
  const addr=document.getElementById('cm-addr').value.trim();
  if(!addr)   return toast('사업장 주소를 입력하세요.','error');
  const insuranceBasis = document.getElementById('cm-insurance-basis').value;
  const annualLeaveBasis = document.getElementById('cm-annual-leave-basis').value;
  if(!insuranceBasis)    return toast('4대보험 적용 기준을 선택하세요.','error');
  if(!annualLeaveBasis)  return toast('연차 휴가 산정 기준을 선택하세요.','error');

  // ── 급여 항목 설정: 체크된 항목의 통상임금 포함여부 미선택 유효성 검사 ──
  const _CM_AW_PT_LABEL = {
    childcare:'출산·보육수당',
    car:'차량지원비', meal:'식대', research:'연구활동비',
    communication:'통신비', fitness:'체력증진비',
    self_dev:'자기계발비', book:'도서지원비', overseas:'해외근무수당'
  };
  for(const f of _CM_AW_PT_FIELDS){
    const hid = _cmAwHtmlId(f);
    const cb  = document.getElementById(`cm-aw-${hid}`);
    const sel = document.getElementById(`cm-aw-${hid}-pt`);
    if(cb?.checked && sel && !sel.value){
      // 해당 select에 빨간 테두리 표시 후 포커스
      sel.style.borderColor = '#e94560';
      sel.focus();
      setTimeout(() => { sel.style.borderColor = ''; }, 2000);
      return toast(`[${_CM_AW_PT_LABEL[f]}] 평균임금 포함여부(지급 방식)를 선택하세요.`, 'error');
    }
  }

  const newAllowanceCfg = _cmGetAllowanceConfig();
  const body={company_name:name,business_number:document.getElementById('cm-biz').value,representative:document.getElementById('cm-rep').value,industry:document.getElementById('cm-industry').value,address:document.getElementById('cm-addr').value,phone:document.getElementById('cm-phone').value,email:document.getElementById('cm-email').value,pay_period:document.getElementById('cm-period').value,pay_day:document.getElementById('cm-payday').value,access_code:code,note:document.getElementById('cm-note').value,insurance_basis:insuranceBasis,annual_leave_basis:annualLeaveBasis,service_contract_file_name:_cmSvcGetSaveData().name,service_contract_file_data:_cmSvcGetSaveData().data,allowance_config:newAllowanceCfg,is_draft:false,draft_saved_at:null,status:'이용중'};

  // ── 수정 모드: 적용일 검증 + diff 계산 → company_history 기록 ──
  if(editId.company){
    // ① 적용일 읽기 및 검증
    const _effDateEl  = document.getElementById('cm-effective-date');
    const _effDateStr = _effDateEl?.value || '';      // 'YYYY-MM-DD'
    const _effDateMin = _effDateEl?.min   || '';
    if(!_effDateStr){
      return toast('수정 내용 적용일을 선택하세요.', 'error');
    }
    if(_effDateMin && _effDateStr < _effDateMin){
      _effDateEl.style.borderColor = '#e94560';
      setTimeout(() => { _effDateEl.style.borderColor = ''; }, 2000);
      return toast(`적용일은 최종 급여 지급일(${_effDateMin}) 이후여야 합니다.`, 'error');
    }
    // 적용일 → ms 타임스탬프 (해당 날짜 00:00:00 KST)
    const _effTs = new Date(_effDateStr + 'T00:00:00').getTime();

    // ② diff 계산 → company_history 기록
    const prev = allCompanies.find(x=>x.id===editId.company) || {};
    const changedFields = Object.keys(_CM_FIELD_LABELS).filter(f =>
      !_cmValEqual(prev[f], body[f])
    );
    if(changedFields.length > 0){
      const changes = changedFields.map(f => ({
        field:     f,
        label:     _CM_FIELD_LABELS[f],
        before:    typeof prev[f]==='object' ? JSON.stringify(prev[f]||{}) : String(prev[f]||''),
        after:     typeof body[f]==='object' ? JSON.stringify(body[f]||{}) : String(body[f]||''),
      }));
      // 수정 직전 상태 스냅샷 (계약서 당시 정보 복원용)
      const snapshot = Object.fromEntries(
        Object.keys(_CM_FIELD_LABELS).map(f=>[f, prev[f]])
      );
      const histEntry = {
        id:           'cmhist_'+Date.now(),
        company_id:   editId.company,
        changed_at:   _effTs,            // ← 적용일 타임스탬프
        effective_date: _effDateStr,     // 사람이 읽을 수 있는 날짜 (이력 표시용)
        changes:      changes,
        snapshot:     snapshot,
      };
      await api('../tables/company_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(histEntry)});
      await loadCompanyHistories();

      // ③ 적용일 이후 시작되는 모든 계약에 변경된 allowance_config 일괄 반영
      //    allowance_config 항목이 변경된 경우에만 실행
      if(changedFields.includes('allowance_config')){
        await _cmApplyAllowanceToContracts(editId.company, _effDateStr, newAllowanceCfg);
      }
    }
    body.id=editId.company;
    await api(`../tables/companies/${editId.company}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  } else if(_currentCompanyDraftId){
    // 임시저장에서 이어서 등록
    body.id=_currentCompanyDraftId;
    await api(`../tables/companies/${_currentCompanyDraftId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  } else {
    body.id='comp'+Date.now();
    await api('../tables/companies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  }
  _currentCompanyDraftId = null;
  closeModal('company-modal');await loadCompanies();populateFilters();populatePICompanies();renderCompanies();renderDashboard();toast('고객사가 등록되었습니다. ✔');
}
/**
 * 적용일 이후 시작되는 모든 계약에 변경된 allowance_config pay_type 을 일괄 반영.
 * - 파기(파기) 상태 계약 제외
 * - 계약별 개별 *_pay_type 필드만 갱신 (금액·기본 정보는 건드리지 않음)
 *
 * @param {string} companyId     고객사 ID
 * @param {string} effectiveDateStr  적용일 'YYYY-MM-DD'
 * @param {object} newCfg        새 allowance_config
 */
async function _cmApplyAllowanceToContracts(companyId, effectiveDateStr, newCfg){
  if(!newCfg) return;

  // 적용 대상: 해당 고객사 + 계약 시작일 >= 적용일 + 파기 아님
  const targets = (allContracts||[]).filter(c =>
    c.company_id === companyId &&
    c.contract_start >= effectiveDateStr &&
    c.status !== '파기'
  );
  if(!targets.length) return;

  // pay_type 필드 매핑: allowance_config key → contract pay_type 필드명
  const PT_MAP = {
    car:           'transport_pay_type',        // 차량지원비
    meal:          'meal_pay_type',
    research:      'research_pay_type',
    communication: 'communication_pay_type',
    fitness:       'fitness_pay_type',
    self_dev:      'self_dev_pay_type',
    book:          'book_pay_type',
    overseas:      'overseas_pay_type',
  };

  let updated = 0;
  for(const contract of targets){
    const patch = {};
    for(const [cfgKey, contractField] of Object.entries(PT_MAP)){
      if(newCfg[cfgKey]){
        // 항목이 체크된 경우 → 새 pay_type 적용
        patch[contractField] = newCfg[`${cfgKey}_pay_type`] || '';
      }
      // 체크 해제된 항목은 계약의 pay_type을 건드리지 않음
    }
    // custom_items: 계약의 custom_allowances JSON에 새 항목 키 반영 (값은 0으로 초기화)
    if(newCfg.custom_items && newCfg.custom_items.length > 0){
      let existingCustom = {};
      try { existingCustom = typeof contract.custom_allowances === 'string'
        ? JSON.parse(contract.custom_allowances) : (contract.custom_allowances || {}); }
      catch(e){ existingCustom = {}; }
      const mergedCustom = {};
      newCfg.custom_items.forEach(item => {
        mergedCustom[item.key] = existingCustom[item.key] ?? 0;
      });
      patch.custom_allowances = JSON.stringify(mergedCustom);
    }
    if(Object.keys(patch).length === 0) continue;
    await api(`../tables/contracts/${contract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    updated++;
  }

  if(updated > 0){
    await loadContracts();
    toast(`${effectiveDateStr} 이후 시작 계약 ${updated}건에 급여 항목 설정이 반영되었습니다.`, 'success');
  }
}

async function deleteCompany(id){
  if(!confirm('삭제하시겠습니까?')) return;
  await api(`../tables/companies/${id}`,{method:'DELETE'});await loadCompanies();populateFilters();renderCompanies();renderDashboard();toast('삭제됨');
}

// ══════════════════════════════════════════════════════════════════════════════
// 고객사 수정 이력 렌더링
// ══════════════════════════════════════════════════════════════════════════════
let _cmHistPage = 1;
const _CM_HIST_PAGE_SIZE = 10;

function _fmtHistVal(val, field){
  if(field === 'allowance_config'){
    try {
      const cfg = typeof val === 'string' ? JSON.parse(val) : (val || {});
      const lines = [];
      // pay_type select 있는 항목 (childcare/car/meal 포함 — 전체 _CM_AW_PT_FIELDS 기준)
      const ptLabels = {
        childcare:'출산·보육수당',
        car:'차량지원비', meal:'식대',
        research:'연구활동비', communication:'통신비', fitness:'체력증진비',
        self_dev:'자기계발비', book:'도서지원비', overseas:'해외근무수당',
      };
      // pay_type select 없는 항목 (체크만)
      const simpleLabels = {
        site:'현장수당', position:'직책수당', skill:'기술수당',
        license:'면허수당', remote_area:'벽지수당', regular_bonus:'정기상여',
      };
      const _PT_KO = { fixed:'정기지급(통상O)', daily:'출근일수(통상O)', non_fixed:'비통상임금', '':'', undefined:'' };
      Object.entries(ptLabels).forEach(([k, lbl]) => {
        if(cfg[k]){
          const ptRaw = cfg[k+'_pay_type'] || '';
          const ptStr = _PT_KO[ptRaw] || ptRaw || '포함';
          lines.push(`${lbl}(${ptStr})`);
        }
      });
      Object.entries(simpleLabels).forEach(([k, lbl]) => {
        if(cfg[k]) lines.push(lbl);
      });
      if(Array.isArray(cfg.custom_items)){
        cfg.custom_items.forEach(it => { if(it.label) lines.push(it.label); });
      }
      return lines.length ? lines.join(', ') : '(없음)';
    } catch(e){ return String(val||''); }
  }
  const s = String(val||'').trim();
  return s || '(없음)';
}

function _renderCompanyHistory(companyId){
  const sec = document.getElementById('cm-history-section');
  if(!sec) return;
  const rows = (allCompanyHistories||[])
    .filter(h => h.company_id === companyId)
    .sort((a,b) => (b.changed_at||0) - (a.changed_at||0));

  if(!rows.length){
    sec.style.display = 'none';
    return;
  }
  sec.style.display = '';

  // 총 페이지
  const total = rows.length;
  const totalPages = Math.ceil(total / _CM_HIST_PAGE_SIZE);
  _cmHistPage = Math.min(_cmHistPage, totalPages);
  const pageRows = rows.slice((_cmHistPage-1)*_CM_HIST_PAGE_SIZE, _cmHistPage*_CM_HIST_PAGE_SIZE);

  // 카운트 뱃지
  const badge = document.getElementById('cm-history-count');
  if(badge) badge.textContent = total;

  // tbody
  const tbody = document.getElementById('cm-history-tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  pageRows.forEach(h => {
    const dt = h.changed_at ? new Date(h.changed_at) : null;
    const dtStr = dt ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` : '-';
    const changes = Array.isArray(h.changes) ? h.changes : [];
    const nCh = changes.length;
    // 첫 번째 변경 행: 날짜 + rowspan
    changes.forEach((ch, ci) => {
      const tr = document.createElement('tr');
      tr.className = ci === 0 ? 'cm-hist-row-first' : 'cm-hist-row-cont';
      if(ci === 0){
        const tdDate = document.createElement('td');
        tdDate.rowSpan = nCh;
        tdDate.className = 'cm-hist-date';
        tdDate.textContent = dtStr;
        tr.appendChild(tdDate);
      }
      const tdField = document.createElement('td');
      tdField.className = 'cm-hist-field';
      tdField.textContent = ch.label || ch.field;
      const tdBefore = document.createElement('td');
      tdBefore.className = 'cm-hist-before';
      tdBefore.textContent = _fmtHistVal(ch.before, ch.field);
      const tdAfter = document.createElement('td');
      tdAfter.className = 'cm-hist-after';
      tdAfter.textContent = _fmtHistVal(ch.after, ch.field);
      tr.appendChild(tdField);
      tr.appendChild(tdBefore);
      tr.appendChild(tdAfter);
      tbody.appendChild(tr);
    });
  });

  // 페이징
  const pager = document.getElementById('cm-history-pager');
  if(!pager) return;
  if(totalPages <= 1){ pager.innerHTML = ''; return; }
  let pHtml = `<div class="cm-hist-pager">`;
  pHtml += `<button class="cm-hist-page-btn" ${_cmHistPage<=1?'disabled':''} onclick="_cmHistGoPage(${_cmHistPage-1})"><i class="fas fa-chevron-left"></i></button>`;
  // 최대 5개 페이지 버튼
  const pStart = Math.max(1, _cmHistPage-2);
  const pEnd   = Math.min(totalPages, pStart+4);
  for(let p=pStart; p<=pEnd; p++){
    pHtml += `<button class="cm-hist-page-btn${p===_cmHistPage?' active':''}" onclick="_cmHistGoPage(${p})">${p}</button>`;
  }
  pHtml += `<button class="cm-hist-page-btn" ${_cmHistPage>=totalPages?'disabled':''} onclick="_cmHistGoPage(${_cmHistPage+1})"><i class="fas fa-chevron-right"></i></button>`;
  pHtml += `<span class="cm-hist-page-info">${_cmHistPage} / ${totalPages} 페이지 (총 ${total}건)</span></div>`;
  pager.innerHTML = pHtml;
}

function _cmHistGoPage(p){
  _cmHistPage = p;
  const companyId = editId.company;
  if(companyId) _renderCompanyHistory(companyId);
}

function _cmHistToggle(){
  const body = document.getElementById('cm-history-body');
  const icon = document.getElementById('cm-history-toggle-icon');
  if(!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : '';
  if(icon) icon.className = isOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
}

/** 계약 체결 시점에 유효했던 고객사 스냅샷을 반환
 *  contract_start(또는 created_at) 이후의 첫 번째 이력 직전 상태 = 해당 시점의 회사 정보
 *  이력이 없으면 현재 회사 정보 그대로 반환
 */
function getCompanySnapshotAt(companyId, contractTimestamp){
  const co = (allCompanies||[]).find(x=>x.id===companyId);
  if(!co) return null;
  const hist = (allCompanyHistories||[])
    .filter(h => h.company_id === companyId && (h.changed_at||0) > (contractTimestamp||0))
    .sort((a,b) => (a.changed_at||0) - (b.changed_at||0)); // 오름차순
  if(!hist.length){
    // 계약 이후 변경 없음 → 현재 회사 정보
    return co;
  }
  // 계약 이후 가장 첫 변경의 snapshot = 계약 당시 상태
  return { ...co, ...(hist[0].snapshot||{}) };
}

// ══ 급여 항목 설정(allowance_config) 헬퍼 ══
// pay_type select가 있는 항목 목록
const _CM_AW_PT_FIELDS = ['childcare','car','meal','research','communication','fitness','self_dev','book','overseas'];
// pay_type select 없는 항목 (체크만) — regular_bonus: 통상임금 포함 고정
const _CM_AW_SIMPLE_FIELDS = ['site','position','skill','license','remote_area','regular_bonus'];

/** 체크박스 체크 시 pay_type select 활성/비활성 토글 */
function cmAwTogglePayType(field, checked){
  const sel = document.getElementById(`cm-aw-${_cmAwHtmlId(field)}-pt`);
  if(!sel) return;
  sel.disabled = !checked;
  if(!checked){
    sel.value = '';
  } else if(!sel.value){
    // 새로 체크 시 선택값이 없으면 '매월 정기지급(fixed)'을 기본값으로 설정
    sel.value = 'fixed';
  }
}

/** allowance_config 필드명 → HTML id 변환 (self_dev → self-dev) */
function _cmAwHtmlId(f){ return f.replace(/_/g, '-'); }

/** 모달 → allowance_config 객체 수집 */
function _cmGetAllowanceConfig(){
  const cfg = {};
  _CM_AW_SIMPLE_FIELDS.forEach(f => {
    cfg[f] = document.getElementById(`cm-aw-${_cmAwHtmlId(f)}`)?.checked || false;
  });
  _CM_AW_PT_FIELDS.forEach(f => {
    const hid = _cmAwHtmlId(f);
    cfg[f] = document.getElementById(`cm-aw-${hid}`)?.checked || false;
    cfg[`${f}_pay_type`] = cfg[f]
      ? (document.getElementById(`cm-aw-${hid}-pt`)?.value || '')
      : '';
  });
  // custom_items 수집
  const customItems = [];
  const area = document.getElementById('cm-custom-items-area');
  if(area){
    area.querySelectorAll('.cm-custom-item-row').forEach(row => {
      const key   = row.dataset.key || '';
      const label = row.querySelector('.cm-custom-label-input')?.value?.trim() || '';
      const pt    = row.querySelector('.cm-custom-pt-select')?.value  || 'fixed';
      if(label) customItems.push({ key, label, pay_type: pt });
    });
  }
  cfg.custom_items = customItems;
  return cfg;
}

/** allowance_config 객체 → 모달에 복원
 *  car / meal 은 cfg 에 값이 없을 때(신규·구형 고객사) checked=true, pay_type='fixed' 기본값 적용 */
const _CM_AW_DEFAULT_CHECKED = { car: 'fixed', meal: 'fixed' };

function _cmSetAllowanceConfig(cfg){
  if(!cfg) cfg = {};
  _CM_AW_SIMPLE_FIELDS.forEach(f => {
    const cb = document.getElementById(`cm-aw-${_cmAwHtmlId(f)}`);
    if(cb) cb.checked = !!cfg[f];
  });
  _CM_AW_PT_FIELDS.forEach(f => {
    const hid = _cmAwHtmlId(f);
    const cb  = document.getElementById(`cm-aw-${hid}`);
    const sel = document.getElementById(`cm-aw-${hid}-pt`);
    // car / meal: cfg에 명시적 값이 없으면 기본값(체크 + fixed) 적용
    const useDefault = (f in _CM_AW_DEFAULT_CHECKED) && cfg[f] === undefined;
    const checked  = useDefault ? true  : !!cfg[f];
    const payType  = useDefault
      ? (_CM_AW_DEFAULT_CHECKED[f])
      : (cfg[`${f}_pay_type`] || (cfg[f] ? 'fixed' : ''));
    if(cb)  cb.checked = checked;
    if(sel){ sel.disabled = !checked; sel.value = payType; }
  });
  // custom_items 복원
  _cmRenderCustomItems(cfg.custom_items || []);
}

/* ─── 기타 고정지급 수당 (custom_items) UI ─── */

/** custom_items 배열 → cm-custom-items-area 렌더링 */
function _cmRenderCustomItems(items){
  const area  = document.getElementById('cm-custom-items-area');
  const empty = document.getElementById('cm-custom-items-empty');
  if(!area) return;
  area.innerHTML = '';
  (items || []).forEach(item => {
    _cmAppendCustomRow(item.key || `custom_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, item.label || '', item.pay_type || 'fixed');
  });
  if(empty) empty.style.display = 'none';
}

/** 빈 행 추가 (항목 추가 버튼 클릭 시) */
function cmAddCustomItem(){
  const key = `custom_${Date.now()}`;
  _cmAppendCustomRow(key, '', 'fixed');
  const area  = document.getElementById('cm-custom-items-area');
  const empty = document.getElementById('cm-custom-items-empty');
  if(empty) empty.style.display = 'none';
  // 새로 추가된 행의 입력란에 포커스
  const lastRow = area?.lastElementChild;
  lastRow?.querySelector('.cm-custom-label-input')?.focus();
}

/** key에 해당하는 행 삭제 */
function cmRemoveCustomItem(key){
  const row = document.querySelector(`.cm-custom-item-row[data-key="${key}"]`);
  if(row) row.remove();
  const area  = document.getElementById('cm-custom-items-area');
  const empty = document.getElementById('cm-custom-items-empty');
  if(empty) empty.style.display = 'none'; // 0개여도 hide — 저장 전까지 빈 상태는 없음
}

/** 단일 custom 행 DOM 생성 및 area에 append */
function _cmAppendCustomRow(key, label, payType){
  const area = document.getElementById('cm-custom-items-area');
  if(!area) return;
  const row = document.createElement('div');
  row.className = 'cm-custom-item-row';
  row.dataset.key = key;
  row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;';
  row.innerHTML = `
    <input type="text" class="cm-custom-label-input" placeholder="항목명 입력 (예: 복지포인트)" value="${_escHtml(label)}"
      style="flex:1;min-width:120px;padding:5px 8px;font-size:13px;border:1px solid #d1d5db;border-radius:5px;outline:none;" />
    <select class="cm-custom-pt-select"
      style="padding:5px 6px;font-size:12px;border:1px solid #d1d5db;border-radius:5px;color:#374151;background:#fff;">
      <option value="fixed"  ${payType==='fixed'   ? 'selected':''}>평균임금 포함</option>
      <option value="nonfixed" ${payType==='nonfixed'? 'selected':''}>평균임금 제외</option>
    </select>
    <button type="button" onclick="cmRemoveCustomItem('${key}')"
      style="flex-shrink:0;padding:4px 8px;font-size:12px;color:#ef4444;background:#fff0f0;border:1px solid #fca5a5;border-radius:5px;cursor:pointer;">
      <i class="fas fa-times"></i>
    </button>`;
  area.appendChild(row);
}

/** HTML 특수문자 이스케이프 (항목명 XSS 방지) */
function _escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// ── 대시보드 카드용 사용료 현황 계산 ──
function getBillingInfoForDashCard(companyId){
  const todayStr = new Date().toISOString().slice(0,10);
  const now = new Date();
  const yr  = now.getFullYear();
  const mo  = now.getMonth() + 1;

  // 이번 달 실제 청구
  const thisBill = allBillings.find(b =>
    b.company_id === companyId &&
    Number(b.billing_year) === yr &&
    Number(b.billing_month) === mo
  );

  // 이월 미납금 (마감일 경과된 이전 월 잔액)
  const calcPrevUnpaid = (billingYear, billingMonth) =>
    allBillings.filter(b => {
      if(b.company_id !== companyId) return false;
      const bYM = Number(b.billing_year)*100 + Number(b.billing_month);
      const cYM = Number(billingYear)*100    + Number(billingMonth);
      return bYM < cYM;
    }).reduce((sum, b) => {
      if(b.payment_status === '완납') return sum;
      if(!b.due_date || b.due_date >= todayStr) return sum;
      const rem = (b.total_amount||0) - (b.partial_paid_amount||0);
      return sum + (rem > 0 ? rem : 0);
    }, 0);

  // ── 청구 생성 전 (가상) ──
  if(!thisBill){
    const prevUnpaid = calcPrevUnpaid(yr, mo);
    return { type:'virtual', prevUnpaid };
  }

  // ── 실제 청구 있음 ──
  const paid    = thisBill.partial_paid_amount || 0;
  const rem     = (thisBill.total_amount || 0) - paid;
  const prevUnpaid = calcPrevUnpaid(yr, mo);
  const curOverdue = (rem > 0 && thisBill.due_date && thisBill.due_date < todayStr) ? rem : 0;
  const totalUnpaid = prevUnpaid + curOverdue;

  let status;
  if(thisBill.payment_status === '완납' || (thisBill.payment_date && rem <= 0)){
    status = prevUnpaid > 0 ? '일부납' : '완납';
  } else if(paid > 0 && rem > 0){
    status = '일부납';
  } else if(thisBill.due_date && thisBill.due_date < todayStr){
    status = '미납';
  } else {
    status = '납부대기';
  }

  // 버튼 표시 여부 (관리 열에 버튼이 활성화된 경우)
  const showButton = status !== '완납' || prevUnpaid > 0;
  const modalTotal = rem + prevUnpaid;

  return {
    type: 'actual',
    bill: thisBill,
    status,
    paid,
    rem,
    prevUnpaid,
    totalUnpaid,
    showButton,
    modalTotal
  };
}

// 고객사 카드 → 사용료 관리 바로가기 (해당 고객사 필터)
function goBillingByCompany(companyId, companyName){
  const menuEl = document.querySelector('.menu-item[data-page="billing"]');
  showPage('billing', menuEl);

  // 검색창에 고객사명 입력 후 재렌더링
  const searchEl = document.getElementById('billing-search');
  if(searchEl) searchEl.value = companyName;

  // 필터는 전체로 초기화
  const allRadio = document.querySelector('input[name="billing-filter"][value="all"]');
  if(allRadio) allRadio.checked = true;

  renderBillings();

  // 안내 배너
  const old = document.getElementById('billing-company-banner');
  if(old) old.remove();
  const header = document.querySelector('#page-billing .page-header');
  if(header){
    const banner = document.createElement('div');
    banner.id = 'billing-company-banner';
    banner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:10px 16px;background:linear-gradient(90deg,#faf5ff,#ede9fe);border:1px solid #c4b5fd;border-radius:10px;font-size:13px;color:#6d28d9;font-weight:600;';
    banner.innerHTML = `<span><i class="fas fa-filter" style="margin-right:6px;"></i>${companyName} 사용료 현황 보기</span>
      <button onclick="clearBillingCompanyFilter()" style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:16px;" title="필터 해제"><i class="fas fa-times-circle"></i></button>`;
    header.insertAdjacentElement('afterend', banner);
  }
}

function clearBillingCompanyFilter(){
  const banner = document.getElementById('billing-company-banner');
  if(banner) banner.remove();
  const searchEl = document.getElementById('billing-search');
  if(searchEl) searchEl.value = '';
  renderBillings();
}



// ── 현재 선택된 근로계약서 페이지 고객사 ID ──
// currentContCompanyId → 최상단 STATE 블록에서 선언됨

// 고객사 칩 목록 렌더링
function renderContCompanyList(){
  const q = (document.getElementById('cont-company-search')?.value || '').toLowerCase().trim();
  const container = document.getElementById('cont-company-chips');
  if(!container) return;

  const companies = allCompanies.filter(c =>
    c.status === '이용중' && (!q || c.company_name.toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));

  if(!companies.length){
    container.innerHTML = `<div style="color:#9ca3af;font-size:13px;padding:8px 0;">${q ? `"${q}" 검색 결과 없음` : '이용 중인 고객사가 없습니다'}</div>`;
    return;
  }

  container.innerHTML = companies.map(c => {
    const isSelected = c.id === currentGlobalCompanyId;
    const empCnt = allEmployees.filter(e => e.company_id === c.id && (e.status==='재직'||e.status==='active')).length;
    return `<button onclick="selectContCompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}')"
      class="co-chip${isSelected?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
      <span class="co-chip-badge count">${empCnt}명</span>
    </button>`;
  }).join('');
}

// 근로계약서 페이지 고객사 선택
function selectContCompany(companyId, companyName){
  currentContCompanyId = companyId;
  // 글로벌 공유 변수만 업데이트 (다른 페이지 변수는 showPage()에서 처리)
  currentGlobalCompanyId = companyId;
  currentGlobalCompanyName = companyName;
  document.getElementById('cont-selected-company-label').innerHTML =
    `<i class="fas fa-file-signature" style="margin-right:6px;"></i>${companyName} 근로계약 목록`;
  document.getElementById('cont-company-select-card').style.display = 'none';
  document.getElementById('cont-list-section').style.display = 'block';
  // 고객사 선택 시: 전사 기준 배너(임시저장·날인본·동의서) 즉시 숨김
  // → 선택된 고객사의 계약 상태는 목록 테이블 및 알림 카드로 표시됨
  ['contracts-draft-banner','contracts-signed-banner','contracts-consent-banner'].forEach(id => {
    const el = document.getElementById(id);
    if(el){ el.style.display = 'none'; el.innerHTML = ''; }
  });
  document.getElementById('cont-search').value = '';
  const _ecEl = document.getElementById('cont-filter-empcat'); if(_ecEl) _ecEl.value='';
  const _stEl = document.getElementById('cont-filter-status'); if(_stEl) _stEl.value='';
  pages.cont = 1;
  renderContracts();
}

// 고객사 선택 해제
function clearContCompanySelect(){
  currentContCompanyId = null;
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  document.getElementById('cont-company-select-card').style.display = '';
  document.getElementById('cont-list-section').style.display = 'none';
  document.getElementById('cont-company-search').value = '';
  renderContCompanyList();
  // 고객사 해제 시: 전사 기준 배너 복원 (미선택 상태로 돌아감)
  if(typeof _renderContractsBanners === 'function') _renderContractsBanners();
}

// 고객사 관리 카드 → 근로계약서 관리 바로가기
function goContractsByCompany(companyId, companyName){
  const co = allCompanies.find(c => c.id === companyId);
  if(co && co.status !== '이용중'){
    toast('"' + companyName + '"은 ' + co.status + ' 상태입니다. 이용중인 고객사만 근로계약 관리가 가능합니다.', 'error');
    return;
  }
  const menuEl = document.querySelector('.menu-item[data-page="contracts"]');
  showPage('contracts', menuEl);
  selectContCompany(companyId, companyName);
}

// 대시보드 고객사 카드 → 급여 통계 조회 바로가기
function goLaborStatusByCompany(companyId, companyName){
  const menuEl = document.querySelector('.menu-item[data-page="labor-status"]');
  showPage('labor-status', menuEl);
  selectLsCompany(companyId, companyName);
}

// 구 배너 방식 호환용 (빈 함수로 유지)
function clearContractCompanyFilter(){ clearContCompanySelect(); }

// ─── 임금대장 고객사 칩 선택 ───
// currentPayCompanyId → 최상단 STATE 블록에서 선언됨

function renderPayCompanyList(){
  const q = (document.getElementById('pay-company-search')?.value || '').toLowerCase().trim();
  const container = document.getElementById('pay-company-chips');
  if(!container) return;

  const companies = allCompanies.filter(c =>
    c.status === '이용중' && (!q || c.company_name.toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));

  if(!companies.length){
    container.innerHTML = `<div style="color:#9ca3af;font-size:13px;padding:8px 0;">${q ? `"${q}" 검색 결과 없음` : '이용 중인 고객사가 없습니다'}</div>`;
    return;
  }

  container.innerHTML = companies.map(c => {
    const isSelected = c.id === currentGlobalCompanyId;
    const payCnt = allPayrolls.filter(p => !p.is_draft && p.company_id === c.id).length;
    return `<button onclick="selectPayCompany('${c.id}','${c.company_name.replace(/'/g,"\\'")}')"
      class="co-chip${isSelected?' selected':''}">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name}
      <span class="co-chip-badge count">${payCnt}건</span>
    </button>`;
  }).join('');
}

function selectPayCompany(companyId, companyName){
  currentPayCompanyId = companyId;
  // 글로벌 공유 변수만 업데이트 (다른 페이지 변수는 showPage()에서 처리)
  currentGlobalCompanyId = companyId;
  currentGlobalCompanyName = companyName;
  pages.pay = 1;
  document.getElementById('pay-selected-company-label').innerHTML =
    `<i class="fas fa-money-bill-wave" style="margin-right:6px;"></i>${companyName} 급여 명세서`;
  document.getElementById('pay-company-select-card').style.display = 'none';
  document.getElementById('pay-list-section').style.display = 'block';
  document.getElementById('pay-excel-btn').style.display = '';
  document.getElementById('pay-search').value = '';
  initPayYearMonth();
  renderPayrolls();
}

function clearPayCompanySelect(){
  currentPayCompanyId = null;
  currentGlobalCompanyId = null;
  currentGlobalCompanyName = '';
  document.getElementById('pay-company-select-card').style.display = '';
  document.getElementById('pay-list-section').style.display = 'none';
  document.getElementById('pay-excel-btn').style.display = 'none';
  document.getElementById('pay-company-search').value = '';
  renderPayCompanyList();
}

// 연도·월 필터 초기화
function initPayYearMonth(){
  const yrSel = document.getElementById('pay-year-filter');
  if(!yrSel) return;
  const curYr = new Date().getFullYear();
  const curMo = new Date().getMonth()+1;
  // 연도 옵션 (매번 재생성하여 현재연도 선택 보장)
  yrSel.innerHTML = '';
  for(let y = curYr + 1; y >= curYr - 2; y--){
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '년';
    if(y === curYr) opt.selected = true;
    yrSel.appendChild(opt);
  }
  // 월 옵션 — 현재 월 기본 선택, '전체' 없음
  const moSel = document.getElementById('pay-month-filter');
  if(moSel){
    moSel.innerHTML = '';
    for(let i=1;i<=12;i++){
      moSel.innerHTML += `<option value="${i}" ${i===curMo?'selected':''}>${i}월</option>`;
    }
  }
}

// 대시보드·고객사관리 카드 → 임금대장 바로가기
function goPayrollsByCompany(companyId, companyName){
  const co = allCompanies.find(c => c.id === companyId);
  if(co && co.status !== '이용중'){
    toast('"' + companyName + '"은 ' + co.status + ' 상태입니다. 이용중인 고객사만 급여 조회가 가능합니다.', 'error');
    return;
  }
  const menuEl = document.querySelector('.menu-item[data-page="payrolls"]');
  showPage('payrolls', menuEl);
  selectPayCompany(companyId, companyName);
}

// 하위 호환
function showPayrollCompanyBanner(){}
function clearPayrollCompanyFilter(){ clearPayCompanySelect(); }

// 해지 대상 고객사 임시 저장
let terminateTargetId = null;

// [사용료 숨김] terminateCompany - 단순화 버전 (미납금 체크 제거)
function terminateCompany(id, name){
  terminateTargetId = id;
  document.getElementById('tm-company-name').innerHTML =
    `<i class="fas fa-building" style="color:#64748b;margin-right:6px;"></i>${name}`;
  openModal('terminate-modal');
}

// [사용료 숨김] doTerminate - 단순화 버전 (미납금 체크 없이 즉시 해지)
async function doTerminate(){
  const id = terminateTargetId;
  if(!id) return;
  const c = allCompanies.find(x => x.id === id);
  if(!c) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const body = {...c, status:'해지', contract_end_date: todayStr};
  await api(`../tables/companies/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  closeModal('terminate-modal');
  await loadCompanies();populateFilters();populatePICompanies();renderCompanies();renderDashboard();
  toast(`"${c.company_name}" 해지 완료 (해지일: ${todayStr})`);
}

/* [사용료 숨김] 기존 terminateCompany / doTerminate (미납금 체크 포함) - 원복 시 아래 주석 해제
function terminateCompany_DISABLED(id, name){
  const todayStr = new Date().toISOString().slice(0, 10);
  terminateTargetId = id;
  let unpaidAmount = 0, unpaidCount = 0;
  let pendingAmount = 0, pendingCount = 0;
  allBillings.filter(b => b.company_id === id).forEach(b => {
    if(b.payment_status === '완납') return;
    const paid = b.partial_paid_amount || 0;
    const rem  = (b.total_amount || 0) - paid;
    if(rem <= 0) return;
    if(b.due_date && b.due_date < todayStr){
      unpaidAmount += rem; unpaidCount++;
    } else {
      pendingAmount += rem; pendingCount++;
    }
  });
  const totalLoss = unpaidAmount + pendingAmount;
  const hasBalance = totalLoss > 0;
  document.getElementById('tm-company-name').innerHTML =
    `<i class="fas fa-building" style="color:#64748b;margin-right:6px;"></i>${name}`;
  if(hasBalance){
    document.getElementById('tm-no-balance').style.display   = 'none';
    document.getElementById('tm-has-balance').style.display  = 'block';
    document.getElementById('tm-buttons-balance').style.cssText = 'display:flex;flex:2;gap:8px;';
    document.getElementById('tm-buttons-clean').style.display  = 'none';
    document.getElementById('tm-unpaid-amount').textContent  = Math.round(unpaidAmount).toLocaleString('ko-KR') + '원';
    document.getElementById('tm-unpaid-count').textContent   = unpaidCount + '건';
    document.getElementById('tm-pending-amount').textContent = Math.round(pendingAmount).toLocaleString('ko-KR') + '원';
    document.getElementById('tm-pending-count').textContent  = pendingCount + '건';
    document.getElementById('tm-total-loss-preview').textContent = Math.round(totalLoss).toLocaleString('ko-KR') + '원';
  } else {
    document.getElementById('tm-no-balance').style.display   = 'block';
    document.getElementById('tm-has-balance').style.display  = 'none';
    document.getElementById('tm-buttons-balance').style.display = 'none';
    document.getElementById('tm-buttons-clean').style.cssText   = 'display:block;';
  }
  openModal('terminate-modal');
}

async function doTerminate_DISABLED(withLoss){
  const id = terminateTargetId;
  if(!id) return;
  const c = allCompanies.find(x => x.id === id);
  if(!c) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  if(!withLoss){
    const hasBalance = allBillings.some(b => {
      if(b.company_id !== id || b.payment_status === '완납') return false;
      const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
      return rem > 0;
    });
    if(hasBalance){
      closeModal('terminate-modal');
      toast('완납 후 해지할 수 있습니다. 미정산 금액을 먼저 처리해 주세요.', 'error');
      return;
    }
    const body = {...c, status:'해지', contract_end_date: todayStr};
    await api(`../tables/companies/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    closeModal('terminate-modal');
    await loadCompanies();populateFilters();populatePICompanies();renderCompanies();renderDashboard();
    toast(`"${c.company_name}" 해지 완료 (해지일: ${todayStr})`);
    return;
  }
  let totalLoss = 0;
  const unpaidBillings = allBillings.filter(b => {
    if(b.company_id !== id || b.payment_status === '완납') return false;
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    return rem > 0;
  });
  for(const b of unpaidBillings){
    const rem = (b.total_amount || 0) - (b.partial_paid_amount || 0);
    totalLoss += rem;
    const updBody = {...b, payment_status:'완납', loss_amount:rem, loss_date:todayStr};
    await api(`../tables/billings/${b.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updBody)});
  }
  const compBody = {...c, status:'해지', contract_end_date:todayStr, loss_amount:(c.loss_amount||0)+totalLoss, loss_date:todayStr};
  await api(`../tables/companies/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(compBody)});
  closeModal('terminate-modal');
  await loadData();populateFilters();populatePICompanies();renderCompanies();renderDashboard();renderBillingTrendChart();
  toast(`"${c.company_name}" 손실 처리(${Math.round(totalLoss).toLocaleString('ko-KR')}원) 후 해지 완료`);
}
*/
