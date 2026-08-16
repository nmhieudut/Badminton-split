import { allocate } from './allocate';
import type {
  SettlementInput,
  SettlementOutput,
  SettlementRow,
  Transfer,
} from './types';

/**
 * Chênh lệch nhỏ hơn ngưỡng này không đáng sinh một lần chuyển khoản.
 *
 * Mọi nơi hiển thị "còn nợ / được nhận / đã đủ" đều phải dùng chung hằng số
 * này. Trước đây bảng quyết toán dùng 100 còn báo cáo Zalo dùng 500, nên người
 * có số dư 300 đồng hiện là còn nợ trên bảng nhưng "ĐÃ ĐỦ" trong báo cáo gửi
 * lên nhóm, mà lại không có giao dịch nào được sinh ra cho họ.
 */
export const NGUONG_BO_QUA = 500;

export function calculateSettlement(input: SettlementInput): SettlementOutput {
  const { members, dailySessions, expenses } = input;

  const memberIds = new Set(members.map((m) => m.id));

  /**
   * Bỏ id không thuộc danh sách thành viên của kỳ.
   *
   * Buổi đánh có thể còn lưu id của người đã bị gỡ khỏi kỳ, hoặc id lấy nhầm
   * từ kỳ khác. Nếu chia tiền cho cả những id đó thì phần của họ không cộng
   * được vào ai và biến mất khỏi tổng — 200.000 chia cho 11 id trong khi kỳ
   * chỉ có 5 người thì 109.090 đồng bốc hơi, và tổng số dư ròng khác 0.
   */
  const chiGiuNguoiTrongKy = (ids: string[]) => ids.filter((id) => memberIds.has(id));

  const zero = () => new Map(members.map((m) => [m.id, 0]));
  const paid = zero();
  const share = zero();
  const attended = zero();
  const courtShare = zero();
  const shuttleShare = zero();
  const drinkShare = zero();
  const expenseShare = zero();

  const add = (map: Map<string, number>, id: string | null, amount: number) => {
    if (!id || !map.has(id)) return;
    map.set(id, map.get(id)! + amount);
  };

  let totalExpenses = 0;
  let totalCourtCost = 0;
  let totalShuttleCost = 0;
  let totalOtherCost = 0;

  for (const s of dailySessions) {
    const shuttleFee =
      s.shuttlecockTotalFee ?? s.shuttlecockCount * s.shuttlecockPricePerItem;

    totalCourtCost += s.courtFee;
    totalShuttleCost += shuttleFee;
    totalOtherCost += s.drinkFee + s.otherFee;
    totalExpenses += s.courtFee + shuttleFee + s.drinkFee + s.otherFee;

    add(paid, s.courtPayerId, s.courtFee);
    add(paid, s.shuttlecockPayerId, shuttleFee);
    if (s.drinkFee > 0) add(paid, s.drinkPayerId, s.drinkFee);
    if (s.otherFee > 0) add(paid, s.otherFeePayerId, s.otherFee);

    // Buổi không ghi người có mặt — hoặc chỉ ghi toàn id lạ — thì coi như cả
    // nhóm cùng chịu.
    const coMat = chiGiuNguoiTrongKy(s.attendeeIds);
    const attendees = coMat.length > 0 ? coMat : members.map((m) => m.id);
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

  for (const e of expenses) {
    totalExpenses += e.amount;
    add(paid, e.paidById, e.amount);

    const thamGia = chiGiuNguoiTrongKy(e.participantIds);
    const participants =
      e.splitType === 'all' || thamGia.length === 0 ? members.map((m) => m.id) : thamGia;
    if (participants.length === 0) continue;

    const parts = allocate(e.amount, participants);
    for (const id of participants) {
      add(expenseShare, id, parts.get(id) ?? 0);
      add(share, id, parts.get(id) ?? 0);
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
    expenseShare: expenseShare.get(m.id) ?? 0,
  }));

  return {
    rows,
    transfers: buildTransfers(rows),
    totalExpenses,
    totalCourtCost,
    totalShuttleCost,
    totalOtherCost,
  };
}

/**
 * Khớp tham lam người nợ nhiều nhất với người được nhận nhiều nhất để số lần
 * chuyển khoản là ít nhất. Sắp xếp có phá hòa bằng id nên kết quả ổn định.
 */
function buildTransfers(rows: SettlementRow[]): Transfer[] {
  const nameOf = new Map(rows.map((r) => [r.memberId, r.name]));

  const debtors = rows
    .filter((r) => r.netBalance < -NGUONG_BO_QUA)
    .map((r) => ({ id: r.memberId, amount: -r.netBalance }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const creditors = rows
    .filter((r) => r.netBalance > NGUONG_BO_QUA)
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
