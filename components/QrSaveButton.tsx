'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

/** Strip Vietnamese diacritics so the file name is not mangled on other machines. */
function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Save someone's QR image to the device.
 *
 * There is a practical reason for this: banking apps let you upload a QR image
 * to scan it, so the user needs the file sitting on their device, not just
 * something visible on screen.
 *
 * On phones, try the share sheet first — the user can save straight to Photos
 * or open the image directly in their banking app, instead of hunting for it in
 * the Downloads folder. Browsers that do not support it fall back to a regular
 * file download.
 */
export function QrSaveButton({
  url,
  personName: personName,
  className,
}: {
  url: string;
  personName: string;
  className?: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setHasError(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      const extension = blob.type.includes('png') ? 'png' : 'jpg';
      const fileName = `qr-${stripDiacritics(personName) || 'thanh-vien'}.${extension}`;
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Mã QR của ${personName}` });
          return;
        } catch (e) {
          // If the user hits cancel, stop entirely — do not download a second copy.
          if ((e as Error)?.name === 'AbortError') return;
        }
      }

      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        className={
          className ??
          'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60'
        }
      >
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {isSaving ? 'Đang lưu...' : 'Lưu ảnh QR'}
      </button>
      {hasError && (
        <span className="text-[11px] font-semibold text-rose-600">
          Không tải được ảnh. Thử lại giúp.
        </span>
      )}
    </span>
  );
}
