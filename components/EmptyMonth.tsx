'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarPlus } from 'lucide-react';
import { createMonth } from '../app/actions/months';
import { isNavigationError, errorMessage } from '../lib/navigation-error';

const MONTH_LABEL = (key: string) => {
  const [y, m] = key.split('-');
  return `Tháng ${m}/${y}`;
};

/**
 * Shown when the user navigates to a month that has no period yet.
 *
 * This used to return a 404. But tapping the arrow to the next month is a
 * perfectly valid action — the user did nothing wrong to deserve an error page.
 * A month without data is a normal state, not a broken URL, so the screen is an
 * invitation to open the period rather than a dead end.
 */
export function EmptyMonth({
  monthKey,
  isAdmin,
  /** Periods that do have data, so a visitor who cannot create one still has somewhere to go. */
  existingMonthKeys = [],
}: {
  monthKey: string;
  isAdmin: boolean;
  existingMonthKeys?: string[];
}) {
  const [isCreating, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [year, month] = monthKey.split('-');

  const others = existingMonthKeys.filter((k) => k !== monthKey).slice(0, 6);

  return (
    <section className="mx-auto max-w-md py-10 text-center sm:py-16">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <CalendarPlus className="h-7 w-7" />
      </div>

      <p className="tabular mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {month}/{year}
      </p>

      <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-slate-900">
        Kỳ này chưa mở
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {isAdmin
          ? 'Mở kỳ để bắt đầu ghi buổi đánh. Danh sách thành viên dùng chung nên bạn chỉ cần tick ai có đi.'
          : 'Nhóm chưa mở sổ cho tháng này. Xem các kỳ đã có bên dưới, hoặc nhắc chủ nhóm mở kỳ mới.'}
      </p>

      {isAdmin && (
        <button
          type="button"
          disabled={isCreating}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await createMonth(monthKey);
              } catch (e) {
                // createMonth ends with redirect(), which works by throwing;
                // swallowing that error would block the jump to the new period.
                if (isNavigationError(e)) throw e;
                setError(errorMessage(e, 'Không mở được kỳ này. Thử lại giúp.'));
              }
            })
          }
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          <CalendarPlus className="h-4 w-4" />
          {isCreating ? 'Đang mở...' : `Mở kỳ tháng ${month}/${year}`}
        </button>
      )}

      {error && <p className="mt-4 text-xs font-semibold text-rose-700">{error}</p>}

      {others.length > 0 && (
        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Các kỳ đã có
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {others.map((k) => (
              <Link
                key={k}
                href={{ pathname: `/${k}` }}
                className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {MONTH_LABEL(k)}
                <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
