/**
 * lib/alimtalk-template-ids.js — 카카오 알림톡 템플릿 ID 전역 상수
 *
 * 사용법:
 *   const { ALIMTALK_TPL_IDS } = require('./alimtalk-template-ids');
 *   sendAlimtalk({ ..., templateId: ALIMTALK_TPL_IDS.CONTRACT });
 *
 *   // 또는 개별 상수 직접 사용
 *   const { CONTRACT, PAYSLIP } = require('./alimtalk-template-ids');
 *
 * ⚠️ 중요: 값은 Solapi 콘솔(카카오 비즈니스 채널 → 알림톡 템플릿)에 실제로
 *    등록된 템플릿 ID와 정확히 일치해야 합니다. 아래 값은 기존 코드에서
 *    사용하던 자리표시자(샘플)이므로, 실제 등록 ID로 교체하세요.
 *    등록 위치: https://console.solapi.com → 카카오톡 채널 → 알림톡 템플릿
 */

const ALIMTALK_TPL_IDS = Object.freeze({
  /** 근로계약서 발송 */
  CONTRACT: 'KA01TP2609110757021541GZoBRd7M1e',

  /** 정보제공동의서 발송 */
  CONSENT: 'CONSENT_001',

  /** 퇴직금 명세서 발송 */
  SEVERANCE: 'SEVERANCE_001',

  /** 급여 명세서 발송 */
  PAYSLIP: 'PAYSLIP_001',
});

module.exports = {
  ALIMTALK_TPL_IDS,
  // 개별 상수도 함께 export (필요한 것만 가져다 쓰기 편하게)
  CONTRACT: ALIMTALK_TPL_IDS.CONTRACT,
  CONSENT: ALIMTALK_TPL_IDS.CONSENT,
  SEVERANCE: ALIMTALK_TPL_IDS.SEVERANCE,
  PAYSLIP: ALIMTALK_TPL_IDS.PAYSLIP,
};
