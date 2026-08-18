'use client';

import React, { useState, useTransition } from 'react';
import { CalendarPlus, CalendarX2 } from 'lucide-react';
import { createMonth } from '../app/actions/months';
import { isNavigationError, errorMessage } from '../lib/navigation-error';

/**
 * Hiện khi người dùng chuyển tới một tháng chưa có kỳ nào.
 *
 * Trước đây chỗ này trả 404. Nhưng bấm mũi tên sang tháng sau là thao tác hoàn
 * toàn hợp lệ — người dùng không làm gì sai để đáng nhận một trang báo lỗi.
 * Tháng chưa có dữ liệu là một trạng thái bình thường, không phải đường dẫn hỏng.
 */
export function EmptyMonth({
  monthKey,
  isAdmin,
}: {
  monthKey: string;
  isAdmin: boolean;
}) {
  const [dangTao, startTransition] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [nam, thang] = monthKey.split('-');

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center sm:p-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-500">
        <CalendarX2 className="h-7 w-7" />
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-800">
        Chưa có kỳ Tháng {thang}/{nam}
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        {isAdmin
          ? 'Tạo kỳ này để bắt đầu ghi buổi đánh. Các thành viên cố định sẽ được mang sang tự động.'
          : 'Nhóm chưa mở sổ cho tháng này. Quay lại tháng khác để xem, hoặc nhắc chủ nhóm tạo kỳ mới.'}
      </p>

      {isAdmin && (
        <button
          type="button"
          disabled={dangTao}
          onClick={() =>
            startTransition(async () => {
              setLoi(null);
              try {
                await createMonth(monthKey);
              } catch (e) {
                // createMonth kết thúc bằng redirect(); nuốt lỗi đó là chặn
                // luôn việc chuyển sang kỳ vừa tạo.
                if (isNavigationError(e)) throw e;
                setLoi(errorMessage(e, 'Không tạo được kỳ này. Thử lại giúp.'));
              }
            })
          }
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <CalendarPlus className="h-4 w-4" />
          {dangTao ? 'Đang tạo...' : `Tạo kỳ Tháng ${thang}/${nam}`}
        </button>
      )}

      {loi && (
        <p className="mt-4 text-xs font-semibold text-rose-600">{loi}</p>
      )}
    </div>
  );
}
