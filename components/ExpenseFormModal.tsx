'use client';

import React, { useState } from 'react';
import { X, PlusCircle, Check, Users, Sparkles, UserPlus, Loader2 } from 'lucide-react';
import { CATEGORY_CONFIG, type ExpenseCategory } from '../lib/categories';
import { formatVND, parseVNDInput } from '../lib/money';
import type { ViewExpense, ViewMember } from '../lib/view-types';
import type { ExpenseInput } from '../app/actions/expenses';
import { createMember } from '../app/actions/members';

interface ExpenseFormModalProps {
  monthKey: string;
  members: ViewMember[];
  initialData: ViewExpense | null;
  onSave: (input: ExpenseInput) => Promise<void>;
  onClose: () => void;
}

const PRESET_EXPENSES: { title: string; category: ExpenseCategory; defaultAmount: number }[] = [
  { title: 'Tiền sân cố định tháng', category: 'court', defaultAmount: 1800000 },
  { title: 'Thuê thêm 1 giờ sân phụ', category: 'court', defaultAmount: 120000 },
  { title: '2 Ống cầu Victor No.1', category: 'shuttlecock', defaultAmount: 520000 },
  { title: '1 Ống cầu Hải Yến đỏ', category: 'shuttlecock', defaultAmount: 230000 },
  { title: '1 Ống cầu Ba Sao Pro', category: 'shuttlecock', defaultAmount: 250000 },
  { title: 'Thùng nước Revive + Suối', category: 'drink', defaultAmount: 180000 },
  { title: 'Nước đá + Trà đá sân', category: 'drink', defaultAmount: 40000 },
  { title: 'Ăn chè & Sinh tố sau trận', category: 'gathering', defaultAmount: 150000 },
  { title: 'Cơm trưa / Lẩu giao lưu', category: 'gathering', defaultAmount: 600000 },
  { title: 'Mua quấn cán vợt + phụ kiện', category: 'other', defaultAmount: 80000 },
];

const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG) as ExpenseCategory[];

function toCategory(value: string): ExpenseCategory {
  return (CATEGORY_KEYS as string[]).includes(value) ? (value as ExpenseCategory) : 'other';
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Ghi nhớ phân loại vừa dùng để nhập liên tiếp nhiều khoản cùng loại không phải
 * chọn lại. Đặt ngoài component vì modal bị unmount sau mỗi lần lưu.
 */
let lastUsedCategory: ExpenseCategory = 'court';

interface FieldErrors {
  title?: string;
  amount?: string;
  payer?: string;
  participants?: string;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  monthKey,
  members,
  initialData,
  onSave,
  onClose,
}) => {
  const isEdit = Boolean(initialData?.id);

  // Người mới tạo ngay trong modal: giữ tạm ở đây để ô "người đã chi" có sẵn
  // lựa chọn, kể cả trước khi server component kịp trả danh sách mới.
  const [newMembers, setNewMembers] = useState<ViewMember[]>([]);
  const allMembers = [...members, ...newMembers.filter((n) => !members.some((m) => m.id === n.id))];

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [category, setCategory] = useState<ExpenseCategory>(
    initialData ? toCategory(initialData.category) : lastUsedCategory
  );
  const [amountInput, setAmountInput] = useState(
    initialData ? String(initialData.amount) : ''
  );
  const [paidById, setPaidById] = useState<string>(
    initialData?.paidById ?? members[0]?.id ?? ''
  );
  const [splitType, setSplitType] = useState<'all' | 'custom'>(
    initialData?.splitType === 'custom' ? 'custom' : 'all'
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    initialData && initialData.participantIds.length > 0
      ? initialData.participantIds
      : members.map((m) => m.id)
  );
  const [date, setDate] = useState<string>(initialData?.date ?? today());
  const [note, setNote] = useState(initialData?.note ?? '');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  const numericAmount = parseVNDInput(amountInput);

  const handleAddAmount = (add: number) => {
    setAmountInput(String((numericAmount || 0) + add));
    setErrors((e) => ({ ...e, amount: undefined }));
  };

  /**
   * Chọn mẫu là chọn cả gói: tên + phân loại + số tiền. Trước đây số tiền chỉ
   * điền khi ô đang trống nên bấm mẫu thứ hai sẽ đổi tên mà giữ nguyên tiền cũ.
   */
  const handlePresetSelect = (preset: (typeof PRESET_EXPENSES)[number]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setAmountInput(String(preset.defaultAmount));
    setErrors((e) => ({ ...e, title: undefined, amount: undefined }));
  };

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
    setErrors((e) => ({ ...e, participants: undefined }));
  };

  const selectAllParticipants = () => {
    setParticipantIds(allMembers.map((m) => m.id));
    setErrors((e) => ({ ...e, participants: undefined }));
  };

  const handleQuickAddMember = async () => {
    const name = quickName.trim();
    if (!name) {
      setQuickAddError('Vui lòng nhập tên người mới');
      return;
    }
    setIsAddingMember(true);
    setQuickAddError(null);
    try {
      const newId = await createMember(monthKey, { name, isPermanent: false });
      const created: ViewMember = {
        id: newId,
        name,
        phone: null,
        qrImagePath: null,
        color: null,
        isPermanent: false,
      };
      setNewMembers((prev) => [...prev, created]);
      setPaidById(newId);
      setParticipantIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
      setQuickName('');
      setShowQuickAdd(false);
      setErrors((e) => ({ ...e, payer: undefined }));
    } catch (err) {
      setQuickAddError(err instanceof Error ? err.message : 'Không thêm được người mới');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const nextErrors: FieldErrors = {};
    if (!title.trim()) nextErrors.title = 'Vui lòng nhập tên khoản chi';
    if (numericAmount <= 0) nextErrors.amount = 'Vui lòng nhập số tiền hợp lệ (> 0 đ)';
    if (!paidById) nextErrors.payer = 'Vui lòng chọn người đã chi trước khoản này';
    if (splitType === 'custom' && participantIds.length === 0) {
      nextErrors.participants = 'Chọn ít nhất một người tham gia';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Gửi đúng thứ giao diện đang hiển thị: chế độ "chia đều" để server tự mở
    // ra toàn bộ thành viên của tháng, chế độ "chọn người" gửi danh sách đã tick.
    const input: ExpenseInput = {
      ...(isEdit && initialData ? { id: initialData.id } : {}),
      title: title.trim(),
      category,
      amount: numericAmount,
      paidById,
      splitType,
      participantIds: splitType === 'all' ? [] : participantIds,
      date: date || today(),
      note: note.trim() || null,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(input);
      lastUsedCategory = category;
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Không lưu được khoản chi');
      setIsSaving(false);
    }
  };

  const errorText = 'mt-1 text-xs font-semibold text-red-600';
  const inputBase =
    'w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-hidden';

  return (
    <div
      id="expense-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="expense-modal-content"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">
              {isEdit ? 'Chỉnh Sửa Khoản Chi' : 'Ghi Nhận Khoản Chi Mới'}
            </h3>
          </div>
          <button
            id="close-expense-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="expense-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {/* Quick Preset Badges */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Mẫu chi tiêu nhanh
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {PRESET_EXPENSES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Phân loại khoản chi
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {CATEGORY_KEYS.map((cat) => {
                const conf = CATEGORY_CONFIG[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Amount */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="expense-title-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Tên khoản chi <span className="text-red-500">*</span>
              </label>
              <input
                id="expense-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="VD: Tiền sân tháng 8, 2 hộp cầu Victor, Nước suối..."
                aria-invalid={Boolean(errors.title)}
                className={`${inputBase} ${
                  errors.title ? 'border-red-400' : 'border-slate-200 focus:border-indigo-500'
                }`}
              />
              {errors.title && <p className={errorText}>{errors.title}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="expense-amount-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Số tiền (VNĐ) <span className="text-red-500">*</span>
                </label>
                {numericAmount > 0 && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 font-mono">
                    {formatVND(numericAmount)}
                  </span>
                )}
              </div>
              <input
                id="expense-amount-input"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                placeholder="Nhập số tiền (VD: 500k, 1.2tr, 250000)"
                aria-invalid={Boolean(errors.amount)}
                className={`${inputBase} text-base font-bold font-mono ${
                  errors.amount ? 'border-red-400' : 'border-slate-200 focus:border-indigo-500'
                }`}
              />
              {errors.amount && <p className={errorText}>{errors.amount}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { label: '+50k', value: 50000 },
                  { label: '+100k', value: 100000 },
                  { label: '+250k', value: 250000 },
                  { label: '+500k', value: 500000 },
                  { label: '+1 Triệu', value: 1000000 },
                ].map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => handleAddAmount(chip.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {chip.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountInput('')}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 ml-auto"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>

          {/* Payer & Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="expense-payer-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Người đã móc ví chi trước <span className="text-red-500">*</span>
                </label>
                <button
                  id="quick-add-member-btn"
                  type="button"
                  onClick={() => {
                    setShowQuickAdd((v) => !v);
                    setQuickAddError(null);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Thêm người mới
                </button>
              </div>
              <select
                id="expense-payer-select"
                value={paidById}
                onChange={(e) => {
                  setPaidById(e.target.value);
                  setErrors((prev) => ({ ...prev, payer: undefined }));
                }}
                aria-invalid={Boolean(errors.payer)}
                className={`${inputBase} font-semibold ${
                  errors.payer ? 'border-red-400' : 'border-slate-200 focus:border-indigo-500'
                }`}
              >
                <option value="">-- Chọn người chi --</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isPermanent === false ? '(Vãng lai)' : ''}
                  </option>
                ))}
              </select>
              {errors.payer && <p className={errorText}>{errors.payer}</p>}

              {showQuickAdd && (
                <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      id="quick-member-name-input"
                      type="text"
                      value={quickName}
                      onChange={(e) => {
                        setQuickName(e.target.value);
                        setQuickAddError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleQuickAddMember();
                        }
                      }}
                      placeholder="Tên người mới (vãng lai)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => void handleQuickAddMember()}
                      disabled={isAddingMember}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAddingMember ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Thêm
                    </button>
                  </div>
                  {quickAddError && <p className={errorText}>{quickAddError}</p>}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="expense-date-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Ngày chi
              </label>
              <input
                id="expense-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputBase} border-slate-200 focus:border-indigo-500`}
              />
            </div>
          </div>

          {/* Splitting method */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" />
                Cơ chế chia tiền
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  id="split-all-btn"
                  onClick={() => setSplitType('all')}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                    splitType === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Chia đều ({allMembers.length} người)
                </button>
                <button
                  type="button"
                  id="split-custom-btn"
                  onClick={() => setSplitType('custom')}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                    splitType === 'custom'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Chọn người tham gia
                </button>
              </div>
            </div>

            {splitType === 'custom' && (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-500">
                    Đã chọn <strong className="text-indigo-600">{participantIds.length}</strong> /{' '}
                    {allMembers.length} người (
                    {numericAmount > 0 && participantIds.length > 0
                      ? `Mỗi người ${formatVND(numericAmount / participantIds.length)}`
                      : ''}
                    )
                  </span>
                  <button
                    type="button"
                    onClick={selectAllParticipants}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Chọn tất cả
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-36 overflow-y-auto p-1">
                  {allMembers.map((m) => {
                    const isChecked = participantIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'border-indigo-500 bg-white text-slate-900 shadow-xs'
                            : 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleParticipant(m.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate font-medium">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.participants && <p className={errorText}>{errors.participants}</p>}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label
              htmlFor="expense-note-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
            >
              Ghi chú thêm (tùy chọn)
            </label>
            <input
              id="expense-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Cọc trước 50%, mua tại shop VNB, v.v."
              className={`${inputBase} border-slate-200 focus:border-indigo-500`}
            />
          </div>

          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {saveError}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="expense-form"
            id="submit-expense-form-btn"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSaving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm khoản chi'}
          </button>
        </div>
      </div>
    </div>
  );
};
