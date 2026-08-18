'use client';

import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare, Sparkles } from 'lucide-react';

interface ZaloReportModalProps {
  /** Report text already generated on the server (lib/settlement/report.ts). */
  report: string;
  onClose: () => void;
}

export const ZaloReportModal: React.FC<ZaloReportModalProps> = ({ report, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Browser blocked the clipboard: the text stays on screen so the user can select it manually.
    }
  };

  return (
    <div
      id="zalo-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="zalo-report-modal-content"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-lg">Báo Cáo Tổng Kết Chia Tiền</h3>
              <p className="text-xs text-slate-300">
                Được định dạng sẵn văn bản, chi tiết tiền của từng người
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-2 rounded-2xl bg-indigo-50/60 p-3 text-xs text-indigo-900 border border-indigo-100">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>Chỉ cần sao chép và dán trực tiếp vào nhóm Zalo, Messenger hoặc Telegram.</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 font-mono text-xs text-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner max-h-[50vh] overflow-y-auto select-all">
            {report}
          </div>
        </div>

        {/* Footer: a single copy button */}
        <div className="flex justify-end items-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Đóng
          </button>
          <button
            type="button"
            id="copy-zalo-modal-main-btn"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Đã sao chép' : 'Sao chép văn bản'}
          </button>
        </div>
      </div>
    </div>
  );
};
