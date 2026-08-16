import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { ExpensesTab } from '../../../components/ExpensesTab';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  return (
    <ExpensesTab
      monthKey={monthKey}
      members={data.members}
      expenses={data.expenses}
      dailySessions={data.dailySessions}
    />
  );
}
