// src/api/customers.api.ts
import api from './api';
import { extractArray } from '../utils/extractArray';

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  points: number;
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  fullName: string;
  phone: string;
  email?: string;
  note?: string;
}

export interface UpdateCustomerDto {
  fullName?: string;
  phone?: string;
  email?: string;
  note?: string;
  isActive?: boolean;
}

export interface PaginatedCustomers {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryCustomerParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const customersApi = {
  /** GET /customers */
  findAll: async (params?: QueryCustomerParams): Promise<PaginatedCustomers> => {
    const { data } = await api.get<PaginatedCustomers>('/customers', { params });
    if (data && typeof data === 'object' && 'data' in data) return data;
    return { data: extractArray<Customer>(data), total: 0, page: 1, limit: 20, totalPages: 1 };
  },

  /** GET /customers/phone/:phone — tra cứu tại POS */
  findByPhone: async (phone: string): Promise<Customer> => {
    const { data } = await api.get<Customer>(`/customers/phone/${phone}`);
    return data;
  },

  /** GET /customers/:id */
  findById: async (id: number): Promise<Customer> => {
    const { data } = await api.get<Customer>(`/customers/${id}`);
    return data;
  },

  /** POST /customers */
  create: async (dto: CreateCustomerDto): Promise<Customer> => {
    const { data } = await api.post<Customer>('/customers', dto);
    return data;
  },

  /** PATCH /customers/:id */
  update: async (id: number, dto: UpdateCustomerDto): Promise<Customer> => {
    const { data } = await api.patch<Customer>(`/customers/${id}`, dto);
    return data;
  },

  /** PATCH /customers/:id/points */
  updatePoints: async (id: number, delta: number, reason?: string): Promise<Customer> => {
    const { data } = await api.patch<Customer>(`/customers/${id}/points`, { delta, reason });
    return data;
  },

  /** PATCH /customers/:id/enable */
  enable: async (id: number): Promise<Customer> => {
    const { data } = await api.patch<Customer>(`/customers/${id}/enable`);
    return data;
  },

  /** PATCH /customers/:id/disable */
  disable: async (id: number): Promise<Customer> => {
    const { data } = await api.patch<Customer>(`/customers/${id}/disable`);
    return data;
  },
};
