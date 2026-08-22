'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { CheckCircle2, ImagePlus, Link2Off, TriangleAlert } from 'lucide-react';
import { uploadQrViaLink } from '../app/actions/qr-upload';
import { toCompressedQrFile } from '../lib/image';

type Props =
  | { token: string; state: 'invalid' }
  | { token: string; state: 'ready'; name: string; currentQrUrl: string | null };

/**
 * What a member sees when they open their self-upload link: one job, pick an
 * image. No sign-in, no navigation, nothing else on the page.
 */
export function QrSelfUpload(props: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [doneFor, setDoneFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Success must win over "invalid". Redeeming the link marks it used, so a
  // refresh of this page after the upload sees a spent token and would
  // otherwise replace the confirmation with "link expired" — telling the
  // person their upload failed when it had just succeeded.
  if (doneFor !== null) {
    return (
      <Shell>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">Xong rồi</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
          Ảnh QR của <strong className="text-slate-900">{doneFor}</strong> đã được lưu. Mọi người
          trong nhóm giờ chuyển tiền cho bạn được rồi.
        </p>
      </Shell>
    );
  }

  if (props.state === 'invalid') {
    return (
      <Shell>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Link2Off className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">
          Link không còn hiệu lực
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
          Link chỉ dùng được một lần và trong 7 ngày. Nhờ quản lý nhóm gửi lại link mới nhé.
        </p>
      </Shell>
    );
  }

  const submit = () => {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const compressed = await toCompressedQrFile(file);
        await uploadQrViaLink(props.token, compressed);
        setDoneFor(props.name);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải lên được. Thử lại giúp.');
      }
    });
  };

  const shown = preview ?? props.currentQrUrl;

  return (
    <Shell>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Mã QR của</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{props.name}</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
        Chụp màn hình mã QR trong app ngân hàng hoặc MoMo, rồi chọn ảnh đó ở đây.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="mt-6 flex w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 transition-colors hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-60 cursor-pointer"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Ảnh QR"
            className="max-h-64 w-full rounded-xl object-contain"
          />
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Chọn ảnh QR</span>
          </>
        )}
        {shown && (
          <span className="text-xs font-semibold text-indigo-700">
            {preview ? 'Chọn ảnh khác' : 'Đây là ảnh đang dùng — chọn ảnh mới để thay'}
          </span>
        )}
      </button>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 text-left text-xs font-semibold text-rose-700">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!file || isPending}
        className="mt-4 w-full max-w-xs rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {isPending ? 'Đang tải lên...' : 'Lưu ảnh QR'}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      {children}
    </main>
  );
}
