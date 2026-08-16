import { DailySession, DebtTransfer, ExpenseItem, Member, MonthSession, SettlementResult } from '../types';

export const MEMBER_COLORS = [
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-sky-100 text-sky-800 border-sky-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-orange-100 text-orange-800 border-orange-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
];

export function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

export function formatVND(amount: number): string {
  if (isNaN(amount)) return '0 đ';
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('vi-VN').format(rounded) + ' đ';
}

export function parseVNDInput(input: string): number {
  if (!input) return 0;
  let clean = input.trim().toLowerCase();
  if (clean.endsWith('k') || clean.endsWith('ngàn') || clean.endsWith('nghin')) {
    const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num * 1000;
  }
  if (clean.endsWith('tr') || clean.endsWith('m') || clean.endsWith('trieu') || clean.endsWith('triệu')) {
    const num = parseFloat(clean.replace(',', '.').replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num * 1000000;
  }
  const cleanNumber = clean.replace(/[^0-9]/g, '');
  const val = parseInt(cleanNumber, 10);
  return isNaN(val) ? 0 : val;
}

export function calculateSettlement(
  members: Member[],
  expenses: ExpenseItem[] = [],
  dailySessions: DailySession[] = []
): {
  results: SettlementResult[];
  totalExpenses: number;
  totalDailyCourtCost: number;
  totalDailyShuttleCost: number;
  totalDailyOtherCost: number;
  transfers: DebtTransfer[];
} {
  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.id, m));

  const totalPaidMap = new Map<string, number>();
  const totalShareMap = new Map<string, number>();
  const sessionsAttendedMap = new Map<string, number>();
  const dailyCourtShareMap = new Map<string, number>();
  const dailyShuttleShareMap = new Map<string, number>();
  const dailyDrinkShareMap = new Map<string, number>();
  const otherExpenseShareMap = new Map<string, number>();

  members.forEach((m) => {
    totalPaidMap.set(m.id, 0);
    totalShareMap.set(m.id, 0);
    sessionsAttendedMap.set(m.id, 0);
    dailyCourtShareMap.set(m.id, 0);
    dailyShuttleShareMap.set(m.id, 0);
    dailyDrinkShareMap.set(m.id, 0);
    otherExpenseShareMap.set(m.id, 0);
  });

  let totalExpenses = 0;
  let totalDailyCourtCost = 0;
  let totalDailyShuttleCost = 0;
  let totalDailyOtherCost = 0;

  // 1. Process Daily Badminton Sessions (Sân, số trái cầu, nước, người có mặt từng ngày)
  for (const session of dailySessions) {
    const courtFee = session.courtFee || 0;
    const shuttleFee =
      session.shuttlecockTotalFee !== undefined
        ? session.shuttlecockTotalFee
        : (session.shuttlecockCount || 0) * (session.shuttlecockPricePerItem || 25000);
    const drinkFee = session.drinkFee || 0;
    const otherFee = session.otherFee || 0;

    const sessionTotal = courtFee + shuttleFee + drinkFee + otherFee;
    totalExpenses += sessionTotal;
    totalDailyCourtCost += courtFee;
    totalDailyShuttleCost += shuttleFee;
    totalDailyOtherCost += drinkFee + otherFee;

    // Credit payers
    if (session.courtPayerId) {
      const current = totalPaidMap.get(session.courtPayerId) || 0;
      totalPaidMap.set(session.courtPayerId, current + courtFee);
    }
    if (session.shuttlecockPayerId) {
      const current = totalPaidMap.get(session.shuttlecockPayerId) || 0;
      totalPaidMap.set(session.shuttlecockPayerId, current + shuttleFee);
    }
    if (session.drinkPayerId && drinkFee > 0) {
      const current = totalPaidMap.get(session.drinkPayerId) || 0;
      totalPaidMap.set(session.drinkPayerId, current + drinkFee);
    }
    if (session.otherFeePayerId && otherFee > 0) {
      const current = totalPaidMap.get(session.otherFeePayerId) || 0;
      totalPaidMap.set(session.otherFeePayerId, current + otherFee);
    }

    // Determine attendees for this specific day
    const attendees =
      session.attendeeIds && session.attendeeIds.length > 0
        ? session.attendeeIds
        : members.map((m) => m.id);

    if (attendees.length > 0) {
      const courtSharePerPerson = courtFee / attendees.length;
      const shuttleSharePerPerson = shuttleFee / attendees.length;
      const drinkSharePerPerson = (drinkFee + otherFee) / attendees.length;
      const sessionTotalSharePerPerson = sessionTotal / attendees.length;

      for (const attendeeId of attendees) {
        const curShare = totalShareMap.get(attendeeId) || 0;
        totalShareMap.set(attendeeId, curShare + sessionTotalSharePerPerson);

        const curAttended = sessionsAttendedMap.get(attendeeId) || 0;
        sessionsAttendedMap.set(attendeeId, curAttended + 1);

        const curCourt = dailyCourtShareMap.get(attendeeId) || 0;
        dailyCourtShareMap.set(attendeeId, curCourt + courtSharePerPerson);

        const curShuttle = dailyShuttleShareMap.get(attendeeId) || 0;
        dailyShuttleShareMap.set(attendeeId, curShuttle + shuttleSharePerPerson);

        const curDrink = dailyDrinkShareMap.get(attendeeId) || 0;
        dailyDrinkShareMap.set(attendeeId, curDrink + drinkSharePerPerson);
      }
    }
  }

  // 2. Process General / Other Expenses
  for (const exp of expenses) {
    totalExpenses += exp.amount;

    // Credit payer
    const currentPaid = totalPaidMap.get(exp.paidById) || 0;
    totalPaidMap.set(exp.paidById, currentPaid + exp.amount);

    // Determine who shares this expense
    let participants = exp.participantIds;
    if (!participants || participants.length === 0 || exp.splitType === 'all') {
      participants = members.map((m) => m.id);
    }

    if (participants.length > 0) {
      const sharePerPerson = exp.amount / participants.length;
      for (const pId of participants) {
        const currentShare = totalShareMap.get(pId) || 0;
        totalShareMap.set(pId, currentShare + sharePerPerson);

        const currentOther = otherExpenseShareMap.get(pId) || 0;
        otherExpenseShareMap.set(pId, currentOther + sharePerPerson);
      }
    }
  }

  // 3. Assemble Settlement Results for each member
  const results: SettlementResult[] = members.map((m) => {
    const paid = totalPaidMap.get(m.id) || 0;
    const share = totalShareMap.get(m.id) || 0;
    const net = paid - share;

    return {
      memberId: m.id,
      member: m,
      totalPaid: paid,
      totalShare: share,
      netBalance: net,
      sessionsAttendedCount: sessionsAttendedMap.get(m.id) || 0,
      dailyCourtShare: dailyCourtShareMap.get(m.id) || 0,
      dailyShuttleShare: dailyShuttleShareMap.get(m.id) || 0,
      dailyDrinkShare: dailyDrinkShareMap.get(m.id) || 0,
      otherExpenseShare: otherExpenseShareMap.get(m.id) || 0,
    };
  });

  // 4. Calculate optimized transfers (Debt simplification algorithm)
  const debtors: { memberId: string; amount: number }[] = [];
  const creditors: { memberId: string; amount: number }[] = [];

  results.forEach((r) => {
    const roundedNet = Math.round(r.netBalance);
    if (roundedNet < -100) {
      debtors.push({ memberId: r.memberId, amount: -roundedNet });
    } else if (roundedNet > 100) {
      creditors.push({ memberId: r.memberId, amount: roundedNet });
    }
  });

  // Sort descending by amount for greedy matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const matchAmount = Math.min(debtor.amount, creditor.amount);

    if (matchAmount > 500) {
      const debtorMember = memberMap.get(debtor.memberId);
      const creditorMember = memberMap.get(creditor.memberId);

      transfers.push({
        id: `${debtor.memberId}-${creditor.memberId}-${Math.round(matchAmount)}`,
        fromMemberId: debtor.memberId,
        fromMemberName: debtorMember ? debtorMember.name : 'Unknown',
        toMemberId: creditor.memberId,
        toMemberName: creditorMember ? creditorMember.name : 'Unknown',
        amount: Math.round(matchAmount),
        toMemberQrImage: creditorMember?.qrCodeImage,
        toMemberBank: creditorMember
          ? {
              bankName: creditorMember.bankName,
              bankAccount: creditorMember.bankAccount,
              bankAccountName: creditorMember.bankAccountName,
            }
          : undefined,
      });
    }

    debtor.amount -= matchAmount;
    creditor.amount -= matchAmount;

    if (debtor.amount <= 100) dIdx++;
    if (creditor.amount <= 100) cIdx++;
  }

  return {
    results,
    totalExpenses,
    totalDailyCourtCost,
    totalDailyShuttleCost,
    totalDailyOtherCost,
    transfers,
  };
}

export function generateVietQrUrl(params: {
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  amount: number;
  memo?: string;
}): string | null {
  if (!params.bankCode || !params.accountNumber) return null;
  const cleanBank = encodeURIComponent(params.bankCode.trim());
  const cleanAcc = encodeURIComponent(params.accountNumber.trim());
  const amount = Math.round(params.amount);
  const memo = encodeURIComponent(params.memo || 'Tien cau long');
  const accountName = params.accountName ? encodeURIComponent(params.accountName) : '';

  return `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-compact.png?amount=${amount}&addInfo=${memo}&accountName=${accountName}`;
}

export function generateZaloReport(session: MonthSession): string {
  const dailySessions = session.dailySessions || [];
  const expenses = session.expenses || [];
  const { results, totalExpenses, transfers } = calculateSettlement(
    session.members,
    expenses,
    dailySessions
  );

  const lines: string[] = [];
  lines.push(`🏸 BẢNG TỔNG KẾT TIỀN CẦU LÔNG - ${session.title.toUpperCase()} 🏸`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`👥 Tổng thành viên: ${session.members.length} người`);
  if (dailySessions.length > 0) {
    lines.push(`📅 Tổng số buổi đánh trong tháng: ${dailySessions.length} buổi`);
  }
  lines.push(`💰 Tổng chi phí kỳ này: ${formatVND(totalExpenses)}`);
  lines.push(``);

  // 1. Chi tiết từng buổi đánh (nếu có)
  if (dailySessions.length > 0) {
    lines.push(`🗓️ CHI TIẾT CÁC BUỔI ĐÁNH & SỐ CẦU:`);
    dailySessions.forEach((ds, idx) => {
      const attendees = ds.attendeeIds || [];
      const shuttleCount = ds.shuttlecockCount || 0;
      const shuttleTotal =
        ds.shuttlecockTotalFee ?? shuttleCount * (ds.shuttlecockPricePerItem || 25000);
      const totalFee = (ds.courtFee || 0) + shuttleTotal + (ds.drinkFee || 0) + (ds.otherFee || 0);
      const perPerson = attendees.length > 0 ? totalFee / attendees.length : 0;
      const attendeeNames = attendees
        .map((id) => session.members.find((m) => m.id === id)?.name || id)
        .join(', ');

      lines.push(
        `${idx + 1}. Ngày ${ds.date}: ${ds.courtName} (${formatVND(ds.courtFee)})`
      );
      lines.push(
        `   • Dùng: ${shuttleCount} trái cầu (${formatVND(shuttleTotal)})${
          ds.drinkFee ? ` + Nước: ${formatVND(ds.drinkFee)}` : ''
        }`
      );
      lines.push(
        `   • Có mặt (${attendees.length} người): ${attendeeNames}`
      );
      lines.push(
        `   • Tổng buổi: ${formatVND(totalFee)} 👉 Chia ra: ${formatVND(perPerson)}/người`
      );
      lines.push(``);
    });
  }

  // 2. Chi tiết các khoản chi chung khác
  if (expenses.length > 0) {
    lines.push(`📝 CÁC KHOẢN CHI CHUNG KHÁC:`);
    expenses.forEach((exp, idx) => {
      const payer = session.members.find((m) => m.id === exp.paidById)?.name || 'Ai đó';
      const dateStr = exp.date ? ` [${exp.date.split('-').slice(1).reverse().join('/')}]` : '';
      lines.push(
        `${idx + 1}. ${exp.title}: ${formatVND(exp.amount)} (Do ${payer} chi trước)${dateStr}`
      );
    });
    lines.push(``);
  }

  // 3. Đối soát từng thành viên
  lines.push(`📊 ĐỐI SOÁT THEO SỐ BUỔI CÓ MẶT CỦA TỪNG NGƯỜI:`);
  results.forEach((r) => {
    const statusText =
      r.netBalance > 500
        ? `👉 ĐƯỢC NHẬN LẠI: +${formatVND(r.netBalance)}`
        : r.netBalance < -500
        ? `👉 CẦN ĐÓNG THÊM: ${formatVND(Math.abs(r.netBalance))}`
        : `👉 ĐÃ ĐỦ (0 đ)`;

    const attendanceText =
      dailySessions.length > 0
        ? ` [Có mặt: ${r.sessionsAttendedCount || 0}/${dailySessions.length} buổi]`
        : '';

    lines.push(
      `• ${r.member.name}${attendanceText}:`
    );
    lines.push(
      `  - Đã chi trước: ${formatVND(r.totalPaid)}`
    );
    lines.push(
      `  - Phần phải chịu: ${formatVND(r.totalShare)}`
    );
    lines.push(`  ${statusText}`);
    lines.push(``);
  });

  // 4. Hướng dẫn chuyển khoản
  lines.push(`💸 HƯỚNG DẪN CHUYỂN KHOẢN THANH TOÁN TỐI ƯU:`);
  if (transfers.length === 0) {
    lines.push(`✨ Tất cả thành viên đã thanh toán cân bằng!`);
  } else {
    transfers.forEach((t, i) => {
      const bank = t.toMemberBank;
      const bankInfo =
        bank?.bankAccount && bank?.bankName
          ? ` (STK: ${bank.bankAccount} - ${bank.bankName}${
              bank.bankAccountName ? ` - ${bank.bankAccountName}` : ''
            })`
          : '';
      lines.push(
        `${i + 1}. [${t.fromMemberName}] chuyển 👉 [${t.toMemberName}]: ${formatVND(
          t.amount
        )}${bankInfo}`
      );
    });
  }

  lines.push(``);
  lines.push(`📌 Nội dung CK: [Tên_bạn] tien cau long ${session.monthKey}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Cảm ơn cả nhóm đã cùng ra sân! Chúc anh em đánh cầu vui vẻ & giữ sức khỏe! 🏸🔥`);

  return lines.join('\n');
}
