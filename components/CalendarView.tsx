'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import type { ViewDailySession, ViewMember } from '../lib/view-types';
import { formatVND } from '../lib/money';

interface CalendarViewProps {
  monthKey: string; // '2026-08'
  sessions: ViewDailySession[];
  members: ViewMember[];
  onAddSessionOnDate: (dateStr: string) => void;
  onEditSession: (session: ViewDailySession) => void;
  onDuplicateSession: (session: ViewDailySession) => void;
  /** Whether the viewer has write access. The real gate lives in the Server Action. */
  isAdmin: boolean;
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

/* Two labels per weekday: seven columns on a phone leave about 60px each, and
   "Chủ Nhật" does not fit in that. */
const WEEK_DAYS = [
  { short: 'T2', long: 'Thứ 2' },
  { short: 'T3', long: 'Thứ 3' },
  { short: 'T4', long: 'Thứ 4' },
  { short: 'T5', long: 'Thứ 5' },
  { short: 'T6', long: 'Thứ 6' },
  { short: 'T7', long: 'Thứ 7' },
  { short: 'CN', long: 'Chủ nhật' },
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  monthKey,
  sessions,
  onAddSessionOnDate,
  onEditSession,
  isAdmin,
}) => {
  // The month being viewed comes from the URL — no state, no navigation in here.
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
      {/*
        The month's totals, which the grid itself cannot show. What stood here
        repeated the month name from the navbar and the words "Lịch tháng" from
        the tab, and kept the only real numbers behind `hidden md:flex` — so on
        a phone the strip said nothing at all.
      */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 text-xs text-slate-500">
        <span className="tabular font-mono">
          <strong className="font-bold text-slate-900">{monthSessions.length}</strong> buổi
        </span>
        <span className="tabular font-mono">
          <strong className="font-bold text-slate-900">{totalMonthShuttles}</strong> quả cầu
        </span>
        <span className="tabular font-mono">
          <strong className="font-bold text-slate-900">{formatVND(totalMonthCost)}</strong>
        </span>
        {isAdmin && (
          <span className="ml-auto hidden text-slate-400 sm:inline">
            Nhấn vào ngày để ghi buổi đánh
          </span>
        )}
      </div>

      {/*
        No horizontal scroller. Seven columns have to fit whatever the screen,
        so the cell drops to a day number and a dot per session on a phone and
        only shows court and amount from sm up — the month is for finding a day,
        and the list view is where the detail lives.
      */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div>
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center">
            {WEEK_DAYS.map((w, idx) => (
              <div
                key={w.short}
                className={`py-2 text-[10px] font-bold uppercase tracking-wider sm:text-[11px] ${
                  idx >= 5 ? 'text-rose-700' : 'text-slate-500'
                }`}
              >
                <span className="sm:hidden">{w.short}</span>
                <span className="hidden sm:inline">{w.long}</span>
              </div>
            ))}
          </div>

          {/* Date cells grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {calendarCells.map((cell, idx) => {
              const hasSessions = cell.sessions.length > 0;
              const isToday = cell.dateStr === todayStr;
              // Without write access a day cell is inert: clicking it does nothing,
              // so don't pretend it is clickable.
              // Tapping a day does whatever that day affords: opens the session
              // if there is one — guests included, they get the read-only view —
              // and otherwise offers to record one, which only an admin can do.
              // On a phone the whole cell is the only target big enough to hit.
              const openDay = hasSessions
                ? () => onEditSession(cell.sessions[0])
                : isAdmin && cell.isCurrentMonth
                  ? () => onAddSessionOnDate(cell.dateStr)
                  : undefined;

              return (
                <div
                  key={idx}
                  onClick={openDay}
                  role={openDay ? 'button' : undefined}
                  tabIndex={openDay ? 0 : undefined}
                  onKeyDown={
                    openDay
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDay();
                          }
                        }
                      : undefined
                  }
                  title={
                    hasSessions
                      ? `Xem buổi ngày ${cell.dayNum}/${month + 1}`
                      : openDay
                        ? `Ghi buổi đánh ngày ${cell.dayNum}/${month + 1}`
                        : undefined
                  }
                  className={`group relative flex min-h-[58px] flex-col gap-1 p-1.5 transition-colors sm:min-h-[110px] sm:gap-1.5 sm:p-2 ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50'
                      : hasSessions
                        ? 'bg-indigo-50/40'
                        : 'bg-white'
                  } ${openDay ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`tabular flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : !cell.isCurrentMonth
                            ? 'text-slate-300'
                            : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* The add button needs a hover to be discoverable, which a
                        touch screen has no way to give — the cell itself is the
                        target there. */}
                    {isAdmin && cell.isCurrentMonth && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddSessionOnDate(cell.dateStr);
                        }}
                        className="hidden h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 opacity-0 transition-opacity hover:bg-indigo-600 hover:text-white group-hover:opacity-100 cursor-pointer sm:flex"
                        title={`Ghi buổi đánh ngày ${cell.dayNum}/${month + 1}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {hasSessions && (
                    <>
                      {/* Phone: one dot per session, centred under the number. */}
                      <div className="flex flex-1 items-center justify-center gap-1 sm:hidden">
                        {cell.sessions.map((s) => (
                          <span key={s.id} className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                        ))}
                      </div>

                      <div className="hidden flex-1 space-y-1 sm:block">
                        {cell.sessions.map((s) => (
                          <div
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSession(s);
                            }}
                            className="cursor-pointer rounded-lg border border-indigo-200 bg-white p-1.5 transition-colors hover:border-indigo-400"
                          >
                            <p className="truncate text-[11px] font-bold text-slate-900">
                              {s.courtName.replace('Sân ', '')}
                            </p>
                            <p className="tabular truncate font-mono text-[10px] text-slate-500">
                              {formatVND(sessionTotal(s))}
                            </p>
                            <p className="tabular truncate font-mono text-[10px] text-slate-400">
                              {s.attendeeIds.length} người · {s.shuttlecockCount} quả
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
