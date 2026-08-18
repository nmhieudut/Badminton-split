'use client';

import React, { useState } from 'react';
import type {
  SessionDefaults,
  ViewDailySession,
  ViewMember,
  ViewSettlementRow,
} from '../lib/view-types';
import type { DailySessionInput } from '../app/actions/daily-sessions';
import { deleteDailySession, saveDailySession } from '../app/actions/daily-sessions';
import { DailySessionList } from './DailySessionList';
import { DailySessionModal } from './DailySessionModal';
import { SessionDetailModal } from './SessionDetailModal';
import { isNavigationError, errorMessage } from '../lib/navigation-error';

interface DailySessionsTabProps {
  monthKey: string;
  members: ViewMember[];
  sessions: ViewDailySession[];
  defaults: SessionDefaults;
  settlementRows: ViewSettlementRow[];
  courts: { id: string; name: string; defaultFee: number }[];
  /** Người xem có quyền ghi hay không. Chốt chặn thật nằm ở Server Action. */
  isAdmin: boolean;
}

/**
 * Trạng thái của form ghi buổi đánh.
 * - `create`: buổi mới, có thể kèm ngày được chọn sẵn từ lịch.
 * - `edit`: sửa buổi đã có (giữ nguyên id khi lưu).
 * - `duplicate`: điền sẵn dữ liệu của buổi cũ nhưng lưu thành buổi mới (bỏ id),
 *   để người dùng tự chọn ngày thay vì đoán "+2 ngày" rồi phải vào sửa lại.
 */
type ModalState =
  | { mode: 'create'; session: null; defaultDate?: string }
  | { mode: 'edit'; session: ViewDailySession }
  | { mode: 'duplicate'; session: ViewDailySession };

export const DailySessionsTab: React.FC<DailySessionsTabProps> = ({
  monthKey,
  members,
  sessions,
  defaults,
  settlementRows,
  courts,
  isAdmin,
}) => {
  const [modal, setModal] = useState<ModalState | null>(null);
  // Người không sửa được vẫn phải xem được buổi đánh gồm những gì.
  const [xemChiTiet, setXemChiTiet] = useState<ViewDailySession | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const handleSave = async (input: DailySessionInput) => {
    // Nhân bản luôn ghi thành buổi mới, dù form được điền từ một buổi đã có.
    const payload: DailySessionInput =
      modal?.mode === 'duplicate' ? { ...input, id: undefined } : input;
    await saveDailySession(monthKey, payload);
    setModal(null);
  };

  const handleDelete = async (sessionId: string) => {
    // Xác nhận đã được hỏi một lần duy nhất trong DailySessionList.
    // Bắt lỗi tại đây là bắt buộc: hàm này được gọi kiểu "thả trôi" (void ...),
    // nên lỗi không ai bắt sẽ thành unhandled rejection và làm sập cả trang.
    setLoi(null);
    try {
      await deleteDailySession(monthKey, sessionId);
    } catch (e) {
      if (isNavigationError(e)) throw e;
      setLoi(errorMessage(e, 'Không xóa được buổi đánh. Thử lại giúp.'));
    }
  };

  return (
    <>
      {loi && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
          {loi}
        </p>
      )}

      <DailySessionList
        monthKey={monthKey}
        sessions={sessions}
        members={members}
        settlementRows={settlementRows}
        isAdmin={isAdmin}
        onAddSession={(dateStr) => setModal({ mode: 'create', session: null, defaultDate: dateStr })}
        onEditSession={(session) =>
          isAdmin ? setModal({ mode: 'edit', session }) : setXemChiTiet(session)
        }
        onDeleteSession={(sessionId) => {
          void handleDelete(sessionId);
        }}
        onDuplicateSession={(session) => setModal({ mode: 'duplicate', session })}
      />

      {modal && (
        <DailySessionModal
          members={members}
          initialData={modal.mode === 'create' ? null : modal.session}
          defaults={defaults}
          courts={courts}
          defaultDate={modal.mode === 'create' ? modal.defaultDate : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {xemChiTiet && (
        <SessionDetailModal
          session={xemChiTiet}
          members={members}
          onClose={() => setXemChiTiet(null)}
        />
      )}
    </>
  );
};
