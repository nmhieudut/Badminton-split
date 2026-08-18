'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { ShieldCheck } from 'lucide-react';
import { addAdmin, removeAdmin } from '../app/actions/admins';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export type RowRole = 'super_admin' | 'admin' | 'viewer';

export interface UserRow {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: RowRole;
  /** Most recent sign-in; null means they have never signed in. */
  lastSignInAt: string | null;
}

const ROLE_BADGE: Record<RowRole, { label: string; className: string }> = {
  super_admin: { label: 'Chủ nhóm', className: 'bg-emerald-50 text-emerald-700' },
  admin: { label: 'Quản lý', className: 'bg-indigo-50 text-indigo-700' },
  viewer: { label: 'Chỉ xem', className: 'bg-slate-100 text-slate-500' },
};

export function AdminsModal({
  rows,
  onClose,
}: {
  rows: UserRow[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!isMounted) return null;

  const changeRole = (email: string, grant: boolean) => {
    setError(null);
    setPendingEmail(email);
    startTransition(async () => {
      try {
        await (grant ? addAdmin(email) : removeAdmin(email));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không đổi được quyền.');
      } finally {
        setPendingEmail(null);
      }
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quản lý quyền</DialogTitle>
          <DialogDescription>
            Những người đã đăng nhập vào app. Cấp quyền để họ ghi được dữ liệu.
          </DialogDescription>
        </DialogHeader>

        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-5">
          {rows.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
              Chưa có ai đăng nhập ngoài bạn.
            </li>
          )}

          {rows.map((n) => {
            const isSuperAdminRow = n.role === 'super_admin';
            const isAdminRow = n.role === 'admin';
            const badge = ROLE_BADGE[n.role];

            return (
              <li
                key={n.email}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {n.avatarUrl ? (
                    <img
                      src={n.avatarUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-600">
                      {(n.name ?? n.email).charAt(0).toUpperCase()}
                    </span>
                  )}

                  <span className="min-w-0">
                    {n.name && (
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {n.name}
                      </span>
                    )}
                    <span className="block truncate text-[11px] text-slate-500">
                      {n.email}
                    </span>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                    >
                      {isSuperAdminRow && <ShieldCheck className="h-2.5 w-2.5" />}
                      {badge.label}
                      {!n.lastSignInAt && ' · chưa đăng nhập'}
                    </span>
                  </span>
                </span>

                {isSuperAdminRow ? (
                  <span
                    className="shrink-0 text-[11px] text-slate-400"
                    title="Đặt trong biến môi trường ADMIN_EMAILS, chỉ đổi được khi triển khai lại"
                  >
                    Từ cấu hình
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={pendingEmail === n.email}
                    onClick={() => changeRole(n.email, !isAdminRow)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
                      isAdminRow
                        ? 'border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {pendingEmail === n.email ? '...' : isAdminRow ? 'Gỡ quyền' : 'Cấp quyền'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {error && (
          <p className="shrink-0 border-t border-slate-200 px-5 py-3 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
