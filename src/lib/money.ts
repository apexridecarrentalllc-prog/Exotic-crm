/**
 * Rounds an amount to 2 decimals. Used for invoice totals, balances and payments so that sums such as
 * 50 x 12.34 are stored as 617.00, not 616.9999999999998 (which would reject an exact payment of 617.00).
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
