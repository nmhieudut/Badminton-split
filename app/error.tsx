'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Lưới an toàn cuối cùng.
 *
 * Mọi thao tác đều đã bắt lỗi tại chỗ và hiện thông báo ngay trong biểu mẫu.
 * Nhưng nếu có một lỗi nào lọt qua hết, người dùng vẫn phải thấy một trang đọc
 * được và bấm được, chứ không phải màn hình trắng — nhất là khi họ đang ở sân
 * và chỉ muốn ghi nốt buổi đánh.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Chi tiết vào log của server, người dùng chỉ thấy câu chung.
    console.error('[trang lỗi]', error.message, error.digest ?? '');
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-bold text-slate-900">Có gì đó trục trặc</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Thao tác vừa rồi không hoàn tất. Dữ liệu của bạn vẫn nguyên vẹn — thử lại
        thường là xong.
      </p>

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
