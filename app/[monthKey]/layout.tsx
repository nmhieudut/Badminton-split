import { notFound } from 'next/navigation';
import { getMonthData, listAdmins, listCourts, listMonthKeys } from '../../db/queries';
import { Navbar } from '../../components/Navbar';
import { getSessionUser, getVaiTro } from '../../lib/auth/session';
import type { DongAdmin } from '../../components/AdminsModal';
import type { DongSan } from '../../components/CourtsModal';
import { EmptyMonth } from '../../components/EmptyMonth';

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

  // Chỉ admin mới mở được màn hình quản lý sân, nên khách khỏi tốn truy vấn.
  const danhSachSan: DongSan[] = isAdmin ? await listCourts() : [];
  const unsettledCount = data
    ? data.settlement.transfers.filter((t) => !t.isSettled).length
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        monthKey={monthKey}
        month={data?.month ?? null}
        monthKeys={monthKeys}
        memberCount={data?.members.length ?? 0}
        unsettledCount={unsettledCount}
        email={user?.email ?? null}
        ten={user?.ten ?? null}
        anhDaiDien={user?.anhDaiDien ?? null}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        danhSachAdmin={danhSachAdmin}
        danhSachSan={danhSachSan}
      />

      {/*
        pb-24 trên điện thoại để thanh tab cố định dưới đáy không che mất nội
        dung cuối trang; từ lg trở lên thanh đó biến mất nên không cần chừa.
      */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-3.5 pb-24 pt-4 sm:space-y-5 sm:px-6 sm:pt-5 lg:pb-10">
        {/*
          Tháng chưa có kỳ là trạng thái bình thường, không phải lỗi — nên hiện
          lời mời tạo kỳ thay vì trang 404, và không render children (các trang
          tab đều cần dữ liệu của kỳ).
        */}
        {data ? children : <EmptyMonth monthKey={monthKey} isAdmin={isAdmin} />}
      </main>

      <footer className="hidden border-t border-slate-200/80 bg-white py-3.5 text-center text-xs text-slate-400 lg:block">
        🏸 Badminton Split — Điểm danh sân, tính trái cầu &amp; chia tiền minh bạch
      </footer>
    </div>
  );
}
