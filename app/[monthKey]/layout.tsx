import { notFound } from 'next/navigation';
import { getMonthData, listAdmins, listCourts, listMonthKeys } from '../../db/queries';
import { Navbar } from '../../components/Navbar';
import { getSessionUser, getRole } from '../../lib/auth/session';
import type { UserRow, RowRole } from '../../components/AdminsModal';
import { listAuthUsers } from '../../lib/auth/users';
import type { CourtRow } from '../../components/CourtsModal';
import { EmptyMonth } from '../../components/EmptyMonth';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function MonthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ monthKey: string }>;
}) {
  const { monthKey } = await params;
  if (!MONTH_KEY.test(monthKey)) notFound();

  const data = await getMonthData(monthKey);
  const monthKeys = await listMonthKeys();

  const [user, role] = await Promise.all([getSessionUser(), getRole()]);
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  // Only queried when it is really needed: guests and ordinary admins never see
  // this screen. Dates are formatted on the server so a browser in another time
  // zone does not show them shifted.
  /*
    The list for the permissions screen: three sources merged so nobody is left
    out.
      - ADMIN_EMAILS  → super admins, not changeable from the UI
      - admins table  → people who have been granted the role
      - auth.users    → everyone who has ever signed in
    Someone granted the role before they got around to signing in must still show
    up, with a note, otherwise the super admin would think their grant did not
    take effect.
  */
  let users: UserRow[] = [];

  if (isSuperAdmin) {
    const superEmails = new Set(
      (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    );
    const adminEmails = new Set((await listAdmins()).map((a) => a.email));
    const authUsers = await listAuthUsers();
    const knownUsers = new Map(authUsers.map((u) => [u.email, u]));

    const roleFor = (email: string): RowRole =>
      superEmails.has(email) ? 'super_admin' : adminEmails.has(email) ? 'admin' : 'viewer';

    const allEmails = new Set([...superEmails, ...adminEmails, ...knownUsers.keys()]);

    users = [...allEmails]
      .map((email) => {
        const u = knownUsers.get(email);
        return {
          email,
          name: u?.name ?? null,
          avatarUrl: u?.avatarUrl ?? null,
          role: roleFor(email),
          lastSignInAt: u?.lastSignInAt ?? null,
        };
      })
      // People with a role come first, then the view-only ones.
      .sort((a, b) => {
        const rank = { super_admin: 0, admin: 1, viewer: 2 } as const;
        return (
          rank[a.role] - rank[b.role] ||
          (a.name ?? a.email).localeCompare(b.name ?? b.email, 'vi')
        );
      });
  }

  // Only admins can open the courts management screen, so guests do not pay for
  // the query.
  const courts: CourtRow[] = isAdmin ? await listCourts() : [];
  const unsettledCount = data
    ? data.settlement.transfers.filter((t) => !t.isSettled).length
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        monthKey={monthKey}
        month={data?.month ?? null}
        monthKeys={monthKeys}
        memberCount={data?.members.length ?? 0}
        unsettledCount={unsettledCount}
        email={user?.email ?? null}
        name={user?.name ?? null}
        avatarUrl={user?.avatarUrl ?? null}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        users={users}
        courts={courts}
      />

      {/*
        pb-24 on phones so the tab bar pinned to the bottom does not cover the
        content at the end of the page; from lg up that bar disappears, so no
        space needs to be reserved.
      */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-3.5 pb-24 pt-4 sm:space-y-5 sm:px-6 sm:pt-5 lg:pb-10">
        {/*
          A month with no period yet is a normal state, not an error — so we show
          an invitation to create the period instead of a 404 page, and do not
          render children (every tab page needs the period's data).
        */}
        {data ? children : <EmptyMonth monthKey={monthKey} isAdmin={isAdmin} />}
      </main>

      <footer className="hidden border-t border-slate-200/80 bg-white py-3.5 text-center text-xs text-slate-400 lg:block">
        🏸 Badminton Split — Điểm danh sân, tính trái cầu &amp; chia tiền minh bạch
      </footer>
    </div>
  );
}
