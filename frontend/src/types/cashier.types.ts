// src/types/cashier.types.ts
// Types dành riêng cho màn hình POS (CashierPOS).
// Khác với Order/Product trong types.ts — đây là dạng đã được map để dùng trong UI.

export interface TableItem {
  id: string;       // string vì JSON từ tables.json / BE trả string
  name: string;
  seats: number;
  note: string;
  status: 'active' | 'inactive';
}

export interface Zone {
  id: string;
  name: string;
  note: string;
  status: 'active' | 'inactive';
  tables: TableItem[];
}

/** MenuItem là Product đã map sang dạng gọn cho POS */
export interface MenuItem {
  id: string;       // Product.id.toString()
  name: string;
  price: number;    // Product.sellingPrice
  category: string; // Category.name
}

/** CartItem = MenuItem + số lượng + ghi chú trong cart */
export interface CartItem extends MenuItem {
  qty: number;
  note?: string;
}
