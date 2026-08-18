'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Users,
  Award,
} from 'lucide-react';
import type { ViewDailySession, ViewMember, ViewSettlementRow } from '../lib/view-types';
import { formatVND } from '../lib/money';
import { weekdayVi } from '../lib/weekday';
import { getMemberColor } from '../lib/categories';
import { CalendarView } from './CalendarView';
import { ConfirmDialog } from './ConfirmDialog';

interface DailySessionListProps {
  monthKey: string;
  sessions: ViewDailySession[];
  members: ViewMember[];
  onAddSession: (dateStr?: string) => void;
  onEditSession: (session: ViewDailySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDuplicateSession: (session: ViewDailySession) => void;
  /** Settlement already computed on the server — display only, never recomputed here. */
  settlementRows: ViewSettlementRow[];
  /** Whether the viewer has write access. The real gate lives in the Server Action. */
  isAdmin: boolean;
}

/** Shuttlecock cost of a session: a hand-entered total wins, otherwise count × unit price. */
function shuttleTotal(s: ViewDailySession): number {
  return s.shuttlecockTotalFee ?? s.shuttlecockCount * s.shuttlecockPricePerItem;
}

function sessionTotal(s: ViewDailySession): number {
  return s.courtFee + shuttleTotal(s) + s.drinkFee + s.otherFee;
}

export const DailySessionList: React.FC<DailySessionListProps> = ({
  monthKey,
  sessions,
  members,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onDuplicateSession,
  settlementRows,
  isAdmin,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'cards' | 'matrix'>('cards');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [sessionToDelete, setSessionToDelete] = useState<ViewDailySession | null>(null);

  // Unique courts for filter
  const courts = Array.from(new Set(sessions.map((s) => s.courtName))).filter(Boolean);

  const filteredSessions = sessions.filter((s) => {
    if (selectedCourtFilter === 'all') return true;
    return s.courtName === selectedCourtFilter;
  });

  // Attendance stats. Session counts are computed here because they depend on the
  // filter currently selected; the money is taken as-is from the server settlement
  // and never recomputed.
  const shareByMember = new Map(settlementRows.map((r) => [r.memberId, r.totalShare]));

  const memberAttendanceStats = members.map((m) => {
    const attendedCount = sessions.filter((s) => s.attendeeIds.includes(m.id)).length;
    return {
      member: m,
      attendedCount,
      attendanceRate: sessions.length > 0 ? (attendedCount / sessions.length) * 100 : 0,
      totalShare: shareByMember.get(m.id) ?? 0,
    };
  });

  // Sort descending by attendance
  memberAttendanceStats.sort((a, b) => b.attendedCount - a.attendedCount);

  return (
    <div className="space-y-6">
      {/*
        The view switcher, stripped of the card that used to wrap it. The icons
        went with it: on a phone they pushed every label onto two lines, and a
        grid glyph next to the word "Ma trận" says nothing the word did not.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Cách xem buổi đánh"
          className="inline-flex rounded-xl bg-slate-100 p-0.5"
        >
          {(
            [
              { mode: 'cards', label: `Danh sách (${sessions.length})`, id: 'view-mode-cards-btn' },
              { mode: 'calendar', label: 'Lịch tháng', id: 'view-mode-calendar-btn' },
              { mode: 'matrix', label: 'Ma trận', id: 'view-mode-matrix-btn' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.mode}
              id={tab.id}
              type="button"
              role="tab"
              aria-selected={viewMode === tab.mode}
              onClick={() => setViewMode(tab.mode)}
              className={`whitespace-nowrap rounded-[0.6rem] px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                viewMode === tab.mode
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

          {/* Court Filter for cards */}
          {courts.length > 1 && viewMode === 'cards' && (
            <select
              value={selectedCourtFilter}
              onChange={(e) => setSelectedCourtFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">Tất cả sân ({sessions.length})</option>
              {courts.map((c) => (
                <option key={c} value={c}>
                  {c} ({sessions.filter((s) => s.courtName === c).length})
                </option>
              ))}
            </select>
          )}

        {isAdmin && (
          <button
            id="add-daily-session-btn"
            onClick={() => onAddSession()}
            className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Ghi buổi mới
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'calendar' ? (
        <CalendarView
          monthKey={monthKey}
          sessions={sessions}
          members={members}
          onAddSessionOnDate={(dateStr) => onAddSession(dateStr)}
          onEditSession={onEditSession}
          onDuplicateSession={onDuplicateSession}
          isAdmin={isAdmin}
        />
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-4">
            <Calendar className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có buổi đánh nào trong tháng này</h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500">
            Hãy bắt đầu ghi chép các buổi đánh thực tế (ngày đánh, sân nào, dùng mấy trái cầu và ai có mặt) để cuối tháng chia tiền chuẩn xác nhất!
          </p>
          {isAdmin && (
            <button
              onClick={() => onAddSession()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ghi Buổi Đầu Tiên
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredSessions.map((session) => {
            const sShuttle = shuttleTotal(session);
            const sTotal = sessionTotal(session);
            const attendees = session.attendeeIds;
            const perPerson = attendees.length > 0 ? sTotal / attendees.length : 0;
            const courtPayer = members.find((m) => m.id === session.courtPayerId)?.name || 'Chưa rõ';

            return (
              <div
                key={session.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
              >
                {/*
                  Clicking the card body opens the session. Admins get the edit
                  form, everyone else gets the read-only detail view — that
                  branching is handled by DailySessionsTab. Without this click
                  target guests would only ever see the summary, because the row
                  of buttons below is hidden from them.
                */}
                <div
                  onClick={() => onEditSession(session)}
                  className="cursor-pointer"
                >
                  {/* Date, court and what the evening cost. */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tabular font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {weekdayVi(session.date)} ·{' '}
                        {session.date.split('-').slice(1).reverse().join('/')}
                      </p>
                      <h4 className="mt-0.5 truncate text-sm font-bold text-slate-900">
                        {session.courtName}
                      </h4>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="tabular font-mono text-base font-bold text-slate-900">
                        {formatVND(sTotal)}
                      </p>
                      <p className="tabular font-mono text-[11px] font-bold text-indigo-600">
                        {formatVND(perPerson)}/người
                      </p>
                    </div>
                  </div>

                  {/*
                    One line per cost, naming who fronted it. Who paid is what
                    decides the settlement, so it belongs on the card — the
                    previous version named the court payer and silently omitted
                    whoever bought the shuttles. Lines worth nothing are dropped
                    rather than printed as "0 đ".
                  */}
                  <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                    {[
                      { label: 'Sân', amount: session.courtFee, payerId: session.courtPayerId },
                      {
                        label: `Cầu · ${session.shuttlecockCount} quả`,
                        amount: sShuttle,
                        payerId: session.shuttlecockPayerId,
                      },
                      { label: 'Nước', amount: session.drinkFee, payerId: session.drinkPayerId },
                      { label: 'Khác', amount: session.otherFee, payerId: session.otherFeePayerId },
                    ]
                      .filter((line) => line.amount > 0)
                      .map((line) => (
                        <div key={line.label} className="flex items-baseline justify-between gap-2">
                          <dt className="truncate text-slate-500">
                            {line.label}
                            <span className="text-slate-400">
                              {' · '}
                              {members.find((m) => m.id === line.payerId)?.name ?? 'chưa rõ ai ứng'}
                            </span>
                          </dt>
                          <dd className="tabular shrink-0 font-mono font-semibold text-slate-700">
                            {formatVND(line.amount)}
                          </dd>
                        </div>
                      ))}
                  </dl>

                  {/*
                    Names as a sentence, not as a row of bordered chips: five
                    boxed names inside an already boxed card was most of the
                    visual noise, and the box around a name carried no meaning.
                  */}
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {attendees.length} người:
                    </span>{' '}
                    {members
                      .filter((m) => attendees.includes(m.id))
                      .map((m) => m.name)
                      .join(' · ')}
                  </p>

                  {session.note && (
                    <p className="mt-2 text-[11px] italic text-slate-400">
                      📝 {session.note}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                {isAdmin && (
                  <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => onDuplicateSession(session)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Nhân bản buổi này — mở form để chọn ngày mới"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      Nhân bản
                    </button>
                    <button
                      onClick={() => onEditSession(session)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Sửa
                    </button>
                    <button
                      onClick={() => setSessionToDelete(session)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Matrix Attendance Table View */
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-900 text-white">
                    <th className="p-3.5 font-bold uppercase tracking-wider sticky left-0 bg-slate-900 z-10 min-w-[140px]">
                      Thành Viên
                    </th>
                    {sessions.map((s, idx) => (
                      <th
                        key={s.id}
                        className="p-2.5 text-center font-mono font-bold uppercase border-l border-slate-800 min-w-[70px]"
                      >
                        <div className="text-[10px] text-slate-400 font-normal">
                          B{idx + 1}
                        </div>
                        <div>{s.date.split('-').slice(1).reverse().join('/')}</div>
                        <div className="text-[9px] text-indigo-300 font-normal truncate max-w-[70px]">
                          {s.courtName.replace('Sân ', '')}
                        </div>
                      </th>
                    ))}
                    <th className="p-3.5 text-center font-bold uppercase tracking-wider bg-slate-800 border-l border-slate-700 min-w-[90px]">
                      Số buổi
                    </th>
                    <th className="p-3.5 text-center font-bold uppercase tracking-wider bg-slate-800 border-l border-slate-700 min-w-[110px]">
                      Phải chịu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberAttendanceStats.map((stat, idx) => {
                    const m = stat.member;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 shadow-xs border-r border-slate-100 flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${getMemberColor(
                              idx
                            )}`}
                          >
                            {m.name.charAt(0)}
                          </span>
                          <span className="truncate">{m.name}</span>
                        </td>

                        {sessions.map((s) => {
                          const isAttended = s.attendeeIds.includes(m.id);
                          return (
                            <td
                              key={s.id}
                              className={`p-2.5 text-center border-l border-slate-100 ${
                                isAttended ? 'bg-indigo-50/30' : ''
                              }`}
                            >
                              {isAttended ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-slate-300 font-light">—</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-3 text-center font-mono font-bold text-slate-900 border-l border-slate-200 bg-slate-50/40">
                          {stat.attendedCount} / {sessions.length}
                          <span className="block text-[10px] font-normal text-slate-500">
                            ({Math.round(stat.attendanceRate)}%)
                          </span>
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-indigo-700 border-l border-slate-200 bg-slate-50/40">
                          {formatVND(stat.totalShare)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Member Attendance Leaderboard */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-amber-500" />
              Thống Kê Chuyên Cần Trong Tháng
            </h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {memberAttendanceStats.map((stat, idx) => (
                <div
                  key={stat.member.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">
                        {stat.member.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Đi {stat.attendedCount}/{sessions.length} buổi ({Math.round(stat.attendanceRate)}%)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-indigo-700">
                    {stat.attendedCount} buổi
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deleting a Session */}
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
            `Tổng chi phí buổi: ${formatVND(sessionTotal(sessionToDelete))}`,
            `Có ${sessionToDelete.attendeeIds.length} thành viên đã điểm danh trong buổi này`,
            'Số tiền quyết toán cuối tháng sẽ được tự động tính toán lại',
          ]}
          confirmText="Xác nhận xóa"
          cancelText="Hủy bỏ"
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

