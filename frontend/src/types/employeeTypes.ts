// src/types/employeeTypes.ts
// Types dùng cho component Employees, ánh xạ trực tiếp từ UserRecord (BE /users).
// Không có departmentId/positionId/gender/birthDate/address/avatar — BE chưa có.

import type { UserRole } from '../types'
import type { UserRecord, CreateUserPayload, UpdateUserPayload } from '../api/users.api'

// Re-export để EmployeeList không phải import từ 2 nơi
export type { UserRecord }

/**
 * Employee = UserRecord (alias rõ nghĩa cho component layer).
 * Khi BE bổ sung thêm field thì chỉ cần sửa UserRecord trong users.api.ts.
 */
export type Employee = UserRecord

/**
 * Form tạo nhân viên mới — khớp với CreateUserPayload.
 */
export type EmployeeCreateForm = CreateUserPayload

/**
 * Form cập nhật nhân viên — khớp với UpdateUserPayload.
 */
export type EmployeeUpdateForm = UpdateUserPayload

/** Giá trị khởi tạo cho form tạo mới */
export const INIT_CREATE_FORM: EmployeeCreateForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'staff',
  isActive: true,
}

/** Giá trị khởi tạo cho form chỉnh sửa (điền từ record hiện tại) */
export const toUpdateForm = (emp: Employee): EmployeeUpdateForm => ({
  fullName: emp.fullName,
  email: emp.email,
  phone: emp.phone ?? '',
  role: emp.role,
  isActive: emp.isActive,
})

// ─── Helpers hiển thị ────────────────────────────────────────────────────────

/** 2 chữ cái đầu tên (dùng cho avatar) */
export const initials = (name: string): string =>
  name.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()

/** Màu avatar theo id */
export const avatarColor = (id: number): string => {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16']
  return colors[id % colors.length]
}

/** Nhãn hiển thị cho role */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Chủ quán',
  manager: 'Quản lý',
  cashier: 'Thu ngân',
  staff: 'Nhân viên phục vụ',
  barista: 'Pha chế',
}

/** Màu badge cho role */
export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: '#fef3c7', text: '#92400e' },
  manager: { bg: '#ede9fe', text: '#5b21b6' },
  cashier: { bg: '#dcfce7', text: '#166534' },
  staff: { bg: '#dbeafe', text: '#1e40af' },
  barista: { bg: '#fce7f3', text: '#9d174d' },
}
