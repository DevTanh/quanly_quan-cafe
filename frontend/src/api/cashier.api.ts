// src/api/cashier.api.ts
// ── Dùng axios instance chung (có interceptor refresh-token + withCredentials) ──
// Không dùng fetch() + localStorage.getItem('token') vì app dùng HttpOnly cookie

import api from './api';
import { extractArray } from '../utils/extractArray';
import type { Zone, MenuItem } from '../types/cashier.types';
import type { CreateOrderDto, Order, CreatePaymentDto } from '../types';

export const cashierApi = {
  /**
   * Lấy danh sách khu vực + bàn từ tables.json (mock).
   * TODO: Khi BE tạo API /zones?include=tables thì uncomment phần real.
   */
  getTables: async (): Promise<Zone[]> => {
    // -- REAL (uncomment khi BE sẵn sàng) --
    // const { data } = await api.get('/zones', { params: { include: 'tables' } });
    // return extractArray<Zone>(data);

    // -- MOCK: import tĩnh --
    const { default: tablesData } = await import('../tables.json');
    return new Promise(resolve => setTimeout(() => resolve(tablesData as Zone[]), 250));
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
    return raw.map(p => ({
      id: String(p.id),
      name: p.name,
      price: Number(p.sellingPrice),
      category: p.category?.name ?? '',
    }));
  },

  /**
   * Lấy order đang pending/processing của một bàn.
   * Dùng để hiển thị trạng thái "Đang có khách" và tải lại order cũ.
   */
  getTableOrder: async (tableId: number): Promise<Order | null> => {
    const { data } = await api.get<Order[]>('/orders', {
      params: { tableId, status: 'pending' },
    });
    const list = extractArray<Order>(data);
    // Ưu tiên pending trước, sau đó processing
    const pending = list.find(o => o.status === 'pending');
    if (pending) return pending;
    const { data: procData } = await api.get<Order[]>('/orders', {
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
      api.get<Order[]>('/orders', { params: { status: 'pending', limit: 200 } }),
      api.get<Order[]>('/orders', { params: { status: 'processing', limit: 200 } }),
    ]);
    const all = [
      ...extractArray<Order>(pending),
      ...extractArray<Order>(processing),
    ];
    return new Set(all.map(o => o.tableId).filter(Boolean));
  },

  /**
   * Tạo đơn hàng mới — gọi POST /orders theo spec BE.
   */
  createOrder: async (dto: CreateOrderDto): Promise<Order> => {
    const { data } = await api.post<Order>('/orders', dto);
    return data;
  },

  /**
   * Thêm/cập nhật món trong đơn đang pending.
   * version dùng để tránh race condition (optimistic locking).
   */
  updateOrderItems: async (
    orderId: number,
    items: { productId: number; quantity: number; note?: string }[],
    version: number,
  ): Promise<Order> => {
    const { data } = await api.patch<Order>(`/orders/${orderId}/items`, {
      version,
      items,
    });
    return data;
  },

  /**
   * Gửi order xuống bar/bếp để pha chế.
   */
  sendToBar: async (orderId: number): Promise<Order> => {
    const { data } = await api.post<Order>(`/orders/${orderId}/send-to-bar`);
    return data;
  },

  /**
   * Thanh toán order.
   * method: 'cash' | 'bank_transfer' | 'payos_qr'
   * receivedAmount: chỉ cần khi method === 'cash'
   */
  pay: async (orderId: number, dto: CreatePaymentDto): Promise<Order> => {
    const { data } = await api.post<Order>(`/orders/${orderId}/payment`, dto);
    return data;
  },

  /**
   * Hủy QR PayOS đang chờ thanh toán.
   */
  cancelPayment: async (orderId: number): Promise<void> => {
    await api.post(`/orders/${orderId}/cancel-payment`);
  },

  /**
   * Polling trạng thái thanh toán QR.
   */
  getPaymentStatus: async (orderId: number) => {
    const { data } = await api.get(`/orders/${orderId}/payment-status`);
    return data;
  },
};
