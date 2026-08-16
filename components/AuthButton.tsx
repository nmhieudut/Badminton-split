'use client';

import React, { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { signOut } from '../app/actions/auth';
import { LoginModal } from './LoginModal';

export function AuthButton({ email, isAdmin }: { email: string | null; isAdmin: boolean }) {
  const [moModal, setMoModal] = useState(false);
  const [dangChay, startTransition] = useTransition();
  const pathname = usePathname();

  if (!email) {
    return (
      <>
        <button
          type="button"
          onClick={() => setMoModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-indigo-600"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Đăng nhập</span>
        </button>
        {moModal && <LoginModal next={pathname} onClose={() => setMoModal(false)} />}
      </>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {isAdmin && (
        <span
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"
          title={email}
        >
          <ShieldCheck className="h-3 w-3" />
          <span className="hidden sm:inline">Quản lý</span>
        </span>
      )}
      <button
        type="button"
        disabled={dangChay}
        onClick={() => startTransition(() => void signOut())}
        title={email}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-indigo-600 disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Thoát</span>
      </button>
    </div>
  );
}
