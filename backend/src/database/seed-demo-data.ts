import { createHash } from "crypto"
import { DataSource } from "typeorm"
import * as bcrypt from "bcrypt"
import { SEED_ENTITIES } from "./seed-entities"
import { UserSession } from "../auth/entities/user-session.entity"
import { StockCheck } from "../inventory/entities/stock-check.entity"
import { StockCheckItem } from "../inventory/entities/stock-check-item.entity"
import { Order, OrderStatus } from "../orders/entities/order.entity"
import { OrderItem, OrderItemStatus } from "../orders/entities/order-item.entity"
import { Payment, PaymentMethod, PaymentStatus } from "../orders/entities/payment.entity"
import { Category } from "../products/entities/category.entity"
import { MenuType, Product, ProductStatus } from "../products/entities/product.entity"
import {
  AssignmentStatus,
  ShiftAssignment,
} from "../shifts/entities/shift-assignment.entity"
import { Shift } from "../shifts/entities/shift.entity"
import { CafeTable } from "../tables/entities/cafe-table.entity"
import { User, UserRole } from "../users/entities/user.entity"

const SEED_TARGET_ROWS = 100
const DEMO_PASSWORD = "12345678"

async function seedDemoData() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config()

  const dataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "quanly_quan_cafe",
    entities: SEED_ENTITIES,
    synchronize: false,
  })

  await dataSource.initialize()
  console.log("Database connected")

  const users = await seedUsers(dataSource)
  await seedUserSessions(dataSource, users)

  const categories = await seedCategories(dataSource)
  const products = await seedProducts(dataSource, categories)

  const shifts = await seedShifts(dataSource)
  await seedShiftAssignments(dataSource, users, shifts)

  const tables = await dataSource.getRepository(CafeTable).find({ order: { id: "ASC" } })
  await seedOrdersAndPayments(dataSource, users, products, tables)
  await seedStockChecks(dataSource, users, products)

  await dataSource.destroy()
  console.log("Done")
}

function padNumber(value: number, length = 3): string {
  return String(value).padStart(length, "0")
}

function formatTime(hour: number): string {
  return `${padNumber(hour, 2)}:00`
}

function formatWorkDate(offset: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)

  const year = date.getFullYear()
  const month = padNumber(date.getMonth() + 1, 2)
  const day = padNumber(date.getDate(), 2)
  return `${year}-${month}-${day}`
}

async function seedUsers(dataSource: DataSource): Promise<User[]> {
  const repo = dataSource.getRepository(User)
  const password = await bcrypt.hash(DEMO_PASSWORD, 10)
  const baseUsers = [
    { fullName: "Manager Demo", email: "manager@gmail.com", role: UserRole.MANAGER },
    { fullName: "Cashier Demo", email: "cashier@gmail.com", role: UserRole.CASHIER },
    { fullName: "Staff Demo", email: "staff@gmail.com", role: UserRole.STAFF },
    { fullName: "Barista Demo", email: "barista@gmail.com", role: UserRole.BARISTA },
  ]

  let created = 0
  for (const user of baseUsers) {
    const existing = await repo.findOne({ where: { email: user.email } })
    if (existing) continue

    await repo.save(
      repo.create({
        ...user,
        password,
        isActive: true,
        tokenVersion: 0,
      }),
    )
    created++
  }

  const roles = [UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF, UserRole.BARISTA]
  let total = await repo.count()
  let index = 1

  while (total < SEED_TARGET_ROWS) {
    const email = `demo.user${padNumber(index)}@gmail.com`
    const existing = await repo.findOne({ where: { email } })
    if (!existing) {
      await repo.save(
        repo.create({
          fullName: `Demo User ${padNumber(index)}`,
          email,
          phone: `090${padNumber(index, 7)}`,
          password,
          role: roles[(index - 1) % roles.length],
          isActive: true,
          tokenVersion: 0,
        }),
      )
      created++
      total++
    }
    index++
  }

  console.log(`Demo users created: ${created}`)
  return await repo.find({ order: { id: "ASC" } })
}

async function seedUserSessions(dataSource: DataSource, users: User[]): Promise<void> {
  if (!users.length) return

  const repo = dataSource.getRepository(UserSession)
  let created = 0
  let total = await repo.count()
  let index = 1

  while (total < SEED_TARGET_ROWS) {
    const user = users[(index - 1) % users.length]
    const deviceId = `demo-device-${padNumber(index)}`
    const refreshTokenHash = createHash("sha256")
      .update(`demo-refresh-token-${index}`)
      .digest("hex")

    const existing = await repo.findOne({ where: { userId: user.id, deviceId } })
    const existingToken = await repo.findOne({ where: { refreshTokenHash } })
    if (!existing && !existingToken) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      await repo.save(
        repo.create({
          userId: user.id,
          refreshTokenHash,
          deviceId,
          deviceName: `Demo Device ${padNumber(index)}`,
          userAgent: "Seed Demo Browser",
          ipAddress: `127.0.0.${(index % 250) + 1}`,
          isRevoked: false,
          expiresAt,
        }),
      )
      created++
      total++
    }
    index++
  }

  console.log(`User sessions created: ${created}`)
}

async function seedCategories(dataSource: DataSource): Promise<Category[]> {
  const repo = dataSource.getRepository(Category)
  const baseNames = ["Coffee", "Tea", "Juice", "Food", "Cake"]
  let created = 0

  for (const name of baseNames) {
    const existing = await repo.findOne({ where: { name } })
    if (existing) continue

    await repo.save(
      repo.create({
        name,
        description: `${name} category`,
        isActive: true,
      }),
    )
    created++
  }

  let total = await repo.count()
  let index = baseNames.length + 1

  while (total < SEED_TARGET_ROWS) {
    const name = `Demo Category ${padNumber(index)}`
    const existing = await repo.findOne({ where: { name } })
    if (!existing) {
      await repo.save(
        repo.create({
          name,
          description: `${name} category`,
          isActive: true,
        }),
      )
      created++
      total++
    }
    index++
  }

  console.log(`Categories created: ${created}`)
  return await repo.find({ order: { id: "ASC" } })
}

async function seedProducts(
  dataSource: DataSource,
  categories: Category[],
): Promise<Product[]> {
  const repo = dataSource.getRepository(Product)
  const baseProducts = [
    {
      code: "SP000001",
      name: "Ca phe sua",
      menuType: MenuType.BEVERAGE,
      categoryName: "Coffee",
      costPrice: 12000,
      sellingPrice: 25000,
      stock: 50,
      minStock: 10,
      maxStock: 200,
    },
    {
      code: "SP000002",
      name: "Bac xiu",
      menuType: MenuType.BEVERAGE,
      categoryName: "Coffee",
      costPrice: 10000,
      sellingPrice: 22000,
      stock: 40,
      minStock: 10,
      maxStock: 200,
    },
    {
      code: "SP000003",
      name: "Tra dao",
      menuType: MenuType.BEVERAGE,
      categoryName: "Tea",
      costPrice: 9000,
      sellingPrice: 28000,
      stock: 30,
      minStock: 8,
      maxStock: 150,
    },
    {
      code: "SP000004",
      name: "Nuoc cam",
      menuType: MenuType.BEVERAGE,
      categoryName: "Juice",
      costPrice: 10000,
      sellingPrice: 30000,
      stock: 20,
      minStock: 5,
      maxStock: 100,
    },
    {
      code: "SP000005",
      name: "Banh mi",
      menuType: MenuType.FOOD,
      categoryName: "Food",
      costPrice: 8000,
      sellingPrice: 18000,
      stock: 25,
      minStock: 5,
      maxStock: 100,
    },
    {
      code: "SP000006",
      name: "Banh ngot",
      menuType: MenuType.FOOD,
      categoryName: "Cake",
      costPrice: 10000,
      sellingPrice: 25000,
      stock: 12,
      minStock: 5,
      maxStock: 80,
    },
  ]

  let created = 0
  for (const product of baseProducts) {
    const existing = await repo.findOne({ where: { code: product.code } })
    if (existing) continue

    const category = categories.find((item) => item.name === product.categoryName)
    if (!category) continue

    await repo.save(
      repo.create({
        code: product.code,
        name: product.name,
        menuType: product.menuType,
        categoryId: category.id,
        status: ProductStatus.ACTIVE,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        minStock: product.minStock,
        maxStock: product.maxStock,
      }),
    )
    created++
  }

  const menuTypes = [MenuType.BEVERAGE, MenuType.FOOD, MenuType.OTHER]
  let total = await repo.count()
  let index = baseProducts.length + 1

  while (total < SEED_TARGET_ROWS) {
    const code = `SP${padNumber(index, 6)}`
    const existing = await repo.findOne({ where: { code } })
    if (!existing) {
      const category = categories[(index - 1) % categories.length]
      const costPrice = 8000 + (index % 20) * 1000
      const sellingPrice = costPrice + 10000 + (index % 5) * 2000

      await repo.save(
        repo.create({
          code,
          name: `Demo Product ${padNumber(index)}`,
          menuType: menuTypes[(index - 1) % menuTypes.length],
          categoryId: category.id,
          status: ProductStatus.ACTIVE,
          costPrice,
          sellingPrice,
          stock: 30 + (index % 70),
          minStock: 5 + (index % 10),
          maxStock: 150 + (index % 100),
        }),
      )
      created++
      total++
    }
    index++
  }

  console.log(`Products created: ${created}`)
  return await repo.find({ order: { id: "ASC" } })
}

async function seedShifts(dataSource: DataSource): Promise<Shift[]> {
  const repo = dataSource.getRepository(Shift)
  const baseShifts = [
    { name: "Ca sang", startTime: "06:00", endTime: "14:00", totalHours: 8 },
    { name: "Ca chieu", startTime: "14:00", endTime: "22:00", totalHours: 8 },
    { name: "Ca dem", startTime: "22:00", endTime: "06:00", totalHours: 8 },
  ]

  let created = 0
  for (const shift of baseShifts) {
    const existing = await repo.findOne({ where: { name: shift.name } })
    if (existing) continue

    await repo.save(
      repo.create({
        ...shift,
        isOvernight: shift.endTime < shift.startTime,
        maxStaff: 5,
        description: `${shift.name} demo`,
        isActive: true,
      }),
    )
    created++
  }

  let total = await repo.count()
  let index = baseShifts.length + 1

  while (total < SEED_TARGET_ROWS) {
    const name = `Demo Shift ${padNumber(index)}`
    const existing = await repo.findOne({ where: { name } })
    if (!existing) {
      const startHour = (6 + index) % 24
      const endHour = (startHour + 8) % 24
      const startTime = formatTime(startHour)
      const endTime = formatTime(endHour)

      await repo.save(
        repo.create({
          name,
          startTime,
          endTime,
          isOvernight: endTime < startTime,
          totalHours: 8,
          maxStaff: 5 + (index % 6),
          description: `${name} demo`,
          isActive: true,
        }),
      )
      created++
      total++
    }
    index++
  }

  console.log(`Shifts created: ${created}`)
  return await repo.find({ order: { id: "ASC" } })
}

async function seedShiftAssignments(
  dataSource: DataSource,
  users: User[],
  shifts: Shift[],
): Promise<void> {
  if (!users.length || !shifts.length) return

  const repo = dataSource.getRepository(ShiftAssignment)
  const assignedBy = users.find((user) => user.role === UserRole.ADMIN)?.id ?? users[0].id
  let created = 0
  let total = await repo.count()
  let index = 1

  while (total < SEED_TARGET_ROWS) {
    const user = users[(index - 1) % users.length]
    const shift = shifts[(index - 1) % shifts.length]
    const workDate = formatWorkDate(index)
    const existing = await repo.findOne({
      where: { userId: user.id, shiftId: shift.id, workDate },
    })

    if (!existing) {
      await repo.save(
        repo.create({
          userId: user.id,
          shiftId: shift.id,
          workDate,
          status: AssignmentStatus.SCHEDULED,
          note: `Demo assignment ${padNumber(index)}`,
          assignedBy,
        }),
      )
      created++
      total++
    }
    index++
  }

  console.log(`Shift assignments created: ${created}`)
}

async function seedOrdersAndPayments(
  dataSource: DataSource,
  users: User[],
  products: Product[],
  tables: CafeTable[],
): Promise<void> {
  if (!users.length || !products.length) return

  const orderRepo = dataSource.getRepository(Order)
  const itemRepo = dataSource.getRepository(OrderItem)
  const paymentRepo = dataSource.getRepository(Payment)
  let created = 0
  let total = await orderRepo.count()
  let index = 1

  while (total < SEED_TARGET_ROWS) {
    const note = `DEMO_ORDER_${padNumber(index)}`
    const existing = await orderRepo.findOne({ where: { note } })
    if (!existing) {
      const product = products[(index - 1) % products.length]
      const amount = Number(product.sellingPrice)
      const order = await orderRepo.save(
        orderRepo.create({
          tableId: tables.length ? tables[(index - 1) % tables.length].id : 0,
          createdBy: users[(index - 1) % users.length].id,
          status: OrderStatus.COMPLETED,
          subtotal: amount,
          note,
          version: 1,
        }),
      )

      await itemRepo.save(
        itemRepo.create({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          unitPrice: amount,
          quantity: 1,
          lineTotal: amount,
          note: `DEMO_ORDER_ITEM_${padNumber(index)}`,
          status: OrderItemStatus.DONE,
        }),
      )

      await paymentRepo.save(
        paymentRepo.create({
          orderId: order.id,
          method: index % 2 === 0 ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH,
          amount,
          receivedAmount: amount,
          changeAmount: 0,
          paidBy: users[(index - 1) % users.length].id,
          note: `DEMO_PAYMENT_${padNumber(index)}`,
          paymentStatus: PaymentStatus.PAID,
        }),
      )

      created++
      total++
    }
    index++
  }

  console.log(`Orders created: ${created}`)
  await seedOrderItems(dataSource, products)
  await seedPayments(dataSource, users)
}

async function seedOrderItems(dataSource: DataSource, products: Product[]): Promise<void> {
  if (!products.length) return

  const orderRepo = dataSource.getRepository(Order)
  const itemRepo = dataSource.getRepository(OrderItem)
  const orders = await orderRepo.find({ order: { id: "ASC" } })
  let created = 0
  let total = await itemRepo.count()
  let index = 1

  while (total < SEED_TARGET_ROWS && orders.length) {
    const note = `DEMO_ORDER_ITEM_${padNumber(index)}`
    const existing = await itemRepo.findOne({ where: { note } })
    if (!existing) {
      const order = orders[(index - 1) % orders.length]
      const product = products[(index - 1) % products.length]
      const amount = Number(product.sellingPrice)

      await itemRepo.save(
        itemRepo.create({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          unitPrice: amount,
          quantity: 1,
          lineTotal: amount,
          note,
          status: OrderItemStatus.DONE,
        }),
      )
      await orderRepo.increment({ id: order.id }, "subtotal", amount)
      created++
      total++
    }
    index++
  }

  console.log(`Order items created: ${created}`)
}

async function seedPayments(dataSource: DataSource, users: User[]): Promise<void> {
  if (!users.length) return

  const orderRepo = dataSource.getRepository(Order)
  const paymentRepo = dataSource.getRepository(Payment)
  const orders = await orderRepo.find({ order: { id: "ASC" } })
  let created = 0
  let total = await paymentRepo.count()
  let index = 1

  while (total < SEED_TARGET_ROWS && index <= orders.length) {
    const order = orders[index - 1]
    const existing = await paymentRepo.findOne({ where: { orderId: order.id } })
    if (!existing) {
      const amount = Number(order.subtotal)

      await paymentRepo.save(
        paymentRepo.create({
          orderId: order.id,
          method: index % 2 === 0 ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH,
          amount,
          receivedAmount: amount,
          changeAmount: 0,
          paidBy: users[(index - 1) % users.length].id,
          note: `DEMO_PAYMENT_${padNumber(index)}`,
          paymentStatus: PaymentStatus.PAID,
        }),
      )
      created++
      total++
    }
    index++
  }

  console.log(`Payments created: ${created}`)
}

async function seedStockChecks(
  dataSource: DataSource,
  users: User[],
  products: Product[],
): Promise<void> {
  if (!users.length || !products.length) return

  const stockCheckRepo = dataSource.getRepository(StockCheck)
  const itemRepo = dataSource.getRepository(StockCheckItem)
  let created = 0
  let total = await stockCheckRepo.count()
  let index = 1

  while (total < SEED_TARGET_ROWS) {
    const code = `SCDEMO${padNumber(index, 4)}`
    const existing = await stockCheckRepo.findOne({ where: { code } })
    if (!existing) {
      const user = users[(index - 1) % users.length]
      const product = products[(index - 1) % products.length]
      const systemStock = product.stock
      const actualStock = systemStock + (index % 5) - 2
      const diff = actualStock - systemStock
      const stockCheck = await stockCheckRepo.save(
        stockCheckRepo.create({
          code,
          checkerName: user.fullName,
          checkedBy: user.id,
          totalItems: 1,
          totalDiff: diff,
        }),
      )

      await itemRepo.save(
        itemRepo.create({
          stockCheckId: stockCheck.id,
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          categoryName: product.category?.name ?? "Demo",
          systemStock,
          actualStock,
          diff,
          note: `DEMO_STOCK_ITEM_${padNumber(index)}`,
        }),
      )
      created++
      total++
    }
    index++
  }

  console.log(`Stock checks created: ${created}`)
  await seedStockCheckItems(dataSource, products)
}

async function seedStockCheckItems(
  dataSource: DataSource,
  products: Product[],
): Promise<void> {
  if (!products.length) return

  const stockCheckRepo = dataSource.getRepository(StockCheck)
  const itemRepo = dataSource.getRepository(StockCheckItem)
  const stockChecks = await stockCheckRepo.find({ order: { id: "ASC" } })
  let created = 0
  let total = await itemRepo.count()
  let index = 1

  while (total < SEED_TARGET_ROWS && stockChecks.length) {
    const note = `DEMO_STOCK_ITEM_${padNumber(index)}`
    const existing = await itemRepo.findOne({ where: { note } })
    if (!existing) {
      const stockCheck = stockChecks[(index - 1) % stockChecks.length]
      const product = products[(index - 1) % products.length]
      const systemStock = product.stock
      const actualStock = systemStock + (index % 5) - 2
      const diff = actualStock - systemStock

      await itemRepo.save(
        itemRepo.create({
          stockCheckId: stockCheck.id,
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          categoryName: product.category?.name ?? "Demo",
          systemStock,
          actualStock,
          diff,
          note,
        }),
      )
      await stockCheckRepo.increment({ id: stockCheck.id }, "totalItems", 1)
      await stockCheckRepo.increment({ id: stockCheck.id }, "totalDiff", diff)
      created++
      total++
    }
    index++
  }

  console.log(`Stock check items created: ${created}`)
}

seedDemoData().catch((err) => {
  console.error("Demo data seed failed:", err)
  process.exit(1)
})
