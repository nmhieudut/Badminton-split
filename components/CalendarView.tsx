'use client';

import React from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
} from 'lucide-react';
import type { ViewDailySession, ViewMember } from '../lib/view-types';
import { formatVND } from '../lib/money';

interface CalendarViewProps {
  monthKey: string; // '2026-08'
  sessions: ViewDailySession[];
  members: ViewMember[];
  onAddSessionOnDate: (dateStr: string) => void;
  onEditSession: (session: ViewDailySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDuplicateSession: (session: ViewDailySession) => void;
}

function shuttleTotal(s: ViewDailySession): number {
  return s.shuttlecockTotalFee ?? s.shuttlecockCount * s.shuttlecockPricePerItem;
}

function sessionTotal(s: ViewDailySession): number {
  return s.courtFee + shuttleTotal(s) + s.drinkFee + s.otherFee;
}

function toDateStr(year: number, month0: number, day: number): string {
  const d = new Date(year, month0, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  monthKey,
  sessions,
  onAddSessionOnDate,
  onEditSession,
  onDeleteSession,
}) => {
  // Tháng đang xem nằm trong URL — không có state, không có điều hướng ở đây.
  const [yearRaw, monthRaw] = monthKey.split('-').map(Number);
  const now = new Date();
  const year = Number.isFinite(yearRaw) ? yearRaw : now.getFullYear();
  const month = Number.isFinite(monthRaw) ? monthRaw - 1 : now.getMonth(); // 0-11

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeekRaw = new Date(year, month, 1).getDay();
  // Monday = 0, Tuesday = 1, ..., Sunday = 6
  const startDayOffset = (firstDayOfWeekRaw + 6) % 7;

  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  // Group sessions by date string: 'YYYY-MM-DD'
  const sessionsByDate: Record<string, ViewDailySession[]> = {};
  sessions.forEach((s) => {
    const list = sessionsByDate[s.date];
    if (list) list.push(s);
    else sessionsByDate[s.date] = [s];
  });

  const monthSessions = sessions.filter((s) => s.date.startsWith(monthKey));

  const totalMonthShuttles = monthSessions.reduce((acc, s) => acc + s.shuttlecockCount, 0);
  const totalMonthCost = monthSessions.reduce((acc, s) => acc + sessionTotal(s), 0);

  // Generate calendar grid cells
  const calendarCells: {
    dayNum: number;
    dateStr: string;
    isCurrentMonth: boolean;
    sessions: ViewDailySession[];
  }[] = [];

  // 1. Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const dateStr = toDateStr(year, month - 1, dayNum);
    calendarCells.push({
      dayNum,
      dateStr,
      isCurrentMonth: false,
      sessions: sessionsByDate[dateStr] ?? [],
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dayNum: d,
      dateStr,
      isCurrentMonth: true,
      sessions: sessionsByDate[dateStr] ?? [],
    });
  }

  // 3. Next month leading days to complete grid
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let nextD = 1; nextD <= remainingCells; nextD++) {
    const dateStr = toDateStr(year, month + 1, nextD);
    calendarCells.push({
      dayNum: nextD,
      dateStr,
      isCurrentMonth: false,
      sessions: sessionsByDate[dateStr] ?? [],
    });
  }

  return (
    <div id="calendar-view-container" className="space-y-4">
      {/* Calendar Header (điều hướng tháng do Navbar đảm nhiệm) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">
                Tháng {String(month + 1).padStart(2, '0')} / {year}
              </span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                {monthSessions.length} buổi
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Nhấn ngày bất kỳ để ghi buổi đánh hoặc xem chi tiết
            </p>
          </div>
        </div>

        {/* Quick Month Metrics */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">CẦU DÙNG</span>
              <span className="font-mono font-bold text-slate-800">{totalMonthShuttles} quả</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">TỔNG TIỀN</span>
              <span className="font-mono font-bold text-indigo-600">{formatVND(totalMonthCost)}</span>
            </div>
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
                  // Chạm/bấm vào ô ngày là mở form ghi buổi đánh cho đúng ngày đó.
                  onClick={
                    cell.isCurrentMonth ? () => onAddSessionOnDate(cell.dateStr) : undefined
                  }
                  role={cell.isCurrentMonth ? 'button' : undefined}
                  tabIndex={cell.isCurrentMonth ? 0 : undefined}
                  onKeyDown={
                    cell.isCurrentMonth
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onAddSessionOnDate(cell.dateStr);
                          }
                        }
                      : undefined
                  }
                  title={
                    cell.isCurrentMonth
                      ? `Ghi buổi đánh ngày ${cell.dayNum}/${month + 1}`
                      : undefined
                  }
                  className={`group relative min-h-[105px] sm:min-h-[120px] p-2 transition-all flex flex-col justify-between ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/30 text-slate-300'
                      : hasSessions
                      ? 'bg-indigo-50/15 cursor-pointer'
                      : 'bg-white hover:bg-slate-50/50 cursor-pointer'
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
                        className="opacity-60 group-hover:opacity-100 transition-opacity flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white cursor-pointer"
                        title={`Tạo buổi đánh ngày ${cell.dayNum}/${month + 1}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Sessions in this day */}
                  <div className="my-1 space-y-1 flex-1">
                    {cell.sessions.map((s) => {
                      const sTotal = sessionTotal(s);
                      const attendeesCount = s.attendeeIds.length;

                      return (
                        <div
                          key={s.id}
                          onClick={(e) => e.stopPropagation()}
                          className="group/item relative rounded-xl border border-indigo-200/70 bg-white p-1.5 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all"
                        >
                          <div onClick={() => onEditSession(s)} className="cursor-pointer">
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

                          {/* Quick action buttons */}
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
                                onDeleteSession(s.id);
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

                    {/* Empty day prompt */}
                    {!hasSessions && cell.isCurrentMonth && (
                      <div className="flex h-full min-h-[40px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-1 text-[10px] font-medium text-slate-400 opacity-60 group-hover:opacity-100 group-hover:border-indigo-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all text-center">
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
    </div>
  );
};
