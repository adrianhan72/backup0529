// ============================================================================
// ê¸‰ì—¬ ?…ë ¥ ?˜ì´ì§€ ???„ì§???„ê¸ˆ?€???¼ê´„ ?…ë¡œ??ëª¨ë‹¬
// ============================================================================

// ?€?€ ëª¨ë“ˆ ?¤ì½”?? calcPI / calcPIManual / calcPIFixed ê³µìœ  ?€?€
let _layoffPay = 0;
let _maternityPay = 0;
let _retroOverpaymentTotal = 0;
let _retroHolidayOverpay = 0; // ?Œê¸‰ ê²°ê·¼?¼ë¡œ ê³¼ì?ê¸‰ëœ ì£¼íœ´?˜ë‹¹

function openPIUploadModal(){
  const coId = currentGlobalCompanyId;
  if(!coId){ toast('ê³ ê°?¬ë? ë¨¼ì? ? íƒ?˜ì„¸??','warning'); return; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);

  const co = allCompanies.find(c => c.id === coId);
  const coName = co ? co.company_name : '';

  // ë¶€?œëª© ?…ë°?´íŠ¸
  const subEl = document.getElementById('pi-upload-modal-sub');
  if(subEl) subEl.textContent = `${coName}${yr && mo ? `??{yr}??${mo}?? : ''}`;

  // ?œë¡­ì¡´Â·ë¼ë²?ì´ˆê¸°??
  const labelEl = document.getElementById('pi-upload-file-label');
  if(labelEl) labelEl.textContent = '';
  const progressEl = document.getElementById('pi-upload-progress');
  if(progressEl) progressEl.style.display = 'none';

  const modal = document.getElementById('pi-upload-modal');
  if(modal){ modal.style.display = 'flex'; }
}

function closePIUploadModal(){
  const modal = document.getElementById('pi-upload-modal');
  if(modal) modal.style.display = 'none';
  // ?Œì¼ input ì´ˆê¸°??
  const fileInput = document.getElementById('pi-upload-file-input');
  if(fileInput) fileInput.value = '';
}

/**
 * ?„ì§???„ê¸ˆ?€???¼ê´„ ?…ë¡œ???¸ë“¤??
 * - ê¸°ì¡´ handleExcelUpload() + validateAndParseExcel() ë¡œì§??ê·¸ë?ë¡??¬ì‚¬??
 */
function handlePIBulkUpload(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;

  // ?Œì¼ëª??œì‹œ
  const labelEl = document.getElementById('pi-upload-file-label');
  if(labelEl) labelEl.textContent = '?“ ' + file.name;

  // ì§„í–‰ ?œì‹œ
  const progressEl = document.getElementById('pi-upload-progress');
  if(progressEl) progressEl.style.display = 'block';

  // ?Œì¼ input ì´ˆê¸°??(ê°™ì? ?Œì¼ ?¬ì—…ë¡œë“œ ?ˆìš©)
  if(event.target && event.target.value !== undefined) event.target.value = '';

  // upload-file-name(ê¸°ì¡´ UI ?¼ë²¨)???™ê¸°??(showUploadReport ??ì°¸ì¡° ë°©ì?)
  const legacyLabel = document.getElementById('upload-file-name');
  if(legacyLabel) legacyLabel.textContent = '?“ ' + file.name;

  const reader = new FileReader();
  reader.onload = e => {
    if(progressEl) progressEl.style.display = 'none';
    try{
      const wb = XLSX.read(e.target.result, { type:'array', cellStyles:true });
      closePIUploadModal();
      validateAndParseExcel(wb, file.name);
    } catch(err){
      if(progressEl) progressEl.style.display = 'none';
      showUploadReport(false, [`?Œì¼???½ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤: ${err.message}`], [], [], [], []);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ì§€ê¸‰ë??ì ëª©ë¡ ê´€???¨ìˆ˜
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

/**
 * ê¸‰ì—¬ì§€ê¸??„ì›” ? íƒ ì¹´ë“œ(pi-period-section)??ê°€?œì„± ?™ê¸°??
 * - formVisible=true  : ??ê¸‰ì—¬ ?…ë ¥/?˜ì • ì¤? ???„ì›” ì¹´ë“œ ?¨ê?
 * - formVisible=false : ëª©ë¡/ì´ˆê¸° ?íƒœ  ???„ì›” ì¹´ë“œ ?œì‹œ
 */
function _syncPIPeriodSectionVisibility(formVisible){
  const sec = document.getElementById('pi-period-section');
  if(!sec) return;
  sec.style.display = formVisible ? 'none' : '';
}

/**
 * 'ì§€ê¸‰ë??ì ëª©ë¡ë³´ê¸°' ë²„íŠ¼ ?´ë¦­ ?¸ë“¤??
 * - ? íƒ?????”ì— ? íš¨??ê·¼ë¡œê³„ì•½???ˆëŠ” ?´ë‹¹ ê³ ê°??ê·¼ë¡œ??ëª©ë¡???Œì´ë¸”ë¡œ ?œì‹œ
 */
function loadPITargetList(){
  const coId = currentGlobalCompanyId;
  if(!coId){ toast('ê³ ê°?¬ë? ë¨¼ì? ? íƒ?˜ì„¸??', 'warning'); return; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);
  if(!yr || !mo){ toast('?„ë„?€ ?”ì„ ? íƒ?˜ì„¸??', 'warning'); return; }

  // ?±ê¸°?„ì› / ?¹ìˆ˜ê´€ê³„ì¸ ?°ì´??ë³´ì¥ ë¡œë“œ ???¬ë Œ?”ë§
  const _needReload = (!allExecutives || allExecutives.length === 0) || (!allRelatedParties || allRelatedParties.length === 0);
  if(_needReload){
    Promise.all([
      allExecutives && allExecutives.length > 0 ? Promise.resolve() : loadExecutives().catch(()=>{}),
      allRelatedParties && allRelatedParties.length > 0 ? Promise.resolve() : loadRelatedParties().catch(()=>{})
    ]).then(() => loadPITargetList());
    return;
  }

  // ?°ì •ê¸°ì? ?±ë¡ ?¬ë? ?•ì¸
  const stdCheck = _checkPIStandardsReady(yr, mo, coId);
  if(!stdCheck.ok){
    _showPIStandardsWarn(yr, mo, stdCheck.missing);
    return;
  }

  // ?€?€ ê¸‰ì—¬ ?°ì •ê¸°ê°„ ê³„ì‚° (ê³ ê°??pay_period_month/day ê¸°ì?) ?€?€
  const _coPI = (allCompanies||[]).find(c => c.id === coId);
  const _ppMo  = _coPI?.pay_period_month || PAY_PERIOD_MONTH.CURRENT_MONTH;
  const _ppDay = parseInt(_coPI?.pay_period_day) || 1;
  const _isJeonwol = _ppMo === PAY_PERIOD_MONTH.PREV_MONTH || _ppMo === PAY_PERIOD_MONTH.PREV_MONTH;
  const _salStartMo = _isJeonwol ? (mo === 1 ? 12 : mo - 1) : mo;
  const _salStartYr = (_isJeonwol && mo === 1) ? yr - 1 : yr;
  const _salStart   = `${_salStartYr}-${String(_salStartMo).padStart(2,'0')}-${String(_ppDay).padStart(2,'0')}`;
  // ê¸‰ì—¬ ?°ì • ì¢…ë£Œ??= ?œì‘??+ 1ê°œì›” - 1??
  const _salEndDate = new Date(_salStartYr, _salStartMo - 1, _ppDay);
  _salEndDate.setMonth(_salEndDate.getMonth() + 1);
  _salEndDate.setDate(_salEndDate.getDate() - 1);
  const _salEnd = _salEndDate.toISOString().slice(0,10);

  // ?´ë‹¹ ê³ ê°??+ ?´ë‹¹ ?„ì›”??? íš¨ ê³„ì•½???ˆëŠ” ê·¼ë¡œ???„í„°ë§?
  // ? íš¨ ì¡°ê±´: is_draft=false, ?Œê¸°?˜ì? ?ŠìŒ, ê³„ì•½ ê¸°ê°„???´ë‹¹ ?”ê³¼ ê²¹ì¹¨
  // terminate_pending ?¬í•¨: ?´ì????„ê¹Œì§€??ê¸‰ì—¬ ì§€ê¸??€??
  const VALID_STATUSES = new Set([CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.PENDING, CONTRACT_STATUS.DOCS_INCOMPLETE, CONTRACT_STATUS.TERMINATE_PENDING]);
  const targetContracts = allContracts.filter(c => {
    if(c.company_id !== coId) return false;
    if(c.is_draft) return false;
    if(c.is_voided_by_amend) return false;
    if(!VALID_STATUSES.has(c.status)) return false;
    // ê³„ì•½ ê¸°ê°„??ê¸‰ì—¬ ?°ì •ê¸°ê°„ê³?ê²¹ì¹˜?”ì? ?•ì¸
    const cStart = c.contract_start || '';
    const cEnd   = c.contract_end   || '';
    if(cStart && cStart > _salEnd)   return false; // ê³„ì•½ ?œì‘ ??
    if(cEnd   && cEnd   < _salStart) return false; // ê³„ì•½ ì¢…ë£Œ ??
    return true;
  });

  // ì¤‘ë³µ ì§ì› ?œê±° (??ì§ì›??ê³„ì•½???¬ëŸ¬ ê°œë©´ ìµœì‹  ê³„ì•½ 1ê°œë§Œ)
  const empContractMap = new Map();
  targetContracts.forEach(c => {
    const prev = empContractMap.get(c.employee_id);
    if(!prev || (c.contract_start||'') > (prev.contract_start||'')){
      empContractMap.set(c.employee_id, c);
    }
  });

  const targets = [...empContractMap.entries()].map(([empId, c]) => {
    const emp = allEmployees.find(e => e.id === empId);
    return { emp, contract: c, _type: 'employee' };
  }).filter(t => t.emp)
    .sort((a,b) => (a.emp.name||'').localeCompare(b.emp.name||'','ko'));

  // ?€?€ ?€?œì, ?±ê¸°?„ì›, ?¹ìˆ˜ê´€ê³„ì¸ ì¶”ê? (ë³„ë„ ê·¼ë¡œê³„ì•½ ?†ìŒ) ?€?€
  const coData = (allCompanies||[]).find(c => c.id === coId);
  
  // ?€?œì
  if(coData){
    let reps = [];
    try { reps = typeof coData.representatives === 'string' ? JSON.parse(coData.representatives) : (coData.representatives || []); } catch(e){ reps = []; }
    if(!Array.isArray(reps)) reps = [];
    reps.forEach((r, i) => {
      if(r.name){
        targets.push({
          emp: { id: `rep_${coId}_${i}`, name: r.name, company_id: coId, employment_category: CONTRACT_TYPE.REPRESENTATIVE },
          contract: null, _type: 'representative'
        });
      }
    });
  }

  // ?±ê¸°?„ì›
  (allExecutives||[]).filter(e => e.company_id === coId).forEach(e => {
    targets.push({
      emp: { id: e.id, name: e.name, company_id: coId, employment_category: CONTRACT_TYPE.EXECUTIVE, position: e.position, created_at: e.created_at },
      contract: null, _type: 'executive'
    });
  });

  // ?¹ìˆ˜ê´€ê³„ì¸
  (allRelatedParties||[]).filter(r => r.company_id === coId).forEach(r => {
    targets.push({
      emp: { id: r.id, name: r.name, company_id: coId, employment_category: CONTRACT_TYPE.RELATED_PARTY, position: r.relationship, created_at: r.created_at },
      contract: null, _type: 'related_party'
    });
  });

  // ???„ì‹œ?€??ì§ì› Map: empId ??draftPayrollId
  const draftEmpMap = new Map(
    (allPayrolls||[])
      .filter(p => p.company_id===coId && p.pay_year===yr && p.pay_month===mo && p.is_draft)
      .map(p => [p.employee_id, p.id])
  );

  // ???•ì • ?€??ì§ì› Set (is_draft=false ë§? + payrollId ë§¤í•‘
  const paidPayrollMap = new Map(); // employee_id ??payroll_id
  (allPayrolls||[])
    .filter(p => p.company_id===coId && p.pay_year===yr && p.pay_month===mo && !p.is_draft)
    .forEach(p => paidPayrollMap.set(p.employee_id, p.id));
  const paidEmpIds = new Set(paidPayrollMap.keys());

  // ?œëª©Â·ë°°ì? ?…ë°?´íŠ¸
  const moLabel = `${yr}??${mo}??;
  const titleEl = document.getElementById('pi-target-list-title');
  const badgeEl = document.getElementById('pi-target-list-badge');
  if(titleEl) titleEl.textContent = `${moLabel} ì§€ê¸‰ë??ì ëª©ë¡`;
  if(badgeEl) badgeEl.textContent = `${targets.length}ëª?;

  // ?Œì´ë¸?ë°”ë”” ?Œë”ë§?
  const tbody = document.getElementById('pi-target-list-body');
  if(!tbody) return;

  if(!targets.length){
    tbody.innerHTML = `<tr><td colspan="7" style="padding:30px;text-align:center;color:#9ca3af;font-size:13px;">
      <i class="fas fa-inbox" style="font-size:24px;margin-bottom:8px;display:block;opacity:.4;"></i>
      ${moLabel}??? íš¨??ê·¼ë¡œê³„ì•½???ˆëŠ” ì§ì›???†ìŠµ?ˆë‹¤.
    </td></tr>`;
  } else {
    tbody.innerHTML = targets.map(({emp, contract, _type}) => {
      // ?€?œìÂ·?±ê¸°?„ì›Â·?¹ìˆ˜ê´€ê³„ì¸: ê°€??ê³„ì•½ ?°ì´??
      const isVirtual = !contract;
      
      // ?¤ì œ ê·¼ë¡œê³„ì•½??ì¡´ì¬?˜ëŠ”ì§€ ?•ì¸ (?´ë¦„ + ?Œì‚¬ë¡?ë§¤ì¹­)
      let actualContract = contract;
      if(isVirtual && emp.name){
        const matchedEmp = allEmployees.find(e => e.company_id === coId && e.name === emp.name);
        if(matchedEmp){
          const matchedContract = allContracts.find(c => 
            c.employee_id === matchedEmp.id && !c.is_draft && !c.is_voided_by_amend &&
            [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.PENDING].includes(c.status)
          );
          if(matchedContract) actualContract = matchedContract;
        }
      }
      
      const catRaw  = emp.employment_category || '';
      const cat     = CONTRACT_TYPE_LABEL[catRaw] || catRaw;
      // ê³ ìš©?•íƒœ ë±ƒì?: ê¸€ë¡œë²Œ CAT_BADGE_CLS ?¬ìš©
      const catBadgeCls = empCatBadge(catRaw);
      
      // ê³„ì•½ ê¸°ê°„: ?¤ì œ ê³„ì•½???ˆìœ¼ë©?ê³„ì•½ê¸°ê°„, ?†ìœ¼ë©??±ë¡??ë¬´ê¸°??
      // ?€?œì: ?±ë¡???†ìœ¼ë©?ê³ ê°???ë¬¸ê³„ì•½ ?œì‘??ê¸°ì?
      let cStart;
      if(actualContract){
        cStart = actualContract.contract_start || '-';
      } else if(emp.created_at){
        cStart = new Date(emp.created_at).toISOString().slice(0,10);
      } else if(_type === 'representative' && coData){
        cStart = coData.contract_start_date || '-';
      } else {
        cStart = '-';
      }
      const cEnd = actualContract ? (actualContract.contract_end || 'ë¬´ê¸°??) : 'ë¬´ê¸°??;
      
      const isDraft  = draftEmpMap.has(emp.id);
      const isPaid   = paidEmpIds.has(emp.id);
      const draftId  = isDraft ? draftEmpMap.get(emp.id) : null;
      const deptPos  = isVirtual ? (emp.position || '') : [emp.department, emp.position].filter(v=>v&&v.trim()).join('/');

      // ??0 ê³„ì•½?íƒœ ë°°ì? (CSS class ?¬ìš©)
      const _cs = actualContract ? (actualContract.status || CONTRACT_STATUS.ACTIVE) : '';
      let contractStatusBadge;
      if(!actualContract){
        contractStatusBadge = '<span class="badge badge-purple">ë³„ë„ê³„ì•½</span>';
      } else if(_cs === CONTRACT_STATUS.DOCS_INCOMPLETE){
        contractStatusBadge = '<span class="badge badge-green">? íš¨</span> <span class="badge badge-orange">?œë¥˜ë¯¸ë¹„</span>';
      } else if(CONTRACT_ACTIVE_STATUSES.includes(_cs)){
        contractStatusBadge = '<span class="badge badge-green">? íš¨</span>';
      } else if(_cs === CONTRACT_STATUS.PENDING){
        contractStatusBadge = '<span class="badge badge-indigo">ê³„ì•½?ˆì •</span>';
      } else if(_cs === CONTRACT_STATUS.RENEWAL_PENDING){
        contractStatusBadge = '<span class="badge badge-amber">ê°±ì‹ ?ˆì •</span>';
      } else if(_cs === CONTRACT_STATUS.TERMINATE_PENDING){
        contractStatusBadge = '<span class="badge badge-red">?´ì??ˆì •</span>';
      } else if(_cs === CONTRACT_STATUS.TERMINATED){
        contractStatusBadge = `<span class="badge badge-gray">${CONTRACT_STATUS_LABEL[CONTRACT_STATUS.TERMINATED]}</span>`;
      } else if(_cs === CONTRACT_STATUS.EXPIRED){
        contractStatusBadge = `<span class="badge badge-gray">${CONTRACT_STATUS_LABEL[CONTRACT_STATUS.EXPIRED]}</span>`;
      } else if(_cs === CONTRACT_STATUS.VOIDED){
        contractStatusBadge = `<span class="badge badge-gray">${CONTRACT_STATUS_LABEL[CONTRACT_STATUS.VOIDED]}</span>`;
      } else if(_cs === CONTRACT_STATUS.CANCELED){
        contractStatusBadge = `<span class="badge badge-gray">${CONTRACT_STATUS_LABEL[CONTRACT_STATUS.CANCELED]}</span>`;
      } else if(_cs === CONTRACT_STATUS.RENEWED){
        contractStatusBadge = `<span class="badge badge-blue">${CONTRACT_STATUS_LABEL[CONTRACT_STATUS.RENEWED]}</span>`;
      } else {
        contractStatusBadge = `<span class="badge badge-gray">${CONTRACT_STATUS_LABEL[_cs] || _cs || '?????†ìŒ'}</span>`;
      }

      // ??ê¸‰ì—¬?…ë ¥ ?¬ë? ë°°ì? (CSS class ?¬ìš©)
      let statusBadge;
      if(isDraft){
        statusBadge = '<span class="badge badge-amber"><i class="fas fa-clock"></i> ?„ì‹œ?€??/span>';
      } else if(isPaid){
        statusBadge = '<span class="badge badge-green"><i class="fas fa-check-circle"></i> ?…ë ¥?„ë£Œ</span>';
      } else {
        statusBadge = '<span class="badge badge-red"><i class="fas fa-exclamation-circle"></i> ë¯¸ì…??/span>';
      }

      // ??ê´€ë¦?ë²„íŠ¼
      let actionBtn;
      const targetEmpId = emp.id;
      const targetContractId = contract ? contract.id : '';
      if(isDraft){
        actionBtn = `<button onclick="selectPITarget('${targetEmpId}','${targetContractId}','${draftId}')"
          class="btn btn-teal" style="padding:7px 16px;font-size:12px;">
          <i class="fas fa-play-circle"></i> ?´ì–´ ?…ë ¥
        </button>`;
      } else if(isPaid){
        const paidPid = paidPayrollMap.get(emp.id) || '';
        actionBtn = `<div style="display:inline-flex;gap:4px;align-items:center;flex-wrap:nowrap;">
          <button onclick="openPayslipModal('${paidPid}')"
            class="btn btn-indigo btn-sm" style="width:68px;padding:7px 0;">
            <i class="fas fa-search"></i> ì¡°íšŒ
          </button>
          <button onclick="selectPITarget('${targetEmpId}','${targetContractId}')"
            class="btn btn-warning btn-sm" style="width:68px;padding:7px 0;">
            <i class="fas fa-edit"></i> ?˜ì •
          </button>
        </div>`;
      } else {
        actionBtn = `<button onclick="selectPITarget('${targetEmpId}','${targetContractId}')"
          class="btn btn-danger btn-sm pi-target-action-btn">
          <i class="fas fa-calculator"></i> ê¸‰ì—¬ ?…ë ¥
        </button>`;
      }

      return `<tr class="pi-target-row">
        <td class="pi-target-name">
          ${emp.name}${deptPos?`<span class="pi-target-dept">${deptPos}</span>`:''}
        </td>
        <td class="pi-target-gender">${emp.gender==='female'||emp.gender==='?¬ì„±'||emp.gender==='???'??:emp.gender==='male'||emp.gender==='?¨ì„±'||emp.gender==='???'??:'-'}</td>
        <td>
          <span class="badge ${catBadgeCls}">${cat}</span>
        </td>
        <td class="pi-target-contract">
          ${cStart} ~ ${cEnd}
        </td>
        <td style="text-align:center;">${contractStatusBadge}</td>
        <td style="text-align:center;">${statusBadge}</td>
        <td style="text-align:center;">${actionBtn}</td>
      </tr>`;
    }).join('');
  }

  // ?¹ì…˜ ?œì‹œ (???¨ê?) + ?„ì›” ì¹´ë“œ ë³µì›
  document.getElementById('pi-target-list-section').style.display='';
  document.getElementById('pi-form-section').style.display='none';
  _syncPIPeriodSectionVisibility(false);
}

/** ?€?ì ëª©ë¡ ?«ê¸° */
function hidePITargetList(){
  const sec = document.getElementById('pi-target-list-section');
  if(sec) sec.style.display='none';
  // ê³ ê°??? íƒ ?¬ë????°ë¼ ?ì ˆ??ë°°ë„ˆ ë³µì›
  if(currentGlobalCompanyId){
    if(typeof renderPICoDraftBanner === 'function') renderPICoDraftBanner();
  } else {
    if(typeof renderPIAllDraftBanner === 'function') renderPIAllDraftBanner();
  }
}

/**
 * ?€?ì ?´ë¦­ ??ê¸‰ì—¬ ?…ë ¥ ??ì§„ì…
 * @param {string} empId       - ì§ì› ID
 * @param {string} contractId  - ê³„ì•½ ID
 * @param {string|null} draftId - ?„ì‹œ?€??ê¸‰ì—¬ ID (?´ì–´ ?…ë ¥ ???„ë‹¬)
 */
function selectPITarget(empId, contractId, draftId=null){
  let emp      = allEmployees.find(e => e.id === empId);
  const contract = contractId ? allContracts.find(c => c.id === contractId) : null;
  
  // ê°€??ì§ì›(?€?œì/?±ê¸°?„ì›/?¹ìˆ˜ê´€ê³„ì¸): allEmployees???†ìœ¼ë©?ë³„ë„ ?°ì´?°ì—??ì°¾ê¸°
  let isVirtual = false;
  if(!emp){
    // ?€?œì: rep_{coId}_{idx} ?¨í„´
    if(empId.startsWith('rep_')){
      const rest = empId.slice(4); // 'rep_' ?œê±° ??'coId_idx'
      const lastUnderscore = rest.lastIndexOf('_');
      const idx = parseInt(rest.slice(lastUnderscore + 1));
      const coId2 = rest.slice(0, lastUnderscore);
      const co2 = (allCompanies||[]).find(c => c.id === coId2);
      if(co2){
        let reps = [];
        try { reps = typeof co2.representatives === 'string' ? JSON.parse(co2.representatives) : (co2.representatives || []); } catch(e){}
        const rep = reps[idx];
        if(rep && rep.name){
          emp = { id: empId, name: rep.name, company_id: coId2, employment_category: CONTRACT_TYPE.REPRESENTATIVE };
          isVirtual = true;
        }
      }
    }
    // ?±ê¸°?„ì›
    if(!emp){
      const exec = (allExecutives||[]).find(e => e.id === empId);
      if(exec){
        emp = { id: exec.id, name: exec.name, company_id: exec.company_id, employment_category: CONTRACT_TYPE.EXECUTIVE, position: exec.position };
        isVirtual = true;
      }
    }
    // ?¹ìˆ˜ê´€ê³„ì¸
    if(!emp){
      const rel = (allRelatedParties||[]).find(r => r.id === empId);
      if(rel){
        emp = { id: rel.id, name: rel.name, company_id: rel.company_id, employment_category: CONTRACT_TYPE.RELATED_PARTY, position: rel.relationship };
        isVirtual = true;
      }
    }
  } else {
    // allEmployees???ˆë”?¼ë„ ?€?œì/?±ê¸°?„ì›/?¹ìˆ˜ê´€ê³„ì¸ ?€?…ì´ë©?ê°€??ì§ì› ì²˜ë¦¬
    isVirtual = !contract && (emp.employment_category === CONTRACT_TYPE.REPRESENTATIVE || emp.employment_category === CONTRACT_TYPE.EXECUTIVE || emp.employment_category === CONTRACT_TYPE.RELATED_PARTY);
  }
  
  if(!emp || (!contract && !isVirtual)){ toast('ì§ì› ?ëŠ” ê³„ì•½ ?•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.', 'error'); return; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);

  // ì§ì› ?¤ë” ?…ë°?´íŠ¸
  // ? íš¨ ê³„ì•½??contract_type???„ì¬ ê³ ìš©?•íƒœ???•í™•???íƒœë¥?ë°˜ì˜.
  // emp.employment_category??ê°±ì‹ ??ì§€?°ë  ???ˆìœ¼ë¯€ë¡?contract_type???°ì„  ?¬ìš©.
  const catRaw = contract ? (contract.contract_type || emp.employment_category) : (emp.employment_category || '');
  const cat     = CONTRACT_TYPE_LABEL[catRaw] || catRaw || '';
  const catBadgeCls = empCatBadge(catRaw);
  const nameEl  = document.getElementById('pi-form-emp-name');
  const badgeEl = document.getElementById('pi-form-emp-badge');
  if(nameEl)  nameEl.textContent  = `${emp.name} (${yr}??${mo}??`;
  if(badgeEl){ badgeEl.textContent = cat; badgeEl.className = `badge ${catBadgeCls}`; }

  // ?¨ê? select ?™ê¸°??(ê¸°ì¡´ loadPIContract ?˜ì¡´)
  const empSel = document.getElementById('pi-employee');
  if(empSel){
    // ?µì…˜???†ìœ¼ë©??™ì  ì¶”ê?
    if(![...empSel.options].some(o=>o.value===empId)){
      const opt = document.createElement('option');
      opt.value = empId;
      opt.textContent = emp.name;
      empSel.appendChild(opt);
    }
    // onchange ?„ì‹œ ?œê±° ??value ?¤ì • ??ë³µì›
    // (value ë³€ê²???onchange="loadPIContract()"ê°€ ?¸ë¦¬ê±°ë˜???´ì¤‘ ?¸ì¶œ ë°©ì?)
    const _prevOnchange = empSel.onchange;
    empSel.onchange = null;
    empSel.value = empId;
    // data-type ?¤ì • (ê°€??ì§ì› ê°ì?????loadPIContract?ì„œ personType ?ë³„)
    if(isVirtual){
      const _opt = [...empSel.options].find(o => o.value === empId);
      if(_opt){
        if(emp.employment_category === CONTRACT_TYPE.REPRESENTATIVE) _opt.dataset.type = 'representative';
        else if(emp.employment_category === CONTRACT_TYPE.EXECUTIVE) _opt.dataset.type = 'executive';
        else if(emp.employment_category === CONTRACT_TYPE.RELATED_PARTY) _opt.dataset.type = 'related_party';
      }
    }
    empSel.onchange = _prevOnchange;
  }

  // ???œì‹œ + ?„ì›” ì¹´ë“œ ?¨ê? + ?„ì‹œ?€???„ì²´ ë°°ë„ˆ ?¨ê?
  document.getElementById('pi-target-list-section').style.display='none';
  document.getElementById('pi-form-section').style.display='';
  _syncPIPeriodSectionVisibility(true);
  // ??ì§ì› ??ì§„ì… ???„ì‹œ?€??ë°°ë„ˆ ?¨ê? (?„ì›” ? íƒ ?¨ê³„?ì„œë§??œì‹œ)
  const _adbHideOnSelect = document.getElementById('pi-all-draft-banner');
  if(_adbHideOnSelect) _adbHideOnSelect.style.display = 'none';

  // ê³„ì•½ ?°ì´??ë¡œë“œ + ?ë™?…ë ¥ (onchange ?´ì¤‘ ?¸ì¶œ ?†ì´ 1?Œë§Œ ?¤í–‰)
  loadPIContract();

  if(draftId){
    // ?€?€ '?´ì–´ ?…ë ¥': ?„ì‹œ?€???ë™ ë³µì› ?€?€
    if(typeof piDraftId !== 'undefined') piDraftId = draftId;
    setTimeout(() => {
      if(typeof loadPIDraft === 'function') loadPIDraft();
    }, 400);
  } else {
    // ?´ë? ?•ì • ?€?¥ëœ ê¸‰ì—¬ê°€ ?ˆìœ¼ë©??˜ì • ëª¨ë“œë¡?ë¡œë“œ
    const existingPayroll = (allPayrolls||[]).find(p =>
      p.employee_id===empId && p.company_id===currentGlobalCompanyId &&
      p.pay_year===yr && p.pay_month===mo && !p.is_draft
    );
    if(existingPayroll){
      if(typeof editPayroll === 'function') editPayroll(existingPayroll.id);
    } else {
      // ?€?€ ? ê·œ ?…ë ¥ ëª¨ë“œ ì§„ì…: ?˜ì • ëª¨ë“œ ?”ì¡´ ?íƒœ ?„ì „ ?´ì œ ?€?€
      // ?ìƒë³µêµ¬ ??ëª©ë¡ ë³µê? ??ë¯¸ì…??ì§ì› ? íƒ ???´ì „ piEditPayrollIdê°€ ?¨ì•„
      // ?˜ì • ë°°ë„ˆÂ·ë¹„í™œ??ë²„íŠ¼???”ì¡´?˜ëŠ” ë²„ê·¸ ë°©ì?
      piEditPayrollId = null;
      _piEditSnapshot = null;
      // pi-edit-banner ?œê±°??
      const _newDropZone = document.getElementById('pi-upload-drop-zone');
      if(_newDropZone) _newDropZone.style.display = '';
      // ?€??ë²„íŠ¼ ?ìŠ¤??? ê·œ ëª¨ë“œë¡?ë³µì›
      document.querySelectorAll('#page-payroll-input .btn-primary').forEach(btn => {
        if(btn.textContent.includes('?˜ì • ?€??) || btn.textContent.includes('?€??)){
          btn.innerHTML = '<i class="fas fa-save"></i> ê¸‰ì—¬ ?€??;
          btn.style.background = '';
        }
      });
      _updatePICancelBtn();
      _updatePIDraftBtnForMode();
      _updatePIBottomBtns();

      // ?„ì‹œ?€??ë°°ë„ˆ ì²´í¬ (ëª©ë¡?ì„œ ì§ì ‘ '?…ë ¥' ?´ë¦­??ê²½ìš°)
      // ??loadPIContract()?ì„œ _applyPIDefaultWorkDays(true)ë¥?ì§ì ‘ ?¸ì¶œ?˜ë?ë¡?
      //    setTimeout ?¬ì‹œ??ë¶ˆí•„????onchange ?´ì¤‘?¸ì¶œÂ·calcPI ì¤‘ë³µ ë¬¸ì œ ê·¼ë³¸ ?˜ì •??
      const _checkDraft = typeof _checkAndShowPIDraftBanner === 'function';
      if(_checkDraft) _checkAndShowPIDraftBanner(empId, yr, mo);
    }
  }
}

/** ê¸‰ì—¬ ?…ë ¥ ?¼ì—???€?ì ëª©ë¡?¼ë¡œ ?Œì•„ê°€ê¸?*/
function backToPITargetList(){
  // ?˜ì • ëª¨ë“œ ì¤??´íƒˆ ????cancelEditPayroll()??ëª©ë¡ ë³µê?ê¹Œì? ì²˜ë¦¬?˜ê³  ì¢…ë£Œ
  if(typeof piEditPayrollId !== 'undefined' && piEditPayrollId){
    if(typeof cancelEditPayroll === 'function') cancelEditPayroll();
    return; // cancelEditPayroll ?´ë??ì„œ loadPITargetList() ?¸ì¶œ?˜ë?ë¡?ì¤‘ë³µ ë°©ì?
  }
  // ? ê·œ ëª¨ë“œ?ì„œ ëª©ë¡?¼ë¡œ ë³µê?
  piDraftId = null; // ëª©ë¡ ë³µê? ???´ì–´?°ê¸° ?íƒœ ?´ì œ (?„ì‹œ?€??ì¹´ë“œ?ì„œ ?œì™¸?˜ì? ?Šë„ë¡?
  piContract = null;
  if(typeof clearPIFields === 'function') clearPIFields();
  const card = document.getElementById('pi-contract-card');
  if(card) card.style.display = 'none';
  // ëª©ë¡ ?ˆë¡œê³ ì¹¨ ???œì‹œ (?´ë??ì„œ pi-all-draft-banner ?¨ê? ì²˜ë¦¬??
  loadPITargetList();
  // ??loadPITargetList() ?¤íŒ¨ ê²½ë¡œ(?€?ì ?†ìŒ ???ì„œ??ë°°ë„ˆ ë³µì› ë³´ì¥
  // ??loadPITargetList ??return ??ë°°ë„ˆ ?¨ê????´ë? ì²˜ë¦¬?˜ë?ë¡?ë³„ë„ ë³µì› ë¶ˆí•„??
}

async function loadPIEmployees(){
  const co=currentGlobalCompanyId || document.getElementById('pi-company').value;
  const s=document.getElementById('pi-employee');
  s.innerHTML='<option value="">? íƒ</option>';

  // ?±ê¸°?„ì› / ?¹ìˆ˜ê´€ê³„ì¸ ?°ì´??ë³´ì¥ ë¡œë“œ
  if(!allExecutives || allExecutives.length === 0){ await loadExecutives().catch(()=>{}); }
  if(!allRelatedParties || allRelatedParties.length === 0){ await loadRelatedParties().catch(()=>{}); }

  // ?¼ë°˜ ì§ì›
  [...allEmployees.filter(e=>e.company_id===co&&(e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE))].sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(e=>{const _deptPos=[e.department,e.position].filter(v=>v&&v.trim()).join('/');s.innerHTML+=`<option value="${e.id}" data-type="employee">${e.name}${_deptPos?` (${_deptPos})`:''}</option>`;});

  // ?€?œì (ê³ ê°??representatives?ì„œ ì¶”ì¶œ)
  const coData = (allCompanies||[]).find(c => c.id === co);
  if(coData){
    let reps = [];
    try { reps = typeof coData.representatives === 'string' ? JSON.parse(coData.representatives) : (coData.representatives || []); } catch(e){ reps = []; }
    if(!Array.isArray(reps)) reps = [];
    reps.forEach((r, i) => {
      if(r.name){
        s.innerHTML += `<option value="rep_${co}_${i}" data-type="representative" style="color:#7c3aed;">${r.name} ???€?œì</option>`;
      }
    });
  }

  // ?±ê¸°?„ì›
  (allExecutives||[]).filter(e=>e.company_id===co).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(e=>{s.innerHTML+=`<option value="${e.id}" data-type="executive" style="color:#4f46e5;">${e.name} (${e.position||'?±ê¸°?„ì›'}) ???±ê¸°?„ì›</option>`;});

  // ?¹ìˆ˜ê´€ê³„ì¸
  (allRelatedParties||[]).filter(r=>r.company_id===co).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).forEach(r=>{s.innerHTML+=`<option value="${r.id}" data-type="related_party" style="color:#0891b2;">${r.name} (${r.relationship||'?¹ìˆ˜ê´€ê³„ì¸'}) ???¹ìˆ˜ê´€ê³„ì¸</option>`;});

  document.getElementById('pi-contract-card').style.display='none';
  piContract=null;clearPIFields();
}
// ?€?€ ?°ì°¨ ?„í™© ??ê³„ì‚°Â·?Œë”ë§??€?€
// ?€?€ ?°ì°¨ ?”ì—¬?¼ìˆ˜ ë°°ì? ?…ë°?´íŠ¸ (DB remain_days ?°ì„ , ?†ìœ¼ë©?JS ê³„ì‚°) ?€?€
function calcAnnualLeaveTable(){
  const badge = document.getElementById('pi-al-remain-badge');
  if(!badge) return;

  // ?¼ìš©ì§Â·ë“±ê¸°ì„?Â·ë??œìÂ·?¹ìˆ˜ê´€ê³„ì¸: ?°ì°¨ ?œì™¸
  const _AL_EXCLUDED = new Set([CONTRACT_TYPE.EXECUTIVE, CONTRACT_TYPE.REPRESENTATIVE, CONTRACT_TYPE.RELATED_PARTY]);
  if(!piContract || _AL_EXCLUDED.has(piContract.contract_type)){
    badge.textContent = '?”ì—¬?°ì°¨: -';
    badge.className = 'pi-al-badge-excluded';
    return;
  }
  // ì£?15?œê°„ ë¯¸ë§Œ ?¨ì‹œê°? ?°ì°¨ ?œì™¸ (ê·¼ë¡œê¸°ì?ë²???8ì¡°ì œ3??
  const _weeklyH = (parseFloat(piContract.work_hours_per_day)||0) * (parseFloat(piContract.work_days_per_week)||0);
  if(_weeklyH > 0 && _weeklyH < 15){
    badge.textContent = '?”ì—¬?°ì°¨: - (ì£?15h ë¯¸ë§Œ)';
    badge.className = 'pi-al-badge-excluded';
    return;
  }

  const empId  = document.getElementById('pi-employee')?.value || '';
  const curYear  = parseInt(document.getElementById('pi-year')?.value)  || 0;

  // ?€?€ DB ê´€ë¦¬ë???remain_days ?°ì„  ì°¸ì¡° ?€?€
  const _ledger = (allLeaveLedgers || []).find(r =>
    r.employee_id === empId && Number(r.year) === curYear
  );
  let remain;
  if(_ledger && _ledger.remain_days != null){
    remain = parseFloat(_ledger.remain_days);
  } else {
    // fallback: JS ê³„ì‚°
    const empData = (allEmployees || []).find(e => e.id === empId) || {};
    const hireDate = empData.hire_date || piContract.contract_start || '';
    const coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value || '';
    const co = (allCompanies || []).find(c => c.id === coId);
    const basis = normalizeAnnualLeaveBasis(co?.annual_leave_basis) || ANNUAL_LEAVE_BASIS.FISCAL_YEAR;
    const totalDays = (typeof calcAnnualLeaveDays === 'function' && hireDate)
      ? (calcAnnualLeaveDays(hireDate, basis, piContract.contract_start || '') ?? 0)
      : (parseFloat(piContract.annual_leave_days) || 0);

    if(totalDays <= 0){
      badge.textContent = '?”ì—¬?°ì°¨: -';
      badge.className = 'pi-al-badge-excluded';
      return;
    }

    let prevCum = 0;
    if(_ledger){
      let _md = [];
      try { _md = JSON.parse(_ledger.month_data || '[]'); } catch(e){ _md = []; }
      prevCum = _md.reduce((s, d) => s + (parseFloat(d.days) || 0), 0);
    } else {
      prevCum = (allPayrolls || [])
        .filter(p => p.employee_id === empId && !p.is_draft)
        .reduce((sum, p) => sum + (parseFloat(p.annual_leave_used) || 0), 0);
    }
    remain = totalDays - prevCum;
  }

  const remainDisp = remain % 1 === 0 ? remain.toFixed(0) : remain.toFixed(1);
  badge.textContent = `?”ì—¬?°ì°¨: ${remainDisp}??;
  if(remain < 0){
    badge.className = 'pi-al-badge-negative';
  } else if(remain === 0){
    badge.className = 'pi-al-badge-zero';
  } else {
    badge.className = 'pi-al-badge-positive';
  }

  // ?€?€ ?”ì—¬ ?°ì°¨ ?ë™ê³„ì‚° ì²´í¬ë°•ìŠ¤ ON?´ë©´ ?°ì°¨?˜ë‹¹ ?¬ì‚°???€?€
  const _autoChk = document.getElementById('pi-annual-auto-chk');
  if(_autoChk && _autoChk.checked){
    const _amt = _calcAnnualAutoPayAmount(remain);
    setAmountVal('pi-annual-pay', _amt);
    calcPI();
  }

  // ?€?€ ?°ì°¨ ?¬ìš©?´ì—­ ???…ë°?´íŠ¸ ?€?€
  _updatePIAnnualLeaveDetail();
}

/**
 * ?”ì—¬ ?°ì°¨ Ã— ?µìƒ?œê¸‰ Ã— ???Œì •ê·¼ë¡œ?œê°„ = ?°ì°¨?˜ë‹¹
 * @param {number} remainDays - ?”ì—¬ ?°ì°¨?¼ìˆ˜ (?Œìˆ˜?´ë©´ 0?¼ë¡œ ì²˜ë¦¬)
 * @returns {number} ê³„ì‚°???°ì°¨?˜ë‹¹ (?? ?•ìˆ˜)
 */
function _calcAnnualAutoPayAmount(remainDays){
  if(!piContract) return 0;
  const days = remainDays || 0;  // ?Œìˆ˜ ?ˆìš© (ì´ˆê³¼?¬ìš© ???´ì§?•ì‚° ì°¨ê°)
  const hw   = parseFloat(piContract.hourly_wage)        || 0;  // ?µìƒ?œê¸‰
  const hpd  = parseFloat(piContract.work_hours_per_day) || 8;  // ???Œì •ê·¼ë¡œ?œê°„
  return Math.round(days * hw * hpd);
}

/**
 * ê¸‰ì—¬?…ë ¥ ?˜ì´ì§€???°ì°¨ ?¬ìš©?´ì—­ ???…ë°?´íŠ¸
 * ê·¼ë¡œê³„ì•½??ê¸‰ì—¬ ?°ì •ê¸°ê°„(pi-pay-period-start ~ end) ê¸°ì??¼ë¡œ ?°ì°¨ ?¬ìš©???„í„°ë§?
 */
function _updatePIAnnualLeaveDetail(){
  const rowEl = document.getElementById('pi-row-annual-detail');
  const textEl = document.getElementById('pi-annual-detail-text');
  if(!rowEl || !textEl) return;

  if(!piContract || piContract.contract_type === CONTRACT_TYPE.EXECUTIVE
      || piContract.contract_type === CONTRACT_TYPE.REPRESENTATIVE
      || piContract.contract_type === CONTRACT_TYPE.RELATED_PARTY){
    rowEl.style.display = 'none';
    return;
  }

  const empId = document.getElementById('pi-employee')?.value || '';
  if(!empId){
    textEl.textContent = '-';
    rowEl.style.display = '';
    return;
  }

  // ê¸‰ì—¬ ?°ì •ê¸°ê°„ ê°€?¸ì˜¤ê¸?
  const ppStart = document.getElementById('pi-pay-period-start')?.value || '';
  const ppEnd   = document.getElementById('pi-pay-period-end')?.value || '';
  if(!ppStart || !ppEnd){
    textEl.textContent = '?°ì •ê¸°ê°„ ?†ìŒ';
    textEl.className = 'pi-al-text-dim';
    rowEl.style.display = '';
    return;
  }

  const curYear = parseInt(document.getElementById('pi-year')?.value) || 0;

  // ?€?€ ì´?ë°œìƒ?°ì°¨ ë°??”ì—¬?°ì°¨ ê³„ì‚° (calcAnnualLeaveTableê³??™ì¼ ë¡œì§) ?€?€
  const empData = (allEmployees||[]).find(e=>e.id===empId)||{};
  const hireDate = empData.hire_date || piContract.contract_start || '';
  const coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value || '';
  const co = (allCompanies||[]).find(c=>c.id===coId);
  const basis = normalizeAnnualLeaveBasis(co?.annual_leave_basis) || ANNUAL_LEAVE_BASIS.FISCAL_YEAR;
  const totalDays = (typeof calcAnnualLeaveDays === 'function' && hireDate)
    ? (calcAnnualLeaveDays(hireDate, basis, piContract.contract_start||'')??0)
    : (parseFloat(piContract.annual_leave_days)||0);

  // ?€?€ ê´€ë¦¬ë????•ì¸ ?€?€
  const ledger = (allLeaveLedgers||[]).find(r=>r.employee_id===empId&&Number(r.year)===curYear);

  // ?´ë²ˆ ê¸‰ì—¬ ?°ì •ê¸°ê°„ ???¬ìš©???˜ì§‘
  let monthData=[];
  if(ledger?.month_data){ try{monthData=JSON.parse(ledger.month_data||'[]')}catch(e){monthData=[]} }
  const periodUsedDays = monthData.reduce((sum,md)=>{
    const dates=(md.dates||'').split(',').map(d=>d.trim()).filter(Boolean);
    return sum + dates.filter(d=>d>=ppStart&&d<=ppEnd).length;
  },0);

  // ?´ì›”?°ì°¨: ledger.carryover_days ?ëŠ” ?´ì „ ?°ë„ ?”ì—¬ë¶?
  const carryover = ledger?.carryover_days ? parseFloat(ledger.carryover_days) : 0;

  // ?„ì  ?¬ìš©??
  let prevCum=0;
  if(ledger){
    prevCum = monthData.reduce((s,d)=>s+(parseFloat(d.days)||0),0);
  } else {
    prevCum = (allPayrolls||[]).filter(p=>p.employee_id===empId&&!p.is_draft)
      .reduce((sum,p)=>sum+(parseFloat(p.annual_leave_used)||0),0);
  }

  const remain = ledger?.remain_days!=null
    ? parseFloat(ledger.remain_days)
    : totalDays + carryover - prevCum;
  const remainDisp = remain.toFixed(2);

  // ?€?€ ?œì‹œ ë¬¸ì??êµ¬ì„± ?€?€
  const beforeUsed = (prevCum - periodUsedDays).toFixed(2);
  const afterUsed  = prevCum.toFixed(2);
  const periodUsedDisp = periodUsedDays.toFixed(2);

  // ?„ì›”ê¹Œì? ì´?ë°œìƒ?°ì°¨ (?°ì •ê¸°ê°„ ?œì‘??ê¸°ì?)
  const totalBefore = (typeof calcAnnualLeaveDays === 'function' && hireDate)
    ? (calcAnnualLeaveDays(hireDate, basis, ppStart) ?? totalDays)
    : totalDays;
  // ?´ë²ˆ?¬ê¹Œì§€ ì´?ë°œìƒ?°ì°¨ (?°ì •ê¸°ê°„ ì¢…ë£Œ??ê¸°ì?)
  const totalAfter = (typeof calcAnnualLeaveDays === 'function' && hireDate)
    ? (calcAnnualLeaveDays(hireDate, basis, ppEnd) ?? totalDays)
    : totalDays;

  const summary = totalDays>0
    ? `?„ì›” ?„ì : ${beforeUsed}??ì´?${totalBefore}?? ?´ë²ˆ???Œì§„: ${periodUsedDisp}/${totalAfter}?? ìµœì¢… ?”ì—¬?°ì°¨: ${remainDisp}??
    : `ë°œìƒ?°ì°¨ ${totalDays}??;

  textEl.textContent = summary;
  textEl.className = periodUsedDays>0 ? 'pi-al-text-active' : 'pi-al-text-dim';
  rowEl.style.display = '';
}

/**
 * ê¸‰ì—¬?…ë ¥ ?˜ì´ì§€?ì„œ ê·¼íƒœ ê´€ë¦¬ë???ëª¨ë‹¬ ?´ê¸° (ê²°ê·¼Â·ì§€ê°Â·ì¡°??
 */
async function _openAttendanceLedgerFromPayroll(){
  const empId = document.getElementById('pi-employee')?.value || '';
  if(!empId) { toast('ì§ì›??ë¨¼ì? ? íƒ?˜ì„¸??', 'error'); return; }

  const emp = allEmployees.find(e => e.id === empId);
  if(!emp) { toast('ì§ì› ?•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.', 'error'); return; }

  const coId = document.getElementById('pi-company')?.value || '';
  if(coId && typeof _atlCompanyId !== 'undefined') {
    window._atlCompanyId = coId;
    try {
      const res = await fetch('../tables/attendance_ledger?company_id=' + coId + '&limit=500');
      const data = await res.json();
      if(typeof _atlLedgerCache !== 'undefined') {
        window._atlLedgerCache = (data.data || []).filter(r => r.company_id === coId);
      }
    } catch(e) {}
  }

  window._attendanceFromPayroll = { empId, empName: emp.name || '' };
  if(typeof atlOpenLedger === 'function'){
    atlOpenLedger(empId, emp.name || '');
    _watchAttendanceLedgerClose();
  }
}

function _watchAttendanceLedgerClose(){
  const check = setInterval(() => {
    const modal = document.getElementById('atl-ledger-modal');
    if(modal && !modal.classList.contains('open')){
      clearInterval(check);
      _updatePIAttendanceSummary();
    }
  }, 300);
}

function _updatePIAttendanceSummary(){
  const ctx = window._attendanceFromPayroll;
  if(!ctx) return;
  const empId = ctx.empId;

  // ê¸‰ì—¬ ?°ì •ê¸°ê°„ ê°€?¸ì˜¤ê¸?
  const ppStart = document.getElementById('pi-pay-period-start')?.value || '';
  const ppEnd   = document.getElementById('pi-pay-period-end')?.value || '';

  let entries = [];
  if(typeof _atlLedgerCache !== 'undefined'){
    const ledgers = _atlLedgerCache.filter(l => l.employee_id === empId);
    ledgers.forEach(ledger => {
      try { entries = entries.concat(JSON.parse(ledger.month_data || '[]')); } catch(e) {}
    });
  }

  // ?€?€ ì¶œì‚°?´ê? ?¼ì°¨ ?ë™ê³„ì‚°: ?„ì²´ ê¸°ë¡?ì„œ ?¤ì œ ?¬ìš©???œë²ˆ = n?¼ì°¨ ?€?€
  // ë¶„í•  ?¬ìš©(ì¤‘ê°„ ê³µë°±) ?œì—???¤ì œ ?¬ìš©??? ì§œë§?ì¹´ìš´??(?¬ë ¥ ?¼ìˆ˜ ?„ë‹˜)
  // 90???´ìƒ ê°„ê²©?´ë©´ ë³„ë„ ì¶œì‚°?´ê?ë¡?ê°„ì£¼?˜ì—¬ ?œë²ˆ ë¦¬ì…‹
  const _maternityDayMap = (() => {
    const matEntries = entries.filter(e => e.type === 'absent' && e.absentType === 'maternity_paid');
    if (!matEntries.length) return null;
    // ëª¨ë“  maternity_paid ? ì§œë¥?ê°œë³„ ? ì§œë¡??„ê°œ
    let allDates = [];
    matEntries.forEach(e => {
      const expanded = (typeof _atlExpandDateRange === 'function')
        ? _atlExpandDateRange(e.date, e.dateTo || '')
        : [e.date];
      allDates = allDates.concat(expanded);
    });
    if (!allDates.length) return null;
    // ì¤‘ë³µ ?œê±° + ?•ë ¬
    allDates = [...new Set(allDates)].sort();
    // 90???´ìƒ ê³µë°±?´ë©´ ??ì¶œì‚°?´ê?ë¡?ê°„ì£¼?˜ì—¬ ?œë²ˆ ë¦¬ì…‹
    const map = new Map();
    let dayNum = 0;
    for (let i = 0; i < allDates.length; i++) {
      if (i > 0) {
        const gap = Math.floor((new Date(allDates[i]) - new Date(allDates[i-1])) / 86400000);
        if (gap > 90) dayNum = 0; // ??ì¶œì‚°?´ê? ê¸°ê°„
      }
      dayNum++;
      map.set(allDates[i], dayNum);
    }
    return map;
  })();
  const _maternityDayNumber = (dateStr) => {
    if (!_maternityDayMap || !dateStr) return null;
    return _maternityDayMap.get(dateStr) || null;
  };

  // ê¸‰ì—¬ ?°ì •ê¸°ê°„ ?´ì „ ??ª© (?Œê¸‰)
  const retroEntries = ppStart
    ? entries.filter(e => (e.date||'') < ppStart)
    : [];
  let retroAbsentDays = 0, retroAbsentData = [];
  let retroLateCount = 0, retroEarlyCount = 0;
  let retroLateData = [], retroEarlyData = [];
  retroEntries.forEach(e => {
    if(e.type === 'absent'){
      const dates = typeof _atlExpandDateRange==='function' ? _atlExpandDateRange(e.date, e.dateTo||'') : [e.date];
      retroAbsentDays += dates.length;
      const entry = { date: e.date, type: e.absentType||'unauthorized', rate: e.rate||0, dateTo: e.dateTo||'', retro: true };
      if (e.absentType === 'maternity_paid') entry.dayNumber = _maternityDayNumber(e.date);
      retroAbsentData.push(entry);
    } else if(e.type === 'late'){
      retroLateCount++;
      retroLateData.push({ date: e.date, time: e.time||'' });
    } else if(e.type === 'earlyleave'){
      retroEarlyCount++;
      retroEarlyData.push({ date: e.date, time: e.time||'' });
    }
  });

  // ê¸‰ì—¬ ?°ì •ê¸°ê°„ ??? ì§œë§??„í„°
  const monthEntries = ppStart && ppEnd
    ? entries.filter(e => (e.date||'') >= ppStart && (e.date||'') <= ppEnd)
    : entries;

  let absentDays = 0, lateCount = 0, earlyCount = 0;
  let absentDates = [], absentData = [], lateData = [], earlyData = [];
  monthEntries.forEach(e => {
    if(e.type === 'absent'){
      const dates = typeof _atlExpandDateRange === 'function' ? _atlExpandDateRange(e.date, e.dateTo||'') : [e.date];
      absentDays += dates.length;
      absentDates.push(...dates);
      const entry = { date: e.date, type: e.absentType||'unauthorized', rate: e.rate||0, dateTo: e.dateTo||'' };
      if (e.absentType === 'maternity_paid') entry.dayNumber = _maternityDayNumber(e.date);
      absentData.push(entry);
    } else if(e.type === 'late'){
      lateCount++;
      lateData.push({ date: e.date, time: e.time||'' });
    } else if(e.type === 'earlyleave'){
      earlyCount++;
      earlyData.push({ date: e.date, time: e.time||'' });
    }
  });

  const absDatesEl = document.getElementById('pi-absent-dates');
  const absDataEl  = document.getElementById('pi-absent-data');
  const earlyEl    = document.getElementById('pi-earlyleave-data');
  const lateEl     = document.getElementById('pi-late-data');
  if(absDatesEl) absDatesEl.value = [...new Set(absentDates)].sort().join(',');
  if(absDataEl)  absDataEl.value  = JSON.stringify(absentData);
  if(earlyEl)    earlyEl.value    = JSON.stringify(earlyData);
  if(lateEl)     lateEl.value     = JSON.stringify(lateData);

  const summaryEl = document.getElementById('pi-attendance-summary');
  if(summaryEl){
    const parts = [];
    // ê²°ê·¼: ê·¼íƒœ ê´€ë¦¬ë??¥ì˜ ?¤ì œ ?¬ìœ ë¡??œì‹œ
    const absentLabels = { unauthorized:'ë¬´ë‹¨(ë¬´ê¸‰)', sick_unpaid:'ë³‘ê?(ë¬´ê¸‰)', sick_paid:'ë³‘ê?(? ê¸‰)', industrial:'?°ì¬', menstrual:'?ë¦¬?´ê?(ë¬´ê¸‰)', maternity_paid:'ì¶œì‚°(? ê¸‰)', maternity_unpaid:'ì¶œì‚°(ë¬´ê¸‰)', paternity_paid:'ë°°ìš°?ì¶œ??? ê¸‰)', childcare_leave:'?¡ì•„?´ì§', family_care:'ê°€ì¡±ëŒë´„íœ´ì§?, layoff_leave:'?´ì—…?´ì§' };
    const absentBg = { unauthorized:'#f3f4f6', sick_unpaid:'#fff7ed', sick_paid:'#dcfce7', industrial:'#dbeafe', menstrual:'#f5f3ff', maternity_paid:'#fdf2f8', maternity_unpaid:'#fef2f2', paternity_paid:'#ecfeff', childcare_leave:'#f0fdfa', family_care:'#f5f3ff', layoff_leave:'#fef2f2' };
    const absentColor = { unauthorized:'#374151', sick_unpaid:'#92400e', sick_paid:'#166534', industrial:'#1e40af', menstrual:'#6d28d9', maternity_paid:'#be185d', maternity_unpaid:'#dc2626', paternity_paid:'#0e7490', childcare_leave:'#065f46', family_care:'#6d28d9', layoff_leave:'#dc2626' };
    if(absentDays > 0){
      const absDetails = absentData.map(a => {
        const t = a.type || 'unauthorized';
        const d = (a.date||'').replace(/^\d{4}-/, '');
        const label = absentLabels[t] || t;
        const bg = absentBg[t] || '#f3f4f6';
        const color = absentColor[t] || '#374151';
        return `<span style="font-size:10px;padding:1px 5px;border-radius:4px;margin:1px 2px;background:${bg};color:${color};white-space:nowrap;">${d} ${label}</span>`;
      }).join('');
      parts.push(`<span style="color:#dc2626;font-weight:600;">ê²°ê·¼ ${absentDays}??/span> ${absDetails}`);
    } else {
      parts.push(`<span style="color:#9ca3af;">ê²°ê·¼ 0??/span>`);
    }
    // ì§€ê°? ì´??œê°„
    if(lateCount > 0){
      const lateTotalMin = lateData.reduce((s,e) => {
        const [h,m] = (e.time||'0:0').split(':').map(Number);
        return s + (h||0)*60 + (m||0);
      }, 0);
      const lateH = Math.floor(lateTotalMin/60);
      const lateM = lateTotalMin%60;
      const lateStr = lateM>0 ? `${lateH}.${Math.round(lateM/60*10)}h` : `${lateH}h`;
      parts.push(`<span style="color:#d97706;font-weight:600;">ì§€ê°?${lateStr}</span>`);
    } else {
      parts.push(`<span style="color:#9ca3af;">ì§€ê°?0h</span>`);
    }
    // ì¡°í‡´: ì´??œê°„
    if(earlyCount > 0){
      const earlyTotalMin = earlyData.reduce((s,e) => {
        const [h,m] = (e.time||'0:0').split(':').map(Number);
        return s + (h||0)*60 + (m||0);
      }, 0);
      const earlyH = Math.floor(earlyTotalMin/60);
      const earlyM = earlyTotalMin%60;
      const earlyStr = earlyM>0 ? `${earlyH}.${Math.round(earlyM/60*10)}h` : `${earlyH}h`;
      parts.push(`<span style="color:#4f46e5;font-weight:600;">ì¡°í‡´ ${earlyStr}</span>`);
    } else {
      parts.push(`<span style="color:#9ca3af;">ì¡°í‡´ 0h</span>`);
    }
    summaryEl.innerHTML = parts.join(' Â· ');
    // ?€?€ ?Œê¸‰ ê·¼íƒœ ??ª© ?œì‹œ ?€?€
    const retroAbsDatesEl = document.getElementById('pi-retro-absent-dates');
    const retroAbsDataEl  = document.getElementById('pi-retro-absent-data');
    const retroLateEl     = document.getElementById('pi-retro-late-data');
    const retroEarlyEl    = document.getElementById('pi-retro-earlyleave-data');
    // ?Œê¸‰ ê²°ê·¼ hidden
    if(retroAbsDatesEl) retroAbsDatesEl.value = retroAbsentData.map(a => a.date).join(',');
    if(retroAbsDataEl)  retroAbsDataEl.value  = JSON.stringify(retroAbsentData);
    // ?Œê¸‰ ì§€ê°?ì¡°í‡´ hidden (?œê°„ ?•ë³´ ?¬í•¨ ë°°ì—´)
    if(retroLateEl)     retroLateEl.value     = JSON.stringify(retroLateData);
    if(retroEarlyEl)    retroEarlyEl.value    = JSON.stringify(retroEarlyData);

    const hasRetro = retroAbsentDays > 0 || retroLateCount > 0 || retroEarlyCount > 0;
    if(hasRetro){
      const retroParts = [];
      if(retroAbsentDays > 0){
        const retroBadge = retroAbsentData.map(a => {
          const d = (a.date||'').replace(/^\d{4}-/, '');
          const label = absentLabels[a.type] || a.type || 'ë¬´ë‹¨(ë¬´ê¸‰)';
          return `<span style="font-size:10px;padding:1px 5px;border-radius:4px;margin:1px 2px;background:#fef3c7;color:#92400e;white-space:nowrap;">?Œê¸‰ ${d} ${label}</span>`;
        }).join('');
        retroParts.push(`<span style="color:#b45309;font-weight:600;">?Œê¸‰ ê²°ê·¼ ${retroAbsentDays}??/span> ${retroBadge}`);
      }
      if(retroLateCount > 0){
        retroParts.push(`<span style="color:#b45309;font-weight:600;">?Œê¸‰ ì§€ê°?${retroLateCount}??/span>`);
      }
      if(retroEarlyCount > 0){
        retroParts.push(`<span style="color:#b45309;font-weight:600;">?Œê¸‰ ì¡°í‡´ ${retroEarlyCount}??/span>`);
      }
      const retroLine = document.getElementById('pi-retro-attendance-row');
      if(retroLine){
        retroLine.style.display = '';
        const retroText = document.getElementById('pi-retro-attendance-text');
        if(retroText) retroText.innerHTML = retroParts.join(' Â· ');
      }
    } else {
      const retroLine2 = document.getElementById('pi-retro-attendance-row');
      if(retroLine2) retroLine2.style.display = 'none';
    }
  }
  window._attendanceFromPayroll = null;
}

/**
 * ê¸‰ì—¬?…ë ¥ ?˜ì´ì§€?ì„œ ?°ì°¨?´ê? ê´€ë¦¬ë???ëª¨ë‹¬ ?´ê¸°
 */
async function _openLedgerFromPayroll(){
  const empId = document.getElementById('pi-employee')?.value || '';
  if(!empId) { toast('ì§ì›??ë¨¼ì? ? íƒ?˜ì„¸??', 'error'); return; }

  const emp = allEmployees.find(e => e.id === empId);
  if(!emp) { toast('ì§ì› ?•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.', 'error'); return; }

  const curYear = parseInt(document.getElementById('pi-year')?.value) || new Date().getFullYear();

  // ê¸‰ì—¬?…ë ¥ ì»¨í…?¤íŠ¸ ?€??
  window._ledgerFromPayroll = true;

  // ?°ì°¨ ê´€ë¦??˜ì´ì§€?€ ?™ì¼??ëª¨ë‹¬ ?´ê¸°
  if(typeof openLeaveLedger === 'function'){
    await openLeaveLedger(empId, emp.name || '', curYear);
  }
}

/**
 * ê´€ë¦¬ë????€????ê¸‰ì—¬?…ë ¥ ?˜ì´ì§€ ?°ì°¨ ?œì‹œ ê°±ì‹  (saveLeaveLedger?ì„œ ?¸ì¶œ??
 */
function _onLedgerSavedFromPayroll(){
  if(window._ledgerFromPayroll){
    // saveLeaveLedger?ì„œ allLeaveLedgers ìºì‹œ ?´ë? ê°±ì‹ ????DB remain_days ì¦‰ì‹œ ë°˜ì˜
    _updatePIAnnualLeaveDetail();
    if(typeof calcAnnualLeaveTable === 'function') calcAnnualLeaveTable();
    window._ledgerFromPayroll = false;
  }
}

/**
 * ?°ì°¨?˜ë‹¹ ?ë™ê³„ì‚° ì²´í¬ë°•ìŠ¤ ? ê? ?¸ë“¤??
 * - ì²´í¬ ON : ?”ì—¬?°ì°¨ ê¸°ë°˜ ?ë™ê³„ì‚° ??pi-annual-pay ?¸íŒ… + readonly ?¤í???
 * - ì²´í¬ OFF: ì§ì ‘ ?…ë ¥ ëª¨ë“œ ë³µê? (ê°?? ì?, readonly ?´ì œ)
 */
function onAnnualAutoChkChange(){
  const chk     = document.getElementById('pi-annual-auto-chk');
  const payEl   = document.getElementById('pi-annual-pay');
  if(!chk || !payEl) return;

  if(chk.checked){
    // ?”ì—¬ ?°ì°¨ ë°°ì??ì„œ ê°??Œì‹±
    const badgeText = document.getElementById('pi-al-remain-badge')?.textContent || '?”ì—¬?°ì°¨: 0';
    const remain = parseFloat(badgeText.replace(/[^0-9.\-]/g, '')) || 0;
    const amt = _calcAnnualAutoPayAmount(remain);
    setAmountVal('pi-annual-pay', amt);
    // readonly ?¤í???
    payEl.readOnly = true;
    payEl.classList.add('pi-input-readonly');
    calcPI();
  } else {
    // ì§ì ‘ ?…ë ¥ ëª¨ë“œ ë³µê?
    payEl.readOnly = false;
    payEl.classList.remove('pi-input-readonly');
  }
}

function loadPIContract(){
  _piContractLoading = true;  // setPIPayType ??calcPI ì¤‘ë³µ ?¸ì¶œ ë°©ì? ?œì‘
  const empSel = document.getElementById('pi-employee');
  const empId = empSel?.value;
  const card=document.getElementById('pi-contract-card');
  if(!empId){card.style.display='none';piContract=null;_piContractLoading=false;return;}

  // ? íƒ???µì…˜??data-type ?•ì¸ (?±ê¸°?„ì›/?¹ìˆ˜ê´€ê³„ì¸ ?¬ë?)
  const selectedOption = empSel?.selectedOptions?.[0];
  const personType = selectedOption?.dataset?.type || 'employee';

  // ?€?€ ê°€??ì§ì›(?€?œì/?±ê¸°?„ì›/?¹ìˆ˜ê´€ê³„ì¸): ?¤ì œ ê·¼ë¡œê³„ì•½???ˆëŠ”ì§€ ë¨¼ì? ?•ì¸ ?€?€
  if(personType === 'executive' || personType === 'representative' || personType === 'related_party'){
    // ?¤ì œ employees ?Œì´ë¸”ì—???´ë¦„?¼ë¡œ ë§¤ì¹­ ??? íš¨ ê³„ì•½ ?ˆìœ¼ë©??¼ë°˜ ì§ì›ì²˜ëŸ¼ ì²˜ë¦¬
    const empName = (allEmployees.find(e => e.id === empId) || {}).name || '';
    if(empName){
      const matchedEmp = allEmployees.find(e => e.company_id === currentGlobalCompanyId && e.name === empName && e.id !== empId);
      if(matchedEmp){
        const matchedCt = allContracts.find(c =>
          c.employee_id === matchedEmp.id && !c.is_draft && !c.is_voided_by_amend &&
          (c.status === CONTRACT_STATUS.ACTIVE || c.status === CONTRACT_STATUS.DOCS_INCOMPLETE || c.status === CONTRACT_STATUS.PENDING)
        );
        if(matchedCt){
          // ? íš¨ ê³„ì•½ ë°œê²¬ ???¼ë°˜ ì§ì› ê²½ë¡œë¡?ì§„í–‰ (empIdë¥??¤ì œ employee.idë¡?êµì²´)
          const _empSel = document.getElementById('pi-employee');
          if(_empSel) _empSel.value = matchedEmp.id;
          piContract = null; // ?„ë˜ ?¼ë°˜ ê²½ë¡œ?ì„œ ?¬í• ??
          _piContractLoading = false;
          _setupManualFields(false); // ?˜ë™ ?…ë ¥ ?„ë“œ ?¨ê?
          card.style.display = '';
          // ?¼ë°˜ ê²½ë¡œë¡?fall-through
          return loadPIContract();
        }
      }
    }

    // ?¤ì œ ê³„ì•½ ?†ìŒ ??ê°€??ê³„ì•½ ?ì„± + ?˜ë™ ?…ë ¥ ?„ë“œ ?œì‹œ
    const _coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
    piContract = {
      id: null, employee_id: empId, company_id: _coId || '',
      contract_type: personType === 'executive' ? CONTRACT_TYPE.EXECUTIVE : personType === 'representative' ? CONTRACT_TYPE.REPRESENTATIVE : CONTRACT_TYPE.RELATED_PARTY,
      contract_start: '', contract_end: '',
      hourly_wage: 0, base_salary: 0, daily_wage: 0, weekly_holiday_pay: 0,
      annual_salary: 0, monthly_salary_agreed: 0,
      work_hours_per_day: 8, work_days_per_week: 5, work_days_per_month: 0,
      position_allowance: 0, transportation_allowance: 0, meal_allowance: 0,
      research_allowance: 0, communication_allowance: 0, fitness_allowance: 0,
      self_dev_allowance: 0, book_allowance: 0, overseas_allowance: 0,
      remote_area_allowance: 0, site_allowance: 0, skill_allowance: 0, license_allowance: 0,
      is_virtual: true, _personType: personType
    };
    card.style.display = 'none';
    // ?˜ë™ ?…ë ¥ ?„ë“œ ?œì‹œ
    _setupManualFields(true);
    // ê·¼ë¡œê³„ì•½?œì˜ ê¸‰ì—¬???°ì„ , ?†ìœ¼ë©??Œì‚¬ ?¤ì •
    const _co = allCompanies.find(c => c.id === _coId);
    piContract.pay_day = _co?.pay_day || null; // °¡»ó °è¾à¿¡ °í°´»ç Áö±ŞÀÏ ¹İ¿µ
    const _ppMo = piContract?.pay_period_month || _co?.pay_period_month || PAY_PERIOD_MONTH.CURRENT_MONTH;
    const _ppDay = parseInt(piContract?.pay_period_day) || parseInt(_co?.pay_period_day) || 1;
    const yr = parseInt(document.getElementById('pi-year')?.value) || new Date().getFullYear();
    const mo = parseInt(document.getElementById('pi-month')?.value) || (new Date().getMonth() + 1);
    const _isJeon = _ppMo === PAY_PERIOD_MONTH.PREV_MONTH || _ppMo === PAY_PERIOD_MONTH.PREV_MONTH;
    const _sMo = _isJeon ? (mo === 1 ? 12 : mo - 1) : mo;
    const _sYr = (_isJeon && mo === 1) ? yr - 1 : yr;
    const _eDate = new Date(_sYr, _sMo - 1, _ppDay);
    _eDate.setMonth(_eDate.getMonth() + 1);
    _eDate.setDate(_eDate.getDate() - 1);
    document.getElementById('pi-pay-period-start').value = `${_sYr}-${String(_sMo).padStart(2,'0')}-${String(_ppDay).padStart(2,'0')}`;
    document.getElementById('pi-pay-period-end').value = _eDate.toISOString().slice(0,10);
    // ìµœì??„ê¸ˆ ê¸°ë³¸ê°?
    const _mwYear = parseInt(document.getElementById('pi-year')?.value) || new Date().getFullYear();
    const _mw = allMinimumWages?.find(m => m.year === _mwYear) || { hourly_wage: 10030 };
    document.getElementById('pi-hourly-wage-input').value = _mw.hourly_wage || 10030;
    document.getElementById('pi-tax-dependents-input').value = 1;
    _piContractLoading = false;
    _applyPIDefaultWorkDays(false);
    _autoFillSeveranceInterim();
    return;
  }

  // ? íš¨ ê³„ì•½ ?„ë³´ë¥?ëª¨ë‘ ?˜ì§‘???? ë³µìˆ˜??ê²½ìš° contract_startê°€ ê°€??ìµœê·¼??ê²ƒì„ ?°ì„  ? íƒ.
  // - ?˜ìŠµ?’ì±„?©í™•???ë™ ?ì„± ???ë³¸ ?˜ìŠµ ê³„ì•½??is_voided_by_amend=trueë¡?ë¬´íš¨?”ë˜ì§€ ?Šì?
  //   ?ˆì™¸ ?í™©(?¤íŠ¸?Œí¬ ?¤ë¥˜ ???ì„œ??ê°€??ìµœê·¼ ê³„ì•½???¬ë°”ë¥´ê²Œ ? íƒ?˜ë„ë¡?ë°©ì–´?œë‹¤.
  {
    const _piCandidates = allContracts.filter(c=>
      c.employee_id===empId &&
      (c.status===EMP_STATUS.ACTIVE||c.status===CONTRACT_STATUS.ACTIVE||c.status===CONTRACT_STATUS.DOCS_INCOMPLETE||c.status===CONTRACT_STATUS.PENDING) &&
      !c.is_voided_by_amend && !c.is_draft
    );
    if(_piCandidates.length > 1){
      // ë³µìˆ˜ ?œì„± ê³„ì•½: contract_start ê¸°ì? ?´ë¦¼ì°¨ìˆœ ??ê°€??ìµœê·¼ ê³„ì•½ ? íƒ
      _piCandidates.sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''));
    }
    piContract = _piCandidates[0] || null;
    // ê·¼ë¡œê³„ì•½?œì˜ ê¸‰ì—¬ ?°ì •ê¸°ê°„ ?¤ì • (?„ìˆ˜)
    if(piContract && !piContract.is_virtual){
      const _ctPpMo = piContract.pay_period_month;
      const _ctPpDay = piContract.pay_period_day;
      if(!_ctPpMo || !_ctPpDay){
        toast('?´ë‹¹ ê·¼ë¡œê³„ì•½??ê¸‰ì—¬ ?°ì •ê¸°ê°„???„ë½?˜ì–´ ?ˆì–´ ê¸‰ì—¬?…ë ¥???„ë£Œ?????†ìŠµ?ˆë‹¤.', 'error');
        document.getElementById('pi-form-section').style.display = 'none';
        document.getElementById('pi-target-list-section').style.display = '';
        piContract = null;
        _piContractLoading = false;
        return;
      }
      const yr = parseInt(document.getElementById('pi-year')?.value) || new Date().getFullYear();
      const mo = parseInt(document.getElementById('pi-month')?.value) || (new Date().getMonth() + 1);
      const _isJeon = _ctPpMo === PAY_PERIOD_MONTH.PREV_MONTH || _ctPpMo === PAY_PERIOD_MONTH.PREV_MONTH;
      const _sMo = _isJeon ? (mo === 1 ? 12 : mo - 1) : mo;
      const _sYr = (_isJeon && mo === 1) ? yr - 1 : yr;
      const _eDate = new Date(_sYr, _sMo - 1, _ctPpDay);
      _eDate.setMonth(_eDate.getMonth() + 1);
      _eDate.setDate(_eDate.getDate() - 1);
      document.getElementById('pi-pay-period-start').value = `${_sYr}-${String(_sMo).padStart(2,'0')}-${String(_ctPpDay).padStart(2,'0')}`;
      document.getElementById('pi-pay-period-end').value = _eDate.toISOString().slice(0,10);
    }
  }
  // ê¸°ì? ëª¨ë“œ UI ?„í™˜ (ê³ ê°?¬ë§ˆ???¤ë? ???ˆìœ¼ë¯€ë¡?ì§ì› ? íƒ ?œë„ ?¬í™•??
  _switchInsuranceModeUI();
  // ê³„ì•½ ?œì‘??ê¸°ì? ê³ ê°???¤ëƒ…??ì·¨ë“ (ê³„ì•½ ?¹ì‹œ allowance_config ?¬ìš©)
  const _piLcCoId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const _piLcContractTs = piContract?.contract_start ? new Date(piContract.contract_start).getTime() : null;
  const _piLcCo = (typeof getCompanySnapshotAt === 'function' && _piLcContractTs)
    ? (getCompanySnapshotAt(_piLcCoId, _piLcContractTs) || allCompanies.find(c=>c.id===_piLcCoId))
    : allCompanies.find(c=>c.id===_piLcCoId);
  const _piLcCfg = _piLcCo?.allowance_config || {};
  /** ê³„ì•½??pay_type ???†ìœ¼ë©??Œì‚¬ ?¤ì •(ê³„ì•½ ?¹ì‹œ) fallback */
  const _ptOf = (contractPt, cfgKey) => contractPt || _piLcCfg[`${cfgKey}_pay_type`] || (_piLcCfg[cfgKey] ? 'fixed' : '');
  // ê³„ì•½ ?œì‘??ê¸°ì? allowance_config ?ìš© (show/hide)
  applyPIAllowanceConfig(_piLcCfg || null);

  if(piContract){
    const isPI_Daily = piContract.contract_type ===CONTRACT_TYPE.DAILY;
    // ?¼ìš©ì§? ê¸°ë³¸ê¸??ë¦¬???¼ê¸‰??ì±„ì?
    setAmountVal('pi-base',          isPI_Daily ? (piContract.daily_wage||0) : piContract.base_salary);
    // ì£¼íœ´?˜ë‹¹?€ ì¶œê·¼?¼ìˆ˜ ê¸°ë°˜ ?ë™ê³„ì‚° ??ê³„ì•½??ê³ ì •ê°??¬ìš© ???? 0?¼ë¡œ ì´ˆê¸°??(calcPI?ì„œ ?¬ê³„?? ?¼ìš©ì§??¬í•¨)
    setAmountVal('pi-weekly-hol',    0);
    // ?€?€ ?µìƒ?„ê¸ˆÂ·ê³ ì •?˜ë‹¹: ?¼ìš©ì§ì? ëª¨ë‘ 0 ì²˜ë¦¬ ?€?€
    if(isPI_Daily){
      setAmountVal('pi-remote-area',   0);
      setAmountVal('pi-site',          0);
      setAmountVal('pi-position',      0);
      setAmountVal('pi-transport',     0); setPIPayType('transport', '');
      setAmountVal('pi-meal',          0); setPIPayType('meal', '');
      setAmountVal('pi-childcare',     0); setPIPayType('childcare', '');
      setAmountVal('pi-research',      0); setPIPayType('research', '');
      setPIPayType('communication',   '');
      setPIPayType('fitness',         '');
      setPIPayType('self_dev',        '');
      setPIPayType('book',            '');
      setPIPayType('overseas',        '');
      const depEl = document.getElementById('pi-dependents');
      if(depEl) depEl.value = 0;
    } else {
    setAmountVal('pi-remote-area',     piContract.remote_area_allowance||0);
    setAmountVal('pi-site',           piContract.site_allowance||0);
    setAmountVal('pi-position',      piContract.position_allowance);
    // ì°¨ëŸ‰? ì?ë¹? ??ƒ self_driving ê³ ì •
    { const ta = piContract.self_driving_allowance || piContract.transportation_allowance || piContract.car_maintenance || 0;
      // ê³„ì•½??pay_type ???†ìœ¼ë©?allowance_config.car_pay_type fallback (?¤ë¥¸ ??ª©ê³??™ì¼ ?¨í„´)
      const _ctRawPt = piContract.transportation_pay_type || piContract.self_driving_pay_type || piContract.transport_pay_type || '';
      const tp = _ptOf(_ctRawPt, 'car');
      setAmountVal('pi-transport', ta);
      setPIPayType('transport', tp);
    }
    setAmountVal('pi-meal',          piContract.meal_allowance);
    setPIPayType('meal',             _ptOf(piContract.meal_pay_type,          'meal'));
    setAmountVal('pi-childcare',     piContract.childcare_allowance||0);
    setPIPayType('childcare',        _ptOf(piContract.childcare_pay_type,     'childcare'));
    setAmountVal('pi-research',      piContract.research_allowance||0);
    setPIPayType('research',         _ptOf(piContract.research_pay_type,      'research'));
    setPIPayType('communication',    _ptOf(piContract.communication_pay_type, 'communication'));
    setPIPayType('fitness',          _ptOf(piContract.fitness_pay_type,       'fitness'));
    setPIPayType('self_dev',         _ptOf(piContract.self_dev_pay_type,      'self_dev'));
    setPIPayType('book',             _ptOf(piContract.book_pay_type,          'book'));
    setPIPayType('overseas',         _ptOf(piContract.overseas_pay_type,      'overseas'));
    // ë¶€?‘ê?ì¡??? ì§ì› ?•ë³´??ê³¼ì„¸ê¸°ì? ë¶€?‘ê?ì¡???ë°˜ì˜ (12/31 ê¸°ì?)
    (function(){
      const depEl = document.getElementById('pi-dependents');
      const depDisp = document.getElementById('pi-tax-dependents-disp');
      const emp = (allEmployees||[]).find(e => e.id === empId);
      const val = (emp && typeof emp.tax_dependents === 'number' && emp.tax_dependents >= 1) ? emp.tax_dependents : 1;
      if(depEl) depEl.value = val;
      if(depDisp) depDisp.textContent = val + '??;
    })();
    }
    // ?€?€ ?´ë²ˆ???¬ìš©?°ì°¨ ì´ˆê¸°ê°? ê´€ë¦¬ë??¥ì— ?´ë‹¹ ???°ì´?°ê? ?ˆìœ¼ë©??°ì„  ?ìš© + max ?¤ì • ?€?€
    {
      const _alInitEl = document.getElementById('pi-annual-used');
      if(_alInitEl){
        const _alYr = parseInt(document.getElementById('pi-year')?.value)  || 0;
        const _alMo = parseInt(document.getElementById('pi-month')?.value) || 0;
        // max: ?´ë‹¹ ??ë²•ì •ê³µíœ´??ì£¼ë§ ?œì™¸ ?Œì •ê·¼ë¡œ?¼ìˆ˜
        if(_alYr && _alMo && typeof calcMonthWorkDays === 'function')
          _alInitEl.max = calcMonthWorkDays(_alYr, _alMo);
        let _alInitVal = 0;
        if(_alYr && _alMo){
          const _alLedger = (allLeaveLedgers || []).find(r =>
            r.employee_id === empId && Number(r.year) === _alYr
          );
          if(_alLedger){
            let _alMd = [];
            try { _alMd = JSON.parse(_alLedger.month_data || '[]'); } catch(e){}
            const _alMEntry = _alMd.find(d => Number(d.month) === _alMo);
            if(_alMEntry) _alInitVal = parseFloat(_alMEntry.days) || 0;
          }
        }
        _alInitEl.value = _alInitVal;
      }
    }
    calcAnnualLeaveTable();
    setAmountVal('pi-annual-pay',    0);
    // ê¸‰ì—¬ ?°ì •ê¸°ê°„: ê³„ì•½ ë§Œë£Œ ë¶€ë¶„ì›”?´ë©´ ê³ ê°???¤ì • ?œì‘??ë§Œë£Œ?¼ë¡œ ?ë™ ê³„ì‚°,
    //   ê·??¸ì—??ê³„ì•½?œì— ?…ë ¥??ê°?pay_period) ê·¸ë?ë¡??œì‹œ
    { const _ppEl = document.getElementById('pi-pay-period');
      if(_ppEl){
        const _cType = piContract.contract_type || '';
        const _isPartialTarget =
          _cType ===CONTRACT_TYPE.REGULAR_PROBATION || _cType ===CONTRACT_TYPE.FIXED || _cType ===CONTRACT_TYPE.FIXED_PROBATION;

        // ë§Œë£Œ?? salary_end_date ?°ì„ , ?†ìœ¼ë©?contract_end
        const _endRaw = piContract.salary_end_date || piContract.contract_end || '';

        // ê¸‰ì—¬ ??
        const _ppYr = parseInt(document.getElementById('pi-year')?.value)  || 0;
        const _ppMo = parseInt(document.getElementById('pi-month')?.value) || 0;

        let _ppVal = piContract.pay_period || '';

        // pay_periodê°€ ? ì§œë²”ìœ„ ?•ì‹(YYYY.MM.DD~YYYY.MM.DD)???„ë‹ˆë©?
        if(!_ppVal || _ppVal === '?”ê¸‰' || _ppVal === '?°ë´‰' || !_ppVal.includes('.')){
          // ??ë¨¼ì? ê°œë³„ ê³„ì•½??pay_period_month/day ?•ì¸
          const _ctMo = piContract.pay_period_month;
          const _ctDay = parseInt(piContract.pay_period_day);
          if(_ctMo && _ctDay){
            const _isJeon = _ctMo === PAY_PERIOD_MONTH.PREV_MONTH || _ctMo === PAY_PERIOD_MONTH.PREV_MONTH;
            const _sMo2 = _isJeon ? (_ppMo === 1 ? 12 : _ppMo - 1) : _ppMo;
            const _sYr2 = _isJeon && _ppMo === 1 ? _ppYr - 1 : _ppYr;
            const _eDate2 = new Date(_sYr2, _sMo2 - 1, _ctDay);
            _eDate2.setMonth(_eDate2.getMonth() + 1);
            _eDate2.setDate(_eDate2.getDate() - 1);
            _ppVal = `${_sYr2}.${String(_sMo2).padStart(2,'0')}.${String(_ctDay).padStart(2,'0')}~${_eDate2.getFullYear()}.${String(_eDate2.getMonth()+1).padStart(2,'0')}.${String(_eDate2.getDate()).padStart(2,'0')}`;
          } else {
            // ??ê³„ì•½?ë„ ?†ìœ¼ë©?ê³ ê°???¤ì •?¼ë¡œ ?´ë°±
          const _coId2 = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
          const _co2   = allCompanies.find(c => c.id === _coId2);
          const _coMo2 = _co2?.pay_period_month || PAY_PERIOD_MONTH.CURRENT_MONTH;
          const _coDay2 = parseInt(_co2?.pay_period_day) || 1;
          if(_ppYr && _ppMo){
            const _isJeon = _coMo2 === PAY_PERIOD_MONTH.PREV_MONTH || _coMo2 === PAY_PERIOD_MONTH.PREV_MONTH;
            // ?œì‘?? ?„ì›”?´ë©´ (ê¸‰ì—¬??1)??ì§€?•ì¼, ?¹ì›”?´ë©´ ê¸‰ì—¬?”ì˜ ì§€?•ì¼
            const _sMo2 = _isJeon ? (_ppMo === 1 ? 12 : _ppMo - 1) : _ppMo;
            const _sYr2 = _isJeon && _ppMo === 1 ? _ppYr - 1 : _ppYr;
            // ì¢…ë£Œ?? ?œì‘??+ 1ê°œì›” - 1??
            const _eDate2 = new Date(_sYr2, _sMo2 - 1, _coDay2);
            _eDate2.setMonth(_eDate2.getMonth() + 1);
            _eDate2.setDate(_eDate2.getDate() - 1);
            _ppVal = `${_sYr2}.${String(_sMo2).padStart(2,'0')}.${String(_coDay2).padStart(2,'0')}~${_eDate2.getFullYear()}.${String(_eDate2.getMonth()+1).padStart(2,'0')}.${String(_eDate2.getDate()).padStart(2,'0')}`;
          }
        }
      }

        if(_isPartialTarget && _endRaw && _ppYr && _ppMo){
          const _endDate   = new Date(_endRaw);

          // ê³ ê°??pay_period_month / pay_period_day ì»¬ëŸ¼?¼ë¡œ ?°ì •ê¸°ê°„ ë§ì¼ ê³„ì‚°
          const _coId  = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
          const _co    = allCompanies.find(c => c.id === _coId);
          const _coMo  = _co?.pay_period_month || PAY_PERIOD_MONTH.CURRENT_MONTH;
          const _coDay = parseInt(_co?.pay_period_day) || 1;

          const _isJeonwol = _coMo
            ? (_coMo === PAY_PERIOD_MONTH.PREV_MONTH || _coMo === PAY_PERIOD_MONTH.PREV_MONTH)
            : (_co?.pay_period || '').replace(/\s/g,'').startsWith(PAY_PERIOD_MONTH.PREV_MONTH) || (_co?.pay_period_month === PAY_PERIOD_MONTH.PREV_MONTH);

          // ?°ì •ê¸°ê°„ ?œì‘??ë°?ë§ì¼ ê³„ì‚°
          let _periodStartStr, _periodEnd;
          if(_isJeonwol){
            const _prevMo = _ppMo === 1 ? 12 : _ppMo - 1;
            const _prevYr = _ppMo === 1 ? _ppYr - 1 : _ppYr;
            _periodStartStr = `${_prevYr}-${String(_prevMo).padStart(2,'0')}-${String(_coDay).padStart(2,'0')}`;
            _periodEnd = new Date(_prevYr, _prevMo - 1, _coDay);
          } else {
            _periodStartStr = `${_ppYr}-${String(_ppMo).padStart(2,'0')}-${String(_coDay).padStart(2,'0')}`;
            _periodEnd = new Date(_ppYr, _ppMo - 1, _coDay);
          }
          _periodEnd.setMonth(_periodEnd.getMonth() + 1);
          _periodEnd.setDate(_periodEnd.getDate() - 1);

          // ë§Œë£Œ?¼ì´ ?°ì •ê¸°ê°„ ë§ì¼ë³´ë‹¤ ?´ì „ ??ë¶€ë¶„ì›”(ë§Œê·¼ ë¯¸ë‹¬)
          if(_endDate < _periodEnd){
            const _endMo  = String(_endDate.getMonth() + 1).padStart(2,'0');
            const _endDay = String(_endDate.getDate()).padStart(2,'0');
            const _endYr  = _endDate.getFullYear();
            const _sDate = new Date(_periodStartStr);
            const _sMo   = String(_sDate.getMonth() + 1).padStart(2,'0');
            const _sDay  = String(_sDate.getDate()).padStart(2,'0');
            const _sYr   = _sDate.getFullYear();

            _ppVal = `${_sYr}.${_sMo}.${_sDay}~${_endYr}.${_endMo}.${_endDay}`;
          }
        }

        // ?€?€ ê³„ì•½ ?œì‘ ë¶€ë¶„ì›”: ê¸‰ì—¬?°ì •ê¸°ê°„ ?œì‘?¼ì´ ê³„ì•½?œì‘???´í›„ë©?ì¡°ì • ?€?€
        {
          const _startRaw = piContract.salary_start_date || piContract.contract_start || '';
          if(_startRaw && _ppVal && _ppVal.includes('~')){
            const _startDate = new Date(_startRaw);
            const _parts = _ppVal.split('~');
            const _origStart = new Date(_parts[0].replace(/\./g,'-'));
            // ê³„ì•½?œì‘?¼ì´ ?°ì •ê¸°ê°„ ?œì‘?¼ë³´???´í›„ ???°ì •ê¸°ê°„ ?œì‘?¼ì„ ê³„ì•½?œì‘?¼ë¡œ ì¡°ì •
            if(_startDate > _origStart){
              const _sYr3 = _startDate.getFullYear();
              const _sMo3 = String(_startDate.getMonth()+1).padStart(2,'0');
              const _sDay3 = String(_startDate.getDate()).padStart(2,'0');
              _ppVal = `${_sYr3}.${_sMo3}.${_sDay3}~${_parts[1]}`;
            }
          }
        }

        _ppEl.value = _ppVal;
        // ?€?€ hidden ?„ë“œ: ê¸‰ì—¬ ?°ì •ê¸°ê°„ ?œì‘??ì¢…ë£Œ??(?°ì°¨Â·ê·¼íƒœ ê³„ì‚°?? ?€?€
        if(_ppVal && _ppVal.includes('~')){
          const _parts2 = _ppVal.split('~');
          const _start = _parts2[0].replace(/\./g,'-');
          const _end   = _parts2[1].replace(/\./g,'-');
          const _ppStartEl = document.getElementById('pi-pay-period-start');
          const _ppEndEl   = document.getElementById('pi-pay-period-end');
          if(_ppStartEl) _ppStartEl.value = _start;
          if(_ppEndEl)   _ppEndEl.value   = _end;
        }
      }
    }
    // ?µìƒ?œê¸‰: ê³„ì•½??hourly_wage ??readonly ?œì‹œ
    { const _hwDisp = document.getElementById('pi-hourly-wage-disp');
      if(_hwDisp){
        const _hw = parseFloat(piContract.hourly_wage) || 0;
        _hwDisp.textContent = _hw > 0 ? won(_hw) : '-';
      }
    }
    // ê³ ì • ?°ì¥/?¼ê°„/?´ì¼ê·¼ë¡œ?˜ë‹¹: ê·¼ë¬´?œê°„??ê¸°ì? ?ë™ê³„ì‚° ??readonly ?œì‹œ
    {
      const _fotDisp = document.getElementById('pi-fixed-ot-pay-disp');
      const _fniDisp = document.getElementById('pi-fixed-night-pay-disp');
      const _fhoDisp = document.getElementById('pi-fixed-hol-pay-disp');
      const _fotRow  = document.getElementById('pi-row-fixed-ot-disp');
      const _fniRow  = document.getElementById('pi-row-fixed-night-disp');
      const _fhoRow  = document.getElementById('pi-row-fixed-hol-disp');
      const _fixed   = _getPIFixedHours();
      const _fot   = _fixed.otPay;
      const _fni   = _fixed.nightPay;
      const _fho   = _fixed.holPay;
      const _fotH  = _fixed.otHours;
      const _fniH  = _fixed.nightHours;
      const _fhoH  = _fixed.holHours;
      const _fmtH  = h => h > 0 ? ` (${h}h/??` : '';
      if(_fotDisp) _fotDisp.textContent = _fot > 0 ? won(_fot) + _fmtH(_fotH) : '0??;
      if(_fniDisp) _fniDisp.textContent = _fni > 0 ? won(_fni) + _fmtH(_fniH) : '0??;
      if(_fhoDisp) _fhoDisp.textContent = _fho > 0 ? won(_fho) + _fmtH(_fhoH) : '0??;
      if(_fotRow)  _fotRow.style.display  = _fot > 0 ? '' : 'none';
      if(_fniRow)  _fniRow.style.display  = _fni > 0 ? '' : 'none';
      if(_fhoRow)  _fhoRow.style.display  = _fho > 0 ? '' : 'none';
    }
    // ?•ê¸° ?ì—¬ê¸? ê³„ì•½?œì— ëª…ì‹œ??ê²½ìš° ?ë™ ?¸íŒ… (?†ìœ¼ë©?0 ì´ˆê¸°??
    setAmountVal('pi-bonus', parseFloat(piContract.regular_bonus||0)||0);
    setAmountVal('pi-performance',   0);
    setAmountVal('pi-actual-expense',0);
    setAmountVal('pi-communication',  0);
    setAmountVal('pi-etc-allowance',  0);
    const _etcMemoEl = document.getElementById('pi-etc-allowance-memo');
    if(_etcMemoEl) _etcMemoEl.value = '';
    document.getElementById('pi-ot-hours').value   = 0;
    document.getElementById('pi-night-hours').value = 0;
    document.getElementById('pi-hol-hours').value   = 0;
    // ê·¼ë¡œ ?¤ì  ?ë™?°ì¶œ ?¨ë„ ì´ˆê¸°??ë°?ê³„ì•½ ?•ë³´ ?œì‹œ
    (function(){
      const wp = document.getElementById('pi-work-auto-panel');
      const sw = document.getElementById('pi-ot-pay-simple-wrap');
      if(wp) wp.style.display = 'none';
      if(sw) sw.style.display = 'none';
    })();
    // ?œë¥˜ë¯¸ë¹„/ê³„ì•½?ˆì • ?íƒœ ?ˆë‚´ ë°°ë„ˆ (?œì„±???„ë‹Œ ê²½ìš°) ??ê³„ì•½ ì¡°ê±´?€ ?•ìƒ ?œì‹œ, ? íš¨ ê³„ì•½?¼ë¡œ ì²˜ë¦¬
    const _piContractStatusBanner = piContract.status===CONTRACT_STATUS.DOCS_INCOMPLETE
      ? `<div style="background:#fef9c3;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:#92400e;">
           ? ï¸ <b>?œë¥˜ë¯¸ë¹„</b> ?íƒœ ??? íš¨ ê³„ì•½?¼ë¡œ ê¸‰ì—¬ ì²˜ë¦¬?©ë‹ˆ?? ? ì¸ ?œë¥˜ë¥?<a href="#" onclick="event.preventDefault();openContractForUpload('${piContract.id}')" style="color:#b45309;font-weight:700;text-decoration:underline;cursor:pointer;">ë³´ì™„</a>??ì£¼ì„¸??</div>`
      : piContract.status===CONTRACT_STATUS.PENDING
      ? `<div style="background:#fef9c3;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:#92400e;">
           ? ï¸ <b>ê³„ì•½?ˆì •</b> ?íƒœ ??ê³„ì•½ ?¨ë ¥ ê°œì‹œ ?„ì…?ˆë‹¤.</div>`
      : '';
    // ?€?€ ê³„ì•½?•ë³´ ì¹´ë“œ ë³¸ë¬¸ ë¹Œë“œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
    {
      const _ct       = piContract.contract_type || '';
      const _isProb   = _ct ===CONTRACT_TYPE.REGULAR_PROBATION || _ct ===CONTRACT_TYPE.FIXED_PROBATION;
      const _isFixed  = _ct ===CONTRACT_TYPE.FIXED     || _ct ===CONTRACT_TYPE.FIXED_PROBATION;
      const _isRegular = _ct ===CONTRACT_TYPE.REGULAR;

      // ê³„ì•½ê¸°ê°„ ?¬ë§· (ê³„ì•½ì§Â·ê³„?½ì§ ?˜ìŠµÂ·?¼ìš©ì§?
      const _fmtDate = s => s ? s.replace(/-/g, '.') : '-';
      const _contractPeriod = `${_fmtDate(piContract.contract_start)} ~ ${_fmtDate(piContract.contract_end || 'ë¬´ê¸°??)}`;

      // ?˜ìŠµê¸°ê°„: contract_start ~ _calcProbationEndDate ê²°ê³¼
      let _probPeriodStr = '';
      if(_isProb){
        const _probEnd = _calcProbationEndDate(piContract);
        _probPeriodStr = `${_fmtDate(piContract.contract_start)} ~ ${_fmtDate(_probEnd || piContract.contract_end)}`;
      }

      // ?˜ìŠµ ???½ì •?„ê¸ˆ: probation_amt(ì§ì ‘?…ë ¥) ?°ì„ , ?†ìœ¼ë©?monthly_salary_agreed Ã— probation_pct/100
      let _probMonthly = 0;
      if(_isProb){
        const _pAmt = parseFloat(piContract.probation_amt) || 0;
        const _pPct = parseFloat(piContract.probation_pct) || 0;
        const _mSal = parseFloat(piContract.monthly_salary_agreed) || 0;
        _probMonthly = _pAmt > 0 ? _pAmt : Math.round(_mSal * _pPct / 100);
      }

      // ? í˜•ë³??„ê¸ˆ ??
      let _salaryLine = '';
      if(isPI_Daily){
        _salaryLine = `<b>?¼ê¸‰??</b> ${won(piContract.daily_wage || piContract.base_salary)}<br>`;
      } else if(_isProb){
        _salaryLine = `<b>?˜ìŠµ ???½ì •?„ê¸ˆ:</b> ${won(_probMonthly)}<br>`;
      } else if(_isFixed){
        _salaryLine = `<b>???½ì •?„ê¸ˆ:</b> ${won(piContract.monthly_salary_agreed)}<br>`;
      } else {
        // ?•ê·œì§?
        _salaryLine = `<b>?°ë´‰:</b> ${won(piContract.annual_salary)}<br>`;
      }

      // ê³„ì•½ê¸°ê°„ ??(ê³„ì•½ì§Â·ê³„?½ì§ ?˜ìŠµÂ·?¼ìš©ì§?
      const _contractPeriodLine = (isPI_Daily || _isFixed)
        ? `<b>ê³„ì•½ê¸°ê°„:</b> ${_contractPeriod}<br>`
        : '';

      // ?˜ìŠµê¸°ê°„ ??
      const _probPeriodLine = _isProb
        ? `<b>?˜ìŠµê¸°ê°„:</b> ${_probPeriodStr}<br>`
        : '';

      // ?…ì‚¬????(?•ê·œì§??„ìš©)
      let _hireDateLine = '';
      if(_isRegular){
        const _piEmpData = allEmployees.find(e => e.id === empId);
        const _hireDate  = _piEmpData?.hire_date || piContract.contract_start || '';
        _hireDateLine = `<b>?…ì‚¬??</b> ${_fmtDate(_hireDate)}<br>`;
      }

      // ê³µí†µ ?˜ë‹¨ ??
      // ?´ê²Œ?œê°„: schedule_json?ì„œ ì¶”ì¶œ, ?†ìœ¼ë©?break_time fallback
      let _breakDisplay = '-';
      try {
        const _sched = piContract.schedule_json ? JSON.parse(piContract.schedule_json) : null;
        if(Array.isArray(_sched) && _sched.length){
          const _breaks = new Set();
          _sched.forEach(d => {
            if(!d.active) return;
            (d.shifts||[]).forEach(sh => {
              (sh.breaks||[]).forEach(b => { if(b.s && b.e) _breaks.add(`${b.s}~${b.e}`); });
              if(sh.brk_start && sh.brk_end) _breaks.add(`${sh.brk_start}~${sh.brk_end}`);
            });
          });
          if(_breaks.size > 0) _breakDisplay = [..._breaks].join(', ');
        }
      } catch(e){}
      if(_breakDisplay === '-' && piContract.break_time != null && piContract.break_time !== ''){
        _breakDisplay = piContract.break_time + '?œê°„';
      }

      const _bottomLine = isPI_Daily
        ? `<b>ê¸°ë³¸ê·¼ë¡œ:</b> ??{piContract.work_hours_per_day}h<br>` +
          `<b>?ë?:</b> ${won(piContract.meal_allowance)} Â· ?´ê²Œ: ${_breakDisplay}`
        : `<b>ê¸°ë³¸ê·¼ë¡œ:</b> ??{piContract.work_hours_per_day}h Â· ì£?{piContract.work_days_per_week}??br>` +
          `<b>?ë?:</b> ${won(piContract.meal_allowance)} Â· ?´ê²Œ: ${_breakDisplay}`;

      document.getElementById('pi-contract-info').innerHTML =
        _piContractStatusBanner +
        _contractPeriodLine +
        _probPeriodLine +
        _hireDateLine +
        _salaryLine +
        `<b>?µìƒ?œê¸‰:</b> ${won(piContract.hourly_wage)}/h<br>` +
        _bottomLine;
    }
    card.style.display='block';
    // ê³„ì•½??ê³ ì • ??ª© ? ê¸ˆ
    _setPIContractReadonly(true);
    // ê³„ì•½??ê¸ˆì•¡ 0??fixed ??ª© ?¨ê? (childcare ?œì™¸)
    _hideZeroContractPIRows();
  } else {
    document.getElementById('pi-contract-info').innerHTML='? ï¸ ? íš¨??ê³„ì•½?œê? ?†ìŠµ?ˆë‹¤.';
    card.style.display='block';
    // ?°ì°¨ ë°°ì? ì´ˆê¸°??
    const _alBadge = document.getElementById('pi-al-remain-badge');
    if(_alBadge){ _alBadge.textContent = '?”ì—¬?°ì°¨: -'; _alBadge.className = 'pi-al-badge-excluded'; }
    // ê³„ì•½ ?†ìœ¼ë©??°ì •ê¸°ê°„Â·?µìƒ?œê¸‰Â·?°ì°¨?ë™ê³„ì‚° ì´ˆê¸°??
    const _ppEl2 = document.getElementById('pi-pay-period'); if(_ppEl2) _ppEl2.value = '';
    const _hwDisp2 = document.getElementById('pi-hourly-wage-disp'); if(_hwDisp2) _hwDisp2.textContent = '-';
    // ê³„ì•½ ?†ìœ¼ë©?ê³ ì •?˜ë‹¹ ???¨ê?
    { const _r1=document.getElementById('pi-row-fixed-ot-disp');    if(_r1) _r1.style.display='none'; }
    { const _r2=document.getElementById('pi-row-fixed-night-disp'); if(_r2) _r2.style.display='none'; }
    { const _r3=document.getElementById('pi-row-fixed-hol-disp');   if(_r3) _r3.style.display='none'; }
    { const _chk2=document.getElementById('pi-annual-auto-chk'); if(_chk2) _chk2.checked=false;
      const _ap2=document.getElementById('pi-annual-pay');
      if(_ap2){ _ap2.readOnly=false; _ap2.classList.remove('pi-input-readonly'); } }
    // ê³„ì•½ ?†ìœ¼ë©?? ê¸ˆ ?´ì œ
    _setPIContractReadonly(false);
  }
  // ?€?€ ?˜ìŠµ ë§Œë£Œ??ì´ˆê³¼ ê²€??(ì§ì›/ê³„ì•½ ë³€ê²???ì¦‰ì‹œ ê°±ì‹ ) ?€?€
  const _probOverrunOnLoad = _checkPIProbationOverrun();
  if(_probOverrunOnLoad) _setPIInputLocked(true);

  // ?€?€ ê·¼ë¡œ?¼ìˆ˜ Â· ì´?ê·¼ë¡œ?œê°„ ?ë™ ?…ë ¥ (ì§ì› ? íƒ ????ƒ ?ˆë¡œ ê³„ì‚°) ?€?€
  // ì§ì›??ë°”ê¿”???´ì „ ê°’ì´ ?¨ì? ?Šë„ë¡??„ë“œë¥?ë¨¼ì? ì´ˆê¸°?”í•œ ??ê°•ì œ ?ìš©
  {
    const _wdEl = document.getElementById('pi-work-days');
    const _thEl = document.getElementById('pi-total-hours');
    const _lbl  = document.getElementById('pi-workdays-auto-label');
    // max ?ì„±: piContract ? ë¬´?€ ë¬´ê??˜ê²Œ ??ƒ ?¹ì›” ?¬ë ¥ ?¼ìˆ˜ë¡?ê°±ì‹ 
    {
      const _yr0 = parseInt(document.getElementById('pi-year')?.value)  || 0;
      const _mo0 = parseInt(document.getElementById('pi-month')?.value) || 0;
      if(_wdEl && _yr0 && _mo0) _wdEl.max = new Date(_yr0, _mo0, 0).getDate();
    }
    if(_wdEl) _wdEl.value = '';
    if(_thEl) _thEl.value = '';
    if(_lbl)  _lbl.style.display = 'none';
  }
  // setPIPayType ?¸ì¶œ??ëª¨ë‘ ?ë‚¬?¼ë?ë¡?ë¹„ì •ê¸??¹ì…˜ ?´ë™ ì²˜ë¦¬ ??calcPI 1???¤í–‰
  _renderPIIrregularRows();
  _piContractLoading = false;
  calcPI();

  // ?€?€ ê·¼ë¡œ?¼ìˆ˜ Â· ì´?ê·¼ë¡œ?œê°„ ?ë™ ?…ë ¥ (ì§ì› ? íƒ ????ƒ ?ˆë¡œ ê³„ì‚°) ?€?€
  _applyPIDefaultWorkDays(true);

  // ?€?€ ì§€ê¸‰ì¼ ?ë™ ?…ë ¥ + readonly ?œì–´ ?€?€
  _applyPIPayDate(true);

  // ?€?€ ?„ì‹œ?€??ë°°ë„ˆ ì²´í¬ (ì§ì› ? íƒ ?? ?€?€
  {
    const _empIdForDraft = document.getElementById('pi-employee')?.value;
    const _yrForDraft    = parseInt(document.getElementById('pi-year')?.value);
    const _moForDraft    = parseInt(document.getElementById('pi-month')?.value);
    piDraftId = null; // ì§ì› ë°”ë€Œë©´ ì´ˆê¸°??
    if(_empIdForDraft && _yrForDraft && _moForDraft){
      _checkAndShowPIDraftBanner(_empIdForDraft, _yrForDraft, _moForDraft);
    } else {
      const draftBanner = document.getElementById('pi-draft-banner');
      if(draftBanner) draftBanner.style.display = 'none';
    }
  }

  // ?€?€ ì§ì „??ë©”ëª¨ ?¸ê³„ (ì§ì› ? íƒ ?? ?€?€
  _loadPrevMonthMemos();

  // ?€?€ ?´ì§ê¸?ì¤‘ê°„?•ì‚° ?ë™ì±„ì? ?€?€
  _autoFillSeveranceInterim();
}

/** ?´ë‹¹ ?”ì— ì¤‘ê°„?•ì‚° ê¸°ë¡???ˆìœ¼ë©??ë™ ì±„ì? */
async function _autoFillSeveranceInterim(){
  const rowEl = document.getElementById('pi-row-severance-interim');
  const amtEl = document.getElementById('pi-severance-interim');
  const lblEl = document.getElementById('pi-severance-interim-label');
  if(!rowEl || !amtEl) return;
  const empId = document.getElementById('pi-employee')?.value || '';
  const ppEnd = document.getElementById('pi-pay-period-end')?.value || '';
  if(!empId || !ppEnd){ rowEl.style.display = 'none'; return; }

  // ì¤‘ê°„?•ì‚° ?°ì´??ë¡œë“œ (?†ìœ¼ë©?fetch)
  if(typeof _allInterimSettlements === 'undefined' || !_allInterimSettlements.length){
    const coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value || '';
    if(coId){
      try {
        const res = await fetch(`../tables/severance_interim_settlements?company_id=${coId}&limit=999`);
        const data = await res.json();
        window._allInterimSettlements = data.data || [];
      } catch(e){ window._allInterimSettlements = []; }
    }
  }
  const match = (_allInterimSettlements || []).find(s =>
    s.employee_id === empId && s.settlement_date >= (document.getElementById('pi-pay-period-start')?.value||'') && s.settlement_date <= ppEnd
  );
  if(match){
    rowEl.style.display = '';
    amtEl.value = match.settlement_amount || 0;
    amtEl.readOnly = true;
    amtEl.classList.add('pi-interim-filled');
    const reasonLabel = {'ì£¼íƒêµ¬ì…':'ì£¼íƒêµ¬ì…','?˜ë£Œë¹?:'?˜ë£Œë¹?,'?Œì‚°':'?Œì‚°Â·?Œìƒ','ê¸°í?':'ê¸°í?'}[match.reason]||match.reason;
    if(lblEl) lblEl.textContent = `${match.settlement_date} Â· ${reasonLabel} Â· ê·¼ì† ${match.tenure_days||0}??;
  } else {
    rowEl.style.display = 'none';
    amtEl.value = 0;
  }
}

// ?€?€ ì§ì „??ê¸‰ì—¬ ë©”ëª¨ ?¸ê³„ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ê±´ê°•ë³´í—˜?°ë§?•ì‚°Â·?¥ê¸°?”ì–‘ë³´í—˜?°ë§?•ì‚°Â·?Œë“?¸ì—°ë§ì •?°Â·ê¸°?€ 4ê°?ë©”ëª¨ë¥?
// ì§ì „ ???•ì • ê¸‰ì—¬(is_draft=false)?ì„œ ?½ì–´?€ ?„ì¬ ?…ë ¥?¼ì— ì±„ìš´??
// ?´ë? ?˜ì • ëª¨ë“œ(piEditPayrollId)?´ê±°???„ì‹œ?€??ë³µì› ì§í›„?ëŠ” ?¤í–‰?˜ì? ?ŠëŠ”??
function _loadPrevMonthMemos(){
  // ?˜ì • ëª¨ë“œ ?ëŠ” ?„ì‹œ?€??ë³µì› ?íƒœ?ì„œ????–´?°ì? ?ŠìŒ
  if(piEditPayrollId) return;

  const empId = document.getElementById('pi-employee')?.value;
  const yr    = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo    = parseInt(document.getElementById('pi-month')?.value) || 0;
  if(!empId || !yr || !mo) { _hidePrevMemoBanner(); return; }

  // ì§ì „??ê³„ì‚° (1?”â†’?„ë…„ 12??
  const prevYr = mo === 1 ? yr - 1 : yr;
  const prevMo = mo === 1 ? 12     : mo - 1;

  // ì§ì „???•ì • ê¸‰ì—¬ ?ˆì½”??ê²€??(is_draft=false ?ëŠ” ?†ëŠ” ?ˆì½”??
  const prevPay = (allPayrolls || []).find(p =>
    p.employee_id === empId &&
    p.pay_year    === prevYr &&
    p.pay_month   === prevMo &&
    !p.is_draft
  );

  // ?¸ê³„??ë©”ëª¨ 4ê°?ì¶”ì¶œ
  const memos = {
    'pi-health-adj-yearend-memo': (prevPay?.health_insurance_adjust_yearend_memo || '').trim(),
    'pi-ltcare-adj-yearend-memo': (prevPay?.ltcare_adjust_yearend_memo           || '').trim(),
    'pi-yearend-memo':            (prevPay?.year_end_tax_adjust_memo              || '').trim(),
    'pi-advance-memo':            (prevPay?.advance_deduction_memo                || '').trim(),
  };

  const hasAny = Object.values(memos).some(v => v !== '');
  if(!hasAny){ _hidePrevMemoBanner(); return; }

  // ê°?textarea??ê°??¤ì • (?„ì¬ ?¼ì´ ë¹„ì–´?ˆì„ ?Œë§Œ ì±„ì? ???¬ìš©?ê? ?´ë? ?…ë ¥???´ìš© ë³´í˜¸)
  let filled = 0;
  for(const [id, val] of Object.entries(memos)){
    const el = document.getElementById(id);
    if(el && val){
      // ?„ì¬ textareaê°€ ë¹„ì–´?ˆì„ ?Œë§Œ ?¸ê³„ (?˜ë™ ?…ë ¥ ë³´í˜¸)
      if((el.value || '').trim() === ''){
        el.value = val;
        filled++;
      }
    }
  }

  if(filled > 0){
    // ë°°ë„ˆ ?œì‹œ
    const banner = document.getElementById('pi-prev-memo-banner');
    const title  = document.getElementById('pi-prev-memo-banner-title');
    if(banner){
      if(title) title.textContent = `ì§ì „??${prevYr}??${prevMo}?? ë©”ëª¨ ?¸ê³„`;
      banner.style.display = 'block';
    }
  } else {
    _hidePrevMemoBanner();
  }
}

function _hidePrevMemoBanner(){
  const banner = document.getElementById('pi-prev-memo-banner');
  if(banner) banner.style.display = 'none';
}

function _dismissPrevMemoBanner(){
  _hidePrevMemoBanner();
}
const gv=id=>{const el=document.getElementById(id);return el?parseFloat((el.value||'').replace(/,/g,''))||0:0;};
// ?€?€ ?„ì¬ ? íƒ??ê³ ê°?¬ì˜ 4?€ë³´í—˜ ?ìš© ê¸°ì? ë°˜í™˜ ?€?€
function _getPIInsuranceBasis(){
  // currentGlobalCompanyId ?°ì„ , ?†ìœ¼ë©??¨ê? select value ?´ë°±
  const coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const co = allCompanies.find(c=>c.id===coId);
  return normalizeInsuranceBasis(co?.insurance_basis) || INSURANCE_BASIS.RATE_BASED;
}

// ?€?€ ?¹ì • ?„ì›”??4?€ë³´í—˜ ?°ì •ê¸°ì? ?±ë¡ ?¬ë? ?•ì¸ ?€?€
// ë°˜í™˜: { ok: true } | { ok: false, missing: ['êµ???°ê¸ˆ', ...] }
// companyId: ? íƒ???¸ì - ?„ë‹¬ ???´ë‹¹ ê³ ê°??insurance_basisë¥?ì§ì ‘ ì¡°íšŒ (ê¸€ë¡œë²Œ ?íƒœ ê¸°ì? ?¤ì œ)
function _checkPIStandardsReady(yr, mo, companyId){
  // ?•ì •??ê¸°ì? ê³ ê°?¬ëŠ” ?”ìœ¨ ë¶ˆí•„??????ƒ ?µê³¼
  const _basisCoId = companyId || currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const _basisCo = allCompanies.find(c=>c.id===_basisCoId);
  if((_basisCo?.insurance_basis || INSURANCE_BASIS.RATE_BASED) === INSURANCE_BASIS.FIXED_AMOUNT) return { ok: true };

  const payDate = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const types = [
    { key:'national_pension', label:'êµ???°ê¸ˆ' },
    { key:'health',           label:'ê±´ê°•ë³´í—˜' },
    { key:'long_term_care',   label:'?¥ê¸°?”ì–‘ë³´í—˜' },
    { key:'employment',       label:'ê³ ìš©ë³´í—˜' },
  ];
  const missing = types
    .filter(t => {
      // ???ìš©ê¸°ê°„ ??ë§¤ì¹­
      const exact = _allInsuranceRates.find(r =>
        r.insurance_type === t.key &&
        payDate >= (r.period_start||'') &&
        payDate <= (r.period_end||'9999-12-31')
      );
      if(exact) return false; // ?ˆìŒ ???„ë½ ?„ë‹˜
      // ??ë§¤ì¹­ ?¤íŒ¨ ?? ?´ë‹¹ ? í˜•???°ì´?°ê? ?˜ë‚˜?¼ë„ ?ˆìœ¼ë©??„ë½ ?„ë‹˜ (ìµœì‹  ?”ìœ¨ ì§€???ìš©)
      const any = _allInsuranceRates.some(r => r.insurance_type === t.key);
      return !any;
    })
    .map(t => t.label);

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _calcPIDefaultWorkDays(contract, year, month)
//   ê·¼ë¡œê³„ì•½??ê¸°ì??¼ë¡œ ?´ë‹¹ ?°ì›”??ê¸°ë³¸ ê·¼ë¡œ?¼ìˆ˜Â·ì´?ê·¼ë¡œ?œê°„???ë™ ê³„ì‚°?œë‹¤.
//
//   ???•ê·œì§?/ ?•ê·œì§??˜ìŠµ
//     ???´ë‹¹ ??ë§Œê·¼ ê¸°ì? (ì£??Œì •ê·¼ë¡œ??Ã— ?´ë‹¹ ???‰ì¼ ì¹´ìš´??
//     ??work_days_per_month ê³„ì•½ ?„ë“œê°€ ?ˆìœ¼ë©?ê·?ê°??¬ìš© (ê°€???°ì„ )
//
//   ??ê³„ì•½ì§?/ ê³„ì•½ì§??˜ìŠµ
//     ??ê¸‰ì—¬?°ì •ê¸°ê°„(salary_start_date ~ salary_end_date) ?°ì„ ,
//        ?†ìœ¼ë©?ê³„ì•½ ê¸°ê°„(contract_start ~ contract_end) ?¬ìš©
//     ??ê¸‰ì—¬?°ì • ì¢…ë£Œ?¼ì´ ?´ë‹¹ ???ˆì— ?ˆìœ¼ë©??”ì—¬ ?‰ì¼ë§?ê³„ì‚° (partial_end)
//     ??ê¸‰ì—¬?°ì • ?œì‘?¼ì´ ?´ë‹¹ ???ˆì— ?ˆìœ¼ë©??…ì‚¬ ???‰ì¼ë§?ê³„ì‚° (partial_start)
//     ???‘ìª½ ???´ë‹¹ ???ˆì´ë©?êµì§‘??ë²”ìœ„ë§?ê³„ì‚° (partial_both)
//
//   ë°˜í™˜: { workDays: number, totalHours: number, mode: 'full'|'partial_end'|'partial_start'|'partial_both'|'none', description: string }
//   - workDays  : ?•ìˆ˜ (?‰ì¼ ê¸°ì?)
//   - totalHours: workDays Ã— work_hours_per_day
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _calcPIDefaultWorkDays(contract, year, month){
  if(!contract || !year || !month){
    return { workDays: 0, totalHours: 0, mode: 'none', description: '' };
  }

  const hpd = parseFloat(contract.work_hours_per_day) || 8;  // ???Œì •ê·¼ë¡œ?œê°„
  const dpw = parseFloat(contract.work_days_per_week)  || 5;  // ì£??Œì •ê·¼ë¡œ?¼ìˆ˜
  const cType = contract.contract_type || '';
  const isFixed = cType === CONTRACT_TYPE.FIXED || cType === CONTRACT_TYPE.FIXED_PROBATION;

  // ?€?€ ê¸‰ì—¬?°ì •ê¸°ê°„ ?œì‘Â·ì¢…ë£Œ??(?Œì‚¬ pay_period_month/day ê¸°ì?) ?€?€?€?€?€?€?€?€?€?€
  const _coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const _co   = allCompanies.find(c => c.id === _coId);
  const _ppMo = _co?.pay_period_month || PAY_PERIOD_MONTH.CURRENT_MONTH;
  const _ppDay = parseInt(_co?.pay_period_day) || 1;
  let ppStart, ppEnd; // ?Œì‚¬ ê¸‰ì—¬?°ì •ê¸°ê°„
  if(_ppMo === PAY_PERIOD_MONTH.PREV_MONTH || _ppMo === PAY_PERIOD_MONTH.PREV_MONTH){
    // ?„ì›” D??~ ?¹ì›” (D-1)??
    ppStart = new Date(year, month - 2, _ppDay);
    ppEnd   = new Date(year, month - 1, _ppDay);
    ppEnd.setDate(ppEnd.getDate() - 1);
  } else {
    // ?¹ì›” D??~ ?µì›” (D-1)??
    ppStart = new Date(year, month - 1, _ppDay);
    ppEnd   = new Date(year, month, _ppDay);
    ppEnd.setDate(ppEnd.getDate() - 1);
  }

  // ?€?€ ê³„ì•½ì§? ê¸‰ì—¬?°ì •ê¸°ê°„ ?°ì„  / fallback ê³„ì•½ê¸°ê°„ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  let periodStartDate = null, periodEndDate = null;
  if(isFixed){
    const ssRaw = contract.salary_start_date || contract.contract_start;
    const seRaw = contract.salary_end_date   || contract.contract_end;
    periodStartDate = ssRaw ? new Date(ssRaw) : null;
    periodEndDate   = seRaw ? new Date(seRaw) : null;
  }

  // ?•ê·œì§? contract_startë§?ì°¸ì¡° (?…ì‚¬ ì²«ë‹¬ partial_start ì²˜ë¦¬??
  const csDate = contract.contract_start ? new Date(contract.contract_start) : null;

  // ?€?€ ?¤ì œ ê·¼ë¬´ ë²”ìœ„ ê²°ì • (ê³„ì•½ ê¸°ê°„ ??ê¸‰ì—¬?°ì •ê¸°ê°„) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  let rangeStart = ppStart;
  let rangeEnd   = ppEnd;
  if(isFixed){
    if(periodStartDate && periodStartDate > rangeStart) rangeStart = periodStartDate;
    if(periodEndDate   && periodEndDate   < rangeEnd)   rangeEnd   = periodEndDate;
  } else {
    if(csDate && csDate > rangeStart) rangeStart = csDate;
    // ê¸‰ì—¬?°ì •ê¸°ê°„ ì¢…ë£Œ?¼ê³¼ ê³„ì•½ ì¢…ë£Œ???ˆìœ¼ë©? ì¤?ë¹ ë¥¸ ìª?
    if(contract.contract_end){
      const _ceDate = new Date(contract.contract_end);
      if(_ceDate < rangeEnd) rangeEnd = _ceDate;
    }
  }

  if(rangeStart > rangeEnd){
    return { workDays: 0, totalHours: 0, mode: 'none', description: '?´ë‹¹ ??ê·¼ë¬´ ?†ìŒ' };
  }

  // ?€?€ ë§Œê·¼ ê¸°ì? ?Œì •ê·¼ë¡œ?¼ìˆ˜ (ê¸‰ì—¬?°ì •ê¸°ê°„ ?„ì²´ ê¸°ì?) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const fullMonthWorkDays = _countWorkDays(ppStart, ppEnd, dpw);

  // ?€?€ ?¤ì œ ê·¼ë¬´?¼ìˆ˜ ì¹´ìš´???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const isFullPeriod = (rangeStart.getTime() === ppStart.getTime() &&
                        rangeEnd.getTime()   === ppEnd.getTime());
  let actualWorkDays;
  if(isFullPeriod){
    actualWorkDays = fullMonthWorkDays;
  } else {
    actualWorkDays = _countWorkDays(rangeStart, rangeEnd, dpw);
  }
  actualWorkDays = Math.round(actualWorkDays);

  // ?€?€ ëª¨ë“œÂ·?¤ëª… ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  let mode, description;
  const _ppLabel = `${ppStart.toISOString().slice(0,10)}~${ppEnd.toISOString().slice(0,10)}`;
  if(isFixed){
    const pStartInPeriod = periodStartDate && periodStartDate >= ppStart && periodStartDate <= ppEnd;
    const pEndInPeriod   = periodEndDate   && periodEndDate   >= ppStart && periodEndDate   <= ppEnd;
    const ssLabel = contract.salary_start_date || contract.contract_start || '';
    const seLabel = contract.salary_end_date   || contract.contract_end   || '';
    if(pStartInPeriod && pEndInPeriod){
      mode = 'partial_both';
      description = `ê¸‰ì—¬?°ì •ê¸°ê°„(${_ppLabel}) Ã— ê³„ì•½ê¸°ê°„(${ssLabel}~${seLabel})`;
    } else if(pEndInPeriod){
      mode = 'partial_end';
      description = `ê¸‰ì—¬?°ì • ì¢…ë£Œ??${seLabel} ê¸°ì? ?”ì—¬ ê·¼ë¬´`;
    } else if(pStartInPeriod){
      mode = 'partial_start';
      description = `ê¸‰ì—¬?°ì • ?œì‘??${ssLabel} ?´í›„ ê·¼ë¬´`;
    } else {
      mode = 'full';
      description = `ë§Œê·¼ ê¸°ì? (ê¸‰ì—¬?°ì •ê¸°ê°„ ${_ppLabel})`;
    }
  } else {
    const csInPeriod = csDate && csDate >= ppStart && csDate <= ppEnd;
    const ceInPeriod = contract.contract_end && new Date(contract.contract_end) >= ppStart && new Date(contract.contract_end) <= ppEnd;
    if(csInPeriod || (actualWorkDays < fullMonthWorkDays)){
      const reason = csInPeriod ? `?…ì‚¬??${contract.contract_start} ?´í›„` : 'ê³„ì•½ ì¢…ë£Œ??ê¸°ì?';
      mode = 'partial_start';
      description = `${reason} ê·¼ë¬´ (ê¸‰ì—¬?°ì •ê¸°ê°„ ${_ppLabel})`;
    } else {
      mode = 'full';
      description = `ë§Œê·¼ ê¸°ì? (ê¸‰ì—¬?°ì •ê¸°ê°„ ${_ppLabel})`;
    }
  }

  const totalHours = actualWorkDays * hpd;
  return { workDays: actualWorkDays, totalHours, mode, description };
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _countWorkDays(startDate, endDate, daysPerWeek)
//   startDate ~ endDate (?¬í•¨) ?¬ì´???Œì •ê·¼ë¡œ?¼ìˆ˜ë¥?ì¹´ìš´??
//   daysPerWeek: 5 ????ê¸?/ 6 ??????/ ê·???????ê¸?ê¸°ë³¸
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _countWorkDays(startDate, endDate, daysPerWeek){
  const dpw = daysPerWeek || 5;
  // ì£?ë§ˆì?ë§??´ì¼ ?”ì¼ ì§‘í•©: 0=?? 6=??
  const offDays = dpw >= 6 ? new Set([0]) : new Set([0, 6]); // 5?¼ì œ: ? Â·ì¼ ?¬ê³ , 6?¼ì œ: ?¼ë§Œ ?¬ê³ 
  let count = 0;
  const cur = new Date(startDate);
  while(cur <= endDate){
    if(!offDays.has(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _applyPIDefaultWorkDays(forceOverwrite)
//   ?„ì¬ ? íƒ??ê³„ì•½Â·?°Â·ì›” ê¸°ì??¼ë¡œ ê·¼ë¡œ?¼ìˆ˜Â·ì´?ê·¼ë¡œ?œê°„???ë™ ?…ë ¥?œë‹¤.
// ?€?€ ê°€??ì§ì›(?€?œì/?±ê¸°?„ì›/?¹ìˆ˜ê´€ê³„ì¸) ?˜ë™ ?…ë ¥ ?„ë“œ ?„í™˜ ?€?€
function _setupManualFields(show){
  // ê¸‰ì—¬ ?°ì •ê¸°ê°„
  const _ppDisp = document.getElementById('pi-row-pay-period-disp');
  const _ppInput = document.getElementById('pi-row-pay-period-input');
  if(_ppDisp) _ppDisp.style.display = show ? 'none' : '';
  if(_ppInput) _ppInput.style.display = show ? '' : 'none';
  // ?µìƒ?œê¸‰
  const _hwDisp = document.getElementById('pi-row-hourly-wage-disp');
  const _hwInput = document.getElementById('pi-row-hourly-wage-input');
  if(_hwDisp) _hwDisp.style.display = show ? 'none' : '';
  if(_hwInput) _hwInput.style.display = show ? '' : 'none';
  // ê³¼ì„¸ ê¸°ì? ë¶€?‘ê?ì¡???
  const _tdDisp = document.getElementById('pi-row-tax-dependents-disp');
  const _tdInput = document.getElementById('pi-row-tax-dependents-input');
  if(_tdDisp) _tdDisp.style.display = show ? 'none' : '';
  if(_tdInput) _tdInput.style.display = show ? '' : 'none';
}

// ?€?€ ê³¼ì„¸ ê¸°ì? ë¶€?‘ê?ì¡???ë³€ê²?ì½œë°± ?€?€
function _onPITaxDependentsChange(){
  calcPI(); // ?Œë“???¬ê³„???¸ë¦¬ê±?
}

//   forceOverwrite=true  ??ê¸°ì¡´ ê°’ê³¼ ë¬´ê??˜ê²Œ ??ƒ ??–´?€ (ì§ì› ? íƒÂ·?°ì›” ë³€ê²???
//   forceOverwrite=false ???´ë? ê°’ì´ ?ˆìœ¼ë©?readonlyÂ·ë°°ì?ë§??¬ì ??(?˜ì • ëª¨ë“œ ë³µì› ??
//   ?¼ìš©ì§ì? ? ì§œë³??˜ë™ ?…ë ¥?´ë?ë¡???ƒ ?¤í‚µ.
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _applyPIDefaultWorkDays(forceOverwrite){
  if(!piContract) return;
  const cType = piContract.contract_type || '';
  // ?¼ìš©ì§ì? ?ë™ ê³„ì‚° ?œì™¸ (? ì§œë³??…ë ¥)
  if(cType ===CONTRACT_TYPE.DAILY) return;

  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;
  if(!yr || !mo) return;

  const wdEl = document.getElementById('pi-work-days');
  const thEl = document.getElementById('pi-total-hours');
  if(!wdEl || !thEl) return;

  // ?€?€ max ?ì„±: ê¸‰ì—¬?°ì •ê¸°ê°„ ?Œì •ê·¼ë¡œ?¼ìˆ˜ ê¸°ì? ?€?€
  let _maxWorkDays = 31;
  if(piContract){
    const _res = _calcPIDefaultWorkDays(piContract, yr, mo);
    if(_res && _res.workDays > 0) _maxWorkDays = _res.workDays;
  }
  wdEl.max = _maxWorkDays;

  // ?˜ì • ëª¨ë“œ ë³µì›(forceOverwrite=false): ?´ë? ê°??ˆìœ¼ë©?ë°°ì?ë§??…ë°?´íŠ¸ ??ì¢…ë£Œ
  if(!forceOverwrite){
    const existWd = parseFloat(wdEl.value) || 0;
    const existTh = parseFloat(thEl.value) || 0;
    if(existWd > 0 || existTh > 0){
      // ê¸°ì¡´ ê°?ê¸°ì??¼ë¡œ ë°°ì? ?ìŠ¤?¸ë§Œ ?œì‹œ
      const yr2 = parseInt(document.getElementById('pi-year')?.value) || 0;
      const mo2 = parseInt(document.getElementById('pi-month')?.value) || 0;
      const res2 = _calcPIDefaultWorkDays(piContract, yr2, mo2);
      if(res2.workDays > 0) _updatePIWorkDaysAutoLabel(res2);
      return;
    }
  }

  const result = _calcPIDefaultWorkDays(piContract, yr, mo);
  if(result.workDays <= 0) return;

  // ê²°ê·¼??ì°¨ê°
  const absentDays = (typeof _getPIAbsentDays === 'function') ? _getPIAbsentDays() : 0;
  const finalWorkDays = Math.max(0, result.workDays - absentDays);

  wdEl.value = finalWorkDays;
  // ì´?ê·¼ë¡œ?œê°„?€ ?ë™ê³„ì‚° ?¨ìˆ˜ë¡??¸íŒ… (thEl ì§ì ‘ ?¸íŒ… ?œê±°)
  if(typeof calcPITotalHours === 'function') calcPITotalHours();
  else thEl.value = result.totalHours; // fallback

  // ?ë™ ?…ë ¥ ?ˆë‚´ ë°°ì? ?…ë°?´íŠ¸
  _updatePIWorkDaysAutoLabel(result);

  // calcPI ?¬íŠ¸ë¦¬ê±°
  if(typeof calcPIWorkActual === 'function') calcPIWorkActual();
  else if(typeof calcPI === 'function') calcPI();
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _getPIFullMonthWorkDays()
//   ?„ì¬ ? íƒ??ê³„ì•½Â·?°Â·ì›” ê¸°ì??¼ë¡œ ê·¼ë¡œ?¼ìˆ˜ ?…ë ¥ ?í•œ??ë°˜í™˜?œë‹¤.
//
//   ??ê³„ì•½ì§?ê³„ì•½ì§?ê³„ì•½ì§??˜ìŠµ)?´ê³  ?´ë‹¹ ?”ì— ê¸‰ì—¬?°ì • ì¢…ë£Œ??or ê³„ì•½ ë§Œë£Œ????
//     ì¡´ì¬?˜ëŠ” ê²½ìš° ??ì¢…ë£Œ?¼ê¹Œì§€???Œì •ê·¼ë¡œ?¼ìˆ˜(partial)ë¥??í•œ?¼ë¡œ ?¬ìš©.
//
//   ???•ê·œì§??˜ìŠµ / ê³„ì•½ì§??˜ìŠµ?´ê³  ?´ë‹¹ ?”ì— ?˜ìŠµ ì¢…ë£Œ?¼ì´ ì¡´ì¬?˜ëŠ” ê²½ìš°
//     ???˜ìŠµ ì¢…ë£Œ?¼ê¹Œì§€???Œì •ê·¼ë¡œ?¼ìˆ˜ë¥??í•œ?¼ë¡œ ?¬ìš©.
//     (ì¼€?´ìŠ¤??split: ?˜ìŠµ+?•ì • ?©ì‚° ?í•œ = ??ë§Œê·¼?¼ìˆ˜, ê°??ŒíŠ¸??ë³„ë„ ê²€ì¦?
//
//   ??ê·????•ê·œì§?ë§Œê·¼Â·?´ë‹¬ ?„ì²´) ????ë§Œê·¼ ?Œì •ê·¼ë¡œ?¼ìˆ˜ ë°˜í™˜
//     Â· work_days_per_month ê³„ì•½ ?„ë“œ ?°ì„ 
//     Â· ?†ìœ¼ë©??´ë‹¹ ???Œì •ê·¼ë¡œ????ê¸?or ???? ì¹´ìš´??
//
//   - piContract ?†ìœ¼ë©?0 ë°˜í™˜
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _getPIFullMonthWorkDays(){
  if(!piContract) return 0;
  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;
  if(!yr || !mo) return 0;

  const cType      = piContract.contract_type || '';
  const isFixed    = cType === CONTRACT_TYPE.FIXED || cType === CONTRACT_TYPE.FIXED_PROBATION;
  const isProb     = cType ===CONTRACT_TYPE.REGULAR_PROBATION || cType ===CONTRACT_TYPE.FIXED_PROBATION;
  const dpw        = parseFloat(piContract.work_days_per_week) || 5;

  // ?€?€ ê¸‰ì—¬?°ì •ê¸°ê°„ ê¸°ì??¼ë¡œ ë§Œê·¼?¼ìˆ˜ ê³„ì‚° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const _coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const _co   = allCompanies.find(c => c.id === _coId);
  const _ppMo = _co?.pay_period_month || PAY_PERIOD_MONTH.CURRENT_MONTH;
  const _ppDay = parseInt(_co?.pay_period_day) || 1;
  let ppStart, ppEnd;
  if(_ppMo === PAY_PERIOD_MONTH.PREV_MONTH || _ppMo === PAY_PERIOD_MONTH.PREV_MONTH){
    ppStart = new Date(yr, mo - 2, _ppDay);
    ppEnd   = new Date(yr, mo - 1, _ppDay);
    ppEnd.setDate(ppEnd.getDate() - 1);
  } else {
    ppStart = new Date(yr, mo - 1, _ppDay);
    ppEnd   = new Date(yr, mo, _ppDay);
    ppEnd.setDate(ppEnd.getDate() - 1);
  }

  // ë§Œê·¼ ?Œì •ê·¼ë¡œ?¼ìˆ˜ (ê¸‰ì—¬?°ì •ê¸°ê°„ ê¸°ì?)
  const fullMonthDays = _countWorkDays(ppStart, ppEnd, dpw);

  // ?€?€ ?˜ìŠµ: ?˜ìŠµ ì¢…ë£Œ?¼ì´ ê¸‰ì—¬?°ì •ê¸°ê°„ ?´ë©´ ?”ì—¬?¼ìˆ˜ë¡??í•œ ?œí•œ
  if(isProb){
    const probEndRaw = _calcProbationEndDate(piContract);
    if(probEndRaw){
      const probEndDate = new Date(probEndRaw);
      if(probEndDate >= ppStart && probEndDate < ppEnd){
        // ê¸‰ì—¬?°ì •ê¸°ê°„ ?œì‘ ~ ?˜ìŠµì¢…ë£Œ???Œì •ê·¼ë¡œ?¼ìˆ˜
        const remainingDays = _countWorkDays(ppStart, probEndDate, dpw);
        return Math.min(remainingDays, fullMonthDays);
      }
      if(probEndDate < ppStart) return 0; // ?˜ìŠµ ë§Œë£Œ ???´í›„
    }
  }

  // ?€?€ ê³„ì•½ì§? ê¸‰ì—¬?°ì • ì¢…ë£Œ??or ê³„ì•½ ë§Œë£Œ????ê¸‰ì—¬?°ì •ê¸°ê°„ ?´ë©´ ?í•œ ?œí•œ
  if(isFixed){
    const seRaw = piContract.salary_end_date || piContract.contract_end;
    if(seRaw){
      const endDate = new Date(seRaw);
      if(endDate >= ppStart && endDate <= ppEnd){
        const remainingDays = _countWorkDays(ppStart, endDate, dpw);
        return Math.min(remainingDays, fullMonthDays);
      }
      if(endDate < ppStart) return 0;
    }
  }

  return fullMonthDays;
}

// ?ë™ ?…ë ¥ ?ˆë‚´ ë°°ì? ?ìŠ¤???…ë°?´íŠ¸
function _updatePIWorkDaysAutoLabel(result){
  const el = document.getElementById('pi-workdays-auto-label');
  if(!el) return;
  if(!result || result.workDays <= 0){
    el.style.display = 'none';
    return;
  }
  const modeLabel = {
    full:          'ë§Œê·¼ ê¸°ì?',
    partial_end:   'ê¸‰ì—¬?°ì • ì¢…ë£Œ??ê¸°ì?',
    partial_start: 'ê¸‰ì—¬?°ì • ?œì‘??ê¸°ì?',
    partial_both:  'ê¸‰ì—¬?°ì • ?œì‘+ì¢…ë£Œ ê¸°ì?',
  }[result.mode] || '';
  el.textContent  = `???ë™?…ë ¥ (${modeLabel} Â· ${result.workDays}?¼Â?{result.totalHours}h) ??ì§ì ‘ ?˜ì • ê°€??;
  el.style.display = '';
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _applyPIPayDate(forceOverwrite)
//   ê³ ê°??pay_day Ã— ? íƒ???°ì›” ê¸°ì??¼ë¡œ ì§€ê¸‰ì¼???ë™ ê³„ì‚°?˜ì—¬ ?…ë ¥?œë‹¤.
//
//   ??ì§€ê¸‰ì¼ ê³„ì‚° ê·œì¹™
//     - pay_day(?«ì or "25?? ?•íƒœ) ?Œì‹± ??parseInt()
//     - ?´ë‹¹ ?”ì˜ pay_day ?¼ìë¡?? ì§œ ë¬¸ì??êµ¬ì„± (YYYY-MM-DD)
//     - pay_dayê°€ ?´ë‹¹ ??ë§ì¼ ì´ˆê³¼?´ë©´ ë§ì¼(?? 30?¼â†’2??8??
//
//   ??readonly ?œì–´
//     - ?¼ìš©ì§? readonly ?´ì œ, ë°°ì? ?¨ê?
//     - ?•ê·œì§?ê³„ì•½ì§?ëª¨ë‘: readonly ?ìš©, ë°°ì? "ê³ ê°???¤ì • ?ë™?…ë ¥" ?œì‹œ
//     - pay_day ë¯¸ì„¤??ê³ ê°?? readonly ?´ì œ, ë°°ì? "ì§€ê¸‰ì¼ ë¯¸ì„¤?? ê²½ê³ 
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ê²°ê·¼??ê´€ë¦?
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _getPIAbsentDays(){
  const hidden = document.getElementById('pi-absent-dates');
  return hidden && hidden.value ? hidden.value.split(',').length : 0;
}

function _applyPIPayDate(forceOverwrite){
  const pdEl    = document.getElementById('pi-paydate');
  const badgeEl = document.getElementById('pi-paydate-badge');
  if(!pdEl) return;

  // ëª¨ë“  ê³„ì•½ ? í˜•?ì„œ ?˜ì • ê°€??(readonly ?†ìŒ)
  pdEl.readOnly = false;
  pdEl.classList.remove('pi-input-locked');

  // ?€?€ ê¸‰ì—¬???°ì„ ?œìœ„: ê·¼ë¡œê³„ì•½??pay_day > ê³ ê°??pay_day ?€?€?€?€?€?€?€?€?€?€?€?€
  const coId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const co   = allCompanies.find(c => c.id === coId);
  // ê·¼ë¡œê³„ì•½?œì— ê°œë³„ ê¸‰ì—¬?¼ì´ ?¤ì •??ê²½ìš° ?°ì„  ?¬ìš©
  const contractPayDay = piContract?.pay_day;
  const rawPayDay = contractPayDay ? String(contractPayDay) : (co?.pay_day);
  const payDayNum = parseInt(String(rawPayDay || '').replace(/[^0-9]/g, '')) || 0;
  const isFromContract = !!(contractPayDay && payDayNum);

  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;

  if(!payDayNum || !yr || !mo){
    // pay_day ë¯¸ì„¤?? ê²½ê³  ë°°ì? ?œì‹œ ??ì§ì ‘ ?…ë ¥
    if(badgeEl){
      badgeEl.textContent  = '??ê³ ê°??ê¸‰ì—¬ì§€ê¸‰ì¼ ë¯¸ì„¤????ì§ì ‘ ?…ë ¥';
      badgeEl.className = 'pi-paydate-badge-warn';
      badgeEl.style.display = '';
    }
    return;
  }

  // ì§€ê¸‰ì¼ ? ì§œ êµ¬ì„±: pay_day?¼ì´ ?´ë‹¹ ??ë§ì¼ ì´ˆê³¼?´ë©´ ë§ì¼ë¡?clamp
  const lastDayOfMonth = new Date(yr, mo, 0).getDate();
  const day = Math.min(payDayNum, lastDayOfMonth);
  const moStr  = String(mo).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const payDateStr = `${yr}-${moStr}-${dayStr}`;

  // ê¸°ì¡´ ê°??ˆê³  ê°•ì œ ??–´?°ê¸° ?„ë‹ˆë©?ê°?? ì?
  if(!forceOverwrite && pdEl.value && pdEl.value !== '') {
    // ê°?? ì?, ë°°ì?ë§?ê°±ì‹ 
  } else {
    pdEl.value = payDateStr;
  }

  if(badgeEl){
    badgeEl.textContent   = isFromContract ? `ê·¼ë¡œê³„ì•½???¤ì •: ë§¤ì›”${day}?? : `ê³ ê°???¤ì •: ë§¤ì›”${day}??;
    badgeEl.className = isFromContract ? 'pi-paydate-badge-contract' : 'pi-paydate-badge-company';
    badgeEl.style.display = '';
  }
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _calcProbationEndDate(contract)
//   ê³„ì•½ ê°ì²´?ì„œ ?˜ìŠµ ì¢…ë£Œ??YYYY-MM-DD)??ë°˜í™˜?œë‹¤.
//   - probation_months > 0: ê³„ì•½?œì‘??+ probation_months ê°œì›” - 1??
//   - probation_months = 0 or ?†ìŒ: ê³„ì•½ ?„ì²´ ê¸°ê°„???˜ìŠµ ??contract_end ë°˜í™˜
//   - ?˜ìŠµ ê³„ì•½???„ë‹ˆë©?null ë°˜í™˜
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _calcProbationEndDate(ct){
  if(!ct) return null;
  const isProb = (ct.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION || ct.contract_type ===CONTRACT_TYPE.FIXED_PROBATION);
  if(!isProb) return null;
  const months = ct.probation_months ? Number(ct.probation_months) : 0;
  if(months > 0){
    const d = new Date(ct.contract_start);
    d.setMonth(d.getMonth() + months);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0,10);
  }
  // probation_months ë¯¸ì…????ê³„ì•½ ?„ì²´ ê¸°ê°„???˜ìŠµ
  return ct.contract_end || null; // null?´ë©´ ë¬´ê¸°???˜ìŠµ
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _checkPIProbationOverrun()
//   ?„ì¬ ? íƒ??ê¸‰ì—¬ ?°ì›”??piContract ???˜ìŠµ ë§Œë£Œ?¼ì„ ì´ˆê³¼?˜ëŠ”ì§€ ê²€?¬í•œ??
//
//   ???´ë‹¹ ???„ì²´(1??ë§ì¼)ê°€ ?˜ìŠµ ê¸°ê°„ ?´í›„ ??case1-panel ?œì‹œ, ?€??ì°¨ë‹¨ ??true ë°˜í™˜
//   ???´ë‹¹ ??ì¤‘ê°„???˜ìŠµ ë§Œë£Œ?¼ì´ ê»´ìˆ????case2-panel ?œì‹œ, ë¶„ë¦¬ UI ?œì„± ??'split' ë°˜í™˜
//   ???˜ìŠµ ê¸°ê°„ ????ë°°ë„ˆ ?„ì²´ ?¨ê? ??false ë°˜í™˜
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _checkPIProbationOverrun(){
  const banner   = document.getElementById('pi-prob-overrun-banner');
  const panel1   = document.getElementById('pi-prob-case1-panel');
  const panel2   = document.getElementById('pi-prob-case2-panel');
  const detail   = document.getElementById('pi-prob-overrun-detail');
  if(!banner) return false;

  // ?¨ë„ ?¨ê? ?¬í¼
  const hideAll = () => {
    banner.style.display = 'none';
    if(panel1) panel1.style.display = 'none';
    if(panel2) panel2.style.display = 'none';
  };

  // ?˜ìŠµ ê³„ì•½???„ë‹ˆë©?ë°°ë„ˆ ?„ì²´ ?¨ê?
  const isProb = piContract &&
    (piContract.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION || piContract.contract_type ===CONTRACT_TYPE.FIXED_PROBATION);
  if(!isProb){ hideAll(); return false; }

  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);
  if(!yr || !mo){ hideAll(); return false; }

  // ?´ë‹¹ ?”ì˜ ?œì‘??Â· ë§ì¼
  const monthStart = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const lastDay    = new Date(yr, mo, 0).getDate();
  const monthEnd   = `${yr}-${String(mo).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

  const probEnd = _calcProbationEndDate(piContract);
  const fmt = d => d ? `${d.slice(0,4)}??${d.slice(5,7)}??${d.slice(8,10)}?? : '-';

  if(!probEnd){
    hideAll();
    return false;
  }

  // ?€?€ ???´ë‹¹ ???„ì²´ê°€ ?˜ìŠµ ì¢…ë£Œ???´í›„ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  if(monthStart > probEnd){
    // case2 ?¨ê¸°ê³?case1 ?œì‹œ
    if(panel2) panel2.style.display = 'none';
    if(panel1) panel1.style.display = '';
    if(detail){
      detail.innerHTML =
        `<div>Â· ?˜ìŠµ ì¢…ë£Œ?? <strong style="color:#dc2626;">${fmt(probEnd)}</strong></div>` +
        `<div>Â· ? íƒ??ê¸‰ì—¬ ?? <strong>${yr}??${mo}??/strong> ???˜ìŠµ ê¸°ê°„???´ë? ë§Œë£Œ???¬ì…?ˆë‹¤.</div>` +
        `<div style="margin-top:4px;color:#b91c1c;font-weight:600;">
          ???¬ì˜ ê¸‰ì—¬??<u>ì±„ìš©?•ì • ê·¼ë¡œê³„ì•½??ê¸°ì?</u>?¼ë¡œ ì²˜ë¦¬?´ì•¼ ?©ë‹ˆ??<br>
          ?„ë˜ ë²„íŠ¼?¼ë¡œ ì±„ìš©?•ì • ê³„ì•½?œë? ?ë™ ?ì„±?˜ê³  ê¸‰ì—¬ë¥??€?¥í•˜?¸ìš”.
         </div>`;
    }
    banner.style.display = '';
    return true; // ?€??ì°¨ë‹¨
  }

  // ?€?€ ???´ë‹¹ ??ì¤‘ê°„???˜ìŠµ ë§Œë£Œ?¼ì´ ê»´ìˆ???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  if(probEnd >= monthStart && probEnd < monthEnd){
    // case1 ?¨ê¸°ê³?case2 ?œì‹œ
    if(panel1) panel1.style.display = 'none';
    if(panel2) panel2.style.display = '';

    // ì±„ìš©?•ì • ê¸°ê°„ ?œì‘??ê³„ì‚°
    const probEndDateObj = new Date(probEnd);
    const postStartDateObj = new Date(probEndDateObj);
    postStartDateObj.setDate(postStartDateObj.getDate() + 1);
    const postStart = postStartDateObj.toISOString().slice(0,10);

    // ?•ì • ??ê³ ìš©?•íƒœ
    const confirmedType = piContract.contract_type ===CONTRACT_TYPE.REGULAR_PROBATION ? CONTRACT_TYPE.REGULAR : CONTRACT_TYPE.FIXED;

    // split-info ?Œë”ë§?
    const splitInfo = document.getElementById('pi-prob-split-info');
    if(splitInfo){
      splitInfo.innerHTML =
        `<div>Â· ?˜ìŠµ ì¢…ë£Œ?? <strong style="color:#d97706;">${fmt(probEnd)}</strong></div>` +
        `<div>Â· ê¸‰ì—¬ ?? <strong>${yr}??${mo}??/strong> (${fmt(monthStart)} ~ ${fmt(monthEnd)})</div>` +
        `<div style="margin-top:4px;">
          ???¬ì? ?˜ìŠµ ê¸°ê°„(<strong>${fmt(monthStart)} ~ ${fmt(probEnd)}</strong>)ê³?
          ì±„ìš©?•ì • ê¸°ê°„(<strong>${fmt(postStart)} ~ ${fmt(monthEnd)}</strong>)???¼ì¬?©ë‹ˆ??<br>
          ?„ë˜????ê¸°ê°„??ê·¼ë¡œ?¼ìˆ˜Â·?œê°„??ê°ê° ?…ë ¥?˜ê³  <strong>[ë¶„ë¦¬ ?€??</strong>???„ë¥´?¸ìš”.<br>
          <span style="color:#059669;font-size:11px;">?€????<strong>${confirmedType}</strong> ê³„ì•½?œê? ?ë™ ?ì„±?˜ê³  ê³ ìš©?•íƒœê°€ ë³€ê²½ë©?ˆë‹¤.</span>
         </div>`;
    }

    // ? ì§œ ë²”ìœ„ ?ˆì´ë¸??…ë°?´íŠ¸
    const probDatesEl = document.getElementById('pi-prob-split-prob-dates');
    if(probDatesEl) probDatesEl.textContent = `(${monthStart.slice(5,7)}/${monthStart.slice(8,10)} ~ ${probEnd.slice(5,7)}/${probEnd.slice(8,10)})`;
    const postDatesEl = document.getElementById('pi-prob-split-post-dates');
    if(postDatesEl) postDatesEl.textContent = `(${postStart.slice(5,7)}/${postStart.slice(8,10)} ~ ${monthEnd.slice(5,7)}/${monthEnd.slice(8,10)})`;

    // ë¶„ë¦¬ ?…ë ¥ ?„ë“œ ì´ˆê¸°??(ì²˜ìŒ ?œì‹œ ??
    const wdProbEl  = document.getElementById('pi-prob-wd-prob');
    const whProbEl  = document.getElementById('pi-prob-wh-prob');
    const wdPostEl  = document.getElementById('pi-prob-wd-post');
    const whPostEl  = document.getElementById('pi-prob-wh-post');
    if(wdProbEl && wdProbEl.value === '') wdProbEl.value = '0';
    if(whProbEl && whProbEl.value === '') whProbEl.value = '0';
    if(wdPostEl && wdPostEl.value === '') wdPostEl.value = '0';
    if(whPostEl && whPostEl.value === '') whPostEl.value = '0';

    banner.style.display = '';
    _onProbSplitInputChange(); // ì´ˆê¸° ê²€ì¦??¤í–‰
    return 'split'; // ë¶„ë¦¬ UI ?œì„± ???¼ë°˜ ?€??ì°¨ë‹¨?´ì?ë§?ë¶„ë¦¬ ?€??ë²„íŠ¼?¼ë¡œ ì²˜ë¦¬
  }

  // ?€?€ ???´ë‹¹ ???„ì²´ê°€ ?˜ìŠµ ê¸°ê°„ ?????•ìƒ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  hideAll();
  return false;
}

// ?€?€ ????ë³€ê²????°ì •ê¸°ì? ì¦‰ì‹œ ì²´í¬ ?€?€
let _prevPIYear = null;
function onPIYearMonthChange(){
  // ?°ë„ ë³€ê²??????µì…˜ ê°±ì‹  (?µì›” ?œí•œ)
  const yrEl = document.getElementById('pi-year');
  const curYr = yrEl ? parseInt(yrEl.value) : null;
  if(curYr && curYr !== _prevPIYear){ _prevPIYear = curYr; initPIMonths(); }
  // ê¸‰ì—¬ ?…ë ¥ ?¹ì…˜??ë³´ì´???íƒœ(ê³ ê°??? íƒ???íƒœ)???Œë§Œ ì²´í¬
  const inputSection = document.getElementById('pi-input-section');
  if(!inputSection || inputSection.style.display === 'none') return;
  const yr = parseInt(document.getElementById('pi-year')?.value);
  const mo = parseInt(document.getElementById('pi-month')?.value);
  if(!yr || !mo) return;

  // ?€?€ ê¸‰ì—¬ ?…ë ¥ ?¼ì´ ?´ë ¤?ˆì? ?Šìœ¼ë©?(?€?ì ëª©ë¡ ?¨ê³„) ì²´í¬ ?¤í‚µ ?€?€
  const formSec = document.getElementById('pi-form-section');
  if(!formSec || formSec.style.display === 'none') return;

  // ?€?€ ?˜ìŠµ ë§Œë£Œ??ì´ˆê³¼ ê²€???€?€
  const probOverrun = _checkPIProbationOverrun();
  if(probOverrun === true){
    // ì¼€?´ìŠ¤?? ???„ì²´ ì´ˆê³¼ ???€??ë²„íŠ¼ ?„ì „ ì°¨ë‹¨
    _setPIInputLocked(true);
    return;
  }
  if(probOverrun === 'split'){
    // ì¼€?´ìŠ¤?? ??ì¤‘ê°„ ë¶„ë¦¬ ???¼ë°˜ ?€??ë²„íŠ¼ ì°¨ë‹¨, ë¶„ë¦¬ ?€??ë²„íŠ¼?€ ?œì„±(ê²€ì¦??µê³¼ ??
    _setPIInputLocked(true);
    return; // ?°ì •ê¸°ì? ì²´í¬ ë¶ˆí•„??(ë¶„ë¦¬ ?€?¥ìœ¼ë¡œë§Œ ì²˜ë¦¬)
  }

  const stdCheck = _checkPIStandardsReady(yr, mo, currentGlobalCompanyId);
  if(!stdCheck.ok){
    _showPIStandardsWarn(yr, mo, stdCheck.missing);
    // ?…ë ¥ ??? ê¸ˆ (?€??ë²„íŠ¼ ë¹„í™œ??
    _setPIInputLocked(true);
  } else {
    _setPIInputLocked(false);
  }

  // ?€?€ ?°ì›” ë³€ê²???ê·¼ë¡œ?¼ìˆ˜Â·ì´?ê·¼ë¡œ?œê°„ ?¬ê³„??(ê°•ì œ ??–´?°ê¸°) ?€?€
  {
    const wdEl = document.getElementById('pi-work-days');
    const thEl = document.getElementById('pi-total-hours');
    // max ?ì„±: piContract ? ë¬´?€ ë¬´ê??˜ê²Œ ??ƒ ?¹ì›” ?¬ë ¥ ?¼ìˆ˜ë¡?ê°±ì‹ 
    if(wdEl && yr && mo) wdEl.max = new Date(yr, mo, 0).getDate();
    if(wdEl) wdEl.value = 0;
    if(thEl) thEl.value = 0;
    const autoLbl = document.getElementById('pi-workdays-auto-label');
    if(autoLbl) autoLbl.style.display = 'none';
    _applyPIDefaultWorkDays(true);
  }

  // ?€?€ ?°ì›” ë³€ê²????´ë²ˆ???¬ìš©?°ì°¨: ê´€ë¦¬ë??¥ì— ?´ë‹¹ ???°ì´???ˆìœ¼ë©??°ì„  ?ìš© + max ?¤ì • ?€?€
  {
    const _alYmEl = document.getElementById('pi-annual-used');
    const _empIdYm = document.getElementById('pi-employee')?.value || '';
    if(_alYmEl && _empIdYm && yr && mo){
      // max: ?´ë‹¹ ??ë²•ì •ê³µíœ´??ì£¼ë§ ?œì™¸ ?Œì •ê·¼ë¡œ?¼ìˆ˜
      if(typeof calcMonthWorkDays === 'function')
        _alYmEl.max = calcMonthWorkDays(yr, mo);
      const _alLedgerYm = (allLeaveLedgers || []).find(r =>
        r.employee_id === _empIdYm && Number(r.year) === yr
      );
      let _alValYm = 0;
      if(_alLedgerYm){
        let _alMdYm = [];
        try { _alMdYm = JSON.parse(_alLedgerYm.month_data || '[]'); } catch(e){}
        const _alEntryYm = _alMdYm.find(d => Number(d.month) === mo);
        if(_alEntryYm) _alValYm = parseFloat(_alEntryYm.days) || 0;
      }
      _alYmEl.value = _alValYm;
      calcAnnualLeaveTable();
    }
  }

  // ?€?€ ?°ì›” ë³€ê²???ì§€ê¸‰ì¼ ?¬ê³„???€?€
  _applyPIPayDate(true);

  // ?€?€ ?°ì›” ë³€ê²??œì—???„ì‹œ?€??ë°°ë„ˆ ê°±ì‹  ?€?€
  const _empId2 = document.getElementById('pi-employee')?.value;
  if(_empId2){
    piDraftId = null; // ?°ì›” ë³€ê²???ì´ˆê¸°??
    _checkAndShowPIDraftBanner(_empId2, yr, mo);
  }
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _onProbSplitInputChange()
//   ì¼€?´ìŠ¤??ë¶„ë¦¬ ?…ë ¥(?˜ìŠµ ê·¼ë¡œ?¼ìˆ˜ / ì±„ìš©?•ì • ê·¼ë¡œ?¼ìˆ˜)??ë³€ê²½ë  ?Œë§ˆ??
//   ??ê°??ŒíŠ¸???Œì •ê·¼ë¡œ?¼ìˆ˜ ?í•œ ?´ë¨??(ì´ˆê³¼ ???ë™ êµì • + ê²½ê³ )
//   ???©ê³„ë¥??„ì¬ ?…ë ¥??pi-work-days Â· pi-total-hours ?€ ë¹„êµ
//   ??ë¶„ë¦¬ ?€??ë²„íŠ¼ ?œì„±/ë¹„í™œ?±ì„ ?œì–´?œë‹¤.
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _onProbSplitInputChange(){
  const hpd = parseFloat(piContract?.work_hours_per_day) || 8;
  const dpw = parseFloat(piContract?.work_days_per_week) || 5;

  const yr = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const mo = parseInt(document.getElementById('pi-month')?.value) || 0;
  const monthStart = yr && mo ? new Date(yr, mo - 1, 1) : null;
  const monthEnd   = yr && mo ? new Date(yr, mo, 0)     : null;

  // ?€?€ ê°??ŒíŠ¸ë³??Œì •ê·¼ë¡œ?¼ìˆ˜ ?í•œ ê³„ì‚° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  // ?˜ìŠµ ?ŒíŠ¸ ?í•œ: ?”ì‹œ??~ ?˜ìŠµ ì¢…ë£Œ??
  // ?•ì • ?ŒíŠ¸ ?í•œ: ?˜ìŠµ ì¢…ë£Œ ?¤ìŒ??~ ?”ë§
  let maxProbDays = Infinity;
  let maxPostDays = Infinity;

  if(piContract && monthStart && monthEnd){
    const probEndRaw = _calcProbationEndDate(piContract);
    if(probEndRaw){
      const probEndDate = new Date(probEndRaw);
      // ?˜ìŠµ ?ŒíŠ¸ ?í•œ
      if(probEndDate >= monthStart){
        const cap = _countWorkDays(monthStart, probEndDate < monthEnd ? probEndDate : monthEnd, dpw);
        maxProbDays = Math.round(cap);
      }
      // ?•ì • ?ŒíŠ¸ ?í•œ: ?˜ìŠµ ì¢…ë£Œ???¤ìŒ? ë????”ë§ê¹Œì?
      const postStartDate = new Date(probEndDate);
      postStartDate.setDate(postStartDate.getDate() + 1);
      if(postStartDate <= monthEnd){
        const cap = _countWorkDays(postStartDate, monthEnd, dpw);
        maxPostDays = Math.round(cap);
      } else {
        maxPostDays = 0; // ?˜ìŠµ ì¢…ë£Œ?¼ì´ ?”ë§?´ë©´ ?•ì • ?ŒíŠ¸ ?†ìŒ
      }
    }
  }

  // ?€?€ ?ŒíŠ¸ë³??´ë¨???ìš© ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const wdProbEl = document.getElementById('pi-prob-wd-prob');
  const whProbEl = document.getElementById('pi-prob-wh-prob');
  const wdPostEl = document.getElementById('pi-prob-wd-post');
  const whPostEl = document.getElementById('pi-prob-wh-post');

  // max ?ì„±: ?¹ì›” ?¬ë ¥ ?¼ìˆ˜(ë§ì¼)ë¡??™ì  ?¤ì •
  const _calDaysForSplit = (yr && mo) ? new Date(yr, mo, 0).getDate() : 31;
  if(wdProbEl) wdProbEl.max = _calDaysForSplit;
  if(wdPostEl) wdPostEl.max = _calDaysForSplit;

  if(wdProbEl && maxProbDays !== Infinity){
    const v = parseFloat(wdProbEl.value) || 0;
    if(v > maxProbDays){
      wdProbEl.value = maxProbDays;
      if(whProbEl) whProbEl.value = maxProbDays * hpd;
      if(typeof toast === 'function')
        toast(`?˜ìŠµ ê¸°ê°„ ê·¼ë¡œ?¼ìˆ˜??${maxProbDays}?¼ì„ ì´ˆê³¼?????†ìŠµ?ˆë‹¤.`, 'warning');
    }
  }
  if(wdPostEl && maxPostDays !== Infinity){
    const v = parseFloat(wdPostEl.value) || 0;
    if(v > maxPostDays){
      wdPostEl.value = maxPostDays;
      if(whPostEl) whPostEl.value = maxPostDays * hpd;
      if(typeof toast === 'function')
        toast(`ì±„ìš©?•ì • ê¸°ê°„ ê·¼ë¡œ?¼ìˆ˜??${maxPostDays}?¼ì„ ì´ˆê³¼?????†ìŠµ?ˆë‹¤.`, 'warning');
    }
  }

  // ?€?€ ?´ë¨???ìš© ??ê°??¬ì¡°???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const wdProb  = parseFloat(wdProbEl?.value || 0) || 0;
  const whProb  = parseFloat(whProbEl?.value || 0) || 0;
  const wdPost  = parseFloat(wdPostEl?.value || 0) || 0;
  const whPost  = parseFloat(whPostEl?.value || 0) || 0;

  const totalWd = parseFloat(document.getElementById('pi-work-days')?.value || 0) || 0;
  const totalWh = parseFloat(document.getElementById('pi-total-hours')?.value || 0) || 0;

  const wdSum = wdProb + wdPost;
  const whSum = Math.round((whProb + whPost) * 10) / 10;

  const checkEl  = document.getElementById('pi-prob-split-total-check');
  const saveBtn  = document.getElementById('pi-prob-split-save-btn');

  let msgs = [];
  let valid = true;

  // ê·¼ë¡œ?¼ìˆ˜ ?©ê³„ ê²€ì¦?
  if(totalWd > 0){
    if(wdSum !== totalWd){
      msgs.push(`<span style="color:#dc2626;">??ê·¼ë¡œ?¼ìˆ˜ ?©ê³„ ${wdSum}?????„ì²´ ${totalWd}??/span>`);
      valid = false;
    } else {
      msgs.push(`<span style="color:#16a34a;">??ê·¼ë¡œ?¼ìˆ˜ ?©ê³„ ?¼ì¹˜ (${wdSum}??</span>`);
    }
  } else {
    if(wdProb <= 0 && wdPost <= 0){
      msgs.push('<span style="color:#9ca3af;">ê·¼ë¡œ?¼ìˆ˜ë¥??…ë ¥?˜ì„¸??</span>');
      valid = false;
    }
  }

  // ì´ê·¼ë¡œì‹œê°??©ê³„ ê²€ì¦?
  if(totalWh > 0){
    if(whSum !== totalWh){
      msgs.push(`<span style="color:#dc2626;">??ì´ê·¼ë¡œì‹œê°??©ê³„ ${whSum}h ???„ì²´ ${totalWh}h</span>`);
      valid = false;
    } else {
      msgs.push(`<span style="color:#16a34a;">??ì´ê·¼ë¡œì‹œê°??©ê³„ ?¼ì¹˜ (${whSum}h)</span>`);
    }
  }

  // ìµœì†Œ ?…ë ¥ ê²€ì¦?(????0?´ë©´ ????
  if(wdProb <= 0 && wdPost <= 0){
    valid = false;
  }

  if(checkEl) checkEl.innerHTML = msgs.join(' &nbsp;|&nbsp; ');

  if(saveBtn){
    saveBtn.disabled = !valid;
    saveBtn.style.opacity = valid ? '1' : '0.5';
    saveBtn.style.cursor  = valid ? 'pointer' : 'not-allowed';
  }
}

// ?€?€ ê¸‰ì—¬ ?…ë ¥ ??? ê¸ˆ/?´ì œ ?€?€
function _setPIInputLocked(locked){
  const saveBtn = document.querySelector('[onclick="savePI()"]') ||
                  document.querySelector('button[onclick*="savePI"]');
  if(saveBtn){
    saveBtn.disabled = locked;
    saveBtn.style.opacity = locked ? '0.4' : '';
    saveBtn.style.cursor  = locked ? 'not-allowed' : '';
  }
}

// ?€?€ ?°ì •ê¸°ì? ê²½ê³  ëª¨ë‹¬ ?œì‹œ ?€?€
function _showPIStandardsWarn(yr, mo, missing){
  const moStr = String(mo).padStart(2,'0');
  const msgEl = document.getElementById('pi-standards-warn-msg');
  if(msgEl){
    msgEl.innerHTML =
      `<span style="color:#d97706;">${yr}??${moStr}??/span> ê¸‰ì—¬ ?…ë ¥???„í•œ<br>` +
      `?„ë„ë³??°ì •ê¸°ì???ë¨¼ì? ?…ë°?´íŠ¸?˜ì…”???…ë ¥?????ˆìŠµ?ˆë‹¤.<br>` +
      `<span style="font-size:12px;color:#9ca3af;font-weight:400;">ë¯¸ë“±ë¡? ${missing.join(', ')}</span>`;
  }
  openModal('pi-standards-warn-modal');
}

// ?€?€ ?„ì¬ ê¸‰ì—¬ ì§€ê¸??„ì›” ê¸°ì? ?ìš© ?”ìœ¨ ì¡°íšŒ ?€?€
// ?ìš©ê¸°ê°„ ???”ìœ¨???†ìœ¼ë©?ìµœì‹  ?”ìœ¨??ì§€???ìš© (ê°±ì‹ ?˜ì? ?Šì•„??? íš¨)
function _getPIRates(){
  const yr = parseInt(document.getElementById('pi-year')?.value) || new Date().getFullYear();
  const mo = parseInt(document.getElementById('pi-month')?.value) || (new Date().getMonth()+1);
  const payDate = `${yr}-${String(mo).padStart(2,'0')}-01`;
  const find = (type) => {
    // ???ìš©ê¸°ê°„ ???•í™•??ë§¤ì¹­?˜ëŠ” ?”ìœ¨
    let r = _allInsuranceRates.find(r=>
      r.insurance_type===type && payDate >= r.period_start && payDate <= r.period_end
    );
    // ??ë§¤ì¹­ ?¤íŒ¨ ?? ?´ë‹¹ ? í˜•??ìµœì‹  ?”ìœ¨ (period_end ê¸°ì? ?´ë¦¼ì°¨ìˆœ)
    if(!r){
      const candidates = _allInsuranceRates.filter(r=>r.insurance_type===type);
      candidates.sort((a,b)=>(b.period_end||'').localeCompare(a.period_end||''));
      r = candidates[0] || null;
    }
    return r;
  };
  const pension  = find('national_pension');
  const health   = find('health');
  const ltcare   = find('long_term_care');
  const employ   = find('employment');
  return {
    pensionRate:  pension ? pension.rate/100  : 0.045,
    pensionCap:   pension ? (pension.cap_amount||6370000) : 6370000,
    healthRate:   health  ? health.rate/100   : 0.03545,
    ltcareRate:   ltcare  ? ltcare.rate/100   : 0.1295,  // ê±´ê°•ë³´í—˜ë£??€ë¹?
    employRate:   employ  ? employ.rate/100   : 0.009,
    // ?¼ë²¨??
    pensionLabel: pension  ? `${pension.rate}%, ?í•œ ${(pension.cap_amount||6370000).toLocaleString('ko-KR')}?? : '4.5%',
    healthLabel:  health   ? `${health.rate}%`  : '3.545%',
    ltcareLabel:  ltcare   ? `${ltcare.rate}%`  : '12.95%',
    employLabel:  employ   ? `${employ.rate}%`  : '0.9%',
  };
}

// ?€?€ 4?€ë³´í—˜ ?ìš© ê¸°ì????°ë¼ ê³µì œ ?ì—­ UI ?„í™˜ ?€?€
function _switchInsuranceModeUI(){
  const isFixed = _getPIInsuranceBasis() === INSURANCE_BASIS.FIXED_AMOUNT;
  const autoBlock  = document.getElementById('pi-ded-auto-block');
  const fixedBlock = document.getElementById('pi-ded-fixed-block');
  const badge      = document.getElementById('pi-ded-mode-badge');
  if(autoBlock)  autoBlock.style.display  = isFixed ? 'none' : '';
  if(fixedBlock) fixedBlock.style.display = isFixed ? '' : 'none';
  if(badge){
    badge.textContent = isFixed ? '?•ì •??ì§ì ‘?…ë ¥' : '?”ìœ¨ ?ë™ê³„ì‚°';
    badge.className = isFixed ? 'pi-ded-badge-fixed' : 'pi-ded-badge-rate';
  }
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _calcFixedHoursFromSchedule(scheduleJson, workHoursPerDay, hourlyWage)
//   ê·¼ë¬´?œê°„??schedule_json)ë¥?ê¸°ì??¼ë¡œ ê³ ì • ?°ì¥Â·?¼ê°„Â·?´ì¼ê·¼ë¡œ?œê°„ê³??˜ë‹¹??ê³„ì‚°.
//
//   ???°ì¥ê·¼ë¡œ: ???Œì •ê·¼ë¡œ?œê°„(workHoursPerDay) ì´ˆê³¼ë¶??????˜ì‚° (Ã—4.345ì£?
//   ???¼ê°„ê·¼ë¡œ: 22:00~06:00 ê·¼ë¬´?œê°„ ?????˜ì‚°
//   ???´ì¼ê·¼ë¡œ: ? Â·ì¼ ?œì„± ê·¼ë¬´?œê°„ ?????˜ì‚°
//
//   ë°˜í™˜: { otHours, nightHours, holHours, otPay, nightPay, holPay }
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _calcFixedHoursFromSchedule(scheduleJson, workHoursPerDay, hourlyWage){
  const STATUTORY_DAILY = 8 * 60; // ë²•ì • 1???Œì •ê·¼ë¡œ?œê°„ (480ë¶?
  const hw = parseFloat(hourlyWage) || 0;
  const result = { otHours:0, nightHours:0, holHours:0, otPay:0, nightPay:0, holPay:0 };

  if(!scheduleJson) return result;

  let sched;
  try { sched = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson; }
  catch(e){ return result; }
  if(!Array.isArray(sched) || !sched.length) return result;

  const WEEKS_PER_MONTH = 4.345; // 365/12/7

  sched.forEach(d => {
    if(!d.active) return;
    const isWeekend = d.day === 'sat' || d.day === 'sun';

    (d.shifts||[]).forEach(sh => {
      if(!sh.start || !sh.end) return;
      // 24???•ì‹ ?Œì‹± (HH:MM)
      const _parseTime = t => { const m = t.match(/^(\d{1,2}):(\d{2})$/); return m ? parseInt(m[1])*60+parseInt(m[2]) : null; };
      const startMin = _parseTime(sh.start);
      let   endMin   = _parseTime(sh.end);
      if(startMin === null || endMin === null) return;
      if(endMin <= startMin) endMin += 24 * 60; // ?µì¼ ì¢…ë£Œ

      // ?´ê²Œ?œê°„ ì°¨ê°
      let breakMin = 0;
      (sh.breaks||[]).forEach(b => {
        if(!b.s || !b.e) return;
        const bs = _parseTime(b.s), be = _parseTime(b.e);
        if(bs !== null && be !== null && be > bs) breakMin += be - bs;
        else if(bs !== null && be !== null && be <= bs) breakMin += (be + 24*60) - bs; // ?µì¼ ì¢…ë£Œ ?´ê²Œ
      });
      const workMin = endMin - startMin - breakMin;
      if(workMin <= 0) return;

      const standardMin = STATUTORY_DAILY;

      // ?€?€ ?°ì¥ê·¼ë¡œ: ?Œì •ê·¼ë¡œ?œê°„ ì´ˆê³¼ë¶??€?€
      const dailyOtMin = Math.max(0, workMin - standardMin);
      result.otHours += (dailyOtMin / 60) * WEEKS_PER_MONTH;

      // ?€?€ ?¼ê°„ê·¼ë¡œ: 22:00~06:00 êµì°¨ë¶??€?€
      const nightStart = 22 * 60;      // 1320 (22:00)
      const nightEnd   = 30 * 60;      // 1800 (?µì¼ 06:00)
      const s = startMin, e = endMin;  // endMin?€ ?´ë? ?µì¼ ë³´ì •??
      // shift ?œê°„?€?€ ?¼ê°„?œê°„?€(22:00~06:00)??êµì°¨ë¶?ê³„ì‚°
      const nightOverlap = Math.max(0, Math.min(e, nightEnd) - Math.max(s, nightStart))
                         + Math.max(0, Math.min(e, nightEnd + 24*60) - Math.max(s, nightStart + 24*60));
      const dailyNightMin = Math.max(0, nightOverlap);
      result.nightHours += (dailyNightMin / 60) * WEEKS_PER_MONTH;

      // ?€?€ ?´ì¼ê·¼ë¡œ: ì£¼ë§ ?œì„± ê·¼ë¬´ ?€?€
      if(isWeekend){
        result.holHours += (workMin / 60) * WEEKS_PER_MONTH;
      }
    });
  });

  // ?Œìˆ˜??1?ë¦¬ ë°˜ì˜¬ë¦?
  result.otHours    = Math.round(result.otHours    * 10) / 10;
  result.nightHours = Math.round(result.nightHours * 10) / 10;
  result.holHours   = Math.round(result.holHours   * 10) / 10;

  // ?˜ë‹¹ ê³„ì‚°
  if(hw > 0){
    result.otPay    = Math.round(hw * result.otHours    * 1.5);
    result.nightPay = Math.round(hw * result.nightHours * 0.5);
    const holH8     = Math.min(result.holHours, 8 * WEEKS_PER_MONTH); // ???˜ì‚° 8h ê¸°ì?
    const holHOvr   = Math.max(result.holHours - 8 * WEEKS_PER_MONTH, 0);
    result.holPay   = Math.round(hw * holH8 * 1.5 + hw * holHOvr * 2.0);
  }

  return result;
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// _getPIFixedHours()
//   piContract??schedule_json??ê¸°ì??¼ë¡œ ê³ ì •ê·¼ë¡œ?œê°„/?˜ë‹¹??ë°˜í™˜.
//   schedule_json???†ìœ¼ë©?ê³„ì•½?œì— ?€?¥ëœ ê°’ì„ fallback?¼ë¡œ ?¬ìš©.
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _getPIFixedHours(){
  if(!piContract) return { otHours:0, nightHours:0, holHours:0, otPay:0, nightPay:0, holPay:0 };

  const _sched = piContract.schedule_json || null;
  const _hpd   = piContract.work_hours_per_day || 8;
  const _hw    = piContract.hourly_wage || 0;

  if(_sched){
    return _calcFixedHoursFromSchedule(_sched, _hpd, _hw);
  }

  // fallback: ê³„ì•½?œì— ?€?¥ëœ ê°?
  return {
    otHours:    parseFloat(piContract.fixed_ot_hours)    || 0,
    nightHours: parseFloat(piContract.fixed_night_hours) || 0,
    holHours:   parseFloat(piContract.fixed_hol_hours)   || 0,
    otPay:      parseFloat(piContract.fixed_ot_pay)      || 0,
    nightPay:   parseFloat(piContract.fixed_night_pay)   || 0,
    holPay:     parseFloat(piContract.fixed_hol_pay)     || 0,
  };
}

/**
 * schedule_json?ì„œ ?¹ì • ? ì§œ???”ì¼???´ë‹¹?˜ëŠ” ê·¼ë¬´ ?œì‘/ì¢…ë£Œ ?œê°??ë°˜í™˜.
 * @param {string} dateStr - YYYY-MM-DD ?•ì‹
 * @param {object|string|null} scheduleJson - schedule_json (ê°ì²´ ?ëŠ” JSON ë¬¸ì??
 * @param {'start'|'end'} field - ì¡°íšŒ???„ë“œ
 * @param {string} fallback - ?¤ì?ì¤??†ì„ ??ê¸°ë³¸ê°?('09:00' for start, '18:00' for end)
 * @returns {{ hour: number, minute: number }} 24??ê¸°ì? ??ë¶?
 */
function _getScheduleTimeForDate(dateStr, scheduleJson, field, fallback){
  const [fbH, fbM] = (fallback||'09:00').split(':').map(Number);
  const fallbackObj = { hour: fbH||9, minute: fbM||0 };
  if(!dateStr || !scheduleJson) return fallbackObj;

  let sched;
  try { sched = typeof scheduleJson === 'string' ? JSON.parse(scheduleJson) : scheduleJson; }
  catch(e){ return fallbackObj; }
  if(!Array.isArray(sched) || !sched.length) return fallbackObj;

  // ? ì§œ ???”ì¼ (0=?? 1=?? ..., 6=??
  const dayMap = ['sun','mon','tue','wed','thu','fri','sat'];
  const d = new Date(dateStr + 'T00:00:00');
  const dayKey = dayMap[d.getDay()] || 'mon';

  // ?´ë‹¹ ?”ì¼ ì°¾ê¸°
  const daySched = sched.find(s => s.day === dayKey && (s.active === true || s.active === 1 || s.active === 'true'));
  if(!daySched) return fallbackObj;

  // shifts ë°°ì—´ ?°ì„ , ?†ìœ¼ë©??‰ë©´ ?„ë“œ
  const raw = (Array.isArray(daySched.shifts) && daySched.shifts.length > 0)
    ? daySched.shifts[0]
    : daySched;
  const timeStr = raw[field] || '';
  if(!timeStr) return fallbackObj;

  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h||9, minute: m||0 };
}

/**
 * ë¬´ë‹¨ ì¡°í‡´ ?œê°„ ?©ê³„ (?œê°„ ?¨ìœ„)
 * ê°?ì¡°í‡´ ê¸°ë¡ë§ˆë‹¤ (?•ìƒ ?´ê·¼?œê° - ì¡°í‡´?œê°)???„ì 
 * ?•ìƒ ?´ê·¼?œê°: ?´ë‹¹ ? ì§œ???”ì¼ë³?schedule_json ì°¸ì¡°, ?†ìœ¼ë©?18:00
 */
function _getPIEarlyLeaveHours(){
  const hidden = document.getElementById('pi-earlyleave-data');
  if(!hidden) return 0;
  let data = [];
  try { data = JSON.parse(hidden.value || '[]'); } catch(e){ data = []; }

  // ?Œê¸‰ ì¡°í‡´ ?°ì´?°ë„ ?¬í•¨
  const retroEl = document.getElementById('pi-retro-earlyleave-data');
  if(retroEl){
    try {
      const retro = JSON.parse(retroEl.value || '[]');
      if(Array.isArray(retro) && retro.length > 0) data = data.concat(retro);
      else if(retro && retro.count > 0){
        for(let i=0; i<retro.count; i++) data.push({ time: '17:00' });
      }
    } catch(e){}
  }
  if(!data.length) return 0;

  const sched = piContract?.schedule_json || null;

  let totalHours = 0;
  for(const d of data){
    if(!d.time) continue;
    const [h, m] = d.time.split(':').map(Number);
    const leaveMin = h * 60 + (m||0);

    // ?´ë‹¹ ? ì§œ???”ì¼ë³??•ìƒ ?´ê·¼?œê° ì¡°íšŒ
    const endTime = _getScheduleTimeForDate(d.date, sched, 'end', '18:00');
    const endMin = endTime.hour * 60 + endTime.minute;

    if(leaveMin < endMin){
      totalHours += (endMin - leaveMin) / 60;
    }
  }
  return Math.round(totalHours * 10) / 10;
}

/**
 * ë¬´ë‹¨ ì§€ê°??œê°„ ?©ê³„ (?œê°„ ?¨ìœ„)
 * ê°?ì§€ê°?ê¸°ë¡ë§ˆë‹¤ (ì¶œê·¼?œê° - ?•ìƒ ì¶œê·¼?œê°)???„ì 
 * ?•ìƒ ì¶œê·¼?œê°: ?´ë‹¹ ? ì§œ???”ì¼ë³?schedule_json ì°¸ì¡°, ?†ìœ¼ë©?09:00
 */
function _getPILateHours(){
  const hidden = document.getElementById('pi-late-data');
  if(!hidden) return 0;
  let data = [];
  try { data = JSON.parse(hidden.value || '[]'); } catch(e){ data = []; }

  // ?Œê¸‰ ì§€ê°??°ì´?°ë„ ?¬í•¨
  const retroEl = document.getElementById('pi-retro-late-data');
  if(retroEl){
    try {
      const retro = JSON.parse(retroEl.value || '[]');
      if(Array.isArray(retro) && retro.length > 0) data = data.concat(retro);
      else if(retro && retro.count > 0){
        for(let i=0; i<retro.count; i++) data.push({ time: '10:00' });
      }
    } catch(e){}
  }
  if(!data.length) return 0;

  const sched = piContract?.schedule_json || null;

  let totalHours = 0;
  for(const d of data){
    if(!d.time) continue;
    const [h, m] = d.time.split(':').map(Number);
    const arriveMin = h * 60 + (m||0);

    // ?´ë‹¹ ? ì§œ???”ì¼ë³??•ìƒ ì¶œê·¼?œê° ì¡°íšŒ
    const startTime = _getScheduleTimeForDate(d.date, sched, 'start', '09:00');
    const startMin = startTime.hour * 60 + startTime.minute;

    if(arriveMin > startMin){
      totalHours += (arriveMin - startMin) / 60;
    }
  }
  return Math.round(totalHours * 10) / 10;
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// calcPITotalHours()
//   ì´?ê·¼ë¡œ?œê°„ ?ë™ê³„ì‚°:
//     ê¸°ë³¸ê·¼ë¡œ?œê°„ = ê·¼ë¡œ?¼ìˆ˜ Ã— ???Œì •ê·¼ë¡œ?œê°„(hpd)
//     ì´?ê·¼ë¡œ?œê°„ = ê¸°ë³¸ê·¼ë¡œ?œê°„ + ê³ ì •(?°ì¥+?¼ê°„+?´ì¼) + ì¶”ê?(?°ì¥+?¼ê°„+?´ì¼)
//   ê²°ê³¼ë¥?pi-total-hours ??ë°˜ì˜ (?½ê¸°?„ìš© ?„ë“œ).
//   calcPIWorkActual() ê³??°ì¥Â·?¼ê°„Â·?´ì¼ oninput ?ì„œ ?¸ì¶œ??
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function calcPITotalHours(){
  const thEl = document.getElementById('pi-total-hours');
  if(!thEl) return;

  const workDays = parseFloat(document.getElementById('pi-work-days')?.value || 0) || 0;
  // ì¶”ê?(?˜ë™?…ë ¥) ?°ì¥Â·?¼ê°„Â·?´ì¼
  const otH      = parseFloat(document.getElementById('pi-ot-hours')?.value   || 0) || 0;
  const nightH   = parseFloat(document.getElementById('pi-night-hours')?.value|| 0) || 0;
  const holH     = parseFloat(document.getElementById('pi-hol-hours')?.value  || 0) || 0;
  // ê³ ì •(ê·¼ë¬´?œê°„??ê¸°ì? ?ë™ê³„ì‚°) ?°ì¥Â·?¼ê°„Â·?´ì¼
  const _fixed   = _getPIFixedHours();
  const _fotH    = _fixed.otHours;
  const _fniH    = _fixed.nightHours;
  const _fhoH    = _fixed.holHours;

  // ???Œì •ê·¼ë¡œ?œê°„: ê³„ì•½?œê? ?ˆìœ¼ë©?ê³„ì•½??ê¸°ì?, ?†ìœ¼ë©?8h ê¸°ë³¸
  const hpd = piContract ? (parseFloat(piContract.work_hours_per_day) || 8) : 8;

  const basicHours = workDays * hpd;
  // ?€?€ ì¡°í‡´Â·ì§€ê°??œê°„ ì°¨ê° ?€?€
  const earlyLeaveHours = (typeof _getPIEarlyLeaveHours === 'function') ? _getPIEarlyLeaveHours() : 0;
  const lateHours       = (typeof _getPILateHours === 'function')       ? _getPILateHours()       : 0;
  const deductionHours  = earlyLeaveHours + lateHours;

  const total = basicHours + _fotH + _fniH + _fhoH + otH + nightH + holH - deductionHours;

  // ?Œìˆ˜??1?ë¦¬ê¹Œì? (0.5 ?¨ìœ„ ?…ë ¥?´ë?ë¡?
  thEl.value = Math.round(total * 10) / 10 || 0;
}

// ?€?€ ê·¼ë¡œ ?¤ì  ?ë™ ?°ì¶œ ?€?€
// ê·¼ë¡œ?¼ìˆ˜ / OTÂ·?¼ê°„Â·?´ì¼ ?œê°„ ?…ë ¥ ??ê³„ì•½??ê¸°ë°˜ ê¸ˆì•¡ ?ë™ ?°ì¶œ ???œì‹œ
// ?¤ì œ ê¸°ë³¸ê¸‰Â·ìˆ˜???…ë ¥ ?„ë“œ??ì§ì ‘ ê±´ë“œë¦¬ì? ?ŠìŒ (?¬ìš©???˜ì • ?°ì„ )
function calcPIWorkActual(){
  const workAutoPanel = document.getElementById('pi-work-auto-panel');
  const simpleWrap    = document.getElementById('pi-ot-pay-simple-wrap');

  if(!piContract){
    if(workAutoPanel) workAutoPanel.style.display = 'none';
    if(simpleWrap)    simpleWrap.style.display     = '';
    return;
  }

  // ?€?€ ê·¼ë¡œ?¼ìˆ˜ input.max: ?°ì •ê¸°ê°„ ê¸°ì? ?Œì •ê·¼ë¡œ?¼ìˆ˜ë¡?ê°±ì‹  (ê¸°ì¡´ max ? ì?) ?€?€?€?€
  {
    const _wdEl = document.getElementById('pi-work-days');
    if(_wdEl && piContract && typeof _calcPIDefaultWorkDays === 'function'){
      const _yr2 = parseInt(document.getElementById('pi-year')?.value)  || 0;
      const _mo2 = parseInt(document.getElementById('pi-month')?.value) || 0;
      if(_yr2 && _mo2){
        const _res = _calcPIDefaultWorkDays(piContract, _yr2, _mo2);
        if(_res && _res.workDays > 0) _wdEl.max = _res.workDays;
      }
    }
  }
  // ì´?ê·¼ë¡œ?œê°„ ?ë™ê³„ì‚°: ê·¼ë¡œ?¼ìˆ˜ ë³€ê²???ì¦‰ì‹œ ë°˜ì˜
  calcPITotalHours();

  // ì£¼íœ´?˜ë‹¹ ?ë™ê³„ì‚° (ì¶œê·¼?¼ìˆ˜ ë³€ê²??œë§ˆ???¬ê³„??
  // ??ê¸°ë³¸ê¸?dispÂ·hidden inputÂ·?˜ë‹¹ dispÂ·?¨ë„ ?œì‹œÂ·5??ë°°ì????´ì–´???¸ì¶œ?˜ëŠ” calcPI()?ì„œ ?¼ê´„ ì²˜ë¦¬
  calcWeeklyHolidayPay();

  calcPI();
}

// ?€?€ ì§ì „ 3ê°œì›” ?‰ê· ?„ê¸ˆ(?¼í• ) ê³„ì‚° (ê²½ì˜???´ì—…?˜ë‹¹ ?°ì •?? ?€?€
// ê·¼ë¡œê¸°ì?ë²???6ì¡? ?‰ê· ?„ê¸ˆ = (?¬ìœ  ë°œìƒ???´ì „ 3ê°œì›”ê°?ì§€ê¸‰ëœ ?„ê¸ˆ ì´ì•¡) Ã· (3ê°œì›”ê°?ì´??¼ìˆ˜)
function _calcDailyAverageWage(empId, baseYr, baseMo){
  if(!empId || !baseYr || !baseMo) return 0;
  let totalGross = 0, totalDays = 0;
  for(let i = 1; i <= 3; i++){
    let yr = baseYr, mo = baseMo - i;
    if(mo <= 0){ mo += 12; yr--; }
    const daysInMonth = new Date(yr, mo, 0).getDate();
    totalDays += daysInMonth;
    const pays = (allPayrolls||[]).filter(p =>
      p.employee_id === empId && p.pay_year === yr && p.pay_month === mo && !p.is_draft
    );
    pays.forEach(p => { totalGross += (parseFloat(p.gross_pay)||0); });
  }
  if(totalDays <= 0 || totalGross <= 0) return 0;
  return Math.round(totalGross / totalDays);
}

function calcPI(){
  // ì£¼íœ´?˜ë‹¹ ?ë™ê³„ì‚° ??ë§¤ë²ˆ recalc (ì¶œê·¼?¼ìˆ˜Â·ê³„ì•½ ë³€ê²???ë°˜ì˜)
  // ??calcWeeklyHolidayPay ?´ë??ì„œ setAmountValë§??¸ì¶œ, calcPI ?¬ì§„???†ìŒ
  if(piContract && piContract.contract_type !==CONTRACT_TYPE.DAILY){
    const _holResult = calcWeeklyHolidayPay();
    _retroHolidayOverpay = _holResult ? (_holResult.retroHolidayOverpay || 0) : 0;
  } else {
    _retroHolidayOverpay = 0;
  }

  const hw=piContract?piContract.hourly_wage:0;
  const otH=gv('pi-ot-hours'),nightH=gv('pi-night-hours'),holH=gv('pi-hol-hours');

  // ?€?€ 5??ë¯¸ë§Œ ?¬ì—…???ì • ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const _coId = currentGlobalCompanyId;
  const _yr   = parseInt(document.getElementById('pi-year')?.value)  || 0;
  const _mo   = parseInt(document.getElementById('pi-month')?.value) || 0;
  const _sfInfo = (_coId && _yr && _mo) ? _getPISmallFirmInfo(_coId, _yr, _mo) : { isSmall:false };
  const _isSmall = _sfInfo.isSmall;

  // ?°ì¥Â·?¼ê°„: 5??ë¯¸ë§Œ?´ë©´ ê°€???†ìŒ(Ã—1.0), 5???´ìƒ?´ë©´ ë²•ì • ë°°ìœ¨ ?ìš©
  // ?´ì¼: 5??ë¯¸ë§Œ?´ë©´ 0, 5???´ìƒ?´ë©´ 8h ?´í•˜ Ã—1.5 / ì´ˆê³¼ë¶?Ã—2.0
  const otPay    = _isSmall ? 0 : Math.round(hw * otH    * 1.5);
  const nightPay = _isSmall ? 0 : Math.round(hw * nightH * 0.5);
  const _holH8   = Math.min(holH, 8);
  const _holHOvr = Math.max(holH - 8, 0);
  const holPay   = _isSmall ? 0 : Math.round(hw * _holH8 * 1.5 + hw * _holHOvr * 2.0);
  _layoffPay = 0;    // ?´ì—…?˜ë‹¹ ??if(piContract) ë¸”ë¡?ì„œ ê³„ì‚°, else ë¶„ê¸°?ì„œ??0 ? ì?
  _maternityPay = 0; // ì¶œì‚°?´ê? ê¸‰ì—¬ ??if(piContract) ë¸”ë¡?ì„œ ê³„ì‚°
  _retroOverpaymentTotal = 0; // ê³¼ì?ê¸??˜ìˆ˜??

  // 5??ë¯¸ë§Œ ?ˆë‚´ ë°°ì? ?…ë°?´íŠ¸ (calcPIWorkActual ë¯¸ê²½???œì—??ë°˜ì˜)
  _updatePISmallFirmBadge(_sfInfo, _yr, _mo);

  // ?¨ë„ ë°©ì‹ (piContract ?ˆì„ ?? vs ?¨ìˆœ ?œì‹œ (?†ì„ ?? êµ¬ë¶„
  if(piContract){
    // ?€?€ ê¸°ë³¸ê¸??¼í•  ?¬ê³„??(calcPI ?¨ë… ?¸ì¶œ ?œì—??pi-base-daily-disp ??ƒ ìµœì‹  ? ì?) ?€?€
    {
      const _workDays  = parseFloat(document.getElementById('pi-work-days')?.value) || 0;
      const _isDaily   = piContract.contract_type ===CONTRACT_TYPE.DAILY;
      const _cBase     = parseFloat(piContract.base_salary) || 0;
      const _dpw       = parseFloat(piContract.work_days_per_week) || 5;
      // ?€?€ ?¼í•  ê³„ì‚° ë°©ì‹: ê³ ê°??proration_method ?¤ì •???°ë¼ ë¶„ê¸° ?€?€
      const _coForProration = allCompanies.find(c => c.id === _coId);
      const _prorationMethod = _coForProration?.proration_method || '30day_fixed';
      const _monthDays = (() => {
        if (_prorationMethod === '30day_fixed') return 30;
        const _res = _calcPIDefaultWorkDays(piContract, _yr, _mo);
        return (_res && _res.workDays > 0) ? _res.workDays : Math.round(_dpw * 4.345);
      })();
      const _dispEl    = document.getElementById('pi-base-daily-disp');

      let _baseLabel;
      if(!_isDaily && _workDays > 0 && _monthDays > 0){
        const _calc = Math.round(_cBase / _monthDays * _workDays);
        const _methodLabel = _prorationMethod === '30day_fixed' ? '30??ê³ ì •' : '?Œì •ê·¼ë¡œ?¼ìˆ˜';
        _baseLabel = `${won(_calc)} (${won(_cBase)} Ã· ${_monthDays}??${_methodLabel}) Ã— ${_workDays}??`;
        setAmountVal('pi-base', _calc);
      } else if(_isDaily && _workDays > 0){
        const _dWage = parseFloat(piContract.daily_wage) || _cBase;
        const _calc  = Math.round(_dWage * _workDays);
        _baseLabel = `${won(_calc)} (?¼ê¸‰ Ã— ${_workDays}??`;
        setAmountVal('pi-base', _calc);
      } else if(!_isDaily){
        _baseLabel = _cBase > 0 ? won(_cBase) : '-';
        setAmountVal('pi-base', _cBase);
      } else {
        _baseLabel = '-';
        setAmountVal('pi-base', 0);
      }
      if(_dispEl) _dispEl.textContent = _baseLabel;
    }

    // ?ë™?°ì¶œ ?¨ë„ ?´ë? disp ?”ì†Œ ?…ë°?´íŠ¸
    // ?€?€ ê³ ì • ?˜ë‹¹ ?€?€
    const _fixedCalc2 = _getPIFixedHours();
    const dFOt    = document.getElementById('pi-fixed-ot-pay-disp');
    const dFNight = document.getElementById('pi-fixed-night-pay-disp');
    const dFHol   = document.getElementById('pi-fixed-hol-pay-disp');
    if(dFOt)    dFOt.textContent    = won(_fixedCalc2.otPay);
    if(dFNight) dFNight.textContent = won(_fixedCalc2.nightPay);
    if(dFHol)   dFHol.textContent   = won(_fixedCalc2.holPay);

    // ?€?€ ì¶”ê? ?˜ë‹¹ ?€?€
    const dOt    = document.getElementById('pi-ot-pay-disp');
    const dNight = document.getElementById('pi-night-pay-disp');
    const dHol   = document.getElementById('pi-hol-pay-disp');
    if(dOt)    dOt.textContent    = won(otPay);
    if(dNight) dNight.textContent = won(nightPay);
    if(dHol)   dHol.textContent   = won(holPay);

    // ?€?€ ê²°ê·¼Â·ì¡°í‡´Â·ì§€ê°?ì°¨ê° (layoff_leave ?œì™¸) ?€?€
    // ???´ì—…?´ì§(layoff_leave)?€ ?Œì‚¬ ê·€ì±??´ì—… ??ì°¨ê°???„ë‹Œ ?´ì—…?˜ë‹¹ ì§€ê¸??€??
    const _dedRow   = document.getElementById('pi-deduction-row');
    const _dedDisp  = document.getElementById('pi-deduction-disp');
    const _dedLabel = document.getElementById('pi-deduction-label');
    const _dedDetail = document.getElementById('pi-deduction-detail');
    const _hw2 = piContract ? (piContract.hourly_wage || 0) : 0;
    const _hpd2 = piContract ? (piContract.work_hours_per_day || 8) : 8;

    // ?€?€ pi-absent-data ?Œì‹±?˜ì—¬ ? í˜•ë³?ë¶„ë¦¬ ?€?€
    let _absentDataAll = [];
    const _absDataEl = document.getElementById('pi-absent-data');
    try { _absentDataAll = JSON.parse(_absDataEl?.value || '[]'); } catch(e) { _absentDataAll = []; }

    // ?Œê¸‰ ê·¼íƒœ ?°ì´?°ë„ ê²°ê·¼ ì°¨ê°???¬í•¨ (?°ì •ê¸°ê°„ ?´ì „ ê·¼íƒœ)
    const _retroAbsDataEl = document.getElementById('pi-retro-absent-data');
    let _retroAbsData = [];
    try { _retroAbsData = JSON.parse(_retroAbsDataEl?.value || '[]'); } catch(e) { _retroAbsData = []; }
    // ?Œê¸‰ ?°ì´?°ëŠ” ?„ì•¡ ê³µì œ ?€?ìœ¼ë¡??µí•© (?´ë? ?´ì „ ê¸°ê°„??ì§€ê¸‰ëœ ê¸‰ì—¬?ì„œ ?„ë½??ì°¨ê°)
    _absentDataAll = _absentDataAll.concat(_retroAbsData);

    // ê²°ê·¼(ë¬´ë‹¨+ë³‘ê?+?°ì¬ ?? vs ?´ì—…?´ì§ ë¶„ë¦¬
    const _layoffEntries  = _absentDataAll.filter(d => d.type === 'layoff_leave');
    const _nonLayoffAbsent = _absentDataAll.filter(d => d.type !== 'layoff_leave');

    // ?´ì—…?´ì§ ?¼ìˆ˜ ê³„ì‚° (dateTo ë²”ìœ„ ?•ì¥)
    let _layoffDays = 0;
    _layoffEntries.forEach(d => {
      const expanded = (typeof _atlExpandDateRange === 'function')
        ? _atlExpandDateRange(d.date, d.dateTo || '')
        : [d.date];
      _layoffDays += expanded.length;
    });

    // ?€?€ ê²°ê·¼ ? í˜•ë³?ì°¨ë“± ê³µì œ ?€?€
    // ë¬´ë‹¨Â·ë¬´ê¸‰ë³‘ê?Â·?ë¦¬Â·ê°€ì¡±ëŒë´? 100% ê³µì œ
    // ? ê¸‰ë³‘ê?(sick_paid): (100 - rate)% ê³µì œ (?Œì‚¬ ?´ê·œ ë°˜ì˜)
    // ?°ì¬Â·?¡ì•„?´ì§Â·ì¶œì‚°Â·ë°°ìš°?ì¶œ?? ê³µì œ ?œì™¸ (êµ??/ê³µë‹¨ ì§ì ‘ ì§€ê¸?
    const _FULL_DEDUCT_TYPES = new Set(['unauthorized', 'sick_unpaid', 'menstrual', 'family_care']);
    const _ZERO_DEDUCT_TYPES = new Set(['industrial', 'childcare_leave', 'maternity_paid', 'maternity_unpaid', 'paternity_paid']);
    
    let _absentPayTotal = 0;
    let _absentLabelParts = [];
    _nonLayoffAbsent.forEach(d => {
      const expanded = (typeof _atlExpandDateRange === 'function')
        ? _atlExpandDateRange(d.date, d.dateTo || '')
        : [d.date];
      const days = expanded.length;
      const typ = d.type || 'unauthorized';
      
      if (_ZERO_DEDUCT_TYPES.has(typ)) {
        const _zlbl = typ === 'industrial' ? '?°ì¬' : typ === 'childcare_leave' ? '?¡ì•„?´ì§' : typ === 'maternity_paid' ? 'ì¶œì‚°?´ê?' : typ === 'maternity_unpaid' ? 'ì¶œì‚°(ë¬´ê¸‰)' : typ === 'paternity_paid' ? 'ë°°ìš°?ì¶œ?? : typ;
        if (days > 0) {
          const _src = typ === 'industrial' ? 'ê·¼ë¡œë³µì?ê³µë‹¨' : 'ê³ ìš©ë³´í—˜';
          if (typ === 'maternity_paid' && d.dayNumber) {
            _absentLabelParts.push(`${_zlbl} ${days}??(${d.dayNumber}~${d.dayNumber + days - 1}?¼ì°¨, ${_src})`);
          } else {
            _absentLabelParts.push(`${_zlbl} ${days}??(${_src})`);
          }
        }
        return;
      }
      
      if (typ === 'sick_paid') {
        const rate = parseFloat(d.rate) || 0;
        const deductRate = Math.max(0, 100 - rate) / 100;
        const pay = Math.round(days * _hpd2 * _hw2 * deductRate);
        _absentPayTotal += pay;
        if (days > 0) _absentLabelParts.push(`? ê¸‰ë³‘ê? ${days}??${rate}%)`);
      } else if (_FULL_DEDUCT_TYPES.has(typ)) {
        _absentPayTotal += Math.round(days * _hpd2 * _hw2);
        const lbl = typ === 'sick_unpaid' ? 'ë¬´ê¸‰ë³‘ê?' : typ === 'menstrual' ? '?ë¦¬?´ê?' : typ === 'family_care' ? 'ê°€ì¡±ëŒë´? : 'ê²°ê·¼';
        if (days > 0) _absentLabelParts.push(`${lbl} ${days}??);
      } else {
        _absentPayTotal += Math.round(days * _hpd2 * _hw2);
        if (days > 0) _absentLabelParts.push(`ê²°ê·¼ ${days}??);
      }
    });
    
    const _elHours    = (typeof _getPIEarlyLeaveHours === 'function') ? _getPIEarlyLeaveHours() : 0;
    const _lateHours  = (typeof _getPILateHours === 'function') ? _getPILateHours() : 0;
    const _elPay     = _elHours * _hw2;
    const _latePay   = _lateHours * _hw2;
    const _totalDeduction = _absentPayTotal + _elPay + _latePay;

    // ?€?€ ?´ì—…?˜ë‹¹ ê³„ì‚° (ê·¼ë¡œê¸°ì?ë²???6ì¡? ?€?€
    // 5??ë¯¸ë§Œ ?¬ì—…?? 0??(ë²•ì  ?˜ë¬´ ?†ìŒ)
    // 5???´ìƒ: ?‰ê· ?„ê¸ˆ 70% (?? ?µìƒ?„ê¸ˆ 100%ë¥?ì´ˆê³¼?????†ìŒ)
    const _dailyOrdinaryWage = Math.round(_hw2 * _hpd2); // 1???µìƒ?„ê¸ˆ
    _layoffPay = 0;
    if (!_isSmall && _layoffDays > 0) {
      const _layoffEmpId = document.getElementById('pi-employee')?.value || '';
      const _dailyAvgWage = _layoffEmpId ? _calcDailyAverageWage(_layoffEmpId, _yr, _mo) : 0;
      if (_dailyAvgWage > 0) {
        // ?‰ê· ?„ê¸ˆ??70% (?µìƒ?„ê¸ˆ ?í•œ)
        const _dailyLayoffRate = Math.min(Math.round(_dailyAvgWage * 0.7), _dailyOrdinaryWage);
        _layoffPay = _dailyLayoffRate * _layoffDays;
      } else {
        // ?‰ê· ?„ê¸ˆ ?°ì¶œ ë¶ˆê?(? ê·œ?…ì‚¬ ?? ???µìƒ?„ê¸ˆ 70%ë¡??´ë°±
        _layoffPay = Math.round(_dailyOrdinaryWage * 0.7 * _layoffDays);
      }
    }

    // ?€?€ ì¶œì‚°?„í›„?´ê? ê¸‰ì—¬ ê³„ì‚° (?°ì„ ì§€?ë??ê¸°??ê¸°ì?) ?€?€
    let _maternityDayLabelStr = '';
    // ê³ ìš©ë³´í—˜ ì§€ê¸? ?µìƒ?„ê¸ˆ 100% (???í•œ 220ë§Œì›)
    // ?Œì‚¬ ë³´ì¶©ì§€ê¸? Max(0, ?µìƒ?„ê¸ˆ - 2,200,000?? Ã· 30 Ã— ?¼ìˆ˜
    // ??dayNumber ê¸°ì?: 1~60?¼ì°¨ë§??Œì‚¬ ë³´ì¶©, 61~90?¼ì°¨??ê³ ìš©ë³´í—˜ ?„ì•¡
    // ??ë³??œìŠ¤?œì? ?€ê¸°ì—… ?€?ì´ ?„ë‹˜ ???°ì„ ì§€?ë??ê¸°??ê¸°ì?ë§??ìš©
    const MATERNITY_CAP_MONTHLY = 2200000;
    const _maternityEntries = _absentDataAll.filter(d => d.type === 'maternity_paid');
    if (_maternityEntries.length > 0 && piContract) {
      let _maternityDays = 0, _maternitySubsidyDays = 0;
      const _maternityDayLabels = [];
      _maternityEntries.forEach(d => {
        const expanded = (typeof _atlExpandDateRange === 'function')
          ? _atlExpandDateRange(d.date, d.dateTo || '')
          : [d.date];
        const startDayNum = d.dayNumber || 1; // dayNumber ?†ìœ¼ë©?1?¼ì°¨ë¡?ê°€??(?´ë°±)
        expanded.forEach((date, i) => {
          const dayNum = startDayNum + i;
          _maternityDays++;
          if (dayNum <= 60) _maternitySubsidyDays++; // 1~60?¼ì°¨: ?Œì‚¬ ë³´ì¶©
          // 61~90?¼ì°¨: ê³ ìš©ë³´í—˜ 100% ???Œì‚¬ ë¶€???†ìŒ
        });
        if (expanded.length > 0) {
          const endDayNum = startDayNum + expanded.length - 1;
          _maternityDayLabels.push(`${startDayNum}~${endDayNum}?¼ì°¨`);
        }
      });
      if (_maternityDays > 0) {
        const _dailyCap = Math.round(MATERNITY_CAP_MONTHLY / 30);
        _maternityPay = Math.max(0, Math.round((_dailyOrdinaryWage - _dailyCap) * _maternitySubsidyDays));
        // ?¼ì°¨ ?•ë³´ë¥??¼ë²¨???€??(ì¶”í›„ ?œì‹œ??
        _maternityDayLabelStr = _maternityDayLabels.join(', ');
      }
    }

    // ?€?€ ?Œê¸‰ ê·¼íƒœ ??ª©ë³?ê¸ˆì•¡ ?°ì¶œ (ê³¼ì?ê¸??˜ìˆ˜???¬í•¨) ?€?€
    const _retroItemLines = [];
    _retroOverpaymentTotal = 0;
    const _retroTypeLabels = {
      industrial:'?°ì¬', maternity_paid:'ì¶œì‚°(? ê¸‰)', maternity_unpaid:'ì¶œì‚°(ë¬´ê¸‰)',
      paternity_paid:'ë°°ìš°?ì¶œ??, childcare_leave:'?¡ì•„?´ì§',
      unauthorized:'ë¬´ë‹¨ê²°ê·¼', sick_unpaid:'ë¬´ê¸‰ë³‘ê?', menstrual:'?ë¦¬?´ê?',
      family_care:'ê°€ì¡±ëŒë´?, layoff_leave:'?´ì—…?´ì§'
    };
    _retroAbsData.forEach(d => {
      const expanded = (typeof _atlExpandDateRange === 'function')
        ? _atlExpandDateRange(d.date, d.dateTo || '')
        : [d.date];
      const days = expanded.length;
      const typ = d.type || 'unauthorized';
      const dateLabel = (d.date||'').replace(/^\d{4}-/, '');

      if (_ZERO_DEDUCT_TYPES.has(typ)) {
        // ?°ì¬Â·ì¶œì‚°Â·?¡ì•„?´ì§ ?? ê³µë‹¨/ê³ ìš©ë³´í—˜ ì§€ê¸‰ë¶„ ???„ê¸° ?Œì‚¬ ê³¼ì?ê¸??˜ìˆ˜
        const recovery = Math.round(days * _hpd2 * _hw2);
        _retroOverpaymentTotal += recovery;
        _retroItemLines.push({ date: dateLabel, label: _retroTypeLabels[typ]||typ, days, amount: recovery, isRecovery: true });
      } else if (typ === 'sick_paid') {
        const rate = parseFloat(d.rate) || 0;
        const deductRate = Math.max(0, 100 - rate) / 100;
        const amt = Math.round(days * _hpd2 * _hw2 * deductRate);
        _retroItemLines.push({ date: dateLabel, label: `? ê¸‰ë³‘ê?(${rate}%)`, days, amount: amt, isRecovery: false });
      } else if (_FULL_DEDUCT_TYPES.has(typ)) {
        const amt = Math.round(days * _hpd2 * _hw2);
        const lbl = typ === 'sick_unpaid' ? 'ë¬´ê¸‰ë³‘ê?' : typ === 'menstrual' ? '?ë¦¬?´ê?' : typ === 'family_care' ? 'ê°€ì¡±ëŒë´? : 'ê²°ê·¼';
        _retroItemLines.push({ date: dateLabel, label: lbl, days, amount: amt, isRecovery: false });
      } else {
        _retroItemLines.push({ date: dateLabel, label: 'ê²°ê·¼', days, amount: Math.round(days * _hpd2 * _hw2), isRecovery: false });
      }
    });

    // ?Œê¸‰ ??ê°±ì‹ 
    const _retroRow = document.getElementById('pi-retro-attendance-row');
    const _retroText = document.getElementById('pi-retro-attendance-text');
    if (_retroRow && _retroText && _retroItemLines.length > 0) {
      _retroRow.style.display = '';
      const _retroHtml = _retroItemLines.map(item => {
        const _icon = item.isRecovery ? '?? : '??;
        const _suffix = item.isRecovery ? ' ?˜ìˆ˜' : ' ì°¨ê°';
        return `<span style="font-size:11px;display:inline-block;background:${item.isRecovery?'#fef3c7':'#fef2f2'};color:${item.isRecovery?'#92400e':'#dc2626'};padding:2px 6px;border-radius:4px;margin:1px 2px;white-space:nowrap;">${item.date} ${item.label} ${item.days}??${_icon} ${won(item.amount)}${_suffix}</span>`;
      }).join('');
      // ?Œê¸‰ ì£¼íœ´?˜ë‹¹ ê³¼ì?ê¸??˜ìˆ˜ ì¶”ê?
      if (_retroHolidayOverpay > 0) {
        _retroHtml += `<span style="font-size:11px;display:inline-block;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;margin:1px 2px;white-space:nowrap;">ì£¼íœ´?˜ë‹¹ ??${won(_retroHolidayOverpay)} ?˜ìˆ˜</span>`;
      }
      _retroText.innerHTML = _retroHtml;
    } else if (_retroRow) {
      _retroRow.style.display = 'none';
    }

    // ?€?€ ê³¼ì?ê¸??˜ìˆ˜?¡ì„ ì°¨ê° ì´ì•¡???¬í•¨ ?€?€
    const _totalRetroRecovery = _retroOverpaymentTotal + _retroHolidayOverpay;
    const _totalDeductionWithRetro = _totalDeduction + _totalRetroRecovery;

    if(_dedRow && _dedDisp){
      if(_totalDeductionWithRetro > 0 || _layoffDays > 0 || _maternityPay > 0){
        _dedRow.style.display = '';
        const _plusParts = [];
        if(_layoffDays > 0) _plusParts.push('+' + won(_layoffPay));
        if(_maternityPay > 0) _plusParts.push('+' + won(_maternityPay));
        _dedDisp.textContent = (_totalDeductionWithRetro > 0 ? '-' + won(_totalDeductionWithRetro) : '') +
          (_totalDeductionWithRetro > 0 && _plusParts.length > 0 ? ' Â· ' : '') +
          _plusParts.join(' Â· ');
        _dedDisp.classList.toggle('pi-deduction-has-allowance', _layoffDays > 0 || _maternityPay > 0);
        const parts = [..._absentLabelParts];
        // ?Œê¸‰ ê³¼ì?ê¸??˜ìˆ˜ ??ª© ì¶”ê?
        _retroItemLines.filter(item => item.isRecovery).forEach(item => {
          parts.push(`?Œê¸‰ ${item.label} ${item.days}???˜ìˆ˜ ${won(item.amount)}`);
        });
        if (_retroHolidayOverpay > 0) parts.push(`?Œê¸‰ ì£¼íœ´?˜ë‹¹ ?˜ìˆ˜ ${won(_retroHolidayOverpay)}`);
        if(_elHours > 0) parts.push(`ì¡°í‡´ ${_elHours.toFixed(1)}h`);
        if(_lateHours > 0) parts.push(`ì§€ê°?${_lateHours.toFixed(1)}h`);
        if(_layoffDays > 0) parts.push(`?´ì—…?˜ë‹¹ ${_layoffDays}??{_isSmall?' (5?¸ë?ë§?ë©´ì œ)':''}`);
        if(_maternityPay > 0) parts.push(`ì¶œì‚°?´ê? ê¸‰ì—¬ ${won(_maternityPay)}${_maternityDayLabelStr ? ' (' + _maternityDayLabelStr + ')' : ''}`);
        if(_dedDetail) _dedDetail.textContent = parts.join(' Â· ');
        if(_dedLabel) _dedLabel.textContent = (_layoffDays > 0 || _maternityPay > 0 || _retroOverpaymentTotal > 0) ? 'ê²°ê·¼Â·ì¡°í‡´Â·ì§€ê°?ì°¨ê° ë°?ë²•ì •?˜ë‹¹' : 'ê²°ê·¼Â·ì¡°í‡´Â·ì§€ê°?ì°¨ê°';
      } else {
        _dedRow.style.display = 'none';
      }
    }
    // simple wrap ?¨ê¸°ê¸?+ ê³ ì •?˜ë‹¹Â·ì°¨ê°???¨ê?
    const sw = document.getElementById('pi-ot-pay-simple-wrap');
    if(sw) sw.style.display = 'none';
    // ?¨ë„: ê³„ì•½???ˆìœ¼ë©???ƒ ?œì‹œ (ê¸°ë³¸ê¸‰Â·ì£¼?´ìˆ˜?¹ë„ ?¨ë„???¬í•¨)
    const wp = document.getElementById('pi-work-auto-panel');
    if(wp) wp.style.display = '';
  } else {
    // ê³„ì•½ ?†ì„ ??simple disp ?¬ìš©
    const dOtS    = document.getElementById('pi-ot-pay-disp-simple');
    const dNightS = document.getElementById('pi-night-pay-disp-simple');
    const dHolS   = document.getElementById('pi-hol-pay-disp-simple');
    if(dOtS)    dOtS.textContent    = won(otPay);
    if(dNightS) dNightS.textContent = won(nightPay);
    if(dHolS)   dHolS.textContent   = won(holPay);
    const sw = document.getElementById('pi-ot-pay-simple-wrap');
    if(sw) sw.style.display = '';
    const wp = document.getElementById('pi-work-auto-panel');
    if(wp) wp.style.display = 'none';
    // ì°¨ê° ???¨ê?
    const _dedRow2 = document.getElementById('pi-deduction-row');
    if(_dedRow2) _dedRow2.style.display = 'none';
  }

  // ê³ ì • ?°ì¥/?¼ê°„/?´ì¼ê·¼ë¡œ?˜ë‹¹: ê·¼ë¬´?œê°„??ê¸°ì? ?ë™ê³„ì‚°
  const _fixedCalc      = _getPIFixedHours();
  const _fixedOtPay    = _fixedCalc.otPay;
  const _fixedNightPay = _fixedCalc.nightPay;
  const _fixedHolPay   = _fixedCalc.holPay;
  const gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')+gv('pi-skill')+gv('pi-license')+gv('pi-transport')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+otPay+nightPay+holPay+_fixedOtPay+_fixedNightPay+_fixedHolPay+gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-fitness')+gv('pi-self-dev')+gv('pi-book')+gv('pi-overseas')+gv('pi-etc-allowance')+gv('pi-severance-interim')+_layoffPay+_maternityPay - _retroOverpaymentTotal - _retroHolidayOverpay;
  // ?µìƒ?„ê¸ˆ ê¸°ì?: ë§¤ì›” ?•ê¸°ì§€ê¸???ª©ë§??¬í•¨ (ì¶œê·¼?¼ìˆ˜???°ë¦„?€ ?œì™¸)
  // ?? ë¹„ê³¼????ª©(childcare/car/meal/research)?€ fixed ?¬ë??€ ê´€ê³„ì—†????20ë§Œì› ?œë„ë¡??¬í•¨
  const _TAX_EXEMPT_CAP = 200000;
  const _piTaxCfg = (() => {
    const co = allCompanies.find(c => c.id === currentGlobalCompanyId);
    if (!co?.allowance_config) return {};
    const cfg = co.allowance_config;
    return typeof cfg === 'string' ? (() => { try { return JSON.parse(cfg); } catch(e) { return {}; } })() : cfg;
  })();
  const _teVal = (field) => {
    const _idMap = { car:'transport', remote_area:'remote-area' };
    const amt = gv(`pi-${_idMap[field] || field}`);
    if (_piTaxCfg[`${field}_tax_exempt`]) return Math.min(amt, _TAX_EXEMPT_CAP);
    return amt; // ë¹„ê³¼??ë¯¸ì„¤?????„ì•¡ ?¬í•¨ (?µìƒ?„ê¸ˆ?´ë?ë¡?
  };
  const std=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-position')
    + _teVal('car')
    + _teVal('meal')
    + _teVal('research')
    + _teVal('childcare')
    + _teVal('remote_area')
    +(_getPIPayTypeVal('communication')==='fixed'?gv('pi-communication'):0)
    +(_getPIPayTypeVal('fitness')==='fixed'    ?gv('pi-fitness')    :0)
    +(_getPIPayTypeVal('self_dev')==='fixed'   ?gv('pi-self-dev')   :0)
    +(_getPIPayTypeVal('book')==='fixed'       ?gv('pi-book')       :0)
    +(_getPIPayTypeVal('overseas')==='fixed'   ?gv('pi-overseas')   :0)
    +gv('pi-skill')
    +gv('pi-license')
    +otPay+nightPay+holPay+gv('pi-annual-pay');
  const curStd=gv('pi-std-pay');
  if(!curStd||curStd===0) setAmountVal('pi-std-pay', std);
  const isFixed = _getPIInsuranceBasis() === INSURANCE_BASIS.FIXED_AMOUNT;
  if(isFixed) calcPIFixed(gross);
  else calcPIDeductions(gross);
}
function calcPIManual(){
  // ?˜ë‹¹ ?œì‹œê°??Œì‹± (?¨ë„ ë°©ì‹/?¨ìˆœ ë°©ì‹ ëª¨ë‘ ì²´í¬)
  const _parsePay=id=>{
    const el=document.getElementById(id);
    return el ? parseFloat((el.textContent||'').replace(/[^0-9]/g,'')||0) : 0;
  };
  const otPay    = _parsePay('pi-ot-pay-disp')    || _parsePay('pi-ot-pay-disp-simple');
  const nightPay = _parsePay('pi-night-pay-disp') || _parsePay('pi-night-pay-disp-simple');
  const holPay   = _parsePay('pi-hol-pay-disp')   || _parsePay('pi-hol-pay-disp-simple');
  const gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')+gv('pi-skill')+gv('pi-license')
             +gv('pi-transport')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+gv('pi-fitness')+gv('pi-self-dev')+gv('pi-book')+gv('pi-overseas')
             +otPay+nightPay+holPay
             +gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-severance-interim')+gv('pi-etc-allowance')+_layoffPay+_maternityPay - _retroOverpaymentTotal - _retroHolidayOverpay;
  const isFixed = _getPIInsuranceBasis() === INSURANCE_BASIS.FIXED_AMOUNT;
  if(isFixed) calcPIFixed(gross);
  else calcPIDeductions(gross);
}

// ?€?€ ?Œë“??ê³„ì‚°: ê°„ì´?¸ì•¡??ê¸°ë°˜ (?°ì´???†ìœ¼ë©??˜ë“œì½”ë”© ê·¼ì‚¬???´ë°±) ?€?€
// ?…ë ¥: std(ë³´ìˆ˜?”ì•¡), dependents(ë¶€?‘ê?ì¡???
// ë°˜í™˜: { incomeTax, localTax, fromTable, usedYear }
function _calcIncomeTax(std, dependents){
  if(std <= 0) return { incomeTax:0, localTax:0, fromTable:false, usedYear:null };

  // ??ê¸‰ì—¬ ?„ë„ ê¸°ì? ê³¼ì„¸ê¸°ì???ì¡°íšŒ
  const yr = parseInt(document.getElementById('pi-year')?.value) || new Date().getFullYear();
  let tableYear = yr;
  let rows = (typeof _TAX_BRACKET_DATA !== 'undefined') ? _TAX_BRACKET_DATA[yr] : null;

  // ???´ë‹¹ ?°ë„ ?†ìœ¼ë©?ìµœì‹  ?°ë„ ?´ë°±
  if(!rows && typeof _TAX_BRACKET_DATA !== 'undefined'){
    const availYears = Object.keys(_TAX_BRACKET_DATA).map(Number).sort((a,b)=>b-a);
    if(availYears.length > 0){
      tableYear = availYears[0];
      rows = _TAX_BRACKET_DATA[tableYear];
    }
  }

  // ??ê°„ì´?¸ì•¡??ì¡°íšŒ
  if(rows && rows.length > 0 && typeof _getTaxForDep === 'function'){
    const row = rows.find(r => std >= r[0] && std < r[1]);
    if(row){
      const incomeTax = _getTaxForDep(row, dependents);
      const localTax = Math.floor(incomeTax * 0.1 / 10) * 10;
      return { incomeTax, localTax, fromTable:true, usedYear:tableYear };
    }
    // ??ë²”ìœ„ ì´ˆê³¼: ìµœê³  êµ¬ê°„ ì´ˆê³¼ ??ë§ˆì?ë§???ê¸°ì?
    const lastRow = rows[rows.length - 1];
    if(std >= lastRow[0]){
      const incomeTax = _getTaxForDep(lastRow, dependents);
      const localTax = Math.floor(incomeTax * 0.1 / 10) * 10;
      return { incomeTax, localTax, fromTable:true, usedYear:tableYear };
    }
    // ??ë²”ìœ„ ë¯¸ë§Œ (106ë§Œì› ë¯¸ë§Œ): ?Œë“??0
    return { incomeTax:0, localTax:0, fromTable:true, usedYear:tableYear };
  }

  // ???´ë°±: ?˜ë“œì½”ë”© ê·¼ì‚¬??(ê³¼ì„¸ê¸°ì????°ì´???†ì„ ?Œë§Œ)
  const R = _getPIRates();
  const taxBase = std - Math.round(std * (R.pensionRate + R.healthRate + R.employRate)) - 150000;
  let incomeTax = 0;
  if(taxBase > 0){
    if(taxBase <= 1060000) incomeTax = 0;
    else if(taxBase <= 1500000) incomeTax = Math.round((taxBase - 1060000) * 0.06);
    else if(taxBase <= 3000000) incomeTax = Math.round(26400 + (taxBase - 1500000) * 0.15);
    else if(taxBase <= 4500000) incomeTax = Math.round(251400 + (taxBase - 3000000) * 0.24);
    else if(taxBase <= 8000000) incomeTax = Math.round(611400 + (taxBase - 4500000) * 0.35);
    else incomeTax = Math.round(1836400 + (taxBase - 8000000) * 0.38);
    incomeTax = Math.max(0, incomeTax - Math.max(0, (dependents - 1) * 15000));
  }
  const localTax = Math.floor(incomeTax * 0.1 / 10) * 10;
  return { incomeTax, localTax, fromTable:false, usedYear:null };
}

// ?€?€ ?”ìœ¨ ê¸°ì? ?ë™ ê³„ì‚° ?€?€
function calcPIDeductions(gross){
  const std=gv('pi-std-pay')||gross;
  const dependents=Math.max(1,parseInt(document.getElementById('pi-dependents')?.value||'1')||1);
  const R = _getPIRates();

  // ?€?€ 4?€ë³´í—˜ ?ìš© ?œì™¸ ?ì • ?€?€
  // ?±ê¸°?„ì›Â·?€?œìÂ·?¹ìˆ˜ê´€ê³„ì¸: ê·¼ë¡œê¸°ì?ë²•ìƒ ê·¼ë¡œ???„ë‹˜ ??4?€ë³´í—˜ ì§ì¥ê°€?…ì ?œì™¸
  const _isSocialInsExempt = piContract && (
    piContract.contract_type === CONTRACT_TYPE.EXECUTIVE ||
    piContract.contract_type === CONTRACT_TYPE.REPRESENTATIVE ||
    piContract.contract_type === CONTRACT_TYPE.RELATED_PARTY
  );
  // ì£?15?œê°„ ë¯¸ë§Œ ?¨ì‹œê°? ê±´ê°•ë³´í—˜Â·?¥ê¸°?”ì–‘ ì§ì¥ê°€?…ì ?œì™¸ (êµ??ê±´ê°•ë³´í—˜ë²???ì¡?
  const _weeklyHForIns = piContract
    ? (parseFloat(piContract.work_hours_per_day)||0) * (parseFloat(piContract.work_days_per_week)||0)
    : 40;
  const _isShortHourWorker = _weeklyHForIns > 0 && _weeklyHForIns < 15;

  // ê·¼ë¡œ?ë³„ ?ìš©?œì™¸: ê³„ì•½??insurance_* ?„ë“œê°€ ëª…ì‹œ?ìœ¼ë¡?false?´ë©´ ?´ë‹¹ ë³´í—˜ ê³µì œ ?œì™¸
  const _insPensionOff = piContract?.insurance_pension === false || piContract?.insurance_pension === 'false';
  const _insHealthOff  = piContract?.insurance_health  === false || piContract?.insurance_health  === 'false';
  const _insEmployOff  = piContract?.insurance_employment === false || piContract?.insurance_employment === 'false';

  // êµ???°ê¸ˆ: ?˜í•œ(??37ë§Œì› ?´í•˜ ë©´ì œ) ?†ìŒ, ?í•œ ?ìš©
  const pension = (_isSocialInsExempt || _insPensionOff)
    ? 0
    : Math.round(Math.min(std, R.pensionCap) * R.pensionRate);
  const health  = (_isSocialInsExempt || _isShortHourWorker || _insHealthOff)
    ? 0
    : Math.round(std * R.healthRate);
  const ltCare  = (_isSocialInsExempt || _isShortHourWorker || _insHealthOff)
    ? 0
    : Math.round(health * R.ltcareRate);
  const empIns  = (_isSocialInsExempt || _insEmployOff)
    ? 0
    : Math.round(std * R.employRate);
  // ?Œë“?? ê°„ì´?¸ì•¡??ê¸°ë°˜ (?†ìœ¼ë©??˜ë“œì½”ë”© ê·¼ì‚¬???´ë°±)
  const taxResult = _calcIncomeTax(std, dependents);
  const incomeTax = taxResult.incomeTax;
  const localTax = taxResult.localTax;
  const yearEnd=gv('pi-yearend'), healthAdj=gv('pi-health-adj'), healthAdjRetro=gv('pi-health-adj-retro');
  const healthAdjYearend=gv('pi-health-adj-yearend'), ltcareAdjYearend=gv('pi-ltcare-adj-yearend');
  const advance=gv('pi-advance');
  const totalDed=pension+health+ltCare+empIns+incomeTax+localTax+yearEnd+healthAdj+healthAdjRetro+healthAdjYearend+ltcareAdjYearend+advance;
  const net=gross-totalDed;
  document.getElementById('pi-ded-detail').innerHTML=`
    <div style="display:flex;justify-content:space-between"><span style="color:#888">?Œë“??(ë¶€?‘ê?ì¡?${dependents}??{taxResult.fromTable?' Â· '+taxResult.usedYear+'??ê°„ì´?¸ì•¡??:''})</span><span>${won(incomeTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">ì£¼ë???(?Œë“?¸Ã?0%)</span><span>${won(localTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">êµ???°ê¸ˆ (ë³´ìˆ˜?”ì•¡Ã—${R.pensionLabel})${_isSocialInsExempt?'<span style=\"font-size:10px;color:#9ca3af;\"> ?ìš©?œì™¸</span>':''}</span><span>${won(pension)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">ê±´ê°•ë³´í—˜ (ë³´ìˆ˜?”ì•¡Ã—${R.healthLabel})${_isSocialInsExempt||_isShortHourWorker?'<span style=\"font-size:10px;color:#9ca3af;\"> ?ìš©?œì™¸</span>':''}</span><span>${won(health)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">?¥ê¸°?”ì–‘ë³´í—˜ (ê±´ê°•ë³´í—˜Ã—${R.ltcareLabel})${_isSocialInsExempt||_isShortHourWorker?'<span style=\"font-size:10px;color:#9ca3af;\"> ?ìš©?œì™¸</span>':''}</span><span>${won(ltCare)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">ê³ ìš©ë³´í—˜ (ë³´ìˆ˜?”ì•¡Ã—${R.employLabel})${_isSocialInsExempt?'<span style=\"font-size:10px;color:#9ca3af;\"> ?ìš©?œì™¸</span>':''}</span><span>${won(empIns)}</span></div>`;
  _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,healthAdjRetro,healthAdjYearend,ltcareAdjYearend,advance);
}

// ?€?€ ?•ì •??ê¸°ì?: ì§ì ‘ ?…ë ¥ + ?Œë“?¸ë§Œ ?ë™ê³„ì‚° ?€?€
function calcPIFixed(gross){
  if(gross===undefined){
    const _pf=id=>parseFloat((document.getElementById(id)?.textContent||'').replace(/[^0-9]/g,'')||0);
    const otPay=   _pf('pi-ot-pay-disp')    || _pf('pi-ot-pay-disp-simple');
    const nightPay=_pf('pi-night-pay-disp') || _pf('pi-night-pay-disp-simple');
    const holPay=  _pf('pi-hol-pay-disp')   || _pf('pi-hol-pay-disp-simple');
    gross=gv('pi-base')+gv('pi-weekly-hol')+gv('pi-site')+gv('pi-remote-area')+gv('pi-position')+gv('pi-skill')+gv('pi-license')+gv('pi-transport')+gv('pi-meal')+gv('pi-childcare')+gv('pi-research')+otPay+nightPay+holPay+gv('pi-annual-pay')+gv('pi-bonus')+gv('pi-performance')+gv('pi-actual-expense')+gv('pi-communication')+gv('pi-fitness')+gv('pi-self-dev')+gv('pi-book')+gv('pi-overseas')+gv('pi-severance-interim')+gv('pi-etc-allowance')+_layoffPay+_maternityPay - _retroOverpaymentTotal - _retroHolidayOverpay;
  }
  const std=gv('pi-std-pay')||gross;

  // ?€?€ 4?€ë³´í—˜ ?ìš© ?œì™¸ ?ì • (?•ì •??ê¸°ì????™ì¼ ?ìš©) ?€?€
  const _isSocialInsExemptFixed = piContract && (
    piContract.contract_type === CONTRACT_TYPE.EXECUTIVE ||
    piContract.contract_type === CONTRACT_TYPE.REPRESENTATIVE ||
    piContract.contract_type === CONTRACT_TYPE.RELATED_PARTY
  );
  const _weeklyHForInsFixed = piContract
    ? (parseFloat(piContract.work_hours_per_day)||0) * (parseFloat(piContract.work_days_per_week)||0)
    : 40;
  const _isShortHourFixed = _weeklyHForInsFixed > 0 && _weeklyHForInsFixed < 15;

  const _insPensionOffF = piContract?.insurance_pension === false || piContract?.insurance_pension === 'false';
  const _insHealthOffF  = piContract?.insurance_health  === false || piContract?.insurance_health  === 'false';
  const _insEmployOffF  = piContract?.insurance_employment === false || piContract?.insurance_employment === 'false';

  const pension = (_isSocialInsExemptFixed || _insPensionOffF) ? 0 : gv('pi-pension-fixed');
  const health  = (_isSocialInsExemptFixed || _isShortHourFixed || _insHealthOffF) ? 0 : gv('pi-health-fixed');
  const ltCare  = (_isSocialInsExemptFixed || _isShortHourFixed || _insHealthOffF) ? 0 : gv('pi-ltcare-fixed');
  const empIns  = (_isSocialInsExemptFixed || _insEmployOffF) ? 0 : gv('pi-employ-fixed');
  const dependents=Math.max(1,parseInt(document.getElementById('pi-dependents')?.value||'1')||1);
  // ?Œë“?? ê°„ì´?¸ì•¡??ê¸°ë°˜ (?†ìœ¼ë©??˜ë“œì½”ë”© ê·¼ì‚¬???´ë°±)
  const taxResult = _calcIncomeTax(std, dependents);
  const incomeTax = taxResult.incomeTax;
  const localTax = taxResult.localTax;
  const yearEnd=gv('pi-yearend'), healthAdj=gv('pi-health-adj'), healthAdjRetro=gv('pi-health-adj-retro');
  const healthAdjYearend=gv('pi-health-adj-yearend'), ltcareAdjYearend=gv('pi-ltcare-adj-yearend');
  const advance=gv('pi-advance');
  const totalDed=pension+health+ltCare+empIns+incomeTax+localTax+yearEnd+healthAdj+healthAdjRetro+healthAdjYearend+ltcareAdjYearend+advance;
  const net=gross-totalDed;
  document.getElementById('pi-ded-detail-fixed').innerHTML=`
    <div style="display:flex;justify-content:space-between"><span style="color:#888">?Œë“??(ë¶€?‘ê?ì¡?${dependents}?? ?ë™${taxResult.fromTable?' Â· '+taxResult.usedYear+'??ê°„ì´?¸ì•¡??:''})</span><span>${won(incomeTax)}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="color:#888">ì£¼ë???(?Œë“?¸Ã?0%, ?ë™)</span><span>${won(localTax)}</span></div>`;
  _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,healthAdjRetro,healthAdjYearend,ltcareAdjYearend,advance);
}

function _piFinalize(gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,yearEnd,healthAdj,healthAdjRetro,healthAdjYearend,ltcareAdjYearend,advance){
  const updateAmounts=(g,d,n)=>{ document.getElementById(g).textContent=won(gross); document.getElementById(d).textContent=won(totalDed); document.getElementById(n).textContent=won(net); };
  updateAmounts('pi-gross-disp','pi-ded-disp','pi-net-disp');
  updateAmounts('pi-gross-disp2','pi-ded-disp2','pi-net-disp2');
  const _pv=id=>parseFloat((document.getElementById(id)?.textContent||'').replace(/[^0-9]/g,'')||0);
  window._piCalc={gross,std,incomeTax,localTax,health,ltCare,pension,empIns,totalDed,net,
    otPay:   _pv('pi-ot-pay-disp')    || _pv('pi-ot-pay-disp-simple'),
    nightPay:_pv('pi-night-pay-disp') || _pv('pi-night-pay-disp-simple'),
    holPay:  _pv('pi-hol-pay-disp')   || _pv('pi-hol-pay-disp-simple')};
  // ëª¨ë“  ê³„ì‚° ?„ë£Œ ???ìƒë³µêµ¬/ì´ˆê¸°??ë²„íŠ¼ ?íƒœ ê°±ì‹ 
  // (calcPIê°€ pi-std-pay ?±ì„ ?ë™ê³„ì‚°Â·ê°±ì‹ ?˜ë?ë¡? ?´ë²¤???„ì„ë§Œìœ¼ë¡œëŠ” ìµœì‹  ???íƒœë¥?ë°˜ì˜ ëª»í•  ???ˆìŒ)
  // ? ê·œ ëª¨ë“œ: piEditPayrollId===null?´ì–´??_checkPIRestoreBtn()???´ë??ì„œ ??ƒ ?œì„± ì²˜ë¦¬
  // ?˜ì • ëª¨ë“œ: ?¤ëƒ…???ˆì„ ?Œë§Œ ë¹„êµ (_checkPIRestoreBtn ?´ë??ì„œ null ì²´í¬)
  _checkPIRestoreBtn();
}
// ?€?€?€ ?ì‹œê·¼ë¡œ?????°ì • ë°?5??ë¯¸ë§Œ ?¬ì—…???ë™ ?ì • ?€?€?€
/**
 * ?ì‹œê·¼ë¡œ????ë²•ì  ?°ì‹ ?ìš©:
 *   ?ì‹œê·¼ë¡œ????= 1ê°œì›”ê°??¬ìš©??ê·¼ë¡œ?ì˜ ì´??°ì¸??Ã· 1ê°œì›”ê°??¬ì—…??ê°€???¼ìˆ˜
 *
 * 5???´ìƒ ?ì • ?¹ë?:
 *   ??ê²°ê³¼ê°€ 5??ë¯¸ë§Œ?´ë”?¼ë„, ê°€???¼ìˆ˜??50% ì´ˆê³¼?˜ëŠ” ? ì— 5???´ìƒ??ê·¼ë¬´?˜ë©´
 *   5???´ìƒ ?¬ì—…?¥ìœ¼ë¡?ê°„ì£¼.
 *
 * ê°€???¼ìˆ˜: ?´ë‹¹ ?”ì˜ ëª¨ë“  ? ì§œ ì¤?1ëª??´ìƒ??ê·¼ë¡œ?ê? ê·¼ë¬´??????
 * ?°ì¸?? ê°?ê°€?™ì¼??ê·¼ë¬´??ê·¼ë¡œ???˜ì˜ ?©ê³„
 * ê·¼ë¬´ ?¬ë? ?ë‹¨: ê°?ê·¼ë¡œ?ì˜ ? íš¨ ê³„ì•½(is_draft=false, is_voided_by_amend=false,
 *               status ??{?œì„±,active,ê³„ì•½?ˆì •,?œë¥˜ë¯¸ë¹„})??ê³„ì•½ê¸°ê°„(contract_start~
 *               contract_end)???´ë‹¹ ? ì§œê°€ ?¬í•¨?˜ëŠ”ì§€ ?¬ë?ë¡??ë‹¨.
 *               (?¤ì œ ì¶œê·¼ ê¸°ë¡ ?†ìœ¼ë¯€ë¡?ê³„ì•½ ? íš¨ = ê·¼ë¬´ë¡?ê°„ì£¼)
 *
 * @param {string} coId  ê³ ê°??ID
 * @param {number} yr    ê¸‰ì—¬ ?„ë„
 * @param {number} mo    ê¸‰ì—¬ ??
 * @returns {{ isSmall:boolean, headcount:number, operDays:number, totalPersonDays:number }}
 */
function _getPISmallFirmInfo(coId, yr, mo){
  const NONE = { isSmall:false, headcount:0, operDays:0, totalPersonDays:0 };
  if(!coId || !yr || !mo) return NONE;

  // ?ì‹œê·¼ë¡œ???°ì • ?€???íƒœ:
  //   active, docs_incomplete, terminate_pending ???¬í•¨ (?„ì¬ ê·¼ë¡œê´€ê³?? ì?)
  //   pending, renewal_pending ???œì™¸ (ê³„ì•½ ?œì‘??ë¯¸ë„??
  const VALID_ST = new Set([CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.DOCS_INCOMPLETE, CONTRACT_STATUS.TERMINATE_PENDING]);
  const monthStart = new Date(yr, mo-1, 1);
  const monthEnd   = new Date(yr, mo, 0);   // ë§ì¼
  const totalDays  = monthEnd.getDate();

  // ???¬ì— ? íš¨ ê³„ì•½??ê±¸ì³?ˆëŠ” ê·¼ë¡œ??ëª©ë¡ (ì§ì›ë³?ìµœì‹  ê³„ì•½ 1ê±?
  // ???€?œì ë³¸ì¸(is_representative=1)Â·?±ê¸°?„ì›Â·?¹ìˆ˜ê´€ê³„ì¸?€ ?ì‹œê·¼ë¡œ???˜ì—???œì™¸
  const coData = (allCompanies||[]).find(c => c.id === coId);
  let repNames = [];
  if(coData){
    try { const reps = typeof coData.representatives === 'string' ? JSON.parse(coData.representatives) : (coData.representatives || []); repNames = (Array.isArray(reps) ? reps : []).map(r => r.name).filter(Boolean); } catch(e){}
  }
  const execNames = (allExecutives||[]).filter(e => e.company_id === coId).map(e => e.name).filter(Boolean);
  const relNames  = (allRelatedParties||[]).filter(r => r.company_id === coId).map(r => r.name).filter(Boolean);
  const excludedNames = new Set([...repNames, ...execNames, ...relNames]);
  const repEmpIds = new Set(
    (allEmployees||[]).filter(e => e.company_id === coId && (e.is_representative || excludedNames.has(e.name))).map(e => e.id)
  );
  const empContractMap = new Map();
  (allContracts||[])
    .filter(c =>
      c.company_id === coId &&
      !c.is_draft && !c.is_voided_by_amend &&
      VALID_ST.has(c.status) &&
      !repEmpIds.has(c.employee_id)
    )
    .sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))
    .forEach(c => {
      if(!empContractMap.has(c.employee_id)) empContractMap.set(c.employee_id, c);
    });

  // ê°?? ì§œë³?ê·¼ë¬´ ?¸ì› ê³„ì‚°
  // dayWorkers[d] = dë²ˆì§¸ ??1-based) ê·¼ë¬´ ?¸ì› ??
  const dayWorkers = new Array(totalDays+1).fill(0);
  empContractMap.forEach(c => {
    const cs = c.contract_start ? new Date(c.contract_start) : monthStart;
    // ?´ì??ˆì •: ê·¼ë¡œê´€ê³?ì¢…ë£Œ?¼ì? terminate_date ê¸°ì?
    const ce = c.status === CONTRACT_STATUS.TERMINATE_PENDING
      ? (c.terminate_date ? new Date(c.terminate_date) : monthEnd)
      : (c.contract_end ? new Date(c.contract_end) : monthEnd);
    for(let d = 1; d <= totalDays; d++){
      const day = new Date(yr, mo-1, d);
      if(day >= cs && day <= ce) dayWorkers[d]++;
    }
  });

  // ê°€???¼ìˆ˜: 1ëª??´ìƒ ê·¼ë¬´????
  let operDays       = 0;
  let totalPersonDays= 0;
  let daysOver5      = 0;   // 5???´ìƒ ê·¼ë¬´??????
  for(let d = 1; d <= totalDays; d++){
    if(dayWorkers[d] > 0){
      operDays++;
      totalPersonDays += dayWorkers[d];
      if(dayWorkers[d] >= 5) daysOver5++;
    }
  }

  if(operDays === 0) return NONE;

  // ?ì‹œê·¼ë¡œ????= ?°ì¸??Ã· ê°€?™ì¼??
  const headcount = totalPersonDays / operDays;

  // 5???´ìƒ ?¹ë?: ê°€?™ì¼??50% ì´ˆê³¼ ???™ì•ˆ 5???´ìƒ?´ë©´ 5???´ìƒ ?¬ì—…??
  const specialOver5 = daysOver5 > operDays / 2;

  const isSmall = headcount < 5 && !specialOver5;
  return { isSmall, headcount, operDays, totalPersonDays, daysOver5 };
}

/** ê°„í¸ ?˜í¼: true = 5??ë¯¸ë§Œ */
function _getPISmallFirm(coId, yr, mo){
  return _getPISmallFirmInfo(coId, yr, mo).isSmall;
}

/**
 * 5??ë¯¸ë§Œ ?ì • ê²°ê³¼ë¥?#pi-small-firm-badge ë°°ì???ë°˜ì˜.
 * calcPI() / calcPIWorkActual() ?‘ìª½?ì„œ ê³µí†µ ?¸ì¶œ.
 * @param {Object} sfInfo  _getPISmallFirmInfo() ë°˜í™˜ê°?
 * @param {number} yr      ê¸‰ì—¬ ?°ë„
 * @param {number} mo      ê¸‰ì—¬ ??
 */
function _updatePISmallFirmBadge(sfInfo, yr, mo){
  const badge = document.getElementById('pi-small-firm-badge');
  if(!badge) return;
  if(!yr || !mo || !sfInfo){
    badge.style.display = 'none';
    return;
  }
  const { isSmall, headcount, operDays, totalPersonDays, daysOver5 } = sfInfo;
  const hcStr = (typeof headcount === 'number' && !isNaN(headcount))
    ? headcount.toFixed(2)
    : '-';
  if(isSmall){
    badge.style.display = '';
    badge.innerHTML =
      `<span style="color:#b45309;font-weight:700;">??5??ë¯¸ë§Œ ?¬ì—…??/span>` +
      `<span style="color:#92400e;margin-left:6px;">` +
        `?ì‹œê·¼ë¡œ????<strong>${hcStr}ëª?/strong>` +
        ` (?°ì¸??${totalPersonDays}ëª?Ã· ê°€??${operDays}??` +
        ` ???°ì¥Â·?¼ê°„Â·?´ì¼ <strong>ê°€?°ìˆ˜??ë¯¸ì ??/strong> Â· ?´ì—…?˜ë‹¹ <strong>ë©´ì œ</strong>` +
      `</span>`;
  } else {
    badge.style.display = '';
    let reason = '';
    if(daysOver5 > operDays / 2){
      reason = ` (5?¸â†‘ ê·¼ë¬´??${daysOver5}??> ê°€?™ì¼ ${operDays}?¼ì˜ 50% ???¹ë? ?ìš©)`;
    } else {
      reason = ` (?ì‹œ ??${hcStr}ëª?`;
    }
    badge.innerHTML =
      `<span style="color:#166534;font-weight:700;">??5???´ìƒ ?¬ì—…??{reason}</span>` +
      `<span style="color:#14532d;margin-left:6px;">` +
        `?°ì¥ Ã—1.5 &nbsp;Â·&nbsp; ?¼ê°„ Ã—0.5 &nbsp;Â·&nbsp; ?´ì¼ 8h?“Ã?.5 / 8h?‘Ã?.0` +
      `</span>`;
  }
}

// ?€?€?€ ì£¼íœ´?˜ë‹¹ ?ë™ê³„ì‚° ?€?€?€
/**
 * ì¶œê·¼?¼ìˆ˜(workDays) ê¸°ë°˜ ì£¼íœ´?˜ë‹¹ ê³„ì‚°.
 * ê³„ì•½?œì˜ work_days_per_week, work_hours_per_day, hourly_wage ?¬ìš©.
 *
 * ê·œì¹™:
 *  - ?¼ìš©ì§? ì£¼íœ´?˜ë‹¹ ?†ìŒ (0)
 *  - 1ì£??Œì •ê·¼ë¡œ?œê°„ < 15h: ì£¼íœ´?˜ë‹¹ ?†ìŒ (0)
 *  - ì£?5???Œì •ê·¼ë¡œ?œê°„ 40h ?´ìƒ): 8h Ã— ?œê¸‰ / ì£?Ã— ì£¼ìˆ˜
 *  - ì£?5??ë¯¸ë§Œ(15h ??ì´ê·¼ë¡œì‹œê°?< 40h): (1ì£?ì´ê·¼ë¡œì‹œê°?Ã· 5) Ã— ?œê¸‰ / ì£?Ã— ì£¼ìˆ˜
 *
 * ì£¼ìˆ˜ ?°ì •: workDays Ã· dpw  (?˜ë¨¸ì§€ < dpw?´ë©´ ?´ë‹¹ ì£¼ëŠ” ê²°ê·¼ ê°„ì£¼ ??floor)
 *
 * @returns {{ pay: number, desc: string }}
 */
function calcWeeklyHolidayPay(){
  const el   = document.getElementById('pi-weekly-hol');       // hidden input (DB ?€?¥Â·calcPI??
  const disp = document.getElementById('pi-weekly-hol-disp'); // ?¨ë„ ?œì‹œ span
  const desc = document.getElementById('pi-weekly-hol-desc'); // ?°ì¶œ?´ì—­ ?ìŠ¤??

  const _setAll = (pay, dText) => {
    if(el)   setAmountVal('pi-weekly-hol', pay);
    if(disp) disp.textContent = won(pay);
    if(desc) desc.textContent = dText;
  };

  if(!piContract){
    _setAll(0, '');
    return { pay: 0, desc: '', retroBrokenWeeks: 0, retroHolidayOverpay: 0 };
  }

  const isDaily = piContract.contract_type === CONTRACT_TYPE.DAILY;
  const hw        = parseFloat(piContract.hourly_wage)       || 0;
  const hpd       = parseFloat(piContract.work_hours_per_day)|| 8;   // ???Œì •ê·¼ë¡œ?œê°„
  // ?¼ìš©ì§? work_days_per_week ?†ìœ¼ë©??¤ì œ ê·¼ë¡œ??ê¸°ì??¼ë¡œ ì¶”ì • (ê¸°ë³¸ 5??
  const dpw       = isDaily
    ? (parseFloat(piContract.work_days_per_week) || 5)
    : (parseFloat(piContract.work_days_per_week) || 5);
  const weeklyH   = hpd * dpw;                                         // 1ì£??Œì •ê·¼ë¡œ?œê°„
  const workDays  = parseFloat(document.getElementById('pi-work-days')?.value || 0) || 0;

  // 15?œê°„ ë¯¸ë§Œ ?¨ì‹œê°? ì£¼íœ´?˜ë‹¹ ?†ìŒ
  if(weeklyH < 15){
    const d = `ì£??Œì • ${weeklyH}h < 15h ??ì£¼íœ´ ?†ìŒ`;
    _setAll(0, d);
    return { pay: 0, desc: d };
  }

  // ?€?€ ì£??¨ìœ„ ?„ì „ê·¼ë¬´ ê²€ì¦? ê°?ì£¼ì˜ ?Œì •ê·¼ë¡œ?¼ì„ ëª¨ë‘ ì¶œê·¼??ì£¼ë§Œ ì£¼íœ´?˜ë‹¹ ë°œìƒ ?€?€
  // ë¬´ë‹¨ê²°ê·¼Â·ë¬´ê¸‰ë³‘ê?Â·?ë¦¬Â·ê°€ì¡±ëŒë´???ë¬´ê¸‰ ?´ê?ê°€ ?˜ë£¨?¼ë„ ?ˆëŠ” ì£¼ëŠ” ì£¼íœ´ ë¯¸ë°œ??
  // ?°ì¬Â·?¡ì•„?´ì§Â·ì¶œì‚°?´ê? ??êµ??/ê³µë‹¨ ì§€ê¸‰ë¶„?€ ì£¼íœ´ ì°¨ê° ?€?ì—???œì™¸
  const _ppStart = document.getElementById('pi-pay-period-start')?.value || '';
  const _ppEnd   = document.getElementById('pi-pay-period-end')?.value   || '';

  // ë¬´ê¸‰ ?´ê???ì§‘í•© (ì£¼íœ´ ì°¨ê° ?€?? unauthorized, sick_unpaid, menstrual, family_care, sick_paid)
  // ??sick_paid(? ê¸‰ë³‘ê?)??ê·¼ë¡œ?œê³µ ?˜ë¬´ê°€ ë©´ì œ?˜ë?ë¡?ì£¼íœ´ ë¯¸ë°œ???€??
  const _holidayDeductTypes = new Set(['unauthorized', 'sick_unpaid', 'menstrual', 'family_care', 'sick_paid']);
  let _absentDatesForHoliday = new Set();
  let _retroAbsentDatesForHoliday = new Set(); // ?Œê¸‰ ê²°ê·¼ë§?ë³„ë„ ì¶”ì  (ì£¼íœ´ ê³¼ì?ê¸??˜ìˆ˜??
  const _parseAbsentDataForHoliday = (dataEl, targetSet) => {
    try {
      const data = JSON.parse(dataEl?.value || '[]');
      data.forEach(d => {
        if (_holidayDeductTypes.has(d.type || 'unauthorized')) {
          const expanded = (typeof _atlExpandDateRange === 'function')
            ? _atlExpandDateRange(d.date, d.dateTo || '')
            : [d.date];
          expanded.forEach(dd => targetSet.add(dd));
        }
      });
    } catch(e) {}
  };
  _parseAbsentDataForHoliday(document.getElementById('pi-absent-data'), _absentDatesForHoliday);
  _parseAbsentDataForHoliday(document.getElementById('pi-retro-absent-data'), _retroAbsentDatesForHoliday);
  // ?„ì²´ ì§‘í•© (?„í–‰+?Œê¸‰) ??ì£¼íœ´ ?°ì •??
  const _allAbsentDatesForHoliday = new Set([..._absentDatesForHoliday, ..._retroAbsentDatesForHoliday]);

  let fullWeeks = 0;
  if (_ppStart && _ppEnd && dpw > 0) {
    // ì£??¨ìœ„ ?œíšŒ: ê¸‰ì—¬?°ì •ê¸°ê°„ ??ê°???£¼(????ë³??Œì •ê·¼ë¡œ??ì¶©ì¡± ?¬ë? ê²€??
    const _periodStart = new Date(_ppStart);
    const _periodEnd   = new Date(_ppEnd);
    // ì²?ì£¼ì˜ ?”ìš”?¼ë¡œ ?•ë ¬ (ISO week ê¸°ì? ?”ìš”??1)
    let _weekStart = new Date(_periodStart);
    const _startDow = _weekStart.getDay() || 7; // ??1 ... ??7
    if (_startDow > 1) _weekStart.setDate(_weekStart.getDate() - (_startDow - 1)); // ì§€???”ìš”?¼ë¡œ

    while (_weekStart <= _periodEnd) {
      let _weekWorkDays = 0, _weekAbsentDays = 0, _weekRetroAbsentDays = 0;
      for (let d = 0; d < 7; d++) {
        const _day = new Date(_weekStart);
        _day.setDate(_day.getDate() + d);
        if (_day < _periodStart || _day > _periodEnd) continue; // ê¸‰ì—¬ê¸°ê°„ ë°?

        const _dow = _day.getDay(); // 0=??... 6=??
        const _isWorkDay = dpw >= 6 ? (_dow !== 0) : (_dow !== 0 && _dow !== 6);
        if (!_isWorkDay) continue;

        _weekWorkDays++;
        const _dateStr = _day.toISOString().slice(0, 10);
        if (_allAbsentDatesForHoliday.has(_dateStr)) _weekAbsentDays++;
        if (_retroAbsentDatesForHoliday.has(_dateStr)) _weekRetroAbsentDays++;
      }

      // ì£¼ì˜ ?Œì •ê·¼ë¡œ?¼ì´ dpw(ë³´í†µ 5?? ?´ìƒ?´ê³ , ë¬´ê¸‰ ?´ê?ê°€ ?˜ë‚˜???†ìœ¼ë©??„ì „ê·¼ë¬´ ì£?
      if (_weekWorkDays >= dpw && _weekAbsentDays === 0) {
        fullWeeks++;
      } else if (_weekWorkDays >= dpw && _weekAbsentDays > 0 && _weekRetroAbsentDays > 0) {
        // ?„í–‰ ê²°ê·¼ë§Œìœ¼ë¡œëŠ” ??ê¹¨ì¡Œ?”ë° ?Œê¸‰ ê²°ê·¼ ?Œë¬¸??ê¹¨ì§„ ì£???ê³¼ì?ê¸??˜ìˆ˜ ?€??
        const _absNonRetro = _weekAbsentDays - _weekRetroAbsentDays;
        if (_absNonRetro === 0) retroBrokenWeeks++;
      }

      // ?¤ìŒ ì£¼ë¡œ ?´ë™
      _weekStart.setDate(_weekStart.getDate() + 7);
    }
  } else {
    // ê¸‰ì—¬?°ì •ê¸°ê°„ ?•ë³´ ?†ìœ¼ë©?ê¸°ì¡´ ???¨ìœ„ floorë¡??´ë°±
    fullWeeks = Math.floor(workDays / dpw);
  }

  let payPerWeek, formula;
  if(weeklyH >= 40){
    // ì£?40h ?´ìƒ(ì£?5??: 8h Ã— ?œê¸‰
    payPerWeek = Math.round(8 * hw);
    formula = `8hÃ—${hw.toLocaleString()}??h`;
  } else {
    // ?¨ì‹œê°?15h ??ì£¼XXh < 40h): (ì£¼ê°„ê·¼ë¡œ?œê°„ Ã· 5) Ã— ?œê¸‰
    // ê·¼ê±°: ê·¼ë¡œê¸°ì?ë²???8ì¡??????Œë‹¨?œê°„ê·¼ë¡œ??ì£¼íœ´ = (ì£¼ì†Œ?•ê·¼ë¡œì‹œê°„Ã?0) Ã— 8 Ã— ?œê¸‰??
    //   ??weeklyHÃ·40Ã—8 = weeklyHÃ·5 (?˜í•™???™ì¹˜) ???´ëŠ ?ìœ¼ë¡?ê³„ì‚°?´ë„ ê²°ê³¼ ?™ì¼
    const proH = weeklyH / 5;
    payPerWeek = Math.round(proH * hw);
    formula = `(${weeklyH}hÃ·5)Ã—${hw.toLocaleString()}??h=${Math.round(proH*10)/10}hÃ—?œê¸‰`;
  }

  const totalPay = payPerWeek * fullWeeks;
  const retroHolidayOverpay = payPerWeek * retroBrokenWeeks; // ?Œê¸‰ ê²°ê·¼?¼ë¡œ ê³¼ì?ê¸‰ëœ ì£¼íœ´?˜ë‹¹
  const d = fullWeeks > 0
    ? `${formula} Ã— ${fullWeeks}ì£?= ${totalPay.toLocaleString()}??
    : `ì¶œê·¼ ${workDays}?????„ì „??ì£??†ìŒ (ë¯¸ë°œ??`;
  const retroNote = retroBrokenWeeks > 0
    ? ` (?Œê¸‰ ê²°ê·¼ ${retroBrokenWeeks}ì£¼ë¶„ ê³¼ì?ê¸?${won(retroHolidayOverpay)} ?˜ìˆ˜ ?„ìš”)`
    : '';

  _setAll(totalPay, d + retroNote);
  return { pay: totalPay, desc: d, retroBrokenWeeks, retroHolidayOverpay };
}

// ?€?€?€ ?µìƒ?„ê¸ˆ ì§€ê¸‰ìœ ??ê´€ë¦??€?€?€
// 'fixed'=ë§¤ì›” ?•ê¸°ì§€ê¸??µìƒ?„ê¸ˆ ?¬í•¨), 'daily'=ì¶œê·¼?¼ìˆ˜???°ë¦„(?µìƒ?„ê¸ˆ ?œì™¸), ''=ë¯¸ì„ ??
const _piPayTypes = { transport:'', meal:'', childcare:'', research:'', communication:'', fitness:'', self_dev:'', book:'', overseas:'' };
// loadPIContract() ?¤í–‰ ì¤?setPIPayType()??calcPI() ì¤‘ë³µ ?¸ì¶œ ë°©ì? ?Œë˜ê·?
let _piContractLoading = false;

// ?€?€?€ ì°¨ëŸ‰êµí†µë¹? ?ê??´ì „ë³´ì¡°ê¸?self_driving)ë§??¬ìš© ?€?€?€

/** JS fieldëª??¸ë”?¤ì½”?? ??HTML id???˜ì´??ë³€???¬í¼ */
function _piFieldToHtmlId(field){ return field.replace(/_/g, '-'); }

function setPIPayType(field, type){
  // ?´ë? ?íƒœë§?ê°±ì‹  (selectÂ·badge UI ?”ì†Œ ?? œ??
  _piPayTypes[field] = type;
  // ì§€ê¸‰ìœ ??ë³€ê²???std ?¬ê³„??(loadPIContract ?¤í–‰ ì¤‘ì—???¤í‚µ ??ë§ˆì?ë§‰ì— ?¼ê´„ calcPI ?¸ì¶œ)
  if(!_piContractLoading) calcPI();
}

function _getPIPayTypeVal(field){
  // 'fixed'=?µìƒ?„ê¸ˆ ?¬í•¨, 'daily'=?œì™¸, ''=ë¯¸ì„ ???€??ë¶ˆê?)
  return _piPayTypes[field] ?? '';
}

function _resetPIPayTypes(){
  ['transport','meal','childcare','research','communication','fitness','self_dev','book','overseas'].forEach(f=>{
    _piPayTypes[f] = '';
    setPIPayType(f, '');
  });
}

// ?€?€ ?Œì‚¬ë³?allowance_config ê¸°ë°˜ ê¸‰ì—¬ ?…ë ¥ ??ª© show/hide ?€?€
// ???…ë ¥ ?œì„œ: ?µìƒ?„ê¸ˆ(ordinaryGroup) ë¨¼ì? ??ê³ ì •?˜ë‹¹(fixedGroup) ?˜ì¤‘
const _PI_OPT_ROWS = [
  // ?€?€ ?µìƒ?„ê¸ˆ ?¤ì • ê·¸ë£¹ ?€?€
  { key:'site',          rowId:'pi-row-site' },
  { key:'position',      rowId:'pi-row-position' },
  { key:'skill',         rowId:'pi-row-skill' },
  { key:'license',       rowId:'pi-row-license' },
  { key:'hazard',        rowId:'pi-row-hazard' },
  { key:'remote_area',   rowId:'pi-row-remote-area' },
  { key:'regular_bonus', rowId:'pi-row-bonus' },
  // ?€?€ ê³ ì •?˜ë‹¹ ?¤ì • ê·¸ë£¹ ?€?€
  { key:'childcare',     rowId:'pi-row-childcare', ptField:'childcare' },
  { key:'research',      rowId:'pi-row-research',      ptField:'research' },
  { key:'communication', rowId:'pi-row-communication', ptField:'communication' },
  { key:'fitness',       rowId:'pi-row-fitness',       ptField:'fitness' },
  { key:'self_dev',      rowId:'pi-row-self-dev',      ptField:'self_dev' },
  { key:'book',          rowId:'pi-row-book',           ptField:'book' },
  { key:'overseas',      rowId:'pi-row-overseas',       ptField:'overseas' },
];

/** ë¹„ì •ê¸?ì§€ê¸??¹ì…˜?¼ë¡œ ?´ë™?˜ëŠ” ??ª©???œê? ?ˆì´ë¸?*/
const _PI_IRREGULAR_LABELS = {
  childcare:     'ë³´ìœ¡?˜ë‹¹',
  car:           'ì°¨ëŸ‰ì§€?ë¹„',
  meal:          '?ë?',
  research:      '?°êµ¬?œë™ë¹?,
  communication: '?µì‹ ë¹?,
  fitness:       'ì²´ë ¥ì¦ì§„ë¹?,
  self_dev:      '?ê¸°ê³„ë°œë¹?,
  book:          '?„ì„œì§€?ë¹„',
  overseas:      '?´ì™¸ê·¼ë¬´?˜ë‹¹',
};

/**
 * _piPayTypes ?„ì¬ ?íƒœ ê¸°ë°˜?¼ë¡œ daily/receipt ??ª©??
 * ë¹„ì •ê¸?ì§€ê¸??¹ì…˜(#pi-irregular-dynamic-rows)?¼ë¡œ ?´ë™ ?Œë”ë§?
 *
 * - cfgê°€ ?„ë‹Œ _piPayTypesë¥?ê¸°ì??¼ë¡œ ?™ì‘?˜ë?ë¡?
 *   loadPIContract / editPayroll ?ì„œ setPIPayType ?¸ì¶œ??ëª¨ë‘ ?ë‚œ
 *   ?¤ì— 1???¤í–‰?˜ë©´ ??ƒ ?¬ë°”ë¥??„ì¹˜??ë°°ì¹˜?œë‹¤.
 * - ë¯¸ì²´????ª©(row.style.display === 'none')?€ ?´ë™ ?€?ì—???œì™¸.
 */
function _renderPIIrregularRows(){
  const container = document.getElementById('pi-irregular-dynamic-rows');
  if(!container) return;

  // ?´ì „???´ë™???‰ì„ ëª¨ë‘ ?ë˜ ?ë¦¬(ê³„ì•½ ?´ìš© ?¹ì…˜)ë¡?ë³µì›
  container.querySelectorAll('.pi-row[data-irregular-moved]').forEach(row => {
    // ë±ƒì? ?œê±°
    const oldBadge = row.querySelector('.pi-irreg-pt-badge');
    if(oldBadge) oldBadge.remove();

    const originId = row.dataset.irregularOrigin;
    const anchor   = originId && document.getElementById(originId);
    if(anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
    }
    row.removeAttribute('data-irregular-moved');
    row.removeAttribute('data-irregular-origin');
  });

  // _piPayTypes ê¸°ì?: daily/receipt ??ì²´í¬(?¸ì¶œ) ??ª©??ë¹„ì •ê¸??¹ì…˜?¼ë¡œ ?´ë™
  _PI_OPT_ROWS.forEach(({ rowId, ptField }) => {
    if(!ptField) return;                    // pay_type ?†ëŠ” ??ª©(site ?? ?œì™¸
    const pt = _piPayTypes[ptField] || '';
    if(pt !== 'daily' && pt !== 'receipt') return;  // fixed/ë¯¸ì„ ?ì? ?•ê¸° ?¹ì…˜ ? ì?

    const row = document.getElementById(rowId);
    if(!row || row.style.display === 'none') return;  // ë¯¸ì²´???¨ê?) ??ª© ?œì™¸

    // ?´ì „ ?•ì œ ?”ì†Œ id ë¥?anchor ë¡?ê¸°ë¡ (ë³µì›??
    const prevSib = row.previousElementSibling;
    row.dataset.irregularOrigin = prevSib?.id || '';
    row.dataset.irregularMoved  = '1';

    // ?ˆì´ë¸???ë±ƒì? ì¶”ê? (ì§€ê¸‰ìœ ???œê¸°)
    const label = row.querySelector('label');
    if(label && !label.querySelector('.pi-irreg-pt-badge')){
      const badgeText = pt === 'receipt' ? '?ìˆ˜ì¦?ì²?µ¬' : 'ì¶œê·¼?¼ìˆ˜???°ë¦„';
      const badge = document.createElement('span');
      badge.className = 'pi-irreg-pt-badge';
      badge.textContent = badgeText;
      badge.style.cssText = 'font-size:10px;font-weight:400;color:#6b7280;background:#f3f4f6;border-radius:4px;padding:1px 6px;margin-left:4px;vertical-align:middle;white-space:nowrap;';
      label.appendChild(badge);
    }

    // ë¹„ì •ê¸?ì§€ê¸??¹ì…˜?¼ë¡œ ?´ë™
    container.appendChild(row);
    row.style.display = '';  // ë°˜ë“œ???¸ì¶œ
  });
}

/**
 * ê³ ê°??allowance_config ê¸°ë°˜?¼ë¡œ ?µì…”????ª© show/hide + pay_type ê¸°ë³¸ê°??ìš©.
 *
 * - cfg ê°€ null/undefined ?´ê±°??allowance_config ê°€ ?†ëŠ” êµ¬ë²„??ê³ ê°?¬ì´ë©?
 *   ëª¨ë“  ?µì…”????ª©???¨ê? ì²˜ë¦¬?œë‹¤ (ì²´í¬????ª©ë§??¸ì¶œ ?ì¹™).
 * - cfg ê°€ ?ˆìœ¼ë©?cfg[key] === true ????ª©ë§??¸ì¶œ.
 * - pay_type ??daily/receipt ????ª©?€ ë¹„ì •ê¸?ì§€ê¸??¹ì…˜?¼ë¡œ ?´ë™.
 *
 * @param {object|null} cfg  allCompanies[*].allowance_config
 */
function applyPIAllowanceConfig(cfg){
  // ?¼ìš©ì§? ?µìƒ?„ê¸ˆÂ·ê³ ì •?˜ë‹¹ ??ª© ?„ì²´ ?¨ê? (cfg ë¬´ì‹œ)
  const isPI_Daily = piContract && piContract.contract_type === CONTRACT_TYPE.DAILY;
  
  // ??ê³„ì•½ ?´ìš© ?¹ì…˜ show/hide + pay_type ê¸°ë³¸ê°??¸íŒ…
  _PI_OPT_ROWS.forEach(({ key, rowId, ptField }) => {
    const row = document.getElementById(rowId);
    const visible = isPI_Daily ? false : !!(cfg && cfg[key]);
    if(row) row.style.display = visible ? '' : 'none';
    if(ptField){
      const defaultPt = (visible && !isPI_Daily)
        ? (cfg[`${key}_pay_type`] || 'fixed')
        : '';
      setPIPayType(ptField, defaultPt);
    }
  });
  // ???¬ìš©???•ì˜ ?µìƒ?„ê¸ˆ ??ª© ?Œë”ë§?(?¼ìš©ì§??œì™¸)
  if(!isPI_Daily) _renderPICustomOrdinaryRows(cfg);
  else {
    const container = document.getElementById(_PI_CUSTOM_ORD_CONTAINER);
    if(container){ container.style.display = 'none'; container.querySelectorAll('.pi-custom-ord-row').forEach(r => r.remove()); }
  }
}

// ?€?€ ê¸‰ì—¬ ?…ë ¥: ?¬ìš©???•ì˜ ?µìƒ?„ê¸ˆ ??ª© ?€?€
const _PI_CUSTOM_ORD_CONTAINER = 'pi-custom-ord-container';
let _piCustomOrdCount = 0;

function _renderPICustomOrdinaryRows(cfg){
  let container = document.getElementById(_PI_CUSTOM_ORD_CONTAINER);
  if(!container){
    const refRow = document.getElementById('pi-row-license');
    if(!refRow) return;
    container = document.createElement('div');
    container.id = _PI_CUSTOM_ORD_CONTAINER;
    refRow.parentNode.insertBefore(container, refRow.nextSibling);
  }
  container.querySelectorAll('.pi-custom-ord-row').forEach(r => r.remove());
  _piCustomOrdCount = 0;

  const items = (cfg && Array.isArray(cfg._custom_ordinary)) ? cfg._custom_ordinary : [];
  if(!items.length){ container.style.display = 'none'; return; }
  container.style.display = '';

  items.forEach(item => {
    if(!item || !item.name) return;
    const idx = _piCustomOrdCount++;
    const div = document.createElement('div');
    div.className = 'pi-row pi-custom-ord-row';
    div.id = `pi-row-custom-ord-${idx}`;
    div.style.display = '';
    div.innerHTML = `
      <label>${item.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</label>
      <input type="text" inputmode="numeric" id="pi-custom-ord-${idx}" data-amount oninput="onAmountInput(this,calcPI)" />
    `;
    container.appendChild(div);
  });
}

/** ê¸‰ì—¬ ?…ë ¥ ??ì»¤ìŠ¤?€ ?µìƒ?„ê¸ˆ ê°??˜ì§‘ */
function _getPICustomOrdinaryValues(){
  const items = [];
  for(let i = 0; i < _piCustomOrdCount; i++){
    const nameEl = document.querySelector(`#pi-row-custom-ord-${i} label`);
    const amtEl  = document.getElementById(`pi-custom-ord-${i}`);
    const name = nameEl ? nameEl.textContent.trim() : '';
    const amount = (() => { const v=(amtEl?.value||'').replace(/[^\d]/g,''); return parseInt(v)||0; })();
    if(name) items.push({ name, amount });
  }
  return items;
}

/**
 * ê¸‰ì—¬ ?˜ì • ëª¨ë“œ?ì„œ ?´ë? ê°’ì´ ?…ë ¥???µì…”????ª©?€
 * allowance_config ??ì²´í¬ ?¬ë??€ ë¬´ê??˜ê²Œ ê°•ì œ ?¸ì¶œ.
 * applyPIAllowanceConfig() ?¸ì¶œ ì§í›„???¬ìš©.
 *
 * @param {object} p  payroll ?ˆì½”??ê°ì²´
 */
function _forceShowNonZeroPIRows(p){
  // key ??ê¸‰ì—¬ ?ˆì½”???„ë“œëª?ë§¤í•‘ (communication DB ?„ë“œ??communication_pay)
  const _fieldMap = {
    regular_bonus: ['bonus_pay'],          // ê¸‰ì—¬ ?ˆì½”?œì˜ bonus_pay ?„ë“œ
    site        : ['site_allowance'],
    position    : ['position_allowance'],
    skill       : ['skill_allowance'],
    license     : ['license_allowance'],
    hazard      : ['hazard_allowance'],
    remote_area : ['remote_area_allowance'],
    research    : ['research_allowance'],
    communication: ['communication_pay'],
    fitness     : ['fitness_allowance'],
    self_dev    : ['self_dev_allowance'],
    book        : ['book_allowance'],
    overseas    : ['overseas_allowance'],
    childcare   : ['childcare_allowance'],
  };
  _PI_OPT_ROWS.forEach(({ key, rowId }) => {
    const fields = _fieldMap[key] || [];
    const hasValue = fields.some(f => Number(p[f] || 0) > 0);
    if(hasValue){
      const row = document.getElementById(rowId);
      if(row) row.style.display = '';
    }
  });
}

/**
 * ê³„ì•½??ê¸ˆì•¡??0(?ëŠ” ë¯¸ì…?????•ê¸°ì§€ê¸?fixed) ?µì…”????ª©???¨ê?.
 * - ë³´ìœ¡?˜ë‹¹(childcare)?€ ë§¤ì›” ì§ì ‘ ?…ë ¥ ??ª©?´ë?ë¡??œì™¸.
 * - daily/receipt ??ª©?€ _renderPIIrregularRows()ê°€ ë³„ë„ ì²˜ë¦¬?˜ë?ë¡??œì™¸.
 * - applyPIAllowanceConfig() + ê³„ì•½??ê°??¸íŒ… ?´í›„, _renderPIIrregularRows() ?´ì „???¸ì¶œ.
 */
function _hideZeroContractPIRows(){
  if(!piContract) return;
  // key ??ê³„ì•½??piContract) ?„ë“œëª?ë§¤í•‘
  const _ctFieldMap = {
    regular_bonus: 'regular_bonus',
    site:          'site_allowance',
    position:      'position_allowance',
    skill:         'skill_allowance',
    license:       'license_allowance',
    remote_area:   'remote_area_allowance',
    research:      'research_allowance',
    communication: 'communication_allowance',
    fitness:       'fitness_allowance',
    self_dev:      'self_dev_allowance',
    book:          'book_allowance',
    overseas:      'overseas_allowance',
  };
  _PI_OPT_ROWS.forEach(({ key, rowId, ptField }) => {
    if(key === 'childcare') return;  // ë³´ìœ¡?˜ë‹¹: ë§¤ì›” ì§ì ‘ ?…ë ¥ ???œì™¸
    const ctField = _ctFieldMap[key];
    if(!ctField) return;
    const ctAmt = parseFloat(piContract[ctField] || 0);
    if(ctAmt > 0) return;  // ê³„ì•½??ê¸ˆì•¡ ?ˆìœ¼ë©?ê·¸ë?ë¡??œì‹œ
    // ê³„ì•½??ê¸ˆì•¡ 0 ???¨ê? (?? daily/receipt ??ª©?€ _renderPIIrregularRowsê°€ ì²˜ë¦¬)
    const pt = ptField ? (_piPayTypes[ptField] || '') : '';
    if(pt === 'daily' || pt === 'receipt') return;  // ë¹„ì •ê¸???ª©?€ ê±´ë“œë¦¬ì? ?ŠìŒ
    const row = document.getElementById(rowId);
    if(row) row.style.display = 'none';
  });
}

// ?€?€ ì°¨ëŸ‰êµí†µë¹?ê°??½ê¸° ?¬í¼ (? íƒ????ª©??ê¸ˆì•¡ ë°˜í™˜) ?€?€
function _getPITransportAmount(){
  return gv('pi-transport');
}
// ?€?€ ì°¨ëŸ‰êµí†µë¹„ë? ê°?DB ?„ë“œ??ë§¤í•‘??{field: value} ë°˜í™˜ ?€?€
// ???ê??´ì „ë³´ì¡°ê¸?self_driving)ë§??¬ìš© (?€ì¤‘êµ?µë¹„ transportation ë¯¸ì???
function _getPITransportFields(amount){
  const amt = (amount !== undefined) ? amount : _getPITransportAmount();
  const pt  = _getPIPayTypeVal('transport');
  return {
    transportation_allowance: 0,
    transportation_pay_type:  'fixed',
    self_driving_allowance:   amt,
    self_driving_pay_type:    pt || 'fixed',
    transport_type:           'self_driving',
  };
}

// ?€?€ ê³„ì•½??ê³ ì • ??ª© readonly ? ê? ?€?€
// on=true : ê³„ì•½??ê°?ì±„ìš´ ??? ê¸ˆ (?¸ì§‘ ë¶ˆê?)
// on=false: ? ê¸ˆ ?´ì œ (ì§ì› ë¯¸ì„ ??or ê³„ì•½ ?†ì„ ??
const _PI_CONTRACT_FIXED_IDS = [
  // ??'pi-base', 'pi-weekly-hol' ?œì™¸ ???ë™ê³„ì‚° hidden input, _setPIContractReadonly ?€???„ë‹˜
  'pi-site','pi-remote-area','pi-position',
  'pi-transport','pi-meal',
  'pi-research','pi-communication','pi-skill','pi-license',
  'pi-fitness','pi-self-dev','pi-book','pi-overseas'
  // ??'pi-childcare' ?œì™¸ ??ë³´ìœ¡?˜ë‹¹?€ ë§¤ì›” ì§ì ‘ ?…ë ¥ ??ª© (readonly ë¶ˆê?)
];
const _PI_PAY_TYPE_FIELDS = ['transport','meal','childcare','research','communication','fitness','self_dev','book','overseas'];

// input id ??_piPayTypes ????§¤??(pay_type???ˆëŠ” ??ª©ë§?
const _PI_ID_TO_PT_FIELD = {
  'pi-transport':   'transport',
  'pi-meal':        'meal',
  'pi-research':    'research',
  'pi-communication':'communication',
  'pi-fitness':     'fitness',
  'pi-self-dev':    'self_dev',
  'pi-book':        'book',
  'pi-overseas':    'overseas',
};

function _setPIContractReadonly(on){
  // ?…ë ¥ ?„ë“œ ? ê¸ˆ/?´ì œ
  _PI_CONTRACT_FIXED_IDS.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    // daily/receipt ??ª©?€ ê³„ì•½??ê³ ì •ê°’ì´ ?†ìœ¼ë¯€ë¡?? ê¸ˆ ?œì™¸ (ë¹„ì •ê¸??¹ì…˜?ì„œ ì§ì ‘ ?…ë ¥)
    if(on){
      const ptField = _PI_ID_TO_PT_FIELD[id];
      const pt = ptField ? (_piPayTypes[ptField] || '') : '';
      if(pt === 'daily' || pt === 'receipt') return;
    }
    if(on){
      el.readOnly = true;
      el.classList.add('pi-readonly-field');
      el.classList.add('pi-input-locked');
      el._savedOninput = el.getAttribute('oninput') || 'onAmountInput(this,calcPI)';
      el.removeAttribute('oninput');
    } else {
      el.readOnly = false;
      el.classList.remove('pi-readonly-field');
      el.classList.remove('pi-input-locked');
      const saved = el._savedOninput || 'onAmountInput(this,calcPI)';
      el.setAttribute('oninput', saved);
    }

  });

  // ?€?€ ?•ê¸° ?ì—¬ê¸?pi-bonus) ê³„ì•½??ê³ ì •ê°?? ê¸ˆ/?´ì œ ?€?€
  // piContract.regular_bonus > 0 ??ê²½ìš°?ë§Œ ? ê¸ˆ ?ìš©
  (function(){
    const bonusEl    = document.getElementById('pi-bonus');
    const bonusBadge = document.getElementById('pi-bonus-contract-badge');
    const bonusRow   = document.getElementById('pi-row-bonus');
    const hasContractBonus = on && piContract && (parseFloat(piContract.regular_bonus)||0) > 0;
    if(bonusEl){
      if(hasContractBonus){
        bonusEl.readOnly = true;
        bonusEl.classList.add('pi-readonly-field');
        bonusEl.classList.add('pi-input-locked');
        bonusEl._savedOninput = bonusEl.getAttribute('oninput') || 'onAmountInput(this,calcPI)';
        bonusEl.removeAttribute('oninput');
      } else {
        bonusEl.readOnly = false;
        bonusEl.classList.remove('pi-readonly-field');
        bonusEl.classList.remove('pi-input-locked');
        const saved = bonusEl._savedOninput || 'onAmountInput(this,calcPI)';
        bonusEl.setAttribute('oninput', saved);
      }
    }
    if(bonusBadge) bonusBadge.style.display = hasContractBonus ? '' : 'none';

  })();

  // ì§€ê¸‰ìœ ??select ? ê¸ˆ/?´ì œ
  // ??fixed(ë§¤ì›” ?•ê¸°ì§€ê¸? ??ª©?€ select ?ì²´ê°€ ?´ë? ?¨ê²¨ì§€ê³?ë°°ì?ë¡??€ì²´ë˜ë¯€ë¡?
  //   ? ê¸ˆ ?¬ë??€ ë¬´ê??˜ê²Œ select disabled ì²˜ë¦¬??daily/receipt ??ª©?ë§Œ ?ìš©
  _PI_PAY_TYPE_FIELDS.forEach(field=>{
    const ptSel   = document.getElementById(`pi-${_piFieldToHtmlId(field)}-pay-type-select`);
    const ptBadge = document.getElementById(`pi-${_piFieldToHtmlId(field)}-pt-badge`);
    const isFixed = _piPayTypes[field] === 'fixed';
    if(ptSel){
      // fixed ë°°ì?ê°€ ë³´ì´???™ì•ˆ?ëŠ” select ??ƒ ?¨ê? ? ì? (? ê¸ˆ ë¬´ê?)
      if(isFixed){
        ptSel.style.display = 'none';
        ptSel.disabled = false; // ?´ë? ê°’ì? ? ì?, ?¨ê??¼ë¡œ ?¸ì§‘ ì°¨ë‹¨
      } else {
        ptSel.style.display = '';
        ptSel.disabled = on;
      }
    }
    // ë°°ì? ?íƒœ??setPIPayType?ì„œ ?´ë? ?œì–´?˜ë?ë¡??¬ê¸°?œëŠ” ê±´ë“œë¦¬ì? ?ŠìŒ
    // ì°¨ëŸ‰êµí†µë¹???ª© ? íƒ select ? ê¸ˆ
    if(field === 'transport'){
      const tSel = document.getElementById('pi-transport-type-select');
      if(tSel){ tSel.disabled = on; }
    }
  });
}

function clearPIFields(){
  // pi-dependents??ì§ì›ë³?ê³ ì •ê°’ì´ë¯€ë¡??¬ê¸°??ì´ˆê¸°?”í•˜ì§€ ?ŠìŒ (clearPI?ì„œë§?ë¦¬ì…‹)
  ['pi-base','pi-weekly-hol','pi-site','pi-remote-area','pi-position','pi-skill','pi-license','pi-transport','pi-meal','pi-childcare','pi-research','pi-fitness','pi-self-dev','pi-book','pi-overseas',
   'pi-ot-hours','pi-night-hours','pi-hol-hours',
   'pi-annual-pay','pi-bonus','pi-performance','pi-actual-expense','pi-communication','pi-severance-interim','pi-etc-allowance',
   'pi-std-pay','pi-yearend','pi-yearend-memo','pi-health-adj','pi-health-adj-memo','pi-health-adj-retro','pi-advance','pi-work-days','pi-total-hours',
   'pi-pension-fixed','pi-health-fixed','pi-ltcare-fixed','pi-employ-fixed'
  ].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['pi-ot-pay-disp','pi-night-pay-disp','pi-hol-pay-disp',
   'pi-ot-pay-disp-simple','pi-night-pay-disp-simple','pi-hol-pay-disp-simple'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='0??;});
  const _baseDailyEl=document.getElementById('pi-base-daily-disp'); if(_baseDailyEl) _baseDailyEl.textContent='-';
  const _whdDesc=document.getElementById('pi-weekly-hol-desc'); if(_whdDesc) _whdDesc.textContent='';
  const _whdDisp=document.getElementById('pi-weekly-hol-disp'); if(_whdDisp) _whdDisp.textContent='0??;
  const _ppDisp=document.getElementById('pi-pay-period'); if(_ppDisp) _ppDisp.value='';
  const _hwReset=document.getElementById('pi-hourly-wage-disp'); if(_hwReset) _hwReset.textContent='-';
  // ?°ë§?•ì‚°Â·ê¸°í? textarea ë©”ëª¨ ì´ˆê¸°??
  ['pi-health-adj-yearend-memo','pi-ltcare-adj-yearend-memo','pi-yearend-memo','pi-advance-memo']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  // ì§ì „??ë©”ëª¨ ?¸ê³„ ë°°ë„ˆ ?¨ê?
  _hidePrevMemoBanner();
  // ?°ì°¨?˜ë‹¹ ?ë™ê³„ì‚° ì²´í¬ë°•ìŠ¤ ì´ˆê¸°??
  const _autoChkReset=document.getElementById('pi-annual-auto-chk');
  if(_autoChkReset){ _autoChkReset.checked=false; }
  const _annPayReset=document.getElementById('pi-annual-pay');
  if(_annPayReset){ _annPayReset.readOnly=false; _annPayReset.classList.remove('pi-input-readonly'); }
  ['pi-gross-disp','pi-ded-disp','pi-net-disp','pi-gross-disp2','pi-ded-disp2','pi-net-disp2'].forEach(id=>document.getElementById(id).textContent='0??);
  const d1=document.getElementById('pi-ded-detail'); if(d1) d1.innerHTML='';
  const d2=document.getElementById('pi-ded-detail-fixed'); if(d2) d2.innerHTML='';
  // ê²°ê·¼Â·ì¡°í‡´Â·ì§€ê°?ì´ˆê¸°??
  { const _el = document.getElementById('pi-absent-dates'); if(_el){ _el.value = ''; } const _d = document.getElementById('pi-absent-data'); if(_d){ _d.value = '[]'; } }
  { const _el = document.getElementById('pi-earlyleave-data'); if(_el){ _el.value = '[]'; } }
  { const _el = document.getElementById('pi-late-data'); if(_el){ _el.value = '[]'; } }
}
function clearPI(){
  // ?€?€ ì§ì›??? íƒ???íƒœ?¼ë©´ "?…ë ¥ê°?ë¦¬ì…‹" ëª¨ë“œ ?¤í–‰ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  // ?°ì •ê¸°ì?(ê³„ì•½ ?•ë³´), ?•ê¸° ì§€ê¸‰í•­ëª? ?°ì°¨ ?„í™©, ì§ì „??ë©”ëª¨??ê·¸ë?ë¡?ë³´ì¡´.
  // ë¹„ì •ê¸?ì§€ê¸‰í•­ëª©Â·ì •??ì¶”ê?ê³µì œ ê¸ˆì•¡Â·ê·¼ë¡œ ?¤ì ë§?ë§Œê·¼ ê¸°ì??¼ë¡œ ë³µì›.
  const _empId = document.getElementById('pi-employee')?.value;
  if(_empId && piContract){
    _resetPIInputsOnly();
    return;
  }
  // ?€?€ ì§ì› ë¯¸ì„ ???íƒœ: ê¸°ì¡´ ?„ì „ ì´ˆê¸°???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  document.getElementById('pi-employee').value='';
  document.getElementById('pi-contract-card').style.display='none';
  const _depEl=document.getElementById('pi-dependents'); if(_depEl) _depEl.value=0;
  // ?°ì°¨ ë°°ì? ì´ˆê¸°??
  const _alBadge3 = document.getElementById('pi-al-remain-badge');
  if(_alBadge3){ _alBadge3.textContent = '?”ì—¬?°ì°¨: -'; _alBadge3.className = 'pi-al-badge-excluded'; }
  // ê·¼ë¡œ ?¤ì  ?ë™?°ì¶œ ?¨ë„ ì´ˆê¸°??
  const _wp=document.getElementById('pi-work-auto-panel'); if(_wp) _wp.style.display='none';
  const _sw=document.getElementById('pi-ot-pay-simple-wrap'); if(_sw) _sw.style.display='none';
  const _autoLbl=document.getElementById('pi-workdays-auto-label'); if(_autoLbl) _autoLbl.style.display='none';
  // ì§€ê¸‰ì¼ readonly ?´ì œ + ë°°ì? ?¨ê?
  const _pdEl=document.getElementById('pi-paydate');
  if(_pdEl){ _pdEl.readOnly=false; _pdEl.classList.remove('pi-input-locked'); }
  const _pdBadge=document.getElementById('pi-paydate-badge'); if(_pdBadge) _pdBadge.style.display='none';
  _setPIContractReadonly(false); // ? ê¸ˆ ?´ì œ
  piContract=null; clearPIFields();
  // ì§ì› ì´ˆê¸°?????Œì‚¬ allowance_configë¡???ª© show/hide ë³µì›
  const _clrCoId = currentGlobalCompanyId || document.getElementById('pi-company')?.value;
  const _clrCo   = allCompanies.find(c=>c.id===_clrCoId);
  if(typeof applyPIAllowanceConfig === 'function')
    applyPIAllowanceConfig(_clrCo?.allowance_config ?? null);
}

// ?€?€ ?…ë ¥ê°?ë¦¬ì…‹ (ì§ì›Â·ê³„ì•½ ? íƒ ?íƒœ ? ì?, ë§Œê·¼ ê¸°ì? ë³µì›) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ??ë³´ì¡´ ??ª© (?ë?ì§€ ?ŠìŒ):
//   - ì§ì› ? íƒ / ê³„ì•½ ì¹´ë“œ (?°ì •ê¸°ì?: ?°ì •ê¸°ê°„Â·?µìƒ?œê¸‰ ?¬í•¨)
//   - ?•ê¸° ì§€ê¸‰í•­ëª?(baseÂ·weekly-holÂ·ê³„ì•½ ê³ ì • ?˜ë‹¹ ????_setPIContractReadonlyë¡?? ê¸´ ê°?
//   - ?°ì°¨ ?„í™© ë°•ìŠ¤ (calcAnnualLeaveTable ?¬ì‹¤?‰ìœ¼ë¡??ë™ ê°±ì‹ )
//   - 4ê°??•ì‚° ë©”ëª¨ (ì§ì „???¸ê³„ ?ëŠ” ?¬ìš©???…ë ¥ ë³´í˜¸)
// ??ì´ˆê¸°????ª©:
//   - ë¹„ì •ê¸?ì§€ê¸‰í•­ëª?(?°ì°¨?˜ë‹¹Â·?ì—¬Â·?±ê³¼Â·?¤ë¹„Â·?µì‹ Â·ê¸°í?)
//   - ê·¼ë¡œ ?¤ì  (ë§Œê·¼ ê¸°ì??¼ë¡œ ?¬ê³„??
//   - ?•ì‚°/ì¶”ê?ê³µì œ ê¸ˆì•¡ (0?¼ë¡œ)
//   - ì´ˆê³¼Â·?¼ê°„Â·?´ì¼ ê·¼ë¡œ?œê°„
//   - ë©”ëª¨(note)
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _resetPIInputsOnly(){
  // 1) ë¹„ì •ê¸?ì§€ê¸‰í•­ëª?ê¸ˆì•¡ ì´ˆê¸°??
  [
    'pi-annual-pay','pi-annual-used',
    'pi-bonus','pi-performance','pi-actual-expense',
    'pi-communication','pi-etc-allowance',
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });

  // etc-allowance ë©”ëª¨??ì´ˆê¸°??(ë¹„ì •ê¸??…ë ¥ê°’ì´ë¯€ë¡?
  const _etcMemoClr=document.getElementById('pi-etc-allowance-memo'); if(_etcMemoClr) _etcMemoClr.value='';

  // 2) ì´ˆê³¼Â·?¼ê°„Â·?´ì¼ ê·¼ë¡œ?œê°„ ì´ˆê¸°??
  ['pi-ot-hours','pi-night-hours','pi-hol-hours'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  ['pi-ot-pay-disp','pi-night-pay-disp','pi-hol-pay-disp',
   'pi-ot-pay-disp-simple','pi-night-pay-disp-simple','pi-hol-pay-disp-simple'
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='0??; });

  // 3) ?•ì‚°/ì¶”ê?ê³µì œ ê¸ˆì•¡ë§?ì´ˆê¸°??(ë©”ëª¨??ë³´ì¡´)
  [
    'pi-health-adj-yearend','pi-ltcare-adj-yearend',
    'pi-yearend','pi-health-adj','pi-health-adj-memo',
    'pi-health-adj-retro','pi-advance',
    'pi-std-pay',
    'pi-pension-fixed','pi-health-fixed','pi-ltcare-fixed','pi-employ-fixed',
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });

  // 4) ë©”ëª¨(ë¹„ê³ ) ì´ˆê¸°??
  const _noteEl=document.getElementById('pi-note'); if(_noteEl) _noteEl.value='';

  // 5) ?°ì°¨?˜ë‹¹ ?ë™ê³„ì‚° ì²´í¬ë°•ìŠ¤ ì´ˆê¸°??
  const _chkRst=document.getElementById('pi-annual-auto-chk');
  if(_chkRst){ _chkRst.checked=false; }
  const _apRst=document.getElementById('pi-annual-pay');
  if(_apRst){ _apRst.readOnly=false; _apRst.classList.remove('pi-input-readonly'); }

  // 6) ?˜ì • ëª¨ë“œ ?´ì œ
  piEditPayrollId = null;
  _piEditSnapshot = null;  // ?¤ëƒ…??ì´ˆê¸°??
  _updatePIBottomBtns();

  // 7) ê·¼ë¡œ ?¤ì  ?¨ë„ ë¦¬ì…‹ ??ë§Œê·¼ ê¸°ì? ?¬ê³„??
  const _wpR=document.getElementById('pi-work-auto-panel'); if(_wpR) _wpR.style.display='none';
  const _swR=document.getElementById('pi-ot-pay-simple-wrap'); if(_swR) _swR.style.display='none';
  ['pi-work-days','pi-total-hours'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  _applyPIDefaultWorkDays(true);  // ë§Œê·¼ ê¸°ì? ê·¼ë¡œ?¼ìˆ˜ ?¬ì…??

  // 8) ?°ì°¨ ?„í™© ?¬ê³„??
  calcAnnualLeaveTable();

  // 9) ì§€ê¸‰ì¼ ?¬ì ??(ê³ ê°???¤ì • ê¸°ì?)
  _applyPIPayDate(true);

  // 10) ê³µì œ ?¬ê³„??
  calcPI();

  toast('?…ë ¥ê°’ì„ ì´ˆê¸°?”í–ˆ?µë‹ˆ??', 'info');
}
// ?€?€?€ ?˜ì • ëª¨ë“œ ?íƒœ ?€?€?€
let piEditPayrollId = null; // ?˜ì • ì¤‘ì¸ payroll ID (null?´ë©´ ? ê·œ)

// ?€?€?€ ?ìƒë³µêµ¬ ë¹„êµ???¤ëƒ…???€?€?€
let _piEditSnapshot = null; // ?˜ì • ëª¨ë“œ ì§„ì…Â·ë³µì› ì§í›„ ???íƒœ (JSON string)

/** ?¤ëƒ…??ë¹„êµ ?€?????„ë“œ ID ëª©ë¡ */
const _PI_SNAP_FIELDS = [
  // pi-base ?œì™¸: type="hidden", calcPI()ê°€ pi-work-days ê¸°ë°˜?¼ë¡œ ?ë™ê³„ì‚° ???¬ìš©??ì§ì ‘ ?…ë ¥ ë¶ˆê?
  'pi-position','pi-remote-area','pi-site','pi-skill','pi-license',
  'pi-transport','pi-meal','pi-childcare','pi-research',
  'pi-fitness','pi-self-dev','pi-book','pi-overseas',
  'pi-severance-interim','pi-etc-allowance','pi-etc-allowance-memo',
  'pi-annual-pay','pi-annual-used','pi-bonus','pi-performance',
  'pi-actual-expense','pi-communication',
  'pi-ot-hours','pi-night-hours','pi-hol-hours','pi-work-days',
  'pi-yearend','pi-yearend-memo',
  'pi-health-adj','pi-health-adj-memo',
  'pi-health-adj-yearend','pi-health-adj-yearend-memo',
  'pi-ltcare-adj-yearend','pi-ltcare-adj-yearend-memo',
  'pi-advance','pi-advance-memo',
  'pi-std-pay','pi-paydate','pi-note','pi-dependents',
  'pi-pension-fixed','pi-health-fixed','pi-ltcare-fixed','pi-employ-fixed',
];

/** ?„ì¬ ???íƒœë¥?JSON ë¬¸ì?´ë¡œ ë°˜í™˜ (?¤ëƒ…???€?¥Â·ë¹„êµìš©) */
function _readPIFormSnapshot(){
  const obj = {};
  _PI_SNAP_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    obj[id] = el.value;
  });
  return JSON.stringify(obj);
}

/** ?ìƒë³µêµ¬ ë²„íŠ¼ ?œì„±/ë¹„í™œ??ê°±ì‹  */
function _checkPIRestoreBtn(){
  const btn = document.getElementById('pi-clear-btn');
  if(!btn) return;
  if(!piEditPayrollId){
    // ? ê·œ ëª¨ë“œ ??ì´ˆê¸°??ë²„íŠ¼, ??ƒ ?œì„±
    btn.disabled      = false;
    btn.style.opacity = '';
    btn.style.cursor  = '';
    return;
  }
  if(_piEditSnapshot === null){
    // ?˜ì • ëª¨ë“œ?´ì?ë§??¤ëƒ…???„ì§ ë¯¸ìƒ???„ë“œ ì±„ìš°ê¸?ì§„í–‰ ì¤? ??ë¹„í™œ??
    btn.disabled      = true;
    btn.style.opacity = '0.4';
    btn.style.cursor  = 'not-allowed';
    return;
  }
  // ?˜ì • ëª¨ë“œ + ?¤ëƒ…???ˆìŒ ???„ì¬ ?¼ê³¼ ë¹„êµ
  const _curSnap = _readPIFormSnapshot();
  const changed = (_curSnap !== _piEditSnapshot);
  btn.disabled      = !changed;
  btn.style.opacity = changed ? '' : '0.4';
  btn.style.cursor  = changed ? '' : 'not-allowed';
}

/**
 * ?˜ë‹¨ ë²„íŠ¼ ?ì—­(ì´ˆê¸°???ìƒë³µêµ¬ Â· ì·¨ì†Œ/?˜ì •ì·¨ì†Œ)??
 * ?„ì¬ ëª¨ë“œ(? ê·œ/?˜ì •)??ë§ê²Œ ?ˆì´ë¸”Â·ìŠ¤?€??ê°±ì‹ .
 */
function _updatePIBottomBtns(){
  // ?€?€ ì·¨ì†Œ ë²„íŠ¼ ?€?€
  const cancelBtn   = document.getElementById('pi-cancel-btn');
  const cancelLabel = document.getElementById('pi-cancel-btn-label');
  // ?€?€ ì´ˆê¸°???ìƒë³µêµ¬ ë²„íŠ¼ ?€?€
  const clearBtn   = document.getElementById('pi-clear-btn');
  const clearLabel = document.getElementById('pi-clear-btn-label');
  const clearIcon  = document.getElementById('pi-clear-btn-icon');

  if(piEditPayrollId){
    // ?€?€ ?˜ì • ëª¨ë“œ ?€?€
    if(cancelBtn && cancelLabel){
      cancelLabel.textContent      = '?˜ì • ì·¨ì†Œ';
      cancelBtn.classList.remove('btn-secondary');
      cancelBtn.classList.add('btn-warning');
    }
    if(clearBtn && clearLabel){
      clearLabel.textContent       = '?ìƒë³µêµ¬';
      if(clearIcon) clearIcon.className = 'fas fa-rotate-left';
      clearBtn.classList.remove('btn-secondary');
      clearBtn.classList.add('btn-warning');
    }
    // ì§„ì… ì§í›„(?¤ëƒ…???ˆìŒ)?ëŠ” ë¹„í™œ????ë³€ê²?ê°ì? ???œì„±
    _checkPIRestoreBtn();
  } else {
    // ?€?€ ? ê·œ ëª¨ë“œ ?€?€
    if(cancelBtn && cancelLabel){
      cancelLabel.textContent      = 'ì·¨ì†Œ';
      cancelBtn.classList.remove('btn-warning');
      cancelBtn.classList.add('btn-secondary');
    }
    if(clearBtn && clearLabel){
      clearLabel.textContent       = 'ì´ˆê¸°??;
      if(clearIcon) clearIcon.className = 'fas fa-redo';
      clearBtn.classList.remove('btn-warning');
      clearBtn.classList.add('btn-secondary');
    }
    // ? ê·œ ëª¨ë“œ: ì´ˆê¸°??ë²„íŠ¼ ??ƒ ?œì„± ë³´ì¥
    _checkPIRestoreBtn();
  }
  // ëª¨ë“œ ?„í™˜ ?œë§ˆ???„ì‹œ?€??ë²„íŠ¼ ?œì„±/ë¹„í™œ???™ê¸°??
  _updatePIDraftBtnForMode();
}
/** ?˜ìœ„?¸í™˜ alias */
const _updatePICancelBtn = _updatePIBottomBtns;

/**
 * ?˜ì • ëª¨ë“œ?ì„œ ?„ì‹œ?€??ë²„íŠ¼ ?´ë¦­ ???ˆë‚´ ?Œë¦¼ ëª¨ë‹¬
 */
function _showPIDraftEditModeAlert(){
  const old = document.getElementById('pi-draft-edit-alert-modal');
  if(old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'pi-draft-edit-alert-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:340px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;">
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#fde68a,#f59e0b);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <i class="fas fa-lock" style="color:#fff;font-size:22px;"></i>
      </div>
      <div style="font-size:16px;font-weight:800;color:#1e1b4b;margin-bottom:10px;">?„ì‹œ?€???¬ìš© ë¶ˆê?</div>
      <div style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:24px;">
        ?˜ì • ëª¨ë“œ?ì„œ???„ì‹œ?€?¥ì„<br>ì§€?í•˜ì§€ ?ŠìŠµ?ˆë‹¤.
      </div>
      <button onclick="document.getElementById('pi-draft-edit-alert-modal').remove()"
        class="btn btn-indigo" style="width:100%;padding:12px;font-size:14px;">
        ?•ì¸
      </button>
    </div>`;
  // ë°°ê²½ ?´ë¦­?¼ë¡œ???«ê¸°
  modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/**
 * ?˜ì • ëª¨ë“œ ?¬ë????°ë¼ ?„ì‹œ?€??ë²„íŠ¼ ?œì„±/ë¹„í™œ???„í™˜
 * - ?˜ì • ëª¨ë“œ(piEditPayrollId !== null): disabled + ë°˜íˆ¬ëª?
 * - ? ê·œ ëª¨ë“œ: enabled
 */
function _updatePIDraftBtnForMode(){
  const btn = document.getElementById('pi-draft-btn');
  if(!btn) return;
  if(piEditPayrollId){
    // disabled ?€??aria-disabled ?¬ìš© ??onclick ?´ë²¤??? ì? (?´ë¦­ ???ˆë‚´ ?Œë¦¼ ?œì‹œ)
    btn.disabled               = false;
    btn.setAttribute('aria-disabled', 'true');
    btn.style.opacity          = '0.4';
    btn.style.cursor           = 'not-allowed';
    btn.title                  = '?˜ì • ëª¨ë“œ?ì„œ???„ì‹œ?€?¥ì„ ?¬ìš©?????†ìŠµ?ˆë‹¤.';
  } else {
    btn.disabled               = false;
    btn.removeAttribute('aria-disabled');
    btn.style.opacity          = '';
    btn.style.cursor           = '';
    btn.title                  = '';
  }
}

/**
 * ? ê·œ ?„ì‹œ?€???„ë£Œ ??'ê³„ì† ?…ë ¥' / 'ëª©ë¡?¼ë¡œ ?Œì•„ê°€ê¸? ? íƒ ëª¨ë‹¬
 */
function _showPIDraftSavedModal(yr, mo, timeStr){
  // ê¸°ì¡´ ëª¨ë‹¬ ?œê±°
  const old = document.getElementById('pi-draft-saved-modal');
  if(old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'pi-draft-saved-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:360px;width:calc(100%-32px);box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;">
      <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#6ee7b7,#10b981);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <i class="fas fa-floppy-disk" style="color:#fff;font-size:22px;"></i>
      </div>
      <div style="font-size:16px;font-weight:800;color:#1e1b4b;margin-bottom:8px;">?„ì‹œ?€???„ë£Œ</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:24px;">
        ?‘ì„± ì¤‘ì¸ ê¸‰ì—¬ê°€ ?„ì‹œ?€???˜ì—ˆ?µë‹ˆ??<br>
        <span style="font-size:11.5px;color:#9ca3af;">${yr}??${mo}??Â· ${timeStr} ?€??/span>
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('pi-draft-saved-modal').remove()"
          style="flex:1;padding:11px;background:#f1f5f9;color:#374151;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-pen" style="margin-right:5px;"></i>ê³„ì† ?…ë ¥
        </button>
        <button onclick="document.getElementById('pi-draft-saved-modal').remove(); backToPITargetList();"
          class="btn btn-indigo" style="flex:1;padding:11px;font-size:13px;">
          <i class="fas fa-list" style="margin-right:5px;"></i>ëª©ë¡?¼ë¡œ ?Œì•„ê°€ê¸?
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

/**
 * ê¸‰ì—¬ ?€???„ë£Œ ëª¨ë‹¬
 * @param {string} empName  ê·¼ë¡œ?ëª…
 * @param {number} yr       ì§€ê¸??°ë„
 * @param {number} mo       ì§€ê¸???
 * @param {string} payrollId ?€?¥ëœ payroll ID (ê¸‰ì—¬ëª…ì„¸??ë³´ê¸°???¬ìš©)
 * @param {boolean} isEdit  ?˜ì • ëª¨ë“œ ?¬ë? (ë©”ì‹œì§€ ë¬¸êµ¬ ë¶„ê¸°)
 */
function _showPISavedModal(empName, yr, mo, payrollId, isEdit){
  const old = document.getElementById('pi-saved-modal');
  if(old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'pi-saved-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:380px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;">
      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6ee7b7,#10b981);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <i class="fas fa-check" style="color:#fff;font-size:24px;"></i>
      </div>
      <div style="font-size:16px;font-weight:800;color:#1e1b4b;margin-bottom:10px;">
        ${isEdit ? '?˜ì • ?€???„ë£Œ' : 'ê¸‰ì—¬ ?€???„ë£Œ'}
      </div>
      <div style="font-size:13.5px;color:#374151;margin-bottom:24px;line-height:1.7;">
        <strong>${empName}</strong>?˜ì˜<br>
        <strong>${yr}??${mo}??ê¸‰ì—¬</strong>ê°€ ?€?¥ë˜?ˆìŠµ?ˆë‹¤.
      </div>
      <div style="display:flex;gap:10px;">
        <button
          onclick="document.getElementById('pi-saved-modal').remove(); openPayslipModal('${payrollId}');"
          class="btn btn-indigo" style="flex:1;padding:12px 8px;font-size:13px;">
          <i class="fas fa-file-invoice-dollar" style="margin-right:5px;"></i>ê¸‰ì—¬ëª…ì„¸??ë³´ê¸°
        </button>
        <button
          onclick="document.getElementById('pi-saved-modal').remove(); loadPITargetList();"
          style="flex:1;padding:12px 8px;background:#f1f5f9;color:#374151;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-list" style="margin-right:5px;"></i>ì§€ê¸‰ë???ëª©ë¡ ë³´ê¸°
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ?€?€?€ ?„ì‹œ?€???íƒœ ?€?€?€
let piDraftId = null; // ?„ì¬ ?„ì‹œ?€???ˆì½”??ID (null?´ë©´ ?†ìŒ)

