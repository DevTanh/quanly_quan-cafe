// src/api/cashier.api.ts
// Dùng axios instance chung (có interceptor refresh-token + withCredentials)

import api from './api';
import { extractArray } from '../utils/extractArray';
import type { Zone, MenuItem } from '../types/cashier.types';
import type { CreateOrderDto, Order, CreatePaymentDto } from '../types';

/** Response từ BE khi tạo QR payment (PayOS) */
export interface QrPaymentResult {
  payment: {
    id: number;
    paymentLinkId: string;
    qrCode: string;
    checkoutUrl: string;
    paymentStatus: string;
  };
  order: Order;
}

/** Response polling trạng thái payment */
export interface PaymentStatusResult {
  orderId: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refund_pending' | 'refunded' | null;
  method: string | null;
}

export interface CancelPaymentResult {
  statusCode: number;
  message: string;
  paymentStatus: 'cancelled';
}

export const cashierApi = {
  /**
   * GET /zones?include=tables
   * Lấy danh sách khu vực + bàn từ BE thực tế.
   */
  getTables: async (): Promise<Zone[]> => {
    const { data } = await api.get('/zones', { params: { include: 'tables' } });
    return extractArray<Zone>(data);
  },

  /**
   * Lấy danh sách món từ /products?status=active
   * Map Product → MenuItem cho POS dùng.
   */
  getMenuItems: async (): Promise<MenuItem[]> => {
    const { data } = await api.get('/products', {
      params: { status: 'active', limit: 200 },
    });
    const raw = extractArray<any>(data);
    return raw.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      price: Number(p.sellingPrice),
      category: p.category?.name ?? '',
    }));
  },

  /**
   * Lấy order đang pending/processing của một bàn.
   */
  getTableOrder: async (tableId: number): Promise<Order | null> => {
    const { data } = await api.get<any>('/orders', {
      params: { tableId, status: 'pending' },
    });
    const list = extractArray<Order>(data);
    const pending = list.find(o => o.status === 'pending');
    if (pending) return pending;
    const { data: procData } = await api.get<any>('/orders', {
      params: { tableId, status: 'processing' },
    });
    return extractArray<Order>(procData)[0] ?? null;
  },

  /**
   * Lấy tất cả tableId đang có order active (pending | processing).
   * Dùng để tô màu "Đang dùng" trên sơ đồ bàn.
   */
  getOccupiedTableIds: async (): Promise<Set<number>> => {
    const [{ data: pending }, { data: processing }] = await Promise.all([
      api.get<any>('/orders', { params: { status: 'pending', limit: 200 } }),
      api.get<any>('/orders', { params: { status: 'processing', limit: 200 } }),
    ]);
    const all = [
      ...extractArray<Order>(pending),
      ...extractArray<Order>(processing),
    ];
    return new Set(all.map(o => o.tableId).filter(Boolean));
  },

  /** Tạo đơn hàng mới */
  createOrder: async (dto: CreateOrderDto): Promise<Order> => {
    const { data } = await api.post<Order>('/orders', dto);
    return data;
  },

  /** Lấy chi tiết order */
  getOrder: async (orderId: number): Promise<Order> => {
    const { data } = await api.get<Order>(`/orders/${orderId}`);
    return data;
  },

  /**
   * Cập nhật danh sách món.
   * FIX: thêm version vào body để tránh lỗi 409 Optimistic Lock.
   * BE kiểm tra: if (dto.version != null && dto.version !== order.version) → ConflictException
   * Luôn truyền version từ order hiện tại để BE chấp nhận.
   */
  updateOrderItems: async (
    orderId: number,
    items: { productId: number; quantity: number; note?: string }[],
    version: number,
  ): Promise<Order> => {
    const { data } = await api.patch<Order>(`/orders/${orderId}/items`, {
      items,
      version,     // FIX: bắt buộc phải có
    });
    return data;
  },

  /** Gửi xuống bar/bếp — chuyển status NEW → SENT */
  sendToBar: async (orderId: number): Promise<Order> => {
    const { data } = await api.post<Order>(`/orders/${orderId}/send-to-bar`);
    return data;
  },

  /**
   * Thanh toán.
   * method: 'cash'        → trả về { payment, order }
   * method: 'payos_qr'    → trả về { payment: { qrCode, checkoutUrl, ... }, order }
   * method: 'bank_transfer' → trả về { payment, order }
   */
  pay: async (orderId: number, dto: CreatePaymentDto): Promise<any> => {
    const { data } = await api.post(`/orders/${orderId}/payment`, dto);
    return data;
  },

  /**
   * Polling trạng thái thanh toán QR.
   * Gọi mỗi 3s cho đến khi paymentStatus = 'paid' | 'failed' | 'cancelled'.
   */
  getPaymentStatus: async (orderId: number): Promise<PaymentStatusResult> => {
    const { data } = await api.get<PaymentStatusResult>(`/orders/${orderId}/payment-status`);
    return data;
  },

  /** Hủy payment link QR đang pending */
  cancelPayment: async (orderId: number): Promise<CancelPaymentResult> => {
    const { data } = await api.post<CancelPaymentResult>(`/orders/${orderId}/cancel-payment`);
    return data;
  },

  /** Hủy order */
  cancelOrder: async (orderId: number): Promise<Order> => {
    const { data } = await api.patch<Order>(`/orders/${orderId}/cancel`);
    return data;
  },
};
