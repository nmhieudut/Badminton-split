'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X } from 'lucide-react';
import { addAdmin, removeAdmin } from '../app/actions/admins';

export type RowRole = 'super_admin' | 'admin' | 'chi_xem';

export interface UserRow {
  email: string;
  ten: string | null;
  anhDaiDien: string | null;
  vaiTro: RowRole;
  /** Ngày đăng nhập gần nhất; null nghĩa là chưa từng đăng nhập. */
  lanCuoi: string | null;
}

const NHAN: Record<RowRole, { chu: string; lop: string }> = {
  super_admin: { chu: 'Chủ nhóm', lop: 'bg-emerald-50 text-emerald-700' },
  admin: { chu: 'Quản lý', lop: 'bg-indigo-50 text-indigo-700' },
  chi_xem: { chu: 'Chỉ xem', lop: 'bg-slate-100 text-slate-500' },
};

export function AdminsModal({
  rows,
  onClose,
}: {
  rows: UserRow[];
  onClose: () => void;
}) {
  const [loi, setLoi] = useState<string | null>(null);
  const [dangXuLy, setDangXuLy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [daGanVaoDom, setDaGanVaoDom] = useState(false);

  useEffect(() => setDaGanVaoDom(true), []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!daGanVaoDom) return null;

  const doiQuyen = (email: string, capQuyen: boolean) => {
    setLoi(null);
    setDangXuLy(email);
    startTransition(async () => {
      try {
        await (capQuyen ? addAdmin(email) : removeAdmin(email));
      } catch (e) {
        setLoi(e instanceof Error ? e.message : 'Không đổi được quyền.');
      } finally {
        setDangXuLy(null);
      }
    });
  };

  const noiDung = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admins-modal-title"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 id="admins-modal-title" className="text-base font-bold text-slate-900">
              Quản lý quyền
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Những người đã đăng nhập vào app. Cấp quyền để họ ghi được dữ liệu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-5">
          {rows.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
              Chưa có ai đăng nhập ngoài bạn.
            </li>
          )}

          {rows.map((n) => {
            const laSuper = n.vaiTro === 'super_admin';
            const laAdmin = n.vaiTro === 'admin';
            const nhan = NHAN[n.vaiTro];

            return (
              <li
                key={n.email}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {n.anhDaiDien ? (
                    <img
                      src={n.anhDaiDien}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-600">
                      {(n.ten ?? n.email).charAt(0).toUpperCase()}
                    </span>
                  )}

                  <span className="min-w-0">
                    {n.ten && (
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {n.ten}
                      </span>
                    )}
                    <span className="block truncate text-[11px] text-slate-500">
                      {n.email}
                    </span>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${nhan.lop}`}
                    >
                      {laSuper && <ShieldCheck className="h-2.5 w-2.5" />}
                      {nhan.chu}
                      {!n.lanCuoi && ' · chưa đăng nhập'}
                    </span>
                  </span>
                </span>

                {laSuper ? (
                  <span
                    className="shrink-0 text-[11px] text-slate-400"
                    title="Đặt trong biến môi trường ADMIN_EMAILS, chỉ đổi được khi triển khai lại"
                  >
                    Từ cấu hình
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={dangXuLy === n.email}
                    onClick={() => doiQuyen(n.email, !laAdmin)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
                      laAdmin
                        ? 'border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {dangXuLy === n.email ? '...' : laAdmin ? 'Gỡ quyền' : 'Cấp quyền'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {loi && (
          <p className="border-t border-slate-100 px-5 py-3 text-xs font-semibold text-rose-600">
            {loi}
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(noiDung, document.body);
}
