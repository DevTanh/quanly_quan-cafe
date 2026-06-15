// src/api/orders.api.ts

import api from './api';
import type {
  Order,
  CreateOrderDto,
  UpdateOrderItemsDto,
  CreatePaymentDto,
  QueryOrderDto,
  Payment,
} from '../types';

/** Kiểu trả về phân trang từ BE — khớp với PaginatedResult<Order> */
export interface PaginatedOrders {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ordersApi = {
  /**
   * GET /orders
   * BE trả PaginatedResult<Order> — không phải Order[] thuần.
   * FIX: đổi type từ Order[] → PaginatedOrders.
   */
  findAll: async (query?: QueryOrderDto): Promise<PaginatedOrders> => {
    const { data } = await api.get<PaginatedOrders>('/orders', { params: query });
    // Guard: nếu BE trả mảng thẳng (legacy), bọc lại
    if (Array.isArray(data)) {
      return { data: data as unknown as Order[], total: (data as any).length, page: 1, limit: 200, totalPages: 1 };
    }
    return data;
  },

  /** GET /orders/:id */
  findById: async (id: number): Promise<Order> => {
    const { data } = await api.get<Order>(`/orders/${id}`);
    return data;
  },

  /** GET /orders/:id/payment-status */
  getPaymentStatus: async (id: number): Promise<{ orderId: number; paymentStatus: string | null; method: string | null }> => {
    const { data } = await api.get(`/orders/${id}/payment-status`);
    return data;
  },

  /** POST /orders — tạo đơn mới */
  create: async (dto: CreateOrderDto): Promise<Order> => {
    const { data } = await api.post<Order>('/orders', dto);
    return data;
  },

  /**
   * PATCH /orders/:id/items — cập nhật món
   * FIX: version phải được truyền từ order.version để tránh lỗi 409 Optimistic Lock.
   */
  updateItems: async (id: number, dto: UpdateOrderItemsDto): Promise<Order> => {
    const { data } = await api.patch<Order>(`/orders/${id}/items`, dto);
    return data;
  },

  /** POST /orders/:id/send-to-bar — gửi quầy bar */
  sendToBar: async (id: number): Promise<Order> => {
    const { data } = await api.post<Order>(`/orders/${id}/send-to-bar`);
    return data;
  },

  /** POST /orders/:id/payment — thanh toán */
  pay: async (id: number, dto: CreatePaymentDto): Promise<{ payment: Payment; order: Order }> => {
    const { data } = await api.post<{ payment: Payment; order: Order }>(`/orders/${id}/payment`, dto);
    return data;
  },

  /** POST /orders/:id/cancel-payment — hủy QR */
  cancelPayment: async (id: number): Promise<void> => {
    await api.post(`/orders/${id}/cancel-payment`);
  },

  /** PATCH /orders/:id/cancel — hủy đơn */
  cancel: async (id: number): Promise<Order> => {
    const { data } = await api.patch<Order>(`/orders/${id}/cancel`);
    return data;
  },

  /** PATCH /orders/:orderId/items/:itemId/status — cập nhật trạng thái món (barista/staff) */
  updateItemStatus: async (
    orderId: number,
    itemId: number,
    status: 'new' | 'sent' | 'done' | 'cancelled',
  ): Promise<{ message: string }> => {
    const { data } = await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status });
    return data;
  },
};