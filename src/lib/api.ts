import { MonthSession } from '../types';

export interface DatabaseStatus {
  status: string;
  db: 'connected' | 'unconfigured' | 'error';
  message: string;
  host?: string;
  serverTime?: string;
}

/**
 * Check backend database connection status
 */
export async function checkDatabaseHealth(): Promise<DatabaseStatus> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      return {
        status: 'error',
        db: 'error',
        message: `HTTP ${res.status}: Không thể kết nối máy chủ API`,
      };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      status: 'offline',
      db: 'unconfigured',
      message: 'Đang chạy ngoại tuyến trên trình duyệt (Local Storage).',
    };
  }
}

/**
 * Fetch all sessions stored in the remote Supabase PostgreSQL database
 */
export async function fetchRemoteSessions(): Promise<{
  sessions: MonthSession[];
  db: 'connected' | 'unconfigured' | 'error';
}> {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) {
      return { sessions: [], db: 'error' };
    }
    const data = await res.json();
    return {
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      db: data.db || 'unconfigured',
    };
  } catch (err) {
    console.warn('API fetchRemoteSessions error:', err);
    return { sessions: [], db: 'unconfigured' };
  }
}

/**
 * Save or update a single session in Supabase PostgreSQL
 */
export async function saveRemoteSession(session: MonthSession): Promise<boolean> {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.warn('API saveRemoteSession error:', err);
    return false;
  }
}

/**
 * Bulk save all sessions to Supabase PostgreSQL
 */
export async function saveAllRemoteSessions(sessions: MonthSession[]): Promise<boolean> {
  try {
    const res = await fetch('/api/sessions/bulk', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.warn('API saveAllRemoteSessions error:', err);
    return false;
  }
}

/**
 * Delete a session from Supabase PostgreSQL
 */
export async function deleteRemoteSession(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.warn('API deleteRemoteSession error:', err);
    return false;
  }
}
