'use client';

import { useEffect } from 'react';

/**
 * Bắt cả lỗi xảy ra trong layout gốc — chỗ mà app/error.tsx không với tới.
 *
 * Vì layout gốc đã hỏng nên tệp này phải tự dựng lại <html> và <body>, và
 * không dùng được bất cứ thứ gì từ layout.
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
