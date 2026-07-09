/**
 * modules/dashboard/core.mjs — 대시보드 핵심 모듈 (Phase 3-C)
 * 
 * 기존 dashboard-core.js 함수들을 모듈로 브릿지.
 * window 전역 함수를 import 가능한 형태로 노출.
 */
import { navigateTo } from '../router.mjs';

// ── window 브릿지: 기존 글로벌 함수 참조 ──
const _rdb = () => window.renderDashExpiryBanner;
const _rdr = () => window.renderDashRegularBanner;
const _rdp = () => window.renderDashProbationBanner;
const _rds = () => window.renderDashSeveranceBanner;
const _rda = () => window.renderDraftAlerts;

/** 계약만료 통지 배너 */
export function renderExpiryBanner() {
  const fn = typeof window.renderDashExpiryBanner === 'function' ? window.renderDashExpiryBanner : null;
  if (fn) fn();
}

/** 정규직 전환 배너 */
export function renderRegularBanner() {
  const fn = typeof window.renderDashRegularBanner === 'function' ? window.renderDashRegularBanner : null;
  if (fn) fn();
}

/** 수습 만료 배너 */
export function renderProbationBanner() {
  const fn = typeof window.renderDashProbationBanner === 'function' ? window.renderDashProbationBanner : null;
  if (fn) fn();
}

/** 퇴직금 배너 */
export function renderSeveranceBanner() {
  const fn = typeof window.renderDashSeveranceBanner === 'function' ? window.renderDashSeveranceBanner : null;
  if (fn) fn();
}

/** 임시저장 알림 */
export function renderDraftAlerts() {
  const fn = typeof window.renderDraftAlerts === 'function' ? window.renderDraftAlerts : null;
  if (fn) fn();
}

/** 대시보드 전체 새로고침 */
export function refreshDashboard() {
  if (typeof window.renderDashboard === 'function') {
    navigateTo('dashboard');
    setTimeout(() => window.renderDashboard(), 100);
  }
}

// 순수 ES 모듈 — import { renderExpiryBanner } 로 사용
