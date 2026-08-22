'use server';

import { headers } from 'next/headers';

/**
 * Writes a client-side crash to the server log, where it can actually be read.
 *
 * DELIBERATE EXEMPTION: this action does NOT call requireAdmin().
 *
 * error.tsx used to log only to the browser console. A crash on someone's
 * phone then left no trace anywhere an operator could see it: Vercel's logs
 * stayed empty, the person saw "Có gì đó trục trặc", and nobody could say what
 * had happened. Guests crash too, so this cannot sit behind sign-in.
 *
 * It writes nothing but a log line, and the payload is clipped, so the worst
 * an abuser can do is add noise to the log. This exemption is declared in
 * actions-guard.test.ts.
 */
export async function reportClientError(input: {
  message: string;
  digest?: string;
  path: string;
  stack?: string;
}): Promise<void> {
  const clip = (s: string | undefined, n: number) => (s ?? '').slice(0, n);
  const h = await headers();

  console.error(
    '[crash phía client]',
    JSON.stringify({
      path: clip(input.path, 200),
      message: clip(input.message, 500),
      digest: clip(input.digest, 64),
      stack: clip(input.stack, 1500),
      userAgent: clip(h.get('user-agent') ?? undefined, 200),
      at: new Date().toISOString(),
    })
  );
}
