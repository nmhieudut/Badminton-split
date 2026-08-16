import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Server,
  FileJson,
} from 'lucide-react';
import { DailySession, ExpenseItem, Member, MonthSession } from './types';
import {
  loadSavedSessions,
  saveSessions,
  getActiveSessionId,
  setActiveSessionId,
  getBlankSession,
  getDemoSession,
} from './utils/storage';
import {
  fetchRemoteSessions,
  saveRemoteSession,
  saveAllRemoteSessions,
  deleteRemoteSession,
} from './lib/api';
import { Navbar } from './components/Navbar';
import { SettlementView } from './components/SettlementView';
import { DailySessionList } from './components/DailySessionList';
import { DailySessionModal } from './components/DailySessionModal';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { MemberView } from './components/MemberView';
import { NewMonthModal } from './components/NewMonthModal';
import { EditMonthModal } from './components/EditMonthModal';
import { BadmintonEstimatorModal } from './components/BadmintonEstimatorModal';
import { ZaloReportModal } from './components/ZaloReportModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { YearMonthPickerModal } from './components/YearMonthPickerModal';
import { calculateSettlement, formatVND } from './utils/settlement';

export default function App() {
  const [sessions, setSessions] = useState<MonthSession[]>(() => loadSavedSessions());
  const [activeSessionId, setActiveSessionIdState] = useState<string>(() => {
    const saved = getActiveSessionId();
    const all = loadSavedSessions();
    if (all.some((s) => s.id === saved)) return saved;
    return all[0]?.id || `session-${new Date().toISOString().slice(0, 7)}`;
  });

  const [activeTab, setActiveTab] = useState<
    'dailySessions' | 'settlement' | 'expenses' | 'members'
  >('dailySessions');

  // Modals state
  const [isDailySessionModalOpen, setIsDailySessionModalOpen] = useState(false);
  const [editingDailySession, setEditingDailySession] = useState<DailySession | null>(null);
  const [dailySessionPresetDate, setDailySessionPresetDate] = useState<string | undefined>(
    undefined
  );

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [isEditMonthModalOpen, setIsEditMonthModalOpen] = useState(false);
  const [isYearMonthPickerModalOpen, setIsYearMonthPickerModalOpen] = useState(false);
  const [isEstimatorModalOpen, setIsEstimatorModalOpen] = useState(false);
  const [isZaloReportModalOpen, setIsZaloReportModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Ref tracking current sessions to prevent redundant loops
  const sessionsRef = useRef<MonthSession[]>(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Initial silent background sync
  useEffect(() => {
    const initSilentSync = async () => {
      try {
        const remoteData = await fetchRemoteSessions();
        if (remoteData.sessions && remoteData.sessions.length > 0) {
          setSessions(remoteData.sessions);
        } else if (sessionsRef.current && sessionsRef.current.length > 0) {
          await saveAllRemoteSessions(sessionsRef.current);
        }
      } catch (err) {
        console.warn('Background sync note:', err);
      }
    };

    initSilentSync();
  }, []);

  // Sync to local storage on sessions change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Active session
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || getBlankSession();

  const dailySessions = activeSession.dailySessions || [];
  const expenses = activeSession.expenses || [];
  const members = activeSession.members || [];

  const handleSelectSession = (id: string) => {
    setActiveSessionIdState(id);
    setActiveSessionId(id);
  };

  const handleUpdateActiveSession = (updatedFields: Partial<MonthSession>) => {
    const updated = { ...activeSession, ...updatedFields };
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? updated : s))
    );
    // Silent background save
    saveRemoteSession(updated).catch(() => {});
  };

  // Month Session CRUD
  const handleAddNewSession = (newSession: MonthSession) => {
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionIdState(newSession.id);
    setActiveSessionId(newSession.id);
    saveRemoteSession(newSession).catch(() => {});
  };

  const handleUpdateMonthSession = (updated: MonthSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    saveRemoteSession(updated).catch(() => {});
  };

  const handleDeleteMonthSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const blank = getBlankSession();
        setActiveSessionIdState(blank.id);
        setActiveSessionId(blank.id);
        return [blank];
      }
      setActiveSessionIdState(remaining[0].id);
      setActiveSessionId(remaining[0].id);
      return remaining;
    });
    deleteRemoteSession(sessionId).catch(() => {});
  };

  // Switch month seamlessly
  const handleSelectMonthKey = (targetMonthKey: string) => {
    const existing = sessions.find((s) => s.monthKey === targetMonthKey);
    if (existing) {
      setActiveSessionIdState(existing.id);
      setActiveSessionId(existing.id);
      return;
    }

    const [yearStr, monthStr] = targetMonthKey.split('-');
    const permMembers = members.filter((m) => m.isPermanent !== false);
    const initialMembers = permMembers.length > 0 ? permMembers : members;

    const newSession: MonthSession = {
      id: `session-${targetMonthKey}`,
      monthKey: targetMonthKey,
      title: `Tháng ${monthStr}/${yearStr}`,
      createdAt: new Date().toISOString(),
      members: initialMembers,
      dailySessions: [],
      expenses: [],
      settledTransferIds: [],
      initialFund: 0,
      note: `Kỳ Tháng ${monthStr}/${yearStr}`,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionIdState(newSession.id);
    setActiveSessionId(newSession.id);
    saveRemoteSession(newSession).catch(() => {});
  };

  const handleNavigateMonthDelta = (delta: number) => {
    const currentKey = activeSession.monthKey || '2026-08';
    const [y, m] = currentKey.split('-').map(Number);
    const targetDate = new Date(y, m - 1 + delta, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
    handleSelectMonthKey(`${targetYear}-${targetMonth}`);
  };

  // Member CRUD
  const handleUpdateMembers = (newMembers: Member[]) => {
    handleUpdateActiveSession({ members: newMembers });
  };

  const handleAddQuickMember = (newMember: Member) => {
    handleUpdateActiveSession({
      members: [...members, newMember],
    });
  };

  // Daily Session CRUD
  const handleSaveDailySession = (sessionData: DailySession) => {
    const existingIndex = dailySessions.findIndex((s) => s.id === sessionData.id);
    let newDaily: DailySession[];
    if (existingIndex >= 0) {
      newDaily = dailySessions.map((s) => (s.id === sessionData.id ? sessionData : s));
    } else {
      newDaily = [sessionData, ...dailySessions];
    }
    newDaily.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    handleUpdateActiveSession({ dailySessions: newDaily });
    setEditingDailySession(null);
  };

  const handleDeleteDailySession = (id: string) => {
    const newDaily = dailySessions.filter((s) => s.id !== id);
    handleUpdateActiveSession({ dailySessions: newDaily });
  };

  const handleDuplicateDailySession = (s: DailySession) => {
    const currentDate = new Date(s.date);
    currentDate.setDate(currentDate.getDate() + 2);
    const nextDateStr = currentDate.toISOString().split('T')[0];

    const duplicated: DailySession = {
      ...s,
      id: `ds_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: nextDateStr,
      note: `Bản sao từ ngày ${s.date}`,
    };
    handleUpdateActiveSession({
      dailySessions: [duplicated, ...dailySessions],
    });
  };

  // General Expense CRUD
  const handleSaveExpense = (expense: ExpenseItem) => {
    const existingIndex = expenses.findIndex((e) => e.id === expense.id);
    let newExpenses: ExpenseItem[];
    if (existingIndex >= 0) {
      newExpenses = expenses.map((e) => (e.id === expense.id ? expense : e));
    } else {
      newExpenses = [expense, ...expenses];
    }
    handleUpdateActiveSession({ expenses: newExpenses });
    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    const newExpenses = expenses.filter((e) => e.id !== id);
    handleUpdateActiveSession({ expenses: newExpenses });
  };

  const handleDuplicateExpense = (expense: ExpenseItem) => {
    const duplicated: ExpenseItem = {
      ...expense,
      id: `e_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${expense.title} (Bản sao)`,
      date: new Date().toISOString().split('T')[0],
    };
    handleUpdateActiveSession({
      expenses: [duplicated, ...expenses],
    });
  };

  // Settlement & Transfers
  const handleToggleTransferSettled = (transferId: string) => {
    const current = new Set<string>(activeSession.settledTransferIds || []);
    if (current.has(transferId)) {
      current.delete(transferId);
    } else {
      current.add(transferId);
    }
    handleUpdateActiveSession({ settledTransferIds: Array.from(current) });
  };

  // Backup, Demo & Clear Blank
  const handleImportSessions = (newSessions: MonthSession[]) => {
    setSessions(newSessions);
    if (newSessions.length > 0) {
      setActiveSessionIdState(newSessions[0].id);
      setActiveSessionId(newSessions[0].id);
      saveAllRemoteSessions(newSessions).catch(() => {});
    }
  };

  const handleResetToDemo = () => {
    const demo = [getDemoSession()];
    setSessions(demo);
    setActiveSessionIdState(demo[0].id);
    setActiveSessionId(demo[0].id);
    saveAllRemoteSessions(demo).catch(() => {});
  };

  const handleClearAllToBlank = () => {
    const blank = [getBlankSession()];
    setSessions(blank);
    setActiveSessionIdState(blank[0].id);
    setActiveSessionId(blank[0].id);
    saveAllRemoteSessions(blank).catch(() => {});
  };

  // Financial summary
  const { totalExpenses } = calculateSettlement(
    members,
    expenses,
    dailySessions
  );

  const totalShuttlesCount = dailySessions.reduce(
    (acc, s) => acc + (s.shuttlecockCount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar with Integrated Navigation */}
      <Navbar
        sessions={sessions}
        activeSession={activeSession}
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        onNavigatePrevMonth={() => handleNavigateMonthDelta(-1)}
        onNavigateNextMonth={() => handleNavigateMonthDelta(1)}
        onOpenYearMonthPickerModal={() => setIsYearMonthPickerModalOpen(true)}
        onOpenNewMonthModal={() => setIsNewMonthModalOpen(true)}
        onOpenEditMonthModal={() => setIsEditMonthModalOpen(true)}
        onOpenEstimatorModal={() => setIsEstimatorModalOpen(true)}
        onOpenZaloReportModal={() => setIsZaloReportModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenDailySessionModal={() => {
          setEditingDailySession(null);
          setDailySessionPresetDate(undefined);
          setIsDailySessionModalOpen(true);
        }}
        onOpenNewExpenseModal={() => {
          setEditingExpense(null);
          setIsExpenseModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-5 flex-1">
        {/* Compact & Clean Month Overview Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {activeSession.title || `Tháng ${activeSession.monthKey}`}
              </h2>
              {activeSession.note && (
                <span className="text-[11px] sm:text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[200px] sm:max-w-none">
                  {activeSession.note}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ghi chép số buổi đánh, dùng bao nhiêu quả cầu & chia tiền minh bạch
            </p>
          </div>

          {/* Clean Metric Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Số Buổi</span>
              <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm">
                {dailySessions.length} <span className="text-[11px] font-normal text-slate-400">buổi</span>
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Cầu Dùng</span>
              <span className="font-bold text-emerald-700 font-mono text-xs sm:text-sm">
                {totalShuttlesCount} <span className="text-[11px] font-normal text-slate-400">trái</span>
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Tổng Chi</span>
              <span className="font-bold text-indigo-600 font-mono text-xs sm:text-sm">
                {formatVND(totalExpenses)}
              </span>
            </div>

            {/* Quick Action Button for current tab */}
            {activeTab === 'dailySessions' && (
              <button
                type="button"
                onClick={() => {
                  setEditingDailySession(null);
                  setDailySessionPresetDate(undefined);
                  setIsDailySessionModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Buổi Đánh</span>
              </button>
            )}

            {activeTab === 'expenses' && (
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setIsExpenseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Khoản Chi</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'dailySessions' && (
          <DailySessionList
            sessions={dailySessions}
            members={members}
            monthKey={activeSession.monthKey || '2026-08'}
            onAddSession={(dateStr) => {
              setEditingDailySession(null);
              setDailySessionPresetDate(dateStr);
              setIsDailySessionModalOpen(true);
            }}
            onEditSession={(s) => {
              setEditingDailySession(s);
              setDailySessionPresetDate(undefined);
              setIsDailySessionModalOpen(true);
            }}
            onDeleteSession={handleDeleteDailySession}
            onDuplicateSession={handleDuplicateDailySession}
            onMonthChange={(targetMonthKey) => handleSelectMonthKey(targetMonthKey)}
            onOpenYearMonthPicker={() => setIsYearMonthPickerModalOpen(true)}
          />
        )}

        {activeTab === 'settlement' && (
          <SettlementView
            session={activeSession}
            onToggleTransferSettled={handleToggleTransferSettled}
            onOpenZaloReport={() => setIsZaloReportModalOpen(true)}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseList
            expenses={expenses}
            members={members}
            onAddExpense={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            onEditExpense={(item) => {
              setEditingExpense(item);
              setIsExpenseModalOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
            onDuplicateExpense={handleDuplicateExpense}
          />
        )}

        {activeTab === 'members' && (
          <MemberView
            members={members}
            dailySessions={dailySessions}
            expenses={expenses}
            onUpdateMembers={handleUpdateMembers}
          />
        )}
      </main>

      {/* Clean, Minimalist Footer */}
      <footer className="mt-8 border-t border-slate-200/80 bg-white py-3.5 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🏸 Badminton Split — Điểm danh sân, tính trái cầu & chia tiền minh bạch</span>
          <button
            type="button"
            onClick={() => setIsBackupModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <FileJson className="h-3.5 w-3.5 text-indigo-500" />
            <span>Sao lưu & Dữ liệu</span>
          </button>
        </div>
      </footer>

      {/* Modals */}
      {isDailySessionModalOpen && (
        <DailySessionModal
          members={members}
          initialData={editingDailySession}
          defaultDate={
            dailySessionPresetDate ||
            (activeSession.monthKey
              ? `${activeSession.monthKey}-${String(new Date().getDate()).padStart(2, '0')}`
              : undefined)
          }
          onSave={handleSaveDailySession}
          onClose={() => {
            setIsDailySessionModalOpen(false);
            setEditingDailySession(null);
            setDailySessionPresetDate(undefined);
          }}
          onAddQuickMember={handleAddQuickMember}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseFormModal
          members={members}
          initialData={editingExpense}
          onSave={handleSaveExpense}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onAddQuickMember={handleAddQuickMember}
        />
      )}

      {isNewMonthModalOpen && (
        <NewMonthModal
          currentMembers={members}
          onAddSession={handleAddNewSession}
          onClose={() => setIsNewMonthModalOpen(false)}
        />
      )}

      {isEditMonthModalOpen && (
        <EditMonthModal
          session={activeSession}
          canDelete={sessions.length > 1}
          onUpdateSession={handleUpdateMonthSession}
          onDeleteSession={handleDeleteMonthSession}
          onClose={() => setIsEditMonthModalOpen(false)}
        />
      )}

      {isYearMonthPickerModalOpen && (
        <YearMonthPickerModal
          currentMonthKey={activeSession.monthKey || '2026-08'}
          existingMonthKeys={sessions.map((s) => s.monthKey)}
          onSelectMonthKey={(key) => handleSelectMonthKey(key)}
          onClose={() => setIsYearMonthPickerModalOpen(false)}
        />
      )}

      {isEstimatorModalOpen && (
        <BadmintonEstimatorModal
          currentMembers={members}
          onClose={() => setIsEstimatorModalOpen(false)}
        />
      )}

      {isZaloReportModalOpen && (
        <ZaloReportModal
          session={activeSession}
          onClose={() => setIsZaloReportModalOpen(false)}
        />
      )}

      {isBackupModalOpen && (
        <BackupRestoreModal
          sessions={sessions}
          onImportSessions={handleImportSessions}
          onResetToDemo={handleResetToDemo}
          onClearAllToBlank={handleClearAllToBlank}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}
    </div>
  );
}
