import { notFound } from 'next/navigation';
import { getMonthData, getSessionDefaults, listActiveCourts } from '../../db/queries';
import { DailySessionsTab } from '../../components/DailySessionsTab';
import { getRole } from '../../lib/auth/session';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const defaults = await getSessionDefaults(monthKey);
  const courts = await listActiveCourts();

  const role = await getRole();
  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <DailySessionsTab
      monthKey={monthKey}
      members={data.members}
      sessions={data.dailySessions}
      defaults={defaults}
      settlementRows={data.settlement.rows}
      courts={courts}
      isAdmin={isAdmin}
    />
  );
}
