'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, QrCode, TriangleAlert, Upload, UserCheck, UserPlus } from 'lucide-react';
import { compressImageFile } from '../../lib/image';
import type { MemberFormValues, ViewMemberWithQr } from './types';

/**
 * Compresses the image in the browser and rewraps it as a File so the Server
 * Action can push it straight to Storage — QR screenshots are usually 2-4MB, and
 * sending the original is very slow.
 */
async function toCompressedFile(file: File): Promise<File> {
  const dataUrl = await compressImageFile(file, 600, 0.85);
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], 'qr.jpg', { type: 'image/jpeg' });
}

interface MemberFormPanelProps {
  /** A value means we are editing; null means adding a new member. */
  editingMember: ViewMemberWithQr | null;
  /** Deletes the QR already on file. Absent when there is nothing to delete. */
  onRemoveQr?: () => void;
  isPending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  /** keepOpen = true: keep the form open after saving to enter the next person. */
  onSubmit: (values: MemberFormValues, keepOpen: boolean) => void;
}

export const MemberFormPanel: React.FC<MemberFormPanelProps> = ({
  editingMember,
  onRemoveQr,
  isPending,
  errorMessage,
  onCancel,
  onSubmit,
}) => {
  const [name, setName] = useState(editingMember?.name ?? '');
  const [phone, setPhone] = useState(editingMember?.phone ?? '');
  const [isPermanent, setIsPermanent] = useState(editingMember?.isPermanent ?? true);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [isProcessingQr, setIsProcessingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const keepOpenRef = useRef(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // A newly picked image is shown via an object URL, which must be revoked to avoid a memory leak.
  useEffect(() => {
    if (!qrFile) {
      setQrPreview(null);
      return;
    }
    const url = URL.createObjectURL(qrFile);
    setQrPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [qrFile]);

  const shownQr = qrPreview ?? editingMember?.qrUrl ?? null;
  const busy = isPending || isProcessingQr;

  const handlePickFile = async (file: File) => {
    setIsProcessingQr(true);
    setQrError(null);
    try {
      setQrFile(await toCompressedFile(file));
    } catch (err) {
      setQrError(err instanceof Error ? err.message : 'Không thể xử lý ảnh QR này');
    } finally {
      setIsProcessingQr(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handlePickFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) void handlePickFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    onSubmit({ name, phone, isPermanent, qrFile }, keepOpenRef.current);
    keepOpenRef.current = false;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 max-w-2xl mx-auto shadow-2xs">
      <h4 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-indigo-600" />
        {editingMember ? 'Chỉnh Sửa Thành Viên' : 'Thêm Thành Viên Mới'}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Tên thành viên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Hoàng Nam"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Số điện thoại / Zalo
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* QR image — the only way to receive money */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-950">
              <QrCode className="h-4 w-4 text-indigo-600" />
              <span>Ảnh Mã QR Chuyển Khoản Cá Nhân</span>
            </div>
            {shownQr && (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Đã có ảnh
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-600">
            Cả nhóm chỉ chuyển tiền cho nhau qua ảnh QR này. Không có ảnh QR thì không ai
            chuyển tiền cho bạn qua app được.
          </p>

          <input
            ref={qrFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {qrError && (
            <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200">
              {qrError}
            </div>
          )}

          {shownQr ? (
            <div className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shownQr}
                alt="QR Preview"
                className="h-20 w-20 rounded-lg object-contain bg-white p-1 border border-slate-200"
              />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 block">
                  {qrFile ? 'Ảnh mới, sẽ lưu khi bấm nút bên dưới' : 'Ảnh mã QR đã lưu'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => qrFileInputRef.current?.click()}
                    disabled={busy}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Đổi ảnh
                  </button>
                  {qrFile ? (
                    <button
                      type="button"
                      onClick={() => setQrFile(null)}
                      disabled={busy}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Bỏ ảnh vừa chọn
                    </button>
                  ) : (
                    /* Deletes the stored image, unlike the button above, which
                       only discards a file picked but not yet saved. */
                    onRemoveQr && (
                      <button
                        type="button"
                        onClick={onRemoveQr}
                        disabled={busy}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Xoá ảnh QR
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleDrop}
              onClick={() => qrFileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-white/80 p-4 text-center hover:border-indigo-400 cursor-pointer transition-all"
            >
              <Upload className="h-4 w-4 text-indigo-600 mb-1" />
              <p className="text-xs font-bold text-slate-800">
                {isProcessingQr ? 'Đang xử lý...' : 'Bấm để tải ảnh mã QR ngân hàng / MoMo'}
              </p>
              <p className="text-[10px] text-slate-400">Hỗ trợ PNG, JPG, WEBP</p>
            </div>
          )}
        </div>

        {/* Permanent member */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <div>
            <span className="font-bold text-xs text-slate-800 block">
              Thành viên cố định hàng tháng
            </span>
            <span className="text-[11px] text-slate-500">
              Tự động mặc định tích đi sân khi tạo buổi đánh mới
            </span>
          </div>
          <input
            type="checkbox"
            checked={isPermanent}
            onChange={(e) => setIsPermanent(e.target.checked)}
            className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {errorMessage && (
          <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-px" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>

          {!editingMember && (
            <button
              type="submit"
              onClick={() => {
                keepOpenRef.current = true;
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Lưu và thêm người nữa
            </button>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-3.5 w-3.5" />
            {isPending
              ? 'Đang lưu...'
              : editingMember
                ? 'Lưu Thay Đổi'
                : 'Thêm Vào Nhóm'}
          </button>
        </div>
      </form>
    </div>
  );
};
