'use client';

import React from 'react';
import { Edit2, QrCode, Trash2 } from 'lucide-react';
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
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${getMemberColor(
            index
          )}`}
        >
          {member.name.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h4 className="truncate text-sm font-bold text-slate-900">{member.name}</h4>
            {!member.isPermanent && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Vãng lai
              </span>
            )}
          </div>

          {/*
            One quiet line instead of three separate pills. The phone number and
            the attendance count were each wrapped in their own box before,
            which is a lot of framing for two short facts.
          */}
          <p className="tabular mt-0.5 truncate font-mono text-[11px] text-slate-400">
            {attendedCount}
            {sessionCount > 0 ? `/${sessionCount}` : ''} buổi
            {member.phone ? ` · ${member.phone}` : ''}
          </p>
        </div>
      </div>

      {/* This period's figures — taken as-is from the server settlement table */}
      {row && (
        <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-slate-500">Đã chi</dt>
            <dd className="tabular font-mono font-semibold text-slate-700">
              {formatVND(row.totalPaid)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-slate-500">Phải chịu</dt>
            <dd className="tabular font-mono font-semibold text-slate-700">
              {formatVND(row.totalShare)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-1">
            <dt className="font-semibold text-slate-700">Chênh lệch</dt>
            <dd
              className={`tabular font-mono font-bold ${
                netBalance > 0
                  ? 'text-emerald-700'
                  : netBalance < 0
                    ? 'text-rose-700'
                    : 'text-slate-400'
              }`}
            >
              {netBalance > 0 ? '+' : ''}
              {formatVND(netBalance)}
            </dd>
          </div>
        </dl>
      )}

      {/*
        QR status as one line of text. The banner at the top of the page already
        counts how many people are missing one, so repeating the full warning on
        every card said the same thing twice.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-xs">
        {member.qrUrl ? (
          <button
            type="button"
            onClick={onPreviewQr}
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 hover:underline cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5" />
            Xem mã QR
          </button>
        ) : (
          <span className="font-semibold text-amber-700">Chưa có ảnh QR</span>
        )}

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer disabled:opacity-50"
            >
              <Edit2 className="h-3 w-3" />
              {member.qrUrl ? 'Sửa' : 'Tải QR lên'}
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              title="Gỡ khỏi kỳ này"
              className="ml-auto inline-flex items-center gap-1 font-semibold text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Gỡ khỏi kỳ
            </button>
          </>
        )}
      </div>
    </div>
  );
};
