import { sql } from 'drizzle-orm';
import { db } from '../../../db';

/**
 * Keeps the Supabase project from being paused.
 *
 * The free plan pauses a project after seven days without database activity,
 * and the group can easily go longer than that between sessions — which is
 * exactly how production ended up answering 500 on every page. A Vercel Cron
 * calls this every few days and runs one trivial query, which is enough to
 * count as activity.
 *
 * Only Vercel's scheduler may call it: Vercel sends CRON_SECRET as a bearer
 * token, and anything without it is refused. Without the secret configured the
 * route refuses everyone rather than running open.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, ms: Date.now() - started });
  } catch (error) {
    // Logged so a failed ping shows up in Vercel's logs; the status makes the
    // cron run itself show as failed in the dashboard.
    console.error('[keep-alive] database ping failed', error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
