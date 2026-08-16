'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  User,
  Users,
  Copy,
  ReceiptText,
} from 'lucide-react';
import { CATEGORY_CONFIG, type ExpenseCategory } from '../lib/categories';
import { formatVND } from '../lib/money';
import type { ViewExpense, ViewMember } from '../lib/view-types';
import { ConfirmDialog } from './ConfirmDialog';

interface ExpenseListProps {
  expenses: ViewExpense[];
  members: ViewMember[];
  onAddExpense: () => void;
  onEditExpense: (expense: ViewExpense) => void;
  onDeleteExpense: (id: string) => void;
  onDuplicateExpense: (expense: ViewExpense) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  members,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onDuplicateExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');
  const [expenseToDelete, setExpenseToDelete] = useState<ViewExpense | null>(null);

  const filteredExpenses = expenses.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesPayer =
      selectedPayer === 'all' || item.paidById === selectedPayer;
    return matchesSearch && matchesCategory && matchesPayer;
  });

  const getPayerName = (id: string) => {
    const member = members.find((m) => m.id === id);
    return member ? member.name : 'Không rõ';
  };

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div id="expense-list-container" className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="search-expense-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên khoản chi, ghi chú..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        {/* Filter by category & payer */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="filter-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="all">Tất cả phân loại</option>
            {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat].label}
              </option>
            ))}
          </select>

          <select
            id="filter-payer-select"
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="all">Tất cả người chi</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            id="add-expense-btn"
            onClick={onAddExpense}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm Khoản Chi</span>
          </button>
        </div>
      </div>

      {/* Expense Items List */}
      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
            <ReceiptText className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-slate-800 text-sm">Chưa có khoản chi nào phù hợp</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            Hãy bắt đầu ghi lại tiền sân, tiền mua quả cầu lông, nước uống hoặc ăn uống giao lưu.
          </p>
          <button
            onClick={onAddExpense}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            + Ghi chép mới
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((item) => {
            const catConf = CATEGORY_CONFIG[item.category as ExpenseCategory] ?? CATEGORY_CONFIG.other;
            const payerName = getPayerName(item.paidById);
            // Danh sách người tham gia được chốt lúc lưu, kể cả khi chia đều,
            // nên luôn ưu tiên số đã lưu thay vì số thành viên hiện tại.
            const participantCount = item.participantIds.length || members.length;

            return (
              <div
                key={item.id}
                id={`expense-row-${item.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left info */}
                <div className="flex items-start gap-3.5">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-sm"
                  >
                    🏸
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600"
                      >
                        {catConf.label}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {item.date || 'Hôm nay'}
                      </span>

                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        Người chi:
                        <span className="text-slate-700 font-semibold ml-0.5">
                          {payerName}
                        </span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        {item.splitType === 'all' ? (
                          <span className="text-slate-500">Cả nhóm ({participantCount} người)</span>
                        ) : (
                          <span className="text-indigo-600 font-medium">
                            Chia {participantCount}/{members.length} người
                          </span>
                        )}
                      </span>
                    </div>

                    {item.note && (
                      <p className="mt-1 text-xs text-slate-400 italic">Ghi chú: {item.note}</p>
                    )}
                  </div>
                </div>

                {/* Right amount and actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="font-mono text-base font-black text-slate-900 block">
                      {formatVND(item.amount)}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ~{formatVND(item.amount / (participantCount || 1))}/người
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicateExpense(item)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="Nhân bản"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEditExpense(item)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setExpenseToDelete(item)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Subtotal bar */}
          <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 text-xs font-bold text-slate-500 border border-slate-100 shadow-sm uppercase tracking-wider">
            <span>
              Tổng chi hiển thị ({filteredExpenses.length} khoản):
            </span>
            <span className="font-mono text-base font-black text-slate-900">
              {formatVND(totalFilteredAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deleting Expense */}
      {expenseToDelete && (
        <ConfirmDialog
          isOpen={true}
          type="danger"
          title="Xóa Khoản Chi?"
          message={
            <span>
              Bạn có chắc muốn xóa khoản chi &quot;<strong className="text-slate-900">{expenseToDelete.title}</strong>&quot; với số tiền <strong className="text-slate-900">{formatVND(expenseToDelete.amount)}</strong> do <strong className="text-slate-900">{getPayerName(expenseToDelete.paidById)}</strong> chi?
            </span>
          }
          details={[
            'Khoản chi này sẽ bị gỡ bỏ khỏi bảng quyết toán cuối tháng',
            'Số tiền cần đóng hoặc nhận lại của các thành viên sẽ được cập nhật tự động',
          ]}
          confirmText="Xác nhận xóa"
          cancelText="Hủy bỏ"
          onConfirm={() => {
            onDeleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }}
          onCancel={() => setExpenseToDelete(null)}
        />
      )}
    </div>
  );
};

