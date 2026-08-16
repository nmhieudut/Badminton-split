import { notFound } from 'next/navigation';
import { getMonthData, getSessionDefaults } from '../../db/queries';
import { DailySessionsTab } from '../../components/DailySessionsTab';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const defaults = await getSessionDefaults(monthKey);

  return (
    <DailySessionsTab
      monthKey={monthKey}
      members={data.members}
      sessions={data.dailySessions}
      defaults={defaults}
      settlementRows={data.settlement.rows}
    />
  );
}
