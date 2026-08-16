import React, { useState } from 'react';
import { X, CalendarPlus, Check, Users } from 'lucide-react';
import { Member, MonthSession } from '../types';

interface NewMonthModalProps {
  currentMembers: Member[];
  onAddSession: (newSession: MonthSession) => void;
  onClose: () => void;
}

export const NewMonthModal: React.FC<NewMonthModalProps> = ({
  currentMembers,
  onAddSession,
  onClose,
}) => {
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const defaultMonthKey = nextMonthDate.toISOString().slice(0, 7); // '2026-09'

  const [monthKey, setMonthKey] = useState(defaultMonthKey);
  const [title, setTitle] = useState(
    `Tháng ${monthKey.split('-')[1]}/${monthKey.split('-')[0]}`
  );
  const [keepPermanentOnly, setKeepPermanentOnly] = useState(true);
  const [note, setNote] = useState('');

  const handleMonthKeyChange = (val: string) => {
    setMonthKey(val);
    const parts = val.split('-');
    if (parts.length === 2) {
      setTitle(`Tháng ${parts[1]}/${parts[0]}`);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthKey.trim()) return;

    // Filter members to carry over: if keepPermanentOnly, keep only isPermanent !== false
    const initialMembers = keepPermanentOnly
      ? currentMembers.filter((m) => m.isPermanent !== false)
      : currentMembers;

    const newSession: MonthSession = {
      id: `session-${monthKey}-${Date.now()}`,
      monthKey,
      title: title.trim() || `Tháng ${monthKey}`,
      createdAt: new Date().toISOString(),
      members: initialMembers,
      expenses: [],
      settledTransferIds: [],
      initialFund: 0,
      note: note.trim() || undefined,
    };

    onAddSession(newSession);
    onClose();
  };

  return (
    <div
      id="new-month-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="new-month-modal-card"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">Tạo Kỳ Chi Phí Mới</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Chọn Tháng / Năm <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              value={monthKey}
              onChange={(e) => handleMonthKeyChange(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Tên hiển thị kỳ tính tiền
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Tháng 09/2026"
              required
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={keepPermanentOnly}
                onChange={(e) => setKeepPermanentOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <div>
                <span className="font-bold block text-slate-800">Giữ lại danh sách thành viên cố định</span>
                <span className="text-slate-500 text-[11px]">
                  Tự động chuyển các thành viên cố định sang kỳ mới, loại bỏ khách vãng lai đã hoàn tất nợ.
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Ghi chú kỳ này</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đổi sân sang thứ 3-5-7..."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Tạo kỳ mới
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
