'use client';

import React, { useState, useTransition } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { X, Calendar, ChevronLeft, ChevronRight, PlusCircle, Loader2 } from 'lucide-react';
import { createMonth } from '../app/actions/months';
import { laLoiDieuHuong, thongDiepLoi } from '../lib/loi-dieu-huong';

interface YearMonthPickerModalProps {
  currentMonthKey: string; // e.g. '2026-08'
  existingMonthKeys: string[];
  onClose: () => void;
}

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export const YearMonthPickerModal: React.FC<YearMonthPickerModalProps> = ({
  currentMonthKey,
  existingMonthKeys,
  onClose,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const [activeYearStr] = currentMonthKey.split('-');
  const [selectedYear, setSelectedYear] = useState<number>(
    parseInt(activeYearStr, 10) || new Date().getFullYear()
  );

  const realToday = new Date();
  const realYear = realToday.getFullYear();
  const realMonth = realToday.getMonth() + 1;
  const realTodayKey = `${realYear}-${String(realMonth).padStart(2, '0')}`;

  const existing = new Set(existingMonthKeys);

  const [loi, setLoi] = useState<string | null>(null);

  const goToMonth = (monthKey: string) => {
    if (isPending) return;
    if (existing.has(monthKey)) {
      router.push(`/${monthKey}` as Route);
      onClose();
      return;
    }
    // Kỳ chưa tồn tại: tạo mới rồi server action tự chuyển trang.
    setPendingKey(monthKey);
    setLoi(null);
    startTransition(async () => {
      try {
        await createMonth(monthKey);
      } catch (e) {
        // createMonth kết thúc bằng redirect(), mà redirect() hoạt động bằng
        // cách ném lỗi — nuốt nó ở đây là chặn luôn việc chuyển trang.
        if (laLoiDieuHuong(e)) throw e;
        setLoi(thongDiepLoi(e, 'Không tạo được kỳ này. Thử lại giúp.'));
        setPendingKey(null);
      }
    });
  };

  return (
    <div
      id="year-month-picker-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="year-month-picker-content"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-lg">Danh Sách 12 Tháng Trong Năm</h3>
              <p className="text-xs text-slate-400">
                Chuyển qua lại bất kỳ tháng nào trong năm để ghi buổi đánh và chia tiền
              </p>
            </div>
          </div>
          <button
            id="close-year-month-picker-btn"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Year Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear((prev) => prev - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Năm trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-base font-bold text-slate-900 px-2">
              Năm {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((prev) => prev + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Năm sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {yr}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setSelectedYear(realYear);
                goToMonth(realTodayKey);
              }}
              className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer ml-1"
            >
              Hôm nay ({realMonth}/{realYear})
            </button>
          </div>
        </div>

        {/* 12 Months Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {MONTH_NAMES.map((mName, idx) => {
              const monthNumStr = String(idx + 1).padStart(2, '0');
              const cellMonthKey = `${selectedYear}-${monthNumStr}`;
              const isCurrentActive = cellMonthKey === currentMonthKey;
              const isRealCurrentMonth = cellMonthKey === realTodayKey;
              const monthExists = existing.has(cellMonthKey);
              const isCreating = isPending && pendingKey === cellMonthKey;

              return (
                <div
                  key={cellMonthKey}
                  onClick={() => goToMonth(cellMonthKey)}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all cursor-pointer ${
                    isCurrentActive
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                      : monthExists
                        ? 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/70 shadow-2xs'
                        : 'border-dashed border-slate-200 bg-slate-50/40 text-slate-400 hover:border-indigo-300 hover:bg-white'
                  }`}
                >
                  {/* Top indicator & Title */}
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {mName}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {monthNumStr}/{selectedYear}
                      </span>
                    </div>

                    {isCurrentActive && (
                      <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                        Đang xem
                      </span>
                    )}
                    {!isCurrentActive && isRealCurrentMonth && (
                      <span className="rounded-md bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold">
                        Hiện tại
                      </span>
                    )}
                  </div>

                  {/* Bottom content */}
                  <div className="mt-3 border-t border-slate-100 pt-2 text-xs">
                    {isCreating ? (
                      <div className="text-[11px] text-indigo-600 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Đang tạo kỳ...</span>
                      </div>
                    ) : monthExists ? (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        <span>Đã tạo kỳ</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                        <PlusCircle className="h-3 w-3" />
                        <span>Bấm để tạo kỳ</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs">
          <div className="text-slate-500 text-[11px]">
            💡 Bấm vào bất kỳ tháng nào để tự động chuyển kỳ. Danh sách thành viên cố định sẽ được tự
            động giữ nguyên.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Đóng
            </button>
          </div>

          {loi && (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {loi}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
