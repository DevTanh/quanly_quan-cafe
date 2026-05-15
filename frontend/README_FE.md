# Frontend — Quản Lý Quán Cafe

React + TypeScript + Vite + Axios

---

## 1. Cài đặt & chạy

```bash
npm install
npm run dev
```

---

## 2. Cấu hình môi trường

Tạo file `.env` ở root frontend:

```env
# URL backend — phải có /api/v1 ở cuối
VITE_API_URL=http://localhost:8080/api/v1
```

> Nếu không có biến này, app fallback về `http://localhost:8080/api/v1` (dev).

---

## 3. Kết nối với Backend

### Auth — Cookie-based

Backend dùng **HttpOnly cookie** (không phải localStorage token).

```typescript
// ✅ Đúng — axios instance đã có withCredentials: true
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,  // Bắt buộc
});

// ❌ Sai — không cần và không hoạt động
headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
```

Khi token hết hạn, interceptor trong `api/api.ts` tự gọi `/auth/refresh` và retry request gốc. Nếu refresh cũng fail → dispatch event `auth:logout` → `AuthContext` clear user state → redirect về login.

### Luồng đăng nhập

```
POST /auth/login → BE set access_token + refresh_token cookie (HttpOnly)
                 → FE nhận { user } → lưu vào AuthContext state
GET  /auth/me    → verify session khi reload trang (cookie tự gửi)
POST /auth/refresh → rotate token (tự động qua interceptor)
POST /auth/logout  → revoke session, xóa cookie
```

---

## 4. Cấu trúc thư mục

```
src/
├── api/
│   ├── api.ts              ← axios instance + refresh-token interceptor
│   ├── products.api.ts     ← /products, /categories
│   ├── orders.api.ts       ← /orders (full CRUD + payment)
│   ├── cashier.api.ts      ← wrapper cho POS (getTables, getMenuItems, pay...)
│   ├── shifts.api.ts       ← /shifts, /shift-assignments
│   ├── tables.api.ts       ← helper lấy active orders theo bàn
│   └── inventory.api.ts    ← /products (stock management)
│
├── context/
│   └── AuthContext.tsx     ← user state, login/logout
│
├── rbac/
│   └── permissions.ts      ← can(role, permission) — UI guard
│
├── types/
│   ├── cashier.types.ts    ← Zone, TableItem, MenuItem, CartItem (POS only)
│   └── employeeTypes.ts    ← Employee, Department, Position (chưa kết nối BE)
│
├── types.ts                ← Source of truth: User, Product, Order, Shift, ...
│
└── components/
    ├── cashier/CashierPOS.tsx
    ├── products/Products.tsx
    ├── shifts/WorkSchedule.tsx
    └── ...
```

---

## 5. Các API đã kết nối BE

| Module | File | Endpoints |
|--------|------|-----------|
| Auth | `AuthContext.tsx` | `/auth/login`, `/auth/me`, `/auth/logout`, `/auth/refresh` |
| Sản phẩm | `products.api.ts` | `/products`, `/categories` — full CRUD + import/export Excel |
| Orders | `orders.api.ts` | `/orders` — tạo, sửa món, gửi bar, thanh toán, hủy |
| POS Thu ngân | `cashier.api.ts` | Wrapper: lấy bàn, menu, tạo order, thanh toán |
| Ca làm việc | `shifts.api.ts` | `/shifts`, `/shift-assignments` — full CRUD + bulk assign |
| Kho | `inventory.api.ts` | `/products` — xem + cập nhật stock |

---

## 6. RBAC — Phân quyền

### Cách dùng

```typescript
import { can } from '../rbac/permissions';
import { useAuth } from '../context/AuthContext';

const { user } = useAuth();

// Ẩn nút xóa với người không có quyền
{can(user.role, 'product:manage') && <button>Xóa</button>}

// Ẩn cả route
{can(user.role, 'shift:manage') && <ShiftManagement />}
```

### Bảng quyền chính

| Permission | Admin | Manager | Cashier | Staff | Barista |
|---|:---:|:---:|:---:|:---:|:---:|
| `product:view` | ✓ | ✓ | ✓ | ✓ | — |
| `product:manage` | ✓ | ✓ | — | — | — |
| `order:create` | ✓ | ✓ | ✓ | ✓ | — |
| `order:view_all` | ✓ | ✓ | ✓ | — | — |
| `order:cancel_processing` | ✓ | ✓ | — | — | — |
| `payment:process` | ✓ | ✓ | ✓ | — | — |
| `payment:approve_refund` | ✓ | ✓ | — | — | — |
| `shift:manage` | ✓ | ✓ | — | — | — |
| `user:create` | ✓ | — | — | — | — |
| `system:config` | ✓ | — | — | — | — |
| `order:view_queue` | ✓ | ✓ | — | — | ✓ |
| `menu:view_barista` | — | — | — | — | ✓ |

> ⚠️ RBAC frontend chỉ là **UI guard** (ẩn/hiện). Backend enforce độc lập — không phụ thuộc vào FE.

---

## 7. Module POS — CashierPOS

### Trạng thái bàn (Occupied)

Trạng thái "Đang có khách" được lấy từ API thực tế (không hardcode):

```typescript
// Lấy set tableId đang có order pending/processing
const ids = await cashierApi.getOccupiedTableIds();
// Poll mỗi 30 giây để cập nhật real-time
setInterval(fetchOccupied, 30_000);
```

### Luồng tạo đơn & thanh toán

```
1. Chọn bàn → setSelectedTable
2. Mở menu → cashierApi.getMenuItems() (lazy, cache sau lần đầu)
3. Thêm món vào cart (local state)
4. Bấm Thanh toán:
   a. POST /orders  → { tableId, items[] }
   b. POST /orders/:id/payment → { method: 'cash' }
5. Refresh occupied table IDs
```

### TODO còn lại trong POS

- Hỗ trợ chọn phương thức thanh toán (cash / bank_transfer / payos_qr)
- QR PayOS: tạo link → polling `/orders/:id/payment-status`
- Mang về / Giao đi: BE cần xử lý `tableId = null` hoặc type riêng
- Tải lại order cũ khi mở bàn đang có khách (`cashierApi.getTableOrder(tableId)`)

---

## 8. Module Shift — Lịch làm việc

### API đã kết nối

```typescript
// Lấy lịch cá nhân
shiftsApi.getMyAssignments({ from: '2025-01-01', to: '2025-01-07' })

// Lịch tuần grid (Mon–Sun)
shiftsApi.getWeekSchedule('2025-01-06')  // Monday of week

// Phân ca hàng loạt
shiftsApi.bulkAssign({
  shiftId: 1,
  userIds: [2, 3, 4],
  workDates: ['2025-01-06', '2025-01-07'],
})
// → { created: [...], errors: [...], warnings: [...] }

// Đánh dấu vắng (chỉ workDate <= today)
shiftsApi.markAbsent(assignmentId, 'Nghỉ ốm')
```

### Validation quan trọng (BE enforce)

| Rule | Kết quả nếu vi phạm |
|------|---------------------|
| workDate < today | 400 — Không thể phân ca ngày quá khứ |
| Trùng (userId, shiftId, workDate) | 400 — Đã có phân ca |
| Vượt maxStaff | 400 — Ca đã đủ người |
| Overlap giờ | 400 — Trùng ca (kể cả ca qua đêm) |
| markAbsent tương lai | 400 — Không thể đánh dấu ngày tương lai |

---

## 9. Các module chưa kết nối BE

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| `Employees.tsx` | ❌ Dùng JSON tĩnh | Cần API `/users` từ BE |
| `Transactions.tsx` | ❌ Mock UI | Cần `orders.api.ts` + filter |
| `Dashboard.tsx` | ⚠️ Partial | Cần API report/summary |
| Tables (zones/bàn) | ⚠️ Mock JSON | Cần BE tạo `/zones` API |

---

## 10. Quy ước thêm API mới

1. Tạo hoặc thêm function vào file `src/api/[module].api.ts`
2. Dùng axios instance `api` từ `api/api.ts` — không dùng `fetch()`
3. Không hardcode URL — dùng path relative (VD: `/products`, không phải `http://...`)
4. Types định nghĩa trong `src/types.ts` — không tạo lại trong file api
5. `extractArray<T>()` khi BE trả về `{ data: T[] }` hoặc thẳng `T[]`
