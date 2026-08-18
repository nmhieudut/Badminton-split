'use client';

import React, { useState, useTransition } from 'react';
import { CalendarPlus, CalendarX2 } from 'lucide-react';
import { createMonth } from '../app/actions/months';
import { isNavigationError, errorMessage } from '../lib/navigation-error';

/**
 * Shown when the user navigates to a month that has no period yet.
 *
 * This used to return a 404. But tapping the arrow to the next month is a
 * perfectly valid action — the user did nothing wrong to deserve an error page.
 * A month without data is a normal state, not a broken URL.
 */
export function EmptyMonth({
  monthKey,
  isAdmin,
}: {
  monthKey: string;
  isAdmin: boolean;
}) {
  const [isCreating, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [year, month] = monthKey.split('-');

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center sm:p-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-500">
        <CalendarX2 className="h-7 w-7" />
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-800">
        Chưa có kỳ Tháng {month}/{year}
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        {isAdmin
          ? 'Tạo kỳ này để bắt đầu ghi buổi đánh. Các thành viên cố định sẽ được mang sang tự động.'
          : 'Nhóm chưa mở sổ cho tháng này. Quay lại tháng khác để xem, hoặc nhắc chủ nhóm tạo kỳ mới.'}
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
                setError(errorMessage(e, 'Không tạo được kỳ này. Thử lại giúp.'));
              }
            })
          }
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <CalendarPlus className="h-4 w-4" />
          {isCreating ? 'Đang tạo...' : `Tạo kỳ Tháng ${month}/${year}`}
        </button>
      )}

      {error && (
        <p className="mt-4 text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
