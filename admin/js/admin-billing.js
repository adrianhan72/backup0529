// ─── BILLING (시스템 사용료) ───

async function generateMonthlyBilling(){
  const now=new Date();
  const yr=now.getFullYear();
  const mo=now.getMonth()+1;
  
  if(!confirm(`${yr}년 ${mo}월 시스템 사용료를 생성하시겠습니까?\n\n이용중인 고객사의 재직 직원 수 기준으로 자동 계산됩니다.`)) return;
  
  try {
    const newBillings=[];
    
    // 이용중인 고객사만 대상
    const activeCompanies=allCompanies.filter(c=>c.status==='이용중');
    
    for(const co of activeCompanies){
      // 이미 해당 연월에 청구 데이터가 있는지 확인
      const exists=allBillings.find(b=>b.company_id===co.id&&b.billing_year==yr&&b.billing_month==mo);
      if(exists){
        console.log(`[청구 생성 스킵] ${co.company_name} - 이미 ${yr}년 ${mo}월 청구 존재`);
        continue;
      }
      
      // 해당 월에 급여 데이터가 있는 재직 직원 수 계산
      const activeEmps=allEmployees.filter(e=>
        e.company_id===co.id && 
        (e.status==='재직'||e.status==='active')
      );
      
      // 해당 월 급여 데이터가 있는 직원만 카운트
      const payrollEmps=allPayrolls.filter(p=>
        p.company_id===co.id && 
        p.pay_year==yr && 
        p.pay_month==mo
      );
      
      const empCount=payrollEmps.length>0?payrollEmps.length:activeEmps.length;
      
      if(empCount===0){
        console.log(`[청구 생성 스킵] ${co.company_name} - 재직 직원 0명`);
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
        payment_status:'납부대기',
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
  
  if(co.status!=='이용중'){
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
      (e.status==='재직'||e.status==='active')
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
      payment_status:'납부대기',
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
    if(b.payment_status === '완납') return sum;
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
  const activeCompanies = allCompanies.filter(c => c.status === '이용중').length;
  
  // 등록 직원 수 (재직 중인 직원만)
  const activeEmployees = allEmployees.filter(e => e.status === '재직' || e.status === 'active').length;
  
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
      return rem > 0 && paid > 0 && b.payment_status !== '완납';
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
    const activeCompanies = allCompanies.filter(c => c.status === '이용중');
    
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
          (e.status === '재직' || e.status === 'active')
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
      let actualStatus = '납부대기';
      if(b.payment_status === '완납' || (b.payment_date && currentRemaining <= 0)){
        actualStatus = '완납';
      }else if(paidAmount > 0 && currentRemaining > 0){
        actualStatus = '일부납';
      }else{
        if(b.due_date && b.due_date < todayStr){
          actualStatus = '미납';
        }
      }
      
      // 이월 미납금 확인 (마감일 경과 기준)
      const prevUnpaid = calculateTotalUnpaid(b.company_id, b.billing_year, b.billing_month);

      // 필터 적용
      if(filterType === 'paid'){
        // 납부고객: 완납 또는 일부납 (이월 미납금 없는 완납 + 일부납 모두 포함)
        return (actualStatus === '완납' && prevUnpaid === 0) || actualStatus === '일부납';
      }else if(filterType === 'unpaid'){
        // 미납현황: 납부기한 경과 불량고객 — 미납·일부납만 포함 (납부대기 제외)
        return actualStatus === '미납' || actualStatus === '일부납';
      }else if(filterType === 'pending'){
        // 납부대기현황: 납부대기 상태인 건
        return actualStatus === '납부대기';
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
    let actualStatus='납부대기';
    let statusBadge='<span class="badge badge-blue">납부대기</span>';
    let showButton=true;

    const paidAmount = b.partial_paid_amount || 0;
    const currentRemaining = (b.total_amount || 0) - paidAmount;

    // 이전 월 누적 미납금 (마감일 경과 건만) + 현재 청구 잔액 (마감일 경과 시만)
    const previousUnpaid = calculateTotalUnpaid(b.company_id, b.billing_year, b.billing_month);
    const currentOverdue = (currentRemaining > 0 && b.due_date && b.due_date < todayStr) ? currentRemaining : 0;
    const totalUnpaid = previousUnpaid + currentOverdue;

    // 이번 달 완납 + 이월 미납금 여부로 상태 결정
    if(b.payment_status==='완납' || (b.payment_date && currentRemaining<=0)){
      if(previousUnpaid > 0){
        actualStatus='일부납';
        statusBadge='<span class="badge badge-yellow">일부납</span>';
        unpaidList.push(b);
      } else {
        actualStatus='완납';
        statusBadge='<span class="badge badge-green">완납</span>';
        showButton=false;
        paidList.push(b);
      }
    }else if(paidAmount>0 && currentRemaining>0){
      actualStatus='일부납';
      statusBadge='<span class="badge badge-yellow">일부납</span>';
      unpaidList.push(b);
    }else{
      if(b.due_date&&b.due_date<todayStr){
        actualStatus='미납';
        statusBadge='<span class="badge badge-red">미납</span>';
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
        ${(filterType === 'paid' && actualStatus === '완납')
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
      payment_status:'완납',
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
      if(bill.payment_status === '완납') continue;
      
      const updated = {
        ...bill,
        payment_status: '완납',
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
      if(!co || co.status !== '이용중') continue;
      
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
        (e.status === '재직' || e.status === 'active')
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
        payment_status: '납부대기',
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
      let status = '납부대기';
      let statusBadge = '<span class="badge badge-blue">납부대기</span>';
      
      if(b.payment_status === '완납' || (b.payment_date && remaining <= 0)){
        status = '완납';
        statusBadge = '<span class="badge badge-green">완납</span>';
      } else if(paidAmt > 0 && remaining > 0){
        status = '일부납';
        statusBadge = '<span class="badge badge-yellow">일부납</span>';
      } else if(b.due_date && b.due_date < new Date().toISOString().split('T')[0]){
        status = '미납';
        statusBadge = '<span class="badge badge-red">미납</span>';
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



/* ══════════════════════════════════════════
   관리자 로그인 / 계정 관리
══════════════════════════════════════════ */

/* ── 세션 초기화: 이미 인증된 경우 바로 앱 진입 ── */
(function(){
  if(sessionStorage.getItem('admin_auth') === 'ok'){
    _alnShowApp();
    _alnUpdateTopbar();
    init();
  }
})();

/* ── 로그인 화면 ↔ 앱 전환 헬퍼 ── */
function _alnShowApp(){
  const screen  = document.getElementById('admin-login-screen');
  const sidebar = document.querySelector('.sidebar');
  const main    = document.querySelector('.main');
  if(screen)  screen.style.display = 'none';
  if(sidebar) sidebar.style.display = '';
  if(main)    main.style.display    = '';
}

/* ── 비밀번호 눈 토글 (로그인 화면) ── */
function alnToggleEye(){
  const pw   = document.getElementById('aln-pw');
  const icon = document.getElementById('aln-eye-icon');
  if(pw.type === 'password'){ pw.type = 'text';     icon.className = 'fas fa-eye-slash'; }
  else                      { pw.type = 'password'; icon.className = 'fas fa-eye';       }
}

/* ── 로그인 에러 표시 / 초기화 ── */
function _alnSetError(msg, shakeEl){
  const err = document.getElementById('aln-error-msg');
  document.getElementById('aln-error-text').textContent = msg;
  err.style.display = 'block';
  const target = shakeEl || document.getElementById('aln-pw');
  target.classList.add('error');
  setTimeout(()=>target.classList.remove('error'), 400);
}
function _alnClearError(){
  document.getElementById('aln-error-msg').style.display = 'none';
  ['aln-id','aln-pw'].forEach(id=>document.getElementById(id)?.classList.remove('error'));
}
document.addEventListener('DOMContentLoaded', function(){
  ['aln-id','aln-pw'].forEach(id=>{
    document.getElementById(id)?.addEventListener('input', _alnClearError);
  });
});

/* ── 로그인: API 테이블에서 계정 검증 ── */
async function adminLogin(){
  const idEl  = document.getElementById('aln-id');
  const pwEl  = document.getElementById('aln-pw');
  const idVal = idEl.value.trim();
  const pwVal = pwEl.value;
  const btn   = document.getElementById('aln-submit-btn');

  if(!idVal){ _alnSetError('아이디를 입력하세요.', idEl); idEl.focus(); return; }
  if(!pwVal){ _alnSetError('비밀번호를 입력하세요.', pwEl); pwEl.focus(); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp; 확인 중...';

  try{
    const res  = await fetch('../tables/admin_accounts?limit=200');
    const data = await res.json();
    const accounts = data.data || [];

    const matched = accounts.find(a =>
      a.username === idVal && a.password === pwVal
    );

    if(!matched){
      _alnSetError('아이디 또는 비밀번호가 올바르지 않습니다.', pwEl);
      pwEl.value = '';
      pwEl.focus();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>&nbsp; 로그인';
      return;
    }

    // 인증 성공 — 계정 정보 세션에 저장
    sessionStorage.setItem('admin_auth', 'ok');
    sessionStorage.setItem('admin_username', matched.username);
    sessionStorage.setItem('admin_display_name', matched.display_name || matched.username);

    setTimeout(()=>{
      _alnShowApp();
      // topbar 접속자 이름 갱신
      _alnUpdateTopbar();
      init();
    }, 350);

  } catch(e){
    console.error('[로그인 오류]', e);
    _alnSetError('서버 연결에 실패했습니다. 잠시 후 다시 시도하세요.', pwEl);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>&nbsp; 로그인';
  }
}

/* ── topbar 접속자 이름 표시 갱신 ── */
function _alnUpdateTopbar(){
  const name = sessionStorage.getItem('admin_display_name') || '마스터관리자';
  const span = document.getElementById('topbar-admin-name');
  if(span){
    span.textContent = name + ' 님 접속 중';
    span.dataset.name = name;   // 발송자 추출용 순수 이름 보관
  }
}

/* ── 로그아웃 ── */
function adminLogout(){
  if(!confirm('로그아웃 하시겠습니까?')) return;
  sessionStorage.removeItem('admin_auth');
  sessionStorage.removeItem('admin_username');
  sessionStorage.removeItem('admin_display_name');
  const screen  = document.getElementById('admin-login-screen');
  const sidebar = document.querySelector('.sidebar');
  const main    = document.querySelector('.main');
  if(screen){
    screen.style.display = '';
    const btn = document.getElementById('aln-submit-btn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>&nbsp; 로그인';
    document.getElementById('aln-id').value = '';
    document.getElementById('aln-pw').value = '';
    _alnClearError();
    setTimeout(()=>document.getElementById('aln-id').focus(), 100);
  }
  if(sidebar) sidebar.style.display = 'none';
  if(main)    main.style.display    = 'none';
}

/* ══════════════════════════════════════════
   급여 명세서 발송 관리 페이지
══════════════════════════════════════════ */

// ─── 상태 ───
let _pssCompanyId   = null;
let _pssCompanyName = '';
let _pssYM          = { year: new Date().getFullYear(), month: new Date().getMonth()+1 }; // 선택된 년월
let _pssSendLogs    = [];   // 이 고객사의 전체 발송 이력 캐시
let _pssSelectedMethod = 'kakao';   // 단건 모달 선택 방법
let _pssBulkMethod     = 'kakao';   // 일괄 모달 선택 방법
let _pssConfirmTarget  = null;      // 단건 발송 대상 {payrollId, empId, empName, phone, year, month}
let _pssLogPage = 1;
const PSS_LOG_ITEMS = 20;
let _pssSingleSendRunning = false;  // 단건 카카오 발송 중 플래그
let _pssBulkSendRunning   = false;  // 일괄 카카오 발송 중 플래그

// ─── 고객사 선택 칩 렌더 ───
function renderPssCompanyList(){
  const q = (document.getElementById('pss-company-search')?.value || '').toLowerCase();
  const wrap = document.getElementById('pss-company-chips');
  if(!wrap) return;
  const list = allCompanies.filter(c =>
    c.status === '이용중' && !c.is_draft &&
    (!q || (c.company_name||'').toLowerCase().includes(q))
  ).sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'ko'));
  if(!list.length){
    wrap.innerHTML = '<span style="font-size:12px;color:#9ca3af;">검색 결과가 없습니다.</span>';
    return;
  }

  // 고객사별 미발송 건수 사전 계산
  const sentPayrollIds = new Set((_allSendLogs||[]).map(l => l.payroll_id));
  const unsentByCompany = {};
  (allPayrolls||[]).forEach(p => {
    if(!sentPayrollIds.has(p.id)){
      unsentByCompany[p.company_id] = (unsentByCompany[p.company_id] || 0) + 1;
    }
  });

  wrap.innerHTML = list.map(c => {
    const unsent = unsentByCompany[c.id] || 0;
    const badgeHtml = unsent > 0
      ? `<span class="pss-co-unsent-badge">${unsent}</span>`
      : '';
    const isSelected = _pssCompanyId === c.id;
    return `
      <div class="company-chip${isSelected ? ' selected' : ''}"
           onclick="selectPssCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}')">
        <i class="fas fa-building" style="font-size:10px;opacity:.7;"></i>${c.company_name}${badgeHtml}
      </div>`;
  }).join('');
}

// ─── 고객사 선택 ───
async function selectPssCompany(id, name){
  _pssCompanyId   = id;
  _pssCompanyName = name;
  currentGlobalCompanyId   = id;
  currentGlobalCompanyName = name;

  document.getElementById('pss-company-select-card').style.display = 'none';
  document.getElementById('pss-main-section').style.display = '';
  document.getElementById('pss-selected-company-label').innerHTML =
    `<i class="fas fa-building" style="margin-right:6px;color:#7c3aed;"></i>${name} — 급여명세서 발송 관리`;

  // 이력 로드 중 tbody 스피너 표시
  const _pssUTb = document.getElementById('pss-unsent-tbody');
  const _pssLTb = document.getElementById('pss-log-tbody');
  const _spinRow = (cols) => `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#7c3aed;margin-right:8px;"></i>불러오는 중...</td></tr>`;
  if(_pssUTb) _pssUTb.innerHTML = _spinRow(6);
  if(_pssLTb) _pssLTb.innerHTML = _spinRow(6);

  // 발송 이력 로드 → 년월 탭 → 목록 렌더
  await _pssLoadLogs();
  renderPssMonthTabs();   // 탭 렌더 (가장 최근 년월 자동 선택)
  renderPssUnsentList();
  renderPssLogs();
  _pssUpdateStats();
}

// ─── 고객사 선택 해제 ───
function clearPssCompanySelect(){
  _pssCompanyId = null;
  document.getElementById('pss-company-select-card').style.display = '';
  document.getElementById('pss-main-section').style.display = 'none';
  renderPssCompanyList();
}

// ─── 발송 이력 로드 (전체, 이 고객사) ───
async function _pssLoadLogs(){
  const data = await api(`../tables/payroll_send_logs?limit=500`);
  _pssSendLogs = (data.data || []).filter(l => l.company_id === _pssCompanyId);
}

// ─── 년월 탭 렌더 ───
function renderPssMonthTabs(){
  const wrap = document.getElementById('pss-month-tabs');
  if(!wrap) return;

  // 미발송이 있는 년월만 수집 → 최신순 정렬
  const ymSet = new Map(); // 'YYYY-MM' → {year, month}
  allPayrolls
    .filter(p => p.company_id === _pssCompanyId)
    .forEach(p => {
      const key = `${Number(p.pay_year)}-${String(Number(p.pay_month)).padStart(2,'0')}`;
      ymSet.set(key, { year: Number(p.pay_year), month: Number(p.pay_month) });
    });

  const ymList = [...ymSet.values()]
    .sort((a,b) => b.year!==a.year ? b.year-a.year : b.month-a.month)
    .filter(ym => _pssGetUnsentList(ym.year, ym.month).length > 0); // 미발송 있는 월만

  if(!ymList.length){
    wrap.innerHTML = `<div class="pss-empty" style="padding:10px 0;">미발송 급여 명세서가 없습니다.</div>`;
    return;
  }

  // 현재 _pssYM이 목록에 없으면 가장 최근 년월로 초기화
  const isInList = ymList.some(x => x.year===_pssYM.year && x.month===_pssYM.month);
  if(!isInList){
    _pssYM = { ...ymList[0] };
  }

  wrap.innerHTML = ymList.map(ym => {
    const isActive  = ym.year===_pssYM.year && ym.month===_pssYM.month;
    const unsentCnt = _pssGetUnsentList(ym.year, ym.month).length;
    const moStr     = String(ym.month).padStart(2,'0');
    return `<div class="pss-month-tab${isActive?' active':''}" onclick="selectPssYM(${ym.year},${ym.month})">
      ${ym.year}년 ${moStr}월<span class="pss-tab-badge unsent">${unsentCnt}</span>
    </div>`;
  }).join('');
}

// ─── 년월 선택 ───
function selectPssYM(year, month){
  _pssYM = { year, month };
  _pssLogPage = 1;
  renderPssMonthTabs();
  renderPssUnsentList();
  renderPssLogs();
  _pssUpdateStats();
}

// ─── 해당 년월 급여 레코드 목록 (유효 계약 직원만) ───
function _pssGetMonthPayrolls(year, month){
  const yr = year  ?? _pssYM.year;
  const mo = month ?? _pssYM.month;
  return allPayrolls.filter(p => {
    if(p.company_id !== _pssCompanyId) return false;
    if(Number(p.pay_year)  !== yr) return false;
    if(Number(p.pay_month) !== mo) return false;
    // 계약이 임시저장 상태인 직원 제외
    const ct = allContracts.find(c => c.employee_id === p.employee_id &&
      (c.status === 'active' || c.status === '활성'))
      || allContracts.find(c => c.employee_id === p.employee_id);
    if(ct && ct.is_draft) return false;
    return true;
  });
}

// ─── 해당 년월 이미 발송된 payroll_id 집합 ───
function _pssGetSentPayrollIds(year, month){
  const yr = year  ?? _pssYM.year;
  const mo = month ?? _pssYM.month;
  return new Set(
    _pssSendLogs
      .filter(l => Number(l.pay_year) === yr && Number(l.pay_month) === mo)
      .map(l => l.payroll_id)
  );
}

// ─── 해당 년월 발송 완료 레코드 목록 ───
function _pssGetSentPayrolls(year, month){
  const sentIds = _pssGetSentPayrollIds(year, month);
  return _pssGetMonthPayrolls(year, month).filter(p => sentIds.has(p.id));
}

// ─── 해당 년월 미발송 목록 ───
function _pssGetUnsentList(year, month){
  const sentIds = _pssGetSentPayrollIds(year, month);
  return _pssGetMonthPayrolls(year, month).filter(p => !sentIds.has(p.id));
}

// ─── 미발송 목록 렌더 ───
function renderPssUnsentList(){
  const tbody = document.getElementById('pss-unsent-tbody');
  const allClearMsg = document.getElementById('pss-all-clear-msg');
  const sendAllBtn  = document.getElementById('pss-send-all-btn');
  const countBadge  = document.getElementById('pss-unsent-count');
  if(!tbody) return;

  const unsentList = _pssGetUnsentList(_pssYM.year, _pssYM.month);
  countBadge.textContent = unsentList.length;

  const tableWrap = document.getElementById('pss-unsent-table-wrap');

  if(!unsentList.length){
    tbody.innerHTML = '';
    allClearMsg.style.display = '';
    sendAllBtn.disabled = true;
    if(tableWrap) tableWrap.style.display = 'none';
    return;
  }
  allClearMsg.style.display = 'none';
  sendAllBtn.disabled = false;
  if(tableWrap) tableWrap.style.display = '';

  tbody.innerHTML = unsentList.map((p, idx) => {
    const emp      = allEmployees.find(e => e.id === p.employee_id) || {};
    const cat      = emp.employment_category || '-';
    const phone    = emp.phone || emp.mobile || '';
    const email    = emp.email || '';
    const hasEmail = !!(email.trim());
    const emailBtnStyle = hasEmail
      ? 'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    return `<tr id="pss-urow-${idx}">
      <td style="font-weight:700;color:#1f2937;">${emp.name || '-'}</td>
      <td><span class="badge ${empCatBadge(cat)}" style="font-size:10.5px;padding:2px 7px;">${cat}</span></td>
      <td style="color:#6b7280;font-size:12px;">${phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="font-size:12px;">${hasEmail ? `<span style="color:#374151;">${email}</span>` : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button onclick="_pssKakaoSendRow('${p.id}','${p.employee_id}')" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;margin-right:3px;display:inline-flex;align-items:center;gap:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡 발송</button>
        <button onclick="_pssEmailSendRow('${p.id}','${p.employee_id}')" ${hasEmail ? '' : 'disabled'} style="${emailBtnStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:3px;">✉ 이메일 발송</button>
        <button onclick="_pssManualDoneRow('${p.id}','${p.employee_id}')" style="background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;">✔ 수동교부 완료</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── 미발송 목록 개별 관리 — 알림톡 발송 ───
async function _pssKakaoSendRow(payrollId, empId){
  const p   = allPayrolls.find(x => x.id === payrollId);
  const emp = allEmployees.find(e => e.id === empId) || {};
  if(!p) return;

  const yr    = _pssYM.year;
  const mo    = _pssYM.month;
  const moStr = String(mo).padStart(2,'0');
  const phone = emp.phone || emp.mobile || '';
  const empName = emp.name || '-';

  if(!phone){
    toast(`${empName} — 휴대전화번호가 등록되어 있지 않습니다.`, 'error');
    return;
  }

  const sentBy = sessionStorage.getItem('admin_username') || 'admin';

  try{
    // ① PDF 생성
    toast(`${empName} — PDF 생성 중...`, 'info');
    const fileName = `${empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const blob     = await _generatePayslipBlob(payrollId);
    const pdfFile  = new File([blob], fileName, { type:'application/pdf' });

    // ② 카카오 알림톡 발송
    toast(`${empName} — 알림톡 발송 중...`, 'info');
    await _sendKakaoAlimtalk(phone, fileName, pdfFile);

    // ③ 로그 저장
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    yr,
      pay_month:   mo,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'kakao',
      note:        '미발송 목록에서 개별 알림톡 발송'
    };
    await api('../tables/payroll_send_logs', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(logBody)
    });
    _pssSendLogs.push(logBody);
    _allSendLogs.push(logBody);
    _updateDashUnsentBanner();

    toast(`✅ ${empName} — ${yr}년 ${mo}월 알림톡 발송 완료`, 'success');
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[알림톡 발송 실패]', empName, err);
    toast(`✖ ${empName} — 알림톡 발송 실패`, 'error');
  }
}

// ─── 미발송 목록 개별 관리 — 이메일 발송 ───
async function _pssEmailSendRow(payrollId, empId){
  const p   = allPayrolls.find(x => x.id === payrollId);
  const emp = allEmployees.find(e => e.id === empId) || {};
  if(!p) return;

  const yr      = _pssYM.year;
  const mo      = _pssYM.month;
  const moStr   = String(mo).padStart(2,'0');
  const email   = emp.email || '';
  const empName = emp.name || '-';

  if(!email.trim()){
    toast(`${empName} — 이메일 주소가 등록되어 있지 않습니다.`, 'error');
    return;
  }

  const sentBy = sessionStorage.getItem('admin_username') || 'admin';

  try{
    // ① PDF 생성
    toast(`${empName} — PDF 생성 중...`, 'info');
    const fileName = `${empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const blob     = await _generatePayslipBlob(payrollId);
    const pdfFile  = new File([blob], fileName, { type:'application/pdf' });

    // ② 이메일 발송 (stub)
    await _sendEmailWithAttachment(email, fileName, pdfFile);

    // ③ 로그 저장
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    yr,
      pay_month:   mo,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'email',
      note:        `이메일 발송 (${email})`
    };
    await api('../tables/payroll_send_logs', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(logBody)
    });
    _pssSendLogs.push(logBody);
    _allSendLogs.push(logBody);
    _updateDashUnsentBanner();

    alert(`${empName}의 ${yr}년 ${mo}월 급여명세서를 이메일로 발송하였습니다.`);
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[이메일 발송 실패]', empName, err);
    toast(`✖ ${empName} — 이메일 발송 실패`, 'error');
  }
}

// ─── 미발송 목록 개별 관리 — 수동 교부 완료 ───
async function _pssManualDoneRow(payrollId, empId){
  const p   = allPayrolls.find(x => x.id === payrollId);
  const emp = allEmployees.find(e => e.id === empId) || {};
  if(!p) return;

  const yr      = _pssYM.year;
  const mo      = _pssYM.month;
  const empName = emp.name || '-';

  const ok = confirm(`${empName}의 ${yr}년 ${mo}월 급여명세서를 수동 교부 완료한 것으로 기록하겠습니까?`);
  if(!ok) return;

  const sentBy = sessionStorage.getItem('admin_username') || 'admin';

  try{
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    yr,
      pay_month:   mo,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'manual',
      note:        '수동 교부 완료'
    };
    await api('../tables/payroll_send_logs', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(logBody)
    });
    _pssSendLogs.push(logBody);
    _allSendLogs.push(logBody);
    _updateDashUnsentBanner();

    toast(`✔ ${empName} — 수동 교부 완료 처리됐습니다.`, 'success');
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[수동 교부 저장 실패]', empName, err);
    toast('저장 중 오류가 발생했습니다.', 'error');
  }
}

// ─── 요약 통계 업데이트 ───
function _pssUpdateStats(){
  // ── 대시보드 미발송 알림 배너 업데이트 ──
  _updateDashUnsentBanner();
}

function _updateDashUnsentContractBanner(){
  const section = document.getElementById('dash-contract-unsent-section');
  if(!section) return;

  // _contractDispatchList(발송 이력)가 heavy 데이터이므로 로드 완료 전에는 계산 불가
  // → _heavyDataReady=false 시 배너 업데이트 skip (loadHeavyData 완료 후 재호출됨)
  if(typeof _heavyDataReady !== 'undefined' && !_heavyDataReady) return;

  // _cdpGetUnsentContracts()로 미발송 계약서 전체 건수 산출
  const unsentList = _cdpGetUnsentContracts();
  const totalUnsent = unsentList.length;

  if(totalUnsent === 0){
    section.style.display = 'none';
    section.innerHTML = '';
    return;
  }

  section.style.display = '';
  section.innerHTML = `
    <div onclick="showPage('contract-dispatch', document.querySelector('.menu-item[data-page=\\'contract-dispatch\\']'))"
         style="cursor:pointer;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #3b82f6;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px;transition:box-shadow .15s;"
         onmouseover="this.style.boxShadow='0 4px 18px rgba(59,130,246,.2)'"
         onmouseout="this.style.boxShadow='none'">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas fa-file-contract" style="color:#fff;font-size:17px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:700;color:#1e40af;">
          근로계약서 미발송 <span style="color:#2563eb;font-size:16px;font-weight:800;">${totalUnsent}건</span>이 있습니다
        </div>
        <div style="font-size:12px;color:#3b82f6;margin-top:3px;">클릭하여 계약서 발송 관리 페이지로 이동합니다.</div>
      </div>
      <div style="color:#3b82f6;font-size:14px;flex-shrink:0;"><i class="fas fa-chevron-right"></i></div>
    </div>`;
  // 메뉴 배지 동기화
  if(typeof updateMenuBadges === 'function') updateMenuBadges();
}

function _updateDashUnsentBanner(){
  const section = document.getElementById('dash-unsent-section');
  if(!section) return;

  // 전체 고객사 × 전체 월 미발송 합산 (_allSendLogs 사용)
  const sentPayrollIds = new Set(_allSendLogs.map(l => l.payroll_id));
  const totalUnsent = allPayrolls.filter(p => !sentPayrollIds.has(p.id)).length;


  if(totalUnsent === 0){
    section.style.display = 'none';
    section.innerHTML = '';
    return;
  }

  section.style.display = '';
  section.innerHTML = `
    <div onclick="showPage('payslip-send', document.querySelector('.menu-item[data-page=\\'payslip-send\\']'))"
         style="cursor:pointer;background:linear-gradient(135deg,#fff7ed,#fef3c7);border:1px solid #f59e0b;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px;transition:box-shadow .15s;"
         onmouseover="this.style.boxShadow='0 4px 18px rgba(245,158,11,.2)'"
         onmouseout="this.style.boxShadow='none'">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas fa-exclamation-triangle" style="color:#fff;font-size:17px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:700;color:#92400e;">
          급여명세서 미발송 <span style="color:#d97706;font-size:16px;font-weight:800;">${totalUnsent}건</span>이 있습니다
        </div>
        <div style="font-size:12px;color:#b45309;margin-top:3px;">클릭하여 급여 명세서 발송 관리 페이지로 이동합니다.</div>
      </div>
      <div style="color:#d97706;font-size:14px;flex-shrink:0;"><i class="fas fa-chevron-right"></i></div>
    </div>`;
}

// ─── 발송 이력 렌더 ───
function renderPssLogs(){
  const tbody   = document.getElementById('pss-log-tbody');
  const pagWrap = document.getElementById('pss-log-pagination');
  const countBadge = document.getElementById('pss-log-count');
  if(!tbody) return;

  let logs = [..._pssSendLogs];

  // 직원명 검색 필터
  const q = (document.getElementById('pss-log-search')?.value || '').trim().toLowerCase();
  if(q){
    logs = logs.filter(l => {
      const emp = allEmployees.find(e => e.id === l.employee_id) || {};
      return (emp.name || '').toLowerCase().includes(q);
    });
  }

  // 최신순 정렬
  logs.sort((a,b) => (b.sent_at||'').localeCompare(a.sent_at||''));

  countBadge.textContent = logs.length;

  if(!logs.length){
    tbody.innerHTML = `<tr><td colspan="7" class="pss-empty">발송 이력이 없습니다.</td></tr>`;
    pagWrap.innerHTML = '';
    return;
  }

  const total = logs.length;
  const paged = logs.slice((_pssLogPage-1)*PSS_LOG_ITEMS, _pssLogPage*PSS_LOG_ITEMS);

  const methodLabel = { kakao:'카카오', email:'이메일', manual:'수동 교부' };
  const methodIcon  = { kakao:'fas fa-comment', email:'fas fa-envelope', manual:'fas fa-hand-paper' };
  const methodColor = { kakao:'#f9d000', email:'#3b82f6', manual:'#6b7280' };

  tbody.innerHTML = paged.map(l => {
    const emp = allEmployees.find(e => e.id === l.employee_id) || {};
    const cat = emp.employment_category || '-';
    const sentDt = l.sent_at ? new Date(l.sent_at).toLocaleString('ko-KR',{
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit'
    }) : '-';
    const meth = l.send_method || 'manual';
    return `<tr>
      <td style="font-weight:700;">${emp.name||l.employee_id||'-'}</td>
      <td><span class="badge ${empCatBadge(cat)}" style="font-size:10.5px;padding:2px 7px;">${cat}</span></td>
      <td style="font-size:12px;color:#374151;">${l.pay_year||'-'}년 ${l.pay_month||'-'}월</td>
      <td style="font-size:12px;color:#374151;">${sentDt}</td>
      <td><span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;">
        <i class="${methodIcon[meth]||'fas fa-paper-plane'}" style="color:${methodColor[meth]||'#6b7280'};"></i>
        ${methodLabel[meth]||meth}
      </span></td>
      <td style="font-size:12px;color:#6b7280;">${_resolveAdminName(l.sent_by)||'-'}</td>
      <td style="font-size:11.5px;color:#6b7280;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(l.note||'').replace(/"/g,'&quot;')}">${l.note||'-'}</td>
    </tr>`;
  }).join('');

  // 페이지네이션 (PSS_LOG_ITEMS 기준 자체 렌더)
  const totalPages = Math.ceil(total / PSS_LOG_ITEMS);
  const ps = Math.min((_pssLogPage-1)*PSS_LOG_ITEMS+1, total);
  const pe = Math.min(_pssLogPage*PSS_LOG_ITEMS, total);
  document.getElementById('pss-log-pagination').innerHTML = totalPages <= 1 ? '' : `
    <span class="page-info">${total}건 중 ${ps}-${pe}</span>
    <div class="page-btns">
      <button class="page-btn" onclick="setPssLogPage(${_pssLogPage-1})" ${_pssLogPage<=1?'disabled style="opacity:.4"':''}><i class="fas fa-chevron-left"></i></button>
      ${Array.from({length:Math.min(totalPages,5)},(_,i)=>{const p=Math.max(1,Math.min(_pssLogPage-2,totalPages-4))+i;return p>totalPages?'':`<button class="page-btn ${p===_pssLogPage?'active':''}" onclick="setPssLogPage(${p})">${p}</button>`;}).join('')}
      <button class="page-btn" onclick="setPssLogPage(${_pssLogPage+1})" ${_pssLogPage>=totalPages?'disabled style="opacity:.4"':''}><i class="fas fa-chevron-right"></i></button>
    </div>`;
}

function setPssLogPage(p){ _pssLogPage = p; renderPssLogs(); }
function clearPssLogSearch(){ const el = document.getElementById('pss-log-search'); if(el) el.value=''; _pssLogPage=1; renderPssLogs(); }

// ─── 단건 발송 모달 열기 ───
function openPssConfirmModal(payrollId, empId, year, month){
  const p   = allPayrolls.find(x => x.id === payrollId);
  const emp = allEmployees.find(e => e.id === empId) || {};
  if(!p) return;

  const yr = parseInt(year)  || _pssYM.year;
  const mo = parseInt(month) || _pssYM.month;

  _pssConfirmTarget = { payrollId, empId, empName: emp.name||'-',
    phone: emp.phone||emp.mobile||'', year: yr, month: mo };
  _pssSelectedMethod = 'kakao';
  _pssRefreshMethodBtns('pss-method');

  const moStr = String(mo).padStart(2,'0');
  document.getElementById('pss-confirm-info').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div><span style="color:#7c3aed;font-weight:700;font-size:13.5px;">${emp.name||'-'}</span>
        <span class="badge ${empCatBadge(emp.employment_category||'-')}" style="font-size:10.5px;padding:2px 7px;margin-left:6px;">${emp.employment_category||'-'}</span>
      </div>
      <div style="color:#374151;">📅 <b>${yr}년 ${moStr}월</b> 급여명세서</div>
      <div style="color:#374151;">💰 실수령액 <b>${won2(p.net_pay)}원</b></div>
      <div style="color:#6b7280;font-size:12px;">📱 ${emp.phone||emp.mobile||'연락처 미등록'}</div>
    </div>`;
  document.getElementById('pss-confirm-note').value = '';
  document.getElementById('pss-confirm-modal').classList.add('open');
}

function closePssConfirmModal(){
  if(_pssSingleSendRunning) return; // 단건 카카오 발송 진행 중엔 닫기 방지
  document.getElementById('pss-confirm-modal').classList.remove('open');
  _pssConfirmTarget = null;
  _pssSingleSendRunning = false;
  // 진행 상태 초기화
  const progWrap = document.getElementById('pss-confirm-progress');
  if(progWrap) progWrap.style.display = 'none';
  const sendBtn  = document.getElementById('pss-confirm-send-btn');
  if(sendBtn){ sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-check"></i> 발송 처리'; sendBtn.style.background=''; sendBtn.onclick = confirmPssSend; }
  const cancelBtn = document.getElementById('pss-confirm-cancel-btn');
  if(cancelBtn){ cancelBtn.disabled = false; }
}

// ─── 발송 방법 선택 버튼 토글 ───
function selectPssMethod(method){
  _pssSelectedMethod = method;
  _pssRefreshMethodBtns('pss-method');
}
function selectPssBulkMethod(method){
  _pssBulkMethod = method;
  _pssRefreshMethodBtns('pss-bulk-method');
}
function _pssRefreshMethodBtns(prefix){
  const method = prefix === 'pss-method' ? _pssSelectedMethod : _pssBulkMethod;
  ['kakao','email','manual'].forEach(m => {
    const btn = document.getElementById(`${prefix}-${m}`);
    if(btn) btn.classList.toggle('selected', m === method);
  });
}

// ─── 단건 발송 처리 확정 ───
async function confirmPssSend(){
  if(!_pssConfirmTarget) return;
  const { payrollId, empId, empName, phone, year, month } = _pssConfirmTarget;
  const note   = document.getElementById('pss-confirm-note').value.trim();
  const sentBy = sessionStorage.getItem('admin_username') || 'admin';
  const method = _pssSelectedMethod;

  // ── kakao가 아닌 경우: 기존 수동 기록 방식 유지 ──
  if(method !== 'kakao'){
    const body = {
      id:          'psl_' + Date.now(),
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    year,
      pay_month:   month,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: method,
      note:        note
    };
    try{
      await api('../tables/payroll_send_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      _pssSendLogs.push(body);
      _allSendLogs.push(body);
      _updateDashUnsentBanner();
      closePssConfirmModal();
      toast(`✅ ${empName} — ${year}년 ${month}월 발송 처리 완료`, 'success');
      renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
    } catch(e){
      toast('발송 처리 중 오류가 발생했습니다.', 'error');
      console.error(e);
    }
    return;
  }

  // ── kakao: PDF 생성 → 발송 → 로그 저장 플로우 ──
  if(_pssSingleSendRunning) return;
  _pssSingleSendRunning = true;

  const sendBtn   = document.getElementById('pss-confirm-send-btn');
  const cancelBtn = document.getElementById('pss-confirm-cancel-btn');
  const progWrap  = document.getElementById('pss-confirm-progress');
  const progIcon  = document.getElementById('pss-confirm-prog-icon');
  const progLabel = document.getElementById('pss-confirm-prog-label');
  const progBar   = document.getElementById('pss-confirm-prog-bar');

  // UI 잠금
  sendBtn.disabled  = true;
  cancelBtn.disabled = true;
  progWrap.style.display = 'block';

  const setStep = (icon, spin, label, pct, color) => {
    progIcon.className = spin ? `fas ${icon} fa-spin` : `fas ${icon}`;
    progIcon.style.color  = color || '#059669';
    progLabel.textContent = label;
    progLabel.style.color = color === '#ef4444' ? '#991b1b' : '#065f46';
    progBar.style.width   = pct + '%';
    progBar.style.background = color === '#ef4444'
      ? 'linear-gradient(90deg,#ef4444,#b91c1c)'
      : 'linear-gradient(90deg,#10b981,#059669)';
  };

  try{
    // ① PDF 생성
    setStep('fa-spinner', true, 'PDF 생성 중...', 30);
    const moStr   = String(month).padStart(2,'0');
    const fileName = `${empName}_${year}년${moStr}월_급여명세서.pdf`;
    const blob = await _generatePayslipBlob(payrollId);
    const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

    // ② 카카오 발송
    setStep('fa-paper-plane', true, '카카오로 발송 중...', 65);
    await _sendKakaoAlimtalk(phone, fileName, pdfFile);

    // ③ 로그 저장
    setStep('fa-database', true, '발송 이력 저장 중...', 85);
    const logBody = {
      id:          'psl_' + Date.now() + '_' + empId,
      company_id:  _pssCompanyId,
      employee_id: empId,
      payroll_id:  payrollId,
      pay_year:    year,
      pay_month:   month,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'kakao',
      note:        note || '급여명세서 발송 관리에서 단건 발송'
    };
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logBody)
    });
    _pssSendLogs.push(logBody);
    _allSendLogs.push(logBody);
    _updateDashUnsentBanner();

    // ④ 완료
    setStep('fa-check-circle', false, '발송 완료!', 100);
    await new Promise(r => setTimeout(r, 700));

    _pssSingleSendRunning = false;
    closePssConfirmModal();
    toast(`✅ ${empName} — ${year}년 ${month}월 카카오 발송 완료`, 'success');
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();

  } catch(err){
    console.error('[단건 카카오 발송 실패]', err);
    _pssSingleSendRunning = false;
    setStep('fa-exclamation-circle', false, 'PDF 발송 실패. 다시 시도해 주세요.', 100, '#ef4444');
    sendBtn.disabled   = false;
    cancelBtn.disabled = false;
    sendBtn.innerHTML  = '<i class="fas fa-redo"></i> 다시 시도';
  }
}

// ─── 발송 관리 일괄 발송 헬퍼 ───
let _pssBulkSendItems = [];  // 발송 대상 목록

/* 직원별 상태 테이블 초기 렌더 */
function _pssBulkRenderTable(){
  const tbody = document.getElementById('pss-bulk-send-tbody');
  if(!tbody) return;
  tbody.innerHTML = _pssBulkSendItems.map((item, i) => {
    const hasEmail = !!(item.email && item.email.trim());
    const emailCell = hasEmail
      ? `<span style="font-size:12px;color:#374151;">${item.email}</span>`
      : `<span style="color:#d1d5db;font-size:12px;">미등록</span>`;
    const emailBtnStyle = hasEmail
      ? 'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    return `<tr id="pss-brow-${i}" style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:9px 12px;font-weight:700;color:#1a1a2e;">${item.empName}</td>
      <td style="padding:9px 12px;color:#6b7280;font-size:12.5px;">${item.phone || '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="padding:9px 12px;">${emailCell}</td>
      <td id="pss-bstatus-${i}" style="padding:9px 12px;">${_pssBulkStatusHtml('idle')}</td>
      <td id="pss-baction-${i}" style="padding:9px 12px;text-align:center;white-space:nowrap;">
        <button onclick="_pssEmailSend(${i})" ${hasEmail ? '' : 'disabled'} style="${emailBtnStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:4px;">✉ 이메일 발송</button>
        <button onclick="_pssManualDone(${i})" style="background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;">✔ 수동 교부 완료</button>
      </td>
    </tr>`;
  }).join('');
}

/* 상태 배지 HTML */
function _pssBulkStatusHtml(status){
  const map = {
    idle:       ['idle',       '⏳ 대기'],
    generating: ['generating', '⚙️ PDF 생성 중'],
    sending:    ['sending',    '📨 발송 중'],
    success:    ['success',    '✔ 발송 성공'],
    fail:       ['fail',       '✖ 발송 실패'],
  };
  const [cls, label] = map[status] || ['idle', '⏳ 대기'];
  return `<span class="bs-status ${cls}">${label}</span>`;
}

/* 행 상태 업데이트 */
function _pssBulkSetStatus(i, status){
  if(_pssBulkSendItems[i]) _pssBulkSendItems[i].status = status;
  const cell = document.getElementById(`pss-bstatus-${i}`);
  if(cell) cell.innerHTML = _pssBulkStatusHtml(status);
}

/* 진행바 업데이트 */
function _pssBulkUpdateProgress(){
  const total = _pssBulkSendItems.length;
  const done  = _pssBulkSendItems.filter(x => x.status === 'success' || x.status === 'fail').length;
  const pct   = total ? Math.round(done / total * 100) : 0;
  const bar   = document.getElementById('pss-bulk-prog-bar');
  const pct_el = document.getElementById('pss-bulk-prog-pct');
  const lbl   = document.getElementById('pss-bulk-prog-label');
  if(bar)   bar.style.width   = pct + '%';
  if(pct_el) pct_el.textContent = `${done} / ${total} (${pct}%)`;
  if(lbl)   lbl.textContent   = done === total ? '발송 완료' : '발송 진행 중...';
}

// ─── 일괄 발송 모달 열기 ───
async function openPssSendAllModal(){
  const unsentList = _pssGetUnsentList(_pssYM.year, _pssYM.month);
  const targets    = unsentList;

  if(!targets.length){ toast('발송 대상이 없습니다.', 'error'); return; }

  // 항상 최신 직원 데이터 보장
  await loadEmployees();

  // 상태 초기화
  _pssBulkSendRunning = false;

  // 헤더 자막
  const moStr = String(_pssYM.month).padStart(2,'0');
  document.getElementById('pss-bulk-subtitle').textContent =
    `${_pssCompanyName} · ${_pssYM.year}년 ${moStr}월 · ${targets.length}명`;

  // 발송 대상 구성 (email 포함)
  _pssBulkSendItems = targets.map(p => {
    const emp = allEmployees.find(e => e.id === p.employee_id) || {};
    return {
      payrollId:  p.id,
      empId:      p.employee_id,
      empName:    emp.name || '(이름없음)',
      phone:      emp.phone || emp.mobile || '',
      email:      emp.email || '',
      companyId:  _pssCompanyId,
      payYear:    _pssYM.year,
      payMonth:   _pssYM.month,
      netPay:     p.net_pay,
      status:     'idle'
    };
  });

  // 직원 테이블 초기 렌더
  _pssBulkRenderTable();

  // 진행바 숨김, 버튼 초기화
  document.getElementById('pss-bulk-progress-bar-wrap').style.display = 'none';
  document.getElementById('pss-bulk-prog-bar').style.width = '0%';

  const sendBtn = document.getElementById('pss-bulk-send-btn');
  sendBtn.disabled  = false;
  sendBtn.style.background = '';
  sendBtn.style.color = '';
  sendBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡 일괄 발송 시작';
  sendBtn.onclick = confirmPssBulkSend;

  const cancelBtn = document.getElementById('pss-bulk-cancel-btn');
  cancelBtn.disabled    = false;
  cancelBtn.textContent = '닫기';

  document.getElementById('pss-bulk-modal').classList.add('open');
}

function closePssBulkModal(){
  if(_pssBulkSendRunning){ if(!confirm('발송이 진행 중입니다. 닫으시겠습니까?')) return; _pssBulkSendRunning = false; }
  document.getElementById('pss-bulk-modal').classList.remove('open');
}

/* 개별 이메일 발송 */
async function _pssEmailSend(i){
  if(_pssBulkSendRunning) return;
  const item = _pssBulkSendItems[i];
  if(!item || !item.email) return;

  const yr    = _pssYM.year;
  const mo    = _pssYM.month;
  const moStr = String(mo).padStart(2,'0');

  // 버튼 비활성 처리
  const actionCell = document.getElementById(`pss-baction-${i}`);
  if(actionCell) actionCell.innerHTML = '<span style="color:#6b7280;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> 처리 중...</span>';

  try{
    // PDF 생성
    const blob     = await _generatePayslipBlob(item.payrollId);
    const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const file     = new File([blob], fileName, { type:'application/pdf' });

    // 이메일 발송 (stub)
    await _sendEmailWithAttachment(item.email, fileName, file);

    // 발송 로그 저장
    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          'psl_' + Date.now() + '_' + (item.empId||''),
        company_id:  _pssCompanyId,
        employee_id: item.empId,
        payroll_id:  item.payrollId,
        pay_year:    yr,
        pay_month:   mo,
        sent_at:     new Date().toISOString(),
        sent_by:     sentBy,
        send_method: 'email',
        note:        `이메일 발송 (${item.email})`
      })
    });

    // 확인 메시지 → 행 제거
    alert(`${item.empName}의 ${yr}년 ${mo}월 급여명세서를 이메일로 발송하였습니다.`);
    _pssBulkSendItems.splice(i, 1);
    _pssBulkRenderTable();
    _pssCheckAllDone();
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[이메일 발송 실패]', err);
    toast(`✖ ${item.empName} 이메일 발송 실패`, 'error');
    _pssBulkRenderTable(); // 버튼 복원
  }
}

/* 개별 수동 교부 완료 처리 */
async function _pssManualDone(i){
  const item = _pssBulkSendItems[i];
  if(!item) return;

  const yr = _pssYM.year;
  const mo = _pssYM.month;

  const ok = confirm(`${item.empName}의 ${yr}년 ${mo}월 급여명세서를 수동 교부 완료한 것으로 기록하고 미발송 내역에서 제외하겠습니까?`);
  if(!ok) return;

  try{
    const sentBy = sessionStorage.getItem('admin_username') || 'admin';
    await api('../tables/payroll_send_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          'psl_' + Date.now() + '_' + (item.empId||''),
        company_id:  _pssCompanyId,
        employee_id: item.empId,
        payroll_id:  item.payrollId,
        pay_year:    yr,
        pay_month:   mo,
        sent_at:     new Date().toISOString(),
        sent_by:     sentBy,
        send_method: 'manual',
        note:        '수동 교부 완료'
      })
    });

    _pssBulkSendItems.splice(i, 1);
    _pssBulkRenderTable();
    _pssCheckAllDone();
    toast(`✔ ${item.empName} 수동 교부 완료 처리됐습니다.`, 'success');
    renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
  } catch(err){
    console.error('[수동 교부 저장 실패]', err);
    toast('저장 중 오류가 발생했습니다.', 'error');
  }
}

/* 전체 완료 여부 체크 → 목록이 비면 발송 버튼 비활성 */
function _pssCheckAllDone(){
  if(_pssBulkSendItems.length === 0){
    const btn = document.getElementById('pss-bulk-send-btn');
    if(btn){
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> 전체 처리 완료';
      btn.style.background = 'linear-gradient(135deg,#059669,#047857)';
      btn.style.color = '#fff'; // disabled CSS를 override해야 하므로 인라인 유지
    }
  }
}

// ─── 일괄 발송 처리 (발송 시작 버튼) — kakao 전용 ───
async function confirmPssBulkSend(){
  if(_pssBulkSendRunning) return;
  if(!_pssBulkSendItems.length){ toast('발송 대상이 없습니다.', 'error'); return; }

  const sentBy = sessionStorage.getItem('admin_username') || 'admin';
  const yr     = _pssYM.year;
  const mo     = _pssYM.month;
  const moStr  = String(mo).padStart(2,'0');

  const sendBtn   = document.getElementById('pss-bulk-send-btn');
  const cancelBtn = document.getElementById('pss-bulk-cancel-btn');

  // ── kakao: PDF 생성 → 발송 → 로그 저장 순차 플로우 ──
  _pssBulkSendRunning = true;

  sendBtn.disabled   = true;
  sendBtn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> 발송 중...';
  cancelBtn.disabled = true;

  // 진행 바 표시
  const progBarWrap = document.getElementById('pss-bulk-progress-bar-wrap');
  progBarWrap.style.display = 'block';
  _pssBulkUpdateProgress();

  let successCnt = 0, failCnt = 0;

  for(let i = 0; i < _pssBulkSendItems.length; i++){
    if(!_pssBulkSendRunning) break;
    const item = _pssBulkSendItems[i];
    if(item.status === 'success') continue; // 재시도 시 성공 건 스킵

    // ① PDF 생성
    _pssBulkSetStatus(i, 'generating');
    document.getElementById(`pss-brow-${i}`)?.scrollIntoView({ block:'nearest' });
    let blob;
    try{
      blob = await _generatePayslipBlob(item.payrollId);
    } catch(err){
      console.error(`[PDF 생성 실패] ${item.empName}`, err);
      _pssBulkSetStatus(i, 'fail'); failCnt++; _pssBulkUpdateProgress(); continue;
    }

    // ② 카카오 알림톡 발송
    _pssBulkSetStatus(i, 'sending');
    const fileName = `${item.empName}_${yr}년${moStr}월_급여명세서.pdf`;
    const pdfFile  = new File([blob], fileName, { type:'application/pdf' });
    try{
      await _sendKakaoAlimtalk(item.phone, fileName, pdfFile);
    } catch(err){
      console.error(`[카카오 발송 실패] ${item.empName}`, err);
      _pssBulkSetStatus(i, 'fail'); failCnt++; _pssBulkUpdateProgress(); continue;
    }

    // ③ 로그 저장
    const logBody = {
      id:          'psl_' + Date.now() + '_' + item.empId,
      company_id:  _pssCompanyId,
      employee_id: item.empId,
      payroll_id:  item.payrollId,
      pay_year:    yr,
      pay_month:   mo,
      sent_at:     new Date().toISOString(),
      sent_by:     sentBy,
      send_method: 'kakao',
      note:        '급여명세서 발송 관리에서 일괄 발송'
    };
    try{
      await api('../tables/payroll_send_logs', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(logBody) });
      _pssSendLogs.push(logBody);
      _allSendLogs.push(logBody);
    } catch(e){ console.warn('[발송 로그 저장 실패]', e); }
    _updateDashUnsentBanner();

    _pssBulkSetStatus(i, 'success');
    successCnt++;
    _pssBulkUpdateProgress();
  }

  _pssBulkSendRunning = false;
  cancelBtn.disabled    = false;
  cancelBtn.textContent = '닫기';

  if(failCnt === 0){
    sendBtn.disabled  = true;
    sendBtn.innerHTML = '<i class="fas fa-check-circle"></i> 전체 발송 완료';
    sendBtn.style.background = 'linear-gradient(135deg,#059669,#047857)';
    sendBtn.style.color = '#fff';
    document.getElementById('pss-bulk-prog-label').textContent = '전체 발송 완료! ✅';
    toast(`✅ 전체 ${successCnt}명 알림톡 발송 완료!`, 'success');
  } else {
    sendBtn.disabled  = false;
    sendBtn.style.background = '';
    sendBtn.style.color = '';
    sendBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 알림톡 재발송 (실패 건만)';
    sendBtn.onclick = confirmPssBulkSend; // 재호출 시 success 건 스킵
    document.getElementById('pss-bulk-prog-label').textContent = `발송 완료 — 성공 ${successCnt}명 / 실패 ${failCnt}명`;
    toast(`⚠ 발송 완료: ${successCnt}명 성공, ${failCnt}명 실패`, 'error');
  }

  renderPssUnsentList(); renderPssLogs(); renderPssMonthTabs(); _pssUpdateStats();
}

/* ══════════════════════════════════════════
   관리자 계정 관리 페이지
══════════════════════════════════════════ */

let _aaAccounts = []; // 캐시

/* ── 목록 렌더 ── */
async function renderAdminAccounts(){
  const tbody = document.getElementById('aa-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#aaa;"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</td></tr>';

  // 신규 등록 버튼: 마스터 관리자(admin)만 표시
  const isMasterSession = sessionStorage.getItem('admin_username') === 'admin';
  const addBtn = document.getElementById('aa-add-btn');
  if(addBtn) addBtn.style.display = isMasterSession ? '' : 'none';

  try{
    const res  = await fetch('../tables/admin_accounts?limit=200&sort=created_at');
    const data = await res.json();
    _aaAccounts = data.data || [];
    _aaRenderTable();
  } catch(e){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#ef4444;">불러오기 실패</td></tr>';
  }
}

function _aaRenderTable(){
  const tbody           = document.getElementById('aa-tbody');
  const current         = sessionStorage.getItem('admin_username');
  const isMasterSession = current === 'admin';
  if(!_aaAccounts.length){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#aaa;">등록된 계정이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = _aaAccounts.map((a, i)=>{
    const isMaster = a.username === 'admin';
    const isSelf   = a.username === current;
    const isLast   = _aaAccounts.length === 1;

    // ── 삭제 버튼 ──
    const delReason = isMaster ? '마스터 관리자 계정은 삭제할 수 없습니다'
                    : isSelf   ? '현재 접속 중인 계정입니다'
                    : isLast   ? '마지막 계정은 삭제할 수 없습니다' : '';
    const delBtn = delReason
      ? `<button class="btn btn-sm btn-icon" disabled title="${delReason}"
           style="background:#f3f4f6;color:#d1d5db;cursor:not-allowed;">
           <i class="fas fa-trash-alt"></i></button>`
      : `<button class="btn btn-danger btn-sm btn-icon"
           onclick="deleteAdminAccount('${a.id}','${_esc(a.username)}')"
           title="계정 삭제">
           <i class="fas fa-trash-alt"></i></button>`;

    // ── 표시 이름 변경 버튼 (마스터 세션 + 마스터 계정 행만) ──
    const nameBtn = (isMasterSession && isMaster)
      ? `<button class="btn btn-sm btn-icon" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;"
           onclick="openChangeNameModal('${a.id}','${_esc(a.display_name||a.username)}')"
           title="표시 이름 변경">
           <i class="fas fa-pen"></i></button>`
      : '';

    // ── 비밀번호 변경 버튼 (마스터 세션 + 본인 제외) ──
    const pwBtn = isMasterSession
      ? (isSelf
          ? `<button class="btn btn-sm btn-icon" disabled title="본인 계정은 변경 대상에서 제외됩니다"
               style="background:#f3f4f6;color:#d1d5db;cursor:not-allowed;">
               <i class="fas fa-key"></i></button>`
          : `<button class="btn btn-warning btn-sm btn-icon"
               onclick="openChangePwModal('${a.id}','${_esc(a.username)}','${_esc(a.display_name||a.username)}')"
               title="비밀번호 변경">
               <i class="fas fa-key"></i></button>`)
      : '';

    // ── 배지 ──
    const masterBadge = isMaster
      ? '<span class="badge badge-red" style="margin-left:6px;font-size:10px;"><i class="fas fa-crown" style="margin-right:2px;"></i>마스터</span>' : '';
    const selfBadge = isSelf
      ? '<span class="badge badge-blue" style="margin-left:6px;font-size:10px;">접속 중</span>' : '';

    // ── 등록일 ──
    const dt    = a.created_at ? new Date(Number(a.created_at)) : null;
    const dtStr = dt ? dt.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})
                     : (a.created_at_label || '-');

    return `<tr>
      <td style="color:#aaa;font-size:12px;">${i+1}</td>
      <td style="font-weight:700;color:#1a1a2e;">${_esc(a.username)}${masterBadge}${selfBadge}</td>
      <td style="color:#374151;">${_esc(a.display_name||'-')}</td>
      <td style="color:#6b7280;font-size:12px;">${dtStr}</td>
      <td style="text-align:center;">
        <div style="display:inline-flex;gap:5px;align-items:center;">
          ${nameBtn}
          ${pwBtn}
          ${delBtn}
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── XSS 방지 이스케이프 ── */
function _esc(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── 신규 계정 등록 모달 열기 (마스터만 허용) ── */
function openAdminAccountModal(){
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 신규 계정을 등록할 수 있습니다.', 'error');
    return;
  }
  ['aa-input-id','aa-input-name','aa-input-pw','aa-input-pw2'].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.value=''; el.style.borderColor=''; }
  });
  ['aa-err-id','aa-err-name','aa-err-pw','aa-err-pw2'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display='none';
  });
  // eye 초기화
  ['aa-input-pw','aa-input-pw2'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.type = 'password';
  });
  document.getElementById('aa-eye1').className = 'fas fa-eye';
  document.getElementById('aa-eye2').className = 'fas fa-eye';
  openModal('admin-account-modal');
  setTimeout(()=>document.getElementById('aa-input-id').focus(), 150);
}

/* ── 모달 내 눈 토글 ── */
function aaTogglePw(inputId, iconId){
  const el   = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if(el.type==='password'){ el.type='text';     icon.className='fas fa-eye-slash'; }
  else                    { el.type='password'; icon.className='fas fa-eye';       }
}

/* ── 인라인 에러 표시 헬퍼 ── */
function _aaFieldErr(inputId, errId, msg){
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errId);
  if(inp) inp.style.borderColor = '#ef4444';
  if(err){ err.textContent = msg; err.style.display = 'block'; }
  if(inp) inp.focus();
}
function _aaFieldOk(inputId, errId){
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errId);
  if(inp) inp.style.borderColor = '';
  if(err) err.style.display = 'none';
}

/* ── 신규 계정 저장 ── */
async function saveAdminAccount(){
  const idVal   = document.getElementById('aa-input-id').value.trim();
  const nameVal = document.getElementById('aa-input-name').value.trim();
  const pwVal   = document.getElementById('aa-input-pw').value;
  const pw2Val  = document.getElementById('aa-input-pw2').value;

  // 초기화
  ['aa-input-id','aa-input-name','aa-input-pw','aa-input-pw2'].forEach(id=>_aaFieldOk(id, id.replace('input','err')));

  // 유효성 검사
  if(!idVal){        _aaFieldErr('aa-input-id',  'aa-err-id',  '아이디를 입력하세요.'); return; }
  if(!/^[a-zA-Z0-9_]{4,20}$/.test(idVal)){
    _aaFieldErr('aa-input-id','aa-err-id','영문·숫자·밑줄(_) 4~20자로 입력하세요.'); return;
  }
  if(!nameVal){      _aaFieldErr('aa-input-name','aa-err-name','표시 이름을 입력하세요.'); return; }
  if(!pwVal){        _aaFieldErr('aa-input-pw',  'aa-err-pw',  '비밀번호를 입력하세요.'); return; }
  if(pwVal.length < 8){ _aaFieldErr('aa-input-pw','aa-err-pw','비밀번호는 8자 이상이어야 합니다.'); return; }
  if(pwVal !== pw2Val){ _aaFieldErr('aa-input-pw2','aa-err-pw2','비밀번호가 일치하지 않습니다.'); return; }

  // 중복 아이디 검사
  const dup = _aaAccounts.find(a => a.username === idVal);
  if(dup){ _aaFieldErr('aa-input-id','aa-err-id','이미 사용 중인 아이디입니다.'); return; }

  // 저장
  const saveBtn = document.querySelector('#admin-account-modal .btn-primary');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
  try{
    const now = new Date();
    const label = now.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'});
    await fetch('../tables/admin_accounts', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username: idVal, password: pwVal, display_name: nameVal, created_at_label: label })
    });
    closeModal('admin-account-modal');
    toast('계정이 등록되었습니다.', 'success');
    await renderAdminAccounts();
  } catch(e){
    toast('저장에 실패했습니다.', 'error');
  } finally{
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-check"></i> 등록';
  }
}

/* ── 계정 삭제 ── */
async function deleteAdminAccount(id, username){
  if(username === 'admin'){
    toast('마스터 관리자 계정은 삭제할 수 없습니다.', 'error'); return;
  }
  if(_aaAccounts.length <= 1){
    toast('마지막 계정은 삭제할 수 없습니다.', 'error'); return;
  }
  if(!confirm(`'${username}' 계정을 삭제하시겠습니까?\n삭제 후 해당 계정으로 로그인할 수 없습니다.`)) return;
  try{
    await fetch('../tables/admin_accounts/' + id, { method: 'DELETE' });
    toast('계정이 삭제되었습니다.', 'success');
    await renderAdminAccounts();
  } catch(e){
    toast('삭제에 실패했습니다.', 'error');
  }
}

/* ── 표시 이름 변경 모달 열기 (마스터 전용) ── */
let _cnmTargetId = null;

function openChangeNameModal(id, currentName){
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 표시 이름을 변경할 수 있습니다.', 'error'); return;
  }
  _cnmTargetId = id;

  const inp = document.getElementById('aa-name-input');
  const err = document.getElementById('aa-name-err');
  if(inp){ inp.value = currentName || ''; inp.style.borderColor = ''; }
  if(err) err.style.display = 'none';

  const btn = document.getElementById('aa-name-submit-btn');
  if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 변경'; }

  openModal('aa-name-change-modal');
  setTimeout(()=>{ const el = document.getElementById('aa-name-input'); if(el){ el.focus(); el.select(); } }, 150);
}

/* ── 표시 이름 변경 저장 ── */
async function submitChangeName(){
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 표시 이름을 변경할 수 있습니다.', 'error'); return;
  }
  if(!_cnmTargetId){ toast('대상 계정 정보가 없습니다.', 'error'); return; }

  const inp = document.getElementById('aa-name-input');
  const err = document.getElementById('aa-name-err');
  const val = (inp?.value || '').trim();

  // 유효성 검사
  if(inp) inp.style.borderColor = '';
  if(err) err.style.display = 'none';
  if(!val){
    if(inp) inp.style.borderColor = '#ef4444';
    if(err){ err.textContent = '표시 이름을 입력하세요.'; err.style.display = 'block'; }
    if(inp) inp.focus();
    return;
  }
  if(val.length > 20){
    if(inp) inp.style.borderColor = '#ef4444';
    if(err){ err.textContent = '20자 이하로 입력하세요.'; err.style.display = 'block'; }
    if(inp) inp.focus();
    return;
  }

  const btn = document.getElementById('aa-name-submit-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try{
    await fetch('../tables/admin_accounts/' + _cnmTargetId, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ display_name: val })
    });

    // ① 로컬 캐시 동기화 (allAdminAccounts)
    const cached = allAdminAccounts.find(a => a.id === _cnmTargetId);
    if(cached) cached.display_name = val;

    // ② sessionStorage 동기화 (마스터 본인 계정이므로 항상 해당)
    sessionStorage.setItem('admin_display_name', val);

    // ③ topbar 텍스트 + data-name 갱신
    _alnUpdateTopbar();

    closeModal('aa-name-change-modal');
    toast('표시 이름이 변경되었습니다.', 'success');
    _cnmTargetId = null;
    await renderAdminAccounts();   // 테이블 즉시 갱신
  } catch(e){
    toast('저장에 실패했습니다.', 'error');
    if(btn){ btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 변경'; }
  }
}

/* ── 비밀번호 변경 모달 열기 ── */
let _cpwTargetId = null;

function openChangePwModal(id, username, displayName){
  // 마스터 세션 이중 검사
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 비밀번호를 변경할 수 있습니다.', 'error'); return;
  }
  _cpwTargetId = id;

  // 대상 계정 정보 표시
  const info = document.getElementById('aa-cpw-target-info');
  info.innerHTML = `<i class="fas fa-user-circle" style="color:#6366f1;margin-right:7px;"></i>`
    + `<strong>${_esc(displayName)}</strong>`
    + `<span style="color:#9ca3af;margin-left:6px;font-size:12px;">(${_esc(username)})</span>`
    + ` 계정의 비밀번호를 변경합니다.`;

  // username hidden 동기화 (브라우저 autocomplete 경고 방지)
  document.getElementById('aa-cpw-username-hidden').value = username;

  // 필드·에러 초기화
  ['aa-cpw-new','aa-cpw-new2'].forEach(id=>{
    const el = document.getElementById(id);
    el.value = ''; el.type = 'password'; el.style.borderColor = '';
  });
  document.getElementById('aa-cpw-eye1').className = 'fas fa-eye';
  document.getElementById('aa-cpw-eye2').className = 'fas fa-eye';
  ['aa-cpw-err-new','aa-cpw-err-new2'].forEach(id=>{
    document.getElementById(id).style.display = 'none';
  });

  const btn = document.getElementById('aa-cpw-submit-btn');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> 변경';

  openModal('aa-pw-change-modal');
  setTimeout(()=> document.getElementById('aa-cpw-new').focus(), 150);
}

/* ── 비밀번호 변경 인라인 에러 헬퍼 ── */
function _cpwFieldErr(inputId, errId, msg){
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errId);
  inp.style.borderColor = '#ef4444';
  err.textContent = msg; err.style.display = 'block';
  inp.focus();
}
function _cpwFieldOk(inputId, errId){
  document.getElementById(inputId).style.borderColor = '';
  document.getElementById(errId).style.display = 'none';
}

/* ── 비밀번호 변경 저장 ── */
async function submitChangePw(){
  if(sessionStorage.getItem('admin_username') !== 'admin'){
    toast('마스터 관리자만 비밀번호를 변경할 수 있습니다.', 'error'); return;
  }
  if(!_cpwTargetId){ toast('대상 계정 정보가 없습니다.', 'error'); return; }

  const newPw  = document.getElementById('aa-cpw-new').value;
  const newPw2 = document.getElementById('aa-cpw-new2').value;

  // 초기화
  _cpwFieldOk('aa-cpw-new',  'aa-cpw-err-new');
  _cpwFieldOk('aa-cpw-new2', 'aa-cpw-err-new2');

  // 유효성 검사
  if(!newPw){              _cpwFieldErr('aa-cpw-new',  'aa-cpw-err-new',  '새 비밀번호를 입력하세요.'); return; }
  if(newPw.length < 8){   _cpwFieldErr('aa-cpw-new',  'aa-cpw-err-new',  '비밀번호는 8자 이상이어야 합니다.'); return; }
  if(!newPw2){             _cpwFieldErr('aa-cpw-new2', 'aa-cpw-err-new2', '비밀번호 확인을 입력하세요.'); return; }
  if(newPw !== newPw2){    _cpwFieldErr('aa-cpw-new2', 'aa-cpw-err-new2', '비밀번호가 일치하지 않습니다.'); return; }

  const btn = document.getElementById('aa-cpw-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

  try{
    await fetch('../tables/admin_accounts/' + _cpwTargetId, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ password: newPw })
    });
    closeModal('aa-pw-change-modal');
    toast('비밀번호가 변경되었습니다.', 'success');
    _cpwTargetId = null;
  } catch(e){
    toast('저장에 실패했습니다.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> 변경';
  }
}

// ══════════════════════════════════════════════════════════════════════
// 계약만료 통지 관리 (CEN = Contract Expiry Notice)
// ══════════════════════════════════════════════════════════════════════

/** 전역 상태 */
let _cenNoticeList  = [];   // contract_expiry_notice 테이블 캐시
let _cenHistoryLoaded = false;
let _cenTab         = 'target';  // 현재 탭
let _cenTargetPage  = 1;
let _cenHistoryPage = 1;
const CEN_PAGE_SIZE = 20;
const CEN_NOTICE_DAYS = 29;  // 만료 N일 전 통지 대상

/** 탭 전환 */
function cenSwitchTab(tab){
  _cenTab = tab;
  document.getElementById('cen-tab-target').classList.toggle('active',   tab==='target');
  document.getElementById('cen-tab-history').classList.toggle('active',  tab==='history');
  document.getElementById('cen-tab-template').classList.toggle('active', tab==='template');
  document.getElementById('cen-panel-target').style.display   = tab==='target'   ? '' : 'none';
  document.getElementById('cen-panel-history').style.display  = tab==='history'  ? '' : 'none';
  document.getElementById('cen-panel-template').style.display = tab==='template' ? '' : 'none';
  if(tab==='history'){
    if(!_cenHistoryLoaded){
      (async()=>{ await cenLoadHistory(true); renderCenHistory(); })();
    } else {
      renderCenHistory();
    }
  }
  if(tab==='template'){
    _cenFillTemplateSampleSel();
    renderCenTemplate();
  }
}

// ══════════════════════════════════════════════════════════════════
//  메시지 예시 탭 — 알림톡 / 이메일 템플릿 미리보기
// ══════════════════════════════════════════════════════════════════

/**
 * 샘플 선택 셀렉트 채우기
 * - 현재 통지 대상 목록(_cenNoticeList)을 옵션으로 제공
 * - 목록이 없으면 "예시 데이터로 보기"만 유지
 */
function _cenFillTemplateSampleSel(){
  const sel = document.getElementById('cen-tmpl-sample-sel');
  if(!sel) return;
  sel.innerHTML = '<option value="__demo__">— 예시 데이터로 보기 —</option>';
  (_cenNoticeList || []).forEach(item => {
    const emp = item.emp || {}, co = item.co || {};
    const opt = document.createElement('option');
    opt.value       = item.c?.id || '';
    opt.textContent = `${emp.name||'(이름없음)'} · ${item.cat||''} · ${co.company_name||''} · D-${item.daysLeft}`;
    sel.appendChild(opt);
  });
}

/**
 * 메시지 템플릿 렌더링
 * 근로자용(알림톡·이메일) + 고객사용(인앱 알림) 두 섹션 모두 갱신
 */
function renderCenTemplate(){
  const sel    = document.getElementById('cen-tmpl-sample-sel');
  const selVal = sel ? sel.value : '__demo__';

  // ── 1. 데이터 준비 ────────────────────────────────────────────
  let empName='홍길동', catLabel='계약직', coName='(주)샘플코리아',
      coRep='김대표', contractEnd='2025-07-18', daysLeft=29,
      phone='010-1234-5678', email='sample@example.com',
      adminPhone='02-000-0000', adminEmail='labor@example.com';

  if(selVal !== '__demo__'){
    const item = (_cenNoticeList||[]).find(x => x.c?.id === selVal);
    if(item){
      empName     = item.emp?.name          || empName;
      catLabel    = item.cat                || catLabel;
      coName      = item.co?.company_name   || coName;
      coRep       = item.co?.representative || coRep;
      contractEnd = item.c?.contract_end    || contractEnd;
      daysLeft    = item.daysLeft           ?? daysLeft;
      phone       = item.emp?.phone         || phone;
      email       = item.emp?.email         || email;
    }
  }

  const [ey,em,ed] = contractEnd.split('-');
  const endKr    = `${parseInt(ey)}년 ${parseInt(em)}월 ${parseInt(ed)}일`;
  const ddayStr  = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
  const ddayClass= daysLeft <= 7 ? 'urgent' : daysLeft <= 14 ? 'soon' : 'normal';

  // 긴급도별 문구
  const urgencyWorker  = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박했습니다. 빠른 확인이 필요합니다.'
                       : daysLeft <= 14 ? '조속한 확인을 부탁드립니다.'
                       :                 '충분한 준비 기간이 있으니 미리 확인해 주세요.';
  const urgencyCompany = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박하였습니다. 즉시 갱신 여부를 결정해 주세요.'
                       : daysLeft <= 14 ? '조속히 갱신 또는 종료 여부를 확인해 주시기 바랍니다.'
                       :                 '미리 갱신 여부를 검토하시어 원활한 인사 관리가 되시길 바랍니다.';

  // ── 2. 근로자 — 알림톡 ────────────────────────────────────────
  const kakaoBody =
`안녕하세요, ${empName}님.

귀하의 근로계약이 곧 만료될 예정입니다.

■ 고용형태: ${catLabel}
■ 만료 예정일: ${endKr}
■ 남은 기간: ${ddayStr}

${urgencyWorker}
계약 갱신 또는 종료 여부를 담당 노무사와 미리 상의해 주시기 바랍니다.`;

  const kakaoFooter =
`※ 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 계약만료 사전 통지입니다.
문의: ${adminPhone}`;

  // ── 3. 근로자 — 이메일 ────────────────────────────────────────
  const emailSubject = `[계약만료 안내] ${empName}님의 ${catLabel} 계약이 ${ddayStr} 후 만료됩니다`;
  const emailIntro =
`항상 성실히 근무해 주셔서 감사합니다.

귀하의 근로계약 만료일이 다가와 사전에 안내드립니다.
${urgencyWorker}`;

  const emailBody2 =
`계약 갱신을 희망하시거나 만료 처리에 관한 문의 사항이 있으시면 담당 노무사에게 연락해 주시기 바랍니다.

고용 유지 또는 종료 여부와 관계없이 퇴직금, 실업급여 등 귀하의 권리를 충분히 안내해 드리겠습니다.`;

  const emailNotice =
`본 메일은 「기간제 및 단시간근로자 보호 등에 관한 법률」 및 근로기준법에 따른 계약만료 사전 통지 메일입니다.
수신을 원하지 않으시면 담당자에게 문의해 주세요.`;

  // ── 4. 고객사 — 인앱 알림 ────────────────────────────────────
  const inappTitle  = `[계약만료 예정] ${empName} ${catLabel} — ${ddayStr}`;
  const inappShort  = `${empName}(${catLabel})님 계약이 ${endKr} 만료됩니다. (${ddayStr})`;

  const inappFullBody =
`안녕하세요, ${coName} ${coRep} 사장님.

소속 직원의 근로계약 만료일이 다가와 안내드립니다.
${urgencyCompany}`;

  const inappFoot =
`담당 노무사에게 갱신 여부를 확인해 주세요.
문의: ${adminPhone} / ${adminEmail}
※ 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 사전 통지`;

  // ── 5. DOM 반영: 근로자 알림톡 ──────────────────────────────
  _setText('cen-tmpl-kakao-body',   kakaoBody);
  _setText('cen-tmpl-kakao-footer', kakaoFooter);

  // ── 6. DOM 반영: 근로자 이메일 ──────────────────────────────
  _setText('cen-tmpl-email-subject',  `📋 ${emailSubject}`);
  _setText('cen-tmpl-email-to',       `수신: ${email || '이메일 미등록'}`);
  _setText('cen-tmpl-email-greeting', `안녕하세요, ${empName}님.`);
  _setText('cen-tmpl-email-intro',    emailIntro);
  _setText('cen-tmpl-email-body2',    emailBody2);
  _setText('cen-tmpl-email-notice',   emailNotice);
  _setText('cen-tmpl-email-footer',   `${coName} 담당 노무사 · ${adminPhone} · ${adminEmail}`);

  const infoBox = document.getElementById('cen-tmpl-email-infobox');
  if(infoBox) infoBox.innerHTML = `
    <div class="cen-email-info-row"><span class="cen-email-info-label">직원명</span><span class="cen-email-info-val">${empName}</span></div>
    <div class="cen-email-info-row"><span class="cen-email-info-label">고용형태</span><span class="cen-email-info-val">${catLabel}</span></div>
    <div class="cen-email-info-row"><span class="cen-email-info-label">소속 회사</span><span class="cen-email-info-val">${coName}</span></div>
    <div class="cen-email-info-row">
      <span class="cen-email-info-label">계약 만료일</span>
      <span class="cen-email-info-val">${endKr} <span class="cen-email-dday-badge ${ddayClass}">${ddayStr}</span></span>
    </div>`;

  // ── 7. DOM 반영: 고객사 인앱 알림 ───────────────────────────
  _setText('cen-tmpl-inapp-title',      inappTitle);
  _setText('cen-tmpl-inapp-body',       inappShort);
  _setText('cen-tmpl-inapp-full-title', inappTitle);
  _setText('cen-tmpl-inapp-full-body',  inappFullBody);
  _setText('cen-tmpl-inapp-foot',       inappFoot);

  const inappInfoBox = document.getElementById('cen-tmpl-inapp-infobox');
  if(inappInfoBox) inappInfoBox.innerHTML = `
    <div class="cen-email-info-row"><span class="cen-email-info-label">직원명</span><span class="cen-email-info-val">${empName}</span></div>
    <div class="cen-email-info-row"><span class="cen-email-info-label">고용형태</span><span class="cen-email-info-val">${catLabel}</span></div>
    <div class="cen-email-info-row">
      <span class="cen-email-info-label">계약 만료일</span>
      <span class="cen-email-info-val">${endKr} <span class="cen-email-dday-badge ${ddayClass}">${ddayStr}</span></span>
    </div>`;

  // 시간 표시
  const now = new Date();
  _setText('cen-tmpl-inapp-time', `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);

  // ── 8. 변수 안내 테이블 ──────────────────────────────────────
  const vars = [
    ['{직원명}',     '수신 근로자의 이름',                    empName,           '근로자·고객사 공통'],
    ['{고용형태}',   '계약직 / 계약직(수습) / 일용직',         catLabel,          '근로자·고객사 공통'],
    ['{회사명}',     '소속 고객사 회사명',                    coName,            '근로자·고객사 공통'],
    ['{대표자명}',   '고객사 대표자명 (사장님 호칭)',           coRep,             '고객사 전용'],
    ['{계약만료일}', '계약 종료일 (YYYY년 MM월 DD일)',         endKr,             '근로자·고객사 공통'],
    ['{남은기간}',   'D-day 형식 (D-29 ~ D-0)',              ddayStr,           '근로자·고객사 공통'],
    ['{수신번호}',   '알림톡 수신 직원 휴대폰 번호',            phone||'미등록',   '근로자 알림톡'],
    ['{수신이메일}', '이메일 수신 직원 이메일 주소',             email||'미등록',   '근로자 이메일'],
    ['{긴급도_근로자}', '남은 기간별 근로자 촉구 문구',         urgencyWorker,     '근로자 전용'],
    ['{긴급도_고객사}', '남은 기간별 고객사 촉구 문구',         urgencyCompany,    '고객사 전용'],
  ];
  const tbody = document.getElementById('cen-tmpl-var-tbody');
  if(tbody){
    tbody.innerHTML = vars.map(([v, desc, ex, target]) => `
      <tr>
        <td><span class="cen-var-chip">${v}</span></td>
        <td style="color:#374151;">${desc}</td>
        <td style="color:#6b7280;font-size:11.5px;">${ex}</td>
        <td><span style="background:#f3f4f6;color:#374151;border-radius:20px;padding:1px 8px;font-size:10.5px;font-weight:600;white-space:nowrap;">${target}</span></td>
      </tr>`).join('');
  }

  // 변수 안내 헤더도 컬럼 추가 반영
  const varHead = document.querySelector('#cen-tmpl-var-tbody')?.closest('table')?.querySelector('thead tr');
  if(varHead && varHead.children.length === 3){
    const th = document.createElement('th');
    th.textContent = '적용 대상';
    varHead.appendChild(th);
  }
}

/** 텍스트 설정 헬퍼 */
function _setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

/** showPage 진입 시 초기화 */
async function initCenPage(){
  // 고객사 필터 옵션 채우기
  _cenFillCompanyFilter('cen-filter-company');
  _cenFillCompanyFilter('cen-log-filter-company');
  // 통지 이력 로드 (캐시 없으면)
  if(!_cenHistoryLoaded) await cenLoadHistory(true);
  // 통지 대상 렌더
  renderCenTargetList();
  renderCenStats();
}

/** 고객사 필터 select 옵션 자동 채우기 */
function _cenFillCompanyFilter(selId){
  const sel = document.getElementById(selId);
  if(!sel || sel.options.length > 1) return;
  allCompanies
    .filter(c => c.status === '이용중')
    .sort((a,b)=>(a.company_name||'').localeCompare(b.company_name||'','ko'))
    .forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.company_name || c.id;
      sel.appendChild(opt);
    });
}

/** 통지 이력 DB에서 로드 */
async function cenLoadHistory(force=false){
  if(!force && _cenHistoryLoaded) return;
  try{
    const res = await fetch('../tables/contract_expiry_notice?page=1&limit=1000');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _cenNoticeList = (data.data || []).sort((a,b)=>{
      const ta = a.noticed_at || a.created_at || '';
      const tb = b.noticed_at || b.created_at || '';
      return tb.localeCompare(ta);
    });
    _cenHistoryLoaded = true;
  } catch(e){
    console.error('[CEN 이력 로드 오류]', e);
    _cenNoticeList = [];
  }
}

/**
 * 통지 대상 계산
 * 조건: 계약직/계약직수습/일용직 + 활성 + 만료일이 오늘~29일 후 + is_draft=false + status≠파기/해지/만료
 */
function _cenGetTargetContracts(){
  const today = new Date();
  today.setHours(0,0,0,0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + CEN_NOTICE_DAYS);

  // 이미 통지한 contract_id 집합 (이번 달 통지 기준)
  const nowYM = new Date().toISOString().slice(0,7); // 'YYYY-MM'
  const noticedThisMonth = new Set(
    _cenNoticeList
      .filter(r => (r.noticed_at || r.created_at || '').slice(0,7) === nowYM)
      .map(r => r.contract_id)
      .filter(Boolean)
  );

  return allContracts.filter(c => {
    if(c.is_draft) return false;
    if(['파기','해지','만료','취소','expired','terminated'].includes(c.status)) return false;
    if(c.is_voided_by_amend) return false;
    // 고용형태 확인 (emp.employment_category 우선)
    const emp = allEmployees.find(e=>e.id===c.employee_id);
    const cat = emp?.employment_category || c.contract_type || '';
    if(!['계약직','계약직 수습','일용직'].includes(cat)) return false;
    // 계약 만료일 확인
    if(!c.contract_end) return false;
    const endDate = new Date(c.contract_end);
    endDate.setHours(0,0,0,0);
    if(endDate < today || endDate > limit) return false;
    // 이번 달 이미 통지한 계약 제외
    if(noticedThisMonth.has(c.id)) return false;
    return true;
  }).map(c => {
    const emp = allEmployees.find(e=>e.id===c.employee_id);
    const co  = allCompanies.find(x=>x.id===c.company_id);
    const cat = emp?.employment_category || c.contract_type || '-';
    const endDate = new Date(c.contract_end);
    endDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((endDate - today) / (1000*60*60*24));
    return { ...c, _emp: emp, _co: co, _cat: cat, _daysLeft: daysLeft };
  }).sort((a,b) => a._daysLeft - b._daysLeft); // 만료 임박순
}

/** 요약 통계 업데이트 */
function renderCenStats(){
  const targets = _cenGetTargetContracts();
  const urgent = targets.filter(c=>c._daysLeft<=7).length;
  const soon   = targets.filter(c=>c._daysLeft>=8&&c._daysLeft<=14).length;
  const normal = targets.filter(c=>c._daysLeft>=15).length;

  const nowYM = new Date().toISOString().slice(0,7);
  const done  = _cenNoticeList.filter(r=>(r.noticed_at||r.created_at||'').slice(0,7)===nowYM).length;

  document.getElementById('cen-stat-urgent').textContent = urgent;
  document.getElementById('cen-stat-soon').textContent   = soon;
  document.getElementById('cen-stat-normal').textContent = normal;
  document.getElementById('cen-stat-done').textContent   = done;
  document.getElementById('cen-tab-target-badge').textContent = targets.length;
}

/** 통지 대상 목록 테이블 렌더링 */
function renderCenTargetList(){
  const tbody = document.getElementById('cen-target-tbody');
  if(!tbody) return;

  const filterCompany = document.getElementById('cen-filter-company')?.value || '';
  const filterEmpCat  = document.getElementById('cen-filter-empcat')?.value  || '';
  const filterRange   = document.getElementById('cen-filter-range')?.value   || '';
  const searchQ       = (document.getElementById('cen-search')?.value || '').trim().toLowerCase();

  let list = _cenGetTargetContracts().filter(c => {
    if(filterCompany && c.company_id !== filterCompany) return false;
    if(filterEmpCat  && c._cat !== filterEmpCat) return false;
    if(filterRange === 'urgent' && c._daysLeft > 7) return false;
    if(filterRange === 'soon'   && (c._daysLeft < 8 || c._daysLeft > 14)) return false;
    if(filterRange === 'normal' && c._daysLeft < 15) return false;
    if(searchQ && !(c._emp?.name||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>(a._emp?.name||'').localeCompare(b._emp?.name||'','ko'));

  const totalPages = Math.max(1, Math.ceil(list.length / CEN_PAGE_SIZE));
  if(_cenTargetPage > totalPages) _cenTargetPage = totalPages;
  const pageData = list.slice((_cenTargetPage-1)*CEN_PAGE_SIZE, _cenTargetPage*CEN_PAGE_SIZE);

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="9" class="cen-empty">
      <i class="fas fa-check-circle" style="color:#10b981;"></i>
      29일 이내 계약만료 통지 대상이 없습니다.
    </td></tr>`;
    document.getElementById('cen-target-pagination').innerHTML = '';
    _cenUpdateBulkBtns();
    return;
  }

  const catBadgeCls = {'계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'};
  const fmtDday = (d) => {
    if(d === 0) return `<span class="cen-dday urgent">D-day</span>`;
    const cls = d<=7?'urgent':d<=14?'soon':'normal';
    return `<span class="cen-dday ${cls}">D-${d}</span>`;
  };

  tbody.innerHTML = pageData.map((c, idx) => {
    const globalIdx = (_cenTargetPage-1)*CEN_PAGE_SIZE + idx;
    const empName  = c._emp?.name || '(알 수 없음)';
    const coName   = c._co?.company_name || '-';
    const phone    = c._emp?.phone || '';
    const email    = c._emp?.email || '';
    const hasPhone = !!phone.trim();
    const hasEmail = !!email.trim();
    const kakaoStyle = hasPhone
      ? 'background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    const emailStyle = hasEmail
      ? 'background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;cursor:pointer;'
      : 'background:#f3f4f6;color:#d1d5db;border:1px solid #e5e7eb;cursor:not-allowed;';
    return `<tr>
      <td style="text-align:center;">
        <input type="checkbox" class="cen-chk cen-row-chk" data-idx="${globalIdx}" data-contract-id="${c.id}"
          onchange="cenUpdateSelectedCount()" />
      </td>
      <td style="font-weight:700;color:#1f2937;">${empName}</td>
      <td><span class="badge ${catBadgeCls[c._cat]||'badge-gray'}" style="font-size:11px;">${c._cat}</span></td>
      <td style="font-size:12px;color:#374151;">${coName}</td>
      <td style="font-size:12px;color:#6b7280;font-weight:600;">${c.contract_end}</td>
      <td>${fmtDday(c._daysLeft)}</td>
      <td style="font-size:12px;">${hasPhone ? phone : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="font-size:12px;">${hasEmail ? `<span style="color:#374151;">${email}</span>` : '<span style="color:#d1d5db;">미등록</span>'}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button onclick="cenSendOne('${c.id}','알림톡')" ${hasPhone?'':'disabled'}
          style="${kakaoStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:3px;display:inline-flex;align-items:center;gap:4px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg>알림톡
        </button>
        <button onclick="cenSendOne('${c.id}','이메일')" ${hasEmail?'':'disabled'}
          style="${emailStyle}border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;font-family:inherit;margin-right:3px;">
          ✉ 이메일
        </button>
        <button onclick="cenSendOne('${c.id}','수동배부')"
          style="background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:6px;padding:4px 9px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;">
          ✔ 수동교부
        </button>
      </td>
    </tr>`;
  }).join('');

  // 전체 선택 체크박스 상태 갱신
  document.getElementById('cen-chk-all').checked = false;
  document.getElementById('cen-thead-chk').checked = false;
  cenUpdateSelectedCount();

  // 페이지네이션
  _cenRenderPagination('cen-target-pagination', list.length, _cenTargetPage, 'setCenTargetPage');
}

function setCenTargetPage(p){ _cenTargetPage = p; renderCenTargetList(); }

/** 선택 건수 업데이트 및 일괄 버튼 상태 */
function cenUpdateSelectedCount(){
  const checked = document.querySelectorAll('.cen-row-chk:checked');
  const count = checked.length;
  const el = document.getElementById('cen-selected-count');
  if(el) el.textContent = count > 0 ? `${count}건 선택됨` : '';
  _cenUpdateBulkBtns();
}

function _cenUpdateBulkBtns(){
  const checked = document.querySelectorAll('.cen-row-chk:checked');
  const hasPhone = [...checked].some(chk => {
    const cId = chk.dataset.contractId;
    const c = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    return !!(emp?.phone);
  });
  const hasEmail = [...checked].some(chk => {
    const cId = chk.dataset.contractId;
    const c = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    return !!(emp?.email);
  });
  const kakaoBtn = document.getElementById('cen-btn-bulk-kakao');
  const emailBtn = document.getElementById('cen-btn-bulk-email');
  if(kakaoBtn) kakaoBtn.disabled = !(checked.length > 0 && hasPhone);
  if(emailBtn) emailBtn.disabled = !(checked.length > 0 && hasEmail);
}

/** 전체 선택/해제 */
function cenToggleAll(chkEl){
  const isChecked = chkEl.checked;
  document.querySelectorAll('.cen-row-chk').forEach(c=>{ c.checked = isChecked; });
  // thead/footer 체크박스 동기화
  ['cen-chk-all','cen-thead-chk'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.checked=isChecked;
  });
  cenUpdateSelectedCount();
}

/** 개별 통지 발송 */
async function cenSendOne(contractId, method){
  const c   = allContracts.find(x=>x.id===contractId);
  const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
  const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
  if(!c||!emp||!co){ toast('계약 정보를 찾을 수 없습니다.','error'); return; }

  if(method==='알림톡' && !emp.phone){ toast(`${emp.name} — 전화번호가 등록되지 않았습니다.`,'error'); return; }
  if(method==='이메일' && !emp.email){ toast(`${emp.name} — 이메일이 등록되지 않았습니다.`,'error'); return; }

  const today = new Date(); today.setHours(0,0,0,0);
  const endDate = new Date(c.contract_end); endDate.setHours(0,0,0,0);
  const daysLeft = Math.ceil((endDate-today)/(1000*60*60*24));

  const recipient = method==='알림톡' ? emp.phone : method==='이메일' ? emp.email : '직접배부';
  const confirmMsg = method==='수동배부'
    ? `[수동 교부 완료]\n\n${emp.name} (${co.company_name}) 님의 계약만료 통지를\n직접 교부하셨습니까?\n\n계약 만료일: ${c.contract_end} (D-${daysLeft})`
    : `[계약만료 통지 — ${method}]\n\n${emp.name} (${co.company_name})\n계약 만료일: ${c.contract_end} (D-${daysLeft})\n수신: ${recipient}\n\n발송 후 고객사(${co.company_name}) 앱에도 알림이 함께 전송됩니다.\n\n발송하시겠습니까?`;

  if(!confirm(confirmMsg)) return;
  try{
    // 1) 근로자 통지 이력 저장
    await _cenSaveNotice({ contractId, method, status:'완료', recipient, note:`개별 ${method} — ${emp.name}`, daysLeft });
    // 2) 고객사 인앱 알림 발송 (수동배부 포함 항상 전송)
    await _cenSendCompanyNotice({ c, emp, co, daysLeft });
    toast(`✅ ${emp.name} 계약만료 통지(${method}) 완료 + 고객사 알림 발송`, 'success');
    await cenRefresh();
  } catch(e){ console.error(e); toast('발송 중 오류가 발생했습니다.','error'); }
}

/** 일괄 발송 */
async function cenBulkSend(method){
  const checked = [...document.querySelectorAll('.cen-row-chk:checked')];
  if(!checked.length){ toast('발송할 항목을 선택하세요.','warning'); return; }

  const targets = checked.map(chk=>{
    const cId = chk.dataset.contractId;
    const c   = allContracts.find(x=>x.id===cId);
    const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
    const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
    return { c, emp, co };
  }).filter(({c,emp,co})=>{
    if(!c||!emp||!co) return false;
    if(method==='알림톡' && !emp.phone) return false;
    if(method==='이메일' && !emp.email) return false;
    return true;
  });

  if(!targets.length){ toast(`${method} 발송 가능한 대상이 없습니다. (연락처 미등록)`, 'warning'); return; }

  const names = targets.slice(0,3).map(({emp})=>emp.name).join(', ');
  const more  = targets.length > 3 ? ` 외 ${targets.length-3}명` : '';
  if(!confirm(`[계약만료 일괄 ${method} 발송]\n\n총 ${targets.length}건을 발송하시겠습니까?\n대상: ${names}${more}`)) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const bulkKakaoBtn = document.getElementById('cen-btn-bulk-kakao');
  const bulkEmailBtn = document.getElementById('cen-btn-bulk-email');
  if(bulkKakaoBtn) bulkKakaoBtn.disabled=true;
  if(bulkEmailBtn) bulkEmailBtn.disabled=true;

  let ok=0, fail=0;
  for(const {c, emp, co} of targets){
    const endDate = new Date(c.contract_end); endDate.setHours(0,0,0,0);
    const daysLeft = Math.ceil((endDate-today)/(1000*60*60*24));
    const recipient = method==='알림톡' ? emp.phone : emp.email;
    try{
      // 근로자 통지 이력 저장
      await _cenSaveNotice({ contractId: c.id, method, status:'완료', recipient, note:`일괄 ${method} — ${emp.name}`, daysLeft });
      // 고객사 인앱 알림 발송
      await _cenSendCompanyNotice({ c, emp, co, daysLeft });
      ok++;
    } catch(e){ fail++; }
  }
  toast(`일괄 ${method} 완료 — 성공 ${ok}건 + 고객사 알림 발송${fail?` / 실패 ${fail}건`:''}`, ok>0?'success':'error');
  await cenRefresh();
}

/**
 * ─────────────────────────────────────────────────────────────────
 * 공통 고객사 인앱 알림 발송 헬퍼
 * ─────────────────────────────────────────────────────────────────
 * @param {object} opts
 *   companyId      {string}  고객사 ID (필수)
 *   companyName    {string}  고객사명
 *   noticeType     {string}  알림 유형 식별자 (필수)
 *   title          {string}  알림 제목 (필수)
 *   body           {string}  알림 본문 (필수)
 *   contractId     {string}  관련 계약 ID
 *   employeeId     {string}  관련 근로자 ID
 *   employeeName   {string}  관련 근로자명
 *   contractEnd    {string}  계약 종료일
 *   extraData      {object}  추가 메타데이터 (JSON 직렬화 가능)
 */
async function _sendCompanyNotice({
  companyId, companyName='',
  noticeType, title, body,
  contractId='', employeeId='', employeeName='',
  contractEnd='', extraData={}
}){
  if(!companyId || !noticeType || !title || !body) return;
  const adminName = _getAdminUsername();
  try {
    await fetch('../tables/company_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        company_id   : companyId,
        company_name : companyName,
        notice_type  : noticeType,
        title,
        body,
        contract_id  : contractId,
        employee_id  : employeeId,
        employee_name: employeeName,
        contract_end : contractEnd,
        days_until_expiry: 0,
        sent_at      : new Date().toISOString(),
        sent_by      : adminName,
        is_read      : false,
        read_at      : '',
        ...extraData,
      }),
    });
  } catch(e){
    console.warn('[_sendCompanyNotice 오류]', e);
  }
}

/**
 * 고객사 인앱 알림 발송 — company_notices 테이블 INSERT
 */
async function _cenSendCompanyNotice({ c, emp, co, daysLeft }){
  if(!c || !co) return;
  const adminName = _getAdminUsername();
  const cat       = emp?.employment_category || c.contract_type || '';
  const coRep     = co.representative || '';
  const ddayStr   = daysLeft === 0 ? 'D-day' : `D-${daysLeft}`;
  const [ey,em,ed]= (c.contract_end||'----/--/--').split('-');
  const endKr     = ey ? `${parseInt(ey)}년 ${parseInt(em)}월 ${parseInt(ed)}일` : c.contract_end;
  const urgencyCompany = daysLeft <= 7  ? '⚠️ 만료일이 매우 임박하였습니다. 즉시 갱신 여부를 결정해 주세요.'
                       : daysLeft <= 14 ? '조속히 갱신 또는 종료 여부를 확인해 주시기 바랍니다.'
                       :                 '미리 갱신 여부를 검토하시어 원활한 인사 관리가 되시길 바랍니다.';

  const title = `[계약만료 예정] ${emp?.name||''} ${cat} — ${ddayStr}`;
  const body  =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원의 근로계약 만료일이 다가와 안내드립니다.
${urgencyCompany}

■ 직원명: ${emp?.name||''}
■ 고용형태: ${cat}
■ 계약 만료일: ${endKr} (${ddayStr})

담당 노무사에게 갱신 여부를 확인해 주세요.

※ 「기간제 및 단시간근로자 보호 등에 관한 법률」에 따른 사전 통지`;

  await fetch('../tables/company_notices', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      company_id        : co.id,
      company_name      : co.company_name || '',
      notice_type       : 'contract_expiry',
      title,
      body,
      contract_id       : c.id,
      employee_id       : emp?.id || '',
      employee_name     : emp?.name || '',
      contract_end      : c.contract_end || '',
      days_until_expiry : daysLeft,
      sent_at           : new Date().toISOString(),
      sent_by           : adminName,
      is_read           : false,
      read_at           : '',
    }),
  });
}

/** 통지 이력 DB 저장 */
async function _cenSaveNotice({ contractId, method, status, recipient, note, daysLeft }){
  const c   = allContracts.find(x=>x.id===contractId);
  const emp = c ? allEmployees.find(e=>e.id===c.employee_id) : null;
  const co  = c ? allCompanies.find(x=>x.id===c.company_id)  : null;
  const adminName = _getAdminUsername();
  const cat = emp?.employment_category || c?.contract_type || '';

  const payload = {
    contract_id     : contractId,
    employee_id     : emp?.id || '',
    employee_name   : emp?.name || '',
    company_id      : co?.id || '',
    company_name    : co?.company_name || '',
    contract_type   : cat,
    contract_end    : c?.contract_end || '',
    days_until_expiry: daysLeft,
    notice_method   : method,
    notice_status   : status,
    recipient       : recipient || '',
    noticed_at      : new Date().toISOString(),
    noticed_by      : adminName,
    note            : note || '',
  };

  const res = await fetch('../tables/contract_expiry_notice', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(payload),
  });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const saved = await res.json();
  // 캐시에 즉시 반영
  _cenNoticeList.unshift(saved);
  return saved;
}

/** 새로고침 */
async function cenRefresh(){
  _cenHistoryLoaded = false;
  await cenLoadHistory(true);
  renderCenTargetList();
  renderCenStats();
  render2YrStats();
  renderDashRegularBanner();
  if(_cenTab === 'history') renderCenHistory();
}

// ══════════════════════════════════════════════════════════════════
//  기간제 2년 초과 — 정규직 전환 의무 관리
//  「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조
// ══════════════════════════════════════════════════════════════════

/**
 * 동일 직원의 계약직·계약직 수습 계약을 전부 합산해
 * 누적 기간이 2년(730일)을 초과한 직원 목록을 반환한다.
 *
 * 반환 형식: [{
 *   empId, empName, company, companyId,
 *   totalDays,          // 누적 일수
 *   firstStart,         // 최초 계약 시작일 (YYYY-MM-DD)
 *   contracts,          // 해당 계약 목록 (원본 계약 객체 배열)
 *   activeContract,     // 현재 활성 계약 (있으면) — 정규직 전환 대상 계약
 *   status,             // 'exceeded' | 'warning' (1년 반 이상)
 * }]
 */
function _calc2YrExceedList(){
  const TWO_YEARS_DAYS = 730; // 2년 = 365×2
  const WARN_DAYS      = 548; // 경고 시작: 1년 6개월(365×1.5)

  // 직원별로 계약직 계열 계약 그룹핑
  const byEmp = {};
  allContracts.forEach(c => {
    if(c.is_draft) return;
    if(c.is_voided_by_amend) return;
    if(['취소','파기'].includes(c.status)) return; // 파기·취소는 제외
    const emp = allEmployees.find(e => e.id === c.employee_id);
    const cat = emp?.employment_category || c.contract_type || '';
    if(!['계약직','계약직 수습'].includes(cat)) return; // 계약직 계열만
    if(!c.contract_start) return;
    if(!byEmp[c.employee_id]) byEmp[c.employee_id] = [];
    byEmp[c.employee_id].push(c);
  });

  const today = new Date();
  today.setHours(0,0,0,0);
  const result = [];

  Object.entries(byEmp).forEach(([empId, contracts]) => {
    // 누적 일수 계산: 각 계약의 (종료일 or 오늘) - 시작일
    let totalDays = 0;
    contracts.forEach(c => {
      const s = new Date(c.contract_start);
      const e = c.contract_end ? new Date(c.contract_end) : today;
      const days = Math.max(0, Math.ceil((e - s) / (1000*60*60*24)));
      totalDays += days;
    });

    if(totalDays < WARN_DAYS) return; // 1년 6개월 미만은 표시 안 함

    const emp = allEmployees.find(e => e.id === empId);
    const co  = allCompanies.find(x => x.id === contracts[0].company_id);

    // 최초 계약 시작일
    const firstStart = contracts
      .map(c => c.contract_start)
      .sort()[0];

    // 현재 활성/서류미비/계약예정 계약
    const activeContract = contracts.find(c =>
      ['활성','서류미비','계약예정','갱신예정'].includes(c.status)
    ) || contracts.sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];

    result.push({
      empId,
      empName     : emp?.name || '(알 수 없음)',
      company     : co?.company_name || '-',
      companyId   : co?.id || '',
      totalDays,
      firstStart,
      contracts,
      activeContract,
      status      : totalDays > TWO_YEARS_DAYS ? 'exceeded' : 'warning',
    });
  });

  // 초과 → 경고 순, 동일 상태 내에선 일수 내림차순
  return result.sort((a,b) => {
    if(a.status !== b.status) return a.status === 'exceeded' ? -1 : 1;
    return b.totalDays - a.totalDays;
  });
}

/** 2년 초과 통계 업데이트 (대시보드 배너 + RC 페이지 배지) */
function render2YrStats(){
  const list     = _calc2YrExceedList();
  const exceeded = list.filter(x => x.status === 'exceeded').length;
  // RC 탭 배지 (rc-tab-target-badge)
  const rcBadge = document.getElementById('rc-tab-target-badge');
  if(rcBadge){
    rcBadge.textContent   = exceeded;
    rcBadge.style.display = exceeded > 0 ? 'inline-flex' : 'none';
  }
}

/** 대시보드 배너 업데이트 */
function _updateDash2YrBanner(){
  const section = document.getElementById('dash-2yr-section');
  if(!section) return;
  const list     = _calc2YrExceedList();
  const exceeded = list.filter(x => x.status === 'exceeded');
  if(!exceeded.length){ section.style.display='none'; section.innerHTML=''; return; }

  section.style.display = '';
  section.innerHTML = `
    <div onclick="showPage('regular-conversion', document.querySelector('.menu-item[data-page=\\'regular-conversion\\']'));"
         style="cursor:pointer;background:linear-gradient(135deg,#fff1f2,#fee2e2);border:1.5px solid #f87171;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:14px;transition:box-shadow .15s;"
         onmouseover="this.style.boxShadow='0 4px 18px rgba(239,68,68,.2)'"
         onmouseout="this.style.boxShadow='none'">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas fa-gavel" style="color:#fff;font-size:17px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13.5px;font-weight:700;color:#7f1d1d;">
          정규직 전환 의무 대상 <span style="color:#dc2626;font-size:16px;font-weight:800;">${exceeded.length}명</span>이 있습니다
        </div>
        <div style="font-size:12px;color:#b91c1c;margin-top:3px;">기간제 근로자 2년 초과 — 클릭하여 정규직 전환 통지 관리로 이동</div>
      </div>
      <div style="color:#dc2626;font-size:14px;flex-shrink:0;"><i class="fas fa-chevron-right"></i></div>
    </div>`;
}

/** 정규직 전환 대상 테이블 렌더링 */
function render2YrTargetList(){
  const tbody = document.getElementById('2yr-tbody');
  if(!tbody) return;

  const filterCo = document.getElementById('2yr-filter-company')?.value || '';
  const searchQ  = (document.getElementById('2yr-search')?.value || '').trim().toLowerCase();

  // 고객사 필터 옵션 동적 채우기 (1회)
  const coSel = document.getElementById('2yr-filter-company');
  if(coSel && coSel.options.length <= 1){
    const seen = new Set();
    _calc2YrExceedList().forEach(x => {
      if(!seen.has(x.companyId)){
        seen.add(x.companyId);
        const opt = document.createElement('option');
        opt.value = x.companyId; opt.textContent = x.company;
        coSel.appendChild(opt);
      }
    });
  }

  let list = _calc2YrExceedList().filter(x => {
    if(filterCo && x.companyId !== filterCo) return false;
    if(searchQ  && !x.empName.toLowerCase().includes(searchQ)) return false;
    return true;
  });

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:36px;color:#6b7280;">
      <i class="fas fa-check-circle" style="color:#10b981;font-size:20px;display:block;margin-bottom:8px;"></i>
      정규직 전환 의무 대상자가 없습니다.
    </td></tr>`;
    return;
  }

  const fmtDays = (d) => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(${d}일)`;
  };

  tbody.innerHTML = list.map(x => {
    const statusBadge = x.status === 'exceeded'
      ? `<span class="badge-2yr-over"><i class="fas fa-exclamation-circle"></i> 2년 초과</span>`
      : `<span class="badge-2yr-warn"><i class="fas fa-clock"></i> 주의 (1.5년+)</span>`;
    const catText = (x.activeContract?.contract_type) || '계약직';
    return `<tr>
      <td style="font-weight:700;color:#111827;">${x.empName}</td>
      <td style="font-size:12px;color:#374151;">${x.company}</td>
      <td><span class="badge badge-purple" style="font-size:11px;">${catText}</span></td>
      <td style="font-size:12px;color:#6b7280;">${x.firstStart || '-'}</td>
      <td style="font-size:12px;font-weight:600;color:${x.status==='exceeded'?'#dc2626':'#d97706'};">${fmtDays(x.totalDays)}</td>
      <td>${statusBadge}</td>
      <td style="text-align:center;white-space:nowrap;">
        ${x.status === 'exceeded' ? `
        <button onclick="_2yrSendNotice('${x.empId}')"
          style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:5px;">
          <i class="fas fa-paper-plane"></i> 전환 안내 발송
        </button>` : `<span style="font-size:11.5px;color:#9ca3af;">전환 의무 미도달</span>`}
      </td>
    </tr>`;
  }).join('');
}

/**
 * 정규직 전환 안내 알림 발송
 * ① 고객사 인앱 알림(company_notices) INSERT
 * ② contract_expiry_notices 이력 저장 (기존 발송 이력 테이블 재활용)
 */
async function _2yrSendNotice(empId){
  const item = _calc2YrExceedList().find(x => x.empId === empId);
  if(!item){ toast('대상자 정보를 찾을 수 없습니다.','error'); return; }

  const emp  = allEmployees.find(e => e.id === empId);
  const co   = allCompanies.find(x => x.id === item.companyId);
  if(!co)  { toast('고객사 정보를 찾을 수 없습니다.','error'); return; }

  const adminName = _getAdminUsername();
  const coRep     = co.representative || '';
  const fmtDays   = (d) => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${d}일)`;
  };

  const title = `[정규직 전환 의무] ${item.empName} — 기간제 2년 초과`;
  const body  =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원의 기간제 근로 누적 기간이 2년을 초과하여 법률에 따른 정규직 전환 의무가 발생하였음을 안내드립니다.

■ 직원명: ${item.empName}
■ 고용형태: ${item.activeContract?.contract_type || '계약직'}
■ 최초 계약일: ${item.firstStart || '-'}
■ 누적 계약기간: ${fmtDays(item.totalDays)}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요.

※ 본 안내는 노무사 사무소에서 발송한 법적 의무 안내입니다.`;

  try {
    // ① 고객사 인앱 알림
    await fetch('../tables/company_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        company_id   : co.id,
        company_name : co.company_name || '',
        notice_type  : 'regular_conversion',
        title,
        body,
        contract_id  : item.activeContract?.id || '',
        employee_id  : empId,
        employee_name: item.empName,
        contract_end : '',
        days_until_expiry: 0,
        sent_at      : new Date().toISOString(),
        sent_by      : adminName,
        is_read      : false,
        read_at      : '',
      }),
    });

    // ② 계약만료 통지 이력 테이블에도 이력 저장
    await fetch('../tables/contract_expiry_notices', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        contract_id   : item.activeContract?.id || '',
        employee_id   : empId,
        employee_name : item.empName,
        company_id    : co.id,
        company_name  : co.company_name || '',
        contract_type : item.activeContract?.contract_type || '계약직',
        contract_end  : '',
        notice_method : '인앱알림',
        notice_type   : 'regular_conversion',
        noticed_at    : new Date().toISOString(),
        noticed_by    : adminName,
        days_until_expiry: 0,
        note          : `기간제 2년 초과 (누적 ${item.totalDays}일) — 정규직 전환 안내`,
      }),
    });

    toast(`${item.empName} — 정규직 전환 안내 발송 완료`, 'success');
    await cenRefresh();
  } catch(e){
    console.error('[정규직 전환 안내 발송 오류]', e);
    toast('발송 중 오류가 발생했습니다.', 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
//  정규직 전환 관리 페이지 (page-regular-conversion)
//  「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조
// ══════════════════════════════════════════════════════════════════

// ─── RC 페이지 전용 상태 변수 ────────────────────────────────────
let _rcHistoryList   = [];   // 정규직 전환 발송 이력 캐시
let _rcHistoryLoaded = false;
let _rcTab           = 'target'; // 현재 탭: 'target' | 'history' | 'template'
const RC_PAGE_SIZE   = 20;   // 테이블 페이지당 행 수
let _rcTargetPage    = 1;    // 전환 대상 현재 페이지
let _rcHistoryPage   = 1;    // 발송 이력 현재 페이지

// ─── 상태 분류 임계값 (일수) ─────────────────────────────────────
const RC_EXCEEDED_DAYS = 730; // 2년 초과 → 전환 의무 발생
const RC_URGENT_DAYS   = 640; // ~90일 이내 → 임박
const RC_WARN_DAYS     = 548; // ~180일 이내 → 주의 (1년 6개월+)

/**
 * _calc2YrExceedList() 결과에 urgent 상태를 추가로 분류한 목록 반환
 * status: 'exceeded' | 'urgent' | 'warning'
 */
function _calcRcFullList(){
  const base = _calc2YrExceedList(); // exceeded | warning
  return base.map(x => {
    if(x.status === 'exceeded') return { ...x, rcStatus: 'exceeded' };
    // warning 중 2년까지 90일 이내(640일+)면 urgent
    if(x.totalDays >= RC_URGENT_DAYS) return { ...x, rcStatus: 'urgent' };
    return { ...x, rcStatus: 'warning' };
  }).sort((a,b) => {
    const order = { exceeded:0, urgent:1, warning:2 };
    if(order[a.rcStatus] !== order[b.rcStatus]) return order[a.rcStatus] - order[b.rcStatus];
    return b.totalDays - a.totalDays;
  });
}

/**
 * 정규직 전환 관리 페이지 초기화
 */
async function initRcPage(){
  _rcTab = 'target';
  _rcTargetPage  = 1;
  _rcHistoryPage = 1;

  // 이력 로드 중 tbody 로딩 표시
  const _rcTbody = document.getElementById('rc-target-tbody');
  if(_rcTbody) _rcTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#6366f1;margin-right:8px;"></i>정규직 전환 이력 불러오는 중...</td></tr>`;

  // 이력 강제 재조회
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);

  // 고객사 필터 채우기
  _rcFillCompanyFilter('rc-filter-company');

  // 렌더링
  renderRcStats();
  renderRcTargetList();

  // 탭 초기화
  rcSwitchTab('target');
}

/**
 * RC 탭 전환
 */
function rcSwitchTab(tab){
  _rcTab = tab;
  ['target','history','template'].forEach(t => {
    const btn   = document.getElementById(`rc-tab-${t}`);
    const panel = document.getElementById(`rc-panel-${t}`);
    if(btn)   btn.classList.toggle('active', t === tab);
    if(panel) panel.style.display = t === tab ? '' : 'none';
  });
  if(tab === 'history'){
    if(!_rcHistoryLoaded){
      const _htbody = document.getElementById('rc-log-tbody');
      if(_htbody) _htbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-circle-notch fa-spin" style="color:#6366f1;margin-right:8px;"></i>이력 불러오는 중...</td></tr>`;
      (async()=>{ await rcLoadHistory(true); renderRcHistory(); })();
    } else {
      renderRcHistory();
    }
  }
  if(tab === 'template'){
    _rcFillTemplateSampleSel();
    renderRcTemplate();
  }
}

/**
 * 상단 통계 카드 4개 업데이트
 * - exceeded: 2년 초과
 * - urgent:   임박 (640일~730일)
 * - warning:  주의 (548일~639일)
 * - done:     이번 달 발송 완료 건수
 */
function renderRcStats(){
  const list     = _calcRcFullList();
  const exceeded = list.filter(x => x.rcStatus === 'exceeded').length;
  const urgent   = list.filter(x => x.rcStatus === 'urgent').length;
  const warning  = list.filter(x => x.rcStatus === 'warning').length;

  // 이번 달 발송 완료
  const now    = new Date();
  const ym     = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const done   = _rcHistoryList.filter(r => (r.noticed_at||r.sent_at||'').startsWith(ym)).length;

  const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setVal('rc-stat-exceeded', exceeded);
  setVal('rc-stat-urgent',   urgent);
  setVal('rc-stat-warning',  warning);
  setVal('rc-stat-done',     done);

  // 전환 대상 탭 배지 (exceeded 만 표시)
  const badge = document.getElementById('rc-tab-target-badge');
  if(badge){
    badge.textContent   = exceeded;
    badge.style.display = exceeded > 0 ? 'inline-flex' : 'none';
  }
}

/**
 * 전환 대상 테이블 렌더링 (필터·검색·페이지네이션 포함)
 */
function renderRcTargetList(){
  const tbody = document.getElementById('rc-target-tbody');
  if(!tbody) return;

  const filterCo     = document.getElementById('rc-filter-company')?.value   || '';
  const filterStatus = document.getElementById('rc-filter-status')?.value    || '';
  const searchQ      = (document.getElementById('rc-search')?.value || '').trim().toLowerCase();

  let list = _calcRcFullList().filter(x => {
    if(filterCo     && x.companyId !== filterCo)    return false;
    if(filterStatus && x.rcStatus  !== filterStatus) return false;
    if(searchQ      && !x.empName.toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>a.empName.localeCompare(b.empName,'ko'));

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(list.length / RC_PAGE_SIZE));
  if(_rcTargetPage > totalPages) _rcTargetPage = totalPages;
  const pageData = list.slice((_rcTargetPage-1)*RC_PAGE_SIZE, _rcTargetPage*RC_PAGE_SIZE);

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#6b7280;">
      <i class="fas fa-check-circle" style="color:#10b981;font-size:22px;display:block;margin-bottom:10px;"></i>
      정규직 전환 의무 대상자가 없습니다.
    </td></tr>`;
    document.getElementById('rc-target-pagination').innerHTML = '';
    return;
  }

  const fmtDays = d => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(${d}일)`;
  };

  const statusBadge = s => {
    if(s === 'exceeded') return `<span class="badge-2yr-over"><i class="fas fa-exclamation-circle"></i> 전환 의무</span>`;
    if(s === 'urgent')   return `<span class="badge-2yr-warn" style="background:#fff7ed;color:#9a3412;border-color:#fb923c;"><i class="fas fa-fire"></i> 임박</span>`;
    return `<span class="badge-2yr-warn"><i class="fas fa-clock"></i> 주의</span>`;
  };

  // 2년까지 잔여일
  const remainDays = totalDays => {
    const rem = RC_EXCEEDED_DAYS - totalDays;
    if(rem <= 0) return `<span style="color:#dc2626;font-weight:700;">초과 ${Math.abs(rem)}일</span>`;
    return `<span style="color:${rem<=90?'#ea580c':rem<=180?'#d97706':'#374151'};font-weight:600;">D-${rem}</span>`;
  };

  tbody.innerHTML = pageData.map(x => {
    const catText   = x.activeContract?.contract_type || '계약직';
    const sendBtn   = x.rcStatus === 'exceeded'
      ? `<button onclick="rcSendNotice('${x.empId}')"
           style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:5px;">
           <i class="fas fa-paper-plane"></i> 안내 발송
         </button>`
      : `<span style="font-size:11.5px;color:#9ca3af;">전환 의무 미도달</span>`;
    return `<tr>
      <td style="font-weight:700;color:#111827;">${x.empName}</td>
      <td style="font-size:12px;color:#374151;">${x.company}</td>
      <td><span class="badge badge-purple" style="font-size:11px;">${catText}</span></td>
      <td style="font-size:12px;color:#6b7280;">${x.firstStart || '-'}</td>
      <td style="font-size:12px;font-weight:600;color:${x.rcStatus==='exceeded'?'#dc2626':x.rcStatus==='urgent'?'#ea580c':'#d97706'};">${fmtDays(x.totalDays)}</td>
      <td>${remainDays(x.totalDays)}</td>
      <td>${statusBadge(x.rcStatus)}</td>
      <td style="text-align:center;white-space:nowrap;">${sendBtn}</td>
    </tr>`;
  }).join('');

  // 페이지네이션 렌더링
  const pagEl = document.getElementById('rc-target-pagination');
  if(pagEl) pagEl.innerHTML = _rcBuildPagination(totalPages, _rcTargetPage, `_rcTargetPage`, `renderRcTargetList`);
}

/**
 * 발송 이력 DB 조회 (notice_type = 'regular_conversion')
 */
async function rcLoadHistory(force=false){
  if(!force && _rcHistoryLoaded) return;
  try {
    let page = 1, all = [];
    while(true){
      const res  = await fetch(`../tables/contract_expiry_notices?page=${page}&limit=200&sort=noticed_at`);
      const data = await res.json();
      const rows = (data.data||[]).filter(r => r.notice_type === 'regular_conversion');
      all.push(...rows);
      if((data.data||[]).length < 200) break;
      page++;
    }
    // 최신순 정렬
    _rcHistoryList = all.sort((a,b) => (b.noticed_at||'').localeCompare(a.noticed_at||''));
    _rcHistoryLoaded = true;

    // 이력 필터 고객사 채우기
    _rcFillCompanyFilter('rc-log-filter-company');
  } catch(e){
    console.error('[RC] 발송 이력 조회 오류', e);
  }
}

/**
 * 발송 이력 테이블 렌더링
 */
function renderRcHistory(){
  const tbody = document.getElementById('rc-log-tbody');
  if(!tbody) return;

  const filterCo = document.getElementById('rc-log-filter-company')?.value || '';
  const searchQ  = (document.getElementById('rc-log-search')?.value || '').trim().toLowerCase();

  let list = _rcHistoryList.filter(r => {
    if(filterCo && r.company_id !== filterCo) return false;
    if(searchQ  && !(r.employee_name||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>(a.employee_name||'').localeCompare(b.employee_name||'','ko'));

  const totalPages = Math.max(1, Math.ceil(list.length / RC_PAGE_SIZE));
  if(_rcHistoryPage > totalPages) _rcHistoryPage = totalPages;
  const pageData = list.slice((_rcHistoryPage-1)*RC_PAGE_SIZE, _rcHistoryPage*RC_PAGE_SIZE);

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d) ? '-' : d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="8" class="cen-empty"><i class="fas fa-inbox"></i> 발송 이력이 없습니다.</td></tr>`;
    document.getElementById('rc-log-pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = pageData.map(r => {
    const catBadgeCls = {'계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'};
    const cls = catBadgeCls[r.contract_type] || 'badge-purple';
    // 누적 기간 — note 필드에서 일수 파싱 시도
    const noteMatch = (r.note||'').match(/누적\s*([\d]+)일/);
    const totalDaysText = noteMatch ? `${noteMatch[1]}일` : '-';
    return `<tr>
      <td style="font-size:12px;color:#374151;white-space:nowrap;">${fmtDt(r.noticed_at)}</td>
      <td style="font-weight:600;color:#111827;">${r.employee_name||'-'}</td>
      <td><span class="badge ${cls}" style="font-size:11px;">${r.contract_type||'-'}</span></td>
      <td style="font-size:12px;color:#374151;">${r.company_name||'-'}</td>
      <td style="font-size:12px;color:#6b7280;">${totalDaysText}</td>
      <td><span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:20px;font-size:11.5px;font-weight:700;">${r.notice_method||'인앱알림'}</span></td>
      <td style="font-size:12px;color:#6b7280;">${_resolveAdminName(r.noticed_by)||'-'}</td>
      <td style="font-size:11.5px;color:#6b7280;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(r.note||'').replace(/"/g,'&quot;')}">${r.note||'-'}</td>
    </tr>`;
  }).join('');

  const pagEl = document.getElementById('rc-log-pagination');
  if(pagEl) pagEl.innerHTML = _rcBuildPagination(totalPages, _rcHistoryPage, `_rcHistoryPage`, `renderRcHistory`);
}

/**
 * 고객사 필터 셀렉트 옵션 채우기 (중복 방지)
 */
function _rcFillCompanyFilter(selId){
  const sel = document.getElementById(selId);
  if(!sel) return;
  // 기존 옵션 제거 (전체 옵션 제외)
  while(sel.options.length > 1) sel.remove(1);
  const seen = new Set();
  _calcRcFullList().forEach(x => {
    if(!seen.has(x.companyId)){
      seen.add(x.companyId);
      const opt = document.createElement('option');
      opt.value = x.companyId; opt.textContent = x.company;
      sel.appendChild(opt);
    }
  });
}

/**
 * 메시지 예시 샘플 셀렉트 채우기
 */
function _rcFillTemplateSampleSel(){
  const sel = document.getElementById('rc-tmpl-sample-sel');
  if(!sel) return;
  sel.innerHTML = '<option value="__demo__">— 예시 데이터로 보기 —</option>';
  _calcRcFullList().filter(x => x.rcStatus === 'exceeded').forEach(x => {
    const opt = document.createElement('option');
    opt.value       = x.empId;
    opt.textContent = `${x.empName} · ${x.activeContract?.contract_type||'계약직'} · ${x.company} · 누적 ${x.totalDays}일`;
    sel.appendChild(opt);
  });
}

/**
 * 메시지 예시 탭 렌더링 (인앱 알림 미리보기 + 변수 안내)
 */
function renderRcTemplate(){
  const selVal = document.getElementById('rc-tmpl-sample-sel')?.value || '__demo__';
  let item = null;
  if(selVal !== '__demo__'){
    item = _calcRcFullList().find(x => x.empId === selVal);
  }

  // 미리보기 데이터 구성 (실제 또는 예시)
  const empName    = item?.empName        || '홍길동';
  const coName     = item?.company        || '(주)예시기업';
  const coRep      = item ? (allCompanies.find(c=>c.id===item.companyId)?.representative||'') : '대표자';
  const catText    = item?.activeContract?.contract_type || '계약직';
  const firstStart = item?.firstStart     || '2023-01-01';
  const totalDays  = item?.totalDays      || 750;

  const fmtDays = d => {
    const y = Math.floor(d / 365);
    const m = Math.floor((d % 365) / 30);
    return (y > 0 ? `${y}년 ` : '') + (m > 0 ? `${m}개월 ` : '') + `(총 ${d}일)`;
  };

  const title = `[정규직 전환 의무] ${empName} — 기간제 2년 초과`;
  const bodyFull =
`안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원의 기간제 근로 누적 기간이 2년을 초과하여 법률에 따른 정규직 전환 의무가 발생하였음을 안내드립니다.

■ 직원명: ${empName}
■ 고용형태: ${catText}
■ 최초 계약일: ${firstStart}
■ 누적 계약기간: ${fmtDays(totalDays)}

◆ 관련 법령
「기간제 및 단시간근로자 보호 등에 관한 법률」 제4조:
사용자가 2년을 초과하여 기간제근로자를 사용하는 경우에는 그 기간제근로자는 기간의 정함이 없는 근로계약을 체결한 근로자로 봅니다.

◆ 필요 조치
담당 노무사에게 정규직 근로계약서 재작성을 요청해 주세요.

※ 본 안내는 노무사 사무소에서 발송한 법적 의무 안내입니다.`;

  // 인앱 카드 미리보기 업데이트
  const setTxt = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  const setHtml= (id,v)=>{ const el=document.getElementById(id); if(el) el.innerHTML=v; };

  setTxt('rc-tmpl-inapp-title',      title);
  setTxt('rc-tmpl-inapp-full-title', title);
  setTxt('rc-tmpl-inapp-time',       '방금 전');
  setTxt('rc-tmpl-inapp-body',       bodyFull.split('\n')[0]); // 첫 줄 요약

  // 전체 내용 — 줄바꿈 유지
  setHtml('rc-tmpl-inapp-full-body', bodyFull.split('\n').map(l=>`<div style="min-height:1.2em;">${l||'&nbsp;'}</div>`).join(''));

  // 정보 박스 — notif-detail-infobox 스타일(실제 앱 상세 시트)과 동일 구조
  setHtml('rc-tmpl-inapp-infobox', `
    <div style="display:flex;flex-direction:column;gap:2px;">
      <div style="display:flex;gap:8px;font-size:12.5px;line-height:1.9;">
        <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0;">근로자</span>
        <span style="color:#1e293b;font-weight:700;">${empName}</span>
      </div>
      <div style="display:flex;gap:8px;font-size:12.5px;line-height:1.9;">
        <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0;">고용형태</span>
        <span style="color:#1e293b;font-weight:700;">${catText}</span>
      </div>
      <div style="display:flex;gap:8px;font-size:12.5px;line-height:1.9;">
        <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0;">최초 계약일</span>
        <span style="color:#1e293b;">${firstStart}</span>
      </div>
      <div style="display:flex;gap:8px;font-size:12.5px;line-height:1.9;">
        <span style="color:#64748b;font-weight:600;min-width:80px;flex-shrink:0;">누적 기간</span>
        <span style="color:#dc2626;font-weight:700;">${fmtDays(totalDays)}</span>
      </div>
    </div>`);
  setTxt('rc-tmpl-inapp-foot', '※ 본 안내는 노무사 사무소에서 발송한 법적 의무 안내입니다.');

  // 변수 안내 테이블
  const vars = [
    ['{empName}',    '직원명',              empName],
    ['{company}',    '고객사명',            coName],
    ['{coRep}',      '고객사 대표자명',     coRep||'(없음)'],
    ['{catText}',    '고용형태',            catText],
    ['{firstStart}', '최초 계약 시작일',    firstStart],
    ['{totalDays}',  '누적 계약일수',       `${totalDays}일`],
    ['{fmtPeriod}',  '누적 기간 텍스트',    fmtDays(totalDays)],
    ['{today}',      '발송 일자',           new Date().toLocaleDateString('ko-KR')],
  ];
  const varTbody = document.getElementById('rc-tmpl-var-tbody');
  if(varTbody){
    varTbody.innerHTML = vars.map(([v,d,e])=>`
      <tr>
        <td><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;color:#dc2626;">${v}</code></td>
        <td style="font-size:12.5px;color:#374151;">${d}</td>
        <td style="font-size:12.5px;color:#6b7280;">${e}</td>
      </tr>`).join('');
  }
}

/**
 * 정규직 전환 안내 발송 (RC 페이지용)
 * — _2yrSendNotice 호출 후 RC 페이지 새로고침
 */
async function rcSendNotice(empId){
  await _2yrSendNotice(empId);
  // CEN 발송 이력과 별개로 RC 페이지 이력도 재조회
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);
  renderRcStats();
  renderRcTargetList();
  if(_rcTab === 'history') renderRcHistory();
}

/**
 * RC 페이지 전체 새로고침
 */
async function rcRefresh(){
  _rcHistoryLoaded = false;
  await rcLoadHistory(true);
  _rcFillCompanyFilter('rc-filter-company');
  renderRcStats();
  renderRcTargetList();
  if(_rcTab === 'history')  renderRcHistory();
  if(_rcTab === 'template'){ _rcFillTemplateSampleSel(); renderRcTemplate(); }
}

/**
 * 페이지네이션 HTML 생성 헬퍼 (RC 공통)
 */
function _rcBuildPagination(total, current, pageVar, renderFn){
  if(total <= 1) return '';
  const btns = [];
  const makeBtn = (label, page, disabled=false, active=false) =>
    `<button onclick="${pageVar}=${page};${renderFn}();"
       style="min-width:30px;height:30px;padding:0 8px;border:1px solid ${active?'#6366f1':'#d1d5db'};
              border-radius:6px;background:${active?'#6366f1':'#fff'};color:${active?'#fff':'#374151'};
              font-size:12px;cursor:${disabled?'default':'pointer'};font-family:inherit;font-weight:${active?'700':'400'};
              opacity:${disabled?'0.4':'1'};"
       ${disabled?'disabled':''}>
       ${label}
     </button>`;
  btns.push(makeBtn('‹', Math.max(1,current-1), current===1));
  const start = Math.max(1, current-2), end = Math.min(total, current+2);
  if(start > 1) btns.push(makeBtn('1',1), start>2?`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`:'');
  for(let p=start;p<=end;p++) btns.push(makeBtn(p,p,false,p===current));
  if(end < total) btns.push(end<total-1?`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`:'', makeBtn(total,total));
  btns.push(makeBtn('›', Math.min(total,current+1), current===total));
  return `<div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:12px 0;">${btns.join('')}</div>`;
}

// ══════════════════════════════════════════════════════════════════
//  연차 관리 — 잔여 연차 조회 (page-annual-leave)
//  + 사용촉진 발송 이력 (page-leave-promotion)
// ══════════════════════════════════════════════════════════════════

// ─── AL 페이지 전용 상태 ─────────────────────────────────────────
let _alCompanyId   = '';    // 선택된 고객사 ID
let _alCompanyName = '';    // 선택된 고객사명
let _alPage        = 1;     // 연차 테이블 현재 페이지
const AL_PAGE_SIZE = 30;
let _alPromoEmpId  = '';    // 사용촉진 발송 대상 empId (모달용)
let _alPromoData   = null;  // 사용촉진 발송 데이터 (모달용)

// ─── LP 페이지 전용 상태 ─────────────────────────────────────────
let _lpHistoryList   = [];
let _lpHistoryLoaded = false;
let _lpPage          = 1;
const LP_PAGE_SIZE   = 30;

// ─────────────────────────────────────────────────────────────────
//  잔여 연차 조회 — 공통 유틸
// ─────────────────────────────────────────────────────────────────

/**
 * 특정 직원의 연차 현황 계산
 * @param {object} emp       employees 레코드
 * @param {object} contract  해당 직원의 활성 계약 레코드
 * @param {object} company   companies 레코드
 * @param {number} refYear   기준 연도 (UI 선택값)
 * @returns {{ totalDays, usedDays, remainDays, basis, hourlyWage, leavePay }}
 */
function calcEmployeeAnnualLeave(emp, contract, company, refYear){
  if(!emp || !contract) return null;
  // 일용직 제외
  if((emp.employment_category||contract.contract_type) === '일용직') return null;

  const hireDateStr   = emp.hire_date || contract.contract_start || '';
  const basis         = company?.annual_leave_basis || '회계년도 기준';
  const contractStart = contract.contract_start || '';

  const hire = new Date(hireDateStr);
  if(!hireDateStr || isNaN(hire)) return null;
  hire.setHours(0,0,0,0);

  const today = new Date(); today.setHours(0,0,0,0);

  // 아직 입사 전이면 표시 안 함
  if(today < hire) return null;

  // ── 헬퍼: 입사일로부터 만 N년이 되는 날짜 ──
  const nthAnniv = n => {
    const d = new Date(hire);
    d.setFullYear(d.getFullYear() + n);
    return d;
  };

  // ── 헬퍼: 두 날짜 사이 완성된 개월 수 (milestone 방식) ──
  const completedMonthsBetween = (from, to, maxM) => {
    let m = 0;
    for(let i = 1; i <= maxM; i++){
      const ms = new Date(from);
      ms.setMonth(ms.getMonth() + i);
      if(to >= ms) m = i; else break;
    }
    return m;
  };

  // ── 기준년도 산정 baseDate 결정 ──
  // 회계년도: refYear-01-01 / 입사일: 직전 주년일(오늘 기준)
  let baseDate;
  if(basis === '입사일 기준'){
    // refYear 주년일이 오늘 이전이면 그것, 아니면 refYear-1 주년일
    const annivThis = new Date(refYear, hire.getMonth(), hire.getDate());
    baseDate = annivThis <= today
      ? annivThis
      : new Date(refYear - 1, hire.getMonth(), hire.getDate());
  } else {
    baseDate = new Date(refYear, 0, 1); // 회계년도: refYear-01-01
  }

  // ── 1년 미만 여부: baseDate 시점에서 판단 ──
  // (오늘 기준으로 1년 넘었어도 기준년도 시점엔 1년 미만일 수 있음)
  const isUnder1Year_atBase = baseDate < nthAnniv(1);

  let totalDays = 0;
  let periodStart, periodEnd; // 사용 연차 집계 구간

  if(isUnder1Year_atBase){
    // ── 1년 미만 구간: 오늘까지 완성된 개월 수 × 1일 (최대 11일) ──
    // 실시간(오늘) 기준으로 발생한 연차 표시
    totalDays = completedMonthsBetween(hire, today, 11);
    // 사용 연차 집계: 입사월 ~ 오늘 달
    periodStart = { y: hire.getFullYear(), m: hire.getMonth() + 1 };
    periodEnd   = { y: today.getFullYear(), m: today.getMonth() + 1 };

  } else {
    // ── 1년 이상: baseDate 기준 만 N년 산정 ──
    // 정확한 만 년수: nthAnniv 방식으로 카운트 (365.25 나눗셈 오차 제거)
    let fullYears = 0;
    for(let n = 1; n <= 40; n++){
      if(baseDate >= nthAnniv(n)) fullYears = n; else break;
    }
    const bonus   = fullYears >= 3 ? Math.floor((fullYears - 1) / 2) : 0;
    totalDays     = Math.min(15 + bonus, 25);

    // 사용 연차 집계 구간
    if(basis === '입사일 기준'){
      // 직전 주년일 ~ 당해 주년일 (refYear 기준)
      periodStart = null; // 날짜 객체로 별도 처리
      periodEnd   = null;
    } else {
      // 회계년도 전체
      periodStart = { y: refYear, m: 1 };
      periodEnd   = { y: refYear, m: 12 };
    }
  }

  // ── 사용 연차 집계 ──
  const usedDays = (allPayrolls || []).filter(p => {
    if(p.employee_id !== emp.id) return false;
    const cs   = contract.contract_start || '';
    const csYM = cs ? parseInt(cs.slice(0,4))*100 + parseInt(cs.slice(5,7)) : 0;
    const pYM  = (p.pay_year||0)*100 + (p.pay_month||0);
    if(csYM && pYM < csYM) return false;

    if(isUnder1Year_atBase){
      // 입사월 ~ 오늘 달
      const sYM = periodStart.y * 100 + periodStart.m;
      const eYM = periodEnd.y   * 100 + periodEnd.m;
      return pYM >= sYM && pYM <= eYM;

    } else if(basis === '입사일 기준'){
      // 직전 주년일 ~ 당해 주년일 월 범위
      const annivPrev = new Date(refYear - 1, hire.getMonth(), hire.getDate());
      const annivCurr = new Date(refYear,     hire.getMonth(), hire.getDate());
      const pDate     = new Date(p.pay_year||0, (p.pay_month||1)-1, 1);
      return pDate >= annivPrev && pDate < annivCurr;

    } else {
      // 회계년도 전체
      return p.pay_year == refYear;
    }
  }).reduce((s,p) => s + (parseFloat(p.annual_leave_used)||0), 0);

  const remainDays = Math.max(0, totalDays - usedDays);

  // 통상시급 계산 (계약서 기본급 ÷ 209시간)
  const baseS       = parseFloat(contract.base_salary)             || 0;
  const weeklyHol   = parseFloat(contract.weekly_holiday_pay)      || 0;
  const positionA   = parseFloat(contract.position_allowance)      || 0;
  const childcareA  = parseFloat(contract.childcare_allowance)     || 0;
  const researchA   = parseFloat(contract.research_allowance)      || 0;
  // fixed 수당만 통상임금 포함
  const carA        = contract.transportation_pay_type === 'fixed' ? (parseFloat(contract.transportation_allowance)||0) : 0;
  const selfDrivA   = contract.self_driving_pay_type   === 'fixed' ? (parseFloat(contract.self_driving_allowance)||0)  : 0;
  const remoteA     = contract.remote_area_pay_type    === 'fixed' ? (parseFloat(contract.remote_area_allowance)||0)   : 0;
  const mealA       = contract.meal_pay_type           === 'fixed' ? (parseFloat(contract.meal_allowance)||0)           : 0;
  const stdMonthly  = baseS + weeklyHol + positionA + carA + selfDrivA + remoteA + mealA + childcareA + researchA;
  const hourlyWage  = stdMonthly > 0 ? Math.round(stdMonthly / 209) : 0;
  const workHours   = parseFloat(contract.work_hours_per_day) || 8;
  // 잔여 연차 수당 추계 = 통상시급 × 1일 근로시간 × 잔여일수
  const leavePay    = Math.round(hourlyWage * workHours * remainDays);

  return { totalDays, usedDays, remainDays, basis, hourlyWage, leavePay };
}

// ─────────────────────────────────────────────────────────────────
//  잔여 연차 조회 — 페이지 함수
// ─────────────────────────────────────────────────────────────────

/** 고객사 선택 화면 초기화 */
function initAlPage(){
  _alCompanyId   = '';
  _alCompanyName = '';
  _alPage        = 1;
  document.getElementById('al-company-select-card').style.display = '';
  document.getElementById('al-main-section').style.display        = 'none';
  // 기준년도 셀렉트 채우기
  const ySel = document.getElementById('al-year-sel');
  
  if(ySel){
    const cur = new Date().getFullYear();
    // 이미 채워진 경우도 재구성 (범위가 다를 수 있으므로)
    ySel.innerHTML = '';
    for(let y = cur + 1; y >= cur - 5; y--){
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y === cur ? `${y}년 (올해)` : `${y}년`;
      if(y === cur) opt.selected = true;
      ySel.appendChild(opt);
    }
  }
  renderAlCompanyChips();
}

/** 고객사 칩 렌더링 */
function renderAlCompanyChips(){
  const container = document.getElementById('al-company-chips');
  if(!container) return;
  const q = (document.getElementById('al-company-search')?.value||'').trim().toLowerCase();

  const active = allCompanies.filter(c =>
    (c.status === '이용중' || c.status === 'active') &&
    (!q || (c.company_name||'').toLowerCase().includes(q))
  ).sort((a,b)=>(a.company_name||'').localeCompare(b.company_name||'','ko'));

  if(!active.length){
    container.innerHTML = `<div style="color:#9ca3af;font-size:12.5px;padding:8px 0;">고객사가 없습니다.</div>`;
    return;
  }
  container.innerHTML = active.map(c => {
    const empCnt = allEmployees.filter(e =>
      e.company_id === c.id && (e.status === '재직' || e.status === 'active')
    ).length;
    return `<button class="co-chip${_alCompanyId===c.id?' selected':''}" onclick="selectAlCompany('${c.id}','${(c.company_name||'').replace(/'/g,"\\'")}')">
      <i class="fas fa-building" style="font-size:11px;"></i>
      ${c.company_name||'-'}
      <span class="co-chip-badge count">${empCnt}명</span>
    </button>`;
  }).join('');
}

/** 고객사 선택 */
function selectAlCompany(companyId, companyName){
  _alCompanyId   = companyId;
  _alCompanyName = companyName;
  _alPage        = 1;
  currentGlobalCompanyId = companyId;  // 글로벌 공유 동기화
  document.getElementById('al-company-select-card').style.display = 'none';
  document.getElementById('al-main-section').style.display        = '';
  document.getElementById('al-company-name-title').textContent    = companyName;

  // 연차 산정 기준 표시
  const co    = allCompanies.find(c => c.id === companyId);
  const basis = co?.annual_leave_basis || '회계년도 기준';
  const basisEl = document.getElementById('al-basis-label');
  if(basisEl) basisEl.textContent = `연차 산정 기준 : ${basis}`;

  renderAlTable();
}

/** 고객사 선택 화면으로 돌아가기 */
function alBackToCompanyList(){
  // _alCompanyId / currentGlobalCompanyId 는 유지 → 칩 강조 표시 보존
  document.getElementById('al-company-select-card').style.display = '';
  document.getElementById('al-main-section').style.display        = 'none';
  renderAlCompanyChips();
}

/** 연차 테이블 렌더링 (핵심) */
function renderAlTable(){
  const tbody   = document.getElementById('al-tbody');
  if(!tbody || !_alCompanyId) return;

  const refYear = parseInt(document.getElementById('al-year-sel')?.value) || new Date().getFullYear();
  const searchQ = (document.getElementById('al-emp-search')?.value||'').trim().toLowerCase();
  const co      = allCompanies.find(c => c.id === _alCompanyId);

  // ── 직원 필터링 (재직자, 일용직 제외) ──
  let emps = allEmployees.filter(e => {
    if(e.company_id !== _alCompanyId) return false;
    if((e.employment_category||'') === '일용직') return false;
    if(!(e.status === '재직' || e.status === 'active')) return false;
    if(searchQ && !(e.name||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));

  // ── 직원별 연차 계산 + 관리대장 조회 ──
  const rows = emps.map(emp => {
    const contract = allContracts.find(c =>
      c.employee_id === emp.id && (c.status==='활성'||c.status==='active')
    ) || allContracts.filter(c => c.employee_id === emp.id)
                     .sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))[0];
    if(!contract) return null;

    const al = calcEmployeeAnnualLeave(emp, contract, co, refYear);
    if(!al) return null;

    // 관리대장 레코드 조회 (해당 직원·해당 연도)
    const ledger = allLeaveLedgers.find(r =>
      r.employee_id === emp.id && Number(r.year) === refYear
    ) || null;

    // ── 사용 연차: 관리대장 합계 우선, 없으면 급여 입력값 ──
    const usedFromLedger = ledger ? (parseFloat(ledger.total_used) || 0) : null;
    const effectiveUsed  = usedFromLedger !== null ? usedFromLedger : al.usedDays;

    // 이월 연차 (관리대장에 저장된 경우)
    const carryover = ledger ? (parseFloat(ledger.carryover_days) || 0) : 0;

    // 잔여 = (이월 + 발생) - 사용
    const effectiveRemain = Math.max(0, carryover + al.totalDays - effectiveUsed);

    // 수당 추계 재계산 (잔여 변경 반영)
    const hourlyWage  = al.hourlyWage || 0;
    const workHours   = parseFloat(contract.work_hours_per_day) || 8;
    const effectivePay = Math.round(hourlyWage * workHours * effectiveRemain);

    return { emp, contract, al, ledger, effectiveUsed, carryover, effectiveRemain, effectivePay };
  }).filter(Boolean);

  // ── 통계 카드 업데이트 ──
  const sumTotal   = rows.reduce((s,r) => s + r.al.totalDays,       0);
  const sumUsed    = rows.reduce((s,r) => s + r.effectiveUsed,       0);
  const sumRemain  = rows.reduce((s,r) => s + r.effectiveRemain,     0);
  const sumPay     = rows.reduce((s,r) => s + r.effectivePay,        0);
  const setV = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  setV('al-stat-emp',        rows.length+'명');
  setV('al-stat-total',      sumTotal+'일');
  setV('al-stat-used',       sumUsed%1===0 ? sumUsed+'일' : sumUsed.toFixed(2)+'일');
  setV('al-stat-remain',     sumRemain%1===0 ? sumRemain+'일' : sumRemain.toFixed(2)+'일');
  setV('al-stat-remain-pay', `수당 추계 ${won(sumPay)}`);

  // ── 페이지네이션 ──
  const totalPages = Math.max(1, Math.ceil(rows.length / AL_PAGE_SIZE));
  if(_alPage > totalPages) _alPage = totalPages;
  const pageData = rows.slice((_alPage-1)*AL_PAGE_SIZE, _alPage*AL_PAGE_SIZE);

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="9" class="al-empty"><i class="fas fa-user-slash"></i><br>조회된 직원이 없습니다.</td></tr>`;
    document.getElementById('al-pagination').innerHTML = '';
    return;
  }

  // ── 일수 포맷 (0.25 단위까지 표현) ──
  const fmtD = v => {
    if(v == null || isNaN(v)) return '-';
    const n = parseFloat(v);
    if(n === Math.floor(n)) return `${n}일`;
    return `${parseFloat(n.toFixed(2))}일`;
  };
  const catBadgeCls = {
    '정규직':'badge-green','정규직 수습':'badge-blue',
    '계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'
  };

  tbody.innerHTML = pageData.map(({emp, contract, al, ledger, effectiveUsed, carryover, effectiveRemain, effectivePay}) => {
    const cat      = emp.employment_category || contract.contract_type || '-';
    const badgeCls = catBadgeCls[cat] || 'badge-purple';

    // 잔여 연차 색상
    const remainCls = effectiveRemain <= 0
      ? 'al-remain-danger'
      : effectiveRemain <= 3 ? 'al-remain-warn' : 'al-remain-ok';

    // ── 관리대장 저장 여부 배지 ──
    // 저장된 경우: 관리대장 출처 표시 + 이월연차 표기
    const usedCell = ledger
      ? `<span style="font-weight:700;color:#0d9488;">${fmtD(effectiveUsed)}</span>
         <span style="display:block;font-size:10px;color:#6b7280;margin-top:1px;">
           <i class="fas fa-clipboard-check" style="color:#0d9488;font-size:9px;"></i> 관리대장
         </span>`
      : `<span style="color:#6b7280;">${fmtD(effectiveUsed)}</span>
         <span style="display:block;font-size:10px;color:#9ca3af;margin-top:1px;">급여입력</span>`;

    // 이월 연차 표시 (있을 때만)
    const carryoverBadge = carryover > 0
      ? `<span style="display:inline-flex;align-items:center;gap:3px;
             margin-left:4px;padding:1px 6px;border-radius:10px;
             font-size:10px;font-weight:700;background:#eff6ff;color:#1d4ed8;
             border:1px solid #bfdbfe;" title="이월연차 포함">
           이월 ${fmtD(carryover)}
         </span>`
      : '';

    // 사용촉진 버튼
    const promoBtn = effectiveRemain > 0
      ? `<button class="al-promo-btn" onclick="openAlPromoModal('${emp.id}')">
           <i class="fas fa-paper-plane"></i> 촉진
         </button>`
      : `<span style="font-size:11.5px;color:#d1d5db;">-</span>`;

    // 관리 버튼 — 저장된 관리대장 있으면 체크 표시
    const ledgerBtn = `<button class="al-ledger-btn${ledger?' has-ledger':''}"
        onclick="openLeaveLedger('${emp.id}','${(emp.name||'').replace(/'/g,"\\'")}',${refYear})"
        style="${ledger?'background:linear-gradient(135deg,#0f766e,#065f46);':''}"
        title="${ledger?'관리대장 저장됨':'관리대장 미입력'}">
        <i class="fas fa-clipboard-${ledger?'check':'list'}"></i> 관리
      </button>`;

    return `<tr>
      <td style="font-weight:700;color:#111827;">${emp.name||'-'}</td>
      <td><span class="badge ${badgeCls}" style="font-size:11px;">${cat}</span></td>
      <td style="font-size:12px;color:#6b7280;">${emp.hire_date||contract.contract_start||'-'}</td>
      <td class="right num" style="font-weight:600;">${fmtD(al.totalDays)}${carryoverBadge}</td>
      <td class="right" style="line-height:1.3;padding:6px 13px;">${usedCell}</td>
      <td class="right num ${remainCls}">${fmtD(effectiveRemain)}</td>
      <td class="right num" style="color:#6366f1;font-weight:600;">${effectivePay > 0 ? won(effectivePay) : '-'}</td>
      <td style="text-align:center;">${ledgerBtn}</td>
      <td style="text-align:center;">${promoBtn}</td>
    </tr>`;
  }).join('');

  // 페이지네이션
  const pagEl = document.getElementById('al-pagination');
  if(pagEl) pagEl.innerHTML = _rcBuildPagination(totalPages, _alPage, '_alPage', 'renderAlTable');
}


// ─────────────────────────────────────────────────────────────────
//  연차휴가 관리대장 모달
// ─────────────────────────────────────────────────────────────────

/** 관리대장 모달 내부 상태 */
let _ledgerEmpId    = '';
let _ledgerEmpName  = '';
let _ledgerYear     = new Date().getFullYear();
let _ledgerRecordId = '';   // 기존 레코드 id (PUT 대상), 없으면 POST
let _ledgerTotalDays = 0;   // 당해 발생 연차 (JS 계산값, _recalcLedgerSum에서 참조)
let _ledgerDailyWage = 0;   // 통상임금 일급

/**
 * 날짜 포맷 헬퍼 — Date → 'YYYY-MM-DD'
 */
function _fmtDate(d){
  if(!(d instanceof Date) || isNaN(d)) return '-';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * 연차일수 포맷 — 0.25 단위 고려
 */
function _fmtLeaveDay(v){
  if(v == null || isNaN(v)) return '-';
  const n = parseFloat(v);
  if(n === Math.floor(n)) return `${n}일`;
  // 소수점 최대 2자리
  return `${parseFloat(n.toFixed(2))}일`;
}

/**
 * 0.25 단위 연차일수 옵션 생성 (0 ~ maxDays까지, 단 합계가 maxDays 초과 안 되도록)
 * @param {number} current  현재 저장값
 * @param {number} maxVal   최대 선택 가능 값
 */
function _buildDaysOptions(current, maxVal){
  // 0.25 단위 옵션: 정수 루프로 부동소수점 오차 방지
  const MAX_UNITS = Math.min(Math.ceil((maxVal > 0 ? maxVal + 5 : 30) * 4), 240); // ×4 = 0.25 단위
  const opts = [];
  for(let u = 0; u <= MAX_UNITS; u++){
    const v     = u / 4;                              // 실제 일수값 (0, 0.25, 0.5, ...)
    const label = v === 0 ? '0' : v % 1 === 0 ? String(v) : v.toFixed(2).replace(/\.?0+$/,'');
    const sel   = (Math.round(parseFloat(current) * 4) === u) ? 'selected' : '';
    opts.push(`<option value="${v}" ${sel}>${label}</option>`);
  }
  return opts.join('');
}

/**
 * 관리대장 모달 열기
 * @param {string} empId
 * @param {string} empName
 * @param {number} refYear  현재 기준년도 셀렉트 값
 */
async function openLeaveLedger(empId, empName, refYear){
  _ledgerEmpId    = empId;
  _ledgerEmpName  = empName;
  _ledgerYear     = refYear || new Date().getFullYear();
  _ledgerRecordId = '';

  await _loadAndRenderLedger();
  openModal('al-ledger-modal');
}

/**
 * 연도 화살표 클릭 시 연도 변경 후 재렌더링
 * @param {number} delta  +1 또는 -1
 */
async function _ledgerNavYear(delta){
  _ledgerYear += delta;
  await _loadAndRenderLedger();
}

/**
 * 실제 데이터 조회 + 렌더링 (openLeaveLedger / _ledgerNavYear 공용)
 */
async function _loadAndRenderLedger(){
  // 연도 타이틀 업데이트
  const navTitle = document.getElementById('ledger-nav-title');
  if(navTitle) navTitle.textContent = `${_ledgerYear}년 연차휴가 관리대장`;

  const emp = allEmployees.find(e => e.id === _ledgerEmpId);
  if(!emp){ toast('직원 정보를 찾을 수 없습니다.', 'error'); return; }

  const contract = allContracts.find(c =>
    c.employee_id === _ledgerEmpId && (c.status === '활성' || c.status === 'active')
  ) || allContracts.filter(c => c.employee_id === _ledgerEmpId)
                   .sort((a,b) => (b.contract_start||'').localeCompare(a.contract_start||''))[0];

  const co    = allCompanies.find(c => c.id === (emp.company_id || _alCompanyId));
  const basis = co?.annual_leave_basis || '회계년도 기준';
  const hireDateStr = emp.hire_date || contract?.contract_start || '';
  const hire  = hireDateStr ? new Date(hireDateStr) : null;
  const today = new Date(); today.setHours(0,0,0,0);

  // ── 기준일 계산 ──
  let refDateStr = '';
  if(basis === '입사일 기준' && hire && !isNaN(hire)){
    const annivThis = new Date(_ledgerYear, hire.getMonth(), hire.getDate());
    refDateStr = annivThis <= today
      ? _fmtDate(annivThis)
      : _fmtDate(new Date(_ledgerYear - 1, hire.getMonth(), hire.getDate()));
  } else {
    refDateStr = `${_ledgerYear}-01-01`;
  }

  // ── 연차 산정기간 계산 ──
  // 입사일 기준: 기준일 ~ 기준일+1년-1일 / 회계년도: YYYY-01-01 ~ YYYY-12-31
  let periodStart = '', periodEnd = '';
  if(basis === '입사일 기준' && hire && !isNaN(hire)){
    const pStart = new Date(refDateStr);
    const pEnd   = new Date(pStart);
    pEnd.setFullYear(pEnd.getFullYear() + 1);
    pEnd.setDate(pEnd.getDate() - 1);
    periodStart = _fmtDate(pStart);
    periodEnd   = _fmtDate(pEnd);
  } else {
    periodStart = `${_ledgerYear}-01-01`;
    periodEnd   = `${_ledgerYear}-12-31`;
  }

  // ── 연차 계산 (calcEmployeeAnnualLeave 재사용) ──
  const al = contract ? calcEmployeeAnnualLeave(emp, contract, co, _ledgerYear) : null;
  _ledgerTotalDays = al ? al.totalDays : 0;

  // ── 통상임금 일급 ──
  const hourlyWage = al ? al.hourlyWage : 0;
  const workHours  = parseFloat(contract?.work_hours_per_day) || 8;
  _ledgerDailyWage = Math.round(hourlyWage * workHours);

  // ── 정보 행 채우기 ──
  const setText = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v||'-'; };
  setText('ledger-company-name',  co?.company_name);
  setText('ledger-basis',         basis);
  setText('ledger-ref-date',      refDateStr);
  setText('ledger-emp-name',      emp.name);
  setText('ledger-dept',          [emp.position, emp.department].filter(Boolean).join(' / ') || '-');
  setText('ledger-hire-date',     hireDateStr);
  setText('ledger-period-start',  periodStart);
  setText('ledger-period-end',    periodEnd);
  setText('ledger-total-days',    _fmtLeaveDay(_ledgerTotalDays));
  setText('agg-total-days',       _fmtLeaveDay(_ledgerTotalDays));

  // 통상임금
  setText('ledger-ordinary-wage', _ledgerDailyWage > 0 ? won(_ledgerDailyWage) + ' / 일' : '-');
  setText('ledger-wage-sub',      hourlyWage > 0 ? `시급 ${won(hourlyWage)} × ${workHours}시간` : '계약서 기본급 기준');

  // ── 기존 저장 레코드 조회 (캐시 우선, 없으면 API 직접 요청) ──
  _ledgerRecordId = '';
  let existMonthData = null;
  let existCarryover = 0;

  // 1) allLeaveLedgers 캐시에서 먼저 조회
  let rec = allLeaveLedgers.find(r =>
    r.employee_id === _ledgerEmpId && Number(r.year) === _ledgerYear
  ) || null;

  // 2) 캐시 미스 시 API 직접 요청 (첫 로드 전이거나 캐시 갱신 전)
  if(!rec){
    try{
      const res  = await fetch(`../tables/annual_leave_ledger?limit=500`);
      const json = await res.json();
      const fresh = (json.data||[]).find(r =>
        r.employee_id === _ledgerEmpId && Number(r.year) === _ledgerYear
      );
      if(fresh){
        // 캐시에 없으면 추가
        const idx = allLeaveLedgers.findIndex(x => x.id === fresh.id);
        if(idx > -1) allLeaveLedgers[idx] = fresh;
        else allLeaveLedgers.push(fresh);
        rec = fresh;
      }
    }catch(e){
      console.warn('[Ledger] 레코드 조회 실패:', e);
    }
  }

  if(rec){
    _ledgerRecordId = rec.id;
    existCarryover  = parseFloat(rec.carryover_days) || 0;
    try{ existMonthData = JSON.parse(rec.month_data||'[]'); }catch(e){ existMonthData = null; }
  }

  // ── 이월연차 인풋 초기화 ──
  const carryoverInp = document.getElementById('ledger-carryover-input');
  if(carryoverInp) carryoverInp.value = existCarryover;

  // ── 월별 테이블 렌더링 ──
  _renderLedgerMonthTable(existMonthData);

  // ── 집계 재계산 ──
  _recalcLedgerSum();
}

/**
 * 월별 tbody 렌더링 — 가로 레이아웃 (1행: 사용일수, 2행: 사용일자, 3행: 비고)
 * @param {Array|null} existData  [{month, dates, days, note}, ...]
 */
function _renderLedgerMonthTable(existData){
  const tbody = document.getElementById('ledger-month-tbody');
  if(!tbody) return;
  tbody.innerHTML = ''; // 연도 변경 시 재렌더를 위해 초기화

  const dataMap = {};
  if(Array.isArray(existData)){
    existData.forEach(r => { dataMap[r.month] = r; });
  }

  // ── 행1: 사용일수 (select 드롭다운, 0.25 단위) ──
  const daysRow = document.createElement('tr');
  daysRow.innerHTML = `<td class="month-label" style="background:#e8f0fe;color:#1e3a8a;font-size:11px;">사용<br>일수</td>` +
    Array.from({length:12}, (_,i) => {
      const m   = i + 1;
      const d   = dataMap[m] || {};
      const val = d.days != null ? parseFloat(d.days) : 0;
      const hasCls = val > 0 ? ' has-value' : '';
      return `<td class="days-cell">
        <select class="ledger-days-sel${hasCls}" data-month="${m}" onchange="_onLedgerDaysChange(this)">
          ${_buildDaysOptions(val, _ledgerTotalDays + 10)}
        </select>
      </td>`;
    }).join('') +
    `<td class="sum-val" id="ledger-sum-days-cell" rowspan="3"
        style="vertical-align:middle;font-size:15px;font-weight:800;color:#0d9488;min-width:70px;text-align:center;">0일</td>`;
  tbody.appendChild(daysRow);

  // ── 행2: 사용일자 (텍스트 자유입력) ──
  const datesRow = document.createElement('tr');
  datesRow.innerHTML = `<td class="month-label" style="font-size:11px;color:#6b7280;">사용<br>일자</td>` +
    Array.from({length:12}, (_,i) => {
      const m = i + 1;
      const d = dataMap[m] || {};
      return `<td style="padding:0;border:1px solid #e2e8f0;">
        <input type="text" class="ledger-dates-input" data-month="${m}"
          value="${d.dates||''}"
          placeholder="예) 3일, 15~16일"
          style="width:100%;height:100%;min-height:32px;padding:4px 6px;border:none;
                 outline:none;font-size:11px;font-family:inherit;color:#374151;
                 background:transparent;box-sizing:border-box;">
      </td>`;
    }).join('');
  tbody.appendChild(datesRow);

  // ── 행3: 비고 ──
  const noteRow = document.createElement('tr');
  noteRow.innerHTML = `<td class="month-label" style="font-size:11px;color:#6b7280;">비고</td>` +
    Array.from({length:12}, (_,i) => {
      const m = i + 1;
      const d = dataMap[m] || {};
      return `<td class="note-cell" style="padding:0;">
        <input type="text" class="ledger-note-input" data-month="${m}"
          value="${d.note||''}"
          placeholder=""
          style="width:100%;height:100%;min-height:32px;padding:4px 6px;border:none;
                 outline:none;font-size:11px;font-family:inherit;color:#6b7280;
                 background:transparent;box-sizing:border-box;">
      </td>`;
    }).join('');
  tbody.appendChild(noteRow);
}

/** 일수 select 변경 시 — 강조 클래스 토글 + 재계산 */
function _onLedgerDaysChange(sel){
  const val = parseFloat(sel.value) || 0;
  sel.classList.toggle('has-value', val > 0);
  _recalcLedgerSum();
}

/** 합계 / 잔여 / 수당 재계산 (항상 현재 DOM 값으로) */
function _recalcLedgerSum(){
  // 월별 사용일수 합산
  let usedSum = 0;
  document.querySelectorAll('#ledger-month-tbody .ledger-days-sel').forEach(sel => {
    usedSum += parseFloat(sel.value) || 0;
  });
  // 이월연차
  const carryover = parseFloat(document.getElementById('ledger-carryover-input')?.value) || 0;
  // 총 합계 = 이월 + 당해 발생
  const grandTotal = carryover + _ledgerTotalDays;
  // 잔여 = 총 합계 - 사용
  const remain = Math.max(0, grandTotal - usedSum);
  // 잔여 수당 추계
  const leavePay = Math.round(_ledgerDailyWage * remain);

  const setText = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  setText('ledger-sum-days-cell', _fmtLeaveDay(usedSum));
  setText('agg-total-days',       _fmtLeaveDay(_ledgerTotalDays));
  setText('agg-grand-total',      _fmtLeaveDay(grandTotal));
  setText('agg-used-days',        _fmtLeaveDay(usedSum));
  setText('agg-remain-days',      _fmtLeaveDay(remain));
  setText('ledger-leave-pay',     leavePay > 0 ? won(leavePay) : (_ledgerDailyWage > 0 ? '0원' : '-'));

  // 잔여일수 색상
  const remainEl = document.getElementById('agg-remain-days');
  if(remainEl) remainEl.style.color = remain <= 0 ? '#dc2626' : '#7c3aed';

  // 수당 색상
  const payEl = document.getElementById('ledger-leave-pay');
  if(payEl) payEl.style.color = remain <= 0 ? '#9ca3af' : '#7c3aed';
}

/** 관리대장 저장 */
async function saveLeaveLedger(){
  const saveBtn = document.getElementById('ledger-save-btn');
  if(saveBtn){ saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...'; }

  try{
    // ── 월별 데이터 수집 ──
    const monthData = [];
    let totalUsed = 0;
    const selList  = document.querySelectorAll('#ledger-month-tbody .ledger-days-sel');
    const dateList = document.querySelectorAll('#ledger-month-tbody .ledger-dates-input');
    const noteList = document.querySelectorAll('#ledger-month-tbody .ledger-note-input');

    selList.forEach((sel, idx) => {
      const m    = parseInt(sel.dataset.month);
      const days = parseFloat(sel.value) || 0;
      const dates = (dateList[idx]?.value || '').trim();
      const note  = (noteList[idx]?.value || '').trim();
      monthData.push({ month: m, dates, days, note });
      totalUsed += days;
    });

    // ── 집계값 ──
    const carryover  = parseFloat(document.getElementById('ledger-carryover-input')?.value) || 0;
    const grandTotal = carryover + _ledgerTotalDays;
    const remain     = Math.max(0, grandTotal - totalUsed);
    const leavePay   = Math.round(_ledgerDailyWage * remain);

    // ── 기준일 / 산정기간 ──
    const refDate     = document.getElementById('ledger-ref-date')?.textContent || '';
    const periodStart = document.getElementById('ledger-period-start')?.textContent || '';
    const periodEnd   = document.getElementById('ledger-period-end')?.textContent || '';

    const emp = allEmployees.find(e => e.id === _ledgerEmpId);
    const co  = allCompanies.find(c => c.id === (emp?.company_id || _alCompanyId));

    const payload = {
      employee_id        : _ledgerEmpId,
      company_id         : co?.id || _alCompanyId || '',
      year               : _ledgerYear,
      ref_date           : refDate,
      period_start       : periodStart,
      period_end         : periodEnd,
      total_days         : _ledgerTotalDays,
      carryover_days     : carryover,
      month_data         : JSON.stringify(monthData),
      total_used         : totalUsed,
      remain_days        : remain,
      ordinary_wage      : _ledgerDailyWage,
      leave_pay_estimate : leavePay,
    };

    let res;
    if(_ledgerRecordId){
      res = await fetch(`../tables/annual_leave_ledger/${_ledgerRecordId}`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
    } else {
      res = await fetch('../tables/annual_leave_ledger', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });
    }

    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const saved = await res.json();
    _ledgerRecordId = saved.id;

    // ── allLeaveLedgers 캐시 갱신 (저장 즉시 목록에 반영) ──
    const existIdx = allLeaveLedgers.findIndex(r => r.id === saved.id);
    if(existIdx > -1){
      allLeaveLedgers[existIdx] = saved;   // PUT: 기존 레코드 교체
    } else {
      allLeaveLedgers.push(saved);          // POST: 신규 추가
    }

    // ── 연차 목록 테이블 즉시 재렌더링 ──
    renderAlTable();

    toast(`${_ledgerEmpName}의 ${_ledgerYear}년 연차 관리대장이 저장되었습니다.`, 'success');

  }catch(e){
    console.error('[LedgerSave]', e);
    toast('저장 중 오류가 발생했습니다: ' + e.message, 'error');
  } finally {
    if(saveBtn){ saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> 저장'; }
  }
}

// ─────────────────────────────────────────────────────────────────
//  사용촉진 모달
// ─────────────────────────────────────────────────────────────────

/** 사용촉진 모달 열기 */
function openAlPromoModal(empId){
  const emp      = allEmployees.find(e => e.id === empId);
  if(!emp){ toast('직원 정보를 찾을 수 없습니다.','error'); return; }
  const contract = allContracts.find(c =>
    c.employee_id === empId && (c.status==='활성'||c.status==='active')
  ) || allContracts.filter(c=>c.employee_id===empId)
                   .sort((a,b)=>(b.contract_start||'').localeCompare(a.contract_start||''))[0];
  if(!contract){ toast('활성 계약 정보를 찾을 수 없습니다.','error'); return; }

  const co      = allCompanies.find(c => c.id === emp.company_id);
  const refYear = parseInt(document.getElementById('al-year-sel')?.value) || new Date().getFullYear();
  const al      = calcEmployeeAnnualLeave(emp, contract, co, refYear);
  if(!al){ toast('연차 계산 오류가 발생했습니다.','error'); return; }

  _alPromoEmpId = empId;
  _alPromoData  = { emp, contract, co, al, refYear };

  const adminNm = _getAdminUsername();

  // ── 직원 정보 요약 (3열 그리드) ──
  const infoEl = document.getElementById('al-promo-emp-info');
  if(infoEl){
    const rows = [
      ['직원명',              emp.name||'-'],
      ['고객사',              co?.company_name||'-'],
      ['고용형태',            emp.employment_category||contract.contract_type||'-'],
      [`${refYear}년 총 발생`, `${al.totalDays}일`],
      ['사용 연차',           `${al.usedDays}일`],
      ['잔여 연차',           `<strong style="color:#6366f1;font-size:14px;">${al.remainDays}일</strong>`],
    ];
    infoEl.innerHTML = rows.map(([l,v])=>`
      <div><span style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:2px;">${l}</span>
           <span style="color:#111827;font-weight:700;font-size:13px;">${v}</span></div>`).join('');
  }

  // ── 근로자용 메시지 미리보기 ──
  const workerBody = _buildLeavePromoWorkerBody(emp, co, al, refYear, adminNm);
  const wPrev = document.getElementById('al-promo-worker-preview');
  if(wPrev) wPrev.textContent = workerBody;

  // ── 고객사 알림 미리보기 ──
  const coBody = _buildLeavePromoCompanyBody(emp, co, al, refYear, adminNm, '?');
  const cPrev  = document.getElementById('al-promo-company-preview');
  if(cPrev) cPrev.textContent = coBody;

  // ── 연락처 상태 표시 ──
  const contactEl = document.getElementById('al-promo-contact-status');
  if(contactEl){
    const hasPhone = !!(emp.phone||'').trim();
    const hasEmail = !!(emp.email||'').trim();
    contactEl.innerHTML = [
      hasPhone
        ? `<span style="color:#059669;"><i class="fas fa-check-circle"></i> 휴대폰 ${emp.phone}</span>`
        : `<span style="color:#dc2626;"><i class="fas fa-exclamation-circle"></i> 휴대폰 미등록 (알림톡 불가)</span>`,
      hasEmail
        ? `<span style="color:#059669;"><i class="fas fa-check-circle"></i> 이메일 ${emp.email}</span>`
        : `<span style="color:#dc2626;"><i class="fas fa-exclamation-circle"></i> 이메일 미등록 (이메일 불가)</span>`,
    ].join('');
  }

  // ── 버튼 활성/비활성 ──
  const hasPhone = !!(emp.phone||'').trim();
  const hasEmail = !!(emp.email||'').trim();
  const btnKakao = document.getElementById('al-btn-kakao');
  const btnEmail = document.getElementById('al-btn-email');
  if(btnKakao){ btnKakao.disabled = !hasPhone; btnKakao.style.opacity = hasPhone?'1':'0.4'; }
  if(btnEmail){ btnEmail.disabled = !hasEmail; btnEmail.style.opacity = hasEmail?'1':'0.4'; }

  openModal('al-promo-modal');
}

/**
 * 근로자용 사용촉진 메시지 본문 (알림톡·이메일 직접 수신)
 */
function _buildLeavePromoWorkerBody(emp, co, al, refYear, adminName){
  const endDate = _calcLeaveEndDate(emp, al, refYear);
  return `안녕하세요, ${emp.name||''} 님.

${refYear}년도 미사용 연차 유급휴가가 남아 있어 사용을 촉진합니다.

■ ${refYear}년 총 발생 연차: ${al.totalDays}일
■ 현재까지 사용 연차     : ${al.usedDays}일
■ 잔여 연차             : ${al.remainDays}일
■ 사용 기한             : ${endDate}까지

「근로기준법」 제61조에 따라 위 기한까지 잔여 연차를 사용해 주시기 바랍니다.
기한 내 미사용 시 미사용 연차수당 청구권이 소멸될 수 있습니다.

연차 사용 시 소속 사업장에 사전 신청하여 주시기 바랍니다.

담당 노무사: ${adminName}
※ 본 통지는 근로기준법 제61조에 따른 공식 연차 사용촉진 통지서입니다.`;
}

/**
 * 고객사(고용주)용 앱 알림 본문 — 사용촉진 발송 사실 통보
 */
function _buildLeavePromoCompanyBody(emp, co, al, refYear, adminName, workerMethod){
  const coRep   = co?.representative || '';
  const endDate = _calcLeaveEndDate(emp, al, refYear);
  const methodLabel = workerMethod === '유선직접안내'
    ? '유선(전화) 직접 안내'
    : workerMethod === '알림톡' ? '카카오 알림톡' : workerMethod;
  const today = new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  return `안녕하세요${coRep ? `, ${coRep} 사장님` : ''}.

소속 직원에게 연차 사용촉진 통지를 발송하였음을 안내드립니다.

■ 대상 직원  : ${emp.name}
■ 발송 일시  : ${today}
■ 발송 방법  : ${methodLabel}
■ ${refYear}년 잔여 연차: ${al.remainDays}일 (사용기한: ${endDate})

해당 직원이 기한 내 연차를 미사용할 경우, 「근로기준법」 제61조에 따라 미사용 연차수당 지급 의무가 소멸될 수 있습니다.
자세한 사항은 담당 노무사 ${adminName}에게 문의하시기 바랍니다.`;
}

/** 연차 사용 기한 계산 헬퍼 */
function _calcLeaveEndDate(emp, al, refYear){
  if(al.basis === '입사일 기준'){
    const hire = new Date(emp.hire_date||'');
    if(!isNaN(hire)){
      return `${refYear}-${String(hire.getMonth()+1).padStart(2,'0')}-${String(hire.getDate()).padStart(2,'0')}`;
    }
  }
  return `${refYear}-12-31`;
}

/**
 * 사용촉진 발송 실행
 * @param {string} method  '알림톡' | '이메일' | '유선직접안내'
 */
async function confirmSendLeavePromotion(method){
  if(!_alPromoEmpId || !_alPromoData){ toast('발송 대상 정보가 없습니다.','error'); return; }

  const { emp, contract, co, al, refYear } = _alPromoData;
  const adminName = _getAdminUsername();

  // 연락처 검증
  if(method === '알림톡' && !(emp.phone||'').trim()){
    toast(`${emp.name} — 휴대폰 번호가 등록되지 않았습니다.`, 'error'); return;
  }
  if(method === '이메일' && !(emp.email||'').trim()){
    toast(`${emp.name} — 이메일이 등록되지 않았습니다.`, 'error'); return;
  }

  // 발송 확인
  const confirmMsg = method === '유선직접안내'
    ? `[유선 직접 안내 완료 선언]\n\n${emp.name} 님에게 전화로 ${refYear}년 연차 사용촉진 안내를 완료하셨습니까?\n잔여 연차: ${al.remainDays}일\n\n완료 선언 시 이력이 기록되고 고객사 앱에 발송 사실이 통보됩니다.`
    : `[연차 사용촉진 ${method} 발송]\n\n${emp.name} 님 (${co?.company_name||''})\n잔여 연차: ${al.remainDays}일\n수신: ${ method==='알림톡' ? emp.phone : emp.email }\n\n발송 후 고객사 앱에 자동으로 통보됩니다.\n\n발송하시겠습니까?`;
  if(!confirm(confirmMsg)) return;

  // 버튼 비활성
  const btnMap = { '알림톡':'al-btn-kakao', '이메일':'al-btn-email', '유선직접안내':'al-btn-phone' };
  const activeBtn = document.getElementById(btnMap[method]);
  if(activeBtn){ activeBtn.disabled=true; activeBtn.innerHTML=`<i class="fas fa-circle-notch fa-spin"></i> 처리 중...`; }

  try {
    // ── ① 근로자 발송 (알림톡·이메일만, 유선은 이력만) ──
    if(method === '알림톡'){
      // 실제 카카오 API 연동 시 교체
      await new Promise(r=>setTimeout(r,400));
      console.log('[알림톡] 연차 사용촉진 발송:', emp.phone, emp.name);
    } else if(method === '이메일'){
      // 실제 이메일 API 연동 시 교체
      await new Promise(r=>setTimeout(r,400));
      console.log('[이메일] 연차 사용촉진 발송:', emp.email, emp.name);
    }
    // 유선직접안내는 별도 발송 없음 — 이력만 기록

    // ── ② 고객사 앱 알림 (항상 발송) ──
    const coBody  = _buildLeavePromoCompanyBody(emp, co, al, refYear, adminName, method);
    const coTitle = `[연차 사용촉진 통보] ${emp.name} — ${refYear}년 잔여 ${al.remainDays}일`;
    await fetch('../tables/company_notices', {
      method : 'POST',
      headers: {'Content-Type':'application/json'},
      body   : JSON.stringify({
        company_id       : co?.id||'',
        company_name     : co?.company_name||'',
        notice_type      : 'leave_promotion',
        title            : coTitle,
        body             : coBody,
        contract_id      : contract?.id||'',
        employee_id      : emp.id,
        employee_name    : emp.name,
        contract_end     : '',
        days_until_expiry: 0,
        sent_at          : new Date().toISOString(),
        sent_by          : adminName,
        is_read          : false,
        read_at          : '',
      }),
    });

    // ── ③ 발송 이력 저장 ──
    const methodLabel = method === '유선직접안내' ? '유선직접안내' : method;
    await fetch('../tables/annual_leave_promotions', {
      method : 'POST',
      headers: {'Content-Type':'application/json'},
      body   : JSON.stringify({
        employee_id          : emp.id,
        employee_name        : emp.name,
        company_id           : co?.id||'',
        company_name         : co?.company_name||'',
        contract_type        : emp.employment_category||contract.contract_type||'',
        total_leave_days     : al.totalDays,
        used_leave_days      : al.usedDays,
        remaining_leave_days : al.remainDays,
        annual_leave_basis   : al.basis,
        leave_pay_estimate   : al.leavePay,
        worker_send_method   : methodLabel,
        sent_at              : new Date().toISOString(),
        sent_by              : adminName,
        note: method === '유선직접안내'
          ? `${refYear}년 기준 — 유선 직접 안내 완료 (이력 기록)`
          : `${refYear}년 기준 — 근로자 ${method} 발송 + 고객사 앱 통보`,
      }),
    });

    const successMsg = method === '유선직접안내'
      ? `✅ ${emp.name} — 유선 직접 안내 완료 기록 + 고객사 앱 통보`
      : `✅ ${emp.name} — ${method} 발송 완료 + 고객사 앱 통보`;
    toast(successMsg, 'success');
    closeModal('al-promo-modal');
    _lpHistoryLoaded = false;
    await loadLeavePromotionHistory(true);
  } catch(e){
    console.error('[연차 사용촉진 발송 오류]', e);
    toast('발송 중 오류가 발생했습니다.', 'error');
  } finally {
    // 버튼 원복
    if(activeBtn){ activeBtn.disabled=false; }
    const btnKakao = document.getElementById('al-btn-kakao');
    const btnEmail = document.getElementById('al-btn-email');
    const btnPhone = document.getElementById('al-btn-phone');
    const hP = !!(_alPromoData?.emp?.phone||'').trim();
    const hE = !!(_alPromoData?.emp?.email||'').trim();
    if(btnKakao){ btnKakao.disabled=!hP; btnKakao.style.opacity=hP?'1':'0.4';
      btnKakao.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.527 1.523 4.75 3.838 6.105l-.98 3.607a.375.375 0 0 0 .544.424L9.928 18.4A11.4 11.4 0 0 0 12 18.6c5.523 0 10-3.806 10-8.1S17.523 3 12 3z"/></svg> 카카오 알림톡'; }
    if(btnEmail){ btnEmail.disabled=!hE; btnEmail.style.opacity=hE?'1':'0.4';
      btnEmail.innerHTML='<i class="fas fa-envelope"></i> 이메일'; }
    if(btnPhone){ btnPhone.disabled=false;
      btnPhone.innerHTML='<i class="fas fa-phone-alt" style="color:#059669;"></i> 유선 직접 안내 완료'; }
  }
}

// ─────────────────────────────────────────────────────────────────
//  사용촉진 발송 이력 (page-leave-promotion)
// ─────────────────────────────────────────────────────────────────

/** 사용촉진 이력 DB 조회 */
async function loadLeavePromotionHistory(force=false){
  if(!force && _lpHistoryLoaded) return;
  try {
    let page=1, all=[];
    while(true){
      const res  = await fetch(`../tables/annual_leave_promotions?page=${page}&limit=200&sort=sent_at`);
      const data = await res.json();
      const rows = data.data||[];
      all.push(...rows);
      if(rows.length < 200) break;
      page++;
    }
    _lpHistoryList   = all.sort((a,b)=>(b.sent_at||'').localeCompare(a.sent_at||''));
    _lpHistoryLoaded = true;
    // 고객사 필터 채우기
    _lpFillCompanyFilter();
  } catch(e){
    console.error('[사용촉진 이력 조회 오류]', e);
  }
}

/** LP 페이지 초기화 */
async function initLpPage(){
  _lpPage = 1;
  if(!_lpHistoryLoaded) await loadLeavePromotionHistory(true);
  renderLpTable();
}

/** LP 고객사 필터 옵션 채우기 */
function _lpFillCompanyFilter(){
  const sel = document.getElementById('lp-filter-company');
  if(!sel) return;
  while(sel.options.length > 1) sel.remove(1);
  const seen = new Set();
  _lpHistoryList.forEach(r => {
    if(!seen.has(r.company_id)){
      seen.add(r.company_id);
      const opt = document.createElement('option');
      opt.value = r.company_id; opt.textContent = r.company_name||r.company_id;
      sel.appendChild(opt);
    }
  });
}

/** LP 테이블 렌더링 */
function renderLpTable(){
  const tbody = document.getElementById('lp-tbody');
  if(!tbody) return;

  const filterCo     = document.getElementById('lp-filter-company')?.value  || '';
  const filterMethod = document.getElementById('lp-filter-method')?.value   || '';
  const fromVal      = document.getElementById('lp-filter-month-from')?.value || '';
  const toVal        = document.getElementById('lp-filter-month-to')?.value   || '';
  const searchQ      = (document.getElementById('lp-search')?.value||'').trim().toLowerCase();

  let list = _lpHistoryList.filter(r => {
    if(filterCo     && r.company_id        !== filterCo)     return false;
    // 근로자 발송 방식 필터 (worker_send_method 기준)
    if(filterMethod && r.worker_send_method !== filterMethod) return false;
    if(searchQ      && !(r.employee_name||'').toLowerCase().includes(searchQ)) return false;
    // 기간 필터 (YYYY-MM 비교)
    const ym = (r.sent_at||'').slice(0,7);
    if(fromVal && ym < fromVal) return false;
    if(toVal   && ym > toVal)   return false;
    return true;
  }).sort((a,b)=>(a.employee_name||'').localeCompare(b.employee_name||'','ko'));

  // 요약 통계
  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthCnt = list.filter(r=>(r.sent_at||'').startsWith(curYM)).length;
  const totalCntEl = document.getElementById('lp-total-count');
  const monthCntEl = document.getElementById('lp-month-count');
  if(totalCntEl) totalCntEl.textContent = list.length;
  if(monthCntEl) monthCntEl.textContent = monthCnt;

  const totalPages = Math.max(1, Math.ceil(list.length / LP_PAGE_SIZE));
  if(_lpPage > totalPages) _lpPage = totalPages;
  const pageData = list.slice((_lpPage-1)*LP_PAGE_SIZE, _lpPage*LP_PAGE_SIZE);

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="11" class="al-empty"><i class="fas fa-inbox"></i><br>발송 이력이 없습니다.</td></tr>`;
    document.getElementById('lp-pagination').innerHTML='';
    return;
  }

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d)?'-':d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };
  // 근로자 발송 방식 배지
  const workerMethodBadge = m => {
    const cfg = {
      '알림톡'      : { bg:'#fef9c3', c:'#713f12', icon:'fas fa-comment' },
      '이메일'      : { bg:'#dbeafe', c:'#1e40af', icon:'fas fa-envelope' },
      '유선직접안내': { bg:'#d1fae5', c:'#065f46', icon:'fas fa-phone-alt' },
    };
    const s = cfg[m] || { bg:'#f3f4f6', c:'#374151', icon:'fas fa-question' };
    return `<span style="background:${s.bg};color:${s.c};padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
      <i class="${s.icon}" style="font-size:10px;"></i>${m||'-'}
    </span>`;
  };
  // 고객사 앱 알림 고정 배지
  const companyNoticeBadge = `<span style="background:#dcfce7;color:#166534;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="fas fa-check" style="font-size:10px;"></i>인앱 발송</span>`;

  const catBadgeCls={'정규직':'badge-green','정규직 수습':'badge-blue','계약직':'badge-purple','계약직 수습':'badge-pink'};
  const fmtD = d => (d===null||d===undefined||d==='') ? '-' : `${d}일`;

  tbody.innerHTML = pageData.map(r=>{
    const cls = catBadgeCls[r.contract_type]||'badge-purple';
    return `<tr>
      <td style="font-size:12px;color:#374151;white-space:nowrap;">${fmtDt(r.sent_at)}</td>
      <td style="font-weight:600;color:#111827;">${r.employee_name||'-'}</td>
      <td><span class="badge ${cls}" style="font-size:11px;">${r.contract_type||'-'}</span></td>
      <td style="font-size:12px;color:#374151;">${r.company_name||'-'}</td>
      <td class="right num">${fmtD(r.total_leave_days)}</td>
      <td class="right num" style="color:#6b7280;">${fmtD(r.used_leave_days)}</td>
      <td class="right num" style="color:#6366f1;font-weight:700;">${fmtD(r.remaining_leave_days)}</td>
      <td>${workerMethodBadge(r.worker_send_method)}</td>
      <td>${companyNoticeBadge}</td>
      <td style="font-size:12px;color:#6b7280;">${_resolveAdminName(r.sent_by)||'-'}</td>
      <td><span class="al-badge-basis">${r.annual_leave_basis||'-'}</span></td>
    </tr>`;
  }).join('');

  const pagEl = document.getElementById('lp-pagination');
  if(pagEl) pagEl.innerHTML = _rcBuildPagination(totalPages, _lpPage, '_lpPage', 'renderLpTable');
}

// ══════════════════════════════════════════════════════════════════
//  (이하 기존 코드)
// ══════════════════════════════════════════════════════════════════

/** 발송 이력 렌더링 */
function renderCenHistory(){
  const tbody = document.getElementById('cen-log-tbody');
  if(!tbody) return;

  const filterMethod  = document.getElementById('cen-log-filter-method')?.value  || '';
  const filterCompany = document.getElementById('cen-log-filter-company')?.value || '';
  const searchQ       = (document.getElementById('cen-log-search')?.value || '').trim().toLowerCase();

  // 고객사 필터 옵션 동적 채우기 (최초 1회)
  const coSel = document.getElementById('cen-log-filter-company');
  if(coSel && coSel.options.length <= 1){
    const uniqueCos = [...new Map(_cenNoticeList.map(r=>[r.company_id, r.company_name])).entries()]
      .sort((a,b)=>(a[1]||'').localeCompare(b[1]||'','ko'));
    uniqueCos.forEach(([id,name])=>{
      const opt=document.createElement('option');
      opt.value=id; opt.textContent=name||id; coSel.appendChild(opt);
    });
  }

  let list = _cenNoticeList.filter(r=>{
    if(filterMethod  && r.notice_method  !== filterMethod)  return false;
    if(filterCompany && r.company_id     !== filterCompany) return false;
    if(searchQ && !(r.employee_name||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b)=>(a.employee_name||'').localeCompare(b.employee_name||'','ko'));

  const totalPages = Math.max(1, Math.ceil(list.length / CEN_PAGE_SIZE));
  if(_cenHistoryPage > totalPages) _cenHistoryPage = totalPages;
  const pageData = list.slice((_cenHistoryPage-1)*CEN_PAGE_SIZE, _cenHistoryPage*CEN_PAGE_SIZE);

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="9" class="cen-empty">
      <i class="fas fa-inbox"></i> 발송 이력이 없습니다.
    </td></tr>`;
    document.getElementById('cen-log-pagination').innerHTML = '';
    return;
  }

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d)?'-':d.toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
  };
  const methodBadge = m => {
    const cfg = {
      '알림톡' :{ bg:'#fef9c3',color:'#713f12' },
      '이메일' :{ bg:'#dbeafe',color:'#1e40af' },
      '수동배부':{ bg:'#d1fae5',color:'#065f46' },
    };
    const c = cfg[m]||{bg:'#f3f4f6',color:'#374151'};
    return `<span style="background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:700;">${m||'-'}</span>`;
  };
  const statusBadge = s => {
    const cfg = {
      '완료':{ bg:'#dcfce7',color:'#166534' },
      '실패':{ bg:'#fee2e2',color:'#991b1b' },
      '대기':{ bg:'#e0e7ff',color:'#3730a3' },
    };
    const c = cfg[s]||{bg:'#f3f4f6',color:'#374151'};
    return `<span style="background:${c.bg};color:${c.color};padding:2px 9px;border-radius:20px;font-size:11.5px;font-weight:700;">${s||'-'}</span>`;
  };
  const catBadgeCls = {'계약직':'badge-purple','계약직 수습':'badge-pink','일용직':'badge-orange'};

  tbody.innerHTML = pageData.map((r,idx)=>`
    <tr style="${idx%2?'background:#fafafa':''}" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='${idx%2?'#fafafa':''}'">
      <td style="white-space:nowrap;">${fmtDt(r.noticed_at)}</td>
      <td style="font-weight:700;color:#4f46e5;">${r.employee_name||'-'}</td>
      <td><span class="badge ${catBadgeCls[r.contract_type]||'badge-gray'}" style="font-size:11px;">${r.contract_type||'-'}</span></td>
      <td style="font-size:12px;color:#374151;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.company_name||''}">${r.company_name||'-'}</td>
      <td style="font-size:12px;color:#6b7280;">${r.contract_end||'-'}</td>
      <td>${methodBadge(r.notice_method)}</td>
      <td>${statusBadge(r.notice_status)}</td>
      <td style="font-size:12px;color:#374151;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.recipient||''}">${r.recipient||'-'}</td>
      <td style="font-size:12px;color:#6b7280;">${_resolveAdminName(r.noticed_by)||'-'}</td>
    </tr>`).join('');

  _cenRenderPagination('cen-log-pagination', list.length, _cenHistoryPage, 'setCenHistoryPage');
}

function setCenHistoryPage(p){ _cenHistoryPage = p; renderCenHistory(); }

/** CEN 전용 페이지네이션 렌더 (CEN_PAGE_SIZE 기준) */
function _cenRenderPagination(containerId, total, page, fn){
  const container = document.getElementById(containerId);
  if(!container) return;
  if(total === 0){ container.innerHTML = ''; return; }
  const totalPages = Math.max(1, Math.ceil(total / CEN_PAGE_SIZE));
  const s = Math.min((page-1)*CEN_PAGE_SIZE+1, total);
  const e = Math.min(page*CEN_PAGE_SIZE, total);
  const btnRange = Array.from({length: Math.min(totalPages,5)}, (_,i)=>{
    const p = Math.max(1, Math.min(page-2, totalPages-4)) + i;
    return p > totalPages ? '' : `<button class="page-btn ${p===page?'active':''}" onclick="${fn}(${p})">${p}</button>`;
  }).join('');
  container.innerHTML = `
    <span class="page-info">${total}건 중 ${s}-${e}</span>
    <div class="page-btns">
      <button class="page-btn" onclick="${fn}(${page-1})" ${page<=1?'disabled style="opacity:.4"':''}><i class="fas fa-chevron-left"></i></button>
      ${btnRange}
      <button class="page-btn" onclick="${fn}(${page+1})" ${page>=totalPages?'disabled style="opacity:.4"':''}><i class="fas fa-chevron-right"></i></button>
    </div>`;
}
// ══════════════════════════════════════════════════════════════════════
// END 계약만료 통지 관리
// ══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
//  고객사 알림 발송 이력 (page-company-notice-log)
// ══════════════════════════════════════════════════════════════════════

const CNL_PAGE_SIZE = 20;  // 페이지당 20건

// ── 상태 변수 ──
let _cnlCompanyId   = '';   // '' = 전체 고객사
let _cnlCompanyName = '';
let _cnlList        = [];   // 전체 로드된 원본 목록
let _cnlPage        = 1;
let _cnlLoaded      = false;

// ── notice_type → 한글 레이블 ──
const CNL_TYPE_LABEL = {
  contract_created              : '신규 계약',
  contract_updated              : '계약 수정',
  contract_voided               : '계약 파기',
  contract_amended              : '수정재발행',
  contract_terminated           : '계약 해지',
  contract_termination_scheduled: '해지 예약',
  contract_termination_cancelled: '해지예정 취소',
  contract_renewed              : '계약 갱신',
  contract_renewal_scheduled    : '갱신 예약',
  contract_renewed_new          : '재계약 완료',
  contract_dispatched           : '계약서 발송',
  contract_signed_uploaded      : '날인본 업로드',
  contract_consent_uploaded     : '동의서 업로드',
  contract_fully_documented     : '서류 완비',
  payroll_input_complete        : '급여 입력/수정',
  payslip_individual_sent       : '급여명세서 개별',
  payslip_bulk_sent             : '급여명세서 일괄',
  severance_paid                : '퇴직급여 지급',
  contract_expiry               : '계약만료 통지',
  regular_conversion            : '정규직 전환',
  leave_promotion               : '연차 사용촉진',
  general                       : '중요공지',
};

// notice_type → 색상 팔레트
const CNL_TYPE_COLOR = {
  contract_created              : { bg:'#dcfce7', color:'#166534' },
  contract_updated              : { bg:'#dbeafe', color:'#1e40af' },
  contract_voided               : { bg:'#fee2e2', color:'#991b1b' },
  contract_amended              : { bg:'#fef3c7', color:'#92400e' },
  contract_terminated           : { bg:'#fce7f3', color:'#9d174d' },
  contract_termination_scheduled: { bg:'#fff7ed', color:'#c2410c' },
  contract_termination_cancelled: { bg:'#f0fdf4', color:'#15803d' },
  contract_renewed              : { bg:'#ede9fe', color:'#5b21b6' },
  contract_renewal_scheduled    : { bg:'#f5f3ff', color:'#6d28d9' },
  contract_renewed_new          : { bg:'#d1fae5', color:'#065f46' },
  contract_dispatched           : { bg:'#e0f2fe', color:'#075985' },
  contract_signed_uploaded      : { bg:'#f0f9ff', color:'#0369a1' },
  contract_consent_uploaded     : { bg:'#eff6ff', color:'#1d4ed8' },
  contract_fully_documented     : { bg:'#ecfdf5', color:'#047857' },
  payroll_input_complete        : { bg:'#fef9c3', color:'#713f12' },
  payslip_individual_sent       : { bg:'#fdf4ff', color:'#7e22ce' },
  payslip_bulk_sent             : { bg:'#f5f3ff', color:'#4c1d95' },
  severance_paid                : { bg:'#fae8ff', color:'#86198f' },
  contract_expiry               : { bg:'#fff1f2', color:'#be123c' },
  regular_conversion            : { bg:'#f0fdf4', color:'#166534' },
  leave_promotion               : { bg:'#fefce8', color:'#854d0e' },
  general                       : { bg:'#fef3c7', color:'#b45309' },
};

/** 고객사 드롭다운 옵션 채우기 */
function _cnlPopulateCompanySelect(){
  const sel = document.getElementById('cnl-filter-company');
  if(!sel) return;
  const list = allCompanies
    .filter(c => !c.is_draft)
    .sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'','ko'));
  // 기존 옵션 유지 (첫 번째 '전체 고객사' 포함) 후 고객사 목록 추가
  sel.innerHTML = `<option value="">전체 고객사</option>`
    + list.map(c => `<option value="${c.id}">${c.company_name||''}</option>`).join('');
  // 이전에 선택된 값 복원
  if(_cnlCompanyId) sel.value = _cnlCompanyId;
}

/** 페이지 진입 초기화 */
async function initCnlPage(){
  _cnlPopulateCompanySelect();
  // 전역 고객사 선택 공유: 다른 페이지에서 선택된 고객사가 있으면 드롭다운도 맞춤
  if(currentGlobalCompanyId && !_cnlCompanyId){
    _cnlCompanyId = currentGlobalCompanyId;
    const sel = document.getElementById('cnl-filter-company');
    if(sel) sel.value = _cnlCompanyId;
  }
  if(!_cnlLoaded){
    await cnlLoadData();
  } else {
    renderCnlTable();
  }
}

/** 고객사 드롭다운 변경 핸들러 */
async function cnlOnCompanyChange(){
  const sel = document.getElementById('cnl-filter-company');
  _cnlCompanyId   = sel?.value || '';
  _cnlCompanyName = sel?.options[sel.selectedIndex]?.text || '';
  if(_cnlCompanyId) currentGlobalCompanyId = _cnlCompanyId;
  _cnlPage   = 1;
  _cnlLoaded = false;
  await cnlLoadData();
}

/** 테이블 카드에 로딩 오버레이 표시/숨김 */
function _cnlShowLoading(show){
  const card = document.getElementById('cnl-table-card');
  if(!card) return;
  const existing = card.querySelector('.tbl-loading-overlay');
  if(show){
    if(existing) return;
    const ov = document.createElement('div');
    ov.className = 'tbl-loading-overlay';
    ov.innerHTML = `<div class="tbl-spin"></div><span class="tbl-spin-txt">알림 이력 불러오는 중...</span>`;
    card.appendChild(ov);
  } else {
    if(existing) existing.remove();
  }
}

/** DB에서 알림 이력 전체 로드 (최대 1000건, 최근순) */
async function cnlLoadData(){
  _cnlShowLoading(true);
  try {
    const res = await api(`../tables/company_notices?limit=1000&sort=sent_at`);
    _cnlList   = (res.data || []).sort((a,b) => {
      // 기준일: scheduled 상태면 gn_scheduled_at, 아니면 sent_at
      const tA = (a.gn_status==='scheduled' ? a.gn_scheduled_at : null) || a.sent_at || 0;
      const tB = (b.gn_status==='scheduled' ? b.gn_scheduled_at : null) || b.sent_at || 0;
      return new Date(tB) - new Date(tA);
    });
    _cnlLoaded = true;
  } catch(e) {
    console.error('[cnlLoadData 오류]', e);
    _cnlList = [];
  }
  _cnlShowLoading(false);
  renderCnlReserveCard();
  renderCnlTable();
}

/** 새로고침 */
async function cnlReload(){
  _cnlLoaded = false;
  const btn = document.querySelector('[onclick="cnlReload()"]');
  const icon = btn?.querySelector('i');
  if(icon){ icon.classList.add('fa-spin'); btn.disabled = true; }
  await cnlLoadData();
  if(icon){ icon.classList.remove('fa-spin'); btn.disabled = false; }
}

/** 예약 현황 카드 렌더 (gn_status === 'scheduled' 건만) */
function renderCnlReserveCard(){
  const reserveCard = document.getElementById('cnl-reserve-card');
  const tbody       = document.getElementById('cnl-reserve-tbody');
  const badge       = document.getElementById('cnl-reserve-badge');
  if(!reserveCard || !tbody) return;

  const filterCompany = document.getElementById('cnl-filter-company')?.value || '';
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();

  // scheduled 건 + 현재 필터 적용
  const list = _cnlList.filter(n => {
    if(n.gn_status !== 'scheduled') return false;
    if(filterCompany && n.company_id !== filterCompany) return false;
    if(filterType    && n.notice_type !== filterType)   return false;
    if(searchQ       && !(n.title||'').toLowerCase().includes(searchQ)) return false;
    return true;
  }).sort((a,b) => new Date(a.gn_scheduled_at||a.sent_at||0) - new Date(b.gn_scheduled_at||b.sent_at||0)); // 가까운 예약 먼저

  // 예약 건 없으면 카드 숨김
  if(!list.length){
    reserveCard.style.display = 'none';
    return;
  }
  reserveCard.style.display = '';
  if(badge) badge.textContent = `${list.length}건 대기 중`;

  // 고객사 컬럼: 전체 고객사 모드일 때만
  const showCoCol = !filterCompany;
  const thCo = document.getElementById('cnl-reserve-th-company');
  if(thCo) thCo.style.display = showCoCol ? '' : 'none';

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    if(isNaN(d)) return '-';
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'),
          dd = String(d.getDate()).padStart(2,'0'),
          hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
    return `${y}.${mo}.${dd} <span style="color:#b45309;font-size:11.5px;font-weight:700;">${hh}:${mm}</span>`;
  };

  const typeBadge = t => {
    const label = CNL_TYPE_LABEL[t] || t || '-';
    const clr   = CNL_TYPE_COLOR[t] || { bg:'#f3f4f6', color:'#374151' };
    return `<span style="display:inline-block;background:${clr.bg};color:${clr.color};
      padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;">${label}</span>`;
  };

  tbody.innerHTML = list.map((n, idx) => {
    const rowBg = idx % 2 === 0 ? '#fffdf0' : '#fff';
    const coCell = showCoCol
      ? `<td style="padding:10px 14px;font-size:12.5px;font-weight:700;color:#92400e;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;"
             title="${(n.company_name||'').replace(/"/g,'&quot;')}">${n.company_name||'-'}</td>`
      : '';
    const titleShort = (n.title||'').length > 40 ? (n.title||'').slice(0,40)+'…' : (n.title||'-');
    const displayTime = n.gn_scheduled_at || n.sent_at;

    return `<tr style="background:${rowBg};border-bottom:1px solid #fef3c7;"
               onmouseover="this.style.background='#fef9c3'" onmouseout="this.style.background='${rowBg}'">
      <td style="padding:10px 14px;white-space:nowrap;font-size:12.5px;color:#374151;">${fmtDt(displayTime)}</td>
      ${coCell}
      <td style="padding:10px 14px;">${typeBadge(n.notice_type)}</td>
      <td style="padding:10px 14px;font-size:12.5px;color:#1e293b;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${(n.title||'').replace(/"/g,'&quot;')}">${titleShort}</td>
      <td style="padding:10px 14px;font-size:12px;color:#64748b;white-space:nowrap;">${_resolveAdminName(n.sent_by)||'-'}</td>
      <td style="padding:10px 14px;text-align:center;">
        <div style="display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:nowrap;">
          <button onclick="cancelGnScheduled('${n.id}')"
            style="padding:3px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;
                   color:#dc2626;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">
            <i class="fas fa-ban"></i> 취소
          </button>
          <button onclick="openGnEditModal('${n.id}')"
            style="padding:3px 8px;border:1px solid #a5b4fc;border-radius:6px;background:#eef2ff;
                   color:#4f46e5;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">
            <i class="fas fa-edit"></i> 수정
          </button>
          <button onclick="openCnlDetailById('${n.id}')"
            style="padding:3px 8px;border:1px solid #c7d2fe;border-radius:6px;background:#eef2ff;
                   color:#4f46e5;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">
            <i class="fas fa-eye"></i> 보기
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/** 예약 현황 상세 보기 (id로 직접 조회) */
function openCnlDetailById(recordId){
  const n = _cnlList.find(x => x.id === recordId);
  if(!n) return;
  // _cnlList 내 인덱스를 구해 openCnlDetail 재사용 (필터 우회)
  const idx = _cnlList.indexOf(n);
  // 필터를 무시하고 직접 모달 오픈
  const modal = document.getElementById('cnl-detail-modal');
  const body  = document.getElementById('cnl-detail-body');
  if(!modal || !body) return;

  const fmtDtFull = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d) ? '-' : d.toLocaleString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  };
  const typeLbl = CNL_TYPE_LABEL[n.notice_type] || n.notice_type || '-';
  const typeClr = CNL_TYPE_COLOR[n.notice_type] || { bg:'#f3f4f6', color:'#374151' };
  const isGeneral = n.notice_type === 'general';
  const gnSt = isGeneral ? (n.gn_status || 'sent') : null;
  const gnStatusTxt = gnSt === 'scheduled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#b45309;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-clock" style="font-size:9px;"></i> 예약 대기</span>`
    : gnSt === 'cancelled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-ban" style="font-size:9px;"></i> 취소됨</span>`
    : `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-check" style="font-size:9px;"></i> 발송 완료</span>`;
  const displayTime  = (isGeneral && gnSt === 'scheduled') ? (n.gn_scheduled_at || n.sent_at) : n.sent_at;
  const timeLabel    = (isGeneral && gnSt === 'scheduled') ? '예약 일시' : '발송 일시';
  const gnStatusRow  = (isGeneral && gnSt !== 'sent') ? `<span style="color:#64748b;font-weight:600;">발송 상태</span><span>${gnStatusTxt}</span>` : '';
  const employeeRow  = !isGeneral ? `<span style="color:#64748b;font-weight:600;">근로자</span><span style="color:#4f46e5;font-weight:700;">${n.employee_name||'—'}</span>` : '';
  const _isReadDetail = v => v === true || v === 'true' || v === 1 || v === '1';
  const readTxt = _isReadDetail(n.is_read)
    ? `<span style="color:#166534;font-weight:700;"><i class="fas fa-check-circle"></i> 읽음</span>`
    : `<span style="color:#dc2626;font-weight:700;"><i class="fas fa-circle" style="font-size:10px;"></i> 미확인</span>`;
  const readRow = (isGeneral && gnSt === 'cancelled') ? '' : `<span style="color:#64748b;font-weight:600;">확인 여부</span><span>${readTxt}</span>`;

  body.innerHTML = `
    <div style="background:${isGeneral?'#fffbeb':'#f8fafc'};border:1px solid ${isGeneral?'#fde68a':'#e2e8f0'};border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:12.5px;line-height:2;">
      <div style="display:grid;grid-template-columns:90px 1fr;gap:2px 0;">
        <span style="color:#64748b;font-weight:600;">알림 유형</span>
        <span><span style="display:inline-block;background:${typeClr.bg};color:${typeClr.color};padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;">${typeLbl}</span></span>
        <span style="color:#64748b;font-weight:600;">${timeLabel}</span>
        <span style="color:#1e293b;font-weight:600;">${fmtDtFull(displayTime)}</span>
        <span style="color:#64748b;font-weight:600;">고객사</span>
        <span style="color:#1e293b;">${n.company_name||'-'}</span>
        ${employeeRow}${gnStatusRow}${readRow}
        <span style="color:#64748b;font-weight:600;">발송자</span>
        <span style="color:#374151;">${n.sent_by||'-'}</span>
      </div>
    </div>
    <div style="font-size:13.5px;font-weight:800;color:#1e293b;margin-bottom:10px;padding:10px 14px;
                background:${isGeneral?'linear-gradient(135deg,#fffbeb,#fef9c3)':'linear-gradient(135deg,#eef2ff,#f0f9ff)'};
                border-radius:8px;border-left:4px solid ${isGeneral?'#f59e0b':'#6366f1'};">
      ${n.title||'(제목 없음)'}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;
                font-size:13px;line-height:1.9;color:#334155;white-space:pre-wrap;word-break:break-all;">
${(n.body||'(내용 없음)').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    </div>`;
  modal.style.display = 'flex';
}

/** 테이블 렌더 */
function renderCnlTable(){
  const tbody = document.getElementById('cnl-tbody');
  if(!tbody) return;

  const filterCompany = document.getElementById('cnl-filter-company')?.value || '';
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();

  // scheduled 제외 + 필터 적용 (발송완료/취소됨만)
  let list = _cnlList.filter(n => {
    if(n.gn_status === 'scheduled') return false;          // 예약 대기는 예약 현황 카드에서 표시
    if(filterCompany && n.company_id !== filterCompany) return false;
    if(filterType    && n.notice_type !== filterType)   return false;
    if(searchQ       && !(n.title||'').toLowerCase().includes(searchQ)) return false;
    return true;
  });

  // 발송 이력 건수 배지 갱신
  const badge = document.getElementById('cnl-total-badge');
  if(badge) badge.textContent = `총 ${list.length}건`;

  // 고객사 컬럼 헤더: 전체 고객사 모드일 때만 표시
  const thCompany = document.getElementById('cnl-th-company');
  const showCoCol = !filterCompany;
  if(thCompany) thCompany.style.display = showCoCol ? '' : 'none';

  const totalPages = Math.max(1, Math.ceil(list.length / CNL_PAGE_SIZE));
  if(_cnlPage > totalPages) _cnlPage = totalPages;
  const pageData = list.slice((_cnlPage-1)*CNL_PAGE_SIZE, _cnlPage*CNL_PAGE_SIZE);

  const colSpan = showCoCol ? 7 : 6;

  if(!list.length){
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px;">
      <i class="fas fa-inbox" style="font-size:28px;display:block;margin-bottom:10px;opacity:.4;"></i>
      ${_cnlLoaded ? '발송된 알림 이력이 없습니다.' : '데이터를 불러오는 중입니다...'}
    </td></tr>`;
    document.getElementById('cnl-pagination').innerHTML = '';
    return;
  }

  const fmtDt = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    if(isNaN(d)) return '-';
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'),
          dd = String(d.getDate()).padStart(2,'0'),
          hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
    return `${y}.${mo}.${dd}<br><span style="color:#94a3b8;font-size:11.5px;">${hh}:${mm}</span>`;
  };

  const typeBadge = t => {
    const label = CNL_TYPE_LABEL[t] || t || '-';
    const clr   = CNL_TYPE_COLOR[t]  || { bg:'#f3f4f6', color:'#374151' };
    return `<span style="display:inline-block;background:${clr.bg};color:${clr.color};
      padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;">${label}</span>`;
  };

  const _isRead = v => v === true || v === 'true' || v === 1 || v === '1';
  const readBadge = n =>
    _isRead(n.is_read)
      ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11.5px;font-weight:700;">
           <i class="fas fa-check" style="font-size:10px;"></i> 읽음
         </span>`
      : `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:11.5px;font-weight:700;">
           <i class="fas fa-circle" style="font-size:7px;"></i> 미확인
         </span>`;

  // gn_status 배지 (general 타입 전용, 발송이력에는 sent/cancelled만 도달)
  const gnStatusBadge = st => {
    if(st === 'cancelled') return `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;"><i class="fas fa-ban" style="font-size:9px;"></i>취소됨</span>`;
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;"><i class="fas fa-check" style="font-size:9px;"></i>발송완료</span>`;
  };

  tbody.innerHTML = pageData.map((n, idx) => {
    const rowBg = idx % 2 === 0 ? '#fff' : '#fafbfc';
    const isGeneral = n.notice_type === 'general';
    const gnSt = isGeneral ? (n.gn_status || 'sent') : null;

    // 고객사 셀 (전체 모드일 때만 표시)
    const coCell = showCoCol
      ? `<td style="padding:10px 14px;font-size:12.5px;font-weight:700;color:#4f46e5;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;" title="${(n.company_name||'').replace(/"/g,'&quot;')}">${n.company_name||'-'}</td>`
      : '';

    const titleShort = (n.title||'').length > 40 ? (n.title||'').slice(0,40)+'…' : (n.title||'-');
    const safeIdx = (_cnlPage-1)*CNL_PAGE_SIZE + idx;

    // 확인 컬럼: general+sent이면 읽음여부만, cancelled이면 취소됨만, 일반은 읽음여부
    const confirmCell = isGeneral
      ? (gnSt === 'sent' ? readBadge(n) : gnStatusBadge(gnSt))
      : readBadge(n);

    return `<tr style="background:${rowBg};border-bottom:1px solid #f1f5f9;"
               onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='${rowBg}'">
      <td style="padding:10px 14px;white-space:nowrap;font-size:12.5px;color:#374151;">${fmtDt(n.sent_at)}</td>
      ${coCell}
      <td style="padding:10px 14px;">${typeBadge(n.notice_type)}</td>
      <td style="padding:10px 14px;font-size:12.5px;color:#1e293b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${(n.title||'').replace(/"/g,'&quot;')}">${titleShort}</td>
      <td style="padding:10px 14px;text-align:center;">${confirmCell}</td>
      <td style="padding:10px 14px;font-size:12px;color:#64748b;white-space:nowrap;">${_resolveAdminName(n.sent_by)||'-'}</td>
      <td style="padding:10px 14px;text-align:center;">
        <button onclick="openCnlDetail(${safeIdx})"
          style="padding:3px 8px;border:1px solid #c7d2fe;border-radius:6px;background:#eef2ff;color:#4f46e5;
                 font-size:12px;font-weight:600;cursor:pointer;">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>`;
  }).join('');

  // 페이지네이션
  renderCnlPagination(list.length);
}

/** 페이지네이션 렌더 */
function renderCnlPagination(total){
  const container = document.getElementById('cnl-pagination');
  if(!container) return;
  const totalPages = Math.max(1, Math.ceil(total / CNL_PAGE_SIZE));
  if(totalPages <= 1 && total <= CNL_PAGE_SIZE){ container.innerHTML = ''; return; }
  const s = Math.min((_cnlPage-1)*CNL_PAGE_SIZE+1, total);
  const e = Math.min(_cnlPage*CNL_PAGE_SIZE, total);
  const makeBtn = (label, page, disabled=false, active=false) =>
    `<button onclick="_cnlPage=${page};renderCnlTable();"
       style="min-width:30px;height:30px;padding:0 8px;border:1px solid ${active?'#6366f1':'#d1d5db'};
              border-radius:6px;background:${active?'#6366f1':'#fff'};color:${active?'#fff':'#374151'};
              font-size:12px;cursor:${disabled?'default':'pointer'};opacity:${disabled?'0.4':'1'};
              font-family:inherit;font-weight:${active?'700':'400'};"
       ${disabled?'disabled':''}>${label}</button>`;
  const btns = [];
  btns.push(makeBtn('‹', Math.max(1,_cnlPage-1), _cnlPage===1));
  const start = Math.max(1, _cnlPage-2), end = Math.min(totalPages, _cnlPage+2);
  if(start > 1){ btns.push(makeBtn('1',1)); if(start>2) btns.push(`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`); }
  for(let p=start;p<=end;p++) btns.push(makeBtn(p,p,false,p===_cnlPage));
  if(end < totalPages){ if(end<totalPages-1) btns.push(`<span style="color:#9ca3af;font-size:12px;padding:0 4px;">…</span>`); btns.push(makeBtn(totalPages,totalPages)); }
  btns.push(makeBtn('›', Math.min(totalPages,_cnlPage+1), _cnlPage===totalPages));
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;">
      <span style="font-size:12.5px;color:#64748b;">총 <strong>${total}</strong>건 중 ${s}–${e}번째</span>
      <div style="display:flex;align-items:center;gap:4px;">${btns.join('')}</div>
    </div>`;
}

/** 상세 모달 열기 */
function openCnlDetail(listIdx){
  const filterCompany = document.getElementById('cnl-filter-company')?.value || '';
  const filterType    = document.getElementById('cnl-filter-type')?.value || '';
  const searchQ       = (document.getElementById('cnl-search')?.value || '').trim().toLowerCase();
  const list = _cnlList.filter(n => {
    if(filterCompany && n.company_id !== filterCompany) return false;
    if(filterType    && n.notice_type !== filterType)   return false;
    if(searchQ       && !(n.title||'').toLowerCase().includes(searchQ)) return false;
    return true;
  });
  const n = list[listIdx];
  if(!n) return;

  const modal = document.getElementById('cnl-detail-modal');
  const body  = document.getElementById('cnl-detail-body');
  if(!modal || !body) return;

  const fmtDtFull = ts => {
    if(!ts) return '-';
    const d = new Date(ts);
    return isNaN(d) ? '-' : d.toLocaleString('ko-KR', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  };

  const typeLbl = CNL_TYPE_LABEL[n.notice_type] || n.notice_type || '-';
  const typeClr = CNL_TYPE_COLOR[n.notice_type] || { bg:'#f3f4f6', color:'#374151' };
  const readTxt = n.is_read
    ? `<span style="color:#166534;font-weight:700;"><i class="fas fa-check-circle"></i> 읽음 (${fmtDtFull(n.read_at)})</span>`
    : `<span style="color:#dc2626;font-weight:700;"><i class="fas fa-circle" style="font-size:10px;"></i> 미확인</span>`;

  // general 타입 전용: gn_status 처리
  const isGeneral = n.notice_type === 'general';
  const gnSt = isGeneral ? (n.gn_status || 'sent') : null;
  const gnStatusTxt = gnSt === 'scheduled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#b45309;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-clock" style="font-size:9px;"></i> 예약 대기</span>`
    : gnSt === 'cancelled'
    ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-ban" style="font-size:9px;"></i> 취소됨</span>`
    : `<span style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#166534;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;"><i class="fas fa-check" style="font-size:9px;"></i> 발송 완료</span>`;
  const displayTime = (isGeneral && gnSt === 'scheduled') ? (n.gn_scheduled_at || n.sent_at) : n.sent_at;
  const timeLabel   = (isGeneral && gnSt === 'scheduled') ? '예약 일시' : '발송 일시';

  // general 타입 전용 추가 행
  const gnStatusRow = isGeneral ? `
        <span style="color:#64748b;font-weight:600;">발송 상태</span>
        <span>${gnStatusTxt}</span>` : '';
  const employeeRow = !isGeneral ? `
        <span style="color:#64748b;font-weight:600;">근로자</span>
        <span style="color:#4f46e5;font-weight:700;">${n.employee_name||'—'}</span>` : '';
  const readRow = (isGeneral && gnSt !== 'sent') ? '' : `
        <span style="color:#64748b;font-weight:600;">확인 여부</span>
        <span>${readTxt}</span>`;

  body.innerHTML = `
    <!-- 메타 정보 -->
    <div style="background:${isGeneral?'#fffbeb':'#f8fafc'};border:1px solid ${isGeneral?'#fde68a':'#e2e8f0'};border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:12.5px;line-height:2;">
      <div style="display:grid;grid-template-columns:90px 1fr;gap:2px 0;">
        <span style="color:#64748b;font-weight:600;">알림 유형</span>
        <span><span style="display:inline-block;background:${typeClr.bg};color:${typeClr.color};padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;">${typeLbl}</span></span>
        <span style="color:#64748b;font-weight:600;">${timeLabel}</span>
        <span style="color:#1e293b;font-weight:600;">${fmtDtFull(displayTime)}</span>
        <span style="color:#64748b;font-weight:600;">고객사</span>
        <span style="color:#1e293b;">${n.company_name||'-'}</span>
        ${employeeRow}${gnStatusRow}${readRow}
        <span style="color:#64748b;font-weight:600;">발송자</span>
        <span style="color:#374151;">${n.sent_by||'-'}</span>
      </div>
    </div>

    <!-- 제목 -->
    <div style="font-size:13.5px;font-weight:800;color:#1e293b;margin-bottom:10px;padding:10px 14px;
                background:${isGeneral?'linear-gradient(135deg,#fffbeb,#fef9c3)':'linear-gradient(135deg,#eef2ff,#f0f9ff)'};
                border-radius:8px;border-left:4px solid ${isGeneral?'#f59e0b':'#6366f1'};">
      ${n.title||'(제목 없음)'}
    </div>

    <!-- 본문 -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;
                font-size:13px;line-height:1.9;color:#334155;white-space:pre-wrap;word-break:break-all;">
${(n.body||'(내용 없음)').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    </div>`;

  modal.style.display = 'flex';
}

/** 상세 모달 닫기 */
function closeCnlDetailModal(){
  const modal = document.getElementById('cnl-detail-modal');
  if(modal) modal.style.display = 'none';
}

// 모달 외부 클릭 시 닫기
document.addEventListener('click', function(e){
  const modal = document.getElementById('cnl-detail-modal');
  if(modal && modal.style.display === 'flex' && e.target === modal) closeCnlDetailModal();
});

// ══════════════════════════════════════════════════════════════════════
//  중요공지 관리 (page-general-notice)
// ══════════════════════════════════════════════════════════════════════

// ── 상태 변수 ──
let _gnSelectedIds    = new Set(); // 선택된 고객사 ID 집합
let _gnScheduleTimers = [];        // 예약 타이머 핸들 목록

// ─────────────────────────────────────────────
// 페이지 초기화
// ─────────────────────────────────────────────
async function initGnPage(){
  renderGnCompanyChips();
}

// ─────────────────────────────────────────────
// 고객사 칩 렌더
// ─────────────────────────────────────────────
function renderGnCompanyChips(){
  const q = (document.getElementById('gn-company-search')?.value || '').toLowerCase();
  const chips = document.getElementById('gn-company-chips');
  if(!chips) return;
  const list = allCompanies
    .filter(c => !c.is_draft && c.status === '이용중' && (!q || (c.company_name||'').toLowerCase().includes(q)))
    .sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'','ko'));
  if(!list.length){
    chips.innerHTML = `<div style="font-size:12.5px;color:#9ca3af;padding:8px 0;">${q ? `"${q}" 검색 결과가 없습니다` : '이용 중인 고객사가 없습니다'}</div>`;
    _updateGnSelectedCount();
    return;
  }
  chips.innerHTML = list.map(c => {
    const isSel = _gnSelectedIds.has(c.id);
    return `<button onclick="toggleGnCompany('${c.id}')"
      class="co-chip${isSel?' selected':''}">
      ${isSel?'<i class="fas fa-check" style="font-size:10px;"></i>':'<i class="fas fa-building" style="font-size:11px;"></i>'}
      ${c.company_name||''}
    </button>`;
  }).join('');
  _updateGnSelectedCount();
  _updateGnSelectBtn();
}

function toggleGnCompany(id){
  if(_gnSelectedIds.has(id)) _gnSelectedIds.delete(id);
  else _gnSelectedIds.add(id);
  renderGnCompanyChips();
}

function gnSelectAll(){
  const q = (document.getElementById('gn-company-search')?.value || '').toLowerCase();
  allCompanies
    .filter(c => !c.is_draft && c.status === '이용중' && (!q || (c.company_name||'').toLowerCase().includes(q)))
    .forEach(c => _gnSelectedIds.add(c.id));
  renderGnCompanyChips();
}

function gnDeselectAll(){
  _gnSelectedIds.clear();
  renderGnCompanyChips();
}

function _updateGnSelectBtn(){
  const q = (document.getElementById('gn-company-search')?.value || '').toLowerCase();
  const total = allCompanies.filter(c => !c.is_draft && c.status === '이용중' && (!q || (c.company_name||'').toLowerCase().includes(q))).length;
  const btn = document.querySelector('.gn-sel-btn.select');
  if(!btn) return;
  const isAll = total > 0 && _gnSelectedIds.size >= total;
  btn.classList.toggle('active', isAll);
}

function _updateGnSelectedCount(){
  const cnt = _gnSelectedIds.size;
  const el  = document.getElementById('gn-selected-count');
  if(el) el.textContent = cnt > 0 ? `${cnt}개 고객사 선택됨` : '선택된 고객사가 없습니다.';
  const btn = document.getElementById('gn-compose-btn');
  if(btn){ btn.disabled = cnt === 0; btn.style.opacity = cnt > 0 ? '1' : '.4'; }
}

// ─────────────────────────────────────────────
// 공지 작성 모달
// ─────────────────────────────────────────────
function openGnComposeModal(){
  if(_gnSelectedIds.size === 0){ toast('고객사를 먼저 선택하세요.','error'); return; }

  const modal = document.getElementById('gn-compose-modal');
  modal.dataset.editId = '';  // 작성 모드

  // 헤더 작성 모드로
  document.getElementById('gn-modal-icon').className  = 'fas fa-bullhorn';
  document.getElementById('gn-modal-icon').style.color = '#f59e0b';
  document.getElementById('gn-modal-title').textContent = '중요공지 작성';

  // 수신 고객사 영역 표시 / 안내 배너 숨김
  document.getElementById('gn-modal-targets-wrap').style.display = '';
  document.getElementById('gn-modal-edit-banner').style.display  = 'none';

  // 수신 고객사 표시
  const targets = document.getElementById('gn-modal-targets');
  if(targets){
    targets.innerHTML = [..._gnSelectedIds].map(id => {
      const co = allCompanies.find(x => x.id === id);
      return `<span style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:14px;
                           font-size:12px;font-weight:700;">${co?.company_name||id}</span>`;
    }).join('');
  }

  // 입력 초기화
  document.getElementById('gn-title').value = '';
  document.getElementById('gn-body').value  = '';
  const tog = document.getElementById('gn-schedule-toggle');
  tog.checked = false;
  tog.disabled = false;
  document.getElementById('gn-schedule-panel').style.display = 'none';
  document.getElementById('gn-schedule-toggle-label').style.opacity = '';

  // 버튼 작성 모드
  document.getElementById('gn-submit-icon').className = 'fas fa-paper-plane';
  document.getElementById('gn-submit-label').textContent = '즉시 발송';

  // 예약 일시 기본값: 현재 + 1시간
  const dtEl = document.getElementById('gn-scheduled-at');
  if(dtEl){
    const d = new Date(Date.now() + 3600000);
    dtEl.value = d.toISOString().slice(0,16);
  }
  modal.style.display = 'flex';
}

/** 예약 메시지 수정 모달 오픈 */
async function openGnEditModal(recordId){
  const n = _cnlList.find(x => x.id === recordId);
  if(!n){ toast('레코드를 찾을 수 없습니다.', 'error'); return; }
  if(n.gn_status !== 'scheduled'){
    toast('이미 발송되었거나 취소된 공지는 수정할 수 없습니다.', 'error');
    return;
  }

  const modal = document.getElementById('gn-compose-modal');
  modal.dataset.editId = recordId;  // 수정 모드

  // 헤더 수정 모드로
  document.getElementById('gn-modal-icon').className  = 'fas fa-edit';
  document.getElementById('gn-modal-icon').style.color = '#6366f1';
  document.getElementById('gn-modal-title').textContent = '예약 공지 수정';

  // 수신 고객사 영역 숨김 / 안내 배너 표시
  document.getElementById('gn-modal-targets-wrap').style.display = 'none';
  document.getElementById('gn-modal-edit-banner').style.display  = '';
  document.getElementById('gn-modal-edit-company').textContent   = n.company_name || '';

  // 기존 값 쇼입
  document.getElementById('gn-title').value = n.title || '';
  document.getElementById('gn-body').value  = n.body  || '';

  // 예약 발송은 항상 체크 (=해제 불가)
  const tog = document.getElementById('gn-schedule-toggle');
  tog.checked  = true;
  tog.disabled = true;
  document.getElementById('gn-schedule-toggle-label').style.opacity = '0.6';
  document.getElementById('gn-schedule-panel').style.display = '';

  // 예약 일시 쇼입
  const dtEl = document.getElementById('gn-scheduled-at');
  if(dtEl && n.gn_scheduled_at){
    const d = new Date(n.gn_scheduled_at);
    dtEl.value = isNaN(d) ? '' : d.toISOString().slice(0,16);
  }

  // 버튼 수정 모드로
  document.getElementById('gn-submit-icon').className = 'fas fa-save';
  document.getElementById('gn-submit-label').textContent = '예약 수정 저장';

  modal.style.display = 'flex';
}

function closeGnComposeModal(){
  document.getElementById('gn-compose-modal').style.display = 'none';
}

function toggleGnSchedule(){
  const on = document.getElementById('gn-schedule-toggle').checked;
  document.getElementById('gn-schedule-panel').style.display = on ? '' : 'none';
  const lbl = document.getElementById('gn-submit-label');
  if(lbl) lbl.textContent = on ? '예약 등록' : '즉시 발송';
}

// 모달 외부 클릭 닫기
document.addEventListener('click', function(e){
  const modal = document.getElementById('gn-compose-modal');
  if(modal && modal.style.display === 'flex' && e.target === modal) closeGnComposeModal();
});

// ─────────────────────────────────────────────
// 공지 제출 (즉시 / 예약)
// ─────────────────────────────────────────────
async function submitGnNotice(){
  const modal     = document.getElementById('gn-compose-modal');
  const editId    = modal?.dataset?.editId || '';   // '' = 작성, 값 있으면 수정 모드
  const title     = (document.getElementById('gn-title')?.value || '').trim();
  const body      = (document.getElementById('gn-body')?.value  || '').trim();
  const isSchedule= document.getElementById('gn-schedule-toggle')?.checked;
  const scheduledAt = document.getElementById('gn-scheduled-at')?.value;

  if(!title) return toast('제목을 입력하세요.','error');
  if(!body)  return toast('본문을 입력하세요.','error');
  if(isSchedule){
    if(!scheduledAt) return toast('예약 발송 일시를 설정하세요.','error');
    const schedDt = new Date(scheduledAt);
    if(schedDt <= new Date()) return toast('예약 일시는 현재 시각 이후로 설정하세요.','error');
  }

  // ── 수정 모드: 기존 예약 레코드 PATCH ──
  if(editId){
    try {
      await fetch(`../tables/company_notices/${editId}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          title,
          body,
          gn_scheduled_at: scheduledAt,
          sent_at        : scheduledAt,
        }),
      });

      // 기존 타이머 제거 후 새 타이머 등록
      _gnScheduleTimers.forEach(id => clearTimeout(id));
      _gnScheduleTimers = [];
      const n = _cnlList.find(x => x.id === editId);
      if(n){
        const co = { id: n.company_id, name: n.company_name };
        const adminName = _getAdminUsername();
        const delay = new Date(scheduledAt).getTime() - Date.now();
        if(delay > 0){
          const timerId = setTimeout(() => _gnFireScheduled(editId, co, title, body, adminName), delay);
          _gnScheduleTimers.push(timerId);
        }
        // _cnlList 캐시도 즉시 갱신
        n.title = title; n.body = body;
        n.gn_scheduled_at = scheduledAt; n.sent_at = scheduledAt;
      }

      toast('✅ 예약 공지가 수정되었습니다.', 'success');
    } catch(e){
      console.error('[예약 수정 오류]', e);
      toast('수정 중 오류가 발생했습니다.', 'error');
      return;
    }
    closeGnComposeModal();
    renderCnlReserveCard();
    return;
  }

  const adminName = _getAdminUsername();
  const targets   = [..._gnSelectedIds].map(id => {
    const co = allCompanies.find(x => x.id === id);
    return { id, name: co?.company_name || '' };
  });

  if(isSchedule){
    // ── 예약 발송: DB에 status='scheduled' 로 저장 후 타이머 등록 ──
    for(const co of targets){
      const record = {
        company_id   : co.id,
        company_name : co.name,
        notice_type  : 'general',
        title,
        body,
        employee_id  : '',
        employee_name: '',
        contract_id  : '',
        contract_end : '',
        days_until_expiry: 0,
        sent_at      : scheduledAt,           // 예약 일시를 sent_at에 저장
        sent_by      : adminName,
        is_read      : false,
        read_at      : '',
        gn_status    : 'scheduled',           // 예약 상태 구분 필드
        gn_scheduled_at: scheduledAt,
      };
      try {
        const saved = await fetch('../tables/company_notices', {
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(record)
        });
        const savedData = await saved.json();
        // 타이머 등록
        const delay = new Date(scheduledAt).getTime() - Date.now();
        const timerId = setTimeout(() => _gnFireScheduled(savedData.id || record.id, co, title, body, adminName), delay);
        _gnScheduleTimers.push(timerId);
      } catch(e){ console.error('[예약 저장 오류]', e); }
    }
    toast(`✅ ${targets.length}개 고객사에 예약 발송이 등록되었습니다.`, 'success');
  } else {
    // ── 즉시 발송 ──
    const nowISO = new Date().toISOString();
    for(const co of targets){
      await _sendCompanyNotice({
        companyId  : co.id,
        companyName: co.name,
        noticeType : 'general',
        title,
        body,
        extraData  : { gn_status: 'sent', gn_scheduled_at: '' },
      });
    }
    toast(`✅ ${targets.length}개 고객사에 공지를 즉시 발송했습니다.`, 'success');
  }

  closeGnComposeModal();
  // 발송 이력은 알림 발송 이력 페이지로 이동하여 확인 (데이터 리셋 후 전체 재로드)
  _cnlLoaded = false;
  const _cnlMenu = document.querySelector('.menu-item[data-page="company-notice-log"]');
  showPage('company-notice-log', _cnlMenu);
}

// ─────────────────────────────────────────────
// 예약 발송 실행 (타이머 콜백)
// ─────────────────────────────────────────────
async function _gnFireScheduled(recordId, co, title, body, adminName){
  const nowISO = new Date().toISOString();
  try {
    // 기존 레코드를 sent 상태로 패치
    await fetch(`../tables/company_notices/${recordId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ gn_status:'sent', sent_at: nowISO, is_read: false })
    });
    toast(`📣 [${co.name}] 예약 공지가 발송되었습니다.`, 'success');
    // 알림 발송 이력 페이지가 열려 있으면 이력 갱신
    if(document.getElementById('page-company-notice-log')?.classList.contains('active')){
      await cnlReload();
    }
  } catch(e){ console.error('[예약 발송 실행 오류]', e); }
}

// ─────────────────────────────────────────────
// 페이지 진입 시 미발송 예약 건 타이머 복원
// ─────────────────────────────────────────────
async function _gnRestoreScheduledTimers(){
  try {
    const res  = await api('../tables/company_notices?limit=500');
    const rows = (res.data || []).filter(n => n.notice_type === 'general' && n.gn_status === 'scheduled');
    const now  = Date.now();
    const adminName = _getAdminUsername();
    for(const r of rows){
      const schedTime = new Date(r.gn_scheduled_at || r.sent_at).getTime();
      if(isNaN(schedTime)) continue;
      const delay = schedTime - now;
      const co = { id: r.company_id, name: r.company_name || '' };
      if(delay <= 0){
        // 이미 지난 예약 → 즉시 실행
        await _gnFireScheduled(r.id, co, r.title, r.body, adminName);
      } else {
        const timerId = setTimeout(() => _gnFireScheduled(r.id, co, r.title, r.body, adminName), delay);
        _gnScheduleTimers.push(timerId);
      }
    }
  } catch(e){ console.error('[예약 타이머 복원 오류]', e); }
}

// ─────────────────────────────────────────────
// 예약 발송 폴링 (60초마다 미발송 scheduled 건 재확인)
// 관리자 페이지가 열린 동안 주기적으로 DB를 체크해
// setTimeout 누락분을 보완합니다.
// ─────────────────────────────────────────────
let _gnPollingTimer = null;
function _gnStartPolling(){
  if(_gnPollingTimer) return; // 중복 방지
  _gnPollingTimer = setInterval(async () => {
    try {
      const res  = await fetch('../tables/company_notices?limit=500');
      if(!res.ok) return;
      const data = await res.json();
      const rows = (data.data || []).filter(n =>
        n.notice_type === 'general' && n.gn_status === 'scheduled'
      );
      if(!rows.length) return;
      const now       = Date.now();
      const adminName = _getAdminUsername();
      for(const r of rows){
        const schedTime = new Date(r.gn_scheduled_at || r.sent_at).getTime();
        if(isNaN(schedTime)) continue;
        if(schedTime <= now){
          const co = { id: r.company_id, name: r.company_name || '' };
          await _gnFireScheduled(r.id, co, r.title, r.body, adminName);
        }
      }
    } catch(e){ console.warn('[GN 폴링 오류]', e); }
  }, 60 * 1000); // 60초마다
}

// ─────────────────────────────────────────────
// 예약 취소
// ─────────────────────────────────────────────
async function cancelGnScheduled(recordId){
  if(!confirm('이 예약 공지를 취소하시겠습니까?')) return;
  try {
    await fetch(`../tables/company_notices/${recordId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ gn_status:'cancelled' })
    });
    toast('예약 공지가 취소되었습니다.', 'success');
    // CNL 페이지에서 호출되므로 cnlReload()로 갱신
    await cnlReload();
  } catch(e){ toast('취소 처리 중 오류가 발생했습니다.','error'); }
}

// ─────────────────────────────────────────────
// 산정기준 업데이트 시 전체 고객사 중요공지 자동 발송
// ─────────────────────────────────────────────
async function _gnSendStandardsUpdateNotice(updateType, detail){
  const adminName = _getAdminUsername();
  const targets   = allCompanies.filter(c => !c.is_draft && c.status === '이용중');
  if(!targets.length) return;
  const title = `[산정기준 업데이트] ${updateType} 기준이 변경되었습니다`;
  const body  =
`안녕하세요.

노무사 사무소에서 최신 산정기준을 업데이트하였습니다.

■ 업데이트 항목: ${updateType}
${detail}
■ 업데이트 일시: ${new Date().toLocaleString('ko-KR')}

급여 계산 시 변경된 기준이 자동 반영됩니다.
상세 내용은 담당 노무사에게 문의하세요.`;

  let cnt = 0;
  for(const co of targets){
    await _sendCompanyNotice({
      companyId  : co.id,
      companyName: co.company_name || '',
      noticeType : 'general',
      title, body,
      extraData  : { gn_status:'sent', gn_scheduled_at:'' },
    });
    cnt++;
  }
  toast(`📣 ${cnt}개 고객사에 산정기준 업데이트 공지를 발송했습니다.`, 'success');
}

// ══════════════════════════════════════════════════════════════════════
// END 중요공지 관리
// ══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
// END 알림 발송 이력