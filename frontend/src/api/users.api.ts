// src/api/users.api.ts
// Kết nối với /api/v1/users — dùng axios instance chung (withCredentials, interceptor refresh token)

import api from './api'
import type { UserRole } from '../types'

// ─── Types khớp với BE SafeUser response ─────────────────────────────────────

export interface UserRecord {
  id: number
  fullName: string
  email: string
  phone?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserPayload {
  fullName: string
  email: string
  phone?: string
  password: string
  role: UserRole
  isActive?: boolean  // mặc định false ở BE
}

export interface UpdateUserPayload {
  fullName?: string
  email?: string
  phone?: string
  role?: UserRole
  isActive?: boolean
  password?: string   // chỉ gửi khi muốn đổi mật khẩu
}

export interface QueryUserParams {
  search?: string
  role?: UserRole
  isActive?: boolean
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  /**
   * GET /users?search=&role=&isActive=
   * Lấy danh sách nhân viên (Admin, Manager).
   */
  findAll: async (params?: QueryUserParams): Promise<UserRecord[]> => {
    const { data } = await api.get<UserRecord[]>('/users', { params })
    return Array.isArray(data) ? data : []
  },

  /**
   * GET /users/:id
   * Chi tiết nhân viên (Admin, Manager).
   */
  findById: async (id: number): Promise<UserRecord> => {
    const { data } = await api.get<UserRecord>(`/users/${id}`)
    return data
  },

  /**
   * POST /users
   * Tạo tài khoản nhân viên mới (Admin).
   * isActive mặc định false — Admin cần bật thủ công sau.
   */
  create: async (payload: CreateUserPayload): Promise<UserRecord> => {
    const { data } = await api.post<UserRecord>('/users', payload)
    return data
  },

  /**
   * PATCH /users/:id
   * Cập nhật thông tin (Admin).
   * Chỉ gửi các field cần đổi.
   */
  update: async (id: number, payload: UpdateUserPayload): Promise<UserRecord> => {
    const { data } = await api.patch<UserRecord>(`/users/${id}`, payload)
    return data
  },

  /**
   * PATCH /users/:id/disable
   * Khóa tài khoản (isActive = false). Tài khoản bị khóa không thể đăng nhập.
   * Để thu hồi token ngay lập tức, gọi thêm POST /auth/force-logout/:id
   */
  disable: async (id: number): Promise<UserRecord> => {
    const { data } = await api.patch<UserRecord>(`/users/${id}/disable`)
    return data
  },

  /**
   * PATCH /users/:id/enable
   * Mở lại tài khoản (isActive = true).
   */
  enable: async (id: number): Promise<UserRecord> => {
    const { data } = await api.patch<UserRecord>(`/users/${id}/enable`)
    return data
  },

  /**
   * Toggle isActive: tự động chọn enable/disable dựa trên trạng thái hiện tại.
   */
  toggleActive: async (user: UserRecord): Promise<UserRecord> => {
    return user.isActive
      ? usersApi.disable(user.id)
      : usersApi.enable(user.id)
  },
}
