import {
  bigint,
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const months = pgTable('months', {
  id: uuid('id').primaryKey().defaultRandom(),
  monthKey: text('month_key').notNull().unique(),
  title: text('title').notNull(),
  note: text('note'),
  initialFund: bigint('initial_fund', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone'),
  qrImagePath: text('qr_image_path'),
  color: text('color'),
  isPermanent: boolean('is_permanent').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const monthMembers = pgTable(
  'month_members',
  {
    monthId: uuid('month_id')
      .notNull()
      .references(() => months.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.monthId, t.memberId] })]
);

export const dailySessions = pgTable(
  'daily_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    monthId: uuid('month_id')
      .notNull()
      .references(() => months.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    title: text('title'),
    courtName: text('court_name').notNull(),
    courtFee: bigint('court_fee', { mode: 'number' }).notNull().default(0),
    courtPayerId: uuid('court_payer_id').references(() => members.id),
    shuttlecockCount: integer('shuttlecock_count').notNull().default(0),
    shuttlecockPricePerItem: bigint('shuttlecock_price_per_item', { mode: 'number' })
      .notNull()
      .default(0),
    shuttlecockTotalFee: bigint('shuttlecock_total_fee', { mode: 'number' }),
    shuttlecockPayerId: uuid('shuttlecock_payer_id').references(() => members.id),
    drinkFee: bigint('drink_fee', { mode: 'number' }).notNull().default(0),
    drinkPayerId: uuid('drink_payer_id').references(() => members.id),
    otherFee: bigint('other_fee', { mode: 'number' }).notNull().default(0),
    otherFeePayerId: uuid('other_fee_payer_id').references(() => members.id),
    note: text('note'),
  },
  (t) => [index('daily_sessions_month_date_idx').on(t.monthId, t.date)]
);

export const sessionAttendees = pgTable(
  'session_attendees',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => dailySessions.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.memberId] })]
);

export const settledTransfers = pgTable(
  'settled_transfers',
  {
    monthId: uuid('month_id')
      .notNull()
      .references(() => months.id, { onDelete: 'cascade' }),
    fromMemberId: uuid('from_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    toMemberId: uuid('to_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    settledAt: timestamp('settled_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.monthId, t.fromMemberId, t.toMemberId] })]
);
