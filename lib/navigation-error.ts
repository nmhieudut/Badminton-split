/**
 * Next.js `redirect()` and `notFound()` work by THROWING.
 *
 * That means an ordinary `catch` block swallows them: the user presses a
 * button, is never navigated anywhere, and sees a meaningless error message.
 * Every catch around a Server Action must re-throw these two kinds of error.
 */
export function isNavigationError(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND')
  );
}

/** Message shown to the user when an operation fails. */
export function errorMessage(e: unknown, fallback = 'Không lưu được. Thử lại giúp.'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
