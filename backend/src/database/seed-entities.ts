import { UserSession } from "../auth/entities/user-session.entity"
import { StockCheck } from "../inventory/entities/stock-check.entity"
import { StockCheckItem } from "../inventory/entities/stock-check-item.entity"
import { Order } from "../orders/entities/order.entity"
import { OrderItem } from "../orders/entities/order-item.entity"
import { Payment } from "../orders/entities/payment.entity"
import { Permission } from "../permissions/entities/permission.entity"
import { RolePermission } from "../permissions/entities/role-permission.entity"
import { Category } from "../products/entities/category.entity"
import { Product } from "../products/entities/product.entity"
import { Shift } from "../shifts/entities/shift.entity"
import { ShiftAssignment } from "../shifts/entities/shift-assignment.entity"
import { CafeTable } from "../tables/entities/cafe-table.entity"
import { Zone } from "../tables/entities/zone.entity"
import { User } from "../users/entities/user.entity"

export const SEED_ENTITIES = [
  User,
  UserSession,
  Permission,
  RolePermission,
  Category,
  Product,
  Shift,
  ShiftAssignment,
  Order,
  OrderItem,
  Payment,
  Zone,
  CafeTable,
  StockCheck,
  StockCheckItem,
]
