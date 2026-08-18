import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { ConfigError } from '../lib/errors';

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
  db?: Db;
};

/**
 * Opens the connection on first use, not at module load time.
 *
 * Next.js imports every page module during the "Collecting page data" build
 * step. If this file threw as soon as it was loaded, the whole build would fail
 * over a missing environment variable — and a build has no business knowing the
 * database password. Deferring to the first query lets the build run somewhere
 * without secrets, while a genuinely missing variable surfaces when someone
 * actually makes a call, with a clear message.
 */
function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new ConfigError('Thiếu biến môi trường DATABASE_URL');
  }

  // On Vercel several invocations can reuse the same container, so the client
  // is kept at module scope. `prepare: false` is mandatory with Supabase's
  // transaction pooler — the pooler does not keep prepared statements across
  // transactions.
  const client =
    globalForDb.client ?? postgres(connectionString, { prepare: false, ssl: 'require' });

  const instance = drizzle(client, { schema });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.client = client;
    globalForDb.db = instance;
  }

  return instance;
}

/**
 * Used like an ordinary Drizzle instance; every access goes through getDb(), so
 * callers never have to know about the lazy initialization.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
