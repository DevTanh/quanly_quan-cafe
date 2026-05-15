// src/api/orders.api.ts
// ── File MỚI — không đụng file cũ ──

import api from './api';
import type {
  Order,
  CreateOrderDto,
  UpdateOrderItemsDto,
  CreatePaymentDto,
  QueryOrderDto,
  Payment,
} from '../types';

export const ordersApi = {
  /** GET /orders */
  findAll: async (query?: QueryOrderDto): Promise<Order[]> => {
    const { data } = await api.get<Order[]>('/orders', { params: query });
    return data;
  },

  /** GET /orders/:id */
  findById: async (id: number): Promise<Order> => {
    const { data } = await api.get<Order>(`/orders/${id}`);
    return data;
  },

  /** GET /orders/:id/payment-status */
  getPaymentStatus: async (id: number): Promise<{ paymentStatus: string; payment?: Payment }> => {
    const { data } = await api.get(`/orders/${id}/payment-status`);
    return data;
  },

  /** POST /orders — tạo đơn mới */
  create: async (dto: CreateOrderDto): Promise<Order> => {
    const { data } = await api.post<Order>('/orders', dto);
    return data;
  },

  /** PATCH /orders/:id/items — cập nhật món */
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
  pay: async (id: number, dto: CreatePaymentDto): Promise<Order> => {
    const { data } = await api.post<Order>(`/orders/${id}/payment`, dto);
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
};
