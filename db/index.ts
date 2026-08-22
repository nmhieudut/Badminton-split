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

  const client =
    globalForDb.client ??
    postgres(connectionString, {
      // Mandatory with Supabase's transaction pooler: it does not keep
      // prepared statements across transactions.
      prepare: false,
      ssl: 'require',
      // Deliberately left at the library default rather than lowered. Shrinking
      // it looks like the obvious way to be kind to the pooler, but measured
      // against this pooler an exhausted pool WEDGES instead of queueing: at
      // max=1 five concurrent queries never return, at max=3 twenty never
      // return, while max=10 handles twenty in about a second. The layout runs
      // queries concurrently, so a smaller pool would hang the whole app. What
      // actually protects the pooler is the caching below — one pool per
      // container instead of one per property access.
      max: 10,
      // Release a connection that has gone quiet instead of holding it for the
      // life of the container.
      idle_timeout: 20,
      connect_timeout: 10,
    });

  // Cached unconditionally. This used to be guarded by
  // `NODE_ENV !== 'production'`, which is backwards: `db` is a Proxy that calls
  // this factory on EVERY property access, so in production a single request
  // opened one pool for select, another for insert, another for transaction.
  // Connections piled up until the pooler answered "(EMAXCONN) max client
  // connections reached, limit: 200" and every page and action started failing.
  globalForDb.client = client;
  globalForDb.db = drizzle(client, { schema });

  return globalForDb.db;
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
