'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

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

/*
 * The variants used raw `red-*` classes, which the theme does not remap — so
 * the destructive dialog kept Tailwind's stock red while the rest of the app
 * moved to the clay ramp. They all draw from the theme now.
 */
const VARIANTS = {
  danger: {
    icon: AlertTriangle,
    tone: 'bg-rose-50 text-rose-600',
    confirm: 'bg-rose-600 hover:bg-rose-700',
  },
  warning: {
    icon: AlertCircle,
    tone: 'bg-amber-50 text-amber-600',
    confirm: 'bg-amber-600 hover:bg-amber-700',
  },
  info: {
    icon: Info,
    tone: 'bg-indigo-50 text-indigo-600',
    confirm: 'bg-indigo-600 hover:bg-indigo-700',
  },
  success: {
    icon: CheckCircle2,
    tone: 'bg-emerald-50 text-emerald-600',
    confirm: 'bg-emerald-600 hover:bg-emerald-700',
  },
} as const;

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
  const variant = VARIANTS[type];
  const Icon = variant.icon;

  return (
    // Radix reports every way of dismissing — Escape, the overlay, the close
    // button — through onOpenChange, so cancelling has one path rather than one
    // handler per gesture.
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md" id="confirm-dialog-card">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${variant.tone}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription asChild>
                <div>{message}</div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {details && details.length > 0 && (
          <DialogBody>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dữ liệu liên quan bị ảnh hưởng
            </p>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {details.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </DialogBody>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer ${variant.confirm}`}
          >
            {confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
