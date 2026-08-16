export interface LegacyMember {
  id: string;
  name: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  qrCodeImage?: string;
  color?: string;
  isPermanent?: boolean;
}

export interface LegacyDailySession {
  id: string;
  date: string;
  title?: string;
  courtName: string;
  courtFee: number;
  courtPayerId: string;
  shuttlecockCount: number;
  shuttlecockPricePerItem: number;
  shuttlecockPayerId: string;
  shuttlecockTotalFee?: number;
  drinkFee?: number;
  drinkPayerId?: string;
  otherFee?: number;
  otherFeePayerId?: string;
  attendeeIds: string[];
  note?: string;
}

export interface LegacyExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  paidById: string;
  splitType: 'all' | 'custom';
  participantIds: string[];
  date: string;
  note?: string;
}

export interface LegacyMonthSession {
  id: string;
  monthKey: string;
  title: string;
  createdAt: string;
  members: LegacyMember[];
  dailySessions?: LegacyDailySession[];
  expenses: LegacyExpense[];
  settledTransferIds?: string[];
  initialFund?: number;
  note?: string;
}
