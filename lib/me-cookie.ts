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

/**
 * Remember, or forget, who is holding this device.
 *
 * The writes live here rather than inline in the component: assigning to
 * document.cookie is the platform's only API for it, but it reads as mutating a
 * global, which the React compiler refuses inside a component.
 */
export function setMeCookie(memberId: string): void {
  document.cookie = `${ME_COOKIE}=${memberId};path=/;max-age=${ME_COOKIE_DAYS * 86400};samesite=lax`;
}

export function clearMeCookie(): void {
  document.cookie = `${ME_COOKIE}=;path=/;max-age=0;samesite=lax`;
}
