import { allocate } from './allocate';
import type {
  SettlementInput,
  SettlementOutput,
  SettlementRow,
  Transfer,
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
    transfers: buildTransfers(rows),
    totalCost,
    totalCourtCost,
    totalShuttleCost,
    totalOtherCost,
  };
}

/**
 * Greedily matches the largest debtor with the largest creditor so the number
 * of transfers stays minimal. Sorting breaks ties by id, so the result is
 * stable across runs.
 */
function buildTransfers(rows: SettlementRow[]): Transfer[] {
  const nameOf = new Map(rows.map((r) => [r.memberId, r.name]));

  const debtors = rows
    .filter((r) => r.netBalance < -ROUNDING_THRESHOLD)
    .map((r) => ({ id: r.memberId, amount: -r.netBalance }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const creditors = rows
    .filter((r) => r.netBalance > ROUNDING_THRESHOLD)
    .map((r) => ({ id: r.memberId, amount: r.netBalance }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount);

    if (amount > 0) {
      transfers.push({
        fromMemberId: debtors[d].id,
        fromMemberName: nameOf.get(debtors[d].id) ?? '',
        toMemberId: creditors[c].id,
        toMemberName: nameOf.get(creditors[c].id) ?? '',
        amount,
      });
    }

    debtors[d].amount -= amount;
    creditors[c].amount -= amount;
    if (debtors[d].amount === 0) d += 1;
    if (creditors[c].amount === 0) c += 1;
  }

  return transfers;
}
