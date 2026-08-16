'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  isOpen: boolean;
  type?: DialogVariant;
  title: string;
  message: React.ReactNode;
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  type = 'warning',
  title,
  message,
  details,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const iconConfig = {
    danger: {
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      bg: 'bg-red-50',
      btn: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      border: 'border-red-100',
    },
    warning: {
      icon: <AlertCircle className="h-6 w-6 text-amber-600" />,
      bg: 'bg-amber-50',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
      border: 'border-amber-100',
    },
    info: {
      icon: <Info className="h-6 w-6 text-indigo-600" />,
      bg: 'bg-indigo-50',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
      border: 'border-indigo-100',
    },
    success: {
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
      bg: 'bg-emerald-50',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
      border: 'border-emerald-100',
    },
  }[type];

  return (
    <div
      id="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onCancel}
    >
      <div
        id="confirm-dialog-card"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconConfig.bg} ${iconConfig.border} border`}
            >
              {iconConfig.icon}
            </div>

            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900 leading-6">{title}</h3>
              <div className="mt-2 text-xs text-slate-600 leading-relaxed">{message}</div>

              {details && details.length > 0 && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Dữ liệu liên quan bị ảnh hưởng:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {details.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 bg-slate-50 px-6 py-3.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors shadow-xs ${iconConfig.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
