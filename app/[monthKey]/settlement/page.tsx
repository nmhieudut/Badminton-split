import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { generateZaloReport } from '../../../lib/settlement/report';
import { SettlementView } from '../../../components/SettlementView';
import { COOKIE_TOI_LA } from '../../../lib/me-cookie';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const qrPairs = await Promise.all(
    data.members.map(async (m) => [m.id, await getQrSignedUrl(m.qrImagePath)] as const)
  );

  // Ai đang cầm máy. Đọc ở server để khối "việc của tôi" hiện đúng ngay từ đầu.
  // Bỏ qua nếu người trong cookie không thuộc kỳ này.
  const luu = (await cookies()).get(COOKIE_TOI_LA)?.value ?? null;
  const meId = luu && data.members.some((m) => m.id === luu) ? luu : null;

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
