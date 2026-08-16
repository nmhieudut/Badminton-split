'use client';

import React, { useState } from 'react';
import { Sparkles, TriangleAlert } from 'lucide-react';

interface BulkAddPanelProps {
  /** Tên đã có trong kỳ này, để không thêm trùng. */
  existingNames: string[];
  isPending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (names: string[]) => void;
}

/** Tách danh sách dán từ Zalo: bỏ số thứ tự, gạch đầu dòng và tên trùng nhau. */
export function parsePastedNames(raw: string, existingNames: string[] = []): string[] {
  const seen = new Set(existingNames.map((n) => n.toLowerCase()));
  const out: string[] = [];
  raw
    .split(/[\n,;]+/)
    .map((s) => s.replace(/^[0-9.\-*+\s]+/, '').trim())
    .filter((s) => s.length > 0)
    .forEach((n) => {
      const key = n.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(n);
      }
    });
  return out;
}

export const BulkAddPanel: React.FC<BulkAddPanelProps> = ({
  existingNames,
  isPending,
  errorMessage,
  onCancel,
  onSubmit,
}) => {
  const [bulkText, setBulkText] = useState('');
  const parsed = parsePastedNames(bulkText, existingNames);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 max-w-2xl mx-auto shadow-2xs space-y-4">
      <div>
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Dán Nhanh Danh Sách Từ Nhóm Zalo
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          Dán danh sách tên (cách nhau bởi dấu phẩy hoặc xuống dòng). Hệ thống tự động lọc số
          thứ tự và loại bỏ tên trùng.
        </p>
      </div>

      <textarea
        rows={6}
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        disabled={isPending}
        placeholder={`1. Hoàng Nam
2. Tuấn
3. Minh Đức, Khánh Linh, Hải Đăng`}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-hidden font-mono disabled:opacity-60"
      />

      {parsed.length > 0 && (
        <p className="text-[11px] text-slate-500">
          Sẽ thêm <strong className="text-slate-800">{parsed.length}</strong> người. Ảnh QR
          cần tải lên riêng cho từng người sau khi thêm.
        </p>
      )}

      {errorMessage && (
        <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={() => onSubmit(parsed)}
          disabled={isPending || parsed.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-2xs hover:bg-indigo-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isPending ? 'Đang thêm...' : 'Thêm Toàn Bộ'}
        </button>
      </div>
    </div>
  );
};
