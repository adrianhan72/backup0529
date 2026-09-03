/**
 * message-templates.js — 발송 메시지 안내문구 템플릿
 * 
 * 근로계약서, 급여명세서, 정보제공동의서 발송 시
 * 알림톡 / 이메일로 전송되는 메시지 예시를 제공합니다.
 * 
 * @version 1.0.0
 */

// ═══════════════════════════════════════════
// 플레이스홀더 정의
// ═══════════════════════════════════════════
const MSG_PLACEHOLDERS = {
  companyName:  '{회사명}',
  employeeName: '{근로자명}',
  docLink:      '{문서링크}',
  contractType: '{계약형태}',
  payYear:      '{급여년도}',
  payMonth:     '{급여월}',
  contractStart:'{계약시작일}',
  contractEnd:  '{계약종료일}',
  senderName:   '{발신자명}',
  senderPhone:  '{발신자연락처}',
  repPhone:     '{대표전화}',
  repEmail:     '{대표이메일}',
  repFax:       '{대표팩스}',
};

// ═══════════════════════════════════════════
// 근로계약서 발송 템플릿
// ═══════════════════════════════════════════
const CONTRACT_MSG_TEMPLATES = {
  kakao: {
    subject: null, // 알림톡은 제목 없음
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명}에서 {계약형태} 근로계약서를 보내드립니다.`,
      `아래 링크를 클릭하여 계약서를 다운로드 받으셔서 인쇄하신 다음,`,
      `날인본 사진을 아래의 이메일 또는 팩스로 회신해 주시기 바랍니다.`,
      ``,
      `▶ 계약서 확인: {문서링크}`,
      ``,
      `인사톡 노무톡 · 대화인사노무파트너스 담당자`,
      `● 전화: {대표전화}`,
      `● 이메일: {대표이메일}`,
      `● 팩스: {대표팩스}`,
    ].join('\n'),
  },
  email: {
    subject: `[{회사명}] {계약형태} 근로계약서 확인 요청`,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명}에서 {계약형태} 근로계약서를 송부드립니다.`,
      `아래 링크를 클릭하여 계약서를 다운로드 받으셔서 인쇄하신 다음,`,
      `날인본 사진을 아래의 이메일 또는 팩스로 회신해 주시기 바랍니다.`,
      ``,
      `▶ 계약서 확인: {문서링크}`,
      ``,
      `인사톡 노무톡 · 대화인사노무파트너스 담당자`,
      `● 전화: {대표전화}`,
      `● 이메일: {대표이메일}`,
      `● 팩스: {대표팩스}`,
    ].join('\n'),
  },
};

// ═══════════════════════════════════════════
// 급여명세서 발송 템플릿
// ═══════════════════════════════════════════
const PAYSLIP_MSG_TEMPLATES = {
  kakao: {
    subject: null,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명} {급여년도}년 {급여월}월 급여명세서가`,
      `발급되었습니다.`,
      `아래 링크를 클릭하여 확인해 주세요.`,
      ``,
      `▶ 명세서 확인: {문서링크}`,
      ``,
      `※ 문서 열람 비밀번호: 주민등록번호 앞 7자리`,
      ``,
      `급여 관련 문의사항이 있으시면`,
      `{회사명} 담당자에게 연락 주시기 바랍니다.`,
      ``,
      `감사합니다.`,
      `{회사명} 드림`,
    ].join('\n'),
  },
  email: {
    subject: `[{회사명}] {급여년도}년 {급여월}월 급여명세서`,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명} {급여년도}년 {급여월}월 급여명세서가`,
      `발급되었습니다.`,
      `아래 링크를 클릭하여 확인해 주세요.`,
      ``,
      `▶ 명세서 확인: {문서링크}`,
      ``,
      `※ 문서 열람 비밀번호: 주민등록번호 앞 7자리`,
      ``,
      `※ 본 메일은 발신 전용으로 회신되지 않습니다.`,
      `   문의사항은 아래 연락처로 문의 바랍니다.`,
      ``,
      `---`,
      `{회사명} | 담당자: {발신자명} ({발신자연락처})`,
    ].join('\n'),
  },
};

// ═══════════════════════════════════════════
// 정보제공동의서 발송 템플릿
// ═══════════════════════════════════════════
const CONSENT_MSG_TEMPLATES = {
  kakao: {
    subject: null,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명}에서 정보제공동의서를 보내드립니다.`,
      `아래 링크를 클릭하여 동의서 내용을 확인하시고,`,
      `동의 절차를 진행해 주시기 바랍니다.`,
      ``,
      `▶ 동의서 확인: {문서링크}`,
      ``,
      `인사톡 노무톡 · 대화인사노무파트너스 담당자`,
      `● 전화: {대표전화}`,
      `● 이메일: {대표이메일}`,
      `● 팩스: {대표팩스}`,
    ].join('\n'),
  },
  email: {
    subject: `[{회사명}] 정보제공동의서 확인 요청`,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명}에서 정보제공동의서를 송부드립니다.`,
      `아래 링크를 클릭하여 동의서 내용을 확인하시고,`,
      `동의 절차를 진행해 주시기 바랍니다.`,
      ``,
      `▶ 동의서 확인: {문서링크}`,
      ``,
      `인사톡 노무톡 · 대화인사노무파트너스 담당자`,
      `● 전화: {대표전화}`,
      `● 이메일: {대표이메일}`,
      `● 팩스: {대표팩스}`,
    ].join('\n'),
  },
};

// ═══════════════════════════════════════
// 연차 사용촉진 발송 템플릿
// ═══════════════════════════════════════
const LEAVE_PROMOTION_MSG_TEMPLATES = {
  kakao: {
    subject: null,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명}에서 연차휴가 사용촉진 안내를 보내드립니다.`,
      `미사용 연차휴가가 소멸되기 전에 사용해 주시기 바랍니다.`,
      ``,
      `인사톡 노무톡 · 대화인사노무파트너스 담당자`,
      `● 전화: {대표전화}`,
      `● 이메일: {대표이메일}`,
      `● 팩스: {대표팩스}`,
    ].join('\n'),
  },
  email: {
    subject: `[{회사명}] 연차휴가 사용촉진 안내`,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명}에서 연차휴가 사용촉진 안내를 송부드립니다.`,
      `미사용 연차휴가가 소멸되기 전에 사용해 주시기 바랍니다.`,
      ``,
      `인사톡 노무톡 · 대화인사노무파트너스 담당자`,
      `● 전화: {대표전화}`,
      `● 이메일: {대표이메일}`,
      `● 팩스: {대표팩스}`,
    ].join('\n'),
  },
};

// ═══════════════════════════════════════════
// 퇴직금 명세서 발송 템플릿
// ═══════════════════════════════════════════
const SEVERANCE_MSG_TEMPLATES = {
  kakao: {
    subject: null,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명}에서 퇴직금 명세서를 보내드립니다.`,
      `아래 링크를 클릭하여 명세서를 확인해 주세요.`,
      ``,
      `▶ 명세서 확인: {문서링크}`,
      ``,
      `인사톡 노무톡 · 대화인사노무파트너스 담당자`,
      `● 전화: {대표전화}`,
      `● 이메일: {대표이메일}`,
      `● 팩스: {대표팩스}`,
    ].join('\n'),
  },
  email: {
    subject: `[{회사명}] 퇴직금 명세서 확인 요청`,
    body: [
      `안녕하세요, {근로자명}님.`,
      ``,
      `{회사명}에서 퇴직금 명세서를 송부드립니다.`,
      `아래 링크를 클릭하여 명세서를 확인해 주세요.`,
      ``,
      `▶ 명세서 확인: {문서링크}`,
      ``,
      `인사톡 노무톡 · 대화인사노무파트너스 담당자`,
      `● 전화: {대표전화}`,
      `● 이메일: {대표이메일}`,
      `● 팩스: {대표팩스}`,
    ].join('\n'),
  },
};

// ═══════════════════════════════════════════
// 샘플 데이터 (메시지 예시 미리보기용)
// ═══════════════════════════════════════════
const MSG_SAMPLE_DATA = {
  companyName:   '(주)그린에너지',
  employeeName:  '홍길동',
  contractType:  '정규직',
  payYear:       '2026',
  payMonth:      '7',
  contractStart: '2026-07-01',
  contractEnd:   '2027-06-30',
  senderName:    '김인사',
  senderPhone:   '02-1234-5678',
  repPhone:      '02)3487-8841',
  repEmail:      'eunyangpark@naver.com',
  repFax:        '02)3487-8882',
  docLink:       'https://insatalk.kr/doc/abc123',
};

// ═══════════════════════════════════════════
// 템플릿 렌더링 유틸리티
// ═══════════════════════════════════════════

/**
 * 템플릿 문자열의 플레이스홀더를 실제 값으로 치환
 * @param {string} template - 플레이스홀더가 포함된 문자열
 * @param {object} data - 치환할 키-값 쌍
 * @returns {string} 치환된 문자열
 */
function msgReplace(template, data) {
  let result = template;
  // MSG_PLACEHOLDERS의 영문키 → 한글 플레이스홀더 → data[영문키] 매핑
  for (const [engKey, placeholder] of Object.entries(MSG_PLACEHOLDERS)) {
    const value = data[engKey] || placeholder;
    result = result.split(placeholder).join(value);
  }
  return result;
}

/**
 * 메시지 템플릿을 HTML로 변환 (미리보기용)
 * @param {object} template - { subject, body } 구조의 템플릿
 * @param {object} sampleData - 샘플 치환 데이터
 * @param {string} type - 'kakao' | 'email'
 * @returns {string} HTML 문자열
 */
function msgRenderPreview(template, sampleData, type) {
  const hasSubject = template.subject !== null;
  const subject = hasSubject ? msgReplace(template.subject, sampleData) : '';
  const body = msgReplace(template.body, sampleData);
  const bodyHtml = body
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      // 이모지/링크 강조
      let escaped = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      // 링크 라인 강조 (▶ 로 시작)
      if (escaped.startsWith('▶')) {
        escaped = `<span style="color:#2563eb;font-weight:600;">${escaped}</span>`;
      }
      return escaped;
    })
    .join('\n');

  if (type === 'kakao') {
    return [
      `<div class="msg-preview msg-preview-kakao">`,
      `  <div class="msg-preview-header">`,
      `    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>`,
      `    <span>카카오 알림톡</span>`,
      `  </div>`,
      `  <div class="msg-preview-body">${bodyHtml}</div>`,
      `</div>`,
    ].join('\n');
  } else {
    return [
      `<div class="msg-preview msg-preview-email">`,
      `  <div class="msg-preview-header">`,
      `    <i class="fas fa-envelope"></i>`,
      `    <span>이메일</span>`,
      `  </div>`,
      `  <div class="msg-preview-subject"><strong>제목:</strong> ${subject}</div>`,
      `  <div class="msg-preview-body">${bodyHtml}</div>`,
      `</div>`,
    ].join('\n');
  }
}

/**
 * 특정 발송 유형의 메시지 예시 HTML 전체를 생성
 * @param {'contract'|'payslip'|'consent'|'severance'} docType
 * @returns {string} HTML
 */
function msgRenderAllPreviews(docType) {
  let templates;
  switch (docType) {
    case 'contract': templates = CONTRACT_MSG_TEMPLATES; break;
    case 'payslip':  templates = PAYSLIP_MSG_TEMPLATES; break;
    case 'consent':  templates = CONSENT_MSG_TEMPLATES; break;
    case 'severance': templates = SEVERANCE_MSG_TEMPLATES; break;
    case 'leave_promotion': templates = LEAVE_PROMOTION_MSG_TEMPLATES; break;
    default: return '<p>알 수 없는 문서 유형입니다.</p>';
  }

  const kakaoPreview = msgRenderPreview(templates.kakao, MSG_SAMPLE_DATA, 'kakao');
  const emailPreview = msgRenderPreview(templates.email, MSG_SAMPLE_DATA, 'email');

  // 고객사 인앱 알림: 시스템 설정 체크리스트에서 해제된 유형은 예시 숨김 (2026-09-03)
  const inappEnabled = _msgInappPreviewEnabled(docType);
  const inappSection = inappEnabled
    ? [
      // ── 고객사 인앱 알림 예시 ──
      `<div class="msg-preview-grid" style="margin-top:16px;">`,
      `  <div class="msg-preview-col" style="grid-column:1/-1;">`,
      `    <div class="msg-preview-label"><i class="fas fa-bell"></i> 고객사 앱 인앱 알림 예시</div>`,
      `    <div class="msg-preview msg-preview-inapp">`,
      `      <div class="msg-preview-header" style="background:linear-gradient(135deg,#6366f1,#4f46e5);">`,
      `        <i class="fas fa-bell"></i>`,
      `        <span>${_msgInAppTitle(docType)}</span>`,
      `      </div>`,
      `      <div class="msg-preview-body">`,
      `${_msgRenderInAppPreview(docType)}`,
      `      </div>`,
      `    </div>`,
      `  </div>`,
      `</div>`,
    ].join('\n')
    : '';

  return [
    `<div class="msg-preview-grid">`,
    `  <div class="msg-preview-col">`,
    `    <div class="msg-preview-label"><i class="fas fa-comment-dots"></i> 알림톡 메시지 예시</div>`,
    `    ${kakaoPreview}`,
    `  </div>`,
    `  <div class="msg-preview-col">`,
    `    <div class="msg-preview-label"><i class="fas fa-envelope"></i> 이메일 메시지 예시</div>`,
    `    ${emailPreview}`,
    `  </div>`,
    `</div>`,
    inappSection,
    `<div class="msg-info-box">`,
    `  <i class="fas fa-info-circle"></i>`,
    `  <span>위 예시는 샘플 데이터로 작성되었습니다. 실제 발송 시 근로자명, 회사명, 문서 링크 등이 실제 데이터로 대체되어 전송됩니다.<br>${inappEnabled
      ? '인앱 알림은 발송 완료 후 고객사 앱에 자동으로 표시됩니다.'
      : '고객사 인앱 알림은 시스템 설정 > 인앱 알림 발송항목에서 체크 해제되어 발송되지 않습니다.'}</span>`,
    `</div>`,
  ].join('\n');
}

/** 해당 문서 유형의 고객사 인앱 알림이 체크 해제 상태인지 (해제 시 예시 숨김) */
function _msgInappPreviewEnabled(docType) {
  const MAP = {
    contract:  'contract_dispatched',
    consent:   'consent_dispatched',
    severance: 'severance_dispatched',
    leave_promotion: 'leave_promotion',
  };
  const type = MAP[docType];
  if (!type) return true; // payslip 등 기존 동작 유지
  try {
    const raw = window._systemSettings && window._systemSettings['inapp_notice_types_disabled'];
    if (!raw) return true;
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return !(Array.isArray(arr) && arr.includes(type));
  } catch (_) { return true; }
}

// ── 인앱 알림 미리보기 ──

/** 인앱 알림 제목 (규칙 또는 기본값) */
function _msgInAppTitle(docType) {
  if (docType === 'contract') {
    const rule = (typeof getMsgBodyRule === 'function')
      ? getMsgBodyRule('contract_dispatched')
      : null;
    if (rule?.title) {
      return rule.title
        .replace(/\{근로자명\}/g, MSG_SAMPLE_DATA.employeeName)
        .replace(/\{고용형태\}/g, MSG_SAMPLE_DATA.contractType)
        .replace(/\{회사명\}/g, MSG_SAMPLE_DATA.companyName);
    }
    return `[근로계약서 발송] ${MSG_SAMPLE_DATA.employeeName} — 근로계약서가 발송되었습니다`;
  }
  if (docType === 'payslip') {
    return `[급여명세서 발송] ${MSG_SAMPLE_DATA.employeeName} — ${MSG_SAMPLE_DATA.payYear}년 ${MSG_SAMPLE_DATA.payMonth}월 급여명세서`;
  }
  if (docType === 'severance') {
    return `[퇴직금 명세서 발송] ${MSG_SAMPLE_DATA.employeeName} — 퇴직금 명세서가 발송되었습니다`;
  }
  if (docType === 'leave_promotion') {
    return `[연차 사용촉진] ${MSG_SAMPLE_DATA.employeeName} — 연차휴가 사용을 촉진합니다`;
  }
  return '인앱 알림';
}

function _msgRenderInAppPreview(docType) {
  if (docType === 'contract') {
    const sample = `안녕하세요, (주)그린에너지 대표자님.

근로기준법 제17조(근로조건의 명시)에 따라 소속 근로자 홍길동에게 정규직 근로계약서가 카카오 알림톡(으)로 발송 완료되었음을 알려드립니다.

■ 발송 시각: 2026. 7. 24. 오후 3:30:00

* 근로계약서 날인본 사진은 계약 종료일로부터 5년간 보관됩니다.

─────────────────────
인사톡 노무톡 · 대화인사노무파트너스 담당자
● 전화: 02)3487-8841
● 이메일: eunyangpark@naver.com
● 팩스: 02)3487-8882`;
    return sample.split('\n').map(l => l ? l.replace(/&/g,'&amp;').replace(/</g,'&lt;') : '<br>').join('\n');
  } else if (docType === 'payslip') {
    const sample = `근로기준법 제48조(임금대장 및 급여명세서)에 따라 소속 근로자 홍길동에게 2026년 7월분 급여명세서가 카카오 알림톡(으)로 발송 완료되었음을 알려드립니다.

■ 근로자: 홍길동
■ 대상 년월: 2026년 7월
■ 발송 방법: 카카오 알림톡
■ 발송 시각: 2026. 7. 24. 오후 3:30:00

─────────────────────
인사톡 노무톡 · 대화인사노무파트너스 담당자
● 전화: 02)3487-8841
● 이메일: eunyangpark@naver.com
● 팩스: 02)3487-8882`;
    return sample.split('\n').map(l => l ? l.replace(/&/g,'&amp;').replace(/</g,'&lt;') : '<br>').join('\n');
  } else if (docType === 'severance') {
    const sample = `근로자퇴직급여 보장법 제9조(퇴직금의 지급)에 따라 소속 근로자 홍길동에게 퇴직금 명세서가 카카오 알림톡(으)로 발송 완료되었음을 알려드립니다.

■ 근로자: 홍길동
■ 발송 방법: 카카오 알림톡
■ 발송 시각: 2026. 7. 24. 오후 3:30:00

─────────────────────
인사톡 노무톡 · 대화인사노무파트너스 담당자
● 전화: 02)3487-8841
● 이메일: eunyangpark@naver.com
● 팩스: 02)3487-8882`;
    return sample.split('\n').map(l => l ? l.replace(/&/g,'&amp;').replace(/</g,'&lt;') : '<br>').join('\n');
  } else if (docType === 'leave_promotion') {
    const sample = `근로기준법 제61조에 따라 소속 근로자 홍길동에게 연차휴가 사용촉진 조치가 진행되었습니다.

■ 근로자: 홍길동
■ 처리 일시: 2026. 7. 24. 오후 3:30:00`;
    return sample.split('\n').map(l => l ? l.replace(/&/g,'&amp;').replace(/</g,'&lt;') : '<br>').join('\n');
  }
  return '(해당 문서 유형의 인앱 알림 예시가 없습니다)';
}
