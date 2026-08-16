-- Đồng bộ với các bảng khác: chặn đường truy cập trực tiếp bằng anon key.
ALTER TABLE "courts" ENABLE ROW LEVEL SECURITY;
