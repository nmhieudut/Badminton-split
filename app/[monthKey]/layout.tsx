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
  const unsettledCount = data.settlement.transfers.filter((t) => !t.isSettled).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        monthKey={monthKey}
        month={data.month}
        monthKeys={monthKeys}
        memberCount={data.members.length}
        unsettledCount={unsettledCount}
      />

      {/*
        pb-24 trên điện thoại để thanh tab cố định dưới đáy không che mất nội
        dung cuối trang; từ lg trở lên thanh đó biến mất nên không cần chừa.
      */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-3.5 pb-24 pt-4 sm:space-y-5 sm:px-6 sm:pt-5 lg:pb-10">
        {children}
      </main>

      <footer className="hidden border-t border-slate-200/80 bg-white py-3.5 text-center text-xs text-slate-400 lg:block">
        🏸 Badminton Split — Điểm danh sân, tính trái cầu &amp; chia tiền minh bạch
      </footer>
    </div>
  );
}
