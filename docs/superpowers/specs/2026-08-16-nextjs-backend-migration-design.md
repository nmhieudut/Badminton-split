# Giai đoạn 1 — Nền tảng Next.js, DB chuẩn hóa, logic xuống server

Ngày: 2026-08-16
Trạng thái: đã duyệt thiết kế, chưa lập kế hoạch triển khai

## Bối cảnh

Badminton Split hiện là SPA Vite + React 19, toàn bộ state nằm trong `src/App.tsx`,
tính toán quyết toán chạy trên trình duyệt, dữ liệu lưu localStorage và đồng bộ
tùy chọn lên một bảng Postgres duy nhất chứa mỗi tháng là một blob JSONB.
Một server Express mỏng (`server.ts`) chỉ upsert blob, không có logic nghiệp vụ.

Chủ dự án muốn: chuyển sang Next.js, đưa tính toán xuống backend, cho cả nhóm
đăng nhập dùng chung, và làm lại giao diện.

Phạm vi đó là bốn hệ thống độc lập nên được chia thành bốn giai đoạn, mỗi giai
đoạn kết thúc bằng một ứng dụng chạy được:

1. **Giai đoạn 1 (tài liệu này)** — nền tảng Next.js, schema chuẩn hóa, logic server.
2. Giai đoạn 2 — xác thực và phân quyền theo vai trò (Supabase Auth, RLS).
3. Giai đoạn 3 — thiết kế lại giao diện, mobile-first.
4. Giai đoạn 4 — dọn ma sát thao tác còn lại.

Giai đoạn 4 xếp sau giai đoạn 3 vì phần lớn ma sát đã kiểm kê được (ba nút
"+ Buổi Đánh" trên cùng một màn hình, ba bộ chuyển tháng chồng nhau, hai bảng
lặp trong `SettlementView`) là hệ quả của bố cục và sẽ tự biến mất khi thiết kế
lại. Những ma sát thuộc về **dữ liệu** thì kéo lên giai đoạn 1, vì chúng phụ
thuộc vào việc server biết được buổi đánh gần nhất.

## Quyết định đã chốt

| Vấn đề | Lựa chọn |
|---|---|
| Người dùng | Cả nhóm cùng dùng, có đăng nhập (triển khai ở GĐ 2) |
| Quan hệ Member / User | Tách riêng; Member do admin tạo, liên kết User là tùy chọn |
| Lưu trữ | Bảng quan hệ chuẩn hóa, không giữ JSONB |
| Offline | Bỏ; server là nguồn dữ liệu duy nhất |
| Hosting | Vercel (serverless) |
| Tầng DB | Drizzle ORM |
| Ảnh QR | Supabase Storage bucket riêng tư, mở cho mọi thành viên qua signed URL |
| Thông tin ngân hàng | Bỏ hẳn các trường số tài khoản; chỉ dùng ảnh QR tải lên |
| Phạm vi UI | Thiết kế lại hoàn toàn — nhưng ở GĐ 3, không phải GĐ 1 |

## Mục tiêu giai đoạn 1

Kết thúc giai đoạn này, ứng dụng có đầy đủ tính năng như hiện tại, nhưng:

- Chạy trên Next.js App Router, deploy được lên Vercel.
- Dữ liệu nằm trong các bảng quan hệ có khóa ngoại, không còn blob JSONB.
- Mọi phép tính tiền chạy trên server; client chỉ hiển thị.
- Không còn localStorage, không còn lớp đồng bộ hai chiều.
- Module quyết toán có bộ test tự động.

Giao diện giữ gần như nguyên trạng, chỉ gỡ phần tự tính toán và đấu lại vào server.

## Kiến trúc

### Cấu trúc thư mục

Chuyển đổi tại chỗ trong repo hiện tại. Xóa `server.ts`, `vite.config.ts`,
`index.html`, `src/main.tsx`. Gỡ `@google/genai` khỏi dependencies — không có
dòng code nào trong `src/` tham chiếu tới nó.

```
app/
  layout.tsx
  page.tsx                     chuyển hướng tới tháng hiện tại
  [monthKey]/
    layout.tsx                 nạp tháng, thành viên; dựng khung điều hướng
    page.tsx                   tab buổi đánh (mặc định)
    settlement/page.tsx
    expenses/page.tsx
    members/page.tsx
  actions/                     Server Actions cho mọi thao tác ghi
    months.ts
    members.ts
    daily-sessions.ts
    expenses.ts
    settlement.ts
db/
  schema.ts                    định nghĩa bảng bằng Drizzle
  index.ts                     khởi tạo kết nối
  migrations/                  sinh bởi drizzle-kit
  import-legacy.ts             script di cư một lần
lib/
  settlement/
    calculate.ts               logic thuần, không phụ thuộc DB
    allocate.ts                chia tiền theo phần dư lớn nhất
    report.ts                  sinh báo cáo Zalo
    *.test.ts
  money.ts                     định dạng và phân tích tiền VND
components/                    chuyển từ src/components/, gỡ phần tự tính toán
```

### Tháng nằm trên URL

Tháng đang chọn chuyển từ localStorage lên đường dẫn (`/2026-08`). Cho phép chia
sẻ link đúng tháng cho nhóm ở giai đoạn 2, và loại bỏ `getActiveSessionId` /
`setActiveSessionId` cùng toàn bộ `src/utils/storage.ts`.

`monthKey` phải khớp `^\d{4}-(0[1-9]|1[0-2])$`; không khớp thì trả 404.

### Truy cập dữ liệu

Đọc: React Server Component truy vấn trực tiếp qua Drizzle, không qua HTTP.
Ghi: Server Actions, gọi `revalidatePath` sau mỗi thao tác.
Không có API route nào ngoài `/api/health`.

Toàn bộ `src/lib/api.ts` và lớp đồng bộ hai chiều trong `App.tsx` bị xóa.

Trên Vercel serverless, kết nối phải đi qua pooler của Supabase (pgBouncer,
cổng 6543, chế độ transaction), không dùng `pg.Pool` dài hạn như `server.ts`
hiện tại. Instance Drizzle được ghi nhớ ở phạm vi module để tái dùng giữa các
lần gọi trong cùng một container.

## Schema

```sql
months (
  id            uuid primary key,
  month_key     text not null unique,        -- '2026-08'
  title         text not null,
  note          text,
  initial_fund  bigint not null default 0,   -- đồng
  created_at    timestamptz not null default now()
)

members (
  id            uuid primary key,
  name          text not null,
  phone         text,
  qr_image_path text,                        -- đường dẫn trong bucket riêng tư
  color         text,
  is_permanent  boolean not null default true,
  created_at    timestamptz not null default now()
)

month_members (
  month_id  uuid references months on delete cascade,
  member_id uuid references members on delete cascade,
  primary key (month_id, member_id)
)

daily_sessions (
  id                          uuid primary key,
  month_id                    uuid not null references months on delete cascade,
  date                        date not null,
  title                       text,
  court_name                  text not null,
  court_fee                   bigint not null default 0,
  court_payer_id              uuid references members,
  shuttlecock_count           integer not null default 0,
  shuttlecock_price_per_item  bigint not null default 0,
  shuttlecock_total_fee       bigint,        -- null = tính từ số lượng × đơn giá
  shuttlecock_payer_id        uuid references members,
  drink_fee                   bigint not null default 0,
  drink_payer_id              uuid references members,
  other_fee                   bigint not null default 0,
  other_fee_payer_id          uuid references members,
  note                        text
)

session_attendees (
  session_id uuid references daily_sessions on delete cascade,
  member_id  uuid references members on delete cascade,
  primary key (session_id, member_id)
)

expenses (
  id         uuid primary key,
  month_id   uuid not null references months on delete cascade,
  title      text not null,
  category   text not null,                  -- court|shuttlecock|drink|gathering|other
  amount     bigint not null,
  paid_by_id uuid not null references members,
  split_type text not null,                  -- all|custom
  date       date not null,
  note       text
)

expense_participants (
  expense_id uuid references expenses on delete cascade,
  member_id  uuid references members on delete cascade,
  primary key (expense_id, member_id)
)

settled_transfers (
  month_id       uuid references months on delete cascade,
  from_member_id uuid references members on delete cascade,
  to_member_id   uuid references members on delete cascade,
  settled_at     timestamptz not null default now(),
  primary key (month_id, from_member_id, to_member_id)
)
```

Chỉ mục: `daily_sessions(month_id, date)`, `expenses(month_id, date)`.

### Thành viên trở thành toàn cục

Hiện tại mỗi `MonthSession` giữ một bản sao riêng mảng `members`
(`App.tsx:157-166` sao chép thành viên cố định khi tạo tháng mới). Hệ quả: sửa
số tài khoản của một người ở tháng 8 thì tháng 7 và tháng 9 vẫn giữ số cũ.

Thiết kế mới tách `members` thành bảng toàn cục, `month_members` chỉ ghi ai
tham gia tháng nào. Đây là thay đổi hành vi có chủ đích, đã được chủ dự án duyệt.

### Tiền là số nguyên đồng

Mọi cột tiền dùng `bigint`, đơn vị đồng, không có số thực ở bất kỳ đâu.

Hiện tại `calculateSettlement` chia số thực (`courtFee / attendees.length`,
`settlement.ts:121`) rồi mới làm tròn ở bước cuối. Chia 180.000 đồng cho 7 người
thì tổng các phần chia không bằng tổng chi.

Thay bằng phép chia theo phần dư lớn nhất trong `lib/settlement/allocate.ts`:
mỗi người nhận phần nguyên `floor(total / n)`, phần dư `total mod n` đồng được
phát thêm mỗi người một đồng theo thứ tự ổn định (sắp theo `member_id`), để kết
quả không đổi giữa các lần chạy. Bất biến: tổng các phần chia luôn đúng bằng
tổng chi, không sai một đồng.

### Khóa của giao dịch đã thanh toán

Hiện tại `settledTransferIds` lưu chuỗi `"{người nợ}-{người nhận}-{số tiền}"`
(`settlement.ts:223`). Chỉ cần thêm một buổi đánh, số tiền đổi, id đổi theo, và
dấu "đã chuyển khoản" âm thầm biến mất.

Bảng `settled_transfers` khóa theo cặp (tháng, người trả, người nhận), không
chứa số tiền. Nếu sau khi đánh dấu đã thanh toán mà số tiền thay đổi, giao dịch
vẫn giữ trạng thái đã thanh toán và giao diện hiển thị cảnh báo số tiền đã đổi
kể từ lúc đánh dấu — không tự ý bỏ dấu, vì tiền đã chuyển thật rồi.

## Logic phía server

### Module quyết toán

`lib/settlement/calculate.ts` nhận dữ liệu thuần (danh sách thành viên, buổi
đánh, khoản chi) và trả về kết quả; không biết gì về DB, HTTP hay React. Giữ
nguyên quy tắc nghiệp vụ hiện có:

- Mỗi loại phí trong một buổi chia đều cho người có mặt buổi đó; buổi không ghi
  người có mặt thì chia cho toàn bộ thành viên của tháng.
- Người ứng tiền được ghi có đúng khoản mình trả.
- Khoản chi chung chia cho `participantIds`, hoặc toàn bộ thành viên nếu
  `splitType = 'all'`.
- Số dư ròng được khớp tham lam giữa người nợ và người nhận để tối thiểu số lần
  chuyển khoản; bỏ qua chênh lệch dưới 500 đồng.

Điểm khác duy nhất so với bản hiện tại là phép chia dùng số nguyên như trên.

### Mặc định lấy từ buổi gần nhất

Bổ sung `getSessionDefaults(monthId)` trả về thông số của buổi đánh gần nhất
trong tháng — tên sân, giá sân, đơn giá cầu, số cầu, danh sách người có mặt.
Nếu tháng chưa có buổi nào thì lấy buổi gần nhất của tháng liền trước; vẫn
không có thì trả về rỗng và biểu mẫu để trống.

Điều này thay thế các mặc định cứng trong `DailySessionModal.tsx:46-51`
(`'Sân 3 - Kỳ Hòa'`, `180000`, `4` quả, `25000`) và việc chọn người trả tiền cầu
là `members[1]` (`DailySessionModal.tsx:93`) — nhóm ma sát nặng nhất trong toàn
bộ ứng dụng, vì nó bắt người dùng sửa lại ba đến bốn trường mỗi buổi đánh.

Đây là thay đổi giao diện duy nhất được phép ở giai đoạn 1, vì nó thuộc về dữ
liệu chứ không phải bố cục.

### Thanh toán chỉ bằng ảnh QR

Ứng dụng bỏ hoàn toàn việc lưu thông tin ngân hàng dạng văn bản. Các trường
`bankName`, `bankAccount`, `bankAccountName` trong `Member` bị xóa khỏi mô hình
dữ liệu, khỏi biểu mẫu, khỏi giao diện và khỏi báo cáo Zalo. Mỗi thành viên chỉ
tải lên một ảnh QR nhận tiền.

Lý do: số tài khoản dạng văn bản đang bị rò ra ngoài. `generateZaloReport`
in thẳng `STK: {số tài khoản} - {ngân hàng} - {tên chủ tài khoản}` vào bản báo
cáo (`settlement.ts:373-378`) mà báo cáo này được sinh ra để dán vào nhóm chat.
`MemberView.tsx:257` cũng có nút chép nguyên chuỗi đó.

Hệ quả kéo theo:

- Bỏ `generateVietQrUrl` và mọi lần gọi tới `img.vietqr.io`. Ứng dụng không còn
  phụ thuộc dịch vụ bên thứ ba nào.
- Bỏ hằng `VIETNAM_BANKS`.
- Báo cáo Zalo chỉ còn "A chuyển cho B: số tiền", không kèm thông tin tài khoản.
- Thành viên chưa tải QR thì giao dịch hiển thị tên và số tiền, kèm nhắc tải QR
  lên; không có đường dự phòng nào khác.

**QR mở cho cả nhóm, kín với người ngoài.** Chủ dự án muốn ai trong nhóm cũng
xem và quét được QR của người khác, để khỏi phải nhắn tin riêng xin mỗi lần
chuyển tiền. Nhưng bản thân mã QR mã hóa số tài khoản bên trong, nên để ảnh
công khai trên Internet thì việc bỏ các trường văn bản ở trên chẳng còn ý nghĩa.

Vì vậy bucket `member-qr` để chế độ riêng tư ở tầng hạ tầng, còn ở tầng ứng
dụng thì không giới hạn: `members.qr_image_path` chỉ lưu đường dẫn, và server
sinh signed URL có hạn cho **bất kỳ thành viên nào đã đăng nhập**, không cần
người sở hữu QR đồng ý. Kết quả là trong app QR hiện như dữ liệu công khai,
nhưng không có URL nào lộ ra ngoài để người lạ mò được.

Ở giai đoạn 1 chưa có đăng nhập, nên signed URL được sinh cho mọi lượt truy cập.
Giai đoạn 2 chỉ cần thêm điều kiện "đã đăng nhập" vào đúng một chỗ sinh URL đó.

Việc nén ảnh phía trình duyệt trong `src/utils/image.ts` được giữ lại (thu về
khoảng 30–60 KB trước khi tải lên), nhưng đích đến là Storage thay vì chuỗi
base64 nhét vào DB.

## Di cư dữ liệu

`.env` của dự án đang rỗng, nên `DATABASE_URL` chưa từng được đặt và bảng
`month_sessions` gần như chắc chắn trống — toàn bộ dữ liệu thật đang nằm trong
localStorage của trình duyệt chủ dự án.

Vì vậy `db/import-legacy.ts` nhận dữ liệu từ **hai nguồn**, cùng một định dạng
`MonthSession[]`:

1. File JSON xuất ra bằng chức năng "Sao lưu & Dữ liệu" trong ứng dụng hiện tại
   (đường dẫn truyền qua tham số dòng lệnh) — đây là nguồn chính.
2. Bảng `month_sessions` nếu có bản ghi.

Script thực hiện:

- Khử trùng lặp thành viên theo tên đã chuẩn hóa (bỏ dấu cách thừa, không phân
  biệt hoa thường) để dựng bảng `members` toàn cục. Trùng tên nhưng khác số tài
  khoản thì dừng lại và báo để người dùng quyết định, không tự gộp.
- Chuyển mọi khoản tiền sang số nguyên đồng.
- **Bỏ, không nhập** `bankName`, `bankAccount`, `bankAccountName`. Trước khi bỏ,
  script in ra danh sách thành viên có số tài khoản nhưng **chưa có ảnh QR** —
  đây là những người sẽ mất khả năng nhận tiền qua ứng dụng cho tới khi tải QR
  lên, nên chủ dự án cần biết trước để nhắc họ.
- Tải ảnh QR base64 lên bucket riêng tư, ghi lại đường dẫn.
- Chuyển `settledTransferIds` sang bảng `settled_transfers` bằng cách tách chuỗi
  lấy hai id thành viên, bỏ phần số tiền.
- Chạy lại phép quyết toán trên dữ liệu cũ và dữ liệu mới, **so sánh từng tháng**.

Tiêu chí nghiệm thu: với mọi tháng, danh sách chuyển khoản sinh ra từ dữ liệu đã
di cư phải trùng khớp với dữ liệu gốc, sai lệch cho phép tối đa là một đồng trên
mỗi người (do đổi từ số thực sang chia phần dư lớn nhất). Không đạt thì dừng,
không ghi.

Script chạy trong một transaction, có thể chạy lại nhiều lần (xóa sạch rồi nạp
lại). Bảng `month_sessions` không bị xóa, giữ làm bản lùi.

## Kiểm thử

`lib/settlement/` viết theo lối kiểm thử trước, vì đây là phần duy nhất trong
ứng dụng mà tính sai thì có người mất tiền thật. Dùng Vitest.

Các trường hợp bắt buộc có:

- Tổng các phần chia bằng đúng tổng chi khi số tiền không chia hết (180.000 cho
  7 người).
- Buổi không ghi người có mặt thì chia cho toàn bộ thành viên của tháng.
- Người ứng tiền được ghi có đúng khoản mình trả, kể cả khi không tham gia buổi đó.
- `shuttlecockTotalFee` khi có giá trị thì thắng phép nhân số lượng × đơn giá.
- Khoản chi `splitType = 'custom'` chỉ chia cho người trong `participantIds`.
- Số dư ròng của toàn nhóm cộng lại bằng không.
- Chênh lệch dưới 500 đồng không sinh giao dịch chuyển khoản.
- Kết quả không đổi giữa các lần chạy trên cùng dữ liệu đầu vào.

Ngoài ra, một bài kiểm thử di cư chạy trên bộ dữ liệu mẫu (`getDemoSession`)
đối chiếu kết quả quyết toán trước và sau khi chuẩn hóa.

## Ngoài phạm vi

Thuộc các giai đoạn sau, không làm ở đây:

- Đăng nhập, phân quyền theo vai trò, RLS (giai đoạn 2 — yêu cầu đã ghi nhận
  bên dưới).
- Thiết kế lại giao diện (giai đoạn 3).
- Gộp các nút và luồng trùng lặp, xóa `MemberManagerModal.tsx` — tệp 1038 dòng
  gần như trùng khớp với `MemberView.tsx` và hiện không được import ở đâu cả
  (giai đoạn 4).
- Xử lý xung đột khi nhiều người sửa cùng lúc (chỉ có ý nghĩa sau khi có đăng
  nhập).

## Yêu cầu đã ghi nhận cho giai đoạn 2

Chủ dự án đã nêu rõ mô hình phân quyền mong muốn. Ghi lại ở đây để không thất
lạc; sẽ được thiết kế chi tiết ở spec riêng của giai đoạn 2.

- Chủ dự án là **admin**, có toàn quyền trên mọi tháng và mọi thao tác.
- Admin **tự tạo tài khoản** cho người khác và **gán quyền cụ thể** cho từng
  người, thay vì mọi người tự đăng ký.
- Quyền được cấp theo từng nhóm việc, không phải một mức "toàn quyền hay không
  gì cả". Ví dụ chủ dự án đưa ra: một người hay ứng tiền có thể được cấp quyền
  thêm buổi đánh, trong khi vẫn không được xóa tháng hay sửa thông tin ngân
  hàng của người khác.
- Người không được cấp quyền gì vẫn xem được số tiền của mình và quét mã QR.
- QR mở cho toàn bộ thành viên đã đăng nhập, không phân quyền theo từng người:
  chủ đích là ai cũng chuyển tiền được cho ai mà không phải đi xin. Lớp kiểm
  tra duy nhất là "đã đăng nhập hay chưa".

Ràng buộc này không đổi thiết kế giai đoạn 1, nhưng có hai điều cần giữ để
giai đoạn 2 không phải phá đi làm lại:

- Mọi thao tác ghi đều đi qua đúng một Server Action; không có đường ghi nào
  vòng qua chỗ khác. Nhờ vậy chỗ kiểm tra quyền sau này chỉ nằm ở một tầng.
- Bảng `members` không mang khái niệm tài khoản. Việc liên kết một `member` với
  một tài khoản đăng nhập sẽ là một cột khóa ngoại cho phép rỗng thêm vào sau,
  chứ không phải sửa lại quan hệ đã có.

## Rủi ro

**Mất dữ liệu khi di cư.** Dữ liệu thật chỉ tồn tại trong localStorage của một
trình duyệt. Trước khi làm bất cứ việc gì khác, phải xuất file sao lưu JSON và
cất ra ngoài repo. Đây là bước đầu tiên của kế hoạch triển khai.

**Kết nối DB trên serverless.** Dùng sai cổng (5432 thay vì 6543) sẽ làm cạn
kiệt kết nối khi có nhiều lần gọi đồng thời. Cần kiểm chứng bằng một lần deploy
thử lên Vercel trước khi chuyển hết tính năng.

**Mất đường nhận tiền của người chưa có QR.** Bỏ các trường ngân hàng đồng
nghĩa với việc thành viên nào chỉ khai số tài khoản mà chưa tải ảnh QR sẽ không
còn cách nhận tiền trong ứng dụng. Script di cư phải liệt kê những người này
trước khi ghi, và họ cần tải QR lên trước khi chốt sổ tháng kế tiếp.

**Số tiền lệch sau khi đổi cách chia.** Việc chuyển sang số nguyên có thể làm
lệch vài đồng so với các con số nhóm đã quen nhìn. Bài so sánh trước/sau trong
script di cư là chốt kiểm soát; sai lệch quá một đồng mỗi người thì phải điều
tra chứ không được bỏ qua.
