'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { expenseParticipants, expenses, monthMembers, months } from '../../db/schema';

export interface ExpenseInput {
  id?: string;
  title: string;
  category: string;
  amount: number;
  paidById: string;
  splitType: 'all' | 'custom';
  participantIds: string[];
  date: string;
  note?: string | null;
}

export async function saveExpense(monthKey: string, input: ExpenseInput) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');
  if (!input.title.trim()) throw new Error('Tên khoản chi không được để trống');
  if (input.amount <= 0) throw new Error('Số tiền phải lớn hơn 0');

  // splitType 'all' nghĩa là chia cho mọi thành viên của tháng tại thời điểm
  // lưu. Ghi rõ danh sách ra bảng để về sau thêm người mới không làm đổi số
  // tiền của khoản chi đã chốt.
  const participantIds =
    input.splitType === 'all'
      ? (
          await db
            .select({ memberId: monthMembers.memberId })
            .from(monthMembers)
            .where(eq(monthMembers.monthId, month.id))
        ).map((r) => r.memberId)
      : input.participantIds;

  if (participantIds.length === 0) {
    throw new Error('Khoản chi phải có ít nhất một người tham gia');
  }

  const { id, participantIds: _boQua, ...fields } = input;

  await db.transaction(async (tx) => {
    let expenseId = id;

    if (expenseId) {
      await tx.update(expenses).set(fields).where(eq(expenses.id, expenseId));
      await tx.delete(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId));
    } else {
      const [created] = await tx
        .insert(expenses)
        .values({ ...fields, monthId: month.id })
        .returning({ id: expenses.id });
      expenseId = created.id;
    }

    await tx
      .insert(expenseParticipants)
      .values(participantIds.map((memberId) => ({ expenseId: expenseId!, memberId })));
  });

  revalidatePath(`/${monthKey}`, 'layout');
}

export async function deleteExpense(monthKey: string, expenseId: string) {
  await db.delete(expenses).where(eq(expenses.id, expenseId));
  revalidatePath(`/${monthKey}`, 'layout');
}
