import { allocate } from './allocate';
import type {
  SettlementDailySession,
  SettlementInput,
  SettlementOutput,
  SettlementRow,
  Transfer,
  TransferLine,
} from './types';

/**
 * A balance smaller than this threshold is not worth generating a transfer for.
 *
 * Every place that shows "still owes / gets back / all square" must share this
 * one constant. The settlement table used to use 100 while the Zalo report used
 * 500, so someone with a balance of 300 đồng showed as still owing on the table
 * but "ĐÃ ĐỦ" in the report sent to the group — while no transfer was ever
 * generated for them.
 */
export const ROUNDING_THRESHOLD = 500;

export function calculateSettlement(input: SettlementInput): SettlementOutput {
  const { members, dailySessions } = input;

  const memberIds = new Set(members.map((m) => m.id));

  /**
   * Drop any id that is not on this period's member roster.
   *
   * A session can still hold the id of someone removed from the period, or an
   * id picked up by mistake from another period. If money is divided across
   * those ids too, their shares cannot be credited to anybody and vanish from
   * the total — splitting 200.000 across 11 ids while the period only has 5
   * people made 109.090 đồng evaporate, and left the net balances not summing
   * to zero. So the filtering has to happen BEFORE the division, not after.
   */
  const onlyPeriodMembers = (ids: string[]) => ids.filter((id) => memberIds.has(id));

  const zero = () => new Map(members.map((m) => [m.id, 0]));
  const paid = zero();
  const share = zero();
  const attended = zero();
  const courtShare = zero();
  const shuttleShare = zero();
  const drinkShare = zero();

  const add = (map: Map<string, number>, id: string | null, amount: number) => {
    if (!id || !map.has(id)) return;
    map.set(id, map.get(id)! + amount);
  };

  let totalCost = 0;
  let totalCourtCost = 0;
  let totalShuttleCost = 0;
  let totalOtherCost = 0;

  for (const s of dailySessions) {
    const shuttleFee =
      s.shuttlecockTotalFee ?? s.shuttlecockCount * s.shuttlecockPricePerItem;

    totalCourtCost += s.courtFee;
    totalShuttleCost += shuttleFee;
    totalOtherCost += s.drinkFee + s.otherFee;
    totalCost += s.courtFee + shuttleFee + s.drinkFee + s.otherFee;

    add(paid, s.courtPayerId, s.courtFee);
    add(paid, s.shuttlecockPayerId, shuttleFee);
    if (s.drinkFee > 0) add(paid, s.drinkPayerId, s.drinkFee);
    if (s.otherFee > 0) add(paid, s.otherFeePayerId, s.otherFee);

    // A session with no attendance recorded — or with nothing but unknown ids
    // — is treated as the whole group sharing the cost.
    const rosterAttendees = onlyPeriodMembers(s.attendeeIds);
    const attendees = rosterAttendees.length > 0 ? rosterAttendees : members.map((m) => m.id);
    if (attendees.length === 0) continue;

    const court = allocate(s.courtFee, attendees);
    const shuttle = allocate(shuttleFee, attendees);
    const drink = allocate(s.drinkFee + s.otherFee, attendees);

    for (const id of attendees) {
      add(attended, id, 1);
      add(courtShare, id, court.get(id) ?? 0);
      add(shuttleShare, id, shuttle.get(id) ?? 0);
      add(drinkShare, id, drink.get(id) ?? 0);
      add(
        share,
        id,
        (court.get(id) ?? 0) + (shuttle.get(id) ?? 0) + (drink.get(id) ?? 0)
      );
    }
  }


  const rows: SettlementRow[] = members.map((m) => ({
    memberId: m.id,
    name: m.name,
    totalPaid: paid.get(m.id) ?? 0,
    totalShare: share.get(m.id) ?? 0,
    netBalance: (paid.get(m.id) ?? 0) - (share.get(m.id) ?? 0),
    sessionsAttendedCount: attended.get(m.id) ?? 0,
    courtShare: courtShare.get(m.id) ?? 0,
    shuttleShare: shuttleShare.get(m.id) ?? 0,
    drinkShare: drinkShare.get(m.id) ?? 0,
  }));

  return {
    rows,
    transfers: buildTransfers(rows, dailySessions, memberIds),
    totalCost,
    totalCourtCost,
    totalShuttleCost,
    totalOtherCost,
  };
}

/**
 * Who owes whom, taken straight from the sessions.
 *
 * Each person owes their share of a cost to whoever actually fronted it, so
 * every amount can be checked against a session that person was at. The
 * previous version worked from net balances and greedily matched the largest
 * debtor to the largest creditor: that produced the fewest transfers, but the
 * amounts corresponded to nothing that happened. Someone who played one evening
 * where two other people paid could be told to send money to a third person he
 * never shared a court with, for a number matching no session — and had no way
 * to check it.
 *
 * Debts between the same two people are offset against each other. That still
 * only ever involves the two of them, so both can still verify it.
 */
function buildTransfers(
  rows: SettlementRow[],
  sessions: SettlementDailySession[],
  memberIds: Set<string>
): Transfer[] {
  const nameOf = new Map(rows.map((r) => [r.memberId, r.name]));

  // debtor -> creditor -> the sessions behind that debt
  const owed = new Map<string, Map<string, TransferLine[]>>();

  const record = (debtor: string, creditor: string, line: TransferLine) => {
    if (debtor === creditor || line.amount === 0) return;
    const byCreditor = owed.get(debtor) ?? new Map<string, TransferLine[]>();
    byCreditor.set(creditor, [...(byCreditor.get(creditor) ?? []), line]);
    owed.set(debtor, byCreditor);
  };

  for (const s of sessions) {
    const rosterAttendees = s.attendeeIds.filter((id) => memberIds.has(id));
    const attendees =
      rosterAttendees.length > 0 ? rosterAttendees : [...memberIds];
    if (attendees.length === 0) continue;

    const shuttleFee =
      s.shuttlecockTotalFee ?? s.shuttlecockCount * s.shuttlecockPricePerItem;

    const costs = [
      { label: 'Sân', amount: s.courtFee, payerId: s.courtPayerId },
      {
        label: `Cầu · ${s.shuttlecockCount} quả`,
        amount: shuttleFee,
        payerId: s.shuttlecockPayerId,
      },
      { label: 'Nước', amount: s.drinkFee, payerId: s.drinkPayerId },
      { label: 'Khác', amount: s.otherFee, payerId: s.otherFeePayerId },
    ];

    for (const cost of costs) {
      // Nobody recorded as having paid means there is no one to owe it to; the
      // amount still counts in everyone's share, it just generates no transfer.
      if (cost.amount <= 0 || !cost.payerId || !memberIds.has(cost.payerId)) continue;

      const perPerson = allocate(cost.amount, attendees);
      for (const id of attendees) {
        record(id, cost.payerId, {
          date: s.date,
          label: cost.label,
          amount: perPerson.get(id) ?? 0,
        });
      }
    }
  }

  // Offset the two directions between the same pair, then keep whichever side
  // is left owing.
  const transfers: Transfer[] = [];
  const done = new Set<string>();

  for (const [debtor, byCreditor] of owed) {
    for (const [creditor] of byCreditor) {
      const pairKey = [debtor, creditor].sort().join('::');
      if (done.has(pairKey)) continue;
      done.add(pairKey);

      const forward = owed.get(debtor)?.get(creditor) ?? [];
      const back = owed.get(creditor)?.get(debtor) ?? [];
      const net =
        forward.reduce((t, l) => t + l.amount, 0) - back.reduce((t, l) => t + l.amount, 0);

      if (Math.abs(net) <= ROUNDING_THRESHOLD) continue;

      const [from, to, own, other] =
        net > 0 ? [debtor, creditor, forward, back] : [creditor, debtor, back, forward];

      transfers.push({
        fromMemberId: from,
        fromMemberName: nameOf.get(from) ?? '',
        toMemberId: to,
        toMemberName: nameOf.get(to) ?? '',
        amount: Math.abs(net),
        lines: [
          ...own.map((l) => ({ ...l })),
          // What the other side owes back, shown as a deduction.
          ...other.map((l) => ({ ...l, amount: -l.amount })),
        ].sort((x, y) => y.date.localeCompare(x.date)),
      });
    }
  }

  // Biggest debt first, with a stable tie-break so the order does not shuffle.
  return transfers.sort(
    (a, b) =>
      b.amount - a.amount ||
      a.fromMemberName.localeCompare(b.fromMemberName) ||
      a.toMemberName.localeCompare(b.toMemberName)
  );
}
