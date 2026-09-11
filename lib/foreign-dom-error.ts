/**
 * Recognises the DOM errors React raises when something outside it has moved
 * or removed nodes it owns — almost always a browser extension decorating
 * inputs. They are not a broken app state: rendering the segment again from
 * scratch recovers, so the error screen retries once on its own.
 */
export function isForeignDomError(error: { name?: string; message?: string }): boolean {
  return (
    error.name === 'NotFoundError' ||
    /Failed to execute '(insertBefore|removeChild)' on 'Node'/.test(error.message ?? '')
  );
}

export const AUTO_RETRY_KEY = 'bs-auto-retry-at';
export const AUTO_RETRY_WINDOW_MS = 30_000;

/**
 * True at most once per window, so an automatic retry can never loop on a page
 * that keeps failing. Without storage it refuses rather than risk a loop.
 */
export function claimAutoRetry(storage: Pick<Storage, 'getItem' | 'setItem'> | null, now = Date.now()): boolean {
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(AUTO_RETRY_KEY) ?? 0);
    if (now - last < AUTO_RETRY_WINDOW_MS) return false;
    storage.setItem(AUTO_RETRY_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}
