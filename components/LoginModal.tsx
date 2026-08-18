'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { signInWithGoogle } from '../app/actions/auth';
import { isNavigationError, errorMessage } from '../lib/navigation-error';

export function LoginModal({ next, onClose }: { next: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isMounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="login-modal-title" className="text-base font-bold text-slate-900">
              Đăng nhập
            </h2>
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
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await signInWithGoogle(next);
              } catch (e) {
                // signInWithGoogle ends with a redirect() over to Google, and
                // redirect() works by throwing — rethrow so the navigation happens.
                if (isNavigationError(e)) throw e;
                setError(errorMessage(e, 'Không mở được trang đăng nhập.'));
              }
            })
          }
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {isPending ? 'Đang chuyển tới Google...' : 'Tiếp tục với Google'}
        </button>

        {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      </div>
    </div>
  );

  /*
    Portal straight into document.body.

    This modal is opened from a button inside <header>, and the header has
    backdrop-blur. `backdrop-filter` creates a new containing block for
    position:fixed descendants, so `inset-0` would resolve against a header a few
    dozen pixels tall instead of against the viewport — the modal ends up centered
    inside the header, overflowing upward and losing its title.
  */
  return createPortal(content, document.body);
}
