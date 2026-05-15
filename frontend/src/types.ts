// src/types.ts
// Source of truth duy nhất cho toàn app — các file khác import từ đây, không tự khai báo lại.

// ─── NAV ────────────────────────────────────────────────────
export type NavPage =
  | 'Tổng quan'
  | 'Hàng hóa'
  | 'Phòng/Bàn'
  | 'Giao dịch'
  | 'Đối tác'
  | 'Nhân viên'
  | 'Bán Online'
  | 'Sổ quỹ'
  | 'Báo cáo'
  | 'Thuế & Kế toán';

// ─── USER / AUTH ─────────────────────────────────────────────
// Một định nghĩa duy nhất — KHÔNG khai báo lại trong AuthContext hay employeeTypes
export type UserRole = 'admin' | 'manager' | 'cashier' | 'staff' | 'barista';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
}

// ─── CATEGORY ────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── PRODUCT ─────────────────────────────────────────────────
export type MenuType = 'food' | 'beverage' | 'other';
export type ProductStatus = 'active' | 'inactive';

export interface Product {
  id: number;
  code: string;
  name: string;
  menuType: MenuType;
  categoryId: number;
  category: Category;
  status: ProductStatus;
  imageUrl?: string;
  imagePublicId?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductForm {
  name: string;
  category: string;
  menuType: string;
  price: string;
  cost: string;
  stock: string;
  unit: string;
  status: boolean;
  image: string;
  imageFile?: File;
}

// ─── ORDER ───────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type OrderItemStatus = 'new' | 'sent' | 'done' | 'cancelled';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;   // snapshot tại lúc đặt
  unitPrice: number;     // snapshot tại lúc đặt
  quantity: number;
  lineTotal: number;
  note?: string;
  status: OrderItemStatus;
  createdAt: string;
}

export interface Order {
  id: number;
  tableId: number;
  createdBy: number;
  status: OrderStatus;
  subtotal: number;
  note?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CreateOrderDto {
  tableId: number;
  note?: string;
  items: { productId: number; quantity: number; note?: string }[];
}

export interface UpdateOrderItemsDto {
  version: number;   // required — optimistic locking
  items: { productId: number; quantity: number; note?: string }[];
  note?: string;
}

// ─── PAYMENT ─────────────────────────────────────────────────
export type PaymentMethod = 'cash' | 'bank_transfer' | 'payos_qr';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface Payment {
  id: number;
  orderId: number;
  method: PaymentMethod;
  amount: number;
  receivedAmount: number;
  changeAmount: number;
  paidBy: number;
  note?: string;
  paymentStatus: PaymentStatus;
  paymentLinkId?: string;
  checkoutUrl?: string;
  qrCode?: string;
  transactionRef?: string;
  paidAt: string;
}

export interface CreatePaymentDto {
  method: PaymentMethod;
  receivedAmount?: number;  // chỉ cần khi method === 'cash'
  note?: string;
}

// ─── SHIFT ───────────────────────────────────────────────────
export interface Shift {
  id: number;
  name: string;
  startTime: string;    // HH:mm
  endTime: string;      // HH:mm
  isOvernight: boolean; // tự tính bởi BE
  totalHours: number;   // DECIMAL 4,1
  maxStaff: number;     // tối thiểu 3
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = 'scheduled' | 'absent';

export interface ShiftAssignment {
  id: number;
  userId: number;
  shiftId: number;
  workDate: string;     // YYYY-MM-DD
  status: AssignmentStatus;
  note?: string;
  assignedBy: number;
  createdAt: string;
  updatedAt: string;
  user: User;
  shift: Shift;
}

// ─── SHIFT BULK ───────────────────────────────────────────────
export interface BulkAssignDto {
  shiftId: number;
  userIds: number[];
  workDates: string[];  // YYYY-MM-DD[]
}

export interface BulkAssignResult {
  created: ShiftAssignment[];
  errors: { userId: number; workDate: string; reason: string }[];
  warnings: string[];
}

// ─── QUERY PARAMS ────────────────────────────────────────────
export interface QueryOrderDto {
  tableId?: number;
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface QueryProductDto {
  categoryId?: number;
  status?: ProductStatus;
  menuType?: MenuType;
  search?: string;
  page?: number;
  limit?: number;
}
