'use client';

import React, { useEffect, useState } from 'react';
import { Check, Users, Plus, Minus, Loader2 } from 'lucide-react';
import type { DailySessionInput } from '../app/actions/daily-sessions';
import type { SessionDefaults, ViewDailySession, ViewMember } from '../lib/view-types';
import { formatVND, parseVNDInput } from '../lib/money';
import { vnDateStr } from '../lib/vn-time';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface DailySessionModalProps {
  members: ViewMember[];
  initialData: ViewDailySession | null;
  defaults: SessionDefaults;
  /** Courts in use, fed into the dropdown. When empty the form asks the user to add a court first. */
  courts: { id: string; name: string; defaultFee: number }[];
  defaultDate?: string;
  onSave: (input: DailySessionInput) => Promise<void>;
  onClose: () => void;
}

/** `initialData` when editing → `defaults` (the most recent session) when adding → empty. */
function pickText(...values: (string | number | null | undefined)[]): string {
  for (const v of values) {
    if (v !== null && v !== undefined && v !== '') return String(v);
  }
  return '';
}

const SHUTTLE_PRICE_CHIPS = [22000, 25000, 27000, 30000];

export const DailySessionModal: React.FC<DailySessionModalProps> = ({
  members,
  initialData,
  defaults,
  courts,
  defaultDate,
  onSave,
  onClose,
}) => {
  const today = vnDateStr();

  const [date, setDate] = useState<string>(initialData?.date ?? defaultDate ?? today);
  const [courtName, setCourtName] = useState<string>(
    pickText(initialData?.courtName, defaults?.courtName)
  );
  const [courtFeeInput, setCourtFeeInput] = useState<string>(
    pickText(initialData?.courtFee, defaults?.courtFee)
  );
  const [courtPayerId, setCourtPayerId] = useState<string>(
    pickText(initialData?.courtPayerId, defaults?.courtPayerId)
  );

  const [shuttlecockCountInput, setShuttlecockCountInput] = useState<string>(
    pickText(initialData?.shuttlecockCount, defaults?.shuttlecockCount)
  );
  const [shuttlecockPriceInput, setShuttlecockPriceInput] = useState<string>(
    pickText(initialData?.shuttlecockPricePerItem, defaults?.shuttlecockPricePerItem)
  );
  const [shuttlecockPayerId, setShuttlecockPayerId] = useState<string>(
    pickText(initialData?.shuttlecockPayerId, defaults?.shuttlecockPayerId)
  );
  const [overrideShuttleTotal, setOverrideShuttleTotal] = useState<boolean>(
    initialData?.shuttlecockTotalFee != null
  );
  const [shuttleTotalInput, setShuttleTotalInput] = useState<string>(
    pickText(initialData?.shuttlecockTotalFee)
  );

  const [drinkFeeInput, setDrinkFeeInput] = useState<string>(pickText(initialData?.drinkFee));
  const [drinkPayerId, setDrinkPayerId] = useState<string>(pickText(initialData?.drinkPayerId));
  const [otherFeeInput, setOtherFeeInput] = useState<string>(pickText(initialData?.otherFee));
  const [otherFeePayerId, setOtherFeePayerId] = useState<string>(
    pickText(initialData?.otherFeePayerId)
  );

  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    initialData?.attendeeIds ?? defaults?.attendeeIds ?? members.map((m) => m.id)
  );
  const [note, setNote] = useState<string>(initialData?.note ?? '');

  const [errors, setErrors] = useState<{
    courtName?: string;
    courtPayer?: string;
    attendees?: string;
    submit?: string;
  }>({});
  const [attendeeHint, setAttendeeHint] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // When the modal reopens for a different session (or a different date), reload the whole form.
  useEffect(() => {
    setDate(initialData?.date ?? defaultDate ?? vnDateStr());
    setCourtName(pickText(initialData?.courtName, defaults?.courtName));
    setCourtFeeInput(pickText(initialData?.courtFee, defaults?.courtFee));
    setCourtPayerId(pickText(initialData?.courtPayerId, defaults?.courtPayerId));
    setShuttlecockCountInput(
      pickText(initialData?.shuttlecockCount, defaults?.shuttlecockCount)
    );
    setShuttlecockPriceInput(
      pickText(initialData?.shuttlecockPricePerItem, defaults?.shuttlecockPricePerItem)
    );
    setShuttlecockPayerId(pickText(initialData?.shuttlecockPayerId, defaults?.shuttlecockPayerId));
    setOverrideShuttleTotal(initialData?.shuttlecockTotalFee != null);
    setShuttleTotalInput(pickText(initialData?.shuttlecockTotalFee));
    setDrinkFeeInput(pickText(initialData?.drinkFee));
    setDrinkPayerId(pickText(initialData?.drinkPayerId));
    setOtherFeeInput(pickText(initialData?.otherFee));
    setOtherFeePayerId(pickText(initialData?.otherFeePayerId));
    setAttendeeIds(initialData?.attendeeIds ?? defaults?.attendeeIds ?? members.map((m) => m.id));
    setNote(initialData?.note ?? '');
    setErrors({});
    setAttendeeHint(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, defaultDate]);

  const numCourtFee = parseVNDInput(courtFeeInput);
  const shuttlecockCount = Math.max(0, parseInt(shuttlecockCountInput, 10) || 0);
  const numShuttlePrice = parseVNDInput(shuttlecockPriceInput);
  const overriddenShuttleTotal = overrideShuttleTotal ? parseVNDInput(shuttleTotalInput) : null;
  const totalShuttleFee = overriddenShuttleTotal ?? shuttlecockCount * numShuttlePrice;
  // Starts the "extras" disclosure open when there is already something in
  // it, so editing a session never hides a fee or note that was recorded.
  const hasExtras = Boolean(
    (initialData?.drinkFee ?? 0) > 0 || (initialData?.otherFee ?? 0) > 0 || initialData?.note
  );

  const numDrinkFee = parseVNDInput(drinkFeeInput);
  const numOtherFee = parseVNDInput(otherFeeInput);
  const totalSessionCost = numCourtFee + totalShuttleFee + numDrinkFee + numOtherFee;
  const attendeeCount = attendeeIds.length;
  const costPerAttendee = attendeeCount > 0 ? totalSessionCost / attendeeCount : 0;

  const hasGuests = members.some((m) => m.isPermanent === false);
  const permanentCount = members.filter((m) => m.isPermanent !== false).length;

  const setCount = (n: number) => setShuttlecockCountInput(String(Math.max(0, n)));

  const toggleAttendee = (mId: string) => {
    if (attendeeIds.includes(mId)) {
      if (attendeeIds.length <= 1) {
        setAttendeeHint('Buổi đánh phải có ít nhất 1 người có mặt để chia tiền.');
        return;
      }
      setAttendeeHint(null);
      setAttendeeIds(attendeeIds.filter((id) => id !== mId));
    } else {
      setAttendeeHint(null);
      setAttendeeIds([...attendeeIds, mId]);
    }
  };

  const handleSelectAllAttendees = () => {
    setAttendeeHint(null);
    setAttendeeIds(members.map((m) => m.id));
  };

  const handleSelectPermanentOnly = () => {
    setAttendeeHint(null);
    const perm = members.filter((m) => m.isPermanent !== false).map((m) => m.id);
    setAttendeeIds(perm.length > 0 ? perm : members.map((m) => m.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const nextErrors: typeof errors = {};
    if (!courtName.trim()) nextErrors.courtName = 'Vui lòng chọn sân đánh!';
    if (!courtPayerId) {
      nextErrors.courtPayer = 'Vui lòng chọn thành viên đã đứng ra thanh toán tiền sân!';
    }
    if (attendeeIds.length === 0) {
      nextErrors.attendees =
        'Vui lòng tích chọn ít nhất 1 thành viên có mặt hôm nay để chia tiền!';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    const input: DailySessionInput = {
      ...(initialData ? { id: initialData.id } : {}),
      date: date || vnDateStr(),
      courtName: courtName.trim(),
      courtFee: numCourtFee,
      courtPayerId: courtPayerId || null,
      shuttlecockCount,
      shuttlecockPricePerItem: numShuttlePrice,
      shuttlecockTotalFee: overriddenShuttleTotal,
      shuttlecockPayerId: shuttlecockPayerId || courtPayerId || null,
      drinkFee: numDrinkFee,
      drinkPayerId: numDrinkFee > 0 ? drinkPayerId || null : null,
      otherFee: numOtherFee,
      otherFeePayerId: numOtherFee > 0 ? otherFeePayerId || null : null,
      note: note.trim() || null,
      attendeeIds,
    };

    setIsSaving(true);
    try {
      await onSave(input);
      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Lưu buổi đánh thất bại, vui lòng thử lại!',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl" id="daily-session-modal-content">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Chỉnh sửa buổi đánh' : 'Ghi buổi đánh'}
          </DialogTitle>
          <DialogDescription>
            Sân đánh, số quả cầu đã dùng và điểm danh người có mặt.
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <form
          id="daily-session-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5"
        >
          {/* 1. Date & court */}
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
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Sân đánh <span className="text-red-500">*</span>
                </label>
                <select
                  value={courtName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCourtName(name);
                    // Picking a court fills in that court's default fee. The session
                    // copies this number, so editing the court's fee later does not
                    // change the cost of sessions already recorded.
                    const court = courts.find((c) => c.name === name);
                    if (court) setCourtFeeInput(String(court.defaultFee));
                  }}
                  aria-invalid={!!errors.courtName}
                  className={`${inputClass} ${errors.courtName ? 'border-rose-400' : ''}`}
                >
                  <option value="">— Chọn sân —</option>
                  {/*
                    The court of the session being edited may have been disabled or
                    renamed; it still has to be listed, otherwise opening the edit
                    form shows an empty select and saving would lose the old court name.
                  */}
                  {!courts.some((c) => c.name === courtName) && courtName && (
                    <option value={courtName}>{courtName} (không còn trong danh sách)</option>
                  )}
                  {courts.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} — {formatVND(c.defaultFee)}
                    </option>
                  ))}
                </select>
                {errors.courtName && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.courtName}</p>
                )}
                {courts.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    Chưa có sân nào. Mở menu ba chấm trên thanh trên cùng, chọn
                    &ldquo;Quản lý sân&rdquo; để thêm.
                  </p>
                )}
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
                  className={`${inputClass} font-bold font-mono`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Ai đã trả / ứng tiền sân hôm nay? <span className="text-red-500">*</span>
              </label>
              <select
                value={courtPayerId}
                onChange={(e) => setCourtPayerId(e.target.value)}
                required
                aria-invalid={!!errors.courtPayer}
                className={`${inputClass} ${errors.courtPayer ? 'border-rose-400' : ''}`}
              >
                <option value="">-- Chọn người trả tiền sân --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isPermanent === false ? '(Vãng lai)' : ''}
                  </option>
                ))}
              </select>
              {errors.courtPayer && (
                <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors.courtPayer}</p>
              )}
            </div>
          </div>

          {/* 2. Shuttlecocks used */}
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
                    onClick={() => setCount(shuttlecockCount - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={shuttlecockCountInput}
                    onChange={(e) => setShuttlecockCountInput(e.target.value)}
                    onBlur={() => setCount(shuttlecockCount)}
                    className="w-full text-center font-mono text-sm font-bold text-slate-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setCount(shuttlecockCount + 1)}
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
                  placeholder="Đơn giá 1 quả"
                  className={`${inputClass} font-mono`}
                />
                <div className="flex gap-1 mt-1">
                  {SHUTTLE_PRICE_CHIPS.map((pr) => (
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
                  className={inputClass}
                >
                  <option value="">-- Như người trả tiền sân --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Override the shuttlecock total (for when the court owner charges a flat rate) */}
            <div className="space-y-2 border-t border-slate-200/70 pt-2">
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideShuttleTotal}
                  onChange={(e) => {
                    setOverrideShuttleTotal(e.target.checked);
                    if (e.target.checked && !shuttleTotalInput) {
                      setShuttleTotalInput(String(shuttlecockCount * numShuttlePrice));
                    }
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Nhập thẳng tổng tiền cầu (thay cho số quả × đơn giá)
              </label>
              {overrideShuttleTotal && (
                <input
                  type="text"
                  value={shuttleTotalInput}
                  onChange={(e) => setShuttleTotalInput(e.target.value)}
                  placeholder="VD: 100k, 100000"
                  className={`${inputClass} font-mono sm:w-1/3`}
                />
              )}
            </div>
          </div>

          {/*
            Drinks, other fees and the note live behind a disclosure. After
            three sessions nobody had used any of them, and an empty section
            with four inputs was most of the form's height on a phone. They
            open on their own when editing a session that has something in
            them, so nothing already recorded is ever hidden.
          */}
          <details
            open={hasExtras}
            className="group rounded-2xl border border-slate-200 bg-slate-50/60 open:bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-xs font-bold uppercase tracking-wider text-slate-600 marker:hidden [&::-webkit-details-marker]:hidden">
              <span>Thêm: nước, phụ phí, ghi chú</span>
              <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
          <div className="space-y-3 px-4 pb-4">

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
                  className={`${inputClass} font-mono`}
                />
              </div>

              {/* The drink payer only means anything when there actually is a drink cost */}
              {numDrinkFee > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Người trả tiền nước
                  </label>
                  <select
                    value={drinkPayerId}
                    onChange={(e) => setDrinkPayerId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- Chọn người trả tiền nước --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Phụ phí khác (đ)
                </label>
                <input
                  type="text"
                  value={otherFeeInput}
                  onChange={(e) => setOtherFeeInput(e.target.value)}
                  placeholder="0 (nếu không có)"
                  className={`${inputClass} font-mono`}
                />
              </div>

              {numOtherFee > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Người trả phụ phí
                  </label>
                  <select
                    value={otherFeePayerId}
                    onChange={(e) => setOtherFeePayerId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- Chọn người trả phụ phí --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đánh đôi kéo dài 2 tiếng, bạn Nam về sớm..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          </details>

          {/* 4. Attendance check-in */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900">
                  3. Điểm danh có mặt ({attendeeIds.length}/{members.length})
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
                {/* "Permanent" only differs from "All" when the group has guest members */}
                {hasGuests && (
                  <button
                    type="button"
                    onClick={handleSelectPermanentOnly}
                    className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cố định ({permanentCount})
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Chỉ những ai <strong className="text-indigo-600">tích chọn có mặt</strong> hôm nay mới cùng chia tiền sân ({formatVND(numCourtFee)}) và tiền cầu ({formatVND(totalShuttleFee)}). Ai vắng thì không phải chịu!
            </p>

            {attendeeHint && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
                {attendeeHint}
              </p>
            )}
            {errors.attendees && (
              <p className="text-[11px] font-semibold text-rose-600">{errors.attendees}</p>
            )}

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

          {errors.submit && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              {errors.submit}
            </p>
          )}
        </form>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="daily-session-form"
            id="submit-daily-session-btn"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isSaving ? 'Đang lưu...' : initialData ? 'Lưu thay đổi' : 'Lưu buổi đánh'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
