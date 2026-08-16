CREATE TABLE "daily_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month_id" uuid NOT NULL,
	"date" date NOT NULL,
	"title" text,
	"court_name" text NOT NULL,
	"court_fee" bigint DEFAULT 0 NOT NULL,
	"court_payer_id" uuid,
	"shuttlecock_count" integer DEFAULT 0 NOT NULL,
	"shuttlecock_price_per_item" bigint DEFAULT 0 NOT NULL,
	"shuttlecock_total_fee" bigint,
	"shuttlecock_payer_id" uuid,
	"drink_fee" bigint DEFAULT 0 NOT NULL,
	"drink_payer_id" uuid,
	"other_fee" bigint DEFAULT 0 NOT NULL,
	"other_fee_payer_id" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "expense_participants" (
	"expense_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "expense_participants_expense_id_member_id_pk" PRIMARY KEY("expense_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"amount" bigint NOT NULL,
	"paid_by_id" uuid NOT NULL,
	"split_type" text NOT NULL,
	"date" date NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"qr_image_path" text,
	"color" text,
	"is_permanent" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "month_members" (
	"month_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "month_members_month_id_member_id_pk" PRIMARY KEY("month_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "months" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month_key" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"initial_fund" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "months_month_key_unique" UNIQUE("month_key")
);
--> statement-breakpoint
CREATE TABLE "session_attendees" (
	"session_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "session_attendees_session_id_member_id_pk" PRIMARY KEY("session_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "settled_transfers" (
	"month_id" uuid NOT NULL,
	"from_member_id" uuid NOT NULL,
	"to_member_id" uuid NOT NULL,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settled_transfers_month_id_from_member_id_to_member_id_pk" PRIMARY KEY("month_id","from_member_id","to_member_id")
);
--> statement-breakpoint
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_court_payer_id_members_id_fk" FOREIGN KEY ("court_payer_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_shuttlecock_payer_id_members_id_fk" FOREIGN KEY ("shuttlecock_payer_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_drink_payer_id_members_id_fk" FOREIGN KEY ("drink_payer_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sessions" ADD CONSTRAINT "daily_sessions_other_fee_payer_id_members_id_fk" FOREIGN KEY ("other_fee_payer_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_id_members_id_fk" FOREIGN KEY ("paid_by_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_members" ADD CONSTRAINT "month_members_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_members" ADD CONSTRAINT "month_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attendees" ADD CONSTRAINT "session_attendees_session_id_daily_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."daily_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attendees" ADD CONSTRAINT "session_attendees_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settled_transfers" ADD CONSTRAINT "settled_transfers_month_id_months_id_fk" FOREIGN KEY ("month_id") REFERENCES "public"."months"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settled_transfers" ADD CONSTRAINT "settled_transfers_from_member_id_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settled_transfers" ADD CONSTRAINT "settled_transfers_to_member_id_members_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_sessions_month_date_idx" ON "daily_sessions" USING btree ("month_id","date");--> statement-breakpoint
CREATE INDEX "expenses_month_date_idx" ON "expenses" USING btree ("month_id","date");