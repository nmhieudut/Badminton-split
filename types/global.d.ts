/*
 * Type declarations for the assets imported for their side effects.
 *
 * Next.js does not ship these — nothing in the package declares `*.css` — so
 * `import './globals.css'` has no type at all. TypeScript 5.8 lets that pass
 * silently, but 7.0 reports TS2882, which is why the editor flags a line the
 * project's own type check is happy with.
 */
declare module '*.css';
declare module '*.scss';
