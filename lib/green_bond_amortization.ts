export interface CouponScheduleItem {
  period: number;
  couponAmount: number;
  principalRepayment: number;
  totalCashflow: number;
  remainingPrincipal: number;
}

export function generateBondSchedule(
  principal: number,
  annualRatePct: number,
  tenorYears: number,
  couponsPerYear: number = 2
): CouponScheduleItem[] {
  const totalPeriods = tenorYears * couponsPerYear;
  const periodRate = (annualRatePct / 100) / couponsPerYear;
  const couponPayment = Number((principal * periodRate).toFixed(2));

  const schedule: CouponScheduleItem[] = [];
  for (let period = 1; period <= totalPeriods; period++) {
    const isMaturity = period === totalPeriods;
    const principalRepayment = isMaturity ? principal : 0;
    const totalCashflow = Number((couponPayment + principalRepayment).toFixed(2));
    const remainingPrincipal = isMaturity ? 0 : principal;

    schedule.push({
      period,
      couponAmount: couponPayment,
      principalRepayment,
      totalCashflow,
      remainingPrincipal,
    });
  }
  return schedule;
}
