# 🏸 Badminton Split

Ghi chép buổi đánh cầu lông, đếm trái cầu và chia tiền minh bạch cho cả nhóm.

Next.js App Router · React 19 · TypeScript · Drizzle ORM · Supabase (Postgres + Storage) · Tailwind CSS 4 · Bun

## Chạy ở máy

```bash
bun install
cp .env.example .env    # rồi điền các giá trị thật
bun run db:migrate      # tạo bảng (chỉ cần lần đầu)
bun run dev             # http://localhost:3000
```

Các lệnh khác:

| Lệnh | Việc |
|---|---|
| `bun run test` | Chạy toàn bộ test |
| `bun run lint` | Kiểm kiểu (`tsc --noEmit`) |
| `bun run build` | Dựng bản production |
| `bun run db:generate` | Sinh migration sau khi sửa `db/schema.ts` |
| `bun run db:migrate` | Áp migration lên database |

## Biến môi trường

```bash
DATABASE_URL=
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
```

**Chú ý về `DATABASE_URL`.** Khi triển khai lên Vercel, bắt buộc dùng **transaction pooler, cổng 6543**:

```
postgresql://postgres.<project-ref>:<mật_khẩu>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Kết nối trực tiếp `db.<project-ref>.supabase.co` **chỉ có bản ghi DNS IPv6**. Máy tính cá nhân thường có IPv6 nên chạy ở nhà vẫn tốt, nhưng Vercel serverless chỉ đi IPv4 nên sẽ không kết nối được. Host pooler có IPv4. Ngoài ra pooler yêu cầu tên đăng nhập dạng `postgres.<project-ref>`, không phải `postgres`.

Lấy chuỗi này ở Supabase Dashboard → Project Settings → Database → Connection pooling → chế độ **Transaction**.

`SUPABASE_SERVICE_ROLE_KEY` là khóa bí mật toàn quyền, chỉ dùng phía server. Không bao giờ đưa xuống client.

## Supabase cần có sẵn

Một bucket Storage tên **`member-qr`**, để chế độ **riêng tư** (bỏ chọn "Public bucket").

Ảnh QR không có URL công khai. Server sinh signed URL có hạn một giờ cho mọi thành viên đã truy cập được app — chủ đích là ai cũng xem và quét được QR của người khác mà không phải nhắn tin riêng xin, nhưng URL không rò ra ngoài để người lạ mò.

## Triển khai lên Vercel

```bash
bunx vercel --prod
```

Khai báo cả ba biến môi trường trong Project Settings → Environment Variables, và đặt **Function Region là `icn1` (Seoul)** cho cùng khu vực với database. Để mặc định `iad1` (Washington) thì mỗi lần mở trang quyết toán phải vòng nửa vòng trái đất sáu lượt truy vấn.

## Kiến trúc

Server là nguồn dữ liệu duy nhất. Không dùng localStorage.

- **Đọc** — React Server Component gọi thẳng `db/queries.ts`. Quyết toán tính xong ở server rồi mới truyền xuống; component chỉ hiển thị.
- **Ghi** — toàn bộ qua Server Actions trong `app/actions/`. Không có API route nào ghi dữ liệu.
- **Tháng nằm trên URL** (`/2026-08`), nên chia sẻ link đúng kỳ được.

```
app/[monthKey]/      trang cho từng kỳ, bốn tab
app/actions/         Server Actions — đường ghi duy nhất
db/schema.ts         định nghĩa bảng
db/queries.ts        tầng đọc
lib/settlement/      phép chia tiền, thuần, có test
components/          giao diện, không tự tính toán
```

## Tiền

Mọi khoản tiền là **số nguyên đồng**, không có số thực ở bất kỳ đâu.

Phép chia dùng phương pháp phần dư lớn nhất (`lib/settlement/allocate.ts`), nên **tổng các phần chia luôn bằng đúng tổng chi** và tổng số dư ròng của nhóm luôn bằng 0. Chia đôi cách cũ thì 200.000 cho 6 người thu về 199.998 — hai đồng biến mất mà không ai biết.

`lib/settlement/calculate.ts` cũng bỏ qua mọi id không thuộc danh sách thành viên của kỳ trước khi chia, nên dữ liệu vào có bẩn cũng không làm vỡ bất biến trên.

## Thông tin thanh toán

Không lưu số tài khoản, tên ngân hàng hay tên chủ tài khoản dưới dạng văn bản — ở đâu cả. Chuyển tiền chỉ qua ảnh QR do từng người tự tải lên. Không gọi dịch vụ sinh QR bên ngoài.

## Giai đoạn tiếp theo

Giai đoạn 1 (nền tảng, dữ liệu quan hệ, logic xuống server) đã xong. Còn lại:

- **Giai đoạn 2** — đăng nhập và phân quyền (Supabase Auth, policy RLS cho vai trò `authenticated`).
- **Giai đoạn 3** — thiết kế lại giao diện, ưu tiên điện thoại.
- **Giai đoạn 4** — dọn nốt các thao tác thừa còn lại.

Thiết kế và kế hoạch nằm trong `docs/superpowers/`.
