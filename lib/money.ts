export function formatVND(amount: number): string {
  if (!Number.isFinite(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

export function parseVNDInput(input: string): number {
  if (!input) return 0;
  const clean = input.trim().toLowerCase();

  const toNumber = (s: string) => {
    const n = parseFloat(s.replace(',', '.').replace(/[^0-9.]/g, ''));
    return Number.isNaN(n) ? 0 : n;
  };

  if (/(k|ngàn|nghìn|nghin)$/.test(clean)) {
    return Math.round(toNumber(clean) * 1000);
  }
  if (/(tr|m|triệu|trieu)$/.test(clean)) {
    return Math.round(toNumber(clean) * 1000000);
  }

  const digits = clean.replace(/[^0-9]/g, '');
  const val = parseInt(digits, 10);
  return Number.isNaN(val) ? 0 : val;
}
