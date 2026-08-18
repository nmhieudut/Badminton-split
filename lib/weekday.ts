const WEEKDAYS = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/**
 * Vietnamese weekday for a 'YYYY-MM-DD' date.
 *
 * Deliberately avoids toLocaleDateString: Node and the browser ship different
 * ICU data, so the server rendered 'Sun' where the browser rendered 'CN' and
 * React tore the tree down on every load. Parsing the parts by hand also keeps
 * the date from being shifted by whatever time zone the viewer is in.
 */
export function weekdayVi(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
