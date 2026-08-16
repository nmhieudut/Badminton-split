import { randomUUID } from 'node:crypto';
import type { LegacyMonthSession } from './legacy-types';

export interface NormalizedMonth {
  id: string;
  monthKey: string;
  title: string;
  note: string | null;
  initialFund: number;
}

export interface NormalizedMember {
  id: string;
  name: string;
  phone: string | null;
  color: string | null;
  isPermanent: boolean;
  legacyQrImage: string | null;
}

export interface NormalizedDailySession {
  id: string;
  monthKey: string;
  date: string;
  title: string | null;
  courtName: string;
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
  note: string | null;
  attendeeIds: string[];
}

export interface NormalizedExpense {
  id: string;
  monthKey: string;
  title: string;
  category: string;
  amount: number;
  paidById: string;
  splitType: string;
  date: string;
  note: string | null;
  participantIds: string[];
}

export interface NormalizedSettledTransfer {
  monthKey: string;
  fromMemberId: string;
  toMemberId: string;
}

export interface NormalizedData {
  months: NormalizedMonth[];
  members: NormalizedMember[];
  monthMembers: { monthKey: string; memberId: string }[];
  dailySessions: NormalizedDailySession[];
  expenses: NormalizedExpense[];
  settledTransfers: NormalizedSettledTransfer[];
  warnings: { missingQr: string[] };
}

const chuanHoaTen = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Chuyển mảng MonthSession kiểu cũ (mỗi tháng là một blob JSON tự chứa) thành
 * các bảng quan hệ. Hàm thuần, không chạm database, để đối chiếu được bằng test.
 *
 * Điểm mấu chốt: id thành viên kiểu cũ chỉ duy nhất trong phạm vi một tháng, và
 * cùng một người ở hai tháng khác nhau có thể mang hai id khác nhau. Nên phải
 * gộp theo tên đã chuẩn hóa, rồi ánh xạ `(monthKey, id cũ) -> id mới`.
 */
export function normalizeLegacy(sessions: LegacyMonthSession[]): NormalizedData {
  const memberByKey = new Map<string, NormalizedMember>();
  const bankByKey = new Map<string, string>();
  const idMap = new Map<string, string>();
  const missingQr = new Set<string>();

  const out: NormalizedData = {
    months: [],
    members: [],
    monthMembers: [],
    dailySessions: [],
    expenses: [],
    settledTransfers: [],
    warnings: { missingQr: [] },
  };

  for (const s of sessions) {
    for (const m of s.members) {
      const key = chuanHoaTen(m.name);
      const account = (m.bankAccount ?? '').trim();

      if (memberByKey.has(key)) {
        const seen = bankByKey.get(key) ?? '';
        if (account && seen && account !== seen) {
          throw new Error(
            `Hai người trùng tên "${m.name.trim()}" nhưng khác số tài khoản. ` +
              'Hãy đổi tên một trong hai trong bản sao lưu rồi chạy lại.'
          );
        }
        if (account && !seen) bankByKey.set(key, account);
      } else {
        memberByKey.set(key, {
          id: randomUUID(),
          name: m.name.trim(),
          phone: m.phone?.trim() || null,
          color: m.color ?? null,
          isPermanent: m.isPermanent !== false,
          legacyQrImage: m.qrCodeImage ?? null,
        });
        if (account) bankByKey.set(key, account);
      }

      const rec = memberByKey.get(key)!;
      if (!rec.legacyQrImage && m.qrCodeImage) rec.legacyQrImage = m.qrCodeImage;
      idMap.set(`${s.monthKey}::${m.id}`, rec.id);
    }
  }

  // Cảnh báo sau khi đã duyệt hết mọi tháng, vì ảnh QR có thể xuất hiện ở tháng
  // sau trong khi số tài khoản xuất hiện ở tháng trước.
  for (const [key, rec] of memberByKey) {
    if (bankByKey.get(key) && !rec.legacyQrImage) missingQr.add(rec.name);
  }

  out.members = [...memberByKey.values()];
  out.warnings.missingQr = [...missingQr].sort();

  const resolve = (monthKey: string, legacyId: string | undefined | null) =>
    legacyId ? (idMap.get(`${monthKey}::${legacyId}`) ?? null) : null;

  for (const s of sessions) {
    out.months.push({
      id: randomUUID(),
      monthKey: s.monthKey,
      title: s.title,
      note: s.note?.trim() || null,
      initialFund: Math.round(s.initialFund ?? 0),
    });

    for (const m of s.members) {
      const id = resolve(s.monthKey, m.id);
      if (id) out.monthMembers.push({ monthKey: s.monthKey, memberId: id });
    }

    for (const d of s.dailySessions ?? []) {
      out.dailySessions.push({
        id: randomUUID(),
        monthKey: s.monthKey,
        date: d.date,
        title: d.title?.trim() || null,
        courtName: d.courtName,
        courtFee: Math.round(d.courtFee ?? 0),
        courtPayerId: resolve(s.monthKey, d.courtPayerId),
        shuttlecockCount: Math.round(d.shuttlecockCount ?? 0),
        shuttlecockPricePerItem: Math.round(d.shuttlecockPricePerItem ?? 0),
        shuttlecockTotalFee:
          d.shuttlecockTotalFee === undefined ? null : Math.round(d.shuttlecockTotalFee),
        shuttlecockPayerId: resolve(s.monthKey, d.shuttlecockPayerId),
        drinkFee: Math.round(d.drinkFee ?? 0),
        drinkPayerId: resolve(s.monthKey, d.drinkPayerId),
        otherFee: Math.round(d.otherFee ?? 0),
        otherFeePayerId: resolve(s.monthKey, d.otherFeePayerId),
        note: d.note?.trim() || null,
        attendeeIds: (d.attendeeIds ?? [])
          .map((id) => resolve(s.monthKey, id))
          .filter((id): id is string => id !== null),
      });
    }

    for (const e of s.expenses ?? []) {
      const paidBy = resolve(s.monthKey, e.paidById);
      if (!paidBy) continue;
      out.expenses.push({
        id: randomUUID(),
        monthKey: s.monthKey,
        title: e.title,
        category: e.category,
        amount: Math.round(e.amount),
        paidById: paidBy,
        splitType: e.splitType,
        date: e.date,
        note: e.note?.trim() || null,
        participantIds: (e.participantIds ?? [])
          .map((id) => resolve(s.monthKey, id))
          .filter((id): id is string => id !== null),
      });
    }

    // Khóa cũ có dạng "{người nợ}-{người nhận}-{số tiền}". Phần số tiền bị bỏ
    // đi vì chính nó là nguyên nhân làm mất dấu "đã chuyển khoản" mỗi khi số
    // tiền thay đổi.
    for (const key of s.settledTransferIds ?? []) {
      const parts = key.split('-');
      if (parts.length < 3) continue;
      const fromMemberId = resolve(s.monthKey, parts[0]);
      const toMemberId = resolve(s.monthKey, parts[1]);
      if (!fromMemberId || !toMemberId) continue;
      out.settledTransfers.push({ monthKey: s.monthKey, fromMemberId, toMemberId });
    }
  }

  return out;
}
