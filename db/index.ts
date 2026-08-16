import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu biến môi trường DATABASE_URL');
}

// Trên Vercel mỗi lần gọi có thể dùng lại cùng một container, nên giữ client ở
// phạm vi module. `prepare: false` là bắt buộc với transaction pooler của
// Supabase — pooler không giữ prepared statement giữa các giao dịch.
const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> };

const client =
  globalForDb.client ?? postgres(connectionString, { prepare: false, ssl: 'require' });
if (process.env.NODE_ENV !== 'production') globalForDb.client = client;

export const db = drizzle(client, { schema });
