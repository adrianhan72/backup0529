const docx = require('docx');
const fs = require('fs');

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
  AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat, NumberFormat } = docx;

// ── 스타일 상수 ──
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };
const headerShading = { fill: '1A1A2E', type: ShadingType.CLEAR, color: 'FFFFFF' };
const redShading    = { fill: 'FEF2F2', type: ShadingType.CLEAR };
const yellowShading = { fill: 'FFFBEB', type: ShadingType.CLEAR };
const greenShading  = { fill: 'F0FDF4', type: ShadingType.CLEAR };
const grayShading   = { fill: 'F8FAFC', type: ShadingType.CLEAR };
const blueShading   = { fill: 'EFF6FF', type: ShadingType.CLEAR };

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: headerShading,
    borders,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })] })],
  });
}
function cell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading,
    borders,
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: String(text), size: 18, color: opts.color, bold: opts.bold })] })],
  });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, size: 20, bold: opts.bold, color: opts.color })] });
}
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 }, children: [new TextRun({ text, size: 26, bold: true, color: '1A1A2E' })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 }, children: [new TextRun({ text, size: 22, bold: true, color: '374151' })] }); }

// ── 문서 본문 ──
const children = [
  // ── 표지 ──
  new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '인사톡 노무톡', size: 48, bold: true, color: '1A1A2E' })] }),
  new Paragraph({ spacing: { after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '발송 메시지 감사 보고서', size: 36, bold: true, color: '4F46E5' })] }),
  new Paragraph({ spacing: { after: 100 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '메시지 발송 체계 전반에 대한 7개 기준 감사', size: 22, color: '6B7280' })] }),
  new Paragraph({ spacing: { after: 4000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2026년 7월 25일', size: 22, color: '9CA3AF' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '대화인사노무파트너스', size: 24, bold: true, color: '374151' })] }),

  // ── Page break ──
  new Paragraph({ children: [new TextRun({ text: '', break: 1 })] }),

  // ── 감사 개요 ──
  h2('1. 감사 개요'),
  p('본 보고서는 인사톡 노무톡 시스템에서 발송되는 모든 메시지(근로자 대상 알림톡·이메일, 고객사 대상 인앱 알림·알림톡)를 7가지 기준으로 감사한 결과를 정리한 것입니다.'),
  p('', { bold: false }),
  p('감사 기준:', { bold: true }),
  p('① 고객사 메시지: 관리자 시스템 기능 참조 금지 — "당신을 대신해 처리 중"이라는 수시 보고 형식'),
  p('② 근로자 메시지: 법정 고지·발급 의무에 해당하는 것만 간결하게'),
  p('③ 위험 예방 체인: 사전감지 → 예방권고 → 긴급조치 → 사후대처의 완전성'),
  p('④ 발송 이력: 모든 발송 메시지의 감사 추적 및 관리자 조회 가능'),
  p('⑤ 발송문 예측: 관리시스템에서 발송 전 프리뷰 제공'),
  p('⑥ 메시지 표준 규칙: 수신 대상·발송방법별 규칙 정의 및 향후 시스템 설정 연동 설계'),
  p('⑦ ON/OFF 토글: 법적 필수 외 메시지의 케이스별 활성/비활성 기능 설계'),

  // ── 시스템 메시지 현황 ──
  h2('2. 시스템 메시지 현황'),
  p('감사 시점 기준 시스템에서 발송되는 메시지는 총 15종이며, 근로자 대상 4종과 고객사 대상 11종으로 구성됩니다.', { bold: false }),

  h3('2.1 근로자 대상 메시지 (4종)'),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('메시지', 25), headerCell('발송 채널', 15), headerCell('트리거', 20), headerCell('법적 근거', 20), headerCell('템플릿', 20)] }),
      ...['근로계약서 발송|알림톡/이메일/수동|관리자 발송 버튼|근로기준법 제17조|CONTRACT_MSG_TEMPLATES',
         '급여명세서 발송|알림톡/이메일/수동|관리자 발송 버튼|근로기준법 제48조|PAYSLIP_MSG_TEMPLATES',
         '정보제공동의서 발송|알림톡/이메일|관리자 발송 버튼|개인정보보호법|CONSENT_MSG_TEMPLATES',
         '계약만료 통지|알림톡(자동)|매일 9시 CRON|기간제법 제4조|CONTRACT_EXPIRY_001'].map(r => {
        const cols = r.split('|');
        return new TableRow({ children: cols.map(c => cell(c)) });
      }),
    ],
  }),

  new Paragraph({ spacing: { before: 200 } }),
  h3('2.2 고객사 대상 메시지 (11종)'),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('메시지', 30), headerCell('notice_type', 20), headerCell('발송 채널', 15), headerCell('트리거', 20), headerCell('규칙화', 15)] }),
      ...['근로계약서 발송 완료|contract_dispatched|인앱|계약서 발송 직후|✅ 규칙 사용',
         '급여명세서 발송 완료|payslip_dispatched|인앱|급여명세서 발송 직후|❌ 하드코딩',
         '계약만료 예정|contract_expiry|인앱|계약만료 통지 발송 시|❌ 하드코딩',
         '정규직 전환 안내|regular_conversion|인앱+알림톡|매일 9시 CRON|❌ 하드코딩',
         '정규직 전환 주간 재안내|regular_conversion|인앱+알림톡|매주 월요일 9시 CRON|❌ 하드코딩',
         '수습만료 예정|probation_expiry|인앱+알림톡|매일 9시 CRON|❌ 하드코딩',
         '수습만료 긴급(D-7)|probation_expiry_urgent|인앱+알림톡|매일 9시 CRON|❌ 하드코딩',
         '계약 해지 철회|contract_termination_cancelled|인앱|해지예정 철회 시|❌ 하드코딩',
         '계약 파기|contract_voided|인앱|계약 파기 시|❌ 하드코딩',
         '계약 갱신 예약|contract_renewal_scheduled|인앱|갱신 예약 시|❌ 하드코딩',
         '일반 공지|general|인앱|관리자 작성 발송|❌ 자유 입력'].map(r => {
        const cols = r.split('|');
        return new TableRow({ children: cols.map((c, i) => cell(c, i === 4 && c.includes('❌') ? { shading: redShading } : {})) });
      }),
    ],
  }),

  // ── Page break ──
  new Paragraph({ children: [new TextRun({ text: '', break: 1 })] }),

  // ── 기준별 감사 결과 ──
  h2('3. 기준별 감사 결과'),

  // 기준 1
  h3('3.1 기준 ①: 고객사 메시지의 관리자 시스템 참조 금지'),
  p('감사 결과: 🔴 위반 7건 발견', { bold: true, color: 'DC2626' }),
  p('고객사 메시지에서 "담당 노무사에게 ~하세요"라고 고객이 직접 행동을 취하도록 지시하는 패턴이 6개 파일에서 발견되었습니다. 이는 고객사가 시스템 관리자에게 업무를 지시하는 듯한 인상을 줍니다.', { bold: false }),
  p('', { bold: false }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('파일', 20), headerCell('라인', 8), headerCell('현재 메시지', 36), headerCell('권장 변경', 36)] }),
      ...['company-notice.js|457|"담당 노무사에게 갱신 여부를 확인해 주세요"|"담당 노무사가 갱신 절차를 검토 중입니다. 확인되는 대로 안내드리겠습니다."',
         'server.js|567|"담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요"|"담당 노무사가 정규직 전환 절차를 진행 중입니다."',
         'server.js|764|"본채용 여부를 결정하시어 담당 노무사에게 알려주시기 바랍니다"|"담당 노무사가 본채용 절차를 준비하고 있습니다."',
         'regular-conversion.js|320|"담당 노무사에게 계약서 작성을 요청해 주세요"|"담당 노무사가 정규직 근로계약서를 준비 중입니다."',
         'regular-conversion.js|354|"담당 노무사에게 즉시 연락하여 정규직 근로계약서 작성을 요청하세요"|"담당 노무사가 긴급히 정규직 전환을 진행하고 있습니다."',
         'annual-leave.js|1110|"자세한 사항은 담당 노무사 {name}에게 문의하시기 바랍니다"|"자세한 사항은 담당 노무사가 별도 안내드릴 예정입니다."',
         'general-notice.js|442|"상세 내용은 담당 노무사에게 문의하세요"|"상세 내용은 담당 노무사가 안내드릴 예정입니다."'].map(r => {
        const cols = r.split('|');
        return new TableRow({ shading: redShading, children: cols.map(c => cell(c)) });
      }),
    ],
  }),

  // 기준 2
  h3('3.2 기준 ②: 근로자 메시지 간결성'),
  p('감사 결과: 🟡 경미 1건', { bold: true, color: 'D97706' }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('메시지', 20), headerCell('현재', 40), headerCell('권장', 40)] }),
      new TableRow({ shading: yellowShading, children: [
        cell('급여명세서 카카오'),
        cell('"급여 관련 문의사항이 있으시면...감사합니다. {회사명} 드림"'),
        cell('해당 문구 삭제. 문서 링크와 비밀번호 안내만으로 충분'),
      ]}),
      new TableRow({ shading: greenShading, children: [
        cell('근로계약서 발송'),
        cell('법정 명시의무(근기법 제17조)에 충실. 간결함'),
        cell('✅ 현행 유지'),
      ]}),
      new TableRow({ shading: greenShading, children: [
        cell('정보제공동의서 발송'),
        cell('개인정보보호법 고지의무 준수'),
        cell('✅ 현행 유지'),
      ]}),
      new TableRow({ shading: greenShading, children: [
        cell('계약만료 통지(CRON)'),
        cell('계약만료일과 잔여일수만 통지'),
        cell('✅ 현행 유지'),
      ]}),
    ],
  }),

  // ── Page break ──
  new Paragraph({ children: [new TextRun({ text: '', break: 1 })] }),

  // 기준 3
  h3('3.3 기준 ③: 위험 예방 체인 완전성'),
  p('감사 결과: 🟠 주요 누락 다수', { bold: true, color: 'D97706' }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('위험 유형', 14), headerCell('사전감지', 14), headerCell('예방권고', 14), headerCell('긴급조치(D-7)', 14), headerCell('사후대처', 14), headerCell('판정', 30)] }),
      ...['계약만료|✅ D-30 CRON|❌ 근로자에게만 발송, 고객사 미통지|❌ 없음|❌ 만료 후 안내 없음|3개 누락',
         '정규직 전환|✅ D-30 사전고지(700일)|✅ 730일 초과 통지 + 주간 재발송|✅ 주간 재발송(월요일)|❌ 초과 후 대처 안내 없음|1개 누락',
         '수습만료|✅ D-30 CRON|⚠️ 3개월 초과만 대상(모든 수습계약 필요)|❌ 없음|❌ 만료 후 안내 없음|3개 누락',
         '4대보험|❌ 없음|❌ 없음|❌ 없음|❌ 없음|전체 누락',
         '퇴직금|❌ 없음|❌ 없음|❌ 없음|❌ 없음|전체 누락'].map((r, i) => {
        const cols = r.split('|');
        const s = i === 0 ? redShading : i === 1 ? yellowShading : i === 2 ? yellowShading : redShading;
        return new TableRow({ shading: s, children: cols.map((c, j) => cell(c, { center: j >= 1 && j <= 4 })) });
      }),
    ],
  }),
  p('', { bold: false }),
  p('※ 주요 발견: 계약만료 CRON이 근로자에게만 알림톡을 발송하고 정작 고객사(사장님)에게는 자동으로 통지하지 않음. 고객사는 관리자가 수동으로 "계약만료 통지" 페이지에서 발송할 때만 인앱 알림을 받음.', { bold: false }),
  p('※ D-7 긴급 CRON이 모든 위험 유형에 부재. 7일 이내 만료되는 계약에 대해 긴급 알림이 전송되지 않음.', { bold: false }),

  // 기준 4
  h3('3.4 기준 ④: 발송 이력 감사 추적'),
  p('감사 결과: 🔴 주요 누락 2건', { bold: true, color: 'DC2626' }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('발송 유형', 20), headerCell('로그 테이블', 20), headerCell('관리자 조회 UI', 20), headerCell('상태', 40)] }),
      ...['카카오 API 호출(일반)|kakao_send_logs|❌ 관리자 UI 없음 (DB 직접 조회만 가능)|🔴 신규 페이지 필요',
         'CRON 직접 발송(7종)|기록되지 않음 (kakao_send_logs 우회)|❌ 없음|🔴 server.js CRON에 로깅 추가 필요',
         '급여명세서 발송|payroll_send_logs|✅ payslip-send.html|✅ 양호',
         '근로계약서 발송|contract_dispatch|✅ contract-dispatch.html|✅ 양호',
         '동의서 발송|consent_dispatch|✅ consent-dispatch.html|✅ 양호',
         '계약만료 통지|contract_expiry_notice|✅ contract-expiry-notice.html|✅ 양호',
         '고객사 인앱(14종)|company_notices|✅ company-notice-log.html|✅ 양호',
         '연차소진촉진|annual_leave_promotions|✅ leave-promotion.html|✅ 양호'].map(r => {
        const cols = r.split('|');
        const s = cols[3].includes('🔴') ? redShading : grayShading;
        return new TableRow({ shading: s, children: cols.map(c => cell(c)) });
      }),
    ],
  }),

  // ── Page break ──
  new Paragraph({ children: [new TextRun({ text: '', break: 1 })] }),

  // 기준 5
  h3('3.5 기준 ⑤: 발송문 사전 예측 (프리뷰)'),
  p('감사 결과: 🔴 15종 중 13종이 프리뷰 없음', { bold: true, color: 'DC2626' }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('메시지 유형', 35), headerCell('notice_type', 25), headerCell('프리뷰 여부', 20), headerCell('프리뷰 데이터', 20)] }),
      ...['근로계약서 발송(근로자)|—|✅ 있음 (contract-dispatch.html)|MSG_SAMPLE_DATA (샘플)',
         '정보제공동의서 발송(근로자)|—|✅ 있음 (consent-dispatch.html)|MSG_SAMPLE_DATA (샘플)',
         '급여명세서 발송(근로자)|—|✅ 있음 (payslip-send.html)|MSG_SAMPLE_DATA (샘플)',
         '근로계약서 발송 완료(고객사)|contract_dispatched|✅ 부분 (제목만)|MSG_RULE_DEFAULTS',
         '급여명세서 발송 완료(고객사)|payslip_dispatched|❌ 없음|—',
         '계약만료 예정(고객사)|contract_expiry|❌ 없음|—',
         '정규직 전환 안내(고객사)|regular_conversion|❌ 없음|—',
         '수습만료 예정(고객사)|probation_expiry|❌ 없음|—',
         '수습만료 긴급(고객사)|probation_expiry_urgent|❌ 없음|—',
         '계약 파기(고객사)|contract_voided|❌ 없음|—',
         '계약 갱신(고객사)|contract_renewal_scheduled|❌ 없음|—',
         '일반 공지(고객사)|general|⚠️ 작성 화면이 곧 프리뷰|—'].map((r, i) => {
        const cols = r.split('|');
        const s = i < 2 ? greenShading : (i === 3 ? yellowShading : redShading);
        return new TableRow({ shading: s, children: cols.map(c => cell(c)) });
      }),
    ],
  }),
  p('', { bold: false }),
  p('※ 현재 프리뷰 기능이 있는 3종(계약서, 동의서, 급여명세서)도 실제 수신자 데이터가 아닌 MSG_SAMPLE_DATA의 하드코딩된 샘플 데이터("(주)그린에너지", "홍길동")로만 표시됨.', { bold: false }),

  // 기준 6
  h3('3.6 기준 ⑥: 메시지 표준 규칙화'),
  p('감사 결과: 🔴 15종 중 1종만 규칙 시스템 사용', { bold: true, color: 'DC2626' }),
  p('현재 MSG_RULE_DEFAULTS에 정의된 규칙은 contract_dispatched 1종뿐입니다. 나머지 14종은 각 발송 파일에 하드코딩된 템플릿 리터럴로 작성되어 있어, 시스템 설정 화면에서 수정/보완이 불가능합니다.', { bold: false }),
  p('', { bold: false }),
  p('또한 MSG_CHANNEL_TYPES의 kakao와 email 채널은 "추후 지원 예정" 상태로 비활성화되어 있어, 근로자 대상 카카오/이메일 메시지 규칙을 시스템 설정에서 관리할 수 없습니다.', { bold: false }),
  p('', { bold: false }),
  p('권장: 모든 메시지 유형을 MSG_RULE_DEFAULTS에 등록하고, 각 발송 함수에서 getMsgBodyRule()을 통해 규칙을 조회하도록 통일', { bold: true }),

  // 기준 7
  h3('3.7 기준 ⑦: 메시지 ON/OFF 토글'),
  p('감사 결과: 🔴 토글 시스템 전무', { bold: true, color: 'DC2626' }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('항목', 30), headerCell('현황', 70)] }),
      ...['메시지 타입별 ON/OFF|❌ 없음',
         'CRON job ON/OFF|❌ 7개 CRON 모두 무조건 실행',
         '고객사별 메시지 수신 거부|❌ 없음',
         '긴급 중단(kill-switch)|❌ Solapi 장애 시에도 CRON 중단 불가',
         'Dry-run(테스트) 모드|❌ 발송 테스트 불가'].map(r => {
        const cols = r.split('|');
        return new TableRow({ shading: redShading, children: cols.map(c => cell(c)) });
      }),
    ],
  }),

  // ── Page break ──
  new Paragraph({ children: [new TextRun({ text: '', break: 1 })] }),

  // ── 우선순위 종합 ──
  h2('4. 우선순위 종합 및 권장 개선 로드맵'),

  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('순위', 6), headerCell('기준', 6), headerCell('개선 항목', 44), headerCell('영향 범위', 44)] }),
      ...['P0|1|"담당 노무사에게 ~하세요" → "처리 중입니다"로 변경 (7건)|company-notice.js, server.js, regular-conversion.js, annual-leave.js, general-notice.js, dashboard-core.js',
         'P0|4|kakao_send_logs 관리자 조회 UI 신설|신규 페이지 1개',
         'P0|4|CRON 발송도 kakao_send_logs에 기록|server.js 7개 CRON 수정',
         'P1|3|계약만료 CRON에 고객사 자동통지 추가|server.js',
         'P1|3|D-7 긴급 CRON 신설 (계약만료, 수습만료)|server.js CRON 2개 신설',
         'P1|5|전 메시지 발송 전 프리뷰 기능|시스템 설정 페이지 확장',
         'P2|6|메시지 규칙 시스템 전면 확장 (1→15종)|system-settings.js + 각 발송 파일',
         'P2|7|메시지 타입별 ON/OFF 토글 시스템|server.js + 시스템 설정 DB',
         'P2|2|급여명세서 카카오 사족 제거|message-templates.js',
         'P3|3|4대보험/퇴직금 위험 감지 신규|신규 CRON 2개'].map((r, i) => {
        const cols = r.split('|');
        const s = i < 3 ? redShading : i < 6 ? yellowShading : grayShading;
        return new TableRow({ shading: s, children: [
          cell(cols[0], { center: true, bold: true, width: 6 }),
          cell(cols[1], { center: true, width: 6 }),
          cell(cols[2], { width: 44 }),
          cell(cols[3], { width: 44 }),
        ]});
      }),
    ],
  }),

  // ── 부록: 메시지 채널 매트릭스 ──
  new Paragraph({ children: [new TextRun({ text: '', break: 1 })] }),
  h2('5. 부록: 메시지 채널 매트릭스'),

  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('채널', 15), headerCell('기술', 20), headerCell('현황', 20), headerCell('사용 메시지', 45)] }),
      ...['카카오 알림톡(ATA)|Solapi sendAlimtalk()|✅ 운영 중|급여명세서(PAYSLIP_001), 계약만료(CONTRACT_EXPIRY_001), 정규직전환(REGULAR_CONVERSION_001), 수습만료(PROBATION_EXPIRY_001)',
         '카카오 친구톡(CTA)|Solapi sendFriendtalk()|⚠️ 지원은 되나 미사용|—',
         'SMS/LMS|Solapi sendSMS()|⚠️ Kakao fallback 전용|—',
         '이메일|_sendEmailWithAttachment()|❌ STUB (600ms timeout)|급여명세서 첨부 발송 (실제 발송 안 됨)',
         '인앱 알림|company_notices 테이블|✅ 운영 중|고객사 대상 11종 전부'].map(r => {
        const cols = r.split('|');
        const s = cols[2].includes('❌') ? redShading : cols[2].includes('⚠️') ? yellowShading : greenShading;
        return new TableRow({ shading: s, children: cols.map(c => cell(c)) });
      }),
    ],
  }),
];

// ── 문서 생성 ──
const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 1200, bottom: 1200, left: 1400, right: 1400 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const outPath = 'docs/발송메시지_감사보고서_20260725.docx';
  fs.writeFileSync(outPath, buf);
  console.log('✅ 보고서 생성 완료:', outPath);
});
