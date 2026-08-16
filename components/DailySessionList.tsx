'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Users,
  Grid,
  List,
  Award,
  CalendarDays,
} from 'lucide-react';
import type { ViewDailySession, ViewMember } from '../lib/view-types';
import { formatVND } from '../lib/money';
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
}

/** Tiền cầu của một buổi: ưu tiên tổng tiền nhập tay, nếu không thì số quả × đơn giá. */
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
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'cards' | 'matrix'>('calendar');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [sessionToDelete, setSessionToDelete] = useState<ViewDailySession | null>(null);

  // Unique courts for filter
  const courts = Array.from(new Set(sessions.map((s) => s.courtName))).filter(Boolean);

  const filteredSessions = sessions.filter((s) => {
    if (selectedCourtFilter === 'all') return true;
    return s.courtName === selectedCourtFilter;
  });

  // Calculate attendance per member
  const memberAttendanceStats = members.map((m) => {
    const attendedSessions = sessions.filter(
      (s) => s.attendeeIds && s.attendeeIds.includes(m.id)
    );
    const attendedCount = attendedSessions.length;
    const totalCostShare = attendedSessions.reduce((acc, s) => {
      const attendees = s.attendeeIds && s.attendeeIds.length > 0 ? s.attendeeIds : members.map((x) => x.id);
      const sCourt = s.courtFee || 0;
      const sShuttle =
        s.shuttlecockTotalFee !== undefined
          ? s.shuttlecockTotalFee
          : (s.shuttlecockCount || 0) * (s.shuttlecockPricePerItem || 25000);
      const sDrink = (s.drinkFee || 0) + (s.otherFee || 0);
      const sTotal = sCourt + sShuttle + sDrink;
      return acc + (attendees.length > 0 ? sTotal / attendees.length : 0);
    }, 0);

    return {
      member: m,
      attendedCount,
      totalCostShare,
      attendanceRate: sessions.length > 0 ? (attendedCount / sessions.length) * 100 : 0,
    };
  });

  // Sort descending by attendance
  memberAttendanceStats.sort((a, b) => b.attendedCount - a.attendedCount);

  return (
    <div className="space-y-6">
      {/* Action Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              id="view-mode-calendar-btn"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Lịch Tháng
            </button>
            <button
              id="view-mode-cards-btn"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Danh Sách ({sessions.length})
            </button>
            <button
              id="view-mode-matrix-btn"
              onClick={() => setViewMode('matrix')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'matrix'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              Ma Trận Điểm Danh
            </button>
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
        </div>

        <button
          id="add-daily-session-btn"
          onClick={() => onAddSession()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Ghi Buổi Đánh Mới
        </button>
      </div>

      {/* Main Content Area */}
      {viewMode === 'calendar' ? (
        <CalendarView
          sessions={sessions}
          members={members}
          monthKey={monthKey}
          onAddSessionOnDate={(dateStr) => onAddSession(dateStr)}
          onEditSession={onEditSession}
          onDeleteSession={(sId) => {
            const target = sessions.find((s) => s.id === sId);
            if (target) setSessionToDelete(target);
          }}
          onDuplicateSession={onDuplicateSession}
          onMonthChange={onMonthChange}
          onOpenYearMonthPicker={onOpenYearMonthPicker}
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
          <button
            onClick={() => onAddSession()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ghi Buổi Đầu Tiên
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredSessions.map((session) => {
            const sShuttle =
              session.shuttlecockTotalFee !== undefined
                ? session.shuttlecockTotalFee
                : (session.shuttlecockCount || 0) * (session.shuttlecockPricePerItem || 25000);
            const sTotal =
              (session.courtFee || 0) + sShuttle + (session.drinkFee || 0) + (session.otherFee || 0);
            const attendees = session.attendeeIds || [];
            const perPerson = attendees.length > 0 ? sTotal / attendees.length : 0;
            const courtPayer = members.find((m) => m.id === session.courtPayerId)?.name || 'Chưa rõ';

            return (
              <div
                key={session.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div>
                  {/* Top Bar: Date + Court + Total */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center rounded-xl bg-indigo-50 px-2.5 py-1 text-indigo-900 border border-indigo-100 font-mono">
                        <span className="text-[10px] font-bold uppercase">
                          {new Date(session.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                        </span>
                        <span className="text-sm font-black">
                          {session.date.split('-').slice(1).reverse().join('/')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{session.courtName}</h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Ứng tiền sân: <strong className="text-slate-700">{courtPayer}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-base font-black text-slate-900">
                        {formatVND(sTotal)}
                      </div>
                      <div className="text-[11px] font-bold text-indigo-600 font-mono">
                        {formatVND(perPerson)} / người
                      </div>
                    </div>
                  </div>

                  {/* Badges Breakdown */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Tiền sân
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {formatVND(session.courtFee)}
                      </span>
                    </div>

                    <div className="rounded-xl bg-emerald-50/60 p-2 border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 block uppercase font-bold">
                        Cầu ({session.shuttlecockCount} quả)
                      </span>
                      <span className="font-mono font-bold text-emerald-800 text-xs">
                        {formatVND(sShuttle)}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Nước / Khác
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {formatVND((session.drinkFee || 0) + (session.otherFee || 0))}
                      </span>
                    </div>
                  </div>

                  {/* Attendees List */}
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="h-3 w-3 text-indigo-600" />
                        Có mặt ({attendees.length} người):
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {members.map((m) => {
                        const isAttended = attendees.includes(m.id);
                        if (!isAttended) return null;
                        return (
                          <span
                            key={m.id}
                            className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-900 border border-indigo-100"
                          >
                            {m.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {session.note && (
                    <p className="mt-2 text-[11px] italic text-slate-400">
                      📝 {session.note}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => onDuplicateSession(session)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Nhân bản buổi này sang ngày tiếp theo"
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
                    <th className="p-3.5 text-right font-bold uppercase tracking-wider bg-slate-800 border-l border-slate-700 min-w-[120px]">
                      Tổng tiền sân & cầu
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
                          const isAttended = s.attendeeIds && s.attendeeIds.includes(m.id);
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

                        <td className="p-3 text-right font-mono font-black text-indigo-700 border-l border-slate-200 bg-indigo-50/20">
                          {formatVND(stat.totalCostShare)}
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
                    {formatVND(stat.totalCostShare)}
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
            `Tổng chi phí buổi: ${formatVND(
              (sessionToDelete.courtFee || 0) +
                (sessionToDelete.shuttlecockCount || 0) * (sessionToDelete.shuttlecockPricePerItem || 25000) +
                (sessionToDelete.drinkFee || 0)
            )}`,
            `Có ${sessionToDelete.attendeeIds?.length || 0} thành viên đã điểm danh trong buổi này`,
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

