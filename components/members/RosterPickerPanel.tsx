'use client';

import React, { useMemo, useState } from 'react';
import { Check, QrCode, Search, TriangleAlert, UserPlus, Users } from 'lucide-react';
import type { RosterEntry } from './types';

interface RosterPickerPanelProps {
  roster: RosterEntry[];
  isPending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  /** Called with the ids ticked. Never called with an empty list. */
  onSubmit: (memberIds: string[]) => void;
  /** Switches to the form for someone who has never been in the roster. */
  onCreateNew: () => void;
}

/**
 * Picks people out of the shared roster into the current period.
 *
 * It only ever adds. Removing someone stays on their card in the list, where
 * the confirmation showing what they have already paid lives — a checkbox that
 * silently dropped a person who had money in the period would be too easy to
 * hit by accident.
 */
export const RosterPickerPanel: React.FC<RosterPickerPanelProps> = ({
  roster,
  isPending,
  errorMessage,
  onCancel,
  onSubmit,
  onCreateNew,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const available = useMemo(() => roster.filter((m) => !m.inMonth), [roster]);
  const alreadyInCount = roster.length - available.length;

  const visible = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.phone ?? '').includes(q)
    );
  }, [available, searchTerm]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visible.length > 0 && visible.every((m) => selected.has(m.id));

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((m) => next.delete(m.id));
      else visible.forEach((m) => next.add(m.id));
      return next;
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Users className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900">Chọn từ danh sách thành viên</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Tick những ai có đánh trong kỳ này. Ảnh QR và số điện thoại của họ được giữ nguyên
            từ trước, không phải nhập lại.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>{errorMessage}</span>
        </div>
      )}

      {available.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
          <p className="text-xs text-slate-500">
            {roster.length === 0
              ? 'Danh sách thành viên đang trống. Hãy tạo người mới.'
              : 'Mọi người trong danh sách đều đã có trong kỳ này rồi.'}
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tạo người mới
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, SĐT..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            {visible.length > 0 && (
              <button
                type="button"
                onClick={toggleAllVisible}
                className="self-start rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 cursor-pointer sm:self-auto"
              >
                {allVisibleSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${visible.length})`}
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
              Không tìm thấy ai phù hợp với từ khóa.
            </p>
          ) : (
            <ul className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {visible.map((m) => {
                const isOn = selected.has(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      aria-pressed={isOn}
                      className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                        isOn
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isOn
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isOn && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-900">
                          {m.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {m.phone || (m.isPermanent ? 'Cố định' : 'Vãng lai')}
                        </span>
                      </span>
                      {m.hasQr ? (
                        <span
                          title="Đã có ảnh QR"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span
                          title="Chưa có ảnh QR"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-xs text-slate-400">
            {alreadyInCount > 0 && `${alreadyInCount} người đã có trong kỳ này. `}
            Không thấy ai đó?{' '}
            <button
              type="button"
              onClick={onCreateNew}
              className="font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              Tạo người mới
            </button>
          </p>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              disabled={isPending || selected.size === 0}
              onClick={() => onSubmit([...selected])}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isPending
                ? 'Đang thêm...'
                : selected.size === 0
                  ? 'Chọn ít nhất một người'
                  : `Thêm ${selected.size} người vào kỳ`}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </>
      )}
    </div>
  );
};
