import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle,
  FileJson,
  Trash2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { MonthSession } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface BackupRestoreModalProps {
  sessions: MonthSession[];
  onImportSessions: (newSessions: MonthSession[]) => void;
  onResetToDemo: () => void;
  onClearAllToBlank: () => void;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  sessions,
  onImportSessions,
  onResetToDemo,
  onClearAllToBlank,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearBlankConfirmOpen, setIsClearBlankConfirmOpen] = useState(false);

  const handleExport = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(sessions, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `badminton_split_backup_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSuccessMsg('Đã tải xuống file sao lưu JSON thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg('Không thể xuất dữ liệu: ' + String(err));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].monthKey) {
          onImportSessions(parsed);
          setSuccessMsg('Khôi phục dữ liệu từ file thành công!');
          setTimeout(() => {
            setSuccessMsg(null);
            onClose();
          }, 1500);
        } else {
          setErrorMsg('File JSON không đúng định dạng sao lưu của ứng dụng!');
        }
      } catch (err) {
        setErrorMsg('Lỗi khi đọc file JSON: ' + String(err));
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = () => {
    onResetToDemo();
    setIsResetConfirmOpen(false);
    setSuccessMsg('Đã nạp dữ liệu mẫu!');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1500);
  };

  const handleConfirmClearBlank = () => {
    onClearAllToBlank();
    setIsClearBlankConfirmOpen(false);
    setSuccessMsg('Đã xóa sạch và làm mới từ đầu!');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1500);
  };

  return (
    <div
      id="backup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="backup-modal-card"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 sm:px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-base sm:text-lg">Sao Lưu & Dữ Liệu</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Notice */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-0.5 leading-relaxed">
              <p className="font-semibold text-slate-900">Tự động đồng bộ và lưu trữ</p>
              <p>
                Dữ liệu các buổi đánh, tiền sân, quả cầu và tiền quỹ luôn được tự động lưu trữ an toàn. Bạn có thể xuất file dự phòng bên dưới bất cứ lúc nào.
              </p>
            </div>
          </div>

          {/* Export / Import Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 flex flex-col justify-between shadow-2xs">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Xuất File Dự Phòng
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Tải toàn bộ kỳ đánh về máy dưới dạng tệp JSON để lưu trữ.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Xuất file JSON</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 flex flex-col justify-between shadow-2xs">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Nhập File Khôi Phục
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Khôi phục hoặc chuyển đổi dữ liệu từ tệp JSON đã xuất trước đó.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Chọn file JSON</span>
              </button>
            </div>
          </div>

          {/* Reset & Demo Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Khởi Tạo / Dữ Liệu Mẫu
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setIsClearBlankConfirmOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Làm mới trang trắng</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Nạp dữ liệu mẫu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 sm:px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Blank Reset */}
      {isClearBlankConfirmOpen && (
        <ConfirmDialog
          isOpen={true}
          type="danger"
          title="Xóa Sạch Dữ Liệu & Làm Mới?"
          message="Bạn có chắc chắn muốn xóa toàn bộ dữ liệu và bắt đầu lại với một kỳ đánh hoàn toàn trống? Hãy xuất file sao lưu trước nếu cần giữ lại dữ liệu."
          confirmText="Xác nhận làm mới"
          cancelText="Hủy"
          onConfirm={handleConfirmClearBlank}
          onCancel={() => setIsClearBlankConfirmOpen(false)}
        />
      )}

      {/* Confirmation Dialog for Demo Data */}
      {isResetConfirmOpen && (
        <ConfirmDialog
          isOpen={true}
          type="warning"
          title="Nạp Dữ Liệu Mẫu (Demo)?"
          message="Dữ liệu hiện tại sẽ được thay thế bằng dữ liệu ví dụ mẫu (nhóm bạn đánh cầu lông tháng 8)."
          confirmText="Đồng ý nạp mẫu"
          cancelText="Hủy"
          onConfirm={handleConfirmReset}
          onCancel={() => setIsResetConfirmOpen(false)}
        />
      )}
    </div>
  );
};
