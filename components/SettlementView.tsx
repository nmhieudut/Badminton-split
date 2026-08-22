'use client';

import React, { useState, useTransition } from 'react';
import {
  ArrowRight,
  QrCode,
  CheckCircle2,
  Circle,
  Share2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { recordPayment, undoLastPayment } from '../app/actions/settlement';
import { formatVND } from '../lib/money';
import { ROUNDING_THRESHOLD } from '../lib/settlement/calculate';
import type { ViewSettlement, ViewTransfer } from '../lib/view-types';
import { MySettlement } from './MySettlement';
import { QrSaveButton } from './QrSaveButton';
import { ZaloReportModal } from './ZaloReportModal';

interface SettlementViewProps {
  monthKey: string;
  /** The member using this device, read from the cookie on the server. */
  meId: string | null;
  /** Fully computed on the server — this component only renders it. */
  settlement: ViewSettlement;
  sessionCount: number;
  /** Signed QR image URL keyed by memberId; may be null if the member has not uploaded one. */
  qrUrls: Record<string, string | null>;
  /** Zalo report text, pre-built on the server. */
  report: string;
  /** Whether the viewer has write access. The real gate lives in the Server Action. */
}

const transferKey = (t: ViewTransfer) => `${t.fromMemberId}::${t.toMemberId}`;

export const SettlementView: React.FC<SettlementViewProps> = ({
  monthKey,
  meId,
  settlement,
  sessionCount,
  qrUrls,
  report,
}) => {
  const [showReport, setShowReport] = useState(false);
  const [openQrKey, setOpenQrKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { rows, transfers, totalCost, totalCourtCost, totalShuttleCost } = settlement;

  const completedTransfersCount = transfers.filter((t) => t.isSettled).length;
  const maxAbsBalance = rows.reduce((max, r) => Math.max(max, Math.abs(r.netBalance)), 0);
  const isAllSettled = transfers.length > 0 && completedTransfersCount === transfers.length;

  const handleToggleSettled = (t: ViewTransfer) => {
    const key = transferKey(t);
    const willComplete = !t.isSettled && completedTransfersCount + 1 === transfers.length;

    setPendingKey(key);
    setError(null);
    startTransition(async () => {
      try {
        // Ticking records what is still outstanding, so a debt that grew after
        // an earlier payment adds a second entry rather than overwriting it.
        if (t.isSettled) {
          await undoLastPayment(monthKey, t.fromMemberId, t.toMemberId);
        } else {
          await recordPayment(monthKey, t.fromMemberId, t.toMemberId, t.remaining);
        }
        if (willComplete) {
          try {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          } catch {
            // No canvas available, so skip the effect.
          }
        }
      } catch (e) {
        // Without this branch the error vanishes silently: the user taps,
        // nothing happens, and they have no idea why.
        setError(e instanceof Error ? e.message : 'Không lưu được. Thử lại giúp.');
      } finally {
        setPendingKey(null);
      }
    });
  };

  return (
    <div id="settlement-view-container" className="space-y-8">
      {/*
        For a group this size each person's balance IS the summary, so it leads.
        The month totals sit underneath as supporting detail; they used to be
        four cards above the fold, which pushed the actual answer off a phone
        screen. The table this replaces had five columns and scrolled sideways.
      */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">
              Ai đang dư, ai đang thiếu
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tính theo đúng những buổi từng người có mặt
            </p>
          </div>

          <button
            type="button"
            id="open-zalo-report-btn"
            onClick={() => setShowReport(true)}
            aria-label="Báo cáo nhóm"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer sm:px-3"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Báo cáo nhóm</span>
          </button>
        </header>

        {error && (
          <p className="border-b border-slate-200 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex-1 text-right">← phải chuyển đi</span>
          <span className="h-3 w-px bg-slate-300" />
          <span className="flex-1">sẽ nhận về →</span>
        </div>

        <ol className="divide-y divide-slate-100">
          {rows.map((r) => {
            const isCreditor = r.netBalance > ROUNDING_THRESHOLD;
            const isDebtor = r.netBalance < -ROUNDING_THRESHOLD;
            // Bars are scaled against the biggest balance in the period, so the
            // longest one always reaches the edge and the rest read relative to it.
            const pct = maxAbsBalance > 0 ? (Math.abs(r.netBalance) / maxAbsBalance) * 50 : 0;

            return (
              <li key={r.memberId} id={`settlement-row-${r.memberId}`} className="px-5 py-3.5">
                <div className="flex items-baseline gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{r.name}</p>
                    <p className="tabular mt-0.5 truncate font-mono text-[11px] text-slate-400">
                      {sessionCount > 0 ? `${r.sessionsAttendedCount}/${sessionCount} buổi` : '—'}
                      {' · đã chi '}
                      {formatVND(r.totalPaid)}
                    </p>
                  </div>

                  <p
                    className={`tabular shrink-0 font-mono text-sm font-bold ${
                      isCreditor
                        ? 'text-emerald-700'
                        : isDebtor
                          ? 'text-rose-700'
                          : 'text-slate-400'
                    }`}
                  >
                    {isCreditor ? '+' : isDebtor ? '−' : ''}
                    {formatVND(Math.abs(r.netBalance))}
                  </p>
                </div>

                {/* Bars grow from the zero rule towards the side that owes or
                    is owed. Decorative only — the amount above already states
                    it, so screen readers skip this. */}
                <div className="relative mt-2 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="absolute inset-y-[-3px] left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-slate-300" />
                  {pct > 0 && (
                    <div
                      className={`absolute top-0 h-full rounded-full ${
                        isCreditor ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                      style={
                        isCreditor
                          ? { left: '50%', width: `${pct}%` }
                          : { right: '50%', width: `${pct}%` }
                      }
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Month totals — detail, not headline. */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
        {[
          { label: 'Tổng chi phí', value: formatVND(totalCost), sub: `${sessionCount} buổi đánh` },
          { label: 'Tiền sân', value: formatVND(totalCourtCost), sub: 'Chia theo số người mỗi buổi' },
          { label: 'Tiền cầu', value: formatVND(totalShuttleCost), sub: 'Theo số quả thực dùng' },
          {
            label: 'Đã chuyển',
            value:
              transfers.length === 0 ? '—' : `${completedTransfersCount}/${transfers.length}`,
            sub: isAllSettled ? 'Xong hết rồi' : 'Giao dịch đã đánh dấu',
          },
        ].map((cell) => (
          <div key={cell.label} className="bg-white px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {cell.label}
            </p>
            <p className="tabular mt-1 font-mono text-lg font-bold text-slate-900">{cell.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{cell.sub}</p>
          </div>
        ))}
      </section>

      {/*
        What the person holding the device has to do, placed right above the
        transfer instructions — that is where it belongs. This block used to sit
        at the very top, so anyone who had not picked their name was asked
        "Who are you?" before seeing a single number.
      */}
      <MySettlement
        monthKey={monthKey}
        initialMeId={meId}
        rows={rows}
        transfers={transfers}
        qrUrls={qrUrls}
      />

      {/* Optimized transfer plan */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Hướng Dẫn Chuyển Tiền Trực Tiếp
            </h3>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              Tối ưu số lần CK
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Chỉ cần thực hiện các giao dịch trực tiếp dưới đây để tất toán mọi khoản chi:
          </p>
        </div>

        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-8 text-center border border-slate-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mb-2" />
            <h4 className="font-bold text-slate-900 text-sm">Không có khoản nợ nào cần chuyển</h4>
            <p className="text-xs text-slate-400 mt-1">
              Mọi thành viên đều đã cân bằng số tiền đã chi và phần phải chịu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {transfers.map((t) => {
              const key = transferKey(t);
              const qrUrl = qrUrls[t.toMemberId] ?? null;
              const isOpen = openQrKey === key;
              const isBusy = isPending && pendingKey === key;

              return (
                <div
                  key={key}
                  id={`transfer-card-${key}`}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    t.isSettled
                      ? 'border-slate-100 bg-slate-50/50 opacity-60'
                      : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 flex-wrap">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-800 font-bold">
                          {t.fromMemberName}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-indigo-700 font-bold">
                          {t.toMemberName}
                        </span>
                      </div>

                      <div className="pt-1">
                        <p className="tabular font-mono text-lg font-bold text-slate-900">
                          {formatVND(t.remaining)}
                        </p>
                        {/* Overpaying is a normal thing to do — people send
                            round numbers — so say so rather than leaving a
                            confusing "đã trả 38.000 / 20.000". */}
                        {t.paidAmount > t.amount ? (
                          <p className="tabular font-mono text-[11px] font-semibold text-emerald-700">
                            đã trả dư {formatVND(t.paidAmount - t.amount)}
                          </p>
                        ) : (
                          t.paidAmount > 0 && (
                            <p className="tabular font-mono text-[11px] text-slate-400">
                              đã trả {formatVND(t.paidAmount)} / {formatVND(t.amount)}
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    {/* The recipient's QR code: anyone in the group can view it, no need to ask them privately. */}
                    <button
                      type="button"
                      id={`toggle-qr-btn-${key}`}
                      onClick={() => setOpenQrKey(isOpen ? null : key)}
                      className={`inline-flex items-center gap-1 rounded-xl border p-2 text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
                        qrUrl
                          ? 'border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                      title={qrUrl ? 'Xem mã QR của người nhận' : 'Người nhận chưa có mã QR'}
                    >
                      {qrUrl ? (
                        <QrCode className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-[10px] font-bold">Mã QR</span>
                      {isOpen ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      {qrUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrUrl}
                            alt={`Mã QR của ${t.toMemberName}`}
                            className="mx-auto h-auto w-full max-w-[220px] rounded-lg bg-white object-contain shadow-2xs"
                          />
                          <p className="mt-2 text-center text-[11px] text-slate-400">
                            Quét để chuyển {formatVND(t.remaining)} cho {t.toMemberName}
                          </p>
                          <div className="mt-2 flex justify-center">
                            <QrSaveButton url={qrUrl} personName={t.toMemberName} />
                          </div>
                        </>
                      ) : (
                        <p className="text-center text-[11px] font-medium text-amber-700">
                          Chưa có mã QR — nhắc {t.toMemberName} tải lên trong tab Thành viên
                        </p>
                      )}
                    </div>
                  )}

                  {/*
                    Where the figure comes from. Every line names an evening the
                    payer was actually at, so the total can be checked against
                    something that happened rather than taken on trust.
                  */}
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2.5 text-[11px]">
                    {t.lines.map((line, i) => (
                      <li
                        key={`${line.date}-${line.label}-${i}`}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <span className="tabular truncate font-mono text-slate-400">
                          {line.date.split('-').slice(1).reverse().join('/')} · {line.label}
                        </span>
                        <span
                          className={`tabular shrink-0 font-mono ${
                            line.amount < 0 ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {line.amount < 0 ? '−' : ''}
                          {formatVND(Math.abs(line.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/*
                    Recording a transfer is open to signed-out guests: whoever
                    just sent the money ticks it themselves, and forcing them to
                    sign in for one button is a bigger barrier than what it
                    protects. Every entry shows on the history screen.
                  */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      id={`toggle-settled-${key}`}
                      onClick={() => handleToggleSettled(t)}
                      disabled={isBusy}
                      className="flex items-center gap-2 text-xs font-medium cursor-pointer disabled:cursor-wait disabled:opacity-50"
                    >
                      {t.isSettled ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                      )}
                      <span
                        className={
                          t.isSettled ? 'text-emerald-700 line-through' : 'text-slate-500'
                        }
                      >
                        {isBusy
                          ? 'Đang lưu...'
                          : t.isSettled
                            ? 'Đã chuyển đủ'
                            : t.paidAmount > 0
                              ? `Đánh dấu đã chuyển nốt ${formatVND(t.remaining)}`
                              : 'Đánh dấu đã chuyển'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showReport && <ZaloReportModal report={report} onClose={() => setShowReport(false)} />}
    </div>
  );
};
