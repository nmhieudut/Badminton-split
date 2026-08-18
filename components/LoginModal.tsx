'use client';

import React, { useState, useTransition } from 'react';
import { signInWithGoogle } from '../app/actions/auth';
import { isNavigationError, errorMessage } from '../lib/navigation-error';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

/*
 * Opened from a button inside <header>, which carries backdrop-blur.
 * `backdrop-filter` makes a new containing block for position:fixed children,
 * so a dialog rendered in place would be centred inside the header rather than
 * the viewport. Radix portals its content to document.body, which is what the
 * hand-rolled createPortal here used to do by hand — along with the Escape
 * listener and the mounted flag, all of which the primitive now covers.
 */
export function LoginModal({ next, onClose }: { next: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Đăng nhập</DialogTitle>
          <DialogDescription>
            Chỉ người quản lý mới cần đăng nhập để ghi dữ liệu. Xem thì không cần.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            {isPending ? 'Đang chuyển tới Google...' : 'Tiếp tục với Google'}
          </button>

          {error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
