'use client';

import React, { useState, useTransition } from 'react';
import { Check, Link2 } from 'lucide-react';
import { createQrUploadLink } from '../../app/actions/qr-upload';
import { CopyFallback } from '../CopyFallback';

interface QrLinkButtonProps {
  memberId: string;
  memberName: string;
  onError: (message: string) => void;
}

/**
 * Mints a self-upload link and puts a ready-to-paste Zalo message on the
 * clipboard. The message carries the link and tells the person what to do
 * with it, so the admin does not have to type an explanation every time.
 */
export function QrLinkButton({ memberId, memberName, onError }: QrLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const send = () => {
    startTransition(async () => {
      try {
        const token = await createQrUploadLink(memberId);
        const url = `${window.location.origin}/qr/${token}`;
        const message =
          `${memberName} ơi, gửi ảnh QR ngân hàng/MoMo giúp nhóm chuyển tiền cho bạn nhé.\n` +
          `Mở link này trên điện thoại rồi chọn ảnh là xong, không cần đăng nhập:\n${url}\n` +
          `(Link dùng được 7 ngày)`;

        try {
          await navigator.clipboard.writeText(message);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          // Clipboard blocked — routine when the page is not focused. Show the
          // text in the page instead of a native prompt, which freezes it.
          setFallback(message);
        }
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Không tạo được link. Thử lại giúp.');
      }
    });
  };

  if (fallback) {
    return (
      <CopyFallback
        title={`Link cho ${memberName}`}
        text={fallback}
        onClose={() => setFallback(null)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={isPending}
      title="Tạo link để người này tự tải QR lên, không cần đăng nhập"
      className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline cursor-pointer disabled:opacity-50"
    >
      {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
      {isPending ? 'Đang tạo...' : copied ? 'Đã sao chép tin nhắn' : 'Gửi link tự tải QR'}
    </button>
  );
}
