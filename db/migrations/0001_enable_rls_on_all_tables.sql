-- Bật Row Level Security cho toàn bộ bảng nghiệp vụ.
--
-- Không kèm policy nào là có chủ đích: ở giai đoạn 1 chưa có đăng nhập, và mọi
-- truy cập đều đi qua Server Actions dùng vai trò `postgres` — vai trò sở hữu
-- bảng nên không bị RLS chặn. Việc bật RLS ở đây chặn đường đi trực tiếp bằng
-- anon key của Supabase, tức là chặn người ngoài đọc hoặc sửa dữ liệu nhóm.
--
-- Giai đoạn 2 (đăng nhập) sẽ thêm policy cho vai trò `authenticated`.

ALTER TABLE public.months ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.month_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.daily_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.session_attendees ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.settled_transfers ENABLE ROW LEVEL SECURITY;
