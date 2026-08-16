'use client';

import React, { useState, useTransition } from 'react';
import {
  ArrowRight,
  QrCode,
  CheckCircle2,
  Circle,
  Share2,
  Sparkles,
  DollarSign,
  Users,
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toggleTransferSettled } from '../app/actions/settlement';
import { formatVND } from '../lib/money';
import { NGUONG_BO_QUA } from '../lib/settlement/calculate';
import type { ViewMonth, ViewSettlement, ViewTransfer } from '../lib/view-types';
import { MySettlement } from './MySettlement';
import { ZaloReportModal } from './ZaloReportModal';

interface SettlementViewProps {
  monthKey: string;
  month: ViewMonth;
  /** Thành viên đang dùng máy này, đọc từ cookie ở server. */
  meId: string | null;
  /** Đã được tính trọn vẹn ở server — component này chỉ hiển thị. */
  settlement: ViewSettlement;
  sessionCount: number;
  /** Signed URL ảnh QR theo memberId, có thể null nếu thành viên chưa tải lên. */
  qrUrls: Record<string, string | null>;
  /** Văn bản báo cáo Zalo dựng sẵn ở server. */
  report: string;
  /** Người xem có quyền ghi hay không. Chốt chặn thật nằm ở Server Action. */
  isAdmin: boolean;
}

const transferKey = (t: ViewTransfer) => `${t.fromMemberId}::${t.toMemberId}`;

export const SettlementView: React.FC<SettlementViewProps> = ({
  monthKey,
  month,
  meId,
  settlement,
  sessionCount,
  qrUrls,
  report,
  isAdmin,
}) => {
  const [showReport, setShowReport] = useState(false);
  const [openQrKey, setOpenQrKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { rows, transfers, totalCost, totalCourtCost, totalShuttleCost } = settlement;

  const completedTransfersCount = transfers.filter((t) => t.isSettled).length;
  const isAllSettled = transfers.length > 0 && completedTransfersCount === transfers.length;

  const handleToggleSettled = (t: ViewTransfer) => {
    const key = transferKey(t);
    const willComplete = !t.isSettled && completedTransfersCount + 1 === transfers.length;

    setPendingKey(key);
    startTransition(async () => {
      try {
        await toggleTransferSettled(monthKey, t.fromMemberId, t.toMemberId);
        if (willComplete) {
          try {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          } catch {
            // Không có canvas thì bỏ qua hiệu ứng.
          }
        }
      } finally {
        setPendingKey(null);
      }
    });
  };

  return (
    <div id="settlement-view-container" className="space-y-8">
      {/*
        Việc của người đang cầm máy, đặt trên cùng. Bảng của cả nhóm nằm bên
        dưới cho ai muốn đối chiếu — nhưng phần lớn người vào đây chỉ cần biết
        mình phải chuyển cho ai.
      */}
      <MySettlement
        monthKey={monthKey}
        initialMeId={meId}
        rows={rows}
        transfers={transfers}
        qrUrls={qrUrls}
        isAdmin={isAdmin}
      />

      {/* Tổng quan các con số của tháng */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tổng Chi Phí Tháng</span>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-indigo-600">
            {formatVND(totalCost)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{sessionCount} buổi đánh trong kỳ</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tiền Sân Thực Tế</span>
            <Users className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-slate-900">
            {formatVND(totalCourtCost)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Chia theo số người đi từng buổi</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tiền Cầu Đã Dùng</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-600">
            {formatVND(totalShuttleCost)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Tính đúng số quả từng ngày</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tiến Độ Chuyển Tiền</span>
            <CheckCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-slate-900">
            {transfers.length === 0 ? 'Hoàn tất' : `${completedTransfersCount}/${transfers.length} GD`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isAllSettled ? 'Tất cả các giao dịch đã hoàn tất!' : 'Giao dịch chuyển khoản trực tiếp'}
          </p>
        </div>
      </div>

      {/*
        Bảng đối soát — bản trình bày DUY NHẤT của số liệu từng người.
        Bản cũ còn thêm thẻ "Quyết Toán Cuối Tháng" nền tối lặp lại đúng các số
        này, khiến trên điện thoại phải cuộn hết danh sách hai lần.
      */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Bảng Đối Soát Theo Điểm Danh
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {month.title} — tính chính xác theo các ngày có mặt + tiền sân &amp; quả cầu thực tế
            </p>
          </div>

          {/* Một lối duy nhất tới báo cáo Zalo: xem trước rồi sao chép trong modal. */}
          <button
            type="button"
            id="open-zalo-report-btn"
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Báo Cáo Nhóm</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Thành viên</th>
                <th className="px-3 py-3.5 text-center">Có mặt</th>
                <th className="px-4 py-3.5 text-right">Đã chi (1)</th>
                <th className="px-4 py-3.5 text-right">Phải chịu (2)</th>
                <th className="px-6 py-3.5 text-right">Thực tế (1-2)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => {
                const isCreditor = r.netBalance > NGUONG_BO_QUA;
                const isDebtor = r.netBalance < -NGUONG_BO_QUA;

                return (
                  <tr
                    key={r.memberId}
                    id={`settlement-row-${r.memberId}`}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {r.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-xs font-bold text-indigo-700">
                      {sessionCount > 0 ? `${r.sessionsAttendedCount}/${sessionCount}` : '—'}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600">
                      {formatVND(r.totalPaid)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600">
                      {formatVND(r.totalShare)}
                    </td>

                    <td className="px-6 py-3.5 text-right font-mono text-xs">
                      {isCreditor ? (
                        <span className="font-bold text-emerald-600">
                          +{formatVND(r.netBalance)}
                        </span>
                      ) : isDebtor ? (
                        <span className="font-bold text-rose-600">
                          -{formatVND(Math.abs(r.netBalance))}
                        </span>
                      ) : (
                        <span className="text-slate-400">0 đ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-6 py-3 text-center text-[11px] italic text-slate-400">
          * Tiền thừa/thiếu được tính chuẩn dựa trên các buổi có mặt thực tế
        </div>
      </div>

      {/* Sơ đồ chuyển khoản tối ưu */}
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
                        <span className="font-mono text-lg font-black text-slate-900">
                          {formatVND(t.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Mã QR của người nhận: ai trong nhóm cũng xem được, không cần hỏi riêng. */}
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
                            Quét để chuyển {formatVND(t.amount)} cho {t.toMemberName}
                          </p>
                        </>
                      ) : (
                        <p className="text-center text-[11px] font-medium text-amber-700">
                          Chưa có mã QR — nhắc {t.toMemberName} tải lên trong tab Thành viên
                        </p>
                      )}
                    </div>
                  )}

                  {/* Đánh dấu đã chuyển khoản — khóa theo cặp người, không theo số tiền. */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    {isAdmin ? (
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
                              ? 'Đã thanh toán'
                              : 'Đánh dấu đã chuyển'}
                        </span>
                      </button>
                    ) : (
                      /* Không đủ quyền: vẫn thấy tình trạng, chỉ không đổi được. */
                      <span className="flex items-center gap-2 text-xs font-medium">
                        {t.isSettled ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-300" />
                        )}
                        <span
                          className={
                            t.isSettled ? 'text-emerald-700 line-through' : 'text-slate-500'
                          }
                        >
                          {t.isSettled ? 'Đã thanh toán' : 'Chưa chuyển'}
                        </span>
                      </span>
                    )}
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
