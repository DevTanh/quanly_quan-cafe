// Đặt tại: src/qr-order/services/qr-order.service.ts

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common"
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm"
import { DataSource, Repository } from "typeorm"

// ── Import đúng đường dẫn thật trong dự án ──────────────────────
import { Order, OrderStatus } from "../../orders/entities/order.entity"
import { OrderItem, OrderItemStatus } from "../../orders/entities/order-item.entity"
import { CafeTable, TableStatus } from "../../tables/entities/cafe-table.entity"
import { Product, ProductStatus } from "../../products/entities/product.entity"
import { CreateQrOrderDto, QrOrderItemDto } from "../create-qr-order.dto"

// ── Response type ────────────────────────────────────────────────
export interface QrOrderResult {
  orderId: number
  tableId: number
  tableName: string
  status: OrderStatus
  subtotal: number
  items: {
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    note?: string
  }[]
  createdAt: Date
  message: string
}

@Injectable()
export class QrOrderService {
  private readonly logger = new Logger(QrOrderService.name)

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(CafeTable)
    private readonly tableRepo: Repository<CafeTable>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }

  /**
   * Tạo order mới từ QR — không cần xác thực nhân viên.
   *
   * Luồng trong 1 TypeORM Transaction:
   *  1. Validate bàn tồn tại, đang ACTIVE
   *  2. Validate + snapshot giá từng sản phẩm
   *  3. Lock bàn (pessimistic_write) để tránh race condition
   *  4. Kiểm tra bàn đã có order PENDING/PROCESSING chưa
   *     → Có: thêm món vào order hiện tại
   *     → Chưa: tạo order mới
   *  5. Lưu OrderItem[]
   *  6. Cập nhật subtotal
   *  7. Ghi note bàn = QR_ORDER:{orderId} để POS nhận biết
   *  8. Commit — bất kỳ lỗi nào: rollback toàn bộ
   */
  async createOrder(dto: CreateQrOrderDto): Promise<QrOrderResult> {
    // ── Bước 1: validate bàn (ngoài transaction) ────────────────
    const table = await this.tableRepo.findOne({
      where: { id: dto.tableId },
      relations: ["zone"],
    })

    if (!table) {
      throw new NotFoundException(
        `Bàn #${dto.tableId} không tồn tại. Vui lòng quét lại mã QR.`,
      )
    }

    if (table.status === TableStatus.INACTIVE) {
      throw new BadRequestException(
        `Bàn "${table.name}" hiện đang tạm ngưng phục vụ. Vui lòng liên hệ nhân viên.`,
      )
    }

    // ── Bước 2: validate + snapshot giá sản phẩm ────────────────
    const resolvedItems = await this.resolveProducts(dto.items)

    // ── Bước 3: transaction ──────────────────────────────────────
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Lock bàn để tránh 2 thiết bị tạo order cùng lúc
      const lockedTable = await queryRunner.manager
        .getRepository(CafeTable)
        .createQueryBuilder("t")
        .where("t.id = :id", { id: dto.tableId })
        .setLock("pessimistic_write")
        .getOne()

      if (!lockedTable) {
        throw new NotFoundException(`Bàn #${dto.tableId} không tồn tại.`)
      }

      // Tìm order đang mở của bàn (PENDING hoặc PROCESSING)
      const existingOrder = await queryRunner.manager
        .getRepository(Order)
        .findOne({
          where: [
            { tableId: dto.tableId, status: OrderStatus.PENDING },
            { tableId: dto.tableId, status: OrderStatus.PROCESSING },
          ],
          order: { createdAt: "DESC" },
        })

      let order: Order
      let isNewOrder = false

      if (existingOrder) {
        // Bàn đã có order → thêm món vào order hiện tại
        this.logger.log(
          `Bàn #${dto.tableId} đã có order #${existingOrder.id} — thêm món`,
        )
        order = existingOrder
      } else {
        // Chưa có order → tạo mới
        const subtotal = resolvedItems.reduce((s, i) => s + i.lineTotal, 0)
        order = queryRunner.manager.getRepository(Order).create({
          tableId: dto.tableId,
          createdBy: 0,           // 0 = gọi từ QR, không phải nhân viên
          status: OrderStatus.PENDING,
          subtotal,
          note: dto.note,
          version: 1,
        })
        order = await queryRunner.manager.getRepository(Order).save(order)
        isNewOrder = true
        this.logger.log(`Tạo order mới #${order.id} cho bàn #${dto.tableId} qua QR`)
      }

      // Lưu OrderItem[]
      const itemEntities = resolvedItems.map((item) =>
        queryRunner.manager.getRepository(OrderItem).create({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          note: item.note,
          status: OrderItemStatus.NEW,
        }),
      )
      await queryRunner.manager.getRepository(OrderItem).save(itemEntities)

      // Cập nhật subtotal nếu thêm vào order cũ
      if (!isNewOrder) {
        const allItems = await queryRunner.manager
          .getRepository(OrderItem)
          .find({ where: { orderId: order.id } })
        const newSubtotal = allItems.reduce((s, i) => s + Number(i.lineTotal), 0)
        await queryRunner.manager
          .getRepository(Order)
          .update(order.id, { subtotal: newSubtotal })
        order.subtotal = newSubtotal
      }

      // Ghi note bàn để POS hiển thị "Có khách (QR)"
      await queryRunner.manager
        .getRepository(CafeTable)
        .update(dto.tableId, { note: `QR_ORDER:${order.id}` })

      await queryRunner.commitTransaction()

      return {
        orderId: order.id,
        tableId: table.id,
        tableName: table.name,
        status: order.status,
        subtotal: Number(order.subtotal),
        items: resolvedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          note: item.note,
        })),
        createdAt: order.createdAt,
        message: isNewOrder
          ? "Đơn của bạn đã được ghi nhận! Nhân viên sẽ phục vụ ngay."
          : "Món mới đã được thêm vào đơn của bạn!",
      }
    } catch (err) {
      await queryRunner.rollbackTransaction()
      this.logger.error(
        `QR Order rollback — tableId:${dto.tableId}`,
        err,
      )
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * GET /public/qr-order/menu
   * Trả danh sách sản phẩm ACTIVE kèm danh mục.
   */
  async getPublicMenu() {
    const products = await this.productRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "category")
      .where("p.status = :status", { status: ProductStatus.ACTIVE })
      .andWhere("category.is_active = :catActive", { catActive: true })
      .orderBy("category.name", "ASC")
      .addOrderBy("p.name", "ASC")
      .getMany()

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      sellingPrice: Number(p.sellingPrice),
      imageUrl: p.imageUrl,
      menuType: p.menuType,
      category: {
        id: p.category.id,
        name: p.category.name,
      },
    }))
  }

  /**
   * GET /public/qr-order/table/:tableId
   * Thông tin bàn để hiển thị trên màn hình QR của khách.
   */
  async getTableInfo(tableId: number) {
    const table = await this.tableRepo.findOne({
      where: { id: tableId },
      relations: ["zone"],
    })

    if (!table) {
      throw new NotFoundException(
        `Bàn #${tableId} không tồn tại. Vui lòng quét lại mã QR.`,
      )
    }

    return {
      id: table.id,
      name: table.name,
      zoneName: table.zone?.name ?? "",
      isActive: table.status === TableStatus.ACTIVE,
    }
  }

  /**
   * Validate & snapshot giá từng sản phẩm.
   * Throw ngay nếu sản phẩm không tồn tại hoặc đã ngừng bán.
   */
  private async resolveProducts(items: QrOrderItemDto[]) {
    const productIds = [...new Set(items.map((i) => i.productId))]

    const products = await this.productRepo
      .createQueryBuilder("p")
      .where("p.id IN (:...ids)", { ids: productIds })
      .getMany()

    const productMap = new Map(products.map((p) => [p.id, p]))

    return items.map((item) => {
      const product = productMap.get(item.productId)

      if (!product) {
        throw new NotFoundException(
          `Sản phẩm #${item.productId} không có trong thực đơn.`,
        )
      }

      if (product.status === ProductStatus.INACTIVE) {
        throw new BadRequestException(
          `Món "${product.name}" hiện đã ngừng phục vụ. Vui lòng chọn món khác.`,
        )
      }

      const unitPrice = Number(product.sellingPrice)
      return {
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
        note: item.note,
      }
    })
  }
}