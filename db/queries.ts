import { and, asc, desc, eq, inArray, lt } from 'drizzle-orm';
import { db } from './index';
import {
  dailySessions,
  expenseParticipants,
  expenses,
  members,
  monthMembers,
  months,
  sessionAttendees,
  settledTransfers,
} from './schema';
import { calculateSettlement } from '../lib/settlement/calculate';
import type { ExpenseCategory } from '../lib/settlement/types';

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

  const expenseRows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.monthId, month.id))
    .orderBy(desc(expenses.date));

  const expenseIds = expenseRows.map((e) => e.id);
  const participantRows = expenseIds.length
    ? await db
        .select()
        .from(expenseParticipants)
        .where(inArray(expenseParticipants.expenseId, expenseIds))
    : [];

  const settledRows = await db
    .select()
    .from(settledTransfers)
    .where(eq(settledTransfers.monthId, month.id));

  const attendeesBySession = groupBy(
    attendeeRows,
    (r) => r.sessionId,
    (r) => r.memberId
  );
  const participantsByExpense = groupBy(
    participantRows,
    (r) => r.expenseId,
    (r) => r.memberId
  );

  const sessionsWithAttendees = sessionRows.map((s) => ({
    ...s,
    attendeeIds: attendeesBySession.get(s.id) ?? [],
  }));

  const expensesWithParticipants = expenseRows.map((e) => ({
    ...e,
    participantIds: participantsByExpense.get(e.id) ?? [],
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
    expenses: expensesWithParticipants.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category as ExpenseCategory,
      amount: e.amount,
      paidById: e.paidById,
      splitType: e.splitType as 'all' | 'custom',
      participantIds: e.participantIds,
    })),
  });

  const settledKeys = new Set(settledRows.map((r) => `${r.fromMemberId}::${r.toMemberId}`));

  return {
    month,
    members: memberRows,
    dailySessions: sessionsWithAttendees,
    expenses: expensesWithParticipants,
    settlement: {
      ...settlement,
      transfers: settlement.transfers.map((t) => ({
        ...t,
        isSettled: settledKeys.has(`${t.fromMemberId}::${t.toMemberId}`),
      })),
    },
  };
}

/**
 * Thông số của buổi đánh gần nhất, dùng làm giá trị mặc định khi ghi buổi mới.
 * Thay cho các hằng số cứng ('Sân 3 - Kỳ Hòa', 180000, 4 quả) trong bản cũ.
 * Nếu tháng đang xem chưa có buổi nào thì lấy buổi cuối của tháng trước đó.
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

  // Chỉ giữ những người CÓ TRONG kỳ đang xem. Buổi nguồn có thể thuộc kỳ trước
  // với danh sách thành viên khác hẳn; lấy nguyên si sẽ điền sẵn id của người
  // không thuộc kỳ này, và tiền chia cho họ sẽ biến mất khỏi tổng.
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
