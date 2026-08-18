'use client';

import React, { useEffect, useState } from 'react';
import { formatVND } from '../lib/money';
import type { ViewDailySession, ViewMember } from '../lib/view-types';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

/**
 * Read-only detail view of a single session.
 *
 * Signed-out visitors still need to see what a session consists of — they just
 * cannot edit it. Previously, tapping a session opened the edit form, so hiding
 * that form from guests also took away their only way to view the details.
 */
export function SessionDetailModal({
  session,
  members,
  onClose,
}: {
  session: ViewDailySession;
  members: ViewMember[];
  onClose: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!isMounted) return null;

  const nameOf = (id: string | null) =>
    id ? (members.find((m) => m.id === id)?.name ?? '—') : '—';

  const shuttleCost =
    session.shuttlecockTotalFee ??
    session.shuttlecockCount * session.shuttlecockPricePerItem;
  const sessionTotal = session.courtFee + shuttleCost + session.drinkFee + session.otherFee;

  const attendees = session.attendeeIds
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];

  const perPerson = attendees.length > 0 ? Math.round(sessionTotal / attendees.length) : 0;

  const row = (label: string, value: React.ReactNode, hint?: string) => (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-xs text-slate-500">
        {label}
        {hint && <span className="ml-1 text-slate-400">· {hint}</span>}
      </span>
      <span className="shrink-0 font-mono text-sm font-bold text-slate-900">{value}</span>
    </div>
  );

  const [year, month, day] = session.date.split('-');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Buổi ngày {day}/{month}/{year}
          </DialogTitle>
          <DialogDescription>{session.courtName}</DialogDescription>
        </DialogHeader>

        <DialogBody className="py-2">
          <div className="divide-y divide-slate-100">
            {row('Tiền sân', formatVND(session.courtFee), `${nameOf(session.courtPayerId)} ứng`)}
            {row(
              'Tiền cầu',
              formatVND(shuttleCost),
              session.shuttlecockTotalFee !== null
                ? 'nhập thẳng tổng'
                : `${session.shuttlecockCount} quả × ${formatVND(session.shuttlecockPricePerItem)}`
            )}
            {session.drinkFee > 0 &&
              row('Nước uống', formatVND(session.drinkFee), `${nameOf(session.drinkPayerId)} ứng`)}
            {session.otherFee > 0 &&
              row('Phí khác', formatVND(session.otherFee), `${nameOf(session.otherFeePayerId)} ứng`)}
          </div>

          <div className="my-3 rounded-xl bg-slate-900 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-slate-400">Tổng buổi</span>
              <span className="font-mono text-lg font-black text-white">
                {formatVND(sessionTotal)}
              </span>
            </div>
            {attendees.length > 0 && (
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Chia {attendees.length} người</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {formatVND(perPerson)}/người
                </span>
              </div>
            )}
          </div>

          <div className="pb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Có mặt ({attendees.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {attendees.length === 0 ? (
                <span className="text-xs text-slate-400">Buổi này không ghi điểm danh</span>
              ) : (
                attendees.map((name) => (
                  <span
                    key={name}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700"
                  >
                    {name}
                  </span>
                ))
              )}
            </div>
          </div>

          {session.note && (
            <p className="border-t border-slate-100 py-3 text-xs italic text-slate-500">
              {session.note}
            </p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
