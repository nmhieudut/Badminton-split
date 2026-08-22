'use client';

import React, { useState, useTransition } from 'react';
import { ArrowRight, Receipt, Trash2, TriangleAlert } from 'lucide-react';
import { deletePayment } from '../app/actions/settlement';
import { formatVND } from '../lib/money';
import type { PaymentRow } from '../lib/view-types';
import { ConfirmDialog } from './ConfirmDialog';

interface PaymentHistoryProps {
  monthKey: string;
  payments: PaymentRow[];
  /** Whether the viewer has write access. The real gate lives in the Server Action. */
  isAdmin: boolean;
}

/**
 * Every transfer recorded in the period.
 *
 * The point of keeping payments as a ledger rather than a paid/not-paid flag is
 * that this screen can exist at all: what was sent, by whom, to whom and when,
 * so a figure on the settlement screen can be traced instead of trusted.
 */
export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  monthKey,
  payments,
  isAdmin,
}) => {
  const [toDelete, setToDelete] = useState<PaymentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = (payment: PaymentRow) => {
    setError(null);
    startTransition(async () => {
      try {
        await deletePayment(monthKey, payment.id);
        setToDelete(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không xoá được. Thử lại giúp.');
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-baseline justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">
              Lịch sử chuyển tiền
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ai đã chuyển cho ai, bao nhiêu, lúc nào
            </p>
          </div>
          <p className="tabular shrink-0 font-mono text-sm font-bold text-slate-900">
            {formatVND(total)}
          </p>
        </header>

        {payments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">Chưa ai chuyển khoản</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
              Khi ai đó đánh dấu đã chuyển ở tab Quyết toán, lần chuyển đó sẽ hiện ở đây.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-bold text-slate-900">{p.fromName}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="font-bold text-slate-900">{p.toName}</span>
                  </p>
                  <p className="tabular mt-0.5 font-mono text-[11px] text-slate-400">
                    {formatDateTime(p.paidAt)}
                  </p>
                </div>

                <p className="tabular shrink-0 font-mono text-sm font-bold text-emerald-700">
                  {formatVND(p.amount)}
                </p>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setToDelete(p)}
                    disabled={isPending}
                    title="Xoá khỏi lịch sử"
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {toDelete && (
        <ConfirmDialog
          isOpen
          type="danger"
          title="Xoá lần chuyển này?"
          message={
            <span>
              Xoá bản ghi <strong className="text-slate-900">{toDelete.fromName}</strong> chuyển{' '}
              <strong className="text-slate-900">{formatVND(toDelete.amount)}</strong> cho{' '}
              <strong className="text-slate-900">{toDelete.toName}</strong>. Số tiền này sẽ quay
              lại thành khoản chưa trả ở tab Quyết toán.
            </span>
          }
          confirmText={isPending ? 'Đang xoá...' : 'Xoá bản ghi'}
          cancelText="Giữ lại"
          onConfirm={() => handleDelete(toDelete)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
};

/**
 * Formatted by hand rather than with toLocaleString: Node and the browser ship
 * different locale data, and the mismatch tears the tree down on hydration.
 */
function formatDateTime(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
