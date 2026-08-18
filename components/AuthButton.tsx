'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarCog, LogIn, LogOut, MapPin, ShieldCheck, UserCog } from 'lucide-react';
import { signOut } from '../app/actions/auth';
import { isNavigationError } from '../lib/navigation-error';
import { LoginModal } from './LoginModal';

export interface AuthButtonProps {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Only show the edit-period entry when the month being viewed actually has a period. */
  canEditPeriod: boolean;
  onOpenEditMonth: () => void;
  onOpenCourts: () => void;
  onOpenAdmins: () => void;
}

export function AuthButton({
  email,
  name,
  avatarUrl,
  isAdmin,
  isSuperAdmin,
  canEditPeriod,
  onOpenEditMonth,
  onOpenCourts,
  onOpenAdmins,
}: AuthButtonProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, startTransition] = useTransition();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  /*
    Close the menu with a listener on document rather than a `fixed inset-0`
    overlay. The header uses backdrop-blur, and backdrop-filter creates a
    containing block for position:fixed descendants — such an overlay would only
    cover the header itself, so clicking the page content would not close the menu.
  */
  useEffect(() => {
    if (!isMenuOpen) return;

    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsMenuOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isMenuOpen]);

  if (!email) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsLoginOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-indigo-600"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Đăng nhập</span>
        </button>
        {isLoginOpen && <LoginModal next={pathname} onClose={() => setIsLoginOpen(false)} />}
      </>
    );
  }

  const displayName = name ?? email;
  const initial = (name ?? email).charAt(0).toUpperCase();
  const roleLabel = isSuperAdmin ? 'Chủ nhóm' : isAdmin ? 'Quản lý' : 'Thành viên';

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsMenuOpen((v) => !v)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label={`Tài khoản: ${displayName}`}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-1.5 transition-colors hover:bg-slate-50 sm:pr-2.5"
      >
        {avatarUrl ? (
          // Google avatar, using a plain img tag: the URL varies per account, so
          // declaring remotePatterns for next/image is not worth it.
          <img
            src={avatarUrl}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            {initial}
          </span>
        )}

        {/* The name only shows from medium screens up; phones get just the avatar. */}
        <span className="hidden max-w-[10rem] truncate text-xs font-semibold text-slate-700 sm:inline">
          {displayName}
        </span>
      </button>

      {isMenuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                {initial}
              </span>
            )}
            <span className="min-w-0">
              {name && (
                <span className="block truncate text-sm font-bold text-slate-900">{name}</span>
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
              {roleLabel}
            </span>
            {!isAdmin && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                Tài khoản này chỉ xem được. Nhờ chủ nhóm cấp quyền nếu bạn cần ghi dữ liệu.
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="border-t border-slate-100 py-1.5">
              {canEditPeriod && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenEditMonth();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <CalendarCog className="h-4 w-4 text-slate-500" />
                  <span>Sửa hoặc xóa kỳ này</span>
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenCourts();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              >
                <MapPin className="h-4 w-4 text-indigo-500" />
                <span>Quản lý sân</span>
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenAdmins();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <UserCog className="h-4 w-4 text-emerald-600" />
                  <span>Quản lý quyền</span>
                </button>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={isSigningOut}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await signOut();
                  } catch (e) {
                    if (isNavigationError(e)) throw e;
                    // If sign-out fails there is nothing the user can fix; just log
                    // it — what matters is not crashing the whole page.
                    console.error('[đăng xuất] thất bại', e);
                  }
                })
              }
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              <span>{isSigningOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
