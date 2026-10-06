/**
 * Rules for who may pay and receive on someone else's behalf in a period.
 *
 * Covers are kept to a single hop: a coverer cannot themselves be covered, and
 * a covered member cannot cover anyone. Chains would make it unclear who
 * actually sends the money, and the settlement only follows one hop.
 *
 * `current` maps covered member → coverer for the period.
 */
export function validateCover(
  current: Map<string, string>,
  memberId: string,
  coveredById: string | null
): string | null {
  if (!coveredById) return null;
  if (coveredById === memberId) return 'Không thể tự trả giúp chính mình';
  if (current.has(coveredById)) return 'Người được chọn đang được người khác trả giúp';
  for (const [covered, coverer] of current) {
    if (coverer === memberId && covered !== memberId) {
      return 'Người này đang trả giúp người khác nên không thể được trả giúp';
    }
  }
  return null;
}

/**
 * Which covers carried over from earlier periods can be kept in the target
 * period, given the covers it already has. Anything that would break the
 * single-hop rule is dropped rather than failing the whole carry-over.
 */
export function acceptInheritedCovers(
  existing: Map<string, string>,
  inherited: Map<string, string>
): Map<string, string> {
  const current = new Map(existing);
  const accepted = new Map<string, string>();
  for (const [memberId, coveredById] of inherited) {
    if (validateCover(current, memberId, coveredById) !== null) continue;
    current.set(memberId, coveredById);
    accepted.set(memberId, coveredById);
  }
  return accepted;
}

/**
 * Which covers a new period should start with, from each member's history.
 *
 * Only a member's latest earlier period counts: if the cover was cleared there,
 * or set for that period only (someone short of money once), the member pays
 * for themselves from now on — even if an older period had a recurring cover.
 */
export function pickInheritedCovers(
  history: { memberId: string; coveredById: string | null; recurring: boolean; monthKey: string }[]
): Map<string, string> {
  const latest = new Map<string, (typeof history)[number]>();
  for (const row of history) {
    const seen = latest.get(row.memberId);
    if (!seen || row.monthKey > seen.monthKey) latest.set(row.memberId, row);
  }

  const picked = new Map<string, string>();
  for (const [memberId, row] of latest) {
    if (row.coveredById && row.recurring) picked.set(memberId, row.coveredById);
  }
  return picked;
}
