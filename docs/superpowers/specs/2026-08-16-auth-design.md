# Giai đoạn 2 — Đăng nhập và phân quyền

**Ngày:** 16/08/2026
**Trạng thái:** đã duyệt, chờ lập kế hoạch triển khai
**Tiền đề:** Giai đoạn 1 (`2026-08-16-nextjs-backend-migration-design.md`) đã hoàn tất

## Vấn đề

App hiện không có bất kỳ lớp bảo vệ nào. Ai có đường link đều xem được toàn bộ
dữ liệu **và sửa được mọi thứ**: ghi buổi đánh, đổi số tiền, xóa cả kỳ, gỡ thành
viên. Chỉ cần một người tò mò hoặc một đường link bị chuyển tiếp nhầm là số tiền
của cả nhóm sai lệch mà không ai biết ai đã đụng vào.

## Mục tiêu

Chặn đường ghi, giữ nguyên đường đọc.

| Người dùng | Xem dữ liệu | Quét QR | Ghi / sửa / xóa |
|---|---|---|---|
| Khách, chưa đăng nhập | Được | Được | Không |
| Đã đăng nhập, không phải admin | Được | Được | Không |
| Admin | Được | Được | Được |

Đăng nhập **không mở thêm quyền gì** so với khách. Nó chỉ có ý nghĩa với người
nằm trong danh sách admin. Đây là lựa chọn có chủ đích để nhóm không phải đăng
nhập mới xem được tiền của mình.

## Vì sao không dùng Row Level Security

Giai đoạn 1 đã bật RLS cho cả 8 bảng, nên dễ tưởng rằng chỉ cần thêm policy cho
vai trò `authenticated` là xong. **Không đúng.**

Kiểm chứng ngày 16/08/2026 trên chính database này:

```
current_user = postgres, rolbypassrls = true, sở hữu 7/7 bảng public
```

Kết nối của app dùng vai trò `postgres`, mà vai trò đó **bỏ qua mọi policy**.
Cho nên RLS không hề ràng buộc chính app của mình; nó chỉ chặn đường truy cập
trực tiếp bằng anon key, và hiện không có gì đi đường đó.

Muốn RLS thực thi quyền thì phải đổi tầng dữ liệu sang Supabase client mang JWT
của người dùng, tức là vứt bỏ Drizzle và viết lại toàn bộ `db/queries.ts` cùng
10 Server Action. Không đáng, với một nhóm cầu lông.

**Kết luận: chốt chặn nằm ở tầng ứng dụng, trong Server Actions.** RLS giữ
nguyên như lớp phòng thủ thứ hai chống truy cập bằng anon key.

## Xác định admin

Biến môi trường `ADMIN_EMAILS`, danh sách email ngăn cách bằng dấu phẩy:

```
ADMIN_EMAILS=chunhom@gmail.com,phupho@gmail.com
```

Không có bảng vai trò trong database. Với một nhóm cầu lông, thêm hoặc bớt admin
vài tháng một lần thì sửa biến môi trường rẻ hơn dựng cả màn hình quản trị.

So khớp phải bỏ qua chữ hoa chữ thường và khoảng trắng thừa — email người dùng
gõ vào Google và email bạn gõ vào biến môi trường không phải lúc nào cũng giống
nhau từng ký tự.

## Kiến trúc

**Supabase Auth với Google OAuth.** Cả nhóm đều có sẵn tài khoản Google trên
điện thoại, một chạm là xong — không phải nhớ mật khẩu, không phải chờ email.

Phiên đăng nhập lưu trong cookie qua `@supabase/ssr`, để Server Component và
Server Action đọc được. Không dùng localStorage: server phải biết ai đang gọi
thì mới chặn được.

Luồng: bấm "Đăng nhập" → modal → nút Google → Supabase chuyển hướng sang Google
→ quay về `/auth/callback` → đổi mã lấy phiên → về lại trang đang xem.

`middleware.ts` làm mới token khi sắp hết hạn. Không có nó thì người dùng bị
đăng xuất giữa chừng mà không hiểu vì sao.

### Tệp sẽ tạo

| Tệp | Trách nhiệm |
|---|---|
| `lib/auth/admin-emails.ts` | Hàm thuần: email này có phải admin không |
| `lib/auth/session.ts` | `getUser()`, `isAdmin()`, `requireAdmin()` |
| `lib/supabase/server.ts` | Supabase client phía server, đọc cookie |
| `lib/supabase/client.ts` | Supabase client phía trình duyệt |
| `app/auth/callback/route.ts` | Đổi mã OAuth lấy phiên |
| `app/actions/auth.ts` | `signInWithGoogle()`, `signOut()` |
| `middleware.ts` | Làm mới phiên |
| `components/AuthButton.tsx` | Nút đăng nhập / ảnh đại diện + đăng xuất |
| `components/LoginModal.tsx` | Modal một nút Google |

### Chốt chặn

`requireAdmin()` đặt ở **dòng đầu tiên** của cả 10 Server Action:

| Tệp | Action |
|---|---|
| `daily-sessions.ts` | `saveDailySession`, `deleteDailySession` |
| `members.ts` | `createMember`, `updateMember`, `removeMemberFromMonth`, `addExistingMemberToMonth` |
| `months.ts` | `createMonth`, `updateMonth`, `deleteMonth` |
| `settlement.ts` | `toggleTransferSettled` |

Không có ngoại lệ nào. Kể cả việc đánh dấu đã chuyển khoản cũng là quyền của chủ
nhóm — người nhận tiền mới biết chắc tiền đã về, còn người chuyển thì chỉ biết
mình đã bấm gửi.

`requireAdmin()` ném lỗi khi không đủ quyền. Thông báo cho người dùng là câu
chung, không nêu chi tiết cơ chế; chi tiết đi vào log theo đúng quy ước
`ConfigError` đã lập ở `lib/errors.ts`.

### Giao diện

Trang truyền cờ `isAdmin` xuống các component. Không phải admin thì **không
render** nút ghi — ẩn hẳn chứ không phải làm mờ, vì nút bấm không được là nút
gây khó chịu.

Cụ thể phải ẩn: nút ghi buổi đánh mới, sửa và xóa buổi, thêm và sửa và gỡ thành
viên, sửa và xóa kỳ, tạo kỳ mới, và nút đánh dấu đã chuyển khoản ở cả bảng quyết
toán lẫn màn hình "việc của tôi".

**Màn hình "việc của tôi" với người thường trở thành chỉ đọc.** Vẫn thấy mình
cần chuyển bao nhiêu cho ai, vẫn quét được QR — chỉ mất nút tích. Đây là hệ quả
đã được cân nhắc, không phải thiếu sót.

Ẩn nút chỉ là phép lịch sự với người dùng. Lớp chặn thật nằm ở server: ai gọi
thẳng Server Action vẫn bị `requireAdmin()` chặn.

## Ảnh QR vẫn công khai

Trang để công khai nghĩa là ảnh QR ngân hàng của cả nhóm cũng công khai theo —
ai có link đều quét được, không cần đăng nhập.

**Đây là lựa chọn có chủ đích của chủ dự án, không phải sơ suất.** Đánh đổi đã
được nêu rõ: đổi lấy sự tiện lợi cho nhóm, chấp nhận rằng lộ link là lộ QR. Ghi
lại đây để sau này không ai tưởng là lỗi rồi tự ý siết lại.

Bucket `member-qr` vẫn để riêng tư ở tầng hạ tầng và truy cập qua signed URL có
hạn một giờ, nên không có URL vĩnh viễn nào rò ra ngoài.

## Kiểm thử

**Hàm so khớp email là hàm thuần nên test được trực tiếp:** chữ hoa chữ thường,
khoảng trắng thừa quanh dấu phẩy, biến môi trường rỗng hoặc không khai báo, email
rỗng, email gần giống nhưng không trùng.

**Một test quét mã nguồn kiểm rằng mọi Server Action đều gọi `requireAdmin()`.**
Đây là test quan trọng nhất của giai đoạn này: thêm action mới mà quên chốt chặn
là lỗ hổng im lặng, không có gì báo. Test đọc mọi tệp trong `app/actions/`, tìm
mỗi `export async function`, và bắt buộc thân hàm phải gọi `requireAdmin()`.
Ngoại lệ duy nhất được phép là `app/actions/auth.ts`.

Không viết test cho luồng OAuth — nó phụ thuộc Google và Supabase, test sẽ giòn
mà không bắt được lỗi thật.

## Ngoài phạm vi

- **Bảng vai trò trong database.** Biến môi trường đủ dùng ở quy mô này.
- **Luồng duyệt tài khoản.** Trang công khai nên không có gì để duyệt.
- **Gắn tài khoản với thành viên.** Màn hình "việc của tôi" tiếp tục dùng cookie
  `bs_me` chọn tay như hiện nay.
- **Nhật ký ai đã sửa gì.** Đáng làm, nhưng là việc khác.
- **Nhiều nhóm trong một hệ thống.** App phục vụ đúng một nhóm.

## Việc cấu hình tay

Trên Supabase: bật Google provider trong Authentication → Providers, khai báo
Client ID và Secret lấy từ Google Cloud Console, và thêm redirect URL cho cả
`http://localhost:3000/auth/callback` lẫn tên miền production.

Trên Vercel: thêm `ADMIN_EMAILS`, và `NEXT_PUBLIC_SUPABASE_URL` cùng
`NEXT_PUBLIC_SUPABASE_ANON_KEY` cho client phía trình duyệt. Anon key là khóa
công khai theo thiết kế của Supabase, khác hẳn service role key — không nhầm
lẫn hai thứ này.

## Tiêu chí nghiệm thu

1. Khách chưa đăng nhập vẫn xem được cả ba tab và quét được QR.
2. Khách không thấy bất kỳ nút ghi nào.
3. Gọi thẳng một Server Action khi chưa đăng nhập thì bị từ chối và dữ liệu
   không đổi.
4. Đăng nhập bằng email ngoài `ADMIN_EMAILS` thì vẫn không ghi được gì.
5. Đăng nhập bằng email trong `ADMIN_EMAILS` thì mọi nút hiện ra và dùng được.
6. Test quét mã nguồn đỏ lên khi cố tình bỏ `requireAdmin()` khỏi một action.
