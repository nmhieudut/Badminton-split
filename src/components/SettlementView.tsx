import React, { useState } from 'react';
import {
  ArrowRight,
  QrCode,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Share2,
  Sparkles,
  DollarSign,
  Users,
  CreditCard,
  Send,
  AlertCircle,
  CheckCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DebtTransfer, MonthSession, SettlementResult } from '../types';
import { calculateSettlement, formatVND, generateZaloReport, getMemberColor } from '../utils/settlement';
import { VietQrModal } from './VietQrModal';

interface SettlementViewProps {
  session: MonthSession;
  onToggleTransferSettled: (transferId: string) => void;
  onOpenZaloReport: () => void;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  session,
  onToggleTransferSettled,
  onOpenZaloReport,
}) => {
  const [selectedTransferForQr, setSelectedTransferForQr] = useState<DebtTransfer | null>(null);
  const [copiedZalo, setCopiedZalo] = useState(false);

  const dailySessions = session.dailySessions || [];
  const { results, totalExpenses, totalDailyCourtCost, totalDailyShuttleCost, transfers } =
    calculateSettlement(session.members, session.expenses, dailySessions);

  const settledSet = new Set(session.settledTransferIds || []);
  const completedTransfersCount = transfers.filter((t) => settledSet.has(t.id)).length;
  const isAllSettled = transfers.length > 0 && completedTransfersCount === transfers.length;

  const handleQuickCopyZalo = () => {
    const reportText = generateZaloReport(session);
    navigator.clipboard.writeText(reportText);
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  const handleToggleSettled = (transferId: string) => {
    onToggleTransferSettled(transferId);
    if (!settledSet.has(transferId) && completedTransfersCount + 1 === transfers.length) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe fallback
      }
    }
  };

  const avgShare = session.members.length > 0 ? totalExpenses / session.members.length : 0;

  return (
    <div id="settlement-view-container" className="space-y-8">
      {/* Top summary stats matching Clean Minimalism */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tổng Chi Phí Tháng</span>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-indigo-600">
            {formatVND(totalExpenses)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {dailySessions.length} buổi đánh + {session.expenses.length} khoản chi khác
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tiền Sân Thực Tế</span>
            <Users className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-slate-900">
            {formatVND(totalDailyCourtCost)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Chia theo số người đi từng buổi
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tiền Cầu Đã Dùng</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-600">
            {formatVND(totalDailyShuttleCost)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Tính đúng số quả từng ngày
          </p>
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
            {isAllSettled
              ? 'Tất cả các giao dịch đã hoàn tất!'
              : 'Giao dịch chuyển khoản trực tiếp'}
          </p>
        </div>
      </div>

      {/* Grid: Dark Settlement Statement Card & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 cols: Detailed Settlement Table */}
        <div className="lg:col-span-7 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                  Bảng Đối Soát Theo Điểm Danh
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tính chính xác theo các ngày có mặt + tiền sân & quả cầu thực tế
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  id="copy-zalo-report-btn"
                  onClick={handleQuickCopyZalo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                >
                  {copiedZalo ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Đã copy!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Zalo</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onOpenZaloReport}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Báo Cáo Nhóm</span>
                </button>
              </div>
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
                  {results.map((r, idx) => {
                    const roundedNet = Math.round(r.netBalance);
                    const isCreditor = roundedNet > 100;
                    const isDebtor = roundedNet < -100;

                    return (
                      <tr
                        key={r.memberId}
                        id={`settlement-row-${r.memberId}`}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                              {r.member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 text-xs sm:text-sm">{r.member.name}</span>
                                {r.member.isPermanent === false && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] text-slate-500 font-medium">
                                    Vãng lai
                                  </span>
                                )}
                              </div>
                              {r.member.bankAccount && (
                                <span className="text-[10px] text-slate-400">
                                  {r.member.bankName} - {r.member.bankAccount}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono text-xs font-bold text-indigo-700">
                          {dailySessions.length > 0
                            ? `${r.sessionsAttendedCount || 0}/${dailySessions.length}`
                            : '—'}
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
                              +{formatVND(roundedNet)}
                            </span>
                          ) : isDebtor ? (
                            <span className="font-bold text-rose-600">
                              -{formatVND(Math.abs(roundedNet))}
                            </span>
                          ) : (
                            <span className="text-slate-400">0₫</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Dark Statement Card (Clean Minimalism Aesthetic) */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl shadow-xl p-6 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Quyết Toán Cuối Tháng
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {session.members.length} người
              </span>
            </div>

            <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
              {results.map((r) => {
                const roundedNet = Math.round(r.netBalance);
                const isCreditor = roundedNet > 100;
                const isDebtor = roundedNet < -100;

                return (
                  <div
                    key={`statement-${r.memberId}`}
                    className="flex items-center justify-between pb-3 border-b border-white/10"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-200">{r.member.name}</span>
                        {dailySessions.length > 0 && (
                          <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-mono text-indigo-300">
                            {r.sessionsAttendedCount || 0} buổi
                          </span>
                        )}
                      </div>
                      {r.totalPaid > 0 && (
                        <span className="block text-[10px] text-slate-400">
                          Đã ứng trước {formatVND(r.totalPaid)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {isCreditor ? (
                        <>
                          <span className="block text-[10px] text-emerald-400 font-bold uppercase">
                            NHẬN LẠI
                          </span>
                          <span className="text-base font-bold font-mono text-emerald-300">
                            +{formatVND(roundedNet)}
                          </span>
                        </>
                      ) : isDebtor ? (
                        <>
                          <span className="block text-[10px] text-amber-400 font-bold uppercase">
                            PHẢI TRẢ
                          </span>
                          <span className="text-base font-bold font-mono text-amber-300">
                            {formatVND(Math.abs(roundedNet))}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-mono text-slate-400">Đã đủ (0₫)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 text-center italic text-xs text-white/40">
            * Tiền thừa/thiếu được tính chuẩn dựa trên các buổi có mặt thực tế
          </div>
        </div>
      </div>

      {/* Sơ Đồ Chuyển Khoản Tối Ưu (Debt Settlement Flow) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
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
            {transfers.map((t, idx) => {
              const isSettled = settledSet.has(t.id);
              const toMember = session.members.find((m) => m.id === t.toMemberId);

              return (
                <div
                  key={t.id}
                  id={`transfer-card-${t.id}`}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isSettled
                      ? 'border-slate-100 bg-slate-50/50 opacity-60'
                      : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Transfer Direction Flow */}
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

                      {toMember?.bankAccount && (
                        <div className="text-[11px] text-slate-400 font-medium">
                          STK: <span className="font-mono text-slate-600">{toMember.bankAccount}</span> ({toMember.bankName})
                        </div>
                      )}
                    </div>

                    {/* Action: View QR code button */}
                    <button
                      id={`open-qr-btn-${idx}`}
                      onClick={() => setSelectedTransferForQr(t)}
                      className={`inline-flex items-center gap-1 rounded-xl border p-2 text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
                        toMember?.qrCodeImage
                          ? 'border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                      title={
                        toMember?.qrCodeImage
                          ? 'Mở mã QR cá nhân của thành viên'
                          : 'Mở mã QR VietQR quét tự động'
                      }
                    >
                      <QrCode
                        className={`h-4 w-4 ${
                          toMember?.qrCodeImage ? 'text-emerald-600' : 'text-indigo-600'
                        }`}
                      />
                      <span className="text-[10px] font-bold">
                        {toMember?.qrCodeImage ? 'Ảnh QR' : 'Mã QR'}
                      </span>
                    </button>
                  </div>

                  {/* Settled checkbox toggle */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <button
                      id={`toggle-settled-${t.id}`}
                      onClick={() => handleToggleSettled(t.id)}
                      className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                    >
                      {isSettled ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                      )}
                      <span className={isSettled ? 'text-emerald-700 line-through' : 'text-slate-500'}>
                        {isSettled ? 'Đã thanh toán' : 'Đánh dấu đã chuyển'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VietQR Modal */}
      {selectedTransferForQr && (
        <VietQrModal
          transfer={selectedTransferForQr}
          monthKey={session.monthKey}
          onClose={() => setSelectedTransferForQr(null)}
        />
      )}
    </div>
  );
};
