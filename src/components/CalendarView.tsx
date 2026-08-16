import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Users,
  Clock,
  Trash2,
  Edit2,
  Copy,
  CheckCircle,
  X,
} from 'lucide-react';
import { DailySession, Member } from '../types';
import { formatVND } from '../utils/settlement';
import { ConfirmDialog } from './ConfirmDialog';

interface CalendarViewProps {
  sessions: DailySession[];
  members: Member[];
  monthKey?: string; // '2026-08'
  onAddSessionOnDate: (dateStr: string) => void;
  onEditSession: (session: DailySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDuplicateSession: (session: DailySession) => void;
  onMonthChange?: (newMonthKey: string) => void;
  onOpenYearMonthPicker?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  sessions,
  members,
  monthKey,
  onAddSessionOnDate,
  onEditSession,
  onDeleteSession,
  onDuplicateSession,
  onMonthChange,
  onOpenYearMonthPicker,
}) => {
  // Parse initial year and month
  const getInitialDate = () => {
    if (monthKey && monthKey.includes('-')) {
      const [y, m] = monthKey.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    if (sessions.length > 0) {
      return new Date(sessions[0].date);
    }
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialDate);
  const [selectedDaySessions, setSelectedDaySessions] = useState<{
    dateStr: string;
    sessions: DailySession[];
  } | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<DailySession | null>(null);

  // Sync with prop changes
  React.useEffect(() => {
    if (monthKey && monthKey.includes('-')) {
      const [y, m] = monthKey.split('-').map(Number);
      setCurrentMonth(new Date(y, m - 1, 1));
    }
  }, [monthKey]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-11

  const handlePrevMonth = () => {
    const prevDate = new Date(year, month - 1, 1);
    setCurrentMonth(prevDate);
    if (onMonthChange) {
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      onMonthChange(`${y}-${m}`);
    }
  };

  const handleNextMonth = () => {
    const nextDate = new Date(year, month + 1, 1);
    setCurrentMonth(nextDate);
    if (onMonthChange) {
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      onMonthChange(`${y}-${m}`);
    }
  };

  const handleJumpToCurrent = () => {
    const now = new Date();
    setCurrentMonth(now);
    if (onMonthChange) {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      onMonthChange(`${y}-${m}`);
    }
  };

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeekRaw = new Date(year, month, 1).getDay();
  // Monday = 0, Tuesday = 1, ..., Sunday = 6
  const startDayOffset = (firstDayOfWeekRaw + 6) % 7;

  const todayStr = new Date().toISOString().split('T')[0];

  // Group sessions by date string: 'YYYY-MM-DD'
  const sessionsByDate: Record<string, DailySession[]> = {};
  sessions.forEach((s) => {
    if (!sessionsByDate[s.date]) {
      sessionsByDate[s.date] = [];
    }
    sessionsByDate[s.date].push(s);
  });

  const monthSessions = sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalMonthCourtFee = monthSessions.reduce((acc, s) => acc + (s.courtFee || 0), 0);
  const totalMonthShuttles = monthSessions.reduce((acc, s) => acc + (s.shuttlecockCount || 0), 0);
  const totalMonthCost = monthSessions.reduce((acc, s) => {
    const sShuttle =
      s.shuttlecockTotalFee !== undefined
        ? s.shuttlecockTotalFee
        : (s.shuttlecockCount || 0) * (s.shuttlecockPricePerItem || 25000);
    return acc + (s.courtFee || 0) + sShuttle + (s.drinkFee || 0) + (s.otherFee || 0);
  }, 0);

  // Generate calendar grid cells
  const calendarCells = [];

  // 1. Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dateStr = prevDate.toISOString().split('T')[0];
    calendarCells.push({
      dayNum,
      dateStr,
      isCurrentMonth: false,
      sessions: sessionsByDate[dateStr] || [],
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dayNum: d,
      dateStr,
      isCurrentMonth: true,
      sessions: sessionsByDate[dateStr] || [],
    });
  }

  // 3. Next month leading days to complete grid
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let nextD = 1; nextD <= remainingCells; nextD++) {
    const nextDate = new Date(year, month + 1, nextD);
    const dateStr = nextDate.toISOString().split('T')[0];
    calendarCells.push({
      dayNum: nextD,
      dateStr,
      isCurrentMonth: false,
      sessions: sessionsByDate[dateStr] || [],
    });
  }

  const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <div id="calendar-view-container" className="space-y-4">
      {/* Calendar Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenYearMonthPicker}
                className="group inline-flex items-center gap-1 font-bold text-slate-900 text-base hover:text-indigo-600 transition-colors cursor-pointer"
                title="Bấm để chọn nhanh 1 trong 12 tháng của năm"
              >
                <span>
                  Tháng {String(month + 1).padStart(2, '0')} / {year}
                </span>
                <span className="text-xs text-slate-400 group-hover:text-indigo-600">▾</span>
              </button>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                {monthSessions.length} buổi
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Nhấn ngày bất kỳ để ghi buổi đánh hoặc xem chi tiết
            </p>
          </div>
        </div>

        {/* Quick Month Metrics & Switcher */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-3 border-r border-slate-100 pr-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">CẦU DÙNG</span>
              <span className="font-mono font-bold text-slate-800">{totalMonthShuttles} quả</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">TỔNG TIỀN</span>
              <span className="font-mono font-bold text-indigo-600">{formatVND(totalMonthCost)}</span>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleJumpToCurrent}
              className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="min-w-[620px] sm:min-w-0">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center">
            {WEEK_DAYS.map((w, idx) => (
              <div
                key={idx}
                className={`py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                  idx >= 5 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-600'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Date cells grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarCells.map((cell, idx) => {
            const hasSessions = cell.sessions.length > 0;
            const isToday = cell.dateStr === todayStr;

            return (
              <div
                key={idx}
                className={`group relative min-h-[105px] sm:min-h-[120px] p-2 transition-all flex flex-col justify-between ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/30 text-slate-300'
                    : hasSessions
                    ? 'bg-indigo-50/15'
                    : 'bg-white hover:bg-slate-50/50'
                }`}
              >
                {/* Cell Header: Date number & Add button */}
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : hasSessions
                        ? 'bg-slate-900 text-white font-mono'
                        : cell.isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-300'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {cell.isCurrentMonth && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSessionOnDate(cell.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white cursor-pointer"
                      title={`Tạo buổi đánh ngày ${cell.dayNum}/${month + 1}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Sessions in this day */}
                <div className="my-1 space-y-1 flex-1">
                  {cell.sessions.map((s) => {
                    const sShuttle =
                      s.shuttlecockTotalFee !== undefined
                        ? s.shuttlecockTotalFee
                        : (s.shuttlecockCount || 0) * (s.shuttlecockPricePerItem || 25000);
                    const sTotal =
                      (s.courtFee || 0) + sShuttle + (s.drinkFee || 0) + (s.otherFee || 0);
                    const attendeesCount = s.attendeeIds?.length || 0;

                    return (
                      <div
                        key={s.id}
                        className="group/item relative rounded-xl border border-indigo-200/70 bg-white p-1.5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all"
                      >
                        <div
                          onClick={() => onEditSession(s)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-[11px] text-slate-900 truncate max-w-[80px] sm:max-w-[100px]">
                              {s.courtName.replace('Sân ', '')}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-indigo-600">
                              {formatVND(sTotal)}
                            </span>
                          </div>

                          <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="text-indigo-700 font-semibold">
                              {attendeesCount} người
                            </span>
                            <span className="font-semibold text-emerald-600">
                              {s.shuttlecockCount} quả
                            </span>
                          </div>
                        </div>

                        {/* Quick action buttons on hover */}
                        <div className="mt-1 flex items-center justify-end gap-1 border-t border-slate-100 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSession(s);
                            }}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Chỉnh sửa buổi này"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(s);
                            }}
                            className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Xóa buổi đánh này"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty day prompt on hover */}
                  {!hasSessions && cell.isCurrentMonth && (
                    <div
                      onClick={() => onAddSessionOnDate(cell.dateStr)}
                      className="hidden group-hover:flex h-full min-h-[40px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-1 text-[10px] font-medium text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all text-center"
                    >
                      <span>+ Đánh sân</span>
                    </div>
                  )}
                </div>

                {/* Day status indicator */}
                <div className="text-[9px] text-slate-400 flex items-center justify-between pt-0.5">
                  {hasSessions ? (
                    <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5" />
                      {cell.sessions.length} buổi
                    </span>
                  ) : (
                    cell.isCurrentMonth && <span className="text-slate-300">Nghỉ</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {sessionToDelete && (
        <ConfirmDialog
          isOpen={true}
          type="danger"
          title="Xóa Buổi Đánh Cầu?"
          message={
            <span>
              Bạn có chắc chắn muốn xóa buổi đánh ngày{' '}
              <strong className="text-slate-900">
                {sessionToDelete.date.split('-').slice(1).reverse().join('/')}
              </strong>{' '}
              tại <strong className="text-slate-900">{sessionToDelete.courtName}</strong>?
            </span>
          }
          details={[
            `Tổng chi phí buổi: ${formatVND(
              (sessionToDelete.courtFee || 0) +
                (sessionToDelete.shuttlecockCount || 0) * (sessionToDelete.shuttlecockPricePerItem || 25000) +
                (sessionToDelete.drinkFee || 0)
            )}`,
            `Có ${sessionToDelete.attendeeIds?.length || 0} thành viên có mặt`,
            'Bảng chia tiền cuối tháng sẽ được tính toán lại ngay lập tức',
          ]}
          confirmText="Xác nhận xóa"
          cancelText="Hủy"
          onConfirm={() => {
            onDeleteSession(sessionToDelete.id);
            setSessionToDelete(null);
          }}
          onCancel={() => setSessionToDelete(null)}
        />
      )}
    </div>
  );
};
