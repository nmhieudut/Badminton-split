import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { MemberView } from '../../../components/MemberView';
import { getRole } from '../../../lib/auth/session';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const membersWithQr = await Promise.all(
    data.members.map(async (m) => ({ ...m, qrUrl: await getQrSignedUrl(m.qrImagePath) }))
  );

  const role = await getRole();
  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <MemberView
      monthKey={monthKey}
      members={membersWithQr}
      settlementRows={data.settlement.rows}
      sessionCount={data.dailySessions.length}
      isAdmin={isAdmin}
    />
  );
}
