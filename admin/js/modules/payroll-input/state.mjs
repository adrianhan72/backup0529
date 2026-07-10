/**
 * payroll-input/state.mjs — 급여입력 공유 상태 (Phase 8-E)
 * ES module live binding: 다른 모듈에서 import 후 직접 할당 가능
 */
export let piContract = null;
window.piContract = null;
export let piEditPayrollId = null;
window.piEditPayrollId = null;
export let piDraftId = null;
window.piDraftId = null;
export let _piEditSnapshot = null;
export let _piContractLoading = false;
export const _piPayTypes = { transport:'', meal:'', childcare:'', research:'', communication:'', fitness:'', self_dev:'', book:'', overseas:'' };
