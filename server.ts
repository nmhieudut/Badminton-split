import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Helper to construct Postgres Connection String
function getConnectionString(): string | null {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL.trim();
  }

  const host = process.env.SUPABASE_DB_HOST || process.env.PGHOST || 'db.jbawimybcgajlxxtgtkh.supabase.co';
  const port = process.env.SUPABASE_DB_PORT || process.env.PGPORT || '5432';
  const database = process.env.SUPABASE_DB_NAME || process.env.PGDATABASE || 'postgres';
  const user = process.env.SUPABASE_DB_USER || process.env.PGUSER || 'postgres';
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD;

  if (password && password.trim() !== '') {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password.trim())}@${host}:${port}/${database}`;
  }

  return null;
}

let pool: pg.Pool | null = null;
let isTableInitialized = false;

function getPool(): pg.Pool | null {
  const connectionString = getConnectionString();
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 5000,
      max: 10,
    });

    pool.on('error', (err) => {
      console.warn('Unexpected error on idle PostgreSQL client:', err);
    });
  }

  return pool;
}

async function ensureTableExists(client: pg.PoolClient | pg.Pool) {
  if (isTableInitialized) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS month_sessions (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  isTableInitialized = true;
}

// ---------------- API ROUTES ----------------

// Health & Database Connection status check
app.get('/api/health', async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) {
    return res.json({
      status: 'ok',
      db: 'unconfigured',
      message: 'Supabase / PostgreSQL connection string (DATABASE_URL) is not set. Running in local storage mode.',
      host: 'db.jbawimybcgajlxxtgtkh.supabase.co',
    });
  }

  try {
    const client = await dbPool.connect();
    try {
      await ensureTableExists(client);
      const testRes = await client.query('SELECT NOW() as now');
      return res.json({
        status: 'ok',
        db: 'connected',
        serverTime: testRes.rows[0]?.now,
        message: 'Successfully connected to Supabase PostgreSQL database.',
        host: 'db.jbawimybcgajlxxtgtkh.supabase.co',
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Supabase DB connection error:', err?.message || err);
    return res.status(200).json({
      status: 'ok',
      db: 'error',
      message: `Could not connect to Supabase: ${err?.message || 'Connection failed'}`,
      host: 'db.jbawimybcgajlxxtgtkh.supabase.co',
    });
  }
});

// GET all sessions
app.get('/api/sessions', async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) {
    return res.json({ sessions: [], db: 'unconfigured' });
  }

  try {
    const client = await dbPool.connect();
    try {
      await ensureTableExists(client);
      const queryRes = await client.query('SELECT data FROM month_sessions ORDER BY id ASC');
      const sessions = queryRes.rows.map((row) => row.data);
      return res.json({ sessions, db: 'connected' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Error querying sessions from Supabase:', err?.message || err);
    return res.json({ sessions: [], db: 'error', error: err?.message });
  }
});

// POST / Upsert a single session
app.post('/api/sessions', async (req, res) => {
  const session = req.body;
  if (!session || !session.id) {
    return res.status(400).json({ error: 'Invalid session data, missing id' });
  }

  const dbPool = getPool();
  if (!dbPool) {
    return res.json({ success: true, db: 'unconfigured', message: 'Saved locally' });
  }

  try {
    const client = await dbPool.connect();
    try {
      await ensureTableExists(client);
      await client.query(
        `INSERT INTO month_sessions (id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [session.id, JSON.stringify(session)]
      );
      return res.json({ success: true, db: 'connected' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Error saving session to Supabase:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// PUT / Bulk Upsert all sessions
app.put('/api/sessions/bulk', async (req, res) => {
  const { sessions } = req.body;
  if (!Array.isArray(sessions)) {
    return res.status(400).json({ error: 'Invalid sessions array' });
  }

  const dbPool = getPool();
  if (!dbPool) {
    return res.json({ success: true, db: 'unconfigured', message: 'Saved locally' });
  }

  try {
    const client = await dbPool.connect();
    try {
      await ensureTableExists(client);
      await client.query('BEGIN');
      for (const session of sessions) {
        if (session && session.id) {
          await client.query(
            `INSERT INTO month_sessions (id, data, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (id)
             DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
            [session.id, JSON.stringify(session)]
          );
        }
      }
      await client.query('COMMIT');
      return res.json({ success: true, count: sessions.length, db: 'connected' });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Error bulk saving sessions to Supabase:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// DELETE a session
app.delete('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const dbPool = getPool();
  if (!dbPool) {
    return res.json({ success: true, db: 'unconfigured' });
  }

  try {
    const client = await dbPool.connect();
    try {
      await ensureTableExists(client);
      await client.query('DELETE FROM month_sessions WHERE id = $1', [id]);
      return res.json({ success: true, db: 'connected' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Error deleting session from Supabase:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// ---------------- VITE & STATIC SERVING ----------------

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
