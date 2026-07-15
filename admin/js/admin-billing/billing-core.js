// ─── BILLING (시스템 사용료) ───

async function generateMonthlyBilling(){
  const now=new Date();
  const yr=now.getFullYear();
  const mo=now.getMonth()+1;
  
  if(!confirm(`${yr}년 ${mo}월 시스템 사용료를 생성하시겠습니까?\n\n이용중인 고객사의 재직 직원 수 기준으로 자동 계산됩니다.`)) return;
  
  try {
    const newBillings=[];
    
    // 이용중인 고객사만 대상
    const activeCompanies=allCompanies.filter(c=>c.status===COMPANY_STATUS.ACTIVE);
    
    for(const co of activeCompanies){
      // 이미 해당 연월에 청구 데이터가 있는지 확인
      const exists=allBillings.find(b=>b.company_id===co.id&&b.billing_year==yr&&b.billing_month==mo);
      if(exists){

        continue;
      }
      
      // 해당 월에 급여 데이터가 있는 재직 직원 수 계산
      const activeEmps=allEmployees.filter(e=>
        e.company_id===co.id && 
        (e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE)
      );
      
      // 해당 월 급여 데이터가 있는 직원만 카운트
      const payrollEmps=allPayrolls.filter(p=>
        p.company_id===co.id && 
        p.pay_year==yr && 
        p.pay_month==mo
      );
      
      const empCount=payrollEmps.length>0?payrollEmps.length:activeEmps.length;
      
      if(empCount===0){

        continue;
      }
      
      const amountPerEmp=20000;
      const totalAmount=empCount*amountPerEmp;
      
      // 납부마감일: 고객사 급여일
      const dueDay=co.pay_day||25;
      const dueDate=`${yr}-${String(mo).padStart(2,'0')}-${String(dueDay).padStart(2,'0')}`;
      
      // 청구일: 오늘
      const today = new Date();
      const createdDate = today.toISOString().split('T')[0];
      
      const billing={
        company_id:co.id,
        billing_year:yr,
        billing_month:mo,
        employee_count:empCount,
        amount_per_employee:amountPerEmp,
        total_amount:totalAmount,
        payment_status: PAYMENT_STATUS.PENDING,
        payment_date:'',
        partial_paid_amount: 0,
        remaining_amount: totalAmount,
        due_date:dueDate,
        created_date:createdDate,
        note:`${yr}년 ${mo}월 시스템 사용료`
      };
      
      newBillings.push(billing);
    }
    
    if(newBillings.length===0){
      toast('생성할 청구 데이터가 없습니다 (이미 생성되었거나 재직 직원 없음)','error');
      return;
    }
    
    // API 호출하여 생성
    for(const bill of newBillings){
      await api('../tables/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bill)});
    }
    
    await loadBillings();
    renderBillings();
    renderDashboard();
    toast(`✅ ${yr}년 ${mo}월 청구 ${newBillings.length}건 생성 완료`,'success');
    
  } catch(err){
    console.error('[청구 생성 오류]',err);
    toast('청구 생성 실패: '+err.message,'error');
  }
}

// 고객사별 청구 생성
async function generateBillingForCompany(companyId, companyName){
  const now=new Date();
  const yr=now.getFullYear();
  const mo=now.getMonth()+1;
  
  const co=allCompanies.find(c=>c.id===companyId);
  if(!co){
    toast('고객사 정보를 찾을 수 없습니다','error');
    return;
  }
  
  if(co.status!==COMPANY_STATUS.ACTIVE){
    toast('이용중인 고객사만 청구를 생성할 수 있습니다','error');
    return;
  }
  
  const coName=companyName||co.company_name;
  
  if(!confirm(`${coName}\n${yr}년 ${mo}월 시스템 사용료를 생성하시겠습니까?`)) return;
  
  try {
    // 이미 해당 연월에 청구 데이터가 있는지 확인
    const exists=allBillings.find(b=>b.company_id===companyId&&b.billing_year==yr&&b.billing_month==mo);
    if(exists){
      toast('이미 해당 월에 청구가 생성되어 있습니다','error');
      return;
    }
    
    // 해당 월에 급여 데이터가 있는 재직 직원 수 계산
    const activeEmps=allEmployees.filter(e=>
      e.company_id===companyId && 
      (e.status===EMP_STATUS.ACTIVE||e.status===EMP_STATUS.ACTIVE)
    );
    
    // 해당 월 급여 데이터가 있는 직원만 카운트
    const payrollEmps=allPayrolls.filter(p=>
      p.company_id===companyId && 
      p.pay_year==yr && 
      p.pay_month==mo
    );
    
    const empCount=payrollEmps.length>0?payrollEmps.length:activeEmps.length;
    
    if(empCount===0){
      toast('재직 직원이 없어 청구를 생성할 수 없습니다','error');
      return;
    }
    
    const amountPerEmp=20000;
    const totalAmount=empCount*amountPerEmp;
    
    // 납부마감일: 고객사 급여일
    const dueDay=co.pay_day||25;
    const dueDate=`${yr}-${String(mo).padStart(2,'0')}-${String(dueDay).padStart(2,'0')}`;
    
    // 청구일: 오늘
    const today = new Date();
    const createdDate = today.toISOString().split('T')[0];
    
    const billing={
      company_id:companyId,
      billing_year:yr,
      billing_month:mo,
      employee_count:empCount,
      amount_per_employee:amountPerEmp,
      total_amount:totalAmount,
      payment_status: PAYMENT_STATUS.PENDING,
      payment_date:'',
      partial_paid_amount: 0,
      remaining_amount: totalAmount,
      due_date:dueDate,
      created_date:createdDate,
      note:`${yr}년 ${mo}월 시스템 사용료`
    };
    
    // API 호출하여 생성
    await api('../tables/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(billing)});
    
    await loadBillings();
    renderBillings();
    renderDashboard();
    toast(`✅ ${coName} ${yr}년 ${mo}월 청구 생성 완료 (${empCount}명 × ${Math.round(amountPerEmp).toLocaleString('ko-KR')}원 = ${Math.round(totalAmount).toLocaleString('ko-KR')}원)`,'success');
    
  } catch(err){
    console.error('[고객사별 청구 생성 오류]',err);
    toast('청구 생성 실패: '+err.message,'error');
  }
}

// 고객사별 누적 미납금 계산 함수
function calculateTotalUnpaid(companyId, currentBillingYear, currentBillingMonth){
  // 해당 청구보다 이전 월 중 마감일이 지났는데도 미납된 금액만 합산
  const todayStr = new Date().toISOString().slice(0, 10);
  const previousBillings = allBillings.filter(b => {
    if(b.company_id !== companyId) return false;
    // 현재 청구보다 이전 월인지 확인
    if(b.billing_year < currentBillingYear) return true;
    if(b.billing_year === currentBillingYear && b.billing_month < currentBillingMonth) return true;
    return false;
  });

  // 마감일이 지났고 잔액이 남아 있는 건만 미납금으로 집계
  const previousUnpaid = previousBillings.reduce((sum, b) => {
    if(b.payment_status ===PAYMENT_STATUS.PAID) return sum;
    if(!b.due_date || b.due_date >= todayStr) return sum; // 마감일 미경과 → 미납금 아님
    const paidAmount = b.partial_paid_amount || 0;
    const remaining = (b.total_amount || 0) - paidAmount;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  return previousUnpaid;
}

// 사용료 관리 상단 통계 업데이트
function updateBillingStats(){
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  
  // 이용 중 고객사 수
  const activeCompanies = allCompanies.filter(c => c.status===COMPANY_STATUS.ACTIVE).length;
  
  // 등록 직원 수 (재직 중인 직원만)
  const activeEmployees = allEmployees.filter(e => e.status===EMP_STATUS.ACTIVE || e.status===EMP_STATUS.ACTIVE).length;
  
  // [사용료 숨김] #page-billing 요소가 주석처리되어 null일 수 있으므로 optional chaining 사용
  const bdEl = document.getElementById('billing-date');
  const acEl = document.getElementById('active-companies-count');
  const teEl = document.getElementById('total-employees-count');
  if(bdEl) bdEl.textContent = dateStr;
  if(acEl) acEl.textContent = activeCompanies;
  if(teEl) teEl.textContent = activeEmployees;
}

function renderBillings(){
  const tbody=document.getElementById('bill-tbody');
  const summary=document.getElementById('bill-summary');
  // [사용료 숨김] #page-billing DOM이 주석처리된 경우 early return
  if(!tbody || !summary) return;
  
  // 현재 날짜
  const today=new Date();
  const todayStr=today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // 필터에 따라 일괄 버튼 활성/비활성
  const filterNow = document.querySelector('input[name="billing-filter"]:checked')?.value || 'all';
  // '선택 일괄 청구': 전체·청구대상 필터에서만 활성
  const billingAllowed = filterNow === 'all' || filterNow === 'virtual';
  ['btn-bulk-create-top','btn-bulk-create-bottom'].forEach(id => {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.disabled           = !billingAllowed;
    btn.style.opacity      = billingAllowed ? '1' : '0.4';
    btn.style.cursor       = billingAllowed ? 'pointer' : 'not-allowed';
    btn.title = billingAllowed
      ? '선택한 청구대상 일괄 청구 생성'
      : '이미 청구된 고객 목록입니다 (전체 이용고객 또는 청구대상고객 필터에서만 사용 가능)';
  });
  // '선택 일괄 완납': 청구대상 필터는 항상 비활성
  // 납부고객(paid) 필터는 일부납이 1건이라도 있으면 활성, 모두 완납이면 비활성
  let paymentAllowed;
  if(filterNow === 'virtual'){
    paymentAllowed = false;
  } else if(filterNow === 'paid'){
    // 납부고객 필터: 표시 목록 중 일부납 건 존재 여부로 판단
    const hasPartial = allBillings.some(b => {
      const paid = b.partial_paid_amount || 0;
      const rem  = (b.total_amount || 0) - paid;
      return rem > 0 && paid > 0 && b.payment_status !==PAYMENT_STATUS.PAID;
    });
    paymentAllowed = hasPartial;
  } else {
    paymentAllowed = true;
  }
  ['btn-bulk-payment-top','btn-bulk-payment-bottom'].forEach(id => {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.disabled           = !paymentAllowed;
    btn.style.opacity      = paymentAllowed ? '1' : '0.4';
    btn.style.cursor       = paymentAllowed ? 'pointer' : 'not-allowed';
    btn.title = paymentAllowed
      ? '선택한 항목 일괄 완납 처리'
      : filterNow === 'virtual'
        ? '청구 생성 전 항목입니다 (완납 처리 불가)'
        : '모두 완납된 고객 목록입니다';
  });

  // 상단 통계 업데이트
  updateBillingStats();
  
  // 1. 기존 청구 데이터 (필터 제거)
  let filtered = allBillings.slice();
  
  // 2. 청구 데이터가 없는 '이용중' 고객사 추가 (이번 달만)
  const showUnbilledCompanies = true;
  
  if(showUnbilledCompanies){
    const activeCompanies = allCompanies.filter(c => c.status===COMPANY_STATUS.ACTIVE);
    
    activeCompanies.forEach(co => {
      // 이번 달 청구가 있는지 확인
      const hasBilling = allBillings.some(b => 
        b.company_id === co.id && 
        b.billing_year === currentYear && 
        b.billing_month === currentMonth
      );
      
      // 청구가 없으면 가상 청구 데이터 생성
      if(!hasBilling){
        // 직원 수 계산
        const activeEmps = allEmployees.filter(e => 
          e.company_id === co.id && 
          (e.status===EMP_STATUS.ACTIVE || e.status===EMP_STATUS.ACTIVE)
        );
        
        const payrollEmps = allPayrolls.filter(p => 
          p.company_id === co.id && 
          p.pay_year == currentYear && 
          p.pay_month == currentMonth
        );
        
        const empCount = payrollEmps.length > 0 ? payrollEmps.length : activeEmps.length;
        
        if(empCount > 0){
          const amountPerEmp = 20000;
          const totalAmount = empCount * amountPerEmp;
          const dueDay = co.pay_day || 25;
          const dueDate = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(dueDay).padStart(2,'0')}`;
          
          // 가상 청구 데이터 (청구 대상)
          filtered.push({
            id: null, // 청구 데이터 없음 표시
            company_id: co.id,
            billing_year: currentYear,
            billing_month: currentMonth,
            employee_count: empCount,
            amount_per_employee: amountPerEmp,
            total_amount: totalAmount,
            payment_status: '청구대상',
            payment_date: '',
            partial_paid_amount: 0,
            remaining_amount: totalAmount,
            due_date: dueDate,
            created_date: '',
            note: '청구 생성 전',
            isVirtual: true // 가상 데이터 표시
          });
        }
      }
    });
  }
  
  // 정렬: 최신순 (연도 desc, 월 desc), 가상 데이터는 상단에
  filtered.sort((a,b)=>{
    if(a.isVirtual && !b.isVirtual) return -1;
    if(!a.isVirtual && b.isVirtual) return 1;
    if(b.billing_year!==a.billing_year) return b.billing_year-a.billing_year;
    return b.billing_month-a.billing_month;
  });
  
  // 3. 라디오 버튼 필터 적용
  const filterType = document.querySelector('input[name="billing-filter"]:checked')?.value || 'all';
  
  if(filterType !== 'all'){
    filtered = filtered.filter(b => {
      // 가상 데이터 (청구대상)
      if(b.isVirtual){
        return filterType === 'virtual';
      }
      
      // 실제 청구 데이터
      const paidAmount = b.partial_paid_amount || 0;
      const currentRemaining = (b.total_amount || 0) - paidAmount;
      
      // 상태 계산
      let actualStatus = PAYMENT_STATUS.PENDING;
      if(b.payment_status ===PAYMENT_STATUS.PAID || (b.payment_date && currentRemaining <= 0)){
        actualStatus = PAYMENT_STATUS.PAID;
      }else if(paidAmount > 0 && currentRemaining > 0){
        actualStatus = PAYMENT_STATUS.PARTIAL;
      }else{
        if(b.due_date && b.due_date < todayStr){
          actualStatus = PAYMENT_STATUS.UNPAID;
        }
      }
      
      // 이월 미납금 확인 (마감일 경과 기준)
      const prevUnpaid = calculateTotalUnpaid(b.company_id, b.billing_year, b.billing_month);

      // 필터 적용
      if(filterType === 'paid'){
        // 납부고객: 완납 또는 일부납 (이월 미납금 없는 완납 + 일부납 모두 포함)
        return (actualStatus ===PAYMENT_STATUS.PAID && prevUnpaid === 0) || actualStatus ===PAYMENT_STATUS.PARTIAL;
      }else if(filterType === 'unpaid'){
        // 미납현황: 납부기한 경과 불량고객 — 미납·일부납만 포함 (납부대기 제외)
        return actualStatus ===PAYMENT_STATUS.UNPAID || actualStatus ===PAYMENT_STATUS.PARTIAL;
      }else if(filterType === 'pending'){
        // 납부대기현황: 납부대기 상태인 건
        return actualStatus ===PAYMENT_STATUS.PENDING;
      }
      
      return false;
    });
  }
  
  // 4. 고객사명 검색 필터 적용
  const searchQuery = document.getElementById('billing-search')?.value.toLowerCase().trim() || '';
  
  if(searchQuery){
    filtered = filtered.filter(b => {
      const co = allCompanies.find(c => c.id === b.company_id);
      const coName = co ? co.company_name.toLowerCase() : '';
      return coName.includes(searchQuery);
    });
  }
  
  if(filtered.length===0){
    tbody.innerHTML='<tr><td colspan="12" class="empty-state"><i class="fas fa-inbox"></i><p>청구 내역이 없습니다</p></td></tr>';
    summary.innerHTML='';
    return;
  }

  // ── 고객사별 1건만 추출 ──
  // 이번 달 청구가 없어 가상 행이 생성된 고객사는 가상 행만 표시
  // 실제 청구가 있는 고객사는 가장 최근 월 실제 청구 1건만 표시
  const virtualSet = new Set(filtered.filter(b => b.isVirtual).map(b => b.company_id));
  const latestMap = new Map(); // company_id → 최신 청구 객체

  filtered.forEach(b => {
    if(b.isVirtual){
      latestMap.set('virtual-' + b.company_id, b);
      return;
    }
    // 가상 행이 있는 고객사(이번 달 미청구)의 실제 청구 행은 건너뜀
    if(virtualSet.has(b.company_id)) return;

    const prev = latestMap.get(b.company_id);
    if(!prev){
      latestMap.set(b.company_id, b);
    } else {
      const bYM = Number(b.billing_year)    * 100 + Number(b.billing_month);
      const pYM = Number(prev.billing_year) * 100 + Number(prev.billing_month);
      if(bYM > pYM) latestMap.set(b.company_id, b);
    }
  });
  const displayList = Array.from(latestMap.values());

  // 통계용 카운트
  let waitingList=[];
  let unpaidList=[];
  let paidList=[];

  tbody.innerHTML=displayList.map(b=>{
    const co=allCompanies.find(c=>c.id===b.company_id);
    const coName=co?co.company_name:'-';

    // 가상 청구 데이터 (청구 대상) 처리
    if(b.isVirtual){
      // 이전 월 누적 미납금 계산 (마감일 경과 기준)
      const previousUnpaid = calculateTotalUnpaid(b.company_id, b.billing_year, b.billing_month);
      const totalBill = b.total_amount + previousUnpaid; // 이번 달 청구 + 이월 미납금
      const showUnpaid = previousUnpaid > 0;

      // 마감일: 고객사 급여일
      const dueDay = co ? (co.pay_day || 25) : 25;
      const dueDate = `${b.billing_year}-${String(b.billing_month).padStart(2,'0')}-${String(dueDay).padStart(2,'0')}`;

      // 청구대상 식별자 (고유 ID 생성)
      const virtualId = `virtual-${b.company_id}-${b.billing_year}-${b.billing_month}`;

      return `<tr style="background:#fffbeb;">
        <td style="text-align:center;">
          <input type="checkbox" class="bill-check" data-type="virtual" data-virtual-id="${virtualId}" data-company-id="${b.company_id}" data-company-name="${coName}" style="cursor:pointer;" />
        </td>
        <td>
          <span style="color:#1a73e8;cursor:pointer;text-decoration:underline;"
                data-company-id="${b.company_id}"
                data-company-name="${coName}"
                onclick="openPaymentHistoryModal(this.dataset.companyId, this.dataset.companyName)"
                title="납부이력 보기">
            ${coName}
          </span>
        </td>
        <td style="text-align:center;">${b.employee_count}명</td>
        <td style="font-weight:600;">${b.billing_year}-${String(b.billing_month).padStart(2,'0')}</td>
        <td style="font-size:11.5px;color:#888;">-</td>
        <td class="amount-green" style="font-weight:700;">${won(b.total_amount)}</td>
        <td style="font-size:11.5px;">${dueDate}</td>
        <td class="amount-blue" style="font-weight:600;">-</td>
        <td style="font-size:11.5px;">-</td>
        <td class="amount-red" style="font-weight:600;">${showUnpaid ? won(previousUnpaid) : '-'}</td>
        <td>-</td>
        <td>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="btn btn-primary btn-sm"
                    onclick="generateBillingForCompany('${b.company_id}', '${coName}')"
                    title="청구 생성"
                    style="animation:pulse 2s infinite;">
              <i class="fas fa-plus"></i> 청구 생성
            </button>
            ${showUnpaid ? `
            <button class="btn btn-success btn-sm" onclick="confirmFullPaymentVirtual('${b.company_id}','${coName}',${b.billing_year},${b.billing_month})" title="완납 확인">
              <i class="fas fa-check-double"></i> 완납
            </button>
            <button class="btn btn-warning btn-sm" onclick="openPartialPaymentModalVirtual('${b.company_id}','${coName}',${b.billing_year},${b.billing_month},${totalBill})" title="일부납 처리">
              <i class="fas fa-coins"></i> 일부납
            </button>` : ''}
          </div>
        </td>
      </tr>`;
    }

    // 실제 청구 데이터 처리
    let actualStatus=PAYMENT_STATUS.PENDING;
    let statusBadge=`<span class="badge badge-blue">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PENDING]}</span>`;
    let showButton=true;

    const paidAmount = b.partial_paid_amount || 0;
    const currentRemaining = (b.total_amount || 0) - paidAmount;

    // 이전 월 누적 미납금 (마감일 경과 건만) + 현재 청구 잔액 (마감일 경과 시만)
    const previousUnpaid = calculateTotalUnpaid(b.company_id, b.billing_year, b.billing_month);
    const currentOverdue = (currentRemaining > 0 && b.due_date && b.due_date < todayStr) ? currentRemaining : 0;
    const totalUnpaid = previousUnpaid + currentOverdue;

    // 이번 달 완납 + 이월 미납금 여부로 상태 결정
    if(b.payment_status===PAYMENT_STATUS.PAID || (b.payment_date && currentRemaining<=0)){
      if(previousUnpaid > 0){
        actualStatus=PAYMENT_STATUS.PARTIAL;
        statusBadge=`<span class="badge badge-yellow">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PARTIAL]}</span>`;
        unpaidList.push(b);
      } else {
        actualStatus=PAYMENT_STATUS.PAID;
        statusBadge=`<span class="badge badge-green">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PAID]}</span>`;
        showButton=false;
        paidList.push(b);
      }
    }else if(paidAmount>0 && currentRemaining>0){
      actualStatus=PAYMENT_STATUS.PARTIAL;
      statusBadge=`<span class="badge badge-yellow">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PARTIAL]}</span>`;
      unpaidList.push(b);
    }else{
      if(b.due_date&&b.due_date<todayStr){
        actualStatus=PAYMENT_STATUS.UNPAID;
        statusBadge=`<span class="badge badge-red">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.UNPAID]}</span>`;
        unpaidList.push(b);
      }else{
        waitingList.push(b);
      }
    }

    const payDate=b.payment_date||'-';
    const createdDate = b.created_date || `${b.billing_year}-${String(b.billing_month).padStart(2,'0')}-01`;
    // 일부납 모달에 넘길 총 청구금액 = 이번 달 청구 잔액 + 이월 미납금
    const modalTotalAmount = currentRemaining + previousUnpaid;

    return `<tr>
      <td style="text-align:center;">
        ${(filterType === 'paid' && actualStatus ===PAYMENT_STATUS.PAID)
          ? `<input type="checkbox" class="bill-check" data-type="billing" data-billing-id="${b.id}" data-status="${actualStatus}" disabled style="cursor:not-allowed;opacity:0.3;" />`
          : `<input type="checkbox" class="bill-check" data-type="billing" data-billing-id="${b.id}" data-status="${actualStatus}" style="cursor:pointer;" />`
        }
      </td>
      <td>
        <span style="color:#1a73e8;cursor:pointer;text-decoration:underline;"
              data-company-id="${b.company_id}"
              data-company-name="${coName}"
              onclick="openPaymentHistoryModal(this.dataset.companyId, this.dataset.companyName)"
              title="납부이력 보기">
          ${coName}
        </span>
      </td>
      <td style="text-align:center;">${b.employee_count}명</td>
      <td style="font-weight:600;">${b.billing_year}-${String(b.billing_month).padStart(2,'0')}</td>
      <td style="font-size:11.5px;color:#888;">${createdDate}</td>
      <td class="amount-green" style="font-weight:700;">${won(b.total_amount)}</td>
      <td style="font-size:11.5px;">${b.due_date}</td>
      <td class="amount-blue" style="font-weight:600;">${paidAmount>0?won(paidAmount):'-'}</td>
      <td style="font-size:11.5px;">${payDate}</td>
      <td class="amount-red" style="font-weight:700;">${totalUnpaid>0?won(totalUnpaid):'-'}</td>
      <td>${statusBadge}</td>
      <td>
        ${showButton?`
          <div style="display:flex;gap:4px;">
            <button class="btn btn-success btn-sm" onclick="confirmFullPayment('${b.id}')" title="완납확인"><i class="fas fa-check-double"></i> 완납</button>
            <button class="btn btn-warning btn-sm" onclick="openPartialPaymentModal('${b.id}',${modalTotalAmount})" title="일부납 처리"><i class="fas fa-coins"></i> 일부납</button>
          </div>
        `:`<span style="color:#888;font-size:11.5px;">-</span>`}
      </td>
    </tr>`;
  }).join('');
  
  // 요약 정보
  const waitingTotal=waitingList.reduce((sum,b)=>sum+(b.total_amount||0),0);
  const unpaidTotal=unpaidList.reduce((sum,b)=>sum+(b.total_amount||0),0);
  const paidTotal=paidList.reduce((sum,b)=>sum+(b.total_amount||0),0);
  
  summary.innerHTML = filterType === 'all' ? `
    <div style="display:flex;gap:20px;align-items:center;">
      <div style="flex:1;">
        <div style="font-size:11.5px;color:#888;margin-bottom:4px;">납부대기 건수</div>
        <div style="font-size:22px;font-weight:700;color:#3b82f6;">${waitingList.length}건</div>
        <div style="font-size:11.5px;color:#888;margin-top:2px;">${Math.round(waitingTotal).toLocaleString('ko-KR')}원</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:11.5px;color:#888;margin-bottom:4px;">미납 건수</div>
        <div style="font-size:22px;font-weight:700;color:#e94560;">${unpaidList.length}건</div>
        <div style="font-size:11.5px;color:#888;margin-top:2px;">${Math.round(unpaidTotal).toLocaleString('ko-KR')}원</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:11.5px;color:#888;margin-bottom:4px;">완납 건수</div>
        <div style="font-size:22px;font-weight:700;color:#10b981;">${paidList.length}건</div>
        <div style="font-size:11.5px;color:#888;margin-top:2px;">${Math.round(paidTotal).toLocaleString('ko-KR')}원</div>
      </div>
    </div>
  ` : '';
  
  // 대시보드 사용료 요약 카드 갱신
  renderDashBillingCards();
  // 사용료 매출 추이 차트 갱신
  renderBillingTrendChart();
}

// 완납 확인
async function confirmFullPayment(billingId){
  const bill=allBillings.find(b=>b.id===billingId);
  if(!bill) return;
  
  const co=allCompanies.find(c=>c.id===bill.company_id);
  const coName=co?co.company_name:'고객사';
  
  if(!confirm(`${coName} ${bill.billing_year}년 ${bill.billing_month}월 사용료\n${Math.round(bill.total_amount).toLocaleString('ko-KR')}원을 완납 확인하시겠습니까?`)) return;
  
  try {
    const today=new Date().toISOString().split('T')[0];
    const updated={
      ...bill,
      payment_status: PAYMENT_STATUS.PAID,
      payment_date:today,
      partial_paid_amount: bill.total_amount,
      remaining_amount: 0
    };
    
    await api(`../tables/billing/${billingId}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(updated)
    });
    
    await loadBillings();
    renderBillings();
    renderDashboard();
    toast('✅ 완납 확인 완료','success');
    
  } catch(err){
    console.error('[완납 확인 오류]',err);
    toast('완납 확인 실패: '+err.message,'error');
  }
}

// 전체 체크박스 토글
function toggleAllBillingChecks(){
  const checkAll = document.getElementById('bill-check-all');
  const checkboxes = document.querySelectorAll('.bill-check');
  checkboxes.forEach(cb => cb.checked = checkAll.checked);
}

// 선택 일괄 완납
async function bulkPayment(){
  const checkboxes = document.querySelectorAll('.bill-check:checked');
  
  if(checkboxes.length === 0){
    toast('완납 처리할 항목을 선택해주세요','warning');
    return;
  }
  
  // 청구 데이터만 필터링 (가상 데이터 제외)
  const billingIds = Array.from(checkboxes)
    .filter(cb => cb.dataset.type === 'billing')
    .map(cb => cb.dataset.billingId);
  
  if(billingIds.length === 0){
    toast('완납 처리 가능한 청구 데이터가 없습니다','warning');
    return;
  }
  
  if(!confirm(`선택한 ${billingIds.length}건을 완납 처리하시겠습니까?`)) return;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    let successCount = 0;
    
    for(const billingId of billingIds){
      const bill = allBillings.find(b => b.id === billingId);
      if(!bill) continue;
      
      // 이미 완납인 경우 스킵
      if(bill.payment_status ===PAYMENT_STATUS.PAID) continue;
      
      const updated = {
        ...bill,
        payment_status: PAYMENT_STATUS.PAID,
        payment_date: today,
        partial_paid_amount: bill.total_amount,
        remaining_amount: 0
      };
      
      await api(`../tables/billing/${billingId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(updated)
      });
      
      successCount++;
    }
    
    await loadBillings();
    renderBillings();
    renderDashboard();
    
    // 전체 체크 해제
    document.getElementById('bill-check-all').checked = false;
    
    toast(`✅ ${successCount}건 완납 처리 완료`, 'success');
    
  } catch(err){
    console.error('[일괄 완납 오류]', err);
    toast('일괄 완납 처리 실패: ' + err.message, 'error');
  }
}

// 선택 일괄 청구 생성
async function bulkCreateBilling(){
  const checkboxes = document.querySelectorAll('.bill-check:checked');
  
  if(checkboxes.length === 0){
    toast('청구 생성할 항목을 선택해주세요','warning');
    return;
  }
  
  // 가상 데이터만 필터링
  const virtualItems = Array.from(checkboxes)
    .filter(cb => cb.dataset.type === 'virtual')
    .map(cb => ({
      companyId: cb.dataset.companyId,
      companyName: cb.dataset.companyName
    }));
  
  if(virtualItems.length === 0){
    toast('청구 생성 가능한 청구대상이 없습니다','warning');
    return;
  }
  
  if(!confirm(`선택한 ${virtualItems.length}개 고객사의 청구를 생성하시겠습니까?`)) return;
  
  try {
    let successCount = 0;
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    
    for(const item of virtualItems){
      const co = allCompanies.find(c => c.id === item.companyId);
      if(!co || co.status!==COMPANY_STATUS.ACTIVE) continue;
      
      // 이미 청구가 있는지 확인
      const exists = allBillings.find(b => 
        b.company_id === item.companyId && 
        b.billing_year == yr && 
        b.billing_month == mo
      );
      if(exists) continue;
      
      // 직원 수 계산
      const activeEmps = allEmployees.filter(e => 
        e.company_id === item.companyId && 
        (e.status===EMP_STATUS.ACTIVE || e.status===EMP_STATUS.ACTIVE)
      );
      
      const payrollEmps = allPayrolls.filter(p => 
        p.company_id === item.companyId && 
        p.pay_year == yr && 
        p.pay_month == mo
      );
      
      const empCount = payrollEmps.length > 0 ? payrollEmps.length : activeEmps.length;
      if(empCount === 0) continue;
      
      const amountPerEmp = 20000;
      const totalAmount = empCount * amountPerEmp;
      const dueDay = co.pay_day || 25;
      const dueDate = `${yr}-${String(mo).padStart(2,'0')}-${String(dueDay).padStart(2,'0')}`;
      const today = new Date();
      const createdDate = today.toISOString().split('T')[0];
      
      const billing = {
        company_id: item.companyId,
        billing_year: yr,
        billing_month: mo,
        employee_count: empCount,
        amount_per_employee: amountPerEmp,
        total_amount: totalAmount,
        payment_status: PAYMENT_STATUS.PENDING,
        payment_date: '',
        partial_paid_amount: 0,
        remaining_amount: totalAmount,
        due_date: dueDate,
        created_date: createdDate,
        note: `${yr}년 ${mo}월 시스템 사용료`
      };
      
      await api('../tables/billing', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(billing)
      });
      
      successCount++;
    }
    
    await loadBillings();
    renderBillings();
    renderDashboard();
    
    // 전체 체크 해제
    document.getElementById('bill-check-all').checked = false;
    
    toast(`✅ ${successCount}건 청구 생성 완료`, 'success');
    
  } catch(err){
    console.error('[일괄 청구 생성 오류]', err);
    toast('일괄 청구 생성 실패: ' + err.message, 'error');
  }
}

// 일부납 모달 열기
let currentBillingId = null;

// 납부이력 모달 열기
function openPaymentHistoryModal(companyId, companyName){
  // 고객사명 표시
  document.getElementById('ph-company-name').textContent = companyName;
  
  // 해당 고객사의 모든 청구 데이터 가져오기
  const companyBillings = allBillings
    .filter(b => b.company_id === companyId)
    .sort((a, b) => {
      if(b.billing_year !== a.billing_year) return b.billing_year - a.billing_year;
      return b.billing_month - a.billing_month;
    });
  
  // 요약 통계 계산
  const totalCount = companyBillings.length;
  const totalAmount = companyBillings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const paidAmount = companyBillings.reduce((sum, b) => sum + (b.partial_paid_amount || 0), 0);
  const unpaidAmount = totalAmount - paidAmount;
  
  // 요약 카드 업데이트
  document.getElementById('ph-total-count').textContent = `${totalCount}건`;
  document.getElementById('ph-total-amount').textContent = won(totalAmount);
  document.getElementById('ph-paid-amount').textContent = won(paidAmount);
  document.getElementById('ph-unpaid-amount').textContent = won(unpaidAmount);
  
  // 테이블 렌더링
  const tbody = document.getElementById('ph-tbody');
  
  if(companyBillings.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:40px;color:#888;">
          <i class="fas fa-inbox" style="font-size:32px;margin-bottom:10px;display:block;"></i>
          납부이력이 없습니다
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = companyBillings.map(b => {
      const paidAmt = b.partial_paid_amount || 0;
      const remaining = (b.total_amount || 0) - paidAmt;
      const createdDate = b.created_date || `${b.billing_year}-${String(b.billing_month).padStart(2,'0')}-01`;
      const payDate = b.payment_date || '-';
      
      // 상태 판단
      let status = PAYMENT_STATUS.PENDING;
      let statusBadge = `<span class="badge badge-blue">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PENDING]}</span>`;
      
      if(b.payment_status ===PAYMENT_STATUS.PAID || (b.payment_date && remaining <= 0)){
        status = PAYMENT_STATUS.PAID;
        statusBadge = `<span class="badge badge-green">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PAID]}</span>`;
      } else if(paidAmt > 0 && remaining > 0){
        status = PAYMENT_STATUS.PARTIAL;
        statusBadge = `<span class="badge badge-yellow">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.PARTIAL]}</span>`;
      } else if(b.due_date && b.due_date < new Date().toISOString().split('T')[0]){
        status = PAYMENT_STATUS.UNPAID;
        statusBadge = `<span class="badge badge-red">${PAYMENT_STATUS_LABEL[PAYMENT_STATUS.UNPAID]}</span>`;
      }
      
      return `
        <tr>
          <td style="font-weight:600;">${b.billing_year}-${String(b.billing_month).padStart(2,'0')}</td>
          <td style="font-size:11.5px;color:#888;">${createdDate}</td>
          <td class="amount-green" style="font-weight:700;">${won(b.total_amount)}</td>
          <td class="amount-blue" style="font-weight:600;">${paidAmt > 0 ? won(paidAmt) : '-'}</td>
          <td class="amount-red" style="font-weight:600;">${remaining > 0 ? won(remaining) : '-'}</td>
          <td style="font-size:11.5px;">${payDate}</td>
          <td style="font-size:11.5px;">${b.due_date}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }
  
  // 모달 열기
  document.getElementById('payment-history-modal').classList.add('open');
}

// 일부납 모달 열기
// totalAmountOverride: 이월 미납금 포함 총액을 외부에서 주입할 때 사용
function openPartialPaymentModal(billingId, totalAmountOverride){
  const bill=allBillings.find(b=>b.id===billingId);
  if(!bill) return;

  currentBillingId = billingId;

  const co=allCompanies.find(c=>c.id===bill.company_id);
  const coName=co?co.company_name:'고객사';

  // 총 청구금액: 이월 미납금이 있으면 합산 금액, 없으면 이번 달 청구금액
  const displayTotal = (totalAmountOverride && totalAmountOverride > 0)
    ? totalAmountOverride
    : bill.total_amount;

  // 정보 표시
  document.getElementById('pp-company-name').textContent = coName;
  document.getElementById('pp-billing-period').textContent = `${bill.billing_year}년 ${bill.billing_month}월`;
  document.getElementById('pp-total-amount').textContent = won(displayTotal);
  // 모달 내부 계산에 사용할 값 저장
  document.getElementById('pp-total-amount').dataset.value = displayTotal;

  const alreadyPaid = bill.partial_paid_amount || 0;
  document.getElementById('pp-already-paid').textContent = alreadyPaid > 0 ? won(alreadyPaid) : '0원';

  // 입력 필드 초기화
  document.getElementById('pp-payment-amount').value = '';
  document.getElementById('pp-remaining-display').style.display = 'none';

  // 모달 열기
  document.getElementById('partial-payment-modal').classList.add('open');
}

// 가상 청구(청구 생성 전)에서 이월 미납금만 있을 때 일부납 모달 열기
function openPartialPaymentModalVirtual(companyId, coName, billingYear, billingMonth, totalAmount){
  currentBillingId = null; // 실제 billingId 없음 — confirmPartialPayment에서 처리
  // 가상용 임시 데이터 저장
  window._virtualPartialPayment = { companyId, coName, billingYear, billingMonth, totalAmount };

  document.getElementById('pp-company-name').textContent = coName;
  document.getElementById('pp-billing-period').textContent = `${billingYear}년 ${billingMonth}월`;
  document.getElementById('pp-total-amount').textContent = won(totalAmount);
  document.getElementById('pp-total-amount').dataset.value = totalAmount;
  document.getElementById('pp-already-paid').textContent = '0원';

  document.getElementById('pp-payment-amount').value = '';
  document.getElementById('pp-remaining-display').style.display = 'none';
  document.getElementById('partial-payment-modal').classList.add('open');
}

// 잔여 미납금 자동 계산
function calculateRemaining(){
  // 표시된 총 청구금액(이월 미납금 포함 가능)을 기준으로 계산
  const totalAmountEl = document.getElementById('pp-total-amount');
  const totalAmount = parseFloat(totalAmountEl?.dataset.value) || 0;

  const bill = currentBillingId ? allBillings.find(b=>b.id===currentBillingId) : null;
  const alreadyPaid = bill ? (bill.partial_paid_amount || 0) : 0;
  const paymentInput = parseFloat((document.getElementById('pp-payment-amount').value||'').replace(/,/g,'')) || 0;

  if(paymentInput <= 0){
    document.getElementById('pp-remaining-display').style.display = 'none';
    return;
  }

  const totalPaid = alreadyPaid + paymentInput;
  const remaining = Math.max(0, totalAmount - totalPaid);

  document.getElementById('pp-remaining-amount').textContent = won(remaining);
  document.getElementById('pp-remaining-display').style.display = 'block';
}

// 일부납 확인
async function confirmPartialPayment(){
  const bill=allBillings.find(b=>b.id===currentBillingId);
  if(!bill) return;
  
  const paymentAmount = parseFloat((document.getElementById('pp-payment-amount').value||'').replace(/,/g,'')) || 0;
  
  if(paymentAmount <= 0){
    toast('납부 금액을 입력해주세요','error');
    return;
  }
  
  const co=allCompanies.find(c=>c.id===bill.company_id);
  const coName=co?co.company_name:'고객사';
  
  const alreadyPaid = bill.partial_paid_amount || 0;
  const totalPaid = alreadyPaid + paymentAmount;
  const remaining = Math.max(0, bill.total_amount - totalPaid);
  
  const isFullyPaid = remaining <= 0;
  
  const confirmMsg = isFullyPaid 
    ? `${coName} ${bill.billing_year}년 ${bill.billing_month}월\n납부 금액: ${Math.round(paymentAmount).toLocaleString('ko-KR')}원\n\n이번 납부로 완납 처리됩니다.\n계속하시겠습니까?`
    : `${coName} ${bill.billing_year}년 ${bill.billing_month}월\n납부 금액: ${Math.round(paymentAmount).toLocaleString('ko-KR')}원\n잔여 미납금: ${Math.round(remaining).toLocaleString('ko-KR')}원\n\n일부납으로 처리하시겠습니까?`;
  
  if(!confirm(confirmMsg)) return;
  
  try {
    const today=new Date().toISOString().split('T')[0];
    
    const updated={
      ...bill,
      payment_status: isFullyPaid ? '완납' : '일부납',
      payment_date: isFullyPaid ? today : bill.payment_date,
      partial_paid_amount: totalPaid,
      remaining_amount: remaining
    };
    
    await api(`../tables/billing/${currentBillingId}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(updated)
    });
    
    await loadBillings();
    renderBillings();
    renderDashboard();
    
    closeModal('partial-payment-modal');
    
    if(isFullyPaid){
      toast('✅ 완납 처리 완료','success');
    }else{
      toast('✅ 일부납 처리 완료','success');
    }
    
  } catch(err){
    console.error('[일부납 처리 오류]',err);
    toast('일부납 처리 실패: '+err.message,'error');
  }
}



