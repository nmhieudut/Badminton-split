'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { createCourt, deleteCourt, toggleCourtActive, updateCourt } from '../app/actions/courts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { formatVND, parseVNDInput } from '../lib/money';

export interface CourtRow {
  id: string;
  name: string;
  defaultFee: number;
  isActive: boolean;
}

export function CourtsModal({
  rows,
  onClose,
}: {
  rows: CourtRow[];
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [newFee, setNewFee] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!isMounted) return null;

  const run = (fn: () => Promise<void>, onDone?: () => void) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        onDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không lưu được.');
      }
    });
  };

  const startEdit = (s: CourtRow) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditFee(String(s.defaultFee));
    setError(null);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quản lý sân</DialogTitle>
          <DialogDescription>
            Giá ở đây chỉ là mặc định khi ghi buổi mới. Sửa giá không làm đổi tiền của
            những buổi đã ghi.
          </DialogDescription>
        </DialogHeader>

        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-5">
          {rows.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
              Chưa có sân nào. Thêm sân đầu tiên ở bên dưới.
            </li>
          )}

          {rows.map((s) =>
            editingId === s.id ? (
              <li key={s.id} className="rounded-xl border border-indigo-300 bg-indigo-50/40 p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-hidden"
                    placeholder="Tên sân"
                  />
                  <input
                    value={editFee}
                    onChange={(e) => setEditFee(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm sm:w-32 focus:border-indigo-400 focus:outline-hidden"
                    placeholder="180k"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(
                        () =>
                          updateCourt(s.id, {
                            name: editName,
                            defaultFee: parseVNDInput(editFee),
                          }),
                        () => setEditingId(null)
                      )
                    }
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={s.id}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                  s.isActive ? 'border-slate-200' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <span className="min-w-0">
                  <span
                    className={`block truncate text-sm font-semibold ${
                      s.isActive ? 'text-slate-800' : 'text-slate-400 line-through'
                    }`}
                  >
                    {s.name}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {formatVND(s.defaultFee)}
                    {!s.isActive && ' · đã tắt'}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startEdit(s)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-60"
                    aria-label={`Sửa ${s.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => toggleCourtActive(s.id, !s.isActive))}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-60"
                    aria-label={s.isActive ? `Tắt ${s.name}` : `Bật lại ${s.name}`}
                  >
                    {s.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => deleteCourt(s.id))}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    aria-label={`Xóa ${s.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            )
          )}
        </ul>

        <div className="border-t border-slate-100 p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tên sân, ví dụ Arena 3"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-hidden"
            />
            <input
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              placeholder="180k"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-32 focus:border-indigo-400 focus:outline-hidden"
            />
            <button
              type="button"
              disabled={isPending || !newName.trim()}
              onClick={() =>
                run(
                  () => createCourt({ name: newName, defaultFee: parseVNDInput(newFee) }),
                  () => {
                    setNewName('');
                    setNewFee('');
                  }
                )
              }
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Thêm
            </button>
          </div>

          {error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
