import { listPayments } from '../../../db/queries';
import { getRole } from '../../../lib/auth/session';
import { PaymentHistory } from '../../../components/PaymentHistory';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;

  const payments = await listPayments(monthKey);
  const role = await getRole();
  const isAdmin = role === 'admin' || role === 'super_admin';

  return <PaymentHistory monthKey={monthKey} payments={payments} isAdmin={isAdmin} />;
}
