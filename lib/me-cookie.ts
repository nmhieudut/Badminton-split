/**
 * Name of the cookie that remembers who is holding the phone.
 *
 * It lives in a neutral module, NOT in a file marked `'use client'`. Next.js
 * turns every export of a client module into a client reference, so a Server
 * Component importing the constant from there would receive a proxy instead of
 * a string — `cookies().get(...)` would always come back empty, and TypeScript
 * would not complain because the declared type is still string.
 */
export const ME_COOKIE = 'bs_me';

/** Remember for a year; this is a device preference, not a login session. */
export const ME_COOKIE_DAYS = 365;
