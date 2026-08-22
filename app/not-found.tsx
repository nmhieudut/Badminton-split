import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { vnParts } from '../lib/vn-time';

/*
 * Reached by a mistyped or stale URL. A month with no data does not come here —
 * that is a normal state and has its own screen — so this page can assume the
 * address itself is wrong and simply point back to the current period.
 */
export default function NotFound() {
  // The period in Vietnam time: just after midnight there, UTC is still on the
  // previous day and on the first of a month that means the previous period.
  const now = vnParts(new Date());
  const monthKey = `${now.year}-${String(now.month).padStart(2, '0')}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Search className="h-8 w-8" />
      </div>

      <p className="tabular mt-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        404
      </p>

      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
        Không có trang này
      </h1>

      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Đường dẫn sai hoặc trang đã đổi. Sổ chia tiền của nhóm vẫn nguyên vẹn —
        quay lại kỳ đang mở là thấy đủ.
      </p>

      <Link
        href={{ pathname: `/${monthKey}` }}
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
      >
        Về kỳ tháng {String(now.month).padStart(2, '0')}/{now.year}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </main>
  );
}
