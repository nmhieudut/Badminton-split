'use client';

import React from 'react';
import { CATEGORY_CONFIG, type ExpenseCategory } from '../lib/categories';
import { formatVND } from '../lib/money';
import type { ViewDailySession, ViewExpense, ViewMember } from '../lib/view-types';
import { Award, Layers } from 'lucide-react';

interface ExpenseChartProps {
  expenses: ViewExpense[];
  dailySessions: ViewDailySession[];
  members: ViewMember[];
}

const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG) as ExpenseCategory[];

/** Phân loại lưu dưới dạng text trong DB nên phải quy về khóa hợp lệ khi cộng. */
function toCategory(value: string): ExpenseCategory {
  return (CATEGORY_KEYS as string[]).includes(value) ? (value as ExpenseCategory) : 'other';
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({
  expenses,
  dailySessions,
  members,
}) => {
  // Group by category
  const categoryTotals: Record<ExpenseCategory, number> = {
    court: 0,
    shuttlecock: 0,
    drink: 0,
    gathering: 0,
    other: 0,
  };

  // Group by payer
  const payerTotals: Record<string, number> = {};
  members.forEach((m) => {
    payerTotals[m.id] = 0;
  });

  // 1. Process Daily Sessions
  dailySessions.forEach((s) => {
    const courtFee = s.courtFee || 0;
    const shuttleFee =
      s.shuttlecockTotalFee ?? (s.shuttlecockCount || 0) * (s.shuttlecockPricePerItem || 0);
    const drinkFee = s.drinkFee || 0;
    const otherFee = s.otherFee || 0;

    categoryTotals.court += courtFee;
    categoryTotals.shuttlecock += shuttleFee;
    categoryTotals.drink += drinkFee;
    categoryTotals.other += otherFee;

    if (s.courtPayerId) {
      payerTotals[s.courtPayerId] = (payerTotals[s.courtPayerId] || 0) + courtFee;
    }
    if (s.shuttlecockPayerId) {
      payerTotals[s.shuttlecockPayerId] = (payerTotals[s.shuttlecockPayerId] || 0) + shuttleFee;
    }
    if (s.drinkPayerId && drinkFee > 0) {
      payerTotals[s.drinkPayerId] = (payerTotals[s.drinkPayerId] || 0) + drinkFee;
    }
    if (s.otherFeePayerId && otherFee > 0) {
      payerTotals[s.otherFeePayerId] = (payerTotals[s.otherFeePayerId] || 0) + otherFee;
    }
  });

  // 2. Process General Expenses
  expenses.forEach((item) => {
    const cat = toCategory(item.category);
    categoryTotals[cat] += item.amount;
    payerTotals[item.paidById] = (payerTotals[item.paidById] || 0) + item.amount;
  });

  const totalAmount = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  const categoryEntries = CATEGORY_KEYS.map((cat) => ({
      category: cat,
      amount: categoryTotals[cat],
      config: CATEGORY_CONFIG[cat],
      percent: totalAmount > 0 ? (categoryTotals[cat] / totalAmount) * 100 : 0,
    }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const topPayerEntries = members
    .map((m) => ({
      member: m,
      amount: payerTotals[m.id] || 0,
      percent: totalAmount > 0 ? ((payerTotals[m.id] || 0) / totalAmount) * 100 : 0,
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (totalAmount === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Category Breakdown Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Cơ Cấu Chi Tiêu</h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-900">
            {formatVND(totalAmount)}
          </span>
        </div>

        <div className="space-y-4">
          {categoryEntries.map((item) => (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      item.category === 'court'
                        ? 'bg-indigo-600'
                        : item.category === 'shuttlecock'
                        ? 'bg-blue-500'
                        : item.category === 'drink'
                        ? 'bg-amber-500'
                        : item.category === 'gathering'
                        ? 'bg-rose-500'
                        : 'bg-purple-500'
                    }`}
                  />
                  {item.config.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">
                    {formatVND(item.amount)}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px] w-12 text-right">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.category === 'court'
                      ? 'bg-indigo-600'
                      : item.category === 'shuttlecock'
                      ? 'bg-blue-500'
                      : item.category === 'drink'
                      ? 'bg-amber-500'
                      : item.category === 'gathering'
                      ? 'bg-rose-500'
                      : 'bg-purple-500'
                  }`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Spenders Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Người Đã Chi Nhiều Nhất</h3>
          </div>
          <span className="text-xs text-slate-400">Ứng trước trong tháng</span>
        </div>

        <div className="space-y-4">
          {topPayerEntries.map((item, rank) => (
            <div key={item.member.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                    #{rank + 1}
                  </span>
                  <span>{item.member.name}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">
                    {formatVND(item.amount)}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px] w-12 text-right">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

