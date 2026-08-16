import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { generateZaloReport } from '../../../lib/settlement/report';
import { SettlementView } from '../../../components/SettlementView';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const qrPairs = await Promise.all(
    data.members.map(async (m) => [m.id, await getQrSignedUrl(m.qrImagePath)] as const)
  );

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
      settlement={data.settlement}
      sessionCount={data.dailySessions.length}
      qrUrls={Object.fromEntries(qrPairs)}
      report={report}
    />
  );
}
