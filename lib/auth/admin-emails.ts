/**
 * Whether this email is a SUPER ADMIN — read from the ADMIN_EMAILS env var.
 *
 * Keeping the highest privilege in an environment variable rather than the
 * database is deliberate: it can only be changed by redeploying, so there is no
 * path to seize it through the UI. Ordinary admins live in the `admins` table
 * and are managed by a super admin.
 *
 * The variable is re-read on every call instead of cached, so changing it on
 * Vercel takes effect on the very next call.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const rows = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // An empty list means there is no super admin at all. Fail closed: forgetting
  // to set the variable costs a feature rather than throwing the doors open.
  if (rows.length === 0) return false;

  return rows.includes(email.trim().toLowerCase());
}
