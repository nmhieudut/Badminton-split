import { readFileSync } from 'node:fs';
import { db } from './index';
import { normalizeLegacy } from './normalize-legacy';
import type { LegacyMonthSession } from './legacy-types';
import { uploadQrFromDataUrl } from '../lib/storage';
import {
  dailySessions as tblDailySessions,
  expenseParticipants as tblExpenseParticipants,
  expenses as tblExpenses,
  members as tblMembers,
  monthMembers as tblMonthMembers,
  months as tblMonths,
  sessionAttendees as tblSessionAttendees,
  settledTransfers as tblSettledTransfers,
} from './schema';

export async function importLegacy(sessions: LegacyMonthSession[]) {
  const data = normalizeLegacy(sessions);

  if (data.warnings.missingQr.length > 0) {
    console.warn(
      '\n⚠️  Những người sau có số tài khoản nhưng CHƯA có ảnh QR.\n' +
        '   Họ sẽ không nhận được tiền qua app cho tới khi tải QR lên:\n' +
        data.warnings.missingQr.map((n) => `   • ${n}`).join('\n') +
        '\n'
    );
  }

  const qrPaths = new Map<string, string>();
  for (const m of data.members) {
    if (!m.legacyQrImage) continue;
    qrPaths.set(m.id, await uploadQrFromDataUrl(m.id, m.legacyQrImage));
    console.log(`   ↑ đã tải QR của ${m.name}`);
  }

  const monthIdByKey = new Map(data.months.map((m) => [m.monthKey, m.id]));

  await db.transaction(async (tx) => {
    // Xóa theo thứ tự ngược khóa ngoại. Bảng month_sessions kiểu cũ giữ nguyên
    // làm bản lùi, không đụng tới.
    await tx.delete(tblSettledTransfers);
    await tx.delete(tblExpenseParticipants);
    await tx.delete(tblExpenses);
    await tx.delete(tblSessionAttendees);
    await tx.delete(tblDailySessions);
    await tx.delete(tblMonthMembers);
    await tx.delete(tblMonths);
    await tx.delete(tblMembers);

    if (data.members.length) {
      await tx.insert(tblMembers).values(
        data.members.map((m) => ({
          id: m.id,
          name: m.name,
          phone: m.phone,
          color: m.color,
          isPermanent: m.isPermanent,
          qrImagePath: qrPaths.get(m.id) ?? null,
        }))
      );
    }

    if (data.months.length) {
      await tx.insert(tblMonths).values(
        data.months.map((m) => ({
          id: m.id,
          monthKey: m.monthKey,
          title: m.title,
          note: m.note,
          initialFund: m.initialFund,
        }))
      );
    }

    if (data.monthMembers.length) {
      await tx.insert(tblMonthMembers).values(
        data.monthMembers.map((mm) => ({
          monthId: monthIdByKey.get(mm.monthKey)!,
          memberId: mm.memberId,
        }))
      );
    }

    for (const d of data.dailySessions) {
      const { monthKey, attendeeIds, ...rest } = d;
      await tx.insert(tblDailySessions).values({ ...rest, monthId: monthIdByKey.get(monthKey)! });
      if (attendeeIds.length) {
        await tx
          .insert(tblSessionAttendees)
          .values(attendeeIds.map((memberId) => ({ sessionId: d.id, memberId })));
      }
    }

    for (const e of data.expenses) {
      const { monthKey, participantIds, ...rest } = e;
      await tx.insert(tblExpenses).values({ ...rest, monthId: monthIdByKey.get(monthKey)! });
      if (participantIds.length) {
        await tx
          .insert(tblExpenseParticipants)
          .values(participantIds.map((memberId) => ({ expenseId: e.id, memberId })));
      }
    }

    if (data.settledTransfers.length) {
      await tx.insert(tblSettledTransfers).values(
        data.settledTransfers.map((t) => ({
          monthId: monthIdByKey.get(t.monthKey)!,
          fromMemberId: t.fromMemberId,
          toMemberId: t.toMemberId,
        }))
      );
    }
  });

  console.log(
    `\n✅ Đã nạp ${data.months.length} tháng, ${data.members.length} thành viên, ` +
      `${data.dailySessions.length} buổi đánh, ${data.expenses.length} khoản chi, ` +
      `${qrPaths.size} ảnh QR.`
  );
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error('Cách dùng: bun run db/import-legacy.ts <đường-dẫn-file-sao-lưu.json>');
    process.exit(1);
  }
  await importLegacy(JSON.parse(readFileSync(file, 'utf8')) as LegacyMonthSession[]);
  process.exit(0);
}
