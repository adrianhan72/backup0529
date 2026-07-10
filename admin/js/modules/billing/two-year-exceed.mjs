/**
 * billing/two-year-exceed.mjs — Phase 6: 2년초과
 * Node.js 자동변환 (convert-core.cjs)
 */
import { getCompanies, getEmployees, getPayrolls, getContracts } from '../state.mjs';
import { CONTRACT_TYPE, CONTRACT_STATUS, COMPANY_STATUS, EMP_STATUS, CONTRACT_TYPE_LEGACY_MAP, DISPATCH_METHOD, DISPATCH_STATUS } from '../constants.mjs';

const _w = (name) => window[name];

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
export function _calc2YrExceedList(){
  const TWO_YEARS_DAYS = 730; // 2년 = 365×2
  const WARN_DAYS      = 548; // 경고 시작: 1년 6개월(365×1.5)

  // 직원별로 계약직 계열 계약 그룹핑
  const byEmp = {};
  getContracts().forEach(c => {
    if(c.is_draft) return;
    if(c.is_voided_by_amend) return;
    if([CONTRACT_STATUS.CANCELED, CONTRACT_STATUS.VOIDED].includes(c.status)) return false; // 파기·취소는 제외
    const emp = getEmployees().find(e => e.id === c.employee_id);
    const cat = emp?.employment_category || c.contract_type || '';
    if(![CONTRACT_TYPE.FIXED, CONTRACT_TYPE.FIXED_PROBATION, '계약직', '계약직 수습'].includes(cat)) return; // 계약직 계열만
    if(!c.contract_start) return;
    if(!byEmp[c.employee_id]) byEmp[c.employee_id] = [];
    byEmp[c.employee_id].push(c);
  });

  const today = new Date();
  today.setHours(0,0,0,0);
  const result = [];

  Object.entries(byEmp).forEach(([empId, contracts]) => {
    // 누적 일수 계산: 각 계약의 (종료일 or 오늘) - 시작일
    let totalDays = 0;
    contracts.forEach(c => {
      const s = new Date(c.contract_start);
      const e = c.contract_end ? new Date(c.contract_end) : today;
      const days = Math.max(0, Math.ceil((e - s) / (1000*60*60*24)));
      totalDays += days;
    });

    if(totalDays < WARN_DAYS) return; // 1년 6개월 미만은 표시 안 함

    const emp = getEmployees().find(e => e.id === empId);
    const co  = getCompanies().find(x => x.id === (contracts[0].company_id || emp?.company_id));

    // 최초 계약 시작일
    const firstStart = contracts
      .map(c => c.contract_start)
      .sort()[0];

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

/** 2년 초과 통계 업데이트 (대시보드 배너 + RC 페이지 배지) */
export function render2YrStats(){
  const list     = _calc2YrExceedList();
  const exceeded = list.filter(x => x.status === 'exceeded').length;
  // RC 탭 배지 (rc-tab-target-badge)
  const rcBadge = document.getElementById('rc-tab-target-badge');
  if(rcBadge){
    rcBadge.textContent   = exceeded;
    rcBadge.style.display = exceeded > 0 ? 'inline-flex' : 'none';
  }
}

/** 대시보드 배너 업데이트 */
export function _updateDash2YrBanner(){
  const section = document.getElementById('dash-2yr-section');
  if(!section) return;
  const list     = _calc2YrExceedList();
  const exceeded = list.filter(x => x.status === 'exceeded');
  if(!exceeded.length){ section.style.display='none'; section.innerHTML=''; return; }

  section.style.display = '';
  section.innerHTML = `
    <div onclick="showPage('regular-conversion', document.querySelector('.menu-item[data-page=\\'regular-conversion\\']'));"
         style="cursor:pointer;background:linear-gradient(135deg,#fff1f2,#fee2e2);border:1.5px solid #f87171;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px;"
         >
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas fa-gavel" style="color:#fff;font-size:17px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:700;color:#7f1d1d;">
          정규직 전환 의무 대상 <span style="color:#dc2626;font-size:16px;font-weight:800;">${exceeded.length}명</span>이 있습니다
        </div>
        <div style="font-size:12px;color:#b91c1c;margin-top:3px;">기간제 근로자 2년 초과 — 클릭하여 정규직 전환 통지 관리로 이동</div>
      </div>
      <div style="color:#dc2626;font-size:14px;flex-shrink:0;"><i class="fas fa-chevron-right"></i></div>
    </div>`;
}

/** 정규직 전환 대상 테이블 렌더링 */
export function render2YrTargetList(){
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
    const catText = (x.activeContract?.contract_type) || '계약직';
    return `<tr>
      <td style="font-weight:700;color:#111827;">${x.empName}</td>
      <td style="font-size:12px;color:#374151;">${x.company}</td>
      <td><span class="badge badge-purple" style="font-size:11px;">${catText}</span></td>
      <td style="font-size:12px;color:#6b7280;">${x.firstStart || '-'}</td>
      <td style="font-size:12px;font-weight:600;color:${x.status==='exceeded'?'#dc2626':'#d97706'};">${fmtDays(x.totalDays)}</td>
      <td>${statusBadge}</td>
      <td style="text-align:center;white-space:nowrap;">
        ${x.status === 'exceeded' ? `
        <button onclick="_2yrSendNotice('${x.empId}')"
          style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:5px;">
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
export async function _2yrSendNotice(empId){
  const item = _calc2YrExceedList().find(x => x.empId === empId);
  if(!item){ _w('toast')('대상자 정보를 찾을 수 없습니다.','error'); return; }

  const emp  = getEmployees().find(e => e.id === empId);
  const co   = getCompanies().find(x => x.id === item.companyId);
  if(!co)  { _w('toast')('고객사 정보를 찾을 수 없습니다.','error'); return; }

  const adminName = _w('_getAdminUsername')();
    const coRep     = _w('getCompanyRepName')(co);
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
■ 고용형태: ${item.activeContract?.contract_type || '계약직'}
■ 최초 계약일: ${item.firstStart || '-'}
■ 누적 계약기간: ${fmtDays(item.totalDays)}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요.

※ 본 안내는 대화인사노무파트너스에서 발송한 법적 의무 안내입니다.

${_BRAND_SIG}`;

  try {
    // ① 고객사 인앱 알림
    await fetch('../tables/company_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        company_id   : co.id,
        company_name : co.company_name || '',
        notice_type  : 'regular_conversion',
        title,
        body,
        contract_id  : item.activeContract?.id || '',
        employee_id  : empId,
        employee_name: item.empName,
        contract_end : '',
        days_until_expiry: 0,
        sent_at      : new Date().toISOString(),
        sent_by      : adminName,
        is_read      : false,
        read_at      : '',
      }),
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
        contract_type : item.activeContract?.contract_type || '계약직',
        contract_end  : '',
        notice_method : '인앱알림',
        notice_type   : 'regular_conversion',
        noticed_at    : new Date().toISOString(),
        noticed_by    : adminName,
        days_until_expiry: 0,
        note          : `기간제 2년 초과 (누적 ${item.totalDays}일) — 정규직 전환 안내`,
      }),
    });

    _w('toast')(`${item.empName} — 정규직 전환 안내 발송 완료`, 'success');
    await cenRefresh();
  } catch(e){
    console.error('[정규직 전환 안내 발송 오류]', e);
    _w('toast')('발송 중 오류가 발생했습니다.', 'error');
  }
}

// ==================================================================


// ══ window 등록 (레거시 호환) ══
window._calc2YrExceedList = _calc2YrExceedList;
window.render2YrStats = render2YrStats;
window._updateDash2YrBanner = _updateDash2YrBanner;
window.render2YrTargetList = render2YrTargetList;
window._2yrSendNotice = _2yrSendNotice;
