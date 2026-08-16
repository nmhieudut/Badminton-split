'use client';

import React, { useState } from 'react';
import type { ViewDailySession, ViewExpense, ViewMember } from '../lib/view-types';
import type { ExpenseInput } from '../app/actions/expenses';
import { deleteExpense, saveExpense } from '../app/actions/expenses';
import { ExpenseList } from './ExpenseList';
import { ExpenseChart } from './ExpenseChart';
import { ExpenseFormModal } from './ExpenseFormModal';

interface ExpensesTabProps {
  monthKey: string;
  members: ViewMember[];
  expenses: ViewExpense[];
  dailySessions: ViewDailySession[];
}

/**
 * Trạng thái mở/đóng modal trước đây nằm ở App.tsx. Sau khi chuyển sang App
 * Router, dữ liệu do server component truyền xuống nên phần client chỉ còn giữ
 * trạng thái giao diện và gọi server action.
 */
export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  monthKey,
  members,
  expenses,
  dailySessions,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ViewExpense | null>(null);
  // Modal khởi tạo state từ initialData nên phải remount mỗi lần mở, nếu không
  // lần mở thứ hai sẽ giữ nguyên dữ liệu của lần trước.
  const [formKey, setFormKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openForm = (expense: ViewExpense | null) => {
    setErrorMessage(null);
    setEditingExpense(expense);
    setFormKey((k) => k + 1);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  const handleAddExpense = () => openForm(null);

  const handleEditExpense = (expense: ViewExpense) => openForm(expense);

  /** Nhân bản: mở form với dữ liệu cũ nhưng bỏ id để lưu thành khoản chi mới. */
  const handleDuplicateExpense = (expense: ViewExpense) => openForm({ ...expense, id: '' });

  const handleSave = async (input: ExpenseInput) => {
    await saveExpense(monthKey, input);
  };

  const handleDeleteExpense = async (id: string) => {
    setErrorMessage(null);
    try {
      await deleteExpense(monthKey, id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không xóa được khoản chi');
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <ExpenseChart expenses={expenses} dailySessions={dailySessions} members={members} />

      <ExpenseList
        expenses={expenses}
        members={members}
        onAddExpense={handleAddExpense}
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
        onDuplicateExpense={handleDuplicateExpense}
      />

      {isFormOpen && (
        <ExpenseFormModal
          key={formKey}
          monthKey={monthKey}
          members={members}
          initialData={editingExpense}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  );
};
