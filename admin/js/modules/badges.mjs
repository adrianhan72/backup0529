/**
 * modules/badges.mjs — Phase 3-3: 메뉴 뱃지 업데이트
 * 
 * wage-ledger.js에서 추출. state.mjs 데이터 + 레거시 window 함수 하이브리드.
 */
import { getCompanies, getContracts, getPayrolls, getWLNotifications, isHeavyDataReady } from './state.mjs';

function _setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) {
    el.textContent = String(count);
    el.style.display = 'inline-flex';
  } else {
    el.style.display = 'none';
  }
}

export function updateMenuBadges() {
  const companies = getCompanies();
  const contracts = getContracts();
  const payrolls = getPayrolls();
  const heavyReady = isHeavyDataReady();

  // 0) 고객사 임시저장 → companies
  _setBadge('badge-companies', companies.filter(c => !!c.is_draft).length);

  // 1) 근로계약서 미발송 → contract-dispatch (heavy 데이터 의존)
  if (heavyReady && typeof window._cdpGetUnsentContracts === 'function') {
    const unsentList = window._cdpGetUnsentContracts();
    _setBadge('badge-contract-dispatch', unsentList.length);
  }

  // 2) 급여명세서 미발송 → payslip-send (heavy 데이터 의존)
  if (heavyReady) {
    const sentPayrollIds = new Set((window._allSendLogs || []).map(l => l.payroll_id));
    const unsentPayrolls = payrolls.filter(p => !sentPayrollIds.has(p.id)).length;
    _setBadge('badge-payslip-send', unsentPayrolls);
  }

  // 3) 계약서 날인본 미등록 + 임시저장 → contracts
  const draftContractCount = contracts.filter(c => !!c.is_draft).length;
  _setBadge('badge-contracts', draftContractCount);

  // 4) 계약만료 통지 → contract-expiry-notice
  if (typeof window._cenGetTargetContracts === 'function') {
    const expiryTargets = window._cenGetTargetContracts();
    _setBadge('badge-contract-expiry-notice', expiryTargets.length);
  }

  // 5) 정규직 전환 의무 대상 → regular-conversion
  if (typeof window._calc2YrExceedList === 'function') {
    const regularList = window._calc2YrExceedList().filter(x => x.status === 'exceeded');
    _setBadge('badge-regular-conversion', regularList.length);
  }

  // 5-1) 수습 서면통지 대상 → probation-mgmt
  if (typeof window._getProbationAllTargets === 'function') {
    const probTargets = window._getProbationAllTargets().filter(t => t.probMonths > 3 && t.daysLeft >= 30);
    _setBadge('badge-probation-mgmt', probTargets.length);
  }

  // 6) 퇴직급여 → severance (heavy 데이터 의존)
  if (heavyReady) {
    _setBadge('badge-severance', (window.allSeveranceNotices || []).length);
  }

  // 7) 급여 입력 임시저장 → payroll-input (heavy 데이터 의존)
  if (heavyReady) {
    _setBadge('badge-payroll-input', payrolls.filter(p => !!p.is_draft).length);
  }
}

/** 임금대장 메뉴 뱃지 (미확인 알림) */
export function updateWLMenuBadge() {
  const menuItem = document.querySelector('[data-page="wage-ledger"]');
  if (!menuItem) return;
  menuItem.querySelectorAll('.wl-menu-badge').forEach(el => el.remove());
  const notifications = getWLNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  if (unreadCount > 0) {
    const badge = document.createElement('span');
    badge.className = 'wl-menu-badge';
    badge.textContent = 'N';
    badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#e94560;color:#fff;font-size:10px;font-weight:800;border-radius:10px;padding:1px 6px;margin-left:6px;letter-spacing:0;line-height:1.4;vertical-align:middle;';
    menuItem.appendChild(badge);
  }
}

// Phase 3-3: window 등록 → 레거시 코드가 ESM 버전을 사용하도록 오버라이드
if (typeof window !== 'undefined') {
  window.updateMenuBadges = updateMenuBadges;
  window._updateWLMenuBadge = updateWLMenuBadge;
  console.log('[ESM Badges] updateMenuBadges + _updateWLMenuBadge → ESM 모듈로 오버라이드');
}
