import { notFound } from 'next/navigation';
import { getMonthData, getSessionDefaults, listActiveCourts } from '../../db/queries';
import { DailySessionsTab } from '../../components/DailySessionsTab';
import { getVaiTro } from '../../lib/auth/session';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const defaults = await getSessionDefaults(monthKey);
  const danhSachSan = await listActiveCourts();

  const vaiTro = await getVaiTro();
  const isAdmin = vaiTro === 'admin' || vaiTro === 'super_admin';

  return (
    <DailySessionsTab
      monthKey={monthKey}
      members={data.members}
      sessions={data.dailySessions}
      defaults={defaults}
      settlementRows={data.settlement.rows}
      danhSachSan={danhSachSan}
      isAdmin={isAdmin}
    />
  );
}
