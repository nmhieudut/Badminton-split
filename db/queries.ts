import { and, asc, desc, eq, inArray, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './index';
import {
  admins,
  courts,
  dailySessions,
  members,
  monthMembers,
  months,
  sessionAttendees,
  payments,
} from './schema';
import { ROUNDING_THRESHOLD, calculateSettlement } from '../lib/settlement/calculate';

export async function listMonthKeys(): Promise<string[]> {
  const rows = await db
    .select({ monthKey: months.monthKey })
    .from(months)
    .orderBy(desc(months.monthKey));
  return rows.map((r) => r.monthKey);
}

export async function getMonthByKey(monthKey: string) {
  const [row] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  return row ?? null;
}

export async function getMonthData(monthKey: string) {
  const month = await getMonthByKey(monthKey);
  if (!month) return null;

  const memberRows = await db
    .select({
      id: members.id,
      name: members.name,
      phone: members.phone,
      qrImagePath: members.qrImagePath,
      color: members.color,
      isPermanent: members.isPermanent,
    })
    .from(monthMembers)
    .innerJoin(members, eq(members.id, monthMembers.memberId))
    .where(eq(monthMembers.monthId, month.id))
    .orderBy(asc(members.name));

  const sessionRows = await db
    .select()
    .from(dailySessions)
    .where(eq(dailySessions.monthId, month.id))
    .orderBy(desc(dailySessions.date));

  const sessionIds = sessionRows.map((s) => s.id);
  const attendeeRows = sessionIds.length
    ? await db
        .select()
        .from(sessionAttendees)
        .where(inArray(sessionAttendees.sessionId, sessionIds))
    : [];



  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.monthId, month.id));

  const attendeesBySession = groupBy(
    attendeeRows,
    (r) => r.sessionId,
    (r) => r.memberId
  );

  const sessionsWithAttendees = sessionRows.map((s) => ({
    ...s,
    attendeeIds: attendeesBySession.get(s.id) ?? [],
  }));


  const settlement = calculateSettlement({
    members: memberRows.map((m) => ({ id: m.id, name: m.name })),
    dailySessions: sessionsWithAttendees.map((s) => ({
      id: s.id,
      date: s.date,
      courtFee: s.courtFee,
      courtPayerId: s.courtPayerId,
      shuttlecockCount: s.shuttlecockCount,
      shuttlecockPricePerItem: s.shuttlecockPricePerItem,
      shuttlecockTotalFee: s.shuttlecockTotalFee,
      shuttlecockPayerId: s.shuttlecockPayerId,
      drinkFee: s.drinkFee,
      drinkPayerId: s.drinkPayerId,
      otherFee: s.otherFee,
      otherFeePayerId: s.otherFeePayerId,
      attendeeIds: s.attendeeIds,
    })),
  });

  // What has actually been sent between each pair, so a debt that grew after
  // someone paid shows the shortfall rather than reading as settled.
  const paidByPair = new Map<string, number>();
  for (const p of paymentRows) {
    const key = `${p.fromMemberId}::${p.toMemberId}`;
    paidByPair.set(key, (paidByPair.get(key) ?? 0) + p.amount);
  }

  return {
    month,
    members: memberRows,
    dailySessions: sessionsWithAttendees,
    settlement: {
      ...settlement,
      transfers: settlement.transfers.map((t) => {
        const paidAmount = paidByPair.get(`${t.fromMemberId}::${t.toMemberId}`) ?? 0;
        const remaining = Math.max(0, t.amount - paidAmount);
        return {
          ...t,
          paidAmount,
          remaining,
          isSettled: remaining <= ROUNDING_THRESHOLD,
        };
      }),
    },
  };
}

/**
 * The settings of the most recent session, used as defaults when recording a
 * new one. Replaces the hard-coded constants ('Sân 3 - Kỳ Hòa', 180000, 4
 * shuttles) of the old version. If the month being viewed has no session yet,
 * the last session of the previous month is used.
 */
export async function getSessionDefaults(monthKey: string) {
  const month = await getMonthByKey(monthKey);
  if (!month) return null;

  const [latest] = await db
    .select()
    .from(dailySessions)
    .where(eq(dailySessions.monthId, month.id))
    .orderBy(desc(dailySessions.date))
    .limit(1);

  const source = latest ?? (await latestSessionBefore(monthKey));
  if (!source) return null;

  // Keep only people who ARE on the roster of the period being viewed. The
  // source session may belong to the previous period with a completely
  // different member list; copying it verbatim would pre-fill ids of people not
  // in this period, and the money divided among them would vanish from the
  // total.
  const attendees = await db
    .select({ memberId: sessionAttendees.memberId })
    .from(sessionAttendees)
    .innerJoin(monthMembers, eq(monthMembers.memberId, sessionAttendees.memberId))
    .where(
      and(eq(sessionAttendees.sessionId, source.id), eq(monthMembers.monthId, month.id))
    );

  return {
    courtName: source.courtName,
    courtFee: source.courtFee,
    courtPayerId: source.courtPayerId,
    shuttlecockCount: source.shuttlecockCount,
    shuttlecockPricePerItem: source.shuttlecockPricePerItem,
    shuttlecockPayerId: source.shuttlecockPayerId,
    attendeeIds: attendees.map((a) => a.memberId),
  };
}

async function latestSessionBefore(monthKey: string) {
  const [prevMonth] = await db
    .select()
    .from(months)
    .where(lt(months.monthKey, monthKey))
    .orderBy(desc(months.monthKey))
    .limit(1);
  if (!prevMonth) return null;

  const [row] = await db
    .select()
    .from(dailySessions)
    .where(eq(dailySessions.monthId, prevMonth.id))
    .orderBy(desc(dailySessions.date))
    .limit(1);
  return row ?? null;
}

function groupBy<T, K, V>(rows: T[], key: (r: T) => K, value: (r: T) => V): Map<K, V[]> {
  const map = new Map<K, V[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(value(row));
    else map.set(k, [value(row)]);
  }
  return map;
}

/** Admins added by a super admin. Super admins are not in this table. */
export async function listAdmins() {
  return db
    .select({
      email: admins.email,
      addedAt: admins.addedAt,
      addedBy: admins.addedBy,
    })
    .from(admins)
    .orderBy(asc(admins.email));
}

/** Every court, including disabled ones — used by the management screen. */
export async function listCourts() {
  return db
    .select({
      id: courts.id,
      name: courts.name,
      defaultFee: courts.defaultFee,
      isActive: courts.isActive,
    })
    .from(courts)
    .orderBy(asc(courts.name));
}

/** Only courts currently in use — feeds the dropdown when recording a session. */
export async function listActiveCourts() {
  return db
    .select({
      id: courts.id,
      name: courts.name,
      defaultFee: courts.defaultFee,
    })
    .from(courts)
    .where(eq(courts.isActive, true))
    .orderBy(asc(courts.name));
}

/**
 * Every member ever created, flagged with whether they already belong to the
 * period being viewed.
 *
 * Members are one shared roster rather than a per-period list: a person is
 * created once and ticked into whichever periods they play in. Someone who
 * belongs to no period at all is a normal state, not leftover data.
 */
export async function listRoster(monthKey: string) {
  const month = await getMonthByKey(monthKey);

  const inMonth = new Set<string>(
    month
      ? (
          await db
            .select({ memberId: monthMembers.memberId })
            .from(monthMembers)
            .where(eq(monthMembers.monthId, month.id))
        ).map((r) => r.memberId)
      : []
  );

  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      phone: members.phone,
      qrImagePath: members.qrImagePath,
      isPermanent: members.isPermanent,
    })
    .from(members)
    .orderBy(asc(members.name));

  return rows.map(({ qrImagePath, ...m }) => ({
    ...m,
    hasQr: qrImagePath !== null,
    inMonth: inMonth.has(m.id),
  }));
}

/** Every transfer recorded in a period, newest first — the history screen. */
export async function listPayments(monthKey: string) {
  const month = await getMonthByKey(monthKey);
  if (!month) return [];

  const fromMember = alias(members, 'from_member');
  const toMember = alias(members, 'to_member');

  return db
    .select({
      id: payments.id,
      amount: payments.amount,
      paidAt: payments.paidAt,
      fromMemberId: payments.fromMemberId,
      fromName: fromMember.name,
      toMemberId: payments.toMemberId,
      toName: toMember.name,
    })
    .from(payments)
    .innerJoin(fromMember, eq(fromMember.id, payments.fromMemberId))
    .innerJoin(toMember, eq(toMember.id, payments.toMemberId))
    .where(eq(payments.monthId, month.id))
    .orderBy(desc(payments.paidAt));
}
