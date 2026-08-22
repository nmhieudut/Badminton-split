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
  /** Whether the viewer has write access. The real gate lives in the Server Action. */
  isAdmin: boolean;
}

/**
 * State of the session form.
 * - `create`: a new session, optionally with a date pre-picked from the calendar.
 * - `edit`: edit an existing session (keeps its id when saving).
 * - `duplicate`: pre-fill with an existing session's data but save it as a new one
 *   (drops the id), so the user picks the date themselves instead of us guessing
 *   "+2 days" and forcing them to go back and correct it.
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
  // People without edit rights still need to see what a session contains.
  const [viewingSession, setViewingSession] = useState<ViewDailySession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (input: DailySessionInput) => {
    // Duplicating always writes a new session, even though the form was filled
    // in from an existing one.
    const payload: DailySessionInput =
      modal?.mode === 'duplicate' ? { ...input, id: undefined } : input;
    await saveDailySession(monthKey, payload);
    setModal(null);
  };

  const handleDelete = async (sessionId: string) => {
    // Confirmation is asked exactly once, over in DailySessionList.
    // Catching here is mandatory: this function is called as a floating promise
    // (void ...), so an error nobody catches becomes an unhandled rejection and
    // crashes the whole page.
    setError(null);
    try {
      await deleteDailySession(monthKey, sessionId);
    } catch (e) {
      if (isNavigationError(e)) throw e;
      setError(errorMessage(e, 'Không xóa được buổi đánh. Thử lại giúp.'));
    }
  };

  return (
    <>
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
          {error}
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
          isAdmin ? setModal({ mode: 'edit', session }) : setViewingSession(session)
        }
        onDeleteSession={(sessionId) => {
          void handleDelete(sessionId);
        }}
        onDuplicateSession={(session) => setModal({ mode: 'duplicate', session })}
      />

      {modal && (
        <DailySessionModal
          // Remount on a different session or date: the form reads its initial
          // values from these props, so a fresh instance is the reset.
          key={`${modal.mode}-${modal.session?.id ?? 'moi'}-${modal.mode === 'create' ? modal.defaultDate ?? '' : ''}`}
          members={members}
          initialData={modal.mode === 'create' ? null : modal.session}
          defaults={defaults}
          courts={courts}
          defaultDate={modal.mode === 'create' ? modal.defaultDate : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {viewingSession && (
        <SessionDetailModal
          session={viewingSession}
          members={members}
          onClose={() => setViewingSession(null)}
        />
      )}
    </>
  );
};
