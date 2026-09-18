// ─── 일괄 발송 ───
let _bulkSendList = [];      // [{payrollId, empName, phone, status, file}]
let _bulkSendRunning = false;

/* 일괄 발송 모달 열기 */
async function openBulkSendModal(){
  // 직원 데이터(phone 포함)를 항상 최신으로 갱신
  await loadEmployees();

  const yr = parseInt(document.getElementById('pay-year-filter')?.value)||0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value)||0;
  const co = allCompanies.find(x=>x.id===currentPayCompanyId)||{};

  // 해당 월 급여 목록 수집 (직원당 가장 최근 레코드 1건만 사용 — 중복 방어)
  const payList = allPayrolls.filter(p=>
    p.company_id===currentPayCompanyId && p.pay_year===yr && p.pay_month===mo
  );

  // 직원 ID 기준 중복 제거: 동일 직원의 레코드가 여러 건이면 updated_at 최신 1건만 사용
  const seenEmpIds = new Set();
  const dedupedPayList = payList
    .slice()
    .sort((a,b)=> (b.updated_at||0) - (a.updated_at||0))  // 최신순 정렬
    .filter(p => {
      if(seenEmpIds.has(p.employee_id)) return false;
      seenEmpIds.add(p.employee_id);
      return true;
    });

  _bulkSendList = dedupedPayList.map(p=>{
    const e = allEmployees.find(x=>x.id===p.employee_id)||{};
    return {
      payrollId:  p.id,
      empId:      p.employee_id,      // ← 발송 로그 저장용
      companyId:  p.company_id,       // ← 발송 로그 저장용
      payYear:    p.pay_year,         // ← 발송 로그 저장용
      payMonth:   p.pay_month,        // ← 발송 로그 저장용
      empName:    e.name||'(이름없음)',
      phone:      e.phone||e.mobile||'',
      email:      e.email||'',
      status:     'idle',   // idle | generating | generated | reserved | waiting | success | fail
      file:       null
    };
  }).sort((a,b)=> a.empName.localeCompare(b.empName,'ko'));

  _bulkSendRunning = false;

  // 모달 subtitle
  const moStr = String(mo).padStart(2,'0');
  document.getElementById('bulk-send-subtitle').textContent =
    `${co.company_name||''} · ${yr}년 ${moStr}월 · 총 ${_bulkSendList.length}명`;

  // 진행 바 숨김
  document.getElementById('bulk-progress-bar-wrap').style.display = 'none';
  document.getElementById('bulk-progress-bar').style.width = '0%';

  // 발송 시작 버튼 복원
  const startBtn = document.getElementById('bulk-send-start-btn');
  startBtn.disabled = false;
  startBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡 일괄 발송 시작';
  startBtn.style.background = 'linear-gradient(135deg,#ffe033,#f9d000)';
  startBtn.style.color = '#3b1f00';

  _renderBulkTable();
  document.getElementById('bulk-send-modal').classList.add('open');
}

/* 일괄 발송 모달 닫기 */
function closeBulkSendModal(){
  if(_bulkSendRunning){
    if(!confirm('발송이 진행 중입니다. 닫으면 나머지 발송이 중단됩니다. 닫으시겠습니까?')) return;
    _bulkSendRunning = false;
  }
  document.getElementById('bulk-send-modal').classList.remove('open');
}

/* 테이블 렌더 */
function _renderBulkTable(){
  const tb = document.getElementById('bulk-send-tbody');
  if(!_bulkSendList.length){
    tb.innerHTML = '<tr><td colspan="5" class="cen-empty"><i class="fas fa-inbox"></i> 해당 월 급여 데이터가 없습니다.</td></tr>';
    return;
  }
  tb.innerHTML = _bulkSendList.map((item, idx)=>{
    const hasEmail = !!(item.email && item.email.trim());
    const emailCell = hasEmail
      ? `<span style="font-size:12px;color:#374151;">${item.email}</span>`
      : `<span style="font-size:12px;color:#d1d5db;">미등록</span>`;
    const emailBtnStyle = hasEmail
      ? 'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    return `
    <tr id="bs-row-${idx}" style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:9px 12px;font-weight:700;color:#1a1a2e;">${item.empName}</td>
      <td style="padding:9px 12px;color:#6b7280;font-size:12.5px;">${item.phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="padding:9px 12px;">${emailCell}</td>
      <td style="padding:9px 12px;" id="bs-status-${idx}">${_bsStatusHtml(item.status, idx)}</td>
      <td style="padding:9px 12px;text-align:center;white-space:nowrap;" id="bs-action-${idx}">
        <button onclick="_bulkEmailSend(${idx})" ${hasEmail ? '' : 'disabled'} style="${emailBtnStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:4px;">✉ 이메일 발송</button>
        <button onclick="_bulkManualDone(${idx})" style="background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;">✔ 수동 교부 완료</button>
      </td>
    </tr>`;
  }).join('');
}

/* 상태값 → HTML 배지 */
function _bsStatusHtml(status, idx){
  const map = {
    idle:       ['idle',      '⏳ 대기'],
    generating: ['generating','⚙️ PDF 생성 중'],
    generated:  ['generated', '✅ PDF 생성완료'],
    reserved:   ['reserved',  '📨 발송 예약'],
    waiting:    ['waiting',   '🔄 발송 대기중'],
    success:    ['success',   '✔ 발송 성공'],
    fail:       ['fail',      '✖ 발송 실패'],
  };
  const [cls, label] = map[status] || ['idle','⏳ 대기'];
  const retryBtn = status==='fail'
    ? `<button class="bs-retry-btn" onclick="retrySingleSend(${idx})"><i class="fas fa-redo"></i> 재발송</button>`
    : '';
  return `<span class="bs-status ${cls}">${label}</span>${retryBtn}`;
}

/* 단일 항목 상태 갱신 */
function _setBsStatus(idx, status){
  _bulkSendList[idx].status = status;
  const cell = document.getElementById(`bs-status-${idx}`);
  if(cell) cell.innerHTML = _bsStatusHtml(status, idx);
}

/* 진행 바 갱신 */
function _updateBulkProgress(){
  const total = _bulkSendList.length;
  const done  = _bulkSendList.filter(x=>x.status==='success'||x.status==='fail').length;
  const pct   = total ? Math.round(done/total*100) : 0;
  document.getElementById('bulk-progress-bar').style.width = pct+'%';
  document.getElementById('bulk-progress-pct').textContent = `${done} / ${total} (${pct}%)`;
  document.getElementById('bulk-progress-label').textContent = done===total ? '발송 완료' : '발송 진행 중...';
}

/* 단건 PDF 생성 → Blob 반환
 * ⚠️ 주의: openPayslipModal()을 호출하면 classList.add('open')으로 모달이 열리므로
 *   style.display='none'을 설정하면 안 됨 — 이후 사용자 클릭 시 모달이 열리지 않게 됨.
 *   대신 payslip-content 요소만 off-screen으로 복제해서 캔버스 캡처.
 */
async function _generatePayslipBlob(payrollId){
  return new Promise(async (resolve, reject)=>{
    try{
      // 1. DOM 데이터 채우기 — openPayslipModal 내부 렌더 로직을 활용하되
      //    모달 open/close는 건드리지 않는다.
      //    → 방법: payslip-modal을 열되 visibility:hidden으로 처리하고 즉시 원복
      const modalEl = document.getElementById('payslip-modal');

      // 현재 모달 상태 저장
      const wasOpen = modalEl.classList.contains('open');

      // 완전히 숨긴 채로 모달 열기
      // visibility:hidden 만으로는 open 클래스가 붙을 때 display:flex 전환으로 잠깐 보임
      // → opacity:0 + z-index:-9999 + pointer-events:none 조합으로 완전 차단
      modalEl.style.opacity       = '0';
      modalEl.style.zIndex        = '-9999';
      modalEl.style.pointerEvents = 'none';
      openPayslipModal(payrollId);   // classList.add('open') + DOM 채우기

      // 렌더링 완료 대기
      await new Promise(r => setTimeout(r, 150));

      // 2. payslip-content를 off-screen 클론으로 캡처
      const srcEl = document.getElementById('payslip-content');
      const clone = srcEl.cloneNode(true);
      clone.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + srcEl.offsetWidth + 'px;background:#fff;opacity:1;pointer-events:none;z-index:-1;';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: srcEl.offsetWidth,
      });
      document.body.removeChild(clone);

      // 3. 모달 원래 상태 복원
      modalEl.style.opacity       = '';
      modalEl.style.zIndex        = '';
      modalEl.style.pointerEvents = '';
      if(!wasOpen) modalEl.classList.remove('open');

      // 4. PDF 생성
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin=10, imgW=pageW-margin*2;
      const imgH=(canvas.height/canvas.width)*imgW;
      let y=margin, remaining=imgH, srcY=0;
      const ratio=canvas.width/imgW;
      while(remaining>0){
        const sliceH=Math.min(pageH-margin*2, remaining);
        const sliceSrcH=sliceH*ratio;
        const sc=document.createElement('canvas');
        sc.width=canvas.width; sc.height=sliceSrcH;
        sc.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, sliceSrcH, 0, 0, canvas.width, sliceSrcH);
        pdf.addImage(sc.toDataURL('image/png'), 'PNG', margin, y, imgW, sliceH);
        remaining-=sliceH; srcY+=sliceSrcH;
        if(remaining>0){ pdf.addPage(); y=margin; }
      }
      resolve(pdf.output('blob'));

    } catch(err){ reject(err); }
  });
}

/* 카카오 알림톡 발송 */
async function _sendKakaoAlimtalk(phone, fileName, file){
  try {
    const res = await fetch('/api/kakao/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        templateId: 'PAYSLIP_001',
        type: 'alimtalk',
        variables: {
          '#{filename}': fileName,
        },
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `발송 실패 (HTTP ${res.status})`);
    }
    return true;
  } catch (err) {
    console.error('[카카오 알림톡] 발송 실패:', err.message);
    throw err;
  }
}

/* 일괄 발송 로그 저장 — payroll_send_logs 테이블에 기록 */
async function _saveBulkSendLog(item){
  try{
    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    const body = {
      id:          'psl_' + Date.now() + '_' + (item.empId||''),
      company_id:  item.companyId,
      employee_id: item.empId,
      payroll_id:  item.payrollId,
      pay_year:    item.payYear,
      pay_month:   item.payMonth,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'kakao',
      note:        '급여명세서 조회 화면에서 발송'
    };
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    // 발송 관리 페이지가 같은 고객사를 보고 있으면 캐시에도 즉시 반영
    if(typeof _pssSendLogs !== 'undefined' && _pssCompanyId === item.companyId){
      _pssSendLogs.push(body);
    }
  } catch(e){
    console.warn('[발송 로그 저장 실패]', e);
    // 로그 저장 실패는 발송 결과에 영향을 주지 않음
  }
}

/* 발송 시작 */
async function startBulkSend(){
  if(_bulkSendRunning) return;
  _bulkSendRunning = true;

  const startBtn = document.getElementById('bulk-send-start-btn');
  startBtn.disabled = true;
  startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 알림톡 일괄 발송 중...';

  // 진행 바 표시
  const progressWrap = document.getElementById('bulk-progress-bar-wrap');
  progressWrap.style.display = 'block';
  _updateBulkProgress();

  const yr = parseInt(document.getElementById('pay-year-filter')?.value)||0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value)||0;
  const moStr = String(mo).padStart(2,'0');

  for(let i=0; i<_bulkSendList.length; i++){
    if(!_bulkSendRunning) break; // 닫기 시 중단

    const item = _bulkSendList[i];
    // 이미 성공한 건은 건너뜀
    if(item.status === 'success') continue;

    // ① PDF 생성
    _setBsStatus(i, 'generating');
    let blob;
    try{
      blob = await _generatePayslipBlob(item.payrollId);
      const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
      item.file = new File([blob], fileName, { type:'application/pdf' });
      _setBsStatus(i, 'generated');
      await new Promise(r=>setTimeout(r, 80));
    } catch(err){
      console.error(`[PDF 생성 실패] ${item.empName}`, err);
      _setBsStatus(i, 'fail');
      _updateBulkProgress();
      continue;
    }

    // ② 발송 예약
    _setBsStatus(i, 'reserved');
    await new Promise(r=>setTimeout(r, 80));

    // ③ 발송 대기
    _setBsStatus(i, 'waiting');
    await new Promise(r=>setTimeout(r, 80));

    // ④ 카카오 알림톡 발송
    try{
      const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
      await _sendKakaoAlimtalk(item.phone, fileName, item.file);
      _setBsStatus(i, 'success');
      // ⑤ 발송 로그 저장
      await _saveBulkSendLog(item);
    } catch(err){
      console.error(`[알림톡 발송 실패] ${item.empName}`, err);
      _setBsStatus(i, 'fail');
    }
    _updateBulkProgress();
  }

  _bulkSendRunning = false;

  // 전체 완료 여부 확인
  const failCnt = _bulkSendList.filter(x=>x.status==='fail').length;
  const successCnt = _bulkSendList.filter(x=>x.status==='success').length;

  if(failCnt===0){
    // 실패 건 없음 → 재발송 버튼 비활성
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-check-circle"></i> 전체 발송 완료';
    startBtn.style.background = 'linear-gradient(135deg,#059669,#047857)';
    toast(`✅ 전체 ${successCnt}명 알림톡 발송 완료!`, 'success');
  } else {
    // 실패 건 있음 → 재발송 버튼 활성 (실패 행에는 개별 재발송 버튼이 이미 표시됨)
    startBtn.disabled = false;
    startBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡 재발송 (실패 건만)';
    startBtn.style.background = 'linear-gradient(135deg,#ffe033,#f9d000)';
    startBtn.style.color = '#3b1f00';
    toast(`⚠ 발송 완료: ${successCnt}명 성공 / ${failCnt}명 실패`, 'error');
  }
}

/* 재발송 (실패 건만) */
async function retrySingleSend(idx){
  if(_bulkSendRunning) return;
  const item = _bulkSendList[idx];
  if(!item) return;

  _bulkSendRunning = true;
  const yr = parseInt(document.getElementById('pay-year-filter')?.value)||0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value)||0;
  const moStr = String(mo).padStart(2,'0');

  // PDF 재생성
  _setBsStatus(idx, 'generating');
  try{
    const blob = await _generatePayslipBlob(item.payrollId);
    const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
    item.file = new File([blob], fileName, { type:'application/pdf' });
    _setBsStatus(idx, 'generated');
    await new Promise(r=>setTimeout(r, 80));
    _setBsStatus(idx, 'reserved');
    await new Promise(r=>setTimeout(r, 80));
    _setBsStatus(idx, 'waiting');
    await new Promise(r=>setTimeout(r, 80));
    await _sendKakaoAlimtalk(item.phone, fileName, item.file);
    _setBsStatus(idx, 'success');
    // 재발송 로그 저장
    await _saveBulkSendLog(item);
    toast(`✅ ${item.empName} 재발송 완료`, 'success');
  } catch(err){
    _setBsStatus(idx, 'fail');
    toast(`✖ ${item.empName} 재발송 실패`, 'error');
  }
  _updateBulkProgress();
  _bulkSendRunning = false;

  // 개별 재발송 후 잔여 실패 건 체크 → 모두 성공이면 하단 버튼 비활성
  const remainFail = _bulkSendList.filter(x=>x.status==='fail').length;
  const startBtn2 = document.getElementById('bulk-send-start-btn');
  if(startBtn2 && remainFail===0){
    startBtn2.disabled = true;
    startBtn2.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 전체 발송 완료';
    startBtn2.style.background = 'linear-gradient(135deg,#059669,#047857)';
  }
}

/* 이메일 개별 발송 */
async function _bulkEmailSend(idx){
  if(_bulkSendRunning) return;
  const item = _bulkSendList[idx];
  if(!item || !item.email) return;

  const yr = parseInt(document.getElementById('pay-year-filter')?.value)||0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value)||0;
  const moStr = String(mo).padStart(2,'0');

  // 버튼 비활성 처리
  const actionCell = document.getElementById(`bs-action-${idx}`);
  if(actionCell) actionCell.innerHTML = '<span style="color:#6b7280;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> 처리 중...</span>';

  try{
    // PDF 생성
    const blob = await _generatePayslipBlob(item.payrollId);
    const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const file = new File([blob], fileName, { type:'application/pdf' });

    // 이메일 발송 (stub — 실제 연동 시 API 호출로 교체)
    await _sendEmailWithAttachment(item.email, fileName, file);

    // 발송 로그 저장 (send_method: email)
    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          'psl_' + Date.now() + '_' + (item.empId||''),
        company_id:  item.companyId,
        employee_id: item.empId,
        payroll_id:  item.payrollId,
        pay_year:    item.payYear,
        pay_month:   item.payMonth,
        sent_at:     new Date().toISOString(),
        sent_by:     sentBy,
        send_method: 'email',
        note:        `이메일 발송 (${item.email})`
      })
    });

    // ── 고객사 인앱 알림 발송 (이메일 개별 발송 — 일괄 목록) ──
    {
      const _beCo  = allCompanies.find(x => x.id === item.companyId) || {};
      const _coRep = getCompanyRepGreeting(_beCo);
      await _sendCompanyNotice({
        companyId  : item.companyId || '', companyName: _beCo.company_name || '',
        noticeType : 'payslip_dispatched',
        title      : `[급여명세서 발송] ${item.empName} — ${yr}년 ${mo}월 이메일 발송`,
        body       :
`안녕하세요${_coRep}.

소속 근로자의 급여명세서가 이메일로 발송되었습니다.

■ 근로자: ${item.empName}
■ 지급 기간: ${yr}년 ${mo}월
■ 발송 방법: 이메일 (${item.email})
■ 발송 시각: ${new Date().toLocaleString('ko-KR')}

`,
        employeeId : item.empId, employeeName: item.empName,
      });
    }
    // 확인 메시지 → 행 제거
    alert(`${item.empName}의 ${yr}년 ${mo}월 급여명세서를 이메일로 발송하였습니다.`);
    _bulkSendList.splice(idx, 1);
    _renderBulkTable();
    _checkAllDone();
  } catch(err){
    console.error('[이메일 발송 실패]', err);
    toast(`✖ ${item.empName} 이메일 발송 실패`, 'error');
    // 버튼 복원
    _renderBulkTable();
  }
}

/* 수동 교부 완료 처리 */
async function _bulkManualDone(idx){
  const item = _bulkSendList[idx];
  if(!item) return;

  const yr = parseInt(document.getElementById('pay-year-filter')?.value)||0;
  const mo = parseInt(document.getElementById('pay-month-filter')?.value)||0;

  const ok = confirm(`${item.empName}의 ${yr}년 ${mo}월 급여명세서를 수동 교부 완료한 것으로 기록하고 미발송 내역에서 제외하겠습니까?`);
  if(!ok) return;

  try{
    // 발송 로그 저장 (send_method: manual)
    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          'psl_' + Date.now() + '_' + (item.empId||''),
        company_id:  item.companyId,
        employee_id: item.empId,
        payroll_id:  item.payrollId,
        pay_year:    item.payYear,
        pay_month:   item.payMonth,
        sent_at:     new Date().toISOString(),
        sent_by:     sentBy,
        send_method: 'manual',
        note:        '수동 교부 완료'
      })
    });

    // 행 제거
    _bulkSendList.splice(idx, 1);
    _renderBulkTable();
    _checkAllDone();
    toast(`✔ ${item.empName} 수동 교부 완료 처리됐습니다.`, 'success');
  } catch(err){
    console.error('[수동 교부 저장 실패]', err);
    toast('저장 중 오류가 발생했습니다.', 'error');
  }
}

/* 전체 완료 여부 체크 → 목록이 비면 버튼 비활성 */
function _checkAllDone(){
  if(_bulkSendList.length === 0){
    const btn = document.getElementById('bulk-send-start-btn');
    if(btn){
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> 전체 처리 완료';
      btn.style.background = 'linear-gradient(135deg,#059669,#047857)';
    }
  }
}

/* 이메일 첨부 발송 stub (실제 연동 시 교체) */
async function _sendEmailWithAttachment(toEmail, fileName, file){
  // TODO: 실제 이메일 API 연동
  await new Promise(r => setTimeout(r, 600));
}
