'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

/** Bỏ dấu tiếng Việt để tên tệp không bị mã hóa loạn trên máy khác. */
function boDau(s: string): string {
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
 * Lưu ảnh QR của một người về máy.
 *
 * Có lý do thực tế: app ngân hàng cho tải ảnh QR lên để quét, nên người dùng
 * cần file nằm sẵn trong máy chứ không chỉ nhìn thấy trên màn hình.
 *
 * Trên điện thoại thử dùng bảng chia sẻ trước — người dùng lưu thẳng vào Ảnh
 * hoặc mở luôn bằng app ngân hàng, đỡ phải đi tìm trong thư mục Tải về. Trình
 * duyệt nào không hỗ trợ thì rơi xuống cách tải tệp thông thường.
 */
export function QrSaveButton({
  url,
  tenNguoi,
  className,
}: {
  url: string;
  tenNguoi: string;
  className?: string;
}) {
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState(false);

  const luu = async () => {
    setDangTai(true);
    setLoi(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      const duoi = blob.type.includes('png') ? 'png' : 'jpg';
      const tenTep = `qr-${boDau(tenNguoi) || 'thanh-vien'}.${duoi}`;
      const file = new File([blob], tenTep, { type: blob.type || 'image/jpeg' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Mã QR của ${tenNguoi}` });
          return;
        } catch (e) {
          // Người dùng bấm hủy thì dừng hẳn, đừng tải thêm một bản nữa.
          if ((e as Error)?.name === 'AbortError') return;
        }
      }

      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = tenTep;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      setLoi(true);
    } finally {
      setDangTai(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={luu}
        disabled={dangTai}
        className={
          className ??
          'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60'
        }
      >
        {dangTai ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {dangTai ? 'Đang lưu...' : 'Lưu ảnh QR'}
      </button>
      {loi && (
        <span className="text-[11px] font-semibold text-rose-600">
          Không tải được ảnh. Thử lại giúp.
        </span>
      )}
    </span>
  );
}
