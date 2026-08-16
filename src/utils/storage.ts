import { MonthSession, Member, ExpenseItem, DailySession } from '../types';
import { saveAllRemoteSessions } from '../lib/api';

const STORAGE_KEY = 'badminton_split_sessions_v2';
const ACTIVE_SESSION_ID_KEY = 'badminton_split_active_id_v2';

export function getBlankSession(targetMonthKey?: string): MonthSession {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const key = targetMonthKey || `${year}-${month}`;
  const [y, m] = key.split('-');
  return {
    id: `session-${key}`,
    monthKey: key,
    title: `Tháng ${m}/${y}`,
    createdAt: new Date().toISOString(),
    members: [],
    dailySessions: [],
    expenses: [],
    settledTransferIds: [],
    initialFund: 0,
    note: '',
  };
}

export function getInitialSession(): MonthSession {
  return getBlankSession();
}

export const DEMO_MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Tuấn (Nhóm trưởng)',
    phone: '0901234567',
    bankName: 'MB',
    bankAccount: '0901234567',
    bankAccountName: 'NGUYEN VAN TUAN',
    isPermanent: true,
  },
  {
    id: 'm2',
    name: 'Hoàng Nam',
    phone: '0912345678',
    bankName: 'VCB',
    bankAccount: '1012345678',
    bankAccountName: 'HOANG NAM',
    isPermanent: true,
  },
  {
    id: 'm3',
    name: 'Minh Đức',
    bankName: 'TCB',
    bankAccount: '190345678901',
    bankAccountName: 'TRAN MINH DUC',
    isPermanent: true,
  },
  {
    id: 'm4',
    name: 'Khánh Linh',
    isPermanent: true,
  },
  {
    id: 'm5',
    name: 'Hải Đăng (Khách vãng lai)',
    isPermanent: false,
  },
];

export const DEMO_DAILY_SESSIONS: DailySession[] = [
  {
    id: 'ds1',
    date: '2026-08-03',
    courtName: 'Sân 3 - Kỳ Hòa',
    courtFee: 180000,
    courtPayerId: 'm1',
    shuttlecockCount: 4,
    shuttlecockPricePerItem: 25000,
    shuttlecockPayerId: 'm2',
    drinkFee: 30000,
    drinkPayerId: 'm1',
    attendeeIds: ['m1', 'm2', 'm3', 'm4', 'm5'],
    note: 'Buổi khai sân',
  },
  {
    id: 'ds2',
    date: '2026-08-05',
    courtName: 'Sân 3 - Kỳ Hòa',
    courtFee: 180000,
    courtPayerId: 'm1',
    shuttlecockCount: 5,
    shuttlecockPricePerItem: 25000,
    shuttlecockPayerId: 'm2',
    attendeeIds: ['m1', 'm2', 'm3', 'm4'],
    note: 'Đánh 5 set',
  },
];

export const DEMO_EXPENSES: ExpenseItem[] = [
  {
    id: 'e1',
    title: 'Ăn chè sau trận',
    category: 'gathering',
    amount: 120000,
    paidById: 'm1',
    splitType: 'custom',
    participantIds: ['m1', 'm2', 'm3', 'm4'],
    date: '2026-08-05',
    note: 'Quán chè Kỳ Hòa',
  },
];

export function getDemoSession(): MonthSession {
  return {
    id: 'session-demo-2026-08',
    monthKey: '2026-08',
    title: 'Tháng 08/2026 (Mẫu)',
    createdAt: new Date().toISOString(),
    members: DEMO_MEMBERS,
    dailySessions: DEMO_DAILY_SESSIONS,
    expenses: DEMO_EXPENSES,
    settledTransferIds: [],
    initialFund: 0,
    note: 'Sân cầu lông Kỳ Hòa, thứ 2-4-6',
  };
}

export function loadSavedSessions(): MonthSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [getInitialSession()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((s) => ({
        ...s,
        dailySessions: s.dailySessions || [],
        expenses: s.expenses || [],
        members: s.members || [],
        settledTransferIds: s.settledTransferIds || [],
      }));
    }
    return [getInitialSession()];
  } catch {
    return [getInitialSession()];
  }
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncedJsonString = '';

export function saveSessions(sessions: MonthSession[]) {
  try {
    const jsonString = JSON.stringify(sessions);
    localStorage.setItem(STORAGE_KEY, jsonString);

    if (jsonString === lastSyncedJsonString) {
      return;
    }

    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }

    syncDebounceTimer = setTimeout(() => {
      lastSyncedJsonString = jsonString;
      saveAllRemoteSessions(sessions).catch((err) => {
        console.warn('Background Supabase sync failed:', err);
      });
    }, 800);
  } catch (err) {
    console.error('Failed to save sessions to localStorage', err);
  }
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_ID_KEY);
}

export function setActiveSessionId(id: string) {
  localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
}
