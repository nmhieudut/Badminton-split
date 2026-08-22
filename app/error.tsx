'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { reportClientError } from './actions/client-error';

/**
 * The last safety net.
 *
 * Every operation already catches its own errors and shows the message right
 * inside the form. But if an error ever slips past all of them, the user must
 * still get a page they can read and click, not a blank screen — especially
 * when they are at the court and only want to finish recording the session.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[trang lỗi]', error.message, error.digest ?? '');
    // Also to the server log, where an operator can actually read it — a
    // browser console on someone else's phone is not something anyone sees.
    reportClientError({
      message: error.message,
      digest: error.digest,
      path: window.location.pathname,
      stack: error.stack,
      translated: isPageTranslated(),
    }).catch(() => {
      // Reporting must never itself become a second error.
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-bold text-slate-900">Có gì đó trục trặc</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Thao tác vừa rồi không hoàn tất. Dữ liệu của bạn vẫn nguyên vẹn — thử lại
        thường là xong.
      </p>
      {/* The digest pairs this screen with the matching server log line. It is
          an opaque hash, safe to show, and is what to quote when reporting. */}
      {error.digest && (
        <p className="tabular mt-3 font-mono text-[11px] text-slate-400">Mã lỗi: {error.digest}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
        <a
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Về trang chính
        </a>
      </div>
    </div>
  );
}

/**
 * Whether the browser has machine-translated this page.
 *
 * Chrome marks the document element when its own translator runs, and every
 * translator rewrites text into <font> wrappers. Either sign means the DOM was
 * changed underneath React, which explains a commit-phase error whose stack
 * contains no application code.
 */
function isPageTranslated(): boolean {
  try {
    const html = document.documentElement;
    return (
      /translated-(ltr|rtl)/.test(html.className) ||
      html.hasAttribute('_msttexthash') ||
      document.querySelector('font[_mstmutation], font[style]') !== null
    );
  } catch {
    return false;
  }
}
