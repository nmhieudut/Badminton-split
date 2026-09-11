/**
 * Props that ask browsers and password managers to leave a field alone.
 *
 * Autofill extensions decorate inputs by inserting their own nodes next to
 * them, or by moving the input into a wrapper of their own. Those nodes land
 * inside elements React owns, and React's next update can then fail with
 * "Failed to execute 'insertBefore' on 'Node'" — reproduced by injecting such
 * nodes, which made React report a hydration mismatch where the same page
 * without them was clean. None of the fields here are credentials, so opting
 * out costs nothing. Each attribute is the documented opt-out of one manager.
 */
export const NO_AUTOFILL = {
  autoComplete: 'off',
  'data-lpignore': 'true', // LastPass
  'data-1p-ignore': 'true', // 1Password
  'data-bwignore': 'true', // Bitwarden
  'data-form-type': 'other', // Dashlane
} as const;
