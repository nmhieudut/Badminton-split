import { getMonthData, listRoster } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { MemberView } from '../../../components/MemberView';
import { getRole } from '../../../lib/auth/session';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) return null;

  const membersWithQr = await Promise.all(
    data.members.map(async (m) => ({ ...m, qrUrl: await getQrSignedUrl(m.qrImagePath) }))
  );

  // The shared roster, so people can be ticked into the period instead of retyped.
  const roster = await listRoster(monthKey);

  const role = await getRole();
  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <MemberView
      monthKey={monthKey}
      members={membersWithQr}
      roster={roster}
      settlementRows={data.settlement.rows}
      sessionCount={data.dailySessions.length}
      isAdmin={isAdmin}
    />
  );
}
