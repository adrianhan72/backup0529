function renderBilling(){
  const el = document.getElementById('billing-content');

  // 전체 청구 없을 때
  if(!allBillings.length){
    el.innerHTML = `
      <div class="bill-empty">
        <div class="bill-empty-icon">💳</div>
        <div class="bill-empty-title">아직 청구된 내역이 없습니다</div>
        <div class="bill-empty-desc">
          서비스 사용료 청구가 생성되면<br>
          이 페이지에서 확인하실 수 있습니다.<br>
          <span style="color:#a0aec0;font-size:12px;margin-top:6px;display:block;">문의: 담당 노무사에게 연락하세요</span>
        </div>
      </div>`;
    return;
  }

  // 상태 정규화 헬퍼 (constants.js 상수 사용)
  const isPaid     = b => _normPaymentStatus(b.payment_status) === PAYMENT_STATUS.PAID;
  const isPartial  = b => _normPaymentStatus(b.payment_status) === PAYMENT_STATUS.PARTIAL;
  const isWait     = b => _normPaymentStatus(b.payment_status) === PAYMENT_STATUS.PENDING;
  const isLoss     = b => !!(b.loss_amount && b.loss_amount > 0);
  const getAmt     = b => b.total_amount||b.amount||0;
  const getPaid    = b => isPaid(b) ? getAmt(b) : (isPartial(b) ? (b.partial_paid_amount||0) : 0);
  const getRemain  = b => isPaid(b) ? 0 : (isPartial(b) ? (b.remaining_amount||getAmt(b)-(b.partial_paid_amount||0)) : getAmt(b));

  // ── 선택 연월 기준 필터 ──
  const monthBillings = allBillings.filter(b =>
    Number(b.billing_year) === billingYear && Number(b.billing_month) === billingMonth
  );

  // 전체 집계 (요약 카드는 전체 기준)
  const totalAmt    = allBillings.reduce((s,b)=>s+getAmt(b),0);
  const totalPaidAmt= allBillings.reduce((s,b)=>s+getPaid(b),0);
  const totalUnpaid = allBillings.reduce((s,b)=>s+getRemain(b),0);
  // 미납 경고는 전체 미납 기준
  const unpaidList  = allBillings.filter(b=>!isPaid(b)&&getRemain(b)>0&&!isLoss(b));

  // 선택 연월 청구 건 정렬 (통상 1건이지만 복수 대비)
  const sorted = [...monthBillings].sort((a,b)=>
    (b.billing_year||0)-(a.billing_year||0) || (b.billing_month||0)-(a.billing_month||0)
  );

  // 상태 뱃지 헬퍼
  function statusBadge(b){
    if(isPaid(b))    return `<span class="bill-status-badge s-paid"><i class="fas fa-check-circle"></i>완납</span>`;
    if(isPartial(b)) return `<span class="bill-status-badge s-partial"><i class="fas fa-adjust"></i>일부납</span>`;
    if(isWait(b))    return `<span class="bill-status-badge s-wait"><i class="fas fa-clock"></i>납부대기</span>`;
    if(isLoss(b))    return `<span class="bill-status-badge s-loss"><i class="fas fa-ban"></i>손실처리</span>`;
    return             `<span class="bill-status-badge s-unpaid"><i class="fas fa-exclamation-circle"></i>미납</span>`;
  }

  // 금액 포맷
  const moneyFmt  = n => Math.round(n||0).toLocaleString('ko-KR');
  const moneyWon  = n => moneyFmt(n) + '원';
  const moneyUnit = n => {
    const v = Math.round((n||0)/10000);
    return v > 0 ? v.toLocaleString('ko-KR')+'만원' : '0원';
  };

  // ── 미납 경고 배너 (미납금 있을 때만) ──
  const alertBanner = (totalUnpaid > 0 && unpaidList.length > 0) ? `
    <div class="bill-alert-banner">
      <div class="bill-alert-icon"><i class="fas fa-exclamation"></i></div>
      <div class="bill-alert-body">
        <div class="bill-alert-title">미납 사용료가 있습니다</div>
        <div class="bill-alert-amt">${moneyWon(totalUnpaid)}</div>
        <div class="bill-alert-sub">${unpaidList.length}건 미납 · 담당 노무사에게 문의하세요</div>
      </div>
    </div>` : '';

  // ── 요약 카드 3칸 (전체 기준) ──
  const paidCount   = allBillings.filter(isPaid).length;
  const unpaidCount = allBillings.filter(b=>!isPaid(b)).length;
  const summaryGrid = `
    <div class="bill-summary-grid">
      <div class="bill-sum-card b-total">
        <div class="bsc-label">전체 청구</div>
        <div class="bsc-val">${moneyUnit(totalAmt)}</div>
        <div class="bsc-sub">${allBillings.length}건</div>
      </div>
      <div class="bill-sum-card b-paid">
        <div class="bsc-label">납부 완료</div>
        <div class="bsc-val">${moneyUnit(totalPaidAmt)}</div>
        <div class="bsc-sub">${paidCount}건</div>
      </div>
      <div class="bill-sum-card b-unpaid">
        <div class="bsc-label">미납 잔액</div>
        <div class="bsc-val">${moneyUnit(totalUnpaid)}</div>
        <div class="bsc-sub">${unpaidCount}건</div>
      </div>
    </div>`;

  // ── 선택 월 섹션 헤더 ──
  const monthHeader = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin:14px 2px 8px;">
      <div style="font-size:13px;font-weight:700;color:#1a1a2e;"><i class="fas fa-calendar-alt" style="color:#6366f1;margin-right:6px;"></i>${billingYear}년 ${billingMonth}월 청구 내역</div>
      <span style="font-size:11px;background:#ede9fe;color:#4c1d95;padding:3px 9px;border-radius:20px;font-weight:600;">${sorted.length}건</span>
    </div>`;

  // ── 개별 청구 카드 ──
  const billCards = sorted.map(b => {
    const amt      = getAmt(b);
    const paidAmt  = getPaid(b);
    const remain   = getRemain(b);
    const pct      = amt > 0 ? Math.round(paidAmt/amt*100) : 0;
    const hasLoss  = isLoss(b);
    const partialB = isPartial(b);

    // 진행 바 (완납이 아닐 때 표시)
    const progressBar = !isPaid(b) && amt > 0 ? `
      <div class="bill-progress-wrap">
        <div class="bill-progress-bar">
          <div class="bill-progress-fill" style="width:${pct}%;background:${pct===100?'#10b981':pct>0?'#f59e0b':'#e5e7eb'};"></div>
        </div>
        <div class="bill-progress-labels">
          <span style="color:${pct>0?'#d97706':'#9ca3af'};">납부 ${pct}%${paidAmt>0?' ('+moneyWon(paidAmt)+')':''}</span>
          <span style="color:#dc2626;">잔여 ${moneyWon(remain)}</span>
        </div>
      </div>` : '';

    // 상세 정보 그리드
    const detailItems = [];
    if(b.employee_count)       detailItems.push(['청구 인원', b.employee_count+'명', '']);
    if(b.amount_per_employee)  detailItems.push(['인당 사용료', moneyWon(b.amount_per_employee), '']);
    if(b.created_date)         detailItems.push(['청구일', b.created_date, '']);
    if(b.due_date)             detailItems.push(['납부 마감일', b.due_date, isPaid(b)?'':'red']);
    if(paidAmt > 0 && !isPaid(b)) detailItems.push(['납부된 금액', moneyWon(paidAmt), 'green']);
    if(remain > 0 && !isPaid(b))  detailItems.push(['잔여 미납액', moneyWon(remain), 'red']);
    if(b.payment_date)         detailItems.push(['납부 확인일', b.payment_date, 'green']);
    if(b.note)                 detailItems.push(['메모', b.note, '']);

    // 짝수 맞추기 (빈칸 채우기)
    if(detailItems.length % 2 !== 0) detailItems.push(['', '', '']);

    const detailGrid = detailItems.length > 0 ? `
      <div class="bill-detail-grid">
        ${detailItems.map(([l,v,cls])=>l ? `
          <div class="bill-detail-item">
            <div class="bill-detail-label">${l}</div>
            <div class="bill-detail-value ${cls}">${v}</div>
          </div>` : `<div class="bill-detail-item"></div>`
        ).join('')}
      </div>` : '';

    // 손실 처리 표시
    const lossBar = hasLoss ? `
      <div class="bill-loss-bar">
        <i class="fas fa-info-circle"></i>
        손실 처리: ${moneyWon(b.loss_amount)}
        ${b.loss_date ? ' · ' + b.loss_date : ''}
      </div>` : '';

    return `
      <div class="bill-item">
        <div class="bill-item-header">
          <div>
            <div class="bill-item-period">${b.billing_year||'-'}년 ${b.billing_month||'-'}월 사용료</div>
            <div class="bill-item-date">
              ${b.created_date ? '청구일 ' + b.created_date : ''}
              ${b.due_date && !isPaid(b) ? ' · <span style="color:#ef4444;font-weight:600;">마감 '+b.due_date+'</span>' : ''}
            </div>
          </div>
          ${statusBadge(b)}
        </div>
        <div class="bill-amount-row">
          <div>
            <div class="bill-amount-main">${moneyWon(amt)}</div>
            <div class="bill-amount-per">
              ${b.employee_count?b.employee_count+'명 × ':''} ${b.amount_per_employee?moneyWon(b.amount_per_employee)+'/인':''}
            </div>
          </div>
          ${isPaid(b) && b.payment_date ? `<div style="text-align:right;"><div style="font-size:11px;color:#9ca3af;">납부확인</div><div style="font-size:12.5px;font-weight:700;color:#059669;">${b.payment_date}</div></div>` : ''}
        </div>
        ${progressBar}
        ${detailGrid}
        ${lossBar}
      </div>`;
  }).join('');

  // 선택 월 청구 없을 때 안내
  const noMonthData = sorted.length === 0 ? `
    <div style="text-align:center;padding:32px 20px 20px;">
      <div style="font-size:36px;margin-bottom:10px;">📭</div>
      <div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:6px;">${billingYear}년 ${billingMonth}월 청구 내역이 없습니다</div>
      <div style="font-size:12.5px;color:#9ca3af;line-height:1.6;">다른 월을 선택하거나<br>담당 노무사에게 문의하세요</div>
    </div>` : '';

  el.innerHTML = alertBanner + summaryGrid + monthHeader + (noMonthData || billCards);
}

// ══ 4. MY COMPANY PAGE ══
function renderMyco(){
  const el = document.getElementById('myco-content');
  const co = currentCompany;
  const activeEmps = allEmployees.filter(e=>_isEmpActive(e));
  const activeContracts = allContracts.filter(c=>_isContractActive(c));

  el.innerHTML = `
    <!-- 회사 헤더 -->
    <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);border-radius:18px;padding:24px 20px;margin-bottom:14px;text-align:center;">
      <div style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;">🏢</div>
      <div style="color:#fff;font-size:19px;font-weight:800;">${co.company_name||'-'}</div>
      <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:5px;">${co.industry||''} ${co.representative?'· 대표: '+co.representative:''}</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;">
        <div style="background:rgba(255,255,255,.1);border-radius:10px;padding:10px 18px;text-align:center;">
          <div style="color:rgba(255,255,255,.6);font-size:10px;">재직인원</div>
          <div style="color:#fff;font-size:18px;font-weight:800;">${activeEmps.length}명</div>
        </div>
        <div style="background:rgba(255,255,255,.1);border-radius:10px;padding:10px 18px;text-align:center;">
          <div style="color:rgba(255,255,255,.6);font-size:10px;">유효계약</div>
          <div style="color:#fff;font-size:18px;font-weight:800;">${activeContracts.length}건</div>
        </div>
        <div style="background:rgba(255,255,255,.1);border-radius:10px;padding:10px 18px;text-align:center;">
          <div style="color:rgba(255,255,255,.6);font-size:10px;">전체인원</div>
          <div style="color:#fff;font-size:18px;font-weight:800;">${allEmployees.length}명</div>
        </div>
      </div>
    </div>

    <div class="info-card">
      <div class="info-card-title"><i class="fas fa-building" style="color:#6366f1;"></i> 기본 정보</div>
      ${[
        ['회사명', co.company_name||'-'],
        ['사업자등록번호', co.business_number||'-'],
        ['대표이사', co.representative||'-'],
        ['업종', co.industry||'-'],
        ['사업장 주소', co.address||'-'],
      ].map(([l,v])=>`<div class="info-row"><span class="il">${l}</span><span class="iv">${v}</span></div>`).join('')}
    </div>

    <div class="info-card">
      <div class="info-card-title"><i class="fas fa-phone" style="color:#10b981;"></i> 연락처</div>
      ${[
        ['대표 연락처', co.phone||'-'],
        ['이메일', co.email||'-'],
      ].map(([l,v])=>`<div class="info-row"><span class="il">${l}</span><span class="iv">${v}</span></div>`).join('')}
    </div>

    <div class="info-card">
      <div class="info-card-title"><i class="fas fa-calendar-alt" style="color:#f59e0b;"></i> 급여 정보</div>
      ${[
        ['급여 산정기간', co.pay_period||'-'],
        ['급여 지급일', co.pay_day||'-'],
      ].map(([l,v])=>`<div class="info-row"><span class="il">${l}</span><span class="iv">${v}</span></div>`).join('')}
    </div>

    <!-- 고용형태별 인원 -->
    <div class="info-card">
      <div class="info-card-title"><i class="fas fa-users" style="color:#8b5cf6;"></i> 고용형태별 인원</div>
      ${['정규직','정규직 수습','계약직','계약직 수습','일용직'].map(cat=>{
        const cnt = allEmployees.filter(e=>{
          const empCat = _normContractType(e.employment_category);
          return CONTRACT_TYPE_LABEL[empCat] === cat;
        }).length;
        return `<div class="info-row"><span class="il"><span class="badge ${empCatBadge(cat)}">${cat}</span></span><span class="iv">${cnt}명</span></div>`;
      }).join('')}
    </div>

    <!-- 앱 접근코드 카드 -->
    <div class="info-card" style="border:1.5px solid #e0e7ff;background:#fafbff;">
      <div class="info-card-title"><i class="fas fa-key" style="color:#6366f1;"></i> 앱 접근코드</div>
      <div style="position:relative;display:flex;align-items:center;margin-top:6px;">
        <input type="text" id="myco-code-input" value="${co.access_code||''}" readonly
          style="flex:1;padding:10px 56px 10px 14px;background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:10px;font-size:14px;font-weight:700;color:#4f46e5;letter-spacing:2px;font-family:inherit;outline:none;"
          oninput="var m=document.getElementById('myco-code-msg');if(m){m.style.color='#9ca3af';m.innerHTML='<i class=\\'fas fa-info-circle\\'></i> 숫자+영문 대문자 혼합 6~8자리';}" />
        <button id="myco-code-action-btn" onclick="_toggleMycoCodeEdit()"
          style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:6px 10px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;">
          <i class="fas fa-pen"></i> 변경
        </button>
      </div>
      <div id="myco-code-msg" style="font-size:10.5px;color:#9ca3af;margin-top:4px;"><i class="fas fa-info-circle"></i> 숫자+영문 대문자 혼합 6~8자리</div>
    </div>

    <!-- 계약현황 바로가기 -->
    <div class="info-card" style="border:1.5px solid #dbeafe;background:#eff6ff;cursor:pointer;" onclick="showPage('ct',document.getElementById('nav-ct'))">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div class="info-card-title" style="margin-bottom:4px;"><i class="fas fa-file-contract" style="color:#3b82f6;"></i> 근로계약 현황</div>
          <div style="font-size:12px;color:#6b7280;">유효 <strong style="color:#2563eb;">${activeContracts.length}건</strong> · 전체 ${allContracts.length}건</div>
        </div>
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas fa-chevron-right" style="color:#fff;font-size:14px;"></i>
        </div>
      </div>
    </div>`;
}

function _toggleMycoCodeEdit(){
  const inputEl = document.getElementById('myco-code-input');
  const btnEl = document.getElementById('myco-code-action-btn');
  if(!inputEl || !btnEl) return;
  if(inputEl.readOnly){
    inputEl.readOnly = false;
    inputEl.style.background = '#fff';
    inputEl.style.borderColor = '#6366f1';
    inputEl.focus();
    btnEl.innerHTML = '<i class="fas fa-check-circle"></i> 중복체크';
    btnEl.onclick = checkMycoCodeDuplicate;
  }
}
function checkMycoCodeDuplicate(){
  const inputEl = document.getElementById('myco-code-input');
  const code = inputEl?.value?.trim();
  const msgEl = document.getElementById('myco-code-msg');
  if(!code){ return; }
  // 형식 검증
  if(code.length < 6 || code.length > 8 || !/[A-Z]/.test(code) || !/[0-9]/.test(code) || !/^[A-Z0-9]+$/.test(code)){
    if(msgEl){ msgEl.style.color = '#dc2626'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 숫자+영문 대문자 혼합 6~8자리'; }
    if(inputEl){ inputEl.style.borderColor = '#dc2626'; inputEl.style.background = '#fef2f2'; inputEl.focus(); }
    return;
  }
  if(inputEl){ inputEl.style.borderColor = ''; inputEl.style.background = ''; }
  // 서버에서 중복 검사
  fetch(`/api/companies/check-code?code=${encodeURIComponent(code)}&exclude=${currentCompany?.id||''}`)
    .then(r => r.json())
    .then(data => {
      if(data.duplicate){
        if(msgEl){ msgEl.style.color = '#dc2626'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 사용할 수 없는 코드입니다. 다른 코드를 입력하세요.'; }
        if(inputEl){ inputEl.style.borderColor = '#dc2626'; inputEl.style.background = '#fef2f2'; }
      } else {
        // 중복 없으면 바로 저장
        fetch(`/api/companies/${currentCompany.id}`, {
          method: 'PATCH',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ access_code: code })
        }).then(r => {
          if(!r.ok) throw new Error('저장 실패');
          if(msgEl){ msgEl.style.color = '#16a34a'; msgEl.innerHTML = '<i class="fas fa-check-circle"></i> 앱접근코드가 변경되었습니다.<br>코드를 잊는 경우 서비스 담당자에게 문의하세요.'; }
          if(inputEl){ inputEl.style.borderColor = '#16a34a'; inputEl.style.background = '#f0fdf4'; inputEl.readOnly = true; }
          const btnEl = document.getElementById('myco-code-action-btn');
          if(btnEl){ btnEl.innerHTML = '<i class="fas fa-pen"></i> 변경'; btnEl.onclick = _toggleMycoCodeEdit; }
          currentCompany.access_code = code;
        }).catch(() => {
          if(msgEl){ msgEl.style.color = '#dc2626'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 저장에 실패했습니다.'; }
        });
      }
    }).catch(() => {
      if(msgEl){ msgEl.style.color = '#dc2626'; msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 확인 중 오류가 발생했습니다.'; }
    });
}
// ══ 기존 접근코드 변경 (하위호환) ══════════════════════════════════════════════
let _ccStep = 1; // 1: 현재코드 확인, 2: 새코드 입력

function openChangeCodeModal(){
  _ccStep = 1;
  // 입력 초기화
  ['cc-verify-input','cc-new-input','cc-confirm-input'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.value=''; el.classList.remove('error'); }
  });
  document.getElementById('cc-verify-err').textContent = '';
  document.getElementById('cc-new-err').textContent    = '';
  document.getElementById('cc-step1').style.display    = '';
  document.getElementById('cc-step2').style.display    = 'none';
  // 현재 코드 표시
  document.getElementById('cc-current-value').textContent = currentCompany.access_code || '—';
  // 버튼 초기화
  const btn = document.getElementById('cc-action-btn');
  btn.textContent = '본인 확인';
  btn.disabled = false;
  // 모달 열기
  document.getElementById('code-change-modal').classList.add('open');
  setTimeout(()=>document.getElementById('cc-verify-input').focus(), 300);
}

function closeChangeCodeModal(){
  document.getElementById('code-change-modal').classList.remove('open');
}

// 액션 버튼 — 현재 단계에 맞는 함수 실행
function ccActionBtn(){
  if(_ccStep === 1) ccVerify();
  else submitChangeCode();
}

// STEP 1: 현재 코드 일치 확인
function ccVerify(){
  const input = document.getElementById('cc-verify-input');
  const err   = document.getElementById('cc-verify-err');
  const val   = input.value.trim();
  if(!val){ _ccSetErr(input, err, '코드를 입력하세요.'); return; }
  if(val !== currentCompany.access_code){
    _ccSetErr(input, err, '현재 코드가 일치하지 않습니다.');
    return;
  }
  // 확인 통과 → STEP 2
  err.textContent = '';
  input.classList.remove('error');
  _ccStep = 2;
  document.getElementById('cc-step2').style.display = '';
  const btn = document.getElementById('cc-action-btn');
  btn.textContent = '코드 변경 완료';
  btn.disabled = true; // 새 코드 입력 전까지 비활성
  setTimeout(()=>document.getElementById('cc-new-input').focus(), 100);
}

// STEP 2 입력 실시간 검사 → 확인 버튼 활성/비활성
// 코드 복잡도 검증: 영문(대 또는 소) + 숫자 + 기호 각 1개 이상, 6자 이상
function _ccValidateStrength(val){
  if(val.length < 6)             return '6자 이상 입력하세요.';
  if(!/[A-Z]/.test(val))         return '영문 대문자를 1자 이상 포함해야 합니다.';
  if(!/[a-z]/.test(val))         return '영문 소문자를 1자 이상 포함해야 합니다.';
  if(!/[0-9]/.test(val))         return '숫자를 1자 이상 포함해야 합니다.';
  if(!/[^A-Za-z0-9]/.test(val)) return '기호(!@#$ 등)를 1자 이상 포함해야 합니다.';
  return '';
}
function ccNewInputCheck(){
  const newVal    = document.getElementById('cc-new-input').value;
  const confVal   = document.getElementById('cc-confirm-input').value;
  const btn       = document.getElementById('cc-action-btn');
  const err       = document.getElementById('cc-new-err');
  const newInput  = document.getElementById('cc-new-input');
  const confInput = document.getElementById('cc-confirm-input');

  if(!newVal){
    err.textContent = '';
    newInput.classList.remove('error');
    confInput.classList.remove('error');
    btn.disabled = true;
    return;
  }

  // 복잡도 검사
  const strengthErr = _ccValidateStrength(newVal);
  if(strengthErr){
    err.textContent = strengthErr;
    newInput.classList.add('error');
    btn.disabled = true;
    return;
  }
  newInput.classList.remove('error');

  // 확인 필드 일치 검사
  if(confVal && newVal !== confVal){
    err.textContent = '두 코드가 일치하지 않습니다.';
    confInput.classList.add('error');
    btn.disabled = true;
  } else {
    err.textContent = '';
    confInput.classList.remove('error');
    // 두 값 모두 조건 충족 시에만 버튼 활성
    btn.disabled = !(newVal.length >= 6 && confVal.length >= 6 && newVal === confVal);
  }
}

// STEP 2: 새 코드 최종 저장
async function submitChangeCode(){
  const newVal  = document.getElementById('cc-new-input').value.trim();
  const confVal = document.getElementById('cc-confirm-input').value.trim();
  const newErr  = document.getElementById('cc-new-err');
  const newInput = document.getElementById('cc-new-input');
  const confInput = document.getElementById('cc-confirm-input');

  const strengthErr = _ccValidateStrength(newVal);
  if(strengthErr){
    _ccSetErr(newInput, newErr, strengthErr); return;
  }
  if(newVal !== confVal){
    _ccSetErr(confInput, newErr, '두 코드가 일치하지 않습니다.'); return;
  }
  if(newVal === currentCompany.access_code){
    _ccSetErr(newInput, newErr, '현재 코드와 동일합니다. 다른 코드를 입력하세요.'); return;
  }

  const btn = document.getElementById('cc-action-btn');
  btn.disabled = true;
  btn.textContent = '확인 중...';

  // ── 다른 고객사 코드 중복 검사 ──
  try{
    const checkRes = await fetch('../tables/companies?limit=200');
    const checkData = await checkRes.json();
    const isDuplicate = (checkData.data||[]).some(c =>
      c.id !== currentCompany.id && c.access_code === newVal
    );
    if(isDuplicate){
      btn.disabled = false;
      btn.textContent = '코드 변경 완료';
      _ccSetErr(newInput, newErr, '보안상 허용되지 않는 문자조합입니다. 다른 코드를 사용해주세요.');
      return;
    }
  } catch(e){
    btn.disabled = false;
    btn.textContent = '코드 변경 완료';
    _ccSetErr(newInput, newErr, '중복 확인 중 오류가 발생했습니다. 다시 시도해 주세요.');
    return;
  }

  btn.textContent = '저장 중...';

  try{
    await fetch(`../tables/companies/${currentCompany.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: newVal })
    });
    // 로컬 데이터 갱신
    currentCompany.access_code = newVal;
    closeChangeCodeModal();
    renderMyco(); // 우리회사 정보 새로고침
    _ccToast('접근코드가 변경되었습니다. 새 코드를 기억해 두세요! 🔑');
  } catch(e){
    btn.disabled = false;
    btn.textContent = '코드 변경 완료';
    _ccSetErr(document.getElementById('cc-new-input'),
              document.getElementById('cc-new-err'),
              '저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
  }
}

function _ccSetErr(inputEl, errEl, msg){
  if(inputEl) inputEl.classList.add('error');
  if(errEl)   errEl.textContent = msg;
}

function _ccToast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'90px', left:'50%', transform:'translateX(-50%)',
    background:'#1a1a2e', color:'#fff', padding:'12px 20px',
    borderRadius:'12px', fontSize:'13px', fontWeight:'600',
    boxShadow:'0 4px 20px rgba(0,0,0,.25)', zIndex:'9999',
    maxWidth:'calc(100% - 40px)', textAlign:'center',
    opacity:'0', transition:'opacity .25s',
  });
  document.body.appendChild(t);
  requestAnimationFrame(()=>{ t.style.opacity='1'; });
  setTimeout(()=>{
    t.style.opacity='0';
    setTimeout(()=>t.remove(), 300);
  }, 3500);
}
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ══ 고객사 인앱 알림함 (company_notices) ══
// ═══════════════════════════════════════════════════════════════════════════════

let _clientNotices = [];          // 현재 고객사의 알림 목록 캐시
let _notifDetailId = null;        // 현재 열려있는 알림 상세 ID

/* ── 날짜 포매터 ── */