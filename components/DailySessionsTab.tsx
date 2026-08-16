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

interface DailySessionsTabProps {
  monthKey: string;
  members: ViewMember[];
  sessions: ViewDailySession[];
  defaults: SessionDefaults;
  settlementRows: ViewSettlementRow[];
  danhSachSan: { id: string; name: string; defaultFee: number }[];
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
  danhSachSan,
  isAdmin,
}) => {
  const [modal, setModal] = useState<ModalState | null>(null);

  const handleSave = async (input: DailySessionInput) => {
    // Nhân bản luôn ghi thành buổi mới, dù form được điền từ một buổi đã có.
    const payload: DailySessionInput =
      modal?.mode === 'duplicate' ? { ...input, id: undefined } : input;
    await saveDailySession(monthKey, payload);
    setModal(null);
  };

  const handleDelete = async (sessionId: string) => {
    // Xác nhận đã được hỏi một lần duy nhất trong DailySessionList.
    await deleteDailySession(monthKey, sessionId);
  };

  return (
    <>
      <DailySessionList
        monthKey={monthKey}
        sessions={sessions}
        members={members}
        settlementRows={settlementRows}
        isAdmin={isAdmin}
        onAddSession={(dateStr) => setModal({ mode: 'create', session: null, defaultDate: dateStr })}
        onEditSession={(session) => setModal({ mode: 'edit', session })}
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
          danhSachSan={danhSachSan}
          defaultDate={modal.mode === 'create' ? modal.defaultDate : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
};
