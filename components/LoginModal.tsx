'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { signInWithGoogle } from '../app/actions/auth';
import { laLoiDieuHuong, thongDiepLoi } from '../lib/loi-dieu-huong';

export function LoginModal({ next, onClose }: { next: string; onClose: () => void }) {
  const [dangChay, startTransition] = useTransition();
  const [daGanVaoDom, setDaGanVaoDom] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => setDaGanVaoDom(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!daGanVaoDom) return null;

  const noiDung = (
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
          disabled={dangChay}
          onClick={() =>
            startTransition(async () => {
              setLoi(null);
              try {
                await signInWithGoogle(next);
              } catch (e) {
                // signInWithGoogle kết thúc bằng redirect() sang Google.
                if (laLoiDieuHuong(e)) throw e;
                setLoi(thongDiepLoi(e, 'Không mở được trang đăng nhập.'));
              }
            })
          }
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {dangChay ? 'Đang chuyển tới Google...' : 'Tiếp tục với Google'}
        </button>

        {loi && <p className="mt-2 text-xs font-semibold text-rose-600">{loi}</p>}
      </div>
    </div>
  );

  /*
    Đưa thẳng ra document.body.

    Modal này được mở từ nút nằm trong <header>, mà header có backdrop-blur.
    `backdrop-filter` tạo containing block mới cho con cháu position:fixed, nên
    `inset-0` sẽ tính theo header cao vài chục pixel thay vì theo cửa sổ — modal
    bị căn giữa trong header rồi tràn lên trên và mất phần tiêu đề.
  */
  return createPortal(noiDung, document.body);
}
