'use client';

import React, { useState, useTransition } from 'react';
import { X, Edit3, Trash2, Check, Calendar, Loader2 } from 'lucide-react';
import type { ViewMonth } from '../lib/view-types';
import { parseVNDInput } from '../lib/money';
import { deleteMonth, updateMonth } from '../app/actions/months';
import { ConfirmDialog } from './ConfirmDialog';
import { laLoiDieuHuong, thongDiepLoi } from '../lib/loi-dieu-huong';

interface EditMonthModalProps {
  month: ViewMonth;
  canDelete: boolean;
  onClose: () => void;
}

export const EditMonthModal: React.FC<EditMonthModalProps> = ({ month, canDelete, onClose }) => {
  const [title, setTitle] = useState(month.title || `Tháng ${month.monthKey}`);
  const [note, setNote] = useState(month.note ?? '');
  const [initialFundInput, setInitialFundInput] = useState(
    month.initialFund ? month.initialFund.toLocaleString('vi-VN') : '0'
  );
  const [isConfirmDeleting, setIsConfirmDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      setInitialFundInput('0');
      return;
    }
    const num = parseInt(rawVal, 10);
    setInitialFundInput(num.toLocaleString('vi-VN'));
  };

  const [loi, setLoi] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const fund = parseVNDInput(initialFundInput);
    setLoi(null);
    startTransition(async () => {
      try {
        await updateMonth(month.id, {
          title: title.trim() || `Tháng ${month.monthKey}`,
          note: note.trim() || null,
          initialFund: fund,
        });
        onClose();
      } catch (err) {
        // redirect()/notFound() ném lỗi để hoạt động — phải cho chúng đi tiếp.
        if (laLoiDieuHuong(err)) throw err;
        setLoi(thongDiepLoi(err));
      }
    });
  };

  const handleDelete = () => {
    setLoi(null);
    startTransition(async () => {
      try {
        await deleteMonth(month.id);
      } catch (err) {
        if (laLoiDieuHuong(err)) throw err;
        setLoi(thongDiepLoi(err, 'Không xóa được kỳ này. Thử lại giúp.'));
      }
    });
  };

  return (
    <>
      <div
        id="edit-month-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      >
        <div
          id="edit-month-modal-card"
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
            <div className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-lg">Chỉnh Sửa Kỳ Đánh</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Kỳ tháng / năm
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-mono font-bold text-slate-700">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>{month.monthKey}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Tên hiển thị kỳ đánh <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Tháng 08/2026"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Quỹ đầu kỳ / Tiền tồn từ tháng trước (VNĐ)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={initialFundInput}
                  onChange={handleFundChange}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-12 text-sm font-mono font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  đ
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Số tiền này sẽ được tính vào số dư quỹ chung của nhóm trong tháng.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Ghi chú (Sân, khung giờ cố định...)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Sân Kỳ Hòa, T2-T4-T6 18h-20h"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {canDelete ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsConfirmDeleting(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa kỳ này</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">Không thể xóa kỳ duy nhất</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Lưu Thay Đổi
                </button>
              </div>
            </div>

            {loi && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {loi}
              </p>
            )}
          </form>
        </div>
      </div>

      {isConfirmDeleting && (
        <ConfirmDialog
          isOpen={true}
          type="danger"
          title={`Xác Nhận Xóa "${month.title}"?`}
          message={
            <span>
              Bạn có chắc chắn muốn xóa hoàn toàn dữ liệu kỳ đánh{' '}
              <strong className="text-slate-900">{month.title}</strong>? Toàn bộ danh sách buổi đánh,
              điểm danh và khoản chi trong kỳ này sẽ bị xóa.
            </span>
          }
          confirmText="Xác nhận xóa kỳ"
          cancelText="Giữ lại"
          onConfirm={() => {
            setIsConfirmDeleting(false);
            handleDelete();
          }}
          onCancel={() => setIsConfirmDeleting(false)}
        />
      )}
    </>
  );
};
