'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { signOut } from '../app/actions/auth';
import { LoginModal } from './LoginModal';

export interface AuthButtonProps {
  email: string | null;
  ten: string | null;
  anhDaiDien: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function AuthButton({
  email,
  ten,
  anhDaiDien,
  isAdmin,
  isSuperAdmin,
}: AuthButtonProps) {
  const [moModal, setMoModal] = useState(false);
  const [moMenu, setMoMenu] = useState(false);
  const [dangChay, startTransition] = useTransition();
  const pathname = usePathname();
  const boc = useRef<HTMLDivElement>(null);

  /*
    Đóng menu bằng listener trên document, không dùng lớp phủ `fixed inset-0`.
    Header có backdrop-blur, mà backdrop-filter tạo containing block cho con
    cháu position:fixed — lớp phủ như vậy chỉ trùm đúng cái header, bấm vào
    nội dung trang sẽ không đóng được menu.
  */
  useEffect(() => {
    if (!moMenu) return;

    const ngoai = (e: MouseEvent) => {
      if (boc.current && !boc.current.contains(e.target as Node)) setMoMenu(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoMenu(false);
    };

    document.addEventListener('mousedown', ngoai);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', ngoai);
      document.removeEventListener('keydown', esc);
    };
  }, [moMenu]);

  if (!email) {
    return (
      <>
        <button
          type="button"
          onClick={() => setMoModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-indigo-600"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Đăng nhập</span>
        </button>
        {moModal && <LoginModal next={pathname} onClose={() => setMoModal(false)} />}
      </>
    );
  }

  const tenHienThi = ten ?? email;
  const chuCaiDau = (ten ?? email).charAt(0).toUpperCase();
  const nhan = isSuperAdmin ? 'Chủ nhóm' : isAdmin ? 'Quản lý' : 'Thành viên';

  return (
    <div className="relative shrink-0" ref={boc}>
      <button
        type="button"
        onClick={() => setMoMenu((v) => !v)}
        aria-expanded={moMenu}
        aria-haspopup="menu"
        aria-label={`Tài khoản: ${tenHienThi}`}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-1.5 transition-colors hover:bg-slate-50 sm:pr-2.5"
      >
        {anhDaiDien ? (
          // Ảnh Google, dùng thẻ img thường: URL đổi theo tài khoản nên không
          // đáng khai báo remotePatterns cho next/image.
          <img
            src={anhDaiDien}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            {chuCaiDau}
          </span>
        )}

        {/* Tên chỉ hiện từ màn hình vừa trở lên; điện thoại chỉ còn ảnh. */}
        <span className="hidden max-w-[10rem] truncate text-xs font-semibold text-slate-700 sm:inline">
          {tenHienThi}
        </span>
      </button>

      {moMenu && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            {anhDaiDien ? (
              <img
                src={anhDaiDien}
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                {chuCaiDau}
              </span>
            )}
            <span className="min-w-0">
              {ten && (
                <span className="block truncate text-sm font-bold text-slate-900">{ten}</span>
              )}
              <span className="block truncate text-[11px] text-slate-500">{email}</span>
            </span>
          </div>

          <div className="px-2.5 pb-2">
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                isAdmin
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isAdmin && <ShieldCheck className="h-3 w-3" />}
              {nhan}
            </span>
            {!isAdmin && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                Tài khoản này chỉ xem được. Nhờ chủ nhóm cấp quyền nếu bạn cần ghi dữ liệu.
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={dangChay}
              onClick={() => startTransition(() => void signOut())}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              <span>{dangChay ? 'Đang thoát...' : 'Đăng xuất'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
