// schema.sql 덤프 유틸리티: node dump_schema.js
// PRAGMA table_info 기반으로 실제 DB 스키마를 정확히 덤프 (ALTER TABLE 반영)
// 한글 주석 자동 포함
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('./data/app.db');

// ── 한글 주석 맵 (테이블명 → { desc, sections, columns: { 컬럼명: 설명 } }) ──
const KO = {
  companies: {
    desc: '고객사 (회사 기본정보)',
    columns: {
      id: 'UUID',
      company_name: '회사명',
      business_number: '사업자등록번호',
      representative: '대표자명',
      industry: '업종',
      address: '주소',
      phone: '대표전화번호',
      email: '대표이메일',
      pay_period: '급여 산정기간 (예: 당월 25일부터 1개월간)',
      pay_period_month: '급여 산정기준월 (당월/전월)',
      pay_period_day: '급여 산정기준일',
      pay_day: '급여 지급일',
      access_code: '고객사 앱 접근 코드',
      note: '비고',
      insurance_basis: '4대보험 가입기준',
      annual_leave_basis: '연차 산정 기준',
      is_draft: '임시저장 여부 (0:정식등록, 1:임시)',
      draft_saved_at: '임시저장 일시',
      status: '상태 (active:이용중, inactive:해지, draft:임시저장)',
      allowance_config: '수당 설정 (JSON)',
      created_at: '생성일시 (unix ms)',
      updated_at: '수정일시 (unix ms)',
      service_contract_file_name: '자문계약서 파일명',
      service_contract_file_data: '자문계약서 파일 데이터',
      contract_start_date: '자문계약 시작일',
      contract_end_date: '자문계약 종료일',
      representatives: '대표자 정보 (JSON, 복수 가능)',
      sick_leave_pay_rate: '병가 유급비율 (%, 0=무급)',
    }
  },
  employees: {
    desc: '직원 (근로자 기본정보)',
    columns: {
      id: 'UUID',
      company_id: '소속 회사 ID → companies.id',
      name: '이름',
      gender: '성별 (male/female)',
      employment_category: '고용형태 구분',
      employee_number: '사원번호',
      phone: '휴대전화번호',
      email: '이메일',
      address: '주소',
      job_title: '직책',
      department: '부서',
      id_number: '주민등록번호',
      hire_date: '입사일',
      resignation_date: '퇴사일',
      status: '상태 (active:재직, resigned:퇴직)',
      note: '비고',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  contracts: {
    desc: '근로계약',
    columns: {
      id: 'UUID',
      employee_id: '직원 ID → employees.id',
      company_id: '회사 ID → companies.id',
      contract_type: '계약 유형 (regular/fixed_term/regular_probation/fixed_term_probation/daily)',
      status: '계약 상태',
      contract_start: '계약 시작일',
      contract_end: '계약 종료일',
      base_salary: '기본급',
      hourly_wage: '통상시급',
      monthly_salary_agreed: '월 약정임금',
      annual_salary: '연봉',
      daily_wage: '일급여',
      work_days_per_week: '주 소정근로일수',
      work_hours_per_day: '일 소정근로시간',
      probation_months: '수습기간 (개월)',
      probation_pct: '수습 임금 비율 (%)',
      probation_amt: '수습 임금 월 금액',
      schedule_json: '근무시간표 (JSON)',
      break_time: '휴게시간',
      meal_allowance: '식대',
      pay_period: '급여 산정기간',
      pay_period_month: '급여 산정기준월',
      pay_period_day: '급여 산정기준일',
      pay_day: '급여 지급일',
      salary_start_date: '급여 산정 시작일',
      salary_end_date: '급여 산정 종료일',
      is_draft: '임시저장 여부',
      is_voided_by_amend: '수정계약으로 파기 여부',
      draft_saved_at: '임시저장 일시',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  payrolls: {
    desc: '급여대장',
    columns: {
      id: 'UUID',
      employee_id: '직원 ID',
      company_id: '회사 ID',
      contract_id: '계약 ID',
      pay_year: '급여 연도',
      pay_month: '급여 월',
      pay_date: '급여 지급일',
      hourly_wage: '통상시급',
      base_salary: '기본급',
      work_days: '근무일수',
      annual_used: '연차 사용일수',
      absent_dates: '결근일자 (CSV)',
      absent_data: '결근 상세 (JSON)',
      late_data: '지각 상세 (JSON)',
      earlyleave_data: '조퇴 상세 (JSON)',
      is_draft: '임시저장 여부',
      status: '상태',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  attendance_ledger: {
    desc: '근태 관리대장 (결근·지각·조퇴, 보존년한 5년)',
    columns: {
      id: 'UUID',
      employee_id: '직원 ID',
      company_id: '회사 ID',
      year: '기준연도',
      month_data: '월별 근태 데이터 (JSON)',
      total_absent_days: '연간 총 결근일수',
      total_late_count: '연간 총 지각 횟수',
      total_earlyleave_count: '연간 총 조퇴 횟수',
      note: '비고',
      created_at: '생성일시',
      updated_at: '수정일시',
      contract_id: '관련 계약 ID',
      status: '상태',
    }
  },
  kakao_send_logs: {
    desc: '카카오 알림톡 발송 이력',
    columns: {
      id: 'UUID',
      message_id: 'Solapi 메시지 ID',
      template_code: '알림톡 템플릿 코드',
      recipient: '수신자 전화번호',
      content: '발송 내용',
      status: '발송 상태',
      result_code: '결과 코드',
      result_message: '결과 메시지',
      related_type: '관련 유형 (contract/payslip/consent)',
      related_id: '관련 데이터 ID',
      created_at: '발송일시',
    }
  },
  annual_leave_ledger: {
    desc: '연차 관리대장',
    columns: {
      id: 'UUID',
      employee_id: '직원 ID',
      company_id: '회사 ID',
      year: '기준연도',
      month_data: '월별 연차 사용 데이터 (JSON)',
      total_days: '연간 총 연차일수',
      total_used: '사용 연차일수',
      remain_days: '잔여 연차일수',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  admin_accounts: {
    desc: '관리자 계정',
    columns: {
      id: 'UUID',
      username: '아이디',
      password: '비밀번호 (해시)',
      display_name: '표시이름',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  billing: {
    desc: '청구/과금',
    columns: {
      id: 'UUID',
      company_id: '회사 ID',
      billing_year: '청구 연도',
      billing_month: '청구 월',
      amount: '청구 금액',
      payment_status: '납부 상태',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  contract_dispatch: {
    desc: '근로계약서 발송 이력',
    columns: {
      id: 'UUID',
      contract_id: '계약 ID',
      dispatch_method: '발송 방식',
      dispatch_status: '발송 상태',
      dispatched_at: '발송 일시',
      dispatched_by: '발송 처리자',
      recipient: '수신처',
      created_at: '생성일시',
    }
  },
  consent_dispatch: {
    desc: '정보제공동의서 발송 이력',
    columns: {
      id: 'UUID',
      contract_id: '계약 ID',
      dispatch_method: '발송 방식',
      dispatch_status: '발송 상태',
      dispatched_at: '발송 일시',
      recipient: '수신처',
      created_at: '생성일시',
    }
  },
  payroll_send_logs: {
    desc: '급여명세서 발송 이력',
    columns: {
      id: 'UUID',
      payroll_id: '급여대장 ID',
      company_id: '회사 ID',
      employee_id: '직원 ID',
      pay_year: '급여 연도',
      pay_month: '급여 월',
      send_method: '발송 방식 (kakao/email/manual)',
      sent_at: '발송 일시',
      sent_by: '발송 처리자',
      note: '비고',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  registered_executives: {
    desc: '등기임원 (대표자 외)',
    columns: {
      id: 'UUID',
      company_id: '회사 ID',
      name: '이름',
      position: '직책',
      phone: '전화번호',
      id_number: '주민등록번호',
      bank_name: '은행명',
      bank_account: '계좌번호',
      bank_holder: '예금주',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  related_party_workers: {
    desc: '특수관계인 근로자 (배우자, 직계존비속 등)',
    columns: {
      id: 'UUID',
      company_id: '회사 ID',
      name: '이름',
      relationship: '관계 (배우자/자녀/부모 등)',
      phone: '전화번호',
      id_number: '주민등록번호',
      bank_name: '은행명',
      bank_account: '계좌번호',
      bank_holder: '예금주',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  representative_contact: {
    desc: '대표 연락처 및 발신 설정',
    columns: {
      id: 'UUID',
      phone: '대표 전화번호',
      email: '대표 이메일',
      fax: '대표 팩스',
      updated_at: '수정일시',
      outbound_email: '발신전용 이메일 주소',
      outbound_password: '발신전용 이메일 비밀번호',
      outbound_smtp_host: 'SMTP 서버 주소',
      outbound_smtp_port: 'SMTP 포트',
      msg_body_rules: '메시지 본문 규칙 (JSON)',
    }
  },
  annual_leave_promotions: {
    desc: '연차 사용촉진 발송 이력',
    columns: {
      id: 'UUID',
      employee_id: '직원 ID',
      employee_name: '직원명',
      company_id: '회사 ID',
      company_name: '회사명',
      contract_type: '계약 유형',
      total_leave_days: '총 연차일수',
      used_leave_days: '사용 연차일수',
      remaining_leave_days: '잔여 연차일수',
      annual_leave_basis: '연차 산정 기준',
      leave_pay_estimate: '연차수당 추정액',
      worker_send_method: '근로자 발송 방식',
      sent_at: '발송 일시',
      sent_by: '발송 처리자',
      note: '비고',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  payroll_items: {
    desc: '급여 항목 (payrolls와 1:N, 수당·공제 개별 관리)',
    columns: {
      id: 'UUID',
      payroll_id: '급여대장 ID → payrolls.id',
      item_type: '항목 유형 (영문 코드)',
      amount: '금액',
      pay_type: '지급 유형 (fixed/actual)',
      memo: '메모',
      sort_order: '정렬 순서',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  wage_ledger_notifications: {
    desc: '임금대장 통지 (고객사 앱 알림)',
    columns: {
      id: 'UUID',
      company_id: '회사 ID',
      year: '연도',
      month: '월',
      is_read: '확인 여부 (0:미확인, 1:확인)',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  company_history: {
    desc: '고객사 정보 변경 이력',
    columns: {
      id: 'UUID',
      company_id: '회사 ID',
      changed_at: '변경 일시',
      changes: '변경 내용 (JSON)',
      snapshot: '변경 당시 스냅샷 (JSON)',
      effective_date: '적용일',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  company_notices: {
    desc: '고객사 앱 알림 (계약만료, 연차촉진, 공지사항 등)',
    columns: {
      id: 'UUID',
      company_id: '회사 ID',
      company_name: '회사명',
      notice_type: '알림 유형',
      title: '알림 제목',
      body: '알림 본문',
      contract_id: '관련 계약 ID',
      employee_id: '관련 직원 ID',
      employee_name: '직원명',
      contract_end: '계약 종료일',
      days_until_expiry: '만료까지 남은 일수',
      sent_at: '발송 일시',
      sent_by: '발송 처리자',
      is_read: '확인 여부 (0:미확인, 1:확인)',
      read_at: '확인 일시',
      gn_status: '일반공지 상태',
      gn_scheduled_at: '일반공지 예약일시',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  contract_expiry_notice: {
    desc: '계약만료 통지 이력',
    columns: {
      id: 'UUID',
      contract_id: '계약 ID',
      employee_id: '직원 ID',
      employee_name: '직원명',
      company_id: '회사 ID',
      company_name: '회사명',
      contract_type: '계약 유형',
      contract_end: '계약 종료일',
      days_until_expiry: '만료까지 남은 일수',
      notice_method: '통지 방식',
      notice_status: '통지 상태',
      recipient: '수신처',
      noticed_at: '통지 일시',
      noticed_by: '통지 처리자',
      note: '비고',
      message_id: 'Solapi 메시지 ID',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  insurance_rates: {
    desc: '4대보험 요율 (연도별)',
    columns: {
      id: 'UUID',
      insurance_type: '보험 유형 (national_pension/health/long_term_care/employment)',
      year: '적용 연도',
      period_start: '적용 시작일',
      period_end: '적용 종료일',
      rate: '요율 (%)',
      rate_base: '요율 기준',
      cap_amount: '상한액',
      note: '비고',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  minimum_wages: {
    desc: '최저임금 (연도별)',
    columns: {
      id: 'UUID',
      year: '적용 연도',
      hourly_wage: '시간당 최저임금',
      monthly_wage: '월 최저임금 (주40시간 기준)',
      note: '비고',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  tax_brackets: {
    desc: '소득세 과세표준 구간',
    columns: {
      id: 'UUID',
      year: '적용 연도',
      data: '구간 데이터 (JSON)',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  tax_bracket_rows: {
    desc: '소득세 구간별 세액 (간이세액표)',
    columns: {
      id: 'UUID',
      year: '적용 연도',
      from_amount: '구간 시작 금액',
      to_amount: '구간 종료 금액',
      dep1_tax: '부양가족 1인 세액',
      dep2_tax: '부양가족 2인 세액',
      dep3_tax: '부양가족 3인 세액',
      dep4_tax: '부양가족 4인 세액',
      dep5_tax: '부양가족 5인 세액',
      dep6_tax: '부양가족 6인 세액',
      dep7_tax: '부양가족 7인 세액',
      extra_per_dep: '8인 이상 가족 1인당 추가 세액',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  billing: {
    desc: '청구/과금',
    columns: {
      id: 'UUID',
      company_id: '회사 ID',
      billing_year: '청구 연도',
      billing_month: '청구 월',
      employee_count: '직원 수',
      amount_per_employee: '1인당 청구액',
      total_amount: '총 청구액',
      payment_status: '납부 상태 (pending/partial/paid/unpaid)',
      payment_date: '납부일',
      partial_paid_amount: '부분 납부액',
      remaining_amount: '잔여 청구액',
      due_date: '납부 기한',
      created_date: '청구 생성일',
      note: '비고',
      loss_amount: '손실 처리액',
      loss_date: '손실 처리일',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  contract_dispatch: {
    desc: '근로계약서 발송 이력',
    columns: {
      id: 'UUID',
      contract_id: '계약 ID',
      employee_id: '직원 ID',
      employee_name: '직원명',
      company_id: '회사 ID',
      company_name: '회사명',
      contract_type: '계약 유형',
      dispatch_method: '발송 방식 (kakao/email/manual)',
      dispatch_status: '발송 상태 (completed/failed/pending)',
      recipient: '수신처',
      dispatched_at: '발송 일시',
      dispatched_by: '발송 처리자',
      note: '비고',
      contract_start: '계약 시작일',
      contract_end: '계약 종료일',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  consent_dispatch: {
    desc: '정보제공동의서 발송 이력',
    columns: {
      id: 'UUID',
      contract_id: '계약 ID',
      employee_id: '직원 ID',
      employee_name: '직원명',
      company_id: '회사 ID',
      company_name: '회사명',
      contract_type: '계약 유형',
      dispatch_method: '발송 방식 (kakao/email/manual)',
      dispatch_status: '발송 상태 (completed/failed/pending)',
      recipient: '수신처',
      dispatched_at: '발송 일시',
      dispatched_by: '발송 처리자',
      note: '비고',
      contract_start: '계약 시작일',
      contract_end: '계약 종료일',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
};

function koComment(tableName, colName) {
  const t = KO[tableName];
  if (!t) {
    // KO 맵에 없는 테이블: 기본 설명 자동 생성
    if (colName) return '';
    return '';
  }
  if (colName) {
    const c = t.columns[colName];
    if (c) return ` -- ${c}`;
    // 컬럼 설명 누락 시 자동 추론
    return autoComment(colName);
  }
  return t.desc ? ` -- ${t.desc}` : autoTableComment(tableName);
}

// ── 컬럼명 기반 자동 한글 주석 생성 ──
function autoComment(name) {
  const map = {
    id: '고유식별자',
    created_at: '생성일시',
    updated_at: '수정일시',
    status: '상태',
    note: '비고',
    name: '이름',
    phone: '전화번호',
    email: '이메일',
    address: '주소',
    company_id: '회사 ID',
    employee_id: '직원 ID',
    contract_id: '계약 ID',
    payroll_id: '급여대장 ID',
    year: '연도',
    month: '월',
    day: '일',
    date: '일자',
    start: '시작',
    end: '종료',
    amount: '금액',
    total: '합계',
    count: '횟수',
    type: '유형',
    code: '코드',
    title: '제목',
    body: '본문',
    content: '내용',
    method: '방식',
    recipient: '수신처',
    sender: '발신자',
    is_draft: '임시저장 여부',
    draft_saved_at: '임시저장 일시',
    dispatch_method: '발송 방식',
    dispatch_status: '발송 상태',
    dispatched_at: '발송 일시',
    dispatched_by: '발송 처리자',
    payment_status: '납부 상태',
    pay_year: '급여 연도',
    pay_month: '급여 월',
    pay_date: '급여 지급일',
    pay_day: '급여 지급일',
    pay_period: '급여 산정기간',
    pay_period_month: '급여 산정기준월',
    pay_period_day: '급여 산정기준일',
    employee_name: '직원명',
    company_name: '회사명',
    contract_type: '계약 유형',
    contract_start: '계약 시작일',
    contract_end: '계약 종료일',
    hourly_wage: '통상시급',
    base_salary: '기본급',
    monthly_salary: '월 급여',
    annual_salary: '연봉',
    daily_wage: '일급여',
    work_days: '근무일수',
    work_hours: '근무시간',
    break_time: '휴게시간',
    overtime: '연장근로',
    night: '야간근로',
    holiday: '휴일근로',
    allowance: '수당',
    bonus: '상여금',
    insurance: '보험',
    tax: '세금',
    deduction: '공제',
    payment: '지급',
    paid: '지급액',
    unpaid: '미지급액',
    wage: '임금',
    salary: '급여',
    employment_category: '고용형태',
    employee_number: '사원번호',
    hire_date: '입사일',
    resignation_date: '퇴사일',
    dependents: '부양가족 수',
    job_title: '직책',
    department: '부서',
    id_number: '주민등록번호',
    bank_name: '은행명',
    bank_account: '계좌번호',
    bank_holder: '예금주',
    business_number: '사업자등록번호',
    representative: '대표자',
    industry: '업종',
    access_code: '접근 코드',
    signed_file: '서명 파일',
    consent_file: '동의서 파일',
    file_name: '파일명',
    file_data: '파일 데이터',
    schedule: '근무시간표',
    probation: '수습',
    amended: '수정',
    renewed: '갱신',
    terminated: '해지',
    voided: '파기',
    expire: '만료',
    notice: '통지',
    log: '이력',
    history: '변경이력',
    config: '설정',
    basis: '기준',
    rate: '비율',
    pct: '비율(%)',
    hours: '시간',
    days: '일수',
    weeks: '주',
    months: '개월',
    years: '년',
    message_id: '메시지 ID',
    template_code: '템플릿 코드',
    result_code: '결과 코드',
    result_message: '결과 메시지',
    related_type: '관련 유형',
    related_id: '관련 ID',
    ref_date: '기준일자',
    period_start: '기간 시작일',
    period_end: '기간 종료일',
    carryover: '이월',
    ordinary_wage: '통상임금',
    leave_pay: '연차수당',
    remain: '잔여',
    used: '사용',
    label: '표시명',
  };
  // 복합어 매칭 (underscore 분리)
  if (map[name]) return ` -- ${map[name]}`;
  const parts = name.split('_');
  const translated = parts.map(p => map[p] || p).join(' ');
  return ` -- ${translated}`;
}

function autoTableComment(name) {
  const map = {
    companies: '고객사',
    employees: '직원',
    contracts: '근로계약',
    payrolls: '급여대장',
    billing: '청구/과금',
    admin_accounts: '관리자 계정',
    annual_leave_ledger: '연차 관리대장',
    annual_leave_promotions: '연차 사용촉진',
    attendance_ledger: '근태 관리대장',
    kakao_send_logs: '카카오 알림톡 발송 이력',
    contract_dispatch: '근로계약서 발송 이력',
    consent_dispatch: '정보제공동의서 발송 이력',
    contract_expiry_notice: '계약만료 통지 이력',
    company_notices: '고객사 알림',
    company_history: '고객사 변경이력',
    insurance_rates: '4대보험 요율',
    minimum_wages: '최저임금',
    tax_brackets: '소득세 구간',
    tax_bracket_rows: '소득세 구간 상세',
    payroll_send_logs: '급여명세서 발송 이력',
    payroll_items: '급여 항목',
    wage_ledger_notifications: '임금대장 통지',
    registered_executives: '등기임원',
    related_party_workers: '특수관계인 근로자',
    representative_contact: '대표 연락처',
  };
  return map[name] ? ` -- ${map[name]}` : '';
}

const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();

let schema = '-- =============================================================================\n';
schema += '-- 인사톡 노무톡 — SQLite Schema (한글 주석 포함)\n';
schema += '-- node dump_schema.js 로 자동 생성 (ALTER TABLE 반영)\n';
schema += `-- 최종 갱신: ${new Date().toISOString().slice(0, 10)}\n`;
schema += `-- 테이블 수: ${tables.length}개\n`;
schema += '-- =============================================================================\n\n';
schema += 'PRAGMA journal_mode = WAL;\n\n';

let sectionIdx = 0;
const sections = [
  { title: 'SECTION 1: 기본정보 (회사, 직원, 관리자, 계약)', tables: ['companies','employees','admin_accounts','contracts','registered_executives','related_party_workers','representative_contact'] },
  { title: 'SECTION 2: 급여 및 근태', tables: ['payrolls','payroll_items','payroll_send_logs','attendance_ledger','annual_leave_ledger','annual_leave_promotions','wage_ledger_notifications'] },
  { title: 'SECTION 3: 발송 및 알림', tables: ['contract_dispatch','consent_dispatch','contract_expiry_notice','kakao_send_logs','company_notices','company_history'] },
  { title: 'SECTION 4: 청구 및 기준정보', tables: ['billing','insurance_rates','minimum_wages','tax_brackets','tax_bracket_rows'] },
];

const sectionMap = {};
sections.forEach(s => s.tables.forEach(t => { sectionMap[t] = s.title; }));

// 테이블을 섹션 순서대로 그룹화
const sectionTables = sections.map(s => ({
  title: s.title,
  tables: tables.filter(t => s.tables.includes(t.name))
}));
// 어떤 섹션에도 속하지 않은 나머지 테이블
const groupedNames = new Set(sections.flatMap(s => s.tables));
const remaining = tables.filter(t => !groupedNames.has(t.name));

for (const sec of sectionTables) {
  if (!sec.tables.length) continue;
  schema += `-- =============================================================================\n`;
  schema += `-- ${sec.title}\n`;
  schema += '-- =============================================================================\n\n';
  
  for (const t of sec.tables) {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    
    schema += `-- ${t.name}`;
    const tDesc = koComment(t.name);
    if (tDesc) schema += ` ${tDesc}`;
    schema += '\n';
    schema += `CREATE TABLE IF NOT EXISTS ${t.name} (\n`;
    
    cols.forEach((c, i) => {
      let def = `  ${c.name} ${c.type.toUpperCase()}`;
      if (c.pk) def += ' PRIMARY KEY';
      if (c.notnull && !c.pk) def += ' NOT NULL';
      if (c.dflt_value != null) def += ` DEFAULT ${c.dflt_value}`;
      if (i < cols.length - 1) def += ',';
      const cDesc = koComment(t.name, c.name);
      if (cDesc) def += ` -- ${cDesc}`;
      schema += def + '\n';
    });
    schema += ');\n\n';
    
    const indexes = db.prepare(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL`).all(t.name);
    for (const idx of indexes) {
      schema += idx.sql.replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS ') + ';\n';
    }
    if (indexes.length) schema += '\n';
  }
}

// 섹션 미분류 테이블
if (remaining.length > 0) {
  schema += `-- =============================================================================\n`;
  schema += `-- SECTION X: 기타 테이블\n`;
  schema += '-- =============================================================================\n\n';
  for (const t of remaining) {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    schema += `-- ${t.name}`;
    const tDesc = koComment(t.name);
    if (tDesc) schema += ` ${tDesc}`;
    schema += '\n';
    schema += `CREATE TABLE IF NOT EXISTS ${t.name} (\n`;
    cols.forEach((c, i) => {
      let def = `  ${c.name} ${c.type.toUpperCase()}`;
      if (c.pk) def += ' PRIMARY KEY';
      if (c.notnull && !c.pk) def += ' NOT NULL';
      if (c.dflt_value != null) def += ` DEFAULT ${c.dflt_value}`;
      if (i < cols.length - 1) def += ',';
      const cDesc = koComment(t.name, c.name);
      if (cDesc) def += ` -- ${cDesc}`;
      schema += def + '\n';
    });
    schema += ');\n\n';
  }
}

fs.writeFileSync('./data/schema.sql', schema, 'utf8');
console.log(`schema.sql updated (${tables.length} tables, ${tables.reduce((s, t) => s + db.prepare('PRAGMA table_info(' + t.name + ')').all().length, 0)} columns)`);
console.log('한글 주석 포함됨');
db.close();
