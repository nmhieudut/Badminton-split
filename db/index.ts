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
 * Mở kết nối ở lần dùng đầu tiên, không phải lúc nạp module.
 *
 * Next.js import module của mọi trang ở bước "Collecting page data" khi build.
 * Nếu tệp này ném lỗi ngay lúc nạp thì cả bản build hỏng chỉ vì thiếu biến môi
 * trường — mà một bản build lẽ ra không cần biết mật khẩu database. Hoãn lại
 * đến lần truy vấn đầu tiên thì build chạy được ở nơi không có secret, còn
 * thiếu thật thì lỗi hiện lúc có người gọi, kèm thông báo rõ ràng.
 */
function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new ConfigError('Thiếu biến môi trường DATABASE_URL');
  }

  // Trên Vercel nhiều lần gọi có thể dùng lại cùng một container, nên giữ client
  // ở phạm vi module. `prepare: false` là bắt buộc với transaction pooler của
  // Supabase — pooler không giữ prepared statement giữa các giao dịch.
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
 * Dùng như một thực thể Drizzle bình thường; mọi truy cập đều đi qua getDb()
 * nên nơi gọi không cần biết chuyện khởi tạo trễ.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
