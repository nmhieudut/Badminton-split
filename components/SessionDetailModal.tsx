'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatVND } from '../lib/money';
import type { ViewDailySession, ViewMember } from '../lib/view-types';

/**
 * Xem chi tiết một buổi đánh, chỉ đọc.
 *
 * Người chưa đăng nhập vẫn cần xem được buổi đánh gồm những gì — họ chỉ không
 * sửa được. Trước đây bấm vào buổi là mở form sửa, nên khi ẩn form đi thì khách
 * mất luôn đường xem chi tiết.
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
  const [daGanVaoDom, setDaGanVaoDom] = useState(false);

  useEffect(() => setDaGanVaoDom(true), []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!daGanVaoDom) return null;

  const tenCua = (id: string | null) =>
    id ? (members.find((m) => m.id === id)?.name ?? '—') : '—';

  const tienCau =
    session.shuttlecockTotalFee ??
    session.shuttlecockCount * session.shuttlecockPricePerItem;
  const tongBuoi = session.courtFee + tienCau + session.drinkFee + session.otherFee;

  const coMat = session.attendeeIds
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];

  const moiNguoi = coMat.length > 0 ? Math.round(tongBuoi / coMat.length) : 0;

  const dong = (nhan: string, gia: React.ReactNode, phu?: string) => (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-xs text-slate-500">
        {nhan}
        {phu && <span className="ml-1 text-slate-400">· {phu}</span>}
      </span>
      <span className="shrink-0 font-mono text-sm font-bold text-slate-900">{gia}</span>
    </div>
  );

  const [nam, thang, ngay] = session.date.split('-');

  const noiDung = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-detail-title"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 id="session-detail-title" className="text-base font-bold text-slate-900">
              Buổi ngày {ngay}/{thang}/{nam}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{session.courtName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          <div className="divide-y divide-slate-100">
            {dong('Tiền sân', formatVND(session.courtFee), `${tenCua(session.courtPayerId)} ứng`)}
            {dong(
              'Tiền cầu',
              formatVND(tienCau),
              session.shuttlecockTotalFee !== null
                ? 'nhập thẳng tổng'
                : `${session.shuttlecockCount} quả × ${formatVND(session.shuttlecockPricePerItem)}`
            )}
            {session.drinkFee > 0 &&
              dong('Nước uống', formatVND(session.drinkFee), `${tenCua(session.drinkPayerId)} ứng`)}
            {session.otherFee > 0 &&
              dong('Phí khác', formatVND(session.otherFee), `${tenCua(session.otherFeePayerId)} ứng`)}
          </div>

          <div className="my-3 rounded-xl bg-slate-900 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-slate-400">Tổng buổi</span>
              <span className="font-mono text-lg font-black text-white">
                {formatVND(tongBuoi)}
              </span>
            </div>
            {coMat.length > 0 && (
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Chia {coMat.length} người</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {formatVND(moiNguoi)}/người
                </span>
              </div>
            )}
          </div>

          <div className="pb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Có mặt ({coMat.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {coMat.length === 0 ? (
                <span className="text-xs text-slate-400">Buổi này không ghi điểm danh</span>
              ) : (
                coMat.map((ten) => (
                  <span
                    key={ten}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700"
                  >
                    {ten}
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
        </div>
      </div>
    </div>
  );

  return createPortal(noiDung, document.body);
}
