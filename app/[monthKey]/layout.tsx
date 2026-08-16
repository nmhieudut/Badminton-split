import { notFound } from 'next/navigation';
import { getMonthData, listMonthKeys } from '../../db/queries';
import { Navbar } from '../../components/Navbar';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function MonthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ monthKey: string }>;
}) {
  const { monthKey } = await params;
  if (!MONTH_KEY.test(monthKey)) notFound();

  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const monthKeys = await listMonthKeys();

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <Navbar
        monthKey={monthKey}
        month={data.month}
        monthKeys={monthKeys}
        memberCount={data.members.length}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-3.5 py-4 sm:space-y-5 sm:px-6 sm:py-5">
        {children}
      </main>
      <footer className="mt-8 border-t border-slate-200/80 bg-white py-3.5 text-center text-xs text-slate-400">
        🏸 Badminton Split — Điểm danh sân, tính trái cầu &amp; chia tiền minh bạch
      </footer>
    </div>
  );
}
