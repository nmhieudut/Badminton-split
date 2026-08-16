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
  Users,
} from 'lucide-react';
import type { ViewMonth } from '../lib/view-types';
import { AuthButton } from './AuthButton';
import { AdminsModal, type DongNguoiDung } from './AdminsModal';
import { CourtsModal, type DongSan } from './CourtsModal';
import { YearMonthPickerModal } from './YearMonthPickerModal';
import { EditMonthModal } from './EditMonthModal';

interface NavbarProps {
  monthKey: string;
  /** Null khi tháng chưa có kỳ nào — vẫn điều hướng được, chỉ không sửa được. */
  month: ViewMonth | null;
  monthKeys: string[];
  memberCount: number;
  /** Số giao dịch chưa chuyển khoản — hiện thành chấm báo trên tab Quyết toán. */
  unsettledCount: number;
  /** Email người đang đăng nhập, null nếu là khách. */
  email: string | null;
  /** Tên hiển thị từ Google, có thể trống. */
  ten: string | null;
  /** Ảnh đại diện Google, có thể trống. */
  anhDaiDien: string | null;
  /** Đúng với cả admin lẫn super admin — điều khiển mọi nút nghiệp vụ. */
  isAdmin: boolean;
  /** Chỉ điều khiển đúng một thứ: mục quản lý quyền trong menu tiện ích. */
  isSuperAdmin: boolean;
  /** Danh sách admin — chỉ nạp khi người xem là super admin, ngược lại rỗng. */
  danhSachAdmin: DongNguoiDung[];
  /** Danh sách sân — chỉ nạp cho admin, ngược lại rỗng. */
  danhSachSan: DongSan[];
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

export const Navbar: React.FC<NavbarProps> = ({
  monthKey,
  month,
  monthKeys,
  memberCount,
  unsettledCount,
  email,
  ten,
  anhDaiDien,
  isAdmin,
  isSuperAdmin,
  danhSachAdmin,
  danhSachSan,
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
      // Lý do người ta mở app lên là để biết còn ai nợ ai. Thanh điều hướng
      // trả lời sẵn câu đó thay vì bắt bấm vào mới thấy.
      badge: unsettledCount,
    },
    { href: `${base}/members`, label: 'Thành viên', icon: Users, badge: 0 },
  ];

  const isActive = (href: string) => pathname === href;

  const prevKey = shiftMonthKey(monthKey, -1);
  const nextKey = shiftMonthKey(monthKey, 1);

  // Tháng chưa có kỳ thì vẫn phải hiện nhãn để người dùng biết mình đang ở đâu.
  const [namNhan, thangNhan] = monthKey.split('-');
  const monthLabel = month?.title || `Tháng ${thangNhan}/${namNhan}`;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-6">
          {/* Nhãn hiệu — thu về mỗi biểu tượng khi màn hình hẹp */}
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

          {/* Chuyển kỳ — chiếm phần giữa vì mọi thứ trên màn hình đều thuộc về kỳ này */}
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

          {/* Tab trên cùng — chỉ ở màn hình rộng; điện thoại dùng thanh dưới đáy */}
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
              ten={ten}
              anhDaiDien={anhDaiDien}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              coTheSuaKy={month !== null}
              onOpenEditMonth={() => setIsEditOpen(true)}
              onOpenCourts={() => setIsCourtsOpen(true)}
              onOpenAdmins={() => setIsAdminsOpen(true)}
            />
          </div>
        </div>
      </header>

      {/*
        Thanh tab dưới đáy — chỉ trên điện thoại.
        App này được dùng ngay tại sân, một tay, nên các lối đi chính đặt trong
        tầm ngón cái thay vì sát mép trên màn hình.
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
                {/* Vạch chỉ mục đang xem, đặt trên cùng để không bị ngón tay che */}
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
        <CourtsModal danhSach={danhSachSan} onClose={() => setIsCourtsOpen(false)} />
      )}

      {isAdminsOpen && (
        <AdminsModal danhSach={danhSachAdmin} onClose={() => setIsAdminsOpen(false)} />
      )}
    </>
  );
};
