'use client';

import React from 'react';
import { X } from 'lucide-react';
import { QrSaveButton } from '../QrSaveButton';

interface QrLightboxProps {
  name: string;
  url: string;
  onClose: () => void;
}

export const QrLightbox: React.FC<QrLightboxProps> = ({ name, url, onClose }) => (
  <div
    className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-fade-in"
    onClick={onClose}
  >
    <div
      className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-3 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h4 className="font-bold text-slate-900 text-sm">Mã QR: {name}</h4>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`QR ${name}`}
        className="max-h-72 w-full object-contain rounded-xl bg-white p-2 border border-slate-200"
      />
      {/* App ngân hàng cho tải ảnh QR lên, nên phải lưu được về máy. */}
      <div className="flex justify-center">
        <QrSaveButton url={url} tenNguoi={name} />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
      >
        Đóng
      </button>
    </div>
  </div>
);
