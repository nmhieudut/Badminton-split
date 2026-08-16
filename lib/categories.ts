export const MEMBER_COLORS = [
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-sky-100 text-sky-800 border-sky-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-orange-100 text-orange-800 border-orange-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
];

export function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
