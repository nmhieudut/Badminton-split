'use client';

import React, { useTransition } from 'react';
import { HandCoins } from 'lucide-react';
import { setMemberCover } from '../../app/actions/member-cover';
import { NO_AUTOFILL } from '../../lib/no-autofill';
import type { RosterEntry } from './types';

interface CoverSelectProps {
  monthKey: string;
  memberId: string;
  /** Everyone on the roster: a coverer does not have to play this period. */
  roster: RosterEntry[];
  /** This period's covers. */
  covers: { memberId: string; coveredById: string }[];
  onError: (message: string) => void;
}

/** Admin control for "who pays and receives on this member's behalf". */
export const CoverSelect: React.FC<CoverSelectProps> = ({
  monthKey,
  memberId,
  roster,
  covers,
  onError,
}) => {
  const [isPending, startTransition] = useTransition();

  const current = covers.find((c) => c.memberId === memberId)?.coveredById ?? '';
  const coversSomeone = covers.some((c) => c.coveredById === memberId);
  const covered = new Set(covers.map((c) => c.memberId));

  // Same single-hop rule the server enforces, applied up front so the list
  // only offers choices that will be accepted.
  const options = roster.filter((r) => r.id !== memberId && !covered.has(r.id));

  // Someone already covering others cannot be covered, so there is nothing to pick.
  if (coversSomeone) {
    const names = covers
      .filter((c) => c.coveredById === memberId)
      .map((c) => roster.find((r) => r.id === c.memberId)?.name ?? '')
      .join(', ');
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <HandCoins className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
        Đang trả giúp <span className="font-semibold text-slate-700">{names}</span>
      </p>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value || null;
    startTransition(async () => {
      try {
        await setMemberCover(monthKey, memberId, next);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Không lưu được người trả giúp');
      }
    });
  };

  return (
    <label className="flex w-full items-center gap-2 text-xs">
      <HandCoins className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="shrink-0 text-slate-500">Ai trả giúp?</span>
      <select
        {...NO_AUTOFILL}
        value={current}
        onChange={handleChange}
        disabled={isPending}
        className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"
      >
        <option value="">Tự trả</option>
        {options.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
};
