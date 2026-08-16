import React, { useState } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { DebtTransfer, VIETNAM_BANKS } from '../types';
import { formatVND, generateVietQrUrl } from '../utils/settlement';

interface VietQrModalProps {
  transfer: DebtTransfer | null;
  monthKey: string;
  onClose: () => void;
}

export const VietQrModal: React.FC<VietQrModalProps> = ({
  transfer,
  monthKey,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // If receiver has custom uploaded QR image, default to 'custom', otherwise 'vietqr'
  const hasCustomQr = !!transfer?.toMemberQrImage;
  const hasBankAcc = !!transfer?.toMemberBank?.bankAccount;

  const [activeQrType, setActiveQrType] = useState<'custom' | 'vietqr'>(
    hasCustomQr ? 'custom' : 'vietqr'
  );

  if (!transfer) return null;

  const bank = transfer.toMemberBank;
  const bankDetails = VIETNAM_BANKS.find(
    (b) => b.code === bank?.bankName || b.name === bank?.bankName
  );
  const bankCode = bankDetails?.code || bank?.bankName || 'MB';
  const memo = `${transfer.fromMemberName} chuyen tien cau long ${monthKey}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();

  const vietQrUrl = bank?.bankAccount
    ? generateVietQrUrl({
        bankCode,
        accountNumber: bank.bankAccount,
        accountName: bank.bankAccountName || transfer.toMemberName,
        amount: transfer.amount,
        memo,
      })
    : null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      id="vietqr-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="vietqr-modal-card"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">Mã Chuyển Khoản Nhận Tiền</h3>
          </div>
          <button
            id="close-qr-modal-btn"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <span className="text-slate-800 font-bold">{transfer.fromMemberName}</span> gửi cho{' '}
              <span className="text-indigo-600 font-bold">{transfer.toMemberName}</span>
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {formatVND(transfer.amount)}
            </p>
          </div>

          {/* Toggle between Uploaded QR and Auto VietQR if both available */}
          {hasCustomQr && vietQrUrl && (
            <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveQrType('custom')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeQrType === 'custom'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span>Mã QR Đã Tải Lên</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveQrType('vietqr')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeQrType === 'vietqr'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>VietQR Điền Sẵn Tiền</span>
              </button>
            </div>
          )}

          {/* QR Display */}
          {activeQrType === 'custom' && transfer.toMemberQrImage ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <img
                src={transfer.toMemberQrImage}
                alt={`Mã QR của ${transfer.toMemberName}`}
                className="max-h-64 w-full rounded-xl object-contain bg-white p-2 shadow-xs border border-emerald-200"
              />
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Mã QR chính chủ do {transfer.toMemberName} tải lên</span>
              </div>
            </div>
          ) : vietQrUrl ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <img
                src={vietQrUrl}
                alt="VietQR Code"
                className="h-60 w-60 rounded-xl object-contain bg-white p-2 shadow-xs border border-slate-200"
                referrerPolicy="no-referrer"
              />
              <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Mã VietQR tự động điền sẵn số tiền & nội dung</span>
              </div>
            </div>
          ) : transfer.toMemberQrImage ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <img
                src={transfer.toMemberQrImage}
                alt={`Mã QR của ${transfer.toMemberName}`}
                className="max-h-64 w-full rounded-xl object-contain bg-white p-2 shadow-xs border border-emerald-200"
              />
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Mã QR do {transfer.toMemberName} tải lên</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-center text-sm text-amber-900 space-y-2">
              <p className="font-bold">Chưa có ảnh mã QR hoặc thông tin STK!</p>
              <p className="text-xs text-amber-700">
                Hãy vào danh sách thành viên bấm <strong>Sửa</strong> để tải lên ảnh mã QR hoặc nhập Số tài khoản cho{' '}
                <span className="font-bold">{transfer.toMemberName}</span>.
              </p>
            </div>
          )}

          {/* Account Details Copy Table */}
          {bank?.bankAccount && (
            <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Ngân hàng:</span>
                <span className="font-bold text-slate-800">
                  {bankDetails?.name || bank.bankName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Số tài khoản:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {bank.bankAccount}
                  </span>
                  <button
                    id="copy-stk-btn"
                    onClick={() => copyToClipboard(bank.bankAccount!, 'account')}
                    className="inline-flex items-center rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Sao chép STK"
                  >
                    {copiedField === 'account' ? (
                      <Check className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {bank.bankAccountName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Chủ tài khoản:</span>
                  <span className="font-bold uppercase text-slate-800">
                    {bank.bankAccountName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Nội dung CK:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-slate-700">{memo}</span>
                  <button
                    id="copy-memo-btn"
                    onClick={() => copyToClipboard(memo, 'memo')}
                    className="inline-flex items-center rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Sao chép nội dung"
                  >
                    {copiedField === 'memo' ? (
                      <Check className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            id="close-qr-bottom-btn"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
