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
      id: '고유식별자',
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
      status: '상태 (이용중/해지/임시저장)',
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
      id: '고유식별자',
      company_id: '소속 회사 ID → companies.id',
      name: '이름',
      gender: '성별 (남/여)',
      employment_category: '고용형태 구분',
      employee_number: '사원번호',
      phone: '휴대전화번호',
      email: '이메일',
      address: '주소',
      job_title: '직책',
      department: '부서',
      id_number: '주민등록번호',
      hire_date: '입사일',
      resign_date: '퇴사일',
      career_history: '경력·이력',
      military_status: '병역',
      education: '최종학력',
      major: '전공',
      certifications: '자격증',
      language_skills: '어학능력',
      special_notes: '특이사항',
      marital_status: '결혼 여부',
      emergency_contact: '비상연락처',
      emergency_relation: '비상연락처 관계',
      status: '재직 상태 (재직/퇴직)',
      personnel_type: '인원 구분 (employee/representative/executive/related)',
      relationship: '특수관계인 관계 (배우자/자녀/부모 등)',
      hr_edit_history: '인사카드 수정 이력 (JSON 배열)',
      note: '비고',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  contracts: {
    desc: '근로계약',
    columns: {
      id: '고유식별자',
      employee_id: '직원 ID → employees.id',
      company_id: '회사 ID → companies.id',
      contract_type: '계약 유형 (정규직/계약직/정규직수습/계약직수습/일용직)',
      status: '계약 상태 (활성/해지/예정/갱신예정/해지예정/만료/파기/취소/서류미비)',
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
      annual_leave_days: '연차일수 (자동계산)',
      pre_used_annual_leave: '기사용 연차일수 (서비스 가입 이전)',
      created_reason: '계약 생성 사유 (new/renewal/recontract/amended_reissue)',
      hire_reason: '입사 사유 (new_hire/re_hire/contract_renewal/probation_end)',
      close_reason: '계약 종료 사유 (resignation/dismissal/expiry/renewal/void)',
    }
  },
  payrolls: {
    desc: '급여대장',
    columns: {
      id: '고유식별자',
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
      retro_absent_dates: '소급 결근일자 (CSV)',
      retro_absent_data: '소급 결근 상세 (JSON)',
      retro_late_data: '소급 지각 상세 (JSON)',
      retro_earlyleave_data: '소급 조퇴 상세 (JSON)',
      is_draft: '임시저장 여부',
      status: '상태',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  attendance_ledger: {
    desc: '근태 관리대장 (결근·지각·조퇴, 보존년한 5년)',
    columns: {
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
      contract_id: '계약 ID',
      dispatch_method: '발송 방식',
      dispatch_status: '발송 상태',
      dispatched_at: '발송 일시',
      dispatched_by: '발송 처리자',
      recipient: '수신처',
      created_at: '생성일시',
      dispatch_reason: '교부사유 (new/renewal/recontract/amended_reissue)',
    }
  },
  consent_dispatch: {
    desc: '정보제공동의서 발송 이력',
    columns: {
      id: '고유식별자',
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
      id: '고유식별자',
      payroll_id: '급여대장 ID',
      company_id: '회사 ID',
      employee_id: '직원 ID',
      pay_year: '급여 연도',
      pay_month: '급여 월',
      send_method: '발송 방식 (알림톡/이메일/수동교부)',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
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
      id: '고유식별자',
      insurance_type: '보험 유형 (국민연금/건강보험/장기요양/고용보험)',
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
      id: '고유식별자',
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
      id: '고유식별자',
      year: '적용 연도',
      data: '구간 데이터 (JSON)',
      created_at: '생성일시',
      updated_at: '수정일시',
    }
  },
  tax_bracket_rows: {
    desc: '소득세 구간별 세액 (간이세액표)',
    columns: {
      id: '고유식별자',
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
      id: '고유식별자',
      company_id: '회사 ID',
      billing_year: '청구 연도',
      billing_month: '청구 월',
      employee_count: '직원 수',
      amount_per_employee: '1인당 청구액',
      total_amount: '총 청구액',
      payment_status: '납부 상태 (대기/부분납부/미납/완납)',
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
      id: '고유식별자',
      contract_id: '계약 ID',
      employee_id: '직원 ID',
      employee_name: '직원명',
      company_id: '회사 ID',
      company_name: '회사명',
      contract_type: '계약 유형',
      dispatch_method: '발송 방식 (kakao/email/manual)',
      dispatch_status: '발송 상태 (완료/실패/대기)',
      recipient: '수신처',
      dispatched_at: '발송 일시',
      dispatched_by: '발송 처리자',
      note: '비고',
      contract_start: '계약 시작일',
      contract_end: '계약 종료일',
      created_at: '생성일시',
      updated_at: '수정일시',
      dispatch_reason: '교부사유 (new/renewal/recontract/amended_reissue)',
    }
  },
  consent_dispatch: {
    desc: '정보제공동의서 발송 이력',
    columns: {
      id: '고유식별자',
      contract_id: '계약 ID',
      employee_id: '직원 ID',
      employee_name: '직원명',
      company_id: '회사 ID',
      company_name: '회사명',
      contract_type: '계약 유형',
      dispatch_method: '발송 방식 (알림톡/이메일/수동교부)',
      dispatch_status: '발송 상태 (완료/실패/대기)',
      recipient: '수신처',
      dispatched_at: '발송 일시',
      dispatched_by: '발송 처리자',
      note: '비고',
      contract_start: '계약 시작일',
      contract_end: '계약 종료일',
      created_at: '생성일시',
      updated_at: '수정일시',
      is_expired: '만료 여부 (0:진행중, 1:만료)',
    }
  },
};

function koComment(tableName, colName) {
  const t = KO[tableName];
  if (!t) {
    // KO 맵에 없는 테이블: autoComment/autoTableComment로 자동 추론
    if (colName) return autoComment(colName);
    return autoTableComment(tableName);
  }
  if (colName) {
    const c = t.columns[colName];
    if (c) return ` -- ${c}`;
    // 컬럼 설명 누락 시 자동 추론
    return autoComment(colName);
  }
  return t.desc ? ` -- ${t.desc}` : autoTableComment(tableName);
}

// ── 컬럼명 기반 자동 한글 주석 생성 (영어 단어는 모두 한글로 매핑) ──
function autoComment(name) {
  const map = {
    id: '고유식별자',
    created_at: '생성일시',
    created_at_label: '생성일시 표시명',
    updated_at: '수정일시',
    status: '상태',
    note: '비고',
    memo: '메모',
    name: '이름',
    phone: '전화번호',
    email: '이메일',
    address: '주소',
    fax: '팩스',
    position: '직책',
    resign_date: '퇴사일',
    career_history: '경력·이력',
    military_status: '병역',
    education: '최종학력',
    major: '전공',
    certifications: '자격증',
    language_skills: '어학능력',
    special_notes: '특이사항',
    marital_status: '결혼 여부',
    emergency_contact: '비상연락처',
    emergency_relation: '비상연락처 관계',
    relationship: '관계',
    company_id: '회사 ID',
    employee_id: '직원 ID',
    contract_id: '계약 ID',
    payroll_id: '급여대장 ID',
    year: '연도',
    month: '월',
    day: '일',
    date: '일자',
    start_date: '시작일',
    end_date: '종료일',
    start: '시작',
    end: '종료',
    from: '시작',
    to: '종료',
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
    is_read: '확인 여부',
    is_voided: '파기 여부',
    is_representative: '대표자 여부',
    draft_saved_at: '임시저장 일시',
    read_at: '확인 일시',
    dispatch_method: '발송 방식',
    dispatch_status: '발송 상태',
    dispatched_at: '발송 일시',
    dispatched_by: '발송 처리자',
    sent_at: '발송 일시',
    sent_by: '발송 처리자',
    send_method: '발송 방식',
    send_type: '발송 유형',
    setting_key: '설정 키',
    setting_value: '설정 값',
    description: '설명',
    payment_status: '납부 상태',
    payment_date: '납부일',
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
    contract_period: '계약 기간',
    hourly_wage: '통상시급',
    base_salary: '기본급',
    monthly_salary: '월 급여',
    monthly_salary_agreed: '월 약정임금',
    annual_salary: '연봉',
    annual_leave_days: '연차 일수',
    annual_leave_used: '연차 사용일수',
    annual_leave_pay: '연차 수당',
    annual_leave_basis: '연차 산정 기준',
    daily_wage: '일급여',
    work_days: '근무일수',
    work_days_per_week: '주 근무일수',
    work_days_per_month: '월 근무일수',
    work_hours: '근무시간',
    work_hours_per_day: '일 근무시간',
    total_work_hours: '총 근무시간',
    break_time: '휴게시간',
    overtime: '연장근로',
    overtime_hours: '연장근로시간',
    overtime_pay: '연장근로수당',
    night: '야간근로',
    night_hours: '야간근로시간',
    night_pay: '야간근로수당',
    holiday: '휴일근로',
    holiday_hours: '휴일근로시간',
    holiday_pay: '휴일근로수당',
    weekly_holiday_pay: '주휴수당',
    allowance: '수당',
    allowance_config: '수당 설정',
    bonus: '상여금',
    bonus_pay: '상여금',
    regular_bonus: '정기상여금',
    performance_pay: '성과급',
    actual_expense_pay: '실비변상',
    insurance: '보험',
    insurance_type: '보험 유형',
    insurance_basis: '보험 가입기준',
    insurance_employment: '고용보험',
    insurance_industrial: '산재보험',
    insurance_pension: '국민연금',
    insurance_health: '건강보험',
    national_pension: '국민연금',
    health_insurance: '건강보험',
    long_term_care: '장기요양보험',
    employment_insurance: '고용보험',
    tax: '세금',
    income_tax: '소득세',
    local_income_tax: '지방소득세',
    tax_dependents: '부양가족 수(세금)',
    deduction: '공제',
    total_deduction: '총 공제액',
    advance_deduction: '선급 공제',
    payment: '지급',
    paid: '지급액',
    unpaid: '미지급액',
    partial_paid_amount: '부분 납부액',
    remaining_amount: '잔액',
    wage: '임금',
    gross_pay: '총 지급액',
    net_pay: '실 지급액',
    standard_monthly_pay: '기준월급여',
    salary: '급여',
    salary_start_date: '급여 시작일',
    salary_end_date: '급여 종료일',
    employment_category: '고용형태',
    employee_number: '사원번호',
    hire_date: '입사일',
    resignation_date: '퇴사일',
    expire_date: '만료일',
    terminate_date: '해지일',
    dependents: '부양가족 수',
    job_title: '직책',
    department: '부서',
    job_description: '담당업무',
    id_number: '주민등록번호',
    bank_name: '은행명',
    bank_account: '계좌번호',
    bank_holder: '예금주',
    business_number: '사업자등록번호',
    representative: '대표자',
    representatives: '대표자 정보',
    industry: '업종',
    access_code: '접근 코드',
    signed: '서명',
    signed_file_name: '서명 파일명',
    signed_file_data: '서명 파일 데이터',
    consent: '동의',
    consent_file_name: '동의서 파일명',
    consent_file_data: '동의서 파일 데이터',
    file_name: '파일명',
    file_data: '파일 데이터',
    schedule: '근무시간표',
    schedule_json: '근무시간표(JSON)',
    probation: '수습',
    probation_months: '수습기간(개월)',
    probation_pct: '수습 임금 비율(%)',
    probation_amt: '수습 임금액',
    probation_basis: '수습 산정 기준',
    probation_end_date: '수습 종료일',
    amended: '수정',
    amended_from: '수정 원본 ID',
    renewed: '갱신',
    renewed_from_id: '갱신 원본 ID',
    renewed_to_id: '갱신 대상 ID',
    terminated: '해지',
    voided: '파기',
    voided_at: '파기 일시',
    is_voided_by_amend: '수정계약 파기 여부',
    expire: '만료',
    expiry: '만료',
    days_until_expiry: '만료까지 일수',
    notice: '통지',
    notice_type: '통지 유형',
    notice_method: '통지 방식',
    notice_status: '통지 상태',
    noticed_at: '통지 일시',
    noticed_by: '통지 처리자',
    log: '이력',
    history: '변경이력',
    changes: '변경 내용',
    snapshot: '스냅샷',
    config: '설정',
    basis: '기준',
    rate: '요율',
    rate_base: '요율 기준',
    cap_amount: '상한액',
    pct: '비율(%)',
    hours: '시간',
    days: '일수',
    weeks: '주',
    months: '개월',
    years: '년',
    message_id: '메시지 ID',
    group_id: '그룹 ID',
    template_id: '템플릿 ID',
    template_code: '템플릿 코드',
    result_code: '결과 코드',
    result_message: '결과 메시지',
    error_message: '오류 메시지',
    related_table: '관련 테이블',
    related_type: '관련 유형',
    related_id: '관련 ID',
    retry_count: '재시도 횟수',
    ref_date: '기준일자',
    period_start: '기간 시작일',
    period_end: '기간 종료일',
    carryover: '이월',
    carryover_days: '이월 일수',
    ordinary_wage: '통상임금',
    leave_pay: '연차수당',
    leave_pay_estimate: '연차수당 추정액',
    remain: '잔여',
    remain_days: '잔여 일수',
    used: '사용',
    used_leave_days: '사용 연차일수',
    total_leave_days: '총 연차일수',
    remaining_leave_days: '잔여 연차일수',
    label: '표시명',
    display_name: '표시이름',
    username: '아이디',
    password: '비밀번호',
    outbound: '발신',
    outbound_email: '발신 이메일',
    outbound_password: '발신 비밀번호',
    outbound_smtp_host: 'SMTP 서버',
    outbound_smtp_port: 'SMTP 포트',
    msg_body_rules: '메시지 본문 규칙',
    effective_date: '적용일',
    scheduled_at: '예약 일시',
    gn_status: '공지 상태',
    gn_scheduled_at: '공지 예약 일시',
    loss_amount: '손실 처리액',
    loss_date: '손실 처리일',
    due_date: '납부 기한',
    created_date: '생성 일자',
    employee_count: '직원 수',
    amount_per_employee: '1인당 금액',
    total_amount: '총 금액',
    edit_source_id: '수정 원본 ID',
    worker_send_method: '근로자 발송 방식',
    service_contract: '자문계약',
    service_contract_file_name: '자문계약서 파일명',
    service_contract_file_data: '자문계약서 파일',
    transport: '교통',
    transportation: '교통',
    transportation_allowance: '교통비',
    transport_type: '교통 유형',
    transport_pay_type: '교통비 지급유형',
    meal: '식대',
    meal_allowance: '식대',
    meal_pay_type: '식대 지급유형',
    research: '연구',
    research_allowance: '연구수당',
    research_pay_type: '연구수당 지급유형',
    communication: '통신',
    communication_allowance: '통신비',
    communication_pay_type: '통신비 지급유형',
    communication_pay: '통신비',
    fitness: '건강',
    fitness_allowance: '건강관리비',
    fitness_pay_type: '건강관리비 지급유형',
    self_dev: '자기계발',
    self_dev_allowance: '자기계발비',
    self_dev_pay_type: '자기계발비 지급유형',
    book: '도서',
    book_allowance: '도서구입비',
    book_pay_type: '도서구입비 지급유형',
    overseas: '해외',
    overseas_allowance: '해외수당',
    overseas_pay_type: '해외수당 지급유형',
    fixed: '고정',
    fixed_ot: '고정연장',
    fixed_ot_pay: '고정연장수당',
    fixed_ot_hours: '고정연장시간',
    fixed_night: '고정야간',
    fixed_night_pay: '고정야간수당',
    fixed_night_hours: '고정야간시간',
    fixed_hol: '고정휴일',
    fixed_hol_pay: '고정휴일수당',
    fixed_hol_hours: '고정휴일시간',
    position_allowance: '직책수당',
    skill_allowance: '기능수당',
    license_allowance: '면허수당',
    site_allowance: '현장수당',
    hazard_allowance: '위험수당',
    self_driving: '자가운전',
    self_driving_allowance: '자가운전보조금',
    self_driving_pay_type: '자가운전 지급유형',
    remote_area: '원격지',
    remote_area_allowance: '원격지수당',
    remote_area_pay_type: '원격지 지급유형',
    car_maintenance: '차량유지비',
    childcare: '보육',
    childcare_allowance: '보육수당',
    childcare_dependents: '보육 부양가족 수',
    childcare_pay_type: '보육수당 지급유형',
    etc: '기타',
    other_allowance: '기타수당',
    other_allowance_memo: '기타수당 메모',
    contract_etc_allowance: '계약 기타수당',
    custom_ordinary_values: '통상임금 포함 사용자정의',
    year_end_tax_adjust: '연말정산',
    year_end_tax_adjust_memo: '연말정산 메모',
    health_insurance_adjust: '건강보험 정산',
    health_insurance_adjust_memo: '건강보험 정산 메모',
    health_insurance_adjust_yearend: '건강보험 연말정산',
    health_insurance_adjust_yearend_memo: '건강보험 연말정산 메모',
    ltcare_adjust_yearend: '장기요양 연말정산',
    ltcare_adjust_yearend_memo: '장기요양 연말정산 메모',
    dep1_tax: '부양1인 세액',
    dep2_tax: '부양2인 세액',
    dep3_tax: '부양3인 세액',
    dep4_tax: '부양4인 세액',
    dep5_tax: '부양5인 세액',
    dep6_tax: '부양6인 세액',
    dep7_tax: '부양7인 세액',
    extra_per_dep: '8인이상 추가세액',
    from_amount: '구간 시작액',
    to_amount: '구간 종료액',
    sort_order: '정렬 순서',
    item_type: '항목 유형',
    changed_at: '변경 일시',
    sick_leave_pay_rate: '병가 유급비율',
    proration_method: '일할계산 방식',
    dismissal_notice_pay: '해고예고수당',
    dismissal_notice_pay_reason: '해고예고수당 사유',
    advance_deduction_memo: '선급 공제 메모',
    severance_interim_pay: '퇴직금 중간정산',
    settlement_date: '정산일',
    tenure_days: '재직일수',
    daily_average_wage: '평균임금',
    settlement_amount: '정산금액',
    reason: '사유',
    transportation_pay_type: '교통비 지급유형',
    period_start: '적용 시작일',
    period_end: '적용 종료일',
    // 범용 복합어 컴포넌트
    id: 'ID',
    employee: '직원',
    company: '회사',
    contract: '계약',
    settlement: '정산',
    tenure: '재직',
    daily: '일',
    average: '평균',
    wage: '임금',
    amount: '금액',
    date: '일자',
    days: '일수',
    hours: '시간',
    per: '당',
    memo: '메모',
    note: '비고',
    variables: '변수',
    // ── 누락 보충 (2026-08-10) ──
    executives: '임원',
    related: '특수관계',
    parties: '인',
    contacts: '연락처',
    retention: '보존',
    cleared: '해제',
    reported: '신고',
    custom: '사용자정의',
    values: '값',
    items: '항목',
    is: '여부',
    excel: '엑셀',
    path: '경로',
    updated: '갱신된',
    employees: '직원',
    draft: '임시저장',
    at: '일시',
    html: 'HTML',
    file: '파일',
  };
  // 정확 매칭
  if (map[name]) return ` -- ${map[name]}`;
  // 복합어 매칭 (underscore 분리, 모든 단어가 매핑되어야 함)
  const parts = name.split('_');
  const translated = parts.map(p => map[p] || null);
  if (translated.every(t => t !== null)) {
    return ` -- ${translated.join(' ')}`;
  }
  // 매핑되지 않은 단어가 있으면 빈 주석 반환 (영문 섞지 않음)
  return '';
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
