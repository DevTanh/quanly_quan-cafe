// src/rbac/permissions.ts
// Khớp với RBAC.md — permission names đồng bộ với backend seed.
// Đây là FRONTEND guard (ẩn/hiện UI).
// Backend PHẢI enforce lại độc lập — FE guard chỉ là UX, không phải security.

import type { UserRole } from '../types';

const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  admin: [
    // Auth
    'auth:login', 'auth:logout', 'auth:logout_all',
    'auth:view_devices', 'auth:revoke_device', 'auth:change_password',
    // User
    'user:view_list', 'user:view_detail', 'user:create',
    'user:update', 'user:disable', 'user:revoke_token', 'user:view_auth_logs',
    // Order
    'order:create', 'order:view_own', 'order:view_all',
    'order:update_items', 'order:send_to_bar',
    'order:cancel_pending', 'order:cancel_processing',
    'order:view_queue', 'order:update_item_status',
    // Payment
    'payment:process', 'payment:view_own', 'payment:view_all',
    'payment:refund', 'payment:approve_refund',
    // Product / Menu
    'product:view', 'product:manage',
    'menu:view', 'menu:view_barista', 'menu:create', 'menu:update',
    'menu:toggle_available', 'menu:delete',
    // Table
    'table:view', 'table:update_status', 'table:manage',
    // Inventory
    'inventory:view_bar', 'inventory:view_all',
    'inventory:report_low', 'inventory:update', 'inventory:import',
    // Customer
    'customer:view', 'customer:create', 'customer:update_points', 'customer:manage',
    // Shift
    'shift:view_own', 'shift:view_all', 'shift:manage', 'shift:close',
    // Report
    'report:view_shift', 'report:view_daily',
    'report:view_full', 'report:export', 'report:view_cost',
    // System
    'system:config', 'system:view_logs',
  ],

  manager: [
    'auth:login', 'auth:logout', 'auth:logout_all',
    'auth:view_devices', 'auth:revoke_device', 'auth:change_password',
    // User — chỉ xem, KHÔNG tạo/xóa
    'user:view_list', 'user:view_detail',
    // Order
    'order:create', 'order:view_own', 'order:view_all',
    'order:update_items', 'order:send_to_bar',
    'order:cancel_pending', 'order:cancel_processing',
    'order:view_queue', 'order:update_item_status',
    // Payment — được duyệt hoàn tiền
    'payment:process', 'payment:view_own', 'payment:view_all',
    'payment:refund', 'payment:approve_refund',
    // Product / Menu — KHÔNG xóa món
    'product:view', 'product:manage',
    'menu:view', 'menu:create', 'menu:update', 'menu:toggle_available',
    // Table
    'table:view', 'table:update_status', 'table:manage',
    // Inventory
    'inventory:view_all', 'inventory:report_low',
    'inventory:update', 'inventory:import',
    // Customer
    'customer:view', 'customer:create', 'customer:update_points', 'customer:manage',
    // Shift
    'shift:view_own', 'shift:view_all', 'shift:manage', 'shift:close',
    // Report
    'report:view_shift', 'report:view_daily',
    'report:view_full', 'report:export', 'report:view_cost',
    // KHÔNG có: user:create/disable/revoke, menu:delete, system:*
  ],

  cashier: [
    'auth:login', 'auth:logout', 'auth:logout_all',
    'auth:view_devices', 'auth:revoke_device', 'auth:change_password',
    // Order — KHÔNG hủy đơn đang pha
    'order:create', 'order:view_own', 'order:view_all',
    'order:update_items', 'order:send_to_bar', 'order:cancel_pending',
    // Payment — thực hiện hoàn tiền nhưng cần Manager duyệt
    'payment:process', 'payment:view_own', 'payment:refund',
    // Menu — xem giá để tạo đơn
    'product:view', 'menu:view',
    // Table
    'table:view', 'table:update_status',
    // Customer
    'customer:view', 'customer:create', 'customer:update_points',
    // Shift
    'shift:view_own',
    // KHÔNG có: order:cancel_processing, payment:approve_refund
    // KHÔNG có: menu:*, inventory:*, report:*, system:*
  ],

  staff: [
    'auth:login', 'auth:logout', 'auth:logout_all',
    'auth:view_devices', 'auth:revoke_device', 'auth:change_password',
    // Order — chỉ xem của mình, thêm/sửa khi chưa gửi bếp
    'order:create', 'order:view_own',
    'order:update_items', 'order:send_to_bar',
    // Menu
    'product:view', 'menu:view',
    // Table
    'table:view', 'table:update_status',
    // Customer — chỉ tra cứu
    'customer:view',
    // Shift
    'shift:view_own',
    // KHÔNG có: order:cancel_*, order:view_all, payment:*, inventory:*, report:*
  ],

  barista: [
    'auth:login', 'auth:logout', 'auth:logout_all',
    'auth:view_devices', 'auth:revoke_device', 'auth:change_password',
    // Order — chỉ xem hàng đợi pha chế, không thấy giá
    'order:view_queue', 'order:update_item_status',
    // Menu — không có giá
    'menu:view_barista',
    // Inventory — chỉ xem kho bar + báo hết
    'inventory:view_bar', 'inventory:report_low',
    // Shift
    'shift:view_own',
    // KHÔNG có: order:view_all, payment:*, menu:view (có giá)
    // KHÔNG có: customer:*, report:*, system:*
  ],
};

/**
 * Kiểm tra role có permission không.
 * Dùng trong App.tsx: can(user.role, 'product:manage')
 *
 * LƯU Ý: Đây là UI guard. Backend PHẢI enforce độc lập.
 */
export function can(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role as UserRole];
  if (!perms) return false;
  return (perms as string[]).includes(permission);
}

export function getPermissions(role: UserRole): readonly string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
