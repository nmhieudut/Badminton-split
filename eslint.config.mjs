import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/*
 * The project had no linter; `bun run lint` only ran the type checker. This is
 * the stock Next.js set, kept flat because eslint-config-next ships a flat
 * config of its own — routing it through FlatCompat crashes on ESLint 10.
 */
export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      '*.config.*',
      // Tooling that ships with ClaudeKit, not application code: CommonJS
      // scripts and skills that legitimately use require().
      '.claude/**',
      'drizzle/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      /*
       * Every image here is a QR code or a Google avatar reached through a
       * short-lived signed URL. next/image wants a stable, configurable remote
       * pattern, cannot cache a URL that expires in an hour, and would resize a
       * QR code — the one kind of image that must stay pixel-exact to scan.
       */
      '@next/next/no-img-element': 'off',
      // A leading underscore marks a binding that exists only to be discarded,
      // which is the point of the destructuring it appears in.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
