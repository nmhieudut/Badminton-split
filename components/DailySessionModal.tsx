import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Calendar,
  Users,
  Plus,
  Minus,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { DailySession, Member } from '../types';
import { formatVND, parseVNDInput } from '../utils/settlement';
import { ConfirmDialog } from './ConfirmDialog';

interface DailySessionModalProps {
  initialData?: DailySession | null;
  defaultDate?: string;
  members: Member[];
  onSave: (session: DailySession) => void;
  onDelete?: (sessionId: string) => void;
  onAddQuickMember?: (newMember: Member) => void;
  onClose: () => void;
}

const COURT_PRESETS = [
  'Sân 1 - Kỳ Hòa',
  'Sân 2 - Kỳ Hòa',
  'Sân 3 - Kỳ Hòa',
  'Sân Viettel',
  'Sân Lan Anh',
  'Sân Bình Thạnh',
  'Sân Cầu Lông Tân Bình',
];

export const DailySessionModal: React.FC<DailySessionModalProps> = ({
  initialData,
  defaultDate,
  members,
  onSave,
  onDelete,
  onAddQuickMember,
  onClose,
}) => {
  const [date, setDate] = useState<string>('');
  const [courtName, setCourtName] = useState<string>('Sân 3 - Kỳ Hòa');
  const [courtFeeInput, setCourtFeeInput] = useState<string>('180000');
  const [courtPayerId, setCourtPayerId] = useState<string>('');

  const [shuttlecockCount, setShuttlecockCount] = useState<number>(4);
  const [shuttlecockPriceInput, setShuttlecockPriceInput] = useState<string>('25000');
  const [shuttlecockPayerId, setShuttlecockPayerId] = useState<string>('');

  const [drinkFeeInput, setDrinkFeeInput] = useState<string>('0');
  const [drinkPayerId, setDrinkPayerId] = useState<string>('');

  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [note, setNote] = useState<string>('');

  // Quick guest member input state
  const [quickGuestName, setQuickGuestName] = useState('');
  const [showQuickGuestInput, setShowQuickGuestInput] = useState(false);

  // Validation warning dialog
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setCourtName(initialData.courtName);
      setCourtFeeInput(initialData.courtFee.toString());
      setCourtPayerId(initialData.courtPayerId);
      setShuttlecockCount(initialData.shuttlecockCount || 0);
      setShuttlecockPriceInput((initialData.shuttlecockPricePerItem || 25000).toString());
      setShuttlecockPayerId(initialData.shuttlecockPayerId);
      setDrinkFeeInput((initialData.drinkFee || 0).toString());
      setDrinkPayerId(initialData.drinkPayerId || initialData.courtPayerId);
      setAttendeeIds(
        initialData.attendeeIds && initialData.attendeeIds.length > 0
          ? initialData.attendeeIds
          : members.map((m) => m.id)
      );
      setNote(initialData.note || '');
    } else {
      const targetDate = defaultDate || new Date().toISOString().split('T')[0];
      setDate(targetDate);
      setCourtName('Sân 3 - Kỳ Hòa');
      setCourtFeeInput('180000');
      setCourtPayerId(members[0]?.id || '');
      setShuttlecockCount(4);
      setShuttlecockPriceInput('25000');
      setShuttlecockPayerId(members[1]?.id || members[0]?.id || '');
      setDrinkFeeInput('0');
      setDrinkPayerId(members[0]?.id || '');
      // Default: check all permanent members or all members
      const permIds = members.filter((m) => m.isPermanent !== false).map((m) => m.id);
      setAttendeeIds(permIds.length > 0 ? permIds : members.map((m) => m.id));
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, defaultDate]);

  const numCourtFee = parseVNDInput(courtFeeInput);
  const numShuttlePrice = parseVNDInput(shuttlecockPriceInput);
  const totalShuttleFee = shuttlecockCount * numShuttlePrice;
  const numDrinkFee = parseVNDInput(drinkFeeInput);
  const totalSessionCost = numCourtFee + totalShuttleFee + numDrinkFee;
  const attendeeCount = attendeeIds.length;
  const costPerAttendee = attendeeCount > 0 ? totalSessionCost / attendeeCount : 0;

  const toggleAttendee = (mId: string) => {
    if (attendeeIds.includes(mId)) {
      if (attendeeIds.length > 1) {
        setAttendeeIds(attendeeIds.filter((id) => id !== mId));
      }
    } else {
      setAttendeeIds([...attendeeIds, mId]);
    }
  };

  const handleSelectAllAttendees = () => {
    setAttendeeIds(members.map((m) => m.id));
  };

  const handleSelectPermanentOnly = () => {
    const perm = members.filter((m) => m.isPermanent !== false).map((m) => m.id);
    setAttendeeIds(perm.length > 0 ? perm : members.map((m) => m.id));
  };

  const handleAddQuickGuest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const guestName = quickGuestName.trim();
    if (!guestName) return;

    const newGuest: Member = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: guestName,
      isPermanent: false,
    };

    if (onAddQuickMember) {
      onAddQuickMember(newGuest);
    }
    // Auto-check this new guest
    setAttendeeIds((prev) => [...prev, newGuest.id]);
    setQuickGuestName('');
    setShowQuickGuestInput(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtName.trim()) {
      setValidationError('Vui lòng nhập tên sân đánh!');
      return;
    }
    if (attendeeIds.length === 0) {
      setValidationError('Vui lòng tích chọn ít nhất 1 thành viên có mặt hôm nay để chia tiền!');
      return;
    }
    if (!courtPayerId) {
      setValidationError('Vui lòng chọn thành viên đã đứng ra thanh toán tiền sân!');
      return;
    }

    const dailySession: DailySession = {
      id: initialData
        ? initialData.id
        : `ds_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: date || new Date().toISOString().split('T')[0],
      courtName: courtName.trim(),
      courtFee: numCourtFee,
      courtPayerId: courtPayerId,
      shuttlecockCount: shuttlecockCount,
      shuttlecockPricePerItem: numShuttlePrice,
      shuttlecockPayerId: shuttlecockPayerId || courtPayerId,
      drinkFee: numDrinkFee > 0 ? numDrinkFee : undefined,
      drinkPayerId: numDrinkFee > 0 ? drinkPayerId : undefined,
      attendeeIds: attendeeIds,
      note: note.trim() || undefined,
    };

    onSave(dailySession);
    onClose();
  };

  const handleDeleteConfirmed = () => {
    if (initialData && onDelete) {
      onDelete(initialData.id);
      setIsDeleteConfirmOpen(false);
      onClose();
    }
  };

  return (
    <div
      id="daily-session-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="daily-session-modal-content"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-lg">
                {initialData ? 'Chỉnh Sửa Buổi Đánh Cầu' : 'Ghi Buổi Đánh Cầu'}
              </h3>
              <p className="text-xs text-slate-400">
                Sân đánh, số quả cầu đã dùng và điểm danh người có mặt
              </p>
            </div>
          </div>
          <button
            id="close-daily-session-modal-btn"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Ngày & Sân bãi */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>🏟️</span> 1. Thông Tin Sân Đánh & Tiền Thuê Sân
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Ngày đánh <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tên / Số sân <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  placeholder="VD: Sân 3 - Kỳ Hòa"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tiền thuê sân buổi này
                </label>
                <input
                  type="text"
                  value={courtFeeInput}
                  onChange={(e) => setCourtFeeInput(e.target.value)}
                  placeholder="VD: 180k, 200000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 font-mono focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick Court Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-medium">Gợi ý sân:</span>
              {COURT_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCourtName(p)}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                    courtName === p
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Ai đã trả / ứng tiền sân hôm nay? <span className="text-red-500">*</span>
              </label>
              <select
                value={courtPayerId}
                onChange={(e) => setCourtPayerId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isPermanent === false ? '(Vãng lai)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Cầu Lông Đã Đánh */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🏸</span> 2. Số Trái Cầu Đã Dùng Hôm Nay
              </span>
              <span className="font-mono text-xs font-bold text-indigo-600">
                Tổng tiền cầu: {formatVND(totalShuttleFee)}
              </span>
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Stepper for shuttlecock count */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Số trái cầu đã đánh
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setShuttlecockCount(Math.max(0, shuttlecockCount - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={shuttlecockCount}
                    onChange={(e) => setShuttlecockCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center font-mono text-sm font-bold text-slate-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShuttlecockCount(shuttlecockCount + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Price per shuttlecock */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Đơn giá / 1 quả cầu (đ)
                </label>
                <input
                  type="text"
                  value={shuttlecockPriceInput}
                  onChange={(e) => setShuttlecockPriceInput(e.target.value)}
                  placeholder="25000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 font-mono focus:border-indigo-500 focus:outline-hidden"
                />
                <div className="flex gap-1 mt-1">
                  {[22000, 25000, 27000, 30000].map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setShuttlecockPriceInput(pr.toString())}
                      className="rounded bg-white px-1.5 py-0.5 text-[9px] font-mono text-slate-600 border border-slate-200 hover:border-indigo-400 cursor-pointer"
                    >
                      {pr / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Shuttlecock Payer */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Ai mang cầu / chi tiền cầu?
                </label>
                <select
                  value={shuttlecockPayerId}
                  onChange={(e) => setShuttlecockPayerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Nước uống & Phụ thu */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>🥤</span> 3. Nước Uống / Phụ Phí Buổi (Tùy chọn)
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tiền nước uống hôm nay (đ)
                </label>
                <input
                  type="text"
                  value={drinkFeeInput}
                  onChange={(e) => setDrinkFeeInput(e.target.value)}
                  placeholder="0 (nếu không có)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 font-mono focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Người trả tiền nước
                </label>
                <select
                  value={drinkPayerId}
                  onChange={(e) => setDrinkPayerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 4. Điểm danh thành viên có mặt */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900">
                  4. Điểm Danh Có Mặt ({attendeeIds.length}/{members.length})
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllAttendees}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                >
                  Tất cả ({members.length})
                </button>
                <button
                  type="button"
                  onClick={handleSelectPermanentOnly}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cố định ({members.filter((m) => m.isPermanent !== false).length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickGuestInput(!showQuickGuestInput)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  <UserPlus className="h-3 w-3" />
                  + Thêm Khách
                </button>
              </div>
            </div>

            {/* Quick Guest Add Form */}
            {showQuickGuestInput && (
              <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2 animate-fade-in">
                <span className="text-[11px] font-bold text-indigo-900 block">
                  Thêm người đánh vãng lai hôm nay:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quickGuestName}
                    onChange={(e) => setQuickGuestName(e.target.value)}
                    placeholder="Nhập tên khách vãng lai (VD: Hoàng bạn Tuấn)..."
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuickGuest();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickGuest}
                    className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Thêm & Điểm Danh
                  </button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Chỉ những ai <strong className="text-indigo-600">tích chọn có mặt</strong> hôm nay mới cùng chia tiền sân ({formatVND(numCourtFee)}) và tiền cầu ({formatVND(totalShuttleFee)}). Ai vắng thì không phải chịu!
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-48 overflow-y-auto pt-1">
              {members.map((m) => {
                const isChecked = attendeeIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'border-indigo-500 bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'border-slate-200 bg-slate-100/70 text-slate-400 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAttendee(m.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="truncate">{m.name}</span>
                    {m.isPermanent === false && (
                      <span className="ml-auto rounded bg-slate-200 px-1 text-[9px] text-slate-600">
                        Khách
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Ghi chú thêm cho buổi này
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đánh đôi kéo dài 2 tiếng, bạn Nam về sớm..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Real-time calculation summary preview */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900 p-4 text-white">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 uppercase font-bold">Tổng chi phí buổi này:</span>
              <span className="font-mono text-base font-black text-indigo-300">
                {formatVND(totalSessionCost)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
              <span className="text-slate-400">
                Chia cho <strong className="text-white font-bold">{attendeeCount}</strong> người có mặt:
              </span>
              <span className="font-mono text-xl font-black text-emerald-400">
                {formatVND(costPerAttendee)} / người
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3">
          {/* Delete Button inside modal if editing an existing session */}
          {initialData && onDelete ? (
            <button
              type="button"
              id="delete-daily-session-btn"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4 text-rose-600" />
              Xóa Buổi Đánh
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              id="submit-daily-session-btn"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {initialData ? 'Lưu Thay Đổi' : 'Lưu Buổi Đánh'}
            </button>
          </div>
        </div>
      </div>

      {/* Validation Error Dialog */}
      {validationError && (
        <ConfirmDialog
          isOpen={true}
          type="warning"
          title="Thông Tin Chưa Đầy Đủ"
          message={validationError}
          confirmText="Đã hiểu"
          cancelText="Đóng"
          onConfirm={() => setValidationError(null)}
          onCancel={() => setValidationError(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && initialData && (
        <ConfirmDialog
          isOpen={true}
          type="danger"
          title="Xác Nhận Xóa Buổi Đánh Cầu?"
          message={
            <span>
              Bạn có chắc chắn muốn xóa buổi đánh ngày{' '}
              <strong className="text-slate-900">
                {initialData.date.split('-').slice(1).reverse().join('/')}
              </strong>{' '}
              tại <strong className="text-slate-900">{initialData.courtName}</strong>?
            </span>
          }
          details={[
            `Tổng chi phí: ${formatVND(totalSessionCost)}`,
            `Có ${initialData.attendeeIds?.length || 0} thành viên đã điểm danh`,
            'Số tiền quyết toán của các thành viên sẽ được cập nhật lại ngay lập tức',
          ]}
          confirmText="Xác nhận xóa"
          cancelText="Giữ lại buổi này"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </div>
  );
};
