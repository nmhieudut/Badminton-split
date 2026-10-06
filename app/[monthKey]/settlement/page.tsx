import { cookies } from 'next/headers';
import { getMonthData } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { generateZaloReport } from '../../../lib/settlement/report';
import { SettlementView } from '../../../components/SettlementView';
import { ME_COOKIE } from '../../../lib/me-cookie';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) return null;

  // Coverers who did not play this period still receive money, so they need a QR too.
  const qrOwners = [
    ...data.members.map((m) => ({ id: m.id, path: m.qrImagePath })),
    ...data.covers.map((c) => ({ id: c.coveredById, path: c.coveredByQrPath })),
  ];
  const uniqueOwners = [...new Map(qrOwners.map((o) => [o.id, o])).values()];
  const qrPairs = await Promise.all(
    uniqueOwners.map(async (o) => [o.id, await getQrSignedUrl(o.path)] as const)
  );

  // Who is holding the phone. Read on the server so the "my tasks" block is
  // correct on first paint. Ignored if the person in the cookie does not belong
  // to this period, unless they cover someone in it.
  const saved = (await cookies()).get(ME_COOKIE)?.value ?? null;
  const meId =
    saved &&
    (data.members.some((m) => m.id === saved) || data.covers.some((c) => c.coveredById === saved))
      ? saved
      : null;


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
      meId={meId}
      settlement={data.settlement}
      sessionCount={data.dailySessions.length}
      qrUrls={Object.fromEntries(qrPairs)}
      report={report}
    />
  );
}
