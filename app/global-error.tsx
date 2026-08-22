'use client';

import { reportClientError } from './actions/client-error';
import { useEffect } from 'react';

/**
 * Catches errors thrown in the root layout as well — the place app/error.tsx
 * cannot reach.
 *
 * Because the root layout itself is broken, this file has to render its own
 * <html> and <body> and cannot use anything from the layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[lỗi toàn cục]', error.message, error.digest ?? '');
    reportClientError({
      message: error.message,
      digest: error.digest,
      path: window.location.pathname,
      stack: error.stack,
    }).catch(() => {
      // Reporting must never itself become a second error.
    });
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          textAlign: 'center',
          color: '#1e293b',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Có gì đó trục trặc</h1>
          <p style={{ marginTop: '.5rem', fontSize: '.875rem', color: '#64748b' }}>
            Dữ liệu của bạn vẫn nguyên vẹn. Thử tải lại trang giúp.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              borderRadius: '.75rem',
              background: '#4f46e5',
              color: '#fff',
              padding: '.625rem 1rem',
              fontSize: '.75rem',
              fontWeight: 700,
              border: 0,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
