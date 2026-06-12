#!/usr/bin/env python3
"""
급여 데이터 재생성 스크립트
- 기존 718개 payrolls 전체 삭제
- 활성 계약 기반으로 수식에 맞게 재생성
  기간: 2025년 1월 ~ 2026년 5월 (직원 계약 시작일에 따라 적절히)

수식 정의:
  통상임금수당합 = 직책 + 현장 + 벽지 + 기술 + 면허 + 정기상여 + custom(fixed)
  평균임금수당합 = 식대(fixed) + 차량(fixed) + 출산보육(fixed) + 연구(fixed)
                + 통신(fixed) + 체력(fixed) + 자기계발(fixed) + 도서(fixed)
                + 해외(fixed) + custom(non-fixed)
  고정OT = fixed_ot_pay + fixed_night_pay + fixed_hol_pay
  고정급 = 통상임금수당합 + 고정OT + 평균임금수당합
  기본급 = 209h × 통상시급 − (고정OT + 평균임금수당합)  ※ 계약서 base_salary 참조
  주휴수당 = 계약서 weekly_holiday_pay 참조
  월약정(통상) = 기본급 + 주휴수당 + 고정급  ※ 계약서 monthly_salary_agreed 참조
  통상임금 = 기본급 + 주휴수당 + 통상임금수당합

  공제:
    국민연금: round(월급여 × 0.045 / 1000) × 1000   (상한: 617,700)
    건강보험: round(월급여 × 0.03545 / 10) × 10      (상한 없음 / 소수점 조정)
    장기요양: round(건강보험 × 0.1295 / 10) × 10
    고용보험: round(월급여 × 0.009 / 10) × 10
    소득세  : 간이세액표 근사 (부양가족 1인 기준)
    지방소득세: round(소득세 × 0.1)
"""

import json
import math
import calendar
from datetime import datetime, date

# ── 소득세 간이세액표 근사 (2026, 부양가족 1~2인 기준) ──
# 실제 간이세액표 대신 구간별 근사 사용
def calc_income_tax(gross: int, dependents: int = 1) -> int:
    """월 급여 기준 소득세 근사 계산 (원 단위)"""
    g = gross
    if g <= 1_060_000:   tax = 0
    elif g <= 1_500_000: tax = int((g - 1_060_000) * 0.06)
    elif g <= 3_000_000: tax = 26_400 + int((g - 1_500_000) * 0.15)
    elif g <= 4_500_000: tax = 251_400 + int((g - 3_000_000) * 0.24)
    elif g <= 8_000_000: tax = 611_400 + int((g - 4_500_000) * 0.35)
    else:                tax = 1_836_400 + int((g - 8_000_000) * 0.38)
    # 부양가족 1인 추가당 세액 경감 (근사: 12,500원/인 경감)
    dep_reduce = max(0, (dependents - 1)) * 12_500
    tax = max(0, tax - dep_reduce)
    # 10원 미만 절사
    return (tax // 10) * 10

def round_to(n: int, unit: int) -> int:
    return int(round(n / unit)) * unit

def calc_deductions(gross: int, dep: int = 1):
    """공제액 계산"""
    # 국민연금: 4.5%, 1,000원 단위 반올림, 상한 617,700
    np_base = min(gross, 6_170_000)  # 기준소득월액 상한
    pension = min(round_to(int(np_base * 0.045), 1000), 277_650)
    # 건강보험: 3.545%, 10원 단위
    health = round_to(int(gross * 0.03545), 10)
    # 장기요양: 건보 × 12.95%, 10원 단위
    ltcare = round_to(int(health * 0.1295), 10)
    # 고용보험: 0.9%, 10원 단위
    emp_ins = round_to(int(gross * 0.009), 10)
    # 소득세
    itax = calc_income_tax(gross, dep)
    # 지방소득세
    litax = round(itax * 0.1)
    total = pension + health + ltcare + emp_ins + itax + litax
    return {
        'national_pension': pension,
        'health_insurance': health,
        'long_term_care': ltcare,
        'employment_insurance': emp_ins,
        'income_tax': itax,
        'local_income_tax': litax,
        'total_deduction': total,
    }

def parse_custom_allowances(c: dict) -> dict:
    """custom_allowances JSON 파싱"""
    ca = c.get('custom_allowances')
    if not ca:
        return {}
    if isinstance(ca, str):
        try:
            return json.loads(ca)
        except:
            return {}
    return ca if isinstance(ca, dict) else {}

def get_pt(c: dict, key: str) -> str:
    """pay_type 반환 (transport_pay_type, meal_pay_type 등)"""
    # 필드명 변형 패턴: car→transport, meal→meal, research→research 등
    field_map = {
        'car': 'transport_pay_type',
        'transport': 'transport_pay_type',
        'meal': 'meal_pay_type',
        'research': 'research_pay_type',
        'communication': 'communication_pay_type',
        'fitness': 'fitness_pay_type',
        'self_dev': 'self_dev_pay_type',
        'book': 'book_pay_type',
        'overseas': 'overseas_pay_type',
        'childcare': 'childcare_pay_type',
        'remote_area': 'remote_area_pay_type',
    }
    fname = field_map.get(key, f'{key}_pay_type')
    return c.get(fname, 'fixed')  # 기본값 fixed

def calc_std_avg_allowances(c: dict):
    """
    통상임금 수당합, 평균임금 수당합 계산
    Returns: (std_allowance, avg_allowance)
    """
    # 통상임금 수당 (항상 통상임금 포함)
    std = 0
    std += float(c.get('position_allowance', 0) or 0)    # 직책
    std += float(c.get('site_allowance', 0) or 0)         # 현장
    std += float(c.get('remote_area_allowance', 0) or 0)  # 벽지 (통상임금 항목)
    std += float(c.get('skill_allowance', 0) or 0)         # 기술
    std += float(c.get('license_allowance', 0) or 0)       # 면허
    std += float(c.get('regular_bonus', 0) or 0)           # 정기상여

    # 평균임금 수당 (pay_type='fixed'일 때만 매월 고정 지급)
    avg = 0
    avg_cands = [
        ('transportation_allowance', 'car'),
        ('meal_allowance',           'meal'),
        ('research_allowance',       'research'),
        ('communication_allowance',  'communication'),
        ('fitness_allowance',        'fitness'),
        ('self_dev_allowance',       'self_dev'),
        ('book_allowance',           'book'),
        ('overseas_allowance',       'overseas'),
        ('childcare_allowance',      'childcare'),
    ]
    for field, pt_key in avg_cands:
        val = float(c.get(field, 0) or 0)
        pt = get_pt(c, pt_key)
        if pt == 'fixed':
            avg += val

    # self_driving_allowance (구형 필드, 차량과 합산)
    sdv = float(c.get('self_driving_allowance', 0) or 0)
    spt = get_pt(c, 'self_driving')
    if spt == 'fixed' or not spt:
        avg += sdv

    # custom_allowances: pay_type 없음 → 비고정(평균임금) 처리
    # (contract_type custom은 fixed일 때만 통상임금 포함 — db에 pay_type 별도 저장 안 됨)
    # 기존 db에 custom pay_type 정보 없어 일단 모두 avg로 처리
    ca = parse_custom_allowances(c)
    for k, v in ca.items():
        avg += float(v or 0)

    return int(std), int(avg)

def get_work_days_in_month(year: int, month: int, wdpw: int = 5) -> int:
    """해당 월의 근무일수 계산 (주 5일 기준)"""
    _, last_day = calendar.monthrange(year, month)
    work_days = 0
    for d in range(1, last_day + 1):
        wd = date(year, month, d).weekday()  # 0=월 ~ 6=일
        if wdpw == 5 and wd < 5:
            work_days += 1
        elif wdpw == 6 and wd < 6:
            work_days += 1
    return work_days

def contract_active_in_month(c: dict, year: int, month: int) -> bool:
    """해당 연월에 계약이 활성 상태인지 확인"""
    cs = c.get('contract_start', '')
    ce = c.get('contract_end')
    if not cs:
        return False
    try:
        start = date.fromisoformat(cs)
    except:
        return False
    # 해당 월의 마지막 날
    _, last = calendar.monthrange(year, month)
    month_end = date(year, month, last)
    month_start = date(year, month, 1)
    if start > month_end:
        return False
    if ce:
        try:
            end = date.fromisoformat(ce)
            if end < month_start:
                return False
        except:
            pass
    return True

def pay_date_for(year: int, month: int, pay_period: str) -> str:
    """급여 지급일 계산 (익월 25일 기준)"""
    if '당월' in (pay_period or ''):
        return f"{year}-{month:02d}-25"
    # 전월 기준 → 익월 25일
    if month == 12:
        return f"{year+1}-01-25"
    return f"{year}-{month+1:02d}-25"

def gen_payroll_id(emp_id: str, year: int, month: int) -> str:
    return f"pay_{emp_id}_{year}{month:02d}"

def make_payroll(c: dict, emp: dict, year: int, month: int, now_ts: int) -> dict:
    """단일 급여 레코드 생성"""
    emp_id = c['employee_id']
    co_id  = c['company_id']
    ctype  = c.get('contract_type', '정규직')
    dep    = int(emp.get('dependents', 1) or 1)
    dep    = max(1, dep)

    # ── 통상시급 ──
    hourly = float(c.get('hourly_wage', 0) or 0)

    # ── 일용직 ──
    if ctype == '일용직':
        wdpw = int(c.get('work_days_per_week', 5) or 5)
        work_days = get_work_days_in_month(year, month, wdpw)
        daily_wage = float(c.get('daily_wage', c.get('base_salary', 0)) or 0)
        if not daily_wage and hourly:
            daily_wage = hourly * 8
        gross = int(daily_wage * work_days)
        ded   = calc_deductions(gross, dep)
        return {
            'id':               gen_payroll_id(emp_id, year, month),
            'employee_id':      emp_id,
            'company_id':       co_id,
            'pay_year':         year,
            'pay_month':        month,
            'work_days':        work_days,
            'base_salary':      int(daily_wage),
            'weekly_holiday_pay': 0,
            'position_allowance': 0,
            'site_allowance':   0,
            'meal_allowance':   0,
            'transportation_allowance': 0,
            'gross_pay':        gross,
            'standard_monthly_pay': gross,
            'hourly_wage':      int(hourly),
            **ded,
            'net_pay':          gross - ded['total_deduction'],
            'pay_date':         pay_date_for(year, month, c.get('pay_period','')),
            'is_draft':         False,
            'note':             f"일용직 — {work_days}일 × {int(daily_wage):,}원",
            'created_at':       now_ts,
            'updated_at':       now_ts,
            '_ts':              now_ts // 1000,
        }

    # ── 정규직/계약직 ──
    # 계약서 기준값 사용
    base   = float(c.get('base_salary', 0) or 0)
    wkhol  = float(c.get('weekly_holiday_pay', 0) or 0)
    monthly = float(c.get('monthly_salary_agreed', 0) or 0)

    # 수당 분류
    std_allow, avg_allow = calc_std_avg_allowances(c)

    # 고정OT
    fixed_ot    = float(c.get('fixed_ot_pay', 0) or 0)
    fixed_night = float(c.get('fixed_night_pay', 0) or 0)
    fixed_hol   = float(c.get('fixed_hol_pay', 0) or 0)
    fixed_ot_sum = fixed_ot + fixed_night + fixed_hol

    # 월 근무일수
    wdpw = int(c.get('work_days_per_week', 5) or 5)
    work_days = get_work_days_in_month(year, month, wdpw)

    # gross = 계약서 monthly_salary_agreed (이미 기본급+주휴+수당 합산값)
    gross = int(monthly) if monthly > 0 else int(base + wkhol + std_allow + avg_allow + fixed_ot_sum)

    # 통상임금 (std) = 기본급 + 주휴수당 + 통상임금수당합
    std_pay = int(base + wkhol + std_allow)

    # 공제
    ded = calc_deductions(gross, dep)

    # 수당 상세
    pos_all  = int(c.get('position_allowance', 0) or 0)
    site_all = int(c.get('site_allowance', 0) or 0)
    meal_all = int(c.get('meal_allowance', 0) or 0)
    car_all  = int((c.get('transportation_allowance', 0) or 0)) + int((c.get('self_driving_allowance', 0) or 0))

    return {
        'id':               gen_payroll_id(emp_id, year, month),
        'employee_id':      emp_id,
        'company_id':       co_id,
        'pay_year':         year,
        'pay_month':        month,
        'work_days':        work_days,
        'base_salary':      int(base),
        'weekly_holiday_pay': int(wkhol),
        'position_allowance': pos_all,
        'site_allowance':   site_all,
        'meal_allowance':   meal_all,
        'transportation_allowance': car_all,
        'skill_allowance':  int(c.get('skill_allowance', 0) or 0),
        'license_allowance':int(c.get('license_allowance', 0) or 0),
        'remote_area_allowance': int(c.get('remote_area_allowance', 0) or 0),
        'research_allowance': int(c.get('research_allowance', 0) or 0),
        'communication_pay': int(c.get('communication_allowance', 0) or 0),
        'fitness_allowance': int(c.get('fitness_allowance', 0) or 0),
        'self_dev_allowance': int(c.get('self_dev_allowance', 0) or 0),
        'book_allowance':   int(c.get('book_allowance', 0) or 0),
        'overseas_allowance': int(c.get('overseas_allowance', 0) or 0),
        'childcare_allowance': int(c.get('childcare_allowance', 0) or 0),
        'gross_pay':        gross,
        'standard_monthly_pay': std_pay,
        'hourly_wage':      int(hourly),
        'overtime_hours':   int(c.get('fixed_ot_hours', 0) or 0),
        'overtime_pay':     int(fixed_ot),
        'night_hours':      int(c.get('fixed_night_hours', 0) or 0),
        'night_pay':        int(fixed_night),
        'holiday_hours':    int(c.get('fixed_hol_hours', 0) or 0),
        'holiday_pay':      int(fixed_hol),
        'dependents':       dep,
        **ded,
        'net_pay':          gross - ded['total_deduction'],
        'pay_date':         pay_date_for(year, month, c.get('pay_period', '')),
        'is_draft':         False,
        'note':             f"{ctype} — 통상시급 {int(hourly):,}원 기반 자동생성",
        'created_at':       now_ts,
        'updated_at':       now_ts,
        '_ts':              now_ts // 1000,
    }

def main():
    with open('data/db.json', encoding='utf-8') as f:
        db = json.load(f)

    employees_list = db.get('employees', [])
    employees = {e['id']: e for e in employees_list}
    contracts  = db.get('contracts', [])

    # 활성 계약 (최신 계약 우선): 직원당 최신 계약 1개
    active_all = [c for c in contracts
                  if not c.get('is_draft')
                  and c.get('status') not in ['해지', '무효', '계약예정']
                  and c.get('employee_id')
                  and c.get('hourly_wage', 0) > 0]

    from collections import defaultdict
    emp_contracts = defaultdict(list)
    for c in active_all:
        emp_contracts[c['employee_id']].append(c)

    latest_map = {}  # emp_id → 최신 계약
    for emp_id, clist in emp_contracts.items():
        clist.sort(key=lambda x: x.get('contract_start', ''), reverse=True)
        latest_map[emp_id] = clist[0]

    # 생성 기간: 2025년 1월 ~ 2026년 5월
    periods = []
    for y in [2025, 2026]:
        for m in range(1, 13):
            if y == 2026 and m > 5:
                break
            periods.append((y, m))

    import time
    now_ts = int(time.time() * 1000)

    new_payrolls = []
    skipped = 0
    generated = 0

    for (year, month) in periods:
        for emp_id, c in latest_map.items():
            emp = employees.get(emp_id, {})
            # 해당 월에 계약이 활성인지 확인
            if not contract_active_in_month(c, year, month):
                skipped += 1
                continue
            try:
                rec = make_payroll(c, emp, year, month, now_ts)
                new_payrolls.append(rec)
                generated += 1
            except Exception as e:
                print(f"  ⚠️ 오류 [{emp_id} {year}/{month}]: {e}")
                skipped += 1

    # ID 중복 제거 (같은 직원, 같은 달 → 마지막 것 유지)
    seen = {}
    for r in new_payrolls:
        seen[r['id']] = r
    new_payrolls = list(seen.values())
    # 정렬: pay_year, pay_month, employee_id
    new_payrolls.sort(key=lambda x: (x['pay_year'], x['pay_month'], x['employee_id']))

    print(f"\n생성: {generated}건 (중복제거 후: {len(new_payrolls)}건), 스킵: {skipped}건")

    # 검증 샘플 출력
    if new_payrolls:
        s = new_payrolls[0]
        print(f"\n샘플 [{s['employee_id']} {s['pay_year']}/{s['pay_month']}]:")
        for k in ['gross_pay','standard_monthly_pay','base_salary','weekly_holiday_pay',
                  'national_pension','health_insurance','long_term_care','employment_insurance',
                  'income_tax','local_income_tax','total_deduction','net_pay']:
            print(f"  {k}: {s.get(k, 0):,}")

    # db.json 업데이트 (기존 payrolls 전체 교체)
    db['payrolls'] = new_payrolls
    with open('data/db.json', 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

    print(f"\n✅ db.json 저장 완료 — payrolls {len(new_payrolls)}건")

if __name__ == '__main__':
    main()
