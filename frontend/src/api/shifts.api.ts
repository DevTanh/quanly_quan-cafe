// src/api/shifts.api.ts
// Khớp với SHIFT.md — /api/v1/shifts và /api/v1/shift-assignments

import api from './api';
import type {
  Shift,
  ShiftAssignment,
  AssignmentStatus,
  BulkAssignDto,
  BulkAssignResult,
} from '../types';

export const shiftsApi = {
  // ── Shifts (Ca mẫu) ──────────────────────────────────────

  /** GET /shifts — danh sách ca active (shift:view_own) */
  findAll: async (): Promise<Shift[]> => {
    const { data } = await api.get<Shift[]>('/shifts');
    return data;
  },

  /** GET /shifts/all — tất cả ca kể cả inactive (shift:manage) */
  findAllIncludeInactive: async (): Promise<Shift[]> => {
    const { data } = await api.get<Shift[]>('/shifts/all');
    return data;
  },

  /** GET /shifts/:id (shift:view_own) */
  findById: async (id: number): Promise<Shift> => {
    const { data } = await api.get<Shift>(`/shifts/${id}`);
    return data;
  },

  /** POST /shifts (shift:manage) */
  create: async (body: {
    name: string;
    startTime: string;    // HH:mm
    endTime: string;      // HH:mm
    maxStaff?: number;    // default 3
    description?: string;
  }): Promise<Shift> => {
    const { data } = await api.post<Shift>('/shifts', body);
    return data;
  },

  /**
   * PATCH /shifts/:id (shift:manage)
   * LƯU Ý: Không được sửa giờ nếu có assignment tương lai.
   * BE sẽ trả 400 nếu vi phạm.
   */
  update: async (id: number, body: Partial<Pick<Shift, 'name' | 'startTime' | 'endTime' | 'maxStaff' | 'description' | 'isActive'>>): Promise<Shift> => {
    const { data } = await api.patch<Shift>(`/shifts/${id}`, body);
    return data;
  },

  /**
   * DELETE /shifts/:id (shift:manage)
   * BE trả 400 nếu còn assignment tương lai.
   */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/shifts/${id}`);
  },

  // ── Shift Assignments (Phân ca) ───────────────────────────

  /** GET /shift-assignments (shift:view_all) */
  getAssignments: async (params?: {
    userId?: number;
    shiftId?: number;
    workDate?: string;    // YYYY-MM-DD
    from?: string;        // YYYY-MM-DD
    to?: string;          // YYYY-MM-DD
  }): Promise<ShiftAssignment[]> => {
    const { data } = await api.get<ShiftAssignment[]>('/shift-assignments', { params });
    return data;
  },

  /** GET /shift-assignments/my — lịch cá nhân (shift:view_own) */
  getMyAssignments: async (params?: {
    from?: string;
    to?: string;
  }): Promise<ShiftAssignment[]> => {
    const { data } = await api.get<ShiftAssignment[]>('/shift-assignments/my', { params });
    return data;
  },

  /** GET /shift-assignments/week — lịch tuần Mon–Sun (shift:view_all) */
  getWeekSchedule: async (weekStart?: string): Promise<ShiftAssignment[]> => {
    const { data } = await api.get<ShiftAssignment[]>('/shift-assignments/week', {
      params: weekStart ? { weekStart } : undefined,
    });
    return data;
  },

  /** GET /shift-assignments/:id (shift:view_all) */
  findAssignmentById: async (id: number): Promise<ShiftAssignment> => {
    const { data } = await api.get<ShiftAssignment>(`/shift-assignments/${id}`);
    return data;
  },

  /** POST /shift-assignments — phân ca đơn lẻ (shift:manage) */
  assign: async (body: {
    userId: number;
    shiftId: number;
    workDate: string;   // YYYY-MM-DD — phải >= today
    note?: string;
  }): Promise<ShiftAssignment> => {
    const { data } = await api.post<ShiftAssignment>('/shift-assignments', body);
    return data;
  },

  /**
   * POST /shift-assignments/bulk — phân ca hàng loạt (shift:manage)
   * Cross-product userIds × workDates × shiftId.
   * Partial success: BE trả { created, errors, warnings }
   */
  bulkAssign: async (dto: BulkAssignDto): Promise<BulkAssignResult> => {
    const { data } = await api.post<BulkAssignResult>('/shift-assignments/bulk', dto);
    return data;
  },

  /**
   * PATCH /shift-assignments/:id (shift:manage)
   * Đổi status → 'absent': chỉ hợp lệ với workDate <= today.
   * BE trả 400 nếu workDate là ngày tương lai.
   */
  updateAssignment: async (
    id: number,
    body: { status?: AssignmentStatus; note?: string },
  ): Promise<ShiftAssignment> => {
    const { data } = await api.patch<ShiftAssignment>(`/shift-assignments/${id}`, body);
    return data;
  },

  markAbsent: async (id: number, note?: string): Promise<ShiftAssignment> => {
    return shiftsApi.updateAssignment(id, { status: 'absent', note });
  },

  /** DELETE /shift-assignments/:id (shift:manage) */
  removeAssignment: async (id: number): Promise<void> => {
    await api.delete(`/shift-assignments/${id}`);
  },
};
