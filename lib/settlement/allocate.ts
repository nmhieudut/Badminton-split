/**
 * Splits `total` đồng across the given members so that the shares add back up
 * to exactly `total`, never off by a single đồng. This is a largest-remainder
 * split: everyone gets the floor, then the remainder is handed out one đồng at
 * a time in sorted id order, so the result is identical on every run. A plain
 * float division would not hold — splitting 200.000 six ways used to lose 2đ.
 */
export function allocate(total: number, memberIds: string[]): Map<string, number> {
  const result = new Map<string, number>();
  const n = memberIds.length;
  if (n === 0) return result;

  const base = Math.floor(total / n);
  let remainder = total - base * n;

  const ordered = [...memberIds].sort();
  for (const id of ordered) {
    result.set(id, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }

  return result;
}
