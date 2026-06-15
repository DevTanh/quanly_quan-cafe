// src/api/customers.api.ts
import api from './api';
import type { Customer, CreateCustomerDto, UpdatePointsDto } from '../types';

export interface PaginatedCustomers {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryCustomerDto {
  search?: string;   // tìm theo name hoặc phone
  phone?: string;    // tìm chính xác theo phone
  tier?: string;
  page?: number;
  limit?: number;
}

export const customersApi = {
  /** GET /customers — danh sách có phân trang + tìm kiếm */
  findAll: async (query?: QueryCustomerDto): Promise<PaginatedCustomers> => {
    const { data } = await api.get<PaginatedCustomers>('/customers', { params: query });
    if (Array.isArray(data)) {
      return { data: data as unknown as Customer[], total: (data as any).length, page: 1, limit: 50, totalPages: 1 };
    }
    return data;
  },

  /** GET /customers?phone=xxx — tìm nhanh theo SĐT (trả 1 kết quả) */
  findByPhone: async (phone: string): Promise<Customer | null> => {
    const { data } = await api.get<PaginatedCustomers>('/customers', {
      params: { phone: phone.trim(), limit: 5 },
    });
    const list: Customer[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
    return list[0] ?? null;
  },

  /** GET /customers?search=xxx — tìm theo tên hoặc SĐT (debounced) */
  search: async (keyword: string): Promise<Customer[]> => {
    if (!keyword.trim()) return [];
    const { data } = await api.get<PaginatedCustomers>('/customers', {
      params: { search: keyword.trim(), limit: 8 },
    });
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  },

  /** GET /customers/:id */
  findById: async (id: number): Promise<Customer> => {
    const { data } = await api.get<Customer>(`/customers/${id}`);
    return data;
  },

  /** POST /customers — tạo khách hàng mới nhanh từ POS */
  create: async (dto: CreateCustomerDto): Promise<Customer> => {
    const { data } = await api.post<Customer>('/customers', dto);
    return data;
  },

  /** PATCH /customers/:id/points — tích / dùng điểm */
  updatePoints: async (id: number, dto: UpdatePointsDto): Promise<Customer> => {
    const { data } = await api.patch<Customer>(`/customers/${id}/points`, dto);
    return data;
  },

  /** PATCH /customers/:id */
  update: async (id: number, dto: Partial<CreateCustomerDto>): Promise<Customer> => {
    const { data } = await api.patch<Customer>(`/customers/${id}`, dto);
    return data;
  },
};