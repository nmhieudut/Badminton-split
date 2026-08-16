import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Check,
  Calendar,
  DollarSign,
  Users,
  Tag,
  FileText,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { ExpenseCategory, ExpenseItem, Member, CATEGORY_CONFIG } from '../types';
import { formatVND, parseVNDInput } from '../utils/settlement';

interface ExpenseFormModalProps {
  initialData?: ExpenseItem | null;
  members: Member[];
  onSave: (expense: ExpenseItem) => void;
  onClose: () => void;
}

const PRESET_EXPENSES: { title: string; category: ExpenseCategory; defaultAmount?: number }[] = [
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

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  initialData,
  members,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('court');
  const [amountInput, setAmountInput] = useState('');
  const [paidById, setPaidById] = useState<string>('');
  const [splitType, setSplitType] = useState<'all' | 'custom'>('all');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setCategory(initialData.category);
      setAmountInput(initialData.amount.toString());
      setPaidById(initialData.paidById);
      setSplitType(initialData.splitType);
      setParticipantIds(
        initialData.participantIds && initialData.participantIds.length > 0
          ? initialData.participantIds
          : members.map((m) => m.id)
      );
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setNote(initialData.note || '');
    } else {
      setTitle('');
      setCategory('court');
      setAmountInput('');
      setPaidById(members[0]?.id || '');
      setSplitType('all');
      setParticipantIds(members.map((m) => m.id));
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const numericAmount = parseVNDInput(amountInput);

  const handleAddAmount = (add: number) => {
    const current = numericAmount || 0;
    setAmountInput((current + add).toString());
  };

  const handlePresetSelect = (p: typeof PRESET_EXPENSES[0]) => {
    setTitle(p.title);
    setCategory(p.category);
    if (p.defaultAmount && !numericAmount) {
      setAmountInput(p.defaultAmount.toString());
    }
  };

  const toggleParticipant = (memberId: string) => {
    if (participantIds.includes(memberId)) {
      if (participantIds.length > 1) {
        setParticipantIds(participantIds.filter((id) => id !== memberId));
      }
    } else {
      setParticipantIds([...participantIds, memberId]);
    }
  };

  const selectAllParticipants = () => {
    setParticipantIds(members.map((m) => m.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tên khoản chi!');
      return;
    }
    if (numericAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ (> 0 đ)!');
      return;
    }
    if (!paidById) {
      alert('Vui lòng chọn người đã chi trước khoản này!');
      return;
    }

    const effectiveParticipants =
      splitType === 'all' ? members.map((m) => m.id) : participantIds;

    const expenseItem: ExpenseItem = {
      id: initialData ? initialData.id : `e_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      category,
      amount: numericAmount,
      paidById,
      splitType,
      participantIds: effectiveParticipants,
      date: date || new Date().toISOString().split('T')[0],
      note: note.trim() || undefined,
    };

    onSave(expenseItem);
    onClose();
  };

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
              {initialData ? 'Chỉnh Sửa Khoản Chi' : 'Ghi Nhận Khoản Chi Mới'}
            </h3>
          </div>
          <button
            id="close-expense-modal-btn"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
              {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((cat) => {
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Tên khoản chi <span className="text-red-500">*</span>
              </label>
              <input
                id="expense-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Tiền sân tháng 8, 2 hộp cầu Victor, Nước suối..."
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Nhập số tiền (VD: 500k, 1.2tr, 250000)"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden font-mono"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => handleAddAmount(50000)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  +50k
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAmount(100000)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  +100k
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAmount(250000)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  +250k
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAmount(500000)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  +500k
                </button>
                <button
                  type="button"
                  onClick={() => handleAddAmount(1000000)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  +1 Triệu
                </button>
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Người đã móc ví chi trước <span className="text-red-500">*</span>
              </label>
              <select
                id="expense-payer-select"
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isPermanent === false ? '(Vãng lai)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Ngày chi</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
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
                  Chia đều ({members.length} người)
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
                    {members.length} người (
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
                  {members.map((m) => {
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
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Ghi chú thêm (tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Cọc trước 50%, mua tại shop VNB, v.v."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            id="submit-expense-form-btn"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Check className="h-4 w-4" />
            {initialData ? 'Cập nhật' : 'Thêm khoản chi'}
          </button>
        </div>
      </div>
    </div>
  );
};
