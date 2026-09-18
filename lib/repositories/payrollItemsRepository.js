/**
 * lib/repositories/payrollItemsRepository.js — 급여 수당 항목(payroll_items)
 * 
 * payrolls 테이블의 30종 수당을 정규화한 별도 테이블
 * item_type: 'meal', 'transportation', 'position' 등 (constants.js ALLOWANCE_TYPES 참조)
 */

const { BaseRepository } = require('../database');

class PayrollItemsRepository extends BaseRepository {
  constructor(conn) { super('payroll_items', conn); }

  /** 특정 급여의 모든 수당 항목 조회 */
  findByPayroll(payrollId) {
    return this.db.prepare(
      'SELECT * FROM payroll_items WHERE payroll_id = ? ORDER BY sort_order'
    ).all(payrollId);
  }

  /** 특정 급여의 수당 항목 일괄 교체 (트랜잭션) */
  replaceItems(payrollId, items) {
    const tx = this.db.transaction(() => {
      // 기존 항목 삭제
      this.db.prepare('DELETE FROM payroll_items WHERE payroll_id = ?').run(payrollId);
      // 새 항목 삽입
      const insert = this.db.prepare(`
        INSERT INTO payroll_items (id, payroll_id, item_type, amount, pay_type, memo, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const now = Date.now();
      items.forEach((item, idx) => {
        insert.run(
          item.id || require('uuid').v4(),
          payrollId,
          item.item_type,
          item.amount || 0,
          item.pay_type || null,
          item.memo || null,
          idx,
          item.created_at || now,
          now
        );
      });
    });
    tx();
    return this.findByPayroll(payrollId);
  }

  /** payrolls 평면 데이터 → payroll_items 배열로 변환하는 매퍼 */
  static ALLOWANCE_MAP = [
    ['weekly_holiday_pay',   'weekly_holiday',     false, null],
    ['position_allowance',   'position',           false, null],
    ['skill_allowance',      'skill',              false, null],
    ['license_allowance',    'license',            false, null],
    ['overtime_pay',         'overtime',           false, null],
    ['night_pay',            'night',              false, null],
    ['holiday_pay',          'holiday',            false, null],
    ['transportation_allowance', 'transportation', true,  'transportation_pay_type'],
    ['self_driving_allowance',   'self_driving',   true,  'self_driving_pay_type'],
    ['meal_allowance',           'meal',           true,  'meal_pay_type'],
    ['childcare_allowance',      'childcare',      true,  'childcare_pay_type'],
    ['research_allowance',       'research',       true,  'research_pay_type'],
    ['communication_allowance',  'communication',  true,  'communication_pay_type'],
    ['fitness_allowance',        'fitness',        true,  'fitness_pay_type'],
    ['self_dev_allowance',       'self_dev',       true,  'self_dev_pay_type'],
    ['book_allowance',           'book',           true,  'book_pay_type'],
    ['overseas_allowance',       'overseas',       true,  'overseas_pay_type'],
    ['contract_etc_allowance',   'contract_etc',   false, null],
    ['annual_leave_pay',         'annual_leave',   false, null],
    ['bonus_pay',                'bonus',          false, null],
    ['performance_pay',          'performance',    false, null],
    ['actual_expense_pay',       'actual_expense', false, null],
    ['communication_pay',        'comm_expense',   false, null],
    ['etc_allowance',            'etc',            true,  'etc_allowance_memo'],
    ['site_allowance',           'site',           false, null],
    ['remote_area_allowance',    'remote_area',    false, null],
    ['regular_bonus',            'regular_bonus',  false, null],
    ['hazard_allowance',         'hazard',         false, null],
  ];
}

module.exports = { PayrollItemsRepository };
