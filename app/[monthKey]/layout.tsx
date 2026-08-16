import { notFound } from 'next/navigation';
import { getMonthData, listAdmins, listMonthKeys } from '../../db/queries';
import { Navbar } from '../../components/Navbar';
import { getSessionUser, getVaiTro } from '../../lib/auth/session';
import type { DongAdmin } from '../../components/AdminsModal';

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

  const [user, vaiTro] = await Promise.all([getSessionUser(), getVaiTro()]);
  const isAdmin = vaiTro === 'admin' || vaiTro === 'super_admin';
  const isSuperAdmin = vaiTro === 'super_admin';

  // Chỉ truy vấn khi thật sự cần: khách và admin thường không thấy màn hình này.
  // Ngày định dạng ngay ở server để trình duyệt khác múi giờ không hiện lệch.
  const danhSachAdmin: DongAdmin[] = isSuperAdmin
    ? [
        ...(process.env.ADMIN_EMAILS ?? '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
          .map((email) => ({ email, addedAt: '', addedBy: null, laSuperAdmin: true })),
        ...(await listAdmins()).map((a) => ({
          email: a.email,
          addedAt: a.addedAt.toLocaleDateString('vi-VN'),
          addedBy: a.addedBy,
          laSuperAdmin: false,
        })),
      ]
    : [];
  const unsettledCount = data.settlement.transfers.filter((t) => !t.isSettled).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        monthKey={monthKey}
        month={data.month}
        monthKeys={monthKeys}
        memberCount={data.members.length}
        unsettledCount={unsettledCount}
        email={user?.email ?? null}
        ten={user?.ten ?? null}
        anhDaiDien={user?.anhDaiDien ?? null}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        danhSachAdmin={danhSachAdmin}
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
