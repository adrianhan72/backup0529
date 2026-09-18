/**
 * lib/message-templates.js — 알림 메시지 템플릿
 * 솔라피 알림톡/SMS에 사용되는 메시지 본문을 한 곳에서 관리합니다.
 */

/**
 * 대표 연락처 footer (공통)
 * @param {{ phone?:string, email?:string, fax?:string }} contact
 * @returns {string}
 */
function contactFooter(contact) {
  return [
    '─────────────────────',
    '인사톡 노무톡 · 대화인사노무파트너스 담당자',
    `● 전화: ${contact.phone || '02)3487-8841'}`,
    `● 이메일: ${contact.email || 'eunyangpark@naver.com'}`,
    `● 팩스: ${contact.fax || '02)3487-8882'}`,
  ].join('\n');
}

/**
 * 정규직 전환 안내 (매일 9시)
 * @returns {{ title:string, body:string }}
 */
function regularConversion(companyName, empName, firstStart, durationStr, contact, isExceeded) {
  const title = isExceeded
    ? `[정규직 전환 의무] ${empName} — 기간제 2년 초과 (${durationStr})`
    : `[정규직 전환 사전 고지] ${empName} — 2년 도달 30일 전 (${durationStr})`;

  const bodyIntro = isExceeded
    ? '소속 직원의 기간제 근로 누적 기간이 2년(730일)을 초과하여'
      + ' 법률에 따른 정규직 전환 의무가 발생하였음을 안내드립니다.'
    : '소속 직원의 기간제 근로 누적 기간이 2년(730일) 도달 30일 전입니다.'
      + ' 정규직 전환 의무 발생에 대비해 미리 준비해 주세요.';

  const bodyFooter = isExceeded
    ? '※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는'
      + ' 법적 의무 위반 발생 고지로 해당 근로자에게는 통보되지 않습니다.'
    : '※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는'
      + ' 법적 의무 사전 고지로 해당 근로자에게는 통보되지 않습니다.';

  const body = [
    `안녕하세요, ${companyName} 사장님.`,
    '',
    bodyIntro,
    '',
    `■ 직원명: ${empName}`,
    `■ 입사일: ${firstStart || '-'}`,
    `■ 누적 근로일수: ${durationStr}`,
    '',
    '◆ 관련 법령',
    '「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:',
    '사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는',
    '그 기간제근로자는 기간의 정함이 없는 근로계약을',
    '체결한 근로자로 봅니다.',
    '',
    '◆ 필요 조치',
    '담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요.',
    '',
    bodyFooter,
    '',
    contactFooter(contact),
  ].join('\n');

  return { title, body };
}

/**
 * 정규직 전환 재안내 (매주 월요일 9시)
 */
function regularConversionWeekly(companyName, empName, firstStart, durationStr, contact) {
  const title = `[재안내] 정규직 전환 의무 — ${empName} (누적 ${durationStr})`;

  const body = [
    `안녕하세요, ${companyName} 사장님.`,
    '',
    '소속 직원의 기간제 근로 누적 기간이 2년(730일)을 초과하였으나,',
    '아직 정규직 근로계약이 등록되지 않아 재안내드립니다.',
    '',
    `■ 직원명: ${empName}`,
    `■ 입사일: ${firstStart || '-'}`,
    `■ 누적 근로일수: ${durationStr}`,
    '',
    '◆ 관련 법령',
    '「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:',
    '사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는',
    '그 기간제근로자는 기간의 정함이 없는 근로계약을',
    '체결한 근로자로 봅니다.',
    '',
    '◆ 필요 조치',
    '아직 정규직 근로계약서가 등록되지 않았습니다.',
    '담당 노무사에게 정규직 근로계약서 작성을 요청해 주세요.',
    '',
    '※ 본 안내는 대화인사노무파트너스에서 대표님께만 보내드리는',
    '법적 의무 위반 발생 고지로 해당 근로자에게는 통보되지 않습니다.',
    '※ 정규직 계약이 이미 등록된 경우 이 메시지를 무시하셔도 됩니다.',
    '',
    contactFooter(contact),
  ].join('\n');

  return { title, body };
}

/**
 * 수습만료 통지 (매일 9시)
 */
function probationExpiry(companyName, empName, hireType, probMonths, probEndKr, ddayStr, contact) {
  const title = `[수습만료 예정] ${empName} — 수습기간 ${probMonths}개월 (${ddayStr})`;

  const body = [
    `안녕하세요, ${companyName} 사장님.`,
    '',
    '소속 직원의 수습기간 만료일이 다가와 안내드립니다.',
    '',
    `■ 직원명: ${empName}`,
    `■ 고용형태: ${hireType}`,
    `■ 수습기간: ${probMonths}개월`,
    `■ 수습 만료일: ${probEndKr} (${ddayStr})`,
    '',
    '◆ 중요 안내',
    '수습기간이 3개월을 초과하는 근로자의 경우,',
    '해고 시 「근로기준법」에 따른 해고예고',
    '(30일 전 서면통지) 의무가 발생합니다.',
    '만료 30일 전까지 본채용 여부를 결정하시어',
    '담당 노무사에게 알려주시기 바랍니다.',
    '',
    '※ 본 안내는 대화인사노무파트너스에서 발송한',
    '법적 의무 안내입니다.',
    '',
    contactFooter(contact),
  ].join('\n');

  return { title, body };
}

/**
 * 시스템 설정 메시지 본문 규칙 조회 (크론용)
 * @param {{msg_body_rules?: string|object}} contact - representative_contact 행
 * @param {string} ruleType
 * @returns {{title:string, body:string}|null}
 */
function getMsgRuleFromContact(contact, ruleType) {
  if (!contact || !contact.msg_body_rules) return null;
  try {
    const rules = typeof contact.msg_body_rules === 'string'
      ? JSON.parse(contact.msg_body_rules)
      : contact.msg_body_rules;
    return (rules && rules[ruleType]) || null;
  } catch (e) { return null; }
}

/**
 * {키} 플레이스홀더 치환
 * @param {string} text
 * @param {object} vars
 * @returns {string}
 */
function applyMsgRuleVars(text, vars) {
  if (!text) return text;
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split('{' + k + '}').join(v != null ? String(v) : '');
  }
  return out;
}

/** 고용형태 코드 → 한글 (크론 치환용) */
const CONTRACT_TYPE_KR = {
  fixed_term: '계약직',
  fixed_probation: '계약직 수습',
  daily: '일용직',
  regular_probation: '정규직 수습',
  regular: '정규직',
};

module.exports = {
  contactFooter,
  regularConversion,
  regularConversionWeekly,
  probationExpiry,
  getMsgRuleFromContact,
  applyMsgRuleVars,
  CONTRACT_TYPE_KR,
};
