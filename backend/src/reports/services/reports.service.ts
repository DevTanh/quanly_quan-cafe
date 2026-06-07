import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Payment, PaymentStatus } from "../../orders/entities/payment.entity"
import { OrderItem } from "../../orders/entities/order-item.entity"
import { Product } from "../../products/entities/product.entity"
import type { QueryReportDto } from "../dto/query-report.dto"

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  async getDashboard(query: QueryReportDto) {
    const { from, to } = this.getDateRange(query)

    const summary = await this.paymentsRepo
      .createQueryBuilder("p")
      .select("COALESCE(SUM(p.amount), 0)", "revenue")
      .addSelect("COUNT(p.id)", "paidOrders")
      .where("p.payment_status = :status", { status: PaymentStatus.PAID })
      .andWhere("p.paid_at BETWEEN :from AND :to", { from, to })
      .getRawOne()

    const revenue = Number(summary?.revenue ?? 0)
    const paidOrders = Number(summary?.paidOrders ?? 0)

    const paymentMethodsRaw = await this.paymentsRepo
      .createQueryBuilder("p")
      .select("p.method", "method")
      .addSelect("COALESCE(SUM(p.amount), 0)", "amount")
      .addSelect("COUNT(p.id)", "count")
      .where("p.payment_status = :status", { status: PaymentStatus.PAID })
      .andWhere("p.paid_at BETWEEN :from AND :to", { from, to })
      .groupBy("p.method")
      .getRawMany()

    const topProductsRaw = await this.orderItemsRepo
      .createQueryBuilder("item")
      .innerJoin("item.order", "o")
      .innerJoin(Payment, "payment", "payment.order_id = o.id")
      .select("item.productId", "productId")
      .addSelect("item.productName", "productName")
      .addSelect("SUM(item.quantity)", "quantity")
      .addSelect("SUM(item.lineTotal)", "revenue")
      .where("payment.payment_status = :status", { status: PaymentStatus.PAID })
      .andWhere("payment.paid_at BETWEEN :from AND :to", { from, to })
      .groupBy("item.productId")
      .addGroupBy("item.productName")
      .orderBy("revenue", "DESC")
      .limit(5)
      .getRawMany()

    const lowStockCount = await this.productsRepo
      .createQueryBuilder("p")
      .where("p.stock <= p.min_stock")
      .getCount()

    return {
      revenue,
      paidOrders,
      averageOrderValue: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
      paymentMethods: paymentMethodsRaw.map((row) => ({
        method: row.method,
        amount: Number(row.amount),
        count: Number(row.count),
      })),
      topProducts: topProductsRaw.map((row) => ({
        productId: Number(row.productId),
        productName: row.productName,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue),
      })),
      lowStockCount,
    }
  }

  private getDateRange(query: QueryReportDto): { from: Date; to: Date } {
    return {
      from: query.from ? this.startOfDay(query.from) : this.startOfToday(),
      to: query.to ? this.endOfDay(query.to) : this.endOfToday(),
    }
  }

  private startOfDay(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00.000Z`)
    }
    return new Date(value)
  }

  private endOfDay(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T23:59:59.999Z`)
    }
    return new Date(value)
  }

  private startOfToday(): Date {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }

  private endOfToday(): Date {
    const date = new Date()
    date.setHours(23, 59, 59, 999)
    return date
  }
}
