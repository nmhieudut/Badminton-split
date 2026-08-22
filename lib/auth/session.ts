import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { admins } from '../../db/schema';
import { createServerSupabaseClient } from '../supabase/server';
import { isSuperAdminEmail } from './admin-emails';

export type Role = 'super_admin' | 'admin' | null;

export interface SessionUser {
  email: string | null;
  /** Display name from Google; may be empty if the account has no name set. */
  name: string | null;
  /** Google avatar, used directly in an img tag. */
  avatarUrl: string | null;
}

/**
 * The signed-in user, or null for a guest.
 *
 * This uses getUser() and not getSession(): getUser() asks the auth server to
 * verify the token, whereas getSession() only reads the cookie, which can be
 * forged.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Google puts the name and picture in user_metadata, under keys that differ
  // between providers.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const readString = (k: string) =>
    typeof meta[k] === 'string' ? (meta[k] as string) : null;

  return {
    email: user.email ?? null,
    name: readString('full_name') ?? readString('name'),
    avatarUrl: readString('avatar_url') ?? readString('picture'),
  };
}

/**
 * The role of the signed-in user.
 *
 * The environment variable always wins: an email listed in both ADMIN_EMAILS
 * and the admins table counts as a super admin.
 */
export async function getRole(): Promise<Role> {
  const forced = forcedRoleForLocalTesting();
  if (forced !== undefined) return forced;

  const user = await getSessionUser();
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;

  if (isSuperAdminEmail(email)) return 'super_admin';

  const [row] = await db
    .select({ email: admins.email })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  return row ? 'admin' : null;
}

/**
 * A role forced through E2E_ROLE, for driving admin-only screens in a headless
 * browser on a developer machine, where Google sign-in is not possible.
 *
 * Refused outright in production: a variable that could hand out admin on the
 * deployed app would be a back door, so the check is on NODE_ENV rather than
 * on the variable being absent. Returns undefined when not in play so the
 * normal path runs.
 */
export function forcedRoleForLocalTesting(
  env: Record<string, string | undefined> = process.env
): Role | undefined {
  const forced = env.E2E_ROLE;
  if (!forced) return undefined;
  if (env.NODE_ENV === 'production') {
    console.warn('[phân quyền] E2E_ROLE bị bỏ qua: không dùng được ở production');
    return undefined;
  }
  if (forced === 'admin' || forced === 'super_admin') return forced;
  return null;
}

/** Generic message; it reveals nothing about how the permission check works. */
const FORBIDDEN_MESSAGE = 'Bạn không có quyền thực hiện thao tác này.';

/**
 * The gate in front of every Server Action that writes business data.
 *
 * This is where authorization is actually enforced. RLS is no help: the app
 * connects as the `postgres` role, which has rolbypassrls and owns every table,
 * so its policies never apply to the app's own queries.
 */
export async function requireAdmin(): Promise<void> {
  const role = await getRole();
  if (role === 'admin' || role === 'super_admin') return;

  console.warn('[phân quyền] từ chối thao tác ghi: không đủ quyền');
  throw new Error(FORBIDDEN_MESSAGE);
}

/**
 * The separate gate in front of managing the admin list.
 *
 * It has to be its own function rather than a parameter of requireAdmin():
 * kept separate, using the wrong one is a visible mistake, whereas merged, a
 * forgotten flag silently downgrades the check to the weaker level. If an admin
 * could add other admins, the boundary between the two groups would disappear
 * with nothing to signal it.
 */
export async function requireSuperAdmin(): Promise<void> {
  if ((await getRole()) === 'super_admin') return;

  console.warn('[phân quyền] từ chối thao tác quản lý admin: không phải super admin');
  throw new Error(FORBIDDEN_MESSAGE);
}
