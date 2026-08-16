import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { MemberView } from '../../../components/MemberView';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const membersWithQr = await Promise.all(
    data.members.map(async (m) => ({ ...m, qrUrl: await getQrSignedUrl(m.qrImagePath) }))
  );

  return (
    <MemberView
      monthKey={monthKey}
      members={membersWithQr}
      settlementRows={data.settlement.rows}
      sessionCount={data.dailySessions.length}
    />
  );
}
