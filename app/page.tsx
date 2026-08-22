import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { vnParts } from '../lib/vn-time';

export default function Home() {
  // The period in Vietnam time: just after midnight there, UTC is still on the
  // previous day and on the first of a month that means the previous period.
  const now = vnParts(new Date());
  const monthKey = `${now.year}-${String(now.month).padStart(2, '0')}`;
  redirect(`/${monthKey}` as Route);
}
