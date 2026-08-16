-- Đồng bộ với các bảng khác: chặn đường truy cập trực tiếp bằng anon key.
-- App đi bằng vai trò postgres nên không bị policy này ràng buộc; chốt chặn
-- thật nằm ở requireAdmin() và requireSuperAdmin() trong Server Actions.
ALTER TABLE "admins" ENABLE ROW LEVEL SECURITY;
