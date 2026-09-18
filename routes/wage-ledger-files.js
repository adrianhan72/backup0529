/**
 * routes/wage-ledger-files.js — 임금대장 신고용 Excel/HTML 자동 생성 및 파일 저장
 *
 * POST /api/generate-wage-ledger-files
 *   body: { companyId, year, month }
 *   → data/generated/wage-ledgers/ 에 Excel(.xlsx) + HTML(.html) 저장
 *
 * 트리거:
 *   - 급여입력 > 당월 임금대장 업로드(일괄 저장) 시
 *   - 급여입력 > 직원 급여 확정 저장 시 (급여가 입력된 인원만으로 생성)
 *   - (일용직) 급여명세서 단건 즉시 생성은 payrollId 지정
 */
const path = require('path');
const fs   = require('fs');
const XLSX = require('xlsx');

module.exports = function(db, ROOT) {
  const { Router } = require('express');
  const router = Router();

  const GENERATED_DIR = path.join(ROOT, 'data', 'generated', 'wage-ledgers');

  // ─── 유틸 ───
  const nv = v => (v === null || v === undefined || v === '') ? 0 : Number(v);
  const numFmt = '#,##0';

  // ─── POST /api/generate-wage-ledger-files ───
  router.post('/generate-wage-ledger-files', (req, res) => {
    try {
      const { companyId, year, month } = req.body;
      if (!companyId || !year || !month) {
        return res.status(400).json({ error: 'companyId, year, month required' });
      }

      // 1. 데이터 조회
      const co = db.companies.findById(companyId);
      if (!co) return res.status(404).json({ error: 'Company not found' });

      const pays = db.all(
        'SELECT * FROM payrolls WHERE company_id = ? AND pay_year = ? AND pay_month = ? AND is_draft = 0',
        [companyId, year, month]
      );
      if (!pays.length) return res.status(404).json({ error: 'No payroll data for this period' });

      const empMap = {};
      db.all('SELECT * FROM employees WHERE company_id = ?', [companyId])
        .forEach(e => { empMap[e.id] = e; });

      pays.sort((a, b) => (empMap[a.employee_id]?.name || '').localeCompare(empMap[b.employee_id]?.name || '', 'ko'));

      // 2. 디렉토리 생성
      fs.mkdirSync(GENERATED_DIR, { recursive: true });

      const moStr = String(month).padStart(2, '0');
      const safeName = `${co.company_name}_${year}년${moStr}월`.replace(/[\\/:*?"<>|]/g, '_');
      const baseName = `${companyId}_${year}_${moStr}`;

      // 3. Excel (신고용) 생성
      const excelPath = path.join(GENERATED_DIR, `${baseName}_신고용.xlsx`);
      _generateExcel(pays, empMap, co, year, month, excelPath);

      // 4. HTML (신고용, PDF 열람용) 생성
      const htmlPath = path.join(GENERATED_DIR, `${baseName}_신고용.html`);
      _generateHtml(pays, empMap, co, year, month, htmlPath);

      const excelUrl = `/generated/wage-ledgers/${encodeURIComponent(path.basename(excelPath))}`;
      const htmlUrl  = `/generated/wage-ledgers/${encodeURIComponent(path.basename(htmlPath))}`;

      console.log(`[임금대장] 생성 완료: ${safeName} (Excel + HTML)`);
      res.json({ ok: true, excel: excelUrl, html: htmlUrl, safeName });
    } catch (err) {
      console.error('[임금대장 생성 오류]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /api/generate-payslip-pdfs ───
  // 당월 급여 데이터 기준으로 직원별 급여명세서 HTML 생성 및 저장
  //  - payrollId 를 함께 전달하면 해당 건만 즉시 생성 (일용직 급여일 즉시 발급 등)
  router.post('/generate-payslip-pdfs', (req, res) => {
    try {
      const { companyId, year, month, payrollId } = req.body;
      if (!companyId || !year || !month) {
        return res.status(400).json({ error: 'companyId, year, month required' });
      }

      let pays = db.all(
        'SELECT * FROM payrolls WHERE company_id = ? AND pay_year = ? AND pay_month = ? AND is_draft = 0',
        [companyId, year, month]
      );
      // 단건 생성 요청이면 해당 payroll 만 대상
      if (payrollId) pays = pays.filter(p => p.id === payrollId);
      if (!pays.length) return res.status(404).json({ error: 'No payroll data' });

      const co = db.companies.findById(companyId);
      const empMap = {};
      db.all('SELECT * FROM employees WHERE company_id = ?', [companyId])
        .forEach(e => { empMap[e.id] = e; });

      const payslipDir = path.join(ROOT, 'data', 'generated', 'payslips');
      fs.mkdirSync(payslipDir, { recursive: true });

      const generated = [];
      for (const p of pays) {
        const emp = empMap[p.employee_id] || {};
        const html = _generatePayslipHtml(p, emp, co);
        const filePath = path.join(payslipDir, `${p.id}.html`);
        fs.writeFileSync(filePath, html, 'utf8');
        generated.push({
          payrollId: p.id,
          employeeName: emp.name || '-',
          htmlUrl: `/generated/payslips/${p.id}.html`
        });
      }

      console.log(`[급여명세서] ${generated.length}명 생성 완료`);
      res.json({ ok: true, count: generated.length, files: generated });
    } catch (err) {
      console.error('[급여명세서 생성 오류]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 급여명세서 HTML 생성 (개인별, 인쇄 최적화)
  // ═══════════════════════════════════════════════════════════════
  function _generatePayslipHtml(p, emp, co) {
    const moStr = String(p.pay_month).padStart(2, '0');
    const fmt = v => (v === null || v === undefined || v === 0) ? '0원' : Number(v).toLocaleString('ko-KR') + '원';
    const fmtZ = v => (!v || Number(v) === 0) ? '-' : Number(v).toLocaleString('ko-KR') + '원';
    const payDate = p.pay_date || (co.pay_day ? `${p.pay_year}-${moStr}-${String(co.pay_day).padStart(2, '0')}` : '-');

    const gross = p.gross_pay || 0;
    const incTax = p.income_tax || 0;
    const locTax = p.local_income_tax || 0;
    const health = p.health_insurance || 0;
    const ltCare = p.long_term_care || 0;
    const pension = p.national_pension || 0;
    const empIns = p.employment_insurance || 0;
    const yearEnd = p.year_end_tax_adjust || 0;
    const hlAdj = p.health_insurance_adjust || 0;
    const advance = p.advance_deduction || 0;
    const totalDed = p.total_deduction || (incTax + locTax + health + ltCare + pension + empIns + yearEnd + hlAdj + advance);
    const netPay = p.net_pay || (gross - totalDed);

    const makeRow = (label, val) => {
      const isZero = !val || Number(val) === 0;
      return `<tr class="${isZero ? 'zero' : ''}"><td class="lbl">${label}</td><td class="amt">${fmtZ(val)}</td></tr>`;
    };

    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>급여명세서 - ${emp.name || ''} (${p.pay_year}년 ${moStr}월)</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Malgun Gothic','Noto Sans KR',sans-serif;color:#1e293b;max-width:700px;margin:0 auto;padding:30px 20px}
  .header{text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:16px;margin-bottom:20px}
  .header h1{font-size:20px;color:#1a1a2e;margin-bottom:4px}
  .header .sub{font-size:12px;color:#64748b}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:20px;font-size:12px}
  .info-grid .label{color:#64748b}
  .info-grid .value{font-weight:600}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th.section{background:#dbeafe;color:#1d4ed8;font-size:11px;text-align:left;padding:6px 10px;border-radius:4px 4px 0 0}
  td.lbl{font-size:11px;color:#64748b;padding:3px 10px;border-bottom:1px solid #f1f5f9;width:60%}
  td.amt{font-size:11px;text-align:right;padding:3px 10px;border-bottom:1px solid #f1f5f9;width:40%}
  tr.zero{display:none}
  .totals{border-top:2px solid #1a1a2e;margin-top:8px;padding-top:8px}
  .totals td{font-size:13px;font-weight:700;padding:4px 10px}
  .totals .gross{color:#2563eb}
  .totals .ded{color:#dc2626}
  .totals .net{color:#059669}
  .footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px}
  @media print{body{padding:10px 0}}
</style>
</head>
<body>
<div class="header">
  <h1>급여명세서</h1>
  <div class="sub">${co.company_name || ''} · ${p.pay_year}년 ${moStr}월분</div>
</div>
<div class="info-grid">
  <div><span class="label">성명</span> <span class="value">${emp.name || '-'}</span></div>
  <div><span class="label">부서/직급</span> <span class="value">${emp.department || '-'} / ${emp.position || '-'}</span></div>
  <div><span class="label">근무일수</span> <span class="value">${p.work_days ? p.work_days + '일' : '-'}</span></div>
  <div><span class="label">총근로시간</span> <span class="value">${p.total_work_hours ? p.total_work_hours + '시간' : '-'}</span></div>
  <div><span class="label">연장/야간/휴일</span> <span class="value">${p.overtime_hours || 0}h / ${p.night_hours || 0}h / ${p.holiday_hours || 0}h</span></div>
  <div><span class="label">지급일</span> <span class="value">${payDate}</span></div>
</div>
<table>
  <thead><tr><th colspan="2" class="section">🟦 지급내역</th></tr></thead>
  <tbody>
    ${makeRow('기본급', p.base_salary)}
    ${makeRow('주휴수당', p.weekly_holiday_pay)}
    ${makeRow('직책수당', p.position_allowance)}
    ${makeRow('식대', p.meal_allowance)}
    ${makeRow('차량유지비', (p.self_driving_allowance || p.transportation_allowance || 0))}
    ${makeRow('연구활동비', p.research_allowance)}
    ${makeRow('보육수당', p.childcare_allowance)}
    ${makeRow('연장근로수당', p.overtime_pay)}
    ${makeRow('야간근로수당', p.night_pay)}
    ${makeRow('휴일근로수당', p.holiday_pay)}
    ${makeRow('연차수당', p.annual_leave_pay)}
    ${makeRow('면허수당', p.license_allowance)}
    ${makeRow('기술수당', p.skill_allowance)}
    ${makeRow('통신비', p.communication_pay)}
    ${makeRow('정기상여금', p.bonus_pay)}
    ${makeRow('성과급', p.performance_pay)}
    ${makeRow('실비변상적급여', p.actual_expense_pay)}
    ${makeRow('현장수당', p.site_allowance)}
    ${makeRow('위험수당', p.hazard_allowance)}
    ${makeRow('벽지수당', p.remote_area_allowance)}
    ${makeRow('체력증진비', p.fitness_allowance)}
    ${makeRow('자기계발비', p.self_dev_allowance)}
    ${makeRow('도서지원비', p.book_allowance)}
    ${makeRow('해외근무수당', p.overseas_allowance)}
    ${makeRow('기타수당', (p.etc_allowance || 0) + (p.other_pay || 0))}
  </tbody>
</table>
<table>
  <thead><tr><th colspan="2" class="section" style="background:#fee2e2;color:#b91c1c;">🟥 공제내역</th></tr></thead>
  <tbody>
    ${makeRow('소득세', incTax)}
    ${makeRow('지방소득세', locTax)}
    ${makeRow('건강보험', health)}
    ${makeRow('장기요양보험', ltCare)}
    ${makeRow('국민연금', pension)}
    ${makeRow('고용보험', empIns)}
    ${makeRow('연말정산', yearEnd)}
    ${makeRow('건강보험정산', hlAdj)}
    ${makeRow('기타공제', advance)}
  </tbody>
</table>
<table class="totals">
  <tr><td>지급합계</td><td class="gross" style="text-align:right">${fmt(gross)}</td></tr>
  <tr><td>공제합계</td><td class="ded" style="text-align:right">${fmt(totalDed)}</td></tr>
  <tr style="font-size:15px"><td>실수령액</td><td class="net" style="text-align:right">${fmt(netPay)}</td></tr>
</table>
<div class="footer">인사톡 노무톡 · 대화인사노무파트너스</div>
</body>
</html>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Excel 생성 (신고용: 값 0인 항목 공란)
  // ═══════════════════════════════════════════════════════════════
  function _generateExcel(pays, empMap, co, year, month, filePath) {
    const wb = XLSX.utils.book_new();

    // ── 스타일 상수 (xlsx-js-style 대신 xlsx 사용, 스타일은 제한적) ──
    // xlsx 라이브러리는 기본 스타일만 지원. 셀 스타일은 워크시트별로 적용.
    const wsData = [];

    // ── 컬럼 너비 ──
    const colWidths = [
      { wch: 12 }, // C0: 구분
      { wch: 16 }, // C1: 항목1
      { wch: 14 }, // C2: 금액1
      { wch: 16 }, // C3: 항목2
      { wch: 14 }, // C4: 금액2
      { wch: 16 }, // C5: 항목3
      { wch: 14 }, // C6: 금액3
      { wch: 16 }, // C7: 항목4
      { wch: 14 }, // C8: 금액4
    ];

    // ── 타이틀 행 ──
    const moStr = String(month).padStart(2, '0');
    wsData.push([`[${co.company_name}] 임금대장 (신고용) — ${year}년 ${moStr}월`]);
    wsData.push([]);

    // ── 합계 계산 ──
    const sumFields = [
      'base_salary','bonus_pay','meal_allowance','self_driving_allowance','transportation_allowance',
      'position_allowance','site_allowance','research_allowance','childcare_allowance',
      'overtime_pay','night_pay','holiday_pay','weekly_holiday_pay','annual_leave_pay',
      'license_allowance','skill_allowance','communication_pay','performance_pay',
      'actual_expense_pay','hazard_allowance','remote_area_allowance','fitness_allowance',
      'self_dev_allowance','book_allowance','overseas_allowance',
      'etc_allowance','other_pay','gross_pay',
      'national_pension','health_insurance','employment_insurance','long_term_care',
      'income_tax','local_income_tax','year_end_tax_adjust','health_insurance_adjust',
      'advance_deduction','total_deduction','net_pay','standard_monthly_pay'
    ];
    const sums = {};
    sumFields.forEach(f => sums[f] = 0);
    pays.forEach(p => sumFields.forEach(f => sums[f] += nv(p[f])));

    // ── 각 직원별 데이터 행 생성 ──
    pays.forEach((p, idx) => {
      const emp = empMap[p.employee_id] || {};
      const empNo = emp.employee_number || '-';
      const empName = emp.name || '-';
      const dept = emp.department || '';
      const pos = emp.position || '';
      const hire = emp.hire_date || '';

      // 헤더 행 (직원 정보)
      wsData.push([`${idx + 1}. ${empName} (${empNo})${dept ? ' / ' + dept : ''}${pos ? ' / ' + pos : ''}${hire ? ' / 입사: ' + hire : ''}`]);

      // ── 지급내역 (신고용: 값 없는 항목 공란) ──
      const _show = (v) => v === 0 ? 0 : v;
      const _showLbl = (lbl, v) => v === 0 ? '' : lbl;

      const payData = [
        [{lbl:'기본급',        val:nv(p.base_salary)},
         {lbl:'주휴수당',      val:nv(p.weekly_holiday_pay)},
         {lbl:'직책수당',      val:nv(p.position_allowance)},
         {lbl:'연장근로수당',  val:nv(p.overtime_pay)}],
        [{lbl:'야간근로수당',  val:nv(p.night_pay)},
         {lbl:'휴일근로수당',  val:nv(p.holiday_pay)},
         {lbl:'교통비',        val:nv(p.transportation_allowance)},
         {lbl:'자가운전보조금',val:nv(p.self_driving_allowance)}],
        [{lbl:'벽지수당',      val:nv(p.remote_area_allowance)},
         {lbl:'식대',          val:nv(p.meal_allowance)},
         {lbl:'보육수당',      val:nv(p.childcare_allowance)},
         {lbl:'연구활동비',    val:nv(p.research_allowance)}],
        [{lbl:'연차수당',      val:nv(p.annual_leave_pay)},
         {lbl:'정기상여금',    val:nv(p.bonus_pay)},
         {lbl:'성과급',        val:nv(p.performance_pay)},
         {lbl:'실비변상적급여',val:nv(p.actual_expense_pay)}],
        [{lbl:'통신비',        val:nv(p.communication_pay)},
         {lbl:'기술수당',      val:nv(p.skill_allowance)},
         {lbl:'면허수당',      val:nv(p.license_allowance)},
         {lbl:'현장수당',      val:nv(p.site_allowance)}],
        [{lbl:'위험수당',      val:nv(p.hazard_allowance)},
         {lbl:'체력증진비',    val:nv(p.fitness_allowance)},
         {lbl:'자기계발비',    val:nv(p.self_dev_allowance)},
         {lbl:'도서지원비',    val:nv(p.book_allowance)}],
        [{lbl:'해외근무수당',  val:nv(p.overseas_allowance)},
         {lbl:'기타수당',      val:nv(p.etc_allowance) + nv(p.other_pay)},
         null, null],
      ];

      wsData.push(['지급내역', '', '', '', '', '', '', '', '']);
      for (const row of payData) {
        if (!row[0] && !row[1] && !row[2] && !row[3]) continue;
        wsData.push([
          '', // 구분열 병합
          _showLbl(row[0]?.lbl, row[0]?.val), _show(row[0]?.val || 0),
          _showLbl(row[1]?.lbl, row[1]?.val), _show(row[1]?.val || 0),
          _showLbl(row[2]?.lbl, row[2]?.val), _show(row[2]?.val || 0),
          _showLbl(row[3]?.lbl, row[3]?.val), _show(row[3]?.val || 0),
        ]);
      }
      // 지급합계
      wsData.push(['', '지급합계', nv(p.gross_pay), '', '', '', '', '', '']);

      // ── 공제내역 ──
      const dedData = [
        [{lbl:'보수월액',       val:nv(p.standard_monthly_pay)},
         {lbl:'소득세',         val:nv(p.income_tax)},
         {lbl:'주민세',         val:nv(p.local_income_tax)},
         {lbl:'건강보험',       val:nv(p.health_insurance)}],
        [{lbl:'장기요양보험료', val:nv(p.long_term_care)},
         {lbl:'국민연금',       val:nv(p.national_pension)},
         {lbl:'고용보험',       val:nv(p.employment_insurance)},
         {lbl:'연말정산',       val:nv(p.year_end_tax_adjust)}],
        [{lbl:'건강보험정산',   val:nv(p.health_insurance_adjust)},
         {lbl:'기타공제',       val:nv(p.advance_deduction)},
         null, null],
      ];

      wsData.push(['공제내역', '', '', '', '', '', '', '', '']);
      const _showDedLbl = (it, v) => (!it || v === 0) ? '' : (it.lbl || '');
      const _showDedVal = (it, v) => (!it || v === 0) ? 0 : (it.val || 0);
      for (const row of dedData) {
        if (!row[0] && !row[1] && !row[2] && !row[3]) continue;
        wsData.push([
          '',
          _showDedLbl(row[0], row[0]?.val), _showDedVal(row[0], row[0]?.val),
          _showDedLbl(row[1], row[1]?.val), _showDedVal(row[1], row[1]?.val),
          _showDedLbl(row[2], row[2]?.val), _showDedVal(row[2], row[2]?.val),
          _showDedLbl(row[3], row[3]?.val), _showDedVal(row[3], row[3]?.val),
        ]);
      }
      // 공제합계 + 차인지급액
      wsData.push(['', '공제합계', nv(p.total_deduction), '차인지급액', nv(p.net_pay), '', '', '', '']);

      wsData.push([]); // 직원 간 구분 공란
    });

    // ── 합계 행 ──
    wsData.push(['']);
    wsData.push([`합계 (${pays.length}명)`, '', '', '', '', '', '', '', '']);
    wsData.push(['지급내역', '지급합계', nv(sums.gross_pay), '', '', '', '', '', '']);
    wsData.push(['공제내역', '공제합계', nv(sums.total_deduction), '차인지급액', nv(sums.net_pay), '', '', '', '']);

    // ── 워크시트 생성 ──
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = colWidths;

    // 병합: 타이틀 행
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, '임금대장(신고용)');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    fs.writeFileSync(filePath, buf);
  }

  // ═══════════════════════════════════════════════════════════════
  // HTML 생성 (PDF 열람/인쇄용, 신고용 포맷)
  // ═══════════════════════════════════════════════════════════════
  function _generateHtml(pays, empMap, co, year, month, filePath) {
    const moStr = String(month).padStart(2, '0');
    const fmt = v => {
      const n = Number(v);
      return (!v || n === 0) ? '' : n.toLocaleString('ko-KR');
    };

    // ── 합계 계산 ──
    const sumFields = [
      'base_salary','bonus_pay','meal_allowance','self_driving_allowance','transportation_allowance',
      'position_allowance','site_allowance','research_allowance','childcare_allowance',
      'overtime_pay','night_pay','holiday_pay','weekly_holiday_pay','annual_leave_pay',
      'license_allowance','skill_allowance','communication_pay','performance_pay',
      'actual_expense_pay','hazard_allowance','remote_area_allowance','fitness_allowance',
      'self_dev_allowance','book_allowance','overseas_allowance',
      'etc_allowance','other_pay','gross_pay',
      'national_pension','health_insurance','employment_insurance','long_term_care',
      'income_tax','local_income_tax','year_end_tax_adjust','health_insurance_adjust',
      'advance_deduction','total_deduction','net_pay','standard_monthly_pay'
    ];
    const sums = {};
    sumFields.forEach(f => sums[f] = 0);
    pays.forEach(p => sumFields.forEach(f => sums[f] += nv(p[f])));

    // ── 직원 행 HTML 생성 ──
    const _show = (v) => v === 0 ? 0 : v;
    const _showLbl = (lbl, v) => v === 0 ? '' : lbl;
    const _showDedLbl = (it, v) => (!it || v === 0) ? '' : (it.lbl || '');
    const _showDedVal = (it, v) => (!it || v === 0) ? 0 : (it.val || 0);

    let rowsHtml = '';
    pays.forEach((p, idx) => {
      const emp = empMap[p.employee_id] || {};
      const name = emp.name || '-';
      const empNo = emp.employee_number || '';
      const dept = emp.department || '';
      const pos = emp.position || '';

      const payItems = [
        [{l:'기본급',v:nv(p.base_salary)},{l:'주휴수당',v:nv(p.weekly_holiday_pay)},{l:'직책수당',v:nv(p.position_allowance)},{l:'연장근로수당',v:nv(p.overtime_pay)}],
        [{l:'야간근로수당',v:nv(p.night_pay)},{l:'휴일근로수당',v:nv(p.holiday_pay)},{l:'교통비',v:nv(p.transportation_allowance)},{l:'자가운전보조금',v:nv(p.self_driving_allowance)}],
        [{l:'벽지수당',v:nv(p.remote_area_allowance)},{l:'식대',v:nv(p.meal_allowance)},{l:'보육수당',v:nv(p.childcare_allowance)},{l:'연구활동비',v:nv(p.research_allowance)}],
        [{l:'연차수당',v:nv(p.annual_leave_pay)},{l:'정기상여금',v:nv(p.bonus_pay)},{l:'성과급',v:nv(p.performance_pay)},{l:'실비변상적급여',v:nv(p.actual_expense_pay)}],
        [{l:'통신비',v:nv(p.communication_pay)},{l:'기술수당',v:nv(p.skill_allowance)},{l:'면허수당',v:nv(p.license_allowance)},{l:'현장수당',v:nv(p.site_allowance)}],
        [{l:'위험수당',v:nv(p.hazard_allowance)},{l:'체력증진비',v:nv(p.fitness_allowance)},{l:'자기계발비',v:nv(p.self_dev_allowance)},{l:'도서지원비',v:nv(p.book_allowance)}],
        [{l:'해외근무수당',v:nv(p.overseas_allowance)},{l:'기타수당',v:nv(p.etc_allowance)+nv(p.other_pay)}],
      ];
      const dedItems = [
        [{l:'보수월액',v:nv(p.standard_monthly_pay)},{l:'소득세',v:nv(p.income_tax)},{l:'주민세',v:nv(p.local_income_tax)},{l:'건강보험',v:nv(p.health_insurance)}],
        [{l:'장기요양보험료',v:nv(p.long_term_care)},{l:'국민연금',v:nv(p.national_pension)},{l:'고용보험',v:nv(p.employment_insurance)},{l:'연말정산',v:nv(p.year_end_tax_adjust)}],
        [{l:'건강보험정산',v:nv(p.health_insurance_adjust)},{l:'기타공제',v:nv(p.advance_deduction)}],
      ];

      // 지급내역 행
      let payRows = '';
      for (const row of payItems) {
        const hasAny = row.some(it => it.v !== 0);
        if (!hasAny) continue;
        payRows += `<tr>`;
        row.forEach(it => {
          const lbl = _showLbl(it.l, it.v);
          const val = _show(it.v);
          payRows += `<td class="lbl">${lbl}</td><td class="val">${val === 0 ? '' : val.toLocaleString('ko-KR')}</td>`;
        });
        payRows += `</tr>`;
      }

      // 공제내역 행
      let dedRows = '';
      for (const row of dedItems) {
        const hasAny = row.some(it => it && it.v !== 0);
        if (!hasAny) continue;
        dedRows += `<tr>`;
        row.forEach(it => {
          if (!it) { dedRows += `<td class="lbl"></td><td class="val"></td>`; return; }
          const lbl = _showDedLbl(it, it.v);
          const val = _showDedVal(it, it.v);
          dedRows += `<td class="lbl">${lbl}</td><td class="val">${val === 0 ? '' : val.toLocaleString('ko-KR')}</td>`;
        });
        dedRows += `</tr>`;
      }

      rowsHtml += `
      <div class="emp-card">
        <div class="emp-header">
          <span class="emp-name">${idx + 1}. ${name}</span>
          <span class="emp-info">${empNo}${dept ? ' / ' + dept : ''}${pos ? ' / ' + pos : ''}</span>
        </div>
        <table class="pay-table">
          <thead><tr><th colspan="8" class="sec pay">지급내역</th></tr></thead>
          <tbody>${payRows}
            <tr class="total"><td class="lbl">지급합계</td><td class="val gross">${fmt(p.gross_pay)}</td><td colspan="6"></td></tr>
          </tbody>
        </table>
        <table class="ded-table">
          <thead><tr><th colspan="8" class="sec ded">공제내역</th></tr></thead>
          <tbody>${dedRows}
            <tr class="total"><td class="lbl">공제합계</td><td class="val ded">${fmt(p.total_deduction)}</td><td class="lbl">차인지급액</td><td class="val net">${fmt(p.net_pay)}</td><td colspan="4"></td></tr>
          </tbody>
        </table>
      </div>`;
    });

    // ── 합계 ──
    rowsHtml += `
      <div class="emp-card sum">
        <div class="emp-header"><span class="emp-name">합계 (${pays.length}명)</span></div>
        <table class="pay-table">
          <tbody>
            <tr class="total"><td class="lbl">지급합계</td><td class="val gross">${fmt(sums.gross_pay)}</td><td colspan="6"></td></tr>
          </tbody>
        </table>
        <table class="ded-table">
          <tbody>
            <tr class="total"><td class="lbl">공제합계</td><td class="val ded">${fmt(sums.total_deduction)}</td><td class="lbl">차인지급액</td><td class="val net">${fmt(sums.net_pay)}</td><td colspan="4"></td></tr>
          </tbody>
        </table>
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>[${co.company_name}] 임금대장 (신고용) — ${year}년 ${moStr}월</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Malgun Gothic','Noto Sans KR',sans-serif;background:#f8fafc;padding:20px;color:#1e293b}
  h1{font-size:18px;text-align:center;margin-bottom:20px;color:#1a1a2e}
  .emp-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:14px;page-break-inside:avoid}
  .emp-card.sum{background:#f1f5f9;border-color:#94a3b8}
  .emp-header{display:flex;align-items:center;gap:12px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb}
  .emp-name{font-weight:700;font-size:14px;color:#1a1a2e}
  .emp-info{font-size:12px;color:#64748b}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th.sec{padding:6px 10px;font-size:11px;text-align:left;border-radius:4px}
  th.sec.pay{background:#dbeafe;color:#1d4ed8}
  th.sec.ded{background:#fee2e2;color:#b91c1c}
  td.lbl{padding:4px 8px;font-size:11px;color:#64748b;text-align:right;width:18%;background:#f8fafc;border-bottom:1px solid #f1f5f9}
  td.val{padding:4px 8px;font-size:11px;text-align:right;width:14%;border-bottom:1px solid #f1f5f9}
  tr.total td{border-top:1.5px solid #94a3b8;font-weight:700;font-size:12px}
  td.gross{color:#2563eb}
  td.ded{color:#dc2626}
  td.net{color:#059669}
  @media print{
    body{background:#fff;padding:0}
    .emp-card{box-shadow:none;border:1px solid #d1d5db}
  }
</style>
</head>
<body>
<h1>[${co.company_name}] 임금대장 (신고용) — ${year}년 ${moStr}월</h1>
${rowsHtml}
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf8');
  }

  return router;
};
