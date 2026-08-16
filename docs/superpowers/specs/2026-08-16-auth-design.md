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

| Người dùng | Xem dữ liệu | Quét QR | Ghi / sửa / xóa | Thêm bớt admin |
|---|---|---|---|---|
| Khách | Được | Được | Không | Không |
| Admin | Được | Được | Được | Không |
| Super admin | Được | Được | Được | Được |

"Khách" gồm cả người chưa đăng nhập lẫn người đã đăng nhập nhưng không thuộc
nhóm nào — về quyền hạn hai trường hợp đó **giống hệt nhau**, nên hệ thống không
phân biệt.

Điều đó cũng có nghĩa: đăng nhập **không mở thêm quyền xem** nào. Nó chỉ đổi
khác với người thuộc một trong hai nhóm có quyền. Đây là lựa chọn có chủ đích để
nhóm không phải đăng nhập mới xem được tiền của mình.

### Hai nhóm có quyền

**Super admin** đến từ biến môi trường `ADMIN_EMAILS`. Chỉ sửa được bằng cách
đổi biến rồi deploy lại, nên không ai chiếm quyền qua giao diện được — kể cả
admin bị lộ tài khoản.

**Admin** do super admin thêm vào, lưu trong bảng `admins`. Làm được mọi thao
tác nghiệp vụ, nhưng không đụng được vào danh sách admin. Ranh giới này quan
trọng: một admin bị lộ tài khoản không thể tự nhân bản quyền cho người khác,
cũng không thể hất super admin ra.

### Không có luồng gửi email mời

Mô hình ban đầu có bước "gửi email cho người mới để họ đăng nhập lần đầu". Bỏ,
vì hai lý do.

**Lý do kỹ thuật:** dịch vụ email mặc định của Supabase gửi được 2 thư mỗi giờ
và **từ chối gửi tới địa chỉ ngoài đội ngũ project**. Muốn dùng thật phải gắn
SMTP bên ngoài — thêm nhà cung cấp, thêm khóa API, thêm chuyện thư vào spam.

**Lý do thiết kế:** với đăng nhập Google, email mời không phải là cổng. Ai có
tài khoản Google cũng bấm đăng nhập được; thứ quyết định họ có quyền hay không
là email của họ **có trong bảng `admins` hay không**. Cái thư chỉ là lời nhắn.
Super admin nhắn qua Zalo đạt hiệu quả y hệt mà không tốn hạ tầng nào.

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

## Xác định quyền

Hai nguồn, tra theo thứ tự.

**Super admin — biến môi trường `ADMIN_EMAILS`**, danh sách email ngăn cách bằng
dấu phẩy:

```
ADMIN_EMAILS=chunhom@gmail.com
```

Để ở biến môi trường chứ không phải database là có chủ đích: quyền cao nhất chỉ
đổi được bằng cách deploy lại, nên không có đường nào chiếm nó qua giao diện.

**Admin — bảng `admins`:**

```sql
admins (
  email       text primary key,   -- luôn lưu dạng chữ thường
  added_at    timestamptz not null default now(),
  added_by    text                -- email người đã thêm, để truy vết
)
```

Email làm khóa chính vì đó chính là thứ Google trả về và là thứ ta so khớp. Lưu
chữ thường ngay từ lúc ghi để so khớp không phải đoán.

Trong cả hai nguồn, so khớp **bỏ qua chữ hoa chữ thường và khoảng trắng thừa** —
email người dùng gõ vào Google và email được thêm vào danh sách không phải lúc
nào cũng giống nhau từng ký tự.

Một email vừa có trong `ADMIN_EMAILS` vừa có trong bảng `admins` thì tính là
super admin. Biến môi trường luôn thắng.

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
| `lib/auth/admin-emails.ts` | Hàm thuần: email này có trong `ADMIN_EMAILS` không |
| `lib/auth/session.ts` | `getSessionUser()`, `getVaiTro()`, `requireAdmin()`, `requireSuperAdmin()` |
| `lib/supabase/server.ts` | Supabase client phía server, đọc cookie |
| `lib/supabase/client.ts` | Supabase client phía trình duyệt |
| `db/schema.ts` | Thêm bảng `admins` |
| `db/queries.ts` | `listAdmins()` |
| `app/auth/callback/route.ts` | Đổi mã OAuth lấy phiên |
| `app/actions/auth.ts` | `signInWithGoogle()`, `signOut()` |
| `app/actions/admins.ts` | `addAdmin()`, `removeAdmin()` — chỉ super admin |
| `middleware.ts` | Làm mới phiên |
| `components/AuthButton.tsx` | Nút đăng nhập, hoặc email + đăng xuất |
| `components/LoginModal.tsx` | Modal một nút Google |
| `components/AdminsModal.tsx` | Quản lý danh sách admin — chỉ super admin |

### Chốt chặn

Hai hàm, đặt ở **dòng đầu tiên** của mỗi Server Action.

`requireAdmin()` — cho qua nếu là admin **hoặc** super admin. Dùng cho cả 10
action nghiệp vụ:

| Tệp | Action |
|---|---|
| `daily-sessions.ts` | `saveDailySession`, `deleteDailySession` |
| `members.ts` | `createMember`, `updateMember`, `removeMemberFromMonth`, `addExistingMemberToMonth` |
| `months.ts` | `createMonth`, `updateMonth`, `deleteMonth` |
| `settlement.ts` | `toggleTransferSettled` |

`requireSuperAdmin()` — chỉ super admin. Dùng cho hai action quản lý quyền:

| Tệp | Action |
|---|---|
| `admins.ts` | `addAdmin`, `removeAdmin` |

Không action nghiệp vụ nào được miễn. Kể cả việc đánh dấu đã chuyển khoản —
người nhận tiền mới biết chắc tiền đã về, còn người chuyển thì chỉ biết mình đã
bấm gửi.

Hai hàm quản lý quyền phải dùng `requireSuperAdmin()`, không phải `requireAdmin()`.
Dùng nhầm thì admin tự thêm được admin khác, và ranh giới giữa hai nhóm biến mất
mà không có gì báo.

Cả hai hàm ném lỗi khi không đủ quyền. Thông báo cho người dùng là câu chung,
không nêu chi tiết cơ chế; chi tiết đi vào log theo đúng quy ước `ConfigError`
đã lập ở `lib/errors.ts`.

### Màn hình quản lý admin

Hiện dưới dạng modal mở từ menu tiện ích trên Navbar, **chỉ super admin nhìn
thấy**. Danh sách admin không gắn với tháng nào nên không đặt trong tuyến
`/[monthKey]`; modal tránh được việc dựng thêm một tuyến và layout riêng cho một
màn hình hiếm khi dùng.

Nội dung: danh sách email hiện có kèm ngày thêm và người thêm, một ô nhập để
thêm email mới, và nút gỡ từng dòng. Super admin trong `ADMIN_EMAILS` cũng hiện
trong danh sách nhưng **không gỡ được** — ghi rõ là "từ cấu hình hệ thống", để
không ai tưởng nút gỡ bị hỏng.


### Giao diện

Trang truyền hai cờ `isAdmin` và `isSuperAdmin` xuống các component. Không đủ
quyền thì **không render** nút — ẩn hẳn chứ không phải làm mờ, vì nút bấm không
được là nút gây khó chịu.

`isAdmin` đúng với cả admin lẫn super admin, và điều khiển mọi nút nghiệp vụ.
`isSuperAdmin` chỉ điều khiển đúng một thứ: mục quản lý admin trong menu.

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

**Một test quét mã nguồn kiểm rằng mọi Server Action đều có chốt chặn.** Đây là
test quan trọng nhất của giai đoạn này: thêm action mới mà quên chốt chặn là lỗ
hổng im lặng, không có gì báo. Test đọc mọi tệp trong `app/actions/`, tìm mỗi
`export async function`, và bắt buộc thân hàm phải gọi `requireAdmin()` hoặc
`requireSuperAdmin()`. Ngoại lệ duy nhất được phép là `app/actions/auth.ts`.

Test đó còn kiểm thêm một điều riêng: hai action trong `admins.ts` phải dùng
đúng `requireSuperAdmin()`. Nếu chỉ kiểm "có chốt chặn nào đó" thì việc hạ nhầm
xuống `requireAdmin()` sẽ lọt qua, mà đó chính là lỗi xóa mất ranh giới quyền.

Không viết test cho luồng OAuth — nó phụ thuộc Google và Supabase, test sẽ giòn
mà không bắt được lỗi thật.

## Ngoài phạm vi

- **Vai trò "người dùng thường".** Trang công khai nên đăng nhập không mở thêm
  quyền xem nào; một vai trò như vậy sẽ không gate được gì.
- **Gửi email mời.** Xem phần lý do ở trên.
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
4. Đăng nhập bằng email không thuộc nhóm nào thì vẫn không ghi được gì.
5. Đăng nhập bằng email trong `ADMIN_EMAILS` thì mọi nút hiện ra và dùng được,
   kể cả menu quản lý admin.
6. Super admin thêm một email vào bảng `admins`; người đó đăng nhập và ghi được
   dữ liệu, nhưng **không thấy** menu quản lý admin.
7. Admin gọi thẳng `addAdmin` thì bị từ chối và bảng `admins` không đổi.
8. Super admin trong `ADMIN_EMAILS` không thể bị gỡ khỏi giao diện.
9. Test quét mã nguồn đỏ lên khi cố tình bỏ chốt chặn khỏi một action, và cũng
   đỏ khi hạ `requireSuperAdmin()` trong `admins.ts` xuống `requireAdmin()`.
