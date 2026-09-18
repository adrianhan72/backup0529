/**
 * lib/utils.js — 공통 유틸리티
 */

/** 접두사 붙은 짧은 ID 생성 */
function generatePrefixedId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 로컬 타임존 기준 'YYYY-MM-DD' — toISOString UTC 밀림 방지 (규칙) */
function fmtLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = { generatePrefixedId, fmtLocalDate };
