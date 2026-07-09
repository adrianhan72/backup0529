/**
 * modules/dashboard/core.mjs — 대시보드 핵심 모듈 (Phase 4)
 * 
 * Phase 4: window.renderXxx 레거시 함수 호출을 _callLegacy() 헬퍼로 캡슐화.
 * dashboard-core.js → .mjs 이전 완료 시 _callLegacy 제거 예정.
 */
import { navigateTo } from '../router.mjs';

// ═══════════════════════════════════════════
// Phase 4: 레거시 함수 호출 헬퍼
// 대시보드 렌더 함수들이 .mjs로 이전되면 제거
// ═══════════════════════════════════════════

const _callLegacy = (name) => {
  const fn = window[name];
  if (typeof fn === 'function') fn();
};

/** 계약만료 통지 배너 */
export function renderExpiryBanner() { _callLegacy('renderDashExpiryBanner'); }
/** 정규직 전환 배너 */
export function renderRegularBanner() { _callLegacy('renderDashRegularBanner'); }
/** 수습 만료 배너 */
export function renderProbationBanner() { _callLegacy('renderDashProbationBanner'); }
/** 퇴직금 배너 */
export function renderSeveranceBanner() { _callLegacy('renderDashSeveranceBanner'); }
/** 임시저장 알림 */
export function renderDraftAlerts() { _callLegacy('renderDraftAlerts'); }

/** 대시보드 전체 새로고침 */
export function refreshDashboard() {
  if (typeof window.renderDashboard === 'function') {
    navigateTo('dashboard');
    setTimeout(() => window.renderDashboard(), 100);
  }
}
