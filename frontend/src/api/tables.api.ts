// src/api/tables.api.ts
import api from './api';
import type { Order, CreateOrderDto } from '../types';

export interface TableItem {
  id: string;
  name: string;
  seats: number;
  note: string;
  status: 'active' | 'inactive';
  zoneId?: string;
}

export interface Zone {
  id: string;
  name: string;
  note: string;
  status: 'active' | 'inactive';
  tables: TableItem[];
}

export interface CreateZoneDto {
  name: string;
  note?: string;
}

export interface UpdateZoneDto {
  name?: string;
  note?: string;
  status?: 'active' | 'inactive';
}

export interface CreateTableDto {
  zoneId: number;
  name: string;
  seats: number;
  note?: string;
}

export interface UpdateTableDto {
  name?: string;
  seats?: number;
  note?: string;
  status?: 'active' | 'inactive';
  zoneId?: number;
}

export const tablesApi = {
  /** GET /zones?include=tables — khu vực kèm danh sách bàn */
  getZonesWithTables: async (): Promise<Zone[]> => {
    const { data } = await api.get<Zone[]>('/zones', { params: { include: 'tables' } });
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  },

  /** GET /zones — danh sách khu vực (không kèm bàn) */
  getZones: async (): Promise<Zone[]> => {
    const { data } = await api.get<Zone[]>('/zones');
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  },

  /** GET /tables — danh sách tất cả bàn */
  getTables: async (): Promise<TableItem[]> => {
    const { data } = await api.get<TableItem[]>('/tables');
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  },

  /** POST /zones */
  createZone: async (dto: CreateZoneDto): Promise<Zone> => {
    const { data } = await api.post<Zone>('/zones', dto);
    return data;
  },

  /** PATCH /zones/:id */
  updateZone: async (id: string, dto: UpdateZoneDto): Promise<Zone> => {
    const { data } = await api.patch<Zone>(`/zones/${id}`, dto);
    return data;
  },

  /** DELETE /zones/:id */
  deleteZone: async (id: string): Promise<void> => {
    await api.delete(`/zones/${id}`);
  },

  /** POST /tables */
  createTable: async (dto: CreateTableDto): Promise<TableItem> => {
    const { data } = await api.post<TableItem>('/tables', dto);
    return data;
  },

  /** POST /tables bulk — tạo nhiều bàn cùng lúc */
  createTablesBulk: async (
    zoneId: number,
    prefix: string,
    startIndex: number,
    count: number,
    seats: number,
  ): Promise<TableItem[]> => {
    const results: TableItem[] = [];
    for (let i = 0; i < count; i++) {
      const item = await tablesApi.createTable({
        zoneId,
        name: `${prefix} ${startIndex + i}`,
        seats,
      });
      results.push(item);
    }
    return results;
  },

  /** PATCH /tables/:id */
  updateTable: async (id: string, dto: UpdateTableDto): Promise<TableItem> => {
    const { data } = await api.patch<TableItem>(`/tables/${id}`, dto);
    return data;
  },

  /** PATCH /tables/:id/status */
  updateTableStatus: async (id: string, status: 'active' | 'inactive'): Promise<TableItem> => {
    const { data } = await api.patch<TableItem>(`/tables/${id}/status`, { status });
    return data;
  },

  /** DELETE /tables/:id */
  deleteTable: async (id: string): Promise<void> => {
    await api.delete(`/tables/${id}`);
  },

  /** Lấy tất cả orders đang active để biết bàn nào có khách */
  getActiveOrders: async (): Promise<Order[]> => {
    const [{ data: pending }, { data: processing }] = await Promise.all([
      api.get<any>('/orders', { params: { status: 'pending', limit: 200 } }),
      api.get<any>('/orders', { params: { status: 'processing', limit: 200 } }),
    ]);
    const pendingArr = Array.isArray(pending) ? pending : pending?.data ?? [];
    const processingArr = Array.isArray(processing) ? processing : processing?.data ?? [];
    return [...pendingArr, ...processingArr];
  },

  /** Lấy order đang active của 1 bàn cụ thể */
  getOrderByTableId: async (tableId: number): Promise<Order | null> => {
    const { data } = await api.get<any>('/orders', { params: { tableId } });
    const list: Order[] = Array.isArray(data) ? data : data?.data ?? [];
    return list.find(o => ['pending', 'processing'].includes(o.status)) ?? null;
  },

  /** Tạo order mới (mở bàn) */
  openTable: async (dto: CreateOrderDto): Promise<Order> => {
    const { data } = await api.post<Order>('/orders', dto);
    return data;
  },
};
