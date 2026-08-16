/**
 * Chia `total` đồng cho các thành viên sao cho tổng các phần chia bằng đúng
 * `total`, không sai một đồng. Phần dư được phát mỗi người một đồng theo thứ
 * tự id đã sắp xếp, nên kết quả không đổi giữa các lần chạy.
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
