'use client';

import { useEffect } from 'react';
import { reportClientError } from '../app/actions/client-error';

/**
 * Forwards React's own console errors to the server log.
 *
 * The error boundary only sees failures that take the page down. React reports
 * a whole class of problems — mismatched hydration, hooks rendered in a
 * different order — by logging and then recovering, so those never reached the
 * log and could only be described second-hand. A minified React error is
 * exactly the kind that cannot be diagnosed from a screenshot, since the useful
 * half is the component stack printed next to it.
 *
 * Only React's own messages are forwarded, and at most a handful per page, so
 * this cannot turn into a firehose.
 */
const MAX_PER_PAGE = 5;

export function ConsoleErrorReporter() {
  useEffect(() => {
    const original = console.error;
    let sent = 0;

    console.error = (...args: unknown[]) => {
      original(...args);
      if (sent >= MAX_PER_PAGE) return;

      const text = args
        .map((a) => (a instanceof Error ? `${a.message}\n${a.stack ?? ''}` : String(a)))
        .join(' ');

      // React's minified errors, and the warnings that precede a broken tree.
      const interesting =
        /Minified React error #\d+/.test(text) ||
        /Rendered (more|fewer) hooks/.test(text) ||
        /hydrat/i.test(text) ||
        /did not match/i.test(text);
      if (!interesting) return;

      sent += 1;
      reportClientError({
        message: `[console] ${text.slice(0, 600)}`,
        path: window.location.pathname,
        stack: text.slice(0, 1800),
      }).catch(() => {
        // Reporting must never become a second failure.
      });
    };

    return () => {
      console.error = original;
    };
  }, []);

  return null;
}
