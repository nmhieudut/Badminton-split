/*
 * Avatar tints, drawn only from the app's own ramps. The previous set reached
 * for sky, purple, fuchsia, cyan and orange, which sit outside the theme and so
 * kept their raw Tailwind hues — a rainbow of initials against a page built on
 * two signal colours. Variety here only has to help tell six people apart, and
 * the initial already does most of that work.
 */
export const MEMBER_COLORS = [
  'bg-indigo-100 text-indigo-800',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
  'bg-slate-200 text-slate-700',
  'bg-rose-100 text-rose-800',
  'bg-indigo-200 text-indigo-900',
];

export function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
