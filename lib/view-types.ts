import type { getMonthData, getSessionDefaults, listPayments, listRoster } from '../db/queries';

/**
 * The shapes the UI receives, inferred directly from the query functions so the
 * two can never drift apart. Components only render — every calculation has
 * already happened on the server.
 */
export type MonthData = NonNullable<Awaited<ReturnType<typeof getMonthData>>>;

export type ViewMember = MonthData['members'][number];
export type ViewDailySession = MonthData['dailySessions'][number];
export type ViewSettlement = MonthData['settlement'];
export type ViewSettlementRow = ViewSettlement['rows'][number];
export type ViewTransfer = ViewSettlement['transfers'][number];
export type ViewMonth = MonthData['month'];

export type SessionDefaults = Awaited<ReturnType<typeof getSessionDefaults>>;

/** A member plus the signed URL of their QR image, used by the Members and Settlement tabs. */
export type ViewMemberWithQr = ViewMember & { qrUrl: string | null };

/** One person in the shared roster, flagged with whether they are already in the period. */
export type RosterEntry = Awaited<ReturnType<typeof listRoster>>[number];

/** One recorded transfer, as shown on the history screen. */
export type PaymentRow = Awaited<ReturnType<typeof listPayments>>[number];
