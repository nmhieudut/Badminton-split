'use client';

import React, { useTransition } from 'react';
import { X } from 'lucide-react';
import { signInWithGoogle } from '../app/actions/auth';

export function LoginModal({ next, onClose }: { next: string; onClose: () => void }) {
  const [dangChay, startTransition] = useTransition();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Đăng nhập</h2>
            <p className="mt-1 text-xs text-slate-500">
              Chỉ người quản lý mới cần đăng nhập để ghi dữ liệu. Xem thì không cần.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          disabled={dangChay}
          onClick={() => startTransition(() => void signInWithGoogle(next))}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {dangChay ? 'Đang chuyển tới Google...' : 'Tiếp tục với Google'}
        </button>
      </div>
    </div>
  );
}
