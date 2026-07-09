/**
 * modules/contract/contract-lifecycle-notices.mjs — Phase 10
 * 근로계약 생애주기 알림 본문 헬퍼 (contract-lifecycle.mjs 내 11종)
 */
const _now = () => new Date().toLocaleString('ko-KR');
const _sig = () => window._BRAND_SIG || '';

function _body(msg, p) {
  const period = p.period ? `■ 계약 기간: ${p.period}\n` : '';
  const extra  = p.extra  ? p.extra.map(l => `■ ${l}\n`).join('') : '';
  return `안녕하세요${p.coRep}.\n\n${msg}\n\n■ 근로자: ${p.empName}\n■ 고용형태: ${p.ctLabel}\n${period}${extra}■ 처리 일시: ${_now()}\n\n자세한 내용은 근로 계약 관리 메뉴에서 확인하세요.\n\n${_sig()}`;
}

export const N = {
  terminationScheduled: (p) => _body('소속 근로자의 계약 해지가 예약 처리되었습니다.', { ...p, extra: [`퇴사 예정일: ${p.termDate}`] }),
  immediateTermination: (p) => _body('소속 근로자의 근로계약이 해지 처리되었습니다.', p),
  contractEdited:       (p) => _body('소속 근로자의 근로계약 내용이 수정되었습니다.', { ...p, extra: p.newStatus ? [`계약 상태: ${p.newStatus}`] : [] }),
  terminationCancelled: (p) => _body('소속 근로자의 계약 해지 예정이 취소되어 기존 계약이 정상 유효 상태로 복귀되었습니다.', { ...p, extra: [`취소된 ${p.typeLabel}일: ${p.termDate}`, '현재 계약 상태: 계약유효 (활성) 복귀'] }),
  contractVoided:       (p) => _body('소속 근로자의 근로계약이 파기 처리되었습니다.', { ...p, extra: [`파기 사유: ${p.statusLabel} 상태의 계약 파기`] }),
  renewalScheduled:     (p) => _body('소속 근로자의 계약 갱신이 예약되었습니다.', { ...p, extra: [`기존 계약 종료일: ${p.oldEnd}`, `새 계약 시작일: ${p.newStart} (시작일 미도래 — 계약예정)`] }),
  renewed:              (p) => _body('소속 근로자의 계약 갱신이 완료되었습니다.', { ...p, extra: [`기존 계약 종료일: ${p.oldEnd}`, `새 계약 시작일: ${p.newStart}`, '계약 상태: 계약유효 (활성)'] }),
  contractTerminated:   (p) => _body('소속 근로자의 근로계약이 해지 처리되었습니다.', p),
  contractUpdated:      (p) => _body('소속 근로자의 근로계약 내용이 수정되었습니다.', p),
  recontractCompleted:  (p) => _body('소속 근로자의 재계약이 완료되었습니다.', { ...p, extra: [`계약 상태: ${p.statusLabel}`] }),
  contractCreated:      (p) => _body('소속 근로자의 근로계약이 새로 작성되었습니다.', { ...p, extra: [`계약 상태: ${p.statusLabel}`] }),
};
