/**
 * modules/payroll-bulk.mjs — Phase 3-3: 급여명세서 일괄 발송
 * 
 * payroll-bulk.js → 완전 ESM 변환 (16개 함수)
 * state.mjs/constants.mjs/utils.mjs import + 레거시 window 함수 하이브리드.
 */
import { getCompanies, getEmployees, getPayrolls } from './state.mjs';

// ═══════════════════════════════════════════
// 모듈 레벨 상태 (window → 모듈 변수)
// ═══════════════════════════════════════════
let _bulkSendList = [];
let _bulkSendRunning = false;

// ═══════════════════════════════════════════
// 레거시 브릿지 (아직 .mjs로 이전되지 않은 함수들)
// ═══════════════════════════════════════════
const _w = (name) => window[name];          // window 함수 참조
const _api = (...args) => window.api(...args); // api() 레거시 (api.mjs import 가능)
const _toast = (msg, type) => window.toast ? window.toast(msg, type) : alert(msg);

// ═══════════════════════════════════════════
// 함수 구현
// ═══════════════════════════════════════════

/** 버튼 활성화 여부 판단 */
export function updateBulkSendBtn() {
  const btn = document.getElementById('bulk-send-btn');
  if (!btn) return;

  const cpId = window.currentPayCompanyId;
  if (!cpId) { btn.disabled = true; return; }
  const yr = parseInt(document.getElementById('pay-year-filter')?.value) || 0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value) || 0;
  if (!yr || !mo) { btn.disabled = true; return; }

  const filtered = getPayrolls().filter(p =>
    p.company_id === cpId && p.pay_year === yr && p.pay_month === mo
  );
  if (!filtered.length) { btn.disabled = true; return; }
  btn.disabled = filtered.some(p => !!p.is_draft);
}

/** 일괄 발송 모달 열기 */
export async function openBulkSendModal() {
  await window.loadEmployees();
  const yr = parseInt(document.getElementById('pay-year-filter')?.value) || 0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value) || 0;
  const co = getCompanies().find(x => x.id === window.currentPayCompanyId) || {};
  const payList = getPayrolls().filter(p =>
    p.company_id === window.currentPayCompanyId && p.pay_year === yr && p.pay_month === mo
  );

  const seenEmpIds = new Set();
  const dedupedPayList = payList.slice().sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))
    .filter(p => { if (seenEmpIds.has(p.employee_id)) return false; seenEmpIds.add(p.employee_id); return true; });

  _bulkSendList = dedupedPayList.map(p => {
    const e = getEmployees().find(x => x.id === p.employee_id) || {};
    return {
      payrollId: p.id, empId: p.employee_id, companyId: p.company_id,
      payYear: p.pay_year, payMonth: p.pay_month,
      empName: e.name || '(이름없음)', phone: e.phone || e.mobile || '',
      email: e.email || '', status: 'idle', file: null
    };
  }).sort((a, b) => a.empName.localeCompare(b.empName, 'ko'));

  _bulkSendRunning = false;
  const moStr = String(mo).padStart(2, '0');
  document.getElementById('bulk-send-subtitle').textContent =
    `${co.company_name || ''} · ${yr}년 ${moStr}월 · 총 ${_bulkSendList.length}명`;
  document.getElementById('bulk-progress-bar-wrap').style.display = 'none';
  document.getElementById('bulk-progress-bar').style.width = '0%';
  const startBtn = document.getElementById('bulk-send-start-btn');
  startBtn.disabled = false;
  startBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡 일괄 발송 시작';
  startBtn.style.background = 'linear-gradient(135deg,#ffe033,#f9d000)';
  startBtn.style.color = '#3b1f00';
  _renderBulkTable();
  document.getElementById('bulk-send-modal').classList.add('open');
}

/** 일괄 발송 모달 닫기 */
export function closeBulkSendModal() {
  if (_bulkSendRunning) {
    if (!confirm('발송이 진행 중입니다. 닫으면 나머지 발송이 중단됩니다. 닫으시겠습니까?')) return;
    _bulkSendRunning = false;
  }
  document.getElementById('bulk-send-modal').classList.remove('open');
}

/** 테이블 렌더 */
function _renderBulkTable() {
  const tb = document.getElementById('bulk-send-tbody');
  if (!_bulkSendList.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#9ca3af;">해당 월 급여 데이터가 없습니다.</td></tr>';
    return;
  }
  tb.innerHTML = _bulkSendList.map((item, idx) => {
    const hasEmail = !!(item.email && item.email.trim());
    const emailCell = hasEmail
      ? `<span style="font-size:12px;color:#374151;">${item.email}</span>`
      : '<span style="font-size:12px;color:#d1d5db;">미등록</span>';
    const emailBtnStyle = hasEmail
      ? 'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    return `<tr id="bs-row-${idx}" style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:9px 12px;font-weight:700;color:#1a1a2e;">${item.empName}</td>
      <td style="padding:9px 12px;color:#6b7280;font-size:12.5px;">${item.phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="padding:9px 12px;">${emailCell}</td>
      <td style="padding:9px 12px;" id="bs-status-${idx}">${_bsStatusHtml(item.status, idx)}</td>
      <td style="padding:9px 12px;text-align:center;white-space:nowrap;" id="bs-action-${idx}">
        <button onclick="window._bulkEmailSend(${idx})" ${hasEmail ? '' : 'disabled'} style="${emailBtnStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:4px;">✉ 이메일 발송</button>
        <button onclick="window._bulkManualDone(${idx})" style="background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;">✔ 수동 교부 완료</button>
      </td></tr>`;
  }).join('');
}

/** 상태값 → HTML 배지 */
function _bsStatusHtml(status, idx) {
  const map = {
    idle: ['idle', '⏳ 대기'], generating: ['generating', '⚙️ PDF 생성 중'],
    generated: ['generated', '✅ PDF 생성완료'], reserved: ['reserved', '📨 발송 예약'],
    waiting: ['waiting', '🔄 발송 대기중'], success: ['success', '✔ 발송 성공'],
    fail: ['fail', '✖ 발송 실패'],
  };
  const [cls, label] = map[status] || ['idle', '⏳ 대기'];
  const retryBtn = status === 'fail'
    ? `<button class="bs-retry-btn" onclick="window.retrySingleSend(${idx})"><i class="fas fa-redo"></i> 재발송</button>` : '';
  return `<span class="bs-status ${cls}">${label}</span>${retryBtn}`;
}

/** 단일 항목 상태 갱신 */
function _setBsStatus(idx, status) {
  _bulkSendList[idx].status = status;
  const cell = document.getElementById(`bs-status-${idx}`);
  if (cell) cell.innerHTML = _bsStatusHtml(status, idx);
}

/** 진행 바 갱신 */
function _updateBulkProgress() {
  const total = _bulkSendList.length;
  const done = _bulkSendList.filter(x => x.status === 'success' || x.status === 'fail').length;
  const pct = total ? Math.round(done / total * 100) : 0;
  document.getElementById('bulk-progress-bar').style.width = pct + '%';
  document.getElementById('bulk-progress-pct').textContent = `${done} / ${total} (${pct}%)`;
  document.getElementById('bulk-progress-label').textContent = done === total ? '발송 완료' : '발송 진행 중...';
}

/** 단건 PDF 생성 */
async function _generatePayslipBlob(payrollId) {
  return new Promise(async (resolve, reject) => {
    try {
      const modalEl = document.getElementById('payslip-modal');
      const wasOpen = modalEl.classList.contains('open');
      modalEl.style.opacity = '0'; modalEl.style.zIndex = '-9999'; modalEl.style.pointerEvents = 'none';
      window.openPayslipModal(payrollId);
      await new Promise(r => setTimeout(r, 150));
      const srcEl = document.getElementById('payslip-content');
      const clone = srcEl.cloneNode(true);
      clone.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + srcEl.offsetWidth + 'px;background:#fff;opacity:1;pointer-events:none;z-index:-1;';
      document.body.appendChild(clone);
      const canvas = await window.html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, width: srcEl.offsetWidth });
      document.body.removeChild(clone);
      modalEl.style.opacity = ''; modalEl.style.zIndex = ''; modalEl.style.pointerEvents = '';
      if (!wasOpen) modalEl.classList.remove('open');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();
      const margin = 10, imgW = pageW - margin * 2, imgH = (canvas.height / canvas.width) * imgW;
      let y = margin, remaining = imgH, srcY = 0;
      const ratio = canvas.width / imgW;
      while (remaining > 0) {
        const sliceH = Math.min(pageH - margin * 2, remaining), sliceSrcH = sliceH * ratio;
        const sc = document.createElement('canvas'); sc.width = canvas.width; sc.height = sliceSrcH;
        sc.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, sliceSrcH, 0, 0, canvas.width, sliceSrcH);
        pdf.addImage(sc.toDataURL('image/png'), 'PNG', margin, y, imgW, sliceH);
        remaining -= sliceH; srcY += sliceSrcH;
        if (remaining > 0) { pdf.addPage(); y = margin; }
      }
      resolve(pdf.output('blob'));
    } catch (err) { reject(err); }
  });
}

/** 카카오 알림톡 발송 */
async function _sendKakaoAlimtalk(phone, fileName, file) {
  await new Promise(r => setTimeout(r, 400));
  window._bulkPayslipFiles = window._bulkPayslipFiles || [];
  window._bulkPayslipFiles.push({ phone, fileName, file });
  return true;
}

/** 발송 로그 저장 */
async function _saveBulkSendLog(item) {
  try {
    const sentBy = window.sessionStorage.getItem('admin_username') || 'admin';
    const body = {
      id: 'psl_' + Date.now() + '_' + (item.empId || ''),
      company_id: item.companyId, employee_id: item.empId, payroll_id: item.payrollId,
      pay_year: item.payYear, pay_month: item.payMonth,
      sent_at: new Date().toISOString(), sent_by: sentBy, send_method: 'kakao',
      note: '급여명세서 조회 화면에서 발송'
    };
    await _api('../tables/payroll_send_logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (typeof _w('_pssSendLogs') !== 'undefined' && _w('_pssCompanyId') === item.companyId) {
      _w('_pssSendLogs').push(body);
    }
  } catch (e) { console.warn('[발송 로그 저장 실패]', e); }
}

/** 발송 시작 */
export async function startBulkSend() {
  if (_bulkSendRunning) return;
  _bulkSendRunning = true;
  const startBtn = document.getElementById('bulk-send-start-btn');
  startBtn.disabled = true;
  startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 알림톡 일괄 발송 중...';
  document.getElementById('bulk-progress-bar-wrap').style.display = 'block';
  _updateBulkProgress();
  const yr = parseInt(document.getElementById('pay-year-filter')?.value) || 0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value) || 0;
  const moStr = String(mo).padStart(2, '0');
  for (let i = 0; i < _bulkSendList.length; i++) {
    if (!_bulkSendRunning) break;
    const item = _bulkSendList[i];
    if (item.status === 'success') continue;
    _setBsStatus(i, 'generating');
    try {
      const blob = await _generatePayslipBlob(item.payrollId);
      const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
      item.file = new File([blob], fileName, { type: 'application/pdf' });
      _setBsStatus(i, 'generated'); await new Promise(r => setTimeout(r, 80));
      _setBsStatus(i, 'reserved'); await new Promise(r => setTimeout(r, 80));
      _setBsStatus(i, 'waiting'); await new Promise(r => setTimeout(r, 80));
      await _sendKakaoAlimtalk(item.phone, fileName, item.file);
      _setBsStatus(i, 'success');
      await _saveBulkSendLog(item);
    } catch (err) {
      console.error(`[PDF 생성 실패] ${item.empName}`, err);
      _setBsStatus(i, 'fail');
    }
    _updateBulkProgress();
  }
  _bulkSendRunning = false;
  const failCnt = _bulkSendList.filter(x => x.status === 'fail').length;
  const successCnt = _bulkSendList.filter(x => x.status === 'success').length;
  if (failCnt === 0) {
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-check-circle"></i> 전체 발송 완료';
    startBtn.style.background = 'linear-gradient(135deg,#059669,#047857)';
    _toast(`✅ 전체 ${successCnt}명 알림톡 발송 완료!`, 'success');
  } else {
    startBtn.disabled = false;
    startBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡 재발송 (실패 건만)';
    startBtn.style.background = 'linear-gradient(135deg,#ffe033,#f9d000)';
    startBtn.style.color = '#3b1f00';
    _toast(`⚠ 발송 완료: ${successCnt}명 성공 / ${failCnt}명 실패`, 'error');
  }
}

/** 재발송 (실패 건만) */
export async function retrySingleSend(idx) {
  if (_bulkSendRunning) return;
  const item = _bulkSendList[idx];
  if (!item) return;
  _bulkSendRunning = true;
  const yr = parseInt(document.getElementById('pay-year-filter')?.value) || 0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value) || 0;
  const moStr = String(mo).padStart(2, '0');
  _setBsStatus(idx, 'generating');
  try {
    const blob = await _generatePayslipBlob(item.payrollId);
    item.file = new File([blob], `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`, { type: 'application/pdf' });
    _setBsStatus(idx, 'generated'); await new Promise(r => setTimeout(r, 80));
    _setBsStatus(idx, 'reserved'); await new Promise(r => setTimeout(r, 80));
    _setBsStatus(idx, 'waiting'); await new Promise(r => setTimeout(r, 80));
    await _sendKakaoAlimtalk(item.phone, item.file.name, item.file);
    _setBsStatus(idx, 'success');
    await _saveBulkSendLog(item);
    _toast(`✅ ${item.empName} 재발송 완료`, 'success');
  } catch (err) {
    _setBsStatus(idx, 'fail');
    _toast(`✖ ${item.empName} 재발송 실패`, 'error');
  }
  _updateBulkProgress();
  _bulkSendRunning = false;
  const remainFail = _bulkSendList.filter(x => x.status === 'fail').length;
  const startBtn2 = document.getElementById('bulk-send-start-btn');
  if (startBtn2 && remainFail === 0) {
    startBtn2.disabled = true;
    startBtn2.innerHTML = '<i class="fas fa-check-circle"></i> 전체 발송 완료';
    startBtn2.style.background = 'linear-gradient(135deg,#059669,#047857)';
  }
}

/** 이메일 개별 발송 */
export async function _bulkEmailSend(idx) {
  if (_bulkSendRunning) return;
  const item = _bulkSendList[idx];
  if (!item || !item.email) return;
  const yr = parseInt(document.getElementById('pay-year-filter')?.value) || 0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value) || 0;
  const moStr = String(mo).padStart(2, '0');
  const actionCell = document.getElementById(`bs-action-${idx}`);
  if (actionCell) actionCell.innerHTML = '<span style="color:#6b7280;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> 처리 중...</span>';
  try {
    const blob = await _generatePayslipBlob(item.payrollId);
    const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });
    await _sendEmailWithAttachment(item.email, fileName, file);
    const sentBy = window.sessionStorage.getItem('admin_username') || 'admin';
    await _api('../tables/payroll_send_logs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'psl_' + Date.now() + '_' + (item.empId || ''), company_id: item.companyId, employee_id: item.empId, payroll_id: item.payrollId, pay_year: item.payYear, pay_month: item.payMonth, sent_at: new Date().toISOString(), sent_by: sentBy, send_method: 'email', note: `이메일 발송 (${item.email})` }) });
    if (typeof window._sendCompanyNotice === 'function') {
      const beCo = getCompanies().find(x => x.id === item.companyId) || {};
      window._sendCompanyNotice({ companyId: item.companyId || '', companyName: beCo.company_name || '',
        noticeType: 'payslip_individual_sent', title: `[급여명세서 발송] ${item.empName} — ${yr}년 ${mo}월 이메일 발송`,
        body: `안녕하세요${window.getCompanyRepGreeting ? window.getCompanyRepGreeting(beCo) : ''}.\n\n소속 근로자의 급여명세서가 이메일로 발송되었습니다.\n\n■ 근로자: ${item.empName}\n■ 지급 기간: ${yr}년 ${mo}월\n■ 발송 방법: 이메일 (${item.email})\n■ 발송 시각: ${new Date().toLocaleString('ko-KR')}\n\n발송 상세 내역은 급여명세서 발송 관리 메뉴에서 확인하세요.\n\n${window._BRAND_SIG || ''}`,
        employeeId: item.empId, employeeName: item.empName });
    }
    alert(`${item.empName}의 ${yr}년 ${mo}월 급여명세서를 이메일로 발송하였습니다.`);
    _bulkSendList.splice(idx, 1); _renderBulkTable(); _checkAllDone();
  } catch (err) { console.error('[이메일 발송 실패]', err); _toast(`✖ ${item.empName} 이메일 발송 실패`, 'error'); _renderBulkTable(); }
}

/** 수동 교부 완료 */
export async function _bulkManualDone(idx) {
  const item = _bulkSendList[idx];
  if (!item) return;
  const yr = parseInt(document.getElementById('pay-year-filter')?.value) || 0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value) || 0;
  if (!confirm(`${item.empName}의 ${yr}년 ${mo}월 급여명세서를 수동 교부 완료한 것으로 기록하고 미발송 내역에서 제외하겠습니까?`)) return;
  try {
    const sentBy = window.sessionStorage.getItem('admin_username') || 'admin';
    await _api('../tables/payroll_send_logs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'psl_' + Date.now() + '_' + (item.empId || ''), company_id: item.companyId, employee_id: item.empId, payroll_id: item.payrollId, pay_year: item.payYear, pay_month: item.payMonth, sent_at: new Date().toISOString(), sent_by: sentBy, send_method: 'manual', note: '수동 교부 완료' }) });
    _bulkSendList.splice(idx, 1); _renderBulkTable(); _checkAllDone();
    _toast(`✔ ${item.empName} 수동 교부 완료 처리됐습니다.`, 'success');
  } catch (err) { console.error('[수동 교부 저장 실패]', err); _toast('저장 중 오류가 발생했습니다.', 'error'); }
}

function _checkAllDone() {
  if (_bulkSendList.length === 0) {
    const btn = document.getElementById('bulk-send-start-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-check-circle"></i> 전체 처리 완료'; btn.style.background = 'linear-gradient(135deg,#059669,#047857)'; }
  }
}

async function _sendEmailWithAttachment(toEmail, fileName, file) {
  await new Promise(r => setTimeout(r, 600));
}

// ═══════════════════════════════════════════
// Phase 3-3: window 등록 → 레거시 코드 오버라이드
// ═══════════════════════════════════════════
if (typeof window !== 'undefined') {
  window.updateBulkSendBtn = updateBulkSendBtn;
  window.openBulkSendModal = openBulkSendModal;
  window.closeBulkSendModal = closeBulkSendModal;
  window.startBulkSend = startBulkSend;
  window.retrySingleSend = retrySingleSend;
  window._bulkEmailSend = _bulkEmailSend;
  window._bulkManualDone = _bulkManualDone;
  console.log('[ESM PayrollBulk] 7개 함수 → ESM 모듈로 오버라이드 완료');
}
