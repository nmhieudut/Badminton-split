import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Calculator,
  Share2,
  Settings2,
  CalendarDays,
  ArrowUpDown,
  Receipt,
  MoreVertical,
  Edit3,
  CalendarPlus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { MonthSession } from '../types';

interface NavbarProps {
  sessions: MonthSession[];
  activeSession: MonthSession;
  activeTab: 'dailySessions' | 'settlement' | 'expenses' | 'members';
  onChangeTab: (tab: 'dailySessions' | 'settlement' | 'expenses' | 'members') => void;
  onNavigatePrevMonth: () => void;
  onNavigateNextMonth: () => void;
  onOpenYearMonthPickerModal: () => void;
  onOpenNewMonthModal: () => void;
  onOpenEditMonthModal: () => void;
  onOpenEstimatorModal: () => void;
  onOpenZaloReportModal: () => void;
  onOpenBackupModal: () => void;
  onOpenDailySessionModal: () => void;
  onOpenNewExpenseModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sessions,
  activeSession,
  activeTab,
  onChangeTab,
  onNavigatePrevMonth,
  onNavigateNextMonth,
  onOpenYearMonthPickerModal,
  onOpenNewMonthModal,
  onOpenEditMonthModal,
  onOpenEstimatorModal,
  onOpenZaloReportModal,
  onOpenBackupModal,
  onOpenDailySessionModal,
  onOpenNewExpenseModal,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  return (
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

          {/* Month Switcher (Simple & Intuitive) */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              id="nav-prev-month-btn"
              onClick={onNavigatePrevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 transition-colors cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              id="nav-month-picker-btn"
              onClick={onOpenYearMonthPickerModal}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-white transition-colors cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span>{activeSession.title || `Tháng ${activeSession.monthKey}`}</span>
            </button>

            <button
              type="button"
              id="nav-next-month-btn"
              onClick={onNavigateNextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 transition-colors cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              id="nav-edit-month-btn"
              onClick={onOpenEditMonthModal}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600 transition-colors cursor-pointer"
              title="Sửa hoặc xóa kỳ đánh này"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Center: Main App Tabs (Clean Pill Navigation) */}
        <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onChangeTab('dailySessions')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dailySessions'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Buổi Đánh</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('settlement')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settlement'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Quyết Toán & QR</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('expenses')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Chi Tiêu Chung</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('members')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Thành Viên ({activeSession.members.length})</span>
          </button>
        </nav>

        {/* Right: Quick Action Buttons & Tools Dropdown */}
        <div className="flex items-center gap-2">
          {/* Quick Add Button */}
          <button
            type="button"
            id="nav-add-session-btn"
            onClick={onOpenDailySessionModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Buổi Đánh</span>
          </button>

          {/* Tools Menu Dropdown */}
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
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsToolsOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-fade-in text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenNewMonthModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <CalendarPlus className="h-4 w-4 text-indigo-500" />
                    <span>Tạo kỳ tháng mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenEditMonthModal();
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
                      onOpenZaloReportModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <Share2 className="h-4 w-4 text-emerald-500" />
                    <span>Báo cáo Zalo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenEstimatorModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <Calculator className="h-4 w-4 text-amber-500" />
                    <span>Dự toán tháng tới</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenBackupModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <Settings2 className="h-4 w-4 text-slate-500" />
                    <span>Sao lưu & Khôi phục</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Tabs */}
      <div className="flex lg:hidden border-t border-slate-100 bg-slate-50 px-2 py-1 overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => onChangeTab('dailySessions')}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'dailySessions'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          <CalendarDays className="h-3 w-3" />
          <span>Buổi Đánh</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('settlement')}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'settlement'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          <ArrowUpDown className="h-3 w-3" />
          <span>Quyết Toán</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('expenses')}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'expenses'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          <Receipt className="h-3 w-3" />
          <span>Chi Tiêu</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('members')}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'members'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          <Users className="h-3 w-3" />
          <span>Thành Viên ({activeSession.members.length})</span>
        </button>
      </div>
    </header>
  );
};
