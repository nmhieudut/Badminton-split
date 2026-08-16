export type ExpenseCategory = 'court' | 'shuttlecock' | 'drink' | 'gathering' | 'other';

export interface Member {
  id: string;
  name: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  qrCodeImage?: string; // Base64 data URL or image URL for custom uploaded QR code
  color?: string;
  isPermanent?: boolean; // Thành viên cố định hay vãng lai
}

export interface DailySession {
  id: string;
  date: string; // '2026-08-01'
  title?: string; // 'Buổi đánh Thứ 2'
  courtName: string; // 'Sân 3 - Kỳ Hòa'
  courtFee: number; // 200000
  courtPayerId: string; // Member who paid court
  shuttlecockCount: number; // 4 quả
  shuttlecockPricePerItem: number; // 25000 (đơn giá / quả)
  shuttlecockPayerId: string; // Member who provided/paid shuttlecocks
  shuttlecockTotalFee?: number; // Override if manual (e.g., 100000)
  drinkFee?: number; // 30000 (nước suối, trà đá)
  drinkPayerId?: string; // Member who paid drink
  otherFee?: number; // Phí khác nếu có
  otherFeePayerId?: string;
  attendeeIds: string[]; // Danh sách ID thành viên có mặt buổi này
  note?: string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidById: string;
  splitType: 'all' | 'custom';
  participantIds: string[]; // Danh sách id người cùng chia
  date: string;
  note?: string;
}

export interface SettlementResult {
  memberId: string;
  member: Member;
  totalPaid: number; // Tổng số tiền đã chi trước (bao gồm cả tiền sân/cầu/nước theo buổi và khoản chi khác)
  totalShare: number; // Tổng số tiền phải chịu (tính chuẩn theo các buổi có mặt và khoản chi tham gia)
  netBalance: number; // totalPaid - totalShare: >0 là nhận lại, <0 là phải đóng thêm
  sessionsAttendedCount?: number; // Số buổi đã tham gia trong tháng
  dailyCourtShare?: number; // Tổng tiền sân phải chịu theo buổi
  dailyShuttleShare?: number; // Tổng tiền cầu phải chịu theo buổi
  dailyDrinkShare?: number; // Tổng tiền nước/khác theo buổi
  otherExpenseShare?: number; // Tổng chi phí chung khác
}

export interface DebtTransfer {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  isCompleted?: boolean;
  toMemberQrImage?: string;
  toMemberBank?: {
    bankName?: string;
    bankAccount?: string;
    bankAccountName?: string;
  };
}

export interface MonthSession {
  id: string;
  monthKey: string; // '2026-08'
  title: string; // 'Tháng 08/2026'
  createdAt: string;
  members: Member[];
  dailySessions?: DailySession[]; // Danh sách các buổi đánh theo ngày (có điểm danh, số cầu, sân)
  expenses: ExpenseItem[]; // Các khoản chi chung khác (hoặc chi phí phát sinh)
  settledTransferIds?: string[];
  initialFund?: number; // Quỹ đầu kỳ nếu có
  note?: string;
}

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string; bgColor: string; borderColor: string }
> = {
  court: {
    label: 'Tiền Sân',
    icon: 'Court',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  shuttlecock: {
    label: 'Quả Cầu Lông',
    icon: 'Shuttlecock',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  drink: {
    label: 'Nước Uống',
    icon: 'Drink',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  gathering: {
    label: 'Ăn Uống / Giao Lưu',
    icon: 'Gathering',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  other: {
    label: 'Phí Khác',
    icon: 'Other',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
};

export const VIETNAM_BANKS = [
  { code: 'MB', name: 'MB Bank (Quân Đội)', bin: '970422' },
  { code: 'VCB', name: 'Vietcombank', bin: '970436' },
  { code: 'TCB', name: 'Techcombank', bin: '970407' },
  { code: 'VPB', name: 'VPBank', bin: '970432' },
  { code: 'ACB', name: 'ACB (Á Châu)', bin: '970416' },
  { code: 'BIDV', name: 'BIDV', bin: '970418' },
  { code: 'VTB', name: 'VietinBank', bin: '970415' },
  { code: 'TPB', name: 'TPBank', bin: '970423' },
  { code: 'STB', name: 'Sacombank', bin: '970403' },
  { code: 'OCB', name: 'OCB', bin: '970448' },
  { code: 'SHB', name: 'SHB', bin: '970443' },
  { code: 'MSB', name: 'MSB (Hàng Hải)', bin: '970426' },
  { code: 'VIB', name: 'VIB', bin: '970441' },
  { code: 'MOMO', name: 'Ví MoMo', bin: 'MOMO' },
  { code: 'ZALOPAY', name: 'Ví ZaloPay', bin: 'ZALOPAY' },
];
