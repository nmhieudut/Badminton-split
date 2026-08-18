import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { generateZaloReport } from '../../../lib/settlement/report';
import { SettlementView } from '../../../components/SettlementView';
import { ME_COOKIE } from '../../../lib/me-cookie';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const qrPairs = await Promise.all(
    data.members.map(async (m) => [m.id, await getQrSignedUrl(m.qrImagePath)] as const)
  );

  // Who is holding the phone. Read on the server so the "my tasks" block is
  // correct on first paint. Ignored if the person in the cookie does not belong
  // to this period.
  const saved = (await cookies()).get(ME_COOKIE)?.value ?? null;
  const meId = saved && data.members.some((m) => m.id === saved) ? saved : null;


  const report = generateZaloReport({
    title: data.month.title,
    monthKey,
    memberCount: data.members.length,
    sessionCount: data.dailySessions.length,
    settlement: data.settlement,
  });

  return (
    <SettlementView
      monthKey={monthKey}
      month={data.month}
      meId={meId}
      settlement={data.settlement}
      sessionCount={data.dailySessions.length}
      qrUrls={Object.fromEntries(qrPairs)}
      report={report}
    />
  );
}
