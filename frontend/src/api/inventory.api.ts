// src/api/inventory.api.ts
import api from './api';
import { extractArray } from '../utils/extractArray';
import type { ProductAPI } from './products.api';

export interface StockCheckItemDto {
  productId: number;
  actualStock: number;
  note?: string;
}

export interface CreateStockCheckDto {
  checkerName: string;
  items: StockCheckItemDto[];
}

export interface StockCheckRecord {
  id: number;
  code: string;
  checkerName: string;
  checkedBy: number;
  totalItems: number;
  totalDiff: number;
  createdAt: string;
  items: {
    id: number;
    productId: number;
    productCode: string;
    productName: string;
    categoryName: string;
    systemStock: number;
    actualStock: number;
    diff: number;
    note?: string;
  }[];
}

export interface StockCheckListResponse {
  data: StockCheckRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const inventoryApi = {
  /** GET /products?limit=200 — lấy toàn bộ sản phẩm để quản lý kho */
  getProducts: async (): Promise<ProductAPI[]> => {
    const res = await api.get('/products', { params: { limit: 200 } });
    return extractArray<ProductAPI>(res.data);
  },

  /**
   * POST /inventory/stock-checks
   * Tạo phiếu kiểm kho đúng nghiệp vụ kế toán:
   * - Lưu phiếu với đầy đủ lịch sử
   * - Cập nhật tồn kho theo delta (actualStock - systemStock)
   */
  createStockCheck: async (dto: CreateStockCheckDto): Promise<StockCheckRecord> => {
    const { data } = await api.post<StockCheckRecord>('/inventory/stock-checks', dto);
    return data;
  },

  /** GET /inventory/stock-checks — lịch sử phiếu kiểm kho */
  getStockChecks: async (params?: {
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<StockCheckListResponse> => {
    const { data } = await api.get<StockCheckListResponse>('/inventory/stock-checks', { params });
    return data;
  },

  /** GET /inventory/stock-checks/:id — chi tiết phiếu kiểm kho */
  getStockCheckById: async (id: number): Promise<StockCheckRecord> => {
    const { data } = await api.get<StockCheckRecord>(`/inventory/stock-checks/${id}`);
    return data;
  },

  /** GET /inventory/low-stock — sản phẩm tồn kho thấp */
  getLowStock: async (): Promise<ProductAPI[]> => {
    const { data } = await api.get<ProductAPI[]>('/inventory/low-stock');
    return extractArray<ProductAPI>(data);
  },
};
