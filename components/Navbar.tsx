'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  HandCoins,
  MapPin,
  ShieldCheck,
  Users, Receipt } from 'lucide-react';
import type { ViewMonth } from '../lib/view-types';
import { AuthButton } from './AuthButton';
import { AdminsModal, type UserRow } from './AdminsModal';
import { CourtsModal, type CourtRow } from './CourtsModal';
import { YearMonthPickerModal } from './YearMonthPickerModal';
import { EditMonthModal } from './EditMonthModal';

interface NavbarProps {
  monthKey: string;
  /** Null when the month has no period yet — navigation still works, editing does not. */
  month: ViewMonth | null;
  monthKeys: string[];
  memberCount: number;
  /** Number of transfers not yet settled — shown as a badge on the settlement tab. */
  unsettledCount: number;
  /** Email of the signed-in user, null for guests. */
  email: string | null;
  /** Display name from Google, may be empty. */
  name: string | null;
  /** Google avatar image, may be empty. */
  avatarUrl: string | null;
  /** True for both admin and super admin — gates every write-action control. */
  isAdmin: boolean;
  /** Gates exactly one thing: the role management entry in the utility menu. */
  isSuperAdmin: boolean;
  /** Admin list — only loaded when the viewer is a super admin, otherwise empty. */
  users: UserRow[];
  /** Court list — only loaded for admins, otherwise empty. */
  courts: CourtRow[];
}

/** Shifts monthKey by `delta` months, keeping the `YYYY-MM` format. */
function shiftMonthKey(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

export const Navbar: React.FC<NavbarProps> = ({
  monthKey,
  month,
  monthKeys,
  memberCount,
  unsettledCount,
  email,
  name,
  avatarUrl,
  isAdmin,
  isSuperAdmin,
  users,
  courts,
}) => {
  const pathname = usePathname();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAdminsOpen, setIsAdminsOpen] = useState(false);
  const [isCourtsOpen, setIsCourtsOpen] = useState(false);


  const base = `/${monthKey}`;

  const tabs = [
    { href: base, label: 'Buổi đánh', icon: CalendarDays, badge: 0 },
    {
      href: `${base}/settlement`,
      label: 'Quyết toán',
      icon: HandCoins,
      // People open the app to find out who still owes whom. The nav bar answers
      // that up front instead of making them tap through to see it.
      badge: unsettledCount,
    },
    { href: `${base}/members`, label: 'Thành viên', icon: Users, badge: 0 },
    { href: `${base}/history`, label: 'Lịch sử', icon: Receipt, badge: 0 },
  ];

  const isActive = (href: string) => pathname === href;

  const prevKey = shiftMonthKey(monthKey, -1);
  const nextKey = shiftMonthKey(monthKey, 1);

  // A month with no period still needs a label so the user knows where they are.
  const [labelYear, labelMonth] = monthKey.split('-');
  const monthLabel = month?.title || `Tháng ${labelMonth}/${labelYear}`;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-6">
          {/* Brand mark — collapses to just the icon on narrow screens */}
          <Link
            href={base as Route}
            className="flex shrink-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-base shadow-2xs">
              🏸
            </span>
            <span className="hidden text-sm font-bold text-slate-900 xl:inline">
              Badminton Split
            </span>
          </Link>

          {/* Period switcher — takes the center because everything on screen belongs to this period */}
          <div className="flex min-w-0 flex-1 items-center justify-center lg:flex-none lg:justify-start">
            <div className="inline-flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <Link
                id="nav-prev-month-btn"
                href={`/${prevKey}` as Route}
                aria-label="Kỳ trước"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>

              <button
                type="button"
                id="nav-month-picker-btn"
                onClick={() => setIsPickerOpen(true)}
                className="flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-900 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <span className="truncate">{monthLabel}</span>
              </button>

              <Link
                id="nav-next-month-btn"
                href={`/${nextKey}` as Route}
                aria-label="Kỳ sau"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Top tabs — wide screens only; phones use the bottom bar instead */}
          <nav
            aria-label="Chuyển mục"
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
          >
            {tabs.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href as Route}
                aria-current={isActive(href) ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  isActive(href)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {badge > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <AuthButton
              email={email}
              name={name}
              avatarUrl={avatarUrl}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              canEditPeriod={month !== null}
              onOpenEditMonth={() => setIsEditOpen(true)}
              onOpenCourts={() => setIsCourtsOpen(true)}
              onOpenAdmins={() => setIsAdminsOpen(true)}
            />
          </div>
        </div>
      </header>

      {/*
        Bottom tab bar — phones only.
        This app gets used at the court, one-handed, so the main routes sit within
        thumb reach instead of along the top edge of the screen.
      */}
      <nav
        aria-label="Chuyển mục"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-lg">
          {tabs.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href as Route}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 ${
                  active ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                {/* Active-tab indicator, placed on top so a finger does not cover it */}
                <span
                  aria-hidden
                  className={`absolute inset-x-5 top-0 h-0.5 rounded-full transition-colors ${
                    active ? 'bg-indigo-600' : 'bg-transparent'
                  }`}
                />
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {isPickerOpen && (
        <YearMonthPickerModal
          currentMonthKey={monthKey}
          existingMonthKeys={monthKeys}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {isEditOpen && month && (
        <EditMonthModal
          month={month}
          canDelete={monthKeys.length > 1}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isCourtsOpen && (
        <CourtsModal rows={courts} onClose={() => setIsCourtsOpen(false)} />
      )}

      {isAdminsOpen && (
        <AdminsModal rows={users} onClose={() => setIsAdminsOpen(false)} />
      )}
    </>
  );
};
