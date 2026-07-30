//  기간제 2년 초과 — 정규직 전환 의무 관리
//  「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조
// ==================================================================

/**
 * 동일 직원의 계약직·계약직 수습 계약을 전부 합산해
 * 누적 기간이 2년(730일)을 초과한 직원 목록을 반환한다.
 *
 * 반환 형식: [{
 *   empId, empName, company, companyId,
 *   totalDays,          // 누적 일수
 *   firstStart,         // 최초 계약 시작일 (YYYY-MM-DD)
 *   contracts,          // 해당 계약 목록 (원본 계약 객체 배열)
 *   activeContract,     // 현재 활성 계약 (있으면) — 정규직 전환 대상 계약
 *   status,             // 'exceeded' | 'warning' (1년 반 이상)
 * }]
 */
function _calc2YrExceedList(){
  const TWO_YEARS_DAYS = 730; // 2년 = 365×2
  const NOTICE_BEFORE  = 30;  // 730일 30일 전부터 사전 고지
  const WARN_DAYS      = 548; // 경고 시작: 1년 6개월(365×1.5)

  // 직원별로 계약직·계약직 수습·일용직 계약 그룹핑
  const byEmp = {};
  allContracts.forEach(c => {
    if(c.is_draft) return;
    if(c.is_voided_by_amend) return;
    if([CONTRACT_STATUS.CANCELED, CONTRACT_STATUS.VOIDED].includes(c.status)) return false; // 파기·취소는 제외
    const emp = allEmployees.find(e => e.id === c.employee_id);
    const cat = emp?.employment_category || c.contract_type || '';
    if(![CONTRACT_TYPE.FIXED, CONTRACT_TYPE.FIXED_PROBATION, CONTRACT_TYPE.DAILY, CONTRACT_TYPE.REGULAR_PROBATION].includes(cat)) return; // 계약직·수습·일용직 계열
    if(!c.contract_start) return;
    if(!byEmp[c.employee_id]) byEmp[c.employee_id] = [];
    byEmp[c.employee_id].push(c);
  });

  const today = new Date();
  today.setHours(0,0,0,0);
  const result = [];

  Object.entries(byEmp).forEach(([empId, contracts]) => {
    // 누적 일수 계산: 최초 입사일(최초 계약 시작일)부터 오늘까지
    const firstStart = contracts
      .map(c => c.contract_start)
      .sort()[0];
    const s = new Date(firstStart);
    const totalDays = Math.max(0, Math.ceil((today - s) / (1000*60*60*24)));

    // 700일 미만이면 표시 안 함 (사전 고지 대상 아님)
    if(totalDays < TWO_YEARS_DAYS - NOTICE_BEFORE) return;

    // 계약 종료일까지의 기간이 730일 이내면 제외 (자연 만료로 전환 의무 미발생)
    const furthestEnd = contracts
      .map(c => c.contract_end)
      .filter(Boolean)
      .sort()
      .reverse()[0]; // 가장 먼 종료일
    if(furthestEnd){
      const e = new Date(furthestEnd);
      const daysToEnd = Math.max(0, Math.ceil((e - s) / (1000*60*60*24)));
      if(daysToEnd < TWO_YEARS_DAYS) return; // 계약 종료일이 730일 이내 → 제외
    }

    const emp = allEmployees.find(e => e.id === empId);
    const co  = allCompanies.find(x => x.id === (contracts[0].company_id || emp?.company_id));

    // 현재 활성/서류미비/계약예정 계약
    const activeContract = contracts.find(c =>
      [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.DOCS_INCOMPLETE, CONTRACT_STATUS.PENDING, CONTRACT_STATUS.RENEWAL_PENDING].includes(c.status)
    ) || contracts.sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];

    result.push({
      empId,
      empName     : emp?.name || '(알 수 없음)',
      company     : co?.company_name || '-',
      companyId   : co?.id || '',
      totalDays,
      firstStart,
      contracts,
      activeContract,
      status      : totalDays > TWO_YEARS_DAYS ? 'exceeded' : 'warning',
    });
  });

  // 초과 → 경고 순, 동일 상태 내에선 일수 내림차순
  return result.sort((a,b) => {
    if(a.status !== b.status) return a.status === 'exceeded' ? -1 : 1;
    return b.totalDays - a.totalDays;
  });
}

/** 2년 초과 통계 업데이트 (대시보드 배너) */
function render2YrStats(){
  const list     = _calc2YrExceedList();
  const exceeded = list.filter(x => x.status === 'exceeded').length;
  // RC 탭 배지 제거됨 (전환 대상 탭 삭제) — 안전하게 null 체크
  const rcBadge = document.getElementById('rc-tab-target-badge');
  if(rcBadge){
    rcBadge.textContent   = exceeded;
    rcBadge.style.display = exceeded > 0 ? 'inline-flex' : 'none';
  }
}

/** 정규직 전환 대상 테이블 렌더링 */
function render2YrTargetList(){
  const tbody = document.getElementById('2yr-tbody');
  if(!tbody) return;

  const filterCo = document.getElementById('2yr-filter-company')?.value || '';
  const searchQ  = (document.getElementById('2yr-search')?.value || '').trim().toLowerCase();

  // 고객사 필터 옵션 동적 채우기 (1회)
  const coSel = document.getElementById('2yr-filter-company');
  if(coSel && coSel.options.length <= 1){
    const seen = new Set();
    _calc2YrExceedList().forEach(x => {
      if(!seen.has(x.companyId)){
        seen.add(x.companyId);
        const opt = document.createElement('option');
        opt.value = x.companyId; opt.textContent = x.company;
        coSel.appendChild(opt);
      }
    });
  }

  let list = _calc2YrExceedList().filter(x => {
    if(filterCo && x.companyId !== filterCo) return false;
    if(searchQ  && !x.empName.toLowerCase().includes(searchQ)) return false;
    return true;
  });

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:36px;color:#6b7280;">
      <i class="fas fa-check-circle" style="color:#10b981;font-size:20px;display:block;margin-bottom:8px;"></i>
      정규직 전환 의무 대상자가 없습니다.
    </td></tr>`;
    return;
  }

  const fmtDays = (d) => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(${d}일)`;
  };

  tbody.innerHTML = list.map(x => {
    const statusBadge = x.status === 'exceeded'
      ? `<span class="badge-2yr-over"><i class="fas fa-exclamation-circle"></i> 2년 초과</span>`
      : `<span class="badge-2yr-warn"><i class="fas fa-clock"></i> 주의 (1.5년+)</span>`;
    const catText = contractTypeLabel(x.activeContract?.contract_type) || CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED];
    return `<tr>
      <td style="font-weight:700;color:#111827;">${x.empName}</td>
      <td style="font-size:12px;color:#374151;">${x.company}</td>
      <td><span class="badge ${empCatBadge(x.activeContract?.contract_type)}">${catText}</span></td>
      <td style="font-size:12px;color:#6b7280;">${x.firstStart || '-'}</td>
      <td style="font-size:12px;font-weight:600;color:${x.status==='exceeded'?'#dc2626':'#d97706'};">${fmtDays(x.totalDays)}</td>
      <td>${statusBadge}</td>
      <td style="text-align:center;white-space:nowrap;">
        ${x.status === 'exceeded' ? `
        <button onclick="_2yrSendNotice('${x.empId}')"
          class="btn btn-danger btn-sm" style="padding:5px 12px;font-size:11.5px;">
          <i class="fas fa-paper-plane"></i> 전환 안내 발송
        </button>` : `<span style="font-size:11.5px;color:#9ca3af;">전환 의무 미도달</span>`}
      </td>
    </tr>`;
  }).join('');
}

/**
 * 정규직 전환 안내 알림 발송
 * ① 고객사 인앱 알림(company_notices) INSERT
 * ② contract_expiry_notices 이력 저장 (기존 발송 이력 테이블 재활용)
 */
async function _2yrSendNotice(empId){
  const item = _calc2YrExceedList().find(x => x.empId === empId);
  if(!item){ toast('대상자 정보를 찾을 수 없습니다.','error'); return; }

  const emp  = allEmployees.find(e => e.id === empId);
  const co   = allCompanies.find(x => x.id === item.companyId);
  if(!co)  { toast('고객사 정보를 찾을 수 없습니다.','error'); return; }

  const adminName = _getAdminUsername();
    const coRep     = getCompanyRepName(co);
  const fmtDays   = (d) => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${d}일)`;
  };

  const title = `[정규직 전환 의무] ${item.empName} — 기간제 2년 초과`;
  const body  =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원의 기간제 근로 누적 기간이 2년을 초과하여 법률에 따른 정규직 전환 의무가 발생하였음을 안내드립니다.

■ 직원명: ${item.empName}
■ 고용형태: ${contractTypeLabel(item.activeContract?.contract_type) || CONTRACT_TYPE_LABEL[CONTRACT_TYPE.FIXED]}
■ 입사일: ${item.firstStart || '-'}
■ 누적 근로일수: ${fmtDays(item.totalDays)}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요.

※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는 법적 의무 위반 발생 고지로 해당 근로자에게는 통보되지 않습니다.`;

  try {
    // ① 고객사 인앱 알림
    await _sendCompanyNotice({
      companyId   : co.id, companyName: co.company_name || '',
      noticeType  : 'regular_conversion',
      title, body,
      contractId  : item.activeContract?.id || '',
      employeeId  : empId, employeeName: item.empName,
    });

    // ② 계약만료 통지 이력 테이블에도 이력 저장
    await fetch('../tables/contract_expiry_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        contract_id   : item.activeContract?.id || '',
        employee_id   : empId,
        employee_name : item.empName,
        company_id    : co.id,
        company_name  : co.company_name || '',
        contract_type : item.activeContract?.contract_type || CONTRACT_TYPE.FIXED,
        contract_end  : '',
        notice_method : '인앱알림',
        notice_type   : 'regular_conversion',
        noticed_at    : new Date().toISOString(),
        noticed_by    : adminName,
        days_until_expiry: 0,
        note          : `기간제 2년 초과 (누적 ${item.totalDays}일) — 정규직 전환 안내`,
      }),
    });

    toast(`${item.empName} — 정규직 전환 안내 발송 완료`, 'success');
    await cenRefresh();
  } catch(e){
    console.error('[정규직 전환 안내 발송 오류]', e);
    toast('발송 중 오류가 발생했습니다.', 'error');
  }
}

let _2yrContactCache = null;
function _2yrGetContactFoot(){
  if(!_2yrContactCache){
    getRepresentativeContact().then(c => { _2yrContactCache = c; });
    return `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n● 전화: 02)3487-8841\n● 이메일: eunyangpark@naver.com\n● 팩스: 02)3487-8882`;
  }
  const c = _2yrContactCache;
  return `─────────────────────\n인사톡 노무톡 · 대화인사노무파트너스 담당자\n● 전화: ${c.phone || '02)3487-8841'}\n● 이메일: ${c.email || 'eunyangpark@naver.com'}\n● 팩스: ${c.fax || '02)3487-8882'}`;
}

// ==================================================================
