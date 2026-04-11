import api from './api';
import type { ProductAPI, ProductsResponse } from './products.api';

export interface StockUpdateItem {
  productId: number;
  actualStock: number;
  note?: string;
}

export const inventoryApi = {
  // Lấy danh sách sản phẩm có tồn kho (stock > 0 hoặc có minStock)
  getProducts: () =>
    api.get<ProductsResponse>('/products', { params: { limit: 200 } }),

  // Cập nhật tồn kho 1 sản phẩm
  updateStock: (id: number, stock: number) =>
    api.patch<ProductAPI>(`/products/${id}`, { stock }),
};