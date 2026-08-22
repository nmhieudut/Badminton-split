export interface SettlementMember {
  id: string;
  name: string;
}

export interface SettlementDailySession {
  id: string;
  date: string;
  courtFee: number;
  courtPayerId: string | null;
  shuttlecockCount: number;
  shuttlecockPricePerItem: number;
  shuttlecockTotalFee: number | null;
  shuttlecockPayerId: string | null;
  drinkFee: number;
  drinkPayerId: string | null;
  otherFee: number;
  otherFeePayerId: string | null;
  attendeeIds: string[];
}

export interface SettlementInput {
  members: SettlementMember[];
  dailySessions: SettlementDailySession[];
}

export interface SettlementRow {
  memberId: string;
  name: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
  sessionsAttendedCount: number;
  courtShare: number;
  shuttleShare: number;
  drinkShare: number;
}

/** One session's contribution to a debt, so the total can be checked against real events. */
export interface TransferLine {
  date: string;
  /** What the money was for: 'Sân', 'Cầu · 4 quả', 'Nước', 'Khác'. */
  label: string;
  /** Negative when this line runs the other way and is being offset. */
  amount: number;
}

export interface Transfer {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  /** Every session behind this amount, newest first. */
  lines: TransferLine[];
}

export interface SettlementOutput {
  rows: SettlementRow[];
  transfers: Transfer[];
  totalCost: number;
  /**
   * How much more the rounded-up shares come to than was actually spent.
   * Whoever fronted the money is reimbursed this much over; it is surfaced
   * rather than hidden so the group can see what the rounding costs.
   */
  roundingExcess: number;
  totalCourtCost: number;
  totalShuttleCost: number;
  totalOtherCost: number;
}
