/**
 * 솔라피(Solapi) API 클라이언트 모듈
 *
 * 솔라피 REST API v4를 사용하여 카카오톡 알림톡/친구톡/SMS를 발송합니다.
 * 외부 HTTP 라이브러리 없이 Node.js 내장 https 모듈만 사용합니다.
 *
 * @see https://solapi.com/developers/api/messages       (메시지 발송 API)
 * @see https://solapi.com/developers/api/msg-groups     (그룹 메시지 API)
 * @see https://solapi.com/developers/api/authentication (인증 방식)
 *
 * 사용 예:
 *   const solapi = createSolapiClient();
 *   await solapi.sendAlimtalk({
 *     to: '01012345678',
 *     templateId: 'TEMPLATE_001',
 *     variables: { '#{name}': '홍길동' }
 *   });
 */

const https = require('https');
const crypto = require('crypto');

// ──────────────────────────────────────────────
//  SolapiClient 클래스
// ──────────────────────────────────────────────

class SolapiClient {
  /**
   * @param {Object} config
   * @param {string} config.apiKey       - 솔라피 API Key
   * @param {string} config.apiSecret    - 솔라피 API Secret
   * @param {string} [config.pfId]       - 카카오톡 채널 프로필 ID (알림톡/친구톡 발송 시)
   * @param {string} [config.defaultSender] - 기본 발신번호 (예: '0212345678')
   */
  constructor({ apiKey, apiSecret, pfId, defaultSender }) {
    if (!apiKey || !apiSecret) {
      throw new Error('SolapiClient: apiKey와 apiSecret은 필수입니다.');
    }
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.pfId = pfId || '';
    this.defaultSender = defaultSender || '';

    this.hostname = 'api.solapi.com';
    this.basePath = '';
  }

  // ── 인증 (HMAC-SHA256) ──────────────────────

  /**
   * 솔라피 HMAC-SHA256 서명 생성
   * @private
   */
  _generateSignature(date, salt) {
    const hmac = crypto.createHmac('sha256', this.apiSecret);
    hmac.update(date + salt);
    return hmac.digest('hex');
  }

  /**
   * 인증 헤더 생성
   * @private
   */
  _getAuthHeaders() {
    const date = new Date().toISOString();
    const salt = crypto.randomUUID();
    const signature = this._generateSignature(date, salt);
    return {
      Authorization: `HMAC-SHA256 apiKey=${this.apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      'Content-Type': 'application/json',
    };
  }

  // ── HTTP 요청 ───────────────────────────────

  /**
   * HTTPS 요청 실행
   * @private
   * @param {string} method  - HTTP 메서드
   * @param {string} path    - API 경로 (예: '/messages/v4/send-many/detail')
   * @param {Object} [body]  - 요청 바디 (JSON 직렬화)
   * @returns {Promise<Object>} 응답 JSON
   */
  _request(method, path, body) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : '';
      const headers = this._getAuthHeaders();

      if (payload) {
        headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const options = {
        hostname: this.hostname,
        path: this.basePath + path,
        method,
        headers,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              const errMsg =
                parsed.error?.message ||
                parsed.errorMessage ||
                `솔라피 API 오류 (HTTP ${res.statusCode})`;
              const err = new Error(errMsg);
              err.statusCode = res.statusCode;
              err.response = parsed;
              reject(err);
            }
          } catch (e) {
            reject(new Error(`솔라피 응답 파싱 실패: ${data}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`솔라피 네트워크 오류: ${e.message}`));
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('솔라피 요청 시간 초과 (15초)'));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  // ── 메시지 발송 ─────────────────────────────

  /**
   * 단건 메시지 발송 (공통)
   *
   * v4 send-many/detail 엔드포인트를 사용하며, 단건도 messages 배열로 감싸서 전송합니다.
   *
   * @private
   * @param {Object} message - 솔라피 메시지 객체
   * @returns {Promise<Object>} { groupId, messageId, to, type, status, ... }
   */
  async _sendOne(message) {
    const body = {
      messages: [message],
      showMessageList: true, // 개별 메시지 결과를 응답에 포함
    };
    const result = await this._request('POST', '/messages/v4/send-many/detail', body);

    // 신규 응답 형식: { groupInfo, failedMessageList, messageList }
    const groupInfo = result.groupInfo || {};
    const messageList = result.messageList || [];
    const failedList = result.failedMessageList || [];

    // 발송 등록 실패 건 확인
    if (failedList.length > 0) {
      const failed = failedList[0];
      const err = new Error(failed.statusMessage || '메시지 발송 등록 실패');
      err.statusCode = failed.statusCode;
      err.response = result;
      throw err;
    }

    // 성공적으로 등록된 메시지
    const msgInfo = messageList[0] || {};
    return {
      ok: true,
      messageId: msgInfo.messageId || null,
      groupId: groupInfo.groupId || null,
      to: msgInfo.to,
      type: msgInfo.type,
      status: msgInfo.status || groupInfo.status || 'PENDING',
      raw: result,
    };
  }

  /**
   * 알림톡 발송
   *
   * ※ 사전에 카카오 비즈니스 채널에 템플릿이 등록되어 있어야 합니다.
   *
   * @param {Object} params
   * @param {string} params.to             - 수신자 전화번호 (예: '01012345678')
   * @param {string} params.templateId     - 카카오 비즈니스에 등록된 템플릿 ID
   * @param {Object} [params.variables]    - 템플릿 변수 (예: { '#{name}': '홍길동' })
   * @param {string} [params.from]         - 발신번호 (미지정 시 defaultSender 사용)
   * @param {string} [params.pfId]         - 카카오 채널 프로필 ID (미지정 시 기본 pfId 사용)
   * @param {string} [params.reserveTime]  - 예약 발송 시간 (ISO 8601)
   * @returns {Promise<Object>} 발송 결과
   */
  async sendAlimtalk({ to, templateId, variables, from, pfId, reserveTime }) {
    if (!to) throw new Error('수신자 전화번호(to)는 필수입니다.');
    if (!templateId) throw new Error('템플릿 ID(templateId)는 필수입니다.');

    const message = {
      to,
      from: from || this.defaultSender,
      type: 'ATA', // 알림톡
      kakaoOptions: {
        pfId: pfId || this.pfId,
        templateId,
      },
    };

    // 템플릿 변수 설정
    if (variables && Object.keys(variables).length > 0) {
      message.kakaoOptions.variables = variables;
    }

    // 예약 발송
    if (reserveTime) {
      message.scheduledDate = reserveTime;
    }

    return this._sendOne(message);
  }

  /**
   * 친구톡 발송
   *
   * ※ 친구톡은 광고성 메시지에 주로 사용됩니다.
   *
   * @param {Object} params
   * @param {string} params.to       - 수신자 전화번호
   * @param {string} params.text     - 메시지 내용 (최대 1000자)
   * @param {string} [params.from]   - 발신번호
   * @param {string} [params.pfId]   - 카카오 채널 프로필 ID
   * @param {string} [params.imageUrl] - 첨부 이미지 URL
   * @param {string} [params.reserveTime] - 예약 발송 시간
   * @returns {Promise<Object>} 발송 결과
   */
  async sendFriendtalk({ to, text, from, pfId, imageUrl, reserveTime }) {
    if (!to) throw new Error('수신자 전화번호(to)는 필수입니다.');
    if (!text) throw new Error('메시지 내용(text)은 필수입니다.');

    const message = {
      to,
      from: from || this.defaultSender,
      text,
      type: 'CTA', // 친구톡
      kakaoOptions: {
        pfId: pfId || this.pfId,
      },
    };

    // 이미지 첨부 (친구톡 이미지)
    if (imageUrl) {
      message.kakaoOptions.imageId = imageUrl; // 또는 imageUrl 필드 사용
    }

    // 예약 발송
    if (reserveTime) {
      message.scheduledDate = reserveTime;
    }

    return this._sendOne(message);
  }

  /**
   * SMS/LMS 발송 (카카오톡 수신 불가 시 대체 발송)
   *
   * @param {Object} params
   * @param {string} params.to      - 수신자 전화번호
   * @param {string} params.text    - 메시지 내용
   * @param {string} [params.from]  - 발신번호
   * @param {string} [params.type]  - 'SMS' (90바이트 이하) | 'LMS' (2000바이트 이하) | 'MMS'
   * @returns {Promise<Object>} 발송 결과
   */
  async sendSMS({ to, text, from, type }) {
    if (!to) throw new Error('수신자 전화번호(to)는 필수입니다.');
    if (!text) throw new Error('메시지 내용(text)은 필수입니다.');

    const message = {
      to,
      from: from || this.defaultSender,
      text,
      type: type || 'SMS',
    };

    return this._sendOne(message);
  }

  // ── 대량 발송 (그룹 메시지) ─────────────────

  /**
   * 그룹 생성
   * @private
   * @returns {Promise<string>} groupId
   */
  async _createGroup() {
    const result = await this._request('POST', '/messages/v4/groups', {});
    // 신규 응답: 그룹 정보 전체를 포함하므로 groupInfo.groupId 추출
    return result.groupId || result.groupInfo?.groupId;
  }

  /**
   * 그룹에 메시지 추가
   * @private
   * @param {string} groupId
   * @param {Object[]} messages
   * @returns {Promise<Object>}
   */
  async _addGroupMessages(groupId, messages) {
    const body = { messages };
    return this._request('PUT', `/messages/v4/groups/${groupId}/messages`, body);
  }

  /**
   * 그룹 발송 실행
   * @private
   * @param {string} groupId
   * @returns {Promise<Object>}
   */
  async _sendGroup(groupId) {
    return this._request('POST', `/messages/v4/groups/${groupId}/send`, {});
  }

  /**
   * 대량 메시지 일괄 발송 (send-many/detail 방식)
   *
   * 만 건 이하는 send-many/detail, 초과 시 그룹 API 자동 전환.
   *
   * @param {Object[]} messages - 솔라피 메시지 객체 배열
   * @param {Object} [opts]
   * @param {string} [opts.scheduledDate] - 예약 발송 시간 (ISO 8601)
   * @param {boolean} [opts.strict] - 엄격 검사 여부
   * @returns {Promise<Object>} { ok, groupId, count, status }
   */
  async sendGroupMessages(messages, opts = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages 배열이 비어있습니다.');
    }

    // 만 건 이하: send-many/detail 로 한 번에 발송
    if (messages.length <= 10000) {
      const body = {
        messages,
        showMessageList: true,
      };
      if (opts.scheduledDate) body.scheduledDate = opts.scheduledDate;
      if (opts.strict !== undefined) body.strict = opts.strict;

      const result = await this._request('POST', '/messages/v4/send-many/detail', body);
      const groupInfo = result.groupInfo || {};
      const failedList = result.failedMessageList || [];

      return {
        ok: true,
        groupId: groupInfo.groupId || null,
        count: messages.length,
        failedCount: failedList.length,
        status: groupInfo.status || 'PENDING',
        failedMessageList: failedList,
        raw: result,
      };
    }

    // 만 건 초과: 그룹 API 사용
    const groupId = await this._createGroup();
    await this._addGroupMessages(groupId, messages);
    const result = await this._sendGroup(groupId);

    return {
      ok: true,
      groupId,
      count: messages.length,
      failedCount: 0,
      status: result.status || 'PENDING',
      failedMessageList: [],
      raw: result,
    };
  }

  // ── 발송 결과 조회 ──────────────────────────

  /**
   * 단건 메시지 발송 상태 조회
   * @param {string} messageId - 메시지 ID
   * @returns {Promise<Object>} { messageId, status, type, ... }
   */
  async getMessageStatus(messageId) {
    if (!messageId) throw new Error('messageId는 필수입니다.');

    const result = await this._request('GET', `/messages/v4/${messageId}`);
    // 신규 응답: message 객체를 직접 반환하거나 data.message 로 감싸서 올 수 있음
    const msg = result.message || result.data?.message || result;
    return {
      messageId: msg.messageId,
      status: msg.status, // PENDING | SENDING | COMPLETE | FAILED
      type: msg.type,
      to: msg.to,
      statusCode: msg.statusCode,
      statusMessage: msg.statusMessage,
      raw: result,
    };
  }

  /**
   * 그룹 메시지 발송 상태 조회
   * @param {string} groupId - 그룹 ID
   * @returns {Promise<Object>} 그룹 상태 정보
   */
  async getGroupStatus(groupId) {
    if (!groupId) throw new Error('groupId는 필수입니다.');

    const result = await this._request('GET', `/messages/v4/groups/${groupId}`);
    return {
      groupId: result.groupId,
      status: result.status,
      totalCount: result.totalCount,
      successCount: result.successCount,
      failCount: result.failCount,
      raw: result,
    };
  }
}

// ──────────────────────────────────────────────
//  팩토리 함수 (환경변수 기반 인스턴스 생성)
// ──────────────────────────────────────────────

/**
 * 솔라피 클라이언트 인스턴스 생성
 *
 * 환경변수(.env)에서 API 키를 읽어옵니다.
 *   - SOLAPI_API_KEY      : 솔라피 API Key
 *   - SOLAPI_API_SECRET   : 솔라피 API Secret
 *   - SOLAPI_KAKAO_PF_ID  : 카카오톡 채널 프로필 ID
 *   - SOLAPI_DEFAULT_SENDER : 기본 발신번호
 *
 * @returns {SolapiClient}
 */
function createSolapiClient() {
  return new SolapiClient({
    apiKey: process.env.SOLAPI_API_KEY || '',
    apiSecret: process.env.SOLAPI_API_SECRET || '',
    pfId: process.env.SOLAPI_KAKAO_PF_ID || '',
    defaultSender: process.env.SOLAPI_DEFAULT_SENDER || '',
  });
}

module.exports = { SolapiClient, createSolapiClient };
