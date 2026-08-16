import type { Route } from 'next';
import { redirect } from 'next/navigation';

export default function Home() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  redirect(`/${monthKey}` as Route);
}
