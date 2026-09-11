'use client';

import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

interface QrZoomImageProps {
  src: string;
  alt: string;
  /** Classes for the thumbnail as it sits in the page. */
  className?: string;
}

/**
 * A QR image that opens full screen when tapped.
 *
 * The thumbnails are sized to fit a card, which is too small to scan reliably
 * from another phone held across a table — people end up pinching and panning.
 * Tapping shows the code as large as the screen allows, on white, with nothing
 * else around it; tapping anywhere closes it again.
 */
export function QrZoomImage({ src, alt, className }: QrZoomImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Phóng to ${alt}`}
        className="group relative block w-full cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <img src={src} alt={alt} className={className} />
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white opacity-80 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3 w-3" />
          Phóng to
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          // Full screen on every size: the whole point is the largest possible
          // code. The sheet and centred-card defaults are overridden here.
          className="inset-0 bottom-0 top-0 max-h-none w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-white p-0 sm:left-0 sm:top-0 sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-none"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng ảnh phóng to"
            className="flex h-full w-full cursor-zoom-out items-center justify-center p-4"
          >
            <img
              src={src}
              alt={alt}
              // Fill the screen, not just cap at it: max-* alone leaves the image
              // at its natural size, which on a phone is barely bigger than the
              // thumbnail. object-contain keeps the whole code in view.
              className="h-full w-full object-contain"
            />
          </button>
          <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white">
            <X className="h-3.5 w-3.5" />
            Chạm để đóng
          </span>
        </DialogContent>
      </Dialog>
    </>
  );
}
