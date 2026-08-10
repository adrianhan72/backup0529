// generate_audit_report.js — 요건 충족 감사 보고서 Word 문서 생성
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        WidthType, AlignmentType, BorderStyle, HeadingLevel, ShadingType,
        TableLayoutType, convertInchesToTwip } = require('docx');

// ── 헬퍼 ──
const B = (text) => new TextRun({ text, bold: true, font: '맑은 고딕', size: 21 });
const N = (text) => new TextRun({ text, font: '맑은 고딕', size: 21 });
const S = (text) => new TextRun({ text, font: '맑은 고딕', size: 18, color: '666666' });
const R = (text) => new TextRun({ text, font: '맑은 고딕', size: 21, color: 'DC2626', bold: true });
const G = (text) => new TextRun({ text, font: '맑은 고딕', size: 21, color: '16A34A', bold: true });
const O = (text) => new TextRun({ text, font: '맑은 고딕', size: 21, color: 'D97706', bold: true });

const heading = (text, level) => new Paragraph({
  children: [new TextRun({ text, bold: true, font: '맑은 고딕', size: level === 1 ? 32 : level === 2 ? 26 : 22 })],
  heading: HeadingLevel[`HEADING_${level}`],
  spacing: { before: level === 1 ? 400 : 300, after: 200 },
});

const para = (...runs) => new Paragraph({
  children: runs,
  spacing: { after: 120 },
});

const cell = (text, opts = {}) => new TableCell({
  children: [para(new TextRun({ text: String(text), font: '맑은 고딕', size: opts.size || 18, bold: opts.bold || false, color: opts.color || '333333' }))],
  shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
  width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
  verticalAlign: 'center',
});

const headerCell = (text) => cell(text, { bold: true, shading: '1E3A5F', color: 'FFFFFF', size: 18 });

function makeTable(headers, rows) {
  return new Table({
    rows: [
      new TableRow({ children: headers.map(h => headerCell(h)), tableHeader: true }),
      ...rows.map(row => new TableRow({ children: row.map(c => cell(c)) })),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });
}

// ============================================================================
// 문서 생성
// ============================================================================
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: '맑은 고딕', size: 21 },
      },
    },
  },
  sections: [{
    children: [
      // ── 표지 ──
      new Paragraph({ spacing: { before: 2000 } }),
      heading('인사톡 노무톡 — 급여 계산 엔진', 1),
      heading('법적 요건 충족 감사 보고서', 1),
      para(S('작성일: 2026년 7월 24일')),
      para(S('대상: backup0529 프로젝트 (refactoring_ai 브랜치)')),
      para(S('근거: 근로기준법, 고용보험법, 산업재해보상보험법 및 2026년 노동부 지침')),
      new Paragraph({ spacing: { before: 600 } }),

      // ── 1. 개요 ──
      heading('1. 감사 개요', 2),
      para(N('본 보고서는 인사톡 노무톡 시스템의 급여 계산 엔진이 대한민국 근로기준법, 고용보험법, 산업재해보상보험법 및 2026년 기준 최신 노동부 지침에서 요구하는 사항을 충족하는지 검토한 결과입니다.')),
      para(N('감사 범위는 근로계약, 급여입력 및 급여명세서, 임금대장 생성, 퇴직급여의 4개 영역에 걸친 9개 핵심 요건(R1~R9)을 대상으로 하였습니다.')),
      new Paragraph({ spacing: { before: 200 } }),

      // ── 2. 종합 판정 ──
      heading('2. 종합 판정', 2),
      makeTable(
        ['요건', '상태', '핵심 이슈'],
        [
          ['R1: 5인 미만 특례', '✅ 충족', '가산수당 0원 처리 완료. 단, 휴업수당(R6)에는 미적용'],
          ['R2: 출산전후휴가', '❌ 미구현', '계산 로직 전무, 우선지원대상기업/대기업 구분 없음'],
          ['R3: 육아휴직', '❌ 미구현', '근태 라벨만 존재, 0원 강제 로직 없음'],
          ['R4: 산재휴직', '❌ 미구현', '근태 라벨만 존재, 0원 강제 로직 없음'],
          ['R5: 개인 병가', '⚠️ 일부', 'sick_leave_pay_rate 저장/전달까지 되나 calcPI()에서 미사용'],
          ['R6: 경영상 휴업수당', '❌ 미구현', '평균임금 70% 계산식 없음'],
          ['R7: 일할 계산 방식', '⚠️ 일부', '월 소정근로일수 방식만 구현, 30일 고정 옵션 없음'],
          ['R8: 주휴수당 차감', '⚠️ 일부', '월 단위 floor만 적용, 주 단위 결근 추적 없음'],
          ['R9: 국가 지원금 제외', '❌ 미구현', '"회사 부담 vs 정부 지급" 개념 자체 없음'],
        ]
      ),
      new Paragraph({ spacing: { before: 400 } }),

      // ── 3. 상세 분석 ──
      heading('3. 상세 보완 의견', 2),

      // R1
      heading('3.1 R1: 5인 미만 사업장 특례 (✅ 충족)', 3),
      para(B('현황: '), N('payroll-input-main.js의 _getPISmallFirmInfo() 함수에서 상시근로자 수를 법정 산식(연인원÷가동일수)으로 계산하고, 50% 초과 특례까지 적용하여 5인 미만 여부를 정확히 판정합니다.')),
      para(N('calcPI() 함수에서 _isSmall 플래그에 따라 연장(×1.5), 야간(×0.5), 휴일(×1.5/2.0) 가산수당을 0원으로 처리합니다.')),
      para(B('보완 필요: '), R('R6 경영상 휴업수당에도 5인 미만 예외를 적용해야 합니다. 근로기준법 제46조는 5인 이상 사업장에만 적용됩니다.')),
      para(S('파일: payroll-input-main.js (calcPI 함수, _getPISmallFirmInfo 함수)')),

      // R5
      heading('3.2 R5: 개인 병가 유급 처리 (⚠️ → 보완 시급)', 3),
      para(B('현황: '), N('sick_leave_pay_rate 필드가 companies 테이블에 존재하고, 고객사 설정 → 근태 관리대장 → pi-absent-data hidden 필드까지 데이터가 전달됩니다.')),
      para(R('문제: '), N('calcPI() 함수에서 pi-absent-data를 전혀 읽지 않습니다. 유급 병가도 무단결근과 동일하게 100% 공제됩니다.')),
      para(B('보완 방법:')),
      para(N('1. calcPI()의 결근 차감 섹션(약 2,720~2,760행)에서 pi-absent-data JSON을 파싱')),
      para(N('2. absentType이 "sick_paid"인 항목은 rate 값을 읽어 공제율을 (100 - rate)%로 적용')),
      para(N('3. "unauthorized" 타입은 기존대로 100% 공제 유지')),
      para(S('영향: 실제 급여 금액 오차 발생 — 가장 시급한 보완 항목')),

      // R7
      heading('3.3 R7: 일할 계산 방식 선택 (⚠️ → 보완 필요)', 3),
      para(B('현황: '), N('base_salary ÷ 월 소정근로일수 × 실제근무일수 방식으로 고정되어 있습니다.')),
      para(R('문제: '), N('많은 중소기업이 사용하는 base_salary ÷ 30 × 근무일수(30일 고정) 방식을 선택할 수 없습니다.')),
      para(B('보완 방법:')),
      para(N('1. companies 테이블에 proration_method 컬럼 추가 (working_days | 30day_fixed, 기본값 working_days)')),
      para(N('2. 고객사 설정 화면에 라디오 버튼 추가')),
      para(N('3. calcPI()에서 prorationMethod 분기: 30일 고정 시 base_salary / 30 × workDays')),
      para(S('영향: 사용자 선택권 — UI + DB + 계산 로직 3곳 변경 필요')),

      // R2
      heading('3.4 R2: 출산전후휴가 (❌ → 신규 개발)', 3),
      para(B('현황: '), N('출산휴가 급여 계산 로직이 전무합니다. 우선지원대상기업/대기업 구분 필드도 없습니다.')),
      para(B('보완 방법:')),
      para(N('(a) 데이터 모델 확장')),
      para(N('  - companies.company_size 컬럼 추가 (priority_support / large / general)')),
      para(N('  - 2026년 상한액 2,200,000원을 constants.js에 상수화')),
      para(N('(b) 계산 로직 신설 — _calcMaternityLeavePay() 함수')),
      para(N('  - 우선지원대상기업, 1~60일: max(0, 월 통상임금 - 2,200,000원)')),
      para(N('  - 대기업, 1~60일: 월 통상임금의 100%')),
      para(N('  - 61~90일(모두): 0원 (고용보험 직접 지급)')),
      para(N('(c) 근태 관리대장의 maternity_paid 항목과 연동')),
      para(S('영향: 법적 필수 — 신규 모듈 개발, 4개 파일 변경')),

      // R3/R4
      heading('3.5 R3/R4: 육아휴직·산재 (❌ → 경량 구현)', 3),
      para(B('현황: '), N('근태 관리대장에 "육아휴직 (고용보험지급)", "산재 (근로복지공단 지급)" 라벨만 존재하고, 급여 계산에서는 아무 처리도 하지 않습니다.')),
      para(B('보완 방법:')),
      para(N('1. calcPI()에서 pi-absent-data를 읽어 childcare_leave, industrial 타입이면 해당 기간 급여 = 0원')),
      para(N('2. 근태 관리대장 UI에 안내 문구 강화')),
      para(N('3. 급여 명세서에 "국가 지원금 (참고)" 행 추가')),
      para(S('영향: 개념적 명확화 — 소규모 변경')),

      // R6
      heading('3.6 R6: 경영상 휴업수당 (❌ → 신규 개발)', 3),
      para(B('현황: '), N('layoff_leave 근태 타입만 있고 계산 로직이 없습니다.')),
      para(B('보완 방법:')),
      para(N('1. _calcBusinessSuspensionPay() 함수 작성:')),
      para(N('   - 평균임금의 70% × 휴업일수')),
      para(N('   - 평균임금 70% > 통상임금 100% → 통상임금 100%로 상한')),
      para(N('   - 5인 미만 → 0원 (R1의 _isSmall 플래그 사용)')),
      para(N('2. 평균임금 산출: wage-severance.js의 calcAverageWage3() 로직 참조')),
      para(S('영향: 법적 필수 — 신규 함수 개발')),

      // R8
      heading('3.7 R8: 주휴수당 차감 (⚠️ → 정밀 보완)', 3),
      para(B('현황: '), N('calcWeeklyHolidayPay()가 floor(총근무일수 / 주당근무일수)로 월 단위 계산합니다. 주 중 무급휴가로 특정 주가 미달되어도 감지하지 못합니다.')),
      para(B('보완 방법:')),
      para(N('1. 근태 관리대장 데이터로 각 주의 실제 근무일수를 계산')),
      para(N('2. _calcWeeklyHolidayPay()에 주 단위 무결성 검증 추가')),
      para(N('3. 회사 내규 설정: "무급휴가 주의 주휴수당 차감" (기본값: 차감)')),
      para(S('영향: 법적 정확성 — 계산 로직 정밀화')),

      // R9
      heading('3.8 R9: 국가 지원금 제외 (❌ → 구조적 보완)', 3),
      para(B('현황: '), N('"회사 부담 vs 정부 지원" 개념이 시스템에 전혀 없습니다.')),
      para(B('보완 방법:')),
      para(N('1. payrolls 테이블에 government_subsidy 컬럼 추가 (참고용)')),
      para(N('2. 급여 명세서/PDF에 "국가 지원금 (참고)" 행 추가')),
      para(N('3. calcPI() 결과에 companyPay / governmentSubsidy 구분')),
      para(S('영향: 정보 제공 — DB + UI 변경')),

      new Paragraph({ spacing: { before: 600 } }),

      // ── 4. 우선순위 ──
      heading('4. 우선순위 요약', 2),
      makeTable(
        ['순위', '요건', '작업 규모', '영향도'],
        [
          ['🔴 1', 'R5: 병가 유급률 적용', '소 (10라인 내외)', '실제 급여 금액 오차'],
          ['🟠 2', 'R7: 일할 계산 방식 선택', '중 (UI+DB+로직)', '사용자 선택권'],
          ['🟠 3', 'R8: 주휴수당 주 단위 차감', '중 (계산 로직)', '법적 정확성'],
          ['🟡 4', 'R2: 출산전후휴가', '대 (신규 모듈)', '법적 필수'],
          ['🟡 5', 'R6: 경영상 휴업수당', '중 (신규 함수)', '법적 필수'],
          ['🟢 6', 'R3/R4: 육아휴직·산재', '소 (0원 처리)', '개념적 명확화'],
          ['🟢 7', 'R9: 국가 지원금 표시', '중 (DB+UI)', '정보 제공'],
        ]
      ),
      new Paragraph({ spacing: { before: 400 } }),

      // ── 5. 부록: 코드 위치 ──
      heading('5. 부록: 주요 코드 위치', 2),
      makeTable(
        ['요건', '파일', '함수/위치'],
        [
          ['R1', 'payroll-input-main.js', '_getPISmallFirmInfo() (2969~3108행) / calcPI() (2660~2674행)'],
          ['R5', 'attendance-ledger.js', '_atlGetSickLeaveRate() (151행)'],
          ['R5', 'payroll-input-main.js', 'calcPI() 결근 차감 섹션 (2720~2760행) — 미사용'],
          ['R7', 'payroll-input-main.js', 'calcPI() 일할계산 (2682~2707행)'],
          ['R8', 'payroll-input-main.js', 'calcWeeklyHolidayPay() (3083~3188행)'],
          ['R6/R2', 'wage-severance.js', 'calcAverageWage3() (142~144행) — 참조 가능'],
        ]
      ),
      new Paragraph({ spacing: { before: 600 } }),

      para(S('— 보고서 끝 —')),
    ],
  }],
});

// ── 파일 저장 ──
const outPath = 'c:/Users/com/Desktop/Project/backup0529/docs/급여계산엔진_법적요건감사보고서_20260724.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Word 보고서 생성 완료: ${outPath}`);
});
