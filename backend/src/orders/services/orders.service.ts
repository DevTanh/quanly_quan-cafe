import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { DataSource } from "typeorm"
import { OrdersRepository } from "../repositories/orders.repository"
import { OrderItemsRepository } from "../repositories/order-items.repository"
import { PaymentsRepository } from "../repositories/payments.repository"
import { ProductsRepository } from "../../products/repositories/products.repository"
import { TablesService } from "../../tables/services/tables.service"
import { PayosService } from "./payos.service"
import type { PayOSWebhookPayload } from "./payos.service"
import { Order, OrderStatus } from "../entities/order.entity"
import { OrderItem, OrderItemStatus } from "../entities/order-item.entity"
import { Payment, PaymentMethod, PaymentStatus } from "../entities/payment.entity"
import { Product } from "../../products/entities/product.entity"
import type { CreateOrderDto, OrderItemDto } from "../dto/create-order.dto"
import type { UpdateOrderItemsDto } from "../dto/update-order-items.dto"
import type { CreatePaymentDto } from "../dto/create-payment.dto"
import type { QueryOrderDto } from "../dto/query-order.dto"
import type { PaginatedResult } from "../repositories/orders.repository"

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly orderItemsRepo: OrderItemsRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly productsRepo: ProductsRepository,
    private readonly payosService: PayosService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly tablesService: TablesService,
  ) {}

  // ─── QUERIES ──────────────────────────────────────────────────────

  async findAll(query: QueryOrderDto): Promise<PaginatedResult<Order>> {
    return await this.ordersRepo.findByQuery(query)
  }

  async findById(id: number): Promise<Order> {
    const order = await this.ordersRepo.findById(id)
    if (!order) throw new NotFoundException(`Order #${id} không tồn tại`)
    return order
  }

  /** Lấy order đang mở của bàn (pending / processing) */
  async findOpenByTable(tableId: number): Promise<Order | null> {
    return await this.ordersRepo.findOpenByTable(tableId)
  }

  // ─── CREATE ORDER ─────────────────────────────────────────────────

  async create(dto: CreateOrderDto, userId: number): Promise<Order> {
    if (dto.tableId > 0) {
      const table = await this.tablesService.findActiveTableById(dto.tableId)
      if (!table) {
        throw new BadRequestException("Ban khong ton tai hoac da ngung hoat dong")
      }
    }

    // 1. Kiểm tra bàn đã có order mở chưa
    const existing = await this.ordersRepo.findOpenByTable(dto.tableId)
    if (existing) {
      throw new ConflictException(
        `Bàn #${dto.tableId} đã có order #${existing.id} đang mở`,
      )
    }

    // 2. Validate + snapshot giá cho từng item
    const itemsData = await this.resolveItems(dto.items)

    // 3. Tính subtotal
    const subtotal = itemsData.reduce((sum, i) => sum + i.lineTotal, 0)

    // 4. Tạo order + items
    const order = await this.ordersRepo.create({
      tableId: dto.tableId,
      createdBy: userId,
      status: OrderStatus.PENDING,
      subtotal,
      note: dto.note,
      version: 1,
    })

    const items = itemsData.map((i) => ({
      ...i,
      orderId: order.id,
      status: OrderItemStatus.NEW,
    }))
    await this.orderItemsRepo.createMany(items)

    return (await this.ordersRepo.findById(order.id))!
  }

  // ─── UPDATE ITEMS ─────────────────────────────────────────────────

  async updateItems(orderId: number, dto: UpdateOrderItemsDto): Promise<Order> {
    const order = await this.findById(orderId)

    // Chỉ cho sửa khi order chưa hoàn tất
    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException("Không thể sửa order đã thanh toán")
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Không thể sửa order đã hủy")
    }

    // Optimistic lock check
    if (dto.version != null && dto.version !== order.version) {
      throw new ConflictException(
        "Order đã được cập nhật bởi thiết bị khác. Vui lòng tải lại.",
      )
    }

    // Validate + snapshot giá
    const itemsData = await this.resolveItems(dto.items)
    const subtotal = itemsData.reduce((sum, i) => sum + i.lineTotal, 0)

    // Xóa items cũ status = NEW, giữ lại items đã gửi bar
    // -> Replace toàn bộ items mới (frontend gửi full list)
    await this.orderItemsRepo.deleteByOrderId(orderId)

    const items = itemsData.map((i) => ({
      ...i,
      orderId,
      status: OrderItemStatus.NEW,
    }))
    await this.orderItemsRepo.createMany(items)

    // Tăng version + cập nhật subtotal
    await this.ordersRepo.update(orderId, {
      subtotal,
      note: dto.note ?? order.note,
      version: order.version + 1,
    })

    return (await this.ordersRepo.findById(orderId))!
  }

  // ─── SEND TO BAR ─────────────────────────────────────────────────

  async sendToBar(orderId: number): Promise<Order> {
    const order = await this.findById(orderId)

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException("Order đã thanh toán")
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Order đã hủy")
    }

    // Đổi status NEW → SENT cho các item chưa gửi
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      await runner.manager
        .createQueryBuilder()
        .update(OrderItem)
        .set({ status: OrderItemStatus.SENT })
        .where("order_id = :orderId AND status = :status", {
          orderId,
          status: OrderItemStatus.NEW,
        })
        .execute()

      // Chuyển order sang processing nếu đang pending
      if (order.status === OrderStatus.PENDING) {
        await runner.manager.update(Order, orderId, {
          status: OrderStatus.PROCESSING,
        })
      }

      await runner.commitTransaction()
    } catch (err) {
      await runner.rollbackTransaction()
      throw err
    } finally {
      await runner.release()
    }

    return (await this.ordersRepo.findById(orderId))!
  }

  // ─── PAYMENT ──────────────────────────────────────────────────────

  async pay(orderId: number, dto: CreatePaymentDto, userId: number) {
    const order = await this.findById(orderId)

    // Validate trạng thái
    if (order.status === OrderStatus.COMPLETED) {
      throw new ConflictException("Order đã được thanh toán")
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Không thể thanh toán order đã hủy")
    }

    // Kiểm tra đã có payment chưa
    const existingPayment = await this.paymentsRepo.findByOrderId(orderId)
    if (existingPayment) {
      // Nếu đã có payment pending (QR), không cho tạo thêm
      if (existingPayment.paymentStatus === PaymentStatus.PENDING) {
        const synced = await this.syncPendingPayosPayment(existingPayment)
        if (synced?.payment?.paymentStatus === PaymentStatus.PAID) {
          return synced
        }
        throw new ConflictException(
          "Order đang có giao dịch QR chờ thanh toán. Hủy QR trước khi tạo mới.",
        )
      }
      if (existingPayment.paymentStatus === PaymentStatus.PAID) {
        throw new ConflictException("Order đã được thanh toán")
      }
    }

    const amount = Number(order.subtotal)

    // ─── PAYOS QR ──────────────────────────────────────────────
    if (dto.method === PaymentMethod.PAYOS_QR) {
      return await this.createPayosQR(order, amount, userId)
    }

    // ─── CASH / BANK_TRANSFER (đồng bộ) ───────────────────────
    const receivedAmount = dto.receivedAmount ?? amount

    if (dto.method === "cash" && receivedAmount < amount) {
      throw new BadRequestException(
        `Số tiền khách đưa (${receivedAmount}) không đủ thanh toán (${amount})`,
      )
    }

    return await this.processDirectPayment(order, {
      method: dto.method,
      amount,
      receivedAmount,
      changeAmount: receivedAmount - amount,
      paidBy: userId,
      note: dto.note,
    })
  }

  /** Thanh toán tiền mặt / chuyển khoản: trừ kho ngay trong transaction */
  private async processDirectPayment(
    order: Order,
    paymentData: {
      method: PaymentMethod
      amount: number
      receivedAmount: number
      changeAmount: number
      paidBy: number
      note?: string
    },
  ) {
    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      // 1. Tạo payment
      const payment = runner.manager.create(Payment, {
        orderId: order.id,
        ...paymentData,
        paymentStatus: PaymentStatus.PAID,
      })
      await runner.manager.save(Payment, payment)

      // 2. Trừ kho
      await this.deductStock(runner, order)

      // 3. Chuyển order sang completed
      await runner.manager.update(Order, order.id, {
        status: OrderStatus.COMPLETED,
      })

      await runner.commitTransaction()

      return {
        payment: await this.paymentsRepo.findByOrderId(order.id),
        order: await this.ordersRepo.findById(order.id),
      }
    } catch (err) {
      await runner.rollbackTransaction()
      throw err
    } finally {
      await runner.release()
    }
  }

  /** Tạo payment link QR qua PayOS — chưa trừ kho, chờ webhook */
  private async createPayosQR(order: Order, amount: number, userId: number) {
    const clientDomain = this.configService.get<string>("CLIENT_DOMAIN_DEV") ?? "http://localhost:3000"
    const cancelUrl = `${clientDomain}/orders/${order.id}?payment=cancelled`
    const returnUrl = `${clientDomain}/orders/${order.id}?payment=success`

    const link = await this.payosService.createPaymentLink(
      order.id,
      amount,
      `Thanh toan order #${order.id}`,
      cancelUrl,
      returnUrl,
    )

    // Tạo payment record với status = pending
    const payment = await this.paymentsRepo.create({
      orderId: order.id,
      method: PaymentMethod.PAYOS_QR,
      amount,
      receivedAmount: 0,
      changeAmount: 0,
      paidBy: userId,
      paymentStatus: PaymentStatus.PENDING,
      paymentLinkId: link.paymentLinkId,
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
    })

    return { payment }
  }

  // ─── PAYOS WEBHOOK ────────────────────────────────────────────────

  async handlePayosWebhook(payload: unknown) {
    // ── Bước 1: Validate cấu trúc body trước mọi xử lý (theo docs PayOS) ───
    // Nếu payload không phải object hoặc thiếu trường, reject ngay
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof (payload as Record<string, unknown>)["code"] !== "string" ||
      typeof (payload as Record<string, unknown>)["desc"] !== "string" ||
      typeof (payload as Record<string, unknown>)["signature"] !== "string" ||
      !(payload as Record<string, unknown>)["data"] ||
      typeof (payload as Record<string, unknown>)["data"] !== "object"
    ) {
      return { success: false, message: "Invalid webhook payload" }
    }

    const webhookPayload = payload as PayOSWebhookPayload
    console.log(webhookPayload)

    // ── Bước 2: Xác minh signature HMAC SHA256 ───────────────────────
    const valid = this.payosService.verifyWebhookSignature(webhookPayload)
    if (!valid) {
      return { success: false, message: "Invalid signature" }
    }

    const orderId = webhookPayload.data.orderCode
    const payment = await this.paymentsRepo.findByOrderId(orderId)
    if (!payment) {
      return { success: false, message: "Payment not found" }
    }

    // Đã xử lý rồi
    if (payment.paymentStatus === PaymentStatus.PAID) {
      return { success: true, message: "Already processed" }
    }

    // ── Bước 3: Nếu PayOS báo thành công ──────────────────────────
    if (webhookPayload.code === "00") {
      const order = await this.ordersRepo.findById(orderId)
      if (!order) {
        return { success: false, message: "Order not found" }
      }

      const runner = this.dataSource.createQueryRunner()
      await runner.connect()
      await runner.startTransaction()
      try {
        // Cập nhật payment
        await this.completePayosPayment(
          runner,
          order,
          payment,
          webhookPayload.data.amount,
          webhookPayload.data.reference,
        )

        await runner.commitTransaction()
        return { success: true, message: "Payment confirmed" }
      } catch (err) {
        await runner.rollbackTransaction()
        return { success: false, message: "Internal error" }
      } finally {
        await runner.release()
      }
    }

    // ── Bước 4: Thất bại / hết hạn ──────────────────────────────
    await this.paymentsRepo.update(payment.id, {
      paymentStatus: PaymentStatus.FAILED,
    })
    return { success: true, message: "Payment marked as failed" }
  }

  // ─── POLLING PAYMENT STATUS ───────────────────────────────────────

  async getPaymentStatus(orderId: number) {
    const payment = await this.paymentsRepo.findByOrderId(orderId)
    if (!payment) {
      return { orderId, paymentStatus: null, method: null }
    }
    if (
      payment.method === PaymentMethod.PAYOS_QR &&
      payment.paymentStatus === PaymentStatus.PENDING
    ) {
      const synced = await this.syncPendingPayosPayment(payment)
      if (synced?.payment) {
        return {
          orderId,
          paymentStatus: synced.payment.paymentStatus,
          method: synced.payment.method,
        }
      }
    }
    return {
      orderId,
      paymentStatus: payment.paymentStatus,
      method: payment.method,
    }
  }

  // ─── CANCEL PAYMENT LINK ─────────────────────────────────────────

  async cancelPaymentLink(orderId: number) {
    const payment = await this.paymentsRepo.findByOrderId(orderId)
    if (!payment) {
      throw new NotFoundException("Không tìm thấy giao dịch thanh toán")
    }
    if (payment.method !== PaymentMethod.PAYOS_QR) {
      throw new BadRequestException("Chỉ có thể hủy QR code PayOS")
    }
    if (payment.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException("Chỉ có thể hủy giao dịch đang chờ")
    }

    // Gọi PayOS cancel
    if (payment.paymentLinkId) {
      await this.payosService.cancelPaymentLink(payment.paymentLinkId)
    }

    await this.paymentsRepo.update(payment.id, {
      paymentStatus: PaymentStatus.CANCELLED,
    })

    // Xóa payment record để cho phép thanh toán lại
    await this.paymentsRepo.delete(payment.id)

    return { statusCode: 200, message: "Đã hủy QR thanh toán" }
  }

  // ─── CANCEL ORDER ─────────────────────────────────────────────────

  async cancel(orderId: number): Promise<Order> {
    const order = await this.findById(orderId)

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException("Không thể hủy order đã thanh toán")
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Order đã bị hủy trước đó")
    }

    await this.ordersRepo.update(orderId, {
      status: OrderStatus.CANCELLED,
    })

    return (await this.ordersRepo.findById(orderId))!
  }

  // ─── HELPERS ──────────────────────────────────────────────────────

  /** Trừ kho cho tất cả items trong order (dùng chung cho cash và webhook) */
  private async deductStock(runner: import("typeorm").QueryRunner, order: Order): Promise<void> {
    for (const item of order.items) {
      if (item.status === OrderItemStatus.CANCELLED) continue

      const product = await runner.manager.findOne(Product, {
        where: { id: item.productId },
      })
      if (!product) {
        throw new BadRequestException(
          `Sản phẩm #${item.productId} (${item.productName}) không tồn tại`,
        )
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Sản phẩm "${item.productName}" không đủ tồn kho (còn ${product.stock}, cần ${item.quantity})`,
        )
      }

      await runner.manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => `stock - ${item.quantity}` })
        .where("id = :id", { id: item.productId })
        .execute()
    }
  }

  private async syncPendingPayosPayment(payment: Payment) {
    if (
      payment.method !== PaymentMethod.PAYOS_QR ||
      payment.paymentStatus !== PaymentStatus.PENDING ||
      !payment.paymentLinkId
    ) {
      return null
    }

    const linkInfo = await this.payosService.getPaymentLink(payment.paymentLinkId)
    const data = linkInfo.data
    if (!data || typeof data !== "object") return null

    const status = String(data["status"] ?? "").toUpperCase()
    if (status !== "PAID") return null

    const paidAmount = Number(data["amountPaid"] ?? data["amount"] ?? payment.amount)
    const receivedAmount = Number.isFinite(paidAmount) ? paidAmount : Number(payment.amount)
    const order = await this.ordersRepo.findById(payment.orderId)
    if (!order) return null

    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      await this.completePayosPayment(runner, order, payment, receivedAmount)
      await runner.commitTransaction()
    } catch (err) {
      await runner.rollbackTransaction()
      throw err
    } finally {
      await runner.release()
    }

    return {
      payment: await this.paymentsRepo.findByOrderId(payment.orderId),
      order: await this.ordersRepo.findById(payment.orderId),
    }
  }

  private async completePayosPayment(
    runner: import("typeorm").QueryRunner,
    order: Order,
    payment: Payment,
    receivedAmount: number,
    transactionRef?: string,
  ): Promise<void> {
    const paymentUpdate: Partial<Payment> = {
      paymentStatus: PaymentStatus.PAID,
      receivedAmount,
    }
    if (transactionRef) {
      paymentUpdate.transactionRef = transactionRef
    }

    await runner.manager.update(Payment, payment.id, paymentUpdate)
    await this.deductStock(runner, order)
    await runner.manager.update(Order, order.id, {
      status: OrderStatus.COMPLETED,
    })
  }

  /**
   * Validate danh sách items + snapshot giá từ Product.
   * Trả về dữ liệu chuẩn bị insert OrderItem.
   */
  private async resolveItems(
    items: OrderItemDto[],
  ): Promise<Omit<OrderItem, "id" | "orderId" | "order" | "createdAt" | "status">[]> {
    if (!items.length) {
      throw new BadRequestException("Danh sách món không được rỗng")
    }

    const result: Omit<OrderItem, "id" | "orderId" | "order" | "createdAt" | "status">[] = []

    for (const item of items) {
      const product = await this.productsRepo.findById(item.productId)
      if (!product) {
        throw new NotFoundException(`Sản phẩm #${item.productId} không tồn tại`)
      }
      if (product.status !== "active") {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" đã ngừng kinh doanh`,
        )
      }

      const unitPrice = Number(product.sellingPrice)
      const lineTotal = unitPrice * item.quantity

      result.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        note: item.note,
      })
    }

    return result
  }
  // ─── UPDATE ITEM STATUS ───────────────────────────────────────────
  /**
   * PATCH /orders/:orderId/items/:itemId/status
   * Barista/Staff cập nhật trạng thái từng món: new → sent → done
   */
  async updateItemStatus(
    orderId: number,
    itemId: number,
    newStatus: OrderItemStatus,
  ): Promise<{ message: string; item: OrderItem }> {
    const order = await this.findById(orderId)
    if (!order.items) {
      throw new NotFoundException(`Order #${orderId} không có món nào`)
    }

    const item = order.items.find((i) => i.id === itemId)
    if (!item) {
      throw new NotFoundException(`Món #${itemId} không thuộc order #${orderId}`)
    }

    // Validate transition hợp lệ
    const validTransitions: Record<OrderItemStatus, OrderItemStatus[]> = {
      [OrderItemStatus.NEW]: [OrderItemStatus.SENT, OrderItemStatus.CANCELLED],
      [OrderItemStatus.SENT]: [OrderItemStatus.DONE, OrderItemStatus.CANCELLED],
      [OrderItemStatus.DONE]: [],
      [OrderItemStatus.CANCELLED]: [],
    }

    const allowed = validTransitions[item.status] ?? []
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái "${item.status}" sang "${newStatus}"`,
      )
    }

    const runner = this.dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      await runner.manager.update(OrderItem, itemId, { status: newStatus })
      await runner.commitTransaction()
    } catch (err) {
      await runner.rollbackTransaction()
      throw err
    } finally {
      await runner.release()
    }

    const updatedOrder = await this.findById(orderId)
    const updatedItem = updatedOrder.items.find((i) => i.id === itemId)!
    return { message: "Cập nhật trạng thái món thành công", item: updatedItem }
  }


}
