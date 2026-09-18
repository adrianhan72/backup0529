/**
 * lib/repositories/kakaoSendLogsRepository.js — 카카오톡 발송 로그(kakao_send_logs)
 */
const { BaseRepository } = require('../database');

class KakaoSendLogsRepository extends BaseRepository {
  constructor(conn) { super('kakao_send_logs', conn); }

  /** 솔라피 messageId로 조회 */
  findByMessageId(messageId) {
    return this.db.prepare(
      'SELECT * FROM kakao_send_logs WHERE message_id = ?'
    ).get(messageId) || null;
  }

  /** 실패 건 조회 (재시도 횟수 제한) */
  findFailed(maxRetry = 3) {
    return this.db.prepare(
      'SELECT * FROM kakao_send_logs WHERE status = ? AND retry_count < ? ORDER BY created_at ASC LIMIT 50'
    ).all('failed', maxRetry);
  }

  /** 연관 레코드 기준 조회 */
  findByRelated(relatedTable, relatedId) {
    return this.db.prepare(
      'SELECT * FROM kakao_send_logs WHERE related_table = ? AND related_id = ? ORDER BY created_at DESC'
    ).all(relatedTable, relatedId);
  }

  /** 발송 상태 업데이트 */
  updateStatus(id, status, messageId, errorMessage) {
    const now = new Date().toISOString();
    return this.db.prepare(
      `UPDATE kakao_send_logs
       SET status = ?, message_id = ?, error_message = ?, sent_at = ?, retry_count = retry_count + 1
       WHERE id = ?`
    ).run(status, messageId || null, errorMessage || null, status === 'sent' ? now : null, id);
  }

  /** 발송 로그 생성 (API 호출 성공 시) */
  logSuccess({ id, sendType, templateId, recipient, variables, messageId, groupId, relatedTable, relatedId }) {
    return this.insert({
      id: id || undefined,
      send_type: sendType || 'alimtalk',
      template_id: templateId || null,
      recipient,
      variables: typeof variables === 'object' ? JSON.stringify(variables) : (variables || null),
      message_id: messageId || null,
      group_id: groupId || null,
      status: 'sent',
      related_table: relatedTable || null,
      related_id: relatedId || null,
      sent_at: new Date().toISOString(),
    });
  }

  /** 발송 실패 로그 생성 */
  logFailure({ id, sendType, templateId, recipient, variables, errorMessage, relatedTable, relatedId }) {
    return this.insert({
      id: id || undefined,
      send_type: sendType || 'alimtalk',
      template_id: templateId || null,
      recipient,
      variables: typeof variables === 'object' ? JSON.stringify(variables) : (variables || null),
      status: 'failed',
      error_message: errorMessage || null,
      related_table: relatedTable || null,
      related_id: relatedId || null,
    });
  }
}

module.exports = { KakaoSendLogsRepository };
