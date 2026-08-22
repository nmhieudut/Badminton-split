/**
 * The smallest note anybody actually hands over. Nobody transfers 21.600đ, so
 * a share is rounded up to the next whole thousand.
 */
export const ROUNDING_UNIT = 1000;

/**
 * Splits `total` đồng across the given members, rounding each share UP to a
 * whole thousand.
 *
 * Everyone pays the same figure, which is the point: an exact split leaves
 * amounts like 21.600đ that nobody transfers, and a largest-remainder split in
 * thousands would make some people pay 1.000 more than the person beside them
 * for the same evening.
 *
 * The shares therefore add up to slightly MORE than was spent — up to 999đ per
 * person — and whoever fronted the money is reimbursed that much over. This is
 * a deliberate group decision, not an oversight: it is how the settling-up
 * actually happens, and the alternative was leaving odd đồng in every amount.
 * The consequence is that the group's net balances no longer sum to zero; the
 * excess is reported separately rather than hidden.
 */
export function allocate(total: number, memberIds: string[]): Map<string, number> {
  const result = new Map<string, number>();
  const n = memberIds.length;
  if (n === 0) return result;

  const each = Math.ceil(total / n / ROUNDING_UNIT) * ROUNDING_UNIT;
  for (const id of memberIds) result.set(id, each);

  return result;
}
