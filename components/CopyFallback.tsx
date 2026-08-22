'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface CopyFallbackProps {
  title: string;
  text: string;
  onClose: () => void;
}

/**
 * Shown when the clipboard refuses the write, so the text can still be copied
 * by hand.
 *
 * This replaces a `window.prompt`, which blocks the whole page until it is
 * dismissed — a native dialog nobody expects, and one that froze the page hard
 * enough that even the debugger could not reach it. The browser blocks
 * clipboard writes whenever the page is not focused, which happens routinely,
 * so this path is reached in normal use and has to behave like the rest of the
 * app.
 */
export function CopyFallback({ title, text, onClose }: CopyFallbackProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Preselected, so copying is one keystroke.
    areaRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-slate-700">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        ref={areaRef}
        readOnly
        value={text}
        rows={Math.min(6, text.split('\n').length + 1)}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white p-2 font-mono text-[11px] text-slate-800 focus:border-indigo-500 focus:outline-hidden"
      />
      <p className="mt-1 text-[11px] text-slate-500">
        Trình duyệt không cho sao chép tự động. Bấm vào ô trên rồi sao chép thủ công.
      </p>
    </div>
  );
}
