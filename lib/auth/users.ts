import { createAdminSupabaseClient } from '../supabase/admin';

export interface AuthUser {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  /** Most recent sign-in, already formatted on the server. */
  lastSignInAt: string | null;
}

/**
 * Every account that has ever signed in to the app.
 *
 * It lets a super admin pick the person to grant rights to instead of typing an
 * email address by hand — typing invites typos and says nothing about whether
 * that person has ever opened the app.
 *
 * Fetches the first 200 accounts; a badminton group never comes close to that.
 */
export async function listAuthUsers(): Promise<AuthUser[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });

  if (error) {
    console.error('[tài khoản] không lấy được danh sách:', error.message);
    return [];
  }

  return data.users
    .filter((u) => u.email)
    .map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const readString = (k: string) =>
        typeof meta[k] === 'string' ? (meta[k] as string) : null;

      return {
        email: u.email!.toLowerCase(),
        name: readString('full_name') ?? readString('name'),
        avatarUrl: readString('avatar_url') ?? readString('picture'),
        lastSignInAt: u.last_sign_in_at
          ? new Date(u.last_sign_in_at).toLocaleDateString('vi-VN')
          : null,
      };
    })
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email, 'vi'));
}
