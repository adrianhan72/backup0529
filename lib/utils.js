/**
 * lib/utils.js — 공통 유틸리티
 */

/** 접두사 붙은 짧은 ID 생성 */
function generatePrefixedId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { generatePrefixedId };
