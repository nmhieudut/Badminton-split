'use client';

import React from 'react';
import { Edit2, Eye, Phone, QrCode, Trash2, TriangleAlert } from 'lucide-react';
import { getMemberColor } from '../../lib/categories';
import { formatVND } from '../../lib/money';
import type { ViewMemberWithQr, ViewSettlementRow } from './types';

interface MemberCardProps {
  member: ViewMemberWithQr;
  index: number;
  row: ViewSettlementRow | undefined;
  sessionCount: number;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onPreviewQr: () => void;
  /** Whether the viewer has write access. The real gate lives in the Server Action. */
  isAdmin: boolean;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  index,
  row,
  sessionCount,
  busy,
  onEdit,
  onRemove,
  onPreviewQr,
  isAdmin,
}) => {
  const attendedCount = row?.sessionsAttendedCount ?? 0;
  const netBalance = row?.netBalance ?? 0;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-indigo-300 transition-all">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${getMemberColor(
                index
              )}`}
            >
              {member.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-slate-900 text-sm">{member.name}</h4>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    member.isPermanent
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {member.isPermanent ? 'Cố định' : 'Vãng lai'}
                </span>
              </div>

              {member.phone && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {member.phone}
                </span>
              )}
            </div>
          </div>

          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shrink-0">
            {attendedCount}
            {sessionCount > 0 ? `/${sessionCount}` : ''} buổi
          </span>
        </div>

        {/* This period's figures — taken as-is from the server settlement table */}
        {row && (
          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-center">
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Đã chi
              </span>
              <span className="block text-[11px] font-bold text-slate-800 mt-0.5">
                {formatVND(row.totalPaid)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Phải chịu
              </span>
              <span className="block text-[11px] font-bold text-slate-800 mt-0.5">
                {formatVND(row.totalShare)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Chênh lệch
              </span>
              <span
                className={`block text-[11px] font-bold mt-0.5 ${
                  netBalance > 0
                    ? 'text-emerald-600'
                    : netBalance < 0
                      ? 'text-rose-600'
                      : 'text-slate-500'
                }`}
              >
                {netBalance > 0 ? '+' : ''}
                {formatVND(netBalance)}
              </span>
            </div>
          </div>
        )}

        {/* QR status — the only way to receive money in the app */}
        <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
          {member.qrUrl ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onPreviewQr}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
              >
                <QrCode className="h-3 w-3 text-emerald-600" />
                <span>Xem mã QR</span>
                <Eye className="h-3 w-3 text-emerald-500" />
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Đổi QR
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-px" />
                <span>
                  Chưa có ảnh QR — cả nhóm <strong>không chuyển tiền được</strong> cho{' '}
                  {member.name} qua app.
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  + Tải ảnh QR lên
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit2 className="h-3 w-3" />
            Sửa
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gỡ khỏi kỳ này"
          >
            <Trash2 className="h-3 w-3" />
            Gỡ khỏi kỳ này
          </button>
        </div>
      )}
    </div>
  );
};
