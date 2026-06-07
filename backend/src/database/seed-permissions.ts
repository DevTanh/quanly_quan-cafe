import { DataSource, In } from "typeorm"
import { Permission, PermissionModule } from "../permissions/entities/permission.entity"
import { RolePermission } from "../permissions/entities/role-permission.entity"
import { User, UserRole } from "../users/entities/user.entity"

/**
 * Seed permissions & role_permissions từ tài liệu RBAC.
 *
 * Chạy:  npm run seed:permissions
 */

// ─── DANH SÁCH PERMISSIONS ──────────────────────────────────────────────────

const PERMISSIONS: { name: string; description: string; module: PermissionModule }[] = [
  // MODULE: AUTH
  { name: "auth:login", description: "Đăng nhập hệ thống", module: PermissionModule.AUTH },
  { name: "auth:logout", description: "Đăng xuất thiết bị hiện tại", module: PermissionModule.AUTH },
  { name: "auth:logout_all", description: "Đăng xuất tất cả thiết bị", module: PermissionModule.AUTH },
  { name: "auth:view_devices", description: "Xem danh sách thiết bị đang đăng nhập", module: PermissionModule.AUTH },
  { name: "auth:revoke_device", description: "Thu hồi thiết bị cụ thể", module: PermissionModule.AUTH },
  { name: "auth:change_password", description: "Đổi mật khẩu", module: PermissionModule.AUTH },

  // MODULE: USER
  { name: "user:view_list", description: "Xem danh sách nhân viên", module: PermissionModule.USER },
  { name: "user:view_detail", description: "Xem chi tiết nhân viên", module: PermissionModule.USER },
  { name: "user:create", description: "Tạo tài khoản nhân viên", module: PermissionModule.USER },
  { name: "user:update", description: "Cập nhật thông tin nhân viên", module: PermissionModule.USER },
  { name: "user:disable", description: "Khóa/mở tài khoản", module: PermissionModule.USER },
  { name: "user:revoke_token", description: "Thu hồi token nhân viên khẩn cấp", module: PermissionModule.USER },
  { name: "user:view_auth_logs", description: "Xem audit log đăng nhập", module: PermissionModule.USER },

  // MODULE: ORDER
  { name: "order:create", description: "Tạo đơn hàng mới", module: PermissionModule.ORDER },
  { name: "order:view_own", description: "Xem đơn hàng của mình", module: PermissionModule.ORDER },
  { name: "order:view_all", description: "Xem tất cả đơn hàng", module: PermissionModule.ORDER },
  { name: "order:update_items", description: "Thêm/sửa món trong đơn chưa gửi", module: PermissionModule.ORDER },
  { name: "order:send_to_bar", description: "Gửi đơn xuống pha chế", module: PermissionModule.ORDER },
  { name: "order:cancel_pending", description: "Hủy đơn chưa pha chế", module: PermissionModule.ORDER },
  { name: "order:cancel_processing", description: "Hủy đơn đang pha chế (cần duyệt)", module: PermissionModule.ORDER },
  { name: "order:view_queue", description: "Xem hàng đợi pha chế (barista)", module: PermissionModule.ORDER },
  { name: "order:update_item_status", description: "Cập nhật trạng thái từng món", module: PermissionModule.ORDER },

  // MODULE: PAYMENT
  { name: "payment:process", description: "Xử lý thanh toán đơn hàng", module: PermissionModule.PAYMENT },
  { name: "payment:view_own", description: "Xem giao dịch của mình", module: PermissionModule.PAYMENT },
  { name: "payment:view_all", description: "Xem tất cả giao dịch", module: PermissionModule.PAYMENT },
  { name: "payment:refund", description: "Thực hiện hoàn tiền", module: PermissionModule.PAYMENT },
  { name: "payment:approve_refund", description: "Duyệt yêu cầu hoàn tiền", module: PermissionModule.PAYMENT },

  // MODULE: MENU
  { name: "menu:view", description: "Xem thực đơn (giá)", module: PermissionModule.MENU },
  { name: "menu:view_barista", description: "Xem thực đơn không có giá", module: PermissionModule.MENU },
  { name: "menu:create", description: "Thêm món mới", module: PermissionModule.MENU },
  { name: "menu:update", description: "Cập nhật món", module: PermissionModule.MENU },
  { name: "menu:toggle_available", description: "Bật/tắt trạng thái còn món", module: PermissionModule.MENU },
  { name: "menu:delete", description: "Xóa món khỏi menu", module: PermissionModule.MENU },

  // MODULE: TABLE
  { name: "table:view", description: "Xem sơ đồ bàn", module: PermissionModule.TABLE },
  { name: "table:update_status", description: "Cập nhật trạng thái bàn", module: PermissionModule.TABLE },
  { name: "table:manage", description: "Thêm/sửa/xóa bàn", module: PermissionModule.TABLE },

  // MODULE: INVENTORY
  { name: "inventory:view_bar", description: "Xem tồn kho nguyên liệu bar", module: PermissionModule.INVENTORY },
  { name: "inventory:view_all", description: "Xem toàn bộ kho (có giá vốn)", module: PermissionModule.INVENTORY },
  { name: "inventory:report_low", description: "Báo nguyên liệu sắp hết", module: PermissionModule.INVENTORY },
  { name: "inventory:update", description: "Cập nhật số lượng tồn kho", module: PermissionModule.INVENTORY },
  { name: "inventory:import", description: "Nhập kho", module: PermissionModule.INVENTORY },

  // MODULE: CUSTOMER
  { name: "customer:view", description: "Tra cứu khách hàng thành viên", module: PermissionModule.CUSTOMER },
  { name: "customer:create", description: "Đăng ký thành viên mới", module: PermissionModule.CUSTOMER },
  { name: "customer:update_points", description: "Cộng/trừ điểm thành viên", module: PermissionModule.CUSTOMER },
  { name: "customer:manage", description: "Quản lý đầy đủ khách hàng", module: PermissionModule.CUSTOMER },

  // MODULE: SHIFT
  { name: "shift:view_own", description: "Xem ca làm việc của mình", module: PermissionModule.SHIFT },
  { name: "shift:view_all", description: "Xem tất cả ca làm việc", module: PermissionModule.SHIFT },
  { name: "shift:manage", description: "Tạo/phân ca làm việc", module: PermissionModule.SHIFT },
  { name: "shift:close", description: "Đóng ca, tổng hợp doanh thu", module: PermissionModule.SHIFT },

  // MODULE: REPORT
  { name: "report:view_shift", description: "Xem báo cáo ca", module: PermissionModule.REPORT },
  { name: "report:view_daily", description: "Xem báo cáo ngày", module: PermissionModule.REPORT },
  { name: "report:view_full", description: "Xem báo cáo đầy đủ (tháng/năm)", module: PermissionModule.REPORT },
  { name: "report:export", description: "Xuất báo cáo Excel/PDF", module: PermissionModule.REPORT },
  { name: "report:view_cost", description: "Xem giá vốn và lợi nhuận", module: PermissionModule.REPORT },

  // MODULE: SYSTEM
  { name: "system:config", description: "Cấu hình hệ thống", module: PermissionModule.SYSTEM },
  { name: "system:view_logs", description: "Xem system logs", module: PermissionModule.SYSTEM },

  // MODULE: PRODUCT
  { name: "product:view", description: "Xem danh sách và chi tiết hàng hóa", module: PermissionModule.PRODUCT },
  { name: "product:manage", description: "Thêm/sửa/xóa hàng hóa và danh mục", module: PermissionModule.PRODUCT },
]

const DEMO_PERMISSION_TARGET = 100
const demoPermissionCount = Math.max(0, DEMO_PERMISSION_TARGET - PERMISSIONS.length)

for (let index = 1; index <= demoPermissionCount; index++) {
  PERMISSIONS.push({
    name: `system:demo_permission_${String(index).padStart(3, "0")}`,
    description: `Demo permission ${String(index).padStart(3, "0")}`,
    module: PermissionModule.SYSTEM,
  })
}

// ─── MAPPING ROLE → PERMISSION NAMES ────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ═══ ADMIN: Toàn quyền ═══
  [UserRole.ADMIN]: PERMISSIONS.map((p) => p.name),

  // ═══ MANAGER: Điều hành, không cấu hình hệ thống ═══
  [UserRole.MANAGER]: [
    "auth:login", "auth:logout", "auth:logout_all",
    "auth:view_devices", "auth:revoke_device", "auth:change_password",
    "user:view_list", "user:view_detail",
    "order:create", "order:view_own", "order:view_all",
    "order:update_items", "order:send_to_bar",
    "order:cancel_pending", "order:cancel_processing",
    "order:view_queue", "order:update_item_status",
    "payment:process", "payment:view_own", "payment:view_all",
    "payment:refund", "payment:approve_refund",
    "menu:view", "menu:create", "menu:update", "menu:toggle_available",
    "table:view", "table:update_status", "table:manage",
    "inventory:view_all", "inventory:report_low",
    "inventory:update", "inventory:import",
    "customer:view", "customer:create",
    "customer:update_points", "customer:manage",
    "shift:view_own", "shift:view_all", "shift:manage", "shift:close",
    "product:view", "product:manage",
    "report:view_shift", "report:view_daily",
    "report:view_full", "report:export", "report:view_cost",
  ],

  // ═══ CASHIER: Thanh toán + Tạo đơn ═══
  [UserRole.CASHIER]: [
    "auth:login", "auth:logout", "auth:logout_all",
    "auth:view_devices", "auth:revoke_device", "auth:change_password",
    "order:create", "order:view_own", "order:view_all",
    "order:update_items", "order:send_to_bar", "order:cancel_pending",
    "payment:process", "payment:view_own", "payment:refund",
    "menu:view",
    "table:view", "table:update_status",
    "customer:view", "customer:create", "customer:update_points",
    "product:view",
    "shift:view_own",
  ],

  // ═══ STAFF: Phục vụ bàn, tạo order, KHÔNG đụng tiền ═══
  [UserRole.STAFF]: [
    "auth:login", "auth:logout", "auth:logout_all",
    "auth:view_devices", "auth:revoke_device", "auth:change_password",
    "order:create", "order:view_own",
    "order:update_items", "order:send_to_bar",
    "menu:view",
    "table:view", "table:update_status",
    "customer:view",
    "product:view",
    "shift:view_own",
  ],

  // ═══ BARISTA: Pha chế, chỉ thấy những gì cần ═══
  [UserRole.BARISTA]: [
    "auth:login", "auth:logout", "auth:logout_all",
    "auth:view_devices", "auth:revoke_device", "auth:change_password",
    "order:view_queue", "order:update_item_status",
    "menu:view_barista",
    "inventory:view_bar", "inventory:report_low",
    "product:view",
    "shift:view_own",
  ],
}

async function ensurePermissionModuleEnum(dataSource: DataSource): Promise<void> {
  const enumValues = Object.values(PermissionModule)
    .map((value) => `'${value}'`)
    .join(", ")

  await dataSource.query(
    `ALTER TABLE permissions MODIFY COLUMN module ENUM(${enumValues}) NOT NULL`,
  )
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function seedPermissions() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config()

  const dataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "quanly_quan_cafe",
    entities: [Permission, RolePermission, User],
    synchronize: false,
  })

  await dataSource.initialize()
  await ensurePermissionModuleEnum(dataSource)
  console.log("✓ Database connected")

  const permRepo = dataSource.getRepository(Permission)
  const rpRepo = dataSource.getRepository(RolePermission)

  // ── 1. Upsert permissions ───────────────────────────────────────────────
  let created = 0
  let skipped = 0

  for (const perm of PERMISSIONS) {
    const existing = await permRepo.findOne({ where: { name: perm.name } })
    if (existing) {
      skipped++
      continue
    }
    await permRepo.save(permRepo.create(perm))
    created++
  }
  console.log(`✓ Permissions: ${created} created, ${skipped} already existed`)

  // ── 2. Seed role_permissions ────────────────────────────────────────────
  let mappingsCreated = 0
  let mappingsSkipped = 0

  for (const [role, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    // Lấy tất cả permission entities cần thiết
    const permissions = await permRepo.find({
      where: { name: In(permNames) },
    })

    const permMap = new Map(permissions.map((p) => [p.name, p]))

    for (const name of permNames) {
      const perm = permMap.get(name)
      if (!perm) {
        console.warn(`  ⚠ Permission "${name}" not found, skipping for role "${role}"`)
        continue
      }

      const existing = await rpRepo.findOne({
        where: { role: role as UserRole, permissionId: perm.id },
      })

      if (existing) {
        mappingsSkipped++
        continue
      }

      await rpRepo.save(
        rpRepo.create({ role: role as UserRole, permissionId: perm.id })
      )
      mappingsCreated++
    }
  }

  console.log(
    `✓ Role-permissions: ${mappingsCreated} created, ${mappingsSkipped} already existed`
  )

  await dataSource.destroy()
  console.log("✓ Done")
}

seedPermissions().catch((err) => {
  console.error("✗ Seed failed:", err)
  process.exit(1)
})
