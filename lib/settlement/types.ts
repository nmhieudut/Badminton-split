export type ExpenseCategory = 'court' | 'shuttlecock' | 'drink' | 'gathering' | 'other';

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

export interface SettlementExpense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidById: string;
  splitType: 'all' | 'custom';
  participantIds: string[];
}

export interface SettlementInput {
  members: SettlementMember[];
  dailySessions: SettlementDailySession[];
  expenses: SettlementExpense[];
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
  expenseShare: number;
}

export interface Transfer {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

export interface SettlementOutput {
  rows: SettlementRow[];
  transfers: Transfer[];
  totalExpenses: number;
  totalCourtCost: number;
  totalShuttleCost: number;
  totalOtherCost: number;
}
