// src/api/inventory.api.ts
import api from './api';
import type { Product } from '../types';
import { extractArray } from '../utils/extractArray';

export const inventoryApi = {
  /** GET /products?limit=200 — lấy toàn bộ sản phẩm để quản lý kho */
  getProducts: async (): Promise<Product[]> => {
    const res = await api.get('/products', { params: { limit: 200 } });
    return extractArray<Product>(res.data);
  },

  /**
   * PATCH /products/:id — cập nhật tồn kho
   * Dùng JSON (không phải FormData) vì chỉ update field stock.
   * inventory:update permission.
   */
  updateStock: async (id: number, stock: number): Promise<Product> => {
    const { data } = await api.patch<Product>(`/products/${id}`, { stock });
    return data;
  },
};
