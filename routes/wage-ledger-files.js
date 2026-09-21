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

      // 화면 임금대장은 !is_draft(0 또는 NULL)만 표시 → 동일 기준 적용 (2026-09-22)
      const pays = db.all(
        'SELECT * FROM payrolls WHERE company_id = ? AND pay_year = ? AND pay_month = ? AND (is_draft IS NULL OR is_draft = 0)',
        [companyId, year, month]
      );
      if (!pays.length) return res.status(404).json({ error: 'No payroll data for this period' });

      const empMap = {};
      db.all('SELECT * FROM employees WHERE company_id = ?', [companyId])
        .forEach(e => { empMap[e.id] = e; });

      // 퇴사일(최신 계약 종료일)·근태·연차 대장 데이터 조회 (2026-09-21 화면 동일 레이아웃)
      const contracts = db.all("SELECT * FROM contracts WHERE company_id = ? AND is_draft = 0", [companyId]);
      const attLedgers = db.all('SELECT * FROM attendance_ledger WHERE company_id = ?', [companyId]);
      const lvLedgers  = db.all('SELECT * FROM annual_leave_ledger WHERE company_id = ?', [companyId]);

      pays.sort((a, b) => (empMap[a.employee_id]?.name || '').localeCompare(empMap[b.employee_id]?.name || '', 'ko'));

      // 2. 디렉토리 생성
      fs.mkdirSync(GENERATED_DIR, { recursive: true });

      const moStr = String(month).padStart(2, '0');
      const safeName = `${co.company_name}_${year}년${moStr}월`.replace(/[\\/:*?"<>|]/g, '_');
      const baseName = `${companyId}_${year}_${moStr}`;

      // 3. Excel (신고용) 생성
      const excelPath = path.join(GENERATED_DIR, `${baseName}_신고용.xlsx`);
      _generateExcel(pays, empMap, co, year, month, excelPath, contracts, attLedgers, lvLedgers);

      // 4. HTML (신고용, PDF 열람용) 생성
      const htmlPath = path.join(GENERATED_DIR, `${baseName}_신고용.html`);
      _generateHtml(pays, empMap, co, year, month, htmlPath, contracts);

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
  // 화면(관리자 임금대장)과 동일한 레이아웃·데이터 구조 생성 공용 (2026-09-21)
  // ═══════════════════════════════════════════════════════════════
  function _buildLedgerData(pays, empMap, contracts, cfg) {
    const nv = v => (v === null || v === undefined || v === '') ? 0 : Number(v);
    const _sumCustomOrd = p => { try { const v = typeof p.custom_ordinary_values==='string' ? JSON.parse(p.custom_ordinary_values) : (p.custom_ordinary_values||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(Number(x.amount)||0),0); } catch(e){ return 0; } };
    const _sumCustomFixed = p => { try { const v = typeof p.custom_fixed_values==='string' ? JSON.parse(p.custom_fixed_values) : (p.custom_fixed_values||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(Number(x.amount)||0),0); } catch(e){ return 0; } };
    const _sumEtcItems = p => { try { const v = typeof p.etc_allowance_items==='string' ? JSON.parse(p.etc_allowance_items) : (p.etc_allowance_items||[]); return (Array.isArray(v)?v:[]).reduce((s,x)=>s+(Number(x.amount)||0),0); } catch(e){ return 0; } };

    // ── 월합산 병합 (화면과 동일 규칙: 직원+사번 스냅샷 기준) ──
    const sumFields = [
      'base_salary','bonus_pay','meal_allowance','self_driving_allowance','transportation_allowance',
      'remote_area_allowance','research_allowance','childcare_allowance',
      'overtime_pay','night_pay','holiday_pay','annual_leave_pay',
      'license_allowance','skill_allowance','communication_pay','performance_pay',
      'position_allowance','site_allowance',
      'hazard_allowance','fitness_allowance','self_dev_allowance','book_allowance','overseas_allowance',
      'etc_allowance','other_pay','gross_pay',
      'national_pension','health_insurance','employment_insurance','long_term_care',
      'income_tax','local_income_tax','year_end_tax_adjust','health_insurance_adjust',
      'advance_deduction','total_deduction','net_pay'
    ];
    const byKey = new Map();
    pays.forEach(p => {
      const k = `${p.employee_id}||${p.employee_number || ''}`;
      if(byKey.has(k)){
        const acc = byKey.get(k);
        for(const f of sumFields) acc[f] = nv(acc[f]) + nv(p[f]);
        acc.pay_count = (Number(acc.pay_count)||1) + 1;
      } else {
        byKey.set(k, { ...p, pay_count: 1 });
      }
    });
    const merged = Array.from(byKey.values());
    merged.sort((a,b) => (empMap[a.employee_id]?.name||'').localeCompare(empMap[b.employee_id]?.name||'','ko'));

    const hasData = f => merged.some(p => p[f] && Number(p[f]) !== 0);
    const transportVal = p => nv(p.self_driving_allowance) || nv(p.transportation_allowance) || 0;
    const hasCustomOrd = !!(cfg && Array.isArray(cfg._custom_ordinary) && cfg._custom_ordinary.length > 0);
    const hasCustomFixed = !!(cfg && Array.isArray(cfg._custom_fixed) && cfg._custom_fixed.length > 0);
    const hasEtcItems = merged.some(p => _sumEtcItems(p) > 0);

    const PAY_TH = [
      ['기본급','정기상여금','식대','차량유지비', hasData('position_allowance')?'직책수당':'', hasData('site_allowance')?'현장수당':''],
      [hasData('research_allowance')?'연구활동비':'', hasData('childcare_allowance')?'보육수당':'', '연장근로수당','야간근로수당','휴일근로수당','주휴수당'],
      ['연차수당', hasData('license_allowance')?'면허수당':'', hasData('skill_allowance')?'기술수당':'', hasData('communication_pay')?'통신비':'', hasData('performance_pay')?'성과급':'', ''],
      [hasData('hazard_allowance')?'위험수당':'', hasData('remote_area_allowance')?'벽지수당':'', hasData('fitness_allowance')?'체력증진비':'', hasData('self_dev_allowance')?'자기계발비':'', hasData('book_allowance')?'도서지원비':'', hasData('overseas_allowance')?'해외근무수당':''],
      [hasCustomOrd?'커스텀통상임금':'', hasCustomFixed?'커스텀고정수당':'', hasEtcItems?'기타수당(커스텀)':'', '', (hasData('etc_allowance')||hasData('other_pay'))?'기타':'', '지급합계'],
    ];
    const DED_TH = [
      ['국민연금','건강보험','고용보험','장기요양보험료'],
      ['','건강보험연말정산','','장기요양보험연말정산'],
      ['','','',''],
      ['소득세','지방소득세','소득세연말정산',''],
      ['','기타공제','공제합계','차인지급액'],
    ];

    const payRowFields = [
      ['base_salary','bonus_pay','meal_allowance','transport','position_allowance','site_allowance'],
      ['research_allowance','childcare_allowance','overtime_pay','night_pay','holiday_pay','weekly_holiday_pay'],
      ['annual_leave_pay','license_allowance','skill_allowance','communication_pay','performance_pay','_empty'],
      ['hazard_allowance','remote_area_allowance','fitness_allowance','self_dev_allowance','book_allowance','overseas_allowance'],
      ['_customOrd','_customFixed','_etcItems','_empty','_etcOther','gross_pay']
    ];
    const dedRowFields = [
      ['national_pension','health_insurance','employment_insurance','long_term_care'],
      ['_empty','health_insurance_adjust','_empty','_empty2'],
      ['_empty','_empty','_empty','_empty'],
      ['income_tax','local_income_tax','year_end_tax_adjust','_empty'],
      ['_empty','advance_deduction','total_deduction','net_pay']
    ];
    const rowHasData = rowIdx => {
      if(rowIdx === 4) return true;
      const payFields = payRowFields[rowIdx];
      const hasPay = payFields.some(f => {
        if(f==='transport') return merged.some(p => (p.self_driving_allowance||p.transportation_allowance||0) !== 0);
        if(f==='_customOrd') return merged.some(p => _sumCustomOrd(p) > 0);
        if(f==='_customFixed') return merged.some(p => _sumCustomFixed(p) > 0);
        if(f==='_etcItems') return merged.some(p => _sumEtcItems(p) > 0);
        if(f==='_etcOther') return merged.some(p => (p.etc_allowance||0)+(p.other_pay||0) !== 0);
        if(f==='_empty') return false;
        return merged.some(p => p[f] && Number(p[f]) !== 0);
      });
      if(hasPay) return true;
      const dedFields = dedRowFields[rowIdx];
      return dedFields.some(f => {
        if(f==='_empty'||f==='_empty2') return false;
        return merged.some(p => p[f] && Number(p[f]) !== 0);
      });
    };
    const rowVisible = [0,1,2,3,4].map(i => rowHasData(i));
    const visRows = rowVisible.map((v,i)=>v?i:-1).filter(i=>i>=0);

    const payVals = (p, rowIdx) => {
      switch(rowIdx){
        case 0: return [nv(p.base_salary), nv(p.bonus_pay), nv(p.meal_allowance), transportVal(p), nv(p.position_allowance), nv(p.site_allowance)];
        case 1: return [nv(p.research_allowance), nv(p.childcare_allowance), nv(p.overtime_pay), nv(p.night_pay), nv(p.holiday_pay), nv(p.weekly_holiday_pay)];
        case 2: return [nv(p.annual_leave_pay), nv(p.license_allowance), nv(p.skill_allowance), nv(p.communication_pay), nv(p.performance_pay), 0];
        case 3: return [nv(p.hazard_allowance), nv(p.remote_area_allowance), nv(p.fitness_allowance), nv(p.self_dev_allowance), nv(p.book_allowance), nv(p.overseas_allowance)];
        case 4: return [_sumCustomOrd(p), _sumCustomFixed(p), _sumEtcItems(p), 0, nv(p.etc_allowance)+nv(p.other_pay), nv(p.gross_pay)];
        default: return [0,0,0,0,0,0];
      }
    };
    const dedVals = (p, rowIdx) => {
      switch(rowIdx){
        case 0: return [nv(p.national_pension), nv(p.health_insurance), nv(p.employment_insurance), nv(p.long_term_care)];
        case 1: return [0, nv(p.health_insurance_adjust), 0, 0];
        case 2: return [0,0,0,0];
        case 3: return [nv(p.income_tax), nv(p.local_income_tax), nv(p.year_end_tax_adjust), 0];
        case 4: return [0, nv(p.advance_deduction), nv(p.total_deduction), nv(p.net_pay)];
        default: return [0,0,0,0];
      }
    };

    const empInfo = p => {
      const emp = empMap[p.employee_id] || {};
      const resign = (contracts||[])
        .filter(c => c.employee_id === p.employee_id && !c.is_draft)
        .sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))[0]?.contract_end || '';
      return {
        empNo: p.employee_number || emp.employee_number || '-',
        name: emp.name || '-',
        dept: emp.department || '',
        pos: emp.position || '',
        hire: emp.hire_date || '',
        resign,
      };
    };

    return { merged, PAY_TH, DED_TH, rowVisible, visRows, payVals, dedVals, empInfo };
  }

  // ═══════════════════════════════════════════════════════════════
  // Excel 생성 (신고용 — 화면 임금대장과 동일 레이아웃: 2026-09-21)
  // ═══════════════════════════════════════════════════════════════
  function _generateExcel(pays, empMap, co, year, month, filePath, contracts, attLedgers, lvLedgers) {
    const wb = XLSX.utils.book_new();
    const cfg = co?.allowance_config ? (typeof co.allowance_config === 'string' ? JSON.parse(co.allowance_config) : co.allowance_config) : {};
    const L = _buildLedgerData(pays, empMap, contracts, cfg);
    const moStr = String(month).padStart(2, '0');
    const numCell = v => { const n = Number(v); return (!v || n === 0) ? '' : n; };

    const wsData = [];
    // 타이틀 (기존 업로드 파서와 호환되는 파이프 형식, 2026-09-22)
    wsData.push([`${co.company_name} | ${year}년 ${moStr}월 임금대장`]);
    wsData.push([]);
    // 그룹 헤더 (화면 1행)
    wsData.push(['인적사항','','기본급여 및 제수당','','','','','','공제 및 차인지급액','','','','영수인']);
    // 항목 헤더 행 (화면 thead와 동일 순서·라벨)
    const mergedLabels = ['부서','직급','입사일','퇴사일'];
    L.visRows.forEach(ri => {
      const pay = L.PAY_TH[ri];
      const ded = L.DED_TH[ri];
      if(ri === 0){
        wsData.push(['사원번호','성명', ...pay, ...ded, '영수인']);
      } else {
        wsData.push([mergedLabels[ri-1], '', ...pay, ...ded, '']);
      }
    });
    // 직원 데이터 블록 (화면 tbody와 동일 구조, 합계 행 없음)
    L.merged.forEach(p => {
      const info = L.empInfo(p);
      L.visRows.forEach(ri => {
        const pay = L.payVals(p, ri).map(numCell);
        const ded = L.dedVals(p, ri).map(numCell);
        if(ri === 0){
          wsData.push([info.empNo, info.name, ...pay, ...ded, '']);
        } else {
          const left = [info.dept, info.pos, info.hire, info.resign][ri-1] || '';
          wsData.push([left, '', ...pay, ...ded, '']);
        }
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      {wch:10},{wch:12},{wch:12},{wch:12},{wch:10},{wch:12},{wch:10},{wch:10},
      {wch:12},{wch:12},{wch:10},{wch:14},{wch:10},
    ];
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:12} },
      { s:{r:2,c:0}, e:{r:2,c:1} },
      { s:{r:2,c:2}, e:{r:2,c:7} },
      { s:{r:2,c:8}, e:{r:2,c:11} },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '임금대장');

    // ── 근태 관리대장 시트 (기존 편집용과 동일 포맷) ──
    if(Array.isArray(attLedgers) && attLedgers.length > 0){
      const attByEmp = {};
      attLedgers.forEach(led => {
        const eid = led.employee_id;
        if(!attByEmp[eid]) attByEmp[eid] = [];
        try {
          const md = typeof led.month_data === 'string' ? JSON.parse(led.month_data) : (led.month_data || []);
          md.forEach(e => attByEmp[eid].push({
            date: e.date||'', dateTo: e.dateTo||'', type: e.type||'absent',
            absentType: e.absentType||'', rate: e.rate||0, time: e.time||''
          }));
        } catch(e){}
      });
      const typeLabel = { absent:'결근', late:'지각', earlyleave:'조퇴' };
      const absentLabel = { unauthorized:'무단', sick_unpaid:'병가(무급)', sick_paid:'병가(유급)', industrial:'산재', menstrual:'생리휴가', maternity_paid:'출산(유급)', maternity_unpaid:'출산(무급)', paternity_paid:'배우자출산', childcare_leave:'육아휴직', family_care:'가족돌봄', approved_unpaid:'사전승인 무급휴가', layoff_leave:'휴업(회사사정)' };
      const attData = [[`[${co.company_name}] 근태 관리대장 — ${year}년 ${moStr}월`]];
      attData.push(['직원명','날짜','유형','결근사유','지급율(%)','시간','종료일','비고']);
      Object.entries(attByEmp).forEach(([eid, entries]) => {
        const empName = (empMap[eid]||{}).name || '';
        entries.forEach(e => {
          attData.push([
            empName, e.date, typeLabel[e.type]||e.type,
            e.type==='absent' ? (absentLabel[e.absentType]||'결근') : '',
            e.rate||0, e.time||'', e.dateTo||'', ''
          ]);
        });
      });
      const attWs = XLSX.utils.aoa_to_sheet(attData);
      attWs['!cols'] = [{wch:10},{wch:12},{wch:8},{wch:14},{wch:10},{wch:8},{wch:12},{wch:15}];
      XLSX.utils.book_append_sheet(wb, attWs, '근태관리대장');
    }

    // ── 연차 관리대장 시트 ──
    if(Array.isArray(lvLedgers) && lvLedgers.length > 0){
      const lvData = [[`[${co.company_name}] 연차 관리대장`]];
      lvData.push(['직원명','기준년도','발생일수','사용일수','잔여일수','이월일수','비고']);
      lvLedgers.forEach(l => {
        lvData.push([
          (empMap[l.employee_id]||{}).name || '',
          l.year || '',
          numCell(l.total_days), numCell(l.total_used), numCell(l.remain_days), numCell(l.carryover_days), ''
        ]);
      });
      const lvWs = XLSX.utils.aoa_to_sheet(lvData);
      lvWs['!cols'] = [{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:10},{wch:20}];
      XLSX.utils.book_append_sheet(wb, lvWs, '연차관리대장');
    }

    const buf = XLSX.write(wb, { bookType:'xlsx', type:'buffer' });
    fs.writeFileSync(filePath, buf);
  }

  // ═══════════════════════════════════════════════════════════════
  // HTML 생성 (PDF 열람/인쇄용 — 화면 임금대장과 동일 레이아웃: 2026-09-21)
  // ═══════════════════════════════════════════════════════════════
  function _generateHtml(pays, empMap, co, year, month, filePath, contracts) {
    const cfg = co?.allowance_config ? (typeof co.allowance_config === 'string' ? JSON.parse(co.allowance_config) : co.allowance_config) : {};
    const L = _buildLedgerData(pays, empMap, contracts, cfg);
    const moStr = String(month).padStart(2, '0');
    const fmt  = v => (!v || Number(v) === 0) ? '' : Number(v).toLocaleString('ko-KR');
    const fmtB = v => (!v || Number(v) === 0) ? '' : `<strong>${Number(v).toLocaleString('ko-KR')}</strong>`;
    const mergedLabels = ['부서','직급','입사일','퇴사일'];

    const signRowspan = L.visRows.length + 1;
    let thead = `<tr class="wl-th-group">
        <th colspan="2" class="wl-th-personal">인적사항</th>
        <th colspan="6" class="wl-th-pay">기본급여 및 제수당</th>
        <th colspan="4" class="wl-th-ded">공제 및 차인지급액</th>
        <th rowspan="${signRowspan}" class="wl-th-sign">영수인</th>
      </tr>`;
    L.visRows.forEach(ri => {
      const pay = L.PAY_TH[ri];
      const ded = L.DED_TH[ri];
      if(ri === 0){
        thead += `<tr class="wl-th-row wl-th-row-ind">
          <th class="wl-th-cell">사원번호</th><th class="wl-th-cell">성명</th>
          ${pay.map(t=>`<th class="wl-th-cell">${t}</th>`).join('')}${ded.map(t=>`<th class="wl-th-cell">${t}</th>`).join('')}
        </tr>`;
      } else {
        thead += `<tr class="wl-th-row wl-th-row-mrg">
          <th colspan="2" class="wl-th-cell wl-th-merged">${mergedLabels[ri-1]}</th>
          ${pay.map((t,i)=>`<th class="wl-th-cell${t==='지급합계'?' wl-th-gross':i===5?' wl-th-pay-last':''}">${t}</th>`).join('')}
          ${ded.map((t,i)=>`<th class="wl-th-cell${t==='공제합계'?' wl-th-ded-sum':t==='차인지급액'?' wl-th-net':(ri===2&&(i===0||i===2))?' wl-th-na':''}">${t}</th>`).join('')}
        </tr>`;
      }
    });

    let tbody = '';
    L.merged.forEach(p => {
      const info = L.empInfo(p);
      L.visRows.forEach((ri, vi) => {
        const pay = L.payVals(p, ri);
        const ded = L.dedVals(p, ri);
        const signCell = vi === 0 ? `<td rowspan="${L.visRows.length}" class="wl-td-sign"></td>` : '';
        let left;
        if(ri === 0){
          left = `<td class="wl-td-center wl-td-empno">${info.empNo}</td><td class="wl-td-center wl-td-name">${info.name}</td>`;
        } else {
          left = `<td colspan="2" class="wl-td-center wl-td-dept">${[info.dept, info.pos, info.hire, info.resign][ri-1] || ''}</td>`;
        }
        let payCells;
        if(ri === 4){
          payCells = pay.map((v, i) =>
            i === 5 ? `<td class="wl-td-gross">${fmtB(v)}</td>` : `<td class="wl-td-num">${fmt(v)}</td>`
          ).join('');
        } else {
          payCells = pay.map((v, i) =>
            i === 5 ? `<td class="wl-td-num wl-td-pay-last">${fmt(v)}</td>` : `<td class="wl-td-num">${fmt(v)}</td>`
          ).join('');
        }
        let dedCells;
        if(ri === 4){
          dedCells = ded.map((v, i) =>
            i === 2 ? `<td class="wl-td-ded-sum">${fmtB(v)}</td>` :
            i === 3 ? `<td class="wl-td-net">${fmtB(v)}</td>` :
            `<td class="wl-td-num">${fmt(v)}</td>`
          ).join('');
        } else if(ri === 2){
          dedCells = ded.map((v, i) =>
            (i === 0 || i === 2) ? `<td class="wl-td-num wl-td-na">${fmt(v)}</td>` : `<td class="wl-td-num">${fmt(v)}</td>`
          ).join('');
        } else {
          dedCells = ded.map(v => `<td class="wl-td-num">${fmt(v)}</td>`).join('');
        }
        tbody += `<tr class="wl-data-row${vi===0?' wl-data-row-top':''}">${left}${payCells}${dedCells}${signCell}</tr>`;
      });
    });

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>[${co.company_name}] 임금대장 (신고용) — ${year}년 ${moStr}월</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Malgun Gothic','Noto Sans KR',sans-serif;background:#fff;padding:24px;color:#1e293b}
  h1{font-size:18px;text-align:center;margin-bottom:18px;color:#1a1a2e}
  .wl-ledger-wrap{overflow-x:auto}
  table.wl-ledger-tbl{width:100%;border-collapse:collapse;font-size:11px;min-width:900px;table-layout:fixed}
  table.wl-ledger-tbl thead tr th{border:1px solid #94a3b8;text-align:center;vertical-align:middle;white-space:nowrap;padding:4px 5px;font-weight:700;font-size:10.5px}
  .wl-th-group th{background:#1e293b;color:#f1f5f9;font-size:11px;padding:6px 5px;border-color:#334155}
  .wl-th-personal{background:#1e3a5f !important;color:#93c5fd !important}
  .wl-th-pay{background:#14532d !important;color:#86efac !important}
  .wl-th-ded{background:#3b0f0f !important;color:#fca5a5 !important}
  .wl-th-sign{background:#1e293b !important;color:#cbd5e1 !important;border-color:#334155 !important}
  .wl-th-row th.wl-th-cell{background:#f1f5f9;color:#374151;font-size:10px;padding:4px;white-space:normal;word-break:keep-all;line-height:1.3}
  .wl-th-cell.wl-th-merged{background:#e8f0fe;color:#1e3a8a}
  .wl-th-na{background:#e2e8f0 !important}
  .wl-td-na{background:#e2e8f0 !important}
  .wl-th-gross{background:#dcfce7 !important;color:#14532d !important;font-weight:800 !important;border:2px solid #15803d !important}
  .wl-th-ded-sum{background:#fee2e2 !important;color:#b91c1c !important;font-weight:800 !important;border:2px solid #b91c1c !important}
  .wl-th-net{background:#dbeafe !important;color:#1e40af !important;font-weight:800 !important;border:2px solid #1d4ed8 !important}
  .wl-ledger-tbl tbody td{border:1px solid #cbd5e1;vertical-align:middle;padding:3px 5px;font-size:11px;color:#1e293b;height:26px}
  .wl-td-num{text-align:right;white-space:nowrap;background:#f8fbff}
  .wl-td-num strong{color:#1d4ed8}
  .wl-td-gross{text-align:right;white-space:nowrap;background:#dcfce7 !important;color:#14532d !important;font-weight:700;border:2px solid #15803d !important}
  .wl-td-gross strong{color:#14532d !important}
  .wl-td-ded-sum{text-align:right;white-space:nowrap;background:#fee2e2 !important;color:#b91c1c !important;font-weight:700;border:2px solid #b91c1c !important}
  .wl-td-ded-sum strong{color:#b91c1c !important}
  .wl-td-net{text-align:right;white-space:nowrap;background:#dbeafe !important;color:#1e40af !important;font-weight:700;border:2px solid #1d4ed8 !important}
  .wl-td-net strong{color:#1e40af !important}
  .wl-td-center{text-align:center;background:#f8fafc}
  .wl-td-empno{font-size:10px;color:#475569;background:#f1f5f9}
  .wl-td-name{font-weight:700;font-size:12px;color:#0f172a;background:#f0f4ff}
  .wl-td-dept{font-size:10.5px;color:#374151;background:#f8f9fb}
  .wl-td-sign{background:#fff;min-width:50px;vertical-align:middle;text-align:center;border-bottom:2px solid #475569 !important}
  tr.wl-data-row-top td{border-top:2px solid #64748b}
  thead tr.wl-th-group th.wl-th-personal,thead tr.wl-th-group th.wl-th-pay{border-right:2px solid #475569 !important}
  thead tr.wl-th-row-ind th:nth-child(2),thead tr.wl-th-row-ind th:nth-child(8){border-right:2px solid #475569 !important}
  thead tr.wl-th-row-mrg th:nth-child(1),thead th.wl-th-gross,thead th.wl-th-pay-last{border-right:2px solid #475569 !important}
  tbody td.wl-td-name,tbody td.wl-td-gross{border-right:2px solid #475569 !important}
  tbody td[colspan="2"],tbody td.wl-td-pay-last{border-right:2px solid #475569 !important}
  thead th.wl-th-sign,tbody td.wl-td-sign{border-left:2px solid #475569 !important}
  @media print{body{padding:0}}
</style>
</head>
<body>
<h1>[${co.company_name}] 임금대장 (신고용) — ${year}년 ${moStr}월</h1>
<div class="wl-ledger-wrap">
<table class="wl-ledger-tbl">
<thead>${thead}</thead>
<tbody>${tbody}</tbody>
</table>
</div>
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf8');
  }

  return router;
};
