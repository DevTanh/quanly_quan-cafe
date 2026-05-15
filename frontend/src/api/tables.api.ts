// src/api/tables.api.ts
import api from './api';
import type { Order, CreateOrderDto } from '../types';

export const tablesApi = {
  /** Lấy tất cả orders đang active để biết bàn nào có khách */
  getActiveOrders: async (): Promise<Order[]> => {
    const { data } = await api.get<Order[]>('/orders', {
      params: { status: 'pending' },
    });
    // Gọi thêm processing
    const { data: processing } = await api.get<Order[]>('/orders', {
      params: { status: 'processing' },
    });
    const { data: completed } = await api.get<Order[]>('/orders', {
      params: { status: 'completed' },
    });
    return [...data, ...processing, ...completed];
  },

  /** Lấy order đang active của 1 bàn cụ thể */
  getOrderByTableId: async (tableId: number): Promise<Order | null> => {
    const { data } = await api.get<Order[]>('/orders', {
      params: { tableId },
    });
    const active = data.find(o =>
      ['pending', 'processing', 'completed'].includes(o.status)
    );
    return active ?? null;
  },

  /** Tạo order mới (mở bàn) */
  openTable: async (dto: CreateOrderDto): Promise<Order> => {
    const { data } = await api.post<Order>('/orders', dto);
    return data;
  },
};
