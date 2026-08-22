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

/**
 * Every transfer somebody has actually made, as a ledger rather than a flag.
 *
 * The table this replaces recorded only the pair of people, so "paid" was a
 * yes/no with no amount attached. Someone would settle up, another session got
 * recorded afterwards, their share went up — and the old mark still read as
 * fully paid while they were short. Keeping each payment as its own row means
 * what is still owed is the current debt minus what has been sent, and a later
 * session can never make a past payment untrue.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    monthId: uuid('month_id')
      .notNull()
      .references(() => months.id, { onDelete: 'cascade' }),
    fromMemberId: uuid('from_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    toMemberId: uuid('to_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('payments_month_idx').on(t.monthId, t.paidAt)]
);

/**
 * Admins added by a super admin. Super admins come from the ADMIN_EMAILS
 * environment variable and are not stored here — the highest privilege must not
 * be editable through the UI.
 *
 * Email is the primary key because it is exactly what Google returns and what
 * we match on. Always stored lowercase, normalized at write time.
 */
export const admins = pgTable('admins', {
  email: text('email').primaryKey(),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  addedBy: text('added_by'),
});

/**
 * The courts regularly played at, used as the picklist when recording a session.
 *
 * A session does NOT reference this table: it copies the name and fee as they
 * were at the time of recording. That way editing a court's fee never changes
 * the amounts of sessions already settled — this table is only a convenient
 * source of default values.
 */
export const courts = pgTable('courts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  defaultFee: bigint('default_fee', { mode: 'number' }).notNull().default(0),
  /** Stop playing at a court and this flag goes off — hidden from the dropdown without losing history. */
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One-off links that let a member upload their own QR image without signing in.
 *
 * Only a hash of the token is stored: the link itself is the secret, and a
 * leaked table must not be enough to use one. A link is bound to one member,
 * expires, and is spent on first successful upload.
 */
export const qrUploadTokens = pgTable(
  'qr_upload_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('qr_upload_tokens_member_idx').on(t.memberId)]
);
