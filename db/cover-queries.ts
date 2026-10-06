import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm';
import { db } from './index';
import { members, monthMembers, months } from './schema';
import { acceptInheritedCovers, pickInheritedCovers } from '../lib/settlement/validate-cover';

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Covered member → coverer for one period. */
export async function coverMapOfMonth(ex: Executor, monthId: string) {
  const rows = await ex
    .select({ memberId: monthMembers.memberId, coveredById: monthMembers.coveredById })
    .from(monthMembers)
    .where(and(eq(monthMembers.monthId, monthId), isNotNull(monthMembers.coveredById)));
  return new Map(rows.map((r) => [r.memberId, r.coveredById!]));
}

/** The period's covers with the coverer's name, which may belong to someone outside the period. */
export async function coversOfMonth(ex: Executor, monthId: string) {
  const rows = await ex
    .select({
      memberId: monthMembers.memberId,
      coveredById: monthMembers.coveredById,
      coveredByName: members.name,
      coveredByQrPath: members.qrImagePath,
      recurring: monthMembers.coverRecurring,
    })
    .from(monthMembers)
    .innerJoin(members, eq(members.id, monthMembers.coveredById))
    .where(eq(monthMembers.monthId, monthId));
  return rows.map((r) => ({ ...r, coveredById: r.coveredById! }));
}

/**
 * Carry each newly added member's cover over from the latest earlier period
 * they were in, so a pair set up once keeps applying without the admin
 * redoing it every period. A cover turned off in that period, or set for
 * that period only, does not carry over.
 */
export async function inheritCovers(
  ex: Executor,
  month: { id: string; monthKey: string },
  newMemberIds: string[]
) {
  if (newMemberIds.length === 0) return;

  const history = await ex
    .select({
      memberId: monthMembers.memberId,
      coveredById: monthMembers.coveredById,
      recurring: monthMembers.coverRecurring,
      monthKey: months.monthKey,
    })
    .from(monthMembers)
    .innerJoin(months, eq(months.id, monthMembers.monthId))
    .where(and(inArray(monthMembers.memberId, newMemberIds), lt(months.monthKey, month.monthKey)));

  const inherited = pickInheritedCovers(history);
  if (inherited.size === 0) return;

  const accepted = acceptInheritedCovers(await coverMapOfMonth(ex, month.id), inherited);
  for (const [memberId, coveredById] of accepted) {
    await ex
      .update(monthMembers)
      .set({ coveredById, coverRecurring: true })
      .where(and(eq(monthMembers.monthId, month.id), eq(monthMembers.memberId, memberId)));
  }
}
