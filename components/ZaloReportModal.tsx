'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl" id="zalo-report-modal-content">
        <DialogHeader>
          <DialogTitle>Báo cáo gửi nhóm</DialogTitle>
          <DialogDescription>
            Sao chép rồi dán thẳng vào Zalo, Messenger hoặc Telegram.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <pre className="tabular select-all whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
            {report}
          </pre>
        </DialogBody>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            id="copy-zalo-modal-main-btn"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Đã sao chép' : 'Sao chép văn bản'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
