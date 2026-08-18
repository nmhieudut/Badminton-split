'use client';

import React, { useState, useTransition } from 'react';
import { Check, RefreshCw, ScanLine, UserRound } from 'lucide-react';
import { toggleTransferSettled } from '../app/actions/settlement';
import { formatVND } from '../lib/money';
import type { ViewSettlementRow, ViewTransfer } from '../lib/view-types';
import { QrSaveButton } from './QrSaveButton';
import { ME_COOKIE, ME_COOKIE_DAYS } from '../lib/me-cookie';


interface MySettlementProps {
  monthKey: string;
  /** Đọc từ cookie ở server; null nếu chưa chọn hoặc người đó không thuộc kỳ. */
  initialMeId: string | null;
  rows: ViewSettlementRow[];
  transfers: ViewTransfer[];
  /** Signed URL ảnh QR theo memberId; null nếu người đó chưa tải lên. */
  qrUrls: Record<string, string | null>;
  /** Người xem có quyền ghi hay không. Chốt chặn thật nằm ở Server Action. */
}

export const MySettlement: React.FC<MySettlementProps> = ({
  monthKey,
  initialMeId,
  rows,
  transfers,
  qrUrls,
}) => {
  const [meId, setMeId] = useState<string | null>(initialMeId);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const chon = (id: string) => {
    document.cookie = `${ME_COOKIE}=${id};path=/;max-age=${ME_COOKIE_DAYS * 86400};samesite=lax`;
    setMeId(id);
  };

  const doiNguoi = () => {
    document.cookie = `${ME_COOKIE}=;path=/;max-age=0;samesite=lax`;
    setMeId(null);
  };

  const danhDau = (t: ViewTransfer) => {
    const key = `${t.fromMemberId}::${t.toMemberId}`;
    setPendingKey(key);
    setLoi(null);
    startTransition(async () => {
      try {
        await toggleTransferSettled(monthKey, t.fromMemberId, t.toMemberId);
      } catch (e) {
        setLoi(e instanceof Error ? e.message : 'Không lưu được. Thử lại giúp.');
      } finally {
        setPendingKey(null);
      }
    });
  };

  if (!meId) {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
        <div className="flex items-center gap-2 text-indigo-900">
          <UserRound className="h-4 w-4" />
          <h2 className="text-sm font-bold">Bạn là ai?</h2>
        </div>
        <p className="mt-1 text-xs text-indigo-700/80">
          Chọn tên để xem thẳng phần việc của mình. Chỉ cần chọn một lần trên máy này.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {rows.map((r) => (
            <button
              key={r.memberId}
              type="button"
              onClick={() => chon(r.memberId)}
              className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {r.name}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const toi = rows.find((r) => r.memberId === meId);
  if (!toi) return null;

  const toiPhaiTra = transfers.filter((t) => t.fromMemberId === meId);
  const nguoiTraToi = transfers.filter((t) => t.toMemberId === meId);
  const conPhaiTra = toiPhaiTra.filter((t) => !t.isSettled);
  const conChoNhan = nguoiTraToi.filter((t) => !t.isSettled);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loi && (
        <p className="bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700">{loi}</p>
      )}
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {toi.name.charAt(0).toUpperCase()}
          </span>
          <p className="truncate text-sm font-bold text-slate-900">{toi.name}</p>
          <span className="shrink-0 text-xs text-slate-400">
            · đi {toi.sessionsAttendedCount} buổi
          </span>
        </div>
        <button
          type="button"
          onClick={doiNguoi}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <RefreshCw className="h-3 w-3" />
          Đổi người
        </button>
      </header>

      {/* Đang nợ: đây là màn hình thanh toán, QR là việc chính. */}
      {conPhaiTra.length > 0 && (
        <div className="divide-y divide-slate-100">
          {conPhaiTra.map((t) => {
            const key = `${t.fromMemberId}::${t.toMemberId}`;
            const qr = qrUrls[t.toMemberId];
            return (
              <div key={key} className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Bạn cần chuyển
                </p>
                <p className="mt-1 font-mono text-3xl font-black text-indigo-600 sm:text-4xl">
                  {formatVND(t.amount)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  cho <span className="font-bold text-slate-900">{t.toMemberName}</span>
                </p>

                {qr ? (
                  <figure className="mt-4">
                    <img
                      src={qr}
                      alt={`Mã QR nhận tiền của ${t.toMemberName}`}
                      className="h-56 w-56 rounded-xl border border-slate-200 bg-white object-contain p-2"
                    />
                    <figcaption className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <ScanLine className="h-3.5 w-3.5" />
                      Mở app ngân hàng và quét mã này
                    </figcaption>
                    {/* App ngân hàng cho tải ảnh QR lên, nên phải lưu được về máy. */}
                    <div className="mt-2">
                      <QrSaveButton url={qr} tenNguoi={t.toMemberName} />
                    </div>
                  </figure>
                ) : (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    {t.toMemberName} chưa tải mã QR lên. Nhắc {t.toMemberName} thêm mã trong tab
                    Thành viên để bạn quét được.
                  </p>
                )}

                {(
                  <button
                    type="button"
                    onClick={() => danhDau(t)}
                    disabled={pendingKey === key}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto"
                  >
                    <Check className="h-4 w-4" />
                    {pendingKey === key ? 'Đang lưu...' : 'Tôi đã chuyển'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Được nhận tiền: không phải làm gì, chỉ cần biết còn ai chưa trả. */}
      {conChoNhan.length > 0 && (
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Bạn được nhận lại
          </p>
          <p className="mt-1 font-mono text-3xl font-black text-emerald-600 sm:text-4xl">
            {formatVND(conChoNhan.reduce((s, t) => s + t.amount, 0))}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            còn {conChoNhan.length} người chưa chuyển.
 Tích khi tiền đã về tài khoản.
          </p>

          <ul className="mt-4 space-y-2">
            {conChoNhan.map((t) => {
              const key = `${t.fromMemberId}::${t.toMemberId}`;
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                    {t.fromMemberName}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {formatVND(t.amount)}
                    </span>
                    {(
                      <button
                        type="button"
                        onClick={() => danhDau(t)}
                        disabled={pendingKey === key}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        {pendingKey === key ? '...' : 'Đã nhận'}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {conPhaiTra.length === 0 && conChoNhan.length === 0 && (
        <div className="flex items-center gap-3 p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">Bạn xong kỳ này rồi</p>
            <p className="text-xs text-slate-500">
              {toiPhaiTra.length + nguoiTraToi.length > 0
                ? 'Mọi giao dịch của bạn đã được đánh dấu hoàn tất.'
                : 'Bạn không nợ ai và cũng không ai nợ bạn.'}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
