'use client';

import React, { useState, useTransition } from 'react';
import { ShieldCheck, Trash2, X } from 'lucide-react';
import { addAdmin, removeAdmin } from '../app/actions/admins';

export interface DongAdmin {
  email: string;
  /** Đã định dạng ở server để không lệch múi giờ giữa server và trình duyệt. */
  addedAt: string;
  addedBy: string | null;
  laSuperAdmin: boolean;
}

export function AdminsModal({
  danhSach,
  onClose,
}: {
  danhSach: DongAdmin[];
  onClose: () => void;
}) {
  const [emailMoi, setEmailMoi] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const [dangChay, startTransition] = useTransition();

  const them = () => {
    setLoi(null);
    startTransition(async () => {
      try {
        await addAdmin(emailMoi);
        setEmailMoi('');
      } catch (e) {
        setLoi(e instanceof Error ? e.message : 'Không thêm được.');
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Quản lý quyền</h2>
            <p className="mt-1 text-xs text-slate-500">
              Người trong danh sách này ghi được dữ liệu. Thêm xong nhớ nhắn họ đăng nhập.
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

        <ul className="mt-4 space-y-1.5">
          {danhSach.map((d) => (
            <li
              key={d.email}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {d.email}
                </span>
                <span className="text-[11px] text-slate-400">
                  {d.laSuperAdmin ? 'Từ cấu hình hệ thống' : `Thêm ngày ${d.addedAt}`}
                </span>
              </span>

              {d.laSuperAdmin ? (
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-emerald-600"
                  aria-label="Super admin, không gỡ được từ đây"
                />
              ) : (
                <button
                  type="button"
                  disabled={dangChay}
                  onClick={() => startTransition(() => void removeAdmin(d.email))}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                  aria-label={`Gỡ quyền của ${d.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <input
            type="email"
            value={emailMoi}
            onChange={(e) => setEmailMoi(e.target.value)}
            placeholder="email@gmail.com"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-hidden"
          />
          <button
            type="button"
            disabled={dangChay || !emailMoi.trim()}
            onClick={them}
            className="shrink-0 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            Thêm
          </button>
        </div>

        {loi && <p className="mt-2 text-xs font-semibold text-rose-600">{loi}</p>}
      </div>
    </div>
  );
}
