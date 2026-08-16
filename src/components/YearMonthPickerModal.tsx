import React, { useState } from 'react';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PlusCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { MonthSession } from '../types';
import { formatVND } from '../utils/settlement';

interface YearMonthPickerModalProps {
  sessions: MonthSession[];
  currentMonthKey: string; // e.g. '2026-08'
  onSelectMonthKey: (monthKey: string) => void;
  onOpenCustomNewMonthModal: () => void;
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
  sessions,
  currentMonthKey,
  onSelectMonthKey,
  onOpenCustomNewMonthModal,
  onClose,
}) => {
  // Extract active year and month
  const [activeYearStr, activeMonthStr] = currentMonthKey.split('-');
  const [selectedYear, setSelectedYear] = useState<number>(
    parseInt(activeYearStr, 10) || new Date().getFullYear()
  );

  const realToday = new Date();
  const realYear = realToday.getFullYear();
  const realMonth = realToday.getMonth() + 1;
  const realTodayKey = `${realYear}-${String(realMonth).padStart(2, '0')}`;

  // Find all sessions for the selected year
  const sessionsByMonthKey: Record<string, MonthSession> = {};
  sessions.forEach((s) => {
    if (s.monthKey) {
      sessionsByMonthKey[s.monthKey] = s;
    }
  });

  const handlePrevYear = () => {
    setSelectedYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear((prev) => prev + 1);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const monthKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    onSelectMonthKey(monthKey);
    onClose();
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
              onClick={handlePrevYear}
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
              onClick={handleNextYear}
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
                const monthKey = `${realYear}-${String(realMonth).padStart(2, '0')}`;
                onSelectMonthKey(monthKey);
                onClose();
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
              const sessionForMonth = sessionsByMonthKey[cellMonthKey];

              // Calculate basic summary if session exists
              const dailyCount = sessionForMonth?.dailySessions?.length || 0;
              const totalCost = sessionForMonth
                ? (sessionForMonth.dailySessions || []).reduce((acc, s) => {
                    const shuttle =
                      s.shuttlecockTotalFee !== undefined
                        ? s.shuttlecockTotalFee
                        : (s.shuttlecockCount || 0) * (s.shuttlecockPricePerItem || 25000);
                    return acc + (s.courtFee || 0) + shuttle + (s.drinkFee || 0) + (s.otherFee || 0);
                  }, 0) +
                  (sessionForMonth.expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0)
                : 0;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectMonth(idx)}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all cursor-pointer ${
                    isCurrentActive
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                      : sessionForMonth && dailyCount > 0
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

                  {/* Middle / Bottom content: session count or prompt to activate */}
                  <div className="mt-3 border-t border-slate-100 pt-2 text-xs">
                    {sessionForMonth && dailyCount > 0 ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                          <span>🏸 {dailyCount} buổi đánh</span>
                        </div>
                        <div className="font-mono text-[11px] font-bold text-indigo-600">
                          {formatVND(totalCost)}
                        </div>
                      </div>
                    ) : sessionForMonth ? (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                        <span>Đã tạo kỳ (0 buổi)</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                        <PlusCircle className="h-3 w-3" />
                        <span>Bấm để vào tháng</span>
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
            💡 Bấm vào bất kỳ tháng nào để tự động chuyển kỳ. Danh sách thành viên cố định sẽ được tự động giữ nguyên.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCustomNewMonthModal();
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Tùy chỉnh kỳ mới...
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
