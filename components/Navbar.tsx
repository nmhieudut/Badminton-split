'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  Calculator,
  CalendarDays,
  ArrowUpDown,
  Receipt,
  MoreVertical,
  Edit3,
} from 'lucide-react';
import type { ViewMonth } from '../lib/view-types';
import { YearMonthPickerModal } from './YearMonthPickerModal';
import { EditMonthModal } from './EditMonthModal';
import { BadmintonEstimatorModal } from './BadmintonEstimatorModal';

interface NavbarProps {
  monthKey: string;
  month: ViewMonth;
  monthKeys: string[];
  memberCount: number;
}

/** Dịch monthKey đi `delta` tháng, giữ định dạng `YYYY-MM`. */
function shiftMonthKey(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

export const Navbar: React.FC<NavbarProps> = ({ monthKey, month, monthKeys, memberCount }) => {
  const pathname = usePathname();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);

  const base = `/${monthKey}`;
  const tabs = [
    { href: base, label: 'Buổi Đánh', shortLabel: 'Buổi Đánh', icon: CalendarDays },
    {
      href: `${base}/settlement`,
      label: 'Quyết Toán & QR',
      shortLabel: 'Quyết Toán',
      icon: ArrowUpDown,
    },
    { href: `${base}/expenses`, label: 'Chi Tiêu Chung', shortLabel: 'Chi Tiêu', icon: Receipt },
    {
      href: `${base}/members`,
      label: `Thành Viên (${memberCount})`,
      shortLabel: `Thành Viên (${memberCount})`,
      icon: Users,
    },
  ] as const;

  const isActive = (href: string) => pathname === href;

  const prevKey = shiftMonthKey(monthKey, -1);
  const nextKey = shiftMonthKey(monthKey, 1);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          {/* Left: Brand & Month Navigation */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white shadow-2xs">
                🏸
              </div>
              <span className="font-bold text-sm text-slate-900 hidden md:inline">
                Badminton Split
              </span>
            </div>

            {/* Month Switcher */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <Link
                id="nav-prev-month-btn"
                href={`/${prevKey}` as Route}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 transition-colors cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>

              <button
                type="button"
                id="nav-month-picker-btn"
                onClick={() => setIsPickerOpen(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-white transition-colors cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                <span>{month.title || `Tháng ${month.monthKey}`}</span>
              </button>

              <Link
                id="nav-next-month-btn"
                href={`/${nextKey}` as Route}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 transition-colors cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                id="nav-edit-month-btn"
                onClick={() => setIsEditOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600 transition-colors cursor-pointer"
                title="Sửa hoặc xóa kỳ đánh này"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Center: Main App Tabs */}
          <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {tabs.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href as Route}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isActive(href)
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Tools Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                id="nav-tools-menu-btn"
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                title="Tiện ích & Cài đặt"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isToolsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsToolsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-fade-in text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        setIsEditOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <Edit3 className="h-4 w-4 text-slate-500" />
                      <span>Sửa / Xóa kỳ đánh</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        setIsEstimatorOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <Calculator className="h-4 w-4 text-amber-500" />
                      <span>Dự toán tháng tới</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Tabs */}
        <div className="flex lg:hidden border-t border-slate-100 bg-slate-50 px-2 py-1 overflow-x-auto gap-1">
          {tabs.map(({ href, shortLabel, icon: Icon }) => (
            <Link
              key={href}
              href={href as Route}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
                isActive(href) ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{shortLabel}</span>
            </Link>
          ))}
        </div>
      </header>

      {isPickerOpen && (
        <YearMonthPickerModal
          currentMonthKey={monthKey}
          existingMonthKeys={monthKeys}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {isEditOpen && (
        <EditMonthModal
          month={month}
          canDelete={monthKeys.length > 1}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isEstimatorOpen && (
        <BadmintonEstimatorModal
          memberCount={memberCount}
          onClose={() => setIsEstimatorOpen(false)}
        />
      )}
    </>
  );
};
