# Giai đoạn 1 — Next.js, DB chuẩn hóa, logic xuống server — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển Badminton Split từ SPA Vite + Express sang Next.js App Router với dữ liệu quan hệ chuẩn hóa và toàn bộ phép tính tiền chạy trên server.

**Architecture:** Next.js App Router trên Vercel. Đọc dữ liệu bằng React Server Component truy vấn Drizzle trực tiếp; ghi dữ liệu bằng Server Actions. Logic quyết toán nằm trong `lib/settlement/` dưới dạng hàm thuần không phụ thuộc DB, có bộ test riêng. Không còn localStorage, không còn blob JSONB.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Drizzle ORM + postgres-js, Supabase Postgres + Storage, Tailwind CSS 4, Vitest, Bun.

**Spec:** `docs/superpowers/specs/2026-08-16-nextjs-backend-migration-design.md`

## Global Constraints

- Trình quản lý gói là **Bun** (`bun.lock` có trong repo). Dùng `bun add`, `bun run`, `bunx`. Không tạo `package-lock.json`.
- Mọi khoản tiền là **số nguyên đồng**. Không có kiểu số thực ở tầng dữ liệu hay tầng tính toán. Cột tiền dùng `bigint`.
- **Không lưu thông tin ngân hàng dạng văn bản.** Không có trường số tài khoản, tên ngân hàng, tên chủ tài khoản ở bất cứ đâu — schema, biểu mẫu, báo cáo. Chỉ có ảnh QR.
- **Không gọi dịch vụ bên thứ ba.** Bỏ `img.vietqr.io`.
- Ngôn ngữ giao diện là **tiếng Việt**, giữ nguyên cách dùng từ hiện tại.
- Kết nối Postgres qua **transaction pooler của Supabase, cổng 6543**, và `postgres(url, { prepare: false })`. Cổng 5432 sẽ cạn kết nối trên serverless.
- Tên bucket Storage: `member-qr`, chế độ **riêng tư**. Truy cập bằng signed URL sinh từ server.
- Mỗi task kết thúc bằng một commit. Thông điệp commit viết tiếng Việt, dạng `feat:` / `test:` / `refactor:` / `chore:`.

---

## Cấu trúc tệp

**Tạo mới:**

| Tệp | Trách nhiệm |
|---|---|
| `lib/money.ts` | Định dạng và phân tích tiền VND |
| `lib/settlement/allocate.ts` | Chia một số tiền cho N người theo phần dư lớn nhất |
| `lib/settlement/types.ts` | Kiểu dữ liệu đầu vào/đầu ra của phép quyết toán |
| `lib/settlement/calculate.ts` | Tính phần chia, số dư ròng, danh sách chuyển khoản |
| `lib/settlement/report.ts` | Sinh văn bản báo cáo Zalo |
| `db/schema.ts` | Định nghĩa bảng bằng Drizzle |
| `db/index.ts` | Khởi tạo kết nối, tái dùng giữa các lần gọi |
| `db/queries.ts` | Hàm đọc dữ liệu cho Server Component |
| `db/import-legacy.ts` | Script di cư một lần từ JSON sao lưu |
| `app/layout.tsx`, `app/page.tsx` | Khung trang, chuyển hướng về tháng hiện tại |
| `app/[monthKey]/layout.tsx` | Nạp tháng và thành viên, dựng khung điều hướng |
| `app/[monthKey]/page.tsx` | Tab buổi đánh |
| `app/[monthKey]/settlement/page.tsx` | Tab quyết toán |
| `app/[monthKey]/expenses/page.tsx` | Tab khoản chi |
| `app/[monthKey]/members/page.tsx` | Tab thành viên |
| `app/actions/*.ts` | Server Actions cho mọi thao tác ghi |
| `lib/storage.ts` | Tải ảnh QR lên Supabase Storage, sinh signed URL |

**Xóa:** `server.ts`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/lib/api.ts`, `src/utils/storage.ts`, `src/utils/settlement.ts`, `src/components/VietQrModal.tsx`, `src/components/MemberManagerModal.tsx`.

**Chuyển và sửa:** `src/components/*` sang `components/*`, gỡ phần tự tính toán và các trường ngân hàng.

---

## Task 1: Sao lưu dữ liệu hiện có

Dữ liệu thật chỉ tồn tại trong localStorage của một trình duyệt. `.env` rỗng nên Supabase chưa từng nhận bản ghi nào. Mất trình duyệt đó là mất sạch. Không được bắt đầu bất cứ việc gì khác trước task này.

**Files:**
- Create: `~/badminton-backup-2026-08-16.json` (ngoài repo, không commit)

**Interfaces:**
- Produces: file JSON mảng `MonthSession[]`, đầu vào của Task 8.

- [ ] **Step 1: Chạy ứng dụng hiện tại**

```bash
bun install
bun run dev
```

Mở `http://localhost:3000`.

- [ ] **Step 2: Xuất dữ liệu**

Bấm "Sao lưu & Dữ liệu" ở chân trang, chọn xuất JSON. Lưu file ra ngoài repo, ví dụ `~/badminton-backup-2026-08-16.json`.

- [ ] **Step 3: Kiểm chứng file sao lưu**

```bash
node -e "const d=require(process.env.HOME+'/badminton-backup-2026-08-16.json'); console.log('Số tháng:', d.length); d.forEach(m => console.log(m.monthKey, '| thành viên:', m.members.length, '| buổi:', (m.dailySessions||[]).length, '| khoản chi:', m.expenses.length));"
```

Đối chiếu các con số với những gì nhìn thấy trên giao diện. Sai lệch thì dừng lại, không đi tiếp.

- [ ] **Step 4: Đảm bảo file không bị commit nhầm**

```bash
cd /Users/hoahonghieu/Documents/dev/Badminton-split && git status --short
```

Expected: không thấy file sao lưu nào trong danh sách.

---

## Task 2: Vitest và module tiền

**Files:**
- Create: `lib/money.ts`, `lib/money.test.ts`, `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `formatVND(amount: number): string`, `parseVNDInput(input: string): number`

- [ ] **Step 1: Cài Vitest**

```bash
bun add -d vitest
```

- [ ] **Step 2: Tạo cấu hình Vitest**

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'db/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Thêm script test**

Trong `package.json`, thêm vào `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Viết test thất bại**

`lib/money.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { formatVND, parseVNDInput } from './money';

describe('formatVND', () => {
  it('định dạng số nguyên đồng theo kiểu Việt Nam', () => {
    expect(formatVND(180000)).toBe('180.000 đ');
  });

  it('trả về 0 đ khi nhận số không hợp lệ', () => {
    expect(formatVND(NaN)).toBe('0 đ');
  });
});

describe('parseVNDInput', () => {
  it('hiểu hậu tố k là nghìn', () => {
    expect(parseVNDInput('200k')).toBe(200000);
  });

  it('hiểu hậu tố tr là triệu', () => {
    expect(parseVNDInput('1tr')).toBe(1000000);
  });

  it('hiểu số thập phân với hậu tố triệu', () => {
    expect(parseVNDInput('1,5tr')).toBe(1500000);
  });

  it('bỏ qua dấu phân cách nghìn', () => {
    expect(parseVNDInput('180.000')).toBe(180000);
  });

  it('trả 0 với chuỗi rỗng', () => {
    expect(parseVNDInput('')).toBe(0);
  });
});
```

- [ ] **Step 5: Chạy test để xác nhận nó thất bại**

Run: `bun run test`
Expected: FAIL, không tìm thấy module `./money`.

- [ ] **Step 6: Viết cài đặt**

`lib/money.ts`:

```typescript
export function formatVND(amount: number): string {
  if (!Number.isFinite(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

export function parseVNDInput(input: string): number {
  if (!input) return 0;
  const clean = input.trim().toLowerCase();

  const toNumber = (s: string) => {
    const n = parseFloat(s.replace(',', '.').replace(/[^0-9.]/g, ''));
    return Number.isNaN(n) ? 0 : n;
  };

  if (/(k|ngàn|nghìn|nghin)$/.test(clean)) {
    return Math.round(toNumber(clean) * 1000);
  }
  if (/(tr|m|triệu|trieu)$/.test(clean)) {
    return Math.round(toNumber(clean) * 1000000);
  }

  const digits = clean.replace(/[^0-9]/g, '');
  const val = parseInt(digits, 10);
  return Number.isNaN(val) ? 0 : val;
}
```

- [ ] **Step 7: Chạy test để xác nhận nó qua**

Run: `bun run test`
Expected: PASS, 7 test.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts package.json lib/money.ts lib/money.test.ts
git commit -m "test: thêm Vitest và module tiền VND"
```

---

## Task 3: Chia tiền theo phần dư lớn nhất

Đây là trái tim của việc sửa lỗi lệch tiền. Hiện tại `settlement.ts:121` chia số thực rồi mới làm tròn, nên tổng phần chia không bằng tổng chi.

**Files:**
- Create: `lib/settlement/allocate.ts`, `lib/settlement/allocate.test.ts`

**Interfaces:**
- Produces: `allocate(total: number, memberIds: string[]): Map<string, number>` — tổng các giá trị trong Map luôn đúng bằng `total`.

- [ ] **Step 1: Viết test thất bại**

`lib/settlement/allocate.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { allocate } from './allocate';

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

describe('allocate', () => {
  it('chia đều khi chia hết', () => {
    const r = allocate(180000, ['a', 'b', 'c']);
    expect([...r.values()]).toEqual([60000, 60000, 60000]);
  });

  it('tổng các phần chia luôn bằng tổng chi khi chia lẻ', () => {
    const r = allocate(180000, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(sum(r)).toBe(180000);
  });

  it('phần dư được phát mỗi người tối đa một đồng', () => {
    const r = allocate(180000, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const values = [...r.values()];
    expect(Math.max(...values) - Math.min(...values)).toBe(1);
  });

  it('cho kết quả giống nhau giữa các lần chạy bất kể thứ tự đầu vào', () => {
    const r1 = allocate(100, ['b', 'a', 'c']);
    const r2 = allocate(100, ['c', 'b', 'a']);
    expect(r1.get('a')).toBe(r2.get('a'));
    expect(r1.get('b')).toBe(r2.get('b'));
    expect(r1.get('c')).toBe(r2.get('c'));
  });

  it('trả Map rỗng khi không có ai', () => {
    expect(allocate(180000, []).size).toBe(0);
  });

  it('xử lý tổng bằng không', () => {
    const r = allocate(0, ['a', 'b']);
    expect(sum(r)).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `bun run test lib/settlement/allocate.test.ts`
Expected: FAIL, không tìm thấy module `./allocate`.

- [ ] **Step 3: Viết cài đặt**

`lib/settlement/allocate.ts`:

```typescript
/**
 * Chia `total` đồng cho các thành viên sao cho tổng các phần chia bằng đúng
 * `total`, không sai một đồng. Phần dư được phát mỗi người một đồng theo thứ
 * tự id đã sắp xếp, nên kết quả không đổi giữa các lần chạy.
 */
export function allocate(total: number, memberIds: string[]): Map<string, number> {
  const result = new Map<string, number>();
  const n = memberIds.length;
  if (n === 0) return result;

  const base = Math.floor(total / n);
  let remainder = total - base * n;

  const ordered = [...memberIds].sort();
  for (const id of ordered) {
    result.set(id, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }

  return result;
}
```

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `bun run test lib/settlement/allocate.test.ts`
Expected: PASS, 6 test.

- [ ] **Step 5: Commit**

```bash
git add lib/settlement/allocate.ts lib/settlement/allocate.test.ts
git commit -m "feat: chia tiền theo phần dư lớn nhất, tổng luôn khớp"
```

---

## Task 4: Kiểu dữ liệu và phép quyết toán

**Files:**
- Create: `lib/settlement/types.ts`, `lib/settlement/calculate.ts`, `lib/settlement/calculate.test.ts`

**Interfaces:**
- Consumes: `allocate` từ Task 3.
- Produces:
  - `SettlementMember`, `SettlementDailySession`, `SettlementExpense`, `SettlementRow`, `Transfer`, `SettlementOutput` (Step 1).
  - `calculateSettlement(input: SettlementInput): SettlementOutput`

- [ ] **Step 1: Định nghĩa kiểu dữ liệu**

`lib/settlement/types.ts`:

```typescript
export type ExpenseCategory = 'court' | 'shuttlecock' | 'drink' | 'gathering' | 'other';

export interface SettlementMember {
  id: string;
  name: string;
}

export interface SettlementDailySession {
  id: string;
  date: string;
  courtFee: number;
  courtPayerId: string | null;
  shuttlecockCount: number;
  shuttlecockPricePerItem: number;
  shuttlecockTotalFee: number | null;
  shuttlecockPayerId: string | null;
  drinkFee: number;
  drinkPayerId: string | null;
  otherFee: number;
  otherFeePayerId: string | null;
  attendeeIds: string[];
}

export interface SettlementExpense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidById: string;
  splitType: 'all' | 'custom';
  participantIds: string[];
}

export interface SettlementInput {
  members: SettlementMember[];
  dailySessions: SettlementDailySession[];
  expenses: SettlementExpense[];
}

export interface SettlementRow {
  memberId: string;
  name: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
  sessionsAttendedCount: number;
  courtShare: number;
  shuttleShare: number;
  drinkShare: number;
  expenseShare: number;
}

export interface Transfer {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
}

export interface SettlementOutput {
  rows: SettlementRow[];
  transfers: Transfer[];
  totalExpenses: number;
  totalCourtCost: number;
  totalShuttleCost: number;
  totalOtherCost: number;
}
```

- [ ] **Step 2: Viết test thất bại**

`lib/settlement/calculate.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { calculateSettlement } from './calculate';
import type { SettlementInput } from './types';

function session(over: Partial<SettlementInput['dailySessions'][0]> = {}) {
  return {
    id: 'ds1',
    date: '2026-08-03',
    courtFee: 180000,
    courtPayerId: 'a',
    shuttlecockCount: 4,
    shuttlecockPricePerItem: 25000,
    shuttlecockTotalFee: null,
    shuttlecockPayerId: 'b',
    drinkFee: 0,
    drinkPayerId: null,
    otherFee: 0,
    otherFeePayerId: null,
    attendeeIds: ['a', 'b'],
    ...over,
  };
}

const members = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
  { id: 'c', name: 'Cường' },
];

describe('calculateSettlement', () => {
  it('ghi có cho người ứng tiền đúng khoản họ trả', () => {
    const out = calculateSettlement({ members, dailySessions: [session()], expenses: [] });
    expect(out.rows.find((r) => r.memberId === 'a')!.totalPaid).toBe(180000);
    expect(out.rows.find((r) => r.memberId === 'b')!.totalPaid).toBe(100000);
  });

  it('chỉ chia cho người có mặt', () => {
    const out = calculateSettlement({ members, dailySessions: [session()], expenses: [] });
    expect(out.rows.find((r) => r.memberId === 'c')!.totalShare).toBe(0);
    expect(out.rows.find((r) => r.memberId === 'c')!.sessionsAttendedCount).toBe(0);
  });

  it('chia cho toàn bộ thành viên khi buổi không ghi người có mặt', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [session({ attendeeIds: [] })],
      expenses: [],
    });
    expect(out.rows.every((r) => r.totalShare > 0)).toBe(true);
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(280000);
  });

  it('tổng phần chia bằng đúng tổng chi khi chia lẻ', () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ id: `m${i}`, name: `M${i}` }));
    const out = calculateSettlement({
      members: seven,
      dailySessions: [
        session({ attendeeIds: seven.map((m) => m.id), courtPayerId: 'm0', shuttlecockPayerId: 'm0' }),
      ],
      expenses: [],
    });
    expect(out.rows.reduce((s, r) => s + r.totalShare, 0)).toBe(280000);
  });

  it('shuttlecockTotalFee thắng phép nhân số lượng với đơn giá', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [session({ shuttlecockTotalFee: 90000 })],
      expenses: [],
    });
    expect(out.totalShuttleCost).toBe(90000);
  });

  it('khoản chi custom chỉ chia cho người trong danh sách', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [],
      expenses: [
        {
          id: 'e1',
          title: 'Chè',
          category: 'gathering',
          amount: 120000,
          paidById: 'a',
          splitType: 'custom',
          participantIds: ['a', 'b'],
        },
      ],
    });
    expect(out.rows.find((r) => r.memberId === 'c')!.expenseShare).toBe(0);
    expect(out.rows.find((r) => r.memberId === 'a')!.expenseShare).toBe(60000);
  });

  it('khoản chi splitType all chia cho mọi thành viên', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [],
      expenses: [
        {
          id: 'e1',
          title: 'Nước',
          category: 'drink',
          amount: 90000,
          paidById: 'a',
          splitType: 'all',
          participantIds: [],
        },
      ],
    });
    expect(out.rows.every((r) => r.expenseShare === 30000)).toBe(true);
  });

  it('tổng số dư ròng của cả nhóm bằng không', () => {
    const out = calculateSettlement({ members, dailySessions: [session()], expenses: [] });
    expect(out.rows.reduce((s, r) => s + r.netBalance, 0)).toBe(0);
  });

  it('không sinh giao dịch khi chênh lệch dưới 500 đồng', () => {
    const out = calculateSettlement({
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
      ],
      dailySessions: [],
      expenses: [
        {
          id: 'e1',
          title: 'Lẻ',
          category: 'other',
          amount: 400,
          paidById: 'a',
          splitType: 'all',
          participantIds: [],
        },
      ],
    });
    expect(out.transfers).toEqual([]);
  });

  it('tối thiểu số lần chuyển khoản', () => {
    const out = calculateSettlement({
      members,
      dailySessions: [
        session({ attendeeIds: ['a', 'b', 'c'], courtPayerId: 'a', shuttlecockPayerId: 'a' }),
      ],
      expenses: [],
    });
    expect(out.transfers).toHaveLength(2);
    expect(out.transfers.every((t) => t.toMemberId === 'a')).toBe(true);
    expect(out.transfers.reduce((s, t) => s + t.amount, 0)).toBe(
      out.rows.find((r) => r.memberId === 'a')!.netBalance
    );
  });

  it('cho kết quả giống hệt nhau giữa các lần chạy', () => {
    const input: SettlementInput = { members, dailySessions: [session()], expenses: [] };
    expect(calculateSettlement(input)).toEqual(calculateSettlement(input));
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận nó thất bại**

Run: `bun run test lib/settlement/calculate.test.ts`
Expected: FAIL, không tìm thấy module `./calculate`.

- [ ] **Step 4: Viết cài đặt**

`lib/settlement/calculate.ts`:

```typescript
import { allocate } from './allocate';
import type {
  SettlementInput,
  SettlementOutput,
  SettlementRow,
  Transfer,
} from './types';

/** Chênh lệch nhỏ hơn ngưỡng này không đáng sinh một lần chuyển khoản. */
const NGUONG_BO_QUA = 500;

export function calculateSettlement(input: SettlementInput): SettlementOutput {
  const { members, dailySessions, expenses } = input;

  const zero = () => new Map(members.map((m) => [m.id, 0]));
  const paid = zero();
  const share = zero();
  const attended = zero();
  const courtShare = zero();
  const shuttleShare = zero();
  const drinkShare = zero();
  const expenseShare = zero();

  const add = (map: Map<string, number>, id: string | null, amount: number) => {
    if (!id || !map.has(id)) return;
    map.set(id, map.get(id)! + amount);
  };

  let totalExpenses = 0;
  let totalCourtCost = 0;
  let totalShuttleCost = 0;
  let totalOtherCost = 0;

  for (const s of dailySessions) {
    const shuttleFee =
      s.shuttlecockTotalFee ?? s.shuttlecockCount * s.shuttlecockPricePerItem;

    totalCourtCost += s.courtFee;
    totalShuttleCost += shuttleFee;
    totalOtherCost += s.drinkFee + s.otherFee;
    totalExpenses += s.courtFee + shuttleFee + s.drinkFee + s.otherFee;

    add(paid, s.courtPayerId, s.courtFee);
    add(paid, s.shuttlecockPayerId, shuttleFee);
    if (s.drinkFee > 0) add(paid, s.drinkPayerId, s.drinkFee);
    if (s.otherFee > 0) add(paid, s.otherFeePayerId, s.otherFee);

    // Buổi không ghi người có mặt thì coi như cả nhóm cùng chịu.
    const attendees =
      s.attendeeIds.length > 0 ? s.attendeeIds : members.map((m) => m.id);
    if (attendees.length === 0) continue;

    const court = allocate(s.courtFee, attendees);
    const shuttle = allocate(shuttleFee, attendees);
    const drink = allocate(s.drinkFee + s.otherFee, attendees);

    for (const id of attendees) {
      add(attended, id, 1);
      add(courtShare, id, court.get(id) ?? 0);
      add(shuttleShare, id, shuttle.get(id) ?? 0);
      add(drinkShare, id, drink.get(id) ?? 0);
      add(
        share,
        id,
        (court.get(id) ?? 0) + (shuttle.get(id) ?? 0) + (drink.get(id) ?? 0)
      );
    }
  }

  for (const e of expenses) {
    totalExpenses += e.amount;
    add(paid, e.paidById, e.amount);

    const participants =
      e.splitType === 'all' || e.participantIds.length === 0
        ? members.map((m) => m.id)
        : e.participantIds;
    if (participants.length === 0) continue;

    const parts = allocate(e.amount, participants);
    for (const id of participants) {
      add(expenseShare, id, parts.get(id) ?? 0);
      add(share, id, parts.get(id) ?? 0);
    }
  }

  const rows: SettlementRow[] = members.map((m) => ({
    memberId: m.id,
    name: m.name,
    totalPaid: paid.get(m.id) ?? 0,
    totalShare: share.get(m.id) ?? 0,
    netBalance: (paid.get(m.id) ?? 0) - (share.get(m.id) ?? 0),
    sessionsAttendedCount: attended.get(m.id) ?? 0,
    courtShare: courtShare.get(m.id) ?? 0,
    shuttleShare: shuttleShare.get(m.id) ?? 0,
    drinkShare: drinkShare.get(m.id) ?? 0,
    expenseShare: expenseShare.get(m.id) ?? 0,
  }));

  return {
    rows,
    transfers: buildTransfers(rows),
    totalExpenses,
    totalCourtCost,
    totalShuttleCost,
    totalOtherCost,
  };
}

/**
 * Khớp tham lam người nợ nhiều nhất với người được nhận nhiều nhất để số lần
 * chuyển khoản là ít nhất. Sắp xếp có phá hòa bằng id nên kết quả ổn định.
 */
function buildTransfers(rows: SettlementRow[]): Transfer[] {
  const nameOf = new Map(rows.map((r) => [r.memberId, r.name]));

  const debtors = rows
    .filter((r) => r.netBalance < -NGUONG_BO_QUA)
    .map((r) => ({ id: r.memberId, amount: -r.netBalance }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const creditors = rows
    .filter((r) => r.netBalance > NGUONG_BO_QUA)
    .map((r) => ({ id: r.memberId, amount: r.netBalance }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount);

    if (amount > 0) {
      transfers.push({
        fromMemberId: debtors[d].id,
        fromMemberName: nameOf.get(debtors[d].id) ?? '',
        toMemberId: creditors[c].id,
        toMemberName: nameOf.get(creditors[c].id) ?? '',
        amount,
      });
    }

    debtors[d].amount -= amount;
    creditors[c].amount -= amount;
    if (debtors[d].amount === 0) d += 1;
    if (creditors[c].amount === 0) c += 1;
  }

  return transfers;
}
```

- [ ] **Step 5: Chạy test để xác nhận nó qua**

Run: `bun run test`
Expected: PASS, toàn bộ test của cả ba tệp.

- [ ] **Step 6: Commit**

```bash
git add lib/settlement/types.ts lib/settlement/calculate.ts lib/settlement/calculate.test.ts
git commit -m "feat: phép quyết toán chạy trên số nguyên đồng"
```

---

## Task 5: Báo cáo Zalo không kèm thông tin ngân hàng

Bản hiện tại in thẳng số tài khoản vào báo cáo (`src/utils/settlement.ts:373-378`). Bản mới không được có bất kỳ trường ngân hàng nào.

**Files:**
- Create: `lib/settlement/report.ts`, `lib/settlement/report.test.ts`

**Interfaces:**
- Consumes: `SettlementOutput` từ Task 4, `formatVND` từ Task 2.
- Produces: `generateZaloReport(args: ReportArgs): string`

- [ ] **Step 1: Viết test thất bại**

`lib/settlement/report.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { calculateSettlement } from './calculate';
import { generateZaloReport } from './report';

const members = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
];

const dailySessions = [
  {
    id: 'ds1',
    date: '2026-08-03',
    courtFee: 180000,
    courtPayerId: 'a',
    shuttlecockCount: 4,
    shuttlecockPricePerItem: 25000,
    shuttlecockTotalFee: null,
    shuttlecockPayerId: 'a',
    drinkFee: 0,
    drinkPayerId: null,
    otherFee: 0,
    otherFeePayerId: null,
    attendeeIds: ['a', 'b'],
  },
];

function report() {
  const settlement = calculateSettlement({ members, dailySessions, expenses: [] });
  return generateZaloReport({
    title: 'Tháng 08/2026',
    monthKey: '2026-08',
    memberCount: members.length,
    sessionCount: dailySessions.length,
    settlement,
  });
}

describe('generateZaloReport', () => {
  it('nêu tiêu đề kỳ và tổng chi', () => {
    const text = report();
    expect(text).toContain('THÁNG 08/2026');
    expect(text).toContain('280.000 đ');
  });

  it('liệt kê giao dịch chuyển khoản kèm tên hai bên', () => {
    expect(report()).toContain('[Bình] chuyển 👉 [An]');
  });

  it('không chứa bất kỳ thông tin tài khoản ngân hàng nào', () => {
    const text = report();
    expect(text).not.toMatch(/STK|số tài khoản|Vietcombank|MB Bank/i);
  });

  it('báo đã cân bằng khi không còn ai nợ ai', () => {
    const settlement = calculateSettlement({ members, dailySessions: [], expenses: [] });
    const text = generateZaloReport({
      title: 'Tháng 08/2026',
      monthKey: '2026-08',
      memberCount: 2,
      sessionCount: 0,
      settlement,
    });
    expect(text).toContain('đã thanh toán cân bằng');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `bun run test lib/settlement/report.test.ts`
Expected: FAIL, không tìm thấy module `./report`.

- [ ] **Step 3: Viết cài đặt**

`lib/settlement/report.ts`:

```typescript
import { formatVND } from '../money';
import type { SettlementOutput } from './types';

export interface ReportArgs {
  title: string;
  monthKey: string;
  memberCount: number;
  sessionCount: number;
  settlement: SettlementOutput;
}

export function generateZaloReport(args: ReportArgs): string {
  const { title, monthKey, memberCount, sessionCount, settlement } = args;
  const lines: string[] = [];

  lines.push(`🏸 BẢNG TỔNG KẾT TIỀN CẦU LÔNG - ${title.toUpperCase()} 🏸`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`👥 Tổng thành viên: ${memberCount} người`);
  if (sessionCount > 0) {
    lines.push(`📅 Tổng số buổi đánh trong tháng: ${sessionCount} buổi`);
  }
  lines.push(`💰 Tổng chi phí kỳ này: ${formatVND(settlement.totalExpenses)}`);
  lines.push('');

  lines.push('📊 ĐỐI SOÁT THEO SỐ BUỔI CÓ MẶT CỦA TỪNG NGƯỜI:');
  for (const r of settlement.rows) {
    const status =
      r.netBalance > 500
        ? `👉 ĐƯỢC NHẬN LẠI: +${formatVND(r.netBalance)}`
        : r.netBalance < -500
          ? `👉 CẦN ĐÓNG THÊM: ${formatVND(Math.abs(r.netBalance))}`
          : '👉 ĐÃ ĐỦ (0 đ)';

    const attendance =
      sessionCount > 0 ? ` [Có mặt: ${r.sessionsAttendedCount}/${sessionCount} buổi]` : '';

    lines.push(`• ${r.name}${attendance}:`);
    lines.push(`  - Đã chi trước: ${formatVND(r.totalPaid)}`);
    lines.push(`  - Phần phải chịu: ${formatVND(r.totalShare)}`);
    lines.push(`  ${status}`);
    lines.push('');
  }

  lines.push('💸 HƯỚNG DẪN CHUYỂN KHOẢN THANH TOÁN TỐI ƯU:');
  if (settlement.transfers.length === 0) {
    lines.push('✨ Tất cả thành viên đã thanh toán cân bằng!');
  } else {
    settlement.transfers.forEach((t, i) => {
      lines.push(
        `${i + 1}. [${t.fromMemberName}] chuyển 👉 [${t.toMemberName}]: ${formatVND(t.amount)}`
      );
    });
    lines.push('');
    lines.push('📌 Quét mã QR của người nhận ngay trong app để chuyển khoản.');
  }

  lines.push('');
  lines.push(`📌 Nội dung CK: [Tên_bạn] tien cau long ${monthKey}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('Cảm ơn cả nhóm đã cùng ra sân! 🏸🔥');

  return lines.join('\n');
}
```

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `bun run test`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add lib/settlement/report.ts lib/settlement/report.test.ts
git commit -m "feat: báo cáo Zalo bỏ thông tin tài khoản ngân hàng"
```

---

## Task 6: Khung Next.js

Đổi nền tảng. Sau task này ứng dụng chưa có dữ liệu thật nhưng phải chạy được `bun run dev`.

**Files:**
- Create: `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Delete: `server.ts`, `vite.config.ts`, `index.html`, `src/main.tsx`

**Interfaces:**
- Produces: một ứng dụng Next.js chạy được, Tailwind 4 hoạt động.

- [ ] **Step 1: Cài Next.js, gỡ Vite và Express**

```bash
bun add next@15
bun add -d @tailwindcss/postcss postcss
bun remove vite @vitejs/plugin-react @tailwindcss/vite express @types/express tsx esbuild dotenv pg @types/pg @google/genai autoprefixer
```

- [ ] **Step 2: Xóa tệp của nền tảng cũ**

```bash
git rm server.ts vite.config.ts index.html src/main.tsx
```

- [ ] **Step 3: Cấu hình PostCSS cho Tailwind 4**

`postcss.config.mjs`:

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 4: Cấu hình Next.js**

`next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: true,
};

export default nextConfig;
```

- [ ] **Step 5: Cập nhật scripts trong package.json**

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest"
```

Xóa script `preview` và `clean`.

- [ ] **Step 6: Cập nhật tsconfig.json**

Thay `compilerOptions` bằng:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Lưu ý `"strict": true` là mới; bản cũ không bật. Lỗi kiểu phát sinh được sửa ngay trong task đang chạm tới tệp đó.

- [ ] **Step 7: Chuyển CSS toàn cục**

```bash
mkdir -p app && git mv src/index.css app/globals.css
```

Mở `app/globals.css`, đảm bảo dòng đầu là `@import "tailwindcss";` (thay cho cú pháp cũ nếu khác).

- [ ] **Step 8: Viết layout gốc**

`app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Badminton Split — Chia Tiền Cầu Lông',
  description: 'Ghi chép buổi đánh, đếm trái cầu và chia tiền minh bạch',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Trang gốc chuyển hướng về tháng hiện tại**

`app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  redirect(`/${monthKey}`);
}
```

- [ ] **Step 10: Bổ sung .gitignore**

Thêm vào `.gitignore`:

```
.next/
next-env.d.ts
```

- [ ] **Step 11: Kiểm chứng ứng dụng chạy**

```bash
bun install && bun run dev
```

Expected: server khởi động. Mở `http://localhost:3000` sẽ chuyển hướng sang `/2026-08` và báo 404 — đúng như mong đợi ở bước này, vì tuyến `[monthKey]` chưa tồn tại.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: chuyển nền tảng từ Vite sang Next.js App Router"
```

---

## Task 7: Schema Drizzle và kết nối

**Files:**
- Create: `db/schema.ts`, `db/index.ts`, `drizzle.config.ts`, `.env.example`
- Modify: `package.json`

**Interfaces:**
- Produces: `db` (thực thể Drizzle), toàn bộ bảng trong `db/schema.ts`.

- [ ] **Step 1: Cài Drizzle**

```bash
bun add drizzle-orm postgres
bun add -d drizzle-kit
```

- [ ] **Step 2: Viết schema**

`db/schema.ts`:

```typescript
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

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    monthId: uuid('month_id')
      .notNull()
      .references(() => months.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: text('category').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    paidById: uuid('paid_by_id')
      .notNull()
      .references(() => members.id),
    splitType: text('split_type').notNull(),
    date: date('date').notNull(),
    note: text('note'),
  },
  (t) => [index('expenses_month_date_idx').on(t.monthId, t.date)]
);

export const expenseParticipants = pgTable(
  'expense_participants',
  {
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.expenseId, t.memberId] })]
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
```

- [ ] **Step 3: Khởi tạo kết nối**

`db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu biến môi trường DATABASE_URL');
}

// Trên Vercel mỗi lần gọi có thể dùng lại cùng một container, nên giữ client ở
// phạm vi module. `prepare: false` là bắt buộc với transaction pooler của
// Supabase — pooler không giữ prepared statement giữa các giao dịch.
const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> };

const client = globalForDb.client ?? postgres(connectionString, { prepare: false });
if (process.env.NODE_ENV !== 'production') globalForDb.client = client;

export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Cấu hình drizzle-kit**

`drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 5: Cập nhật .env.example**

Ghi đè `.env.example`:

```
# Chuỗi kết nối Supabase. Dùng transaction pooler (cổng 6543), KHÔNG dùng 5432 —
# cổng 5432 sẽ cạn kết nối khi chạy serverless trên Vercel.
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres

# Dùng cho script di cư và tải ảnh QR lên Storage.
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 6: Thêm script migrate**

Trong `package.json`, thêm vào `scripts`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 7: Điền .env thật**

Lấy chuỗi kết nối pooler từ bảng điều khiển Supabase (Project Settings → Database → Connection pooling → Transaction). Ghi vào `.env`. Xác nhận `.env` nằm trong `.gitignore` (đã có sẵn `.env*`).

- [ ] **Step 8: Sinh và chạy migration**

```bash
bun run db:generate
bun run db:migrate
```

Expected: thư mục `db/migrations/` có tệp SQL mới, và lệnh migrate báo áp dụng thành công.

- [ ] **Step 9: Kiểm chứng bảng đã tạo**

```bash
bunx drizzle-kit studio
```

Hoặc kiểm tra qua Supabase MCP. Expected: thấy đủ 8 bảng.

- [ ] **Step 10: Commit**

```bash
git add db/ drizzle.config.ts .env.example package.json
git commit -m "feat: schema quan hệ và kết nối Drizzle tới Supabase"
```

---

## Task 8: Script di cư dữ liệu

> **Điều kiện tiên quyết:** Step 8 của task này gọi `uploadQrFromDataUrl` từ
> `lib/storage.ts`. Hãy làm **Task 9 trước** rồi mới quay lại Step 8 ở đây.
> Các step từ 1 đến 7 là logic thuần, làm được ngay mà không cần Task 9.

**Files:**
- Create: `db/import-legacy.ts`, `db/import-legacy.test.ts`, `db/legacy-types.ts`

**Interfaces:**
- Consumes: schema từ Task 7, `calculateSettlement` từ Task 4.
- Produces: `normalizeLegacy(sessions: LegacyMonthSession[]): NormalizedData` — hàm thuần, tách khỏi phần ghi DB để test được.

- [ ] **Step 1: Định nghĩa kiểu dữ liệu cũ**

`db/legacy-types.ts`:

```typescript
export interface LegacyMember {
  id: string;
  name: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  qrCodeImage?: string;
  color?: string;
  isPermanent?: boolean;
}

export interface LegacyDailySession {
  id: string;
  date: string;
  title?: string;
  courtName: string;
  courtFee: number;
  courtPayerId: string;
  shuttlecockCount: number;
  shuttlecockPricePerItem: number;
  shuttlecockPayerId: string;
  shuttlecockTotalFee?: number;
  drinkFee?: number;
  drinkPayerId?: string;
  otherFee?: number;
  otherFeePayerId?: string;
  attendeeIds: string[];
  note?: string;
}

export interface LegacyExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  paidById: string;
  splitType: 'all' | 'custom';
  participantIds: string[];
  date: string;
  note?: string;
}

export interface LegacyMonthSession {
  id: string;
  monthKey: string;
  title: string;
  createdAt: string;
  members: LegacyMember[];
  dailySessions?: LegacyDailySession[];
  expenses: LegacyExpense[];
  settledTransferIds?: string[];
  initialFund?: number;
  note?: string;
}
```

- [ ] **Step 2: Viết test thất bại**

`db/import-legacy.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { normalizeLegacy } from './import-legacy';
import type { LegacyMonthSession } from './legacy-types';

const thang8: LegacyMonthSession = {
  id: 'session-2026-08',
  monthKey: '2026-08',
  title: 'Tháng 08/2026',
  createdAt: '2026-08-01T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Tuấn', bankName: 'MB', bankAccount: '0901234567', isPermanent: true },
    { id: 'm2', name: 'Nam', isPermanent: true },
  ],
  dailySessions: [
    {
      id: 'ds1',
      date: '2026-08-03',
      courtName: 'Sân 3',
      courtFee: 180000,
      courtPayerId: 'm1',
      shuttlecockCount: 4,
      shuttlecockPricePerItem: 25000,
      shuttlecockPayerId: 'm2',
      attendeeIds: ['m1', 'm2'],
    },
  ],
  expenses: [],
  settledTransferIds: ['m2-m1-40000'],
};

const thang9: LegacyMonthSession = {
  ...thang8,
  id: 'session-2026-09',
  monthKey: '2026-09',
  title: 'Tháng 09/2026',
  members: [{ id: 'x9', name: ' Tuấn ', isPermanent: true }],
  dailySessions: [],
  settledTransferIds: [],
};

describe('normalizeLegacy', () => {
  it('gộp thành viên trùng tên giữa các tháng thành một bản ghi', () => {
    const out = normalizeLegacy([thang8, thang9]);
    expect(out.members).toHaveLength(2);
    expect(out.members.map((m) => m.name).sort()).toEqual(['Nam', 'Tuấn']);
  });

  it('ghi nhận thành viên thuộc tháng nào', () => {
    const out = normalizeLegacy([thang8, thang9]);
    expect(out.monthMembers.filter((mm) => mm.monthKey === '2026-08')).toHaveLength(2);
    expect(out.monthMembers.filter((mm) => mm.monthKey === '2026-09')).toHaveLength(1);
  });

  it('không giữ lại bất kỳ trường ngân hàng nào', () => {
    const out = normalizeLegacy([thang8]);
    expect(JSON.stringify(out.members)).not.toContain('0901234567');
    expect(JSON.stringify(out.members)).not.toContain('MB');
  });

  it('liệt kê người có số tài khoản nhưng chưa có ảnh QR', () => {
    const out = normalizeLegacy([thang8]);
    expect(out.warnings.missingQr).toContain('Tuấn');
  });

  it('bỏ số tiền khỏi khóa giao dịch đã thanh toán', () => {
    const out = normalizeLegacy([thang8]);
    expect(out.settledTransfers).toHaveLength(1);
    const t = out.settledTransfers[0];
    expect(t.monthKey).toBe('2026-08');
    expect(t.fromLegacyId).toBe('m2');
    expect(t.toLegacyId).toBe('m1');
  });

  it('dừng lại khi hai người trùng tên nhưng khác số tài khoản', () => {
    const xungDot: LegacyMonthSession = {
      ...thang9,
      members: [{ id: 'z1', name: 'Tuấn', bankAccount: '9999999999', isPermanent: true }],
    };
    expect(() => normalizeLegacy([thang8, xungDot])).toThrow(/trùng tên/i);
  });

  it('chuyển mọi khoản tiền sang số nguyên', () => {
    const out = normalizeLegacy([thang8]);
    expect(Number.isInteger(out.dailySessions[0].courtFee)).toBe(true);
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận nó thất bại**

Run: `bun run test db/import-legacy.test.ts`
Expected: FAIL, không tìm thấy module `./import-legacy`.

- [ ] **Step 4: Viết phần chuẩn hóa thuần**

`db/import-legacy.ts` — phần đầu tệp:

```typescript
import { randomUUID } from 'node:crypto';
import type { LegacyMonthSession } from './legacy-types';

export interface NormalizedData {
  months: { id: string; monthKey: string; title: string; note: string | null; initialFund: number }[];
  members: { id: string; name: string; phone: string | null; color: string | null; isPermanent: boolean; legacyQrImage: string | null }[];
  monthMembers: { monthKey: string; memberId: string }[];
  dailySessions: {
    id: string; monthKey: string; date: string; title: string | null; courtName: string;
    courtFee: number; courtPayerId: string | null; shuttlecockCount: number;
    shuttlecockPricePerItem: number; shuttlecockTotalFee: number | null;
    shuttlecockPayerId: string | null; drinkFee: number; drinkPayerId: string | null;
    otherFee: number; otherFeePayerId: string | null; note: string | null;
    attendeeIds: string[];
  }[];
  expenses: {
    id: string; monthKey: string; title: string; category: string; amount: number;
    paidById: string; splitType: string; date: string; note: string | null;
    participantIds: string[];
  }[];
  settledTransfers: { monthKey: string; fromLegacyId: string; toLegacyId: string; fromMemberId: string; toMemberId: string }[];
  warnings: { missingQr: string[] };
}

const chuanHoaTen = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export function normalizeLegacy(sessions: LegacyMonthSession[]): NormalizedData {
  const memberByKey = new Map<string, NormalizedData['members'][0]>();
  const bankByKey = new Map<string, string>();
  // Ánh xạ id cũ (chỉ duy nhất trong phạm vi một tháng) sang id mới.
  const idMap = new Map<string, string>();
  const missingQr = new Set<string>();

  const out: NormalizedData = {
    months: [], members: [], monthMembers: [], dailySessions: [],
    expenses: [], settledTransfers: [], warnings: { missingQr: [] },
  };

  for (const s of sessions) {
    for (const m of s.members) {
      const key = chuanHoaTen(m.name);
      const account = (m.bankAccount ?? '').trim();

      if (memberByKey.has(key)) {
        const seen = bankByKey.get(key) ?? '';
        if (account && seen && account !== seen) {
          throw new Error(
            `Hai người trùng tên "${m.name.trim()}" nhưng khác số tài khoản. ` +
              `Hãy đổi tên một trong hai trong bản sao lưu rồi chạy lại.`
          );
        }
        if (account && !seen) bankByKey.set(key, account);
      } else {
        memberByKey.set(key, {
          id: randomUUID(),
          name: m.name.trim(),
          phone: m.phone?.trim() || null,
          color: m.color ?? null,
          isPermanent: m.isPermanent !== false,
          legacyQrImage: m.qrCodeImage ?? null,
        });
        if (account) bankByKey.set(key, account);
      }

      const rec = memberByKey.get(key)!;
      if (!rec.legacyQrImage && m.qrCodeImage) rec.legacyQrImage = m.qrCodeImage;
      idMap.set(`${s.monthKey}::${m.id}`, rec.id);
      if (account && !rec.legacyQrImage) missingQr.add(rec.name);
    }
  }

  out.members = [...memberByKey.values()];
  out.warnings.missingQr = [...missingQr].sort();

  const resolve = (monthKey: string, legacyId: string | undefined | null) =>
    legacyId ? (idMap.get(`${monthKey}::${legacyId}`) ?? null) : null;

  for (const s of sessions) {
    out.months.push({
      id: randomUUID(),
      monthKey: s.monthKey,
      title: s.title,
      note: s.note?.trim() || null,
      initialFund: Math.round(s.initialFund ?? 0),
    });

    for (const m of s.members) {
      const id = resolve(s.monthKey, m.id);
      if (id) out.monthMembers.push({ monthKey: s.monthKey, memberId: id });
    }

    for (const d of s.dailySessions ?? []) {
      out.dailySessions.push({
        id: randomUUID(),
        monthKey: s.monthKey,
        date: d.date,
        title: d.title?.trim() || null,
        courtName: d.courtName,
        courtFee: Math.round(d.courtFee ?? 0),
        courtPayerId: resolve(s.monthKey, d.courtPayerId),
        shuttlecockCount: Math.round(d.shuttlecockCount ?? 0),
        shuttlecockPricePerItem: Math.round(d.shuttlecockPricePerItem ?? 0),
        shuttlecockTotalFee:
          d.shuttlecockTotalFee === undefined ? null : Math.round(d.shuttlecockTotalFee),
        shuttlecockPayerId: resolve(s.monthKey, d.shuttlecockPayerId),
        drinkFee: Math.round(d.drinkFee ?? 0),
        drinkPayerId: resolve(s.monthKey, d.drinkPayerId),
        otherFee: Math.round(d.otherFee ?? 0),
        otherFeePayerId: resolve(s.monthKey, d.otherFeePayerId),
        note: d.note?.trim() || null,
        attendeeIds: (d.attendeeIds ?? [])
          .map((id) => resolve(s.monthKey, id))
          .filter((id): id is string => id !== null),
      });
    }

    for (const e of s.expenses ?? []) {
      const paidBy = resolve(s.monthKey, e.paidById);
      if (!paidBy) continue;
      out.expenses.push({
        id: randomUUID(),
        monthKey: s.monthKey,
        title: e.title,
        category: e.category,
        amount: Math.round(e.amount),
        paidById: paidBy,
        splitType: e.splitType,
        date: e.date,
        note: e.note?.trim() || null,
        participantIds: (e.participantIds ?? [])
          .map((id) => resolve(s.monthKey, id))
          .filter((id): id is string => id !== null),
      });
    }

    // Khóa cũ có dạng "{người nợ}-{người nhận}-{số tiền}". Id thành viên cũ
    // không chứa dấu gạch ngang, nên tách theo dấu gạch là an toàn; phần số
    // tiền bị bỏ đi vì nó chính là nguyên nhân làm mất dấu đã thanh toán.
    for (const key of s.settledTransferIds ?? []) {
      const parts = key.split('-');
      if (parts.length < 3) continue;
      const [fromLegacyId, toLegacyId] = parts;
      const fromMemberId = resolve(s.monthKey, fromLegacyId);
      const toMemberId = resolve(s.monthKey, toLegacyId);
      if (!fromMemberId || !toMemberId) continue;
      out.settledTransfers.push({
        monthKey: s.monthKey, fromLegacyId, toLegacyId, fromMemberId, toMemberId,
      });
    }
  }

  return out;
}
```

- [ ] **Step 5: Chạy test để xác nhận nó qua**

Run: `bun run test db/import-legacy.test.ts`
Expected: PASS, 7 test.

- [ ] **Step 6: Viết test đối chiếu số tiền trước và sau**

Thêm vào cuối `db/import-legacy.test.ts`:

```typescript
import { calculateSettlement } from '../lib/settlement/calculate';

describe('đối chiếu quyết toán trước và sau khi chuẩn hóa', () => {
  it('danh sách chuyển khoản không đổi về người và số tiền', () => {
    const out = normalizeLegacy([thang8]);
    const byId = new Map(out.members.map((m) => [m.id, m.name]));

    const sau = calculateSettlement({
      members: out.members.map((m) => ({ id: m.id, name: m.name })),
      dailySessions: out.dailySessions.map((d) => ({
        id: d.id, date: d.date, courtFee: d.courtFee, courtPayerId: d.courtPayerId,
        shuttlecockCount: d.shuttlecockCount,
        shuttlecockPricePerItem: d.shuttlecockPricePerItem,
        shuttlecockTotalFee: d.shuttlecockTotalFee,
        shuttlecockPayerId: d.shuttlecockPayerId, drinkFee: d.drinkFee,
        drinkPayerId: d.drinkPayerId, otherFee: d.otherFee,
        otherFeePayerId: d.otherFeePayerId, attendeeIds: d.attendeeIds,
      })),
      expenses: [],
    });

    // Tháng 8 mẫu: Tuấn ứng 180.000, Nam ứng 100.000, hai người chia đôi 280.000.
    // Nam còn nợ Tuấn 40.000.
    expect(sau.transfers).toHaveLength(1);
    expect(byId.get(sau.transfers[0].fromMemberId)).toBe('Nam');
    expect(byId.get(sau.transfers[0].toMemberId)).toBe('Tuấn');
    expect(sau.transfers[0].amount).toBe(40000);
  });
});
```

- [ ] **Step 7: Chạy test**

Run: `bun run test`
Expected: PASS toàn bộ.

- [ ] **Step 8: Viết phần ghi vào DB**

Thêm vào cuối `db/import-legacy.ts`:

```typescript
import { db } from './index';
import {
  dailySessions as tblDailySessions, expenseParticipants as tblExpenseParticipants,
  expenses as tblExpenses, members as tblMembers, monthMembers as tblMonthMembers,
  months as tblMonths, sessionAttendees as tblSessionAttendees,
  settledTransfers as tblSettledTransfers,
} from './schema';
import { uploadQrFromDataUrl } from '../lib/storage';

export async function importLegacy(sessions: LegacyMonthSession[]) {
  const data = normalizeLegacy(sessions);

  if (data.warnings.missingQr.length > 0) {
    console.warn(
      '\n⚠️  Những người sau có số tài khoản nhưng CHƯA có ảnh QR.\n' +
        '   Họ sẽ không nhận được tiền qua app cho tới khi tải QR lên:\n' +
        data.warnings.missingQr.map((n) => `   • ${n}`).join('\n') + '\n'
    );
  }

  const qrPaths = new Map<string, string>();
  for (const m of data.members) {
    if (!m.legacyQrImage) continue;
    qrPaths.set(m.id, await uploadQrFromDataUrl(m.id, m.legacyQrImage));
  }

  const monthIdByKey = new Map(data.months.map((m) => [m.monthKey, m.id]));

  await db.transaction(async (tx) => {
    await tx.delete(tblSettledTransfers);
    await tx.delete(tblExpenseParticipants);
    await tx.delete(tblExpenses);
    await tx.delete(tblSessionAttendees);
    await tx.delete(tblDailySessions);
    await tx.delete(tblMonthMembers);
    await tx.delete(tblMonths);
    await tx.delete(tblMembers);

    await tx.insert(tblMembers).values(
      data.members.map((m) => ({
        id: m.id, name: m.name, phone: m.phone, color: m.color,
        isPermanent: m.isPermanent, qrImagePath: qrPaths.get(m.id) ?? null,
      }))
    );

    await tx.insert(tblMonths).values(
      data.months.map((m) => ({
        id: m.id, monthKey: m.monthKey, title: m.title, note: m.note,
        initialFund: m.initialFund,
      }))
    );

    if (data.monthMembers.length) {
      await tx.insert(tblMonthMembers).values(
        data.monthMembers.map((mm) => ({
          monthId: monthIdByKey.get(mm.monthKey)!, memberId: mm.memberId,
        }))
      );
    }

    for (const d of data.dailySessions) {
      const { monthKey, attendeeIds, ...rest } = d;
      await tx.insert(tblDailySessions).values({ ...rest, monthId: monthIdByKey.get(monthKey)! });
      if (attendeeIds.length) {
        await tx.insert(tblSessionAttendees).values(
          attendeeIds.map((memberId) => ({ sessionId: d.id, memberId }))
        );
      }
    }

    for (const e of data.expenses) {
      const { monthKey, participantIds, ...rest } = e;
      await tx.insert(tblExpenses).values({ ...rest, monthId: monthIdByKey.get(monthKey)! });
      if (participantIds.length) {
        await tx.insert(tblExpenseParticipants).values(
          participantIds.map((memberId) => ({ expenseId: e.id, memberId }))
        );
      }
    }

    if (data.settledTransfers.length) {
      await tx.insert(tblSettledTransfers).values(
        data.settledTransfers.map((t) => ({
          monthId: monthIdByKey.get(t.monthKey)!,
          fromMemberId: t.fromMemberId,
          toMemberId: t.toMemberId,
        }))
      );
    }
  });

  console.log(
    `✅ Đã nạp ${data.months.length} tháng, ${data.members.length} thành viên, ` +
      `${data.dailySessions.length} buổi đánh, ${data.expenses.length} khoản chi.`
  );
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error('Cách dùng: bun run db/import-legacy.ts <đường-dẫn-file-sao-lưu.json>');
    process.exit(1);
  }
  const raw = await Bun.file(file).json();
  await importLegacy(raw as LegacyMonthSession[]);
  process.exit(0);
}
```

- [ ] **Step 9: Chạy di cư trên dữ liệu thật**

```bash
bun run db/import-legacy.ts ~/badminton-backup-2026-08-16.json
```

Expected: in ra số lượng đã nạp, kèm cảnh báo về người thiếu QR nếu có.

- [ ] **Step 10: Đối chiếu bằng mắt**

Mở app cũ (nếu còn chạy được) hoặc file sao lưu, so số tiền quyết toán từng tháng với dữ liệu vừa nạp qua `bunx drizzle-kit studio`. Lệch quá một đồng mỗi người thì dừng và điều tra.

- [ ] **Step 11: Commit**

```bash
git add db/legacy-types.ts db/import-legacy.ts db/import-legacy.test.ts
git commit -m "feat: script di cư từ JSON sao lưu sang schema chuẩn hóa"
```

---

## Task 9: Ảnh QR trên Supabase Storage

**Files:**
- Create: `lib/storage.ts`

**Interfaces:**
- Produces:
  - `uploadQrFromDataUrl(memberId: string, dataUrl: string): Promise<string>` — trả về đường dẫn trong bucket.
  - `uploadQrFromFile(memberId: string, file: File): Promise<string>`
  - `getQrSignedUrl(path: string | null): Promise<string | null>`

Task 8 gọi `uploadQrFromDataUrl`, nên nếu thực hiện tuần tự thì làm task này trước Step 8 của Task 8.

- [ ] **Step 1: Cài SDK Supabase**

```bash
bun add @supabase/supabase-js
```

- [ ] **Step 2: Tạo bucket riêng tư**

Trong bảng điều khiển Supabase → Storage → New bucket. Tên `member-qr`, **bỏ chọn** "Public bucket". Hoặc dùng Supabase MCP.

- [ ] **Step 3: Viết module**

`lib/storage.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'member-qr';
const SIGNED_URL_TTL = 60 * 60; // một giờ

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Chuỗi ảnh không đúng định dạng data URL');
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

export async function uploadQrFromDataUrl(memberId: string, dataUrl: string): Promise<string> {
  const { buffer, contentType } = dataUrlToBuffer(dataUrl);
  const path = `${memberId}.jpg`;
  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

export async function uploadQrFromFile(memberId: string, file: File): Promise<string> {
  const path = `${memberId}.jpg`;
  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return path;
}

/**
 * Bucket để riêng tư nên không có URL công khai. Mọi thành viên đều được xem QR
 * của nhau — chủ đích là ai cũng chuyển tiền được cho ai mà không phải đi xin —
 * nên hàm này không kiểm tra quyền theo từng người. Giai đoạn 2 sẽ chèn điều
 * kiện "đã đăng nhập" vào đúng đây.
 */
export async function getQrSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin()
    .storage.from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data.signedUrl;
}
```

- [ ] **Step 4: Kiểm chứng thủ công**

```bash
bun -e "import('./lib/storage.ts').then(async (m) => { const px='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; const p = await m.uploadQrFromDataUrl('00000000-0000-0000-0000-000000000000', px); console.log('path:', p); console.log('signed:', await m.getQrSignedUrl(p)); })"
```

Expected: in ra đường dẫn và một URL có chữ ký. Mở URL đó thấy ảnh; bỏ phần chữ ký đi thì bị từ chối.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts package.json
git commit -m "feat: tải ảnh QR lên Storage riêng tư, đọc qua signed URL"
```

---

## Task 10: Tầng đọc dữ liệu

**Files:**
- Create: `db/queries.ts`

**Interfaces:**
- Consumes: `db`, schema từ Task 7; `calculateSettlement` từ Task 4.
- Produces:
  - `getMonthByKey(monthKey: string)`
  - `getMonthData(monthKey: string)` — trả về tháng, thành viên, buổi đánh, khoản chi, kết quả quyết toán, danh sách giao dịch đã đánh dấu.
  - `listMonthKeys(): Promise<string[]>`
  - `getSessionDefaults(monthKey: string)`

- [ ] **Step 1: Viết truy vấn**

`db/queries.ts`:

```typescript
import { and, asc, desc, eq, inArray, lt } from 'drizzle-orm';
import { db } from './index';
import {
  dailySessions, expenseParticipants, expenses, members, monthMembers,
  months, sessionAttendees, settledTransfers,
} from './schema';
import { calculateSettlement } from '../lib/settlement/calculate';

export async function listMonthKeys(): Promise<string[]> {
  const rows = await db.select({ monthKey: months.monthKey }).from(months).orderBy(desc(months.monthKey));
  return rows.map((r) => r.monthKey);
}

export async function getMonthByKey(monthKey: string) {
  const [row] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  return row ?? null;
}

export async function getMonthData(monthKey: string) {
  const month = await getMonthByKey(monthKey);
  if (!month) return null;

  const memberRows = await db
    .select({
      id: members.id, name: members.name, phone: members.phone,
      qrImagePath: members.qrImagePath, color: members.color,
      isPermanent: members.isPermanent,
    })
    .from(monthMembers)
    .innerJoin(members, eq(members.id, monthMembers.memberId))
    .where(eq(monthMembers.monthId, month.id))
    .orderBy(asc(members.name));

  const sessionRows = await db
    .select()
    .from(dailySessions)
    .where(eq(dailySessions.monthId, month.id))
    .orderBy(desc(dailySessions.date));

  const sessionIds = sessionRows.map((s) => s.id);
  const attendeeRows = sessionIds.length
    ? await db.select().from(sessionAttendees).where(inArray(sessionAttendees.sessionId, sessionIds))
    : [];

  const expenseRows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.monthId, month.id))
    .orderBy(desc(expenses.date));

  const expenseIds = expenseRows.map((e) => e.id);
  const participantRows = expenseIds.length
    ? await db.select().from(expenseParticipants).where(inArray(expenseParticipants.expenseId, expenseIds))
    : [];

  const settledRows = await db
    .select()
    .from(settledTransfers)
    .where(eq(settledTransfers.monthId, month.id));

  const attendeesBySession = groupBy(attendeeRows, (r) => r.sessionId, (r) => r.memberId);
  const participantsByExpense = groupBy(participantRows, (r) => r.expenseId, (r) => r.memberId);

  const sessionsWithAttendees = sessionRows.map((s) => ({
    ...s,
    attendeeIds: attendeesBySession.get(s.id) ?? [],
  }));

  const expensesWithParticipants = expenseRows.map((e) => ({
    ...e,
    participantIds: participantsByExpense.get(e.id) ?? [],
  }));

  const settlement = calculateSettlement({
    members: memberRows.map((m) => ({ id: m.id, name: m.name })),
    dailySessions: sessionsWithAttendees.map((s) => ({
      id: s.id, date: s.date, courtFee: s.courtFee, courtPayerId: s.courtPayerId,
      shuttlecockCount: s.shuttlecockCount,
      shuttlecockPricePerItem: s.shuttlecockPricePerItem,
      shuttlecockTotalFee: s.shuttlecockTotalFee,
      shuttlecockPayerId: s.shuttlecockPayerId, drinkFee: s.drinkFee,
      drinkPayerId: s.drinkPayerId, otherFee: s.otherFee,
      otherFeePayerId: s.otherFeePayerId, attendeeIds: s.attendeeIds,
    })),
    expenses: expensesWithParticipants.map((e) => ({
      id: e.id, title: e.title, category: e.category as never, amount: e.amount,
      paidById: e.paidById, splitType: e.splitType as 'all' | 'custom',
      participantIds: e.participantIds,
    })),
  });

  const settledKeys = new Set(settledRows.map((r) => `${r.fromMemberId}::${r.toMemberId}`));

  return {
    month,
    members: memberRows,
    dailySessions: sessionsWithAttendees,
    expenses: expensesWithParticipants,
    settlement: {
      ...settlement,
      transfers: settlement.transfers.map((t) => ({
        ...t,
        isSettled: settledKeys.has(`${t.fromMemberId}::${t.toMemberId}`),
      })),
    },
  };
}

/**
 * Thông số của buổi đánh gần nhất, dùng làm giá trị mặc định cho buổi mới.
 * Thay cho các hằng số cứng trong DailySessionModal trước đây.
 */
export async function getSessionDefaults(monthKey: string) {
  const month = await getMonthByKey(monthKey);
  if (!month) return null;

  const [latest] = await db
    .select()
    .from(dailySessions)
    .where(eq(dailySessions.monthId, month.id))
    .orderBy(desc(dailySessions.date))
    .limit(1);

  const source = latest ?? (await latestSessionBefore(monthKey));
  if (!source) return null;

  const attendees = await db
    .select({ memberId: sessionAttendees.memberId })
    .from(sessionAttendees)
    .where(eq(sessionAttendees.sessionId, source.id));

  return {
    courtName: source.courtName,
    courtFee: source.courtFee,
    courtPayerId: source.courtPayerId,
    shuttlecockCount: source.shuttlecockCount,
    shuttlecockPricePerItem: source.shuttlecockPricePerItem,
    shuttlecockPayerId: source.shuttlecockPayerId,
    attendeeIds: attendees.map((a) => a.memberId),
  };
}

async function latestSessionBefore(monthKey: string) {
  const [prevMonth] = await db
    .select()
    .from(months)
    .where(lt(months.monthKey, monthKey))
    .orderBy(desc(months.monthKey))
    .limit(1);
  if (!prevMonth) return null;

  const [row] = await db
    .select()
    .from(dailySessions)
    .where(eq(dailySessions.monthId, prevMonth.id))
    .orderBy(desc(dailySessions.date))
    .limit(1);
  return row ?? null;
}

function groupBy<T, K, V>(rows: T[], key: (r: T) => K, value: (r: T) => V): Map<K, V[]> {
  const map = new Map<K, V[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(value(row));
    else map.set(k, [value(row)]);
  }
  return map;
}
```

Ghi chú: `and` được import sẵn cho Task 11 dùng; nếu trình biên dịch báo không dùng tới thì bỏ khỏi danh sách import.

- [ ] **Step 2: Kiểm chứng đọc được dữ liệu thật**

```bash
bun -e "import('./db/queries.ts').then(async (q) => { const keys = await q.listMonthKeys(); console.log('Các tháng:', keys); const d = await q.getMonthData(keys[0]); console.log('Thành viên:', d.members.length, '| Buổi:', d.dailySessions.length); console.table(d.settlement.transfers); })"
```

Expected: in ra danh sách tháng và bảng chuyển khoản khớp với dữ liệu cũ.

- [ ] **Step 3: Commit**

```bash
git add db/queries.ts
git commit -m "feat: tầng đọc dữ liệu, quyết toán tính sẵn trên server"
```

---

## Task 11: Server Actions cho thao tác ghi

**Files:**
- Create: `app/actions/months.ts`, `app/actions/members.ts`, `app/actions/daily-sessions.ts`, `app/actions/expenses.ts`, `app/actions/settlement.ts`

**Interfaces:**
- Consumes: `db`, schema, `revalidatePath`.
- Produces: các action `createMonth`, `updateMonth`, `deleteMonth`, `createMember`, `updateMember`, `deleteMember`, `saveDailySession`, `deleteDailySession`, `saveExpense`, `deleteExpense`, `toggleTransferSettled`.

Đây là **con đường ghi duy nhất**. Không có API route nào ghi dữ liệu. Giai đoạn 2 sẽ chèn kiểm tra quyền vào đúng các tệp này.

- [ ] **Step 1: Action cho tháng**

`app/actions/months.ts`:

```typescript
'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '../../db';
import { members, monthMembers, months } from '../../db/schema';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function createMonth(monthKey: string, carryOverPermanent = true) {
  if (!MONTH_KEY.test(monthKey)) throw new Error('Mã tháng không hợp lệ');

  const [existing] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (existing) redirect(`/${monthKey}`);

  const [y, m] = monthKey.split('-');

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(months)
      .values({ monthKey, title: `Tháng ${m}/${y}`, note: `Kỳ Tháng ${m}/${y}` })
      .returning();

    if (carryOverPermanent) {
      const permanent = await tx.select({ id: members.id }).from(members).where(eq(members.isPermanent, true));
      if (permanent.length) {
        await tx.insert(monthMembers).values(
          permanent.map((p) => ({ monthId: created.id, memberId: p.id }))
        );
      }
    }
  });

  revalidatePath('/', 'layout');
  redirect(`/${monthKey}`);
}

export async function updateMonth(monthId: string, fields: { title?: string; note?: string; initialFund?: number }) {
  await db.update(months).set(fields).where(eq(months.id, monthId));
  revalidatePath('/', 'layout');
}

export async function deleteMonth(monthId: string) {
  await db.delete(months).where(eq(months.id, monthId));
  revalidatePath('/', 'layout');
  redirect('/');
}
```

- [ ] **Step 2: Action cho thành viên**

`app/actions/members.ts`:

```typescript
'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { members, monthMembers, months } from '../../db/schema';
import { uploadQrFromFile } from '../../lib/storage';

export async function createMember(monthKey: string, input: {
  name: string; phone?: string; color?: string; isPermanent: boolean; qrFile?: File | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('Tên thành viên không được để trống');

  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  const [created] = await db
    .insert(members)
    .values({
      name, phone: input.phone?.trim() || null,
      color: input.color ?? null, isPermanent: input.isPermanent,
    })
    .returning();

  if (input.qrFile && input.qrFile.size > 0) {
    const path = await uploadQrFromFile(created.id, input.qrFile);
    await db.update(members).set({ qrImagePath: path }).where(eq(members.id, created.id));
  }

  await db.insert(monthMembers).values({ monthId: month.id, memberId: created.id });
  revalidatePath(`/${monthKey}`, 'layout');
  return created.id;
}

export async function updateMember(monthKey: string, memberId: string, input: {
  name: string; phone?: string; color?: string; isPermanent: boolean; qrFile?: File | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('Tên thành viên không được để trống');

  const patch: Record<string, unknown> = {
    name, phone: input.phone?.trim() || null,
    color: input.color ?? null, isPermanent: input.isPermanent,
  };

  if (input.qrFile && input.qrFile.size > 0) {
    patch.qrImagePath = await uploadQrFromFile(memberId, input.qrFile);
  }

  await db.update(members).set(patch).where(eq(members.id, memberId));
  revalidatePath(`/${monthKey}`, 'layout');
}

/** Chỉ gỡ khỏi tháng đang xem; bản ghi thành viên và lịch sử các tháng khác giữ nguyên. */
export async function removeMemberFromMonth(monthKey: string, memberId: string) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  await db
    .delete(monthMembers)
    .where(and(eq(monthMembers.monthId, month.id), eq(monthMembers.memberId, memberId)));

  revalidatePath(`/${monthKey}`, 'layout');
}
```

- [ ] **Step 3: Action cho buổi đánh**

`app/actions/daily-sessions.ts`:

```typescript
'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { dailySessions, months, sessionAttendees } from '../../db/schema';

export interface DailySessionInput {
  id?: string;
  date: string;
  title?: string | null;
  courtName: string;
  courtFee: number;
  courtPayerId: string | null;
  shuttlecockCount: number;
  shuttlecockPricePerItem: number;
  shuttlecockTotalFee: number | null;
  shuttlecockPayerId: string | null;
  drinkFee: number;
  drinkPayerId: string | null;
  otherFee: number;
  otherFeePayerId: string | null;
  note?: string | null;
  attendeeIds: string[];
}

export async function saveDailySession(monthKey: string, input: DailySessionInput) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');
  if (input.attendeeIds.length === 0) throw new Error('Buổi đánh phải có ít nhất một người');

  const { id, attendeeIds, ...fields } = input;

  await db.transaction(async (tx) => {
    let sessionId = id;

    if (sessionId) {
      await tx.update(dailySessions).set(fields).where(eq(dailySessions.id, sessionId));
      await tx.delete(sessionAttendees).where(eq(sessionAttendees.sessionId, sessionId));
    } else {
      const [created] = await tx
        .insert(dailySessions)
        .values({ ...fields, monthId: month.id })
        .returning({ id: dailySessions.id });
      sessionId = created.id;
    }

    await tx.insert(sessionAttendees).values(
      attendeeIds.map((memberId) => ({ sessionId: sessionId!, memberId }))
    );
  });

  revalidatePath(`/${monthKey}`, 'layout');
}

export async function deleteDailySession(monthKey: string, sessionId: string) {
  await db.delete(dailySessions).where(eq(dailySessions.id, sessionId));
  revalidatePath(`/${monthKey}`, 'layout');
}
```

- [ ] **Step 4: Action cho khoản chi**

`app/actions/expenses.ts`:

```typescript
'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { expenseParticipants, expenses, monthMembers, months } from '../../db/schema';

export interface ExpenseInput {
  id?: string;
  title: string;
  category: string;
  amount: number;
  paidById: string;
  splitType: 'all' | 'custom';
  participantIds: string[];
  date: string;
  note?: string | null;
}

export async function saveExpense(monthKey: string, input: ExpenseInput) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');
  if (!input.title.trim()) throw new Error('Tên khoản chi không được để trống');
  if (input.amount <= 0) throw new Error('Số tiền phải lớn hơn 0');

  // splitType 'all' nghĩa là chia cho mọi thành viên của tháng tại thời điểm
  // lưu; ghi rõ danh sách ra bảng để về sau thêm người không làm đổi số cũ.
  const participantIds =
    input.splitType === 'all'
      ? (await db
          .select({ memberId: monthMembers.memberId })
          .from(monthMembers)
          .where(eq(monthMembers.monthId, month.id))).map((r) => r.memberId)
      : input.participantIds;

  if (participantIds.length === 0) throw new Error('Khoản chi phải có ít nhất một người tham gia');

  const { id, participantIds: _ignored, ...fields } = input;

  await db.transaction(async (tx) => {
    let expenseId = id;

    if (expenseId) {
      await tx.update(expenses).set(fields).where(eq(expenses.id, expenseId));
      await tx.delete(expenseParticipants).where(eq(expenseParticipants.expenseId, expenseId));
    } else {
      const [created] = await tx
        .insert(expenses)
        .values({ ...fields, monthId: month.id })
        .returning({ id: expenses.id });
      expenseId = created.id;
    }

    await tx.insert(expenseParticipants).values(
      participantIds.map((memberId) => ({ expenseId: expenseId!, memberId }))
    );
  });

  revalidatePath(`/${monthKey}`, 'layout');
}

export async function deleteExpense(monthKey: string, expenseId: string) {
  await db.delete(expenses).where(eq(expenses.id, expenseId));
  revalidatePath(`/${monthKey}`, 'layout');
}
```

- [ ] **Step 5: Action đánh dấu đã chuyển khoản**

`app/actions/settlement.ts`:

```typescript
'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '../../db';
import { months, settledTransfers } from '../../db/schema';

export async function toggleTransferSettled(
  monthKey: string,
  fromMemberId: string,
  toMemberId: string
) {
  const [month] = await db.select().from(months).where(eq(months.monthKey, monthKey)).limit(1);
  if (!month) throw new Error('Không tìm thấy tháng');

  const where = and(
    eq(settledTransfers.monthId, month.id),
    eq(settledTransfers.fromMemberId, fromMemberId),
    eq(settledTransfers.toMemberId, toMemberId)
  );

  const [existing] = await db.select().from(settledTransfers).where(where).limit(1);

  if (existing) {
    await db.delete(settledTransfers).where(where);
  } else {
    await db.insert(settledTransfers).values({
      monthId: month.id, fromMemberId, toMemberId,
    });
  }

  revalidatePath(`/${monthKey}`, 'layout');
}
```

- [ ] **Step 6: Kiểm tra biên dịch**

Run: `bun run lint`
Expected: không có lỗi kiểu.

- [ ] **Step 7: Commit**

```bash
git add app/actions/
git commit -m "feat: Server Actions là đường ghi dữ liệu duy nhất"
```

---

## Task 12: Trang tháng và đấu nối giao diện

Task lớn nhất. Chuyển các component sang thư mục mới, bỏ mọi phép tính phía client, bỏ các trường ngân hàng, và nối vào Server Actions.

**Files:**
- Create: `app/[monthKey]/layout.tsx`, `app/[monthKey]/page.tsx`, `app/[monthKey]/settlement/page.tsx`, `app/[monthKey]/expenses/page.tsx`, `app/[monthKey]/members/page.tsx`
- Move: `src/components/*` → `components/*`
- Modify: `components/SettlementView.tsx`, `components/MemberView.tsx`, `components/DailySessionModal.tsx`, `components/ExpenseFormModal.tsx`, `components/Navbar.tsx`, `components/ZaloReportModal.tsx`
- Delete: `src/App.tsx`, `src/lib/api.ts`, `src/utils/storage.ts`, `src/utils/settlement.ts`, `src/types.ts`, `src/components/VietQrModal.tsx`, `src/components/MemberManagerModal.tsx`

- [ ] **Step 1: Chuyển component sang thư mục mới**

```bash
mkdir -p components
git mv src/components/*.tsx components/
git mv src/utils/image.ts lib/image.ts
git rm src/App.tsx src/lib/api.ts src/utils/storage.ts src/utils/settlement.ts src/types.ts
git rm components/VietQrModal.tsx components/MemberManagerModal.tsx
rmdir src/components src/lib src/utils src 2>/dev/null || true
```

`MemberManagerModal.tsx` là bản sao 1038 dòng của `MemberView.tsx` và không được import ở đâu — xóa hẳn.

- [ ] **Step 2: Chuyển hằng dùng chung**

Tạo `lib/categories.ts`, chép nguyên `CATEGORY_CONFIG` và `MEMBER_COLORS` từ `src/types.ts` và `src/utils/settlement.ts` cũ. **Không** chép `VIETNAM_BANKS`.

```typescript
export type ExpenseCategory = 'court' | 'shuttlecock' | 'drink' | 'gathering' | 'other';

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  court: { label: 'Tiền Sân', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  shuttlecock: { label: 'Quả Cầu Lông', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  drink: { label: 'Nước Uống', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  gathering: { label: 'Ăn Uống / Giao Lưu', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  other: { label: 'Phí Khác', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
};

export const MEMBER_COLORS = [
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-sky-100 text-sky-800 border-sky-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-orange-100 text-orange-800 border-orange-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
];

export function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
```

- [ ] **Step 3: Viết layout của tháng**

`app/[monthKey]/layout.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getMonthData, listMonthKeys } from '../../db/queries';
import { Navbar } from '../../components/Navbar';

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function MonthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ monthKey: string }>;
}) {
  const { monthKey } = await params;
  if (!MONTH_KEY.test(monthKey)) notFound();

  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const monthKeys = await listMonthKeys();

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <Navbar monthKey={monthKey} month={data.month} monthKeys={monthKeys} />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-3.5 py-4 sm:space-y-5 sm:px-6 sm:py-5">
        {children}
      </main>
      <footer className="mt-8 border-t border-slate-200/80 bg-white py-3.5 text-center text-xs text-slate-400">
        🏸 Badminton Split — Điểm danh sân, tính trái cầu & chia tiền minh bạch
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Viết bốn trang tab**

`app/[monthKey]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getMonthData, getSessionDefaults } from '../../db/queries';
import { DailySessionsTab } from '../../components/DailySessionsTab';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const defaults = await getSessionDefaults(monthKey);

  return (
    <DailySessionsTab
      monthKey={monthKey}
      members={data.members}
      sessions={data.dailySessions}
      defaults={defaults}
    />
  );
}
```

`app/[monthKey]/settlement/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { generateZaloReport } from '../../../lib/settlement/report';
import { SettlementView } from '../../../components/SettlementView';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const qrByMember = new Map(
    await Promise.all(
      data.members.map(async (m) => [m.id, await getQrSignedUrl(m.qrImagePath)] as const)
    )
  );

  const report = generateZaloReport({
    title: data.month.title,
    monthKey,
    memberCount: data.members.length,
    sessionCount: data.dailySessions.length,
    settlement: data.settlement,
  });

  return (
    <SettlementView
      monthKey={monthKey}
      settlement={data.settlement}
      qrUrls={Object.fromEntries(qrByMember)}
      report={report}
    />
  );
}
```

`app/[monthKey]/expenses/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { ExpensesTab } from '../../../components/ExpensesTab';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  return <ExpensesTab monthKey={monthKey} members={data.members} expenses={data.expenses} />;
}
```

`app/[monthKey]/members/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getMonthData } from '../../../db/queries';
import { getQrSignedUrl } from '../../../lib/storage';
import { MemberView } from '../../../components/MemberView';

export default async function Page({ params }: { params: Promise<{ monthKey: string }> }) {
  const { monthKey } = await params;
  const data = await getMonthData(monthKey);
  if (!data) notFound();

  const membersWithQr = await Promise.all(
    data.members.map(async (m) => ({ ...m, qrUrl: await getQrSignedUrl(m.qrImagePath) }))
  );

  return (
    <MemberView
      monthKey={monthKey}
      members={membersWithQr}
      settlementRows={data.settlement.rows}
    />
  );
}
```

- [ ] **Step 5: Tạo hai component bọc phía client**

`components/DailySessionsTab.tsx` và `components/ExpensesTab.tsx` là component `'use client'` giữ state mở/đóng modal — phần trước đây nằm trong `App.tsx`. Chúng nhận dữ liệu đã tính sẵn qua props, gọi Server Action khi lưu, và không tự tính toán gì.

Khung của `components/DailySessionsTab.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { DailySessionList } from './DailySessionList';
import { DailySessionModal } from './DailySessionModal';
import { saveDailySession, deleteDailySession } from '../app/actions/daily-sessions';

export function DailySessionsTab({ monthKey, members, sessions, defaults }: {
  monthKey: string;
  members: { id: string; name: string; color: string | null }[];
  sessions: any[];
  defaults: Awaited<ReturnType<typeof import('../db/queries').getSessionDefaults>>;
}) {
  const [editing, setEditing] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [presetDate, setPresetDate] = useState<string | undefined>();

  const openNew = (date?: string) => {
    setEditing(null);
    setPresetDate(date);
    setIsOpen(true);
  };

  return (
    <>
      <DailySessionList
        sessions={sessions}
        members={members}
        monthKey={monthKey}
        onAddSession={openNew}
        onEditSession={(s) => { setEditing(s); setIsOpen(true); }}
        onDeleteSession={(id) => deleteDailySession(monthKey, id)}
      />
      {isOpen && (
        <DailySessionModal
          members={members}
          initialData={editing}
          defaults={defaults}
          defaultDate={presetDate}
          onSave={async (data) => {
            await saveDailySession(monthKey, data);
            setIsOpen(false);
            setEditing(null);
          }}
          onClose={() => { setIsOpen(false); setEditing(null); }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 6: Bỏ mặc định cứng trong DailySessionModal**

Trong `components/DailySessionModal.tsx`, thay các hằng số cứng ở dòng 46-51 và 88-98 của bản cũ bằng giá trị lấy từ prop `defaults`:

```tsx
const [courtName, setCourtName] = useState(initialData?.courtName ?? defaults?.courtName ?? '');
const [courtFee, setCourtFee] = useState(String(initialData?.courtFee ?? defaults?.courtFee ?? ''));
const [shuttlecockCount, setShuttlecockCount] = useState(
  String(initialData?.shuttlecockCount ?? defaults?.shuttlecockCount ?? '')
);
const [shuttlecockPricePerItem, setShuttlecockPricePerItem] = useState(
  String(initialData?.shuttlecockPricePerItem ?? defaults?.shuttlecockPricePerItem ?? '')
);
const [courtPayerId, setCourtPayerId] = useState(
  initialData?.courtPayerId ?? defaults?.courtPayerId ?? ''
);
const [shuttlecockPayerId, setShuttlecockPayerId] = useState(
  initialData?.shuttlecockPayerId ?? defaults?.shuttlecockPayerId ?? ''
);
const [attendeeIds, setAttendeeIds] = useState<string[]>(
  initialData?.attendeeIds ?? defaults?.attendeeIds ?? members.map((m) => m.id)
);
```

Xóa hẳn `'Sân 3 - Kỳ Hòa'`, `180000`, `25000`, `members[1]?.id` khỏi tệp.

- [ ] **Step 7: Bỏ trường ngân hàng khỏi MemberView**

Trong `components/MemberView.tsx`:
- Xóa state `bankName`, `bankAccount`, `bankAccountName` và ba ô nhập tương ứng.
- Xóa nút chép thông tin tài khoản (dòng 257 bản cũ) và phần hiển thị `m.bankName` (dòng 501 bản cũ).
- Xóa import `VIETNAM_BANKS`.
- Giữ phần tải ảnh QR, đổi sang gửi `File` qua Server Action `updateMember`.

- [ ] **Step 8: Đơn giản hóa SettlementView**

Trong `components/SettlementView.tsx`:
- Xóa mọi lời gọi `calculateSettlement`; nhận `settlement` qua props.
- Xóa import `VietQrModal`; hiển thị ảnh QR trực tiếp từ `qrUrls[t.toMemberId]`.
- Người nhận chưa có QR thì hiện dòng "Chưa có mã QR — nhắc {tên} tải lên trong tab Thành viên".
- Giao dịch đã đánh dấu nhưng số tiền đã đổi thì hiện nhãn cảnh báo, không tự bỏ dấu.

- [ ] **Step 9: Kiểm tra biên dịch**

Run: `bun run lint`
Expected: không lỗi. Sửa mọi lỗi kiểu phát sinh do bật `strict`.

- [ ] **Step 10: Kiểm chứng thủ công toàn bộ luồng**

```bash
bun run dev
```

Lần lượt kiểm: mở `/` chuyển hướng đúng tháng; bốn tab hiển thị đúng số liệu; thêm một buổi đánh và thấy biểu mẫu **đã điền sẵn** theo buổi gần nhất; sửa và xóa buổi đánh; thêm khoản chi; đánh dấu một giao dịch đã chuyển khoản rồi thêm một buổi đánh mới và xác nhận dấu **vẫn còn**; ảnh QR hiện trong tab quyết toán; báo cáo Zalo **không chứa** số tài khoản.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: giao diện đọc dữ liệu từ server, bỏ tính toán phía client"
```

---

## Task 13: Deploy lên Vercel

**Files:**
- Create: `README.md`

- [ ] **Step 1: Kiểm tra bản dựng production tại máy**

```bash
bun run build
```

Expected: build thành công, không lỗi kiểu.

- [ ] **Step 2: Tạo README**

`README.md` ghi: cách chạy tại máy, các biến môi trường cần có, cách chạy script di cư, và ghi chú bắt buộc dùng cổng 6543.

- [ ] **Step 3: Deploy**

```bash
bunx vercel --prod
```

Khai báo `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` trong phần biến môi trường của dự án Vercel.

- [ ] **Step 4: Kiểm chứng kết nối không bị cạn**

Mở trang quyết toán, tải lại liên tiếp 20 lần. Expected: không có lỗi `too many connections`. Nếu có, kiểm tra lại `DATABASE_URL` đang dùng cổng 6543 chứ không phải 5432.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: hướng dẫn chạy và triển khai"
```

---

## Tự rà soát

**Bao phủ spec:** cấu trúc thư mục (Task 6, 12), tháng trên URL (Task 12), Server Actions (Task 11), pooler 6543 (Task 7, 13), schema đầy đủ 8 bảng (Task 7), thành viên toàn cục (Task 7, 8), tiền số nguyên (Task 2, 3, 4), khóa giao dịch không chứa số tiền (Task 7, 8, 11), module quyết toán (Task 4), mặc định từ buổi gần nhất (Task 10, 12), bỏ trường ngân hàng (Task 5, 8, 12), QR trên Storage riêng tư (Task 9), di cư hai nguồn (Task 8), kiểm thử (Task 2-5, 8), sao lưu trước tiên (Task 1).

**Điểm cần lưu ý khi thực hiện:**

- Thứ tự thực hiện: Task 8 (step 1-7) → Task 9 → Task 8 (step 8-11) → Task 10. Đã ghi rõ ở đầu Task 8.
- Task 12 là task lớn nhất và chạm nhiều tệp nhất. Nếu thấy quá nặng khi thực hiện, tách theo từng tab: buổi đánh, quyết toán, khoản chi, thành viên — mỗi tab một commit.
- Bật `"strict": true` ở Task 6 sẽ làm lộ nhiều lỗi kiểu trong các component cũ. Sửa dần theo từng task chạm tới tệp, không sửa hết một lượt.
